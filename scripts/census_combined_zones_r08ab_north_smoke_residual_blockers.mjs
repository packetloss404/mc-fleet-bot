#!/usr/bin/env node
/** Exact projected residual blocker census after the bounded R08AB package. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256,
  stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r08aa-post-20260822T004356Z');
const MANIFEST = value('--manifest',
  'data/buildops/combined-zones-r08ab-empty-eight-north-smoke-far-east-segment.release-manifest.json');
const OUT = value('--out',
  'data/world-review/combined-zones-r08ab-north-smoke-far-east-segment-offline/projected-residual-north-smoke-blocker-census.json');
const MD_OUT = value('--md-out',
  'data/world-review/combined-zones-r08ab-north-smoke-far-east-segment-offline/projected-residual-north-smoke-blocker-census.md');
const GENERATED_AT = value('--generated-at', '2026-08-22T01:10:00Z');
const N06 = 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
  ...['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
    'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']
    .map((colour) => `minecraft:${colour}_concrete_powder`),
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AB residual census rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state));
const census = (records, selector) => {
  const counts = new Map();
  for (const record of records) {
    const key = selector(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
};
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const recordHash = (records) => sha256(`${records.map((record) => (
  `${cellKey(record.cell)}|${record.sourceState}|${record.projectedState}|${record.desiredState}|${record.primaryBlocker}`
)).join('\n')}\n`);
function parsePointOperations(filename) {
  const operations = [];
  for (const [index, line] of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).entries()) {
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename}:${index + 1} malformed`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates[0] === coordinates[3] && coordinates[1] === coordinates[4]
      && coordinates[2] === coordinates[5], `${filename}:${index + 1} is not an exact point operation`);
    operations.push({ cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7], toState: fields[8] });
  }
  return operations;
}
function bands(columns) {
  const output = [];
  for (const column of columns) {
    const signature = `${column.primaryBlocker}|${column.n06Adjacent}`;
    const last = output.at(-1);
    if (last && last.signature === signature && last.maxX + 1 === column.x) {
      last.maxX = column.x;
      last.widthCells += 1;
      last.residualCellCount += column.residualCellCount;
    } else {
      output.push({ signature, minX: column.x, maxX: column.x, widthCells: 1,
        primaryBlocker: column.primaryBlocker, n06Adjacent: column.n06Adjacent,
        residualCellCount: column.residualCellCount });
    }
  }
  return output.map(({ signature, ...record }) => record);
}

const manifest = readJson(MANIFEST);
const n06 = readJson(N06);
invariant(manifest.transactionId === 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment'
  && manifest.status === 'COMPILED_FROM_ACCEPTED_R08AA_POST_AWAITING_FRESH_EXECUTION_KERNEL'
  && manifest.mvpScope === true && manifest.releaseNodeId === 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT'
  && manifest.source.snapshotRoot === SNAPSHOT,
'frozen R08AB manifest/source binding drifted');
const pkg = manifest.packages.find(({ key }) => key === 'ee-smoke-n-far-east-compartment-wall');
invariant(pkg, 'R08AB wall package is absent');
const operations = parsePointOperations(pkg.forward);
invariant(operations.length === 14
  && operations.every(({ fromState, toState }) => fromState === 'minecraft:air'
    && toState === 'minecraft:stone_bricks'),
'R08AB projected operation is not the exact 14-cell air-to-stone package');
const projected = new Map(operations.map(({ cell, toState }) => [cellKey(cell), toState]));
const openingCells = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: 50, maxZ: 50,
}));
const openingKeys = new Set(openingCells.map(cellKey));
const fullPlane = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
const n06Keys = new Set(n06Cells.map(cellKey));
invariant(n06Cells.length === 4, 'N06 exact fail-closed cell set drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key,
    stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
}
async function faceHalo(cells) {
  const keys = new Set(cells.map(cellKey));
  return uniqueCells(cells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))).filter((cell) => !keys.has(cellKey(cell))));
}

const columns = [];
const residual = [];
for (let x = 1652; x <= 1847; x += 1) {
  const cells = cellsIn({ minX: x, maxX: x, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
  const halo = await faceHalo(cells);
  const targetRecords = [];
  for (const cell of cells) {
    const sourceState = await stateAt(cell);
    const projectedState = projected.get(cellKey(cell)) ?? sourceState;
    const desiredState = openingKeys.has(cellKey(cell))
      ? 'minecraft:polished_deepslate' : 'minecraft:stone_bricks';
    targetRecords.push({ cell, sourceState, projectedState, desiredState });
  }
  const haloRecords = [];
  for (const cell of halo) haloRecords.push({ cell, state: await stateAt(cell) });
  const fluidInteractionCells = uniqueCells([
    ...targetRecords.filter(({ sourceState }) => isFluid(sourceState)).map(({ cell }) => cell),
    ...haloRecords.filter(({ state }) => isFluid(state)).map(({ cell }) => cell),
  ]);
  const gravityInteractionCells = uniqueCells([
    ...targetRecords.filter(({ sourceState }) => isGravity(sourceState)).map(({ cell }) => cell),
    ...haloRecords.filter(({ state }) => isGravity(state)).map(({ cell }) => cell),
  ]);
  const n06InteractionCells = halo.filter((cell) => n06Keys.has(cellKey(cell)));
  const columnResidual = targetRecords.filter(({ projectedState, desiredState }) => (
    projectedState !== desiredState
  ));
  if (!columnResidual.length) continue;
  const primaryBlocker = fluidInteractionCells.length ? 'WET_INTERACTION_BAND'
    : gravityInteractionCells.length ? 'GRAVITY_INTERACTION_BAND'
      : 'SOURCE_STATE_BAND';
  const n06Adjacent = n06InteractionCells.length > 0;
  columns.push({ x, primaryBlocker, n06Adjacent,
    residualCellCount: columnResidual.length,
    targetSourceStateCensus: census(targetRecords, ({ sourceState }) => sourceState),
    fluidInteractionCells, gravityInteractionCells, n06InteractionCells });
  residual.push(...columnResidual.map((record) => ({ ...record, primaryBlocker, n06Adjacent,
    openingReservation: openingKeys.has(cellKey(record.cell)) })));
}
residual.sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z);
const wet = residual.filter(({ primaryBlocker }) => primaryBlocker === 'WET_INTERACTION_BAND');
const gravity = residual.filter(({ primaryBlocker }) => primaryBlocker === 'GRAVITY_INTERACTION_BAND');
const sourceState = residual.filter(({ primaryBlocker }) => primaryBlocker === 'SOURCE_STATE_BAND');
const n06Adjacent = residual.filter((record) => record.n06Adjacent);
const openingResidual = residual.filter((record) => record.openingReservation);
invariant(residual.length === 267 && wet.length === 147 && gravity.length === 105
  && sourceState.length === 15 && n06Adjacent.length === 21 && openingResidual.length === 0,
`projected residual partition drifted: ${JSON.stringify({ residual: residual.length,
  wet: wet.length, gravity: gravity.length, sourceState: sourceState.length,
  n06Adjacent: n06Adjacent.length, openingResidual: openingResidual.length })}`);
invariant(columns.length === 41 && columns.every(({ residualCellCount }) => residualCellCount > 0),
'exact residual column set drifted');
const acceptedOpeningCaps = [];
for (const cell of openingCells) {
  const state = projected.get(cellKey(cell)) ?? await stateAt(cell);
  if (state === 'minecraft:polished_deepslate') acceptedOpeningCaps.push(cell);
}
invariant(acceptedOpeningCaps.length === 36,
'one or more frozen static opening caps are not already accepted');

const payload = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08AB_PROJECTED_NORTH_SMOKE_RESIDUAL_BLOCKER_CENSUS',
  source: { snapshotRoot: SNAPSHOT,
    completeSaveSha256: manifest.source.completeSaveSha256,
    regionSnapshotSha256: manifest.source.regionSnapshotSha256,
    terminalReleaseLedger: manifest.source.terminalReleaseLedger },
  projectedRelease: { manifest: MANIFEST, manifestIdentity: manifest.manifestIdentity,
    transactionId: manifest.transactionId, packageKey: pkg.key,
    operationBodySha256: manifest.operations[pkg.key].forwardSha256,
    operationCount: operations.length, targetSet: exactSet(operations.map(({ cell }) => cell)) },
  definition: 'Every EE-SMOKE-N plane cell whose state after exact logical projection of R08AB would still differ from its frozen passive boundary material. Opening reservations require polished_deepslate; all other cells require stone_bricks.',
  summary: { fullPlaneCellCount: fullPlane.length, acceptedOpeningCapCellCount: acceptedOpeningCaps.length,
    projectedR08ABCellCount: operations.length, residualCellCount: residual.length,
    residualColumnCount: columns.length, remainingCleanFullHeightRuns: [],
    primaryPartition: { wetInteractionCellCount: wet.length,
      gravityInteractionCellCount: gravity.length, sourceStateBandCellCount: sourceState.length },
    overlappingAnnotations: { n06GravityAdjacentCellCount: n06Adjacent.length,
      openingReservationResidualCellCount: openingResidual.length },
    residualSourceStateCensus: census(residual, ({ sourceState: state }) => state),
    residualProjectedStateCensus: census(residual, ({ projectedState: state }) => state) },
  exactSets: { allResidual: exactSet(residual.map(({ cell }) => cell)),
    wetInteraction: exactSet(wet.map(({ cell }) => cell)),
    gravityInteraction: exactSet(gravity.map(({ cell }) => cell)),
    sourceStateBand: exactSet(sourceState.map(({ cell }) => cell)),
    n06GravityAdjacent: exactSet(n06Adjacent.map(({ cell }) => cell)),
    openingReservationResidual: exactSet(openingResidual.map(({ cell }) => cell)),
    retainedOpeningCaps: exactSet(acceptedOpeningCaps), exactN06SourceCells: exactSet(n06Cells) },
  residualBands: bands(columns),
  residualColumns: columns,
  residualCells: residual,
  residualRecordSha256: recordHash(residual),
  disposition: { fullPlaneCompletionAuthorized: false,
    reason: 'No source-proven clean full-height run remains after R08AB. The 267 residual cells are confined to wet, gravity/N06-adjacent, or non-air source-state bands and require separate exact dependency engineering.',
    n06RemainsFailClosed: true, wetInterfacesRemainUntouched: true,
    poweredOpeningsRemainStaticCaps: true, worldMutationPerformed: false },
};
payload.censusIdentitySha256 = sha256(JSON.stringify(payload));
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(payload, null, 2)}\n`);
const bandRows = payload.residualBands.map((band) => (
  `| ${band.minX}..${band.maxX} | ${band.residualCellCount} | ${band.primaryBlocker} | ${band.n06Adjacent ? 'yes' : 'no'} |`
)).join('\n');
const md = `# R08AB projected residual north-smoke blocker census\n\n`
  + `Status: **${payload.status}**\n\n`
  + `After projecting the exact 14-cell R08AB package, 267 of 1,372 plane cells remain outside the frozen passive final state. No clean full-height run remains.\n\n`
  + `- Wet-interaction primary partition: 147 cells.\n`
  + `- Gravity-interaction primary partition: 105 cells; 21 are specifically adjacent to the four fail-closed N06 gravel cells.\n`
  + `- Non-air/source-state primary partition: 15 cells.\n`
  + `- Residual opening-reservation cells: 0; all 36 static polished-deepslate caps remain accepted.\n\n`
  + `| X band | Residual cells | Primary blocker | N06 adjacent |\n|---|---:|---|---|\n${bandRows}\n\n`
  + `Census identity: \`${payload.censusIdentitySha256}\`. No live call or world mutation was performed.\n`;
fs.writeFileSync(absolute(MD_OUT), md);
process.stdout.write(`${JSON.stringify({ status: payload.status, out: OUT, mdOut: MD_OUT,
  censusIdentitySha256: payload.censusIdentitySha256, summary: payload.summary,
  worldMutationPerformed: false }, null, 2)}\n`);
