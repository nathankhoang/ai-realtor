import PricingCards from '@/app/pricing/PricingCards'
import { PLANS } from '@/lib/plans'

export function PricingTeaser() {
  return (
    <section id="pricing" className="bg-background py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            Pricing
          </div>
          <h2 className="font-display text-[clamp(2.125rem,5vw,3.75rem)] font-black tracking-[-0.03em] leading-[1.05] text-foreground">
            Plain pricing. <span className="text-brand-gradient">Start free.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            No credit card to begin. No per-photo fees. Cancel any time, keep your client profiles.
          </p>
        </div>

        <div className="grid gap-4">
          <PricingCards plans={PLANS} currentTier={null} signedIn={false} featuredTier="pro" featuredLabel="Most popular" />
        </div>
      </div>
    </section>
  )
}
