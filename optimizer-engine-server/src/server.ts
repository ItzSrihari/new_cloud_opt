import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createChatHandler } from './chatbot';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Paths
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'analytics_cache.json');
const CLI_RUNNER_PATH = path.join(__dirname, '..', 'analytics', 'cli_runner.py');
const VENV_PYTHON = path.join(__dirname, '..', '..', '.venv', 'bin', 'python');
const PYTHON_BIN = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : (process.env.PYTHON_PATH || 'python3');

interface AnalyticsState {
  resources: any[];
  recommendations: any[];
  billing_history: any[];
  alerts_and_forecast: any;
  fleet_aggregated_timeseries: any[];
  current_monthly_spend_inr: number;
  potential_total_savings_inr: number;
  sustainability: any;
  fleet_counts: any;
}

// In-memory application state
let analyticsData: AnalyticsState | null = null;
const recStatusMap: Map<string, 'pending' | 'accepted' | 'rejected'> = new Map();
const dynamicAlerts: any[] = [];
let lastSimulatedTime: string = new Date().toISOString();
let latestLiveTicks: any[] = [];

// SSE connected clients
const sseClients: Response[] = [];

function loadAnalyticsCache(): boolean {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      analyticsData = JSON.parse(raw);
      // Initialize statuses
      if (analyticsData && analyticsData.recommendations) {
        for (const rec of analyticsData.recommendations) {
          if (!recStatusMap.has(rec.id)) {
            recStatusMap.set(rec.id, 'pending');
          }
        }
      }
      return true;
    }
  } catch (err) {
    console.error('[Optimizer-Server] Error reading cache:', err);
  }
  return false;
}

// Ensure cache exists at boot
if (!loadAnalyticsCache()) {
  console.log('[Optimizer-Server] Cache missing, running Python analytics generator...');
  try {
    const child = spawn(PYTHON_BIN, [CLI_RUNNER_PATH, 'generate_all'], { stdio: 'inherit' });
    child.on('close', (code) => {
      console.log(`[Optimizer-Server] Generator completed with code ${code}`);
      loadAnalyticsCache();
    });
  } catch (err) {
    console.error('[Optimizer-Server] Failed to trigger Python analytics generator:', err);
  }
}

// Helper: Calculate dynamic totals based on accepted recommendations
function computeDynamicFinancials(filterEnv?: string, filterReg?: string, filterTeam?: string) {
  if (!analyticsData) {
    return {
      current_monthly_spend_inr: 487200,
      projected_monthly_spend_inr: 292550,
      potential_total_savings_inr: 194650,
      accepted_savings_inr: 0,
      accepted_count: 0,
      pending_count: 0,
      rejected_count: 0,
      accepted_by_env: { prod: 0, staging: 0, dev: 0 },
    };
  }

  let totalBaseline = 0;
  let totalPotentialSavings = 0;
  let totalAcceptedSavings = 0;
  let acceptedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  const envAcceptedSavings: Record<string, number> = { prod: 0, staging: 0, dev: 0 };

  // Filter resources if queried
  const resMatches = (r: any) => {
    if (filterEnv && filterEnv !== 'all' && r.environment?.toLowerCase() !== filterEnv.toLowerCase()) return false;
    if (filterReg && filterReg !== 'all' && r.region?.toLowerCase() !== filterReg.toLowerCase()) return false;
    if (filterTeam && filterTeam !== 'all' && r.team?.toLowerCase() !== filterTeam.toLowerCase()) return false;
    return true;
  };

  for (const res of analyticsData.resources) {
    if (resMatches(res)) {
      totalBaseline += res.monthly_cost_inr || 0;
    }
  }

  for (const rec of analyticsData.recommendations) {
    if (!resMatches(rec)) continue;
    const status = recStatusMap.get(rec.id) || 'pending';
    const sav = rec.monthly_savings_inr || 0;

    if (sav > 0) {
      totalPotentialSavings += sav;
    }

    if (status === 'accepted') {
      acceptedCount++;
      if (sav > 0) {
        totalAcceptedSavings += sav;
        const envKey = rec.environment?.toLowerCase() || 'prod';
        envAcceptedSavings[envKey] = (envAcceptedSavings[envKey] || 0) + sav;
      }
    } else if (status === 'rejected') {
      rejectedCount++;
    } else {
      pendingCount++;
    }
  }

  const projectedSpend = Math.max(0, totalBaseline - totalAcceptedSavings);

  // Dynamic sustainability based on accepted savings
  const kwhSaved = (totalAcceptedSavings / 100) * 12.5;
  const co2Saved = kwhSaved * 0.71;

  return {
    current_monthly_spend_inr: totalBaseline,
    projected_monthly_spend_inr: projectedSpend,
    potential_total_savings_inr: totalPotentialSavings,
    accepted_savings_inr: totalAcceptedSavings,
    accepted_count: acceptedCount,
    pending_count: pendingCount,
    rejected_count: rejectedCount,
    accepted_by_env: envAcceptedSavings,
    sustainability: {
      monthly_kwh_saved: Math.round(kwhSaved * 10) / 10,
      monthly_co2_kg_saved: Math.round(co2Saved * 10) / 10,
      trees_equivalent: Math.round((co2Saved / 1.75) * 10) / 10,
    },
  };
}

