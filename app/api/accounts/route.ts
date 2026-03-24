import { NextResponse } from 'next/server'

import { getDb, rowToAccount } from '@/lib/db'
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
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM accounts ORDER BY datetime(createdAt) DESC')
    .all() as Parameters<typeof rowToAccount>[0][]
  const accounts = rows.map((r) => rowToAccount(r)).map(toResponse)
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

  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO accounts (
      id, name, email, phone, company, industry, location, website, description,
      foundedYear, employeeCount, revenue, socialMedia, tags, researchNotes,
      status, value, createdAt, updatedAt
    ) VALUES (
      @id, @name, @email, @phone, @company, @industry, @location, @website, @description,
      @foundedYear, @employeeCount, @revenue, @socialMedia, @tags, @researchNotes,
      @status, @value, @createdAt, @updatedAt
    )
  `)

  stmt.run({
    id: newAccount.id,
    name: newAccount.name,
    email: newAccount.email ?? null,
    phone: newAccount.phone ?? null,
    company: newAccount.company ?? null,
    industry: newAccount.industry ?? null,
    location: newAccount.location ?? null,
    website: newAccount.website ?? null,
    description: newAccount.description ?? null,
    foundedYear: newAccount.foundedYear ?? null,
    employeeCount: newAccount.employeeCount ?? null,
    revenue: newAccount.revenue ?? null,
    socialMedia: newAccount.socialMedia ? JSON.stringify(newAccount.socialMedia) : null,
    tags: JSON.stringify(newAccount.tags ?? []),
    researchNotes: newAccount.researchNotes ?? null,
    status: newAccount.status,
    value: newAccount.value,
    createdAt: newAccount.createdAt.toISOString(),
    updatedAt: newAccount.updatedAt.toISOString(),
  })

  return NextResponse.json({ account: toResponse(newAccount) }, { status: 201 })
}
