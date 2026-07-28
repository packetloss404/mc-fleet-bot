import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  TOWN_EXPANSION_PACKAGE_ID,
  assertTownExpansionFinalGate,
  buildTownExpansionRequirementsMatrix,
  evaluateTownExpansionDocumentationGate,
  hashSnapshot,
  sha256File,
} from '../../scripts/town_expansion_documentation_profile.mjs';

const ROOT = path.resolve(__dirname, '../..');

function writeJson(filename: string, value: unknown) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function createAcceptedFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'town-expansion-documentation-'),
  );
  const paths = {
    designReport: 'design.json',
    ownershipManifest: 'ownership.json',
    forward: 'forward.txt',
    transaction: 'transaction.json',
    postSnapshot: 'post',
    postQa: 'post-qa.json',
    mediaQa: 'media-qa.json',
    databaseImport: 'database-import.json',
    databasePublication: 'database-publication.json',
    mediaManifest: 'media-manifest.json',
    mediaCrosswalk: 'crosswalk.json',
    worldDatabase: 'world-map.db',
  };
  const at = (name: keyof typeof paths) => path.join(root, paths[name]);
  const prereleaseSha256 = '1'.repeat(64);

  fs.writeFileSync(at('forward'), 'REPL 1 2 3 1 2 3 air stone\n');
  const forwardSha256 = sha256File(at('forward'));
  writeJson(at('designReport'), {
    packageId: TOWN_EXPANSION_PACKAGE_ID,
    sourceSnapshot: { sha256: prereleaseSha256 },
    operations: { sha256: forwardSha256 },
  });
  writeJson(at('ownershipManifest'), {
    packageId: TOWN_EXPANSION_PACKAGE_ID,
    sourceSnapshot: { sha256: prereleaseSha256 },
    combinedTransaction: {
      forward: { sha256: forwardSha256 },
    },
  });

  fs.mkdirSync(at('postSnapshot'), { recursive: true });
  fs.writeFileSync(path.join(at('postSnapshot'), 'r.0.0.mca'), 'accepted-post');
  const postSnapshot = hashSnapshot(at('postSnapshot'), root);
  if (!postSnapshot) throw new Error('synthetic post snapshot hash failed');

  const entityPath = path.join(root, 'entity.json');
  writeJson(entityPath, {
    status: 'PASS',
    passed: true,
    blockOrEntityMutation: false,
    packages: [{ blockers: [] }],
  });
  writeJson(at('transaction'), {
    status: 'committed-pending-post-qa',
    packages: [{
      key: 'town-expansion-r1',
      packageId: TOWN_EXPANSION_PACKAGE_ID,
      status: 'committed',
      forwardSha256,
      execution: {
        status: 'complete',
        strictNoop: true,
        failedGroups: 0,
        failedCommands: 0,
      },
    }],
  });
  writeJson(at('postQa'), {
    status: 'PASS',
    passed: true,
    readOnly: true,
    liveWorldMutated: false,
    databaseMutated: false,
    failures: [],
    decision: { release: 'ACCEPTED' },
    artifacts: {
      forward: { sha256: forwardSha256 },
      transaction: { sha256: sha256File(at('transaction')) },
      designReport: { sha256: sha256File(at('designReport')) },
      manifest: { sha256: sha256File(at('ownershipManifest')) },
      liveEntityGate: {
        path: entityPath,
        sha256: sha256File(entityPath),
      },
    },
    snapshots: {
      post: {
        path: at('postSnapshot'),
        sha256: postSnapshot.sha256,
      },
    },
  });

  const cameras = Array.from({ length: 13 }, (_, index) => {
    const shotId = `MAP-${String(index + 1).padStart(2, '0')}`;
    return [1, 2].map((evidencePass) => ({
      id: `${shotId}-PASS-${evidencePass}`,
      shotId,
      evidencePass,
      mode: 'map',
    }));
  }).flat();
  writeJson(at('mediaManifest'), {
    counts: { combinedCaptures: cameras.length },
    cameras,
  });
  writeJson(at('mediaCrosswalk'), { objects: [] });
  writeJson(at('mediaQa'), {
    status: 'PASS',
    passed: true,
    finality: 'ACCEPTED_POST_RELEASE_MEDIA',
    postSnapshot: { sha256: postSnapshot.sha256 },
    forwardSha256,
    sourceManifest: { sha256: sha256File(at('mediaManifest')) },
    crosswalk: { sha256: sha256File(at('mediaCrosswalk')) },
    designReport: { sha256: sha256File(at('designReport')) },
    forwardPackage: { sha256: forwardSha256 },
    packageHashes: {
      'town-expansion-r1': { sha256: forwardSha256 },
    },
    fileChecks: {
      checked: cameras.length,
      passed: cameras.length,
      failed: 0,
    },
    captures: cameras.map((camera) => ({
      id: camera.id,
      shotId: camera.shotId,
    })),
  });

  fs.writeFileSync(at('worldDatabase'), 'synthetic-database');
  writeJson(at('databaseImport'), {
    id: 'town-expansion-r1-database-closeout',
    packageId: TOWN_EXPANSION_PACKAGE_ID,
    status: 'PASS_DATABASE_IMPORTED',
    mode: 'commit',
    passed: true,
    databaseMutated: true,
    liveWorldMutated: false,
    atomicity: {
      oneImmediateTransaction: true,
      rollbackOnError: true,
    },
    verification: {
      passed: true,
      missing: [],
      evidenceFailures: [],
      integrity: 'ok',
    },
    database: {
      integrityAfter: 'ok',
      sha256: sha256File(at('worldDatabase')),
    },
    registry: { objects: 340 },
    evidence: {
      postSnapshotSha256: postSnapshot.sha256,
      forwardSha256,
      crosswalkSha256: sha256File(at('mediaCrosswalk')),
      mediaQaSha256: sha256File(at('mediaQa')),
      postReleaseQaSha256: sha256File(at('postQa')),
      transactionSha256: sha256File(at('transaction')),
    },
  });
  writeJson(at('databasePublication'), {
    id: 'town-expansion-r1-database-publication-report',
    status: 'PASS',
    passed: true,
    readOnly: true,
    failures: {
      acceptedScanCount: 1,
      missingFeatures: [],
      evidenceFailures: [],
      databaseIntegrity: [],
      foreignKeyViolations: [],
    },
    database: { sha256: sha256File(at('worldDatabase')) },
    evidence: {
      postSnapshotSha256: postSnapshot.sha256,
      forwardSha256,
      crosswalkSha256: sha256File(at('mediaCrosswalk')),
      mediaQaSha256: sha256File(at('mediaQa')),
      postReleaseQaSha256: sha256File(at('postQa')),
      transactionSha256: sha256File(at('transaction')),
    },
  });
  return { root, paths };
}

