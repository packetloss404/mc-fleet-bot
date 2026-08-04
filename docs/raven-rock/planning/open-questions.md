# Raven Rock Mountain Complex (Site R) — Open Questions (Cross-Integration Review)

## ✅ DECIDED 2026-07-24 (orchestrator sign-off — the original six, plus OQ-8 raised and closed the same day)

| Item | Decision | Implementation status |
|---|---|---|
| **OQ-1** | **(b) RELOCATE the shaft head** — not reserve. N9 moves out of MSA's east greenbelt. **Separately, the four ±285 portal-approach corridors ARE reserved as no-build** in MSA's perimeter plan. | **Coordinate propagation DONE 2026-07-24.** N9 = **(200, 64, −15)**, x∈[193,207], z∈[−22,−8] now consistent across `coordinates.yaml`, `site-plan.md`, `buildings.yaml`, `qa/qa-report.md` (§2 table, §3, SP-02, SP-08), `integration/map-marker.yaml`, `integration/location.yaml`. The retained OQ-1/OQ-7 rationale bodies keep the old figures but now carry a SUPERSEDED banner. Portal-corridor reservation: see the row below. |
| **OQ-2** | **(a) DE-OP the builder bots** once construction is accepted, then apply WorldGuard protection. Applies to both builds. | **Still pending — and the ORDER is now load-bearing.** As of 2026-07-25 the regions EXIST (`mainstreet_america`, `raven_rock`, `raven_rock_shaft`, `ravensreach` in world `world`) but carry **only** `mob-spawning: deny`. The `build` / `block-break` / `block-place` / `chest-access` / explosion / fire flags are **deliberately unset**, because op bypasses them: setting them while the bots hold level-4 op would protect nothing while making the site *look* guarded. Correct sequence: **(1)** accept construction → **(2)** seed `owners`/`members` on all four regions with the human admin UUID(s) (currently empty — `packetloss404` = `dac51b37-928d-35f5-b87a-0fcabb26752a`) → **(3)** `deop` the five bots → **(4)** apply the build/grief flags → **(5)** re-verify. Doing (4) before (3) is a no-op; doing (3) before (2) locks the admins out of their own build. See `qa/oq3-worldguard.md`. |
| **OQ-3** | **Both:** ratify the cavern **light-level standard** (`lighting_palette`) across all walkable/occupied volumes **AND** set WorldGuard **`mob-spawning: deny`** on the region. | **DONE 2026-07-25.** Lighting standard: built and verified (`qa/build-log.md`). `mob-spawning: deny`: **applied** to all four regions above — it did *not* have to wait for OQ-2, since op bypasses `build: deny` but not `mob-spawning`. This file's "stock Paper, no plugins" premise was **false** (WorldEdit 7.4.0 + WorldGuard 7.0.16 installed) and every doc repeating it has now been corrected. Caveat: `difficulty=peaceful` still masks the flag, so it is applied but untested in anger. |
| **OQ-4** | **(a) HARD y41 guardrail** enforced in the build scripts / dig routines; refuse any block edit above y41, single whitelisted exception = the RR-Z5 shaft column (now x∈[193,207], z∈[−22,−8]). | **Code SHIPPED** (`mining.carveCeiling`, default off — a blanket rule would forbid MSA at y64 and Ravensreach at y67). **SCOPE RATIFIED 2026-07-24: the rule binds EVERYTHING, not just bots.** The shipped guard hooks `bot.dig`, which operator `/fill` never passes through — so operator-driven RCON carving is now held to the same y41 ceiling by self-check on every fill's upper bound, with the RR-Z5 shaft column the sole exemption. Rationale: the 22-block buffer sits under a *finished, populated* MSA, and a mistaken fill bound would thin it silently. |
| **OQ-5** | **(a) LINE-THEN-FLOOD** — liner complete + enclosure verified before any water source is placed. Acceptance check = `qa/qa-report.md` BU-10. | Pending — build sequencing. |
| **OQ-6** | **(a) SURVEY AND SCULPT** the ±285 portal-mouth terrain before carving the tunnels behind it. | **RATIFIED 2026-07-24 — full sequence, no shortcut.** Survey and sculpt **all four** mouths *before* any tunnel is cut behind them: **N3 (−150,18,+285)** *(post-OQ-8 relocation)*, **N4 (0,18,−285)**, **N5 (+285,18,−30)**, **N6 (−290,10,+5)**. N6 is the tightest case — only **10 blocks** from the x=−300 envelope edge. |
| **OQ-8** *(new)* | **RELOCATE portal N3** from **(0, 18, +285)** to **(−150, 18, +285)**, co-locating it with MSA's SW service gate. Raised while writing the OQ-1 portal reservation into MSA's plan: N3 sat 3 blocks off the frontage-road centerline and dead on MSA's **x=0 axial entrance spine**, so its no-build corridor swallowed the entrance-drive throat, the frontage crossing and the billboard approach. Same trade as OQ-1 — the portal network is `creative approximation`, MSA's axial arrival is anchored design, so the invented element moves. The SW gate is already back-of-house and screened by Z08 planting, so the portal hides behind a service entrance instead of the front door. | **Coordinates DONE 2026-07-24** across `coordinates.yaml` (N3 node + T2 route + Cavern B note), `integration/location.yaml`, `integration/map-marker.yaml`, `planning/site-plan.md` (§3 tunnel list + overhead diagram), `visuals/raven-rock-NOTES.md`, and MSA's `site-plan.md` Z08-R + `open-questions.md`. **T2 is now a dogleg** — north along x=−150 to a turn at (−150, y2, +190), then east into Cavern B's south wall at its **west end (−45, −10, +130)**, since Z2 spans x[−45,+45] and can no longer be entered axially. ⚠️ **`visuals/level-plans.svg` and `visuals/section.svg` still draw N3 at (0,+285)** — not regenerated. |

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
been added to `docs/mainstreet-america/planning/open-questions.md` so the reservation is visible from the MSA
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

## OQ-3 — Cavern LIGHTING standard to suppress mob spawns (~~no WorldGuard `mob-spawning:deny` will exist~~)

> ⚠️ **The premise in this heading is FALSE and was the whole reason this item read as light-only.**
> WorldGuard 7.0.16 **is** installed; `mob-spawning: deny` is now set on all four regions
> (2026-07-25, `qa/oq3-worldguard.md`). Both halves of OQ-3 are therefore satisfied and they are
> complementary, not alternatives: the flag is the plugin-level guard, the lighting standard is the
> build-intrinsic one that survives a plugin being removed. Body retained as rationale of record.

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

Cavern C (RR-Z3) holds the reservoir (N7) at the deepest point of the complex (sump y−18). **Amended 2026-07-25: a single undivided basin, not two — see docs/DECISIONS-2026-07-25.md.**
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
the mirror of `docs/mainstreet-america/planning/open-questions.md`.*
