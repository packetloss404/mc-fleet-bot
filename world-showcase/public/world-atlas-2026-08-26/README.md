# Active-world surface atlas — Team A

Generated 2026-08-26T16:11:48.836Z from the copied Anvil snapshot only.

- Snapshot SHA-256: `ca93ba68a729c359034841cff5636f1c6fe0ce73ad2c64a3736d684aa8865c7b`
- Orientation: north is image up (`-Z`); east is image right (`+X`).
- Overall coverage: `x[-512,2448] z[-1128,383]`.
- Rendering is surface-only. Raven Rock is predominantly underground, so only its
  measured N3/N4/N5/N6 portal mouths and N9 shaft are annotated.
- Ravensreach/Worker Town is the sole active town in `town.db`. Ravensgate,
  the Approach Road, and Westlight are active manifest-backed projects but do not
  yet have first-class rows in `world-map.db`.
- Hollybrook, island HQ, and the remote bunker coordinates are deliberately excluded:
  current repository guidance identifies them as retired DyoCraft-world records.
- Retired/superseded Ravensreach concert-hall, pavilion, and never-run fit-out units
  remain in the detailed inventory for provenance but are not mapped as active.

The concise map metadata is in `atlas-manifest.json`; the full normalized source
inventory is in `area-inventory.json`.
