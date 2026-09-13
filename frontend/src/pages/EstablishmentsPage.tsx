import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { SmartDecision } from '../api/types'
import { PageLoader } from '../components/ui/Loading'
import { ErrorBanner, EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Form'
import { Modal } from '../components/ui/Overlay'
import { Icon } from '../components/icons'
import { RiskBadge, StatusBadge } from '../components/ui/Badge'
import { scoreColor } from '../components/ui/Gauge'
import { Kicker } from '../components/investigation'
import { formatDate, daysAgo, titleCase } from '../utils/format'
import { useToast } from '../components/Toast'

function isHigh(level: string | null | undefined): boolean {
  return (level || '').toUpperCase() === 'HIGH'
}

function agoLabel(value: string | null | undefined): string {
  const days = daysAgo(value)
  if (days == null) return 'Never inspected'
  if (days === 0) return 'Inspected today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function EstablishmentsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const list = useApi(() => api.establishments())
  const smart = useApi(() => api.smartDecisionOverview())

  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [regionFilter, setRegionFilter] = useState('ALL')
  const [osFilter, setOsFilter] = useState('ALL')
  const [inspectedFilter, setInspectedFilter] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const rows = useMemo(() => {
    const map = new Map<number, SmartDecision>()
    smart.data?.establishments.forEach((s) => map.set(s.establishment_id, s))
    return (list.data ?? []).map((e) => ({ ...e, smart: map.get(e.id) }))
  }, [list.data, smart.data])

  const types = useMemo(() => [...new Set(rows.map((r) => r.establishment_type))].sort(), [rows])
  const regions = useMemo(() => [...new Set(rows.map((r) => r.region))].sort(), [rows])
  const operatingStatuses = useMemo(() => {
    const set = new Set<string>(['Active', 'Inactive'])
    for (const r of rows) if (r.operating_status) set.add(r.operating_status)
    return [...set].sort()
  }, [rows])

  const counts = useMemo(() => {
    let high = 0
    let medium = 0
    for (const r of rows) {
      const lvl = (r.risk_level || '').toUpperCase()
      if (lvl === 'HIGH') high++
      else if (lvl === 'MEDIUM') medium++
    }
    return { total: rows.length, high, medium, low: Math.max(0, rows.length - high - medium) }
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (riskFilter !== 'ALL' && r.risk_level !== riskFilter) return false
        if (typeFilter !== 'ALL' && r.establishment_type !== typeFilter) return false
        if (regionFilter !== 'ALL' && r.region !== regionFilter) return false
        if (osFilter !== 'ALL' && (r.operating_status || '').toLowerCase() !== osFilter.toLowerCase()) return false
        if (inspectedFilter === 'INSPECTED' && !r.last_inspection_date) return false
        if (inspectedFilter === 'NOT_INSPECTED' && r.last_inspection_date) return false
        if (q) {
          const hay = [r.name, r.establishment_type, r.region, r.address, String(r.id)].join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score
        return a.name.localeCompare(b.name)
      })
  }, [rows, query, riskFilter, typeFilter, regionFilter, osFilter, inspectedFilter])

  if (list.loading && !list.data) return <PageLoader label="Loading establishments…" />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Kicker>Establishment Inspection Directory</Kicker>
          <h1 className="page-title">Establishment Directory</h1>
          <p className="page-sub">
            {counts.total} registered establishments across the command area — {counts.high} HIGH risk,{' '}
            {counts.medium} MEDIUM risk, {counts.low} LOW risk. Every row opens the full inspection dossier.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Icon.Plus />} onClick={() => setCreateOpen(true)}>
            Register establishment
          </Button>
        </div>
      </div>

      {list.error && (
        <div style={{ marginBottom: 16 }}><ErrorBanner message={list.error} onRetry={list.reload} /></div>
      )}

      <div className="stat-grid">
        <StatCard label="Establishments" value={counts.total} tone="gray" note="registered directory entries" />
        <StatCard label="High risk" value={counts.high} tone="red" note="priority inspection" />
        <StatCard label="Medium risk" value={counts.medium} tone="amber" note="escalate on trend" />
        <StatCard label="Low risk" value={counts.low} tone="green" note="routine coverage" />
      </div>

      <div
        className="toolbar"
        style={{ marginTop: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
      >
        <div className="search-input">
          <Icon.Search />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, type, region, address…" />
        </div>
        <Select style={{ width: 'auto' }} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
          <option value="ALL">All risk levels</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </Select>
        <Select style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All types</option>
          {types.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
        </Select>
        <Select style={{ width: 'auto' }} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="ALL">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Select style={{ width: 'auto' }} value={osFilter} onChange={(e) => setOsFilter(e.target.value)}>
          <option value="ALL">All operating statuses</option>
          {operatingStatuses.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
        <Select style={{ width: 'auto' }} value={inspectedFilter} onChange={(e) => setInspectedFilter(e.target.value)}>
          <option value="ALL">All inspection status</option>
          <option value="INSPECTED">Inspected</option>
          <option value="NOT_INSPECTED">Not inspected</option>
        </Select>
        <div className="toolbar-spacer" />
        <span className="muted" style={{ fontSize: 12.5 }}>{filtered.length} of {rows.length}</span>
      </div>

      <div className="table-wrap" style={{ marginTop: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icon.Building />}
            title="No establishments match"
            sub="Adjust the search or filters, or register a new establishment."
          />
        ) : (
          <>
            <div
              className="dir-row"
              style={{
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                fontSize: 11,
                fontWeight: 650,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-3)',
              }}
            >
              <span>Establishment</span>
              <span className="dir-md-hide">Region</span>
              <span>Risk level</span>
              <span className="dir-md-hide">Risk score</span>
              <span className="dir-md-hide">Last inspection</span>
              <span className="dir-md-hide">Operating status</span>
              <span>ML probability</span>
            </div>
            {filtered.map((r) => {
              const ml = r.smart?.ml_prediction.probability
              const high = isHigh(r.risk_level)
              return (
                <div
                  key={r.id}
                  className="dir-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/establishments/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/establishments/${r.id}`)
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    ...(high ? { borderLeft: '3px solid var(--red)' } : {}),
                  }}
                >
                  <div className="dir-name">
                    {high && (
                      <span className="dir-flag" style={{ marginBottom: 3 }}>
                        <span className="dot" />
                        HIGH RISK
                      </span>
                    )}
                    <span className="n">{r.name}</span>
                    <span className="t">{titleCase(r.establishment_type)}</span>
                  </div>

                  <span
                    className="dir-md-hide"
                    style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
                  >
                    <Icon.MapPin className="ico" style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
                    {r.region}
                  </span>

                  <RiskBadge level={r.risk_level} />

                  <div className="dir-score dir-md-hide">
                    <span style={{ color: scoreColor(r.risk_score), minWidth: 26 }}>{Math.round(r.risk_score)}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${Math.min(Math.max(r.risk_score, 0), 100)}%`, background: scoreColor(r.risk_score) }}
                      />
                    </div>
                  </div>

                  <div className="dir-md-hide">
                    {r.last_inspection_date ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatDate(r.last_inspection_date)}
                        </span>
                        <span className="dir-sub">{agoLabel(r.last_inspection_date)}</span>
                      </div>
                    ) : (
                      <span className="dir-sub">Not inspected</span>
                    )}
                  </div>

                  <div className="dir-md-hide">
                    <StatusBadge status={r.operating_status} />
                  </div>

                  {ml != null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          fontVariantNumeric: 'tabular-nums',
                          color: scoreColor(ml),
                        }}
                      >
                        {Math.round(ml)}%
                      </span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.min(Math.max(ml, 0), 100)}%`, background: scoreColor(ml) }} />
                      </div>
                    </div>
                  ) : (
                    <span className="dir-sub">—</span>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      <CreateEstablishmentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { list.reload(); smart.reload(); toast.push('Establishment registered', 'success') }} regions={regions} types={types} />
    </div>
  )
}

function CreateEstablishmentModal({
  open,
  onClose,
  onCreated,
  regions,
  types,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  regions: string[]
  types: string[]
}) {
  const [form, setForm] = useState({
    name: '',
    establishment_type: '',
    address: '',
    region: '',
    status: 'Active',
    operating_status: 'Open',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.createEstablishment({
        name: form.name,
        establishment_type: form.establishment_type,
        address: form.address,
        region: form.region,
        status: form.status,
        operating_status: form.operating_status,
      })
      setForm({ name: '', establishment_type: '', address: '', region: '', status: 'Active', operating_status: 'Open' })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register establishment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register establishment" sub="The establishment starts with a LOW risk baseline until inspection data exists.">
      <form onSubmit={submit}>
        <Field label="Name" required>
          <Input value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. Main Street Kitchen" required />
        </Field>
        <div className="form-row">
          <Field label="Type" required>
            <Select value={form.establishment_type} onChange={(e) => set('establishment_type')(e.target.value)} required>
              <option value="">Select…</option>
              {types.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </Select>
          </Field>
          <Field label="Region" required>
            <Select value={form.region} onChange={(e) => set('region')(e.target.value)} required>
              <option value="">Select…</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Address" required>
          <Textarea value={form.address} onChange={(e) => set('address')(e.target.value)} placeholder="Street, area, city" required />
        </Field>
        <div className="form-row">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status')(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </Field>
          <Field label="Operating status">
            <Select value={form.operating_status} onChange={(e) => set('operating_status')(e.target.value)}>
              <option>Open</option>
              <option>Closed</option>
            </Select>
          </Field>
        </div>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}><Icon.AlertCircle /><span>{error}</span></div>}
        <div className="form-actions">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={submitting}>Register</Button>
        </div>
      </form>
    </Modal>
  )
}