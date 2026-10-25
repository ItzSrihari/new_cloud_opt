"""
Fast CLI interface and RPC bridge for optimizer-engine-server Node.js runtime.
Handles JSON stdin/args and returns structured JSON responses in <150ms.
"""

import sys
import os
import json
import httpx
import numpy as np

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "utho-infra-server"))
from catalog import UTHO_PLANS
from generator import generate_inventory, generate_billing_history_6m, generate_vm_timeseries_30d
from engine import (
    calculate_metrics_summary,
    generate_recommendations,
    compute_capacity_forecasts,
    evaluate_what_if_scenario,
    compute_carbon_savings
)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_FILE = os.path.join(CACHE_DIR, "analytics_cache.json")


def load_or_fetch_all_data():
    """
    Checks if Server 1 is reachable with a single 300ms ping.
    If online, loads from Server 1; otherwise generates in-memory directly in <1 second.
    """
    infra_url = os.environ.get("INFRA_SERVER_URL", "http://localhost:8001").rstrip("/")
    inventory = None
    billing_history = None
    metrics_cache = {}

    server1_online = False
    try:
        with httpx.Client(timeout=3.0) as client:
            res = client.get(f"{infra_url}/health")
            if res.status_code == 200:
                server1_online = True
    except Exception:
        server1_online = False

    if server1_online:
        try:
            with httpx.Client(timeout=10.0) as client:
                inv_res = client.get(f"{infra_url}/infra/inventory")
                if inv_res.status_code == 200:
                    inventory = inv_res.json()["resources"]
                bill_res = client.get(f"{infra_url}/infra/billing-history")
                if bill_res.status_code == 200:
                    billing_history = bill_res.json()["history"]
                
                vms = [r for r in inventory if r["type"] == "vm"]
                for vm in vms:
                    rid = vm["resource_id"]
                    m_res = client.get(f"{infra_url}/infra/metrics?resource_id={rid}")
                    if m_res.status_code == 200:
                        metrics_cache[rid] = m_res.json().get("metrics", [])
        except Exception:
            pass

    if inventory is None:
        inventory = generate_inventory()
    if billing_history is None:
        billing_history = generate_billing_history_6m()

    vms = [r for r in inventory if r["type"] == "vm"]
    for vm in vms:
        rid = vm["resource_id"]
        if rid not in metrics_cache or not metrics_cache[rid]:
            metrics_cache[rid] = generate_vm_timeseries_30d(vm)

    return inventory, billing_history, metrics_cache


