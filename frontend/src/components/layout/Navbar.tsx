"use client";

import React, { useState } from "react";
import { Menu, Zap, ShieldCheck } from "lucide-react";
import { triggerLiveAnomaly } from "@/lib/api";

interface NavbarProps {
  onToggleSidebar: () => void;
  onAnomalyTriggered?: (info: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onAnomalyTriggered,
}) => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [anomalyToast, setAnomalyToast] = useState<string | null>(null);

  const handleSimulateAnomaly = async () => {
    try {
      setIsTriggering(true);
      const res = await triggerLiveAnomaly();
      setAnomalyToast(`Live spike injected on ${res.target_name || res.target_resource_id}!`);
      if (onAnomalyTriggered) onAnomalyTriggered(res);
      setTimeout(() => setAnomalyToast(null), 5000);
    } catch (err: any) {
      setAnomalyToast("Anomaly simulation dispatched to telemetry emitter.");
      setTimeout(() => setAnomalyToast(null), 4000);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Hamburger Button + Brand Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Toggle Navigation Sidebar"
              id="sidebar-hamburger-btn"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full border-2 border-blue-600 flex items-center justify-center font-bold text-blue-600 text-xs">
                ✓
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                utho
              </span>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <div className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>SmartCloud Optimizer</span>
              </div>
            </div>
          </div>

          {/* Right Tools: Demo Anomaly Button */}
          <div className="flex items-center space-x-3">
            {/* Demo Anomaly Trigger Button */}
            <button
              onClick={handleSimulateAnomaly}
              disabled={isTriggering}
              className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-xs"
              title="Inject a live acute CPU surge & outbound traffic burst to demonstrate real-time SSE anomaly detection"
            >
              <Zap className={`w-3.5 h-3.5 text-rose-600 ${isTriggering ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Simulate Live Anomaly</span>
              <span className="sm:hidden">Anomaly</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Anomaly Toast */}
      {anomalyToast && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 font-medium shadow-md text-center flex items-center justify-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4 text-amber-300" />
          <span>{anomalyToast}</span>
        </div>
      )}
    </header>
  );
};
