# Cheyenne Mountain Complex — Design Deliberation Notes

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 01 — Cheyenne Mountain Complex
**Phase:** 03 — Discussion / binding decisions
**Moderator:** General-purpose worker (acting as Discussion Moderator)
**Date:** 2026
**Status:** Binding decisions for downstream Site Planner, Architectural Designer, and AI Contractor Writer.

---

## 1. The Panel

Before the build team puts down a single block, four voices had to argue it out. **The Realist** is the historian's advocate — if the public record does not show it, do not invent it, and do not import Hollywood into a place where people actually worked. **The Gameplay Advocate** is the player-in-the-world advocate — a 2-mile tunnel at 1:1 is unvisitable; a build that is technically accurate but takes 30 real minutes to traverse is a build that nobody experiences. **The Architect** is the design-coherence advocate — a build that lists every documented feature without a hierarchy of attention will read as a museum, not a place; the iconic features must dominate, the supporting cast must support, and the visitor must feel a clear silhouette and a clear flow. **The Veteran / Historian** is the feel-of-the-place advocate — the dead fluorescent light, the smell of floor wax and ozone, the way the granite sweats cold in the tunnel, the way a building is not on the floor but on top of a thousand half-ton springs: these are the details that distinguish a *replica* from a *memory*. This document is the record of how those four voices argued, where they compromised, and what they decided.

The deliberation matters because the downstream teams cannot begin the Site Planner / Architectural Designer / AI Contractor chain until these conflicts are resolved. Every decision below is **binding** unless explicitly flagged as an open question for the user.

---

## 2. Deliberation Transcript

### Topic 1 — Scale Compression

**The question.** At 1:1 scale (1 block = 1 meter), the build requires a 2,915-block-tall mountain and a 3,200-block-long access tunnel. That is unbuildable in vanilla Minecraft (build height 384). The research suggested a 2:1 vertical / 2:1–4:1 horizontal compression. What compression does the final build actually use?

**The Realist** opened with the floor. "The public record says 1,800 to 2,000 feet of granite over the chambers and a 2-mile curved access tunnel. Those numbers are not aesthetic suggestions — they are the engineering rationale. The whole point of the facility is that the *mass* of the mountain is the protection. If we compress the vertical too aggressively, the visitor walks out of the tunnel and looks up at a foothill and the silent drama of the place is gone. I will not sign off on a build that lets the player see the sky from the chamber ceiling. We should use a custom world with extended build height if we have to, but we hold the vertical at 1:1 or as close to 1:1 as the engine will allow."

**The Gameplay Advocate** pushed back. "A custom superflat with 1,024-block build height is a niche experience. Most players will be on vanilla. And honestly, even with the build height, a 2,900-block-tall mountain in a 1.6 GB Java world is going to chug — the chunk loading alone will be miserable. The tunnel is the bigger problem. At 1:1, the player walks for ten real minutes down a curving grey tube before the first blast door. Most of them will quit. I want 4:1 horizontal compression, 2:1 vertical, and the iconic features (blast door, spring array, Battle Cab) exaggerated in scale so the *visual signature* of the place survives even if the *numbers* do not."

**The Architect** argued for proportion. "What matters is not absolute distance — it is *relative* proportion. The mountain has to feel heavy above the chambers. The tunnel has to feel like a *journey*, not a hallway. The chamber array has to fit the eye — a player should be able to stand at one end of a chamber and see all fifteen buildings. If we go 2:1 vertical we preserve the 'weight above' feeling. If we go 4:1 horizontal, the tunnel becomes 800 blocks — long enough to be a journey, short enough to actually walk. I can live with that."

**The Veteran** made the case for the *feel* of the approach. "I have stood in that tunnel. You take a bus in. The first thing you notice is that the road curves and you cannot see where you are going. The second thing is that the rock changes — the rough granite starts to look finished, then you see the concrete liner. The third thing is the cold air on your face. The fourth thing is the *sound* — the bus engine, then silence when the door opens. None of that is about a 2-mile number. It is about the *moment* of not knowing where you are. We can compress the number and keep the moment. A 200-block curved approach that you cannot see the end of is the same emotional experience as a 2-mile one, because the player has no scale reference underground."

**Tension points.**
- The Realist and the Architect agree the vertical mass matters; the Gameplay Advocate wants it playable.
- The Realist and Veteran agree the approach should feel slow; the Gameplay Advocate wants it walkable.
- Nobody disagrees on the chamber interior scale — it is the 15-building array that has to be readable.

**Moderator's synthesis.** The vertical mass is non-negotiable — it is the entire engineering point of the place. The horizontal length is a journey, not a measurement. The custom world / modded build height is a small price for keeping the vertical *right*; we cannot substitute a small mountain for the actual mountain. The horizontal compression can be aggressive because the underground visitor has no scale reference, so the *journey* survives even when the *distance* does not. The signature details (blast doors, springs, the Battle Cab wall of displays) should be visually exaggerated because they are doing visual work that the lost horizontal distance used to do.

**Decision (binding).**
- **Vertical compression: 2:1.** The mountain is 1,450 blocks tall — too tall for vanilla (384), so the build **must** use a mod or a custom superflat with at least 1,024-block build height. No exceptions; the mountain has to feel heavy.
- **Horizontal compression: 4:1.** The access tunnel is ~800 blocks, the chamber array is ~45 × 25 blocks of floor plan. The 15-building grid fits the eye.
- **Signature detail scaling:** at compressed scale, the springs (1.25 × 0.5 blocks at 1:1) and blast doors (6 × 1 block at 1:1) become visually small. The designer is **authorized and required** to scale these features up by a factor of 2 inside their local context so they remain visible and iconic. This is a deliberate exception to uniform compression.
- **Effective player time from portal to Battle Cab:** target 5–8 minutes of walking, with the tunnel being deliberately dim and curving so the journey feels longer than it is.

---

### Topic 2 — Must-Haves vs. Cuts

