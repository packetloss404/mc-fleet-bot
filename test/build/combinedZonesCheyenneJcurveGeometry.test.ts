import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-jcurve-'));
const regeneratedJson = path.join(tempDir, 'jcurve.json');
const regeneratedMarkdown = path.join(tempDir, 'jcurve.md');

interface Cell {
  x: number;
  y: number;
  z: number;
}

interface CoordinateManifest {
  cellCount: number;
  coordinateSetSha256: string;
  cells: Cell[];
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  executable: boolean;
  worldEditAuthorized: boolean;
  operationCellCount: number;
  materialCellCount: number;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  authorityBoundary: {
    blockerId: string;
    normalizedIntent: { sourceLengthBlocks: number };
    currentWorldEndpoints: {
      portal: Cell;
      chamberAnchor: Cell;
    };
    selectedPlanningBasis: string;
  };
  design: {
    segments: Array<{
      id: string;
      direction?: string;
      directions?: string[];
      steps: number;
      level?: boolean;
    }>;
    verticalSchedule: {
      startY: number;
      endY: number;
      riseBlocks: number;
      risingStepCount: number;
      curvesLevel: boolean;
    };
    sightline: {
      directPortalToChamberExcavationExists: boolean;
      bendCount: number;
    };
    centerline: {
      pointCount: number;
      horizontalStepCount: number;
      sha256: string;
      points: Array<Cell & {
        index: number;
        phase: string;
        tangent: string;
        risingFromPrevious: boolean;
      }>;
    };
    excavationReservation: CoordinateManifest;
    oneCellFaceInteractionShell: CoordinateManifest;
  };
  collisionAndInterfaceAudit: {
    generatedStructureIntersectionCellCount: number;
    protectedRelicCoreIntersectionCellCount: number;
    intendedInterfaces: Array<{
      id: string;
      status: string;
      cells: CoordinateManifest;
    }>;
  };
  readiness: {
    exactIntegerCenterline: string;
    exactCurveRasters: string;
    canonicalOwnerAssignment: string;
    interfaceContracts: string;
    futureMountainState: string;
    p1B03Resolved: boolean;
  };
  safetyBoundary: Record<string, boolean>;
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

function coordinateHash(cells: Cell[]): string {
  const sorted = [...cells].sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
  const body = sorted.map(({ x, y, z }) => `${x},${y},${z}\n`).join('');
  return crypto.createHash('sha256')
    .update(`combined-zones-coordinate-cell-set-v1\n${body}`)
    .digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_cheyenne_jcurve_geometry.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', '2026-08-04T23:00:00Z',
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones Cheyenne J-curve planning geometry', () => {
  it('regenerates the committed artifacts byte-for-byte', () => {
    expect(Buffer.compare(
      fs.readFileSync(regeneratedJson),
      fs.readFileSync(COMMITTED_JSON),
    )).toBe(0);
    expect(Buffer.compare(
      fs.readFileSync(regeneratedMarkdown),
      fs.readFileSync(COMMITTED_MARKDOWN),
    )).toBe(0);
  });

  it('binds every upstream artifact to its current SHA-256 and byte count', () => {
    const report = readReport();
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.existsSync(filename), source.path).toBe(true);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
  });

  it('freezes one exact 800-step, two-bend route between the authority anchors', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-cheyenne-jcurve-geometry',
      status: 'PARTIAL_PASS_EXACT_JCURVE_PLANNING_GEOMETRY_P1_B03_TECHNICAL_HOLD',
      authorityBoundary: {
        blockerId: 'P1-B03-CHEYENNE-JCURVE',
        normalizedIntent: { sourceLengthBlocks: 800 },
        currentWorldEndpoints: {
          portal: { x: 2048, y: 130, z: -748 },
          chamberAnchor: { x: 2048, y: 166, z: -868 },
        },
        selectedPlanningBasis: 'EXACT_800_STEP_TWO_BEND_EAST_NORTH_WEST_BAFFLE',
      },
      design: {
        verticalSchedule: {
          startY: 130,
          endY: 166,
          riseBlocks: 36,
          risingStepCount: 36,
          curvesLevel: true,
        },
        sightline: {
          directPortalToChamberExcavationExists: false,
          bendCount: 2,
        },
        centerline: {
          pointCount: 801,
          horizontalStepCount: 800,
        },
      },
    });

    const { points } = report.design.centerline;
    expect(points[0]).toMatchObject({ x: 2048, y: 130, z: -748 });
    expect(points.at(-1)).toMatchObject({ x: 2048, y: 166, z: -868 });
    expect(report.design.segments.reduce((sum, segment) => sum + segment.steps, 0))
      .toBe(800);

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      expect(Math.abs(current.x - previous.x) + Math.abs(current.z - previous.z))
        .toBe(1);
      expect([0, 1]).toContain(current.y - previous.y);
    }
    expect(points.filter(({ risingFromPrevious }) => risingFromPrevious)).toHaveLength(36);
    expect(points.filter(({ phase }) => phase.startsWith('BEND-')).every(
      ({ risingFromPrevious }) => !risingFromPrevious,
    )).toBe(true);
  });

  it('has canonical, unique exact cell manifests and clear collision results', () => {
    const report = readReport();
    for (const manifest of [
      report.design.excavationReservation,
      report.design.oneCellFaceInteractionShell,
      ...report.collisionAndInterfaceAudit.intendedInterfaces.map(({ cells }) => cells),
    ]) {
      expect(manifest.cells).toHaveLength(manifest.cellCount);
      expect(new Set(manifest.cells.map(key)).size).toBe(manifest.cellCount);
      expect(manifest.coordinateSetSha256).toBe(coordinateHash(manifest.cells));
    }
    expect(report.design.excavationReservation.cellCount).toBe(15972);
    expect(report.design.oneCellFaceInteractionShell.cellCount).toBe(14418);
    expect(report.collisionAndInterfaceAudit).toMatchObject({
      generatedStructureIntersectionCellCount: 0,
      protectedRelicCoreIntersectionCellCount: 0,
    });
    expect(report.collisionAndInterfaceAudit.intendedInterfaces.map(({ id, cells }) => (
      [id, cells.cellCount]
    ))).toEqual([
      ['JCURVE-TO-SERVICE-PORTAL', 20],
      ['JCURVE-TO-CHEYENNE-CHAMBER', 800],
    ]);
  });

  it('remains fail-closed with no technical, ownership, or release claim', () => {
    const report = readReport();
    expect(report).toMatchObject({
      executable: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
      readiness: {
        exactIntegerCenterline: 'PASS_PLANNING_GEOMETRY',
        exactCurveRasters: 'PASS_TWO_LEVEL_COARSE_R10_TRANSITIONS',
        canonicalOwnerAssignment: 'HOLD',
        interfaceContracts: 'HOLD',
        futureMountainState: 'HOLD_P1_B10',
        p1B03Resolved: false,
      },
      safetyBoundary: {
        noLiveSystemsContacted: true,
        noWorldReadOrMutation: true,
        noOperationsEmitted: true,
        noConstructionOwnershipEmitted: true,
        noExpertAcceptanceClaimed: true,
      },
    });
  });
});
