/**
 * Role-Based Access Control (RBAC) helper.
 *
 * Three roles:
 *   admin  — full access (create, read, edit, delete)
 *   editor — create, read, edit (no delete)
 *   viewer — read only
 *
 * Usage in API routes:
 *   const denied = await requireRole(request, 'editor')
 *   if (denied) return denied
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { UserRole } from '@/lib/db'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
}

export async function getSessionRole(): Promise<UserRole | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role) return null
  return session.user.role as UserRole
}

export async function requireRole(
  _request: Request,
  minimumRole: UserRole
): Promise<NextResponse | null> {
  const role = await getSessionRole()

  if (!role) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
    return NextResponse.json(
      { error: `Forbidden: requires ${minimumRole} role or higher.` },
      { status: 403 }
    )
  }

  return null
}
