#!/usr/bin/env node
/**
 * Independent, read-only source QA for the accepted High-16 descending bypass.
 * It deliberately does not import the compiler or authorize execution.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const snapshotPath = arg('--snapshot');
const manifestPath = arg('--manifest');
const proposalPath = arg('--proposal');
const acceptancePath = arg('--acceptance');
const outPath = arg('--out');
const clearancePath = arg('--clearance-out');
const markdownPath = arg('--out-md');
if (!snapshotPath || !manifestPath || !proposalPath || !acceptancePath || !outPath || !clearancePath) {
  throw new Error('usage: --snapshot <complete-save> --manifest <manifest> --proposal <proposal> --acceptance <accepted-record> --out <qa.json> --clearance-out <clearance.json> [--out-md <report.md>]');
}

const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, absolute(file)).split(path.sep).join('/');
const readBytes = (file) => fs.readFileSync(absolute(file));
const readJson = (file) => JSON.parse(readBytes(file));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const point = (x, y, z) => ({ x, y, z });
const key = (cell) => cellKey(cell);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:concrete_powder'].includes(blockName(state));
const box = (origin) => {
  const cells = [];
  for (let x = origin.x; x < origin.x + 6; x += 1) for (let y = origin.y; y < origin.y + 6; y += 1) for (let z = origin.z; z < origin.z + 6; z += 1) cells.push(point(x, y, z));
  return cells;
};
const union = (...sets) => [...new Map(sets.flat().map((cell) => [key(cell), cell])).values()];
const parseOps = (file) => readBytes(file).toString('utf8').split(/\r?\n/).map((line, index) => ({ line, index })).filter(({ line }) => line.trim() && !line.trim().startsWith('#')).map(({ line, index }) => {
  const terms = line.trim().split(/\s+/);
  if (terms.length !== 9 || terms[0] !== 'REPL' || terms[1] !== terms[4] || terms[2] !== terms[5] || terms[3] !== terms[6]) throw new Error(`${file}:${index + 1}: invalid exact REPL`);
  return { point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), from: terms[7], to: terms[8] };
});
const hasRequiredCapturePlanes = (capture) => {
  const paths = new Set((capture.requiredMembers ?? []).map(({ path: member }) => member));
  return ['region', 'entities', 'poi'].every((dir) => [...paths].some((member) => member.startsWith(`${dir}/`))) && paths.has('level.dat');
};

const snapshot = absolute(snapshotPath);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(snapshot, member))) throw new Error(`complete source lacks ${member}`);
}
const manifestBytes = readBytes(manifestPath);
const proposalBytes = readBytes(proposalPath);
const manifest = JSON.parse(manifestBytes);
const proposal = JSON.parse(proposalBytes);
const acceptance = readJson(acceptancePath);
const captureBytes = fs.readFileSync(path.join(snapshot, 'combined-zones-complete-save-capture.json'));
const capture = JSON.parse(captureBytes);

const stages = manifest.stages.map((stage) => ({
  ...stage,
  forwardOps: parseOps(stage.forward),
  rollbackOps: parseOps(stage.rollback),
}));
const operations = stages.flatMap(({ forwardOps }) => forwardOps);
const operationByKey = new Map(operations.map((operation) => [key(operation.point), operation]));
const duplicateForwardTargets = operations.length - operationByKey.size;
const rollbackInverseFailures = stages.flatMap(({ id, forwardOps, rollbackOps }) => forwardOps.filter((forward) => !rollbackOps.some((rollback) => key(rollback.point) === key(forward.point) && rollback.from === forward.to && rollback.to === forward.from)).map((forward) => ({ id, point: forward.point })));
const routeCore = union(...manifest.route.stations.map(({ origin }) => box(origin)));
const routeKeys = new Set(routeCore.map(key));
const reached = new Set([key(routeCore[0])]); const queue = [routeCore[0]];
for (let index = 0; index < queue.length; index += 1) {
  const cell = queue[index];
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const next = point(cell.x + dx, cell.y + dy, cell.z + dz);
    if (routeKeys.has(key(next)) && !reached.has(key(next))) { reached.add(key(next)); queue.push(next); }
  }
}
const sourceRecords = [...manifest.sourceStates.core, ...manifest.sourceStates.shell, ...manifest.sourceStates.halo];
const interaction = sourceRecords.map(({ point: cell }) => cell);
const interactionKeys = new Set(interaction.map(key));
const protectedManifest = readJson(manifest.ownership.protectedPath);
const protectedOps = (protectedManifest.stages ?? protectedManifest.packages ?? []).flatMap(({ forward }) => parseOps(forward));
const protectedKeys = new Set(protectedOps.map(({ point: cell }) => key(cell)));
const predecessorManifest = readJson(manifest.ownership.predecessorPath);
const predecessorOps = (predecessorManifest.stages ?? predecessorManifest.packages ?? []).flatMap(({ forward }) => parseOps(forward));
const predecessorKeys = new Set(predecessorOps.map(({ point: cell }) => key(cell)));

const reader = new AnvilReader(path.join(snapshot, 'region'));
const entitiesReader = new AnvilReader(path.join(snapshot, 'entities'));
const cache = new Map();
const stateAt = async (cell) => {
  const cellKeyValue = key(cell);
  if (!cache.has(cellKeyValue)) cache.set(cellKeyValue, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(cellKeyValue);
};
const sourceStateFailures = [];
for (const record of sourceRecords) {
  const actual = await stateAt(record.point);
  if (actual !== record.state) sourceStateFailures.push({ point: record.point, expected: record.state, actual });
}
const sourceGuardFailures = [];
for (const operation of operations) {
  const actual = await stateAt(operation.point);
  if (actual !== operation.from) sourceGuardFailures.push({ point: operation.point, expected: operation.from, actual });
}
const coreProjectedNonAir = [];
for (const cell of routeCore) {
  const operation = operationByKey.get(key(cell));
  const sourceState = await stateAt(cell);
  if ((operation?.to ?? sourceState) !== 'minecraft:air') coreProjectedNonAir.push({ point: cell, operation: operation?.to ?? null, sourceState });
}
const actualFluids = []; const actualGravity = [];
const unownedSourceAir = [];
for (const cell of interaction) {
  const state = await stateAt(cell);
  if (isFluid(state)) actualFluids.push({ point: cell, state });
  if (isGravity(state)) actualGravity.push({ point: cell, state });
  if (state === 'minecraft:air' && !predecessorKeys.has(key(cell))) unownedSourceAir.push({ point: cell, state });
}
const gravityFailures = [];
for (const chain of manifest.hazards.gravityChains) {
  const targetState = await stateAt(chain.target);
  const terminalState = chain.terminal ? await stateAt(chain.terminal.point) : null;
  if (!chain.staticSupport || !chain.preservedWillRemainSupported || targetState !== chain.state || terminalState !== chain.terminal?.state || !isGravity(targetState) || terminalState === 'minecraft:air' || isFluid(terminalState ?? 'minecraft:air')) {
    gravityFailures.push({ target: chain.target, expectedTarget: chain.state, actualTarget: targetState, expectedTerminal: chain.terminal?.state ?? null, actualTerminal: terminalState });
  }
}
const blockEntities = []; const savedEntities = [];
const bounds = manifest.geometry.interaction.bounds;
let chunksScanned = 0;
for (let cx = Math.floor(bounds.x[0] / 16); cx <= Math.floor(bounds.x[1] / 16); cx += 1) for (let cz = Math.floor(bounds.z[0] / 16); cz <= Math.floor(bounds.z[1] / 16); cz += 1) {
  chunksScanned += 1;
  const blockChunk = await reader.chunk(cx, cz);
  for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (interactionKeys.has(key(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, point: cell });
  }
  const entityChunk = await entitiesReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const pos = entity.Pos?.slice(0, 3).map(Number);
    if (!pos) continue;
    const cell = point(Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2]));
    if (interactionKeys.has(key(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, point: cell, pos });
  }
}
const protectedOverlap = operations.filter(({ point: cell }) => protectedKeys.has(key(cell))).map(({ point: cell }) => cell);
const checks = {
  completeImmutableSource: capture.immutableCopy === true && hasRequiredCapturePlanes(capture),
  exactSourceBinding: manifest.source.snapshot === relative(snapshotPath) && manifest.source.completeSaveCaptureManifestSha256 === sha(captureBytes)
    && proposal.sourceBinding?.manifestSha256 === sha(manifestBytes) && proposal.sourceBinding?.sourceSnapshot === relative(snapshotPath)
    && proposal.sourceBinding?.sourceCaptureManifestSha256 === sha(captureBytes)
    && acceptance.status === 'ACCEPTED_EXACT_OWNER_INTERFACE_RENEWAL' && acceptance.sourceBinding?.manifestSha256 === sha(manifestBytes)
    && acceptance.sourceBinding?.proposalSha256 === sha(proposalBytes) && acceptance.sourceBinding?.snapshot === relative(snapshotPath)
    && acceptance.sourceBinding?.captureManifestSha256 === sha(captureBytes),
  civilOnly: manifest.civilOnly === true && manifest.passengerServiceCommissioned === false && proposal.mutationAuthority === false && acceptance.mutationAuthority === false,
  exactGeometry: manifest.route.stations.length === 46 && manifest.route.crossSection === '6x6' && manifest.route.core.count === routeCore.length && hashCells(routeCore) === manifest.route.core.coordinateSetSha256 && reached.size === routeCore.length
    && proposal.exactGeometry.route.core.coordinateSetSha256 === hashCells(routeCore) && acceptance.acceptedGeometry.routeCore.coordinateSetSha256 === hashCells(routeCore),
  exactStages: stages.length === 2 && stages[0]?.id === 'shell-gravity-lock' && stages[0]?.forwardOps.length === 1638 && stages[1]?.id === 'core-clear-top-down' && stages[1]?.forwardOps.length === 3227
    && operations.length === 4865 && duplicateForwardTargets === 0 && stages.every(({ count, forwardOps, rollbackOps, exactInverse }) => count === forwardOps.length && rollbackOps.length === forwardOps.length && exactInverse) && rollbackInverseFailures.length === 0,
  sourceStateAndGuards: sourceRecords.length === 6921 && sourceStateFailures.length === 0 && sourceGuardFailures.length === 0 && actualFluids.length === 0
    && manifest.hazards.unknownAir.length === 0 && unownedSourceAir.length === 0,
  projectedCore: coreProjectedNonAir.length === 0,
  exactInterfaces: manifest.ownership.ingress.count === 30 && manifest.ownership.migration.count === 36 && manifest.ownership.preservedHigh15RouteAir.count === 36
    && operations.filter(({ point: cell }) => manifest.ownership.ingress.cells.some((ingress) => key(ingress) === key(cell))).length === 0
    && operations.filter(({ point: cell }) => manifest.ownership.preservedHigh15RouteAir.cells.some((air) => key(air) === key(cell))).length === 0
    && acceptance.acceptedInterfaces?.protectedCobaltWestlightOverlap?.count === 0,
  gravity: manifest.hazards.gravityChains.length === 107 && actualGravity.length === 107 && gravityFailures.length === 0 && acceptance.gravity?.chains === 107 && acceptance.gravity?.failureAction === 'ABORT_BEFORE_STAGE_1',
  protectedCore: manifest.ownership.protectedTargetCount === protectedKeys.size && manifest.ownership.protectedOverlap.length === 0 && protectedOverlap.length === 0,
  blockEntityClearance: blockEntities.length === 0,
  savedEntityHistoricalClearance: savedEntities.length === 0,
};
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const clearance = {
  schemaVersion: 1,
  id: 'sys03-r10-high16-descending-bypass-block-entity-protected-core-clearance',
  status: checks.protectedCore && checks.blockEntityClearance ? 'PASS' : 'FAIL',
  sourceSnapshot: relative(snapshotPath),
  sourceCaptureManifestSha256: sha(captureBytes),
  manifest: { path: relative(manifestPath), sha256: sha(manifestBytes) },
  proposal: { path: relative(proposalPath), sha256: sha(proposalBytes) },
  acceptance: { path: relative(acceptancePath), sha256: sha(readBytes(acceptancePath)) },
  operations: { forwardTargets: operations.length, coordinateSetSha256: hashCells(operations.map(({ point: cell }) => cell)), chunksScanned },
  interactionCoordinateSetSha256: hashCells(interaction),
  interactionCoordinateCount: interaction.length,
  protectedCore: { manifest: relative(manifest.ownership.protectedPath), declaredTargets: manifest.ownership.protectedTargetCount, observedTargets: protectedKeys.size, operationOverlap: protectedOverlap },
  blockEntities: { inInteractionEnvelope: blockEntities.length, overlaps: blockEntities },
  savedEntitiesAtCapture: { inInteractionEnvelope: savedEntities.length, overlaps: savedEntities, notLiveEntityClearance: true },
  readOnly: true,
  worldMutated: false,
  rconCalled: false,
};
const report = {
  schemaVersion: 1,
  id: 'sys03-r10-high16-descending-bypass-independent-static-source-qa',
  status: failures.length ? 'FAIL' : 'PASS',
  sourceSnapshot: relative(snapshotPath),
  sourceCaptureManifestSha256: sha(captureBytes),
  manifest: { path: relative(manifestPath), sha256: sha(manifestBytes) },
  proposal: { path: relative(proposalPath), sha256: sha(proposalBytes) },
  acceptance: { path: relative(acceptancePath), sha256: sha(readBytes(acceptancePath)) },
  checks,
  failures,
  geometry: { stations: manifest.route.stations.length, core: routeCore.length, shell: manifest.geometry.shell.count, halo: manifest.geometry.halo.count, interaction: interaction.length, connectedCore: reached.size },
  stages: Object.fromEntries(stages.map(({ id, forwardOps, rollbackOps }) => [id, { forward: forwardOps.length, rollback: rollbackOps.length }])),
  sourceDrift: { sourceStateFailures, sourceGuardFailures, coreProjectedNonAir, fluids: actualFluids, unownedSourceAir, gravityFailures },
  clearanceReport: relative(clearancePath),
  civilOnly: true,
  passengerServiceCommissioned: false,
  readOnly: true,
  worldMutated: false,
  rconCalled: false,
  liveEntityClearancePerformed: false,
};
for (const file of [outPath, clearancePath, markdownPath].filter(Boolean)) fs.mkdirSync(path.dirname(absolute(file)), { recursive: true });
fs.writeFileSync(absolute(clearancePath), `${JSON.stringify(clearance, null, 2)}\n`);
fs.writeFileSync(absolute(outPath), `${JSON.stringify(report, null, 2)}\n`);
if (markdownPath) fs.writeFileSync(absolute(markdownPath), `# SYS-03 R10 High-16 descending bypass — independent static/source QA\n\n**Status:** \`${report.status}\` — source-only evidence; civil-only and not passenger service.\n\n- Fresh source / manifest / proposal / accepted-renewal binding: ${checks.exactSourceBinding ? 'PASS' : 'FAIL'}.\n- Exact route: ${routeCore.length}/3,257 connected 6×6 core cells; stages ${stages[0].forwardOps.length} then ${stages[1].forwardOps.length}; exact inverses: ${checks.exactStages ? 'PASS' : 'FAIL'}.\n- Source state guards: ${sourceGuardFailures.length} drift; interaction fluids: ${actualFluids.length}; gravity failures: ${gravityFailures.length}.\n- Protected-core overlap / block entities / saved entities at capture: ${protectedOverlap.length} / ${blockEntities.length} / ${savedEntities.length}.\n\nThe saved-entity result is historical snapshot evidence only. A separate same-moment live-entity gate is mandatory immediately before each RCON stage. This report neither authorizes execution nor proves a post-state.\n`);
console.log(JSON.stringify({ status: report.status, clearance: clearance.status, failures, out: relative(outPath), clearanceOut: relative(clearancePath) }, null, 2));
process.exitCode = failures.length ? 1 : 0;
