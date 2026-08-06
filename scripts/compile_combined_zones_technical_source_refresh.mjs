#!/usr/bin/env node
/**
 * Compile an additive, read-only refresh for Combined Zones technical records
 * that predate the accepted complete saved-world capture.
 *
 * The supplement deliberately does not rewrite the historical design chain.
 * It closes only stale source-completeness rows for scopes that the accepted
 * complete-save audit independently proves source-equivalent and clear. It
 * also reconciles D06 commissioning with the release lifecycle: frozen test
 * specifications are pre-R00 design evidence; executed results are G17
 * post-release evidence. No technical, owner, interface, or life-safety
 * acceptance is inferred.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-06T07:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.md',
));

const INPUTS = Object.freeze({
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  completeSave:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  completeSaveScope:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  d02: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  b09: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  b12: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  d06: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06Detailed:
    'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
});

const ROLES = Object.freeze({
  releaseContract: 'authoritative pre-R00 versus post-release evidence boundary',
  completeSave: 'accepted immutable same-moment saved-world identity',
  completeSaveScope: 'source-equivalent proposal-domain entity, POI, and all-start audit',
  d02: 'legacy D02 technical matrix with stale source-completeness row',
  b09: 'legacy B09 proposal with stale complete-save all-start row',
  b11: 'legacy B11 proposal with stale complete-save and entity-clearance row',
  b12: 'legacy B12 candidate with stale complete-save row',
  d06: 'legacy D06 technical matrix and 29 frozen commissioning specifications',
  d06Detailed: 'legacy D06 detailed setout with combined source/POI and commissioning holds',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`Combined Zones technical source refresh rejected: ${message}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function canonicalJson(input) {
  if (input === null || typeof input !== 'object') return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(input).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(input[key])}`
  )).join(',')}}`;
}

const releaseContract = readJson(INPUTS.releaseContract);
const completeSave = readJson(INPUTS.completeSave);
const completeSaveScope = readJson(INPUTS.completeSaveScope);
const d02 = readJson(INPUTS.d02);
const b09 = readJson(INPUTS.b09);
const b11 = readJson(INPUTS.b11);
const b12 = readJson(INPUTS.b12);
const d06 = readJson(INPUTS.d06);
const d06Detailed = readJson(INPUTS.d06Detailed);

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, sourcePath]) => [
  key,
  binding(sourcePath, ROLES[key]),
]));

invariant(completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  'accepted complete-save status drift');
invariant(completeSave.summary?.passed === true
  && completeSave.summary?.regionFileCount === 51
  && completeSave.summary?.entityFileCount === 42
  && completeSave.summary?.poiFileCount === 35
  && completeSave.summary?.levelDatPresent === true
  && completeSave.summary?.captureManifestValid === true,
'accepted complete-save component census drift');
invariant(completeSave.packageIdentity?.completeSaveSha256
  === '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
'accepted complete-save identity drift');
invariant(completeSaveScope.completeSaveScopeEvidence?.completeSaveEvidenceEstablished === true
  && completeSaveScope.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true
  && completeSaveScope.completeSaveScopeEvidence?.generatedStartCensusSourceEquivalent === true,
'complete-save project-scope equivalence is not established');
invariant(completeSaveScope.completeSaveContext?.completeSaveSha256
  === completeSave.packageIdentity.completeSaveSha256,
'complete-save identity drift across intake and scoped audit');

const d02LegacyRow = d02.technicalDevelopmentPayload?.acceptanceMatrix
  ?.find(({ id }) => id === 'D02-TD-07-COMPLETE-SAVE');
const b09LegacyBlocker = b09.genuineResidualBlockers
  ?.find(({ id }) => id === 'B09-NULL-08-COMPLETE-SAVE-ALL-START-ENTITY-POI-GATE');
const b11LegacyHold = b11.nullTechnicalDesignAndRetainedHolds
  ?.find(({ id }) => id === 'P1-B11-H07-COMPLETE-SAVE-AND-ENTITY-CLEARANCE');
const b12LegacyHold = b12.retainedHolds
  ?.find(({ id }) => id === 'P1-B12-H01-COMPLETE-SAVE');
const d06LegacyRow = d06.mechanismDevelopmentPayload?.acceptanceMatrix
  ?.find(({ id }) => id === 'D06-MC-11-COMPLETE-SAVE');
const d06LegacyCommissioningRow = d06.mechanismDevelopmentPayload?.acceptanceMatrix
  ?.find(({ id }) => id === 'D06-MC-23-COMMISSIONING');
const d06LegacyH08 = d06Detailed.nullHeldSystems
  ?.find(({ id }) => id === 'D06-SET-H08-COMPLETE-SAVE-ENTITY-POI-ALL-START');
const d06LegacyH09 = d06Detailed.nullHeldSystems
  ?.find(({ id }) => id
    === 'D06-SET-H09-OWNER-INTERFACE-TECHNICAL-ACCEPTANCE-AND-COMMISSIONING');

for (const [label, record] of Object.entries({
  d02LegacyRow,
  b09LegacyBlocker,
  b11LegacyHold,
  b12LegacyHold,
  d06LegacyRow,
  d06LegacyCommissioningRow,
  d06LegacyH08,
  d06LegacyH09,
})) {
  invariant(record, `${label} missing`);
}
invariant(d02LegacyRow.result === 'HOLD' && d06LegacyRow.result === 'HOLD',
  'legacy complete-save rows are no longer stale HOLDs; refresh requires review');
invariant(b09LegacyBlocker.status === 'HOLD_COMPLETE_SAVE'
  && b11LegacyHold.status === 'HOLD' && b12LegacyHold.status === 'HOLD',
'legacy scoped complete-save hold status drift');

function scopeConflicts(scopeId, family) {
  const records = completeSaveScope.completeSaveScopeEvidence.intersections[family];
  return records.filter(({ domainIds = [] }) => domainIds.some(
    (domainId) => domainId.startsWith(`${scopeId}/`),
  ));
}

function scopeRecord(scopeId, effectiveRowId, effectiveResult, expectedCounts) {
  const domains = completeSaveScope.domainSummary
    .filter((record) => record.scopeId === scopeId)
    .sort((left, right) => left.domain.localeCompare(right.domain));
  invariant(domains.length === 3, `${scopeId} must have three exact proposal domains`);
  for (const domain of domains) {
    invariant(domain.sourceCellCount === expectedCounts[domain.domain],
      `${domain.domainId} source cell-count drift`);
    invariant(domain.accepted === false,
      `${domain.domainId} must remain an unaccepted proposal`);
    const allStart = completeSaveScope.generatedStartAudits.find(
      (record) => record.domainId === domain.domainId,
    );
    invariant(allStart?.subjectCount === 114 && allStart?.exactZeroSubjectCount === 114
      && allStart?.overlapSubjectCount === 0 && allStart?.overlapCellCount === 0,
    `${domain.domainId} all-start clearance drift`);
  }
  const entityConflicts = scopeConflicts(scopeId, 'entityConflictRecords');
  const poiConflicts = scopeConflicts(scopeId, 'poiConflictRecords');
  return {
    scopeId,
    sourceEquivalent: true,
    exactDomainCount: domains.length,
    generatedStartSubjectCountPerDomain: 114,
    generatedStartOverlapCellCount: 0,
    entityConflictCount: entityConflicts.length,
    poiConflictCount: poiConflicts.length,
    domainIdentities: domains.map((domain) => ({
      domainId: domain.domainId,
      cellCount: domain.sourceCellCount,
      coordinateSetSha256: domain.sourceCoordinateSetSha256 ?? null,
      intervalManifestSha256: domain.sourceIntervalManifestSha256 ?? null,
    })),
    effectiveRow: {
      id: effectiveRowId,
      result: effectiveResult,
      evidenceIdentity: completeSave.packageIdentity.completeSaveSha256,
      technicalAcceptanceClaimed: false,
    },
  };
}

const d02Refresh = scopeRecord(
  'D02',
  'D02-TD-07-COMPLETE-SAVE',
  'PASS_COMPLETE_SAVE_AND_SCOPED_SOURCE_CLEARANCE',
  { construction: 432, interaction: 432, influence: 456 },
);
const b09Refresh = scopeRecord(
  'P1-B09',
  'B09-NULL-08-COMPLETE-SAVE-ALL-START-ENTITY-POI-GATE',
  'PASS_COMPLETE_SAVE_ALL_START_ENTITY_POI_CLEARANCE',
  { construction: 7_800, interaction: 7_800, influence: 20_430 },
);
const b11Refresh = scopeRecord(
  'P1-B11',
  'P1-B11-H07-COMPLETE-SAVE-AND-ENTITY-CLEARANCE',
  'PASS_COMPLETE_SAVE_AND_SCOPED_ENTITY_POI_CLEARANCE',
  { construction: 2_392, interaction: 11_960, influence: 5_980 },
);
const b12Refresh = scopeRecord(
  'P1-B12',
  'P1-B12-H01-COMPLETE-SAVE',
  'PASS_COMPLETE_SAVE_AND_SCOPED_ENTITY_POI_CLEARANCE',
  { construction: 7_440, interaction: 19_136, influence: 30_732 },
);

for (const record of [d02Refresh, b09Refresh, b11Refresh, b12Refresh]) {
  invariant(record.entityConflictCount === 0 && record.poiConflictCount === 0,
    `${record.scopeId} scoped entity/POI clearance is not exact zero`);
}

const d06ReservationRefresh = scopeRecord(
  'D06-RESERVATIONS',
  'D06-SET-H08-COMPLETE-SAVE-ENTITY-POI-ALL-START',
  'COMPLETE_SAVE_PASS_PERSISTENT_D06_POI_HOLD',
  { construction: 19_836, interaction: 25_310, influence: 25_310 },
);
const d06MechanismRefresh = scopeRecord(
  'D06-MECHANISMS',
  'D06-MC-11-COMPLETE-SAVE',
  'PASS_COMPLETE_SAVE_SOURCE_COMPLETENESS',
  { construction: 9_065, interaction: 9_065, influence: 9_065 },
);
invariant(d06ReservationRefresh.entityConflictCount === 0
  && d06ReservationRefresh.poiConflictCount === 1
  && d06MechanismRefresh.entityConflictCount === 0
  && d06MechanismRefresh.poiConflictCount === 1,
'D06 persistent POI boundary drift');

const d06Poi = scopeConflicts('D06-MECHANISMS', 'poiConflictRecords')[0];
invariant(d06Poi.poiType === 'minecraft:bee_nest'
  && d06Poi.blockPosition?.x === 1849
  && d06Poi.blockPosition?.y === 66
  && d06Poi.blockPosition?.z === 145
  && d06Poi.sourceStateEvidence?.colonyMemberCount === 3,
'D06 occupied bee-nest evidence drift');

const g02Definition = releaseContract.gateDefinitions
  .find(({ id }) => id === 'G02_DESIGN_DECISIONS');
const g17Definition = releaseContract.gateDefinitions
  .find(({ id }) => id === 'G17_FUNCTIONAL_POST_QA');
invariant(g02Definition?.stage === 'design' && g17Definition?.stage === 'postrelease',
  'G02/G17 lifecycle stage drift');
invariant(releaseContract.decisionResolutionBoundary?.descendantReleaseEvidenceMayResolveG02
  === false
  && releaseContract.decisionResolutionBoundary?.forbiddenG02Evidence
    ?.includes('post-state QA'),
'G02 descendant-evidence prohibition drift');

const commissioningTests = d06.mechanismDevelopmentPayload.commissioningTestRegister;
invariant(commissioningTests.length === 29, 'expected 29 D06 commissioning specifications');
const commissioningIds = new Set();
for (const test of commissioningTests) {
  invariant(typeof test.id === 'string' && !commissioningIds.has(test.id),
    `duplicate or missing commissioning specification id ${test.id}`);
  commissioningIds.add(test.id);
  invariant(test.classification === 'OFFLINE_COMMISSIONING_CONTRACT_ONLY'
    && typeof test.systemId === 'string'
    && typeof test.failureStimulus === 'string' && test.failureStimulus.length > 0
    && typeof test.requiredResult === 'string' && test.requiredResult.length > 0
    && typeof test.evidenceRequired === 'string' && test.evidenceRequired.length > 0
    && test.operation === null,
  `commissioning specification ${test.id} is not a complete non-executable design contract`);
}

const commissioningLifecycle = {
  authoritativeBoundary: {
    g02GateId: g02Definition.id,
    g02Stage: g02Definition.stage,
    g17GateId: g17Definition.id,
    g17Stage: g17Definition.stage,
    postBuildResultsMayResolveG02: false,
  },
  preR00DesignEvidence: {
    commissioningSpecificationCount: commissioningTests.length,
    uniqueSpecificationCount: commissioningIds.size,
    structurallyCompleteSpecificationCount: commissioningTests.length,
    operationCount: 0,
    specificationSetFrozen: true,
    specificationSetTechnicallyAccepted: false,
    effectiveD06Mc23: {
      id: 'D06-MC-23-COMMISSIONING-DESIGN',
      result: 'HOLD_COMMISSIONING_DESIGN_TECHNICAL_ACCEPTANCE_REQUIRED',
      passRule: 'All 29 frozen test specifications are independently reviewed and accepted against the same immutable D06 technical identity.',
    },
    effectiveD06SetH09: {
      id: d06LegacyH09.id,
      result: 'HOLD_OWNER_INTERFACE_TECHNICAL_AND_COMMISSIONING_DESIGN_ACCEPTANCE',
      passRule: 'Accept one-owner assignments, exact directional interfaces, independent technical review, and the 29 frozen commissioning specifications against one immutable D06 identity.',
    },
  },
  postBuildEvidence: {
    gateId: g17Definition.id,
    executedResultCount: 0,
    requiredBeforeR00: false,
    currentResult: 'DEFERRED_TO_G17_AFTER_SEPARATELY_AUTHORIZED_PHYSICAL_RELEASE',
  },
  legacyCycleRemoved: true,
  technicalAcceptanceClaimed: false,
  commissioningPassed: false,
};

const payload = {
  refreshMode: 'ADDITIVE_HASH_BOUND_SUPPLEMENT_NO_HISTORICAL_ARTIFACT_REWRITE',
  completeSaveIdentity: {
    completeSaveSha256: completeSave.packageIdentity.completeSaveSha256,
    canonicalInventorySha256: completeSave.packageIdentity.canonicalInventorySha256,
    captureManifestSha256: completeSave.packageIdentity.captureManifestSha256,
    regionFileCount: completeSave.summary.regionFileCount,
    entityFileCount: completeSave.summary.entityFileCount,
    poiFileCount: completeSave.summary.poiFileCount,
    levelDatPresent: completeSave.summary.levelDatPresent,
    projectScopeSourceEquivalent: true,
    generatedStartCensusSourceEquivalent: true,
  },
  scopedRefreshes: [
    {
      ...d02Refresh,
      legacyResult: d02LegacyRow.result,
      remainingD02TechnicalHoldCount: 10,
    },
    {
      ...b09Refresh,
      legacyResult: b09LegacyBlocker.status,
      remainingB09TechnicalSystemHoldCount: 7,
    },
    {
      ...b11Refresh,
      legacyResult: b11LegacyHold.status,
      remainingB11TechnicalHoldCount: 7,
      physicalCompilerAndReleaseDeferred: true,
    },
    {
      ...b12Refresh,
      legacyResult: b12LegacyHold.status,
      remainingB12TechnicalHoldCount: 6,
      physicalCompilerAndReleaseDeferred: true,
    },
    {
      scopeId: 'D06',
      completeSaveSourceRow: {
        ...d06MechanismRefresh.effectiveRow,
        legacyResult: d06LegacyRow.result,
      },
      detailedClearanceRow: {
        ...d06ReservationRefresh.effectiveRow,
        legacyResult: d06LegacyH08.status,
      },
      exactReservationDomainCount: d06ReservationRefresh.exactDomainCount,
      exactMechanismDomainCount: d06MechanismRefresh.exactDomainCount,
      generatedStartOverlapCellCount: 0,
      entityConflictCount: 0,
      poiConflictCount: 1,
      persistentPoi: {
        evidenceId: d06Poi.evidenceId,
        poiType: d06Poi.poiType,
        blockPosition: d06Poi.blockPosition,
        colonyMemberCount: d06Poi.sourceStateEvidence.colonyMemberCount,
        sourceStateProjectionSha256:
          d06Poi.sourceStateEvidence.sourceStateProjectionSha256,
      },
      technicalAcceptanceClaimed: false,
    },
  ],
  commissioningLifecycle,
  retainedBoundaries: {
    d02TechnicalAcceptanceRequired: true,
    b09MechanismHydrologyGeotechnicalLifeSafetyAcceptanceRequired: true,
    b11MaterialEarthworkDrainageUtilitiesStructureGeotechnicalAcceptanceRequired: true,
    b12StructureHydrologyUtilitiesD06OwnerInterfaceGlobalAuditRequired: true,
    d06PersistentPoiTreatmentRequired: true,
    d06MechanismLifeSafetyOwnerInterfaceTechnicalAcceptanceRequired: true,
    g02Passed: false,
    g07Passed: false,
    r00Passed: false,
  },
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-technical-source-refresh',
  generatedAtUtc: GENERATED_AT,
  status:
    'PARTIAL_PASS_FIVE_STALE_SOURCE_ROWS_CLOSED_D06_PERSISTENT_POI_AND_TECHNICAL_ACCEPTANCE_HOLD',
  purpose: 'Bind the accepted complete save to stale technical source rows and remove the D06 pre-R00/post-build commissioning cycle without self-acceptance.',
  sourceBindings,
  ...payload,
  summary: {
    staleSourceRowPassCount: 5,
    exactScopedDomainCount: 15,
    exactScopedGeneratedStartEvaluationCount: 15 * 114,
    clearedScopeCount: 4,
    d06CompleteSaveSourceRowPassed: true,
    d06PersistentPoiHoldCount: 1,
    commissioningSpecificationCount: commissioningTests.length,
    commissioningSpecificationAcceptedCount: 0,
    commissioningExecutedResultCount: 0,
    technicalAcceptanceClaimed: false,
    g02Passed: false,
    g07Passed: false,
    r00Passed: false,
  },
  safetyBoundary: {
    additiveEvidenceOnly: true,
    historicalArtifactRewriteCount: 0,
    productionServerContacted: false,
    productionWorldContacted: false,
    fleetApiContacted: false,
    rconContacted: false,
    systemdContacted: false,
    operationFileCount: 0,
    operationCellCount: 0,
    materialCellCount: 0,
    worldEditAuthorized: false,
    physicalReleaseAuthorized: false,
    executable: false,
  },
  refreshPayloadSha256: sha256(canonicalJson(payload)),
};
report.reportIdentitySha256 = sha256(canonicalJson(report));

const markdown = `# Combined Zones Phase 1 technical source refresh

Status: **${report.status}**

This additive, read-only supplement binds the accepted complete saved-world identity \`${report.completeSaveIdentity.completeSaveSha256}\` to technical records that still referenced the earlier incomplete intake. It does not rewrite those historical artifacts, accept a technical design, or authorize physical work.

## Legitimately closed stale rows

| Scope | Effective row | Result | Entities | POI | Remaining boundary |
|---|---|---|---:|---:|---|
| D02 | D02-TD-07 | PASS complete save and scoped clearance | 0 | 0 | 10 technical rows still HOLD |
| P1-B09 | B09-NULL-08 | PASS complete-save all-start/entity/POI clearance | 0 | 0 | 7 technical systems still HOLD |
| P1-B11 | P1-B11-H07 | PASS complete save and scoped entity/POI clearance | 0 | 0 | material, earthwork, drainage, utilities, structure/geotechnical and acceptance remain HOLD |
| P1-B12 | P1-B12-H01 | PASS complete save and scoped entity/POI clearance | 0 | 0 | structure, hydrology, utilities, D06, owners/interfaces and global audit remain HOLD |
| D06 | D06-MC-11 | PASS source completeness only | 0 | 1 | occupied bee-nest treatment and all functional/technical acceptance remain HOLD |

Every one of the 15 refreshed proposal domains is source-equivalent and has exact-zero overlap against all 114 generated starts. The D06 POI at \`1849,66,145\` is preserved as \`COMPLETE_SAVE_PASS_PERSISTENT_D06_POI_HOLD\`; it contains a three-member colony in the bound evidence.

## D06 commissioning lifecycle

The release contract controls the lifecycle:

- pre-R00/G02 may use the 29 frozen commissioning **specifications** as design evidence only;
- those specifications have no operations and remain technically unaccepted;
- executed functional results are not a G02 prerequisite and are deferred to post-release \`${g17Definition.id}\`;
- D06-MC-23 and D06-SET-H09 therefore remain HOLD on design, technical, owner and interface acceptance—not on pre-R00 production of post-build results.

## Safety boundary

No production service, Minecraft world, RCON, fleet API, systemd unit, operation file, block, entity, owner record, interface acceptance, or release artifact was changed. G02, G07 and R00 remain HOLD.

Refresh payload SHA-256: \`${report.refreshPayloadSha256}\`

Report identity SHA-256: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(`Wrote ${relative(OUTPUT)}`);
console.log(`Wrote ${relative(MARKDOWN)}`);
console.log(report.status);
