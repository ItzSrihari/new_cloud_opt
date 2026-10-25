package main

import (
	"encoding/json"
	"log"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type AppState struct {
	mu                sync.RWMutex
	data              *AnalyticsCache
	recStatusMap      map[string]string
	dynamicAlerts     []map[string]any
	lastSimulatedTime string
	latestLiveTicks   []map[string]any
	broker            *SSEBroker
	cacheFile         string
	cliRunnerPath     string
	pythonBin         string
	infraServerURL    string
}

func findExistingFile(candidates ...string) string {
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	if len(candidates) > 0 {
		return candidates[0]
	}
	return ""
}

func NewAppState() *AppState {
	cwd, _ := os.Getwd()
	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)

	cacheFile := findExistingFile(
		filepath.Join(cwd, "cache", "analytics_cache.json"),
		filepath.Join(cwd, "optimizer-engine-server", "cache", "analytics_cache.json"),
		filepath.Join(exeDir, "cache", "analytics_cache.json"),
		filepath.Join(cwd, "..", "cache", "analytics_cache.json"),
	)

	cliRunnerPath := findExistingFile(
		filepath.Join(cwd, "analytics", "cli_runner.py"),
		filepath.Join(cwd, "optimizer-engine-server", "analytics", "cli_runner.py"),
		filepath.Join(exeDir, "analytics", "cli_runner.py"),
		filepath.Join(cwd, "..", "analytics", "cli_runner.py"),
	)

	// Python binary selection: prefer .venv/bin/python if present
	pythonBin := os.Getenv("PYTHON_BIN")
	if pythonBin == "" {
		venvPython := findExistingFile(
			filepath.Join(cwd, ".venv", "bin", "python"),
			filepath.Join(cwd, "..", ".venv", "bin", "python"),
			filepath.Join(exeDir, "..", ".venv", "bin", "python"),
		)
		if _, err := os.Stat(venvPython); err == nil {
			pythonBin = venvPython
		} else {
			pythonBin = "python3"
		}
	}

	infraURL := os.Getenv("INFRA_SERVER_URL")
	if infraURL == "" {
		infraURL = "http://localhost:8001"
	}

	s := &AppState{
		recStatusMap:      make(map[string]string),
		dynamicAlerts:     make([]map[string]any, 0),
		lastSimulatedTime: time.Now().UTC().Format(time.RFC3339),
		latestLiveTicks:   make([]map[string]any, 0),
		broker:            NewSSEBroker(),
		cacheFile:         cacheFile,
		cliRunnerPath:     cliRunnerPath,
		pythonBin:         pythonBin,
		infraServerURL:    infraURL,
	}

	// Load or trigger initial cache
	if !s.loadAnalyticsCache() {
		log.Println("[Optimizer-Go] Cache missing at boot, triggering Python analytics generator...")
		s.generateCacheSync()
		s.loadAnalyticsCache()
	}

	return s
}

func (s *AppState) loadAnalyticsCache() bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	raw, err := os.ReadFile(s.cacheFile)
	if err != nil {
		return false
	}

	var parsed AnalyticsCache
	if err := json.Unmarshal(raw, &parsed); err != nil {
		log.Printf("[Optimizer-Go] Error parsing cache JSON: %v", err)
		return false
	}

	s.data = &parsed

	// Initialize recommendation statuses
	for _, rec := range s.data.Recommendations {
		if id, ok := rec["id"].(string); ok && id != "" {
			if _, exists := s.recStatusMap[id]; !exists {
				s.recStatusMap[id] = "pending"
			}
		}
	}

	return true
}

func (s *AppState) generateCacheSync() {
	cmd := exec.Command(s.pythonBin, s.cliRunnerPath, "generate_all")
	cmd.Env = os.Environ()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Printf("[Optimizer-Go] Error running Python generator: %v", err)
	}
}

