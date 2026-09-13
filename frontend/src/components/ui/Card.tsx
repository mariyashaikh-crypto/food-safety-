import type { CSSProperties, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  pad = false,
  style,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
  style?: CSSProperties
}) {
  return (
    <div className={`card ${pad ? 'card-pad' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function SectionHeader({
  title,
  hint,
  actions,
}: {
  title: ReactNode
  hint?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="section-head">
      <div>
        <div className="section-title">{title}</div>
        {hint && <div className="section-hint">{hint}</div>}
      </div>
      {actions}
    </div>
  )
}

export function StatCard({
  label,
  value,
  tone = 'gray',
  note,
}: {
  label: string
  value: ReactNode
  tone?: 'red' | 'amber' | 'green' | 'blue' | 'gray'
  note?: ReactNode
}) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}