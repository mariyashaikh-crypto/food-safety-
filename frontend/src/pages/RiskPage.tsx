import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../api/client'
import { useApi } from '../hooks/useApi'

import { PageLoader } from '../components/ui/Loading'
import { EmptyState, ErrorBanner } from '../components/ui/States'
import { Card, CardHeader } from '../components/ui/Card'
import { RiskBadge, PriorityBadge } from '../components/ui/Badge'
import {
  scoreTone,
  scoreColor,
  ScoreLine,
} from '../components/ui/Gauge'

import {
  Kicker,
  RiskReadout,
  RiskCell,
  FactorBar,
  InvestigationSection,
} from '../components/investigation'

import { Icon } from '../components/icons'
import { daysLabel, titleCase } from '../utils/format'

function recPillClass(rec: string): string {
  const r = rec.toLowerCase()

  if (r.includes('immediately')) {
    return 'rec-pill'
  }

  if (r.includes('soon')) {
    return 'rec-pill rec-pill--amber'
  }

  return 'rec-pill rec-pill--green'
}

export function RiskPage() {
  const navigate = useNavigate()

  // -------------------------------------------------------------
  // API hooks
  // -------------------------------------------------------------

  const overview = useApi(() => api.smartDecisionOverview())
  const priority = useApi(() => api.inspectionPriority())
  const mlOverview = useApi(() => api.mlRiskOverview())

  // -------------------------------------------------------------
  // Local state
  // -------------------------------------------------------------

  const [openIds, setOpenIds] = useState<Set<number>>(new Set())

  // -------------------------------------------------------------
  // IMPORTANT:
  // ALL hooks must run before ANY conditional return.
  // -------------------------------------------------------------

  const mlByEst = useMemo(
    () =>
      new Map(
        (mlOverview.data ?? []).map((m) => [
          m.establishment_id,
          m,
        ]),
      ),
    [mlOverview.data],
  )

  const reasonCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const est of overview.data?.establishments ?? []) {
      for (const reason of est.reasons ?? []) {
        counts.set(
          reason,
          (counts.get(reason) ?? 0) + 1,
        )
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [overview.data])

  // -------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------

  const loading =
    (overview.loading ||
      priority.loading ||
      mlOverview.loading) &&
    !overview.data

  if (loading) {
    return (
      <PageLoader label="Loading risk intelligence…" />
    )
  }

  // -------------------------------------------------------------
  // Overview data
  // -------------------------------------------------------------

  const ov = overview.data

  const synopsis = ov
    ? `${ov.total_establishments} establishments monitored · ${ov.urgent} urgent priority · ${ov.high + ov.medium} high/medium risk · ${ov.low} low`
    : 'Current risk scores, ML-based high-risk predictions and inspection prioritization.'

  const head = (
    <div className="page-head">
      <div>
        <Kicker>RISK INTELLIGENCE</Kicker>

        <h1 className="page-title">
          Risk Intelligence
        </h1>

        <p className="page-sub">
          {synopsis}
        </p>
      </div>
    </div>
  )

  // -------------------------------------------------------------
  // No overview data
  // -------------------------------------------------------------

  if (!ov) {
    return (
      <div className="page">
        {head}

        {overview.error && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner
              message={overview.error}
              onRetry={overview.reload}
            />
          </div>
        )}

        <EmptyState
          icon={<Icon.Warning />}
          title="No risk intelligence available"
          sub="Smart decision data has not been generated yet."
        />
      </div>
    )
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  const toggle = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const pct = (n: number) =>
    ov.total_establishments
      ? Math.round(
          (n / ov.total_establishments) * 100,
        )
      : 0

  // -------------------------------------------------------------
  // Page
  // -------------------------------------------------------------

  return (
    <div className="page">
      {head}

      {overview.error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBanner
            message={overview.error}
            onRetry={overview.reload}
          />
        </div>
      )}

      {/* =======================================================
          RISK SUMMARY
         ======================================================= */}

      <RiskReadout>
        <RiskCell
          label="Establishments"
          tone="graphite"
        >
          {ov.total_establishments}

          <span className="sub">
            under surveillance
          </span>
        </RiskCell>

        <RiskCell
          label="Urgent priority"
          tone="red"
        >
          {ov.urgent}

          <span className="sub">
            inspect immediately
          </span>
        </RiskCell>

        <RiskCell
          label="High priority"
          tone="amber"
        >
          {ov.high}

          <span className="sub">
            schedule soon
          </span>
        </RiskCell>

        <RiskCell
          label="Medium priority"
          tone="blue"
        >
          {ov.medium}

          <span className="sub">
            routine cadence
          </span>
        </RiskCell>

        <RiskCell
          label="Low priority"
          tone="green"
        >
          {ov.low}

          <span className="sub">
            monitor only
          </span>
        </RiskCell>
      </RiskReadout>

      {/* =======================================================
          CURRENT RISK
         ======================================================= */}

      <InvestigationSection
        index={1}
        title="Current Risk — Model vs Field"
        hint="Current risk score against the ML prediction, ranked by inspection priority. Click a row to expand the factor breakdown."
      >
        {ov.establishments.length === 0 ? (
          <EmptyState
            icon={<Icon.Scale />}
            title="No establishment risk data"
            sub="Smart decision records are empty."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 30 }} />

                  <th>
                    Establishment
                  </th>

                  <th>
                    Region
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Current risk
                  </th>

                  <th className="num">
                    Risk score
                  </th>

                  <th className="num">
                    ML probability
                  </th>

                  <th>
                    ML prediction
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Recommended action
                  </th>
                </tr>
              </thead>

              <tbody>
                {ov.establishments.map((est) => {
                  const ml =
                    mlByEst.get(
                      est.establishment_id,
                    )

                  const open =
                    openIds.has(
                      est.establishment_id,
                    )

                  const features =
                    ml?.top_features ?? []

                  const fSum =
                    features.reduce(
                      (sum, feature) =>
                        sum + feature.importance,
                      0,
                    )

                  const prob =
                    est.ml_prediction
                      ?.probability ??
                    ml?.ml_risk_probability ??
                    null

                  const mlLevel =
                    est.ml_prediction
                      ?.risk_level ??
                    ml?.ml_predicted_risk ??
                    null

                  const f = est.factors

                  return (
                    <Fragment
                      key={
                        est.establishment_id
                      }
                    >
                      <tr
                        className="clickable"
                        onClick={() =>
                          toggle(
                            est.establishment_id,
                          )
                        }
                      >
                        <td>
                          <Icon.ChevronRight
                            className="ico"
                            style={{
                              width: 14,
                              height: 14,
                              color:
                                'var(--ink-3)',
                              transform: open
                                ? 'rotate(90deg)'
                                : 'none',
                              transition:
                                'transform 160ms',
                            }}
                          />
                        </td>

                        <td>
                          <Link
                            to={`/establishments/${est.establishment_id}`}
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                            style={{
                              color:
                                'var(--ink)',
                              fontWeight: 650,
                              textDecoration:
                                'none',
                            }}
                          >
                            {
                              est.establishment_name
                            }
                          </Link>
                        </td>

                        <td>
                          <span className="table-cell-sub">
                            {est.region}
                          </span>
                        </td>

                        <td>
                          <span className="table-cell-sub">
                            {titleCase(
                              est.establishment_type,
                            )}
                          </span>
                        </td>

                        <td>
                          <RiskBadge
                            level={
                              est.current_risk
                                .level
                            }
                          />
                        </td>

                        <td className="num">
                          <ScoreLine
                            score={
                              est.current_risk
                                .score
                            }
                          />
                        </td>

                        <td className="num">
                          {prob == null ? (
                            <span className="table-cell-sub">
                              —
                            </span>
                          ) : (
                            <div className="mini-score">
                              <span
                                style={{
                                  color:
                                    scoreColor(
                                      prob,
                                    ),
                                }}
                              >
                                {prob.toFixed(
                                  2,
                                )}
                                %
                              </span>

                              <div className="bar-track">
                                <div
                                  className={`bar-fill bar-fill--${scoreTone(
                                    prob,
                                  )}`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        prob,
                                      ),
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        <td>
                          {mlLevel ? (
                            <RiskBadge
                              level={
                                mlLevel
                              }
                            />
                          ) : (
                            <span className="table-cell-sub">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <PriorityBadge
                            level={
                              est.priority
                                .level
                            }
                          />
                        </td>

                        <td>
                          <span
                            className={recPillClass(
                              est.recommendation,
                            )}
                          >
                            <span className="dot" />

                            {est.recommendation.toUpperCase()}
                          </span>

                          <div
                            className="table-cell-sub clamp-2"
                            style={{
                              marginTop: 4,
                            }}
                          >
                            {(
                              est.reasons ??
                              []
                            ).join(' · ')}
                          </div>
                        </td>
                      </tr>

                      {open && (
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              background:
                                'var(--surface-sunken)',
                            }}
                          >
                            <div
                              style={{
                                padding:
                                  '14px 18px',
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    'grid',
                                  gridTemplateColumns:
                                    'minmax(0, 1fr) minmax(0, 1fr)',
                                  gap: 22,
                                  alignItems:
                                    'start',
                                }}
                              >
                                {/* FEATURES */}

                                <div>
                                  <div className="mini-head">
                                    Top contributing
                                    features
                                  </div>

                                  {features.length ===
                                  0 ? (
                                    <div className="table-cell-sub">
                                      No feature
                                      weights
                                      returned by
                                      the model.
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        display:
                                          'flex',
                                        flexDirection:
                                          'column',
                                        gap: 8,
                                      }}
                                    >
                                      {features.map(
                                        (ft) => (
                                          <FactorBar
                                            key={
                                              ft.feature
                                            }
                                            label={
                                              ft.feature
                                            }
                                            value={`${fSum ? ((ft.importance / fSum) * 100).toFixed(1) : '0.0'}%`}
                                            pct={
                                              fSum
                                                ? (ft.importance /
                                                    fSum) *
                                                  100
                                                : 0
                                            }
                                            tone="blue"
                                          />
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* FACTORS */}

                                <div
                                  style={{
                                    display:
                                      'flex',
                                    flexDirection:
                                      'column',
                                    gap: 16,
                                  }}
                                >
                                  <div>
                                    <div className="mini-head">
                                      Violation
                                      factors
                                    </div>

                                    <div className="risk-factor-grid">
                                      <div className="risk-factor">
                                        <span className="rf-label">
                                          Total
                                          violations
                                        </span>

                                        <span className="rf-value">
                                          {
                                            f.total_violations
                                          }
                                        </span>
                                      </div>

                                      <div className="risk-factor">
                                        <span className="rf-label">
                                          Critical
                                        </span>

                                        <span
                                          className="rf-value"
                                          style={{
                                            color:
                                              f.critical_violations
                                                ? 'var(--red-ink)'
                                                : 'var(--ink-2)',
                                          }}
                                        >
                                          {
                                            f.critical_violations
                                          }
                                        </span>
                                      </div>

                                      <div className="risk-factor">
                                        <span className="rf-label">
                                          High severity
                                        </span>

                                        <span className="rf-value">
                                          {
                                            f.high_severity_violations
                                          }
                                        </span>
                                      </div>

                                      <div className="risk-factor">
                                        <span className="rf-label">
                                          Unresolved
                                        </span>

                                        <span
                                          className="rf-value"
                                          style={{
                                            color:
                                              f.unresolved_violations
                                                ? 'var(--amber-ink)'
                                                : 'var(--ink-2)',
                                          }}
                                        >
                                          {
                                            f.unresolved_violations
                                          }
                                        </span>
                                      </div>

                                      <div className="risk-factor">
                                        <span className="rf-label">
                                          Days since
                                          inspection
                                        </span>

                                        <span className="rf-value">
                                          {daysLabel(
                                            f.days_since_last_inspection,
                                          )}
                                        </span>
                                      </div>

                                      <div className="risk-factor">
                                        <span className="rf-label">
                                          Recurring
                                          categories
                                        </span>

                                        <span className="rf-value">
                                          {
                                            f
                                              .recurring_categories
                                              .length
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="mini-head">
                                      Recurring
                                      categories
                                    </div>

                                    <div className="chip-row">
                                      {f.recurring_categories
                                        .length ===
                                      0 ? (
                                        <span className="table-cell-sub">
                                          None detected
                                        </span>
                                      ) : (
                                        f.recurring_categories.map(
                                          (category) => (
                                            <span
                                              key={
                                                category
                                              }
                                              className="mini-chip"
                                            >
                                              <span className="dot" />
                                              {titleCase(
                                                category,
                                              )}
                                            </span>
                                          ),
                                        )
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="mini-head">
                                      Decision
                                      rationale
                                    </div>

                                    <div className="reason-list">
                                      {(
                                        est.reasons ??
                                        []
                                      ).length ===
                                      0 ? (
                                        <div className="table-cell-sub">
                                          No decision
                                          signals
                                          returned
                                          by the
                                          engine.
                                        </div>
                                      ) : (
                                        est.reasons.map(
                                          (
                                            reason,
                                            index,
                                          ) => (
                                            <div
                                              key={
                                                index
                                              }
                                              className="reason-item"
                                            >
                                              <Icon.Info
                                                className="ico"
                                                style={{
                                                  color:
                                                    'var(--amber-ink)',
                                                }}
                                              />

                                              {
                                                reason
                                              }
                                            </div>
                                          ),
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="divider" />

                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: 10,
                                  flexWrap:
                                    'wrap',
                                }}
                              >
                                <span
                                  className={recPillClass(
                                    est.recommendation,
                                  )}
                                >
                                  <span className="dot" />

                                  {est.recommendation.toUpperCase()}
                                </span>

                                <span
                                  className="table-cell-sub"
                                  style={{
                                    fontSize: 12,
                                  }}
                                >
                                  Recommended action
                                  for{' '}
                                  {
                                    est.establishment_name
                                  }
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </InvestigationSection>

      {/* =======================================================
          LOWER SECTION
         ======================================================= */}

      <div className="grid-2-side">
        <div>
          <Card>
            <CardHeader
              title="Priority distribution"
              sub="Share of the portfolio by inspection priority"
            />

            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <FactorBar
                label="Urgent"
                value={`${ov.urgent} · ${pct(ov.urgent)}%`}
                pct={pct(ov.urgent)}
                tone="red"
              />

              <FactorBar
                label="High"
                value={`${ov.high} · ${pct(ov.high)}%`}
                pct={pct(ov.high)}
                tone="amber"
              />

              <FactorBar
                label="Medium"
                value={`${ov.medium} · ${pct(ov.medium)}%`}
                pct={pct(ov.medium)}
                tone="blue"
              />

              <FactorBar
                label="Low"
                value={`${ov.low} · ${pct(ov.low)}%`}
                pct={pct(ov.low)}
                tone="green"
              />
            </div>
          </Card>

          <Card
            style={{
              marginTop: 16,
            }}
          >
            <CardHeader
              title="Common risk drivers"
              sub="Why establishments are flagged, across the portfolio"
            />

            {reasonCounts.length === 0 ? (
              <div className="empty">
                No risk drivers identified.
              </div>
            ) : (
              <div
                className="tag-cloud"
                style={{
                  padding: '14px 16px',
                }}
              >
                {reasonCounts.map(
                  ([reason, count]) => (
                    <span
                      key={reason}
                      className="tag"
                      style={{
                        padding: '6px 10px',
                      }}
                    >
                      {reason}

                      <span className="tag-count">
                        {count}
                      </span>
                    </span>
                  ),
                )}
              </div>
            )}
          </Card>
        </div>

        {/* =====================================================
            INSPECTION PRIORITY
           ===================================================== */}

        <Card>
          <CardHeader
            title="Inspection priority"
            sub="Ranked by current risk and unresolved factors"
          />

          {(priority.data ?? []).length ===
          0 ? (
            <div className="empty">
              No priority ranking available.
            </div>
          ) : (
            (priority.data ?? []).map(
              (item) => (
                <div
                  key={
                    item.establishment_id
                  }
                  className="priority-row"
                  onClick={() =>
                    navigate(
                      `/establishments/${item.establishment_id}`,
                    )
                  }
                >
                  <div className="priority-row-top">
                    <span className="priority-rank">
                      {item.rank ?? '—'}
                    </span>

                    <span className="priority-name">
                      {
                        item.establishment_name
                      }
                    </span>

                    <div className="mini-score">
                      <span
                        style={{
                          color:
                            scoreColor(
                              item.priority_score,
                            ),
                        }}
                      >
                        {
                          item.priority_score
                        }
                      </span>

                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-fill--${scoreTone(
                            item.priority_score,
                          )}`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                item.priority_score,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <PriorityBadge
                      level={
                        item.priority_level
                      }
                    />
                  </div>

                  <div className="priority-reasons">
                    {(
                      item.reasons ?? []
                    )
                      .slice(0, 2)
                      .join(' · ')}
                  </div>
                </div>
              ),
            )
          )}
        </Card>
      </div>
    </div>
  )
}