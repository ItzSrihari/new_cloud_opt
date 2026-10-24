"use client";

import React from "react";
import { BookOpen, ShieldCheck, Zap, Leaf, Calculator, FileCode } from "lucide-react";

export const AssumptionsSheet: React.FC = () => {
  const plans = [
    { plan_id: "utho.nano", tier: "Nano Cloud", vcpu: 1, ram: 1, disk: 25, hourly: "₹0.41", monthly: "₹300", watts: "12 W" },
    { plan_id: "utho.micro", tier: "Micro Cloud", vcpu: 1, ram: 2, disk: 40, hourly: "₹0.82", monthly: "₹600", watts: "18 W" },
    { plan_id: "utho.small", tier: "Small Cloud", vcpu: 2, ram: 4, disk: 80, hourly: "₹1.64", monthly: "₹1,200", watts: "32 W" },
    { plan_id: "utho.medium", tier: "Medium Cloud", vcpu: 4, ram: 8, disk: 160, hourly: "₹3.29", monthly: "₹2,400", watts: "58 W" },
    { plan_id: "utho.large", tier: "Large Cloud", vcpu: 8, ram: 16, disk: 320, hourly: "₹6.58", monthly: "₹4,800", watts: "110 W" },
    { plan_id: "utho.xlarge", tier: "XLarge Cloud", vcpu: 16, ram: 32, disk: 640, hourly: "₹13.15", monthly: "₹9,600", watts: "210 W" },
    { plan_id: "utho.2xlarge", tier: "2XLarge Cloud", vcpu: 32, ram: 64, disk: 1280, hourly: "₹26.30", monthly: "₹19,200", watts: "400 W" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-blue-600 mb-1">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-900">
            Assumptions, Pricing Catalog & Mathematical Formulas
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          SmartCloud Optimizer operates on 100% mathematical transparency. Every rightsizing recommendation, risk score, and carbon estimate is verifiable using the equations and pricing ledger documented below.
        </p>
      </div>

      {/* Pricing Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Utho Cloud Official Pricing Catalog (INR / ₹)</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">1 Month = 730 Hours</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Plan ID</th>
                <th className="py-3 px-4">Tier Name</th>
                <th className="py-3 px-3">vCPU</th>
                <th className="py-3 px-3">RAM (GB)</th>
                <th className="py-3 px-3">Disk (GB)</th>
                <th className="py-3 px-4">Hourly Cost (INR)</th>
                <th className="py-3 px-4 font-mono font-bold text-slate-900">Monthly Cost (INR)</th>
                <th className="py-3 px-4">Power Draw</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {plans.map((p) => (
                <tr key={p.plan_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-blue-700">{p.plan_id}</td>
                  <td className="py-3 px-4 font-sans text-slate-800 font-medium">{p.tier}</td>
                  <td className="py-3 px-3 text-slate-700">{p.vcpu}</td>
                  <td className="py-3 px-3 text-slate-700">{p.ram}</td>
                  <td className="py-3 px-3 text-slate-700">{p.disk}</td>
                  <td className="py-3 px-4 text-slate-600">{p.hourly}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.monthly}</td>
                  <td className="py-3 px-4 text-slate-500">{p.watts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Additional Storage & IP Pricing Notes */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-bold text-slate-800 mb-1">Block Storage Volume:</div>
            <div className="text-slate-600 font-mono">₹8.00 / GB / month (NVMe High-Performance SSD)</div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-1">Static Public IPv4:</div>
            <div className="text-slate-600 font-mono">
              ₹250/mo attached • ₹350/mo unattached (includes ₹100 Utho hoarding surcharge)
            </div>
          </div>
        </div>
      </div>

      {/* Core Mathematical Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Peak-Safe Formula */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>1. Peak-Safe Rightsizing Theorem (P99 Proof)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Never downsize based on mean utilization. For a candidate plan with vCPU <code className="font-mono bg-slate-100 px-1">v_cand</code>:
          </p>
          <div className="bg-slate-900 text-emerald-300 p-3 rounded-xl font-mono text-xs overflow-x-auto">
            {"P99_projected(C_cand) = P99_historical × (v_curr / v_cand)"}
            {"\nSafe Condition: P99_cpu ≤ 72% AND P99_mem ≤ 75%"}
          </div>
          <p className="text-xs text-slate-500">
            <strong>Trap Detection ("Peak Protected"):</strong> If average CPU &lt; 25% but daily peak P99 &ge; 85%, downsizing is mathematically blocked to prevent catastrophic service outage.
          </p>
        </div>

        {/* Confidence & Risk Scoring */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-purple-700 font-bold text-sm">
            <Calculator className="w-5 h-5" />
            <span>2. Confidence & Risk Equation</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every recommendation is scored based on safety headroom and historical metric volatility:
          </p>
          <div className="bg-slate-900 text-purple-300 p-3 rounded-xl font-mono text-xs overflow-x-auto">
            {"HeadroomMargin = (80 - max(P99_cpu_proj, P99_mem_proj)) / 80\n"}
            {"StabilityFactor = 1 - min(1, std_cpu / 50)\n"}
            {"Score = clamp(50 + 30×HeadroomMargin + 20×StabilityFactor, 55, 99)"}
          </div>
        </div>

        {/* Capacity Creep OLS Regression */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
            <Zap className="w-5 h-5" />
            <span>3. Ordinary Least Squares (OLS) Linear Trend</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Daily peak utilization is fitted with an OLS linear regression across 30 days:
          </p>
          <div className="bg-slate-900 text-amber-300 p-3 rounded-xl font-mono text-xs overflow-x-auto">
            {"y_d = β0 + β1×d + ε\n"}
            {"DaysTo100% = (100 - y_30) / β1  (Alert if β1 > 0.8%/day)"}
          </div>
        </div>

        {/* ESG Sustainability Factors */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
            <Leaf className="w-5 h-5" />
            <span>4. ESG Carbon & Energy Reduction Standards</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Calculated using Indian Data Center standards and Central Electricity Authority (CEA) emission factors:
          </p>
          <div className="bg-slate-900 text-emerald-300 p-3 rounded-xl font-mono text-xs overflow-x-auto">
            {"PUE = 1.38 (Indian Data Center Average)\n"}
            {"EF_India = 0.71 kg CO2e / kWh (CEA Grid Factor)\n"}
            {"ΔkWh = (Watts_saved × Hours × 1.38) / 1000\n"}
            {"ΔCO2 = ΔkWh × 0.71  |  1 Tree = 1.75 kg CO2/month"}
          </div>
        </div>
      </div>
    </div>
  );
};
