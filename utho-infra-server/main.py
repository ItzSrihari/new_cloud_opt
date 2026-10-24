"""
Server 1: Utho Cloud Infrastructure & Telemetry Simulator.
Runs on http://localhost:8001
"""

import os
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from catalog import UTHO_PLANS, BLOCK_VOLUME_PRICE_PER_GB_MONTH, PUBLIC_IP_ATTACHED_MONTH, PUBLIC_IP_UNATTACHED_MONTH
from generator import (
    generate_inventory,
    generate_billing_history_6m,
    generate_vm_timeseries_30d,
    generate_single_tick,
)

# In-memory storage and state
inventory: List[Dict[str, Any]] = []
inventory_map: Dict[str, Dict[str, Any]] = {}
billing_history: List[Dict[str, Any]] = []
vm_metrics_cache: Dict[str, List[Dict[str, Any]]] = {}

# Time-Warp State
simulated_clock = datetime.now(timezone.utc).replace(second=0, microsecond=0)
tick_interval_seconds = 5
is_tick_emitter_running = True
live_anomaly_target: Optional[str] = None
OPTIMIZER_SERVER_URL = os.environ.get("OPTIMIZER_SERVER_URL", "http://localhost:8002")

def initialize_data():
    global inventory, inventory_map, billing_history, vm_metrics_cache
    print("[Utho-Infra-Server] Initializing synthetic cloud dataset...")
    inventory = generate_inventory()
    inventory_map = {r["resource_id"]: r for r in inventory}
    billing_history = generate_billing_history_6m()
    
    # Pre-generate 30-day time-series for all 75 VMs
    vms = [r for r in inventory if r["type"] == "vm"]
    print(f"[Utho-Infra-Server] Generating 30-day (2,880 ticks) metrics for {len(vms)} VMs...")
    for vm in vms:
        rid = vm["resource_id"]
        vm_metrics_cache[rid] = generate_vm_timeseries_30d(vm, end_time=simulated_clock)
    print("[Utho-Infra-Server] Dataset initialization complete!")


async def time_warp_emitter_loop():
    """
    Background worker: advances simulated clock by 15 mins every 5 seconds
    and dispatches the batch of ticks to Server 2.
    """
    global simulated_clock, live_anomaly_target
    async with httpx.AsyncClient(timeout=4.0) as client:
        while True:
            try:
                await asyncio.sleep(tick_interval_seconds)
                if not is_tick_emitter_running:
                    continue

                simulated_clock += timedelta(minutes=15)
                vms = [r for r in inventory if r["type"] == "vm"]
                ticks = []
                
                anomaly_happened = False
                for vm in vms:
                    rid = vm["resource_id"]
                    is_anom = (live_anomaly_target == rid)
                    tick = generate_single_tick(vm, simulated_clock, is_live_anomaly=is_anom)
                    ticks.append(tick)
                    if is_anom:
                        anomaly_happened = True
                        print(f"[Utho-Infra-Server] Injected live anomaly tick on {rid}!")

                if anomaly_happened:
                    # Reset target after firing 1-2 ticks so it registers as an acute anomaly
                    live_anomaly_target = None

                payload = {
                    "simulated_time": simulated_clock.isoformat(),
                    "tick_count": len(ticks),
                    "ticks": ticks,
                    "anomaly_injected": anomaly_happened
                }

                # Push to Server 2
                try:
                    await client.post(f"{OPTIMIZER_SERVER_URL}/api/internal/ingest-tick", json=payload)
                except Exception:
                    # Optimizer server might not be up yet; continue smoothly
                    pass

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Utho-Infra-Server] Emitter loop notice: {e}")
                await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_data()
    emitter_task = asyncio.create_task(time_warp_emitter_loop())
    yield
    emitter_task.cancel()
    try:
        await emitter_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Utho Cloud Infrastructure & Telemetry Simulator",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "utho-infra-server",
        "port": 8001,
        "resources_count": len(inventory),
        "simulated_time": simulated_clock.isoformat()
    }


@app.get("/infra/catalog")
def get_catalog():
    return {
        "plans": UTHO_PLANS,
        "block_volume_inr_per_gb_month": BLOCK_VOLUME_PRICE_PER_GB_MONTH,
        "public_ip_attached_inr_month": PUBLIC_IP_ATTACHED_MONTH,
        "public_ip_unattached_inr_month": PUBLIC_IP_UNATTACHED_MONTH,
        "currency": "INR",
        "pue": 1.38,
        "grid_emission_factor_kg_co2_kwh": 0.71
    }


