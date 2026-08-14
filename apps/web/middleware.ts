import { NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE_NAME = 'accessToken'
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 60
const LOG_LIMIT = 200
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const requestLog: Array<{ ip: string; path: string; ts: number }> = []

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'

  return request.headers.get('x-real-ip') || 'unknown'
}

function pruneRateLimit() {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetAt <= now) rateLimitMap.delete(key)
  }
}

function pruneLogs() {
  if (requestLog.length > LOG_LIMIT) {
    requestLog.splice(0, requestLog.length - LOG_LIMIT)
  }
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/appointments') || pathname.startsWith('/logs') || pathname.startsWith('/settings')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value

  if (isProtectedPath(pathname) && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const ip = getClientIp(request)
  const now = Date.now()

  pruneRateLimit()

  const limiterKey = `${ip}:${pathname}`
  const existing = rateLimitMap.get(limiterKey) ?? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }

  if (existing.resetAt <= now) {
    existing.count = 0
    existing.resetAt = now + RATE_LIMIT_WINDOW_MS
  }

  existing.count += 1
  rateLimitMap.set(limiterKey, existing)

  if (existing.count > MAX_REQUESTS_PER_WINDOW) {
    requestLog.push({ ip, path: pathname, ts: now })
    pruneLogs()

    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    )
  }

  requestLog.push({ ip, path: pathname, ts: now })
  pruneLogs()

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/appointments/:path*', '/logs/:path*', '/settings/:path*'],
}
