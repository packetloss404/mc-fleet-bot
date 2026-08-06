#!/usr/bin/env node
/**
 * Record the sole owner's explicit authorization to treat the recorded
 * Combined Zones shipwreck as a controlled-removal scope in a future guarded
 * release. This freezes a planning disposition only: it emits no block
 * operation and cannot satisfy complete-save, technical, preflight, rollback,
 * live-entity, or physical-release authorization gates.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const ACCEPTED_ON = value('--accepted-on', '2026-08-06');
const RELIC_PATH = value(
  '--relic-evidence',
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
);
const PHASE0_PATH = value(
  '--phase0-evidence',
  'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
);
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.md',
));

const ACTUAL_APPROVAL_TEXT = '3: Shipwreck can be deleted';
const ACCEPTED_BY = 'sole human project owner';
const PAYLOAD_PREAMBLE = 'combined-zones-shipwreck-removal-authorization-v1';

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(`Shipwreck-removal authorization rejected: ${message}`);
}

const relicBytes = fs.readFileSync(absolute(RELIC_PATH));
const relicEvidence = JSON.parse(relicBytes.toString('utf8'));
const phase0Bytes = fs.readFileSync(absolute(PHASE0_PATH));
const phase0Evidence = JSON.parse(phase0Bytes.toString('utf8'));
const shipwreck = relicEvidence.relics?.find(({ key }) => key === 'shipwreck');

assert(/^\d{4}-\d{2}-\d{2}$/.test(ACCEPTED_ON), '--accepted-on must be YYYY-MM-DD');
assert(relicEvidence.schemaVersion === 1
  && relicEvidence.id === 'combined-zones-phase1-protected-relic-clearance',
'protected-relic evidence identity drift');
assert(shipwreck?.structureId === 'minecraft:shipwreck',
  'exact shipwreck record is absent');
assert(shipwreck.observedGeneratedStructureStart?.status === 'PASS_ONE_EXACT_START_RECORD',
  'shipwreck generated-start identity is not exact');
assert(shipwreck.declaredVolumeCellCount === 2268
  && shipwreck.evidenceBackedDefaultDenyCore?.cellCount === 2268
  && shipwreck.evidenceBackedDefaultDenyCore?.coordinateSetSha256
    === '715792eef84d4c3029a5750b0683adef6e0c5447b918512539c0d96f82cd2ee6',
'shipwreck full-core identity drift');
assert(shipwreck.observedSnapshotCensus?.presentCellCount === 1118
  && shipwreck.observedSnapshotCensus?.presentCoordinateSetSha256
    === '87c356ae6562eb2deca5d30c0ac414c39969e91f77a9761f265f023c52fafc1b',
'shipwreck observed-present identity drift');
assert(shipwreck.observedSnapshotCensus?.materialCounts?.['minecraft:chest'] === 3,
  'shipwreck chest census drift');
const sameBounds = (left, right) => (
  ['minX', 'maxX', 'minY', 'maxY', 'minZ', 'maxZ']
    .every((key) => left?.[key] === right?.[key])
);
const shipwreckStartIndex = phase0Evidence.generatedStructureStarts?.findIndex((record) => (
  record.id === shipwreck.structureId
  && record.chunkX === shipwreck.structureStartChunk.x
  && record.chunkZ === shipwreck.structureStartChunk.z
  && sameBounds(record.bounds, shipwreck.declaredInclusiveBounds)
));
assert(shipwreckStartIndex === 37, 'Phase 0 exact shipwreck start index drift');

const authorizationPayload = {
  id: 'combined-zones-phase1-shipwreck-removal-authorization',
  decision: 'AUTHORIZE_SHIPWRECK_AS_CONTROLLED_REMOVAL_SCOPE',
  acceptedBy: ACCEPTED_BY,
  acceptedOnUtcDate: ACCEPTED_ON,
  acceptanceAuthority: {
    source: 'explicit user instruction in the current project conversation',
    additionalHumanDecisionMakersRequired: false,
  },
  actualApprovalText: ACTUAL_APPROVAL_TEXT,
  relicEvidenceBinding: {
    path: RELIC_PATH,
    fileSha256: sha256(relicBytes),
    bytes: relicBytes.length,
    immutableSnapshotSha256:
      relicEvidence.sourceBindings?.immutablePhase0PostRegionSnapshot?.sha256,
  },
  phase0EvidenceBinding: {
    path: PHASE0_PATH,
    fileSha256: sha256(phase0Bytes),
    bytes: phase0Bytes.length,
    generatedStartSubjectId: `GS-${String(shipwreckStartIndex).padStart(3, '0')}`,
  },
  subject: {
    relicKey: shipwreck.key,
    structureId: shipwreck.structureId,
    structureStartChunk: shipwreck.structureStartChunk,
    inclusivePlanningBounds: shipwreck.declaredInclusiveBounds,
    censusAndAttributionSearchEnvelope: {
      representation: shipwreck.evidenceBackedDefaultDenyCore.representation,
      cellCount: shipwreck.evidenceBackedDefaultDenyCore.cellCount,
      coordinateSetSha256:
        shipwreck.evidenceBackedDefaultDenyCore.coordinateSetSha256,
    },
    observedPresentBaseline: {
      cellCount: shipwreck.observedSnapshotCensus.presentCellCount,
      coordinateSetSha256:
        shipwreck.observedSnapshotCensus.presentCoordinateSetSha256,
      blockStateSetSha256:
        shipwreck.observedSnapshotCensus.presentBlockStateSetSha256,
      fullVolumeBlockStateSetSha256:
        shipwreck.observedSnapshotCensus.fullVolumeBlockStateSetSha256,
      chestCount: shipwreck.observedSnapshotCensus.materialCounts['minecraft:chest'],
      packedIceCount:
        shipwreck.observedSnapshotCensus.materialCounts['minecraft:packed_ice'],
      snowCount: shipwreck.observedSnapshotCensus.materialCounts['minecraft:snow'],
    },
    exactAttributedRemovalTargetCellSet: null,
    exactRemovalOperationCellSet: null,
    exactDesiredPostStateCellSet: null,
  },
  acknowledgedKnownCoordinationOverlap: {
    domainId: 'P1-B10/influence',
    generatedStartSubjectId: 'GS-037',
    protectedCoreSubjectId: 'CORE-shipwreck',
    cellCount: 126,
    inclusiveBounds: {
      minX: 2072,
      maxX: 2099,
      minY: 69,
      maxY: 71,
      minZ: -661,
      maxZ: -653,
    },
    coordinateSetSha256:
      '77350225547fce64783a9d3d3d8953631b847a733e9bc060211c13b952df0e98',
    reviewedEvidenceAtDecision: {
      path:
        'docs/masterplans/05-combined-zones/phase1-g06-proposed-clearance-audit.json',
      gitCommit: '3f8931316e3a7c455ec61e43439594a4fd72a362',
      fileSha256:
        '672978fe02baf1d2dadb99dccd9b6af9deeebb4d55318caa37d4dc918addc0fd',
      auditPayloadSha256:
        '44f03ae8531544a233c3f4de0af069617f23929477b3e078be2bbc4bd0640c95',
      reportIdentitySha256:
        '5ae5d187fb8fd750e4b81cea05461ed9ec71990b27001291e881e03f0f11f2fb',
    },
    disposition:
      'OWNER_REMOVAL_POLICY_COVERS_SUBJECT_TECHNICAL_TREATMENT_CONTRACT_PENDING',
  },
  effectivePlanningDisposition: {
    preserveInPlacePolicyRequired: false,
    shipwreckFabricPreservationPolicySuperseded: true,
    controlledRemovalMayBeDesigned: true,
    preserveOrRemoveOwnerChoiceResolved: true,
    exactOverlapMayBeClassifiedAsAcceptedTechnicalTreatment: false,
    separatelyAuthorizedTechnicalTreatmentContractAccepted: false,
    boundingVolumeIsRemovalSet: false,
    currentPresentSetIsRemovalSet: false,
    unattributedCellsRemainDefaultDeny: true,
    packedIceSnowAndNativeTerrainRemainDefaultDeny: true,
    terrainIceSnowAndSupportRemovalAuthorized: false,
    generatedStructureStartMetadataMayBeEditedDirectly: false,
    structureStartRecordRemainsEvidenceAfterBlockRemoval: true,
    futureTerrainOrConstructionStateAccepted: false,
  },
  mandatoryRemovalPackageRequirements: [
    'one complete same-moment saved-world source with region, entities, poi, level.dat, and capture manifest',
    'fresh exact present-cell and block-state census inside the census and attribution search envelope',
    'independent attribution of every proposed shipwreck-fabric target; the full 2,268-cell bound and current 1,118-cell present census are not deletion sets',
    'default preservation of packed ice, snow, native terrain, fluids, air, and every unattributed cell unless an exact reviewed target contract separately enumerates it',
    'block-entity and inventory census for all three currently observed chest positions',
    'salvage chest contents to an exact controlled destination before destructive replacement unless a later explicit hash-bound disposition authorizes discard',
    'exact desired post state for every attributed removal target, including terrain, support, gravity, lighting, fluid, drainage, and neighbor-update review',
    'exact guarded forward operations limited to source-matching attributed cells inside the census and attribution search envelope',
    'exact inverse rollback restoring every pre-removal block state and all required block-entity data',
    'entity, POI, ownership, interface, hydrology, structural, staging, and adjacent-feature clearance against the same source identity',
    'immutable post-state evidence proving removal scope, surrounding-state preservation, rollback eligibility, and final acceptance',
  ],
  safetyBoundary: {
    planningDispositionOnly: true,
    operations: [],
    operationCellCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    liveCallsPerformed: [],
    completeSaveAccepted: false,
    physicalReleaseAuthorized: false,
    worldEditAuthorized: false,
  },
};
const authorizationPayloadSha256 = sha256(
  `${PAYLOAD_PREAMBLE}\n${JSON.stringify(authorizationPayload)}\n`,
);

const report = {
  schemaVersion: 1,
  ...authorizationPayload,
  status: 'OWNER_POLICY_APPROVED_RELEASE_NOT_AUTHORIZED',
  payloadHashPreamble: `${PAYLOAD_PREAMBLE}\\n`,
  authorizationPayload,
  authorizationPayloadSha256,
};

const bounds = shipwreck.declaredInclusiveBounds;
const markdown = `# Combined Zones shipwreck removal authorization\n\n`
  + `Status: **OWNER AUTHORIZED CONTROLLED REMOVAL — PLANNING ONLY — ZERO OPERATIONS**\n\n`
  + `The sole human project owner authorized the recorded shipwreck to be deleted. This changes the shipwreck from a mandatory preservation subject to a controlled-removal planning scope. It does not authorize a live edit or waive any release gate.\n\n`
  + `## Approval evidence\n\n`
  + `> ${ACTUAL_APPROVAL_TEXT}\n\n`
  + `Accepted on UTC date: \`${ACCEPTED_ON}\`\n\n`
  + `Authorization payload SHA-256: \`${authorizationPayloadSha256}\`\n\n`
  + `## Exact authorized planning envelope\n\n`
  + `- Structure: \`${shipwreck.structureId}\`\n`
  + `- Inclusive bounds: \`${bounds.minX}…${bounds.maxX}, ${bounds.minY}…${bounds.maxY}, ${bounds.minZ}…${bounds.maxZ}\`\n`
  + `- Full envelope: **${shipwreck.evidenceBackedDefaultDenyCore.cellCount.toLocaleString('en-US')} cells**, SHA-256 \`${shipwreck.evidenceBackedDefaultDenyCore.coordinateSetSha256}\`\n`
  + `- Observed present baseline: **${shipwreck.observedSnapshotCensus.presentCellCount.toLocaleString('en-US')} cells**, SHA-256 \`${shipwreck.observedSnapshotCensus.presentCoordinateSetSha256}\`\n`
  + `- Observed chests: **${shipwreck.observedSnapshotCensus.materialCounts['minecraft:chest']}**\n\n`
  + `- Current packed ice / snow inside the census: **${shipwreck.observedSnapshotCensus.materialCounts['minecraft:packed_ice']} / ${shipwreck.observedSnapshotCensus.materialCounts['minecraft:snow']}**\n\n`
  + `The currently audited \`P1-B10/influence\` intersection contains **126 cells** with coordinate SHA-256 \`${authorizationPayload.acknowledgedKnownCoordinationOverlap.coordinateSetSha256}\`. The owner policy covers the shipwreck as a removal subject, but the overlap remains a technical-treatment HOLD until an exact attributed removal contract is accepted.\n\n`
  + `The full 2,268-cell envelope is a census and attribution search boundary, not an operation set. The current 1,118 non-air cells are also not a deletion set: they include 515 packed-ice cells, five snow cells, and three chests, and the baseline does not prove attribution. A fresh complete save and independent review must determine the exact source-matching removal targets and desired post states. The generated-start metadata remains evidence and is not directly edited.\n\n`
  + `## Mandatory controlled-removal boundary\n\n`
  + `${authorizationPayload.mandatoryRemovalPackageRequirements.map((item) => `- ${item}`).join('\n')}\n\n`
  + `Until those requirements pass, the shipwreck may be designed for removal but cannot be physically altered. The two igloos remain protected and this decision does not accept mountain materials, support treatment, hydrology, ownership, interfaces, or the Combined Zones release.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  authorizationPayloadSha256,
  censusAndAttributionSearchEnvelopeCellCount:
    report.subject.censusAndAttributionSearchEnvelope.cellCount,
  observedPresentBaselineCellCount: report.subject.observedPresentBaseline.cellCount,
  observedChestCount: report.subject.observedPresentBaseline.chestCount,
  operationCellCount: 0,
  worldEditAuthorized: false,
}, null, 2)}\n`);
