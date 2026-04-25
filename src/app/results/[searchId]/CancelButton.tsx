'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * Marks the search as cancelled. Already-running workers exit cheaply
 * once they see `cancelled_at` set on the search row. Pending QStash
 * jobs still get delivered but they short-circuit too.
 *
 * Only renders when the search is still 'running' — past completion
 * (or for already-cancelled searches) the button hides itself.
 */
export default function CancelButton({
  searchId,
  status,
}: {
  searchId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled' | string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (status !== 'running') return null

  async function cancel() {
    if (!confirm('Cancel this search? Already-analyzed listings will stay; pending ones will stop.')) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search/${searchId}/cancel`, { method: 'POST' })
      if (!res.ok) {
        toast.error('Could not cancel — try again')
      } else {
        toast.success('Search cancelled')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cancel}
      disabled={loading}
      className="text-[13px] text-muted-foreground hover:text-destructive"
    >
      {loading ? 'Cancelling…' : 'Cancel'}
    </Button>
  )
}
