#!/usr/bin/env node
/** Independent read-only audit for the Manager Vale five-cottage package. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const EXPECTED_SNAPSHOT_HASH =
  'f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e';

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function parseArgs(argv) {
  const options = {
    base: 'data/buildops/manager-vale-five-cottages-2026-07-28',
    output: 'data/world-review/manager-vale-five-cottages-independent-qa-2026-07-28.json',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base') options.base = argv[++index];
    else if (arg === '--out') options.output = argv[++index];
    else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

function parseOperations(filename) {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      return {
        point: fields.slice(1, 4).map(Number),
        end: fields.slice(4, 7).map(Number),
        expected: fields[7],
        desired: fields[8],
      };
    });
}

function sourcePairKey(cameraId) {
  return cameraId
    .replace('-BEFORE', '')
    .replace('-AFTER', '');
}

function markdownAudit(audit) {
  const rows = audit.checks.map((check) => (
    `| ${check.id} | ${check.passed ? 'PASS' : 'FAIL'} |`
    + ` ${JSON.stringify(check.evidence).replaceAll('|', '\\|')} |`
  ));
  return [
    '# Manager Vale five-cottage independent QA',
    '',
    `**Status:** ${audit.status}`,
    '',
    '| Check | Result | Evidence |',
    '|---|---|---|',
    ...rows,
    '',
    'This is an offline artifact audit. It does not authorize live execution.',
    '',
  ].join('\n');
}

export function auditManagerValeArtifacts(options = {}) {
  const base = path.resolve(ROOT, options.base);
  const output = path.resolve(ROOT, options.output);
  const files = {
    forward: `${base}.txt`,
    rollback: `${base}.rollback.txt`,
    report: `${base}.report.json`,
    ledger: `${base}.nbt-ledger.json`,
    nbtCommands: `${base}.nbt-copy.commands.txt`,
    nbtVerify: `${base}.nbt-verify.commands.txt`,
    furnishings: `${base}.furnishings.json`,
    privateSuites: `${base}.private-suites.json`,
    cameras: `${base}.cameras.json`,
    databaseFeatures: `${base}.database-features.json`,
  };
  for (const filename of Object.values(files)) {
    if (!fs.existsSync(filename)) throw new Error(`missing Manager Vale artifact ${filename}`);
  }
  const report = JSON.parse(fs.readFileSync(files.report, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(files.ledger, 'utf8'));
  const furnishings = JSON.parse(fs.readFileSync(files.furnishings, 'utf8')).entries;
  const privateSuites = JSON.parse(
    fs.readFileSync(files.privateSuites, 'utf8'),
  );
  const cameras = JSON.parse(fs.readFileSync(files.cameras, 'utf8')).cameras;
  const databaseFeatures = JSON.parse(
    fs.readFileSync(files.databaseFeatures, 'utf8'),
  ).features;
  const forward = parseOperations(files.forward);
  const rollback = parseOperations(files.rollback);
  const nbtCommands = fs.readFileSync(files.nbtCommands, 'utf8')
    .split(/\r?\n/).filter((line) => line.startsWith('CMD '));
  const nbtVerify = fs.readFileSync(files.nbtVerify, 'utf8')
    .split(/\r?\n/).filter((line) => line.startsWith('CMD '));
  const checks = [];
  const check = (id, passed, evidence) => {
    checks.push({ id, passed: Boolean(passed), evidence });
  };
  const snapshotDirectory = path.resolve(ROOT, report.source.snapshot.directory);
  const snapshot = hashSnapshotDirectory(snapshotDirectory);
  check(
    'immutable-snapshot',
    snapshot.sha256 === report.source.snapshot.expectedSha256
      && report.source.snapshot.sha256 === report.source.snapshot.expectedSha256
      && report.source.snapshot.designBaselineSha256 === EXPECTED_SNAPSHOT_HASH,
    {
      observed: snapshot.sha256,
      report: report.source.snapshot.sha256,
      accepted: report.source.snapshot.expectedSha256,
      designBaseline: report.source.snapshot.designBaselineSha256,
    },
  );
  check(
    'artifact-hashes',
    Object.entries(report.artifacts).every(([key, artifact]) => (
      files[key] && sha256File(files[key]) === artifact.sha256
    )),
    Object.fromEntries(
      Object.entries(report.artifacts).map(([key, artifact]) => [
        key,
        { report: artifact.sha256, observed: files[key] ? sha256File(files[key]) : null },
      ]),
    ),
  );
  const forwardByPoint = new Map(
    forward.map((operation) => [operation.point.join(','), operation]),
  );
  check(
    'one-cell-unique-forward',
    forward.length === forwardByPoint.size
      && forward.every((operation) => (
        operation.point.join(',') === operation.end.join(',')
      ))
      && !fs.readFileSync(files.forward, 'utf8').match(/^SET /m),
    { operations: forward.length, unique: forwardByPoint.size },
  );
  check(
    'exact-reverse-rollback',
    rollback.length === forward.length
      && rollback.every((inverse) => {
        const operation = forwardByPoint.get(inverse.point.join(','));
        return operation
          && inverse.expected === operation.desired
          && inverse.desired === operation.expected;
      }),
    { forward: forward.length, rollback: rollback.length },
  );
  check(
    'fixed-program-counts',
    report.counts.cottages === 5
      && report.counts.bays === 24
      && report.counts.attachedGarages === 5
      && report.counts.rooms === 55
      && report.counts.furnishings === 406
      && report.counts.cameras === 45
      && report.counts.roads === 3,
    report.counts,
  );
  check(
    'garage-capacity-vector',
    JSON.stringify(report.garageCapacityByHouse) === JSON.stringify({
      'RRCH-ARCHITECT': 6,
      'RRCH-STEWARD': 6,
      'RRCH-MASON': 4,
      'RRCH-SURVEYOR': 4,
      'RRCH-SCOUT': 4,
    }),
    report.garageCapacityByHouse,
  );
  check(
    'protected-migration-ledger',
    ledger.entries.length === 41
      && ledger.counts.protectedBlockEntities === 41
      && Object.values(ledger.checks).every(Boolean)
      && new Set(
        ledger.entries.map((entry) => entry.sourceCoordinate.join(',')),
      ).size === 41
      && new Set(
        ledger.entries.map((entry) => entry.destinationCoordinate.join(',')),
      ).size === 41,
    { counts: ledger.counts, checks: ledger.checks },
  );
  check(
    'commission-before-retire',
    ledger.sourceRetirementIncluded === false
      && ledger.sourceRetirementOperationCount === 0
      && ledger.entries.every((entry) => entry.sourceRetirementCommand === null)
      && ledger.commissionBeforeRetireStages.at(-1).includedHere === false,
    {
      mode: ledger.migrationMode,
      stages: ledger.commissionBeforeRetireStages.map((stage) => stage.id),
    },
  );
  check(
    'guarded-nbt-copy-and-verification',
    nbtCommands.length === 41
      && nbtCommands.every((line) => line.startsWith('CMD execute if block '))
      && nbtVerify.length === 82
      && nbtVerify.every((line) => line.startsWith('CMD data get block ')),
    { copyCommands: nbtCommands.length, verificationCommands: nbtVerify.length },
  );
  const furnishingByHouse = Object.fromEntries(
    [...new Set(furnishings.map((entry) => entry.cottageId))].map((id) => [
      id,
      furnishings.filter((entry) => entry.cottageId === id).length,
    ]),
  );
  check(
    'furnishing-ledger',
    furnishings.length === 406
      && JSON.stringify(furnishingByHouse) === JSON.stringify({
        'RRCH-ARCHITECT': 80,
        'RRCH-MASON': 71,
        'RRCH-SURVEYOR': 86,
        'RRCH-STEWARD': 87,
        'RRCH-SCOUT': 82,
      })
      && new Set(furnishings.map((entry) => entry.id)).size === furnishings.length,
    { total: furnishings.length, byHouse: furnishingByHouse },
  );
  const privateFixtureTypes = [
    'VESTIBULE',
    'CANOPY-BED',
    'CHAISE',
    'RATED-SUSPENDED-LOUNGE',
    'CLOSED-TOY-STORAGE',
    'DRESSING-VANITY',
    'WASH',
  ];
  const privateFixturesByHouse = Object.fromEntries(
    [...new Set(privateSuites.fixtures.map((entry) => entry.cottageId))]
      .map((id) => [
        id,
        privateSuites.fixtures.filter((entry) => entry.cottageId === id),
      ]),
  );
  check(
    'private-suite-anatomy-and-theme',
    privateSuites.fixtures.length === 35
      && Object.keys(privateFixturesByHouse).length === 5
      && Object.values(privateFixturesByHouse).every((entries) => (
        entries.length === 7
        && privateFixtureTypes.every(
          (type) => entries.some((entry) => entry.fixtureType === type),
        )
      ))
      && new Set(
        Object.values(privateSuites.design.themes).map((theme) => theme.id),
      ).size === 5
      && privateSuites.design.everySuiteHasRequiredAnatomy === true
      && privateSuites.design.cameraCrosswalk.length === 5,
    {
      fixtureCount: privateSuites.fixtures.length,
      themes: Object.fromEntries(
        Object.entries(privateSuites.design.themes).map(([id, theme]) => [
          id,
          theme.id,
        ]),
      ),
      cameraCrosswalk: privateSuites.design.cameraCrosswalk,
    },
  );
  check(
    'zero-unreviewed-model-overrides',
    report.operations.overrideAudit.unreviewedCrossScopeOverrides === 0,
    report.operations.overrideAudit,
  );
  const cameraPairs = new Map();
  for (const camera of cameras) {
    const key = sourcePairKey(camera.id);
    if (!camera.id.includes('-BEFORE') && !camera.id.includes('-AFTER')) continue;
    const pair = cameraPairs.get(key) ?? [];
    pair.push(camera);
    cameraPairs.set(key, pair);
  }
  check(
    'camera-contract',
    cameras.length === 45
      && [...cameraPairs.values()].filter((pair) => pair.length === 2).length === 10
      && [...cameraPairs.values()].every((pair) => (
        pair.length !== 2
        || JSON.stringify([pair[0].eye, pair[0].lookAt, pair[0].fov])
          === JSON.stringify([pair[1].eye, pair[1].lookAt, pair[1].fov])
      )),
    { cameras: cameras.length, matchedPairs: [...cameraPairs.values()].filter((p) => p.length === 2).length },
  );
  check(
    'database-feature-contract',
    databaseFeatures.filter((feature) => feature.featureType === 'building').length === 5
      && databaseFeatures.filter((feature) => feature.featureType === 'room').length === 55
      && databaseFeatures.filter((feature) => feature.featureType === 'garage').length === 5
      && databaseFeatures.filter((feature) => feature.featureType === 'road').length === 3,
    {
      total: databaseFeatures.length,
      byType: Object.fromEntries(
        [...new Set(databaseFeatures.map((feature) => feature.featureType))]
          .map((type) => [
            type,
            databaseFeatures.filter((feature) => feature.featureType === type).length,
          ]),
      ),
    },
  );
  check(
    'scott-alias-crosswalk',
    report.identityCrosswalk.occupantFacingName === 'Scott'
      && report.identityCrosswalk.historicalExternalIdAlias === 'RRCH-SCOUT'
      && databaseFeatures.find((feature) => feature.externalId === 'RRCH-SCOUT')
        ?.name === 'Scott House mini-mansion',
    report.identityCrosswalk,
  );
  check(
    'truth-boundary',
    report.liveWorldMutated === false
      && report.status === 'PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING'
      && report.protectedMigration.sourceRetirementIncluded === false,
    {
      status: report.status,
      liveWorldMutated: report.liveWorldMutated,
      sourceRetirementIncluded: report.protectedMigration.sourceRetirementIncluded,
    },
  );
  const audit = {
    schemaVersion: '1.0.0',
    id: 'MANAGER-VALE-FIVE-COTTAGE-INDEPENDENT-QA-R1',
    status: checks.every((entry) => entry.passed) ? 'PASS' : 'FAIL',
    liveWorldMutated: false,
    source: {
      base: path.relative(ROOT, base),
      reportSha256: sha256File(files.report),
    },
    checks,
    summary: {
      passed: checks.filter((entry) => entry.passed).length,
      failed: checks.filter((entry) => !entry.passed).length,
      total: checks.length,
    },
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(output.replace(/\.json$/, '.md'), markdownAudit(audit));
  return audit;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const options = parseArgs(process.argv.slice(2));
  const audit = auditManagerValeArtifacts(options);
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  if (audit.status !== 'PASS') process.exitCode = 1;
}
