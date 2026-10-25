"use client";

import React from "react";
import {
  BarChart3,
  Server,
  Sparkles,
  Sliders,
  Bell,
  BookOpen,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Globe2,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingRecCount?: number;
  criticalAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingRecCount = 0,
  criticalAlertCount = 0,
}) => {
  const tabs = [
    { id: "overview", label: "Executive Command", icon: BarChart3, badge: null },
    { id: "resources", label: "Resource Inventory", icon: Server, badge: "105" },
    { id: "recommendations", label: "Recommendations Hub", icon: Sparkles, badge: pendingRecCount > 0 ? `${pendingRecCount}` : null },
    { id: "simulator", label: "What-If Simulator", icon: Sliders, badge: "Policy" },
    { id: "alerts", label: "Alerts & Forecast", icon: Bell, badge: criticalAlertCount > 0 ? `${criticalAlertCount}!` : null },
    { id: "assumptions", label: "Assumptions & Formulas", icon: BookOpen, badge: null },
  ];

  return (
    <aside className="sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center border-b border-slate-800">
        <img
          src="/logo.png"
          alt="Utho"
          className="h-8 w-auto max-w-[180px] object-contain"
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all relative ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span className="ml-3 truncate">{tab.label}</span>

              {/* Badges */}
              {tab.badge && (
                <span
                  className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    tab.id === "alerts"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : isActive
                      ? "bg-blue-800 text-blue-200"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Sovereign Cloud</span>
            <span className="text-emerald-400 font-mono">India Regions</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono text-slate-400">
            <div className="bg-slate-800/80 p-1 rounded">Noida 3ms</div>
            <div className="bg-slate-800/80 p-1 rounded">Blr 4ms</div>
            <div className="bg-slate-800/80 p-1 rounded">Mum 2ms</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
