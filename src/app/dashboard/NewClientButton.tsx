'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function NewClientButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, notes }),
      })
      if (!res.ok) throw new Error('Failed to create client')
      toast.success(`Client "${name}" created`)
      setOpen(false)
      setName(''); setEmail(''); setPhone(''); setNotes('')
      router.refresh()
    } catch {
      toast.error('Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ New Client</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Budget, preferences, timeline…" rows={3} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Creating…' : 'Create Client'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
