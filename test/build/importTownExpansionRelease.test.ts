import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { WorldFeatureStore } from '../../src/world/WorldFeatureStore';
import { hashSnapshotDirectory } from '../../scripts/generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  runTownExpansionDatabaseCloseout,
  sha256File,
} from '../../scripts/import_town_expansion_release.mjs';
import {
  validateSupplementalReleaseChain,
} from '../../scripts/qa_town_expansion_post_release.mjs';
import {
  generateTownExpansionDatabaseReport,
} from '../../scripts/report_town_expansion_database.mjs';

function artifact(filename: string) {
  return {
    path: filename,
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  };
}

function writeJson(directory: string, name: string, value: unknown) {
  const filename = path.join(directory, name);
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
  return filename;
}

function capture(
  id: string,
  shotId: string,
  objectId: string,
  evidencePass: 1 | 2,
  output: string,
  map = false,
) {
  return {
    id,
    shotId,
    primaryFeatureId: objectId,
    objectId,
    evidencePass,
    viewClass: map ? 'map' : 'interior',
    role: map ? 'district context map' : 'exact object interior evidence',
    output,
    width: map ? 1600 : 1280,
    height: map ? 1600 : 720,
    sha256: sha256File(output),
    passed: true,
    mode: map ? 'map' : 'persp',
    ...(map
      ? { center: [5, 5], span: 32 }
      : { eye: [0, 70, 0], lookAt: [5, 70, 5], fov: 68 }),
  };
}

function createDatabase(filename: string) {
  const store = new WorldFeatureStore(filename);
  store.close();
}

function createFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'town-db-import-'));
  const pre = path.join(directory, 'pre');
  const post = path.join(directory, 'post');
  const mediaDirectory = path.join(directory, 'media');
  const backupDirectory = path.join(directory, 'backups');
  fs.mkdirSync(pre);
  fs.mkdirSync(post);
  fs.mkdirSync(mediaDirectory);
  fs.writeFileSync(path.join(pre, 'r.0.0.mca'), 'synthetic immutable pre');
  fs.writeFileSync(path.join(post, 'r.0.0.mca'), 'synthetic immutable post');
  const preSnapshot = hashSnapshotDirectory(pre);
  const postSnapshot = hashSnapshotDirectory(post);

  const forwardPath = path.join(directory, 'forward.txt');
  const rollbackPath = path.join(directory, 'rollback.txt');
  fs.writeFileSync(
    forwardPath,
    'REPL 0 64 0 0 64 0 minecraft:stone minecraft:air\n',
  );
  fs.writeFileSync(
    rollbackPath,
    'REPL 0 64 0 0 64 0 minecraft:air minecraft:stone\n',
  );
  const designReportPath = writeJson(directory, 'design.json', {
    schemaVersion: 1,
    packageId: 'town-expansion-r1-2026-07-28',
    status: 'SYNTHETIC_RELEASE_READY',
    sourceSnapshot: {
      directory: pre,
      sha256: preSnapshot.sha256,
    },
    operations: {
      file: forwardPath,
      sha256: sha256File(forwardPath),
    },
    rollback: {
      file: rollbackPath,
      sha256: sha256File(rollbackPath),
    },
    objects: {
      'TE-ROOT': { objectId: 'TE-ROOT' },
      'TE-ROOM': { objectId: 'TE-ROOM' },
    },
  });

  const objectPair = (
    objectId: string,
    shotId: string,
    parentExternalId: string | null = null,
  ) => ({
    objectId,
    name: objectId === 'TE-ROOT' ? 'Synthetic release building' : 'Synthetic room',
    kind: objectId === 'TE-ROOT' ? 'building' : 'room',
    bounds: objectId === 'TE-ROOT'
      ? [0, 64, 0, 10, 75, 10]
      : [1, 65, 1, 5, 70, 5],
    familyIds: ['town-core'],
    provenance: {
      type: 'synthetic-frozen-generator-scope',
      file: designReportPath,
      jsonPointer: `/objects/${objectId}`,
    },
    sourceScope: 'TE-ROOT',
    targetCells: objectId === 'TE-ROOT' ? 100 : 20,
    roles: ['synthetic'],
    attributes: {
      parentExternalId,
    },
    truth: {
      requestedState: 'synthetic frozen authored program',
      releaseState: 'GENERATED_OFFLINE_NOT_YET_VERIFIED',
      importAsBuiltKind: objectId === 'TE-ROOT' ? 'building' : 'room',
      plannedOnly: false,
      physicalClaim: `Only exact synthetic geometry for ${objectId} is claimed.`,
      finalCertificationRequired: 'VERIFIED_POST_STATE',
    },
    database: {
      lookupKey: { externalId: objectId },
      state: 'pending-accepted-release-import',
      matches: [],
      fabricatedRelationship: false,
    },
    shotIds: [shotId],
    capturePairs: [{
      shotId,
      pass1CameraId: `${shotId}-PASS-1`,
      pass2CameraId: `${shotId}-PASS-2`,
    }],
  });
  const registryPath = writeJson(directory, 'crosswalk.json', {
    schemaVersion: 2,
    id: 'town-expansion-r1-object-media-database-crosswalk',
    packageId: 'town-expansion-r1-2026-07-28',
    status: 'POST_RELEASE_CAPTURE_PENDING',
    sourceReport: {
      ...artifact(designReportPath),
      status: 'SYNTHETIC_RELEASE_READY',
    },
    releasePackage: {
      forwardPath,
      forwardSha256: sha256File(forwardPath),
    },
    prereleaseSnapshot: {
      directory: pre,
      sha256: preSnapshot.sha256,
    },
    counts: {
      exactObjects: 2,
      shots: 3,
      maps: 1,
      pass1Captures: 3,
      pass2Captures: 3,
      combinedCaptures: 6,
    },
    objects: [
      objectPair('TE-ROOT', 'OBJECT-TE-ROOT'),
      objectPair('TE-ROOM', 'OBJECT-TE-ROOM', 'TE-ROOT'),
    ],
    mapShots: [{
      shotId: 'MAP-DISTRICT-TOWN-CORE',
      primaryFeatureId: 'district-town-core',
      role: 'Synthetic district map',
      bounds: [0, 64, 0, 10, 75, 10],
      objectIds: ['TE-ROOT', 'TE-ROOM'],
    }],
  });

  const captures = [];
  for (const [shotId, objectId, map] of [
    ['OBJECT-TE-ROOT', 'TE-ROOT', false],
    ['OBJECT-TE-ROOM', 'TE-ROOM', false],
    ['MAP-DISTRICT-TOWN-CORE', 'district-town-core', true],
  ] as const) {
    const payload = Buffer.alloc(2_048, shotId.charCodeAt(0));
    const pass1 = path.join(mediaDirectory, `${shotId}-1.png`);
    const pass2 = path.join(mediaDirectory, `${shotId}-2.png`);
    fs.writeFileSync(pass1, payload);
    fs.writeFileSync(pass2, payload);
    captures.push(
      capture(`${shotId}-PASS-1`, shotId, objectId, 1, pass1, map),
      capture(`${shotId}-PASS-2`, shotId, objectId, 2, pass2, map),
    );
  }

  const mediaReportPath = writeJson(directory, 'media-report.json', {
    schemaVersion: 2,
    id: 'town-expansion-r1-post-release-media',
    packageId: 'town-expansion-r1-2026-07-28',
    status: 'PASS',
    passed: true,
    finality: 'ACCEPTED_POST_RELEASE_MEDIA',
    crosswalk: {
      path: registryPath,
      sha256: sha256File(registryPath),
      objectCount: 2,
    },
    postSnapshot: {
      directory: post,
      sha256: postSnapshot.sha256,
    },
    forwardSha256: sha256File(forwardPath),
    packageHashes: {
      'town-expansion-r1': { sha256: sha256File(forwardPath) },
    },
    validation: {
      passed: true,
      failures: [],
      counts: { shots: 3, completePairs: 3 },
    },
    fileChecks: {
      checked: captures.length,
      passed: captures.length,
      failed: 0,
      failures: [],
    },
    captures,
  });

  const transactionPath = writeJson(directory, 'transaction.json', {
    transactionId: 'synthetic-town-expansion',
    status: 'committed-pending-post-qa',
    postReleaseRegions: post,
    postSnapshot: {
      directory: post,
      sha256: postSnapshot.sha256,
    },
    packages: [{
      key: 'town-expansion-r1',
      status: 'committed',
      forwardSha256: sha256File(forwardPath),
      rollbackSha256: sha256File(rollbackPath),
      execution: {
        status: 'complete',
        strictNoop: true,
        failedGroups: 0,
        failedCommands: 0,
        operationSha256: sha256File(forwardPath),
      },
    }],
    events: [{ event: 'transaction-committed' }],
  });
  const manifestPath = writeJson(directory, 'manifest.json', {
    packageId: 'town-expansion-r1-2026-07-28',
  });
  const transitionPolicyPath = writeJson(directory, 'transition-policy.json', {
    schemaVersion: 1,
    kind: 'natural-block-state-transition',
  });
  const rollbackPreflightPath = writeJson(directory, 'rollback-preflight.json', {
    schemaVersion: 3,
    status: 'PASS',
  });
  const qaPath = writeJson(directory, 'post-release-qa.json', {
    schemaVersion: 1,
    id: 'town-expansion-r1-post-release-qa',
    packageId: 'town-expansion-r1-2026-07-28',
    status: 'PASS',
    passed: true,
    readOnly: true,
    databaseMutated: false,
    snapshots: {
      pre: { path: pre, sha256: preSnapshot.sha256 },
      post: { path: post, sha256: postSnapshot.sha256 },
    },
    artifacts: {
      forward: artifact(forwardPath),
      rollback: artifact(rollbackPath),
      designReport: artifact(designReportPath),
      manifest: artifact(manifestPath),
      transaction: artifact(transactionPath),
      mediaReport: artifact(mediaReportPath),
      naturalStateTransitionPolicy: artifact(transitionPolicyPath),
      rollbackPoststatePreflight: artifact(rollbackPreflightPath),
    },
    gates: [
      'design-report-and-manifest-hashes',
      'exact-forward-rollback-target-bijection',
      'base-source-state-equivalence-bound',
      'immutable-snapshot-identities',
      'atomic-transaction-committed',
      'live-entity-gate-pass',
      'rollback-natural-transition-policy-bound',
      'rollback-guards-pass-against-post-snapshot',
      'rollback-logical-source-overlay-bound',
      'post-release-route-qa-pass',
      'optional-post-release-media-pass',
    ].map((id) => ({ id, passed: true, details: {} })),
    failures: [],
    decision: {
      release: 'ACCEPTED',
      rationale: 'Synthetic chain passes.',
    },
  });

  const databasePath = path.join(directory, 'world-map.db');
  createDatabase(databasePath);
  return {
    directory,
    databasePath,
    registryPath,
    qaPath,
    postRegions: post,
    transactionPath,
    supplementalTransactionPaths: [] as string[],
    mediaReportPath,
    backupDirectory,
    mediaDirectory,
  };
}

