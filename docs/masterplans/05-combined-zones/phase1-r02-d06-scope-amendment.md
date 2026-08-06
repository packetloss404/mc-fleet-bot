# Combined Zones R02 D06 scope amendment (owner-decided dispositions)

**Status:** OWNER_AMENDMENT_RECORDED_UNDERGROUND_DRY_SHELL_SCOPE

The first R02 compile aborted fail-closed on three genuine findings. The owner
decided all three dispositions explicitly (project conversation, 2026-08-06/07,
recommended options confirmed):

1. **Bee nest (1849,66,145)** — RELOCATED before excavation via the accepted
   operator-RCON method; see `phase1-d06-bee-relocation-executed.md`. The cell
   is now clear; the container guard stays in force.
2. **Surface-exposed cells (1,282 found)** — DEFERRED. R02 excavates the
   underground shell only: any to-air cell that is surface-exposed in the bound
   fresh save (only air above it to the build limit) and whose layer is not
   `surfaceDesignated` is excluded from R02 scope instead of aborting the
   compile. The excluded set is computed deterministically from the bound save,
   counted, hashed, and listed in the manifest; those cells become a later
   surface-structures release together with the egress/vent headhouses.
3. **Aquifer / fluids (70 found)** — DEFERRED WET ZONE. Any target cell whose
   source state is a fluid (water, lava, waterlogged) is excluded, plus every
   to-air cell face-adjacent (6-neighbour) to any fluid source cell in the save
   (1-cell dry buffer) is also excluded. The excluded wet set is computed
   deterministically, counted, hashed, and listed in the manifest; a later
   release designs a proper sealing liner for the wet pocket.

Compile rule change: the two deferral rules convert those two abort guards into
deterministic scope exclusions. The container guard remains a hard abort. The
T02 audit's bijection target becomes (frozen domain union) MINUS (the two
computed exclusion sets), recomputed independently with the same rules against
the same bound save.

Bound fresh save for R02 compilation:
`data/worldsnap-combined-zones-complete-save-20260806T235706Z`
(completeSaveSha256 `a3406b87558f1890e51824dbf1ee3140154ce8b820f3f4592b6aead0d559d4c5`,
intake audit `phase1-complete-save-intake-audit-20260806T235706Z.json`, PASS).

Base decision record: `phase1-r02-d06-scope-and-material-decision.json`
(identity `b6e97dbccdaf58b2b13ade4554f6b0bb5cbcd0d2fc24ad755f15a8ec18dcf7ff`) —
its material mapping is unchanged by this amendment.

World edits authorized by this record: **none**.
