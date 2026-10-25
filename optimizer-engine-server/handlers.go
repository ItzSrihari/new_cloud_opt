package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func handleHealth(s *AppState, port string, w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	hasCache := s.data != nil
	lastTime := s.lastSimulatedTime
	s.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]any{
		"status":              "healthy",
		"service":             "optimizer-engine-server-go",
		"port":                port,
		"has_cache":           hasCache,
		"sse_clients":         s.broker.ClientCount(),
		"last_simulated_time": lastTime,
	})
}

func handleOverview(s *AppState, w http.ResponseWriter, r *http.Request) {
	if s.data == nil {
		s.loadAnalyticsCache()
	}
	if s.data == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Analytics engine warming up. Please retry in 2 seconds.",
		})
		return
	}

	query := r.URL.Query()
	region := query.Get("region")
	if region == "" {
		region = "all"
	}
	environment := query.Get("environment")
	if environment == "" {
		environment = "all"
	}
	team := query.Get("team")
	if team == "" {
		team = "all"
	}

	financials := s.computeDynamicFinancials(environment, region, team)

	baselineCostHourly := math.Round((financials.CurrentMonthlySpendINR/730.0)*100) / 100
	acceptedCostHourly := math.Round((financials.ProjectedMonthlySpendINR/730.0)*100) / 100

	s.mu.RLock()
	billingHistory := s.data.BillingHistory
	fleetSummary := s.data.FleetCounts
	lastTime := s.lastSimulatedTime

	var adjustedTimeseries []map[string]any
	for _, pt := range s.data.FleetAggregatedTimeseries {
		clone := make(map[string]any, len(pt)+2)
		for k, v := range pt {
			clone[k] = v
		}
		clone["hourly_cost_before"] = baselineCostHourly
		clone["hourly_cost_after_projected"] = acceptedCostHourly
		adjustedTimeseries = append(adjustedTimeseries, clone)
	}
	s.mu.RUnlock()

	resp := OverviewResponse{
		DynamicFinancials:    financials,
		BillingHistory6M:     billingHistory,
		FleetSummary:         fleetSummary,
		AggregatedTimeseries: adjustedTimeseries,
		LastSimulatedTime:    lastTime,
	}

	writeJSON(w, http.StatusOK, resp)
}

func handleResources(s *AppState, w http.ResponseWriter, r *http.Request) {
	if s.data == nil {
		s.loadAnalyticsCache()
	}
	if s.data == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Data not loaded yet"})
		return
	}

	query := r.URL.Query()
	region := query.Get("region")
	environment := query.Get("environment")
	team := query.Get("team")
	resType := query.Get("type")
	status := query.Get("status")

	s.mu.RLock()
	defer s.mu.RUnlock()

	var enriched []map[string]any
	for _, res := range s.data.Resources {
		if region != "" && !strings.EqualFold(region, "all") {
			rReg, _ := res["region"].(string)
			if !strings.EqualFold(rReg, region) {
				continue
			}
		}
		if environment != "" && !strings.EqualFold(environment, "all") {
			rEnv, _ := res["environment"].(string)
			if !strings.EqualFold(rEnv, environment) {
				continue
			}
		}
		if team != "" && !strings.EqualFold(team, "all") {
			rTeam, _ := res["team"].(string)
			if !strings.EqualFold(rTeam, team) {
				continue
			}
		}
		if resType != "" && !strings.EqualFold(resType, "all") {
			rType, _ := res["type"].(string)
			if !strings.EqualFold(rType, resType) {
				continue
			}
		}
		if status != "" && !strings.EqualFold(status, "all") {
			rStatus, _ := res["status"].(string)
			if !strings.EqualFold(rStatus, status) {
				continue
			}
		}

		clone := make(map[string]any, len(res)+1)
		for k, v := range res {
			clone[k] = v
		}

		if recID, ok := res["linked_recommendation_id"].(string); ok && recID != "" {
			recStatus := s.recStatusMap[recID]
			if recStatus == "" {
				recStatus = "pending"
			}
			clone["recommendation_status"] = recStatus
		} else {
			clone["recommendation_status"] = nil
		}

		enriched = append(enriched, clone)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":     len(enriched),
		"resources": enriched,
	})
}

