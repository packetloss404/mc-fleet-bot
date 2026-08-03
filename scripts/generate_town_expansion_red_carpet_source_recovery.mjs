#!/usr/bin/env node
/**
 * Prepare the exact-guarded restoration of the 49 red-carpet source cells
 * rejected by the all-or-nothing natural-transition policy generator.
 *
 * This script reads only committed evidence and immutable Anvil snapshots. It
 * never connects to Minecraft, RCON, systemd, SQLite, or another live service.
 * `--emit` writes only the forward and exact-inverse operation files.
 * `--finalize` requires independently generated preflight and parser dry-run
 * reports before it writes the accepted offline manifest and report.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  parseOperationText,
  verifyExactOperationBijection,
} from './qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AIR = 'minecraft:air';
const RED_CARPET = 'minecraft:red_carpet';
const EXPECTED_AUDIT_LINES = new Map([
  [72212, 4],
  [72213, 3],
  [72214, 36],
  [72215, 6],
]);

export const RED_CARPET_RECOVERY_PATHS = Object.freeze({
  negativeAudit:
    'data/world-review/'
    + 'town-expansion-r1-base-rollback-transition-policy-accessibility-source-audit-20260728.json',
  baseRollbackPreflight:
    'data/world-review/'
    + 'town-expansion-r1-base-rollback-preflight-accessibility-source-20260728.json',
  baseRollback: 'data/buildops/town-expansion-r1-2026-07-28.rollback.txt',
  accessibilityTransaction:
    'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-atomic-transaction-attempt2-20260728.json',
  accessibilitySourcePreflight:
    'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-independent-preflight-attempt2-20260728.json',
  citizenTransaction:
    'data/world-review/'
    + 'citizen-route-live-walk-leaf-clearance-atomic-transaction-20260728.json',
  citizenSourcePreflight:
    'data/world-review/'
    + 'citizen-route-live-walk-leaf-clearance-repair-preflight-postaccessibility-20260728.json',
  terminalRegions:
    'data/worldsnap-town-accessibility-citizen-final-20260728T1745Z/region',
  forward:
    'data/buildops/'
    + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt',
  rollback:
    'data/buildops/'
    + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.rollback.txt',
  manifest:
    'data/buildops/'
    + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.manifest.json',
  report:
    'data/buildops/'
    + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.report.json',
  sourcePreflight:
    'data/world-review/'
    + 'town-expansion-r1-red-carpet-source-recovery-terminal-preflight-20260728.json',
  forwardDryRun:
    'data/buildops/'
    + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.dry-run.json',
  rollbackDryRun:
    'data/buildops/'
    + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.rollback.dry-run.json',
});

const EXPECTED_IDENTITIES = Object.freeze({
  negativeAudit:
    '2accb75be1de5bf593dc052f0c916387b3d318c9f148544cec56750ee686f123',
  baseRollbackPreflight:
    '806544a2e2af87e35180ef10d9cb35cce093e118f80b935ae5bc67df232efcf3',
  baseRollback:
    '1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de',
  rejectedPolicySourceSnapshot:
    '0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218',
  accessibilityTransaction:
    '06a4a66570d19f8a231a6adcb281b43ac957320cca1ccdcabc983bc989492cca',
  accessibilitySourcePreflight:
    '784a71570d33cc37fb8c26ca2525becbf50f416e97ca27766f5a94cb6bd47f65',
  accessibilityForward:
    'b042a63f6947554b701db0a56e970ef9054e5941a7c979f8c3f761d93d11cc3b',
  accessibilityPostSnapshot:
    '16bd79f513dd4f93091fb2c9c669fae4bb126617d298035ee17462ca0a6b838a',
  citizenTransaction:
    '9a91d74795a940d47b5bbbd73efb9b3d8967ffbc6804e3523b8500cf8294599a',
  citizenSourcePreflight:
    '6176e3db11ca666e382b3ca0cf1556a32cb8816add5635bce5abd4d27de9c751',
  citizenForward:
    '9bc207d89c7243eccf50dfb1e1251c06411c85e1e1641c682afcae53792eb64b',
  terminalSnapshot:
    '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d',
});

function absolute(filename) {
  return path.resolve(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pointKey(point) {
  return point.join(',');
}

function pointInBox(point, box) {
  return (
    point[0] >= box[0] && point[0] <= box[3]
    && point[1] >= box[1] && point[1] <= box[4]
    && point[2] >= box[2] && point[2] <= box[5]
  );
}

function compareTargets(left, right) {
  return left.line - right.line
    || left.point[1] - right.point[1]
    || left.point[2] - right.point[2]
    || left.point[0] - right.point[0];
}

function normalizePath(filename) {
  return path.resolve(ROOT, filename);
}

function operationAtLine(parsed, line) {
  return parsed.repl.find((operation) => operation.line === line);
}

/**
 * Prove that the rejected policy audit identifies exactly the four complete
 * red-carpet-to-air failure groups from the bound base rollback preflight.
 */
