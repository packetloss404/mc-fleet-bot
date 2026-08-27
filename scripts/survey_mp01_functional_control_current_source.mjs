#!/usr/bin/env node
/**
 * Read-only disposition for MP01's first attempted reactive control.
 *
 * The historical package proved that an exact OFF-state build and inverse are
 * mechanically reversible.  It did not prove the mechanism on the production
 * world: writing a powered lever state through RCON did not propagate into the
 * adjacent wire.  This survey deliberately emits no operation files.  It
 * binds the retained OFF envelope in a current immutable snapshot and defines
 * the evidence that a successor must produce before any new control topology
 * can be compiled.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`${flag} is required`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 functional-control source survey rejected: ${message}`);
};
const key = ({ x, y, z }) => `${x},${y},${z}`;
const sortedCells = (cells) => cells.slice().sort((left, right) => left.x - right.x
  || left.y - right.y || left.z - right.z);
const cellsHash = (cells) => sha256(sortedCells(cells).map(key).join('\n'));
const boundsOf = (cells) => ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});

const snapshot = required('--snapshot');
const out = required('--out');
const markdown = required('--markdown');
const intakePath = value('--intake', null);
const generatedAtUtc = value('--generated-at', new Date().toISOString());
const regionDir = path.join(absolute(snapshot), 'region');
const entitiesDir = path.join(absolute(snapshot), 'entities');
fail(fs.existsSync(regionDir) && fs.existsSync(entitiesDir), 'snapshot must contain region and entities directories');

const intake = intakePath ? JSON.parse(fs.readFileSync(absolute(intakePath), 'utf8')) : null;
if (intake) {
  fail(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    `intake did not pass: ${intake.status}`);
  fail(relative(intake.input?.suppliedWorldRoot) === relative(snapshot),
    `intake snapshot ${intake.input?.suppliedWorldRoot} does not match ${snapshot}`);
}

const reader = new AnvilReader(regionDir);
const entityReader = new AnvilReader(entitiesDir);
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const record = async (cell) => ({ ...cell, state: await stateAt(cell) });
const box = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};
const unique = (cells) => [...new Map(cells.map((cell) => [key(cell), cell])).values()];
const neighborHalo = (cells) => {
  const targets = new Set(cells.map(key));
  return unique(cells.flatMap(({ x, y, z }) => [
    { x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z },
    { x, y: y + 1, z }, { x, y, z: z - 1 }, { x, y, z: z + 1 },
  ]).filter((cell) => !targets.has(key(cell))));
};
const census = (records) => Object.fromEntries([...records.reduce((states, { state }) => {
  states.set(state, (states.get(state) ?? 0) + 1);
  return states;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));

// This is the complete existing reactive component, not an authorization to
// mutate it.  Its source state is exact because a future replacement must
// either retain or explicitly migrate every one of these cells.
const legacyTargets = [
  ...box(2001, 2004, 165, 165, -902, -902),
  { x: 2001, y: 166, z: -902 },
  { x: 2002, y: 166, z: -902 },
  { x: 2003, y: 166, z: -902 },
];
const expectedStates = new Map([
  ['2001,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2002,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2003,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2004,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2001,166,-902', 'minecraft:lever[face=floor,facing=north,powered=false]'],
  ['2002,166,-902', 'minecraft:redstone_wire[east=side,north=none,power=0,south=none,west=side]'],
  ['2003,166,-902', 'minecraft:redstone_lamp[lit=false]'],
]);
const targets = await Promise.all(legacyTargets.map(record));
for (const cell of targets) fail(cell.state === expectedStates.get(key(cell)),
  `legacy control source drift at ${key(cell)}: ${cell.state}`);

const haloCells = neighborHalo(legacyTargets);
const halo = await Promise.all(haloCells.map(record));
const envelope = unique([...legacyTargets, ...haloCells]);
const envelopeBounds = boundsOf(envelope);
const chunkIds = new Set(envelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const envelopeKeys = new Set(envelope.map(key));
const blockEntities = [];
const savedEntities = [];
for (const chunkId of chunkIds) {
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
      && position[2] >= envelopeBounds.minZ && position[2] <= envelopeBounds.maxZ) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
    }
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0,
  `snapshot control envelope contains entities: ${JSON.stringify({ blockEntities, savedEntities })}`);

const report = {
  schemaVersion: 1,
  id: 'MP01-FUNCTIONAL-CONTROL-CURRENT-SOURCE-DESIGN-HOLD-01',
  status: 'HOLD_NO_CURRENT_WORLD_FUNCTIONAL_CONTROL_RELEASE_CANDIDATE',
  generatedAtUtc,
  surveyKind: 'READ_ONLY_SOURCE_BOUND_FUNCTIONAL_CONTROL_DISPOSITION',
  source: {
    worldRoot: relative(snapshot),
    completeSaveSha256: intake?.packageIdentity?.completeSaveSha256 ?? null,
    completeSaveIntake: intakePath ? { path: relative(intakePath), sha256: sha256(fs.readFileSync(absolute(intakePath))) } : null,
    regionSha256: sha256(Buffer.concat(fs.readdirSync(regionDir).filter((name) => name.endsWith('.mca')).sort()
      .flatMap((name) => [Buffer.from(`${name}\0`), fs.readFileSync(path.join(regionDir, name)), Buffer.from([0])]))),
  },
  historicalFailure: {
    releaseId: 'MP01-ISOLATED-REACTIVE-CONTROL-01',
    historicalLedger: 'data/world-review/mp01-isolated-reactive-control-01-live-20260826T053500Z/evidence-ledger.json',
    disposition: 'STRUCTURALLY_REVERSIBLE_BUT_NOT_FUNCTIONALLY_ACCEPTED',
    provenLiveObservation: [
      'The guarded RCON state transition set the lever to powered=true.',
      'The adjacent wire remained power=0 in the immutable live ON capture.',
      'The historical release therefore provides neither an ON-state propagation proof nor an accepted active-control function.',
    ],
    rejectedInference: 'A disposable loopback Paper proof and a guarded /fill state transition are not substitutes for a production-world physical-interaction ON/OFF proof.',
  },
  retainedEnvelope: {
    purpose: 'Existing inactive, non-accepted indicator envelope; survey target only.',
    operatedCellCount: targets.length,
    operatedCellSetSha256: cellsHash(legacyTargets),
    operatedBounds: boundsOf(legacyTargets),
    exactCurrentStates: targets,
    immediateHalo: {
      cellCount: halo.length,
      cellSetSha256: cellsHash(haloCells),
      bounds: boundsOf(haloCells),
      stateCensus: census(halo),
    },
    blockEntityCount: blockEntities.length,
    savedEntityCount: savedEntities.length,
    fluidsOrGravityInOperatedCells: targets.filter(({ state }) => /water|lava|bubble|sand|gravel|concrete_powder/.test(state)),
  },
  candidateAssessment: {
    independentFunctionalProgramme: false,
    operationPackageEmitted: false,
    reason: [
      'The only surveyed reactive set is the known failed topology itself; replacing it without a current-world interaction method would repeat the unaccepted proof model.',
      'No existing door, reservoir, route, protected boundary, public-access cell, utility, or life-safety system may be attached to a first revised control experiment.',
      'The ordinary exact guarded-op runner can establish block states but cannot by itself prove a player-caused redstone propagation event.',
    ],
    result: 'NO_SAFE_FUNCTIONAL_RELEASE_UNTIL_RUNTIME_ACTIVATION_AND_OBSERVATION_PROTOCOL_IS_AVAILABLE',
  },
  mandatorySuccessorContract: {
    scope: 'A newly surveyed, isolated, non-safety-critical indicator only. It must remain physically and logically disjoint from doors, water/liner walls, service/public routes, egress, mechanisms, containers, and all utility/life-safety claims.',
    sourceAndTopology: [
      'Take a new complete immutable source immediately before compilation; re-read every operated and halo cell, including support states and block entities.',
      'Select a different exact topology only after same-server-version runtime testing demonstrates the intended signal propagation; do not inherit the historical lever/wire/lamp topology by name or coordinate.',
      'Compile exact forward, rollback, OFF, ON, and OFF-reset state files, with an exact inverse from each accepted terminal state.',
    ],
    liveFunctionalAcceptance: [
      'Activate the control through a genuine in-world interaction by a player or a Mineflayer bot with interaction-only authority; do not use /fill, /setblock, or an equivalent command state replacement as the trigger.',
      'Observe exact ON signal and output states through independent server-state queries after the interaction, then repeat after at least one normal server-tick interval; both observations must agree.',
      'Perform a genuine second interaction to reset OFF, prove exact OFF signal/output state twice, then capture an immutable post-interaction save before evaluating rollback.',
      'Any absent propagation, inconsistent settling, missing interaction audit, or effect outside the isolated envelope rejects the successor and requires exact recovery before another topology is tried.',
    ],
    kernelStillRequired: [
      'fresh source/post complete-save intake and snapshot identities',
      'container/block-entity and live-entity clearance',
      'strict-noop forward/rollback parser checks and exact source/projected/poststate preflights',
      'journaled guarded execution and independent post-release functional QA',
    ],
  },
  nonClaims: [
    'active access control', 'door operation', 'utility commissioning', 'emergency or life-safety system',
    'public or service opening', 'Battle Cab operations', 'MP01 completion',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    capturesPerformed: false,
    worldEditsPerformed: false,
    operationPackageEmitted: false,
  },
  payloadSha256: null,
};
report.payloadSha256 = sha256(JSON.stringify(report));

fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
const md = `# MP01 functional-control current-source design hold\n\n`
  + `**Status:** \`${report.status}\`. No guarded operation package was emitted.\n\n`
  + `The latest complete immutable source is \`${report.source.worldRoot}\` (complete-save SHA-256 \`${report.source.completeSaveSha256}\`; region SHA-256 \`${report.source.regionSha256}\`). It retains the exact seven-cell OFF indicator at \`x=2001..2004, y=165..166, z=-902\`: four polished-blackstone support cells, an OFF lever, a \`power=0\` wire, and an unlit lamp. The seven operated cells and their immediate halo are free of saved entities and block entities in this snapshot.\n\n`
  + `## Why this is held\n\n`
  + `The earlier release was structurally reversible, but its immutable live ON capture set the lever to \`powered=true\` while the wire remained \`power=0\`. A disposable server and an RCON block-state write do not prove a real production-world interaction. Rebuilding the same topology, or attaching it to a door, reservoir, route, boundary, or utility, would repeat that failure with a larger blast radius.\n\n`
  + `## Successor gate\n\n`
  + `A successor must be a new isolated non-safety-critical indicator topology, selected only after same-version runtime testing. Its ON/OFF test must be caused by genuine Minecraft interaction (player or interaction-only bot), not \`/fill\` or \`/setblock\`, and must independently observe exact ON and OFF signal/output states twice after normal ticks. It then needs the full fresh guarded-release kernel and a post-interaction immutable save. Until that protocol is available and passes, this is a local control-design hold only—not a hold on unrelated Cheyenne work.\n`;
fs.mkdirSync(path.dirname(absolute(markdown)), { recursive: true });
fs.writeFileSync(absolute(markdown), md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(out), markdown: relative(markdown), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
