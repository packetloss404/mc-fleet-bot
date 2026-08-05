# Combined Zones Phase 1 D06 mechanism closure contract

Status: **PARTIAL_PASS_EXACT_D06_RESERVATION_AND_FAILURE_CONTRACTS_ALL_MECHANISMS_D06_G02_HOLD — OFFLINE ONLY — ZERO OPERATIONS**

This artifact is the strongest deterministic D06 mechanism-development record supported by current evidence. It validates exact candidate reservations and defines fail-closed mechanism and commissioning contracts. It does not claim that a stair, lift, vent, smoke door, platform gate, circuit, drain, fire route, or B07 system has been built, opened, commissioned, or shown compliant with any real-world code.

Mechanism-development payload SHA-256: `b72caab86d0acbc72f4f423fb236472cf077a23f64cf25558ea7b384eb4d6167`

## Exact candidate systems

| System | Count | Exact evidence | Current disposition |
|---|---:|---|---|
| Protected stair/lift cores | 2 | 3,381 full-core reservation cells | HOLD — mechanisms null; routes uncommissioned |
| Local vent risers | 4 | 900 capped reservation cells | HOLD — outlets, fans, ducts, controls null |
| Smoke boundaries | 2 | 2,744 complete fail-closed cells | HOLD — door mechanisms null |
| Platform barriers | 8 | 1,616 complete fail-closed cells | HOLD — powered gates null |
| Lighting/power | 3 | 56 fixture cells; zero circuit cells | HOLD — normal + emergency A/B null |
| Local drainage | 8 | 24 local cap cells; sealed header/boundary | HOLD — receiver/discharge null |
| Fire/service access | 1 | 3,025-cell internal spine; sealed interfaces | HOLD — external route null |
| B07 west-two | 1 | 8,134 excavation / 13,608 interaction cells | HOLD — 38 water cells and mechanisms unresolved |

All 73 owner-packet manifest references reproduce against their exact source JSON pointers, counts, bounds, and coordinate hashes. These are reservation, retained-cap, and current-snapshot identities only. Accepted mechanism, circuit, future, construction, material, and operation cell counts remain zero.

The two external egress continuations are dry, disjoint, separated by 193 horizontal blocks, and identical to the D05 reference contract: EG-A has 1,274 continuation cells (546 stair / 234 lift) and EG-B has 833 (357 stair / 153 lift). Their physical openings remain unauthorized.

## Failure and fluid boundary

Every system defaults to capped, closed, unavailable, and uncommissioned when its mechanism, power, control, owner, interface, failure logic, or acceptance evidence is missing. The normal circuit and two independent emergency-circuit slots are explicit, but all three exact circuit manifests are null. The 29 commissioning records are frozen test contracts only and cannot be executed by this artifact.

B07-C-WEST-2 retains the exact 38 current water cells and one waterlogged state as unresolved inputs. D02 accepts zero receivers, zero future-fluid cells, and zero discharge exceptions; D05 remains unready and explicitly lists D06 mechanism cell sets as HOLD. No receiver, outfall, fluid treatment, or discharge is inferred.

## Acceptance matrix

