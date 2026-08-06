#!/usr/bin/env node
/**
 * Assemble the non-executing Combined Zones release package.
 *
 * This package binds the exact proposal inputs and the architect-directed
 * fail-closed scope. It intentionally emits no forward/rollback operations
 * until complete block-state mappings and a fresh source snapshot exist.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const INPUTS = Object.freeze({
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  setout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  dispositions: 'docs/masterplans/05-combined-zones/phase1-g05-architectural-endpoint-dispositions.json',
  completeSaveAudit: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
});
const OUTPUT = 'data/buildops/combined-zones-r00-build-package.manifest.json';
const MARKDOWN = 'docs/masterplans/05-combined-zones/phase1-build-package.md';

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function bind(relativePath, role) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  return {
    path: relativePath,
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    role,
  };
}
function invariant(condition, message) { if (!condition) throw new Error(`Build package rejected: ${message}`); }

const releaseContract = readJson(INPUTS.releaseContract);
const setout = readJson(INPUTS.setout);
const registry = readJson(INPUTS.registry);
const dispositions = readJson(INPUTS.dispositions);
const completeSaveAudit = readJson(INPUTS.completeSaveAudit);
invariant(releaseContract.executable === false, 'release contract unexpectedly executable');
invariant(releaseContract.worldEditAuthorized === false, 'release contract authorizes world edits');
invariant(setout.gate?.g03Passed === true, 'G03 setout is not passing');
invariant(dispositions.summary?.endpointCount === 13, 'architectural disposition scope drift');
invariant(completeSaveAudit.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && completeSaveAudit.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
  'authorized complete-save evidence is not passing');

const constructionDomains = [];
for (const scope of setout.scopeRegistry ?? []) {
  if (!scope.construction) continue;
  constructionDomains.push({
    scopeId: scope.scopeId,
    cellCount: scope.construction.cellCount,
    bounds: scope.construction.bounds,
    coordinateSetSha256: scope.construction.coordinateSetSha256,
    sparseIntervalsSha256: scope.construction.sparseIntervals?.intervalManifestSha256 ?? null,
    accepted: scope.construction.accepted === true,
    constructionOwnership: scope.construction.constructionOwnership === true,
    operationAuthorization: scope.construction.operationAuthorization === true,
  });
}

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r00-build-package',
  generatedAtUtc: '2026-08-06T00:00:00Z',
  status: 'PACKAGE_ASSEMBLED_NONEXECUTABLE_BLOCK_STATES_AND_OPERATION_MAPPING_REQUIRED',
  packagePurpose: 'Bind the exact proposal inputs and conservative architect-directed scope before any explicit live build authorization.',
  sourceBindings: Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [
    key,
    bind(filename, `Combined Zones build-package ${key}`),
  ])),
  proposalIdentity: {
    canonicalSetoutPayloadSha256: setout.canonicalPayloadSha256,
    ownershipRegistryPayloadSha256: registry.canonicalPayloadSha256,
    endpointDispositionReportSha256: dispositions.reportIdentitySha256,
  },
  completeSaveEvidence: {
    auditPath: INPUTS.completeSaveAudit,
    completeSaveSha256: completeSaveAudit.packageIdentity.completeSaveSha256,
    captureManifestSha256: completeSaveAudit.packageIdentity.captureManifestSha256,
    capturedAtUtc: completeSaveAudit.capture?.capturedAtUtc ?? '2026-08-06T01:41:38Z',
    sourceRoot: 'data/worldsnap-combined-zones-complete-save-20260806T014133Z',
    immutableMemberCount: completeSaveAudit.summary.requiredMemberCount,
    boundForOfflineAuthoring: true,
  },
  scope: {
    constructionDomainCount: constructionDomains.length,
    constructionDomains,
    unresolvedEndpointCount: dispositions.summary.endpointCount,
    sourceReservationsRetainedClosed: dispositions.summary.sourceReservationsRetainedClosed,
    endpointsExcludedFromBuildScope: dispositions.summary.excludedFromBuildScope,
  },
  operations: {
    forwardOperationPath: null,
    rollbackOperationPath: null,
    operationCount: 0,
    executable: false,
    reason: 'Proposal geometry does not contain complete per-cell desired block states or a forward/rollback mapping. The authorized immutable complete-save is already bound for offline authoring.',
  },
  requiredBeforeBuildAuthorization: [
    'Complete per-cell desired block-state mapping for every construction domain.',
    'The already-authorized immutable complete-save source bound above must remain unchanged for preflight.',
    'Hash-bound forward/rollback operation pair with exact target bijection.',
    'Strict-noop preflight and release authorization artifacts.',
  ],
  publicDocumentationBoundary: {
    readmeModified: false,
    worldShowcaseModified: false,
    masterplanNarrativeModified: false,
    packageDocumentationWritten: true,
  },
  safetyBoundary: {
    worldEditsPerformed: false,
    rconWritesPerformed: false,
    systemdTouched: false,
    operationCellCount: 0,
    liveBuildAuthorization: false,
  },
};
const reportIdentitySha256 = crypto.createHash('sha256')
  .update(JSON.stringify(reportWithoutIdentity)).digest('hex');
const report = { ...reportWithoutIdentity, reportIdentitySha256 };
fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# Combined Zones Phase 1 build package', '',
  `**Status:** ${report.status}`,
  `**Package identity:** \`${reportIdentitySha256}\``, '',
  'This is the hash-bound package assembly requested before live construction. It does not execute and does not contain a forward or rollback operation yet.', '',
  `- Exact G03 construction domains bound: **${constructionDomains.length}**`,
  `- Undefined endpoints retained closed/excluded: **${dispositions.summary.endpointCount}**`,
  `- Authorized complete-save source: **bound** (SHA-256 \`${report.completeSaveEvidence.completeSaveSha256}\`)`,
  `- Forward operation count: **0**`,
  `- Rollback operation: **not emitted**`,
  '- Live world edits: **none**', '',
  '## Required before “build the world”', '',
  ...report.requiredBeforeBuildAuthorization.map((item) => `- ${item}`), '',
  '## Public documentation boundary', '',
  'README, `/world-showcase`, and the master-plan narrative were not modified. This package record is the internal build artifact.', '',
  'The package is assembled and intentionally paused before live construction authorization.', '',
];
fs.mkdirSync(path.dirname(path.join(ROOT, MARKDOWN)), { recursive: true });
fs.writeFileSync(path.join(ROOT, MARKDOWN), `${lines.join('\n')}\n`);
console.log(JSON.stringify({
  status: report.status,
  manifest: OUTPUT,
  documentation: MARKDOWN,
  packageIdentity: reportIdentitySha256,
  constructionDomainCount: constructionDomains.length,
  operationCount: 0,
}, null, 2));
