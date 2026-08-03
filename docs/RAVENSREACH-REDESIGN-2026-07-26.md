# Ravensreach redesign — survey, diagnosis, and what needs deciding

**2026-07-26.** Four Fable 5 agents surveyed and redesigned the town after the operator
reported: *"items floating in the sky, buildings where the interiors remain but the walls
and roofs are gone so shit is just floating and the buildings dont connect, no common
roads, paths, gardens, town hall isnt concise, needs to be bigger with multiple rooms and
a mayor office."*

Companion documents:
- `docs/MASTERPLAN-RAVENSREACH-PUBLIC-REALM.md` — roads, gardens, lighting, 7 build phases
- `audits/ravensreach.yaml` — 37 repeatable checks; run with `scripts/audit.py`

---

## The diagnosis

**Every recorded building is fine.** All nine — hall, five cottages, storehouse, plaza,
well — are substantially whole, verified layer by layer rather than by point probes. That
is why the audit passed them, and it is why the operator's report initially looked like a
contradiction.

**The problem is an unrecorded annex** east and south-east of the plaza, in no database,
with no matching build event: a forge, an inn, a wizard tower, a smeltery/dormitory.
Furnaces, barrels, bookshelves, enchanting tables, eight beds, a 32-chest wall —
**and zero structural blocks at any level.**

> ### The systemic finding
> These are LLM-designed buildings whose **fittings were placed and whose shells never
> were**. That is not damage; it is a build-pipeline defect. Worth investigating in
> `LlmDesigner` / `DesignValidator`: a design that validates with furniture but no
> enclosure produces exactly this, repeatedly, and nothing currently catches it.

Of **656 ungrounded blocks in 114 clusters, exactly one is genuine debris** — a dirt block
near the mine. Everything else is furniture, gardens or fittings of real or intended
buildings. All ~130 containers checked are **empty**, so no decision below loses items.

### Correcting the record on the 2026-07-25 incident

The building destroyed by the debris sweep and restored from a snapshot
(`docs/INCIDENT-2026-07-25-ravensreach-structure-loss.md`) **was never whole.** The
restore faithfully replaced every block at its original coordinates — and those
coordinates were never connected to the ground. Connectivity flags it again today, and
re-running the sweep would repeat the incident block for block.

So the accurate statement is not "a complete building was deleted and recovered". It is
"an incomplete building was deleted, and restored to its incomplete state". It needs a
completion decision, not a restore.

### Connectivity, measured

- **27 gravel blocks of paving in the entire town.** One real path, four blocks long.
- **0 torches, 0 benches.** All 12 lanterns hover unattached. All 28 rose bushes float at y90.
- **The storehouse is sealed** — its only door opens directly into the Surveyor cottage's
  north wall, built back-to-back with zero gap. Confirmed independently by two agents.
- **Steward's and Scout's doors both face away from the plaza**, with no path either way.

---

## Decisions needed before anything is built

Four calls, none of which should be made by guessing. After the 2026-07-25 incident,
destructive operations here get an explicit decision, never a sweep.

### 1. The red bed at (−89/−88, 68, −385) — probably a spawn point

Verified a **properly-formed bed**: head and foot, `facing=west`, sitting in the open on
the plaza. Demolition step D1 of the hall build (`-98 68 -392 → -72 95 -368 : air`)
destroys it and **resets whoever's spawn it is.**

**Resolve before executing D1.** Either identify the owner, or place a replacement bed in
a cottage first.

### 2. The watchtower at x[−82,−72] z[−370,−362] — two agents disagree

402 blocks, complete and standing: stone-brick shaft, spruce stairs, deepslate-brick spire
trim, glowstone, red carpet, reaching y93.

| Agent | Position |
|---|---|
| Structural survey | *"the one finished annex build"* — keep it |
| Hall designer | Demolish — it stands 1 block from the new porch and competes with the new campanile; its deepslate trim is off-palette anyway |

Both are reasonable. It is a genuine design judgement about whether the civic core has one
vertical accent or two, and it belongs to the operator.

### 3. The phantom groups — adopt or dismantle

Forge, Inn, wizard tower, smeltery/dormitory, chest walls, floating catwalk. Furniture
without shells.

- **Adopt** — build the missing shells around the existing fittings. Roughly 950 blocks for
  the Inn and 970 for the Forge as two-storey cottage-style shells; the others need scoping.
- **Dismantle** — all containers verified empty, so nothing material is lost.

Whichever is chosen, it must be an explicit instruction. **The connectivity sweep must
never be the mechanism** — that is what destroyed a building here.

### 4. Group B — complete in place, or relocate its fittings

The restored-but-never-whole building. Same question, but with the added history that it
has already been destroyed once.

---

## Correction: the plaza flooding is probably fixable

Earlier notes recorded the plaza's east corner as flooded by an **adjacent lake**, with
draining declared futile because "it refills from outside any box", and the item was
deferred pending a dam-or-regrade decision.

The masterplan survey disputes this: **there is no lake east of the district.** What exists
is a y67 surface pool plus a hand-dug dry channel. A water census is consistent — 128 to
233 water blocks scattered across large boxes, which reads as ponds rather than a connected
body.

Not yet conclusively settled, but the "futile" verdict should not be trusted. The
masterplan proposes formalising the pool into a stone-edged pond with a culvert, deck and
bench — turning the defect into an amenity, which is a better answer than either draining
or damming.

---

## What the plan delivers

### Town hall → **Moot Hall**, 31×17, two storeys, bell tower to y95

The massing argument is the good part: the tower centreline sits at **x = −85**, which the
survey shows is *already* the town's ceremonial axis — the old hall door, the well, and the
north house's door all fall on it. The front door stays at its exact existing position, so
the well becomes the forecourt centrepiece rather than an obstruction.

**8 real rooms + 4 circulation spaces:** vestibule, corridor, double-height council chamber
with dais and public gallery, registry, records/archive, strongroom, landing, **mayor's
office** (12×7, the sunniest room in town — desk, lectern, map wall, banners, chest pair),
library/map room, clock room, belfry with the re-hung bell.

~2,100 blocks demolished, ~3,800 placed. Full build order as axis-aligned fills, ready to
execute through `WorldEditOps` with `//undo` behind it.

### Public realm

Two 3-wide gravel main streets, three 2-wide lanes, doorstep pads to every building —
including a lane that turns Steward's and Scout's backwards-facing doors into fronts on a
shared street. Kitchen gardens behind four cottages (hydration-verified), 29 lantern posts,
fenced parcels, the grove treated as a **crop** with a replant grid that skips the 8
standing trees, and a recommended east-wall door cut to unseal the storehouse.

Every ground operation is a **masked `//replace` from an explicit natural-blocks allowlist**,
with per-operation do-not-touch lists — the lesson from the grading pass that destroyed the
southern road.

---

## Survey corrections worth keeping

- The site brief was wrong about the terrain: **~300 low cells across 8 trench/hole
  defects**, not the "two columns" previously recorded.
- The plaza has **50 unpaved grass cells** — the audit's stone-brick count passed while
  bare turf sat inside it, because counting what should be present does not catch what
  should not.
- `town.db`'s hall row and the as-built shell measure differently, and **both are right**:
  the shell is x[−97,−73], the roof overhangs to x[−98,−72]. The row deliberately covers
  the roof, because its purpose is the brain's avoidRects — widening it is what stops the
  brain building into the eaves.
