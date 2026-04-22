'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  savedId: string
  initialNotes: string | null
}

export default function ListingNoteEditor({ savedId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1"
      >
        {notes ? 'Edit note' : 'Add note'}
      </button>
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/saved/${savedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || null }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 space-y-1.5">
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add a note for this listing…"
        rows={2}
        className="text-xs resize-none"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-7 text-xs">
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </Button>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  )
}
