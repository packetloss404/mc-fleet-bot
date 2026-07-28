# GrandStreet America attached-garage engineering basis

Date: 2026-07-28 UTC  
Package: `ATTACHED-RESIDENTIAL-GARAGES`  
State: **coordinate basis complete; guarded physical release not yet generated**

## Decision

The owner’s correction is controlling: every residential garage must be
attached. The accepted R1 7×7 garage pavilions are real as-built history, but
they are no longer acceptable current design.

The measured capacity schedule is:

| Class | Houses | Basis |
|---|---|---|
| Six-car | `H01`, `H07` | 6,011 and 5,979 verified square feet |
| Four-car | `H03`, `H08`, `H09`, `H10` | 3,223–4,138 verified square feet |
| Two-car | `H02`, `H04`, `H05`, `H06`, `H11`, `H12`, `C02`–`C07` | below 3,000 square feet or unverified cottage-scale C-series villa |

The large-house garage counts are not labels applied to small rooms. A
four-car garage has four independent single-depth clear bays and four
three-wide portals. A six-car garage has six independent clear bays and six
three-wide portals. Tandem stacking is not used to inflate capacity.

The exact coordinate schedule is
[`mainstreet-attached-garage-engineering-schedule.json`](mainstreet-attached-garage-engineering-schedule.json).

## Survey provenance

The schedule was checked against the immutable 03:15 UTC town-expansion
snapshot:

`data/worldsnap-town-expansion-complete-baseline-20260728T0315Z/region`

Its nine-region aggregate SHA-256 is:

`0bb1faa61ca69724816afe682080e3a517fa974ec1300c3651e399ea03505501`

The database was opened read-only. It contains eighteen complete detached
garage features, `R4-GAR-H01` through `R4-GAR-H12` and `R4-GAR-C02` through
`R4-GAR-C07`. No live-world or database writes were made during this survey.

The complete proposed shell-and-attachment census found:

- 18 residential parents;
- 18 attached replacement or absorption envelopes;
- zero block entities in any proposed envelope;
- zero water or lava cells in any proposed envelope;
- zero exact road-surface overlaps after resolving the width-three alley
  centerlines rather than relying on their broad database bounding boxes; and
- zero principal-front-door changes.

The broad database bounds for both alleys overlap several garage bounding
boxes on paper. That is a false positive. The exact point-and-width check is
the controlling collision test. In particular, the H08, H09 and H12 outer
faces were pulled inward so none occupies a shifted `ALLEY-E` cell.

## Attachment strategy by row

### West H row

`H01`–`H06` keep their east-facing Main Street entrances and use the existing
west garage door line. Their new shells grow from the old pavilion toward the
house until the garage and house are face-adjacent. The only house-shell
change is the enumerated three-wide mudroom threshold.

This keeps the existing `ALLEY-W` grades and aprons, reuses most R1 garage
material, and avoids placing garage doors in the front gardens.

- `H01` opens into the cross hall between the two formal-room bounds.
- `H02`, `H04` and `H05` open at kitchen/dining service edges.
- `H03` opens through a great-hall service vestibule, away from the front
  door.
- `H06` opens at the formal-dining service edge beside the center hall.

### East H row

`H10`–`H12` use the same direct rear expansion toward their parent walls.
`H08` and `H09` retain their existing high vehicle grades but convert the
vertical difference into full occupied attached stair/mudroom wings.

`H07` cannot simply stretch its current pavilion toward the house: that would
either occupy the `ALLEY-E` terminal or create an oversized token connector.
Its six-bay motor house instead runs along the north house wall at floor Y72.
A full enclosed three-rise core lands on the Y69 gallery/great-room level.
The old pavilion shell is dismantled; its slab becomes an explicitly
non-garage motor-court/charging overlook.

`H08` receives a four-bay Y71 garage with an enclosed stair serving both the
Y64 kitchen edge and Y69 level. `H09` receives a four-bay Y77 hillside motor
gallery with a full-height occupied stair wing to the Y64 kitchen edge. That
wing is part of the building envelope from foundation to garage; a decorative
bridge or one-block neck would fail.

### C-series villas

The six C-series houses remain smaller two-car programs, but every one becomes
attached.

- `C04`, `C06` and `C07` connect at Y64.
- `C02` uses the measured R02 grade at Y69 and an enclosed five-rise stair. It
  moves north of its parent specifically to avoid `R05`; the earlier south
  concept crossed Garden Cross and is rejected.
- `C03` and `C05` retain their Y78/Y79 R03 vehicle grades. Their garage shells
  absorb the useful R1 material and include full-height switchback stair
  wings down to Y64.

The high east-villa stairs are a deliberate response to measured terrain, not
a claim that a flat driveway exists. They require authored sections and
normal-walk simulation before operations can be released.

## Old-pavilion disposition

Fifteen current feature IDs represent the same garage object expanded into its
parent and should be updated in place only after QA:

`R4-GAR-H01`–`H06`, `R4-GAR-H08`–`H12`, `R4-GAR-C03`–`C05`, and
`R4-GAR-C07`.

Three replacements are materially relocated. Their old features should be
marked `removed`, retain prior geometry/evidence, and point to a successor:

| Old feature | Successor | Old-site reuse |
|---|---|---|
| `R4-GAR-H07` | `R6-ATT-GAR-H07` | motor-court/charging overlook |
| `R4-GAR-C02` | `R6-ATT-GAR-C02` | R02/R05 bicycle and rain-garden lay-by |
| `R4-GAR-C06` | `R6-ATT-GAR-C06` | visitor lay-by and bioswale |

No old structure may remain named or visually legible as a detached
residential garage. Clean stone brick, polished andesite, quartz and dark-oak
material should be reclaimed into the new shells; landscape conversions must
receive distinct non-garage feature identities.

## Collision and room protection

The garage shells do not modify principal façades. The enumerated attachment
cores are the complete permitted house-intersection list. The generator must
fail if it targets:

- a furnishing or any block entity;
- a front door, portico, stoop or principal walk;
- an accepted stair;
- a floor plate outside the connector core;
- an exact alley, road or cross-street surface cell;
- fluid, gravity-sensitive or waterlogged neighbor cells without a reviewed
  treatment; or
- any cell outside the immutable-snapshot guard set.

The snapshot census is necessary but not sufficient. A same-moment snapshot
must repeat the zero-block-entity, zero-fluid and road-width checks before
live execution.

## Physical release contract

The next implementation stage must:

1. compile the schedule into exact one-cell `REPL` operations and an exact
   reverse rollback;
2. preserve operation ordering for plants, connected blocks and
   support-dependent blocks;
3. preflight every source state against the same-moment snapshot;
4. run forward and rollback parser checks with `--strict-noop`;
5. clear players and fleet entities from every operation envelope;
6. apply retirement, absorption, shell, connector, apron and wayfinding cells
   as one coordinated transaction;
7. verify four or six visible bays where assigned;
8. normal-walk both directions from each house interior through its garage to
   the serving road;
9. take matching exterior, portal, bay, threshold and route screenshots for
   every residence; and
10. only then update the database, catalog, atlas, dossier, Sites source and
    Box handoff.

The database update must preserve prior geometry and R1 evidence, record
capacity and portal count, and never leave both an old detached record and a
new attached record current for the same physical garage.

## Release decision

**GO for guarded generator engineering. NO-GO for live mutation from this
document alone.**

This memo resolves the owner’s attached-garage correction at measured
coordinate and database-contract level. It does not claim that the physical
retrofit has been executed.