func handleResourceMetrics(s *AppState, w http.ResponseWriter, r *http.Request) {
	resourceID := r.PathValue("id")
	if s.data == nil {
		s.loadAnalyticsCache()
	}

	s.mu.RLock()
	var targetResource map[string]any
	for _, res := range s.data.Resources {
		if resID, _ := res["resource_id"].(string); resID == resourceID {
			targetResource = res
			break
		}
	}

	var linkedRec map[string]any
	for _, rec := range s.data.Recommendations {
		if rID, _ := rec["resource_id"].(string); rID == resourceID {
			linkedRec = make(map[string]any, len(rec)+1)
			for k, v := range rec {
				linkedRec[k] = v
			}
			recID, _ := rec["id"].(string)
			status := s.recStatusMap[recID]
			if status == "" {
				status = "pending"
			}
			linkedRec["status"] = status
			break
		}
	}
	s.mu.RUnlock()

	if targetResource == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": fmt.Sprintf("Resource %s not found", resourceID)})
		return
	}

	// Fetch metrics from Server 1
	var metrics []any
	client := &http.Client{Timeout: 3 * time.Second}
	infraURL := fmt.Sprintf("%s/infra/metrics?resource_id=%s", s.infraServerURL, resourceID)
	resp, err := client.Get(infraURL)
	if err == nil && resp.StatusCode == http.StatusOK {
		var infraData struct {
			Metrics []any `json:"metrics"`
		}
		if json.NewDecoder(resp.Body).Decode(&infraData) == nil {
			metrics = infraData.Metrics
		}
		resp.Body.Close()
	}

	if metrics == nil {
		metrics = []any{}
	}

	var simTransform any
	if linkedRec != nil {
		simTransform = linkedRec["simulation_transform"]
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"resource":             targetResource,
		"data_points":          len(metrics),
		"metrics":              metrics,
		"recommendation":       linkedRec,
		"simulation_transform": simTransform,
	})
}

func handleRecommendations(s *AppState, w http.ResponseWriter, r *http.Request) {
	if s.data == nil {
		s.loadAnalyticsCache()
	}
	if s.data == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Data not loaded yet"})
		return
	}

	query := r.URL.Query()
	riskLevel := query.Get("risk_level")
	actionType := query.Get("action_type")
	statusQuery := query.Get("status")
	environment := query.Get("environment")

	s.mu.RLock()
	defer s.mu.RUnlock()

	var filtered []map[string]any
	for _, rec := range s.data.Recommendations {
		id, _ := rec["id"].(string)
		status := s.recStatusMap[id]
		if status == "" {
			status = "pending"
		}

		if riskLevel != "" && !strings.EqualFold(riskLevel, "all") {
			rRisk, _ := rec["risk_level"].(string)
			if !strings.EqualFold(rRisk, riskLevel) {
				continue
			}
		}
		if actionType != "" && !strings.EqualFold(actionType, "all") {
			rAction, _ := rec["action_type"].(string)
			if !strings.EqualFold(rAction, actionType) {
				continue
			}
		}
		if environment != "" && !strings.EqualFold(environment, "all") {
			rEnv, _ := rec["environment"].(string)
			if !strings.EqualFold(rEnv, environment) {
				continue
			}
		}
		if statusQuery != "" && !strings.EqualFold(statusQuery, "all") {
			if !strings.EqualFold(status, statusQuery) {
				continue
			}
		}

		clone := make(map[string]any, len(rec)+1)
		for k, v := range rec {
			clone[k] = v
		}
		clone["status"] = status
		filtered = append(filtered, clone)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":           len(filtered),
		"recommendations": filtered,
	})
}

