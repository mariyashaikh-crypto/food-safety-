import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, isPdfUrl } from '../api/client'
import type { CorrectiveAction, Reinspection, Violation } from '../api/types'
import { useLookup } from '../context/LookupContext'
import { Icon } from '../components/icons'
import { PageLoader } from '../components/ui/Loading'
import { ErrorBanner } from '../components/ui/States'
import { SeverityBadge, StatusBadge } from '../components/ui/Badge'
import { Kicker, ChainSteps, EvidenceViewer } from '../components/investigation'
import { useApi } from '../hooks/useApi'
import { formatDate } from '../utils/format'

interface EvidenceRow {
  violation: Violation
  actions: CorrectiveAction[]
  reinspections: Reinspection[]
}

type Filter = 'all' | 'with-evidence' | 'unsettled' | 'rejected'

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

export function EvidencePage() {
  const { estName, inspDate } = useLookup()
  const rows = useApi<EvidenceRow[]>(async () => {
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
  const [filter, setFilter] = useState<Filter>('all')

  const stats = useMemo(() => {
    if (!rows.data) return null
    let violationEvidence = 0
    let actionEvidence = 0
    let pdfs = 0
    let images = 0
    let rejected = 0
    for (const r of rows.data) {
      if (r.violation.evidence_path) {
        violationEvidence += 1
        if (isPdfUrl(r.violation.evidence_path)) pdfs += 1
        else images += 1
      }
      for (const a of r.actions) {
        if (a.evidence_path) {
          actionEvidence += 1
          if (isPdfUrl(a.evidence_path)) pdfs += 1
          else images += 1
        }
        if (a.status.toUpperCase() === 'REJECTED') rejected += 1
      }
    }
    const unsettled = rows.data.filter(
      (r) =>
        !/RESOLVED|CLOSED|FIXED/.test(r.violation.status.toUpperCase()) ||
        r.actions.some((a) => a.status.toUpperCase() === 'REJECTED'),
    ).length
    return { violationEvidence, actionEvidence, pdfs, images, rejected, unsettled }
  }, [rows.data])

  const filtered = useMemo(() => {
    if (!rows.data) return []
    const q = query.trim().toLowerCase()
    return rows.data.filter((r) => {
      const name = estName(r.violation.establishment_id).toLowerCase()
      if (q && !name.includes(q) && !r.violation.category.toLowerCase().includes(q)) return false
      switch (filter) {
        case 'with-evidence':
          return !!r.violation.evidence_path || r.actions.some((a) => !!a.evidence_path)
        case 'unsettled':
          return (
            !/RESOLVED|CLOSED|FIXED/.test(r.violation.status.toUpperCase()) ||
            r.actions.some((a) => a.status.toUpperCase() === 'REJECTED')
          )
        case 'rejected':
          return r.actions.some((a) => a.status.toUpperCase() === 'REJECTED')
        default:
          return true
      }
    })
  }, [rows.data, query, filter, estName])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Kicker>Evidence &amp; Resolution</Kicker>
          <h1 className="page-title">Inspection Evidence Record</h1>
          <p className="page-sub">
            Chain of context for every recorded violation — inspection, violation, corrective
            action, evidence, re-inspection and outcome — assembled from the live inspection record.
          </p>
        </div>
      </div>

      {rows.loading && <PageLoader label="Compiling evidence record…" />}
      {rows.error && (
        <ErrorBanner
          message={rows.error}
          onRetry={() => {
            rows.reload()
          }}
        />
      )}

      {rows.data && stats && (
        <>
          <div className="cluster-6">
            <div className="stat stat--blue">
              <div className="stat-label">Violations w/ evidence</div>
              <div className="stat-value">{stats.violationEvidence}</div>
            </div>
            <div className="stat stat--graphite">
              <div className="stat-label">Action evidence files</div>
              <div className="stat-value">{stats.actionEvidence}</div>
            </div>
            <div className="stat stat--gray">
              <div className="stat-label">Images</div>
              <div className="stat-value">{stats.images}</div>
            </div>
            <div className="stat stat--violet">
              <div className="stat-label">PDF documents</div>
              <div className="stat-value">{stats.pdfs}</div>
            </div>
            <div className="stat stat--red">
              <div className="stat-label">Unsettled violations</div>
              <div className="stat-value">{stats.unsettled}</div>
            </div>
            <div className="stat stat--red">
              <div className="stat-label">Rejected actions</div>
              <div className="stat-value">{stats.rejected}</div>
            </div>
          </div>

          <div className="toolbar" style={{ marginTop: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div className="search-input">
              <Icon.Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search establishment or violation category…"
              />
            </div>
            <div className="toolbar-spacer" />
            <select className="select" style={{ width: 220 }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All evidence</option>
              <option value="with-evidence">With recorded evidence</option>
              <option value="unsettled">Awaiting resolution</option>
              <option value="rejected">Rejected corrective actions</option>
            </select>
          </div>

          <div style={{ marginTop: 16 }}>
            {filtered.length === 0 && <div className="empty">No matching records.</div>}
            {filtered.map((row) => (
              <EvidenceRecordCard key={row.violation.id} row={row} estName={estName} inspDate={inspDate} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EvidenceRecordCard({
  row,
  estName,
  inspDate,
}: {
  row: EvidenceRow
  estName: (id: number) => string
  inspDate: (id: number) => string
}) {
  const { violation, actions, reinspections } = row
  const evidence = [
    ...(violation.evidence_path ? [violation.evidence_path] : []),
    ...actions.map((a) => a.evidence_path).filter((p): p is string => !!p),
  ]
  const lastReinspection = reinspections[reinspections.length - 1]
  const resultLabel = lastReinspection ? lastReinspection.result : null

  const steps: { label: string; tone: 'ok' | 'warn' | 'bad' | 'idle' }[] = [
    { label: 'Inspection', tone: 'ok' },
    { label: 'Violation', tone: violationTone(violation.status) },
    {
      label: actions.length ? `Corrective action${actions.length > 1 ? 's' : ''}` : 'No action',
      tone: actions.some((a) => a.status.toUpperCase() === 'REJECTED')
        ? 'bad'
        : actions.length
          ? 'warn'
          : 'idle',
    },
    {
      label: evidence.length ? 'Evidence' : 'No evidence',
      tone: evidence.length ? 'ok' : 'warn',
    },
    {
      label: lastReinspection ? 'Re-inspection' : 'No re-inspection',
      tone: lastReinspection ? 'ok' : 'idle',
    },
    {
      label: resultLabel ? 'Result' : 'Pending',
      tone: resultLabel ? resultTone(resultLabel) : 'idle',
    },
  ]

  return (
    <div className="rec-row">
      <div className="rec-flow">
        <SeverityBadge level={violation.severity} />
        <StatusBadge status={violation.status} />
        <span className="table-cell-main" style={{ fontSize: 13 }}>
          {violation.category}
        </span>
        <Link to={`/establishments/${violation.establishment_id}`} className="link-btn" style={{ marginLeft: 'auto' }}>
          {estName(violation.establishment_id)}
        </Link>
      </div>
      <div className="table-cell-sub" style={{ marginTop: 3 }}>{violation.description}</div>

      <div className="rec-flow" style={{ marginTop: 10 }}>
        <span className="table-cell-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon.Clipboard /> {inspDate(violation.inspection_id)}
        </span>
        <ChainSteps steps={steps} />
      </div>

      {evidence.length > 0 && (
        <div className="chip-row" style={{ marginTop: 10 }}>
          <span className="attach-label">
            <Icon.File /> Evidence files
          </span>
          {evidence.map((path, i) => (
            <EvidenceViewer key={i} path={path} label={isPdfUrl(path) ? 'Report' : `Photo`} size="sm" />
          ))}
        </div>
      )}

      {(actions.length > 0 || reinspections.length > 0) && (
        <div className="dv-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {actions.length > 0 && (
            <div>
              <div className="mini-head">Corrective actions</div>
              {actions.map((a) => (
                <div key={a.id} className="dv-item">
                  <StatusBadge status={a.status} />
                  <span>{a.action_description}</span>
                  {a.inspector_comment && <span className="dv-comment">{a.inspector_comment}</span>}
                </div>
              ))}
            </div>
          )}
          {reinspections.length > 0 && (
            <div>
              <div className="mini-head">Re-inspections</div>
              {reinspections.map((r) => (
                <div key={r.id} className="dv-item">
                  <span className="dv-date">{formatDate(r.inspection_date)}</span>
                  <StatusBadge status={r.result} />
                  {r.notes && <span className="dv-comment">{r.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}