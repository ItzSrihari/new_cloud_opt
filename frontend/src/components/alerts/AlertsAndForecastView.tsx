"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  Zap,
  TrendingUp,
  ShieldAlert,
  Server,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { fetchAlertsAndForecast, triggerLiveAnomaly } from "@/lib/api";

export const AlertsAndForecastView: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await fetchAlertsAndForecast();
      setAlerts(data.active_alerts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleSimulate = async () => {
    try {
      setTriggering(true);
      await triggerLiveAnomaly();
      setTimeout(() => loadAlerts(), 800);
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-rose-600" />
            <span>Real-Time Anomaly Feed & Capacity Forecasting</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Statistical Z-score monitoring (&gt;3.5 threshold) paired with OLS linear trend capacity creepers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadAlerts}
            className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 font-semibold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSimulate}
            disabled={triggering}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Trigger Live Anomaly (Demo)</span>
          </button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        {alerts.map((alert) => {
          const isCapacity = alert.type === "CAPACITY_EXHAUSTION";
          const isAcute = alert.type === "ACUTE_ANOMALY";

          return (
            <div
              key={alert.id}
              className={`rounded-2xl p-5 border shadow-xs transition-all ${
                isAcute
                  ? "bg-rose-50/70 border-rose-200"
                  : isCapacity
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isAcute
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isAcute ? <Zap className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isAcute
                            ? "bg-rose-200 text-rose-900"
                            : "bg-amber-200 text-amber-900"
                        }`}
                      >
                        {alert.severity} • {alert.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {alert.resource_name} ({alert.resource_id})
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {alert.title}
                    </h3>

                    <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>

                {/* Stat Pill */}
                {alert.days_to_100_pct !== undefined ? (
                  <div className="text-right sm:self-center flex-shrink-0 bg-amber-100/80 border border-amber-300/80 px-3 py-2 rounded-xl">
                    <div className="text-[10px] uppercase font-bold text-amber-800">Saturation Limit</div>
                    <div className="text-xl font-black font-mono text-amber-900">
                      {alert.days_to_100_pct} Days
                    </div>
                  </div>
                ) : alert.z_score !== undefined ? (
                  <div className="text-right sm:self-center flex-shrink-0 bg-rose-100/80 border border-rose-300/80 px-3 py-2 rounded-xl">
                    <div className="text-[10px] uppercase font-bold text-rose-800">Anomaly Z-Score</div>
                    <div className="text-xl font-black font-mono text-rose-900">
                      +{alert.z_score}σ
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Action Directive */}
              {alert.action_recommendation && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center space-x-1.5 text-slate-800">
                    <span className="font-bold">Recommended Remediation:</span>
                    <span className="text-slate-600">{alert.action_recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
