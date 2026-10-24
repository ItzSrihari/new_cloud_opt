"""
Utho Cloud Pricing Catalog & Infrastructure Constants.
All monetary amounts are in INR (Indian Rupee, ₹).
"""

from typing import Dict, Any, Optional

HOURS_PER_MONTH = 730
PUE = 1.38  # Indian Datacenter Power Usage Effectiveness
CEA_GRID_EMISSION_FACTOR = 0.71  # kg CO2e / kWh (India CEA baseline)

UTHO_PLANS: Dict[str, Dict[str, Any]] = {
    "utho.nano": {
        "plan_id": "utho.nano",
        "tier_name": "Nano Cloud",
        "vcpu": 1,
        "ram_gb": 1,
        "disk_included_gb": 25,
        "hourly_cost_inr": 0.41,
        "monthly_cost_inr": 300,
        "watts": 12,
    },
    "utho.micro": {
        "plan_id": "utho.micro",
        "tier_name": "Micro Cloud",
        "vcpu": 1,
        "ram_gb": 2,
        "disk_included_gb": 40,
        "hourly_cost_inr": 0.82,
        "monthly_cost_inr": 600,
        "watts": 18,
    },
    "utho.small": {
        "plan_id": "utho.small",
        "tier_name": "Small Cloud",
        "vcpu": 2,
        "ram_gb": 4,
        "disk_included_gb": 80,
        "hourly_cost_inr": 1.64,
        "monthly_cost_inr": 1200,
        "watts": 32,
    },
    "utho.medium": {
        "plan_id": "utho.medium",
        "tier_name": "Medium Cloud",
        "vcpu": 4,
        "ram_gb": 8,
        "disk_included_gb": 160,
        "hourly_cost_inr": 3.29,
        "monthly_cost_inr": 2400,
        "watts": 58,
    },
    "utho.large": {
        "plan_id": "utho.large",
        "tier_name": "Large Cloud",
        "vcpu": 8,
        "ram_gb": 16,
        "disk_included_gb": 320,
        "hourly_cost_inr": 6.58,
        "monthly_cost_inr": 4800,
        "watts": 110,
    },
    "utho.xlarge": {
        "plan_id": "utho.xlarge",
        "tier_name": "XLarge Cloud",
        "vcpu": 16,
        "ram_gb": 32,
        "disk_included_gb": 640,
        "hourly_cost_inr": 13.15,
        "monthly_cost_inr": 9600,
        "watts": 210,
    },
    "utho.2xlarge": {
        "plan_id": "utho.2xlarge",
        "tier_name": "2XLarge Cloud",
        "vcpu": 32,
        "ram_gb": 64,
        "disk_included_gb": 1280,
        "hourly_cost_inr": 26.30,
        "monthly_cost_inr": 19200,
        "watts": 400,
    },
}

BLOCK_VOLUME_PRICE_PER_GB_MONTH = 8.0  # INR/GB/month
PUBLIC_IP_ATTACHED_MONTH = 250.0       # INR/month
PUBLIC_IP_UNATTACHED_MONTH = 350.0     # INR/month (includes INR 100 hoarding fee)

REGIONS = ["Noida", "Bangalore", "Mumbai"]
ENVIRONMENTS = ["prod", "staging", "dev"]
TEAMS = ["Payments", "Core-API", "Data-Platform", "Growth-Frontend", "QA-Automation"]

# Ordered list of plans from smallest to largest
PLAN_ORDER = [
    "utho.nano",
    "utho.micro",
    "utho.small",
    "utho.medium",
    "utho.large",
    "utho.xlarge",
    "utho.2xlarge"
]

def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    return UTHO_PLANS.get(plan_id)

def get_smaller_plans(current_plan_id: str):
    if current_plan_id not in PLAN_ORDER:
        return []
    idx = PLAN_ORDER.index(current_plan_id)
    return [UTHO_PLANS[p] for p in PLAN_ORDER[:idx]]
