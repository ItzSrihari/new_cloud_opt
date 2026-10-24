"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Coins,
  TrendingDown,
  Leaf,
  Layers,
  Server,
  Zap,
  HardDrive,
  Network,
} from "lucide-react";

interface RoleCardsProps {
  currentRole: "engineer" | "finops" | "executive";
  fleetSummary: any;
  sustainability: any;
  currentSpend: number;
  acceptedSavings: number;
  potentialSavings: number;
}

export const RolePerspectiveCards: React.FC<RoleCardsProps> = ({
  currentRole,
  fleetSummary,
  sustainability,
  currentSpend,
  acceptedSavings,
  potentialSavings,
}) => {
  if (currentRole === "engineer") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Peak Protection Guard */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-700">Peak Protected</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {fleetSummary?.peak_protected_count || 12}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">VMs Locked</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Low average (13%) but daily peak reaches <span className="font-bold text-slate-800">89%</span>. Protected against downsizing outages.
          </p>
        </div>

        {/* Card 2: Waste Schedulable */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-purple-700">Off-Hours Schedulable</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            16
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">Dev/Staging VMs</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            CPU &lt; 2.5% on weeknights and weekends. 113 idle hours/week ready for cron shutdown.
          </p>
        </div>

        {/* Card 3: Orphaned Resources */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-rose-700">Orphaned Disks & IPs</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600">
            {fleetSummary?.orphaned_count || 20}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">Unattached</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            12 unattached NVMe volumes (18–95d idle) + 8 unassigned public IPs incurring hoarding fees.
          </p>
        </div>

        {/* Card 4: Healthy Optimal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Optimal Rightsized</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {fleetSummary?.optimal_count || 6}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">VMs Sized</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            P50 ~ 45%, P99 ~ 72%. Perfectly aligned with production throughput demands.
          </p>
        </div>
      </div>
    );
  }

  if (currentRole === "finops") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 6-Month Creep Story */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-600">6M Bill Expansion</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600">
            +41.2%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Grew from ₹3,45,000/mo to ₹4,87,200/mo. Primary driver: non-prod sprawl & unmanaged retention.
          </p>
        </div>

        {/* Card 2: Waste Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-700">Identified Leakage</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            ₹{potentialSavings.toLocaleString("en-IN")}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1">/mo</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            ₹1,42k from off-hours + ₹66.8k orphaned disks/IPs + ₹52k overprovisioned tiers.
          </p>
        </div>

        {/* Card 3: Realized Monthly Cut */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className={`text-xs uppercase font-bold tracking-wider ${acceptedSavings < 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {acceptedSavings < 0 ? "Realized Net Change" : "Realized Monthly Cut"}
            </span>
            <div className={`w-8 h-8 rounded-lg ${acceptedSavings < 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"} flex items-center justify-center`}>
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${acceptedSavings < 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {acceptedSavings < 0 ? `-₹${Math.abs(acceptedSavings).toLocaleString("en-IN")}` : `₹${acceptedSavings.toLocaleString("en-IN")}`}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {acceptedSavings < 0 ? "Proactive capacity upsize investment for scaling reliability." : "Direct EBITDA margin improvement on current billing cycle upon execution."}
          </p>
        </div>

        {/* Card 4: Run-Rate Savings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className={`text-xs uppercase font-bold tracking-wider ${acceptedSavings < 0 ? "text-amber-700" : "text-blue-700"}`}>
              {acceptedSavings < 0 ? "Annualized Investment" : "Annualized Run-Rate"}
            </span>
            <div className={`w-8 h-8 rounded-lg ${acceptedSavings < 0 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"} flex items-center justify-center`}>
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${acceptedSavings < 0 ? "text-amber-600" : "text-blue-600"}`}>
            {acceptedSavings < 0 ? `+₹${Math.abs(acceptedSavings * 12).toLocaleString("en-IN")}` : `₹${(acceptedSavings * 12).toLocaleString("en-IN")}`}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {acceptedSavings < 0 ? "Annual infrastructure expansion cost to prevent capacity exhaustion outages." : "Contractual and operational FinOps savings projected across the next 12 rolling months."}
          </p>
        </div>
      </div>
    );
  }

  // Executive Leadership
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: ROI Multiplier */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs uppercase font-bold tracking-wider text-blue-700">Cost Reduction</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-slate-900">
          {currentSpend > 0 ? Math.round((potentialSavings / currentSpend) * 100) : 0}%
          <span className="text-xs text-slate-500 font-sans font-normal ml-1">Target Reduction</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Low-risk actionable optimizations with zero disruption to core business SLA.
        </p>
      </div>

      {/* Card 2: Risk Posture */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Risk Profile</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-emerald-600">
          Peak-Safe
        </div>
        <p className="text-xs text-slate-500 mt-2">
          All rightsizing backed by P99 &le; 72% mathematical proof. Zero uncalculated downsizing.
        </p>
      </div>

      {/* Card 3: Energy Saved */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">ESG Power Saved</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-slate-900">
          {(sustainability?.monthly_kwh_saved || 24800).toLocaleString("en-IN")}
          <span className="text-xs text-slate-500 font-sans font-normal ml-1">kWh/mo</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          PUE 1.38 Indian data center standard energy reduction through idle shutdown and rightsizing.
        </p>
      </div>

      {/* Card 4: Carbon & Tree Equivalent */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">CO2 & Tree Impact</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Leaf className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-emerald-600">
          {(sustainability?.monthly_co2_kg_saved || 17600).toLocaleString("en-IN")}
          <span className="text-xs text-slate-500 font-sans font-normal ml-1">kg CO2e</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Equivalent to planting <span className="font-bold text-emerald-700">{Math.round((sustainability?.trees_equivalent || 10057))} trees</span> under India CEA grid factors.
        </p>
      </div>
    </div>
  );
};