| Criterion | Result | Scope | Current evidence |
|---|---|---|---|
| D06-MC-01-SOURCE-BINDINGS | **PASS** | source identity | All ten direct inputs are file-hash and byte-count bound. |
| D06-MC-02-OWNER-PLANNING-ACCEPTANCE | **PASS** | planning authority only | Owner acceptance 45fab3ea31163b24d7242cfe7a262d80ae906c411422effe8756c75fb436ab7d freezes D06 policy while passing zero technical HOLDs. |
| D06-MC-03-EGRESS-RESERVATIONS | **PASS** | candidate geometry only | Two disjoint full protected-core reservations and two dry, disjoint external-continuation references reproduce exactly. |
| D06-MC-04-VENT-RESERVATIONS | **PASS** | candidate geometry only | Four pairwise-disjoint capped riser reservations total 900 cells and are dry and structure-clear in the bounded audit. |
| D06-MC-05-SMOKE-STATIC-CAPS | **PASS** | fail-closed geometry only | Two 1,372-cell complete boundaries retain 72 total static opening-cap cells. |
| D06-MC-06-PLATFORM-STATIC-BARRIERS | **PASS** | fail-closed geometry only | Eight 202-cell complete barriers retain 192 total static gate-cap cells. |
| D06-MC-07-FIXTURE-RESERVATIONS | **PASS** | candidate geometry only | Eight seven-cell sea-lantern fixture reservations reproduce, totaling 56 cells. |
| D06-MC-08-DRAINAGE-CAPS | **PASS** | default-no-discharge control only | Eight three-cell local caps, 24-cell union, nine-cell header, and nine-cell boundary cap reproduce; receiver remains null. |
| D06-MC-09-FIRE-SERVICE-RESERVATIONS | **PASS** | sealed candidate geometry only | FIRE-EG-B binds a 3,025-cell spine, zero-cell transfer, 35-cell closed interface, 49-cell compound, and 21-cell sealed approach. |
| D06-MC-10-B07-CURRENT-GEOMETRY | **PASS** | candidate geometry and current census only | B07-C-WEST-2 binds 163 centerline points, 8,134 excavation cells, 13,608 interaction cells, and the exact current 38-water-cell finding. |
| D06-MC-11-COMPLETE-SAVE | **HOLD** | source completeness | Fifty-six candidates were audited and zero are complete same-moment saves. |
| D06-MC-12-STAIR-LIFT-MECHANISMS | **HOLD** | two protected and accessible routes | Stair, lift, refuge/transfer, emergency operation, and control mechanism manifests are null. |
| D06-MC-13-VENT-SMOKE-MECHANISMS | **HOLD** | ventilation and smoke control | Four outlets remain closed; ducts, fans, controls, smoke scenarios, thresholds, and door mechanisms are absent. |
| D06-MC-14-DOOR-GATE-MECHANISMS | **HOLD** | openings and platform barriers | All smoke doors and eight powered gate mechanisms are null; operational authority count is zero. |
| D06-MC-15-NORMAL-CIRCUIT | **HOLD** | normal lighting circuit | The normal circuit path, source, controls, and accepted fixture-coverage result are null. |
| D06-MC-16-EMERGENCY-CIRCUIT-A | **HOLD** | independent emergency circuit A | Emergency circuit A and its independent source/control contract are null. |
| D06-MC-17-EMERGENCY-CIRCUIT-B | **HOLD** | independent emergency circuit B | Emergency circuit B and its independent source/control contract are null. |
| D06-MC-18-DRAINAGE-HYDRAULICS-RECEIVER | **HOLD** | Minecraft-domain drainage | Inflow, storage, freeboard, pump/control, future-fluid, receiver, recovery, and discharge inputs are unaccepted. |
| D06-MC-19-FIRE-SERVICE-EXTERIOR | **HOLD** | external fire/service access | The external approach route and emergency-service technical acceptance are null/false. |
| D06-MC-20-B07-WATER-LINING-SUPPORT | **HOLD** | B07 technical design | All 38 excavation water cells, one waterlogged state, lining/support, stair/lift transfer, drainage, smoke, and power treatments are unresolved. |
| D06-MC-21-CONTROLS-FAILURE-LOGIC | **HOLD** | system controls | Accepted control manifests and accepted failure-logic count remain zero. |
| D06-MC-22-OWNERS-INTERFACES | **HOLD** | canonical authority | All nine owner slots are null and accepted interface-contract count is zero. |
| D06-MC-23-COMMISSIONING | **HOLD** | functional evidence | Twenty-nine deterministic commissioning test contracts exist; all are non-executable and have no evidence. |
| D06-MC-24-INDEPENDENT-TECHNICAL-OWNER-ACCEPTANCE | **HOLD** | acceptance identity | Owner planning policy is accepted; independent system reviewers and technical-identity owner acceptance are absent. |
| D06-MC-25-D06-G02-CLOSURE | **HOLD** | release gate | D06 and R00 G02 remain unresolved; zero mechanisms are commissioned and every opening stays closed. |

Current result: **10 PASS / 15 HOLD**. PASS is limited to source identity, accepted planning policy, exact reservation geometry, bounded current-snapshot findings, and fail-closed static-cap/no-discharge controls. Mechanisms, complete-save evidence, physical openings, commissioning, operations, owners/interfaces, independent technical review, the separate owner acceptance of a complete technical identity, D06, and R00 G02 all remain HOLD.
