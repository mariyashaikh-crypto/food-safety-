import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { Inspection, Violation } from '../api/types'
import { PageLoader } from '../components/ui/Loading'
import { ErrorBanner } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/Card'
import { Modal, Drawer } from '../components/ui/Overlay'
import { Field, Input, Select, Textarea } from '../components/ui/Form'
import { Icon } from '../components/icons'
import { StatusBadge, SeverityBadge, RiskBadge } from '../components/ui/Badge'
import { scoreColor, scoreTone } from '../components/ui/Gauge'
import { formatDate, titleCase, daysAgo } from '../utils/format'
import { useToast } from '../components/Toast'
import { useLookup } from '../context/LookupContext'
import { DataTable, type Column } from '../components/ui/DataTable'
import { EvidencePreview } from './EstablishmentDetailPage'
import { Kicker } from '../components/investigation'

// ----------------------------------------------------------

function toneForStatus(status: string): 'red' | 'amber' | 'green' | 'blue' | 'gray' {
  const key = status.toUpperCase()
  if (key === 'IN PROGRESS' || key === 'OPEN') return 'amber'
  if (key === 'COMPLETED' || key === 'CLOSED' || key === 'RESOLVED') return 'green'
  if (key === 'SCHEDULED' || key === 'SUBMITTED' || key === 'REVIEWED' || key === 'UNDER REVIEW') return 'blue'
  return 'gray'
}

