# Ravensreach civic quarter — the Library, the Pavilion, the Concert Hall, the Square

**2026-07-26.** Follows `RAVENSREACH-REDESIGN-2026-07-26.md` and
`RAVENSREACH-INTERIORS-2026-07-26.md`.

---

## 1. What got built

| Building | Footprint | Levels | State |
|---|---|---|---|
| **Multiplex** (3 screens) | under the Moot Hall, B1/B2 | IMAX y55-66 + 2 medium y62-66 | built, repaired, post-capture verified |
| **The Library** | x[-144,-111] z[-448,-426] | 3 above (y67/75/83) + 3 below (y60/53/46) | built, audited |
| **Central Pavilion** | x[-105,-65] z[-449,-425] | open colonnade, glass vault y79-85 | built, audited |
| **Amsterdam square** | the plaza + two canals | y67 | built, audited |
| **Walkways** | plaza → pavilion → library, plus a ring road | y67 | built, audited |
| **Concert Hall** | bowl x[-135,-35] z[-553,-473], canopy x[-148,-22] z[-562,-450] | floor y55 → rim y81 → canopy y83-89 | built and walkable |
| **Market Hall / Grange Hall interiors** | — | 3 levels each | built |
| **The members' club** | under the bowl, y36-46 | vestibule → grand entrance → Red Room | built and walkable |

---

## 2. The Concert Hall — a 1/8-scale SoFi

A research agent produced a three-sentence identity test, and the build is organised
around it rather than around a floor plan:

> *A milky-white canopy that floats free of everything on skinny columns with open
> air under its brim; a double-sided oval ring of light hovering over the floor; and
> a bowl you enter from the top because the floor is buried.*

Everything else is seasoning. What that translated to:

- **The canopy.** A stepped elliptical dome, 127 × 113, rising y83 at the brim to y89
  at the peak. Milky frit ETFE is **white** stained glass, not clear — the frit is why
  SoFi glows rather than being transparent. The cable net is an orthogonal grid of
  light-grey glass every 5 blocks with chains slung beneath. The Frost-White
  perforated brim is a 7-wide ring of white concrete speckled with calcite and
  diorite, and a polished-deepslate compression ring marks the ETFE/brim junction.
  Twelve slender columns stand **outside** the bowl and hold the whole thing up.
- **The open perimeter.** A 2-block gap runs the entire way round between the bowl rim
  (y81) and the canopy underside (y83). This is the cheapest move in the build — it
  costs negative blocks — and it is the one that stops it reading as a domed arena.
- **The sunken bowl.** Floor at y55, twelve below town grade. You arrive at grade and
  walk *down*. From outside it reads as a low pavilion; the canopy peak is only 22
  above the ground you stand on.
- **The Infinity Screen.** An oval **ring**, 44 × 24, hung on chains at y70-74 — fifteen
  above the floor, nine clear below the canopy. Sea-lantern core, cyan/light-blue/
  magenta glass on both the inward and outward faces, black-concrete frame, and two
  deeper panels on the long axis for the undulating bottom edge. A flat jumbotron
  here would have killed the whole thing.
- **The canyons.** Two landscaped notches cut into the east and west sides, terraced
  from grade to floor and planted with azalea and fern, with water trickling down the
  west one. SoFi's bowl is notched, not a clean ring.

**Honest capacity note.** The user asked for 10,000. Counting one seat per block
across seventeen rows in three tiers plus the floor, this bowl holds roughly
**5,000–6,000**, not 10,000. Going higher would have meant either a wider bowl than
the site allows or a rake steep enough to break the canopy clearances. The research
is on my side here — SoFi's own small-venue sibling is the 6,000-seat YouTube
Theater under the same canopy — but the number is smaller than asked for and that is
worth stating rather than rounding up.

---

## 3. The Amsterdam square

Four moves, in descending order of how much Amsterdam-ness they buy:

1. **Klinker paving** — banded brick/mud-brick/granite instead of one flat tone. This
   is the single biggest signal and it is just a paving pattern.
2. **Two canals** flanking the Moot Hall, north–south, with mossy quay walls, stone
   coping, humped brick bridges, and **Amsterdammertjes** — the little bollards — every
   four blocks along both quays.
3. **A terrace of canal houses** closing the south side: seven narrow houses, 5-6 wide,
   four storeys, deliberately uneven rooflines, alternating **stepped**, **bell** and
   **neck** gables, tall narrow window bands, and a hoisting beam with a pulley and
   lantern over the street on every one.
4. **The monument** — a slim quartz column on the square's south axis, in the position
   Dam Square's National Monument holds.

---

## 4. What went wrong, and what it cost

This section exists because the failures here are more useful than the successes.

### 4.1 `//cyl` is centred on the player, and the player falls

