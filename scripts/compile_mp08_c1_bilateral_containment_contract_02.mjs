#!/usr/bin/env node
/**
 * MP08 C1 bilateral containment/interface contract 02.
 *
 * A read-only source-bound design compiler.  It deliberately emits neither
 * operations nor a release manifest: each Cavern owner must separately accept
 * the exact shared door/receiver cells before an operation compiler can exist.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot');
const OUT = option('--out', 'data/world-review/mp08-c1-bilateral-containment-contract-02');
const ACCEPTANCE = option('--validate-acceptance');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
if (!SNAPSHOT) throw new Error('Usage: compile_mp08_c1_bilateral_containment_contract_02.mjs --snapshot <complete immutable snapshot> [--out <directory>] [--validate-acceptance <json>]');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const volume = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (const x of range(minX, maxX)) for (const y of range(minY, maxY)) for (const z of range(minZ, maxZ)) cells.push({ x, y, z });
  return cells;
};
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isHazard = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true') || GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder') || FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const describeSet = (cells) => ({ cellCount: uniqueCells(cells).length, bounds: boundsOf(cells), coordinateSetSha256: hashCells(cells) });
const keySet = (cells) => new Set(cells.map(cellKey));
const assertDisjoint = (leftName, left, rightName, right) => {
  const collision = left.find((cell) => keySet(right).has(cellKey(cell)));
  if (collision) throw new Error(`Contract ownership collision: ${leftName} and ${rightName} both include ${cellKey(collision)}`);
};

const capturePath = absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
if (!fs.existsSync(capturePath)) throw new Error(`Missing complete immutable capture manifest: ${capturePath}`);
const captureRaw = fs.readFileSync(capturePath, 'utf8');
const capture = JSON.parse(captureRaw);
if (!capture.immutableCopy || !Array.isArray(capture.requiredMembers)) throw new Error('Snapshot is not a complete immutable copy');
const memberPlanes = new Set(capture.requiredMembers.map(({ path: member }) => member.split('/', 1)[0]));
for (const plane of ['region', 'entities', 'poi']) if (!memberPlanes.has(plane)) throw new Error(`Snapshot is missing ${plane} plane`);
if (!capture.requiredMembers.some(({ path: member }) => member === 'level.dat')) throw new Error('Snapshot is missing level.dat');

const profile = range(15, 70).map((z) => ({ z, floorY: z <= 26 ? -12 : z <= 54 ? -11 : -10 }));
const retainedRoute = profile.flatMap(({ z, floorY }) => volume(-1, 1, floorY, floorY + 2, z, z));
const clearRoute = profile.flatMap(({ z, floorY }) => volume(-1, 1, floorY + 1, floorY + 2, z, z));
const coreEnvelope = profile.flatMap(({ z, floorY }) => [
  ...volume(-2, -2, floorY, floorY + 3, z, z),
  ...volume(2, 2, floorY, floorY + 3, z, z),
  ...volume(-1, 1, floorY + 3, floorY + 3, z, z),
]);
const coreDrainageLiner = profile.flatMap(({ z, floorY }) => volume(-1, 1, floorY - 1, floorY - 1, z, z));
const vestibule = (id, fromZ, toZ, floorY, doorZ, receiverZ, facing) => {
  const floor = volume(-2, 2, floorY, floorY, fromZ, toZ);
  const walls = [
    ...volume(-2, -2, floorY + 1, floorY + 3, fromZ, toZ),
    ...volume(2, 2, floorY + 1, floorY + 3, fromZ, toZ),
    ...volume(-1, 1, floorY + 3, floorY + 3, fromZ, toZ),
  ];
  const doors = range(-1, 1).flatMap((x) => [
    { x, y: floorY + 1, z: doorZ, desiredState: `minecraft:iron_door[facing=${facing},half=lower,hinge=${x === -1 ? 'left' : 'right'},open=false,powered=false,waterlogged=false]` },
    { x, y: floorY + 2, z: doorZ, desiredState: `minecraft:iron_door[facing=${facing},half=upper,hinge=${x === -1 ? 'left' : 'right'},open=false,powered=false,waterlogged=false]` },
  ]);
  const doorCells = doors.map(({ x, y, z }) => ({ x, y, z }));
  const c1Structure = uniqueCells([...floor, ...walls].filter((cell) => !keySet(doorCells).has(cellKey(cell))));
  const drainage = volume(-1, 1, floorY - 1, floorY - 1, fromZ, toZ);
  const receiver = volume(-1, 1, floorY + 1, floorY + 2, receiverZ, receiverZ);
  const clearCentre = volume(-1, 1, floorY + 1, floorY + 2, fromZ, toZ).filter((cell) => !keySet(doorCells).has(cellKey(cell)));
  return { id, floorY, fromZ, toZ, doorZ, receiverZ, facing, c1Structure, doors, doorCells, drainage, receiver, clearCentre };
};
const cavernA = vestibule('CAVERN_A', 11, 14, -12, 11, 10, 'north');
const cavernB = vestibule('CAVERN_B', 71, 74, -10, 74, 75, 'south');
const c1OwnerCells = uniqueCells([...coreEnvelope, ...coreDrainageLiner, ...cavernA.c1Structure, ...cavernA.drainage, ...cavernB.c1Structure, ...cavernB.drainage]);
const cavernAOwnerCells = uniqueCells([...cavernA.doorCells, ...cavernA.receiver]);
const cavernBOwnerCells = uniqueCells([...cavernB.doorCells, ...cavernB.receiver]);
assertDisjoint('C1', c1OwnerCells, 'Cavern A', cavernAOwnerCells);
assertDisjoint('C1', c1OwnerCells, 'Cavern B', cavernBOwnerCells);
assertDisjoint('Cavern A', cavernAOwnerCells, 'Cavern B', cavernBOwnerCells);
const sourceEnvelope = uniqueCells([...retainedRoute, ...c1OwnerCells, ...cavernAOwnerCells, ...cavernBOwnerCells]);

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const sourceState = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const retainedStates = await Promise.all(retainedRoute.map(async (cell) => ({ cell, state: await sourceState(cell) })));
const retainedHazards = retainedStates.filter(({ state }) => isHazard(state));
const retainedClearFailures = retainedStates.filter(({ cell, state }) => cell.y > profile.find(({ z }) => z === cell.z).floorY && !isAir(state));
const sourceStates = await Promise.all(sourceEnvelope.map(async (cell) => ({ cell, state: await sourceState(cell) })));
const sourceStateSha256 = sha256(`${sourceStates.sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const chunks = new Set(sourceEnvelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const sourceKeys = keySet(sourceEnvelope);
const blockEntities = [];
for (const chunkKey of chunks) {
  const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (sourceKeys.has(cellKey(cell))) blockEntities.push({ cell, id: entity.id ?? entity.Id ?? null });
  }
}

const interfaceRecord = (vestibuleRecord) => ({
  id: `MP08-C1-${vestibuleRecord.id}-BILATERAL-INTERFACE-02`,
  cavern: vestibuleRecord.id === 'CAVERN_A' ? 'Cavern A' : 'Cavern B',
  c1Vestibule: {
    floorY: vestibuleRecord.floorY,
    zRange: [vestibuleRecord.fromZ, vestibuleRecord.toZ],
    c1OwnerStructure: describeSet(vestibuleRecord.c1Structure),
    requiredDesiredState: 'minecraft:polished_deepslate',
    clearCentre: describeSet(vestibuleRecord.clearCentre),
    underfloorIsolationLiner: { ...describeSet(vestibuleRecord.drainage), requiredDesiredState: 'minecraft:polished_deepslate', policy: 'SEALED_NO_DISCHARGE_NO_FLUID_NO_OUTFALL' },
  },
  reciprocalCavernOwner: {
    requiredDoorLeaves: vestibuleRecord.doors,
    doorCells: describeSet(vestibuleRecord.doorCells),
    exteriorReceiver: { ...describeSet(vestibuleRecord.receiver), requiredState: 'two-block-clear 3-wide normal-walk anchor', direction: vestibuleRecord.id === 'CAVERN_A' ? 'toward decreasing z' : 'toward increasing z' },
    requiredDeclarations: ['ownerId', 'exact target/retained/rollback source states', 'door-only manual operation; no actuator, redstone, block entity, NBT, waterlogging, or public opening', 'bidirectional normal-walk path to a separately owned cavern return anchor', 'sealed/no-discharge receiver acceptance'],
  },
  bilateralAcceptanceRule: 'C1 and the named cavern owner must sign the same source-bound contract identity. A unilateral C1 construction or a unilateral door placement is rejected.',
});
const contract = {
  schemaVersion: 2,
  id: 'MP08-C1-BILATERAL-CONTAINMENT-INTERFACE-CONTRACT-02',
  generatedAtUtc: GENERATED_AT,
  status: 'STATIC_SOURCE_BOUND_NONAUTHORIZING_OWNER_INTERFACE_CONTRACT',
  mutationAuthority: false,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false },
  source: {
    snapshot: relative(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: capture.immutableCopy,
    requiredMemberCount: capture.requiredMembers.length, captureManifestSha256: sha256(captureRaw), sourceEnvelope: describeSet(sourceEnvelope), sourceStateSha256,
  },
  core: {
    ownerRole: 'C1_OWNER_UNASSIGNED',
    retainedWalkRoute: { ...describeSet(retainedRoute), profile: profile.map(({ z, floorY }) => ({ z, floorY, clearY: [floorY + 1, floorY + 2] })), normalWalkRequirement: '3-wide × 2-clear at every station in both directions; the stair transitions at z=26→27 and z=54→55 are retained.' },
    enclosure: { ...describeSet(coreEnvelope), requiredDesiredState: 'minecraft:polished_deepslate', components: { sideWalls: 'x=-2 and x=2; y=floor..floor+3', roof: 'x=-1..1; y=floor+3' }, noCeilingGaps: true },
    underfloorIsolationLiner: { ...describeSet(coreDrainageLiner), requiredDesiredState: 'minecraft:polished_deepslate', policy: 'SEALED_NO_DISCHARGE_NO_FLUID_NO_OUTFALL' },
    ownerRequiredCells: describeSet(c1OwnerCells),
  },
  interfaces: [interfaceRecord(cavernA), interfaceRecord(cavernB)],
  sourceScreen: { retainedRouteHazardCount: retainedHazards.length, retainedClearFailureCount: retainedClearFailures.length, sourceEnvelopeBlockEntityCount: blockEntities.length, sourceEnvelopeBlockEntities: blockEntities },
  acceptanceTemplate: {
    schemaVersion: 1,
    id: 'MP08-C1-BILATERAL-CONTAINMENT-ACCEPTANCE-02',
    contractIdentitySha256: 'COPY_FROM_CONTRACT_IDENTITY',
    source: { snapshot: relative(SNAPSHOT), captureManifestSha256: sha256(captureRaw), sourceStateSha256 },
    owners: { c1: 'ASSIGNED_C1_OWNER_ID', cavernA: 'ASSIGNED_CAVERN_A_OWNER_ID', cavernB: 'ASSIGNED_CAVERN_B_OWNER_ID' },
    ownedCoordinateSets: { c1: describeSet(c1OwnerCells), cavernA: describeSet(cavernAOwnerCells), cavernB: describeSet(cavernBOwnerCells) },
    interfaces: [
      { id: 'MP08-C1-CAVERN_A-BILATERAL-INTERFACE-02', doorCoordinateSetSha256: hashCells(cavernA.doorCells), receiverCoordinateSetSha256: hashCells(cavernA.receiver), noDischarge: true, bidirectionalNormalWalkAccepted: false, outerReturnAnchor: 'ASSIGN_EXACT_CAVERN_A_RETURN_ANCHOR' },
      { id: 'MP08-C1-CAVERN_B-BILATERAL-INTERFACE-02', doorCoordinateSetSha256: hashCells(cavernB.doorCells), receiverCoordinateSetSha256: hashCells(cavernB.receiver), noDischarge: true, bidirectionalNormalWalkAccepted: false, outerReturnAnchor: 'ASSIGN_EXACT_CAVERN_B_RETURN_ANCHOR' },
    ],
  },
  compilerGate: [
    'Fresh complete immutable snapshot immediately before mutation.',
    'C1, Cavern A, and Cavern B owner IDs assigned and all exact coordinate-set hashes accepted.',
    'Each named interface records exact target, retained, and rollback states on that fresh source.',
    'Both cavern interfaces accept the closed, manual, unpowered, no-NBT door state and their exact outer return anchor.',
    'Both underfloor liner/receiver decisions remain sealed and no-discharge; no fluid system, outfall, or water displacement is implied.',
    'Independent two-way normal-walk proof and the complete guarded release kernel pass.',
  ],
  nonClaims: ['No physical release is authorized.', 'C1 is not public, emergency, egress, accessibility, transport, C2, Cavern C, RR-N6, or T4 work.', 'This contract does not confer ownership, select an owner, or accept the historical open thresholds.'],
};
contract.identitySha256 = sha256(`${JSON.stringify(contract, null, 2)}\n`);

const validateAcceptance = (acceptance) => {
  const errors = [];
  if (acceptance?.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
  if (acceptance?.id !== 'MP08-C1-BILATERAL-CONTAINMENT-ACCEPTANCE-02') errors.push('wrong acceptance id');
  if (acceptance?.contractIdentitySha256 !== contract.identitySha256) errors.push('contract identity mismatch');
  for (const field of ['snapshot', 'captureManifestSha256', 'sourceStateSha256']) if (acceptance?.source?.[field] !== contract.source[field]) errors.push(`source.${field} mismatch`);
  const owners = acceptance?.owners ?? {};
  for (const role of ['c1', 'cavernA', 'cavernB']) if (typeof owners[role] !== 'string' || !owners[role].trim() || owners[role].startsWith('ASSIGNED_')) errors.push(`owners.${role} is not assigned`);
  if (new Set(['c1', 'cavernA', 'cavernB'].map((role) => owners[role])).size !== 3) errors.push('three distinct owner IDs are required');
  const expectedOwned = { c1: contract.core.ownerRequiredCells.coordinateSetSha256, cavernA: describeSet(cavernAOwnerCells).coordinateSetSha256, cavernB: describeSet(cavernBOwnerCells).coordinateSetSha256 };
  for (const [role, expected] of Object.entries(expectedOwned)) if (acceptance?.ownedCoordinateSets?.[role]?.coordinateSetSha256 !== expected) errors.push(`ownedCoordinateSets.${role} mismatch`);
  for (const interfaceContract of contract.interfaces) {
    const accepted = acceptance?.interfaces?.find(({ id }) => id === interfaceContract.id);
    if (!accepted) { errors.push(`missing ${interfaceContract.id}`); continue; }
    if (accepted.doorCoordinateSetSha256 !== interfaceContract.reciprocalCavernOwner.doorCells.coordinateSetSha256) errors.push(`${interfaceContract.id} door hash mismatch`);
    if (accepted.receiverCoordinateSetSha256 !== interfaceContract.reciprocalCavernOwner.exteriorReceiver.coordinateSetSha256) errors.push(`${interfaceContract.id} receiver hash mismatch`);
    if (accepted.noDischarge !== true) errors.push(`${interfaceContract.id} must be sealed/no-discharge`);
    if (accepted.bidirectionalNormalWalkAccepted !== true) errors.push(`${interfaceContract.id} lacks bidirectional normal-walk acceptance`);
    if (typeof accepted.outerReturnAnchor !== 'string' || !accepted.outerReturnAnchor.trim() || accepted.outerReturnAnchor.startsWith('ASSIGN_')) errors.push(`${interfaceContract.id} lacks an exact outer return anchor`);
  }
  return { status: errors.length ? 'REJECTED_INCOMPLETE_OR_DRIFTED_BILATERAL_ACCEPTANCE' : 'ACCEPTED_STATIC_CONTRACT_AWAITING_FRESH_RELEASE_KERNEL', errors };
};
const outputDir = absolute(OUT);
fs.mkdirSync(outputDir, { recursive: true });
const acceptanceResult = ACCEPTANCE ? validateAcceptance(JSON.parse(fs.readFileSync(absolute(ACCEPTANCE), 'utf8'))) : null;
const planSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="610" viewBox="0 0 1280 610" role="img" aria-labelledby="title desc"><title id="title">MP08 C1 bilateral containment and cavern interface setout</title><desc id="desc">Exact plan and longitudinal ownership diagram for C1 roof, walls, sealed liner, bilateral vestibules and manual door leaves.</desc><rect width="1280" height="610" fill="#0f172a"/><text x="50" y="40" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="24">MP08 C1 bilateral containment / interface contract 02</text><text x="50" y="67" fill="#cbd5e1" font-family="sans-serif" font-size="14">Static source-bound setout — no release authority — source ${relative(SNAPSHOT)}</text><text x="52" y="116" fill="#e2e8f0" font-family="sans-serif" font-size="17">Plan (z direction)</text><rect x="92" y="140" width="1060" height="76" rx="5" fill="#164e63" stroke="#38bdf8" stroke-width="2"/><rect x="142" y="154" width="960" height="48" fill="#14532d" stroke="#4ade80"/><rect x="92" y="154" width="50" height="48" fill="#7c2d12"/><rect x="1102" y="154" width="50" height="48" fill="#7c2d12"/><line x1="92" y1="154" x2="92" y2="202" stroke="#facc15" stroke-width="6"/><line x1="1152" y1="154" x2="1152" y2="202" stroke="#facc15" stroke-width="6"/><text x="95" y="244" fill="#fb923c" font-family="sans-serif" font-size="13">A vestibule z 11–14</text><text x="488" y="244" fill="#86efac" font-family="sans-serif" font-size="13">C1 retained clear 3-wide z 15–70</text><text x="975" y="244" fill="#fb923c" font-family="sans-serif" font-size="13">B vestibule z 71–74</text><text x="58" y="285" fill="#e2e8f0" font-family="sans-serif" font-size="17">Cross section (each C1 station)</text><rect x="250" y="318" width="250" height="136" fill="#164e63" stroke="#38bdf8" stroke-width="3"/><rect x="300" y="363" width="150" height="91" fill="#14532d"/><rect x="250" y="454" width="250" height="28" fill="#64748b"/><rect x="300" y="482" width="150" height="25" fill="#7c2d12"/><text x="264" y="348" fill="#bae6fd" font-family="sans-serif" font-size="13">roof: polished deepslate</text><text x="315" y="405" fill="#bbf7d0" font-family="sans-serif" font-size="14">3-wide × 2-clear</text><text x="264" y="474" fill="#e2e8f0" font-family="sans-serif" font-size="13">retained floor</text><text x="306" y="501" fill="#fed7aa" font-family="sans-serif" font-size="13">sealed liner; no outfall</text><text x="580" y="330" fill="#e2e8f0" font-family="sans-serif" font-size="17">Ownership and release gate</text><text x="580" y="363" fill="#38bdf8" font-family="sans-serif" font-size="14">C1 owner: ${c1OwnerCells.length} exact envelope / liner cells</text><text x="580" y="390" fill="#facc15" font-family="sans-serif" font-size="14">Cavern A owner: six closed manual door leaves + 3×2 receiver at z=10</text><text x="580" y="417" fill="#facc15" font-family="sans-serif" font-size="14">Cavern B owner: six closed manual door leaves + 3×2 receiver at z=75</text><text x="580" y="454" fill="#fca5a5" font-family="sans-serif" font-size="14">Every owner must bind exact forward / retained / rollback states to a fresh source.</text><text x="580" y="481" fill="#fca5a5" font-family="sans-serif" font-size="14">No public opening; no actuator, NBT, water flow, drain outlet, or unilateral build.</text><text x="580" y="535" fill="#94a3b8" font-family="sans-serif" font-size="13">blue = enclosure · green = retained normal-walk core · orange = sealed liner / vestibule · yellow = reciprocal closed door plane</text></svg>\n`;
const markdown = `# MP08 C1 bilateral containment / interface contract 02\n\n**Status:** \`${contract.status}\` — **no mutation authority.**\n\n![C1 bilateral containment setout](mp08-c1-bilateral-containment-contract-02.svg)\n\n## Source binding\n\n- Snapshot: \`${contract.source.snapshot}\`\n- Complete immutable capture: \`${contract.source.captureId}\` (${contract.source.requiredMemberCount} members)\n- Capture manifest SHA-256: \`${contract.source.captureManifestSha256}\`\n- Exact source-envelope state SHA-256: \`${contract.source.sourceStateSha256}\`\n\n## Exact build reservation\n\nThe retained C1 walking route is x=−1..1, z=15..70: floor y=−12 through z=26, y=−11 through z=54, and y=−10 through z=70. The stairs at 26→27 and 54→55 remain. The C1 owner must own a polished-deepslate roof at floor+3, side walls at x=−2/2 from floor through floor+3, and a sealed polished-deepslate underfloor isolation liner one block below every floor. The liner is **not** a drain: it permits no fluid, outlet, water displacement, or external receiver.\n\nCavern A reserves z=11..14 at floor y=−12; Cavern B reserves z=71..74 at floor y=−10. Each is five-wide outside / three-wide clear inside. The C1 owner owns its envelope and liner. The named Cavern owner exclusively accepts its six closed manual iron-door leaves plus the first 3×2 outer receiving-clearance plane (A z=10; B z=75).\n\n## Mandatory reciprocal acceptance\n\nNo compiler may emit operations until three distinct owner IDs sign the exact coordinate hashes in the generated acceptance template; each named cavern owner declares an exact external return anchor, accepts a normal-walk path in both directions, and accepts the closed unpowered/no-NBT/no-actuator door state. A fresh source then replaces this static source before any physical release kernel.\n\n- C1 owner reservation: ${contract.core.ownerRequiredCells.cellCount} cells, \`${contract.core.ownerRequiredCells.coordinateSetSha256}\`\n- Cavern A shared door/receiver: ${describeSet(cavernAOwnerCells).cellCount} cells, \`${describeSet(cavernAOwnerCells).coordinateSetSha256}\`\n- Cavern B shared door/receiver: ${describeSet(cavernBOwnerCells).cellCount} cells, \`${describeSet(cavernBOwnerCells).coordinateSetSha256}\`\n\n## Current source observation\n\nThe existing retained strip has ${retainedHazards.length} hazard states, ${retainedClearFailures.length} clear-envelope failures, and ${blockEntities.length} block entities in the defined source envelope. This validates neither ownership nor release readiness.\n\n## Compiler gate\n\n${contract.compilerGate.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nContract identity: \`${contract.identitySha256}\`\n`;
fs.writeFileSync(path.join(outputDir, 'mp08-c1-bilateral-containment-contract-02.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'mp08-c1-bilateral-containment-contract-02.svg'), planSvg);
fs.writeFileSync(path.join(outputDir, 'MP08-C1-BILATERAL-CONTAINMENT-CONTRACT-02.md'), markdown);
if (acceptanceResult) fs.writeFileSync(path.join(outputDir, 'mp08-c1-bilateral-containment-acceptance-validation.json'), `${JSON.stringify(acceptanceResult, null, 2)}\n`);
console.log(JSON.stringify({ status: contract.status, contractIdentitySha256: contract.identitySha256, source: contract.source.snapshot, coreOwnerCells: c1OwnerCells.length, cavernAOwnerCells: cavernAOwnerCells.length, cavernBOwnerCells: cavernBOwnerCells.length, acceptance: acceptanceResult, out: relative(outputDir) }, null, 2));
if (acceptanceResult && acceptanceResult.status !== 'ACCEPTED_STATIC_CONTRACT_AWAITING_FRESH_RELEASE_KERNEL') process.exitCode = 2;
