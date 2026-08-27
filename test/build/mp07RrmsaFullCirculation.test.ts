import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(ROOT, 'scripts/compile_mp07_rrmsa_full_circulation_01.mjs');
const QA = path.join(ROOT, 'scripts/qa_mp07_rrmsa_full_circulation_independent_post.mjs');
const SNAPSHOT = 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z';
const ROUTE_SURVEY = 'data/world-review/mp07-full-circulation-integrated-design-20260826T123537Z/current-source-route-survey.json';
const FRESH_SNAPSHOT = 'data/worldsnap-mp07-full-circulation-source-20260826T140500Z';
const FRESH_ROUTE_SURVEY = 'data/world-review/mp07-full-circulation-source-survey-20260826T140500Z/current-source-route-survey.json';
const PROPOSAL = 'data/world-review/mp07-full-circulation-integrated-design-20260826T123537Z/mp07-steward-west-lane-ownership-interface-contract-proposal.json';
const BASENAME = 'mp07-rrmsa-full-circulation-01-test';
const TARGET_HASH = 'e14267ec7c90553780596be3a455bf6c556c54e91f1169a85e0ff78f6b7efc11';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp07-full-circulation-'));
const contractPath = path.join(temporaryDirectory, 'accepted-contract.json');
const unacceptedContractPath = path.join(temporaryDirectory, 'unaccepted-contract.json');
const qaJson = path.join(temporaryDirectory, 'pre-release-qa.json');
const qaMd = path.join(temporaryDirectory, 'pre-release-qa.md');

interface Operation {
  point: [number, number, number];
  from: string;
  to: string;
}

interface ManifestForAssertions {
  releaseId: string;
  status: string;
  source: Record<string, unknown>;
  ownership: Record<string, unknown>;
  target: Record<string, unknown>;
  sourceSafety: Record<string, unknown>;
  functionalAcceptance: Record<string, unknown>;
  safetyBoundary: Record<string, unknown>;
}

interface QaReportForAssertions {
  status: string;
  checks: Record<string, boolean>;
}

