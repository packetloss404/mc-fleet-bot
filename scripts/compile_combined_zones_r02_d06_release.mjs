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
 * decision, applies the decision record's fail-closed compile guards as
 * amended by the owner's R02 scope amendment, and emits two guarded
 * forward/rollback operation pairs plus a schema-1 release manifest.
 *
 * The 6,485 cells present in both frozen domains are adjudicated to the
 * mechanisms package (the owner's per-layer material decision governs them),
 * so the two packages are exactly disjoint and their union is an exact
 * bijection with the union of the two frozen domains. Forward execution
 * order is reservations before mechanisms; rollback reverses.
 *
 * Owner scope amendment (phase1-r02-d06-scope-amendment.md): the surface and
 * fluid guards are deterministic scope exclusions, not aborts —
 * - SURFACE DEFERRAL: a to-air cell that is surface-exposed in the bound
 *   save and whose layer is not surfaceDesignated is excluded from R02;
 * - WET-ZONE DEFERRAL: any target cell whose source state is a fluid is
 *   excluded, and any to-air cell face-adjacent (6-neighbour) to any fluid
 *   source cell in the save is excluded as the 1-cell dry buffer.
 * The container guard remains a hard abort. Both exclusion sets are counted,
 * hashed, and bound in the manifest, as is the already-target class (in-scope
 * cells whose source state already equals the decided target state; the
 * strict no-op runner contract forbids emitting them as operations). The op
 * files cover exactly (frozen domain union) minus (exclusion union) minus
 * (already-target class).
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-complete-save-20260806T235706Z');
const INTAKE_AUDIT = value('--intake-audit',
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T235706Z.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r02-d06-shell';
const EXPECTED_COMPLETE_SAVE_SHA256 = 'a3406b87558f1890e51824dbf1ee3140154ce8b820f3f4592b6aead0d559d4c5';

const INPUTS = Object.freeze({
  decision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  amendment: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-amendment.md',
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
const amendmentBytes = fs.readFileSync(path.join(ROOT, INPUTS.amendment));
const amendmentSha256 = sha256(amendmentBytes);
const amendmentText = amendmentBytes.toString('utf8');
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
invariant(amendmentText.includes('OWNER_AMENDMENT_RECORDED_UNDERGROUND_DRY_SHELL_SCOPE')
  && amendmentText.includes(EXPECTED_COMPLETE_SAVE_SHA256)
  && amendmentText.includes(decision.reportIdentitySha256),
'R02 scope amendment record is not bound to this save and decision record');
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
// fail-closed compile guards as amended: the fluid and surface findings are
// deterministic scope exclusions; the container guard stays a hard abort.
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));
const isFluid = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const annotatedPackages = [];
const toAirColumns = new Map();
for (const spec of packagesSpec) {
  const annotated = [];
  for (const cell of spec.cells) {
    const rawState = await reader.blockState(cell.x, cell.y, cell.z);
    const record = {
      cell,
      package: spec.key,
      layerId: spec.layerFor(cell) ?? 'reservations-policy',
      fromState: stateToCommandString(rawState),
      toState: spec.targetStateFor(cell),
      fluidSource: isFluid(rawState),
      surfaceExposed: false,
      fluidAdjacent: false,
    };
    const toAir = record.toState === 'minecraft:air';
    if (toAir) {
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = await reader.blockState(cell.x + dx, cell.y + dy, cell.z + dz);
        if (isFluid(neighbour)) {
          record.fluidAdjacent = true;
          break;
        }
      }
    }
    if (toAir && !spec.surfaceDesignatedFor(cell)) {
      const columnId = `${cell.x},${cell.z}`;
      if (!toAirColumns.has(columnId)) {
        toAirColumns.set(columnId, { x: cell.x, z: cell.z, records: [] });
      }
      toAirColumns.get(columnId).records.push(record);
    }
    annotated.push(record);
  }
  annotatedPackages.push({ spec, annotated });
}

// A to-air cell is surface-exposed when every block strictly above it up to
// the build limit is air in the snapshot. One downward pass per (x,z) column
// finds the highest non-air block; any to-air cell at or above it (or in an
// all-air column) is exposed.
for (const column of toAirColumns.values()) {
  const lowestCellY = Math.min(...column.records.map(({ cell }) => cell.y));
  let highestNonAirY = null;
  for (let y = WORLD_MAX_Y; y > lowestCellY; y -= 1) {
    const state = await reader.blockState(column.x, y, column.z);
    if (!AIR_BLOCKS.has(state.Name)) {
      highestNonAirY = y;
      break;
    }
  }
  for (const record of column.records) {
    if (highestNonAirY === null || highestNonAirY <= record.cell.y) {
      record.surfaceExposed = true;
    }
  }
}

// Amended exclusion classes. A cell may satisfy both class predicates; the
// op scope subtracts the union.
const isWetExcluded = (record) => record.fluidSource
  || (record.toState === 'minecraft:air' && record.fluidAdjacent);
const isSurfaceExcluded = (record) => record.surfaceExposed;
const isExcluded = (record) => isWetExcluded(record) || isSurfaceExcluded(record);
const allRecords = annotatedPackages.flatMap(({ annotated }) => annotated);
const surfaceExclusions = allRecords.filter(isSurfaceExcluded);
const wetExclusions = allRecords.filter(isWetExcluded);
const excludedRecords = allRecords.filter(isExcluded);

// Hard abort guard: a forbidden container/block-entity in the remaining
// (operated) scope is never compiled around.
const containerViolations = allRecords.filter((record) => !isExcluded(record)
  && FORBIDDEN_SOURCE_BLOCKS.has(record.fromState.split('[')[0]));
if (containerViolations.length) {
  console.error(JSON.stringify({
    status: 'ABORTED_FAIL_CLOSED_COMPILE_GUARDS',
    transactionId: BASENAME,
    guards: {
      forbiddenContainerSourceState: {
        violationCellCount: containerViolations.length,
        listedCells: containerViolations
          .slice()
          .sort((a, b) => compareCells(a.cell, b.cell))
          .slice(0, GUARD_LISTING_CAP)
          .map(({ cell, package: packageKey, layerId, fromState }) => ({
            package: packageKey, cell, layerId, sourceState: fromState,
          })),
      },
    },
    outputsWritten: false,
  }, null, 2));
  process.exit(1);
}

const perPackageCounts = (records) => Object.fromEntries(packagesSpec
  .map(({ key }) => [key, records.filter((record) => record.package === key).length]));
const exclusionManifest = (records) => {
  const cells = uniqueCells(records.map(({ cell }) => cell));
  return {
    cellCount: cells.length,
    bounds: cells.length ? boundsOf(cells) : null,
    coordinateSetSha256: hashCells(cells),
    perPackageCellCounts: perPackageCounts(records),
  };
};
const exclusions = {
  surfaceDeferral: exclusionManifest(surfaceExclusions),
  wetZoneDeferral: exclusionManifest(wetExclusions),
  excludedUnion: exclusionManifest(excludedRecords),
};

// In-scope cells already at their target state (natural air cavities inside
// the shell) are never emitted as ops — the guarded runner's strict no-op
// rule rejects source==target REPL lines — but they stay accounted as their
// own partition class. Unchanged cells need no rollback.
const isAlreadyTarget = (record) => !isExcluded(record)
  && record.fromState === record.toState;
const alreadyTargetRecords = allRecords.filter(isAlreadyTarget);
const alreadyTarget = exclusionManifest(alreadyTargetRecords);

// Emit the guarded operation pairs over (frozen domain union) minus (the
// exclusion union) minus (the already-target class).
const compiledPackages = annotatedPackages.map(({ spec, annotated }) => {
  const operations = annotated
    .filter((record) => !isExcluded(record) && !isAlreadyTarget(record));
  const sourceCensus = new Map();
  const targetCensus = new Map();
  for (const { fromState, toState } of operations) {
    sourceCensus.set(fromState, (sourceCensus.get(fromState) ?? 0) + 1);
    targetCensus.set(toState, (targetCensus.get(toState) ?? 0) + 1);
  }
  return { spec, operations, sourceCensus, targetCensus };
});

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
const unionTargets = uniqueCells(compiledPackages
  .flatMap(({ operations }) => operations.map(({ cell }) => cell)));
invariant(unionTargets.length
  === reservationsArtifact.cellCount + mechanismsArtifact.cellCount,
'package split is not disjoint');
const frozenDomainUnion = uniqueCells([...reservationCells, ...proposalUnion]);
invariant(unionTargets.length + exclusions.excludedUnion.cellCount
  + alreadyTarget.cellCount === frozenDomainUnion.length,
'operated + excluded + already-target classes are not a partition of the frozen domain union');
invariant(hashCells(uniqueCells([
  ...unionTargets,
  ...excludedRecords.map(({ cell }) => cell),
  ...alreadyTargetRecords.map(({ cell }) => cell),
])) === hashCells(frozenDomainUnion),
'operated + excluded + already-target classes do not reproduce the frozen domain union');

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
        excludedCellCount: exclusions.excludedUnion.perPackageCellCounts['d06-reservations'],
        packageBounds: reservationsArtifact.bounds,
        packageTargetCoordinateSetSha256: reservationsArtifact.packageTargetHash,
        overlapCellsAdjudicatedToMechanisms: overlapCellCount,
      },
      'd06-mechanisms': {
        domain: 'D06-MECHANISMS/construction',
        frozenDomainCellCount: g03Mechanisms.cellCount,
        frozenDomainCoordinateSetSha256: g03Mechanisms.coordinateSetSha256,
        packageCellCount: mechanismsArtifact.cellCount,
        excludedCellCount: exclusions.excludedUnion.perPackageCellCounts['d06-mechanisms'],
        packageBounds: mechanismsArtifact.bounds,
        packageTargetCoordinateSetSha256: mechanismsArtifact.packageTargetHash,
        canonicalLayerCellCounts,
      },
    },
    frozenDomainUnionCellCount: frozenDomainUnion.length,
    operatedUnionCellCount: unionTargets.length,
    operatedUnionTargetCoordinateSetSha256: hashCells(unionTargets),
    overlapAdjudication: 'Cells present in both frozen domains take the owner-decided mechanism layer state; the two shell packages are exactly disjoint and their union plus the amendment exclusions plus the already-target class is an exact partition of the frozen domain union.',
  },
  amendment: {
    path: INPUTS.amendment,
    sha256: amendmentSha256,
    status: 'OWNER_AMENDMENT_RECORDED_UNDERGROUND_DRY_SHELL_SCOPE',
    rule: 'Surface-exposed non-surfaceDesignated to-air cells and fluid-source or fluid-face-adjacent-to-air cells are deterministic scope exclusions; the container guard remains a hard abort.',
    exclusions,
    alreadyTarget: {
      ...alreadyTarget,
      rule: 'In-scope cells whose source state already equals the decided target state are accounted here and never emitted as operations (strict no-op runner contract); unchanged cells need no rollback.',
    },
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
    targetPartitionWithFrozenDomainUnion: true,
    alreadyTargetStateCellsEmitted: false,
  },
  compileGuards: {
    guardContract: decision.decisionPayload.failClosedCompileGuards,
    amendedGuardBehaviour: {
      fluidSourceState: 'DETERMINISTIC_SCOPE_EXCLUSION_WITH_ONE_CELL_DRY_BUFFER',
      surfaceExposedToAirCell: 'DETERMINISTIC_SCOPE_EXCLUSION',
      forbiddenContainerSourceState: 'HARD_ABORT_UNCHANGED',
    },
    forbiddenContainerSourceStateViolationCount: 0,
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
    frozenDomainUnionCellCount: frozenDomainUnion.length,
    operatedUnionCellCount: unionTargets.length,
  },
  amendmentExclusions: exclusions,
  alreadyTarget,
}, null, 2));
