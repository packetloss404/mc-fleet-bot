#!/usr/bin/env node
/**
 * Compile only the exact C01 model delta against a fresh immutable snapshot.
 *
 * This package does not move or retire source inventories, does not touch
 * block-entity cells, and is not a substitute for the commissioned source
 * migration/retirement transaction. It exists for a current world where the
 * C01 destination is already substantially present and needs a guarded,
 * one-cell completion pass.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { completeBlockState } from './lib/complete_block_state.mjs';
import { modelC01FiveLevelBunker } from './town_expansion_c01_compiler.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_REGIONS = path.join(
  ROOT,
  'data/worldsnap/large-build-readiness-rerun2-20260808/region',
);
const DEFAULT_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json',
);
const DEFAULT_LEDGER = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-source-nbt-migration-ledger.json',
);
const DEFAULT_OUT = path.join(
  ROOT,
  'data/buildops/c01-current-snapshot-delta-2026-08-08.txt',
);
const DEFAULT_ROLLBACK = path.join(
  ROOT,
  'data/buildops/c01-current-snapshot-delta-2026-08-08.rollback.txt',
);
const DEFAULT_REPORT = path.join(
  ROOT,
  'data/world-review/c01-current-snapshot-delta-2026-08-08.json',
);

function argValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function modelStub() {
  return {
    cells: new Map(),
    set(x, y, z, state, metadata) {
      this.cells.set(key(x, y, z), { x, y, z, state, meta: metadata });
    },
    box(x1, y1, z1, x2, y2, z2, state, metadata, predicate) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
            if (!predicate || predicate(x, y, z)) this.set(x, y, z, state, metadata);
          }
        }
      }
    },
  };
}

function oneCellLine(operation) {
  return [
    'REPL',
    operation.x,
    operation.y,
    operation.z,
    operation.x,
    operation.y,
    operation.z,
    operation.expected,
    operation.replacement,
  ].join(' ');
}

function operationSort(left, right) {
  return left.phase - right.phase
    || left.scope.localeCompare(right.scope)
    || left.role.localeCompare(right.role)
    || left.y - right.y
    || left.z - right.z
    || left.x - right.x;
}

function blockEntityBoxes(manifest) {
  return manifest.envelope.boxes ?? [];
}

async function compile({ regions, manifestPath, ledgerPath }) {
  const manifestBytes = fs.readFileSync(manifestPath);
  const ledgerBytes = fs.readFileSync(ledgerPath);
  const manifest = JSON.parse(manifestBytes);
  const snapshot = new DetailedAnvilSnapshot(regions);
  const model = modelStub();
  const c01 = await modelC01FiveLevelBunker(model, snapshot, {
    manifestPath,
    migrationLedgerPath: ledgerPath,
  });

  const entities = [];
  for (const box of blockEntityBoxes(manifest)) {
    entities.push(...await snapshot.blockEntitiesInBox(box));
  }
  const entityByPoint = new Map(
    entities.map((entity) => [
      key(Number(entity.x), Number(entity.y), Number(entity.z)),
      entity,
    ]),
  );

  const changed = [];
  const targetEntityMismatches = [];
  const missingTargets = [];
  for (const desired of model.cells.values()) {
    const current = await snapshot.getBlock(desired.x, desired.y, desired.z);
    if (current === null) {
      missingTargets.push([desired.x, desired.y, desired.z]);
      continue;
    }
    const expected = completeBlockState(current);
    const replacement = completeBlockState(desired.state);
    const entity = entityByPoint.get(key(desired.x, desired.y, desired.z));
    if (entity && expected !== replacement) {
      targetEntityMismatches.push({
        point: [desired.x, desired.y, desired.z],
        id: entity.id,
        expected,
        replacement,
      });
      continue;
    }
    if (expected === replacement) continue;
    changed.push({
      x: desired.x,
      y: desired.y,
      z: desired.z,
      expected,
      replacement,
      phase: desired.meta.phase,
      scope: desired.meta.scope,
      role: desired.meta.role,
    });
  }

  const retainedTargetEntities = [...entityByPoint.entries()]
    .filter(([point]) => model.cells.has(point))
    .map(([point, entity]) => ({
      point: point.split(',').map(Number),
      id: entity.id,
    }))
    .sort((left, right) => left.point[1] - right.point[1]
      || left.point[2] - right.point[2]
      || left.point[0] - right.point[0]);

  changed.sort(operationSort);
  const rollback = [...changed].reverse().map((operation) => ({
    ...operation,
    expected: operation.replacement,
    replacement: operation.expected,
  }));
  const snapshotEvidence = hashSnapshotDirectory(regions);
  const report = {
    schemaVersion: 1,
    status: missingTargets.length > 0 || targetEntityMismatches.length > 0
      ? 'C01_CURRENT_DELTA_BLOCKED'
      : changed.length > 0
        ? 'C01_CURRENT_DELTA_READY_FOR_GUARDED_PREFLIGHT'
        : 'C01_CURRENT_DELTA_ALREADY_CONVERGED',
    liveWorldMutated: false,
    sourceSnapshot: { directory: regions, ...snapshotEvidence },
    model: {
      manifest: manifestPath,
      manifestSha256: sha256(manifestBytes),
      targetCells: model.cells.size,
      compilerStatus: c01.status,
      checks: c01.checks,
    },
    sourceMigration: {
      ledger: ledgerPath,
      ledgerSha256: sha256(ledgerBytes),
      intentionallyIncluded: false,
      retirementStatus: 'DEFERRED_UNTIL_SEPARATE_COMMISSIONING_AND_SOURCE_HASH_GATE',
    },
    gate: {
      missingTargets: missingTargets.length,
      targetEntityCount: retainedTargetEntities.length,
      targetEntityMismatches: targetEntityMismatches.length,
      changedCellCount: changed.length,
      changedTargetsOverlapBlockEntities: targetEntityMismatches.length > 0,
      retainedTargetEntities,
      targetEntityMismatches,
      routeChange: false,
      requiresExistingC01_ROUTE_QA: true,
    },
    operations: {
      forwardOperationGroups: changed.length,
      rollbackOperationGroups: rollback.length,
      forwardSha256: null,
      rollbackSha256: null,
    },
  };
  return { report, changed, rollback };
}

async function main() {
  const args = process.argv.slice(2);
  const regions = argValue(args, '--regions', DEFAULT_REGIONS);
  const manifestPath = argValue(args, '--manifest', DEFAULT_MANIFEST);
  const ledgerPath = argValue(args, '--ledger', DEFAULT_LEDGER);
  const outputPath = argValue(args, '--out', DEFAULT_OUT);
  const rollbackPath = argValue(args, '--rollback', DEFAULT_ROLLBACK);
  const reportPath = argValue(args, '--report', DEFAULT_REPORT);
  const { report, changed, rollback } = await compile({ regions, manifestPath, ledgerPath });
  if (![
    'C01_CURRENT_DELTA_READY_FOR_GUARDED_PREFLIGHT',
    'C01_CURRENT_DELTA_ALREADY_CONVERGED',
  ].includes(report.status)) {
    throw new Error(`C01 current delta blocked: ${JSON.stringify(report.gate)}`);
  }

  const forwardText = [
    '# GENERATED — C01 current-snapshot exact delta',
    '# one-cell guarded operations; source migration and retirement excluded',
    `# source_snapshot_sha256: ${report.sourceSnapshot.sha256}`,
    `# target_cells: ${report.model.targetCells}`,
    `# changed_cells: ${changed.length}`,
    '',
    ...changed.map(oneCellLine),
    '',
  ].join('\n');
  const rollbackText = [
    '# GENERATED — exact inverse of C01 current-snapshot exact delta',
    `# forward_sha256: ${sha256(forwardText)}`,
    `# source_snapshot_sha256: ${report.sourceSnapshot.sha256}`,
    `# changed_cells: ${rollback.length}`,
    '',
    ...rollback.map(oneCellLine),
    '',
  ].join('\n');
  report.operations.forwardSha256 = sha256(forwardText);
  report.operations.rollbackSha256 = sha256(rollbackText);

  for (const target of [outputPath, rollbackPath, reportPath]) {
    fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  }
  fs.writeFileSync(outputPath, forwardText);
  fs.writeFileSync(rollbackPath, rollbackText);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message ?? error);
  process.exitCode = 1;
});
