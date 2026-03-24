'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

type Props = {
  accountId: string
  hasSummary: boolean
}

export default function AiSummaryClient({ accountId, hasSummary }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onGenerate = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`/api/accounts/${accountId}/ai-summary` as string, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'Failed to generate summary.')
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      router.refresh()
    } catch {
      setIsLoading(false)
      setError('Failed to generate summary.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={isLoading} onClick={onGenerate}>
        {isLoading ? 'Generating...' : hasSummary ? 'Regenerate' : 'Generate'}
      </Button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  )
}
