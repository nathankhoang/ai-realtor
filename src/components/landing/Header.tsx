import Link from 'next/link'
import Logo from './Logo'
import { SignInTrigger, SignUpTrigger } from './AuthButtons'

const NAV_ITEMS: [string, string][] = [
  ['How it works', '/#how'],
  ['Features', '/#features'],
  ['Pricing', '/pricing'],
  ['Blog', '/blog'],
  ['FAQ', '/#faq'],
]

/**
 * Shared sticky frosted-glass nav. Used by the landing page, blog routes,
 * and any other unauthenticated marketing page. Auth state isn't read here —
 * the AuthButton triggers route to /sign-in or /sign-up if the user isn't
 * signed in, and the auth provider handles the rest.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-line bg-background/80 backdrop-blur-xl saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="flex items-center gap-6 md:gap-9 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Logo />
            <span className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-foreground">Eifara</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map(([t, href]) => (
              <Link
                key={t}
                href={href}
                className="group relative text-[14px] font-medium text-foreground transition-colors hover:text-brand-deep"
              >
                {t}
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-brand-gradient transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <SignInTrigger>Sign in</SignInTrigger>
          <SignUpTrigger size="sm" tone="accent">
            Start free
          </SignUpTrigger>
        </div>
      </div>
    </header>
  )
}
