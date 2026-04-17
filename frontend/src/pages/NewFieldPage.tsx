import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Agent } from '../api'
import { FIELD_STAGES } from '../lib/fieldStages'
import { useToast } from '../toast'

export function NewFieldPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [cropType, setCropType] = useState('')
  const [plantingDate, setPlantingDate] = useState('')
  const [currentStage, setCurrentStage] = useState<string>(FIELD_STAGES[0])
  const [assignedAgentId, setAssignedAgentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api<Agent[]>('/api/agents')
        if (!cancelled) setAgents(list)
      } catch {
        /* agents optional for create */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        cropType: cropType.trim(),
        plantingDate,
        currentStage,
      }
      if (assignedAgentId) body.assignedAgentId = assignedAgentId
      const created = await api<{ id: string }>('/api/fields', {
        method: 'POST',
        json: body,
      })
      showToast('Field created', 'success')
      navigate(`/fields/${created.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create field'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form-page">
      <header className="page-head">
        <h1>Create field</h1>
      </header>
      <div className="card card--elevated">
        <form className="form" onSubmit={onSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Crop type
            <input
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              required
            />
          </label>
          <label>
            Planting date
            <input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              required
            />
          </label>
          <label>
            Starting stage
            <select
              value={currentStage}
              onChange={(e) => setCurrentStage(e.target.value)}
            >
              {FIELD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              value={assignedAgentId}
              onChange={(e) => setAssignedAgentId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="error">{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create field'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
