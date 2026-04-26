'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
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
  const [pop, setPop] = useState(0) // increments on save → triggers pop animation

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
      if (!alreadySaved) setPop(p => p + 1)
      toast.success(alreadySaved ? `Removed from ${client.name}` : `Saved to ${client.name}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.button
        onClick={openDialog}
        whileTap={{ scale: 0.96 }}
        className={`group/save inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
          isSaved
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
            : 'border-border text-foreground/75 hover:border-foreground/30 hover:text-foreground'
        }`}
      >
        <motion.span
          key={pop}
          initial={pop > 0 ? { scale: 0.6 } : false}
          animate={pop > 0 ? { scale: [0.6, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex"
          aria-hidden
        >
          <HeartIcon filled={isSaved} className="h-4 w-4" />
        </motion.span>
        <span>{isSaved ? 'Saved' : 'Save'}</span>
        {isSaved && savedIds.size > 1 && (
          <span className="ml-0.5 text-[11px] tabular-nums opacity-75">×{savedIds.size}</span>
        )}

        {/* Burst micro-animation on save */}
        <AnimatePresence>
          {pop > 0 && (
            <motion.span
              key={`burst-${pop}`}
              aria-hidden
              initial={{ scale: 0.6, opacity: 0.85 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="pointer-events-none absolute inline-block"
              style={{
                width: 28,
                height: 28,
                borderRadius: '9999px',
                background: 'radial-gradient(circle, rgba(41,82,255,0.35), transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Save to client</DialogTitle>
          </DialogHeader>
          {!clients ? (
            <p className="text-[14px] text-muted-foreground py-4 text-center">Loading…</p>
          ) : clients.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-[14px] text-muted-foreground">No clients yet.</p>
              <a href="/dashboard" className="text-[14px] text-primary font-medium hover:underline">
                Create a client in the dashboard →
              </a>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {clients.map(c => {
                const checked = savedIds.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c)}
                    disabled={loading}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[14.5px] flex items-center justify-between gap-3 transition-colors ${
                      checked ? 'bg-primary/8 hover:bg-primary/12' : 'hover:bg-muted'
                    }`}
                  >
                    <span className={checked ? 'font-medium text-foreground' : 'text-foreground/85'}>
                      {c.name}
                    </span>
                    <HeartIcon
                      filled={checked}
                      className={`h-4 w-4 ${checked ? 'text-primary' : 'text-muted-foreground/40'}`}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function HeartIcon({ filled, className = '' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13.5s-5-3-5-6.75A2.75 2.75 0 0 1 8 5.5a2.75 2.75 0 0 1 5 1.25C13 10.5 8 13.5 8 13.5Z" />
    </svg>
  )
}
