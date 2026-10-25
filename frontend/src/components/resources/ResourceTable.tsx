"use client";

import React, { useState } from "react";
import {
  Server,
  HardDrive,
  Globe2,
  ShieldCheck,
  Zap,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

interface ResourceTableProps {
  resources: any[];
  onSelectResource: (resource: any) => void;
  selectedResourceId?: string;
  liveTicksMap?: Record<string, any>;
}

export const ResourceTable: React.FC<ResourceTableProps> = ({
  resources,
  onSelectResource,
  selectedResourceId,
  liveTicksMap,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterEnv, setFilterEnv] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("monthly_cost_inr");
  const [sortAsc, setSortAsc] = useState(false);

  const getStatusBadge = (status: string, p99Cpu?: number) => {
    switch (status) {
      case "Peak Protected":
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            <span>Peak Protected (P99={p99Cpu || 89}%)</span>
          </span>
        );
      case "Oversized":
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Oversized</span>
          </span>
        );
      case "Off-Hours Waste":
        return (
          <span className="inline-flex items-center space-x-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <Clock className="w-3 h-3 text-purple-600" />
            <span>Off-Hours Waste</span>
          </span>
        );
      case "Zombie / Idle":
        return (
          <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Zombie / Idle</span>
          </span>
        );
      case "Orphaned Resource":
        return (
          <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Orphaned Resource</span>
          </span>
        );
      case "Capacity Creep":
        return (
          <span className="inline-flex items-center space-x-1 bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <Zap className="w-3 h-3 text-orange-600" />
            <span>Capacity Creep</span>
          </span>
        );
      case "Optimal":
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Optimal</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-medium">
            {status || "Active"}
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "vm":
        return <Server className="w-4 h-4 text-blue-600" />;
      case "block_volume":
        return <HardDrive className="w-4 h-4 text-purple-600" />;
      case "public_ip":
        return <Globe2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Server className="w-4 h-4 text-slate-600" />;
    }
  };

  // Filter logic
  const filtered = (resources || []).filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = r.resource_id?.toLowerCase().includes(q);
      const matchName = r.name?.toLowerCase().includes(q);
      const matchPlan = r.plan_id?.toLowerCase().includes(q);
      const matchTeam = r.team?.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPlan && !matchTeam) return false;
    }
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterEnv !== "all" && r.environment !== filterEnv) return false;
    if (filterRegion !== "all" && r.region !== filterRegion) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Control & Search Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">
            Showing {sorted.length} of {resources.length}
          </span>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="vm">Virtual Machines (75)</option>
            <option value="block_volume">Block Volumes (18)</option>
            <option value="public_ip">Public IPs (12)</option>
          </select>

          {/* Environment filter */}
          <select
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Environments</option>
            <option value="prod">Prod</option>
            <option value="staging">Staging</option>
            <option value="dev">Dev</option>
          </select>

          {/* Region filter */}
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Regions</option>
            <option value="Noida">Noida</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Mumbai">Mumbai</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Peak Protected">Peak Protected</option>
            <option value="Oversized">Oversized</option>
            <option value="Off-Hours Waste">Off-Hours Waste</option>
            <option value="Zombie / Idle">Zombie / Idle</option>
            <option value="Orphaned Resource">Orphaned Resource</option>
            <option value="Capacity Creep">Capacity Creep</option>
            <option value="Optimal">Optimal</option>
          </select>
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Resource</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Region & Env</th>
              <th className="py-3 px-3">Spec / Plan</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-slate-900"
                onClick={() => handleSort("p99_cpu")}
              >
                <div className="flex items-center space-x-1">
                  <span>P99 CPU</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                onClick={() => handleSort("monthly_cost_inr")}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Monthly Cost</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Status & Safety</th>
              <th className="py-3 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((res) => {
              const isSelected = selectedResourceId === res.resource_id;
              return (
                <tr
                  key={res.resource_id}
                  onClick={() => onSelectResource(res)}
                  className={`group cursor-pointer transition-colors hover:bg-blue-50/50 ${
                    isSelected ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
                >
                  {/* Name and ID */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                      <span>{res.name}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                      {res.resource_id}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1.5">
                      {getTypeIcon(res.type)}
                      <span className="font-medium text-slate-700 uppercase text-[10px]">
                        {res.type === "block_volume" ? "Volume" : res.type === "public_ip" ? "IP" : "VM"}
                      </span>
                    </div>
                  </td>

                  {/* Region & Env */}
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1 text-slate-800 font-medium">
                      <span>{res.region}</span>
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded ${
                          res.environment === "prod"
                            ? "bg-blue-100 text-blue-800"
                            : res.environment === "staging"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {res.environment}
                      </span>
                    </div>
                  </td>

                  {/* Spec / Plan */}
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {res.type === "vm" ? (
                      <span className="font-semibold text-blue-700">{res.plan_id}</span>
                    ) : res.type === "block_volume" ? (
                      <span>{res.disk_gb} GB NVMe</span>
                    ) : (
                      <span>Static IPv4</span>
                    )}
                  </td>

                  {/* P99 CPU & Live Telemetry */}
                  <td className="py-3 px-3 font-mono">
                    {res.type === "vm" ? (
                      <div>
                        {(() => {
                          const liveTick = liveTicksMap ? liveTicksMap[res.resource_id] : null;
                          return (
                            <>
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`font-bold ${
                                    res.p99_cpu >= 85
                                      ? "text-blue-600"
                                      : res.p99_cpu > 72
                                      ? "text-rose-600"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {res.p99_cpu}%
                                </span>
                                {liveTick && (
                                  <span
                                    className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold transition-all shadow-xs"
                                    title={`Instantaneous Utho telemetry: ${liveTick.cpu_pct}% CPU • ${liveTick.net_out_mbps} Mbps network egress`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Live: {liveTick.cpu_pct}%</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                avg: {res.avg_cpu}% {liveTick ? `• ${liveTick.net_out_mbps} Mbps` : ""}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Monthly Cost */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{res.monthly_cost_inr.toLocaleString("en-IN")}
                    <div className="text-[10px] text-slate-400 font-normal">
                      ₹{res.hourly_cost_inr}/hr
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {getStatusBadge(res.status, res.p99_cpu)}
                  </td>

                  {/* Row Action Arrow */}
                  <td className="py-3 px-3 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors inline-block" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
