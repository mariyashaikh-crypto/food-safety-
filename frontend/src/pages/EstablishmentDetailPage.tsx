import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { ContextViolation, EstablishmentContext } from '../api/types'
import { PageLoader } from '../components/ui/Loading'
import { ErrorBanner } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { Modal, Drawer } from '../components/ui/Overlay'
import { Field, Input, Select, Textarea } from '../components/ui/Form'
import { Icon } from '../components/icons'
import { PriorityBadge, RiskBadge, SeverityBadge, StatusBadge } from '../components/ui/Badge'
import { scoreTone } from '../components/ui/Gauge'
import { Tabs } from '../components/ui/Tabs'
import { Timeline } from '../components/ui/Timeline'
import { EvidenceViewer, FactorBar, InvestigationSection, RiskCell, RiskReadout } from '../components/investigation'
import { daysLabel, formatDate, titleCase } from '../utils/format'
import { useToast } from '../components/Toast'

function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function recPillClass(rec: string): string {
  const r = rec.toLowerCase()
  if (r.includes('immediately')) return 'rec-pill'
  if (r.includes('soon')) return 'rec-pill rec-pill--amber'
  return 'rec-pill rec-pill--green'
}

function riskTone(level: string): 'red' | 'amber' | 'green' {
  const lvl = level.toUpperCase()
  if (lvl === 'HIGH' || lvl === 'URGENT' || lvl === 'CRITICAL') return 'red'
  if (lvl === 'MEDIUM') return 'amber'
  return 'green'
}

export function EvidencePreview({
  path,
  label,
  size,
}: {
  path: string | null | undefined
  label?: string
  size?: 'sm' | 'md'
}) {
  return <EvidenceViewer path={path} label={label} size={size} />
}

function UploadEvidence({
  upload,
  onUploaded,
}: {
  upload: (file: File) => Promise<unknown>
  onUploaded: () => void
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const handle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await upload(file)
      toast.push('Evidence uploaded', 'success')
      onUploaded()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
      {busy ? <span className="spinner" /> : <Icon.Upload className="ico" style={{ width: 14, height: 14 }} />}
      Upload evidence
      <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" hidden onChange={handle} disabled={busy} />
    </label>
  )
}

function Factor({ label, value, tone }: { label: string; value: number | string | null | undefined; tone?: 'red' | 'amber' }) {
  const color = tone === 'red' ? 'var(--red-ink)' : tone === 'amber' ? 'var(--amber-ink)' : 'var(--ink)'
  return (
    <div className="risk-factor">
      <span className="rf-label">{label}</span>
      <span className="rf-value" style={{ color }}>{value ?? '—'}</span>
    </div>
  )
}

