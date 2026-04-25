'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * "Refresh / Retry" — calls /api/search/[searchId]/retry to re-run the
 * first batch idempotently (skipping listings that already have results),
 * then refreshes the page. Safe to call any time:
 *   - If everything is already analyzed, returns immediately and just refreshes.
 *   - If the original batch died mid-run, this picks up where it left off
 *     without consuming a new search count.
 */
export default function RefreshButton({ searchId }: { searchId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch(`/api/search/${searchId}/retry`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Refresh failed')
      } else if (data.processed > 0) {
        toast.success(`Analyzed ${data.processed} more listing${data.processed !== 1 ? 's' : ''}`)
      } else if (data.alreadyDone > 0) {
        toast.info('Already up to date')
      }
      router.refresh()
    } catch {
      toast.error('Refresh failed — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={refresh}
      disabled={loading}
      className="text-[13px] gap-1.5"
    >
      <motion.svg
        viewBox="0 0 14 14"
        className="h-3.5 w-3.5"
        fill="none"
        animate={loading ? { rotate: 360 } : { rotate: 0 }}
        transition={loading ? { duration: 1.1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <path
          d="M11.5 7a4.5 4.5 0 1 1-1.32-3.18M11.5 2v3h-3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
      {loading ? 'Refreshing…' : 'Refresh'}
    </Button>
  )
}
