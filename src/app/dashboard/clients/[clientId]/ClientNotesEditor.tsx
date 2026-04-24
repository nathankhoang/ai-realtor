'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ClientNotesEditor({ clientId, initialNotes }: { clientId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(initialNotes ?? '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) throw new Error()
      setSaved(notes)
      setEditing(false)
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setLoading(false)
    }
  }

  function cancel() {
    setNotes(saved)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-left text-muted-foreground hover:text-foreground transition-colors group"
      >
        {saved ? (
          <span>{saved} <span className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground ml-1">Edit</span></span>
        ) : (
          <span className="text-muted-foreground/60 hover:text-muted-foreground text-sm">+ Add notes about this client…</span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Budget, timeline, preferences, must-haves…"
        rows={3}
        className="text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
        <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
      </div>
    </div>
  )
}
