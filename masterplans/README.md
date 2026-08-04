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

Directory roles:

- `01-cheyenne-mountain-complex/` — Cheyenne internal architectural program.
- `02-subtropolis/` — SubTropolis internal architectural program.
- `03-houston-tunnel-system/` — Houston city/tunnel internal architectural program.
- `04-combined-complex/` — normalized composition and inter-site architecture. Start at `04-combined-complex/AUTHORITY.md`.
- `05-combined-zones/` — accepted-map placement, Phase 0 terrain evidence, Phase 1 coordination/readiness evidence, current-world adapters/additions, interfaces, and delivery gates. Start at `05-combined-zones/MASTERPLAN.md`.

The plan to advance is Masterplan 05, using the exact `01 + 02 + 03 -> 04 -> 05` boundary in `04-combined-complex/authority-reconciliation.json`. Phase 1 coordination is a partial PASS, but operation compilation and construction remain on HOLD. The owner delegated autonomous research, design, and planning, and the resulting ledger freezes 20 conservative evidence-ready choices without requiring another human decision-maker. The exact B03 J-curve, D02 capped-sump/no-build basis, B07 west-two route, B09/B10 compact east-face basis, and D06 capped fail-closed reservations are selected for planning; P1-B11 is the only remaining unselected geometry choice. The R00 audit evaluates G01-G07 only: G01 passes and G02-G07 remain HOLD on missing complete-save, accepted future-cell, technical, ownership/interface, and mechanism evidence. Its sequencing check proves that design closure is pre-R00 and that R01 pilot/execution/post-state evidence cannot resolve D02, D05, D06, or G02. No physical pilot cells exist, every `R00…R13` release remains blocked until its exact gates pass, and no masterplan artifact authorizes world edits.

Only `05-combined-zones/maps/current-plus-proposed-phase0-overlay.png` is the authoritative proposed-placement overlay. See `05-combined-zones/maps/README.md` before using any other diagram.

Validate the authority chain and coordinate crosswalk offline with:

```bash
npm run test:masterplans
```
