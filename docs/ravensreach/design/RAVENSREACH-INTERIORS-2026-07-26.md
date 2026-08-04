# Ravensreach interiors — Moot Hall and basement enhancement as built

**2026-07-26.** Companion to `RAVENSREACH-REDESIGN-2026-07-26.md`.

---

## 1. Moot Hall — BUILT

Four storeys above ground and two basements. The **above-ground** plaza
footprint is x[-100,-70] z[-392,-376]; the basement shell continues south to
z=-341, and the deep public switchback continues to z=-332.

| Level | y | Contents |
|---|---|---|
| **B2** | structural slab 54, finished floor mostly 55, stand mostly 56 | Bowling alley (4 lanes, gutters, pin decks, ball-return posts, concourse booths) · lower bar · club · private rooms · cinema foyer/concessions · 32-seat full-height IMAX |
| **B1** | staggered support 61/62, stand 62/63 | Original cinema · two repaired 24-seat medium cinemas · upper bar / mezzanine · arcade · bank · IT office |
| **Ground** | 67, head 68–72 | Vestibule, corridor, council chamber + dais, registry, records, strongroom |
| **1st** | slab 73, head 74–77 | Mayor's office, library, gallery, clock room |
| **2nd** | slab 78, head 79–82 | **Courtroom** (bench, dock, counsel tables, railed public gallery) · **Post office** (counter, service windows, pigeon-hole sorting wall, writing desk) |
| **3rd** | slab 83, head 84–87 | Judge's chambers, jury room, records |
| **Roof / tower** | ridge 97, spire 108 | Belfry raised above the new ridge so the tower still reads as the tallest thing |

**The two-level bar** is joined by a six-wide dark-oak **grand staircase** with
balustrades. A fresh structural survey proved that the earlier claim of a full
`x[-80,-73] z[-389,-380]` cut void was wrong: the B1 upper-bar deck occupies that
area. The 2026-07-26 enhancement completed only the two missing upper stair rises
and their head opening, preserving the bar floor and fittings.

The basements extend **south under the plaza** to an as-built closed wall at
`z=-341`, not the stale narrative bound `z=-358`. The verified public B1/B2
secondary stair is at `x[-88,-86] z[-365,-358]`. A separate orphan flight in
the south lounge did not connect levels and was retired on 2026-07-27. The
post-build scan found zero B1 or B2 perimeter openings and zero
natural-cavern interfaces.

### 2026-07-26 basement enhancement

The basement fit-out and circulation recovery is now built:

- a dropped three-wide ground-to-B1 public stair was completed;
- the B1/B2 grand stair and three-wide secondary stair were completed;
- the old west-core and bell ladders were removed and capped after finished
  replacement stairs passed both ways;
- three B1 room arches, the B2 suite partitions, furniture, lighting, lamp
  controls, and directional signs were added;
- 179/179 fresh-snapshot guards passed before execution, 193/193 live commands
  succeeded, and every public stair route passed both ways afterward.

The exact plan and evidence are in
`data/exports/box/moot-hall-basement-enhancement-2026-07-26/COMPLETION-REPORT.md`.

### 2026-07-27 south-multiplex and no-ladder completion

The south IMAX now has an eight-step center aisle and 32/32 reachable seats.
Both medium houses have 24 reachable seats, corrected headroom, and usable
center/cross aisles. The B2 lounge has concessions storage, service, music, and
wayfinding. A new 9×9 deep↔B2 switchback plus stacked bell-core stairs link the
Sanctum to the penthouse without ladders. Live QA passed 20/20 directional
checks.

### Verification note worth keeping

Two of twelve room probes reported solid. Both were **my probe landing on furniture I had
placed** — a counsel table and the judge's desk — not a blocked room. That is trap #5 (*"before
believing a FAIL, confirm the probe point is somewhere the geometry actually occupies"*), and it
recurred even while deliberately watching for it. Re-probed at open floor: all clear.

---

## 2. Two other floor plans — HISTORICAL PLANS, NOW BUILT

These are the historical design surveys used to build the Market and Grange
interiors. Both are now built and their circulation is manifest-verified.

### 2.1 Market Longhouse → **the Market Hall** (x[-73,-39] z[-344,-323])

**What the survey found that I had missed:**
- **There is no floor.** The shell encloses a natural hillside rising from y67 to y69–70.
- **A complete earlier cobblestone hut is embedded inside**, with its own door, glazing, corbelled
  roof and plank floor. The shell's west door opens into its wall corner.
- **A fenced farmstead** — 28 tilled farmland cells, irrigation water, a 33-post pen with gates.
- **20 furnaces and 5 barrels are inside the west shell wall itself**, and my interior lining
  sealed them behind stone.
- A **wool-and-quartz statue** floating mid-air that reads as a white bird — kept, and becomes the
  building's landmark, *the White Raven*.

**The plan:** a split-level longhouse — Market Hall at walk y68, Works Terrace at y71, and two
lofts at y77 placed exactly where the y77 furniture already sits, carried on the smelter banks and
barrel towers. Rooms: Market Hall, Hearth Court, Granary & Drying Kiln (the wall furnaces exposed
as a kiln wall — they become the room's reason to exist), Smeltery, Nave, Strongroom, Bunkloft &
Smithy, Counting Room. Every floating fitting lands on a real floor; every stacked chest is
re-racked with trapdoor shelves **so it can actually be opened**.

### 2.2 Group B → **the Grange Hall** (x[-65,-41] z[-370,-352])

**What the survey found that I had missed:**
- **The west doors I fitted open into a solid stone mass** — an old town-wall segment, 2 wide and
  6 tall, running the full depth.
- **A pond, 2 deep, breaching the south wall**, with sub-floor water and a flowing column.
- **A live farm** — tilled farmland with its hydration cell intact — and a grounded livestock pen.
- **A neighbour cottage abuts the north wall**, with a working door opening *into* this building,
  and its roof overhanging inside. Flagged do-not-touch.

**The plan:** three levels — hall floor y68, a wall-walk balcony on top of the old town wall at
y73, and a craft loft at y82 under the existing beam. Rooms: Entry Passage (carved *through* the
town wall), Great Hall, Garden Court (the existing farm kept and gated), the Well, Storeroom,
Still Room, Balcony, Craft Loft. The stale 37-chest count included four
external chests; the current in-hall count is 33.

### Both plans include

Exact do-not-touch lists, masked-replace build orders, `replace air ->` for every fill near
existing fittings, lighting plans with named coordinates, and explicit flags for what could not be
determined offline — chiefly **entities**, which a region snapshot cannot see. Both say: check the
pen and pond for animals in-game before draining.

---

## 3. Honest status

Built and verified: the Moot Hall in full, both basements, the three-screen
multiplex, the stair-only Sanctum↔penthouse route, Market Hall, and Grange Hall.

Market and Grange each contain 33 chest blocks. All 66 block entities were empty
in the final snapshot, and the existing service aisles already reach the racks
(Market 3/3 representative approaches; Grange 8/8). No chest move or destructive
hatch is needed.

The final audit at `docs/ravensreach/audits/ravensreach.yaml` passes **112/112**, including the
new south-multiplex and ladderless-circulation assertions.
