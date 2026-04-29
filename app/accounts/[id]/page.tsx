import Link from 'next/link'
import { notFound } from 'next/navigation'

import { computeAccountScore } from '@/lib/accountScore'
import { getPool, ensureSchema, rowToAccount, AccountRow } from '@/lib/db'
import AccountDeleteClient from './AccountDeleteClient'
import AccountEditClient from './AccountEditClient'
import AiSummaryClient from './AiSummaryClient'
import SignalsClient from './SignalsClient'

export default async function AccountDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await ensureSchema()
  const pool = getPool()
  const result = await pool.query(
    'SELECT * FROM accounts WHERE id = $1 AND "deletedAt" IS NULL',
    [params.id]
  )
  const row = result.rows[0] as AccountRow | undefined

  if (!row) notFound()

  const account = rowToAccount(row)
  const accountScore = computeAccountScore(account)
  const accountForClient = {
    ...account,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    aiSummaryUpdatedAt: account.aiSummaryUpdatedAt
      ? account.aiSummaryUpdatedAt.toISOString()
      : undefined,
    signals: undefined,
    signalsUpdatedAt: undefined,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <div className="text-sm text-gray-500">
                <Link href="/" className="hover:text-gray-700">
                  Accounts
                </Link>
                <span className="mx-2">/</span>
                <span className="text-gray-700">{account.name}</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{account.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <AccountEditClient account={accountForClient} />
              <AccountDeleteClient accountId={account.id} accountName={account.name} />
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                Score: {accountScore}
              </span>
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  account.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : account.status === 'prospect'
                      ? 'bg-yellow-100 text-yellow-800'
                      : account.status === 'customer'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {account.status}
              </span>
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  account.value === 'high'
                    ? 'bg-purple-100 text-purple-800'
                    : account.value === 'medium'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {account.value}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.company ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Industry</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.industry ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.location ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.website ? (
                      <a
                        href={account.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {account.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Founded</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.foundedYear ? String(account.foundedYear) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employees</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.employeeCount ? String(account.employeeCount) : '—'}
                  </dd>
                </div>
              </dl>

              <div className="mt-6">
                <div className="text-sm font-medium text-gray-500">Description</div>
                <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">
                  {account.description ?? '—'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">AI Summary</h2>
                  <div className="mt-1 text-sm text-gray-500">
                    {account.aiSummaryUpdatedAt
                      ? `Last generated: ${account.aiSummaryUpdatedAt.toLocaleString()}`
                      : 'Not generated yet.'}
                  </div>
                </div>
                <AiSummaryClient accountId={account.id} hasSummary={Boolean(account.aiSummary)} />
              </div>

              {account.aiSummary ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Company overview</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {account.aiSummary.companyOverview}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Likely priorities</div>
                    {account.aiSummary.likelyPriorities?.length ? (
                      <ul className="mt-1 text-sm text-gray-900 list-disc pl-5 space-y-1">
                        {account.aiSummary.likelyPriorities.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1 text-sm text-gray-900">—</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Suggested outreach angle</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {account.aiSummary.suggestedOutreachAngle}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Key risks</div>
                    {account.aiSummary.keyRisks?.length ? (
                      <ul className="mt-1 text-sm text-gray-900 list-disc pl-5 space-y-1">
                        {account.aiSummary.keyRisks.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1 text-sm text-gray-900">—</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500">Generate a summary to see AI insights here.</div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Signals</h2>
                  <div className="mt-1 text-sm text-gray-500">
                    {account.signalsUpdatedAt
                      ? `Last generated: ${account.signalsUpdatedAt.toLocaleString()}`
                      : 'Not generated yet.'}
                  </div>
                </div>
                <SignalsClient accountId={account.id} hasSignals={Boolean(account.signals?.length)} />
              </div>

              {account.signals?.length ? (
                <div className="mt-4 space-y-3">
                  {account.signals.map((s) => (
                    <div key={`${s.type}:${s.title}`} className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{s.title}</div>
                          <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{s.detail}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              s.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : s.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {s.severity}
                          </span>
                          <div className="text-xs text-gray-500">{s.detectedAt.toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500">Generate signals to see buying triggers here.</div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Research Notes</h2>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {account.researchNotes ?? '—'}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
              {account.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {account.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">—</div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Social</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500">LinkedIn</div>
                  <div className="text-gray-900">
                    {account.socialMedia?.linkedin ? (
                      <a
                        href={account.socialMedia.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {account.socialMedia.linkedin}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Twitter</div>
                  <div className="text-gray-900">
                    {account.socialMedia?.twitter ? (
                      <a
                        href={account.socialMedia.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {account.socialMedia.twitter}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Instagram</div>
                  <div className="text-gray-900">
                    {account.socialMedia?.instagram ? (
                      <a
                        href={account.socialMedia.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {account.socialMedia.instagram}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Facebook</div>
                  <div className="text-gray-900">
                    {account.socialMedia?.facebook ? (
                      <a
                        href={account.socialMedia.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {account.socialMedia.facebook}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">{account.createdAt.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd className="text-gray-900">{account.updatedAt.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
