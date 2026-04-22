'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function UpgradeSuccessToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('upgraded') !== 'true') return

    // Remove the query param without a full reload
    const url = new URL(window.location.href)
    url.searchParams.delete('upgraded')
    router.replace(url.pathname + url.search)

    // Use a simple visual toast — avoids importing a toast library
    const el = document.createElement('div')
    el.textContent = 'Plan upgraded successfully!'
    el.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'background:hsl(var(--foreground))',
      'color:hsl(var(--background))',
      'padding:12px 20px',
      'border-radius:8px',
      'font-size:14px',
      'font-weight:500',
      'z-index:9999',
      'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
      'animation:fadeIn 0.2s ease',
    ].join(';')
    document.body.appendChild(el)

    const timer = setTimeout(() => {
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.3s ease'
      setTimeout(() => el.remove(), 300)
    }, 4000)

    return () => {
      clearTimeout(timer)
      el.remove()
    }
  }, [searchParams, router])

  return null
}
