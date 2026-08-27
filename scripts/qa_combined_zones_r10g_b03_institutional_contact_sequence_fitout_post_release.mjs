#!/usr/bin/env node
/** Independent, read-only post-release QA for CZ-R10G. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T03:35:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r10g-live-20260822T031853Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r10g-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r10g-post-release-qa.md'));
const R10A_MANIFEST_PATH =
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json';

const EXPECTED = Object.freeze({
  ledgerSha256: '5710be3be4e9d9706e35373ab56e892aaae00a546033e986fe56d4ed4ba38f57',
  manifestSha256: 'a7a078df110d10160fb47dcb538067769739db79cc3ba765757b4d4fdf28a73e',
  manifestIdentity: 'f4cba8ea0e4fdb3a8c5e036675c9ca9fac1842b8cffe1a4605e2297fc5d52ea4',
  sourceCompleteSaveSha256: '221b76f0f8298a29de35c52c8a77fff00d2e3f95b589755f773d646e4d2f0edb',
  sourceRegionSha256: 'ea3a584625d99d3568cc5f107f3e38309f8cc4f18e481718f6790c5af448a508',
  postCompleteSaveSha256: 'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd',
  postRegionSha256: '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
  sourceBoundReleaseIdentitySha256:
    '41a05a90c1f8f1fc779d19096db6b887814f7b99cc8107e0243ec0a8784fba75',
  completedReleaseIdentitySha256:
    '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d',
  targetCount: 5346,
  contactTargetCount: 5202,
  cheyenneTargetCount: 144,
  routeCount: 5940,
  haloCount: 21528,
  fixtureCount: 49,
  r10aTargetCount: 594,
  r10aRouteCount: 660,
  stageCount: 24,
  evidenceBindingCount: 25,
});

const AIR = 'minecraft:air';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10G post-release QA rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const stateCensus = (records, field = 'state') => Object.fromEntries([...records.reduce(
  (counts, record) => counts.set(record[field], (counts.get(record[field]) ?? 0) + 1),
  new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));
const stateSetSha256 = (records) => sha256(
  `combined-zones-current-block-state-set-v1\n${records.slice().sort((left, right) => (
    left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
  )).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`,
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
};

function parseOperations(filename) {
  const output = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]); x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]); y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]); z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          output.push({ cell: { x, y, z }, sourceState: fields[7], targetState: fields[8] });
        }
      }
    }
  }
  return output;
}

function operationBodySha256(filename) {
  return sha256(`${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
}

function exactReverseInverse(forward, rollback) {
  return forward.length === rollback.length && rollback.every((operation, index) => {
    const inverse = forward.at(-(index + 1));
    return cellKey(operation.cell) === cellKey(inverse.cell)
      && operation.sourceState === inverse.targetState
      && operation.targetState === inverse.sourceState;
  });
}

function connectivity(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const neighbour of [
        `${x - 1},${y},${z}`, `${x + 1},${y},${z}`,
        `${x},${y - 1},${z}`, `${x},${y + 1},${z}`,
        `${x},${y},${z - 1}`, `${x},${y},${z + 1}`,
      ]) if (remaining.delete(neighbour)) stack.push(neighbour);
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

async function states(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}

function changes(source, post) {
  const postByKey = new Map(post.map(({ cell, state }) => [cellKey(cell), state]));
  return source.filter(({ cell, state }) => state !== postByKey.get(cellKey(cell))).map((record) => ({
    cell: record.cell,
    sourceState: record.state,
    postState: postByKey.get(cellKey(record.cell)),
  }));
}

function desiredFailures(observed, desired) {
  const byKey = new Map(desired.map(({ cell, targetState }) => [cellKey(cell), targetState]));
  return observed.filter(({ cell, state }) => state !== byKey.get(cellKey(cell)));
}

function inspectJournal(filename, operationSha256, commandCount) {
  const records = fs.readFileSync(absolute(filename), 'utf8').trim().split(/\r?\n/)
    .map((line) => JSON.parse(line));
  const expectedRecordCount = (2 * commandCount) + 6;
  return {
    ...fileBinding(filename),
    recordCount: records.length,
    expectedRecordCount,
    firstStatus: records[0]?.status ?? null,
    lastStatus: records.at(-1)?.status ?? null,
    sequenceComplete: records.every((record, index) => record.sequence === index + 1),
    allOperationBindingsMatch: records.every((record) => (
      record.operationSha256 === undefined || record.operationSha256 === operationSha256
    )),
    finalBatchStatus: records.at(-1)?.batch?.status ?? null,
    finalCompletedGroupCount: records.at(-1)?.batch?.completedGroupCount ?? null,
    passed: records.length === expectedRecordCount
      && records.every((record, index) => record.sequence === index + 1)
      && records.every((record) => (
        record.operationSha256 === undefined || record.operationSha256 === operationSha256
      ))
      && records.at(-1)?.status === 'complete'
      && records.at(-1)?.batch?.status === 'completed-cleaned'
      && records.at(-1)?.batch?.completedGroupCount === commandCount,
  };
}

async function entityCensus(regionReader, entityReader, bounds) {
  const blockEntities = [];
  const savedEntities = [];
  for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) {
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
      const chunk = await regionReader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (insideBounds(point, bounds)) blockEntities.push({ id: entity.id ?? null, point });
      }
      const entityChunk = await entityReader.chunk(cx, cz);
      for (const entity of entityChunk?.Entities ?? []) {
        if (savedEntityInside(entity, bounds)) {
          savedEntities.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
        }
      }
    }
  }
  return { blockEntities, savedEntities };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && manifestBinding.sha256 === EXPECTED.manifestSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.stages.length === EXPECTED.stageCount
  && ledger.stages.every(({ status }) => status === 'PASS'),
'terminal ledger, manifest, or wrapper stages drifted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256,
'ledger/manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest payload identity drifted');

const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256,
'immutable source/post identity drifted');
const recomputedSourceBoundIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
const recomputedCompletedIdentity = sha256(JSON.stringify({
  sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(
    ({ path: reportPath, sha256: reportSha256 }) => ({ path: reportPath, sha256: reportSha256 }),
  ),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)),
}));
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundReleaseIdentitySha256
  && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundIdentity
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedIdentity,
'completed release identity drifted');
const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings) {
  const actual = fileBinding(binding.path);
  if (actual.sha256 !== binding.sha256 || actual.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, actual });
  }
}
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceBindingCount
  && evidenceBindingFailures.length === 0, 'evidence binding drifted');

const packageRecords = manifest.packages.map((releasePackage, index) => {
  const ledgerPackage = ledger.packages[index];
  invariant(releasePackage.key === ledgerPackage.key, 'package order drifted');
  const forward = parseOperations(releasePackage.forward);
  const rollback = parseOperations(releasePackage.rollback);
  invariant(fileBinding(releasePackage.forward).sha256 === ledgerPackage.forward.sha256
    && fileBinding(releasePackage.rollback).sha256 === ledgerPackage.rollback.sha256
    && operationBodySha256(releasePackage.forward)
      === manifest.operations[releasePackage.key].forwardSha256
    && operationBodySha256(releasePackage.rollback)
      === manifest.operations[releasePackage.key].rollbackSha256
    && exactReverseInverse(forward, rollback),
  `${releasePackage.key} file/body/inverse binding drifted`);
  return { releasePackage, ledgerPackage, forward, rollback };
});
const targetRecords = packageRecords.flatMap(({ forward }) => forward);
const targetCells = targetRecords.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(packageRecords[0].forward.length === EXPECTED.contactTargetCount
  && packageRecords[1].forward.length === EXPECTED.cheyenneTargetCount
  && targetRecords.length === EXPECTED.targetCount
  && targetKeys.size === EXPECTED.targetCount
  && hashCells(targetCells) === manifest.target.operatedUnion.coordinateSetSha256,
'two-owner target union drifted');

// Derive the frozen straight B03 section independently from its exact endpoint range.
const route = cellsIn({
  minX: 2081, maxX: 2377, minY: 166, maxY: 169, minZ: -870, maxZ: -866,
});
const upstreamSeam = cellsIn({
  minX: 2378, maxX: 2378, minY: 166, maxY: 169, minZ: -870, maxZ: -866,
});
const downstreamSeam = cellsIn({
  minX: 2080, maxX: 2080, minY: 166, maxY: 169, minZ: -870, maxZ: -866,
});
const fixtures = Array.from({ length: 49 }, (_, index) => ({
  x: 2372 - (index * 6), y: 170, z: -868,
}));
const halo = cellsIn(manifest.safetyAudit.halo);
const routeTopology = connectivity(route);
invariant(route.length === EXPECTED.routeCount
  && hashCells(route) === manifest.target.routeVoid.coordinateSetSha256
  && upstreamSeam.length === 20
  && hashCells(upstreamSeam)
    === manifest.scope.geometry.upstreamOpenInteriorSeam.routeVoid.coordinateSetSha256
  && downstreamSeam.length === 20
  && hashCells(downstreamSeam)
    === manifest.scope.geometry.downstreamAcceptedR10aInteriorSeam.routeVoid.coordinateSetSha256
  && fixtures.length === EXPECTED.fixtureCount
  && hashCells(fixtures) === manifest.scope.geometry.passiveFixtures.coordinateSetSha256
  && halo.length === EXPECTED.haloCount
  && routeTopology.componentCount === 1
  && routeTopology.largestComponentCellCount === EXPECTED.routeCount,
'route, seam, fixture, halo, or connectivity geometry drifted');

const r10aManifest = readJson(R10A_MANIFEST_PATH);
const r10aRecords = r10aManifest.packages.flatMap(({ forward }) => parseOperations(forward));
const r10aTargets = r10aRecords.map(({ cell }) => cell);
const r10aRoute = cellsIn(r10aManifest.scope.geometry.galleryRouteVoid.bounds);
const r10aTerminus = cellsIn(r10aManifest.scope.geometry.preservedTerminusCap.bounds);
invariant(r10aRecords.length === EXPECTED.r10aTargetCount
  && r10aRoute.length === EXPECTED.r10aRouteCount
  && hashCells(r10aRoute) === r10aManifest.scope.geometry.galleryRouteVoid.coordinateSetSha256
  && r10aTargets.every((cell) => !targetKeys.has(cellKey(cell))),
'accepted R10A target/route seam geometry drifted');

const sourceReader = new AnvilReader(absolute(ledger.sourceSnapshot.regions));
const postReader = new AnvilReader(absolute(ledger.postSnapshot.regions));
const sourceEntityReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'entities')));
const postEntityReader = new AnvilReader(absolute(path.join(ledger.postSnapshot.root, 'entities')));
const [sourceTargets, postTargets, sourceRoute, postRoute, sourceUpstream, postUpstream,
  sourceDownstream, postDownstream, sourceHalo, postHalo, sourceR10a, postR10a,
  sourceR10aRoute, postR10aRoute, sourceR10aTerminus, postR10aTerminus] = await Promise.all([
  states(sourceReader, targetCells), states(postReader, targetCells),
  states(sourceReader, route), states(postReader, route),
  states(sourceReader, upstreamSeam), states(postReader, upstreamSeam),
  states(sourceReader, downstreamSeam), states(postReader, downstreamSeam),
  states(sourceReader, halo), states(postReader, halo),
  states(sourceReader, r10aTargets), states(postReader, r10aTargets),
  states(sourceReader, r10aRoute), states(postReader, r10aRoute),
  states(sourceReader, r10aTerminus), states(postReader, r10aTerminus),
]);
const sourceTargetFailures = sourceTargets.filter(({ cell, state }) => (
  state !== targetRecords.find((record) => cellKey(record.cell) === cellKey(cell))?.sourceState
));
const postTargetFailures = desiredFailures(postTargets, targetRecords);
const targetChanges = changes(sourceTargets, postTargets);
const haloChanges = changes(sourceHalo, postHalo);
const declaredHaloChanges = haloChanges.filter(({ cell }) => targetKeys.has(cellKey(cell)));
const undeclaredHaloChanges = haloChanges.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
const routeChanges = changes(sourceRoute, postRoute);
const upstreamChanges = changes(sourceUpstream, postUpstream);
const downstreamChanges = changes(sourceDownstream, postDownstream);
const r10aChanges = changes(sourceR10a, postR10a);
const r10aRouteChanges = changes(sourceR10aRoute, postR10aRoute);
const r10aTerminusChanges = changes(sourceR10aTerminus, postR10aTerminus);
invariant(sourceTargetFailures.length === 0 && postTargetFailures.length === 0
  && targetChanges.length === EXPECTED.targetCount,
'one or more exact target transitions failed');
invariant([...sourceRoute, ...postRoute, ...sourceUpstream, ...postUpstream,
  ...sourceDownstream, ...postDownstream, ...sourceR10aRoute, ...postR10aRoute]
  .every(({ state }) => state === AIR), 'route or interior seam is not exact air');
invariant(routeChanges.length === 0 && upstreamChanges.length === 0 && downstreamChanges.length === 0
  && r10aChanges.length === 0 && r10aRouteChanges.length === 0
  && r10aTerminusChanges.length === 0
  && desiredFailures(sourceR10a, r10aRecords).length === 0
  && desiredFailures(postR10a, r10aRecords).length === 0,
'accepted R10A or route seam changed');
invariant(haloChanges.length === EXPECTED.targetCount
  && declaredHaloChanges.length === EXPECTED.targetCount
  && undeclaredHaloChanges.length === 0,
'21,528-cell interaction halo contains undeclared drift');

const [sourceEntities, postEntities] = await Promise.all([
  entityCensus(sourceReader, sourceEntityReader, boundsOf(halo)),
  entityCensus(postReader, postEntityReader, boundsOf(halo)),
]);
invariant(sourceEntities.blockEntities.length === 0 && sourceEntities.savedEntities.length === 0
  && postEntities.blockEntities.length === 0 && postEntities.savedEntities.length === 0,
'source or post halo contains a block entity or saved entity');

const sourceMembers = new Map(sourceIntake.requiredMembers.map((entry) => [entry.path, entry]));
const postMembers = new Map(postIntake.requiredMembers.map((entry) => [entry.path, entry]));
const allMemberPaths = [...new Set([...sourceMembers.keys(), ...postMembers.keys()])].sort();
const changedSaveMembers = allMemberPaths.filter((memberPath) => (
  sourceMembers.get(memberPath)?.sha256 !== postMembers.get(memberPath)?.sha256
  || sourceMembers.get(memberPath)?.bytes !== postMembers.get(memberPath)?.bytes
));
invariant(allMemberPaths.length === 130
  && changedSaveMembers.includes('region/r.4.-2.mca')
  && changedSaveMembers.filter((entry) => entry.startsWith('poi/')).length === 0
  && changedSaveMembers.every((memberPath) => (
    sourceMembers.get(memberPath)?.stableDuringAudit === true
    && postMembers.get(memberPath)?.stableDuringAudit === true
  )), 'complete-save lifecycle accounting drifted');

const executionEvidence = {};
for (const record of packageRecords) {
  const key = record.releasePackage.key;
  const executionPath = path.join(EVIDENCE_DIR, `${key}.forward-execution.json`);
  const rollbackPath = path.join(EVIDENCE_DIR, `${key}.rollback-poststate-preflight.json`);
  const sameMomentPath = path.join(EVIDENCE_DIR, `${key}.same-moment-entity-clearance.json`);
  const execution = readJson(executionPath);
  const rollback = readJson(rollbackPath);
  const sameMoment = readJson(sameMomentPath);
  const journal = inspectJournal(execution.streamJournal, record.ledgerPackage.forward.sha256,
    record.forward.length);
  const executionPassed = execution.status === 'complete'
    && execution.dryRun === false && execution.strictNoop === true
    && execution.operationRole === 'forward'
    && execution.operationSha256 === record.ledgerPackage.forward.sha256
    && execution.successfulGroups === record.forward.length
    && execution.successfulCommands === record.forward.length
    && execution.failedGroups === 0 && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.unexpectedNoopCommands === 0
    && execution.unknownReplyCommands === 0 && execution.worldEditLeftoverCount === 0
    && execution.forceLoadAudit?.allRequiredChunksLoadedBeforeCommands === true
    && execution.forceLoadAudit?.allTemporaryReleased === true
    && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true
    && execution.streamJournalSha256 === journal.sha256 && journal.passed;
  const rollbackPassed = rollback.status === 'PASS'
    && rollback.operationCount === record.rollback.length
    && rollback.passed === record.rollback.length && rollback.failed === 0
    && rollback.opsSha256 === record.ledgerPackage.rollback.sha256
    && rollback.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256;
  const entityPassed = sameMoment.status === 'PASS'
    && sameMoment.totals?.blockingEntityHits === 0;
  invariant(executionPassed && rollbackPassed && entityPassed,
    `${key} execution, journal, entity, or rollback evidence failed`);
  executionEvidence[key] = {
    strictForwardExecution: {
      ...fileBinding(executionPath),
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noOpCommands: execution.noopCommands,
      journal,
      passed: executionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      passedGuards: rollback.passed,
      failedGuards: rollback.failed,
      passed: rollbackPassed,
    },
    sameMomentEntityClearance: {
      ...fileBinding(sameMomentPath),
      blockingEntityHits: sameMoment.totals?.blockingEntityHits,
      passed: entityPassed,
    },
  };
}
invariant(ledger.rollbackPoststatePreflights.length === 2
  && ledger.rollbackPoststatePreflights[0].path.includes('z10-cheyenne')
  && ledger.rollbackPoststatePreflights[1].path.includes('z08-institutional'),
'rollback post-state evidence order is not Z10 then Z08');
const manifestQa = readJson(path.join(EVIDENCE_DIR, 'exact-release-manifest-qa.json'));
const blockEntityGate = readJson(path.join(EVIDENCE_DIR, 'block-entity-clearance.json'));
const liveEntityGate = readJson(path.join(EVIDENCE_DIR, 'live-entity-clearance.json'));
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 5346
  && manifestQa.totals.crossPackageIntersectionCells === 0
  && blockEntityGate.status === 'PASS' && blockEntityGate.blockingBlockEntityCount === 0
  && liveEntityGate.status === 'PASS' && liveEntityGate.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity gate failed');

const targetDesiredCensus = stateCensus(targetRecords, 'targetState');
const checks = [
  ['R10G-QA-01-TERMINAL-IDENTITY-AND-24-STAGES', true],
  ['R10G-QA-02-TWO-OWNER-DISJOINT-SPLIT-5202-144',
    packageRecords[0].forward.length === 5202 && packageRecords[1].forward.length === 144],
  ['R10G-QA-03-EXACT-5346-SOURCE-TO-POST-TRANSITIONS',
    sourceTargetFailures.length === 0 && postTargetFailures.length === 0],
  ['R10G-QA-04-EXACT-MATERIAL-CENSUS',
    JSON.stringify(targetDesiredCensus) === JSON.stringify(manifest.target.desiredStateCensus)],
  ['R10G-QA-05-EXACT-5940-CONNECTED-AIR-ROUTE',
    routeTopology.componentCount === 1 && routeChanges.length === 0],
  ['R10G-QA-06-EXACT-49-FIXTURE-CADENCE',
    fixtures.every((cell) => postTargets.some(({ cell: target, state }) => (
      cellKey(target) === cellKey(cell) && state === 'minecraft:sea_lantern'
    )))],
  ['R10G-QA-07-BOTH-20-CELL-INTERIOR-SEAMS-PRESERVED',
    upstreamChanges.length === 0 && downstreamChanges.length === 0],
  ['R10G-QA-08-ACCEPTED-R10A-GALLERY-ROUTE-AND-TERMINUS-PRESERVED',
    r10aChanges.length === 0 && r10aRouteChanges.length === 0 && r10aTerminusChanges.length === 0],
  ['R10G-QA-09-EXACT-21528-HALO-ZERO-UNDECLARED-DRIFT',
    haloChanges.length === 5346 && undeclaredHaloChanges.length === 0],
  ['R10G-QA-10-ZERO-SNAPSHOT-ENTITY-OR-BLOCK-ENTITY-INTERSECTION',
    sourceEntities.blockEntities.length === 0 && sourceEntities.savedEntities.length === 0
      && postEntities.blockEntities.length === 0 && postEntities.savedEntities.length === 0],
  ['R10G-QA-11-WRAPPER-ENTITY-AND-BLOCK-ENTITY-GATES',
    blockEntityGate.status === 'PASS' && liveEntityGate.status === 'PASS'],
  ['R10G-QA-12-STRICT-JOURNALED-TWO-PACKAGE-EXECUTION',
    Object.values(executionEvidence).every(({ strictForwardExecution }) => (
      strictForwardExecution.passed
    ))],
  ['R10G-QA-13-REVERSE-144-THEN-5202-READY',
    Object.values(executionEvidence).every(({ rollbackPoststatePreflight }) => (
      rollbackPoststatePreflight.passed
    ))],
  ['R10G-QA-14-NO-ROUTE-ACCESS-CONTROL-OR-ACTIVE-SYSTEM-COMMISSIONING',
    manifest.scope.operationalBoundary.secureOrPublicRouteCommissioned === false
      && manifest.scope.operationalBoundary.accessControlMechanismCommissioned === false
      && manifest.scope.operationalBoundary.activeSystemInstalled === false],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `checks failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R10G_B03_INSTITUTIONAL_CONTACT_SEQUENCE_POSTSTATE_VERIFIED_REVERSIBLE_UNCOMMISSIONED',
  release: {
    transactionId: ledger.transactionId,
    releaseNodeId: ledger.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailures,
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
  },
  exactPostState: {
    targetCellCount: targetRecords.length,
    targetCoordinateSetSha256: hashCells(targetCells),
    ownerPackageCounts: Object.fromEntries(packageRecords.map(({ releasePackage, forward }) => (
      [releasePackage.key, forward.length]
    ))),
    ownerTargetsDisjoint: targetKeys.size === targetRecords.length,
    sourceStateCensus: stateCensus(targetRecords, 'sourceState'),
    desiredStateCensus: targetDesiredCensus,
    postStateCensus: stateCensus(postTargets),
    exactSourceGuardPassCount: targetRecords.length - sourceTargetFailures.length,
    exactSourceGuardFailureCount: sourceTargetFailures.length,
    exactPostTargetPassCount: targetRecords.length - postTargetFailures.length,
    exactPostTargetFailureCount: postTargetFailures.length,
    exactReverseOrderInverseByPackage: Object.fromEntries(packageRecords.map((record) => [
      record.releasePackage.key,
      exactReverseInverse(record.forward, record.rollback),
    ])),
  },
  routeAndFixtures: {
    routeAirCellCount: route.length,
    routeCoordinateSetSha256: hashCells(route),
    routeComponentCount: routeTopology.componentCount,
    routeLargestComponentCellCount: routeTopology.largestComponentCellCount,
    sourceRouteAirPassCount: sourceRoute.filter(({ state }) => state === AIR).length,
    postRouteAirPassCount: postRoute.filter(({ state }) => state === AIR).length,
    routeChangedCellCount: routeChanges.length,
    fixtureCellCount: fixtures.length,
    fixtureCoordinateSetSha256: hashCells(fixtures),
    fixtureXsDescending: fixtures.map(({ x }) => x),
    maximumFixtureSpacingBlocks: 6,
    securityFrameCellCount: manifest.scope.geometry.securityFrame.cellCount,
  },
  preservation: {
    upstreamInteriorSeamCellCount: upstreamSeam.length,
    upstreamInteriorSeamChangedCellCount: upstreamChanges.length,
    downstreamR10aInteriorSeamCellCount: downstreamSeam.length,
    downstreamR10aInteriorSeamChangedCellCount: downstreamChanges.length,
    acceptedR10aTargetCellCount: r10aTargets.length,
    acceptedR10aTargetChangedCellCount: r10aChanges.length,
    acceptedR10aRouteAirCellCount: r10aRoute.length,
    acceptedR10aRouteChangedCellCount: r10aRouteChanges.length,
    acceptedR10aFailClosedTerminusCellCount: r10aTerminus.length,
    acceptedR10aFailClosedTerminusChangedCellCount: r10aTerminusChanges.length,
  },
  drift: {
    interactionHaloCellCount: halo.length,
    interactionHaloBounds: boundsOf(halo),
    interactionHaloCoordinateSetSha256: hashCells(halo),
    sourceStateSetSha256: stateSetSha256(sourceHalo),
    postStateSetSha256: stateSetSha256(postHalo),
    changedCellCount: haloChanges.length,
    declaredTargetChangedCellCount: declaredHaloChanges.length,
    undeclaredChangedCellCount: undeclaredHaloChanges.length,
    lifecycleTransitionCount: undeclaredHaloChanges.length,
  },
  entityAndBlockEntityPreservation: {
    sourceSnapshotBlockEntityCount: sourceEntities.blockEntities.length,
    sourceSnapshotSavedEntityCount: sourceEntities.savedEntities.length,
    postSnapshotBlockEntityCount: postEntities.blockEntities.length,
    postSnapshotSavedEntityCount: postEntities.savedEntities.length,
    wrapperBlockEntityClearance: blockEntityGate.status,
    wrapperLiveEntityClearance: liveEntityGate.status,
  },
  completeSaveDiffAccounting: {
    requiredMemberCount: allMemberPaths.length,
    unchangedMemberCount: allMemberPaths.length - changedSaveMembers.length,
    changedMemberCount: changedSaveMembers.length,
    changedMemberPaths: changedSaveMembers,
    targetRegionMember: 'region/r.4.-2.mca',
    targetRegionMemberIncluded: changedSaveMembers.includes('region/r.4.-2.mca'),
    changedPoiMemberCount: changedSaveMembers.filter((entry) => entry.startsWith('poi/')).length,
    exactBlockDomainUndeclaredDifferenceCount: undeclaredHaloChanges.length,
    completeSaveMemberChangesDoNotAuthorizeUndeclaredBlockMutation: true,
  },
  executionEvidence: {
    wrapperStageCount: ledger.stages.length,
    wrapperPassedStageCount: ledger.stages.filter(({ status }) => status === 'PASS').length,
    wrapperFailedStageCount: ledger.stages.filter(({ status }) => status !== 'PASS').length,
    packageEvidence: executionEvidence,
    rollbackOrder: ledger.rollbackPoststatePreflights.map(({ path: reportPath }) => reportPath),
  },
  operationalBoundary: {
    acceptedScope: 'source-proven B03 institutional contact-sequence liner and passive fixtures',
    routeVoidPreserved: true,
    secureOrPublicRouteCommissioned: false,
    accessControlMechanismCommissioned: false,
    activeSystemInstalled: false,
    exteriorOpeningCreated: false,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    exactTargetCellCount: targetRecords.length,
    routeAirCellCount: route.length,
    fixtureCellCount: fixtures.length,
    interactionHaloCellCount: halo.length,
    undeclaredChangedCellCount: undeclaredHaloChanges.length,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), [
  '# CZ-R10G B03 institutional contact-sequence fit-out post-release QA',
  '',
  '**Status:** PASS',
  `**QA payload:** \`${qaPayloadSha256}\``,
  `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\``,
  '',
  `All ${targetRecords.length.toLocaleString('en-US')} guarded targets match their exact source and post states. The canonical-owner split is ${packageRecords[0].forward.length.toLocaleString('en-US')} Z08 cells plus ${packageRecords[1].forward.length.toLocaleString('en-US')} disjoint Z10 cells.`,
  '',
  `The ${route.length.toLocaleString('en-US')}-cell route void remains one connected air component. Both 20-cell interior seams, the accepted ${r10aTargets.length}-cell R10A liner, its ${r10aRoute.length}-cell route, and its 20-cell fail-closed terminus are unchanged. All ${fixtures.length} passive fixtures match the exact six-block cadence.`,
  '',
  `The exact ${halo.length.toLocaleString('en-US')}-cell interaction domain contains ${haloChanges.length.toLocaleString('en-US')} declared target changes and zero undeclared or lifecycle drift. Both immutable snapshots contain zero block entities and zero saved entities in that domain.`,
  '',
  `All ${ledger.stages.length} wrapper stages and ${ledger.evidenceBindings.length} evidence bindings pass. The two strict journals are complete and cleaned after ${targetRecords.length.toLocaleString('en-US')} successful groups with zero no-ops. Reverse post-state preflights pass 144/144 then 5,202/5,202.`,
  '',
  'Acceptance is limited to the durable liner and passive wayfinding. The route, access control, and all active systems remain uncommissioned. This verifier made no live call and no world mutation.',
  '',
].join('\n'));
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  targets: report.summary.exactTargetCellCount,
  routeAir: report.summary.routeAirCellCount,
  fixtures: report.summary.fixtureCellCount,
  halo: report.summary.interactionHaloCellCount,
  undeclaredDrift: report.summary.undeclaredChangedCellCount,
  stages: report.executionEvidence.wrapperPassedStageCount,
  liveCallsPerformed: false,
}, null, 2));
