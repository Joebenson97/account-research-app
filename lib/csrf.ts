/**
 * CSRF protection via Origin header verification.
 *
 * Rejects mutation requests (POST/PUT/DELETE) where the Origin header
 * doesn't match the app's own host. This prevents cross-site form
 * submissions and malicious scripts from triggering state changes.
 *
 * Browsers always send the Origin header on cross-origin requests and
 * on same-origin requests that use POST/PUT/DELETE, making this a
 * reliable protection mechanism for JSON APIs.
 */

import { NextResponse } from 'next/server'

function getAllowedOrigins(): string[] {
  const origins: string[] = []

  const nextauthUrl = process.env.NEXTAUTH_URL
  if (nextauthUrl) {
    try {
      const url = new URL(nextauthUrl)
      origins.push(url.origin)
    } catch {
      // invalid URL, skip
    }
  }

  origins.push('http://localhost:3000')
  origins.push('http://127.0.0.1:3000')

  return Array.from(new Set(origins))
}

export function checkCsrf(request: Request): NextResponse | null {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Forbidden: missing Origin header.' },
      { status: 403 }
    )
  }

  const allowedOrigins = getAllowedOrigins()

  if (origin && allowedOrigins.includes(origin)) {
    return null
  }

  if (!origin && referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (allowedOrigins.includes(refOrigin)) {
        return null
      }
    } catch {
      // invalid referer URL
    }
  }

  return NextResponse.json(
    { error: 'Forbidden: invalid Origin.' },
    { status: 403 }
  )
}
