#!/usr/bin/env node
/**
 * Fail-closed adapter for the generic same-moment live-entity gate.
 *
 * redevelopment_live_entity_gate.py deliberately knows only about the exact
 * operation it has just observed.  SYS-03 also needs each stage observation
 * bound to the full, immutable interaction envelope in its fresh manifest.
 * This adapter performs that evidence-only binding; it never contacts RCON,
 * snapshots, Minecraft, or the fleet and refuses incomplete source reports.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { hashCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag) => { const index = args.indexOf(flag); return index < 0 ? '' : args[index + 1]; };
const rawPath = arg('--raw-report');
const manifestPath = arg('--manifest');
const stageId = arg('--stage');
const operationPath = arg('--operation');
const outPath = arg('--out');
if (![rawPath, manifestPath, stageId, outPath].every(Boolean)) {
  throw new Error('usage: --raw-report <redevelopment-live-entity-gate.json> --manifest <manifest> --stage <stage-id> [--operation <stage-forward.ops>] --out <normalized-clearance.json>');
}

const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, absolute(file)).split(path.sep).join('/');
const bytes = (file) => fs.readFileSync(absolute(file));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => JSON.parse(bytes(file));
const fail = (condition, message) => { if (!condition) throw new Error(`SYS-03 High-16 live-entity normalization refused: ${message}`); };
const operationPoints = (file) => bytes(file).toString('utf8').split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#')).map((line, index) => {
  const parts = line.trim().split(/\s+/);
  fail(parts.length === 9 && parts[0] === 'REPL' && parts[1] === parts[4] && parts[2] === parts[5] && parts[3] === parts[6], `${relative(file)}:${index + 1} is not an exact one-cell REPL`);
  return { x: Number(parts[1]), y: Number(parts[2]), z: Number(parts[3]) };
});

fail(fs.existsSync(absolute(rawPath)), `raw report is absent: ${rawPath}`);
fail(fs.existsSync(absolute(manifestPath)), `manifest is absent: ${manifestPath}`);
fail(!fs.existsSync(absolute(outPath)), `refuses to overwrite existing normalized evidence: ${outPath}`);
const rawBytes = bytes(rawPath);
const raw = JSON.parse(rawBytes);
const manifestBytes = bytes(manifestPath);
const manifest = JSON.parse(manifestBytes);
const stage = (manifest.stages ?? []).find(({ id }) => id === stageId);
fail(manifest.status === 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL' && manifest.civilOnly === true && manifest.passengerServiceCommissioned === false, 'manifest is not the civil-only fresh static candidate');
fail(stage && stage.exactInverse === true && Number.isInteger(stage.count) && stage.count > 0 && typeof stage.sha256 === 'string', `unknown or unguarded stage: ${stageId}`);
fail(!operationPath || relative(operationPath) === relative(stage.forward), '--operation is not the selected manifest stage forward operation');
const interaction = manifest.geometry?.interaction;
fail(interaction?.count === 6921 && typeof interaction.coordinateSetSha256 === 'string' && interaction.coordinateSetSha256.length === 64, 'manifest lacks exact full interaction identity');
const interactionRecords = [...(manifest.sourceStates?.core ?? []), ...(manifest.sourceStates?.shell ?? []), ...(manifest.sourceStates?.halo ?? [])];
fail(interactionRecords.length === interaction.count && hashCells(interactionRecords.map(({ point }) => point)) === interaction.coordinateSetSha256, 'manifest interaction records do not reproduce the declared full interaction set');
const points = operationPoints(stage.forward);
fail(points.length === stage.count && hashCells(points).length === 64, `${stage.id} operation count or coordinate set drifted`);
fail(sha(bytes(stage.forward)) === stage.sha256, `${stage.id} forward operation bytes no longer match manifest SHA-256`);

fail(raw.schemaVersion === 2 && raw.status === 'PASS' && raw.passed === true, 'generic gate report is not PASS schema v2');
fail(raw.blockOrEntityMutation === false && raw.temporaryForceLoadMutation === true && raw.blockerNbtCaptureRequested === true, 'generic gate does not prove its required non-block/entity mutation and capture mode');
const packages = raw.packages;
fail(Array.isArray(packages) && packages.length === 1, 'generic gate must contain exactly the one immediate stage package');
const pkg = packages[0];
fail(relative(pkg.file) === relative(stage.forward) && pkg.operationSha256 === stage.sha256 && pkg.passed === true, 'generic package is not the exact selected stage operation');
fail(pkg.entitiesReturnedInEnvelope === 0 && Array.isArray(pkg.blockers) && pkg.blockers.length === 0 && Array.isArray(pkg.protectedNonBlockingEntities) && pkg.protectedNonBlockingEntities.length === 0, 'generic package contains live entities or nonblocking exceptions');
fail(pkg.selectorLimitReached === false && Array.isArray(pkg.queryErrors) && pkg.queryErrors.length === 0 && Array.isArray(pkg.blockerNbtCaptureErrors) && pkg.blockerNbtCaptureErrors.length === 0 && pkg.blockerNbtCaptures === 0, 'generic package query/capture evidence is incomplete');
fail(Array.isArray(pkg.targetHaloChunks) && pkg.targetHaloChunks.length > 0 && Array.isArray(pkg.spatialQueries) && pkg.spatialQueries.length === pkg.targetHaloChunks.length * 2, 'generic package does not cover every halo chunk with player and non-player queries');
fail(Array.isArray(pkg.categoryQueries) && pkg.categoryQueries.length === 2 && ['player', 'non-player'].every((category) => pkg.categoryQueries.some((entry) => entry.category === category && entry.selectedCount === 0 && entry.parsedPositions === 0 && entry.selectorLimitReached === false)), 'generic package category observations are incomplete or nonempty');
fail(pkg.spatialQueries.every((entry) => ['player', 'non-player'].includes(entry.category) && entry.selectedCount === 0 && entry.parsedPositions === 0 && entry.selectorLimitReached === false), 'generic package spatial observations are incomplete or nonempty');
const force = raw.forceLoadAudit;
fail(force?.allRequiredChunksLoadedBeforeQueries === true && Array.isArray(force.missingRequiredChunks) && force.missingRequiredChunks.length === 0 && force.allTemporaryChunksReleased === true && force.finalSetMatchesPreExistingSet === true && Array.isArray(force.cleanupErrors) && force.cleanupErrors.length === 0, 'generic gate force-load restoration is incomplete');
const totals = raw.totals;
fail(totals?.packages === 1 && totals.passed === 1 && totals.failed === 0 && totals.entitiesReturnedInEnvelopes === 0 && totals.blockingEntityHits === 0 && totals.blockerNbtCaptures === 0 && totals.blockerNbtCaptureErrors === 0, 'generic gate totals are not an exact empty single-stage observation');

const normalized = {
  schemaVersion: 1,
  id: `sys03-r10-high16-descending-bypass-${stage.id}-live-entity-clearance`,
  status: 'PASS',
  passed: true,
  operationSha256: stage.sha256,
  stage: { id: stage.id, forward: relative(stage.forward), operationSha256: stage.sha256, targetCount: stage.count, coordinateSetSha256: hashCells(points) },
  manifest: { path: relative(manifestPath), sha256: sha(manifestBytes), civilOnly: true, passengerServiceCommissioned: false },
  interactionCoordinateSetSha256: interaction.coordinateSetSha256,
  interactionCoordinateCount: interaction.count,
  liveEntityHits: 0,
  entityCount: 0,
  blockOrEntityMutation: false,
  readOnlyFacts: true,
  adapter: { readOnly: true, worldMutated: false, rconCalled: false },
  sourceObservation: {
    path: relative(rawPath), sha256: sha(rawBytes), schemaVersion: raw.schemaVersion,
    generatedAtUtc: raw.generatedAtUtc, temporaryForceLoadMutation: raw.temporaryForceLoadMutation,
    forceLoadStateRestored: true,
  },
  civilOnly: true,
  passengerServiceCommissioned: false,
};
fs.mkdirSync(path.dirname(absolute(outPath)), { recursive: true });
fs.writeFileSync(absolute(outPath), `${JSON.stringify(normalized, null, 2)}\n`);
console.log(JSON.stringify({ status: normalized.status, out: relative(outPath), stage: stage.id, operationSha256: stage.sha256, interactionCoordinateSetSha256: interaction.coordinateSetSha256 }, null, 2));
