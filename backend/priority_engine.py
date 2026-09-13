from datetime import date
from sqlalchemy.orm import Session

import models
from risk_engine import calculate_risk


def calculate_priority(db: Session, establishment_id: int):
    """
    Calculate inspection priority for one establishment.

    Higher priority = should be inspected sooner.
    """

    establishment = (
        db.query(models.Establishment)
        .filter(models.Establishment.id == establishment_id)
        .first()
    )

    if not establishment:
        return None

    risk = calculate_risk(db, establishment_id)

    if not risk:
        return None

    priority_score = risk["risk_score"]
    reasons = []

    # --------------------------------------------------
    # 1. RISK SCORE
    # --------------------------------------------------

    if risk["risk_score"] >= 70:
        reasons.append("High overall risk")

    elif risk["risk_score"] >= 40:
        reasons.append("Medium overall risk")

    # --------------------------------------------------
    # 2. CRITICAL VIOLATIONS
    # --------------------------------------------------

    critical = risk["critical_violations"]

    if critical > 0:
        priority_score += min(critical * 5, 15)
        reasons.append(f"{critical} critical violation(s)")

    # --------------------------------------------------
    # 3. UNRESOLVED VIOLATIONS
    # --------------------------------------------------

    unresolved = risk["unresolved_violations"]

    if unresolved > 0:
        priority_score += min(unresolved * 5, 15)
        reasons.append(f"{unresolved} unresolved violation(s)")

    # --------------------------------------------------
    # 4. RECURRING VIOLATIONS
    # --------------------------------------------------

    recurring = len(risk["recurring_categories"])

    if recurring > 0:
        priority_score += min(recurring * 5, 10)
        reasons.append(f"{recurring} recurring issue category(s)")

    # --------------------------------------------------
    # 5. TIME SINCE LAST INSPECTION
    # --------------------------------------------------

    days_since = risk["days_since_last_inspection"]

    if days_since is None:
        priority_score += 15
        reasons.append("No previous inspection recorded")

    elif days_since > 365:
        priority_score += 15
        reasons.append("Inspection overdue by more than one year")

    elif days_since > 180:
        priority_score += 10
        reasons.append("More than 180 days since last inspection")

    elif days_since > 90:
        priority_score += 5
        reasons.append("More than 90 days since last inspection")

    # --------------------------------------------------
    # 6. CAP SCORE
    # --------------------------------------------------

    priority_score = min(priority_score, 100)

    # --------------------------------------------------
    # PRIORITY LEVEL
    # --------------------------------------------------

    if priority_score >= 70:
        priority_level = "URGENT"

    elif priority_score >= 50:
        priority_level = "HIGH"

    elif priority_score >= 30:
        priority_level = "MEDIUM"

    else:
        priority_level = "LOW"

    if not reasons:
        reasons.append("No immediate priority factors detected")

    return {
        "establishment_id": establishment_id,
        "establishment_name": establishment.name,
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "priority_score": round(float(priority_score), 2),
        "priority_level": priority_level,
        "reasons": reasons
    }


def get_inspection_priority_list(db: Session):
    """
    Calculate priority for all establishments
    and return them from highest to lowest priority.
    """

    establishments = (
        db.query(models.Establishment)
        .filter(models.Establishment.status == "Active")
        .all()
    )

    results = []

    for establishment in establishments:
        priority = calculate_priority(
            db,
            establishment.id
        )

        if priority:
            results.append(priority)

    results.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    # Add ranking
    for index, item in enumerate(results, start=1):
        item["rank"] = index

    return results