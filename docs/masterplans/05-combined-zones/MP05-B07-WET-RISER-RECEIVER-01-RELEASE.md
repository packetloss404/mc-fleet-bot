# MP05 B07 wet riser / R09E receiver 01

`MP05-B07-WET-RISER-RECEIVER-01` is the next bounded functional increment after the executed lower pressure gallery. It replaces only the gallery's central upper inspection bulkhead with a turn and vertical, fully lined maintenance riser, then ends at three closed manual hatches in the existing R09E lower landing.

It is deliberately a restricted connection, not a public route, egress route, transport route, or surface opening. The two-cell R09J gravity-isolation cap at `(2105,30..31,-397)` remains a retained source check; the R07J headhouse is outside the target and halo.

The ordered guarded package is:

1. `sealed-outer-liner-and-dual-bulkheads` — 264-cell polished-deepslate outer tube before any clearance.
2. `dry-core-turn-and-riser-excavation` — 40-cell three-wide, two-clear route core inside that liner.
3. `upper-receiver-hatches-and-ladder` — eight ladder rungs and three closed, non-waterlogged manual hatches at the R09E lower receiver.

The compiler binds the executed pressure-gallery post snapshot, checks the old lower bulkhead and the upper landing's canonical source blocks, excludes containers/protected cores, scans the finite entity halo, retains and hashes the finite 1,029-cell fluid boundary, and emits exact inverse operations only. It makes no live call or world edit. Before any execution, the scoped runner must refresh the complete source and repeat all safety-kernel checks.

Artifacts:

- Compiler: `scripts/compile_mp05_b07_wet_riser_receiver_01.mjs`
- Manifest: `data/buildops/mp05-b07-wet-riser-receiver-01.release-manifest.json`
- Standing authorization: `mp05-b07-wet-riser-receiver-governor-standing-execution-authorization.json`
- Independent post QA: `scripts/qa_mp05_b07_wet_riser_receiver_01_post_release.mjs`

