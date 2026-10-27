import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  scopeLocalPackageIsExecutionReady,
  validateReleaseContract,
} from '../../scripts/validate_combined_zones_release_contract.mjs';

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

const EXPECTED_DIRECTIVE = 'remove all that you recommend and implement these 10 changes, then fan out a team of subagents to figure out the next move to build. I do not want to circle jerk and talk about building i want to build.';

describe('Masterplan 05 scope-local release contract', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  it('binds every authority source by its current SHA-256', () => {
    expect(contract.authorityBindings.length).toBeGreaterThanOrEqual(7);
    for (const binding of contract.authorityBindings) {
      const filename = path.join(ROOT, binding.path);
      expect(fs.existsSync(filename), binding.path).toBe(true);
      expect(binding.sha256, binding.path).toBe(sha256(filename));
    }
  });

  it('is a non-operation control record with standing scoped build authority', () => {
    expect(contract).toMatchObject({
      status: 'BOUNDED_MVP_ACCEPTED_STANDING_SCOPE_LOCAL_BUILD_AUTHORIZED',
      executable: false,
      worldEditAuthorized: true,
      currentState: {
        r00: 'COMPLETE_7_OF_7_PASS',
        r01ThroughR06: 'MATERIALLY_EXECUTED_AS_BUILT',
        r07a: {
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
          preCompleteSaveSha256: '4e35e31cc2be3ff85c19f30b16a8ddaf9465aa7e22dbb48025f137ab07b1c115',
          postCompleteSaveSha256: '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
        },
        r07ThroughR12: 'BOUNDED_MVP_DEPENDENCIES_COMPLETE_6_OF_6',
        r13: 'PASS_R13_CONSOLIDATED_MVP_ACCEPTED_G16_G19',
      },
      scopeLocalReleasePolicy: {
        globalSerialDependencyRequired: false,
        disjointPackagesMayAdvanceInParallel: true,
        blockerPropagation: 'EXACT_TARGET_AND_DEPENDENT_INTERFACES_ONLY',
        standingOwnerApprovalRequiresRepeatConversation: false,
        packageMustBindStandingAuthorization: true,
        historicalStatusMayOverrideCurrentLedger: false,
      },
      advancementRule: {
        operator: 'SCOPE_LOCAL_AND',
        allApplicablePackageGatesMustPass: true,
        zeroFailedGatesRequired: true,
        zeroMissingGatesRequired: true,
        zeroStaleGatesRequired: true,
        allowManualOverride: false,
        allowNarrativeEquivalence: false,
        allowScopedEvidenceAsFinal: false,
        allowDisjointParallelExecution: true,
        blockerPropagation: 'EXACT_SCOPE_ONLY',
        currentResult: 'BOUNDED_MVP_ACCEPTED_POST_MVP_SCOPE_LOCAL_ELIGIBILITY',
      },
    });
  });

  it('binds the exact owner directive and six-part standing safety kernel', () => {
    const authorizationPath = path.join(ROOT, contract.currentState.standingAuthorization);
    const authorization = JSON.parse(fs.readFileSync(authorizationPath, 'utf8'));
    expect(authorization).toMatchObject({
      status: 'AUTHORIZED_STANDING_SCOPED_EXECUTION',
      revoked: false,
      projectId: 'combined-zones-phase1',
      ownerDirective: {
        exactText: EXPECTED_DIRECTIVE,
      },
      operationalControls: {
        defaultMode: 'PREPARE_ONLY',
        liveExecutionOptIn: '--execute',
        globalGateDependency: 'NONE',
      },
    });
    expect(contract.hardSafetyKernel).toHaveLength(6);
    expect(authorization.hardSafetyKernel).toHaveLength(6);
    expect(authorization.hardSafetyKernel.every(
      (item: { required: boolean }) => item.required,
    )).toBe(true);
  });

  it('records all seven decisions resolved at the completed R00 boundary', () => {
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
    expect(contract.designDecisions.every(
      (decision: { state: string }) => decision.state === 'RESOLVED',
    )).toBe(true);
    expect(contract.decisionResolutionBoundary).toMatchObject({
      g02Closure: 'COMPLETE_AT_R00',
      historicalClosureBoundary: 'PRE_R00_DESIGN_ACCEPTANCE_ONLY',
      descendantReleaseEvidenceMayResolveG02: false,
    });
  });

  it('records R00 complete, R01-R06 as-built, and a cycle-free scope-local DAG', () => {
    expect(contract.releaseSequence).toHaveLength(14);
    expect(contract.releaseSequence[0].id).toBe('CZ-R00-PHASE1-DESIGN-FREEZE');
    expect(contract.releaseSequence[0].status).toBe('COMPLETE_7_OF_7_PASS');
    expect(contract.releaseSequence.slice(1, 7).every(
      (release: { status: string }) => /AS_BUILT/.test(release.status),
    )).toBe(true);
    expect(contract.releaseSequence[7]).toMatchObject({
      id: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      status: 'BOUNDED_MVP_AS_BUILT_ACCEPTED_R07A_R07K',
      realizedAs: {
        completedSubscopeId: 'CZ-R07A-P1-B03-PORTAL-TUBE',
        status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        shellStrictSuccesses: '7632/7632',
        openingStrictSuccesses: '53/53',
        rollbackPoststate: '100_PERCENT_PASS',
      },
    });
    expect(contract.releaseSequence.at(-1).id).toBe(
      'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
    );
    const byId = new Map(contract.releaseSequence.map(
      (release: { id: string }) => [release.id, release],
    ));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string): boolean => {
      if (visited.has(id)) return true;
      if (visiting.has(id)) return false;
      const release = byId.get(id) as { dependsOn: string[] } | undefined;
      if (!release) return false;
      visiting.add(id);
      if (!release.dependsOn.every(visit)) return false;
      visiting.delete(id);
      visited.add(id);
      return true;
    };
    expect(contract.releaseSequence.every(
      (release: { id: string }) => visit(release.id),
    )).toBe(true);
    const r11 = byId.get('CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR') as {
      dependsOn: string[];
    };
    expect(r11.dependsOn).toEqual(['CZ-R00-PHASE1-DESIGN-FREEZE']);
  });

  it('partitions the 19 gates into inherited, scope-local, and consolidated stages', () => {
    const gateIds = contract.gateDefinitions.map((gate: { id: string }) => gate.id);
    expect(gateIds).toHaveLength(19);
    expect(new Set(gateIds).size).toBe(19);
    expect(contract.physicalReleaseLifecycleGateSets).toEqual({
      inheritedR00Baseline: gateIds.slice(0, 2),
      scopeLocalPrerelease: gateIds.slice(2, 14),
      execution: ['G15_ATOMIC_EXECUTION'],
      scopeLocalPostrelease: gateIds.slice(15, 17),
      mvpConsolidatedAcceptance: gateIds.slice(17, 19),
      rule: 'Evaluate only gates applicable to the exact package. R00 baseline decisions are inherited. G18-G19 are consolidated MVP gates, not physical-start gates.',
    });
    for (const release of contract.releaseSequence.filter(
      (candidate: { kind: string }) => candidate.kind.startsWith('physical-'),
    )) {
      expect(release.requiredGateLifecycle, release.id).toBe(
        'SCOPE_LOCAL_HARD_SAFETY_KERNEL',
      );
    }
  });

  it('keeps optional systems outside the MVP completion gate', () => {
    expect(contract.mvpBoundary).toMatchObject({
      status: 'FROZEN',
      deferredNonBlockingScopes: [
        'P1-B12 Grand Avenue passive shell',
        'C2 visitor portal',
        'C3 PassageWay connection',
        'opening or commissioning the eight future Empty Eight line stubs',
      ],
    });
    const r13 = contract.releaseSequence.at(-1);
    expect(r13.excludesDeferredScopes).toEqual([
      'P1-B12',
      'C2',
      'C3',
      'eight future Empty Eight line openings',
    ]);
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
  });

  it('passes structural validation and opens local package preparation', () => {
    const report = validateReleaseContract(CONTRACT_PATH);
    expect(report).toMatchObject({
      status: 'BOUNDED_MVP_ACCEPTED_STANDING_SCOPE_LOCAL_BUILD_AUTHORIZED',
      contractValid: true,
      ready: true,
      errors: [],
      executionReadyReleaseIds: [],
      unsafeExecutionReadyReleaseIds: [],
    });
    expect(report.blockerCount).toBe(2);
    expect(report.unresolvedDecisionIds).toEqual([]);
    expect(report.missingToolingIds).toEqual([]);
    expect(report.incompleteGateEvaluationIds).toEqual([]);
    expect(report.eligibleReleaseIds).toEqual([]);
  });

  it('rejects a physical release labeled execution-ready without bound safety evidence', () => {
    const unsafe = structuredClone(contract);
    const release = unsafe.releaseSequence.find(
      (candidate: { id: string }) => (
        candidate.id === 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK'
      ),
    );
    release.status = 'EXECUTION_READY';
    expect(scopeLocalPackageIsExecutionReady(
      release,
      JSON.parse(fs.readFileSync(
        path.join(ROOT, contract.currentState.standingAuthorization),
        'utf8',
      )),
    )).toBe(false);

    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'combined-zones-release-contract-'),
    );
    const unsafePath = path.join(temporaryDirectory, 'unsafe-contract.json');
    try {
      fs.writeFileSync(unsafePath, `${JSON.stringify(unsafe, null, 2)}\n`);
      const report = validateReleaseContract(unsafePath);
      expect(report.contractValid).toBe(false);
      expect(report.errors).toContain(
        'unsafe-execution-ready-release:CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      );
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
