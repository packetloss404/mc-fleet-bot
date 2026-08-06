import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/record_combined_zones_shipwreck_removal_authorization.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.md',
);

function generate(directory: string, suffix: string) {
  const output = path.join(directory, `authorization-${suffix}.json`);
  const markdown = path.join(directory, `authorization-${suffix}.md`);
  execFileSync('node', [
    SCRIPT,
    '--accepted-on', '2026-08-06',
    '--out', output,
    '--markdown', markdown,
  ], { cwd: ROOT, stdio: 'pipe' });
  return {
    json: JSON.parse(fs.readFileSync(output, 'utf8')),
    jsonText: fs.readFileSync(output, 'utf8'),
    markdown: fs.readFileSync(markdown, 'utf8'),
  };
}

describe('Combined Zones shipwreck removal authorization', () => {
  it('records the exact owner-authorized removal scope without authorizing operations', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-shipwreck-auth-'));
    const { json: report, markdown } = generate(directory, 'scope');

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-shipwreck-removal-authorization',
      decision: 'AUTHORIZE_SHIPWRECK_AS_CONTROLLED_REMOVAL_SCOPE',
      actualApprovalText: '3: Shipwreck can be deleted',
      acceptedOnUtcDate: '2026-08-06',
      status: 'OWNER_POLICY_APPROVED_RELEASE_NOT_AUTHORIZED',
      effectivePlanningDisposition: {
        preserveInPlacePolicyRequired: false,
        shipwreckFabricPreservationPolicySuperseded: true,
        controlledRemovalMayBeDesigned: true,
        preserveOrRemoveOwnerChoiceResolved: true,
        exactOverlapMayBeClassifiedAsAcceptedTechnicalTreatment: false,
        boundingVolumeIsRemovalSet: false,
        currentPresentSetIsRemovalSet: false,
        terrainIceSnowAndSupportRemovalAuthorized: false,
        generatedStructureStartMetadataMayBeEditedDirectly: false,
      },
      subject: {
        relicKey: 'shipwreck',
        structureId: 'minecraft:shipwreck',
        censusAndAttributionSearchEnvelope: {
          cellCount: 2268,
          coordinateSetSha256:
            '715792eef84d4c3029a5750b0683adef6e0c5447b918512539c0d96f82cd2ee6',
        },
        observedPresentBaseline: {
          cellCount: 1118,
          chestCount: 3,
          packedIceCount: 515,
          snowCount: 5,
        },
        exactAttributedRemovalTargetCellSet: null,
        exactRemovalOperationCellSet: null,
        exactDesiredPostStateCellSet: null,
      },
      phase0EvidenceBinding: {
        generatedStartSubjectId: 'GS-037',
      },
      acknowledgedKnownCoordinationOverlap: {
        domainId: 'P1-B10/influence',
        generatedStartSubjectId: 'GS-037',
        protectedCoreSubjectId: 'CORE-shipwreck',
        cellCount: 126,
        coordinateSetSha256:
          '77350225547fce64783a9d3d3d8953631b847a733e9bc060211c13b952df0e98',
        reviewedEvidenceAtDecision: {
          gitCommit: '3f8931316e3a7c455ec61e43439594a4fd72a362',
          auditPayloadSha256:
            '44f03ae8531544a233c3f4de0af069617f23929477b3e078be2bbc4bd0640c95',
        },
      },
      safetyBoundary: {
        operationCellCount: 0,
        physicalReleaseAuthorized: false,
        worldEditAuthorized: false,
      },
    });
    expect(report.mandatoryRemovalPackageRequirements).toHaveLength(11);
    expect(markdown).toContain('OWNER AUTHORIZED CONTROLLED REMOVAL');
    expect(markdown).toContain('salvage chest contents');
  });

  it('regenerates the committed authorization byte-for-byte', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-shipwreck-committed-'));
    const generated = generate(directory, 'committed');

    expect(generated.jsonText).toBe(fs.readFileSync(COMMITTED_JSON, 'utf8'));
    expect(generated.markdown).toBe(fs.readFileSync(COMMITTED_MARKDOWN, 'utf8'));
  });

  it('is byte-deterministic for the accepted UTC date', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-shipwreck-determinism-'));
    const first = generate(directory, 'first');
    const second = generate(directory, 'second');

    expect(second.jsonText).toBe(first.jsonText);
    expect(second.markdown).toBe(first.markdown);
  });
});
