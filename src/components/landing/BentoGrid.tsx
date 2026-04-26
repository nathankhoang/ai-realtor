'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

export function BentoGrid() {
  return (
    <section id="features" className="bg-surface py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-brand-slate">
            Features
          </p>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-foreground md:text-5xl">
            Built around how realtors
            <br />
            <span className="text-brand-slate-light">actually work.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-6 md:grid-rows-2">
          <BentoCard
            className="md:col-span-4 md:row-span-2"
            eyebrow="Photo-level vision"
            title="See every detail your client cares about — flagged on the photo."
            body="Hardwood vs vinyl plank. Quartz vs laminate. Open vs galley. Eifara reads every listing photo and surfaces the evidence so you can defend every recommendation."
          >
            <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-stone-200 to-stone-300">
              <FauxRoom />
            </div>
          </BentoCard>

          <BentoCard
            className="md:col-span-2"
            eyebrow="Plain English"
            title="No filters. Just words."
            body="Type a sentence, paste a wishlist, or pick from the checklist."
          >
            <div className="rounded-xl border border-brand-line bg-background p-4 font-mono text-[13px] leading-[1.7] text-foreground">
              <span className="text-[color:var(--brand-deep)]">{'>'}</span> updated kitchen,
              <br />
              hardwood floors, no HOA,
              <br />
              budget around $500k
            </div>
          </BentoCard>

          <BentoCard
            className="md:col-span-2"
            eyebrow="Match score"
            title="One number. Real reasoning."
            body="Every listing scored 0–100 with line-item evidence."
          >
            <div className="flex items-center justify-center gap-3">
              {[92, 88, 67].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ scale: 0.85, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold tabular-nums"
                  style={
                    s >= 85
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--brand-deep) 8%, transparent)',
                          color: 'var(--brand-deep)',
                          boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-deep) 40%, transparent)',
                        }
                      : s >= 70
                        ? {
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            boxShadow: 'inset 0 0 0 1.5px rgba(15,14,10,0.18)',
                          }
                        : {
                            backgroundColor: 'var(--background)',
                            color: 'rgba(15,14,10,0.45)',
                            boxShadow: 'inset 0 0 0 1.5px rgba(15,14,10,0.10)',
                          }
                  }
                >
                  {s}
                </motion.div>
              ))}
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  )
}

function BentoCard({
  className,
  eyebrow,
  title,
  body,
  children,
}: {
  className?: string
  eyebrow: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-brand-line bg-white p-7 transition-shadow duration-500 hover:shadow-[0_25px_60px_-20px_rgba(15,14,10,0.18)] ${className ?? ''}`}
    >
      <div>
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-brand-slate">
          {eyebrow}
        </p>
        <h3 className="mb-3 text-2xl font-medium tracking-[-0.01em] text-foreground">{title}</h3>
        <p className="text-[15.5px] leading-[1.6] text-brand-slate">{body}</p>
      </div>
      {children && <div className="mt-6">{children}</div>}
    </motion.div>
  )
}

function FauxRoom() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-stone-700 via-stone-600 to-stone-800" />
      <div
        className="absolute right-0 top-0 h-full w-2/5 blur-2xl"
        style={{
          backgroundImage:
            'radial-gradient(circle at top right, rgba(254,215,170,0.4), transparent 65%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-stone-900/80 to-transparent" />
      {[
        { x: '20%', y: '45%', t: 'Quartz · photo 2', d: 0.2 },
        { x: '65%', y: '70%', t: 'Hardwood · photo 1', d: 0.6 },
        { x: '50%', y: '25%', t: 'High ceilings · photo 9', d: 1.0 },
      ].map((l) => (
        <motion.div
          key={l.t}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.4, delay: l.d }}
          className="absolute"
          style={{ left: l.x, top: l.y }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full ring-2"
              style={{ backgroundColor: 'var(--brand-deep)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--brand-deep) 18%, transparent)' }}
            />
            <span
              className="whitespace-nowrap rounded-md border bg-stone-950/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md"
              style={{ borderColor: 'color-mix(in srgb, var(--brand-light) 50%, transparent)' }}
            >
              <span style={{ color: 'var(--brand-light)' }}>✓</span> {l.t}
            </span>
          </div>
        </motion.div>
      ))}
    </>
  )
}
