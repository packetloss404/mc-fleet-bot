import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT, 'scripts/commission_combined_zones_r11_c1_bounded_mvp_closure.mjs',
);
const CLOSURE = path.join(
  ROOT, 'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.json',
);
const R13_SCRIPT = path.join(
  ROOT, 'scripts/verify_combined_zones_r13_consolidated_mvp_acceptance.mjs',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11-mvp-closure-'),
);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('Combined Zones bounded R11 C1 MVP closure', () => {
  it('reproduces the canonical closure independently of output paths', () => {
    const out = path.join(temporaryDirectory, 'r11-closure.json');
    execFileSync(process.execPath, [
      SCRIPT,
      '--out', out,
      '--markdown', path.join(temporaryDirectory, 'r11-closure.md'),
      '--generated-at', '2026-08-22T04:55:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(CLOSURE));
  });

  it('accepts exactly ten enumerated connected max-step-one surface components', () => {
    const closure = JSON.parse(fs.readFileSync(CLOSURE, 'utf8'));
    expect(closure).toMatchObject({
      status: 'PASS_R11_BOUNDED_C1_MVP_CLOSURE_ACCEPTED',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      closurePayloadSha256:
        '3deb8e40fde80ce8cb859073ec9789056e4f8b23d2abaedf2693abbc75b07819',
      terminalPost: {
        completeSaveSha256:
          '5bc1c7f2b3b37ae9d817e14f5116adfe67ec869a7385dc012ff9660498b282d2',
        regionSha256:
          'e2188c99083a85bf61757f0bb40e3bb9b97b44a6784a3e6d2b29134ff08dad87',
      },
      acceptedBoundedPhysicalState: {
        system: 'C1_HIGHWAY_AND_PEDESTRIAN_SURFACES',
        surfaceCellCount: 2_848,
        surfaceCoordinateSetSha256:
          '167a512a0350cf636b4edf4d5495b94609ac784e32a9f075b9c743c7893023eb',
        exactTerminalPostSurfaceCount: 2_848,
        componentCount: 10,
        everyComponentConnectedAtMaximumStepOne: true,
        publicRouteCommissioned: false,
      },
    });
    expect(closure.acceptedBoundedPhysicalState.components.map(
      ({ cellCount }: { cellCount: number }) => cellCount,
    )).toEqual([1_222, 620, 493, 126, 126, 84, 63, 58, 29, 27]);
    expect(closure.acceptedBoundedPhysicalState.components.every(
      (component: { walkableComponentCount: number; maximumWalkableStep: number }) => (
        component.walkableComponentCount === 1 && component.maximumWalkableStep <= 1
      ),
    )).toBe(true);
  });

  it('keeps every non-surface system and unresolved range explicitly held', () => {
    const closure = JSON.parse(fs.readFileSync(CLOSURE, 'utf8'));
    expect(closure.retainedHolds).toMatchObject({
      rail: { status: 'HELD_RESERVATION_ONLY', physicalRailTargetCount: 0, commissioned: false },
      wetAndHydraulic: {
        retainedReviewedFluidCellCount: 38,
        retainedReviewedFluidDriftCount: 0,
        commissioned: false,
      },
      sheepAndEntityInteraction: {
        savedEntityCensus: { 'minecraft:chicken': 1, 'minecraft:sheep': 3 },
        commissioned: false,
      },
      missingStationRanges: {
        boundedWestReviewRangesNotAcceptedByR11K: [
          { start: 1146, end: 1171 },
          { start: 1173, end: 1183 },
        ],
        commissioned: false,
      },
      interchange: { commissioned: false },
      drainage: { commissioned: false },
      utilities: { commissioned: false },
      wholeCorridor: { commissioned: false },
    });
    expect(Object.values(closure.acceptanceBoundary)).toEqual([
      true, false, false, false, false, false, false, false, false,
    ]);
  });

  it('is accepted as the exact bounded R11 closure by the R13 verifier', () => {
    const out = path.join(temporaryDirectory, 'r13-with-r11-closure.json');
    execFileSync(process.execPath, [
      R13_SCRIPT,
      '--out', out,
      '--markdown', path.join(temporaryDirectory, 'r13-with-r11-closure.md'),
      '--r11-closure', CLOSURE,
      '--publication-mode', 'prepublication',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    const r11 = report.requiredDependencies.find(
      ({ releaseNodeId }: { releaseNodeId: string }) => (
        releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
      ),
    );
    expect(r11).toMatchObject({
      status: 'PASS',
      closure: {
        status: 'PASS',
        evidence: {
          evidenceStatus: 'PASS_R11_BOUNDED_C1_MVP_CLOSURE_ACCEPTED',
          releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
        },
      },
    });
  });
});
