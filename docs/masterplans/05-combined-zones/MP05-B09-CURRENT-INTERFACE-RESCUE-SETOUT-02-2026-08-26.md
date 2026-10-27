# MP05 B09 current guideway / station interface and rescue setout 02

**Status:** `NO_SAFE_EXACT_FUNCTIONAL_RELEASE_CANDIDATE`  
**Source:** `data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z`  
**Method:** read-only immutable Anvil, endpoint, guideway, and entity-plane
review. No capture, RCON, operation file, minecart action, or world mutation
occurred.

## Current lower-interface map

The map is a current-state decision diagram, not a construction drawing.
`B08` is the default-deny approach seam, `CAP` is the intact B09 west cap,
`VOID` is the only clear lower-shell interior, and `R12R` is the bounded
maintenance-only shuttle reservation.

```text
west                                                     east
B08 seam        B09 lower shell                         R12R maintenance shuttle
x=2047..2049    x=2050..2057                            x=2058..2073

  36 cells  --> [CAP: 12 polished diorite] --> [VOID: 6×2×1] --> [15 unpowered powered rails]
  33 air +      x=2050, y=129..132          x=2051..56     off levers at 2061/2070
  3 floors      z=-749..-747                 y=130..131     tagged cart at 2058.49,130.06,-747.5

  controlled door/receiver: no owner, no source/post/inverse, no failure state
  platform/barrier/route: absent                 passenger/rescue service: not commissioned
```

## Exact current findings

| Requirement | Current evidence | Disposition |
| --- | --- | --- |
| B08/B09 controlled receiver | All 12 cap cells remain polished diorite; the 36-cell B08 seam is default-deny. | No door, cap opening, or receiver release. |
| Platform-edge separation | The 132-cell lower envelope has only a 12-air-cell `6×2×1` void. | Not a platform plus independent normal-walk/edge barrier. |
| Separated service/egress | The 2,250-cell deterministic maintenance reservation has only 14 current air cells in eight disconnected components; required geometry is 6×6. | No route release. |
| Active operating system | 15 unpowered powered rails and two off levers are R12R maintenance controls only. | No drive, brake, overspeed, public, passenger, or rescue claim. |
| Drainage/receiver | The 561-cell under-rail carrier has one air cell and 560 polished-diorite cells. | It is not a sump, flow path, outfall, or receiver. |
| R12R protection | One authenticated minecart remains in the review halo. | Future work must prove non-overlap with fresh clearance or use exact entity-first migration and inverse. |

## Endpoint and rescue map

The design-only right-side C03 sweep follows all 561 canonical guideway points
in a 19,866-cell six-wide/six-high study volume. It has six 3×3 cross-passage
studies at a maximum 112-block interval, but 8,690 cells are non-air and 2,196
are outside minimum B09 accommodation. It is geometry, not a corridor.

```text
RD-LOWER-B08                                      RD-SUMMIT-Z11
C03-XP-000 -> C02 receiver study -> 36-cell seam  C03-XP-560 -> 12-cell summit cap
             CLOSED / default deny                              CLOSED / default deny
             no B08 owner / receiver / rescue test              no Z11 owner / receiver / rescue test

Accepted independent rescue discharges: 0 / 2
```

The lower study is physically distinct from the summit study, but neither has
an accepted directional owner, controlled exit/failure state, safe receiver,
protected continuation, or end-to-end rescue test. They cannot be counted as
rescue exits.

## Required integrated design family

Only one future B09 programme can produce an operation compiler:

1. Accept exact B08/B09 and B09/Z11 directional endpoint contracts, including
   owner, source/post state, inverse, controlled failure state, receiver, and
   protected continuation.
2. Design an owned C02 receiver with platform, physical edge barrier/gates,
   normal-walk approach, and a separate 6×6 service route.
3. Turn C03 into an exact structurally/hydrologically reviewed corridor with
   lockable 3×3 cross-passages, refuge/passing strategy, controlled exits, and
   two proven independent discharges.
4. Supply drain/sump/flow/outfall/receiver, independent power/control,
   drive/brake/overspeed/recovery, and exact R12R non-overlap or entity-first
   migration/rollback design.
5. Only then take a new immediate complete source and run the full guarded
   forward/inverse, entity, strict-noop, journal, post-state, rollback, and
   independent functional QA kernel.

## Current detailed maps and evidence

- [Lower interface plan, y=130](../../../data/world-review/mp05-b09-b08-interface-egress-feasibility-02-current-mp06-post-20260826T143902Z/b09-lower-interface-plan-y130.svg)
- [Lower interface plan, y=132](../../../data/world-review/mp05-b09-b08-interface-egress-feasibility-02-current-mp06-post-20260826T143902Z/b09-lower-interface-plan-y132.svg)
- [C03 guideway/corridor plan](../../../data/world-review/mp05-b09-c02-c03-route-rescue-study-02-current-mp06-post-20260826T143902Z/b09-c03-corridor-plan.svg)
- [C03 guideway/corridor profile](../../../data/world-review/mp05-b09-c02-c03-route-rescue-study-02-current-mp06-post-20260826T143902Z/b09-c03-corridor-profile.svg)
- [Current machine receiver gate](../../../data/world-review/mp05-b09-lower-station-receiver-interface-design-02-current-mp06-post-20260826T143902Z/source-bound-design-hold.json)

