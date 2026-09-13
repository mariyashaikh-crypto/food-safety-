import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { PriorityItem, SmartDecision } from '../api/types'
import { Card, CardHeader, SectionHeader, StatCard } from '../components/ui/Card'
import { PageLoader, Spinner } from '../components/ui/Loading'
import { ErrorBanner } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/icons'
import { PriorityBadge, RiskBadge, StatusBadge } from '../components/ui/Badge'
import { scoreColor } from '../components/ui/Gauge'
import { Kicker } from '../components/investigation'
import { formatDate, percentOf, titleCase } from '../utils/format'
import { useLookup } from '../context/LookupContext'

export function DashboardPage() {
  const navigate = useNavigate()
  const { estName } = useLookup()
  const dashboard = useApi(() => api.dashboard())
  const priority = useApi(() => api.inspectionPriority())
  const smart = useApi(() => api.smartDecisionOverview())
  const inspections = useApi(() => api.inspections())

  const rows = useMemo(() => {
    if (!priority.data) return [] as (PriorityItem & { smart?: SmartDecision })[]
    const map = new Map<number, SmartDecision>()
    smart.data?.establishments.forEach((s) => map.set(s.establishment_id, s))
    return priority.data.slice(0, 8).map((item) => ({ ...item, smart: map.get(item.establishment_id) }))
  }, [priority.data, smart.data])

  const recentInspections = useMemo(() => {
    if (!inspections.data) return []
    return [...inspections.data].sort((a, b) => b.inspection_date.localeCompare(a.inspection_date)).slice(0, 6)
  }, [inspections.data])

  const today = useMemo(() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  }, [])

  const urgent = useMemo(() => {
    if (!inspections.data) return { overdue: [], upcoming: [] }
    const active = inspections.data.filter((i) => i.status.toLowerCase() !== 'completed')
    const overdue = active
      .filter((i) => i.inspection_date < today)
      .sort((a, b) => a.inspection_date.localeCompare(b.inspection_date))
      .slice(0, 4)
    const upcoming = active
      .filter((i) => i.inspection_date >= today)
      .sort((a, b) => a.inspection_date.localeCompare(b.inspection_date))
      .slice(0, 3)
    return { overdue, upcoming }
  }, [inspections.data, today])

  const loading = dashboard.loading
  const data = dashboard.data

  if (loading && !data) return <PageLoader label="Loading operational overview…" />

  const summary = data?.summary
  const total = summary?.total_establishments ?? 0
  const high = summary?.high_risk_establishments ?? 0
  const medium = summary?.medium_risk_establishments ?? 0
  const low = summary?.low_risk_establishments ?? 0
  const overdueCount = summary?.overdue_inspections ?? 0
  const upcomingCount = summary?.upcoming_inspections ?? 0
  const activeViolations = summary?.active_violations ?? 0
  const critical = summary?.critical_violations ?? 0

  const { overdue: overdueInspections, upcoming: upcomingInspections } = urgent
  const estRows = smart.data?.establishments ?? []

  const distBars: Record<string, string> = {
    HIGH: 'bar-fill--red',
    MEDIUM: 'bar-fill--amber',
    LOW: 'bar-fill--green',
  }
  const distColors: Record<string, string> = { HIGH: 'var(--red)', MEDIUM: 'var(--amber)', LOW: 'var(--green)' }

  return (
    <div className="page">
      <style>{`
        .command-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
        .att-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
        .att-stack { display: flex; flex-direction: column; gap: 8px; }
        @media (max-width: 1000px) { .command-grid, .att-grid { grid-template-columns: 1fr; } }
      `}</style>

      {dashboard.error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBanner message={dashboard.error} onRetry={dashboard.reload} />
        </div>
      )}

      <div className="page-head">
        <div>
          <Kicker>INSPECTION COMMAND CENTER</Kicker>
          <h1 className="page-title">Command Center</h1>
          <p className="page-sub">
            {high} high-risk establishments across {total} on record · {overdueCount} inspections overdue ·{' '}
            {activeViolations} active violations ({critical} critical).
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Icon.Plus />} onClick={() => navigate('/inspections')}>
            Schedule inspection
          </Button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Establishments"
          value={summary?.total_establishments ?? '—'}
          tone="blue"
          note={`${high} high · ${medium} medium · ${low} low`}
        />
        <StatCard label="High-risk establishments" value={high} tone="red" note="Require priority attention" />
        <StatCard label="Active violations" value={activeViolations} tone="amber" note={`${critical} critical`} />
        <StatCard label="Overdue inspections" value={overdueCount} tone="red" note={`${upcomingCount} scheduled ahead`} />
      </div>

      <section className="inv-section">
        <div className="inv-section-head">
          <span className="inv-index">01</span>
          <div className="inv-head-text">
            <h2 className="inv-title">Command action items</h2>
            <div className="section-hint">Attention required — establishment risk and open cases</div>
          </div>
        </div>
        <div className="att-grid">
          <Card pad>
            <div className="mini-head">Establishment risk</div>
            {priority.loading && !rows.length && (
              <div style={{ padding: 16 }}>
                <Spinner />
              </div>
            )}
            <div className="att-stack">
              {rows.slice(0, 5).map((item) => (
                <div
                  key={item.establishment_id}
                  className="attention-item attention-item--red"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/establishments/${item.establishment_id}`)}
                >
                  <span className="att-icon" style={{ color: 'var(--red)' }}>
                    <Icon.AlertCircle />
                  </span>
                  <div className="att-main">
                    <div className="att-label">{item.establishment_name}</div>
                    <div className="att-sub">{item.reasons.slice(0, 3).join(' · ')}</div>
                  </div>
                </div>
              ))}
              {!priority.loading && !rows.length && (
                <div className="muted" style={{ fontSize: 12.5, padding: '8px 0' }}>
                  No establishments flagged for attention.
                </div>
              )}
            </div>
          </Card>

          <Card pad>
            <div className="mini-head">Open cases</div>
            <div className="att-stack">
              <div className="attention-item attention-item--amber">
                <span className="att-icon" style={{ color: 'var(--amber)' }}>
                  <Icon.Shield />
                </span>
                <div className="att-main">
                  <div className="att-label">{activeViolations} active violations</div>
                  <div className="att-sub">{critical} critical · corrective action pending</div>
                </div>
              </div>
              {inspections.loading && !overdueInspections.length && !upcomingInspections.length && (
                <div style={{ padding: 16 }}>
                  <Spinner />
                </div>
              )}
              {overdueInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="attention-item attention-item--red"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/establishments/${insp.establishment_id}`)}
                >
                  <span className="att-icon" style={{ color: 'var(--red)' }}>
                    <Icon.Warning />
                  </span>
                  <div className="att-main">
                    <div className="att-label">{estName(insp.establishment_id)}</div>
                    <div className="att-sub">Overdue · {formatDate(insp.inspection_date)} · {insp.status}</div>
                  </div>
                </div>
              ))}
              {upcomingInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="attention-item attention-item--amber"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/establishments/${insp.establishment_id}`)}
                >
                  <span className="att-icon" style={{ color: 'var(--amber)' }}>
                    <Icon.Clock />
                  </span>
                  <div className="att-main">
                    <div className="att-label">{estName(insp.establishment_id)}</div>
                    <div className="att-sub">Upcoming · {formatDate(insp.inspection_date)} · {insp.status}</div>
                  </div>
                </div>
              ))}
              {!inspections.loading && !overdueInspections.length && !upcomingInspections.length && (
                <div className="muted" style={{ fontSize: 12.5, padding: '8px 0' }}>
                  No pending inspections on record.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      <div className="command-grid">
        <Card pad>
          <SectionHeader title="Risk distribution" hint="Establishments by current risk level" />
          <div style={{ marginTop: 6 }}>
            {data?.risk_distribution.map((entry) => {
              const count = entry.count
              const pct = total ? (count / total) * 100 : 0
              return (
                <div key={entry.risk_level} className="dist-row">
                  <span className="dist-label">
                    <span className="badge" style={{ background: distColors[entry.risk_level] }} />
                    {entry.risk_level}
                  </span>
                  <div className="bar-track dist-bar">
                    <div className={`bar-fill ${distBars[entry.risk_level]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dist-count">{count}</span>
                  <span className="dist-pct">{percentOf(count, total)}</span>
                </div>
              )
            })}
          </div>
        </Card>
        <Card pad>
          <SectionHeader title="Recurring violations" hint="Categories seen across multiple inspections" />
          <div className="tag-cloud">
            {data?.recurring_violations.slice(0, 6).map((v) => (
              <span key={v.category} className="mini-chip mini-chip--amber">
                <span className="dot" />
                {titleCase(v.category)} × {v.count}
              </span>
            ))}
          </div>
          {data?.recurring_violations.length === 0 && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              No recurring categories detected.
            </div>
          )}
        </Card>
      </div>

      <section className="inv-section">
        <div className="section-head">
          <div>
            <div className="section-title">RISK INTELLIGENCE</div>
            <div className="section-hint">Model-informed risk ranking across the portfolio</div>
          </div>
        </div>
        {smart.loading && !estRows.length && (
          <div style={{ padding: 20 }}>
            <Spinner />
          </div>
        )}
        {!smart.loading && !estRows.length && <div className="empty">No risk intelligence data available.</div>}
        {estRows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Establishment</th>
                  <th>Region</th>
                  <th>Risk level</th>
                  <th className="num">Risk score</th>
                  <th className="num">ML probability</th>
                  <th>Priority</th>
                  <th>Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {estRows.map((est) => {
                  const prob = est.ml_prediction.probability
                  return (
                    <tr
                      key={est.establishment_id}
                      className="clickable"
                      onClick={() => navigate(`/establishments/${est.establishment_id}`)}
                    >
                      <td>
                        <span className="table-cell-main">{est.establishment_name}</span>
                      </td>
                      <td>
                        <span className="table-cell-sub">{est.region}</span>
                      </td>
                      <td>
                        <RiskBadge level={est.current_risk.level} />
                      </td>
                      <td className="num">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div className="bar-track" style={{ width: 48 }}>
                            <div
                              className="bar-fill"
                              style={{
                                width: `${Math.min(Math.max(est.current_risk.score, 0), 100)}%`,
                                background: scoreColor(est.current_risk.score),
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                            {Math.round(est.current_risk.score)}
                          </span>
                        </div>
                      </td>
                      <td className="num">
                        <span
                          style={{
                            color: prob == null ? 'var(--ink-3)' : scoreColor(prob),
                            fontWeight: 650,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {prob == null ? '—' : `${prob.toFixed(2)}%`}
                        </span>
                      </td>
                      <td>
                        <PriorityBadge level={est.priority.level} />
                      </td>
                      <td>
                        <span className="table-cell-sub">{est.recommendation}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inv-section">
        <div className="section-head">
          <div>
            <div className="section-title">ACTIVITY</div>
            <div className="section-hint">Latest recorded inspection movement</div>
          </div>
        </div>
        <div className="command-grid">
          <Card style={{ gridColumn: '1 / -1' }}>
            <CardHeader title="Recent inspections" sub="Latest recorded inspection activity across establishments" />
            <div style={{ padding: '4px 14px 10px' }}>
              {inspections.loading && !recentInspections.length && (
                <div style={{ padding: 16 }}>
                  <Spinner />
                </div>
              )}
              <div className="activity-list">
                {recentInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="activity-item"
                    onClick={() => navigate(`/establishments/${insp.establishment_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span
                      className="activity-mark"
                      style={{ background: insp.status.toLowerCase() === 'completed' ? 'var(--green)' : 'var(--blue)' }}
                    />
                    <div className="activity-main">
                      <div>
                        <strong>{estName(insp.establishment_id)}</strong> <StatusBadge status={insp.status} />
                      </div>
                      <div className="activity-time">
                        {formatDate(insp.inspection_date)} · {insp.inspector_name ?? 'Unassigned'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!inspections.loading && !recentInspections.length && (
                <div className="muted" style={{ fontSize: 12.5, padding: '8px 0' }}>
                  No inspections recorded.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}