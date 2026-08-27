#!/usr/bin/env node
/**
 * Read-only post-release QA/seal for CZ-R11C C1 east highway completion.
 * No live call, RCON command, service mutation, or world edit is performed.
 */

import fs from 'fs';
import path from 'path';

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
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T19:00:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11c-live-20260821T185813Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r11c-post-20260821T185813Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r11c-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r11c-post-release-qa.md'));

const BASENAME = 'combined-zones-r11c-c1-east-highway-completion';
const PACKAGE_KEY = 'c1-east-at-grade-completion';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const R11B_MANIFEST = 'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json';
const EXPECTED = Object.freeze({
  manifestIdentity: '0cc83635202a9aac17ed347e88f6a7882598b35321a3546b4494fafd0a2affc3',
  manifestSha256: '32f75bc8c089947934c6fe4f77e4f18e418de6f86ebca2ca87ffa0c044175b73',
  ledgerSha256: 'ce3bb0d112061e9e111a75bb605ca955c60a944a0e32a794c89b6b5388ee55d5',
  sourceSave: '4f110e953af0d21052c535c3526e5456ab5d5d3b79a6df6579935248f3d025d3',
  postSave: 'a4e7f8a9066ef0818436b4d3c92e594daa91fb4136cd8d7603988bed565ce219',
  sourceRegion: '1a4064c444da36336612431e1f17e6339d337f259df5a9c466223496708e5b4c',
  postRegion: 'f0a0548def916101e31eaa33e9138132a7c5d469e549e3216a6b3bd09ab8941d',
  executionBinding: '71dc29663a981180396ff19d14574217a57318f330e826b276f5b31a82cbd650',
  completedRelease: 'f2c37e1c70a8829981352a0d64d1e69edb556a19359d1afd56061e9fe2169bb9',
  stageCount: 17,
  evidenceBindingCount: 17,
  operationCount: 1_109,
  operatedHash: '2e671a5ae94babdc29c518bacdc167f9e71a23db32b539f98b023903c7bd2a74',
  r11cSurfaceCount: 399,
  r11cSurfaceHash: 'd290098f6186f7ed133b1448e4738c37a0e62f42fb7e74755583b6271db87239',
  foundationCount: 68,
  foundationHash: '20de2c236a1dff8d341a57f6ca88bb501a2764e0e4f498049f533175539b2c8e',
  headroomCutCount: 642,
  fullHeadroomCount: 798,
  r11aSurfaceCount: 109,
  r11bSurfaceCount: 164,
  combinedRouteCount: 672,
  r11aHeadroomCount: 218,
  r11bHeadroomCount: 328,
  r11aSupportPreservedCount: 23,
  r11aSupportPreservedHash: 'faab25d6ed2ee368d2296ed49e651979e19b7f6f3632d0f449997e6fecf5d921',
  gradeShadowCount: 13,
  gradeShadowHash: 'cec12d7786e2d8a0e165f463910fc11f9ce07fabbaf5d745ac1cc34b9c155766',
  utilityConflictCount: 3,
  utilityConflictHash: '454d9ed2fbaf386c10b244a593027fc3b34b8a8fa7a7be3c262df00adfdaa058',
  ownedLogRemovalCount: 27,
  influencedLeafCount: 235,
  influencedLeafHash: 'edf69cab488de9066ee819b228caa5e9c182b056626bed67b89610d67793e165',
  r11abSeamPairCount: 94,
  r11acSeamPairCount: 93,
});

const PAVEMENT_STATES = new Set([
  'minecraft:gray_concrete',
  'minecraft:smooth_stone',
  'minecraft:yellow_concrete',
]);
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
]);
const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11C post-release QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const stateProperty = (state, property) => {
  const match = state.match(new RegExp(`(?:\\[|,)${property}=([^,\\]]+)`));
  return match?.[1] ?? null;
};
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava'].includes(blockName(state))
  || state.includes('waterlogged=true');
const isStable = (state) => !isAir(state) && !isFluid(state)
  && !GRAVITY.has(blockName(state));
