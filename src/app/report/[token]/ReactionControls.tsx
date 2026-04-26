'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ClientReaction } from '@/lib/db/schema'

const COMMENT_MAX = 600
const COMMENT_DEBOUNCE_MS = 800

interface Props {
  token: string
  savedListingId: string
  initialReaction: ClientReaction | null
  initialComment: string | null
}

/**
 * Client-facing reaction widget on the shared report. Lets the buyer
 * thumb up / thumb down + drop a quick note that the agent sees on
 * the client's profile page.
 */
export default function ReactionControls({ token, savedListingId, initialReaction, initialComment }: Props) {
  const [reaction, setReaction] = useState<ClientReaction | null>(initialReaction)
  const [comment, setComment] = useState(initialComment ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  async function persist(patch: { reaction?: ClientReaction | null; comment?: string | null }) {
    try {
      const res = await fetch(`/api/report/${token}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          savedListingId,
          reaction: patch.reaction !== undefined ? patch.reaction : reaction,
          ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
        }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      toast.error("Couldn't save your reaction — try again")
    }
  }

  function setReactionAndPersist(next: ClientReaction | null) {
    const value = next === reaction ? null : next
    setReaction(value)
    persist({ reaction: value })
  }

  function onCommentChange(v: string) {
    setComment(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persist({ comment: v.slice(0, COMMENT_MAX) || null })
    }, COMMENT_DEBOUNCE_MS)
  }

  function onCommentBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist({ comment: comment.slice(0, COMMENT_MAX) || null })
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12.5px] font-medium text-foreground">What do you think?</span>
        <ReactionButton
          active={reaction === 'love'}
          onClick={() => setReactionAndPersist('love')}
          variant="love"
        >
          ♥ Love it
        </ReactionButton>
        <ReactionButton
          active={reaction === 'pass'}
          onClick={() => setReactionAndPersist('pass')}
          variant="pass"
        >
          ✕ Pass
        </ReactionButton>
      </div>

      <textarea
        value={comment}
        onChange={e => onCommentChange(e.target.value)}
        onBlur={onCommentBlur}
        placeholder="Optional: tell your agent what you liked or didn't"
        rows={2}
        maxLength={COMMENT_MAX}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13.5px] leading-relaxed placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:outline-none transition-colors"
      />
    </div>
  )
}

function ReactionButton({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean
  onClick: () => void
  variant: 'love' | 'pass'
  children: React.ReactNode
}) {
  const base = 'inline-flex items-center rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors'
  if (active) {
    if (variant === 'love')
      return <button onClick={onClick} className={`${base} border-primary bg-primary text-primary-foreground`}>{children}</button>
    return <button onClick={onClick} className={`${base} border-stone-400 bg-stone-200 text-stone-700`}>{children}</button>
  }
  return (
    <button onClick={onClick} className={`${base} border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground`}>
      {children}
    </button>
  )
}
