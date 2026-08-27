import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs',
);
const CATALOG = path.join(
  ROOT, 'data/exports/world-catalog-wave2-post-2026-07-28/features.json',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r13-g18-shot-plan-'),
);
const GENERATED = path.join(temporaryDirectory, 'generated-source-plan.json');
const MISSING_TERMINAL = path.join(
  ROOT,
  'data/world-review/combined-zones-r13-g18-terminal-post-acceptance-absent-test-only.json',
);
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const runGenerator = (name: string, args: string[] = []) => {
  const out = path.join(temporaryDirectory, `${name}.json`);
  execFileSync(process.execPath, [
    SCRIPT,
    '--out', out,
    '--generated-at', '2026-08-22T05:20:00Z',
    ...args,
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  return { out, report: JSON.parse(fs.readFileSync(out, 'utf8')) };
};

beforeAll(() => {
  expect(fs.existsSync(MISSING_TERMINAL)).toBe(false);
  execFileSync(process.execPath, [
    SCRIPT,
    '--out', GENERATED,
    '--generated-at', '2026-08-22T05:20:00Z',
    '--terminal-post-acceptance', MISSING_TERMINAL,
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
});

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('Combined Zones R13 G18 terminal media shot plan', () => {
  it('reproduces the source WAIT plan byte for byte without rewriting the canonical plan', () => {
    const reproduced = runGenerator('deterministic', [
      '--terminal-post-acceptance', MISSING_TERMINAL,
    ]);
    expect(fs.readFileSync(reproduced.out)).toEqual(fs.readFileSync(GENERATED));
    expect(reproduced.report).toMatchObject({
      status: 'WAITING_R13_G18_TERMINAL_POST_AND_CAPTURES',
      shotPlanPayloadSha256:
        'd31d5145c472c6939a8966e7eb790310f4bdb30a232ba09788b7fff0789dd552',
      readiness: {
        terminalPostAccepted: false,
        shotCount: 11,
        presentCaptureCount: 0,
        missingCaptureCount: 11,
        capturesAcceptedAsMatchedMedia: false,
        publicationAuthorized: false,
      },
    });
  });

  it('covers every requested terminal subject with stable IDs and exact cameras', () => {
    const report = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    expect(report.coverage).toMatchObject({
      requiredGroupCount: 5,
      coveredGroupCount: 5,
      completePlannedCoverage: true,
    });
    expect(Object.fromEntries(report.shots.map((shot: {
      id: string;
      camera: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
    }) => [shot.id, { camera: shot.camera, target: shot.target }]))).toMatchObject({
      'CZ-G18-SHOT-01-R07-B03-NORTH-PORTAL': {
        camera: { x: 2218, y: 167.2, z: -748 },
        target: { x: 2236.5, y: 167.5, z: -748 },
      },
      'CZ-G18-SHOT-02-R07-B03-SOUTH-PORTAL': {
        camera: { x: 2214, y: 167.2, z: -868 },
        target: { x: 2236.5, y: 167.5, z: -868 },
      },
      'CZ-G18-SHOT-04-R08-N07-RETAIL-SHELL-INTERIOR': {
        camera: { x: 1754, y: 50.5, z: 43 },
        target: { x: 1761, y: 50.5, z: 47 },
      },
      'CZ-G18-SHOT-06-R09-B07-BOUNDED-UPPER-ROUTE': {
        camera: { x: 2126, y: 85, z: -410 },
        target: { x: 2108, y: 72, z: -398 },
      },
      'CZ-G18-SHOT-07-R10-B03-INSTITUTIONAL-CORRIDOR': {
        camera: { x: 2374, y: 167.5, z: -868 },
        target: { x: 2090, y: 167.5, z: -868 },
      },
      'CZ-G18-SHOT-09-R11-C1-WEST-BRIDGE-SURFACE': {
        camera: { x: 1520, y: 72, z: -250 },
        target: { x: 1548, y: 66.5, z: -238 },
      },
      'CZ-G18-SHOT-10-R12-B09-BOUNDED-SHUTTLE-TERMINAL-BAY': {
        camera: { x: 2058.5, y: 131.2, z: -747.5 },
        target: { x: 2072, y: 131.2, z: -747.5 },
      },
      'CZ-G18-SHOT-11-R12-B09-PASSIVE-SUMMIT-APPROACH': {
        camera: { x: 2052, y: 303, z: -815 },
        target: { x: 2048, y: 298, z: -824 },
      },
    });
    expect(new Set(report.shots.map(({ id }: { id: string }) => id)).size).toBe(11);
    expect(new Set(report.shots.map(({ featureId }: { featureId: string }) => featureId)).size)
      .toBe(11);
    expect(new Set(report.shots.map(
      ({ expectedRaster }: { expectedRaster: { filename: string } }) => expectedRaster.filename,
    )).size).toBe(11);
    for (const shot of report.shots) {
      expect(shot.requiredVisibleAcceptanceFeatures.length).toBeGreaterThanOrEqual(3);
      expect(shot.coordinateEvidence.length).toBeGreaterThan(0);
      expect(shot.matchedMediaProjection.matchedFeatureIds).toEqual([shot.featureId]);
    }
    expect(report.coverage.groups.R12_BOUNDED_TRANSPORT).toEqual([
      'CZ-G18-SHOT-10-R12-B09-BOUNDED-SHUTTLE-TERMINAL-BAY',
      'CZ-G18-SHOT-11-R12-B09-PASSIVE-SUMMIT-APPROACH',
    ]);
    const slicedMap = report.shots[2];
    expect(slicedMap).toMatchObject({
      id: 'CZ-G18-SHOT-03-R08-EMPTY-EIGHT-GALLERIA-OVERVIEW',
      camera: { x: 1749.5, y: 128, z: 100 },
      target: { x: 1749.5, y: 50.5, z: 100 },
      render: {
        mode: 'map', width: 2048, height: 2048,
        center: { x: 1749, z: 100 }, span: 256, scale: 8, ymax: 52,
      },
    });
    expect(report.shots.filter(({ render }: { render: { mode: string } }) => (
      render.mode === 'perspective'
    ))).toHaveLength(10);
  });

  it('limits R12 coverage to the bounded terminal bay and passive summit approach', () => {
    const report = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    const terminalBay = report.shots[9];
    const summitApproach = report.shots[10];
    expect(terminalBay).toMatchObject({
      featureId: 'CZ-R12-B09-BOUNDED-SHUTTLE-TERMINAL-BAY',
      evidenceIds: ['r12ActiveManifest', 'r12Commissioning'],
      claimBoundary: {
        entityVisibilityRequired: false,
        boundedMaintenanceShuttleCommissioned: true,
        commissionedFirstIndex: 9,
        commissionedLastIndex: 25,
        publicPassengerRescueOrFullFunicularCommissioned: false,
      },
    });
    expect(summitApproach).toMatchObject({
      featureId: 'CZ-R12-B09-PASSIVE-SUMMIT-APPROACH',
      claimBoundary: {
        entityVisibilityRequired: false,
        passiveSummitApproachOnly: true,
        boundedMaintenanceShuttleReachesSummit: false,
        exteriorZ11CapOpened: false,
        fullB09FunicularCommissioned: false,
      },
    });
    const r12Text = JSON.stringify([terminalBay, summitApproach]).toLowerCase();
    expect(r12Text).not.toMatch(/vehicle visible|minecart visible|entity visible/);
    expect(report.captureContract.offlineBlockRendererIncludesEntities).toBe(false);
  });

  it('hash-binds accepted release geometry and the durable world-catalog contract', () => {
    const report = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    expect(report.worldCatalog).toMatchObject({
      path: 'data/exports/world-catalog-wave2-post-2026-07-28/features.json',
      sha256: '99e650da6159783487ce3c1e21e02efc1d4baf536d120315e9a1aec5c941ee57',
      featureCount: 875,
      plannedFeatureIdCount: 11,
      plannedFeatureIdCollisionCount: 0,
      plannedFeatureIdsRegistered: false,
      registrationStatus: 'WAITING_FUTURE_TERMINAL_DATABASE_IMPORT',
    });
    expect(sha256(CATALOG)).toBe(report.worldCatalog.sha256);
    for (const evidence of Object.values(report.acceptedCoordinateEvidence) as Array<{
      path: string;
      sha256: string;
      bytes: number;
    }>) {
      const filename = path.resolve(ROOT, evidence.path);
      expect(sha256(filename), evidence.path).toBe(evidence.sha256);
      expect(fs.statSync(filename).size, evidence.path).toBe(evidence.bytes);
    }
  });

  it('does not fabricate a terminal binding or any current raster', () => {
    const report = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    expect(report.terminalPostBinding).toMatchObject({
      status: 'WAITING_ACCEPTED_TERMINAL_POST',
      terminalCompleteSaveSha256: null,
      terminalPostRoot: null,
    });
    for (const shot of report.shots) {
      expect(shot.terminalPostBinding).toMatchObject({
        status: 'WAITING_ACCEPTED_TERMINAL_POST',
        terminalCompleteSaveSha256: null,
      });
      expect(shot.expectedRaster).toMatchObject({
        exists: false,
        sha256: null,
        bytes: null,
        status: 'WAITING_CAPTURE_NOT_PRESENT',
      });
    }
  });

  it('binds a future accepted terminal post but remains WAITING until rasters exist', () => {
    const terminal = path.join(temporaryDirectory, 'terminal-pass.json');
    writeJson(terminal, {
      status: 'PASS_R13_G18_TERMINAL_POST_ACCEPTED',
      terminalCompleteSaveSha256: 'a'.repeat(64),
      terminalPostRoot: 'data/worldsnap-future-terminal-post',
    });
    const result = runGenerator('terminal-pass-no-rasters', [
      '--terminal-post-acceptance', terminal,
    ]);
    expect(result.report).toMatchObject({
      status: 'READY_R13_G18_TERMINAL_CAPTURE_PLAN_WAITING_RASTERS',
      terminalPostBinding: {
        status: 'BOUND_ACCEPTED_TERMINAL_POST',
        terminalCompleteSaveSha256: 'a'.repeat(64),
      },
      readiness: {
        terminalPostAccepted: true,
        presentCaptureCount: 0,
        capturesAcceptedAsMatchedMedia: false,
        publicationAuthorized: false,
      },
    });
    expect(result.report.shots.every((shot: {
      terminalPostBinding: { terminalCompleteSaveSha256: string };
    }) => shot.terminalPostBinding.terminalCompleteSaveSha256 === 'a'.repeat(64))).toBe(true);
  });

  it('never converts mere file presence into matched-media or publication acceptance', () => {
    const terminal = path.join(temporaryDirectory, 'terminal-pass-with-files.json');
    const captureRoot = path.join(temporaryDirectory, 'synthetic-raster-presence');
    writeJson(terminal, {
      status: 'PASS_R13_G18_TERMINAL_POST_ACCEPTED',
      terminalCompleteSaveSha256: 'b'.repeat(64),
      terminalPostRoot: 'data/worldsnap-future-terminal-post',
    });
    const current = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    fs.mkdirSync(captureRoot, { recursive: true });
    for (const shot of current.shots) {
      fs.writeFileSync(path.join(captureRoot, shot.expectedRaster.filename), 'not-accepted-media');
    }
    const result = runGenerator('terminal-pass-files-present', [
      '--terminal-post-acceptance', terminal,
      '--capture-root', captureRoot,
    ]);
    expect(result.report).toMatchObject({
      status: 'CAPTURES_PRESENT_AWAITING_R13_G18_MATCHED_MEDIA_VERIFICATION',
      readiness: {
        presentCaptureCount: 11,
        missingCaptureCount: 0,
        capturesAcceptedAsMatchedMedia: false,
        publicationAuthorized: false,
      },
    });
    expect(result.report.shots.every((shot: {
      expectedRaster: { status: string };
    }) => shot.expectedRaster.status === 'PRESENT_UNVERIFIED_BY_MATCHED_MEDIA_ACCEPTANCE'))
      .toBe(true);
  });

  it('fails closed if a planned durable feature ID already exists in the catalog', () => {
    const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
    catalog.features.push({
      externalId: 'CZ-R07-B03-NORTH-PORTAL-COLLAR',
      geometry: { type: 'point', x: 0, y: 0, z: 0 },
    });
    catalog.count = catalog.features.length;
    const collisionCatalog = path.join(temporaryDirectory, 'collision-catalog.json');
    writeJson(collisionCatalog, catalog);
    expect(() => runGenerator('catalog-collision', [
      '--world-catalog', collisionCatalog,
    ])).toThrow();
  });

  it('records the complete no-mutation boundary', () => {
    const report = JSON.parse(fs.readFileSync(GENERATED, 'utf8'));
    expect(report.safetyBoundary).toEqual({
      readOnlyPlanGeneration: true,
      liveCallsPerformed: false,
      mediaCapturePerformed: false,
      worldEditsPerformed: false,
      docsModified: false,
      canonicalBuildopsModified: false,
      canonicalG18WaitArtifactsModified: false,
      databaseWrittenOrImported: false,
      serviceMutationsPerformed: false,
      externalPublicationPerformed: false,
    });
  });
});
