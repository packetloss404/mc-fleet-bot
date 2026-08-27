#!/usr/bin/env node
/** Deterministic read-only residual-scope screen for CZ-R11G. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11g-c1-residual-screen-20260822T001500Z.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T00:15:00Z');
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const R11E_INVENTORY_PATH =
  'data/world-review/combined-zones-r11e-inventory-20260821T194000Z.json';
const R11F_INVENTORY_PATH =
  'data/world-review/combined-zones-r11f-inventory-20260821T235000Z.json';
const TERMINAL_LEDGER_PATH =
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/evidence-ledger.json';
const TERMINAL_QA_PATH =
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/r11f-post-release-qa.json';
const EXPECTED = Object.freeze({
  designSha256: '7776e243dc24b03fa7903ecb93ec8f05e6e0cbd81aa3749e2fb52435b7dc2442',
  r11eInventorySha256: '460f488c99307e549dfaaad974de266c5b9a2cb61d7c521fb5ec31cdbed5bc3a',
  r11fInventorySha256: '542432912cc14ed1a1a9f3918dc9deaf64cc7a9762f0adc085e347f325f03021',
  terminalLedgerSha256: '2e021ad9ee6bbab97ccc5150ca240876f0e66956fc676171140084566a2deabe',
  terminalQaSha256: '7d760b0e9c862e40b711d1d621b8d85a5d883464eb4455fb6a779166fd37cf0a',
  terminalCompletedReleaseIdentitySha256:
    'a7f8c5d9f9fa81df360c146e79287ed4eba03b2128f6af428490943d3d565c86',
  terminalCompleteSaveSha256:
    '14f4f7a055d682d77c7e4330514c1b77bc21fc35af52cc99ea5a60bfab29f918',
  terminalRegionSha256:
    '029ba78c1de35a125f7d103c6073282b7df75de61499d7be4f4fcd318b6a6962',
  terminalQaPayloadSha256:
    '8ac43bc608ce9fdc00e1b5cacf410be6bb6f31319230e176f4aa405cd59a0596',
});
const ACCEPTED_RELEASES = Object.freeze([
  {
    id: 'R11A',
    manifest: 'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
    manifestSha256: 'd6103791e8fc4afae575d90a743450d55b6e85cbe1d58cf3492132c254af7482',
    ledger: 'data/world-review/combined-zones-r11a-live-20260821T170600Z/evidence-ledger.json',
    ledgerSha256: '2248f4db565000559ef7766363ebd73bd6465b24a6f42e4fc1248dba2246bb40',
    qa: 'data/world-review/combined-zones-r11a-live-20260821T170600Z/r11a-post-release-qa.json',
    qaSha256: '0f12c1d511c09ce6db66ba035e3ca4c104cfa6ad64c04783aac67b58c224cfd3',
  },
  {
    id: 'R11B',
    manifest: 'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
    manifestSha256: 'fda638b43c22cc52823e7fae46cc34c3e5246a67c48bd9178c0df7a9a175546d',
    ledger: 'data/world-review/combined-zones-r11b-live-20260821T173605Z/evidence-ledger.json',
    ledgerSha256: '756534ed19b98a3b68a5b8f9cda4f099e616c23de6030908bb02e79a3ff3d849',
    qa: 'data/world-review/combined-zones-r11b-live-20260821T173605Z/r11b-post-release-qa.json',
    qaSha256: 'e9cd746ff878e455e68647d64c6d3d090040184b5204230de373c67a6578f7d7',
  },
  {
    id: 'R11C',
    manifest: 'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
    manifestSha256: '32f75bc8c089947934c6fe4f77e4f18e418de6f86ebca2ca87ffa0c044175b73',
    ledger: 'data/world-review/combined-zones-r11c-live-20260821T185813Z/evidence-ledger.json',
    ledgerSha256: 'ce3bb0d112061e9e111a75bb605ca955c60a944a0e32a794c89b6b5388ee55d5',
    qa: 'data/world-review/combined-zones-r11c-live-20260821T185813Z/r11c-post-release-qa.json',
    qaSha256: '63ee07a9ee08b45437c88391fa9a6424b2c0af3a14a8b596f9bbad2c81ff3bba',
  },
  {
    id: 'R11D',
    manifest: 'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
    manifestSha256: '55f8dd5a77591065e22ec08065d942a08831313079225a1c01ffc0f94d4d23d6',
    ledger: 'data/world-review/combined-zones-r11d-live-20260821T192414Z/evidence-ledger.json',
    ledgerSha256: '39e71bd77cb0d231a3bd4b45dcba857c9c2934d959b32464624fd88252b53975',
    qa: 'data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.json',
    qaSha256: 'cd1804b98e7e7b965c2262630bfed3c7dcd6b6288b086876b89a942219b55329',
  },
  {
    id: 'R11E',
    manifest: 'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json',
    manifestSha256: 'db348b7419dc6955dce857e58b3e152a58da5b93ba1167cb1a8d3b7623eff9ee',
    ledger: 'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/evidence-ledger.json',
    ledgerSha256: '97b0a46b5ddd2b56c2864cf44e71746dbb186fddd5a2ccb19e5ea0cd7b2a562f',
    qa: 'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/r11e-retry-v2-post-release-qa.json',
    qaSha256: 'c347ba0ad87dd10f508b2ad51ca008d9fa41a7edfa7d39ee119dcbb384e97dae',
  },
  {
    id: 'R11F',
    manifest: 'data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json',
    manifestSha256: '96dba501a6376f2e5bafde87519138cd3ffd05c75f96fee8395d4edc424ab584',
    ledger: TERMINAL_LEDGER_PATH,
    ledgerSha256: EXPECTED.terminalLedgerSha256,
    qa: TERMINAL_QA_PATH,
    qaSha256: EXPECTED.terminalQaSha256,
  },
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11G residual screen rejected: ${message}`);
};
const readBoundJson = (filename, expectedSha256) => {
  const bytes = fs.readFileSync(absolute(filename));
  invariant(sha256(bytes) === expectedSha256, `${filename} identity drifted`);
  return JSON.parse(bytes);
};
const rangeKey = (start, end) => `${start}..${end}`;
const contiguousRuns = (stations) => {
  const runs = [];
  let start = 0;
  for (let index = 1; index <= stations.length; index += 1) {
    if (index === stations.length || stations[index].treatment !== stations[start].treatment) {
      runs.push({
        stations: { start, end: index - 1, count: index - start },
        treatment: stations[start].treatment,
      });
      start = index;
    }
  }
  return runs;
};
const manifestStationRanges = (manifest) => {
  if (manifest.scope?.stations?.start !== undefined) return [manifest.scope.stations];
  return (manifest.scope?.includedIslands ?? []).map(({ stations }) => stations);
};

const design = readBoundJson(DESIGN_PATH, EXPECTED.designSha256);
const r11eInventory = readBoundJson(R11E_INVENTORY_PATH, EXPECTED.r11eInventorySha256);
const r11fInventory = readBoundJson(R11F_INVENTORY_PATH, EXPECTED.r11fInventorySha256);
const terminalLedger = readBoundJson(TERMINAL_LEDGER_PATH, EXPECTED.terminalLedgerSha256);
const terminalQa = readBoundJson(TERMINAL_QA_PATH, EXPECTED.terminalQaSha256);
invariant(terminalLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && terminalLedger.completedReleaseIdentitySha256
    === EXPECTED.terminalCompletedReleaseIdentitySha256
  && terminalLedger.postSnapshot.completeSaveSha256 === EXPECTED.terminalCompleteSaveSha256,
'accepted R11F terminal ledger drifted');
const terminalPostIdentity = readBoundJson(
  terminalLedger.postSnapshot.identity.path,
  terminalLedger.postSnapshot.identity.sha256,
);
invariant(terminalPostIdentity.sha256 === EXPECTED.terminalRegionSha256
  && terminalQa.qaPayloadSha256 === EXPECTED.terminalQaPayloadSha256
  && terminalQa.checks.exactTargetStateCount === 1_639
  && terminalQa.checks.undeclaredHaloDriftCount === 0
  && terminalQa.checks.excludedEarlyHaloDriftCount === 0
  && terminalQa.checks.wetRangeReviewDriftCount === 0
  && terminalQa.checks.omittedSheepIslandHaloDriftCount === 0
  && terminalQa.checks.protectedSheepNbtDriftCount === 0
  && terminalQa.checks.heldTreatmentReviewDriftCount === 0,
'R11F terminal QA does not preserve every residual interface');

const stations = design.horizontalAlignment.stations;
const runs = contiguousRuns(stations);
invariant(stations.length === 1_216 && runs.length === 45,
'frozen C1 station/treatment run census drifted');
const acceptedStationOwners = new Map();
const acceptedReleases = [];
for (const release of ACCEPTED_RELEASES) {
  const manifest = readBoundJson(release.manifest, release.manifestSha256);
  const ledger = readBoundJson(release.ledger, release.ledgerSha256);
  const qa = readBoundJson(release.qa, release.qaSha256);
  invariant(manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
    && manifest.scope.canonicalOwner === 'C1-HIGHWAY'
    && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    && ledger.manifest.sha256 === release.manifestSha256
    && String(qa.status).startsWith('PASS'),
  `${release.id} accepted execution/QA binding drifted`);
  const releaseRanges = manifestStationRanges(manifest);
  let stationCount = 0;
  for (const range of releaseRanges) {
    for (let station = range.start; station <= range.end; station += 1) {
      invariant(stations[station].treatment === 'AT_GRADE_COORDINATION_PASS',
        `${release.id} claims a non-at-grade station ${station}`);
      invariant(!acceptedStationOwners.has(station),
        `${release.id} overlaps ${acceptedStationOwners.get(station)} at station ${station}`);
      acceptedStationOwners.set(station, release.id);
      stationCount += 1;
    }
  }
  acceptedReleases.push({
    id: release.id,
    manifestPath: release.manifest,
    manifestSha256: release.manifestSha256,
    ledgerPath: release.ledger,
    ledgerSha256: release.ledgerSha256,
    postQaPath: release.qa,
    postQaSha256: release.qaSha256,
    stationRanges: releaseRanges,
    stationCount,
  });
}

const atGradeRuns = runs.filter(({ treatment }) => treatment === 'AT_GRADE_COORDINATION_PASS');
const remainingAtGradeRuns = atGradeRuns.filter(({ stations: run }) => {
  let acceptedCount = 0;
  for (let station = run.start; station <= run.end; station += 1) {
    if (acceptedStationOwners.has(station)) acceptedCount += 1;
  }
  invariant(acceptedCount === 0 || acceptedCount === run.count,
    `partially released treatment run ${rangeKey(run.start, run.end)}`);
  return acceptedCount === 0;
});
const nonAtGradeRuns = runs.filter(({ treatment }) => treatment !== 'AT_GRADE_COORDINATION_PASS');
const early = r11fInventory.ranges.find(({ key }) => key === 'island-0-10');
const frozenR11eByKey = new Map(r11eInventory.ranges.map((range) => [range.key, range]));
const terminalWetByKey = new Map(terminalQa.exclusions.wetRanges.map((range) => [range.key, range]));
const remainingAtGrade = remainingAtGradeRuns.map(({ stations: run, treatment }) => {
  const key = `island-${run.start}-${run.end}`;
  const inventory = key === 'island-0-10' ? early : frozenR11eByKey.get(key);
  invariant(inventory, `missing preserved-range inventory ${key}`);
  const base = {
    key,
    stations: run,
    treatment,
    prospectiveOperatedUnion: inventory.operated,
    sourceHazardCount: inventory.sourceHazardCount,
    sourceHazardCensus: inventory.sourceHazardCensus,
    interactionHalo: inventory.halo,
    haloHazardCount: inventory.haloHazardCount,
    haloHazardCensus: inventory.haloHazardCensus,
    savedEntityConflictCellCount: inventory.savedEntityConflicts.cellCount,
    interfaceIntersections: inventory.operatedInterfaceIntersections,
    currentTerminalPreservationProof: null,
    disposition: '',
  };
  if (key === 'island-0-10') {
    invariant(inventory.sourceHazardCount === 80 && inventory.haloHazardCount === 106
      && terminalQa.exclusions.excludedEarlyRange.driftCount === 0,
    'early hydraulic hold evidence drifted');
    base.currentTerminalPreservationProof = {
      reviewedCellCount: terminalQa.checks.excludedEarlyHaloCellCount,
      driftCount: terminalQa.checks.excludedEarlyHaloDriftCount,
    };
    base.disposition = 'LOCAL_UNSTABLE_CONTACT_AND_HYDRAULIC_HOLD_NO_PACKAGE';
  } else if (key === 'island-1142-1183') {
    invariant(inventory.operated.cellCount === 2_389
      && terminalQa.checks.omittedSheepIslandHaloDriftCount === 0
      && terminalQa.checks.protectedSheepCount === 3
      && terminalQa.checks.protectedSheepNbtDriftCount === 0,
    'roaming-sheep hold evidence drifted');
    base.currentTerminalPreservationProof = {
      omittedTargetCellCount: terminalQa.checks.omittedSheepIslandTargetCount,
      reviewedHaloCellCount: terminalQa.checks.omittedSheepIslandHaloCellCount,
      haloDriftCount: terminalQa.checks.omittedSheepIslandHaloDriftCount,
      protectedSheepCount: terminalQa.checks.protectedSheepCount,
      protectedSheepNbtDriftCount: terminalQa.checks.protectedSheepNbtDriftCount,
    };
    base.disposition = 'LOCAL_UNFENCED_ROAMING_SHEEP_INTERFACE_HOLD_NO_PACKAGE';
  } else {
    const current = terminalWetByKey.get(key);
    invariant(current?.driftCount === 0,
      `${key} terminal wet-range preservation proof drifted`);
    base.currentTerminalPreservationProof = {
      frozenHalo: current.frozenHalo,
      reviewedCellCount: current.reviewCellCount,
      driftCount: current.driftCount,
    };
    base.disposition = 'LOCAL_FLUID_OR_UNSTABLE_CONTACT_HOLD_NO_PACKAGE';
  }
  return base;
});

const treatmentCensus = Object.fromEntries([...new Set(stations.map(({ treatment }) => treatment))]
  .sort().map((treatment) => [treatment, {
    stationCount: stations.filter((station) => station.treatment === treatment).length,
    runCount: runs.filter((run) => run.treatment === treatment).length,
  }]));
const acceptedAtGradeStationCount = acceptedStationOwners.size;
const remainingAtGradeStationCount = remainingAtGrade.reduce(
  (sum, range) => sum + range.stations.count, 0,
);
const nonAtGradeHoldStationCount = nonAtGradeRuns.reduce(
  (sum, range) => sum + range.stations.count, 0,
);
invariant(atGradeRuns.length === 14 && acceptedAtGradeStationCount === 105
  && remainingAtGrade.length === 4 && remainingAtGradeStationCount === 259
  && acceptedAtGradeStationCount + remainingAtGradeStationCount === 364
  && nonAtGradeHoldStationCount === 852,
'residual station arithmetic drifted');
invariant(remainingAtGrade.every((range) => range.disposition.endsWith('NO_PACKAGE')),
'an unheld residual at-grade range exists');

const modeReadiness = {
  highway: {
    frozenPhysicalTargetGeometryPresent: true,
    acceptedAtGradeStationCount,
    remainingAtGradeStationCount,
    unheldSourceProvenResidualRunCount: 0,
  },
  passengerRail: {
    frozenSetoutPresent: true,
    staging: design.crossSection.reservedRailStrip.staging,
    frozenMaterialCellCount: design.crossSection.reservedRailStrip.materialCells.length,
    disposition: 'NO_PHYSICAL_PACKAGE_TRACK_CONSTRUCTION_REQUIRES_SEPARATE_RELEASE',
  },
  pedestrian: {
    separateFrozenPhysicalTargetGeometryPresent:
      Object.hasOwn(design.crossSection, 'pedestrian'),
    disposition: 'NO_SEPARATE_SOURCE_BOUND_MATERIAL_CELL_SET',
  },
  utilities: {
    separateFrozenPhysicalTargetGeometryPresent:
      Object.hasOwn(design.crossSection, 'utilities'),
    disposition: 'NO_SEPARATE_SOURCE_BOUND_MATERIAL_CELL_SET',
  },
  drainage: {
    status: design.drainage.status,
    approvedOutfallCount: design.drainage.approvedOutfalls.length,
    disposition: 'COLLECTION_SET_OUT_BUT_NO_SOURCE_BOUND_PHYSICAL_OUTFALL_PACKAGE',
  },
  dataDistrictInterchange: {
    status: design.interfaces.dataDistrictCrossroad.status,
    disposition: 'STRUCTURAL_DESIGN_HOLD_NO_PHYSICAL_PACKAGE',
  },
};
invariant(modeReadiness.passengerRail.staging === 'EMPTY_RESERVE_FIRST'
  && modeReadiness.passengerRail.frozenMaterialCellCount === 0
  && modeReadiness.pedestrian.separateFrozenPhysicalTargetGeometryPresent === false
  && modeReadiness.utilities.separateFrozenPhysicalTargetGeometryPresent === false
  && modeReadiness.drainage.approvedOutfallCount === 0,
'an independently materialized non-highway C1 package now exists');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'BLOCKED_NO_SOURCE_PROVEN_UNHELD_R11G_PHYSICAL_SCOPE',
  mode: 'READ_ONLY_RESIDUAL_SCOPE_SCREEN',
  releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
  terminalSource: {
    ledgerPath: TERMINAL_LEDGER_PATH,
    ledgerSha256: EXPECTED.terminalLedgerSha256,
    completedReleaseIdentitySha256: EXPECTED.terminalCompletedReleaseIdentitySha256,
    postSnapshotRoot: terminalLedger.postSnapshot.root,
    postCompleteSaveSha256: EXPECTED.terminalCompleteSaveSha256,
    postRegionSha256: EXPECTED.terminalRegionSha256,
    independentPostQaPath: TERMINAL_QA_PATH,
    independentPostQaSha256: EXPECTED.terminalQaSha256,
    independentPostQaPayloadSha256: EXPECTED.terminalQaPayloadSha256,
  },
  design: {
    path: DESIGN_PATH,
    sha256: EXPECTED.designSha256,
    stationCount: stations.length,
    treatmentRunCount: runs.length,
    treatmentCensus,
  },
  acceptedHighwayReleases: acceptedReleases,
  residual: {
    atGradeRunCount: atGradeRuns.length,
    acceptedAtGradeStationCount,
    remainingAtGradeRunCount: remainingAtGrade.length,
    remainingAtGradeStationCount,
    unheldSourceProvenAtGradeRunCount: 0,
    nonAtGradeHoldRunCount: nonAtGradeRuns.length,
    nonAtGradeHoldStationCount,
    nonAtGradeHolds: nonAtGradeRuns,
    remainingAtGrade,
  },
  modeReadiness,
  decision: {
    releaseManifestEmitted: false,
    operationPackageCount: 0,
    wrapperPrintPlanApplicable: false,
    nextRequiredEvidence:
      'Resolve one exact local hydraulic/foundation/sheep/treatment interface or freeze a distinct non-highway physical material-cell design before compiling R11G.',
    emptyPackageProhibited: true,
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const residualScreenPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, residualScreenPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: OUT_PATH,
  residualScreenPayloadSha256,
  acceptedAtGradeStationCount,
  remainingAtGradeStationCount,
  remainingAtGradeRanges: remainingAtGrade.map(({ key, disposition }) => ({ key, disposition })),
  nonAtGradeHoldStationCount,
  releaseManifestEmitted: false,
  liveCallsPerformed: false,
}, null, 2));
