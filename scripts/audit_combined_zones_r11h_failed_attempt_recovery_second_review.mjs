#!/usr/bin/env node
/** Independent read-only recovery audit for the failed/compensated R11H attempt. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  blockName,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const SOURCE = 'data/worldsnap-r11h-source-20260822T031103Z';
const RECOVERY = 'data/worldsnap-r11h-post-20260822T031103Z';
const REVIEW = 'data/world-review/combined-zones-r11h-live-20260822T031103Z';
const MANIFEST_PATH = 'data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const LEDGER_PATH = `${REVIEW}/evidence-ledger.json`;
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const OUTPUT = `${REVIEW}/r11h-failed-attempt-recovery-second-review.json`;
const MARKDOWN = `${REVIEW}/r11h-failed-attempt-recovery-second-review.md`;
const GENERATED_AT = '2026-08-22T03:23:00Z';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const abs = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(abs(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H recovery second review rejected: ${message}`);
};

function operationRecords(filename) {
  const records = [];
  for (const [offset, raw] of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).entries()) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `malformed REPL in ${filename}:${offset + 1}`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates[0] === coordinates[3] && coordinates[1] === coordinates[4]
      && coordinates[2] === coordinates[5], `non-single-cell operation in ${filename}:${offset + 1}`);
    records.push({
      line: offset + 1,
      cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return records;
}

function faceComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const seed = unvisited.values().next().value;
    unvisited.delete(seed);
    const queue = [seed]; const component = [];
    while (queue.length) {
      const key = queue.pop(); const cell = byKey.get(key); component.push(cell);
      for (const [dx, dy, dz] of FACE) {
        const next = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
        if (unvisited.delete(next)) queue.push(next);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}

function setManifest(cells) {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
}

function transitionCensus(differences) {
  const counts = new Map();
  for (const difference of differences) {
    const key = `${difference.sourceState} -> ${difference.recoveryState}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function journalAudit(reportPath) {
  const report = readJson(reportPath);
  const journalPath = path.relative(ROOT, report.streamJournal).split(path.sep).join('/');
  const bytes = fs.readFileSync(abs(journalPath));
  const entries = bytes.toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  invariant(sha256(bytes) === report.streamJournalSha256, `${reportPath} journal hash drifted`);
  invariant(entries.every((entry, index) => entry.sequence === index + 1), `${reportPath} journal sequence is not contiguous`);
  invariant(report.forceLoadAudit?.allTemporaryReleased === true
    && report.forceLoadAudit?.finalSetMatchesPreExistingSet === true
    && report.forceLoadAudit?.cleanupErrors?.length === 0,
  `${reportPath} did not restore force-load state`);
  return {
    report: binding(reportPath),
    journal: binding(journalPath),
    status: report.status,
    operationRole: report.operationRole,
    sourceOperationCount: report.sourceOperationCount,
    executedCommandCount: report.executedCommandCount,
    successfulCommands: report.successfulCommands,
    noopCommands: report.noopCommands,
    unexpectedNoopCommands: report.unexpectedNoopCommands,
    failedCommands: report.failedCommands,
    successfulGroups: report.successfulGroups,
    failedGroups: report.failedGroups,
    stoppedAtFirstFailedGroup: report.stoppedAtFirstFailedGroup,
    journalEntryCount: entries.length,
    terminalJournalStatus: entries.at(-1)?.status,
    allTemporaryChunksReleased: true,
    forceLoadSetRestored: true,
    failures: report.failures,
  };
}

const manifest = readJson(MANIFEST_PATH);
const ledger = readJson(LEDGER_PATH);
const c1 = readJson(C1_DESIGN);
invariant(ledger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && ledger.sourceSnapshot.root === SOURCE
  && manifest.manifestIdentity === 'f588ddca7596ce8f5305ebf51a3df149cfff5b67dcc629730f49b94cecaabc2a',
'ledger/source/manifest identity drifted');

const forwardFiles = manifest.packages.map(({ forward }) => forward);
const recordsByPackage = Object.fromEntries(manifest.packages.map(({ key, forward }) => [key, operationRecords(forward)]));
const allRecords = manifest.packages.flatMap(({ key }) => recordsByPackage[key]);
const operated = uniqueCells(allRecords.map(({ cell }) => cell));
const operatedKeys = new Set(operated.map(cellKey));
const halo = uniqueCells(operated.flatMap((cell) => {
  const points = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  }
  return points;
}));
const haloKeys = new Set(halo.map(cellKey));
invariant(operated.length === 1666 && hashCells(operated) === manifest.target.operatedUnion.coordinateSetSha256,
'operated union does not match manifest');
invariant(halo.length === 7120 && hashCells(halo) === manifest.target.interactionHalo.coordinateSetSha256,
'exact sparse halo does not match manifest');

const sourceReader = new AnvilReader(abs(path.join(SOURCE, 'region')));
const recoveryReader = new AnvilReader(abs(path.join(RECOVERY, 'region')));
const sourceState = async (cell) => stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z));
const recoveryState = async (cell) => stateToCommandString(await recoveryReader.blockState(cell.x, cell.y, cell.z));
async function compareCells(cells) {
  const differences = [];
  for (const cell of cells) {
    const before = await sourceState(cell); const after = await recoveryState(cell);
    if (before !== after) differences.push({ cell, sourceState: before, recoveryState: after });
  }
  return differences;
}

const generic = await analyzeIsland({
  key: 'r11h-second-review', start: 1189, end: 1206,
  stations: c1.horizontalAlignment.stations, reader: sourceReader, priorTargetKeys: new Set(),
});
const retainedFluidRecords = [];
for (const cell of generic.halo) {
  const state = await sourceState(cell);
  if (isFluid(state)) retainedFluidRecords.push({ cell, sourceState: state });
}
const retainedFluidCells = uniqueCells(retainedFluidRecords.map(({ cell }) => cell));
const retainedFluidKeys = new Set(retainedFluidCells.map(cellKey));
invariant(retainedFluidCells.length === 28
  && hashCells(retainedFluidCells) === manifest.scope.retainedHydraulicGraph.coordinateSetSha256
  && faceComponents(retainedFluidCells).length === 2,
'retained 28-cell hydraulic graph does not match manifest');

const structureRecords = recordsByPackage['c1-bridge-1189-1206-structure'];
const supportCells = uniqueCells(structureRecords.filter(({ toState }) => toState === 'minecraft:stone_bricks').map(({ cell }) => cell));
const supportKeys = new Set(supportCells.map(cellKey));
const supportComponents = faceComponents(supportCells);
const expectedSupportComponentHashes = new Set(manifest.scope.supportGraph.components.map(({ support }) => support.coordinateSetSha256));
invariant(supportCells.length === 641 && supportComponents.length === 11
  && supportComponents.every((component) => expectedSupportComponentHashes.has(hashCells(component))),
'planned support graph does not match manifest');
const recordedAnchorCells = uniqueCells(manifest.scope.supportGraph.components.flatMap(({ anchors }) => anchors.map(({ cell }) => cell)));

const priorR11Bindings = manifest.isolation.priorManifestBindings.filter(({ path: filename }) => path.basename(filename).startsWith('combined-zones-r11'));
const priorR11Cells = [];
for (const prior of priorR11Bindings) {
  invariant(binding(prior.path).sha256 === prior.sha256, `prior R11 manifest drifted: ${prior.path}`);
  const priorManifest = readJson(prior.path);
  for (const pkg of priorManifest.packages ?? []) {
    if (pkg.forward && fs.existsSync(abs(pkg.forward))) priorR11Cells.push(...operationRecords(pkg.forward).map(({ cell }) => cell));
  }
}
const exactPriorR11Cells = uniqueCells(priorR11Cells);
const priorR11Keys = new Set(exactPriorR11Cells.map(cellKey));

const operatedDifferences = await compareCells(operated);
const haloDifferences = await compareCells(halo);
const retainedFluidDifferences = await compareCells(retainedFluidCells);
const recoveredRetainedFluidCells = [];
const retainedFluidMaterialChanges = [];
for (const record of retainedFluidRecords) {
  const after = await recoveryState(record.cell);
  if (isFluid(after)) recoveredRetainedFluidCells.push(record.cell);
  if (blockName(record.sourceState) !== blockName(after)) {
    retainedFluidMaterialChanges.push({ cell: record.cell, sourceState: record.sourceState, recoveryState: after });
  }
}
const supportDifferences = await compareCells(supportCells);
const supportAnchorDifferences = await compareCells(recordedAnchorCells);
const priorR11Differences = await compareCells(exactPriorR11Cells);

const broadBounds = manifest.target.interactionHalo.bounds;
const broadDifferences = [];
for (let x = broadBounds.minX; x <= broadBounds.maxX; x += 1) {
  for (let y = broadBounds.minY; y <= broadBounds.maxY; y += 1) {
    for (let z = broadBounds.minZ; z <= broadBounds.maxZ; z += 1) {
      const cell = { x, y, z }; const before = await sourceState(cell); const after = await recoveryState(cell);
      if (before === after) continue;
      const key = cellKey(cell);
      broadDifferences.push({
        cell, sourceState: before, recoveryState: after,
        classifications: {
          operatedTarget: operatedKeys.has(key),
          exactSparseHalo: haloKeys.has(key),
          retainedHydraulicGraph: retainedFluidKeys.has(key),
          plannedSupportGraph: supportKeys.has(key),
          priorR11Target: priorR11Keys.has(key),
          sourceOrRecoveryFluid: isFluid(before) || isFluid(after),
          dirtToGrass: before === 'minecraft:dirt' && after === 'minecraft:grass_block[snowy=false]',
        },
      });
    }
  }
}

const journalFiles = {
  dependenciesForward: `${REVIEW}/c1-bridge-1189-1206-dependencies.forward-execution.json`,
  structureForward: `${REVIEW}/c1-bridge-1189-1206-structure.forward-execution.json`,
  structureCompensation: `${REVIEW}/c1-bridge-1189-1206-structure.compensating-rollback-execution.json`,
  dependenciesCompensation: `${REVIEW}/c1-bridge-1189-1206-dependencies.compensating-rollback-execution.json`,
};
const journals = Object.fromEntries(Object.entries(journalFiles).map(([key, filename]) => [key, journalAudit(filename)]));
invariant(journals.dependenciesForward.status === 'complete'
  && journals.dependenciesForward.successfulCommands === 3
  && journals.structureForward.status === 'failed'
  && journals.structureForward.executedCommandCount === 904
  && journals.structureForward.successfulCommands === 903
  && journals.structureForward.noopCommands === 1
  && journals.structureForward.failures.length === 1
  && journals.structureForward.failures[0] === 'line 909: strict-noop (noop)'
  && journals.structureCompensation.status === 'complete'
  && journals.structureCompensation.successfulCommands === 903
  && journals.structureCompensation.noopCommands === 760
  && journals.dependenciesCompensation.status === 'complete'
  && journals.dependenciesCompensation.successfulCommands === 3,
'execution/compensation journal counts do not close exactly');

const recoveryPreflight = readJson(`${REVIEW}/c1-bridge-1189-1206-structure.rollback-recovery-source-preflight.json`);
invariant(recoveryPreflight.status === 'FAIL' && recoveryPreflight.passed === 1661
  && recoveryPreflight.failed === 2,
'recovery source preflight failure set drifted');
invariant(operatedDifferences.length === 2
  && operatedDifferences.every(({ sourceState: before, recoveryState: after }) => (
    before === 'minecraft:dirt' && after === 'minecraft:grass_block[snowy=false]'
  )),
'operated union retains a non-benign or unexpected difference');
const priorR11UnexpectedDifferences = priorR11Differences.filter(({ sourceState: before, recoveryState: after }) => !(
  (before === 'minecraft:dirt' && after === 'minecraft:grass_block[snowy=false]')
  || (isFluid(before) && isFluid(after) && blockName(before) === blockName(after))
));
invariant(haloDifferences.length === 2 && supportDifferences.length === 0
  && supportAnchorDifferences.length === 0,
`exact recovery set retains unexpected operated/support drift: halo=${haloDifferences.length}, support=${supportDifferences.length}, anchors=${supportAnchorDifferences.length}`);

const broadFluidDifferences = broadDifferences.filter(({ classifications }) => classifications.sourceOrRecoveryFluid);
const broadNonFluidDifferences = broadDifferences.filter(({ classifications }) => !classifications.sourceOrRecoveryFluid);
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r11h-failed-attempt-recovery-independent-second-review',
  generatedAtUtc: GENERATED_AT,
  status: 'HOLD_R11H_OPERATION_STATES_COMPENSATED_BUT_EXACT_HYDRAULIC_AND_PRIOR_R11_FLUID_DRIFT_REQUIRE_RECOMPILE',
  source: { root: SOURCE, completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256 },
  recovery: { root: RECOVERY, completeSaveSha256: readJson(`${REVIEW}/rollback-recovery-complete-save-intake.json`).packageIdentity.completeSaveSha256 },
  ledger: binding(LEDGER_PATH),
  manifest: binding(MANIFEST_PATH),
  operatedUnion: { ...setManifest(operated), differenceCount: operatedDifferences.length, differences: operatedDifferences },
  exactSparseHalo: { ...setManifest(halo), differenceCount: haloDifferences.length, differences: haloDifferences },
  retainedHydraulicGraph: {
    ...setManifest(retainedFluidCells), componentCount: faceComponents(retainedFluidCells).length,
    recoveryFluidCellCount: recoveredRetainedFluidCells.length,
    recoveryComponentCount: faceComponents(recoveredRetainedFluidCells).length,
    sourceStateCensus: manifest.scope.retainedHydraulicGraph.stateCensus,
    materialChangeCount: retainedFluidMaterialChanges.length,
    differenceCount: retainedFluidDifferences.length, differences: retainedFluidDifferences,
  },
  supportGraph: {
    ...setManifest(supportCells), componentCount: supportComponents.length,
    recordedAnchorCellCount: recordedAnchorCells.length,
    supportDifferenceCount: supportDifferences.length,
    anchorDifferenceCount: supportAnchorDifferences.length,
    supportDifferences, anchorDifferences: supportAnchorDifferences,
  },
  priorR11Preservation: {
    manifestCount: priorR11Bindings.length,
    ...setManifest(exactPriorR11Cells),
    differenceCount: priorR11Differences.length,
    unexpectedDifferenceCount: priorR11UnexpectedDifferences.length,
    differences: priorR11Differences,
  },
  broadBoundingBoxDiagnostic: {
    bounds: broadBounds,
    cellCount: (broadBounds.maxX - broadBounds.minX + 1)
      * (broadBounds.maxY - broadBounds.minY + 1)
      * (broadBounds.maxZ - broadBounds.minZ + 1),
    differenceCount: broadDifferences.length,
    fluidLifecycleDifferenceCount: broadFluidDifferences.length,
    nonFluidDifferenceCount: broadNonFluidDifferences.length,
    transitionCensus: transitionCensus(broadDifferences),
    interpretation: 'Bounding-box fluid transitions are diagnostic lifecycle evidence only. Exact package recovery is adjudicated on the operated union, sparse 7,120-cell halo, retained 28-cell hydraulic graph, support graph, and prior R11 sets.',
    differences: broadDifferences,
  },
  journals,
  recoveryPreflight: binding(`${REVIEW}/c1-bridge-1189-1206-structure.rollback-recovery-source-preflight.json`),
  causality: {
    failedForwardGroupIndexZeroBased: 903,
    failedOperationFileLine: 909,
    failedCell: { x: 1529, y: 68, z: -251 },
    sourceGuard: 'minecraft:dirt',
    observedAtExecutionAndRecovery: 'minecraft:grass_block[snowy=false]',
    secondIndependentNaturalTransition: { cell: { x: 1540, y: 68, z: -238 }, sourceState: 'minecraft:dirt', recoveryState: 'minecraft:grass_block[snowy=false]' },
    operationResidueCount: 0,
  },
  acceptance: {
    compensatingRollbackComplete: true,
    exactOperationChangesRemaining: 0,
    benignNaturalLifecycleTransitionsRemaining: 2,
    retainedFluidExactStatesChanged: retainedFluidDifferences.length > 0,
    retainedFluidMaterialOrTopologyChanged: retainedFluidMaterialChanges.length > 0
      || recoveredRetainedFluidCells.length !== retainedFluidCells.length
      || faceComponents(recoveredRetainedFluidCells).length !== 2,
    exactSparseHaloFluidChanged: false,
    supportGraphChanged: false,
    priorR11ExactStatesChanged: priorR11Differences.length > 0,
    priorR11UnsafeOrOperationStateChanged: priorR11UnexpectedDifferences.length > 0,
    safeRecoveryBaselineForDistinctSourceRebound: false,
    canonicalRetryArtifactsEditedByThisReview: false,
    liveCallsPerformed: false,
    worldMutationPerformed: false,
  },
};
const reviewPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, reviewPayloadSha256 };
fs.writeFileSync(abs(OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R11H failed-attempt recovery — independent second review\n\n`
  + `Status: **${report.status}**\n\n`
  + `The exact 1,666-cell operated union retains two differences: dirt became grass at `
  + `\`(1529,68,-251)\` and \`(1540,68,-238)\`. Neither is a residual operation state. `
  + `The exact 7,120-cell sparse halo contains only those same two transitions. The 28-cell `
  + `retained water/lava graph has ${retainedFluidDifferences.length} exact state transitions, including `
  + `${retainedFluidMaterialChanges.length} material/air transitions; only ${recoveredRetainedFluidCells.length} `
  + `of its 28 coordinates remain fluid. The 641-cell/11-component support graph and recorded anchors are `
  + `exact. The ${exactPriorR11Cells.length.toLocaleString()} prior R11 cells have `
  + `${priorR11Differences.length} differences, including ${priorR11UnexpectedDifferences.length} air/fluid `
  + `changes. These are consistent with chunk-ticked fluid evolution rather than operation residue, but they `
  + `are still exact-set drift and block reusing the old hydraulic proof.\n\n`
  + `The enclosing ${payload.broadBoundingBoxDiagnostic.cellCount.toLocaleString()}-cell box has `
  + `${broadDifferences.length} differences: ${broadFluidDifferences.length} fluid lifecycle transitions `
  + `outside the exact sparse adjudication sets and ${broadNonFluidDifferences.length} non-fluid transitions. `
  + `Broad-box ticks do not imply package residue, but the subset intersecting the declared 28-cell hydraulic `
  + `graph and prior R11 targets is controlling exact-set drift.\n\n`
  + `Forward execution changed 903 structure groups and stopped at the first no-op. Compensation `
  + `then reversed exactly 903 structure groups (760 unapplied groups were expected no-ops) and all `
  + `three dependency groups. All four journals are hash-valid, contiguous, cleaned, and restore the `
  + `pre-existing force-load set. The compensation itself is clean; a distinct retry must recompile from the `
  + `recovery snapshot and re-prove its hydraulic/prior-release interfaces. No live call or world mutation was `
  + `performed by this review.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, output: OUTPUT, markdown: MARKDOWN,
  reviewPayloadSha256, operatedDifferences: operatedDifferences.length, sparseHaloDifferences: haloDifferences.length,
  retainedFluidDifferences: retainedFluidDifferences.length, supportDifferences: supportDifferences.length,
  priorR11Differences: priorR11Differences.length, priorR11UnexpectedDifferences: priorR11UnexpectedDifferences.length,
  broadDifferences: broadDifferences.length,
  broadFluidDifferences: broadFluidDifferences.length }, null, 2)}\n`);
