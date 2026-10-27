#!/usr/bin/env node
/** Read-only bounded R11 C1 MVP closure for the R13 dependency verifier. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  connectedComponents,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T04:55:00Z');
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.json',
);
const MD_OUT = value(
  '--markdown',
  'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.md',
);
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const R11K_MANIFEST =
  'data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.release-manifest.json';
const R11K_LEDGER =
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/evidence-ledger.json';
const R11K_QA =
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-post-release-qa.json';
const R11K_SEAL =
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-bounded-at-grade-commissioning-seal.json';
const R11K_INVENTORY =
  'data/world-review/combined-zones-r11k-west-at-grade-closure-inventory-20260822T044500Z.json';
const R11J_INVENTORY =
  'data/world-review/combined-zones-r11j-west-hydraulic-bridge-inventory-20260822T042000Z.json';
const ACCEPTED_QA = [
  ['R11A', 'data/world-review/combined-zones-r11a-live-20260821T170600Z/r11a-post-release-qa.json'],
  ['R11B', 'data/world-review/combined-zones-r11b-live-20260821T173605Z/r11b-post-release-qa.json'],
  ['R11C', 'data/world-review/combined-zones-r11c-live-20260821T185813Z/r11c-post-release-qa.json'],
  ['R11D', 'data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.json'],
  ['R11E retry-v2', 'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/r11e-retry-v2-post-release-qa.json'],
  ['R11F', 'data/world-review/combined-zones-r11f-live-20260821T234824Z/r11f-post-release-qa.json'],
  ['R11H retry-v2', 'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json'],
  ['R11I', 'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-post-release-qa.json'],
  ['R11J', 'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-post-release-qa.json'],
  ['R11K', R11K_QA],
];
const EXPECTED = Object.freeze({
  r11kManifestSha256:
    '626492caa4467beae7240f6dae106adebe4618c7e0fa74cd03361920ec81295f',
  r11kLedgerSha256:
    '4e1fc6b2175338ed5c0e8f132a8891aaa09a578de4b482ba9ddc626613d63521',
  r11kQaSha256:
    'd364d1410ad0e9df75e8b2ea4d5ae3da06aae3e39366b10a88250af2dcbb2ee5',
  r11kQaPayloadSha256:
    'aa52f2210028ce74b674666d5615bc1b94f27681a319a25fc0efe527861d5938',
  r11kSealSha256:
    '3caaf9bdc2832cf9394b3b7c823d503d27a0a141d73222e9f8b939fb740421b5',
  r11kSealPayloadSha256:
    '574329dcded8b310326965af5f1ca6ccccbb16664dec146c0c39b3ce2e7bce55',
  r11kInventorySha256:
    '1902f7deb1f29c0140adef024275c21ba4babc660afe8ca56a76367e5b3564e7',
  r11jInventorySha256:
    'a79a6e9616c987dc402781ce083a1ec4822c6e633b0a5051f1d56b2cabd2348a',
  r11kCompletedIdentity:
    '21b76f66a745138f0d977585675b9d03aa8ed590c2f2f5ff5f7987993fd28508',
  terminalPostRoot: 'data/worldsnap-r11k-post-20260822T043931Z',
  terminalPostCompleteSaveSha256:
    '5bc1c7f2b3b37ae9d817e14f5116adfe67ec869a7385dc012ff9660498b282d2',
  terminalPostRegionSha256:
    'e2188c99083a85bf61757f0bb40e3bb9b97b44a6784a3e6d2b29134ff08dad87',
  surfaceCount: 2848,
  surfaceHash: '167a512a0350cf636b4edf4d5495b94609ac784e32a9f075b9c743c7893023eb',
  componentCount: 10,
  retainedHydraulicCellCount: 38,
  savedSheepCount: 3,
  savedChickenCount: 1,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11 bounded closure rejected: ${message}`);
};
const readBoundJson = (filename, expected = null) => {
  const bytes = fs.readFileSync(absolute(filename));
  if (expected) invariant(sha256(bytes) === expected, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
const binding = (filename, expected = null) => {
  const bound = readBoundJson(filename, expected);
  return {
    value: bound.value,
    evidence: { path: relative(filename), sha256: sha256(bound.bytes), bytes: bound.bytes.length },
  };
};
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}
function maximumWalkableStep(cells) {
  let maximum = 0;
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) !== 1) continue;
      const step = Math.abs(left.y - right.y);
      if (step <= 1) maximum = Math.max(maximum, step);
    }
  }
  return maximum;
}

const manifestBound = binding(R11K_MANIFEST, EXPECTED.r11kManifestSha256);
const ledgerBound = binding(R11K_LEDGER, EXPECTED.r11kLedgerSha256);
const qaBound = binding(R11K_QA, EXPECTED.r11kQaSha256);
const sealBound = binding(R11K_SEAL, EXPECTED.r11kSealSha256);
const inventoryBound = binding(R11K_INVENTORY, EXPECTED.r11kInventorySha256);
const hydraulicInventoryBound = binding(R11J_INVENTORY, EXPECTED.r11jInventorySha256);
const manifest = manifestBound.value;
const ledger = ledgerBound.value;
const qa = qaBound.value;
const seal = sealBound.value;
invariant(manifest.releaseNodeId === RELEASE_NODE_ID
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.releaseNodeId === RELEASE_NODE_ID
  && ledger.completedReleaseIdentitySha256 === EXPECTED.r11kCompletedIdentity
  && ledger.postSnapshot.root === EXPECTED.terminalPostRoot
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.terminalPostCompleteSaveSha256
  && qa.status === 'PASS' && qa.qaPayloadSha256 === EXPECTED.r11kQaPayloadSha256
  && qa.post.regionSha256 === EXPECTED.terminalPostRegionSha256
  && qa.acceptance.exactPhysicalStateAccepted === true
  && qa.acceptance.exactRollbackReady === true
  && qa.acceptance.perScopeStepSafeWalkabilityAccepted === true
  && qa.acceptance.wholeRouteCommissioned === false
  && seal.status === 'R11K_BOUNDED_DISJOINT_AT_GRADE_POST_QA_PASS'
  && seal.sealPayloadSha256 === EXPECTED.r11kSealPayloadSha256,
'R11K terminal ledger/post-QA/seal chain drifted');

const acceptedQaBindings = ACCEPTED_QA.map(([label, filename]) => {
  const bound = binding(filename);
  invariant(typeof bound.value.status === 'string' && bound.value.status.startsWith('PASS'),
    `${label} no longer carries accepted post QA`);
  return { label, ...bound.evidence, evidenceStatus: bound.value.status };
});

const allManifests = [
  ...manifest.source.priorManifestBindings.map(({ path: filename, sha256: expected }) => {
    const bound = binding(filename, expected);
    return { manifest: bound.value, evidence: bound.evidence };
  }),
  { manifest, evidence: manifestBound.evidence },
];
const surfaceByKey = new Map();
let railOperationTargetCount = 0;
for (const { manifest: releaseManifest } of allManifests) {
  for (const pkg of releaseManifest.packages ?? []) for (const record of parseOperations(pkg.forward)) {
    if (surfaceState(record.targetState)) surfaceByKey.set(cellKey(record.cell), record.cell);
    if (/(?:^|:)\w*rail(?:\[|$)/.test(record.targetState)) railOperationTargetCount += 1;
  }
}
const surfaceCells = uniqueCells([...surfaceByKey.values()]);
invariant(surfaceCells.length === EXPECTED.surfaceCount
  && hashCells(surfaceCells) === EXPECTED.surfaceHash
  && railOperationTargetCount === 0,
'accepted surface union or zero-rail-operation disposition drifted');

const postReader = new AnvilReader(absolute(path.join(EXPECTED.terminalPostRoot, 'region')));
const postCache = new Map();
const postAt = async (cell) => {
  const key = cellKey(cell);
  if (!postCache.has(key)) postCache.set(key, stateToCommandString(
    await postReader.blockState(cell.x, cell.y, cell.z),
  ));
  return postCache.get(key);
};
let exactPostSurfaceCount = 0;
const postMaterialCensus = {};
for (const cell of surfaceCells) {
  const state = await postAt(cell);
  if (surfaceState(state)) exactPostSurfaceCount += 1;
  postMaterialCensus[state] = (postMaterialCensus[state] ?? 0) + 1;
}
const components = connectedComponents(surfaceCells);
const componentSummaries = components.map((cells, index) => ({
  component: index + 1,
  acceptedUse: 'BOUNDED_HIGHWAY_AND_PEDESTRIAN_SURFACE_ONLY',
  cellCount: cells.length,
  bounds: boundsOf(cells),
  coordinateSetSha256: hashCells(cells),
  walkableComponentCount: connectedComponents(cells).length,
  maximumWalkableStep: maximumWalkableStep(cells),
}));
invariant(exactPostSurfaceCount === surfaceCells.length
  && components.length === EXPECTED.componentCount
  && componentSummaries.every(({ walkableComponentCount, maximumWalkableStep: step }) => (
    walkableComponentCount === 1 && step <= 1
  )),
'terminal-post bounded highway/pedestrian component proof drifted');

const retainedHydraulic = hydraulicInventoryBound.value.hazards.haloFluids;
let retainedHydraulicDriftCount = 0;
for (const record of retainedHydraulic) {
  if (await postAt(record.cell) !== record.sourceState) retainedHydraulicDriftCount += 1;
}
const savedEntityCensus = inventoryBound.value.scope.savedEntities.reduce(
  (result, { id }) => ({ ...result, [id]: (result[id] ?? 0) + 1 }), {},
);
invariant(retainedHydraulic.length === EXPECTED.retainedHydraulicCellCount
  && retainedHydraulicDriftCount === 0
  && savedEntityCensus['minecraft:sheep'] === EXPECTED.savedSheepCount
  && savedEntityCensus['minecraft:chicken'] === EXPECTED.savedChickenCount,
'retained hydraulic/sheep boundary drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R11_BOUNDED_C1_MVP_CLOSURE_ACCEPTED',
  releaseNodeId: RELEASE_NODE_ID,
  closureKind: 'READ_ONLY_BOUNDED_PHYSICAL_SURFACE_ACCEPTANCE',
  terminalPost: {
    root: EXPECTED.terminalPostRoot,
    completeSaveSha256: EXPECTED.terminalPostCompleteSaveSha256,
    regionSha256: EXPECTED.terminalPostRegionSha256,
  },
  bindings: {
    r11kManifest: manifestBound.evidence,
    r11kLedger: ledgerBound.evidence,
    r11kPostQa: qaBound.evidence,
    r11kBoundedSeal: sealBound.evidence,
    r11kInventory: inventoryBound.evidence,
    r11jHydraulicInventory: hydraulicInventoryBound.evidence,
    acceptedPostQa: acceptedQaBindings,
    acceptedManifests: allManifests.map(({ evidence }) => evidence),
  },
  acceptedBoundedPhysicalState: {
    system: 'C1_HIGHWAY_AND_PEDESTRIAN_SURFACES',
    surfaceCellCount: surfaceCells.length,
    surfaceCoordinateSetSha256: hashCells(surfaceCells),
    exactTerminalPostSurfaceCount: exactPostSurfaceCount,
    postMaterialCensus,
    componentCount: components.length,
    everyComponentConnectedAtMaximumStepOne: true,
    components: componentSummaries,
    publicRouteCommissioned: false,
  },
  retainedHolds: {
    rail: {
      status: 'HELD_RESERVATION_ONLY',
      physicalRailTargetCount: railOperationTargetCount,
      commissioned: false,
    },
    wetAndHydraulic: {
      status: 'HELD_OUTSIDE_ACCEPTED_STATIC_SURFACES',
      retainedReviewedFluidCellCount: retainedHydraulic.length,
      retainedReviewedFluidDriftCount: retainedHydraulicDriftCount,
      commissioned: false,
    },
    sheepAndEntityInteraction: {
      status: 'HELD_OUTSIDE_ACCEPTED_TARGETS',
      savedEntityCensus,
      commissioned: false,
    },
    missingStationRanges: {
      status: 'HELD_UNBUILT_OR_UNCONNECTED',
      fullDesignStationDomain: { start: 0, end: 1215, count: 1216 },
      boundedWestReviewRangesNotAcceptedByR11K: [
        { start: 1146, end: 1171 },
        { start: 1173, end: 1183 },
      ],
      commissioned: false,
    },
    interchange: { status: 'HELD_UNCOMMISSIONED', commissioned: false },
    drainage: { status: 'HELD_UNCOMMISSIONED', commissioned: false },
    utilities: { status: 'HELD_UNCOMMISSIONED', commissioned: false },
    wholeCorridor: { status: 'HELD_UNCOMMISSIONED', commissioned: false },
  },
  acceptanceBoundary: {
    acceptsOnlyEnumeratedConnectedMaxStepOneSurfaceComponents: true,
    railAccepted: false,
    wetOrHydraulicSystemAccepted: false,
    sheepInteractionRangesAccepted: false,
    missingRangesAccepted: false,
    interchangeAccepted: false,
    drainageAccepted: false,
    utilitiesAccepted: false,
    wholeCorridorAcceptedOrCommissioned: false,
  },
  r13Disposition: {
    satisfiesBoundedR11MvpClosure: true,
    localHoldsPreservedWithoutBecomingGlobalVetoes: true,
    deferredOrHeldSystemsMayRequireIndependentFutureReleases: true,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    canonicalBuildopsModified: false,
    docsModified: false,
    serviceMutationsPerformed: false,
  },
};
const closurePayloadSha256 = sha256(`${JSON.stringify(reportWithoutIdentity, null, 2)}\n`);
const report = { ...reportWithoutIdentity, closurePayloadSha256 };
const markdown = `# R11 bounded C1 MVP closure\n\nStatus: **${report.status}**\n\nThis read-only seal accepts exactly ${surfaceCells.length.toLocaleString('en-US')} terminal-post highway/pedestrian pavement cells in ${components.length} independently connected components. Every component is connected through max-step-one edges. This is bounded physical surface acceptance, not whole-route commissioning.\n\nRail remains reservation-only. Wet/hydraulic systems, all sheep/entity interaction bands, unbuilt or unconnected station ranges, interchange work, drainage, utilities, and the whole corridor remain explicitly held and uncommissioned. The reviewed ${retainedHydraulic.length}-cell hydraulic baseline remains exact in the R11K terminal post.\n\nClosure payload: \`${closurePayloadSha256}\`. No live call, world edit, buildops edit, docs edit, or service mutation was performed.\n`;
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), markdown);
console.log(JSON.stringify({
  status: report.status,
  out: relative(OUT),
  markdown: relative(MD_OUT),
  closurePayloadSha256,
  surfaceCellCount: surfaceCells.length,
  componentCount: components.length,
  retainedHoldCount: Object.keys(report.retainedHolds).length,
}, null, 2));
