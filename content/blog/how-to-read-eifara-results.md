---
title: 'How to read your Eifara results: match score, photo evidence, and the requirements checklist'
description: 'Eifara surfaces a lot of signal per listing. Here''s how to read every section so you spend your time on the right homes — and trust the ones the AI flags.'
date: '2026-04-17'
category: 'Using Eifara'
---

The Eifara results page shows you ranked listings, but each card is also doing a lot of work behind the score. If you only look at the headline number, you're leaving roughly half the value of the tool on the table.

This post walks through every section of a result card, what it means, and how to weigh each piece against the others when you're deciding which homes deserve a showing.

## The match score (top-right of every card)

A 2-digit number out of 100. The headline.

What it represents:

- **85+** — strong match, all or nearly all required features clearly present, no deal breakers triggered
- **65-85** — solid match with one or two minor gaps or unverified features
- **45-65** — partial match, several requirements unmet but no dealBreakers
- **Under 45** — weak match, dealBreakers triggered or almost nothing from the brief is present

The score is *one* signal, not the answer. The agents who use Eifara well treat the score as a "where to focus" sort, not a "ship it" verdict. A score of 78 with strong photo-cited evidence often beats a score of 88 where most of the score is "unclear."

That's why the next section matters more than the number.

## "Why it matched" (the explanation paragraph)

Below the photo, every card has a 2-sentence explanation. This is the model's reasoning summary.

What to look for:

- **Specific feature citations** — "quartz countertops, hardwood throughout, primary suite shows updated bathroom (photo 5)" tells you exactly what justified the score.
- **Source citations** — "per MLS data," "per listing description," "photo 3." If most of the explanation cites photos, the model had high confidence. If most cites the listing description, the model is partly trusting the seller's claims (which may or may not be accurate).
- **Renovation date claims** — when present ("kitchen remodeled 2022 per listing"), Eifara surfaces the year because it's the most-fudged number in real estate.

If the "why it matched" reads as vague or repetitive ("modern home with good features"), the model didn't have strong photo evidence and is filling in. Treat the score with proportional skepticism.

## The requirements checklist (the per-feature grid)

The most underused section of the results page, and arguably the most important. For every item in your original brief, the checklist shows:

- ✓ **Matched** — the listing clearly satisfies it
- ✗ **Missed** — the listing clearly does NOT satisfy it
- ? **Unclear** — not enough information to tell

Each row also shows the source of the evidence (photo number, MLS data, listing description) so you can verify yourself in 5 seconds.

How to read this in practice:

- **All matched** — you don't need to verify, but the buyer might still want to see it for subjective reasons.
- **Mostly matched, one or two unclear** — those are the questions to ask the listing agent before booking the showing. "Is the secondary bedroom flooring really hardwood, or is it LVP?"
- **Mostly matched, one missed** — depends on whether the missed item was a must-have or nice-to-have. If the dealBreaker shows ✓ matched (i.e., the dealBreaker was successfully avoided — confusing wording, but "matched" on a dealBreaker means the bad thing isn't there), the listing is still worth a showing.
- **Several missed** — skip unless the score is unusually high despite them, in which case re-read why the model still ranked it well.

The checklist is also where you catch model errors. If the photo evidence cited doesn't actually show what the model claims it shows, you've spotted a bad call. Worth knowing before you take the buyer.

## "Other features detected in photos" (collapsible section)

Below the requirements checklist, there's a collapsible "Other features detected in photos" panel. This shows everything the model identified that wasn't in your original brief — flooring type, countertop material, appliance finishes, ceiling height, natural light quality, etc.

Why this matters:

- **Surface-area beyond the brief.** Buyers often have preferences they didn't articulate. Showing them this for a top listing during a debrief — "by the way, this kitchen has quartz counters, brushed-nickel hardware, and looks recently renovated" — gives them concrete things to react to.
- **Find your client's actual taste.** Over a few searches, you'll notice patterns in what they react well to. The "other features" panel is where that signal lives.
- **Catch features that might shift the conversation.** "High ceilings" or "lots of natural light" might not have been in the brief but turn out to matter a lot to the buyer once they see it.

It's collapsed by default to keep the card scannable. Open it on your top 3-5 results, not all of them.

## The "Over budget" badge (when applicable)

If your search has a strict price ceiling and a listing came through at up to 10% over, you'll see an amber "Over budget by $X" pill next to the price.

This is intentional, not a bug. The default behavior is:

- **Strictly within budget** → no badge, scored normally
- **Up to 10% over** → shown with the badge so you can decide if it's worth a stretch conversation
- **More than 10% over** → not shown at all (filtered at Zillow query time)

How to use the badge:

- **High-score over-budget homes are conversation starters.** "I found one home that's 5% over your strict cap, but it hits 8 out of 9 of your priorities. Worth seeing?"
- **Low-score over-budget homes** can usually be ignored — the price stretch isn't justified by the fit.

## Photos: order and selection

Each card shows the listing's hero photo. The thumbnail strip below lets you click through.

The model analyzed the **first 5 photos** during scoring. If the agent uploaded 30 photos, photos 6-30 weren't scored. This is a deliberate cost tradeoff (vision is the expensive part), but it has implications for reading results:

- **A house that scores well on the first 5 photos is well-photographed first.** Listing agents lead with their best shots — if the scoring photos look great, the rest probably do too.
- **A house that scores poorly might just have weak first 5 photos.** Sometimes the kitchen is photo 8. If the score feels too low for what you can see, click through the thumbnails — you might catch something the model didn't.

When in doubt, scan all the thumbnails. It's free and takes 10 seconds per listing.

## What about the listings that *didn't* make the top of the list?

Below the strong-match cards, you'll see a "X listings filtered out (poor match)" toggle. This is everything that scored below the threshold but was still in the original Zillow set.

When to expand it:

- **You want to verify the AI didn't drop something good.** Maybe a 0.52 score is one feature category off from being a 0.7. Worth a glance.
- **Your buyer reacts well to something specific** that's only present in lower-scored listings — useful for refining the next search.
- **The top of the list is thin** — if there are only 1-2 strong matches, the filtered set is where the next-best options live.

In practice, most agents look at the filtered set on the first search of a new client (to calibrate) and then ignore it on subsequent searches once they trust the rank.

## Putting it all together: a 2-minute review

For each card in your top 5, run this:

1. **Score** — get a quick read (great / good / borderline)
2. **"Why it matched"** — does the reasoning sound right?
3. **Requirements checklist** — any dealBreakers triggered? Any unclear items worth asking about?
4. **"Other features"** (top 3 only) — anything notable for the buyer debrief?
5. **Click through 4-5 photos** — look for anything the model missed

That's 2 minutes per listing, 10 minutes for the top 5. Compare to 30 minutes per listing of manual photo review and you've cut the prescreen by 80% with better-structured output.

---

The results page is where the AI's work meets your judgment. The score sorts the list, but the evidence and checklist are what let you defend the picks to your client. [Run a real search and try the read for yourself.](/pricing)
