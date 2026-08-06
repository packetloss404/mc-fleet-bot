import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_technical_source_refresh.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.md',
);
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-technical-refresh-'));
const regeneratedJson = path.join(tempDirectory, 'refresh.json');
const regeneratedMarkdown = path.join(tempDirectory, 'refresh.md');

type JsonRecord = Record<string, any>;

function readReport(): JsonRecord {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
}

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T07:30:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones technical source refresh', () => {
  it('regenerates the committed supplement byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('binds every direct input to its current file identity', () => {
    const report = readReport();
    for (const source of Object.values(report.sourceBindings) as JsonRecord[]) {
      const filename = path.join(ROOT, source.path);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
  });

  it('closes only source rows with exact scoped evidence', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-technical-source-refresh',
      status:
        'PARTIAL_PASS_FIVE_STALE_SOURCE_ROWS_CLOSED_D06_PERSISTENT_POI_AND_TECHNICAL_ACCEPTANCE_HOLD',
      completeSaveIdentity: {
        completeSaveSha256:
          '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
        projectScopeSourceEquivalent: true,
        generatedStartCensusSourceEquivalent: true,
      },
      summary: {
        staleSourceRowPassCount: 5,
        exactScopedDomainCount: 15,
        exactScopedGeneratedStartEvaluationCount: 1710,
        clearedScopeCount: 4,
        d06CompleteSaveSourceRowPassed: true,
        d06PersistentPoiHoldCount: 1,
        technicalAcceptanceClaimed: false,
        g02Passed: false,
        g07Passed: false,
        r00Passed: false,
      },
    });

    const refreshes = new Map<string, JsonRecord>(
      report.scopedRefreshes.map((refresh: JsonRecord) => [refresh.scopeId, refresh]),
    );
    for (const scopeId of ['D02', 'P1-B09', 'P1-B11', 'P1-B12']) {
      expect(refreshes.get(scopeId)).toMatchObject({
        sourceEquivalent: true,
        exactDomainCount: 3,
        generatedStartSubjectCountPerDomain: 114,
        generatedStartOverlapCellCount: 0,
        entityConflictCount: 0,
        poiConflictCount: 0,
        effectiveRow: {
          technicalAcceptanceClaimed: false,
        },
      });
      expect(refreshes.get(scopeId)?.effectiveRow.result).toMatch(/^PASS_/);
    }
  });

  it('passes D06 source completeness while preserving the occupied POI hold', () => {
    const d06 = readReport().scopedRefreshes.find(
      ({ scopeId }: JsonRecord) => scopeId === 'D06',
    );
    expect(d06).toMatchObject({
      completeSaveSourceRow: {
        id: 'D06-MC-11-COMPLETE-SAVE',
        result: 'PASS_COMPLETE_SAVE_SOURCE_COMPLETENESS',
        legacyResult: 'HOLD',
        technicalAcceptanceClaimed: false,
      },
      detailedClearanceRow: {
        id: 'D06-SET-H08-COMPLETE-SAVE-ENTITY-POI-ALL-START',
        result: 'COMPLETE_SAVE_PASS_PERSISTENT_D06_POI_HOLD',
        legacyResult: 'HOLD_COMPLETE_SAVE',
      },
      generatedStartOverlapCellCount: 0,
      entityConflictCount: 0,
      poiConflictCount: 1,
      persistentPoi: {
        poiType: 'minecraft:bee_nest',
        blockPosition: { x: 1849, y: 66, z: 145 },
        colonyMemberCount: 3,
      },
      technicalAcceptanceClaimed: false,
    });
  });

  it('separates pre-R00 commissioning design from post-build G17 results', () => {
    const lifecycle = readReport().commissioningLifecycle;
    expect(lifecycle).toMatchObject({
      authoritativeBoundary: {
        g02GateId: 'G02_DESIGN_DECISIONS',
        g02Stage: 'design',
        g17GateId: 'G17_FUNCTIONAL_POST_QA',
        g17Stage: 'postrelease',
        postBuildResultsMayResolveG02: false,
      },
      preR00DesignEvidence: {
        commissioningSpecificationCount: 29,
        uniqueSpecificationCount: 29,
        structurallyCompleteSpecificationCount: 29,
        operationCount: 0,
        specificationSetFrozen: true,
        specificationSetTechnicallyAccepted: false,
        effectiveD06Mc23: {
          result: 'HOLD_COMMISSIONING_DESIGN_TECHNICAL_ACCEPTANCE_REQUIRED',
        },
      },
      postBuildEvidence: {
        gateId: 'G17_FUNCTIONAL_POST_QA',
        executedResultCount: 0,
        requiredBeforeR00: false,
        currentResult: 'DEFERRED_TO_G17_AFTER_SEPARATELY_AUTHORIZED_PHYSICAL_RELEASE',
      },
      legacyCycleRemoved: true,
      technicalAcceptanceClaimed: false,
      commissioningPassed: false,
    });
  });

  it('retains the nonphysical safety boundary', () => {
    expect(readReport().safetyBoundary).toEqual({
      additiveEvidenceOnly: true,
      historicalArtifactRewriteCount: 0,
      productionServerContacted: false,
      productionWorldContacted: false,
      fleetApiContacted: false,
      rconContacted: false,
      systemdContacted: false,
      operationFileCount: 0,
      operationCellCount: 0,
      materialCellCount: 0,
      worldEditAuthorized: false,
      physicalReleaseAuthorized: false,
      executable: false,
    });
  });
});
