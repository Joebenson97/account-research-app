import { NextResponse } from 'next/server'

import { getPool, ensureSchema, rowToAccount, AccountRow } from '@/lib/db'
import { generateAiSummary } from '@/lib/aiSummary'
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
  const aiSummary = generateAiSummary(account)
  const now = new Date()

  await pool.query(
    `UPDATE accounts SET
      "aiSummaryJson"=$1,
      "aiSummaryUpdatedAt"=$2,
      "updatedAt"=$3
    WHERE id=$4`,
    [
      JSON.stringify(aiSummary),
      now.toISOString(),
      now.toISOString(),
      account.id,
    ]
  )

  return NextResponse.json({
    aiSummary,
    aiSummaryUpdatedAt: now.toISOString(),
  })
}