func handleUpdateRecommendationStatus(s *AppState, w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request JSON"})
		return
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "accepted" && status != "rejected" && status != "pending" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Status must be accepted, rejected, or pending"})
		return
	}

	s.mu.Lock()
	s.recStatusMap[id] = status
	s.mu.Unlock()

	updatedFinancials := s.computeDynamicFinancials("", "", "")
	s.broker.Broadcast("status_change", map[string]any{
		"id":         id,
		"status":     status,
		"financials": updatedFinancials,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"success":           true,
		"recommendation_id": id,
		"status":            status,
		"financials":        updatedFinancials,
	})
}

func handleBulkUpdateRecommendations(s *AppState, w http.ResponseWriter, r *http.Request) {
	var req struct {
		Action string `json:"action"` // accept_low_risk | accept_all | reset
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request JSON"})
		return
	}

	action := strings.TrimSpace(req.Action)
	if s.data == nil {
		s.loadAnalyticsCache()
	}

	s.mu.Lock()
	modifiedCount := 0
	if s.data != nil {
		for _, rec := range s.data.Recommendations {
			id, _ := rec["id"].(string)
			sav, _ := getFloat(rec["monthly_savings_inr"])
			risk, _ := rec["risk_level"].(string)

			switch action {
			case "accept_low_risk":
				if strings.EqualFold(risk, "low") && sav > 0 {
					s.recStatusMap[id] = "accepted"
					modifiedCount++
				}
			case "accept_all":
				if sav > 0 {
					s.recStatusMap[id] = "accepted"
					modifiedCount++
				}
			case "reset":
				s.recStatusMap[id] = "pending"
				modifiedCount++
			}
		}
	}
	s.mu.Unlock()

	updatedFinancials := s.computeDynamicFinancials("", "", "")
	s.broker.Broadcast("status_change", map[string]any{
		"bulk_action":   action,
		"modifiedCount": modifiedCount,
		"financials":    updatedFinancials,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"success":       true,
		"action":        action,
		"modifiedCount": modifiedCount,
		"financials":    updatedFinancials,
	})
}

func handleWhatIf(s *AppState, w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to read request body"})
		return
	}

	cmd := exec.Command(s.pythonBin, s.cliRunnerPath, "what_if")
	cmd.Env = os.Environ()
	cmd.Stdin = bytes.NewReader(bodyBytes)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[Optimizer-Go] What-if error: %v, stderr: %s", err, stderr.String())
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error":   "What-if process failed",
			"details": stderr.String(),
		})
		return
	}

	var result any
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Failed to parse what-if simulation output",
			"raw":   stdout.String(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func handleAlertsAndForecast(s *AppState, w http.ResponseWriter, r *http.Request) {
	if s.data == nil {
		s.loadAnalyticsCache()
	}

	s.mu.RLock()
	var baseAlerts []any
	var histSpend any = []any{}
	var fcSpend any = []any{}

	if s.data != nil && s.data.AlertsAndForecast != nil {
		if arr, ok := s.data.AlertsAndForecast["active_alerts"].([]any); ok {
			baseAlerts = arr
		}
		if h, ok := s.data.AlertsAndForecast["historical_spend"]; ok {
			histSpend = h
		}
		if f, ok := s.data.AlertsAndForecast["forecast_spend"]; ok {
			fcSpend = f
		}
	}

	combinedAlerts := make([]any, 0, len(s.dynamicAlerts)+len(baseAlerts))
	for _, a := range s.dynamicAlerts {
		combinedAlerts = append(combinedAlerts, a)
	}
	combinedAlerts = append(combinedAlerts, baseAlerts...)
	s.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]any{
		"active_alerts":    combinedAlerts,
		"historical_spend": histSpend,
		"forecast_spend":   fcSpend,
	})
}

