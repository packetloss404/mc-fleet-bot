import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(
  ROOT,
  'scripts/compile_combined_zones_d02_c01_ownership_loading_interface.mjs',
);

type JsonRecord = Record<string, any>;

function compile(directory: string, suffix: string) {
  const output = path.join(directory, `d02-c01-${suffix}.json`);
  const markdown = path.join(directory, `d02-c01-${suffix}.md`);
  execFileSync('node', [
    COMPILER,
    '--generated-at', '2026-08-05T06:20:00Z',
    '--out', output,
    '--markdown', markdown,
  ], { cwd: ROOT, stdio: 'pipe' });
  return {
    json: JSON.parse(fs.readFileSync(output, 'utf8')) as JsonRecord,
    jsonText: fs.readFileSync(output, 'utf8'),
    markdown: fs.readFileSync(markdown, 'utf8'),
  };
}

function owner(report: JsonRecord, ownerId: string) {
  return report.proposalPayload.oneOwnerPrecedence.scopedOwners.find(
    (record: JsonRecord) => record.ownerId === ownerId,
  );
}

function contract(report: JsonRecord, contractId: string) {
  return report.proposalPayload.directionalSealedInterfaces.exactFaceAdjacentContracts.find(
    (record: JsonRecord) => record.contractId === contractId,
  );
}

