# Raven Rock Mountain Complex (Site R) — Minecraft Reconstruction

A planning set for a Minecraft Java 1.21.x reconstruction of the **Raven Rock Mountain Complex ("Site
R")** — the U.S. government's underground continuity-of-government / alternate-military-command bunker (the
"underground Pentagon") near **Blue Ridge Summit, Liberty Township, Adams County, Pennsylvania**,
historically tied to Fort Ritchie and Camp David. This build sits **~20 blocks beneath** the "MainStreet
America" (MSA) surface reconstruction on the same server.

This is the **project front door**. Start here, then read `references/` for the evidence and `planning/`
for the design.

---

## The honest headline (read this first)

**This build is an openly-labeled work of imagination, not a leaked map.** Raven Rock's *interior is
CLASSIFIED*, and since **25 May 2007** it has been against DoD policy to make "any photograph, sketch,
picture, drawing, map or graphical representation" of the complex. **There is no public floor plan, and we
did not seek one.** So everything you see *inside* the mountain — every room, corridor, cavern, tunnel,
spring, blast door, and dimension — is an **explicitly-labeled imaginative interpretation** of a public
landmark's public-record history and geology. It makes **no claim** to depict the real, secret facility,
and it never presents an invented detail as fact.

This is the **mirror image of the MainStreet America project.** There, we had verified building sizes and
a full home roster and only the *surfaces* were guesswork. **Here it is the opposite: the *context* is
well documented, but the *interior is classified and almost entirely invented.***

## What Raven Rock was (and is) — from the evidence layer, honestly labeled

A **real, well-known public landmark.** Its existence, location, geology, era, and mission are solidly on
the public record; only its interior is secret. The full source record with confidence labels is in
[`references/manifest.yaml`](references/manifest.yaml); the plain-language orientation is in
[`references/README.md`](references/README.md).

**What is genuinely known (verified):**

- **It exists and where:** the Raven Rock Mountain Complex, "Site R," inside Raven Rock Mountain near
  **Blue Ridge Summit, Adams County, PA**, ~6 miles from Camp David.
- **What the mountain is made of:** **greenstone** — a dark, chlorite-rich *metabasalt* of the Catoctin
  Formation. Popular articles call it "greenstone granite," but geologically it is **not** granite.
- **When it was built:** land seized **1951**; blasted out **1951–1953**; ~$35 million by 1954; roughly a
  half-million cubic yards of rock hauled away.
- **Its mission:** continuity of government / alternate military command — the **Alternate National
  Military Command Center (ANMCC)**, a backup to the Pentagon's command center (designated 1962).
- **Its most famous use:** **Vice President Cheney was moved there on 9/11 (2001).**
- **Its surface support base:** **Fort Ritchie, MD** (garrison until 1997, then Fort Detrick).

**What is reasonable but not certain (high-confidence inference):** the core design concept — freestanding
multi-story buildings that stand **clear of the cavern walls on giant steel springs** (shock isolation)
inside blasted caverns, connected by **gently curving tunnels**; **several tunnel portals** (commonly said
to be four); and **self-sufficiency systems** (reservoirs, on-site power, ventilation). These are rendered
*in concept* only — the spring counts, chamber sizes, portal positions, and layout are secret.

## What this reconstruction IS — and what it is NOT

**IS:** a bot-built Minecraft version of the *setting and concept* inside the sub-surface volume of a
**600×600-block protected envelope** centered on world origin. It renders a mountain of greenstone, tunnel
portals in the hillside, freestanding multi-story buildings perched on visible springs inside blasted
caverns, and a self-sufficient alternate-command program — all as an **honest, clearly-labeled imaginative
interpretation.**

**Is NOT:** a leaked or accurate map of a secret facility. It is **not** a claim about where the real war
room, tunnels, reservoirs, or quarters are; **not** a depiction of current systems, personnel, or defenses
(deliberately out of scope); and **not** a survey. Because the interior is undocumentable by law, the build
carries **mandatory on-site disclosure signage** at every portal, vestibule, shaft head, and lobby saying
exactly this.

## The honest evidence position

**Lead fact: the interior is classified, so the build is an explicitly-labeled imaginative interpretation,
not a leaked map.** Genuine public sources establish the *context*; the *interior* is invented and labeled
as such. Every finding carries exactly one confidence label, **never upgraded** — and here the distribution
is deliberately lopsided toward *creative approximation*, because the interior is secret:

| Label | Meaning | Applies here to |
|---|---|---|
| **verified** | primary / multi-source public fact | greenstone geology (not granite); the ANMCC / continuity-of-government mission; that caverns were blasted out (1951–1953); the signals/comms tenancy; the 9/11 use; the 2007 depiction ban |
| **high-confidence inference** | one good source / a strong read | the buildings-on-springs concept; ~four tunnel portals; self-sufficient utilities; gently curving tunnels |
| **moderate-confidence reconstruction** | assembled from weak/contested hints | the building count (three vs five); later expansion / contract figures |
| **creative approximation** | no evidence; the build invents it | **the entire interior** — every room, corridor, cavern outline, building footprint, tunnel route, portal position, spring array, blast door, and block palette; the ~20-block burial depth; the four-building count; the vertical access shaft |

**Bottom line for a visitor:** the *setting and mission* of this build are real history. The *interior* is
an honest, clearly-labeled work of imagination. Enjoy it as an interpretation of a public landmark — **not**
as a map of a secret one.

## Current build status

