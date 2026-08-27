import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIR = path.join(
  ROOT,
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/r12q-candidate',
);
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12_b09_active_shuttle_candidate_offline.mjs',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

describe('R12Q B09 bounded active-shuttle candidate', () => {
  it('binds the accepted R12Q terminal source and exact 19-cell scope', () => {
    const candidate = read('r12q-b09-bounded-active-shuttle.candidate-manifest.json');
    expect(candidate).toMatchObject({
      status: 'SOURCE_PROVEN_DISPOSABLE_CANDIDATE_NOT_A_LIVE_RELEASE_MANIFEST',
      candidatePayloadSha256:
        '2b31498c9860fad29aad937c57fddc8abea180a95b87616656145eb4fb1f9ab8',
      source: {
        predecessor: {
          transactionId: 'combined-zones-r12q-b09-lower-two-turn-rail-closure',
          completedReleaseIdentitySha256:
            'ee059a2d4ac5f030a392ba275487dd2f0083ba7dd3e1379de8ac656e02a49c91',
          postCompleteSaveSha256:
            'ff40e5e40c7f144694b80ede6e600a21ed266f0ad4b5069a36c8c78b35478e55',
          postRegionSha256:
            '1732b30ba39b6b81dd88d0985b9018ba399c41bec295d12397004e20fbe97274',
        },
        freshExecutionSourceContract: {
          freshCompleteSaveRequired: true,
          wholeSaveEqualityToPredecessorRequired: false,
          exactNineteenCellSourcePreflightRequired: true,
        },
      },
      scope: {
        centerlineIndices: { first: 9, last: 25, poweredFirst: 10, poweredLast: 24 },
        targetCells: { cellCount: 19 },
        controls: { cellCount: 2, centerlineSideIndices: [13, 22] },
        terminalStops: { cellCount: 2, centerlineIndices: [9, 25] },
        poweredTrack: { cellCount: 15, centerlineIndices: { first: 10, last: 24 } },
        disjointFromPassiveTurnCells: [240, 260],
      },
    });
  });

  it('emits two disposable exact reverse-order block packages outside buildops', () => {
    const candidate = read('r12q-b09-bounded-active-shuttle.candidate-manifest.json');
    expect(candidate).toMatchObject({
      executionOrder: [
        'b09-active-shuttle-fail-closed-controls',
        'b09-active-shuttle-fail-closed-track',
      ],
      rollbackOrder: [
        'b09-active-shuttle-fail-closed-track',
        'b09-active-shuttle-fail-closed-controls',
      ],
      exactInverse: {
        totalBlockTransitionCount: 19,
        packageCount: 2,
        uniqueTargetCellCount: 19,
        reversePackageOrder: true,
        reverseOperationOrder: true,
      },
    });
    expect(candidate.packages.every((entry: { forward: string; rollback: string }) => (
      entry.forward.startsWith('data/world-review/')
        && entry.rollback.startsWith('data/world-review/')
    ))).toBe(true);
    expect(fs.readdirSync(path.join(ROOT, 'data/buildops')).some((name) => (
      name.startsWith('r12q-b09-bounded-active-shuttle')
    ))).toBe(false);
  });

  it('passes exact ordered source and projected rollback preflights', () => {
    const cases = [
      ['controls-forward-preflight.json', 2],
      ['track-forward-preflight.json', 17],
      ['track-projected-rollback-preflight.json', 17],
      ['controls-projected-rollback-preflight.json', 2],
    ] as const;
    for (const [name, count] of cases) {
      expect(read(name)).toMatchObject({
        status: 'PASS',
        operationCount: count,
        passed: count,
        failed: 0,
      });
    }
  });

  it('passes all strict parsers and immutable block-entity clearance', () => {
    const cases = [
      ['controls-forward-parser.json', 'forward', 2],
      ['track-forward-parser.json', 'forward', 17],
      ['track-rollback-parser.json', 'rollback', 17],
      ['controls-rollback-parser.json', 'rollback', 2],
    ] as const;
    for (const [name, role, count] of cases) {
      expect(read(name)).toMatchObject({
        status: 'dry_run',
        dryRun: true,
        strictNoop: true,
        operationRole: role,
        sourceOperationCount: count,
        expandedCommandCount: count,
        worldEditLeftoverCount: 0,
      });
    }
    expect(read('block-entity-clearance.json')).toMatchObject({
      status: 'PASS',
      operationCount: 19,
      blockingBlockEntityCount: 0,
    });
  });

  it('binds the disposable Paper reversal and fail-closed park proof', () => {
    const proof = JSON.parse(fs.readFileSync(path.join(
      ROOT,
      'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/disposable-runtime-proof.json',
    ), 'utf8'));
    expect(proof).toMatchObject({
      status:
        'PASS_EXACT_PAPER_POWERED_SHUTTLE_REVERSAL_FAIL_CLOSED_TERMINAL_PARK_AND_CLEANUP',
      proofPayloadSha256:
        '79fac54245e1495d307f9fa324a2d3686cfb98fc271fa9752715d9ed9a76a434',
      mechanism: { totalBlockTransitionCount: 19, vehicleCount: 1 },
      functionalAcceptance: {
        westToEastObserved: true,
        eastToWestReturnObserved: true,
        terminalControlsDeEnergized: true,
        terminalRailsUnpowered: true,
        terminalVehicleStationary: true,
        vehicleExactCleanupPassed: true,
        blockExactCleanupPassed: true,
      },
    });
  });

  it('requires the whole occupancy envelope but accepts only the west park envelope', () => {
    const entity = read('r12q-b09-bounded-active-shuttle.candidate-manifest.json')
      .requiredEntityTransaction;
    expect(entity).toMatchObject({
      required: true,
      entityType: 'minecraft:minecart',
      deterministicTag: 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b',
      deterministicName: 'CZ R12 minecart 7464210e11d51e28',
      identitySeedSha256:
        '7464210e11d51e28eb4e133e2d40fd0b15bbb49f155e0c95ee02554c7b87f79e',
      deterministicUuidRequired: true,
      summonPosition: { x: 2058.5, y: 130.0625, z: -747.5 },
      transactionOccupancyEnvelope: {
        minX: 2058, maxX: 2073, minY: 130, maxY: 131, minZ: -748, maxZ: -747,
      },
      terminalParkEnvelope: {
        minX: 2058, maxX: 2059, minY: 130, maxY: 131, minZ: -748, maxZ: -747,
      },
      compensationOrder: [
        'tagged-minecart',
        'b09-active-shuttle-fail-closed-track',
        'b09-active-shuttle-fail-closed-controls',
      ],
    });
  });

  it('binds the executor while requiring the composed outer coordinator', () => {
    expect(read('offline-readiness.json')).toMatchObject({
      status:
        'PASS_BLOCK_PACKAGES_RUNTIME_AND_TAGGED_ENTITY_EXECUTOR_BOUND_READY_FOR_PROMOTION',
      scope: { blockTargetCount: 19, packageCount: 2, persistentVehicleCount: 1 },
      blockSafetyKernel: {
        blockingBlockEntities: 0,
        savedEntitiesInSourceHalo: 0,
        exactReversePackageOrder: true,
      },
      entityGate: {
        status: 'PASS_TAGGED_MINECART_EXECUTOR_AND_RUNTIME_PROOF_BOUND',
        printPlanPayloadSha256:
          'c0f6e9383c594e0003df35d3accc391ec8b46e47d547b6ce433dc1481e93a5cd',
        blockOnlyExecutionProhibited: true,
      },
    });
    expect(read('recoverable-integration-design.json')).toMatchObject({
      status: 'PASS_RECOVERABLE_COMPOSITION_CONTRACT_READY_FOR_COORDINATOR_BINDING',
      oneRecoverableTransactionPossible: true,
      existingBlockOnlyWrapperModified: false,
      executorBinding: {
        taggedMinecartExecutorSha256:
          'af9e68a5bf78b29f2845cdd084e78a8e7003637a21b837f7bfaeda992b778b7c',
        exactUuidTypeTagRollbackAnywhereInsideFullAabb: true,
        tagOnlyOrBroadCleanupAllowed: false,
      },
      atomicityBoundary: {
        requiresOuterCoordinatorLedger: true,
        currentBlockOnlyWrapperAloneSufficient: false,
        entityCompensationMustPrecedeBlockRollback: true,
        successfulTerminalSnapshotMustIncludeEntityRegions: true,
      },
    });
  });
});
