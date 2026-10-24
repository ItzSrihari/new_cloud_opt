# SmartCloud Optimizer — Master Engineering Specification for Antigravity Agent

## 1. Executive Summary & Mission
You are building **SmartCloud Optimizer**, an enterprise-grade cloud infrastructure rightsizing, FinOps, and anomaly detection platform modeled around **Utho Cloud** (an Indian cloud provider).

### The Scenario
The target user is the engineering, FinOps, and leadership team at a mid-sized Indian SaaS company running **105 cloud resources** (75 Virtual Machines, 18 Block Volumes, and 12 Public IPs) across three Indian regions (**Noida**, **Bangalore**, and **Mumbai**) and three environments (**prod**, **staging**, and **dev**). Over the past 6 months, their monthly cloud bill grew by **$40\%$**, and leadership needs immediate visibility and safe, actionable optimizations they can trust and execute before lunch on a Monday morning.

### Core Architectural Philosophy
1. **Peak-Safe Optimization (25% Judging Weight):** Never recommend downsizing a VM based solely on average utilization. All rightsizing math must evaluate $P_{95}$ and $P_{99}$ peak utilization and verify that projected post-resize $P_{99}$ stays below a safe ceiling ($75\%$). VMs with low averages but high daily peaks must be explicitly marked as **"Peak Protected"**.
2. **Interactive "Before vs. Projected After" Live Chart Previews:** Accepting or rejecting a recommendation must immediately update both the financial totals and the **time-series utilization charts** (overlaying the projected post-optimization CPU/RAM/Cost curves against the historical baseline).
3. **Time-Warp Live Telemetry:** Include a 30-day historical dataset at 15-minute granularity ($2,880$ data points per VM) generated at boot, paired with a live **Time-Warp Simulator** that streams a new 15-minute telemetry tick every 5 real-world seconds via Server-Sent Events (SSE), plus a 1-click **"Trigger Live Anomaly"** button for the live demo.
4. **Full Transparency:** Every recommendation and savings estimate must expose its exact underlying pricing table, formula, confidence score, and risk calculation.

---

## 2. System Architecture & Monorepo Layout

Build the project as a clean monorepo with three coordinated services and a single command startup script:

```text
smartcloud-optimizer/
├── package.json                     # Root workspace runner (concurrently runs all 3 services)
├── README.md                        # Setup instructions, architecture diagram, and assumptions
├── utho-infra-server/               # SERVER 1: Utho Cloud Infrastructure & Telemetry Simulator (Python FastAPI)
│   ├── requirements.txt             # fastapi, uvicorn, numpy, pandas, httpx, pydantic
│   ├── main.py                      # FastAPI server + Time-Warp background tick emitter
│   ├── catalog.py                   # Utho VM plans, Volume & IP pricing in INR
│   ├── generator.py                 # Vectorized NumPy/Pandas 30-day time-series & 6-month billing generator
│   └── data/                        # Generated seed JSON/Parquet cache (auto-created on boot)
├── optimizer-engine-server/         # SERVER 2: Analytics & Optimization Engine (Node.js/Express + Python Math Worker)
│   ├── package.json                 # express, cors, dotenv,tsx/typescript
│   ├── src/
│   │   ├── server.ts                # Express API server + SSE broadcaster
│   │   ├── routes/                  # API routes (/overview, /resources, /recommendations, /what-if, /alerts, /stream)
│   │   ├── state/                   # In-memory/SQLite state for accepted/rejected recommendations & live ticks
│   │   └── services/
│   │       └── pythonBridge.ts      # Executes/queries Python NumPy/Pandas analytics engine
│   └── analytics/                   # Python Mathematical & Optimization Engine
│       ├── requirements.txt         # numpy, pandas, scipy
│       ├── engine.py                # P95/P99 rightsizing, OLS forecasting, anomaly Z-score, risk & carbon math
│       └── cli_runner.py            # Fast JSON stdin/stdout or local RPC bridge called by Node.js
└── frontend/                        # FRONTEND: Utho-styled Next.js 14+ Dashboard (App Router, Tailwind, Recharts)
    ├── package.json                 # next, react, tailwindcss, recharts, lucide-react, framer-motion, clsx
    ├── src/
    │   ├── app/                     # Next.js App Router pages
    │   ├── components/
    │   │   ├── layout/              # Utho Sidebar, Topbar, Role Switcher, Time-Warp Status Bar
    │   │   ├── dashboard/           # KPI Cards, Before/After Cost Bar, Regional/Env Breakdown
    │   │   ├── resources/           # Filterable Resource Table + Drill-Down Drawer with Live Before/After Charts
    │   │   ├── recommendations/     # Action Cards, Accept/Reject Toggles, Peak Protection Proof, IaC Modal
    │   │   ├── simulator/           # Interactive "What-If" Sliders & Real-time Impact Preview
    │   │   ├── alerts/              # Anomaly Feed, Capacity Creep Forecast (30-90 Days)
    │   │   └── assumptions/         # Pricing Catalog, Formulas, & Sustainability (CO2/kWh) Sheet
    │   └── lib/                     # API client, SSE hook, chart transformation helpers
```

