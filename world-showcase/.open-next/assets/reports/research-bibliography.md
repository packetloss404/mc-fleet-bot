# Redevelopment Research Bibliography

Date researched: 2026-07-27  
Scope: grid and neighborhood planning, street hierarchy, walkability,
wayfinding, land-use compatibility, frontage and garages, tunnels, stairs and
accessible circulation, stadium sightlines/screens, landscape screening, and
implementation phasing.

Implementation state: **RESEARCH/DESIGN ONLY**. The audit used repository
artifacts, read-only database queries, local image inspection, and web
research. It performed no live-world mutation or Sites deployment.

## 1. Research method

The research team preferred:

1. regulations, standards, and manuals published by public agencies;
2. official guidance from recognized planning and venue organizations;
3. official project/technology case studies where a constructed precedent was
   necessary;
4. local project evidence and exact database geometry;
5. clearly labeled Minecraft adaptations.

The sources do not authorize real-world construction and do not make the
Minecraft project legally compliant with building, access, street, tunnel, or
stadium codes. They provide planning principles and evaluation methods. Exact
block dimensions in `infrastructure-standards.md` are project choices.

## 2. Core master-planning sources

### BIB-01 — U.S. Department of Defense / Whole Building Design Guide

**Citation:** Department of Defense. *UFC 2-100-01, Installation Master
Planning*, Change 2, 19 March 2025.  
**URL:** https://stg.wbdg.org/FFC/DOD/UFC/ufc_2_100_01_2020_c2.pdf  
**Authority:** Official Unified Facilities Criteria distributed through the
Whole Building Design Guide.  
**Standards informed:** ST-01, ST-02, ST-05, ST-06, FR-02, FR-03, BK-01,
master-plan alternatives, regulating plan, implementation plan.

**Relevant concepts:**

- compatible mixed uses and walkable integration of community support,
  schools, lodging, retail, and related functions;
- separation of industrial uses from housing;
- connected modified grids, multiple route options, small blocks, and
  differentiated street types;
- sidewalks buffered with street trees;
- form-based regulating plans;
- Building Envelope, Street Envelope, and Landscape standards;
- build-to lines, entry and parking locations, height, setbacks, uses, and
  ground elevation;
- constraints/opportunities, illustrative plan, capacity analysis, renderings,
  and implementation plan;
- sequencing relocation, demolition, roads, sidewalks, green networks, and
  utilities;
- landscape screening of undesirable views and transitions between dissimilar
  uses.

**Project application:** It is the source-of-truth planning framework. The
MainStreet plan uses a connected street hierarchy and explicit frontage,
entry, service, and landscape rules. B02 remains an integrated education/public
use; B03 freight remains buffered. The C01 surface mass receives landform and
landscape screening. The PDF structure follows its existing-conditions,
alternatives, regulating, illustrative, and implementation sequence.

**Limit:** Military-installation scale and dimensional rules are not copied
directly into Minecraft.

### BIB-02 — U.S. Environmental Protection Agency

**Citation:** U.S. EPA. “About Smart Growth.”  
**URL:** https://www.epa.gov/smartgrowth/about-smart-growth  
**Authority:** Official federal environmental-planning guidance.  
**Standards informed:** master-plan principles, FR-03, ST-01, compact
development and infill-first decision.

**Relevant concepts:** mixed uses, compact design, walkable neighborhoods,
distinctive place, open-space preservation, directing development to existing
communities, choices, predictable decisions, and collaboration.

**Project application:** Repair weak frontage and network gaps before
relocating large buildings. Consolidation means perceptual and network
integration, not automatically reducing every physical distance.

### BIB-03 — U.S. Environmental Protection Agency

**Citation:** U.S. EPA. “National Walkability Index User Guide and
Methodology.”  
**URL:** https://www.epa.gov/smartgrowth/national-walkability-index-user-guide-and-methodology  
**Authority:** Official federal methodology.  
**Standards informed:** QA-02, QA-03, walkability metrics.

**Relevant concepts:** density, diversity of destinations, and transport access
as measurable walkability inputs.

**Project application:** There is no meaningful transit metric in this world,
so the plan explicitly adapts the method. It records built/destination density,
destination mix, public intersections, alternative-route count, dead ends,
decision spacing, and key-trip time. It rejects “all expected blocks exist” as
a complete walkability score.

**Limit:** The EPA index cannot be numerically transferred to Minecraft and is
not represented as the EPA's score.

## 3. Street and intersection sources

### BIB-04 — National Association of City Transportation Officials