**Planning complete. Construction NOT started.** No block of Raven Rock exists yet. The planning set below
(references + master site-plan + coordinates + buildings + palettes) is finished and internally consistent
(the QA report's §3 cross-file audit confirms the three spatial files agree — see below). The QA framework
and definition-of-done gates are written; every inspection item is **PENDING** and the defect register
[`qa/defects.yaml`](qa/defects.yaml) is intentionally **empty** because there is nothing built to have
defects.

- **Single spatial owner — no coordinate fork.** Unlike MSA, which carried two incompatible layouts
  (GRID vs OVAL) that had to be reconciled, Raven Rock used **one master** (`planning/site-plan.md`); the
  two sibling YAMLs restate its numbers and **agree with it exactly.** The QA report
  [`qa/qa-report.md`](qa/qa-report.md) §3 recomputed and confirmed this.
- ~~**No-op stock Paper.**~~ **CORRECTED 2026-07-25 — both halves of this bullet were false.** The server
  runs **WorldEdit 7.4.0 and WorldGuard 7.0.16** (plus PacketCraft); the builder bots **are opped at
  level 4**. Only **Dynmap/BlueMap, EssentialsX and Citizens** are genuinely absent, so just
  `integration/map-marker.yaml` and `integration/warps.yaml` stay dormant. All geometry is still designed
  to be placeable by plain block placement (that remains a virtue, not a constraint).
  `integration/worldguard.yaml` is now **partly applied**: the `raven_rock` / `raven_rock_shaft` regions
  exist with `mob-spawning: deny` (OQ-3). The envelope is **not** yet build-protected — op bypasses
  `build: deny`, so the build flags wait on the OQ-2 de-op. See [`qa/oq3-worldguard.md`](qa/oq3-worldguard.md).

## Directory guide

```
docs/raven-rock/
├── README.md                    ← you are here (project front door)
├── references/
│   ├── manifest.yaml            authoritative source record + confidence labels + source conflicts (REF-001..018)
│   └── README.md                plain-language evidence orientation ("what's real vs invented")
├── planning/
│   ├── site-plan.md             MASTER site plan: 5 zones, circulation, overhead + section diagrams, vertical stacking
│   ├── coordinates.yaml         coordinate manifest: zones, building centroids, tunnels, notable locations (agrees with master)
│   ├── buildings.yaml           per-building records: footprints, floors, palettes, invented rooms, distinct massing
│   └── palettes.yaml            material palettes: greenstone rock kit, per-zone/type block sets, lighting, disclosure signage
├── integration/                 STAGED, INACTIVE plugin config (apply later, once plugins + world name exist)
│   ├── location.yaml            bot-readable location/alias record (mc-fleet-bot relay)
│   ├── warps.yaml               EssentialsX /warp definitions (visitor tour)
│   ├── map-marker.yaml          Dynmap marker set (site + POIs + boundary)
│   └── worldguard.yaml          WorldGuard region + flags
└── qa/
    ├── qa-report.md             acceptance framework: PC/BU/SP/CL/GE/DS inspection items + definition-of-done gates
    └── defects.yaml             as-built defect register (EMPTY — nothing built yet)
```

## Scale convention

- **1 horizontal block ≈ 2 real feet**, so **1 block² ≈ 4 ft²**.
- **~5 blocks of wall height per story** (~10 ft/story; roofs add ~2 more).
- The world origin is **(0, 64, 0)**; **Y = 64 is the MSA surface/build plane.** Raven Rock occupies the
  **sub-surface** volume of the same **X, Z ∈ [−300, +300]** (600×600-block) envelope MSA sits on top of.
- **Depth is a convention, not a survey.** The real complex is popularly said to sit ~650 ft below the
  ~1,527 ft summit; reproduced literally at this scale that is ~325 blocks down and off-envelope. We bury
  the complex only **~20 blocks** as a deliberate stand-in for "deep inside the mountain." Do not read the
  ~20-block depth as a literal figure.

## Vertical relationship to MainStreet America (the key cross-build constraint)

The two builds share the same X–Z envelope but **never overlap in Y.** Reading top (high Y) to bottom:

| Band | Y-range | Content |
|---|---|---|
| **MSA surface build** | **y62 → y79** | solid MainStreet America (foundation y62, road spine y63, buildings/roofs to ~y79) |
| **Rock buffer** | **y41 → y61** | **~20 blocks of undisturbed greenstone** — the solid mountain roof over the complex (nothing dug here except the one shaft) |
| **Raven Rock ceilings** | **y≈40** | blasted cavern roofs begin here |
| **Raven Rock cavern void + buildings** | **y40 → y−12** (buildings within y−18..y11) | the tall blasted caverns and their freestanding buildings-on-springs |
| **Deepest floor** | **y−18** | Cavern C reservoir sump; stays well above bedrock |

- **Raven Rock's highest point (y40) is 22 blocks below MSA's y62 foundation** — a solid greenstone buffer
  thicker than the required ~20. Nothing in Raven Rock ever enters MSA's y62→y79 band.
- **The one buffer-crossing element is the vertical access shaft** (a labeled deliberate liberty). It rises
  at **x = +120, z = +60 — outside MSA's x∈[−70,+70] footprint** — to a surface head-house in MSA's east
  greenbelt, so even it pierces only rock and collides with no MSA structure. If cut for purity, it drops
  with no effect on the four buildings or four portals.

---

*Confidence labels in this project are never upgraded. Where prose polish and a confidence tag disagree,
trust the tag. The interior is a clearly-labeled creative approximation throughout — a public landmark's
public history, imagined, not a map of a secret one.*
