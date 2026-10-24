"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Server,
  ShieldCheck,
  Zap,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HardDrive,
  Activity,
  ArrowRight,
  Eye,
  Sliders,
  Terminal,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { fetchResourceMetrics, updateRecommendationStatus } from "@/lib/api";

interface ResourceDrawerProps {
  resource: any | null;
  onClose: () => void;
  onRecommendationUpdated?: () => void;
  liveTick?: any;
}

export const ResourceDrawer: React.FC<ResourceDrawerProps> = ({
  resource,
  onClose,
  onRecommendationUpdated,
  liveTick,
}) => {
  const [loading, setLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [simulationTransform, setSimulationTransform] = useState<any | null>(null);
  const [showProjectedAfter, setShowProjectedAfter] = useState(true);
  const [forceHypotheticalDownsize, setForceHypotheticalDownsize] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!resource) return;
    setLoading(true);
    fetchResourceMetrics(resource.resource_id)
      .then((data) => {
        setMetricsData(data.metrics || []);
        setRecommendation(data.recommendation || null);
        setSimulationTransform(data.simulation_transform || null);
      })
      .catch((err) => console.error("Error loading metrics:", err))
      .finally(() => setLoading(false));
  }, [resource]);

  if (!resource) return null;

  const isPeakProtected = resource.workload_archetype === "bursty_peak_protected";

  const handleStatusChange = async (status: "accepted" | "rejected") => {
    if (!recommendation) return;
    try {
      setIsUpdatingStatus(true);
      await updateRecommendationStatus(recommendation.id, status);
      setRecommendation({ ...recommendation, status });
      if (onRecommendationUpdated) onRecommendationUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Downsample to ~96 points for smooth Recharts rendering while preserving peak spikes
  const bucketSize = Math.max(1, Math.floor(metricsData.length / 96));
  const sampledMetrics: any[] = [];
  for (let i = 0; i < metricsData.length; i += bucketSize) {
    const bucket = metricsData.slice(i, i + bucketSize);
    if (bucket.length > 0) {
      // Pick the point with maximum CPU utilization in each window to preserve critical peak spikes
      const peakPoint = bucket.reduce((max, cur) => (cur.cpu_pct > max.cpu_pct ? cur : max), bucket[0]);
      sampledMetrics.push(peakPoint);
    }
  }

  // Compute live projected after curve
  const chartPoints = sampledMetrics.map((pt) => {
    let projectedCpu = pt.cpu_pct;
    let projectedMem = pt.memory_pct;

    if (showProjectedAfter) {
      if (isPeakProtected) {
        if (forceHypotheticalDownsize) {
          // If naive downsize forced: 2x multiplier pushes peak to ~180%!
          projectedCpu = Math.min(100, Math.round(pt.cpu_pct * 2.0 * 10) / 10);
        } else {
          projectedCpu = pt.cpu_pct;
        }
      } else if (simulationTransform?.action === "resize") {
        const ratio = simulationTransform.vcpu_ratio || 1.0;
        projectedCpu = Math.min(100, Math.round(pt.cpu_pct * ratio * 10) / 10);
        const memRatio = simulationTransform.ram_ratio || 1.0;
        projectedMem = Math.min(100, Math.round(pt.memory_pct * memRatio * 10) / 10);
      } else if (simulationTransform?.action === "schedule_off_hours") {
        const d = new Date(pt.timestamp);
        const hour = (d.getUTCHours() + 5.5) % 24;
        const day = d.getUTCDay();
        const isOff = hour >= 20 || hour < 9 || day === 0 || day === 6;
        if (isOff) {
          projectedCpu = 0;
          projectedMem = 0;
        }
      } else if (simulationTransform?.action === "zero_out") {
        projectedCpu = 0;
        projectedMem = 0;
      }
    }

    return {
      timestamp: pt.timestamp,
      cpu_before: pt.cpu_pct,
      cpu_projected: projectedCpu,
      mem_before: pt.memory_pct,
      mem_projected: projectedMem,
      net_out: pt.net_out_mbps,
      iops: pt.disk_iops,
    };
  });

  const formatChartDate = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto border-l border-slate-200">
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{resource.name}</h2>
                <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {resource.resource_id}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                <span>{resource.region}</span>
                <span>•</span>
                <span className="uppercase font-semibold text-blue-400">{resource.environment}</span>
                <span>•</span>
                <span>Team: {resource.team}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {liveTick && (
              <div className="flex items-center space-x-2 text-xs bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-3 py-1.5 rounded-lg shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">Live Telemetry:</span>
                <span className="font-mono font-bold text-white">{liveTick.cpu_pct}% CPU</span>
                <span className="text-emerald-600">•</span>
                <span className="font-mono text-emerald-300">{liveTick.net_out_mbps} Mbps</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6">
          {/* Recommendation & Safety Hero Banner */}
          {recommendation ? (
            <div
              className={`rounded-2xl p-5 border shadow-xs ${
                isPeakProtected
                  ? "bg-blue-50/70 border-blue-200"
                  : recommendation.monthly_savings_inr > 0
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                        isPeakProtected
                          ? "bg-blue-200 text-blue-900"
                          : "bg-emerald-200 text-emerald-900"
                      }`}
                    >
                      {isPeakProtected ? "Peak Protected Guarantee" : "Recommended Action"}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Confidence: {recommendation.confidence_score}% • Risk: {recommendation.risk_level}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {recommendation.current_config} <ArrowRight className="inline w-4 h-4 mx-1" /> {recommendation.target_config}
                  </h3>
                </div>

                {/* Savings Pill & Action Buttons */}
                <div className="flex items-center space-x-3">
                  {recommendation.monthly_savings_inr > 0 ? (
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-medium">Monthly Savings</div>
                      <div className="text-xl font-black font-mono text-emerald-600">
                        Save ₹{recommendation.monthly_savings_inr.toLocaleString("en-IN")}/mo
                      </div>
                    </div>
                  ) : recommendation.monthly_savings_inr < 0 ? (
                    <div className="text-right">
                      <div className="text-xs text-amber-700 font-medium">Capacity Upgrade</div>
                      <div className="text-xl font-black font-mono text-amber-600">
                        +₹{Math.abs(recommendation.monthly_savings_inr).toLocaleString("en-IN")}/mo
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs text-blue-600 font-medium">Protected State</div>
                      <div className="text-sm font-bold text-blue-800">
                        Size Locked for SLA
                      </div>
                    </div>
                  )}

                  {!isPeakProtected && (
                    <div className="flex items-center space-x-1.5 ml-2">
                      <button
                        onClick={() => handleStatusChange("accepted")}
                        disabled={isUpdatingStatus || recommendation.status === "accepted"}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                          recommendation.status === "accepted"
                            ? "bg-emerald-600 text-white cursor-default"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{recommendation.status === "accepted" ? "Accepted" : "Accept"}</span>
                      </button>

                      <button
                        onClick={() => handleStatusChange("rejected")}
                        disabled={isUpdatingStatus || recommendation.status === "rejected"}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                          recommendation.status === "rejected"
                            ? "bg-slate-300 text-slate-600 cursor-default"
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{recommendation.status === "rejected" ? "Rejected" : "Reject"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Plain-Language Engineering Explanation */}
              <p className="text-xs text-slate-700 mt-3 leading-relaxed">
                {recommendation.plain_language_reason}
              </p>

              {/* Special Interactive Peak Protection Demonstration */}
              {isPeakProtected && (
                <div className="mt-4 p-3.5 bg-white border border-blue-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="text-xs text-slate-800">
                      <span className="font-bold">Trap Detection Demonstration:</span> Toggle hypothetical downsize to see why naive average sizing fails!
                    </div>
                  </div>
                  <button
                    onClick={() => setForceHypotheticalDownsize(!forceHypotheticalDownsize)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      forceHypotheticalDownsize
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {forceHypotheticalDownsize ? "Disable Forced Downsize" : "Simulate Naive 50% Downsize"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
              No rightsizing actions required. Resource is optimally sized or has no active telemetry.
            </div>
          )}

          {/* Chart Controls & Live Overlay Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">
                30-Day Historical Utilization vs. Projected Post-Optimization Overlay
              </h4>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showProjectedAfter}
                  onChange={(e) => setShowProjectedAfter(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Show Projected After Overlay</span>
              </label>
            </div>
          </div>

          {/* Time-Series Chart 1: CPU % Before vs. Projected After */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-800">CPU Utilization (%)</span>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-0.5 bg-blue-500" />
                  <span>Historical Baseline</span>
                </span>
                {showProjectedAfter && (
                  <span className="flex items-center space-x-1 font-bold text-emerald-600">
                    <span className="w-2.5 h-0.5 bg-emerald-500 border-b border-dashed" />
                    <span>Projected After</span>
                  </span>
                )}
                <span className="flex items-center space-x-1 text-rose-600 font-bold">
                  <span className="w-2.5 h-0.5 bg-rose-500 border-b border-dashed" />
                  <span>Max Safe Ceiling (75%)</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading 2,880 telemetry data points...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatChartDate}
                      fontSize={10}
                      stroke="#94a3b8"
                      tickLine={false}
                    />
                    <YAxis domain={[0, 100]} fontSize={10} stroke="#94a3b8" tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg border border-slate-700">
                              <div className="font-mono text-slate-400 mb-1">{p.timestamp.slice(0, 16)}</div>
                              <div className="flex justify-between py-0.5 text-blue-400 font-mono">
                                <span>Historical CPU:</span>
                                <span className="font-bold">{p.cpu_before}%</span>
                              </div>
                              {showProjectedAfter && (
                                <div
                                  className={`flex justify-between py-0.5 font-mono font-bold ${
                                    p.cpu_projected > 75 ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                >
                                  <span>Projected CPU:</span>
                                  <span>{p.cpu_projected}%</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Safe Ceiling Reference Line */}
                    <ReferenceLine
                      y={75}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{
                        value: "Safe Target (75%)",
                        position: "insideTopRight",
                        fill: "#ef4444",
                        fontSize: 10,
                      }}
                    />

                    {/* Historical Baseline Curve */}
                    <Line
                      type="monotone"
                      dataKey="cpu_before"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                      name="Historical"
                    />

                    {/* Projected After Curve (Dashed) */}
                    {showProjectedAfter && (
                      <Line
                        type="monotone"
                        dataKey="cpu_projected"
                        stroke={forceHypotheticalDownsize ? "#ef4444" : "#10b981"}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={false}
                        name="Projected After"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {forceHypotheticalDownsize && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>Proof Demonstrated:</strong> Forcing a 50% downsize on this bursty VM pushes its daily peak to 100%+ (outage!). SmartCloud Optimizer correctly locked this size.
                </span>
              </div>
            )}
          </div>

          {/* Time-Series Chart 2: Memory & Disk IOPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memory % */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-semibold text-slate-800 mb-2">Memory Utilization (%)</div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatChartDate} fontSize={9} stroke="#94a3b8" tickLine={false} />
                    <YAxis domain={[0, 100]} fontSize={9} stroke="#94a3b8" tickLine={false} />
                    <Line type="monotone" dataKey="mem_before" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Disk IOPS */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-semibold text-slate-800 mb-2">Disk IOPS</div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatChartDate} fontSize={9} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={9} stroke="#94a3b8" tickLine={false} />
                    <Line type="monotone" dataKey="iops" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Infrastructure-as-Code Code Snippet */}
          {recommendation?.iac_snippets && (
            <div className="bg-slate-900 rounded-xl p-4 text-white font-mono text-xs border border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Utho CLI & Terraform Execution</span>
                </div>
                <span className="text-[10px] text-slate-500">Auto-Generated</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Utho CLI:</div>
                  <pre className="bg-slate-950 p-2.5 rounded-lg text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                    {recommendation.iac_snippets.utho_cli}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Terraform HCL:</div>
                  <pre className="bg-slate-950 p-2.5 rounded-lg text-blue-300 overflow-x-auto whitespace-pre-wrap">
                    {recommendation.iac_snippets.terraform}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
