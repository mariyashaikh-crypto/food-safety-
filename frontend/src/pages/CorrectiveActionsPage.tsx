import { useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { CorrectiveAction, Violation } from '../api/types'
import { PageLoader } from '../components/ui/Loading'
import { ErrorBanner, EmptyState } from '../components/ui/States'
import { Card, StatCard } from '../components/ui/Card'
import { Modal } from '../components/ui/Overlay'
import { Icon } from '../components/icons'
import { StatusBadge, SeverityBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Field, Select, Textarea } from '../components/ui/Form'
import { Kicker, EvidenceViewer } from '../components/investigation'
import { useToast } from '../components/Toast'
import { useLookup } from '../context/LookupContext'
import { titleCase } from '../utils/format'

const BUCKETS = [
  { key: 'Submitted', match: (s: string) => s === 'Submitted' },
  { key: 'Accepted', match: (s: string) => s === 'Accepted' || s === 'Closed' },
  { key: 'Rejected', match: (s: string) => s === 'Rejected' },
  { key: 'Resolved', match: (s: string) => /resolv/i.test(s) },
] as const

const STATUS_META: Record<string, { color: string; chip: string; marker: string }> = {
  SUBMITTED: { color: 'var(--blue)', chip: 'mini-chip--blue', marker: 'Awaiting review' },
  'UNDER REVIEW': { color: 'var(--amber)', chip: 'mini-chip--amber', marker: 'In review' },
  ACCEPTED: { color: 'var(--green)', chip: 'mini-chip--green', marker: 'Under re-inspection' },
  REJECTED: { color: 'var(--red)', chip: 'mini-chip--red', marker: 'Needs correction' },
  RESOLVED: { color: 'var(--green)', chip: 'mini-chip--green', marker: 'Complete' },
  CLOSED: { color: 'var(--green)', chip: 'mini-chip--green', marker: 'Closed' },
  REQUIRED: { color: 'var(--amber)', chip: 'mini-chip--amber', marker: 'Action required' },
  OPEN: { color: 'var(--amber)', chip: 'mini-chip--amber', marker: 'Open' },
}

function workflowMeta(status: string) {
  return STATUS_META[status.toUpperCase()] ?? { color: 'var(--border-strong)', chip: '', marker: titleCase(status) }
}

export function CorrectiveActionsPage() {
  const { estName } = useLookup()
  const toast = useToast()
  const list = useApi(() => api.correctiveActions())
  const violations = useApi(() => api.violations())

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [newViolation, setNewViolation] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createBusy, setCreateBusy] = useState(false)

  const vMap = useMemo(() => {
    const m = new Map<number, Violation>()
    for (const v of violations.data ?? []) m.set(v.id, v)
    return m
  }, [violations.data])

  const counts = useMemo(() => {
    const data = list.data ?? []
    const submitted = data.filter((a) => a.status === 'Submitted').length
    const underReview = data.filter((a) => /under review/i.test(a.status)).length
    const accepted = data.filter((a) => a.status === 'Accepted' || a.status === 'Closed').length
    const rejected = data.filter((a) => a.status === 'Rejected').length
    const resolved = data.filter((a) => /resolv/i.test(a.status)).length
    return { submitted, underReview, accepted, rejected, resolved, total: data.length }
  }, [list.data])

  const filterOptions = useMemo(
    () =>
      BUCKETS.map((b) => ({
        key: b.key,
        count: (list.data ?? []).filter((a) => b.match(a.status)).length,
      })).filter((o) => o.count > 0),
    [list.data],
  )

  const workflowLine = useMemo(() => {
    const parts: string[] = []
    if (counts.submitted) parts.push(`${counts.submitted} submitted`)
    if (counts.underReview) parts.push(`${counts.underReview} under review`)
    if (counts.accepted) parts.push(`${counts.accepted} accepted`)
    if (counts.rejected) parts.push(`${counts.rejected} rejected`)
    if (counts.resolved) parts.push(`${counts.resolved} resolved`)
    return parts.length
      ? `Review queue: ${parts.join(' · ')}.`
      : 'No corrective actions in the queue yet.'
  }, [counts])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const bucket = BUCKETS.find((b) => b.key === statusFilter)
    return (list.data ?? [])
      .filter((a) => {
        if (bucket && !bucket.match(a.status)) return false
        if (q) {
          const v = vMap.get(a.violation_id)
          const hay = [
            v?.category ?? '',
            v?.description ?? '',
            a.action_description,
            a.inspector_comment ?? '',
            estName(v?.establishment_id ?? -1),
          ].join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.id - a.id)
  }, [list.data, query, statusFilter, vMap, estName])

  const handleCreate = async () => {
    const vid = Number(newViolation)
    if (!vid || !newDescription.trim()) return
    setCreateBusy(true)
    try {
      await api.createCorrectiveAction({ violation_id: vid, action_description: newDescription.trim(), status: 'Submitted' })
      toast.push('Corrective action submitted', 'success')
      setCreateOpen(false)
      setNewViolation('')
      setNewDescription('')
      list.reload()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to create action', 'error')
    } finally {
      setCreateBusy(false)
    }
  }

  if (list.loading && !list.data) return <PageLoader label="Loading corrective actions…" />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Kicker>CORRECTIVE ACTION REVIEW</Kicker>
          <h1 className="page-title">Corrective Action Review</h1>
          <p className="page-sub">{workflowLine}</p>
        </div>
        <div className="page-actions">
          <Button size="sm" icon={<Icon.Plus />} onClick={() => setCreateOpen(true)}>
            New corrective action
          </Button>
        </div>
      </div>

      {list.error && <div style={{ marginBottom: 16 }}><ErrorBanner message={list.error} onRetry={list.reload} /></div>}

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Submitted" tone="blue" value={counts.submitted} note={`${counts.underReview} under review`} />
        <StatCard label="Accepted" tone="green" value={counts.accepted} note="forwarded to re-inspection" />
        <StatCard label="Rejected" tone="red" value={counts.rejected} note="returned for correction" />
        <StatCard label="Resolved" tone="green" value={counts.resolved} note="workflow complete" />
      </div>

      <Card>
        <div className="toolbar">
          <div className="search-input">
            <Icon.Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search category, violation, action or establishment…"
            />
          </div>
          <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            {filterOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.key} ({o.count})</option>
            ))}
          </select>
          <div className="toolbar-spacer" />
          <span className="muted" style={{ fontSize: 12.5 }}>{rows.length} actions</span>
        </div>
        <div style={{ padding: 14 }}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Icon.Check />}
              title="No corrective actions found"
              sub="Create an action from a recorded violation, or adjust the search and filters above."
            />
          ) : (
            rows.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                violation={vMap.get(a.violation_id)}
                onChanged={list.reload}
              />
            ))
          )}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New corrective action"
        sub="Attach an action to a recorded violation to seed the review workflow."
        footer={
          <div className="page-actions">
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createBusy}
              disabled={!newViolation || !newDescription.trim()}
              onClick={handleCreate}
            >
              Create action
            </Button>
          </div>
        }
      >
        <Field label="Violation" required>
          <Select value={newViolation} onChange={(e) => setNewViolation(e.target.value)}>
            <option value="">Select a violation…</option>
            {(violations.data ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                #{v.id} — {titleCase(v.category)} · {estName(v.establishment_id)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Action description" required>
          <Textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Required corrective action description…"
          />
        </Field>
      </Modal>
    </div>
  )
}

