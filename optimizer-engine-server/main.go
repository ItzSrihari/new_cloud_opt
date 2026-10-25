package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	loadEnvFiles()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8002"
	}

	state := NewAppState()
	mux := http.NewServeMux()

	// 1. Overview
	mux.HandleFunc("GET /api/overview", func(w http.ResponseWriter, r *http.Request) {
		handleOverview(state, w, r)
	})

	// 2. Resources list
	mux.HandleFunc("GET /api/resources", func(w http.ResponseWriter, r *http.Request) {
		handleResources(state, w, r)
	})

	// 3. Resource metrics + recommendation drilldown
	mux.HandleFunc("GET /api/resources/{id}/metrics", func(w http.ResponseWriter, r *http.Request) {
		handleResourceMetrics(state, w, r)
	})

	// 4. Recommendations list
	mux.HandleFunc("GET /api/recommendations", func(w http.ResponseWriter, r *http.Request) {
		handleRecommendations(state, w, r)
	})

	// 5. Update single recommendation status
	mux.HandleFunc("POST /api/recommendations/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		handleUpdateRecommendationStatus(state, w, r)
	})

	// 6. Bulk update recommendation statuses
	mux.HandleFunc("POST /api/recommendations/bulk-status", func(w http.ResponseWriter, r *http.Request) {
		handleBulkUpdateRecommendations(state, w, r)
	})

	// 7. What-If policy simulator
	mux.HandleFunc("POST /api/what-if", func(w http.ResponseWriter, r *http.Request) {
		handleWhatIf(state, w, r)
	})

	// 8. Alerts & forecast
	mux.HandleFunc("GET /api/alerts-and-forecast", func(w http.ResponseWriter, r *http.Request) {
		handleAlertsAndForecast(state, w, r)
	})

	// 9. Server-Sent Events (SSE) stream
	mux.HandleFunc("GET /api/stream", func(w http.ResponseWriter, r *http.Request) {
		state.broker.ServeHTTP(w, r)
	})

	// 10. Ingest tick (from Server 1)
	mux.HandleFunc("POST /api/internal/ingest-tick", func(w http.ResponseWriter, r *http.Request) {
		handleIngestTick(state, w, r)
	})

	// 11. Ingest anomaly (from Server 1)
	mux.HandleFunc("POST /api/internal/ingest-anomaly", func(w http.ResponseWriter, r *http.Request) {
		handleIngestAnomaly(state, w, r)
	})

	// 12. Chatbot (eDIth Gemini AI)
	mux.HandleFunc("POST /api/chat", func(w http.ResponseWriter, r *http.Request) {
		handleChat(state, w, r)
	})

	// 13. Trigger anomaly proxy (to Server 1)
	mux.HandleFunc("POST /api/sim/trigger-anomaly", func(w http.ResponseWriter, r *http.Request) {
		handleTriggerAnomalyProxy(state, w, r)
	})

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		handleHealth(state, port, w, r)
	})

	handler := corsMiddleware(mux)

	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("[Optimizer-Engine-Go] Listening on http://%s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("[Optimizer-Engine-Go] Server exited with error: %v", err)
	}
}

