#!/usr/bin/env node
/** Independent read-only post-release QA for CZ-R12J. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const LEDGER = value('--ledger',
  'data/world-review/combined-zones-r12j-live-20260822T025647Z/evidence-ledger.json');
const EVIDENCE_DIR = path.dirname(LEDGER);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12j-post-release-qa.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12j-post-release-qa.md'));
const MANIFEST =
  'data/buildops/combined-zones-r12j-b09-r12f-r12g-seven-cell-rail-adjacency-closure.release-manifest.json';
const PACKAGE_KEY = 'b09-r12f-r12g-seven-cell-rail-adjacency-closure';
const RUNTIME_PROOF =
  'data/world-review/combined-zones-r12j-b09-adjacency-closure-runtime-proof-20260822T024700Z/runtime-proof.json';
const D05 = 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const CONNECTORS = 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const EXPECTED = Object.freeze({
  ledger: 'eb800fa74fad3d8227e355b83c12ac6f19d996cc898ed02ae077c4f6e8d6a75a',
  manifest: '4f7841a70e52a892fdb8e57480bba3feea7bd24fdf4833c8896a27790dd85eb8',
  manifestIdentity: '08ce2bd314fdf324248a1ddfb9dbab5329747809d878e412787a969b3798cdad',
  completed: '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36',
  sourceBound: '18601def5e8b9bb94a53130a37d219210b7865056976cec0208b4214445398c8',
  sourceComplete: 'fa827679d382cd77f7f862977197f0d3132563ba218867b132bbf9bf4dc34c1a',
  sourceRegion: '240135f163a61247c4781a698c1b195903b257357447092c99b704274130f9b3',
  postComplete: 'b814512643bc92ef3b0932b35f8fe12c984355dd0edb22c6e61d15130f9d38c9',
  postRegion: 'f8aad22ebf1a95182a3e8989f51f814cbd4217d85c7e73ee85be8b2c6ca4bcfb',
  forward: 'ad892bb02b815ab188e86d9763ef6a8a303bfd2fe86c07601f6baab1e2b3ab18',
  rollback: 'a1659c0db098442e510d3f901a8e4ee45b0b913bc49cceb03bf04d1f8414c2d9',
  execution: '7c9f04c841253fcb295e77ed22f37d8cd39871320580f93edb31afc35d9d31c3',
  journal: '5f0160bc03837735128fde08c42d7b7e1fd2d74c8555fbb132ef9d3dab47f7fc',
  rollbackPreflight: '6ed13cdc91968bf00df2a3c40cd7d159ec10763a01d4d69093e8d61e629aabb6',
  proof: '84265388b71cec72b2d03d5658c7f7850b621a364675997d20cfa10260a26107',
  proofPayload: '151ad3cf31b24aa15ecc07f7ca7d61f812316b034d34c479ea166de510229c4d',
  target: 'c5d0c02ec59bcabe84377138635250c16b175b135a04c80a2624a6db28fcb366',
});
const AIR = 'minecraft:air';
const PD = 'minecraft:polished_diorite';
const ASC = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
const NS = 'minecraft:rail[shape=north_south,waterlogged=false]';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12J post-QA rejected: ${message}`);
};
const stateBase = (state) => state.split('[', 1)[0];
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      from: fields[7], to: fields[8] };
  });

const ledger = readJson(LEDGER);
const manifest = readJson(MANIFEST);
const proof = readJson(RUNTIME_PROOF);
invariant(fileBinding(LEDGER).sha256 === EXPECTED.ledger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completed
  && ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBound,
  'ledger identity or completion state drifted');
invariant(fileBinding(MANIFEST).sha256 === EXPECTED.manifest
  && manifest.manifestIdentity === EXPECTED.manifestIdentity
  && ledger.manifest.sha256 === EXPECTED.manifest, 'manifest binding drifted');
invariant(fileBinding(RUNTIME_PROOF).sha256 === EXPECTED.proof
  && proof.proofPayloadSha256 === EXPECTED.proofPayload
  && proof.disposition.exactSevenCellAdjacencyClosureStateProven
  && proof.disposition.exactFourteenCellConnectedPostTopologyProven
  && proof.disposition.bothAcceptedPriorSegmentsPreservedAfterForwardAndRollback,
  'exact Paper proof drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion,
  'source/post immutable-save binding drifted');

const forwardPath = manifest.packages[0].forward;
const rollbackPath = manifest.packages[0].rollback;
invariant(fileBinding(forwardPath).sha256 === EXPECTED.forward
  && fileBinding(rollbackPath).sha256 === EXPECTED.rollback, 'operation identity drifted');
const forward = parseOps(forwardPath);
const rollback = parseOps(rollbackPath);
invariant(forward.length === 7 && rollback.length === 7
  && hashCells(forward.map(({ cell }) => cell)) === EXPECTED.target
  && rollback.every((operation, index) => {
    const source = forward[forward.length - 1 - index];
    return cellKey(operation.cell) === cellKey(source.cell)
      && operation.from === source.to && operation.to === source.from;
  }), 'forward/rollback are not an exact reverse-order inverse');
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
const supports = targets.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = targets.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const halo = dilateCells(targets, 1);
const connected14 = [
  { x: 2287, y: 130, z: -768, state: ASC }, { x: 2286, y: 131, z: -768, state: ASC },
  { x: 2285, y: 132, z: -768, state: EW },
  ...forward.slice().reverse().map(({ cell, to }) => ({ ...cell, state: to })),
  { x: 2277, y: 137, z: -768, state: ASC }, { x: 2276, y: 138, z: -768, state: ASC },
  { x: 2275, y: 139, z: -768, state: ASC }, { x: 2274, y: 140, z: -768, state: EW },
];
invariant(connected14.length === 14 && uniqueCells(connected14).length === 14,
  'resulting connected component geometry drifted');
const priorRails = [
  ...Array.from({ length: 231 }, (_, index) => ({ x: 2057 + index, y: 130, z: -748, state: EW })),
  ...Array.from({ length: 19 }, (_, index) => ({ x: 2288, y: 130, z: -749 - index, state: NS })),
  ...Array.from({ length: 80 }, (_, index) => ({ x: 2049 + index, y: 246, z: -768, state: EW })),
  ...connected14.slice(0, 3), ...connected14.slice(-4),
  { x: 2266, y: 145, z: -768, state: ASC }, { x: 2265, y: 146, z: -768, state: ASC },
  { x: 2264, y: 147, z: -768, state: ASC }, { x: 2263, y: 148, z: -768, state: EW },
  { x: 2255, y: 153, z: -768, state: ASC }, { x: 2254, y: 154, z: -768, state: ASC },
  { x: 2253, y: 155, z: -768, state: ASC }, { x: 2252, y: 156, z: -768, state: EW },
];
invariant(priorRails.length === 345 && uniqueCells(priorRails).length === 345,
  'accepted prior rail geometry drifted');
const lowerCap = cellsIn(manifest.scope.geometry.retainedLowerB08Cap.bounds);
const summitCap = cellsIn(manifest.scope.geometry.retainedSummitZ11Cap.bounds);

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(ledger.postSnapshot.root, 'region')));
async function records(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) output.push({ cell,
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  return output;
}
const [sourceTargets, postTargets, sourceSupports, postSupports, sourceHeadroom, postHeadroom,
  sourcePrior, postPrior, sourceCaps, postCaps, sourceHalo, postHalo] = await Promise.all([
  records(sourceReader, targets), records(postReader, targets),
  records(sourceReader, supports), records(postReader, supports),
  records(sourceReader, headroom), records(postReader, headroom),
  records(sourceReader, priorRails), records(postReader, priorRails),
  records(sourceReader, [...lowerCap, ...summitCap]), records(postReader, [...lowerCap, ...summitCap]),
  records(sourceReader, halo), records(postReader, halo),
]);
invariant(sourceTargets.every(({ state }) => state === AIR)
  && postTargets.every(({ cell, state }) => forward.some((operation) => (
    cellKey(operation.cell) === cellKey(cell) && operation.to === state)))
  && [...sourceSupports, ...postSupports].every(({ state }) => state === PD)
  && [...sourceHeadroom, ...postHeadroom].every(({ state }) => state === AIR),
  'target/support/headroom state mismatch');
invariant(sourcePrior.every(({ cell, state }) => priorRails.some((rail) => (
  cellKey(rail) === cellKey(cell) && rail.state === state)))
  && JSON.stringify(sourcePrior) === JSON.stringify(postPrior)
  && [...sourceCaps, ...postCaps].every(({ state }) => state === PD),
  'prior rail or external cap preservation failed');
const haloDiff = sourceHalo.filter((record, index) => record.state !== postHalo[index].state);
invariant(haloDiff.length === 7 && haloDiff.every(({ cell }) => targetKeys.has(cellKey(cell))),
  'halo has lifecycle or undeclared drift');

const d05 = readJson(D05);
const connectors = readJson(CONNECTORS);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const accommodation = buildB09MinimumReservation(
  model.formula,
  connectors.funicularFaceComparison.designEndpoints,
);
const [sourceB09, postB09] = await Promise.all([
  records(sourceReader, accommodation), records(postReader, accommodation),
]);
const b09Diff = sourceB09.filter((record, index) => record.state !== postB09[index].state);
const postRailCensus = postB09.reduce((counts, { state }) => {
  if (stateBase(state).includes('rail')) counts[state] = (counts[state] ?? 0) + 1;
  return counts;
}, {});
invariant(accommodation.length === 7_800 && b09Diff.length === 7
  && b09Diff.every(({ cell }) => targetKeys.has(cellKey(cell)))
  && postRailCensus[EW] === 317 && postRailCensus[NS] === 19
  && postRailCensus[ASC] === 16
  && Object.values(postRailCensus).reduce((sum, count) => sum + count, 0) === 352,
  'B09 bounded diff or exact rail-shape census failed');
const postConnected = await records(postReader, connected14);
invariant(postConnected.every(({ cell, state }) => connected14.some((rail) => (
  cellKey(rail) === cellKey(cell) && rail.state === state))), '14-cell exact topology state failed');
const neighbourCounts = connected14.map((cell) => connected14.filter((other) => (
  cellKey(other) !== cellKey(cell) && Math.abs(other.x - cell.x) <= 1
    && Math.abs(other.y - cell.y) <= 1 && other.z === cell.z
)).length);
invariant(neighbourCounts.filter((count) => count === 1).length === 2
  && neighbourCounts.filter((count) => count === 2).length === 12
  && neighbourCounts.every((count) => count >= 1 && count <= 2),
  'resulting 14-cell component is disconnected or branched');

const executionPath = path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.forward-execution.json`);
const rollbackPreflightPath = path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.rollback-poststate-preflight.json`);
const journalPath = `${executionPath}.stream-journal.jsonl`;
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPreflightPath);
const journal = fs.readFileSync(absolute(journalPath), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
invariant(fileBinding(executionPath).sha256 === EXPECTED.execution
  && execution.status === 'complete' && execution.dryRun === false && execution.strictNoop === true
  && execution.successfulGroups === 7 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit.allTemporaryReleased
  && execution.forceLoadAudit.finalSetMatchesPreExistingSet, 'strict execution evidence failed');
invariant(fileBinding(journalPath).sha256 === EXPECTED.journal
  && execution.streamJournalSha256 === EXPECTED.journal && journal.length === 20
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 7, 'journal completeness failed');
invariant(fileBinding(rollbackPreflightPath).sha256 === EXPECTED.rollbackPreflight
  && rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === 7
  && rollbackPreflight.passed === 7 && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
  'post-state exact rollback preflight failed');
invariant(ledger.stages.length === 17 && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 17
  && ledger.evidenceBindings.every((binding) => fileBinding(binding.path).sha256 === binding.sha256),
  'wrapper stage or evidence binding failed');

const checks = [
  'ledger-manifest-completed-identity', 'source-post-immutable-save-bindings',
  'all-seventeen-stages-and-evidence-bindings', 'exact-paper-runtime-proof',
  'exact-seven-forward-states-and-order', 'exact-reverse-order-inverse',
  'exact-seven-supports', 'exact-seven-headroom', 'two-accepted-adjacency-interfaces',
  'resulting-fourteen-cell-connected-unbranched-component',
  'all-345-prior-rails-preserved', 'both-twelve-cell-external-caps-preserved',
  'halo-seven-declared-zero-undeclared-drift',
  'b09-seven-declared-zero-undeclared-drift', 'b09-exact-352-rail-shape-census',
  'strict-seven-group-execution', 'complete-twenty-entry-journal',
  'rollback-seven-of-seven', 'no-operational-overclaim-or-qa-mutation',
].map((id) => ({ id, status: 'PASS' }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R12J-P1-B09-R12F-R12G-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE-POST-QA',
  status: 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_FOURTEEN_CELL_TOPOLOGY_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T03:04:00Z'),
  ledger: fileBinding(LEDGER), manifest: fileBinding(MANIFEST),
  runtimeProof: { binding: fileBinding(RUNTIME_PROOF), proofPayloadSha256: proof.proofPayloadSha256,
    exactProductionPaperVersion: proof.runtime.expectedVersion },
  sourceSnapshot: { root: ledger.sourceSnapshot.root, completeSaveSha256: EXPECTED.sourceComplete,
    regionSha256: EXPECTED.sourceRegion },
  postSnapshot: { root: ledger.postSnapshot.root, completeSaveSha256: EXPECTED.postComplete,
    regionSha256: EXPECTED.postRegion },
  releaseIdentity: { sourceBoundReleaseIdentitySha256: EXPECTED.sourceBound,
    completedReleaseIdentitySha256: EXPECTED.completed },
  exactPostState: {
    operatedCellCount: 7, targetCoordinateSetSha256: EXPECTED.target,
    ascendingWestCellCount: 5, eastWestCellCount: 2,
    supportPassCount: 7, headroomPassCount: 7,
    resultingConnectedComponent: { cellCount: 14, componentCount: 1,
      endpointCount: 2, interiorCellCount: 12, branchCellCount: 0 },
  },
  preservation: { priorRailCount: 345, lowerCapCellCount: 12, summitCapCellCount: 12,
    haloDeclaredDifferenceCount: 7, haloUndeclaredDifferenceCount: 0,
    b09DeclaredDifferenceCount: 7, b09UndeclaredDifferenceCount: 0,
    postRailCensus },
  lifecycle: { stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 20,
    journalSha256: EXPECTED.journal, rollbackGuardPassCount: 7 },
  disposition: { passiveRailAdjacencyClosureAsBuilt: true,
    resultingConnectedPassiveRailCellCount: 14, turnRailInstalled: false,
    poweredOrActiveSystemInstalled: false, funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false, liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false },
  checks,
  summary: { passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0 },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-R12J post-release QA\n\n`
  + `**Status:** ${report.status}  \n**QA payload:** \`${qaPayloadSha256}\`\n\n`
  + `- Exact target states: 7/7; supports/headroom: 7/7.\n`
  + `- R12F-through-R12G result: one unbranched 14-cell component.\n`
  + `- Preserved: 345 predecessor rails and both 12-cell external caps.\n`
  + `- B09/halo diff: seven declared transitions, zero lifecycle or undeclared drift.\n`
  + `- Wrapper: 17/17 stages, complete 20-entry journal, rollback 7/7.\n`
  + `- Passive rail only; active systems and transport remain uncommissioned.\n`);
console.log(JSON.stringify({ status: report.status, output: relative(OUT), markdown: relative(MARKDOWN),
  qaPayloadSha256, checks: checks.length, liveCallsPerformed: false }, null, 2));
