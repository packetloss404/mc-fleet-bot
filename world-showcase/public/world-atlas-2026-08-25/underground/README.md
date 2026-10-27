# Underground Atlas — Evidence Copy and Map Index

**Prepared:** 2026-08-25  
**Scope:** underground networks, bunkers, basements, tunnels, access points, and the rail-adjacent below-grade work.  
**Mode:** read-only documentation. This package does not alter a world, a release record, a source report, or a master plan.

This is the underground volume of the 2026-08-25 world atlas. It packages the most complete available map and screenshot set alongside the source records needed to interpret it. Images are byte-for-byte evidence copies; `manifest.json` records both their copied-file hashes and their original locations.

## What is here

- `navigation/maps/` — 20 snapshot-backed geographic, network, entrance, C01 level/stack, and Empty Eight circulation maps.
- `navigation/screenshots/` — 24 screenshot/evidence images, including contact sheets, C01, MainStreet, Westlight, Oasis, Gilded Raven, Raven Rock, and Empty Eight views.
- `construction-status/maps/` — 6 construction-status maps that distinguish current exact physical evidence from historic or design-only scope.
- `construction-status/screenshots/` — 4 current construction-status views of the B03 route, C01 L1 route, and Raven Rock evidence volume.
- `source-records/` — copied navigation inventory/access audit and the Bunker Construction Status report in its machine-readable, rendered, and printable forms.

## Map reading and evidence status

The navigation atlas uses north-up geography (decreasing Z) and east-right geography (increasing X); yellow **E** markers indicate access points. It maps 298 underground navigation records, 27 entrance/access records, and 20 maps from the R08AM inventory.

It is deliberately not a commissioning claim. The R08AM route audit found 19 of 22 representative routes in the immutable snapshot. The C01 mountain-portal-to-L1 route, MainStreet warehouse-drive-to-hall route, and Observatory hidden-portal-gallery route were unproven and must not be presented as available. Restricted Ravensgate access is excluded; portal-gallery rooms are destinations, not proof of active portals.

The construction-status material supplies the stricter physical-evidence interpretation: B03 has a proven bounded passive internal route; East C01 is model-fabric evidence with live/public commissioning still open; legacy C01 is partially bound current fabric; and Raven Rock has no current accepted complex release. Refer to `source-records/bunker-construction-status.md` for the exact nonclaims.

## Snapshot currency caveat

The broad visual/navigation set was generated on 2026-08-22 against terminal R08AM:

- snapshot root: `data/worldsnap-r08am-post-20260822T161818Z`
- region digest: `30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`
- complete-save digest: `0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699`

Several scoped underground and rail releases completed on 2026-08-25 after that baseline (including B03 access, C01 portal/L1 and service work, C01-next, and rail guideway/trackbed packages). Those post snapshots are recorded as source references in `manifest.json`, but this atlas does **not** claim that its 2026-08-22 screenshots or maps portray every later change. There is no single all-world immutable post snapshot in this package that reconciles every later scoped release. A fresh complete-world snapshot and regenerated visual atlas are required before calling the imagery current as of 2026-08-25.

## Visual QA

Representative images were visually inspected when this package was assembled:

- `navigation/maps/01-underground-world-overview.png` — readable system separation, geographic grid, legend, and entrance symbols.
- `navigation/maps/05-mainstreet-mountain-and-logistics.png` — readable legacy C01, warehouse, shelter, and access-layer labels.
- `construction-status/maps/01-bunker-evidence-overview.png` — readable current-vs-historic classification and target totals.
- `construction-status/screenshots/01-cheyenne-institutional-route.png` — readable bounded B03 corridor evidence view.

The images are documentation artefacts, not live camera captures. Check the copied JSON evidence and the original immutable snapshot before acting on an individual location.

## Integrity

Run `sha256sum -c manifest.sha256` from this directory to verify the copied package. `manifest.json` is the authoritative index for original path, copied path, byte length, SHA-256, content group, and source/baseline caveat.
