from datetime import date
import re

from sqlalchemy.orm import Session

import models
from smart_decision_engine import calculate_smart_decision


def _date_to_string(value):
    if value is None:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def get_establishment_context(
    db: Session,
    establishment_id: int
):
    """
    Retrieve structured information about one establishment.

    This is the retrieval layer for the local RAG system.
    It does NOT generate an AI answer.
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

    inspections = (
        db.query(models.Inspection)
        .filter(
            models.Inspection.establishment_id
            == establishment_id
        )
        .order_by(
            models.Inspection.inspection_date.desc()
        )
        .all()
    )

    violations = (
        db.query(models.Violation)
        .filter(
            models.Violation.establishment_id
            == establishment_id
        )
        .all()
    )

    violation_ids = [v.id for v in violations]

    corrective_actions = []

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

    reinspection_map = {}

    if violation_ids:
        reinspections = (
            db.query(models.Reinspection)
            .filter(
                models.Reinspection.violation_id.in_(
                    violation_ids
                )
            )
            .order_by(
                models.Reinspection.inspection_date.desc()
            )
            .all()
        )

        for item in reinspections:
            if item.violation_id not in reinspection_map:
                reinspection_map[item.violation_id] = []

            reinspection_map[item.violation_id].append(
                item
            )

    smart_decision = calculate_smart_decision(
        db,
        establishment_id
    )

    violation_context = []

    for violation in violations:

        actions = [
            action
            for action in corrective_actions
            if action.violation_id == violation.id
        ]

        action_context = []

        for action in actions:
            action_context.append({
                "id": action.id,
                "status": action.status,
                "description": action.action_description,
                "evidence": action.evidence_path,
                "inspector_comment":
                    action.inspector_comment
            })

        reinspection_context = []

        for item in reinspection_map.get(
            violation.id,
            []
        ):
            reinspection_context.append({
                "id": item.id,
                "date":
                    _date_to_string(
                        item.inspection_date
                    ),
                "inspector":
                    item.inspector_name,
                "result": item.result,
                "notes": item.notes
            })

        violation_context.append({
            "id": violation.id,
            "inspection_id":
                violation.inspection_id,
            "category":
                violation.category,
            "severity":
                violation.severity,
            "description":
                violation.description,
            "status":
                violation.status,
            "evidence":
                violation.evidence_path,
            "corrective_action_required":
                violation.corrective_action,
            "corrective_actions":
                action_context,
            "reinspections":
                reinspection_context
        })

    inspection_context = []

    for inspection in inspections:
        inspection_context.append({
            "id": inspection.id,
            "date":
                _date_to_string(
                    inspection.inspection_date
                ),
            "status":
                inspection.status,
            "inspector":
                inspection.inspector_name,
            "notes":
                inspection.notes,
            "risk_score":
                inspection.risk_score
        })

    return {
        "establishment": {
            "id":
                establishment.id,
            "name":
                establishment.name,
            "type":
                establishment.establishment_type,
            "address":
                establishment.address,
            "region":
                establishment.region,
            "status":
                establishment.status,
            "operating_status":
                establishment.operating_status,
            "current_risk_score":
                establishment.risk_score,
            "current_risk_level":
                establishment.risk_level,
            "last_inspection_date":
                _date_to_string(
                    establishment.last_inspection_date
                )
        },

        "inspection_history":
            inspection_context,

        "violations":
            violation_context,

        "smart_decision":
            smart_decision
    }


def _find_establishment_from_question(
    db: Session,
    question: str
):
    """
    Try to identify an establishment mentioned
    in the user's question.
    """

    establishments = (
        db.query(models.Establishment)
        .all()
    )

    question_lower = question.lower()

    # First try exact establishment name matching.
    for establishment in establishments:

        name = establishment.name.lower()

        if name in question_lower:
            return establishment

    # Then try ID matching.
    id_matches = re.findall(
        r"\b(?:id|establishment)\s*#?\s*(\d+)\b",
        question_lower
    )

    if id_matches:

        establishment_id = int(
            id_matches[0]
        )

        establishment = (
            db.query(models.Establishment)
            .filter(
                models.Establishment.id
                == establishment_id
            )
            .first()
        )

        if establishment:
            return establishment

    # Finally try meaningful name tokens.
    stop_words = {
        "why",
        "what",
        "which",
        "where",
        "when",
        "should",
        "inspect",
        "inspection",
        "first",
        "risk",
        "high",
        "low",
        "medium",
        "is",
        "the",
        "a",
        "an",
        "of",
        "for",
        "to",
        "this",
        "that",
        "establishment"
    }

    question_words = {
        word
        for word in re.findall(
            r"[a-zA-Z0-9]+",
            question_lower
        )
        if len(word) >= 4
        and word not in stop_words
    }

    best_match = None
    best_score = 0

    for establishment in establishments:

        establishment_words = {
            word
            for word in re.findall(
                r"[a-zA-Z0-9]+",
                establishment.name.lower()
            )
            if len(word) >= 4
        }

        overlap = (
            question_words
            & establishment_words
        )

        if len(overlap) > best_score:
            best_score = len(overlap)
            best_match = establishment

    return best_match


def get_priority_context(
    db: Session,
    limit: int = 10
):
    """
    Retrieve establishments that should receive
    inspection priority.
    """

    establishments = (
        db.query(models.Establishment)
        .all()
    )

    results = []

    for establishment in establishments:

        decision = calculate_smart_decision(
            db,
            establishment.id
        )

        if decision:
            results.append({
                "establishment_id":
                    establishment.id,

                "name":
                    establishment.name,

                "region":
                    establishment.region,

                "type":
                    establishment.establishment_type,

                "current_risk":
                    decision["current_risk"],

                "ml_prediction":
                    decision["ml_prediction"],

                "priority":
                    decision["priority"],

                "recommendation":
                    decision["recommendation"],

                "factors":
                    decision["factors"],

                "reasons":
                    decision["reasons"]
            })

    priority_order = {
        "URGENT": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1
    }

    results.sort(
        key=lambda x: (
            priority_order.get(
                x["priority"]["level"],
                0
            ),
            x["priority"]["score"],
            x["current_risk"]["score"],
            x["ml_prediction"]["probability"] or 0
        ),
        reverse=True
    )

    return results[:limit]


def retrieve_ai_context(
    db: Session,
    question: str
):
    """
    Main retrieval function.

    Determines what information is relevant to the
    user's question and returns grounded system data.

    No LLM is used here.
    """

    question_lower = question.lower()

    establishment = (
        _find_establishment_from_question(
            db,
            question
        )
    )

    # Questions asking about inspection priority.
    priority_keywords = [
        "inspect first",
        "inspection first",
        "prioritize",
        "priority",
        "inspect this week",
        "should i inspect",
        "which establishment",
        "who should i inspect"
    ]

    if any(
        keyword in question_lower
        for keyword in priority_keywords
    ):

        return {
            "retrieval_type":
                "inspection_priority",

            "question":
                question,

            "context": {
                "top_priority_establishments":
                    get_priority_context(
                        db,
                        limit=10
                    )
            }
        }

    # Questions about a specific establishment.
    if establishment:

        context = get_establishment_context(
            db,
            establishment.id
        )

        return {
            "retrieval_type":
                "establishment",

            "question":
                question,

            "context":
                context
        }

    # General food safety system question.
    return {
        "retrieval_type":
            "general",

        "question":
            question,

        "context": {
            "top_priority_establishments":
                get_priority_context(
                    db,
                    limit=10
                )
        }
    }