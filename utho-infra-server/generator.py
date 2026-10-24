"""
Reproducible Infrastructure and Telemetry Generator for Utho Cloud Simulator.
Generates 105 resources, 6-month billing history, and 30-day 15-minute time-series metrics.
"""

import os
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from catalog import (
    UTHO_PLANS,
    BLOCK_VOLUME_PRICE_PER_GB_MONTH,
    PUBLIC_IP_ATTACHED_MONTH,
    PUBLIC_IP_UNATTACHED_MONTH,
    REGIONS,
    ENVIRONMENTS,
    TEAMS,
)

np.random.seed(42)

def generate_inventory() -> List[Dict[str, Any]]:
    np.random.seed(42)
    resources: List[Dict[str, Any]] = []

    # Target counts:
    # 75 VMs:
    #   22 overprovisioned_steady
    #   12 bursty_peak_protected
    #   16 dev_off_hours_waste
    #   8 batch_job_idle
    #   6 zombie_vm
    #   6 healthy_rightsized
    #   3 capacity_creeper
    #   2 genuine_anomaly
    # 18 Block Volumes (12 unattached, 6 attached)
    # 12 Public IPs (8 unattached, 4 attached)
    
    # Regional probabilities: Noida ~40%, Bangalore ~35%, Mumbai ~25%
    def pick_region(idx: int) -> str:
        mod = idx % 20
        if mod < 8:
            return "Noida"
        elif mod < 15:
            return "Bangalore"
        return "Mumbai"

    # 1. overprovisioned_steady (22 VMs)
    # Plans: utho.large, utho.xlarge, utho.2xlarge
    overprov_plans = ["utho.xlarge", "utho.large", "utho.2xlarge", "utho.large", "utho.xlarge"]
    for i in range(22):
        reg = pick_region(i)
        env = "prod" if i % 2 == 0 else ("staging" if i % 4 == 1 else "dev")
        team = TEAMS[i % len(TEAMS)]
        plan_id = overprov_plans[i % len(overprov_plans)]
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-{env}-ovp-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"{team.lower()}-svc-{env}-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=90 + i*3)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "overprovisioned_steady",
            "status": "Oversized"
        })

    # 2. bursty_peak_protected (12 VMs)
    # Critical judging trap: Low average (11-15%), but daily peak 19:00-20:00 reaches 84-93% (P99 >= 85%)
    # Plans: utho.xlarge, utho.large
    for i in range(12):
        reg = pick_region(i + 22)
        env = "prod"  # usually critical production core services
        team = "Payments" if i % 2 == 0 else "Core-API"
        plan_id = "utho.xlarge" if i % 3 != 0 else "utho.large"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-prod-pkp-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"{team.lower()}-checkout-settle-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=120 + i*4)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "bursty_peak_protected",
            "status": "Peak Protected"
        })

    # 3. dev_off_hours_waste (16 VMs)
    # in dev and staging: active M-F 9am-8pm, idle at night & weekends
    for i in range(16):
        reg = pick_region(i + 34)
        env = "dev" if i % 2 == 0 else "staging"
        team = TEAMS[(i + 1) % len(TEAMS)]
        plan_id = "utho.large" if i % 2 == 0 else "utho.medium"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-{env}-off-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"{team.lower()}-testbench-{env}-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=60 + i*2)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "dev_off_hours_waste",
            "status": "Off-Hours Waste"
        })

    # 4. batch_job_idle (8 VMs)
    # runs nightly ETL from 01:00 to 04:00 IST (CPU 75-90%), idle remaining 21h
    for i in range(8):
        reg = pick_region(i + 50)
        env = "prod" if i % 2 == 0 else "staging"
        team = "Data-Platform"
        plan_id = "utho.xlarge" if i % 2 == 0 else "utho.large"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-{env}-batch-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"data-etl-nightly-{env}-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=100 + i*5)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "batch_job_idle",
            "status": "Batch Inefficiency"
        })

    # 5. zombie_vm (6 VMs)
    # staging/dev leftovers, CPU < 1.8%, mem < 12% for 30d
    for i in range(6):
        reg = pick_region(i + 58)
        env = "staging" if i % 2 == 0 else "dev"
        team = "QA-Automation" if i % 2 == 0 else "Growth-Frontend"
        plan_id = "utho.medium" if i % 2 == 0 else "utho.large"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-{env}-zombie-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"legacy-experiment-{env}-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=150 + i*10)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "zombie_vm",
            "status": "Zombie / Idle"
        })

    # 6. healthy_rightsized (6 VMs)
    # P50 ~ 45%, P99 ~ 72%, optimal
    for i in range(6):
        reg = pick_region(i + 64)
        env = "prod"
        team = "Core-API" if i % 2 == 0 else "Payments"
        plan_id = "utho.medium" if i % 2 == 0 else "utho.large"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-prod-opt-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"api-gateway-mesh-{env}-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=200 + i*10)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "healthy_rightsized",
            "status": "Optimal"
        })

    # 7. capacity_creeper (3 VMs)
    # Mem/CPU creeps +1.6%/day, currently at 89%
    for i in range(3):
        reg = pick_region(i + 70)
        env = "prod"
        team = "Core-API"
        plan_id = "utho.medium"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-prod-creep-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"session-cache-node-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "capacity_creeper",
            "status": "Capacity Creep"
        })

    # 8. genuine_anomaly (2 VMs)
    # baseline 25%, last 6h surges to 94% CPU, 140 Mbps net out
    for i in range(2):
        reg = pick_region(i + 73)
        env = "prod"
        team = "Payments" if i == 0 else "Growth-Frontend"
        plan_id = "utho.large"
        p = UTHO_PLANS[plan_id]
        rid = f"vm-{reg.lower()[:3]}-prod-anom-{i+1:02d}"
        resources.append({
            "resource_id": rid,
            "name": f"event-streamer-live-{i+1:02d}",
            "type": "vm",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": plan_id,
            "vcpu": p["vcpu"],
            "ram_gb": p["ram_gb"],
            "disk_gb": p["disk_included_gb"],
            "monthly_cost_inr": p["monthly_cost_inr"],
            "hourly_cost_inr": p["hourly_cost_inr"],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=70)).isoformat(),
            "attached_to": None,
            "days_unattached": 0,
            "workload_archetype": "genuine_anomaly",
            "status": "Critical Anomaly"
        })

    # Verify total VMs is 75
    assert len(resources) == 75, f"Expected 75 VMs, got {len(resources)}"

    # 9. 18 Block Volumes (12 unattached, 6 attached)
    # 8 INR / GB / month
    # Unattached volumes: 200 GB to 2000 GB, days_unattached 18 to 95
    volume_sizes = [250, 500, 1000, 2000, 400, 800, 1500, 300, 600, 1200, 500, 1000, 200, 400, 500, 800, 1000, 1500]
    for i in range(18):
        reg = pick_region(i)
        is_orphaned = i < 12
        env = "prod" if i % 3 == 0 else ("staging" if i % 3 == 1 else "dev")
        team = "Data-Platform" if i < 8 else TEAMS[i % len(TEAMS)]
        size_gb = volume_sizes[i]
        cost_inr = size_gb * BLOCK_VOLUME_PRICE_PER_GB_MONTH
        rid = f"vol-{reg.lower()[:3]}-{i+1:02d}"
        attached_vm = None if is_orphaned else resources[i]["resource_id"]
        days_unattached = int(18 + (i * 7)) if is_orphaned else 0
        resources.append({
            "resource_id": rid,
            "name": f"nvme-vol-{team.lower()}-{size_gb}g-{i+1:02d}",
            "type": "block_volume",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": "utho.storage.nvme",
            "vcpu": 0,
            "ram_gb": 0,
            "disk_gb": size_gb,
            "monthly_cost_inr": cost_inr,
            "hourly_cost_inr": round(cost_inr / 730, 2),
            "created_at": (datetime.now(timezone.utc) - timedelta(days=days_unattached + 30)).isoformat(),
            "attached_to": attached_vm,
            "days_unattached": days_unattached,
            "workload_archetype": "orphaned_volume" if is_orphaned else "active_volume",
            "status": "Orphaned Resource" if is_orphaned else "Attached"
        })

    # 10. 12 Public IPs (8 unattached, 4 attached)
    # 250 attached, 350 unattached (hoarding fee)
    for i in range(12):
        reg = pick_region(i + 5)
        is_orphaned = i < 8
        env = "prod" if i < 4 else ("staging" if i < 8 else "dev")
        team = TEAMS[i % len(TEAMS)]
        cost_inr = PUBLIC_IP_UNATTACHED_MONTH if is_orphaned else PUBLIC_IP_ATTACHED_MONTH
        rid = f"ip-{reg.lower()[:3]}-{i+1:02d}"
        attached_vm = None if is_orphaned else resources[i]["resource_id"]
        days_unattached = int(22 + (i * 6)) if is_orphaned else 0
        ip_oct = 103 + (i * 3)
        resources.append({
            "resource_id": rid,
            "name": f"elastic-ip-{ip_oct}.84.{12+i}.{100+i}",
            "type": "public_ip",
            "region": reg,
            "environment": env,
            "team": team,
            "plan_id": "utho.network.public_ip",
            "vcpu": 0,
            "ram_gb": 0,
            "disk_gb": 0,
            "monthly_cost_inr": cost_inr,
            "hourly_cost_inr": round(cost_inr / 730, 2),
            "created_at": (datetime.now(timezone.utc) - timedelta(days=days_unattached + 40)).isoformat(),
            "attached_to": attached_vm,
            "days_unattached": days_unattached,
            "workload_archetype": "orphaned_ip" if is_orphaned else "active_ip",
            "status": "Orphaned Resource" if is_orphaned else "Attached"
        })

    # Verify total is 105
    assert len(resources) == 105, f"Expected 105 total resources, got {len(resources)}"
    return resources


