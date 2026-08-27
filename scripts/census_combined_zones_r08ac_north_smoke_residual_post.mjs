#!/usr/bin/env node
/** Exact accepted-post residual blocker census after the bounded R08AC package. */

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
const VARIANT = value('--variant', 'r08ac');
const IS_AD = VARIANT === 'r08ad';
const IS_AE = VARIANT === 'r08ae';
const IS_AF = VARIANT === 'r08af';
const IS_AG = VARIANT === 'r08ag';
const LABEL = IS_AG ? 'R08AG' : IS_AF ? 'R08AF' : IS_AE ? 'R08AE' : IS_AD ? 'R08AD' : 'R08AC';
const SNAPSHOT = value('--snapshot', IS_AD
  ? 'data/worldsnap-combined-zones-r08ad-post-20260822T012919Z'
  : IS_AE ? 'data/worldsnap-combined-zones-r08ae-post-20260822T014336Z'
    : IS_AF ? 'data/worldsnap-r08af-post-20260822T015129Z'
      : IS_AG ? 'data/worldsnap-r08ag-post-20260822T020533Z'
    : 'data/worldsnap-combined-zones-r08ac-post-20260822T011245Z');
const MANIFEST = value('--manifest',
  IS_AD ? 'data/buildops/combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment.release-manifest.json'
    : IS_AE ? 'data/buildops/combined-zones-r08ae-empty-eight-north-smoke-retained-wet-east-segment.release-manifest.json'
      : IS_AF ? 'data/buildops/combined-zones-r08af-empty-eight-north-smoke-far-east-upper-completion.release-manifest.json'
        : IS_AG ? 'data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.release-manifest.json'
      : 'data/buildops/combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment.release-manifest.json');
const LEDGER = value('--ledger',
  IS_AD ? 'data/world-review/combined-zones-r08ad-live-20260822T012919Z/evidence-ledger.json'
    : IS_AE ? 'data/world-review/combined-zones-r08ae-live-20260822T014336Z/evidence-ledger.json'
      : IS_AF ? 'data/world-review/combined-zones-r08af-live-20260822T015129Z/evidence-ledger.json'
        : IS_AG ? 'data/world-review/combined-zones-r08ag-live-20260822T020533Z/evidence-ledger.json'
      : 'data/world-review/combined-zones-r08ac-live-20260822T011245Z/evidence-ledger.json');
const OUT = value('--out',
  IS_AD ? 'data/world-review/combined-zones-r08ad-live-20260822T012919Z/r08ad-accepted-post-residual-north-smoke-census.json'
    : IS_AE ? 'data/world-review/combined-zones-r08ae-live-20260822T014336Z/r08ae-accepted-post-residual-north-smoke-census.json'
      : IS_AF ? 'data/world-review/combined-zones-r08af-live-20260822T015129Z/r08af-accepted-post-residual-north-smoke-census.json'
        : IS_AG ? 'data/world-review/combined-zones-r08ag-live-20260822T020533Z/r08ag-accepted-post-residual-north-smoke-census.json'
      : 'data/world-review/combined-zones-r08ac-live-20260822T011245Z/r08ac-accepted-post-residual-north-smoke-census.json');
const MD_OUT = value('--md-out',
  IS_AD ? 'data/world-review/combined-zones-r08ad-live-20260822T012919Z/r08ad-accepted-post-residual-north-smoke-census.md'
    : IS_AE ? 'data/world-review/combined-zones-r08ae-live-20260822T014336Z/r08ae-accepted-post-residual-north-smoke-census.md'
      : IS_AF ? 'data/world-review/combined-zones-r08af-live-20260822T015129Z/r08af-accepted-post-residual-north-smoke-census.md'
        : IS_AG ? 'data/world-review/combined-zones-r08ag-live-20260822T020533Z/r08ag-accepted-post-residual-north-smoke-census.md'
      : 'data/world-review/combined-zones-r08ac-live-20260822T011245Z/r08ac-accepted-post-residual-north-smoke-census.md');
const GENERATED_AT = value('--generated-at', '2026-08-22T01:20:00Z');
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
  if (!condition) throw new Error(`${LABEL} residual census rejected: ${message}`);
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
const ledger = readJson(LEDGER);
const n06 = readJson(N06);
invariant(manifest.transactionId === (IS_AD
  ? 'combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment'
  : IS_AE ? 'combined-zones-r08ae-empty-eight-north-smoke-retained-wet-east-segment'
    : IS_AF ? 'combined-zones-r08af-empty-eight-north-smoke-far-east-upper-completion'
      : IS_AG ? 'combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion'
    : 'combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment')
  && manifest.status === (IS_AD
    ? 'COMPILED_FROM_ACCEPTED_R08AC_POST_AWAITING_FRESH_EXECUTION_KERNEL'
    : IS_AE ? 'COMPILED_FROM_ACCEPTED_R08AD_POST_AWAITING_FRESH_EXECUTION_KERNEL'
      : IS_AF ? 'COMPILED_FROM_ACCEPTED_R08AE_POST_AWAITING_FRESH_EXECUTION_KERNEL'
        : IS_AG ? 'COMPILED_FROM_ACCEPTED_R08AF_POST_AWAITING_FRESH_EXECUTION_KERNEL'
      : 'COMPILED_FROM_ACCEPTED_R08AB_POST_AWAITING_FRESH_EXECUTION_KERNEL')
  && manifest.mvpScope === true && manifest.releaseNodeId === 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT'
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.manifest.sha256 === sha256(fs.readFileSync(absolute(MANIFEST)))
  && absolute(ledger.postSnapshot.root) === absolute(SNAPSHOT),
'frozen manifest/accepted-post binding drifted');
const packageKey = IS_AD ? 'ee-smoke-n-supported-gravity-east-compartment-wall'
  : IS_AE ? 'ee-smoke-n-retained-wet-east-compartment-wall'
    : IS_AF ? 'ee-smoke-n-far-east-upper-completion'
      : IS_AG ? 'ee-smoke-n-source-state-column-completion'
    : 'ee-smoke-n-supported-gravity-west-compartment-wall';
