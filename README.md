Food Safety Intelligence Platform

An AI-powered Food Safety Inspection and Risk Management Platform that helps food safety teams manage establishments, inspections, violations, corrective actions, evidence, re-inspections, risk prediction, and inspection prioritization through one connected workflow.

Overview

The platform combines rule-based risk analysis, machine learning, local Generative AI, RAG, evidence management, and operational dashboards.

Its goal is to transform food safety inspection from a reactive manual process into a data-driven, risk-based, explainable, and AI-assisted workflow.

Core Workflow

Establishment Added
        |
        v
Historical Data Recorded
        |
        v
Risk Prediction
        |
        v
Inspection Priority Generated
        |
        v
Inspector Assigned
        |
        v
Inspection Conducted
        |
        v
Violations Recorded
        |
        v
Evidence Uploaded
        |
        v
Corrective Action Required
        |
        v
Corrective Evidence Submitted
        |
        v
Inspector Review
        |
        +------ Rejected ------> Corrective Action Resubmitted
        |
        v
Corrective Action Accepted
        |
        v
Re-inspection
        |
        +------ Issue Remains ------> Further Action
        |
        v
Violation Resolved
        |
        v
Risk Recalculated
        |
        v
Dashboard Updated
        |
        v
Grounded GenAI Explanation

Key Capabilities

1. Establishment Management

Manage food establishments with:

Establishment name

Establishment type

Address

Region

Operating status

Current risk status

Risk score

Last inspection date

Inspection history

Supported establishment types can include:

Restaurants

Food Trucks

Cafeterias

Hotels

Institutional Kitchens

Other food service establishments

2. Inspection Management

Manage the complete inspection lifecycle.

Scheduled
    |
    v
In Progress
    |
    v
Submitted
    |
    v
Reviewed
    |
    v
Corrective Action Required
    |
    v
Resolved

Each inspection can contain:

Establishment

Inspection date

Inspector

Status

Notes

Inspection risk score

Associated violations

The platform also supports historical inspection records, upcoming inspections, overdue inspections, and re-inspections.

3. Violation Management

The platform supports major food safety violation categories including:

Improper Food Storage

Temperature Control

Poor Sanitation

Pest Activity

Cross-Contamination

Expired Food

Unsafe Food Handling

Facility Hygiene

Each violation contains:

Category

Severity

Description

Evidence

Corrective action

Resolution status

Associated inspection

Associated establishment

Severity levels:

Critical
High
Medium
Low

Complete Application Workflow

The application connects every stage of the food safety process:

Establishment
     |
     v
Historical Inspection Data
     |
     v
Risk Assessment
     |
     v
ML Risk Prediction
     |
     v
Smart Inspection Priority
     |
     v
Inspection
     |
     v
Violation Detection
     |
     v
Evidence
     |
     v
Corrective Action
     |
     v
Inspector Review
     |
     +------ Rejected ------+
     |                      |
     |                      v
     |               Evidence Resubmission
     |                      |
     +----------------------+
     |
     v
Accepted
     |
     v
Re-inspection
     |
     v
Resolution
     |
     v
Risk Recalculation
     |
     v
Dashboard
     |
     v
Grounded AI Explanation

System Architecture

                    +----------------------+
                    |     React Frontend   |
                    | Vite + TypeScript    |
                    +----------+-----------+
                               |
                               | REST API
                               v
                    +----------------------+
                    |       FastAPI        |
                    |     Backend API      |
                    +----------+-----------+
                               |
             +-----------------+------------------+
             |                 |                  |
             v                 v                  v
      +-------------+   +-------------+   +-------------+
      |   SQLite    |   | Risk Engine |   | Dashboard   |
      |  Database   |   |  + ML Model |   |   Engine    |
      +-------------+   +------+------+   +-------------+
                               |
                               v
                       +---------------+
                       | Priority /    |
                       | Decision      |
                       | Engine        |
                       +-------+-------+
                               |
                               v
                       +---------------+
                       | RAG Retrieval |
                       | System Data   |
                       +-------+-------+
                               |
                               v
                       +---------------+
                       | Ollama        |
                       | Qwen 2.5 3B   |
                       +-------+-------+
                               |
                               v
                       +---------------+
                       | Grounded AI   |
                       | Assistant     |
                       +---------------+

