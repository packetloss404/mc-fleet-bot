#!/usr/bin/env node
/**
 * MP01 normal-walk survey acceptance contract 01.
 *
 * This is deliberately the upstream access gate for the otherwise isolated
 * MP01 utility/control/boundary programme.  It binds the destination staging
 * and protected boundary to a complete immutable source, but does not invent
 * the 2,100-block route, alter civic mobility, add markers, move a bot, or
 * emit a Minecraft operation.  A later, independently surveyed route may be
 * validated against this exact contract; a successful validation is still
 * only an input to a separately reviewed, narrow mobility-patch test.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (name) => {
  const result = option(name);
  if (!result) throw new Error(`Usage: generate_mp01_access_normal_walk_survey_acceptance_contract_01.mjs --snapshot <complete immutable snapshot> --out <directory> [--validate-acceptance <json>]`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const point = (x, y, z) => ({ x, y, z });
const box = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push(point(x, y, z));
  }
  return cells;
};
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 normal-walk survey contract rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:scaffolding',
  'minecraft:pointed_dripstone',
]);
const isAir = (state) => AIR.has(stateName(state));
const isUnsafeWalkState = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true')
  || GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder')
  || stateName(state).endsWith('_door') || stateName(state).endsWith('_trapdoor');
const stateSetHash = (records) => sha256(`${records.slice().sort((left, right) => cellKey(left.cell).localeCompare(cellKey(right.cell)))
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const nonPlaceholder = (value) => typeof value === 'string' && value.trim().length > 0
  && !/^(ASSIGN|UNASSIGNED|TODO|TBD|PLACEHOLDER)/i.test(value.trim());
const samePoint = (left, right) => left?.x === right?.x && left?.y === right?.y && left?.z === right?.z;
const asPoint = (value) => ({ x: Number(value?.x), y: Number(value?.y), z: Number(value?.z) });
const validPoint = (value) => Number.isInteger(value?.x) && Number.isInteger(value?.y) && Number.isInteger(value?.z);

const SNAPSHOT = required('--snapshot');
const OUT = required('--out');
const ACCEPTANCE = option('--validate-acceptance');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(SNAPSHOT);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'snapshot lacks combined-zones complete-save capture manifest');
for (const member of ['region', 'entities', 'poi', 'level.dat']) {
  fail(fs.existsSync(path.join(snapshotRoot, member)), `snapshot is missing ${member}`);
}
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'capture is not immutable');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130,
  `expected the complete 130-member source, got ${capture.requiredMembers?.length ?? 'none'}`);
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(filename), `captured member is absent: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes, `captured member size drift: ${member.path}`);
  fail(sha256(bytes) === member.sha256, `captured member hash drift: ${member.path}`);
}

const CONFIG_PATH = 'config.yml';
const MARKERS_PATH = 'data/markers.json';
const ROUTES_PATH = 'data/routes.json';
const ZONES_PATH = 'data/zones.json';
const sourceFiles = Object.fromEntries([CONFIG_PATH, MARKERS_PATH, ROUTES_PATH, ZONES_PATH,
  'src/control/CivicMobility.ts', 'src/bot/BotInstance.ts', 'src/actions/moveHelper.ts', 'src/actions/walkTo.ts']
  .map((filename) => [filename, sha256(fs.readFileSync(absolute(filename)))]));

const stagingFeet = [2001, 2002, 2003].map((x) => point(x, 165, -899));
const stagingSupports = stagingFeet.map(({ x, y, z }) => point(x, y - 1, z));
const stagingHeadroom = stagingFeet.flatMap(({ x, y, z }) => [point(x, y, z), point(x, y + 1, z)]);
const reactiveOffEnvelope = [
  point(2001, 165, -902), point(2002, 165, -902), point(2003, 165, -902), point(2004, 165, -902),
  point(2001, 166, -902), point(2002, 166, -902), point(2003, 166, -902),
];
const expectedControlStates = new Map([
  ['2001,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2002,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2003,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2004,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2001,166,-902', 'minecraft:lever[face=floor,facing=north,powered=false]'],
  ['2002,166,-902', 'minecraft:redstone_wire[east=side,north=none,power=0,south=none,west=side]'],
  ['2003,166,-902', 'minecraft:redstone_lamp[lit=false]'],
]);
const boundaryDoors = [point(2006, 166, -894), point(2006, 167, -894), point(2008, 166, -894), point(2008, 167, -894)];
const dryVestibule = box(2007, 2007, 166, 171, -894, -894);
const reservoirWall = box(2009, 2024, 166, 171, -896, -896);
const protectedEnvelope = uniqueCells([
  ...stagingSupports, ...stagingHeadroom, ...reactiveOffEnvelope, ...boundaryDoors, ...dryVestibule, ...reservoirWall,
]);
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const readCells = async (cells) => Promise.all(cells.map(async (cell) => ({
  cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
})));
const [stagingSupportStates, stagingHeadStates, controlStates, doorStates, vestibuleStates, wallStates, sourceEnvelopeStates] = await Promise.all([
  readCells(stagingSupports), readCells(stagingHeadroom), readCells(reactiveOffEnvelope), readCells(boundaryDoors),
  readCells(dryVestibule), readCells(reservoirWall), readCells(protectedEnvelope),
]);
for (const record of stagingSupportStates) fail(record.state === 'minecraft:polished_andesite', `staging support drift at ${cellKey(record.cell)}: ${record.state}`);
for (const record of stagingHeadStates) fail(isAir(record.state), `staging clearance drift at ${cellKey(record.cell)}: ${record.state}`);
for (const record of controlStates) fail(record.state === expectedControlStates.get(cellKey(record.cell)),
  `reactive OFF boundary drift at ${cellKey(record.cell)}: ${record.state}`);
for (const record of doorStates) fail(record.state.includes('minecraft:iron_door[') && record.state.includes('open=false') && record.state.includes('powered=false'),
  `manual boundary door is not closed/unpowered at ${cellKey(record.cell)}: ${record.state}`);
for (const record of vestibuleStates) fail(isAir(record.state), `vestibule is not dry/clear at ${cellKey(record.cell)}: ${record.state}`);
for (const record of wallStates) fail(record.state === 'minecraft:white_concrete', `reservoir separation drift at ${cellKey(record.cell)}: ${record.state}`);

const chunkIds = new Set(protectedEnvelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const protectedKeys = new Set(protectedEnvelope.map(cellKey));
const protectedBounds = { minX: 2001, maxX: 2024, minY: 164, maxY: 171, minZ: -902, maxZ: -894 };
const blockEntities = [];
const savedEntities = [];
const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
for (const chunkId of chunkIds) {
  const [chunkX, chunkZ] = chunkId.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (protectedKeys.has(cellKey(cell))) blockEntities.push({ cell, id: entity.id ?? entity.Id ?? null });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= protectedBounds.minX && position[0] <= protectedBounds.maxX
      && position[1] >= protectedBounds.minY && position[1] <= protectedBounds.maxY
      && position[2] >= protectedBounds.minZ && position[2] <= protectedBounds.maxZ) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
    }
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0,
  `source protected envelope contains entity state: ${JSON.stringify({ blockEntities, savedEntities })}`);

const describe = (cells) => ({ cellCount: uniqueCells(cells).length, coordinateSetSha256: hashCells(cells) });
const contract = {
  schemaVersion: 1,
  id: 'MP01-ACCESS-NORMAL-WALK-SURVEY-CONTRACT-01',
  status: 'STATIC_SOURCE_BOUND_NONAUTHORIZING_ACCESS_SURVEY_CONTRACT',
  generatedAtUtc: GENERATED_AT,
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false,
    botMovementPerformed: false,
    worldEditsPerformed: false,
    configOrCatalogMutationPerformed: false,
    operationFilesEmitted: false,
    releaseManifestEmitted: false,
  },
  source: {
    snapshot: relative(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: sha256(captureBytes),
    requiredMemberCount: capture.requiredMembers.length,
    immutableCopy: capture.immutableCopy,
    sourceFiles,
    destinationProtectedEnvelope: { ...describe(protectedEnvelope), stateSha256: stateSetHash(sourceEnvelopeStates) },
  },
  destination: {
    ownerRole: 'MP01_TERMINAL_ACCESS_OWNER_UNASSIGNED',
    stagingFeetCells: { ...describe(stagingFeet), cells: stagingFeet },
    stagingSupportCells: { ...describe(stagingSupports), requiredState: 'minecraft:polished_andesite' },
    stagingHeadroomCells: { ...describe(stagingHeadroom), requiredState: 'two clear air blocks above each staging foot cell' },
    interactionOnlyControlBoundary: {
      ...describe(reactiveOffEnvelope),
      currentStateSha256: stateSetHash(controlStates),
      policy: 'RETAIN_OFF; no state write, mechanism extension, or functional-control claim is accepted by this access contract.',
    },
    protectedManualBoundary: {
      closedDoorCells: { ...describe(boundaryDoors), requiredState: 'closed unpowered manual iron-door leaves' },
      dryVestibuleCells: { ...describe(dryVestibule), requiredState: 'minecraft:air' },
      retainedReservoirWallCells: { ...describe(reservoirWall), requiredState: 'minecraft:white_concrete' },
      policy: 'The route may terminate at staging only. It must not cross either manual boundary door or enter the reservoir-side corridor.',
    },
  },
  acceptanceTemplate: {
    schemaVersion: 1,
    id: 'MP01-ACCESS-NORMAL-WALK-SURVEY-ACCEPTANCE-01',
    contractIdentitySha256: 'COPY_FROM_CONTRACT_IDENTITY',
    source: {
      snapshot: relative(SNAPSHOT), captureManifestSha256: sha256(captureBytes),
      destinationProtectedEnvelopeStateSha256: stateSetHash(sourceEnvelopeStates), sourceFiles,
    },
    owners: [
      { id: 'ASSIGN_NAMED_ORIGIN_OWNER', role: 'origin' },
      { id: 'ASSIGN_NAMED_TRANSIT_OWNER_OR_REVIEWED_INTERFACE_OWNER', role: 'transit' },
      { id: 'ASSIGN_MP01_TERMINAL_ACCESS_OWNER', role: 'destination' },
    ],
    anchors: {
      origin: { id: 'ASSIGN_EXACT_REACHABLE_ORIGIN_ANCHOR', feet: { x: 'integer', y: 'integer', z: 'integer' } },
      recovery: { id: 'ASSIGN_DISTINCT_EXACT_RECOVERY_ANCHOR', feet: { x: 'integer', y: 'integer', z: 'integer' } },
      destination: { id: 'MP01-RESTRICTED-STAGING-01', feet: 'one of destination.stagingFeetCells.cells' },
    },
    routes: {
      outbound: [{ feet: { x: 'integer', y: 'integer', z: 'integer' }, ownerId: 'one declared non-placeholder owner', interfaceId: 'reviewed exact owner/interface record' }],
      return: [{ feet: { x: 'integer', y: 'integer', z: 'integer' }, ownerId: 'one declared non-placeholder owner', interfaceId: 'reviewed exact owner/interface record' }],
    },
  },
  validationRules: [
    'Outbound begins at the exact origin and ends at one staging foot cell; return begins at that same staging cell and ends at a distinct exact recovery anchor.',
    'Every consecutive feet pair is cardinal in x/z, with no more than one vertical step and no jumps, swimming, doors, digging, towering, sprint/parkour, teleport, RCON movement, or speculative pathfinder probe.',
    'Every station proves non-hazard solid footing plus two clear air cells at feet and head, against the bound immutable source.',
    'Every station declares a non-placeholder owner ID and exact reviewed owner/interface ID; an unowned or catalog-only station fails closed.',
    'A successful acceptance grants no marker, route, config, leash, bot-movement, runtime-control, RCON, or physical-release authority. A separate narrow offline civic-mobility patch and a fresh live checkpoint gate remain required.',
  ],
  compilerOrMovementGate: [
    'Take a fresh complete immutable source immediately before any mobility-patch review; regenerate this contract when its source or control files drift.',
    'Obtain named owner/interface acceptance for every outbound and return station, including each crossing and both anchors.',
    'Test only a single-bot, exact corridor-only mobility patch offline; assert in-route samples allow and adjacent/off-route samples deny before any supervised movement.',
    'Before each supervised checkpoint, compare fresh live state to the accepted route station, perform live entity clearance, and abort on drift.',
    'Only after access is accepted may the separate MP01 reactive-control interaction protocol be attempted; its two ON/OFF observation requirements remain independent.',
  ],
  nonClaims: [
    'No route has been surveyed or accepted.', 'No owner is assigned by this contract.', 'No civic boundary is changed.',
    'No bot may move under this contract.', 'No control is commissioned.', 'No public/service access, egress, utility, life-safety, or MP01 completion is claimed.',
  ],
  identitySha256: null,
};
contract.identitySha256 = sha256(`${JSON.stringify(contract, null, 2)}\n`);

const validateRoute = async (stations, label, owners, errors) => {
  if (!Array.isArray(stations) || stations.length < 2) { errors.push(`${label} must contain at least two stations`); return; }
  const seen = new Set();
  for (let index = 0; index < stations.length; index += 1) {
    const station = stations[index];
    if (!validPoint(station?.feet)) { errors.push(`${label}[${index}] lacks integer feet coordinates`); continue; }
    const feet = station.feet;
    const stationKey = cellKey(feet);
    if (seen.has(stationKey)) errors.push(`${label}[${index}] repeats ${stationKey}; survey paths must be simple`);
    seen.add(stationKey);
    if (!owners.has(station.ownerId)) errors.push(`${label}[${index}] has undeclared ownerId ${station.ownerId ?? 'none'}`);
    if (!nonPlaceholder(station.interfaceId)) errors.push(`${label}[${index}] lacks a reviewed exact interfaceId`);
    const support = stateToCommandString(await reader.blockState(feet.x, feet.y - 1, feet.z));
    const body = stateToCommandString(await reader.blockState(feet.x, feet.y, feet.z));
    const head = stateToCommandString(await reader.blockState(feet.x, feet.y + 1, feet.z));
    if (isAir(support) || isUnsafeWalkState(support)) errors.push(`${label}[${index}] has unsafe footing ${support} at ${cellKey(point(feet.x, feet.y - 1, feet.z))}`);
    if (!isAir(body) || isUnsafeWalkState(body)) errors.push(`${label}[${index}] feet cell is not clear air: ${body}`);
    if (!isAir(head) || isUnsafeWalkState(head)) errors.push(`${label}[${index}] head cell is not clear air: ${head}`);
    if (index > 0 && validPoint(stations[index - 1]?.feet)) {
      const prior = stations[index - 1].feet;
      if (Math.abs(feet.x - prior.x) + Math.abs(feet.z - prior.z) !== 1 || Math.abs(feet.y - prior.y) > 1) {
        errors.push(`${label}[${index - 1}]→[${index}] is not one cardinal normal-walk step`);
      }
    }
  }
};

const validateAcceptance = async (acceptance) => {
  const errors = [];
  if (acceptance?.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
  if (acceptance?.id !== 'MP01-ACCESS-NORMAL-WALK-SURVEY-ACCEPTANCE-01') errors.push('wrong acceptance id');
  if (acceptance?.contractIdentitySha256 !== contract.identitySha256) errors.push('contract identity mismatch');
  for (const key of ['snapshot', 'captureManifestSha256', 'destinationProtectedEnvelopeStateSha256']) {
    if (acceptance?.source?.[key] !== contract.source[key]) errors.push(`source.${key} mismatch`);
  }
  if (JSON.stringify(acceptance?.source?.sourceFiles) !== JSON.stringify(sourceFiles)) errors.push('source.sourceFiles mismatch');
  const acceptedOwners = new Set();
  if (!Array.isArray(acceptance?.owners) || acceptance.owners.length < 3) errors.push('three named owner roles are required');
  for (const owner of acceptance?.owners ?? []) {
    if (!nonPlaceholder(owner?.id) || !nonPlaceholder(owner?.role)) errors.push('owner id/role is missing or a placeholder');
    else acceptedOwners.add(owner.id);
  }
  for (const role of ['origin', 'transit', 'destination']) if (!(acceptance?.owners ?? []).some((owner) => owner.role === role && nonPlaceholder(owner.id))) errors.push(`missing named ${role} owner`);
  const origin = acceptance?.anchors?.origin;
  const recovery = acceptance?.anchors?.recovery;
  const destination = acceptance?.anchors?.destination;
  for (const [name, anchor] of Object.entries({ origin, recovery, destination })) {
    if (!nonPlaceholder(anchor?.id) || !validPoint(anchor?.feet)) errors.push(`${name} anchor is incomplete`);
  }
  if (validPoint(origin?.feet) && validPoint(recovery?.feet) && samePoint(origin.feet, recovery.feet)) errors.push('recovery anchor must be distinct from origin anchor');
  if (validPoint(destination?.feet) && !stagingFeet.some((cell) => samePoint(cell, destination.feet))) errors.push('destination anchor is not an accepted MP01 staging foot cell');
  await validateRoute(acceptance?.routes?.outbound, 'outbound', acceptedOwners, errors);
  await validateRoute(acceptance?.routes?.return, 'return', acceptedOwners, errors);
  const outbound = acceptance?.routes?.outbound;
  const inbound = acceptance?.routes?.return;
  if (Array.isArray(outbound) && outbound.length && validPoint(origin?.feet) && !samePoint(outbound[0]?.feet, origin.feet)) errors.push('outbound does not begin at origin anchor');
  if (Array.isArray(outbound) && outbound.length && validPoint(destination?.feet) && !samePoint(outbound.at(-1)?.feet, destination.feet)) errors.push('outbound does not end at destination anchor');
  if (Array.isArray(inbound) && inbound.length && validPoint(destination?.feet) && !samePoint(inbound[0]?.feet, destination.feet)) errors.push('return does not begin at destination anchor');
  if (Array.isArray(inbound) && inbound.length && validPoint(recovery?.feet) && !samePoint(inbound.at(-1)?.feet, recovery.feet)) errors.push('return does not end at recovery anchor');
  return {
    status: errors.length ? 'REJECTED_INCOMPLETE_OR_DRIFTED_NORMAL_WALK_SURVEY_ACCEPTANCE'
      : 'ACCEPTED_SOURCE_BOUND_ROUTE_SURVEY_AWAITING_SEPARATE_MOBILITY_PATCH_REVIEW',
    mutationAuthority: false,
    errors,
  };
};

const outputDir = absolute(OUT);
fs.mkdirSync(outputDir, { recursive: true });
const contractPath = path.join(outputDir, 'mp01-access-normal-walk-survey-contract-01.json');
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
const acceptanceResult = ACCEPTANCE ? await validateAcceptance(JSON.parse(fs.readFileSync(absolute(ACCEPTANCE), 'utf8'))) : null;
if (acceptanceResult) fs.writeFileSync(path.join(outputDir, 'acceptance-validation.json'), `${JSON.stringify(acceptanceResult, null, 2)}\n`);
const markdown = `# MP01 normal-walk survey acceptance contract 01\n\n`
  + `**Status:** \`${contract.status}\`. This records no route and grants no movement or mutation authority.\n\n`
  + `## Source-bound destination interface\n\n`
  + `- Immutable snapshot: \`${contract.source.snapshot}\`\n`
  + `- Capture: \`${contract.source.captureId}\`, ${contract.source.requiredMemberCount} verified members\n`
  + `- Capture manifest SHA-256: \`${contract.source.captureManifestSha256}\`\n`
  + `- Protected destination state SHA-256: \`${contract.source.destinationProtectedEnvelope.stateSha256}\`\n`
  + `- Staging: three exact feet cells at \`(2001..2003,165,-899)\`, each with polished-andesite footing and two clear air cells.\n`
  + `- Protected interface: the seven-cell reactive indicator remains OFF; both manual boundary doors remain closed/unpowered; the six-cell vestibule remains clear and the 96-cell reservoir wall remains white concrete.\n\n`
  + `## What a future survey must prove\n\n`
  + `An acceptance must name separate origin, transit, and destination owners; name an exact origin, distinct recovery, and staging anchor; and supply every outbound/return feet cell. The validator rejects non-cardinal steps, vertical jumps, unsafe footing, non-air body/head cells, door/fluid/gravity traversal, missing owner/interface coverage, endpoint mismatch, and all source drift. A passing result still authorizes neither a marker/route/config change nor movement.\n\n`
  + `## Next gate\n\n`
  + `Only a separately reviewed single-bot, exact corridor-only offline civic-mobility patch may follow a valid survey acceptance. Fresh live checkpoint and entity gates remain mandatory before supervised movement; the reactive-control ON/OFF interaction protocol remains independent.\n\n`
  + `Contract identity: \`${contract.identitySha256}\`\n`;
fs.writeFileSync(path.join(outputDir, 'MP01-ACCESS-NORMAL-WALK-SURVEY-CONTRACT-01.md'), markdown);
process.stdout.write(`${JSON.stringify({
  status: contract.status, contract: relative(contractPath), contractIdentitySha256: contract.identitySha256,
  acceptanceValidation: acceptanceResult, mutationAuthority: false,
}, null, 2)}\n`);
