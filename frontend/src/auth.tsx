import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken, type User } from './api'

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  /** In-flight bootstrap `/me` — aborted on login so a stale 401 cannot wipe a new session. */
  const sessionCheckRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    const tokenAtStart = getToken()
    if (!tokenAtStart) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const me = await api<User>('/api/auth/me')
      if (getToken() !== tokenAtStart) return
      setUser(me)
    } catch {
      if (getToken() !== tokenAtStart) return
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    sessionCheckRef.current = ac
    setLoading(true)
    void (async () => {
      const tokenAtStart = getToken()
      try {
        if (!tokenAtStart) {
          setUser(null)
          return
        }
        const me = await api<User>('/api/auth/me', { signal: ac.signal })
        if (getToken() !== tokenAtStart) return
        setUser(me)
      } catch {
        if (ac.signal.aborted) return
        if (getToken() !== tokenAtStart) return
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      ac.abort()
      sessionCheckRef.current = null
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    sessionCheckRef.current?.abort()
    let res: { token: string; user: User }
    // Vite dev server: short timeout + local help. Production build (Vercel, vite preview): long timeout + deploy help.
    // Note: import.meta.env.PROD is false during `npm run dev` even if VITE_API_URL points at production API.
    const loginMs = import.meta.env.DEV ? 22_000 : 90_000
    try {
      res = await api<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        json: { email, password },
        signal: AbortSignal.timeout(loginMs),
      })
    } catch (e) {
      // AbortSignal.timeout() often rejects with TimeoutError / "signal timed out", not AbortError.
      const name = e instanceof Error || e instanceof DOMException ? e.name : ''
      const msg = e instanceof Error || e instanceof DOMException ? e.message : ''
      const timedOut =
        name === 'AbortError' ||
        name === 'TimeoutError' ||
        /signal timed out|timed out/i.test(msg)
      if (timedOut) {
        if (import.meta.env.DEV) {
          throw new Error(
            'Sign-in timed out. Is the API running? In a terminal: cd backend && npm run dev (port 4000). If the port is stuck: lsof -ti :4000 | xargs kill -9 then npm run dev again.',
          )
        }
        const hasApiUrl = Boolean(import.meta.env.VITE_API_URL?.trim())
        throw new Error(
          hasApiUrl
            ? 'Sign-in timed out. The deployed API may be cold-starting (wait 1–2 minutes and retry) or overloaded. Check Vercel backend logs, DATABASE_URL, and JWT_SECRET.'
            : 'Sign-in timed out. Add VITE_API_URL in the frontend Vercel project (Production and Preview) to your API URL, redeploy, then try again.',
        )
      }
      throw e
    }
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
