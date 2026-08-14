export type User = {
  id: string
  name: string
  email: string
  role: string
}

export type Tenant = {
  id: string
  name: string
  slug: string
}

export type AuthResponse = {
  user: User
  tenant: Tenant
  accessToken: string
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function post<T>(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  return (await res.json()) as T
}

export const authApi = {
  signup: (payload: { name: string; email: string; password: string; tenantName: string }) =>
    post<AuthResponse>('/auth/signup', payload),
  login: (payload: { email: string; password: string }) => post<AuthResponse>('/auth/login', payload),
}
