"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { Activity, ShieldCheck, Zap } from "lucide-react";

interface FleetUtilizationProps {
  aggregatedTimeseries: any[];
  acceptedCount: number;
}

export const FleetUtilizationChart: React.FC<FleetUtilizationProps> = ({
  aggregatedTimeseries,
  acceptedCount,
}) => {
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              Interactive Fleet Utilization & Cost Simulation Preview
            </h3>
            {acceptedCount > 0 ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{acceptedCount} Optimizations Active</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                Baseline (Unoptimized)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time overlay of historical fleet utilization against currently accepted optimization plans.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600 font-medium">Fleet CPU P95</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-600 font-medium">Baseline Hourly Cost</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 font-bold">Simulated Hourly Cost</span>
          </span>
        </div>
      </div>

      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={aggregatedTimeseries || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="fleetCpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            {/* Left Y Axis for CPU % */}
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            {/* Right Y Axis for Hourly Cost in INR */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[300, 800]}
              tickFormatter={(v) => `₹${v}`}
              stroke="#10b981"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 min-w-[210px]">
                      <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2 font-mono">
                        {formatTime(pt.timestamp)}
                      </div>
                      <div className="flex justify-between py-0.5 text-blue-400">
                        <span>CPU P95:</span>
                        <span className="font-mono font-bold">{pt.p95_cpu}%</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-slate-400">
                        <span>CPU Average:</span>
                        <span className="font-mono">{pt.avg_cpu}%</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-purple-400">
                        <span>Memory P95:</span>
                        <span className="font-mono">{pt.p95_mem}%</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-slate-400">
                        <span>Baseline Cost:</span>
                        <span className="font-mono line-through">₹{pt.hourly_cost_before}/hr</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Simulated Cost:</span>
                        <span className="font-mono">₹{pt.hourly_cost_after_projected}/hr</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Safe headroom threshold line at 75% */}
            <ReferenceLine
              yAxisId="left"
              y={75}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: "Peak Safe Ceiling (75%)",
                position: "insideTopRight",
                fill: "#ef4444",
                fontSize: 10,
              }}
            />

            {/* Fleet CPU Area */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="p95_cpu"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#fleetCpuGrad)"
              name="Fleet CPU P95"
            />

            {/* Cost Baseline Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hourly_cost_before"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="Baseline Cost"
            />

            {/* Cost After Line (Steps down as optimizations are accepted) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hourly_cost_after_projected"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="Simulated Post-Optimization Cost"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl">
        <span className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Notice: Resizing down pushes CPU into the healthy 45-70% zone while dropping hourly burn rate.</span>
        </span>
        <span className="font-mono font-medium text-slate-700">75 Monitored VMs</span>
      </div>
    </div>
  );
};
