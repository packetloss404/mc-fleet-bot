#!/usr/bin/env node
/**
 * Compile CZ-R09B: a bounded passive stair in the dry lower B07 shaft.
 *
 * The 7x7 B07-C-WEST-2 lower shaft is exact R03 air from Y=-58 through
 * Y=4.  This release builds a 5x5 static core and a one-cell slab helix in
 * the remaining perimeter ring.  It stops behind a two-block cap below the
 * separately owned R06 wet treatment and commissions no lift, discharge,
 * smoke, power, or upper-shaft interface.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
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
const GENERATED_AT = value('--generated-at', '2026-08-21T17:26:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r07f-post-20260821T172700Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r07f-live-20260821T172700Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r07f-live-20260821T172700Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r09b-b07-lower-spiral-stair');
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-lower-spiral-stair';
const SOURCE_STATE = 'minecraft:air';
const CORE_STATE = 'minecraft:polished_andesite';
const CAP_STATE = 'minecraft:polished_diorite';

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r09aManifest: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
});

const EXPECTED = Object.freeze({
  b07ConstructionCellCount: 8134,
  b07ConstructionSha256: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  coreCellCount: 1575,
  stairCellCount: 128,
  capCellCount: 2,
  targetCellCount: 1705,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, filename).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09B B07 lower-stair compiler rejected: ${message}`);
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records, field) => {
  const counts = new Map();
  for (const record of records) {
    counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
};

const mechanisms = readJson(INPUTS.mechanisms);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const r09aManifest = readJson(INPUTS.r09aManifest);
const r06Manifest = readJson(INPUTS.r06Manifest);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
  'source intake is not bound to the selected snapshot');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot?.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'source ledger is not the accepted terminal post state');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
invariant(r09aManifest.releaseNodeId === RELEASE_NODE_ID,
  'accepted R09A manifest release-node binding drifted');
invariant(r06Manifest.transactionId === 'combined-zones-r06-support-liner',
  'accepted R06 support/liner manifest binding drifted');

const b07 = deriveB07WestTwo(
  mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem,
);
invariant(b07.construction.length === EXPECTED.b07ConstructionCellCount
  && hashCells(b07.construction, 'combined-zones-d06-life-safety-cell-set-v1')
    === EXPECTED.b07ConstructionSha256,
'accepted B07 construction identity drifted');
const b07Keys = new Set(b07.construction.map(cellKey));

const core = cellsIn({
  minX: 2104, maxX: 2108,
  minY: -58, maxY: 4,
  minZ: -430, maxZ: -426,
});
invariant(core.length === EXPECTED.coreCellCount,
  'lower-stair core geometry drifted');

const ring = [];
for (let x = 2103; x <= 2109; x += 1) ring.push({ x, z: -431 });
for (let z = -430; z <= -425; z += 1) ring.push({ x: 2109, z });
for (let x = 2108; x >= 2103; x -= 1) ring.push({ x, z: -425 });
for (let z = -426; z >= -430; z -= 1) ring.push({ x: 2103, z });
invariant(ring.length === 24
  && new Set(ring.map(({ x, z }) => `${x},${z}`)).size === 24,
'lower-stair perimeter ring drifted');

const stairRecords = [];
for (let index = 0; index < 124; index += 1) {
  const point = ring[index % ring.length];
  const y = -58 + Math.floor(index / 2);
  stairRecords.push({
    index,
    cell: { x: point.x, y, z: point.z },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
    targetState: index % 2 === 0
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    role: 'ascending-helix',
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 124 + offset;
  const point = ring[index % ring.length];
  stairRecords.push({
    index,
    cell: { x: point.x, y: 3, z: point.z },
    surfaceY2: 8,
    targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    role: 'upper-hold-landing',
  });
}
invariant(stairRecords.length === EXPECTED.stairCellCount,
  'lower-stair slab count drifted');
for (let index = 1; index < stairRecords.length; index += 1) {
  const prior = stairRecords[index - 1];
  const current = stairRecords[index];
  const horizontalStep = Math.abs(prior.cell.x - current.cell.x)
    + Math.abs(prior.cell.z - current.cell.z);
  invariant(horizontalStep === 1,
    `stair path is not cardinally contiguous at index ${index}`);
  invariant(current.surfaceY2 - prior.surfaceY2 >= 0
    && current.surfaceY2 - prior.surfaceY2 <= 1,
  `stair surface rise exceeds one half block at index ${index}`);
}

const cap = [
  { ...ring[8], y: 3 },
  { ...ring[8], y: 4 },
];
const coreKeys = new Set(core.map(cellKey));
const stairKeys = new Set(stairRecords.map(({ cell }) => cellKey(cell)));
const capKeys = new Set(cap.map(cellKey));
invariant(stairKeys.size === EXPECTED.stairCellCount
  && capKeys.size === EXPECTED.capCellCount,
'lower-stair target geometry contains duplicates');
invariant([...stairKeys].every((key) => !coreKeys.has(key))
  && [...capKeys].every((key) => !coreKeys.has(key) && !stairKeys.has(key)),
'core, stair, and cap targets are not disjoint');

const desired = [
  ...core.map((cell) => ({ cell, targetState: CORE_STATE, role: 'static-core' })),
  ...stairRecords.map(({ cell, targetState, role }) => ({ cell, targetState, role })),
  ...cap.map((cell) => ({ cell, targetState: CAP_STATE, role: 'upper-hold-cap' })),
];
const targetCells = desired.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(targetKeys.size === EXPECTED.targetCellCount
  && targetCells.every((cell) => b07Keys.has(cellKey(cell))),
'lower-stair targets are not the exact in-B07 partition');

const haloBounds = {
  minX: 2102, maxX: 2110,
  minY: -59, maxY: 5,
  minZ: -432, maxZ: -424,
};
const halo = cellsIn(haloBounds);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const transitions = [];
for (const entry of desired) {
  const sourceState = stateToCommandString(
    await reader.blockState(entry.cell.x, entry.cell.y, entry.cell.z),
  );
  invariant(sourceState === SOURCE_STATE,
    `target source drift at ${cellKey(entry.cell)}: ${sourceState}`);
  transitions.push({ ...entry, sourceState });
}

const haloGravity = [];
const haloFluids = [];
for (const cell of halo) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = state.split('[', 1)[0];
  if (['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(name)
    || name.endsWith('_concrete_powder')) haloGravity.push({ cell, state });
  if (['minecraft:water', 'minecraft:lava'].includes(name)
    || state.includes('waterlogged=true')) haloFluids.push({ cell, state });
}
invariant(haloFluids.length === 0,
  'lower dry stair halo unexpectedly contains fluid');
invariant(haloGravity.every(({ cell }) => !targetKeys.has(cellKey(cell))),
  'lower stair targets include a gravity block');

const blockEntityIntersections = [];
const savedEntityIntersections = [];
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, haloBounds)) blockEntityIntersections.push({ id: entity.id, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, haloBounds)) {
        savedEntityIntersections.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
      }
    }
  }
}
invariant(blockEntityIntersections.length === 0,
  'lower stair halo intersects a block entity');
invariant(savedEntityIntersections.length === 0,
  'lower stair halo intersects a saved movable entity');
const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = targetCells.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
  'lower stair targets intersect a protected relic core');

const forwardBody = `${transitions.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const rollbackBody = `${transitions.slice().reverse().map(({
  cell, sourceState, targetState,
}) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - CZ-R09B B07 lower spiral stair (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(targetCells)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const sourceIdentityPath = path.join(path.dirname(INTAKE_AUDIT), 'post-snapshot-identity.json');
const sourceIdentity = readJson(sourceIdentityPath);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Build the static core, continuous slab helix, landing, and final cap; rollback removes the cap/landing/helix before the core.',
  },
  scope: {
    releaseId: 'CZ-R09B-P1-B07-LOWER-SPIRAL-STAIR',
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Create passive pedestrian circulation from the accepted lower lobby to a fail-closed hold below the separate wet shaft zone.',
    geometry: {
      dryLowerShaftEnvelope: classManifest(cellsIn({
        minX: 2103, maxX: 2109,
        minY: -58, maxY: 4,
        minZ: -431, maxZ: -425,
      })),
      staticCore: classManifest(core),
      slabHelixAndLanding: classManifest(stairRecords.map(({ cell }) => cell)),
      upperHoldCap: classManifest(cap),
      operatedUnion: classManifest(targetCells),
      interactionHalo: classManifest(halo),
      stairPath: {
        orderedCellCount: stairRecords.length,
        orderedCellSha256: sha256(JSON.stringify(stairRecords.map(({
          cell, targetState, surfaceY2,
        }) => ({ cell, targetState, surfaceY2 })))),
        minimumSurfaceY2: stairRecords[0].surfaceY2,
        maximumSurfaceY2: stairRecords.at(-1).surfaceY2,
        maximumRiseHalfBlocks: 1,
        cardinallyContiguous: true,
      },
    },
    materialDoctrine: {
      core: CORE_STATE,
      circulation: [
        'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]',
        'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
      ],
      cap: CAP_STATE,
    },
    operationalBoundary: {
      lowerLobbyFloorTouched: false,
      upperWetZoneTouched: false,
      upperShaftOpened: false,
      liftInstalledOrCommissioned: false,
      drainageOrOutfallInstalled: false,
      smokeOrPowerSystemCommissioned: false,
      pedestrianRouteCommissionedBeyondHoldCap: false,
      exactRollbackRestoresAllTargetAir: true,
    },
    sourcePartition: {
      operated: classManifest(targetCells),
      sourceStateCensus: stateCensus(transitions, 'sourceState'),
      desiredStateCensus: stateCensus(transitions, 'targetState'),
      exactPartition: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedCellCount: transitions.length,
    operatedCoordinateSetSha256: hashCells(targetCells),
    sourceStateCensus: stateCensus(transitions, 'sourceState'),
    desiredStateCensus: stateCensus(transitions, 'targetState'),
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: transitions.length,
      rollbackCommandCount: transitions.length,
      targetCellCount: transitions.length,
      targetCoordinateSetSha256: hashCells(targetCells),
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  safetyBoundary: {
    targetFluidCount: 0,
    haloFluidCount: haloFluids.length,
    untouchedHaloGravityCount: haloGravity.length,
    gravitySupportRemovedCount: 0,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: savedEntityIntersections.length,
    protectedRelicIntersectionCount: protectedIntersections.length,
    r09aFloorOverlapCount: 0,
    r06WetTreatmentOverlapCount: 0,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    status: authorization.status,
  },
  upstreamIdentities: {
    b07ConstructionSha256: EXPECTED.b07ConstructionSha256,
    r09aManifestIdentity: r09aManifest.manifestIdentity,
    r06ManifestIdentity: r06Manifest.manifestIdentity,
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact source preflight and strict forward/rollback parser checks',
    'block and live entity clearance',
    'strict-noop execution with compensating rollback',
    'immutable post save and exact rollback-poststate preflight',
    'independent stair connectivity, clearance, cap, and undeclared-drift QA',
  ],
};
const manifest = {
  ...manifestWithoutIdentity,
  manifestIdentity: sha256(JSON.stringify(manifestWithoutIdentity)),
};
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity: manifest.manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  coreCellCount: core.length,
  stairCellCount: stairRecords.length,
  capCellCount: cap.length,
  operatedCellCount: transitions.length,
  untouchedHaloGravityCount: haloGravity.length,
  forward,
  rollback,
}, null, 2));