const pkg = manifest.packages.find(({ key }) => key === packageKey);
invariant(pkg, `${LABEL} wall package is absent`);
const operations = parsePointOperations(pkg.forward);
invariant(operations.length === (IS_AG ? 7 : IS_AF ? 8 : IS_AE ? 42 : IS_AD ? 14 : 35)
  && operations.every(({ toState }) => toState === 'minecraft:stone_bricks'),
`${LABEL} accepted operation is not the exact air-to-stone package`);
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
invariant(residual.length === (IS_AG ? 161 : IS_AF ? 168 : IS_AE ? 176 : IS_AD ? 218 : 232)
  && wet.length === (IS_AE || IS_AF || IS_AG ? 105 : 147)
  && gravity.length === (IS_AD || IS_AE || IS_AF || IS_AG ? 56 : 70)
  && sourceState.length === (IS_AG ? 0 : IS_AF ? 7 : 15) && n06Adjacent.length === 21 && openingResidual.length === 0,
`projected residual partition drifted: ${JSON.stringify({ residual: residual.length,
  wet: wet.length, gravity: gravity.length, sourceState: sourceState.length,
  n06Adjacent: n06Adjacent.length, openingResidual: openingResidual.length })}`);
invariant(columns.length === (IS_AG ? 23 : IS_AF ? 24 : IS_AE ? 28 : IS_AD ? 34 : 36)
  && columns.every(({ residualCellCount }) => residualCellCount > 0),
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
  status: `PASS_${LABEL}_ACCEPTED_POST_NORTH_SMOKE_RESIDUAL_BLOCKER_CENSUS`,
  source: { snapshotRoot: SNAPSHOT,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSnapshotSha256: readJson(ledger.postSnapshot.identity.path).sha256,
    terminalReleaseLedger: { path: LEDGER, transactionId: ledger.transactionId,
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 } },
  acceptedRelease: { manifest: MANIFEST, manifestIdentity: manifest.manifestIdentity,
    transactionId: manifest.transactionId, packageKey: pkg.key,
    operationBodySha256: manifest.operations[pkg.key].forwardSha256,
    operationCount: operations.length, targetSet: exactSet(operations.map(({ cell }) => cell)) },
  definition: `Every EE-SMOKE-N plane cell in the accepted immutable ${LABEL} post whose state differs from its frozen passive boundary material. Opening reservations require polished_deepslate; all other cells require stone_bricks.`,
  summary: { fullPlaneCellCount: fullPlane.length, acceptedOpeningCapCellCount: acceptedOpeningCaps.length,
    acceptedReleaseCellCount: operations.length, residualCellCount: residual.length,
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
    reason: `No source-proven clean full-height run remains after ${LABEL}. The ${residual.length} residual cells are confined to ${IS_AG ? 'wet or gravity/N06-adjacent bands' : 'wet, gravity/N06-adjacent, or non-air source-state bands'} and require separate exact dependency engineering.`,
    n06RemainsFailClosed: true, wetInterfacesRemainUntouched: true,
    poweredOpeningsRemainStaticCaps: true, worldMutationPerformed: false },
};
payload.censusIdentitySha256 = sha256(JSON.stringify(payload));
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(payload, null, 2)}\n`);
const bandRows = payload.residualBands.map((band) => (
  `| ${band.minX}..${band.maxX} | ${band.residualCellCount} | ${band.primaryBlocker} | ${band.n06Adjacent ? 'yes' : 'no'} |`
)).join('\n');
const md = `# ${LABEL} accepted-post residual north-smoke blocker census\n\n`
  + `Status: **${payload.status}**\n\n`
  + `In the accepted immutable ${LABEL} post, ${residual.length} of 1,372 plane cells remain outside the frozen passive final state. No dry clean full-height run remains.\n\n`
  + `- Wet-interaction primary partition: ${wet.length} cells.\n`
  + `- Gravity-interaction primary partition: ${gravity.length} cells; 21 are specifically adjacent to the four fail-closed N06 gravel cells.\n`
  + `- Non-air/source-state primary partition: ${sourceState.length} cells.\n`
  + `- Residual opening-reservation cells: 0; all 36 static polished-deepslate caps remain accepted.\n\n`
  + `| X band | Residual cells | Primary blocker | N06 adjacent |\n|---|---:|---|---|\n${bandRows}\n\n`
  + `Census identity: \`${payload.censusIdentitySha256}\`. No live call or world mutation was performed.\n`;
fs.writeFileSync(absolute(MD_OUT), md);
process.stdout.write(`${JSON.stringify({ status: payload.status, out: OUT, mdOut: MD_OUT,
  censusIdentitySha256: payload.censusIdentitySha256, summary: payload.summary,
  worldMutationPerformed: false }, null, 2)}\n`);
