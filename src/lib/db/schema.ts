import { pgTable, text, timestamp, integer, jsonb, real, uuid, unique, boolean, index } from 'drizzle-orm/pg-core'
import type { ParsedRequirements, ListingFeatures } from '@/types'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  tier: text('tier').notNull().default('free'),
  searchesUsedThisMonth: integer('searches_used_this_month').notNull().default(0),
  searchesResetAt: timestamp('searches_reset_at').notNull().defaultNow(),
  emailAnalysisDone: boolean('email_analysis_done').notNull().default(true),
  emailPriceAlerts: boolean('email_price_alerts').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const searches = pgTable('searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  requirementsText: text('requirements_text'),
  requirementsJson: jsonb('requirements_json').$type<ParsedRequirements>(),
  location: text('location').notNull(),
  priceMin: integer('price_min'),
  priceMax: integer('price_max'),
  bedsMin: integer('beds_min'),
  bathsMin: integer('baths_min'),
  totalCandidates: integer('total_candidates').default(0),
  analyzedCount: integer('analyzed_count').default(0),
  // Lifecycle: 'running' | 'completed' | 'failed' | 'cancelled'.
  // Stored as text rather than a Postgres enum to avoid migration churn
  // when adding new states later. Use the SearchStatus type for safety.
  status: text('status').notNull().default('running'),
  errorMessage: text('error_message'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  // Cost / performance metrics (P5). All nullable — rows from before
  // metrics were added stay null. tokensUsed is the sum across all
  // Anthropic calls for this search; visionModel records which vision
  // model was used so we can A/B Haiku vs Sonnet.
  tokensUsed: integer('tokens_used'),
  visionModel: text('vision_model'),
  // SHA-256 of normalized (location + requirementsText + filters). Used
  // to detect duplicate searches within a 1-hour window so we redirect
  // to the existing results instead of charging for a re-run.
  inputHash: text('input_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_searches_user_id').on(t.userId, t.createdAt.desc()),
  index('idx_searches_client_id').on(t.clientId),
  index('idx_searches_status').on(t.status),
  index('idx_searches_user_hash').on(t.userId, t.inputHash),
])

export type SearchStatus = 'running' | 'completed' | 'failed' | 'cancelled'

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
  // Cached Zillow detail payload (description, MLS resoFacts, price history).
  // Refreshed when older than DETAIL_STALE_AFTER_DAYS in the worker.
  detailJson: jsonb('detail_json'),
  detailFetchedAt: timestamp('detail_fetched_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listingAnalyses = pgTable('listing_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  featuresJson: jsonb('features_json').$type<ListingFeatures>().notNull(),
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
}, (t) => [
  index('idx_listing_analyses_listing_id').on(t.listingId),
])

export const searchResults = pgTable('search_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  searchId: uuid('search_id').references(() => searches.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  matchScore: real('match_score').notNull(),
  matchExplanation: text('match_explanation'),
  batchNumber: integer('batch_number').notNull().default(1),
  isSaved: integer('is_saved').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  unique().on(t.searchId, t.listingId),
  // Composite for the most common query: results page sorts by score within a search
  index('idx_search_results_search_score').on(t.searchId, t.matchScore.desc()),
  index('idx_search_results_listing_id').on(t.listingId),
])

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  shareToken: text('share_token').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_clients_user_id').on(t.userId),
])

/**
 * Per-listing analysis failure tracking. One row per (searchId, listingId)
 * pair — when a worker fails, it upserts a row here. When the same listing
 * later succeeds (e.g. a manual retry works), the row is deleted.
 *
 * The UI shows a banner on the results page when any rows exist for a
 * search, with a "retry failed" button.
 */
export const searchFailures = pgTable('search_failures', {
  id: uuid('id').primaryKey().defaultRandom(),
  searchId: uuid('search_id').references(() => searches.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  errorMessage: text('error_message'),
  errorType: text('error_type'),  // 'vision' | 'scoring' | 'detail' | 'unknown'
  attemptCount: integer('attempt_count').notNull().default(1),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
}, (t) => [
  unique().on(t.searchId, t.listingId),
  index('idx_search_failures_search_id').on(t.searchId),
])

export const savedListings = pgTable('saved_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  notes: text('notes'),
  lastKnownPrice: integer('last_known_price'),
  savedAt: timestamp('saved_at').notNull().defaultNow(),
}, (t) => [
  unique().on(t.clientId, t.listingId),
  index('idx_saved_listings_client_id').on(t.clientId),
  index('idx_saved_listings_listing_id').on(t.listingId),
])

export type User = typeof users.$inferSelect
export type Search = typeof searches.$inferSelect
export type Listing = typeof listings.$inferSelect
export type ListingAnalysis = typeof listingAnalyses.$inferSelect
export type SearchResult = typeof searchResults.$inferSelect
export type Client = typeof clients.$inferSelect
export type SavedListing = typeof savedListings.$inferSelect
export type SearchFailure = typeof searchFailures.$inferSelect
