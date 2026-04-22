import { pgTable, text, timestamp, integer, jsonb, real, uuid, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  tier: text('tier').notNull().default('free'),
  searchesUsedThisMonth: integer('searches_used_this_month').notNull().default(0),
  searchesResetAt: timestamp('searches_reset_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const searches = pgTable('searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  requirementsText: text('requirements_text'),
  requirementsJson: jsonb('requirements_json'),
  location: text('location').notNull(),
  priceMin: integer('price_min'),
  priceMax: integer('price_max'),
  bedsMin: integer('beds_min'),
  bathsMin: integer('baths_min'),
  totalCandidates: integer('total_candidates').default(0),
  analyzedCount: integer('analyzed_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  zillowId: text('zillow_id').unique().notNull(),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  price: integer('price'),
  beds: real('beds'),
  baths: real('baths'),
  sqft: integer('sqft'),
  photoUrls: jsonb('photo_urls').$type<string[]>().default([]),
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listingAnalyses = pgTable('listing_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  featuresJson: jsonb('features_json').notNull(),
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
})

export const searchResults = pgTable('search_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  searchId: uuid('search_id').references(() => searches.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  matchScore: real('match_score').notNull(),
  matchExplanation: text('match_explanation'),
  batchNumber: integer('batch_number').notNull().default(1),
  isSaved: integer('is_saved').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  shareToken: text('share_token').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const savedListings = pgTable('saved_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  notes: text('notes'),
  lastKnownPrice: integer('last_known_price'),
  savedAt: timestamp('saved_at').notNull().defaultNow(),
}, (t) => [unique().on(t.clientId, t.listingId)])

export type User = typeof users.$inferSelect
export type Search = typeof searches.$inferSelect
export type Listing = typeof listings.$inferSelect
export type ListingAnalysis = typeof listingAnalyses.$inferSelect
export type SearchResult = typeof searchResults.$inferSelect
export type Client = typeof clients.$inferSelect
export type SavedListing = typeof savedListings.$inferSelect
