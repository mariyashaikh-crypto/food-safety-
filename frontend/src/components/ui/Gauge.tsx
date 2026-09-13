import type { ReactNode } from 'react'

export function scoreTone(score: number | null | undefined): 'red' | 'amber' | 'green' {
  if (score == null) return 'green'
  if (score >= 70) return 'red'
  if (score >= 40) return 'amber'
  return 'green'
}

export function scoreColor(score: number | null | undefined): string {
  const tone = scoreTone(score)
  return tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--green)'
}

/** Compact 0-100 ring gauge used for current risk score */
export function ScoreGauge({
  score,
  size = 74,
  stroke = 7,
  label,
  sub,
}: {
  score: number | null | undefined
  size?: number
  stroke?: number
  label?: ReactNode
  sub?: string
}) {
  const value = score ?? 0
  const color = scoreColor(score)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(Math.max(value, 0), 100) / 100)

  return (
    <div className="gauge" style={{ flexDirection: 'column', gap: 4 }}>
      <div className="gauge" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle className="gauge-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
          <circle
            className="gauge-value"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            stroke={color}
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className="risk-card-value"
          style={{ position: 'absolute', fontSize: Math.max(14, size * 0.24) }}
        >
          {Math.round(value)}
        </span>
      </div>
      {label && <div className="risk-card-sub" style={{ textAlign: 'center' }}>{label}</div>}
      {sub && <div className="risk-card-sub" style={{ textAlign: 'center' }}>{sub}</div>}
    </div>
  )
}

/** Horizontal score bar with number */
export function ScoreLine({
  score,
  label,
  max = 100,
}: {
  score: number
  label?: string
  max?: number
}) {
  const pct = Math.min(Math.max(score, 0), max) / max
  const barClass =
    pct >= 0.7 ? 'bar-fill--red' : pct >= 0.4 ? 'bar-fill--amber' : 'bar-fill--green'
  return (
    <div className="score-line">
      <span className="score-num" style={{ color: scoreColor(score) }}>
        {Math.round(score)}
      </span>
      <div className="bar-track" style={{ width: 80 }}>
        <div className={`bar-fill ${barClass}`} style={{ width: `${pct * 100}%` }} />
      </div>
      {label && <span className="muted" style={{ fontSize: 12 }}>{label}</span>}
    </div>
  )
}

/** Stacked "current risk / ML / priority" bar set used on detail pages */
export function ScoreStack({ items }: { items: { label: string; score: number; display?: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => {
        const pct = Math.min(Math.max(item.score, 0), 100)
        const barClass =
          pct >= 70 ? 'bar-fill--red' : pct >= 40 ? 'bar-fill--amber' : 'bar-fill--green'
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                {item.display ?? Math.round(item.score)}
              </span>
            </div>
            <div className="bar-track">
              <div className={`bar-fill ${barClass}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}