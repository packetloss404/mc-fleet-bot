#!/usr/bin/env node
/** Read-only current-post scout for the disjoint SYS03 West High continuation frontier. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag, fallback) => { const index = args.indexOf(flag); return index < 0 ? fallback : (args[index + 1] ?? fallback); };
const POST = arg('--snapshot', 'data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z');
const POST_LEDGER = arg('--post-ledger', 'data/world-review/mp02-b08-surface-recovery-landing-live-20260827T005500Z/evidence-ledger.json');
const CONTRACT = arg('--prior-contract', 'data/world-review/sys03-high16-west-high-hydrology-ownership-contract-20260826T153100Z/sys03-high16-west-high-hydrology-ownership-contract-01.json');
const OUT = arg('--out-dir', 'data/world-review/sys03-west-high-containment-frontier-current-b08-post-20260827T005500Z');
const MARKDOWN = arg('--markdown-out', 'docs/masterplans/05-combined-zones/SYS03-WEST-HIGH-CONTAINMENT-FRONTIER-01-2026-08-27.md');
const GENERATED_AT = arg('--generated-at', '2026-08-27T01:30:00.000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 West High frontier rejected: ${message}`); };
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const box = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (const x of range(minX, maxX)) for (const y of range(minY, maxY)) for (const z of range(minZ, maxZ)) cells.push({ x, y, z });
  return cells;
};
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:scaffolding', 'minecraft:anvil']);
const exactSet = (cells) => { const unique = uniqueCells(cells); return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) }; };
const symbol = (state) => {
  if (state === 'minecraft:air') return '.';
  if (stateName(state) === 'minecraft:water') return 'W';
  if (stateName(state) === 'minecraft:gravel') return 'G';
  if (stateName(state) === 'minecraft:polished_deepslate') return 'D';
  return '#';
};

const ledgerBytes = fs.readFileSync(abs(POST_LEDGER));
const ledger = JSON.parse(ledgerBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'latest complete post ledger is not accepted');
fail(abs(ledger.postSnapshot?.root) === abs(POST) && abs(ledger.postSnapshot?.regions) === abs(path.join(POST, 'region')), 'post ledger does not bind supplied snapshot');
const identityPath = ledger.postSnapshot?.identity?.path;
fail(identityPath && sha(fs.readFileSync(abs(identityPath))) === ledger.postSnapshot.identity.sha256, 'post identity drifted');
const capturePath = path.join(abs(POST), 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length, 'post snapshot is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(abs(POST), member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `snapshot member drifted: ${member.path}`);
}
const contractBytes = fs.readFileSync(abs(CONTRACT));
const contract = JSON.parse(contractBytes);
const held = contract.scope.heldWestHighCore.bounds;
const heldCore = box(held.minX, held.maxX, held.minY, held.maxY, held.minZ, held.maxZ);
const reader = new AnvilReader(path.join(abs(POST), 'region'));
const cache = new Map();
const get = async (cell) => {
  const key = `${cell.x},${cell.y},${cell.z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const coreRecords = await Promise.all(heldCore.map(async (cell) => ({ cell, state: await get(cell) })));
const seedWater = coreRecords.filter(({ state }) => stateName(state) === 'minecraft:water');
const coreGravity = coreRecords.filter(({ state }) => gravity.has(stateName(state)));
const oldSeed = contract.exactHydrology.sourceSeedWater.cells.map(({ point, state }) => ({ cell: point, state }));
const oldSeedKeys = new Map(oldSeed.map(({ cell, state }) => [`${cell.x},${cell.y},${cell.z}`, state]));
const currentSeedExact = seedWater.length === oldSeed.length && seedWater.every(({ cell, state }) => oldSeedKeys.get(`${cell.x},${cell.y},${cell.z}`) === state);
const gravityTargets = [...contract.exactGravity.core, ...contract.exactGravity.shell, ...contract.exactGravity.halo];
const gravityRecords = await Promise.all(gravityTargets.map(async ({ target, terminal }) => ({ target, sourceState: await get(target), terminal, terminalState: await get(terminal.point) })));
const gravityTargetExact = gravityRecords.every(({ sourceState }) => gravity.has(stateName(sourceState)));
const gravitySourceSupported = gravityRecords.every(({ terminalState }) => !fluid(terminalState) && terminalState !== 'minecraft:air');

const traceCap = 50000;
const queue = seedWater.map(({ cell }) => cell);
const visited = new Set(queue.map(({ x, y, z }) => `${x},${y},${z}`));
const component = [];
while (queue.length && component.length < traceCap) {
  const cell = queue.shift(); const state = await get(cell); if (!fluid(state)) continue;
  component.push({ cell, state });
  for (const next of [{ x: cell.x + 1, y: cell.y, z: cell.z }, { x: cell.x - 1, y: cell.y, z: cell.z }, { x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y - 1, z: cell.z }, { x: cell.x, y: cell.y, z: cell.z + 1 }, { x: cell.x, y: cell.y, z: cell.z - 1 }]) {
    const key = `${next.x},${next.y},${next.z}`;
    if (!visited.has(key) && fluid(await get(next))) { visited.add(key); queue.push(next); }
  }
}
const traceComplete = queue.length === 0;
const b07WaterBoundary = { minX: 2105, maxX: 2110, minY: 62, maxY: 65, minZ: -372, maxZ: -371 };
const spatiallyDisjointFromB07 = held.maxX < b07WaterBoundary.minX || held.minX > b07WaterBoundary.maxX || held.maxY < b07WaterBoundary.minY || held.minY > b07WaterBoundary.maxY || held.maxZ < b07WaterBoundary.minZ || held.minZ > b07WaterBoundary.maxZ;
fail(currentSeedExact && gravityTargetExact && gravitySourceSupported, 'current source no longer matches the finite held fluid/gravity finding');
const planX = range(-216, -208); const planZ = range(-474, -465); const plan = [];
for (const z of planZ) plan.push({ z, cells: await Promise.all(planX.map(async (x) => ({ x, state: await get({ x, y: 47, z }) }))) });
const sectionY = range(40, 49).reverse(); const section = [];
for (const y of sectionY) section.push({ y, cells: await Promise.all(planZ.map(async (z) => ({ z, state: await get({ x: -212, y, z }) }))) });
const svg = (title, subtitle, rows, axis, values) => {
  const size = 26; const left = 110; const top = 76; const width = left + values.length * size + 35; const height = top + rows.length * size + 74;
  const colors = { '.': '#edf2f7', W: '#1670b7', G: '#bd6a47', D: '#334e68', '#': '#708090' };
  const labels = values.map((value, index) => `<text x="${left + index * size + 13}" y="61" text-anchor="middle" class="tiny">${value}</text>`).join('');
  const body = rows.map((row, rowIndex) => {
    const label = axis === 'z' ? row.z : row.y;
    const cells = row.cells.map((cell, index) => `<rect x="${left + index * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${colors[symbol(cell.state)]}"/><text x="${left + index * size + 13}" y="${top + rowIndex * size + 18}" text-anchor="middle" class="cell">${symbol(cell.state)}</text>`).join('');
    return `<text x="${left - 10}" y="${top + rowIndex * size + 18}" text-anchor="end" class="tiny">${label}</text>${cells}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 16px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:10px monospace;fill:#243746}.cell{font:700 13px monospace;fill:#fff}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="24" class="title">${title}</text><text x="16" y="43" class="sub">${subtitle}</text>${labels}${body}</svg>`;
};
const report = {
  schemaVersion: 1,
  id: 'SYS03-WEST-HIGH-CONTAINMENT-FRONTIER-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_SUBSTANTIVE_FRONTIER_HELD_FOR_CONTAINMENT_FIRST',
  candidate: { id: 'SYS03-WEST-HIGH-6X6-CIVIL-CORRIDOR-CONTINUATION', purpose: 'A 720-cell six-by-six high-corridor continuation prospect. Civil-only; no rail, passenger, public, or service opening.' },
  source: { postSnapshot: { root: POST, capture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId }, identity: ledger.postSnapshot.identity }, postLedger: { path: POST_LEDGER, sha256: sha(ledgerBytes) }, predecessorHoldContract: { path: CONTRACT, sha256: sha(contractBytes) } },
  disjointness: { b07IceEdgeWaterBoundary: b07WaterBoundary, candidateHeldCore: exactSet(heldCore), spatiallyDisjointFromB07, rule: 'This scout does not target, trace, or modify the B07 water boundary.' },
  currentFluidAndGravity: { waterSeeds: { ...exactSet(seedWater.map(({ cell }) => cell)), records: seedWater }, seedSetMatchesPriorSource: currentSeedExact, waterComponent: { ...exactSet(component.map(({ cell }) => cell)), cellCount: component.length, traceCap, traceComplete }, gravityTargets: { expectedCount: contract.exactGravity.totalTargetCount, observedCount: gravityRecords.length, sourceStatesAllGravity: gravityTargetExact, sourceSupportTerminalsAllNonAirNonFluid: gravitySourceSupported, coreGravityCellCount: coreGravity.length }, passForContainmentFreeOperation: false },
  requiredBeforeOperationCompilation: [
    'Finite source-to-treatment-to-receiver containment design for the entire current water component, with no uncontrolled discharge.',
    'Flow-ordered liner/receiver forward sequence and inverse order that never recreates an uncontrolled water path.',
    'Exact gravity support proof after every forward and rollback stage.',
    'Fresh same-invocation source, protected-core and entity clearances, strict no-op forward/rollback preflights, journaled execution, fresh post capture, and independent fluid/route QA.',
  ],
  safetyBoundary: { readOnly: true, rconCalled: false, worldMutated: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, executionAuthorityEmitted: false, passengerServiceCommissioned: false },
};
report.reportSha256 = sha(JSON.stringify(report));
fs.mkdirSync(abs(OUT), { recursive: true }); fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'sys03-west-high-containment-frontier.json')), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'west-high-plan-y47.svg')), svg('SYS03 West High containment frontier — plan at Y=47', 'W retained water · G gravel · D existing civil shell · read-only, no operations', plan, 'z', planX));
fs.writeFileSync(abs(path.join(OUT, 'west-high-section-x212.svg')), svg('SYS03 West High containment frontier — section at X=-212', 'W retained water and G gravity require a finite containment-first future package', section, 'y', planZ));
fs.writeFileSync(abs(MARKDOWN), `# SYS03 West High containment frontier — current-source scout\n\n**Status:** \`SOURCE_BOUND_SUBSTANTIVE_FRONTIER_HELD_FOR_CONTAINMENT_FIRST\`  \n**Bound current post:** \`${POST}\`  \n**Read-only:** yes — no RCON, world mutation, operation file, or release authority.\n\n- [Machine report](../../../${rel(path.join(OUT, 'sys03-west-high-containment-frontier.json'))})\n- [Plan at Y=47](../../../${rel(path.join(OUT, 'west-high-plan-y47.svg'))})\n- [Section at X=-212](../../../${rel(path.join(OUT, 'west-high-section-x212.svg'))})\n\nThis is a substantive 6×6 civil-corridor frontier, fully spatially disjoint from the B07 ice-edge water boundary. The fresh source retains 16 exact water seeds in the held core and the trace is ${component.length} water cells${traceComplete ? '' : ' (trace cap reached)'}. It also retains ${gravityRecords.length} exact gravity targets with current non-air/non-fluid support terminals.\n\nThe scope is therefore **not operation-ready**: water and gravity must be treated as one finite, liner-first source → treatment → receiver → rollback system before any corridor cell is touched. It makes no rail, public, service, passenger, or commissioning claim.\n`);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT, 'sys03-west-high-containment-frontier.json')), markdown: rel(MARKDOWN), waterComponentCells: component.length, gravityTargets: gravityRecords.length, operationFiles: 0 }, null, 2));
