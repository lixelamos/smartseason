const TOKEN_KEY = 'smartseason_token'

/**
 * API base for production builds. In `npm run dev`, always '' (Vite proxy → localhost:4000).
 *
 * **Important:** When this is '' on a deployed site, requests go to the **same host** as the UI
 * (e.g. `smartseason.vercel.app/api/...`). Vercel `vercel.json` rewrites `/api` to the real API.
 * That avoids **cross-origin** calls — no CORS preflight (OPTIONS) that can hang on cold serverless.
 *
 * Set `VITE_API_URL` only if you intentionally call another origin (then the backend must allow CORS).
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
  let res: Response
  try {
    res = await fetch(apiUrl(path), { ...init, headers, body })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        'Could not reach the API (network). If this is a deployed app, confirm the backend is up and CORS allows this site.',
      )
    }
    throw e
  }
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg =
      typeof data?.error === 'string'
        ? data.error
        : data?.error
          ? JSON.stringify(data.error)
          : res.statusText
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
