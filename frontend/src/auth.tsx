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
    try {
      res = await api<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        json: { email, password },
        signal: AbortSignal.timeout(22_000),
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
        throw new Error(
          'Sign-in timed out waiting for the API. In a terminal: cd backend && npm run dev. If it still hangs, run: lsof -ti :4000 | xargs kill -9 then start the API again.',
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
