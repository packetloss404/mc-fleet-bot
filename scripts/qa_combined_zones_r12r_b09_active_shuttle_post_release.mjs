#!/usr/bin/env node
/** Independent immutable-post QA and bounded commissioning verifier for R12R. */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  AnvilReader,
  cellKey,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const TRANSACTION_ID = 'combined-zones-r12r-b09-bounded-active-shuttle';
const ENTITY_TYPE = 'minecraft:minecart';
const CONTROL_OFF = 'minecraft:lever[face=wall,facing=north,powered=false]';
const POWERED_RAIL_OFF =
  'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]';
const DIORITE = 'minecraft:polished_diorite';
const R12Q_PROOF =
  'data/world-review/combined-zones-r12q-b09-lower-two-turn-closure-runtime-proof-20260822T044200Z/runtime-proof.json';
const DEFAULT_MANIFEST =
  'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle.release-manifest.json';

const controls = [2061, 2070].map((x) => ({ x, y: 130, z: -747 }));
const stops = [2057, 2073].map((x) => ({ x, y: 130, z: -748 }));
const poweredRails = Array.from({ length: 15 }, (_, index) => ({
  x: 2058 + index,
  y: 130,
  z: -748,
}));
const targets = uniqueCells([...controls, ...stops, ...poweredRails]);
const targetState = new Map([
  ...controls.map((cell) => [cellKey(cell), CONTROL_OFF]),
  ...stops.map((cell) => [cellKey(cell), DIORITE]),
  ...poweredRails.map((cell) => [cellKey(cell), POWERED_RAIL_OFF]),
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const pointIn = (position, bounds) => (
  position.length === 3
  && position[0] >= bounds.minX && position[0] <= bounds.maxX
  && position[1] >= bounds.minY && position[1] <= bounds.maxY
  && position[2] >= bounds.minZ && position[2] <= bounds.maxZ
);

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortedValue(value[key])]),
  );
  return value;
}

function payloadHash(value, field, stable = false) {
  const payload = { ...value };
  delete payload[field];
  return sha256(JSON.stringify(stable ? sortedValue(payload) : payload));
}

export function pythonCanonicalPayloadHashPass(filename, field) {
  const script = [
    'import hashlib, json, sys',
    'with open(sys.argv[1], encoding="utf-8") as handle: value = json.load(handle)',
    'expected = value.pop(sys.argv[2], None)',
    'actual = hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()',
    'print("PASS" if expected == actual else "FAIL")',
  ].join('\n');
  return execFileSync('python3', ['-c', script, absolute(filename), field], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  }).trim() === 'PASS';
}

function deepStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => deepStrings(entry, output));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => deepStrings(entry, output));
  }
  return output;
}

export function exactCleanupCommand(command, tag, uuid) {
  if (!command.trim().startsWith('kill ')) return true;
  const uuidValue = uuid.join(',');
  return command.includes('@e[')
    && command.includes(`type=${ENTITY_TYPE}`)
    && command.includes(`tag=${tag}`)
    && command.includes(`UUID:[I;${uuidValue}]`)
    && ['x', 'y', 'z', 'dx', 'dy', 'dz'].every((token) => (
      new RegExp(`(?:\\[|,)${token}=`).test(command)
    ))
    && !/^kill\s+@e\s*$/u.test(command.trim());
}

export function normalizeUuid(value) {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const numbers = value.map(Number);
  return numbers.every(Number.isInteger) ? numbers : null;
}

function sameUuid(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === 4 && right.length === 4
    && left.every((value, index) => Number(value) === Number(right[index]));
}

export function parseOperations(text) {
  return text.split(/\r?\n/u).filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.trim().split(/\s+/u);
    if (fields.length !== 9) throw new Error(`invalid guarded operation: ${line}`);
    const fromCell = { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) };
    const toCell = { x: Number(fields[4]), y: Number(fields[5]), z: Number(fields[6]) };
    if (cellKey(fromCell) !== cellKey(toCell)) throw new Error('operation is not one-cell exact');
    return { cell: fromCell, from: fields[7], to: fields[8] };
  });
}

function addCheck(checks, id, pass, evidence) {
  checks.push({ id, status: pass ? 'PASS' : 'FAIL', evidence });
}

