#!/usr/bin/env node
/** Read-only survey plus exact compiler for dry D01 manual materials bay. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const required = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0 || !args[index + 1]) throw new Error(`${flag} is required`);
  return args[index + 1];
};
const optional = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = required('--snapshot');
const surveyOut = required('--survey-out');
const basename = optional('--basename', 'mp01-d01-manual-materials-bay-01');
const buildops = optional('--out-dir', 'data/buildops');
const generatedAtUtc = optional('--generated-at', new Date().toISOString());
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`D01 compile rejected: ${message}`);
};

const capturePath = absolute(path.join(snapshot, 'combined-zones-complete-save-capture.json'));
fail(fs.existsSync(capturePath), 'complete-save capture manifest is missing');
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const requiredMembers = new Set(capture.requiredMembers?.map((member) => member.path));
fail(capture.immutableCopy === true, 'snapshot is not an immutable complete save');
for (const requiredMember of ['level.dat', 'region/', 'entities/', 'poi/']) {
  fail(requiredMember.endsWith('/')
    ? [...requiredMembers].some((member) => member.startsWith(requiredMember))
    : requiredMembers.has(requiredMember), `complete snapshot is missing ${requiredMember}`);
}

const reader = new AnvilReader(absolute(path.join(snapshot, 'region')));
const entityReader = new AnvilReader(absolute(path.join(snapshot, 'entities')));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const targets = [
  { x: 2012, y: 168, z: -844, desiredState: 'minecraft:fletching_table' },
  { x: 2013, y: 168, z: -844, desiredState: 'minecraft:crafting_table' },
];
const sourceTargets = [];
for (const target of targets) {
  const sourceState = await stateAt(target.x, target.y, target.z);
  sourceTargets.push({ ...target, sourceState });
  fail(sourceState === 'minecraft:air', `target ${target.x},${target.y},${target.z}=${sourceState}`);
  fail(await stateAt(target.x, 167, target.z) === 'minecraft:light_gray_concrete', `support drift at ${target.x},167,${target.z}`);
  fail(await stateAt(target.x, 169, target.z) === 'minecraft:air', `head clearance drift at ${target.x},169,${target.z}`);
}

const preservedApproach = [];
for (let x = 2015; x <= 2017; x += 1) {
  for (let y = 168; y <= 169; y += 1) {
    const state = await stateAt(x, y, -844);
    preservedApproach.push({ x, y, z: -844, state });
    fail(state === 'minecraft:air', `approach drift at ${x},${y},-844=${state}`);
  }
}
const retainedBoundary = [];
for (const x of [2011, 2014]) {
  const state = await stateAt(x, 168, -844);
  retainedBoundary.push({ x, y: 168, z: -844, state });
  fail(state !== 'minecraft:air', `unreviewed open boundary at ${x},168,-844`);
}

const water = [];
for (let x = 2009; x <= 2017; x += 1) {
  for (let y = 167; y <= 171; y += 1) {
    const state = await stateAt(x, y, -844);
    if (state.includes('water') || state.includes('lava') || state === 'minecraft:bubble_column') water.push({ x, y, z: -844, state });
  }
}
fail(water.length === 0, 'fluid in bounded D01 envelope');

const targetKeys = new Set(targets.map(cellKey));
const halo = [];
for (const target of targets) {
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const cell = { x: target.x + dx, y: target.y + dy, z: target.z + dz };
    if (!targetKeys.has(cellKey(cell)) && !halo.some((candidate) => cellKey(candidate) === cellKey(cell))) halo.push(cell);
  }
}
const envelope = [...targets.map(({ x, y, z }) => ({ x, y, z })), ...halo];
const envelopeKeys = new Set(envelope.map(cellKey));
const bounds = { minX: Math.min(...envelope.map((cell) => cell.x)), maxX: Math.max(...envelope.map((cell) => cell.x)), minY: Math.min(...envelope.map((cell) => cell.y)), maxY: Math.max(...envelope.map((cell) => cell.y)), minZ: Math.min(...envelope.map((cell) => cell.z)), maxZ: Math.max(...envelope.map((cell) => cell.z)) };
const chunks = new Set(envelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
const savedEntities = [];
for (const chunkId of chunks) {
  const [x, z] = chunkId.split(',').map(Number);
  const chunk = await reader.chunk(x, z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= bounds.minX && position[0] <= bounds.maxX
      && position[1] >= bounds.minY && position[1] <= bounds.maxY
      && position[2] >= bounds.minZ && position[2] <= bounds.maxZ) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
fail(blockEntities.length === 0, `target/halo block entity: ${JSON.stringify(blockEntities)}`);
fail(savedEntities.length === 0, `target/halo saved entity: ${JSON.stringify(savedEntities)}`);

const nonClaims = ['container storage', 'automation', 'active controls', 'utility commissioning', 'public access', 'MP01 completion'];
const survey = {
  status: 'PASS_MP01_D01_MANUAL_MATERIALS_BAY_OFFLINE_READY',
  snapshot,
  completeSave: { captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: capture.immutableCopy },
  targets: sourceTargets,
  preservedApproach,
  retainedBoundary,
  envelopeWaterCells: water,
  interactionEnvelope: { cellCount: envelope.length, bounds, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length },
  candidate: { releaseId: 'MP01-D01-MANUAL-MATERIALS-BAY-01', targetStates: targets.map(({ x, y, z, desiredState }) => ({ x, y, z, state: desiredState })), nonClaims },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
survey.payloadSha256 = hash(JSON.stringify(survey));
fs.mkdirSync(path.dirname(absolute(surveyOut)), { recursive: true });
fs.writeFileSync(absolute(surveyOut), `${JSON.stringify(survey, null, 2)}\n`);

const forward = path.join(buildops, `${basename}.forward.txt`);
const rollback = path.join(buildops, `${basename}.rollback.txt`);
const forwardText = `${targets.map(({ x, y, z, desiredState }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${desiredState}`).join('\n')}\n`;
const rollbackText = `${[...targets].reverse().map(({ x, y, z, desiredState }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${desiredState} minecraft:air`).join('\n')}\n`;
fs.mkdirSync(absolute(buildops), { recursive: true });
fs.writeFileSync(absolute(forward), forwardText);
fs.writeFileSync(absolute(rollback), rollbackText);

const transactionId = basename;
const manifest = {
  schemaVersion: 1,
  transactionId,
  generatedAtUtc,
  status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false,
  scopeIds: ['MP01-A'],
  packages: [{ key: 'd01-manual-materials-bay', forward: relative(forward), rollback: relative(rollback) }],
  executionOrder: { forward: ['d01-manual-materials-bay'], rollback: ['d01-manual-materials-bay'] },
  scope: { releaseId: 'MP01-D01-MANUAL-MATERIALS-BAY-01', purpose: 'Dry manual fletching/crafting station in D01.', accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY', nonClaims },
  source: { snapshotRoot: snapshot, captureId: capture.captureId, completeSaveCapturedAtUtc: capture.capturedAtUtc, survey: relative(surveyOut), surveySha256: hash(fs.readFileSync(absolute(surveyOut))) },
  target: { operatedUnion: { cellCount: targets.length, bounds: { minX: 2012, maxX: 2013, minY: 168, maxY: 168, minZ: -844, maxZ: -844 } }, interactionHalo: { cellCount: halo.length, bounds }, packageTargetsDisjoint: true },
  isolation: { fluidCellsInBoundedEnvelope: water.length, targetAndHaloBlockEntityCount: blockEntities.length, targetAndHaloSavedEntityCount: savedEntities.length, retainedBoundaries: retainedBoundary },
  operations: { 'd01-manual-materials-bay': { forwardSha256: hash(forwardText), rollbackSha256: hash(rollbackText), forwardCommandCount: targets.length, rollbackCommandCount: targets.length, targetCellCount: targets.length, exactInverse: true } },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
manifest.manifestIdentity = hash(JSON.stringify(manifest));
const manifestPath = path.join(buildops, `${basename}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: survey.status, manifest: relative(manifestPath), survey: relative(surveyOut), targetCount: targets.length, savedEntityCount: savedEntities.length }, null, 2));
