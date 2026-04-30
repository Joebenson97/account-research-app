/**
 * Shared API guard — combines rate limiting and CSRF protection.
 *
 * Call this at the top of every API route handler. Returns null if the
 * request is allowed, or a NextResponse to return immediately if blocked.
 *
 * Rate limits:
 *   GET  — 100 requests / 60 seconds per IP
 *   POST/PUT/DELETE — 20 requests / 60 seconds per IP
 */

import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import { checkCsrf } from '@/lib/csrf'

const WINDOW_MS = 60_000

const READ_LIMIT = 100
const WRITE_LIMIT = 20

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return '127.0.0.1'
}

export function apiGuard(request: Request): NextResponse | null {
  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  const method = request.method.toUpperCase()
  const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
  const maxRequests = isWrite ? WRITE_LIMIT : READ_LIMIT
  const ip = getClientIp(request)
  const key = `${ip}:${isWrite ? 'write' : 'read'}`

  const result = checkRateLimit(key, maxRequests, WINDOW_MS)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(result, maxRequests),
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
        },
      }
    )
  }

  return null
}
