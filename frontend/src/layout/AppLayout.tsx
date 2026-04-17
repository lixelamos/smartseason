import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  IconCirclePlus,
  IconFileDown,
  IconLayoutDashboard,
  IconList,
  IconMenu,
} from '../components/Icons'
import { useTheme } from '../theme'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

const MQ = '(max-width: 899px)'

function fieldsListNavActive(pathname: string): boolean {
  if (pathname === '/fields') return true
  if (!pathname.startsWith('/fields/')) return false
  return pathname !== '/fields/new'
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  useEffect(() => {
    if (!sidebarOpen) return
    const mq = window.matchMedia(MQ)
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sidebarOpen])

  return (
    <div className={`app-shell${sidebarOpen ? ' app-shell--sidebar-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close menu"
        tabIndex={sidebarOpen ? 0 : -1}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="sidebar" id="app-sidebar" aria-label="Main navigation">
        <Link to="/" className="sidebar__brand" onClick={() => setSidebarOpen(false)}>
          <span className="brand-mark" aria-hidden />
          <span>SmartSeason</span>
        </Link>

        <nav className="sidebar__nav" aria-label="App sections">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <IconLayoutDashboard className="sidebar__icon" size={20} />
            Dashboard
          </NavLink>
          <Link
            to="/fields"
            className={`sidebar__link${fieldsListNavActive(location.pathname) ? ' is-active' : ''}`}
            aria-current={fieldsListNavActive(location.pathname) ? 'page' : undefined}
            onClick={() => setSidebarOpen(false)}
          >
            <IconList className="sidebar__icon" size={20} />
            Fields
          </Link>
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/fields/new"
              className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <IconCirclePlus className="sidebar__icon" size={20} />
              New field
            </NavLink>
          )}
          <NavLink
            to="/downloads"
            className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <IconFileDown className="sidebar__icon" size={20} />
            Downloads
          </NavLink>
        </nav>

        <div className="sidebar__footer">
          {user && (
            <div className="sidebar__user">
              <span className="user-chip__avatar" aria-hidden>
                {initials(user.name)}
              </span>
              <div className="sidebar__user-text">
                <strong>{user.name}</strong>
                <span className="sidebar__role">{user.role === 'ADMIN' ? 'Admin' : 'Field agent'}</span>
              </div>
            </div>
          )}
          <div className="sidebar__actions">
            <button
              type="button"
              className="btn-icon"
              onClick={toggleTheme}
              title={dark ? 'Light mode' : 'Dark mode'}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>
            <button type="button" className="btn secondary btn--sidebar-out" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="mobile-topbar">
          <button
            type="button"
            className="btn-icon mobile-topbar__menu"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <IconMenu size={22} />
          </button>
          <span className="mobile-topbar__title">SmartSeason</span>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
