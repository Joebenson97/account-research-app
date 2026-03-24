import { NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { verifyPassword, createSession, SESSION_COOKIE_NAME, UserRow } from '@/lib/auth'

export const runtime = 'nodejs'

type LoginRequest = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequest

  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    )
  }

  const db = getDb()

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as UserRow | undefined

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    )
  }

  const valid = await verifyPassword(password, user.passwordHash)

  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    )
  }

  const sessionToken = createSession(user.id)

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  })

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