The first bowl was built with WorldEdit's `//cyl`, one command per ring instead of
~70 coordinate fills — a 20× saving. It produced a near-solid lump. The cause: `//cyl`
uses the *player's* position, and the bot falls between the `/tp` and the command
reaching the server. Measured directly: a cylinder aimed at y=100 landed at y=98, one
aimed at y=104 landed at y=101. Non-deterministic, so fills and carves at the "same"
level missed each other.

Setting the bot to spectator did not fix it. The fix was to abandon player-relative
commands entirely and rasterise ellipses in Python, emitting `//pos1`/`//pos2`/`//set`
boxes with run-length merging across rows. Cost: 4,666 ops instead of ~350, about
2.2s each. Worth it — absolute coordinates depend on nothing.

**Trap #12: never use a player-relative WorldEdit command from a bot.** `//cyl`,
`//sphere`, `//pyramid`, `//forest` are all centred on the player and all have this bug.

### 4.2 My walkways cut through three cottages

`road()` clears y68-71 to air along its route so you can walk it. Three road legs ran
straight through cottage footprints and took out their walls; in Cottage Mason it also
destroyed two fittings and half a bed. **This is the same class of damage this whole
tooling effort exists to stop, committed by the tooling.**

Fixed three ways: walls restored by masked fill, fittings replaced (the *contents* of
the destroyed chest are gone and cannot be recovered), and the generator re-routed so a
re-run does not repeat it. Doors were fitted where a road now meets a cottage wall, so
the roads read as front paths rather than dead ends.

### 4.3 The canals leaked, twice

Both canals were dug with **open ends**. Water ran out of the south end and put 23
blocks inside Cottage Scout and 107 more across the ground between. End walls now cap
both ends.

Then it happened again from a different source: the farm irrigation channels I added
were laid with `REPL ... air → farmland`, which only converts the listed materials — so
cells that were already air stayed air, and the water spread through them across the
whole ground floor and back into the canal. Fixed at the cause (fill the court's air
gaps with farmland, wall both ends of each channel), not by re-draining.

**Both leaks were found by the audit, not by looking.** The audit is the reason this
section is short.

### 4.4 An audit check that passed because it found water

The first version of "canals do not leak south" was `type: contains, materials:
[water], max: 2`. `audit.py`'s `contains` only takes a **minimum**, so `max` was
ignored and the check passed with 9 blocks of escaped water because 9 ≥ 1. A leak check
that goes green when it finds a leak is worse than no check. It is now `type: absent`.

### 4.5 The pavilion was built on the mine apron

The pavilion's foundation replaced the "mine apron" the audit guards. Before retiring
that check I looked for what the apron was an apron *to*: no shaft, no rail, no ladder,
no torch anywhere below it down to y20. It was a paved pad with nothing behind it,
consistent with `mining.mineSite` being empty for this world. Nothing functional was
buried — but the check is retired with that reasoning written down, not silently
deleted.

---

## 5. The two interiors, and one thing deliberately not done

Both floor plans were executed with a rule applied without exception: **every fill
inside those buildings is a masked `REPL … air → material`**, which can only occupy
empty space. It cannot destroy a chest, a furnace, a crop, the embedded cobblestone
hut, the White Raven statue, or the neighbour cottage. Verified after the fact: chest
counts unchanged at 33 and 37.

**What was not done:** no chest was moved. Moving a chest with WorldEdit can
destroy its contents. Final route analysis found that the existing service
aisles already reach the racks: Market 3/3 representative approaches and Grange
8/8. Each hall contains 33 chest blocks; the stale Grange count of 37 included
four chests outside the hall box. No destructive chest-access work remains.

The farms were a genuine casualty of a different kind: farmland had already dried to
dirt (22 → 14 cells in the Market Hall) because the original irrigation was a single
water block. Both farms were rebuilt with real, contained channels.

---

## 6. Audit

`docs/ravensreach/audits/ravensreach.yaml` is now **112 checks, 112 passing**. It includes the
Concert Hall, members' club, repaired south multiplex, Market/Grange
circulation, and stair-only Moot/Sanctum route. Re-baselined: the plaza
paving (klinker, not stone_bricks), the plaza ground plane (the canal is an excluded
void, not a tolerated hole), and the Moot Hall roof and ridge, which moved from y77-85
/ y86 to y87-96 / y97 when two storeys went in beneath them.

Every minimum is measured from the world after the build and then given a margin.
Where a generator and the world disagree, the world wins.

```bash
python3 scripts/audit.py docs/ravensreach/audits/ravensreach.yaml --refresh
python3 scripts/audit.py docs/ravensreach/audits/ravensreach.yaml --json today.json --baseline yesterday.json
```

The Concert Hall and club are asserted from measured post-build state and
manifest route checks, not generator intent.