const isLeaf = (state) => /_leaves$/.test(blockName(state));
const isLeafSupportLog = (state) => /_(?:log|wood)$/.test(blockName(state));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`;

function parsePointOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const values = fields.slice(1, 7).map(Number);
    invariant(values.every(Number.isSafeInteger)
      && values[0] === values[3] && values[1] === values[4] && values[2] === values[5],
    `${filename} contains a non-point operation`);
    operations.push({
      cell: { x: values[0], y: values[1], z: values[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function tangentAt(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  return { x: dx / length, z: dz / length };
}

function offsetPoint(reference, tangent, offset) {
  return {
    x: reference.x + Math.round(offset * -tangent.z),
    z: reference.z + Math.round(offset * tangent.x),
  };
}

function deriveSurface(c1, startStation, endStation) {
  const stations = c1.horizontalAlignment.stations;
  const columns = new Map();
  for (let station = startStation; station <= endStation; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = -14; offset <= 14; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      const key = `${point.x},${point.z}`;
      if (!columns.has(key)) columns.set(key, {
        ...point,
        y: reference.highwayReferenceY + (offset <= -5 ? 1 : offset <= 5 ? 0 : -1),
        station,
        offset,
      });
    }
  }
  return [...columns.values()];
}

function selectedOffsetColumns(c1, start, end, offsetFrom, offsetTo) {
  const result = new Map();
  const stations = c1.horizontalAlignment.stations;
  for (let station = start; station <= end; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = offsetFrom; offset <= offsetTo; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      result.set(`${point.x},${point.z}`, point);
    }
  }
  return [...result.values()];
}

function surfaceTarget(offset) {
  if (offset <= -12 || offset >= 12) return 'minecraft:smooth_stone';
  if (offset >= -1 && offset <= 1) return 'minecraft:yellow_concrete';
  return 'minecraft:gray_concrete';
}

function components(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const remaining = new Set(byKey.keys());
  const output = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const current = byKey.get(queue.pop());
      component.push(current);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if (!dx && !dy && !dz) continue;
            const key = cellKey({ x: current.x + dx, y: current.y + dy, z: current.z + dz });
            if (remaining.delete(key)) queue.push(key);
          }
        }
      }
    }
    output.push(component);
  }
  return output;
}

function connectivity(cells) {
  const exact = uniqueCells(cells);
  const groups = components(exact);
  return {
    componentCount: groups.length,
    largestComponentCellCount: Math.max(0, ...groups.map((group) => group.length)),
    cellCount: exact.length,
  };
}

function seam(left, right) {
  const pairs = [];
  for (const a of left) {
    for (const b of right) {
      if (Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)) === 1
        && Math.abs(a.y - b.y) <= 1) pairs.push({ left: a, right: b });
    }
  }
  const cells = uniqueCells(pairs.flatMap(({ left: a, right: b }) => [a, b]));
  return {
    adjacentPairCount: pairs.length,
    cells: exactSet(cells),
    connectivity: connectivity(cells),
    maximumAdjacentStep: Math.max(0, ...pairs.map(({ left: a, right: b }) => Math.abs(a.y - b.y))),
  };
}

function stateCensus(records) {
  const result = new Map();
  for (const record of records) result.set(record.state, (result.get(record.state) ?? 0) + 1);
  return Object.fromEntries([...result.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const c1 = readJson(C1_DESIGN);
const r11bManifest = readJson(R11B_MANIFEST);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME
  && ledger.releaseNodeId === RELEASE_NODE_ID,
'execution ledger is not terminally accepted R11C evidence');
invariant(manifest.transactionId === BASENAME && manifest.releaseNodeId === RELEASE_NODE_ID,
'manifest scope does not match R11C');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes
  && manifestBinding.sha256 === EXPECTED.manifestSha256,
'ledger manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'manifest identity drifted');
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'ledger execution/completed identity drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256,
'source/post complete-save binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary.passed === true
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postSave
  && samePath(postIntake.input.suppliedWorldRoot, POST_ROOT),
'post intake is not the ledger-bound complete save');

const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceSave
  && sourceIdentity.sha256 === EXPECTED.sourceRegion
  && postIdentity.sha256 === EXPECTED.postRegion
  && samePath(sourceIdentity.directory, path.join(ledger.sourceSnapshot.root, 'region'))
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'source/post region identity drifted');

const expectedStageOrder = [
  'standing-authorization',
  'exact-release-manifest-qa',
  'fresh-source-complete-save',
  'source-complete-save-intake',
  'source-snapshot-identity',
  `forward-source-preflight:${PACKAGE_KEY}`,
  `strict-forward-parser-check:${PACKAGE_KEY}`,
  `strict-rollback-parser-check:${PACKAGE_KEY}`,
  `projected-rollback-preflight:${PACKAGE_KEY}`,
  'block-entity-clearance',
  'live-entity-clearance',
  `same-moment-package-entity-clearance:${PACKAGE_KEY}`,
  `strict-forward-execution:${PACKAGE_KEY}`,
  'fresh-post-complete-save',
  'post-complete-save-intake',
  'post-snapshot-identity',
  `rollback-poststate-preflight:${PACKAGE_KEY}`,
];
const allStagesPass = ledger.stages.length === EXPECTED.stageCount
  && ledger.stages.every(({ stage, status }, index) => (
    stage === expectedStageOrder[index] && status === 'PASS'
  ));
const evidenceBindingMismatches = [];
for (const declared of ledger.evidenceBindings) {
  const observed = fileBinding(declared.path);
  if (declared.sha256 !== observed.sha256 || declared.bytes !== observed.bytes) {
    evidenceBindingMismatches.push({ declared, observed });
  }
}
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceBindingCount
  && evidenceBindingMismatches.length === 0,
'ledger evidence bindings drifted');

invariant(manifest.packages.length === 1 && manifest.packages[0].key === PACKAGE_KEY
  && JSON.stringify(manifest.executionOrder.forward) === JSON.stringify([PACKAGE_KEY])
  && JSON.stringify(manifest.executionOrder.rollback) === JSON.stringify([PACKAGE_KEY]),
'manifest is not the executed single-package release');
const pkg = manifest.packages[0];
const ledgerPackage = ledger.packages[0];
const operationManifest = manifest.operations[PACKAGE_KEY];
const forwardBinding = fileBinding(pkg.forward);
const rollbackBinding = fileBinding(pkg.rollback);
invariant(samePath(pkg.forward, ledgerPackage.forward.path)
  && samePath(pkg.rollback, ledgerPackage.rollback.path)
  && forwardBinding.sha256 === ledgerPackage.forward.sha256
  && rollbackBinding.sha256 === ledgerPackage.rollback.sha256
  && sha256(operationBody(pkg.forward)) === operationManifest.forwardSha256
  && sha256(operationBody(pkg.rollback)) === operationManifest.rollbackSha256,
'operation byte/body binding drifted');
const forward = parsePointOperations(pkg.forward);
const rollback = parsePointOperations(pkg.rollback);
invariant(forward.length === EXPECTED.operationCount
  && rollback.length === EXPECTED.operationCount
  && rollback.every((operation, index) => {
    const inverse = forward[forward.length - 1 - index];
    return cellKey(operation.cell) === cellKey(inverse.cell)
      && operation.fromState === inverse.toState
      && operation.toState === inverse.fromState;
  }),
'rollback is not the exact record-reversed inverse');
const operatedCells = forward.map(({ cell }) => cell);
const operatedKeys = new Set(operatedCells.map(cellKey));
invariant(operatedKeys.size === EXPECTED.operationCount
  && hashCells(operatedCells) === EXPECTED.operatedHash,
'operated target identity drifted');

const pavementOps = forward.filter(({ toState }) => PAVEMENT_STATES.has(toState));
const foundationOps = forward.filter(({ toState }) => toState === 'minecraft:stone_bricks');
const headroomOps = forward.filter(({ toState }) => toState === 'minecraft:air');
invariant(pavementOps.length === EXPECTED.r11cSurfaceCount
  && hashCells(pavementOps.map(({ cell }) => cell)) === EXPECTED.r11cSurfaceHash
  && foundationOps.length === EXPECTED.foundationCount
  && hashCells(foundationOps.map(({ cell }) => cell)) === EXPECTED.foundationHash
  && headroomOps.length === EXPECTED.headroomCutCount,
'operation material/geometry partition drifted');

const r11aSurface = deriveSurface(c1, 489, 493);
const r11aHeadroom = uniqueCells(r11aSurface.flatMap(({ x, y, z }) => [
  { x, y: y + 1, z }, { x, y: y + 2, z },
]));
const r11aSupports = r11aSurface.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const r11aFunctionalKeys = new Set([
  ...r11aSurface.map(cellKey), ...r11aHeadroom.map(cellKey), ...r11aSupports.map(cellKey),
]);
const r11bCandidate = deriveSurface(c1, 481, 488);
const r11bSurface = r11bCandidate.filter((cell) => !r11aFunctionalKeys.has(cellKey(cell)));
const r11bHeadroom = uniqueCells(r11bSurface.flatMap(({ x, y, z }) => [
  { x, y: y + 1, z }, { x, y: y + 2, z },
]));
const r11cCandidate = deriveSurface(c1, 494, 517);
const r11aSupportKeys = new Set(r11aSupports.map(cellKey));
const preservedR11ASupport = r11cCandidate.filter((cell) => r11aSupportKeys.has(cellKey(cell)));
const afterR11AFunctional = r11cCandidate.filter((cell) => !r11aFunctionalKeys.has(cellKey(cell)));
const prospectiveEnvelope = (cell) => [
  cell,
  { x: cell.x, y: cell.y - 1, z: cell.z },
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
];
const r11aEnvelopeConflict = afterR11AFunctional.filter((cell) => (
  prospectiveEnvelope(cell).some((point) => r11aFunctionalKeys.has(cellKey(point)))
));
const r11aEnvelopeConflictKeys = new Set(r11aEnvelopeConflict.map(cellKey));
const afterR11AEnvelope = afterR11AFunctional.filter(
  (cell) => !r11aEnvelopeConflictKeys.has(cellKey(cell)),
);
const r11bTargets = uniqueCells(r11bManifest.packages.flatMap(({ forward: filename }) => (
  parsePointOperations(filename).map(({ cell }) => cell)
)));
const r11bTargetKeys = new Set(r11bTargets.map(cellKey));
const r11bEnvelopeConflict = afterR11AEnvelope.filter((cell) => (
  prospectiveEnvelope(cell).some((point) => r11bTargetKeys.has(cellKey(point)))
));
const r11bEnvelopeConflictKeys = new Set(r11bEnvelopeConflict.map(cellKey));
const afterR11BEnvelope = afterR11AEnvelope.filter(
  (cell) => !r11bEnvelopeConflictKeys.has(cellKey(cell)),
);
const utilityPlanKeys = new Set(selectedOffsetColumns(c1, 494, 517, 15, 17)
  .map(({ x, z }) => `${x},${z}`));
const utilityConflicts = afterR11BEnvelope.filter(
  ({ x, z }) => utilityPlanKeys.has(`${x},${z}`),
);
const utilityConflictKeys = new Set(utilityConflicts.map(cellKey));
const afterUtility = afterR11BEnvelope.filter(
  (cell) => !utilityConflictKeys.has(cellKey(cell)),
);
const adjacentToR11A = (cell) => r11aSurface.some((accepted) => (
  Math.max(Math.abs(cell.x - accepted.x), Math.abs(cell.z - accepted.z)) === 1
    && Math.abs(cell.y - accepted.y) <= 1
));
const candidateComponents = components(afterUtility);
const derivedR11CSurface = candidateComponents.filter(
  (component) => component.some(adjacentToR11A),
).flat();
const gradeShadows = candidateComponents.filter(
  (component) => !component.some(adjacentToR11A),
).flat();
const preservedExceptions = uniqueCells([
  ...preservedR11ASupport,
  ...r11aEnvelopeConflict,
  ...r11bEnvelopeConflict,
  ...utilityConflicts,
  ...gradeShadows,
]);
invariant(r11aSurface.length === EXPECTED.r11aSurfaceCount
  && r11bSurface.length === EXPECTED.r11bSurfaceCount
  && preservedR11ASupport.length === EXPECTED.r11aSupportPreservedCount
  && hashCells(preservedR11ASupport) === EXPECTED.r11aSupportPreservedHash
  && gradeShadows.length === EXPECTED.gradeShadowCount
  && hashCells(gradeShadows) === EXPECTED.gradeShadowHash
  && utilityConflicts.length === EXPECTED.utilityConflictCount
  && hashCells(utilityConflicts) === EXPECTED.utilityConflictHash
  && derivedR11CSurface.length === EXPECTED.r11cSurfaceCount
  && hashCells(derivedR11CSurface) === EXPECTED.r11cSurfaceHash
  && hashCells(pavementOps.map(({ cell }) => cell)) === hashCells(derivedR11CSurface),
'independently derived R11A/B/C geometry or exceptions drifted');

const combinedRoute = uniqueCells([
  ...r11aSurface, ...r11bSurface, ...derivedR11CSurface,
]);
const combinedRouteConnectivity = connectivity(combinedRoute);
const seamAB = seam(r11aSurface, r11bSurface);
const seamAC = seam(r11aSurface, derivedR11CSurface);
const seamBC = seam(r11bSurface, derivedR11CSurface);
invariant(combinedRoute.length === EXPECTED.combinedRouteCount
  && combinedRouteConnectivity.componentCount === 1
  && combinedRouteConnectivity.largestComponentCellCount === combinedRoute.length
  && seamAB.adjacentPairCount === EXPECTED.r11abSeamPairCount
  && seamAB.maximumAdjacentStep <= 1
  && seamAC.adjacentPairCount === EXPECTED.r11acSeamPairCount
  && seamAC.maximumAdjacentStep <= 1
  && seamBC.adjacentPairCount > 0
  && seamBC.maximumAdjacentStep <= 1,
'combined R11A/B/C route or seams are not connected and step-safe');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceCache = new Map();
const postCache = new Map();
const stateAt = async (reader, cache, cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) {
    cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return cache.get(key);
};
const readRecords = async (reader, cache, cells, expectedFor = () => null) => {
  const records = [];
  for (const cell of cells) records.push({
    cell,
    state: await stateAt(reader, cache, cell),
    expectedState: expectedFor(cell),
  });
  return records;
};
const sourceOperated = await readRecords(
  sourceReader, sourceCache, operatedCells,
  (cell) => forward.find((operation) => cellKey(operation.cell) === cellKey(cell)).fromState,
);
const targetByKey = new Map(forward.map((operation) => [cellKey(operation.cell), operation.toState]));
const postOperated = await readRecords(
  postReader, postCache, operatedCells,
  (cell) => targetByKey.get(cellKey(cell)),
);
const mismatchCount = (records) => records.filter(
  ({ state, expectedState }) => expectedState !== null && state !== expectedState,
).length;
const sourceMismatchCount = mismatchCount(sourceOperated);
const targetMismatchCount = mismatchCount(postOperated);
invariant(sourceMismatchCount === 0 && targetMismatchCount === 0,
'source guards or post targets mismatch');

const r11cHeadroom = uniqueCells(derivedR11CSurface.flatMap(({ x, y, z }) => [
  { x, y: y + 1, z }, { x, y: y + 2, z },
]));
const r11cHeadroomRecords = await readRecords(postReader, postCache, r11cHeadroom, () => 'minecraft:air');
const r11aHeadroomRecords = await readRecords(postReader, postCache, r11aHeadroom, () => 'minecraft:air');
const r11bHeadroomRecords = await readRecords(postReader, postCache, r11bHeadroom, () => 'minecraft:air');
const r11cSupports = derivedR11CSurface.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const r11cSupportRecords = await readRecords(postReader, postCache, r11cSupports);
const unstableSupportRecords = r11cSupportRecords.filter(({ state }) => !isStable(state));
invariant(r11cHeadroom.length === EXPECTED.fullHeadroomCount
  && mismatchCount(r11cHeadroomRecords) === 0
  && r11aHeadroom.length === EXPECTED.r11aHeadroomCount
  && mismatchCount(r11aHeadroomRecords) === 0
  && r11bHeadroom.length === EXPECTED.r11bHeadroomCount
  && mismatchCount(r11bHeadroomRecords) === 0
  && unstableSupportRecords.length === 0,
'route headroom or stable support verification failed');

const ownedLogRemovals = forward.filter(({ fromState, toState }) => (
  isLeafSupportLog(fromState) && !isLeafSupportLog(toState)
));
const influenceDepth = new Map(ownedLogRemovals.map(({ cell }) => [cellKey(cell), 0]));
const influenceQueue = ownedLogRemovals.map(({ cell }) => ({ cell, depth: 0 }));
const influencedLeaves = new Map();
while (influenceQueue.length) {
  const { cell, depth } = influenceQueue.shift();
  if (depth >= 6) continue;
  for (const [dx, dy, dz] of DIRECTIONS) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    const key = cellKey(neighbour);
    const nextDepth = depth + 1;
    if ((influenceDepth.get(key) ?? Infinity) <= nextDepth) continue;
    const sourceState = await stateAt(sourceReader, sourceCache, neighbour);
    if (!isLeaf(sourceState)) continue;
    influenceDepth.set(key, nextDepth);
    influenceQueue.push({ cell: neighbour, depth: nextDepth });
    if (!operatedKeys.has(key)) influencedLeaves.set(key, { cell: neighbour, sourceState });
  }
}
const postRetainedLogDistance = async (start) => {
  const visited = new Set([cellKey(start)]);
  const queue = [{ cell: start, distance: 0 }];
  while (queue.length) {
    const { cell, distance } = queue.shift();
    if (distance >= 6) continue;
    for (const [dx, dy, dz] of DIRECTIONS) {
      const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const key = cellKey(neighbour);
      if (visited.has(key)) continue;
      const state = await stateAt(postReader, postCache, neighbour);
      if (isLeafSupportLog(state)) return distance + 1;
      if (!isLeaf(state)) continue;
      visited.add(key);
      queue.push({ cell: neighbour, distance: distance + 1 });
    }
  }
  return 7;
};
const retainedLeafRecords = [];
const retainedLogDistanceCensus = {};
for (const { cell, sourceState } of influencedLeaves.values()) {
  const postState = await stateAt(postReader, postCache, cell);
  const retainedDistance = await postRetainedLogDistance(cell);
  retainedLogDistanceCensus[retainedDistance]
    = (retainedLogDistanceCensus[retainedDistance] ?? 0) + 1;
  retainedLeafRecords.push({ cell, sourceState, postState, retainedDistance });
}
const retainedLeafViolations = retainedLeafRecords.filter(({ sourceState, postState, retainedDistance }) => (
  !isLeaf(postState)
  || sourceState !== postState
  || stateProperty(postState, 'persistent') !== 'false'
  || retainedDistance >= 7
));
invariant(ownedLogRemovals.length === EXPECTED.ownedLogRemovalCount
  && influencedLeaves.size === EXPECTED.influencedLeafCount
  && hashCells([...influencedLeaves.values()].map(({ cell }) => cell)) === EXPECTED.influencedLeafHash
  && retainedLeafViolations.length === 0,
'retained leaf/log-distance proof failed');

const halo = uniqueCells(operatedCells.flatMap((cell) => {
  const output = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        output.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return output;
}));
const preservedReviewDomain = uniqueCells([
  ...halo.filter((cell) => !operatedKeys.has(cellKey(cell))),
  ...preservedExceptions,
  ...r11aSurface,
  ...r11aHeadroom,
  ...r11aSupports,
  ...r11bSurface,
  ...r11bHeadroom,
  ...[...influencedLeaves.values()].map(({ cell }) => cell),
]).filter((cell) => !operatedKeys.has(cellKey(cell)));
const undeclaredDrift = [];
for (const cell of preservedReviewDomain) {
  const before = await stateAt(sourceReader, sourceCache, cell);
  const after = await stateAt(postReader, postCache, cell);
  if (before !== after) undeclaredDrift.push({ cell, before, after });
}
invariant(undeclaredDrift.length === 0, 'undeclared review-domain drift exists');

const preservedExceptionRecords = await Promise.all(preservedExceptions.map(async (cell) => ({
  cell,
  sourceState: await stateAt(sourceReader, sourceCache, cell),
  postState: await stateAt(postReader, postCache, cell),
})));
const preservedExceptionViolations = preservedExceptionRecords.filter(
  ({ sourceState, postState }) => sourceState !== postState,
);
invariant(preservedExceptionViolations.length === 0,
'declared preserved exception drift exists');

const executionPath = path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.forward-execution.json`);
const execution = readJson(executionPath);
const executionBinding = fileBinding(executionPath);
const journalBinding = fileBinding(execution.streamJournal);
const executionPass = execution.schemaVersion === 3
  && execution.status === 'complete'
  && execution.dryRun === false
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.sourceOperationCount === EXPECTED.operationCount
  && execution.sourceGroupCount === EXPECTED.operationCount
  && execution.successfulGroups === EXPECTED.operationCount
  && execution.failedGroups === 0
  && execution.successfulCommands === EXPECTED.operationCount
  && execution.failedCommands === 0
  && execution.noopCommands === 0
  && execution.unexpectedNoopCommands === 0
  && execution.worldEditLeftoverCount === 0;
