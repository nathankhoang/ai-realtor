'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Props {
  initial: {
    displayName: string | null
    brokerage: string | null
    phone: string | null
    avatarUrl: string | null
    reportMessage: string | null
  }
}

export default function AgentBrandingForm({ initial }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName ?? '')
  const [brokerage, setBrokerage] = useState(initial.brokerage ?? '')
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '')
  const [reportMessage, setReportMessage] = useState(initial.reportMessage ?? '')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, brokerage, phone, avatarUrl, reportMessage }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Profile saved — your reports will use these details.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Your name</Label>
          <Input
            id="displayName"
            placeholder="e.g. Sarah Lee"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brokerage">Brokerage</Label>
          <Input
            id="brokerage"
            placeholder="e.g. Compass Real Estate"
            value={brokerage}
            onChange={e => setBrokerage(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="e.g. 512-555-0123"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">Headshot URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="avatarUrl"
            type="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reportMessage">Default message to clients <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          id="reportMessage"
          rows={3}
          placeholder="e.g. These are my top picks based on what we discussed. Let me know which ones you'd like to tour."
          value={reportMessage}
          onChange={e => setReportMessage(e.target.value)}
        />
        <p className="text-[12.5px] text-muted-foreground">Shown at the top of every shared report.</p>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
