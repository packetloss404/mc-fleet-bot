# Combined Zones R08Q — N06 Gravity Blocker

Status: `BLOCKED_N06_EXACT_DURABLE_ROLLBACK_IMPOSSIBLE_FOR_CURRENT_SOURCE`

N06 is a local four-cell exception only; it does not hold N09, N07, or any
other disjoint scope. The accepted R08P post contains unsupported gravel at
`(1737,52,49)` over air, `(1738,52,49)` over air, and a two-cell gravel stack
at `(1739,52,49)` / `(1739,51,49)` terminating on air at `(1739,50,49)`.

Static support can make the forward shell build safe. It cannot make exact
rollback durable: exact inversion must restore the air supports, after which
the four restored gravel states fall; retaining support would not be an exact
inverse. The guarded compiler therefore rejected N06 before writing any
canonical operation or manifest file.

The immutable machine-readable finding is
`data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json`.
It is bound to R08P complete-save SHA-256
`bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505`
and region SHA-256
`b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25`.
No live call, world edit, or service mutation occurred.
