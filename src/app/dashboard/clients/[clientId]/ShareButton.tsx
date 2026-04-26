'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  clientId: string
  clientName: string
  clientEmail: string | null
  /** Existing share token (if any). When null, a new one is created on first click. */
  initialToken: string | null
  shareViewCount: number
  shareLastViewedAt: Date | null
}

export default function ShareButton({
  clientId,
  clientName,
  clientEmail,
  initialToken,
  shareViewCount,
  shareLastViewedAt,
}: Props) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    // window is only available client-side. Reading on mount avoids a
    // hydration mismatch with the SSR-rendered (empty) origin.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  async function ensureToken(): Promise<string | null> {
    if (token) return token
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/share`, { method: 'POST' })
      const data = await res.json()
      if (!data.token) throw new Error('No token returned')
      setToken(data.token)
      return data.token as string
    } catch {
      toast.error('Couldn’t generate the share link. Try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    const t = await ensureToken()
    if (!t) return
    await navigator.clipboard.writeText(`${origin}/report/${t}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function emailLink() {
    const t = await ensureToken()
    if (!t) return
    const link = `${origin}/report/${t}`
    const subject = encodeURIComponent(`Home shortlist for ${clientName}`)
    const body = encodeURIComponent(
      `Hi ${clientName.split(' ')[0]},\n\n` +
      `Here are the homes I picked out based on what we discussed:\n\n${link}\n\n` +
      `Take a look and let me know which ones you'd like to tour.\n`,
    )
    const to = clientEmail ? encodeURIComponent(clientEmail) : ''
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  async function regenerate() {
    if (!confirm('Regenerate the share link? The current link will stop working immediately.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      const data = await res.json()
      if (!data.token) throw new Error('No token returned')
      setToken(data.token)
      toast.success('New share link generated. The old link no longer works.')
    } catch {
      toast.error('Couldn’t regenerate the link.')
    } finally {
      setLoading(false)
    }
  }

  const lastViewedText = shareLastViewedAt
    ? `Viewed ${shareViewCount} time${shareViewCount === 1 ? '' : 's'} · last ${formatRelative(new Date(shareLastViewedAt))}`
    : token
      ? 'Not viewed yet'
      : null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={copy} disabled={loading}>
        {loading && !token ? 'Generating…' : copied ? 'Link copied!' : token ? 'Copy link' : 'Share report'}
      </Button>
      {token && (
        <>
          <Button variant="ghost" size="sm" onClick={emailLink} disabled={loading}>
            Email link
          </Button>
          <Button variant="ghost" size="sm" onClick={regenerate} disabled={loading} title="Invalidate the current link and generate a new one">
            Regenerate
          </Button>
        </>
      )}
      {lastViewedText && (
        <span className="text-[12px] text-muted-foreground">{lastViewedText}</span>
      )}
    </div>
  )
}

function formatRelative(date: Date): string {
  const ms = Date.now() - date.getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.round(hr / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
