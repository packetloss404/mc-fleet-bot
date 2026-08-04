# MainStreet America — Minecraft Reconstruction

A planning set for a faithful Minecraft Java 1.21.x reconstruction of the former **MainStreet America**
home-design attraction, 18750 Interstate 45 N, Spring, Texas 77373 (Greater Houston, Harris County).

This is the **project front door**. Start here, then read `references/` for the evidence and `planning/`
for the design.

---

## What MainStreet America was

A real, now-closed **~$20 million home-design attraction** — a self-styled *"home-improvement theme
park"* — developed by **Mike & Barbara Feigin / Design Tech Homes**. It opened in **February 2013** (the
structures were built in **2011**). The site paired:

- a **44,019 SF, two-story guest/design center** (MAIN Restaurant, event hall, furniture showroom, a
  ~10,000 SF design studio, and the "T.E.D." tablet handout — RFID scanners visitors carried);
- **12 uninhabited model homes** that doubled as working retail showrooms, lining a single dead-end
  street; smallest **The Cape Pointe** (1,815 SF, coastal), largest **The Alexandria** (6,011 SF, Greek
  Revival);
- a separate **8,342 SF cooking-school / retail building**;
- an **8,944 SF warehouse** at the rear;
- a large concrete parking field (~100,000 SF / 236 spaces) and an LED monument billboard at the I-45
  frontage.

Design Tech Homes **sold the property in 2023** and the business closed. As of an **October 2025** news
report the buildings were still standing but **vacant and vandalized** — not demolished.

> Not to be confused with the national "Main Street America" preservation program or the Main Street
> America insurance group. This is the Spring, TX model-home attraction only.

## What this reconstruction is

A bot-built Minecraft version of the site inside a **600×600-block protected envelope** centered on world
origin (0, 64, 0). It reproduces the **site layout, the building footprints and sizes, and the full
12-home roster** — the parts that are grounded in real sources — and makes **honest, clearly-labeled
approximations** for everything the sources do not document (chiefly what the buildings *looked like*).

## The honest evidence position

This was **not** a "we found nothing" project. Genuine primary sources were recovered: the developer's
own website, 2013 press coverage, a **commercial real-estate offering flyer** (Colliers) with exact
building sizes and an annotated aerial, and **MainStreet America's own archived web pages** listing every
model home. The full evidence record and its confidence labels live in
[`references/manifest.yaml`](references/manifest.yaml); the plain-language orientation is in
[`references/README.md`](references/README.md).

**Every finding carries exactly one confidence label, never upgraded:**

| Label | Meaning | Applies here to |
|---|---|---|
| **verified** | primary / multi-source | building sizes & story counts, the 12-home roster (names/styles/SF/beds/baths), the front-to-back program order, the south-entrance-notwithstanding functional sequence |
| **high-confidence inference** | one good source / a strong read | the site's front-to-back layout sequence (from the annotated aerial) |
| **moderate-confidence reconstruction** | assembled from snippets | the rear detention pond (an unlabeled aerial feature) |
| **creative approximation** | no evidence; the build invents it | **every façade, material, roof form, window pattern and color**; the exact XZ coordinates; which named home sits on which lot; the rotated compass bearing; the oval loop shape |

**Bottom line:** the *shape and program* of this build are real history. The *surfaces* are an informed
reconstruction. Two deliberate design conventions the docs and any on-site signage must disclose:

1. **The bearing is rotated.** The real site fronted I-45 on its **west**; this build puts the principal
   entrance on the **south** (+Z). Compass directions here are a build convention, not the surveyed azimuth.
2. **The home street is rendered as a graceful oval**, standing in for the real **straight, dead-end
   cul-de-sac** (a documented single self-contained circuit, homes on both sides, *not* a grid).

Enjoy it as a faithful map, not a photograph.

## Current build status

**Physical build closed and operational deployment verified on 2026-07-26.**
The immutable snapshot hash is
`78a28b83e1580d436c2ce5cbd044c5853c51c78c8f16d2d860aaa903d8ae10c9`.
The final as-built material suite passes **96/96**, and independent bidirectional
flood-fill checks reach the public mountain complex, surface hangar, heliport,
lower operations, penthouse safe room, fallout shelter, and all three vault
levels. See [`qa/audit-2026-07-26.md`](qa/audit-2026-07-26.md) and
`qa/audit-closure-2026-07-26.json`.

