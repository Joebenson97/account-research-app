import { Account } from '@/types/account'

type Signal = NonNullable<Account['signals']>[number]

type SignalWithoutDetectedAt = Omit<Signal, 'detectedAt'> & { detectedAt: Date }

const hashString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const pick = <T,>(arr: T[], n: number) => arr[n % arr.length]

export const generateMockSignals = (account: Pick<Account, 'name' | 'researchNotes'>): Signal[] => {
  const seed = hashString(`${account.name}::${account.researchNotes ?? ''}`)
  const now = Date.now()

  const notes = (account.researchNotes ?? '').toLowerCase()

  const base: Array<Omit<SignalWithoutDetectedAt, 'detectedAt'> & { detectedAtMsOffset: number }> = [
    {
      type: 'funding',
      title: `${account.name} may be preparing for a raise`,
      detail: 'Signals suggest activity consistent with fundraising: renewed GTM messaging and a push to quantify ROI.',
      severity: 'medium',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 9,
    },
    {
      type: 'hiring',
      title: 'Hiring spike in key teams',
      detail: 'Mock trend indicates increased hiring velocity in revenue and engineering roles.',
      severity: 'high',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 15,
    },
    {
      type: 'leadership',
      title: 'Leadership change could unlock budget',
      detail: 'New executive ownership often triggers tool evaluations and vendor consolidation.',
      severity: 'medium',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 22,
    },
    {
      type: 'product',
      title: 'Product launch momentum',
      detail: 'Launch cycles increase urgency for reliability, analytics, and customer experience improvements.',
      severity: 'low',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 28,
    },
  ]

  const extra: Array<Omit<SignalWithoutDetectedAt, 'detectedAt'> & { detectedAtMsOffset: number }> = []

  if (notes.includes('hiring') || notes.includes('headcount') || notes.includes('recruit')) {
    extra.push({
      type: 'hiring',
      title: 'Notes indicate active hiring',
      detail: 'Your research notes mention hiring/headcount. Hiring growth often correlates with tooling and process spend.',
      severity: 'high',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 4,
    })
  }

  if (notes.includes('funding') || notes.includes('series') || notes.includes('seed') || notes.includes('raise')) {
    extra.push({
      type: 'funding',
      title: 'Funding-related activity mentioned in notes',
      detail: 'Your research notes suggest funding conversations. New capital typically accelerates growth initiatives.',
      severity: 'high',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 6,
    })
  }

  if (notes.includes('launch') || notes.includes('release') || notes.includes('roadmap')) {
    extra.push({
      type: 'product',
      title: 'Upcoming release cycle',
      detail: 'Notes mention launches/roadmap. Pre-launch periods are ideal for tightening metrics and reliability.',
      severity: 'medium',
      detectedAtMsOffset: 1000 * 60 * 60 * 24 * 8,
    })
  }

  const desiredCount = 3
  const signals: Signal[] = []

  const pool = [...extra, ...base]
  for (let i = 0; i < pool.length && signals.length < desiredCount; i++) {
    const item = pick(pool, seed + i)

    const key = `${item.type}:${item.title}`
    if (signals.some((s) => `${s.type}:${s.title}` === key)) continue

    signals.push({
      type: item.type,
      title: item.title,
      detail: item.detail,
      severity: item.severity,
      detectedAt: new Date(now - item.detectedAtMsOffset),
    })
  }

  return signals
}
