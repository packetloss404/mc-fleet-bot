# Combined Zones Map Authority

Only two maps in this directory are sealed Phase 0 evidence:

- `current-plus-phase0-terrain.png` — raw one-block-per-pixel terrain from the immutable rerun post snapshot.
- `current-plus-proposed-phase0-overlay.png` — the authoritative current-world plus adopted study overlay. It uses origin `(2048,-328)`, rotation `0°`, the south-annex Empty Eight, and the current `site-coordinates.json` data points.

The following eight files are unsealed historical presentation diagrams. They are retained as design history or negative evidence and must not be used for coordinate extraction, construction, or QA:

- `current-and-proposed-whole-world.png`
- `current-and-proposed-whole-world.svg`
- `east-corridor-plan.png`
- `east-corridor-plan.svg`
- `gateway-approach-and-terminal-plan.png`
- `gateway-approach-and-terminal-plan.svg`
- `vertical-zoning-section.png`
- `vertical-zoning-section.svg`

Known stale content includes the rejected `(2250,-300)`, 90-degree transform, Gateway `z=-300`, the retired 1,277-block corridor and 7.9-degree rail crossing, north–south Empty Eight tracks with north stubs, and pre-rerun survey warnings. None of these eight files appears in `build-info.json`'s deliverables or `map-qa.json`'s sealed outputs.

When a presentation sheet is refreshed, write a new versioned artifact generated from the reconciled registry. Do not silently treat an older diagram as current because its filename lacks a version.
