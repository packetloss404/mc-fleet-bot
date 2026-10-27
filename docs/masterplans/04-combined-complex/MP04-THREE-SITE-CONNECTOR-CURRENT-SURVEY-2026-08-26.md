# MP04 three-site connector current survey — 2026-08-26

Status: **HOLD — NO BOUNDED FUNCTIONAL THREE-SITE CONNECTION CANDIDATE**

This is a read-only current-source survey. It compiled no operation, made no
capture, and changed no world cell.

## Current source

The primary source is the complete BKR save captured at `2026-08-26T09:51:54Z`:
`data/worldsnap-bkr-survey-00-source-20260826T095145Z`. It contains all three
site regions in one immutable moment—B08 `r.3.-2.mca`, B03 `r.4.-2.mca`, and
B07 `r.4.-1.mca`—plus 42 entity-region files, 35 POI-region files, and
`level.dat`. The 52-region hash is
`4a223e74b349fd9f6c7b8925deaadcb42bc84e8d36f4cd0bab7bfc8c3cf11a0b`.

This supersedes only the old **source-coverage** objection in the earlier MP04
setout. It does not create a connection or transfer ownership to MP04.

## Current connection map

```text
B07 upper component                    unowned / unsurveyed connector space
(91 cells, both ends closed)           ~281 blocks plan distance
  wet + unsupported-gravel holds  ────────────────────────────────────x  B08 west service aperture
                                                                        (unlined, uncommissioned)
                                                                             |
                                                                             | physical bore contact
                                                                             v
                                                                   B09 12-cell isolation cap
                                                                   + guideway + authenticated cart
                                                                             |
                                                                        no usable receiver
                                                                             v
                                                                   B03 indices 0–187
                                                                   63 must-stay obstructions
                                                                             |
                                                                             v
                                                                   B03 indices 188–800
                                                                   closed passive inspection only
                                                                   → retained Cheyenne cap
```

### B08 → B03

The bore touches at `(2048..2049,130,-748)`, which is air, but this is not a
functional connection. The immediately adjacent B09 west isolation cap is the
12-cell polished-diorite barrier at `x=2050`, `y=129..132`, `z=-749..-747`.
The lower guideway also carries the retained passive rail and authenticated
R12R minecart at `(2058.49,130.0625,-747.5)`. B03 indices `0..187` contain 63
must-stay B09/portal obstructions; only indices `188..800` are commissioned
for closed passive internal inspection.

### B07 → B08

The known B07 top point `(2108,72,-398)` and B08 west aperture representative
`(1947,72,-628)` are about 281 blocks apart in plan. There is no exact,
owned, dry, inspected corridor between them. The B07 upper component is closed
at the lower R09J isolation cap and at the doorless headhouse hold. It retains
five water cells around `(2110..2111,5..6,-396..-395)` and an unsupported
gravel terminal at `(2104,29..30,-396)` above air at `(2104,26,-396)`.

### B03 → B07

The B03 passive component ends at the retained 20-cell Cheyenne cap; B07 has
no receiver attached to it. Neither endpoint is externally opened.

## Ownership and release consequences

MP04 has no independent current-world cells. B03, B07, B08, and B09 are MP05
domains. A line drawn between anchors is not a release corridor. In particular,
the B08/B03 contact cannot be used to open B09, and the B07 headhouse cannot
be treated as an exterior endpoint.

The rejected MP02 B08 service-spine transaction provides no alternative:
its 729-cell forward was exactly rolled back after a ten-cell conflict with
retained B08 route openings, and no MP02 floor remains as-built.

## Required before a real three-site package

- An MP05-owned exact interface contract for B07/B08/B03 and B09 separation.
- A dry, gravity-safe B07 route and a bounded B07-to-B08 corridor with exact
  terrain, protected-core, fluid, and ownership evidence.
- An engineered B08 receiver/transfer that preserves or explicitly handles the
  B09 barrier, guideway, and minecart.
- A fresh release kernel immediately before mutation, including entity and
  block-entity clearance, exact inverse, strict preflights, journalled
  execution, post snapshot, rollback preflight, and route verification.

The full machine-readable evidence is
[`mp04-three-site-connector-current-survey-20260826T102200Z.json`](../../../data/world-review/mp04-three-site-connector-current-survey-20260826T102200Z.json).
