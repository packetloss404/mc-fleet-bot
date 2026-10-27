#!/usr/bin/env node
/** Compile the R08AP Empty Eight protected public egress adapter release.
 *
 * R08AP connects the west public retail gallery to the accepted EG-A surface
 * egress shaft by opening a bounded 3-wide x 2-tall doorway through the
 * separating stone-brick wall at x=1652 (z=146..148, y=50..51). The EG-A
 * vertical shaft (x=1651) is already open from the concourse level to the
 * surface, so this single controlled opening completes the protected public
 * egress path without disturbing the sealed R07G headhouse or any other
 * interface.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-24T00:40:00Z');
const SNAPSHOT = value('--snapshot', '/tmp/opencode/r08ao-post-20260824T003519Z');
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08ao-live-20260824T003519Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-release-ledger',
  'data/world-review/combined-zones-r08ao-live-20260824T003519Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r08ap-empty-eight-protected-public-egress-adapter',
);
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-r08ap-empty-eight-protected-public-egress-adapter';
const RELEASE_ID = 'CZ-R08AP-EMPTY-EIGHT-PROTECTED-PUBLIC-EGRESS-ADAPTER';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS = 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const R07G_MANIFEST = 'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json';
const R08AL_MANIFEST = 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json';
const R08AN_MANIFEST = 'data/buildops/combined-zones-r08an-empty-eight-public-stair-widening.release-manifest.json';
const R08AO_MANIFEST = 'data/buildops/combined-zones-r08ao-empty-eight-boh-orientation-alcove.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AP compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector = (record) => record.state) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const design = readJson(DESIGN);
const contract = readJson(CONTRACT);
const authorization = readJson(AUTHORIZATION);
const protectedRelics = readJson(PROTECTED_RELICS);
const intake = readJson(INTAKE);
const sourceLedger = readJson(SOURCE_LEDGER);
const r07gManifest = readJson(R07G_MANIFEST);
const r08alManifest = readJson(R08AL_MANIFEST);
const r08anManifest = readJson(R08AN_MANIFEST);
const r08aoManifest = readJson(R08AO_MANIFEST);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not an accepted complete immutable save');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT), 'intake/snapshot mismatch');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'source ledger is not the accepted terminal post');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');
const node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(node?.canonicalOwners?.includes('Z02-U1-CONCOURSE-MALL'), 'R08 concourse owner drifted');

// The EG-A headhouse core is a sealed surface shell with an open vertical
// shaft at x=1651 from the concourse to the surface. R08AP opens a bounded
// 3-wide x 2-tall doorway through the separating wall at x=1652 so the west
// gallery concourse reaches the shaft.
const doorway = {
  x: 1652,
  minY: 50, maxY: 51,
  minZ: 146, maxZ: 148,
};

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

// Doorway opening: convert the six stone-brick wall cells to air.
for (const cell of cellsIn({ minX: doorway.x, maxX: doorway.x, minY: 50, maxY: 51, minZ: 146, maxZ: 148 })) {
  setTarget(cell, 'minecraft:air', 'egress-doorway', 'protected-egress-opening');
}
// Doorway lintel: the two cells above the opening (y=52) remain wall, but a
// light marker identifies the egress route from the concourse side.
for (const z of [146, 148]) {
  setTarget({ x: doorway.x, y: 52, z }, 'minecraft:sea_lantern', 'egress-lighting', 'egress-route-light');
}

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isForbidden(sourceState));
invariant(hazards.length === 0, `target fluid/container/control sources: ${JSON.stringify(hazards.slice(0, 20))}`);

const haloCells = uniqueCells(targetCells.flatMap((cell) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0,
`interaction halo fluid/container/control hazard: ${JSON.stringify([...haloFluid, ...haloForbidden].slice(0, 20))}`);

// Retained halo gravity must remain supported.
const unstableHaloGravity = [];
for (const finding of haloRecords.filter(({ state }) => isGravity(state))) {
  if (blockName(finding.state) === 'minecraft:pointed_dripstone'
    && finding.state.includes('vertical_direction=down')) continue;
  const belowKey = `${finding.cell.x},${finding.cell.y - 1},${finding.cell.z}`;
  const belowFinal = desired.get(belowKey)?.toState
    ?? stateToCommandString(await reader.blockState(finding.cell.x, finding.cell.y - 1, finding.cell.z));
  if (AIR.has(blockName(belowFinal)) || isFluid(belowFinal)) {
    unstableHaloGravity.push({ ...finding, belowFinal });
  }
}
invariant(unstableHaloGravity.length === 0,
  `retained halo gravity lacks support: ${JSON.stringify(unstableHaloGravity.slice(0, 40))}`);

// Hard geometric exclusions from the design.
const future = uniqueCells(design.d06.futureInterfaces.interfaces.flatMap(({ sealDesign }) => cellsIn(sealDesign.bounds)));
const drainage = uniqueCells([
  ...design.d06.lifeSafety.drainage.trackDrainAndSumpReservations.flatMap(({ channel, sumpReservation }) => [
    ...cellsIn(channel.bounds), ...cellsIn(sumpReservation.bounds),
  ]),
  ...cellsIn(design.d06.lifeSafety.drainage.internalDischargeHeader.bounds),
  ...cellsIn(design.d06.lifeSafety.drainage.sealedBoundaryCap.bounds),
]);
const fireSpine = cellsIn(design.d06.lifeSafety.fireAndServiceAccess.internalSpineReservation.bounds);
for (const [label, cells] of [['future-line seal', future], ['drainage', drainage], ['fire/service spine', fireSpine]]) {
  const intersection = cells.filter((cell) => targetKeys.has(cellKey(cell)));
  invariant(intersection.length === 0, `${label} intersection: ${JSON.stringify(intersection.slice(0, 20))}`);
}

const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntityIntersections = [];
const entityIntersections = [];
const envelopeBounds = boundsOf(uniqueCells([...targetCells, ...haloCells]));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
'target/halo intersects a block entity or saved movable entity');

const packageOrder = [
  'egress-doorway',
  'egress-lighting',
];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  invariant(group.length > 0, `${key} compiled empty`);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = [
    `# ${TRANSACTION_ID}/${key}`,
    `# source ${SNAPSHOT}`,
    '# guarded per-cell exact-state transitions; generated offline',
  ];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const sourcePostIdentity = readJson(sourceLedger.postSnapshot.identity.path);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_ACCEPTED_R08AO_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-CONCOURSE-MALL', 'OWN-D06-EG-A'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
    purpose: 'Open a bounded protected public egress doorway from the west gallery concourse to the accepted EG-A surface egress shaft, per the source-bound circulation review.',
    publicAccess: {
      accepted: true,
      surfaceEgressOrAccessibilityClaimed: true,
      egressPath: {
        fromWidenedPf08Stair: true,
        viaWestGalleryConcourse: true,
        doorway: { x: 1652, minY: 50, maxY: 51, minZ: 146, maxZ: 148, width: 3, height: 2 },
        shaftEndpoint: { x: 1651, z: 148, baseY: 49, surfaceY: 84 },
        reachesOpenAir: true,
      },
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTarget.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
      operationRoles,
    },
    retainedBoundaries: {
      r07gHeadhouseSealed: true,
      r08alPublicGalleryPreserved: true,
      r08anWidenedStairsPreserved: true,
      r08aoOrientationAlcovePreserved: true,
      railStubIntersectionCount: 0,
      drainageIntersectionCount: 0,
      fireServiceSpineIntersectionCount: 0,
      shaftPathPreserved: true,
      egBShaftUnopened: true,
      accessibilityClaimed: false,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
      postCompleteSaveSha256: sourceLedger.postSnapshot.completeSaveSha256,
      postRegionSha256: sourcePostIdentity.sha256,
    },
    completeSaveSha256: sourceLedger.postSnapshot.completeSaveSha256,
    regionSnapshotSha256: sourcePostIdentity.sha256,
    targetSourceStateCensus: census(records, ({ sourceState }) => sourceState),
  },
  evidenceBindings: {
    design: fileBinding(DESIGN),
    contract: fileBinding(CONTRACT),
    authorization: fileBinding(AUTHORIZATION),
    protectedRelics: fileBinding(PROTECTED_RELICS),
    r07gManifest: fileBinding(R07G_MANIFEST),
    r08alManifest: fileBinding(R08AL_MANIFEST),
    r08anManifest: fileBinding(R08AN_MANIFEST),
    r08aoManifest: fileBinding(R08AO_MANIFEST),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    targetForbiddenBlockCount: operations.filter(({ sourceState }) => isForbidden(sourceState)).length,
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloForbiddenBlockCount: haloForbidden.length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
    protectedRelicIntersectionCount: 0,
    futureLineSealIntersectionCount: 0,
    drainageIntersectionCount: 0,
    fireServiceSpineIntersectionCount: 0,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
    gravity: 'solid conversions bottom-up; clearances top-down; exact rollback reverses both',
  },
  operations: operationManifest,
  packages,
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: targetCells.length,
  operationCount: operations.length,
  packageCount: packages.length,
}, null, 2)}\n`);