describe('Town Expansion documentation profile', () => {
  it('fails closed when final evidence is absent', () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), 'town-expansion-documentation-empty-'),
    );
    try {
      const result = evaluateTownExpansionDocumentationGate({ root });
      expect(result.passed).toBe(false);
      expect(result.status).toBe('FAIL_FINAL_INPUTS_INCOMPLETE');
      expect(result.failures).toContain('committed-transaction');
      expect(() => assertTownExpansionFinalGate({ root })).toThrow(
        /final documentation gate failed/,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts a complete, mutually hashed synthetic closeout chain', () => {
    const fixture = createAcceptedFixture();
    try {
      const result = evaluateTownExpansionDocumentationGate(fixture);
      expect(result.status).toBe('PASS_FINAL_INPUTS_ACCEPTED');
      expect(result.passed).toBe(true);
      expect(result.failures).toEqual([]);
      expect(result.gates).toHaveLength(8);
      expect(result.gates.every((entry) => entry.passed)).toBe(true);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('preserves all 98 frozen requirements and labels draft truth', () => {
    const matrix = buildTownExpansionRequirementsMatrix({
      root: ROOT,
      mode: 'draft',
    });
    expect(matrix.status).toBe('DRAFT_NOT_AS_BUILT');
    expect(matrix.source.requirementCount).toBe(98);
    expect(matrix.requirements).toHaveLength(98);
    expect(matrix.requirements.find(
      (entry) => entry.id === 'DOC-007',
    )?.effectiveState).toBe('DRAFT_DOSSIER_ONLY');
  });

  it('builds a draft HTML review book and rejects forced final publication', () => {
    const registerOutput = execFileSync(
      'node',
      [
        'scripts/generate_redevelopment_artifact_register.mjs',
        '--profile',
        'town-expansion',
        '--mode',
        'draft',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(JSON.parse(registerOutput)).toMatchObject({
      profile: 'town-expansion',
      mode: 'draft',
      status: 'DRAFT_NOT_AS_BUILT_REGISTER',
      finalGatePassed: false,
    });
    const dossierOutput = execFileSync(
      'node',
      [
        'scripts/generate_redevelopment_dossier.mjs',
        '--profile',
        'town-expansion',
        '--mode',
        'draft',
        '--html-only',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(JSON.parse(dossierOutput)).toMatchObject({
      status: 'DRAFT_NOT_AS_BUILT',
      pdf: null,
      maps: 13,
      representativeExactObjectScreenshots: 12,
    });
    const html = fs.readFileSync(
      path.join(
        ROOT,
        'docs/redevelopment/2026-07-28-town-expansion/'
          + 'master-plan.draft.html',
      ),
      'utf8',
    );
    expect(html).toContain('DRAFT — NOT AS-BUILT');
    expect(html).toContain(
      '13-map book & representative exact-object screenshots',
    );
    expect(html).toContain('Citizen Life and Schedule Audit');
    expect(html).toContain('Engineering schedules, QA and database evidence');

    const missing = path.join(os.tmpdir(), 'town-expansion-no-final-evidence');
    const final = spawnSync(
      'node',
      [
        'scripts/generate_redevelopment_dossier.mjs',
        '--profile',
        'town-expansion',
        '--mode',
        'final',
        '--html-only',
        '--transaction',
        `${missing}-transaction.json`,
        '--post',
        `${missing}-post`,
        '--post-qa',
        `${missing}-post-qa.json`,
        '--media-qa',
        `${missing}-media-qa.json`,
        '--db-import',
        `${missing}-db-import.json`,
        '--db-report',
        `${missing}-db-report.json`,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(final.status).not.toBe(0);
    expect(final.stderr).toContain('final dossier blocked');
  }, 60_000);
});
