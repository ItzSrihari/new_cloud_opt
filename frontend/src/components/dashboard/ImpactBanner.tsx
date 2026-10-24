"use client";

import React, { useState } from "react";
import { ArrowDownRight, CheckCircle2, RotateCcw, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import { bulkUpdateRecommendations } from "@/lib/api";

interface ImpactBannerProps {
  currentMonthlySpend: number;
  projectedMonthlySpend: number;
  potentialTotalSavings: number;
  acceptedSavings: number;
  acceptedCount: number;
  pendingCount: number;
  acceptedByEnv: { prod: number; staging: number; dev: number };
  onRefresh: () => void;
}

export const ImpactBanner: React.FC<ImpactBannerProps> = ({
  currentMonthlySpend,
  projectedMonthlySpend,
  potentialTotalSavings,
  acceptedSavings,
  acceptedCount,
  pendingCount,
  acceptedByEnv,
  onRefresh,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: "accept_low_risk" | "reset") => {
    try {
      setIsProcessing(true);
      await bulkUpdateRecommendations(action);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const percentAchieved = potentialTotalSavings > 0
    ? Math.min(100, Math.round((acceptedSavings / potentialTotalSavings) * 100))
    : 0;

  const prodPct = potentialTotalSavings > 0 ? (acceptedByEnv.prod / potentialTotalSavings) * 100 : 0;
  const stagingPct = potentialTotalSavings > 0 ? (acceptedByEnv.staging / potentialTotalSavings) * 100 : 0;
  const devPct = potentialTotalSavings > 0 ? (acceptedByEnv.dev / potentialTotalSavings) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Financial Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
          {/* Current Spend */}
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Current Spend
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              ₹{currentMonthlySpend.toLocaleString("en-IN")}
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/mo</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-rose-400 mt-1 font-medium">
              <span>+41.2% over 6 months</span>
            </div>
          </div>

          {/* Potential Total Savings */}
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Identified Waste
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
              ₹{potentialTotalSavings.toLocaleString("en-IN")}
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/mo</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {potentialTotalSavings > 0
                ? `${Math.round((potentialTotalSavings / currentMonthlySpend) * 100)}% potential reduction`
                : "No waste"}
            </div>
          </div>

          {/* Accepted Savings */}
          <div>
            <div className={`text-xs uppercase tracking-wider ${acceptedSavings < 0 ? "text-amber-400" : "text-emerald-400"} font-semibold mb-1 flex items-center space-x-1`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{acceptedSavings < 0 ? "Net Spend Change" : "Accepted Savings"}</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${acceptedSavings < 0 ? "text-amber-300" : "text-emerald-400"}`}>
              {acceptedSavings < 0 ? `-₹${Math.abs(acceptedSavings).toLocaleString("en-IN")}` : `₹${acceptedSavings.toLocaleString("en-IN")}`}
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/mo</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {acceptedCount} optimization{acceptedCount === 1 ? "" : "s"} approved
            </div>
          </div>

          {/* Projected Post-Optimization Spend */}
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Projected Spend
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-300">
              ₹{projectedMonthlySpend.toLocaleString("en-IN")}
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/mo</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-blue-400 mt-1 font-medium">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                {currentMonthlySpend >= projectedMonthlySpend
                  ? `Run-rate savings: ₹${((currentMonthlySpend - projectedMonthlySpend) * 12).toLocaleString("en-IN")}/yr`
                  : `Capacity investment: +₹${((projectedMonthlySpend - currentMonthlySpend) * 12).toLocaleString("en-IN")}/yr`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2.5">
          <button
            onClick={() => handleBulkAction("accept_low_risk")}
            disabled={isProcessing}
            className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>1-Click Accept All Low-Risk</span>
          </button>

          <button
            onClick={() => handleBulkAction("reset")}
            disabled={isProcessing || acceptedSavings === 0}
            className="flex items-center justify-center space-x-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3.5 py-1.5 rounded-xl font-medium text-xs transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Decisions</span>
          </button>
        </div>
      </div>

      {/* Segmented Progress Bar by Environment */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2 text-slate-300">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-200">Savings Realized: {percentAchieved}%</span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span>Prod: ₹{acceptedByEnv.prod.toLocaleString("en-IN")}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                <span>Staging: ₹{acceptedByEnv.staging.toLocaleString("en-IN")}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Dev: ₹{acceptedByEnv.dev.toLocaleString("en-IN")}</span>
              </span>
            </div>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">{pendingCount} pending reviews</span>
        </div>

        {/* Multi-segment bar */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${prodPct}%` }}
            title={`Prod: ₹${acceptedByEnv.prod.toLocaleString("en-IN")}`}
          />
          <div
            className="bg-purple-500 h-full transition-all duration-500"
            style={{ width: `${stagingPct}%` }}
            title={`Staging: ₹${acceptedByEnv.staging.toLocaleString("en-IN")}`}
          />
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${devPct}%` }}
            title={`Dev: ₹${acceptedByEnv.dev.toLocaleString("en-IN")}`}
          />
        </div>
      </div>
    </div>
  );
};
