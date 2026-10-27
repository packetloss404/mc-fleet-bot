import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08al_empty_eight_south_public_retail_post_release.mjs');
const CANONICAL = path.join(
  ROOT,
  'data/world-review/combined-zones-r08al-live-20260822T155850Z/r08al-post-release-qa.json',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08al-post-qa-'));
const output = path.join(temporaryDirectory, 'qa.json');
const markdown = path.join(temporaryDirectory, 'qa.md');

let firstJson: Buffer;
let firstMarkdown: Buffer;
let report: any;

beforeAll(() => {
  const args = [SCRIPT, '--out', output, '--markdown', markdown];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstJson = fs.readFileSync(output);
  firstMarkdown = fs.readFileSync(markdown);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  report = JSON.parse(fs.readFileSync(output, 'utf8'));
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones R08AL post-release QA', () => {
  it('regenerates deterministically and matches the canonical seal', () => {
    expect(fs.readFileSync(output)).toEqual(firstJson);
    expect(fs.readFileSync(markdown)).toEqual(firstMarkdown);
    expect(fs.readFileSync(output)).toEqual(fs.readFileSync(CANONICAL));
    expect(report.payloadSha256).toBe('68e7fe9a739c03e1aa98b21abecfa4c33978844bb1cb187fd9cdcb0fc4b76142');
  });

  it('proves all declared targets and exact inverse readiness', () => {
    expect(report).toMatchObject({
      status: 'PASS_PUBLIC_VACANT_RETAIL_AND_RESTRICTED_BOH_COMMISSIONED',
      exactTargetStates: {
        cellCount: 9647,
        passed: 9647,
        failed: 0,
        operatedTransitions: 8553,
        sourceAlreadyTarget: 1094,
      },
      execution: {
        stageCount: 52,
        evidenceBindingCount: 57,
        exactRollbackReadyCount: 8553,
      },
    });
  });

  it('commissions eleven lit vacant bays and the bounded restricted BOH', () => {
    expect(report.publicRetail).toMatchObject({
      status: 'BOUNDED_PUBLIC_EXPLORATION_OPEN',
      vacantBayCount: 11,
      occupiedOrEntityCount: 0,
      openingCount: 11,
      openingDimensionsBlocks: { width: 4, height: 2 },
      openingCellCount: 88,
      manualSmokeDoorCount: 11,
      normalFixtureCount: 33,
      roofBayLightCount: 22,
      galleryCeilingLightCount: 11,
      retainedCappedSouthShellIds: ['EE-R-S06'],
    });
    expect(report.publicRetail.exactSouthBayIds).toHaveLength(11);
    expect(report.publicRetail.exactSouthBayIds).not.toContain('EE-R-S06');
    expect(report.publicRetail.stairComponents).toHaveLength(2);
    expect(report.backOfHouse).toMatchObject({
      status: 'MAINTAINED_RESTRICTED_NON_PUBLIC',
      roomCount: 12,
      continuousServiceSpineAirCellCount: 372,
      publicToStaffDoorCount: 2,
      securedRoomDoorCount: 12,
      warmLightCount: 12,
      boothSeatCount: 24,
      occupantsOrEntitiesIntroduced: 0,
    });
  });

  it('keeps all deferred and hazardous interfaces fail-closed', () => {
    expect(report.preservation).toMatchObject({
      retainedUnionDriftCount: 0,
      northRetailShellsCapped: true,
      n06ExceptionUntouched: true,
      futureRailStubsOpened: false,
      drainageOpened: false,
      ventUtilityMechanismInterfacesOpened: false,
      interactionHalo: { cellCount: 8629, driftCount: 0 },
      targetBlockEntityCount: 0,
      liveBlockingEntityCount: 0,
    });
    expect(report.nonclaims).toEqual({
      surfaceHeadhouseEgressCommissioned: false,
      futureRailLinesOpened: false,
      utilityDrainageOrHazardServiceOpened: false,
      tenantOccupancyOrCommerceInstalled: false,
      theatreOrPrivateClubAnnexIncluded: false,
    });
  });
});