AI and ML Architecture

The platform uses multiple AI/ML layers with separate responsibilities.

Historical Inspection Data
          |
          v
Feature Engineering
          |
          v
Data Preprocessing
          |
          v
Machine Learning Model
          |
          v
Risk Probability
          |
          v
Predicted Risk Level
          |
          v
Smart Inspection Priority
          |
          v
Inspector Decision Support

The responsibilities are intentionally separated:

ML Model
   |
   +--> Predicts risk

Risk Engine
   |
   +--> Calculates current risk

Smart Decision Engine
   |
   +--> Prioritizes inspections

GenAI + RAG
   |
   +--> Explains system information

The language model is not treated as the official risk-scoring authority.

Risk Scoring

The platform calculates establishment risk using historical and operational factors.

Important factors include:

Total previous violations

Critical violations

High-severity violations

Medium-severity violations

Low-severity violations

Recurring violation categories

Unresolved violations

Rejected corrective actions

Days since last inspection

Establishment type

Region

The system produces:

Risk Score
Risk Level
Risk Factors
Historical Context
Reasons

Example

Establishment:
Demo Fresh Bites 01

Current Risk Score:
100

Current Risk Level:
HIGH

Historical Violations:
12

Critical Violations:
2

High-Severity Violations:
6

Unresolved Violations:
3

Recurring Categories:
3

Rejected Corrective Actions:
2

Days Since Last Inspection:
95

Machine Learning Risk Prediction

The machine learning layer provides an additional predictive risk signal.

Example feature set:

total_violations
critical_violations
high_severity_violations
medium_severity_violations
low_severity_violations
recurring_categories
unresolved_violations
rejected_corrective_actions
days_since_last_inspection
establishment_type
region

Pipeline:

Historical Inspection Data
        |
        v
Feature Engineering
        |
        v
Preprocessing
        |
        v
ML Model
        |
        v
Risk Probability
        |
        v
Predicted Risk Level

Implementation uses:

Pandas

NumPy

Scikit-learn

Joblib

The model can provide:

Risk probability

Predicted risk level

Input features

Top contributing features

Example

Demo Fresh Bites 01

ML Risk Probability:
83.17%

Predicted Risk Level:
HIGH

Smart Inspection Prioritization

Risk prediction alone is not enough to determine which establishment should be inspected first.

The Smart Decision Engine combines:

Current risk

ML prediction

Critical/high severity

Recurring violations

Unresolved violations

Rejected corrective actions

Inspection recency

Current Risk
     +
ML Prediction
     +
Severity
     +
Recurrence
     +
Unresolved Issues
     +
Inspection Recency
     |
     v
Priority Score
     |
     v
Priority Level
     |
     v
Inspection Recommendation

Priority levels:

URGENT
HIGH
MEDIUM
LOW

Example:

Establishment:
Demo Fresh Bites 01

Priority Score:
100

Priority:
URGENT

Recommendation:
Inspect immediately

Inspection Lifecycle

The platform supports a complete inspection lifecycle:

Scheduled
    |
    v
In Progress
    |
    v
Submitted
    |
    v
Reviewed
    |
    v
Corrective Action Required
    |
    v
Resolved

The system maintains relationships between:

Establishment
    |
    +--- Inspection
            |
            +--- Violations
                    |
                    +--- Corrective Actions
                            |
                            +--- Re-inspection

This makes it possible to trace an issue from its original inspection through evidence, corrective action, review, re-inspection, and final resolution.

Violation Management

Violations are directly linked to establishments and inspections.

Example:

Category:
Temperature Control

Severity:
High

Description:
Food storage temperature was outside the recommended safe range.

Corrective Action:
Correct the temperature control issue and submit supporting evidence.

Status:
Resolved

Violation records support:

Severity tracking

Recurrence analysis

Corrective action tracking

Evidence attachment

Resolution tracking

Re-inspection

Corrective Action Workflow

Violation Detected
        |
        v
