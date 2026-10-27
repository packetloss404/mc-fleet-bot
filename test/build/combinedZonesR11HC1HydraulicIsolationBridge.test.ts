import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const REVIEW = path.join(
  ROOT,
  'data/world-review/combined-zones-r11h-c1-hydraulic-isolation-bridge-20260822T031000Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11h-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.c1-bridge-1189-1206-dependencies.forward.txt`,
  `${BASENAME}.c1-bridge-1189-1206-dependencies.rollback.txt`,
  `${BASENAME}.c1-bridge-1189-1206-structure.forward.txt`,
  `${BASENAME}.c1-bridge-1189-1206-structure.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  releaseNodeId: string;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    stations: { start: number; end: number; count: number };
    pavementSurface: { cellCount: number };
    headroomCuts: { cellCount: number };
    selectedFoundationFill: { cellCount: number };
    omittedDeepFoundationFill: { cellCount: number };
    transverseBeam: { cellCount: number };
    retainedHydraulicGraph: {
      cellCount: number;
      materialCensus: Record<string, number>;
      targetHaloFluidCount: number;
    };
    corridorConnectivityClaimed: boolean;
  };
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    interactionHalo: { cellCount: number; coordinateSetSha256: string };
  };
  isolation: Record<string, number>;
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11h_c1_hydraulic_isolation_bridge.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-22T03:05:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 90_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
}, 90_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11H C1 hydraulic-isolation bridge 1189..1206', () => {
  it('compiles all five artifacts byte-for-byte independently of out-dir', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
    expect(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex'))
      .toBe('b8259982d8e272c953f904248b276bf415449038b805604173962d49cb699f31');
    expect(manifest.manifestIdentity)
      .toBe('f588ddca7596ce8f5305ebf51a3df149cfff5b67dcc629730f49b94cecaabc2a');
  });

  it('freezes the exact material bridge geometry and fluid isolation', () => {
    expect(manifest.mvpScope).toBe(true);
    expect(manifest.releaseNodeId).toBe('CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR');
    expect(manifest.scope.stations).toEqual({ start: 1189, end: 1206, count: 18 });
    expect(manifest.scope.pavementSurface.cellCount).toBe(355);
    expect(manifest.scope.headroomCuts.cellCount).toBe(667);
    expect(manifest.scope.selectedFoundationFill.cellCount).toBe(636);
    expect(manifest.scope.omittedDeepFoundationFill.cellCount).toBe(110);
    expect(manifest.scope.transverseBeam.cellCount).toBe(5);
    expect(manifest.scope.retainedHydraulicGraph).toMatchObject({
      cellCount: 28,
      materialCensus: { 'minecraft:water': 9, 'minecraft:lava': 19 },
      targetHaloFluidCount: 0,
    });
    expect(manifest.scope.corridorConnectivityClaimed).toBe(false);
    expect(manifest.target.operatedUnion).toEqual(expect.objectContaining({
      cellCount: 1666,
      coordinateSetSha256:
        'ef89661a02a5544a093255ada780e8037200f2b9aa0cd421d30c7bd1fedcf129',
    }));
    expect(manifest.target.interactionHalo).toEqual(expect.objectContaining({
      cellCount: 7120,
      coordinateSetSha256:
        '135352f855481660e8e5de62bd46908a2c6e26ecddc6546440ecfc445aabfb28',
    }));
  });

  it('passes independent offline source, inverse, geometry, support, and fluid QA', () => {
    const qaPath = path.join(temporaryDirectory, 'offline-qa.json');
    const mdPath = path.join(temporaryDirectory, 'offline-qa.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11h_c1_hydraulic_isolation_bridge_offline.mjs',
      '--manifest', MANIFEST,
      '--out', qaPath,
      '--md-out', mdPath,
      '--generated-at', '2026-08-22T03:10:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(JSON.parse(fs.readFileSync(qaPath, 'utf8'))).toMatchObject({
      status: 'PASS',
      qaPayloadSha256: '0460535c9e63fc89e3fd649981299969d1d150370c91301fdc88b5779d3e0c56',
      checks: {
        packageCount: 2,
        exactSourceGuardMatchCount: 1666,
        exactInverseRecordCount: 1666,
        surfaceCellCount: 355,
        surfaceComponentCount: 1,
        maxSurfaceStep: 1,
        fullHeadroomCellCount: 710,
        selectedFoundationCount: 636,
        omittedDeepFoundationCount: 110,
        retainedFluidCount: 28,
        targetHaloFluidCount: 0,
        interactionHaloCellCount: 7120,
      },
    });
  });

  it('passes manifest, preflight, parser, block-entity, and wrapper gates', () => {
    const manifestQa = JSON.parse(fs.readFileSync(
      path.join(REVIEW, 'manifest-qa.json'), 'utf8',
    )) as { status: string; totals: { packages: number; uniqueTargetCells: number } };
    expect(manifestQa).toMatchObject({
      status: 'PASS', totals: { packages: 2, uniqueTargetCells: 1666 },
    });
    for (const name of [
      'dependencies-forward-source-preflight.json',
      'structure-forward-source-preflight.json',
      'structure-projected-rollback-preflight.json',
      'dependencies-projected-rollback-preflight.json',
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(REVIEW, name), 'utf8')))
        .toMatchObject({ status: 'PASS' });
    }
    for (const name of [
      'dependencies-forward-strict-dry-run.json',
      'structure-forward-strict-dry-run.json',
      'structure-rollback-strict-dry-run.json',
      'dependencies-rollback-strict-dry-run.json',
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(REVIEW, name), 'utf8')))
        .toMatchObject({ status: 'dry_run', dryRun: true, strictNoop: true });
    }
    expect(JSON.parse(fs.readFileSync(path.join(REVIEW, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(REVIEW, 'wrapper-print-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY',
        globalGateDependency: 'NONE',
        packageOrder: manifest.packages.map(({ key }) => key),
      });
  });
});
