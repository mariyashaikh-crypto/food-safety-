from datetime import date
from sqlalchemy.orm import Session

import models


def calculate_risk(db: Session, establishment_id: int):
    """
    Calculate food safety risk score for an establishment.

    Factors:
    - Total violations
    - Critical violations
    - High severity violations
    - Recurring violation categories
    - Open/unresolved violations
    - Corrective action failures
    - Days since last inspection
    """

    establishment = (
        db.query(models.Establishment)
        .filter(models.Establishment.id == establishment_id)
        .first()
    )

    if not establishment:
        return None

    violations = (
        db.query(models.Violation)
        .filter(models.Violation.establishment_id == establishment_id)
        .all()
    )

    score = 0
    reasons = []

    # --------------------------------------------------
    # 1. TOTAL VIOLATIONS
    # --------------------------------------------------

    total_violations = len(violations)

    if total_violations >= 10:
        score += 20
        reasons.append("High number of previous violations")
    elif total_violations >= 5:
        score += 12
        reasons.append("Several previous violations")
    elif total_violations >= 2:
        score += 6
        reasons.append("Previous violations recorded")

    # --------------------------------------------------
    # 2. CRITICAL VIOLATIONS
    # --------------------------------------------------

    critical_count = sum(
        1 for v in violations
        if v.severity.lower() == "critical"
    )

    score += min(critical_count * 15, 30)

    if critical_count > 0:
        reasons.append(f"{critical_count} critical violation(s)")

    # --------------------------------------------------
    # 3. HIGH SEVERITY VIOLATIONS
    # --------------------------------------------------

    high_count = sum(
        1 for v in violations
        if v.severity.lower() == "high"
    )

    score += min(high_count * 8, 20)

    if high_count > 0:
        reasons.append(f"{high_count} high-severity violation(s)")

    # --------------------------------------------------
    # 4. RECURRING VIOLATION CATEGORIES
    # --------------------------------------------------

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

    score += min(recurring_count * 10, 20)

    if recurring_count > 0:
        reasons.append(
            f"{recurring_count} recurring violation categor{'y' if recurring_count == 1 else 'ies'}"
        )

    # --------------------------------------------------
    # 5. OPEN / UNRESOLVED VIOLATIONS
    # --------------------------------------------------

    unresolved_statuses = [
        "open",
        "corrective action required",
        "under review",
        "re-inspection required"
    ]

    unresolved_count = sum(
        1 for v in violations
        if v.status.lower() in unresolved_statuses
    )

    score += min(unresolved_count * 10, 30)

    if unresolved_count > 0:
        reasons.append(
            f"{unresolved_count} unresolved violation(s)"
        )

    # --------------------------------------------------
    # 6. CORRECTIVE ACTION FAILURES
    # --------------------------------------------------

    violation_ids = [v.id for v in violations]

    corrective_actions = []

    if violation_ids:
        corrective_actions = (
            db.query(models.CorrectiveAction)
            .filter(
                models.CorrectiveAction.violation_id.in_(violation_ids)
            )
            .all()
        )

    rejected_actions = sum(
        1 for action in corrective_actions
        if action.status.lower() == "rejected"
    )

    score += min(rejected_actions * 8, 16)

    if rejected_actions > 0:
        reasons.append(
            f"{rejected_actions} rejected corrective action(s)"
        )

    # --------------------------------------------------
    # 7. DAYS SINCE LAST INSPECTION
    # --------------------------------------------------

    days_since_inspection = None

    if establishment.last_inspection_date:
        days_since_inspection = (
            date.today() - establishment.last_inspection_date
        ).days

        if days_since_inspection > 365:
            score += 15
            reasons.append("Inspection overdue by more than one year")

        elif days_since_inspection > 180:
            score += 10
            reasons.append("More than 180 days since last inspection")

        elif days_since_inspection > 90:
            score += 5
            reasons.append("More than 90 days since last inspection")

    # --------------------------------------------------
    # LIMIT SCORE
    # --------------------------------------------------

    score = min(score, 100)

    # --------------------------------------------------
    # RISK LEVEL
    # --------------------------------------------------

    if score >= 70:
        risk_level = "HIGH"
    elif score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # --------------------------------------------------
    # IF NO RISK FACTORS
    # --------------------------------------------------

    if not reasons:
        reasons.append("No significant risk factors detected")

    return {
        "establishment_id": establishment_id,
        "risk_score": round(float(score), 2),
        "risk_level": risk_level,
        "total_violations": total_violations,
        "critical_violations": critical_count,
        "high_severity_violations": high_count,
        "recurring_categories": recurring_categories,
        "unresolved_violations": unresolved_count,
        "rejected_corrective_actions": rejected_actions,
        "days_since_last_inspection": days_since_inspection,
        "reasons": reasons
    }