export function evaluateActiveShuttleQa(input) {
  const {
    manifest,
    ledger,
    entitySpec,
    entityReport,
    functionalReport,
    postTargetStates,
    postPriorRailStates,
    savedEntities,
    operations,
    bindingStatus,
  } = input;
  const checks = [];
  const expectedTag = entitySpec.tag;
  const expectedName = entitySpec.name;
  const fullAabb = entitySpec.aabb;
  const parkAabb = entitySpec.terminalParkAabb ?? entitySpec.spawnParkAabb;
  const capturedUuid = normalizeUuid(entityReport.capturedIdentity?.uuidIntArray);
  const functionalUuid = normalizeUuid(functionalReport.capturedIdentity?.uuidIntArray);
  const terminal = functionalReport.terminal ?? functionalReport;
  const functionalPayloadSha256 = functionalReport.reportPayloadSha256
    ?? functionalReport.functionalReportPayloadSha256;

  addCheck(checks, 'input-file-bindings', bindingStatus.every(Boolean), bindingStatus);
  addCheck(checks, 'release-and-ledger-identity',
    manifest.transactionId === TRANSACTION_ID
      && ledger.transactionId === TRANSACTION_ID
      && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
      && ledger.releaseNodeId === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING'
      && /^[a-f0-9]{64}$/u.test(ledger.completedReleaseIdentitySha256 ?? '')
      && ledger.manifest?.sha256 === input.bindings.manifest.sha256,
  { manifestTransactionId: manifest.transactionId, ledgerStatus: ledger.status,
    releaseNodeId: ledger.releaseNodeId,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 });
  addCheck(checks, 'exact-19-cell-manifest-geometry',
    manifest.scope?.exactBlockTargetCount === 19
      && manifest.scope?.geometry?.targetCells?.cellCount === 19
      && manifest.scope.geometry.controls?.cellCount === 2
      && manifest.scope.geometry.terminalStops?.cellCount === 2
      && manifest.scope.geometry.poweredTrack?.cellCount === 15
      && manifest.scope.geometry.targetCells.coordinateSetSha256 === hashCells(targets),
  { expectedTargetHash: hashCells(targets), observed: manifest.scope?.geometry?.targetCells });

  const forward = operations.forward;
  const rollback = operations.rollback;
  addCheck(checks, 'guarded-forward-and-exact-reverse-inverse',
    forward.length === 19 && rollback.length === 19
      && uniqueCells(forward.map(({ cell }) => cell)).length === 19
      && forward.every(({ cell, to }) => targetState.get(cellKey(cell)) === to)
      && rollback.every((operation, index) => {
        const source = forward[forward.length - 1 - index];
        return cellKey(operation.cell) === cellKey(source.cell)
          && operation.from === source.to && operation.to === source.from;
      }),
  { forwardCount: forward.length, rollbackCount: rollback.length });

  const targetMap = new Map(postTargetStates.map(({ cell, state }) => [cellKey(cell), state]));
  addCheck(checks, 'immutable-post-exact-19-target-states',
    targetMap.size === 19
      && targets.every((cell) => targetMap.get(cellKey(cell)) === targetState.get(cellKey(cell))),
  { stateCount: targetMap.size });
  addCheck(checks, 'controls-off',
    controls.every((cell) => targetMap.get(cellKey(cell)) === CONTROL_OFF)
      && terminal.controlsOff === true,
  { controlCount: 2, requiredState: CONTROL_OFF });
  addCheck(checks, 'fifteen-powered-rails-unpowered',
    poweredRails.every((cell) => targetMap.get(cellKey(cell)) === POWERED_RAIL_OFF)
      && (terminal.railsUnpoweredCount ?? functionalReport.poweredRailCount) === 15
      && (functionalReport.poweredRailsUnpowered ?? true) === true,
  { poweredRailCount: 15, requiredState: POWERED_RAIL_OFF });
  addCheck(checks, 'two-polished-diorite-terminal-stops',
    stops.every((cell) => targetMap.get(cellKey(cell)) === DIORITE),
  { terminalStopCount: 2, requiredState: DIORITE });
  addCheck(checks, 'r12q-prior-rail-preservation',
    postPriorRailStates.length === 535
      && postPriorRailStates.every(({ expectedState, state }) => expectedState === state),
  { acceptedPriorRailCount: 552, authorizedRailMigrationCount: 17,
    exactPreservedPriorRailCount: postPriorRailStates.length });

  addCheck(checks, 'entity-forward-report-authenticated',
    entityReport.transactionId === TRANSACTION_ID
      && entityReport.status === 'EXECUTED_POSTCONDITION_VERIFIED'
      && capturedUuid !== null
      && entityReport.capturedIdentity?.entityType === ENTITY_TYPE
      && entityReport.capturedIdentity?.tag === expectedTag
      && entityReport.capturedIdentity?.name === expectedName
      && entityReport.safetyBoundary?.broadMinecartKillUsed === false
      && entityReport.safetyBoundary?.tagOnlyKillUsed === false,
  { capturedUuid, type: entityReport.capturedIdentity?.entityType });
  addCheck(checks, 'functional-west-east-west-and-fail-closed-park',
    functionalReport.transactionId === TRANSACTION_ID
      && String(functionalReport.status).startsWith('PASS_')
      && (functionalReport.westToEastObserved === true
        || Array.isArray(functionalReport.westToEastPosition))
      && (functionalReport.eastToWestReturnObserved === true
        || Array.isArray(functionalReport.eastToWestReturnPosition))
      && terminal.stationary === true
      && Array.isArray(terminal.motion) && terminal.motion.length === 3
      && terminal.motion.every((value) => Math.abs(Number(value)) <= 0.02)
      && terminal.insideWestParkEnvelope !== false
      && pointIn(terminal.position ?? functionalReport.finalPosition ?? [], fullAabb)
      && pointIn(terminal.position ?? functionalReport.finalPosition ?? [], parkAabb)
      && sameUuid(capturedUuid, functionalUuid)
      && (functionalReport.entityType ?? functionalReport.capturedIdentity?.entityType)
        === ENTITY_TYPE
      && (functionalReport.tag ?? functionalReport.capturedIdentity?.tag) === expectedTag
      && terminal.globalTagCount === 1
      && terminal.boundedTagCount === 1
      && terminal.boundedMinecartCount === 1,
  { finalPosition: terminal.position ?? functionalReport.finalPosition, parkAabb });
  const authentication = functionalReport.entityAuthentication;
  addCheck(checks, 'functional-exact-uuid-selector-transcript',
    authentication?.count === 1
      && typeof authentication?.selector === 'string'
      && exactCleanupCommand(`kill ${authentication.selector}`, expectedTag, capturedUuid ?? [])
      && typeof authentication?.command === 'string'
      && authentication.command.includes(authentication.selector)
      && typeof authentication?.reply === 'string',
  { entityAuthentication: authentication ?? null });

  const tagEntities = savedEntities.filter((entity) => entity.tags.includes(expectedTag));
  const boundedMinecarts = savedEntities.filter((entity) => (
    entity.type === ENTITY_TYPE && pointIn(entity.position, fullAabb)
  ));
  const saved = tagEntities[0];
  addCheck(checks, 'immutable-post-exact-tagged-minecart',
    tagEntities.length === 1 && boundedMinecarts.length === 1
      && saved.type === ENTITY_TYPE && sameUuid(saved.uuidIntArray, capturedUuid)
      && pointIn(saved.position, parkAabb)
      && saved.tags.includes(expectedTag)
      && JSON.stringify(saved.customName ?? '').includes(expectedName)
      && saved.passengerCount === 0
      && saved.motion.length === 3
      && saved.motion.every((value) => Math.abs(value) <= 0.02),
  { globalTaggedEntityCount: tagEntities.length,
    boundedMinecartCount: boundedMinecarts.length, savedPosition: saved?.position,
    passengerCount: saved?.passengerCount, motion: saved?.motion });

  const cleanupStrings = deepStrings({ entityReport, functionalReport, rollback: ledger.rollbackReadiness })
    .filter((value) => value.trim().startsWith('kill '));
  addCheck(checks, 'no-broad-or-tag-only-entity-cleanup',
    capturedUuid !== null
      && cleanupStrings.every((command) => exactCleanupCommand(command, expectedTag, capturedUuid))
      && ledger.rollbackReadiness?.broadEntityCleanupAllowed === false
      && ledger.rollbackReadiness?.tagOnlyCleanupAllowed === false,
  { cleanupCommandCount: cleanupStrings.length, cleanupStrings });
  addCheck(checks, 'entity-first-exact-rollback-readiness',
    ledger.entityTransaction?.forwardReportPayloadSha256 === entityReport.reportPayloadSha256
      && ledger.entityTransaction?.exactCapturedUuidRollbackReady === true
      && ledger.entityTransaction?.compensateBeforeBlockRollback === true
      && ledger.rollbackReadiness?.status === 'PASS_EXACT_ENTITY_FIRST_THEN_BLOCK_INVERSE'
      && String(ledger.rollbackReadiness?.exactEntitySelectorCommand).trim().startsWith('kill ')
      && exactCleanupCommand(ledger.rollbackReadiness.exactEntitySelectorCommand,
        expectedTag, capturedUuid ?? []),
  { rollbackReadiness: ledger.rollbackReadiness });
  addCheck(checks, 'block-forward-and-rollback-readiness',
    ledger.blockTransaction?.exactTargetCount === 19
      && ledger.blockTransaction?.rollbackPoststatePassCount === 19
      && JSON.stringify(ledger.rollbackReadiness?.blockRollbackOrder) === JSON.stringify([
        'b09-active-shuttle-fail-closed-track',
        'b09-active-shuttle-fail-closed-controls',
      ]),
  { blockTransaction: ledger.blockTransaction });
  addCheck(checks, 'functional-report-ledger-binding',
    ledger.functionalAcceptance?.reportPayloadSha256
      === functionalPayloadSha256
      && functionalReport.entityForwardReportPayloadSha256
        === entityReport.reportPayloadSha256
      && ledger.evidenceBindings?.some((binding) => (
        binding.path === input.bindings.functionalReport.path
          && binding.sha256 === input.bindings.functionalReport.sha256
      ))
      && ledger.evidenceBindings?.some((binding) => (
        binding.path === input.bindings.entityReport.path
          && binding.sha256 === input.bindings.entityReport.sha256
      )),
  { ledgerPayload: ledger.functionalAcceptance?.reportPayloadSha256,
    reportPayload: functionalPayloadSha256 });

  const failures = checks.filter(({ status }) => status === 'FAIL');
  const passed = failures.length === 0;
  return {
    status: passed
      ? 'PASS_R12R_EXACT_POSTSTATE_AND_BOUNDED_MAINTENANCE_SHUTTLE_COMMISSIONED'
      : 'REJECTED_R12R_POSTSTATE_OR_BOUNDED_COMMISSIONING_EVIDENCE',
    summary: {
      passed,
      checkCount: checks.length,
      passCount: checks.length - failures.length,
      failCount: failures.length,
    },
    checks,
    exactPostState: {
      blockTargetCount: 19,
      controlOffCount: 2,
      poweredRailUnpoweredCount: 15,
      polishedDioriteStopCount: 2,
      acceptedPriorR12QRailCount: 552,
      authorizedPriorRailMigrationCount: 17,
      preservedPriorR12QRailCount: 535,
    },
    commissioning: {
      boundedMaintenanceShuttleCommissioned: passed,
      authenticatedMinecartUuid: passed ? capturedUuid : null,
      authenticatedMinecartTag: expectedTag,
      parkedEndpoint: passed ? 'WEST' : null,
      fullB09FunicularCommissioned: false,
      passengerOrPublicTransportCommissioned: false,
      rescueTransportCommissioned: false,
    },
    disposition: {
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
      broadEntityCleanupAccepted: false,
      tagOnlyEntityCleanupAccepted: false,
    },
  };
}

