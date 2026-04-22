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
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
            <h1 className="text-2xl font-bold mt-2">{search.location}</h1>
            {search.requirementsText && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl line-clamp-2">{search.requirementsText}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
              {search.priceMax && <span>Up to ${search.priceMax.toLocaleString()}</span>}
              {search.bedsMin && <span>{search.bedsMin}+ beds</span>}
              {search.bathsMin && <span>{search.bathsMin}+ baths</span>}
              <span className="text-foreground font-medium">{rows.length} analyzed</span>
              {total > analyzed && <span>{total - analyzed} more available</span>}
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
          <div className="space-y-5">
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
  const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  const scoreBorder = score >= 80 ? 'border-green-900/60 bg-green-950/30' : score >= 60 ? 'border-amber-900/60 bg-amber-950/30' : 'border-red-900/60 bg-red-950/30'

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-sm text-muted-foreground font-mono mt-0.5 shrink-0">#{rank}</span>
          <div className="min-w-0">
            <p className="font-semibold text-base leading-snug truncate">{address}</p>
            <p className="text-sm text-muted-foreground">{[city, state].filter(Boolean).join(', ')}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-sm">
              {price && <span className="font-semibold text-foreground">${price.toLocaleString()}</span>}
              {beds && <span className="text-muted-foreground">{beds} bd</span>}
              {baths && <span className="text-muted-foreground">{baths} ba</span>}
              {sqft && <span className="text-muted-foreground">{sqft.toLocaleString()} sqft</span>}
            </div>
          </div>
        </div>
        <div className={`border rounded-lg px-3 py-2 text-center shrink-0 ${scoreBorder}`}>
          <div className={`text-2xl font-bold leading-none ${scoreColor}`}>{score}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">/ 100</div>
        </div>
      </div>

      {/* Photo strip */}
      {photos.length > 0 && (
        <div className="flex gap-1 px-5 pb-3">
          {photos.slice(0, 4).map((url, i) => (
            <div key={i} className="relative flex-1 min-w-0">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full h-28 object-cover rounded"
              />
              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded leading-4">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Match explanation */}
      {explanation && (
        <div className="px-5 pb-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{explanation}</p>
        </div>
      )}

      {/* Feature evidence */}
      {features && <FeatureGrid features={features} />}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between gap-4">
        {features?.notes ? (
          <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{features.notes}</p>
        ) : (
          <span />
        )}
        <a
          href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 shrink-0 whitespace-nowrap"
        >
          View on Zillow →
        </a>
      </div>
    </Card>
  )
}

type AnyEvidence = FeatureEvidence & { type?: string; height?: string }

function FeatureGrid({ features }: { features: ListingFeatures }) {
  const rows: { label: string; evidence: AnyEvidence }[] = [
    { label: 'Floors', evidence: features.floors },
    { label: 'Countertops', evidence: features.kitchenCountertops },
    { label: 'Appliances', evidence: features.kitchenAppliances },
    { label: 'Cabinets', evidence: features.kitchenCabinets },
    { label: 'Bathrooms', evidence: features.bathrooms },
    { label: 'Ceilings', evidence: features.ceilings },
    { label: 'Windows', evidence: features.windows },
    { label: 'Natural light', evidence: features.naturalLight },
  ].filter(r => r.evidence?.condition && r.evidence.condition !== 'unknown')

  if (rows.length === 0) return null

  return (
    <div className="mx-5 mb-3 rounded-lg border border-border/40 overflow-hidden text-sm">
      <div className="px-3 py-1.5 bg-muted/20 border-b border-border/40">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Feature evidence</span>
      </div>
      <div className="divide-y divide-border/20">
        {rows.map(({ label, evidence }) => {
          const condColor =
            evidence.condition === 'updated' ? 'text-green-400' :
            evidence.condition === 'poor' ? 'text-red-400' :
            'text-muted-foreground'
          const qualifier = evidence.type || evidence.height
          const photoRef = evidence.photoIndex != null ? `photo ${evidence.photoIndex + 1}` : null

          return (
            <div key={label} className="flex items-baseline gap-2 px-3 py-1.5">
              <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
              <span className={`capitalize font-medium ${condColor}`}>
                {qualifier ? `${qualifier}, ` : ''}{evidence.condition}
              </span>
              {evidence.detail && (
                <span className="text-muted-foreground text-xs flex-1 min-w-0 truncate">{evidence.detail}</span>
              )}
              {photoRef && (
                <span className="text-xs text-blue-400 shrink-0 ml-auto pl-2">· {photoRef}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
