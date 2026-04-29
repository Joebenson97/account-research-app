import { NextResponse } from 'next/server'

import { getPool, ensureSchema, rowToAccount, AccountRow } from '@/lib/db'
import { computeAccountScore } from '@/lib/accountScore'
import { Account } from '@/types/account'

export const runtime = 'nodejs'

type AccountResponse = Omit<
  Account,
  'createdAt' | 'updatedAt' | 'aiSummaryUpdatedAt' | 'signals' | 'signalsUpdatedAt'
> & {
  createdAt: string
  updatedAt: string
  aiSummaryUpdatedAt?: string
  signals?: Array<{
    type: NonNullable<Account['signals']>[number]['type']
    title: string
    detail: string
    severity: NonNullable<Account['signals']>[number]['severity']
    detectedAt: string
  }>
  signalsUpdatedAt?: string
}

type CreateAccountRequest = {
  name: string
  email?: string
  phone?: string
  company?: string
  industry?: string
  location?: string
  website?: string
  description?: string
  tags?: string[]
  researchNotes?: string
  status?: Account['status']
  value?: Account['value']
}

const toResponse = (a: Account): AccountResponse => ({
  ...a,
  accountScore: computeAccountScore(a),
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
  aiSummaryUpdatedAt: a.aiSummaryUpdatedAt ? a.aiSummaryUpdatedAt.toISOString() : undefined,
  signals: a.signals
    ? a.signals.map((s) => ({
        ...s,
        detectedAt: s.detectedAt.toISOString(),
      }))
    : undefined,
  signalsUpdatedAt: a.signalsUpdatedAt ? a.signalsUpdatedAt.toISOString() : undefined,
})

export async function GET() {
  await ensureSchema()
  const pool = getPool()
  const result = await pool.query(
    'SELECT * FROM accounts WHERE "deletedAt" IS NULL ORDER BY "createdAt" DESC'
  )
  const accounts = (result.rows as AccountRow[]).map((r) => rowToAccount(r)).map(toResponse)
  return NextResponse.json({ accounts })
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateAccountRequest

  if (!body?.name || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Account name is required.' }, { status: 400 })
  }

  const now = new Date()
  const newAccount: Account = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    name: body.name.trim(),
    email: body.email?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    company: body.company?.trim() || undefined,
    industry: body.industry?.trim() || undefined,
    location: body.location?.trim() || undefined,
    website: body.website?.trim() || undefined,
    description: body.description?.trim() || undefined,
    tags: body.tags ?? [],
    createdAt: now,
    updatedAt: now,
    researchNotes: body.researchNotes?.trim() || undefined,
    status: body.status ?? 'prospect',
    value: body.value ?? 'medium',
  }

  await ensureSchema()
  const pool = getPool()
  await pool.query(
    `INSERT INTO accounts (
      id, name, email, phone, company, industry, location, website, description,
      "foundedYear", "employeeCount", revenue, "socialMedia", tags, "researchNotes",
      status, value, "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19
    )`,
    [
      newAccount.id,
      newAccount.name,
      newAccount.email ?? null,
      newAccount.phone ?? null,
      newAccount.company ?? null,
      newAccount.industry ?? null,
      newAccount.location ?? null,
      newAccount.website ?? null,
      newAccount.description ?? null,
      newAccount.foundedYear ?? null,
      newAccount.employeeCount ?? null,
      newAccount.revenue ?? null,
      newAccount.socialMedia ? JSON.stringify(newAccount.socialMedia) : null,
      JSON.stringify(newAccount.tags ?? []),
      newAccount.researchNotes ?? null,
      newAccount.status,
      newAccount.value,
      newAccount.createdAt.toISOString(),
      newAccount.updatedAt.toISOString(),
    ]
  )

  return NextResponse.json({ account: toResponse(newAccount) }, { status: 201 })
}
