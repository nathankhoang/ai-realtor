import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { users, clients, savedListings, listings, listingAnalyses, searches } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ListingFeatures } from '@/types'
import RemoveSavedButton from './RemoveSavedButton'
import ShareButton from './ShareButton'
import ListingNoteEditor from './ListingNoteEditor'
import ClientNotesEditor from './ClientNotesEditor'

export default async function ClientProfilePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) redirect('/')

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, dbUser.id)),
  })
  if (!client) notFound()

  const [saved, linkedSearches] = await Promise.all([
    db
      .select({ saved: savedListings, listing: listings, analysis: listingAnalyses })
      .from(savedListings)
      .innerJoin(listings, eq(savedListings.listingId, listings.id))
      .leftJoin(listingAnalyses, eq(listingAnalyses.listingId, listings.id))
      .where(eq(savedListings.clientId, clientId))
      .orderBy(savedListings.savedAt),
    db.query.searches.findMany({
      where: and(eq(searches.userId, dbUser.id), eq(searches.clientId, clientId)),
      orderBy: [desc(searches.createdAt)],
      limit: 10,
    }),
  ])

  const initials = client.name
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight">Eifara</Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Client header */}
        <div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Dashboard</Link>
          <div className="flex items-start gap-4 mt-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary text-lg font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold">{client.name}</h1>
                <div className="flex items-center gap-2 shrink-0">
                  {client.shareToken && (
                    <Link href={`/report/${client.shareToken}`} target="_blank">
                      <Button size="sm" variant="outline" className="text-xs">Preview report</Button>
                    </Link>
                  )}
                  <ShareButton clientId={clientId} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-muted-foreground">
                {client.email && <span>{client.email}</span>}
                {client.phone && <span>{client.phone}</span>}
              </div>
              <div className="mt-3">
                <ClientNotesEditor clientId={clientId} initialNotes={client.notes ?? null} />
              </div>
            </div>
          </div>
        </div>

        {/* Saved listings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Saved Listings
              {saved.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({saved.length})</span>
              )}
            </h2>
            <Link href={`/search?clientId=${clientId}`}>
              <Button size="sm" variant="outline">+ New Search</Button>
            </Link>
          </div>

          {saved.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No saved listings yet.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Run a search and save homes for this client.</p>
                <Link href={`/search?clientId=${clientId}`} className="mt-4 inline-block">
                  <Button size="sm">Run a search</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {saved.map(({ saved: s, listing, analysis }) => {
                const photos = (listing.photoUrls ?? []) as string[]
                const features = analysis?.featuresJson as ListingFeatures | null
                return (
                  <Card key={s.id} className="overflow-hidden border-border/50">
                    <div className="flex gap-4 p-4">
                      {photos[0] && (
                        <img src={photos[0]} alt="" className="w-28 object-cover rounded-md shrink-0 self-start" style={{ height: '88px' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-snug">{listing.address}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{[listing.city, listing.state].filter(Boolean).join(', ')}</p>
                          </div>
                          <RemoveSavedButton savedId={s.id} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 mt-2 text-xs">
                          {listing.price && <span className="font-semibold">${listing.price.toLocaleString()}</span>}
                          {listing.beds && <span className="text-muted-foreground">{listing.beds} bd</span>}
                          {listing.baths && <span className="text-muted-foreground">{listing.baths} ba</span>}
                          {listing.sqft && <span className="text-muted-foreground">{listing.sqft.toLocaleString()} sqft</span>}
                          <a
                            href={`https://www.zillow.com/homedetails/${listing.zillowId}_zpid/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors ml-auto"
                          >
                            Zillow →
                          </a>
                        </div>
                        {features?.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{features.notes}</p>
                        )}
                        <ListingNoteEditor savedId={s.id} initialNotes={s.notes ?? null} />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Linked searches */}
        {linkedSearches.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">
              Searches
              <span className="ml-2 text-xs font-normal text-muted-foreground">({linkedSearches.length})</span>
            </h2>
            <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
              {linkedSearches.map(search => (
                <Link key={search.id} href={`/results/${search.id}`} className="block">
                  <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{search.location}</p>
                      {search.requirementsText && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{search.requirementsText}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <span>{search.analyzedCount ?? 0} results</span>
                      <span>{new Date(search.createdAt).toLocaleDateString()}</span>
                      <svg className="w-3.5 h-3.5 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