export function EstablishmentDetailPage() {
  const { id } = useParams()
  const estId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()

  const context = useApi(() => api.establishmentContext(estId))
  const risk = useApi(() => api.establishmentRisk(estId))
  const ml = useApi(() => api.establishmentMlRisk(estId))

  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState<ContextViolation | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const ctx = context.data
  const est = ctx?.establishment
  const decision = ctx?.smart_decision

  const refreshAll = () => {
    context.reload()
    risk.reload()
    ml.reload()
  }

  if (context.loading && !ctx) return <PageLoader label="Loading establishment…" />
  if (context.error && !ctx) {
    return (
      <div className="page">
        <ErrorBanner message={context.error} onRetry={context.reload} />
      </div>
    )
  }
  if (!est) return <div className="page"><ErrorBanner message="Establishment not found." /></div>

  const riskReasons = risk.data?.reasons ?? decision?.reasons ?? []
  const daysSince = risk.data?.days_since_last_inspection ?? decision?.factors.days_since_last_inspection
  const riskScore = risk.data?.risk_score ?? decision?.current_risk.score ?? est.current_risk_score
  const riskLevel = est.current_risk_level
  const mlLevel = ml.data?.predicted_risk_level ?? decision?.ml_prediction.risk_level ?? null
  const riskProb = ml.data?.risk_probability ?? decision?.ml_prediction.probability ?? null
  const priorityLevel = decision?.priority.level ?? null
  const recommendation = decision?.recommendation ?? ''

  const totalViolations = risk.data?.total_violations ?? decision?.factors.total_violations
  const criticalViolations = risk.data?.critical_violations ?? decision?.factors.critical_violations
  const highSeverity = risk.data?.high_severity_violations ?? decision?.factors.high_severity_violations
  const unresolved = risk.data?.unresolved_violations ?? decision?.factors.unresolved_violations
  const recurring = risk.data?.recurring_categories ?? decision?.factors.recurring_categories ?? []
  const lowSeverity = Math.max(0, (totalViolations ?? 0) - (criticalViolations ?? 0) - (highSeverity ?? 0))
  const rejectedActions = risk.data?.rejected_corrective_actions ?? 0

  const allActions = ctx.violations.flatMap((v) => v.corrective_actions)
  const allReinspections = ctx.violations.flatMap((v) => v.reinspections)
  const evidenceEntries = ctx.violations.flatMap((v) => [
    ...(v.evidence ? [{ path: v.evidence, label: `${titleCase(v.category)} · violation` }] : []),
    ...v.corrective_actions.flatMap((a) =>
      a.evidence ? [{ path: a.evidence, label: `${titleCase(v.category)} · corrective action` }] : [],
    ),
  ])

  const tabs = [
    { key: 'overview', label: 'Risk & overview' },
    { key: 'inspections', label: 'Inspection history', count: ctx.inspection_history.length },
    { key: 'violations', label: 'Violations', count: ctx.violations.length },
  ]

  const mlNarrative =
    `This establishment has ${totalViolations ?? 0} recorded violation(s) across ${ctx.inspection_history.length} ` +
    `inspection(s). The composite risk score is ${formatScore(riskScore)} (${riskLevel.toUpperCase()}) and the ML model ` +
    `assigns a ${riskProb == null ? '—' : `${riskProb.toFixed(0)}%`} probability of a high-risk classification. Recommended ` +
    `action: ${recommendation ? recommendation.toLowerCase() : '—'}.`

  return (
    <div className="page">
      <button className="link-btn" onClick={() => navigate('/establishments')} style={{ marginBottom: 14 }}>
        ← Back to establishments
      </button>

      <div className="dossier-flag">
        <Icon.Shield className="ico" />
        Investigation Dossier
      </div>
      <div className="dossier-head">
        <div>
          <div className="dossier-title" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {est.name}
            <RiskBadge level={est.current_risk_level} />
          </div>
          <div className="dossier-meta">
            <span className="meta-seg"><Icon.MapPin className="ico" /> {est.region}</span>
            <span className="meta-seg"><Icon.Building className="ico" /> {titleCase(est.type)}</span>
            <span className="meta-seg"><Icon.Clipboard className="ico" /> Operating: <StatusBadge status={est.operating_status} /></span>
            <span className="meta-seg"><Icon.Calendar className="ico" /> Last inspection: {formatDate(est.last_inspection_date)}</span>
            <span className="meta-seg"><Icon.MapPin className="ico" /> {est.address}</span>
          </div>
        </div>
        <div className="detail-actions">
          <Button variant="primary" icon={<Icon.Clipboard />} onClick={() => setInspectOpen(true)}>Schedule inspection</Button>
          <Button icon={<Icon.Edit />} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="danger" icon={<Icon.Trash />} onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {context.error && <div style={{ marginTop: 14 }}><ErrorBanner message={context.error} /></div>}

      <div className="dossier-readout">
        <RiskReadout>
          <RiskCell label="Current risk" tone={riskTone(riskLevel)}>
            <RiskBadge level={est.current_risk_level} />
          </RiskCell>
          <RiskCell label="Risk score" tone={scoreTone(riskScore)}>
            {formatScore(riskScore)}
            <span className="sub">composite score</span>
          </RiskCell>
          <RiskCell label="ML prediction" tone="blue">
            {mlLevel ? <RiskBadge level={mlLevel} /> : '—'}
          </RiskCell>
          <RiskCell label="Risk probability" tone="blue">
            {riskProb == null ? '—' : `${riskProb.toFixed(2)}%`}
            <span className="sub">model confidence</span>
          </RiskCell>
          <RiskCell label="Priority" tone="graphite">
            {priorityLevel ? <PriorityBadge level={priorityLevel} /> : '—'}
          </RiskCell>
          <div className="risk-cell risk-cell--wide">
            <div className="risk-cell-label">Recommendation</div>
            <div className="risk-cell-value">
              <span className={recPillClass(recommendation)}>
                <span className="dot" />
                {recommendation ? recommendation.toUpperCase() : '—'}
              </span>
              <span className="sub">{recommendation || 'No recommendation generated yet.'}</span>
            </div>
          </div>
        </RiskReadout>
      </div>

      <div style={{ marginTop: 20 }}>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        <div style={{ marginTop: 16 }}>
          {tab === 'overview' && (
            <>
              <InvestigationSection index={1} title="Risk Assessment" hint="Factors driving the composite risk score">
                <div className="risk-factor-grid">
                  <Factor label="Total violations" value={totalViolations} />
                  <Factor label="Critical violations" value={criticalViolations} tone={criticalViolations ? 'red' : undefined} />
                  <Factor label="High-severity" value={highSeverity} />
                  <Factor label="Low-severity" value={lowSeverity} />
                  <Factor label="Unresolved" value={unresolved} tone={unresolved ? 'amber' : undefined} />
                  <Factor label="Rejected actions" value={rejectedActions} tone={rejectedActions ? 'red' : undefined} />
                  <Factor label="Days since inspection" value={daysLabel(daysSince)} />
                </div>
                <div className="chip-row" style={{ marginTop: 4 }}>
                  <span className="attach-label"><Icon.Layers className="ico" /> Recurring categories</span>
                  {recurring.length === 0 ? (
                    <span className="muted" style={{ fontSize: 12.5 }}>None detected</span>
                  ) : (
                    recurring.map((c) => (
                      <span key={c} className="mini-chip"><span className="dot" />{c}</span>
                    ))
                  )}
                </div>
              </InvestigationSection>

              <InvestigationSection index={7} title="AI Intelligence" hint="Machine-learning signal for this entity">
                <div className="intel-panel">
                  <div className="intel-bar"><Icon.Sparkles className="ico" /> Model assessment</div>
                  <div className="intel-body">{mlNarrative}</div>
                </div>
                {ml.data?.top_features && ml.data.top_features.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    <div className="mini-head">Top contributing features</div>
                    {ml.data.top_features.map((f) => (
                      <FactorBar
                        key={f.feature}
                        label={f.feature}
                        value={`${Math.round(f.importance * 100)}%`}
                        pct={f.importance * 100}
                        tone="blue"
                      />
                    ))}
                  </div>
                )}
              </InvestigationSection>

              <InvestigationSection index={8} title="Smart Decision" hint="Recommendation and supporting rationale" actions={priorityLevel ? <PriorityBadge level={priorityLevel} /> : undefined}>
                <div className="reason-list">
                  {riskReasons.length === 0 ? (
                    <div className="muted" style={{ fontSize: 13 }}>No decision signals returned by the engine.</div>
                  ) : (
                    riskReasons.map((reason, i) => (
                      <div key={i} className="reason-item">
                        <Icon.Info className="ico" style={{ color: 'var(--amber-ink)' }} />
                        {reason}
                      </div>
                    ))
                  )}
                </div>
                <div className="divider" />
                <div className="risk-factor-grid">
                  <Factor label="Total violations" value={totalViolations} />
                  <Factor label="Critical violations" value={criticalViolations} tone={criticalViolations ? 'red' : undefined} />
                  <Factor label="High-severity" value={highSeverity} />
                  <Factor label="Unresolved" value={unresolved} tone={unresolved ? 'amber' : undefined} />
                  <Factor label="Recurring categories" value={recurring.length} />
                  <Factor label="Days since inspection" value={daysLabel(daysSince)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  <span className={recPillClass(recommendation)}>
                    <span className="dot" />
                    {recommendation ? recommendation.toUpperCase() : 'NO RECOMMENDATION'}
                  </span>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {recommendation || 'Decision engine did not return a recommendation.'}
                  </span>
                </div>
              </InvestigationSection>
            </>
          )}

          {tab === 'inspections' && (
            <InvestigationSection index={2} title="Inspection History" hint={`${ctx.inspection_history.length} recorded inspection(s)`}>
              {ctx.inspection_history.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>No inspections recorded for this establishment.</div>
              ) : (
                <Timeline
                  items={[...ctx.inspection_history]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((insp) => ({
                      tone: insp.status.toLowerCase() === 'completed' ? 'green' : 'blue',
                      title: insp.status,
                      meta: formatDate(insp.date),
                      body: (
                        <>
                          <div style={{ marginBottom: 4 }}>
                            Inspector: <strong>{insp.inspector ?? 'Unassigned'}</strong> · Risk score:{' '}
                            <strong>{Math.round(insp.risk_score)}</strong>
                          </div>
                          {insp.notes && <div className="muted">{insp.notes}</div>}
                        </>
                      ),
                    }))}
                />
              )}
            </InvestigationSection>
          )}

          {tab === 'violations' && (
            <>
              <InvestigationSection index={3} title="Violation History" hint={`${ctx.violations.length} recorded violation(s)`}>
                <ViolationsTab ctx={ctx} onAddAction={setActionTarget} onChanged={refreshAll} />
              </InvestigationSection>

              <InvestigationSection index={4} title="Corrective Actions" hint={`${allActions.length} action(s) recorded across violations`}>
                {allActions.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>No corrective actions recorded yet.</div>
                ) : (
                  <div>
                    {allActions.map((a) => (
                      <CorrectiveActionBlock key={a.id} action={a} onChanged={refreshAll} />
                    ))}
                  </div>
                )}
              </InvestigationSection>

              <InvestigationSection index={5} title="Re-Inspections" hint={`${allReinspections.length} re-inspection(s) on record`}>
                {allReinspections.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>No re-inspections scheduled for this establishment.</div>
                ) : (
                  <div className="violation-flow" style={{ marginTop: 0 }}>
                    {allReinspections.map((r) => (
                      <ReinspectionCard key={r.id} r={r} onChanged={refreshAll} />
                    ))}
                  </div>
                )}
              </InvestigationSection>

              <InvestigationSection index={6} title="Evidence" hint="Assets attached to violations and corrective actions">
                {evidenceEntries.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>No evidence uploaded for this establishment.</div>
                ) : (
                  <div className="evidence-grid">
                    {evidenceEntries.map((e, i) => (
                      <EvidenceViewer key={i} path={e.path} label={e.label} size="sm" />
                    ))}
                  </div>
                )}
              </InvestigationSection>
            </>
          )}
        </div>
      </div>

      {actionTarget && (
        <ViolationDrawer violation={actionTarget} onClose={() => setActionTarget(null)} onChanged={refreshAll} />
      )}

      <EditEstablishmentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        id={estId}
        current={est}
        onSaved={() => { toast.push('Establishment updated', 'success'); refreshAll() }}
      />
      <ScheduleInspectionModal
        open={inspectOpen}
        onClose={() => setInspectOpen(false)}
        establishmentId={estId}
        establishmentName={est.name}
        onScheduled={() => { toast.push('Inspection scheduled', 'success'); refreshAll() }}
      />
      <DeleteEstablishmentModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        id={estId}
        name={est.name}
        onDeleted={() => { toast.push('Establishment deleted', 'success'); navigate('/establishments') }}
      />
    </div>
  )
}