func handleIngestTick(s *AppState, w http.ResponseWriter, r *http.Request) {
	var payload struct {
		SimulatedTime   string           `json:"simulated_time"`
		TickCount       int              `json:"tick_count"`
		Ticks           []map[string]any `json:"ticks"`
		AnomalyInjected any              `json:"anomaly_injected"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid tick payload"})
		return
	}

	s.mu.Lock()
	if payload.SimulatedTime != "" {
		s.lastSimulatedTime = payload.SimulatedTime
	} else {
		s.lastSimulatedTime = time.Now().UTC().Format(time.RFC3339)
	}
	s.latestLiveTicks = payload.Ticks

	var totalCPU float64
	var totalNet float64
	liveMap := make(map[string]map[string]float64)

	for _, t := range payload.Ticks {
		cpu, _ := getFloat(t["cpu_pct"])
		mem, _ := getFloat(t["memory_pct"])
		net, _ := getFloat(t["net_out_mbps"])
		totalCPU += cpu
		totalNet += net

		if rid, ok := t["resource_id"].(string); ok && rid != "" {
			liveMap[rid] = map[string]float64{
				"cpu_pct":      cpu,
				"memory_pct":   mem,
				"net_out_mbps": net,
			}
		}
	}

	ticksLen := float64(len(payload.Ticks))
	avgCPU := 0.0
	avgNet := 0.0
	if ticksLen > 0 {
		avgCPU = math.Round((totalCPU/ticksLen)*10) / 10
		avgNet = math.Round((totalNet/ticksLen)*10) / 10
	}

	lastTime := s.lastSimulatedTime
	s.mu.Unlock()

	var sampleTick any
	if len(payload.Ticks) > 0 {
		sampleTick = payload.Ticks[0]
	}

	s.broker.Broadcast("tick", map[string]any{
		"simulated_time":   lastTime,
		"tick_count":       len(payload.Ticks),
		"avg_cpu":          avgCPU,
		"avg_net_mbps":     avgNet,
		"live_ticks":       liveMap,
		"sample_tick":      sampleTick,
		"anomaly_injected": payload.AnomalyInjected,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":           true,
		"avg_cpu":      avgCPU,
		"avg_net_mbps": avgNet,
	})
}

func handleIngestAnomaly(s *AppState, w http.ResponseWriter, r *http.Request) {
	var anomaly map[string]any
	if err := json.NewDecoder(r.Body).Decode(&anomaly); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid anomaly JSON"})
		return
	}

	timestamp, _ := anomaly["timestamp"].(string)
	if timestamp == "" {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	resName, _ := anomaly["resource_name"].(string)
	resID, _ := anomaly["resource_id"].(string)

	zScore, ok := getFloat(anomaly["z_score"])
	if !ok || zScore == 0 {
		zScore = 4.62
	}

	alertObj := map[string]any{
		"id":                    fmt.Sprintf("live-alert-%d", time.Now().UnixNano()),
		"severity":              "CRITICAL",
		"type":                  "ACUTE_ANOMALY",
		"resource_id":           resID,
		"resource_name":         resName,
		"z_score":               zScore,
		"title":                 fmt.Sprintf("LIVE SPIKE: %s (%s)", resName, resID),
		"message":               anomaly["message"],
		"timestamp":             timestamp,
		"action_recommendation": "Emergency investigation required. Verify abnormal egress and active thread dump.",
	}

	s.mu.Lock()
	s.dynamicAlerts = append([]map[string]any{alertObj}, s.dynamicAlerts...)
	s.mu.Unlock()

	s.broker.Broadcast("anomaly", alertObj)

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"alert": alertObj,
	})
}

func handleTriggerAnomalyProxy(s *AppState, w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)

	url := fmt.Sprintf("%s/sim/trigger-anomaly", s.infraServerURL)
	req, err := http.NewRequestWithContext(r.Context(), "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Failed to create proxy request"})
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error":   "Failed to reach Utho infra server",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