Corrective Action Required
        |
        v
Evidence Submitted
        |
        v
Inspector Review
        |
        +----------+
        |          |
        v          v
    Accepted    Rejected
        |          |
        v          v
 Re-inspection  Resubmission
        |          |
        +----------+
        |
        v
Resolved

Each corrective action can contain:

Action description

Supporting evidence

Status

Inspector comment

Related violation

Supported states include:

Required
Submitted
Accepted
Rejected

Evidence Management

The platform supports evidence submission for violations and corrective actions.

Supported file types:

JPG
JPEG
PNG
WEBP
PDF

Evidence can be associated with:

Violations

Corrective actions

Example evidence:

temperature_log.jpg
storage_area.jpg
sanitation_report.pdf
corrective_action_evidence.jpg

Evidence is stored locally and accessed through authenticated backend routes.

The system does not require external cloud storage for evidence.

Dashboard and Analytics

The dashboard provides a centralized operational view.

Key metrics include:

Total establishments

Risk distribution

High-risk establishments

Upcoming inspections

Overdue inspections

Active violations

Critical violations

Recurring violation categories

Inspector workload

Compliance trends

Geographic distribution of high-risk establishments

The dashboard helps answer:

What is happening?
Where is the risk?
Which establishments need attention?
Which violations are recurring?
Which inspections are overdue?
How is compliance changing?

GenAI and RAG

The platform includes a locally hosted Generative AI assistant.

Technology:

Ollama
   +
Qwen 2.5 3B
   +
RAG

The assistant retrieves relevant application records before generating an answer.

Architecture:

User Question
      |
      v
Question Analysis
      |
      v
Relevant System Records Retrieved
      |
      v
Grounded Context Built
      |
      v
Ollama
      |
      v
Qwen 2.5 3B
      |
      v
Grounded Response

The assistant can retrieve:

Establishment information

Inspection history

Violations

Severity

Corrective actions

Re-inspection results

Risk information

Inspection priority

Example Query

Why is Demo Fresh Bites 01 high risk and why should it be inspected immediately?

Relevant information can include:

Current Risk:
HIGH

Risk Score:
100

Total Violations:
12

Critical Violations:
2

Unresolved Violations:
3

Recurring Categories:
Temperature Control
Expired Food
Improper Food Storage

Days Since Last Inspection:
95

The assistant can then provide a grounded explanation for the recommendation.

The API response can identify whether the generated answer was successfully grounded.

Local AI Architecture

The AI stack can run locally:

Application
     |
     v
FastAPI
     |
     v
RAG Retrieval
     |
     v
Ollama
     |
     v
Qwen 2.5 3B

Advantages:

Local inference

Data privacy

Offline-capable AI architecture

No per-request cloud AI charges

No external AI API key

Greater control over application data

Authentication and RBAC

The backend implements JWT-based authentication.

Login
  |
  v
Credentials Verified
  |
  v
JWT Token Generated
  |
  v
Authenticated API Requests

Example roles:

Admin
Inspector
Establishment

Role-based permissions can protect:

Establishment management

Inspection management

Violation management

Corrective actions

Evidence submission

Re-inspection

AI assistant access

Technology Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

Recharts

React Router

Lucide Icons

Backend

Python

FastAPI

SQLAlchemy

Pydantic

REST APIs

Database

SQLite

SQLAlchemy ORM

Machine Learning

Pandas

NumPy

Scikit-learn

Joblib

Generative AI

Ollama

Qwen 2.5 3B

Retrieval-Augmented Generation

Local inference

Security

JWT Authentication

Role-Based Access Control

Password hashing

Authenticated evidence access

Evidence

FastAPI multipart uploads

Local evidence storage

Image/PDF support

Project Structure

food-safety-platform/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   │
│   ├── risk_engine.py
│   ├── ml_risk_engine.py
│   ├── priority_engine.py
│   ├── smart_decision_engine.py
│   ├── dashboard_engine.py
│   │
│   ├── ai_engine.py
│   ├── rag_engine.py
│   │
│   ├── generate_ml_dataset.py
│   ├── train_risk_model.py
│   ├── test_ml_risk.py
│   ├── seed_demo_data.py
│   ├── create_admin.py
│   │
│   ├── model_metadata.json
│   ├── requirements.txt
│   └── backend-start.bat
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layout/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── .gitignore
├── start.bat
└── README.md

