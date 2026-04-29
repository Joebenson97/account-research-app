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

type UpdateAccountRequest = Partial<{
  name: string
  email: string
  phone: string
  company: string
  industry: string
  location: string
  website: string
  description: string
  foundedYear: number
  employeeCount: number
  revenue: number
  socialMedia: Account['socialMedia']
  tags: string[]
  researchNotes: string
  status: Account['status']
  value: Account['value']
}>

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
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
  return NextResponse.json({ account: toResponse(account) })
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const existing = rowToAccount(row)
  const body = (await request.json()) as UpdateAccountRequest

  const next: Account = {
    ...existing,
    name: body.name !== undefined ? body.name.trim() : existing.name,
    email: body.email !== undefined ? (body.email.trim() || undefined) : existing.email,
    phone: body.phone !== undefined ? (body.phone.trim() || undefined) : existing.phone,
    company: body.company !== undefined ? (body.company.trim() || undefined) : existing.company,
    industry: body.industry !== undefined ? (body.industry.trim() || undefined) : existing.industry,
    location: body.location !== undefined ? (body.location.trim() || undefined) : existing.location,
    website: body.website !== undefined ? (body.website.trim() || undefined) : existing.website,
    description: body.description !== undefined ? (body.description.trim() || undefined) : existing.description,
    foundedYear: body.foundedYear !== undefined ? body.foundedYear : existing.foundedYear,
    employeeCount: body.employeeCount !== undefined ? body.employeeCount : existing.employeeCount,
    revenue: body.revenue !== undefined ? body.revenue : existing.revenue,
    socialMedia: body.socialMedia !== undefined ? body.socialMedia : existing.socialMedia,
    tags: body.tags !== undefined ? body.tags : existing.tags,
    researchNotes: body.researchNotes !== undefined ? (body.researchNotes.trim() || undefined) : existing.researchNotes,
    status: body.status !== undefined ? body.status : existing.status,
    value: body.value !== undefined ? body.value : existing.value,
    updatedAt: new Date(),
  }

  if (!next.name || next.name.trim().length === 0) {
    return NextResponse.json({ error: 'Account name is required.' }, { status: 400 })
  }

  await pool.query(
    `UPDATE accounts SET
      name=$1,
      email=$2,
      phone=$3,
      company=$4,
      industry=$5,
      location=$6,
      website=$7,
      description=$8,
      "foundedYear"=$9,
      "employeeCount"=$10,
      revenue=$11,
      "socialMedia"=$12,
      tags=$13,
      "researchNotes"=$14,
      status=$15,
      value=$16,
      "updatedAt"=$17
    WHERE id=$18`,
    [
      next.name,
      next.email ?? null,
      next.phone ?? null,
      next.company ?? null,
      next.industry ?? null,
      next.location ?? null,
      next.website ?? null,
      next.description ?? null,
      next.foundedYear ?? null,
      next.employeeCount ?? null,
      next.revenue ?? null,
      next.socialMedia ? JSON.stringify(next.socialMedia) : null,
      JSON.stringify(next.tags ?? []),
      next.researchNotes ?? null,
      next.status,
      next.value,
      next.updatedAt.toISOString(),
      next.id,
    ]
  )

  return NextResponse.json({ account: toResponse(next) })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await ensureSchema()
  const pool = getPool()

  const result = await pool.query(
    'SELECT * FROM accounts WHERE id = $1 AND "deletedAt" IS NULL',
    [params.id]
  )
  const row = result.rows[0] as AccountRow | undefined

  if (!row) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  await pool.query(
    'UPDATE accounts SET "deletedAt" = $1 WHERE id = $2',
    [new Date().toISOString(), params.id]
  )

  return NextResponse.json({ success: true })
}