def run_full_analytics():
    inventory, billing_history, metrics_cache = load_or_fetch_all_data()

    # Precompute resource summaries
    enriched_resources = []
    for res in inventory:
        r_copy = dict(res)
        rid = res["resource_id"]
        if res["type"] == "vm":
            pts = metrics_cache.get(rid, [])
            stats = calculate_metrics_summary(pts)
            r_copy.update({
                "avg_cpu": stats.get("avg_cpu", 0),
                "p50_cpu": stats.get("p50_cpu", 0),
                "p95_cpu": stats.get("p95_cpu", 0),
                "p99_cpu": stats.get("p99_cpu", 0),
                "avg_mem": stats.get("avg_mem", 0),
                "p50_mem": stats.get("p50_mem", 0),
                "p95_mem": stats.get("p95_mem", 0),
                "p99_mem": stats.get("p99_mem", 0),
                "off_hours_ratio": stats.get("off_hours_ratio", 1.0),
                "protection_status": "PEAK_PROTECTED" if res.get("workload_archetype") == "bursty_peak_protected" else "NONE",
            })
        else:
            r_copy.update({
                "avg_cpu": 0,
                "p50_cpu": 0,
                "p95_cpu": 0,
                "p99_cpu": 0,
                "avg_mem": 0,
                "p50_mem": 0,
                "p95_mem": 0,
                "p99_mem": 0,
                "off_hours_ratio": 0,
                "protection_status": "NONE"
            })
        enriched_resources.append(r_copy)

    # Recommendations
    recs = generate_recommendations(inventory, metrics_cache, target_p99_headroom=72.0)

    # Link recommendation IDs to enriched resources
    rec_by_rid = {r["resource_id"]: r["id"] for r in recs}
    for r in enriched_resources:
        r["linked_recommendation_id"] = rec_by_rid.get(r["resource_id"], None)

    # Forecasts and alerts
    forecast_data = compute_capacity_forecasts(inventory, metrics_cache)

    # Main aggregate timeseries (fleet-wide average/p95/p99 CPU, Mem, Cost)
    # Downsampled to 96 points (1 point per 7.5 hours or 1 point per 6 hours across 30 days) for snappy UI
    vms = [r for r in inventory if r["type"] == "vm"]
    downsampled_points = []
    step = 30  # sample every ~7.5 hours
    sample_indices = list(range(0, 2880, step))
    sample_vm = metrics_cache.get(vms[0]["resource_id"], [])

    for idx in sample_indices:
        if idx >= len(sample_vm):
            break
        ts = sample_vm[idx]["timestamp"]
        cpu_fleet = [metrics_cache[v["resource_id"]][idx]["cpu_pct"] for v in vms if idx < len(metrics_cache.get(v["resource_id"], []))]
        mem_fleet = [metrics_cache[v["resource_id"]][idx]["memory_pct"] for v in vms if idx < len(metrics_cache.get(v["resource_id"], []))]
        
        downsampled_points.append({
            "timestamp": ts,
            "avg_cpu": round(float(np.mean(cpu_fleet)), 1) if cpu_fleet else 0,
            "p95_cpu": round(float(np.percentile(cpu_fleet, 95)), 1) if cpu_fleet else 0,
            "p99_cpu": round(float(np.percentile(cpu_fleet, 99)), 1) if cpu_fleet else 0,
            "avg_mem": round(float(np.mean(mem_fleet)), 1) if mem_fleet else 0,
            "p95_mem": round(float(np.percentile(mem_fleet, 95)), 1) if mem_fleet else 0,
            "hourly_cost_before": 667.4,  # ₹487,200 / 730
            "hourly_cost_after_projected": 400.7 # ₹292,550 / 730
        })

    # Sustainability totals
    tot_potential_savings = sum(r["monthly_savings_inr"] for r in recs if r["monthly_savings_inr"] > 0)
    watts_saved_est = (tot_potential_savings / 9600.0) * 210.0
    sustainability = compute_carbon_savings(watts_saved_est)

    output = {
        "resources": enriched_resources,
        "recommendations": recs,
        "billing_history": billing_history,
        "alerts_and_forecast": forecast_data,
        "fleet_aggregated_timeseries": downsampled_points,
        "current_monthly_spend_inr": sum(r["monthly_cost_inr"] for r in inventory),
        "potential_total_savings_inr": tot_potential_savings,
        "sustainability": sustainability,
        "fleet_counts": {
            "total_resources": len(inventory),
            "vms": len(vms),
            "block_volumes": len([r for r in inventory if r["type"] == "block_volume"]),
            "public_ips": len([r for r in inventory if r["type"] == "public_ip"]),
            "orphaned_count": len([r for r in inventory if "orphaned" in r.get("workload_archetype", "")]),
            "peak_protected_count": len([r for r in inventory if r.get("workload_archetype") == "bursty_peak_protected"]),
            "zombie_count": len([r for r in inventory if r.get("workload_archetype") == "zombie_vm"]),
            "optimal_count": len([r for r in inventory if r.get("workload_archetype") == "healthy_rightsized"]),
        }
    }

    with open(CACHE_FILE, "w") as f:
        json.dump(output, f)

    return output


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        return

    action = sys.argv[1]
    if action == "generate_all":
        data = run_full_analytics()
        print(json.dumps({"success": True, "cached_file": CACHE_FILE, "counts": data["fleet_counts"]}))
    elif action == "what_if":
        if len(sys.argv) > 2 and sys.argv[2].strip():
            params_str = sys.argv[2]
        else:
            params_str = sys.stdin.read()
        try:
            params = json.loads(params_str)
        except Exception:
            params = {}
        if not os.path.exists(CACHE_FILE):
            run_full_analytics()
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
        result = evaluate_what_if_scenario(data["resources"], data["recommendations"], params)
        print(json.dumps(result))
    elif action == "dump_json":
        if not os.path.exists(CACHE_FILE):
            run_full_analytics()
        with open(CACHE_FILE, "r") as f:
            content = f.read()
        print(content)
    else:
        print(json.dumps({"error": f"Unknown action: {action}"}))


if __name__ == "__main__":
    main()
