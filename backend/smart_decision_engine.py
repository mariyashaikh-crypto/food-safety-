from datetime import date
from sqlalchemy.orm import Session

import models
from ml_risk_engine import predict_ml_risk


def calculate_smart_decision(
    db: Session,
    establishment_id: int
):
    establishment = (
        db.query(models.Establishment)
        .filter(
            models.Establishment.id == establishment_id
        )
        .first()
    )

    if not establishment:
        return None

    # -------------------------------------------------
    # Get violations
    # -------------------------------------------------

    violations = (
        db.query(models.Violation)
        .filter(
            models.Violation.establishment_id
            == establishment_id
        )
        .all()
    )

    total_violations = len(violations)

    critical_count = sum(
        1
        for v in violations
        if v.severity.lower() == "critical"
    )

    high_count = sum(
        1
        for v in violations
        if v.severity.lower() == "high"
    )

    unresolved_statuses = {
        "open",
        "corrective action required",
        "under review",
        "re-inspection required"
    }

    unresolved_count = sum(
        1
        for v in violations
        if v.status.lower() in unresolved_statuses
    )

    # -------------------------------------------------
    # Recurring categories
    # -------------------------------------------------

    category_counts = {}

    for violation in violations:
        category = violation.category.lower()

        category_counts[category] = (
            category_counts.get(category, 0) + 1
        )

    recurring_categories = [
        category
        for category, count in category_counts.items()
        if count >= 2
    ]

    recurring_count = len(recurring_categories)

    # -------------------------------------------------
    # Days since inspection
    # -------------------------------------------------

    days_since_inspection = None

    if establishment.last_inspection_date:
        days_since_inspection = max(
            0,
            (
                date.today()
                - establishment.last_inspection_date
            ).days
        )

    # -------------------------------------------------
    # Calculate priority score
    # -------------------------------------------------

    priority_score = 0
    priority_reasons = []

    # Current risk
    current_risk = float(
        establishment.risk_score or 0
    )

    if current_risk >= 70:
        priority_score += 40
        priority_reasons.append(
            "Current risk level is HIGH"
        )

    elif current_risk >= 40:
        priority_score += 25
        priority_reasons.append(
            "Current risk level is MEDIUM"
        )

    else:
        priority_score += 10

    # Critical violations
    if critical_count > 0:
        priority_score += min(
            critical_count * 15,
            30
        )

        priority_reasons.append(
            f"{critical_count} critical violation(s)"
        )

    # Unresolved violations
    if unresolved_count > 0:
        priority_score += min(
            unresolved_count * 8,
            20
        )

        priority_reasons.append(
            f"{unresolved_count} unresolved violation(s)"
        )

    # Recurring violations
    if recurring_count > 0:
        priority_score += min(
            recurring_count * 8,
            16
        )

        priority_reasons.append(
            f"{recurring_count} recurring violation category/categories"
        )

    # Inspection overdue
    if days_since_inspection is not None:

        if days_since_inspection > 365:
            priority_score += 20
            priority_reasons.append(
                "Inspection overdue by more than one year"
            )

        elif days_since_inspection > 180:
            priority_score += 12
            priority_reasons.append(
                "More than 180 days since last inspection"
            )

        elif days_since_inspection > 90:
            priority_score += 6
            priority_reasons.append(
                "More than 90 days since last inspection"
            )

    priority_score = min(
        priority_score,
        100
    )

    # -------------------------------------------------
    # Priority level
    # -------------------------------------------------

    if priority_score >= 70:
        priority_level = "URGENT"

    elif priority_score >= 50:
        priority_level = "HIGH"

    elif priority_score >= 30:
        priority_level = "MEDIUM"

    else:
        priority_level = "LOW"

    # -------------------------------------------------
    # ML prediction
    # -------------------------------------------------

    ml_result = predict_ml_risk(
        db,
        establishment_id
    )

    ml_probability = None
    ml_risk_level = None

    if ml_result and "error" not in ml_result:
        ml_probability = ml_result[
            "risk_probability"
        ]

        ml_risk_level = ml_result[
            "predicted_risk_level"
        ]

    # -------------------------------------------------
    # Final recommendation
    # -------------------------------------------------

    if (
        priority_level == "URGENT"
        or (
            ml_probability is not None
            and ml_probability >= 70
        )
    ):
        recommendation = (
            "Inspect immediately"
        )

    elif (
        priority_level == "HIGH"
        or (
            ml_probability is not None
            and ml_probability >= 55
        )
    ):
        recommendation = (
            "Schedule inspection soon"
        )

    elif (
        priority_level == "MEDIUM"
        or (
            ml_probability is not None
            and ml_probability >= 40
        )
    ):
        recommendation = (
            "Schedule routine inspection"
        )

    else:
        recommendation = (
            "Monitor and inspect routinely"
        )

    # -------------------------------------------------
    # ML warning
    # -------------------------------------------------

    if (
        ml_probability is not None
        and ml_probability >= 70
        and current_risk < 70
    ):
        priority_reasons.append(
            "ML model predicts high future-risk probability"
        )

    elif (
        ml_probability is not None
        and ml_probability >= 55
        and current_risk < 40
    ):
        priority_reasons.append(
            "ML model indicates elevated future-risk"
        )

    # -------------------------------------------------
    # Return decision
    # -------------------------------------------------

    return {
        "establishment_id": establishment.id,
        "establishment_name": establishment.name,
        "region": establishment.region,
        "establishment_type":
            establishment.establishment_type,

        "current_risk": {
            "score": current_risk,
            "level": establishment.risk_level
        },

        "ml_prediction": {
            "probability": ml_probability,
            "risk_level": ml_risk_level
        },

        "priority": {
            "score": priority_score,
            "level": priority_level
        },

        "recommendation": recommendation,

        "factors": {
            "total_violations":
                total_violations,
            "critical_violations":
                critical_count,
            "high_severity_violations":
                high_count,
            "unresolved_violations":
                unresolved_count,
            "recurring_categories":
                recurring_categories,
            "days_since_last_inspection":
                days_since_inspection
        },

        "reasons": priority_reasons
    }