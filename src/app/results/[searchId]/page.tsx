import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { searches, searchResults, listings, listingAnalyses, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingFeatures, FeatureEvidence } from '@/types'
import NextBatchButton from './NextBatchButton'

export default async function ResultsPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) redirect('/')

  const search = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!search) notFound()

  const rows = await db
    .select({
      result: searchResults,
      listing: listings,
      analysis: listingAnalyses,
    })
    .from(searchResults)
    .innerJoin(listings, eq(searchResults.listingId, listings.id))
    .leftJoin(listingAnalyses, eq(listingAnalyses.listingId, listings.id))
    .where(eq(searchResults.searchId, searchId))

  rows.sort((a, b) => b.result.matchScore - a.result.matchScore)

  const analyzed = search.analyzedCount ?? 0
  const total = search.totalCandidates ?? 0

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-5">
        {/* Search summary bar */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">{search.location}</h1>
            {search.requirementsText && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg line-clamp-1">{search.requirementsText}</p>
            )}
            <div className="flex flex-wrap gap-x-3 mt-1.5 text-xs text-muted-foreground">
              {search.priceMax && <span>≤ ${search.priceMax.toLocaleString()}</span>}
              {search.bedsMin && <span>{search.bedsMin}+ bd</span>}
              {search.bathsMin && <span>{search.bathsMin}+ ba</span>}
              <span className="text-foreground font-medium">{rows.length} analyzed</span>
              {total > analyzed && <span className="text-muted-foreground">{total - analyzed} more available</span>}
            </div>
          </div>
          <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No results yet. Analysis may still be in progress.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map(({ result, listing, analysis }, index) => {
              const features = analysis?.featuresJson as ListingFeatures | null
              const photos = (listing.photoUrls ?? []) as string[]
              const score = Math.round(result.matchScore * 100)
              return (
                <ListingCard
                  key={result.id}
                  rank={index + 1}
                  score={score}
                  address={listing.address}
                  city={listing.city ?? ''}
                  state={listing.state ?? ''}
                  price={listing.price}
                  beds={listing.beds}
                  baths={listing.baths}
                  sqft={listing.sqft}
                  photos={photos}
                  explanation={result.matchExplanation ?? ''}
                  features={features}
                  zillowId={listing.zillowId}
                />
              )
            })}
          </div>
        )}

        {total > analyzed && (
          <div className="flex justify-center pt-2">
            <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
          </div>
        )}
      </main>
    </div>
  )
}

