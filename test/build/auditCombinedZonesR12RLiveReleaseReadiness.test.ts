import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { auditR12RLiveReadiness } from '../../scripts/audit_combined_zones_r12r_live_release_readiness.mjs';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-22T05:45:00Z';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12r-readiness-test-'));
const dataPrefix = `data/world-review/.r12r-readiness-test-${process.pid}-${Date.now()}`;
const BASE = 'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle';

afterAll(() => fs.rmSync(temporary, { recursive: true, force: true }));

function sha256(bytes: Buffer) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function writeJson(name: string, value: object) {
  const filename = path.join(temporary, `${name}.json`);
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
  return filename;
}

function destinations(suffix: string) {
  return {
    releaseOutDir: `${dataPrefix}-${suffix}-release`,
    terminalLoadedSnapshotRoot: `${dataPrefix}-${suffix}-terminal-loaded`,
    postSnapshotRoot: `${dataPrefix}-${suffix}-post`,
    recoveryLoadedSnapshotRoot: `${dataPrefix}-${suffix}-recovery-loaded`,
    recoverySnapshotRoot: `${dataPrefix}-${suffix}-recovery`,
  };
}

function evidence(sourceSnapshotBytes: number, minimumRequiredBytes: number,
  overrides: Record<string, object> = {}) {
  const controls = fs.readFileSync(path.join(
    ROOT, `${BASE}.b09-active-shuttle-fail-closed-controls.forward.txt`,
  ));
  const track = fs.readFileSync(path.join(
    ROOT, `${BASE}.b09-active-shuttle-fail-closed-track.forward.txt`,
  ));
  return {
    diskEvidence: writeJson(`disk-${Math.random()}`, {
      status: 'PASS', capturedAtUtc: GENERATED_AT, path: ROOT,
      sourceSnapshotBytes, minimumRequiredBytes,
      availableBytes: minimumRequiredBytes + 1024,
      ...overrides.disk,
    }),
    serviceEvidence: writeJson(`service-${Math.random()}`, {
      status: 'PASS', capturedAtUtc: GENERATED_AT,
      serviceName: 'mc-fleet-bot.service', activeState: 'active', subState: 'running',
      mainPid: 1234, processCount: 1,
      ...overrides.service,
    }),
    apiEvidence: writeJson(`api-${Math.random()}`, {
      status: 'PASS', capturedAtUtc: GENERATED_AT,
      statusEndpoint: 'http://127.0.0.1:3001/api/status', statusHttpStatus: 200,
      statusBody: { status: 'ok', botCount: 5 },
      botsEndpoint: 'http://127.0.0.1:3001/api/bots', botsHttpStatus: 200,
      connectedBotCount: 5, uniqueBotNames: true,
      ...overrides.api,
    }),
    liveEntityEvidence: writeJson(`entity-${Math.random()}`, {
      status: 'PASS', passed: true, capturedAtUtc: GENERATED_AT,
      blockingEntityHits: 0, entitiesReturnedInEnvelope: 0,
      operationsSha256: sha256(Buffer.concat([controls, track])),
      ...overrides.liveEntity,
    }),
  };
}

function baseline() {
  return auditR12RLiveReadiness({ generatedAt: GENERATED_AT });
}

