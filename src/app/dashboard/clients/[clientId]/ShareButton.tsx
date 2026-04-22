'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  clientId: string
}

export default function ShareButton({ clientId }: Props) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/share`, { method: 'POST' })
      const data = await res.json()
      if (!data.token) return

      const appUrl = window.location.origin
      const url = `${appUrl}/report/${data.token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? 'Generating…' : copied ? 'Link copied!' : 'Share report'}
    </Button>
  )
}
