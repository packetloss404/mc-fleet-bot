#!/usr/bin/env node
/**
 * Compile CZ-R11E: the largest source-proven batch of later C1 at-grade
 * islands. Every authored non-at-grade treatment and every rejected wet range
 * remains untouched. Each island is an independent, uncommissioned package.
 * Offline only: no RCON call, service mutation, or world edit.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  sha256,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  classManifest,
  census,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T19:45:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r11d-post-20260821T192414Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11e-c1-disjoint-at-grade-islands-batch';
const RELEASE_ID = 'CZ-R11E-C1-DISJOINT-AT-GRADE-ISLANDS-BATCH';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const INVENTORY_PATH = 'data/world-review/combined-zones-r11e-inventory-20260821T194000Z.json';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/evidence-ledger.json';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const RELEASE_CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION =
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS =
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const MATERIAL_PRECEDENT =
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json';
const ALL_RANGES = [
  { key: 'island-548-551', start: 548, end: 551 },
  { key: 'island-564-569', start: 564, end: 569 },
  { key: 'island-606-608', start: 606, end: 608 },
  { key: 'island-627-632', start: 627, end: 632 },
  { key: 'island-792', start: 792, end: 792 },
  { key: 'island-952-1139', start: 952, end: 1139 },
  { key: 'island-1142-1183', start: 1142, end: 1183 },
  { key: 'island-1189-1206', start: 1189, end: 1206 },
  { key: 'island-1213-1215', start: 1213, end: 1215 },
];
const INCLUDED_KEYS = new Set([
  'island-548-551', 'island-564-569', 'island-606-608',
  'island-627-632', 'island-792', 'island-1142-1183',
  'island-1213-1215',
]);
const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    'b18af0b34c2156c51d2cdf4e8ade401efdcfd184c35787709c7048e5ba4cebe6',
  sourceRegionSha256:
    '303c00aa95c5c49b55f4d1c9e5f7436ab114a87bf7db73fec2373b114254aef5',
  sourceLedgerSha256:
    '39e71bd77cb0d231a3bd4b45dcba857c9c2934d959b32464624fd88252b53975',
  sourceCompletedReleaseIdentitySha256:
    'e0b07df1f9f3a6d5218db91f1b5afd3b0383150cf2c0c0d5cbbfddba3c8af0eb',
  inventorySha256:
    '460f488c99307e549dfaaad974de266c5b9a2cb61d7c521fb5ec31cdbed5bc3a',
  includedIslandCount: 7,
  excludedAtGradeRangeCount: 2,
  physicalPackageCount: 12,
  operatedCellCount: 3982,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E C1 island-batch compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const inside2d = (cell, extent) => cell.x >= extent.minX && cell.x <= extent.maxX
  && cell.z >= extent.minZ && cell.z <= extent.maxZ;
const inside3d = (cell, extent) => inside2d(cell, extent)
  && cell.y >= extent.minY && cell.y <= extent.maxY;
const sha256Bytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function operationTargetCells(filename) {
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(/(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g)) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        cells.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]); x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]); y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]); z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          const cell = { x, y, z };
          cells.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...cells.values()];
}

function savedEntityInside(entity, extent) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= extent.minX && x < extent.maxX + 1
    && y >= extent.minY && y < extent.maxY + 1
    && z >= extent.minZ && z < extent.maxZ + 1;
}

const sourceLedgerBytes = fs.readFileSync(absolute(SOURCE_LEDGER));
const sourceLedger = JSON.parse(sourceLedgerBytes);
const intake = readJson(INTAKE_AUDIT);
const sourceIdentity = readJson(sourceLedger.postSnapshot.identity.path);
const inventoryBytes = fs.readFileSync(absolute(INVENTORY_PATH));
const inventory = JSON.parse(inventoryBytes);
const c1 = readJson(C1_DESIGN);
const releaseContract = readJson(RELEASE_CONTRACT);
const authorization = readJson(AUTHORIZATION);
const protectedRelics = readJson(PROTECTED_RELICS);
const materialPrecedent = readJson(MATERIAL_PRECEDENT);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && samePath(intake.input?.suppliedWorldRoot, SNAPSHOT)
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not the accepted complete immutable R11D post save');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === 'combined-zones-r11d-c1-at-grade-island-521-546'
  && samePath(sourceLedger.postSnapshot.root, SNAPSHOT)
  && sha256Bytes(sourceLedgerBytes) === EXPECTED.sourceLedgerSha256
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256,
'source ledger is not accepted R11D');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256,
'source region identity drifted');
invariant(sha256Bytes(inventoryBytes) === EXPECTED.inventorySha256
  && samePath(inventory.snapshot, SNAPSHOT),
'frozen all-range inventory identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R11');
const releaseNode = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(releaseNode?.canonicalOwners.includes('C1-HIGHWAY'),
'release contract does not expose C1-HIGHWAY');
invariant(materialPrecedent.materialDecision.designPrecedent.includes('gray_concrete'),
'accepted highway material precedent drifted');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}

const priorTargetKeys = new Set();
const priorManifestNames = fs.readdirSync(absolute('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.includes('r11e-'))
  .sort();
for (const name of priorManifestNames) {
  const manifest = readJson(path.join('data/buildops', name));
  for (const pkg of manifest.packages ?? []) {
    if (!pkg.forward || !fs.existsSync(absolute(pkg.forward))) continue;
    for (const cell of operationTargetCells(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}

const stations = c1.horizontalAlignment.stations;
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const savedEntitiesForHalo = async (halo) => {
  if (!halo.length) return [];
  const extent = boundsOf(halo);
  const positions = [];
  for (let cx = Math.floor(extent.minX / 16); cx <= Math.floor(extent.maxX / 16); cx += 1) {
    for (let cz = Math.floor(extent.minZ / 16); cz <= Math.floor(extent.maxZ / 16); cz += 1) {
      const chunk = await entityReader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const position = entity.Pos.slice(0, 3).map(Number);
        const [x, y, z] = position;
        if (x >= extent.minX && x < extent.maxX + 1
          && y >= extent.minY && y < extent.maxY + 1
          && z >= extent.minZ && z < extent.maxZ + 1) positions.push(position);
      }
    }
  }
  return positions;
};
const inventoryByKey = new Map(inventory.ranges.map((range) => [range.key, range]));
const analyses = [];
for (const range of ALL_RANGES.filter(({ key }) => INCLUDED_KEYS.has(key))) {
  const firstPass = await analyzeIsland({ ...range, stations, reader, priorTargetKeys });
  const savedEntityPositions = await savedEntitiesForHalo(firstPass.halo);
  const analysis = savedEntityPositions.length
    ? await analyzeIsland({
      ...range, stations, reader, priorTargetKeys, savedEntityPositions,
    })
    : firstPass;
  analysis.savedEntityPositions = savedEntityPositions;
  const frozen = inventoryByKey.get(range.key);
  invariant(frozen?.safe === true && analysis.safe,
    `${range.key} no longer passes its exact source/halo/interface proof`);
  for (const [field, cells] of [
    ['candidate', analysis.candidate],
    ['priorConflicts', analysis.priorConflicts],
    ['railReservationConflicts', analysis.reservationConflicts.railReservation],
    ['utilityReservationConflicts', analysis.reservationConflicts.utilityReservation],
    ['roadCollectionConflicts', analysis.reservationConflicts.roadCollection],
    ['savedEntityConflicts', analysis.savedEntityConflicts],
    ['gradeShadows', analysis.gradeShadows],
    ['exceptions', analysis.exceptions],
    ['surface', analysis.surface],
    ['foundation', analysis.foundationRecords.map(({ cell }) => cell)],
    ['headroomCuts', analysis.headroomRecords.map(({ cell }) => cell)],
    ['fullHeadroom', analysis.fullHeadroom],
    ['gravity', analysis.gravityRecords.map(({ cell }) => cell)],
    ['ownedLogs', analysis.ownedLogRemovals.map(({ cell }) => cell)],
    ['influencedLeaves', analysis.influencedLeaves.map(({ cell }) => cell)],
    ['leafTransitions', analysis.leafRecords.map(({ cell }) => cell)],
    ['operated', analysis.operated],
    ['halo', analysis.halo],
  ]) {
    invariant(JSON.stringify(classManifest(cells)) === JSON.stringify(frozen[field]),
      `${range.key}/${field} identity drifted`);
  }
  invariant(JSON.stringify(analysis.retainedLogDistanceCensus)
      === JSON.stringify(frozen.retainedLogDistanceCensus)
    && Object.values(analysis.operatedInterfaceIntersections)
      .every((cells) => cells.length === 0),
  `${range.key} leaf-distance or interface proof drifted`);
  analyses.push(analysis);
}
invariant(analyses.length === EXPECTED.includedIslandCount,
'included island count drifted');
const excludedRanges = inventory.ranges.filter(({ key }) => !INCLUDED_KEYS.has(key));
invariant(excludedRanges.length === EXPECTED.excludedAtGradeRangeCount
  && excludedRanges.every(({ safe }) => safe === false)
  && excludedRanges.find(({ key }) => key === 'island-952-1139')?.sourceHazardCount === 43
  && excludedRanges.find(({ key }) => key === 'island-952-1139')?.haloHazardCount === 108
  && excludedRanges.find(({ key }) => key === 'island-1189-1206')?.haloHazardCount === 10,
'excluded wet/source-physics findings drifted');

const allOperated = uniqueCells(analyses.flatMap(({ operated }) => operated));
const summedOperated = analyses.reduce((sum, analysis) => sum + analysis.operated.length, 0);
invariant(allOperated.length === EXPECTED.operatedCellCount
  && allOperated.length === summedOperated,
'island target sets overlap or total target count drifted');
for (let left = 0; left < analyses.length; left += 1) {
  const leftHalo = new Set(analyses[left].halo.map(cellKey));
  for (let right = left + 1; right < analyses.length; right += 1) {
    invariant(!analyses[right].halo.some((cell) => leftHalo.has(cellKey(cell))),
      `${analyses[left].key}/${analyses[right].key} interaction halos overlap`);
  }
}

const unionHalo = uniqueCells(analyses.flatMap(({ halo }) => halo));
const unionHaloBounds = boundsOf(unionHalo);
const touchedChunks = [];
for (let cx = Math.floor(unionHaloBounds.minX / 16); cx <= Math.floor(unionHaloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(unionHaloBounds.minZ / 16); cz <= Math.floor(unionHaloBounds.maxZ / 16); cz += 1) {
    if (unionHalo.some((cell) => Math.floor(cell.x / 16) === cx
      && Math.floor(cell.z / 16) === cz)) touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (unionHalo.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, unionHaloBounds)) {
      const [x, y, z] = entity.Pos.map(Number);
      if (unionHalo.some((cell) => x >= cell.x && x < cell.x + 1
        && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
        savedEntityIntersections.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
}
const protectedRelicIntersections = protectedRelics.relics.flatMap((relic) => {
  const cells = unionHalo.filter((cell) => inside3d(cell, relic.declaredInclusiveBounds));
  return cells.length ? [{ relic: relic.key, ...classManifest(cells) }] : [];
});
const c01Intersections = c1.interfaces.c01.flatMap((entry) => {
  const cells = unionHalo.filter((cell) => inside2d(cell, entry.extent));
  return cells.length ? [{ feature: entry.feature, ...classManifest(cells) }] : [];
});
const dataDistrictX = c1.interfaces.dataDistrictCrossroad.authoredCrossroadX;
const dataDistrictIntersections = unionHalo.filter(({ x }) => x === dataDistrictX);
invariant(blockEntityIntersections.length === 0 && savedEntityIntersections.length === 0
  && protectedRelicIntersections.length === 0 && c01Intersections.length === 0
  && dataDistrictIntersections.length === 0,
`batch halo intersects a block entity, saved entity, relic, C01, or Data District interface: ${JSON.stringify({
  blockEntityIntersections,
  savedEntityIntersections,
  protectedRelicIntersections,
  c01Intersections,
  dataDistrictIntersections: classManifest(dataDistrictIntersections),
})}`);

const header = (role, operationSha256, targetHash) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${targetHash}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
const packages = [];
const operations = {};
const executionForward = [];
const executionRollback = [];
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const analysis of analyses) {
  const packageDefinitions = [];
  if (analysis.dependencyRecords.length) packageDefinitions.push({
    key: `c1-${analysis.key}-dependencies`,
    role: 'exact gravity/leaf dependencies',
    records: analysis.dependencyRecords,
  });
  packageDefinitions.push({
    key: `c1-${analysis.key}-pavement`,
    role: 'foundation/headroom/pavement',
    records: analysis.pavementRecords,
  });
  for (const definition of packageDefinitions) {
    const forwardBody = `${definition.records.map(({ cell, sourceState, targetState }) => (
      replLine(cell, sourceState, targetState)
    )).join('\n')}\n`;
    const rollbackRecords = definition.records.slice().reverse().map((record) => ({
      cell: record.cell,
      sourceState: record.targetState,
      targetState: record.sourceState,
    }));
    const rollbackBody = `${rollbackRecords.map(({ cell, sourceState, targetState }) => (
      replLine(cell, sourceState, targetState)
    )).join('\n')}\n`;
    const forwardSha256 = sha256(forwardBody);
    const rollbackSha256 = sha256(rollbackBody);
    const targetHash = hashCells(definition.records.map(({ cell }) => cell));
    const forward = path.join(OUT_DIR, `${BASENAME}.${definition.key}.forward.txt`);
    const rollback = path.join(OUT_DIR, `${BASENAME}.${definition.key}.rollback.txt`);
    fs.writeFileSync(absolute(forward), `${header(
      `${definition.key} forward`, forwardSha256, targetHash,
    )}${forwardBody}`);
    fs.writeFileSync(absolute(rollback), `${header(
      `${definition.key} rollback`, rollbackSha256, targetHash,
    )}${rollbackBody}`);
    packages.push({ key: definition.key, forward, rollback });
    executionForward.push(definition.key);
    operations[definition.key] = {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: definition.records.length,
      rollbackCommandCount: rollbackRecords.length,
      targetCellCount: definition.records.length,
      targetCoordinateSetSha256: targetHash,
      exactInverse: true,
      island: analysis.key,
      role: definition.role,
    };
  }
}
executionRollback.push(...executionForward.slice().reverse());
invariant(packages.length === EXPECTED.physicalPackageCount,
'physical package count drifted');

const finalRecords = analyses.flatMap(({ allRecords }) => allRecords);
const finalByCell = new Map();
for (const record of finalRecords) finalByCell.set(cellKey(record.cell), record);
const finalTargets = [...finalByCell.values()];
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R11D_POST_OFFLINE_BATCH_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages,
  executionOrder: {
    forward: executionForward,
    rollback: executionRollback,
    rationale: 'Each disjoint island executes its exact gravity/leaf dependency package when nonempty, then its foundation/headroom/pavement package. Rollback reverses every package globally. Empty dependency packages are omitted.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Build the largest complete source-proven batch of later C1 at-grade islands while preserving every authored non-at-grade treatment and the two wet/source-physics at-grade holdouts. No corridor connectivity is claimed across holds.',
    includedIslands: analyses.map((analysis) => ({
      key: analysis.key,
      stations: {
        start: analysis.start,
        end: analysis.end,
        count: analysis.selected.length,
        treatment: 'AT_GRADE_COORDINATION_PASS',
      },
      geometry: {
        candidate: classManifest(analysis.candidate),
        priorReleaseConflicts: classManifest(analysis.priorConflicts),
        railReservationConflicts:
          classManifest(analysis.reservationConflicts.railReservation),
        utilityReservationConflicts:
          classManifest(analysis.reservationConflicts.utilityReservation),
        roadCollectionConflicts:
          classManifest(analysis.reservationConflicts.roadCollection),
        savedEntityConflicts: classManifest(analysis.savedEntityConflicts),
        sourceSavedEntityPositionCount: analysis.savedEntityPositions.length,
        disconnectedGradeShadows: classManifest(analysis.gradeShadows),
        preservedExceptions: classManifest(analysis.exceptions),
        pavementSurface: classManifest(analysis.surface),
        exactFoundationFill:
          classManifest(analysis.foundationRecords.map(({ cell }) => cell)),
        exactHeadroomCuts:
          classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
        fullTwoBlockHeadroom: classManifest(analysis.fullHeadroom),
        stableFoundationContacts:
          classManifest(analysis.supportRecords.map(({ cell }) => cell)),
        gravityDependencies:
          classManifest(analysis.gravityRecords.map(({ cell }) => cell)),
        gravityRollbackSupportProofCount:
          analysis.gravityRollbackSupportProof.length,
        ownedLogRemovals:
          classManifest(analysis.ownedLogRemovals.map(({ cell }) => cell)),
        removalInfluencedRetainedLeaves:
          classManifest(analysis.influencedLeaves.map(({ cell }) => cell)),
        projectedRetainedLogDistanceCensus: analysis.retainedLogDistanceCensus,
        leafPropertyTransitions:
          classManifest(analysis.leafRecords.map(({ cell }) => cell)),
        operatedUnion: classManifest(analysis.operated),
        interactionHalo: classManifest(analysis.halo),
        connectedSurfaceComponentCount: 1,
        routeCommissioned: false,
      },
      sourceStateCensus: census(analysis.allRecords, 'sourceState'),
      targetStateCensus: census(analysis.allRecords, 'targetState'),
    })),
    excludedAtGradeRanges: excludedRanges.map((range) => ({
      key: range.key,
      stations: { start: range.start, end: range.end },
      sourceHazardCount: range.sourceHazardCount,
      sourceHazardCensus: range.sourceHazardCensus,
      haloHazardCount: range.haloHazardCount,
      haloHazardCensus: range.haloHazardCensus,
      operatedInterfaceIntersections: range.operatedInterfaceIntersections,
      disposition: 'PRESERVED_UNTOUCHED_LOCAL_HOLDOUT_NO_OPERATION_PACKAGE',
    })),
    heldTreatments: Object.entries(stations.reduce((result, station, index) => {
      if (index <= 547 || station.treatment === 'AT_GRADE_COORDINATION_PASS') return result;
      const key = station.treatment;
      result[key] = (result[key] ?? 0) + 1;
      return result;
    }, {})).map(([treatment, stationCount]) => ({ treatment, stationCount })),
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
    sourceInventory: {
      path: INVENTORY_PATH,
      sha256: EXPECTED.inventorySha256,
      allLaterAtGradeRunCount: ALL_RANGES.length,
      includedRunCount: analyses.length,
      excludedRunCount: excludedRanges.length,
    },
    materialDoctrine: {
      carriageway: 'minecraft:gray_concrete',
      outerShoulders: 'minecraft:smooth_stone',
      medianSurface: 'minecraft:yellow_concrete',
      foundation: 'minecraft:stone_bricks',
      precedent: MATERIAL_PRECEDENT,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerCompletedReleaseIdentitySha256:
      sourceLedger.completedReleaseIdentitySha256,
    sourceRegionSha256: sourceIdentity.sha256,
    intakeStatus: intake.status,
    priorManifestCount: inventory.priorManifestCount,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(allOperated),
    desiredStateCensus: census(finalTargets, 'targetState'),
    islandTargetSetsDisjoint: allOperated.length === summedOperated,
    islandInteractionHalosDisjoint: true,
    packageTargetsDisjoint: true,
  },
  operations: {
    ...operations,
    ordering: 'Dependency packages precede their island pavement package; rollback uses the exact global reverse order.',
  },
  isolation: {
    includedIslandCount: analyses.length,
    excludedAtGradeRangeCount: excludedRanges.length,
    sourceHazardCount: 0,
    haloFluidOrForbiddenCount: 0,
    priorReleaseIntersectionCount: 0,
    operatedPlanInterfaceIntersectionCount: 0,
    blockEntityHaloIntersectionCount: blockEntityIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicIntersections.length,
    c01DefaultDenyHaloIntersectionCount: c01Intersections.length,
    dataDistrictCrossroadHaloIntersectionCount: dataDistrictIntersections.length,
    heldTreatmentMutationCount: 0,
    routeCommissioned: false,
  },
  compileGuards: {
    exactSourceSnapshot: true,
    exactFrozenInventory: true,
    allSelectedStationsAtGrade: analyses.every(({ selected }) => (
      selected.every(({ treatment }) => treatment === 'AT_GRADE_COORDINATION_PASS')
    )),
    uniqueOperatedCellCount: allOperated.length,
    crossIslandTargetOverlapCount: summedOperated - allOperated.length,
    crossIslandHaloOverlapCount: 0,
    exactInversePackageCount: packages.length,
    emptyPackageCount: 0,
    excludedWetRangeCount: excludedRanges.length,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
  },
  standingAuthorization: {
    path: AUTHORIZATION,
    sha256: sha256Bytes(fs.readFileSync(absolute(AUTHORIZATION))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: {
    c1DesignPath: C1_DESIGN,
    c1DesignSha256: sha256Bytes(fs.readFileSync(absolute(C1_DESIGN))),
    releaseContractPath: RELEASE_CONTRACT,
    releaseContractIdentity: releaseContract.contractIdentitySha256,
    materialPrecedentPath: MATERIAL_PRECEDENT,
    materialPrecedentSha256:
      sha256Bytes(fs.readFileSync(absolute(MATERIAL_PRECEDENT))),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'ordered exact source and projected rollback preflights',
    'fresh block-entity and same-moment live-entity clearance',
    'journaled strict-noop execution',
    'fresh post snapshot, per-island exact QA, and rollback post-state preflight',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256Bytes(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  includedIslands: analyses.map(({ key, start, end, operated, dependencyRecords }) => ({
    key, start, end, targetCellCount: operated.length,
    dependencyTransitionCount: dependencyRecords.length,
  })),
  excludedAtGradeRanges: excludedRanges.map(({ key, sourceHazardCount, haloHazardCount }) => ({
    key, sourceHazardCount, haloHazardCount,
  })),
  physicalPackageCount: packages.length,
  targetCellCount: allOperated.length,
  targetCoordinateSetSha256: hashCells(allOperated),
  touchedChunkCount: touchedChunks.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
