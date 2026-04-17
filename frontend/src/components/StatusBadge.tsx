import type { FieldSummary } from '../api'

const icon: Record<FieldSummary['status'], string> = {
  ACTIVE: '●',
  AT_RISK: '!',
  COMPLETED: '✓',
}

export function StatusBadge({ status }: { status: FieldSummary['status'] }) {
  const cls =
    status === 'COMPLETED' ? 'done' : status === 'AT_RISK' ? 'atrisk' : 'active'
  const label =
    status === 'AT_RISK'
      ? 'At risk'
      : status === 'COMPLETED'
        ? 'Completed'
        : 'Active'
  return (
    <span className={`badge ${cls} badge--icon`}>
      <span className="badge__glyph" aria-hidden>
        {icon[status]}
      </span>
      {label}
    </span>
  )
}
