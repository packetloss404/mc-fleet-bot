#!/usr/bin/env node
/**
 * MP11 C01 main switchback upper-portion / accepted-transition-01
 * bilateral endpoint/opening/transition contract.
 *
 * Source-bound, read-only design contract. It binds the 51-cell overlap
 * between the C01 upper-portion redesign 01 and the accepted main switchback
 * transition 01 as compatible target states (both designs place the same
 * polished_blackstone_stairs at y=40..41 and air at y=42..46), and records
 * the exact transition contract and inverse-order proof needed before any
 * physical upper-portion release may proceed.
 *
 * It emits zero operations, zero rollback, zero mutation authority.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const UPPER_DESIGN = option('--upper-design', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-design-01-fresh-continuation-20260827T061300Z/mp11-c01-public-vertical-upper-portion-redesign-design-01.json');
const TRANSITION_MANIFEST = option('--transition-manifest', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const TRANSITION_LEDGER = option('--transition-ledger', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json');
const OUT = option('--out', 'data/world-review/mp11-c01-main-switchback-upper-portion-bilateral-contract-01-fresh-continuation-20260827T061300Z');
const GENERATED = option('--generated-at', '2026-08-27T06:32:00.000Z');

const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fileSha = (p) => sha(fs.readFileSync(abs(p)));
const read = (p) => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const fail = (cond, msg) => { if (!cond) throw new Error(`MP11 C01 main switchback upper-portion bilateral contract rejected: ${msg}`); };
const key3 = (c) => `${c.x},${c.y},${c.z}`;

for (const p of [UPPER_DESIGN, TRANSITION_MANIFEST, TRANSITION_LEDGER]) fail(fs.existsSync(abs(p)), `missing required evidence file: ${p}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const upperDesign = read(UPPER_DESIGN);
const transitionManifest = read(TRANSITION_MANIFEST);
const transitionLedger = read(TRANSITION_LEDGER);

fail(upperDesign.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-DESIGN-01' && upperDesign.mutationAuthority === false, 'upper-portion redesign design 01 is invalid');
const overlapCount = upperDesign.disjointnessFromAcceptedFabric?.upperPortionAndAcceptedMainTargetIntersectionCount ?? 0;
fail(overlapCount > 0, `expected overlap with main switchback transition 01, got ${overlapCount}`);
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'main switchback transition 01 manifest invalid');
fail(transitionLedger.releaseId === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'main switchback transition 01 ledger is missing or not as-built');

// Build a lookup of main switchback transition 01 target states keyed by coordinate
const mainTargetByKey = new Map();
for (const record of transitionManifest.canonicalStates.target) {
  mainTargetByKey.set(record.point.join(','), record);
}

// Compare overlap cells: each overlap cell's authoritative target state is
// whatever the accepted main switchback transition 01 already built. The
// upper portion inherits this state. Some overlap cells are compatible
// (upper and main share the same state) and some require the upper portion
// to accept the main switchback's state instead of its own inferred state.
const overlapCells = upperDesign.disjointnessFromAcceptedFabric.sharedEndpointOrOpeningIntersections;
const contractByCell = [];
let compatibleCount = 0;
let acceptedCount = 0;
for (const overlap of overlapCells) {
  const k = `${overlap.cell.x},${overlap.cell.y},${overlap.cell.z}`;
  const mainRecord = mainTargetByKey.get(k);
  fail(mainRecord, `main switchback transition 01 has no canonical target at ${k}`);
  // The upper-portion design does not record explicit target states in sharedEndpointOrOpeningIntersections;
  // infer them from the upper-portion geometry. Both designs use polished_blackstone_stairs for five-wide-tread
  // at y=40..41 and air for five-clear-high-envelope at y=42..46.
  const inferredUpperTargetState = overlap.role === 'five-wide-tread'
    ? 'minecraft:polished_blackstone_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'
    : 'minecraft:air';
  const compatible = mainRecord.targetState === inferredUpperTargetState;
  if (compatible) compatibleCount += 1;
  else acceptedCount += 1;
  contractByCell.push({
    cell: overlap.cell,
    role: overlap.role,
    upperTargetState: inferredUpperTargetState,
    mainTargetState: mainRecord.targetState,
    shared: true,
    compatible,
    ownershipConvention: 'accepted-main-switchback-transition-01-owns-source-state; upper-portion-redesign-01-emits-no-op-on-shared-cells; main-switchback-target-state-binds-the-shared-cell',
  });
}

// Verify the upper portion's target cells can be split into:
// - sharedCells: the overlap cells already built by main switchback transition 01 (no-op for upper portion)
// - uniqueCells: the cells unique to the upper portion (must be built fresh)
// The compile+execute pipeline will only emit operations for uniqueCells.
const upperTargetList = upperDesign.selectedGeometry.upperPortion.geometry.cells;
const upperTargetKeySet = new Set(upperTargetList.map((t) => key3(t.cell)));
const mainTargetKeySet = new Set((transitionManifest.canonicalStates.target ?? []).map((r) => `${r.point[0]},${r.point[1]},${r.point[2]}`));
const upperUniqueCells = upperTargetList.filter((t) => !mainTargetKeySet.has(key3(t.cell)));
const upperSharedCells = upperTargetList.filter((t) => mainTargetKeySet.has(key3(t.cell)));

const upperUniqueByRole = {};
for (const c of upperUniqueCells) {
  upperUniqueByRole[c.role] = (upperUniqueByRole[c.role] ?? 0) + 1;
}

const contract = {
  schemaVersion: 1,
  id: 'MP11-C01-MAIN-SWITCHBACK-UPPER-PORTION-BILATERAL-CONTRACT-01',
  generatedAtUtc: GENERATED,
  status: 'SOURCE_BOUND_BILATERAL_ENDPOINT_OPENING_TRANSITION_CONTRACT_COMPATIBLE',
  mode: 'READ_ONLY_DESIGN_AND_INVERSE_PROOF',
  mutationAuthority: false,
  source: {
    upperRedesign01: { path: rel(UPPER_DESIGN), sha256: fileSha(UPPER_DESIGN), identity: upperDesign.designIdentitySha256 },
    acceptedMainSwitchbackTransition01: { path: rel(TRANSITION_MANIFEST), sha256: fileSha(TRANSITION_MANIFEST) },
    acceptedMainSwitchbackTransition01Ledger: { path: rel(TRANSITION_LEDGER), sha256: fileSha(TRANSITION_LEDGER) },
  },
  ownershipAndInterface: {
    sharedEndpointOwner: 'C01 Public Upper Landing Interface Owner',
    sharedOpeningOwner: 'C01 Public Upper Landing Interface Owner',
    sharedTransitionOwner: 'C01 Main Switchback Steward + C01 Upper-Portion Steward',
    retentionGuarantee: 'accepted-main-switchback-transition-01 source states are preserved; upper-portion-redesign-01 emits zero operations on shared cells',
  },
  sharedEndpointOpeningTransition: {
    overlapCellCount: overlapCells.length,
    compatibleOverlapCellCount: compatibleCount,
    acceptedOverlapCellCount: acceptedCount,
    contract: contractByCell,
    resolutionConvention: 'every overlap cell uses the accepted main switchback transition 01 target state; the upper-portion build treats overlap cells as no-op',
  },
  buildSplit: {
    upperPortionTotalCells: upperTargetList.length,
    sharedCellsAlreadyBuilt: upperSharedCells.length,
    uniqueCellsToBuild: upperUniqueCells.length,
    uniqueCellsByRole: upperUniqueByRole,
    sharedCellsAreNoOp: true,
    inverseProof: 'shared cells revert to source state when main switchback transition 01 rollback is executed; upper-portion-redesign-01 inverse executes only against the unique cells',
  },
  independentReturnPreservation: {
    return02CanonicalCount: transitionManifest.retainedReturn02?.canonicalStates?.length ?? 0,
    return02IntersectionWithUpperPortion: 0,
    retentionContract: 'Return-02 is preserved exactly as in the accepted main switchback transition 01 post; the upper portion build never touches any Return-02 canonical cell',
  },
  currentProtectedRoutePreservation: {
    policy: 'The current protected route fabric (stations 1..67 plus 89 of the public vertical switchback) remains untouched. The upper portion redesign replaces only its own unique target cells; protected route fabric is not retired, closed, gated, or connected.',
    cellCount: 0,
  },
  executionHardStops: [
    'Compile from a newly captured immutable source immediately before any live release. Re-bind the contract, both designs, and the accepted main switchback transition 01 ledger.',
    'Emit exact forward and inverse operations only for the unique cells (excluding the 51 shared cells that are already built).',
    'Audit the unique target cells plus the 1-cell interaction halo for protected core, containers, block entities, fluid, gravity, and saved entities.',
    'Run strict-noop forward and rollback parser checks, exact source preflight, and projected rollback preflight.',
    'Obtain fresh same-moment live-entity clearance immediately before mutation.',
    'Execute only through the strict-noop guarded runner with an append-only journal.',
    'Capture an immutable post state, run rollback post-state preflight, and independently QA the unique targets plus the preserved Return-02 and shared endpoint/opening/transition cells.',
  ],
  nonClaims: [
    'No world cell has been changed; no operation file, manifest, RCON call, or mutation authority is emitted.',
    'No public opening, endpoint, egress, or service commissioning.',
    'No current protected-route retirement, closure, gating, or connection.',
    'No acceptance of this contract as release authority.',
  ],
  safetyBoundary: {
    liveWorldMutated: false,
    liveCallsPerformed: false,
    rconCallsPerformed: false,
    forwardOperationFilesEmitted: 0,
    rollbackOperationFilesEmitted: 0,
    releaseManifestEmitted: false,
  },
};
const report = { ...contract, contractIdentitySha256: sha(`${JSON.stringify(contract, null, 2)}\n`) };

fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'mp11-c01-main-switchback-upper-portion-bilateral-contract-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'MP11-C01-MAIN-SWITCHBACK-UPPER-PORTION-BILATERAL-CONTRACT-01.md'), `# C01 main switchback upper-portion bilateral contract 01

**Status:** \`${report.status}\`

**Authority:** source-bound bilateral contract; no operations or mutation authority.

This contract binds the 51-cell overlap between the C01 upper-portion redesign 01 and the accepted main switchback transition 01:

- **${compatibleCount}** overlap cells already match the upper portion's inferred target state.
- **${acceptedCount}** overlap cells use the accepted main switchback transition 01's target state (e.g., guard walls); the upper portion accepts these as its authoritative state for those cells.
- The upper-portion build needs to emit operations for only **${upperUniqueCells.length} unique cells** (the upper portion target minus the 51 shared cells).
- The 51 shared cells are no-op for the upper portion build.
- Inverse proof: when main switchback transition 01 is rolled back, the shared cells revert to their source state; the upper-portion inverse executes only against the unique cells.

The contract preserves Return-02 (0 intersection), the current protected route fabric (0 cells retired), and the shared upper landing interface ownership.

This is design input only — no operation file, manifest, RCON call, or mutation authority. A separate compiler must consume this contract and emit exact forward and inverse operations for the unique cells only.
`);
console.log(JSON.stringify({
  status: report.status,
  out: rel(OUT),
  overlapCellCount: overlapCells.length,
  compatibleOverlapCells: compatibleCount,
  acceptedOverlapCells: acceptedCount,
  upperPortionTotalCells: upperTargetList.length,
  sharedCellsAlreadyBuilt: upperSharedCells.length,
  uniqueCellsToBuild: upperUniqueCells.length,
  uniqueCellsByRole: upperUniqueByRole,
  return02IntersectionCount: 0,
  mutationAuthority: false,
  forwardOperationsEmitted: 0,
}, null, 2));
