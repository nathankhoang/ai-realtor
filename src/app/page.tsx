import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold tracking-tight text-neutral-900">Eifara</span>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/pricing" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Pricing</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="text-sm text-neutral-600 hover:text-neutral-900 px-3 py-1.5 transition-colors rounded-md hover:bg-neutral-100">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="h-8">Get started free</Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-[#07071A] text-white overflow-hidden">
        {/* subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:72px_72px]" />
        {/* glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3.5 py-1 text-xs text-indigo-300 font-medium mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-powered for real estate agents
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            Stop guessing which homes<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              your clients will love
            </span>
          </h1>

          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-9 leading-relaxed">
            Describe what your client wants in plain English. Eifara searches Zillow, analyzes every listing photo with AI, and ranks homes by how well they match — with evidence like{' '}
            <span className="text-neutral-200 italic">"quartz countertops confirmed in photo 2."</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <SignUpButton mode="modal">
              <Button size="lg" className="h-12 px-7 text-base">
                Start for free →
              </Button>
            </SignUpButton>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/20">
                See pricing
              </Button>
            </Link>
          </div>
          <p className="text-xs text-neutral-500">3 free searches · No credit card required</p>
        </div>

        {/* ── PRODUCT MOCKUP ── */}
        <div className="relative max-w-3xl mx-auto px-6 pb-0">
          <div className="rounded-t-xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-900/20">
            {/* browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-neutral-700" />
              <div className="w-3 h-3 rounded-full bg-neutral-700" />
              <div className="w-3 h-3 rounded-full bg-neutral-700" />
              <div className="flex-1 mx-3 h-5 bg-neutral-800 rounded-full text-[10px] text-neutral-500 flex items-center px-3">
                eifara.com/results/austin-tx
              </div>
            </div>

            {/* results UI mockup */}
            <div className="bg-neutral-950 p-4 space-y-3">
              {/* header bar */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">Austin TX</p>
                  <p className="text-[11px] text-neutral-400 max-w-xs">Updated kitchen, hardwood floors, open floor plan, no HOA, natural light</p>
                  <div className="flex gap-3 mt-1 text-[11px]">
                    <span className="text-white font-medium">12 strong matches</span>
                    <span className="text-neutral-500">20 analyzed</span>
                    <span className="text-neutral-500">180 more available</span>
                  </div>
                </div>
                <div className="text-[11px] text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 rounded-md px-2.5 py-1.5 whitespace-nowrap cursor-default">
                  Analyze next 10
                </div>
              </div>

              {/* listing 1 */}
              <div className="bg-neutral-900 rounded-lg border border-white/5 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-neutral-600 font-mono mt-0.5 w-4 shrink-0">#1</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">7909 Edmondson Bnd</p>
                        <p className="text-[11px] text-neutral-400">Austin, TX · $474,990 · 4 bd · 4 ba · 2,508 sqft</p>
                      </div>
                      <div className="border rounded-md px-2 py-0.5 text-center shrink-0 bg-emerald-500/10 border-emerald-500/25">
                        <span className="text-xl font-bold text-emerald-400 leading-none">92</span>
                        <span className="text-[9px] text-neutral-500">/100</span>
                      </div>
                    </div>
                    {/* photo strip */}
                    <div className="flex gap-1 mt-2">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="flex-1 h-12 bg-neutral-700/60 rounded-sm relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-neutral-600/20 to-neutral-800/20" />
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] text-neutral-400 bg-black/40 px-1 rounded">{i+1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[11px] text-neutral-300"><span className="text-emerald-400 mr-1">✓</span>Quartz countertops confirmed · <span className="text-neutral-500">photo 2</span></p>
                      <p className="text-[11px] text-neutral-300"><span className="text-emerald-400 mr-1">✓</span>Hardwood floors throughout · <span className="text-neutral-500">photo 1</span></p>
                      <p className="text-[11px] text-neutral-300"><span className="text-emerald-400 mr-1">✓</span>High ceilings with clerestory windows · <span className="text-neutral-500">photo 9</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* listing 2 — partial */}
              <div className="bg-neutral-900 rounded-lg border border-white/5 p-3 opacity-70">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-neutral-600 font-mono mt-0.5 w-4 shrink-0">#2</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">2605 Loyola Ln</p>
                        <p className="text-[11px] text-neutral-400">Austin, TX · $620,000 · 4 bd · 3 ba · 3,178 sqft</p>
                      </div>
                      <div className="border rounded-md px-2 py-0.5 text-center shrink-0 bg-emerald-500/10 border-emerald-500/25">
                        <span className="text-xl font-bold text-emerald-400 leading-none">88</span>
                        <span className="text-[9px] text-neutral-500">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="border-b border-neutral-100 bg-neutral-50 py-5">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-x-10 gap-y-2">
          {[
            ['40+', 'home features detected per listing'],
            ['200+', 'listings analyzed in minutes'],
            ['Photo-level', 'evidence for every match'],
            ['Plain English', 'client requirements — no filters needed'],
          ].map(([stat, label]) => (
            <div key={stat} className="flex items-center gap-2 text-sm">
              <span className="font-bold text-indigo-600">{stat}</span>
              <span className="text-neutral-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Why Eifara</p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">Built around how realtors actually work</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.127 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                ),
                title: 'Plain-English Requirements',
                desc: "Paste your client's wishlist or use the checklist. Eifara understands nuance — \"updated kitchen but doesn't need a pool\" works exactly as you'd expect.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                ),
                title: 'Photo-Level Analysis',
                desc: 'AI scans every listing photo and identifies hardwood floors, granite countertops, high ceilings, and more — even when the listing description misses it or gets it wrong.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                ),
                title: 'Ranked with Evidence',
                desc: 'Every result has a match score and specific photo callouts — "Floors: vinyl plank · photo 8", "Countertops: quartz · photo 2". Show your clients exactly why each home was ranked.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="group p-6 rounded-xl border border-neutral-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all">
                <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  {icon}
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">The process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">From client brief to ranked shortlist</h2>
            <p className="text-neutral-500 mt-3 max-w-lg mx-auto">What used to take hours — manually browsing Zillow, filtering, checking photos — now takes minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(33%-1px)] right-[calc(33%-1px)] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200" />

            {[
              { step: '01', title: 'Describe your client', desc: "Type what they're looking for — or pick from the 40-feature checklist. Budget, beds, baths, and style preferences all count." },
              { step: '02', title: 'Eifara does the work', desc: 'We pull the best Zillow matches, run AI photo analysis on every listing, and score each one against your client\'s exact requirements.' },
              { step: '03', title: 'Review & share results', desc: "Browse ranked results with photo evidence for every feature. Save favorites to a client profile and share a link for their review." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-xl border border-neutral-200 p-6 relative text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">Start free, scale when you need to</h2>
          <p className="text-neutral-500 mb-10">No contracts. Cancel anytime.</p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Free', price: '$0', period: 'forever', searches: '3 searches / month', features: ['AI photo analysis', 'Feature evidence grid', 'Client management'], cta: 'Get started', highlight: false },
              { name: 'Starter', price: '$50', period: 'per month', searches: '20 searches / month', features: ['Everything in Free', 'Priority analysis', 'Shareable client reports', 'Email support'], cta: 'Start Starter', highlight: true },
              { name: 'Pro', price: '$150', period: 'per month', searches: 'Unlimited searches', features: ['Everything in Starter', 'Unlimited searches', 'Early feature access', 'Priority support'], cta: 'Go Pro', highlight: false },
            ].map(({ name, price, period, searches, features, cta, highlight }) => (
              <div key={name} className={`rounded-xl border p-6 text-left relative ${highlight ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-100' : 'border-neutral-200'}`}>
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">Most popular</div>
                )}
                <div className="mb-4">
                  <p className="font-semibold text-neutral-900">{name}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-neutral-900">{price}</span>
                    <span className="text-sm text-neutral-500">{period}</span>
                  </div>
                  <p className="text-xs text-indigo-600 font-medium mt-1">{searches}</p>
                </div>
                <ul className="space-y-1.5 mb-5">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                      <span className="text-indigo-500 shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <SignUpButton mode="modal">
                  <Button className={`w-full ${highlight ? '' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`} variant={highlight ? 'default' : 'outline'}>
                    {cta}
                  </Button>
                </SignUpButton>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-neutral-400">
            Annual plans save 2 months — <Link href="/pricing" className="text-indigo-600 hover:underline">see full pricing</Link>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-6 bg-[#07071A]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="absolute left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative">
            Ready to stop wasting hours<br />on the wrong homes?
          </h2>
          <p className="text-neutral-400 mb-8 relative">Start with 3 free searches. No credit card needed.</p>
          <SignUpButton mode="modal">
            <Button size="lg" className="h-12 px-8 text-base relative">
              Start for free →
            </Button>
          </SignUpButton>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#07071A] border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <span className="font-semibold text-neutral-300">Eifara</span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-neutral-300 transition-colors">Pricing</Link>
          </div>
          <span>© 2026 Eifara. All rights reserved.</span>
        </div>
      </footer>

    </div>
  )
}
