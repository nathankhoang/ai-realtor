'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  searchId: string
  initialAnalyzed: number
  initialTotal: number
}

export default function AnalysisPoller({ searchId, initialAnalyzed, initialTotal }: Props) {
  const router = useRouter()
  const [analyzed, setAnalyzed] = useState(initialAnalyzed)
  const [total, setTotal] = useState(initialTotal)

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/search/${searchId}/status`)
        if (res.ok) {
          const data = await res.json()
          setAnalyzed(data.analyzedCount)
          setTotal(data.totalCandidates)
          if (data.resultCount > 0) {
            router.refresh()
          }
        }
      } catch {
        // silently ignore fetch errors during polling
      }
    }, 3000)
    return () => clearInterval(id)
  }, [router, searchId])

  const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0

  return (
    <div className="space-y-3 w-full max-w-xs mx-auto">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Analyzing listings…</span>
        {total > 0 && <span>{analyzed} of {total}</span>}
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: total > 0 ? `${pct}%` : '30%' }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">This takes about 30 seconds</p>
    </div>
  )
}
