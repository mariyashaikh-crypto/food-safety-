from sqlalchemy import Column, Integer, String, Float, Date, Text
from database import Base


class Establishment(Base):
    __tablename__ = "establishments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    establishment_type = Column(String, nullable=False)
    address = Column(String, nullable=False)
    region = Column(String, nullable=False)
    status = Column(String, default="Active")

    risk_score = Column(Float, default=0.0)
    risk_level = Column(String, default="LOW")

    last_inspection_date = Column(Date, nullable=True)
    operating_status = Column(String, default="Open")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    establishment_id = Column(Integer, nullable=False)

    inspection_date = Column(Date, nullable=False)
    status = Column(String, default="Scheduled")

    inspector_name = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    risk_score = Column(Float, default=0.0)


class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, nullable=False)
    establishment_id = Column(Integer, nullable=False)

    category = Column(String, nullable=False)
    severity = Column(String, nullable=False)

    description = Column(Text, nullable=False)
    corrective_action = Column(Text, nullable=True)

    status = Column(String, default="Open")
    evidence_path = Column(String, nullable=True)


class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, nullable=False)

    action_description = Column(Text, nullable=False)
    evidence_path = Column(String, nullable=True)

    status = Column(String, default="Required")
    inspector_comment = Column(Text, nullable=True)


class Reinspection(Base):
    __tablename__ = "reinspections"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, nullable=False)

    inspection_date = Column(Date, nullable=False)
    inspector_name = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    result = Column(String, default="Pending")

# --------------------------------------------------
# USER / AUTHENTICATION MODEL
# --------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=False,
        default="Inspector"
    )

    is_active = Column(
        Integer,
        default=1
    )