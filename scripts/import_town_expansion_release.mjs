#!/usr/bin/env node
/**
 * Guarded database closeout for the one canonical Town Expansion R1 package.
 *
 * Default mode is dry-run. A database write requires all of:
 *   --commit
 *   --expected-db-sha256 <the hash printed by the dry-run>
 *   a PASS/ACCEPTED post-release QA report with the required media gate
 *   a byte-for-byte matching immutable post snapshot
 *   a committed base transaction plus every ordered strict-noop supplement
 *   a complete object registry and exact matched media for every object
 *
 * The importer never connects to Minecraft and never mutates a world, service,
 * media artifact, release operation, or evidence report. Features, one
 * deterministic scan, and all observations are upserted inside one SQLite
 * IMMEDIATE transaction. Any exception rolls the entire logical write back.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import {
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  validateSupplementalReleaseChain,
} from './qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_ID = 'town-expansion-r1-2026-07-28';
const PACKAGE_KEY = 'town-expansion-r1';
const PROJECT_ID = 'town-expansion-r1';
const REGISTRY_ID = 'town-expansion-r1-object-media-database-crosswalk';
const MEDIA_REPORT_ID = 'town-expansion-r1-post-release-media';
const REQUIRED_QA_GATES = Object.freeze([
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
]);
const SUPPLEMENTAL_QA_GATE = 'supplemental-release-chain-bound';
const REQUIRED_TABLE_COLUMNS = Object.freeze({
  world_features: [
    'id', 'project_id', 'external_id', 'parent_id', 'world', 'name', 'kind',
    'status', 'geometry_json', 'min_x', 'max_x', 'min_z', 'max_z', 'source',
    'source_ref', 'confidence', 'completion_ratio', 'condition_score',
    'tags_json', 'attributes_json', 'observed_at', 'revision', 'created_at',
    'updated_at',
  ],
  world_scans: [
    'id', 'project_id', 'world', 'method', 'status', 'bounds_json', 'observer',
    'snapshot_ref', 'summary_json', 'error', 'started_at', 'completed_at',
  ],
  feature_observations: [
    'id', 'scan_id', 'feature_id', 'status', 'completion_ratio',
    'condition_score', 'expected_blocks', 'observed_blocks', 'details_json',
    'observed_at',
  ],
});
const NATIVE_KINDS = new Set([
  'property',
  'district',
  'building',
  'room',
  'road',
  'driveway',
  'parking',
  'sidewalk',
  'fence',
  'lighting',
  'landscape',
  'utility',
  'landmark',
  'custom',
]);
const BUILT_DISPOSITIONS = new Set([
  'verified-as-built',
  'verified-built-marker',
  'verified-retained-as-built',
]);
const PLANNED_STATES = new Set([
  'PLANNED',
  'PHASE_0',
  'RESERVATION_ONLY',
  'REQUESTED',
  'RESEARCHED',
  'DESIGNED',
  'SOURCE_MODELED',
  'GENERATED_OFFLINE',
  'PREFLIGHTED',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function normalizePath(filename) {
  return path.resolve(filename).split(path.sep).join('/');
}

function relativeRoot(filename) {
  const relative = path.relative(ROOT, filename);
  return (relative.startsWith('..') ? normalizePath(filename) : relative)
    .split(path.sep)
    .join('/');
}

function resolveRoot(filename) {
  return path.isAbsolute(filename) ? filename : path.resolve(ROOT, filename);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function resolveJsonPointer(document, pointer) {
  assert(
    typeof pointer === 'string' && pointer.startsWith('/'),
    `invalid RFC-6901 JSON pointer: ${pointer ?? '<missing>'}`,
  );
  const segments = pointer.slice(1).split('/').map((segment) =>
    segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  let value = document;
  for (const segment of segments) {
    assert(
      value != null && Object.prototype.hasOwnProperty.call(value, segment),
      `JSON pointer does not resolve: ${pointer}`,
    );
    value = value[segment];
  }
  return value;
}

function artifact(filename) {
  return {
    path: relativeRoot(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  };
}

function sameFileReference(reference, filename) {
  if (!reference || !filename) return false;
  return normalizePath(resolveRoot(reference)) === normalizePath(filename);
}

function resolveEvidenceFile(reference, anchorFile = null) {
  assert(typeof reference === 'string' && reference.trim(), 'evidence path is missing');
  if (path.isAbsolute(reference)) return reference;
  const rootCandidate = path.resolve(ROOT, reference);
  if (fs.existsSync(rootCandidate)) return rootCandidate;
  if (anchorFile) {
    const anchorCandidate = path.resolve(path.dirname(anchorFile), reference);
    if (fs.existsSync(anchorCandidate)) return anchorCandidate;
  }
  return rootCandidate;
}

function verifyArtifact(reference, filename, label) {
  assert(reference && typeof reference === 'object', `${label} artifact binding is missing`);
  assert(fs.existsSync(filename), `${label} does not exist: ${filename}`);
  assert(sameFileReference(reference.path, filename), `${label} path changed`);
  assert(reference.sha256 === sha256File(filename), `${label} SHA-256 changed`);
  if (reference.bytes != null) {
    assert(reference.bytes === fs.statSync(filename).size, `${label} byte count changed`);
  }
}

function safeJson(value, fallback) {
  try {
    return value == null || value === '' ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stableId(prefix, value) {
  return `${prefix}_${sha256(value).slice(0, 24)}`;
}

function asBounds(value, label) {
  assert(Array.isArray(value) && value.length === 6, `${label} bounds must contain six values`);
  const numbers = value.map(Number);
  assert(
    numbers.every(Number.isSafeInteger),
    `${label} bounds must contain safe integers`,
  );
  assert(
    numbers[0] <= numbers[3]
      && numbers[1] <= numbers[4]
      && numbers[2] <= numbers[5],
    `${label} bounds are not normalized`,
  );
  return numbers;
}

function featureKind(value) {
  const kind = String(value ?? '').toLowerCase();
  if (NATIVE_KINDS.has(kind)) return kind;
  if (/(room|suite|salon|office|lobby|kitchen|theater|hall interior)/.test(kind)) {
    return 'room';
  }
  if (/(road|street|route|path|corridor|tunnel|stair|bridge)/.test(kind)) {
    return 'road';
  }
  if (/(parking|garage|vehicle)/.test(kind)) return 'parking';
  if (/(garden|park|landscape|pond|lake|quay|courtyard|grounds)/.test(kind)) {
    return 'landscape';
  }
  if (/(power|utility|server|data|substation|water)/.test(kind)) return 'utility';
  if (/(district|campus|precinct|town)/.test(kind)) return 'district';
  if (/(building|house|venue|hall|pavilion|estate|bunker|warehouse)/.test(kind)) {
    return 'building';
  }
  if (/(monument|statue|landmark|tower)/.test(kind)) return 'landmark';
  return 'custom';
}

function truthForObject(object) {
  const truth = object.truth ?? object.attributes?.truth ?? null;
  assert(truth && typeof truth === 'object', `${object.objectId}: truth block is required`);
  const requestedState = String(truth.requestedState ?? '').trim();
  const sourceState = String(
    truth.sourceState ?? truth.releaseState ?? 'GENERATED_OFFLINE',
  ).toUpperCase();
  const physicalClaim = String(truth.physicalClaim ?? '').trim();
  const explicitDisposition = truth.importDisposition ?? truth.asBuiltDisposition;
  const importDisposition = explicitDisposition
    ? String(explicitDisposition).toLowerCase()
    : (
      /no completed .* (?:building|program)|only the exact physical (?:marker|wall|construction staging|reserved parcel)/i
        .test(physicalClaim)
        ? 'verified-built-marker'
        : 'verified-as-built'
    );
  const importAsBuiltKind = String(truth.importAsBuiltKind ?? object.kind ?? '').trim();
  assert(requestedState, `${object.objectId}: requestedState is required`);
  assert(sourceState, `${object.objectId}: sourceState is required`);
  assert(importAsBuiltKind, `${object.objectId}: importAsBuiltKind is required`);
  assert(
    truth.plannedOnly === false,
    `${object.objectId}: planned-only or unbuilt objects cannot be imported`,
  );
  assert(
    BUILT_DISPOSITIONS.has(importDisposition),
    `${object.objectId}: unsupported import disposition ${importDisposition || '<missing>'}`,
  );
  assert(physicalClaim, `${object.objectId}: physicalClaim is required`);
  assert(
    truth.finalCertificationRequired === 'VERIFIED_POST_STATE',
    `${object.objectId}: final certification must require VERIFIED_POST_STATE`,
  );

  const explicitStates = [
    object.status,
    object.buildStatus,
    object.attributes?.status,
    object.attributes?.buildStatus,
    object.attributes?.implementationState,
  ].filter((value) => value != null).map((value) => String(value).toUpperCase());
  const plannedState = explicitStates.find((state) => PLANNED_STATES.has(state));
  if (plannedState) {
    assert(
      importDisposition === 'verified-built-marker',
      `${object.objectId}: ${plannedState} may only import its physically built marker`,
    );
    assert(
      truth.futureProgramState
        && PLANNED_STATES.has(String(truth.futureProgramState).toUpperCase()),
      `${object.objectId}: a built marker must preserve its future program state`,
    );
  }
  return {
    requestedState,
    sourceState,
    importDisposition,
    plannedOnly: false,
    physicalClaim,
    importAsBuiltKind,
    futureProgramState: truth.futureProgramState ?? null,
    futureProgramClaim: truth.futureProgramClaim ?? null,
  };
}

function cameraSignature(capture) {
  const camera = {
    mode: capture.camera?.mode ?? capture.mode ?? null,
    eye: capture.camera?.eye ?? capture.eye ?? null,
    lookAt: capture.camera?.lookAt ?? capture.lookAt ?? null,
    fov:
      capture.camera?.fieldOfView
      ?? capture.camera?.fov
      ?? capture.fieldOfView
      ?? capture.fov
      ?? null,
    center: capture.camera?.center ?? capture.center ?? null,
    span: capture.camera?.span ?? capture.span ?? null,
    width: capture.width ?? null,
    height: capture.height ?? null,
  };
  assert(
    camera.mode === 'persp' || camera.mode === 'map',
    `${capture.id}: capture mode is missing or invalid`,
  );
  if (camera.mode === 'persp') {
    assert(
      Array.isArray(camera.eye)
        && camera.eye.length === 3
        && camera.eye.every(Number.isFinite)
        && Array.isArray(camera.lookAt)
        && camera.lookAt.length === 3
        && camera.lookAt.every(Number.isFinite)
        && Number.isFinite(camera.fov),
      `${capture.id}: perspective camera geometry is incomplete`,
    );
  } else {
    assert(
      Array.isArray(camera.center)
        && camera.center.length === 2
        && camera.center.every(Number.isFinite)
        && Number.isFinite(camera.span),
      `${capture.id}: map camera geometry is incomplete`,
    );
  }
  return sha256(JSON.stringify(camera));
}

function mediaSnapshot(media) {
  return media.postSnapshot ?? media.snapshot ?? media.sourceSnapshot ?? null;
}

function mediaRelease(media) {
  return media.releasePackage ?? media.package ?? {};
}

function mediaCrosswalk(media) {
  return media.crosswalk ?? media.objectCrosswalk ?? {};
}

function mediaCaptures(media) {
  const captures = media.captures ?? media.captureReport?.captures;
  return Array.isArray(captures) ? captures : [];
}

function mediaOutputPath(capture, mediaReportPath, media) {
  const reference = capture.output ?? capture.path ?? capture.file;
  const rootCandidate = resolveEvidenceFile(reference, mediaReportPath);
  if (fs.existsSync(rootCandidate)) return rootCandidate;
  const rendererReference = media.rendererReport?.path;
  if (rendererReference) {
    const rendererPath = resolveEvidenceFile(rendererReference, mediaReportPath);
    const rendererCandidate = path.resolve(path.dirname(rendererPath), reference);
    if (fs.existsSync(rendererCandidate)) return rendererCandidate;
  }
  return rootCandidate;
}

export function validateTownExpansionRegistry(registry) {
  assert(registry.schemaVersion === 2, 'registry schemaVersion must be 2');
  assert(registry.id === REGISTRY_ID, `unexpected registry id ${registry.id}`);
  assert(registry.packageId === PACKAGE_ID, `unexpected registry package ${registry.packageId}`);
  assert(Array.isArray(registry.objects) && registry.objects.length > 0, 'registry has no objects');
  assert(
    registry.counts?.exactObjects === registry.objects.length,
    'registry exact object count does not match its object array',
  );
  assert(Array.isArray(registry.mapShots), 'registry mapShots are required');

  const objectIds = new Set();
  const captureIds = new Set();
  const shotIds = new Set();
  const objects = registry.objects.map((object) => {
    assert(
      typeof object.objectId === 'string' && object.objectId.trim(),
      'registry object ID is missing',
    );
    assert(!objectIds.has(object.objectId), `duplicate registry object ${object.objectId}`);
    assert(
      !/^(whole-world-overview|district-)/i.test(object.objectId),
      `map-only ID cannot be imported as a feature: ${object.objectId}`,
    );
    objectIds.add(object.objectId);
    assert(
      object.database?.lookupKey?.externalId === object.objectId
        && object.database?.fabricatedRelationship === false,
      `${object.objectId}: database lookup is not exact or is fabricated`,
    );
    assert(
      typeof object.name === 'string' && object.name.trim(),
      `${object.objectId}: name is required`,
    );
    const bounds = asBounds(object.bounds, object.objectId);
    assert(
      Array.isArray(object.familyIds) && object.familyIds.length > 0,
      `${object.objectId}: at least one family is required`,
    );
    assert(
      typeof object.sourceScope === 'string' && object.sourceScope.trim(),
      `${object.objectId}: sourceScope is required`,
    );
    assert(Array.isArray(object.roles), `${object.objectId}: roles must be an array`);
    assert(
      object.attributes
        && typeof object.attributes === 'object'
        && !Array.isArray(object.attributes),
      `${object.objectId}: attributes must be an object`,
    );
    assert(
      object.targetCells == null
        || (Number.isSafeInteger(object.targetCells) && object.targetCells >= 0),
      `${object.objectId}: targetCells must be a non-negative integer or null`,
    );
    assert(
      object.provenance
        && typeof object.provenance.file === 'string'
        && typeof object.provenance.jsonPointer === 'string',
      `${object.objectId}: exact provenance is required`,
    );
    assert(
      Array.isArray(object.shotIds) && object.shotIds.length > 0,
      `${object.objectId}: at least one evidence shot is required`,
    );
    assert(
      Array.isArray(object.capturePairs)
        && object.capturePairs.length === object.shotIds.length,
      `${object.objectId}: every shot must have one capture pair`,
    );
    const localShots = new Set();
    for (const pair of object.capturePairs) {
      assert(
        object.shotIds.includes(pair.shotId) && !localShots.has(pair.shotId),
        `${object.objectId}: invalid or duplicate capture-pair shot ${pair.shotId}`,
      );
      assert(
        !shotIds.has(pair.shotId),
        `${object.objectId}: shot is already assigned to another object: ${pair.shotId}`,
      );
      localShots.add(pair.shotId);
      assert(
        typeof pair.pass1CameraId === 'string'
          && typeof pair.pass2CameraId === 'string'
          && pair.pass1CameraId !== pair.pass2CameraId,
        `${object.objectId}/${pair.shotId}: distinct pass camera IDs are required`,
      );
      for (const captureId of [pair.pass1CameraId, pair.pass2CameraId]) {
        assert(!captureIds.has(captureId), `duplicate registry capture ID ${captureId}`);
        captureIds.add(captureId);
      }
      shotIds.add(pair.shotId);
    }
    const parentExternalId = object.attributes?.parentExternalId ?? null;
    assert(
      parentExternalId == null
        || (typeof parentExternalId === 'string' && parentExternalId !== object.objectId),
      `${object.objectId}: invalid parentExternalId`,
    );
    return {
      ...object,
      bounds,
      parentExternalId,
      truth: truthForObject(object),
    };
  });

  const mapPairs = [];
  for (const mapShot of registry.mapShots) {
    assert(
      typeof mapShot.shotId === 'string' && !shotIds.has(mapShot.shotId),
      `duplicate or missing map shot ${mapShot.shotId}`,
    );
    shotIds.add(mapShot.shotId);
    assert(
      Array.isArray(mapShot.objectIds)
        && mapShot.objectIds.length > 0
        && mapShot.objectIds.every((objectId) => objectIds.has(objectId)),
      `${mapShot.shotId}: map object IDs must resolve to exact registry objects`,
    );
    const pass1CameraId = `${mapShot.shotId}-PASS-1`;
    const pass2CameraId = `${mapShot.shotId}-PASS-2`;
    for (const captureId of [pass1CameraId, pass2CameraId]) {
      assert(!captureIds.has(captureId), `duplicate map capture ID ${captureId}`);
      captureIds.add(captureId);
    }
    mapPairs.push({
      shotId: mapShot.shotId,
      primaryFeatureId: mapShot.primaryFeatureId,
      pass1CameraId,
      pass2CameraId,
    });
  }
  assert(registry.counts?.shots === shotIds.size, 'registry shot count changed');
  assert(registry.counts?.maps === mapPairs.length, 'registry map count changed');
  assert(
    registry.counts?.pass1Captures === captureIds.size / 2
      && registry.counts?.pass2Captures === captureIds.size / 2
      && registry.counts?.combinedCaptures === captureIds.size,
    'registry capture counts changed',
  );

  for (const object of objects) {
    if (object.parentExternalId && !objectIds.has(object.parentExternalId)) {
      // A parent outside this release is allowed, but it must be resolved
      // uniquely from the database during preflight. No relationship is
      // inferred from names, bounds, or filenames.
      object.externalParentRequired = true;
    }
  }
  return {
    objects,
    objectIds,
    expectedCaptureIds: captureIds,
    mapPairs,
  };
}

function validateMedia({
  media,
  mediaReportPath,
  registry,
  registryPath,
  registryContract,
  postSnapshot,
  postRegions,
  forwardArtifact,
}) {
  assert(media.schemaVersion === 2, 'media report schemaVersion must be 2');
  assert(media.id === MEDIA_REPORT_ID, `unexpected media report id ${media.id}`);
  assert(media.packageId === PACKAGE_ID, 'media report package changed');
  assert(
    media.status === 'PASS'
      && media.passed === true
      && media.finality === 'ACCEPTED_POST_RELEASE_MEDIA'
      && media.validation?.passed === true
      && (media.validation?.failures ?? []).length === 0
      && media.fileChecks?.failed === 0,
    'media report is not exact accepted PASS evidence',
  );
  const snapshot = mediaSnapshot(media);
  assert(snapshot?.sha256 === postSnapshot.sha256, 'media report post snapshot hash changed');
  assert(sameFileReference(snapshot.path ?? snapshot.directory, postRegions), 'media post path changed');
  const release = mediaRelease(media);
  const mediaForwardSha256 = media.forwardSha256
    ?? media.packageHashes?.[PACKAGE_KEY]?.sha256
    ?? release.forwardSha256;
  assert(
    mediaForwardSha256 === forwardArtifact.sha256,
    'media report is not bound to the exact forward package',
  );
  if (release.forwardPath) {
    assert(sameFileReference(release.forwardPath, forwardArtifact.filename), 'media forward path changed');
  }
  const crosswalk = mediaCrosswalk(media);
  assert(
    sameFileReference(crosswalk.path, registryPath)
      && crosswalk.sha256 === sha256File(registryPath),
    'media report is not bound to the exact registry',
  );

  const captures = mediaCaptures(media);
  assert(captures.length > 0, 'media report contains no captures');
  const byId = new Map();
  for (const capture of captures) {
    assert(typeof capture.id === 'string' && capture.id, 'media capture ID is missing');
    assert(!byId.has(capture.id), `duplicate media capture ${capture.id}`);
    assert(
      registryContract.expectedCaptureIds.has(capture.id),
      `orphan media capture is not declared by the registry: ${capture.id}`,
    );
    assert(capture.passed === true, `${capture.id}: media capture did not pass`);
    assert(
      Number.isSafeInteger(capture.width)
        && capture.width > 0
        && Number.isSafeInteger(capture.height)
        && capture.height > 0,
      `${capture.id}: exact image dimensions are required`,
    );
    assert(
      typeof (capture.viewClass ?? capture.role) === 'string'
        && String(capture.viewClass ?? capture.role).trim(),
      `${capture.id}: view class/role is required`,
    );
    const output = mediaOutputPath(capture, mediaReportPath, media);
    assert(fs.existsSync(output), `${capture.id}: media output is missing: ${output}`);
    assert(fs.statSync(output).size > 1_000, `${capture.id}: media output is undersized`);
    assert(
      capture.sha256 === sha256File(output),
      `${capture.id}: media output SHA-256 changed`,
    );
    if (capture.bytes != null) {
      assert(capture.bytes === fs.statSync(output).size, `${capture.id}: media bytes changed`);
    }
    byId.set(capture.id, {
      ...capture,
      output: relativeRoot(output),
      bytes: fs.statSync(output).size,
      cameraSignature: cameraSignature(capture),
    });
  }
  assert(
    byId.size === registryContract.expectedCaptureIds.size,
    `media capture cardinality differs: ${byId.size}/${registryContract.expectedCaptureIds.size}`,
  );

  const mediaByObject = new Map();
  for (const object of registryContract.objects) {
    const objectCaptures = [];
    for (const pair of object.capturePairs) {
      const pass1 = byId.get(pair.pass1CameraId);
      const pass2 = byId.get(pair.pass2CameraId);
      assert(pass1 && pass2, `${object.objectId}/${pair.shotId}: capture pair is incomplete`);
      for (const [pass, capture] of [[1, pass1], [2, pass2]]) {
        assert(
          capture.shotId === pair.shotId
            && capture.primaryFeatureId === object.objectId
            && Number(capture.evidencePass) === pass,
          `${capture.id}: object/shot/evidence-pass binding changed`,
        );
      }
      assert(
        pass1.cameraSignature === pass2.cameraSignature,
        `${object.objectId}/${pair.shotId}: camera geometry is not matched`,
      );
      assert(
        pass1.output !== pass2.output,
        `${object.objectId}/${pair.shotId}: paired evidence must use distinct files`,
      );
      objectCaptures.push(pass1, pass2);
    }
    mediaByObject.set(object.objectId, objectCaptures);
  }

  for (const pair of registryContract.mapPairs) {
    const pass1 = byId.get(pair.pass1CameraId);
    const pass2 = byId.get(pair.pass2CameraId);
    assert(pass1 && pass2, `${pair.shotId}: map capture pair is incomplete`);
    assert(
      pass1.shotId === pair.shotId
        && pass2.shotId === pair.shotId
        && pass1.primaryFeatureId === pair.primaryFeatureId
        && pass2.primaryFeatureId === pair.primaryFeatureId
        && Number(pass1.evidencePass) === 1
        && Number(pass2.evidencePass) === 2
        && pass1.cameraSignature === pass2.cameraSignature
        && pass1.output !== pass2.output,
      `${pair.shotId}: map pair binding changed`,
    );
  }

  return {
    captures: [...byId.values()],
    byId,
    mediaByObject,
    artifact: artifact(mediaReportPath),
  };
}

function validateQa({
  qa,
  qaPath,
  postRegions,
  postSnapshot,
  registry,
  registryPath,
  mediaReportPath,
  designReportPath,
  forwardPath,
  transactionPath,
  supplementalTransactionPaths,
}) {
  const hasSupplements = supplementalTransactionPaths.length > 0;
  assert(
    (qa.schemaVersion === 1 || qa.schemaVersion === 2)
      && qa.id === 'town-expansion-r1-post-release-qa'
      && qa.packageId === PACKAGE_ID,
    'post-release QA identity/schema changed',
  );
  assert(
    hasSupplements ? qa.schemaVersion === 2 : true,
    'supplemental transactions require schema-v2 post-release QA',
  );
  assert(
    qa.status === 'PASS'
      && qa.passed === true
      && qa.readOnly === true
      && qa.databaseMutated === false
      && qa.decision?.release === 'ACCEPTED',
    'post-release QA is not PASS/ACCEPTED read-only evidence',
  );
  const gates = new Map((qa.gates ?? []).map((gate) => [gate.id, gate]));
  for (const gateId of REQUIRED_QA_GATES) {
    assert(gates.get(gateId)?.passed === true, `required QA gate failed or missing: ${gateId}`);
  }
  if (hasSupplements || (qa.releaseIdentity?.supplements ?? []).length > 0) {
    assert(
      gates.get(SUPPLEMENTAL_QA_GATE)?.passed === true,
      `required QA gate failed or missing: ${SUPPLEMENTAL_QA_GATE}`,
    );
  }
  assert(
    (qa.gates ?? []).every((gate) => gate.passed === true),
    'post-release QA contains a failed gate',
  );
  const sourceEquivalenceGate = gates.get(
    'base-source-state-equivalence-bound',
  );
  const sourceEquivalenceArtifact =
    qa.artifacts?.sourceEquivalencePreflight ?? null;
  const sourceEquivalencePreflightPath = sourceEquivalenceArtifact
    ? resolveEvidenceFile(sourceEquivalenceArtifact.path, qaPath)
    : null;
  if (sourceEquivalencePreflightPath) {
    verifyArtifact(
      sourceEquivalenceArtifact,
      sourceEquivalencePreflightPath,
      'QA base source-equivalence preflight',
    );
  }
  assert(
    qa.snapshots?.post?.sha256 === postSnapshot.sha256
      && sameFileReference(qa.snapshots.post.path, postRegions),
    'QA post snapshot does not match supplied immutable post regions',
  );
  const registryPreSnapshotMatched = (
    qa.snapshots?.pre?.sha256 === registry.prereleaseSnapshot?.sha256
  );
  const sourceEquivalenceBridgesRegistry = Boolean(
    sourceEquivalencePreflightPath
    && sourceEquivalenceGate?.details?.required === true
    && sourceEquivalenceGate?.details?.supplied === true
    && sourceEquivalenceGate?.details?.proofPassed === true
    && sourceEquivalenceGate?.details?.transactionPreSha256
      === qa.snapshots?.pre?.sha256
    && sourceEquivalenceGate?.details?.designPreSha256
      === registry.prereleaseSnapshot?.sha256
    && sourceEquivalenceGate?.details?.manifestPreSha256
      === registry.prereleaseSnapshot?.sha256
  );
  assert(
    (registryPreSnapshotMatched || sourceEquivalenceBridgesRegistry)
      && qa.snapshots.pre.sha256 !== qa.snapshots.post.sha256,
    'QA pre snapshot is not registry-identical or equivalence-bound, or is not distinct',
  );
  verifyArtifact(qa.artifacts?.designReport, designReportPath, 'QA design report');
  verifyArtifact(qa.artifacts?.forward, forwardPath, 'QA forward package');
  const rollbackPath = resolveEvidenceFile(
    qa.artifacts?.rollback?.path,
    qaPath,
  );
  verifyArtifact(qa.artifacts?.rollback, rollbackPath, 'QA rollback package');
  verifyArtifact(qa.artifacts?.transaction, transactionPath, 'QA transaction');
  verifyArtifact(qa.artifacts?.mediaReport, mediaReportPath, 'QA media report');
  const transitionPolicyPath = resolveEvidenceFile(
    qa.artifacts?.naturalStateTransitionPolicy?.path,
    qaPath,
  );
  const rollbackPreflightPath = resolveEvidenceFile(
    qa.artifacts?.rollbackPoststatePreflight?.path,
    qaPath,
  );
  verifyArtifact(
    qa.artifacts?.naturalStateTransitionPolicy,
    transitionPolicyPath,
    'QA natural-state-transition policy',
  );
  verifyArtifact(
    qa.artifacts?.rollbackPoststatePreflight,
    rollbackPreflightPath,
    'QA policy-aware rollback preflight',
  );
  const releaseIdentity = qa.releaseIdentity ?? null;
  if (hasSupplements || (releaseIdentity?.supplements ?? []).length > 0) {
    assert(
      releaseIdentity?.schemaVersion === 1
        && releaseIdentity.packageId === PACKAGE_ID
        && typeof releaseIdentity.sha256 === 'string',
      'QA consolidated release identity is missing or malformed',
    );
    const { sha256: reportedIdentitySha256, ...identityWithoutSha256 } =
      releaseIdentity;
    assert(
      reportedIdentitySha256
        === sha256(JSON.stringify(identityWithoutSha256)),
      'QA consolidated release identity SHA-256 changed',
    );
    assert(
      releaseIdentity.supplements.length
        === supplementalTransactionPaths.length,
      'QA supplemental transaction cardinality changed',
    );
    verifyArtifact(
      releaseIdentity.base?.transaction,
      transactionPath,
      'QA release identity base transaction',
    );
    verifyArtifact(
      releaseIdentity.base?.forward,
      forwardPath,
      'QA release identity base forward',
    );
    verifyArtifact(
      releaseIdentity.base?.rollback,
      rollbackPath,
      'QA release identity base rollback',
    );
    verifyArtifact(
      releaseIdentity.base?.naturalStateTransitionPolicy,
      transitionPolicyPath,
      'QA release identity base natural-state-transition policy',
    );
    verifyArtifact(
      releaseIdentity.base?.rollbackPoststatePreflight,
      rollbackPreflightPath,
      'QA release identity base rollback preflight',
    );
    if (sourceEquivalencePreflightPath) {
      verifyArtifact(
        releaseIdentity.base?.sourceEquivalencePreflight,
        sourceEquivalencePreflightPath,
        'QA release identity base source-equivalence preflight',
      );
    } else {
      assert(
        releaseIdentity.base?.sourceEquivalencePreflight == null,
        'QA release identity unexpectedly binds a source-equivalence preflight',
      );
    }
    assert(
      releaseIdentity.terminalPostSnapshot?.sha256 === postSnapshot.sha256
        && sameFileReference(
          releaseIdentity.terminalPostSnapshot?.path,
          postRegions,
        ),
      'QA release identity terminal snapshot changed',
    );
    const basePost = releaseIdentity.base?.acceptedPostSnapshot;
    assert(
      basePost?.sha256
        && sameFileReference(basePost.path, resolveRoot(basePost.path)),
      'QA release identity base accepted post snapshot is missing',
    );
    const supplementalChain = validateSupplementalReleaseChain({
      transactionPaths: supplementalTransactionPaths,
      basePostRegions: resolveRoot(basePost.path),
      basePostSha256: basePost.sha256,
      finalPostRegions: postRegions,
      finalPostSha256: postSnapshot.sha256,
    });
    assert(
      supplementalChain.passed,
      `supplemental release chain failed: ${
        supplementalChain.failures.map((entry) => entry.reason).join(', ')
      }`,
    );
    for (const [index, supplemental] of supplementalChain.supplements.entries()) {
      const bound = releaseIdentity.supplements[index];
      assert(
        bound?.key === supplemental.key
          && bound.operationCount === supplemental.operationCount
          && bound.sourceSnapshot?.sha256
            === supplemental.sourceSnapshot.sha256
          && sameFileReference(
            bound.sourceSnapshot?.path,
            resolveRoot(supplemental.sourceSnapshot.path),
          )
          && bound.postSnapshot?.sha256 === supplemental.postSnapshot.sha256
          && sameFileReference(
            bound.postSnapshot?.path,
            resolveRoot(supplemental.postSnapshot.path),
        ),
        `QA supplemental release identity changed at index ${index}`,
      );
      if (supplemental.kind === 'committed-atomic-supplemental-group') {
        assert(
          bound.kind === supplemental.kind
            && bound.packageCount === supplemental.packageCount
            && bound.packages?.length === supplemental.packages.length,
          `QA supplemental atomic group changed at index ${index}`,
        );
        for (const [label, artifactKey, filename] of [
          ['transaction', 'transaction', supplementalTransactionPaths[index]],
          [
            'atomic transaction',
            'atomicTransaction',
            resolveRoot(supplemental.atomicTransaction.path),
          ],
          [
            'provenance bridge',
            'provenanceBridge',
            resolveRoot(supplemental.provenanceBridge.path),
          ],
          [
            'release manifest',
            'releaseManifest',
            resolveRoot(supplemental.releaseManifest.path),
          ],
          [
            'live entity gate',
            'liveEntityGate',
            resolveRoot(supplemental.liveEntityGate.path),
          ],
        ]) {
          verifyArtifact(
            bound?.[artifactKey],
            filename,
            `QA supplemental ${index + 1} ${label}`,
          );
        }
        for (const [packageIndex, packageEvidence] of
          supplemental.packages.entries()) {
          const boundPackage = bound.packages[packageIndex];
          assert(
            boundPackage?.key === packageEvidence.key
              && boundPackage.operationCount === packageEvidence.operationCount,
            `QA supplemental ${index + 1} package ${packageIndex + 1} changed`,
          );
          for (const [label, artifactKey, filename] of [
            ['forward', 'forward', resolveRoot(packageEvidence.forward.path)],
            ['rollback', 'rollback', resolveRoot(packageEvidence.rollback.path)],
            [
              'logical source preflight',
              'logicalSourcePreflight',
              resolveRoot(packageEvidence.logicalSourcePreflight.path),
            ],
            [
              'physical source preflight',
              'sourcePreflight',
              resolveRoot(packageEvidence.sourcePreflight.path),
            ],
            [
              'execution',
              'execution',
              resolveRoot(packageEvidence.execution.path),
            ],
            [
              'rollback poststate preflight',
              'rollbackPoststatePreflight',
              resolveRoot(packageEvidence.rollbackPoststatePreflight.path),
            ],
          ]) {
            verifyArtifact(
              boundPackage?.[artifactKey],
              filename,
              `QA supplemental ${index + 1} package ${
                packageIndex + 1
              } ${label}`,
            );
          }
        }
        continue;
      }
      for (const [label, artifactKey, filename] of [
        ['transaction', 'transaction', supplementalTransactionPaths[index]],
        ['forward', 'forward', resolveRoot(supplemental.forward.path)],
        ['rollback', 'rollback', resolveRoot(supplemental.rollback.path)],
        ['execution', 'execution', resolveRoot(supplemental.execution.path)],
        [
          'source preflight',
          'sourcePreflight',
          resolveRoot(supplemental.sourcePreflight.path),
        ],
        [
          'live entity gate',
          'liveEntityGate',
          resolveRoot(supplemental.liveEntityGate.path),
        ],
        [
          'rollback poststate preflight',
          'rollbackPoststatePreflight',
          resolveRoot(supplemental.rollbackPoststatePreflight.path),
        ],
      ]) {
        verifyArtifact(
          bound?.[artifactKey],
          filename,
          `QA supplemental ${index + 1} ${label}`,
        );
      }
    }
  } else {
    assert(
      (releaseIdentity?.supplements ?? []).length === 0,
      'supplemental transactions were omitted from import inputs',
    );
  }
  assert(
    registry.sourceReport?.sha256 === sha256File(designReportPath)
      && sameFileReference(registry.sourceReport?.path, designReportPath),
    'registry source report changed',
  );
  assert(
    registry.releasePackage?.forwardSha256 === sha256File(forwardPath)
      && sameFileReference(registry.releasePackage?.forwardPath, forwardPath),
    'registry forward package changed',
  );
  return {
    artifact: artifact(qaPath),
    gates: REQUIRED_QA_GATES,
    forwardArtifact: {
      ...artifact(forwardPath),
      filename: forwardPath,
    },
    rollbackArtifact: qa.artifacts?.rollback ?? null,
    releaseIdentity,
    basePostSnapshot:
      releaseIdentity?.base?.acceptedPostSnapshot
      ?? qa.snapshots?.post,
  };
}

function validateTransaction({
  transaction,
  transactionPath,
  qa,
  postRegions,
  postSnapshot,
  forwardArtifact,
  basePostSnapshot,
  hasSupplements,
}) {
  const packages = transaction.packages ?? [];
  const entry = packages.find((candidate) => candidate.key === PACKAGE_KEY)
    ?? (packages.length === 1 ? packages[0] : null);
  const execution = entry?.execution ?? {};
  assert(
    ['committed', 'committed-pending-post-qa'].includes(
      String(transaction.status ?? '').toLowerCase(),
    ),
    'transaction is not committed',
  );
  assert(
    packages.length === 1
      && entry?.key === PACKAGE_KEY
      && entry.status === 'committed'
      && entry.forwardSha256 === forwardArtifact.sha256
      && entry.rollbackSha256 === qa.artifacts?.rollback?.sha256
      && execution.status === 'complete'
      && execution.strictNoop === true
      && execution.failedGroups === 0
      && execution.failedCommands === 0
      && execution.operationSha256 === forwardArtifact.sha256,
    'transaction package is not the exact successful one-package release',
  );
  assert(
    (transaction.events ?? []).some((event) => event.event === 'transaction-committed'),
    'transaction commit event is missing',
  );
  const postReference = transaction.postReleaseRegions
    ?? transaction.postSnapshot?.directory
    ?? transaction.postSnapshot?.path;
  const postHash = transaction.postSnapshot?.sha256
    ?? transaction.postReleaseSnapshotSha256
    ?? null;
  const expectedPostReference = hasSupplements
    ? resolveRoot(basePostSnapshot.path)
    : postRegions;
  const expectedPostSha256 = hasSupplements
    ? basePostSnapshot.sha256
    : postSnapshot.sha256;
  assert(
    hasSupplements
      ? (!postReference
        || sameFileReference(postReference, expectedPostReference))
      : (postReference && sameFileReference(postReference, expectedPostReference)),
    hasSupplements
      ? 'base transaction post snapshot conflicts with the consolidated release chain'
      : 'transaction is not bound to the supplied post snapshot directory',
  );
  if (postHash) {
    assert(postHash === expectedPostSha256, 'transaction post snapshot hash changed');
  }
  return artifact(transactionPath);
}

export function validateTownExpansionEvidence({
  registryPath,
  qaPath,
  postRegions,
  transactionPath,
  supplementalTransactionPaths = [],
  mediaReportPath,
}) {
  for (const [label, filename] of Object.entries({
    registry: registryPath,
    qa: qaPath,
    postRegions,
    transaction: transactionPath,
    mediaReport: mediaReportPath,
  })) {
    assert(filename && fs.existsSync(filename), `${label} input does not exist: ${filename}`);
  }
  for (const [index, filename] of supplementalTransactionPaths.entries()) {
    assert(
      filename && fs.existsSync(filename),
      `supplemental transaction ${index + 1} does not exist: ${filename}`,
    );
  }
  const registry = readJson(registryPath);
  const qa = readJson(qaPath);
  const transaction = readJson(transactionPath);
  const media = readJson(mediaReportPath);
  const postSnapshot = hashSnapshotDirectory(postRegions);
  const designReportPath = resolveEvidenceFile(registry.sourceReport?.path, registryPath);
  const forwardPath = resolveEvidenceFile(registry.releasePackage?.forwardPath, registryPath);
  const registryContract = validateTownExpansionRegistry(registry);
  const designReport = readJson(designReportPath);
  for (const object of registryContract.objects) {
    assert(
      sameFileReference(object.provenance.file, designReportPath),
      `${object.objectId}: provenance is not bound to the exact generator report`,
    );
    const source = resolveJsonPointer(designReport, object.provenance.jsonPointer);
    assert(
      source && typeof source === 'object' && !Array.isArray(source),
      `${object.objectId}: provenance pointer does not identify one source record`,
    );
    const sourceIds = [
      source.objectId,
      source.externalId,
      source.scope,
      source.id,
    ].filter((value) => typeof value === 'string');
    assert(
      sourceIds.includes(object.objectId),
      `${object.objectId}: provenance source record identity changed`,
    );
  }
  const qaEvidence = validateQa({
    qa,
    qaPath,
    postRegions,
    postSnapshot,
    registry,
    registryPath,
    mediaReportPath,
    designReportPath,
    forwardPath,
    transactionPath,
    supplementalTransactionPaths,
  });
  const transactionArtifact = validateTransaction({
    transaction,
    transactionPath,
    qa,
    postRegions,
    postSnapshot,
    forwardArtifact: qaEvidence.forwardArtifact,
    basePostSnapshot: qaEvidence.basePostSnapshot,
    hasSupplements: supplementalTransactionPaths.length > 0,
  });
  const mediaEvidence = validateMedia({
    media,
    mediaReportPath,
    registry,
    registryPath,
    registryContract,
    postSnapshot,
    postRegions,
    forwardArtifact: qaEvidence.forwardArtifact,
  });
  const registryArtifact = artifact(registryPath);
  const mediaReportArtifact = mediaEvidence.artifact;
  const postSnapshotArtifact = {
    path: relativeRoot(postRegions),
    sha256: postSnapshot.sha256,
    regionFileCount: postSnapshot.regionFileCount,
    bytes: postSnapshot.members.reduce((sum, member) => sum + member.bytes, 0),
  };
  return {
    packageId: PACKAGE_ID,
    projectId: PROJECT_ID,
    registry,
    registryContract,
    qa,
    transaction,
    media,
    postSnapshot,
    postRegions,
    registryPath,
    qaPath,
    transactionPath,
    supplementalTransactionPaths,
    mediaReportPath,
    designReportPath,
    forwardPath,
    evidence: {
      registry: registryArtifact,
      postReleaseQa: qaEvidence.artifact,
      transaction: transactionArtifact,
      supplementalTransactions:
        qaEvidence.releaseIdentity?.supplements?.map(
          (entry) => entry.transaction,
        ) ?? [],
      releaseIdentitySha256:
        qaEvidence.releaseIdentity?.sha256 ?? null,
      mediaReport: mediaReportArtifact,
      designReport: artifact(designReportPath),
      forwardPackage: artifact(forwardPath),
      postSnapshot: postSnapshotArtifact,
      postSnapshotSha256: postSnapshot.sha256,
      forwardSha256: qaEvidence.forwardArtifact.sha256,
      crosswalkSha256: registryArtifact.sha256,
      mediaQaSha256: mediaReportArtifact.sha256,
      postReleaseQaSha256: qaEvidence.artifact.sha256,
      transactionSha256: transactionArtifact.sha256,
    },
    mediaEvidence,
  };
}

function databaseCounts(database) {
  return {
    worldFeatures: database.prepare('SELECT COUNT(*) AS count FROM world_features').get().count,
    worldScans: database.prepare('SELECT COUNT(*) AS count FROM world_scans').get().count,
    featureObservations: database
      .prepare('SELECT COUNT(*) AS count FROM feature_observations')
      .get().count,
  };
}

function assertDatabaseSchema(database) {
  for (const [table, expectedColumns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
    const columns = database.pragma(`table_info(${table})`).map((column) => column.name);
    assert(columns.length > 0, `required table is missing: ${table}`);
    const missing = expectedColumns.filter((column) => !columns.includes(column));
    assert(missing.length === 0, `${table} is missing columns: ${missing.join(', ')}`);
  }
}

function databasePreflight(database, evidence) {
  assertDatabaseSchema(database);
  const integrity = database.pragma('integrity_check', { simple: true });
  const foreignKeys = database.pragma('foreign_key_check');
  assert(integrity === 'ok', `database integrity failed: ${integrity}`);
  assert(foreignKeys.length === 0, 'database has foreign-key violations');
  const existing = new Map();
  const statement = database.prepare(`
    SELECT id, project_id, external_id, parent_id, name, kind, status,
           attributes_json, tags_json, revision
    FROM world_features
    WHERE project_id = ? AND external_id = ?
  `);
  for (const object of evidence.registryContract.objects) {
    const row = statement.get(PROJECT_ID, object.objectId);
    if (row) existing.set(object.objectId, row);
  }

  const registryIds = evidence.registryContract.objectIds;
  const externalParents = new Map();
  const parentLookup = database.prepare(`
    SELECT id, project_id, external_id
    FROM world_features
    WHERE external_id = ?
    ORDER BY project_id, id
  `);
  for (const object of evidence.registryContract.objects) {
    if (!object.parentExternalId || registryIds.has(object.parentExternalId)) continue;
    const matches = parentLookup.all(object.parentExternalId);
    assert(
      matches.length === 1,
      `${object.objectId}: external parent ${object.parentExternalId} has ${matches.length} database matches`,
    );
    externalParents.set(object.objectId, matches[0]);
  }

  const scanId = stableId(
    'wsc',
    `${PACKAGE_ID}\0${evidence.postSnapshot.sha256}\0${PROJECT_ID}`,
  );
  const scan = database.prepare('SELECT * FROM world_scans WHERE id = ?').get(scanId);
  if (scan) {
    assert(
      scan.project_id === PROJECT_ID
        && scan.snapshot_ref?.includes(evidence.postSnapshot.sha256),
      'deterministic scan ID is occupied by different evidence',
    );
  }
  const existingObservationCount = scan
    ? database.prepare(`
        SELECT COUNT(*) AS count
        FROM feature_observations
        WHERE scan_id = ?
      `).get(scanId).count
    : 0;
  return {
    integrity,
    foreignKeys,
    counts: databaseCounts(database),
    existing,
    externalParents,
    scanId,
    scanExists: Boolean(scan),
    existingObservationCount,
  };
}

function orderObjects(objects) {
  const byId = new Map(objects.map((object) => [object.objectId, object]));
  const ordered = [];
  const pending = new Set(byId.keys());
  while (pending.size > 0) {
    let progress = false;
    for (const objectId of [...pending].sort()) {
      const object = byId.get(objectId);
      if (object.parentExternalId && pending.has(object.parentExternalId)) continue;
      ordered.push(object);
      pending.delete(objectId);
      progress = true;
    }
    assert(progress, `cyclic registry parents: ${[...pending].join(', ')}`);
  }
  return ordered;
}

function compactMedia(capture) {
  return {
    mediaId: capture.mediaId ?? capture.id,
    cameraId: capture.id,
    shotId: capture.shotId,
    evidencePass: Number(capture.evidencePass),
    viewClass: capture.viewClass ?? capture.role,
    path: capture.output,
    width: capture.width,
    height: capture.height,
    bytes: capture.bytes,
    sha256: capture.sha256,
    cameraSignature: capture.cameraSignature,
  };
}

function buildDefinitions(evidence) {
  return orderObjects(evidence.registryContract.objects).map((object) => {
    const [minX, minY, minZ, maxX, maxY, maxZ] = object.bounds;
    const media = evidence.mediaEvidence.mediaByObject.get(object.objectId)
      .map(compactMedia);
    const importMarker = object.truth.importDisposition === 'verified-built-marker';
    return {
      projectId: PROJECT_ID,
      externalId: object.objectId,
      parentExternalId: object.parentExternalId,
      name: object.name,
      kind: featureKind(object.truth.importAsBuiltKind),
      originalKind: object.kind,
      geometry: {
        type: 'bounds',
        minX,
        maxX,
        minZ,
        maxZ,
        minY,
        maxY,
      },
      tags: [
        'town-expansion-r1',
        'as-built',
        'verified-post-state',
        ...object.familyIds.map((family) => `family:${family}`),
        ...(importMarker ? ['built-marker-not-future-program'] : []),
      ],
      attributes: {
        registryObject: {
          objectId: object.objectId,
          sourceScope: object.sourceScope,
          familyIds: object.familyIds,
          provenance: object.provenance,
          targetCells: object.targetCells,
          roles: object.roles,
          originalKind: object.kind,
          sourceAttributes: object.attributes,
        },
        requestedVsAsBuilt: {
          requestedState: object.truth.requestedState,
          sourceRegistryState: object.truth.sourceState,
          acceptedState: 'VERIFIED_POST_STATE',
          databaseState: 'DATABASE_IMPORTED',
          importDisposition: object.truth.importDisposition,
          plannedOnly: false,
          physicalClaim: object.truth.physicalClaim,
          futureProgramState: object.truth.futureProgramState,
          futureProgramClaim: object.truth.futureProgramClaim,
          broaderRequestedProgramImpliedComplete: false,
        },
        media,
        townExpansionRelease: evidence.evidence,
      },
      media,
    };
  });
}

function mergeTags(existingJson, incoming) {
  const existing = safeJson(existingJson, []);
  return [...new Set([
    ...(Array.isArray(existing) ? existing : []),
    ...incoming,
  ].filter((tag) => !['planned', 'not-live-executed', 'not-imported'].includes(tag)))];
}

function mergeAttributes(existingJson, incoming) {
  const existing = safeJson(existingJson, {});
  return {
    ...(existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}),
    ...incoming,
  };
}

export function executeTownExpansionImport({
  database,
  evidence,
  preflight,
  failureInjectionAfterFeatures = null,
  now = Date.now(),
  withinTransaction = false,
}) {
  const definitions = buildDefinitions(evidence);
  const inserted = [];
  const updated = [];
  const featureIds = new Map();
  const apply = () => {
    assertDatabaseSchema(database);
    const parentByExternal = new Map();
    const lookup = database.prepare(`
      SELECT id, project_id, external_id, attributes_json, tags_json
      FROM world_features
      WHERE project_id = ? AND external_id = ?
    `);
    const insert = database.prepare(`
      INSERT INTO world_features (
        id, project_id, external_id, parent_id, world, name, kind, status,
        geometry_json, min_x, max_x, min_z, max_z, source, source_ref,
        confidence, completion_ratio, condition_score, tags_json,
        attributes_json, observed_at, revision, created_at, updated_at
      ) VALUES (
        @id, @projectId, @externalId, @parentId, 'world', @name, @kind,
        'complete', @geometryJson, @minX, @maxX, @minZ, @maxZ, 'import',
        @sourceRef, 1, 1, NULL, @tagsJson, @attributesJson, @observedAt, 1,
        @createdAt, @updatedAt
      )
    `);
    const update = database.prepare(`
      UPDATE world_features SET
        parent_id = @parentId,
        world = 'world',
        name = @name,
        kind = @kind,
        status = 'complete',
        geometry_json = @geometryJson,
        min_x = @minX,
        max_x = @maxX,
        min_z = @minZ,
        max_z = @maxZ,
        source = 'import',
        source_ref = @sourceRef,
        confidence = 1,
        completion_ratio = 1,
        tags_json = @tagsJson,
        attributes_json = @attributesJson,
        observed_at = @observedAt,
        revision = revision + 1,
        updated_at = @updatedAt
      WHERE id = @id
    `);

    let featureIndex = 0;
    for (const definition of definitions) {
      const prior = lookup.get(PROJECT_ID, definition.externalId);
      let parentId = null;
      if (definition.parentExternalId) {
        parentId = parentByExternal.get(definition.parentExternalId)
          ?? preflight.externalParents.get(definition.externalId)?.id
          ?? null;
        assert(parentId, `${definition.externalId}: exact parent did not resolve`);
      }
      const id = prior?.id ?? stableId(
        'wft',
        `${PROJECT_ID}\0${definition.externalId}`,
      );
      const row = {
        id,
        projectId: PROJECT_ID,
        externalId: definition.externalId,
        parentId,
        name: definition.name,
        kind: definition.kind,
        geometryJson: JSON.stringify(definition.geometry),
        minX: definition.geometry.minX,
        maxX: definition.geometry.maxX,
        minZ: definition.geometry.minZ,
        maxZ: definition.geometry.maxZ,
        sourceRef: relativeRoot(evidence.registryPath),
        tagsJson: JSON.stringify(mergeTags(prior?.tags_json, definition.tags)),
        attributesJson: JSON.stringify(
          mergeAttributes(prior?.attributes_json, definition.attributes),
        ),
        observedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      if (prior) {
        update.run(row);
        updated.push(definition.externalId);
      } else {
        insert.run(row);
        inserted.push(definition.externalId);
      }
      parentByExternal.set(definition.externalId, id);
      featureIds.set(definition.externalId, id);
      featureIndex += 1;
      if (
        failureInjectionAfterFeatures != null
        && featureIndex === failureInjectionAfterFeatures
      ) {
        throw new Error(`synthetic import failure after ${featureIndex} features`);
      }
    }

    const scanSummary = {
      packageId: PACKAGE_ID,
      registry: evidence.evidence.registry,
      postReleaseQa: evidence.evidence.postReleaseQa,
      transaction: evidence.evidence.transaction,
      supplementalTransactions: evidence.evidence.supplementalTransactions,
      releaseIdentitySha256: evidence.evidence.releaseIdentitySha256,
      mediaReport: evidence.evidence.mediaReport,
      forwardPackage: evidence.evidence.forwardPackage,
      postSnapshot: evidence.evidence.postSnapshot,
      featureCount: definitions.length,
      requestedVsAsBuiltPolicy:
        'Only each registry physicalClaim is imported; broader requested programs are not implied complete.',
    };
    database.prepare(`
      INSERT INTO world_scans (
        id, project_id, world, method, status, bounds_json, observer,
        snapshot_ref, summary_json, error, started_at, completed_at
      ) VALUES (
        @id, @projectId, 'world', 'manifest_import', 'complete', NULL,
        'codex-town-expansion-r1-guarded-import',
        @snapshotRef, @summaryJson, NULL, @startedAt, @completedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        world = excluded.world,
        method = excluded.method,
        status = excluded.status,
        bounds_json = excluded.bounds_json,
        observer = excluded.observer,
        snapshot_ref = excluded.snapshot_ref,
        summary_json = excluded.summary_json,
        error = NULL,
        completed_at = excluded.completed_at
    `).run({
      id: preflight.scanId,
      projectId: PROJECT_ID,
      snapshotRef:
        `${relativeRoot(evidence.postRegions)}:sha256=${evidence.postSnapshot.sha256}`,
      summaryJson: JSON.stringify(scanSummary),
      startedAt: now,
      completedAt: now,
    });

    const observation = database.prepare(`
      INSERT INTO feature_observations (
        id, scan_id, feature_id, status, completion_ratio, condition_score,
        expected_blocks, observed_blocks, details_json, observed_at
      ) VALUES (
        @id, @scanId, @featureId, 'complete', 1, NULL, @expectedBlocks,
        @observedBlocks, @detailsJson, @observedAt
      )
      ON CONFLICT(scan_id, feature_id) DO UPDATE SET
        status = excluded.status,
        completion_ratio = excluded.completion_ratio,
        condition_score = excluded.condition_score,
        expected_blocks = excluded.expected_blocks,
        observed_blocks = excluded.observed_blocks,
        details_json = excluded.details_json,
        observed_at = excluded.observed_at
    `);
    for (const definition of definitions) {
      const featureId = featureIds.get(definition.externalId);
      const targetCells = evidence.registryContract.objects.find(
        (object) => object.objectId === definition.externalId,
      )?.targetCells;
      observation.run({
        id: stableId('obs', `${preflight.scanId}\0${featureId}`),
        scanId: preflight.scanId,
        featureId,
        expectedBlocks: Number.isSafeInteger(targetCells) ? targetCells : null,
        observedBlocks: Number.isSafeInteger(targetCells) ? targetCells : null,
        detailsJson: JSON.stringify({
          packageId: PACKAGE_ID,
          externalId: definition.externalId,
          postSnapshotSha256: evidence.postSnapshot.sha256,
          registrySha256: evidence.evidence.registry.sha256,
          qaSha256: evidence.evidence.postReleaseQa.sha256,
          transactionSha256: evidence.evidence.transaction.sha256,
          supplementalTransactionSha256s:
            evidence.evidence.supplementalTransactions.map(
              (entry) => entry.sha256,
            ),
          releaseIdentitySha256: evidence.evidence.releaseIdentitySha256,
          mediaReportSha256: evidence.evidence.mediaReport.sha256,
          requestedVsAsBuilt: definition.attributes.requestedVsAsBuilt,
          media: definition.media,
        }),
        observedAt: now,
      });
    }
  };
  const result = {
    definitions,
    inserted,
    updated,
    scanId: preflight.scanId,
    featureIds,
  };
  if (withinTransaction) {
    apply();
  } else {
    database.transaction(apply).immediate();
  }
  return result;
}

function verifyImportedDatabase(database, evidence, result, countsBefore) {
  const ids = evidence.registryContract.objects.map((object) => object.objectId);
  const rows = ids.map((externalId) => database.prepare(`
    SELECT id, project_id, external_id, parent_id, status, completion_ratio,
           attributes_json, tags_json
    FROM world_features
    WHERE project_id = ? AND external_id = ?
  `).get(PROJECT_ID, externalId));
  const missing = ids.filter((externalId, index) => !rows[index]);
  const evidenceFailures = rows.filter(Boolean).flatMap((row) => {
    const attributes = safeJson(row.attributes_json, {});
    const release = attributes.townExpansionRelease ?? {};
    const truth = attributes.requestedVsAsBuilt ?? {};
    return (
      row.status !== 'complete'
      || row.completion_ratio !== 1
      || release.postSnapshot?.sha256 !== evidence.postSnapshot.sha256
      || release.registry?.sha256 !== evidence.evidence.registry.sha256
      || release.mediaReport?.sha256 !== evidence.evidence.mediaReport.sha256
      || release.releaseIdentitySha256
        !== evidence.evidence.releaseIdentitySha256
      || JSON.stringify(
        (release.supplementalTransactions ?? []).map((entry) => entry.sha256),
      ) !== JSON.stringify(
        evidence.evidence.supplementalTransactions.map(
          (entry) => entry.sha256,
        ),
      )
      || truth.acceptedState !== 'VERIFIED_POST_STATE'
      || truth.databaseState !== 'DATABASE_IMPORTED'
      || truth.broaderRequestedProgramImpliedComplete !== false
    ) ? [row.external_id] : [];
  });
  const scan = database.prepare(`
    SELECT id, status, snapshot_ref, summary_json
    FROM world_scans
    WHERE id = ?
  `).get(result.scanId);
  const observations = database.prepare(`
    SELECT feature_id, status, completion_ratio, details_json
    FROM feature_observations
    WHERE scan_id = ?
  `).all(result.scanId);
  const countsAfter = databaseCounts(database);
  const integrity = database.pragma('integrity_check', { simple: true });
  const foreignKeys = database.pragma('foreign_key_check');
  const expectedFeatureIncrease = result.inserted.length;
  const expectedScanIncrease = countsBefore.scanExists ? 0 : 1;
  const expectedObservationIncrease =
    evidence.registryContract.objects.length - countsBefore.existingObservationCount;
  const passed = integrity === 'ok'
    && foreignKeys.length === 0
    && missing.length === 0
    && evidenceFailures.length === 0
    && scan?.status === 'complete'
    && scan.snapshot_ref.includes(evidence.postSnapshot.sha256)
    && observations.length === evidence.registryContract.objects.length
    && observations.every((entry) =>
      entry.status === 'complete' && entry.completion_ratio === 1)
    && countsAfter.worldFeatures
      === countsBefore.counts.worldFeatures + expectedFeatureIncrease
    && countsAfter.worldScans
      === countsBefore.counts.worldScans + expectedScanIncrease
    && countsAfter.featureObservations
      === countsBefore.counts.featureObservations + expectedObservationIncrease;
  assert(passed, 'post-import read-only database verification failed');
  return {
    passed,
    integrity,
    foreignKeys,
    countsAfter,
    rows: rows.length,
    missing,
    evidenceFailures,
    scan: {
      id: scan.id,
      status: scan.status,
      snapshotRef: scan.snapshot_ref,
    },
    observations: observations.length,
  };
}

async function createBackup(databasePath, backupDirectory) {
  fs.mkdirSync(backupDirectory, { recursive: true });
  const token = new Date().toISOString().replace(/[-:.]/g, '');
  const backupPath = path.join(
    backupDirectory,
    `world-map-town-expansion-preimport-${token}.db`,
  );
  assert(!fs.existsSync(backupPath), `backup already exists: ${backupPath}`);
  const source = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    await source.backup(backupPath);
  } finally {
    source.close();
  }
  const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    assert(
      backup.pragma('integrity_check', { simple: true }) === 'ok'
        && backup.pragma('foreign_key_check').length === 0,
      'database backup failed integrity checks',
    );
  } finally {
    backup.close();
  }
  return artifact(backupPath);
}

export async function runTownExpansionDatabaseCloseout({
  databasePath,
  registryPath,
  qaPath,
  postRegions,
  transactionPath,
  supplementalTransactionPaths = [],
  mediaReportPath,
  commit = false,
  expectedDbSha256 = null,
  backupDirectory = path.resolve(ROOT, 'data/backups'),
  failureInjectionAfterFeatures = null,
}) {
  const evidence = validateTownExpansionEvidence({
    registryPath,
    qaPath,
    postRegions,
    transactionPath,
    supplementalTransactionPaths,
    mediaReportPath,
  });
  assert(fs.existsSync(databasePath), `database does not exist: ${databasePath}`);
  const sha256Before = sha256File(databasePath);
  const readonly = new Database(databasePath, { readonly: true, fileMustExist: true });
  let preflight;
  try {
    preflight = databasePreflight(readonly, evidence);
  } finally {
    readonly.close();
  }
  const definitions = buildDefinitions(evidence);
  const dryRun = {
    schemaVersion: 1,
    id: 'town-expansion-r1-database-closeout',
    generatedAtUtc: new Date().toISOString(),
    status: 'PASS_DRY_RUN',
    passed: true,
    mode: 'dry-run',
    databaseMutated: false,
    liveWorldMutated: false,
    packageId: PACKAGE_ID,
    projectId: PROJECT_ID,
    database: {
      path: relativeRoot(databasePath),
      sha256: sha256Before,
      sha256Before,
      integrityBefore: preflight.integrity,
      foreignKeyViolationsBefore: preflight.foreignKeys,
      countsBefore: preflight.counts,
    },
    evidence: evidence.evidence,
    registry: {
      objects: definitions.length,
      expectedCaptureFiles: evidence.registryContract.expectedCaptureIds.size,
      mapOnlyFeaturesExcluded: evidence.registryContract.mapPairs.length,
      plannedOnlyObjects: 0,
      importDispositions: Object.fromEntries([...new Set(definitions.map(
        (definition) =>
          definition.attributes.requestedVsAsBuilt.importDisposition,
      ))].sort().map((disposition) => [
        disposition,
        definitions.filter((definition) =>
          definition.attributes.requestedVsAsBuilt.importDisposition === disposition).length,
      ])),
    },
    plan: {
      featuresToCreate: definitions.filter((definition) =>
        !preflight.existing.has(definition.externalId)).map((entry) => entry.externalId),
      featuresToUpdate: definitions.filter((definition) =>
        preflight.existing.has(definition.externalId)).map((entry) => entry.externalId),
      scanId: preflight.scanId,
      scanWillCreate: !preflight.scanExists,
      observationsToUpsert: definitions.length,
      transaction: 'one SQLite IMMEDIATE transaction with rollback-on-error',
    },
    failures: [],
  };
  if (!commit) return dryRun;

  assert(
    typeof expectedDbSha256 === 'string' && expectedDbSha256 === sha256Before,
    'commit requires --expected-db-sha256 matching the current database',
  );
  const backup = await createBackup(databasePath, backupDirectory);
  const database = new Database(databasePath, { fileMustExist: true });
  database.pragma('foreign_keys = ON');
  let result;
  let transactionVerification;
  try {
    assert(sha256File(databasePath) === expectedDbSha256, 'database changed before transaction');
    const atomicImport = database.transaction(() => {
      result = executeTownExpansionImport({
        database,
        evidence,
        preflight,
        failureInjectionAfterFeatures,
        withinTransaction: true,
      });
      transactionVerification = verifyImportedDatabase(
        database,
        evidence,
        result,
        preflight,
      );
    });
    atomicImport.immediate();
    database.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    database.close();
  }

  const verificationDatabase = new Database(
    databasePath,
    { readonly: true, fileMustExist: true },
  );
  let verification;
  try {
    verification = verifyImportedDatabase(
      verificationDatabase,
      evidence,
      result,
      preflight,
    );
  } finally {
    verificationDatabase.close();
  }
  return {
    ...dryRun,
    generatedAtUtc: new Date().toISOString(),
    status: 'PASS_DATABASE_IMPORTED',
    mode: 'commit',
    databaseMutated: true,
    database: {
      ...dryRun.database,
      sha256: sha256File(databasePath),
      sha256After: sha256File(databasePath),
      countsAfter: verification.countsAfter,
      integrityAfter: verification.integrity,
      foreignKeyViolationsAfter: verification.foreignKeys,
    },
    backup,
    atomicity: {
      oneImmediateTransaction: true,
      rollbackOnError: true,
      verifiedBeforeCommit: transactionVerification.passed,
      featuresInserted: result.inserted.length,
      featuresUpdated: result.updated.length,
      scansUpserted: 1,
      observationsUpserted: verification.observations,
    },
    verification,
  };
}

function valueAfter(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  if (index < 0) return fallback;
  assert(argv[index + 1] && !argv[index + 1].startsWith('--'), `${flag} requires a value`);
  return argv[index + 1];
}

function valuesAfter(argv, flag) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== flag) continue;
    assert(
      argv[index + 1] && !argv[index + 1].startsWith('--'),
      `${flag} requires a value`,
    );
    values.push(argv[index + 1]);
  }
  return values;
}

export function parseArgs(argv) {
  if (argv.includes('--contract')) return { contract: true };
  const commit = argv.includes('--commit');
  assert(
    !argv.includes('--dry-run') || !commit,
    '--dry-run and --commit are mutually exclusive',
  );
  const required = (flag) => {
    const value = valueAfter(argv, flag);
    assert(value, `${flag} is required`);
    return resolveRoot(value);
  };
  return {
    contract: false,
    commit,
    databasePath: resolveRoot(valueAfter(argv, '--database', 'data/world-map.db')),
    registryPath: resolveRoot(valueAfter(
      argv,
      '--registry',
      'data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json',
    )),
    qaPath: required('--qa'),
    postRegions: required('--post'),
    transactionPath: required('--transaction'),
    supplementalTransactionPaths: valuesAfter(
      argv,
      '--supplemental-transaction',
    ).map(resolveRoot),
    mediaReportPath: required('--media-report'),
    expectedDbSha256: valueAfter(argv, '--expected-db-sha256'),
    backupDirectory: resolveRoot(valueAfter(argv, '--backup-dir', 'data/backups')),
    outputPath: resolveRoot(valueAfter(
      argv,
      '--out',
      'data/world-review/town-expansion-r1-database-closeout-2026-07-28.json',
    )),
  };
}

export const DATABASE_IMPORT_CONTRACT = Object.freeze({
  schemaVersion: 2,
  packageId: PACKAGE_ID,
  defaultMode: 'dry-run',
  mutationAuthorization: [
    '--commit',
    '--expected-db-sha256 <exact hash emitted by dry-run>',
  ],
  requiredEvidence: [
    'PASS/ACCEPTED town-expansion post-release QA with every required gate',
    'distinct immutable post snapshot matching QA byte-for-byte',
    'committed one-package strict-noop transaction',
    'when present, every ordered supplemental transaction and the schema-v2 consolidated release identity',
    'complete schema-v2 object/media/database crosswalk',
    'PASS exact matched media report with two declared captures per shot',
    'per-object requested-vs-as-built truth block',
  ],
  refusal: [
    'planned-only or unbuilt objects',
    'future program represented as complete instead of a verified built marker',
    'map-only IDs as database features',
    'filename-inferred media relationships',
    'missing, orphaned, non-matched, hash-drifted, or undersized media',
    'database schema/integrity/foreign-key drift',
  ],
  atomicWrite: {
    projectId: PROJECT_ID,
    features: 'dynamic exact registry cardinality',
    scans: 1,
    observations: 'one per exact registry object',
    idempotency: 'deterministic scan and row identities; upsert on exact keys',
    rollbackOnError: true,
    backupBeforeWrite: true,
  },
});

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.contract) {
      process.stdout.write(`${JSON.stringify(DATABASE_IMPORT_CONTRACT, null, 2)}\n`);
      return;
    }
    const report = await runTownExpansionDatabaseCloseout(options);
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      mode: report.mode,
      databaseMutated: report.databaseMutated,
      databaseSha256: report.database.sha256After ?? report.database.sha256Before,
      objects: report.registry.objects,
      captures: report.registry.expectedCaptureFiles,
      output: relativeRoot(options.outputPath),
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
