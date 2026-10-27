# Combined Zones CZ-R07I: B09 maximal curve/summit-return assessment

**Disposition:** PASS_TO_COMPILE_WITH_EXACT_FOUR_CELL_TURN_APERTURE  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Canonical owner:** `P1-B09-FUNICULAR-FRAMEWORK`  
**Live mutation:** none

The maximal exact dry package after accepted R07H spans frozen FM-01
centerline indices 240…550 inclusive. It includes the complete lower hairpin,
the full westbound face ascent, and the northbound summit-return ascent. It
stops against the accepted 12-cell R07E guideway-approach cap before withheld
index 551. That cap remains physically closed.

The later summit-headhouse opening, Z11 interface, rails, vehicle, drive,
brake, power, controls, drainage, rescue, egress, and commissioning remain
outside the package.

## Current immutable source

The assessment reads only accepted R07H post snapshot
`data/worldsnap-combined-zones-r07h-post-20260821T183544Z`:

- complete-save SHA-256:
  `12df71af54a5e02e092190fa18b1f3d8206d929d507537cc0593318d7c23182e`;
- region SHA-256:
  `6fc61a5e77a930c3a4fdbddc5ed4a26205ec5980aca7825245c57d932a909b81`;
- completed R07H release identity:
  `1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f`;
- accepted R07H QA payload:
  `b849c99bf162da8bbd3eee063d4bab6699b04acaef73652b84612b07a25ed7ed`.

The complete 7,800-cell B09 accommodation contains 5,241 air and 2,559
polished-diorite cells after R07H.

## Required turn-aperture correction

The two cells labeled `retainedFutureCurveSeam` by R07H are at
`(2288,130…131,-748)`. Opening only those two cells does not connect the
eastbound R07H void to the northbound hairpin: centerline index 241 occupies
`(2288,130…131,-749)`, which is still part of the R07H cap collar. The
two-cell-only projection has two disconnected components and must hard-abort.

The minimal complete turn aperture is four cells at `x=2288`, `y=130…131`,
`z=-749…-748`, coordinate-set SHA-256
`9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb`.
All four are exact current polished diorite, all are inside B09 construction
ownership, and all belong to the accepted R07H far cap. The two additional
collar cells are therefore an exact reviewed internal-seam migration, not an
undeclared overlap. Eight R07H cap-collar cells remain sealed around the
turn.

## Exact maximal candidate

The 311 selected points have ordered-segment SHA-256
`020c118a77b14d85a454293c75ad9a62836bd0119044c5573e2286a1558ce67a`.
Their 622 rail/headroom seeds have SHA-256
`6297d5963c2209e0d63d0735c7991922c4273da239189ff3e3ebe34c2839f528`.
The raw Chebyshev-one envelope is 4,740 cells. Subtracting the accepted R07H
Segment 02 and R07E summit-station envelopes leaves 4,710 new-envelope cells:

- 618 preserved new interior-air cells;
- 4,092 new polished-diorite shell cells, all exact source air, SHA-256
  `2c3a65ea063b9022450b183637ec9921c746a7f1d605900dfdc17c6787cff7aa`;
- the four-cell exact R07H turn aperture described above;
- the complete 12-cell R07E guideway-approach cap, retained polished diorite,
  SHA-256
  `8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c`.

The predicted guarded operation count is **4,096**: construct all 4,092 shell
cells first, then open the four turn-aperture cells. Exact rollback must reseal
all four aperture cells first and remove the shell in reverse order. The
operated-set SHA-256 is
`f33fd0ef5f5139261e5408429b2111271b1e776c18dd67c3932db2e6becc269b`.

After projection, the accepted lower station and Segments 01/02 plus the new
curve/ascent form one 1,096-cell connected air void, SHA-256
`2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855`.
Its complete 3,286-cell face boundary projects to polished diorite, SHA-256
`491ab71d982ad1ecce1eb1aea39b7e2bc487d04316c0764e51d6648ea041ab3f`.
The projected interior and boundary have zero mismatches, and the R07E cap
remains closed.

## Static safety and ownership

Every one of the 4,096 operated cells lies inside the frozen 7,488-cell B09
running-guideway construction domain. A scan of every Combined Zones release
manifest finds no intersection other than the exact four R07H cap cells.

The complete 12,692-cell one-block interaction halo has bounds
`x=2046…2290`, `y=128…297`, `z=-820…-746` and state census:

- 9,428 air;
- 2,600 stone;
- 636 polished diorite;
- 28 smooth stone.

The halo contains zero fluid or waterlogged states, gravity blocks, forbidden
container/control blocks, block entities, saved entities, or protected relic
intersections. The 4,092 shell cells are exact source air, all four aperture
cells are exact polished diorite, all 622 route cells are air or the four
declared aperture cells, and all 12 R07E approach-cap cells are polished
diorite. There is no unresolved static blocker.

## Next action

Compile CZ-R07I as a 4,096-operation exact guarded package bound to the R07H
post save and accepted R07H QA identity. The compiler must explicitly reject
the disconnected two-cell aperture and prove the four-cell aperture is the
minimal one-component solution with a complete boundary. Use the R07H
material, shell-first, reverse-order inverse, and fail-closed cap doctrine.
Before live mutation, rerun the fresh same-invocation complete-save, exact
source, strict parser, block-entity, and live-entity gates. Keep the R07E
approach cap and all summit interfaces sealed.
