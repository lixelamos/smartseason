import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { AppLayout } from './layout/AppLayout'
import { AuthGateSkeleton } from './components/Skeleton'
import { DashboardPage } from './pages/DashboardPage'
import { FieldDetailPage } from './pages/FieldDetailPage'
import { FieldsPage } from './pages/FieldsPage'
import { LoginPage } from './pages/LoginPage'
import { DownloadsPage } from './pages/DownloadsPage'
import { NewFieldPage } from './pages/NewFieldPage'

function Protected({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthGateSkeleton />
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function AdminOnly({ children }: { children: ReactElement }) {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="fields" element={<FieldsPage />} />
          <Route
            path="fields/new"
            element={
              <AdminOnly>
                <NewFieldPage />
              </AdminOnly>
            }
          />
          <Route path="fields/:id" element={<FieldDetailPage />} />
          <Route path="downloads" element={<DownloadsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