Prerequisites

Required

Windows 10/11

Git

Anaconda or Miniconda

Python 3.11+

Node.js 18+

npm

Optional for GenAI

Ollama

Qwen 2.5 3B model

Installation

Clone the repository:

git clone https://github.com/mariyashaikh-crypto/food-safety-.git
cd food-safety-

Backend Setup

Create the Conda environment:

conda create -n foodsafety python=3.11

Activate it:

conda activate foodsafety

Navigate to the backend:

cd backend

Install dependencies:

pip install -r requirements.txt

Start the API:

uvicorn main:app --reload

Backend:

http://127.0.0.1:8000

Swagger documentation:

http://127.0.0.1:8000/docs

Database

The application uses SQLite for local development and demonstration.

The database stores:

Users

Establishments

Inspections

Violations

Corrective actions

Re-inspections

The database is generated locally and is excluded from version control.

Demo Data

The project includes scripts for generating demonstration data.

python seed_demo_data.py

The demo data can contain establishments with different:

Risk levels

Violation histories

Severity levels

Recurring violations

Corrective-action states

Inspection dates

Re-inspection results

This allows the dashboard, risk engines, and AI assistant to demonstrate realistic decision-support scenarios.

Machine Learning Setup

Generate training data:

python generate_ml_dataset.py

Train the risk model:

python train_risk_model.py

Test the ML risk engine:

python test_ml_risk.py

Model metadata is stored in:

backend/model_metadata.json

Generated model/data artifacts can be kept local and excluded from Git where appropriate.

Frontend Setup

From the project root:

cd frontend
npm install
npm run dev

Open the Vite development URL displayed in the terminal.

GenAI Setup

Install Ollama, then pull the local model:

ollama pull qwen2.5:3b

The application uses the local Ollama service for GenAI.

No external AI API key is required.

Example Decision

For an establishment such as Demo Fresh Bites 01, the platform can identify:

12 total violations
2 critical violations
6 high-severity violations
3 unresolved violations
3 recurring categories
2 rejected corrective actions
95 days since last inspection

The system can produce:

Current Risk:
HIGH

Risk Score:
100

ML Risk Probability:
83.17%

ML Risk Level:
HIGH

Priority:
URGENT

Recommendation:
Inspect immediately

The GenAI assistant can then explain the decision using the underlying system records.

Security and Data Handling

The platform follows a local-first architecture for demonstration and development.

Authentication protects sensitive API operations

JWT tokens are used for authenticated requests

RBAC controls role-specific operations

Evidence access is authenticated

Uploaded filenames are handled safely

Evidence file types and sizes are validated

SQLite data remains local

GenAI processing can remain local through Ollama

Design Principles

The project is built around:

Risk-based inspection — prioritize establishments that require attention.

Explainability — provide reasons behind risk and inspection decisions.

Human-in-the-loop decisions — AI supports inspectors rather than replacing them.

Evidence-based compliance — corrective actions are supported by submitted evidence.

Traceability — connect establishments, inspections, violations, actions, and re-inspections.

Local-first AI — use local inference instead of requiring paid external AI APIs.

Separation of responsibilities — risk scoring, ML prediction, prioritization, and GenAI explanation have distinct roles.

Future Scope

Potential extensions include:

Geospatial risk heatmaps

Automatic inspection scheduling

Inspector workload balancing

OCR-based document extraction

Image-based hygiene analysis

Automated inspection report generation

Notifications and reminders

What-if risk simulations

Advanced predictive models

Integration with external food safety or regulatory systems

Project Goal

The Food Safety Intelligence Platform aims to help inspection teams move from simply recording violations to predicting risk, prioritizing inspections, tracking corrective actions, verifying resolution, and explaining decisions with grounded AI.

Predict risk. Prioritize inspections. Track corrective actions. Verify compliance. Explain decisions.
