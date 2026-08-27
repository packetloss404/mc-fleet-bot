import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT = path.join(ROOT, 'scripts/contract_mp01_isolated_direct_lamp_readiness_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z';
const CANDIDATE = 'data/world-review/mp01-functional-front-audit-20260828T040000Z/direct-lamp-calibration-candidate.json';
const TOPOLOGY = 'data/world-review/mp01-direct-lamp-access-return-topology-20260828T040000Z/mp01-direct-lamp-access-return-topology-01.json';
const BOUNDARY = 'data/world-review/mp01-direct-lamp-east-sequential-boundary-design-20260828T040000Z/mp01-direct-lamp-east-sequential-boundary-design-01.json';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-direct-lamp-readiness-'));

afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('MP01 isolated direct-lamp readiness / interaction contract', () => {
  it('binds the exact two-cell candidate and fails closed while runtime/access proof is missing', () => {
    const out = path.join(directory, 'contract.json');
    execFileSync(process.execPath, [CONTRACT,
      '--snapshot', SNAPSHOT, '--candidate', CANDIDATE, '--topology', TOPOLOGY, '--boundary', BOUNDARY,
      '--out', out, '--markdown', path.join(directory, 'contract.md'), '--map', path.join(directory, 'contract.svg'),
      '--generated-at', '2026-08-28T05:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(report).toMatchObject({
      id: 'MP01-ISOLATED-DIRECT-LAMP-READINESS-INTERACTION-CONTRACT-01',
      status: 'HOLD_RUNTIME_PROOF_AND_OWNER_BOUND_ACCESS_RETURN',
      mutationAuthority: false,
      candidate: { envelope: { cellCount: 36, fluidOrGravityHazardCount: 0, blockEntityCount: 0, savedEntityCount: 0 }, targetAndInverse: { ready: false, operationsEmitted: 0 } },
      interactionProofRequired: { status: 'MISSING' },
      accessAndReturnRequired: { status: 'MISSING', currentTopology: { closedExitCount: 3, outboundRouteAccepted: false, recoveryRouteAccepted: false } },
      safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false },
    });
    expect(report.candidate.cells).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'lever', cell: { x: 1998, y: 165, z: -902 }, sourceState: 'minecraft:air' }),
      expect.objectContaining({ role: 'lamp', cell: { x: 1999, y: 165, z: -902 }, sourceState: 'minecraft:air' }),
    ]));
    expect(report.interactionProofRequired.sequence).toHaveLength(8);
    expect(report.interactionProofRequired.sequence.map((entry: { phase: string }) => entry.phase)).toEqual([
      'OFF_1', 'OFF_2', 'CLICK_ON', 'ON_1', 'ON_2', 'CLICK_OFF', 'OFF_RESET_1', 'OFF_RESET_2',
    ]);
    expect(fs.readFileSync(path.join(directory, 'contract.svg'), 'utf8')).toContain('(1998,165,-902)');
    expect(fs.readFileSync(path.join(directory, 'contract.svg'), 'utf8')).toContain('(1999,165,-902)');
  }, 30_000);
});
