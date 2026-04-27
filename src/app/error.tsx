'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-deep"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-brand-line px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
