import type { ReactNode } from 'react'

type Tone = 'neutral' | 'gray' | 'red' | 'red-solid' | 'amber' | 'green' | 'blue' | 'violet'

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

export function toneForRisk(level: string | null | undefined): Tone {
  switch ((level || '').toUpperCase()) {
    case 'HIGH':
    case 'URGENT':
    case 'CRITICAL':
      return 'red'
    case 'MEDIUM':
      return 'amber'
    case 'LOW':
      return 'green'
    default:
      return 'neutral'
  }
}

/** Risk level: HIGH / MEDIUM / LOW */
export function RiskBadge({ level }: { level: string | null | undefined }) {
  const tone = toneForRisk(level)
  return (
    <Badge tone={tone} dot>
      {level ?? '—'}
    </Badge>
  )
}

/** Priority level: URGENT / HIGH / MEDIUM / LOW */
export function PriorityBadge({ level }: { level: string | null | undefined }) {
  const lvl = (level || '').toUpperCase()
  return (
    <Badge tone={lvl === 'URGENT' ? 'red' : lvl === 'HIGH' ? 'amber' : lvl === 'MEDIUM' ? 'blue' : 'gray'}>
      {level ?? '—'}
    </Badge>
  )
}

/** Violation severity: Critical / High / Medium / Low */
export function SeverityBadge({ level }: { level: string | null | undefined }) {
  const lvl = (level || '').toUpperCase()
  const tone: Tone =
    lvl === 'CRITICAL' ? 'red-solid' : lvl === 'HIGH' ? 'amber' : lvl === 'MEDIUM' ? 'blue' : 'gray'
  return <Badge tone={tone}>{level ?? '—'}</Badge>
}

const STATUS_TONE: Record<string, Tone> = {
  RESOLVED: 'green',
  CLOSED: 'green',
  ACCEPTED: 'green',
  FIXED: 'green',
  COMPLETED: 'green',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'blue',
  REVIEWED: 'blue',
  SCHEDULED: 'blue',
  IN_PROGRESS: 'amber',
  PENDING: 'gray',
  OPEN: 'amber',
  'CORRECTIVE ACTION REQUIRED': 'amber',
  'RE-INSPECTION REQUIRED': 'amber',
  REJECTED: 'red',
  'NOT FIXED': 'red',
  ACTIVE: 'green',
  INACTIVE: 'gray',
}

/** Workflow status badge for violations / actions / inspections / reinspections */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="gray">—</Badge>
  const key = status.toUpperCase()
  const tone: Tone = STATUS_TONE[key] ?? (key.startsWith('REQUIRED') ? 'amber' : 'neutral')
  return <Badge tone={tone}>{status}</Badge>
}