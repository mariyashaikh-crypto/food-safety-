import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, isPdfUrl } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { CorrectiveAction, Reinspection, Violation } from '../api/types'
import { PageLoader } from '../components/ui/Loading'
import { EmptyState, ErrorBanner } from '../components/ui/States'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Drawer, Modal } from '../components/ui/Overlay'
import { Field, Select, Textarea } from '../components/ui/Form'
import { Icon } from '../components/icons'
import { SeverityBadge, StatusBadge } from '../components/ui/Badge'
import { ChainSteps, EvidenceViewer, Kicker } from '../components/investigation'
import { formatDate, titleCase } from '../utils/format'
import { useToast } from '../components/Toast'
import { useLookup } from '../context/LookupContext'

interface ViolationRow {
  violation: Violation
  actions: CorrectiveAction[]
  reinspections: Reinspection[]
}

const SEV_ORDER = ['Critical', 'High', 'Medium', 'Low']
const SEV_COLOR: Record<string, string> = {
  Critical: 'var(--red)',
  High: 'var(--amber)',
  Medium: 'var(--blue)',
  Low: 'var(--ink-3)',
}

function resultTone(result: string): 'ok' | 'warn' | 'bad' | 'idle' {
  const r = result.toUpperCase()
  if (/PASS|FIXED|RESOLVED|COMPLIANT|FOUND OK|CLEARED/.test(r)) return 'ok'
  if (/FAIL|NOT FIXED|REJECT|OPEN/.test(r)) return 'bad'
  return 'idle'
}

function violationTone(status: string): 'ok' | 'warn' | 'bad' {
  const s = status.toUpperCase()
  if (/RESOLVED|CLOSED|FIXED/.test(s)) return 'ok'
  if (/CRITICAL|REJECTED|NOT FIXED/.test(s)) return 'bad'
  return 'warn'
}

function actionChipTone(status: string): string {
  const s = status.toUpperCase()
  if (/RESOLVED|ACCEPTED|CLOSED|FIXED|COMPLETED/.test(s)) return 'mini-chip--green'
  if (/REJECTED|NOT FIXED/.test(s)) return 'mini-chip--red'
  if (/SUBMITTED|UNDER REVIEW|REVIEWED|SCHEDULED/.test(s)) return 'mini-chip--blue'
  if (/REQUIRED|OPEN|PENDING|IN PROGRESS/.test(s)) return 'mini-chip--amber'
  return ''
}

export function ViolationsPage() {
  const { estName, inspDate, refresh } = useLookup()
  const list = useApi<ViolationRow[]>(async () => {
    const [violations, actions, reinspections] = await Promise.all([
      api.violations(),
      api.correctiveActions(),
      api.reinspections(),
    ])
    return violations.map((violation) => ({
      violation,
      actions: actions.filter((a) => a.violation_id === violation.id),
      reinspections: reinspections.filter((r) => r.violation_id === violation.id),
    }))
  })

  const [query, setQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState<Violation | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list.data ?? [])
      .filter((r) => {
        const v = r.violation
        if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false
        if (statusFilter !== 'ALL' && v.status !== statusFilter) return false
        if (q) {
          const hay = [v.category, v.description, estName(v.establishment_id)].join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.violation.id - a.violation.id)
  }, [list.data, query, severityFilter, statusFilter, estName])

  const severities = useMemo(() => {
    const present = new Set((list.data ?? []).map((r) => r.violation.severity))
    return SEV_ORDER.filter((s) => present.has(s)).concat([...present].filter((s) => !SEV_ORDER.includes(s)))
  }, [list.data])

  const statuses = useMemo(() => [...new Set((list.data ?? []).map((r) => r.violation.status))], [list.data])

  const summary = useMemo(() => {
    const all = list.data ?? []
    const bySev = new Map<string, number>()
    const byStatus = new Map<string, number>()
    for (const r of all) {
      bySev.set(r.violation.severity, (bySev.get(r.violation.severity) ?? 0) + 1)
      byStatus.set(r.violation.status, (byStatus.get(r.violation.status) ?? 0) + 1)
    }
    if (!all.length) return 'No violations recorded.'
    const sev = [...bySev.entries()].map(([k, n]) => `${n} ${k.toLowerCase()}`).join(', ')
    const sta = [...byStatus.entries()].map(([k, n]) => `${n} ${k.toLowerCase()}`).join(', ')
    return `${all.length} recorded violation(s) - ${sev} - ${sta}.`
  }, [list.data])

  if (list.loading && !list.data) return <PageLoader label="Loading violations…" />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Kicker>Violation Investigation View</Kicker>
          <h1 className="page-title">Violations</h1>
          <p className="page-sub">{summary}</p>
        </div>
      </div>

      {list.error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBanner message={list.error} onRetry={list.reload} />
        </div>
      )}

      <div className="toolbar">
        <div className="search-input">
          <Icon.Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search category, description, establishment…"
          />
        </div>
        <FilterSelect value={severityFilter} options={severities} label="All severities" onChange={setSeverityFilter} />
        <FilterSelect value={statusFilter} options={statuses} label="All statuses" onChange={setStatusFilter} />
        <div className="toolbar-spacer" />
        <span className="muted" style={{ fontSize: 12.5 }}>{rows.length} violations</span>
      </div>

      {rows.length === 0 ? (
        <Card style={{ marginTop: 16, padding: 0 }}>
          <EmptyState icon={<Icon.Warning />} title="No violations found" sub="Adjust the search or filters." />
        </Card>
      ) : (
        <div style={{ marginTop: 16 }}>
          {rows.map((row) => (
            <ViolationRecordCard
              key={row.violation.id}
              row={row}
              estName={estName}
              inspDate={inspDate}
              onOpen={() => setSelected(row.violation)}
            />
          ))}
        </div>
      )}

      <ViolationDrawer
        violation={selected}
        onClose={() => setSelected(null)}
        onChanged={() => { list.reload(); refresh() }}
      />
    </div>
  )
}

