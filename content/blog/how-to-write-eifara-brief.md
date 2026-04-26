---
title: 'How to write a buyer brief that gets you the right Eifara shortlist'
description: 'The single biggest factor in shortlist quality is the brief you type. Here are the patterns that produce sharp, ranked results — and the ones that produce noise.'
date: '2026-04-24'
category: 'Using Eifara'
---

Most of the time when an Eifara search disappoints — too many irrelevant matches, a top pick that obviously misses the brief — the issue isn't the AI. It's the input.

Eifara's vision model is doing the same fundamental thing every time: comparing what's in the listing photos to what the buyer asked for. The richer and more specific the ask, the sharper the rank order. The vaguer the ask, the more the model has to guess what you meant.

Here's how to write a brief that gets you a ranked list you can actually defend to your client.

## The minimum viable brief

The shortest brief that produces a usable result has three components:

- **A "must have" or two** — the non-negotiables
- **A "deal breaker" or two** — what they actively don't want
- **A budget** — even just a max

Example:

> "Modern home, hardwood floors, no carpet in bedrooms, max budget 500K."

That's 12 words, and it'll produce a meaningfully ranked shortlist. The dealBreaker ("no carpet in bedrooms") is what carries most of the rank-discriminating signal — it's specific, photo-detectable, and binary.

Without dealBreakers, every home gets a "neutral" treatment on what's *missing*. The model rewards what it sees but doesn't punish anything specific. That's how you end up with a shortlist where the top match has wall-to-wall berber.

## Specificity by feature category

Here's a mental model for which kinds of asks work well, which work moderately, and which barely work at all.

### Works very well

These are concrete, photo-detectable features:

- **Flooring type** — hardwood, tile, LVP, carpet
- **Kitchen finishes** — quartz vs. granite, dark vs. white cabinets, stainless vs. paneled appliances
- **Bathroom condition** — updated, dated, original
- **Counter type** — quartz, granite, marble, butcher block
- **Cabinet style** — shaker, raised-panel, slab
- **Backsplash** — subway tile, stone, slab, mosaic
- **Light fixtures** — modern, traditional, statement, recessed-only
- **Outdoor features visible in photos** — pool, covered patio, fenced yard, mature trees

Phrasings that work:

- "wants quartz counters" → strong signal
- "no laminate countertops" → strong dealBreaker
- "open floor plan with sightlines from kitchen to living room" → moderate (the "sightlines" part is harder)
- "updated bathrooms in the last 5 years" → moderate (updated is detectable, the 5-year cap is fuzzier)

### Works moderately well

These are detectable but more subjective:

- **Style adjectives** — "modern," "transitional," "traditional," "farmhouse"
- **Light quality** — "lots of natural light," "bright kitchen"
- **Ceiling height** — "high ceilings," "vaulted"
- **Layout descriptors** — "open concept," "split bedroom plan"

Eifara handles these but with more variance, because subjective adjectives mean different things to different buyers. Pair them with concrete features for best results:

- ❌ "modern home" alone
- ✅ "modern home — flat-front cabinets, matte black or brass hardware, large windows, neutral colors"

### Works poorly

These are hard for any vision model to detect from listing photos:

- **Neighborhood character** — "good schools," "quiet street," "walkable"
- **Future potential** — "good bones for renovation," "could remove a wall"
- **Property history** — "no flood damage," "never rented"
- **Specific dimensions** — "primary bedroom at least 14x16"

Eifara doesn't try to fake these. Use Zillow's filters for what filters can do (price, beds, baths, location), and use the Eifara prompt for what photos can show.

## Use the structure the AI expects

Eifara's prompt parser breaks your brief into four buckets:

- **required** — features that must be present
- **niceToHave** — features that raise the score when present but don't disqualify
- **dontCare** — features that aren't relevant either way
- **dealBreakers** — things that immediately disqualify
- **priceCeiling** — the strict numeric budget

You don't need to write JSON. Just write naturally with words that signal which bucket each feature belongs in. The parser is good at this.

Effective phrasings:

- "must have hardwood floors" → required
- "would love a fireplace but not essential" → niceToHave
- "doesn't matter if there's a basement" → dontCare
- "absolutely no HOA" → dealBreaker
- "max budget 500K, will stretch to 525 for the right home" → priceCeiling 500000

The single highest-leverage move you can make in your brief is **explicitly naming the dealBreakers**. Two specific dealBreakers will improve your shortlist quality more than ten more must-haves.

## Length: 50-150 words is the sweet spot

A brief under 30 words is usually too thin — there's not enough signal to discriminate listings.

A brief over 200 words tends to dilute itself. The model treats every line as equal-weight, so adding a fifth nice-to-have starts crowding out your top must-have.

Aim for roughly:

- **2-4 must-haves**
- **2-4 nice-to-haves**
- **1-3 dealBreakers**
- **1 budget line**

That puts you at about 50-150 words and produces the sharpest results we see.

## Real example: bad brief vs. good brief

### Bad brief (vague, no priorities)

> "Family of four wants a nice modern home in Dallas with good light and a backyard, around $500K."

This produces a shortlist that's not much better than Zillow's default. The model can't tell what's a must-have vs. nice-to-have, no dealBreakers, no specific feature signals.

### Good brief (same client, restructured)

> "Family of four. Must have 4 bedrooms, hardwood floors throughout (or LVP — no carpet in bedrooms or living areas), and an updated kitchen with quartz or granite counters. Would love an open floor plan, lots of natural light, and a fenced backyard. Doesn't care about a pool or finished basement. Deal breakers: any HOA above $50/month, and original 1990s bathrooms. Strict budget $500K, can stretch to $525K."

That's 80 words and it produces a meaningfully different shortlist. The dealBreakers (HOA, original bathrooms) immediately knock several listings out. The required (hardwood/LVP, updated kitchen, quartz counters) puts genuine weight on photo-level evidence. The budget is explicit.

## Common mistakes

A few patterns that consistently produce weaker shortlists:

- **Listing every feature equally** — "wants modern, hardwood, granite, stainless, open plan, bonus room, mudroom, double oven, walk-in pantry, 3-car garage." When everything is required, nothing is. Force-rank your top three.
- **Mixing aesthetic preferences with structural ones** — "modern home with no carpet and 4 bedrooms" mixes style, finish, and structural specs. The model handles this fine but it's hard for *you* to evaluate the result. Better to keep style separate from structural.
- **Using marketing words from listing descriptions** — "wants a beautiful, charming, must-see home." None of those map to detectable features. Strip the adjectives, keep the nouns.
- **Forgetting the dealBreakers** — by far the most common omission. If you only specify must-haves, every listing scores fairly well, and the rank order is hard to defend.

## Iterate on the brief, not the search

If your first shortlist underwhelms, **don't run a second search with the same brief expecting different results.** The model is deterministic enough that re-running won't improve anything.

Instead, edit the brief. Common edits:

- Add a dealBreaker that knocks out the top weak match
- Force-rank the must-haves and drop the bottom one to nice-to-have
- Add a specific feature that distinguishes the listings the buyer reacted positively to

Tools like Eifara's [Edit & re-search](/) flow let you tweak the brief and re-run without losing context. Use it.

---

The brief is the single most controllable factor in shortlist quality. Spend an extra five minutes writing it and you save twenty minutes interpreting bad results. [Try it on three free searches.](/pricing)
