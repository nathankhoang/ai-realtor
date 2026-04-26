import type { Metadata } from 'next'

/**
 * All /dashboard routes are authenticated. Marking them noindex here
 * prevents search engines from trying to index sign-in redirects or
 * cached snapshots of UI shells.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
