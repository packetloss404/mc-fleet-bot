# R11H C1 Hydraulic-Isolation Bridge, Stations 1189..1206

Date: 2026-08-22  
Release node: `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR`  
Status: **FIRST ATTEMPT STRICTLY STOPPED / COMPENSATED RECOVERY ACCEPTED / SUPERSEDED BY RETRY-V2**

R11H is a substantial, bounded 18-station C1 highway construction package on
the accepted R11F post. It places a 355-cell, one-component, max-step-one
surface; clears 667 exact obstruction cells for 710 cells of two-block
headroom; and builds 636 dry foundation cells plus a five-cell transverse
stone-brick beam. Three source gravel contacts are stabilized first on their
unchanged durable terminals. Total exact targets are 1,666.

The generic at-grade fill would have extended 110 cells into four columns
adjacent to nine water and 19 lava cells. Those deep cells are deliberately
omitted. Only three-cell upper deck haunches are retained in those columns,
and the five-cell beam face-connects every haunch to dry, terrain-founded
columns. All 28 fluid states and both face-connected fluid components remain
unchanged at a minimum Chebyshev distance of two from every target; the exact
7,120-cell operated halo contains zero fluid. This is a Minecraft-domain
static bridge/embankment treatment, not a drainage-capacity, external
discharge, route-commissioning, or real-world engineering claim.

The operated union is disjoint from every accepted release present in the
R11F source, rail/utility/road-collection reservations, C01, the Data District
crossroad, protected relics, block entities, saved entities, containers,
active mechanisms, and the sheep interface. The 110 omitted deep cells and
all retained fluids are outside the operation packages.

Canonical artifacts:

- `data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json`
- `data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-dependencies.forward.txt`
- `data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-dependencies.rollback.txt`
- `data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-structure.forward.txt`
- `data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-structure.rollback.txt`
- `data/world-review/combined-zones-r11h-c1-hydraulic-isolation-bridge-20260822T031000Z/`

Offline gates pass: 1,666/1,666 source guards, 1,666/1,666 exact reverse
records, both projected rollback preflights, four strict-noop parser plans,
generic manifest QA, block-entity clearance, the real wrapper `--print-plan`,
focused deterministic regression, and the backend build. Offline QA payload:
`0460535c9e63fc89e3fd649981299969d1d150370c91301fdc88b5779d3e0c56`.

No RCON call or world edit was performed during the original offline compile.
The later attempt described below used the guarded scoped wrapper.

## First-attempt recovery

The first guarded attempt stopped at structure line 909 when dirt at
`(1529,68,-251)` naturally spread to grass after the fresh source capture.
Strict-noop remained enabled. The wrapper compensated all 1,663 structure
records and all three dependencies, then captured an immutable recovery.

Independent recovery audit proves the exact sparse 7,120-cell operated halo
differs from the fresh source only at two targets, both bounded dirt-to-grass
lifecycle transitions: `(1529,68,-251)` and `(1540,68,-238)`. That exact halo
contains zero source or recovery fluid. The separate 7,561-cell hydraulic
review set records bounded fluid settlement outside the operated halo and now
has a 45-cell, one-component lava baseline at minimum target distance two.
The 60,840-cell broad screen has 51 fluid/air transitions, those two lifecycle
changes, zero solid damage, and both local source blocks unchanged. Recovery
acceptance identity:
`9941594dc2f744af576efbddfc6eac3bf9fe954517347bbd52f49c4ba0f24adb`.

The historical failed-attempt ledger remains immutable. Retry-v2 uses distinct
operation files and does not weaken the parser or wrapper.
