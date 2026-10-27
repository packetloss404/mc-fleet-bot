#!/usr/bin/env node
/**
 * Read-only source survey for the first MP01 direct-lamp calibration candidate.
 *
 * This deliberately selects neither a door nor an existing reactive cell.  It
 * identifies an isolated two-cell lever/lamp envelope whose intended effect is
 * a direct local indicator only.  It emits no operation, release manifest, or
 * authority to change the world.  A same-version physical-interaction proof
 * and the separately accepted MP01 access/return contract remain mandatory.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const value = option(flag);
  if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable save> --out <json> --markdown <md> --map <svg>`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 direct-lamp candidate survey rejected: ${message}`);
};
const key = ({ x, y, z }) => `${x},${y},${z}`;
const unique = (cells) => [...new Map(cells.map((cell) => [key(cell), cell])).values()];
const sortCells = (cells) => cells.slice().sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
const cellSetHash = (cells) => sha256(`${sortCells(cells).map(key).join('\n')}\n`);
const boundsOf = (cells) => ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});
const neighbors = (cells) => {
  const targetKeys = new Set(cells.map(key));
  return unique(cells.flatMap(({ x, y, z }) => [
    { x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z },
    { x, y: y + 1, z }, { x, y, z: z - 1 }, { x, y, z: z + 1 },
  ]).filter((cell) => !targetKeys.has(key(cell))));
};
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:scaffolding',
  'minecraft:pointed_dripstone',
]);
const HAZARD = (state) => state.includes('water') || state.includes('lava') || stateName(state) === 'minecraft:bubble_column'
  || GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isAir = (state) => AIR.has(stateName(state));

const snapshot = required('--snapshot');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(snapshot);
const regionDir = path.join(snapshotRoot, 'region');
const entitiesDir = path.join(snapshotRoot, 'entities');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(regionDir) && fs.existsSync(entitiesDir) && fs.existsSync(capturePath),
  'snapshot must contain region/, entities/, and combined-zones complete-save capture');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'source capture is not immutable');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130,
  `expected complete 130-member capture, found ${capture.requiredMembers?.length ?? 'none'}`);
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(filename), `captured member missing: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}

const reader = new AnvilReader(regionDir);
const entityReader = new AnvilReader(entitiesDir);
const read = async (cell) => ({ ...cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });

// The lamp is directly adjacent to the lever, with no wire/repeater/piston.
// Both are new air targets on the existing polished-andesite floor. The pair
// is separated by an air buffer from the historical unaccepted control line.
const lever = { x: 1998, y: 165, z: -902 };
const lamp = { x: 1999, y: 165, z: -902 };
const target = [lever, lamp];
const targetRecords = await Promise.all(target.map(read));
for (const record of targetRecords) fail(isAir(record.state), `candidate target is not air at ${key(record)}: ${record.state}`);
const supports = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const supportRecords = await Promise.all(supports.map(read));
for (const record of supportRecords) fail(record.state === 'minecraft:polished_andesite',
  `candidate support drift at ${key(record)}: ${record.state}`);
const headroom = target.flatMap(({ x, y, z }) => [{ x, y: y + 1, z }, { x, y: y + 2, z }]);
const headroomRecords = await Promise.all(headroom.map(read));
for (const record of headroomRecords) fail(isAir(record.state), `candidate headroom is not clear at ${key(record)}: ${record.state}`);

const legacy = [
  { x: 2001, y: 165, z: -902 }, { x: 2002, y: 165, z: -902 }, { x: 2003, y: 165, z: -902 },
  { x: 2004, y: 165, z: -902 }, { x: 2001, y: 166, z: -902 }, { x: 2002, y: 166, z: -902 },
  { x: 2003, y: 166, z: -902 },
];
for (const left of target) for (const right of legacy) {
  const distance = Math.abs(left.x - right.x) + Math.abs(left.y - right.y) + Math.abs(left.z - right.z);
  fail(distance > 1, `candidate touches historic reactive envelope at ${key(left)} -> ${key(right)}`);
}

const halo = neighbors([...target, ...supports, ...headroom]);
const haloRecords = await Promise.all(halo.map(read));
const hazards = haloRecords.filter(({ state }) => HAZARD(state));
fail(hazards.length === 0, `candidate envelope has fluid/gravity hazard: ${JSON.stringify(hazards)}`);
const envelope = unique([...target, ...supports, ...headroom, ...halo]);
const envelopeBounds = boundsOf(envelope);
const envelopeKeys = new Set(envelope.map(key));
const chunks = new Set(envelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
const savedEntities = [];
for (const id of chunks) {
  const [chunkX, chunkZ] = id.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(key(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] <= envelopeBounds.maxX
      && position[1] >= envelopeBounds.minY && position[1] <= envelopeBounds.maxY
      && position[2] >= envelopeBounds.minZ && position[2] <= envelopeBounds.maxZ) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
    }
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0,
  `candidate envelope has block/saved entities: ${JSON.stringify({ blockEntities, savedEntities })}`);

const staging = [2001, 2002, 2003].map((x) => ({ x, y: 165, z: -899 }));
const interactionDistances = staging.map((feet) => ({
  feet,
  leverEuclideanDistance: Number(Math.hypot(feet.x - lever.x, feet.y - lever.y, feet.z - lever.z).toFixed(3)),
}));
const report = {
  schemaVersion: 1,
  id: 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01',
  status: 'STATIC_CANDIDATE_PASS_PENDING_RUNTIME_INTERACTION_AND_ACCESS_CONTRACT',
  generatedAtUtc,
  mutationAuthority: false,
  source: {
    snapshot: relative(snapshot),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: sha256(captureBytes),
    completeSaveSha256: capture.packageIdentity?.completeSaveSha256 ?? null,
    requiredMemberCount: capture.requiredMembers.length,
  },
  functionalIntent: {
    role: 'isolated manual direct-lamp diagnostic calibration',
    scopeBoundary: 'A direct local lever-to-lamp indicator only; no wiring, repeater, door, water, reservoir liner, route, access boundary, utility, or life-safety actuation.',
    targetTopology: {
      lever: { ...lever, expectedSourceState: 'minecraft:air', proposedRole: 'wall-mounted direct actuator on the lamp west face; exact canonical state is runtime-proof dependent' },
      lamp: { ...lamp, expectedSourceState: 'minecraft:air', proposedRole: 'directly adjacent isolated indicator lamp; exact OFF/ON states are runtime-proof dependent' },
      forbiddenReactiveBlocks: ['minecraft:redstone_wire', 'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:redstone_block'],
    },
    existingFloorSupport: { cellCount: supports.length, coordinateSetSha256: cellSetHash(supports), requiredState: 'minecraft:polished_andesite' },
    headroom: { cellCount: headroom.length, coordinateSetSha256: cellSetHash(headroom), requiredState: 'minecraft:air' },
  },
  isolation: {
    target: { cellCount: target.length, coordinateSetSha256: cellSetHash(target), sourceStates: targetRecords },
    envelope: { cellCount: envelope.length, coordinateSetSha256: cellSetHash(envelope), bounds: envelopeBounds },
    halo: { cellCount: halo.length, coordinateSetSha256: cellSetHash(halo), fluidOrGravityHazardCount: hazards.length },
    blockEntityCount: blockEntities.length,
    savedEntityCount: savedEntities.length,
    legacyReactiveEnvelope: { cellCount: legacy.length, coordinateSetSha256: cellSetHash(legacy), targetAdjacency: 'none; at least one air-buffer cell remains between the selected pair and historic component' },
  },
  interactionGeometryOnly: {
    existingAllowedStagingFeet: staging,
    directLineDistancesToLever: interactionDistances,
    finding: 'The nearest existing staging foot has a 4.243-block geometric line to the candidate lever. This is not interaction-range proof and does not authorize a bot move or interaction.',
  },
  requiredBeforeCompilation: [
    'same-version disposable runtime proof of the exact wall-mounted direct-lamp orientation and genuine click semantics',
    'two independent settled OFF observations, a genuine interaction, two independent settled ON observations, a genuine reset, and two settled OFF observations',
    'accepted exact outbound/return normal-walk ownership and recovery-anchor contract to the staging location',
    'fresh immediate complete-save rebind, live entity clearance, canonical source/target/rollback state files, strict-noop preflights, journaled execution, fresh post capture, and rollback-poststate proof',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    botMovementPerformed: false,
    worldEditsPerformed: false,
    operationFilesEmitted: false,
    releaseManifestEmitted: false,
  },
  nonClaims: ['active access control', 'door operation', 'utility commissioning', 'life safety', 'egress', 'public/service opening', 'MP01 completion'],
  payloadSha256: null,
};
report.payloadSha256 = sha256(JSON.stringify(report));

const minX = 1993; const maxX = 2005; const minZ = -905; const maxZ = -898;
const cells = new Map();
for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
  cells.set(`${x},164,${z}`, stateToCommandString(await reader.blockState(x, 164, z)));
  cells.set(`${x},165,${z}`, stateToCommandString(await reader.blockState(x, 165, z)));
}
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const color = (state) => {
  if (isAir(state)) return '#101827';
  if (state === 'minecraft:polished_andesite') return '#94a3b8';
  if (state.includes('blackstone')) return '#334155';
  if (state.includes('water') || state.includes('lava')) return '#0ea5e9';
  return '#64748b';
};
const size = 32; const panelWidth = (maxX - minX + 1) * size; const panelHeight = (maxZ - minZ + 1) * size;
const draw = (level, panelX) => {
  const result = [`<text class="subtitle" x="${panelX}" y="60">y=${level}</text>`];
  for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
    const px = panelX + (x - minX) * size; const py = 82 + (z - minZ) * size;
    const state = cells.get(`${x},${level},${z}`);
    result.push(`<rect x="${px}" y="${py}" width="${size}" height="${size}" fill="${color(state)}" stroke="#1e293b"><title>${escape(`${x},${level},${z} — ${state}`)}</title></rect>`);
    if (level === 165 && x === lever.x && z === lever.z) result.push(`<rect x="${px + 3}" y="${py + 3}" width="${size - 6}" height="${size - 6}" fill="none" stroke="#f59e0b" stroke-width="3"/><text class="cell" x="${px + 8}" y="${py + 20}">LEV</text>`);
    if (level === 165 && x === lamp.x && z === lamp.z) result.push(`<rect x="${px + 3}" y="${py + 3}" width="${size - 6}" height="${size - 6}" fill="none" stroke="#22c55e" stroke-width="3"/><text class="cell" x="${px + 6}" y="${py + 20}">LAMP</text>`);
    if (level === 165 && x >= 2001 && x <= 2003 && z === -899) result.push(`<rect x="${px + 4}" y="${py + 4}" width="${size - 8}" height="${size - 8}" fill="none" stroke="#38bdf8" stroke-width="3"/>`);
    if (level === 165 && x >= 2001 && x <= 2004 && z === -902) result.push(`<rect x="${px + 4}" y="${py + 4}" width="${size - 8}" height="${size - 8}" fill="none" stroke="#ef4444" stroke-width="2"/>`);
  }
  return result.join('');
};
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${panelWidth * 2 + 170}" height="${panelHeight + 170}" viewBox="0 0 ${panelWidth * 2 + 170} ${panelHeight + 170}">
<style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:25px;font-weight:800}.subtitle{font-size:18px;font-weight:700}.note{font-size:14px;fill:#cbd5e1}.cell{font-size:10px;font-weight:800}</style>
<rect width="100%" height="100%" fill="#0b1020"/><text class="title" x="48" y="32">MP01 direct-lamp calibration candidate — source survey only</text>
${draw(164, 48)}${draw(165, 48 + panelWidth + 64)}
<text class="note" x="48" y="${panelHeight + 112}">amber: proposed lever target · green: proposed direct lamp target · blue: retained staging feet · red: historic unaccepted reactive envelope</text>
<text class="note" x="48" y="${panelHeight + 136}">No operation or interaction authority. Runtime click proof and a verified access/return contract remain mandatory.</text>
</svg>`;

for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(map), mapSvg);
const md = `# MP01 isolated direct-lamp calibration candidate 01\n\n`
  + `**Status:** \`${report.status}\` — source-bound design evidence only; no operation was emitted.\n\n`
  + `![Candidate source map](${path.basename(map)})\n\n`
  + `## Exact candidate\n\n`
  + `The direct-lamp diagnostic pair is two new air cells at lever \`(${lever.x},${lever.y},${lever.z})\` and lamp \`(${lamp.x},${lamp.y},${lamp.z})\`, on retained polished-andesite supports. It contains no wire, repeater, comparator, piston, redstone block, door, water, reservoir liner, or route cell. Its complete source envelope has \`${envelope.length}\` cells, zero fluid/gravity hazards, zero block entities, and zero saved entities. The historic seven-cell lever/wire/lamp remains untouched beyond an air buffer.\n\n`
  + `## Functional purpose and hold\n\n`
  + `This is a bounded manual **diagnostic calibration**: a direct local lever-to-lamp indication only. It is not decoration, access control, a door system, utility commissioning, life safety, egress, or an opening claim. It remains non-executable until an exact same-version genuine-click runtime proof establishes canonical OFF/ON/OFF states and the independent MP01 outbound/return access contract proves a permitted actor can arrive and recover.\n\n`
  + `The nearest retained staging foot has a 4.243-block geometric line to the proposed lever. That is a coordinate observation, not interaction-range or movement authorization.\n`;
fs.writeFileSync(absolute(markdown), md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
