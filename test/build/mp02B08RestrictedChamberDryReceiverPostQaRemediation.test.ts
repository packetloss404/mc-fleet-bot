import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = 'data/worldsnap-mp02-b08-restricted-chamber-dry-receiver-source-20260827T023000Z';
const POST = 'data/worldsnap-mp02-b08-restricted-chamber-dry-receiver-post-20260827T023000Z';
const LIVE = 'data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z';
const MANIFEST = `${LIVE}/rebound/buildops/mp02-b08-restricted-chamber-dry-receiver-01.release-manifest.json`;
const TRANSACTION = `${LIVE}/fresh-kernel-ledger.json`;
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

describe('MP02 B08 chamber executed post-QA preservation remediation', () => {
  it('fails closed on the legacy omission, then independently source-binds every protected B03/B09 cell before full post-QA', () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-post-qa-remediation-'));
    temporary.push(work);
    expect(() => execFileSync(process.execPath, [
      'scripts/qa_mp02_b08_restricted_chamber_dry_receiver_01_post_release.mjs', '--snapshot', POST, '--manifest', MANIFEST, '--out', path.join(work, 'legacy.json'),
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 })).toThrow(/lacks the exact 19-cell B09 guideway\/control preservation baseline/);

    const remediation = JSON.parse(execFileSync(process.execPath, [
      'scripts/remediate_mp02_b08_restricted_chamber_dry_receiver_post_qa_01.mjs', '--source-snapshot', SOURCE, '--post-snapshot', POST, '--manifest', MANIFEST, '--transaction-ledger', TRANSACTION, '--out', path.join(work, 'preservation-acceptance.json'),
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));
    expect(remediation).toMatchObject({ status: 'PASS_SOURCE_BOUND_POST_PRESERVATION_RECONSTRUCTION', preservation: { B03Aperture: 20, B09Cap: 12, B09GuidewayAndControls: 19 }, mutationAuthority: false });
    const qa = JSON.parse(execFileSync(process.execPath, [
      'scripts/qa_mp02_b08_restricted_chamber_dry_receiver_01_post_release.mjs', '--snapshot', POST, '--manifest', MANIFEST, '--preservation-remediation-ledger', path.join(work, 'preservation-acceptance.json'), '--out', path.join(work, 'full-post-qa.json'),
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));
    expect(qa).toMatchObject({ status: 'PASS_EXECUTED_RESTRICTED_CHAMBER_DRY_RECEIVER_POST_QA', targetSummary: { count: 835, passed: 835, failed: 0, exactInverseByPackage: true }, routeSummary: { count: 6, passed: 6 } });
    expect(JSON.parse(fs.readFileSync(path.join(work, 'full-post-qa.json'), 'utf8'))).toMatchObject({ preservation: { B03Aperture: { count: 20, failed: 0 }, B09Cap: { count: 12, failed: 0 }, B09GuidewayAndControls: { count: 19, failed: 0 } } });
    const maps = JSON.parse(execFileSync(process.execPath, [
      'scripts/render_mp02_b08_restricted_chamber_post_maps_01.mjs', '--snapshot', POST, '--manifest', MANIFEST, '--post-qa', path.join(work, 'full-post-qa.json'), '--preservation-remediation-ledger', path.join(work, 'preservation-acceptance.json'), '--out-dir', path.join(work, 'maps'),
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));
    expect(maps).toMatchObject({ status: 'PASS_POST_SNAPSHOT_BOUND_EVIDENCE_MAPS', maps: ['mp02-b08-restricted-chamber-post-plan.svg', 'mp02-b08-restricted-chamber-post-section.svg', 'mp02-b08-restricted-chamber-post-route-failure.svg'], mutationAuthority: false });
  }, 30_000);
});
