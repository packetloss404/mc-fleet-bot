#!/usr/bin/env node
/** Build hash-verified matched-media evidence from the frozen terminal shot plan. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:30:00Z');
const SHOT_PLAN = value(
  '--shot-plan',
  'data/world-review/combined-zones-r13-g18-terminal-media-shot-plan-current/terminal-media-shot-plan.json',
);
const TERMINAL = value(
  '--terminal-post-acceptance',
  'data/world-review/combined-zones-r13-mvp-publication/terminal-post-acceptance.json',
);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r13-g18-terminal-evidence-current/matched-media-evidence.json',
);
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;
const stableHash = (record) => sha256(Buffer.from(serialize(record)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const rasterSignature = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]))) return 'PNG';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'JPEG';
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'WEBP';
  return null;
};

const shotPlan = readJson(SHOT_PLAN);
const terminal = fs.existsSync(absolute(TERMINAL)) ? readJson(TERMINAL) : null;
const shotPlanBinding = binding(SHOT_PLAN);
const terminalBinding = fs.existsSync(absolute(TERMINAL))
  ? { ...binding(TERMINAL), exists: true }
  : { path: relative(TERMINAL), sha256: null, bytes: null, exists: false };
if (shotPlan.id !== 'combined-zones-r13-g18-terminal-media-shot-plan-v1'
  || !Array.isArray(shotPlan.shots) || shotPlan.shots.length !== 11) {
  throw new Error('G18 matched-media evidence rejected: shot-plan schema or census drifted');
}
const terminalCompleteSaveSha256 = terminal?.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
  ? terminal.terminalCompleteSaveSha256 ?? null : null;
const terminalAccepted = /^[a-f0-9]{64}$/.test(terminalCompleteSaveSha256 ?? '');
const planTerminalBound = terminalAccepted
  && shotPlan.terminalPostBinding?.status === 'BOUND_ACCEPTED_TERMINAL_POST'
  && shotPlan.terminalPostBinding?.acceptance?.sha256 === terminalBinding.sha256
  && shotPlan.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
  && shotPlan.shots.every((shot) => (
    shot.terminalPostBinding?.terminalAcceptanceSha256 === terminalBinding.sha256
    && shot.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
  ));
const featureIds = shotPlan.shots.map(({ featureId }) => featureId);
const uniqueFeatureIds = new Set(featureIds).size === featureIds.length;
const items = [];
const waitingReasons = [];
if (!terminalAccepted) waitingReasons.push('Accepted G18 terminal post is not supplied.');
if (!planTerminalBound) waitingReasons.push('Shot plan is not regenerated and hash-bound to the accepted terminal post.');
if (!uniqueFeatureIds) waitingReasons.push('Shot-plan feature IDs are not unique.');
for (const shot of shotPlan.shots) {
  const declared = shot.expectedRaster;
  const matchedFeatureIds = shot.matchedMediaProjection?.matchedFeatureIds ?? [];
  const filename = declared?.path ? absolute(declared.path) : null;
  let observed = null;
  let signature = null;
  const reasons = [];
  if (!filename || !fs.existsSync(filename)) reasons.push('RASTER_MISSING');
  else {
    observed = binding(filename);
    signature = rasterSignature(filename);
    if (declared.sha256 !== observed.sha256 || declared.bytes !== observed.bytes
      || declared.exists !== true) reasons.push('SHOT_PLAN_RASTER_BINDING_MISMATCH');
    if (!signature) reasons.push('UNRECOGNIZED_RASTER_SIGNATURE');
  }
  if (matchedFeatureIds.length !== 1 || matchedFeatureIds[0] !== shot.featureId) {
    reasons.push('MATCHED_FEATURE_ID_MISMATCH');
  }
  if (!planTerminalBound) reasons.push('TERMINAL_POST_BINDING_MISSING');
  items.push({
    id: shot.id,
    featureId: shot.featureId,
    path: declared?.path ?? null,
    sha256: observed?.sha256 ?? null,
    bytes: observed?.bytes ?? null,
    matchedFeatureIds,
    rasterSignature: signature,
    terminalCompleteSaveSha256,
    status: reasons.length === 0 ? 'PASS' : 'WAITING',
    reasons,
  });
}
const passedItemCount = items.filter(({ status }) => status === 'PASS').length;
if (passedItemCount !== items.length) {
  waitingReasons.push(`${items.length - passedItemCount} of ${items.length} planned rasters are missing or invalid.`);
}
const coverageComplete = terminalAccepted && planTerminalBound && uniqueFeatureIds
  && passedItemCount === items.length;
const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-matched-media-evidence-v1',
  generatedAtUtc: GENERATED_AT,
  status: coverageComplete
    ? 'PASS_R13_G18_MATCHED_MEDIA_EVIDENCE'
    : 'WAITING_R13_G18_MATCHED_MEDIA_EVIDENCE',
  summary: {
    passed: coverageComplete,
    plannedItemCount: items.length,
    passedItemCount,
    waitingItemCount: items.length - passedItemCount,
  },
  terminalCompleteSaveSha256,
  terminalAcceptance: terminalBinding,
  shotPlan: {
    ...shotPlanBinding,
    shotPlanPayloadSha256: shotPlan.shotPlanPayloadSha256,
  },
  coverageComplete,
  expectedFeatureIds: featureIds,
  expectedFeatureIdSetSha256: stableHash([...featureIds].sort()),
  items,
  waitingReasons,
  safetyBoundary: {
    readOnly: true,
    mediaCapturedOrModified: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    databaseWrittenOrImported: false,
    externalPublicationPerformed: false,
  },
};
const evidencePayloadSha256 = stableHash(reportWithoutIdentity);
const report = { ...reportWithoutIdentity, evidencePayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), serialize(report));
process.stdout.write(`${JSON.stringify({
  status: report.status,
  out: relative(OUT),
  evidencePayloadSha256,
  terminalAccepted,
  passedItemCount,
  itemCount: items.length,
}, null, 2)}\n`);