### Ports & Service Communication
* **Server 1 (`utho-infra-server`):** Runs on `http://localhost:8001`. Generates the 105 Utho resources, 6-month billing history, and 30-day 15-minute time-series metrics. Pushes new simulated 15-minute telemetry ticks every 5 seconds via HTTP `POST` to Server 2 (`http://localhost:8002/api/internal/ingest-tick`).
* **Server 2 (`optimizer-engine-server`):** Runs on `http://localhost:8002`. Node.js/Express handles all REST endpoints and SSE streaming (`/api/stream`) for the frontend, while delegating all heavy statistical processing ($P_{50}, P_{95}, P_{99}$, Ordinary Least Squares linear regression, Z-score anomaly detection, and optimization synthesis) to its Python (`Pandas`/`NumPy`/`SciPy`) analytics module.
* **Frontend (`frontend`):** Runs on `http://localhost:3000`. Connects purely to Server 2 (`http://localhost:8002`).

---

## 3. Utho Pricing Catalog & Data Schemas

All currency must be displayed in **Indian Rupees (`INR` / `₹`)** with clean formatting (e.g., `₹4,800/mo`). Assume $1\text{ month} = 730\text{ hours}$.

### 3.1 Utho Instance Plans (`utho_plans`)
| Plan ID | Tier Name | vCPU | RAM (GB) | Disk Included (GB) | Hourly Cost (INR) | Monthly Cost (INR) | Typical Power Draw (Watts) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `utho.nano` | Nano Cloud | $1$ | $1$ | $25$ | $0.41$ | $300$ | $12\text{ W}$ |
| `utho.micro` | Micro Cloud | $1$ | $2$ | $40$ | $0.82$ | $600$ | $18\text{ W}$ |
| `utho.small` | Small Cloud | $2$ | $4$ | $80$ | $1.64$ | $1,200$ | $32\text{ W}$ |
| `utho.medium` | Medium Cloud | $4$ | $8$ | $160$ | $3.29$ | $2,400$ | $58\text{ W}$ |
| `utho.large` | Large Cloud | $8$ | $16$ | $320$ | $6.58$ | $4,800$ | $110\text{ W}$ |
| `utho.xlarge` | XLarge Cloud | $16$ | $32$ | $640$ | $13.15$ | $9,600$ | $210\text{ W}$ |
| `utho.2xlarge` | 2XLarge Cloud | $32$ | $64$ | $1280$ | $26.30$ | $19,200$ | $400\text{ W}$ |

### 3.2 Storage & Network Pricing
* **Block Storage Volume (`block_volume`):** $\text{Monthly Cost} = \text{Size in GB} \times 8\text{ INR/GB/month}$.
* **Static Public IPv4 (`public_ip`):** $\text{Monthly Cost} = 250\text{ INR/month}$ when attached to an active VM; $350\text{ INR/month}$ when unattached/idle (includes Utho IPv4 hoarding fee).

### 3.3 Resource Inventory Schema (`Resource`)
```json
{
  "resource_id": "vm-noida-prod-014",
  "name": "payments-worker-prod-04",
  "type": "vm",
  "region": "Noida",
  "environment": "prod",
  "team": "Payments",
  "plan_id": "utho.xlarge",
  "vcpu": 16,
  "ram_gb": 32,
  "disk_gb": 640,
  "monthly_cost_inr": 9600,
  "hourly_cost_inr": 13.15,
  "created_at": "2025-09-12T10:00:00Z",
  "attached_to": null,
  "days_unattached": 0,
  "workload_archetype": "overprovisioned_steady"
}
```
* Allowed `region` values: `"Noida"`, `"Bangalore"`, `"Mumbai"`.
* Allowed `environment` values: `"prod"`, `"staging"`, `"dev"`.
* Allowed `team` values: `"Payments"`, `"Core-API"`, `"Data-Platform"`, `"Growth-Frontend"`, `"QA-Automation"`.
* Allowed `type` values: `"vm"`, `"block_volume"`, `"public_ip"`.

---

## 4. Server 1 Specification: `utho-infra-server` (Python Data Generator & Simulator)

Server 1 represents Utho Cloud's internal infrastructure telemetry service. It must use fixed random seeds (`np.random.seed(42)`) so the baseline data is 100% reproducible, realistic, and mathematically tailored to showcase every requirement in the problem statement.

### 4.1 The 8 Mandatory Workload Archetypes (105 Total Resources)
Generate **75 VMs**, **18 Block Volumes**, and **12 Public IPs** distributed across Noida ($40\%$), Bangalore ($35\%$), and Mumbai ($25\%$):

