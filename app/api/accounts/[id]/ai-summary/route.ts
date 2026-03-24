import { NextResponse } from 'next/server'

import { getDb, rowToAccount } from '@/lib/db'
import { generateAiSummary } from '@/lib/aiSummary'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(params.id) as
    | Parameters<typeof rowToAccount>[0]
    | undefined

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const account = rowToAccount(row)
  const aiSummary = generateAiSummary(account)
  const now = new Date()

  db.prepare(
    `
      UPDATE accounts SET
        aiSummaryJson=@aiSummaryJson,
        aiSummaryUpdatedAt=@aiSummaryUpdatedAt,
        updatedAt=@updatedAt
      WHERE id=@id
    `
  ).run({
    id: account.id,
    aiSummaryJson: JSON.stringify(aiSummary),
    aiSummaryUpdatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  })

  return NextResponse.json({
    aiSummary,
    aiSummaryUpdatedAt: now.toISOString(),
  })
}
