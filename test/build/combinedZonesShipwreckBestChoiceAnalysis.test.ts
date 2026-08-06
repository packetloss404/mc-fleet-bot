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
    '--generated-at', '2026-08-06T04:50:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 60_000);

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
      schemaVersion: 2,
      status:
        'PASS_BEST_CHOICE_AND_EXACT_MINIMUM_SOUTH_OPEN_RESHAPE_COMPILED_REMOVAL_FALLBACK_ONLY',
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
          selectedPlanningMarginBlocks: 1,
          acceptedExpertMarginBlocks: null,
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
          exactPlanningGeometryCompiled: true,
          technicallyAcceptedGeometry: false,
          physicalImplementationAuthorized: false,
          removalAuthorizationRetainedAsFallback: true,
          removalIsCurrentPreferredPath: false,
          influenceOnlySubtractionRejectedAsEvidenceSuppression: true,
        },
        reshapeOptimization: {
          status:
            'PASS_EXACT_MINIMUM_SOUTH_OPEN_RESHAPE_SELECTED_ZERO_CORE_PLUS_PLANNING_MARGIN_OVERLAP_TECHNICAL_MARGIN_AND_CANONICAL_INTEGRATION_HOLD',
          sourceVerification: {
            acceptedCompleteSaveSha256:
              '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
            immutableCopy: true,
            projectScopeSourceEquivalent: true,
            baselineConstruction: {
              cellCount: 14768553,
              intervalManifestSha256:
                'ed95837647ab5f13699e93fcc17de691d4da5f08115c4be34734e238b19b4196',
            },
            baselineInteraction: {
              cellCount: 433549,
              intervalManifestSha256:
                '9dcae3deeefc09f563a47955dd7d3fba75eac8e8ca74f44ab26b24d3a4535ba8',
            },
            baselineInfluence: {
              cellCount: 1082149,
              intervalManifestSha256:
                '1a209dbae3552c0b49a7972f22c4838a30e09c8391bce8d20979a1b4f542447d',
            },
            baselineSupportGap: {
              cellCount: 754224,
              intervalManifestSha256:
                '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
            },
          },
          boundedSearch: {
            positivePlanningMarginsTested: [1, 2, 3, 4],
            strategyCount: 3,
            candidateCount: 12,
            eligibleCandidateCount: 4,
          },
          selectedPlanningReshape: {
            id: 'FM-01-SHIPWRECK-SOUTH-OPEN-TOE-RESHAPE-V1',
            positiveMargin: {
              selectedPlanningBlocks: 1,
              acceptedExpertMarginBlocks: null,
              expertMarginAccepted: false,
            },
            externalInteractionSetbackBlocks: 2,
            sparseNoBuildPlan: {
              bounds: {
                minX: 2070,
                maxX: 2101,
                minZ: -663,
                maxZ: -588,
              },
              columnCount: 2432,
              columnSetSha256:
                '26729597c4bd117debd943f9bf51a84825fcac4687825be575d4013c17268785',
              opensToSouthMountainExterior: true,
            },
            regeneratedDomains: {
              construction: {
                cellCount: 14684824,
                lostCellCountFromBase: 83729,
              },
              interaction: { cellCount: 435564 },
              influence: { cellCount: 1072137 },
              supportGap: {
                cellCount: 740620,
                removedCellCountFromBase: 13604,
                treatment: null,
              },
            },
            exactCorePlusPlanningMarginOverlap: {
              constructionCellCount: 0,
              interactionCellCount: 0,
              supportGapCellCount: 0,
              influenceCellCount: 0,
            },
            routeAndScopeChecks: {
              b08ChangedColumnCount: 0,
              b09ChangedColumnCount: 0,
              summitColumnRetained: true,
            },
          },
          disposition: {
            exactReshapeGeometryCompiled: true,
            exactConstructionInteractionInfluenceSupportRegeneratedFromSource: true,
            exactZeroCorePlusSelectedPlanningMarginOverlap: true,
            selectedPlanningMarginBlocks: 1,
            expertPositiveMarginAccepted: false,
            canonicalD05G03G06IntegrationComplete: false,
            technicalTreatmentAccepted: false,
            operationCompilationAuthorized: false,
          },
        },
      },
      disposition: {
        alternativesCompared: 4,
        noActionIncluded: true,
        lowerImpactAlternativesIncluded: true,
        rootCauseIntegrityGateEnforced: true,
        recommendedAlternativeId: 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE',
        exactReshapeGeometryCompiled: true,
        exactConstructionInteractionInfluenceSupportRegeneratedFromSource: true,
        exactZeroCorePlusSelectedPlanningMarginOverlap: true,
        selectedPlanningMarginBlocks: 1,
        expertPositiveMarginAccepted: false,
        canonicalD05G03G06IntegrationComplete: false,
        technicalTreatmentAccepted: false,
        removalPathActive: false,
        removalPathRetainedAsFallback: true,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        proposedGeometryCellCount: 14684824,
        acceptedGeometryCellCount: 0,
        acceptedRemovalTargetCellCount: 0,
        operationCellCount: 0,
        blockEditCount: 0,
        inventoryMoveCount: 0,
        serverStarted: false,
        liveWorldContacted: false,
        immutableCompleteSaveReadOnlyContacted: true,
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
