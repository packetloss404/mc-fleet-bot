# Combined Zones R05 FM-01 mountain scope and material decision

**Status:** OWNER_DECISION_RECORDED_R05_MOUNTAIN_BUILD

Owner authority: explicit owner selections (project conversation, 2026-08-07):
**"Build it"** — construct the FM-01 future mountain now — and **"Entomb
naturally"** — the fill covers existing terrain features inside the footprint
(standard practice for artificial mountains; all three protected relic cores
are proven outside the footprint by the composite zero-overlap evidence).

## Scope

The reshaped P1-B10 composite construction domain: **14,684,824 cells**
(baseline FM-01 14,768,553 minus the 2,432 south-open no-build columns /
83,729 cells of the accepted shipwreck reshape). The build must derive the
reshaped set exactly and verify it against the committed composite identities
(composite canonical payload `94eb21c4d72303bf…`) before compiling.

## Materials (accepted FM-01 family rules)

- **Bulk interior**: `minecraft:stone`.
- **Exposed finish** (cells on the mountain's designed outer surface): below
  y130 `minecraft:smooth_stone`; y130 and above `minecraft:polished_diorite`,
  per the accepted D05 support-material design. The family classification is
  recomputed with the committed rules against the reshaped set; family totals
  are reported and hash-accounted (baseline totals: 14,580,291 / 77,395 /
  110,867 shift slightly under the reshape).

## Entombment and operation strategy

- Cells whose current source is air merge into guarded column-run box
  operations (air → family state) — the vast majority.
- Cells colliding with existing terrain/vegetation are entombed with exact
  per-cell guarded operations (source read from the bound save).
- Everything stays inside the strict-noop guarded runner doctrine: exact
  source guards, exact inverse rollback, hash-bound forward/rollback pairs.
- Already-at-target cells are accounted, not emitted.
- CONTAINER GUARD stays a hard abort. FLUID sources are entombed only if
  fully enclosed by the fill; fluid cells on the footprint boundary or with
  any face-adjacent fluid neighbor outside the footprint are deferred as a
  hash-accounted wet class (no aquifer/ocean interaction).
- Cells already excavated by earlier releases inside the footprint (Empty
  Eight voids, B07) are OUT of this domain by the one-owner partition; the
  compiler must verify zero intersection with the R02 operated set.

## Rollback doctrine

Exact inverse guarded rollback files are emitted per package. In addition the
bound pre-build save is the disaster-recovery restore source. Post-build, the
rollback files must preflight against the post save before finalization.

## Bound source

`data/worldsnap-combined-zones-complete-save-20260807T001212Z`
(completeSaveSha256
`d0aa5693bdd5e3de001787ba3f8c6e86dad8879e7e7ef6af186159a10cd11b98`, intake
PASS). No world change since capture.

World edits authorized by this record: **none** (G14 authorization follows
the gate chain as always).
