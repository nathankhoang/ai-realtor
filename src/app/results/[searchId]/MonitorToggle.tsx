'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  searchId: string
  initialEnabled: boolean
}

/**
 * Toggles the daily search monitor. When on, /api/cron/search-monitor
 * re-runs this search against fresh Zillow data and emails the agent
 * on any new strong match.
 */
export default function MonitorToggle({ searchId, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !enabled
    setLoading(true)
    setEnabled(next) // optimistic
    try {
      const res = await fetch(`/api/search/${searchId}/monitor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error('Failed to update monitor')
      toast.success(next
        ? 'Monitor on — we’ll email you when new strong matches appear'
        : 'Monitor off')
    } catch (err) {
      setEnabled(!next) // revert
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={enabled ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      title={enabled
        ? 'Receiving daily alerts for new matches in this search'
        : 'Get notified when new homes match this search'}
    >
      <span aria-hidden className="mr-1">{enabled ? '🔔' : '🔕'}</span>
      {enabled ? 'Monitor on' : 'Monitor'}
    </Button>
  )
}
