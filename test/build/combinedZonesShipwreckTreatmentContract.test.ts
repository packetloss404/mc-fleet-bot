import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_shipwreck_treatment_contract.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-treatment-contract.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-treatment-contract.md',
);
const tempDirectory = fs.mkdtempSync(path.join(
  os.tmpdir(),
  'combined-zones-shipwreck-treatment-',
));
const regeneratedJson = path.join(tempDirectory, 'contract.json');
const regeneratedMarkdown = path.join(tempDirectory, 'contract.md');

type JsonRecord = Record<string, any>;

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T04:05:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones shipwreck treatment contract', () => {
  it('regenerates the committed contract byte-for-byte', () => {
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

  it('partitions the envelope and protects natural context and loot chests', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'PARTIAL_PASS_EXACT_598_FABRIC_TARGET_CANDIDATE_AND_AIR_MAPPING_THREE_LOOT_CHESTS_UNMATERIALIZED_TECHNICAL_AND_RELEASE_HOLD',
      treatmentPayload: {
        subject: {
          generatedStartSubjectId: 'GS-037',
          protectedCoreSubjectId: 'CORE-shipwreck',
          envelopeCellCount: 2268,
          completeSaveSha256:
            '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
        },
        exactEnvelopeClassification: {
          cellCount: 2268,
        },
        attributedRemovalTargetCandidate: {
          accepted: false,
          cellCount: 598,
          coordinateSetSha256:
            '33e498b16e381872b2a52050561fcbd282441f323de2fe2a2e07a49ef9f29748',
          componentCount: 1,
          largestComponentCellCount: 598,
        },
        preservedContext: {
          acceptedPreservationRule: true,
          packedIceCellCount: 515,
          snowCellCount: 5,
          airCellCount: 1150,
          unattributedCellCount: 0,
        },
        candidateDesiredPostState: {
          accepted: false,
          cellCount: 598,
          desiredState: 'minecraft:air',
        },
        chestSalvageContract: {
          accepted: false,
          chestCount: 3,
          lootTableUnmaterializedCount: 3,
          knownInventoryContentCount: 0,
          exactControlledDestination: null,
        },
      },
      disposition: {
        exactEnvelopePartitioned: true,
        exactAttributionCandidateCompiled: true,
        attributionTechnicallyAccepted: false,
        exactCandidateDesiredStateCompiled: true,
        candidateDesiredStateTechnicallyAccepted: false,
        chestContentsMaterialized: false,
        technicalTreatmentAccepted: false,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        acceptedRemovalTargetCellCount: 0,
        acceptedDesiredStateCellCount: 0,
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

    const cells = report.treatmentPayload.exactEnvelopeClassification.cells;
    expect(cells).toHaveLength(2268);
    expect(cells.filter(({ classification }: JsonRecord) => (
      classification === 'ATTRIBUTED_SHIPWRECK_FABRIC_CANDIDATE_REMOVAL'
    ))).toHaveLength(598);
    expect(report.treatmentPayload.chestSalvageContract.chests).toHaveLength(3);
    expect(report.treatmentPayload.chestSalvageContract.chests.every(
      ({ lootTableUnmaterialized, inventoryContentsKnown }: JsonRecord) => (
        lootTableUnmaterialized === true && inventoryContentsKnown === false
      ),
    )).toBe(true);
  });
});