@app.get("/infra/inventory")
def get_inventory(
    region: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None, alias="type"),
):
    results = inventory
    if region and region.lower() != "all":
        results = [r for r in results if r["region"].lower() == region.lower()]
    if environment and environment.lower() != "all":
        results = [r for r in results if r["environment"].lower() == environment.lower()]
    if team and team.lower() != "all":
        results = [r for r in results if r["team"].lower() == team.lower()]
    if resource_type and resource_type.lower() != "all":
        results = [r for r in results if r["type"].lower() == resource_type.lower()]
    
    return {
        "total": len(results),
        "resources": results
    }


@app.get("/infra/resources/{resource_id}")
def get_resource_by_id(resource_id: str):
    if resource_id not in inventory_map:
        raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
    return inventory_map[resource_id]


@app.get("/infra/metrics")
def get_metrics(resource_id: str = Query(...)):
    if resource_id not in inventory_map:
        raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
    
    resource = inventory_map[resource_id]
    if resource["type"] != "vm":
        # Volumes & IPs have no time-series CPU/RAM metrics
        return {
            "resource_id": resource_id,
            "type": resource["type"],
            "data_points": 0,
            "metrics": []
        }

    metrics = vm_metrics_cache.get(resource_id, [])
    return {
        "resource_id": resource_id,
        "type": "vm",
        "data_points": len(metrics),
        "metrics": metrics
    }


@app.get("/infra/billing-history")
def get_billing_history():
    return {
        "total_months": len(billing_history),
        "history": billing_history,
        "summary": "Cloud bill surged 41.2% over past 6 months due to staging sprawl, unattached volumes, and unconstrained dev uptime."
    }


class AnomalyTriggerRequest(BaseModel):
    target_resource_id: Optional[str] = None


@app.post("/sim/trigger-anomaly")
async def trigger_live_anomaly(req: Optional[AnomalyTriggerRequest] = None):
    global live_anomaly_target
    target_id = req.target_resource_id if req and req.target_resource_id else None
    
    if not target_id:
        # Default to a prominent production VM (e.g., payments checkout or API gateway)
        prod_vms = [r for r in inventory if r["type"] == "vm" and r["environment"] == "prod" and r["workload_archetype"] in ["healthy_rightsized", "bursty_peak_protected"]]
        target_id = prod_vms[0]["resource_id"] if prod_vms else inventory[0]["resource_id"]

    live_anomaly_target = target_id
    target_resource = inventory_map.get(target_id)
    
    # Generate immediate anomaly tick
    now_tick = generate_single_tick(target_resource, simulated_clock + timedelta(minutes=15), is_live_anomaly=True)
    
    # Send direct emergency alert to Server 2
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            await client.post(
                f"{OPTIMIZER_SERVER_URL}/api/internal/ingest-anomaly",
                json={
                    "resource_id": target_id,
                    "resource_name": target_resource.get("name"),
                    "timestamp": now_tick["timestamp"],
                    "cpu_pct": now_tick["cpu_pct"],
                    "net_out_mbps": now_tick["net_out_mbps"],
                    "z_score": 4.62,
                    "message": f"CRITICAL ANOMALY: {target_resource.get('name')} ({target_id}) experienced a 3.8x CPU surge ({now_tick['cpu_pct']}%) and 8x network outbound spike ({now_tick['net_out_mbps']} Mbps)."
                }
            )
        except Exception as e:
            print(f"[Utho-Infra-Server] Could not notify optimizer server directly: {e}")

    return {
        "success": True,
        "target_resource_id": target_id,
        "target_name": target_resource.get("name"),
        "simulated_time": simulated_clock.isoformat(),
        "anomaly_tick": now_tick,
        "message": f"Triggered live anomaly spike on {target_id} ({target_resource.get('name')}). Telemetry streamed."
    }


@app.get("/sim/status")
def get_sim_status():
    return {
        "simulated_time": simulated_clock.isoformat(),
        "tick_interval_seconds": tick_interval_seconds,
        "is_running": is_tick_emitter_running,
        "total_vms_monitored": len([r for r in inventory if r["type"] == "vm"]),
        "active_anomaly_target": live_anomaly_target
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
