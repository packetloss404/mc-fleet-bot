# Raven Rock Mountain Complex (Site R) — Open Questions (Cross-Integration Review)

## ✅ DECIDED 2026-07-24 (orchestrator sign-off, all six closed)

| Item | Decision | Implementation status |
|---|---|---|
| **OQ-1** | **(b) RELOCATE the shaft head** — not reserve. N9 moves out of MSA's east greenbelt. **Separately, the four ±285 portal-approach corridors ARE reserved as no-build** in MSA's perimeter plan. | **Coordinate propagation DONE 2026-07-24.** N9 = **(200, 64, −15)**, x∈[193,207], z∈[−22,−8] now consistent across `coordinates.yaml`, `site-plan.md`, `buildings.yaml`, `qa/qa-report.md` (§2 table, §3, SP-02, SP-08), `integration/map-marker.yaml`, `integration/location.yaml`. The retained OQ-1/OQ-7 rationale bodies keep the old figures but now carry a SUPERSEDED banner. Portal-corridor reservation: see the row below. |
| **OQ-2** | **(a) DE-OP the builder bots** once construction is accepted, then apply WorldGuard protection. Applies to both builds. | Pending — post-build action. |
| **OQ-3** | **Both:** ratify the cavern **light-level standard** (`lighting_palette`) across all walkable/occupied volumes **AND** set WorldGuard **`mob-spawning: deny`** on the region. | Pending. NOTE: this file's "stock Paper, no plugins" premise is **false** — WorldEdit 7.4.0 + WorldGuard 7.0.16 are installed. |
| **OQ-4** | **(a) HARD y41 guardrail** enforced in the build scripts / dig routines; refuse any block edit above y41, single whitelisted exception = the RR-Z5 shaft column (now x∈[193,207], z∈[−22,−8]). | Pending — must be wired before any carving starts. |
| **OQ-5** | **(a) LINE-THEN-FLOOD** — liner complete + enclosure verified before any water source is placed. Acceptance check = `qa/qa-report.md` BU-10. | Pending — build sequencing. |
| **OQ-6** | **(a) SURVEY AND SCULPT** the ±285 portal-mouth terrain before carving the tunnels behind it. | Pending — pre-carve step. |

*The original items are retained verbatim below as the rationale of record. Where a coordinate below conflicts
with the decision table, **the table wins**. Specifically: OQ-1 relocated the RR-Z5 shaft head to
**(200, 64, −15)**, footprint **x∈[193,207], z∈[−22,−8]**; the pre-relocation **x∈[113,127], z∈[53,67]**
still appearing in the retained bodies is superseded and must not be copied into build scripts,
region definitions, or the OQ-4 guardrail whitelist.*

---

These are items the **cross-integration review** (Raven Rock ↔ MainStreet America, and the shift to opped
bots on stock Paper) surfaced that **require a human/orchestrator decision**. They are **OPERATIONAL**
decisions, NOT factual/arithmetic/coordinate errors (those were corrected in place) and NOT changes to any
building's coordinate or geometry. Each gives the options and a recommendation, but **none is decided
here.** Until now Raven Rock carried no open-questions file because the planning set was internally
consistent (see `qa/qa-report.md` §3); these are the first genuine judgment calls.

Confidence vocabulary is inherited from `../references/manifest.yaml` (never upgraded). None of these
items demands historical interior accuracy — that remains a category error (`qa/qa-report.md` §0).

---

## OQ-1 — RESERVE the RR-Z5 shaft head + the four portal approaches as no-build zones in MSA's UNBUILT surface plan

