'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Filter, Download, Building2, Users, TrendingUp, Calendar } from 'lucide-react'
import { Account, SearchFilters } from '@/types/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AccountApi = Omit<Account, 'createdAt' | 'updatedAt'> & {
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

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [loadAccountsError, setLoadAccountsError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    location: '',
    website: '',
    description: '',
    tags: '',
    researchNotes: '',
    status: 'prospect' as Account['status'],
    value: 'medium' as Account['value'],
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    setLoadAccountsError(null)

    try {
      const res = await fetch('/api/accounts', { method: 'GET' })
      if (!res.ok) {
        setLoadAccountsError('Failed to load accounts.')
        setIsLoadingAccounts(false)
        return
      }

      const data = (await res.json()) as { accounts: AccountApi[] }
      const hydrated = (data.accounts ?? []).map((a) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
        aiSummaryUpdatedAt: a.aiSummaryUpdatedAt ? new Date(a.aiSummaryUpdatedAt) : undefined,
        signals: a.signals
          ? a.signals.map((s) => ({
              ...s,
              detectedAt: new Date(s.detectedAt),
            }))
          : undefined,
        signalsUpdatedAt: a.signalsUpdatedAt ? new Date(a.signalsUpdatedAt) : undefined,
      }))
      setAccounts(hydrated)
      setIsLoadingAccounts(false)
    } catch {
      setLoadAccountsError('Failed to load accounts.')
      setIsLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const filteredAccounts = accounts.filter(account => {
    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase()
      const matchesQuery =
        account.name.toLowerCase().includes(query) ||
        account.company?.toLowerCase().includes(query) ||
        account.email?.toLowerCase().includes(query)
      if (!matchesQuery) return false
    }
    if (searchFilters.industry && account.industry !== searchFilters.industry) return false
    if (searchFilters.status && account.status !== searchFilters.status) return false
    if (searchFilters.value && account.value !== searchFilters.value) return false
    if (searchFilters.location && account.location !== searchFilters.location) return false
    return true
  })

  const stats = {
    total: accounts.length,
    active: accounts.filter(a => a.status === 'active').length,
    prospects: accounts.filter(a => a.status === 'prospect').length,
    highValue: accounts.filter(a => a.value === 'high').length,
  }

  const canCreate = useMemo(() => {
    return createForm.name.trim().length > 0
  }, [createForm.name])

  const onExport = useCallback(() => {
    const headers = ['Name', 'Email', 'Company', 'Industry', 'Location', 'Status', 'Value', 'Score', 'Signals', 'Created', 'Updated']
    const escCsv = (v: string) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
      return v
    }
    const rows = filteredAccounts.map((a) => [
      a.name,
      a.email ?? '',
      a.company ?? '',
      a.industry ?? '',
      a.location ?? '',
      a.status,
      a.value,
      String(a.accountScore ?? ''),
      String(a.signals?.length ?? 0),
      a.createdAt.toISOString(),
      a.updatedAt.toISOString(),
    ].map(escCsv).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'accounts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredAccounts])

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      industry: '',
      location: '',
      website: '',
      description: '',
      tags: '',
      researchNotes: '',
      status: 'prospect',
      value: 'medium',
    })
    setCreateError(null)
  }

  const onCreateAccount = async () => {
    setCreateError(null)

    if (isCreating) return

    const name = createForm.name.trim()
    if (!name) {
      setCreateError('Account name is required.')
      return
    }

    setIsCreating(true)

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email: createForm.email.trim() || undefined,
          phone: createForm.phone.trim() || undefined,
          company: createForm.company.trim() || undefined,
          industry: createForm.industry.trim() || undefined,
          location: createForm.location.trim() || undefined,
          website: createForm.website.trim() || undefined,
          description: createForm.description.trim() || undefined,
          tags: createForm.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          researchNotes: createForm.researchNotes.trim() || undefined,
          status: createForm.status,
          value: createForm.value,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setCreateError(data?.error ?? 'Failed to create account.')
        setIsCreating(false)
        return
      }

      const data = (await res.json()) as { account: AccountApi }
      const created: Account = {
        ...data.account,
        createdAt: new Date(data.account.createdAt),
        updatedAt: new Date(data.account.updatedAt),
      }
      setAccounts((prev) => [created, ...prev])
      setIsCreateOpen(false)
      resetCreateForm()
      setIsCreating(false)
    } catch {
      setCreateError('Failed to create account.')
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Account Research</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsCreateOpen(true)
                  setCreateError(null)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prospects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.prospects}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Value</p>
                <p className="text-2xl font-bold text-gray-900">{stats.highValue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts..."
                  value={searchFilters.query || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, query: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={searchFilters.industry || ''}
                onChange={(e) => setSearchFilters({ ...searchFilters, industry: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Industries</option>
                <option value="Technology">Technology</option>
                <option value="Financial Technology">Financial Technology</option>
                <option value="Marketing & Advertising">Marketing & Advertising</option>
              </select>
              <select
                value={searchFilters.status || ''}
                onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value as Account['status'] || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
                <option value="customer">Customer</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => setShowMoreFilters((v) => !v)}>
                <Filter className="h-4 w-4 mr-2" />
                {showMoreFilters ? 'Less Filters' : 'More Filters'}
              </Button>
            </div>
          </div>
          {showMoreFilters ? (
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                <select
                  value={searchFilters.value || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, value: e.target.value as Account['value'] || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Values</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <select
                  value={searchFilters.location || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {Array.from(new Set(accounts.map((a) => a.location).filter((l): l is string => Boolean(l)))).sort().map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>

        {/* Accounts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Accounts ({filteredAccounts.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadAccountsError ? (
                  <tr>
                    <td className="px-6 py-4 text-sm text-red-600" colSpan={8}>
                      <div className="flex items-center justify-between gap-4">
                        <div>{loadAccountsError}</div>
                        <Button variant="outline" size="sm" onClick={loadAccounts}>
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : isLoadingAccounts ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-500" colSpan={8}>
                      Loading accounts...
                    </td>
                  </tr>
                ) : null}

                {!loadAccountsError && !isLoadingAccounts
                  ? filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          <Link href={`/accounts/${account.id}`} className="hover:underline">
                            {account.name}
                          </Link>
                        </div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.industry}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.status === 'active' ? 'bg-green-100 text-green-800' :
                        account.status === 'prospect' ? 'bg-yellow-100 text-yellow-800' :
                        account.status === 'customer' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.value === 'high' ? 'bg-purple-100 text-purple-800' :
                        account.value === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {account.value}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof account.accountScore === 'number' ? String(account.accountScore) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.signals?.length ? String(account.signals.length) : '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/accounts/${account.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                  ))
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (isCreating) return
              setIsCreateOpen(false)
              resetCreateForm()
            }}
          />
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Add Account</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isCreating) return
                  setIsCreateOpen(false)
                  resetCreateForm()
                }}
              >
                Close
              </Button>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <Input
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    placeholder="e.g. Acme Corporation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+1-555-0123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <Input
                    value={createForm.industry}
                    onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                    placeholder="Technology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <Input
                    value={createForm.website}
                    onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <Input
                    value={createForm.tags}
                    onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    placeholder="b2b, saas, enterprise"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as Account['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <select
                    value={createForm.value}
                    onChange={(e) => setCreateForm({ ...createForm, value: e.target.value as Account['value'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Short description of the account"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Research Notes</label>
                  <textarea
                    value={createForm.researchNotes}
                    onChange={(e) => setCreateForm({ ...createForm, researchNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="What did you learn about this account?"
                  />
                </div>
              </div>

              {createError ? <div className="mt-4 text-sm text-red-600">{createError}</div> : null}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (isCreating) return
                  setIsCreateOpen(false)
                  resetCreateForm()
                }}
              >
                Cancel
              </Button>
              <Button disabled={!canCreate || isCreating} onClick={onCreateAccount}>
                {isCreating ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