describe('combined-zones bounded D02/C01 ownership, loading, and interface compiler', () => {
  it('compiles exact C1/D02 stack sets while preserving technical and release HOLDs', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-c01-'));
    const { json: report } = compile(directory, 'primary');
    const sets = report.proposalPayload.exactInteractionSets;

    expect(report.status).toBe(
      'PARTIAL_PASS_EXACT_BOUNDED_D02_C01_PROPOSAL_D02_G03_G04_G05_HOLD',
    );
    expect(report.proposalPayload.boundStack).toMatchObject({
      feature: 'C01 Owner Tunnel Detour',
      exactC1LandTakeOverlapColumnCount: 7803,
      minimumSurfaceDatumSeparationAboveFeatureTop: 105,
      threeDimensionalSurfaceDatumCollision: false,
    });
    expect(sets.c1LandTakeTerminalDatum).toMatchObject({
      cellCount: 7803,
      coordinateSetSha256:
        'ca41d364eb1c9536550d6bb1d174a73b3b712772afec7407132085c81b0e9860',
    });
    expect(sets.c1RailFormation).toMatchObject({
      cellCount: 2601,
      coordinateSetSha256:
        '7e396875244e5353bafc850208a000daa681f9ee91d7f7ce2eb098a3b66f4898',
    });
    expect(sets.c1RailCollection).toMatchObject({
      cellCount: 578,
      coordinateSetSha256:
        'aa00eb7a48249abf28244d881e691867751fd71f61edfb39d42c26812bd37b92',
    });
    expect(sets.c1RoadSurface).toMatchObject({ cellCount: 0, bounds: null });
    expect(sets.c1RoadCollection).toMatchObject({ cellCount: 0, bounds: null });
    expect(sets.d02CappedSumpCandidate).toMatchObject({
      cellCount: 54,
      coordinateSetSha256:
        '8d45d5e8e58be3cb4f127f225e6338b144bcefb04462759c2e099c7b5da38bbc',
    });
    expect(sets.loadingSeparationReservation).toMatchObject({
      intervalCount: 7803,
      cellCount: 944298,
      intervalManifestSha256:
        '1fa1a8295a1e48bee4f2e31506538674b759da07486a4a0d471c53f2ad9d02af',
      bounds: { minY: -36, maxY: 101 },
    });

    expect(report.gate).toEqual({
      result: 'HOLD',
      d02Resolved: false,
      g03Passed: false,
      g04Passed: false,
      g05Passed: false,
      structuralLoadingAccepted: false,
      settlementAccepted: false,
      geotechnicalAccepted: false,
      issue002Resolved: false,
      completeSaveAccepted: false,
      materialStatesAccepted: false,
      futureStatesAccepted: false,
      finalAcceptance: null,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
    });
    expect(report.safetyBoundary.operationCellCount).toBe(0);
    expect(report.safetyBoundary.executable).toBe(false);
  });

  it('partitions every terminal cell once and emits only sealed default-deny interfaces', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-c01-owner-'));
    const { json: report, markdown } = compile(directory, 'ownership');
    const accounting = report.proposalPayload.oneOwnerPrecedence.exactConflictAccounting;

    expect(accounting).toMatchObject({
      d02CandidateCellCountAtStack: 54,
      d02CellsWithheldByLoadingSeparation: {
        cellCount: 45,
        coordinateSetSha256:
          'a67d996b956cbf43509a55cd09daa3ac6d274b7645c6b889a7ba37dce5c43cbc',
      },
      d02TerminalCellsRemainingAfterLoadingPrecedence: {
        cellCount: 9,
        coordinateSetSha256:
          '4398fce7732bebc90b27f0cc36046143d8c3d9cf54dcddcdc23a89d6bdeb2aeb',
      },
      terminalDatumCellCount: 7803,
      terminalAssignedCellCount: 7803,
      terminalUnassignedCellCount: 0,
      oneOwnerPerTerminalCell: true,
    });
    expect(owner(report, 'OWN-D02-C1-DRAINAGE-CONTROL').proposedAssignment.cellCount).toBe(9);
    expect(owner(report, 'OWN-C1-RAIL-CESS-CONTROL').proposedAssignment.cellCount).toBe(572);
    expect(owner(report, 'OWN-C1-RAIL-FORMATION-CONTROL').proposedAssignment.cellCount).toBe(2023);
    expect(owner(report, 'OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL')
      .proposedAssignment.cellCount).toBe(5199);
    expect(report.proposalPayload.oneOwnerPrecedence.scopedOwners.every(
      (record: JsonRecord) => record.accepted === false,
    )).toBe(true);

    expect(contract(report, 'IF-C01-OWNER-TUNNEL-TO-C1-LOADING-SEPARATION')).toMatchObject({
      transitionPairCount: 7803,
      transitionPairManifestSha256:
        '8180932d817b4c1664f5535d74868542d24f5e83d90e3ce8e7b8c9b0cdea6e2b',
      defaultDeny: true,
      sealed: true,
      accepted: false,
    });
    expect(contract(report, 'IF-C1-LOADING-SEPARATION-TO-D02-CAPPED-SUMP-CAPS'))
      .toMatchObject({ transitionPairCount: 9 });
    expect(contract(report, 'IF-C1-LOADING-SEPARATION-TO-RAIL-COLLECTION'))
      .toMatchObject({ transitionPairCount: 572 });
    expect(contract(report, 'IF-C1-LOADING-SEPARATION-TO-RAIL-FORMATION'))
      .toMatchObject({ transitionPairCount: 2023 });
    expect(contract(report, 'IF-C1-LOADING-SEPARATION-TO-RAIL-LAND-TAKE-DATUM'))
      .toMatchObject({ transitionPairCount: 5199 });
    expect(report.proposalPayload.directionalSealedInterfaces.exactFaceAdjacentContracts.every(
      (record: JsonRecord) => record.defaultDeny && record.sealed && !record.accepted,
    )).toBe(true);
    expect(report.proposalPayload.directionalSealedInterfaces).toMatchObject({
      acceptedContractCount: 0,
      beforeStateSetSha256: null,
      futureStateSetSha256: null,
    });

    expect(report.proposalPayload.c01StackLedger.filter(
      (record: JsonRecord) => record.exactLandTakeOverlapColumnCount === 0,
    )).toHaveLength(7);
    expect(report.proposalPayload.issue002AndSaveTruth).toMatchObject({
      c01EngineeringState: 'DESIGN_REVIEW_ONLY_NO_LIVE_MUTATION',
      completeSave: {
        status: 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
        entityFileCount: 0,
        poiFileCount: 0,
        levelDatPresent: false,
        completeSaveEvidenceAccepted: false,
      },
    });
    expect(report.proposalPayload.unresolvedHolds.map((hold: JsonRecord) => hold.id)).toEqual([
      'HOLD-LOAD-CAPACITY',
      'HOLD-SETTLEMENT',
      'HOLD-STRUCTURAL-ACCEPTANCE',
      'HOLD-GEOTECHNICAL-ACCEPTANCE',
      'HOLD-ISSUE-002-FIELD-CONDITION',
      'HOLD-COMPLETE-SAVE-ENTITY-POI',
      'HOLD-DRAINAGE-CAPACITY-RECEIVER-OUTFALL',
      'HOLD-MATERIAL-AND-FUTURE-STATE',
      'HOLD-FINAL-ACCEPTANCE',
    ]);
    expect(report.proposalPayload.unresolvedHolds.every(
      (hold: JsonRecord) => hold.value === null,
    )).toBe(true);
    expect(markdown).toContain('Result: **HOLD**');
    expect(markdown).toContain('The exact road and road-collection intersections are zero');
    expect(markdown).toContain('Operation cells: **0**');
  });

  it('is byte-deterministic for a fixed generation time', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-c01-determinism-'));
    const first = compile(directory, 'first');
    const second = compile(directory, 'second');

    expect(second.jsonText).toBe(first.jsonText);
    expect(second.markdown).toBe(first.markdown);
    expect(first.json.proposalPayloadSha256).toBe(
      'eff111ab974e6457ab042ed7639e48ed3e170d346b32a74328aad53b7561ce94',
    );
  });
});
