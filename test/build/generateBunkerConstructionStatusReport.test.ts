import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_bunker_construction_status_report.mjs');
const SYNC_SCRIPT = path.join(
  ROOT, 'world-showcase/scripts/sync_bunker_construction_status.mjs',
);
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'bunker-construction-status-'));
const FIRST = path.join(TEMP_ROOT, 'first');
const SECOND = path.join(TEMP_ROOT, 'second');
const GENERATED_AT = '2026-08-22T17:30:00Z';
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

function run(out: string) {
  execFileSync(process.execPath, [
    '--max-old-space-size=8192',
    SCRIPT,
    '--out', out,
    '--skip-render',
    '--generated-at', GENERATED_AT,
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
}

beforeAll(() => run(FIRST), 30_000);
afterAll(() => fs.rmSync(TEMP_ROOT, { recursive: true, force: true }));

describe('Bunker Construction Status report', () => {
  it('seals the current physical evidence without treating design as construction', () => {
    const report = JSON.parse(fs.readFileSync(
      path.join(FIRST, 'bunker-construction-status.json'), 'utf8',
    ));
    expect(report).toMatchObject({
      reportNumber: '06',
      status: 'PASS_CURRENT_PHYSICAL_CONSTRUCTION_SEPARATED_FROM_DESIGN_AND_HISTORY',
      readOnly: true,
      liveWorldMutated: false,
      databaseMutated: false,
      terminalSnapshot: {
        completeSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
        regionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
      },
    });
    expect(report.systems.cheyenne).toMatchObject({
      classification: 'CURRENT_EXACT_BOUNDED_BUILD_PASSIVE_INTERNAL_ROUTE_ONLY',
      currentTargets: 5988,
      currentExactTargets: 5988,
      commissionedScope: {
        release: 'R12O',
        indices: { first: 188, last: 800, stations: 613 },
        chamberCapClosed: true,
      },
    });
    expect(report.systems.cheyenne.designOnlyExamples).toContain('main chamber');
    expect(report.repairProgram).toMatchObject({
      status: 'DESIGN_AND_SURVEY_QUEUE',
      firstPackage: 'BKR-SURVEY-00',
    });
  }, 30_000);

  it('records Raven Rock rollback and supersession instead of a false current complex', () => {
    const report = JSON.parse(fs.readFileSync(
      path.join(FIRST, 'bunker-construction-status.json'), 'utf8',
    ));
    expect(report.systems.ravenRock).toMatchObject({
      classification: 'NO_CURRENT_ACCEPTED_RAVEN_ROCK_COMPLEX',
      currentAcceptedComplexReleases: 0,
      s1Pilot: {
        targetCells: 335,
        currentClassification: 'ROLLED_BACK_NOT_CURRENT_CONSTRUCTION',
      },
      t2bPilot: {
        historicalAcceptance: 'ACCEPTED',
        targetCells: 151,
        currentExactHistoricalTargets: 1,
        supersededTargets: 150,
        currentClassification: 'HISTORICALLY_ACCEPTED_THEN_SUPERSEDED',
      },
    });
    expect(report.systems.ravenRock.designOnlyExamples).toContain('command center');
  });

  it('proves C01 fabric while preserving its commissioning and relocation nonclaims', () => {
    const report = JSON.parse(fs.readFileSync(
      path.join(FIRST, 'bunker-construction-status.json'), 'utf8',
    ));
    expect(report.systems.legacyC01).toMatchObject({
      historicalTargets: 30361,
      currentExactHistoricalTargets: 25193,
      laterChangedTargets: 5168,
    });
    expect(report.systems.eastC01).toMatchObject({
      classification: 'CURRENT_MODEL_FABRIC_PROVEN_FULL_RELOCATION_AND_LIVE_COMMISSIONING_INCOMPLETE',
      modelTargetCells: 901073,
      currentExactModelTargets: 900946,
      deliberateRoutePreservationCells: 127,
      acceptedStairCoreCells: 82,
      heldRouteAirCells: 45,
      modelCompilerStatus: 'C01_SOURCE_MODEL_BLOCKED',
    });
    expect(report.systems.eastC01.acceptedOfflineRoutes).toHaveLength(5);
    expect(report.systems.eastC01.currentOfflineRouteSummary).toMatchObject({
      total: 5,
      passed: 4,
      failed: 1,
      failedRouteIds: ['TE-ROUTE-C01-MOUNTAIN-PORTAL-L1'],
    });
    expect(report.systems.eastC01.nonclaims).toEqual(expect.arrayContaining([
      'live Mineflayer traversal accepted',
      'source bunker retirement completed',
      'full public or citizen activation accepted',
    ]));
  });

  it('passes every machine QA check and remains deterministic', () => {
    const qa = JSON.parse(fs.readFileSync(path.join(FIRST, 'report-qa.json'), 'utf8'));
    expect(qa).toMatchObject({
      status: 'PASS',
      passed: 16,
      total: 16,
      liveWorldMutated: false,
      databaseMutated: false,
    });
    expect(Object.values(qa.checks).every(Boolean)).toBe(true);

    run(SECOND);
    for (const filename of [
      'bunker-construction-status.json',
      'bunker-construction-status.md',
      'bunker-construction-status-report.html',
      'artifact-manifest.json',
      'report-qa.json',
    ]) expect(sha256(path.join(SECOND, filename))).toBe(sha256(path.join(FIRST, filename)));
  }, 60_000);

  it('syncs only a hash-valid accepted package into an isolated site fixture', () => {
    const output = path.join(TEMP_ROOT, 'site-public');
    execFileSync(process.execPath, [
      SYNC_SCRIPT,
      '--source', FIRST,
      '--out', output,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(fs.existsSync(path.join(output, 'bunker-construction-status.json'))).toBe(true);
    expect(sha256(path.join(output, 'bunker-construction-status.json')))
      .toBe(sha256(path.join(FIRST, 'bunker-construction-status.json')));
    expect(JSON.parse(fs.readFileSync(path.join(output, 'report-qa.json'), 'utf8')).status)
      .toBe('PASS');
  });
});
