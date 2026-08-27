#!/usr/bin/env node
/** Deterministic offline readiness seal for R08AD. Never connects to Minecraft. */

import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MANIFEST_PATH = 'data/buildops/combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment.release-manifest.json';
const EVIDENCE = 'data/world-review/combined-zones-r08ad-north-smoke-supported-gravity-east-segment-offline';
const OUT = path.join(EVIDENCE, 'r08ad-offline-readiness.json');
const MD_OUT = path.join(EVIDENCE, 'r08ad-offline-readiness.md');
const KEY = 'ee-smoke-n-supported-gravity-east-compartment-wall';
const readJson = (filename) => JSON.parse(fs.readFileSync(path.resolve(ROOT, filename), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const requireExact = (condition, message) => {
  if (!condition) throw new Error(`R08AD offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST_PATH);
const { manifestIdentity, ...manifestPayload } = manifest;
requireExact(sha256(JSON.stringify(manifestPayload)) === manifestIdentity,
  'manifest payload identity mismatch');
requireExact(manifestIdentity === '98c5766a634bbf68b6dd005c0ca50299c017276738be839cf91a9ea6505e9c9e',
  'canonical manifest identity drifted');
const manifestQa = readJson(path.join(EVIDENCE, 'manifest-qa.json'));
const forward = readJson(path.join(EVIDENCE, `${KEY}.forward-source-preflight.json`));
const rollback = readJson(path.join(EVIDENCE, `${KEY}.projected-rollback-preflight.json`));
const forwardParser = readJson(path.join(EVIDENCE, `${KEY}.forward-strict-dry-run.json`));
const rollbackParser = readJson(path.join(EVIDENCE, `${KEY}.rollback-strict-dry-run.json`));
const blockEntities = readJson(path.join(EVIDENCE, 'block-entity-clearance.json'));
const plan = JSON.parse(execFileSync(process.execPath, [
  path.resolve(ROOT, 'scripts/run_combined_zones_scoped_release.mjs'),
  '--manifest', MANIFEST_PATH, '--release-node', 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
  '--print-plan',
], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
requireExact(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 14,
  'manifest QA did not pass 14 exact targets');
requireExact(forward.status === 'PASS' && forward.passed === 14 && forward.failed === 0,
  'forward source preflight failed');
requireExact(rollback.status === 'PASS' && rollback.passed === 14 && rollback.failed === 0,
  'projected inverse preflight failed');
requireExact(forwardParser.status === 'dry_run' && forwardParser.strictNoop === true
  && rollbackParser.status === 'dry_run' && rollbackParser.strictNoop === true,
  'strict parser gate failed');
requireExact(blockEntities.status === 'PASS' && blockEntities.blockingBlockEntityCount === 0,
  'block-entity clearance failed');
requireExact(plan.mode === 'PREPARE_ONLY' && plan.globalGateDependency === 'NONE'
  && JSON.stringify(plan.packageOrder) === JSON.stringify([KEY]), 'real wrapper plan drifted');
const closure = manifest.isolation.retainedGravitySupportClosure;
requireExact(closure.closureCount === 8 && closure.durableTerminalSupportCount === 8
  && closure.targetOrOperationIntersectionCount === 0, 'durable gravity closure drifted');

const report = {
  schemaVersion: 1,
  generatedAtUtc: '2026-08-22T01:28:00Z',
  status: 'PASS_R08AD_NORTH_SMOKE_SUPPORTED_GRAVITY_EAST_SEGMENT_OFFLINE_READY',
  manifest: { path: MANIFEST_PATH, manifestIdentitySha256: manifestIdentity,
    fullFileSha256: sha256(fs.readFileSync(path.resolve(ROOT, MANIFEST_PATH))) },
  source: manifest.source,
  scope: { targetCellCount: 14, geometry: manifest.scope.geometry.selectedSupportedGravityEastSegment,
    halo: manifest.scope.geometry.interactionHalo, wallState: 'minecraft:stone_bricks' },
  gravityClosure: { sourceCellCount: 8, dependencyCellCount: 8,
    durableTerminalCount: 8, operationIntersectionCount: 0,
    coordinateSetSha256: closure.dependencyGravityCellSet.coordinateSetSha256 },
  exclusions: { fluidTargets: 0, fluidHalo: 0, n06EnvelopeIntersections: 0,
    blockEntities: 0, savedEntities: 0, protectedRelics: 0, futureSeals: 0,
    undeclaredPriorOverlap: 0 },
  projectedResidual: { cellCount: 218, wetCellCount: 147, gravityCellCount: 56,
    sourceStateCellCount: 15, note: 'Accepted R08AC residual minus the exact 14-cell R08AD target set.' },
  gates: { manifestQa: 'PASS_1_PACKAGE_14_TARGETS', forwardPreflight: 'PASS_14_OF_14',
    projectedRollback: 'PASS_14_OF_14', strictParsers: 'PASS_28_COMMANDS',
    blockEntityAudit: 'PASS_ZERO_BLOCKERS', realWrapperPlan: 'PASS_PREPARE_ONLY' },
  executionAuthorizedByThisArtifact: false,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
report.qaPayloadIdentitySha256 = sha256(JSON.stringify(report));
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.resolve(ROOT, MD_OUT), `# R08AD offline readiness\n\nStatus: **PASS / FROZEN / READY FOR GUARDED LIVE EXECUTION**\n\n- Targets: 14 exact stone-brick wall cells in one 2x7 component.\n- Halo: 46 exact cells; eight retained gravel states have complete durable support chains.\n- Gates: manifest, 14/14 forward, 14/14 inverse, strict parsers, block entities, and real wrapper plan PASS.\n- Projected residual: 218 cells (147 wet, 56 gravity, 15 source-state).\n- QA payload: \`${report.qaPayloadIdentitySha256}\`.\n\nThis is offline evidence only. It performed no live call or world edit.\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: OUT,
  qaPayloadIdentitySha256: report.qaPayloadIdentitySha256 }, null, 2)}\n`);
