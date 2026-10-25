"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { AlertCircle, TrendingUp, Info } from "lucide-react";

interface BillingProps {
  billingHistory: any[];
  forecastSpend: any[];
}

export const BillingHistoryAndForecastChart: React.FC<BillingProps> = ({
  billingHistory,
  forecastSpend,
}) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  const currentBaseline = billingHistory && billingHistory.length > 0
    ? billingHistory[billingHistory.length - 1].total_inr
    : 487200;

  // Combine historical months + 90-day forecast points into a single seamless chart sequence
  const chartData = [
    ...(billingHistory || []).map((b) => ({
      label: b.month_label || `M${b.month_offset}`,
      total: b.total_inr,
      prod: b.prod,
      staging: b.staging,
      dev: b.dev,
      unoptimized_forecast: null,
      optimized_forecast: null,
      notes: b.notes,
      isHistorical: true,
    })),
    // Link current month to forecast
    {
      label: "Current (M0)",
      total: currentBaseline,
      prod: null,
      staging: null,
      dev: null,
      unoptimized_forecast: currentBaseline,
      optimized_forecast: currentBaseline,
      notes: "Baseline pivot point",
      isHistorical: false,
    },
    ...(forecastSpend || []).map((f) => ({
      label: f.period,
      total: null,
      prod: null,
      staging: null,
      dev: null,
      unoptimized_forecast: f.unoptimized_spend_inr,
      optimized_forecast: f.optimized_spend_inr,
      notes: f.unoptimized_spend_inr === f.optimized_spend_inr
        ? "No optimizations approved (tracking unoptimized sprawl)"
        : `Projected savings: ₹${(f.unoptimized_spend_inr - f.optimized_spend_inr).toLocaleString("en-IN")}/mo`,
      isHistorical: false,
    })),
  ];

  const formatCurrency = (val: number) => `₹${(val / 1000).toFixed(0)}k`;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              6-Month Cloud Bill Creep & 90-Day Trajectory Forecast
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              +41.2% Growth
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical breakdown by environment annotated with sprawl events vs. Unoptimized vs. Optimized 90-day trajectory.
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-slate-600 font-medium">Unoptimized Forecast</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-600 font-medium">Optimized Trajectory</span>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#64748b"
              fontSize={11}
              domain={[200000, 600000]}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 min-w-[200px]">
                      <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                        {label} {data.isHistorical ? "(Historical)" : "(Forecast)"}
                      </div>
                      {data.total && (
                        <div className="flex justify-between py-0.5 font-mono">
                          <span className="text-slate-400">Total Spend:</span>
                          <span className="font-bold text-white">₹{data.total.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {data.prod && (
                        <div className="flex justify-between py-0.5 text-blue-400 font-mono">
                          <span>Prod:</span>
                          <span>₹{data.prod.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {data.staging && (
                        <div className="flex justify-between py-0.5 text-purple-400 font-mono">
                          <span>Staging:</span>
                          <span>₹{data.staging.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {data.dev && (
                        <div className="flex justify-between py-0.5 text-amber-400 font-mono">
                          <span>Dev:</span>
                          <span>₹{data.dev.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {data.unoptimized_forecast && (
                        <div className="flex justify-between py-0.5 text-rose-400 font-mono">
                          <span>Unoptimized:</span>
                          <span>₹{data.unoptimized_forecast.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {data.optimized_forecast && (
                        <div className="flex justify-between py-0.5 text-emerald-400 font-mono font-bold">
                          <span>Optimized:</span>
                          <span>₹{data.optimized_forecast.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {data.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-amber-300">
                          {data.notes}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Historical Environment Stack */}
            <Bar dataKey="prod" stackId="a" fill="#3b82f6" name="Prod" radius={[0, 0, 0, 0]} />
            <Bar dataKey="staging" stackId="a" fill="#8b5cf6" name="Staging" radius={[0, 0, 0, 0]} />
            <Bar dataKey="dev" stackId="a" fill="#f59e0b" name="Dev" radius={[4, 4, 0, 0]} />

            {/* 90-day Forecast Trajectories (Dashed) */}
            <Line
              type="monotone"
              dataKey="unoptimized_forecast"
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: "#ef4444" }}
              name="Unoptimized Forecast"
            />
            <Line
              type="monotone"
              dataKey="optimized_forecast"
              stroke="#10b981"
              strokeWidth={3}
              strokeDasharray="4 4"
              dot={{ r: 5, fill: "#10b981" }}
              name="Optimized Trajectory"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Root-cause Story Annotations */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <div className="font-bold text-slate-800 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Month -3: Staging Sprawl (+₹48k/mo)</span>
          </div>
          <p className="text-slate-600 mt-1 text-[11px]">
            New staging cluster provisioned on <code className="font-mono text-purple-700">utho.xlarge</code> for load testing and never scaled down.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <div className="font-bold text-slate-800 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Month -2: Orphaned Storage (+₹66.8k/mo)</span>
          </div>
          <p className="text-slate-600 mt-1 text-[11px]">
            Data-Platform migration left 8 TB unattached block volumes and 8 unassociated public IPs incurring hoarding fees.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <div className="font-bold text-slate-800 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Month -1: 24x7 Dev Burn (+₹27.4k/mo)</span>
          </div>
          <p className="text-slate-600 mt-1 text-[11px]">
            Dev environments switched to 24x7 uptime during a release crunch without automated off-hours shutdown.
          </p>
        </div>
      </div>
    </div>
  );
};