function ActionCard({
  action,
  violation,
  onChanged,
}: {
  action: CorrectiveAction
  violation?: Violation
  onChanged: () => void
}) {
  const { estName } = useLookup()
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [comment, setComment] = useState('')

  const st = action.status.toLowerCase()
  const canAccept = !/accepted|closed|resolv/.test(st)
  const canReject = !/rejected|closed|resolv/.test(st)
  const canResolve = !/resolv|closed|accepted/.test(st)

  const meta = workflowMeta(action.status)

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

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await api.uploadCorrectiveActionEvidence(action.id, file)
      toast.push('Evidence uploaded', 'success')
      onChanged()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rec-row" style={{ borderLeft: `3px solid ${meta.color}`, paddingLeft: 13 }}>
      <div className="rec-flow">
        <StatusBadge status={action.status} />
        {violation ? (
          <button
            type="button"
            onClick={() =>
              navigate(violation.establishment_id ? `/establishments/${violation.establishment_id}` : '/violations')
            }
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              fontWeight: 650,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {titleCase(violation.category)}
          </button>
        ) : (
          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>Violation #{action.violation_id}</span>
        )}
        {violation && <SeverityBadge level={violation.severity} />}
        <span className="mini-chip" style={{ fontVariantNumeric: 'tabular-nums' }}>#{action.id}</span>
        {violation && (
          <span className="mini-chip" style={{ background: 'transparent', borderColor: 'transparent', color: 'var(--ink-3)' }}>
            {estName(violation.establishment_id)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span className={`mini-chip ${meta.chip}`}><span className="dot" />{meta.marker}</span>
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
        {action.action_description}
      </div>
      {action.inspector_comment && (
        <div className="dv-comment" style={{ marginTop: 6 }}>Inspector: {action.inspector_comment}</div>
      )}

      <div style={{ marginTop: 10 }}>
        <EvidenceViewer path={action.evidence_path} label={`Evidence #${action.id}`} size="sm" />
      </div>

      <div
        className="page-actions"
        style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border-faint)' }}
      >
        {canAccept && (
          <Button size="sm" variant="primary" icon={<Icon.Check />} disabled={busy} onClick={() => transition('Accepted')}>
            Accept
          </Button>
        )}
        {canReject && (
          <Button size="sm" variant="danger" icon={<Icon.X />} disabled={busy} onClick={() => transition('Rejected')}>
            Reject
          </Button>
        )}
        {canResolve && (
          <Button size="sm" variant="success" icon={<Icon.Check />} disabled={busy} onClick={() => transition('Resolved')}>
            Mark resolved
          </Button>
        )}
        <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
          {uploading ? <span className="spinner" /> : <Icon.Upload className="ico" style={{ width: 14, height: 14 }} />}
          Upload evidence
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" hidden onChange={handleUpload} disabled={uploading} />
        </label>
        <Button size="sm" variant="ghost" icon={<Icon.Edit />} disabled={busy} onClick={() => setReviewOpen(true)}>
          Edit
        </Button>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Review corrective action"
        sub="Accepting moves the action forward; rejecting returns it for correction."
        footer={
          <div className="page-actions">
            <Button onClick={() => setReviewOpen(false)}>Cancel</Button>
            {canResolve && (
              <Button variant="ghost" loading={busy} onClick={() => transition('Resolved')}>
                Mark resolved
              </Button>
            )}
            {canReject && (
              <Button variant="danger" loading={busy} onClick={() => transition('Rejected')}>
                Reject
              </Button>
            )}
            {canAccept && (
              <Button variant="success" loading={busy} onClick={() => transition('Accepted')}>
                Accept
              </Button>
            )}
          </div>
        }
      >
        <Field label="Inspector comment" hint="Optional note recorded with this decision.">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Evidence reviewed; temperature logs satisfactory."
          />
        </Field>
      </Modal>
    </div>
  )
}