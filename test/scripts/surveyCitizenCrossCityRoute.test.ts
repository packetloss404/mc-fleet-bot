import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { validateConfig } from '../../src/config';

const root = process.cwd();
const report = JSON.parse(fs.readFileSync(path.join(
  root,
  'data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json',
), 'utf8'));
const proposal = JSON.parse(fs.readFileSync(path.join(
  root,
  'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json',
), 'utf8'));
const routeQaProposal = JSON.parse(fs.readFileSync(path.join(
  root,
  'data/world-review/town-expansion-r1-citizen-route-qa-manifest-proposal-20260728.json',
), 'utf8'));

describe('Ravensreach to MainStreet citizen commute survey', () => {
  it('binds the post-release route and exact trace to the immutable post snapshot', () => {
    expect(report.status).toBe('PASS');
    expect(report.state).toBe('PASS_OFFLINE_EXISTING_SURFACE_ROUTE');
    expect(report.acceptanceClass).toBe('OFFLINE_ROUTE_ONLY_LIVE_GATES_PENDING');
    expect(report.acceptedPostSnapshotSha256)
      .toBe('1f036e48a82ccd5061e34686b049700e861b7a3bc99f69bd03ee3b1c1b2e463a');
    expect(report.accepted.snapshot.sha256).toBe(report.acceptedPostSnapshotSha256);
    expect(report.accepted.status).toBe('PASS_OFFLINE_NORMAL_WALK');
    expect(report.accepted.forwardSegments).toHaveLength(48);
    expect(report.accepted.reverseSegments).toHaveLength(48);
    expect(report.accepted.forwardSegments.every(
      (segment: { passed: boolean; maximumStep: number }) => (
        segment.passed && segment.maximumStep <= 1
      ),
    )).toBe(true);
    expect(report.accepted.reverseSegments.every(
      (segment: { passed: boolean; maximumStep: number }) => (
        segment.passed && segment.maximumStep <= 1
      ),
    )).toBe(true);
    expect(report.exactPathCellCount).toBe(540);
    expect(report.accepted.exactPathCellCount).toBe(report.exactPathCellCount);
    expect(report.exactPathSha256)
      .toBe('9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701');
    expect(report.accepted.exactPathSha256).toBe(report.exactPathSha256);
    expect(report.accepted.exactPath).toHaveLength(report.exactPathCellCount);
    expect(report.accepted.routineWaypoints).toHaveLength(49);
    expect(report.comparisonRole).toBe('DIAGNOSTIC_PRERELEASE_BASELINE_ONLY');
  });

  it('keeps the exact walking line clear of hazards, block entities, buildings, and mining zones', () => {
    expect(report.accepted.hazards.exactPathHazards).toEqual([]);
    expect(report.accepted.hazards.haloHazards).toEqual([]);
    expect(report.accepted.hazards.gravitySupports).toEqual([]);
    expect(report.accepted.hazards.nearbyBlockEntities).toEqual([]);
    expect(report.protection.buildingIntersections).toEqual([]);
    expect(report.protection.miningProtectedZoneIntersections).toEqual([]);
    expect(report.accepted.headroom.requiredClearBlocks).toBe(2);
    expect(report.accepted.headroom.minimumClearBlocks).toBe(4);
    expect(report.accepted.headroom.belowRequired).toEqual([]);
  });

  it('keeps the lounge claim honest and records every width choke', () => {
    expect(report.destinationTruth.employeeLoungeStatus)
      .toBe('PLANNED_NOT_AS_BUILT_IN_SURVEY_SNAPSHOTS');
    expect(report.accepted.physicalWidth.minimumContiguousStandableWidth).toBe(1);
    expect(report.accepted.physicalWidth.belowThreeWideCount).toBe(4);
    expect(report.accepted.physicalWidth.belowThreeWide).toEqual([
      { point: [-82, 65, -206], contiguousWidth: 2 },
      { point: [-82, 66, -158], contiguousWidth: 2 },
      { point: [-82, 65, -110], contiguousWidth: 2 },
      { point: [-79, 65, -79], contiguousWidth: 1 },
    ]);
    expect(report.buildSchedule.requiredForTemporaryCitizenCommute).toBe(false);
    const mapPath = path.join(root, report.evidenceMap.file);
    expect(fs.existsSync(mapPath)).toBe(true);
    expect(crypto.createHash('sha256').update(fs.readFileSync(mapPath)).digest('hex'))
      .toBe(report.evidenceMap.sha256);
    expect(report.evidenceMap.sourceAtlas.sourceSnapshotSha256)
      .toBe(report.acceptedPostSnapshotSha256);
  });

  it('persists the full 12-directional-failure diagnosis for the superseded route', () => {
    const diagnosis = report.accepted.supersededRouteDiagnosis;
    expect(diagnosis.status).toBe('CONFIRMED_12_DIRECTIONAL_FAILURES');
    expect(diagnosis.failureCount).toBe(12);
    expect(diagnosis.failedSegments).toHaveLength(12);
    expect(diagnosis.checkpointEvidence).toHaveLength(7);
    expect(diagnosis.checkpointEvidence.filter(
      (row: { standable: boolean }) => !row.standable,
    )).toHaveLength(4);
  });

  it('produces a schema-valid, non-destructive five-bot config merge proposal', () => {
    const current = yaml.load(fs.readFileSync(path.join(root, 'config.yml'), 'utf8')) as {
      leash?: unknown;
      [key: string]: unknown;
    };
    const merged = {
      ...current,
      ...proposal.configYmlMergeProposal,
    };
    expect(validateConfig(merged).ok).toBe(true);
    expect(proposal.status).toBe('PROPOSED_NOT_APPLIED');
    expect(proposal.configYmlMergeProposal.leash).toHaveLength(5);
    expect(proposal.townConfigJsonMergeProposal.citizenRoutine.shifts).toHaveLength(5);
    expect(proposal.townConfigJsonMergeProposal.citizenRoutine.shifts.every(
      (shift: { nonDestructive: boolean; waypoints: unknown[] }) => (
        shift.nonDestructive && shift.waypoints.length === 49
      ),
    )).toBe(true);
    expect(proposal.activationGates.some(
      (gate: string) => gate.includes('4 sub-three-wide choke cross-sections'),
    )).toBe(true);
  });

  it('offers only a hash-bound, explicitly incomplete live route-QA proposal', () => {
    expect(routeQaProposal.status).toBe('PROPOSED_NOT_LIVE_VERIFIED');
    expect(routeQaProposal.completeForTownExpansionAcceptance).toBe(false);
    expect(routeQaProposal.postSnapshotSha256)
      .toBe(report.acceptedPostSnapshotSha256);
    expect(routeQaProposal.sourceSurvey.exactPathSha256)
      .toBe(report.exactPathSha256);
    expect(routeQaProposal.routes).toHaveLength(1);
    expect(routeQaProposal.routes[0].points)
      .toEqual(report.accepted.routineWaypoints);
    const packagePath = path.join(
      root,
      routeQaProposal.packageFiles['town-expansion-r1-2026-07-28'],
    );
    expect(crypto.createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex'))
      .toBe('1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896');
  });
});
