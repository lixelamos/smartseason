export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className="skeleton skeleton-line" style={{ width }} aria-hidden />
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton skeleton-title" />
      <div className="grid kpi-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-kpi" />
        ))}
      </div>
      <div className="grid cols-2" style={{ marginTop: '1.25rem' }}>
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  )
}

export function FieldsSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading fields">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-table" />
    </div>
  )
}

export function AuthGateSkeleton() {
  return (
    <div className="layout" aria-busy="true" aria-label="Loading">
      <div
        className="skeleton"
        style={{ height: '52px', borderRadius: '14px', marginBottom: '1.5rem' }}
      />
      <div className="skeleton skeleton-title" />
      <SkeletonLine width="70%" />
      <SkeletonLine width="50%" />
    </div>
  )
}

export function FieldDetailSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading field">
      <SkeletonLine width="120px" />
      <div className="skeleton skeleton-title" style={{ maxWidth: '280px' }} />
      <SkeletonLine width="90%" />
      <div className="skeleton skeleton-card" style={{ marginTop: '1rem' }} />
      <div className="skeleton skeleton-card" style={{ marginTop: '1rem' }} />
    </div>
  )
}
