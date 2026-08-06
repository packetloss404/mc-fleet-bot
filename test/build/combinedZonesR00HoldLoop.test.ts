import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-r00-hold-loop-report.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-r00-hold-loop-report.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r00-loop-'));
const regeneratedJson = path.join(tempDir, 'report.json');
const regeneratedMarkdown = path.join(tempDir, 'report.md');

interface Check {
  id: string;
  passed: boolean;
  result: string;
}

interface GateResult {
  gateId: string;
  status: 'PASS' | 'HOLD';
  evidenceLayerStatus: string;
  checks: Check[];
  blockerIds: string[];
  rerunDecision: string;
  action: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  methodPolicy: {
    methods: Array<{ gateId: string; methodId: string }>;
  };
  foundationChecks: {
    r00SourceBindings: {
      checkedBindingCount: number;
      failureCount: number;
      passed: boolean;
    };
    completeSaveSha256: string;
    compositeCanonicalPayloadSha256: string;
    runtimeAuditIdentitySha256: string;
  };
  closureWorklists: {
    g05UndefinedExternalEndpoints: Array<{
      contractId: string;
      toOwnerId: null;
      receiverId: null;
      requiredClosure: string[];
    }>;
  };
  iterations: Array<{
    iteration: number;
    stateDigest: string;
    fixedPoint: boolean;
    gateResults: GateResult[];
  }>;
  summary: {
    targetGateCount: number;
    passCount: number;
    holdCount: number;
    allFiveGatesPass: boolean;
    iterationCount: number;
    maxIterations: number;
    stopReason: string;
    fixedPointReached: boolean;
    missingExternalEndpointCount: number;
    g05LayerAPassed: boolean;
    g05PhysicalDirectionalContractCount: number;
    g05PhysicalDirectionalPairCount: number;
    g05TechnicalContractCount: number;
    g05MissingTransitionPairManifestCount: number;
    g05MissingBeforeStateSetCount: number;
    g05MissingFutureStateSetCount: number;
    g05UnacceptedContractCount: number;
    technicalSourceRefreshStaleRowPassCount: number;
    ownerAcceptanceCount: number;
    realClientBeeMechanicProven: boolean;
    documentationPublicationAuthorized: boolean;
    masterPlanReadyUpdateAuthorized: boolean;
    worldShowcaseUpdateAuthorized: boolean;
    mainPushAuthorizedByGateCondition: boolean;
  };
  safetyBoundary: {
    readOnlyEvidenceEvaluation: boolean;
    productionServerContacted: boolean;
    productionWorldContacted: boolean;
    fleetApiContacted: boolean;
    rconContacted: boolean;
    systemdContacted: boolean;
    operationFilesCompiled: number;
    operationCellCount: number;
    worldEditAuthorized: boolean;
    physicalBuildAuthorized: boolean;
    executable: boolean;
  };
  reportIdentitySha256: string;
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/run_combined_zones_r00_hold_loop.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', '2026-08-06T21:50:00Z',
      '--max-iterations', '5',
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones R00 five-gate hold loop', () => {
  it('regenerates the committed report byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds all direct inputs and verifies the complete R00 source chain', () => {
    const report = readReport();
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      const data = fs.readFileSync(filename);
      expect(source.bytes, source.path).toBe(data.length);
      expect(source.sha256, source.path).toBe(sha256(data));
    }
    expect(report.foundationChecks.r00SourceBindings).toMatchObject({
      checkedBindingCount: 62,
      failureCount: 0,
      passed: true,
    });
  });

  it('evaluates all five gates and stops when every gate passes', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-r00-five-gate-hold-loop',
      status: 'PASS_ALL_FIVE_R00_GATES',
      summary: {
        targetGateCount: 5,
        passCount: 5,
        holdCount: 0,
        allFiveGatesPass: true,
        iterationCount: 1,
        maxIterations: 5,
        stopReason: 'ALL_FIVE_GATES_PASS',
        fixedPointReached: false,
      },
    });
    expect(report.methodPolicy.methods.map(({ gateId }) => gateId)).toEqual([
      'G02_DESIGN_DECISIONS',
      'G04_OWNERSHIP',
      'G05_INTERFACES',
      'G06_PROTECTED_FEATURES',
      'G07_CIVIL_HYDROLOGY_STRUCTURE',
    ]);
    expect(report.iterations).toHaveLength(1);
    expect(report.iterations[0].gateResults).toHaveLength(5);
  });

  it('records every gate as complete with its confirmation checks passing', () => {
    const results = readReport().iterations.at(-1)?.gateResults ?? [];
    expect(results.map(({ gateId, status, rerunDecision }) => ({
      gateId,
      status,
      rerunDecision,
    }))).toEqual([
      {
        gateId: 'G02_DESIGN_DECISIONS',
        status: 'PASS',
        rerunDecision: 'GATE_COMPLETE',
      },
      {
        gateId: 'G04_OWNERSHIP',
        status: 'PASS',
        rerunDecision: 'GATE_COMPLETE',
      },
      {
        gateId: 'G05_INTERFACES',
        status: 'PASS',
        rerunDecision: 'GATE_COMPLETE',
      },
      {
        gateId: 'G06_PROTECTED_FEATURES',
        status: 'PASS',
        rerunDecision: 'GATE_COMPLETE',
      },
      {
        gateId: 'G07_CIVIL_HYDROLOGY_STRUCTURE',
        status: 'PASS',
        rerunDecision: 'READY_INTEGRATED_DESIGN_AUDIT',
      },
    ]);
    expect(results.every(({ checks }) => checks.every(({ passed }) => passed)))
      .toBe(true);
  });

  it('emits one exact 13-endpoint G05 closure worklist', () => {
    const report = readReport();
    const endpoints = report.closureWorklists.g05UndefinedExternalEndpoints;
    expect(report.summary.missingExternalEndpointCount).toBe(13);
    expect(report.summary).toMatchObject({
      g05LayerAPassed: true,
      g05PhysicalDirectionalContractCount: 84,
      g05PhysicalDirectionalPairCount: 352931,
      g05TechnicalContractCount: 77,
      g05MissingTransitionPairManifestCount: 52,
      g05MissingBeforeStateSetCount: 161,
      g05MissingFutureStateSetCount: 161,
      g05UnacceptedContractCount: 161,
      technicalSourceRefreshStaleRowPassCount: 5,
    });
    expect(endpoints).toHaveLength(13);
    expect(new Set(endpoints.map(({ contractId }) => contractId)).size).toBe(13);
    expect(endpoints.every(({ toOwnerId, receiverId }) =>
      toOwnerId === null && receiverId === null)).toBe(true);
    expect(endpoints.every(({ requiredClosure }) =>
      requiredClosure.length === 5)).toBe(true);
  });

  it('authorizes documentation updates but no physical or live action', () => {
    const report = readReport();
    expect(report.summary).toMatchObject({
      documentationPublicationAuthorized: true,
      masterPlanReadyUpdateAuthorized: true,
      worldShowcaseUpdateAuthorized: true,
      mainPushAuthorizedByGateCondition: true,
      ownerAcceptanceCount: 0,
      realClientBeeMechanicProven: false,
    });
    expect(report.safetyBoundary).toEqual({
      readOnlyEvidenceEvaluation: true,
      productionServerContacted: false,
      productionWorldContacted: false,
      fleetApiContacted: false,
      rconContacted: false,
      systemdContacted: false,
      operationFilesCompiled: 0,
      operationCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      executable: false,
    });
  });
});
