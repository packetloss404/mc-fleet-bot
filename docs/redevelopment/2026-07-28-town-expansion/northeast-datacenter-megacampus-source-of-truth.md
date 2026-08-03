# Northeast Data-Center Megacampus: Public-Source Architecture Memorandum

**Document status:** researched program; not a coordinate release  
**Prepared:** 2026-07-28 UTC  
**Scope:** Minecraft architectural source of truth for the proposed northeast megacampus, its DM10 program, and a separate underground resilience annex inspired by InfoBunker's public descriptions  
**Live-world effect:** none  
**Security boundary:** public, non-tactical material only. This document deliberately omits and does not infer real access-control sequences, surveillance coverage, credentialing, network topology, utility entry points, emergency response procedures, or other non-public security details.

## Executive decision

The proposed program is viable, but a single undifferentiated floor holding all 40 rows would read as a warehouse, make circulation monotonous, blur operational and visitor paths, and make future expansion difficult to understand. Retain **40 rack rows in each completed data-hall building**, divided into four 10-row pods over two walk-through floors. Each floor receives ten front-to-front/back-to-back thermal pairs, contained hot aisles, cold service aisles, transverse cross-aisles, and an adjacent mechanical/electrical support gallery. The exact ten-building layout is controlled by `northeast-data-campus-coordinate-schedule.json`.

The public experience must be a separate interpretive route, not a public path through active white space. Microsoft's own public-facing solution is an immersive digital tour of a typical datacenter, organized around the server room, network, operations, mechanical systems, and innovation. The Minecraft campus should translate those topics into an architectural gallery running beside the halls, with sectional windows, cutaway mock-ups, synthetic dashboards, and a contained demonstration aisle. The real hall aisles remain operator space.

The NOC belongs in the operations/admin block, overlooking a non-sensitive central campus diagram. It does not belong in the power yard. The power yard is an outdoor service district with legible but deliberately non-tactical A/B visual bands, acoustic/landscape screening, and direct service relationships to electrical galleries.

The connected 200-seat auditorium and separate 200-seat cinema are approved as two independent rooms sharing a visitor lobby and back-of-house support. The auditorium gets a stage, backstage, green room, and lecture infrastructure. The cinema gets a real screen, projection/AV room, raked seating, and rear/side entries so the audience faces the screen—not a doorway.

The dormitory idea should become a **48-bed training and resilience lodge** on the public/staff edge of campus. Neither the reviewed Microsoft material nor InfoBunker's public disaster-recovery page supports placing residential rooms in a production data hall. InfoBunker publicly describes recovery workspaces with kitchen, break, conference, and shower facilities; that supports a resilience-support program, not an invented claim about real dormitories.

The underground facility must be a **separate fictional annex**, identified here as `IB-ANNEX`, with its own support zones and independent exits. A walkable connector from the Minecraft object `DM10` is permissible as a fictional campus convenience, but no reviewed public source establishes a real Microsoft-to-InfoBunker connection. The connector must be isolatable at both ends and must never be the annex's only route.

## What the public record actually establishes

### Greater Des Moines campus names and counts

