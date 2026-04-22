'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalysisPoller() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(id)
  }, [router])

  return null
}