1. **`overprovisioned_steady` ($22\text{ VMs}$):**
   * **Behavior:** Sized on `utho.large`, `utho.xlarge`, or `utho.2xlarge`, but actual CPU and RAM hover steadily between $8\%$ and $22\%$ all day, with $P_{99} \le 28\%$.
   * **Expected Engine Action:** Downsize by $1$ or $2$ plan tiers (e.g., `utho.xlarge` $\rightarrow$ `utho.medium`).
2. **`bursty_peak_protected` ($12\text{ VMs}$ — CRITICAL JUDGING TRAP):**
   * **Behavior:** Average CPU is very low ($11\% \text{ to } 15\%$), making a naive average-based tool recommend downsizing. However, every day for $45\text{ to }60\text{ minutes}$ (e.g., 19:00–20:00 IST checkout rush or settlement window), CPU spikes to $84\% \text{ to } 93\%$ ($P_{99} \ge 85\%$).
   * **Expected Engine Action:** **DO NOT DOWNSIZE.** Flag status as `"Peak Protected"` and display an explicit insight explaining that shrinking this VM would cause it to crash during its daily $P_{99}$ peak.
3. **`dev_off_hours_waste` ($16\text{ VMs}$ in `dev` and `staging`):**
   * **Behavior:** Active Monday–Friday between 09:00 and 20:00 IST ($\text{CPU } 35\% \text{ to } 65\%$), but completely idle ($\text{CPU } < 2.5\%$, $\text{Net I/O } < 0.2\text{ Mbps}$) from 20:00 to 09:00 IST on weeknights and all day Saturday & Sunday ($113\text{ idle hours}$ out of $168\text{ hours/week} \approx 67\%$ wasted runtime).
   * **Expected Engine Action:** Recommend **Off-Hours Auto-Shutdown Schedule** (saves $65\%$ of monthly VM cost).
4. **`batch_job_idle` ($8\text{ VMs}$):**
   * **Behavior:** Runs nightly ETL/settlement batch jobs from 01:00 to 04:00 IST ($\text{CPU } 75\% \text{ to } 90\%$), then sits completely idle ($\text{CPU } < 2\%$) for the remaining $21\text{ hours/day}$.
   * **Expected Engine Action:** Recommend converting to **Scheduled Ephemeral / Spot Batch Instance** (running only $3.5\text{ hrs/day}$, saving $\approx 85\%$).
5. **`zombie_vm` ($6\text{ VMs}$):**
   * **Behavior:** Leftover staging/dev servers from old sprints. $\text{CPU } < 1.8\%$, $\text{Memory } < 12\%$, $\text{Network In/Out } < 0.05\text{ Mbps}$ continuously for all 30 days.
   * **Expected Engine Action:** Recommend **Immediate Stop / Decommission** (saves $100\%$ after taking a final snapshot).
6. **`healthy_rightsized` ($6\text{ VMs}$):**
   * **Behavior:** Well-tuned production VMs with $P_{50} \approx 45\%$ and $P_{99} \approx 72\%$.
   * **Expected Engine Action:** Mark as `"Optimal"`.
7. **`capacity_creeper` ($3\text{ VMs}$):**
   * **Behavior:** Experiencing a steady memory leak or organic traffic growth where utilization increases by $+1.6\%\text{ per day}$ over the 30-day window (starting at $42\%$ and currently at $89\%$).
   * **Expected Engine Action:** Trigger a **Capacity Exhaustion Alert** (projected to breach $100\%$ within $6.8\text{ days}$) and recommend a proactive upsize or memory leak remediation.
8. **`genuine_anomaly` ($2\text{ VMs}$):**
   * **Behavior:** Normal baseline ($\text{CPU } \approx 25\%$, $\text{Net Out } \approx 15\text{ Mbps}$) for 29 days, followed by a sudden $3.5\times$ surge in CPU ($94\%$) and $8\times$ outbound network traffic ($140\text{ Mbps}$) in the last 6 hours (simulating a runaway recursive job or crypto-miner/data exfiltration anomaly).
   * **Expected Engine Action:** Trigger a **Critical Anomaly Alert** with Z-score explanation.
9. **`orphaned_resources` ($12\text{ Unattached Block Volumes} + 8\text{ Unassigned Public IPs}$):**
   * **Behavior:** Out of 18 Block Volumes, 12 have `attached_to: null` and `days_unattached` between $18$ and $95\text{ days}$ (sizes $200\text{ GB}$ to $2,000\text{ GB}$). Out of 12 Public IPs, 8 have `attached_to: null`.
   * **Expected Engine Action:** Recommend **Clean Up Orphaned Volume / Release Unassociated IP** ($100\%$ savings).

### 4.2 6-Month Billing Creep Dataset (`billing_history_6m`)
Generate a 6-month historical ledger (Month $-5$ to Current Month) showing the monthly bill rising by **$41.2\%$** (e.g., from `₹3,45,000/mo` six months ago to `₹4,87,200/mo` this month), annotating the exact root causes:
* Month $-3$: New `staging` cluster provisioned on `utho.xlarge` for load testing and never scaled down (`+₹48,000/mo`).
* Month $-2$: `Data-Platform` migration left $8\text{ TB}$ of unattached block volumes and $8$ orphaned IPs (`+₹66,800/mo`).
* Month $-1$: `dev` environments switched to $24\times7$ uptime during a release crunch (`+₹27,400/mo`).