**Citation:** NACTO. *Urban Street Design Guide*.  
**URL:** https://nacto.org/publication/urban-street-design-guide/  
**Authority:** Official NACTO design guide.  
**Standards informed:** ST-01, ST-02, ST-04, ST-08.

**Relevant concepts:** streets as public places, context-sensitive street
types, design controls, intersections, and interim/pilot treatments that can
lead to permanent construction.

**Project application:** MainStreet receives named street types and reversible
frontage/garage pilots before permanent relocation.

### BIB-05 — NACTO neighborhood streets

**Citation:** NACTO. “Neighborhood Street.”  
**URL:** https://nacto.org/publication/urban-street-design-guide/streets/neighborhood-street/  
**Authority:** Official NACTO guide page.  
**Standards informed:** residential/local street character, calm neighborhood
edges, planting, and sidewalks.

**Project application:** R02 and R03 read as local residential streets rather
than parallel service strips.

### BIB-06 — NACTO intersection principles

**Citation:** NACTO. “Intersection Design Principles.”  
**URL:** https://nacto.org/publication/urban-street-design-guide/intersections/intersection-design-principles/  
**Authority:** Official NACTO guide page.  
**Standards informed:** ST-04, WF-02.

**Relevant concepts:** compact, legible intersections and reduced conflict
space.

**Project application:** MainStreet intersections use a compact route
continuation, corner visibility, and advance destination information rather
than unexplained paving.

### BIB-07 — NACTO functional classification

**Citation:** NACTO. “Functional Classification.”  
**URL:** https://nacto.org/publication/urban-street-design-guide/design-controls/functional-classification/  
**Authority:** Official NACTO guide page.  
**Standards informed:** ST-01.

**Project application:** Route type depends on place and function, not width
alone. Main Street, West Lane, East Avenue, cross streets, alleys, and mountain
road have different design jobs.

### BIB-08 — NACTO commercial alleys

**Citation:** NACTO. “Commercial Alley.”  
**URL:** https://nacto.org/publication/urban-street-design-guide/streets/commercial-alley/  
**Authority:** Official NACTO guide page.  
**Standards informed:** ST-05, B02/B03 and High Street service access.

**Project application:** Freight, refuse, and back-of-house circulation use
rear/service routes and do not dominate the public front.

### BIB-09 — NACTO residential shared streets

**Citation:** NACTO. “Residential Shared Street.”  
**URL:** https://nacto.org/publication/urban-street-design-guide/streets/residential-shared-street/  
**Authority:** Official NACTO guide page.  
**Standards informed:** service-alley and low-speed residential-edge study.

**Project application:** The proposed x≈-55 and x≈55 service lanes remain
subordinate shared access, not fast through streets.

### BIB-10 — NACTO key principles

**Citation:** NACTO. “Key Principles.”  
**URL:** https://nacto.org/publication/urban-street-design-guide/streets/street-design-principles/key-principles/  
**Authority:** Official NACTO guide page.  
**Standards informed:** ST-08 and player-centered street evaluation.

**Project application:** Design is assessed by how the street functions as
public space and by player behavior, not solely a centerline or material list.

## 4. Residential frontage and garage sources

### BIB-11 — City of Houston

**Citation:** City of Houston Planning and Development Department. “Historic
Districts: Heights — Setting.”  
**URL:** https://www.houstontx.gov/planning/HistoricPres/HistoricPreservationManual/historic_districts/heights_setting.html  
**Authority:** Official municipal preservation guidance.  
**Standards informed:** FR-02, GA-02.

**Relevant concepts:** repeated setback rhythm and detached garages/carports
behind the house in the rear part of a site.

**Project application:** Keep a consistent house line and place garages to the
side/rear rather than making a garage door the principal civic image.

### BIB-12 — City of Houston

**Citation:** City of Houston. *Old Sixth Ward Design Guidelines*.  
**URL:** https://houstontx.gov/planning/HistoricPres/Sixth_Ward/OSW_DG_Guidelines.pdf  
**Authority:** Official municipal design guidance.  
**Standards informed:** GA-02, GA-03.

**Relevant concepts:** narrow driveways in the front portion of a lot and
corner-lot garage access from a side street.

**Project application:** The project uses three-block drives and favors
side-street/alley access for outer and corner homes.

### BIB-13 — City of Portland

**Citation:** City of Portland. *Community Design Standards*.  
**URL:** https://www.portland.gov/sites/default/files/code/218-comm-design-stds_0.pdf  
**Authority:** Official municipal design standards.  
**Standards informed:** GA-02.

**Relevant concepts:** limiting street-facing attached-garage width and keeping
the garage no closer to the street than the house façade.

