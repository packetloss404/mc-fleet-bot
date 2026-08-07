#!/usr/bin/env node
/**
 * T01 release compiler for CZ-R03/R04 on the three connector tunnel bores.
 *
 * Deterministically re-derives the three frozen connector construction
 * domains — P1-B03 CHEYENNE-JCURVE (15,972 inline cells), P1-B08
 * SERVICE-TUNNEL (7,878 cells expanded from the inline centerline), and
 * P1-B07 B07-C-WEST-2 (8,134 cells from the frozen anchors) — proves each
 * against its committed G03 identity, reads exact per-cell source states
 * from the fresh immutable complete save, maps every cell to minecraft:air
 * (bore void doctrine), applies the owner's R03 guard/deferral rules
 * (identical to the amended R02 rules), and emits three guarded
 * forward/rollback operation pairs plus a schema-1 release manifest.
 *
 * Partition per domain: operated + surfaceDeferral + wetZoneDeferral +
 * alreadyTarget == frozen domain (count and coordinate-set hash). The 20
 * cells shared by the B03 and B08 bores at their connection throat are
 * adjudicated to the b03-jcurve package (R02 overlap precedent), so the
 * three packages are exactly disjoint. The container guard remains a hard
 * abort. Cells already air are accounted, never emitted (strict no-op
 * runner contract); unchanged cells need no rollback.
 *
 * The manifest binds only upstream identities (decision record, G03 hashes,
 * snapshot identity). Validation and execution evidence live in later
 * additive artifacts that bind this manifest — never the reverse — so
 * compile → preflight → recompile is byte-stable.
 *
 * This compiler performs no live call and authorizes no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  compareCells,
  deriveB07WestTwo,
  deriveB08ServiceTunnelConstruction,
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

const GENERATED_AT = value('--generated-at', '2026-08-07T00:20:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-complete-save-20260807T001212Z');
const INTAKE_AUDIT = value('--intake-audit',
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260807T001212Z.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r03-tunnels';
const EXPECTED_COMPLETE_SAVE_SHA256 = 'd0aa5693bdd5e3de001787ba3f8c6e86dad8879e7e7ef6af186159a10cd11b98';
const BORE_TARGET_STATE = 'minecraft:air';

const INPUTS = Object.freeze({
  decision: 'docs/masterplans/05-combined-zones/phase1-r03-tunnels-scope-and-material-decision.md',
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
});

// Replacing any block-entity container would destroy stored state; the bore
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
  if (!condition) throw new Error(`R03 tunnels release compiler rejected: ${message}`);
}

const decisionBytes = fs.readFileSync(path.join(ROOT, INPUTS.decision));
const decisionSha256 = sha256(decisionBytes);
const decisionText = decisionBytes.toString('utf8');
const b03Doc = readJson(INPUTS.b03Geometry);
const connectors = readJson(INPUTS.connectors);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const intake = readJson(INTAKE_AUDIT);

invariant(decisionText.includes('OWNER_DECISION_RECORDED_R03_R04_TUNNEL_BORES')
  && decisionText.includes(EXPECTED_COMPLETE_SAVE_SHA256),
'R03 decision record is not the recorded tunnel-bore decision bound to this save');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'fresh complete-save intake audit is not PASS');
invariant(intake.packageIdentity.completeSaveSha256 === EXPECTED_COMPLETE_SAVE_SHA256,
  'complete-save identity drifted from the contracted R03 snapshot');
invariant(fs.existsSync(path.join(ROOT, SNAPSHOT, 'region')),
  'snapshot root has no region directory');
invariant(b03Doc.id === 'combined-zones-phase1-cheyenne-jcurve-geometry', 'B03 identity drift');
invariant(connectors.id === 'combined-zones-phase1-connector-geometry',
  'connector identity drift');

const g03Construction = (scopeId) => g03.scopeRegistry
  .find((scope) => scope.scopeId === scopeId).construction;

// Re-derive and prove the three frozen domains (standard-preamble G03
// identities; B07 additionally proves its D06-preamble source identity).
function verifyDomain(scopeId, cells, alsoD06SourceHash = false) {
  const committed = g03Construction(scopeId);
  invariant(cells.length === committed.cellCount,
    `derived ${scopeId} count ${cells.length} != committed ${committed.cellCount}`);
  invariant(JSON.stringify(boundsOf(cells)) === JSON.stringify(committed.bounds),
    `derived ${scopeId} bounds drift from the committed G03 bounds`);
  const derivedHash = hashCells(cells);
  invariant(derivedHash === committed.coordinateSetSha256,
    `derived ${scopeId} coordinate-set hash ${derivedHash} != committed `
    + committed.coordinateSetSha256);
  if (alsoD06SourceHash) {
    invariant(hashCells(cells, D06_CELL_PREAMBLE) === committed.sourceCoordinateSetSha256,
      `derived ${scopeId} D06-preamble source hash drift`);
  }
  return { cells, cellCount: cells.length, coordinateSetSha256: derivedHash, committed };
}

const domains = [
  {
    key: 'b03-jcurve',
    scopeId: 'P1-B03',
    ...verifyDomain('P1-B03', uniqueCells(b03Doc.design.excavationReservation.cells)),
  },
  {
    key: 'b08-service-tunnel',
    scopeId: 'P1-B08',
    ...verifyDomain('P1-B08', deriveB08ServiceTunnelConstruction(connectors)),
  },
  {
    key: 'b07-shaft',
    scopeId: 'P1-B07',
    ...verifyDomain('P1-B07',
      deriveB07WestTwo(d06Mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem).construction,
      true),
  },
];

// The B03 and B08 bores share their connection throat; those cells are
// adjudicated to the b03-jcurve package so the packages stay disjoint. B07
// must be disjoint from both.
const domainKeySets = new Map(domains.map(({ key, cells }) => [
  key, new Set(cells.map(cellKey)),
]));
const overlapB03B08 = domains[0].cells
  .filter((cell) => domainKeySets.get('b08-service-tunnel').has(cellKey(cell)));
invariant(domains[2].cells.every((cell) => !domainKeySets.get('b03-jcurve').has(cellKey(cell))
  && !domainKeySets.get('b08-service-tunnel').has(cellKey(cell))),
'B07 shaft unexpectedly intersects a tunnel bore');

// Classify every unique cell of the domain union. Every target is a to-air
// bore cell and no cell is surfaceDesignated, so classification depends only
// on the cell and the bound save — identical across domains for shared cells.
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));
const isFluid = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const unionCellsAll = uniqueCells(domains.flatMap(({ cells }) => cells));
const recordByKey = new Map();
const columns = new Map();
for (const cell of unionCellsAll) {
  const rawState = await reader.blockState(cell.x, cell.y, cell.z);
  const record = {
    cell,
    fromState: stateToCommandString(rawState),
    fluidSource: isFluid(rawState),
    fluidAdjacent: false,
    surfaceExposed: false,
  };
  for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
    const neighbour = await reader.blockState(cell.x + dx, cell.y + dy, cell.z + dz);
    if (isFluid(neighbour)) {
      record.fluidAdjacent = true;
      break;
    }
  }
  const columnId = `${cell.x},${cell.z}`;
  if (!columns.has(columnId)) columns.set(columnId, { x: cell.x, z: cell.z, records: [] });
  columns.get(columnId).records.push(record);
  recordByKey.set(cellKey(cell), record);
}
for (const column of columns.values()) {
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

const isWetExcluded = (record) => record.fluidSource || record.fluidAdjacent;
const isSurfaceExcluded = (record) => record.surfaceExposed;
const isExcluded = (record) => isWetExcluded(record) || isSurfaceExcluded(record);
const isAlreadyTarget = (record) => !isExcluded(record)
  && record.fromState === BORE_TARGET_STATE;
const isOperated = (record) => !isExcluded(record) && !isAlreadyTarget(record);

// Hard abort guard: a forbidden container/block-entity in the operated scope
// is never compiled around.
const containerViolations = [...recordByKey.values()].filter((record) => isOperated(record)
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
          .map(({ cell, fromState }) => ({ cell, sourceState: fromState })),
      },
    },
    outputsWritten: false,
  }, null, 2));
  process.exit(1);
}

// Per-domain four-way partition, proven by count and coordinate-set hash.
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const partition = {};
for (const domain of domains) {
  const records = domain.cells.map((cell) => recordByKey.get(cellKey(cell)));
  const classes = {
    operated: records.filter(isOperated).map(({ cell }) => cell),
    surfaceDeferral: records.filter(isSurfaceExcluded).map(({ cell }) => cell),
    wetZoneDeferral: records.filter(isWetExcluded).map(({ cell }) => cell),
    alreadyTarget: records.filter(isAlreadyTarget).map(({ cell }) => cell),
  };
  const excludedUnion = uniqueCells([...classes.surfaceDeferral, ...classes.wetZoneDeferral]);
  invariant(classes.operated.length + excludedUnion.length + classes.alreadyTarget.length
    === domain.cellCount,
  `${domain.scopeId} classes are not a partition of the frozen domain`);
  invariant(hashCells(uniqueCells([
    ...classes.operated, ...excludedUnion, ...classes.alreadyTarget,
  ])) === domain.coordinateSetSha256,
  `${domain.scopeId} class union does not reproduce the frozen domain identity`);
  partition[domain.key] = {
    scopeId: domain.scopeId,
    domain: `${domain.scopeId}/construction`,
    frozenDomainCellCount: domain.cellCount,
    frozenDomainCoordinateSetSha256: domain.coordinateSetSha256,
    operated: classManifest(classes.operated),
    surfaceDeferral: classManifest(classes.surfaceDeferral),
    wetZoneDeferral: classManifest(classes.wetZoneDeferral),
    alreadyTarget: classManifest(classes.alreadyTarget),
  };
  domain.operatedCells = uniqueCells(classes.operated);
}

// Package split: the b08 package excludes the throat cells adjudicated to
// b03-jcurve; b03 and b07 packages carry their whole operated classes.
const overlapKeys = new Set(overlapB03B08.map(cellKey));
const packageCells = new Map([
  ['b03-jcurve', domains[0].operatedCells],
  ['b08-service-tunnel', domains[1].operatedCells
    .filter((cell) => !overlapKeys.has(cellKey(cell)))],
  ['b07-shaft', domains[2].operatedCells],
]);

// Emit the guarded operation pairs.
fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
const packageArtifacts = [];
for (const domain of domains) {
  const cells = packageCells.get(domain.key).slice().sort(compareCells);
  const operations = cells.map((cell) => ({
    cell,
    fromState: recordByKey.get(cellKey(cell)).fromState,
    toState: BORE_TARGET_STATE,
  }));
  const sourceCensus = new Map();
  for (const { fromState } of operations) {
    sourceCensus.set(fromState, (sourceCensus.get(fromState) ?? 0) + 1);
  }
  const forwardBody = `${operations
    .map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
  const rollbackBody = `${operations
    .map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardHash = sha256(forwardBody);
  const rollbackHash = sha256(rollbackBody);
  const packageTargetHash = hashCells(cells);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${domain.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${domain.key}.rollback.txt`);
  const header = (role, bodyHash) => [
    `# GENERATED FILE — Combined Zones CZ-R03/R04 connector tunnel bores (${domain.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# package target coordinate-set SHA-256: ${packageTargetHash}`,
    `# decision record identity: ${decisionSha256}`,
    `# operation SHA-256: ${bodyHash}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, forwardPath), `${header('forward', forwardHash)}${forwardBody}`);
  fs.writeFileSync(path.join(ROOT, rollbackPath), `${header('rollback', rollbackHash)}${rollbackBody}`);
  packageArtifacts.push({
    key: domain.key,
    forwardPath,
    rollbackPath,
    forwardHash,
    rollbackHash,
    packageTargetHash,
    cellCount: operations.length,
    bounds: operations.length ? boundsOf(cells) : null,
    sourceCensus: Object.fromEntries([...sourceCensus.entries()].sort((a, b) => b[1] - a[1])),
  });
}

// The three packages must be pairwise disjoint and cover every operated cell.
const allPackageCells = uniqueCells([...packageCells.values()].flat());
invariant(allPackageCells.length
  === [...packageCells.values()].reduce((sum, cells) => sum + cells.length, 0),
'packages are not pairwise disjoint');
const operatedUnion = uniqueCells(domains.flatMap(({ operatedCells }) => operatedCells));
invariant(allPackageCells.length === operatedUnion.length
  && hashCells(allPackageCells) === hashCells(operatedUnion),
'packages do not cover the operated union exactly');

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_AWAITING_PRERELEASE_GATES_AND_EXPLICIT_AUTHORIZATION',
  packages: packageArtifacts.map(({ key, forwardPath, rollbackPath }) => ({
    key, forward: forwardPath, rollback: rollbackPath,
  })),
  executionOrder: {
    forward: packageArtifacts.map(({ key }) => key),
    rollback: packageArtifacts.map(({ key }) => key).reverse(),
    note: 'Each bore package is independently reversible; rollback reverses the package order.',
  },
  scope: {
    releaseId: 'CZ-R03-R04-PHASE1-CONNECTOR-TUNNEL-BORES',
    decisionRecord: {
      path: INPUTS.decision,
      sha256: decisionSha256,
      status: 'OWNER_DECISION_RECORDED_R03_R04_TUNNEL_BORES',
    },
    boreTargetState: BORE_TARGET_STATE,
    packageCellCounts: Object.fromEntries(packageArtifacts
      .map(({ key, cellCount }) => [key, cellCount])),
    operatedUnionCellCount: operatedUnion.length,
    operatedUnionTargetCoordinateSetSha256: hashCells(operatedUnion),
    overlapAdjudication: {
      note: 'The B03 and B08 bores share their connection-throat cells; they are adjudicated to the b03-jcurve package so the packages stay exactly disjoint. Classification is package-independent, so both per-domain partitions remain exact.',
      b03B08SharedCells: classManifest(overlapB03B08),
      adjudicatedToPackage: 'b03-jcurve',
    },
  },
  partition,
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceStateCensus: Object.fromEntries(packageArtifacts
      .map(({ key, sourceCensus }) => [key, sourceCensus])),
  },
  target: {
    desiredStateCensus: Object.fromEntries(packageArtifacts
      .map(({ key, cellCount }) => [key, { [BORE_TARGET_STATE]: cellCount }])),
  },
  operations: {
    ...Object.fromEntries(packageArtifacts.map(({
      key, forwardHash, rollbackHash, cellCount,
    }) => [key, {
      forwardSha256: forwardHash,
      rollbackSha256: rollbackHash,
      forwardCommandCount: cellCount,
      rollbackCommandCount: cellCount,
      exactInverse: true,
    }])),
    targetPartitionWithFrozenDomains: true,
    alreadyTargetStateCellsEmitted: false,
  },
  compileGuards: {
    guardBehaviour: {
      fluidSourceState: 'DETERMINISTIC_SCOPE_EXCLUSION_WITH_ONE_CELL_DRY_BUFFER',
      surfaceExposedToAirCell: 'DETERMINISTIC_SCOPE_EXCLUSION',
      forbiddenContainerSourceState: 'HARD_ABORT_UNCHANGED',
    },
    forbiddenContainerSourceStateViolationCount: 0,
  },
  upstreamIdentities: {
    decisionRecordSha256: decisionSha256,
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    b03ConstructionCoordinateSetSha256: domains[0].coordinateSetSha256,
    b08ConstructionCoordinateSetSha256: domains[1].coordinateSetSha256,
    b07ConstructionCoordinateSetSha256: domains[2].coordinateSetSha256,
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
  packages: packageArtifacts.map(({
    key, forwardPath, rollbackPath, forwardHash, rollbackHash, cellCount,
  }) => ({
    key,
    forward: forwardPath,
    rollback: rollbackPath,
    forwardSha256: forwardHash,
    rollbackSha256: rollbackHash,
    cellCount,
  })),
  partition: Object.fromEntries(Object.entries(partition).map(([key, entry]) => [key, {
    frozen: entry.frozenDomainCellCount,
    operated: entry.operated.cellCount,
    surfaceDeferral: entry.surfaceDeferral.cellCount,
    wetZoneDeferral: entry.wetZoneDeferral.cellCount,
    alreadyTarget: entry.alreadyTarget.cellCount,
  }])),
  overlapB03B08CellCount: overlapB03B08.length,
}, null, 2));