### 4.3 Time-Series Metrics Generation & Time-Warp Engine
* **30-Day Seed Data:** For reduce-memory efficiency while maintaining full fidelity:
  * Generate 30 days of 15-minute intervals ($30 \times 96 = 2,880\text{ points}$) per VM covering:
    * `timestamp` (ISO 8601)
    * `cpu_pct` ($0\text{ to }100$)
    * `memory_pct` ($0\text{ to }100$)
    * `disk_used_pct` ($0\text{ to }100$)
    * `disk_iops` ($10\text{ to }5000$)
    * `net_in_mbps` ($0.01\text{ to }500$)
    * `net_out_mbps` ($0.01\text{ to }500$)
* **Time-Warp Live Tick Emitter:**
  * Runs an `asyncio` loop in `utho-infra-server`.
  * Every $5\text{ seconds}$ (configurable via API), advances the simulated clock by $+15\text{ minutes}$, generates the next tick for all 75 VMs following their respective workload archetype equations, and sends the batch to Server 2.
  * Exposes `POST /sim/trigger-anomaly` which immediately injects a live spike on a target production VM so the presenter can demonstrate real-time anomaly detection during the pitch.

---

## 5. Server 2 Specification: `optimizer-engine-server` (Node.js/Express + Python Analytics Core)

Server 2 is the brain of SmartCloud Optimizer. Node.js/Express manages API requests, recommendation state (`pending`, `accepted`, `rejected`), and SSE connections, while Python (`Pandas`/`NumPy`/`SciPy`) performs all mathematical analyses.

### 5.1 Mathematical Algorithms & Formulas (Python Analytics Core)

#### A. Statistical Aggregation per VM
For each VM over the 30-day window ($N = 2,880$ ticks), calculate:
* Mean utilization: $\mu_{\text{cpu}}, \mu_{\text{mem}}$
* Standard deviation: $\sigma_{\text{cpu}}, \sigma_{\text{mem}}$
* Percentiles:
  $$P_{50}, \quad P_{95}, \quad P_{99}$$
* **Off-Hours Utilization Ratio ($R_{\text{off}}$):** Let $T_{\text{off}}$ be the set of timestamps falling between 20:00 and 08:00 IST on weekdays or any time on Saturday/Sunday.
  $$R_{\text{off}} = \frac{\text{Mean CPU during } T_{\text{off}}}{\text{Mean CPU during Business Hours } T_{\text{biz}}}$$
  If $\text{Max CPU during } T_{\text{off}} < 5\%$ and $\text{MaxCPU}(T_{\text{biz}}) > 20\%$, classify as **Off-Hours Schedulable**.

#### B. Peak-Safe Rightsizing Algorithm (Respecting $P_{99}$)
Never use $\mu_{\text{cpu}}$ to size a VM. Define the safe target ceiling as $\tau_{\text{safe}} = 72\%$ at $P_{99}$.
For a VM currently on plan $C_{\text{curr}}$ with $(v_{\text{curr}}\text{ vCPU}, m_{\text{curr}}\text{ GB RAM})$, evaluate every smaller candidate plan $C_{\text{cand}} = (v_{\text{cand}}, m_{\text{cand}})$ in `utho_plans`:

1. Calculate projected $P_{99}$ CPU and Memory on the candidate plan:
   $$\hat{P}_{99,\text{cpu}}(C_{\text{cand}}) = P_{99,\text{cpu}} \times \left(\frac{v_{\text{curr}}}{v_{\text{cand}}}\right)$$
   $$\hat{P}_{99,\text{mem}}(C_{\text{cand}}) = P_{99,\text{mem}} \times \left(\frac{m_{\text{curr}}}{m_{\text{cand}}}\right)$$
2. A candidate plan $C_{\text{cand}}$ is **Safe** if and only if:
   $$\hat{P}_{99,\text{cpu}}(C_{\text{cand}}) \le 72\% \quad \text{and} \quad \hat{P}_{99,\text{mem}}(C_{\text{cand}}) \le 75\%$$
3. Select the smallest (cheapest) candidate plan $C_{\text{target}}$ that satisfies both safety constraints.
4. **Trap Detection ("Peak Protected"):** If $\mu_{\text{cpu}} < 25\%$ (appears underutilized on average) AND no smaller plan satisfies $\hat{P}_{99,\text{cpu}} \le 72\%$, mark the VM with `protection_status = "PEAK_PROTECTED"` and generate a protective insight explaining:
   > *"Average CPU is only $13.4\%$, but daily $P_{99}$ peak reaches $88.6\%$. Downsizing by $50\%$ would push peak load to $177.2\%$ (guaranteed outage). Instance size locked for safety."*

