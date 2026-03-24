import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

import { mockAccounts } from '@/lib/data'
import { Account } from '@/types/account'

type AccountRow = {
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
}

let db: Database.Database | null = null

const dbFilePath = () => {
  return path.join(process.cwd(), 'data', 'accounts.db')
}

export const getDb = () => {
  if (db) return db

  const file = dbFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  db = new Database(file)
  db.pragma('journal_mode = WAL')

  db.exec(`
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
      foundedYear INTEGER,
      employeeCount INTEGER,
      revenue REAL,
      socialMedia TEXT,
      tags TEXT NOT NULL,
      researchNotes TEXT,
      aiSummaryJson TEXT,
      aiSummaryUpdatedAt TEXT,
      status TEXT NOT NULL,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)

  const columns = (db.pragma('table_info(accounts)') as Array<{ name: string }>).map((c) => c.name)
  if (!columns.includes('aiSummaryJson')) {
    db.exec('ALTER TABLE accounts ADD COLUMN aiSummaryJson TEXT')
  }
  if (!columns.includes('aiSummaryUpdatedAt')) {
    db.exec('ALTER TABLE accounts ADD COLUMN aiSummaryUpdatedAt TEXT')
  }
  if (!columns.includes('signalsJson')) {
    db.exec('ALTER TABLE accounts ADD COLUMN signalsJson TEXT')
  }
  if (!columns.includes('signalsUpdatedAt')) {
    db.exec('ALTER TABLE accounts ADD COLUMN signalsUpdatedAt TEXT')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  const count = db.prepare('SELECT COUNT(1) as c FROM accounts').get() as { c: number }
  if (count.c === 0) {
    const insert = db.prepare(`
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

    const tx = db.transaction((accounts: Account[]) => {
      for (const a of accounts) {
        insert.run({
          id: a.id,
          name: a.name,
          email: a.email ?? null,
          phone: a.phone ?? null,
          company: a.company ?? null,
          industry: a.industry ?? null,
          location: a.location ?? null,
          website: a.website ?? null,
          description: a.description ?? null,
          foundedYear: a.foundedYear ?? null,
          employeeCount: a.employeeCount ?? null,
          revenue: a.revenue ?? null,
          socialMedia: a.socialMedia ? JSON.stringify(a.socialMedia) : null,
          tags: JSON.stringify(a.tags ?? []),
          researchNotes: a.researchNotes ?? null,
          status: a.status,
          value: a.value,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        })
      }
    })

    tx(mockAccounts)
  }

  return db
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
