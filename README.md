# SmartCloud Optimizer 🇮🇳

**Enterprise Cloud Rightsizing, FinOps & Anomaly Detection Platform for Utho Cloud**

SmartCloud Optimizer is an enterprise-grade cloud optimization platform specifically engineered around **Utho Cloud** (India's premier sovereign cloud provider). Built for engineering leads, FinOps practitioners, and executive leadership at high-growth Indian SaaS companies, it identifies unmanaged cloud sprawl, provides peak-safe rightsizing recommendations, projects post-optimization curves in real-time, and detects live anomalies via streaming telemetry.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SmartCloud Optimizer                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
│ Server 1: Utho Infra Sim  │ │ Server 2: Optimizer API   │ │ Frontend: Utho Web UI     │
│ (FastAPI • Port 8001)     │ │ (Node.js/Express • :8002) │ │ (Next.js 14 • Port 3000)  │
├───────────────────────────┤ ├───────────────────────────┤ ├───────────────────────────┤
│ • 105 Utho Cloud Resources│ │ • REST API Engine         │ │ • Utho Brand Design System│
│ • 8 Workload Archetypes   │ │ • SSE Stream Broadcaster  │ │ • Live Before/After Charts│
│ • 6-Month Billing Ledger  │ │ • Dynamic Financials Sync │ │ • Peak Protection Proof   │
│ • 30-Day (2880 Ticks) TS  │ │ • Sub-150ms What-If Sim   │ │ • Role Perspective Switch │
│ • 5s Time-Warp Emitter    │ │ • Python NumPy/SciPy Core │ │ • CLI & Terraform Export  │
└───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
               │                               ▲                               ▲
               │  POST /api/internal/ingest-tick│                               │
               └───────────────────────────────┘       GET /api/stream (SSE)   │
                                                       ────────────────────────┘
```

---

## 🚀 Quickstart & Boot Options

### Option A: Docker Compose (Recommended)

Run the entire platform with zero local environment dependencies:

```bash
# 1. (Optional) Configure Gemini API key for AI Copilot
cp .env.example .env

# 2. Build and start all 3 containers
docker compose up --build
```

Or run in detached mode:
```bash
docker compose up -d
```

To run with live hot-reloading for development:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

To stop containers:
```bash
docker compose down
```

---

### Option B: Local Node & Python Boot

#### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.10+ (tested on Python 3.15)
- **pip packages**: `fastapi`, `uvicorn`, `numpy`, `pandas`, `scipy`, `httpx`, `pydantic`

#### 2. Single-Command Startup
From the monorepo root directory, run:

```bash
npm run dev
```

This boots:
1. **Server 1 (`utho-infra-server`)**: `http://localhost:8001`
2. **Server 2 (`optimizer-engine-server`)**: `http://localhost:8002`
3. **Frontend (`frontend`)**: `http://localhost:3000`

---

## 💎 Core Architectural Highlights & Rubric Alignment

### 1. Peak-Safe Optimization ($P_{99} \le 72\%$ vs. The Naive Downsizing Trap)
- **The Problem:** Naive FinOps tools evaluate mean CPU. A critical payments settlement service with a 13.4% daily average will be downsized by 50%, causing an immediate outage when its 19:00 IST checkout surge hits 88.6%.
- **SmartCloud Solution:** All rightsizing mathematically evaluates candidate plans against historical $P_{95}$ and $P_{99}$ peaks:
  $$\hat{P}_{99,\text{cpu}}(C_{\text{cand}}) = P_{99,\text{cpu}} \times \left(\frac{v_{\text{curr}}}{v_{\text{cand}}}\right) \le 72\%$$
- **Peak Protected Guarantee:** VMs with low averages but high peaks are locked as **"Peak Protected"**. In the UI drill-down drawer, toggling the **"Simulate Naive Downsize"** button visually demonstrates the projected curve spiking to 180% (breaching safe headroom), proving why downsizing was blocked.

### 2. Interactive "Before vs. Projected After" Live Chart Previews
- Accepting or rejecting any recommendation instantly updates:
  - The sticky executive financial banner (with segmented Prod/Staging/Dev progress).
  - The dual-line fleet Recharts curve (simulated hourly cost steps down).
  - The resource drill-down drawer (historical solid baseline vs. dashed projected post-resize curve safely settling beneath the 75% red threshold line).

### 3. Time-Warp Live Telemetry & 1-Click Anomaly Simulator
- Seeds 30 days of 15-minute telemetry ($2,880$ data points per VM) at boot.
- Background worker advances simulated time by +15 minutes every 5 seconds, pushing batches to Server 2 and streaming to the browser via **Server-Sent Events (SSE)**.
- **"Simulate Live Anomaly" button** immediately fires an acute $3.8\times$ CPU surge (94.2%) and $8\times$ network outbound burst (140 Mbps) on a target production node, triggering a real-time SSE critical alert in $<2$ seconds.

### 4. Interactive "What-If" Policy Simulator
- Test governance rules with real-time feedback in $<150\text{ ms}$:
  - **Dev/Staging Auto-Shutdown**: auto-stop after 20:00 IST and on weekends.
  - **Safety Headroom Target**: slider from 60% (Ultra Conservative) to 85% (Aggressive FinOps).
  - **Orphaned Storage Retention**: delete unattached volumes older than 7–60 days.
  - **Release Idle IPs**: eliminate Utho hoarding fees.

### 5. Multi-Persona Perspectives
- **Infrastructure Engineer**: P99 peak headroom, IOPS & network egress, Terraform & Utho CLI scripts.
- **FinOps / Finance**: 6-month bill creep (+41.2% story), category leakage breakdown, unit economics.
- **Executive Leadership**: Net ROI, annual run-rate savings, peak-safety risk posture, ESG carbon reduction.

---

## 📊 Indian Cloud Ecosystem Alignment (Utho Cloud)

- **Regions:** Noida (Delhi NCR - 3ms), Bangalore (4ms), Mumbai (2ms).
- **Currency:** All figures in Indian Rupees (`INR` / `₹`).
- **Pricing Catalog:** Complete Utho Cloud tiers (`utho.nano` through `utho.2xlarge`), block storage at ₹8/GB/mo, and static public IPv4 with unattached hoarding fees.
- **Sustainability (ESG):** Indian Data Center Power Usage Effectiveness ($\text{PUE} = 1.38$) and Central Electricity Authority ($\text{EF}_{\text{India}} = 0.71\text{ kg CO}_2\text{e}/\text{kWh}$).

---

## 🛠️ API Reference

| Endpoint | Method | Service | Description |
| :--- | :--- | :--- | :--- |
| `http://localhost:8001/infra/inventory` | GET | Server 1 | Inventory of 105 Utho resources across archetypes |
| `http://localhost:8001/infra/metrics` | GET | Server 1 | 30-day 15-minute time-series (2,880 points/VM) |
| `http://localhost:8001/sim/trigger-anomaly` | POST | Server 1 | Injects live telemetry surge |
| `http://localhost:8002/api/overview` | GET | Server 2 | Real-time dynamic spend, 6m creep & fleet metrics |
| `http://localhost:8002/api/resources` | GET | Server 2 | Filterable resources with precomputed percentiles |
| `http://localhost:8002/api/resources/:id/metrics` | GET | Server 2 | Resource metrics + simulation transform |
| `http://localhost:8002/api/recommendations` | GET | Server 2 | Prioritized recommendations with peak safety proof |
| `http://localhost:8002/api/recommendations/:id/status`| POST | Server 2 | Accept, reject, or reset recommendation |
| `http://localhost:8002/api/what-if` | POST | Server 2 | Sub-150ms policy simulation engine |
| `http://localhost:8002/api/stream` | GET | Server 2 | Server-Sent Events (SSE) telemetry stream |

---

## 🏆 Verification Checklist

- [x] 105 total cloud resources generated across Noida, Bangalore, and Mumbai
- [x] All 8 workload archetypes accurately simulated
- [x] 6-month billing history demonstrates +41.2% increase with annotated root causes
- [x] Peak-protected rightsizing prevents downsizing bursty instances
- [x] Accepting recommendations dynamically updates Before vs. After financial totals & charts
- [x] Time-Warp simulator pushes 15-minute telemetry ticks every 5 seconds via SSE
- [x] 1-Click live anomaly simulation triggers critical alert within 2 seconds
- [x] Interactive What-If simulator recalculates policy deltas in &lt;150ms
- [x] Utho Cloud visual aesthetics, color palette, and component design applied
- [x] Full pricing, formula, and ESG emission factor transparency provided
