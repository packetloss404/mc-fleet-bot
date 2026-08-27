import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-sys03-high16-descending-source-20260826T151825Z';
const MANIFEST = 'data/buildops/sys03-high16-descending-live-20260826T151825Z.manifest.json';
const PROPOSAL = 'data/world-review/sys03-high16-descending-live-20260826T151825Z/protocol/sys03-r10-high16-descending-bypass-owner-interface-proposal.json';
const ACCEPTANCE = 'data/world-review/sys03-high16-descending-live-20260826T151825Z/protocol/sys03-r10-high16-descending-bypass-owner-interface-renewal-accepted.json';
const QA = 'scripts/qa_sys03_r10_high16_descending_bypass_independent_static_source.mjs';
const CHECKLIST = 'scripts/generate_sys03_r10_high16_descending_bypass_staged_release_checklist.mjs';
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-high16-fresh-kernel-'));

afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

describe('SYS-03 High-16 fresh-kernel static support', () => {
  it('independently proves the fresh accepted source and protected-core clearance', () => {
    const qa = path.join(DIR, 'independent-static-qa.json');
    const clearance = path.join(DIR, 'block-entity-clearance.json');
    const markdown = path.join(DIR, 'independent-static-qa.md');
    const run = spawnSync(process.execPath, [QA, '--snapshot', SNAPSHOT, '--manifest', MANIFEST, '--proposal', PROPOSAL,
      '--acceptance', ACCEPTANCE, '--out', qa, '--clearance-out', clearance, '--out-md', markdown], { cwd: ROOT, encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(JSON.parse(fs.readFileSync(qa, 'utf8'))).toMatchObject({
      status: 'PASS', civilOnly: true, passengerServiceCommissioned: false, readOnly: true, worldMutated: false, rconCalled: false,
      geometry: { stations: 46, core: 3257, shell: 1696, halo: 1968, interaction: 6921, connectedCore: 3257 },
      stages: { 'shell-gravity-lock': { forward: 1638, rollback: 1638 }, 'core-clear-top-down': { forward: 3227, rollback: 3227 } },
    });
    expect(JSON.parse(fs.readFileSync(clearance, 'utf8'))).toMatchObject({
      status: 'PASS', operations: { forwardTargets: 4865 }, protectedCore: { declaredTargets: 1014, observedTargets: 1014, operationOverlap: [] },
      interactionCoordinateSetSha256: '0a0c3df0b10ac690704ddd594994ffe9bf8bb10445ae23b34ee4e33b6458f751', interactionCoordinateCount: 6921,
      blockEntities: { inInteractionEnvelope: 0 }, savedEntitiesAtCapture: { inInteractionEnvelope: 0, notLiveEntityClearance: true },
    });
  }, 30_000);

  it('emits a bound checklist but never invokes RCON', () => {
    const qa = path.join(DIR, 'independent-static-qa.json');
    const clearance = path.join(DIR, 'block-entity-clearance.json');
    if (!fs.existsSync(qa)) execFileSync(process.execPath, [QA, '--snapshot', SNAPSHOT, '--manifest', MANIFEST, '--proposal', PROPOSAL,
      '--acceptance', ACCEPTANCE, '--out', qa, '--clearance-out', clearance], { cwd: ROOT, stdio: 'pipe' });
    const checklist = path.join(DIR, 'staged-release-checklist.md');
    execFileSync(process.execPath, [CHECKLIST, '--snapshot', SNAPSHOT, '--manifest', MANIFEST, '--proposal', PROPOSAL,
      '--acceptance', ACCEPTANCE, '--static-qa', qa, '--clearance', clearance, '--out', checklist], { cwd: ROOT, stdio: 'pipe' });
    const text = fs.readFileSync(checklist, 'utf8');
    expect(text).toContain('SOURCE_KERNEL_READY_NOT_EXECUTED');
    expect(text).toContain('shell-gravity-lock');
    expect(text).toContain('core-clear-top-down');
    expect(text).toContain('second immediate entity gate');
    expect(text).toContain('--strict-noop');
  }, 30_000);
});
