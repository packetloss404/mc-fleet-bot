import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/commission_combined_zones_r12m_b03_institutional_route.mjs',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r12m-'));
const OUTPUT = path.join(temporaryDirectory, 'commissioning.json');
const MARKDOWN = path.join(temporaryDirectory, 'commissioning.md');

interface CommissioningReport {
  status: string;
  commissioningPayloadSha256: string;
  release: Record<string, string | boolean>;
  bindings: Record<string, unknown>;
  geometry: Record<string, Record<string, unknown>>;
  observedState: Record<string, Record<string, unknown>>;
  rollbackReadiness: Record<string, unknown>;
  boundary: Record<string, unknown>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  safetyBoundary: Record<string, boolean>;
}

let report: CommissioningReport;
let firstJson: Buffer;
let firstMarkdown: Buffer;

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-22T03:40:00Z',
    '--out', OUTPUT,
    '--markdown', MARKDOWN,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstJson = fs.readFileSync(OUTPUT);
  firstMarkdown = fs.readFileSync(MARKDOWN);
  report = JSON.parse(firstJson.toString('utf8')) as CommissioningReport;
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12M B03 institutional-route commissioning', () => {
  it('regenerates the JSON and Markdown seals byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the accepted R10G post and exact commissioning identity', () => {
    expect(report).toMatchObject({
      status:
        'PASS_R12M_B03_INSTITUTIONAL_ROUTE_PASSIVE_INTERNAL_CIRCULATION_COMMISSIONED',
      commissioningPayloadSha256:
        '7dd8bf69850cd661d4e912579be5fd6870c6c795f78e99634a51b12756cb7628',
      release: {
        releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
        commissioningScopeId:
          'CZ-R12M-B03-INSTITUTIONAL-ROUTE-PASSIVE-INTERNAL-CIRCULATION',
        mvpScope: true,
        sourceCompletedReleaseIdentitySha256:
          '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d',
      },
      bindings: {
        r10gQaPayloadSha256:
          '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff',
        latestPhysicalState: {
          completeSaveSha256:
            'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd',
          regionSnapshotSha256:
            '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
        },
      },
    });
  });

  it('proves the exact centerline, route, clearance, floor, and ceiling geometry', () => {
    expect(report.geometry.centerline).toEqual({
      firstIndex: 471,
      lastIndex: 800,
      stationCount: 330,
      longitudinalStepCount: 329,
      orderedSha256: 'b26166b1053a7a82e8bffa3ca908b328bed14d3432319a00782170acbad39068',
    });
    expect(report.geometry.route).toMatchObject({
      cellCount: 6600,
      coordinateSetSha256:
        '4b8fe830be9ca423828a38896009b6fb6b88c8abb14ba65062aecaee24a4c497',
    });
    expect(report.geometry.centralPedestrianClearance).toMatchObject({
      cellCount: 2970,
      coordinateSetSha256:
        'b07491bdee1ae64e4fcffdc61ab1b1ca32ed7e4f0ecc66cbeaacbbef3cfabfa9',
    });
    expect(report.geometry.floor.cellCount).toBe(1650);
    expect(report.geometry.ceiling.cellCount).toBe(1650);
    expect(report.geometry.liner.cellCount).toBe(5940);
  });

  it('proves exact current states, one route component, and fixture cadence', () => {
    expect(report.observedState.liner).toEqual({
      matchingCellCount: 5940,
      mismatchCellCount: 0,
      stateCensus: {
        'minecraft:polished_blackstone_bricks': 54,
        'minecraft:polished_granite': 4197,
        'minecraft:sea_lantern': 54,
        'minecraft:smooth_stone': 1635,
      },
    });
    expect(report.observedState.route).toEqual({
      airCellCount: 6600,
      mismatchCellCount: 0,
      componentCount: 1,
      largestComponentCellCount: 6600,
      withUpstreamSeamComponentCount: 1,
      withUpstreamSeamLargestComponentCellCount: 6620,
    });
    expect(report.observedState.centralPedestrianClearance).toEqual({
      airCellCount: 2970,
      mismatchCellCount: 0,
    });
    expect(report.observedState.fixtures).toMatchObject({
      cellCount: 54,
      maximumLongitudinalSpacing: 6,
    });
  });

  it('proves both interfaces, the retained cap, and clean exact domain', () => {
    expect(report.observedState.seamsAndCap).toEqual({
      upstreamAirCellCount: 20,
      z08Z10InterfaceAirCellCount: 40,
      r10gR10aInterfaceAirCellCount: 40,
      cheyenneTerminusStoneCellCount: 20,
    });
    expect(report.geometry.interactionDomain.cellCount).toBe(23904);
    expect(report.observedState.interactionDomain).toEqual({
      cellCount: 23904,
      fluidCellCount: 0,
      containerOrControlCellCount: 0,
      blockEntityCount: 0,
      savedEntityCount: 0,
    });
  });

  it('seals the exact disjoint physical reverse chain', () => {
    expect(report.rollbackReadiness).toMatchObject({
      order: [
        'z10-cheyenne-approach-extension-liner',
        'z08-institutional-contact-sequence-liner',
        'cheyenne-secure-gallery-liner',
      ],
      crossPackageIntersectionCount: 0,
      totalOperationCount: 5940,
      passedGuardCount: 5940,
      failedGuardCount: 0,
      currentPostRegionSha256:
        '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
      exactCurrentPostState: true,
    });
  });

  it('commissions only passive internal circulation and passes all checks', () => {
    expect(report.boundary).toMatchObject({
      secureRouteCommissioned: false,
      publicRouteCommissioned: false,
      accessControlCommissioned: false,
      chamberOpenedOrOccupied: false,
      directTerminalLinkOpened: false,
      activeMechanismCommissioned: false,
    });
    expect(report.checks).toHaveLength(13);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 13,
      passCount: 13,
      failCount: 0,
      stationCount: 330,
      routeAirCellCount: 6600,
      centralClearanceAirCellCount: 2970,
      floorCellCount: 1650,
      ceilingCellCount: 1650,
      fixtureCellCount: 54,
      linerExactCellCount: 5940,
      rollbackGuardPassCount: 5940,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      serviceMutationsPerformed: false,
      readOnlyImmutableAnvilInputs: true,
    });
  });
});
