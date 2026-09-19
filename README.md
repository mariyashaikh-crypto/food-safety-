# Intelligent Food Safety Inspection & Risk Management Platform

A local AI-powered platform for managing food safety establishments, inspections, violations, corrective actions, evidence, risk prediction, inspection prioritization, dashboards, and AI-assisted analysis.

> Problem Statement: Intelligent Food Safety Inspection & Risk Management Platform
> Deployment: Local / Offline-capable prototype
> External APIs / Paid Services: Not required

## Overview

The platform connects the complete food-safety inspection workflow:

**Establishment → Historical Data → Risk Analysis → ML Prediction → Inspection Priority → Inspection → Violation → Corrective Action → Evidence → Re-inspection → Resolution → Dashboard + AI Assistant**

The system combines traditional rule-based risk analysis with machine learning and local GenAI to support inspectors and administrators.

## Key Features

### Establishment Management

- Register and manage establishments
- Store establishment type, address, region, and operating status
- View inspection history and current risk status
- Search and filter establishments

### Inspection Management

Supports the inspection lifecycle:

**Scheduled → In Progress → Submitted → Reviewed → Corrective Action Required → Resolved**

Inspectors can schedule inspections, record inspection details, assign inspectors, and track inspection status.

### Violation Management

Supports major food-safety violation categories:

- Improper food storage
- Temperature control
- Poor sanitation
- Pest control
- Cross-contamination
- Expired food
- Unsafe food handling
- Facility hygiene

Each violation stores its category, severity, description, evidence, corrective action, and status.

### Corrective Actions

Complete workflow:

**Violation Detected → Corrective Action Required → Submitted → Inspector Review → Accepted / Rejected → Re-inspection → Closed**

### Evidence Management

Evidence can be uploaded for violations and corrective actions.

Supported formats:

- JPG
- JPEG
- PNG
- WEBP
- PDF

Evidence files are stored locally while their references are maintained in the database.

## Risk Intelligence

The system analyzes:

- Previous violation count
- Critical violations
- High/medium/low severity
- Recurring violations
- Unresolved violations
- Rejected corrective actions
- Days since last inspection
- Establishment type
- Region

It provides:

- Current risk score
- Current risk level
- ML risk probability
- Predicted risk level
- Contributing factors
- Risk rationale

## ML-Based Risk Prediction

The platform uses a **Random Forest** model for predictive risk analysis.

Random Forest is suitable because our data is structured/tabular inspection data containing multiple interacting factors.

### ML Pipeline

**Historical Inspection Data → Feature Engineering → Preprocessing → Random Forest → Risk Probability → Predicted Risk Level**

Example features:

- `total_violations`
- `critical_violations`
- `high_severity_violations`
- `medium_severity_violations`
- `low_severity_violations`
- `recurring_categories`
- `unresolved_violations`
- `rejected_corrective_actions`
- `days_since_last_inspection`
- `establishment_type`
- `region`

Example:

**Demo Fresh Bites 01 → 83.17% predicted high-risk probability**

The ML prediction is kept separate from the operational risk score:

- **Operational Risk Engine:** calculates current risk using defined inspection factors.
- **Random Forest:** learns historical patterns and provides predictive probability.

## Smart Inspection Prioritization

The priority engine considers:

- Current risk
- ML prediction
- Severity
- Recurrence
- Unresolved issues
- Inspection recency

Flow:

Current Risk + ML Prediction + Severity + Recurrence + Unresolved Issues + Inspection Recency → Priority Score → URGENT / HIGH / MEDIUM / LOW

This helps inspectors identify which establishments require earlier attention.

## Local GenAI Assistant

The platform uses:

- Ollama
- Qwen 2.5 3B
- Retrieval-Augmented Generation (RAG)

The model runs locally, so no paid external AI API or API key is required.

### RAG Workflow

**User Question → Retrieve Relevant Database Records → Build Grounded Context → Qwen 2.5 3B → Data-backed Answer**

Example question:

> Why is Demo Fresh Bites 01 high risk?

The system retrieves relevant information such as:

