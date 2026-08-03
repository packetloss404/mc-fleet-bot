import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

import { describe, expect, it } from 'vitest';

import {
  CITIZEN_ROUTE_CONTRACT,
  validateCitizenLiveWalkAudit,
  validateCitizenRouteProposal,
  validateCitizenRouteReport,
} from '../../scripts/lib/citizen-route-contract.mjs';

const root = process.cwd();
const reportPath = path.join(
  root,
  'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
);
const proposalPath = path.join(
  root,
  'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json',
);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hashFile(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function passingAudit() {
  const routeContract = validateCitizenRouteReport(report);
  const forward = routeContract.route.map((target: number[]) => ({
    target,
    passed: true,
  }));
  const reverse = [...routeContract.route].reverse().map((target: number[]) => ({
    target,
    passed: true,
  }));
  return {
    schemaVersion: 1,
    status: 'PASS_BIDIRECTIONAL',
    offlineAcceptedSnapshotSha256:
      CITIZEN_ROUTE_CONTRACT.postSnapshotSha256,
    exactPathSha256: CITIZEN_ROUTE_CONTRACT.exactPathSha256,
    offlineAcceptanceClass: CITIZEN_ROUTE_CONTRACT.acceptanceClass,
    exactPathCellCount: CITIZEN_ROUTE_CONTRACT.exactPathCellCount,
    routineWaypointCount: CITIZEN_ROUTE_CONTRACT.routineWaypointCount,
    minimumHeadroomBlocks:
      CITIZEN_ROUTE_CONTRACT.verifiedMinimumHeadroomBlocks,
    declaredWidthChokes: CITIZEN_ROUTE_CONTRACT.belowThreeWide,
    staging: { passed: true, checkpoints: [] },
    forward: { passed: true, checkpoints: forward },
    reverse: { passed: true, checkpoints: reverse },
    digCountBefore: 0,
    digCountAfter: 0,
    noDigObserved: true,
    securityIncidentsBefore: [],
    securityIncidentsAfter: [],
  };
}

describe('citizen route activation evidence contract', () => {
  it('accepts only the exact 49-checkpoint post-release report and proposal', () => {
    const routeContract = validateCitizenRouteReport(report);
    const proposalContract = validateCitizenRouteProposal(
      proposal,
      routeContract,
    );

    expect(routeContract.route).toHaveLength(49);
    expect(routeContract.accepted.exactPath).toHaveLength(540);
    expect(routeContract.chokes).toEqual([
      { point: [-82, 65, -206], contiguousWidth: 2 },
      { point: [-82, 66, -158], contiguousWidth: 2 },
      { point: [-82, 65, -110], contiguousWidth: 2 },
      { point: [-79, 65, -79], contiguousWidth: 1 },
    ]);
    expect(proposalContract.leash).toHaveLength(5);
    expect(proposalContract.shifts).toHaveLength(5);
  });

  it.each([
    ['post snapshot hash', (value: any) => {
      value.acceptedPostSnapshotSha256 = '0'.repeat(64);
    }],
    ['exact path hash', (value: any) => {
      value.accepted.exactPathSha256 = '0'.repeat(64);
    }],
    ['acceptance class', (value: any) => {
      value.acceptanceClass = 'LIVE_READY';
    }],
    ['checkpoint count', (value: any) => {
      value.accepted.routineWaypoints.pop();
    }],
    ['headroom', (value: any) => {
      value.accepted.headroom.minimumClearBlocks = 3;
    }],
    ['hazard', (value: any) => {
      value.accepted.hazards.exactPathHazards.push({
        point: [-82, 65, -206],
        state: 'minecraft:water',
      });
    }],
    ['choke disclosure', (value: any) => {
      value.accepted.physicalWidth.belowThreeWide.pop();
    }],
    ['snapshot comparison role', (value: any) => {
      value.snapshotsAgree = true;
    }],
  ])('rejects %s drift', (_name, mutate) => {
    const changed = clone(report);
    mutate(changed);
    expect(() => validateCitizenRouteReport(changed)).toThrow(
      /citizen route contract rejected/,
    );
  });

  it('requires an exact PASS_BIDIRECTIONAL audit before shift activation', () => {
    const routeContract = validateCitizenRouteReport(report);
    const audit = passingAudit();
    expect(validateCitizenLiveWalkAudit(audit, routeContract)).toBe(audit);

    const wrongHash = clone(audit);
    wrongHash.exactPathSha256 = '0'.repeat(64);
    expect(() => validateCitizenLiveWalkAudit(wrongHash, routeContract))
      .toThrow(/live-walk audit identity/);

    const hiddenChoke = clone(audit);
    hiddenChoke.declaredWidthChokes.pop();
    expect(() => validateCitizenLiveWalkAudit(hiddenChoke, routeContract))
      .toThrow(/live-walk audit identity/);

    const partialReverse = clone(audit);
    partialReverse.reverse.checkpoints.pop();
    expect(() => validateCitizenLiveWalkAudit(partialReverse, routeContract))
      .toThrow(/reverse direction is not a complete pass/);
  });

  it('dry-runs corridor and matching-audit shifts without changing durable state', () => {
    const durableFiles = [
      path.join(root, 'config.yml'),
      path.join(root, 'data/town.db'),
      path.join(root, 'data/blackboard.json'),
      reportPath,
      proposalPath,
    ];
    const before = Object.fromEntries(
      durableFiles.map((filename) => [filename, hashFile(filename)]),
    );

    const corridor = spawnSync(
      process.execPath,
      [
        'scripts/apply_citizen_cross_city_route.mjs',
        '--phase',
        'corridor',
        '--dry-run',
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(corridor.status, corridor.stderr).toBe(0);
    const corridorPreview = JSON.parse(corridor.stdout);
    expect(corridorPreview.mode).toBe('dry-run');
    expect(corridorPreview.routineWaypointCount).toBe(49);
    expect(corridorPreview.acceptanceClass)
      .toBe('OFFLINE_ROUTE_ONLY_LIVE_GATES_PENDING');
    expect(corridorPreview.walkAudit).toBeNull();

    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'citizen-route-audit-'));
    const auditPath = path.join(tempDirectory, 'passing-live-audit.json');
    try {
      fs.writeFileSync(auditPath, `${JSON.stringify(passingAudit(), null, 2)}\n`);
      const shifts = spawnSync(
        process.execPath,
        [
          'scripts/apply_citizen_cross_city_route.mjs',
          '--phase',
          'shifts',
          '--dry-run',
          '--walk-audit',
          auditPath,
        ],
        { cwd: root, encoding: 'utf8' },
      );
      expect(shifts.status, shifts.stderr).toBe(0);
      const shiftPreview = JSON.parse(shifts.stdout);
      expect(shiftPreview.mode).toBe('dry-run');
      expect(shiftPreview.walkAudit).toBe(auditPath);
      expect(shiftPreview.voyagerEnabledAfter).toBe(true);
      expect(shiftPreview.townPausedAfter).toBe(false);
    } finally {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }

    const after = Object.fromEntries(
      durableFiles.map((filename) => [filename, hashFile(filename)]),
    );
    expect(after).toEqual(before);
  });

  it('supports a network-free, mutation-free live-walker contract check', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/run_citizen_route_live_walk.mjs', '--contract-check'],
      { cwd: root, encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.status).toBe('PASS_CONTRACT_CHECK_ONLY');
    expect(output.liveWorldRead).toBe(false);
    expect(output.liveWorldMutated).toBe(false);
    expect(output.routineWaypointCount).toBe(49);
    expect(output.remainingGate).toBe('PASS_BIDIRECTIONAL live walk required');
  });
});