function entityRecord(raw) {
  return {
    type: String(raw.id ?? ''),
    position: Array.isArray(raw.Pos) ? raw.Pos.map(Number) : [],
    uuidIntArray: normalizeUuid(raw.UUID),
    tags: Array.isArray(raw.Tags) ? raw.Tags.map(String) : [],
    customName: raw.CustomName ?? null,
    motion: Array.isArray(raw.Motion) ? raw.Motion.map(Number) : [],
    passengerCount: Array.isArray(raw.Passengers) ? raw.Passengers.length : 0,
  };
}

async function savedEntityRecords(snapshotRoot) {
  const directory = absolute(path.join(snapshotRoot, 'entities'));
  const reader = new AnvilReader(directory);
  const output = [];
  if (!fs.existsSync(directory)) return output;
  for (const name of fs.readdirSync(directory).filter((entry) => /^r\.-?\d+\.-?\d+\.mca$/u.test(entry))) {
    const match = /^r\.(-?\d+)\.(-?\d+)\.mca$/u.exec(name);
    const rx = Number(match[1]);
    const rz = Number(match[2]);
    const region = fs.readFileSync(path.join(directory, name));
    for (let index = 0; index < 1024; index += 1) {
      if (region.readUIntBE(index * 4, 3) === 0) continue;
      const cx = rx * 32 + (index % 32);
      const cz = rz * 32 + Math.floor(index / 32);
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) output.push(entityRecord(entity));
    }
  }
  return output;
}

