import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const PROTOCOL = path.join(ROOT, 'scripts/publish_mp01_isolated_direct_lamp_runtime_proof_protocol_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z';
const CANDIDATE = 'data/world-review/mp01-functional-front-audit-20260828T040000Z/direct-lamp-calibration-candidate.json';
const TOPOLOGY = 'data/world-review/mp01-direct-lamp-access-return-topology-20260828T040000Z/mp01-direct-lamp-access-return-topology-01.json';
const BOUNDARY = 'data/world-review/mp01-direct-lamp-east-sequential-boundary-design-20260828T040000Z/mp01-direct-lamp-east-sequential-boundary-design-01.json';
const READINESS = 'data/world-review/mp01-isolated-direct-lamp-readiness-contract-20260828T050000Z/mp01-isolated-direct-lamp-readiness-interaction-contract-01.json';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-direct-lamp-protocol-'));

afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('MP01 isolated direct-lamp runtime proof protocol', () => {
  it('binds the static candidate but leaves all prerequisite gates unaccepted and no interaction authority', () => {
    const out = path.join(directory, 'protocol.json');
    execFileSync(process.execPath, [PROTOCOL,
      '--snapshot', SNAPSHOT, '--candidate', CANDIDATE, '--topology', TOPOLOGY, '--boundary', BOUNDARY, '--readiness', READINESS,
      '--out', out, '--markdown', path.join(directory, 'protocol.md'), '--map', path.join(directory, 'protocol.svg'),
      '--generated-at', '2026-08-28T06:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(report).toMatchObject({
      id: 'MP01-ISOLATED-DIRECT-LAMP-RUNTIME-PROOF-PROTOCOL-01',
      status: 'PREPARE_ONLY_PROTOCOL__CURRENT_PRODUCTION_PROOF_BLOCKED',
      mutationAuthority: false,
      currentHardStop: { active: true },
      safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, leverOrLampInteractionsPerformed: 0, worldEditsPerformed: false, operationFilesEmitted: 0 },
    });
    expect(report.prerequisiteGates).toHaveLength(5);
    expect(report.prerequisiteGates.every((gate: { accepted: boolean }) => gate.accepted === false)).toBe(true);
    expect(report.interactionSequence.map((phase: { phase: string }) => phase.phase)).toEqual([
      'PRE_OFF_CAPTURE', 'CLICK_ON', 'POST_ON_CAPTURE', 'CLICK_OFF_RESTORE', 'POST_OFF_CAPTURE',
    ]);
    expect(report.observerEvidence.actorTrace.allowedInteraction).toMatchObject({ method: 'mineflayer.activateBlock', target: { x: 1998, y: 165, z: -902 }, maximumGenuineClicks: 2 });
    expect(report.stopTriggers).toEqual(expect.arrayContaining([expect.stringMatching(/blind reset/i)]));
    expect(fs.readFileSync(path.join(directory, 'protocol.svg'), 'utf8')).toContain('OFF ×2');
  }, 30_000);
});
