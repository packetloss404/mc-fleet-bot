import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  blockStatesEquivalent,
  canonicalBlockState,
  isPropertyOrderOnlyBlockStateNoop,
} from '../../scripts/lib/canonical_block_state.mjs';
import { evaluatePostReleaseRouteQa } from '../../scripts/qa_town_expansion_post_release.mjs';
import { verifyTownExpansionRoutes } from '../../scripts/qa_town_expansion_routes.mjs';

const ROOT = path.resolve(__dirname, '../..');
const BUILDOPS = path.join(ROOT, 'data/buildops');
const DOCS = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion',
);
const REVIEW = path.join(ROOT, 'data/world-review');
const FORWARD = path.join(
  BUILDOPS,
  'town-expansion-r1-accessibility-repair-2026-07-28.txt',
);
const ROLLBACK = path.join(
  BUILDOPS,
  'town-expansion-r1-accessibility-repair-2026-07-28.rollback.txt',
);
const MANIFEST = path.join(
  BUILDOPS,
  'town-expansion-r1-accessibility-repair-2026-07-28.manifest.json',
);
const REPORT = path.join(
  BUILDOPS,
  'town-expansion-r1-accessibility-repair-2026-07-28.report.json',
);
const ROUTES = path.join(
  DOCS,
  'town-expansion-accessibility-repair-route-manifest.json',
);
const PROJECTED_QA = path.join(
  REVIEW,
  'town-expansion-r1-accessibility-repair-projected-route-qa-2026-07-28.json',
);
const FAILED_ATTEMPT_FORWARD = path.join(
  REVIEW,
  'archive/town-expansion-r1-accessibility-repair-semantic-noop-attempt1-20260728',
  'town-expansion-r1-accessibility-repair-2026-07-28.txt',
);
const AS_BUILT_ROUTES = path.join(
  DOCS,
  'town-expansion-accessibility-repair-as-built-route-manifest.json',
);
const AS_BUILT_QA = path.join(
  REVIEW,
  'town-expansion-r1-accessibility-repair-as-built-route-qa-20260728.json',
);
const TERMINAL_POST_REGIONS =
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region';
const TERMINAL_POST_SHA256 =
  'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751';
const ACCESSIBILITY_FORWARD_SHA256 =
  'b042a63f6947554b701db0a56e970ef9054e5941a7c979f8c3f761d93d11cc3b';

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function operations(filename: string): string[][] {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('REPL '))
    .map((line) => line.split(/\s+/));
}

