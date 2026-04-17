const TOKEN_KEY = 'smartseason_token'

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
  const res = await fetch(path, { ...init, headers, body })
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
