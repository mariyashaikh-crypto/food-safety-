from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from uuid import uuid4
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles
)
import models
import schemas

from database import Base, engine, get_db
from risk_engine import calculate_risk
from ml_risk_engine import predict_ml_risk
from smart_decision_engine import calculate_smart_decision
from rag_engine import retrieve_ai_context, get_establishment_context
from ai_engine import generate_ai_answer
from priority_engine import (
    calculate_priority,
    get_inspection_priority_list
)
from dashboard_engine import get_dashboard_data


# Create database tables
Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# EVIDENCE STORAGE
# --------------------------------------------------

EVIDENCE_DIR = Path("uploads") / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EVIDENCE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf"
}

MAX_EVIDENCE_SIZE = 10 * 1024 * 1024  # 10 MB


app = FastAPI(
    title="Food Safety Inspection Platform API",
    version="1.0.0",
    description="Backend API for food safety inspection and risk management."
)


# --------------------------------------------------
# FRONTEND CONNECTION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# BASIC ROUTES
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Food Safety Inspection Platform backend is running",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }


@app.get("/database-test")
def database_test():
    return {
        "message": "Database is working successfully",
        "tables": [
            "establishments",
            "inspections",
            "violations",
            "corrective_actions",
            "reinspections"
        ]
    }


# --------------------------------------------------
# ESTABLISHMENT ROUTES
# --------------------------------------------------

@app.post(
    "/establishments",
    response_model=schemas.EstablishmentResponse
)
def create_establishment(
    establishment: schemas.EstablishmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Admin"))
):
    new_establishment = models.Establishment(
        name=establishment.name,
        establishment_type=establishment.establishment_type,
        address=establishment.address,
        region=establishment.region,
        status=establishment.status,
        operating_status=establishment.operating_status,
        risk_score=0.0,
        risk_level="LOW"
    )

    db.add(new_establishment)
    db.commit()
    db.refresh(new_establishment)

    return new_establishment


@app.get(
    "/establishments",
    response_model=list[schemas.EstablishmentResponse]
)
def get_establishments(
    db: Session = Depends(get_db)
):
    return db.query(models.Establishment).all()


