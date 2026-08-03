#!/usr/bin/env node
/**
 * Shared, read-only Town Expansion documentation profile and finality gate.
 *
 * Draft documentation may describe requested, researched, designed, generated,
 * and currently blocked work. Final/as-built documentation is allowed only
 * after the committed transaction, distinct accepted post snapshot, post QA,
 * paired media QA, database import, read-only database census, and all
 * referenced hashes agree.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const TOWN_EXPANSION_PACKAGE_ID =
  'town-expansion-r1-2026-07-28';
export const TOWN_EXPANSION_DOC_DIR =
  'docs/redevelopment/2026-07-28-town-expansion';

export const TOWN_EXPANSION_PATHS = Object.freeze({
  designReport:
    'data/buildops/town-expansion-r1-2026-07-28.report.json',
  ownershipManifest:
    'data/buildops/town-expansion-r1-2026-07-28.manifest.json',
  forward: 'data/buildops/town-expansion-r1-2026-07-28.txt',
  transaction:
    'data/world-review/'
      + 'town-expansion-r1-atomic-transaction-full-source-restored-retry-20260728.json',
  postQa:
    'data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json',
  mediaQa:
    'data/world-review/town-expansion-r1-post-release-media-2026-07-28.json',
  databaseImport:
    'data/world-review/town-expansion-r1-database-closeout-2026-07-28.json',
  databasePublication:
    'data/world-review/'
      + 'town-expansion-r1-database-publication-report-2026-07-28.json',
  mediaManifest:
    'data/exports/town-expansion-media-2026-07-28/capture-manifest.json',
  mediaCrosswalk:
    'data/exports/town-expansion-media-2026-07-28/'
      + 'object-media-database-crosswalk.json',
  worldDatabase: 'data/world-map.db',
  frozenScope:
    `${TOWN_EXPANSION_DOC_DIR}/session-frozen-scope-register.json`,
});

export const TOWN_EXPANSION_DOCUMENTATION_CONTRACT = Object.freeze({
  profile: 'town-expansion',
  draftCommands: [
    'node scripts/generate_redevelopment_artifact_register.mjs '
      + '--profile town-expansion --mode draft',
    'node scripts/generate_redevelopment_dossier.mjs '
      + '--profile town-expansion --mode draft --html-only',
  ],
  finalCommands: [
    'node scripts/generate_redevelopment_artifact_register.mjs '
      + '--profile town-expansion --mode final '
      + '[--transaction <ledger>] [--post <immutable-post-region-dir>] '
      + '[--post-qa <report>] [--media-qa <report>] '
      + '[--db-import <report>] [--db-report <report>]',
    'node scripts/generate_redevelopment_dossier.mjs '
      + '--profile town-expansion --mode final '
      + '[the same evidence overrides]',
  ],
  finalRequired: [
    'one committed canonical Town Expansion transaction',
    'a distinct immutable post-release snapshot',
    'PASS/ACCEPTED Town Expansion post-release QA',
    'PASS paired media QA with exactly 13 map shots',
    'PASS_DATABASE_IMPORTED atomic database closeout',
    'PASS read-only database publication report',
    'byte-exact hashes for every referenced final input',
  ],
  truthBoundary:
    'Draft output is preparation evidence and must never be called final or '
    + 'as-built. Final mode fails closed.',
});

function absolute(root, filename) {
  if (!filename) return null;
  return path.isAbsolute(filename) ? filename : path.resolve(root, filename);
}

function relative(root, filename) {
  return path.relative(root, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function artifact(root, filename) {
  if (!filename) return { path: null, exists: false, sha256: null, value: null };
  const resolved = absolute(root, filename);
  if (!fs.existsSync(resolved)) {
    return {
      path: relative(root, resolved),
      exists: false,
      sha256: null,
      value: null,
    };
  }
  let value = null;
  try {
    if (resolved.endsWith('.json')) value = readJson(resolved);
  } catch {
    value = { parseError: true };
  }
  return {
    path: relative(root, resolved),
    exists: true,
    bytes: fs.statSync(resolved).size,
    sha256: sha256File(resolved),
    value,
  };
}

function collectSha256(value, output = new Set()) {
  if (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) {
    output.add(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectSha256(entry, output);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectSha256(entry, output);
  }
  return output;
}

export function hashSnapshot(directory, root = process.cwd()) {
  const resolved = absolute(root, directory);
  if (!resolved || !fs.existsSync(resolved)) return null;
  const files = fs.readdirSync(resolved)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  if (files.length === 0) return null;
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(resolved, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    path: relative(root, resolved),
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function first(value, paths) {
  for (const dotted of paths) {
    const result = dotted.split('.').reduce(
      (current, key) => current?.[key],
      value,
    );
    if (result !== undefined && result !== null) return result;
  }
  return null;
}

function packageHashSet(value) {
  return collectSha256({
    operationSha256: value?.operationSha256,
    forwardSha256: value?.forwardSha256,
    packageSha256: value?.packageSha256,
    packageHashes: value?.packageHashes,
    evidence: value?.evidence,
  });
}

function gate(id, label, passed, details = {}) {
  return { id, label, passed: Boolean(passed), details };
}

export function evaluateTownExpansionDocumentationGate({
  root = process.cwd(),
  paths = {},
} = {}) {
  const resolvedPaths = { ...TOWN_EXPANSION_PATHS, ...paths };
  const design = artifact(root, resolvedPaths.designReport);
  const ownership = artifact(root, resolvedPaths.ownershipManifest);
  const forward = artifact(root, resolvedPaths.forward);
  const transaction = artifact(root, resolvedPaths.transaction);
  const postQa = artifact(root, resolvedPaths.postQa);
  const mediaQa = artifact(root, resolvedPaths.mediaQa);
  const databaseImport = artifact(root, resolvedPaths.databaseImport);
  const databasePublication = artifact(
    root,
    resolvedPaths.databasePublication,
  );
  const mediaManifest = artifact(root, resolvedPaths.mediaManifest);
  const mediaCrosswalk = artifact(root, resolvedPaths.mediaCrosswalk);
  const worldDatabase = artifact(root, resolvedPaths.worldDatabase);

  const designValue = design.value ?? {};
  const forwardHash = forward.sha256;
  const prereleaseHash = designValue.sourceSnapshot?.sha256 ?? null;
  const postQaValue = postQa.value ?? {};
  const postPath = paths.postSnapshot
    ?? first(postQaValue, ['snapshots.post.path', 'postSnapshot.directory']);
  const postSnapshot = hashSnapshot(postPath, root);
  const transactionValue = transaction.value ?? {};
  const transactionPackages = transactionValue.packages ?? [];
  const transactionPackage = transactionPackages.find(
    (entry) => (
      entry.key === 'town-expansion-r1'
      || entry.packageId === TOWN_EXPANSION_PACKAGE_ID
    ),
  ) ?? (transactionPackages.length === 1 ? transactionPackages[0] : null);
  const transactionStatus = String(transactionValue.status ?? '').toLowerCase();
  const mediaValue = mediaQa.value ?? {};
  const mediaManifestValue = mediaManifest.value ?? {};
  const mapCameras = (mediaManifestValue.cameras ?? []).filter(
    (camera) => camera.mode === 'map',
  );
  const mapShotIds = new Set(mapCameras.map((camera) => camera.shotId));
  const mapPass1 = mapCameras.filter((camera) => camera.evidencePass === 1);
  const mapPass2 = mapCameras.filter((camera) => camera.evidencePass === 2);
  const mediaPostHash = first(mediaValue, [
    'postSnapshot.sha256',
    'snapshot.sha256',
  ]);
  const mediaHashes = packageHashSet(mediaValue);
  const dbImportValue = databaseImport.value ?? {};
  const dbPublicationValue = databasePublication.value ?? {};
  const dbImportHashes = collectSha256(dbImportValue);
  const dbPublicationHashes = collectSha256(dbPublicationValue);

  const entityArtifactPath = first(postQaValue, [
    'artifacts.liveEntityGate.path',
  ]);
  const entityArtifact = artifact(root, entityArtifactPath);
  const entityValue = entityArtifact.value ?? {};
  const entityExpectedHash = first(postQaValue, [
    'artifacts.liveEntityGate.sha256',
  ]);
  const postQaForwardHash = first(postQaValue, [
    'artifacts.forward.sha256',
  ]);
  const postQaPostHash = first(postQaValue, [
    'snapshots.post.sha256',
  ]);

  const gates = [
    gate(
      'canonical-package-inputs',
      'Canonical compiler report, ownership manifest and forward package exist and agree',
      design.exists
        && ownership.exists
        && forward.exists
        && designValue.packageId === TOWN_EXPANSION_PACKAGE_ID
        && designValue.operations?.sha256 === forwardHash
        && ownership.value?.packageId === TOWN_EXPANSION_PACKAGE_ID
        && ownership.value?.sourceSnapshot?.sha256 === prereleaseHash
        && ownership.value?.combinedTransaction?.forward?.sha256 === forwardHash,
      {
        designReport: design.path,
        ownershipManifest: ownership.path,
        forward: forward.path,
        forwardSha256: forwardHash,
      },
    ),
    gate(
      'committed-transaction',
      'One canonical transaction is committed with strict-noop success',
      transaction.exists
        && ['committed', 'committed-pending-post-qa'].includes(transactionStatus)
        && transactionPackages.length === 1
        && transactionPackage
        && transactionPackage.status === 'committed'
        && transactionPackage.forwardSha256 === forwardHash
        && transactionPackage.execution?.status === 'complete'
        && transactionPackage.execution?.strictNoop === true
        && transactionPackage.execution?.failedGroups === 0
        && transactionPackage.execution?.failedCommands === 0,
      {
        path: transaction.path,
        status: transactionValue.status ?? null,
        packageCount: transactionPackages.length,
      },
    ),
    gate(
      'distinct-accepted-post-snapshot',
      'Immutable post snapshot exists, differs from prerelease and matches post QA',
      Boolean(
        postSnapshot
        && postSnapshot.sha256 !== prereleaseHash
        && postQaPostHash === postSnapshot.sha256,
      ),
      {
        prereleaseSha256: prereleaseHash,
        postSnapshot,
      },
    ),
    gate(
      'live-entity-clearance',
      'Bound live entity/player clearance report passed without mutation',
      entityArtifact.exists
        && entityValue.status === 'PASS'
        && entityValue.passed === true
        && entityValue.blockOrEntityMutation === false
        && (!entityExpectedHash || entityExpectedHash === entityArtifact.sha256),
      {
        path: entityArtifact.path,
        status: entityValue.status ?? null,
        blockers: (entityValue.packages ?? [])
          .reduce((sum, entry) => sum + (entry.blockers?.length ?? 0), 0),
      },
    ),
    gate(
      'post-release-qa',
      'Independent post-release QA reports PASS and ACCEPTED',
      postQa.exists
        && postQaValue.status === 'PASS'
        && postQaValue.passed === true
        && postQaValue.readOnly === true
        && postQaValue.liveWorldMutated === false
        && postQaValue.databaseMutated === false
        && postQaValue.decision?.release === 'ACCEPTED'
        && postQaForwardHash === forwardHash
        && postQaValue.artifacts?.transaction?.sha256 === transaction.sha256
        && postQaValue.artifacts?.designReport?.sha256 === design.sha256
        && postQaValue.artifacts?.manifest?.sha256 === ownership.sha256
        && postQaValue.failures?.length === 0,
      {
        path: postQa.path,
        status: postQaValue.status ?? null,
        decision: postQaValue.decision?.release ?? null,
      },
    ),
    gate(
      'paired-media-qa',
      'Paired post media passed, binds post/package/crosswalk, and supplies 13 maps',
      mediaQa.exists
        && mediaValue.status === 'PASS'
        && mediaValue.passed === true
        && mediaValue.finality === 'ACCEPTED_POST_RELEASE_MEDIA'
        && mediaPostHash === postSnapshot?.sha256
        && mediaHashes.has(forwardHash)
        && mediaManifest.exists
        && mediaValue.sourceManifest?.sha256 === mediaManifest.sha256
        && mediaCrosswalk.exists
        && mediaValue.crosswalk?.sha256 === mediaCrosswalk.sha256
        && mediaValue.designReport?.sha256 === design.sha256
        && mediaValue.forwardPackage?.sha256 === forwardHash
        && mediaValue.fileChecks?.failed === 0
        && mediaValue.fileChecks?.checked
          === mediaManifestValue.counts?.combinedCaptures
        && mediaValue.captures?.length
          === mediaManifestValue.counts?.combinedCaptures
        && mapShotIds.size === 13
        && mapPass1.length === 13
        && mapPass2.length === 13,
      {
        path: mediaQa.path,
        status: mediaValue.status ?? null,
        captures: mediaValue.captures?.length ?? 0,
        mapShots: mapShotIds.size,
        mapPass1: mapPass1.length,
        mapPass2: mapPass2.length,
      },
    ),
    gate(
      'database-import',
      'Atomic database closeout imported every verified registry object',
      databaseImport.exists
        && dbImportValue.id === 'town-expansion-r1-database-closeout'
        && dbImportValue.packageId === TOWN_EXPANSION_PACKAGE_ID
        && dbImportValue.status === 'PASS_DATABASE_IMPORTED'
        && dbImportValue.mode === 'commit'
        && dbImportValue.passed === true
        && dbImportValue.databaseMutated === true
        && dbImportValue.liveWorldMutated === false
        && dbImportValue.atomicity?.oneImmediateTransaction === true
        && dbImportValue.atomicity?.rollbackOnError === true
        && dbImportValue.verification?.passed === true
        && (dbImportValue.verification?.missing ?? []).length === 0
        && (dbImportValue.verification?.evidenceFailures ?? []).length === 0
        && first(dbImportValue, [
          'database.integrityAfter',
          'verification.integrity',
          'database.integrity',
        ]) === 'ok'
        && dbImportHashes.has(postSnapshot?.sha256)
        && dbImportHashes.has(forwardHash)
        && dbImportHashes.has(mediaCrosswalk.sha256)
        && dbImportHashes.has(mediaQa.sha256)
        && dbImportHashes.has(postQa.sha256)
        && dbImportHashes.has(transaction.sha256)
        && dbImportValue.database?.sha256 === worldDatabase.sha256,
      {
        path: databaseImport.path,
        status: dbImportValue.status ?? null,
        registryObjects: dbImportValue.registry?.objects ?? null,
      },
    ),
    gate(
      'database-publication-report',
      'Read-only database publication census passed against the accepted post state',
      databasePublication.exists
        && dbPublicationValue.id
          === 'town-expansion-r1-database-publication-report'
        && dbPublicationValue.status === 'PASS'
        && dbPublicationValue.passed === true
        && dbPublicationValue.readOnly === true
        && dbPublicationValue.failures?.acceptedScanCount === 1
        && Object.entries(dbPublicationValue.failures ?? {})
          .filter(([key]) => key !== 'acceptedScanCount')
          .every(([, value]) => Array.isArray(value) && value.length === 0)
        && dbPublicationHashes.has(postSnapshot?.sha256)
        && dbPublicationHashes.has(forwardHash)
        && dbPublicationHashes.has(mediaCrosswalk.sha256)
        && dbPublicationHashes.has(mediaQa.sha256)
        && dbPublicationHashes.has(postQa.sha256)
        && dbPublicationHashes.has(transaction.sha256)
        && dbPublicationValue.database?.sha256 === worldDatabase.sha256,
      {
        path: databasePublication.path,
        status: dbPublicationValue.status ?? null,
        databaseSha256: worldDatabase.sha256,
      },
    ),
  ];
  const passed = gates.every((entry) => entry.passed);
  return {
    schemaVersion: 1,
    profile: 'town-expansion',
    status: passed ? 'PASS_FINAL_INPUTS_ACCEPTED' : 'FAIL_FINAL_INPUTS_INCOMPLETE',
    passed,
    packageId: TOWN_EXPANSION_PACKAGE_ID,
    truthBoundary:
      passed
        ? 'Inputs satisfy the final documentation gate.'
        : 'Draft preparation only. No final/as-built claim is authorized.',
    paths: resolvedPaths,
    artifacts: {
      design: { ...design, value: undefined },
      ownership: { ...ownership, value: undefined },
      forward: { ...forward, value: undefined },
      transaction: { ...transaction, value: undefined },
      postQa: { ...postQa, value: undefined },
      mediaQa: { ...mediaQa, value: undefined },
      databaseImport: { ...databaseImport, value: undefined },
      databasePublication: { ...databasePublication, value: undefined },
      mediaManifest: { ...mediaManifest, value: undefined },
      mediaCrosswalk: { ...mediaCrosswalk, value: undefined },
      worldDatabase: { ...worldDatabase, value: undefined },
    },
    postSnapshot,
    gates,
    failures: gates.filter((entry) => !entry.passed).map((entry) => entry.id),
  };
}

export function assertTownExpansionFinalGate(options = {}) {
  const result = evaluateTownExpansionDocumentationGate(options);
  if (!result.passed) {
    throw new Error(
      `Town Expansion final documentation gate failed: `
      + `${result.failures.join(', ')}`,
    );
  }
  return result;
}

function effectiveRequirementState(requirement, gateResult, mode) {
  const stateById = {
    'DOC-001': gateResult.gates.find((entry) => entry.id === 'paired-media-qa')
      ?.passed ? 'VERIFIED_POST_STATE' : 'PENDING_POST_MEDIA',
    'DOC-002': gateResult.gates.find((entry) => entry.id === 'paired-media-qa')
      ?.passed ? 'VERIFIED_13_MAP_SET' : 'PENDING_13_POST_MAPS',
    'DOC-003': gateResult.gates.find((entry) => entry.id === 'paired-media-qa')
      ?.passed ? 'VERIFIED_POST_STATE' : 'PENDING_POST_MEDIA',
    'DOC-004': gateResult.gates.find(
      (entry) => entry.id === 'database-publication-report',
    )?.passed ? 'VERIFIED_DATABASE_REPORT' : 'PENDING_DATABASE_REPORT',
    'DOC-005': gateResult.gates.find((entry) => entry.id === 'database-import')
      ?.passed ? 'VERIFIED_EXACT_OBJECT_RELATIONS' : 'PENDING_DATABASE_IMPORT',
    'DOC-007': mode === 'final' && gateResult.passed
      ? 'FINAL_DOSSIER_INPUTS_ACCEPTED'
      : 'DRAFT_DOSSIER_ONLY',
  };
  return stateById[requirement.id] ?? requirement.currentState;
}

export function buildTownExpansionRequirementsMatrix({
  root = process.cwd(),
  mode = 'draft',
  gateResult = evaluateTownExpansionDocumentationGate({ root }),
} = {}) {
  const frozen = readJson(absolute(root, TOWN_EXPANSION_PATHS.frozenScope));
  const requirements = (frozen.requirements ?? []).map((requirement) => ({
    id: requirement.id,
    district: requirement.district,
    requirement: requirement.requirement,
    frozenState: requirement.currentState,
    effectiveState: effectiveRequirementState(requirement, gateResult, mode),
    evidence: requirement.currentEvidence ?? [],
    truthNote: requirement.truthNote ?? null,
    acceptance: requirement.acceptance ?? null,
  }));
  const stateSummary = Object.entries(requirements.reduce((summary, entry) => {
    summary[entry.effectiveState] = (summary[entry.effectiveState] ?? 0) + 1;
    return summary;
  }, {}))
    .map(([state, count]) => ({ state, count }))
    .sort((left, right) => left.state.localeCompare(right.state));
  return {
    schemaVersion: 1,
    id: 'town-expansion-requirements-status-matrix',
    packageId: TOWN_EXPANSION_PACKAGE_ID,
    generatedAtUtc: new Date().toISOString(),
    mode,
    status: mode === 'final' && gateResult.passed
      ? 'FINAL_AS_BUILT_INPUTS_ACCEPTED'
      : 'DRAFT_NOT_AS_BUILT',
    finalGate: gateResult,
    source: {
      path: TOWN_EXPANSION_PATHS.frozenScope,
      sha256: sha256File(absolute(root, TOWN_EXPANSION_PATHS.frozenScope)),
      requirementCount: requirements.length,
    },
    truthBoundary:
      'Frozen requirement language is preserved. Effective state is advanced '
      + 'only by a named passing closeout gate; draft output is not as-built.',
    summary: {
      requirements: requirements.length,
      states: stateSummary,
      finalGatePassed: gateResult.passed,
    },
    requirements,
  };
}

export function requirementsMatrixMarkdown(matrix) {
  const lines = [
    '# Town Expansion Requirements and Status Matrix',
    '',
    `Mode: **${matrix.mode.toUpperCase()}**  `,
    `Status: **${matrix.status}**  `,
    `Requirements: **${matrix.summary.requirements}**  `,
    `Final documentation gate: **${matrix.summary.finalGatePassed ? 'PASS' : 'FAIL'}**`,
    '',
    '> Draft mode is preparation evidence only. It is not a live, verified,',
    '> imported, final, or as-built claim.',
    '',
    '## Closeout gates',
    '',
    '| Gate | Result | Evidence |',
    '|---|---|---|',
    ...matrix.finalGate.gates.map((entry) => (
      `| ${entry.label} | ${entry.passed ? 'PASS' : 'FAIL / PENDING'} | `
      + `\`${entry.details.path ?? entry.details.forward ?? 'see machine matrix'}\` |`
    )),
    '',
    '## State census',
    '',
    '| Effective state | Requirements |',
    '|---|---:|',
    ...matrix.summary.states.map((entry) =>
      `| ${entry.state} | ${entry.count} |`),
    '',
    '## Requirement ledger',
    '',
    '| ID | District | Requirement | Frozen state | Effective state | Acceptance |',
    '|---|---|---|---|---|---|',
    ...matrix.requirements.map((entry) => (
      `| ${entry.id} | ${entry.district} | ${entry.requirement} | `
      + `${entry.frozenState} | ${entry.effectiveState} | `
      + `${entry.acceptance ?? '—'} |`
    )),
    '',
    '## Reading rule',
    '',
    matrix.truthBoundary,
    '',
  ];
  return `${lines.join('\n')}\n`;
}
