import type { Metadata } from 'next'

/**
 * Public client-share reports use unique tokens in the URL. We never
 * want Google to index them — that would leak private buyer info into
 * search results.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children
}