// 1. GET /api/overview
app.get('/api/overview', (req: Request, res: Response) => {
  if (!analyticsData) {
    loadAnalyticsCache();
  }
  if (!analyticsData) {
    return res.status(503).json({ error: 'Analytics engine warming up. Please retry in 2 seconds.' });
  }

  const region = (req.query.region as string) || 'all';
  const environment = (req.query.environment as string) || 'all';
  const team = (req.query.team as string) || 'all';

  const financials = computeDynamicFinancials(environment, region, team);

  // Dynamic adjusted fleet aggregate time-series based on accepted savings
  const baselineCostHourly = financials.current_monthly_spend_inr / 730;
  const acceptedCostHourly = financials.projected_monthly_spend_inr / 730;

  const adjustedTimeseries = (analyticsData.fleet_aggregated_timeseries || []).map((pt) => ({
    ...pt,
    hourly_cost_before: Math.round(baselineCostHourly * 100) / 100,
    hourly_cost_after_projected: Math.round(acceptedCostHourly * 100) / 100,
  }));

  res.json({
    ...financials,
    billing_history_6m: analyticsData.billing_history,
    fleet_summary: analyticsData.fleet_counts,
    aggregated_timeseries: adjustedTimeseries,
    last_simulated_time: lastSimulatedTime,
  });
});

// 2. GET /api/resources
app.get('/api/resources', (req: Request, res: Response) => {
  if (!analyticsData) loadAnalyticsCache();
  if (!analyticsData) return res.status(503).json({ error: 'Data not loaded yet' });

  const { region, environment, team, type, status } = req.query;

  let filtered = analyticsData.resources;
  if (region && region !== 'all') {
    filtered = filtered.filter((r) => r.region?.toLowerCase() === (region as string).toLowerCase());
  }
  if (environment && environment !== 'all') {
    filtered = filtered.filter((r) => r.environment?.toLowerCase() === (environment as string).toLowerCase());
  }
  if (team && team !== 'all') {
    filtered = filtered.filter((r) => r.team?.toLowerCase() === (team as string).toLowerCase());
  }
  if (type && type !== 'all') {
    filtered = filtered.filter((r) => r.type?.toLowerCase() === (type as string).toLowerCase());
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((r) => r.status?.toLowerCase() === (status as string).toLowerCase());
  }

  // Attach current recommendation status if linked
  const enriched = filtered.map((r) => {
    const recId = r.linked_recommendation_id;
    const recStatus = recId ? recStatusMap.get(recId) || 'pending' : null;
    return {
      ...r,
      recommendation_status: recStatus,
    };
  });

  res.json({
    total: enriched.length,
    resources: enriched,
  });
});

// 3. GET /api/resources/:id/metrics
app.get('/api/resources/:id/metrics', async (req: Request, res: Response) => {
  const resourceId = req.params.id;
  if (!analyticsData) loadAnalyticsCache();

  const resource = analyticsData?.resources.find((r) => r.resource_id === resourceId);
  if (!resource) {
    return res.status(404).json({ error: `Resource ${resourceId} not found` });
  }

  // Fetch full 30d time-series from Server 1 or generator
  let metrics: any[] = [];
  try {
    const response = await fetch(`http://localhost:8001/infra/metrics?resource_id=${resourceId}`);
    if (response.ok) {
      const data: any = await response.json();
      metrics = data.metrics || [];
    }
  } catch (err) {
    // If Server 1 not running, metrics empty or fallback
  }

  // Find recommendation
  const rec = analyticsData?.recommendations.find((r) => r.resource_id === resourceId);
  const recStatus = rec ? recStatusMap.get(rec.id) || 'pending' : null;

  res.json({
    resource,
    data_points: metrics.length,
    metrics,
    recommendation: rec ? { ...rec, status: recStatus } : null,
    simulation_transform: rec?.simulation_transform || null,
  });
});

// 4. GET /api/recommendations
app.get('/api/recommendations', (req: Request, res: Response) => {
  if (!analyticsData) loadAnalyticsCache();
  if (!analyticsData) return res.status(503).json({ error: 'Data not loaded yet' });

  const { risk_level, action_type, status, environment } = req.query;

  let recs = analyticsData.recommendations.map((r) => ({
    ...r,
    status: recStatusMap.get(r.id) || 'pending',
  }));

  if (risk_level && risk_level !== 'all') {
    recs = recs.filter((r) => r.risk_level?.toLowerCase() === (risk_level as string).toLowerCase());
  }
  if (action_type && action_type !== 'all') {
    recs = recs.filter((r) => r.action_type?.toLowerCase() === (action_type as string).toLowerCase());
  }
  if (environment && environment !== 'all') {
    recs = recs.filter((r) => r.environment?.toLowerCase() === (environment as string).toLowerCase());
  }
  if (status && status !== 'all') {
    recs = recs.filter((r) => r.status?.toLowerCase() === (status as string).toLowerCase());
  }

  res.json({
    total: recs.length,
    recommendations: recs,
  });
});

