---
title: '5 things AI can spot in listing photos that Zillow''s filters miss'
description: 'Beds, baths, sqft, and price take you about 60% of the way there. Here are five photo-level signals that change the shortlist — none of them are in any filter dropdown.'
date: '2026-04-26'
category: 'Listing analysis'
---

A Zillow filter is a set of yes/no toggles. "3+ beds." "Under $500K." "1500+ sqft." Those are the easy questions — and they get you about 60% of the way to a shortlist your client will actually like. The other 40% lives in the photos. And until recently, the only way to mine that 40% was to open thirty browser tabs and squint.

This post is about what's actually in those photos that filters can't touch — and what AI vision models are now getting reliably right.

## 1. Flooring type, room by room

Zillow's MLS feed has a "Flooring" field. It says things like `"Hardwood, Carpet, Tile"` — three materials, no breakdown of where each one is. Your client says "no carpet in the bedrooms" and you have no way to query for it.

A vision model reading the photos directly can tell you:

- Living room: oak hardwood, looks recent
- Primary bedroom: beige carpet
- Kitchen: large-format porcelain tile
- Secondary bedroom: laminate (consistent grain pattern, visible seams)

That's room-by-room granularity. It's the difference between "this house has hardwood somewhere" and "this house has carpet in the bedrooms — your client said no."

It also catches the things sellers fudge. "Hardwood throughout" in the description, then photo 4 shows clear LVP (luxury vinyl plank — looks like wood, isn't). LVP is fine if your client doesn't care, but if they specifically asked for real hardwood, the listing description just lied to you. The photo doesn't.

## 2. Countertop and cabinet condition

"Updated kitchen" appears in roughly half of all listing descriptions. It means nothing.

What you actually want to know:

- **Material** — granite, quartz, marble, butcher block, or laminate? Zillow's MLS feed sometimes has "kitchen features" but it's rarely room-specific and almost never has the material as a clean field.
- **Generation of update** — quartz with shaker cabinets and brushed-nickel pulls is 2018+. Tile counters with raised-panel oak cabinets is pre-2005, regardless of what the description says.
- **Half-renovated state** — new countertops on top of original cabinets is common when an investor tries to maximize listing appeal on a budget. Photos catch this immediately. Filters never will.

If your client says "I want a kitchen I won't redo for ten years," you're not looking for the word "updated" in the description. You're looking for matching cabinet hardware, no decorative laminate fronts, and quartz or stone counters that don't have visible seams in the wrong places.

## 3. Natural light direction and quality

This is the one realtors keep telling us they wish they could query for. There's no Zillow filter for "north-facing kitchen" or "lots of west-facing windows in the great room." But every client over the age of 35 has an opinion about morning light.

What photos reveal that filters don't:

- **Window-to-wall ratio** in the main living spaces. A kitchen with one small window above the sink reads completely differently from a kitchen with a wall of windows facing the backyard.
- **Light quality at the time of shoot** — most listings are photographed mid-morning to early afternoon. If a room is dim in those photos, it's going to be dim in real life.
- **Direction inferred from shadows** — if shadows in the photos cast east-to-west, the room faces north or south. Cross-reference with the lot's compass orientation on the satellite view and you can predict morning sun behavior surprisingly well.

A vision model can flag every photo with strong directional light versus every photo that needed lamp staging to look livable. That's a signal you can't get any other way.

## 4. Bathroom-by-bathroom condition

The MLS will tell you "3 bathrooms." It won't tell you that the primary is renovated, the hall bath is a 90s tile job nobody touched, and the powder room is just half-painted with the original vanity.

For a young couple who's planning to live there for a decade and might do one renovation, knowing which bathroom is the candidate matters. For an investor who needs to budget rehab, it matters even more.

What photos surface:

- **Tile pattern and grout condition** — small white penny tile with darker grout in the floor reads modern; pink-and-burgundy 6-inch ceramic with cracked grout reads 1985.
- **Fixture style** — chrome cross-handles vs. brushed-nickel single-lever vs. matte-black wall-mount.
- **Vanity vs. cabinet vs. pedestal** — pedestal sinks under 36" wide are usually originals. Floating vanities are post-2015 trends.
- **Whether the shower-tub combo or stand-alone shower** — half the time this isn't even in the MLS feed accurately.

You don't need a model to identify any one of these. You need a model to do all four for every bathroom of every listing in your shortlist, in 30 seconds.

## 5. The "cosmetic update vs. real renovation" tell

This is the most valuable category for buyer's agents working with first-time buyers, who almost universally underestimate renovation cost.

A house can look great in photos and still need $80K of work. Or look dated and need only $8K. The signal is in the layered evidence:

- **Updated** — paint, hardware, lighting fixtures, maybe stair railings refreshed.
- **Renovated** — flooring replaced, kitchen and bathrooms gutted, new appliances.
- **Remodeled** — walls moved, layouts changed, plumbing relocated.

Photos can distinguish all three because each leaves different visible evidence:

| Visible evidence | Likely level |
|---|---|
| Crisp paint over original baseboards and trim | Cosmetic update |
| New flooring but original kitchen cabinets and counters | Partial renovation |
| Open layout, modern lighting, no visible original fixtures | Full remodel |

A "renovated 2022" claim in the description backed by photos still showing 1998-era brass door hinges and original popcorn ceilings? That description is doing a lot of heavy lifting. A model that cross-references the description against photo evidence will flag the gap before you waste a Saturday driving out there.

## Why this matters for the shortlist

The first three pages of any search return more matches than any client wants to see. The job isn't generating a list — it's *cutting* a list down to the homes worth a real conversation with the client.

Every signal above is the kind of thing a great agent already does, but slowly. The question isn't whether AI photo analysis "replaces" expertise. It's whether you can apply your expertise to thirty homes in five minutes instead of five.

That's the actual product hypothesis behind [Eifara](/) — analyze every listing photo, cite the evidence, let the agent decide. If you want to try it on a real client search, the first three are on us. [See pricing →](/pricing)
