'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  priceId: string
  label: string
  signedIn: boolean
}

export default function PricingUpgradeButton({ priceId, label, signedIn }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!signedIn) {
      router.push('/sign-up')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? 'Redirecting…' : label}
    </Button>
  )
}