export function deriveRedCarpetRecoveryTargets({
  negativeAudit,
  baseRollbackPreflight,
  baseRollbackText,
  baseRollbackSha256 = sha256(baseRollbackText),
  negativeAuditSha256 = null,
  baseRollbackPreflightSha256 = null,
  parsedBaseRollback = null,
}) {
  assert(negativeAudit.schemaVersion === 1, 'negative audit schema drift');
  assert(negativeAudit.status === 'FAIL', 'negative audit must remain FAIL');
  assert(negativeAudit.passed === false, 'negative audit unexpectedly passed');
  assert(
    negativeAudit.operation?.sha256 === baseRollbackSha256,
    'negative audit base rollback hash mismatch',
  );
  assert(
    baseRollbackPreflight.schemaVersion === 2
      && baseRollbackPreflight.status === 'FAIL',
    'base rollback preflight must remain a complete schema-v2 FAIL',
  );
  assert(
    baseRollbackPreflight.orderAwareProjection === true
      && baseRollbackPreflight.failurePointsComplete === true,
    'base rollback preflight is not complete and order-aware',
  );
  assert(
    Array.isArray(baseRollbackPreflight.partialMasks)
      && baseRollbackPreflight.partialMasks.length === 0,
    'base rollback preflight contains partial masks',
  );
  assert(
    baseRollbackPreflight.opsSha256 === baseRollbackSha256,
    'base rollback preflight operation hash mismatch',
  );
  assert(
    normalizePath(baseRollbackPreflight.opsPath)
      === normalizePath(negativeAudit.operation.path),
    'audit and preflight operation paths differ',
  );
  if (negativeAuditSha256 !== null) {
    assert(
      negativeAuditSha256 === EXPECTED_IDENTITIES.negativeAudit,
      'negative audit identity drift',
    );
  }
  if (baseRollbackPreflightSha256 !== null) {
    assert(
      baseRollbackPreflightSha256 === EXPECTED_IDENTITIES.baseRollbackPreflight,
      'base rollback preflight identity drift',
    );
  }
  assert(
    negativeAudit.evidence?.preflightSha256
      === (baseRollbackPreflightSha256
        ?? negativeAudit.evidence?.preflightSha256),
    'negative audit does not bind the supplied preflight',
  );
  assert(
    negativeAudit.evidence?.snapshotSha256
      === baseRollbackPreflight.regionsSnapshot?.sha256,
    'negative audit snapshot does not match its preflight',
  );
  assert(
    negativeAudit.classification?.naturalTransitionPoints === 4529
      && negativeAudit.classification?.unsupportedPoints === 49
      && negativeAudit.classification?.ruleCount === 61
      && negativeAudit.classification?.allEvidencePointsAccountedFor === true,
    'negative audit classification drift',
  );
  assert(
    negativeAudit.evidence?.failedOperationGroups === 65
      && negativeAudit.evidence?.failureArrayLength === 65
      && negativeAudit.evidence?.observedPoints === 4578,
    'negative audit evidence cardinality drift',
  );
  assert(
    baseRollbackPreflight.failed === 65
      && baseRollbackPreflight.failures?.length === 65,
    'base rollback failure-group cardinality drift',
  );
  const observedPoints = baseRollbackPreflight.failures.reduce(
    (sum, failure) => {
      assert(
        failure.unexpectedComplete === true
          && failure.unexpectedCount === failure.unexpected?.length,
        `incomplete unexpected-point evidence at line ${failure.line}`,
      );
      return sum + failure.unexpected.length;
    },
    0,
  );
  assert(observedPoints === 4578, 'base rollback unexpected-point cardinality drift');

  const parsed = parsedBaseRollback
    ?? parseOperationText(baseRollbackText, 'base rollback');
  assert(
    parsed.unsupported.length === 0,
    'base rollback contains unsupported operation lines',
  );
  const unsupported = negativeAudit.unsupportedTransitions;
  assert(
    Array.isArray(unsupported) && unsupported.length === 49,
    'negative audit must contain exactly 49 unsupported transitions',
  );

  const counts = new Map();
  const seen = new Set();
  const targets = [];
  for (const transition of unsupported) {
    assert(
      transition.canonicalSource === RED_CARPET
        && transition.actual === AIR,
      `unsupported transition ${pointKey(transition.point)} is not red_carpet -> air`,
    );
    assert(
      EXPECTED_AUDIT_LINES.has(transition.line),
      `unsupported transition uses undeclared line ${transition.line}`,
    );
    assert(
      Array.isArray(transition.point)
        && transition.point.length === 3
        && transition.point.every(Number.isSafeInteger),
      `invalid unsupported transition point at line ${transition.line}`,
    );
    const key = pointKey(transition.point);
    assert(!seen.has(key), `duplicate recovery target ${key}`);
    seen.add(key);

    const operation = operationAtLine(parsed, transition.line);
    assert(operation, `base rollback line ${transition.line} is missing`);
    assert(
      operation.sources.length === 1
        && operation.sources[0] === RED_CARPET
        && operation.desired === transition.replacement,
      `base rollback source contract mismatch at line ${transition.line}`,
    );
    assert(
      pointInBox(transition.point, operation.box),
      `recovery target ${key} is outside base rollback line ${transition.line}`,
    );
    const failure = baseRollbackPreflight.failures.find(
      (entry) => entry.line === transition.line,
    );
    assert(failure, `preflight failure line ${transition.line} is missing`);
    assert(
      JSON.stringify(failure.box) === JSON.stringify(operation.box)
        && JSON.stringify(failure.expected) === JSON.stringify(operation.sources)
        && failure.replacement === operation.desired,
      `preflight failure contract mismatch at line ${transition.line}`,
    );
    const observed = failure.unexpected.find(
      (entry) => pointKey(entry.point) === key,
    );
    assert(
      observed?.actual === AIR,
      `preflight does not prove air at recovery target ${key}`,
    );
    counts.set(transition.line, (counts.get(transition.line) ?? 0) + 1);
    targets.push({
      line: transition.line,
      point: [...transition.point],
      source: AIR,
      replacement: RED_CARPET,
      baseRollbackReplacement: transition.replacement,
    });
  }
  for (const [line, count] of EXPECTED_AUDIT_LINES) {
    assert(
      counts.get(line) === count,
      `line ${line} recovery target count drift`,
    );
  }
  return targets.sort(compareTargets);
}