const rollbackPath = path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.rollback-poststate-preflight.json`);
const rollbackReport = readJson(rollbackPath);
const rollbackReportBinding = fileBinding(rollbackPath);
const rollbackPass = rollbackReport.status === 'PASS'
  && rollbackReport.passed === EXPECTED.operationCount
  && rollbackReport.failed === 0
  && rollbackReport.regionsSnapshot.sha256 === EXPECTED.postRegion
  && rollbackReport.sourceOverlays === null;

const checks = [];
const check = (id, passed, detail) => checks.push({
  id,
  status: passed ? 'PASS' : 'FAIL',
  detail,
});
check('R11C-QA-01-TERMINAL-LEDGER', allStagesPass && evidenceBindingMismatches.length === 0,
  `${ledger.stages.length}/${EXPECTED.stageCount} stages and ${ledger.evidenceBindings.length}/${EXPECTED.evidenceBindingCount} evidence bindings PASS.`);
check('R11C-QA-02-RELEASE-IDENTITY', manifest.manifestIdentity === EXPECTED.manifestIdentity
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'Manifest, execution, and completed identities exact.');
check('R11C-QA-03-SOURCE-POST-BOUND', sourceIdentity.sha256 === EXPECTED.sourceRegion
  && postIdentity.sha256 === EXPECTED.postRegion,
'Source/post complete saves and region identities exact.');
check('R11C-QA-04-EXACT-SOURCE-GUARDS', sourceMismatchCount === 0,
  `${EXPECTED.operationCount - sourceMismatchCount}/${EXPECTED.operationCount} exact source states.`);
check('R11C-QA-05-EXACT-POST-TARGETS', targetMismatchCount === 0,
  `${EXPECTED.operationCount - targetMismatchCount}/${EXPECTED.operationCount} exact post targets.`);
check('R11C-QA-06-EXACT-INVERSE', rollback.length === EXPECTED.operationCount,
  `${rollback.length}/${EXPECTED.operationCount} record-reversed rollback operations.`);
check('R11C-QA-07-ROUTE-CONNECTIVITY', combinedRouteConnectivity.componentCount === 1
  && seamAB.maximumAdjacentStep <= 1 && seamAC.maximumAdjacentStep <= 1
  && seamBC.maximumAdjacentStep <= 1,
  `R11A/B/C route ${combinedRoute.length} cells/one component; AB ${seamAB.adjacentPairCount}, AC ${seamAC.adjacentPairCount}, BC ${seamBC.adjacentPairCount} seam pairs; max step one.`);
check('R11C-QA-08-STABLE-FOUNDATION', foundationOps.length === EXPECTED.foundationCount
  && unstableSupportRecords.length === 0,
  `${foundationOps.length}/${EXPECTED.foundationCount} fills; ${r11cSupports.length - unstableSupportRecords.length}/${r11cSupports.length} stable contacts.`);
check('R11C-QA-09-FULL-HEADROOM', mismatchCount(r11cHeadroomRecords) === 0
  && mismatchCount(r11aHeadroomRecords) === 0 && mismatchCount(r11bHeadroomRecords) === 0,
  `R11C ${r11cHeadroom.length}/${EXPECTED.fullHeadroomCount}, R11A ${r11aHeadroom.length}/${EXPECTED.r11aHeadroomCount}, R11B ${r11bHeadroom.length}/${EXPECTED.r11bHeadroomCount} air.`);
check('R11C-QA-10-PRESERVED-R11A-SUPPORT', preservedR11ASupport.length === EXPECTED.r11aSupportPreservedCount
  && preservedExceptionViolations.length === 0,
  `${preservedR11ASupport.length}/${EXPECTED.r11aSupportPreservedCount} exact R11A support cells unchanged.`);
check('R11C-QA-11-PRESERVED-GRADE-UTILITY', gradeShadows.length === EXPECTED.gradeShadowCount
  && utilityConflicts.length === EXPECTED.utilityConflictCount
  && preservedExceptionViolations.length === 0,
  `${gradeShadows.length}/${EXPECTED.gradeShadowCount} grade shadows and ${utilityConflicts.length}/${EXPECTED.utilityConflictCount} utility conflicts unchanged.`);
check('R11C-QA-12-RETAINED-LEAF-DISTANCE', retainedLeafViolations.length === 0,
  `${retainedLeafRecords.length}/${EXPECTED.influencedLeafCount} leaves exact and retained-log distance 1..6; ${JSON.stringify(retainedLogDistanceCensus)}.`);
check('R11C-QA-13-ZERO-UNDECLARED-DRIFT', undeclaredDrift.length === 0,
  `${preservedReviewDomain.length - undeclaredDrift.length}/${preservedReviewDomain.length} preserved review cells unchanged.`);
check('R11C-QA-14-STRICT-EXECUTION', executionPass,
  `${execution.successfulGroups}/${EXPECTED.operationCount} groups, zero failure/no-op/WorldEdit leftovers.`);
check('R11C-QA-15-ROLLBACK-POSTSTATE', rollbackPass,
  `${rollbackReport.passed}/${EXPECTED.operationCount} rollback guards PASS.`);
check('R11C-QA-16-DECLARED-ISOLATION', manifest.isolation.fluidHaloIntersectionCount === 0
  && manifest.isolation.blockEntityHaloIntersectionCount === 0
  && manifest.isolation.savedEntityHaloIntersectionCount === 0
  && manifest.isolation.protectedRelicHaloIntersectionCount === 0
  && manifest.isolation.undeclaredPriorReleaseIntersectionCount === 0
  && manifest.isolation.declaredLeafPropertyTransitionCount === 0,
'All declared hazard/interface isolation and zero leaf-property mutation remain exact.');

const failed = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r11c-c1-east-highway-completion-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failed.length === 0
    ? 'PASS_R11C_C1_EAST_HIGHWAY_COMPLETION_POST_RELEASE_ACCEPTED'
    : 'FAIL_R11C_C1_EAST_HIGHWAY_COMPLETION_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    manifestIdentity: manifest.manifestIdentity,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
    ledgerEvidence: {
      declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceBindingMismatches.length,
      mismatchCount: evidenceBindingMismatches.length,
    },
  },
  geometry: {
    r11aSurface: exactSet(r11aSurface),
    r11bSurface: exactSet(r11bSurface),
    r11cSurface: exactSet(derivedR11CSurface),
    combinedRoute: exactSet(combinedRoute),
    combinedRouteConnectivity,
    seams: { r11aR11b: seamAB, r11aR11c: seamAC, r11bR11c: seamBC },
    foundationFill: exactSet(foundationOps.map(({ cell }) => cell)),
    r11cHeadroom: exactSet(r11cHeadroom),
    r11aHeadroom: exactSet(r11aHeadroom),
    r11bHeadroom: exactSet(r11bHeadroom),
    preservedR11ASupport: exactSet(preservedR11ASupport),
    preservedGradeShadows: exactSet(gradeShadows),
    preservedUtilityConflicts: exactSet(utilityConflicts),
    preservedExceptions: exactSet(preservedExceptions),
    operatedUnion: exactSet(operatedCells),
    preservedReviewDomain: exactSet(preservedReviewDomain),
  },
  postState: {
    exactTargets: {
      matchingCellCount: postOperated.length - targetMismatchCount,
      mismatchCellCount: targetMismatchCount,
      stateCensus: stateCensus(postOperated),
    },
    foundation: {
      exactFillCount: foundationOps.length,
      stableContactCount: r11cSupports.length - unstableSupportRecords.length,
      unstableContactCount: unstableSupportRecords.length,
      supportStateCensus: stateCensus(r11cSupportRecords),
    },
    headroom: {
      r11cAirCellCount: r11cHeadroom.length - mismatchCount(r11cHeadroomRecords),
      r11aAirCellCount: r11aHeadroom.length - mismatchCount(r11aHeadroomRecords),
      r11bAirCellCount: r11bHeadroom.length - mismatchCount(r11bHeadroomRecords),
    },
    retainedLeaves: {
      exactRetainedCellCount: retainedLeafRecords.length - retainedLeafViolations.length,
      violationCount: retainedLeafViolations.length,
      retainedLogDistanceCensus,
      coordinateSet: exactSet(retainedLeafRecords.map(({ cell }) => cell)),
    },
    preservedReviewDomain: {
      unchangedCellCount: preservedReviewDomain.length - undeclaredDrift.length,
      driftCellCount: undeclaredDrift.length,
      listedDrift: undeclaredDrift.slice(0, 100),
    },
  },
  executionEvidence: {
    stageOrder: { expected: expectedStageOrder, exact: allStagesPass },
    strictForwardExecution: {
      ...executionBinding,
      journal: journalBinding,
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      passed: executionPass,
    },
    rollbackPoststatePreflight: {
      ...rollbackReportBinding,
      status: rollbackReport.status,
      passedGuards: rollbackReport.passed,
      failedGuards: rollbackReport.failed,
      regionSnapshotSha256: rollbackReport.regionsSnapshot.sha256,
      passed: rollbackPass,
    },
  },
  checks,
  summary: {
    passed: failed.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failed.length,
    failCount: failed.length,
    exactTargetMatchCount: postOperated.length - targetMismatchCount,
    combinedRouteCellCount: combinedRoute.length,
    combinedRouteComponentCount: combinedRouteConnectivity.componentCount,
    foundationFillMatchCount: foundationOps.length,
    stableSupportCount: r11cSupports.length - unstableSupportRecords.length,
    r11cHeadroomAirCount: r11cHeadroom.length - mismatchCount(r11cHeadroomRecords),
    preservedR11ASupportCount: preservedR11ASupport.length,
    preservedGradeShadowCount: gradeShadows.length,
    preservedUtilityConflictCount: utilityConflicts.length,
    retainedLeafExactCount: retainedLeafRecords.length - retainedLeafViolations.length,
    preservedReviewDomainUnchangedCount: preservedReviewDomain.length - undeclaredDrift.length,
    preservedReviewDomainCellCount: preservedReviewDomain.length,
    strictExecutionPassCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackReport.passed,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
const report = { ...qaPayload, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# CZ-R11C C1 east-highway completion post-release QA',
  '',
  `**Status:** ${report.status}  `,
  `**QA payload identity:** ${qaPayloadSha256}  `,
  `**Completed release identity:** ${ledger.completedReleaseIdentitySha256}`,
  '',
  '## Result',
  '',
  '| Test | Result |',
  '|---|---:|',
  `| Exact operated targets | ${qaPayload.summary.exactTargetMatchCount} / 1,109 |`,
  `| Combined R11A/B/C route | ${combinedRoute.length} cells / ${combinedRouteConnectivity.componentCount} component |`,
  `| R11C foundation fills | ${qaPayload.summary.foundationFillMatchCount} / 68 |`,
  `| Stable R11C contacts | ${qaPayload.summary.stableSupportCount} / 399 |`,
  `| R11C two-block headroom | ${qaPayload.summary.r11cHeadroomAirCount} / 798 |`,
  `| Preserved R11A support | ${qaPayload.summary.preservedR11ASupportCount} / 23 |`,
  `| Preserved grade shadows | ${qaPayload.summary.preservedGradeShadowCount} / 13 |`,
  `| Preserved utility exceptions | ${qaPayload.summary.preservedUtilityConflictCount} / 3 |`,
  `| Retained leaves | ${qaPayload.summary.retainedLeafExactCount} / 235 |`,
  `| Preserved review domain | ${qaPayload.summary.preservedReviewDomainUnchangedCount} / ${qaPayload.summary.preservedReviewDomainCellCount} |`,
  `| Strict execution | ${qaPayload.summary.strictExecutionPassCount} / 1,109 |`,
  `| Rollback post-state | ${qaPayload.summary.rollbackGuardPassCount} / 1,109 |`,
  '',
  '## Checks',
  '',
  '| Check | Status | Detail |',
  '|---|---|---|',
  ...checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`),
  '',
  'This verifier read only immutable source/post Anvil saves and hash-bound evidence.',
  'It made no live call and performed no world edit.',
  '',
].join('\n');
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  exactTargets: `${qaPayload.summary.exactTargetMatchCount}/1109`,
  combinedRoute: `${combinedRoute.length}/${combinedRouteConnectivity.componentCount}-component`,
  foundationFills: `${qaPayload.summary.foundationFillMatchCount}/68`,
  stableSupports: `${qaPayload.summary.stableSupportCount}/399`,
  r11cHeadroom: `${qaPayload.summary.r11cHeadroomAirCount}/798`,
  preservedR11ASupport: `${qaPayload.summary.preservedR11ASupportCount}/23`,
  gradeShadows: `${qaPayload.summary.preservedGradeShadowCount}/13`,
  utilityConflicts: `${qaPayload.summary.preservedUtilityConflictCount}/3`,
  retainedLeaves: `${qaPayload.summary.retainedLeafExactCount}/235`,
  preservedReviewDomain: `${qaPayload.summary.preservedReviewDomainUnchangedCount}/${qaPayload.summary.preservedReviewDomainCellCount}`,
  strictExecution: `${qaPayload.summary.strictExecutionPassCount}/1109`,
  rollbackGuards: `${qaPayload.summary.rollbackGuardPassCount}/1109`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failed.length) process.exitCode = 1;