#### C. Live Chart Transformation Math (When User Accepts a Recommendation)
When the user clicks **Accept** on a recommendation (or previews it), the frontend must overlay a **"Projected After"** time-series curve on top of the historical **"Before"** chart. Server 2 provides a `simulation_transform` payload for every recommendation:
* **For `resize` (Downsize/Upsize):**
  $$\text{CPU}_{\text{after}}(t) = \min\left(100, \text{CPU}_{\text{before}}(t) \times \frac{v_{\text{curr}}}{v_{\text{target}}}\right)$$
  $$\text{MEM}_{\text{after}}(t) = \min\left(100, \text{MEM}_{\text{before}}(t) \times \frac{m_{\text{curr}}}{m_{\text{target}}}\right)$$
  $$\text{Cost}_{\text{after}}(t) = \text{HourlyCost}(C_{\text{target}})$$
  *Note how downsizing causes the projected utilization curve on the chart to step UP into the healthy $45\% \text{ to } 70\%$ green zone while the hourly cost line drops DOWN!*
* **For `schedule_off_hours`:**
  For all $t \in T_{\text{off}}$:
  $$\text{CPU}_{\text{after}}(t) = 0\%, \quad \text{MEM}_{\text{after}}(t) = 0\%, \quad \text{Cost}_{\text{after}}(t) = 0\text{ INR}$$
* **For `terminate_zombie` or `cleanup_orphan`:**
  $$\text{All Metrics}_{\text{after}}(t) = 0, \quad \text{Cost}_{\text{after}}(t) = 0\text{ INR}$$

#### D. Confidence & Risk Scoring Formula
Every recommendation includes a mathematical `confidence_score` ($0\text{ to }100\%$) and `risk_level` (`"Low"`, `"Medium"`, `"High"`):
$$\text{HeadroomMargin} = \frac{80 - \max\left(\hat{P}_{99,\text{cpu}}, \hat{P}_{99,\text{mem}}\right)}{80}$$
$$\text{StabilityFactor} = 1 - \min\left(1, \frac{\sigma_{\text{cpu}}}{50}\right)$$
$$\text{ConfidenceScore} = \text{clamp}\left(50 + 30 \cdot \text{HeadroomMargin} + 20 \cdot \text{StabilityFactor}, 55, 99\right)$$
* **Risk Level Mapping:**
  * `Low Risk`: Orphaned volumes/IPs, Zombie VMs ($\text{CPU } < 2\%$ for 30d), or Dev/Staging off-hours shutdown, or Prod resize where $\hat{P}_{99} < 55\%$.
  * `Medium Risk`: Prod or Staging resize where $55\% \le \hat{P}_{99} \le 72\%$, or batch schedule migration.
  * `High Risk`: Any change in `prod` where $\hat{P}_{99} > 72\%$ or capacity creep remediation.

#### E. Capacity Creep & 30–90 Day Forecasting (OLS Linear Regression)
Fit an Ordinary Least Squares (OLS) linear trend over daily peak utilization $y_d$ for days $d \in \{1, \dots, 30\}$:
$$y_d = \beta_0 + \beta_1 d + \varepsilon$$
* If slope $\beta_1 > 0.8\%\text{ per day}$ and current utilization $y_{30} > 75\%$, compute **Days to Saturation ($100\%$):**
  $$D_{\text{limit}} = \frac{100 - y_{30}}{\beta_1}$$
* Raise a **Capacity Trend Alert** with projected exhaustion date and 30/60/90-day cost & usage forecast bands ($\hat{y}_{30+k} \pm 1.96 \cdot \hat{\sigma}$).

#### F. Real-Time Anomaly Detection (Z-Score)
For incoming ticks, compute the rolling 7-day baseline mean $\mu_{7d}$ and standard deviation $\sigma_{7d}$. Calculate the Z-score:
$$Z = \frac{x_{\text{current}} - \mu_{7d}}{\max(\sigma_{7d}, 1.0)}$$
If $Z > 3.5$ on CPU or Network Outbound, raise a **Critical Anomaly Alert** with plain-language root-cause diagnostics.

#### G. Sustainability & Carbon Footprint Math
For every rupee and vCPU saved, calculate energy ($\text{kWh}$) and carbon ($\text{kg CO}_2\text{e}$) reduction:
* Assume Power Usage Effectiveness $\text{PUE} = 1.38$ (Indian data center average) and India CEA Grid Emission Factor $EF_{\text{India}} = 0.71\text{ kg CO}_2\text{e}/\text{kWh}$:
  $$\Delta \text{kWh}_{\text{monthly}} = \frac{(\text{Watts}_{\text{before}} - \text{Watts}_{\text{after}}) \times \text{Hours}_{\text{saved}} \times \text{PUE}}{1000}$$
  $$\Delta \text{CO}_{2\text{e}}(\text{kg/month}) = \Delta \text{kWh}_{\text{monthly}} \times 0.71$$

---

