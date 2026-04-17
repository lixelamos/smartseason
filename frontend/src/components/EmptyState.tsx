import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden>
        ◇
      </div>
      <h2 className="empty-state__title">{title}</h2>
      {description && <p className="empty-state__desc">{description}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  )
}
