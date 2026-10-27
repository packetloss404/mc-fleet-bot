# R10A · Cheyenne secure approach gallery

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, AND REVERSIBLE**

Release node: `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`  
Package release: `CZ-R10A-CHEYENNE-SECURE-APPROACH-GALLERY`  
MVP scope: `true`

## Exact package

R10A fits out the final 33 level points of the accepted P1-B03 Cheyenne
J-curve, centerline indices `768…800`. The gallery runs west from
`(2080,166,-868)` to `(2048,166,-868)` and remains wholly inside Z10.

The package changes only the 594-cell one-block exterior shell around the
existing route:

- 398 polished-granite wall and ceiling cells;
- 155 smooth-stone floor cells;
- 36 polished-blackstone-brick cells forming two open reinforcement frames;
- five exact sea-lantern ceiling fixtures.

The full 660-cell, 5×4 R03 route remains air and face-connected. The exact
20-cell stone cap at `x=2047` remains untouched and fail-closed, so this
package does not excavate or open the future Cheyenne chamber and does not
commission an access-control mechanism. The upstream 20-cell route section at
`x=2081` also remains exact air.

This is independent of the remaining summit work. Its target is 35 clear Z
blocks from the nearest B09 proposal envelope, with zero proposal-bounds
intersection.

## Guarded result

| Package | Operations | Forward SHA-256 | Rollback SHA-256 |
|---|---:|---|---|
| Cheyenne secure gallery liner | 594 | `0884111910079e342f26626a4ccc8e72d25b93f189bf54dea245f1bcf3f16c1d` | `b198e3c8721852e4c977b6bb81633885c9629f8bf456e4eb7b7c3f2b85ce8efd` |

The [release manifest](../../../data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json)
has identity
`3f17222f3ee456833429babf50811e604bea50b3f99ab39293b8ba23ffd0fd8c`.
Every forward guard is exact `minecraft:stone`; rollback restores that exact
R05 shell state in reverse order.

The original compiler was bound to the accepted R09A post complete save
`data/worldsnap-combined-zones-r09a-post-20260821T163535Z`, identity
`ae68ac762092df0cff0203e87926eb8f809166e44231ca68a1e1eda6fd1b50cb`.
Its exact operation halo contains only stone and air, with zero fluid,
container/control block, block entity, saved movable entity, or protected
relic intersections.

The only prior-operation intersection is the complete 594-cell R05 `b10-bulk`
stone shell that this fit-out intentionally finishes. There is zero target
intersection with the R03 route, R02 mechanisms, or any other accepted
package. The inverse restores the R05 state exactly.

Independent offline evidence in
[`combined-zones-r10-cheyenne-secure-gallery-preflight`](../../../data/world-review/combined-zones-r10-cheyenne-secure-gallery-preflight/)
passes:

- manifest QA: 1/1 package and 594 unique targets;
- source preflight: 594/594;
- projected rollback preflight: 594/594 with the exact forward overlay;
- block-entity audit: zero blockers;
- strict-noop forward and rollback parser checks: PASS;
- scoped wrapper `--print-plan`: accepted with the complete preparation
  kernel.

## Live execution and post-release acceptance

R10A executed on 2026-08-21 through the scoped atomic release runner. The
[terminal evidence ledger](../../../data/world-review/combined-zones-r10a-live-20260821T163935Z/evidence-ledger.json)
records `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`; all 16 stages are `PASS`.
The strict run changed 594/594 groups with zero failures and zero no-ops.

The fresh execution source complete-save identity is
`7d0ee0324d533bfd52fd158f7942c23311627efccd1f616083a4699ad2133c26`.
The immutable [post complete save](../../../data/worldsnap-combined-zones-r10a-post-20260821T163935Z/)
has identity
`bb667794a20a2a580ba322eef19e60ac50bf51ff81ba5537702b26036c829486`;
its region identity is
`bd4c325d66ff83ada72273c98fc7b881d9c861736df2f1a92c1aa8bd7ddb004c`.
The completed transaction retains manifest identity
`3f17222f3ee456833429babf50811e604bea50b3f99ab39293b8ba23ffd0fd8c`
and execution binding
`fffe0dd8d1a7cd15250976af47559752ecf00571392d3dfc18343bd499efb002`.

The independent read-only [post-release QA seal](../../../data/world-review/combined-zones-r10a-live-20260821T163935Z/r10a-post-release-qa.md)
is `PASS_R10A_CHEYENNE_SECURE_GALLERY_POST_RELEASE_ACCEPTED`, with payload
SHA-256
`88db997f951847d624608eba8a0a20800c9bb5631b4334ff23bf2f56323ee60a`.
It verifies:

- 594/594 exact liner states with the compiled material census;
- 660/660 preserved route cells as air in one face-connected component;
- 20/20 preserved terminus cells as the fail-closed stone cap;
- 594/594 strict execution groups with zero failure or no-op;
- 594/594 rollback guards against the immutable post snapshot.

The machine-readable QA artifact is
[r10a-post-release-qa.json](../../../data/world-review/combined-zones-r10a-live-20260821T163935Z/r10a-post-release-qa.json).

## Execution boundary

The deterministic compiler is
`scripts/compile_combined_zones_r10_cheyenne_secure_gallery.mjs`. R10A
completed its fresh same-invocation source capture, source and projected
rollback preflights, block-entity and live-entity clearance, strict-noop
journaled execution, distinct post capture, exact liner/route/cap QA, and
post-state rollback preflight. The post-release QA script and seal are
read-only and made no RCON call, service mutation, or world edit.

Remaining R10 work is deliberately separate: the contact sequence, Cheyenne
chamber excavation and spring-mounted internal program, working access
controls, and summit fit-out each require their own exact package and real
dependencies. None is opened or implied by R10A.