- Current risk score
- Previous violations
- Critical violations
- Recurring categories
- Unresolved violations
- Inspection history
- Corrective-action information

The retrieved records are provided as context to Qwen so the response is grounded in the platform's data.

Example questions:

- Why is Demo Fresh Bites 01 high risk?
- What corrective actions are still pending?
- Which establishments require attention?
- Why should this establishment be inspected?
- What violations are recurring?

The GenAI assistant explains system information and does not replace the official risk calculation or inspector decision.

## Dashboard & Analytics

The dashboard provides:

- Total establishments
- High / medium / low risk distribution
- Upcoming inspections
- Overdue inspections
- Active violations
- Critical violations
- Recurring violation categories
- Inspector workload
- Compliance trends
- Regional distribution
- Risk intelligence
- Inspection priority distribution
- Recent inspections

## Authentication & Security

The application uses JWT authentication and Role-Based Access Control.

### Authentication Flow

User Login → React sends credentials → FastAPI verifies credentials → Password hash verification → JWT token generated → Frontend sends token with protected requests → Backend validates token and role → Authorized operation

Passwords are stored as hashes rather than plain text.

Supported roles include:

- Admin
- Inspector
- Establishment

Protected endpoints verify the user's role before restricted operations are performed.

## Database

The backend uses:

**SQLite + SQLAlchemy ORM**

Main entities:

- User
- Establishment
- Inspection
- Violation
- CorrectiveAction
- Reinspection

Main relationship:

**Establishment → Inspection → Violation → Corrective Action → Re-inspection**

SQLite was selected because it is lightweight, persistent, and suitable for a local prototype. The SQLAlchemy-based architecture allows migration to PostgreSQL later.

## System Architecture

**React Frontend → FastAPI REST API → SQLite + SQLAlchemy**

The intelligence layer consists of:

**FastAPI → Risk Engine → Random Forest → Priority Engine**

and:

**FastAPI → RAG → Ollama → Qwen 2.5 3B**

### Architecture Components

#### Frontend

React + Vite + TypeScript provides the user interface for administrators and inspectors.

#### Backend

FastAPI handles:

- Authentication
- REST APIs
- Validation
- Business logic
- Inspection workflows
- Violation management
- Corrective actions
- Evidence management
- Risk and ML services
- AI assistant requests

#### Database

SQLite stores persistent application data through SQLAlchemy ORM.

#### Risk & ML Layer

The risk engine calculates operational risk while the Random Forest model provides predictive risk probability.

#### GenAI Layer

The RAG engine retrieves relevant records and provides grounded context to Qwen 2.5 3B running locally through Ollama.

## Complete Workflow

**Establishment Registered → Historical Data Stored → Current Risk Calculated → Random Forest Predicts Risk → Priority Engine Calculates Priority → Inspection Scheduled → Inspector Performs Inspection → Violations Recorded → Evidence Uploaded → Corrective Action Submitted → Inspector Reviews → Accepted / Rejected → Re-inspection → Fixed / Not Fixed → Risk Information Updated → Dashboard Updated → GenAI Explains Relevant Records**

## Hybrid Intelligence

Different components have different responsibilities:

| Component | Responsibility |
|---|---|
| Rule-Based Risk Engine | Current operational risk |
| Random Forest | Predictive risk probability |
| Priority Engine | Inspection priority |
| RAG + Qwen | Natural-language explanation |

This keeps the system transparent while adding predictive ML and local GenAI capabilities.

## Evidence Workflow

**Inspection → Violation Detected → Evidence Uploaded → Corrective Action Submitted → Inspector Review → Accepted / Rejected → Re-inspection → Fixed / Not Fixed → Violation Resolved or Remains Open**

## Technology Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- React Router
- Lucide

### Backend

- Python
- FastAPI
- REST APIs
- SQLAlchemy
- Pydantic

### Database

- SQLite
- SQLAlchemy ORM

### Authentication

- JWT
- Password hashing
- Role-Based Access Control

### Machine Learning

- Pandas
- NumPy
- Scikit-learn
- Random Forest
- Joblib

### GenAI

