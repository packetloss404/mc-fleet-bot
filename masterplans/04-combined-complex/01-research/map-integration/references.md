# References — Map Integration Research

> **SUPERSEDED — HISTORICAL RESEARCH ONLY.** Any “binding” wording below describes the retired separate-world study, not current authority. Masterplan 05 is the sole current-world placement and development plan. See `../../AUTHORITY.md` and `../../../05-combined-zones/MASTERPLAN.md`.

> Numbered, annotated list of all sources used in `research-report.md`. Companion to `sources.md` (the flat URL list).

---

## Project-internal sources (workspace at `D:\projects\mc-fleet-bot\`)

1. **`D:\projects\mc-fleet-bot\AGENTS.md`** — the canonical agent guide for the workspace. Defines the bot fleet, the control platform services, the API endpoints, and the data layer. Read in full to confirm the workspace structure.

2. **`D:\projects\mc-fleet-bot\schematics\`** — the schematic library. 113 `.schem` files inventoried by `Get-ChildItem`. The library is the "above-ground map" of the workspace. **Only one file (`underground-base.schem`) is explicitly underground.** Categorized by filename into ~17 categories in the report.

3. **`D:\projects\mc-fleet-bot\data\markers.json`** — 6 placeholder markers, all with empty `tags` arrays. No spatial coordinates. Confirms the data layer is young.

4. **`D:\projects\mc-fleet-bot\data\zones.json`** — 2 placeholder zones, both named "Mining Area" but with no spatial extent. The names are thematically suggestive (SubTropolis is literally a mine) but the zones are placeholders.

5. **`D:\projects\mc-fleet-bot\data\squads.json`** — 6 empty squads. No bot assignments. The 6 empty squads become 6 named squads in the new world (per §8.4 of the report).

6. **`D:\projects\mc-fleet-bot\data\bots.json`** — 4 active bots: Lilly (explorer, spawn 935, 63, 328), Taylor (builder, spawn 993, 57, 363), Marcus (guard, spawn 830, 65, 225), Hazel (farmer, no fixed spawn). All 4 in `codegen` mode.

7. **`D:\projects\mc-fleet-bot\data\shared_world.json`** — the live world state. 4 bots clustered at x ≈ 800–995, y ≈ 55–65, z ≈ 225–380. Server time 16,109 (~4.5 hours). Weather clear. Only 3 explored chunks.

8. **`D:\projects\mc-fleet-bot\data\world_memory.json`** — 13 world objects: 7 resources (water × 2, oak_log, coal_ore × 2, iron_ore × 3), 3 workstations (furnace × 2, crafting_table), 1 container (chest), 1 workstation. All within ±50 blocks of (935, 60, 350).

9. **`D:\projects\mc-fleet-bot\data\stats.json`** — 13 bot stat records. The 4 active bots have substantial activity; the 9 historical bots (sloth, badbitch, CuteHouse1/2, Packet1/2/3, Builder1/2/5) have minimal activity. The "CuteHouse" naming strongly suggests `Cute house.schem` was placed historically.

10. **`D:\projects\mc-fleet-bot\data\commands.json`** — ~50 commands, 4 substantive (1 walk_to_coords to (100, 64, 200) for Lilly, 2 pause_voyager, 1 resume_voyager) + 46 placeholder. The walk_to_coords is the only explicit planning hint for a future build site.

11. **`D:\projects\mc-fleet-bot\data\blackboard.json`** — 76 KB. The `reservations` array shows build-cell reservations by Taylor around (913–914, 68–69, 340–350). Confirms the bots are actively building.

12. **`D:\projects\mc-fleet-bot\data\activity.json`** — 50+ bot state transitions. Confirms the world is live.

13. **`D:\projects\mc-fleet-bot\data\supply_chains.json`** — 2-byte empty array. Zero supply chains.

14. **`D:\projects\mc-fleet-bot\data\missions.json`** — 4 KB. Routine working missions only.

15. **`D:\projects\mc-fleet-bot\data\affinities.json`** — 6.5 KB. Bot relationships. Not map-relevant.

16. **`D:\projects\mc-fleet-bot\vendor\minebotai-containment\`** — vendored TypeScript library for bot code execution and security. Not map-relevant.

## Masterplan sources (`D:\projects\mc-fleet-bot\masterplans\`)

17. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\01-research\research-report.md`** — the *primary* prior research document. 67 KB, 667 lines. Covers the combined complex's concept, real-world precedents (Switzerland, Helsinki, Norway, Singapore, Tokyo, Montreal, U.S. Federal Arc), geological compatibility, scale, accessibility, defense-in-depth, public facts vs. myth, visual description, Minecraft scaling, iconic features, and sources. Read in full to confirm the existing research.

18. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\01-research\references.md`** — the existing references file. 16 KB. Numbered list of all sources used in the prior research.

19. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\01-research\sources.md`** — the existing flat URL list. 3.3 KB. Includes URLs for Wikipedia, swissinfo.ch, hel.fi, cnet.com, huntmidwest.com, and the 3 individual masterplan PDFs.

20. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\02-design\design-plan.md`** — the *primary* prior design document. Architectural spec for the inter-site connections (public shaft, service tunnel, ravine, composite terrane plaque, world envelope, material palette, lighting, 4-layer defense-in-depth cross-section, 6 centerpieces, 9 easter eggs). 55 KB. Read in full.

21. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\02-design\discussion-notes.md`** — the binding design decisions. 7 topics deliberated by 4 voices (Realist, Gameplay Advocate, Architect, Geologist). Decisions: (1) 1 block = 1 m globally; (2) Two-peak asymmetric mountain range; (3) Public shaft 7×7 cross-section, mechanical lift; (4) Service tunnel 6×6 cross-section, minecart; (5) 30–45 min focused play; (6) 6 centerpieces; (7) 9 easter eggs. Read in full.

22. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\02-design\site-coordinates.json`** — the *binding* coordinate document. World origin (0, 0, 0). City at (−69, 0, −69) to (69, 80, 69). Mountain range at (−300, 0, −700) to (300, 800, −100). Public shaft at (60, 0, −70) to (60, −100, −100). Service tunnel at (−100, 0, −300) to (0, 0, −420). 25-ton blast door at (0, 0, −420). Composite terrane plaque at (0, −90, −400). Read in full.

23. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\02-design\site-plan.md`** — the *binding* site plan. World footprint 1,500 × 1,500 × 800. Mountain range 800 × 600. Ravine 200 wide at bottom, 30 wide at top, 100 deep. City 138m × 138m. 6 stages of the visitor journey. 3 stages of the return journey. Read in full.

24. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\02-design\development-plan.md`** — the construction sequence. 5 phases. Read for context.

25. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\04-contractor\contractor-brief.md`** — the *primary* prior contractor brief. Build spec for the integration layer. 7 build targets, 53–82 hours of build time, 3.5M blocks total. Phase 1 (World Prep) through Phase 7 (Finishing). Read in full (first 200 lines; full brief is 900+ lines).

26. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\04-contractor\contractor-brief.json`** — the contractor brief in JSON form. Includes the 7 binding decisions, 26 renderings, 6 centerpieces, 9 easter eggs, and the 1,500 × 1,500 × 800 world footprint.

27. **`D:\projects\mc-fleet-bot\masterplans\04-combined-complex\build-info.json`** — the build metadata. Combined Complex v1.0, 2026-08-02, 1 block = 1 m globally, 3,500,000 block budget, 67 pages, 29 images, 6 centerpieces, 9 easter eggs.

28. **`D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\01-research\research-report.md`** — the prior research for the Cheyenne masterplan. 52 KB. The chamber is at Y = 250–400, inside 1,800+ ft of granite.

29. **`D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\04-design\working-plan.md`** — the construction sequence for the Cheyenne build. Outside-in, top-down strategy. 7 phases. Read first 100 lines for context.

30. **`D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\build-info.json`** — Cheyenne build metadata. v1.0, 414,700 block budget, 15 buildings, 12 must-haves.

31. **`D:\projects\mc-fleet-bot\masterplans\02-subtropolis\01-research\research-report.md`** — the prior research for the SubTropolis masterplan. Read for context on the 200 × 200 chamber.

32. **`D:\projects\mc-fleet-bot\masterplans\02-subtropolis\04-design\working-plan.md`** — the construction sequence for the SubTropolis build. Phase 1 is 320,000 blocks carved.

33. **`D:\projects\mc-fleet-bot\masterplans\03-houston-tunnel-system\01-research\research-report.md`** — the prior research for the Houston tunnel masterplan. 6 mi, 95 blocks, 80+ buildings, 6 m below grade.

34. **`D:\projects\mc-fleet-bot\masterplans\03-houston-tunnel-system\04-design\working-plan.md`** — the construction sequence for the Houston build. 24-block sample, 4:1 linear compression.

## Web sources (real-world precedents)

### SubTropolis expansion

35. **Hunt Midwest SubTropolis** — official site. <https://huntmidwest.com/expertise/subtropolis/>. Confirms 10M leasable sq ft, 4M sq ft planned expansion, 90-day build for new powered shells, 120-day build for new warehouses. Source for §6.1.

36. **JPM "Hidden City" article** — *Journal of Property Management*. <https://jpmonline.org/hidden-city/>. Confirms SubTropolis has "more than 6 million square feet available for expansion" and "doubled in size since 2011." Source for §6.1.

37. **ULI Case Study C028009** — *Subtropolis Kansas City, Missouri*. <https://casestudies.uli.org/wp-content/uploads/2015/12/C028009.pdf>. Master plan calls for "eventual development of 50 million square feet of space; the expansion, using the grid system as a framework, will continue northward of existing development." Source for §6.1.

38. **Business Wire, 2021-11-22** — *Bluebird Network Announces Network Expansion into SubTropolis Technology Center*. <https://www.businesswire.com/news/home/20211122005002/en/Bluebird-Network-Announces-Network-Expansion-into-SubTropolis-Technology-Center-in-Hunt-Midwests-Kansas-City-Cave-Facility>. Confirms the November 2021 fiber expansion as a real example of *adding a new connection to existing underground infrastructure*. Source for §6.1.

39. **Data Center Post** — *Bluebird Network to Support in Major Technology Center in Kansas City, Missouri*. <https://datacenterpost.com/bluebird-network-to-support-in-major-technology-center-in-kansas-city-missouri/>. Confirms the Bluebird–LightEdge–SubTropolis partnership. Source for §6.1.

### Houston tunnel system expansion

40. **Discover Houston Tours** — *Downtown Houston Tunnel System*. <https://discoverhoustontours.com/?page_id=214>. Confirms 1950s origin, 1960s–70s boom, "at least five new buildings in the planning stages or under construction" today. Source for §6.2.

41. **Wikipedia** — *Houston tunnel system*. <https://en.wikipedia.org/wiki/Houston_tunnel_system>. 95 blocks, 7 miles, 6 m below grade, 80+ buildings, 27 named buildings connected. Source for §6.2.

42. **OffCite (Rice University), 2004** — *The Tower and the Tunnels: Reliant Energy Plaza*. <https://offcite.rice.edu/2010/03/TheTowerAndTunnels_Stern_Cite61.pdf>. The Reliant Energy Plaza underground rotunda as the micro-model of the Combined Complex Transit Hub plaza. Source for §6.6.

43. **Swamplot** — *The Tunnel Beneath the Dead Chronicle Building Is Now Open Again*. <http://swamplot.com/tag/downtown-tunnels/>. Confirms Calpine Center–Chase Tower tunnel reopened 2024 after 717 Texas redevelopment. Source for §6.2.

44. **Reason Magazine, 1988** — *Houston: Subterranean Treasures*. <https://reason.com/1988/06/01/subterranean-treasures/>. Confirms "any building, to be viable in downtown Houston, has to be on the tunnel system" and the cost ($1,000–$10,000 per linear foot). Source for §6.2.

### Toronto PATH

45. **Wikipedia (via search)** — *PATH (Toronto)*. 30 km, 1,200+ shops, 50+ buildings, 6 subway stations, 125+ access points. Confirmed via *Paper* (澎湃新闻) summary.

46. **The Paper (澎湃新闻), 2019** — *多伦多PATH：世界上最大的地下"通道"商场*. <https://www.thepaper.cn/newsDetail_forward_2256549>. Confirms the 3-phase history: pre-WWII individual company decisions; post-war subway integration with government 50% subsidies; 1980s+ mass expansion. The plan to reach 60 km. Source for §6.3.

47. **Book118 / Original sources** — *上海静安公园地铁枢纽地下空间开发*. <https://max.book118.com/html/2021/0414/6054222241003140.htm>. The Shanghai Jing'an Park case study includes a PATH profile: 30 km, 371,600 m² commercial space, 1,200+ shops, 5,000+ employees. Source for §6.3.

### Helsinki underground master plan

48. **Helsinki City Planning Department** — *Underground Master Plan*. <https://www.hel.fi/hel2/ksv/julkaisut/esitteet/esite_2009-8_en.pdf>. The 2009 brochure, 10M m³, 500 premises, 220 km technical tunnels. Source for §6.4 (and reference 10 in the existing research report).

49. **Finland.fi** — *Helsinki Underground: Where the City Plays, Swims and Shelters*. <https://finland.fi/life-society/helsinki-underground-where-the-city-plays-swims-and-shelters/>. Confirms 90 dual-use facilities. Source for §6.4.

50. **Helsinki Land Use** — *0-LAND_USE.pdf*. <https://www.hel.fi/static/kv/Geo/CasePankki/0-LAND_USE.pdf>. Source for Helsinki planning data.

51. **Helsinki Experience of Underground Space** — *Keynote-HELSINKI_EXPERIENCE_OF_UNDERGROUND_SPACE.pdf*. <https://www.hel.fi/static/kv/Geo/ISOT%20tiedostot/Keynote-HELSINKI_EXPERIENCE_OF_UNDERGROUND_SPACE.pdf>. Source for Helsinki keynote speech data.

### Stuttgart 21

52. **CNKI / 中国知网 (Chinese academic database)** — *Stuttgart 21 railway hub development*. <https://wap.cnki.net/touch/web/Journal/Article/GDJT201009005.html>. Confirms 109 hectares of freed surface land, rail infrastructure buried underground, new city quarter on top. Source for §6.5.

53. **ZsbEike** — *地下的枢纽站，地上的新城区——解读"斯图加特21"*. <https://www.zsbeike.com/zsdoc/1817726.html>. Confirms the 109-hectare figure, the 4 new underground stations, the 16 km of new tunnel. Source for §6.5.

### Oslo Opera House

54. **Wikipedia / MBA Lib** — *奥斯陆歌剧院案例分析*. <https://doc.mbalib.com/m/view/9a411f0986c9bb97330c345d7773937e.html>. Confirms Snøhetta design, 38,500 m², white marble carpet roof, public plaza that visitors can walk on, partial below-grade workshops. Source for §6.7.

### Underground master planning (general)

55. **ScienceDirect** — *Underground urbanism: Master Plans and Sectorial Plans*. <https://www.sciencedirect.com/science/article/pii/S0886779816300049>. "Integrated Master Plans allows considering the long term interaction of multiple land use layers." Source for §6.4.

56. **Wisusp.com** — *Nordic Master Planning for Underground Space Use*. <http://www.wisusp.com/?page_id=2190>. Confirms Helsinki as the canonical underground master plan. Source for §6.4.

### El Teniente Mine (Chile)

57. **Springer Link** — *The Risk Analysis Applied to Deep Tunnels Design—El Teniente New Mine Level Access Tunnels, Chile*. <https://link.springer.com/chapter/10.1007/978-3-319-09060-3_186>. 2,400 km of tunnels, 24 km of new access tunnels at ~1,000 m depth, drill-and-blast through igneous/sedimentary/volcanoclastic rock. Source for §6.8.

### German / Swiss rail infrastructure (cross-references)

58. **Transport and Logistics Bureau (Hong Kong)** — *Tuen Mun Bypass gazetted*. <https://www.tlb.gov.hk/eng/psp/pressreleases/transport/2023/20230929a.html>. Confirms the Tuen Mun–Chek Lap Kok Link sub-sea tunnel as a recent tunnel integration project. Source for §6.5 (cross-reference).

## Real-world precedent (existing research carries forward)

The following real-world precedents were surveyed in the prior 04-combined-complex research report (see source 17) and are referenced in this report without re-citing their primary URLs:

- **Sasso da Pigna / Festung San Carlo / La Claustra** (Swiss Réduit). 1941–1943 construction, 2,400 m galleries, 2,050 m above sea level, declassified 1998–1999, converted to museum and hotel. Source for §6.8.
- **Gotthard Base Tunnel.** 57.09 km, 2,300 m max cover, opened 2016. Source for §6.8.
- **Jurong Rock Caverns.** 5 caverns at 130 m, 1.47M m³, opened 2014. Source for §6.8.
- **G-Cans (Metropolitan Area Outer Underground Discharge Channel).** 6.3 km of tunnels, "underground temple" 177 m × 78 m × 18 m, opened 2006. Source for §6.8.
- **RÉSO (Montreal Underground City).** 33 km, 41+ metro stations, 3.3M sq ft commercial. Source for §6.8.
- **U.S. Federal Relocation Arc.** ~100 facilities, Mount Weather, Site R, Greenbrier, Cheyenne Mountain. Source for §6.8.
- **Houston tunnels (recurring).** Same as #40–44.

## Confidence legend

- **High confidence** (cited from multiple independent sources, or from a primary in-workspace file): see §12.1 of the report.
- **Medium confidence** (single source, plausible): see §12.2 of the report.
- **Low confidence / estimate** (inference, not direct): see §12.3 of the report.
- **Unknown / gap** (not knowable from current data): see §12.4 of the report.
