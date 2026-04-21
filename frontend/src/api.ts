const TOKEN_KEY = 'smartseason_token'

/** Direct backend URL — used only if same-origin /api fails (e.g. rewrite missing on a Vercel project). */
const DEPLOYED_API_FALLBACK = 'https://smartseason-m3hv.vercel.app'

/**
 * API base for production builds. In `npm run dev`, always '' (Vite proxy → localhost:4000).
 *
 * When '' on a deployed site, requests use the **same host** as the UI + `vercel.json` rewrite to the API.
 * If that still fails at the network layer, `api()` retries once against {@link DEPLOYED_API_FALLBACK}.
 *
 * Set `VITE_API_URL` to force a specific API origin (CORS must allow your frontend origin).
 */
function apiOrigin(): string {
  if (import.meta.env.DEV) return ''
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return ''
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const origin = apiOrigin()
  const p = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${p}` : p
}

function isNetworkFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /failed to fetch|networkerror|load failed/i.test(msg)
}

function fallbackApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEPLOYED_API_FALLBACK.replace(/\/$/, '')}${p}`
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let body = init?.body
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(init.json)
  }

  const primaryUrl = apiUrl(path)
  let res: Response
  try {
    res = await fetch(primaryUrl, { ...init, headers, body })
  } catch (first) {
    const canRetryDirect =
      !import.meta.env.DEV &&
      !import.meta.env.VITE_API_URL?.trim() &&
      isNetworkFailure(first) &&
      !/^https?:\/\//i.test(primaryUrl)

    if (canRetryDirect) {
      try {
        res = await fetch(fallbackApiUrl(path), { ...init, headers, body })
      } catch (second) {
        throw new Error(
          `Could not reach the API. Same-origin request failed; direct request to ${DEPLOYED_API_FALLBACK} also failed. ` +
            'Redeploy the frontend with root vercel.json (rewrites /api → backend), set VITE_API_URL to that API URL in Vercel, and confirm the backend project is running.',
        )
      }
    } else if (isNetworkFailure(first)) {
      throw new Error(
        'Could not reach the API (network). Confirm the backend is deployed, DATABASE_URL/JWT_SECRET are set, and CORS allows this site if you use a separate API URL.',
      )
    } else {
      throw first
    }
  }
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      throw new Error(
        res.ok
          ? 'Invalid JSON from API'
          : `Request failed (${res.status}). The server did not return JSON — check that the URL hits the API, not an HTML page.`,
      )
    }
  }
  if (!res.ok) {
    const errBody = data && typeof data === 'object' ? (data as Record<string, unknown>).error : undefined
    const msg =
      typeof errBody === 'string' ? errBody : errBody !== undefined ? JSON.stringify(errBody) : res.statusText
    throw new Error(msg || 'Request failed')
  }
  return data as T
}

export type User = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'FIELD_AGENT'
}

export type FieldSummary = {
  id: string
  name: string
  cropType: string
  plantingDate: string
  currentStage: string
  status: 'ACTIVE' | 'AT_RISK' | 'COMPLETED'
  assignedAgent: { id: string; name: string; email: string } | null
  createdAt: string
  updatedAt: string
}

export type FieldDetail = FieldSummary & {
  updates: {
    id: string
    stage: string | null
    note: string | null
    createdAt: string
    authorId: string
    author?: { id: string; name: string; role: string }
  }[]
}

export type Dashboard = {
  totalFields: number
  statusBreakdown: { ACTIVE: number; AT_RISK: number; COMPLETED: number }
  stageBreakdown: Record<string, number>
  staleAssignedCount?: number
}

export type Agent = { id: string; name: string; email: string }