function FilterSelect({
  value,
  options,
  label,
  onChange,
}: {
  value: string
  options: string[]
  label: string
  onChange: (v: string) => void
}) {
  return (
    <select className="select" style={{ width: 'auto' }} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="ALL">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function ViolationRecordCard({
  row,
  estName,
  inspDate,
  onOpen,
}: {
  row: ViolationRow
  estName: (id: number) => string
  inspDate: (id: number) => string
  onOpen: () => void
}) {
  const { violation, actions, reinspections } = row
  const evidence = [
    ...(violation.evidence_path
      ? [{ path: violation.evidence_path, label: isPdfUrl(violation.evidence_path) ? 'Violation report' : 'Violation photo' }]
      : []),
    ...actions.flatMap((a) =>
      a.evidence_path
        ? [{ path: a.evidence_path, label: isPdfUrl(a.evidence_path) ? 'Action report' : 'Action photo' }]
        : [],
    ),
  ]
  const lastReinspection = reinspections[reinspections.length - 1]

  const steps: { label: string; tone: 'ok' | 'warn' | 'bad' | 'idle' }[] = [
    { label: 'Inspection', tone: 'ok' },
    { label: 'Violation', tone: violationTone(violation.status) },
    {
      label: actions.length ? `Corrective action${actions.length > 1 ? 's' : ''}` : 'No action',
      tone: actions.some((a) => a.status.toUpperCase() === 'REJECTED') ? 'bad' : actions.length ? 'warn' : 'idle',
    },
    { label: evidence.length ? 'Evidence' : 'No evidence', tone: evidence.length ? 'ok' : 'warn' },
    { label: lastReinspection ? 'Re-inspection' : 'No re-inspection', tone: lastReinspection ? 'ok' : 'idle' },
    { label: lastReinspection ? 'Result' : 'Pending', tone: lastReinspection ? resultTone(lastReinspection.result) : 'idle' },
  ]

  return (
    <div className="rec-row clickable" onClick={onOpen}>
      <div className="rec-flow">
        <SeverityBadge level={violation.severity} />
        <StatusBadge status={violation.status} />
        <span className="table-cell-main" style={{ fontSize: 13 }}>{titleCase(violation.category)}</span>
        <Link
          to={`/establishments/${violation.establishment_id}`}
          className="link-btn"
          style={{ marginLeft: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {estName(violation.establishment_id)}
        </Link>
      </div>

      <div className="table-cell-sub" style={{ marginTop: 3 }}>{violation.description}</div>

      <div className="rec-flow" style={{ marginTop: 10 }}>
        <span className="table-cell-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon.Clipboard className="ico" style={{ width: 13, height: 13 }} />
          {inspDate(violation.inspection_id)}
        </span>
        <ChainSteps steps={steps} />
      </div>

      {evidence.length > 0 && (
        <div className="chip-row" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
          <span className="attach-label"><Icon.File className="ico" /> Evidence assets</span>
          {evidence.map((e, i) => (
            <EvidenceViewer key={i} path={e.path} label={e.label} size="sm" />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div className="mini-head">Corrective actions ({actions.length})</div>
        {actions.length === 0 ? (
          <span className="no-evidence">No corrective actions recorded.</span>
        ) : (
          <div className="chip-row">
            {actions.map((a) => (
              <span key={a.id} className={`mini-chip ${actionChipTone(a.status)}`}>
                <span className="dot" /> {titleCase(a.status)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ViolationDrawer({
  violation,
  onClose,
  onChanged,
}: {
  violation: Violation | null
  onClose: () => void
  onChanged: () => void
}) {
  const { estName } = useLookup()
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [reinspections, setReinspections] = useState<Reinspection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!violation) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      api.violationCorrectiveActions(violation.id),
      api.violationReinspections(violation.id),
    ])
      .then(([ca, re]) => {
        if (cancelled) return
        setActions(ca)
        setReinspections(re)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load details')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [violation])

  if (!violation) return null

  return (
    <Drawer
      open
      onClose={onClose}
      title={titleCase(violation.category)}
      sub={`Violation #${violation.id} · ${estName(violation.establishment_id)}`}
      wide
    >
      <div className="kv" style={{ marginBottom: 14 }}>
        <dt>Severity</dt>
        <dd><SeverityBadge level={violation.severity} /></dd>
        <dt>Status</dt>
        <dd><StatusBadge status={violation.status} /></dd>
        <dt>Inspection</dt>
        <dd>#{violation.inspection_id}</dd>
        <dt>Evidence</dt>
        <dd>{violation.evidence_path ? 'Attached' : 'None'}</dd>
      </div>

      <div
        style={{
          fontSize: 13,
          color: 'var(--ink-2)',
          lineHeight: 1.65,
          marginBottom: 12,
          borderLeft: `3px solid ${SEV_COLOR[violation.severity] ?? 'var(--ink-3)'}`,
          paddingLeft: 10,
        }}
      >
        {violation.description}
      </div>
      {violation.corrective_action && (
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
          <strong>Required corrective action:</strong> {violation.corrective_action}
        </div>
      )}

      <div className="mini-head">Violation evidence</div>
      <div className="chip-row" style={{ marginBottom: 16 }}>
        <EvidenceViewer path={violation.evidence_path} />
        <UploadEvidence
          upload={(f) => api.uploadViolationEvidence(violation.id, f)}
          onUploaded={onChanged}
        />
      </div>

      <div className="mini-head">Corrective actions ({actions.length})</div>
      {loading && <PageLoader label="Loading details…" />}
      {error && <ErrorBanner message={error} />}
      {!loading && actions.map((a) => (
        <CorrectiveActionBlock
          key={a.id}
          action={{ id: a.id, status: a.status, description: a.action_description, evidence: a.evidence_path, inspector_comment: a.inspector_comment }}
          onChanged={() => { onChanged(); reloadActions(violation.id, setActions) }}
        />
      ))}
      {!loading && actions.length === 0 && (
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>No corrective actions recorded for this violation yet.</div>
      )}

      {reinspections.length > 0 && (
        <>
          <div className="mini-head" style={{ marginTop: 14 }}>Re-inspections ({reinspections.length})</div>
          <div className="violation-flow" style={{ margin: 0 }}>
            {reinspections.map((r) => (
              <ReinspectionCard
                key={r.id}
                r={{ id: r.id, date: r.inspection_date, inspector: r.inspector_name, result: r.result, notes: r.notes }}
                onChanged={onChanged}
              />
            ))}
          </div>
        </>
      )}
    </Drawer>
  )
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

function CorrectiveActionBlock({
  action,
  onChanged,
}: {
  action: { id: number; status: string; description: string; evidence: string | null; inspector_comment: string | null }
  onChanged: () => void
}) {
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
    <div className="rec-row" style={{ marginBottom: 10 }}>
      <div className="rec-flow">
        <StatusBadge status={action.status} />
        <span style={{ fontSize: 12.5, minWidth: 140, color: 'var(--ink-2)' }}>{action.description}</span>
      </div>
      {action.inspector_comment && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Inspector: {action.inspector_comment}</div>
      )}
      <div className="rec-flow" style={{ marginTop: 8 }}>
        <EvidenceViewer path={action.evidence} size="sm" />
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

function ReinspectionCard({
  r,
  onChanged,
}: {
  r: { id: number; date: string; inspector: string | null; result: string; notes: string | null }
  onChanged: () => void
}) {
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

function reloadActions(id: number, setter: (a: CorrectiveAction[]) => void) {
  api.violationCorrectiveActions(id).then(setter).catch(() => undefined)
}