function sha256(contents: Buffer | string): string {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function artifactPaths(): string[] {
  return [
    `${BASENAME}.forward.txt`,
    `${BASENAME}.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((name) => path.join(temporaryDirectory, name));
}

function operations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return {
        point: fields.slice(1, 4).map(Number) as [number, number, number],
        from: fields[7],
        to: fields[8],
      };
    });
}

function compile(contract = contractPath): void {
  execFileSync(process.execPath, [
    COMPILER,
    '--generated-at', '2026-08-26T14:20:00Z',
    '--snapshot', SNAPSHOT,
    '--contract', contract,
    '--route-survey', ROUTE_SURVEY,
    '--out-dir', temporaryDirectory,
    '--basename', BASENAME,
  ], { cwd: ROOT, stdio: 'pipe' });
}

function acceptedContract(): Record<string, unknown> {
  const proposal = JSON.parse(fs.readFileSync(path.join(ROOT, PROPOSAL), 'utf8')) as Record<string, unknown>;
  const transfers = proposal.transfers as Array<Record<string, unknown>>;
  return {
    ...proposal,
    contractId: 'MP07-RRMSA-FULL-CIRCULATION-INTERFACE-01',
    status: 'ACCEPTED_EXACT_3D_INTERFACE_CONTRACT',
    acceptedAtUtc: '2026-08-26T14:15:00Z',
    mutationAuthorityGranted: false,
    approvals: {
      ownerApprovals: transfers.map((transfer, index) => ({
        owner: transfer.from,
        reviewer: index === 0 ? 'RRCH-STEWARD-CUSTODIAN' : 'RRMSA-WEST-LANE-INTERFACE-CUSTODIAN',
        reviewRecord: `MP07-OWNERSHIP-REVIEW-${index + 1}`,
      })),
    },
    operationBinding: {
      releaseId: 'MP07-RRMSA-FULL-CIRCULATION-01',
      targetCoordinateSetSha256: TARGET_HASH,
      exactInverseRequired: true,
      cells: [
        { point: [-80, 66, -79], fromState: 'minecraft:polished_andesite', toState: 'minecraft:air' },
        { point: [-58, 70, -309], fromState: 'minecraft:stripped_dark_oak_log[axis=y]', toState: 'minecraft:air' },
        { point: [-58, 71, -309], fromState: 'minecraft:stripped_dark_oak_log[axis=y]', toState: 'minecraft:air' },
      ],
    },
  };
}

function renewedContract(): Record<string, unknown> {
  const contract = acceptedContract();
  const sourceSnapshot = contract.sourceSnapshot as Record<string, unknown>;
  return {
    ...contract,
    acceptedAtUtc: '2026-08-26T14:10:00Z',
    sourceSnapshot: {
      ...sourceSnapshot,
      directory: `${FRESH_SNAPSHOT}/region`,
      sha256: '9c83b0735458d33c82a5cd48aa645d776598c3ee43d9add06e792d69a714c303',
      regionFileCount: 52,
      completeSaveCapture: `${FRESH_SNAPSHOT}/combined-zones-complete-save-capture.json`,
    },
  };
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  fs.writeFileSync(contractPath, `${JSON.stringify(acceptedContract(), null, 2)}\n`);
  fs.writeFileSync(unacceptedContractPath, `${JSON.stringify({
    ...acceptedContract(),
    status: 'PROPOSED_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY',
  }, null, 2)}\n`);
  compile();
  firstCompile = artifactPaths().map((filename) => fs.readFileSync(filename));
  compile();
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('MP07 full-circulation compiler', () => {
  it('refuses the unaccepted ownership proposal before emitting a package', () => {
    expect(() => compile(unacceptedContractPath)).toThrow(/ACCEPTED_EXACT_3D_INTERFACE_CONTRACT/);
  });

  it('regenerates exact forward, rollback, and manifest artifacts byte-for-byte', () => {
    expect(artifactPaths().map((filename) => fs.readFileSync(filename))).toEqual(firstCompile);
  });

  it('binds the accepted contract, complete immutable source, and exact three-cell ownership set', () => {
    const manifest = JSON.parse(fs.readFileSync(artifactPaths()[2], 'utf8')) as ManifestForAssertions;
    expect(manifest).toMatchObject({
      releaseId: 'MP07-RRMSA-FULL-CIRCULATION-01',
      status: 'COMPILED_FROM_ACCEPTED_3D_INTERFACE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL',
      source: {
        snapshotRoot: SNAPSHOT,
        regionSnapshotSha256: 'a197c7d2f6b99cc71dcf3801712f263ba5795a0672f324a05dec7ffe49b10586',
        completePlanes: ['region', 'entities', 'poi', 'level.dat'],
      },
      ownership: {
        contract: path.relative(ROOT, contractPath).split(path.sep).join('/'),
        contractSha256: sha256(fs.readFileSync(contractPath)),
        targetCoordinateSetSha256: TARGET_HASH,
        allAndOnlyThreeTransferredCells: true,
      },
      target: {
        cells: { cellCount: 3, coordinateSetSha256: TARGET_HASH },
        desiredState: 'minecraft:air',
        exactInverse: true,
      },
      sourceSafety: {
        targetFluidGravityProtectedCount: 0,
        haloFluidGravityProtectedCount: 0,
        storedBlockEntityIntersectionCount: 0,
        savedEntityIntersectionCount: 0,
      },
      functionalAcceptance: {
        requiredForwardEdges: 48,
        requiredReverseEdges: 48,
        sourceEvidenceForwardPassed: 48,
        sourceEvidenceReversePassed: 48,
        targetsOutsideCanonicalFeetHeadSupport: true,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        rconCalled: false,
        executionAuthorizedByThisManifest: false,
      },
    });
  });

  it('emits the three exact transitions and a reverse-order inverse', () => {
    const [forwardPath, rollbackPath] = artifactPaths();
    const forward = operations(forwardPath);
    const rollback = operations(rollbackPath);
    expect(forward).toEqual([
      { point: [-58, 70, -309], from: 'minecraft:stripped_dark_oak_log[axis=y]', to: 'minecraft:air' },
      { point: [-58, 71, -309], from: 'minecraft:stripped_dark_oak_log[axis=y]', to: 'minecraft:air' },
      { point: [-80, 66, -79], from: 'minecraft:polished_andesite', to: 'minecraft:air' },
    ]);
    expect(rollback).toEqual(forward.slice().reverse().map(({ point, from, to }) => ({ point, from: to, to: from })));
  });

  it('accepts a renewed accepted contract only when it is rebound to the fresh source and its fresh 48/48 evidence', () => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'mp07-full-circulation-renewed-'));
    const renewedPath = path.join(output, 'renewed-accepted-contract.json');
    fs.writeFileSync(renewedPath, `${JSON.stringify(renewedContract(), null, 2)}\n`);
    try {
      execFileSync(process.execPath, [
        COMPILER,
        '--generated-at', '2026-08-26T14:11:00Z',
        '--snapshot', FRESH_SNAPSHOT,
        '--contract', renewedPath,
        '--route-survey', FRESH_ROUTE_SURVEY,
        '--out-dir', output,
        '--basename', 'mp07-rrmsa-full-circulation-01-renewed-test',
      ], { cwd: ROOT, stdio: 'pipe' });
      const manifest = JSON.parse(fs.readFileSync(
        path.join(output, 'mp07-rrmsa-full-circulation-01-renewed-test.release-manifest.json'),
        'utf8',
      )) as ManifestForAssertions;
      expect(manifest.source.regionSnapshotSha256)
        .toBe('9c83b0735458d33c82a5cd48aa645d776598c3ee43d9add06e792d69a714c303');
      expect(manifest.functionalAcceptance.sourceEvidenceForwardPassed).toBe(48);
      expect(manifest.functionalAcceptance.sourceEvidenceReversePassed).toBe(48);
    } finally {
      fs.rmSync(output, { recursive: true, force: true });
    }
  }, 30_000);

  it('does not let post-release QA falsely accept the unmodified source snapshot', () => {
    expect(() => execFileSync(process.execPath, [
      QA,
      '--post', SNAPSHOT,
      '--manifest', artifactPaths()[2],
      '--route-survey', ROUTE_SURVEY,
      '--out-json', qaJson,
      '--out-md', qaMd,
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
    const report = JSON.parse(fs.readFileSync(qaJson, 'utf8')) as QaReportForAssertions;
    expect(report.status).toBe('FAIL');
    expect(report.checks.exactThreeReleaseTargetsAtDesiredState).toBe(false);
    expect(report.checks.zeroBelowThreeWideCrossSections).toBe(false);
    expect(report.checks.all48ForwardExactNormalWalkPaths).toBe(true);
    expect(report.checks.all48ReverseExactNormalWalkPaths).toBe(true);
  }, 30_000);
});
