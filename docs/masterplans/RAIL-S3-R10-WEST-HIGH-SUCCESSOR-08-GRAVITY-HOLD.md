# RAIL-S3-R10 · West High Successor-08 gravity hold

**Status:** STATIC-READY GRAVITY-SAFE CIVIL PACKAGE — NO LIVE CAPTURE OR MUTATION

The read-only Successor-07 post survey found a fluid-free next westward core
at `x=-134..-115, y=42..47, z=-472..-467` (720 cells; SHA-256
`e5ac35f17c122d8eeefd04602aa4f198b2501c01bb5ff67f4fb61f3474617b14`). It
cannot be directly cleared: three core cells, `(-130..-128,42,-472)`, are
gravel and each is supported by gravel beneath it.

The proposed shell surface has 616 cells (SHA-256
`005c8655736454f9d9c3059dd8a1087a766695ae565cc18e3d6f4078dc7b5215`),
including 56 predecessor-owned PDS cells and zero local PDS. Twenty-one
targeted shell cells are gravel, all at `y=41` and all over gravel. The
1,064-cell halo (SHA-256
`0fdd5b5c6ac510815c48637953d464d9877193c6fb4c78cd2954fa35536d2622`) has
32 gravel cells, 28 PDS cells, and 100 predecessor-owned interface cells. No
fluid was found in core, shell, or halo.

Do not issue a direct shell/core operation. A future package must derive exact
support, top-down gravity ordering, source states, inverse stages, and halo
proof first. This remains civil-only and does not commission a rail route or
passenger service.

## Static successor package

The required source-bound package now exists. It locks the 21 shell gravel
targets to polished deepslate first, then clears the core top-down, including
the three core gravel targets. All 24 target gravel columns have an enumerated
existing support chain terminating in a non-air, non-fluid base; no temporary
support is needed. The 32 halo gravel cells remain exact and untouched.

Static QA passes all 1,280 unique forward targets, both exact inverse stages,
four strict parsers, `560/560` and `720/720` forward preflights, zero
block-entity/protected blockers, and projected sequential rollback preflights
`720/720` then `560/560`. Evidence:
`data/world-review/rail-r10-west-high-successor08-offline-20260826T075000Z/`.
