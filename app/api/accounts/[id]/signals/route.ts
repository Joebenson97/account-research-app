import { NextResponse } from 'next/server'

import { getPool, ensureSchema, rowToAccount, AccountRow } from '@/lib/db'
import { generateMockSignals } from '@/lib/signals'
import { apiGuard } from '@/lib/apiGuard'
import { requireRole } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const blocked = apiGuard(request)
  if (blocked) return blocked

  const denied = await requireRole(request, 'editor')
  if (denied) return denied

  await ensureSchema()
  const pool = getPool()
  const result = await pool.query(
    'SELECT * FROM accounts WHERE id = $1 AND "deletedAt" IS NULL',
    [params.id]
  )
  const row = result.rows[0] as AccountRow | undefined

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const account = rowToAccount(row)
  const signals = generateMockSignals(account)
  const now = new Date()

  await pool.query(
    `UPDATE accounts SET
      "signalsJson"=$1,
      "signalsUpdatedAt"=$2,
      "updatedAt"=$3
    WHERE id=$4`,
    [
      JSON.stringify(
        signals.map((s) => ({
          ...s,
          detectedAt: s.detectedAt.toISOString(),
        }))
      ),
      now.toISOString(),
      now.toISOString(),
      account.id,
    ]
  )

  return NextResponse.json({
    signals: signals.map((s) => ({
      ...s,
      detectedAt: s.detectedAt.toISOString(),
    })),
    signalsUpdatedAt: now.toISOString(),
  })
}
