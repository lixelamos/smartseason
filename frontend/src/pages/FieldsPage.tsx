import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type FieldSummary } from '../api'
import { useAuth } from '../auth'
import { EmptyState } from '../components/EmptyState'
import { FieldsSkeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { formatShortDate } from '../lib/dates'
import { downloadReport, type ReportExportFormat } from '../lib/downloadReport'
import { FIELD_STAGES } from '../lib/fieldStages'
import { useToast } from '../toast'

const DENSITY_KEY = 'smartseason-fields-density'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'AT_RISK', label: 'At risk' },
  { value: 'COMPLETED', label: 'Completed' },
] as const

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'planted', label: 'Planting date' },
  { value: 'stage', label: 'Stage' },
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
] as const

type Density = 'comfortable' | 'compact'
type SortKey = (typeof SORT_OPTIONS)[number]['value']

function readDensity(): Density {
  try {
    return localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

const statusRank: Record<FieldSummary['status'], number> = {
  ACTIVE: 0,
  AT_RISK: 1,
  COMPLETED: 2,
}

function compareFields(a: FieldSummary, b: FieldSummary, key: SortKey, asc: boolean): number {
  const dir = asc ? 1 : -1
  let cmp = 0
  switch (key) {
    case 'name':
      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      break
    case 'planted':
      cmp = new Date(a.plantingDate).getTime() - new Date(b.plantingDate).getTime()
      break
    case 'stage':
      cmp = a.currentStage.localeCompare(b.currentStage)
      break
    case 'status':
      cmp = statusRank[a.status] - statusRank[b.status]
      break
    case 'assignee': {
      const an = a.assignedAgent?.name ?? ''
      const bn = b.assignedAgent?.name ?? ''
      cmp = an.localeCompare(bn, undefined, { sensitivity: 'base' })
      break
    }
    case 'updated':
    default:
      cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      break
  }
  return cmp * dir
}

export function FieldsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [fields, setFields] = useState<FieldSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [density, setDensity] = useState<Density>(readDensity)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [sortAsc, setSortAsc] = useState(false)
  const [reportBusy, setReportBusy] = useState<string | null>(null)

  const downloadFieldsReport = useCallback(
    async (format: ReportExportFormat) => {
      setReportBusy(`fields-${format}`)
      try {
        await downloadReport('/api/reports/fields', 'smartseason-fields.csv', format)
        showToast(
          format === 'pdf' ? 'Fields report (PDF) downloaded' : 'Fields report (CSV) downloaded',
          'success',
        )
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Download failed', 'error')
      } finally {
        setReportBusy(null)
      }
    },
    [showToast],
  )

  const downloadActivityReport = useCallback(
    async (format: ReportExportFormat) => {
      setReportBusy(`activity-${format}`)
      try {
        await downloadReport('/api/reports/updates', 'smartseason-activity.csv', format)
        showToast(
          format === 'pdf' ? 'Activity report (PDF) downloaded' : 'Activity report (CSV) downloaded',
          'success',
        )
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Download failed', 'error')
      } finally {
        setReportBusy(null)
      }
    },
    [showToast],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api<FieldSummary[]>('/api/fields')
        if (!cancelled) setFields(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    if (!fields) return []
    let list = [...fields]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) || f.cropType.toLowerCase().includes(q),
      )
    }
    if (statusFilter) {
      list = list.filter((f) => f.status === statusFilter)
    }
    if (stageFilter) {
      list = list.filter((f) => f.currentStage === stageFilter)
    }
    list.sort((a, b) => compareFields(a, b, sortKey, sortAsc))
    return list
  }, [fields, search, statusFilter, stageFilter, sortKey, sortAsc])

  function setDensityMode(next: Density) {
    setDensity(next)
    try {
      localStorage.setItem(DENSITY_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('')
    setStageFilter('')
    setSortKey('updated')
    setSortAsc(false)
  }

  const filtersActive =
    Boolean(search.trim()) || Boolean(statusFilter) || Boolean(stageFilter)

  if (error) return <p className="error">{error}</p>
  if (!fields) return <FieldsSkeleton />

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="fields-page" data-density={density}>
      <header className="page-head">
        <h1>Fields</h1>
      </header>

      <div className="fields-toolbar">
        {fields.length > 0 && (
          <div className="fields-filters">
            <label className="fields-filters__search">
              <span className="sr-only">Search by name or crop</span>
              <input
                type="search"
                placeholder="Search name or crop…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </label>
            <select
              className="fields-filters__select"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="fields-filters__select"
              aria-label="Filter by stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All stages</option>
              {FIELD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="fields-filters__select"
              aria-label="Sort by"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`fields-filters__order ${sortAsc ? 'is-asc' : ''}`}
              onClick={() => setSortAsc((v) => !v)}
              title={
                sortAsc
                  ? 'Ascending order — click for descending'
                  : 'Descending order — click for ascending'
              }
              aria-label={sortAsc ? 'Switch to descending order' : 'Switch to ascending order'}
            >
              {sortAsc ? 'Asc' : 'Desc'}
            </button>
            {filtersActive && (
              <button type="button" className="btn-sm fields-filters__clear" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}
        <div className="fields-toolbar__right">
          {fields.length > 0 && (
            <div className="fields-reports" role="group" aria-label="Download reports">
              <button
                type="button"
                className="btn-sm"
                disabled={reportBusy !== null}
                onClick={() => void downloadFieldsReport('csv')}
              >
                {reportBusy === 'fields-csv' ? '…' : 'Fields CSV'}
              </button>
              <button
                type="button"
                className="btn-sm"
                disabled={reportBusy !== null}
                onClick={() => void downloadFieldsReport('pdf')}
              >
                {reportBusy === 'fields-pdf' ? '…' : 'Fields PDF'}
              </button>
              <button
                type="button"
                className="btn-sm"
                disabled={reportBusy !== null}
                onClick={() => void downloadActivityReport('csv')}
              >
                {reportBusy === 'activity-csv' ? '…' : 'Activity CSV'}
              </button>
              <button
                type="button"
                className="btn-sm"
                disabled={reportBusy !== null}
                onClick={() => void downloadActivityReport('pdf')}
              >
                {reportBusy === 'activity-pdf' ? '…' : 'Activity PDF'}
              </button>
            </div>
          )}
          <div className="density-toggle" role="group" aria-label="Table density">
            <button
              type="button"
              className={density === 'comfortable' ? 'is-on' : ''}
              onClick={() => setDensityMode('comfortable')}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={density === 'compact' ? 'is-on' : ''}
              onClick={() => setDensityMode('compact')}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="card card--elevated">
          <EmptyState
            title={isAdmin ? 'No fields yet' : 'Nothing assigned'}
            description={
              isAdmin
                ? 'Create a field to see it in this list.'
                : 'You do not have any plots assigned right now.'
            }
          >
            {isAdmin && (
              <Link to="/fields/new" className="btn">
                New field
              </Link>
            )}
          </EmptyState>
        </div>
      ) : visible.length === 0 ? (
        <div className="card card--elevated">
          <EmptyState
            title="No matching fields"
            description="Try changing search or filters."
          >
            <button type="button" className="btn secondary" onClick={clearFilters}>
              Clear filters
            </button>
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="fields-count muted">
            Showing {visible.length} of {fields.length}
          </p>
          <div className="field-cards-wrap">
            <div className="field-cards">
              {visible.map((f) => (
                <Link key={f.id} to={`/fields/${f.id}`} className="field-card">
                  <div className="field-card__title">{f.name}</div>
                  <div className="field-card__row">
                    <span>{f.cropType}</span>
                    <span>{formatShortDate(f.plantingDate)}</span>
                    <span>{f.currentStage}</span>
                    <StatusBadge status={f.status} />
                    {f.assignedAgent && <span>{f.assignedAgent.name}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card table-wrap table-card card--elevated table-desktop" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Crop</th>
                  <th>Planted</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link to={`/fields/${f.id}`}>{f.name}</Link>
                    </td>
                    <td>{f.cropType}</td>
                    <td>{formatShortDate(f.plantingDate)}</td>
                    <td>{f.currentStage}</td>
                    <td>
                      <StatusBadge status={f.status} />
                    </td>
                    <td>{f.assignedAgent?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