// computeDynamicFinancials calculates live financial numbers based on accepted recommendation statuses
func (s *AppState) computeDynamicFinancials(filterEnv, filterReg, filterTeam string) DynamicFinancials {
	s.mu.RLock()
	defer s.mu.RUnlock()

	defaultFinancials := DynamicFinancials{
		CurrentMonthlySpendINR:   487200,
		ProjectedMonthlySpendINR: 292550,
		PotentialTotalSavingsINR: 194650,
		AcceptedSavingsINR:       0,
		AcceptedCount:            0,
		PendingCount:             0,
		RejectedCount:            0,
		AcceptedByEnv:            map[string]float64{"prod": 0, "staging": 0, "dev": 0},
		Sustainability: SustainabilityMetrics{
			MonthlyKwhSaved:   0,
			MonthlyCo2KgSaved: 0,
			TreesEquivalent:   0,
		},
	}

	if s.data == nil {
		return defaultFinancials
	}

	var totalBaseline float64
	var totalPotentialSavings float64
	var totalAcceptedSavings float64
	var acceptedCount int
	var pendingCount int
	var rejectedCount int
	envAcceptedSavings := map[string]float64{"prod": 0, "staging": 0, "dev": 0}

	resMatches := func(item map[string]any) bool {
		if filterEnv != "" && !strings.EqualFold(filterEnv, "all") {
			env, _ := item["environment"].(string)
			if !strings.EqualFold(env, filterEnv) {
				return false
			}
		}
		if filterReg != "" && !strings.EqualFold(filterReg, "all") {
			reg, _ := item["region"].(string)
			if !strings.EqualFold(reg, filterReg) {
				return false
			}
		}
		if filterTeam != "" && !strings.EqualFold(filterTeam, "all") {
			team, _ := item["team"].(string)
			if !strings.EqualFold(team, filterTeam) {
				return false
			}
		}
		return true
	}

	for _, res := range s.data.Resources {
		if resMatches(res) {
			cost, _ := getFloat(res["monthly_cost_inr"])
			totalBaseline += cost
		}
	}

	for _, rec := range s.data.Recommendations {
		if !resMatches(rec) {
			continue
		}
		id, _ := rec["id"].(string)
		status := s.recStatusMap[id]
		if status == "" {
			status = "pending"
		}

		sav, _ := getFloat(rec["monthly_savings_inr"])
		if sav > 0 {
			totalPotentialSavings += sav
		}

		if status == "accepted" {
			acceptedCount++
			totalAcceptedSavings += sav
			envKey := "prod"
			if env, ok := rec["environment"].(string); ok && env != "" {
				envKey = strings.ToLower(env)
			}
			envAcceptedSavings[envKey] += sav
		} else if status == "rejected" {
			rejectedCount++
		} else {
			pendingCount++
		}
	}

	projectedSpend := totalBaseline - totalAcceptedSavings
	if projectedSpend < 0 {
		projectedSpend = 0
	}

	kwhSaved := (totalAcceptedSavings / 100.0) * 12.5
	co2Saved := kwhSaved * 0.71
	treesEquivalent := co2Saved / 1.75

	round1 := func(v float64) float64 {
		return math.Round(v*10) / 10
	}

	return DynamicFinancials{
		CurrentMonthlySpendINR:   totalBaseline,
		ProjectedMonthlySpendINR: projectedSpend,
		PotentialTotalSavingsINR: totalPotentialSavings,
		AcceptedSavingsINR:       totalAcceptedSavings,
		AcceptedCount:            acceptedCount,
		PendingCount:             pendingCount,
		RejectedCount:            rejectedCount,
		AcceptedByEnv:            envAcceptedSavings,
		Sustainability: SustainabilityMetrics{
			MonthlyKwhSaved:   round1(kwhSaved),
			MonthlyCo2KgSaved: round1(co2Saved),
			TreesEquivalent:   round1(treesEquivalent),
		},
	}
}

// Helper to convert any number type from JSON to float64
func getFloat(val any) (float64, bool) {
	switch v := val.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case json.Number:
		f, err := v.Float64()
		return f, err == nil
	default:
		return 0, false
	}
}

