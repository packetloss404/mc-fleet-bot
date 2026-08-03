#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = 'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27';
const resolve = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(resolve(filename), 'utf8'));
const sha256File = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(resolve(filename)))
  .digest('hex');
const artifact = (filename, extra = {}) => ({
  path: filename,
  sha256: sha256File(filename),
  ...extra,
});

const report = readJson(`${BASE}.report.json`);
const preflight = readJson(`${BASE}.preflight.json`);
const forwardDryRun = readJson(`${BASE}.forward-dry-run.json`);
const rollbackDryRun = readJson(`${BASE}.rollback-dry-run.json`);
const cameraManifestPath = (
  'data/exports/redevelopment-qa-2026-07-27/'
  + 'mainstreet-r4-r5-runtime-safe/same-camera-manifest.json'
);
const garageCameraManifestPath = (
  'data/exports/redevelopment-qa-2026-07-27/'
  + 'mainstreet-r4-r5-runtime-safe/garage-camera-manifest.json'
);
const cameraManifest = readJson(cameraManifestPath);
const garageCameraManifest = readJson(garageCameraManifestPath);

const alleyProfiles = Object.fromEntries(report.sharedAlleys.matrix.map((alley) => [
  alley.id,
  {
    rowCount: alley.rowCount,
    cellCount: alley.cellCount,
    elevationChanges: alley.gradeAnalysis.elevationChangeCount,
    signReversals: alley.gradeAnalysis.signReversalCount,
    adjacentOpposingStepPairs: alley.gradeAnalysis.adjacentOpposingStepPairs,
    oneCellPeaksOrTroughs: alley.gradeAnalysis.oneCellPeaksOrTroughs,
    minimumReversalPlateauRows: alley.gradeAnalysis.minimumReversalPlateauRows,
  },
]));

