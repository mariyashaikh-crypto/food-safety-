import random
import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

ROWS = 500

ESTABLISHMENT_TYPES = [
    "Restaurant",
    "Hotel",
    "Cafeteria",
    "Food Truck",
    "Institutional Kitchen"
]

REGIONS = [
    "Nagpur Central",
    "Nagpur East",
    "Nagpur West",
    "Nagpur North",
    "Nagpur South",
    "Nagpur Rural"
]


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


data = []

for i in range(ROWS):

    establishment_type = random.choice(ESTABLISHMENT_TYPES)
    region = random.choice(REGIONS)

    # Overall historical violation level
    total_violations = int(np.clip(
        np.random.poisson(3.5),
        0,
        15
    ))

    # Severity distribution
    critical_violations = min(
        total_violations,
        int(np.random.binomial(
            total_violations,
            0.12
        ))
    )

    remaining = max(total_violations - critical_violations, 0)

    high_severity_violations = min(
        remaining,
        int(np.random.binomial(
            remaining,
            0.28
        ))
    )

    remaining = max(
        remaining - high_severity_violations,
        0
    )

    medium_severity_violations = min(
        remaining,
        int(np.random.binomial(
            remaining,
            0.50
        ))
    )

    low_severity_violations = max(
        total_violations
        - critical_violations
        - high_severity_violations
        - medium_severity_violations,
        0
    )

    # Recurring problem categories
    recurring_categories = int(np.clip(
        np.random.poisson(1.3),
        0,
        6
    ))

    # Unresolved violations
    unresolved_violations = min(
        total_violations,
        int(np.random.binomial(
            total_violations,
            0.30
        ))
    )

    # Corrective action failures
    rejected_corrective_actions = min(
        unresolved_violations,
        int(np.random.binomial(
            unresolved_violations,
            0.20
        ))
    )

    # Days since previous inspection
    days_since_last_inspection = int(
        np.random.randint(15, 501)
    )

    # Create a risk tendency score
    risk_signal = (
        -3.2
        + 0.18 * total_violations
        + 0.65 * critical_violations
        + 0.32 * high_severity_violations
        + 0.28 * recurring_categories
        + 0.35 * unresolved_violations
        + 0.45 * rejected_corrective_actions
        + 0.003 * days_since_last_inspection
    )

    # Small establishment-type effect
    if establishment_type in ["Hotel", "Restaurant"]:
        risk_signal += 0.15

    if establishment_type == "Food Truck":
        risk_signal += 0.05

    probability = sigmoid(risk_signal)

    # Synthetic future outcome:
    # 1 = likely high-risk next inspection
    # 0 = likely not high-risk
    next_inspection_high_risk = int(
        np.random.random() < probability
    )

    data.append({
        "total_violations": total_violations,
        "critical_violations": critical_violations,
        "high_severity_violations": high_severity_violations,
        "medium_severity_violations": medium_severity_violations,
        "low_severity_violations": low_severity_violations,
        "recurring_categories": recurring_categories,
        "unresolved_violations": unresolved_violations,
        "rejected_corrective_actions": rejected_corrective_actions,
        "days_since_last_inspection": days_since_last_inspection,
        "establishment_type": establishment_type,
        "region": region,
        "next_inspection_high_risk": next_inspection_high_risk
    })


df = pd.DataFrame(data)

output_file = "ml_training_data.csv"
df.to_csv(output_file, index=False)

print("=" * 60)
print("ML TRAINING DATASET CREATED")
print("=" * 60)

print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")

print("\nTarget distribution:")
print(
    df["next_inspection_high_risk"]
    .value_counts()
    .sort_index()
    .rename({
        0: "Not High Risk",
        1: "High Risk"
    })
)

print("\nSample records:")
print(df.head(5).to_string(index=False))

print("\nSaved as:")
print(output_file)

print("=" * 60)