# Surface atlas — 25 August 2026

This is a read-only visual atlas for the surface side of the current-world
planning record. It contains a broad build index plus detailed district maps,
and a separate, hash-recorded selection of existing surface screenshots.

## Snapshot basis and current-state caveat

- **Base terrain snapshot:** `data/worldsnap-r08am-post-20260822T161818Z/region`
  (52 region files; SHA-256
  `30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`).
- **Rendering method:** `scripts/generate_surface_atlas.mjs`, offline against
  copied Anvil `WORLD_SURFACE` heightmaps. It made no world, RCON, service, or
  bot mutation.
- **Map coverage:** x `[-512, 2448]`, z `[-704, 383]`; north is image up
  (`-Z`) and east is image right (`+X`).
- **Important:** this is the newest *complete* immutable snapshot found for the
  shared atlas extent. The releases from 24–25 August are newer but are
  separately captured, narrow region deltas, not a merged complete world save.
  Consequently these maps are an accurate 22 August broad baseline and must
  not be read as visual proof of every later scoped surface change. Their
  release ledgers/post-state evidence remain controlling for those scopes.

## Maps

| Map | Focus |
|---|---|
| [00 overall build index](00-overall-active-world-surface-atlas.png) | Whole mapped extent, including labelled below-grade Combined Zones / Empty Eight / B09 context. |
| [01 Ravensreach core](01-ravensreach-core-and-old-town.png) | Expanded core and preserved Old Town boundary. |
| [02 Ravensgate](02-ravensgate.png) | Garth, Bell-Gate, belvedere, Long Water, western handoff. |
| [03 Western Approach Road](03-western-approach-road.png) | Ravensgate-to-Westlight route and waypoints. |
| [04 Westlight](04-westlight-venue-and-district.png) | Venue, district, Gatehead, High Street, waterfront. |
| [05 western project corridor](05-western-project-corridor.png) | Ravensreach → Ravensgate → Approach Road → Westlight relationship. |
| [06 Raven Rock surface access](06-raven-rock-surface-access.png) | Measured N3/N4/N5/N6 portal mouths and N9 shaft only. |

Raven Rock, Empty Eight, B09, Cheyenne, bunkers, basements, and tunnels are
not shown as surface footprints when they are below grade. Consult the sibling
underground atlas for their level plans and route evidence.

## Companion records

- [Atlas manifest](atlas-manifest.json) records exact map bounds, pixel sizes,
  hashes, snapshot provenance, decoder statistics, and nonblank verification.
- [Area inventory](area-inventory.json) normalizes the local world/town/control
  catalogs and active build manifest. Its catalog limitations are retained; it
  does not invent missing parcels or facilities.
- [Screenshot manifest](screenshot-manifest.json) records the copied source,
  original evidence path, hash, date class, and limitation for each screenshot.
- [Screenshots](screenshots/) are supporting visual evidence. They are not
  substituted for the pinned atlas snapshot or newer release acceptance.

## Scope notes

The active named surface areas come from current manifest/catalog evidence:
MainStreet America, Ravensreach, Ravensgate, the Western Approach Road, and
Westlight. Raven Rock is represented on this sheet only through its measured
surface access anchors. Retired DyoCraft-world locations and explicitly
superseded/never-run units are excluded from the active map treatment.