def generate_billing_history_6m() -> List[Dict[str, Any]]:
    """
    Generate 6-month historical billing ledger (Month -5 to Month 0 / Current Month).
    Demonstrates total bill growing by 41.2% from ₹3,45,000 to ₹4,87,200.
    With root cause annotations.
    """
    months = [
        {"month_offset": -5, "month_label": "May 2026", "total_inr": 345000, "prod": 210000, "staging": 85000, "dev": 50000, "notes": "Baseline stable infrastructure spend"},
        {"month_offset": -4, "month_label": "Jun 2026", "total_inr": 349800, "prod": 212800, "staging": 86000, "dev": 51000, "notes": "Slight organic user growth"},
        {"month_offset": -3, "month_label": "Jul 2026", "total_inr": 397800, "prod": 213500, "staging": 134000, "dev": 50300, "notes": "New staging cluster provisioned on utho.xlarge for load testing (+₹48,000/mo) and never scaled down"},
        {"month_offset": -2, "month_label": "Aug 2026", "total_inr": 464600, "prod": 242000, "staging": 162000, "dev": 60600, "notes": "Data-Platform migration left 8 TB unattached block volumes and 8 orphaned IPs (+₹66,800/mo)"},
        {"month_offset": -1, "month_label": "Sep 2026", "total_inr": 492000, "prod": 251000, "staging": 159000, "dev": 82000, "notes": "Dev environments switched to 24x7 uptime during release crunch (+₹27,400/mo)"},
        {"month_offset": 0,  "month_label": "Oct 2026", "total_inr": 487200, "prod": 248000, "staging": 158200, "dev": 81000, "notes": "Current billing cycle (+41.2% growth over 6 months)"},
    ]
    return months


