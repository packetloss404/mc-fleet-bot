#!/usr/bin/env node
/**
 * Reconcile reusable Combined Zones R00 evidence into a read-only candidate
 * closure worklist. This compiler never creates accepted state, owner
 * acceptance, interface acceptance, operations, or world-edit authority.
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

const GENERATED_AT = value('--generated-at', '2026-08-06T22:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-r00-candidate-closure.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-r00-candidate-closure.md',
));

const INPUTS = Object.freeze({
  r00: 'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
  g05: 'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  completeSaveScope: 'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  technicalRefresh: 'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.json',
  composite: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
});

const ROLES = Object.freeze({
  r00: 'current seven-gate readiness truth source',
  g05: 'completed Layer-A physical geometry audit and Layer-B worklist',
  registry: 'proposed owner and directional interface registry',
  completeSave: 'accepted immutable complete-save identity',
  completeSaveScope: 'complete-save source-equivalence and scoped census',
  technicalRefresh: 'additive stale-source closure supplement',
  composite: 'hash-bound shipwreck composite geometry integration',
  layerBClosure: 'additive Layer B closure record for all 161 contracts',
  externalAcceptance: 'EXT-01..04 sole-owner acceptance submissions',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`Candidate closure rejected: ${message}`);
}

function canonicalJson(input) {
  if (input === null || typeof input !== 'object') return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(input).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(input[key])}`
  )).join(',')}}`;
}

const inputs = Object.fromEntries(
  Object.entries(INPUTS).map(([key, filename]) => [key, readJson(filename)]),
);
const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, filename]) => [key, binding(filename, ROLES[key])]),
);

const completeSaveIdentity = inputs.completeSave.packageIdentity?.completeSaveSha256;
invariant(inputs.completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  'accepted complete-save status drift');
invariant(completeSaveIdentity === inputs.r00.summary.completeSaveSha256,
  'R00 and complete-save identities differ');
invariant(inputs.completeSaveScope.completeSaveScopeEvidence?.completeSaveEvidenceEstablished === true,
  'complete-save scope evidence is not established');
invariant(inputs.g05.layerA?.passed === true, 'G05 Layer-A geometry is not passing');
invariant(inputs.registry.proposedDirectionalInterfaceRegistry?.contractCount === 161,
  'interface registry contract count drift');

const contracts = inputs.registry.proposedDirectionalInterfaceRegistry.contracts;
const exactGeometry = contracts.filter((contract) => (
  contract.interfaceCellSet?.coordinateSetSha256
));
const sourceBackedExactGeometry = exactGeometry.filter((contract) => (
  typeof contract.interfaceCellSet?.source === 'string'
  && contract.interfaceCellSet.source.length > 0
));
const hashOnlyExactGeometry = exactGeometry.filter((contract) => (
  !sourceBackedExactGeometry.includes(contract)
));
const nullGeometry = contracts.filter((contract) => (
  !contract.interfaceCellSet?.coordinateSetSha256
));
const existingPairs = contracts.filter((contract) => contract.transitionPairManifestSha256);
const missingPairs = contracts.filter((contract) => (
  !contract.transitionPairManifestSha256
  && contract.interfaceCellSet?.coordinateSetSha256
));
const sourceBackedMissingPairs = missingPairs.filter((contract) => (
  typeof contract.interfaceCellSet?.source === 'string'
  && contract.interfaceCellSet.source.length > 0
));
const allMissingPairs = contracts.filter((contract) => !contract.transitionPairManifestSha256);
const existingBeforeStates = contracts.filter((contract) => contract.beforeStateSetSha256);
const existingFutureStates = contracts.filter((contract) => contract.futureStateSetSha256);
const acceptedContracts = contracts.filter((contract) => contract.accepted === true);

invariant(exactGeometry.length === 148, 'exact geometry count drift');
invariant(sourceBackedExactGeometry.length === 23, 'source-backed exact geometry count drift');
invariant(hashOnlyExactGeometry.length === 125, 'hash-only exact geometry count drift');
invariant(nullGeometry.length === 13, 'null endpoint count drift');
invariant(existingPairs.length === 109, 'existing pair-manifest count drift');
invariant(allMissingPairs.length === 52, 'missing pair-manifest count drift');
invariant(existingBeforeStates.length === 0 && existingFutureStates.length === 0,
  'unexpected accepted interface state hashes appeared');
invariant(acceptedContracts.length === 0, 'candidate closure must not inherit acceptance');

// The additive Layer B closure and EXT acceptance record supersede the
// external worklists this pass previously proposed.
const closedByAdditiveRecord = inputs.layerBClosure.status
    === 'PASS_LAYER_B_CLOSED_ADDITIVE_RECORD_REGISTRY_UNMODIFIED'
  && inputs.layerBClosure.closureSummary?.closedContractCount === contracts.length
  && inputs.externalAcceptance.status === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE'
  && inputs.r00.summary?.r00Ready === true;

const candidateBeforeStateDerivations = sourceBackedExactGeometry.map((contract) => ({
  contractId: contract.contractId,
  coordinateSetSha256: contract.interfaceCellSet.coordinateSetSha256,
  source: completeSaveIdentity,
  status: 'PROPOSED_BEFORE_STATE_DERIVATION_ELIGIBLE_NOT_EXECUTED',
}));

const candidateTransitionManifests = sourceBackedMissingPairs.map((contract) => ({
  contractId: contract.contractId,
  coordinateSetSha256: contract.interfaceCellSet.coordinateSetSha256,
  status: 'PROPOSED_TRANSITION_MANIFEST_DERIVATION_ELIGIBLE_NOT_EXECUTED',
}));

const unresolved = [
  {
    id: 'R00-CLOSURE-NULL-ENDPOINT-GEOMETRY',
    count: nullGeometry.length,
    status: 'EXTERNAL_EVIDENCE_REQUIRED',
    contractIds: nullGeometry.map(({ contractId }) => contractId),
    reason: 'Existing catalog and registry contain no exact endpoint geometry; coordinates cannot be invented.',
  },
  {
    id: 'R00-CLOSURE-FUTURE-STATE-AUTHORING',
    count: contracts.length,
    status: 'EXTERNAL_TECHNICAL_INPUT_REQUIRED',
    reason: 'No interface future-state hashes are present; proposal geometry is not an accepted designed future state.',
  },
  {
    id: 'R00-CLOSURE-HASH-ONLY-UPSTREAM-REGENERATION',
    count: hashOnlyExactGeometry.length,
    status: 'OFFLINE_REGENERATION_REQUIRED',
    reason: 'These exact cellsets are hash-only registry outputs with no inline source pointer; regeneration would require rerunning upstream compilers.',
  },
  {
    id: 'R00-CLOSURE-OWNER-INTERFACE-ACCEPTANCE',
    count: contracts.length,
    status: 'EXTERNAL_ACCEPTANCE_REQUIRED',
    reason: 'The registry is proposal-only and has zero accepted contracts; this compiler cannot self-accept it.',
  },
  {
    id: 'R00-CLOSURE-G06-REAL-CLIENT-MECHANIC',
    count: 1,
    status: 'EXTERNAL_RUNTIME_EVIDENCE_REQUIRED',
    reason: 'Paper serialization is proven, but no real-client break/transport/place/NBT event sequence is proven.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-r00-candidate-closure',
  generatedAtUtc: GENERATED_AT,
  status: closedByAdditiveRecord
    ? 'READ_ONLY_CANDIDATE_CLOSURE_SUPERSEDED_BY_RECORDED_ACCEPTANCE_AND_ADDITIVE_CLOSURE'
    : 'READ_ONLY_CANDIDATE_CLOSURE_EXTERNAL_EVIDENCE_REMAINS',
  closureSupersession: closedByAdditiveRecord ? {
    layerBClosureReportIdentitySha256: inputs.layerBClosure.reportIdentitySha256,
    externalAcceptanceReportIdentitySha256: inputs.externalAcceptance.reportIdentitySha256,
    unresolvedWorklistsSuperseded: true,
  } : null,
  purpose: 'Reuse and reconcile existing immutable evidence into the smallest proposed R00 closure worklist.',
  sourceBindings,
  completeSaveIdentity: {
    completeSaveSha256: completeSaveIdentity,
    regionFileCount: inputs.completeSave.summary.regionFileCount,
    entityFileCount: inputs.completeSave.summary.entityFileCount,
    poiFileCount: inputs.completeSave.summary.poiFileCount,
    levelDatPresent: inputs.completeSave.summary.levelDatPresent,
    sourceEquivalent: inputs.completeSaveScope.completeSaveScopeEvidence.projectScopeSourceEquivalent === true,
  },
  reusableEvidence: {
    g05LayerAPassed: inputs.g05.layerA.passed,
    physicalDirectionalContractCount: inputs.g05.layerA.exactDirectionalAdjacencyContractCount,
    physicalDirectionalPairCount: inputs.g05.layerA.exactDirectionalAdjacencyPairCount,
    exactInterfaceGeometryCount: exactGeometry.length,
    sourceBackedExactGeometryCount: sourceBackedExactGeometry.length,
    hashOnlyExactGeometryCount: hashOnlyExactGeometry.length,
    existingTransitionPairManifestCount: existingPairs.length,
    sourceBackedMissingTransitionPairManifestCount: sourceBackedMissingPairs.length,
    upstreamMissingTransitionPairManifestCount: missingPairs.length - sourceBackedMissingPairs.length,
    technicalSourceRefreshStaleRowPassCount: inputs.technicalRefresh.summary.staleSourceRowPassCount,
    shipwreckCompositeCanonicalIntegrationComplete:
      inputs.composite.compositeCanonicalModel?.compositeCanonicalPayloadSha256
        === inputs.r00.summary.shipwreckCompositeCanonicalPayloadSha256
      && inputs.composite.compositeCanonicalModel?.immutableBaselineRewritten === false,
  },
  candidateDerivations: {
    beforeState: {
      eligibleCount: candidateBeforeStateDerivations.length,
      upstreamRegenerationRequiredCount: hashOnlyExactGeometry.length,
      sourceIdentity: completeSaveIdentity,
      status: 'PROPOSED_NOT_EXECUTED_OR_ACCEPTED',
      contracts: candidateBeforeStateDerivations,
    },
    transitionManifest: {
      eligibleCount: candidateTransitionManifests.length,
      upstreamRegenerationRequiredCount: missingPairs.length - sourceBackedMissingPairs.length,
      status: 'PROPOSED_NOT_EXECUTED_OR_ACCEPTED',
      contracts: candidateTransitionManifests,
    },
    futureState: {
      eligibleCount: 0,
      requiredAuthoringCount: contracts.length,
      status: 'NO_EXISTING_HASHES_REUSED',
    },
  },
  unresolved: closedByAdditiveRecord
    ? unresolved.map((item) => ({
      ...item,
      status: 'SUPERSEDED_BY_RECORDED_ACCEPTANCE_AND_ADDITIVE_CLOSURE',
    }))
    : unresolved,
  summary: {
    totalInterfaceContractCount: contracts.length,
    exactGeometryCount: exactGeometry.length,
    sourceBackedExactGeometryCount: sourceBackedExactGeometry.length,
    hashOnlyExactGeometryCount: hashOnlyExactGeometry.length,
    nullGeometryCount: nullGeometry.length,
    existingTransitionPairManifestCount: existingPairs.length,
    missingTransitionPairManifestCount: allMissingPairs.length,
    sourceBackedMissingTransitionPairManifestCount: sourceBackedMissingPairs.length,
    upstreamMissingTransitionPairManifestCount: missingPairs.length - sourceBackedMissingPairs.length,
    candidateBeforeStateDerivationCount: candidateBeforeStateDerivations.length,
    missingFutureStateHashCount: contracts.length,
    acceptedContractCount: acceptedContracts.length,
    ownerRecordCount: inputs.registry.proposedOwnerRegistry.proposedOwnerRecordCount,
    acceptedOwnerRecordCount: inputs.registry.proposedOwnerRegistry.acceptedOwnerRecordCount,
    externalUnresolvedWorkItemCount: closedByAdditiveRecord ? 0 : unresolved.length,
    supersededWorkItemCount: closedByAdditiveRecord ? unresolved.length : 0,
    r00Ready: inputs.r00.summary?.r00Ready === true,
    buildAuthorized: false,
    worldEditAuthorized: false,
  },
  safetyBoundary: {
    readOnly: true,
    operationCount: 0,
    worldEditAuthorized: false,
    productionContacted: false,
    acceptanceClaimed: false,
  },
  disposition: 'Use this report to prepare one compact technical/owner review packet; do not treat candidates as gate evidence until independently generated and accepted.',
};

report.reportIdentitySha256 = sha256(`${canonicalJson(report)}\n`);

const markdown = `# Combined Zones R00 Candidate Closure\n\nStatus: **${report.status}**\n\nThis is a read-only evidence-reuse pass. It does not create accepted states, owners, interfaces, operations, or world-edit authority.\n\n## Reusable evidence\n\n- Accepted complete-save: \`${completeSaveIdentity}\` (${report.completeSaveIdentity.regionFileCount} region, ${report.completeSaveIdentity.entityFileCount} entity, ${report.completeSaveIdentity.poiFileCount} POI files, level.dat present).\n- G05 Layer A: **PASS**, ${report.reusableEvidence.physicalDirectionalContractCount} directional contracts and ${report.reusableEvidence.physicalDirectionalPairCount} pairs.\n- Exact interface geometry already present: **${exactGeometry.length}** of ${contracts.length}; directly source-backed: **${sourceBackedExactGeometry.length}**; hash-only upstream outputs: **${hashOnlyExactGeometry.length}**.\n- Existing transition-pair manifests: **${existingPairs.length}**; directly source-backed missing manifests: **${sourceBackedMissingPairs.length}**; upstream regeneration required: **${missingPairs.length - sourceBackedMissingPairs.length}**.\n- Proposed before-state derivations directly eligible from the immutable save: **${candidateBeforeStateDerivations.length}**.\n\n## Irreducible holds\n\n- **${nullGeometry.length}** endpoint interfaces have no exact geometry in the existing catalog or registry.\n- All **${contracts.length}** future-state hashes are absent and require technical authoring; proposal geometry is not acceptance.\n- All **${contracts.length}** interface contracts and all ${report.summary.ownerRecordCount} owner records remain unaccepted.\n- D06 still needs a real-client break/transport/place/NBT sequence.\n\n## Result\n\n${closedByAdditiveRecord ? 'The worklists this pass proposed are superseded: the EXT-01..04 sole-owner acceptance record and the additive Layer B closure resolve them, and the refreshed R00 audit reports all seven gates PASS.' : 'The data-reuse pass reduces the directly actionable offline work, but it does not make R00 build- or release-ready.'}\n\n- R00 ready: **${report.summary.r00Ready ? 'YES' : 'NO'}**\n- Project build authorized by this pass: **NO**\n- World edits authorized: **NO**\n- Report identity: \`${report.reportIdentitySha256}\`\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  reportIdentitySha256: report.reportIdentitySha256,
  summary: report.summary,
  out: OUTPUT,
  markdown: MARKDOWN,
}, null, 2));
