// ---------------------------------------------------------------
// TypeScript types mirroring the Food Safety Inspection Platform
// backend API contract (see backend/schemas.py + engine modules).
// Backend is the source of truth; these reflect its responses.
// ---------------------------------------------------------------

export type Role = 'Admin' | 'Inspector' | 'Establishment'

export interface SessionUser {
  id: number
  username: string
  role: Role
  is_active?: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  user: SessionUser
}

export interface Establishment {
  id: number
  name: string
  establishment_type: string
  address: string
  region: string
  status: string
  risk_score: number
  risk_level: string
  last_inspection_date: string | null
  operating_status: string
}

export interface Inspection {
  id: number
  establishment_id: number
  inspection_date: string
  status: string
  inspector_name: string | null
  notes: string | null
  risk_score: number
}

export interface Violation {
  id: number
  inspection_id: number
  establishment_id: number
  category: string
  severity: string
  description: string
  corrective_action: string | null
  status: string
  evidence_path: string | null
}

export interface CorrectiveAction {
  id: number
  violation_id: number
  action_description: string
  evidence_path: string | null
  status: string
  inspector_comment: string | null
}

export interface Reinspection {
  id: number
  violation_id: number
  inspection_date: string
  inspector_name: string | null
  notes: string | null
  result: string
}

// ---------------- Dashboard ----------------

export interface DashboardSummary {
  total_establishments: number
  high_risk_establishments: number
  medium_risk_establishments: number
  low_risk_establishments: number
  upcoming_inspections: number
  overdue_inspections: number
  active_violations: number
  critical_violations: number
}

export interface RiskDistributionEntry {
  risk_level: string
  count: number
}

export interface RecurringViolation {
  category: string
  count: number
}

export interface InspectorWorkload {
  inspector: string
  assigned_inspections: number
}

export interface RegionalRisk {
  region: string
  establishments: number
  high_risk: number
  medium_risk: number
  low_risk: number
  average_risk: number
}

export interface DashboardData {
  summary: DashboardSummary
  risk_distribution: RiskDistributionEntry[]
  recurring_violations: RecurringViolation[]
  inspector_workload: InspectorWorkload[]
  regional_risk: RegionalRisk[]
}

// ---------------- Risk / ML / Priority ----------------

export interface RiskBreakdown {
  establishment_id: number
  risk_score: number
  risk_level: string
  total_violations: number
  critical_violations: number
  high_severity_violations: number
  recurring_categories: string[]
  unresolved_violations: number
  rejected_corrective_actions: number
  days_since_last_inspection: number | null
  reasons: string[]
}

export interface FeatureImportance {
  feature: string
  importance: number
}

export interface MlRisk {
  establishment_id: number
  predicted_high_risk: boolean
  risk_probability: number
  predicted_risk_level: string
  features: Record<string, number | string>
  top_features: FeatureImportance[]
}

export interface PriorityItem {
  establishment_id: number
  establishment_name: string
  risk_score: number
  risk_level: string
  priority_score: number
  priority_level: string
  reasons: string[]
  rank?: number
}

export interface MlOverviewItem {
  establishment_id: number
  establishment_name: string
  region: string
  establishment_type: string
  current_risk_level: string
  current_risk_score: number
  ml_risk_probability: number
  ml_predicted_risk: string
  predicted_high_risk: boolean
  top_features: FeatureImportance[]
}

export interface SmartDecisionFactors {
  total_violations: number
  critical_violations: number
  high_severity_violations: number
  unresolved_violations: number
  recurring_categories: string[]
  days_since_last_inspection: number | null
}

export interface SmartDecision {
  establishment_id: number
  establishment_name: string
  region: string
  establishment_type: string
  current_risk: { score: number; level: string }
  ml_prediction: { probability: number | null; risk_level: string | null }
  priority: { score: number; level: string }
  recommendation: string
  factors: SmartDecisionFactors
  reasons: string[]
}

export interface SmartDecisionOverview {
  total_establishments: number
  urgent: number
  high: number
  medium: number
  low: number
  establishments: SmartDecision[]
}

// ---------------- Establishment context (rich detail view) ----------------

export interface ContextAction {
  id: number
  status: string
  description: string
  evidence: string | null
  inspector_comment: string | null
}

export interface ContextReinspection {
  id: number
  date: string
  inspector: string | null
  result: string
  notes: string | null
}

export interface ContextViolation {
  id: number
  inspection_id: number
  category: string
  severity: string
  description: string
  status: string
  evidence: string | null
  corrective_action_required: string | null
  corrective_actions: ContextAction[]
  reinspections: ContextReinspection[]
}

export interface ContextInspection {
  id: number
  date: string
  status: string
  inspector: string | null
  notes: string | null
  risk_score: number
}

export interface EstablishmentContext {
  establishment: {
    id: number
    name: string
    type: string
    address: string
    region: string
    status: string
    operating_status: string
    current_risk_score: number
    current_risk_level: string
    last_inspection_date: string | null
  }
  inspection_history: ContextInspection[]
  violations: ContextViolation[]
  smart_decision: SmartDecision
}

// ---------------- AI ----------------

export interface AiContextResponse {
  retrieval_type: string
  question: string
  context: Record<string, unknown>
}

export interface AiAskResponse {
  question: string
  retrieval_type: string | null
  answer: string
  model: string
  grounded: boolean | null
  success: boolean | null
}

export interface ApiError {
  status: number
  detail: string
}