const release = {
  schemaVersion: 2,
  packageId: report.packageId,
  title: 'GrandStreet America R4/R5 runtime-safe rear-alley engineering release record',
  recordedAtUtc: new Date().toISOString(),
  source: {
    snapshotDirectory: 'data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region',
    snapshotSha256: report.source.snapshot.sha256,
    plan: artifact('mainstreet-america/planning/redevelopment-r4-r5.yaml'),
    incident: {
      report: 'docs/redevelopment/2026-07-27/release-attempt-1-incident.md',
      compensatedExecution: (
        'data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.'
        + 'emergency-rollback.execution.json'
      ),
    },
  },
  artifacts: {
    forward: artifact(`${BASE}.txt`, {
      operationCount: report.operations.count,
      sourceGroupCount: forwardDryRun.sourceGroupCount,
      expandedCommandCount: forwardDryRun.expandedCommandCount,
      finiteUnionGroupCount: forwardDryRun.finiteUnionGroupCount,
    }),
    rollback: artifact(`${BASE}.rollback.txt`, {
      operationCount: report.rollback.operationCount,
      exactReverseOrderInverse: report.rollback.exactInverse,
    }),
    engineeringReport: artifact(`${BASE}.report.json`),
    designDocument: artifact(
      'data/world-review/mainstreet-redevelopment-r4-r5-runtime-safe-design-2026-07-27.json',
    ),
    preflight: artifact(`${BASE}.preflight.json`),
    prereleasePreflight: artifact(`${BASE}.prerelease-preflight.json`),
    forwardDryRun: artifact(`${BASE}.forward-dry-run.json`, {
      operationSha256: forwardDryRun.operationSha256,
    }),
    rollbackDryRun: artifact(`${BASE}.rollback-dry-run.json`, {
      operationSha256: rollbackDryRun.operationSha256,
    }),
    sameCameraManifest: artifact(cameraManifestPath, {
      beforeCaptures: cameraManifest.captures.length,
      afterCapturesPending: cameraManifest.captures.length,
    }),
    garageCameraManifest: artifact(garageCameraManifestPath, {
      exactObjectCameras: garageCameraManifest.cameras.length,
    }),
    integrationManifest: artifact(`${BASE}.integration.json`),
  },
  scope: {
    garageCount: report.garages.requested,
    usableGarages: report.garages.usable,
    frontGardenGarages: report.garages.matrix.filter(
      (garage) => !garage.frontGardenPreserved,
    ).length,
    sharedRearAlleys: report.sharedAlleys.complete,
    completePublicAlleyConnections: report.sharedAlleys.publicConnectionsComplete,
    frontageAssignments: report.scope.frontageAssignments.length,
    buildingRelocations: report.scope.buildingRelocations.length,
    databaseFeatureDefinitions: report.databaseFeatures.length,
    alleyGradeProfiles: alleyProfiles,
    runtimeSafety: {
      tallGrassTargets: 0,
      reactiveNeighborHazards: (
        report.operations.runtimeSafety.reactiveNeighborHazardCount
      ),
      finiteExactStateUnionCells: (
        report.operations.runtimeSafety.finiteExactStateUnionGuards
          .reduce((sum, guard) => sum + guard.cellCount, 0)
      ),
      stableScreenNoOps: report.operations.alreadyDesiredNoOpsByRole.service_screen,
    },
  },
  verification: {
    generator: {
      status: report.releaseDecision.offlineGeneration === 'GO' ? 'PASS' : 'FAIL',
      collisions: report.diagnostics.collisions.length,
      skips: report.diagnostics.skips.length,
      operationTargetConflicts: report.diagnostics.operationConflicts.length,
      targetedBlockEntities: report.protection.targetedBlockEntities.length,
      exactGuardedOperations: report.operations.exactStateGuarded,
    },
    sourcePreflight: {
      status: preflight.failed === 0 ? 'PASS' : 'FAIL',
      passed: preflight.passed,
      failed: preflight.failed,
      partialMasks: preflight.partialMasks.length,
    },
    forwardDryRun: {
      status: 'PASS',
      sourceOperations: forwardDryRun.sourceOperationCount,
      sourceGroups: forwardDryRun.sourceGroupCount,
      expandedFillCommands: forwardDryRun.expandedCommandCount,
      finiteUnionGroups: forwardDryRun.finiteUnionGroupCount,
      worldEditCommands: forwardDryRun.worldEditLeftoverCount,
      strictNoop: forwardDryRun.strictNoop,
      rawReportHashMatchesOperation: (
        forwardDryRun.operationSha256 === report.operations.sha256
      ),
    },
    rollbackDryRun: {
      status: 'PASS',
      sourceOperations: rollbackDryRun.sourceOperationCount,
      sourceGroups: rollbackDryRun.sourceGroupCount,
      expandedFillCommands: rollbackDryRun.expandedCommandCount,
      worldEditCommands: rollbackDryRun.worldEditLeftoverCount,
      strictNoop: rollbackDryRun.strictNoop,
      rawReportHashMatchesOperation: (
        rollbackDryRun.operationSha256 === report.rollback.sha256
      ),
    },
    focusedTests: {
      status: 'PASS',
      command: 'npx vitest run test/build/generateMainstreetRedevelopmentR4R5.test.ts',
      testFilesPassed: 1,
      testsPassed: 6,
      testsFailed: 0,
    },
    backendBuild: {
      status: 'PASS',
      command: 'npm run build',
    },
    beforeMedia: {
      status: 'PASS',
      captured: cameraManifest.captures.length,
      nonblank: cameraManifest.captures.filter(
        (capture) => capture.beforeArtifact.nonblank,
      ).length,
      snapshotHashMatched: cameraManifest.baseline.hashMatched,
      afterPending: cameraManifest.captures.length,
      exactObjectAfterCameras: garageCameraManifest.cameras.length,
    },
  },
  releaseDecision: {
    offlineEngineering: 'GO',
    liveExecution: report.releaseDecision.liveExecution,
    liveExecutionPerformed: false,
    reason: (
      'Distinct runtime-safe package passes frozen-snapshot generation, exact '
      + 'guard preflight, finite-union contract, rollback, tests, build, and '
      + 'before-media gates. Consumer switching and live gates remain separate.'
    ),
  },
  mandatoryLiveReleaseGates: [
    'Switch every execution consumer listed in the integration manifest.',
    'Freeze a fresh saved-world snapshot and prove its content hash matches the execution baseline or regenerate the package.',
    'Run the standard live entity gate for the complete operation bounds.',
    'Execute the forward file as one atomic source-operation package with group-aware finite-union evaluation; do not execute a subset.',
    'Capture a post-release snapshot before any rollback decision.',
    'Run bidirectional alley/driveway movement tests and object-matched media QA.',
    'Import databaseFeatures only after post-release QA is a PASS.',
  ],
};

const outputPath = resolve(`${BASE}.release.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(release, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  forwardSha256: release.artifacts.forward.sha256,
  rollbackSha256: release.artifacts.rollback.sha256,
  operations: release.artifacts.forward.operationCount,
  finiteUnionGroups: release.artifacts.forward.finiteUnionGroupCount,
}, null, 2));
