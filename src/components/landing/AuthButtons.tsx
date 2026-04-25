'use client'

import { useClerk } from '@clerk/nextjs'
import { PrimaryButton } from './PrimaryButton'

export function SignInTrigger({ children }: { children: React.ReactNode }) {
  const { openSignIn } = useClerk()
  return (
    <button
      onClick={() => openSignIn()}
      className="rounded-full px-4 py-1.5 text-sm font-medium text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-950"
    >
      {children}
    </button>
  )
}

export function SignUpTrigger({
  children,
  tone = 'dark',
  size = 'md',
}: {
  children: React.ReactNode
  tone?: 'dark' | 'light' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}) {
  const { openSignUp } = useClerk()
  return (
    <PrimaryButton onClick={() => openSignUp()} tone={tone} size={size}>
      {children}
    </PrimaryButton>
  )
}

export function PricingCTA({
  children,
  highlighted,
}: {
  children: React.ReactNode
  highlighted: boolean
}) {
  const { openSignUp } = useClerk()
  return (
    <PrimaryButton
      onClick={() => openSignUp()}
      tone={highlighted ? 'accent' : 'dark'}
      size="md"
      className="w-full justify-between"
    >
      {children}
    </PrimaryButton>
  )
}
