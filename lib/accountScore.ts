import { Account } from '@/types/account'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const daysBetween = (a: Date, b: Date) => {
  const ms = Math.abs(a.getTime() - b.getTime())
  return ms / (1000 * 60 * 60 * 24)
}

export const computeAccountScore = (
  account: Pick<Account, 'industry' | 'status' | 'updatedAt' | 'signals' | 'researchNotes'>
): number => {
  let score = 0

  const industry = account.industry?.toLowerCase() ?? ''
  if (industry.includes('software') || industry.includes('saas') || industry.includes('technology')) score += 20
  else if (industry.includes('finance') || industry.includes('health') || industry.includes('manufact')) score += 14
  else if (industry.trim().length > 0) score += 10
  else score += 6

  if (account.status === 'active') score += 12
  else if (account.status === 'customer') score += 10
  else if (account.status === 'prospect') score += 8
  else score += 4

  const ageDays = daysBetween(new Date(), account.updatedAt)
  if (ageDays <= 3) score += 20
  else if (ageDays <= 7) score += 16
  else if (ageDays <= 30) score += 10
  else if (ageDays <= 90) score += 6
  else score += 2

  const notes = account.researchNotes?.trim() ?? ''
  if (notes.length > 0) score += 6
  if (notes.length >= 200) score += 8
  if (notes.length >= 600) score += 6

  const signals = account.signals ?? []
  let signalsScore = 0
  for (const s of signals) {
    if (s.severity === 'high') signalsScore += 10
    else if (s.severity === 'medium') signalsScore += 6
    else signalsScore += 3
  }
  score += clamp(signalsScore, 0, 25)

  return clamp(Math.round(score), 0, 100)
}