function closeoutOptions(fixture: ReturnType<typeof createFixture>) {
  return {
    databasePath: fixture.databasePath,
    registryPath: fixture.registryPath,
    qaPath: fixture.qaPath,
    postRegions: fixture.postRegions,
    transactionPath: fixture.transactionPath,
    supplementalTransactionPaths: fixture.supplementalTransactionPaths,
    mediaReportPath: fixture.mediaReportPath,
    backupDirectory: fixture.backupDirectory,
  };
}

function addSupplementalReleaseChain(
  fixture: ReturnType<typeof createFixture>,
) {
  const basePost = fixture.postRegions;
  const intermediate = path.join(fixture.directory, 'supplement-post-1');
  const finalPost = path.join(fixture.directory, 'supplement-post-2');
  fs.mkdirSync(intermediate);
  fs.mkdirSync(finalPost);
  fs.writeFileSync(path.join(intermediate, 'r.0.0.mca'), 'supplement-post-1');
  fs.writeFileSync(path.join(finalPost, 'r.0.0.mca'), 'supplement-post-2');

  const makeSupplement = (
    key: string,
    source: string,
    target: string,
    coordinate: number,
  ) => {
    const forward = path.join(fixture.directory, `${key}.forward.txt`);
    const rollback = path.join(fixture.directory, `${key}.rollback.txt`);
    fs.writeFileSync(
      forward,
      `REPL ${coordinate} 64 0 ${coordinate} 64 0 minecraft:stone minecraft:air\n`,
    );
    fs.writeFileSync(
      rollback,
      `REPL ${coordinate} 64 0 ${coordinate} 64 0 minecraft:air minecraft:stone\n`,
    );
    const forwardSha256 = sha256File(forward);
    const rollbackSha256 = sha256File(rollback);
    const sourceSha256 = hashSnapshotDirectory(source).sha256;
    const targetSha256 = hashSnapshotDirectory(target).sha256;
    const sourcePreflight = writeJson(
      fixture.directory,
      `${key}.source-preflight.json`,
      {
        schemaVersion: 2,
        status: 'PASS',
        opsPath: forward,
        opsSha256: forwardSha256,
        regions: source,
        regionsSnapshot: { sha256: sourceSha256 },
        orderAwareProjection: true,
        operationCount: 1,
        passed: 1,
        failed: 0,
        failures: [],
      },
    );
    const entityGate = writeJson(
      fixture.directory,
      `${key}.entity-gate.json`,
      {
        schemaVersion: 2,
        status: 'PASS',
        passed: true,
        blockOrEntityMutation: false,
        packages: [{
          file: forward,
          operationSha256: forwardSha256,
          passed: true,
          blockers: [],
          queryErrors: [],
        }],
        forceLoadAudit: {
          mode: 'sparse-target-halo-batched',
          allRequiredChunksLoadedBeforeQueries: true,
          missingRequiredChunks: [],
          cleanupErrors: [],
          allTemporaryChunksReleased: true,
          finalSetMatchesPreExistingSet: true,
        },
      },
    );
    const execution = writeJson(
      fixture.directory,
      `${key}.execution.json`,
      {
        schemaVersion: 3,
        status: 'complete',
        operationRole: 'forward',
        strictNoop: true,
        operationSha256: forwardSha256,
        sourceGroups: [{}],
        successfulGroups: 1,
        failedGroups: 0,
        failedCommands: 0,
        noopCommands: 0,
      },
    );
    const rollbackPreflight = writeJson(
      fixture.directory,
      `${key}.rollback-preflight.json`,
      {
        schemaVersion: 2,
        status: 'PASS',
        opsPath: rollback,
        opsSha256: rollbackSha256,
        regions: target,
        regionsSnapshot: { sha256: targetSha256 },
        orderAwareProjection: true,
        operationCount: 1,
        passed: 1,
        failed: 0,
        failures: [],
      },
    );
    return writeJson(fixture.directory, `${key}.transaction.json`, {
      schemaVersion: 1,
      status: 'committed',
      source: {
        snapshot: source,
        snapshotSha256: sourceSha256,
        preflight: sourcePreflight,
        entityGate,
      },
      packages: [{
        key,
        status: 'committed',
        forward,
        forwardSha256,
        rollback,
        rollbackSha256,
        execution,
        sourceGroups: 1,
        successfulGroups: 1,
        failedGroups: 0,
        changedCommands: 1,
        noopCommands: 0,
      }],
      postState: {
        snapshot: target,
        snapshotSha256: targetSha256,
        rollbackPreflight,
        rollbackGuardsPassed: 1,
        rollbackGuardsFailed: 0,
      },
    });
  };

  const transactions = [
    makeSupplement('synthetic-accessibility', basePost, intermediate, 2),
    makeSupplement('synthetic-citizen', intermediate, finalPost, 3),
  ];
  const basePostSha256 = hashSnapshotDirectory(basePost).sha256;
  const finalPostSha256 = hashSnapshotDirectory(finalPost).sha256;
  const chain = validateSupplementalReleaseChain({
    transactionPaths: transactions,
    basePostRegions: basePost,
    basePostSha256,
    finalPostRegions: finalPost,
    finalPostSha256,
  });
  expect(chain.passed).toBe(true);

  const media = JSON.parse(fs.readFileSync(fixture.mediaReportPath, 'utf8'));
  media.postSnapshot = {
    directory: finalPost,
    sha256: finalPostSha256,
  };
  fs.writeFileSync(
    fixture.mediaReportPath,
    `${JSON.stringify(media, null, 2)}\n`,
  );

  const qa = JSON.parse(fs.readFileSync(fixture.qaPath, 'utf8'));
  qa.schemaVersion = 2;
  qa.snapshots.post = { path: finalPost, sha256: finalPostSha256 };
  qa.snapshots.baseAcceptedPost = {
    path: basePost,
    sha256: basePostSha256,
  };
  qa.artifacts.mediaReport = artifact(fixture.mediaReportPath);
  qa.gates.push({
    id: 'supplemental-release-chain-bound',
    passed: true,
    details: {},
  });
  const releaseIdentity = {
    schemaVersion: 1,
    algorithm: 'sha256(JSON.stringify(releaseIdentityWithoutSha256))',
    packageId: 'town-expansion-r1-2026-07-28',
    base: {
      key: 'town-expansion-r1',
      transaction: artifact(fixture.transactionPath),
      forward: qa.artifacts.forward,
      rollback: qa.artifacts.rollback,
      rollbackPoststatePreflight:
        qa.artifacts.rollbackPoststatePreflight,
      naturalStateTransitionPolicy:
        qa.artifacts.naturalStateTransitionPolicy,
      acceptedPostSnapshot: chain.supplements[0].sourceSnapshot,
    },
    supplements: chain.supplements,
    terminalPostSnapshot: chain.supplements.at(-1)?.postSnapshot,
  };
  qa.releaseIdentity = {
    ...releaseIdentity,
    sha256: crypto
      .createHash('sha256')
      .update(JSON.stringify(releaseIdentity))
      .digest('hex'),
  };
  fs.writeFileSync(fixture.qaPath, `${JSON.stringify(qa, null, 2)}\n`);

  fixture.postRegions = finalPost;
  fixture.supplementalTransactionPaths = transactions;
  return { basePost, intermediate, finalPost, transactions };
}

