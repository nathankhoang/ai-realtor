'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * Banner that surfaces "X listings failed analysis — retry?" when the
 * worker has recorded any failures for this search. Polls /status for
 * the count; auto-hides when count returns to 0 (e.g. after a retry
 * succeeds).
 */
export default function FailedListingsBanner({ searchId }: { searchId: string }) {
  const router = useRouter()
  const [failedCount, setFailedCount] = useState(0)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    let active = true
    async function tick() {
      try {
        const res = await fetch(`/api/search/${searchId}/status`)
        if (!res.ok || !active) return
        const data = await res.json()
        setFailedCount(Number(data.failedCount ?? 0))
      } catch {}
    }
    tick()
    const id = setInterval(tick, 8000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [searchId])

  async function retryFailed() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/search/${searchId}/retry-failed`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Retry failed')
      } else if (data.enqueued > 0) {
        toast.success(`Re-running ${data.enqueued} listing${data.enqueued !== 1 ? 's' : ''}…`)
      }
      router.refresh()
    } catch {
      toast.error('Retry failed — try again')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <AnimatePresence>
      {failedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/12 text-destructive text-[13px] font-bold">
                !
              </span>
              <p className="text-[13.5px] text-foreground">
                <span className="font-semibold">{failedCount} listing{failedCount !== 1 ? 's' : ''}</span>
                {' couldn\'t be analyzed.'}{' '}
                <span className="text-muted-foreground">
                  Usually a transient API hiccup — retry to pick them back up.
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={retryFailed}
              disabled={retrying}
              className="text-[13px]"
            >
              {retrying ? 'Re-running…' : 'Retry failed'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