describe('Town Expansion accessibility repair release', () => {
  it('canonicalizes block property order before no-op classification', () => {
    const paperState =
      'minecraft:smooth_quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
    const authoredState =
      'minecraft:smooth_quartz_stairs[waterlogged=false,facing=south,half=bottom,shape=straight]';

    expect(canonicalBlockState(authoredState)).toBe(paperState);
    expect(blockStatesEquivalent(paperState, authoredState)).toBe(true);
    expect(isPropertyOrderOnlyBlockStateNoop(paperState, authoredState)).toBe(true);
    expect(blockStatesEquivalent(
      paperState,
      'minecraft:smooth_quartz_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
    )).toBe(false);
    expect(isPropertyOrderOnlyBlockStateNoop(
      paperState,
      'minecraft:smooth_quartz_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
    )).toBe(false);
    expect(isPropertyOrderOnlyBlockStateNoop(paperState, paperState)).toBe(false);
  });

  it('rejects the archived line 1145 semantic no-op before region census', () => {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/preflight_guarded_ops.mjs',
        FAILED_ATTEMPT_FORWARD,
        '--regions',
        path.join(ROOT, 'does-not-exist-semantic-noop-regression'),
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('property-order semantic no-op REPL guard');
    expect(result.stderr).toContain('line 1145');
    expect(result.stderr).not.toContain('ENOENT');
  });

  it('is an exact, reversible, no-ladder/no-portal guarded package', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    const forward = operations(FORWARD);
    const rollback = operations(ROLLBACK);

    expect(manifest.status).toBe('OFFLINE_PROJECTED_ROUTE_PASS_NOT_EXECUTED');
    expect(manifest.liveWorldMutated).toBe(false);
    expect(manifest.source.snapshotSha256).toBe(
      '0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218',
    );
    expect(manifest.forward.sha256).toBe(sha256File(FORWARD));
    expect(manifest.rollback.sha256).toBe(sha256File(ROLLBACK));
    expect(forward).toHaveLength(1526);
    expect(forward).toHaveLength(manifest.forward.operationCount);
    expect(rollback).toHaveLength(manifest.rollback.operationCount);
    expect(new Set(forward.map((entry) => entry.slice(1, 4).join(','))).size)
      .toBe(forward.length);
    for (let index = 0; index < forward.length; index += 1) {
      const direct = forward[index];
      const inverse = rollback[rollback.length - 1 - index];
      expect(inverse.slice(1, 7)).toEqual(direct.slice(1, 7));
      expect(inverse[7]).toBe(direct[8]);
      expect(inverse[8]).toBe(direct[7]);
    }
    expect(forward.every((entry) => entry[0] === 'REPL')).toBe(true);
    expect(forward.every((entry) => (
      !blockStatesEquivalent(entry[7], entry[8])
    ))).toBe(true);
    expect(forward.flatMap((entry) => entry.slice(7)).join('\n')).not.toMatch(
      /ladder|minecraft:(?:nether_portal|end_portal|end_gateway)/,
    );
    expect(manifest.protections).toMatchObject({
      targetBlockEntities: 0,
      ravensgateReviewBufferTargets: 0,
      libraryGuildTunnelTargets: 0,
      activePortalBlocksAdded: 0,
      laddersAdded: 0,
      semanticNoOpsEmitted: 0,
      liveExecutionPerformed: false,
    });
    expect(manifest.protections).toMatchObject({
      semanticNoOpCandidatesOmitted: 1914,
      exactTextNoOpCandidatesOmitted: 1910,
      propertyOrderOnlyNoOpsOmitted: 4,
    });
    expect(report.exactGuardAudit).toMatchObject({
      exactGuardsMatched: forward.length,
      semanticNoOpCandidatesOmitted:
        manifest.protections.semanticNoOpCandidatesOmitted,
      semanticNoOpsEmitted: 0,
      mismatches: 0,
      duplicateTargets: 0,
      rollbackBijection: true,
    });
    expect(manifest.repairs).toHaveLength(8);
    expect(
      manifest.repairs.filter(
        (repair: { classification: string }) => (
          repair.classification === 'MANIFEST_WAYPOINT_ERROR'
        ),
      ),
    ).toHaveLength(1);
  });

  it('preserves full route coverage and passes only as an offline projection', async () => {
    const result = await verifyTownExpansionRoutes({
      manifest: path.relative(ROOT, ROUTES),
      overlayOps: path.relative(ROOT, FORWARD),
      noWrite: true,
    });
    const stored = JSON.parse(fs.readFileSync(PROJECTED_QA, 'utf8'));

    expect(result.status).toBe('PASS');
    expect(result.acceptanceClass).toBe(
      'OFFLINE_PROJECTED_REPAIR_GEOMETRY_ACCEPTED_NOT_AS_BUILT',
    );
    expect(result.completeForTownExpansionOfflineAcceptance).toBe(false);
    expect(result.summary).toMatchObject({
      routes: 22,
      passed: 22,
      failed: 0,
      directionalRuns: 44,
      passedDirections: 44,
      identityFailures: [],
      isolationFailures: [],
    });
    expect(result.coverage.requiredDomains).toHaveLength(7);
    expect(result.coverage.domains.every(
      (domain: { routes: number; passed: number }) => domain.routes === domain.passed,
    )).toBe(true);
    expect(result.isolationAssertions).toHaveLength(4);
    expect(result.isolationAssertions.every(
      (assertion: { passed: boolean }) => assertion.passed,
    )).toBe(true);
    expect(result.blockingFindings).toEqual([]);
    expect(stored.projection.sha256).toBe(sha256File(FORWARD));
    expect(stored.projection.exactGuardsPassed).toBe(
      operations(FORWARD).length,
    );
  }, 30_000);

  it('keeps the rejected baseline evidence in immutable archive paths', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const archive = manifest.source.immutableBaselineArchive;
    const archivedManifest = path.join(ROOT, archive.routeManifest);
    const archivedReport = path.join(ROOT, archive.routeReport);
    const rejected = JSON.parse(fs.readFileSync(archivedReport, 'utf8'));

    expect(sha256File(archivedManifest)).toBe(archive.routeManifestSha256);
    expect(sha256File(archivedReport)).toBe(archive.routeReportSha256);
    expect(rejected.status).toBe('FAIL');
    expect(rejected.summary).toMatchObject({
      routes: 22,
      passed: 14,
      failed: 8,
    });
  });

  it('preserves the failed semantic-no-op execution and prefix recovery evidence', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const archiveManifestPath = path.join(
      ROOT,
      manifest.source.failedAttemptArchive.manifest,
    );
    const archive = JSON.parse(fs.readFileSync(archiveManifestPath, 'utf8'));

    expect(sha256File(archiveManifestPath)).toBe(
      manifest.source.failedAttemptArchive.manifestSha256,
    );
    expect(archive.status).toBe('IMMUTABLE_FAILED_ATTEMPT_ARCHIVE');
    expect(archive.supersededOperationSha256).toBe(
      '3c4b2f70741d6491d08a35ae9e3a485052b029cf69a8bab93d2425a04bab9e53',
    );
    expect(archive.archivedPackage.length).toBeGreaterThan(0);
    expect(archive.preservedIncidentEvidence.length).toBeGreaterThanOrEqual(8);
    for (const entry of archive.archivedPackage) {
      expect(sha256File(path.join(ROOT, entry.archive))).toBe(entry.sha256);
    }
    for (const entry of archive.preservedIncidentEvidence) {
      expect(sha256File(path.join(ROOT, entry.file))).toBe(entry.sha256);
    }
  });

  it('binds a separate no-overlay as-built PASS to the terminal snapshot', async () => {
    const stored = JSON.parse(fs.readFileSync(AS_BUILT_QA, 'utf8'));
    const rerun = await verifyTownExpansionRoutes({
      manifest: path.relative(ROOT, AS_BUILT_ROUTES),
      regions: TERMINAL_POST_REGIONS,
      noWrite: true,
    });

    for (const report of [stored, rerun]) {
      expect(report).toMatchObject({
        status: 'PASS',
        passed: true,
        acceptanceClass:
          'IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING',
        completeForTownExpansionOfflineAcceptance: true,
        projection: null,
      });
      expect(report.postSnapshot.sha256).toBe(TERMINAL_POST_SHA256);
      expect(report.packageHashes['town-expansion-r1'].sha256).toBe(
        ACCESSIBILITY_FORWARD_SHA256,
      );
      expect(report.summary).toMatchObject({
        routes: 22,
        passed: 22,
        failed: 0,
        directionalRuns: 44,
        passedDirections: 44,
      });
    }
    const asBuiltManifest = JSON.parse(fs.readFileSync(AS_BUILT_ROUTES, 'utf8'));
    expect(asBuiltManifest.asBuiltRelease.terminalSupplementalRecovery)
      .toMatchObject({
        totalSuccessfulGroups: 57,
        totalFailedGroups: 0,
        exactRollbackPoststatePreflight: true,
      });
    expect(
      asBuiltManifest.asBuiltRelease.terminalSupplementalRecovery.packages,
    ).toHaveLength(2);

    const finalVerifierEvaluation = evaluatePostReleaseRouteQa(stored, {
      postRegions: path.join(ROOT, TERMINAL_POST_REGIONS),
      postSha256: TERMINAL_POST_SHA256,
      forwardSha256: ACCESSIBILITY_FORWARD_SHA256,
    });
    expect(finalVerifierEvaluation.passed).toBe(true);
    expect(finalVerifierEvaluation.details).toMatchObject({
      projectionAbsent: true,
      explicitlyComplete: true,
      immutablePostIdentityBound: true,
      packageHashBound: true,
      passedRoutes: 22,
    });
  }, 30_000);
});
