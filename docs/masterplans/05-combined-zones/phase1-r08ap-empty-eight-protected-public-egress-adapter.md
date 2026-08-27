# Combined Zones R08AP — Empty Eight protected public egress adapter

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE**

Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT` · Owners: `Z02-U1-CONCOURSE-MALL`, `OWN-D06-EG-A`

## What was built

R08AP completes the protected public egress path from Empty Eight's west
public retail gallery to the surface. The accepted EG-A headhouse already has
an open vertical egress shaft at `x=1651, z=148` rising from the concourse
level (`y=49`) to open air (`y>84`). The west gallery concourse (open air at
`x≥1653`) was separated from that shaft only by the stone-brick wall at
`x=1652`.

R08AP opened a **3-wide × 2-tall protected egress doorway** through that wall
at `x=1652, y=50..51, z=146..148`, plus two sea-lantern egress-route lights at
the lintel. This connects the widened PF08 stair → gallery concourse → doorway
→ EG-A shaft → open sky as one continuous protected egress route.

## Evidence

- Ledger: `data/world-review/combined-zones-r08ap-live-20260824T004029Z/evidence-ledger.json`
- Status: `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`
- Targets: 8 · Operated: 8 · Packages: 2 (`egress-doorway` 6, `egress-lighting` 2)
- Forward execution: **8/8 commands, 0 failed, 0 no-op** (strict-noop)
- Rollback post-state preflight: PASS
- Block-entity + live-entity clearance: 0 hits

## Boundaries retained

- The R07G sealed headhouse shell is preserved (`r07gHeadhouseSealed: true`);
- the EG-B shaft remains unopened;
- rail, drainage, fire/service, ventilation, mechanism, and exterior
  interfaces remain closed;
- no entity, occupant, container, or block entity introduced;
- accessibility is not claimed (the shaft is a vertical egress route; step-free
  access remains separate scope).