function agoLabel(value: string | null | undefined): string {
  const days = daysAgo(value)
  if (days == null) return ''
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function InspectionsPage() {
  const toast = useToast()
  const { estName, refresh } = useLookup()
  const list = useApi(() => api.inspections())

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Inspection | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list.data ?? [])
      .filter((i) => {
        if (statusFilter !== 'ALL' && i.status !== statusFilter) return false
        if (q && !estName(i.establishment_id).toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.inspection_date.localeCompare(a.inspection_date))
  }, [list.data, query, statusFilter, estName])

  const statuses = useMemo(
    () => [...new Set((list.data ?? []).map((i) => i.status))],
    [list.data],
  )

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>()

    for (const i of list.data ?? []) {
      map.set(i.status, (map.get(i.status) ?? 0) + 1)
    }

    return [...map.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  }, [list.data])

  const summary = useMemo(() => {
    const total = list.data?.length ?? 0

    if (!total) return 'No inspection records on file yet.'

    const parts = statusCounts.map(
      (c) => `${c.count} ${titleCase(c.status).toLowerCase()}`,
    )

    return `${total} inspection record${total === 1 ? '' : 's'} on file — ${parts.join(', ')}.`
  }, [list.data, statusCounts])

  const columns: Column<Inspection>[] = [
    {
      key: 'date',
      title: 'Date',
      render: (r) => (
        <>
          <span className="table-cell-main">{formatDate(r.inspection_date)}</span>
          <div className="table-cell-sub">{agoLabel(r.inspection_date)}</div>
        </>
      ),
    },
    {
      key: 'est',
      title: 'Establishment',
      render: (r) => (
        <Link
          to={`/establishments/${r.establishment_id}`}
          onClick={(e) => e.stopPropagation()}
          style={{ textDecoration: 'none' }}
        >
          <span
            className="table-cell-main"
            style={{ color: 'var(--blue-ink)' }}
          >
            {estName(r.establishment_id)}
          </span>
          <div className="table-cell-sub">
            Establishment #{r.establishment_id}
          </div>
        </Link>
      ),
    },
    {
      key: 'inspector',
      title: 'Inspector',
      render: (r) => <span>{r.inspector_name ?? '—'}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'risk',
      title: 'Risk score',
      align: 'right',
      render: (r) => (
        <div
          className="dir-score"
          style={{ justifyContent: 'flex-end' }}
        >
          <span
            style={{
              color: scoreColor(r.risk_score),
              minWidth: 26,
            }}
          >
            {Math.round(r.risk_score)}
          </span>

          <div
            className="bar-track"
            style={{ width: 44 }}
          >
            <div
              className={`bar-fill bar-fill--${scoreTone(r.risk_score)}`}
              style={{
                width: `${Math.min(Math.max(r.risk_score, 0), 100)}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'notes',
      title: 'Notes',
      render: (r) =>
        r.notes ? (
          <span
            className="clamp-2"
            style={{
              display: '-webkit-box',
              color: 'var(--ink-3)',
              fontSize: 12.5,
              maxWidth: 260,
            }}
          >
            {r.notes}
          </span>
        ) : (
          <span className="table-cell-sub">—</span>
        ),
    },
    {
      key: 'view',
      title: '',
      align: 'right',
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<Icon.Eye />}
          onClick={(e) => {
            e.stopPropagation()
            setSelected(r)
          }}
        >
          Violations
        </Button>
      ),
    },
  ]

  if (list.loading && !list.data) {
    return <PageLoader label="Loading inspections…" />
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Kicker>Inspection Records</Kicker>
          <h1 className="page-title">Inspection Records</h1>
          <p className="page-sub">{summary}</p>
        </div>

        <div className="page-actions">
          <Button
            variant="primary"
            icon={<Icon.Plus />}
            onClick={() => setCreateOpen(true)}
          >
            Schedule inspection
          </Button>
        </div>
      </div>

      {list.error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBanner
            message={list.error}
            onRetry={list.reload}
          />
        </div>
      )}

      <div className="stat-grid">
        <StatCard
          label="Inspection records"
          value={list.data?.length ?? 0}
          tone="gray"
          note="across all establishments"
        />

        {statusCounts.slice(0, 4).map((c) => (
          <StatCard
            key={c.status}
            label={titleCase(c.status)}
            value={c.count}
            tone={toneForStatus(c.status)}
            note={`${c.count === 1 ? 'record' : 'records'}`}
          />
        ))}
      </div>

      <div
        className="toolbar"
        style={{
          marginTop: 16,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="search-input">
          <Icon.Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search establishment…"
          />
        </div>

        <Select
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>

          {statuses.map((s) => (
            <option
              key={s}
              value={s}
            >
              {s}
            </option>
          ))}
        </Select>

        <div className="toolbar-spacer" />

        <span
          className="muted"
          style={{ fontSize: 12.5 }}
        >
          {rows.length} inspections
        </span>
      </div>

      <div
        className="table-wrap"
        style={{ marginTop: 0 }}
      >
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={setSelected}
          rowKey={(r) => r.id}
          emptyTitle="No inspections found"
          emptySub="Schedule your first inspection to begin tracking."
          emptyIcon={<Icon.Clipboard />}
        />
      </div>

      <ScheduleInspectionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onScheduled={() => {
          toast.push('Inspection scheduled', 'success')
          list.reload()
          refresh()
        }}
      />

      <InspectionDrawer
        inspection={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          list.reload()
          refresh()
        }}
      />
    </div>
  )
}

// ----------------------------------------------------------

function ScheduleInspectionModal({
  open,
  onClose,
  onScheduled,
}: {
  open: boolean
  onClose: () => void
  onScheduled: () => void
}) {
  const { estName } = useLookup()
  const establishments = useApi(() => api.establishments())

  const [form, setForm] = useState({
    establishment_id: '',
    inspection_date: new Date().toISOString().slice(0, 10),
    status: 'Scheduled',
    inspector_name: '',
    notes: '',
  })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Select the first establishment automatically when the modal opens
  // and establishment data has loaded.
  useEffect(() => {
    if (
      open &&
      establishments.data?.length &&
      !form.establishment_id
    ) {
      setForm((f) => ({
        ...f,
        establishment_id: String(establishments.data![0].id),
      }))
    }
  }, [open, establishments.data, form.establishment_id])

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    // Prevent submitting without a valid establishment.
    if (!form.establishment_id) {
      setError('Please select an establishment.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      await api.createInspection({
        establishment_id: Number(form.establishment_id),
        inspection_date: form.inspection_date,
        status: form.status,
        inspector_name: form.inspector_name || null,
        notes: form.notes || null,
        risk_score: 0,
      })

      setForm((f) => ({
        ...f,
        inspector_name: '',
        notes: '',
      }))

      onScheduled()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to schedule',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule inspection"
      sub="Create a new inspection record for an establishment."
    >
      <form onSubmit={submit}>
        <Field
          label="Establishment"
          required
        >
          <Select
            value={form.establishment_id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                establishment_id: e.target.value,
              }))
            }
            required
          >
            <option
              value=""
              disabled
            >
              Select…
            </option>

            {(establishments.data ?? []).map((e) => (
              <option
                key={e.id}
                value={e.id}
              >
                {estName(e.id)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="form-row">
          <Field
            label="Inspection date"
            required
          >
            <Input
              type="date"
              value={form.inspection_date}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  inspection_date: e.target.value,
                }))
              }
              required
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value,
                }))
              }
            >
              <option>Scheduled</option>
              <option>In Progress</option>
            </Select>
          </Field>
        </div>

        <Field label="Inspector">
          <Input
            value={form.inspector_name}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                inspector_name: e.target.value,
              }))
            }
            placeholder="Assigned inspector"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                notes: e.target.value,
              }))
            }
            placeholder="Scope or focus of the inspection"
          />
        </Field>

        {error && (
          <div
            className="error-banner"
            style={{ marginBottom: 12 }}
          >
            <Icon.AlertCircle className="ico" />
            <span>{error}</span>
          </div>
        )}

        <div className="form-actions">
          <Button
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={busy}
          >
            Schedule inspection
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ----------------------------------------------------------

function InspectionDrawer({
  inspection,
  onClose,
  onChanged,
}: {
  inspection: Inspection | null
  onClose: () => void
  onChanged: () => void
}) {
  const { estName } = useLookup()
  const open = !!inspection

  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  const toast = useToast()

  useEffect(() => {
    if (!inspection) return

    let cancelled = false

    setLoading(true)
    setError(null)
    setNewStatus(inspection.status)

    api
      .inspectionViolations(inspection.id)
      .then((data) => {
        if (!cancelled) {
          setViolations(data)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load violations',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [inspection])

  if (!inspection) return null

  const updateStatus = async (status: string) => {
    try {
      await api.updateInspectionStatus(
        inspection.id,
        status,
      )

      toast.push(
        `Inspection #${inspection.id} → ${status}`,
        'success',
      )

      onChanged()
    } catch (err) {
      toast.push(
        err instanceof Error
          ? err.message
          : 'Update failed',
        'error',
      )
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Inspection #${inspection.id}`}
      sub={`${estName(inspection.establishment_id)} · ${formatDate(inspection.inspection_date)}`}
    >
      <div
        className="kv"
        style={{ marginBottom: 14 }}
      >
        <dt>Status</dt>
        <dd>
          <StatusBadge status={inspection.status} />
        </dd>

        <dt>Inspector</dt>
        <dd>{inspection.inspector_name ?? '—'}</dd>

        <dt>Notes</dt>
        <dd>{inspection.notes ?? '—'}</dd>

        <dt>Risk score</dt>
        <dd>
          <RiskBadge
            level={
              inspection.risk_score >= 70
                ? 'HIGH'
                : inspection.risk_score >= 40
                  ? 'MEDIUM'
                  : 'LOW'
            }
          />{' '}
          {Math.round(inspection.risk_score)}
        </dd>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Select
          style={{
            width: 'auto',
            height: 32,
          }}
          value={newStatus}
          onChange={(e) =>
            setNewStatus(e.target.value)
          }
        >
          {[
            'Scheduled',
            'In Progress',
            'Completed',
            'Submitted',
            'Reviewed',
          ].map((s) => (
            <option
              key={s}
              value={s}
            >
              {s}
            </option>
          ))}
        </Select>

        <Button
          size="sm"
          variant="primary"
          disabled={newStatus === inspection.status}
          onClick={() => updateStatus(newStatus)}
        >
          Update status
        </Button>
      </div>

      <div
        className="section-title"
        style={{ marginBottom: 10 }}
      >
        <Icon.Warning className="ico" /> Violations recorded (
        {violations.length})
      </div>

      {loading && (
        <PageLoader label="Loading violations…" />
      )}

      {error && (
        <ErrorBanner message={error} />
      )}

      {!loading &&
        !error &&
        violations.length === 0 && (
          <div
            className="muted"
            style={{
              fontSize: 13,
              padding: '8px 0',
            }}
          >
            No violations recorded for this inspection.
          </div>
        )}

      {!loading &&
        violations.map((v) => (
          <div
            key={v.id}
            className="rec-row"
          >
            <div className="rec-flow">
              <span className="table-cell-main">
                {titleCase(v.category)}
              </span>

              <SeverityBadge level={v.severity} />

              <StatusBadge status={v.status} />
            </div>

            <div
              className="muted"
              style={{
                fontSize: 12.5,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              {v.description}
            </div>

            {v.evidence_path && (
              <div style={{ marginTop: 8 }}>
                <EvidencePreview path={v.evidence_path} />
              </div>
            )}
          </div>
        ))}
    </Drawer>
  )
}