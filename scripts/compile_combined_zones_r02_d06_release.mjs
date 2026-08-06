#!/usr/bin/env node
/**
 * T01 release compiler for CZ-R02 on the D06 Empty Eight deep shell.
 *
 * Deterministically re-derives the two frozen D06 construction domains —
 * the 19,836-cell D06-RESERVATIONS union (73 reproduced source references
 * minus the explicit B07 interaction-union reference) and the 9,065-cell
 * D06-MECHANISMS canonical detailed-setout union (31 layers adjudicated by
 * the frozen explicit precedence list) — proves each against its committed
 * G03 identity, reads exact per-cell source states from the fresh immutable
 * complete save, maps target states from the owner's R02 D06 material
 * decision, applies the decision record's fail-closed compile guards, and
 * emits two guarded forward/rollback operation pairs plus a schema-1 release
 * manifest.
 *
 * The 6,485 cells present in both frozen domains are adjudicated to the
 * mechanisms package (the owner's per-layer material decision governs them),
 * so the two packages are exactly disjoint and their union is an exact
 * bijection with the union of the two frozen domains. Forward execution
 * order is reservations before mechanisms; rollback reverses.
 *
 * The manifest binds only upstream identities (decision record payloads, G03
 * hashes, snapshot identity). Validation and execution evidence live in later
 * additive artifacts that bind this manifest — never the reverse — so
 * compile → preflight → recompile is byte-stable.
 *
 * This compiler performs no live call and authorizes no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  CIVIL_CELL_PREAMBLE,
  assignD06CanonicalLayers,
  boundsOf,
  cellKey,
  compareCells,
  deriveD06DetailedMechanismLayers,
  deriveD06ReservationConstruction,
  deriveD06ReservationReferences,
  hashCells,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-06T23:45:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-complete-save-20260806T232503Z');
const INTAKE_AUDIT = value('--intake-audit',
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T232503Z.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r02-d06-shell';
const EXPECTED_COMPLETE_SAVE_SHA256 = '7152457f2dc098d42b915fbfa0c5cb9f8ae234564b8586acbb645751fb399403';

const INPUTS = Object.freeze({
  decision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
});

// Replacing any block-entity container would destroy stored state; the shell
// domains must never contain one. Fail closed if the census disagrees.
// (Copied verbatim from the CZ-R01 compiler denylist.)
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const WORLD_MAX_Y = 320;
const GUARD_LISTING_CAP = 50;

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R02 D06 release compiler rejected: ${message}`);
}

const decision = readJson(INPUTS.decision);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const emptyEight = readJson(INPUTS.emptyEight);
const d06Detailed = readJson(INPUTS.d06Detailed);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const intake = readJson(INTAKE_AUDIT);

invariant(decision.status === 'OWNER_DECISION_RECORDED_R02_D06_DEEP_SHELL_MATERIALS',
  'R02 D06 decision record is not in the recorded state');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'fresh complete-save intake audit is not PASS');
invariant(intake.packageIdentity.completeSaveSha256 === EXPECTED_COMPLETE_SAVE_SHA256,
  'complete-save identity drifted from the contracted R02 snapshot');
invariant(fs.existsSync(path.join(ROOT, SNAPSHOT, 'region')),
  'snapshot root has no region directory');
invariant(g03.canonicalPayloadSha256 === decision.boundIdentities.g03CanonicalPayloadSha256,
  'G03 canonical payload drifted from the decision record');
invariant(sha256(fs.readFileSync(path.join(ROOT, INPUTS.d06Detailed)))
  === decision.boundIdentities.d06DetailedSetoutSha256,
'D06 detailed setout drifted from the decision record');

const g03Reservations = g03.scopeRegistry
  .find(({ scopeId }) => scopeId === 'D06-RESERVATIONS').construction;
const g03Mechanisms = g03.scopeRegistry
  .find(({ scopeId }) => scopeId === 'D06-MECHANISMS').construction;
const decisionReservationsScope = decision.scope.domains
  .find(({ scopeId }) => scopeId === 'D06-RESERVATIONS');
const decisionMechanismsScope = decision.scope.domains
  .find(({ scopeId }) => scopeId === 'D06-MECHANISMS');
invariant(decisionReservationsScope.cellCount === g03Reservations.cellCount
  && JSON.stringify(decisionReservationsScope.bounds) === JSON.stringify(g03Reservations.bounds),
'decision D06-RESERVATIONS scope drifted from the G03 registry');
invariant(decisionMechanismsScope.cellCount === g03Mechanisms.cellCount
  && decisionMechanismsScope.coordinateSetSha256 === g03Mechanisms.coordinateSetSha256
  && JSON.stringify(decisionMechanismsScope.bounds) === JSON.stringify(g03Mechanisms.bounds),
'decision D06-MECHANISMS scope drifted from the G03 registry');

// Re-derive and prove the two frozen domains.
const reproducedReferences = deriveD06ReservationReferences({
  mechanismsPayload: d06Mechanisms.mechanismDevelopmentPayload,
  lifeSafetyDoc: d06LifeSafety,
  emptyEightDoc: emptyEight,
  lifeSafetyPath: INPUTS.d06LifeSafety,
  emptyEightPath: INPUTS.emptyEight,
});
const reservationCells = deriveD06ReservationConstruction(reproducedReferences);
invariant(reservationCells.length === g03Reservations.cellCount,
  `derived reservations count ${reservationCells.length} != committed ${g03Reservations.cellCount}`);
invariant(JSON.stringify(boundsOf(reservationCells)) === JSON.stringify(g03Reservations.bounds),
  'derived reservations bounds drift from the committed G03 bounds');
// The committed G03 identity for D06-RESERVATIONS is source-bound: it is the
// civil/life-safety-closure coordinate hash, not a standard-preamble hash.
const reservationCivilHash = hashCells(reservationCells, CIVIL_CELL_PREAMBLE);
invariant(reservationCivilHash === g03Reservations.sourceCoordinateSetSha256
  && reservationCivilHash === g03Reservations.exactIntegerCellSetIdentitySha256,
`derived reservations coordinate-set hash ${reservationCivilHash} (preamble `
  + `${CIVIL_CELL_PREAMBLE}) does not reproduce the committed G03 identity `
  + `${g03Reservations.sourceCoordinateSetSha256}`);

const { layers, proposalUnion } = deriveD06DetailedMechanismLayers(
  d06Mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  d06Detailed,
);
invariant(proposalUnion.length === g03Mechanisms.cellCount,
  `derived mechanisms count ${proposalUnion.length} != committed ${g03Mechanisms.cellCount}`);
invariant(JSON.stringify(boundsOf(proposalUnion)) === JSON.stringify(g03Mechanisms.bounds),
  'derived mechanisms bounds drift from the committed G03 bounds');
const mechanismStandardHash = hashCells(proposalUnion);
invariant(mechanismStandardHash === g03Mechanisms.coordinateSetSha256,
  `derived mechanisms coordinate-set hash ${mechanismStandardHash} != committed `
  + g03Mechanisms.coordinateSetSha256);
invariant(hashCells(proposalUnion, CIVIL_CELL_PREAMBLE)
  === g03Mechanisms.sourceCoordinateSetSha256,
'derived mechanisms source-bound coordinate hash drift');

// Adjudicate duplicate coordinates to exactly one owning layer under the
// frozen explicit precedence list (verified against every committed
// canonical-per-layer identity and precedence record inside the lib).
const layerOwner = assignD06CanonicalLayers(layers, d06Detailed);
invariant(layerOwner.size === g03Mechanisms.cellCount,
  'canonical layer adjudication does not cover the mechanisms union exactly');

// Target states from the owner's material decision.
const layerStates = decision.decisionPayload.mechanismLayerStates;
const priority = d06Detailed.deterministicSetoutContract.priority;
invariant(Object.keys(layerStates).length === priority.length
  && priority.every((id) => typeof layerStates[id]?.state === 'string'),
'decision mechanism layer states do not cover the 31 frozen layers exactly');
const reservationState = decision.decisionPayload.reservationsPolicy.state;
invariant(reservationState === 'minecraft:air', 'reservations policy state drift');

// Package split: cells in both frozen domains take the mechanism layer state,
// so the two packages are disjoint and their union covers both domains.
const mechanismKeys = new Set(proposalUnion.map(cellKey));
const reservationPackageCells = reservationCells
  .filter((cell) => !mechanismKeys.has(cellKey(cell)));
const overlapCellCount = reservationCells.length - reservationPackageCells.length;

const packagesSpec = [
  {
    key: 'd06-reservations',
    cells: reservationPackageCells.slice().sort(compareCells),
    targetStateFor: () => reservationState,
    layerFor: () => null,
    surfaceDesignatedFor: () => false,
  },
  {
    key: 'd06-mechanisms',
    cells: proposalUnion.slice().sort(compareCells),
    targetStateFor: (cell) => layerStates[layerOwner.get(cellKey(cell))].state,
    layerFor: (cell) => layerOwner.get(cellKey(cell)),
    surfaceDesignatedFor: (cell) => (
      layerStates[layerOwner.get(cellKey(cell))].surfaceDesignated === true
    ),
  },
];

// Source states from the fresh immutable save, with the decision record's
// three fail-closed compile guards.
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));
const fluidViolations = [];
const containerViolations = [];
const surfaceViolations = [];
const compiledPackages = [];
const toAirColumns = new Map();

for (const spec of packagesSpec) {
  const operations = [];
  const sourceCensus = new Map();
  const targetCensus = new Map();
  for (const cell of spec.cells) {
    const rawState = await reader.blockState(cell.x, cell.y, cell.z);
    const fromState = stateToCommandString(rawState);
    const toState = spec.targetStateFor(cell);
    if (FLUID_BLOCKS.has(rawState.Name) || rawState.Properties?.waterlogged === 'true') {
      fluidViolations.push({ package: spec.key, cell, sourceState: fromState });
    }
    if (FORBIDDEN_SOURCE_BLOCKS.has(rawState.Name)) {
      containerViolations.push({ package: spec.key, cell, sourceState: fromState });
    }
    if (toState === 'minecraft:air' && !spec.surfaceDesignatedFor(cell)) {
      const columnId = `${cell.x},${cell.z}`;
      if (!toAirColumns.has(columnId)) {
        toAirColumns.set(columnId, { x: cell.x, z: cell.z, cells: [] });
      }
      toAirColumns.get(columnId).cells.push({
        cell, package: spec.key, layerId: spec.layerFor(cell),
      });
    }
    sourceCensus.set(fromState, (sourceCensus.get(fromState) ?? 0) + 1);
    targetCensus.set(toState, (targetCensus.get(toState) ?? 0) + 1);
    operations.push({ cell, fromState, toState });
  }
  compiledPackages.push({ spec, operations, sourceCensus, targetCensus });
}

// Guard 2: a to-air cell is surface-exposed when every block strictly above
// it up to the build limit is air in the snapshot. One downward pass per
// (x,z) column finds the highest non-air block; any to-air cell at or above
// it (or in an all-air column) is exposed.
for (const column of toAirColumns.values()) {
  const lowestCellY = Math.min(...column.cells.map(({ cell }) => cell.y));
  let highestNonAirY = null;
  for (let y = WORLD_MAX_Y; y > lowestCellY; y -= 1) {
    const state = await reader.blockState(column.x, y, column.z);
    if (!AIR_BLOCKS.has(state.Name)) {
      highestNonAirY = y;
      break;
    }
  }
  for (const { cell, package: packageKey, layerId } of column.cells) {
    if (highestNonAirY === null || highestNonAirY <= cell.y) {
      surfaceViolations.push({
        package: packageKey, cell, layerId: layerId ?? 'reservations-policy',
      });
    }
  }
}

if (fluidViolations.length || surfaceViolations.length || containerViolations.length) {
  const listing = (violations) => ({
    violationCellCount: violations.length,
    listedCells: violations
      .slice()
      .sort((a, b) => compareCells(a.cell, b.cell))
      .slice(0, GUARD_LISTING_CAP),
  });
  console.error(JSON.stringify({
    status: 'ABORTED_FAIL_CLOSED_COMPILE_GUARDS',
    transactionId: BASENAME,
    guards: {
      fluidSourceState: listing(fluidViolations),
      surfaceExposedToAirCell: listing(surfaceViolations),
      forbiddenContainerSourceState: listing(containerViolations),
    },
    outputsWritten: false,
  }, null, 2));
  process.exit(1);
}

// Emit the guarded operation pairs.
fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
const packageArtifacts = [];
for (const { spec, operations, sourceCensus, targetCensus } of compiledPackages) {
  const forwardBody = `${operations
    .map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
  const rollbackBody = `${operations
    .map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardHash = sha256(forwardBody);
  const rollbackHash = sha256(rollbackBody);
  const packageTargetHash = hashCells(operations.map(({ cell }) => cell));
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${spec.key.replace('d06-', '')}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${spec.key.replace('d06-', '')}.rollback.txt`);
  const header = (role, bodyHash) => [
    `# GENERATED FILE — Combined Zones CZ-R02 D06 Empty Eight deep shell (${spec.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# package target coordinate-set SHA-256: ${packageTargetHash}`,
    `# decision record identity: ${decision.reportIdentitySha256}`,
    `# operation SHA-256: ${bodyHash}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, forwardPath), `${header('forward', forwardHash)}${forwardBody}`);
  fs.writeFileSync(path.join(ROOT, rollbackPath), `${header('rollback', rollbackHash)}${rollbackBody}`);
  packageArtifacts.push({
    key: spec.key,
    forwardPath,
    rollbackPath,
    forwardHash,
    rollbackHash,
    packageTargetHash,
    cellCount: operations.length,
    bounds: boundsOf(operations.map(({ cell }) => cell)),
    sourceCensus: Object.fromEntries([...sourceCensus.entries()].sort((a, b) => b[1] - a[1])),
    targetCensus: Object.fromEntries([...targetCensus.entries()].sort((a, b) => b[1] - a[1])),
  });
}

const [reservationsArtifact, mechanismsArtifact] = packageArtifacts;
const unionTargets = uniqueCells([
  ...reservationPackageCells, ...proposalUnion,
]);
invariant(unionTargets.length
  === reservationsArtifact.cellCount + mechanismsArtifact.cellCount,
'package split is not disjoint');
invariant(unionTargets.length === uniqueCells([...reservationCells, ...proposalUnion]).length,
  'package union is not a bijection with the frozen domain union');

const canonicalLayerCellCounts = Object.fromEntries(priority.map((id) => [id, 0]));
for (const id of layerOwner.values()) canonicalLayerCellCounts[id] += 1;

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_AWAITING_PRERELEASE_GATES_AND_EXPLICIT_AUTHORIZATION',
  packages: [
    {
      key: 'd06-reservations',
      forward: reservationsArtifact.forwardPath,
      rollback: reservationsArtifact.rollbackPath,
    },
    {
      key: 'd06-mechanisms',
      forward: mechanismsArtifact.forwardPath,
      rollback: mechanismsArtifact.rollbackPath,
    },
  ],
  executionOrder: {
    forward: ['d06-reservations', 'd06-mechanisms'],
    rollback: ['d06-mechanisms', 'd06-reservations'],
    note: 'Excavate the reservation shell before placing mechanism materials; rollback reverses the order.',
  },
  scope: {
    releaseId: decision.scope.releaseId,
    scopeAdjudicationRecordIdentitySha256: decision.reportIdentitySha256,
    domains: {
      'd06-reservations': {
        domain: 'D06-RESERVATIONS/construction',
        frozenDomainCellCount: g03Reservations.cellCount,
        frozenDomainCoordinateSetSha256: g03Reservations.sourceCoordinateSetSha256,
        frozenDomainCoordinateHashPreamble: `${CIVIL_CELL_PREAMBLE}\\n`,
        packageCellCount: reservationsArtifact.cellCount,
        packageBounds: reservationsArtifact.bounds,
        packageTargetCoordinateSetSha256: reservationsArtifact.packageTargetHash,
        overlapCellsAdjudicatedToMechanisms: overlapCellCount,
      },
      'd06-mechanisms': {
        domain: 'D06-MECHANISMS/construction',
        frozenDomainCellCount: g03Mechanisms.cellCount,
        frozenDomainCoordinateSetSha256: g03Mechanisms.coordinateSetSha256,
        packageCellCount: mechanismsArtifact.cellCount,
        packageBounds: mechanismsArtifact.bounds,
        packageTargetCoordinateSetSha256: mechanismsArtifact.packageTargetHash,
        canonicalLayerCellCounts,
      },
    },
    unionCellCount: unionTargets.length,
    unionTargetCoordinateSetSha256: hashCells(unionTargets),
    overlapAdjudication: 'Cells present in both frozen domains take the owner-decided mechanism layer state; the two shell packages are exactly disjoint and their union is an exact bijection with the frozen domain union.',
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceStateCensus: {
      'd06-reservations': reservationsArtifact.sourceCensus,
      'd06-mechanisms': mechanismsArtifact.sourceCensus,
    },
  },
  target: {
    desiredStateCensus: {
      'd06-reservations': reservationsArtifact.targetCensus,
      'd06-mechanisms': mechanismsArtifact.targetCensus,
    },
  },
  operations: {
    'd06-reservations': {
      forwardSha256: reservationsArtifact.forwardHash,
      rollbackSha256: reservationsArtifact.rollbackHash,
      forwardCommandCount: reservationsArtifact.cellCount,
      rollbackCommandCount: reservationsArtifact.cellCount,
      exactInverse: true,
    },
    'd06-mechanisms': {
      forwardSha256: mechanismsArtifact.forwardHash,
      rollbackSha256: mechanismsArtifact.rollbackHash,
      forwardCommandCount: mechanismsArtifact.cellCount,
      rollbackCommandCount: mechanismsArtifact.cellCount,
      exactInverse: true,
    },
    targetBijectionWithFrozenDomainUnion: true,
    alreadyTargetStateCellsRetained: true,
  },
  compileGuards: {
    fluidSourceStateViolationCount: 0,
    surfaceExposedToAirViolationCount: 0,
    forbiddenContainerSourceStateViolationCount: 0,
    guardContract: decision.decisionPayload.failClosedCompileGuards,
  },
  upstreamIdentities: {
    decisionRecordIdentitySha256: decision.reportIdentitySha256,
    decisionPayloadSha256: decision.decisionPayloadSha256,
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    d06ReservationsConstructionCoordinateSetSha256: g03Reservations.sourceCoordinateSetSha256,
    d06MechanismsConstructionCoordinateSetSha256: g03Mechanisms.coordinateSetSha256,
    d06DetailedSetoutSha256: decision.boundIdentities.d06DetailedSetoutSha256,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    ownershipRegistryPayloadSha256: registry.canonicalPayloadSha256,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(path.join(ROOT, manifestPath),
  `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  packages: packageArtifacts.map(({ key, forwardPath, rollbackPath, forwardHash, rollbackHash, cellCount }) => ({
    key, forward: forwardPath, rollback: rollbackPath, forwardSha256: forwardHash, rollbackSha256: rollbackHash, cellCount,
  })),
  derived: {
    reservationsFrozenCellCount: reservationCells.length,
    reservationsCoordinateSetSha256: reservationCivilHash,
    mechanismsFrozenCellCount: proposalUnion.length,
    mechanismsCoordinateSetSha256: mechanismStandardHash,
    overlapCellsAdjudicatedToMechanisms: overlapCellCount,
    unionCellCount: unionTargets.length,
  },
}, null, 2));
