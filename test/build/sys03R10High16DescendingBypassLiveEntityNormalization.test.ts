import { execFileSync, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const MANIFEST = 'data/buildops/sys03-high16-descending-live-20260826T151825Z.manifest.json';
const NORMALIZER = 'scripts/normalize_sys03_r10_high16_descending_bypass_live_entity_clearance.mjs';
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-high16-live-entity-normalization-'));
const sha = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

const rawFor = (stageId = 'shell-gravity-lock') => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8'));
  const stage = manifest.stages.find((entry: { id: string }) => entry.id === stageId);
  const chunks = [{ chunk: [-21, -30] }];
  return {
    schemaVersion: 2,
    generatedAtUtc: '2026-08-26T15:30:00Z',
    status: 'PASS', passed: true, blockOrEntityMutation: false, temporaryForceLoadMutation: true, blockerNbtCaptureRequested: true,
    packages: [{
      file: stage.forward, operationSha256: sha(fs.readFileSync(path.join(ROOT, stage.forward))), passed: true,
      entitiesReturnedInEnvelope: 0, blockers: [], protectedNonBlockingEntities: [], selectorLimitReached: false,
      queryErrors: [], blockerNbtCaptureErrors: [], blockerNbtCaptures: 0, targetHaloChunks: chunks,
      categoryQueries: [
        { category: 'player', selectedCount: 0, parsedPositions: 0, selectorLimitReached: false },
        { category: 'non-player', selectedCount: 0, parsedPositions: 0, selectorLimitReached: false },
      ],
      spatialQueries: [
        { category: 'player', selectedCount: 0, parsedPositions: 0, selectorLimitReached: false },
        { category: 'non-player', selectedCount: 0, parsedPositions: 0, selectorLimitReached: false },
      ],
    }],
    forceLoadAudit: { allRequiredChunksLoadedBeforeQueries: true, missingRequiredChunks: [], allTemporaryChunksReleased: true, finalSetMatchesPreExistingSet: true, cleanupErrors: [] },
    totals: { packages: 1, passed: 1, failed: 0, entitiesReturnedInEnvelopes: 0, blockingEntityHits: 0, blockerNbtCaptures: 0, blockerNbtCaptureErrors: 0 },
  };
};

describe('SYS-03 High-16 live entity evidence normalization', () => {
  it('binds an exact empty generic stage observation to the full interaction set', () => {
    const raw = path.join(DIR, 'shell-raw.json'); const out = path.join(DIR, 'shell-normalized.json');
    fs.writeFileSync(raw, `${JSON.stringify(rawFor(), null, 2)}\n`);
    execFileSync(process.execPath, [NORMALIZER, '--raw-report', raw, '--manifest', MANIFEST, '--stage', 'shell-gravity-lock', '--out', out], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS', passed: true, operationSha256: '8e65333e8d72efccd5e2d4ec03cae65e400d7f3523f94b3f486d81534ce0e1e0',
      interactionCoordinateSetSha256: '0a0c3df0b10ac690704ddd594994ffe9bf8bb10445ae23b34ee4e33b6458f751', interactionCoordinateCount: 6921,
      liveEntityHits: 0, entityCount: 0, blockOrEntityMutation: false, readOnlyFacts: true,
      adapter: { readOnly: true, worldMutated: false, rconCalled: false },
      stage: { id: 'shell-gravity-lock', targetCount: 1638 },
    });
  });

  it('fails closed on a generic report with a live entity observation', () => {
    const raw = path.join(DIR, 'core-nonempty-raw.json'); const out = path.join(DIR, 'core-nonempty-normalized.json');
    const report = rawFor('core-clear-top-down'); report.packages[0].entitiesReturnedInEnvelope = 1;
    fs.writeFileSync(raw, `${JSON.stringify(report, null, 2)}\n`);
    const run = spawnSync(process.execPath, [NORMALIZER, '--raw-report', raw, '--manifest', MANIFEST, '--stage', 'core-clear-top-down', '--out', out], { cwd: ROOT, encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('contains live entities');
    expect(fs.existsSync(out)).toBe(false);
  });

  it('fails closed when the raw operation hash is not the exact selected stage', () => {
    const raw = path.join(DIR, 'shell-drift-raw.json'); const out = path.join(DIR, 'shell-drift-normalized.json');
    const report = rawFor(); report.packages[0].operationSha256 = '0'.repeat(64);
    fs.writeFileSync(raw, `${JSON.stringify(report, null, 2)}\n`);
    const run = spawnSync(process.execPath, [NORMALIZER, '--raw-report', raw, '--manifest', MANIFEST, '--stage', 'shell-gravity-lock', '--out', out], { cwd: ROOT, encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('exact selected stage operation');
    expect(fs.existsSync(out)).toBe(false);
  });
});
