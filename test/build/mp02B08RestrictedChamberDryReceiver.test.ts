import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z';
const SURVEY = 'data/world-review/mp02-b08-successor-integrated-audit-20260827T012500Z/successor-survey/mp02-b08-current-successor-survey.json';
const AUTH = 'docs/masterplans/02-subtropolis/mp02-b08-restricted-chamber-dry-receiver-governor-standing-execution-authorization.json';
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

describe('MP02 B08 restricted chamber / dry receiver', () => {
  it('compiles an ordered exact inverse and passes normal plus each single-return-failure projection without authorizing execution', () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-restricted-chamber-'));
    temporary.push(work);
    const designDir = path.join(work, 'design');
    const buildops = path.join(work, 'buildops');
    const qa = path.join(work, 'projected-qa.json');
    execFileSync(process.execPath, [
      'scripts/design_mp02_b08_integrated_chamber_receiver_01.mjs',
      '--snapshot', SNAPSHOT,
      '--survey', SURVEY,
      '--out', designDir,
      '--generated-at', '2026-08-27T01:55:00.000Z',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 });
    const compile = JSON.parse(execFileSync(process.execPath, [
      'scripts/compile_mp02_b08_restricted_chamber_dry_receiver_01.mjs',
      '--snapshot', SNAPSHOT,
      '--design', path.join(designDir, 'mp02-b08-integrated-chamber-receiver-feasibility-01.json'),
      '--out-dir', buildops,
      '--generated-at', '2026-08-27T01:55:00.000Z',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));
    expect(compile).toMatchObject({
      operatedCells: 835,
      hazards: { fluidsOrGravity: 0, blockEntities: 0, savedEntities: 0 },
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      groups: {
        'receiver-outer-containment': 89,
        'east-b03-isolation-bulkhead': 15,
        'shaft-overflow-fire-isolation-collar': 608,
        'overhead-containment-roof': 45,
        'north-fire-boundary-normal-open': 42,
        'receiver-core-excavation-after-containment': 27,
        'receiver-inlet-seals-last': 9,
      },
    });
    const manifest = path.join(buildops, 'mp02-b08-restricted-chamber-dry-receiver-01.release-manifest.json');
    const qaResult = JSON.parse(execFileSync(process.execPath, [
      'scripts/qa_mp02_b08_restricted_chamber_dry_receiver_01_projected.mjs',
      '--snapshot', SNAPSHOT,
      '--manifest', manifest,
      '--out', qa,
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));
    expect(qaResult).toMatchObject({
      status: 'PASS_PROJECTED_NORMAL_AND_SINGLE_RETURN_FAILURE_QA__NOT_POST_RELEASE_EVIDENCE',
      targetSummary: { forward: 835, unique: 835, sourceFailures: 0, exactInverseByPackage: true },
      routeSummary: { count: 6, passed: 6 },
    });
    const design = JSON.parse(fs.readFileSync(path.join(designDir, 'mp02-b08-integrated-chamber-receiver-feasibility-01.json'), 'utf8'));
    expect(design.finiteEnvelope.shaftIsolationCollar.cellCount).toBe(608);
    expect(design.returns.nonCommonFailureProof).toMatchObject({ passedForSourceTopology: true, acceptedForRelease: false });
    const compiled = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    expect(compiled).toMatchObject({
      status: 'COMPILED_STATIC_FINITE_PACKAGE_AWAITING_PROJECTED_FUNCTIONAL_QA_AND_FRESH_GUARDED_KERNEL',
      safetyBoundary: { executionAuthorizedByThisManifest: false },
      scope: { publicAccessCommissioned: false, emergencyEgressCommissioned: false, B03B09ConnectionCommissioned: false, railOrControlCommissioned: false },
    });
  }, 30_000);

  it('has a valid scoped authorization and prepare-only runner plan', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', 'data/buildops/mp02-b08-restricted-chamber-dry-receiver-01.release-manifest.json',
      '--release-node', 'CZ-MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER',
      '--authorization', AUTH,
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));
    expect(plan.mode).toBe('PREPARE_ONLY');
    expect(plan.packageOrder).toEqual([
      'receiver-outer-containment',
      'east-b03-isolation-bulkhead',
      'shaft-overflow-fire-isolation-collar',
      'overhead-containment-roof',
      'north-fire-boundary-normal-open',
      'receiver-core-excavation-after-containment',
      'receiver-inlet-seals-last',
    ]);
  });
});
