import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-wet-riser-'));
const source = 'data/worldsnap-mp05-b07-pressure-gallery-post-20260826T202000Z';
const basename = 'mp05-b07-wet-riser-receiver-01';
const authorization = 'docs/masterplans/05-combined-zones/mp05-b07-wet-riser-receiver-governor-standing-execution-authorization.json';
let manifest: any;
beforeAll(() => {
  execFileSync(process.execPath, ['scripts/compile_mp05_b07_wet_riser_receiver_01.mjs', '--snapshot', source, '--out-dir', temp, '--generated-at', '2026-08-26T21:15:00.000Z'], { cwd: root, stdio: 'pipe', timeout: 180_000 });
  manifest = JSON.parse(fs.readFileSync(path.join(temp, `${basename}.release-manifest.json`), 'utf8'));
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 wet riser and R09E receiver', () => {
  it('compiles a liner-first, restricted lower-gallery to upper-receiver transaction', () => {
    expect(manifest.releaseNodeId).toBe('CZ-MP05-B07-WET-RISER-RECEIVER');
    expect(manifest.executionOrder.forward).toEqual(['sealed-outer-liner-and-dual-bulkheads', 'dry-core-turn-and-riser-excavation', 'upper-receiver-hatches-and-ladder']);
    expect(manifest.executionOrder.rollback).toEqual([...manifest.executionOrder.forward].reverse());
    expect(manifest.scope.outerLinerAndDualBulkheads.cellCount).toBe(264);
    expect(manifest.scope.dryTurnAndRiserCore.cellCount).toBe(40);
    expect(manifest.scope.upperReceiverHatches.cellCount).toBe(3);
    expect(manifest.scope.ladder.cellCount).toBe(8);
    expect(manifest.functionalAcceptance).toMatchObject({ routeWidth: 3, clearHeight: 2, lowerGalleryInterface: true, upperR09ELowerLandingReceiver: true, manualClosedReceiverHatches: 3, publicAccessCommissioned: false, surfaceConnectionCommissioned: false });
  });
  it('has a source-bound standing authorization and structural manifest gate', () => {
    const qa = path.join(temp, 'manifest-qa.json');
    execFileSync(process.execPath, ['scripts/qa_guarded_release_manifest.mjs', '--manifest', 'data/buildops/mp05-b07-wet-riser-receiver-01.release-manifest.json', '--out', qa], { cwd: root, stdio: 'pipe', timeout: 120_000 });
    expect(JSON.parse(fs.readFileSync(qa, 'utf8')).status).toBe('PASS');
    const auth = JSON.parse(fs.readFileSync(path.join(root, authorization), 'utf8'));
    expect(auth.authorizedReleaseNodes).toEqual(['CZ-MP05-B07-WET-RISER-RECEIVER']);
    expect(auth.authorizationPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(path.join(root, 'scripts/qa_mp05_b07_wet_riser_receiver_01_post_release.mjs'))).toBe(true);
  });
});
