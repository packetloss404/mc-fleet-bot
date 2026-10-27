# RAIL-S3-R10 · upper ramp-01 (offline interface package)

**Status:** SUPERSEDED BY AS-BUILT RAMP-02

This is the civil-only dry transition from the accepted R09 endpoint to the
surveyed upper R10 candidate. It is deliberately separate from
roof-retention-03 and owns neither its shell/water component nor any future
upper horizontal service/tube extension.

## Exact owned migration and geometry

- `x=-75..-60`, one X-column per elevation step;
- tube base rises from `y=13` to `y=28`; separated gallery floor rises from
  `y=17` to `y=32`;
- 256 tube-interior and 576 gallery-interior air cells, plus 256 tube-wall and
  448 gallery-shell cells;
- 1,588 total targets;
- exact R09 predecessor-cap migration at `x=-75`: 16 running-tube and 36
  gallery interior cells change from the temporary polished-deepslate cap to
  air. The reviewed 52-cell set hash is
  `1447a99f30816199c5207cd326aed6c162b868ffca458aa2d3a4ee90448450f2`.

The original offline compiler, inverse, parser, source preflight, and
block-entity evidence are in `data/world-review/rail-r10-offline-20260826T053500Z/`
and `data/buildops/rail-s3-r10-upper-ramp-01.*`.

## Interfaces and hard stops

The only predecessor interface is the proven R09 cap migration. No full R09
wall, roof, gallery, roof-retention shell, upper service corridor, running
tube continuation, rail, or passenger facility is implicitly owned. The ramp
must preserve the accepted R07 retained-water system and R07–R09 civil
galleries/tubes outside its exact target and review halo.

Ramp-02 subsequently completed this fresh rebind and guarded kernel; see
`RAIL-S3-R10-UPPER-RAMP-02-RELEASE.md`. This package remains design provenance.
Any upper horizontal successor needs its own current-source compiler and kernel.

No rail, power, signals, vehicle, route, or passenger service is included.
