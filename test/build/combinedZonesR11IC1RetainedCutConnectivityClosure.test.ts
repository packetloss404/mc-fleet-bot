import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const INVENTORY = path.join(
  ROOT,
  'data/world-review/combined-zones-r11i-neighbor-closures-inventory-20260822T034500Z.json',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11i-offline-20260822T040000Z',
);
const CANONICAL_QA = path.join(EVIDENCE, 'r11i-offline-qa.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11i-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.c1-retained-cut-1207-1212-dependencies.forward.txt`,
  `${BASENAME}.c1-retained-cut-1207-1212-dependencies.rollback.txt`,
  `${BASENAME}.c1-retained-cut-1207-1212-structure.forward.txt`,
  `${BASENAME}.c1-retained-cut-1207-1212-structure.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  releaseNodeId: string;
  packages: Array<{ key: string }>;
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    interactionHalo: { cellCount: number; coordinateSetSha256: string };
  };
  scope: {
    pavementSurface: { cellCount: number };
    fullTwoBlockHeadroom: { cellCount: number };
    gravityRollbackSupportProof: unknown[];
    combinedAcceptedSurface: Record<string, number | string>;
    heldWestHydraulicGap: Record<string, number | string | object>;
  };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11i_c1_retained_cut_connectivity_closure.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-22T04:00:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11I C1 retained-cut connectivity closure', () => {
  it('reproduces all canonical build artifacts independently of output directory', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
    expect(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex'))
      .toBe('ff8502ee21dc50e5fc1aedd997ae5b978e562a9e86115c874323dfa41981d22f');
    expect(manifest.manifestIdentity)
      .toBe('1af8f2ccc561aecb66f6ed1a2f79118b937ffea8f3d796cc13c960b059ba01f1');
  });

  it('reproduces the source-bound two-gap inventory byte-for-byte', () => {
    const out = path.join(temporaryDirectory, 'inventory.json');
    execFileSync(process.execPath, [
      'scripts/inventory_combined_zones_r11i_c1_neighbor_closures.mjs',
      '--out', out,
      '--generated-at', '2026-08-22T03:45:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(INVENTORY));
    const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8')) as {
      candidates: Array<Record<string, number | boolean | string>>;
    };
    expect(inventory.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'west-bridge-gap', genericSafe: false,
        sourceHazardCount: 14, fluidCount: 38,
      }),
      expect.objectContaining({
        key: 'east-retained-cut-gap', genericSafe: true,
        targetCount: 330, fluidCount: 0, blockEntityCount: 0, savedEntityCount: 0,
      }),
    ]));
  });

  it('binds the exact reversible physical closure and both accepted seams', () => {
    expect(manifest).toMatchObject({
      mvpScope: true,
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      target: {
        operatedUnion: {
          cellCount: 317,
          coordinateSetSha256:
            'd04010044b24b7de1b7fbf7541a9e399052ba14fa83f34ae4424ba7ed093dab0',
        },
        interactionHalo: {
          cellCount: 1_531,
          coordinateSetSha256:
            'c5a6f88fae844734b84317d9a4e0f0309d66734c1fcb07743f5cc029b6948121',
        },
      },
      scope: {
        pavementSurface: { cellCount: 106 },
        fullTwoBlockHeadroom: { cellCount: 212 },
        combinedAcceptedSurface: {
          cellCount: 526, componentCount: 1, maximumStep: 1,
          westSeamEdgeCount: 46, eastSeamEdgeCount: 60,
        },
        heldWestHydraulicGap: {
          sourceHazardCount: 14, retainedFluidCount: 38,
        },
      },
    });
    expect(manifest.packages).toHaveLength(2);
    expect(manifest.scope.gravityRollbackSupportProof).toHaveLength(15);
  });

  it('reproduces independent offline QA and passes all substantive gates', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11i_c1_retained_cut_connectivity_closure_offline.mjs',
      '--manifest', MANIFEST,
      '--evidence-dir', EVIDENCE,
      '--out', out,
      '--md-out', md,
      '--generated-at', '2026-08-22T04:05:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS',
      qaPayloadSha256:
        '6fadf0fe4322a44e563090913312742e9b0bc5b394a79e38342004723d0dcf6c',
      checks: {
        exactSourceGuardMatchCount: 317,
        exactInverseRecordCount: 317,
        pavementSurfaceCellCount: 106,
        stableSurfaceCellCount: 106,
        fullHeadroomAirCount: 212,
        sourceGravityCellCount: 15,
        durableGravityTerminalCount: 15,
        haloFluidCount: 0,
        combinedAcceptedSurfaceCellCount: 526,
        westSeamEdgeCount: 46,
        eastSeamEdgeCount: 60,
      },
    });
  });

  it('passes manifest, preflight, strict parser, block-entity, and wrapper contracts', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', totals: { packages: 2, uniqueTargetCells: 317 } });
    for (const name of [
      'dependencies-forward-source-preflight.json',
      'structure-forward-source-preflight.json',
      'structure-projected-rollback-preflight.json',
      'dependencies-projected-rollback-preflight.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, name), 'utf8')))
      .toMatchObject({ status: 'PASS' });
    for (const name of [
      'dependencies-forward-strict-dry-run.json',
      'structure-forward-strict-dry-run.json',
      'structure-rollback-strict-dry-run.json',
      'dependencies-rollback-strict-dry-run.json',
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