@app.get(
    "/establishments/{establishment_id}",
    response_model=schemas.EstablishmentResponse
)
def get_establishment(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    establishment = (
        db.query(models.Establishment)
        .filter(models.Establishment.id == establishment_id)
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return establishment


@app.put(
    "/establishments/{establishment_id}",
    response_model=schemas.EstablishmentResponse
)
def update_establishment(
    establishment_id: int,
    updated_data: schemas.EstablishmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Admin"))
):
    establishment = (
        db.query(models.Establishment)
        .filter(models.Establishment.id == establishment_id)
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    establishment.name = updated_data.name
    establishment.establishment_type = updated_data.establishment_type
    establishment.address = updated_data.address
    establishment.region = updated_data.region
    establishment.status = updated_data.status
    establishment.operating_status = updated_data.operating_status

    db.commit()
    db.refresh(establishment)

    return establishment


@app.delete("/establishments/{establishment_id}")
def delete_establishment(
    establishment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Admin"))
):
    establishment = (
        db.query(models.Establishment)
        .filter(models.Establishment.id == establishment_id)
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    db.delete(establishment)
    db.commit()

    return {
        "message": "Establishment deleted successfully",
        "id": establishment_id
    }


# --------------------------------------------------
# INSPECTION ROUTES
# --------------------------------------------------

@app.post(
    "/inspections",
    response_model=schemas.InspectionResponse
)
def create_inspection(
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    establishment = (
        db.query(models.Establishment)
        .filter(
            models.Establishment.id == inspection.establishment_id
        )
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    new_inspection = models.Inspection(
        establishment_id=inspection.establishment_id,
        inspection_date=inspection.inspection_date,
        status=inspection.status,
        inspector_name=inspection.inspector_name,
        notes=inspection.notes,
        risk_score=inspection.risk_score
    )

    db.add(new_inspection)

    establishment.last_inspection_date = inspection.inspection_date

    db.commit()
    db.refresh(new_inspection)

    return new_inspection


@app.get(
    "/inspections",
    response_model=list[schemas.InspectionResponse]
)
def get_inspections(
    db: Session = Depends(get_db)
):
    return db.query(models.Inspection).all()


@app.get(
    "/inspections/{inspection_id}",
    response_model=schemas.InspectionResponse
)
def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    inspection = (
        db.query(models.Inspection)
        .filter(models.Inspection.id == inspection_id)
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    return inspection


@app.get(
    "/establishments/{establishment_id}/inspections",
    response_model=list[schemas.InspectionResponse]
)
def get_establishment_inspections(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    establishment = (
        db.query(models.Establishment)
        .filter(models.Establishment.id == establishment_id)
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return (
        db.query(models.Inspection)
        .filter(
            models.Inspection.establishment_id == establishment_id
        )
        .all()
    )


@app.put(
    "/inspections/{inspection_id}/status",
    response_model=schemas.InspectionResponse
)
def update_inspection_status(
    inspection_id: int,
    status_data: schemas.InspectionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    inspection = (
        db.query(models.Inspection)
        .filter(models.Inspection.id == inspection_id)
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    inspection.status = status_data.status

    db.commit()
    db.refresh(inspection)

    return inspection


# --------------------------------------------------
# VIOLATION ROUTES
# --------------------------------------------------

@app.post(
    "/violations",
    response_model=schemas.ViolationResponse
)
def create_violation(
    violation: schemas.ViolationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    inspection = (
        db.query(models.Inspection)
        .filter(
            models.Inspection.id == violation.inspection_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    establishment = (
        db.query(models.Establishment)
        .filter(
            models.Establishment.id == violation.establishment_id
        )
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    new_violation = models.Violation(
        inspection_id=violation.inspection_id,
        establishment_id=violation.establishment_id,
        category=violation.category,
        severity=violation.severity,
        description=violation.description,
        corrective_action=violation.corrective_action,
        status=violation.status,
        evidence_path=violation.evidence_path
    )

    db.add(new_violation)
    db.commit()
    db.refresh(new_violation)

    return new_violation


@app.get(
    "/violations",
    response_model=list[schemas.ViolationResponse]
)
def get_violations(
    db: Session = Depends(get_db)
):
    return db.query(models.Violation).all()


@app.get(
    "/violations/{violation_id}",
    response_model=schemas.ViolationResponse
)
def get_violation(
    violation_id: int,
    db: Session = Depends(get_db)
):
    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == violation_id
        )
        .first()
    )

    if not violation:
        raise HTTPException(
            status_code=404,
            detail="Violation not found"
        )

    return violation


@app.get(
    "/establishments/{establishment_id}/violations",
    response_model=list[schemas.ViolationResponse]
)
def get_establishment_violations(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    establishment = (
        db.query(models.Establishment)
        .filter(
            models.Establishment.id == establishment_id
        )
        .first()
    )

    if not establishment:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return (
        db.query(models.Violation)
        .filter(
            models.Violation.establishment_id == establishment_id
        )
        .all()
    )


@app.get(
    "/inspections/{inspection_id}/violations",
    response_model=list[schemas.ViolationResponse]
)
def get_inspection_violations(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    inspection = (
        db.query(models.Inspection)
        .filter(
            models.Inspection.id == inspection_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    return (
        db.query(models.Violation)
        .filter(
            models.Violation.inspection_id == inspection_id
        )
        .all()
    )


@app.put(
    "/violations/{violation_id}/status",
    response_model=schemas.ViolationResponse
)
def update_violation_status(
    violation_id: int,
    status_data: schemas.ViolationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == violation_id
        )
        .first()
    )

    if not violation:
        raise HTTPException(
            status_code=404,
            detail="Violation not found"
        )

    violation.status = status_data.status

    db.commit()
    db.refresh(violation)

    return violation


# --------------------------------------------------
# CORRECTIVE ACTION ROUTES
# --------------------------------------------------

@app.post(
    "/corrective-actions",
    response_model=schemas.CorrectiveActionResponse
)
def create_corrective_action(
    action: schemas.CorrectiveActionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector", "Establishment")
    )
):
    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == action.violation_id
        )
        .first()
    )

    if not violation:
        raise HTTPException(
            status_code=404,
            detail="Violation not found"
        )

    new_action = models.CorrectiveAction(
        violation_id=action.violation_id,
        action_description=action.action_description,
        evidence_path=action.evidence_path,
        status=action.status
    )

    db.add(new_action)

    violation.status = "Corrective Action Required"

    db.commit()
    db.refresh(new_action)

    return new_action


@app.get(
    "/corrective-actions",
    response_model=list[schemas.CorrectiveActionResponse]
)
def get_corrective_actions(
    db: Session = Depends(get_db)
):
    return db.query(models.CorrectiveAction).all()


@app.get(
    "/corrective-actions/{action_id}",
    response_model=schemas.CorrectiveActionResponse
)
def get_corrective_action(
    action_id: int,
    db: Session = Depends(get_db)
):
    action = (
        db.query(models.CorrectiveAction)
        .filter(
            models.CorrectiveAction.id == action_id
        )
        .first()
    )

    if not action:
        raise HTTPException(
            status_code=404,
            detail="Corrective action not found"
        )

    return action


@app.get(
    "/violations/{violation_id}/corrective-actions",
    response_model=list[schemas.CorrectiveActionResponse]
)
def get_violation_corrective_actions(
    violation_id: int,
    db: Session = Depends(get_db)
):
    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == violation_id
        )
        .first()
    )

    if not violation:
        raise HTTPException(
            status_code=404,
            detail="Violation not found"
        )

    return (
        db.query(models.CorrectiveAction)
        .filter(
            models.CorrectiveAction.violation_id == violation_id
        )
        .all()
    )


@app.put(
    "/corrective-actions/{action_id}/status",
    response_model=schemas.CorrectiveActionResponse
)
def update_corrective_action_status(
    action_id: int,
    update: schemas.CorrectiveActionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    action = (
        db.query(models.CorrectiveAction)
        .filter(
            models.CorrectiveAction.id == action_id
        )
        .first()
    )

    if not action:
        raise HTTPException(
            status_code=404,
            detail="Corrective action not found"
        )

    action.status = update.status
    action.inspector_comment = update.inspector_comment

    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == action.violation_id
        )
        .first()
    )

    if violation:

        if update.status == "Submitted":
            violation.status = "Under Review"

        elif update.status == "Under Review":
            violation.status = "Under Review"

        elif update.status == "Accepted":
            violation.status = "Re-inspection Required"

        elif update.status == "Rejected":
            violation.status = "Corrective Action Required"

        elif update.status == "Closed":
            violation.status = "Resolved"

    db.commit()
    db.refresh(action)

    return action


# --------------------------------------------------
# RE-INSPECTION ROUTES
# --------------------------------------------------

@app.post(
    "/reinspections",
    response_model=schemas.ReinspectionResponse
)
def create_reinspection(
    reinspection: schemas.ReinspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == reinspection.violation_id
        )
        .first()
    )

    if not violation:
        raise HTTPException(
            status_code=404,
            detail="Violation not found"
        )

    if violation.status != "Re-inspection Required":
        raise HTTPException(
            status_code=400,
            detail="Violation is not ready for re-inspection"
        )

    new_reinspection = models.Reinspection(
        violation_id=reinspection.violation_id,
        inspection_date=reinspection.inspection_date,
        inspector_name=reinspection.inspector_name,
        notes=reinspection.notes,
        result=reinspection.result
    )

    db.add(new_reinspection)
    db.commit()
    db.refresh(new_reinspection)

    return new_reinspection


@app.get(
    "/reinspections",
    response_model=list[schemas.ReinspectionResponse]
)
def get_reinspections(
    db: Session = Depends(get_db)
):
    return db.query(models.Reinspection).all()


@app.get(
    "/reinspections/{reinspection_id}",
    response_model=schemas.ReinspectionResponse
)
def get_reinspection(
    reinspection_id: int,
    db: Session = Depends(get_db)
):
    reinspection = (
        db.query(models.Reinspection)
        .filter(
            models.Reinspection.id == reinspection_id
        )
        .first()
    )

    if not reinspection:
        raise HTTPException(
            status_code=404,
            detail="Re-inspection not found"
        )

    return reinspection


@app.get(
    "/violations/{violation_id}/reinspections",
    response_model=list[schemas.ReinspectionResponse]
)
def get_violation_reinspections(
    violation_id: int,
    db: Session = Depends(get_db)
):
    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == violation_id
        )
        .first()
    )

    if not violation:
        raise HTTPException(
            status_code=404,
            detail="Violation not found"
        )

    return (
        db.query(models.Reinspection)
        .filter(
            models.Reinspection.violation_id == violation_id
        )
        .all()
    )


@app.put(
    "/reinspections/{reinspection_id}/result",
    response_model=schemas.ReinspectionResponse
)
def update_reinspection_result(
    reinspection_id: int,
    update: schemas.ReinspectionResultUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    reinspection = (
        db.query(models.Reinspection)
        .filter(
            models.Reinspection.id == reinspection_id
        )
        .first()
    )

    if not reinspection:
        raise HTTPException(
            status_code=404,
            detail="Re-inspection not found"
        )

    reinspection.result = update.result
    reinspection.notes = update.notes

    violation = (
        db.query(models.Violation)
        .filter(
            models.Violation.id == reinspection.violation_id
        )
        .first()
    )

    if violation:

        if update.result == "Fixed":
            violation.status = "Resolved"

        elif update.result == "Not Fixed":
            violation.status = "Corrective Action Required"

    db.commit()
    db.refresh(reinspection)

    return reinspection


# --------------------------------------------------
# EVIDENCE ROUTES
# --------------------------------------------------

@app.post("/violations/{violation_id}/evidence")
async def upload_violation_evidence(
    violation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector")
    )
):
    violation = (
        db.query(models.Violation)
        .filter(models.Violation.id == violation_id)
        .first()
    )

    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")

    original_name = file.filename or ""
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EVIDENCE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: JPG, JPEG, PNG, WEBP, PDF"
        )

    file_content = await file.read()

    if len(file_content) > MAX_EVIDENCE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10 MB"
        )

    stored_filename = f"{uuid4().hex}{extension}"
    stored_path = EVIDENCE_DIR / stored_filename
    stored_path.write_bytes(file_content)

    violation.evidence_path = f"/evidence/{stored_filename}"

    db.commit()
    db.refresh(violation)

    return {
        "message": "Violation evidence uploaded successfully",
        "violation_id": violation.id,
        "original_filename": original_name,
        "evidence_path": violation.evidence_path
    }


@app.post("/corrective-actions/{action_id}/evidence")
async def upload_corrective_action_evidence(
    action_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin", "Inspector", "Establishment")
    )
):
    action = (
        db.query(models.CorrectiveAction)
        .filter(models.CorrectiveAction.id == action_id)
        .first()
    )

    if not action:
        raise HTTPException(status_code=404, detail="Corrective action not found")

    original_name = file.filename or ""
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EVIDENCE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: JPG, JPEG, PNG, WEBP, PDF"
        )

    file_content = await file.read()

    if len(file_content) > MAX_EVIDENCE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10 MB"
        )

    stored_filename = f"{uuid4().hex}{extension}"
    stored_path = EVIDENCE_DIR / stored_filename
    stored_path.write_bytes(file_content)

    action.evidence_path = f"/evidence/{stored_filename}"

    db.commit()
    db.refresh(action)

    return {
        "message": "Corrective action evidence uploaded successfully",
        "action_id": action.id,
        "original_filename": original_name,
        "evidence_path": action.evidence_path
    }


@app.get("/evidence/{filename}")
def get_evidence(
    filename: str,
    current_user: models.User = Depends(get_current_user)
):
    safe_filename = Path(filename).name
    file_path = EVIDENCE_DIR / safe_filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found")

    return FileResponse(path=file_path, filename=safe_filename)


# --------------------------------------------------
# RISK ROUTES
# --------------------------------------------------

@app.get("/establishments/{establishment_id}/risk")
def get_establishment_risk(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    result = calculate_risk(db, establishment_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return result


# --------------------------------------------------
# INSPECTION PRIORITY ROUTES
# --------------------------------------------------

@app.get("/establishments/{establishment_id}/priority")
def get_establishment_priority(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    result = calculate_priority(
        db,
        establishment_id
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return result


@app.get("/inspection-priority")
def get_inspection_priority(
    db: Session = Depends(get_db)
):
    return get_inspection_priority_list(db)


# --------------------------------------------------
# ML RISK ROUTES
# --------------------------------------------------

@app.get("/establishments/{establishment_id}/ml-risk")
def get_establishment_ml_risk(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    result = predict_ml_risk(
        db,
        establishment_id
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    if "error" in result:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )

    return result


def get_all_ml_risk_predictions(db: Session):
    establishments = (
        db.query(models.Establishment)
        .order_by(models.Establishment.id)
        .all()
    )

    results = []

    for establishment in establishments:
        result = predict_ml_risk(
            db,
            establishment.id
        )

        if result is not None and "error" not in result:
            results.append({
                "establishment_id": establishment.id,
                "establishment_name": establishment.name,
                "region": establishment.region,
                "establishment_type": establishment.establishment_type,
                "current_risk_level": establishment.risk_level,
                "current_risk_score": establishment.risk_score,
                "ml_risk_probability": result["risk_probability"],
                "ml_predicted_risk": result["predicted_risk_level"],
                "predicted_high_risk": result["predicted_high_risk"],
                "top_features": result["top_features"]
            })

    results.sort(
        key=lambda x: x["ml_risk_probability"],
        reverse=True
    )

    return results


@app.get("/ml-risk-overview")
def get_ml_risk_overview(
    db: Session = Depends(get_db)
):
    return get_all_ml_risk_predictions(db)


# --------------------------------------------------
# DASHBOARD ROUTES
# --------------------------------------------------

@app.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db)
):
    return get_dashboard_data(db)


@app.get("/establishments/{establishment_id}/smart-decision")
def get_smart_decision(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    result = calculate_smart_decision(
        db,
        establishment_id
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return result

@app.get("/smart-decision-overview")
def get_smart_decision_overview(
    db: Session = Depends(get_db)
):
    establishments = (
        db.query(models.Establishment)
        .all()
    )

    results = []

    for establishment in establishments:
        result = calculate_smart_decision(
            db,
            establishment.id
        )

        if result is not None:
            results.append(result)

    # Highest inspection priority first
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

    return {
        "total_establishments": len(results),
        "urgent": sum(
            1
            for x in results
            if x["priority"]["level"] == "URGENT"
        ),
        "high": sum(
            1
            for x in results
            if x["priority"]["level"] == "HIGH"
        ),
        "medium": sum(
            1
            for x in results
            if x["priority"]["level"] == "MEDIUM"
        ),
        "low": sum(
            1
            for x in results
            if x["priority"]["level"] == "LOW"
        ),
        "establishments": results
    }

@app.get("/ai/context/establishment/{establishment_id}")
def get_ai_establishment_context(
    establishment_id: int,
    db: Session = Depends(get_db)
):
    result = get_establishment_context(
        db,
        establishment_id
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Establishment not found"
        )

    return result


@app.post("/ai/retrieve")
def retrieve_ai_information(
    payload: dict,
    db: Session = Depends(get_db)
):
    question = payload.get("question")

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question is required"
        )

    return retrieve_ai_context(
        db,
        question
    )
    
@app.post("/ai/ask")
def ask_ai(
    payload: dict,
    db: Session = Depends(get_db)
):
    question = payload.get("question")

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question is required"
        )

    # Step 1: Retrieve relevant information
    retrieved_context = retrieve_ai_context(
        db,
        question
    )

    # Step 2: Generate grounded answer
    ai_result = generate_ai_answer(
        question,
        retrieved_context
    )

    # Step 3: Return both retrieval information
    # and generated answer
    return {
        "question": question,
        "retrieval_type":
            retrieved_context.get(
                "retrieval_type"
            ),
        "answer":
            ai_result.get("answer"),
        "model":
            ai_result.get("model"),
        "grounded":
            ai_result.get("grounded"),
        "success":
            ai_result.get("success")
    }

    # --------------------------------------------------
# AUTHENTICATION ROUTES
# --------------------------------------------------

@app.post("/auth/login")
def login(
    login_data: schemas.LoginRequest,
    db: Session = Depends(get_db)
):

    user = (
        db.query(models.User)
        .filter(
            models.User.username
            == login_data.username
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    access_token = create_access_token(
        user.username,
        user.role
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }


@app.get("/auth/me")
def get_my_profile(
    current_user: models.User = Depends(
        get_current_user
    )
):

    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "is_active": bool(
            current_user.is_active
        )
    }


@app.post(
    "/auth/users",
    response_model=schemas.UserResponse
)
def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin")
    )
):

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.username
            == user_data.username
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    allowed_roles = {
        "Admin",
        "Inspector",
        "Establishment"
    }

    if user_data.role not in allowed_roles:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid role. Allowed roles: "
                "Admin, Inspector, Establishment"
            )
        )

    new_user = models.User(
        username=user_data.username,
        password_hash=hash_password(
            user_data.password
        ),
        role=user_data.role,
        is_active=1
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.get("/auth/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("Admin")
    )
):

    users = (
        db.query(models.User)
        .order_by(models.User.id)
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "is_active": bool(
                user.is_active
            )
        }
        for user in users
    ]