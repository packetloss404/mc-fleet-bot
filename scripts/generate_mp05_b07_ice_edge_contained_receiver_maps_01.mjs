#!/usr/bin/env node
/** Read-only, immutable-post coordinate maps for the executed B07 ice-edge receiver. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = 'data/worldsnap-mp05-b07-ice-edge-contained-receiver-post-20260827T004000Z';
const LEDGER = 'data/world-review/mp05-b07-ice-edge-contained-receiver-live-20260827T004000Z/evidence-ledger.json';
const MANIFEST = 'data/buildops/mp05-b07-ice-edge-contained-receiver-01.release-manifest.json';
const OUT = 'docs/masterplans/05-combined-zones/02-visuals/mp05-b07-ice-edge-contained-receiver-01';
const BULKHEAD_PACKAGE = 'exterior-bulkhead-and-side-containment';
const RECEIVER_PACKAGE = 'ice-edge-receiver-deck-and-roof';
const WATER = [
  { x: 2105, y: 62, z: -372 },
  { x: 2106, y: 62, z: -371 },
  { x: 2107, y: 62, z: -371 },
  { x: 2108, y: 62, z: -371 },
];
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`B07 ice-edge receiver map rejected: ${message}`); };
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const key = ({ x, y, z }) => `${x},${y},${z}`;
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const symbol = (state) => {
  if (state === 'minecraft:air') return '.';
  if (stateName(state) === 'minecraft:polished_deepslate') return 'B';
  if (stateName(state) === 'minecraft:polished_andesite') return 'D';
  if (stateName(state) === 'minecraft:oak_door') return 'O';
  if (fluid(state)) return 'W';
  if (stateName(state) === 'minecraft:ice') return 'I';
  return '#';
};
const box = (x1, x2, y1, y2, z1, z2) => {
  const output = [];
  for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) output.push({ x, y, z });
  return output;
};
const exact = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

const ledgerBytes = fs.readFileSync(abs(LEDGER));
const manifestBytes = fs.readFileSync(abs(MANIFEST));
const ledger = JSON.parse(ledgerBytes);
const manifest = JSON.parse(manifestBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'ledger is not an executed reversible post-state');
fail(ledger.releaseNodeId === 'CZ-MP05-B07-ICE-EDGE-CONTAINED-RECEIVER' && ledger.transactionId === 'mp05-b07-ice-edge-contained-receiver-01', 'release identity drifted');
fail(ledger.manifest?.sha256 === sha(manifestBytes), 'ledger manifest binding drifted');
fail(abs(ledger.postSnapshot?.root) === abs(POST) && abs(ledger.postSnapshot?.regions) === abs(path.join(POST, 'region')), 'ledger does not bind this immutable post snapshot');
fail(exact(manifest.executionOrder?.forward ?? [], [BULKHEAD_PACKAGE, RECEIVER_PACKAGE]), 'forward order is not bulkhead before receiver deck/roof');
fail(exact(manifest.executionOrder?.rollback ?? [], [RECEIVER_PACKAGE, BULKHEAD_PACKAGE]), 'rollback order is not receiver deck/roof before bulkhead');
const identityPath = ledger.postSnapshot?.identity?.path;
fail(identityPath && sha(fs.readFileSync(abs(identityPath))) === ledger.postSnapshot.identity.sha256, 'post snapshot identity drifted');
const capturePath = path.join(abs(POST), 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'post capture is incomplete or mutable');
for (const member of capture.requiredMembers) {
  const filename = path.join(abs(POST), member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `post member drifted: ${member.path}`);
}
const requiredStages = [
  'strict-forward-execution:exterior-bulkhead-and-side-containment',
  'strict-forward-execution:ice-edge-receiver-deck-and-roof',
  'fresh-post-complete-save',
  'rollback-poststate-preflight:ice-edge-receiver-deck-and-roof',
  'rollback-poststate-preflight:exterior-bulkhead-and-side-containment',
];
for (const stage of requiredStages) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `ledger stage missing: ${stage}`);

const reader = new AnvilReader(path.join(abs(POST), 'region'));
const get = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const bulkhead = box(2106, 2110, 62, 65, -372, -372);
const sideContainment = [
  ...box(2106, 2106, 63, 65, -380, -373),
  ...box(2110, 2110, 63, 65, -380, -373),
];
const deck = box(2107, 2109, 62, 62, -380, -373);
const roof = box(2107, 2109, 65, 65, -380, -373);
const clearCore = box(2107, 2109, 63, 64, -380, -373);
const checkExact = async (label, targetCells, expected) => {
  const observed = await Promise.all(targetCells.map(({ x, y, z }) => get(x, y, z)));
  const failures = observed.filter((state) => state !== expected).length;
  return { label, expected, cellCount: targetCells.length, failures, pass: failures === 0 };
};
const checks = await Promise.all([
  checkExact('five-wide exterior bulkhead', bulkhead, 'minecraft:polished_deepslate'),
  checkExact('side containment', sideContainment, 'minecraft:polished_deepslate'),
  checkExact('receiver deck', deck, 'minecraft:polished_andesite'),
  checkExact('receiver roof', roof, 'minecraft:polished_deepslate'),
  checkExact('dry clear receiver core', clearCore, 'minecraft:air'),
]);
const waterStates = await Promise.all(WATER.map(({ x, y, z }) => get(x, y, z)));
const waterExact = waterStates.every((state) => state === 'minecraft:water[level=0]');
const bulkheadKeys = new Set(bulkhead.map(key));
const waterOutsideBulkhead = WATER.every((cell) => !bulkheadKeys.has(key(cell)));
const interiorFluids = [];
for (const cell of clearCore) {
  const state = await get(cell.x, cell.y, cell.z);
  if (fluid(state)) interiorFluids.push({ cell, state });
}
fail(checks.every(({ pass }) => pass), `post state mismatch: ${checks.filter(({ pass }) => !pass).map(({ label }) => label).join(', ')}`);
fail(waterExact && waterOutsideBulkhead && interiorFluids.length === 0, 'fluid containment boundary is not exact');

const planX = range(2104, 2111);
const planZ = range(-382, -370);
const plan = [];
for (const z of planZ) plan.push({ z, cells: await Promise.all(planX.map(async (x) => ({ x, state: await get(x, 62, z) }))) });
const sectionZ = range(-382, -370);
const sectionY = range(61, 66).reverse();
const section = [];
for (const y of sectionY) section.push({ y, cells: await Promise.all(sectionZ.map(async (z) => ({ z, state: await get(2107, y, z) }))) });

const svg = (title, subtitle, rows, axis, values) => {
  const size = 28; const left = 110; const top = 76;
  const width = left + values.length * size + 35; const height = top + rows.length * size + 78;
  const color = { '.': '#e7eef5', B: '#243746', D: '#8fa2b2', O: '#b88746', W: '#1670b7', I: '#bce8fa', '#': '#66717d' };
  const labels = values.map((value, index) => `<text x="${left + index * size + 14}" y="62" text-anchor="middle" class="tiny">${value}</text>`).join('');
  const body = rows.map((row, rowIndex) => {
    const rowValue = axis === 'z' ? row.z : row.y;
    const each = row.cells.map((cell, index) => `<rect x="${left + index * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${color[symbol(cell.state)]}"/><text x="${left + index * size + 14}" y="${top + rowIndex * size + 19}" text-anchor="middle" class="cell">${symbol(cell.state)}</text>`).join('');
    return `<text x="${left - 10}" y="${top + rowIndex * size + 19}" text-anchor="end" class="tiny">${rowValue}</text>${each}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 16px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:10px monospace;fill:#243746}.cell{font:700 14px monospace;fill:#fff}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="24" class="title">${title}</text><text x="16" y="43" class="sub">${subtitle}</text>${labels}${body}</svg>`;
};
const evidence = {
  schemaVersion: 1,
  id: 'mp05-b07-ice-edge-contained-receiver-01-coordinate-map-evidence',
  readOnly: true,
  worldMutated: false,
  postBinding: {
    ledger: { path: LEDGER, sha256: sha(ledgerBytes) },
    manifest: { path: MANIFEST, sha256: sha(manifestBytes) },
    postSnapshot: { root: POST, capture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId }, identity: ledger.postSnapshot.identity },
  },
  geometry: {
    plan: { y: 62, x: [2104, 2111], z: [-382, -370] },
    section: { x: 2107, y: [61, 66], z: [-382, -370] },
    bulkhead: { x: [2106, 2110], y: [62, 65], z: -372, cellCount: bulkhead.length },
    retainedWaterSources: WATER.map((cell, index) => ({ id: `W${index + 1}`, ...cell, state: waterStates[index] })),
  },
  containmentBeforeAccess: {
    requiredForwardOrder: [BULKHEAD_PACKAGE, RECEIVER_PACKAGE],
    recordedForwardOrder: manifest.executionOrder.forward,
    requiredRollbackOrder: [RECEIVER_PACKAGE, BULKHEAD_PACKAGE],
    recordedRollbackOrder: manifest.executionOrder.rollback,
    checks,
    fourRetainedWaterSourcesExact: waterExact,
    retainedWaterSourcesStrictlyOutsideBulkhead: waterOutsideBulkhead,
    fluidCellsInsideDryReceiverCore: interiorFluids,
    pass: checks.every(({ pass }) => pass) && waterExact && waterOutsideBulkhead && interiorFluids.length === 0,
    rule: 'The sealed exterior bulkhead and side containment were executed before the deck/roof package. Four water sources remain exact outside that bulkhead; no fluid is accepted inside the dry receiver core.',
  },
  operationalBoundary: {
    classification: manifest.functionalAcceptance?.classification,
    controlledSouthDoorHandoff: manifest.functionalAcceptance?.controlledSouthDoorHandoff === true,
    exteriorBulkheadClosed: manifest.functionalAcceptance?.exteriorBulkheadClosed === true,
    publicAccessCommissioned: manifest.functionalAcceptance?.publicAccessCommissioned === true,
    emergencyEgressCommissioned: manifest.functionalAcceptance?.emergencyEgressCommissioned === true,
    terrainDischargeCommissioned: manifest.functionalAcceptance?.terrainDischargeCommissioned === true,
  },
};
evidence.evidenceSha256 = sha(JSON.stringify(evidence));
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'ice-edge-contained-receiver-plan-y62.svg')), svg('B07 ice-edge contained receiver — plan at Y=62', `Immutable post ${POST} · B sealed bulkhead/containment · D dry deck · W retained water outside bulkhead`, plan, 'z', planX));
fs.writeFileSync(abs(path.join(OUT, 'ice-edge-contained-receiver-section-x2107.svg')), svg('B07 ice-edge contained receiver — section at X=2107', 'B bulkhead/roof · D deck · O retained controlled door · W retained water outside bulkhead', section, 'y', sectionZ));
fs.writeFileSync(abs(path.join(OUT, 'ice-edge-contained-receiver-evidence.json')), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'README.md')), `# MP05 B07 ice-edge contained receiver — coordinate maps\n\nBound post snapshot: \`${POST}\`. These are read-only renderings of the executed, post-verified receiver.\n\n- [Plan at Y=62](ice-edge-contained-receiver-plan-y62.svg)\n- [Long section at X=2107](ice-edge-contained-receiver-section-x2107.svg)\n- [Post binding and containment evidence](ice-edge-contained-receiver-evidence.json)\n\nThe plan and section show the five-wide sealed bulkhead at Z=-372. Its containment package executed first; the deck/roof package followed. The four retained \`water[level=0]\` sources are W1 \`(2105,62,-372)\`, W2 \`(2106,62,-371)\`, W3 \`(2107,62,-371)\`, and W4 \`(2108,62,-371)\`: each is outside the bulkhead, while the receiver core is exactly dry. This remains a restricted B07 inspection endpoint, not a public opening, emergency egress, or terrain discharge.\n`);
console.log(JSON.stringify({ status: 'PASS_PUBLISHED_READ_ONLY_B07_ICE_EDGE_CONTAINED_RECEIVER_MAPS', out: rel(OUT), evidenceSha256: evidence.evidenceSha256, postSnapshot: POST }, null, 2));
