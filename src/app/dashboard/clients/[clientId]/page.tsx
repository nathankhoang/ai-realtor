import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { users, clients, savedListings, listings, listingAnalyses, searches } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingFeatures } from '@/types'
import RemoveSavedButton from './RemoveSavedButton'
import ShareButton from './ShareButton'
import ListingNoteEditor from './ListingNoteEditor'

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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <div className="flex items-start justify-between gap-3 mt-1">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <ShareButton clientId={clientId} />
          </div>
          <div className="flex flex-wrap gap-x-4 mt-1 text-sm text-muted-foreground">
            {client.email && <span>{client.email}</span>}
            {client.phone && <span>{client.phone}</span>}
          </div>
          {client.notes && (
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">{client.notes}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Saved Listings ({saved.length})
          </h2>
          <Link href={`/search?clientId=${clientId}`} className="text-xs text-blue-400 hover:text-blue-300">
            + New Search
          </Link>
        </div>

        {saved.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No saved listings yet. Run a search and save homes for this client.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {saved.map(({ saved: s, listing, analysis }) => {
              const photos = (listing.photoUrls ?? []) as string[]
              const features = analysis?.featuresJson as ListingFeatures | null
              return (
                <Card key={s.id} className="overflow-hidden border-border/50">
                  <div className="flex gap-3 p-4">
                    {photos[0] && (
                      <img src={photos[0]} alt="" className="w-24 h-20 object-cover rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{listing.address}</p>
                          <p className="text-xs text-muted-foreground">{[listing.city, listing.state].filter(Boolean).join(', ')}</p>
                        </div>
                        <RemoveSavedButton savedId={s.id} />
                      </div>
                      <div className="flex flex-wrap gap-x-2.5 mt-1.5 text-xs text-muted-foreground">
                        {listing.price && <span className="font-semibold text-foreground">${listing.price.toLocaleString()}</span>}
                        {listing.beds && <span>{listing.beds} bd</span>}
                        {listing.baths && <span>{listing.baths} ba</span>}
                        {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                        <a
                          href={`https://www.zillow.com/homedetails/${listing.zillowId}_zpid/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 ml-auto"
                        >
                          Zillow →
                        </a>
                      </div>
                      {features?.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{features.notes}</p>
                      )}
                      <ListingNoteEditor savedId={s.id} initialNotes={s.notes ?? null} />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {linkedSearches.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Linked Searches ({linkedSearches.length})
            </h2>
            <div className="space-y-2">
              {linkedSearches.map(search => (
                <Link key={search.id} href={`/results/${search.id}`}>
                  <Card className="hover:border-foreground/30 transition-colors cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{search.location}</p>
                        {search.requirementsText && (
                          <p className="text-xs text-muted-foreground truncate">{search.requirementsText}</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {search.analyzedCount ?? 0} results · {new Date(search.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
