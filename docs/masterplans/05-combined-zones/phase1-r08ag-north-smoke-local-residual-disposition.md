# R08AG north-smoke local residual disposition

Status: **SCOPE-LOCAL NON-DURABLE PHYSICS EXCEPTIONS; MASTER PLAN ACTIVE**  
Accepted-post census identity:
`84a54b6ad28ea0dd17d50cee790f9e45905af5b09d148766bef6064e3c96c573`

After accepted R08AG, exactly 161 `EE-SMOKE-N` plane cells remain outside the
frozen passive boundary state. This finding blocks only these cells and their
dependent north-smoke completion interface. It does not block another disjoint
R08 scope or Master Plan advancement.

| X band | Cells | Local reason | N06-adjacent |
|---|---:|---|---|
| 1702 | 7 | wet interaction | no |
| 1736 | 7 | gravity interaction | no |
| 1737..1739 | 21 | gravity interaction | yes |
| 1754..1758 | 35 | wet interaction | no |
| 1792..1795 | 28 | gravity interaction | no |
| 1833..1841 | 63 | wet interaction | no |

The primary partition is exactly 105 wet-interaction cells and 56
gravity-interaction cells. No source-state-only or opening-reservation residual
remains. The four N06 suspended gravel source cells remain the narrower local
exception inside the annotated 21-cell band.

The exact residual coordinate-set SHA-256 is
`f4213c696fb8b70945bd6826ec1f83e08ce0e813ff76a0be42e4c82e7d79b512`;
the wet and gravity partition coordinate-set SHA-256 values are respectively
`6831548b68550541b55a69c163526a2f822a6dc3d7fe6d98f03acdc96aedf273`
and
`ccb31f3148a2b051f19a8fdbc73a7f88ddd8821b8323504bec9554398b9608dd`.

Machine evidence:
`data/world-review/combined-zones-r08ag-live-20260822T020533Z/r08ag-accepted-post-residual-north-smoke-census.json`.
