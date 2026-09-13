import json
import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# --------------------------------------------------
# 1. Load dataset
# --------------------------------------------------

DATA_FILE = "ml_training_data.csv"

df = pd.read_csv(DATA_FILE)

print("=" * 60)
print("FOOD SAFETY ML RISK MODEL TRAINING")
print("=" * 60)

print(f"\nDataset rows: {len(df)}")
print(f"Dataset columns: {len(df.columns)}")


# --------------------------------------------------
# 2. Separate features and target
# --------------------------------------------------

TARGET = "next_inspection_high_risk"

X = df.drop(columns=[TARGET])
y = df[TARGET]


# --------------------------------------------------
# 3. Identify categorical and numerical columns
# --------------------------------------------------

categorical_features = [
    "establishment_type",
    "region"
]

numerical_features = [
    "total_violations",
    "critical_violations",
    "high_severity_violations",
    "medium_severity_violations",
    "low_severity_violations",
    "recurring_categories",
    "unresolved_violations",
    "rejected_corrective_actions",
    "days_since_last_inspection"
]


# --------------------------------------------------
# 4. Preprocessing
# --------------------------------------------------

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numerical",
            "passthrough",
            numerical_features
        )
    ]
)


# --------------------------------------------------
# 5. Random Forest model
# --------------------------------------------------

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=10,
    min_samples_split=4,
    class_weight="balanced",
    random_state=42
)


# --------------------------------------------------
# 6. Complete ML pipeline
# --------------------------------------------------

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# --------------------------------------------------
# 7. Train/test split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print(f"\nTraining samples: {len(X_train)}")
print(f"Testing samples:  {len(X_test)}")


# --------------------------------------------------
# 8. Train model
# --------------------------------------------------

print("\nTraining Random Forest model...")

pipeline.fit(X_train, y_train)

print("Training completed.")


# --------------------------------------------------
# 9. Evaluate
# --------------------------------------------------

predictions = pipeline.predict(X_test)
probabilities = pipeline.predict_proba(X_test)[:, 1]

accuracy = accuracy_score(y_test, predictions)
roc_auc = roc_auc_score(y_test, probabilities)

print("\n" + "=" * 60)
print("MODEL PERFORMANCE")
print("=" * 60)

print(f"\nAccuracy : {accuracy:.3f}")
print(f"ROC-AUC  : {roc_auc:.3f}")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        predictions,
        target_names=[
            "Not High Risk",
            "High Risk"
        ]
    )
)


# --------------------------------------------------
# 10. Save trained model
# --------------------------------------------------

MODEL_FILE = "risk_model.joblib"

joblib.dump(
    pipeline,
    MODEL_FILE
)

print(f"\nModel saved as: {MODEL_FILE}")


# --------------------------------------------------
# 11. Save model metadata
# --------------------------------------------------

metadata = {
    "model": "RandomForestClassifier",
    "n_estimators": 300,
    "target": TARGET,
    "training_rows": len(X_train),
    "testing_rows": len(X_test),
    "accuracy": round(float(accuracy), 4),
    "roc_auc": round(float(roc_auc), 4),
    "features": numerical_features + categorical_features
}

with open("model_metadata.json", "w") as file:
    json.dump(
        metadata,
        file,
        indent=4
    )

print("Metadata saved as: model_metadata.json")

print("\n" + "=" * 60)
print("ML TRAINING COMPLETE")
print("=" * 60)