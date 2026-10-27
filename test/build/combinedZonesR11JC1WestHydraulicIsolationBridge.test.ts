import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const INVENTORY = path.join(
  ROOT,
  'data/world-review/combined-zones-r11j-west-hydraulic-bridge-inventory-20260822T042000Z.json',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11j-offline-20260822T043500Z',
);
const CANONICAL_QA = path.join(EVIDENCE, 'r11j-offline-qa.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11j-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.c1-west-bridge-support-framework.forward.txt`,
  `${BASENAME}.c1-west-bridge-support-framework.rollback.txt`,
  `${BASENAME}.c1-west-bridge-deck-structure.forward.txt`,
  `${BASENAME}.c1-west-bridge-deck-structure.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  releaseNodeId: string;
  packages: Array<{ key: string }>;
  scope: {
    stations: { start: number; end: number; count: number };
    pavementSurface: { cellCount: number };
    fullTwoBlockHeadroom: { cellCount: number };
    headroomCuts: { cellCount: number };
    supportFramework: Record<string, unknown>;
    gravityDependencies: { cellCount: number };
    retainedGenericHydraulicField: Record<string, number | string>;
    acceptedR11HSeam: Record<string, number | string>;
    routeCommissioned: boolean;
    hydraulicCapacityCommissioned: boolean;
  };
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    interactionHalo: { cellCount: number; coordinateSetSha256: string };
  };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11j_c1_west_hydraulic_isolation_bridge.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-22T04:30:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11J C1 west hydraulic-isolation bridge 1184..1188', () => {
  it('reproduces the inventory and all five build artifacts byte-for-byte', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
    const inventoryOut = path.join(temporaryDirectory, 'inventory.json');
    execFileSync(process.execPath, [
      'scripts/inventory_combined_zones_r11j_c1_west_hydraulic_bridge.mjs',
      '--out', inventoryOut,
      '--generated-at', '2026-08-22T04:20:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(inventoryOut)).toEqual(fs.readFileSync(INVENTORY));
    expect(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex'))
      .toBe('176b16fa7c20d28aa79353dac70d436237032311b7dc0917968519a89b80ccbb');
    expect(manifest.manifestIdentity)
      .toBe('a7b6a01b0bc080d9ddc77e10c92c878cd68799188788e372df6b575e0fce6cd0');
  });

  it('freezes the exact bounded static bridge and dry sparse halo', () => {
    expect(manifest).toMatchObject({
      mvpScope: true,
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      scope: {
        stations: { start: 1184, end: 1188, count: 5 },
        pavementSurface: { cellCount: 94 },
        fullTwoBlockHeadroom: { cellCount: 188 },
        headroomCuts: { cellCount: 44 },
        supportFramework: {
          cellCount: 344,
          faceComponentCount: 1,
          operationCells: { cellCount: 273 },
          retainedCells: { cellCount: 71 },
          durableAnchorCount: 102,
        },
        gravityDependencies: { cellCount: 4 },
        retainedGenericHydraulicField: {
          sourceFluidCount: 38,
          operatedHaloFluidCount: 0,
          minimumVerticalIsolationBlocks: 23,
        },
        acceptedR11HSeam: {
          seamEdgeCount: 37,
          combinedSurfaceCellCount: 449,
          combinedSurfaceComponentCount: 1,
          maximumStep: 1,
        },
        routeCommissioned: false,
        hydraulicCapacityCommissioned: false,
      },
      target: {
        operatedUnion: {
          cellCount: 411,
          coordinateSetSha256:
            '3db1666a75e5d10577ff203a98d54d78bb27b86ae3ffe6332b687118f2ebb103',
        },
        interactionHalo: {
          cellCount: 1_792,
          coordinateSetSha256:
            'f21e73b5228a92fc79752580d49edbfa0e3f6026bb77eac8df76d42c4831346d',
        },
      },
    });
  });

  it('reproduces independent offline QA and all substantive claims', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11j_c1_west_hydraulic_isolation_bridge_offline.mjs',
      '--manifest', MANIFEST,
      '--evidence-dir', EVIDENCE,
      '--out', out,
      '--md-out', md,
      '--generated-at', '2026-08-22T04:40:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS',
      qaPayloadSha256:
        '83c266f9cff338041834a6330023ee8bd89526427b8c5ef99d21b56fe390335f',
      checks: {
        exactSourceGuardMatchCount: 411,
        exactInverseRecordCount: 411,
        supportFrameworkCellCount: 344,
        supportFrameworkFaceComponentCount: 1,
        durableAnchorCount: 102,
        sourceGravityCellCount: 4,
        pavementSurfaceCellCount: 94,
        stableSurfaceCellCount: 94,
        fullHeadroomAirCount: 188,
        interactionHaloCellCount: 1_792,
        haloFluidCount: 0,
        retainedGenericFluidCount: 38,
        retainedGenericFluidMutationCount: 0,
        minimumFluidVerticalIsolationBlocks: 23,
        acceptedR11HSeamEdgeCount: 37,
        combinedAcceptedSurfaceCellCount: 449,
      },
    });
  });

  it('passes manifest, preflight, parser, block-entity, and wrapper contracts', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', totals: { packages: 2, uniqueTargetCells: 411 } });
    for (const name of [
      'support-forward-source-preflight.json',
      'deck-forward-source-preflight.json',
      'deck-projected-rollback-preflight.json',
      'support-projected-rollback-preflight.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, name), 'utf8')))
      .toMatchObject({ status: 'PASS' });
    for (const name of [
      'support-forward-strict-dry-run.json',
      'deck-forward-strict-dry-run.json',
      'deck-rollback-strict-dry-run.json',
      'support-rollback-strict-dry-run.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, name), 'utf8')))
      .toMatchObject({ status: 'dry_run', strictNoop: true });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-print-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY', globalGateDependency: 'NONE',
        packageOrder: manifest.packages.map(({ key }) => key),
      });
  });
});
