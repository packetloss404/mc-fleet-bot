import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z';
const temporary: string[] = [];

afterEach(() => temporary.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

describe('MP02 B08 restricted chamber / dry receiver fresh-kernel release wrapper', () => {
  it('rebinds the full static package and proves source/rollback gates in prepare-only mode', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-restricted-chamber-release-'));
    temporary.push(parent);
    const output = path.join(parent, 'fresh-output');
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp02_b08_restricted_chamber_dry_receiver_release.mjs',
      '--source-snapshot-root', SNAPSHOT,
      '--out-dir', output,
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 }));

    expect(result).toMatchObject({
      status: 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE',
      mutationAuthority: false,
    });
    const ledger = JSON.parse(fs.readFileSync(path.join(output, 'fresh-kernel-ledger.json'), 'utf8'));
    expect(ledger).toMatchObject({
      mode: 'PREPARE_ONLY',
      status: 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE',
      sourceSnapshot: { root: SNAPSHOT },
    });
    expect(ledger.stages).toHaveLength(34);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
    expect(ledger.stages.some((stage: { stage: string }) => stage.stage === 'same-moment-live-entity-clearance')).toBe(false);
    expect(fs.existsSync(path.join(output, 'independent-post-release-qa.json'))).toBe(false);

    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'rebound/buildops/mp02-b08-restricted-chamber-dry-receiver-01.release-manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER',
      scope: { releaseId: 'MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER-01' },
    });
  }, 90_000);
});
