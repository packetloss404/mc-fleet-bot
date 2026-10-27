#!/usr/bin/env node
/**
 * Design-only restricted staging -> service-corridor boundary for MP01's
 * direct-lamp calibration candidate. This does not compile operations or
 * authorize a door interaction. It identifies the minimal existing exit set
 * that reaches the service component, binds static source/target/inverse
 * states, and leaves all runtime gate semantics fail-closed.
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
  if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable save> --candidate <candidate JSON> --topology <topology JSON> --out <json> --markdown <md> --map <svg>`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 east sequential boundary design rejected: ${message}`);
};
const key = ({ x, y, z }) => `${x},${y},${z}`;
const compare = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;
const sort = (cells) => cells.slice().sort(compare);
const setHash = (cells) => sha256(`${sort(cells).map(key).join('\n')}\n`);
const stateHash = (records) => sha256(`${records.slice().sort((a, b) => compare(a.cell, b.cell))
  .map(({ cell, state }) => `${key(cell)}=${state}`).join('\n')}\n`);
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
const unique = (cells) => [...new Map(cells.map((cell) => [key(cell), cell])).values()];
const neighbors = (cells) => {
  const target = new Set(cells.map(key));
  return unique(cells.flatMap(({ x, y, z }) => [
    { x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z }, { x, y: y + 1, z },
    { x, y, z: z - 1 }, { x, y, z: z + 1 },
  ]).filter((cell) => !target.has(key(cell))));
};
const box = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};

const snapshot = required('--snapshot');
const candidatePath = required('--candidate');
const topologyPath = required('--topology');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(snapshot);
const regionDir = path.join(snapshotRoot, 'region');
const entitiesDir = path.join(snapshotRoot, 'entities');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(regionDir) && fs.existsSync(entitiesDir) && fs.existsSync(capturePath), 'snapshot lacks complete region/entities/capture planes');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'source is not a complete immutable 130-member capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  const bytes = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
  fail(bytes && bytes.length === member.bytes && sha256(bytes) === member.sha256, `capture member drift: ${member.path}`);
}
const candidateBytes = fs.readFileSync(absolute(candidatePath));
const candidate = JSON.parse(candidateBytes);
const topologyBytes = fs.readFileSync(absolute(topologyPath));
const topology = JSON.parse(topologyBytes);
fail(candidate.id === 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01', 'wrong direct-lamp candidate');
fail(topology.id === 'MP01-DIRECT-LAMP-ACCESS-RETURN-TOPOLOGY-01', 'wrong access topology');
for (const record of [candidate, topology]) {
  fail(record.source?.snapshot === relative(snapshot), 'prior input has source snapshot drift');
  fail(record.source?.captureManifestSha256 === sha256(captureBytes), 'prior input has capture manifest drift');
}

const reader = new AnvilReader(regionDir);
const entityReader = new AnvilReader(entitiesDir);
const cache = new Map();
const stateAt = async (cell, override = new Set()) => {
  const id = key(cell);
  if (override.has(id)) return 'minecraft:air';
  if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(id);
};

const westDoor = [{ x: 2006, y: 166, z: -894 }, { x: 2006, y: 167, z: -894 }];
const eastDoor = [{ x: 2008, y: 166, z: -894 }, { x: 2008, y: 167, z: -894 }];
const northDoor = [{ x: 2000, y: 166, z: -906 }, { x: 2000, y: 167, z: -906 }];
const target = [...westDoor, ...eastDoor];
const sourceStates = await Promise.all(target.map(async (cell) => ({ cell, state: await stateAt(cell) })));
for (const record of sourceStates) fail(record.state.startsWith('minecraft:iron_door[')
  && record.state.includes('open=false') && record.state.includes('powered=false'), `east sequential source door drift at ${key(record.cell)}: ${record.state}`);
const targetStates = sourceStates.map(({ cell, state }) => ({ cell, state: state.replace('minecraft:iron_door', 'minecraft:spruce_door') }));
const gateOpenStates = targetStates.map(({ cell, state }) => ({ cell, state: state.replace('open=false', 'open=true') }));
for (const record of [...targetStates, ...gateOpenStates]) fail(record.state.startsWith('minecraft:spruce_door['), `failed to derive spruce target at ${key(record.cell)}`);
const halo = neighbors(target);
const haloStates = await Promise.all(halo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
const hazards = haloStates.filter(({ state }) => unsafe(state) && !state.includes('iron_door'));
fail(hazards.length === 0, `target interaction halo contains fluid/gravity/unsafe state: ${JSON.stringify(hazards)}`);

const protectedReservoirWall = box(2009, 2024, 166, 171, -896, -896);
const wallStates = await Promise.all(protectedReservoirWall.map(async (cell) => ({ cell, state: await stateAt(cell) })));
for (const record of wallStates) fail(record.state === 'minecraft:white_concrete', `reservoir wall drift at ${key(record.cell)}: ${record.state}`);
const targetKeys = new Set(target.map(key));
fail(!protectedReservoirWall.some((cell) => targetKeys.has(key(cell))), 'target overlaps retained reservoir wall');

const envelope = unique([...target, ...halo]);
const envelopeBounds = {
  minX: Math.min(...envelope.map(({ x }) => x)), maxX: Math.max(...envelope.map(({ x }) => x)),
  minY: Math.min(...envelope.map(({ y }) => y)), maxY: Math.max(...envelope.map(({ y }) => y)),
  minZ: Math.min(...envelope.map(({ z }) => z)), maxZ: Math.max(...envelope.map(({ z }) => z)),
};
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
      && position[2] >= envelopeBounds.minZ && position[2] <= envelopeBounds.maxZ) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, `target envelope has entity state: ${JSON.stringify({ blockEntities, savedEntities })}`);

const study = { minX: 1985, maxX: 2040, minY: 155, maxY: 190, minZ: -1000, maxZ: -850 };
const inside = ({ x, y, z }) => x >= study.minX && x <= study.maxX && y >= study.minY && y <= study.maxY && z >= study.minZ && z <= study.maxZ;
const staging = [2001, 2002, 2003].map((x) => ({ x, y: 165, z: -899 }));
const walkable = async (feet, override) => {
  if (!inside(feet)) return false;
  const [support, body, head] = await Promise.all([
    stateAt({ x: feet.x, y: feet.y - 1, z: feet.z }, override), stateAt(feet, override), stateAt({ x: feet.x, y: feet.y + 1, z: feet.z }, override),
  ]);
  return !isAir(support) && !unsafe(support) && isAir(body) && !unsafe(body) && isAir(head) && !unsafe(head);
};
const component = async (doorsAsAir) => {
  const override = new Set(doorsAsAir.map(key));
  const queue = staging.slice();
  const seen = new Map(queue.map((cell) => [key(cell), cell]));
  let index = 0;
  while (index < queue.length) {
    const current = queue[index++];
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const dy of [-1, 0, 1]) {
      const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
      if (!seen.has(key(next)) && await walkable(next, override)) { seen.set(key(next), next); queue.push(next); }
    }
  }
  const cells = sort([...seen.values()]);
  return {
    stationCount: cells.length,
    stationSetSha256: setHash(cells),
    bounds: { minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)), minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)), minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)) },
    reachesServiceStudyBoundary: cells.some(({ x, z }) => x === study.maxX || z === study.maxZ),
  };
};
const [closedGeometry, northOnlyGeometry, westOnlyGeometry, eastOnlyGeometry, sequentialGeometry] = await Promise.all([
  component([]), component(northDoor), component(westDoor), component(eastDoor), component(target),
]);
fail(closedGeometry.stationCount === topology.normalWalkTopology.connectedStagingComponent.cellCount,
  'source closed-component count conflicts with access topology record');
fail(!northOnlyGeometry.reachesServiceStudyBoundary && !westOnlyGeometry.reachesServiceStudyBoundary && !eastOnlyGeometry.reachesServiceStudyBoundary,
  'a strict subset unexpectedly reaches the service-study continuation');
fail(sequentialGeometry.reachesServiceStudyBoundary, 'both sequential leaves do not reach the service-study continuation');

const localRoute = [
  { id: 'staging-anchor', feet: { x: 2005, y: 165, z: -894 }, requiredGateState: 'BOTH_CLOSED' },
  { id: 'west-threshold', feet: { x: 2006, y: 166, z: -894 }, requiredGateState: 'WEST_OPEN_EAST_CLOSED' },
  { id: 'vestibule', feet: { x: 2007, y: 166, z: -894 }, requiredGateState: 'WEST_OPEN_EAST_CLOSED_OR_WEST_CLOSED_EAST_OPEN' },
  { id: 'east-threshold', feet: { x: 2008, y: 166, z: -894 }, requiredGateState: 'WEST_CLOSED_EAST_OPEN' },
  { id: 'service-anchor', feet: { x: 2009, y: 166, z: -894 }, requiredGateState: 'BOTH_CLOSED' },
];
const proposal = {
  schemaVersion: 1,
  id: 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-RESTRICTED-BOUNDARY-DESIGN-01',
  status: 'STATIC_MINIMAL_RESTRICTED_BOUNDARY_DESIGN_AWAITING_GATE_INTERACTION_AND_ROUTE_ACCEPTANCE',
  mutationAuthority: false,
  generatedAtUtc,
  source: {
    snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: sha256(captureBytes), completeSaveSha256: capture.packageIdentity?.completeSaveSha256 ?? null,
    requiredMemberCount: capture.requiredMembers.length,
    candidate: { path: relative(candidatePath), sha256: sha256(candidateBytes), identity: candidate.payloadSha256 },
    topology: { path: relative(topologyPath), sha256: sha256(topologyBytes), identity: topology.payloadSha256 },
  },
  scope: {
    purpose: 'Create a restricted sequential manual boundary between the direct-lamp staging component and the existing service-corridor component. It is not public access, egress, a utility system, or a commission.',
    owners: [
      { id: 'MP01_STAGING_CALIBRATION_OWNER', scope: 'west staging anchor, west leaf, and vestibule procedure' },
      { id: 'MP01_SERVICE_CORRIDOR_COUNTERPART_OWNER', scope: 'east leaf and service-anchor interface' },
      { id: 'MP01_RESERVOIR_SEPARATION_OWNER', scope: 'retained 96-cell reservoir wall and adjacent containment exclusion' },
      { id: 'MP01_RESTRICTED_ACCESS_RETURN_OWNER', scope: 'future full outbound/return route contract only; no origin/recovery route is accepted here' },
    ],
    target: { cellCount: target.length, coordinateSetSha256: setHash(target), sourceStateSha256: stateHash(sourceStates), targetClosedStateSha256: stateHash(targetStates), cells: sourceStates.map((source, index) => ({ cell: source.cell, sourceState: source.state, targetClosedState: targetStates[index].state, inverseState: source.state })) },
    exactInverse: { required: true, direction: 'closed spruce target -> exact closed iron source', operationCellCount: target.length, cellSetSha256: setHash(target) },
    interactionHalo: { cellCount: halo.length, coordinateSetSha256: setHash(halo), fluidGravityOrUnsafeCount: hazards.length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length },
    retainedContainment: { reservoirWall: { cellCount: protectedReservoirWall.length, coordinateSetSha256: setHash(protectedReservoirWall), sourceStateSha256: stateHash(wallStates), requiredState: 'minecraft:white_concrete', targetIntersectionCount: 0 } },
  },
  minimalityProof: {
    mode: 'counterfactual geometry only: listed closed door leaves treated as air; this is not a Minecraft interaction or gate-passability proof',
    studyBounds: study,
    closed: closedGeometry,
    northOnly: northOnlyGeometry,
    westOnly: westOnlyGeometry,
    eastOnly: eastOnlyGeometry,
    bothEastSequential: sequentialGeometry,
    conclusion: 'The 4-cell east sequential pair is the unique inclusion-minimal set of existing closed leaves that reaches the service-study continuation. The 2-cell north leaf only opens a local room; either 2-cell east leaf alone does not form a through interface.',
  },
  restrictedTwoWayTraversalDesign: {
    localOnly: true,
    publicAccessCommissioned: false,
    emergencyEgressCommissioned: false,
    fullOriginOrRecoveryRouteAccepted: false,
    localGatedStations: localRoute,
    stableSecureState: { westDoor: 'CLOSED', eastDoor: 'CLOSED', exactDoorStates: targetStates },
    outboundSequence: ['verify both leaves CLOSED', 'open west leaf by a genuine in-world interaction', 'enter the vestibule', 'close and verify west leaf', 'open east leaf by a genuine in-world interaction', 'exit to the service anchor', 'close and verify east leaf'],
    returnSequence: ['verify both leaves CLOSED', 'open east leaf by a genuine in-world interaction', 'enter the vestibule', 'close and verify east leaf', 'open west leaf by a genuine in-world interaction', 'return to the staging anchor', 'close and verify west leaf'],
    prohibitedState: { bothLeavesOpen: true, policy: 'Hard abort and reset-to-both-closed. The design grants no simultaneous-open through state.' },
    failureMode: {
      normal: 'both closed spruce leaves; dry vestibule and retained reservoir wall',
      driftOrMissingObservation: 'stop movement, do not proceed through the second leaf, restore both leaves to their exact closed spruce states, then require a fresh source comparison before another attempt',
      rollback: 'only after a settled both-closed state and fresh capture/preflight, restore the four exact original closed iron-door states',
    },
    runtimeHardGate: [
      'same-version disposable genuine-click proof of the exact spruce-door state transitions and collision/passability behavior',
      'two independently observed settled states for each leaf open/closed transition; no RCON block-state write may substitute for the click evidence',
      'a dedicated gated-path validator: the existing MP01 normal-walk validator intentionally requires air and cannot treat an open door as normal-walk evidence',
      'a future full origin-to-service and distinct recovery route contract with exact owners/interfaces and live checkpoint/entity gates',
    ],
  },
  hardStops: ['No compiler or operation files until every runtime hard gate passes.', 'No water, reservoir-wall, door-adjacent structure, or service-corridor mutation outside the four target door cells.', 'No public/service opening, egress, access-control commissioning, or direct-lamp functional claim.'],
  safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false },
  payloadSha256: null,
};
proposal.payloadSha256 = sha256(JSON.stringify(proposal));

const mapBounds = { minX: 1999, maxX: 2011, minZ: -899, maxZ: -889 };
const size = 42; const width = (mapBounds.maxX - mapBounds.minX + 1) * size + 80; const height = (mapBounds.maxZ - mapBounds.minZ + 1) * size + 180;
const cells = [];
for (let z = mapBounds.minZ; z <= mapBounds.maxZ; z += 1) for (let x = mapBounds.minX; x <= mapBounds.maxX; x += 1) {
  const cell = { x, y: 166, z }; const state = await stateAt(cell); const px = 40 + (x - mapBounds.minX) * size; const py = 70 + (z - mapBounds.minZ) * size;
  const color = isAir(state) ? '#101827' : state.includes('iron_door') ? '#f97316' : state.includes('water') ? '#0ea5e9' : state.includes('white_concrete') ? '#e5e7eb' : '#64748b';
  cells.push(`<rect x="${px}" y="${py}" width="${size}" height="${size}" fill="${color}" stroke="#1e293b"><title>${key(cell)} — ${state}</title></rect>`);
  if (targetKeys.has(key(cell))) cells.push(`<rect x="${px + 4}" y="${py + 4}" width="${size - 8}" height="${size - 8}" fill="none" stroke="#fbbf24" stroke-width="3"/>`);
  if (x === 2005 && z === -894) cells.push(`<text x="${px + 5}" y="${py + 25}" class="cell">STAGE</text>`);
  if (x === 2007 && z === -894) cells.push(`<text x="${px + 3}" y="${py + 25}" class="cell">VEST</text>`);
  if (x === 2009 && z === -894) cells.push(`<text x="${px + 2}" y="${py + 25}" class="cell">SVC</text>`);
}
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:22px;font-weight:800}.note{font-size:13px;fill:#cbd5e1}.cell{font-size:9px;font-weight:800}</style><rect width="100%" height="100%" fill="#0b1020"/><text x="40" y="30" class="title">MP01 restricted east sequential boundary — design-only</text>${cells.join('')}<path d="M ${40 + (2005-mapBounds.minX)*size + 20} ${70 + (-894-mapBounds.minZ)*size + 20} H ${40 + (2009-mapBounds.minX)*size + 20}" stroke="#22c55e" stroke-width="3" stroke-dasharray="7 5"/><text x="40" y="${height - 62}" class="note">amber: four static target door cells; green dashed: local gated traversal only, not normal-walk or access acceptance</text><text x="40" y="${height - 36}" class="note">the two leaves must never be open together; water/reservoir containment stays outside target scope</text></svg>`;

for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(proposal, null, 2)}\n`);
fs.writeFileSync(absolute(map), mapSvg);
const md = `# MP01 direct-lamp east sequential restricted-boundary design 01\n\n`
  + `**Status:** \`${proposal.status}\` — design only; no operation, release, interaction, movement, or route authority.\n\n`
  + `![Boundary topology](${path.basename(map)})\n\n`
  + `## Minimal exact static change\n\n`
  + `The selected set is the two existing east sequential door leaves: four cells at \`(2006,166..167,-894)\` and \`(2008,166..167,-894)\`. The static design changes only their closed iron-door states to closed spruce-door states, with all properties preserved; the exact inverse restores the four current iron-door states. The immediate halo is dry, gravity-free, and entity-free. The retained 96-cell reservoir wall remains unchanged.\n\n`
  + `Counterfactual source geometry confirms why this is the minimum restricted boundary set: the north leaf opens only a local room, either east leaf alone remains a dead end, while both east leaves are required to reach the existing service-component continuation. This proves geometry only; it does not prove a click, an open-door collision model, an external route, or a public/service opening.\n\n`
  + `## Two-way restricted procedure\n\n`
  + `The stable state is both spruce leaves closed. A future genuinely interacted outbound/return procedure opens one leaf, crosses one threshold, closes and verifies it, then opens the other leaf; both leaves are never open at the same time. Any drift, failed observation, or missing proof stops movement and restores both closed leaves. Only after a settled closed state may the exact static inverse be considered.\n\n`
  + `The current MP01 normal-walk validator intentionally requires air and cannot treat open doors as normal-walk proof. A separately tested gated-path validator, full owner-bound origin/recovery survey, and same-version genuine-click evidence are hard gates before any compiler.\n`;
fs.writeFileSync(absolute(markdown), md);
process.stdout.write(`${JSON.stringify({ status: proposal.status, targetCellCount: target.length, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: proposal.payloadSha256 }, null, 2)}\n`);
