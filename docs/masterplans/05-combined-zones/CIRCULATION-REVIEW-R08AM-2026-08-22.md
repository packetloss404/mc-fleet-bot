# Combined Zones circulation review — R08AM terminal post

Status: **DESIGN CORRECTIONS REQUIRED BEFORE ANY NEW PUBLIC-CIRCULATION CLAIM**  
Date: 2026-08-22 UTC  
Scope: read-only review of accepted Combined Zones/Empty Eight/B07/Cheyenne/B09 evidence, plus the current world-level normal-walk audit.

This is Minecraft design QA, not a real-world building-code certification. It
does not reopen the accepted R08AL/R08AM releases or authorize a world change.
The machine-readable, source-bound finding register is
[circulation-audit.json](../../../data/world-review/combined-zones-circulation-audit-r08am-20260822/circulation-audit.json).

## The correction that matters now

The two internal stairs that feed Empty Eight's public retail gallery are
**one block wide**. The accepted QA proves it exactly: one stair at `x=1728`
and one at `x=1752`, eight treads each, with only two air cells above each
tread. They are mechanically walkable but are not credible public primary
stairs. Do not describe them as finished public-grade circulation.

The R08AM grand stair is different: it is seven blocks wide, 26 steps long,
has five blocks of headroom, a seven-wide lower landing, and ten fixtures. It
is a sound restricted connection from BOH to the lower theatre/private-club
annex. It remains non-public.

## Required design standard for future circulation packages

| Access class | Clear stair width | Clear headroom | Landings | Corridor width |
|---|---:|---:|---|---:|
| Public primary route | 3 blocks | 3 blocks | level 3×3 at each end and each turn | 3 blocks |
| Restricted staff/service | 2 blocks | 3 blocks | level 2×3 at each end and each turn | 2 blocks |
| Major venue / grand route | 5 blocks | 4 blocks | level 5×3 at each end and each turn | 5 blocks |

Every new route package must prove bidirectional normal-walk traversal with no
digging, tower, parkour, sprint, or jump control; a maximum one-block vertical
change per move; exact stair/corridor width; exact headroom; landing cells;
fall containment; door states; lighting cadence; and its preserved interfaces.
For routes longer than 24 blocks, add a readable destination/access marker at
each classification change and at least every 24 blocks. A one-block stair is
permitted only as a visibly labelled non-public inspection/ladder condition,
never as a public primary route.

## Findings and executable design sequence

1. **R08AN — widen the two Empty Eight PF08 public stairs.**
   Survey from a fresh source, then replace the west stair in the design core
   `x=1727..1729, y=41..48, z=146..153` and east stair in
   `x=1751..1753, y=41..48, z=146..153`. Each needs a three-wide flight,
   three clear headroom cells, 3×3 level upper and lower landings, side/fall
   containment, and two-way route QA. Those coordinate cores are survey
   envelopes—not operation targets—and may be adjusted only by a fresh
   compiler/preflight.

2. **R08AO — build the BOH orientation alcove/map room.**
   The BOH's 372-cell continuous service spine and two secured public/staff
   doors are proven. A map room is not. Put a staff-only orientation alcove
   off that spine, not in a public bay. Its static diagram must show the two
   public doors, widened PF08 stairs, secured annex doors, theatre, rear-stage
   door, restricted corridor, cinema/lounges, and all sealed boundaries. It
   must label hazardous/rail/service interfaces as closed and must not open or
   reveal a usable hazard route.

3. **R08AP — make one actual protected public egress adapter.**
   R08AL is public *inside* the gallery only; it expressly does not commission
   surface-headhouse egress, exterior egress, or accessibility. Survey one
   R07G headhouse and connect one widened PF08 landing to it with a protected
   three-wide route. Do not use the rail bed, riser, FIRE-EG-B, fire/service
   spine, utilities, drainage, ventilation, or future-line reservations as a
   shortcut.

4. **Keep the B07 upper/stair holds honest.**
   The B07 lower spiral is safe only to a retained upper hold. The separate
   upper 91-surface component is commissioned only to its closed holds. Its
   indices `0..20`, unsupported gravel, wet interface, exterior opening, and
   active-system interfaces are still local holds. Do not decorate it into a
   fake through-route. First perform a bounded source survey; only then design
   a two-wide restricted stair with 3-block headroom and 2×3 landings.

5. **Keep Cheyenne and B09 correctly classified.**
   The B03 Cheyenne gallery is a proven 3-wide internal inspection route to a
   stone hold point. It is not a public terminal tunnel. B09's passive rail
   and bounded maintenance shuttle are not a hallway. Any future public
   connection needs a dedicated parallel walkway or a separate station
   vestibule—never a repurposed rail bed.

6. **Survey the three world-level gaps independently.**
   The R08AM-bound normal-walk audit passes 19 of 22 representative routes.
   Three local links fail: C01 mountain portal → L1, MainStreet parking portal
   → warehouse drive hall, and observatory hidden entry → portal hub. Compile
   three isolated survey-and-bridge packages. Do not bridge a restricted
   network simply because it is nearby.

7. **Resurvey C01 vertical stairs before their next build release.**
   Both public and owner C01 vertical routes pass normal-walk traversal, but
   the current route audit records only two-block minimum headroom and does
   not measure width, landing dimensions, or signage. That is a survey gap,
   not proof of a defect. Capture those measurements before making them the
   template for the city.

## Evidence boundary

- R08AL accepted post-QA: 11 public vacant bays, two one-wide eight-rise
  stairs, 372-cell restricted BOH spine, and two public/staff doors.
- R08AM accepted post-QA: seven-wide stair, restricted lower theatre/private
  annex, continuous five-wide restricted corridor, and one secured rear-stage
  connection.
- R12O: 613-station B03 route, 3-wide central clearance, supported floor and
  ceiling, fall boundary, six-step lighting, and a retained Cheyenne cap.
- Current world route audit: 19/22 bidirectional representative routes pass;
  failures remain local and explicitly identified.

The source snapshot for this review is the accepted R08AM post:
`data/worldsnap-r08am-post-20260822T161818Z`, region SHA-256
`30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`.
Future physical work must use a new same-invocation source snapshot; this
review is provenance and design direction, not a reusable release source.
