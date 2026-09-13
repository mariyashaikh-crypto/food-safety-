from pydantic import BaseModel
from typing import Optional
from datetime import date


# --------------------------------------------------
# ESTABLISHMENT SCHEMAS
# --------------------------------------------------

class EstablishmentCreate(BaseModel):
    name: str
    establishment_type: str
    address: str
    region: str
    status: str = "Active"
    operating_status: str = "Open"


class EstablishmentResponse(BaseModel):
    id: int
    name: str
    establishment_type: str
    address: str
    region: str
    status: str
    risk_score: float
    risk_level: str
    last_inspection_date: Optional[date] = None
    operating_status: str

    class Config:
        from_attributes = True


# --------------------------------------------------
# INSPECTION SCHEMAS
# --------------------------------------------------

class InspectionCreate(BaseModel):
    establishment_id: int
    inspection_date: date
    status: str = "Scheduled"
    inspector_name: Optional[str] = None
    notes: Optional[str] = None
    risk_score: float = 0.0


class InspectionResponse(BaseModel):
    id: int
    establishment_id: int
    inspection_date: date
    status: str
    inspector_name: Optional[str]
    notes: Optional[str]
    risk_score: float

    class Config:
        from_attributes = True


class InspectionStatusUpdate(BaseModel):
    status: str


# --------------------------------------------------
# VIOLATION SCHEMAS
# --------------------------------------------------

class ViolationCreate(BaseModel):
    inspection_id: int
    establishment_id: int

    category: str
    severity: str

    description: str
    corrective_action: Optional[str] = None

    status: str = "Open"
    evidence_path: Optional[str] = None


class ViolationResponse(BaseModel):
    id: int
    inspection_id: int
    establishment_id: int

    category: str
    severity: str

    description: str
    corrective_action: Optional[str]

    status: str
    evidence_path: Optional[str]

    class Config:
        from_attributes = True


class ViolationStatusUpdate(BaseModel):
    status: str


# --------------------------------------------------
# CORRECTIVE ACTION SCHEMAS
# --------------------------------------------------

class CorrectiveActionCreate(BaseModel):
    violation_id: int

    action_description: str

    evidence_path: Optional[str] = None

    status: str = "Required"


class CorrectiveActionResponse(BaseModel):
    id: int
    violation_id: int

    action_description: str
    evidence_path: Optional[str]

    status: str
    inspector_comment: Optional[str]

    class Config:
        from_attributes = True


class CorrectiveActionUpdate(BaseModel):
    status: str
    inspector_comment: Optional[str] = None

    # --------------------------------------------------
# RE-INSPECTION SCHEMAS
# --------------------------------------------------

class ReinspectionCreate(BaseModel):
    violation_id: int
    inspection_date: date
    inspector_name: Optional[str] = None
    notes: Optional[str] = None
    result: str = "Pending"


class ReinspectionResponse(BaseModel):
    id: int
    violation_id: int
    inspection_date: date
    inspector_name: Optional[str]
    notes: Optional[str]
    result: str

    class Config:
        from_attributes = True


class ReinspectionResultUpdate(BaseModel):
    result: str
    notes: Optional[str] = None

# --------------------------------------------------
# AUTHENTICATION SCHEMAS
# --------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "Inspector"


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: int

    class Config:
        from_attributes = True