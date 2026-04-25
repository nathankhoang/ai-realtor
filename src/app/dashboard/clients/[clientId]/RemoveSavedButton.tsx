'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function RemoveSavedButton({ savedId }: { savedId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function remove() {
    setLoading(true)
    try {
      await fetch(`/api/saved/${savedId}`, { method: 'DELETE' })
      toast.success('Removed')
      router.refresh()
    } catch {
      toast.error('Failed to remove')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={remove} disabled={loading} className="text-[13px] text-muted-foreground hover:text-destructive shrink-0 transition-colors">
      Remove
    </button>
  )
}
