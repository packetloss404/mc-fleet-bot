#!/usr/bin/env node
/**
 * Compile the dry, support-first completion of the remaining Cobalt guideway
 * bed pockets.  It deliberately excludes the separate water-held cell at
 * (-180,12,-454): that cell needs a dedicated containment design, rather than
 * being swept into an otherwise dry support repair.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-s3-track-source-20260826T031314Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-guideway-04-dry-pocket-completion');
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const RELEASE_ID = 'RAIL-S3-GUIDEWAY-04';
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state))
  || state.includes('waterlogged=true');
const exactSet = (cells) => {
  const unique = uniqueCells(cells);
  return {
    cellCount: unique.length,
    bounds: unique.length ? boundsOf(unique) : null,
    coordinateSetSha256: hashCells(unique),
  };
};

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

// These are the four dry, unsupported pockets left after RAIL-S3-GUIDEWAY-03.
// They are separated into two dry pairs.  The water-held cell at x=-180 is
// excluded with a two-cell solid containment column at x=-179 between it and
// the eastern pair.
const POCKETS = [
  { id: 'west-dry-pair', cells: [{ x: -196, z: -454 }, { x: -195, z: -454 }] },
  { id: 'east-dry-pair', cells: [{ x: -178, z: -454 }, { x: -177, z: -454 }] },
];
const WATER_HELD = { x: -180, y: 12, z: -454 };
const records = [];
for (const pocket of POCKETS) {
  for (const cell of pocket.cells) {
    const support = { x: cell.x, y: 11, z: cell.z };
    const bed = { x: cell.x, y: 12, z: cell.z };
    invariant((await sourceAt(support)) === 'minecraft:air', `support is not exact air at ${cellKey(support)}`);
    invariant((await sourceAt(bed)) === 'minecraft:air', `bed is not exact air at ${cellKey(bed)}`);
    records.push({ cell: support, from: 'minecraft:air', to: 'minecraft:stone', role: `${pocket.id}-support` });
    records.push({ cell: bed, from: 'minecraft:air', to: 'minecraft:polished_deepslate', role: `${pocket.id}-bed` });
  }
}

// Preserve the existing water barrier; this proves the east dry pair cannot
// draw from the known held water cell during the support-first fill.
for (const y of [11, 12, 13]) {
  const state = await sourceAt({ x: -179, y, z: -454 });
  // RAIL-S3-GUIDEWAY-03 intentionally left its lower support as stone; the
  // structural requirement is a solid, dry barrier, not a cosmetic material.
  invariant(!isFluid(state) && !['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state)),
    `water barrier is not solid at (-179,${y},-454): ${state}`);
}
invariant(isFluid(await sourceAt(WATER_HELD)), 'known water-held cell is no longer fluid; re-survey before package selection');

// The separately built six-by-six service gallery stays sealed and dry.
for (let x = -254; x <= -136; x += 1) {
  for (const z of [-463, -456]) {
    for (let y = 18; y <= 23; y += 1) {
      invariant(blockName(await sourceAt({ x, y, z })) === 'minecraft:polished_deepslate',
        `service-gallery liner drift at (${x},${y},${z})`);
    }
  }
}

const ordered = records.slice().sort((left, right) => (
  left.cell.y - right.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const forwardBody = `${ordered.map(({ cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = `data/buildops/${BASENAME}.dry-pocket.forward.txt`;
const rollback = `data/buildops/${BASENAME}.dry-pocket.rollback.txt`;
const target = records.map(({ cell }) => cell);
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(target)}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifest = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_FRESH_BOUNDED_SOURCE_AWAITING_COMPLETE_SAVE_EXECUTION_KERNEL',
  releaseNodeId: 'PASSENGER-RAILWAY',
  mvpScope: false,
  scopeIds: ['SYS-03', 'MP05-B'],
  packages: [{ key: 'dry-pocket', forward, rollback }],
  executionOrder: { forward: ['dry-pocket'], rollback: ['dry-pocket'] },
  source: { snapshotRoot: SNAPSHOT },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    purpose: 'Complete only the four dry, unsupported Cobalt guideway bed pockets support-first. The known water-held bed cell remains excluded for its own containment package.',
    guidewayBedLevel: 12,
    dryPocketBeds: exactSet(records.filter((record) => record.role.endsWith('-bed')).map(({ cell }) => cell)),
    supportFills: exactSet(records.filter((record) => record.role.endsWith('-support')).map(({ cell }) => cell)),
    retainedWaterHeldCell: WATER_HELD,
    retainedWaterBarrier: exactSet([11, 12, 13].map((y) => ({ x: -179, y, z: -454 }))),
    routeCommissioned: false,
    passengerServiceCommissioned: false,
  },
  target: {
    operatedUnion: exactSet(target),
    sourceStateCensus: { 'minecraft:air': records.length },
    desiredStateCensus: { 'minecraft:stone': 4, 'minecraft:polished_deepslate': 4 },
    packageTargetsDisjoint: true,
  },
  operations: {
    'dry-pocket': {
      role: 'support-first dry pocket completion',
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: ordered.length,
      rollbackCommandCount: ordered.length,
      targetCellCount: ordered.length,
      targetCoordinateSetSha256: hashCells(target),
      exactInverse: true,
    },
  },
  retainedInterfaces: {
    serviceGallery: { bounds: { minX: -254, maxX: -136, minY: 18, maxY: 23, minZ: -463, maxZ: -456 }, verifiedSealed: true },
    waterHeldCell: { state: await sourceAt(WATER_HELD), operated: false },
    waterBarrierAtXMinus179: { operated: false, verifiedSolid: true },
  },
  hardStops: {
    requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true,
    requiresFreshExactSourcePreflight: true,
    requiresBlockEntityAndLiveEntityClearance: true,
    requiresStrictNoopForwardAndRollbackChecks: true,
    requiresJournaledStrictExecution: true,
    requiresFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity: manifest.manifestIdentity,
  targetCount: ordered.length,
  retainedWaterHeldCell: WATER_HELD,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2)}\n`);
