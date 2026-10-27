#!/usr/bin/env node
/** Build terminal-map QA evidence bound to one accepted terminal post and media set. */

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
const MEDIA = value(
  '--matched-media-evidence',
  'data/world-review/combined-zones-r13-g18-terminal-evidence-current/matched-media-evidence.json',
);
const ARTIFACT_MANIFEST = value(
  '--map-artifact-manifest',
  'data/exports/combined-zones-r13-terminal-map/map-artifact-manifest.json',
);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r13-g18-terminal-evidence-current/terminal-map-qa-evidence.json',
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
const maybeBinding = (filename) => fs.existsSync(absolute(filename))
  ? { ...binding(filename), exists: true }
  : { path: relative(filename), sha256: null, bytes: null, exists: false };
const artifactSignature = (filename, format) => {
  const bytes = fs.readFileSync(absolute(filename));
  if (format === 'PNG') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]));
  if (format === 'SVG') return /<svg(?:\s|>)/.test(bytes.toString('utf8', 0, 4096));
  if (format === 'JSON') {
    try { JSON.parse(bytes.toString('utf8')); return true; } catch { return false; }
  }
  return false;
};

const shotPlan = readJson(SHOT_PLAN);
const terminal = fs.existsSync(absolute(TERMINAL)) ? readJson(TERMINAL) : null;
const media = fs.existsSync(absolute(MEDIA)) ? readJson(MEDIA) : null;
const artifactManifest = fs.existsSync(absolute(ARTIFACT_MANIFEST))
  ? readJson(ARTIFACT_MANIFEST) : null;
const shotPlanBinding = binding(SHOT_PLAN);
const terminalBinding = maybeBinding(TERMINAL);
const mediaBinding = maybeBinding(MEDIA);
const artifactManifestBinding = maybeBinding(ARTIFACT_MANIFEST);
if (shotPlan.id !== 'combined-zones-r13-g18-terminal-media-shot-plan-v1'
  || !Array.isArray(shotPlan.shots) || shotPlan.shots.length !== 11) {
  throw new Error('G18 terminal-map QA rejected: shot-plan schema or census drifted');
}
const expectedFeatureIds = shotPlan.shots.map(({ featureId }) => featureId).sort();
const terminalCompleteSaveSha256 = terminal?.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
  ? terminal.terminalCompleteSaveSha256 ?? null : null;
const terminalAccepted = /^[a-f0-9]{64}$/.test(terminalCompleteSaveSha256 ?? '');
const shotPlanBound = terminalAccepted
  && shotPlan.terminalPostBinding?.acceptance?.sha256 === terminalBinding.sha256
  && shotPlan.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256;
const mediaAccepted = media?.status === 'PASS_R13_G18_MATCHED_MEDIA_EVIDENCE'
  && media.coverageComplete === true
  && media.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
  && media.shotPlan?.sha256 === shotPlanBinding.sha256
  && JSON.stringify([...media.expectedFeatureIds].sort()) === JSON.stringify(expectedFeatureIds);
const manifestTerminalBound = artifactManifest?.terminalCompleteSaveSha256
  === terminalCompleteSaveSha256 && artifactManifest?.shotPlan?.sha256 === shotPlanBinding.sha256
  && artifactManifest?.matchedMediaEvidence?.sha256 === mediaBinding.sha256;
const manifestCoverage = Array.isArray(artifactManifest?.coverageFeatureIds)
  && JSON.stringify([...artifactManifest.coverageFeatureIds].sort())
    === JSON.stringify(expectedFeatureIds);
const artifacts = [];
const artifactFailures = [];
for (const declaration of artifactManifest?.artifacts ?? []) {
  if (!declaration?.id || !declaration?.path || !declaration?.sha256
    || !Number.isInteger(declaration?.bytes) || !['PNG', 'SVG', 'JSON'].includes(declaration.format)
    || !fs.existsSync(absolute(declaration.path))) {
    artifactFailures.push({ id: declaration?.id ?? null, reason: 'ARTIFACT_DECLARATION_OR_FILE_MISSING' });
    continue;
  }
  const observed = binding(declaration.path);
  const signaturePass = artifactSignature(declaration.path, declaration.format);
  const pass = observed.sha256 === declaration.sha256 && observed.bytes === declaration.bytes
    && signaturePass;
  artifacts.push({ id: declaration.id, format: declaration.format, ...observed, status: pass ? 'PASS' : 'WAITING' });
  if (!pass) artifactFailures.push({ id: declaration.id, reason: 'ARTIFACT_HASH_BYTES_OR_SIGNATURE_MISMATCH' });
}
const hasVisualMap = artifacts.some(({ format, status }) => (
  ['PNG', 'SVG'].includes(format) && status === 'PASS'
));
const hasMachineFeatureIndex = artifacts.some(({ format, status }) => (
  format === 'JSON' && status === 'PASS'
));
const checks = [
  { id: 'terminal-post-binding', status: terminalAccepted && shotPlanBound ? 'PASS' : 'WAITING' },
  { id: 'matched-media-crosswalk', status: mediaAccepted ? 'PASS' : 'WAITING' },
  { id: 'map-artifact-manifest-binding', status: manifestTerminalBound ? 'PASS' : 'WAITING' },
  { id: 'all-eleven-feature-ids-covered', status: manifestCoverage ? 'PASS' : 'WAITING' },
  { id: 'visual-map-and-machine-index-integrity', status: (
    artifactFailures.length === 0 && hasVisualMap && hasMachineFeatureIndex ? 'PASS' : 'WAITING'
  ) },
];
const coverageComplete = checks.every(({ status }) => status === 'PASS');
const waitingReasons = [];
if (!terminalAccepted || !shotPlanBound) waitingReasons.push('Terminal post or shot-plan terminal binding is not accepted.');
if (!mediaAccepted) waitingReasons.push('Matched-media evidence is not complete and accepted.');
if (!artifactManifest) waitingReasons.push('Terminal map artifact manifest is not supplied.');
else {
  if (!manifestTerminalBound) waitingReasons.push('Map artifact manifest does not bind the terminal, shot plan, and matched media.');
  if (!manifestCoverage) waitingReasons.push('Map artifact manifest does not cover exactly all 11 planned feature IDs.');
  if (artifactFailures.length || !hasVisualMap || !hasMachineFeatureIndex) {
    waitingReasons.push('A verified visual map plus machine-readable feature index is not complete.');
  }
}
const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-terminal-map-qa-evidence-v1',
  generatedAtUtc: GENERATED_AT,
  status: coverageComplete
    ? 'PASS_R13_G18_TERMINAL_MAP_QA_EVIDENCE'
    : 'WAITING_R13_G18_TERMINAL_MAP_QA_EVIDENCE',
  summary: { passed: coverageComplete, checkCount: checks.length,
    passCount: checks.filter(({ status }) => status === 'PASS').length },
  terminalCompleteSaveSha256,
  terminalAcceptance: terminalBinding,
  shotPlan: { ...shotPlanBinding, shotPlanPayloadSha256: shotPlan.shotPlanPayloadSha256 },
  matchedMediaEvidence: mediaBinding,
  matchedMediaEvidenceSha256: mediaBinding.sha256,
  mapArtifactManifest: artifactManifestBinding,
  expectedFeatureIds,
  expectedFeatureIdSetSha256: stableHash(expectedFeatureIds),
  checks,
  artifacts,
  coverageComplete,
  waitingReasons,
  safetyBoundary: {
    readOnly: true,
    mapGeneratedOrModified: false,
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
  passCount: report.summary.passCount,
  checkCount: checks.length,
}, null, 2)}\n`);
