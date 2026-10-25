package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

const OutOfContextMessage = "I am eDIth (Enterprise Diagnostics & Infrastructure Telemetry Hub) for Utho Cloud. I am programmed to assist exclusively with cloud infrastructure, FinOps, rightsizing, telemetry diagnostics, and spending analysis. How can I assist with your cloud architecture today?"

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiSystemInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type geminiGenerationConfig struct {
	Temperature float64 `json:"temperature"`
}

type geminiRequest struct {
	SystemInstruction *geminiSystemInstruction `json:"system_instruction,omitempty"`
	Contents          []geminiContent          `json:"contents"`
	GenerationConfig  *geminiGenerationConfig  `json:"generationConfig,omitempty"`
}

type geminiCandidate struct {
	Content struct {
		Parts []geminiPart `json:"parts"`
	} `json:"content"`
}

type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
	Error      *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

func buildSystemPrompt(s *AppState) string {
	financials := s.computeDynamicFinancials("", "", "")

	s.mu.RLock()
	defer s.mu.RUnlock()

	currentSpend := financials.CurrentMonthlySpendINR
	if currentSpend == 0 {
		currentSpend = 487200
	}
	potentialSavings := financials.PotentialTotalSavingsINR
	if potentialSavings == 0 {
		potentialSavings = 194650
	}
	acceptedSavings := financials.AcceptedSavingsINR
	projectedSpend := financials.ProjectedMonthlySpendINR
	if projectedSpend == 0 {
		projectedSpend = currentSpend - potentialSavings
	}

	resourceCount := 105
	if s.data != nil && len(s.data.Resources) > 0 {
		resourceCount = len(s.data.Resources)
	}

	var recsSummaryLines []string
	if s.data != nil && len(s.data.Recommendations) > 0 {
		limit := 8
		if len(s.data.Recommendations) < limit {
			limit = len(s.data.Recommendations)
		}
		for idx, rec := range s.data.Recommendations[:limit] {
			action, _ := rec["action_type"].(string)
			if action == "" {
				action, _ = rec["action"].(string)
			}
			if action == "" {
				action = "optimize"
			}

			resName, _ := rec["resource_name"].(string)
			if resName == "" {
				resName, _ = rec["resource_id"].(string)
			}

			env, _ := rec["environment"].(string)
			if env == "" {
				env = "prod"
			}
			region, _ := rec["region"].(string)
			if region == "" {
				region = "Noida"
			}

			sav, _ := getFloat(rec["monthly_savings_inr"])
			curCfg, _ := rec["current_config"].(string)
			tgtCfg, _ := rec["target_config"].(string)
			protStatus, _ := rec["protection_status"].(string)
			isPeakProtected := protStatus == "PEAK_PROTECTED"
			reason, _ := rec["plain_language_reason"].(string)

			recsSummaryLines = append(recsSummaryLines, fmt.Sprintf(
				"%d. [%s] %s (%s, %s): Save ₹%.0f/mo. Current: %s -> Target: %s. Peak Protected: %t. Reason: %s",
				idx+1, strings.ToUpper(action), resName, env, region, sav, curCfg, tgtCfg, isPeakProtected, reason,
			))
		}
	}

	recsSummary := strings.Join(recsSummaryLines, "\n")

	reductionPct := 0.0
	if currentSpend > 0 {
		reductionPct = (potentialSavings / currentSpend) * 100
	}

	return fmt.Sprintf(`You are eDIth (Enterprise Diagnostics & Infrastructure Telemetry Hub), an advanced cloud intelligence system and FinOps advisor embedded within the SmartCloud Optimizer platform for Utho Cloud (India's premier sovereign cloud provider).

MISSION & DOMAIN:
You help engineering leads, DevOps engineers, FinOps practitioners, and leadership understand Utho Cloud spending, optimize compute/storage/network resources, explain peak-safe rightsizing recommendations, and analyze live telemetry anomalies.

STRICT RELEVANCE & OUT-OF-CONTEXT GUARDRAIL (CRITICAL):
You ONLY answer questions related to:
1. Cloud infrastructure, architecture, sizing, and performance (CPU, RAM, Disk IOPS, Network egress).
2. FinOps, cloud billing, cost optimization, rightsizing, waste elimination, and spend forecasts.
3. Utho Cloud services, tiers (utho.nano through utho.2xlarge), pricing, and Indian sovereign regions (Noida, Bangalore, Mumbai).
4. SmartCloud Optimizer dashboard features, What-If simulator policies, Peak Protection guarantees, and ESG carbon emissions.

IF THE USER QUERY IS IRRELEVANT OR OUT OF CONTEXT (e.g. asking for poems, general world knowledge, recipes, sports, movie reviews, casual chit-chat, personal advice, unrelated coding or homework):
You MUST immediately decline politely with EXACTLY this message:
"%s"
Do NOT provide partial answers, apologies, or creative interpretations for irrelevant queries.

LIVE CLOUD CONTEXT (REAL-TIME SNAPSHOT):
- Platform: SmartCloud Optimizer for Utho Cloud 🇮🇳
- Current Monthly Spend: ₹%.0f
- Potential Monthly Savings: ₹%.0f (%.1f%% reduction opportunity)
- Accepted Savings: ₹%.0f
- Projected Monthly Spend: ₹%.0f
- Annualized Potential Savings: ₹%.0f
- Fleet Size: %d cloud resources across Noida (Delhi NCR), Mumbai, and Bangalore
- 6-Month Spend Trend: Crept from ₹3,45,000 to ₹4,87,200 (+41.2%% growth)
- Key Waste Drivers Identified:
  * Orphaned unattached block storage volumes (billed at ₹8/GB/month)
  * Unattached static public IPv4 addresses incurring hoarding fees
  * Development/Staging clusters left running 24/7 without weekend auto-shutdown
  * Over-provisioned compute with low average and low peak usage
- Peak Protection Rule:
  * SmartCloud evaluates P95 and P99 peak CPU before suggesting downsizing.
  * Formula: Projected P99 CPU = (Current P99 CPU) * (Current vCPUs / Target vCPUs). If > 72%%, downsizing is BLOCKED as "Peak Protected" to prevent outages during evening peak hours (e.g. 19:00 IST payments spikes).
- Sustainability & ESG:
  * Indian Data Center PUE: 1.38
  * Central Electricity Authority Emission Factor: 0.71 kg CO2e/kWh
  * Projected Annual Carbon Reduction: ~2,460 kg CO2e

SAMPLE HIGH-IMPACT RECOMMENDATIONS IN FLEET:
%s

RESPONSE GUIDELINES:
- Always format currency in Indian Rupees (₹ or INR).
- Identity: You are eDIth (Enterprise Diagnostics & Infrastructure Telemetry Hub). Maintain a concise, confident, and analytical tone.
- Reference specific resources, numbers, and peak metrics whenever answering questions about the fleet.
- Use markdown formatting (bullet points, bold text, code tags) for clarity.`,
		OutOfContextMessage,
		currentSpend,
		potentialSavings,
		reductionPct,
		acceptedSavings,
		projectedSpend,
		potentialSavings*12,
		resourceCount,
		recsSummary,
	)
}

