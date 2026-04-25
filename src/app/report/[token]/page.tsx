import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { clients, savedListings, listings, listingAnalyses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { ListingFeatures, FeatureEvidence } from '@/types'

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const client = await db.query.clients.findFirst({
    where: eq(clients.shareToken, token),
  })
  if (!client) notFound()

  const saved = await db
    .select({ saved: savedListings, listing: listings, analysis: listingAnalyses })
    .from(savedListings)
    .innerJoin(listings, eq(savedListings.listingId, listings.id))
    .leftJoin(listingAnalyses, eq(listingAnalyses.listingId, listings.id))
    .where(eq(savedListings.clientId, client.id))
    .orderBy(savedListings.savedAt)

  const initials = client.name
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[17px] font-medium tracking-tight">Eifara</span>
          <span className="text-[12.5px] font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">Client report</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Client header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary text-[20px] font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl font-medium tracking-tight">{client.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[14px] text-muted-foreground">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
            </div>
            {client.notes && (
              <p className="mt-3 text-[15px] text-muted-foreground max-w-lg leading-relaxed">{client.notes}</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 text-[15px] text-muted-foreground border-b border-border pb-7">
          <span className="font-semibold text-foreground text-2xl tabular-nums">{saved.length}</span>
          <span>home{saved.length !== 1 ? 's' : ''} selected by your agent</span>
        </div>

        {/* Listings */}
        {saved.length === 0 ? (
          <p className="text-[15px] text-muted-foreground py-10 text-center">No saved homes yet — check back soon.</p>
        ) : (
          <div className="space-y-8">
            {saved.map(({ saved: s, listing, analysis }, index) => {
              const photos = (listing.photoUrls ?? []) as string[]
              const features = analysis?.featuresJson as ListingFeatures | null
              return (
                <ReportListingCard
                  key={s.id}
                  rank={index + 1}
                  photos={photos}
                  address={listing.address}
                  city={listing.city ?? ''}
                  state={listing.state ?? ''}
                  price={listing.price}
                  beds={listing.beds}
                  baths={listing.baths}
                  sqft={listing.sqft}
                  zillowId={listing.zillowId}
                  features={features}
                  agentNote={s.notes ?? null}
                />
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center space-y-1">
          <p className="text-[13px] text-muted-foreground">Prepared by your agent using Eifara</p>
          <p className="text-[13px] text-muted-foreground">AI-powered home search · photo-level match analysis</p>
        </div>
      </main>
    </div>
  )
}

function ReportListingCard({
  rank, photos, address, city, state, price, beds, baths, sqft,
  zillowId, features, agentNote,
}: {
  rank: number
  photos: string[]
  address: string
  city: string
  state: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  zillowId: string
  features: ListingFeatures | null
  agentNote: string | null
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      {/* Hero photo */}
      {photos[0] && (
        <div className="relative">
          <img src={photos[0]} alt="" className="w-full h-56 sm:h-72 object-cover" />
          <div className="absolute top-3 left-3 bg-black/65 text-white text-[12.5px] font-semibold px-3 py-1 rounded-full backdrop-blur-md">
            #{rank}
          </div>
        </div>
      )}

      {/* Secondary photos */}
      {photos.length > 1 && (
        <div className="flex gap-0.5">
          {photos.slice(1, 5).map((url, i) => (
            <div key={i} className="flex-1">
              <img src={url} alt="" className="w-full h-20 object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Address + price */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-xl leading-snug tracking-tight">{address}</h2>
            <p className="text-[14px] text-muted-foreground mt-1">{[city, state].filter(Boolean).join(', ')}</p>
          </div>
          {price && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-semibold tabular-nums tracking-tight">${price.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted-foreground">
          {beds && <span>{beds} bedrooms</span>}
          {baths && <span>{baths} bathrooms</span>}
          {sqft && <span className="tabular-nums">{sqft.toLocaleString()} sqft</span>}
        </div>

        {/* Agent note */}
        {agentNote && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3.5">
            <p className="text-[11.5px] font-semibold text-primary uppercase tracking-[0.16em] mb-1.5">Agent note</p>
            <p className="text-[15px] leading-relaxed">{agentNote}</p>
          </div>
        )}

        {/* Feature highlights */}
        {features && <FeatureHighlights features={features} />}

        {/* AI notes */}
        {features?.notes && (
          <p className="text-[14px] text-muted-foreground border-l-2 border-border pl-3 leading-relaxed">{features.notes}</p>
        )}

        <a
          href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View full listing on Zillow →
        </a>
      </div>
    </div>
  )
}

type AnyEvidence = FeatureEvidence & { type?: string; height?: string }

function FeatureHighlights({ features }: { features: ListingFeatures }) {
  const featureKeys: { label: string; key: keyof ListingFeatures }[] = [
    { label: 'Floors', key: 'floors' },
    { label: 'Kitchen countertops', key: 'kitchenCountertops' },
    { label: 'Appliances', key: 'kitchenAppliances' },
    { label: 'Bathrooms', key: 'bathrooms' },
    { label: 'Ceilings', key: 'ceilings' },
    { label: 'Natural light', key: 'naturalLight' },
  ]

  const items = featureKeys
    .map(({ label, key }) => {
      const ev = features[key] as AnyEvidence | undefined
      if (!ev || ev.condition === 'unknown') return null
      return { label, value: ev.type || ev.height || ev.condition, good: ev.condition === 'updated' }
    })
    .filter(Boolean) as { label: string; value: string; good: boolean }[]

  if (items.length === 0) return null

  return (
    <div>
      <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-[0.16em] mb-3">What we found</p>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 text-[14px]">
            <span className={item.good ? 'text-primary' : 'text-muted-foreground'}>
              {item.good ? '✓' : '·'}
            </span>
            <span className="text-muted-foreground">{item.label}:</span>
            <span className="font-medium capitalize truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