- Ollama
- Qwen 2.5 3B
- Retrieval-Augmented Generation

### Evidence

- FastAPI file uploads
- Local evidence storage
- Image/PDF validation

## Project Structure

    food-safety-platform/
    │
    ├── backend/
    │   ├── main.py
    │   ├── database.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── auth.py
    │   ├── risk_engine.py
    │   ├── priority_engine.py
    │   ├── dashboard_engine.py
    │   ├── ml_risk_engine.py
    │   ├── smart_decision_engine.py
    │   ├── rag_engine.py
    │   ├── ai_engine.py
    │   ├── train_risk_model.py
    │   ├── generate_ml_dataset.py
    │   ├── seed_demo_data.py
    │   └── requirements.txt
    │
    ├── frontend/
    │   ├── src/
    │   │   ├── pages/
    │   │   ├── components/
    │   │   ├── api/
    │   │   ├── auth/
    │   │   ├── context/
    │   │   ├── hooks/
    │   │   └── styles/
    │   └── package.json
    │
    ├── .gitignore
    ├── start.bat
    └── README.md

## Local Setup

### Prerequisites

- Python 3.11+
- Conda
- Node.js
- npm
- Git
- Ollama

### Clone Repository

    git clone https://github.com/mariyashaikh-crypto/food-safety-.git
    cd food-safety-

### Backend Setup

    conda create -n foodsafety python=3.11
    conda activate foodsafety
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload

Backend:

    http://127.0.0.1:8000

Swagger API documentation:

    http://127.0.0.1:8000/docs

### Frontend Setup

Open another terminal:

    cd frontend
    npm install
    npm run dev

### Ollama Setup

    ollama pull qwen2.5:3b
    ollama serve

Ollama runs locally at:

    http://localhost:11434

## API Areas

- `/auth`
- `/establishments`
- `/inspections`
- `/violations`
- `/corrective-actions`
- `/reinspections`
- `/risk`
- `/ml-risk`
- `/priority`
- `/dashboard`
- `/ai`
- `/evidence`

## Data

The application uses realistic synthetic inspection data designed around the problem statement.

The data represents:

- Establishments
- Inspection history
- Violations
- Severity
- Recurrence
- Corrective actions
- Re-inspections
- Risk information
- Regional information

This avoids using confidential government or business records while still allowing the complete application workflow to be demonstrated.

Runtime files such as the SQLite database, uploaded evidence, trained model artifacts, and generated ML datasets are excluded from Git where appropriate through `.gitignore`.

## Backend Data Flow

**User Action → React Request → FastAPI → Validation + Business Logic → SQLAlchemy → SQLite → Risk / ML / Priority Logic → JSON Response → React UI Update**

The application therefore uses backend APIs and persistent database operations rather than relying only on hardcoded frontend values.

## Demo Highlights

- Secure login
- JWT authentication
- Role-based access control
- Establishment registration
- Establishment directory
- Inspection scheduling
- Inspection records
- Violation tracking
- Corrective-action workflow
- Evidence upload and review
- Re-inspection workflow
- Risk intelligence
- Random Forest risk prediction
- ML probability
- Smart inspection prioritization
- Dashboard analytics
- Local RAG-based GenAI
- Qwen 2.5 3B through Ollama
- Evidence-backed resolution tracking

## Future Scope

- PostgreSQL production deployment
- Geospatial risk heatmaps
- Automatic inspection scheduling
- Inspector workload balancing
- OCR for inspection documents
- Computer-vision-based hygiene analysis
- Advanced notifications
- Automated reports
- Larger authorized real-world datasets
- Model monitoring and retraining
- Multilingual AI assistance
- Cloud deployment where permitted

## Project Objective

The objective is to provide one intelligent platform that moves food safety teams from:

**Inspection Data → Risk Intelligence → ML Prediction → Inspection Priority → Violation Tracking → Corrective Action → Evidence Review → Re-inspection → Resolution**

while using machine learning for predictive risk analysis and local GenAI for grounded explanations from the system's actual records.

## License

This project was developed as a hackathon/prototype solution for demonstrating an intelligent food safety inspection and risk management workflow.
