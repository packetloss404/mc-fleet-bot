#!/usr/bin/env node
/** Read-only reconciliation attestation for Successor-06's source-bound halo contract. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cellKey, hashCells } from './lib/combined_zones_release_lib.mjs';

const root = process.cwd();
const manifestPath = 'data/buildops/rail-s3-r10-west-high-successor-06.manifest.json';
const evidenceRoot = 'data/world-review/rail-r10-west-high-successor06-live-20260826T070200Z';
const output = `${evidenceRoot}/contract-correction-attestation.json`;
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, file))).digest('hex');
const parse = (file) => fs.readFileSync(path.resolve(root, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 9 || parts[0] !== 'REPL') throw new Error(`invalid operation: ${line}`);
  return { point: { x: Number(parts[1]), y: Number(parts[2]), z: Number(parts[3]) }, from: parts[7], to: parts[8] };
});
const same = (left, right) => left.x === right.x && left.y === right.y && left.z === right.z;
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'));
const stages = manifest.stages.map((stage) => ({ ...stage, forwardRecords: parse(stage.forward), rollbackRecords: parse(stage.rollback) }));
const inverse = stages.map((stage) => {
  const expected = stage.forwardRecords.slice().reverse();
  const failures = [];
  if (expected.length !== stage.rollbackRecords.length) failures.push({ kind: 'count', expected: expected.length, actual: stage.rollbackRecords.length });
  for (let index = 0; index < Math.min(expected.length, stage.rollbackRecords.length); index += 1) {
    const forward = expected[index];
    const rollback = stage.rollbackRecords[index];
    if (!same(forward.point, rollback.point) || forward.to !== rollback.from || forward.from !== rollback.to) failures.push({ kind: 'inverse', index, forward, rollback });
  }
  return { id: stage.id, expected: expected.length, actual: stage.rollbackRecords.length, failures };
});
const forwardCells = stages.flatMap((stage) => stage.forwardRecords.map(({ point }) => point));
const forwardKeys = forwardCells.map(cellKey);
const duplicateTargets = forwardKeys.filter((key, index) => forwardKeys.indexOf(key) !== index);
const postQa = JSON.parse(fs.readFileSync(path.resolve(root, `${evidenceRoot}/post-qa.json`), 'utf8'));
const sourceIntake = JSON.parse(fs.readFileSync(path.resolve(root, `${evidenceRoot}/source.json`), 'utf8'));
const postIntake = JSON.parse(fs.readFileSync(path.resolve(root, `${evidenceRoot}/post.json`), 'utf8'));
const requiredReports = [
  'reconciliation-shell-forward-parser.json', 'reconciliation-core-forward-parser.json',
  'reconciliation-core-rollback-parser.json', 'reconciliation-shell-rollback-parser.json',
  'reconciliation-shell-forward-preflight.json', 'reconciliation-core-forward-preflight.json',
  'reconciliation-block-entity-audit.json', 'reconciliation-core-rollback-poststate.json',
  'reconciliation-shell-rollback-poststate.json', 'post-qa.json',
];
const reports = requiredReports.map((file) => {
  const payload = JSON.parse(fs.readFileSync(path.resolve(root, `${evidenceRoot}/${file}`), 'utf8'));
  return { file, sha256: sha256(`${evidenceRoot}/${file}`), status: payload.status };
});
const status = inverse.every((result) => result.failures.length === 0)
  && duplicateTargets.length === 0
  && postQa.status === 'PASS'
  && reports.every((report) => report.status === 'PASS' || report.status === 'complete' || report.status === 'dry_run');
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor06-contract-correction-attestation',
  status: status ? 'PASS' : 'FAIL',
  immutable: true,
  purpose: 'Correct an unbound halo count without rerunning or altering the completed world transaction.',
  supersededUnboundField: {
    field: 'ownership.predecessor.haloPds.count',
    recordedValue: 84,
    defect: 'Scalar had no coordinate-set hash and did not match the canonical source.',
  },
  sourceBoundContract: {
    shellPds: manifest.ownership.predecessor.shellPds,
    haloPds: manifest.ownership.predecessor.haloPds,
    haloInterface: manifest.ownership.predecessor.haloInterface,
    localPds: manifest.ownership.predecessor.localPds,
    pdsMigration: manifest.ownership.predecessor.pdsMigration,
    preservedHalo: manifest.gravity.preservedHalo,
  },
  forwardTargetSet: { count: forwardCells.length, uniqueCount: new Set(forwardKeys).size, coordinateSetSha256: hashCells(forwardCells), duplicateTargets },
  inverse,
  operationHashes: Object.fromEntries(stages.map((stage) => [stage.id, { forward: sha256(stage.forward), rollback: sha256(stage.rollback) }])),
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postQa: { file: `${evidenceRoot}/post-qa.json`, sha256: sha256(`${evidenceRoot}/post-qa.json`), status: postQa.status },
  gateReports: reports,
  worldCommandsIssuedByCorrection: 0,
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
fs.writeFileSync(path.resolve(root, output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, forwardTargets: `${result.forwardTargetSet.uniqueCount}/${result.forwardTargetSet.count}`, inverse: inverse.map(({ id, actual, expected, failures }) => ({ id, actual, expected, failures: failures.length })), haloPds: result.sourceBoundContract.haloPds.count, haloInterface: result.sourceBoundContract.haloInterface.count, postQa: postQa.status }, null, 2));
