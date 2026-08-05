import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(ROOT, 'scripts/compile_combined_zones_g03_canonical_setout.mjs');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-g03-canonical-setout.md',
);

type JsonRecord = Record<string, any>;

function compile(directory: string, suffix: string) {
  const output = path.join(directory, `g03-${suffix}.json`);
  const markdown = path.join(directory, `g03-${suffix}.md`);
  execFileSync('node', [
    COMPILER,
    '--generated-at', '2026-08-05T05:15:00Z',
    '--out', output,
    '--markdown', markdown,
  ], { cwd: ROOT, stdio: 'pipe' });
  return {
    json: JSON.parse(fs.readFileSync(output, 'utf8')) as JsonRecord,
    jsonText: fs.readFileSync(output, 'utf8'),
    markdown: fs.readFileSync(markdown, 'utf8'),
  };
}

function scope(report: JsonRecord, id: string) {
  return report.scopeRegistry.find((record: JsonRecord) => record.scopeId === id);
}

describe('combined-zones G03 canonical setout compiler', () => {
  it('normalizes exact selected proposals without passing G03 or authorizing operations', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g03-'));
    const { json: report, jsonText, markdown } = compile(directory, 'primary');

    expect(jsonText).toBe(fs.readFileSync(COMMITTED_JSON, 'utf8'));
    expect(markdown).toBe(fs.readFileSync(COMMITTED_MARKDOWN, 'utf8'));
    expect(report.schemaVersion).toBe(2);
    expect(report.status).toBe(
      'PARTIAL_PASS_G03_V2_EXACT_AVAILABLE_INTEGER_SET_OUT_COMPILED_G03_HOLD',
    );
    expect(report.scopeRegistry.map((record: JsonRecord) => record.scopeId)).toEqual([
      'P1-B03',
      'P1-B07',
      'P1-B08',
      'P1-B09',
      'P1-B10',
      'D02',
      'D06-RESERVATIONS',
      'D06-MECHANISMS',
      'P1-B11',
      'P1-B12',
    ]);

    expect(scope(report, 'P1-B03').construction).toMatchObject({
      cellCount: 15972,
      coordinateSetSha256: '82d5fd4e5bdc0f21f2c8b47bfd8d69b4f7f6aa097a641890b02a4c330fc8df15',
      accepted: false,
      operationAuthorization: false,
    });
    expect(scope(report, 'P1-B07')).toMatchObject({
      selectedIdentity: 'B07-C-WEST-2',
      construction: { cellCount: 8134 },
      interaction: { cellCount: 13608 },
    });
    expect(scope(report, 'P1-B08')).toMatchObject({
      construction: { cellCount: 7878 },
      interaction: { cellCount: 15096 },
    });
    expect(scope(report, 'P1-B09')).toMatchObject({
      construction: { exactIntegerCellManifest: null },
      interaction: {
        cellCount: 7800,
        coordinateSetSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
      },
      influence: { exactIntegerCellManifest: null },
      exactTechnicalReservationLedger: {
        reportIdentitySha256: 'e4140d2193fec084e8e17ae8e1e071683e62d7cbea20a32ebcf1edc290a523e7',
        technicalReservationManifestSha256:
          'ccaa3493bd0da9dfbec88d010232f760ff37c62a87ae4c1de0f512f519882d41',
        layerCount: 9,
        acceptedTechnicalCellCount: 0,
      },
    });
    expect(scope(report, 'P1-B10')).toMatchObject({
      selectedIdentity: 'FM-01-COMPACT-EAST-FACE',
      construction: {
        cellCount: 14768553,
        exactIntegerCellSetIdentitySha256:
          'ed95837647ab5f13699e93fcc17de691d4da5f08115c4be34734e238b19b4196',
        canonicalMaterialState: null,
      },
      interaction: { exactIntegerCellManifest: null },
      influence: { exactIntegerCellManifest: null },
      exactSupportGapEvidence: {
        cellCount: 754224,
        intervalManifestSha256:
          '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
      },
    });
    expect(scope(report, 'D02')).toMatchObject({
      construction: { cellCount: 432 },
      interaction: { exactIntegerCellManifest: null },
      influence: { exactIntegerCellManifest: null },
      boundedC01StackInteractionEvidence: {
        proposalPayloadSha256: '889035d6fe47e4b4e683f12342f36411d5c52643ba3ef4b3a6994c660c75e77b',
        exactSubsetCount: 7,
        wholeD02CanonicalInteractionUnion: null,
        wholeD02CanonicalInfluenceUnion: null,
      },
    });
    expect(scope(report, 'D06-RESERVATIONS').exactReservationReferenceLedger).toMatchObject({
      referenceCount: 73,
      passedReferenceCount: 73,
      failedReferenceCount: 0,
      allPassed: true,
    });
    expect(scope(report, 'D06-RESERVATIONS').construction.exactIntegerCellManifest).toBeNull();
    expect(scope(report, 'D06-MECHANISMS')).toMatchObject({
      construction: { exactIntegerCellManifest: null },
      interaction: {
        cellCount: 9065,
        coordinateSetSha256: '3d389f1d42a9a7261010e29e3f64ed130d46bdefdff5fb325dc9cebdb2bec436',
        sparseIntervals: {
          intervalManifestSha256:
            '0cebac79256bb464294421d82ede9edfb95d47975c4aa5ccbc6e244a7194ff6c',
        },
      },
      influence: { exactIntegerCellManifest: null },
      exactDetailedProposalLedger: {
        reportIdentitySha256: 'd3c5db62435e6210f56139d3f76f221fbfb335e18fe9775ce8a5209e0e01e958',
        proposalLayerCount: 31,
        rawProposalMembershipCount: 9464,
        uniqueProposalCellCount: 9065,
        duplicateCoordinateCount: 242,
        acceptedMechanismCellCount: 0,
        acceptedConstructionCellCount: 0,
      },
    });
    expect(scope(report, 'D06-MECHANISMS').exactDetailedProposalLedger.layers).toHaveLength(31);
    expect(scope(report, 'P1-B11')).toMatchObject({
      construction: {
        cellCount: 2392,
        coordinateSetSha256: '0d63ddf8f385dcd9eb4af8de530f2e2124b7019dc150674828741ddf274d7b9c',
      },
      interaction: {
        cellCount: 11960,
        coordinateSetSha256: '2b24ccfdfef5905344afa7ec262890af47526beea66ec58efd88850cc5304fc5',
      },
      influence: {
        cellCount: 5980,
        coordinateSetSha256: 'cf8fe0a9de8ffe25771f72095a512a273b21acd2817a552220ec2eecf17751bc',
        expertConstructionInfluenceKernel: null,
        expertConstructionInfluenceAccepted: false,
      },
      exactReferenceProfile: {
        pointCount: 299,
        orderedCoordinateSha256:
          'e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4',
      },
    });
    expect(scope(report, 'P1-B12')).toMatchObject({
      construction: { cellCount: 7440 },
      interaction: { cellCount: 19136 },
      influence: { exactIntegerCellManifest: null },
    });

    expect(report.gate).toMatchObject({
      result: 'HOLD',
      g03Passed: false,
      exactScopeCount: 10,
      exactExpandedScopeDomainCount: 8,
      priorUnresolvedRequiredDomainCount: 19,
      unresolvedRequiredDomainCount: 15,
      newlyClosedProposalGeometryDomainCount: 4,
      disclosedOverlapCount: 5,
      unknownOverlapPairCount: 1,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
    });
    expect(report.v2IntegrationDelta).toMatchObject({
      priorUnresolvedRequiredDomainCount: 19,
      currentUnresolvedRequiredDomainCount: 15,
      closedProposalGeometryDomainCount: 4,
      boundSourceIdentities: {
        b09TechnicalReportIdentitySha256:
          'e4140d2193fec084e8e17ae8e1e071683e62d7cbea20a32ebcf1edc290a523e7',
        b11SurfaceRoadFileSha256:
          'c0684a46f488638e3efb06a621ae0482d60f7e343a8948047e4f02d9f0bdeb6d',
        d06DetailedReportIdentitySha256:
          'd3c5db62435e6210f56139d3f76f221fbfb335e18fe9775ce8a5209e0e01e958',
        d02C01ProposalPayloadSha256:
          '889035d6fe47e4b4e683f12342f36411d5c52643ba3ef4b3a6994c660c75e77b',
      },
    });
    expect(report.safetyBoundary).toEqual({
      acceptedConstructionCellCount: 0,
      acceptedMaterialCellCount: 0,
      acceptedFutureCellCount: 0,
      operationCellCount: 0,
      constructionOwnershipAuthorized: false,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
      executable: false,
    });
  });

  it('discloses every discovered expanded-domain overlap and preserves null-domain uncertainty', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g03-overlap-'));
    const { json: report, markdown } = compile(directory, 'overlap');
    const overlaps = new Map(report.overlapAudit.exactPairwiseOverlaps
      .filter((record: JsonRecord) => record.intersection.cellCount > 0)
      .map((record: JsonRecord) => [
        `${record.leftScopeId}/${record.rightScopeId}`,
        record.intersection,
      ]));

    expect(overlaps.get('P1-B03/P1-B08')).toMatchObject({
      cellCount: 96,
      coordinateSetSha256: '9967727e06dfdf4a772ac89bd470aadd263bf90d7a465267a91514949ddd69ca',
    });
    expect(overlaps.get('P1-B03/P1-B09')).toMatchObject({
      cellCount: 159,
      coordinateSetSha256: '5fa765baccc419e238a83d642aaa337c3fcf01100efde48dde57b9c6f44f4de5',
    });
    expect(overlaps.get('P1-B08/P1-B09')).toMatchObject({
      cellCount: 36,
      coordinateSetSha256: 'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
    });
    expect(overlaps.get('P1-B11/P1-B12')).toMatchObject({
      cellCount: 4784,
      coordinateSetSha256: 'c4d1165ed29dc5b1d91a1f8507623e8a2e07cb61913becc718b7c2e8ee7abdfa',
    });

    const b10Checks = report.overlapAudit.b10CrossScopeChecks as JsonRecord[];
    expect(b10Checks[0]).toMatchObject({
      leftScopeId: 'P1-B03',
      rightScopeId: 'P1-B10',
      classification: 'OVERLAP_DISCLOSED_HOLD',
      intersection: {
        cellCount: 14054,
        coordinateSetSha256: '9cb7e12e363a14f3343ddfa0bb441b33314d23396bec32e2d4d7fbd23cb521b0',
      },
    });
    expect(b10Checks.filter(({ classification }) =>
      classification === 'SOURCE_CERTIFIED_WITHHELD_FROM_B10_FILL')).toHaveLength(2);
    expect(b10Checks.filter(({ classification }) =>
      classification === 'BOUNDS_DISJOINT').map(({ leftScopeId }) => leftScopeId)).toEqual([
      'P1-B07',
      'D02',
      'D06-MECHANISMS',
      'P1-B11',
      'P1-B12',
    ]);
    expect(b10Checks.filter(({ classification }) =>
      classification === 'UNKNOWN_DUE_NULL_CANONICAL_SCOPE_UNION')).toHaveLength(1);
    expect(b10Checks.filter(({ classification }) =>
      classification === 'UNKNOWN_DUE_NULL_CANONICAL_SCOPE_UNION')
      .every(({ unknownIsNotEmptySet }) => unknownIsNotEmptySet === true)).toBe(true);

    expect(markdown).toContain('G03 result: **HOLD**');
    expect(markdown).toContain('Unresolved required domains decrease from **19 to 15**');
    expect(markdown).toContain('| P1-B03 | P1-B10 | 14,054 |');
    expect(markdown).toContain('| P1-B11 | P1-B12 | 4,784 |');
    expect(markdown).toContain('World edits: **not authorized**');
  });

  it('is byte-deterministic for a fixed generation time', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g03-determinism-'));
    const first = compile(directory, 'first');
    const second = compile(directory, 'second');

    expect(second.jsonText).toBe(first.jsonText);
    expect(second.markdown).toBe(first.markdown);
    expect(first.json.canonicalPayloadSha256).toBe(
      '4742c4d09dd490ccf0cfd89a3139f40bb49e6d3fb2e03ce5584c1c666bd25248',
    );
  });
});