function operationLine(target, reverse = false) {
  const [x, y, z] = target.point;
  return [
    'REPL',
    x, y, z, x, y, z,
    reverse ? target.replacement : target.source,
    reverse ? target.source : target.replacement,
  ].join(' ');
}

export function buildRedCarpetRecoveryOperationTexts({
  targets,
  terminalSnapshotSha256 = EXPECTED_IDENTITIES.terminalSnapshot,
  negativeAuditSha256 = EXPECTED_IDENTITIES.negativeAudit,
  baseRollbackPreflightSha256 = EXPECTED_IDENTITIES.baseRollbackPreflight,
  baseRollbackSha256 = EXPECTED_IDENTITIES.baseRollback,
}) {
  assert(targets.length === 49, 'recovery package must target exactly 49 cells');
  const forward = [
    '# Town Expansion R1 red-carpet source recovery — generated 2026-07-28',
    '# OFFLINE VALIDATION ONLY / NOT EXECUTED',
    `# Terminal immutable source snapshot: ${terminalSnapshotSha256}`,
    `# Negative transition audit: ${negativeAuditSha256}`,
    `# Complete base rollback preflight: ${baseRollbackPreflightSha256}`,
    `# Canonical base rollback: ${baseRollbackSha256}`,
    '# Exact one-cell guards only: minecraft:air -> minecraft:red_carpet',
    '# This physical recovery does not widen the copper-only transition policy.',
    '# Live contract: service stopped; world frozen; fresh entity gate; strict-noop.',
  ];
  let line = null;
  for (const target of targets) {
    if (target.line !== line) {
      line = target.line;
      forward.push('', `# rejected base rollback source line ${line}`);
    }
    forward.push(operationLine(target));
  }
  forward.push('');

  const rollback = [
    '# Town Expansion R1 red-carpet source recovery exact rollback — generated 2026-07-28',
    '# OFFLINE VALIDATION ONLY / NOT EXECUTED',
    `# Exact inverse of ${RED_CARPET_RECOVERY_PATHS.forward}`,
    `# Forward source snapshot: ${terminalSnapshotSha256}`,
    '# Exact one-cell guards only: minecraft:red_carpet -> minecraft:air',
    '# Rollback requires its own fresh immutable post-state preflight.',
    '',
    ...[...targets].reverse().map((target) => operationLine(target, true)),
    '',
  ];
  const forwardText = forward.join('\n');
  const rollbackText = rollback.join('\n');
  const bijection = verifyExactOperationBijection(forwardText, rollbackText);
  assert(
    bijection.passed
      && bijection.forwardReplGroups === 49
      && bijection.rollbackReplGroups === 49
      && bijection.uniqueTargetCells === 49
      && bijection.repeatedForwardCellSteps === 0,
    'generated recovery package is not an exact 49-cell bijection',
  );
  return { forwardText, rollbackText, bijection };
}

