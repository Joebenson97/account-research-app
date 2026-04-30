import { NextResponse } from 'next/server'

import { getPool, ensureSchema, rowToAccount, AccountRow } from '@/lib/db'
import { computeAccountScore } from '@/lib/accountScore'
import { apiGuard } from '@/lib/apiGuard'
import { requireRole } from '@/lib/rbac'
import { createAccountSchema, formatZodErrors } from '@/lib/validation'
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

export async function GET(request: Request) {
  const blocked = apiGuard(request)
  if (blocked) return blocked

  await ensureSchema()
  const pool = getPool()

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20))
  const search = url.searchParams.get('search')?.trim() || null
  const status = url.searchParams.get('status') || null
  const industry = url.searchParams.get('industry') || null
  const value = url.searchParams.get('value') || null
  const location = url.searchParams.get('location') || null

  const conditions: string[] = ['"deletedAt" IS NULL']
  const params: (string | number)[] = []
  let paramIdx = 1

  if (search) {
    conditions.push(`(LOWER(name) LIKE $${paramIdx} OR LOWER(company) LIKE $${paramIdx} OR LOWER(email) LIKE $${paramIdx})`)
    params.push(`%${search.toLowerCase()}%`)
    paramIdx++
  }
  if (status) {
    conditions.push(`status = $${paramIdx}`)
    params.push(status)
    paramIdx++
  }
  if (industry) {
    conditions.push(`industry = $${paramIdx}`)
    params.push(industry)
    paramIdx++
  }
  if (value) {
    conditions.push(`value = $${paramIdx}`)
    params.push(value)
    paramIdx++
  }
  if (location) {
    conditions.push(`location = $${paramIdx}`)
    params.push(location)
    paramIdx++
  }

  const whereClause = conditions.join(' AND ')

  const countResult = await pool.query(
    `SELECT COUNT(1) as total FROM accounts WHERE ${whereClause}`,
    params
  )
  const total = Number(countResult.rows[0].total)

  const offset = (page - 1) * limit
  const dataResult = await pool.query(
    `SELECT * FROM accounts WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  )

  const accounts = (dataResult.rows as AccountRow[]).map((r) => rowToAccount(r)).map(toResponse)

  // Also return stats (computed from full unfiltered dataset for the dashboard cards)
  const statsResult = await pool.query(
    `SELECT
      COUNT(1) as total,
      COUNT(1) FILTER (WHERE status = 'active') as active,
      COUNT(1) FILTER (WHERE status = 'prospect') as prospects,
      COUNT(1) FILTER (WHERE value = 'high') as "highValue"
    FROM accounts WHERE "deletedAt" IS NULL`
  )
  const stats = {
    total: Number(statsResult.rows[0].total),
    active: Number(statsResult.rows[0].active),
    prospects: Number(statsResult.rows[0].prospects),
    highValue: Number(statsResult.rows[0].highValue),
  }

  // Return distinct values for filter dropdowns
  const filtersResult = await pool.query(
    `SELECT
      ARRAY_AGG(DISTINCT industry ORDER BY industry) FILTER (WHERE industry IS NOT NULL) as industries,
      ARRAY_AGG(DISTINCT location ORDER BY location) FILTER (WHERE location IS NOT NULL) as locations
    FROM accounts WHERE "deletedAt" IS NULL`
  )
  const filterOptions = {
    industries: (filtersResult.rows[0].industries as string[] | null) ?? [],
    locations: (filtersResult.rows[0].locations as string[] | null) ?? [],
  }

  return NextResponse.json({
    accounts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats,
    filterOptions,
  })
}

export async function POST(request: Request) {
  const blocked = apiGuard(request)
  if (blocked) return blocked

  const denied = await requireRole(request, 'editor')
  if (denied) return denied

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = createAccountSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodErrors(parsed.error) },
      { status: 400 }
    )
  }

  const body = parsed.data

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
