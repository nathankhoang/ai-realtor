import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { searches, searchResults, listings, listingAnalyses, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ListingFeatures } from '@/types'
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

  const results = await db
    .select({
      result: searchResults,
      listing: listings,
      analysis: listingAnalyses,
    })
    .from(searchResults)
    .innerJoin(listings, eq(searchResults.listingId, listings.id))
    .leftJoin(listingAnalyses, eq(listingAnalyses.listingId, listings.id))
    .where(eq(searchResults.searchId, searchId))
    .orderBy(searchResults.matchScore)

  results.sort((a, b) => b.result.matchScore - a.result.matchScore)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
            </div>
            <h1 className="text-2xl font-bold mt-2">{search.location}</h1>
            {search.requirementsText && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl line-clamp-2">{search.requirementsText}</p>
            )}
            <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
              {search.priceMax && <span>Up to ${search.priceMax.toLocaleString()}</span>}
              {search.bedsMin && <span>{search.bedsMin}+ beds</span>}
              {search.bathsMin && <span>{search.bathsMin}+ baths</span>}
              <span>{results.length} results</span>
            </div>
          </div>
          <NextBatchButton searchId={searchId} analyzedCount={search.analyzedCount ?? 0} totalCandidates={search.totalCandidates ?? 0} />
        </div>

        {results.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No results yet. Analysis may still be in progress.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map(({ result, listing, analysis }) => {
              const features = analysis?.featuresJson as ListingFeatures | null
              const photos = (listing.photoUrls ?? []) as string[]
              const score = Math.round(result.matchScore * 100)

              return (
                <Card key={result.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {photos[0] && (
                      <div className="sm:w-56 sm:shrink-0">
                        <img
                          src={photos[0]}
                          alt={listing.address}
                          className="w-full h-40 sm:h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-base">{listing.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {[listing.city, listing.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <ScoreBadge score={score} />
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {listing.price && <span className="font-medium text-foreground">${listing.price.toLocaleString()}</span>}
                        {listing.beds && <span>{listing.beds} bd</span>}
                        {listing.baths && <span>{listing.baths} ba</span>}
                        {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                      </div>

                      {result.matchExplanation && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{result.matchExplanation}</p>
                      )}

                      {features && (
                        <FeatureHighlights features={features} />
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'outline'
  return <Badge variant={variant} className="shrink-0 text-sm px-2.5">{score}% match</Badge>
}

function FeatureHighlights({ features }: { features: ListingFeatures }) {
  const highlights: string[] = []

  if (features.floors?.condition === 'updated' || features.floors?.type?.toLowerCase().includes('hardwood')) {
    const photoRef = features.floors.photoIndex !== null ? ` · photo ${(features.floors.photoIndex ?? 0) + 1}` : ''
    highlights.push(`Floors: ${features.floors.type}${photoRef}`)
  }
  if (features.kitchenCountertops?.condition === 'updated') {
    const photoRef = features.kitchenCountertops.photoIndex !== null ? ` · photo ${(features.kitchenCountertops.photoIndex ?? 0) + 1}` : ''
    highlights.push(`Countertops: ${features.kitchenCountertops.type}${photoRef}`)
  }
  if (features.naturalLight?.condition === 'updated') {
    highlights.push('Good natural light')
  }
  if (features.ceilings?.height === 'high') {
    highlights.push('High ceilings')
  }
  if (features.overallAge === 'new' || features.overallAge === 'updated') {
    highlights.push('Updated home')
  }

  if (highlights.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {highlights.map((h, i) => (
        <span key={i} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {h}
        </span>
      ))}
    </div>
  )
}