function validateArtifact(filename, expectedSha256) {
  assert(fs.existsSync(filename), `required artifact missing: ${relative(filename)}`);
  const actual = sha256File(filename);
  assert(
    actual === expectedSha256,
    `artifact identity drift: ${relative(filename)} expected ${expectedSha256}, found ${actual}`,
  );
  return actual;
}

function validateSourcePreflight({
  report,
  operationPath,
  operationSha256,
  snapshotSha256,
  operationCount,
  label,
}) {
  assert(report.status === 'PASS', `${label} preflight did not pass`);
  assert(report.opsSha256 === operationSha256, `${label} preflight operation drift`);
  assert(
    normalizePath(report.opsPath) === normalizePath(operationPath),
    `${label} preflight operation path drift`,
  );
  assert(
    report.regionsSnapshot?.sha256 === snapshotSha256,
    `${label} preflight snapshot drift`,
  );
  assert(
    report.passed === operationCount && report.failed === 0,
    `${label} preflight cardinality drift`,
  );
}

function assertNoSupplementalOverlap(targets, operationText, label) {
  const parsed = parseOperationText(operationText, label);
  assert(parsed.unsupported.length === 0, `${label} has unsupported operations`);
  const overlaps = targets.flatMap((target) => parsed.repl
    .filter((operation) => pointInBox(target.point, operation.box))
    .map((operation) => ({
      point: target.point,
      sourceLine: target.line,
      supplementalLine: operation.line,
    })));
  assert(overlaps.length === 0, `${label} overlaps red-carpet recovery targets`);
  return parsed.repl.length;
}

