#!/usr/bin/env node
/**
 * Read-only, source-bound readiness contract for the isolated MP01 direct
 * lever/lamp calibration pair.  It deliberately records missing runtime and
 * access evidence; it never writes Minecraft operations or grants execution
 * authority.
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
  if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable save> --candidate <json> --topology <json> --boundary <json> --out <json> --markdown <md> --map <svg>`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 isolated direct-lamp readiness contract rejected: ${message}`);
};
const key = ({ x, y, z }) => `${x},${y},${z}`;
const sort = (cells) => cells.slice().sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
const setHash = (cells) => sha256(`${sort(cells).map(key).join('\n')}\n`);
const unique = (cells) => [...new Map(cells.map((cell) => [key(cell), cell])).values()];
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:scaffolding',
  'minecraft:pointed_dripstone',
]);
const isAir = (state) => AIR.has(stateName(state));
const hazard = (state) => state.includes('water') || state.includes('lava') || stateName(state) === 'minecraft:bubble_column'
  || GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const neighbors = (cells) => {
  const targets = new Set(cells.map(key));
  return unique(cells.flatMap(({ x, y, z }) => [
    { x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z },
    { x, y: y + 1, z }, { x, y, z: z - 1 }, { x, y, z: z + 1 },
  ]).filter((cell) => !targets.has(key(cell))));
};
const boundsOf = (cells) => ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});

const snapshot = required('--snapshot');
const candidatePath = required('--candidate');
const topologyPath = required('--topology');
const boundaryPath = required('--boundary');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(snapshot);
const regionDir = path.join(snapshotRoot, 'region');
const entitiesDir = path.join(snapshotRoot, 'entities');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(regionDir) && fs.existsSync(entitiesDir) && fs.existsSync(capturePath), 'snapshot lacks region/, entities/, or complete-save capture');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'source capture is not immutable');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130, 'source is not a complete 130-member capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(filename), `captured member missing: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}

const candidateBytes = fs.readFileSync(absolute(candidatePath));
const topologyBytes = fs.readFileSync(absolute(topologyPath));
const boundaryBytes = fs.readFileSync(absolute(boundaryPath));
const candidate = JSON.parse(candidateBytes);
const topology = JSON.parse(topologyBytes);
const boundary = JSON.parse(boundaryBytes);
const captureSha = sha256(captureBytes);
fail(candidate.id === 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01', 'candidate identity mismatch');
fail(candidate.status === 'STATIC_CANDIDATE_PASS_PENDING_RUNTIME_INTERACTION_AND_ACCESS_CONTRACT', 'candidate is not the pending static candidate');
fail(topology.id === 'MP01-DIRECT-LAMP-ACCESS-RETURN-TOPOLOGY-01', 'topology identity mismatch');
fail(boundary.id === 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-RESTRICTED-BOUNDARY-DESIGN-01', 'boundary identity mismatch');
for (const record of [candidate, topology, boundary]) {
  fail(record.source?.snapshot === relative(snapshot), `${record.id} source snapshot drift`);
  fail(record.source?.captureManifestSha256 === captureSha, `${record.id} capture-manifest drift`);
}
fail(boundary.source?.candidate?.sha256 === sha256(candidateBytes), 'boundary is not bound to this exact candidate');
fail(boundary.source?.topology?.sha256 === sha256(topologyBytes), 'boundary is not bound to this exact topology');

const lever = { x: 1998, y: 165, z: -902 };
const lamp = { x: 1999, y: 165, z: -902 };
const target = [lever, lamp];
const supports = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = target.flatMap(({ x, y, z }) => [{ x, y: y + 1, z }, { x, y: y + 2, z }]);
const halo = neighbors([...target, ...supports, ...headroom]);
const envelope = unique([...target, ...supports, ...headroom, ...halo]);
fail(envelope.length === 36, `exact candidate envelope drift: expected 36 cells, got ${envelope.length}`);
const reader = new AnvilReader(regionDir);
const entityReader = new AnvilReader(entitiesDir);
const read = async (cell) => ({ ...cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const [targetStates, supportStates, headroomStates, haloStates] = await Promise.all([
  Promise.all(target.map(read)), Promise.all(supports.map(read)), Promise.all(headroom.map(read)), Promise.all(halo.map(read)),
]);
for (const record of targetStates) fail(isAir(record.state), `candidate target drift at ${key(record)}: ${record.state}`);
for (const record of supportStates) fail(record.state === 'minecraft:polished_andesite', `support drift at ${key(record)}: ${record.state}`);
for (const record of headroomStates) fail(isAir(record.state), `headroom drift at ${key(record)}: ${record.state}`);
const hazards = haloStates.filter(({ state }) => hazard(state));
fail(hazards.length === 0, `halo fluid/gravity drift: ${JSON.stringify(hazards)}`);
const envelopeKeys = new Set(envelope.map(key));
const envelopeBounds = boundsOf(envelope);
const blockEntities = [];
const savedEntities = [];
for (const chunkId of new Set(envelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [chunkX, chunkZ] = chunkId.split(',').map(Number);
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
fail(blockEntities.length === 0 && savedEntities.length === 0, `candidate has block/saved entities: ${JSON.stringify({ blockEntities, savedEntities })}`);

const contract = {
  schemaVersion: 1,
  id: 'MP01-ISOLATED-DIRECT-LAMP-READINESS-INTERACTION-CONTRACT-01',
  status: 'HOLD_RUNTIME_PROOF_AND_OWNER_BOUND_ACCESS_RETURN',
  generatedAtUtc,
  mutationAuthority: false,
  source: {
    snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: captureSha, completeSaveSha256: capture.packageIdentity?.completeSaveSha256 ?? null,
    requiredMemberCount: capture.requiredMembers.length,
    candidate: { path: relative(candidatePath), sha256: sha256(candidateBytes), identity: candidate.payloadSha256 },
    topology: { path: relative(topologyPath), sha256: sha256(topologyBytes), identity: topology.payloadSha256 },
    boundary: { path: relative(boundaryPath), sha256: sha256(boundaryBytes), identity: boundary.payloadSha256 },
  },
  candidate: {
    functionalRole: 'isolated manual direct-lamp diagnostic calibration only',
    cells: [
      { role: 'lever', cell: lever, sourceState: targetStates[0].state, prospectiveState: 'RUNTIME_PROOF_REQUIRED__WALL_MOUNTED_LEVER_EXACT_STATE_UNKNOWN' },
      { role: 'lamp', cell: lamp, sourceState: targetStates[1].state, prospectiveState: 'RUNTIME_PROOF_REQUIRED__DIRECT_LAMP_EXACT_OFF_ON_STATES_UNKNOWN' },
    ],
    support: { cells: supportStates, requiredState: 'minecraft:polished_andesite', coordinateSetSha256: setHash(supports) },
    headroom: { cells: headroomStates, requiredState: 'minecraft:air', coordinateSetSha256: setHash(headroom) },
    envelope: { cellCount: envelope.length, coordinateSetSha256: setHash(envelope), bounds: envelopeBounds, fluidOrGravityHazardCount: hazards.length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length },
    targetAndInverse: {
      ready: false,
      reason: 'Exact wall-mounted lever orientation, canonical OFF/ON lamp states, and their exact inverse may not be inferred from an air source or a state-write surrogate. They require a same-version genuine-click proof first.',
      operationsEmitted: 0,
    },
  },
  interactionProofRequired: {
    status: 'MISSING',
    fixtureScope: 'separate disposable same-version fixture only; it must not contain or modify the production candidate cells',
    identity: ['exact server game version', 'exact server implementation/build identity', 'fixture topology and canonical block-state hash', 'actor identity and interaction API identity'],
    sequence: [
      { phase: 'OFF_1', required: 'settled observation of lever OFF and lamp unlit' },
      { phase: 'OFF_2', required: 'independent later settled observation of the same exact OFF states' },
      { phase: 'CLICK_ON', required: 'genuine player or Mineflayer activateBlock click; no RCON /setblock, /fill, state write, or scripted toggle substitute' },
      { phase: 'ON_1', required: 'settled observation of lever ON and directly adjacent lamp lit' },
      { phase: 'ON_2', required: 'independent later settled observation of the same exact ON states' },
      { phase: 'CLICK_OFF', required: 'second genuine click with the same runtime identity' },
      { phase: 'OFF_RESET_1', required: 'settled observation of original exact OFF states' },
      { phase: 'OFF_RESET_2', required: 'independent later settled observation of original exact OFF states' },
    ],
    acceptanceRules: [
      'All eight observations/interactions must bind one immutable fixture capture lineage and occur against the same runtime build.',
      'The lamp must be directly adjacent to the lever without wire, repeater, comparator, piston, sticky piston, or redstone block.',
      'Every observation must enumerate the exact lever and lamp canonical states after normal settlement ticks.',
      'A structurally valid trace is still not production proof until independently reviewed against its immutable runtime capture.',
    ],
  },
  accessAndReturnRequired: {
    status: 'MISSING',
    candidateStagingFeet: candidate.interactionGeometryOnly?.existingAllowedStagingFeet ?? [],
    currentTopology: {
      localComponentOnly: true,
      outboundRouteAccepted: false,
      recoveryRouteAccepted: false,
      closedExitCount: 3,
      blockedInterfaces: ['north iron door at (2000,166..167,-906)', 'west east-boundary leaf at (2006,166..167,-894)', 'east east-boundary leaf at (2008,166..167,-894)'],
    },
    ownerContractMustBind: [
      'a permitted outbound origin and a distinct recovery anchor',
      'every normal-walk station, transition, ownership handoff, and checkpoint from origin to staging and from staging to recovery',
      'the restricted east sequential boundary, if separately built and independently validated, including one-leaf-at-a-time outbound and reverse return procedure',
      'failure stop, recovery, and re-close behavior; both boundary leaves open is a hard abort, not a valid path state',
      'fresh actor/entity clearance and an authorized movement scope immediately before any supervised interaction',
    ],
    nonSubstitutes: ['geometric distance', 'a marker without a traversable route', 'treating closed or merely open doors as air', 'ownership prose without per-station route evidence'],
  },
  exclusions: {
    reactiveBlocks: ['minecraft:redstone_wire', 'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:redstone_block'],
    protectedOrOutOfScope: ['historic seven-cell control at x=2001..2004,y=165..166,z=-902', 'all doors and the four-cell boundary package', 'reservoir water and retained 96-cell wall', 'routes, access control, utility, life safety, egress, public/service opening'],
    invariant: 'The two target cells and only their necessary supports/headroom may ever be considered by a future dedicated compiler after all gates pass.',
  },
  remainingPrerequisites: [
    'independent same-version genuine-click OFF/ON/OFF runtime proof matching interactionProofRequired',
    'accepted owner-bound bidirectional normal-walk access/return and recovery contract',
    'if required for access, separately accepted and independently interaction-validated restricted boundary package; it is not included here',
    'fresh immediate immutable complete-save rebind of all source-bound artifacts',
    'dedicated compiler with complete canonical source/target states and exact forward/rollback inverse after runtime proof',
    'fresh live entity clearance, protected-core/container recheck, strict-noop forward and rollback parser checks, and exact source preflight',
    'journaled guarded execution only under separately authorized scope, fresh immutable post capture, rollback-poststate preflight, and independent functional QA',
  ],
  safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false },
  nonClaims: ['production runtime proof', 'access or return acceptance', 'target/inverse operation readiness', 'execution authorization', 'active access control', 'door operation', 'utility, life-safety, egress, public/service opening, or MP01 completion'],
  payloadSha256: null,
};
contract.payloadSha256 = sha256(JSON.stringify(contract));

const cellSize = 100;
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="570" viewBox="0 0 900 570">
<style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:25px;font-weight:800}.label{font-size:17px;font-weight:700}.note{font-size:14px;fill:#cbd5e1}.tiny{font-size:12px;fill:#cbd5e1}</style>
<rect width="100%" height="100%" fill="#0b1020"/><text x="42" y="38" class="title">MP01 isolated direct-lamp readiness — exact two-cell candidate</text>
<text x="42" y="70" class="note">Source-bound static contract only · runtime/access gates remain closed · no operation authority</text>
<rect x="150" y="160" width="${cellSize}" height="${cellSize}" fill="#111827" stroke="#f59e0b" stroke-width="4"/><text x="172" y="205" class="label">LEVER</text><text x="159" y="232" class="tiny">(1998,165,-902)</text><text x="177" y="250" class="tiny">source: air</text>
<rect x="250" y="160" width="${cellSize}" height="${cellSize}" fill="#111827" stroke="#22c55e" stroke-width="4"/><text x="275" y="205" class="label">LAMP</text><text x="259" y="232" class="tiny">(1999,165,-902)</text><text x="277" y="250" class="tiny">source: air</text>
<rect x="150" y="260" width="${cellSize}" height="36" fill="#94a3b8"/><rect x="250" y="260" width="${cellSize}" height="36" fill="#94a3b8"/><text x="150" y="322" class="note">retained polished-andesite supports at y=164</text>
<path d="M350 210 H480" stroke="#64748b" stroke-width="3" stroke-dasharray="8 6"/><text x="500" y="194" class="label" fill="#fb7185">HOLD</text><text x="500" y="218" class="note">same-version genuine click proof</text><text x="500" y="240" class="tiny">OFF ×2 → click → ON ×2 → click → OFF ×2</text>
<path d="M350 272 H480" stroke="#64748b" stroke-width="3" stroke-dasharray="8 6"/><text x="500" y="287" class="note">owner-bound outbound + independent return</text><text x="500" y="309" class="tiny">closed three-exit topology; no route accepted</text>
<rect x="42" y="374" width="816" height="145" rx="8" fill="#111827" stroke="#334155"/><text x="64" y="407" class="label">Exact source checks that pass</text><text x="64" y="432" class="note">2 air targets · 2 polished-andesite supports · 4 air headroom cells · 36-cell dry/gravity-free envelope · 0 block entities · 0 saved entities</text><text x="64" y="461" class="note">Excluded: historic reactive line, all doors/boundary, reservoir water/wall, route/access/utility/life-safety scopes.</text><text x="64" y="491" class="note">Canonical target and inverse intentionally unresolved until genuine same-version runtime evidence exists.</text>
</svg>`;
const md = `# MP01 isolated direct-lamp readiness / interaction contract 01\n\n`
  + `**Status:** \`${contract.status}\` — read-only source-bound contract; no operation, interaction, movement, route, or release authority.\n\n`
  + `![Exact two-cell readiness map](${path.basename(map)})\n\n`
  + `## Exact static candidate\n\n`
  + `The proposed isolated diagnostic pair remains two air cells: lever \`(1998,165,-902)\` and directly adjacent lamp \`(1999,165,-902)\`. The exact source checks retain two polished-andesite supports, four clear headroom cells, and a 36-cell dry/gravity-free, block-entity-free, saved-entity-free envelope. The historic failed seven-cell reactive component, all doors, the boundary package, reservoir fabric, routes, and life-safety/public scopes are excluded.\n\n`
  + `## Functional gates still missing\n\n`
  + `No same-version genuine-click evidence exists in this contract. A disposable, same-build fixture must record OFF twice, a real player/Mineflayer click, ON twice, a real reset click, and the original OFF state twice. It must enumerate exact canonical lever and lamp states after settlement and may not use RCON state writes, \`/setblock\`, \`/fill\`, or scripted toggles as a surrogate. Even a structurally valid trace requires independent review of its immutable capture.\n\n`
  + `No owner-bound outbound or recovery route exists either. The current staging component has three closed exits; a geometric staging line is not interaction or movement proof. Any future access contract must bind every normal-walk station and owner handoff from a permitted origin to staging, plus a distinct recovery route. The separately designed two-leaf boundary is not part of this scope and remains subject to its own source, click, and gated-path acceptance.\n\n`
  + `## Deliberate non-release\n\n`
  + `Because the required runtime states are not proven, this artifact does not invent target states or a rollback inverse, compile operations, or authorize execution. A future dedicated compiler remains gated by the listed runtime/access evidence and the fresh guarded release kernel.\n`;
for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(absolute(markdown), md);
fs.writeFileSync(absolute(map), mapSvg);
process.stdout.write(`${JSON.stringify({ status: contract.status, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: contract.payloadSha256 }, null, 2)}\n`);
