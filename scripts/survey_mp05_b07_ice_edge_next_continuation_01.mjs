#!/usr/bin/env node
/**
 * Read-only screen for the next B07 continuation after the executed ice-edge
 * receiver.  It deliberately emits no operation: it proves the exact sealed
 * boundary and states required before a later controlled continuation exists.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag, fallback) => { const index = args.indexOf(flag); return index < 0 ? fallback : (args[index + 1] ?? fallback); };
const SNAPSHOT = arg('--snapshot', 'data/worldsnap-mp05-b07-ice-edge-contained-receiver-post-20260827T004000Z');
const LEDGER = arg('--ledger', 'data/world-review/mp05-b07-ice-edge-contained-receiver-live-20260827T004000Z/evidence-ledger.json');
const MANIFEST = arg('--manifest', 'data/buildops/mp05-b07-ice-edge-contained-receiver-01.release-manifest.json');
const OUT = arg('--out-dir', 'data/world-review/mp05-b07-ice-edge-next-continuation-screen-20260827T004000Z');
const MARKDOWN = arg('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-ICE-EDGE-NEXT-CONTINUATION-SCREEN-01-2026-08-27.md');
const GENERATED_AT = arg('--generated-at', '2026-08-27T01:10:00.000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`B07 ice-edge next-continuation screen rejected: ${message}`); };
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const box = (x1, x2, y1, y2, z1, z2) => {
  const cells = [];
  for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) cells.push({ x, y, z });
  return cells;
};
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const symbol = (state) => {
  if (state === 'minecraft:air') return '.';
  if (stateName(state) === 'minecraft:polished_deepslate') return 'B';
  if (stateName(state) === 'minecraft:polished_andesite') return 'D';
  if (stateName(state) === 'minecraft:oak_door') return 'O';
  if (stateName(state) === 'minecraft:water') return 'W';
  if (stateName(state) === 'minecraft:ice') return 'I';
  return '#';
};
const exactCellSet = (cells) => {
  const unique = uniqueCells(cells);
  return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) };
};
const same = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

const ledgerBytes = fs.readFileSync(abs(LEDGER));
const manifestBytes = fs.readFileSync(abs(MANIFEST));
const ledger = JSON.parse(ledgerBytes);
const manifest = JSON.parse(manifestBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'executed post-state ledger is absent');
fail(ledger.releaseNodeId === 'CZ-MP05-B07-ICE-EDGE-CONTAINED-RECEIVER' && ledger.transactionId === 'mp05-b07-ice-edge-contained-receiver-01', 'executed release identity drifted');
fail(ledger.manifest?.sha256 === sha(manifestBytes), 'ledger-to-manifest binding drifted');
fail(abs(ledger.postSnapshot?.root) === abs(SNAPSHOT) && abs(ledger.postSnapshot?.regions) === abs(path.join(SNAPSHOT, 'region')), 'ledger does not bind the supplied post snapshot');
fail(same(manifest.executionOrder?.forward ?? [], ['exterior-bulkhead-and-side-containment', 'ice-edge-receiver-deck-and-roof']), 'accepted containment-before-access execution order drifted');
const identityPath = ledger.postSnapshot?.identity?.path;
fail(identityPath && sha(fs.readFileSync(abs(identityPath))) === ledger.postSnapshot.identity.sha256, 'post identity drifted');
const capturePath = path.join(abs(SNAPSHOT), 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length, 'post snapshot is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(abs(SNAPSHOT), member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `snapshot member drifted: ${member.path}`);
}

const reader = new AnvilReader(path.join(abs(SNAPSHOT), 'region'));
const cache = new Map();
const get = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const bulkhead = box(2106, 2110, 62, 65, -372, -372);
const sideContainment = uniqueCells([
  ...box(2106, 2106, 63, 65, -380, -373),
  ...box(2110, 2110, 63, 65, -380, -373),
]);
const dryCore = box(2107, 2109, 63, 64, -380, -373);
const controlledDoors = box(2107, 2108, 63, 64, -381, -381);
const apertureForNormalContinuation = box(2107, 2109, 63, 64, -372, -372);
const retainedWater = [
  { id: 'W1', x: 2105, y: 62, z: -372 },
  { id: 'W2', x: 2106, y: 62, z: -371 },
  { id: 'W3', x: 2107, y: 62, z: -371 },
  { id: 'W4', x: 2108, y: 62, z: -371 },
];
const exactCheck = async (label, cells, expected) => {
  const records = await Promise.all(cells.map(async (cell) => ({ cell, state: await get(cell) })));
  return { label, expected, ...exactCellSet(cells), failures: records.filter(({ state }) => state !== expected), pass: records.every(({ state }) => state === expected) };
};
const checks = [
  await exactCheck('sealed five-wide exterior bulkhead', bulkhead, 'minecraft:polished_deepslate'),
  await exactCheck('sealed receiver side containment', sideContainment, 'minecraft:polished_deepslate'),
  await exactCheck('dry receiver core', dryCore, 'minecraft:air'),
];
const doorRecords = await Promise.all(controlledDoors.map(async (cell) => ({ cell, state: await get(cell) })));
const waterRecords = await Promise.all(retainedWater.map(async ({ id, ...cell }) => ({ id, cell, state: await get(cell) })));
const apertureRecords = await Promise.all(apertureForNormalContinuation.map(async (cell) => ({ cell, state: await get(cell) })));
const immediateNorthFloor = box(2107, 2109, 62, 62, -371, -371);
const northFloorRecords = await Promise.all(immediateNorthFloor.map(async (cell) => ({ cell, state: await get(cell) })));
const reportEnvelope = uniqueCells([
  ...bulkhead,
  ...sideContainment,
  ...dryCore,
  ...controlledDoors,
  ...retainedWater.map(({ id, ...cell }) => cell),
  ...apertureForNormalContinuation,
  ...immediateNorthFloor,
]);
const envelopeFluidRecords = [];
for (const cell of reportEnvelope) { const state = await get(cell); if (fluid(state)) envelopeFluidRecords.push({ cell, state }); }
const currentReceiverUsable = checks.every(({ pass }) => pass) && doorRecords.every(({ state }) => state.startsWith('minecraft:oak_door[')) && envelopeFluidRecords.every(({ cell }) => cell.y === 62 && cell.z <= -371);
const continuationRequiresBreach = apertureRecords.every(({ state }) => state === 'minecraft:polished_deepslate');
const retainedSourcesExact = waterRecords.every(({ state }) => state === 'minecraft:water[level=0]');
const nextFloorIntersectsRetainedWater = northFloorRecords.some(({ state }) => fluid(state));
fail(currentReceiverUsable && continuationRequiresBreach && retainedSourcesExact && nextFloorIntersectsRetainedWater, 'post state no longer supports the bounded hard-stop finding');

const planX = range(2103, 2112);
const planZ = range(-383, -370);
const plan = [];
for (const z of planZ) plan.push({ z, cells: await Promise.all(planX.map(async (x) => ({ x, state: await get({ x, y: 62, z }) }))) });
const sectionY = range(61, 66).reverse();
const section = [];
for (const y of sectionY) section.push({ y, cells: await Promise.all(planZ.map(async (z) => ({ z, state: await get({ x: 2108, y, z }) }))) });
const svg = (title, subtitle, rows, axis, values) => {
  const size = 26; const left = 110; const top = 78;
  const width = left + values.length * size + 35; const height = top + rows.length * size + 78;
  const colors = { '.': '#edf2f7', B: '#263b4b', D: '#7d92a6', O: '#b7791f', W: '#1670b7', I: '#b9e5f5', '#': '#66717d' };
  const labels = values.map((value, index) => `<text x="${left + index * size + 13}" y="63" text-anchor="middle" class="tiny">${value}</text>`).join('');
  const body = rows.map((row, rowIndex) => {
    const label = axis === 'z' ? row.z : row.y;
    const cells = row.cells.map((cell, index) => `<rect x="${left + index * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${colors[symbol(cell.state)]}"/><text x="${left + index * size + 13}" y="${top + rowIndex * size + 18}" text-anchor="middle" class="cell">${symbol(cell.state)}</text>`).join('');
    return `<text x="${left - 9}" y="${top + rowIndex * size + 18}" text-anchor="end" class="tiny">${label}</text>${cells}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 16px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:10px monospace;fill:#243746}.cell{font:700 13px monospace;fill:#fff}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="24" class="title">${title}</text><text x="16" y="44" class="sub">${subtitle}</text>${labels}${body}</svg>`;
};

const report = {
  schemaVersion: 1,
  id: 'MP05-B07-ICE-EDGE-NEXT-CONTINUATION-SCREEN-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_NO_NEXT_B07_ICE_EDGE_CONTINUATION_OPERATION',
  purpose: 'Prove the post-receiver endpoint boundary and exact preconditions for a later controlled return or receiver continuation. This is a read-only hard-stop screen, not a design or release authority.',
  source: {
    postSnapshot: { root: SNAPSHOT, capture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId }, identity: ledger.postSnapshot.identity },
    executedLedger: { path: LEDGER, sha256: sha(ledgerBytes) },
    executedManifest: { path: MANIFEST, sha256: sha(manifestBytes) },
  },
  coordinateMap: { plan: { y: 62, x: [2103, 2112], z: [-383, -370] }, section: { x: 2108, y: [61, 66], z: [-383, -370] } },
  existingFunctionalEndpoint: {
    classification: manifest.functionalAcceptance?.classification,
    controlledSouthDoorHandoff: doorRecords,
    dryReceiverCore: exactCellSet(dryCore),
    receiverCoreFluidRecords: envelopeFluidRecords.filter(({ cell }) => dryCore.some((core) => cellKey(core) === cellKey(cell))),
    exactPostChecks: checks,
    usableAsRestrictedInspectionEndpoint: currentReceiverUsable,
  },
  continuationBoundary: {
    sealedBulkhead: exactCellSet(bulkhead),
    normalThreeWideTwoHighApertureRequiredToContinueNorth: { ...exactCellSet(apertureForNormalContinuation), sourceRecords: apertureRecords, allSealedBulkhead: continuationRequiresBreach },
    immediateNorthFloor: { ...exactCellSet(immediateNorthFloor), sourceRecords: northFloorRecords, containsFluid: nextFloorIntersectsRetainedWater },
    retainedWaterSources: waterRecords,
    retainedSourcesExact,
    disposition: 'NO_OPERATION: a normal northward continuation would breach six bulkhead cells and then encounter retained water at its immediate floor boundary. The current package intentionally ends here.',
  },
  futureBoundaryConditions: [
    'Keep the existing five-wide bulkhead and all four retained source-water cells unchanged unless a separately scoped containment package proves its own finite liquid boundary before any aperture is created.',
    'A future continuation must define a distinct owned destination/return receiver, controlled failure state, and a normal three-wide, two-clear-high path; the existing restricted inspection endpoint is not that destination.',
    'Any future floor at Z=-371 must first contain, support, and specify the retained water-source treatment. It may not replace or expose water by an access-first operation.',
    'A future package must use a fresh complete source, canonical source/target/rollback states, protected-core and live-entity clearance, strict-noop forward/rollback checks, journaled execution, fresh post capture, and independent route/fluid QA.',
  ],
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, executionAuthorityEmitted: false, publicAccessCommissioned: false, emergencyEgressCommissioned: false },
};
report.reportSha256 = sha(JSON.stringify(report));
fs.mkdirSync(abs(OUT), { recursive: true });
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'ice-edge-next-continuation-screen.json')), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'ice-edge-next-continuation-plan-y62.svg')), svg('B07 ice-edge continuation hard-stop — plan at Y=62', 'B sealed bulkhead · D dry deck · W retained water · no forward operation exists', plan, 'z', planX));
fs.writeFileSync(abs(path.join(OUT, 'ice-edge-next-continuation-section-x2108.svg')), svg('B07 ice-edge continuation hard-stop — section at X=2108', 'Any normal northward continuation breaches B at Z=-372 before its floor meets W at Z=-371', section, 'y', planZ));
fs.writeFileSync(abs(MARKDOWN), `# MP05 B07 ice-edge receiver — next continuation screen\n\n**Status:** \`SOURCE_BOUND_NO_NEXT_B07_ICE_EDGE_CONTINUATION_OPERATION\`  \n**Bound post snapshot:** \`${SNAPSHOT}\`  \n**Read-only:** yes — no RCON/live call, world mutation, operation file, or execution authority.\n\n- [Machine report](../../../${rel(path.join(OUT, 'ice-edge-next-continuation-screen.json'))})\n- [Plan at Y=62](../../../${rel(path.join(OUT, 'ice-edge-next-continuation-plan-y62.svg'))})\n- [Section at X=2108](../../../${rel(path.join(OUT, 'ice-edge-next-continuation-section-x2108.svg'))})\n\nThe current B07 construction is already a complete restricted inspection endpoint: the 48-cell core is dry, the controlled south door handoff is retained, and the Z=-372 exterior bulkhead is exact. A normal three-wide/two-high continuation north would first remove six sealed bulkhead cells and then meet retained source water at its immediate Z=-371 floor. That is access-first fluid exposure, not a finite continuation.\n\nThe retained source-water boundary is W1 \`(2105,62,-372)\`, W2 \`(2106,62,-371)\`, W3 \`(2107,62,-371)\`, and W4 \`(2108,62,-371)\`; all are exactly \`minecraft:water[level=0]\`. The next physical scope, if one is selected later, must be a new liner/receiver/return system that contains this boundary before changing any aperture or floor cell. It also needs a fresh immutable source and full guarded-release kernel.\n`);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT, 'ice-edge-next-continuation-screen.json')), markdown: rel(MARKDOWN), reportSha256: report.reportSha256, operationFiles: 0 }, null, 2));
