import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rrch-moot-upper-room-completion';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rrch-moot-upper-'));
const artifactNames = [
  `${BASENAME}.committee-room.forward.txt`,
  `${BASENAME}.committee-room.rollback.txt`,
  `${BASENAME}.clerks-hall.forward.txt`,
  `${BASENAME}.clerks-hall.rollback.txt`,
  `${BASENAME}.meeting-room.forward.txt`,
  `${BASENAME}.meeting-room.rollback.txt`,
  `${BASENAME}.attic-store.forward.txt`,
  `${BASENAME}.attic-store.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string }>;
  scope: {
    releaseId: string;
    rooms: {
      'committee-room': { floating01BFixturesCorrected: number; floating01BSupportColumnCells: number; committeeTableCells: number; committeeChairCells: number };
      'clerks-hall': { workDeskCells: number; recordsIslandCells: number; lighting: number; directoryCells: number; accessThresholdCells: number };
      'meeting-room': { meetingTableCells: number; seating: number; displayWallCells: number; wayfindingCells: number };
      'attic-store': { ceilingCells: number; shelvingCells: number; lightPostAndLanternCells: number; controlledStaffThresholdCells: number; staffServiceRoom: boolean; publicAccessClaimed: boolean };
    };
    geometry: {
      targets: { cellCount: number };
      perRoomTargetCounts: Record<string, number>;
    };
    retainedBoundaries: {
      partitionWallX92Untouched: boolean;
      upperSpineUntouched: boolean;
    };
  };
  isolation: {
    targetFluidOrWaterloggedCount: number;
    targetForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_rrch_moot_upper_room_completion.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-24T16:10:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 60_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('RRCH-MOOT-UPPER-ROOMS Ravensreach Moot Hall upper-stack completion', () => {
  it('reproduces all eight executable build artifacts byte-for-byte', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
  });

  it('emits a valid manifest under the RAVENSREACH-CIVIC scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['RAVENSREACH-CIVIC']);
    expect(manifest.scope.releaseId).toBe('RRCH-MOOT-UPPER-ROOMS');
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'committee-room',
      'clerks-hall',
      'meeting-room',
      'attic-store',
    ]);
  });

  it('emits the exact per-room target counts', () => {
    expect(manifest.scope.geometry.targets.cellCount).toBe(327);
    expect(manifest.scope.geometry.perRoomTargetCounts).toEqual({
      'committee-room': 54,
      'clerks-hall': 18,
      'meeting-room': 18,
      'attic-store': 237,
    });
  });

  it('corrects the seven floating 01B fixtures and adds a committee table', () => {
    expect(manifest.scope.rooms['committee-room'].floating01BFixturesCorrected).toBe(7);
    expect(manifest.scope.rooms['committee-room'].floating01BSupportColumnCells).toBe(49);
    expect(manifest.scope.rooms['committee-room'].committeeTableCells).toBe(3);
    expect(manifest.scope.rooms['committee-room'].committeeChairCells).toBe(2);
  });

  it('furnishes Clerks Hall with islands, lighting, directory, and threshold', () => {
    expect(manifest.scope.rooms['clerks-hall'].workDeskCells).toBe(6);
    expect(manifest.scope.rooms['clerks-hall'].recordsIslandCells).toBe(6);
    expect(manifest.scope.rooms['clerks-hall'].lighting).toBe(4);
    expect(manifest.scope.rooms['clerks-hall'].directoryCells).toBe(1);
    expect(manifest.scope.rooms['clerks-hall'].accessThresholdCells).toBe(1);
  });

  it('furnishes Meeting Room with table, seating, display wall, and wayfinding', () => {
    expect(manifest.scope.rooms['meeting-room'].meetingTableCells).toBe(9);
    expect(manifest.scope.rooms['meeting-room'].seating).toBe(4);
    expect(manifest.scope.rooms['meeting-room'].displayWallCells).toBe(3);
    expect(manifest.scope.rooms['meeting-room'].wayfindingCells).toBe(2);
  });

  it('encloses the Attic Store with a ceiling, shelving, and staff threshold only', () => {
    expect(manifest.scope.rooms['attic-store'].ceilingCells).toBe(221);
    expect(manifest.scope.rooms['attic-store'].shelvingCells).toBe(8);
    expect(manifest.scope.rooms['attic-store'].lightPostAndLanternCells).toBe(6);
    expect(manifest.scope.rooms['attic-store'].controlledStaffThresholdCells).toBe(2);
    expect(manifest.scope.rooms['attic-store'].staffServiceRoom).toBe(true);
    expect(manifest.scope.rooms['attic-store'].publicAccessClaimed).toBe(false);
  });

  it('keeps the x=-92 partition wall and upper spine untouched', () => {
    expect(manifest.scope.retainedBoundaries.partitionWallX92Untouched).toBe(true);
    expect(manifest.scope.retainedBoundaries.upperSpineUntouched).toBe(true);
  });

  it('isolates all targets from fluid, containers, block entities, and saved entities', () => {
    expect(manifest.isolation.targetFluidOrWaterloggedCount).toBe(0);
    expect(manifest.isolation.targetForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('proves the forward and rollback files are exact inverses', () => {
    for (const pkg of ['committee-room', 'clerks-hall', 'meeting-room', 'attic-store']) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.rollback.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(rollback.length);
      const forwardSet = new Set(forward);
      for (const line of rollback) {
        const f = line.split(/\s+/);
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('verifies the executed evidence ledger is post-state verified and reversible', () => {
    const ledger = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/world-review/rrch-moot-upper-rooms-live-20260824T161000Z/evidence-ledger.json'),
      'utf8',
    ));
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.targetCount).toBe(327);
    expect(ledger.execution.changed).toBe(327);
    expect(ledger.execution.failed).toBe(0);
    expect(ledger.execution.noop).toBe(0);
    expect(ledger.hardSafetyKernel.rollbackPoststatePreflight).toMatchObject({
      'committee-room': '54/54 PASS',
      'clerks-hall': '18/18 PASS',
      'meeting-room': '18/18 PASS',
      'attic-store': '237/237 PASS',
    });
    expect(ledger.hardSafetyKernel.postStateVerify.total).toBe('327/327');
    expect(ledger.retainedBoundaries.partitionWallX92Untouched).toBe(true);
    expect(ledger.retainedBoundaries.atticRemainsStaffServiceRoom).toBe(true);
  });
});
