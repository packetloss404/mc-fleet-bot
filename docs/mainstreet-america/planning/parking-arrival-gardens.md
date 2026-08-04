# MainStreet America parking — Arrival Gardens implementation brief

**Status:** built and verified 2026-07-26; see
`docs/mainstreet-america/qa/parking-recovery-2026-07-26.md`
**As-built lot:** `x[-125,125] z[172,268]`, surface `y64`

## Recovery outcome

The initial survey below is retained because it is the evidence that triggered the
recovery. The executed desired state comprises three tracked files:

- `mainstreet-parking-arrival-gardens-2026-07-26.txt` — 1,354 commands;
- `mainstreet-parking-access-wayfinding-phase8b-2026-07-26.txt` — 84 acceptance
  corrections, including the full gate width and hangar wayfinding;
- `mainstreet-parking-low-lighting-phase8c-2026-07-26.txt` — 28 flush lights.

All 1,466 commands succeeded. The merged final state contains 41,809 unique target
cells and the refreshed snapshot matches all 41,809. The build has 236 individually
registered bays: 205 standard, eight accessible, fourteen EV-marked, and nine
full-depth premium spaces. The database record is scan `wsc_9b65b3830e226db9`.

The proposed four full-width garden spines were not used: cutting them through the
parking bands would invalidate the documented capacity. The as-built composition
instead uses the paired center gardens, six crosswalks, perimeter walks, southeast
rain garden, Discovery Court, canopy rooms, lamp rhythm, and low flush lighting to
divide the slab without deleting bays.

## Evidence and primary defect

P01 contains 24,347 surface cells: 21,509 light-gray concrete, 1,245 smooth stone,
674 white concrete, 506 grass, and 413 stone bricks. The white concrete is only three
long east/west bands at z196, z224, and z252. There are no individual stall stripes,
blue/yellow priority markings, parking-field lamps, or support amenities.

The south arrival is not merely unfinished; it is disconnected. The smooth-stone
spine reaches `(0,65,268)`, but `(0,65,269)`, `(0,66,269)`, and `(0,65,300)` are
stone. The south gate opening at x `[-10,10]`, z305 stands around y78 and is
unreachable from the lot. The west edge remains informally traversable, but it is not
a designed public entrance.

## Protected masks

No generator may write inside these boxes without a dedicated integration review:

| Asset | Protected bounds |
|---|---|
| Guest Center/portico | `x[-72,72] z[90,176] y[63,83]` |
| Center loop | `x[-20,20] z[172,220] y[63,74]` |
| Axial drive | `x[-6,6] z[172,275] y[63,74]` |
| Mountain/public-entry buffer | `x[96,125] z[168,239] y[45,110]` |
| Billboard | `x[84,106] z[267,278] y[63,82]` |
| Fence/gate ring | x/z `±301..305` |

Surface work must preserve everything below y64. “Drainage” in this phase is visual:
flush catch-basin details and rain gardens, not destructive subgrade channels.

## Design: Texas Arrival Gardens + Discovery Court

The goal is four legible parking rooms around a formal arrival, rather than one gray
field.

### P0 — reconnect the south gate

Build a terraced carriage approach from lot level y64 at z268 to gate level y78 near
z305:

- carriageway x `[-6,6]`;
- pedestrian strips x `[-9,-7]` and `[7,9]`;
- retaining walls, planted terraces, arch ribs, and warm lighting;
- keep x `[-10,10]`, z299..305 clear and preserve the gate piers at x±11;
- preserve the billboard at x `[84,106]`, z `[267,278]`.

This phase is accepted only when `(0,65,268)` and the gate standing position near
`(0,79,305)` are in the same reachability flood.

### P1 — real aisles, stalls, and priority parking

Use three nine-block drive aisles:

- z `192..200`;
- z `219..227`;
- z `246..254`.

Use six nine-block parking bands: z `183..191`, `201..209`, `210..218`, `228..236`,
`237..245`, and `255..263`. Stripe on a five-block pitch, but generate and count every
bay before claiming the historic 236-space capacity.

The executed geometry defines 227 bays across parking bands A–F plus nine full-depth
premium bays at x `[-121,-78]`, z `172..181`, for exactly 236. Eight band-A bays form
two four-space accessible pods. Their shared blue access aisles occupy x `[-41,-21]`
and `[21,41]`, z `180..182`, with three-deep, step-free connectors to the axial Guest
Center walk.

### P2 — garden courts, pedestrian spines, and lighting

The initial four full-width spine concept was rejected during capacity compilation:
it would have deleted documented stalls. The executed design uses compact curb islands,
paired center gardens, six crosswalks, perimeter walks, a southeast rain garden, and
Discovery Court to break the slab into legible rooms without reducing capacity. Palette:
stone-brick and smooth-stone curbs; coarse/rooted dirt; oak/dark oak; flowering azalea,
pink petals, and ferns. The final lighting system has 23 dual-head poles plus 32 flush
sea-lantern fixtures; unpowered copper bulbs are decorative only.

The central loop becomes a ceremonial pedestrian axis and pair of formal gardens.
Relocate or design around the oak whose trunk currently occupies the axial drive at
`(-3,65..70,190)`. Keep the Guest Center sightline open.

### P3 — Mountain Discovery Court

The east arrival is coordinated with the finished mountain portal. The built court
occupies x `[87,95]`, z `[183,209]`; x `[96,125]`, z `[168,239]` remained a strict
no-touch mask. The preserved existing approach beyond that boundary connects the
court to the portal, and the final reachability flood passes court → portal → lobby →
hangar.

Program: polished-andesite arrival fan, directory, seating, photo/art point, shuttle
shelter, bicycle corral, planted retaining edge, and a verified step-free connector to
the public portal. It must read as a destination, not overflow parking against a cliff.

### P4 — two solar/EV canopies and Festival Row

Two above-ground boxes were empty in the post-repair survey:

- west canopy x `[-116,-84]`, z `[256,266]`, y `[65,72]`;
- east canopy x `[52,84]`, z `[256,266]`, y `[65,72]`.

Use polished-blackstone supports, tinted/black glass panel roofs, oxidized-copper trim,
underside sea lanterns, and blue charging heads. Keep y65..69 clear. The south aisle
can double as closable “Festival Row” for markets and events while remaining normal
parking circulation.

## Generator and QA gates

Surface changes were compiled from a refreshed region snapshot. The deep south
approach was an explicitly reviewed excavation exception and therefore used absolute
desired-state `SET` operations; an immutable pre-build snapshot was retained at
`data/worldsnap-parking-before/region`. Acceptance proved:

- zero missing chunks and zero protected-mask intersections;
- zero unexpected final targets or duplicate targets;
- exactly 236 individually defined bays;
- minimum nine-wide drive aisles and three-wide pedestrian paths;
- two curb openings per planted island;
- no pole/support inside a drive aisle or accessible route;
- protected-box before/after diffs of zero;
- parking entrance → Guest Center and all representative court targets reachable;
- lot → south gate reachable after P0;
- nearest functional light no more than 12 blocks from sampled walks/aisles;
- same-camera BlueMap day and night captures pass visual review.

Final result: 66/66 campus assertions pass, three protected volumes are byte-for-byte
block-equivalent before/after, the largest sampled light distance is 11.18 blocks,
and south gate → lot → Guest Center → Discovery Court → mountain portal → hangar →
arena is connected.
