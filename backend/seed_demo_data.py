from datetime import date, timedelta
import random

from database import SessionLocal
import models
from risk_engine import calculate_risk


random.seed(42)

REGIONS = [
    "Nagpur Central",
    "Nagpur East",
    "Nagpur West",
    "Nagpur North",
    "Nagpur South",
    "Nagpur Rural",
]

ESTABLISHMENT_TYPES = [
    "Restaurant",
    "Hotel",
    "Cafe",
    "Bakery",
    "Canteen",
    "Food Truck",
]

INSPECTORS = [
    "Inspector A",
    "Inspector B",
    "Inspector C",
    "Inspector D",
]

CATEGORIES = [
    "Improper Food Storage",
    "Temperature Control",
    "Poor Sanitation",
    "Pests",
    "Cross-Contamination",
    "Expired Food",
    "Unsafe Handling",
    "Facility Hygiene",
]

DESCRIPTIONS = {
    "Improper Food Storage":
        "Food items were not stored according to required storage practices.",
    "Temperature Control":
        "Food storage temperature was outside the recommended safe range.",
    "Poor Sanitation":
        "Cleaning and sanitation practices were found to be inadequate.",
    "Pests":
        "Evidence of pest activity was observed in the food preparation area.",
    "Cross-Contamination":
        "Raw and ready-to-eat food handling practices created a cross-contamination risk.",
    "Expired Food":
        "Expired or improperly dated food items were found during inspection.",
    "Unsafe Handling":
        "Unsafe food handling practices were observed during inspection.",
    "Facility Hygiene":
        "Kitchen or food preparation areas did not meet hygiene requirements.",
}


def get_severity(profile):
    if profile == "high":
        return random.choices(
            ["Critical", "High", "Medium", "Low"],
            weights=[30, 40, 20, 10],
        )[0]

    if profile == "medium":
        return random.choices(
            ["Critical", "High", "Medium", "Low"],
            weights=[8, 30, 42, 20],
        )[0]

    return random.choices(
        ["Critical", "High", "Medium", "Low"],
        weights=[1, 7, 32, 60],
    )[0]


def create_violation(
    db,
    establishment,
    inspection,
    profile,
):
    category = random.choice(CATEGORIES)
    severity = get_severity(profile)

    description = DESCRIPTIONS[category]

    corrective_action = (
        f"Correct the {category.lower()} issue and "
        "submit supporting evidence for review."
    )

    violation = models.Violation(
        inspection_id=inspection.id,
        establishment_id=establishment.id,
        category=category,
        severity=severity,
        description=description,
        corrective_action=corrective_action,
        status="Open",
        evidence_path=None,
    )

    db.add(violation)
    db.flush()

    # High-risk establishments keep more unresolved issues.
    if profile == "high":
        resolution_roll = random.random()
    elif profile == "medium":
        resolution_roll = random.random() + 0.15
    else:
        resolution_roll = random.random() + 0.35

    # Some violations remain unresolved.
    if resolution_roll < 0.35:
        violation.status = "Corrective Action Required"

        if random.random() < 0.35:
            action = models.CorrectiveAction(
                violation_id=violation.id,
                action_description=corrective_action,
                evidence_path="corrective_action_evidence.pdf",
                status="Rejected",
                inspector_comment="Submitted evidence was insufficient.",
            )
            db.add(action)

        return

    # Resolved violation with corrective action + reinspection.
    action = models.CorrectiveAction(
        violation_id=violation.id,
        action_description=corrective_action,
        evidence_path="corrective_action_evidence.pdf",
        status="Accepted",
        inspector_comment="Evidence reviewed and accepted.",
    )

    db.add(action)
    db.flush()

    reinspection_date = inspection.inspection_date + timedelta(days=14)

    reinspection = models.Reinspection(
        violation_id=violation.id,
        inspection_date=reinspection_date,
        inspector_name=inspection.inspector_name,
        notes="Follow-up inspection after corrective action.",
        result="Fixed",
    )

    db.add(reinspection)

    violation.status = "Resolved"


