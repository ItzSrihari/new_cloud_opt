const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
const INFRA_BASE = process.env.NEXT_PUBLIC_INFRA_URL || "http://localhost:8001";

export async function fetchOverview(filters?: { region?: string; environment?: string; team?: string }) {
  const params = new URLSearchParams();
  if (filters?.region && filters.region !== "all") params.append("region", filters.region);
  if (filters?.environment && filters.environment !== "all") params.append("environment", filters.environment);
  if (filters?.team && filters.team !== "all") params.append("team", filters.team);

  const res = await fetch(`${API_BASE}/api/overview?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch overview");
  return res.json();
}

export async function fetchResources(filters?: {
  region?: string;
  environment?: string;
  team?: string;
  type?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.region && filters.region !== "all") params.append("region", filters.region);
  if (filters?.environment && filters.environment !== "all") params.append("environment", filters.environment);
  if (filters?.team && filters.team !== "all") params.append("team", filters.team);
  if (filters?.type && filters.type !== "all") params.append("type", filters.type);
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);

  const res = await fetch(`${API_BASE}/api/resources?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json();
}

export async function fetchResourceMetrics(resourceId: string) {
  const res = await fetch(`${API_BASE}/api/resources/${resourceId}/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch metrics for ${resourceId}`);
  return res.json();
}

export async function fetchRecommendations(filters?: {
  risk_level?: string;
  action_type?: string;
  status?: string;
  environment?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.risk_level && filters.risk_level !== "all") params.append("risk_level", filters.risk_level);
  if (filters?.action_type && filters.action_type !== "all") params.append("action_type", filters.action_type);
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.environment && filters.environment !== "all") params.append("environment", filters.environment);

  const res = await fetch(`${API_BASE}/api/recommendations?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function updateRecommendationStatus(id: string, status: "accepted" | "rejected" | "pending") {
  const res = await fetch(`${API_BASE}/api/recommendations/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update recommendation status");
  return res.json();
}

export async function bulkUpdateRecommendations(action: "accept_low_risk" | "accept_all" | "reset") {
  const res = await fetch(`${API_BASE}/api/recommendations/bulk-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error("Failed to bulk update recommendations");
  return res.json();
}

export async function runWhatIfSimulation(params: {
  shutdown_dev_off_hours: boolean;
  shutdown_staging_weekends: boolean;
  off_hours_window: { start_hour: number; end_hour: number };
  target_p99_headroom_pct: number;
  delete_unattached_volumes_older_than_days: number;
  release_idle_ips: boolean;
}) {
  const res = await fetch(`${API_BASE}/api/what-if`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to run what-if simulation");
  return res.json();
}

export async function fetchAlertsAndForecast() {
  const res = await fetch(`${API_BASE}/api/alerts-and-forecast`);
  if (!res.ok) throw new Error("Failed to fetch alerts and forecast");
  return res.json();
}

export async function triggerLiveAnomaly(targetResourceId?: string) {
  const res = await fetch(`${INFRA_BASE}/sim/trigger-anomaly`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_resource_id: targetResourceId }),
  });
  if (!res.ok) throw new Error("Failed to trigger live anomaly");
  return res.json();
}