The City of West Des Moines identifies the first three projects as **Mountain**, **Alluvion**, and **Osmium**. Mountain planning began in 2008, Alluvion was announced in 2014, and Osmium in 2016.  
Source: [City of West Des Moines, 2017](https://www.wdm.iowa.gov/Home/Components/News/News/4727/384?arch=1)

The city's fiscal-2022 report calls **Ginger East** and **Ginger West** the fourth and fifth datacenters at new city sites, each occupying roughly 130–160 acres, while Osmium construction continued.  
Source: [City of West Des Moines, fiscal-2022 report](https://www.wdm.iowa.gov/home/showpublisheddocument/38755/638150105216870000)

The city's 2025 Community and Economic Development annual report says five Microsoft data-center campuses were built or under construction and a sixth campus was proposed. The reviewed primary material does not provide a public name for that sixth proposal.  
Source: [City of West Des Moines, 2025 CED annual report](https://www.wdm.iowa.gov/home/showpublisheddocument/44690/639053787602700000)

Microsoft's Iowa community page confirms its Greater Des Moines presence. Its current public construction pages identify Ginger East and Ginger West and estimate their construction completion in mid-2028 and summer 2028 respectively; Microsoft also warns that construction completion does not establish operational availability.  
Sources: [Microsoft Local—Iowa](https://local.microsoft.com/communities/americas/greater-des-moines/), [Ginger East update](https://local.microsoft.com/blog/ginger-east-datacenter-construction-update/), [Ginger West update](https://local.microsoft.com/blog/ginger-west-datacenter-construction-update/)

Municipal planning records show that `DSM14`, `DSM40`, `DSM44`, and similar strings can refer to site-plan or building identifiers. A 2021 agenda explicitly calls Ginger East “aka Microsoft DSM 14,” while listing DSM 40 at a different address. A 2024 record calls DSM 44 the fifth of six **buildings on that campus**. Those identifiers must not be treated as a count of metropolitan campuses.  
Sources: [West Des Moines 2021 Planning and Zoning agenda](https://www.wdm.iowa.gov/home/showpublisheddocument/34254/637590299587870000), [West Des Moines 2024 Planning and Zoning minutes](https://www.wdm.iowa.gov/home/showpublisheddocument/42285/638678876877800000)

**Naming rule for this project:** `DM10` is an internal Minecraft object identifier only. It must not be presented as the name or replica of a real Microsoft facility. The campus should use an original fictional public name, with “Greater Des Moines precedents” confined to the research notes.

### Inside a datacenter

Microsoft's public tour organizes the datacenter story around the server room, network, operations room, mechanical area, and innovation. It says the operations room monitors critical infrastructure categories including power, cooling, network, and security. This supports the NOC program and the visitor-gallery topics, but it does not justify reproducing tactical operations.  
Source: [Microsoft, “We Live in the Cloud” public tour](https://datacenters.microsoft.com/tour/html-version/)

Microsoft's public feature on the virtual tour describes a typical hot-aisle/cold-aisle arrangement: technicians work from the cold aisle; server airflow moves through the equipment; hot exhaust leaves at the rear and returns toward mechanical cooling. The same article characterizes the public experience as a digital tour. That strongly favors an isolated visitor gallery and demonstration cutaway over a public route inside active white space.  
Source: [Microsoft Source, virtual datacenter feature](https://news.microsoft.com/source/features/innovation/microsofts-virtual-datacenter-grounds-the-cloud-in-reality/)

### Rack and aisle planning

The U.S. Department of Energy's 2024 guide calls for alternating cold intake and hot exhaust aisles, front-to-back equipment airflow, back-to-back rack placement, blanking of empty rack openings, and separation of supply and return air.  
Source: [DOE, Best Practices Guide for Energy-Efficient Data Center Design](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf)

ASHRAE describes front-to-front and back-to-back cabinet arrangement as the first step in avoiding air mixing, then identifies hot-aisle, cold-aisle, and rack-based containment as further separation methods. ASHRAE also advises designing for future loads rather than locking the facility to a single present-day density assumption.  
Source: [ASHRAE Handbook, Chapter 20](https://handbook.ashrae.org/Handbooks/A19/IP/a19_ch20/a19_ch20_ip.aspx)

These sources are operational principles, not a license to claim that Minecraft block widths are real engineering dimensions. The block dimensions below are representational design controls intended to make circulation and system relationships legible in-world.

### Public InfoBunker characteristics

InfoBunker's public overview describes a more-than-65,000-square-foot underground colocation facility with critical systems underground and redundant cooling, power, and suppression. Its HVAC page describes separated cooling systems and references ASHRAE environmental practice. Its power page describes A/B distribution and conditioned power. Its disaster-recovery page lists three 30-person recovery suites plus conference, kitchen, break, and shower facilities.  
Sources: [InfoBunker overview](https://www.infobunker.com/overview.shtml), [HVAC](https://www.infobunker.com/hvac.shtml), [power](https://www.infobunker.com/power.shtml), [disaster recovery](https://www.infobunker.com/dr.shtml)

Only those high-level public characteristics inform `IB-ANNEX`: underground siting, operational separation, resilient support systems, colocation/recovery rooms, and staff welfare. No real layout, system route, protection specification, or security procedure is copied or inferred.

## Campus master-plan program

### Campus structure

The megacampus is five connected but visibly distinct bands:

1. **Civic/visitor edge** — arrival court, visitor center, public datacenter gallery, auditorium, cinema, café, and exhibit garden.
2. **Operations spine** — admin, NOC, training labs, repair/staging, spares, loading interface, and staff commons.
3. **Data-hall field** — a phased family of 40-row buildings, each divided into four 10-row pods, with paired support galleries.
4. **Utility/service edge** — power yard, mechanical yards, maintenance road, screened service courts, and utility-reserve corridors.
5. **Resilience edge** — 48-bed lodge, future hall parcels, landscaped stormwater/meadow reserve, DM10 connector headhouse, and the separate underground `IB-ANNEX`.

These bands should be understood at a glance from the main approach. The visitor district gets a civic façade and planted court; the halls form a measured industrial rhythm; the utility district is screened but not disguised as unrelated decoration; the expansion land reads as deliberately reserved.

### Per-building 40-row standard

Each completed data-hall building contains 40 rack rows arranged as 20 thermal pairs: 20 rows on each of two walk-through floors, with four 10-row pods per building.

| Element | Minecraft design control |
|---|---:|
| White-space clear envelope | 52 blocks wide × 78 blocks long × 10 blocks clear |
| Rack rows | 40 per completed building; 20 per floor |
| Row run | 64 blocks nominal, divided at a central cross-aisle |
| Cold service aisle | 3 clear blocks |
| Contained hot aisle | 2 clear blocks |
| Perimeter service aisle | 4 clear blocks |
| Transverse cross-aisles | 5 clear blocks at both ends and midpoint |
| Support gallery | 10 blocks wide along one long side |
| Visitor observation gallery | 6 clear blocks, outside the hall enclosure |

Rack fronts face cold aisles. Rack backs face contained hot aisles. Empty rack bays receive blanking-panel visual treatment. Floor and ceiling cues must show supply versus return zones without pretending to reproduce real mechanical engineering.

The two end cross-aisles and one midpoint cross-aisle interrupt the “infinite corridor” effect. Each hall has a distinct color/material identifier, visible hall number, north arrow, and “you are here” diagram. Service doors align to the support spine. The public gallery never dead-ends inside a hall.

### Public tour gallery

The gallery is a six-block-clear loop outside the operational hall enclosure. Its five stops follow Microsoft's public teaching sequence:

1. Cloud and server-room cutaway.
2. Demonstration cold aisle and contained hot-aisle section.
3. Network concept display using fictional, non-operational diagrams.
4. Operations room exhibit using synthetic status data.
5. Mechanical and cooling principles plus an innovation/future-density exhibit.

Use glazed sections only where they help the visitor read a hall. Do not turn every wall into glass. A full-size demonstration rack pair in the gallery is more informative than allowing public access to the operational rows.

### Operations and NOC

The NOC is a 32 × 26 block room within a two-story admin/operations building. It includes:

- three stepped operator rows;
- a broad synthetic status wall;
- an incident collaboration table;
- an adjacent briefing room;
- an operations-manager office;
- direct staff circulation to the central service spine;
- a visitor-side overlook that displays only the fictional campus model.

The NOC's role is to make power, cooling, network, hall state, and maintenance coordination readable. It must not expose or simulate real security controls. The power yard remains physically and architecturally separate.

### Power and mechanical yard

The power yard occupies a 90 × 54 block service parcel with:

- two visually legible, fictional A/B equipment bands;
- a maintenance loop wide enough for in-world vehicles;
- clear service aprons;
- an opaque architectural screen plus planted berm;
- separation from the auditorium, cinema, and lodge;
- utility-reserve strips leading toward future halls;
- no public entrance and no decorative pedestrian route through equipment.

The design communicates redundancy at a diagrammatic level only. It must not duplicate any real campus topology. Mechanical equipment should be grouped by the hall it serves so the campus is readable rather than scattered.

### Auditorium and cinema

The two venues share a 28 × 22 block lobby, restrooms, coat/storage space, café service, and an outdoor arrival court, but each room has independent circulation.

**Auditorium**

- 200 seats represented as ten rows of twenty;
- 30 × 34 block audience chamber;
- 24 × 10 block stage;
- side-stage access, green room, two dressing/ready rooms, and lecture storage;
- rear and side audience entries;
- accessible front and rear seating platforms;
- acoustic vestibules at entries.

**Cinema**

- 200 seats represented as ten rows of twenty;
- 30 × 36 block chamber with raked seating;
- 22-block-wide × 10-block-high screen wall;
- dedicated projection/AV room;
- rear and side entries only;
- acoustic vestibules and a separate exit path;
- no doorway on the screen wall and no seating orientation toward an entrance.

The lobby may connect directly to the visitor gallery, but neither venue opens into the data-hall spine.

### Training and resilience lodge

Build a 64 × 42 block, two-story, 48-bed lodge at the campus edge. The first floor contains reception, two training classrooms, shared kitchen/dining, lounge, laundry, showers, and flexible team rooms. The second floor contains 24 twin rooms. A planted courtyard separates it from the service district.

Call it a “training and resilience lodge,” not a Microsoft dormitory. It is a fictional campus-support choice. Keep it outside the data-hall envelope and away from the power/mechanical yard.

### Expansion yard

Reserve two future hall parcels, each 72 × 98 blocks including support apron, plus a 16-block utility/circulation reserve between them. Until expansion, grade them as managed meadow, stormwater landscape, and a temporary training lawn. Never fill the reserve with random storage or roads that future buildings would have to erase.

The reserve should be shown on maps as `FUTURE DH-E` and `FUTURE DH-F`, not as completed capacity.

## Separate underground resilience annex

### Program

`IB-ANNEX` is a fictional, independent, underground resilience and recovery facility inspired only by InfoBunker's public descriptions. It is not a replica and must not carry the InfoBunker trademark as if affiliated.

The annex uses three underground levels:

- **B1 / Arrival and recovery:** reception, three 30-seat recovery suites, conference room, kitchen, break room, showers, medical/quiet room, stores, and two independent surface exits.
- **B2 / Colocation and operations:** four compact equipment rooms, repair/staging, operations desk, spares, and separated support galleries.
- **B3 / Plant and water management:** fictional A/B power rooms, cooling plant rooms, drainage collection, maintenance workshop, and a service lift/stair core.

The annex receives its own diagrammatic power, cooling, network, drainage, and exit systems. The DM10 connector is a convenience link, not a shared life-support dependency.

### DM10 connector standard

The connector is a straight or gently segmented walkable route:

- nine blocks structural width with seven blocks clear;
- six blocks clear height;
- maximum one-block rise per twelve blocks of run;
- level landing at least seven blocks long at every turn and every 36 blocks;
- non-slip floor palette and continuous lighting;
- drainage channel and low-point sump represented in the build;
- protected cable/service chase separated from the pedestrian way;
- two-stage architectural vestibule at each end;
- connection isolatable at both ends;
- no stair-only segment;
- no blind intersection;
- wayfinding every 24 blocks;
- independent surface egress from both DM10 and `IB-ANNEX`.

This standard solves the walkability problem seen in earlier tunnel work while avoiding invented claims about real security features.

## Adjacency rules

Required adjacencies:

- visitor arrival ↔ shared theater lobby ↔ datacenter gallery;
- datacenter gallery ↔ controlled hall observation points;
- NOC ↔ admin ↔ central operations spine;
- repair/staging ↔ loading interface ↔ each hall support gallery;
- each hall ↔ its mechanical/electrical support bands;
- lodge ↔ training/admin, with a planted buffer from utilities;
- DM10 ↔ connector headhouse ↔ `IB-ANNEX`;
- future hall parcels ↔ utility reserves and service road.

Forbidden adjacencies:

- public lobby directly into operational white space;
- theater exits into the power yard;
- lodge against generator/mechanical screening;
- NOC inside the power yard;
- connector as the annex's only exit;
- shared single-point plant dependency between DM10 and the annex;
- public wayfinding that presents internal identifiers as real Microsoft facility names.

## Phasing

1. **Survey and coordinate release:** immutable terrain snapshot, feature/database query, parcel polygon, no-build/protected-feature overlay, grade sections, and approach-road capacity.
2. **Civic and operations core:** visitor center, gallery shell, admin/NOC, auditorium, cinema, and central service spine.
3. **Hall pair 1:** `DH-A` and `DH-B`, their support galleries, and the first power/mechanical band.
4. **Hall pair 2:** `DH-C` and `DH-D`, remaining power/mechanical band, complete gallery loop.
5. **Lodge and landscape:** resilience lodge, staff courtyard, stormwater/meadow reserve, and approach landscape.
6. **Underground annex:** annex excavation and independent exits before connector breakthrough.
7. **Connector:** build from both safe endpoints, verify slope/clearance/drainage, then connect only after both facilities have independent routes.
8. **Publication:** maps, floor plans, object-to-media crosswalk, matched screenshots, database objects, and dossier update.

## Release gates

No coordinate package or live build is authorized by this memo. A future release must pass:

- fresh immutable snapshot and hash;
- database-feature intersection report;
- exact coordinate bounds for every phase;
- protected-object and water/fluid census;
- non-overlap with concurrent build packages;
- before-map and matched before screenshots;
- exact-state forward and rollback operations;
- parser dry run and independent reconstruction;
- clear two-way walking route through every hall cross-aisle;
- auditorium and cinema 200-seat count;
- cinema screen present and seating facing it;
- visitor route never entering operational white space;
- lodge buffered from utility yards;
- annex has independent surface egress before connector opening;
- connector seven-block clear width, six-block clear height, and compliant gentle grade;
- object-to-media crosswalk and post-build matched captures;
- explicit “fictional interpretation” labeling in all public-facing material.

## Source hierarchy and unresolved inputs

This memo is the research/program source of truth. It is subordinate to:

1. the user's stated program and corrections;
2. a future accepted immutable world snapshot;
3. database objects and protected features in that snapshot;
4. exact guarded coordinate release and independent QA.

Coordinates remain intentionally unset. Before engineering, the PM team must provide or derive from a fresh snapshot:

- northeast campus parcel bounds;
- the existing DM10 object bounds and finished-floor elevation;
- distance and grade to the proposed annex;
- approach-road tie-in;
- water table/fluid and protected-feature census;
- conflicts with any pending town, stadium, crater-lake, or tunnel package.

Until those inputs exist, the correct status is **RESEARCHED_PROGRAM_NOT_COORDINATE_RELEASE**.
