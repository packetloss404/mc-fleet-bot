#!/usr/bin/env node
/**
 * Rebind an already accepted G18 terminal-map PNG to a fresh terminal shot
 * plan and matched-media evidence set.
 *
 * This is deliberately narrower than the terminal orchestrator: it never
 * renders or copies media, opens a database, imports records, contacts a live
 * service, or overwrites an existing output. The prior PASS map QA and map
 * manifest prove the supplied PNG was accepted; only a feature index and map
 * artifact manifest are emitted into one fresh append-only directory.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { loadImage } from 'canvas';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`G18 terminal-map rebinder rejected: ${flag} is required`);
  return result;
};

const GENERATED_AT = required('--generated-at');
const TERMINAL = required('--terminal-post-acceptance');
const SHOT_PLAN = required('--shot-plan');
const MEDIA = required('--matched-media-evidence');
const ACCEPTED_MAP_MANIFEST = required('--accepted-map-manifest');
const ACCEPTED_MAP_QA = required('--accepted-map-qa');
const MAP_PNG = required('--map-png');
const OUT_ROOT = required('--out-root');

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const stableHash = (record) => sha256(Buffer.from(serialize(record)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const bindingForBytes = (filename, bytes) => ({
  path: relative(filename),
  sha256: sha256(bytes),
  bytes: bytes.length,
});
const invariant = (condition, message) => {
  if (!condition) throw new Error(`G18 terminal-map rebinder rejected: ${message}`);
};
const isSha256 = (candidate) => /^[a-f0-9]{64}$/.test(candidate ?? '');
const sameSet = (left, right) => JSON.stringify([...left].sort())
  === JSON.stringify([...right].sort());

for (const filename of [TERMINAL, SHOT_PLAN, MEDIA, ACCEPTED_MAP_MANIFEST,
  ACCEPTED_MAP_QA, MAP_PNG]) {
  invariant(fs.existsSync(absolute(filename)), `input is missing: ${relative(filename)}`);
  invariant(fs.statSync(absolute(filename)).isFile(), `input is not a file: ${relative(filename)}`);
}
invariant(!fs.existsSync(absolute(OUT_ROOT)), '--out-root must be a fresh append-only path');

const terminal = readJson(TERMINAL);
const shotPlan = readJson(SHOT_PLAN);
const media = readJson(MEDIA);
const acceptedMapManifest = readJson(ACCEPTED_MAP_MANIFEST);
const acceptedMapQa = readJson(ACCEPTED_MAP_QA);
const terminalBinding = binding(TERMINAL);
const shotPlanBinding = binding(SHOT_PLAN);
const mediaBinding = binding(MEDIA);
const acceptedMapManifestBinding = binding(ACCEPTED_MAP_MANIFEST);
const acceptedMapQaBinding = binding(ACCEPTED_MAP_QA);
const mapPngBinding = binding(MAP_PNG);

const terminalCompleteSaveSha256 = terminal?.terminalCompleteSaveSha256;
invariant(terminal?.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
  && isSha256(terminalCompleteSaveSha256), 'terminal post acceptance is not PASS and hash-bound');
invariant(shotPlan?.id === 'combined-zones-r13-g18-terminal-media-shot-plan-v1'
  && Array.isArray(shotPlan.shots) && shotPlan.shots.length === 11,
'shot plan schema or exact eleven-shot census drifted');
invariant(shotPlan.terminalPostBinding?.status === 'BOUND_ACCEPTED_TERMINAL_POST'
  && shotPlan.terminalPostBinding?.acceptance?.sha256 === terminalBinding.sha256
  && shotPlan.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256,
'shot plan does not bind the supplied accepted terminal post');

const shotIds = shotPlan.shots.map(({ id }) => id);
const featureIds = shotPlan.shots.map(({ featureId }) => featureId);
invariant(new Set(shotIds).size === 11 && new Set(featureIds).size === 11,
  'shot IDs and feature IDs must each be exact and unique');
invariant(shotPlan.shots.every((shot) => (
  typeof shot.id === 'string' && typeof shot.featureId === 'string'
  && typeof shot.coverageGroup === 'string'
  && Number.isFinite(shot.camera?.x) && Number.isFinite(shot.camera?.y)
  && Number.isFinite(shot.camera?.z) && Number.isFinite(shot.target?.x)
  && Number.isFinite(shot.target?.y) && Number.isFinite(shot.target?.z)
  && shot.matchedMediaProjection?.matchedFeatureIds?.length === 1
  && shot.matchedMediaProjection.matchedFeatureIds[0] === shot.featureId
  && shot.terminalPostBinding?.terminalAcceptanceSha256 === terminalBinding.sha256
  && shot.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
)), 'a shot lacks exact coordinates, matched feature identity, or terminal binding');

invariant(media?.status === 'PASS_R13_G18_MATCHED_MEDIA_EVIDENCE'
  && media.coverageComplete === true
  && media.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
  && media.terminalAcceptance?.sha256 === terminalBinding.sha256
  && media.shotPlan?.sha256 === shotPlanBinding.sha256,
'matched-media evidence is not PASS or does not bind the supplied terminal and shot plan');
invariant(Array.isArray(media.expectedFeatureIds)
  && sameSet(media.expectedFeatureIds, featureIds),
'matched-media expected feature set differs from the shot plan');
invariant(Array.isArray(media.items) && media.items.length === 11
  && new Set(media.items.map(({ id }) => id)).size === 11
  && media.items.every((item) => (
    item.status === 'PASS' && item.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
    && item.matchedFeatureIds?.length === 1 && item.matchedFeatureIds[0] === item.featureId
    && shotPlan.shots.some((shot) => shot.id === item.id && shot.featureId === item.featureId)
  )), 'matched-media items do not provide an exact eleven-item PASS crosswalk');

invariant(acceptedMapQa?.status === 'PASS_R13_G18_TERMINAL_MAP_QA_EVIDENCE'
  && acceptedMapQa.coverageComplete === true
  && acceptedMapQa.terminalCompleteSaveSha256 === terminalCompleteSaveSha256,
'prior map QA is not PASS for the same terminal complete-save');
invariant(acceptedMapQa.mapArtifactManifest?.sha256 === acceptedMapManifestBinding.sha256
  && acceptedMapQa.mapArtifactManifest?.bytes === acceptedMapManifestBinding.bytes,
'prior map QA does not hash-bind the supplied accepted map manifest');
invariant(acceptedMapManifest?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256,
'accepted map manifest belongs to a different terminal complete-save');

const acceptedVisual = acceptedMapManifest.artifacts?.find(({ id }) => id === 'terminal-map-visual');
const acceptedQaVisual = acceptedMapQa.artifacts?.find(({ id }) => id === 'terminal-map-visual');
invariant(acceptedVisual?.format === 'PNG'
  && absolute(acceptedVisual.path) === absolute(MAP_PNG)
  && acceptedVisual.sha256 === mapPngBinding.sha256
  && acceptedVisual.bytes === mapPngBinding.bytes,
'accepted map manifest does not bind the supplied PNG exactly');
invariant(acceptedQaVisual?.format === 'PNG' && acceptedQaVisual.status === 'PASS'
  && absolute(acceptedQaVisual.path) === absolute(MAP_PNG)
  && acceptedQaVisual.sha256 === mapPngBinding.sha256
  && acceptedQaVisual.bytes === mapPngBinding.bytes,
'prior PASS map QA does not verify the supplied PNG exactly');

const mapBytes = fs.readFileSync(absolute(MAP_PNG));
invariant(mapBytes.length >= 8 && mapBytes.subarray(0, 8).equals(Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])), 'accepted visual map no longer has a PNG signature');
const mapImage = await loadImage(absolute(MAP_PNG));
invariant(mapImage.width === 2048 && mapImage.height === 2048,
  'accepted visual map must remain exactly 2048x2048');

const outputFeatureIndex = path.join(OUT_ROOT, 'terminal-map-feature-index.json');
const outputManifest = path.join(OUT_ROOT, 'map-artifact-manifest.json');
const mapIndexWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-terminal-map-feature-index-v1',
  generatedAtUtc: GENERATED_AT,
  terminalCompleteSaveSha256,
  shotPlan: shotPlanBinding,
  coverageFeatureIds: featureIds,
  features: shotPlan.shots.map((shot) => ({
    featureId: shot.featureId,
    shotId: shot.id,
    coverageGroup: shot.coverageGroup,
    camera: shot.camera,
    target: shot.target,
    matchedFeatureIds: [shot.featureId],
  })),
};
const mapIndex = {
  ...mapIndexWithoutIdentity,
  mapIndexPayloadSha256: stableHash(mapIndexWithoutIdentity),
};
const mapIndexBytes = Buffer.from(serialize(mapIndex));
const mapManifest = {
  schemaVersion: 1,
  terminalCompleteSaveSha256,
  shotPlan: shotPlanBinding,
  matchedMediaEvidence: mediaBinding,
  coverageFeatureIds: featureIds,
  artifacts: [
    { id: 'terminal-map-visual', format: 'PNG', ...mapPngBinding },
    {
      id: 'terminal-map-feature-index',
      format: 'JSON',
      ...bindingForBytes(outputFeatureIndex, mapIndexBytes),
    },
  ],
  rebindProvenance: {
    acceptedMapManifest: acceptedMapManifestBinding,
    acceptedMapQa: acceptedMapQaBinding,
    reusedVisualMap: mapPngBinding,
  },
  safetyBoundary: {
    appendOnlyFreshOutputs: true,
    visualMapCopiedOrModified: false,
    mediaCapturedOrModified: false,
    databaseOpened: false,
    databaseWrittenOrImported: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    externalPublicationPerformed: false,
  },
};
const mapManifestBytes = Buffer.from(serialize(mapManifest));

const outputRootAbsolute = absolute(OUT_ROOT);
const outputParent = path.dirname(outputRootAbsolute);
fs.mkdirSync(outputParent, { recursive: true });
const stagingRoot = fs.mkdtempSync(path.join(
  outputParent,
  `.${path.basename(outputRootAbsolute)}.tmp-`,
));
try {
  fs.writeFileSync(path.join(stagingRoot, 'terminal-map-feature-index.json'), mapIndexBytes, {
    flag: 'wx',
  });
  fs.writeFileSync(path.join(stagingRoot, 'map-artifact-manifest.json'), mapManifestBytes, {
    flag: 'wx',
  });
  invariant(!fs.existsSync(outputRootAbsolute), '--out-root appeared during generation');
  fs.renameSync(stagingRoot, outputRootAbsolute);
} catch (error) {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  throw error;
}

process.stdout.write(`${JSON.stringify({
  status: 'PASS_R13_G18_TERMINAL_MAP_ARTIFACT_REBIND',
  terminalCompleteSaveSha256,
  featureCount: featureIds.length,
  reusedMapPng: mapPngBinding,
  featureIndex: binding(outputFeatureIndex),
  mapArtifactManifest: binding(outputManifest),
  safetyBoundary: mapManifest.safetyBoundary,
}, null, 2)}\n`);
