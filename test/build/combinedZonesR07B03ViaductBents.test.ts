import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07b_b03_viaduct_bents.mjs',
);
const BASENAME = 'combined-zones-r07b-b03-viaduct-bents';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07b-b03-viaduct-bents-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    geometry: {
      candidateAnchorIndices: number[];
      selectedAnchorIndices: number[];
      excludedCandidates: Array<{
        anchorIndex: number;
        exclusions: Array<{ state: string }>;
      }>;
      selectedBentCount: number;
      beam: ExactSet;
      pairedLegs: ExactSet;
      fullDesign: ExactSet;
      foundationContacts: ExactSet & {
        sourceStateCensus: Record<string, number>;
        allAcceptedStable: boolean;
      };
    };
    sourcePartition: {
      operated: ExactSet;
      alreadyTarget: ExactSet;
      sourceStateCensus: Record<string, number>;
      exactPartition: boolean;
    };
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
  };
  target: {
    operatedUnion: ExactSet;
    desiredStateCensus: Record<string, number>;
  };
  operations: {
    'b03-viaduct-bents': {
      forwardSha256: string;
      rollbackSha256: string;
      forwardCommandCount: number;
      rollbackCommandCount: number;
      targetCellCount: number;
      targetCoordinateSetSha256: string;
      exactInverse: boolean;
    };
  };
  isolation: {
    protectedRelicEnvelopeIntersectionCount: number;
    blockEntityEnvelopeIntersectionCount: number;
    savedEntityHaloIntersectionCount: number;
    priorReleaseIntersections: unknown[];
    undeclaredPriorReleaseIntersectionCount: number;
    oneCellHalo: ExactSet;
  };
  compileGuards: Record<string, number | string | string[]>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
  manifestIdentity: string;
}

interface RegionOperation {
  from: [number, number, number];
  to: [number, number, number];
  fromState: string;
  toState: string;
}

function readManifest(filename = MANIFEST): ReleaseManifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest;
}

function parseOperations(filename: string): RegionOperation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      return {
        from: fields.slice(1, 4).map(Number) as [number, number, number],
        to: fields.slice(4, 7).map(Number) as [number, number, number],
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function expandedCells(operations: RegionOperation[]): Map<string, RegionOperation> {
  const cells = new Map<string, RegionOperation>();
  for (const operation of operations) {
    const [x1, y1, z1] = operation.from;
    const [x2, y2, z2] = operation.to;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          const key = `${x},${y},${z}`;
          expect(cells.has(key)).toBe(false);
          cells.set(key, operation);
        }
      }
    }
  }
  return cells;
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

