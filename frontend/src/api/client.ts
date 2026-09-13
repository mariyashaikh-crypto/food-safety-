// ---------------------------------------------------------------
// Centralized API client for the Food Safety Inspection Platform.
//
// The backend (FastAPI) is consumed as-is.
// All authenticated requests send the bearer token when a session exists.
// ---------------------------------------------------------------

import type {
  AiAskResponse,
  AiContextResponse,
  CorrectiveAction,
  DashboardData,
  Establishment,
  EstablishmentContext,
  Inspection,
  LoginResponse,
  MlOverviewItem,
  MlRisk,
  PriorityItem,
  Reinspection,
  RiskBreakdown,
  SmartDecision,
  SmartDecisionOverview,
  Violation,
} from './types'

const SESSION_KEY = 'fsa_session_v1'

export interface Session {
  token: string
  user: {
    id: number
    username: string
    role: string
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  )
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export class ApiError extends Error {
  status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}

// ---------------------------------------------------------------
// Standard JSON API request
// ---------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const isForm = options.body instanceof FormData

  if (!isForm && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const session = loadSession()

  if (session) {
    headers.set(
      'Authorization',
      `Bearer ${session.token}`,
    )
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  if (response.status === 401 || response.status === 403) {
    clearSession()

    window.dispatchEvent(
      new Event('fsa:auth-expired'),
    )

    throw new ApiError(
      response.status,
      'Session expired. Please sign in again.',
    )
  }

  const contentType =
    response.headers.get('content-type') || ''

  if (!response.ok) {
    let detail = `Request failed (${response.status})`

    if (contentType.includes('application/json')) {
      const body = await response
        .json()
        .catch(() => null)

      if (
        body &&
        typeof body.detail === 'string'
      ) {
        detail = body.detail
      } else if (
        body &&
        typeof body.detail === 'object'
      ) {
        detail = 'Request validation failed.'
      }
    } else {
      const text = await response
        .text()
        .catch(() => '')

      if (text) {
        detail = text.slice(0, 300)
      }
    }

    throw new ApiError(
      response.status,
      detail,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function post<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function put<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------

export const api = {
  login: (
    username: string,
    password: string,
  ) =>
    post<LoginResponse>(
      '/auth/login',
      { username, password },
    ),

  me: () =>
    request<{
      id: number
      username: string
      role: string
      is_active: boolean
    }>('/auth/me'),

  // -------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------

  dashboard: () =>
    request<DashboardData>('/dashboard'),

  // -------------------------------------------------------------
  // Establishments
  // -------------------------------------------------------------

  establishments: () =>
    request<Establishment[]>('/establishments'),

  establishment: (id: number) =>
    request<Establishment>(
      `/establishments/${id}`,
    ),

  createEstablishment: (body: {
    name: string
    establishment_type: string
    address: string
    region: string
    status: string
    operating_status: string
  }) =>
    post<Establishment>(
      '/establishments',
      body,
    ),

  updateEstablishment: (
    id: number,
    body: {
      name: string
      establishment_type: string
      address: string
      region: string
      status: string
      operating_status: string
    },
  ) =>
    put<Establishment>(
      `/establishments/${id}`,
      body,
    ),

  deleteEstablishment: (id: number) =>
    request<{
      message: string
      id: number
    }>(
      `/establishments/${id}`,
      { method: 'DELETE' },
    ),

  establishmentRisk: (id: number) =>
    request<RiskBreakdown>(
      `/establishments/${id}/risk`,
    ),

  establishmentPriority: (id: number) =>
    request<PriorityItem>(
      `/establishments/${id}/priority`,
    ),

  establishmentMlRisk: (id: number) =>
    request<MlRisk>(
      `/establishments/${id}/ml-risk`,
    ),

  establishmentSmartDecision: (id: number) =>
    request<SmartDecision>(
      `/establishments/${id}/smart-decision`,
    ),

  establishmentContext: (id: number) =>
    request<EstablishmentContext>(
      `/ai/context/establishment/${id}`,
    ),

  // -------------------------------------------------------------
  // Inspections
  // -------------------------------------------------------------

  inspections: () =>
    request<Inspection[]>('/inspections'),

  inspection: (id: number) =>
    request<Inspection>(
      `/inspections/${id}`,
    ),

  inspectionViolations: (id: number) =>
    request<Violation[]>(
      `/inspections/${id}/violations`,
    ),

  createInspection: (body: {
    establishment_id: number
    inspection_date: string
    status: string
    inspector_name?: string | null
    notes?: string | null
    risk_score?: number
  }) =>
    post<Inspection>(
      '/inspections',
      body,
    ),

  updateInspectionStatus: (
    id: number,
    status: string,
  ) =>
    put<Inspection>(
      `/inspections/${id}/status`,
      { status },
    ),

  // -------------------------------------------------------------
  // Violations
  // -------------------------------------------------------------

  violations: () =>
    request<Violation[]>('/violations'),

  violation: (id: number) =>
    request<Violation>(
      `/violations/${id}`,
    ),

  createViolation: (body: {
    inspection_id: number
    establishment_id: number
    category: string
    severity: string
    description: string
    corrective_action?: string | null
    status?: string
  }) =>
    post<Violation>(
      '/violations',
      body,
    ),

  updateViolationStatus: (
    id: number,
    status: string,
  ) =>
    put<Violation>(
      `/violations/${id}/status`,
      { status },
    ),

  // -------------------------------------------------------------
  // Corrective actions
  // -------------------------------------------------------------

  correctiveActions: () =>
    request<CorrectiveAction[]>(
      '/corrective-actions',
    ),

  correctiveAction: (id: number) =>
    request<CorrectiveAction>(
      `/corrective-actions/${id}`,
    ),

  violationCorrectiveActions: (id: number) =>
    request<CorrectiveAction[]>(
      `/violations/${id}/corrective-actions`,
    ),

  createCorrectiveAction: (body: {
    violation_id: number
    action_description: string
    status?: string
  }) =>
    post<CorrectiveAction>(
      '/corrective-actions',
      body,
    ),

  updateCorrectiveActionStatus: (
    id: number,
    body: {
      status: string
      inspector_comment?: string | null
    },
  ) =>
    put<CorrectiveAction>(
      `/corrective-actions/${id}/status`,
      body,
    ),

  // -------------------------------------------------------------
  // Re-inspections
  // -------------------------------------------------------------

  reinspections: () =>
    request<Reinspection[]>(
      '/reinspections',
    ),

  violationReinspections: (id: number) =>
    request<Reinspection[]>(
      `/violations/${id}/reinspections`,
    ),

  createReinspection: (body: {
    violation_id: number
    inspection_date: string
    inspector_name?: string | null
    notes?: string | null
    result?: string
  }) =>
    post<Reinspection>(
      '/reinspections',
      body,
    ),

  updateReinspectionResult: (
    id: number,
    body: {
      result: string
      notes?: string | null
    },
  ) =>
    put<Reinspection>(
      `/reinspections/${id}/result`,
      body,
    ),

  // -------------------------------------------------------------
  // Evidence uploads
  // -------------------------------------------------------------

  uploadViolationEvidence: (
    violationId: number,
    file: File,
  ) => {
    const form = new FormData()
    form.append('file', file)

    return request<{
      message: string
      violation_id: number
      evidence_path: string
    }>(
      `/violations/${violationId}/evidence`,
      {
        method: 'POST',
        body: form,
      },
    )
  },

  uploadCorrectiveActionEvidence: (
    actionId: number,
    file: File,
  ) => {
    const form = new FormData()
    form.append('file', file)

    return request<{
      message: string
      action_id: number
      evidence_path: string
    }>(
      `/corrective-actions/${actionId}/evidence`,
      {
        method: 'POST',
        body: form,
      },
    )
  },

  // -------------------------------------------------------------
  // Priority / ML / smart overviews
  // -------------------------------------------------------------

  inspectionPriority: () =>
    request<PriorityItem[]>(
      '/inspection-priority',
    ),

  mlRiskOverview: () =>
    request<MlOverviewItem[]>(
      '/ml-risk-overview',
    ),

  smartDecisionOverview: () =>
    request<SmartDecisionOverview>(
      '/smart-decision-overview',
    ),

  // -------------------------------------------------------------
  // AI
  // -------------------------------------------------------------

  aiRetrieve: (question: string) =>
    post<AiContextResponse>(
      '/ai/retrieve',
      { question },
    ),

  aiAsk: (question: string) =>
    post<AiAskResponse>(
      '/ai/ask',
      { question },
    ),
}

// ---------------------------------------------------------------
// Evidence URL helpers
// ---------------------------------------------------------------

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000'

export function evidenceUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path
  }

  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`
  }

  return `${API_BASE_URL}/evidence/${path}`
}

export function isPdfUrl(
  path: string,
): boolean {
  return /\.pdf$/i.test(path)
}

/**
 * Fetch an evidence file with the authenticated
 * user's JWT and return a temporary browser URL.
 */
export async function evidenceObjectUrl(
  path: string | null | undefined,
): Promise<string> {
  const url = evidenceUrl(path)

  if (!url) {
    throw new ApiError(
      404,
      'Evidence path is empty.',
    )
  }

  const session = loadSession()

  if (!session) {
    clearSession()

    window.dispatchEvent(
      new Event('fsa:auth-expired'),
    )

    throw new ApiError(
      401,
      'Please sign in again.',
    )
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  })

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    clearSession()

    window.dispatchEvent(
      new Event('fsa:auth-expired'),
    )

    throw new ApiError(
      response.status,
      'Session expired. Please sign in again.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Unable to load evidence (${response.status})`,
    )
  }

  const blob = await response.blob()

  return URL.createObjectURL(blob)
}

