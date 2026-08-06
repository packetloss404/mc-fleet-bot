import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_shipwreck_canonical_integration.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.md',
);
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-shipwreck-integration-'));
const regeneratedJson = path.join(tempDirectory, 'integration.json');
const regeneratedMarkdown = path.join(tempDirectory, 'integration.md');

type JsonRecord = Record<string, any>;

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T06:00:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones shipwreck canonical integration', () => {
  it('regenerates the committed overlay byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('binds every source to its current identity', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    for (const source of Object.values(report.sourceBindings) as JsonRecord[]) {
      const filename = path.join(ROOT, source.path);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
  });

  it('integrates one scope while retaining exact ownership and zero protected overlap', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'PASS_COMPOSITE_G03_G04_G05_G06_GEOMETRY_INTEGRATION_EXACT_ZERO_GENERATED_START_AND_CORE_OVERLAP_EXPERT_MARGIN_AND_ACCEPTANCE_HOLD',
      compositeCanonicalModel: {
        representation: 'IMMUTABLE_G03_BASE_PLUS_HASH_BOUND_SINGLE_SCOPE_OVERLAY',
        replacedScopeId: 'P1-B10',
        compositeCanonicalPayloadSha256:
          '94eb21c4d72303bf5122b53b9963d8bf8ae26d9e8e8238e8c8d64f9d6671230f',
        immutableBaselineRewritten: false,
      },
      g03Integration: {
        scopeCount: 10,
        requiredDomainCount: 30,
        nonNullDomainCount: 30,
        replacedScopeCount: 1,
        replacedDomainCount: 3,
        unchangedScopeCount: 9,
      },
      g04OwnershipIntegration: {
        changeEnvelopeDisjointFromEveryOtherScope: true,
        compositeObservedPhysicalUnionCellCount: 15205262,
        compositeCanonicalOwnerUnionCellCount: 15205262,
        compositeUnownedCellCount: 0,
        compositeMultiplyOwnedCellCount: 0,
        compositeInfluenceStewardshipCellCount: 1072137,
        finalOwnerAcceptanceRecorded: false,
      },
      g05InterfaceIntegration: {
        changedCellsIntersectAnotherScope: false,
        existingCrossScopeContractCellSetsChanged: false,
        exactDirectionalAdjacencyContractCount: 84,
        g05Passed: false,
      },
      g06GeometryIntegration: {
        generatedStartCount: 114,
        protectedCoreCount: 3,
        compositeGeneratedStartOverlapCellCount: 0,
        compositeProtectedCoreOverlapCellCount: 0,
        allThirtyDomainsExactZeroAgainstGeneratedStarts: true,
        allThirtyDomainsExactZeroAgainstFrozenCores: true,
        expertPositiveMarginAccepted: false,
        occupiedD06BeeNestTreatmentAccepted: false,
        g06Passed: false,
      },
      disposition: {
        compositeCanonicalIntegrationCompiled: true,
        canonicalD05G03G04G05G06GeometryIntegrationComplete: true,
        exactZeroGeneratedStartAndProtectedCoreOverlapEstablished: true,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        operationCellCount: 0,
        productionServerContacted: false,
        productionWorldContacted: false,
        productionBlockEditCount: 0,
        worldEditAuthorized: false,
        executable: false,
      },
    });
    expect(report.g03Integration.otherScopeChecks.every(
      ({ changeEnvelopeDisjoint }: JsonRecord) => changeEnvelopeDisjoint,
    )).toBe(true);
  });
});