async function loadBoundContext() {
  const resolved = Object.fromEntries(
    Object.entries(RED_CARPET_RECOVERY_PATHS)
      .map(([key, filename]) => [key, absolute(filename)]),
  );
  validateArtifact(resolved.negativeAudit, EXPECTED_IDENTITIES.negativeAudit);
  validateArtifact(
    resolved.baseRollbackPreflight,
    EXPECTED_IDENTITIES.baseRollbackPreflight,
  );
  validateArtifact(resolved.baseRollback, EXPECTED_IDENTITIES.baseRollback);
  validateArtifact(
    resolved.accessibilityTransaction,
    EXPECTED_IDENTITIES.accessibilityTransaction,
  );
  validateArtifact(
    resolved.accessibilitySourcePreflight,
    EXPECTED_IDENTITIES.accessibilitySourcePreflight,
  );
  validateArtifact(
    resolved.citizenTransaction,
    EXPECTED_IDENTITIES.citizenTransaction,
  );
  validateArtifact(
    resolved.citizenSourcePreflight,
    EXPECTED_IDENTITIES.citizenSourcePreflight,
  );

  const negativeAudit = readJson(resolved.negativeAudit);
  const baseRollbackPreflight = readJson(resolved.baseRollbackPreflight);
  const baseRollbackText = fs.readFileSync(resolved.baseRollback, 'utf8');
  const targets = deriveRedCarpetRecoveryTargets({
    negativeAudit,
    baseRollbackPreflight,
    baseRollbackText,
    baseRollbackSha256: EXPECTED_IDENTITIES.baseRollback,
    negativeAuditSha256: EXPECTED_IDENTITIES.negativeAudit,
    baseRollbackPreflightSha256: EXPECTED_IDENTITIES.baseRollbackPreflight,
  });

  const accessibilityTransaction = readJson(resolved.accessibilityTransaction);
  const accessibilitySourcePreflight = readJson(resolved.accessibilitySourcePreflight);
  const accessibilityPackage = accessibilityTransaction.packages?.[0];
  assert(
    accessibilityTransaction.status === 'committed'
      && accessibilityTransaction.source?.snapshotSha256
        === EXPECTED_IDENTITIES.rejectedPolicySourceSnapshot
      && accessibilityTransaction.postState?.snapshotSha256
        === EXPECTED_IDENTITIES.accessibilityPostSnapshot,
    'accessibility supplemental transaction chain drift',
  );
  assert(
    accessibilityPackage?.status === 'committed'
      && accessibilityPackage.forwardSha256 === EXPECTED_IDENTITIES.accessibilityForward,
    'accessibility supplemental package identity drift',
  );
  const accessibilityForwardPath = absolute(accessibilityPackage.forward);
  validateArtifact(accessibilityForwardPath, EXPECTED_IDENTITIES.accessibilityForward);
  validateSourcePreflight({
    report: accessibilitySourcePreflight,
    operationPath: accessibilityForwardPath,
    operationSha256: EXPECTED_IDENTITIES.accessibilityForward,
    snapshotSha256: EXPECTED_IDENTITIES.rejectedPolicySourceSnapshot,
    operationCount: accessibilityPackage.sourceGroups,
    label: 'accessibility supplemental',
  });
  const accessibilityOperationCount = assertNoSupplementalOverlap(
    targets,
    fs.readFileSync(accessibilityForwardPath, 'utf8'),
    'accessibility supplemental',
  );

  const citizenTransaction = readJson(resolved.citizenTransaction);
  const citizenSourcePreflight = readJson(resolved.citizenSourcePreflight);
  const citizenPackage = citizenTransaction.packages?.[0];
  assert(
    citizenTransaction.status === 'committed'
      && citizenTransaction.postState?.snapshotSha256
        === EXPECTED_IDENTITIES.terminalSnapshot,
    'citizen supplemental transaction chain drift',
  );
  assert(
    citizenPackage?.status === 'committed'
      && citizenPackage.forwardSha256 === EXPECTED_IDENTITIES.citizenForward,
    'citizen supplemental package identity drift',
  );
  const citizenForwardPath = absolute(citizenPackage.forward);
  validateArtifact(citizenForwardPath, EXPECTED_IDENTITIES.citizenForward);
  validateSourcePreflight({
    report: citizenSourcePreflight,
    operationPath: citizenForwardPath,
    operationSha256: EXPECTED_IDENTITIES.citizenForward,
    snapshotSha256: EXPECTED_IDENTITIES.accessibilityPostSnapshot,
    operationCount: citizenPackage.sourceGroups,
    label: 'citizen supplemental',
  });
  const citizenOperationCount = assertNoSupplementalOverlap(
    targets,
    fs.readFileSync(citizenForwardPath, 'utf8'),
    'citizen supplemental',
  );
  assert(
    normalizePath(citizenTransaction.postState.snapshot)
      === normalizePath(RED_CARPET_RECOVERY_PATHS.terminalRegions),
    'citizen transaction terminal snapshot path drift',
  );

  const terminalSnapshot = hashSnapshotDirectory(resolved.terminalRegions);
  assert(
    terminalSnapshot.sha256 === EXPECTED_IDENTITIES.terminalSnapshot,
    'terminal immutable snapshot identity drift',
  );
  const snapshot = new DetailedAnvilSnapshot(resolved.terminalRegions);
  const targetStates = [];
  for (const target of targets) {
    const actual = await snapshot.getBlock(...target.point);
    assert(actual === AIR, `terminal source drift at ${pointKey(target.point)}: ${actual}`);
    targetStates.push({ ...target, actual });
  }
  const targetKeys = new Set(targets.map((target) => pointKey(target.point)));
  const blockEntities = (await snapshot.blockEntitiesInBox([-9, 52, -400, -3, 52, -392]))
    .filter((entity) => targetKeys.has(`${entity.x},${entity.y},${entity.z}`));
  assert(blockEntities.length === 0, 'red-carpet recovery would target block entities');

  const operationTexts = buildRedCarpetRecoveryOperationTexts({ targets });
  return {
    resolved,
    negativeAudit,
    baseRollbackPreflight,
    targets,
    targetStates,
    terminalSnapshot,
    operationTexts,
    chain: {
      accessibility: {
        transaction: accessibilityTransaction,
        transactionSha256: EXPECTED_IDENTITIES.accessibilityTransaction,
        sourcePreflight: accessibilitySourcePreflight,
        sourcePreflightSha256: EXPECTED_IDENTITIES.accessibilitySourcePreflight,
        operationCount: accessibilityOperationCount,
      },
      citizen: {
        transaction: citizenTransaction,
        transactionSha256: EXPECTED_IDENTITIES.citizenTransaction,
        sourcePreflight: citizenSourcePreflight,
        sourcePreflightSha256: EXPECTED_IDENTITIES.citizenSourcePreflight,
        operationCount: citizenOperationCount,
      },
    },
  };
}

