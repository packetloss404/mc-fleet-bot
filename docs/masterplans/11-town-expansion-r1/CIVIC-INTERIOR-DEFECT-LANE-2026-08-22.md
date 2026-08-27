# Civic interior defect lane — current as-built decision record

Status: **upper-spine repair released and accepted; room-programme repairs
remain separately scoped**

This is the physical-defect review lane requested for MainStreet H11, the
Ravensreach Library, MainStreet's warehouse/basement, and Ravensgate and
Ravensreach civic interiors. It deliberately distinguishes a genuinely
complete room from a room which merely has a walkable centre line.

## Current source and method

The source is the frozen complete save captured at
`data/worldsnap-civic-interiors-source-20260822T180000Z`:

- complete-save identity:
  `a0d12c2670070c2f0cedc656b953c7d210114b5188afbca14e47d846755b6a10`;
- region identity:
  `52ceda87193149c9d7170c3865887893c400d0169e912a8ac48d22efec01f164`;
- intake: `data/world-review/civic-interiors-source-20260822T180000Z/complete-save-intake.json`
  (`PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE`);
- detailed census:
  `data/world-review/civic-interior-defect-audit-current-20260822T180000Z.json`.

The census checks copied Anvil data only. It proves the presence or absence of
rooms, stairs, ladders, light, fixtures, and enclosure material. It **does not**
certify clear width, usable landings, door behaviour, or public egress. The
cross-section requirements in
`circulation-correction-packages-2026-08-22.md` therefore remain binding.

## Findings and disposition

| Scope | Current evidence | Disposition |
|---|---|---|
| MainStreet H11 / The Midtown | Four named levels; 15 stairs; no ladders; four catalogued rooms are fitted. | No physical defect found. Retain it; do not rebuild a functioning compact house merely because it is compact. A future public-route claim still needs CIRC-QA-CORE-01 dimensional evidence. |
| Ravensreach six-level civic library | Six named levels; 38 stairs; no ladders; all eight registered rooms are fitted. | No contained repair is justified. Its existing vertical route needs a width/landing survey before being promoted beyond its present civic use; this is not evidence that the library is a half-built shell. |
| MainStreet B03 Service Warehouse / lower logistics | 48 × 46 × 11 registered envelope, only four lights, and **no** registered floor or room programme. The current warehouse-portal-to-dry-hall route fails in both directions. | Incomplete programme, not a cosmetic defect. Hold new fitout behind `CIRC-MSA-PORTAL-01`; it must first separate the 7-wide vehicle route from a 3-wide pedestrian walk and provide 5×5 level arrival vestibules. |
| Ravensgate civic interiors | Four registered civic structures; the campanile is multi-storey; no ladders/missing-stair condition; all seven registered rooms fitted. | No physical release. The below-grade Ravensgate exclusion stays default-deny; neither a basement nor a shortcut may be created from the Library or Loggia. |
| Ravensreach Moot Hall upper civic stack | The four south-side rooms at supports Y73–87 are two empty and two severely under-detailed. The old two-wide bell-core switchback was not a compliant primary civic stair. The bounded replacement `CIVIC-RRCH-MOOT-UPPER-SPINE` is live: a 7-wide × 6-high two-flight core with 7-deep landings, bidirectional normal-walk proof, exact rollback, and no entity/block-entity collision. | The vertical defect is repaired. Committee/Meeting/Attic programme remains separately incomplete; do not hide that by calling the whole stack complete. |

The current census also finds eight `cave_air` cells at the Moot Hall's outer
south-east interface (near x=-73..-70, y=40..42, z=-341). They meet natural
terrain and an existing fence/cobweb detail. They are not an authorised plug
target; a blind `fill` here could erase an intentional interface.

## CIVIC-RRCH-MOOT-UPPER-01 — remaining room-programme repair package

