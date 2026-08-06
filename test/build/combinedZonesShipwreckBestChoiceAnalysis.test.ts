import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_shipwreck_best_choice_analysis.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.md',
);
const tempDirectory = fs.mkdtempSync(path.join(
  os.tmpdir(),
  'combined-zones-shipwreck-best-choice-',
));
const regeneratedJson = path.join(tempDirectory, 'analysis.json');
const regeneratedMarkdown = path.join(tempDirectory, 'analysis.md');

type JsonRecord = Record<string, any>;

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T04:20:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones shipwreck best-choice analysis', () => {
  it('regenerates the committed analysis byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('binds every evidence source to its current file identity', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    for (const source of Object.values(report.sourceBindings) as JsonRecord[]) {
      const filename = path.join(ROOT, source.path);
      expect(fs.existsSync(filename), source.path).toBe(true);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
  });

  it('selects root-cause local reshape and rejects removal as the active path', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'PASS_BEST_CHOICE_PRESERVE_AND_LOCAL_P1_B10_RESHAPE_SELECTED_REMOVAL_FALLBACK_ONLY',
      analysisPayload: {
        actualBlocker: {
          domainId: 'P1-B10/influence',
          uniqueOverlapCellCount: 126,
          recordsDescribeSamePhysicalCellSet: true,
          constructionOverlapCellCount: 0,
          interactionOverlapCellCount: 0,
          influenceOverlapCellCount: 126,
          influenceIsAcceptedExpertKernel: false,
          influenceContainsUnresolvedSupportGapReservation: true,
          sourceSupportGapTreatment: null,
        },
        decisionContext: {
          protectedRelicWithheldConstructionCellCount: 1977,
          shipwreckCoreCellCount: 2268,
          positiveMarginBlocks: null,
          controlledRemovalMayBeDesigned: true,
          controlledRemovalRequired: false,
          generatedStartMetadataEditable: false,
          generatedStartRemainsEvidenceAfterFabricRemoval: true,
          removalTargetCandidateCellCount: 598,
          unmaterializedLootChestCount: 3,
          knownInventoryContentCount: 0,
        },
        recommendation: {
          alternativeId: 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE',
          weightedScore: 94,
          planningDirectionSelectedForNextOfflineDevelopment: true,
          technicallyAcceptedGeometry: false,
          physicalImplementationAuthorized: false,
          removalAuthorizationRetainedAsFallback: true,
          removalIsCurrentPreferredPath: false,
          influenceOnlySubtractionRejectedAsEvidenceSuppression: true,
        },
      },
      disposition: {
        alternativesCompared: 4,
        noActionIncluded: true,
        lowerImpactAlternativesIncluded: true,
        rootCauseIntegrityGateEnforced: true,
        recommendedAlternativeId: 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE',
        exactReshapeGeometryCompiled: false,
        technicalTreatmentAccepted: false,
        removalPathActive: false,
        removalPathRetainedAsFallback: true,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        proposedGeometryCellCount: 0,
        acceptedGeometryCellCount: 0,
        acceptedRemovalTargetCellCount: 0,
        operationCellCount: 0,
        blockEditCount: 0,
        inventoryMoveCount: 0,
        serverStarted: false,
        liveWorldContacted: false,
        physicalReleaseAuthorized: false,
        worldEditAuthorized: false,
        executable: false,
      },
    });

    const alternatives = report.analysisPayload.alternatives;
    expect(alternatives).toHaveLength(4);
    expect(alternatives.filter(({ eligible }: JsonRecord) => eligible)).toHaveLength(1);
    expect(alternatives.map(({ id, weightedScore }: JsonRecord) => [id, weightedScore]))
      .toEqual([
        ['BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE', 94],
        ['BC-02-SUBTRACT-INFLUENCE-ONLY', 70],
        ['BC-03-NO-CHANGE', 58],
        ['BC-04-FULL-598-CELL-CONTROLLED-REMOVAL', 34],
      ]);
  });
});
