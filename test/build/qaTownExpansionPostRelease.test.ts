import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { hashSnapshotDirectory } from '../../scripts/generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  evaluatePostReleaseRouteQa,
  parseOperationText,
  resolveEvidenceOutput,
  renderTownExpansionPostReleaseMarkdown,
  verifyTownExpansionPostRelease,
  verifyExactOperationBijection,
} from '../../scripts/qa_town_expansion_post_release.mjs';

describe('Town Expansion R1 post-release QA', () => {
  it('resolves media outputs beside the bound renderer report', () => {
    const temporary = fs.mkdtempSync(
      path.join(os.tmpdir(), 'town-expansion-media-path-'),
    );
    try {
      const reportDirectory = path.join(temporary, 'review');
      const rendererDirectory = path.join(temporary, 'renderer');
      const rendererReport = path.join(rendererDirectory, 'capture-report.json');
      const capture = path.join(rendererDirectory, 'pass-1', 'capture.png');
      const mediaReport = path.join(reportDirectory, 'media.json');
      fs.mkdirSync(path.dirname(capture), { recursive: true });
      fs.mkdirSync(reportDirectory, { recursive: true });
      fs.writeFileSync(rendererReport, '{}\n');
      fs.writeFileSync(capture, 'image bytes');

      expect(resolveEvidenceOutput(
        mediaReport,
        'pass-1/capture.png',
        { rendererReport: { path: rendererReport } },
      )).toBe(capture);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('parses complete block-state properties without splitting masks inside brackets', () => {
    const parsed = parseOperationText(
      'REPL 0 64 0 0 64 0 '
      + 'minecraft:oak_stairs[waterlogged=false,facing=north,half=bottom,shape=straight] '
      + 'minecraft:air\n',
    );

    expect(parsed.unsupported).toEqual([]);
    expect(parsed.repl).toHaveLength(1);
    expect(parsed.repl[0].sources).toEqual([
      'minecraft:oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
    ]);
  });

  it('proves an exact reverse sequence while counting staged target reuse once', () => {
    const forward = [
      'REPL 0 64 0 1 64 0 minecraft:stone minecraft:air',
      'REPL 2 64 0 2 64 0 minecraft:water[level=0] minecraft:blue_ice',
      'REPL 2 64 0 2 64 0 minecraft:blue_ice minecraft:water[level=0]',
      'CMD execute if block 0 64 0 minecraft:air run data merge block 0 64 0 {}',
      '',
    ].join('\n');
    const rollback = [
      'REPL 2 64 0 2 64 0 minecraft:water[level=0] minecraft:blue_ice',
      'REPL 2 64 0 2 64 0 minecraft:blue_ice minecraft:water[level=0]',
      'REPL 0 64 0 1 64 0 minecraft:air minecraft:stone',
      '',
    ].join('\n');

    expect(verifyExactOperationBijection(forward, rollback)).toMatchObject({
      passed: true,
      forwardReplGroups: 3,
      rollbackReplGroups: 3,
      forwardCommands: 1,
      rollbackCommands: 0,
      forwardCellSteps: 4,
      rollbackCellSteps: 4,
      uniqueTargetCells: 3,
      repeatedForwardCellSteps: 1,
      failures: [],
    });
  });

  it('fails closed when one rollback state is not the exact inverse', () => {
    const result = verifyExactOperationBijection(
      'REPL 4 70 8 4 70 8 minecraft:stone minecraft:air\n',
      'REPL 4 70 8 4 70 8 minecraft:air minecraft:dirt\n',
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual([
      expect.objectContaining({ reason: 'non-bijective-repl-pair' }),
    ]);
  });

  it('renders a reviewable Markdown gate and artifact table', () => {
    const markdown = renderTownExpansionPostReleaseMarkdown({
      generatedAtUtc: '2026-07-28T00:00:00Z',
      status: 'PASS',
      readOnly: true,
      snapshots: {
        pre: { sha256: 'a'.repeat(64) },
        post: { sha256: 'b'.repeat(64) },
      },
      totals: {
        uniqueTargetCells: 3,
        forwardReplGroups: 2,
        rollbackReplGroups: 2,
      },
      gates: [
        {
          id: 'exact-forward-rollback-target-bijection',
          passed: true,
          details: { uniqueTargetCells: 3 },
        },
      ],
      artifacts: {
        manifest: {
          path: 'data/buildops/example.manifest.json',
          sha256: 'c'.repeat(64),
        },
      },
      failures: [],
      decision: {
        release: 'ACCEPTED',
        rationale: 'Synthetic evidence passes.',
      },
    });

    expect(markdown).toContain('Decision: **ACCEPTED**');
    expect(markdown).toContain(
      '`exact-forward-rollback-target-bijection` | PASS',
    );
    expect(markdown).toContain('data/buildops/example.manifest.json');
  });

  it('rejects projected PASS route evidence and accepts only as-built identity', () => {
    const post = path.join(os.tmpdir(), 'synthetic-post-route-identity');
    const postHash = 'b'.repeat(64);
    const forwardHash = 'c'.repeat(64);
    const route = {
      status: 'PASS',
      passed: true,
      readOnly: true,
      liveWorldMutated: false,
      databaseMutated: false,
      acceptanceClass:
        'IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING',
      completeForTownExpansionOfflineAcceptance: true,
      projection: null,
      postSnapshot: { directory: post, sha256: postHash },
      packageHashes: {
        'town-expansion-r1': { sha256: forwardHash },
      },
      tests: [{ id: 'route', passed: true, directions: [] }],
      summary: { failed: 0 },
    };
    const identity = { postRegions: post, postSha256: postHash, forwardSha256: forwardHash };

    expect(evaluatePostReleaseRouteQa(route, identity)).toMatchObject({
      passed: true,
      details: {
        projectionAbsent: true,
        explicitlyComplete: true,
        immutablePostIdentityBound: true,
      },
    });

    expect(evaluatePostReleaseRouteQa({
      ...route,
      acceptanceClass: 'OFFLINE_PROJECTED_REPAIR_GEOMETRY_ACCEPTED_NOT_AS_BUILT',
      completeForTownExpansionOfflineAcceptance: false,
      projection: {
        file: 'data/buildops/projected-repair.txt',
        projectedOnly: true,
      },
    }, identity)).toMatchObject({
      passed: false,
      details: {
        projectionAbsent: false,
        explicitlyComplete: false,
        immutablePostIdentityBound: true,
      },
    });
  });

  it('accepts a complete synthetic one-package evidence chain', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'town-post-qa-'));
    const pre = path.join(temp, 'pre');
    const post = path.join(temp, 'post');
    fs.mkdirSync(pre);
    fs.mkdirSync(post);
    fs.writeFileSync(path.join(pre, 'r.0.0.mca'), 'immutable-pre');
    fs.writeFileSync(path.join(post, 'r.0.0.mca'), 'immutable-post');
    const preHash = hashSnapshotDirectory(pre).sha256;
    const postHash = hashSnapshotDirectory(post).sha256;
    const forward = path.join(temp, 'forward.txt');
    const rollback = path.join(temp, 'rollback.txt');
    fs.writeFileSync(
      forward,
      'REPL 1 64 1 1 64 1 minecraft:air minecraft:cut_copper\n',
    );
    fs.writeFileSync(
      rollback,
      'REPL 1 64 1 1 64 1 minecraft:cut_copper minecraft:air\n',
    );
    const digest = (filename: string) => crypto
      .createHash('sha256')
      .update(fs.readFileSync(filename))
      .digest('hex');
    const forwardHash = digest(forward);
    const rollbackHash = digest(rollback);
    const writeJson = (name: string, value: unknown) => {
      const filename = path.join(temp, name);
      fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
      return filename;
    };
    const manifestPath = path.join(temp, 'manifest.json');
    const designReportPath = path.join(temp, 'design.json');
    const manifest = writeJson('manifest.json', {
      packageId: 'town-expansion-r1-2026-07-28',
      sourceSnapshot: { directory: pre, sha256: preHash },
      combinedTransaction: {
        forward: {
          file: forward,
          sha256: forwardHash,
          targetCells: 1,
          operationGroups: 1,
        },
        rollback: {
          file: rollback,
          sha256: rollbackHash,
          targetCells: 1,
          operationGroups: 1,
        },
        report: { file: designReportPath },
      },
      owners: [{ id: 'shared', targetCells: 1 }],
      checks: { exact: true },
    });
    const designReport = writeJson('design.json', {
      packageId: 'town-expansion-r1-2026-07-28',
      sourceSnapshot: { directory: pre, sha256: preHash },
      operations: {
        file: forward,
        sha256: forwardHash,
        targetCells: 1,
        operationGroups: 1,
      },
      rollback: {
        file: rollback,
        sha256: rollbackHash,
        targetCells: 1,
        operationGroups: 1,
      },
      ownershipManifest: { file: manifestPath },
      acceptance: {
        noMissingSnapshotCells: true,
        noProtectedBlockEntityTargets: true,
        noUnreviewedCrossScopeInterfaces: true,
        exactStateGuards: true,
        exactRollback: true,
        managerValeExactModuleIntegrated: true,
        managerValeZeroSharedTargetIntersections: true,
        managerValeCommissionBeforeRetire: true,
      },
    });
    const transaction = writeJson('transaction.json', {
      transactionId: 'synthetic-town-expansion',
      status: 'committed-pending-post-qa',
      preReleaseRegions: pre,
      preReleaseSnapshotSha256: preHash,
      postReleaseRegions: post,
      packages: [{
        key: 'town-expansion-r1',
        status: 'committed',
        forwardSha256: forwardHash,
        rollbackSha256: rollbackHash,
        execution: {
          status: 'complete',
          strictNoop: true,
          failedGroups: 0,
          failedCommands: 0,
          operationSha256: forwardHash,
        },
      }],
      events: [{ event: 'transaction-committed' }],
    });
    const liveEntityGate = writeJson('entity.json', {
      schemaVersion: 2,
      status: 'PASS',
      passed: true,
      blockOrEntityMutation: false,
      forceLoadAudit: {
        mode: 'sparse-target-halo-batched',
        allRequiredChunksLoadedBeforeQueries: true,
        missingRequiredChunks: [],
        cleanupErrors: [],
        allTemporaryChunksReleased: true,
        finalSetMatchesPreExistingSet: true,
      },
      packages: [{
        file: forward,
        operationSha256: forwardHash,
        passed: true,
        blockers: [],
        queryErrors: [],
      }],
    });
    const transitionEvidence = writeJson('transition-evidence.json', {
      schemaVersion: 2,
      orderAwareProjection: true,
      failurePointsComplete: true,
      partialMasks: [],
      opsSha256: rollbackHash,
      regionsSnapshot: { sha256: postHash },
      failed: 1,
      failures: [{
        line: 1,
        unexpectedComplete: true,
        unexpectedCount: 1,
        unexpected: [{
          point: [1, 64, 1],
          actual: 'minecraft:exposed_cut_copper',
        }],
      }],
    });
    const rollbackTransitionPolicy = writeJson('transition-policy.json', {
      schemaVersion: 1,
      kind: 'natural-block-state-transition',
      executionRole: 'rollback',
      matchMode: 'exact-declared-points',
      propertyPolicy: 'identical',
      operation: { path: rollback, sha256: rollbackHash },
      evidence: {
        preflightPath: transitionEvidence,
        preflightSha256: digest(transitionEvidence),
        snapshotSha256: postHash,
      },
      rules: [{
        id: 'synthetic-copper',
        line: 1,
        box: [1, 64, 1, 1, 64, 1],
        canonicalSource: 'minecraft:cut_copper',
        allowedActualStates: ['minecraft:exposed_cut_copper'],
        points: [[1, 64, 1]],
      }],
    });
    const rollbackTransitionPolicyHash = digest(rollbackTransitionPolicy);
    const rollbackPreflight = writeJson('rollback-preflight.json', {
      schemaVersion: 3,
      status: 'PASS',
      operation: {
        path: rollback,
        sha256: rollbackHash,
        operationCount: 1,
      },
      snapshot: {
        directory: post,
        sha256: postHash,
      },
      checks: { orderAwareProjection: true },
      naturalStateTransitionPolicy: {
        path: rollbackTransitionPolicy,
        sha256: rollbackTransitionPolicyHash,
        operationSha256: rollbackHash,
        executionRole: 'rollback',
        matchMode: 'exact-declared-points',
        propertyPolicy: 'identical',
        declaredPointCount: 1,
        encounteredDeclaredPoints: 1,
        acceptedTransitionCells: 1,
        canonicalExactCells: 0,
        unmatchedDeclaredPoints: 0,
      },
      summary: {
        passed: 1,
        failed: 0,
        failures: [],
      },
    });
    const routeQa = writeJson('route.json', {
      status: 'PASS',
      passed: true,
      readOnly: true,
      liveWorldMutated: false,
      databaseMutated: false,
      acceptanceClass:
        'IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING',
      completeForTownExpansionOfflineAcceptance: true,
      projection: null,
      postSnapshot: { directory: post, sha256: postHash },
      packageHashes: {
        'town-expansion-r1': { file: forward, sha256: forwardHash },
      },
      tests: [{
        id: 'synthetic-bidirectional',
        passed: true,
        directions: [
          {
            passed: true,
            violations: [],
            movementPolicyViolations: [],
            legs: [{ reached: true, movementPolicyViolations: [] }],
          },
          {
            passed: true,
            violations: [],
            movementPolicyViolations: [],
            legs: [{ reached: true, movementPolicyViolations: [] }],
          },
        ],
      }],
      summary: { failed: 0 },
    });

    try {
      const result = await verifyTownExpansionPostRelease({
        pre,
        post,
        transaction,
        liveEntityGate,
        rollbackPoststatePreflight: rollbackPreflight,
        rollbackTransitionPolicy,
        routeQa,
        designReport,
        manifest,
      });
      expect(result.status).toBe('PASS');
      expect(result.passed).toBe(true);
      expect(result.decision.release).toBe('ACCEPTED');
      expect(result.failures).toEqual([]);
      expect(result.gates).toHaveLength(10);
      expect(result.gates.every((gate: { passed: boolean }) => gate.passed))
        .toBe(true);
      expect(
        result.gates.find(
          (gate: { id: string }) =>
            gate.id === 'base-source-state-equivalence-bound',
        ),
      ).toMatchObject({
        passed: true,
        details: {
          mode: 'whole-snapshot-equality',
          required: false,
          supplied: false,
        },
      });

      const equivalenceManifestPath = path.join(
        temp,
        'equivalence-manifest.json',
      );
      const equivalenceDesignPath = path.join(
        temp,
        'equivalence-design.json',
      );
      const designSourceHash = 'd'.repeat(64);
      const equivalenceManifest = writeJson('equivalence-manifest.json', {
        ...JSON.parse(fs.readFileSync(manifest, 'utf8')),
        sourceSnapshot: {
          directory: path.join(temp, 'original-design-source'),
          sha256: designSourceHash,
        },
        combinedTransaction: {
          ...JSON.parse(fs.readFileSync(manifest, 'utf8'))
            .combinedTransaction,
          report: { file: equivalenceDesignPath },
        },
      });
      const equivalenceDesign = writeJson('equivalence-design.json', {
        ...JSON.parse(fs.readFileSync(designReport, 'utf8')),
        sourceSnapshot: {
          directory: path.join(temp, 'original-design-source'),
          sha256: designSourceHash,
        },
        ownershipManifest: { file: equivalenceManifestPath },
      });
      const sourceEquivalencePreflight = writeJson(
        'source-equivalence-preflight.json',
        {
          schemaVersion: 2,
          opsPath: forward,
          opsSha256: forwardHash,
          regions: pre,
          regionsSnapshot: { sha256: preHash },
          orderAwareProjection: true,
          operationCount: 1,
          passed: 1,
          failed: 0,
          failures: [],
          failurePointsComplete: true,
        },
      );
      const verifySourceEquivalence = (
        proof: string | undefined,
      ) => verifyTownExpansionPostRelease({
        pre,
        post,
        transaction,
        liveEntityGate,
        rollbackPoststatePreflight: rollbackPreflight,
        rollbackTransitionPolicy,
        routeQa,
        designReport: equivalenceDesign,
        manifest: equivalenceManifest,
        ...(proof ? { sourceEquivalencePreflight: proof } : {}),
      });

      const equivalenceResult = await verifySourceEquivalence(
        sourceEquivalencePreflight,
      );
      expect(equivalenceResult.status).toBe('PASS');
      expect(
        equivalenceResult.gates.find(
          (gate: { id: string }) =>
            gate.id === 'base-source-state-equivalence-bound',
        ),
      ).toMatchObject({
        passed: true,
        details: {
          mode: 'complete-source-equivalence-preflight',
          required: true,
          supplied: true,
          proofPassed: true,
          operationCount: 1,
          expectedOperationCount: 1,
          passed: 1,
          failed: 0,
          failurePointsComplete: true,
          orderAwareProjection: true,
        },
      });
      expect(
        equivalenceResult.artifacts.sourceEquivalencePreflight,
      ).toMatchObject({
        sha256: digest(sourceEquivalencePreflight),
      });
      expect(
        equivalenceResult.releaseIdentity.base.sourceEquivalencePreflight,
      ).toEqual(equivalenceResult.artifacts.sourceEquivalencePreflight);

      const missingEquivalenceResult =
        await verifySourceEquivalence(undefined);
      expect(missingEquivalenceResult.status).toBe('FAIL');
      expect(
        missingEquivalenceResult.failures.map(
          (gate: { id: string }) => gate.id,
        ),
      ).toContain('base-source-state-equivalence-bound');

      const mismatchedEquivalencePreflight = writeJson(
        'source-equivalence-preflight-mismatched.json',
        {
          ...JSON.parse(
            fs.readFileSync(sourceEquivalencePreflight, 'utf8'),
          ),
          regionsSnapshot: { sha256: 'e'.repeat(64) },
        },
      );
      const mismatchedEquivalenceResult =
        await verifySourceEquivalence(mismatchedEquivalencePreflight);
      expect(mismatchedEquivalenceResult.status).toBe('FAIL');
      expect(
        mismatchedEquivalenceResult.failures.map(
          (gate: { id: string }) => gate.id,
        ),
      ).toContain('base-source-state-equivalence-bound');

      const partialEquivalencePreflight = writeJson(
        'source-equivalence-preflight-partial.json',
        {
          ...JSON.parse(
            fs.readFileSync(sourceEquivalencePreflight, 'utf8'),
          ),
          operationCount: 0,
          passed: 0,
          failurePointsComplete: false,
          reusableEvidenceOnly: true,
          satisfiesFinalConsolidatedPreflight: false,
        },
      );
      const partialEquivalenceResult =
        await verifySourceEquivalence(partialEquivalencePreflight);
      expect(partialEquivalenceResult.status).toBe('FAIL');
      expect(
        partialEquivalenceResult.failures.map(
          (gate: { id: string }) => gate.id,
        ),
      ).toContain('base-source-state-equivalence-bound');

      const intermediate = path.join(temp, 'supplement-post-1');
      const finalPost = path.join(temp, 'supplement-post-2');
      fs.mkdirSync(intermediate);
      fs.mkdirSync(finalPost);
      fs.writeFileSync(
        path.join(intermediate, 'r.0.0.mca'),
        'immutable-supplement-post-1',
      );
      fs.writeFileSync(
        path.join(finalPost, 'r.0.0.mca'),
        'immutable-supplement-post-2',
      );
      const makeSupplement = ({
        key,
        source,
        target,
        coordinate,
      }: {
        key: string;
        source: string;
        target: string;
        coordinate: number;
      }) => {
        const supplementForward = path.join(temp, `${key}.forward.txt`);
        const supplementRollback = path.join(temp, `${key}.rollback.txt`);
        fs.writeFileSync(
          supplementForward,
          `REPL ${coordinate} 64 0 ${coordinate} 64 0 minecraft:stone minecraft:air\n`,
        );
        fs.writeFileSync(
          supplementRollback,
          `REPL ${coordinate} 64 0 ${coordinate} 64 0 minecraft:air minecraft:stone\n`,
        );
        const supplementForwardHash = digest(supplementForward);
        const supplementRollbackHash = digest(supplementRollback);
        const sourceHash = hashSnapshotDirectory(source).sha256;
        const targetHash = hashSnapshotDirectory(target).sha256;
        const sourcePreflight = writeJson(`${key}.source-preflight.json`, {
          schemaVersion: 2,
          status: 'PASS',
          opsPath: supplementForward,
          opsSha256: supplementForwardHash,
          regions: source,
          regionsSnapshot: { sha256: sourceHash },
          orderAwareProjection: true,
          operationCount: 1,
          passed: 1,
          failed: 0,
          failures: [],
        });
        const entityGate = writeJson(`${key}.entity.json`, {
          schemaVersion: 2,
          status: 'PASS',
          passed: true,
          blockOrEntityMutation: false,
          packages: [{
            file: supplementForward,
            operationSha256: supplementForwardHash,
            passed: true,
            blockers: [],
            queryErrors: [],
          }],
          forceLoadAudit: {
            mode: 'sparse-target-halo-batched',
            allRequiredChunksLoadedBeforeQueries: true,
            missingRequiredChunks: [],
            cleanupErrors: [],
            allTemporaryChunksReleased: true,
            finalSetMatchesPreExistingSet: true,
          },
        });
        const execution = writeJson(`${key}.execution.json`, {
          schemaVersion: 3,
          status: 'complete',
          operationRole: 'forward',
          operationSha256: supplementForwardHash,
          strictNoop: true,
          sourceGroups: [{}],
          successfulGroups: 1,
          failedGroups: 0,
          failedCommands: 0,
          noopCommands: 0,
        });
        const supplementRollbackPreflight = writeJson(
          `${key}.rollback-preflight.json`,
          {
            schemaVersion: 2,
            status: 'PASS',
            opsPath: supplementRollback,
            opsSha256: supplementRollbackHash,
            regions: target,
            regionsSnapshot: { sha256: targetHash },
            orderAwareProjection: true,
            operationCount: 1,
            passed: 1,
            failed: 0,
            failures: [],
          },
        );
        return {
          path: writeJson(`${key}.transaction.json`, {
            schemaVersion: 1,
            status: 'committed',
            source: {
              snapshot: source,
              snapshotSha256: sourceHash,
              preflight: sourcePreflight,
              entityGate,
            },
            packages: [{
              key,
              status: 'committed',
              forward: supplementForward,
              forwardSha256: supplementForwardHash,
              rollback: supplementRollback,
              rollbackSha256: supplementRollbackHash,
              execution,
              sourceGroups: 1,
              successfulGroups: 1,
              failedGroups: 0,
              changedCommands: 1,
              noopCommands: 0,
            }],
            postState: {
              snapshot: target,
              snapshotSha256: targetHash,
              rollbackPreflight: supplementRollbackPreflight,
              rollbackGuardsPassed: 1,
              rollbackGuardsFailed: 0,
            },
          }),
          forwardHash: supplementForwardHash,
        };
      };
      const supplementOne = makeSupplement({
        key: 'synthetic-accessibility-repair',
        source: post,
        target: intermediate,
        coordinate: 2,
      });
      const supplementTwo = makeSupplement({
        key: 'synthetic-citizen-clearance',
        source: intermediate,
        target: finalPost,
        coordinate: 3,
      });
      const finalHash = hashSnapshotDirectory(finalPost).sha256;
      const supplementalRouteQa = writeJson('supplemental-route.json', {
        ...JSON.parse(fs.readFileSync(routeQa, 'utf8')),
        postSnapshot: { directory: finalPost, sha256: finalHash },
        packageHashes: {
          'synthetic-accessibility-repair': {
            sha256: supplementOne.forwardHash,
          },
        },
      });
      const supplementalResult = await verifyTownExpansionPostRelease({
        pre,
        post: finalPost,
        transaction,
        supplementalTransactions: [
          supplementOne.path,
          supplementTwo.path,
        ],
        liveEntityGate,
        rollbackPoststatePreflight: rollbackPreflight,
        rollbackTransitionPolicy,
        routeQa: supplementalRouteQa,
        designReport,
        manifest,
      });
      expect(supplementalResult).toMatchObject({
        schemaVersion: 2,
        status: 'PASS',
        passed: true,
        totals: {
          packages: 3,
          supplementalPackages: 2,
        },
        releaseIdentity: {
          schemaVersion: 1,
          base: {
            rollbackPoststatePreflight: {
              sha256: digest(rollbackPreflight),
            },
            naturalStateTransitionPolicy: {
              sha256: rollbackTransitionPolicyHash,
            },
          },
          supplements: [
            { key: 'synthetic-accessibility-repair' },
            { key: 'synthetic-citizen-clearance' },
          ],
          terminalPostSnapshot: { sha256: finalHash },
        },
      });
      expect(
        supplementalResult.gates.find(
          (gate: { id: string }) =>
            gate.id === 'supplemental-release-chain-bound',
        ),
      ).toMatchObject({ passed: true });

      const omittedTerminalSupplement =
        await verifyTownExpansionPostRelease({
          pre,
          post: finalPost,
          transaction,
          supplementalTransactions: [supplementOne.path],
          liveEntityGate,
          rollbackPoststatePreflight: rollbackPreflight,
          rollbackTransitionPolicy,
          routeQa: supplementalRouteQa,
          designReport,
          manifest,
        });
      expect(omittedTerminalSupplement.status).toBe('FAIL');
      expect(
        omittedTerminalSupplement.failures.map(
          (gate: { id: string }) => gate.id,
        ),
      ).toContain('supplemental-release-chain-bound');
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