function writeNew(filename, contents) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, contents, { flag: 'wx' });
}

function ensureExactFile(filename, expectedText) {
  assert(fs.existsSync(filename), `generated operation file missing: ${relative(filename)}`);
  assert(
    fs.readFileSync(filename, 'utf8') === expectedText,
    `generated operation file drift: ${relative(filename)}`,
  );
}

function validateParserDryRun(report, operationSha256, role) {
  assert(
    report.status === 'dry_run'
      && report.dryRun === true
      && report.strictNoop === true
      && report.operationRole === role
      && report.operationSha256 === operationSha256
      && report.sourceOperationCount === 49
      && report.worldEditLeftoverCount === 0,
    `${role} parser dry-run is stale or failed`,
  );
}

function loadOfflineEvidence(context) {
  const { resolved, operationTexts } = context;
  ensureExactFile(resolved.forward, operationTexts.forwardText);
  ensureExactFile(resolved.rollback, operationTexts.rollbackText);
  const forwardSha256 = sha256File(resolved.forward);
  const rollbackSha256 = sha256File(resolved.rollback);
  const sourcePreflight = readJson(resolved.sourcePreflight);
  validateSourcePreflight({
    report: sourcePreflight,
    operationPath: resolved.forward,
    operationSha256: forwardSha256,
    snapshotSha256: EXPECTED_IDENTITIES.terminalSnapshot,
    operationCount: 49,
    label: 'red-carpet recovery',
  });
  const forwardDryRun = readJson(resolved.forwardDryRun);
  const rollbackDryRun = readJson(resolved.rollbackDryRun);
  validateParserDryRun(forwardDryRun, forwardSha256, 'forward');
  validateParserDryRun(rollbackDryRun, rollbackSha256, 'rollback');
  return {
    forwardSha256,
    rollbackSha256,
    sourcePreflight,
    forwardDryRun,
    rollbackDryRun,
    artifacts: [
      {
        id: 'terminal-exact-source-preflight',
        file: relative(resolved.sourcePreflight),
        sha256: sha256File(resolved.sourcePreflight),
        status: sourcePreflight.status,
      },
      {
        id: 'forward-parser-dry-run',
        file: relative(resolved.forwardDryRun),
        sha256: sha256File(resolved.forwardDryRun),
        status: forwardDryRun.status,
      },
      {
        id: 'rollback-parser-dry-run',
        file: relative(resolved.rollbackDryRun),
        sha256: sha256File(resolved.rollbackDryRun),
        status: rollbackDryRun.status,
      },
    ],
  };
}

