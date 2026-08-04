import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { validateReleaseContract } from '../../scripts/validate_combined_zones_release_contract.mjs';

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-release-contract.json',
);

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

describe('Masterplan 05 deterministic release contract', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  it('binds every authority source by its current SHA-256', () => {
    expect(contract.authorityBindings.length).toBeGreaterThanOrEqual(7);
    for (const binding of contract.authorityBindings) {
      const filename = path.join(ROOT, binding.path);
      expect(fs.existsSync(filename), binding.path).toBe(true);
      expect(binding.sha256, binding.path).toBe(sha256(filename));
    }
  });

  it('is non-executable and cannot authorize a world edit', () => {
    expect(contract).toMatchObject({
      status: 'CONTRACT_VALID_BUILD_BLOCKED',
      executable: false,
      worldEditAuthorized: false,
      advancementRule: {
        operator: 'AND',
        allRequiredGatesMustPass: true,
        zeroFailedGatesRequired: true,
        zeroMissingGatesRequired: true,
        zeroStaleGatesRequired: true,
        allowManualOverride: false,
        allowNarrativeEquivalence: false,
        allowScopedEvidenceAsFinal: false,
        currentResult: 'BLOCKED',
      },
    });
    expect(contract.releaseSequence.every(
      (release: { status: string }) => release.status === 'BLOCKED',
    )).toBe(true);
  });

  it('binds resolved decisions while keeping the three remaining decisions blocking', () => {
    expect(contract.designDecisions.map(
      (decision: { id: string }) => decision.id,
    )).toEqual([
      'D01_WORLD_VERTICAL_STRATEGY',
      'D02_C1_CIVIL_ALIGNMENT',
      'D03_MAINSTREET_L2_GATE',
      'D04_RAIL_DELIVERY',
      'D05_MOUNTAIN_HYDROLOGY_RELIC_BUFFERS',
      'D06_EMPTY_EIGHT_DETAIL',
      'D07_GEOLOGY_AND_OPTIONAL_PORTAL',
    ]);
    const byId = new Map(contract.designDecisions.map(
      (decision: { id: string }) => [decision.id, decision],
    ));
    for (const id of [
      'D01_WORLD_VERTICAL_STRATEGY',
      'D03_MAINSTREET_L2_GATE',
      'D04_RAIL_DELIVERY',
      'D07_GEOLOGY_AND_OPTIONAL_PORTAL',
    ]) {
      expect(byId.get(id)).toMatchObject({
        state: 'RESOLVED',
        machineEvidence: {
          path: 'masterplans/05-combined-zones/phase1-design-decisions.json',
        },
      });
    }
    for (const id of [
      'D02_C1_CIVIL_ALIGNMENT',
      'D05_MOUNTAIN_HYDROLOGY_RELIC_BUFFERS',
      'D06_EMPTY_EIGHT_DETAIL',
    ]) {
      expect(byId.get(id)).toMatchObject({
        state: 'UNRESOLVED',
        machineEvidence: null,
      });
    }
  });

  it('defines one strict serial release graph from design freeze to acceptance', () => {
    expect(contract.releaseSequence).toHaveLength(14);
    contract.releaseSequence.forEach((release: any, index: number) => {
      expect(release.dependsOn).toEqual(
        index === 0 ? [] : [contract.releaseSequence[index - 1].id],
      );
    });
    expect(contract.releaseSequence[0].id).toBe('CZ-R00-PHASE1-DESIGN-FREEZE');
    expect(contract.releaseSequence.at(-1).id).toBe(
      'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
    );
  });

  it('requires a non-cyclic full gate lifecycle for every physical transaction', () => {
    const gateIds = contract.gateDefinitions.map((gate: { id: string }) => gate.id);
    expect(gateIds).toHaveLength(19);
    expect(new Set(gateIds).size).toBe(19);
    expect(contract.physicalReleaseLifecycleGateSets).toEqual({
      mayStartTransaction: gateIds.slice(0, 14),
      execution: ['G15_ATOMIC_EXECUTION'],
      mayBecomeAccepted: gateIds,
    });
    for (const release of contract.releaseSequence.filter(
      (candidate: { kind: string }) => candidate.kind.startsWith('physical-'),
    )) {
      expect(release.requiredGateLifecycle, release.id).toBe(
        'ALL_PHYSICAL_RELEASE_LIFECYCLE_GATES',
      );
    }
  });

  it('makes ownership, protected features, bijection and snapshot identity fail closed', () => {
    expect(contract.globalInvariants).toMatchObject({
      planningEnvelopeIsNotConstructionOwnership: true,
      integerTargetCellSetRequired: true,
      exactlyOneOwnerPerInteractionCell: true,
      unownedCellCountRequired: 0,
      multiplyOwnedCellCountRequired: 0,
      undeclaredCrossScopeInterfaceCountRequired: 0,
      crossPackageInteractionCellCountRequired: 0,
      protectedFeaturesDefaultDeny: true,
      generatedStructuresDefaultDeny: true,
      forwardRollbackTargetBijectionRequired: true,
      forwardRollbackTransitionInversionRequired: true,
      wildcardSourceMasksAllowed: false,
      naturalTransitionPolicyAllowedForForward: false,
      strictNoopRequired: true,
      narrativeOverrideAllowed: false,
      partialEvidenceAllowed: false,
    });
    expect(contract.snapshotPolicy.requiredForEveryPhysicalRelease).toMatchObject({
      freshImmutableSnapshot: true,
      completeRegionSet: true,
      snapshotSha256Required: true,
      compilerSourceSnapshotMustMatch: true,
      ownershipAuditSnapshotMustMatch: true,
      forwardPreflightSnapshotMustMatch: true,
      authorizationSnapshotMustMatch: true,
      transactionPreSnapshotMustMatch: true,
      partialOrScopedPreflightMaySatisfyFinalGate: false,
      newSnapshotRequiredAfterEveryCommitOrCompletedRollback: true,
    });
    expect(contract.protectedNoTouchSubjects).toHaveLength(3);
    expect(contract.protectedNoTouchSubjects.every(
      (subject: {
        exactProtectedCoreCellSet: unknown;
        exactReviewedBufferCellSet: unknown;
      }) => (
        subject.exactProtectedCoreCellSet !== null
        && subject.exactReviewedBufferCellSet === null
      ),
    )).toBe(true);
  });

  it('passes structural validation while reporting the build blocked', () => {
    const report = validateReleaseContract(CONTRACT_PATH);
    expect(report).toMatchObject({
      status: 'CONTRACT_VALID_BUILD_BLOCKED',
      contractValid: true,
      ready: false,
      errors: [],
    });
    expect(report.blockerCount).toBeGreaterThan(0);
    expect(report.missingToolingIds).toEqual([
      'T01_COMBINED_ZONES_COMPILER',
      'T02_GLOBAL_OWNERSHIP_INTERFACE_GATE',
      'T03_PROJECT_RELEASE_WRAPPER',
      'T04_POST_RELEASE_VERIFIER',
    ]);
    expect(report.unresolvedDecisionIds).toEqual([
      'D02_C1_CIVIL_ALIGNMENT',
      'D05_MOUNTAIN_HYDROLOGY_RELIC_BUFFERS',
      'D06_EMPTY_EIGHT_DETAIL',
    ]);
    expect(report.incompleteProtectedSubjects).toEqual([
      'RELIC-IGLOO-WEST',
      'RELIC-IGLOO-EAST',
      'RELIC-SHIPWRECK',
    ]);
    expect(report.semanticGateBlockers).toEqual([
      'bound-decision-ledger-not-pass',
      'bound-protected-feature-gate-not-pass',
      'bound-c1-physical-pilot-not-pass',
      'bound-site-phase1-exit-not-pass',
    ]);
    expect(report.incompleteGateEvaluationIds).toEqual(
      contract.physicalReleaseLifecycleGateSets.mayStartTransaction,
    );
  });
});
