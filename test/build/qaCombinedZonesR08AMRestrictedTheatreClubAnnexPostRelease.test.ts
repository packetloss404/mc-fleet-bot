import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08am_empty_eight_restricted_theatre_club_annex_post_release.mjs');
const CANONICAL = path.join(ROOT, 'data/world-review/combined-zones-r08am-live-20260822T161818Z/r08am-post-release-qa.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08am-post-qa-'));
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

describe('Combined Zones R08AM restricted annex post-release QA', () => {
  it('regenerates deterministically and matches the canonical seal', () => {
    expect(fs.readFileSync(output)).toEqual(firstJson);
    expect(fs.readFileSync(markdown)).toEqual(firstMarkdown);
    expect(fs.readFileSync(output)).toEqual(fs.readFileSync(CANONICAL));
    expect(report.payloadSha256).toBe('d2272bdc12ce1bf4831a406d10385a28e2e32c4b4460436c3a30333186d7243a');
  });

  it('proves every final target and exact rollback guard', () => {
    expect(report).toMatchObject({
      status: 'PASS_RESTRICTED_THEATRE_PRIVATE_CLUB_ANNEX_COMMISSIONED',
      exactTargetStates: {
        cellCount: 44783,
        passed: 44783,
        failed: 0,
        operatedTransitions: 44366,
        sourceAlreadyTarget: 417,
      },
      execution: {
        stageCount: 52,
        evidenceBindingCount: 57,
        exactRollbackReadyCount: 44366,
      },
    });
  });

  it('proves the connected restricted route, 100-seat theatre, and club program', () => {
    expect(report.route).toMatchObject({
      status: 'CONNECTED_RESTRICTED_BOH_TO_LOWER_ANNEX',
      public: false,
      adultsOnlyRestricted: true,
      securedUpperDoorCount: 2,
      r08alSeamCellCount: 8,
      grandStair: { width: 7, longitudinalStepCount: 26, exactStepBlockCount: 182,
        verticalDrop: 25, exactStepContinuity: true, exactHeadroomHeight: 5, lightCount: 10 },
      rearStageDoorCount: 1,
    });
    expect(report.theatre).toMatchObject({
      exactAudienceSeatCount: 100,
      finishedStage: true,
      noninteractiveKingSizeBedShapedCenterpiece: true,
      ceilingLightCount: 16,
      dramaticFilteredStageLightCount: 6,
    });
    expect(report.privateClub).toMatchObject({
      restrictedCorridorContinuous: true,
      suiteCount: 4,
      suiteDoorCount: 4,
      communalPartyLounge: true,
      simulatedFireplaceCount: 2,
      activeFireCount: 0,
      nonexplicitSwingSeatCount: 2,
      billiardsTableCount: 1,
      smallCinemaSeatCount: 6,
    });
  });

  it('preserves R08AL and every held interface with truthful content boundaries', () => {
    expect(report.preservation).toMatchObject({
      r08alOperationCellCountChecked: 8553,
      r08alDeclaredSeamCellCount: 8,
      r08alOffSeamDriftCount: 0,
      interactionHalo: { cellCount: 11088, driftCount: 0 },
      retainedInterfaceDriftCount: 0,
      northRetailShellsCapped: true,
      n06ExceptionUntouched: true,
      futureRailInterfacesOpened: false,
      drainageOpened: false,
      fireServiceSpineOpened: false,
      utilityVentMechanismInterfacesOpened: false,
      targetBlockEntityCount: 0,
      liveBlockingEntityCount: 0,
    });
    expect(report.contentBoundary).toEqual({
      consensualAdultsOnlyTheme: true,
      explicitSexualContent: false,
      anatomyOrSexActDepicted: false,
      coercionConfinementOrViolenceDepicted: false,
      occupantsNpcsOrEntitiesIntroduced: 0,
    });
    expect(report.nonclaims).toEqual({
      publicAccess: false,
      occupantsOrNpcsIntroduced: false,
      explicitSexualContent: false,
      coercionOrConfinement: false,
      futureRailUtilityDrainageOrHazardServiceOpened: false,
    });
  });
});
