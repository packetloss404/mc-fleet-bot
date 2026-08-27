# RRCH-MOOT-UPPER-ROOMS — Ravensreach Moot Hall upper-stack room completion

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE**

Release: `RRCH-MOOT-UPPER-ROOMS` · Scope: `RAVENSREACH-CIVIC` · 2026-08-24

## What was built

Finished the four Moot Hall upper-stack rooms (Committee Room, Clerks Hall,
Meeting Room, Attic Store) strictly within the interior `x=-91..-71`, keeping
the `x=-92` partition wall and the accepted `CIVIC-RRCH-MOOT-UPPER-SPINE`
(`x=-100..-92`) untouched.

| Room | Target cells | Programme |
|---|---|---|
| Committee Room | 54 | Corrected the 7 floating RRCH-MOOT-01B fixtures with polished-deepslate support columns from the void bottom to each fixture; added a 3-cell oak-planks committee table + 2 dark-oak chairs on the walkable north ledge (y77, z=-357). |
| Clerks Hall | 18 | Added 6 work desks (oak_planks) + 6 records islands (bookshelves) on the raised floor band edges, 4 sea-lantern lights, a polished-deepslate level directory, and an identifiable dark-oak-stair access threshold marker on the west interior face. |
| Meeting Room | 18 | Added a 3×3 oak-planks meeting table, 4 dark-oak chairs, a 3-cell bookshelf display/notice wall on the west wall, and a polished-deepslate + sea-lantern wayfinding beacon toward the common stair. |
| Attic Store | 237 | Added a 221-cell spruce-planks enclosure/ceiling at y93 over the floor footprint, 12 storage shelving (bookshelf) cells, 3 light posts + 3 sea-lanterns, and a controlled staff threshold marker (stair + polished-deepslate marker) on the west interior face. Stays a staff/service room, not public. |

**Total: 327 exact-air guarded transitions**, all air→solid additions with
exact inverses.

## Evidence

- Ledger: `data/world-review/rrch-moot-upper-rooms-live-20260824T161000Z/`
- Forward execution: **327/327 changed, 0 failed, 0 no-op** (strict-noop)
- Block-entity clearance: **31 examined, 0 blocking** — lectern
  (`-89,75,-360`) and chiseled bookshelf (`-97,75,-360`) untouched
- Live-entity clearance: **0 hits** across all four packages
- Source preflight: **PASS** (54/54, 18/18, 18/18, 237/237)
- Strict-noop parser dry-runs: **PASS** (forward + rollback, all packages)
- Rollback post-state preflight: **PASS** (54/54, 18/18, 18/18, 237/237)
- Post-state verify: **327/327 target cells match forward desired state**
- Source snapshot: `data/worldsnap-moot-upper-source-20260824T160900Z`
- Post snapshot: `data/worldsnap-moot-upper-post-20260824T161200Z`

## Boundaries retained

- `x=-92` partition wall and upper spine (`x=-100..-92`) untouched;
- lectern, chiseled bookshelf, cartography table, note block, and every
  existing container/block entity preserved;
- existing tree foliage in the Committee Room void untouched;
- Attic Store remains a controlled staff/service room — no public egress or
  public access claim.

## Authority

Expanded owner directive 2026-08-24 ("I authorize all work all plans all
areas") recorded in
`docs/masterplans/05-combined-zones/OWNER-DIRECTIVE-EXPANDED-ALL-AREAS.md`.
