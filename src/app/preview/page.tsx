import type { Metadata } from 'next'
import Link from 'next/link'
import { SCHEMES } from './schemes'

export const metadata: Metadata = {
  title: 'Color scheme previews',
  robots: { index: false, follow: false },
}

export default function PreviewIndex() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 h-14">
          <Link href="/" className="text-[17px] font-medium tracking-tight">
            Eifara — preview
          </Link>
          <Link href="/" className="text-[14px] text-stone-500 hover:text-stone-900 transition-colors">
            ← Back to live site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Color scheme exploration
          </p>
          <h1 className="mt-2 text-[36px] font-medium tracking-[-0.025em] leading-[1.1]">
            Five palettes, one landing page.
          </h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-stone-600">
            Same hero, stats, problem strip, feature cards, and CTA — rendered in five distinct
            palettes. Click into each to see it full-size; use the bar at the top of every preview
            to flip between them.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {SCHEMES.map(s => (
            <li key={s.id}>
              <Link
                href={`/preview/${s.id}`}
                className="group block rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_18px_40px_-20px_rgba(15,14,10,0.20)]"
              >
                {/* Color swatches */}
                <div
                  className="mb-4 flex h-32 w-full overflow-hidden rounded-xl"
                  style={{ background: s.bg }}
                >
                  <div className="flex-1 flex items-end p-3 gap-1.5">
                    <span
                      className="h-7 w-7 rounded-full"
                      style={{ background: s.fg }}
                      aria-label="foreground"
                    />
                    <span
                      className="h-7 w-7 rounded-full"
                      style={{ background: s.accent }}
                      aria-label="accent"
                    />
                    <span
                      className="h-7 w-7 rounded-full"
                      style={{ background: s.accent2 }}
                      aria-label="secondary accent"
                    />
                    <span
                      className="h-7 w-7 rounded-full border"
                      style={{ background: s.card, borderColor: s.border }}
                      aria-label="card"
                    />
                  </div>
                </div>
                <p className="text-[11.5px] font-mono uppercase tracking-[0.18em] text-stone-500">
                  Scheme #{s.id}
                </p>
                <h2 className="mt-1 text-[19px] font-medium tracking-[-0.012em] group-hover:text-[#2952FF] transition-colors">
                  {s.name}
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-stone-600">
                  {s.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-[13px] text-stone-500">
          These previews are noindex and live alongside production at <code className="text-stone-700">/preview/[id]</code>.
          Once we pick one, I&rsquo;ll wire it into the real site (or delete the route entirely).
        </p>
      </main>
    </div>
  )
}