describe('R12R live release readiness auditor', () => {
  it('truthfully waits without operational evidence or exact destinations', () => {
    const report = baseline();
    expect(report.status).toBe('WAIT_R12R_LIVE_RELEASE_EVIDENCE_INCOMPLETE');
    expect(report.rejects).toEqual([]);
    expect(report.waits).toContain('missing fresh disk evidence');
    expect(report.commandProbes.status).toBe('PASS');
    expect(report.safetyBoundary).toMatchObject({
      rconConnected: false,
      apiContacted: false,
      systemdContacted: false,
      worldMutationPerformed: false,
    });
  });

  it('passes only with exact fresh health, disk, entity, and path inputs', () => {
    const initial = baseline();
    const inputs = evidence(
      initial.source.sourceSnapshotBytes,
      initial.diskPolicy.minimumRequiredBytes,
    );
    const report = auditR12RLiveReadiness({
      generatedAt: GENERATED_AT,
      ...destinations('pass'),
      ...inputs,
    });
    expect(report.status).toBe('PASS_R12R_LIVE_RELEASE_READY');
    expect(report.waits).toEqual([]);
    expect(report.rejects).toEqual([]);
    expect(report.exactCoordinatorCli).toEqual([
      'node', 'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs',
      '--execute', '--confirm-production', 'combined-zones-r12r-b09-bounded-active-shuttle',
      '--out-dir', `${dataPrefix}-pass-release`,
      '--source-snapshot-root', 'data/worldsnap-r12q-post-20260822T044855Z',
      '--terminal-loaded-snapshot-root', `${dataPrefix}-pass-terminal-loaded`,
      '--post-snapshot-root', `${dataPrefix}-pass-post`,
      '--recovery-loaded-snapshot-root', `${dataPrefix}-pass-recovery-loaded`,
      '--recovery-snapshot-root', `${dataPrefix}-pass-recovery`,
    ]);
    expect(report.standardLedgerContract).toMatchObject({
      successStatus: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
      rollbackOrder: [
        'exact captured UUID/type/tag/AABB entity',
        'b09-active-shuttle-fail-closed-track',
        'b09-active-shuttle-fail-closed-controls',
      ],
    });
  });

  it('waits on insufficient recovery disk without weakening the minimum', () => {
    const initial = baseline();
    const inputs = evidence(
      initial.source.sourceSnapshotBytes,
      initial.diskPolicy.minimumRequiredBytes,
      { disk: { availableBytes: initial.diskPolicy.minimumRequiredBytes - 1 } },
    );
    const report = auditR12RLiveReadiness({
      generatedAt: GENERATED_AT,
      ...destinations('disk'),
      ...inputs,
    });
    expect(report.status).toBe('WAIT_R12R_LIVE_RELEASE_EVIDENCE_INCOMPLETE');
    expect(report.waits).toContain(
      'disk evidence does not meet exact four-save plus 2-GiB recovery minimum',
    );
    expect(report.rejects).toEqual([]);
  });

  it('waits on unhealthy or stale service/API evidence', () => {
    const initial = baseline();
    const inputs = evidence(
      initial.source.sourceSnapshotBytes,
      initial.diskPolicy.minimumRequiredBytes,
      {
        service: { activeState: 'inactive' },
        api: { capturedAtUtc: '2026-08-22T05:30:00Z' },
      },
    );
    const report = auditR12RLiveReadiness({
      generatedAt: GENERATED_AT,
      ...destinations('health'),
      ...inputs,
    });
    expect(report.status).toBe('WAIT_R12R_LIVE_RELEASE_EVIDENCE_INCOMPLETE');
    expect(report.waits).toContain('service evidence is not one active/running fleet process');
    expect(report.waits).toContain('api evidence is stale or future-dated');
  });

  it('rejects overlapping recovery destinations before any executable lane', () => {
    const initial = baseline();
    const inputs = evidence(
      initial.source.sourceSnapshotBytes,
      initial.diskPolicy.minimumRequiredBytes,
    );
    const paths = destinations('overlap');
    paths.recoverySnapshotRoot = paths.postSnapshotRoot;
    const report = auditR12RLiveReadiness({
      generatedAt: GENERATED_AT,
      ...paths,
      ...inputs,
    });
    expect(report.status).toBe('REJECTED_R12R_LIVE_RELEASE_STATIC_CONTRACT_DRIFT');
    expect(report.rejects).toContain(
      'coordinator destinations overlap: postSnapshotRoot/recoverySnapshotRoot',
    );
  });

  it('is payload deterministic for identical immutable and evidence inputs', () => {
    const initial = baseline();
    const inputs = evidence(
      initial.source.sourceSnapshotBytes,
      initial.diskPolicy.minimumRequiredBytes,
    );
    const options = {
      generatedAt: GENERATED_AT,
      ...destinations('deterministic'),
      ...inputs,
    };
    const first = auditR12RLiveReadiness(options);
    const second = auditR12RLiveReadiness(options);
    expect(first.readinessPayloadSha256).toBe(second.readinessPayloadSha256);
    expect(first).toEqual(second);
  });
});

