import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  validateSupplementalReleaseChain,
} from '../../scripts/qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(process.cwd());
const GROUP_LEDGER =
  'data/world-review/'
  + 'town-expansion-terminal-provenance-and-ridge-recovery-committed-supplement-20260728T1839Z.json';
const BRIDGE =
  'data/world-review/'
  + 'town-expansion-terminal-recovery-source-provenance-bridge-20260728T1839Z.json';
const CARPET_OVERLAY_SHARD =
  'data/world-review/'
  + 'town-expansion-r1-base-rollback-carpet-overlay-focused-shard-20260728.json';
const TRANSACTIONS = [
  'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-atomic-transaction-attempt2-20260728.json',
  'data/world-review/'
    + 'citizen-route-live-walk-leaf-clearance-atomic-transaction-20260728.json',
  GROUP_LEDGER,
];

function validate(paths = TRANSACTIONS) {
  return validateSupplementalReleaseChain({
    transactionPaths: paths,
    basePostRegions:
      'data/worldsnap-town-accessibility-source-restored-20260728T1735Z/region',
    basePostSha256:
      '0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218',
    finalPostRegions:
      'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
    finalPostSha256:
      'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
  });
}

describe('finalized terminal recovery supplemental group', () => {
  it('binds the distinct logical/physical source identities and both packages', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, GROUP_LEDGER), 'utf8'));
    const bridge = JSON.parse(fs.readFileSync(path.join(ROOT, BRIDGE), 'utf8'));
    expect(ledger).toMatchObject({
      schemaVersion: 2,
      kind: 'committed-atomic-supplemental-group',
      status: 'committed',
      source: {
        snapshotSha256:
          '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d',
        physicalExecutionSnapshotSha256:
          '8d2a7816ce142db91f274320e5b4405b9d9a0a3ecd3ce2357f591f8fe6fce19b',
      },
      postState: {
        snapshotSha256:
          'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
        rollbackGuardsPassed: 57,
        rollbackGuardsFailed: 0,
      },
      acceptance: {
        packageCount: 2,
        operationCount: 57,
        crossPackageTargetOverlap: 0,
        fullSnapshotEqualityClaimedByBridge: false,
      },
    });
    expect(bridge).toMatchObject({
      status: 'PASS',
      passed: true,
      scope: 'exact-package-target-source-guard-equivalence',
      fullSnapshotEqualityClaimed: false,
      operationGroupCount: 57,
      uniqueTargetCellCount: 57,
      crossPackageTargetOverlap: 0,
    });
  });

  it('is accepted as one atomic group in the exact ordered supplemental chain', () => {
    const result = validate();
    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.supplements).toHaveLength(3);
    expect(result.supplements[2]).toMatchObject({
      kind: 'committed-atomic-supplemental-group',
      packageCount: 2,
      operationCount: 57,
      sourceSnapshot: {
        sha256:
          '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d',
      },
      physicalSourceSnapshot: {
        sha256:
          '8d2a7816ce142db91f274320e5b4405b9d9a0a3ecd3ce2357f591f8fe6fce19b',
      },
      postSnapshot: {
        sha256:
          'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
      },
    });
  });

  it('proves the four corrected base groups with a bound non-final source overlay shard', () => {
    const shard = JSON.parse(
      fs.readFileSync(path.join(ROOT, CARPET_OVERLAY_SHARD), 'utf8'),
    );
    expect(shard).toMatchObject({
      schemaVersion: 4,
      status: 'PASS',
      opsSha256:
        '1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de',
      regionsSnapshot: {
        sha256:
          '0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218',
      },
      operationCount: 4,
      passed: 4,
      failed: 0,
      scopedEvidence: {
        reusableEvidenceOnly: true,
        satisfiesFinalConsolidatedPreflight: false,
        groupRange: {
          start: 70585,
          end: 70588,
          lineStart: 72212,
          lineEnd: 72215,
        },
      },
      sourceOverlays: {
        operationCount: 49,
        passed: 49,
        failed: 0,
        artifacts: [{
          sha256:
            'bbbc0e74ebaa857d5a235535d68d069df73bd1b81516aef4495352fa54be4b16',
        }],
      },
    });
  });

  it('fails closed when the wrapper drifts from the bound provenance bridge', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-recovery-'));
    try {
      const driftedPath = path.join(directory, 'drifted-ledger.json');
      const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, GROUP_LEDGER), 'utf8'));
      ledger.source.provenanceBridgeSha256 = '0'.repeat(64);
      fs.writeFileSync(driftedPath, `${JSON.stringify(ledger)}\n`);
      const result = validate([
        TRANSACTIONS[0],
        TRANSACTIONS[1],
        driftedPath,
      ]);
      expect(result.passed).toBe(false);
      expect(result.failures.map((failure) => failure.reason)).toContain(
        'supplemental-group-declaredArtifactHashes-failed',
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
