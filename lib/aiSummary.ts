import { Account } from '@/types/account'

const firstNonEmptyLine = (s: string | undefined) => {
  if (!s) return undefined
  const line = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean)
  return line && line.length > 0 ? line : undefined
}

const noteSnippet = (notes: string | undefined) => {
  const line = firstNonEmptyLine(notes)
  if (!line) return undefined
  if (line.length <= 160) return line
  return `${line.slice(0, 157)}...`
}

export const generateAiSummary = (account: Pick<
  Account,
  'name' | 'industry' | 'status' | 'researchNotes' | 'value'
>): NonNullable<Account['aiSummary']> => {
  const industry = account.industry?.trim() || 'their industry'
  const status = account.status
  const value = account.value
  const snippet = noteSnippet(account.researchNotes)

  const companyOverview = snippet
    ? `${account.name} appears to be a ${status} account in ${industry}. Notes highlight: “${snippet}”.`
    : `${account.name} appears to be a ${status} account in ${industry}. Add research notes to make this summary more specific.`

  const likelyPrioritiesBase =
    industry.toLowerCase().includes('technology') || industry.toLowerCase().includes('software')
      ? ['Reduce time-to-value', 'Improve reliability', 'Ship features faster', 'Strengthen security posture']
      : industry.toLowerCase().includes('health')
        ? ['Ensure compliance', 'Improve patient/customer experience', 'Reduce operational costs', 'Strengthen data governance']
        : industry.toLowerCase().includes('finance')
          ? ['Risk reduction', 'Regulatory compliance', 'Operational efficiency', 'Fraud prevention']
          : ['Operational efficiency', 'Revenue growth', 'Cost reduction', 'Better reporting/visibility']

  const likelyPriorities =
    status === 'prospect'
      ? ['Validate fit quickly', ...likelyPrioritiesBase.slice(0, 3)]
      : status === 'customer'
        ? ['Expand usage', 'Improve outcomes', 'Reduce churn risk', ...likelyPrioritiesBase.slice(0, 1)]
        : status === 'inactive'
          ? ['Rebuild engagement', 'Address blockers', ...likelyPrioritiesBase.slice(0, 2)]
          : likelyPrioritiesBase

  const suggestedOutreachAngle =
    status === 'prospect'
      ? `Lead with a specific hypothesis about ${industry} outcomes and offer a short discovery call to validate priorities.`
      : status === 'customer'
        ? `Anchor outreach on measurable wins and propose an expansion plan aligned to their next-quarter priorities.`
        : status === 'inactive'
          ? `Re-open with a “what changed?” check-in, focus on removing friction, and offer a small, low-risk pilot.`
          : `Share a tailored point-of-view on ${industry} and propose the next best step based on their current maturity.`

  const keyRisks = [
    value === 'high' ? 'High expectations and stakeholder scrutiny' : undefined,
    status === 'prospect' ? 'Unclear decision process / timeline' : undefined,
    account.researchNotes?.trim() ? undefined : 'Insufficient research notes to tailor outreach'
  ].filter(Boolean) as string[]

  return {
    companyOverview,
    likelyPriorities,
    suggestedOutreachAngle,
    keyRisks,
  }
}
