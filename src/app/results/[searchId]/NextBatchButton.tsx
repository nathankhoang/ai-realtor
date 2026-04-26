'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function NextBatchButton({
  searchId,
  analyzedCount,
  totalCandidates,
}: {
  searchId: string
  analyzedCount: number
  totalCandidates: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const hasMore = analyzedCount < totalCandidates

  async function loadNextBatch() {
    setLoading(true)
    try {
      const res = await fetch(`/api/search/${searchId}/next-batch`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error ?? 'Failed to load next batch')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!hasMore && analyzedCount > 0) return null

  return (
    <Button variant="default" size="sm" onClick={loadNextBatch} disabled={loading}>
      {loading ? 'Analyzing…' : `Get 10 more matches`}
    </Button>
  )
}
