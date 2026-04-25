'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Client { id: string; name: string }

export default function SaveButton({
  listingId,
  initialSavedClientIds,
}: {
  listingId: string
  initialSavedClientIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedClientIds))
  const [loading, setLoading] = useState(false)

  const isSaved = savedIds.size > 0

  async function openDialog() {
    setOpen(true)
    if (!clients) {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data.clients ?? [])
    }
  }

  async function toggle(client: Client) {
    setLoading(true)
    const alreadySaved = savedIds.has(client.id)
    try {
      await fetch(`/api/clients/${client.id}/saved`, {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })
      setSavedIds(prev => {
        const next = new Set(prev)
        if (alreadySaved) next.delete(client.id)
        else next.add(client.id)
        return next
      })
      toast.success(alreadySaved ? `Removed from ${client.name}` : `Saved to ${client.name}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={openDialog}
        className={`text-[13px] font-medium shrink-0 transition-colors ${isSaved ? 'text-primary hover:text-primary/70' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {isSaved ? '♥ Saved' : '♡ Save'}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Save to client</DialogTitle>
          </DialogHeader>
          {!clients ? (
            <p className="text-[13px] text-muted-foreground py-4 text-center">Loading…</p>
          ) : clients.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-[13px] text-muted-foreground">No clients yet.</p>
              <a href="/dashboard" className="text-[13px] text-primary hover:underline">
                Create a client in the dashboard →
              </a>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggle(c)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted text-[14px] flex items-center justify-between transition-colors"
                >
                  <span>{c.name}</span>
                  {savedIds.has(c.id) && <span className="text-primary text-[13px]">♥</span>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
