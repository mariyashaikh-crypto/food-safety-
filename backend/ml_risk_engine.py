import os
import joblib
import pandas as pd

from datetime import date
from sqlalchemy.orm import Session

import models


MODEL_FILE = "risk_model.joblib"


def get_establishment_features(
    db: Session,
    establishment_id: int
):
    """
    Convert an establishment's historical inspection
    information into ML model features.
    """

    establishment = (
        db.query(models.Establishment)
        .filter(
            models.Establishment.id == establishment_id
        )
        .first()
    )

    if not establishment:
        return None

    violations = (
        db.query(models.Violation)
        .filter(
            models.Violation.establishment_id
            == establishment_id
        )
        .all()
    )

    total_violations = len(violations)

    critical_violations = sum(
        1
        for v in violations
        if v.severity.lower() == "critical"
    )

    high_severity_violations = sum(
        1
        for v in violations
        if v.severity.lower() == "high"
    )

    medium_severity_violations = sum(
        1
        for v in violations
        if v.severity.lower() == "medium"
    )

    low_severity_violations = sum(
        1
        for v in violations
        if v.severity.lower() == "low"
    )

    # Count recurring violation categories
    category_counts = {}

    for violation in violations:

        category = violation.category.lower()

        category_counts[category] = (
            category_counts.get(category, 0) + 1
        )

    recurring_categories = sum(
        1
        for count in category_counts.values()
        if count >= 2
    )

    # Count unresolved violations
    unresolved_statuses = {
        "open",
        "corrective action required",
        "under review",
        "re-inspection required"
    }

    unresolved_violations = sum(
        1
        for v in violations
        if v.status.lower() in unresolved_statuses
    )

    # Corrective-action failures
    violation_ids = [
        v.id for v in violations
    ]

    rejected_corrective_actions = 0

    if violation_ids:

        corrective_actions = (
            db.query(models.CorrectiveAction)
            .filter(
                models.CorrectiveAction.violation_id.in_(
                    violation_ids
                )
            )
            .all()
        )

        rejected_corrective_actions = sum(
            1
            for action in corrective_actions
            if action.status.lower() == "rejected"
        )

    # Days since last inspection
    days_since_last_inspection = 0

    if establishment.last_inspection_date:

        days_since_last_inspection = max(
            0,
            (
                date.today()
                - establishment.last_inspection_date
            ).days
        )

    return {
        "total_violations": total_violations,
        "critical_violations": critical_violations,
        "high_severity_violations": high_severity_violations,
        "medium_severity_violations": medium_severity_violations,
        "low_severity_violations": low_severity_violations,
        "recurring_categories": recurring_categories,
        "unresolved_violations": unresolved_violations,
        "rejected_corrective_actions":
            rejected_corrective_actions,
        "days_since_last_inspection":
            days_since_last_inspection,
        "establishment_type":
            establishment.establishment_type,
        "region":
            establishment.region
    }


def predict_ml_risk(
    db: Session,
    establishment_id: int
):
    """
    Predict future high-risk probability
    using the trained Random Forest model.
    """

    if not os.path.exists(MODEL_FILE):
        return {
            "error": "ML model not found. Train the model first."
        }

    features = get_establishment_features(
        db,
        establishment_id
    )

    if features is None:
        return None

    model = joblib.load(MODEL_FILE)

    feature_df = pd.DataFrame(
        [features]
    )

    prediction = int(
        model.predict(feature_df)[0]
    )

    probability = float(
        model.predict_proba(feature_df)[0][1]
    )

    probability_percent = round(
        probability * 100,
        2
    )

    if probability_percent >= 70:
        predicted_risk = "HIGH"

    elif probability_percent >= 40:
        predicted_risk = "MEDIUM"

    else:
        predicted_risk = "LOW"

    # Feature importance
    feature_importance = []

    try:

        preprocessor = (
            model.named_steps["preprocessor"]
        )

        classifier = (
            model.named_steps["model"]
        )

        transformed_names = (
            preprocessor
            .get_feature_names_out()
        )

        importances = classifier.feature_importances_

        for name, importance in zip(
            transformed_names,
            importances
        ):

            feature_importance.append({
                "feature": name,
                "importance": round(
                    float(importance),
                    4
                )
            })

        feature_importance.sort(
            key=lambda x: x["importance"],
            reverse=True
        )

        feature_importance = (
            feature_importance[:8]
        )

    except Exception:
        feature_importance = []

    return {
        "establishment_id":
            establishment_id,

        "predicted_high_risk":
            bool(prediction),

        "risk_probability":
            probability_percent,

        "predicted_risk_level":
            predicted_risk,

        "features":
            features,

        "top_features":
            feature_importance
    }