function artifactPaths(directory: string): string[] {
  return [
    `${BASENAME}.b03-viaduct-bents.forward.txt`,
    `${BASENAME}.b03-viaduct-bents.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:30:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
    '--intake-audit',
    'data/world-review/combined-zones-r07a-live-20260821T154500Z/post-complete-save-intake.json',
    '--out-dir',
    temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory)
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R07B B03 viaduct-bent compiler', () => {
  it('regenerates the guarded artifacts byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R07A post complete-save and the R07 MVP node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R07A_POSTSTATE_AWAITING_HARD_SAFETY_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B03'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
        completeSaveSha256:
          '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 34,
      },
    });
  });

  it('derives 26 exact support bents and preserves the unsupported vegetation cell', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      selectedBentCount: 26,
      selectedAnchorIndices: [
        196, 212, 228, 244, 260, 276, 292, 308, 324, 340, 356, 372, 388,
        404, 420, 436, 452, 460, 468, 500, 516, 532, 548, 564, 580, 596,
      ],
      excludedCandidates: [{
        anchorIndex: 484,
        exclusions: [{ state: 'minecraft:short_grass' }],
      }],
      beam: {
        cellCount: 364,
        coordinateSetSha256:
          '41a989772655b1c203f69d7f878be4077841a5507213659f603abdfa7a2206e9',
      },
      pairedLegs: {
        cellCount: 11394,
        coordinateSetSha256:
          '3334da0d780c16b2b73245cfca730d674359fd40c770769fc80c36980d26462a',
      },
      fullDesign: {
        cellCount: 11758,
        coordinateSetSha256:
          'd30393d3db6a00c91bf86ddbc9ec6f5ae0ffdc13dbf8538f7eaf5c9a7ae3f85a',
      },
      foundationContacts: {
        cellCount: 208,
        allAcceptedStable: true,
      },
    });
    expect(manifest.scope.geometry.candidateAnchorIndices).toHaveLength(27);
  });

  it('compacts 11,758 exact cells into 476 vertical runs with an exact inverse', () => {
    const manifest = readManifest();
    const definition = manifest.packages[0];
    const forwardPath = path.join(ROOT, definition.forward);
    const rollbackPath = path.join(ROOT, definition.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    const forwardCells = expandedCells(forward);
    const rollbackCells = expandedCells(rollback);

    expect(forward).toHaveLength(476);
    expect(rollback).toHaveLength(476);
    expect(forwardCells.size).toBe(11758);
    expect(rollbackCells.size).toBe(11758);
    expect([...forwardCells.keys()].sort()).toEqual([...rollbackCells.keys()].sort());
    expect(forward.every(({ toState }) => toState === 'minecraft:stone_bricks'))
      .toBe(true);
    expect(rollback.every(({ fromState }) => fromState === 'minecraft:stone_bricks'))
      .toBe(true);
    for (let index = 0; index < forward.length; index += 1) {
      expect(rollback[index]).toEqual({
        from: forward[index].from,
        to: forward[index].to,
        fromState: forward[index].toState,
        toState: forward[index].fromState,
      });
    }
    expect(bodySha256(forwardPath)).toBe(
      manifest.operations['b03-viaduct-bents'].forwardSha256,
    );
    expect(bodySha256(rollbackPath)).toBe(
      manifest.operations['b03-viaduct-bents'].rollbackSha256,
    );
  });

  it('accounts exact sources and hard-aborts every protected class', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition).toMatchObject({
      operated: { cellCount: 11758 },
      alreadyTarget: { cellCount: 0 },
      sourceStateCensus: {
        'minecraft:air': 11646,
        'minecraft:snow[layers=1]': 112,
      },
      exactPartition: true,
    });
    expect(manifest.isolation).toMatchObject({
      protectedRelicEnvelopeIntersectionCount: 0,
      blockEntityEnvelopeIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      priorReleaseIntersections: [],
      undeclaredPriorReleaseIntersectionCount: 0,
      oneCellHalo: { cellCount: 23895 },
    });
    expect(manifest.compileGuards).toMatchObject({
      unexpectedSourceStateViolationCount: 0,
      fluidSourceStateViolationCount: 0,
      gravitySourceStateViolationCount: 0,
      forbiddenContainerSourceStateViolationCount: 0,
      unsafeFoundationViolationCount: 0,
      haloUnsafeStateViolationCount: 0,
      blockEntityEnvelopeViolationCount: 0,
      savedEntityHaloViolationCount: 0,
      protectedRelicEnvelopeViolationCount: 0,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('passes the independent guarded-manifest validator', () => {
    const output = path.join(temporaryDirectory, 'manifest-qa.json');
    execFileSync(process.execPath, [
      path.join(ROOT, 'scripts/qa_guarded_release_manifest.mjs'),
      '--manifest', MANIFEST,
      '--out', output,
    ], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(output, 'utf8')) as {
      status: string;
      totals: Record<string, number>;
    };
    expect(report).toMatchObject({
      status: 'PASS',
      totals: {
        packages: 1,
        passedPackages: 1,
        uniqueTargetCells: 11758,
        crossPackageIntersectionCells: 0,
      },
    });
  });
});