describe('Town Expansion R1 guarded database closeout', () => {
  it('binds an ordered supplemental chain and refuses omitted ledgers', async () => {
    const fixture = createFixture();
    try {
      addSupplementalReleaseChain(fixture);
      const report = await runTownExpansionDatabaseCloseout(
        closeoutOptions(fixture),
      );
      expect(report.status).toBe('PASS_DRY_RUN');
      expect(report.evidence).toMatchObject({
        releaseIdentitySha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        supplementalTransactions: [
          { sha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
          { sha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
        ],
      });

      await expect(runTownExpansionDatabaseCloseout({
        ...closeoutOptions(fixture),
        supplementalTransactionPaths:
          fixture.supplementalTransactionPaths.slice(0, 1),
      })).rejects.toThrow('QA supplemental transaction cardinality changed');

      await expect(runTownExpansionDatabaseCloseout({
        ...closeoutOptions(fixture),
        supplementalTransactionPaths: [],
      })).rejects.toThrow('QA supplemental transaction cardinality changed');
    } finally {
      fs.rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('dry-runs the complete evidence chain without changing the database', async () => {
    const fixture = createFixture();
    try {
      const before = sha256File(fixture.databasePath);
      const report = await runTownExpansionDatabaseCloseout(
        closeoutOptions(fixture),
      );
      const database = new Database(fixture.databasePath, { readonly: true });
      const featureCount = database.prepare(`
        SELECT COUNT(*) AS count FROM world_features WHERE project_id = ?
      `).get('town-expansion-r1').count;
      database.close();

      expect(report.status).toBe('PASS_DRY_RUN');
      expect(report.mode).toBe('dry-run');
      expect(report.databaseMutated).toBe(false);
      expect(report.registry.objects).toBe(2);
      expect(report.registry.expectedCaptureFiles).toBe(6);
      expect(report.plan.featuresToCreate).toEqual(['TE-ROOT', 'TE-ROOM']);
      expect(featureCount).toBe(0);
      expect(sha256File(fixture.databasePath)).toBe(before);
    } finally {
      fs.rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('accepts only a hash-bound QA source-equivalence bridge for a differing transaction pre snapshot', async () => {
    const fixture = createFixture();
    try {
      const qa = JSON.parse(fs.readFileSync(fixture.qaPath, 'utf8'));
      const registry = JSON.parse(
        fs.readFileSync(fixture.registryPath, 'utf8'),
      );
      const sourceEquivalencePreflight = writeJson(
        fixture.directory,
        'source-equivalence-preflight.json',
        {
          schemaVersion: 2,
          status: 'PASS',
          evidenceClass: 'complete-base-forward-source-state',
        },
      );
      const transactionPreSha256 = 'a'.repeat(64);
      qa.snapshots.pre.sha256 = transactionPreSha256;
      qa.artifacts.sourceEquivalencePreflight =
        artifact(sourceEquivalencePreflight);
      const equivalenceGate = qa.gates.find(
        (gate: { id: string }) =>
          gate.id === 'base-source-state-equivalence-bound',
      );
      equivalenceGate.details = {
        required: true,
        supplied: true,
        proofPassed: true,
        transactionPreSha256,
        designPreSha256: registry.prereleaseSnapshot.sha256,
        manifestPreSha256: registry.prereleaseSnapshot.sha256,
      };
      fs.writeFileSync(fixture.qaPath, `${JSON.stringify(qa, null, 2)}\n`);

      const report = await runTownExpansionDatabaseCloseout(
        closeoutOptions(fixture),
      );
      expect(report.status).toBe('PASS_DRY_RUN');

      delete qa.artifacts.sourceEquivalencePreflight;
      fs.writeFileSync(fixture.qaPath, `${JSON.stringify(qa, null, 2)}\n`);
      await expect(
        runTownExpansionDatabaseCloseout(closeoutOptions(fixture)),
      ).rejects.toThrow(
        'QA pre snapshot is not registry-identical or equivalence-bound',
      );
    } finally {
      fs.rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('atomically upserts features, one scan, observations, and exact media relations', async () => {
    const fixture = createFixture();
    try {
      const legacyStore = new WorldFeatureStore(fixture.databasePath);
      legacyStore.createFeature({
        projectId: 'legacy-project',
        externalId: 'TE-ROOT',
        name: 'Legacy feature with a reused external ID',
        kind: 'building',
        geometry: {
          type: 'bounds',
          minX: 100,
          maxX: 110,
          minZ: 100,
          maxZ: 110,
        },
      });
      legacyStore.close();

      const first = await runTownExpansionDatabaseCloseout({
        ...closeoutOptions(fixture),
        commit: true,
        expectedDbSha256: sha256File(fixture.databasePath),
      });
      expect(first.status).toBe('PASS_DATABASE_IMPORTED');
      expect(first.atomicity).toMatchObject({
        oneImmediateTransaction: true,
        rollbackOnError: true,
        verifiedBeforeCommit: true,
        featuresInserted: 2,
        featuresUpdated: 0,
        scansUpserted: 1,
        observationsUpserted: 2,
      });
      expect(first.verification.passed).toBe(true);
      expect(first.database.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(first.evidence).toMatchObject({
        postSnapshotSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        forwardSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        crosswalkSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        mediaQaSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });

      const census = generateTownExpansionDatabaseReport({
        databasePath: fixture.databasePath,
        registryPath: fixture.registryPath,
      });
      expect(census.status).toBe('PASS');
      expect(census.publication).toMatchObject({
        features: 2,
        acceptedScans: 1,
        observations: 2,
        mediaRelations: 4,
      });
      expect(census.database.sha256).toBe(first.database.sha256);
      expect(census.evidence).toMatchObject({
        postSnapshotSha256: first.evidence.postSnapshotSha256,
        forwardSha256: first.evidence.forwardSha256,
        crosswalkSha256: first.evidence.crosswalkSha256,
        mediaQaSha256: first.evidence.mediaQaSha256,
      });
      expect(Object.values(census.failures).every((value) =>
        typeof value === 'number' ? value === 1 : value.length === 0)).toBe(true);

      const second = await runTownExpansionDatabaseCloseout({
        ...closeoutOptions(fixture),
        commit: true,
        expectedDbSha256: sha256File(fixture.databasePath),
      });
      expect(second.atomicity.featuresInserted).toBe(0);
      expect(second.atomicity.featuresUpdated).toBe(2);
      expect(second.database.countsAfter).toEqual(first.database.countsAfter);

      const media = JSON.parse(fs.readFileSync(fixture.mediaReportPath, 'utf8'));
      fs.appendFileSync(media.captures[0].output, 'post-import-drift');
      const driftedCensus = generateTownExpansionDatabaseReport({
        databasePath: fixture.databasePath,
        registryPath: fixture.registryPath,
      });
      expect(driftedCensus.status).toBe('FAIL');
      expect(driftedCensus.failures.mediaFailures).toContain('TE-ROOT');
    } finally {
      fs.rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('rolls the entire SQLite transaction back after an injected mid-import error', async () => {
    const fixture = createFixture();
    try {
      await expect(runTownExpansionDatabaseCloseout({
        ...closeoutOptions(fixture),
        commit: true,
        expectedDbSha256: sha256File(fixture.databasePath),
        failureInjectionAfterFeatures: 1,
      })).rejects.toThrow('synthetic import failure after 1 features');

      const database = new Database(fixture.databasePath, { readonly: true });
      const counts = {
        features: database.prepare(`
          SELECT COUNT(*) AS count FROM world_features WHERE project_id = ?
        `).get('town-expansion-r1').count,
        scans: database.prepare(`
          SELECT COUNT(*) AS count FROM world_scans WHERE project_id = ?
        `).get('town-expansion-r1').count,
        observations: database.prepare(`
          SELECT COUNT(*) AS count
          FROM feature_observations o
          JOIN world_features f ON f.id = o.feature_id
          WHERE f.project_id = ?
        `).get('town-expansion-r1').count,
      };
      database.close();
      expect(counts).toEqual({ features: 0, scans: 0, observations: 0 });
    } finally {
      fs.rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('refuses planned-only registry objects and hash-drifted matched media', async () => {
    const plannedFixture = createFixture();
    try {
      const registry = JSON.parse(fs.readFileSync(plannedFixture.registryPath, 'utf8'));
      registry.objects[0].truth.plannedOnly = true;
      fs.writeFileSync(
        plannedFixture.registryPath,
        `${JSON.stringify(registry, null, 2)}\n`,
      );
      await expect(runTownExpansionDatabaseCloseout(
        closeoutOptions(plannedFixture),
      )).rejects.toThrow('planned-only or unbuilt objects cannot be imported');
    } finally {
      fs.rmSync(plannedFixture.directory, { recursive: true, force: true });
    }

    const mediaFixture = createFixture();
    try {
      const media = JSON.parse(fs.readFileSync(mediaFixture.mediaReportPath, 'utf8'));
      fs.appendFileSync(media.captures[0].output, 'drift');
      await expect(runTownExpansionDatabaseCloseout(
        closeoutOptions(mediaFixture),
      )).rejects.toThrow('media output SHA-256 changed');
    } finally {
      fs.rmSync(mediaFixture.directory, { recursive: true, force: true });
    }
  });
});
