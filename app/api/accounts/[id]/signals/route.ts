import { NextResponse } from 'next/server'

import { getDb, rowToAccount } from '@/lib/db'
import { generateMockSignals } from '@/lib/signals'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM accounts WHERE id = ? AND deletedAt IS NULL').get(params.id) as
    | Parameters<typeof rowToAccount>[0]
    | undefined

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const account = rowToAccount(row)
  const signals = generateMockSignals(account)
  const now = new Date()

  db.prepare(
    `
      UPDATE accounts SET
        signalsJson=@signalsJson,
        signalsUpdatedAt=@signalsUpdatedAt,
        updatedAt=@updatedAt
      WHERE id=@id
    `
  ).run({
    id: account.id,
    signalsJson: JSON.stringify(
      signals.map((s) => ({
        ...s,
        detectedAt: s.detectedAt.toISOString(),
      }))
    ),
    signalsUpdatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  })

  return NextResponse.json({
    signals: signals.map((s) => ({
      ...s,
      detectedAt: s.detectedAt.toISOString(),
    })),
    signalsUpdatedAt: now.toISOString(),
  })
}
