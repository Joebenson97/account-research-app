import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db'

const SESSION_COOKIE = 'session_token'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const BCRYPT_ROUNDS = 10

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  name: string
  createdAt: string
}

export type SessionRow = {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const createSession = (userId: string): string => {
  const db = getDb()
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + String(Math.random())
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

  db.prepare(
    `INSERT INTO sessions (id, userId, expiresAt, createdAt) VALUES (@id, @userId, @expiresAt, @createdAt)`
  ).run({
    id,
    userId,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  })

  return id
}

export const deleteSession = (token: string): void => {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE id = ?').run(token)
}

export const getSessionUser = (): { id: string; email: string; name: string } | null => {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const db = getDb()
  const session = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(token) as SessionRow | undefined

  if (!session) return null

  if (new Date(session.expiresAt) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token)
    return null
  }

  const user = db
    .prepare('SELECT id, email, name FROM users WHERE id = ?')
    .get(session.userId) as { id: string; email: string; name: string } | undefined

  return user ?? null
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
