package main

// SustainabilityMetrics holds ESG sustainability figures
type SustainabilityMetrics struct {
	MonthlyKwhSaved   float64 `json:"monthly_kwh_saved"`
	MonthlyCo2KgSaved float64 `json:"monthly_co2_kg_saved"`
	TreesEquivalent   float64 `json:"trees_equivalent"`
}

// DynamicFinancials holds real-time spend and savings totals
type DynamicFinancials struct {
	CurrentMonthlySpendINR   float64               `json:"current_monthly_spend_inr"`
	ProjectedMonthlySpendINR float64               `json:"projected_monthly_spend_inr"`
	PotentialTotalSavingsINR float64               `json:"potential_total_savings_inr"`
	AcceptedSavingsINR       float64               `json:"accepted_savings_inr"`
	AcceptedCount            int                   `json:"accepted_count"`
	PendingCount             int                   `json:"pending_count"`
	RejectedCount            int                   `json:"rejected_count"`
	AcceptedByEnv            map[string]float64    `json:"accepted_by_env"`
	Sustainability           SustainabilityMetrics `json:"sustainability"`
}

// OverviewResponse represents the complete payload for GET /api/overview
type OverviewResponse struct {
	DynamicFinancials
	BillingHistory6M     any    `json:"billing_history_6m"`
	FleetSummary         any    `json:"fleet_summary"`
	AggregatedTimeseries any    `json:"aggregated_timeseries"`
	LastSimulatedTime    string `json:"last_simulated_time"`
}

// AnalyticsCache represents the root structure stored in analytics_cache.json
type AnalyticsCache struct {
	Resources                 []map[string]any `json:"resources"`
	Recommendations           []map[string]any `json:"recommendations"`
	BillingHistory            []map[string]any `json:"billing_history"`
	AlertsAndForecast         map[string]any   `json:"alerts_and_forecast"`
	FleetAggregatedTimeseries []map[string]any `json:"fleet_aggregated_timeseries"`
	CurrentMonthlySpendINR    float64          `json:"current_monthly_spend_inr"`
	PotentialTotalSavingsINR  float64          `json:"potential_total_savings_inr"`
	Sustainability            map[string]any   `json:"sustainability"`
	FleetCounts               map[string]any   `json:"fleet_counts"`
}

// ChatRequest payload for POST /api/chat
type ChatRequest struct {
	Message string `json:"message"`
	History []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"history,omitempty"`
}

// ChatResponse payload for POST /api/chat
type ChatResponse struct {
	Reply   string `json:"reply"`
	Warning string `json:"warning,omitempty"`
	Error   string `json:"error,omitempty"`
}