def create_establishment(
    db,
    number,
    profile,
):
    region = REGIONS[(number - 1) % len(REGIONS)]
    establishment_type = random.choice(ESTABLISHMENT_TYPES)

    names = [
        "Spice Garden",
        "Fresh Bites",
        "Urban Tadka",
        "Green Plate",
        "Royal Kitchen",
        "Food Junction",
        "Daily Dine",
        "Taste Hub",
        "Healthy Bowl",
        "City Cafe",
    ]

    name = f"Demo {random.choice(names)} {number:02d}"

    establishment = models.Establishment(
        name=name,
        establishment_type=establishment_type,
        address=f"Main Market Road, {region}",
        region=region,
        status="Active",
        risk_score=0.0,
        risk_level="LOW",
        operating_status="Open",
    )

    db.add(establishment)
    db.flush()

    today = date.today()

    # Three historical inspections.
    inspection_offsets = [330, 210, 95]

    for index, days_ago in enumerate(inspection_offsets):

        inspection_date = today - timedelta(days=days_ago)

        inspection = models.Inspection(
            establishment_id=establishment.id,
            inspection_date=inspection_date,
            status="Completed",
            inspector_name=INSPECTORS[
                (number + index) % len(INSPECTORS)
            ],
            notes="Historical food safety inspection.",
            risk_score=0.0,
        )

        db.add(inspection)
        db.flush()

        if profile == "high":
            violation_count = random.randint(3, 5)

        elif profile == "medium":
            violation_count = random.randint(1, 3)

        else:
            violation_count = random.randint(0, 1)

        # Make one category repeat across inspections for
        # many medium/high establishments.
        repeated_category = None

        if profile in ["high", "medium"] and violation_count > 0:
            repeated_category = random.choice(CATEGORIES)

        for violation_index in range(violation_count):

            if (
                repeated_category
                and violation_index == 0
            ):
                category_backup = random.choice(CATEGORIES)

                old_choice = random.choice
                random.choice = lambda items: repeated_category

                try:
                    create_violation(
                        db,
                        establishment,
                        inspection,
                        profile,
                    )
                finally:
                    random.choice = old_choice

            else:
                create_violation(
                    db,
                    establishment,
                    inspection,
                    profile,
                )

        establishment.last_inspection_date = inspection_date

    # Add a few upcoming inspections.
    if number % 4 == 0:

        upcoming_date = today + timedelta(days=random.randint(3, 14))

        upcoming = models.Inspection(
            establishment_id=establishment.id,
            inspection_date=upcoming_date,
            status="Scheduled",
            inspector_name=INSPECTORS[number % len(INSPECTORS)],
            notes="Scheduled upcoming food safety inspection.",
            risk_score=0.0,
        )

        db.add(upcoming)

    # Add a few overdue inspections for realistic dashboard data.
    if number % 7 == 0:

        overdue_date = today - timedelta(days=random.randint(5, 25))

        overdue = models.Inspection(
            establishment_id=establishment.id,
            inspection_date=overdue_date,
            status="Scheduled",
            inspector_name=INSPECTORS[(number + 1) % len(INSPECTORS)],
            notes="Inspection requiring scheduling follow-up.",
            risk_score=0.0,
        )

        db.add(overdue)

    return establishment


def main():
    db = SessionLocal()

    try:
        existing_demo = (
            db.query(models.Establishment)
            .filter(
                models.Establishment.name == "Demo Spice Garden 01"
            )
            .first()
        )

        if existing_demo:
            print("Demo data has already been seeded.")
            print("No changes were made.")
            return

        print("Creating realistic demo data...")

        establishments = []

        # 10 high-risk
        for number in range(1, 11):
            establishments.append(
                create_establishment(
                    db,
                    number,
                    "high",
                )
            )

        # 10 medium-risk
        for number in range(11, 21):
            establishments.append(
                create_establishment(
                    db,
                    number,
                    "medium",
                )
            )

        # 10 low-risk
        for number in range(21, 31):
            establishments.append(
                create_establishment(
                    db,
                    number,
                    "low",
                )
            )

        db.commit()

        # Calculate current risk for every establishment.
        all_establishments = (
            db.query(models.Establishment)
            .filter(models.Establishment.status == "Active")
            .all()
        )

        for establishment in all_establishments:

            risk = calculate_risk(
                db,
                establishment.id,
            )

            if risk:
                establishment.risk_score = risk["risk_score"]
                establishment.risk_level = risk["risk_level"]

        db.commit()

        print()
        print("========================================")
        print("DEMO DATA CREATED SUCCESSFULLY")
        print("========================================")
        print(f"New establishments: {len(establishments)}")
        print("Existing data was preserved.")
        print()

        high = sum(
            1
            for e in all_establishments
            if e.risk_level == "HIGH"
        )

        medium = sum(
            1
            for e in all_establishments
            if e.risk_level == "MEDIUM"
        )

        low = sum(
            1
            for e in all_establishments
            if e.risk_level == "LOW"
        )

        print("Current risk distribution:")
        print(f"HIGH   : {high}")
        print(f"MEDIUM : {medium}")
        print(f"LOW    : {low}")
        print()
        print("You can now start the backend and test /dashboard.")

    except Exception as error:
        db.rollback()
        print()
        print("ERROR: Demo data was not committed.")
        print(error)

    finally:
        db.close()


if __name__ == "__main__":
    main()