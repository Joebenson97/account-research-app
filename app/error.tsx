'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function GlobalError({
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow p-6">
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <div className="mt-2 text-sm text-gray-600">An unexpected error occurred. Try again.</div>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  )
}
