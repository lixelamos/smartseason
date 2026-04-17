import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Dashboard } from '../api'
import { useAuth } from '../auth'
import { EmptyState } from '../components/EmptyState'
import { IconActivity, IconAlert, IconCheck, IconMap, IconSprout } from '../components/Icons'
import { DashboardSkeleton } from '../components/Skeleton'
import { StatusChart } from '../components/StatusChart'
import { FIELD_STAGE_COUNT, FIELD_STAGES } from '../lib/fieldStages'
export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api<Dashboard>('/api/dashboard')
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!data) return <DashboardSkeleton />

  const isAdmin = user?.role === 'ADMIN'

  if (data.totalFields === 0) {
    return (
      <div>
        <header className="page-head">
          <h1>{isAdmin ? 'Overview' : 'My fields'}</h1>
        </header>
        <div className="card card--elevated">
          <EmptyState
            title={isAdmin ? 'No fields yet' : 'Nothing assigned'}
            description={
              isAdmin
                ? 'Add your first plot to start tracking the season.'
                : 'When a coordinator assigns you to a plot, it will show up here.'
            }
          >
            {isAdmin ? (
              <Link to="/fields/new" className="btn">
                New field
              </Link>
            ) : (
              <Link to="/fields" className="btn secondary">
                Open fields
              </Link>
            )}
          </EmptyState>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="page-head">
        <h1>{isAdmin ? 'Overview' : 'My fields'}</h1>
      </header>

      <p className="legend-hint">
        <strong>Status:</strong> Completed means harvested. At risk means no activity for
        14 days, or still ready 120+ days after planting.
      </p>

      <StatusChart breakdown={data.statusBreakdown} total={data.totalFields} />

      <div className="grid kpi-4" style={{ marginTop: '1rem' }}>
        <article className="kpi-card kpi-card--total">
          <div className="kpi-card__top">
            <div>
              <div className="kpi-card__label">Total fields</div>
              <div className="kpi-card__value">{data.totalFields}</div>
            </div>
            <div className="kpi-card__icon" aria-hidden>
              <IconMap size={20} />
            </div>
          </div>
        </article>

        <article className="kpi-card kpi-card--active">
          <div className="kpi-card__top">
            <div>
              <div className="kpi-card__label">Active</div>
              <div className="kpi-card__value">{data.statusBreakdown.ACTIVE}</div>
            </div>
            <div className="kpi-card__icon" aria-hidden>
              <IconActivity size={20} />
            </div>
          </div>
        </article>

        <article className="kpi-card kpi-card--risk">
          <div className="kpi-card__top">
            <div>
              <div className="kpi-card__label">At risk</div>
              <div className="kpi-card__value">{data.statusBreakdown.AT_RISK}</div>
            </div>
            <div className="kpi-card__icon" aria-hidden>
              <IconAlert size={20} />
            </div>
          </div>
        </article>

        <article className="kpi-card kpi-card--done">
          <div className="kpi-card__top">
            <div>
              <div className="kpi-card__label">Completed</div>
              <div className="kpi-card__value">{data.statusBreakdown.COMPLETED}</div>
            </div>
            <div className="kpi-card__icon" aria-hidden>
              <IconCheck size={20} />
            </div>
          </div>
        </article>
      </div>

      {!isAdmin && data.staleAssignedCount !== undefined && data.staleAssignedCount > 0 && (
        <div className="card card--elevated" style={{ marginTop: '1rem' }}>
          <div className="kpi-card__top" style={{ alignItems: 'center' }}>
            <div>
              <div className="label">At risk</div>
              <div className="stat" style={{ fontSize: '1.5rem', marginTop: '0.15rem' }}>
                {data.staleAssignedCount}
              </div>
            </div>
            <Link to="/fields" className="btn-sm">
              View fields
            </Link>
          </div>
        </div>
      )}

      <div className="grid cols-2" style={{ marginTop: '1.25rem' }}>
        <section className="panel">
          <div className="panel__head">
            <h2>Lifecycle stages</h2>
            <span className="badge stage">{FIELD_STAGE_COUNT} stages</span>
          </div>
          <div className="panel__body">
            <div className="stage-chips">
              {FIELD_STAGES.map((stage) => {
                const count = data.stageBreakdown[stage] ?? 0
                return (
                  <div
                    key={stage}
                    className={`stage-chip ${count === 0 ? 'stage-chip--zero' : ''}`}
                    title={`${count} field(s) in ${stage}`}
                  >
                    <IconSprout size={16} />
                    {stage}
                    <span>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Quick actions</h2>
          </div>
          <div className="panel__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/fields" className="btn-sm" style={{ textAlign: 'center', padding: '0.55rem' }}>
              All fields
            </Link>
            {isAdmin && (
              <Link
                to="/fields/new"
                className="btn-sm btn-sm--accent"
                style={{ textAlign: 'center', padding: '0.55rem' }}
              >
                New field
              </Link>
            )}
            <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', lineHeight: 1.45 }}>
              Observations and history are on each field page. Export CSV from Downloads.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
