from collections import Counter
from datetime import date

import models
from risk_engine import calculate_risk


def get_dashboard_data(db):
    # --------------------------------------------------
    # ESTABLISHMENTS
    # --------------------------------------------------

    establishments = (
        db.query(models.Establishment)
        .filter(models.Establishment.status == "Active")
        .all()
    )

    total_establishments = len(establishments)

    risk_counts = {
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }

    regional_data = {}

    for establishment in establishments:
        risk = calculate_risk(db, establishment.id)

        if risk:
            risk_level = risk["risk_level"]
            risk_counts[risk_level] = (
                risk_counts.get(risk_level, 0) + 1
            )

            region = establishment.region

            if region not in regional_data:
                regional_data[region] = {
                    "region": region,
                    "establishments": 0,
                    "high_risk": 0,
                    "medium_risk": 0,
                    "low_risk": 0,
                    "total_risk": 0
                }

            regional_data[region]["establishments"] += 1
            regional_data[region]["total_risk"] += risk["risk_score"]

            if risk_level == "HIGH":
                regional_data[region]["high_risk"] += 1

            elif risk_level == "MEDIUM":
                regional_data[region]["medium_risk"] += 1

            else:
                regional_data[region]["low_risk"] += 1

    # --------------------------------------------------
    # INSPECTIONS
    # --------------------------------------------------

    inspections = db.query(models.Inspection).all()

    today = date.today()

    upcoming_inspections = 0
    overdue_inspections = 0
    completed_inspections = 0

    inspector_workload = Counter()

    for inspection in inspections:

        if inspection.status.lower() in [
            "completed",
            "submitted",
            "reviewed"
        ]:
            completed_inspections += 1

        if inspection.inspection_date >= today:
            upcoming_inspections += 1

        elif inspection.inspection_date < today and inspection.status.lower() not in [
            "completed",
            "submitted",
            "reviewed"
        ]:
            overdue_inspections += 1

        if inspection.inspector_name:
            inspector_workload[inspection.inspector_name] += 1

    # --------------------------------------------------
    # VIOLATIONS
    # --------------------------------------------------

    violations = db.query(models.Violation).all()

    active_violations = 0
    critical_violations = 0

    category_counter = Counter()

    for violation in violations:

        if violation.status.lower() not in [
            "resolved",
            "closed"
        ]:
            active_violations += 1

        if violation.severity.lower() == "critical":
            critical_violations += 1

        category_counter[violation.category] += 1

    # --------------------------------------------------
    # RECURRING VIOLATIONS
    # --------------------------------------------------

    recurring_categories = []

    for category, count in category_counter.items():

        if count >= 2:
            recurring_categories.append({
                "category": category,
                "count": count
            })

    recurring_categories.sort(
        key=lambda item: item["count"],
        reverse=True
    )

    # --------------------------------------------------
    # REGIONAL RISK DATA
    # --------------------------------------------------

    regions = []

    for region, data in regional_data.items():

        if data["establishments"] > 0:
            average_risk = (
                data["total_risk"]
                / data["establishments"]
            )
        else:
            average_risk = 0

        regions.append({
            "region": region,
            "establishments": data["establishments"],
            "high_risk": data["high_risk"],
            "medium_risk": data["medium_risk"],
            "low_risk": data["low_risk"],
            "average_risk": round(average_risk, 2)
        })

    regions.sort(
        key=lambda item: item["average_risk"],
        reverse=True
    )

    # --------------------------------------------------
    # INSPECTOR WORKLOAD
    # --------------------------------------------------

    workload = []

    for inspector, count in inspector_workload.items():
        workload.append({
            "inspector": inspector,
            "assigned_inspections": count
        })

    workload.sort(
        key=lambda item: item["assigned_inspections"],
        reverse=True
    )

    # --------------------------------------------------
    # RETURN DASHBOARD
    # --------------------------------------------------

    return {
        "summary": {
            "total_establishments": total_establishments,
            "high_risk_establishments": risk_counts["HIGH"],
            "medium_risk_establishments": risk_counts["MEDIUM"],
            "low_risk_establishments": risk_counts["LOW"],
            "upcoming_inspections": upcoming_inspections,
            "overdue_inspections": overdue_inspections,
            "active_violations": active_violations,
            "critical_violations": critical_violations
        },

        "risk_distribution": [
            {
                "risk_level": "HIGH",
                "count": risk_counts["HIGH"]
            },
            {
                "risk_level": "MEDIUM",
                "count": risk_counts["MEDIUM"]
            },
            {
                "risk_level": "LOW",
                "count": risk_counts["LOW"]
            }
        ],

        "recurring_violations": recurring_categories,

        "inspector_workload": workload,

        "regional_risk": regions
    }