function ListingCard({
  rank, score, address, city, state, price, beds, baths, sqft,
  photos, explanation, features, zillowId,
}: {
  rank: number
  score: number
  address: string
  city: string
  state: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  photos: string[]
  explanation: string
  features: ListingFeatures | null
  zillowId: string
}) {
  const scoreColor =
    score >= 80 ? 'text-green-400' :
    score >= 60 ? 'text-amber-400' :
    'text-rose-400'
  const scoreBg =
    score >= 80 ? 'bg-green-950/40 border-green-800/50' :
    score >= 60 ? 'bg-amber-950/40 border-amber-800/50' :
    'bg-rose-950/40 border-rose-800/50'

  return (
    <Card className="overflow-hidden border-border/50">
      {/* ── Top row: rank / address / score ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className="text-xs text-muted-foreground font-mono pt-0.5 w-5 shrink-0">#{rank}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-snug truncate">{address}</p>
              <p className="text-xs text-muted-foreground">{[city, state].filter(Boolean).join(', ')}</p>
            </div>
            {/* Score badge */}
            <div className={`border rounded-md px-2.5 py-1 text-center shrink-0 ${scoreBg}`}>
              <span className={`text-xl font-bold leading-none ${scoreColor}`}>{score}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1.5 text-xs">
            {price && <span className="font-semibold text-foreground">${price.toLocaleString()}</span>}
            {beds && <span className="text-muted-foreground">{beds} bd</span>}
            {baths && <span className="text-muted-foreground">{baths} ba</span>}
            {sqft && <span className="text-muted-foreground">{sqft.toLocaleString()} sqft</span>}
            <a
              href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 ml-auto"
            >
              Zillow →
            </a>
          </div>
        </div>
      </div>

      {/* ── Photos ── */}
      {photos.length > 0 && (
        <div className="flex gap-0.5 px-4 pb-3">
          {photos.slice(0, 4).map((url, i) => (
            <div key={i} className="relative flex-1 min-w-0">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-sm" />
              <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded-sm leading-4">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Match explanation ── */}
      {explanation && (
        <div className="px-4 pb-3">
          <p className="text-xs leading-relaxed text-foreground/80">{explanation}</p>
        </div>
      )}

      {/* ── Feature evidence 2-col grid ── */}
      {features && <FeatureGrid features={features} />}

      {/* ── Notes footer ── */}
      {features?.notes && (
        <div className="px-4 py-2 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            <span className="font-medium text-muted-foreground/70 uppercase tracking-wide text-[10px] mr-1">Notes</span>
            <WithYears text={features.notes} />
          </p>
        </div>
      )}
    </Card>
  )
}

type AnyEvidence = FeatureEvidence & { type?: string; height?: string }

const FEATURE_ROWS: { label: string; key: keyof ListingFeatures }[] = [
  { label: 'Floors', key: 'floors' },
  { label: 'Countertops', key: 'kitchenCountertops' },
  { label: 'Appliances', key: 'kitchenAppliances' },
  { label: 'Cabinets', key: 'kitchenCabinets' },
  { label: 'Bathrooms', key: 'bathrooms' },
  { label: 'Ceilings', key: 'ceilings' },
  { label: 'Windows', key: 'windows' },
  { label: 'Natural light', key: 'naturalLight' },
]

function FeatureGrid({ features }: { features: ListingFeatures }) {
  const visible = FEATURE_ROWS
    .map(({ label, key }) => ({ label, ev: features[key] as AnyEvidence | undefined }))
    .filter(r => r.ev?.condition && r.ev.condition !== 'unknown')

  if (visible.length === 0) return null

  // Split into 2 columns
  const mid = Math.ceil(visible.length / 2)
  const left = visible.slice(0, mid)
  const right = visible.slice(mid)

  return (
    <div className="mx-4 mb-3 rounded border border-border/40 overflow-hidden text-xs">
      <div className="px-3 py-1 bg-muted/20 border-b border-border/30">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Feature evidence</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/30">
        <FeatureCol rows={left} />
        <FeatureCol rows={right} />
      </div>
    </div>
  )
}

function FeatureCol({ rows }: { rows: { label: string; ev: AnyEvidence }[] }) {
  return (
    <div className="divide-y divide-border/20">
      {rows.map(({ label, ev }) => {
        const icon =
          ev.condition === 'updated' ? '✓' :
          ev.condition === 'poor' ? '✗' : '·'
        const iconColor =
          ev.condition === 'updated' ? 'text-green-400' :
          ev.condition === 'poor' ? 'text-rose-400' :
          'text-muted-foreground'
        const qualifier = ev.type || ev.height
        const photoRef = ev.photoIndex != null ? `photo ${ev.photoIndex + 1}` : null

        return (
          <div key={label} className="px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`shrink-0 font-bold ${iconColor}`}>{icon}</span>
              <span className="text-muted-foreground w-20 shrink-0">{label}</span>
              <span className="font-medium capitalize text-foreground/90 truncate">
                {qualifier ? `${qualifier}` : ev.condition}
              </span>
              {photoRef && (
                <span className="text-blue-400 shrink-0 ml-auto pl-1">·{photoRef}</span>
              )}
            </div>
            {ev.detail && (
              <p className="text-[11px] text-muted-foreground pl-5 mt-0.5 line-clamp-2">
                <WithYears text={ev.detail} />
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Highlights 4-digit years (e.g. 2022) in amber
function WithYears({ text }: { text: string }) {
  const parts = text.split(/(\b(?:19|20)\d{2}\b)/)
  return (
    <>
      {parts.map((part, i) =>
        /^\d{4}$/.test(part)
          ? <span key={i} className="text-amber-400 font-semibold">{part}</span>
          : part
      )}
    </>
  )
}
