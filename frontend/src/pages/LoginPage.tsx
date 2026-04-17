import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { useToast } from '../toast'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    const to = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={to} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-theme">
        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          title={dark ? 'Light mode' : 'Dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? '☀' : '☾'}
        </button>
      </div>
      <div className="card card--elevated login-card">
        <h1 style={{ marginTop: 0, letterSpacing: '-0.03em' }}>SmartSeason</h1>
        <form className="form" onSubmit={onSubmit} style={{ maxWidth: 'none' }}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