func handleChat(s *AppState, w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON payload"})
		return
	}

	query := strings.TrimSpace(req.Message)
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Message is required and must be non-empty."})
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		loadEnvFiles()
		apiKey = os.Getenv("GEMINI_API_KEY")
	}

	if apiKey == "" {
		writeJSON(w, http.StatusOK, ChatResponse{
			Reply:   "⚠️ **eDIth Offline**: API key is not configured.\n\nPlease add your API key to `.env`:\n```env\nGEMINI_API_KEY=your_key_here\n```",
			Warning: "MISSING_API_KEY",
		})
		return
	}

	systemInstructionText := buildSystemPrompt(s)

	var contents []geminiContent
	for _, h := range req.History {
		role := h.Role
		if role != "user" && role != "model" {
			role = "user"
		}
		if strings.TrimSpace(h.Content) != "" {
			contents = append(contents, geminiContent{
				Role:  role,
				Parts: []geminiPart{{Text: h.Content}},
			})
		}
	}
	contents = append(contents, geminiContent{
		Role:  "user",
		Parts: []geminiPart{{Text: query}},
	})

	preferredModel := os.Getenv("GEMINI_MODEL")
	if preferredModel == "" {
		preferredModel = "gemini-flash-lite-latest"
	}

	candidates := []string{
		preferredModel,
		"gemini-flash-lite-latest",
		"gemini-3.1-flash-lite",
		"gemini-3.5-flash",
		"gemini-3.8-flash",
	}

	// Remove duplicate models in order
	seen := make(map[string]bool)
	var uniqueCandidates []string
	for _, m := range candidates {
		if !seen[m] {
			seen[m] = true
			uniqueCandidates = append(uniqueCandidates, m)
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	var lastErr error
	var replyText string

	for _, model := range uniqueCandidates {
		gemReq := geminiRequest{
			SystemInstruction: &geminiSystemInstruction{
				Parts: []geminiPart{{Text: systemInstructionText}},
			},
			Contents: contents,
			GenerationConfig: &geminiGenerationConfig{
				Temperature: 0.2,
			},
		}

		reqBytes, err := json.Marshal(gemReq)
		if err != nil {
			continue
		}

		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
		httpReq, err := http.NewRequestWithContext(r.Context(), "POST", url, bytes.NewReader(reqBytes))
		if err != nil {
			lastErr = err
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(httpReq)
		if err != nil {
			lastErr = err
			log.Printf("[eDIth Chat] Model %s network error: %v", model, err)
			continue
		}

		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("status %d: %s", resp.StatusCode, string(bodyBytes))
			log.Printf("[eDIth Chat] Model %s returned status %d, falling back to next candidate...", model, resp.StatusCode)
			continue
		}

		var gemResp geminiResponse
		if err := json.Unmarshal(bodyBytes, &gemResp); err != nil {
			lastErr = err
			continue
		}

		if len(gemResp.Candidates) > 0 && len(gemResp.Candidates[0].Content.Parts) > 0 {
			replyText = gemResp.Candidates[0].Content.Parts[0].Text
			break
		}
	}

	if replyText == "" {
		if lastErr != nil {
			log.Printf("[eDIth Chat] All candidates failed. Last error: %v", lastErr)
		}
		writeJSON(w, http.StatusOK, ChatResponse{
			Reply: OutOfContextMessage,
		})
		return
	}

	writeJSON(w, http.StatusOK, ChatResponse{
		Reply: replyText,
	})
}

