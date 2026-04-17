import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Agent, type FieldDetail } from '../api'
import { useAuth } from '../auth'
import { FieldDetailSkeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { formatFeedTimestamp, formatShortDate } from '../lib/dates'
import { FIELD_STAGES } from '../lib/fieldStages'
import { useToast } from '../toast'

export function FieldDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [field, setField] = useState<FieldDetail | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [error, setError] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [nextStage, setNextStage] = useState<string>('')
  const [obsError, setObsError] = useState<string | null>(null)
  const [obsBusy, setObsBusy] = useState(false)

  const [adminName, setAdminName] = useState('')
  const [adminCrop, setAdminCrop] = useState('')
  const [adminPlanted, setAdminPlanted] = useState('')
  const [adminStage, setAdminStage] = useState('')
  const [adminAgent, setAdminAgent] = useState('')
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminBusy, setAdminBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const f = await api<FieldDetail>(`/api/fields/${id}`)
    setField(f)
    setAdminName(f.name)
    setAdminCrop(f.cropType)
    setAdminPlanted(f.plantingDate.slice(0, 10))
    setAdminStage(f.currentStage)
    setAdminAgent(f.assignedAgent?.id ?? '')
    setNextStage('')
    setNote('')
  }, [id])

  useEffect(() => {
    let cancelled = false
    setError(null)
    ;(async () => {
      if (!id) return
      try {
        await load()
        if (user?.role === 'ADMIN') {
          const list = await api<Agent[]>('/api/agents')
          if (!cancelled) setAgents(list)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, user?.role, load])

  async function submitObservation(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setObsError(null)
    if (!note.trim() && !nextStage) {
      setObsError('Add a note and/or choose a new stage.')
      return
    }
    setObsBusy(true)
    try {
      const json: { note?: string; stage?: string } = {}
      if (note.trim()) json.note = note.trim()
      if (nextStage) json.stage = nextStage
      await api<FieldDetail>(`/api/fields/${id}/updates`, {
        method: 'POST',
        json,
      })
      await load()
      showToast('Observation saved', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      setObsError(msg)
      showToast(msg, 'error')
    } finally {
      setObsBusy(false)
    }
  }

  async function saveAdmin(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setAdminError(null)
    setAdminBusy(true)
    try {
      await api(`/api/fields/${id}`, {
        method: 'PATCH',
        json: {
          name: adminName.trim(),
          cropType: adminCrop.trim(),
          plantingDate: adminPlanted,
          currentStage: adminStage,
          assignedAgentId: adminAgent || null,
        },
      })
      await load()
      showToast('Field settings saved', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setAdminError(msg)
      showToast(msg, 'error')
    } finally {
      setAdminBusy(false)
    }
  }

  async function removeField() {
    if (!id || !field) return
    if (
      !window.confirm(
        `Permanently delete “${field.name}”? This removes all history and cannot be undone.`,
      )
    ) {
      return
    }
    try {
      await api(`/api/fields/${id}`, { method: 'DELETE' })
      showToast('Field deleted', 'success')
      navigate('/fields')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      setError(msg)
      showToast(msg, 'error')
    }
  }

  if (error) {
    return (
      <p className="error">
        {error} · <Link to="/fields">Back to fields</Link>
      </p>
    )
  }
  if (!field) return <FieldDetailSkeleton />

  const canObserve =
    user?.role === 'ADMIN' ||
    (user?.role === 'FIELD_AGENT' && field.assignedAgent?.id === user.id)

  return (
    <div>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/fields">Fields</Link>
        <span className="breadcrumb__sep" aria-hidden>
          /
        </span>
        <span className="breadcrumb__current">{field.name}</span>
      </nav>

      <header className="page-head">
        <h1>{field.name}</h1>
        <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={field.status} />
          <span className="muted">
            {field.cropType} · planted {formatShortDate(field.plantingDate)} · stage{' '}
            <strong>{field.currentStage}</strong>
          </span>
        </p>
        {field.assignedAgent && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {field.assignedAgent.name} · {field.assignedAgent.email}
          </p>
        )}
      </header>

      {canObserve && (
        <div className="card card--elevated" style={{ marginTop: '0.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Log observation</h2>
          <form className="form" onSubmit={submitObservation}>
            <label>
              New stage (optional)
              <select value={nextStage} onChange={(e) => setNextStage(e.target.value)}>
                <option value="">No change</option>
                {FIELD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {obsError && <p className="error">{obsError}</p>}
            <button className="btn" type="submit" disabled={obsBusy}>
              {obsBusy ? 'Saving…' : 'Submit update'}
            </button>
          </form>
        </div>
      )}

      {user?.role === 'ADMIN' && (
        <div className="card card--elevated" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Field settings</h2>
          <form className="form" onSubmit={saveAdmin}>
            <label>
              Name
              <input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </label>
            <label>
              Crop type
              <input value={adminCrop} onChange={(e) => setAdminCrop(e.target.value)} />
            </label>
            <label>
              Planting date
              <input
                type="date"
                value={adminPlanted}
                onChange={(e) => setAdminPlanted(e.target.value)}
              />
            </label>
            <label>
              Stage
              <select value={adminStage} onChange={(e) => setAdminStage(e.target.value)}>
                {FIELD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <select value={adminAgent} onChange={(e) => setAdminAgent(e.target.value)}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {adminError && <p className="error">{adminError}</p>}
            <div className="form-actions">
              <button className="btn secondary" type="submit" disabled={adminBusy}>
                {adminBusy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-danger" onClick={removeField}>
              Delete field
            </button>
          </div>
        </div>
      )}

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel__head">
          <h2>History</h2>
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            {field.updates.length} {field.updates.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <div className="panel__body">
          {field.updates.length === 0 ? (
            <EmptyStateInline title="No observations yet" />
          ) : (
            <div className="feed">
              {field.updates.map((u) => (
                <article key={u.id} className="feed-item" style={{ gridTemplateColumns: '1fr' }}>
                  <div>
                    <div className="feed-item__meta">
                      {formatFeedTimestamp(u.createdAt)}
                      {' · '}
                      {u.author?.name ?? 'Unknown user'}
                    </div>
                    {u.stage && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <span className="badge stage">{u.stage}</span>
                      </div>
                    )}
                    {u.note && <p className="feed-item__note">{u.note}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyStateInline({ title }: { title: string }) {
  return (
    <p className="muted" style={{ margin: 0, textAlign: 'center', padding: '0.5rem 0' }}>
      {title}
    </p>
  )
}
