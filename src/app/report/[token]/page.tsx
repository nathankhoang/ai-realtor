import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { clients, savedListings, listings, listingAnalyses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { ListingFeatures } from '@/types'

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4">
        <span className="text-xl font-semibold tracking-tight">Eifara</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Client Report</p>
          <h1 className="text-2xl font-bold mt-1">{client.name}</h1>
          <div className="flex flex-wrap gap-x-4 mt-1 text-sm text-muted-foreground">
            {client.email && <span>{client.email}</span>}
            {client.phone && <span>{client.phone}</span>}
          </div>
          {client.notes && (
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">{client.notes}</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Saved Homes ({saved.length})
          </h2>

          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No saved homes yet.</p>
          ) : (
            <div className="space-y-4">
              {saved.map(({ saved: s, listing, analysis }) => {
                const photos = (listing.photoUrls ?? []) as string[]
                const features = analysis?.featuresJson as ListingFeatures | null
                return (
                  <div key={s.id} className="border border-border/40 rounded-lg overflow-hidden">
                    {photos[0] && (
                      <img src={photos[0]} alt="" className="w-full h-52 object-cover" />
                    )}
                    <div className="p-4 space-y-2">
                      <div>
                        <p className="font-semibold">{listing.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {[listing.city, listing.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                        {listing.price && (
                          <span className="font-semibold text-foreground">${listing.price.toLocaleString()}</span>
                        )}
                        {listing.beds && <span>{listing.beds} bd</span>}
                        {listing.baths && <span>{listing.baths} ba</span>}
                        {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                      </div>
                      {features?.notes && (
                        <p className="text-sm text-muted-foreground">{features.notes}</p>
                      )}
                      {s.notes && (
                        <p className="text-sm border-l-2 border-border pl-3 text-muted-foreground italic">
                          {s.notes}
                        </p>
                      )}
                      <a
                        href={`https://www.zillow.com/homedetails/${listing.zillowId}_zpid/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-blue-400 hover:text-blue-300"
                      >
                        View on Zillow →
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border/40">
          Prepared with Eifara — AI-powered home search for realtors
        </p>
      </main>
    </div>
  )
}