### 5.2 Server 2 Express API Contract (`http://localhost:8002`)

1. **`GET /api/overview`**
   * Query filters: `?region=all&environment=all&team=all`
   * Returns:
     * `current_monthly_spend_inr`, `projected_monthly_spend_inr` (after accepted recommendations), `potential_total_savings_inr`, `accepted_savings_inr`.
     * `6m_billing_history`: Array of 6 monthly totals broken down by `prod`, `staging`, `dev` and waste category (showing the $+41.2\%$ bill increase story).
     * `fleet_summary`: Total VMs, Block Volumes, Public IPs, Orphaned count, Peak Protected count, Zombie count, Optimal count.
     * `aggregated_timeseries`: Downsampled 30-day fleet utilization (`avg_cpu`, `p95_cpu`, `p99_cpu`, `avg_mem`, `p95_mem`, `hourly_cost_before`, `hourly_cost_after_accepted`) so the main dashboard chart responds immediately when recommendations are accepted/rejected!
     * `sustainability`: `monthly_kwh_saved`, `monthly_co2_kg_saved`, `trees_equivalent`.

2. **`GET /api/resources`**
   * Query filters: `?region=&environment=&team=&type=&status=`
   * Returns all 105 resources with their precomputed stats ($\mu, P_{50}, P_{95}, P_{99}$, `off_hours_idle_pct`, `protection_status`, `linked_recommendation_id`, `monthly_cost_inr`).

3. **`GET /api/resources/:id/metrics`**
   * Returns the full 30-day 15-minute granularity time-series for that specific resource, PLUS its `recommendation` and `simulation_transform` so the drill-down drawer can plot **Historical Before** vs. **Projected After (with $P_{99}$ safety threshold line at $75\%$)** in real time.

4. **`GET /api/recommendations`**
   * Returns all actionable recommendations sorted by `monthly_savings_inr` descending. Each item contains:
     * `id`, `resource_id`, `resource_name`, `region`, `environment`, `team`
     * `action_type`: `"resize"` | `"schedule_off_hours"` | `"terminate_zombie"` | `"cleanup_orphan"` | `"convert_batch"` | `"upsize_capacity"`
     * `current_config`, `target_config`
     * `current_monthly_cost_inr`, `projected_monthly_cost_inr`, `monthly_savings_inr`
     * `risk_level`: `"Low"` | `"Medium"` | `"High"`, `confidence_score`: number
     * `metrics_proof`: `{ avg_cpu, p95_cpu, p99_cpu_before, p99_cpu_after, avg_mem, p99_mem_before, p99_mem_after }`
     * `plain_language_reason`: Clear engineering explanation of *why* this is safe.
     * `iac_snippets`: `{ utho_cli: "...", terraform: "..." }`
     * `status`: `"pending"` | `"accepted"` | `"rejected"`

5. **`POST /api/recommendations/:id/status`**
   * Body: `{ "status": "accepted" | "rejected" | "pending" }` (also support `POST /api/recommendations/bulk-status` for "Accept All Low-Risk").
   * Immediately recalculates `accepted_savings_inr`, `projected_monthly_spend_inr`, per-environment savings, and the fleet-wide "Before vs. After" time-series projection.

6. **`POST /api/what-if`**
   * Body:
     ```json
     {
       "shutdown_dev_off_hours": true,
       "shutdown_staging_weekends": true,
       "off_hours_window": { "start_hour": 20, "end_hour": 8 },
       "target_p99_headroom_pct": 75,
       "delete_unattached_volumes_older_than_days": 14,
       "release_idle_ips": true
     }
     ```
   * Dynamically runs the Python simulation engine with those custom rules and returns the simulated monthly bill, savings breakdown, risk distribution, and affected resource count in $< 150\text{ ms}$.

7. **`GET /api/alerts-and-forecast`**
   * Returns:
     * Active alerts (Genuine Anomalies with Z-scores, Capacity Creepers with days-to-$100\%$ countdown, Budget Overrun warnings, Orphaned storage spikes).
     * 30-to-90 Day Cost & Utilization Forecast series (`historical_6m`, `forecast_next_3m_unoptimized`, `forecast_next_3m_optimized`).

