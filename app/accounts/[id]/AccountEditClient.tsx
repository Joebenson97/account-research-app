'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Account } from '@/types/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AccountApi = Omit<Account, 'createdAt' | 'updatedAt' | 'aiSummaryUpdatedAt'> & {
  createdAt: string
  updatedAt: string
  aiSummaryUpdatedAt?: string
}

type Props = {
  account: AccountApi
}

export default function AccountEditClient({ account }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    name: account.name ?? '',
    email: account.email ?? '',
    phone: account.phone ?? '',
    company: account.company ?? '',
    industry: account.industry ?? '',
    location: account.location ?? '',
    website: account.website ?? '',
    description: account.description ?? '',
    tags: (account.tags ?? []).join(', '),
    researchNotes: account.researchNotes ?? '',
    status: account.status,
    value: account.value,
  }))

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name])

  const close = () => {
    if (isSaving) return
    setIsOpen(false)
    setError(null)
    setForm({
      name: account.name ?? '',
      email: account.email ?? '',
      phone: account.phone ?? '',
      company: account.company ?? '',
      industry: account.industry ?? '',
      location: account.location ?? '',
      website: account.website ?? '',
      description: account.description ?? '',
      tags: (account.tags ?? []).join(', '),
      researchNotes: account.researchNotes ?? '',
      status: account.status,
      value: account.value,
    })
  }

  const onSave = async () => {
    setError(null)

    if (isSaving) return
    setIsSaving(true)

    try {
      const res = await fetch(`/api/accounts/${account.id}` as string, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          industry: form.industry,
          location: form.location,
          website: form.website,
          description: form.description,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          researchNotes: form.researchNotes,
          status: form.status,
          value: form.value,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'Failed to save changes.')
        setIsSaving(false)
        return
      }

      setIsOpen(false)
      setIsSaving(false)
      router.refresh()
    } catch {
      setError('Failed to save changes.')
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Edit
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Edit Account</h3>
              <Button variant="ghost" size="sm" onClick={close}>
                Close
              </Button>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Account['status'] })}
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
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value as Account['value'] })}
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
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Research Notes</label>
                  <textarea
                    value={form.researchNotes}
                    onChange={(e) => setForm({ ...form, researchNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={5}
                  />
                </div>
              </div>

              {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={isSaving}>
                Cancel
              </Button>
              <Button disabled={!canSave || isSaving} onClick={onSave}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