// 5. POST /api/recommendations/:id/status
app.post('/api/recommendations/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted, rejected, or pending' });
  }

  recStatusMap.set(id, status);

  const updatedFinancials = computeDynamicFinancials();
  broadcastSSE('status_change', { id, status, financials: updatedFinancials });

  res.json({
    success: true,
    recommendation_id: id,
    status,
    financials: updatedFinancials,
  });
});

// 6. POST /api/recommendations/bulk-status
app.post('/api/recommendations/bulk-status', (req: Request, res: Response) => {
  const { action } = req.body; // 'accept_low_risk' | 'accept_all' | 'reset'
  if (!analyticsData) loadAnalyticsCache();

  let modifiedCount = 0;
  if (analyticsData && analyticsData.recommendations) {
    for (const rec of analyticsData.recommendations) {
      if (action === 'accept_low_risk') {
        if (rec.risk_level === 'Low' && rec.monthly_savings_inr > 0) {
          recStatusMap.set(rec.id, 'accepted');
          modifiedCount++;
        }
      } else if (action === 'accept_all') {
        if (rec.monthly_savings_inr > 0) {
          recStatusMap.set(rec.id, 'accepted');
          modifiedCount++;
        }
      } else if (action === 'reset') {
        recStatusMap.set(rec.id, 'pending');
        modifiedCount++;
      }
    }
  }

  const updatedFinancials = computeDynamicFinancials();
  broadcastSSE('status_change', { bulk_action: action, modifiedCount, financials: updatedFinancials });

  res.json({
    success: true,
    action,
    modifiedCount,
    financials: updatedFinancials,
  });
});

// 7. POST /api/what-if
app.post('/api/what-if', (req: Request, res: Response) => {
  const params = req.body;

  // Execute Python runner what_if via stdin
  const child = spawn(PYTHON_BIN, [CLI_RUNNER_PATH, 'what_if']);
  let output = '';
  let errorOutput = '';

  child.stdin.write(JSON.stringify(params));
  child.stdin.end();

  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  child.on('close', (code) => {
    if (code === 0 && output) {
      try {
        const result = JSON.parse(output);
        return res.json(result);
      } catch (e) {
        return res.status(500).json({ error: 'Failed to parse what-if simulation output', raw: output });
      }
    }
    return res.status(500).json({ error: 'What-if process failed', details: errorOutput });
  });
});

// 8. GET /api/alerts-and-forecast
app.get('/api/alerts-and-forecast', (req: Request, res: Response) => {
  if (!analyticsData) loadAnalyticsCache();

  const baseAlerts = analyticsData?.alerts_and_forecast?.active_alerts || [];
  const combinedAlerts = [...dynamicAlerts, ...baseAlerts];

  res.json({
    active_alerts: combinedAlerts,
    historical_spend: analyticsData?.alerts_and_forecast?.historical_spend || [],
    forecast_spend: analyticsData?.alerts_and_forecast?.forecast_spend || [],
  });
});

// 9. GET /api/stream (SSE)
app.get('/api/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

function broadcastSSE(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      // client disconnected
    }
  }
}

// 10. POST /api/internal/ingest-tick (from Server 1 Time-Warp Emitter)
app.post('/api/internal/ingest-tick', (req: Request, res: Response) => {
  const { simulated_time, tick_count, ticks, anomaly_injected } = req.body;
  lastSimulatedTime = simulated_time || new Date().toISOString();
  latestLiveTicks = ticks || [];

  broadcastSSE('tick', {
    simulated_time: lastSimulatedTime,
    tick_count,
    sample_tick: ticks && ticks.length > 0 ? ticks[0] : null,
    anomaly_injected,
  });

  res.json({ ok: true });
});

// 11. POST /api/internal/ingest-anomaly (from Server 1 Live Anomaly Trigger)
app.post('/api/internal/ingest-anomaly', (req: Request, res: Response) => {
  const anomaly = req.body;
  const alertObj = {
    id: `live-alert-${Date.now()}`,
    severity: 'CRITICAL',
    type: 'ACUTE_ANOMALY',
    resource_id: anomaly.resource_id,
    resource_name: anomaly.resource_name,
    z_score: anomaly.z_score || 4.62,
    title: `LIVE SPIKE: ${anomaly.resource_name} (${anomaly.resource_id})`,
    message: anomaly.message,
    timestamp: anomaly.timestamp || new Date().toISOString(),
    action_recommendation: 'Emergency investigation required. Verify abnormal egress and active thread dump.',
  };

  dynamicAlerts.unshift(alertObj);
  broadcastSSE('anomaly', alertObj);

  res.json({ ok: true, alert: alertObj });
});

// 12. POST /api/chat (Gemini AI FinOps Copilot)
app.post('/api/chat', createChatHandler(() => analyticsData, () => computeDynamicFinancials()));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'optimizer-engine-server',
    port: PORT,
    has_cache: !!analyticsData,
    sse_clients: sseClients.length,
    last_simulated_time: lastSimulatedTime,
  });
});

app.listen(PORT, () => {
  console.log(`[Optimizer-Engine-Server] Listening on http://localhost:${PORT}`);
});
