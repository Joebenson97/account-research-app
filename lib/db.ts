import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

import { mockAccounts } from '@/lib/data'
import { Account } from '@/types/account'

export type AccountRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  industry: string | null
  location: string | null
  website: string | null
  description: string | null
  foundedYear: number | null
  employeeCount: number | null
  revenue: number | null
  socialMedia: string | null
  tags: string
  researchNotes: string | null
  aiSummaryJson: string | null
  aiSummaryUpdatedAt: string | null
  signalsJson: string | null
  signalsUpdatedAt: string | null
  status: Account['status']
  value: Account['value']
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

let pool: Pool | null = null
let initialized = false

export const getPool = (): Pool => {
  if (pool) return pool
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return pool
}

export const ensureSchema = async (): Promise<void> => {
  if (initialized) return
  const p = getPool()

  await p.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      industry TEXT,
      location TEXT,
      website TEXT,
      description TEXT,
      "foundedYear" INTEGER,
      "employeeCount" INTEGER,
      revenue DOUBLE PRECISION,
      "socialMedia" TEXT,
      tags TEXT NOT NULL,
      "researchNotes" TEXT,
      "aiSummaryJson" TEXT,
      "aiSummaryUpdatedAt" TEXT,
      "signalsJson" TEXT,
      "signalsUpdatedAt" TEXT,
      status TEXT NOT NULL,
      value TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      "deletedAt" TEXT
    );
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );
  `)

  const countResult = await p.query('SELECT COUNT(1) as c FROM accounts')
  if (Number(countResult.rows[0].c) === 0) {
    for (const a of mockAccounts) {
      await p.query(
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
          a.id,
          a.name,
          a.email ?? null,
          a.phone ?? null,
          a.company ?? null,
          a.industry ?? null,
          a.location ?? null,
          a.website ?? null,
          a.description ?? null,
          a.foundedYear ?? null,
          a.employeeCount ?? null,
          a.revenue ?? null,
          a.socialMedia ? JSON.stringify(a.socialMedia) : null,
          JSON.stringify(a.tags ?? []),
          a.researchNotes ?? null,
          a.status,
          a.value,
          a.createdAt.toISOString(),
          a.updatedAt.toISOString(),
        ]
      )
    }
  }

  const userCount = await p.query('SELECT COUNT(1) as c FROM users')
  if (Number(userCount.rows[0].c) === 0) {
    const hash = bcrypt.hashSync('admin123', 10)
    await p.query(
      'INSERT INTO users (id, email, name, "passwordHash", "createdAt") VALUES ($1, $2, $3, $4, $5)',
      ['1', 'admin@company.com', 'Admin', hash, new Date().toISOString()]
    )
  }

  initialized = true
}

export type UserRow = {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
}

export const findUserByEmail = async (email: string): Promise<UserRow | undefined> => {
  await ensureSchema()
  const p = getPool()
  const result = await p.query('SELECT id, email, name, "passwordHash", "createdAt" FROM users WHERE email = $1', [email])
  return result.rows[0] as UserRow | undefined
}

export const verifyPassword = (plaintext: string, hash: string): boolean => {
  return bcrypt.compareSync(plaintext, hash)
}

export const rowToAccount = (row: AccountRow): Account => {
  const parsedSignals = row.signalsJson
    ? (JSON.parse(row.signalsJson) as Array<{
        type: NonNullable<Account['signals']>[number]['type']
        title: string
        detail: string
        severity: NonNullable<Account['signals']>[number]['severity']
        detectedAt: string
      }>).
        map((s) => ({
          ...s,
          detectedAt: new Date(s.detectedAt),
        }))
    : undefined

  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    industry: row.industry ?? undefined,
    location: row.location ?? undefined,
    website: row.website ?? undefined,
    description: row.description ?? undefined,
    foundedYear: row.foundedYear ?? undefined,
    employeeCount: row.employeeCount ?? undefined,
    revenue: row.revenue ?? undefined,
    socialMedia: row.socialMedia ? (JSON.parse(row.socialMedia) as Account['socialMedia']) : undefined,
    tags: (JSON.parse(row.tags) as string[]) ?? [],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    researchNotes: row.researchNotes ?? undefined,
    aiSummary: row.aiSummaryJson ? (JSON.parse(row.aiSummaryJson) as Account['aiSummary']) : undefined,
    aiSummaryUpdatedAt: row.aiSummaryUpdatedAt ? new Date(row.aiSummaryUpdatedAt) : undefined,
    signals: parsedSignals,
    signalsUpdatedAt: row.signalsUpdatedAt ? new Date(row.signalsUpdatedAt) : undefined,
    status: row.status,
    value: row.value,
  }
}
