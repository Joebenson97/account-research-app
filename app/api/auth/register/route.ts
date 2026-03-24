import { NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { hashPassword, createSession, SESSION_COOKIE_NAME, UserRow } from '@/lib/auth'

export const runtime = 'nodejs'

type RegisterRequest = {
  email?: string
  password?: string
  name?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as RegisterRequest

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const name = body.name?.trim()

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: 'Email, password, and name are required.' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    )
  }

  const db = getDb()

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: string } | undefined

  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 }
    )
  }

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now())

  const passwordHash = await hashPassword(password)
  const now = new Date()

  db.prepare(
    `INSERT INTO users (id, email, passwordHash, name, createdAt) VALUES (@id, @email, @passwordHash, @name, @createdAt)`
  ).run({
    id,
    email,
    passwordHash,
    name,
    createdAt: now.toISOString(),
  })

  const sessionToken = createSession(id)

  const response = NextResponse.json(
    { user: { id, email, name } },
    { status: 201 }
  )

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
