'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function AccountDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold text-gray-900">Account page error</h1>
          <div className="mt-2 text-sm text-gray-600">We couldn’t load this account right now. Try again.</div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