- R01–R07 are one connected road network with 48 lamps and every declared
  road-linked gate connected.
- The accepted boundary system is 13 project/division white-picket fences with
  32 gates and 5,954/5,954 exact targets. The former ±305 water-crossing ring was
  reversed and retired.
- Parking/arrival/gardens contains 236 modeled bays, crosswalks, lighting,
  canopies, gardens, Discovery Court, and the connected mountain approach.
- Guest Center, cooking school, warehouse, 12 authored home floorplans, six
  infill homes, pond landscape, monument terraces, underground hangar/arena,
  lower operations, and repaired failed roofs pass their regression groups.
- The surface program is built: large hangar and second-floor overlook office,
  rooftop three-dome observatory, one-bedroom private residence, 12-monitor
  command center, library, glass/marble spa, wardrobe, safe room, shelter,
  communications/treasury rooms, and a dry three-level marble-and-gold vault.
- `mainstreet_america` now covers the full property and world height. A
  higher-priority `msa_mountain_sub` region gives the non-Raven-Rock mountain
  project an explicit edit domain below y62. The five fleet bots are members,
  no longer operators, and `packetloss404` is the sole owner/operator.
- `data/world-map.db` is the first-class spatial catalog. Stable project IDs,
  hierarchy, geometry, source hashes, snapshot scans, and observations are
  imported idempotently by `scripts/import_mainstreet_project_grid.js`.
- Dynmap/BlueMap and EssentialsX remain absent as server plugins. BlueMap is an
  offline QA renderer; live navigation uses MarkerStore markers, zones, and
  routes from `scripts/register_msa_navigation.mjs`.

The Box archive is configured in Dashboard → Settings → Integrations. Its first
live sync uploaded all 207 discovered artifacts to the approved `mc-fleet-bot`
folder with zero failures. Secrets are not stored in source control.

## Directory guide

```
docs/mainstreet-america/
├── README.md                    ← you are here (project front door)
├── references/
│   ├── manifest.yaml            authoritative source record + confidence labels + source conflicts
│   └── README.md                plain-language evidence orientation ("what's real vs approximated")
├── planning/
│   ├── site-plan.md             master site plan: 9 zones, circulation, overhead diagram (declared master)
│   ├── coordinates.yaml         coordinate manifest: zones, building centroids, notable locations (GRID scheme)
│   ├── buildings.yaml           per-building records: footprints, floors, palettes, rooms, distinct massing (OVAL scheme)
│   ├── palettes.yaml            material palettes: site kit, per-building block sets, landscaping, lighting
│   └── open-questions.md        decisions the audit escalated (layout fork, cooking-school, labels, …)
├── integration/                 STAGED, INACTIVE plugin config (apply later)
│   ├── location.yaml            bot-readable location/alias record (mc-fleet-bot relay)
│   ├── warps.yaml               EssentialsX /warp definitions (visitor tour)
│   ├── map-marker.yaml          Dynmap marker set (site + POIs + boundary)
│   └── worldguard.yaml          WorldGuard region + flags (walk-through museum profile)
└── qa/
    ├── qa-report.md             acceptance framework: inspection items + definition-of-done gates
    └── defects.yaml             as-built defect register (empty until construction begins)
```

## Scale convention

- **1 horizontal block ≈ 2 real feet**, so **1 block² ≈ 4 ft²**.
- Building footprints are derived from verified square footage: `blocks/floor ≈ verified_SF ÷ 4 ÷ floors`.
- **~5 blocks of wall height per story** (~10 ft/story; roofs add more).
- Base build elevation is **Y = 64**; the world envelope is **X, Z ∈ [−300, +300]** (600×600 blocks
  ≈ 1200×1200 ft ≈ 33 acres). The envelope is intentionally larger than the real ~12.41-acre parcel — the
  developed core is a long, narrow central strip; the surplus is landscaped greenbelt buffer. **Do not
  read the envelope edge as the real property line.**
