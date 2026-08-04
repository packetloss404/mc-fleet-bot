# MainStreet America — Reference Orientation

This folder documents the sources behind a Minecraft reconstruction of **MainStreet America**, a
real, now-closed home-design attraction at **18750 Interstate 45 N, Spring, Texas 77373** (Greater
Houston, Harris County). The full source record is in [`manifest.yaml`](./manifest.yaml).

This README exists so that **a visitor to the finished build is not misled** about what is history and
what is our best guess.

## The honest headline

This was **not** a case of "we found nothing." MainStreet America was a well-documented ~$20 million
business, and we recovered genuine primary sources: the developer's own website, 2013 press coverage,
a commercial **real-estate offering flyer** with exact building sizes and an annotated aerial photo,
and — crucially — **MainStreet America's own web pages** (recovered from the Internet Archive) listing
all twelve model homes with their names, styles, and square footage.

So the **layout, the building sizes, and the home roster are on solid ground.** What we largely could
**not** find is what the buildings actually *looked like* in three dimensions.

## What is genuinely known (verified)

- **Who built it:** Mike & Barbara Feigin / Design Tech Homes. It opened **February 2013** (the
  structures were built in 2011).
- **What it was:** a "home-improvement theme park" — 12 model homes doubling as retail showrooms, plus
  a guest center with a restaurant, event hall, furniture showroom, and a design studio; a cooking
  school; and a warehouse. Visitors carried "T.E.D." tablets that scanned product tags.
- **The site plan (front-to-back, west-to-east):** I-45 frontage road → a big LED billboard → a large
  concrete parking lot → the **44,019 sq ft two-story guest center** facing the freeway → a single
  dead-end street lined with the 12 homes → a mid-row cooking-school/retail building → a warehouse at
  the back. It's a long, narrow strip, **not** a grid.
- **The 12 homes:** every name, architectural style, square footage, and bed/bath count is verified
  from the owner's own archived pages. The smallest is **The Cape Pointe** (1,815 sq ft, coastal); the
  largest is **The Alexandria** (6,011 sq ft, Greek Revival). See the `homes:` table in the manifest.

## What is reconstructed or approximated (do not present as fact)

- **The look of every building.** We know the guest center's *size and story count* but nothing about
  its facade, materials, color, or roof. Sources call it a "mansion" — that's a vibe, not a spec. **Any
  wall texture or roof shape in the build is our invention.**
- **The look of each home.** We know each home's *style name* (Craftsman, Spanish Courtyard, Texas Hill
  Country, etc.) and size, but not its actual materials or detailing. Style names guided our guesses.
- **Where each named home sits on the street.** We know they lined one cul-de-sac; we do **not** know
  the order. We chose it.
- **Exact dimensions and compass bearings.** These come from reading an aerial photo, not a survey.

## Two things the sources genuinely disagree on

Historical marketing and later real-estate records conflict. We recorded **both** rather than picking
one — see the `conflicts` section of the manifest. The main ones:

| Topic | 2013 promotional | Later real-estate records |
|---|---|---|
| Acreage | ~14 acres | 12.41 acres |
| Opened / built | Opened Feb 2013 | "Built 2011" |
| Guest center | "45,000 sq ft mansion" | 44,019 sq ft |
| Home count | 12 homes | one listing says 11 |
| Parking | 236 spaces | 258 spaces |

For the build we use **12 homes** and **44,019 sq ft** (both verified from primary sources).

## What nobody could establish

Buyer, sale price, and current use after the 2023 sale; the exact closure date and an independently
confirmed reason; the buildings' 2026 status. As of an **October 2025** news report the buildings were
still standing but **vacant and vandalized** — not demolished.

## How to read the confidence labels

Every finding in `manifest.yaml` carries exactly one of: **verified** (multiple independent or primary
sources), **high-confidence inference**, **moderate-confidence reconstruction**, or **creative
approximation**. These were never upgraded. When in doubt, trust the label over the polish of the
prose.

**Bottom line for a visitor:** the *shape and program* of this build are real history. The *surfaces*
are an informed reconstruction. Enjoy it as a faithful map, not a photograph.
