#!/usr/bin/env node
/** Read-only R08T EE-SMOKE-S post-release QA and commissioning seal. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, D06_CELL_PREAMBLE, boundsOf, cellKey, cellsIn, hashCells,
  rawCoordinateHash, sha256, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T19:45:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08t-live-20260821T194152Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08t-empty-eight-south-smoke-boundary.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08t-post-20260821T194152Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08t-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08t-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08t-south-smoke-boundary-commissioning-seal.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown', path.join(EVIDENCE_DIR, 'r08t-south-smoke-boundary-commissioning-seal.md'));

const BASENAME = 'combined-zones-r08t-empty-eight-south-smoke-boundary';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const LIFE_SAFETY_PATH = 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json';
const LAYER_B_PATH = 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json';
const N06_PATH = 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json';
const EXPECTED = Object.freeze({
  ledgerFile: 'ee64b2008872e1508636074ef3e62e1f8bb0053a26bfaf540d0e554db0872293',
  manifestFile: 'b40e397e28469617fc33572e57ed2ec986a0548be169e91c19faeb3b94bbddde',
  manifestIdentity: 'd8b75ef1c7df83fea7cfb9e4ac389dd4f001a8ebcd7ea6ccfaeb56e723a414da',
  sourceSave: '7140b0599c233141f4517a0e006d35dd7da97e2d18a9a6743a4152d9ebb98853',
  postSave: 'fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec',
  sourceRegion: 'b6a9ac51eb9cc56a734aeb090cf804ae7f24a05f7680ccc02834e62ea30367af',
  postRegion: '42001ae747a852e64aead34dcdcfa67b5c22dd45ba25cd49385b633b40155023',
  sourceBoundRelease: '05fa39e22854b8dac8d1e99c45a2e548171aedabd031ec223f31e1f695bc2e5b',
  executionBinding: 'fc22937211518cd6ce275e2d7e57b73133cab757e19c04a218afab3bf6e5bf2e',
  completedRelease: '0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f',
  fullHash: '51d63bc45fdd53230f5ed9c3ed0df6777668eecc45a2017baa1eba6ed38c7a1e',
  d06Hash: '7055645cb0c309d8f57ae81fba68e933ca64f7f038259ec501e8b8c21402796f',
  haloHash: '48901cc6c463551a9864407322fe4281374e4636a617c84fae907f7498d31918',
  stageCount: 24, evidenceCount: 25,
});
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08T post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
function parseOperations(filename) {
  const output = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename} malformed`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.slice(0, 3).every((entry, index) => entry === coordinates[index + 3]),
      `${filename} is not point-exact`);
    output.push({ cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7], toState: fields[8] });
  }
  return output;
}
function components(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) stack.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0,
    componentSizes: sizes };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const design = readJson(DESIGN_PATH);
const lifeSafety = readJson(LIFE_SAFETY_PATH);
const layerB = readJson(LAYER_B_PATH);
const n06 = readJson(N06_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME && ledger.releaseNodeId === RELEASE_NODE_ID,
'terminal release identity drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFile
  && manifestBinding.sha256 === EXPECTED.manifestFile
  && ledger.manifest.sha256 === EXPECTED.manifestFile
  && manifest.manifestIdentity === EXPECTED.manifestIdentity
  && sha256(JSON.stringify(manifestPayload)) === manifest.manifestIdentity,
'ledger/manifest binding drifted');
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'completed release identities drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT),
'source/post immutable snapshot binding drifted');
const evidenceMismatches = ledger.evidenceBindings.filter((binding) => {
  const observed = fileBinding(binding.path);
  return observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes;
});
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceCount && evidenceMismatches.length === 0,
'ledger evidence binding drifted');

const forwardOrder = manifest.executionOrder.forward;
const rollbackOrder = manifest.executionOrder.rollback;
const expectedStages = [
  'standing-authorization', 'exact-release-manifest-qa', 'fresh-source-complete-save',
  'source-complete-save-intake', 'source-snapshot-identity',
  ...forwardOrder.flatMap((key) => [`forward-source-preflight:${key}`, `strict-forward-parser-check:${key}`, `strict-rollback-parser-check:${key}`]),
  ...rollbackOrder.map((key) => `projected-rollback-preflight:${key}`),
  'block-entity-clearance', 'live-entity-clearance',
  ...forwardOrder.flatMap((key) => [`same-moment-package-entity-clearance:${key}`, `strict-forward-execution:${key}`]),
  'fresh-post-complete-save', 'post-complete-save-intake', 'post-snapshot-identity',
  ...rollbackOrder.map((key) => `rollback-poststate-preflight:${key}`),
];
invariant(expectedStages.length === EXPECTED.stageCount
  && JSON.stringify(ledger.stages.map(({ stage }) => stage)) === JSON.stringify(expectedStages)
  && ledger.stages.every(({ status }) => status === 'PASS')
  && JSON.stringify(rollbackOrder) === JSON.stringify(forwardOrder.slice().reverse()),
'execution stage or package order drifted');

const smokeSource = design.d06.lifeSafety.smokeBoundaries.find(({ id }) => id === 'EE-SMOKE-S');
const smokeAlternative = lifeSafety.d06EmptyEightLifeSafety.failClosedBarriersAndSmokeInterfaces
  .smokeBoundaries.find(({ id }) => id === 'EE-SMOKE-S');
const contract = layerB.contracts.find(({ contractId }) => contractId === 'IF-D06-EE-SMOKE-S-COMPARTMENT');
const capCells = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: 150, maxZ: 150,
}));
const capKeys = new Set(capCells.map(cellKey));
const full = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 150, maxZ: 150 });
const wall = full.filter((cell) => !capKeys.has(cellKey(cell)));
const fullKeys = new Set(full.map(cellKey));
const halo = uniqueCells(full.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !fullKeys.has(cellKey(cell))));
invariant(wall.length === 1336 && capCells.length === 36 && full.length === 1372 && halo.length === 3150
  && rawCoordinateHash(wall) === smokeSource.boundaryPlane.cellSetSha256
  && hashCells(full) === EXPECTED.fullHash && hashCells(full, D06_CELL_PREAMBLE) === EXPECTED.d06Hash
  && hashCells(halo) === EXPECTED.haloHash
  && smokeAlternative.completeFailClosedBoundary.coordinateSetSha256 === EXPECTED.d06Hash
  && contract.acceptance.accepted === true && contract.interfaceCellCount === full.length
  && contract.pairManifestClosure.classification === 'TERMINAL_CAP',
'frozen/accepted smoke-boundary geometry drifted');
invariant(components(wall).componentCount === 1
  && JSON.stringify(components(capCells).componentSizes) === JSON.stringify([9, 9, 9, 9])
  && components(full).componentCount === 1,
'passive boundary topology drifted');

const operations = [];
const executionPackages = [];
for (const [index, pkg] of manifest.packages.entries()) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const declared = manifest.operations[pkg.key];
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256
    && ledger.packages[index].forward.sha256 === fileBinding(pkg.forward).sha256
    && ledger.packages[index].rollback.sha256 === fileBinding(pkg.rollback).sha256
    && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))), `${pkg.key} inverse or ledger binding drifted`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationRole === 'forward' && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.worldEditLeftoverCount === 0
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0 && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
  `${pkg.key} strict execution or rollback evidence failed`);
  executionPackages.push({ key: pkg.key, commandCount: forward.length,
    successfulCommands: execution.successfulCommands, rollbackGuardCount: rollbackPreflight.passed });
}
invariant(operations.length === 1372 && uniqueCells(operations.map(({ cell }) => cell)).length === 1372,
'operation union is not an exact target bijection');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const sourceStates = new Map();
const postStates = new Map();
async function readBoth(cell) {
  const key = cellKey(cell);
  if (!sourceStates.has(key)) sourceStates.set(key,
    stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  if (!postStates.has(key)) postStates.set(key,
    stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
}
for (const cell of uniqueCells([...full, ...halo])) await readBoth(cell);
const transitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const wallMismatch = wall.filter((cell) => postStates.get(cellKey(cell)) !== 'minecraft:stone_bricks');
const capMismatch = capCells.filter((cell) => postStates.get(cellKey(cell)) !== 'minecraft:polished_deepslate');
const haloDrift = halo.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(transitionMismatch.length === 0 && wallMismatch.length === 0 && capMismatch.length === 0
  && haloDrift.length === 0, 'exact target or halo outcome failed');

const gravityViolations = [];
for (const finding of manifest.isolation.retainedGravityHalo.findings) {
  await readBoth(finding.cell);
  await readBoth(finding.terminalSupport);
  if (sourceStates.get(cellKey(finding.cell)) !== finding.state
    || postStates.get(cellKey(finding.cell)) !== finding.state
    || sourceStates.get(cellKey(finding.terminalSupport)) !== finding.terminalSupportState
    || postStates.get(cellKey(finding.terminalSupport)) !== finding.terminalSupportState
    || finding.stableAndUnaffected !== true) gravityViolations.push(finding.cell);
}
invariant(manifest.isolation.retainedGravityHalo.count === 27 && gravityViolations.length === 0,
'retained gravity support closure drifted');

const retailRecords = [];
for (const shell of design.d06.concourseAndRetail.retailShells.filter(({ id }) => id !== 'EE-R-N06')) {
  for (const cell of cellsIn(shell.bounds)) {
    const boundary = cell.x === shell.bounds.minX || cell.x === shell.bounds.maxX
      || cell.y === shell.bounds.minY || cell.y === shell.bounds.maxY
      || cell.z === shell.bounds.minZ || cell.z === shell.bounds.maxZ;
    const expected = boundary ? 'minecraft:light_gray_concrete' : 'minecraft:air';
    const source = stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z));
    const post = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
    retailRecords.push({ source, post, expected });
  }
}
const retailDrift = retailRecords.filter(({ source, post, expected }) => source !== expected || post !== expected);
invariant(retailRecords.length === 9936 && retailDrift.length === 0,
'23 commissioned retail shells drifted');
const n06Findings = n06.targetGravity.findings;
const n06Drift = [];
for (const finding of n06Findings) {
  const source = stateToCommandString(await sourceReader.blockState(finding.cell.x, finding.cell.y, finding.cell.z));
  const post = stateToCommandString(await postReader.blockState(finding.cell.x, finding.cell.y, finding.cell.z));
  if (source !== finding.state || post !== finding.state) n06Drift.push(finding.cell);
}
invariant(n06Findings.length === 4 && n06Drift.length === 0, 'N06 local exception drifted');

const envelopeKeys = new Set([...full, ...halo].map(cellKey));
const blockEntities = [];
const savedEntities = [];
const envelopeBounds = boundsOf([...full, ...halo]);
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
  }
  const entities = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= envelopeBounds.minX && x < envelopeBounds.maxX + 1
      && y >= envelopeBounds.minY && y < envelopeBounds.maxY + 1
      && z >= envelopeBounds.minZ && z < envelopeBounds.maxZ + 1) {
      savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'post interaction envelope contains an entity');

const reportWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08T_SOUTH_SMOKE_BOUNDARY_POST_RELEASE_ACCEPTED',
  release: { transactionId: BASENAME, releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: manifest.scope.canonicalOwner, smokeBoundaryId: 'EE-SMOKE-S',
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  bindings: { ledger: { ...ledgerBinding, status: ledger.status }, manifest: manifestBinding,
    sourceCompleteSave: { root: ledger.sourceSnapshot.root, completeSaveSha256: EXPECTED.sourceSave,
      regionSnapshotSha256: EXPECTED.sourceRegion },
    postCompleteSave: { root: POST_ROOT, completeSaveSha256: EXPECTED.postSave,
      regionSnapshotSha256: EXPECTED.postRegion },
    ledgerEvidence: { declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceMismatches.length,
      mismatchCount: evidenceMismatches.length } },
  geometry: { compartmentWall: exactSet(wall), staticOpeningCaps: exactSet(capCells),
    completeFailClosedBoundary: exactSet(full), d06CoordinateSetSha256: EXPECTED.d06Hash,
    faceInteractionHalo: exactSet(halo), topology: { wall: components(wall),
      caps: components(capCells), complete: components(full) } },
  postState: {
    exactTransitions: { matchingCellCount: operations.length - transitionMismatch.length,
      mismatchCellCount: transitionMismatch.length },
    finalBoundary: { stoneBrickWallCount: wall.length - wallMismatch.length,
      polishedDeepslateCapCount: capCells.length - capMismatch.length,
      completeCellCount: full.length - wallMismatch.length - capMismatch.length,
      openingCount: 0, poweredMechanismCount: 0 },
    preservation: { haloUnchangedCount: halo.length - haloDrift.length,
      haloDriftCount: haloDrift.length, stableGravityHaloCount: 27,
      gravitySupportViolationCount: gravityViolations.length,
      commissionedRetailShellCount: 23, commissionedRetailShellCellCount: retailRecords.length,
      commissionedRetailShellPreservedCount: retailRecords.length - retailDrift.length,
      commissionedRetailShellDriftCount: retailDrift.length,
      n06BlockedCellCount: n06Findings.length, n06DriftCount: n06Drift.length,
      undeclaredDriftCount: haloDrift.length + retailDrift.length + n06Drift.length },
    postBlockEntityIntersectionCount: blockEntities.length,
    postSavedEntityIntersectionCount: savedEntities.length,
  },
  contract: { id: contract.contractId, accepted: contract.acceptance.accepted,
    classification: contract.pairManifestClosure.classification,
    passiveStaticCapDoctrine: true, poweredOpeningsAuthorized: false,
    smokeSystemCommissioned: false, ventilationCommissioned: false },
  executionEvidence: { stageOrder: { expectedStageCount: expectedStages.length,
    actualStageCount: ledger.stages.length, exact: true, allPass: true },
    packageOrder: { forward: forwardOrder, rollback: rollbackOrder }, packages: executionPackages,
    strictForwardExecution: { packageCount: 2, successfulCommandCount: 1372,
      failedCommandCount: 0, noopCommandCount: 0, passed: true },
    reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 1372,
      failedGuardCount: 0, regionSnapshotSha256: EXPECTED.postRegion, passed: true } },
  summary: { exactTargetCount: 1372, wallCellCount: 1336, staticCapCellCount: 36,
    passiveOpeningCount: 0, preservedHaloCellCount: 3150, stableGravityHaloCount: 27,
    preservedRetailShellCount: 23, preservedRetailShellCellCount: 9936,
    preservedN06BlockedCellCount: 4, undeclaredDriftCount: 0,
    strictExecutionCount: 1372, rollbackGuardCount: 1372 },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false,
    serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const sealWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08T_EE_SMOKE_S_PASSIVE_BOUNDARY_COMMISSIONED_FAIL_CLOSED',
  commissioningScope: { canonicalOwner: manifest.scope.canonicalOwner,
    smokeBoundaryId: 'EE-SMOKE-S', completeBoundaryCellCount: 1372,
    stoneBrickWallCellCount: 1336, staticFutureDoorCapCellCount: 36,
    retainedOpeningCount: 0, poweredMechanismCount: 0,
    passiveBoundaryCommissioned: true, operationalSmokeSystemCommissioned: false,
    ventilationCommissioned: false },
  acceptedEvidence: { r08tQa: {
    path: relative(path.join(EVIDENCE_DIR, 'r08t-post-release-qa.json')),
    sha256: sha256(fs.readFileSync(absolute(OUT_PATH))),
    bytes: fs.statSync(absolute(OUT_PATH)).size,
  }, r08tQaPayloadSha256: qaPayloadSha256,
    r08tCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  acceptance: { exactFinalStates: true, completeConnectedPlane: true,
    fourStaticDoorCaps: true, haloPreserved: true, gravitySupportClosurePreserved: true,
    commissionedRetailShellsPreserved: true, n06ExceptionPreserved: true,
    zeroUndeclaredDrift: true, strictExecutions: true, exactReverseRollbackReady: true },
  safetyBoundary: report.safetyBoundary,
};
const commissioningSealSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, commissioningSealSha256 };
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), `# R08T South Smoke Boundary Post-Release QA\n\nStatus: **${report.status}**\n\n`
  + `- Exact final boundary: 1,372/1,372; wall 1,336, static caps 36\n`
  + `- Face halo: 3,150/3,150 unchanged; stable gravel closure 27/27\n`
  + `- Retail preservation: 23 shells, 9,936/9,936 cells\n`
  + `- N06 exception: 4/4 exact and untouched\n- Strict execution and rollback guards: 1,372/1,372 each\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n\nRead-only evidence; no live mutation.\n`);
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), `# R08T EE-SMOKE-S Passive Boundary Commissioning Seal\n\n`
  + `Status: **${seal.status}**\n\n- Complete passive boundary: 1,372 cells\n`
  + `- Static future-door caps: 36 cells; retained openings 0\n`
  + `- Powered mechanisms: 0; operational smoke/ventilation commissioning remains deferred\n`
  + `- Seal SHA-256: \`${commissioningSealSha256}\`\n`);
console.log(JSON.stringify({ status: report.status, qaPayloadSha256,
  commissioningStatus: seal.status, commissioningSealSha256, summary: report.summary }, null, 2));
