"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  TrendingDown,
  Coins,
  ShieldCheck,
  Leaf,
  Layers,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { runWhatIfSimulation } from "@/lib/api";

export const WhatIfSimulator: React.FC = () => {
  const [targetP99, setTargetP99] = useState(72);
  const [shutdownDev, setShutdownDev] = useState(true);
  const [shutdownStagingWeekends, setShutdownStagingWeekends] = useState(true);
  const [offHoursStart, setOffHoursStart] = useState(20);
  const [offHoursEnd, setOffHoursEnd] = useState(8);
  const [retentionDays, setRetentionDays] = useState(14);
  const [releaseIps, setReleaseIps] = useState(true);

  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerSimulation = async () => {
    try {
      setLoading(true);
      const res = await runWhatIfSimulation({
        shutdown_dev_off_hours: shutdownDev,
        shutdown_staging_weekends: shutdownStagingWeekends,
        off_hours_window: { start_hour: offHoursStart, end_hour: offHoursEnd },
        target_p99_headroom_pct: targetP99,
        delete_unattached_volumes_older_than_days: retentionDays,
        release_idle_ips: releaseIps,
      });
      setSimulationResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSimulation();
    }, 150);
    return () => clearTimeout(timer);
  }, [
    targetP99,
    shutdownDev,
    shutdownStagingWeekends,
    offHoursStart,
    offHoursEnd,
    retentionDays,
    releaseIps,
  ]);

  const handleReset = () => {
    setTargetP99(72);
    setShutdownDev(true);
    setShutdownStagingWeekends(true);
    setOffHoursStart(20);
    setOffHoursEnd(8);
    setRetentionDays(14);
    setReleaseIps(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Interactive FinOps "What-If" Policy Simulator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Experiment with automated governance policies in real time. Math engine recalculates fleet impact in &lt;150ms.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Policy Controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            Policy Knobs & Governance Rules
          </h3>

          {/* Slider 1: Safety Headroom Target */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-800">Target P99 Peak Headroom Ceiling:</span>
              <span className="font-mono text-blue-600 text-sm font-bold">{targetP99}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="85"
              step="1"
              value={targetP99}
              onChange={(e) => setTargetP99(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>60% (Ultra Conservative)</span>
              <span>72% (Recommended)</span>
              <span>85% (Aggressive)</span>
            </div>
          </div>

          {/* Slider 2: Orphaned Storage Retention Policy */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-800">Clean Unattached Volumes Older Than:</span>
              <span className="font-mono text-purple-600 text-sm font-bold">{retentionDays} Days</span>
            </div>
            <input
              type="range"
              min="7"
              max="60"
              step="7"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>7 Days (Strict)</span>
              <span>14 Days (Standard)</span>
              <span>60 Days (Lenient)</span>
            </div>
          </div>

          {/* Toggle: Off-Hours Auto-Shutdown */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs font-bold text-slate-800">Dev & Staging Off-Hours Shutdown</div>
                <div className="text-[11px] text-slate-500">Auto-stop non-prod instances at 20:00 IST</div>
              </div>
              <input
                type="checkbox"
                checked={shutdownDev}
                onChange={(e) => setShutdownDev(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs font-bold text-slate-800">Full Weekend Staging Freeze</div>
                <div className="text-[11px] text-slate-500">Keep staging cluster shutdown Saturday & Sunday</div>
              </div>
              <input
                type="checkbox"
                checked={shutdownStagingWeekends}
                onChange={(e) => setShutdownStagingWeekends(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs font-bold text-slate-800">Release Idle Public IPs</div>
                <div className="text-[11px] text-slate-500">Avoid Utho's ₹100/mo unattached hoarding fee</div>
              </div>
              <input
                type="checkbox"
                checked={releaseIps}
                onChange={(e) => setReleaseIps(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Simulated Live Financial & ESG Delta */}
        <div className="lg:col-span-7 space-y-4">
          {simulationResult && (
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm text-white">Simulated Monthly Impact</h3>
                </div>
                {loading && (
                  <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                    Computing matrix...
                  </span>
                )}
              </div>

              {/* Big KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-5">
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1">Simulated Monthly Bill</div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    ₹{Math.round(simulationResult.simulated_monthly_spend_inr).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-1 font-semibold">
                    -{simulationResult.percentage_reduction}% reduction
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1">Monthly Cost Savings</div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                    ₹{Math.round(simulationResult.simulated_monthly_savings_inr).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    ₹{Math.round(simulationResult.annual_runrate_savings_inr).toLocaleString("en-IN")}/yr run-rate
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 font-medium mb-1">Affected Resources</div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-blue-300">
                    {simulationResult.affected_resources_count}
                    <span className="text-xs text-slate-400 font-sans font-normal ml-1">of 105</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Optimized by rule
                  </div>
                </div>
              </div>

              {/* Risk Distribution Bar */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span className="font-semibold">Simulated Risk Exposure Profile:</span>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-emerald-400 font-bold">
                      Low: {simulationResult.risk_distribution.Low || 0}
                    </span>
                    <span className="text-amber-400 font-bold">
                      Medium: {simulationResult.risk_distribution.Medium || 0}
                    </span>
                    <span className="text-rose-400 font-bold">
                      High: {simulationResult.risk_distribution.High || 0}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${
                        ((simulationResult.risk_distribution.Low || 0) /
                          Math.max(1, simulationResult.affected_resources_count)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: `${
                        ((simulationResult.risk_distribution.Medium || 0) /
                          Math.max(1, simulationResult.affected_resources_count)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="bg-rose-500 h-full"
                    style={{
                      width: `${
                        ((simulationResult.risk_distribution.High || 0) /
                          Math.max(1, simulationResult.affected_resources_count)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* ESG Sustainability Impact */}
              <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-slate-400 text-[10px]">Power Saved</div>
                    <div className="font-bold font-mono text-white">
                      {simulationResult.sustainability_impact.monthly_kwh_saved.toLocaleString("en-IN")} kWh
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-slate-400 text-[10px]">CO2 Avoided</div>
                    <div className="font-bold font-mono text-white">
                      {simulationResult.sustainability_impact.monthly_co2_kg_saved.toLocaleString("en-IN")} kg
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-slate-400 text-[10px]">Tree Equiv.</div>
                    <div className="font-bold font-mono text-white">
                      {simulationResult.sustainability_impact.trees_equivalent.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
