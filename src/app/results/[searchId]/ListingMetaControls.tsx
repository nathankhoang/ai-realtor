'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ListingTag } from '@/lib/db/schema'

interface Props {
  listingId: string
  tag: ListingTag | null
  note: string | null
  onChange: (patch: { tag?: ListingTag | null; note?: string | null }) => void
  /** Compact variant — used inside ListingCard. Full inline in FocusMode. */
  compact?: boolean
}

const NOTE_DEBOUNCE_MS = 600
const NOTE_MAX = 1000

/**
 * Tag pills (Show / Maybe / Skip) + a debounced note input. Persists to
 * /api/listings/[listingId]/meta. Both controls are scoped per agent —
 * this is the agent's private triage layer, not visible to clients.
 */
export default function ListingMetaControls({ listingId, tag, note, onChange, compact = false }: Props) {
  const [localNote, setLocalNote] = useState(note ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resync if the prop changes from elsewhere (e.g., parent updates the
  // override map after our debounced save). Local state is the source of
  // truth while the user is typing; prop wins after settle.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalNote(note ?? '')
  }, [note])

  async function persist(patch: { tag?: ListingTag | null; note?: string | null }) {
    onChange(patch)
    try {
      const res = await fetch(`/api/listings/${listingId}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Failed to save')
    } catch {
      toast.error('Couldn’t save your note — try again')
    }
  }

  function setTag(next: ListingTag | null) {
    // Toggling the same tag clears it.
    const value = next === tag ? null : next
    persist({ tag: value })
  }

  function onNoteChange(v: string) {
    setLocalNote(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persist({ note: v.slice(0, NOTE_MAX) || null })
    }, NOTE_DEBOUNCE_MS)
  }

  // Persist on blur immediately so closing the page doesn't lose recent text.
  function onNoteBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist({ note: localNote.slice(0, NOTE_MAX) || null })
    }
  }

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mr-1">
          Triage
        </span>
        <TagPill active={tag === 'show'} onClick={() => setTag('show')} variant="show">★ Show</TagPill>
        <TagPill active={tag === 'maybe'} onClick={() => setTag('maybe')} variant="maybe">Maybe</TagPill>
        <TagPill active={tag === 'skip'} onClick={() => setTag('skip')} variant="skip">Skip</TagPill>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Your note
        </label>
        <textarea
          value={localNote}
          onChange={e => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
          maxLength={NOTE_MAX}
          rows={compact ? 2 : 3}
          placeholder="e.g. great kitchen but yard too small for the kids"
          className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13.5px] leading-relaxed placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none transition-colors"
        />
      </div>
    </div>
  )
}

function TagPill({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean
  onClick: () => void
  variant: 'show' | 'maybe' | 'skip'
  children: React.ReactNode
}) {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors'
  if (active) {
    if (variant === 'show') return <button onClick={onClick} className={`${base} border-primary bg-primary text-primary-foreground`}>{children}</button>
    if (variant === 'maybe') return <button onClick={onClick} className={`${base} border-amber-400 bg-amber-100 text-amber-900`}>{children}</button>
    return <button onClick={onClick} className={`${base} border-stone-400 bg-stone-200 text-stone-700`}>{children}</button>
  }
  return (
    <button onClick={onClick} className={`${base} border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground`}>
      {children}
    </button>
  )
}
