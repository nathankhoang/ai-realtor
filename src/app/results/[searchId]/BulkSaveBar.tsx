'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Client { id: string; name: string }

interface Props {
  selectedIds: string[]
  onClear: () => void
}

export default function BulkSaveBar({ selectedIds, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function openDialog() {
    setOpen(true)
    if (!clients) {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data.clients ?? [])
    }
  }

  async function saveToClient(client: Client) {
    setLoading(true)
    try {
      await Promise.all(
        selectedIds.map(listingId =>
          fetch(`/api/clients/${client.id}/saved`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId }),
          })
        )
      )
      toast.success(`${selectedIds.length} home${selectedIds.length !== 1 ? 's' : ''} saved to ${client.name}`)
      setOpen(false)
      onClear()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (selectedIds.length === 0) return null

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-foreground text-background px-4 py-2.5 rounded-full shadow-lg">
        <span className="text-sm font-medium">{selectedIds.length} selected</span>
        <Button size="sm" variant="secondary" onClick={openDialog} className="rounded-full h-7 px-3 text-xs">
          Save to client
        </Button>
        <button onClick={onClear} className="text-background/60 hover:text-background transition-colors text-sm">✕</button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Save {selectedIds.length} home{selectedIds.length !== 1 ? 's' : ''} to client</DialogTitle>
          </DialogHeader>
          {!clients ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
          ) : clients.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No clients yet.</p>
              <a href="/dashboard" className="text-xs text-primary hover:underline">Create a client →</a>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => saveToClient(c)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2.5 rounded hover:bg-muted text-sm transition-colors disabled:opacity-50"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
