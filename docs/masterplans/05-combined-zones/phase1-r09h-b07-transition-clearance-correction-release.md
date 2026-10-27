# Combined Zones CZ-R09H: B07 transition-clearance correction

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED; ROUTE NOT COMMISSIONED  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Manifest identity:** `bd6956937446fa89b119df85e6daca21415ff2892f72195966d8d0d0259904e4`  
**Source:** accepted R09G post `data/worldsnap-r09g-post-20260822T020232Z`,
complete-save SHA-256
`123df9eb90e212c7de7497b189f28b41ee5ca03603d4f4dee2ba6c0895dd1e00`

CZ-R09H is the smallest exact correction of the inherited R09E/R09F upper
transition-clearance conflict. It removes only the polished-diorite cells at
`(2108,62,-395)` and `(2109,62,-395)`, restoring both to their R02-authored
air state. The two one-cell guards have coordinate-set SHA-256
`9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10`.

This package corrects geometry only. It does not open the exterior door or
lower wet interface, modify fixtures or mechanisms, or commission a public or
fire-service route. Commissioning requires a separate functional and
post-release acceptance after execution.

## Transition and containment proof

The compiler derives the exact two targets from accepted R09E and R09F
geometry, verifies their source state in the immutable R09G post, and proves:

- projected head clearance is 222/222 air cells;
- the 216-cell fall boundary retains 214 full-collision cells plus exactly two
  internal floor-backed apertures;
- each aperture has an exact top smooth-stone slab at `y=60`, air at `y=61`,
  and a retained full-cube ceiling at `y=63`;
- the ordered primary seam rises one half-block and the largest lateral
  floor-backed surface drop is one block;
- no fall to an unfloored void or exterior opening is created;
- the 49-cell lower wet containment deck and all eight R09G fixtures remain
  unchanged;
- all six sand cells in the 36-cell interaction halo have exact durable
  support chains, and neither target removes a support;
- the halo contains no fluids, active mechanisms, woody hazards, block
  entities, saved entities, or protected relics.

The overlap is explicitly reviewed: both target cells were R02 excavation air
and later R09F containment. There are zero unreviewed prior-target
intersections and zero undeclared prior-release intersections.

## Frozen guarded artifacts

- Compiler:
  `scripts/compile_combined_zones_r09h_b07_transition_clearance_correction.mjs`,
  file SHA-256
  `debb84435c3a5147ff075c0880842e7337d25e116e4727532fc0125470088597`.
- Manifest:
  `data/buildops/combined-zones-r09h-b07-transition-clearance-correction.release-manifest.json`,
  file SHA-256
  `ab6e2895972ca91edfe65dd0b37a0c9fe8629856b37b248bf0b9538b95d062b0`.
- Forward operation:
  `data/buildops/combined-zones-r09h-b07-transition-clearance-correction.b07-r09e-r09f-transition-clearance-correction.forward.txt`,
  operation-body SHA-256
  `750aad8530fc4303e149419675b714805cdefa5c0c644c80580692f915e17918`,
  file SHA-256
  `d687ee8dfc1df0267951fc413c282d1a64db77a06c3ccb545aaaad6960368626`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r09h-b07-transition-clearance-correction.b07-r09e-r09f-transition-clearance-correction.rollback.txt`,
  operation-body SHA-256
  `5d0ce02dbcda3423354b4fe8a2c99ed3031eba3d8199c17c68b9633d8b489c68`,
  file SHA-256
  `dd11f72e93550f2fc41aa90abf757b63191feaeb789c1f92c1ee44d9c2d780a0`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r09h-b07-transition-clearance-correction-offline-20260822T021500Z/`.
Manifest QA, exact forward source preflight, projected rollback preflight,
strict-noop forward and rollback parser checks, block-entity clearance,
immutable saved-entity clearance, and the real scoped wrapper `--print-plan`
all pass. The wrapper plan retains the fresh live-entity clearance as a
mandatory execution-stage gate.

The canonical offline seal is
`PASS_R09H_B07_TRANSITION_CLEARANCE_CORRECTION_OFFLINE_RELEASE_READY`, with
12/12 checks and report identity
`d7e434c94e15e7114b8f586e0eece825820768790c431984e0e43315c1652604`.
Its file SHA-256 is
`a76fbb702ccaefa0e637af0377cdc30ec587f7fc25b9be946ffcc02715f7fe51`.
The focused deterministic regression passes 8/8.

No live system was contacted and no world or service state was mutated while
compiling, preflighting, testing, or documenting CZ-R09H. Any execution must
use `scripts/run_combined_zones_scoped_release.mjs` with release node
`CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute the operation file directly.

## Executed post-release seal

The guarded wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its immutable evidence ledger is
`data/world-review/combined-zones-r09h-live-20260822T022248Z/evidence-ledger.json`,
SHA-256
`224c6075450e1e1b3ed259c723ae3c4152687e4ff5d3a71f7493ea25c1856ae8`,
and completed-release identity
`dd404c710c3f05caa1908afd5f8c38ca95360c8e03a9612f97199329d152dfd5`.

Independent post QA is
`PASS_R09H_B07_TRANSITION_CLEARANCE_POSTSTATE_VERIFIED_REVERSIBLE`, 16/16.
It verifies both exact air states, the ordered 111-surface half-step route,
222/222 air clearance, the 214-cell collision boundary plus two floor-backed
internal apertures, all six supported sand cells, 17/17 wrapper stages, the
complete 10-entry journal, and 2/2 rollback guards. Its payload SHA-256 is
`798da0552e482a230f98047b36be294b936ae96d8c3ef1c29ee2a36038ef1a47`;
the report file SHA-256 is
`4fa5d36d01317e1803a4eb14c3a5e138e61633ccacc6078bca95056d4a76f8e8`.

The only non-operation difference in the complete 13,608-cell B07 interaction
domain is a normal grass-to-dirt lifecycle transition at `(2107,62,-394)`
beneath an unchanged opaque R07J polished-diorite pier. It is outside the
operation targets, creates no support loss, and leaves zero unclassified or
mechanism drift. R09H still does not commission the route: the separate R09I
screen identified an inherited unsupported-gravel boundary lower in the
stair.