**The question.** Of the dozen-plus documented features of the complex, which 8–12 are MUST-include? Which are cut entirely? Which get a "faded reference" (a single nod, not a full build)?

**The Realist** opened the list. "The documented core is: the mountain, the portal, the curved tunnel, the two blast doors, the 15 spring-mounted buildings, the chamber array, the four water reservoirs, the six diesel generators, the Granite Inn, the chapel, the medical clinic, the Battle Cab, and the 5 operations centers. If you cut any of those, the build is no longer a replica — it is a sketch. I will fight for the medical clinic and the chapel because the men and women who served there lived in those buildings for weeks at a time, and the *human* spaces are part of what the place is. The convenience store and the spin gym can be cut — they are quality-of-life, not the place."

**The Gameplay Advocate** was blunt. "If we build all of that, the player has a 30-minute walk to see everything and most of it is empty rooms with a sign. The build has to be *experienced* in 20–30 minutes of focused play. Cut anything that does not earn its visit. Keep the photo-op moments. The photo-op moments are: the portal approach from outside, walking into the tunnel, the blast doors, the chamber reveal (the moment you see 15 buildings on springs), the Battle Cab, the reservoirs, the Granite Inn (because it's funny), and the Stargate door (because it's a reward). Cut the dental clinic. Cut the gym. Cut the convenience store. They are *real*, but they are not *the place*. A faded reference for the 1980 false alarm, not a full build."

**The Architect** was thinking about composition. "The build has to read as a sequence. The visitor experience is: outside approach → portal → tunnel → blast doors → chamber reveal → Battle Cab. Every other feature is *set-dressing* for that sequence. The Granite Inn, the chapel, the medical clinic — these are *texture*; they belong in the chamber array as side-rooms, not as standalone destinations. The reservoirs are a *setpiece* — they are underground lakes with a boat, that is a money shot, that has to be a stop on the path. The 5 operations centers are the *climax* — the Battle Cab is the destination. The emergency escape tunnel and the air intakes are *infrastructure* — faded references, not full builds. We do not need to render the air-handling plant to make the build feel real."

**The Veteran** added the human layer. "The dental clinic. Keep the dental clinic. When you are locked inside a mountain for thirty days, the *quality-of-life* rooms are what keep people sane. The chapel is the same — the Air Force chapel is nondenominational and it is the only quiet room in the place. If the build is going to feel like the real complex, the *human maintenance* rooms have to be in there. But the Veteran in me also wants the *absurd* — the Granite Inn, the broom-closet Stargate Command door, the Santa tracker banner. These are the inside jokes of the people who worked there. They are as real as the Battle Cab."

**Tension points.**
- The Gameplay Advocate wants to cut the dental clinic, the gym, the convenience store, the chapel. The Realist and Veteran want them in. The Architect wants them as side-rooms of the chamber array, not as standalone destinations.
- The Realist wants all 5 ops centers built. The Gameplay Advocate wants the Battle Cab built and the other 4 named with one room each. The Architect wants the Battle Cab as the visual climax and the other 4 as functional set-pieces.
- The Researcher flagged "parade grounds" as a feature to consider; the research file contains no evidence of parade grounds at CMC. This is a flag for the user (see §5).
- The "emergency escape tunnel" is a feature the topic brief mentions; the research file does not document a dedicated emergency escape tunnel. The reservoirs are boat-navigable, which serves an emergency egress function, but no separate tunnel is described. Treat as a faded reference, if anything.

**Moderator's synthesis.** The build needs a clear hierarchy: the photo-op moments dominate, the human spaces are texture, the ops centers are the climax, the infrastructure is faded or cut. The Gameplay Advocate is right that everything cannot be a destination. The Veteran is right that the human spaces are part of what makes the place *feel* real, not just *look* real. The compromise is: include the human spaces as *connected side-rooms* of the chamber array, not as standalone builds. The build has to be experience-able in 20–30 minutes, but it has to *feel* lived-in.

**Decision (binding).**