8. **`GET /api/stream` (Server-Sent Events)**
   * Streams `tick` events (every 5 seconds from Server 1's Time-Warp generator) and `alert` events (when a live anomaly is triggered) to the Next.js frontend.

---

## 6. Frontend Specification: `smartcloud-web` (Next.js + Tailwind CSS in Utho Style)

### 6.1 Visual Styling & Utho Brand Aesthetic
* **Reference Image Alignment:** Inspect any user-attached Utho website screenshots for exact visual polish. Match Utho's clean, modern Indian enterprise cloud portal aesthetic:
  * **Backgrounds:** Crisp light-slate canvas (`#F8FAFC`), pure white elevated cards (`#FFFFFF`) with subtle `1px solid #E2E8F0` borders and soft enterprise shadows (`shadow-sm`).
  * **Brand Accent Colors:** Utho Royal/Cobalt Blue (`#0052CC` / `#2563EB`) for primary actions and active navigation; Deep Navy (`#0F172A`) for sidebar/headers; Emerald Green (`#10B981`) for cost savings & safe headroom; Amber (`#F59E0B`) for medium risk / capacity warnings; Rose Red (`#EF4444`) for anomalies, P99 breaches, and waste.
  * **Typography:** Clean geometric sans-serif (`Inter` or `Plus Jakarta Sans`) for UI, and `JetBrains Mono` for resource IDs, IP addresses, metrics, INR currency figures, and CLI/Terraform snippets.
* **Top Global Control Bar:**
  * **Global Filters:** Region (`All Regions`, `Noida`, `Bangalore`, `Mumbai`), Environment (`All Envs`, `prod`, `staging`, `dev`), Team (`All Teams`, `Payments`, `Core-API`, `Data-Platform`, `Growth-Frontend`, `QA-Automation`).
  * **Role Perspective Switcher (Bonus Feature):** Toggle between `Infrastructure Engineer` (emphasizes $P_{99}$ headroom, CPU/RAM/IOPS charts, Terraform/CLI snippets), `FinOps / Finance` (emphasizes 6-month bill creep, unit economics, environment cost tables), and `Executive Leadership` (emphasizes ROI summary, risk posture, 90-day forecast, and ESG carbon reduction).
  * **Live Time-Warp Telemetry Bar:** Shows the live simulated clock advancing in 15-minute increments every 5 seconds with a pulsing green `"LIVE TELEMETRY"` indicator and a **`"Simulate Live Anomaly"`** demo button.

### 6.2 Core Views & Interactive Flows

#### View 1: Executive Command Center & Before-vs-After Cost Bar
* **Sticky "Before vs. Projected After" Impact Banner:**
  * Current Monthly Spend: `₹4,87,200/mo` ($+41.2\%$ over 6 months)
  * Total Identified Savings: `₹1,94,650/mo` ($39.9\%$ potential reduction)
  * **Accepted Savings (Live Counter):** Dynamically updates as the user toggles **Accept** or **Reject** on individual recommendations, showing a segmented progress bar by environment (`prod`, `staging`, `dev`) and a **"1-Click Accept All Low-Risk"** action button.
* **Chart 1 — 6-Month Bill Creep & 90-Day Forecast Chart:**
  * Stacked area/bar chart showing why the bill grew $40\%$ over the past 6 months, plus a split dashed forecast line for the next 90 days: **Unoptimized Trajectory** (climbing to `₹5,65,000/mo`) vs. **Optimized Trajectory** (dropping to `₹2,92,550/mo`).
* **Chart 2 — Interactive Fleet Utilization & Cost Simulation Preview:**
  * Dual-line Recharts area chart showing **Baseline Fleet CPU/RAM ($P_{95}$) & Hourly Cost** vs. **Simulated Post-Optimization Curve** based on currently accepted recommendations.

#### View 2: Resource Utilization Explorer & Peak-Safe Drill-Down Drawer
* Filterable, sortable data table of all 105 resources (`VM`, `Block Volume`, `Public IP`).
* Displays custom status badges:
  * `Oversized` (Amber)
  * `Peak Protected (P99 = 89%)` (Blue Shield icon — highlights our safety logic!)
  * `Off-Hours Waste` (Purple)
  * `Zombie / Idle` (Red)
  * `Orphaned Resource` (Red)
  * `Capacity Creep` (Orange)
  * `Optimal` (Green)
* **Interactive Drill-Down Drawer (Opens on clicking any resource):**
  * Shows 30-day time-series charts for **CPU %**, **Memory %**, **Disk IOPS**, and **Network In/Out**.
  * Includes a prominent **Accept / Preview Recommendation Toggle** right inside the drawer.
  * **Live Chart Overlay:** When toggled ON, the chart immediately renders a second dashed curve (`Projected After Optimization`) and a horizontal red dashed line at $75\%$ (`Max Safe P99 Ceiling`).
    * If the VM is downsizing from `utho.xlarge` ($16\text{ vCPU}$) to `utho.medium` ($4\text{ vCPU}$), the user visually sees the CPU curve scale up from $14\%$ peak to $56\%$ peak—still safely below the $75\%$ ceiling—while the monthly cost badge drops from `₹9,600` to `₹2,400` (`Save ₹7,200/mo`).
    * If the VM is a **`bursty_peak_protected`** resource, toggling a forced hypothetical downsize preview shows the red curve shooting past $100\%$ during the daily peak, visually proving why the engine blocked downsizing!

#### View 3: Actionable Recommendations Hub & IaC Export
* Filterable by Action Type (`Resize VM`, `Off-Hours Schedule`, `Terminate Zombie`, `Clean Up Orphaned Disks/IPs`, `Batch Schedule`) and Risk Level (`Low`, `Medium`, `High`).
* Each Recommendation Card includes:
  * **Action Header & Savings Badge:** e.g., `Downsize utho.xlarge → utho.medium` | `Save ₹7,200/mo`.
  * **Peak Safety Proof Bar:** Visual comparison of `Current P99: 16.2%` $\rightarrow$ `Projected P99: 64.8% (Safe < 72%)` vs. `Average: 9.1%`.
  * **Plain-Language Engineering Explanation:** Why the recommendation was raised, how many data points ($2,880$) were analyzed, and what the risk is.
  * **Accept / Reject Buttons:** Clicking **Accept** triggers an instant optimistic UI animation, updates the global Before/After cost counters, and updates all charts.
  * **"View CLI / Terraform" Button:** Opens a code snippet modal with copyable **Utho CLI** and **Terraform HCL** scripts to apply all accepted changes, plus an **"Export Executive FinOps Report (.md / Print PDF)"** button.

#### View 4: Interactive "What-If" Simulator (Bonus Feature)
* Live interactive sliders and toggles allowing engineers/finance to experiment with policies:
  1. **Dev/Staging Auto-Shutdown Window:** Slider for shutdown hours (e.g., `8:00 PM to 8:00 AM IST` + `Weekends Off`).
  2. **Safety Headroom Ceiling ($P_{99}$ Target):** Slider from `60% (Ultra Conservative)` to `85% (Aggressive FinOps)`. Moving this slider dynamically shows how many additional VMs qualify for downsizing vs. how risk increases!
  3. **Orphaned Storage Retention Policy:** Slider for `Delete unattached volumes older than X days` ($7\text{ to }60\text{ days}$).
* Displays real-time simulated deltas in Monthly Bill, Annual Run-Rate Savings, Fleet Average $P_{99}$, and Carbon Reduction.

#### View 5: Live Alerts, Anomaly Stream & Assumptions Sheet
* **Alerts Feed:** Shows real-time alerts with severity badges (`Critical Anomaly`, `Capacity Exhaustion in 6.8 Days`, `Orphaned Spend Spike`) and a math breakdown of why each alert fired.
* **Assumptions & Transparency Tab (Mandatory Rubric Requirement):**
  * Clearly documents the Utho pricing catalog, the $P_{99} \le 72\%$ peak-safety formula, the off-hours window definition, the confidence score equation, and the India CEA carbon emission factors so judges give full marks on the $20\%$ *"Accuracy, clarity and transparency of cost estimates"* criterion.

---

## 7. Step-by-Step Build & Verification Plan for Antigravity Agent

Execute the implementation in the following exact sequence:

1. **Step 1 — Scaffold Monorepo & `utho-infra-server` (Server 1):**
   * Create `utho-infra-server/` with `catalog.py`, `generator.py`, and `main.py`.
   * Generate the 105 resources across Noida, Bangalore, and Mumbai covering all 8 workload archetypes, the 6-month billing history, and the 30-day 15-minute time-series metrics.
   * Implement the FastAPI endpoints (`/infra/inventory`, `/infra/metrics`, `/infra/billing-history`, `/sim/trigger-anomaly`) and the 5-second Time-Warp tick emitter.
2. **Step 2 — Build `optimizer-engine-server` (Server 2: Python Math Core + Node.js/Express API):**
   * Create `optimizer-engine-server/analytics/engine.py` implementing the $P_{50}/P_{95}/P_{99}$ aggregation, Peak-Safe Rightsizing ($P_{99} \le 72\%$), `PEAK_PROTECTED` trap detection, off-hours scheduler math, OLS linear regression capacity forecasting, Z-score anomaly detection, sustainability ($\text{kWh}/\text{CO}_2$) math, and `simulation_transform` parameters.
   * Create the Node.js/Express API (`src/server.ts`) exposing all REST endpoints and the `/api/stream` SSE endpoint. Ensure fast caching so API calls return in $< 50\text{ ms}$.
3. **Step 3 — Build `frontend` (Next.js Utho Cloud UI):**
   * Scaffold Next.js with Tailwind CSS, Lucide icons, and Recharts. Apply the Utho Cloud visual aesthetic (referencing any attached Utho design screenshots).
   * Build the Global Filter Bar, Role Switcher, Live Time-Warp status header, Executive Overview, Resource Drill-Down Drawer with live Before/After chart overlays, Recommendations Hub with Accept/Reject state sync, What-If Simulator, Alerts view, and Assumptions sheet.
4. **Step 4 — End-to-End Integration & Verification:**
   * Create a root startup script (`npm run dev` or `./start.sh`) that boots Server 1 (`:8001`), Server 2 (`:8002`), and Frontend (`:3000`).
   * Verify that accepting a recommendation on the frontend immediately updates the Before vs. After cost totals AND overlays the projected post-optimization curve on the utilization charts.
   * Verify that clicking **"Simulate Live Anomaly"** injects a live spike from Server 1 $\rightarrow$ Server 2 $\rightarrow$ Frontend SSE alert banner within 2 seconds.