function ViolationsTab({
  ctx,
  onAddAction,
  onChanged,
}: {
  ctx: EstablishmentContext
  onAddAction: (v: ContextViolation) => void
  onChanged: () => void
}) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set())

  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      {ctx.violations.length === 0 && (
        <Card><div className="empty">No violations recorded for this establishment yet.</div></Card>
      )}
      {ctx.violations.map((v) => {
        const open = openIds.has(v.id)
        const insp = ctx.inspection_history.find((i) => i.id === v.inspection_id)
        return (
          <div key={v.id} className="violation-row">
            <div className="violation-row-head" onClick={() => toggle(v.id)}>
              <Icon.ChevronRight className="ico" style={{ width: 14, height: 14, color: 'var(--ink-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 160ms' }} />
              <div className="vr-cat">
                <div className="vr-title">{titleCase(v.category)}</div>
                <div className="vr-sub">#{v.id} · Inspection #{v.inspection_id}{insp?.date ? ` · ${formatDate(insp.date)}` : ''}</div>
              </div>
              <SeverityBadge level={v.severity} />
              <StatusBadge status={v.status} />
            </div>
            {open && (
              <div className="violation-row-body">
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65 }}>{v.description}</p>
                {v.corrective_action_required && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                    <strong>Required corrective action:</strong> {v.corrective_action_required}
                  </div>
                )}
                <WorkflowFlow violation={v} />

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 270 }}>
                    <BlockLabel>Corrective actions ({v.corrective_actions.length})</BlockLabel>
                    {v.corrective_actions.length === 0 && (
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                        No corrective action recorded yet. Record one to start resolution tracking.
                      </div>
                    )}
                    {v.corrective_actions.map((a) => (
                      <CorrectiveActionBlock key={a.id} action={a} onChanged={onChanged} />
                    ))}
                    <Button size="sm" icon={<Icon.Plus />} onClick={() => onAddAction(v)}>
                      Record corrective action
                    </Button>
                  </div>
                  <div style={{ flex: 1, minWidth: 230 }}>
                    <BlockLabel>Violation evidence</BlockLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <EvidencePreview path={v.evidence} />
                      <UploadEvidence upload={(f) => api.uploadViolationEvidence(v.id, f)} onUploaded={onChanged} />
                    </div>
                  </div>
                </div>

                {v.reinspections.length > 0 && (
                  <div>
                    <BlockLabel>Re-inspections ({v.reinspections.length})</BlockLabel>
                    <div className="violation-flow" style={{ marginTop: 0 }}>
                      {v.reinspections.map((r) => (
                        <ReinspectionCard key={r.id} r={r} onChanged={onChanged} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BlockLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', margin: '8px 0 6px' }}>
      {children}
    </div>
  )
}

function WorkflowFlow({ violation }: { violation: ContextViolation }) {
  const status = violation.status.toLowerCase()
  const steps: { label: string; tone: 'neutral' | 'green' | 'amber' | 'red' | 'blue' }[] = [
    { label: 'Violation', tone: status.includes('resolv') ? 'green' : 'amber' },
    { label: status === 'open' ? 'Corrective action required' : 'Corrective action', tone: status.includes('resolv') ? 'green' : status.includes('under review') || status === 'corrective action required' ? 'amber' : 'blue' },
  ]
  if (violation.corrective_actions.some((a) => a.status === 'Accepted')) {
    steps.push({ label: 'Evidence accepted', tone: 'blue' })
    steps.push({ label: violation.reinspections.some((r) => r.result === 'Fixed') ? 'Re-inspection fixed' : 'Re-inspection', tone: violation.reinspections.some((r) => r.result === 'Fixed') ? 'green' : 'amber' })
  }
  if (status.includes('resolv')) steps.push({ label: 'Resolved', tone: 'green' })

  return (
    <div className="violation-flow">
      {steps.map((s, i) => (
        <FragmentRow key={i} step={s} last={i === steps.length - 1} />
      ))}
    </div>
  )
}

function FragmentRow({ step, last }: { step: { label: string; tone: string }; last: boolean }) {
  return (
    <>
      <Step label={step.label} tone={step.tone as 'neutral' | 'green' | 'amber' | 'red' | 'blue'} />
      {!last && <Arrow />}
    </>
  )
}

function Step({ label, tone }: { label: string; tone: 'neutral' | 'green' | 'amber' | 'red' | 'blue' }) {
  const color =
    tone === 'green' ? 'var(--green-ink)' : tone === 'amber' ? 'var(--amber-ink)' : tone === 'red' ? 'var(--red-ink)' : tone === 'blue' ? 'var(--blue-ink)' : 'var(--ink-3)'
  return <span className="flow-step" style={{ color, fontWeight: 600 }}>{label}</span>
}

function Arrow() {
  return (
    <span className="flow-arrow">
      <Icon.ArrowRight className="ico" />
    </span>
  )
}

export function CorrectiveActionBlock({ action, onChanged }: { action: { id: number; status: string; description: string; evidence: string | null; inspector_comment: string | null }; onChanged: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [comment, setComment] = useState('')

  const transition = async (status: string) => {
    setBusy(true)
    try {
      await api.updateCorrectiveActionStatus(action.id, { status, inspector_comment: comment || null })
      toast.push(`Corrective action → ${status}`, 'success')
      setReviewOpen(false)
      setComment('')
      onChanged()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const quickTransitions: { label: string; value: string; hide: boolean }[] = [
    { label: 'Submit', value: 'Submitted', hide: ['Submitted', 'Under Review', 'Accepted', 'Closed'].includes(action.status) },
    { label: 'Under review', value: 'Under Review', hide: ['Under Review', 'Accepted', 'Closed'].includes(action.status) },
    { label: 'Close', value: 'Closed', hide: action.status === 'Closed' },
  ]

  return (
    <div className="rec-row">
      <div className="rec-flow">
        <StatusBadge status={action.status} />
        <span style={{ fontSize: 12.5, minWidth: 140, color: 'var(--ink-2)' }}>{action.description}</span>
      </div>
      {action.inspector_comment && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Inspector: {action.inspector_comment}</div>
      )}
      <div className="rec-flow" style={{ marginTop: 8 }}>
        <EvidencePreview path={action.evidence} size="sm" />
        <UploadEvidence upload={(f) => api.uploadCorrectiveActionEvidence(action.id, f)} onUploaded={onChanged} />
        <div style={{ flex: 1 }} />
        {quickTransitions.filter((t) => !t.hide).map((t) => (
          <Button key={t.value} size="sm" variant="ghost" disabled={busy} onClick={() => transition(t.value)}>{t.label}</Button>
        ))}
        <Button size="sm" variant="primary" disabled={busy} onClick={() => setReviewOpen(true)}>Review</Button>
      </div>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review corrective action" sub="Accepting moves the violation to Re-inspection Required; rejecting returns it for correction." footer={
        <div className="page-actions">
          <Button onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={() => transition('Rejected')}>Reject</Button>
          <Button variant="success" loading={busy} onClick={() => transition('Accepted')}>Accept</Button>
        </div>
      }>
        <Field label="Inspector comment" hint="Optional note recorded with this decision.">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Evidence reviewed; temperature logs satisfactory." />
        </Field>
      </Modal>
    </div>
  )
}

export function ReinspectionCard({ r, onChanged }: { r: { id: number; date: string; inspector: string | null; result: string; notes: string | null }; onChanged: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState(r.result === 'Pending' ? 'Fixed' : r.result)
  const [notes, setNotes] = useState(r.notes ?? '')

  const save = async () => {
    setBusy(true)
    try {
      await api.updateReinspectionResult(r.id, { result, notes: notes || null })
      toast.push(`Re-inspection result recorded: ${result}`, 'success')
      setOpen(false)
      onChanged()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chip" style={{ height: 'auto', padding: '8px 12px', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
      <div className="rec-flow" style={{ gap: 8 }}>
        <span className="dv-date">{formatDate(r.date)}</span>
        <span className="flow-step">{r.inspector ?? 'Unassigned'}</span>
      </div>
      <div className="rec-flow" style={{ gap: 8 }}>
        <StatusBadge status={r.result} />
        {r.result === 'Pending' && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Record result</Button>
        )}
      </div>
      {r.notes && <div className="dv-comment">{r.notes}</div>}
      <Modal open={open} onClose={() => setOpen(false)} title="Record re-inspection result">
        <Field label="Result">
          <Select value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="Fixed">Fixed</option>
            <option value="Not Fixed">Not Fixed</option>
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="form-actions">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={busy}>Save result</Button>
        </div>
      </Modal>
    </div>
  )
}

function ViolationDrawer({
  violation,
  onClose,
  onChanged,
}: {
  violation: ContextViolation
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const [description, setDescription] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [reDate, setReDate] = useState('')
  const [reInspector, setReInspector] = useState('')
  const [reBusy, setReBusy] = useState(false)
  const isReady = violation.status === 'Re-inspection Required'

  const addAction = async (e: FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    setActionBusy(true)
    try {
      await api.createCorrectiveAction({ violation_id: violation.id, action_description: description, status: 'Required' })
      toast.push('Corrective action recorded', 'success')
      setDescription('')
      onChanged()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const addReinspection = async (e: FormEvent) => {
    e.preventDefault()
    if (!reDate) return
    setReBusy(true)
    try {
      await api.createReinspection({ violation_id: violation.id, inspection_date: reDate, inspector_name: reInspector || null, result: 'Pending' })
      toast.push('Re-inspection scheduled', 'success')
      setReDate('')
      setReInspector('')
      onChanged()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setReBusy(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Violation workflow"
      sub={`${titleCase(violation.category)} · ${violation.severity} severity · ${violation.status}`}
    >
      <Card pad style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <SeverityBadge level={violation.severity} />
          <StatusBadge status={violation.status} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.6 }}>{violation.description}</p>
        {violation.corrective_action_required && (
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
            <strong>Required:</strong> {violation.corrective_action_required}
          </div>
        )}
      </Card>

      <Card pad style={{ marginBottom: 14 }}>
        <SectionHeader title="Record corrective action" hint="Describes the steps taken to resolve this violation" />
        <form onSubmit={addAction}>
          <Field label="Action description" required>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Calibrated refrigeration units and introduced daily temperature logging." required />
          </Field>
          <Button type="submit" variant="primary" loading={actionBusy} icon={<Icon.Plus />}>Record action</Button>
        </form>
      </Card>

      <Card pad>
        <SectionHeader title="Schedule re-inspection" hint={isReady ? 'Violation is ready — evidence was accepted.' : 'Allowed once the corrective action is Accepted (violation becomes Re-inspection Required).'} />
        <form onSubmit={addReinspection}>
          <div className="form-row">
            <Field label="Date" required>
              <Input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} disabled={!isReady} />
            </Field>
            <Field label="Inspector">
              <Input value={reInspector} onChange={(e) => setReInspector(e.target.value)} placeholder="Inspector name" disabled={!isReady} />
            </Field>
          </div>
          <Button type="submit" variant="primary" icon={<Icon.Calendar />} loading={reBusy} disabled={!isReady}>Schedule re-inspection</Button>
        </form>
      </Card>
    </Drawer>
  )
}

function EditEstablishmentModal({
  open,
  onClose,
  id,
  current,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  id: number
  current: { name: string; type: string; address: string; region: string; status: string; operating_status: string }
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: current.name,
    establishment_type: current.type,
    address: current.address,
    region: current.region,
    status: current.status,
    operating_status: current.operating_status,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.updateEstablishment(id, {
        name: form.name,
        establishment_type: form.establishment_type,
        address: form.address,
        region: form.region,
        status: form.status,
        operating_status: form.operating_status,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit establishment">
      <form onSubmit={submit}>
        <Field label="Name" required><Input value={form.name} onChange={(e) => set('name')(e.target.value)} required /></Field>
        <div className="form-row">
          <Field label="Type" required><Input value={form.establishment_type} onChange={(e) => set('establishment_type')(e.target.value)} required /></Field>
          <Field label="Region" required><Input value={form.region} onChange={(e) => set('region')(e.target.value)} required /></Field>
        </div>
        <Field label="Address" required><Textarea value={form.address} onChange={(e) => set('address')(e.target.value)} required /></Field>
        <div className="form-row">
          <Field label="Status"><Select value={form.status} onChange={(e) => set('status')(e.target.value)}><option>Active</option><option>Inactive</option></Select></Field>
          <Field label="Operating"><Select value={form.operating_status} onChange={(e) => set('operating_status')(e.target.value)}><option>Open</option><option>Closed</option></Select></Field>
        </div>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}><Icon.AlertCircle className="ico" /><span>{error}</span></div>}
        <div className="form-actions">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}

function ScheduleInspectionModal({
  open,
  onClose,
  establishmentId,
  establishmentName,
  onScheduled,
}: {
  open: boolean
  onClose: () => void
  establishmentId: number
  establishmentName: string
  onScheduled: () => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [inspector, setInspector] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.createInspection({
        establishment_id: establishmentId,
        inspection_date: date,
        status: 'Scheduled',
        inspector_name: inspector || null,
        notes: notes || null,
        risk_score: 0,
      })
      onScheduled()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule inspection" sub={establishmentName}>
      <form onSubmit={submit}>
        <Field label="Inspection date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Inspector">
          <Input value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="Assigned inspector" />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope or focus of the inspection" />
        </Field>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}><Icon.AlertCircle className="ico" /><span>{error}</span></div>}
        <div className="form-actions">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Schedule inspection</Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteEstablishmentModal({
  open,
  onClose,
  id,
  name,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  id: number
  name: string
  onDeleted: () => void
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState('')

  const destroy = async () => {
    setBusy(true)
    try {
      await api.deleteEstablishment(id)
      onDeleted()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Deletion failed', 'error')
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete establishment" sub="This permanently removes the establishment record.">
      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        You are about to delete <strong>{name}</strong>. Its inspection history, violations, corrective actions and
        re-inspections will be removed. Enter the establishment name to confirm.
      </p>
      <Field label="Type establishment name to confirm" required>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={name} />
      </Field>
      <div className="form-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger-solid" disabled={confirm !== name} loading={busy} onClick={destroy}>Delete establishment</Button>
      </div>
    </Modal>
  )
}