**MUST-include (8–12 icons).** These are the features the build cannot omit and the visual language must convey:
1. **The mountain silhouette** — forested, multi-peaked, antenna arrays on the ridgeline.
2. **The North Portal** in the cliff face — concrete-and-steel arch, security perimeter, "CHEYENNE MOUNTAIN COMPLEX" lettering, speed-limit-15 sign.
3. **The curved / J-shaped access tunnel** — bare rock walls, rock bolts, exposed pipes, fluorescent lighting, deliberately dim, the visitor cannot see the far end.
4. **The 25-ton blast doors** — at least one set visible, on a side-tunnel branch, with the airlock chamber, the second door, and the hand-crank backup operator. **Scaled up 2× in local context** for visibility.
5. **The chamber array** — the money shot. 15 free-standing steel buildings on a visible spring array, ~18 inches of clearance to the surrounding granite, walkways between buildings, bare-rock ceiling above.
6. **The spring mounts** — the visitor must be able to *see* the springs under a building, and ideally see one building slightly sway. **Scaled up 2×** for visibility. The defining engineering detail of the place.
7. **At least one water reservoir** — underground lake, dark still water, the small boat on the surface. (The real complex has four; one is enough for the build.)
8. **The Battle Cab** — the Command Center, with the wall of displays, the U-shape of operator consoles, the time-zone clocks, the dim lighting, the "dead air" feel. The 2006–2016 vintage is the visual reference (it's the most documented era; see Topic 4).
9. **The four other named operations centers** — Air Defense, Missile Warning, Space Control, Combined Intelligence Watch. Built as functional rooms with consoles, screens, and labeled signage, but with simpler interior detail than the Battle Cab.
10. **The Granite Inn** — the bar. A small setpiece, signed, in a corridor off the chamber array. An inside joke that survived the Cold War.
11. **The chapel** — a small, austere room. *Required* per the Veteran; built as a side-room of the chamber array.
12. **The "Stargate Command" door** — a single door, signed, somewhere in a back corridor. The broom-closet joke, real and documented. Single nod, not a full build.

**Cut entirely.**
- The dental clinic, the spin gym, the medical clinic as standalone destinations. *If* they appear, they appear as small labeled side-rooms with a single piece of furniture each, connected to the chamber array. Not build-out.
- The convenience store, the post office, the VIP suites.
- The Mountain Man Park, the racquetball court, the softball field, the putting green, the horseshoe pits (all surface recreation facilities — the research lists them but they are post-Cold War and not iconic).
- The parade grounds — **not in the research file; flagged for user confirmation in §5.**

**Faded reference (a single nod, not a full build).**
- **The 1980 false alarm** — a small plaque or display in the Command Center area. "On June 3, 1980, a 46-cent computer chip failed in the missile warning network. NORAD briefly reported 2,200 Soviet ICBMs inbound. Bomber crews took their stations. The alert was resolved when a third call reported no radar or satellite confirmation." Permanent, not seasonal. (See Topic 5 for why this is real history, not Hollywood.)
- **The 1979 test-tape false alarm** — a single line on a different plaque: "On November 9, 1979, a 427M test program was inadvertently uploaded to the live warning system. 1,400 Soviet ICBMs reported. Resolved in 6 minutes." Optional, but cheap to add.
- **The emergency escape tunnel** — if built at all, it is a single locked door signed "EMERGENCY EGRESS" in the reservoir area. Not a buildable route. (If the research does not document a dedicated tunnel, the build should not invent one.)
- **The air intakes / blast valves** — a single visible blast valve on the chamber wall, with a sign. Not a tourable room.

---

### Topic 3 — Source Conflicts

**The question.** Six documented facts have conflicting numbers across the source base. The Realist pushed for the most authoritative source on each. The Gameplay Advocate did not care about the numbers. The Architect cared about which number produced the better build. The Veteran cared about which number matched their memory of the place. What does the build canon use for each?

**Conflict 1: Number of springs — 1,319 vs 1,311.**

**The Realist** was clear. "NORAD's official fact sheet says 1,319. The Air & Space Forces Magazine article cites 1,319. The Smithsonian magazine interview, which is also Steven Rose, says 1,311. The Dark Atlas article picked up 1,311. This is a transcription error that propagated. 1,319 is the canonical figure — it appears in the most authoritative military and Air Force sources, and 1,319 is a number that an engineer would actually count to, not round to. We use 1,319."

**The Architect** agreed. "1,319 is also a better *visual* number for a Minecraft player to encounter on a sign. It is specific, it is odd, it is memorable. 1,311 is forgettable. Use 1,319."

**The Veteran** was amused. "1,319 — that's the number you see on the technical fact sheet. Whoever is counting to 1,319 springs is having a bad day."

**Decision.** **1,319 springs.** No ambiguity. The build displays this number on the chamber array signage.

---

**Conflict 2: Rock cover — 1,800 vs 2,000 vs 2,500 ft.**

**The Realist** laid it out. "Air & Space Forces Magazine, July 2016, says 1,800. NORAD's mirror fact sheet says 2,000. Wikipedia cites 2,000. The Smithsonian magazine interview says 2,500. The research resolution is to use 2,000, which is the most widely cited figure. But 1,800 is from the official Air Force magazine of record. 2,500 is from the Smithsonian interview, which is also Steven Rose. I think the right move is to use 2,000 — it is the most defensible number, it is the one that appears in the most authoritative sources, and 2,000 feet is a round-enough number that it reads as a fact, not an estimate."

**The Architect** noted. "In Minecraft, at 2:1 vertical compression, the visual difference between 1,800 ft (550 m / 275 blocks of mountain above the chambers) and 2,500 ft (762 m / 381 blocks) is enormous. 1,800 ft is *heavy enough*. 2,500 ft is oppressive. The build can show more mountain above than is strictly accurate and it will *feel* more like the place. We should pick 2,000 and call it done."

**The Veteran** was more direct. "The exact number doesn't matter. The fact that you are *under a mountain* matters. At 1,800 feet of granite, you are under a mountain. At 2,500 feet, you are still under a mountain. The only failure mode is if the build lets the player see the sky from the chamber ceiling. As long as we don't do that, the number is a sign on the wall, not a structural commitment."

**Decision.** **2,000 ft of granite cover.** This is the most widely cited figure (Wikipedia, NORAD mirror, general press) and produces the right oppressive mass at 2:1 vertical compression.

---

**Conflict 3: Blast door weight — 25 tons vs 23 tons.**

**The Realist** was quick. "25 tons is the NORAD fact sheet, the Discover Magazine profile, most authoritative sources. Denver7 quotes Steven Rose at 23 tons. 25 tons is canonical. Use 25."

**The Veteran** was amused. "I have stood next to that door. It's a *big* door. Whether it's 23 or 25 tons is the kind of number you measure once and then never measure again. 25 tons sounds more impressive on a sign. Use 25."

**The Gameplay Advocate** was already thinking about the Minecraft implementation. "At 2:1 compression, we are scaling these up 2× for visibility. Whether the source figure is 23 or 25 tons is a footnote. The build displays 25."

**Decision.** **25 tons per blast door.** NORAD canonical. The 23-ton figure is likely a journalist's rounding error.

---

**Conflict 4: Building composition — 12 three-story + 3 two-story vs 13 three-story + 2 two-story.**

**The Realist** split the difference. "Both add to 15. The Air & Space Forces Magazine (official Air Force magazine of record) says 12 three-story + 3 two-story. The Denver7 article quoting Steven Rose says 13 three-story + 2 two-story. The 12+3 figure is the more *narratively* useful number — it gives the visitor a recognizable pattern: 12 large buildings (the operations centers, support) and 3 small support buildings (utility, the Granite Inn area, the chapel). Use 12+3."

**The Architect** saw the design opportunity. "12+3 is the better number for a Minecraft build. Three of the buildings are *visually distinct* — they are smaller, they are the support buildings. The visitor can recognize the hierarchy. 13+2 is too uniform."

**Decision.** **12 three-story + 3 two-story = 15 buildings total.** The 3 two-story buildings are visually distinct (shorter, identifiable as support), which serves the build's visual hierarchy.

---

**Conflict 5: Spring movement — 1 inch (normal) vs 12 inches (extreme event).**

**The Realist** was firm. "Both are correct, but they refer to different things. 1 inch is the design limit for normal shock events — what the springs are engineered to absorb in a typical scenario. 12 inches is the *structural* limit in an extreme event — the springs can physically move that much before the building contacts the granite. We should not pick one. We should display both on the chamber signage: 'Normal operation: 1 inch. Extreme event: 12 inches.'"

**The Architect** saw the visual payoff. "We can show this in the build. At least one building should have a *visible* sway animation (subtle redstone / observer contraption) — a slight movement to suggest the springs are doing their job. 1 inch is too small to render in Minecraft; we exaggerate to ~0.5 block of visible motion. The 12-inch figure is the *story* we tell in the signage — 'in an extreme event, the buildings can sway nearly a full meter.'"

**The Veteran** had a different take. "I never saw one move. Nobody alive has. The springs are insurance. The build can show a subtle mechanical flex, but it should not be a *theme park ride* — the visitor should not be able to shake the buildings. Subtle."

**Decision.** **Use both, properly labeled.** Signage in the chamber array: "Normal shock event: 1 inch of building movement. Extreme event: 12 inches." Optional: one building has a subtle, ambient sway animation (driven by redstone / observers) to make the springs *visible in action*; not a player-triggered effect.

---

**Conflict 6: Operational date — April 20, 1966 vs February 6, 1967.**

**The Realist** made the distinction cleanly. "April 20, 1966 is when General Dean C. Strother, NORAD commander, formally declared the Combat Operations Center operational. February 6, 1967 is when all planned systems came online and the tenant units moved in from Ent AFB. These are different milestones, and the build signage should say both: 'Combat Operations Center declared operational: April 20, 1966. Fully operational: February 6, 1967.'"

**The Veteran** preferred 1967. "The 1966 date is when the building was ready. The 1967 date is when the *mission* started. February 6, 1967 is when people actually started working in there. If I have to pick one for the front of the build, it's 1967."

**The Gameplay Advocate** wanted one date for simplicity. "Two dates is confusing. The 'fully operational' date is the one that matters. Use February 6, 1967 on the main entry signage. The 1966 date can be on a back-room plaque if it appears at all."

**Decision.** **Primary date: February 6, 1967** (Fully Operational) on the main entry signage. **Secondary date: April 20, 1966** (Combat Operations Center declared operational) on a single back-room plaque. Both are real, both are documented, both belong in the build.

---

**Moderator's synthesis of Topic 3.** Every one of these conflicts was resolvable with the principle *most authoritative source wins, but documented nuance is preserved on signage*. The build canon is: 1,319 springs, 2,000 ft of granite, 25-ton blast doors, 12+3 buildings, 1-inch normal / 12-inch extreme movement, 1966 declared / 1967 fully operational. The Veteran and the Gameplay Advocate turned out to be aligned on the *expressive* questions (which number feels right on a sign) more than the *factual* questions. The Realist's insistence on citing sources kept the panel honest.

---

### Topic 4 — Creative License Boundaries

**The question.** Interior floor plans of the 5 operations centers are classified. Public photos of the interior are 10+ years old. The MrBeast 2025 tour showed some new details but did not film everything. Where is creative license allowed? How do we mark "this is the real layout" vs. "this is designer's interpretation"?

**The Realist** was the most cautious. "The public record gives us the 1967 Lewiston Daily Sun chamber dimensions — 45 × 60.5 × 588 ft for the main tunnels, 32 × 56 × 335 ft for the cross tunnels. It gives us the operations center names. It does not give us the floor plans. Anything we build inside the buildings is invention. I am comfortable with that, but the *signage* in the build must say so. Every operations center room gets a small placard: 'INTERIOR LAYOUT — DESIGNER INTERPRETATION BASED ON DECLASSIFIED PUBLIC INFORMATION AND 2006–2016 PUBLIC PHOTOGRAPHS.' The visitor should never be told this is a real floor plan."

**The Gameplay Advocate** was practical. "We have to invent the interiors or the rooms are empty boxes. Invent them, but invent them *coherently*. The 5 ops centers should each have a different feel: the Command Center (Battle Cab) is the big public-facing one with the wall of displays; the Air Defense Operations Center is the radar-tracking room; the Missile Warning Center is the data-room with a wall of status screens; the Space Control Center is the orbital-tracking room with a star map; the Combined Intelligence Watch is the small briefing-style room. Use the public photos of the Battle Cab as the visual reference and extrapolate *outward* — if the Battle Cab has U-shaped consoles and time-zone clocks, the others have similar but distinct console arrangements. The visitor should walk through all five and feel the *family resemblance*, not five identical rooms."

**The Architect** was thinking about composition. "The 5 ops centers are the *climax* of the build. The Battle Cab is the climax of the climax. The visitor path goes: tunnel → chamber array → Battle Cab. The other 4 ops centers are off to the sides, accessible but not on the main path. Each is a *named destination* but the Battle Cab is the one the visitor remembers. The designer gets to invent the interiors, but the *visual signatures* of each are anchored to the public photos: the Battle Cab's wall of displays and time-zone clocks; the 1970s/80s console aesthetic (beige chairs, CRT monitors, 'dead air' fluorescent lighting). The look is *Cold War institutional*, not modern — because the public photos are all from that era and the modern look is classified."

**The Veteran** was firm on the *atmosphere*. "I have been in rooms like these. The smell is floor wax and ozone. The lighting is fluorescent, dim, slightly green. The ceiling tiles are the old institutional kind. The carpet is industrial grey. The chairs are beige. The consoles are dark grey or beige. The displays glow green or amber. There are no decorations, no plants, no art on the walls except maybe an Air Force emblem and a 'WELCOME TO THE NORAD COMMAND CENTER' ticker. The room is *built to be ignored* — the operators spend 12-hour shifts there, and the *absence* of stimulation is part of the design. The build's operations centers should feel that way. Not dystopian, not glamorous, not Stargate-set — *institutional*. The way a bank or a hospital feels, except with time-zone clocks."

**Tension points.**
- The Realist wants explicit "designer interpretation" placards on every ops center. The Architect thinks this is clunky and breaks immersion.
- The Veteran wants the *Cold War institutional* look (beige, CRT, fluorescent). The Architect wants the look that reads best in Minecraft block palette (which is what? probably quartz + light gray concrete + a small number of warmer accent blocks for the consoles).
- The Gameplay Advocate wants the 5 ops centers to feel different. The Realist is fine with that as long as none of them claim to be the real layout.

**Moderator's synthesis.** Creative license is unavoidable for the operations center interiors, and the panel agrees that *labeled* creative license is acceptable. The compromise: each ops center gets a small exterior sign with its name and function (Command Center, Air Defense, Missile Warning, Space Control, Combined Intelligence Watch) but does *not* claim the interior is the real layout. A single master placard in the chamber array — placed where the visitor must pass it — explains the designer's approach: "Operations center interiors are designer interpretations based on declassified public information, 2006–2016 public photographs, and the documented 1978 GAO report on the five operating centers." That placard is the *Realist's* insurance that no visitor is misled. The *Veteran's* atmosphere is the design brief: the rooms feel like the 1980s institutional Air Force, not like a movie set.

**Decision (binding).**

- **Visual reference era for all 5 ops centers:** the **2006–2016 vintage**, as documented in the NORAD public photos (the Battle Cab hero shots in the visual asset catalog). This is the most-documented era and the closest to public knowledge.
- **Atmosphere:** **Cold War institutional**. Beige chairs, CRT-style consoles (item frames with maps, jukeboxes, note blocks, redstone lamps for the green-glow of CRTs), fluorescent lighting (soul lanterns or shroomlights for the dim institutional feel), industrial grey carpet (light gray wool or concrete), the "dead air" feel. No torches, no warm wood, no decorative plants.
- **The Battle Cab** is the visual climax. Big wall displays (made of item frames on a wall, lit by redstone lamps behind), the U-shape of consoles, the time-zone clocks (ZULU / HAWAII / PACIFIC / MOUNTAIN / CENTRAL / EASTERN / MOSCOW — exactly the 8 time-zone labels documented in the 2006 NORAD photo), the "WELCOME TO THE NORAD COMMAND CENTER" ticker.
- **The other 4 ops centers** are functional set-pieces with distinct themes: Air Defense (radar-tracking screens), Missile Warning (status panels), Space Control (star map on the ceiling), Combined Intelligence Watch (smaller briefing-style room). Family resemblance to the Battle Cab; not identical.
- **A single master placard in the chamber array** states: "Operations center interiors are designer interpretations based on declassified public information, 2006–2016 public photographs, and the 1978 GAO report on the five operating centers. Layouts, console arrangements, and equipment placements are not the real facility layouts."
- **No Stargate props.** The "Stargate Command" door is a single broom-closet door, signed, in a back corridor — that is the *only* Stargate reference, and it is the real inside joke.

---

### Topic 5 — Easter Eggs and Cultural References

**The question.** The public mind associates Cheyenne Mountain with Wargames (1983), Stargate SG-1, "this is where they watch for nukes," the 1980 46-cent chip incident, and the 1979 test-tape false alarm. Include Wargames-style aesthetic? Stargate door gag? Other easter eggs? How explicit?

**The Realist** was the voice of discipline. "Wargames is a 1983 *dramatization of the 1979 false alarm*. It is a real historical event that became a movie. The build can reference it because the movie is part of the public history of the place. The 1980 46-cent chip incident is *real* — it is in the New York Times, it is in the GAO record, Zbigniew Brzezinski was woken at 3 a.m. The build can — and should — commemorate that. Stargate is a *fictional* TV show that used the place as a setting. The real Air Force was amused and put a sign on a broom closet. The build can have that one sign. The build should *not* have a Stargate, an iris, an Asgard, or any Stargate-flavor easter eggs. The build should *not* have a WOPR computer with 'GREETINGS PROFESSOR FALKEN' on the display. That is a movie prop, not a real object in the real complex. The line is: real history stays, fiction stays as a single inside joke."

**The Gameplay Advocate** wanted more. "The build is more fun if there are hidden things to find. A 'WOPR' terminal in a back room is a great easter egg — it's a reward for the player who explores everywhere. The Stargate door is funnier if there is a hint pointing to it. A NORAD Tracks Santa reference is delightful. The MrBeast video is the most-viewed public glimpse of the complex in modern media — a $1 vs $1,000,000,000,000 sign is a fun detail. The 1979 and 1980 false alarms are *important* — they are the closest the world came to nuclear war because of a place like this. They belong in the build, prominently."

**The Architect** was thinking about the visitor experience. "Easter eggs should be *subtle*. They should reward the explorer without breaking the design. The visitor who walks the main path should not feel like they are on a movie set. The visitor who goes off the main path should find rewards. The hierarchy is: real history is on the main path (the 1980 false alarm plaque, the operational dates, the Stargate door as a single nod in a corridor). Movie references are off the main path (a WOPR terminal in a back room, a 'Chrystal Palace' code name reference, the MrBeast sign). The visitor should leave with the *real* story, not the *movie* story."

**The Veteran** was the most passionate on this topic. "The 1980 false alarm is not an easter egg. It is the most important moment in the public history of this facility. The build *must* honor it. Zbigniew Brzezinski was woken at 3 a.m. He did not wake his wife because he calculated she had minutes to live. Bomber crews were in their aircraft. We were *that close* to nuclear war because of a 46-cent computer chip. The build should have a memorial — not a movie reference, a *memorial* — to the operators who had to make decisions in those minutes. They did not push the button. That is the story of the place. Wargames is a movie. The 1980 false alarm is what the movie is *about*. The build should make that clear."

**Tension points.**
- The Realist and Veteran agree the 1980 false alarm is real history and belongs. The Gameplay Advocate wants it, the Architect wants it, the Realist wants it. **This is not actually contentious — it is unanimous.**
- The Stargate door: the Realist allows it (it is a real inside joke), the Veteran appreciates it, the Architect wants it subtle (a single door in a back corridor), the Gameplay Advocate wants more Stargate flavor. **The compromise is the Architect's position: a single door, signed, in a back corridor, no other Stargate references.**
- The Wargames WOPR terminal: the Realist opposes (it is a movie prop, not a real object), the Gameplay Advocate wants it (it's fun), the Architect allows it as a *subtle* off-main-path easter egg, the Veteran is silent (they did not see one in the real complex). **The compromise is the Architect's position: a single WOPR-style terminal in a back room, with a 'GREETINGS PROFESSOR FALKEN' display, clearly a *movie reference*, not a claim about the real facility.**
- The MrBeast reference: the Realist is fine (it is a 2025 public tour video), the Gameplay Advocate wants it (it is the most-viewed modern tour), the Architect wants it subtle, the Veteran is neutral. **A small "$1 vs $1,000,000,000,000" sign in a back room.**
- The NORAD Tracks Santa tradition: the Realist is fine (it is real, it started in 1955), the Veteran appreciates it, the Architect wants it as a *seasonal* element, the Gameplay Advocate loves it. **A banner or sign in the chamber array, available as a seasonal decoration.**

**Moderator's synthesis.** The panel found unusual agreement on the most important point: **the 1980 false alarm is real history, not an easter egg, and the build must commemorate it.** That is the panel's strongest decision on this topic. Stargate is limited to the real inside joke (the broom-closet door). Wargames is allowed as a *labeled* movie reference, off the main path. NORAD Tracks Santa is a real tradition and gets a banner. The MrBeast video is a 2025 public reference and gets a small sign. The hierarchy is: **real history is on the main path; movie references are off the main path and clearly labeled as such; no fictional contamination of the primary visitor experience.**

**Decision (binding).**

| Reference | Placement | Treatment | Source-of-truth check |
|---|---|---|---|
| **1980 false alarm (46-cent chip)** | Main path, Command Center area | Permanent plaque with full text. "On June 3, 1980, a 46-cent computer chip failed in the missile warning network. NORAD briefly reported 2,200 Soviet ICBMs inbound. Bomber crews took their stations. The alert was resolved when a third call reported no radar or satellite confirmation." | Real history (NYT, GAO, National Security Archive). Permanent. |
| **1979 test-tape false alarm** | Main path, optional secondary plaque | Smaller plaque: "On November 9, 1979, a 427M test program was inadvertently uploaded to the live warning system. 1,400 Soviet ICBMs reported. Resolved in 6 minutes." | Real history (NYT, GAO). Permanent. |
| **Stargate Command door** | Off main path, back corridor | A single door, signed "Stargate Command." Nothing else. No iris, no gate, no Asgard, no chevrons. | Real inside joke (broom closet in the actual complex). |
| **WOPR terminal (Wargames)** | Off main path, back room | A single terminal with a screen displaying "GREETINGS PROFESSOR FALKEN." Clearly a movie reference; not labeled as real. | Movie (1983); clearly fictional. |
| **"Chrystal Palace" code name** | Off main path, signage in a back corridor | A small sign reading "CHRYSTAL PALACE — alternate NORAD exercise code name, c.1980s." | Wargames reference; the actual exercise code name is documented in the movie and the era. |
| **NORAD Tracks Santa** | Chamber array, optional seasonal | A banner: "NORAD TRACKS SANTA — December 24, since 1955." Available as a seasonal decoration. | Real tradition (1955 Sears misprint, Colonel Shoup). |
| **MrBeast 2025 tour** | Off main path, back room | A small "$1 vs $1,000,000,000,000" sign or play-button item frame. Subtle. | 2025 YouTube video; the most-viewed modern public tour. |
| **Interstellar, Hunger Games, CoD, Fallout, etc.** | **None.** | These are fictional settings that *used* Cheyenne Mountain. The build does not reference them. | — |

**The Realist's discipline holds:** real history stays and is commemorated, movie references are clearly labeled as movie references, and no fictional contamination of the primary visitor experience.

---

## 3. Decisions Summary (Binding for the Design Team)

### Scale and structure

| Decision | Value | Notes |
|---|---|---|
| Vertical compression | **2:1** | Mountain requires 1,450 blocks of build height; **mod or custom superflat with 1,024+ build height is mandatory**. |
| Horizontal compression | **4:1** | Tunnel = ~800 blocks. |
| Signature detail scaling | **2× local scaling** for blast doors, springs, and Battle Cab wall of displays | Authorized exception to uniform compression. |
| Target player time, portal to Battle Cab | **5–8 minutes walking** | Tunnel is deliberately dim and curving. |
| Player time to experience the build | **20–30 minutes focused play** | Most of the iconic features on a single main path. |

### Source canon (Topic 3)

| Fact | Build canon | Source basis |
|---|---|---|
| Number of springs | **1,319** | NORAD fact sheet, Air & Space Forces Magazine. 1,311 is a transcription error. |
| Granite cover | **2,000 ft** | NORAD mirror, Wikipedia. Most widely cited. |
| Blast door weight | **25 tons** | NORAD canonical. Denver7's 23 tons is a rounding. |
| Building composition | **12 three-story + 3 two-story = 15** | Air & Space Forces Magazine (Air Force magazine of record). |
| Spring movement | **1 inch normal, 12 inches extreme** | Both correct; both labeled on signage. |
| Operational date | **Primary: Feb 6, 1967 (fully operational); Secondary: April 20, 1966 (declared operational)** | Both are real milestones. |

### Must-have features (Topic 2)

1. **Mountain silhouette** — forested, multi-peaked, antenna arrays on the ridgeline.
2. **North Portal** in the cliff face — concrete-and-steel arch, security perimeter, signage.
3. **Curved / J-shaped access tunnel** — bare rock walls, rock bolts, exposed pipes, dim fluorescent.
4. **25-ton blast doors** (scaled up 2×) — at least one set visible, on a side-tunnel branch, with the airlock chamber and hand-crank backup.
5. **Chamber array** — 15 free-standing steel buildings on visible spring array, ~18 inches clearance to granite, walkways between buildings.
6. **Spring mounts** (scaled up 2×) — visible under each building; at least one with a subtle ambient sway animation.
7. **At least one water reservoir** — underground lake, dark still water, the small boat.
8. **The Battle Cab** — Command Center, 2006–2016 vintage as visual reference, U-shape consoles, time-zone clocks, "WELCOME TO THE NORAD COMMAND CENTER" ticker.
9. **The other 4 named ops centers** — Air Defense, Missile Warning, Space Control, Combined Intelligence Watch. Functional rooms, family resemblance to Battle Cab.
10. **The Granite Inn** — the bar, signed, in a corridor off the chamber array.
11. **The chapel** — small, austere side-room.
12. **The "Stargate Command" door** — single door, signed, in a back corridor. (See Topic 5 for the rule on this.)

### Cut entirely

- Dental clinic, spin gym, convenience store, post office, VIP suites (as standalone destinations; if any appear, they are small labeled side-rooms).
- Mountain Man Park, racquetball court, softball field, putting green, horseshoe pits (surface recreation; not iconic).
- **Parade grounds** — **not in the research file; flagged for user confirmation in §5.**

### Faded reference (single nod, not full build)

- **1980 false alarm** — permanent plaque on the main path. Full text. (See Topic 5 table.)
- **1979 false alarm** — optional smaller plaque. (See Topic 5 table.)
- **Emergency escape tunnel** — single locked door signed "EMERGENCY EGRESS" in the reservoir area. Not a buildable route.
- **Air intakes / blast valves** — one visible blast valve on the chamber wall, signed.

### Creative license for interiors (Topic 4)

- **Visual reference era: 2006–2016** for all 5 ops centers.
- **Atmosphere: Cold War institutional** — beige chairs, CRT-style consoles, dim fluorescent, industrial grey, "dead air" feel.
- **One master placard in the chamber array** stating: "Operations center interiors are designer interpretations based on declassified public information, 2006–2016 public photographs, and the 1978 GAO report on the five operating centers."
- **No Stargate props** beyond the single signed door.

### Easter eggs and cultural references (Topic 5)

- **1980 false alarm** — permanent main-path plaque, full text. **This is real history, not an easter egg.**
- **1979 false alarm** — optional secondary plaque.
- **Stargate Command door** — single door in back corridor. Nothing else Stargate.
- **WOPR terminal (Wargames)** — single back-room terminal with "GREETINGS PROFESSOR FALKEN." Clearly labeled as a movie reference.
- **"Chrystal Palace" code name** — small sign in back corridor.
- **NORAD Tracks Santa** — chamber array banner, seasonal.
- **MrBeast 2025 tour** — small "$1 vs $1,000,000,000,000" sign in back room.
- **No** Interstellar / Hunger Games / CoD / Fallout / Terminator / Horizon references. These are fictional settings; the build does not reference them.

### Block palette (carried forward from research, ratified by panel)

- **Mountain exterior:** andesite, pink-red granite (or polished andesite with pink terracotta accents), grass blocks, podzol, oak and spruce leaves.
- **Tunnel walls:** stone, granite, andesite, polished andesite, light gray concrete for the portal.
- **Blast doors:** dark gray concrete, black concrete, iron bars/chains, anvils or heavy weighted pressure plates.
- **Springs:** iron bars, chains, end rods, or fence posts laid sideways — must read as coiled.
- **Chamber floors:** smooth stone, polished andesite, quartz or calcite accents.
- **Buildings:** white concrete, light gray concrete, smooth stone slabs, iron doors.
- **Reservoirs:** water source blocks, dark prismarine walls to read as "carved."
- **Diesel reservoir:** sealed room, black concrete, magma blocks (subtle), redstone lamps as warning lights.
- **Generators:** piston + observer contraptions, or iron blocks with lightning rods and redstone for visual interest.
- **Lighting:** dim — redstone lamps, soul lanterns, shroomlights. No torches.

---

## 4. Tensions and Tradeoffs Acknowledged

The panel did not get everything. The decisions above are the binding outcome, but the tradeoffs are real and should be visible to the design team.

- **2:1 vertical compression is not 1:1.** We chose 2:1 (with a 1,024+ build height mod) over the Realist's preferred 1:1. **Lost:** the literal mass of Pikes Peak above the chambers. The mountain is heavy in the build, but it is not *2,900 blocks* heavy. The visitor will not have the engineering experience of the actual rock mass overhead — they will have the *memory* of it. This was the price of playability.

- **4:1 horizontal compression cuts the 2-mile tunnel to ~800 blocks.** The visitor walks 5–8 minutes from the portal to the Battle Cab. **Lost:** the *physical length* of the approach, the bus ride, the slow turn of the curve as a real-time experience. The Veteran noted that the *emotional* experience of the journey survives (the visitor still cannot see the end of the tunnel, the rock still changes character, the light still changes), but the *physical* experience is compressed. The 2-mile approach is a defining feature of the real place; the build's approach is a memory of it.

- **5 ops centers are designer interpretations, not the real layout.** We accepted labeled creative license. **Lost:** the visitor does not see the *real* Battle Cab or the *real* Air Defense Operations Center. They see plausible Cold War institutional rooms with the same visual signature. The placard is honest about this; the experience is not the real thing. This was the only way to build the interior at all.

- **The 1980 false alarm is a plaque, not a memorial.** The Veteran wanted a *memorial* — something that honors the operators who did not push the button. The panel agreed the false alarm is the most important moment in the public history of the facility, and the plaque is on the main path. **Lost:** the plaque is text on a wall, not a sculpture, not an experience. A future iteration could do more.

- **The Spring sway is subtle, not dramatic.** The Veteran said they never saw one move. The Architect said a player-triggered shake would be a theme-park ride. We chose a single building with a subtle ambient sway animation. **Lost:** the visceral drama of *seeing* a building lurch on its springs. The springs do their job silently; the build reflects that.

- **Stargate is limited to the broom-closet door.** The Gameplay Advocate wanted more Stargate flavor. The Realist wanted less (the single door was the limit of tolerance). **Lost:** the visitor does not find a Stargate, an iris, a "Chevron 7 encoded" message, or an Asgard. The build is not a Stargate set, and the panel agreed that the real place is more interesting than the fictional one.

- **The surface facilities (parking lot, fire station, recreational) are cut.** The Realist wanted the surface campus to be present; the Gameplay Advocate cut them as not iconic. **Lost:** the visitor does not see the surface campus that the public actually drives past, the parking lot halfway up the mountain, the fire station, the anonymous exterior that was "designed to look like a mountain." If a future iteration has the bandwidth, the parking lot and the security checkpoint are the *only* surface elements worth adding — they are the public face of the place.

- **The Granite Inn, the chapel, the medical clinic are side-rooms, not destinations.** The Veteran wanted the *human spaces* to be present. They are, but as small side-rooms of the chamber array, not as standalone buildings. **Lost:** the visitor does not have the experience of *finding* the chapel or the bar as a destination; they walk past them in the chamber array. This is a real loss; the human spaces are part of what makes the place feel lived-in. The design team should make sure these rooms are *visible from the main path*, not hidden.

- **The 12-inch extreme-event spring movement is a sign, not a visible effect.** The build shows 1 inch (exaggerated to ~0.5 block) of ambient sway. The 12-inch figure is on the signage. **Lost:** the visitor does not have the experience of *seeing* what an extreme event would feel like. The signage tells them; the build does not show them.

- **Parade grounds: not in the research, not in the build, flagged for user.** If the user confirms parade grounds are wanted, they are a faded reference (a flat open area near the portal with a flagpole), not a full build.

---

## 5. Open Questions for the User

The panel made every decision it could. A small number of items need user input because either the research does not support a decision or the decision depends on user preference.

1. **Parade grounds.** The research file contains no evidence of parade grounds at the Cheyenne Mountain Complex. The topic brief mentions them. **Is the user asking about a real feature, or is this a feature the user wants the build to *include* as creative license?** If creative license, a flat open area near the portal with a flagpole is a faded reference (a single nod, not a full build). If real, the research does not support it. **User decision needed.**

2. **Air intakes.** The research documents blast valves, NBC filtration, and the ventilation system in general, but does not describe a *tourable* air intake structure. The topic brief mentions air intakes. **Is this a feature the user wants the build to include?** A single visible blast valve on the chamber wall with a sign is the current faded reference. A dedicated air-intake structure (a small setpiece with the iconic mushroom-shaped intake of a Cold War bunker) would be a more substantial build. **User decision needed: faded reference or setpiece.**

3. **MrBeast video content.** The 2025 MrBeast video is the most-viewed public tour of the facility in modern media. The visual asset catalog does not include specific screenshots from it. **Does the user have access to the video, and are there specific details (rooms, angles, equipment) that the design team should incorporate as visual references?** If yes, the build's Battle Cab and 5 ops centers can be updated to match the 2025 public reality, not just the 2006–2016 photos. If no, the 2006–2016 vintage remains the visual reference. **User decision needed.**

4. **The Battle Cab hero image.** The visual asset catalog identifies `interior/5.jpeg` and `interior/2.jpeg` as the gold-standard NORAD command center shots. **Does the user have a preference between the two as the primary reference for the Battle Cab interior?** `interior/5.jpeg` is the more famous vintage shot (ZULU / EXERCISE / HAWAII / PACIFIC / MOUNTAIN / CENTRAL / EASTERN / MOSCOW clock displays, ASCII status panels, "WELCOME TO THE NORAD COMMAND CENTER" ticker). `interior/2.jpeg` is a later-era angle with a globe projection. Both are in the public domain. **User decision preferred, but not blocking; default to `interior/5.jpeg` if no preference.**

5. **The build's name and the entry signage.** The visual asset catalog's hero shot shows "CHEYENNE MOUNTAIN COMPLEX" on the portal. The build's entry signage should match. **Does the user want the build to be titled "Cheyenne Mountain Complex" (the official name until 2020) or "Cheyenne Mountain Space Force Station" (the current official name since 2020)?** Default: "Cheyenne Mountain Complex" because that is the historically iconic name and the one on the public portal signage. **User decision preferred, but not blocking.**

6. **Build size budget.** The panel set the compression at 2:1 vertical / 4:1 horizontal, but did not set a hard cap on total block count or build footprint. The downstream Site Planner will need a budget. **What is the user's target build size?** (vanilla default world, superflat, modded with extended build height, custom world?) This decision affects how the 1,450-block-tall mountain is rendered and how the chamber array is laid out. **User decision needed before the Site Planner begins.**

7. **The "Stargate Command" door: signed how?** The Realist allowed a single door, signed. **Should the sign be the literal "STARGATE COMMAND" (the real broom-closet joke) or a more subtle reference (e.g., "SGC — Authorized Personnel Only")?** Default: "STARGATE COMMAND" because that is what the real sign says. **User decision preferred, but not blocking.**

8. **The 1980 false alarm plaque: full text or excerpt?** The panel agreed on the importance of the moment. The plaque text in §2 Topic 5 is the full text. **Does the user want the full text, or a more concise version for the build?** The Veteran preferred full text; the Architect worried about reading time on a tour. **User decision preferred, but not blocking; default to full text.**

---

*End of deliberation. The decisions in §3 are binding for the Site Planner, Architectural Designer, and AI Contractor Writer unless explicitly flagged as an open question in §5. The tensions in §4 are documented so the design team understands what was lost and can flag back if any tradeoff is unacceptable.*
