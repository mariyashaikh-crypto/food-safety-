from database import SessionLocal
from ml_risk_engine import predict_ml_risk


db = SessionLocal()

try:

    result = predict_ml_risk(
        db,
        1
    )

    print("=" * 60)
    print("ML RISK PREDICTION")
    print("=" * 60)

    print(result)

finally:

    db.close()