async function blockRecords(snapshotRoot, cells) {
  const reader = new AnvilReader(absolute(path.join(snapshotRoot, 'region')));
  const output = [];
  for (const cell of cells) output.push({
    cell,
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
  });
  return output;
}

function requiredPath(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : fallback;
}

function writeReport(filename, value) {
  if (!filename) return;
  const destination = absolute(filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

export async function main(argv = process.argv.slice(2)) {
  const generatedAt = requiredPath(argv, '--generated-at', '2026-08-22T05:45:00Z');
  const paths = {
    manifest: requiredPath(argv, '--manifest', DEFAULT_MANIFEST),
    ledger: requiredPath(argv, '--ledger'),
    postSnapshot: requiredPath(argv, '--post-snapshot'),
    entityReport: requiredPath(argv, '--entity-report'),
    functionalReport: requiredPath(argv, '--functional-report'),
  };
  const output = requiredPath(argv, '--out');
  const absent = Object.entries(paths).filter(([key, filename]) => (
    key !== 'postSnapshot' && (!filename || !fs.existsSync(absolute(filename)))
  )).map(([key]) => key);
  if (absent.length > 0) {
    const wait = {
      schemaVersion: 1,
      transactionId: TRANSACTION_ID,
      generatedAtUtc: generatedAt,
      status: 'WAIT_R12R_POST_RELEASE_INPUTS_ABSENT',
      missingInputs: absent,
      suppliedPaths: paths,
      commissioning: {
        boundedMaintenanceShuttleCommissioned: false,
        fullB09FunicularCommissioned: false,
      },
      disposition: { liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    };
    wait.qaPayloadSha256 = payloadHash(wait, 'qaPayloadSha256');
    writeReport(output, wait);
    process.stdout.write(`${JSON.stringify(wait, null, 2)}\n`);
    return wait;
  }

  const manifest = readJson(paths.manifest);
  const ledger = readJson(paths.ledger);
  const entityReport = readJson(paths.entityReport);
  const functionalReport = readJson(paths.functionalReport);
  paths.postSnapshot ??= ledger.postSnapshot?.root;
  if (!paths.postSnapshot || !fs.existsSync(absolute(path.join(paths.postSnapshot, 'region')))) {
    const wait = {
      schemaVersion: 1, transactionId: TRANSACTION_ID, generatedAtUtc: generatedAt,
      status: 'WAIT_R12R_IMMUTABLE_POST_SNAPSHOT_ABSENT',
      missingInputs: ['postSnapshot'], suppliedPaths: paths,
      commissioning: { boundedMaintenanceShuttleCommissioned: false,
        fullB09FunicularCommissioned: false },
      disposition: { liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    };
    wait.qaPayloadSha256 = payloadHash(wait, 'qaPayloadSha256');
    writeReport(output, wait);
    process.stdout.write(`${JSON.stringify(wait, null, 2)}\n`);
    return wait;
  }

  const entitySpecPath = manifest.entityTransaction?.spec?.path;
  if (!entitySpecPath || !fs.existsSync(absolute(entitySpecPath))) {
    throw new Error('R12R entity transaction spec is absent');
  }
  const entitySpec = readJson(entitySpecPath);
  const postIntakePath = ledger.postSnapshot?.completeSaveIntake?.path;
  const postIdentityPath = ledger.postSnapshot?.identity?.path;
  if (!postIntakePath || !postIdentityPath
    || !fs.existsSync(absolute(postIntakePath))
    || !fs.existsSync(absolute(postIdentityPath))) {
    throw new Error('R12R immutable post intake or snapshot identity is absent');
  }
  const postIntake = readJson(postIntakePath);
  const postIdentity = readJson(postIdentityPath);
  const forward = [];
  const rollbackPackages = [];
  const packageBindings = [];
  for (const pkg of manifest.packages ?? []) {
    packageBindings.push(fileBinding(pkg.forward), fileBinding(pkg.rollback));
    forward.push(...parseOperations(fs.readFileSync(absolute(pkg.forward), 'utf8')));
    rollbackPackages.unshift(parseOperations(fs.readFileSync(absolute(pkg.rollback), 'utf8')));
  }
  const rollback = rollbackPackages.flat();
  const proof = readJson(R12Q_PROOF);
  const priorRails = proof.geometry.exactConnectedStatesLowToHigh.map((entry) => ({
    cell: { x: 2048 + entry.x, y: 66 + entry.y, z: entry.z - 748 },
    expectedState: entry.state,
  }));
  const targetKeys = new Set(targets.map(cellKey));
  const preservedPrior = priorRails.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
  const [postTargetStates, priorObserved, savedEntities] = await Promise.all([
    blockRecords(paths.postSnapshot, targets),
    blockRecords(paths.postSnapshot, preservedPrior.map(({ cell }) => cell)),
    savedEntityRecords(paths.postSnapshot),
  ]);
  const postPriorRailStates = preservedPrior.map((entry, index) => ({
    ...entry,
    state: priorObserved[index].state,
  }));
  const bindings = {
    manifest: fileBinding(paths.manifest),
    ledger: fileBinding(paths.ledger),
    entityReport: fileBinding(paths.entityReport),
    functionalReport: fileBinding(paths.functionalReport),
    entitySpec: fileBinding(entitySpecPath),
    postCompleteSaveIntake: fileBinding(postIntakePath),
    postSnapshotIdentity: fileBinding(postIdentityPath),
    r12qProof: fileBinding(R12Q_PROOF),
    packages: packageBindings,
  };
  const bindingStatus = [
    ledger.manifest?.sha256 === bindings.manifest.sha256,
    ledger.entityTransaction?.forwardReport?.sha256 === bindings.entityReport.sha256,
    ledger.functionalAcceptance?.report?.sha256 === bindings.functionalReport.sha256,
    manifest.entityTransaction?.spec?.sha256 === bindings.entitySpec.sha256,
    manifest.manifestIdentity === payloadHash(manifest, 'manifestIdentity'),
    ledger.postSnapshot.root === paths.postSnapshot,
    ledger.postSnapshot.completeSaveIntake.sha256 === bindings.postCompleteSaveIntake.sha256,
    ledger.postSnapshot.identity.sha256 === bindings.postSnapshotIdentity.sha256,
    postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    postIntake.packageIdentity?.completeSaveSha256
      === ledger.postSnapshot.completeSaveSha256,
    /^[a-f0-9]{64}$/u.test(postIdentity.sha256 ?? ''),
    pythonCanonicalPayloadHashPass(paths.entityReport, 'reportPayloadSha256'),
    pythonCanonicalPayloadHashPass(paths.functionalReport, 'reportPayloadSha256'),
  ];
  const result = evaluateActiveShuttleQa({
    manifest, ledger, entitySpec, entityReport, functionalReport,
    postTargetStates, postPriorRailStates, savedEntities,
    operations: { forward, rollback }, bindings, bindingStatus,
  });
  const report = {
    schemaVersion: 1,
    transactionId: TRANSACTION_ID,
    releaseNodeId: ledger.releaseNodeId,
    generatedAtUtc: generatedAt,
    ...result,
    ledger: bindings.ledger,
    postSnapshot: {
      root: relative(paths.postSnapshot),
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSha256: postIdentity.sha256,
    },
    terminalPost: {
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSha256: postIdentity.sha256,
    },
    terminalCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
    releaseIdentity: {
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    },
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    activeShuttleCommissioned: result.summary.passed,
    evidence: { ...bindings, postSnapshotRoot: relative(paths.postSnapshot) },
  };
  report.qaPayloadSha256 = payloadHash(report, 'qaPayloadSha256');
  writeReport(output, report);
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary,
    qaPayloadSha256: report.qaPayloadSha256, output }, null, 2)}\n`);
  return report;
}

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const result = await main();
    if (result.status.startsWith('REJECTED_')) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: 'REJECTED_R12R_QA_RUNTIME_ERROR',
      error: error.message }, null, 2)}\n`);
    process.exitCode = 2;
  }
}
