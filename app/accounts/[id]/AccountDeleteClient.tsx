'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

type Props = {
  accountId: string
  accountName: string
}

export default function AccountDeleteClient({ accountId, accountName }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (isDeleting) return
    setIsOpen(false)
    setError(null)
  }

  const onDelete = async () => {
    setError(null)
    if (isDeleting) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/accounts/${accountId}` as string, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'Failed to delete account.')
        setIsDeleting(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Failed to delete account.')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setIsOpen(true)}>
        Delete
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <strong>{accountName}</strong>? The account will be
                removed from all views and dashboards.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This is a soft delete — the data is retained in the database and can be recovered by an administrator.
              </p>

              {error ? (
                <div className="mt-4 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={close} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
