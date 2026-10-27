#!/usr/bin/env node
/** Independent read-only post-release QA for the exact 48-cell R10H release. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T04:05:00Z');
const EVIDENCE = value('--evidence-dir', 'data/world-review/combined-zones-r10h-live-20260822T035805Z');
const LEDGER = value('--ledger', `${EVIDENCE}/evidence-ledger.json`);
const OUT = value('--out', `${EVIDENCE}/r10h-post-release-qa.json`);
const MARKDOWN = value('--markdown', `${EVIDENCE}/r10h-post-release-qa.md`);
const MANIFEST = 'data/buildops/combined-zones-r10h-b03-preinstitutional-passive-route-lighting.release-manifest.json';
const R10G_MANIFEST = 'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json';
const R10G_QA = 'data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json';
const PACKAGE_KEY = 'b03-preinstitutional-passive-route-lighting';
const EXPECTED = Object.freeze({
  ledgerSha256: '4b941b36e71de03cb40d73edc7a526de24ee786550eb02d4b8a8b866b0eec8bc',
  manifestSha256: '3957c20e00f2210e07db2c2f02a8e647e22f2b0084f1de51a56531713f2fac2a',
  manifestIdentity: '2b9420ba2e27f7c2c97bffac981abe4974532ea2211b8aacb429b5f5cb355ffc',
  completedReleaseIdentitySha256: '731d4b4c669ac1bccf3c1f2fd32dc5f67c2f70922700d8fb7f3c1ac50f62b364',
  sourceCompleteSaveSha256: '8bd43af89130e849965d6d5225f2da2612f6a8c16ffa0b8c7e1820685ed1cc08',
  postCompleteSaveSha256: '86bdbd6875a18cffc2707334633f79c9089aecb9fb45074fb16111bfd87fda4b',
  sourceRegionSha256: '1b80acd17cecc7af3dd7d4125f70c5b2b571ad09805b91c8cc33378c76bcfdfe',
  postRegionSha256: '4a05db8475820894ad5c5043b84f13c27611acf0899cc41e5a1f4b9f17878268',
  forwardFileSha256: '6f61f5adcb170bb570dabdbd13cd984a2fbc0d68b101eae796e16cbffcbf8e05',
  rollbackFileSha256: 'cfe4ae4d62fa2eed58ec83ddc276d39bf60499893b3c7d8d866cfa6a7de9a2ed',
  executionSha256: '04858197b3c17235c616986bd62f32a5b37c52ea4134d1f5557db7f587e38cd0',
  journalSha256: 'f47ae711a2470e482c70f5b6be140c824ebb70058fc523a47b72bed46461bd65',
  rollbackPreflightSha256: '8a305aa2e99f4b1270d6a6fecb782f6b7c872ff1c8f6253d4c553981ea910c3d',
  predecessorManifestSha256: 'a7a078df110d10160fb47dcb538067769739db79cc3ba765757b4d4fdf28a73e',
  predecessorQaSha256: '934a0759dbc336ac124356bc04de8bfe3b83cf83632c732512c163452130d79d',
  predecessorQaPayloadSha256: '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff',
  targetCount: 48,
  targetHash: '328bd79832501e5a3532e73abe9fa97e3bd06e01c6fc6634ffa653d1dfd4144b',
  haloCount: 1296,
  haloHash: '22cdaea3fc7883336c17939f9fac027b65c0131f3aaf0a96f04f4f70fdc3b023',
  predecessorTargetCount: 5346,
  stageCount: 17,
  journalRecordCount: 102,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10H post-release QA rejected: ${message}`);
};
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records, field = 'state') => Object.fromEntries([...records.reduce(
  (counts, record) => counts.set(record[field], (counts.get(record[field]) ?? 0) + 1),
  new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const point = fields.slice(1, 4).map(Number);
    invariant(fields.slice(4, 7).map(Number).join(',') === point.join(','),
      `${filename} contains a non-cell operation`);
    operations.push({
      cell: { x: point[0], y: point[1], z: point[2] },
      sourceState: fields[7],
      targetState: fields[8],
    });
  }
  return operations;
}

async function states(reader, cells) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}

function changes(source, post) {
  const postByKey = new Map(post.map((record) => [cellKey(record.cell), record.state]));
  return source.filter(({ cell, state }) => postByKey.get(cellKey(cell)) !== state)
    .map(({ cell, state }) => ({ cell, sourceState: state, postState: postByKey.get(cellKey(cell)) }));
}

async function entityCensus(regionReader, entityReader, cells) {
  const keys = new Set(cells.map(cellKey));
  const chunks = [...new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = [];
  const savedEntities = [];
  for (const chunkKey of chunks) {
    const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
    const chunk = await regionReader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (keys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      const cell = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
      if (keys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
  return { blockEntities, savedEntities };
}

const ledger = readJson(LEDGER);
const manifest = readJson(MANIFEST);
const predecessorManifest = readJson(R10G_MANIFEST);
const predecessorQa = readJson(R10G_QA);
const packageRecord = manifest.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(binding(LEDGER).sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.manifest.sha256 === EXPECTED.manifestSha256,
'execution ledger or completed identity drifted');
invariant(binding(MANIFEST).sha256 === EXPECTED.manifestSha256
  && manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.releaseNodeId === 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT'
  && manifest.mvpScope === true,
'canonical manifest identity/scope drifted');
invariant(binding(R10G_MANIFEST).sha256 === EXPECTED.predecessorManifestSha256
  && binding(R10G_QA).sha256 === EXPECTED.predecessorQaSha256
  && predecessorQa.qaPayloadSha256 === EXPECTED.predecessorQaPayloadSha256
  && predecessorQa.summary.passed === true,
'accepted R10G predecessor manifest or QA drifted');

const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source/post complete-save identity or intake drifted');

const forward = parseOperations(packageRecord.forward);
const rollback = parseOperations(packageRecord.rollback);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === EXPECTED.targetCount && rollback.length === EXPECTED.targetCount
  && hashCells(targets) === EXPECTED.targetHash
  && binding(packageRecord.forward).sha256 === EXPECTED.forwardFileSha256
  && binding(packageRecord.rollback).sha256 === EXPECTED.rollbackFileSha256
  && rollback.every((record, index) => {
    const source = forward[forward.length - 1 - index];
    return cellKey(record.cell) === cellKey(source.cell)
      && record.sourceState === source.targetState
      && record.targetState === source.sourceState;
  }),
'target identity, operation hash, or exact inverse drifted');
const halo = uniqueCells(targets.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
}));
invariant(halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash,
'exact sparse interaction halo drifted');

const sourceReader = new AnvilReader(absolute(ledger.sourceSnapshot.regions));
const postReader = new AnvilReader(absolute(ledger.postSnapshot.regions));
const sourceEntityReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'entities')));
const postEntityReader = new AnvilReader(absolute(path.join(ledger.postSnapshot.root, 'entities')));
const [sourceTargets, postTargets, sourceHalo, postHalo] = await Promise.all([
  states(sourceReader, targets), states(postReader, targets),
  states(sourceReader, halo), states(postReader, halo),
]);
const sourceByKey = new Map(sourceTargets.map((record) => [cellKey(record.cell), record.state]));
const postByKey = new Map(postTargets.map((record) => [cellKey(record.cell), record.state]));
const sourceTargetFailures = forward.filter(({ cell, sourceState }) => (
  sourceByKey.get(cellKey(cell)) !== sourceState
));
const postTargetFailures = forward.filter(({ cell, targetState }) => (
  postByKey.get(cellKey(cell)) !== targetState
));
const targetChanges = changes(sourceTargets, postTargets);
const haloChanges = changes(sourceHalo, postHalo);
const declaredHaloChanges = haloChanges.filter(({ cell }) => targetKeys.has(cellKey(cell)));
const undeclaredHaloChanges = haloChanges.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
invariant(sourceTargetFailures.length === 0 && postTargetFailures.length === 0
  && targetChanges.length === EXPECTED.targetCount
  && haloChanges.length === EXPECTED.targetCount
  && declaredHaloChanges.length === EXPECTED.targetCount
  && undeclaredHaloChanges.length === 0
  && targetChanges.every(({ sourceState, postState }) => (
    sourceState === 'minecraft:polished_diorite' && postState === 'minecraft:sea_lantern'
  )),
'exact target transitions or halo drift accounting failed');

const predecessorOperations = predecessorManifest.packages.flatMap((pkg) => parseOperations(pkg.forward));
const predecessorTargets = predecessorOperations.map(({ cell }) => cell);
invariant(predecessorOperations.length === EXPECTED.predecessorTargetCount
  && predecessorTargets.every((cell) => !targetKeys.has(cellKey(cell))),
'R10H target intersects accepted R10G predecessor targets');
const [sourcePredecessor, postPredecessor] = await Promise.all([
  states(sourceReader, predecessorTargets), states(postReader, predecessorTargets),
]);
const predecessorDesired = new Map(predecessorOperations.map(({ cell, targetState }) => (
  [cellKey(cell), targetState]
)));
const predecessorFailures = [...sourcePredecessor, ...postPredecessor].filter(({ cell, state }) => (
  predecessorDesired.get(cellKey(cell)) !== state
));
const predecessorChanges = changes(sourcePredecessor, postPredecessor);
invariant(predecessorFailures.length === 0 && predecessorChanges.length === 0,
'accepted 5,346-cell R10G predecessor state changed or drifted');

const [sourceEntities, postEntities] = await Promise.all([
  entityCensus(sourceReader, sourceEntityReader, halo),
  entityCensus(postReader, postEntityReader, halo),
]);
invariant(sourceEntities.blockEntities.length === 0 && postEntities.blockEntities.length === 0
  && sourceEntities.savedEntities.length === 0 && postEntities.savedEntities.length === 0,
'source/post exact halo contains a block entity or saved entity');

const evidence = {
  manifestQa: `${EVIDENCE}/exact-release-manifest-qa.json`,
  forwardSourcePreflight: `${EVIDENCE}/${PACKAGE_KEY}.forward-source-preflight.json`,
  projectedRollbackPreflight: `${EVIDENCE}/${PACKAGE_KEY}.projected-rollback-preflight.json`,
  forwardParser: `${EVIDENCE}/${PACKAGE_KEY}.forward-strict-dry-run.json`,
  rollbackParser: `${EVIDENCE}/${PACKAGE_KEY}.rollback-strict-dry-run.json`,
  blockEntities: `${EVIDENCE}/block-entity-clearance.json`,
  liveEntities: `${EVIDENCE}/live-entity-clearance.json`,
  sameMomentEntities: `${EVIDENCE}/${PACKAGE_KEY}.same-moment-entity-clearance.json`,
  execution: `${EVIDENCE}/${PACKAGE_KEY}.forward-execution.json`,
  journal: `${EVIDENCE}/${PACKAGE_KEY}.forward-execution.json.stream-journal.jsonl`,
  rollbackPoststatePreflight: `${EVIDENCE}/${PACKAGE_KEY}.rollback-poststate-preflight.json`,
};
const evidenceBindings = Object.fromEntries(Object.entries(evidence).map(([key, filename]) => (
  [key, binding(filename)]
)));
const manifestQa = readJson(evidence.manifestQa);
const forwardPreflight = readJson(evidence.forwardSourcePreflight);
const projectedRollback = readJson(evidence.projectedRollbackPreflight);
const forwardParser = readJson(evidence.forwardParser);
const rollbackParser = readJson(evidence.rollbackParser);
const blockEntities = readJson(evidence.blockEntities);
const liveEntities = readJson(evidence.liveEntities);
const sameMomentEntities = readJson(evidence.sameMomentEntities);
const execution = readJson(evidence.execution);
const rollbackPreflight = readJson(evidence.rollbackPoststatePreflight);
invariant(manifestQa.status === 'PASS' && manifestQa.totals?.uniqueTargetCells === 48
  && forwardPreflight.status === 'PASS' && forwardPreflight.passed === 48 && forwardPreflight.failed === 0
  && projectedRollback.status === 'PASS' && projectedRollback.passed === 48 && projectedRollback.failed === 0
  && forwardParser.status === 'dry_run' && forwardParser.strictNoop === true
  && rollbackParser.status === 'dry_run' && rollbackParser.strictNoop === true
  && blockEntities.status === 'PASS' && blockEntities.blockingBlockEntityCount === 0
  && liveEntities.status === 'PASS' && liveEntities.totals.blockingEntityHits === 0
  && sameMomentEntities.status === 'PASS' && sameMomentEntities.totals.blockingEntityHits === 0,
'wrapper prerelease kernel evidence failed');
invariant(evidenceBindings.execution.sha256 === EXPECTED.executionSha256
  && evidenceBindings.journal.sha256 === EXPECTED.journalSha256
  && execution.status === 'complete' && execution.strictNoop === true
  && execution.operationRole === 'forward' && execution.sourceOperationCount === 48
  && execution.operationSha256 === EXPECTED.forwardFileSha256
  && execution.successfulGroups === 48 && execution.failedGroups === 0
  && execution.successfulCommands === 48 && execution.failedCommands === 0
  && execution.noopCommands === 0 && execution.unexpectedNoopCommands === 0
  && execution.unknownReplyCommands === 0 && execution.worldEditLeftoverCount === 0
  && execution.streamJournalSha256 === EXPECTED.journalSha256
  && execution.forceLoadAudit.completedBatchCount === 1
  && execution.forceLoadAudit.allRequiredChunksLoadedBeforeCommands === true
  && execution.forceLoadAudit.allTemporaryReleased === true
  && execution.forceLoadAudit.finalSetMatchesPreExistingSet === true,
'strict execution, journal binding, or force-load restoration failed');
const journal = fs.readFileSync(absolute(evidence.journal), 'utf8').trim().split(/\r?\n/)
  .map((line) => JSON.parse(line));
invariant(journal.length === EXPECTED.journalRecordCount
  && journal.every((record, index) => record.sequence === index + 1)
  && journal[0].status === 'planned' && journal.at(-1).status === 'complete'
  && journal.filter(({ batch }) => batch?.status === 'group-intent').length === 48
  && journal.filter(({ batch }) => batch?.status === 'group-result').length === 48
  && journal.at(-1).batch?.completedGroupCount === 48,
'stream journal is incomplete or non-sequential');
invariant(evidenceBindings.rollbackPoststatePreflight.sha256 === EXPECTED.rollbackPreflightSha256
  && rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === 48
  && rollbackPreflight.passed === 48 && rollbackPreflight.failed === 0
  && rollbackPreflight.opsSha256 === EXPECTED.rollbackFileSha256
  && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256
  && rollbackPreflight.sourceOverlays === null,
'exact post-state inverse preflight failed');
invariant(ledger.stages.length === EXPECTED.stageCount
  && ledger.stages.every(({ status }) => status === 'PASS'),
'wrapper stage lifecycle is incomplete');

const checks = [
  ['R10H-POST-01-LEDGER-MANIFEST-AND-COMPLETED-IDENTITY-BOUND', true],
  ['R10H-POST-02-SOURCE-AND-POST-COMPLETE-SAVES-BOUND', true],
  ['R10H-POST-03-EXACT-48-SOURCE-GUARDS', true],
  ['R10H-POST-04-EXACT-48-SEA-LANTERN-TARGETS', true],
  ['R10H-POST-05-EXACT-1296-HALO-48-DECLARED-DIFFS', true],
  ['R10H-POST-06-ZERO-UNDECLARED-OR-LIFECYCLE-DRIFT', true],
  ['R10H-POST-07-ZERO-SOURCE-OR-POST-BLOCK-ENTITY-SAVED-ENTITY-HITS', true],
  ['R10H-POST-08-ACCEPTED-5346-CELL-R10G-PREDECESSOR-PRESERVED', true],
  ['R10H-POST-09-STRICT-EXECUTION-48-GROUPS-ZERO-NOOP', true],
  ['R10H-POST-10-102-RECORD-JOURNAL-COMPLETE', true],
  ['R10H-POST-11-17-STAGE-WRAPPER-LIFECYCLE-PASS', true],
  ['R10H-POST-12-EXACT-48-GUARD-POSTSTATE-INVERSE', true],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r10h-b03-preinstitutional-passive-route-lighting-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R10H_B03_PREINSTITUTIONAL_PASSIVE_ROUTE_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE',
  release: {
    releaseNodeId: manifest.releaseNodeId,
    transactionId: manifest.transactionId,
    manifestIdentity: manifest.manifestIdentity,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: binding(LEDGER),
    manifest: binding(MANIFEST),
    predecessorManifest: binding(R10G_MANIFEST),
    predecessorPostQa: binding(R10G_QA),
    sourceSnapshotIdentity: binding(ledger.sourceSnapshot.identity.path),
    postSnapshotIdentity: binding(ledger.postSnapshot.identity.path),
    sourceCompleteSaveIntake: binding(ledger.sourceSnapshot.completeSaveIntake.path),
    postCompleteSaveIntake: binding(ledger.postSnapshot.completeSaveIntake.path),
    evidence: evidenceBindings,
  },
  geometry: {
    targets: classManifest(targets),
    exactSparseInteractionHalo: classManifest(halo),
  },
  observedTransitions: {
    sourceTargetStateCensus: stateCensus(sourceTargets),
    postTargetStateCensus: stateCensus(postTargets),
    exactTargetChangeCount: targetChanges.length,
    exactHaloChangeCount: haloChanges.length,
    declaredHaloChangeCount: declaredHaloChanges.length,
    undeclaredHaloChangeCount: undeclaredHaloChanges.length,
    transitionCensus: stateCensus(targetChanges, 'sourceState'),
    transition: 'minecraft:polished_diorite -> minecraft:sea_lantern',
  },
  entityPreservation: {
    sourceBlockEntityCount: sourceEntities.blockEntities.length,
    postBlockEntityCount: postEntities.blockEntities.length,
    sourceSavedEntityCount: sourceEntities.savedEntities.length,
    postSavedEntityCount: postEntities.savedEntities.length,
  },
  predecessorPreservation: {
    transactionId: predecessorManifest.transactionId,
    targetCellCount: predecessorTargets.length,
    targetChangeCount: predecessorChanges.length,
    desiredStateFailureCount: predecessorFailures.length,
    r10hTargetIntersectionCount: 0,
  },
  execution: {
    stageCount: ledger.stages.length,
    stagePassCount: ledger.stages.filter(({ status }) => status === 'PASS').length,
    successfulGroupCount: execution.successfulGroups,
    failedGroupCount: execution.failedGroups,
    successfulCommandCount: execution.successfulCommands,
    noOpCommandCount: execution.noopCommands,
    journalRecordCount: journal.length,
    journalGroupIntentCount: journal.filter(({ batch }) => batch?.status === 'group-intent').length,
    journalGroupResultCount: journal.filter(({ batch }) => batch?.status === 'group-result').length,
    forceLoadSetRestored: execution.forceLoadAudit.finalSetMatchesPreExistingSet,
  },
  rollbackReadiness: {
    operationCount: rollbackPreflight.operationCount,
    passedGuardCount: rollbackPreflight.passed,
    failedGuardCount: rollbackPreflight.failed,
    sourceOverlayApplied: false,
    postRegionSha256: rollbackPreflight.regionsSnapshot.sha256,
    exactCurrentPostState: true,
  },
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    exactTargetCellCount: targets.length,
    interactionHaloCellCount: halo.length,
    declaredChangedCellCount: declaredHaloChanges.length,
    undeclaredChangedCellCount: undeclaredHaloChanges.length,
    predecessorPreservedCellCount: predecessorTargets.length,
    rollbackGuardPassCount: rollbackPreflight.passed,
  },
  safetyBoundary: {
    liveCallsPerformedByQa: false,
    worldEditsPerformedByQa: false,
    serviceMutationsPerformedByQa: false,
    readOnlyImmutableAnvilInputs: true,
    routeCommissionedByThisQa: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-R10H B03 passive route-lighting post-release QA\n\n`
  + `**Status:** PASS — executed, post-state verified, reversible  \n`
  + `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`\n\n`
  + `All 48 exact targets changed from polished diorite to sea lantern. The exact `
  + `1,296-cell interaction halo contains exactly those 48 declared changes and zero undeclared or lifecycle drift. `
  + `Both immutable saves contain zero block entities and zero saved entities in the halo, and all 5,346 accepted R10G predecessor target states are unchanged.\n\n`
  + `Strict execution completed 48/48 groups with zero failures or no-ops. The 102-record journal is sequential and complete, all temporary force-loads were released, all 17 wrapper stages passed, and the exact post-state inverse passes 48/48 guards. `
  + `This QA made no live call or mutation and does not itself commission a route.\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  targets: report.summary.exactTargetCellCount,
  halo: report.summary.interactionHaloCellCount,
  declaredDiffs: report.summary.declaredChangedCellCount,
  undeclaredDiffs: report.summary.undeclaredChangedCellCount,
  rollbackGuards: report.summary.rollbackGuardPassCount,
  liveCallsPerformedByQa: false,
}, null, 2)}\n`);
