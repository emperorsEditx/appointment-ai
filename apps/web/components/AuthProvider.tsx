"use client"
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './ToastProvider'
import { authApi, AuthResponse, User } from '@/lib/auth'

type AuthContextValue = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, tenantName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const AUTH_COOKIE_NAME = 'accessToken'

function writeAuthCookie(tokenValue: string, expiresAt: number) {
  if (typeof document === 'undefined') return

  const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(tokenValue)}; path=/; max-age=${maxAge}; samesite=lax`
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [expiry, setExpiry] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const rawUser = window.localStorage.getItem('user')
      if (rawUser) {
        setUser(JSON.parse(rawUser) as User)
      }

      const savedToken = window.localStorage.getItem('accessToken')
      setToken(savedToken)

      const rawExpiry = window.localStorage.getItem('accessTokenExpiry')
      const parsedExpiry = rawExpiry ? Number(rawExpiry) : null
      const safeExpiry = parsedExpiry && Number.isFinite(parsedExpiry) ? parsedExpiry : null
      setExpiry(safeExpiry)

      if (savedToken && safeExpiry) {
        writeAuthCookie(savedToken, safeExpiry)
      }
    } catch {
      setUser(null)
      setToken(null)
      setExpiry(null)
    }
  }, [])

  const logout = useCallback(() => {
    try {
      const stored = localStorage.getItem(user ? `chatSession:${user.id}` : 'chatSession:anon')
      if (stored && token) {
        const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
        fetch(`${API}/chat/session/${stored}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
      }
    } catch {}

    setToken(null)
    setUser(null)
    setExpiry(null)
    try { localStorage.removeItem(user ? `chatSession:${user.id}` : 'chatSession:anon') } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('accessTokenExpiry')
    clearAuthCookie()
    router.push('/login')
  }, [router, token, user])

  // enforce expiry on mount and schedule auto-logout
  useEffect(() => {
    if (!expiry) return
    const now = Date.now()
    if (expiry <= now) {
      toast?.({ title: 'Session expired', description: 'You have been logged out', variant: 'info' })
      const timeout = window.setTimeout(() => {
        setToken(null)
        setUser(null)
        setExpiry(null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        localStorage.removeItem('accessTokenExpiry')
        clearAuthCookie()
        router.push('/login')
      }, 0)
      return () => window.clearTimeout(timeout)
    }

    const ms = expiry - now
    const timer = setTimeout(() => {
      setToken(null)
      setUser(null)
      setExpiry(null)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      localStorage.removeItem('accessTokenExpiry')
      clearAuthCookie()
      router.push('/login')
    }, ms)

    return () => clearTimeout(timer)
  }, [expiry, router, toast])

  function persist(auth: AuthResponse) {
    setToken(auth.accessToken)
    setUser(auth.user)

    // compute expiry: take token exp if present, otherwise set to 12 hours from now.
    const payload = decodeJwtPayload(auth.accessToken)
    const tokenExp = payload?.exp ? Number(payload.exp) * 1000 : null
    const twelveHours = Date.now() + 12 * 60 * 60 * 1000
    const effectiveExpiry = tokenExp ? Math.min(tokenExp, twelveHours) : twelveHours

    setExpiry(effectiveExpiry)

    localStorage.setItem('accessToken', auth.accessToken)
    localStorage.setItem('user', JSON.stringify(auth.user))
    localStorage.setItem('accessTokenExpiry', String(effectiveExpiry))
    writeAuthCookie(auth.accessToken, effectiveExpiry)
  }

  async function createBackendChatSession(token: string, userId: string) {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${API}/chat/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.sessionId) {
        try { localStorage.setItem(`chatSession:${userId}`, data.sessionId) } catch {}
      }
    } catch {
      // ignore
    }
  }

  async function login(email: string, password: string) {
    try {
      const res = await authApi.login({ email, password })
      persist(res)
      try { await createBackendChatSession(res.accessToken, res.user.id) } catch {}
      toast({ title: 'Signed in', variant: 'success' })
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      toast({ title: 'Login failed', description: message, variant: 'error' })
      throw error
    }
  }

  async function signup(name: string, email: string, password: string, tenantName: string) {
    try {
      const res = await authApi.signup({ name, email, password, tenantName })
      persist(res)
      try { await createBackendChatSession(res.accessToken, res.user.id) } catch {}
      toast({ title: 'Account created', variant: 'success' })
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      toast({ title: 'Signup failed', description: message, variant: 'error' })
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
