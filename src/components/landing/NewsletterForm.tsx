'use client'

import { useState } from 'react'

/**
 * "Field notes" newsletter signup card. Coming-soon stub — submitting just
 * swaps the button label, no backend wired yet. Lifted into its own client
 * component so the parent footer can stay in the server tree.
 */
export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false)
  const [value, setValue] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!value.trim()) return
        setSubmitted(true)
        setValue('')
      }}
      className="mt-4 flex gap-2 rounded-[12px] bg-background p-1.5"
    >
      <input
        type="email"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="you@brokerage.com — get notified"
        className="flex-1 bg-transparent border-none outline-none text-[14px] text-foreground placeholder:text-brand-slate-light px-3 py-2"
      />
      <button
        type="submit"
        disabled={submitted}
        className="rounded-[8px] px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-[1px] disabled:opacity-90"
        style={{
          background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))',
          boxShadow: '0 4px 12px -4px color-mix(in srgb, var(--brand-deep) 50%, transparent)',
        }}
      >
        {submitted ? 'We’ll be in touch ✓' : 'Notify me'}
      </button>
    </form>
  )
}
