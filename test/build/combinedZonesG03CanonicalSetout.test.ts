import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(ROOT, 'scripts/compile_combined_zones_g03_canonical_setout.mjs');
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.md',
);

type JsonRecord = Record<string, any>;

function compile(directory: string, suffix: string) {
  const output = path.join(directory, `g03-${suffix}.json`);
  const markdown = path.join(directory, `g03-${suffix}.md`);
  execFileSync('node', [
    '--max-old-space-size=2048',
    COMPILER,
    '--generated-at', '2026-08-05T07:30:00Z',
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

function exactIdentity(domain: JsonRecord) {
  return domain.coordinateSetSha256
    ?? domain.exactIntegerCellSetIdentitySha256
    ?? domain.sparseIntervals?.intervalManifestSha256;
}

describe('combined-zones G03 canonical setout v3 compiler', () => {
  it('regenerates the committed all-domain registry byte-for-byte', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g03-v3-'));
    try {
      const { json: report, jsonText, markdown } = compile(directory, 'primary');
      expect(jsonText).toBe(fs.readFileSync(COMMITTED_JSON, 'utf8'));
      expect(markdown).toBe(fs.readFileSync(COMMITTED_MARKDOWN, 'utf8'));
      expect(report.schemaVersion).toBe(3);
      expect(report.status).toBe(
        'PASS_G03_V3_ALL_30_PROPOSAL_DOMAINS_EXACT_DOWNSTREAM_AND_PHYSICAL_AUTHORITY_HOLD',
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 90_000);

  it('binds exactly ten scopes and all thirty required domains without a geometry null', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
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
    const domains = report.scopeRegistry.flatMap((record: JsonRecord) => (
      ['construction', 'interaction', 'influence'].map((domain) => record[domain])
    ));
    expect(domains).toHaveLength(30);
    expect(domains.every((domain: JsonRecord) => (
      Number.isInteger(domain.cellCount)
        && domain.cellCount > 0
        && domain.bounds !== null
        && /^[0-9a-f]{64}$/.test(exactIdentity(domain))
        && domain.accepted === false
        && domain.operationAuthorization === false
    ))).toBe(true);
    expect(report.gate).toMatchObject({
      result: 'PASS',
      g03Passed: true,
      exactScopeCount: 10,
      exactRequiredDomainCount: 30,
      originalV1UnresolvedRequiredDomainCount: 19,
      priorUnresolvedRequiredDomainCount: 15,
      unresolvedRequiredDomainCount: 0,
      newlyClosedProposalGeometryDomainCount: 15,
      disclosedOverlapCount: 6,
      unknownOverlapPairCount: 6,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
    });
    expect(report.gate.unresolvedRequiredDomains).toEqual([]);
  });

  it('independently reproduces the closure sets that have available coordinate sources', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(scope(report, 'P1-B03').influence).toMatchObject({
      cellCount: 55216,
      coordinateSetSha256: 'a8879f11717f7be8c33bd1fc7cdcaf8ab5278b501e18a83bebfc678b01ba1ac6',
    });
    expect(scope(report, 'P1-B07').influence).toMatchObject({
      cellCount: 13608,
      coordinateSetSha256: '49424a60ad7fb3aede4ead6efd5e324513462e00568326ad2c8b732bff7c67e9',
    });
    expect(scope(report, 'P1-B08').influence).toMatchObject({
      cellCount: 24690,
      coordinateSetSha256: '3c037ebe9bfffa3ca73cd42a27312b3d96eacf317006db0c9ba36e0c3b9337b2',
    });
    expect(scope(report, 'P1-B09')).toMatchObject({
      construction: {
        cellCount: 7800,
        coordinateSetSha256:
          'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
      },
      influence: {
        cellCount: 20430,
        coordinateSetSha256:
          'f10bbc071a09b24be7842065b3d5e1486af3b5af15d45733f9be2bce97d017ba',
      },
    });
    expect(scope(report, 'D02')).toMatchObject({
      interaction: {
        cellCount: 432,
        coordinateSetSha256:
          '020c27307584d1dc756e9b336cb19c2dda686162a8e0823bd33a520a909a0fed',
      },
      influence: {
        cellCount: 456,
        coordinateSetSha256:
          'f870407859b79aa6048b8c6d4411b5a58cdf2444e20858c04b7c5aa8ab98563f',
      },
    });
    expect(scope(report, 'D06-MECHANISMS')).toMatchObject({
      construction: {
        cellCount: 9065,
        coordinateSetSha256:
          '3d389f1d42a9a7261010e29e3f64ed130d46bdefdff5fb325dc9cebdb2bec436',
      },
      interaction: { cellCount: 9065 },
      influence: { cellCount: 9065 },
    });
    expect(scope(report, 'P1-B12').influence).toMatchObject({
      cellCount: 30732,
      coordinateSetSha256: 'edc9d6816f8db8d0f96debe9a6c2e2a656e7710cd97a5f0aa86130f978eb30d2',
    });
  });

  it('preserves B10 and D06 reservation unions as exact source-bound identities', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(scope(report, 'P1-B10')).toMatchObject({
      construction: {
        cellCount: 14768553,
        exactIntegerCellSetIdentitySha256:
          'ed95837647ab5f13699e93fcc17de691d4da5f08115c4be34734e238b19b4196',
      },
      interaction: {
        cellCount: 433549,
        exactIntegerCellSetIdentitySha256:
          '9dcae3deeefc09f563a47955dd7d3fba75eac8e8ca74f44ab26b24d3a4535ba8',
      },
      influence: {
        cellCount: 1082149,
        exactIntegerCellSetIdentitySha256:
          '1a209dbae3552c0b49a7972f22c4838a30e09c8391bce8d20979a1b4f542447d',
      },
    });
    expect(scope(report, 'D06-RESERVATIONS')).toMatchObject({
      construction: {
        cellCount: 19836,
        exactIntegerCellSetIdentitySha256:
          '98fbedb97343de4217a7e206287e23374761a6c404b9571f9d5abda03d955e8a',
      },
      interaction: {
        cellCount: 25310,
        exactIntegerCellSetIdentitySha256:
          '1576d6833c6b27a3301980ac4605c6e3e084ae1b484f00304abcf130f6e5892a',
      },
      influence: {
        cellCount: 25310,
        exactIntegerCellSetIdentitySha256:
          '1576d6833c6b27a3301980ac4605c6e3e084ae1b484f00304abcf130f6e5892a',
      },
    });
    expect(report.v3IntegrationDelta).toMatchObject({
      priorV2UnresolvedRequiredDomainCount: 15,
      currentUnresolvedRequiredDomainCount: 0,
      closedProposalGeometryDomainCount: 15,
      boundSourceIdentities: {
        residualSurfaceConnectorProposalPayloadSha256:
          'b16a05525c4d68f3d3499d6db8a85ccd1eec44c89027ea1adca49dfed891af61',
        residualSurfaceConnectorFileSha256:
          '4d460fcf21ef9de29a6266dae75aaea2b436e68dc50368cb47a77e2e70a59a11',
        civilLifeSafetyCanonicalPayloadSha256:
          '8fb2d3425bcd002fa8e782fae40a5d9eb591e9583535037b5471f009fe103459',
        civilLifeSafetyFileSha256:
          'c1771bf10ca5ad850cc39e09a1a7c62ecad2fdcccc3e3702f2875bebc0348866',
        d02C01ProposalPayloadSha256:
          'eff111ab974e6457ab042ed7639e48ed3e170d346b32a74328aad53b7561ce94',
      },
      independentReconstruction: {
        exactCoordinateDomainCount: 24,
        sourceBoundHashOnlyDomainCount: 6,
        sourceBoundHashOnlyScopes: ['P1-B10', 'D06-RESERVATIONS'],
      },
    });
  });

  it('audits expanded overlaps and confines uncertainty to unexpanded exact sets', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report.overlapAudit).toMatchObject({
      status:
        'PASS_ALL_SCOPE_DOMAINS_EXACT_EXPANDED_AND_SOURCE_BOUND_OVERLAPS_AUDITED_ACCEPTANCE_HOLD',
      disclosedOverlapCount: 6,
      unknownPairCount: 6,
      unknownDueNullDomainCount: 0,
      unknownDueExactSourceBoundUnexpandedCount: 6,
      allOverlapsResolvedAsAcceptedInterfaces: false,
    });
    const expandedOverlaps = report.overlapAudit.exactPairwiseOverlaps.filter(
      (record: JsonRecord) => record.intersection.cellCount > 0,
    );
    expect(expandedOverlaps.map((record: JsonRecord) => ({
      pair: `${record.leftScopeId}/${record.rightScopeId}`,
      count: record.intersection.cellCount,
    }))).toEqual([
      { pair: 'P1-B03/P1-B08', count: 314 },
      { pair: 'P1-B03/P1-B09', count: 610 },
      { pair: 'P1-B08/P1-B09', count: 150 },
      { pair: 'P1-B11/P1-B12', count: 9006 },
    ]);
    const sourceUnknown = report.overlapAudit.sourceBoundPairwiseComparisons.filter(
      (record: JsonRecord) => record.sourceBoundComparisonComplete === false,
    );
    expect(sourceUnknown).toHaveLength(6);
    expect(sourceUnknown.every((record: JsonRecord) => (
      record.unknownIsNotEmptySet !== false
        && typeof record.unknownReason === 'string'
        && record.unknownReason.length > 0
    ))).toBe(true);
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
});