**This is the one genuine cross-build conflict between Raven Rock and MainStreet America.** Everything
else about the two builds is vertically separated by the ~20-block greenstone buffer and never shares a
block. But two Raven Rock elements reach the **MSA surface plane (y64)** and therefore compete for the
same surface real estate that MSA has **not yet built** (parking fields, warehouse, landscaping — see the
MSA as-built survey's "not yet built" list):

- **The RR-Z5 vertical-shaft head-house N9 at (120, 64, 60)**, footprint **x∈[113,127], z∈[53,67]**. It
  sits in MSA's **east greenbelt/parking flank**. A large **east parking field** in MSA's surface plan
  could **overrun the shaft head** — the shaft is at x=120, only 50 blocks east of MSA's x=+70 footprint
  edge, well within reach of a parking apron or service drive.
  > ⚠️ **SUPERSEDED — this is the problem statement as originally posed, retained as rationale.** OQ-1
  > was decided **(b) relocate** on 2026-07-24: N9 is now **(200, 64, −15)**, footprint
  > **x∈[193,207], z∈[−22,−8]**. Do not copy the coordinates in this paragraph into anything.
- **The four portal mouths at the ±285 envelope edges** (N3 south, N4 north, N5 east, N6 west) and their
  **surface approaches**. These are outside MSA's built footprint but could collide with perimeter
  landscaping, berms, or an outer access road if MSA's surface plan extends to the envelope edge.

**Options:** (a) formally **reserve** the shaft-head footprint (x113–127, z53–67 **plus a margin**, e.g.
±5 blocks) and the four portal-approach corridors as **no-build zones** in the MSA surface plan; or (b)
**relocate** the shaft head (a labeled deliberate liberty per GAP-05 — it is droppable/movable without
affecting the four buildings or four portals); or (c) accept a clash and resolve it ad hoc at build time
(not recommended).

**Recommendation:** adopt **(a)** — reserve the shaft-head footprint + margin and the portal approaches
as no-build zones in MSA's surface plan **before** MSA lays out east parking/warehouse/landscaping. It
costs MSA almost nothing (the shaft head is small and already sited in a greenbelt flank), preserves the
convenience link, and avoids moving a feature both builds reference. A one-line pointer to this item has
been added to `mainstreet-america/planning/open-questions.md` so the reservation is visible from the MSA
side. **Decision required; do not lay MSA east surface features until closed.**

---

## OQ-2 — Protection model now that the builder bots are OPPED (level 4)

The bots are now opped (level 4, per the MSA as-built survey / `ops.json`); the earlier "bots not opped"
premise across the planning docs was stale and has been corrected in place. Consequence: **opped bots
BYPASS WorldGuard `build:deny`.** So even if WorldGuard were later added, region protection would **not**
restrain the bots — the "protected envelope" stays a planning boundary, not an enforced one.

**Options:** (a) **de-op the bots after the build** so ordinary region/whitelist protection can guard the
finished complex; (b) keep bots opped but move to **member-based / owner-based editing** (WorldGuard
region membership, or a build-permission plugin that respects op) — noting op still overrides most of it;
(c) accept an unprotected build guarded only by server access control.

**Recommendation:** plan for **(a)** — de-op the builder bots once construction is accepted, then apply
whatever protection the server standardizes on — but treat this as an **open decision** pending the
orchestrator's server-security posture. This interacts with MSA (same bots, same server), so decide it
**once for both builds.**

---

## OQ-3 — Cavern LIGHTING standard to suppress mob spawns (no WorldGuard `mob-spawning:deny` will exist)

On stock Paper with **no plugins**, there is no WorldGuard `mob-spawning:deny` flag to keep hostile mobs
out of the large dark cavern voids. The blasted caverns (Cavern A is ~52 blocks tall) are exactly the kind
of unlit volume that spawns hostiles, which would make the complex hostile to visitors and un-inspectable
for the "walkable by an un-opped bot" tests (`qa/qa-report.md` BU-08, SF-family analogues).

**Options:** (a) adopt a **light-level standard** (keep every walkable/occupied cavern and corridor at
light ≥ the mob-safe threshold using the `lighting_palette` already in `palettes.yaml` — sea_lantern
grids, glow_lichen fill, lanterns) so spawns are suppressed **by light alone**; (b) rely on gameplay
difficulty/peaceful settings (fragile, server-wide, not build-intrinsic); (c) do nothing and accept dark
voids (not recommended — breaks the visitor read and the walkability checks).

**Recommendation:** adopt **(a)** — a documented cavern lighting standard that guarantees mob-safe light
across all walkable/occupied volumes, since no plugin flag exists to do it. The palette blocks are already
specified; this item asks the orchestrator to **ratify the standard** (target light level + coverage rule)
so it becomes a build requirement, not a nicety. **Open pending sign-off.**

---

## OQ-4 — Excavation Y-ceiling guardrail (no edits above y41) to protect the 22-block buffer under the live MSA road

Raven Rock is carved **beneath a build that is now partly live** — MSA's road spine sits at y63 and its
foundation at y62 directly above parts of the envelope. The only thing keeping the two builds from
colliding is the **22-block greenstone buffer (y41→y61)**. A bot digging a cavern ceiling or a tunnel
that strays **above y40/y41** would thin or breach that buffer under the live MSA surface.

**Options:** (a) impose a **hard excavation Y-ceiling guardrail — NO edits above y41** anywhere in the
Raven Rock build (the RR-Z5 shaft at **x∈[193,207], z∈[−22,−8]** is the single sanctioned exception, and
it is east of every planned MSA element — corrected 2026-07-24 from the pre-relocation x∈[113,127], which
would have whitelisted empty rock and refused the real shaft) — enforced in the bot build scripts / dig
routines; (b) rely on per-task review to catch
stray-high digs (weaker); (c) no guardrail (unacceptable — risks breaching the buffer under the live road).

**Recommendation:** adopt **(a)** — a build-script-level guardrail that refuses any block edit above
**y41** except the whitelisted RR-Z5 shaft column. This directly protects the `qa/qa-report.md` SP-02/
SP-03/SP-04 constraints and the live MSA road above. **Open pending the orchestrator wiring it into the
dig routines.**

---

## OQ-5 — Watertight-basin sequencing for the Cavern C reservoirs

Cavern C (RR-Z3) holds the two reservoir basins (N7) at the deepest point of the complex (sump y−18).
Placing **water** in a blasted-rock basin on stock survival mechanics needs the basin to be **watertight
and fully lined before flooding**, or water will find gaps, flow across the cavern floor, and flood the
Power & Ventilation Plant (RR-B4) beside it. This is a **build-sequencing** question, not a geometry one.

**Options:** (a) mandate a **line-then-fill sequence** — the bot completes the full `Z-RESERVOIR`
prismarine/concrete liner and verifies enclosure **before** any water source is placed, filling from the
top with source blocks in a contained grid; (b) fill opportunistically and patch leaks (error-prone
underground); (c) use waterlogged/contained placement tricks (fragile).

**Recommendation:** adopt **(a)** — a documented "liner complete + enclosure-verified → then flood"
sequence for both basins, with `qa/qa-report.md` BU-10 ("water only in intended basins, no leaks") as the
acceptance check. **Open pending sign-off on the build sequence.**

---

## OQ-6 — Verify / sculpt the portal-mouth terrain at the ±285 edges BEFORE carving

The four portal mouths (N3/N4/N5/N6) open in a **rock face at the envelope edge** (floor ~y18) at x/z ≈
±285. But the natural surface terrain at those edges is unknown/ungraded (the MSA as-built survey found
natural terrain rising to ~y120 elsewhere on the map). A portal mouth needs a **believable hillside rock
face** to open into; if the terrain there is flat, sheer, or already carved by MSA grading, the "portal
into the mountain" read fails.

**Options:** (a) **survey the ±285 edge terrain first** (terrain-scan API / F3) and **sculpt a greenstone
hillside/headwall** where needed so each portal reads as set into rock, before carving the tunnels behind
it; (b) carve portals blind and fix the mouths afterward (risks rework); (c) relocate any portal whose
edge terrain won't support the read (portals are [CREATIVE] positions, so movable).

**Recommendation:** adopt **(a)** — verify and, where needed, sculpt the portal-mouth terrain at the
±285 edges before carving, using the `Z-PORTAL` headwall palette against the greenstone hillside. This is
a **pre-carve** step; flag it so it isn't discovered mid-build. **Open pending sign-off.**

---

*None of the above changes any building coordinate, footprint, floor, ceiling, or the confidence labels
in the planning set. They are operational decisions for the orchestrator, recorded so they are not lost —
the mirror of `mainstreet-america/planning/open-questions.md`.*