**Project application:** The project adopts a garage-face target of no more
than 40 percent of the house frontage and at least a two-block recess. The
two-block value is a Minecraft adaptation.

## 5. Wayfinding sources

### BIB-14 — National Park Service

**Citation:** National Park Service, Harpers Ferry Center. *Wayside Exhibits: A
Guide to Developing Outdoor Interpretive Exhibits*.  
**URL:** https://www.nps.gov/subjects/hfc/upload/Wayside-Guide-First-Edition.pdf  
**Authority:** Official National Park Service guide.  
**Standards informed:** WF-01, WF-02, WF-03.

**Relevant concepts:** orientation waysides at pedestrian decision points and
an integrated system of maps, signs, and other media that addresses
orientation, safety, and site significance.

**Project application:** B01 and each major portal receive “you are here”
orientation. Tunnel and surface choices receive advance destination signs and
confirmation.

### BIB-15 — Federal Highway Administration

**Citation:** FHWA. *Pedestrian Safety Guide for Transit Agencies*, Chapter 3,
wayfinding action.  
**URL:** https://highways.dot.gov/safety/pedestrian-bicyclist/pedestrian-safety-guide-transit-agencies/chapter-3-actions-increase  
**Authority:** Official federal highway guidance.  
**Standards informed:** WF-02 and surface destination maps.

**Relevant concepts:** signs and maps that identify nearby destinations and
points of interest.

**Project application:** Regional arrival and district nodes show destinations
before choices rather than relying on the player to know the map.

### BIB-16 — Federal Highway Administration

**Citation:** FHWA. *Manual on Uniform Traffic Control Devices*, destination
guidance continuity.  
**URL:** https://mutcd.fhwa.dot.gov/htm/2009/mutcd2009cl_2.htm  
**Authority:** Official federal traffic-control manual archive.  
**Standards informed:** WF-02, WF-04.

**Relevant concept:** destination naming and guidance should remain continuous
through successive signs.

**Project application:** One canonical destination name is used in database,
map, sign, report, and website; route confirmation continues after a turn.

**Limit:** Minecraft signs do not claim MUTCD compliance, and traffic sign
dimensions/colors are not copied.

## 6. Accessible routes and stairs

### BIB-17 — U.S. Access Board

**Citation:** U.S. Access Board. “Chapter 4: Accessible Routes.”  
**URL:** https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/  
**Authority:** Official federal accessibility guidance.  
**Standards informed:** VC-01, VC-03.

**Relevant concepts:** accessible routes should coincide with or remain in the
same general circulation area as the route used by everyone.

**Project application:** A no-jump ramp/lift route is paired with the principal
public stair where feasible, not hidden as a remote service path.

### BIB-18 — U.S. Access Board

**Citation:** U.S. Access Board. “Chapter 5: Stairways.”  
**URL:** https://www.access-board.gov/ada/guides/chapter-5-stairways/  
**Authority:** Official federal accessibility guidance.  
**Standards informed:** VC-02.

**Relevant concepts:** uniform risers/treads, landings, and continuous
handrails.

**Project application:** The Minecraft standard uses a consistent tread
rhythm, frequent landings, sufficient headroom, and continuous guard/rail cue.
It does not claim that a block or slab equals a real-world inch dimension.

### BIB-19 — U.S. Access Board

**Citation:** U.S. Access Board. *2010 ADA Standards for Accessible Design*,
Chapter 2.  
**URL:** https://www.access-board.gov/ada/chapter/ch02/  
**Authority:** Official federal accessibility standard.  
**Standards informed:** VN-03.

**Relevant concept:** assembly areas should provide equivalent viewing angles
and distribution.

**Project application:** Westlight sightline samples cover sectors and levels,
including the routes/seating intended to represent accessible positions.

## 7. Tunnel sources

### BIB-20 — Federal Highway Administration

**Citation:** FHWA. *Technical Manual for Design and Construction of Road
Tunnels — Civil Elements*.  
**URL:** https://www.fhwa.dot.gov/bridge/Tunnel/pubs/nhi09010/tunnel_manual.pdf  
**Authority:** Official federal tunnel manual.  
**Standards informed:** TU-02, TU-04, TU-05, TU-06.

**Relevant concepts:** tunnel geometry, drainage, lighting, communications,
emergency systems, cross-passages, exits, and operations must be designed as an
integrated system.

**Project application:** A tunnel is not accepted merely because its centerline
connects. Each named segment has a section, lighting, wayfinding, water/cave
interface, decision nodes, and route performance.

**Limit:** Road-tunnel design values, life-safety calculations, and vehicle
dimensions are not transferred to Minecraft.