def generate_vm_timeseries_30d(vm_resource: Dict[str, Any], end_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """
    Generates 30 days of 15-minute intervals (2,880 points) for a given VM based on its archetype.
    Uses numpy vectorized operations for sub-second generation.
    """
    if end_time is None:
        end_time = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    
    n_points = 2880  # 30 days * 24h * 4 ticks/hr
    dt_indices = pd.date_range(end=end_time, periods=n_points, freq="15min")
    
    archetype = vm_resource.get("workload_archetype", "healthy_rightsized")
    
    # Base arrays
    cpu = np.zeros(n_points, dtype=np.float32)
    mem = np.zeros(n_points, dtype=np.float32)
    disk = np.zeros(n_points, dtype=np.float32)
    iops = np.zeros(n_points, dtype=np.float32)
    net_in = np.zeros(n_points, dtype=np.float32)
    net_out = np.zeros(n_points, dtype=np.float32)

    # Derive hours in IST (UTC + 5:30)
    ist_hours = (dt_indices.hour + (dt_indices.minute / 60.0) + 5.5) % 24
    day_of_week = dt_indices.dayofweek  # 0=Monday, 5=Saturday, 6=Sunday

    if archetype == "overprovisioned_steady":
        # CPU & RAM steady 8% to 22%, P99 <= 28%
        cpu = np.random.normal(loc=13.5, scale=2.8, size=n_points)
        cpu = np.clip(cpu, 8.0, 24.0)
        mem = np.random.normal(loc=16.0, scale=2.0, size=n_points)
        mem = np.clip(mem, 11.0, 22.0)
        disk = np.random.normal(loc=32.0, scale=1.0, size=n_points)
        iops = np.random.uniform(120, 280, size=n_points)
        net_in = np.random.uniform(5.0, 18.0, size=n_points)
        net_out = np.random.uniform(8.0, 22.0, size=n_points)

    elif archetype == "bursty_peak_protected":
        # Average is low (11-15%), but daily peak 19:00 - 20:00 IST surges to 85-93% (P99 >= 85%)
        # Base
        cpu = np.random.normal(loc=12.5, scale=2.0, size=n_points)
        cpu = np.clip(cpu, 8.0, 18.0)
        mem = np.random.normal(loc=32.0, scale=3.0, size=n_points)
        mem = np.clip(mem, 25.0, 40.0)
        net_in = np.random.uniform(8.0, 22.0, size=n_points)
        net_out = np.random.uniform(10.0, 25.0, size=n_points)
        iops = np.random.uniform(150, 350, size=n_points)
        disk = np.random.normal(loc=48.0, scale=0.5, size=n_points)

        # Inject daily peak between 19.0 and 20.2 IST
        peak_mask = (ist_hours >= 19.0) & (ist_hours <= 20.2)
        n_peak = np.sum(peak_mask)
        cpu[peak_mask] = np.random.uniform(86.0, 93.5, size=n_peak)
        mem[peak_mask] = np.random.uniform(72.0, 81.0, size=n_peak)
        net_out[peak_mask] = np.random.uniform(160.0, 240.0, size=n_peak)
        iops[peak_mask] = np.random.uniform(1800, 3200, size=n_peak)

    elif archetype == "dev_off_hours_waste":
        # Mon-Fri 09:00 - 20:00 IST: CPU 35-65%
        # Weeknights & Sat/Sun: idle < 2.5%, Net < 0.2 Mbps
        is_weekend = (day_of_week >= 5)
        is_work_hours = (ist_hours >= 9.0) & (ist_hours <= 20.0) & (~is_weekend)

        # Active
        cpu[is_work_hours] = np.random.uniform(38.0, 62.0, size=np.sum(is_work_hours))
        mem[is_work_hours] = np.random.uniform(42.0, 58.0, size=np.sum(is_work_hours))
        net_in[is_work_hours] = np.random.uniform(12.0, 35.0, size=np.sum(is_work_hours))
        net_out[is_work_hours] = np.random.uniform(15.0, 42.0, size=np.sum(is_work_hours))
        iops[is_work_hours] = np.random.uniform(400, 950, size=np.sum(is_work_hours))

        # Off-hours
        off_mask = ~is_work_hours
        n_off = np.sum(off_mask)
        cpu[off_mask] = np.random.uniform(0.8, 2.2, size=n_off)
        mem[off_mask] = np.random.uniform(10.0, 14.0, size=n_off)
        net_in[off_mask] = np.random.uniform(0.01, 0.15, size=n_off)
        net_out[off_mask] = np.random.uniform(0.01, 0.18, size=n_off)
        iops[off_mask] = np.random.uniform(10, 35, size=n_off)
        disk[:] = np.random.normal(loc=26.0, scale=0.4, size=n_points)

    elif archetype == "batch_job_idle":
        # Runs 01:00 - 04:00 IST (CPU 75-90%), idle remaining 21h (CPU < 2%)
        batch_mask = (ist_hours >= 1.0) & (ist_hours <= 4.0)
        n_batch = np.sum(batch_mask)
        cpu[batch_mask] = np.random.uniform(76.0, 89.0, size=n_batch)
        mem[batch_mask] = np.random.uniform(70.0, 84.0, size=n_batch)
        iops[batch_mask] = np.random.uniform(1600, 3400, size=n_batch)
        net_in[batch_mask] = np.random.uniform(50.0, 120.0, size=n_batch)
        net_out[batch_mask] = np.random.uniform(40.0, 95.0, size=n_batch)

        idle_mask = ~batch_mask
        n_idle = np.sum(idle_mask)
        cpu[idle_mask] = np.random.uniform(0.6, 1.8, size=n_idle)
        mem[idle_mask] = np.random.uniform(8.0, 12.0, size=n_idle)
        iops[idle_mask] = np.random.uniform(15, 45, size=n_idle)
        net_in[idle_mask] = np.random.uniform(0.02, 0.3, size=n_idle)
        net_out[idle_mask] = np.random.uniform(0.02, 0.3, size=n_idle)
        disk[:] = np.random.normal(loc=55.0, scale=0.8, size=n_points)

    elif archetype == "zombie_vm":
        # Idle all 30 days: CPU < 1.8%, mem < 12%, net < 0.05
        cpu = np.random.uniform(0.5, 1.6, size=n_points)
        mem = np.random.uniform(7.0, 11.5, size=n_points)
        disk = np.random.normal(loc=19.0, scale=0.2, size=n_points)
        iops = np.random.uniform(8, 22, size=n_points)
        net_in = np.random.uniform(0.005, 0.04, size=n_points)
        net_out = np.random.uniform(0.005, 0.04, size=n_points)

    elif archetype == "healthy_rightsized":
        # Well-tuned: P50 ~ 45%, P99 ~ 72%
        cpu = np.random.normal(loc=46.0, scale=8.5, size=n_points)
        cpu = np.clip(cpu, 25.0, 74.0)
        mem = np.random.normal(loc=58.0, scale=5.0, size=n_points)
        mem = np.clip(mem, 45.0, 72.0)
        disk = np.random.normal(loc=60.0, scale=1.0, size=n_points)
        iops = np.random.uniform(400, 1100, size=n_points)
        net_in = np.random.uniform(20.0, 70.0, size=n_points)
        net_out = np.random.uniform(25.0, 85.0, size=n_points)

    elif archetype == "capacity_creeper":
        # Memory/CPU creep +1.57% per day (starting at 42%, now at 89%)
        days_axis = np.linspace(0, 30, n_points)
        trend = 42.0 + (1.566 * days_axis)
        noise = np.random.normal(loc=0.0, scale=2.0, size=n_points)
        mem = np.clip(trend + noise, 38.0, 96.0)
        cpu = np.clip(trend * 0.85 + noise, 32.0, 88.0)
        disk = np.clip(50.0 + (days_axis * 0.9), 50.0, 80.0)
        iops = np.random.uniform(300, 700, size=n_points)
        net_in = np.random.uniform(15.0, 45.0, size=n_points)
        net_out = np.random.uniform(18.0, 50.0, size=n_points)

    elif archetype == "genuine_anomaly":
        # First 29.75 days: steady CPU ~ 25%, net out ~ 15 Mbps
        # Last 6 hours (24 ticks): surge to 94% CPU, 140 Mbps net out
        cpu = np.random.normal(loc=25.0, scale=3.0, size=n_points)
        cpu = np.clip(cpu, 18.0, 33.0)
        mem = np.random.normal(loc=30.0, scale=2.5, size=n_points)
        net_out = np.random.normal(loc=15.0, scale=2.5, size=n_points)
        net_in = np.random.normal(loc=10.0, scale=1.8, size=n_points)
        iops = np.random.uniform(150, 350, size=n_points)
        disk = np.random.normal(loc=44.0, scale=0.5, size=n_points)

        # Anomaly window (last 24 points = 6 hours)
        anomaly_slice = slice(-24, None)
        cpu[anomaly_slice] = np.random.uniform(91.0, 96.5, size=24)
        mem[anomaly_slice] = np.random.uniform(78.0, 88.0, size=24)
        net_out[anomaly_slice] = np.random.uniform(130.0, 155.0, size=24)
        iops[anomaly_slice] = np.random.uniform(2500, 4200, size=24)

    # Format list of dictionaries
    records: List[Dict[str, Any]] = []
    for i in range(n_points):
        records.append({
            "timestamp": dt_indices[i].isoformat(),
            "cpu_pct": round(float(cpu[i]), 1),
            "memory_pct": round(float(mem[i]), 1),
            "disk_used_pct": round(float(disk[i]), 1),
            "disk_iops": int(iops[i]),
            "net_in_mbps": round(float(net_in[i]), 2),
            "net_out_mbps": round(float(net_out[i]), 2),
        })
    return records


def generate_single_tick(vm_resource: Dict[str, Any], sim_time: datetime, is_live_anomaly: bool = False) -> Dict[str, Any]:
    """
    Generate next 15-minute telemetry point for a VM based on simulated clock.
    """
    archetype = vm_resource.get("workload_archetype", "healthy_rightsized")
    ist_hour = (sim_time.hour + (sim_time.minute / 60.0) + 5.5) % 24
    day_of_week = sim_time.weekday()

    if is_live_anomaly:
        return {
            "resource_id": vm_resource["resource_id"],
            "timestamp": sim_time.isoformat(),
            "cpu_pct": round(float(np.random.uniform(93.0, 97.5)), 1),
            "memory_pct": round(float(np.random.uniform(84.0, 92.0)), 1),
            "disk_used_pct": 52.0,
            "disk_iops": int(np.random.uniform(3200, 4800)),
            "net_in_mbps": round(float(np.random.uniform(80.0, 120.0)), 2),
            "net_out_mbps": round(float(np.random.uniform(135.0, 165.0)), 2),
            "is_anomaly": True
        }

    if archetype == "overprovisioned_steady":
        cpu = np.clip(np.random.normal(13.5, 2.8), 8.0, 24.0)
        mem = np.clip(np.random.normal(16.0, 2.0), 11.0, 22.0)
        net_out = np.random.uniform(8.0, 22.0)
    elif archetype == "bursty_peak_protected":
        if 19.0 <= ist_hour <= 20.2:
            cpu = np.random.uniform(86.0, 93.5)
            mem = np.random.uniform(72.0, 81.0)
            net_out = np.random.uniform(160.0, 240.0)
        else:
            cpu = np.clip(np.random.normal(12.5, 2.0), 8.0, 18.0)
            mem = np.clip(np.random.normal(32.0, 3.0), 25.0, 40.0)
            net_out = np.random.uniform(10.0, 25.0)
    elif archetype == "dev_off_hours_waste":
        is_weekend = (day_of_week >= 5)
        if 9.0 <= ist_hour <= 20.0 and not is_weekend:
            cpu = np.random.uniform(38.0, 62.0)
            mem = np.random.uniform(42.0, 58.0)
            net_out = np.random.uniform(15.0, 42.0)
        else:
            cpu = np.random.uniform(0.8, 2.2)
            mem = np.random.uniform(10.0, 14.0)
            net_out = np.random.uniform(0.01, 0.18)
    elif archetype == "batch_job_idle":
        if 1.0 <= ist_hour <= 4.0:
            cpu = np.random.uniform(76.0, 89.0)
            mem = np.random.uniform(70.0, 84.0)
            net_out = np.random.uniform(40.0, 95.0)
        else:
            cpu = np.random.uniform(0.6, 1.8)
            mem = np.random.uniform(8.0, 12.0)
            net_out = np.random.uniform(0.02, 0.3)
    elif archetype == "zombie_vm":
        cpu = np.random.uniform(0.5, 1.6)
        mem = np.random.uniform(7.0, 11.5)
        net_out = np.random.uniform(0.005, 0.04)
    elif archetype == "capacity_creeper":
        cpu = np.random.uniform(86.0, 91.0)
        mem = np.random.uniform(89.0, 93.0)
        net_out = np.random.uniform(25.0, 55.0)
    elif archetype == "genuine_anomaly":
        cpu = np.random.uniform(92.0, 96.0)
        mem = np.random.uniform(80.0, 88.0)
        net_out = np.random.uniform(130.0, 150.0)
    else:  # healthy_rightsized
        cpu = np.clip(np.random.normal(46.0, 8.5), 25.0, 74.0)
        mem = np.clip(np.random.normal(58.0, 5.0), 45.0, 72.0)
        net_out = np.random.uniform(25.0, 85.0)

    return {
        "resource_id": vm_resource["resource_id"],
        "timestamp": sim_time.isoformat(),
        "cpu_pct": round(float(cpu), 1),
        "memory_pct": round(float(mem), 1),
        "disk_used_pct": 45.0,
        "disk_iops": int(np.random.uniform(150, 450)),
        "net_in_mbps": round(float(np.random.uniform(5.0, 25.0)), 2),
        "net_out_mbps": round(float(net_out), 2),
        "is_anomaly": False
    }
