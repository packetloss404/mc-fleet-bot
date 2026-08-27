#!/usr/bin/env node
/**
 * Read-only source-bound access/return topology survey for the MP01 direct
 * lamp calibration candidate. It deliberately distinguishes an exact local
 * normal-walk component from an unproven cross-world route: it cannot invent
 * an owner, open a manual door, or turn a geometric line into access.
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
  if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable save> --candidate <direct-lamp candidate JSON> --out <json> --markdown <md> --map <svg>`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 direct-lamp access/return topology rejected: ${message}`);
};
const key = ({ x, y, z }) => `${x},${y},${z}`;
const compare = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;
const sort = (cells) => cells.slice().sort(compare);
const setHash = (cells) => sha256(`${sort(cells).map(key).join('\n')}\n`);
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:scaffolding',
  'minecraft:pointed_dripstone',
]);
const isAir = (state) => AIR.has(stateName(state));
const unsafe = (state) => state.includes('water') || state.includes('lava') || stateName(state) === 'minecraft:bubble_column'
  || GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder')
  || stateName(state).endsWith('_door') || stateName(state).endsWith('_trapdoor');
const bounds = { minX: 1988, maxX: 2028, minY: 160, maxY: 176, minZ: -920, maxZ: -880 };
const inside = ({ x, y, z }) => x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY && z >= bounds.minZ && z <= bounds.maxZ;
const coordinates = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};

const snapshot = required('--snapshot');
const candidatePath = required('--candidate');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(snapshot);
const regionDir = path.join(snapshotRoot, 'region');
const entitiesDir = path.join(snapshotRoot, 'entities');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(regionDir) && fs.existsSync(entitiesDir) && fs.existsSync(capturePath), 'complete snapshot planes are absent');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'snapshot is not a complete immutable 130-member save');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  const bytes = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
  fail(bytes && bytes.length === member.bytes && sha256(bytes) === member.sha256, `capture member drift: ${member.path}`);
}
const candidateBytes = fs.readFileSync(absolute(candidatePath));
const candidate = JSON.parse(candidateBytes);
fail(candidate.id === 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01', 'wrong candidate identity');
fail(candidate.status === 'STATIC_CANDIDATE_PASS_PENDING_RUNTIME_INTERACTION_AND_ACCESS_CONTRACT', 'candidate does not have expected static-pass status');
fail(candidate.source?.snapshot === relative(snapshot), 'candidate source snapshot differs from route survey source');
fail(candidate.source?.captureManifestSha256 === sha256(captureBytes), 'candidate capture binding differs from route survey source');

const reader = new AnvilReader(regionDir);
const entityReader = new AnvilReader(entitiesDir);
const states = new Map();
const stateAt = async (cell) => {
  const stationKey = key(cell);
  if (!states.has(stationKey)) states.set(stationKey, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return states.get(stationKey);
};
const isWalkable = async (feet) => {
  if (!inside(feet)) return false;
  const [support, body, head] = await Promise.all([
    stateAt({ x: feet.x, y: feet.y - 1, z: feet.z }), stateAt(feet), stateAt({ x: feet.x, y: feet.y + 1, z: feet.z }),
  ]);
  return !isAir(support) && !unsafe(support) && isAir(body) && !unsafe(body) && isAir(head) && !unsafe(head);
};
const staging = [2001, 2002, 2003].map((x) => ({ x, y: 165, z: -899 }));
for (const feet of staging) fail(await isWalkable(feet), `staging feet are not normal-walkable at ${key(feet)}`);

const queue = staging.slice();
const connected = new Map(staging.map((cell) => [key(cell), cell]));
const predecessors = new Map(staging.map((cell) => [key(cell), null]));
const tried = new Map();
let head = 0;
while (head < queue.length) {
  const current = queue[head++];
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    for (const dy of [-1, 0, 1]) {
      const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
      const nextKey = key(next);
      if (!inside(next)) continue;
      if (tried.has(`${key(current)}>${nextKey}`)) continue;
      tried.set(`${key(current)}>${nextKey}`, { from: current, to: next });
      if (!await isWalkable(next) || connected.has(nextKey)) continue;
      connected.set(nextKey, next);
      predecessors.set(nextKey, current);
      queue.push(next);
    }
  }
}
const component = sort([...connected.values()]);

const barrierCandidates = [];
for (const current of component) {
  for (const [dx, dz, direction] of [[-1, 0, 'west'], [1, 0, 'east'], [0, -1, 'north'], [0, 1, 'south']]) {
    for (const dy of [-1, 0, 1]) {
      const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
      if (!inside(next) || await isWalkable(next)) continue;
      const body = await stateAt(next);
      const upper = await stateAt({ x: next.x, y: next.y + 1, z: next.z });
      const support = await stateAt({ x: next.x, y: next.y - 1, z: next.z });
      const kind = body.includes('iron_door') || upper.includes('iron_door') ? 'CLOSED_MANUAL_DOOR'
        : body.includes('water') || body.includes('lava') || upper.includes('water') || upper.includes('lava') ? 'FLUID'
          : !isAir(body) || !isAir(upper) ? 'SOLID_OR_CLOSED_BOUNDARY'
            : isAir(support) || unsafe(support) ? 'UNSAFE_OR_ABSENT_FOOTING' : 'OTHER';
      barrierCandidates.push({ from: current, attemptedFeet: next, direction, kind, body, head: upper, support });
    }
  }
}
const northClosureCells = [
  { x: 2000, y: 166, z: -906 }, { x: 2000, y: 167, z: -906 },
];
const eastSequentialClosureCells = [
  { x: 2006, y: 166, z: -894 }, { x: 2006, y: 167, z: -894 },
  { x: 2008, y: 166, z: -894 }, { x: 2008, y: 167, z: -894 },
];
const contiguousDoorCells = [...northClosureCells, ...eastSequentialClosureCells];
const doorStates = await Promise.all(contiguousDoorCells.map(async (cell) => ({ cell, state: await stateAt(cell) })));
for (const record of doorStates) fail(record.state.includes('minecraft:iron_door[')
  && record.state.includes('open=false') && record.state.includes('powered=false'), `service boundary door drift at ${key(record.cell)}: ${record.state}`);

const componentBounds = {
  minX: Math.min(...component.map(({ x }) => x)), maxX: Math.max(...component.map(({ x }) => x)),
  minY: Math.min(...component.map(({ y }) => y)), maxY: Math.max(...component.map(({ y }) => y)),
  minZ: Math.min(...component.map(({ z }) => z)), maxZ: Math.max(...component.map(({ z }) => z)),
};
const chunks = new Set(component.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const componentKeys = new Set(component.map(key));
const blockEntities = [];
const savedEntities = [];
for (const id of chunks) {
  const [chunkX, chunkZ] = id.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (componentKeys.has(key(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= componentBounds.minX && position[0] <= componentBounds.maxX
      && position[1] >= componentBounds.minY && position[1] <= componentBounds.maxY
      && position[2] >= componentBounds.minZ && position[2] <= componentBounds.maxZ) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, `current local walk component has entity state: ${JSON.stringify({ blockEntities, savedEntities })}`);

const report = {
  schemaVersion: 1,
  id: 'MP01-DIRECT-LAMP-ACCESS-RETURN-TOPOLOGY-01',
  status: 'REJECTED_NO_CURRENT_SOURCE_BOUND_BIDIRECTIONAL_ACCESS_RETURN_CONTRACT',
  generatedAtUtc,
  mutationAuthority: false,
  source: {
    snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: sha256(captureBytes), completeSaveSha256: capture.packageIdentity?.completeSaveSha256 ?? null,
    requiredMemberCount: capture.requiredMembers.length,
    candidate: { path: relative(candidatePath), sha256: sha256(candidateBytes), identity: candidate.payloadSha256 },
  },
  ownerBoundContractDisposition: {
    candidateOwner: 'MP01_DIRECT_LAMP_CALIBRATION_OWNER',
    requiredCounterpartOwners: ['MP01_EXTERNAL_ACCESS_ORIGIN_OWNER', 'MP01_ACCESS_TRANSIT_OWNER', 'MP01_ACCESS_RECOVERY_OWNER'],
    acceptedOwnerAssignments: [],
    exactRouteStationsAccepted: 0,
    reason: 'No physical outbound or return path reaches the protected staging component in the bound source. Owner labels cannot make a closed manual boundary traversable.',
  },
  normalWalkTopology: {
    studyBounds: bounds,
    stagingFeet: { cells: staging, cellSetSha256: setHash(staging) },
    connectedStagingComponent: { cellCount: component.length, cellSetSha256: setHash(component), bounds: componentBounds, cells: component },
    blockEntityCount: blockEntities.length,
    savedEntityCount: savedEntities.length,
    attemptedDirectedNormalWalkEdges: tried.size,
    exactClosedManualBoundaries: {
      cells: doorStates,
      cellSetSha256: setHash(contiguousDoorCells),
      northRoomClosure: { cells: northClosureCells, cellSetSha256: setHash(northClosureCells), directionalInterfaceCount: 1 },
      eastSequentialServiceClosure: { cells: eastSequentialClosureCells, cellSetSha256: setHash(eastSequentialClosureCells), directionalInterfaceCount: 2 },
      closedDirectionalInterfaceCount: 3,
    },
    blockingFrontier: barrierCandidates.filter(({ kind }) => kind === 'CLOSED_MANUAL_DOOR').slice(0, 32),
  },
  requiredForFutureAcceptance: [
    'a separately designed and accepted controlled access boundary with exact OPEN/CLOSED functionality, ownership, direction, failure state, and inverse; this survey does not authorize door movement or replacement',
    'a current source-bound origin-to-boundary and boundary-to-distinct-recovery normal-walk survey, with every cardinal station, footing, two-clear-headroom, owner, and interface declared',
    'fresh independent forward and reverse path proof after the boundary design is physically accepted, plus live checkpoint and entity gates before any movement',
    'the separate direct-lamp genuine-click OFF/ON/OFF runtime proof; this topology survey cannot substitute for interaction evidence',
  ],
  safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, configOrCatalogMutationPerformed: false },
  nonClaims: ['normal-walk arrival', 'normal-walk return', 'owner acceptance', 'door operation', 'control commissioning', 'public/service access', 'egress', 'MP01 completion'],
  payloadSha256: null,
};
report.payloadSha256 = sha256(JSON.stringify(report));

const mapBounds = { minX: 1992, maxX: 2011, minZ: -908, maxZ: -890 };
const scale = 26; const width = (mapBounds.maxX - mapBounds.minX + 1) * scale + 90; const height = (mapBounds.maxZ - mapBounds.minZ + 1) * scale + 150;
const surface = new Map();
for (const cell of coordinates(mapBounds.minX, mapBounds.maxX, 165, 166, mapBounds.minZ, mapBounds.maxZ)) surface.set(key(cell), await stateAt(cell));
const componentAt165 = new Set(component.filter(({ y }) => y === 165).map(key));
const stagingKeys = new Set(staging.map(key));
const candidateLever = candidate.functionalIntent.targetTopology.lever;
const candidateLamp = candidate.functionalIntent.targetTopology.lamp;
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fill = (state) => isAir(state) ? '#101827' : state.includes('water') ? '#0ea5e9' : state.includes('iron_door') ? '#f97316' : state.includes('andesite') ? '#94a3b8' : state.includes('blackstone') ? '#334155' : '#64748b';
const cellsSvg = [];
for (let z = mapBounds.minZ; z <= mapBounds.maxZ; z += 1) for (let x = mapBounds.minX; x <= mapBounds.maxX; x += 1) {
  const cell = { x, y: 165, z }; const px = 45 + (x - mapBounds.minX) * scale; const py = 72 + (z - mapBounds.minZ) * scale; const state = surface.get(key(cell));
  cellsSvg.push(`<rect x="${px}" y="${py}" width="${scale}" height="${scale}" fill="${fill(state)}" stroke="#1e293b"><title>${escape(`${key(cell)} — ${state}`)}</title></rect>`);
  if (componentAt165.has(key(cell))) cellsSvg.push(`<rect x="${px + 3}" y="${py + 3}" width="${scale - 6}" height="${scale - 6}" fill="none" stroke="#22c55e" stroke-width="2"/>`);
  if (stagingKeys.has(key(cell))) cellsSvg.push(`<rect x="${px + 5}" y="${py + 5}" width="${scale - 10}" height="${scale - 10}" fill="none" stroke="#38bdf8" stroke-width="3"/>`);
  if (x === candidateLever.x && z === candidateLever.z) cellsSvg.push(`<text x="${px + 4}" y="${py + 17}" class="cell">LEV</text>`);
  if (x === candidateLamp.x && z === candidateLamp.z) cellsSvg.push(`<text x="${px + 2}" y="${py + 17}" class="cell">LAMP</text>`);
}
for (const { cell } of doorStates.filter(({ cell }) => cell.y === 166)) {
  const px = 45 + (cell.x - mapBounds.minX) * scale; const py = 72 + (cell.z - mapBounds.minZ) * scale;
  cellsSvg.push(`<rect x="${px + 2}" y="${py + 2}" width="${scale - 4}" height="${scale - 4}" fill="none" stroke="#ef4444" stroke-width="3"/>`);
}
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:23px;font-weight:800}.note{font-size:14px;fill:#cbd5e1}.cell{font-size:8px;font-weight:800}</style><rect width="100%" height="100%" fill="#0b1020"/><text class="title" x="45" y="30">MP01 direct-lamp staging access/return topology — source-bound, no route</text>${cellsSvg.join('')}<text class="note" x="45" y="${height - 54}">green: exact existing staging normal-walk component · blue: staging feet · red: closed manual door leaves at y=166</text><text class="note" x="45" y="${height - 29}">No owner label, marker, or route record can make the closed service boundary traversable. No movement or mutation authority is emitted.</text></svg>`;

for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(map), mapSvg);
const md = `# MP01 direct-lamp access/return topology 01\n\n`
  + `**Status:** \`${report.status}\` — no route, owner acceptance, movement, or mutation authority was emitted.\n\n`
  + `![Local topology map](${path.basename(map)})\n\n`
  + `## Exact source finding\n\n`
  + `The three candidate staging feet form a \`${component.length}\`-station finite normal-walk component in the stated local study bounds. It contains no saved entities or block entities. Its observed exits are three exact closed manual directional interfaces: the north room closure at \`(2000,166..167,-906)\` and the east sequential service leaves at \`(2006,166..167,-894)\` and \`(2008,166..167,-894)\`. A normal-walk access or return contract cannot cross any of them as currently built.\n\n`
  + `## Contract disposition\n\n`
  + `No owner assignment is accepted because there are zero source-valid outbound/return route stations from the candidate component to an external origin or distinct recovery anchor. An owner label, catalog marker, or route entry cannot convert the closed manual boundary into a route. A future boundary design must own exact states, direction, failure behavior, inverse, and independent bidirectional post proof before this access contract can be re-surveyed.\n\n`
  + `The separate direct-lamp OFF/ON/OFF genuine-click proof remains independent and unperformed.\n`;
fs.writeFileSync(absolute(markdown), md);
process.stdout.write(`${JSON.stringify({ status: report.status, componentStations: component.length, closedDirectionalInterfaces: 3, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