### BIB-21 — Federal Highway Administration

**Citation:** FHWA. “New Tunnel Lighting System Saves Money and Improves
Safety.”  
**URL:** https://www.fhwa.dot.gov/publications/focus/10may/03.cfm  
**Authority:** Official federal technical communication.  
**Standards informed:** TU-04.

**Project application:** Lighting is treated as a continuous operational
system, with special attention at thresholds and decision points, not as
occasional decoration.

### BIB-22 — Federal Highway Administration

**Citation:** FHWA. *Fixed Firefighting Systems in Road Tunnels: Technical
Report*.  
**URL:** https://www.fhwa.dot.gov/bridge/tunnel/pubs/nhi09010/fixed_firefighting.pdf  
**Authority:** Official federal technical report.  
**Standards informed:** TU-04 and WF-02.

**Relevant concepts:** marked egress, emergency lighting, exit signs, and
communication are part of tunnel operational design.

**Project application:** Tunnel route families maintain a visible return/exit
system even where decorative or security wayfinding is complex.

## 8. Stadium and display sources

### BIB-23 — FIFA

**Citation:** FIFA. “Stadium Bowl,” *Football Stadiums Guidelines*.  
**URL:** https://football-technology.fifa.com/innovation/stadium-guidelines/general-process-guidelines/design/stadium-bowl  
**Authority:** Official FIFA stadium-guidance site.  
**Standards informed:** VN-03, VN-04.

**Relevant concepts:** avoid restricted sightlines; account for scoreboard or
screen obstruction; design viewing geometry across the bowl.

**Project application:** Every Westlight sector and level receives a recorded
field/stage/screen view. A screen that blocks the primary event fails.

### BIB-24 — Samsung Electronics America

**Citation:** Samsung Electronics America. “SoFi Stadium and Samsung Reveal the
New Name of the Center-Hung Videoboard: The Infinity Screen by Samsung,” 2021.  
**URL:** https://news.samsung.com/us/sofi-stadium-samsung-reveal-new-name-videoboard-the-infinity-screen-by-samsung  
**Authority:** Official manufacturer/project case study.  
**Standards informed:** VN-02.

**Relevant concepts:** a center-hung oval, dual-sided display serves both lower
and upper seating in an all-around bowl.

**Project application:** This is the functional precedent for Westlight's
preferred screen type. It is not a requirement to copy the screen's exact
appearance, technology, name, or scale.

### BIB-25 — Samsung Electronics

**Citation:** Samsung Electronics. “Samsung Kicks Off Game Day With the
World’s Largest LED Videoboard Ever Built for Sports.”  
**URL:** https://news.samsung.com/global/samsung-kicks-off-game-day-with-the-worlds-largest-led-videoboard-ever-built-for-sports  
**Authority:** Official manufacturer/project case study.  
**Standards informed:** VN-03.

**Relevant concepts:** architectural drawings and simulated viewing angles were
used to develop the board for venue geometry.

**Project application:** Screen selection follows block-level 3D sightline
simulation and recorded seating views, not plan-view placement alone.

## 9. Local evidence sources

Local evidence is listed here to distinguish observed conditions from external
research:

- `data/world-map.db` — canonical spatial-feature catalog audited read-only.
- `data/worldsnap/region` — current immutable program baseline identified in
  `README.md`.
- `data/world-review/active-interior-register-2026-07-27.json` — current
  building/vertical-circulation review registry.
- `data/world-review/mainstreet-secure-complex-detail-wave5-design-2026-07-27.json`
  — secure-complex Wave5 program and routes.
- `data/world-review/mainstreet-secure-complex-detail-wave5-saved-world-qa-2026-07-27.json`
  — prior saved-world physical QA.
- `mainstreet-america/planning/project-grid.yaml` — roads, districts, plots,
  gates, and boundaries.
- `mainstreet-america/planning/coordinates.yaml` — historic coordinate
  registry; use cautiously where stale comments conflict with the DB.
- `mainstreet-america/planning/floorplans.yaml` — authored floorplan intent.
- `mainstreet-america/qa/msa-surface-complex-exterior-final-v2.png` — exposed
  C01 surface mass evidence.
- `mainstreet-america/qa/msa-mountain-approach-after.png` — parking/portal and
  mountain-approach evidence.
- `mainstreet-america/qa/msa-secure-wave5-c01-arena.png` — C01 arena
  eye-level evidence.
- `scripts/gen_westlight.py` — active Westlight bowl/theatre source; confirms
  no stadium screen operation.
- `builds/manifest.yaml` — confirms the retired screen package never ran and
  was superseded.

## 10. Research conclusions

