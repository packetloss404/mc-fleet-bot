# MP11 / BKR C01 dimension-recovery design gate 01

Status: **SOURCE-BOUND WHOLE-SCOPE DESIGN HOLD — no operations**

This is the next substantive C01 functional scope: the portal approach,
public vertical, owner vertical, and staff backbone do not meet their required
clear envelopes. It is not a lighting or cosmetic package.

The fresh-source generator is:

```bash
node scripts/design_mp11_bkr_c01_dimension_recovery_01.mjs \
  --snapshot data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z \
  --out data/world-review/mp11-bkr-c01-dimension-recovery-design-01-cobalt-wl-post-20260826T233000Z
```

It produces a JSON gate and coordinate map. It never writes world operations,
contacts Minecraft/RCON, or authorizes a release.

The design’s first possible physical package is a finite portal gravity
containment liner or fully separated dry bypass. That package may not widen,
open, or reclassify any route. It requires finite gravity/fluid/receiver
boundaries, protected-core and container exclusion (or an exact reviewed
migration), two independent normal-walk returns, fresh entity clearance,
strict-noop forward/rollback preflights, journaling, fresh post capture, and
post/rollback route QA.