async function emit() {
  const context = await loadBoundContext();
  for (const filename of [context.resolved.forward, context.resolved.rollback]) {
    assert(!fs.existsSync(filename), `refusing to overwrite ${relative(filename)}`);
  }
  writeNew(context.resolved.forward, context.operationTexts.forwardText);
  writeNew(context.resolved.rollback, context.operationTexts.rollbackText);
  process.stdout.write(`${JSON.stringify({
    status: 'OFFLINE_OPERATIONS_EMITTED_NOT_EXECUTED',
    forward: relative(context.resolved.forward),
    forwardSha256: sha256File(context.resolved.forward),
    rollback: relative(context.resolved.rollback),
    rollbackSha256: sha256File(context.resolved.rollback),
    operationCount: context.targets.length,
    terminalSnapshotSha256: context.terminalSnapshot.sha256,
    liveWorldMutated: false,
  }, null, 2)}\n`);
}

async function finalize() {
  const context = await loadBoundContext();
  const evidence = loadOfflineEvidence(context);
  for (const filename of [context.resolved.manifest, context.resolved.report]) {
    assert(!fs.existsSync(filename), `refusing to overwrite ${relative(filename)}`);
  }
  const sourceArtifacts = [
    ['negativePolicyAudit', context.resolved.negativeAudit],
    ['completeBaseRollbackPreflight', context.resolved.baseRollbackPreflight],
    ['canonicalBaseRollback', context.resolved.baseRollback],
    ['accessibilityTransaction', context.resolved.accessibilityTransaction],
    ['accessibilitySourcePreflight', context.resolved.accessibilitySourcePreflight],
    ['citizenTransaction', context.resolved.citizenTransaction],
    ['citizenSourcePreflight', context.resolved.citizenSourcePreflight],
  ].map(([id, filename]) => ({
    id,
    file: relative(filename),
    sha256: sha256File(filename),
  }));
  const manifest = {
    schemaVersion: 1,
    id: 'town-expansion-r1-red-carpet-source-recovery-2026-07-28',
    transactionId:
      'town-expansion-r1-red-carpet-source-recovery-atomic-2026-07-28',
    packages: [{
      key: 'town-expansion-r1-red-carpet-source-recovery',
      forward: relative(context.resolved.forward),
      rollback: relative(context.resolved.rollback),
    }],
    status: 'OFFLINE_VALIDATED_NOT_EXECUTED',
    liveWorldMutated: false,
    serviceMutated: false,
    databaseMutated: false,
    source: {
      terminalRegions: relative(context.resolved.terminalRegions),
      terminalSnapshotSha256: context.terminalSnapshot.sha256,
      terminalRegionFileCount: context.terminalSnapshot.regionFileCount,
      rejectedPolicySourceSnapshotSha256:
        EXPECTED_IDENTITIES.rejectedPolicySourceSnapshot,
      sourceChain: [
        {
          transaction: relative(context.resolved.accessibilityTransaction),
          transactionSha256: context.chain.accessibility.transactionSha256,
          sourceSnapshotSha256:
            context.chain.accessibility.transaction.source.snapshotSha256,
          postSnapshotSha256:
            context.chain.accessibility.transaction.postState.snapshotSha256,
          operationCount: context.chain.accessibility.operationCount,
          recoveryTargetOverlap: 0,
        },
        {
          transaction: relative(context.resolved.citizenTransaction),
          transactionSha256: context.chain.citizen.transactionSha256,
          sourceSnapshotSha256:
            context.chain.citizen.sourcePreflight.regionsSnapshot.sha256,
          postSnapshotSha256:
            context.chain.citizen.transaction.postState.snapshotSha256,
          operationCount: context.chain.citizen.operationCount,
          recoveryTargetOverlap: 0,
        },
      ],
      artifacts: sourceArtifacts,
    },
    forward: {
      file: relative(context.resolved.forward),
      sha256: evidence.forwardSha256,
      operationCount: 49,
      targetedCells: 49,
      sourceState: AIR,
      replacementState: RED_CARPET,
    },
    rollback: {
      file: relative(context.resolved.rollback),
      sha256: evidence.rollbackSha256,
      operationCount: 49,
      targetedCells: 49,
      sourceState: RED_CARPET,
      replacementState: AIR,
      exactInverse: true,
    },
    offlineEvidence: evidence.artifacts,
    protections: {
      exactOneCellReplOnly: true,
      uniqueTargetCells: 49,
      repeatedTargetCells: 0,
      terminalSourceGuardsMatched: 49,
      targetBlockEntities: 0,
      supplementalTargetOverlap: 0,
      naturalTransitionPolicyExpanded: false,
      copperOnlyNaturalTransitionPolicyPreserved: true,
      physicalRecoveryRequiredForNonCopperDrift: true,
      liveExecutionPerformed: false,
    },
    executionContract: {
      citizenBidirectionalWalkMustCompleteFirst: true,
      serviceMustBeStopped: true,
      worldMustRemainFrozen: true,
      freshLiveEntityGateRequired: true,
      strictNoopRequired: true,
      paperStrictFillRequired: true,
      immutablePostSnapshotRequired: true,
      rollbackPoststatePreflightRequired: true,
      completeBaseRollbackRepreflightRequired: true,
      automaticLiveExecution: false,
    },
    targetCells: context.targetStates,
  };
  writeNew(context.resolved.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  const report = {
    ...manifest,
    manifest: {
      file: relative(context.resolved.manifest),
      sha256: sha256File(context.resolved.manifest),
    },
    exactGuardAudit: {
      negativeAuditUnsupportedTransitions: 49,
      completePreflightObservedFailurePoints: 4578,
      acceptedNaturalCopperTransitionPoints: 4529,
      rejectedRedCarpetTransitionPoints: 49,
      exactTerminalAirStates: context.targetStates.length,
      exactForwardBijection: context.operationTexts.bijection,
      supplementalOperationGroupsChecked:
        context.chain.accessibility.operationCount
        + context.chain.citizen.operationCount,
      supplementalOverlaps: 0,
      failures: [],
    },
    remainingLiveGates: [
      'complete the live citizen bidirectional walk',
      'stop the fleet service and freeze the world',
      'capture and bind a fresh live entity gate',
      'execute the forward package with the strict-noop Paper-strict runner',
      'capture a fresh immutable post-recovery snapshot',
      'preflight the exact inverse rollback against that post snapshot',
      'rerun the complete base rollback preflight and generate the copper-only policy',
    ],
  };
  writeNew(context.resolved.report, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    manifest: relative(context.resolved.manifest),
    manifestSha256: sha256File(context.resolved.manifest),
    report: relative(context.resolved.report),
    reportSha256: sha256File(context.resolved.report),
    forwardSha256: evidence.forwardSha256,
    rollbackSha256: evidence.rollbackSha256,
    operationCount: 49,
    liveWorldMutated: false,
  }, null, 2)}\n`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  assert(
    (args.has('--emit') || args.has('--finalize'))
      && !(args.has('--emit') && args.has('--finalize')),
    'usage: generate_town_expansion_red_carpet_source_recovery.mjs '
      + '(--emit | --finalize)',
  );
  if (args.has('--emit')) await emit();
  else await finalize();
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
