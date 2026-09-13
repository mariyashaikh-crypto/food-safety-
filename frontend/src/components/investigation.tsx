import { Fragment, type ReactNode, useEffect, useState } from 'react'
import { evidenceObjectUrl, isPdfUrl } from '../api/client'
import { Icon } from './icons'

export function InvestigationSection({
  index,
  title,
  hint,
  actions,
  children,
}: {
  index?: number
  title: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="inv-section">
      <div className="inv-section-head">
        {index != null && <span className="inv-index">{String(index).padStart(2, '0')}</span>}
        <div className="inv-head-text">
          <h2 className="inv-title">{title}</h2>
          {hint && <div className="section-hint">{hint}</div>}
        </div>
        {actions && <div className="inv-actions">{actions}</div>}
      </div>
      <div className="inv-section-body">{children}</div>
    </section>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="page-kicker">{children}</div>
}

export function RiskReadout({ children }: { children: ReactNode }) {
  return <div className="risk-readout">{children}</div>
}

export function RiskCell({
  label,
  children,
  tone = 'graphite',
}: {
  label: string
  children: ReactNode
  tone?: 'red' | 'amber' | 'green' | 'blue' | 'graphite'
}) {
  return (
    <div className={`risk-cell risk-cell--${tone}`}>
      <div className="risk-cell-label">{label}</div>
      <div className="risk-cell-value">{children}</div>
    </div>
  )
}

export function EvidenceViewer({
  path,
  label = 'Evidence',
  size,
}: {
  path: string | null | undefined
  label?: string
  size?: 'sm' | 'md'
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    if (!path) {
      setUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setUrl(null)

    evidenceObjectUrl(path)
      .then((result) => {
        if (cancelled) {
          URL.revokeObjectURL(result)
          return
        }
        objectUrl = result
        setUrl(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load evidence')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  if (!path) return <span className="no-evidence">No evidence recorded</span>

  if (loading) return <span className="no-evidence">Loading evidence…</span>

  if (error) {
    return (
      <span className="no-evidence" title={error} style={{ color: 'var(--red-ink)' }}>
        Evidence unavailable
      </span>
    )
  }

  if (!url) return <span className="no-evidence">No evidence recorded</span>

  if (isPdfUrl(path)) {
    return (
      <a className="ev-file" href={url} target="_blank" rel="noreferrer">
        <Icon.File />
        <span>{label}</span>
      </a>
    )
  }

  return (
    <a
      className={`ev-thumb ${size === 'sm' ? 'ev-thumb--sm' : ''}`}
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Open ${label}`}
    >
      <img src={url} alt={label} />
    </a>
  )
}

export function ChainSteps({
  steps,
}: {
  steps: { label: string; tone?: 'ok' | 'warn' | 'bad' | 'idle' }[]
}) {
  return (
    <div className="chain">
      {steps.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="chain-arrow">
              <Icon.ArrowRight />
            </span>
          )}
          <span className={`chain-step chain-step--${s.tone ?? 'idle'}`}>{s.label}</span>
        </Fragment>
      ))}
    </div>
  )
}

export function FactorBar({
  label,
  value,
  tone,
  pct,
}: {
  label: ReactNode
  value: ReactNode
  tone?: 'red' | 'amber' | 'green' | 'blue' | 'graphite'
  pct: number
}) {
  return (
    <div className="factor-bar">
      <div className="fb-label">{label}</div>
      <div className="bar-track">
        <div
          className={`bar-fill ${tone && tone !== 'graphite' ? `bar-fill--${tone}` : 'bar-fill--graphite'}`}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
      <div className="fb-value">{value}</div>
    </div>
  )
}
