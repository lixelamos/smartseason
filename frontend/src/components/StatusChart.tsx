type Breakdown = { ACTIVE: number; AT_RISK: number; COMPLETED: number }

export function StatusChart({ breakdown, total }: { breakdown: Breakdown; total: number }) {
  if (total <= 0) return null

  const segments = [
    { key: 'ACTIVE', count: breakdown.ACTIVE, className: 'status-chart__seg--active' },
    { key: 'AT_RISK', count: breakdown.AT_RISK, className: 'status-chart__seg--risk' },
    { key: 'COMPLETED', count: breakdown.COMPLETED, className: 'status-chart__seg--done' },
  ].filter((s) => s.count > 0)

  const label = `Status mix: ${breakdown.ACTIVE} active, ${breakdown.AT_RISK} at risk, ${breakdown.COMPLETED} completed of ${total} fields.`

  return (
    <div className="status-chart" role="img" aria-label={label}>
      <div className="status-chart__bar">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`status-chart__seg ${s.className}`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.key}: ${s.count}`}
          />
        ))}
      </div>
      <ul className="status-chart__legend">
        <li>
          <span className="status-chart__dot status-chart__dot--active" /> Active{' '}
          {breakdown.ACTIVE}
        </li>
        <li>
          <span className="status-chart__dot status-chart__dot--risk" /> At risk{' '}
          {breakdown.AT_RISK}
        </li>
        <li>
          <span className="status-chart__dot status-chart__dot--done" /> Completed{' '}
          {breakdown.COMPLETED}
        </li>
      </ul>
    </div>
  )
}
