# Masterplan Authority Index

The masterplans form one composition chain:

```text
01 Cheyenne internals ─┐
02 SubTropolis internals ├─> 04 normalized Combined Complex ─> 05 current-world placement
03 Houston internals ───┘
```

Directory roles:

- `01-cheyenne-mountain-complex/` — Cheyenne internal architectural program.
- `02-subtropolis/` — SubTropolis internal architectural program.
- `03-houston-tunnel-system/` — Houston city/tunnel internal architectural program.
- `04-combined-complex/` — normalized composition and inter-site architecture. Start at `04-combined-complex/AUTHORITY.md`.
- `05-combined-zones/` — accepted-map placement, Phase 0 terrain evidence, current-world adapters/additions, interfaces, and delivery gates. Start at `05-combined-zones/MASTERPLAN.md`.

The plan to advance is Masterplan 05, using the exact `01 + 02 + 03 -> 04 -> 05` boundary in `04-combined-complex/authority-reconciliation.json`. Masterplan 05 is currently approved for detailed design only. It is not a construction package and authorizes no world edits.

Only `05-combined-zones/maps/current-plus-proposed-phase0-overlay.png` is the authoritative proposed-placement overlay. See `05-combined-zones/maps/README.md` before using any other diagram.

Validate the authority chain and coordinate crosswalk offline with:

```bash
npm run test:masterplans
```