1. The existing MainStreet parallel-road structure is an asset. Strengthening
   addresses, frontages, cross connections, alleys, and landscape is more
   defensible than wholesale relocation.
2. B02 is close enough to R02 for a frontage repair. B03 should remain a
   screened service terminus.
3. A complete planning package needs a regulating plan, building/street
   envelope standards, illustrative plan, implementation plan, and renderings.
4. Wayfinding is a system of maps, names, signs, landmarks, and confirmation,
   not a collection of isolated signs.
5. Reachability alone does not prove tunnel or stair quality.
6. Garages belong behind or beside the public house image and require a
   house-by-house access test.
7. A center-hung dual-sided screen best fits an all-around bowl, but only after
   full sightline and obstruction simulation.
8. The requested bunker outcome can be achieved more safely by changing the
   portal, access road, terrain, and surface hangar relationship than by moving
   the entire underground program.
9. Final media must be tied to exact database objects and an immutable snapshot;
   attractive but untraceable images are not project evidence.

## 11. Audit ledger

The planning/research audit directly inspected the following local sources.
The list is intentionally exact so another reviewer can reproduce the
conclusions:

### Repository and operating guidance

- `CLAUDE.md`
- the repository `AGENTS.md` instructions supplied to this work session

### MainStreet planning and source references

- `mainstreet-america/README.md`
- `mainstreet-america/planning/site-plan.md`
- `mainstreet-america/planning/project-grid.yaml`
- `mainstreet-america/planning/coordinates.yaml`
- `mainstreet-america/planning/buildings.yaml`
- `mainstreet-america/planning/floorplans.yaml`
- `mainstreet-america/planning/parking-arrival-gardens.md`
- `mainstreet-america/planning/open-questions.md`
- `mainstreet-america/references/README.md`
- `mainstreet-america/references/manifest.yaml`

### MainStreet QA and review

- `mainstreet-america/qa/as-built-survey.md`
- `mainstreet-america/qa/audit-2026-07-26.md`
- `mainstreet-america/qa/defects.yaml`
- `mainstreet-america/qa/qa-report.md`
- `mainstreet-america/qa/msa-surface-complex-exterior-final-v2.png`
- `mainstreet-america/qa/msa-mountain-approach-after.png`
- `mainstreet-america/qa/msa-secure-wave5-c01-arena.png`

### Worldwide and secure-complex reports

- `docs/MAINSTREET-SECURE-COMPLEX-WAVE5-2026-07-27.md`
- `docs/WORLDWIDE-INTERIOR-REVIEW-2026-07-27.md`
- `data/world-review/c01-bunker-detail-review-2026-07-27.md`
- `data/world-review/mainstreet-secure-complex-detail-wave5-design-2026-07-27.json`
- `data/world-review/mainstreet-secure-complex-detail-wave5-saved-world-qa-2026-07-27.json`
- `data/world-review/mainstreet-secure-complex-detail-wave5-preflight-2026-07-27.json`
- `data/world-review/active-interior-register-2026-07-27.json`
- `data/world-review/worldwide-interior-database-import-2026-07-27.json`
- `data/world-review/worldwide-interior-final-database-scan-2026-07-27.json`

### Build and venue source

- `scripts/gen_westlight.py`
- `builds/manifest.yaml`

### Catalog

- `data/world-map.db`, queried read-only through `better-sqlite3`
- `world_features`, `world_scans`, and `feature_observations` schemas
- complete project/kind/status/condition/completion counts
- complete 68-row building inventory and MainStreet road/building geometry
- selected C01, P01, stair, scan, and screenshot-evidence attributes

### Atlas manifests and visual evidence

- `data/exports/box/atlas-2026-07-26/atlas-index.json`
- `data/exports/box/atlas-2026-07-26/team-b/manifest.json`
- the worldwide interior atlas manifest
- the secure Wave5 atlas manifest
- the maps manifest
- `data/exports/box/atlas-2026-07-26/team-a/00-overall-active-world-surface-atlas.png`
- `data/exports/box/atlas-2026-07-26/team-a/04-westlight-venue-and-district.png`
- `data/exports/box/atlas-2026-07-26/team-b/01b-campus-overview-annotated.png`
- `data/exports/box/worldwide-interior-atlas-2026-07-27/01-mainstreet-america-overview.png`
- `data/exports/box/worldwide-interior-atlas-2026-07-27/06-westlight-venue-overview.png`

Where an exact manifest filename is generated inside its atlas directory, the
containing atlas manifest and index are the reproducible entry points. The
final PDF should cite the immutable replacement atlas, not these older images,
when it makes current-state claims.
