# Ravensreach interiors — Moot Hall as built, and two floor plans awaiting execution

**2026-07-26.** Companion to `RAVENSREACH-REDESIGN-2026-07-26.md`.

---

## 1. Moot Hall — BUILT

Four storeys above ground and two basements, on the plaza footprint x[-100,-70] z[-392,-376].

| Level | y | Contents |
|---|---|---|
| **B2** | floor 54, head 55–59 | Bowling alley (4 lanes, gutters, pin decks, ball-return posts, concourse booths) · lower bar · club · private rooms |
| **B1** | floor 61, head 62–66 | Cinema (screen, 4 tiered seating rows, projector booth, dark acoustic walls) · upper bar / mezzanine · arcade · bank · IT office |
| **Ground** | 67, head 68–72 | Vestibule, corridor, council chamber + dais, registry, records, strongroom |
| **1st** | slab 73, head 74–77 | Mayor's office, library, gallery, clock room |
| **2nd** | slab 78, head 79–82 | **Courtroom** (bench, dock, counsel tables, railed public gallery) · **Post office** (counter, service windows, pigeon-hole sorting wall, writing desk) |
| **3rd** | slab 83, head 84–87 | Judge's chambers, jury room, records |
| **Roof / tower** | ridge 97, spire 108 | Belfry raised above the new ridge so the tower still reads as the tallest thing |

**The two-level bar** spans B1 and B2 through a cut void (x[-80,-73] z[-389,-380]), joined by a
6-wide dark-oak **grand staircase** with balustrades, and a galleried rail around the opening on
B1 so the upper bar overlooks the lower.

The basements extend **south under the plaza** (z[-376,-358]) because the hall footprint alone
could not hold the programme. A spine corridor and a second stair connect the two levels there.

### Verification note worth keeping

Two of twelve room probes reported solid. Both were **my probe landing on furniture I had
placed** — a counsel table and the judge's desk — not a blocked room. That is trap #5 (*"before
believing a FAIL, confirm the probe point is somewhere the geometry actually occupies"*), and it
recurred even while deliberately watching for it. Re-probed at open floor: all clear.

---

## 2. Two floor plans — DELIVERED, NOT YET EXECUTED

Two Fable 5 agents produced complete interior specs for the buildings whose shells were raised
earlier. **Both surveys found substantial content inside those shells that was never surveyed
before the shells went up.** That is a real process failure on my part: the shells were sized from
*fitting* clusters, and nothing checked what else occupied the volume.

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
Still Room, Balcony, Craft Loft. 37 stacked chests become 38 openable ones in trapdoor-shelved
racks.

### Both plans include

Exact do-not-touch lists, masked-replace build orders, `replace air ->` for every fill near
existing fittings, lighting plans with named coordinates, and explicit flags for what could not be
determined offline — chiefly **entities**, which a region snapshot cannot see. Both say: check the
pen and pond for animals in-game before draining.

---

## 3. Honest status

Built and verified: the Moot Hall in full, both basements and every venue in them.

Not built: the two interior plans above. They are large — the Grange Hall alone is ~330
stone_bricks, ~290 planks, 38 chests and a nine-phase order — and each begins with demolition
inside a building containing other people's property. They should be executed deliberately, with
the entity check first, not appended to the end of a long session.

The audit at `audits/ravensreach.yaml` does not yet assert on any of the new hall levels or on
either interior. Those assertions should be written *from the plans* once the plans are built —
writing them beforehand would encode intent rather than measurement, which is the mistake this
whole tooling effort exists to stop.
