# Masterplan Authority Index

Human review: [Current Masterplan HTML5 report](current-masterplan.html) — the
current 04→05 authority, adopted map placement, architectural intent, decision
status, phase gates, and visual evidence in one review-oriented document. The
linked Markdown and JSON records remain controlling.

The masterplans form one composition chain:

```text
01 Cheyenne internals ─┐
02 SubTropolis internals ├─> 04 normalized Combined Complex ─> 05 current-world placement
03 Houston internals ───┘
```

That 01–05 chain controls the Combined Complex/Combined Zones program. The
retroactive 06–13 plans are a parallel area library keyed one-to-one to the
eight durable `world_features.project_id` values in the read-only world
catalog; they do not alter or supersede the 01–05 authority chain.

Directory roles:

- `01-cheyenne-mountain-complex/` — Cheyenne internal architectural program. [AI working plan](01-cheyenne-mountain-complex/04-design/working-plan.md) · [human HTML](01-cheyenne-mountain-complex/masterplan.html).
- `02-subtropolis/` — SubTropolis internal architectural program. [AI working plan](02-subtropolis/04-design/working-plan.md) · [human HTML](02-subtropolis/masterplan.html).
- `03-houston-tunnel-system/` — Houston city/tunnel internal architectural program. [AI working plan](03-houston-tunnel-system/04-design/working-plan.md) · [human HTML](03-houston-tunnel-system/masterplan.html).
- `04-combined-complex/` — normalized composition and inter-site architecture. [AI authority reconciliation](04-combined-complex/AUTHORITY.md) · [human HTML](04-combined-complex/combined-complex-report.html).
- `05-combined-zones/` — accepted-map placement, Phase 0 terrain evidence, Phase 1 coordination/readiness evidence, current-world adapters/additions, interfaces, and delivery gates. [AI plan of record](05-combined-zones/MASTERPLAN.md) · [human HTML](05-combined-zones/combined-zones-report.html).
- `06-approach-road/` — Approach Road catalog baseline and stewardship roadmap. [AI plan](06-approach-road/MASTERPLAN.md) · [human HTML](06-approach-road/masterplan.html).
- `07-mainstreet-america/` — MainStreet America catalog/release baseline and phased stewardship plan. [AI plan](07-mainstreet-america/MASTERPLAN.md) · [human HTML](07-mainstreet-america/masterplan.html).
- `08-raven-rock/` — Raven Rock catalog, interior, wet-edge, and legibility plan. [AI plan](08-raven-rock/MASTERPLAN.md) · [human HTML](08-raven-rock/masterplan.html).
- `09-ravensgate/` — Ravensgate frozen-boundary and default-deny underground plan. [AI plan](09-ravensgate/MASTERPLAN.md) · [human HTML](09-ravensgate/masterplan.html).
- `10-ravensreach/` — Ravensreach catalog, route, and unapplied-configuration plan. [AI plan](10-ravensreach/MASTERPLAN.md) · [human HTML](10-ravensreach/masterplan.html).
- `11-town-expansion-r1/` — accepted Town Expansion R1 release baseline and future guarded-change plan. [AI plan](11-town-expansion-r1/MASTERPLAN.md) · [human HTML](11-town-expansion-r1/masterplan.html).
- `12-westlight-district/` — Westlight District historical interior baseline and chronology-reconciliation plan. [AI plan](12-westlight-district/MASTERPLAN.md) · [human HTML](12-westlight-district/masterplan.html).
- `13-westlight-venue/` — Westlight Venue catalog baseline and future venue stewardship plan. [AI plan](13-westlight-venue/MASTERPLAN.md) · [human HTML](13-westlight-venue/masterplan.html).

The plan to advance is Masterplan 05, using the exact `01 + 02 + 03 -> 04 -> 05` boundary in `04-combined-complex/authority-reconciliation.json`. Phase 1 coordination is a partial PASS, but operation compilation and construction remain on HOLD. The owner delegated autonomous research, design, and planning, and the resulting ledger freezes 20 conservative evidence-ready choices plus the separately accepted P1-B11 planning basis without requiring another human decision-maker. G03 now passes with all 30 proposal domains exact. Offline G04 accounting assigns all 15,286,976 construction/interaction-union cells once, with zero unowned or multiply owned cells, but final ownership acceptance remains absent. The R00 audit evaluates G01–G07 only: G01 and G03 pass; G02 and G04–G07 remain HOLD on complete-save, technical, external-interface/state, protected-feature, accepted-owner, and mechanism evidence. G06 discloses an exact 126-cell P1-B10 influence/shipwreck conflict. No physical pilot cells exist, every `R00…R13` release remains blocked until its exact gates pass, and no masterplan artifact authorizes world edits.

The 06–13 plans are retroactive, evidence-indexed baselines. Older folders under
`docs/` (for example `docs/mainstreet-america`, `docs/raven-rock`,
`docs/ravensreach`, `docs/worker-town`, and `docs/redevelopment`) remain source
provenance, not competing controlling masterplans. Broad 2D envelopes overlap
between several projects and do not prove shared ownership or collision; exact
3D/cell and interface evidence is still required. Reused external IDs must be
keyed by `project_id + external_id`, especially the five `RRCH-*` identifiers
that refer to different Ravensreach and Town Expansion structures.

Only `05-combined-zones/maps/current-plus-proposed-phase0-overlay.png` is the authoritative proposed-placement overlay. See `05-combined-zones/maps/README.md` before using any other diagram.

Validate the authority chain and coordinate crosswalk offline with:

```bash
npm run test:masterplans
```