Purpose: finish the upper civic stack as a coherent small public building, not
as a sequence of isolated furniture drops. The package owns the **surveyed**
upper-room repair only; it does not touch Ravensgate, the Library/Guild secret
passage, B1/B2, natural cave interfaces, or the south-east edge above.

### Known program and protected conditions

| Level | Registered room | Current condition | Required end state |
|---|---|---|---|
| Y73 | Committee Room | Under-detailed, with fragmented rather than demonstrated room circulation. | A meeting chamber with an unobstructed 5-wide common path, wall-facing furniture, full lighting, and a clear vestibule to the stair. |
| Y78 | Clerks Hall | Empty. | An open records/work hall with a 5-wide central aisle, grouped work islands outside that aisle, and a 5×5 stair landing. |
| Y83 | Meeting Room | Under-detailed, without a demonstrated finished floor/enclosure programme. | A fully enclosed meeting room with a continuous finished floor, 5-wide perimeter circulation, and no furniture in the egress envelope. |
| Y87 | Attic Store | Empty; its registered volume is largely air. | A proper top-level store/plant room with finished floor, roof/ceiling, controlled staff threshold, and a separate 3-wide staff circulation zone. It is not a public destination. |

### Non-negotiable geometry

- Replace the inherited two-wide bell-core stair as the primary upper civic
  route. A major civic stair must be **7 wide × 6 high**, have a 1-rise/2-run
  rhythm, and land on 7×7 level landings. If that footprint cannot fit in the
  surveyed shell, make the upper rooms controlled/staff-only and do not claim
  public access.
- A 5-wide × 5-high common spine must join every finished upper room to the
  primary stair landing. Each door starts from a level 5×5 vestibule; no
  threshold opens directly onto a tread.
- A staff-only top-level aisle may be 3 wide × 3 high, but it must reach a
  common area through the controlled threshold and never masquerade as an exit.
- Furnishings stay outside the measured clear envelopes. One-block stairs,
  ladders, trapdoors, alternating treads, jumps, and furniture-clogged aisles
  are prohibited as primary circulation.
- The two independently separated directions requirement applies once an
  upper room is treated as occupied. A stair landing is not a second route by
  itself.

### Compiler input schedule

The new compiler must first resurvey the source snapshot's candidate envelope
`x=-100..-70, y=73..94, z=-392..-341`, then narrow the actual changed-cell set
from that survey. It must publish all of the following before RCON is allowed:

1. exact protected shell, room, existing-stair, natural-interface, container,
   block-entity, and fluid/gravity cell sets;
2. a floor/ceiling/clearance plan and a route-class record for each room;
3. the exact target cells and one-cell interaction halo, with no target outside
   the surveyed repair volume;
4. point-exact forward and reverse operations derived from the fresh source;
5. a dimensional QA result for every route station: width, headroom, stair
   rise/run, landing rectangle, door-side clearance, and separated endpoints.

### Required guarded release and acceptance

Use a fresh complete save (not this earlier source) for the actual release.
The hard-safety kernel is mandatory: source intake, complete source states,
exact inverses, container/block-entity and protected-core clearance, live
entity clearance, strict-noop forward and rollback parser checks, exact source
preflight, journalled execution, fresh post snapshot, rollback post-state
preflight, and post-state route/cross-section QA. A full architectural package
may be staged, but a stage cannot claim the rooms complete until its common
spine and landing meet the dimensional gate.

## Release order across this review lane

1. Implement CIRC-QA-CORE-01 so route width and landings are measured rather
   than inferred from a walker centre line.
2. Release CIRC-MSA-PORTAL-01 before planning B03 warehouse occupancy.
3. Survey and compile CIVIC-RRCH-MOOT-UPPER-01 from a new complete save.
4. Re-run the interior census and bind its result, cross-section QA, and
   live-route evidence into the unified Master Plan.

This record is deliberately actionable without pretending that a dated map or
an empty room is proof of a safe architectural finish.
