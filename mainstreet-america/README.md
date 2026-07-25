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

**Construction UNDERWAY as of 2026-07-24.** An overnight bot build placed much of the core; the planning
docs below were written before that build and are being reconciled to it. The single source of as-built
truth is the live-server RCON survey [`qa/as-built-survey.md`](qa/as-built-survey.md) (measured directly
against the running Paper server, 2026-07-24) — everything asserted here about what exists traces to it.

- **What the survey confirms is built (`verified` — directly RCON-probed):**
  - A **Guest Center** as a two-story hollow shell — solid `y63→y79` (~16 blocks, 2 stories + roof band)
    with interior air `y65–68` and walls present — **~141 blocks wide** (x −70…+70 at z=128), centroid
    **≈ (0, ~135)**. Materials are manufactured, not natural (polished_andesite floor, sea_lantern
    interior lighting, gray_concrete roof, stone_brick foundation).
  - A continuous placed **road / street spine** at **y=63 along x=0**, running **z ≈ +200 → −235**
    (~435 blocks), bridging over water in the northern stretch.
  - **Flanking model homes** along the central street: **west = deepslate_bricks** (≈ Ashby Manor / Old
    World read), **east = stone_bricks**, multi-story walls `y63→~79`.
  - The build area was **graded/filled to y≈63**.
- **Fleet:** 5 bots online (Mason, Architect, Steward, Scout, Surveyor). **The bots ARE opped** — all
  five at `level: 4` in `ops.json` (build permission confirmed). The earlier "bots are not opped" claim
  in the planning docs is now **FALSE**; treat any doc still asserting it as stale.
- **Plugins — CORRECTED 2026-07-25.** The "no WorldGuard" claim was **FALSE**. `plugins` over RCON reports
  **PacketCraft, WorldEdit 7.4.0, WorldGuard 7.0.16**. Overworld name confirmed as **`world`** (resolves
  assumption WG02). Still absent: **Dynmap/BlueMap, EssentialsX, Citizens** — so `map-marker.yaml` and
  `warps.yaml` stay staged. `integration/worldguard.yaml` is now **partly applied**: region
  `mainstreet_america` = x[-70,70] y[62,319] z[-235,200], priority 10, `mob-spawning: deny`. The envelope
  is **not** build-protected yet — op bypasses `build: deny`, so those flags wait on the OQ-2 de-op.
  See [`../raven-rock/qa/oq3-worldguard.md`](../raven-rock/qa/oq3-worldguard.md).
- **The as-built geometry diverges from BOTH planned schemes** (see [`qa/as-built-survey.md`](qa/as-built-survey.md)
  and the defect register): the homes sit on a **narrow central street** (homes at x ≈ ±20–25), which
  matches **neither** the GRID scheme (homes x=±85) **nor** the OVAL scheme (homes x≈±116). The DoD-4
  GRID/OVAL fork was effectively **bypassed by the build**, not resolved per plan. The planning
  coordinate docs and the staged integration files must be **repointed to the actual as-built geometry**
  — a reconciliation item tracked in [`planning/open-questions.md`](planning/open-questions.md) (OQ-1),
  pending orchestrator sign-off. Do not read the planned coordinates below as as-built.
- **Not yet built / not yet verified:** interiors, landscaping, parking field, warehouse, cooking school,
  monument/billboard, and the underground complex are not confirmed by the survey; the 12-home roster is
  **not yet confirmed at 12** (the coarse RCON scan found only ~9 wall clusters — an open verification
  item, not a fact). Per-structure completion booleans are being reconciled against the survey, not
  presumed from it.

## Directory guide

```
mainstreet-america/
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
