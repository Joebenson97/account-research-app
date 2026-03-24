import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    deleteSession(token)
  }

  const response = NextResponse.json({ ok: true })

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
