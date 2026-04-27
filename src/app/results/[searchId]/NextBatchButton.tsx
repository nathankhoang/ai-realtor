'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CapInfo {
  cap: number
  tier: string
}

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
  const [capInfo, setCapInfo] = useState<CapInfo | null>(null)
  const hasMore = analyzedCount < totalCandidates

  async function loadNextBatch() {
    setLoading(true)
    try {
      const res = await fetch(`/api/search/${searchId}/next-batch`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        // Plan-cap response: render the upsell inline instead of a toast.
        // The 403 is expected here, so we don't surface it as an error.
        if (err?.capReached) {
          setCapInfo({ cap: err.cap, tier: err.tier })
          return
        }
        throw new Error(err.error ?? 'Failed to load next batch')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (capInfo) {
    return (
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <span className="text-[13px] text-muted-foreground">
          You&rsquo;ve analyzed {capInfo.cap} listings on this search — the cap for the {capInfo.tier} plan.
        </span>
        <Link href="/pricing">
          <Button variant="default" size="sm">
            Upgrade for more →
          </Button>
        </Link>
      </div>
    )
  }

  if (analyzedCount === 0) return null
  if (!hasMore && analyzedCount > 0) return null

  return (
    <Button variant="default" size="sm" onClick={loadNextBatch} disabled={loading}>
      {loading ? 'Analyzing…' : `Get 10 more matches`}
    </Button>
  )
}
