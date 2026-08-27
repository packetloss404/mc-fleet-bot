#!/usr/bin/env node
/**
 * Deterministic read-only G18 terminal publication acceptance toolkit.
 *
 * It validates local evidence and writes five acceptance records. Missing or
 * mismatched evidence produces WAITING records. It never captures media,
 * imports a database, publishes externally, connects to Minecraft, or edits
 * canonical build operations.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:05:00Z');
const OUT_ROOT = value(
  '--out-root',
  'data/world-review/combined-zones-r13-mvp-publication',
);
const BINDING_ROOT = value('--binding-root', OUT_ROOT);
const CONTRACT_PATH = value(
  '--release-contract',
  'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);
const R13_REPORT_PATH = value(
  '--r13-report',
  'data/world-review/combined-zones-r13-consolidated-mvp-acceptance-20260822T044500Z/r13-current-readiness.json',
);
const SOURCES = Object.freeze({
  terminalLedger: value('--terminal-ledger'),
  terminalQa: value('--terminal-qa'),
  mediaEvidence: value('--media-evidence'),
  mapEvidence: value('--map-evidence'),
  databaseImportEvidence: value('--database-import-evidence'),
});
const OUTPUTS = Object.freeze({
  terminal: `${OUT_ROOT}/terminal-post-acceptance.json`,
  media: `${OUT_ROOT}/matched-media-manifest.json`,
  map: `${OUT_ROOT}/terminal-map-qa.json`,
  database: `${OUT_ROOT}/database-import-verification.json`,
  publication: `${OUT_ROOT}/publication-manifest.json`,
});
const EXPECTED_CONTRACT_SHA256 = 'a83597d7a222d569d06e83caed2cc21bad6607ce99d2316345c73d108126c9e2';
const R13_NODE_ID = 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE';
const REQUIRED_GATES = Object.freeze([
  'G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT',
  'G17_FUNCTIONAL_POST_QA',
  'G18_MEDIA_AND_PUBLICATION',
  'G19_FINAL_ACCEPTANCE',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const serialize = (valueToSerialize) => `${JSON.stringify(valueToSerialize, null, 2)}\n`;
const payloadSha256 = (valueToHash) => sha256(Buffer.from(serialize(valueToHash)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const maybeBinding = (filename) => filename && fs.existsSync(absolute(filename))
  ? { ...binding(filename), exists: true }
  : { path: filename ? relative(filename) : null, sha256: null, bytes: null, exists: false };
const invariant = (condition, message) => {
  if (!condition) throw new Error(`G18 publication acceptance rejected: ${message}`);
};
const machinePass = (record) => typeof record?.status === 'string'
  && record.status.startsWith('PASS')
  && record.summary?.passed !== false;
const withPayload = (record, field = 'acceptancePayloadSha256') => ({
  ...record,
  [field]: payloadSha256(record),
});
const writeAtomic = (filename, content) => {
  const target = absolute(filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, target);
};

function verifiedFile(declaration, kind) {
  if (!declaration || typeof declaration !== 'object') {
    return { status: 'WAITING', reason: `${kind} declaration is absent.` };
  }
  if (!declaration.path || !declaration.sha256 || !Number.isInteger(declaration.bytes)) {
    return { status: 'WAITING', reason: `${kind} declaration lacks path/hash/bytes.` };
  }
  if (!fs.existsSync(absolute(declaration.path))) {
    return { status: 'WAITING', reason: `${kind} file does not exist.` };
  }
  const observed = binding(declaration.path);
  if (observed.sha256 !== declaration.sha256 || observed.bytes !== declaration.bytes) {
    return { status: 'WAITING', reason: `${kind} file hash or byte length mismatches.`, observed };
  }
  return { status: 'PASS', binding: observed };
}

function rasterSignaturePass(filename) {
  const bytes = fs.readFileSync(absolute(filename));
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]))) return true;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  return bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

function sqliteSignaturePass(filename) {
  const bytes = fs.readFileSync(absolute(filename));
  return bytes.length >= 16 && bytes.subarray(0, 16).toString('binary') === 'SQLite format 3\u0000';
}

const contractBinding = binding(CONTRACT_PATH);
invariant(contractBinding.sha256 === EXPECTED_CONTRACT_SHA256,
  `release contract must be ${EXPECTED_CONTRACT_SHA256}, observed ${contractBinding.sha256}`);
const contract = readJson(CONTRACT_PATH);
const r13Node = contract.releaseSequence?.find(({ id }) => id === R13_NODE_ID);
invariant(r13Node && JSON.stringify(r13Node.requiredGates) === JSON.stringify(REQUIRED_GATES),
  'R13 node or G16-G19 gate list drifted');
const r13Binding = binding(R13_REPORT_PATH);
const r13 = readJson(R13_REPORT_PATH);
invariant(r13.release?.releaseNodeId === R13_NODE_ID, 'pre-publication R13 report binds another node');
const r13Gates = Object.fromEntries(r13.gates.map(({ id, status }) => [id, status]));
const physicalDependenciesReady = r13.requiredDependencies?.length === 6
  && r13.requiredDependencies.every(({ status }) => status === 'PASS');
const prePublicationReady = physicalDependenciesReady
  && r13Gates.G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT === 'PASS'
  && r13Gates.G17_FUNCTIONAL_POST_QA === 'PASS';
const controlBindings = {
  releaseContract: contractBinding,
  prePublicationR13Readiness: {
    ...r13Binding,
    status: r13.status,
    readinessPayloadSha256: r13.readinessPayloadSha256,
    requiredDependencyPassCount: r13.requiredDependencies.filter(({ status }) => status === 'PASS').length,
    requiredDependencyCount: r13.requiredDependencies.length,
    g16Status: r13Gates.G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT,
    g17Status: r13Gates.G17_FUNCTIONAL_POST_QA,
  },
};

function terminalAcceptance() {
  const sourceBindings = {
    ledger: maybeBinding(SOURCES.terminalLedger),
    independentPostQa: maybeBinding(SOURCES.terminalQa),
  };
  const waits = [];
  if (!prePublicationReady) {
    waits.push('Pre-publication R13 readiness does not yet have all six dependency closures plus G16/G17 PASS.');
  }
  if (!sourceBindings.ledger.exists) waits.push('Terminal executed/reversible ledger was not supplied.');
  if (!sourceBindings.independentPostQa.exists) waits.push('Independent terminal post QA was not supplied.');
  let terminalCompleteSaveSha256 = null;
  let terminalPostRoot = null;
  let ledger = null;
  let qa = null;
  if (sourceBindings.ledger.exists && sourceBindings.independentPostQa.exists) {
    try {
      ledger = readJson(SOURCES.terminalLedger);
      qa = readJson(SOURCES.terminalQa);
    } catch (error) {
      waits.push(`Terminal evidence JSON is invalid: ${error.message}`);
    }
  }
  if (ledger && qa) {
    terminalCompleteSaveSha256 = ledger.postSnapshot?.completeSaveSha256 ?? null;
    terminalPostRoot = ledger.postSnapshot?.root ?? null;
    if (ledger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE') {
      waits.push('Terminal ledger is not EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE.');
    }
    if (!terminalCompleteSaveSha256 || !terminalPostRoot) {
      waits.push('Terminal ledger lacks immutable post root or complete-save hash.');
    }
    for (const item of [ledger.postSnapshot?.identity, ledger.postSnapshot?.completeSaveIntake]) {
      const verified = verifiedFile(item, 'terminal post binding');
      if (verified.status !== 'PASS') waits.push(verified.reason);
    }
    const intakePath = ledger.postSnapshot?.completeSaveIntake?.path;
    if (intakePath && fs.existsSync(absolute(intakePath))) {
      const intake = readJson(intakePath);
      if (intake.status !== 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE') {
        waits.push('Terminal complete-save intake is not accepted PASS.');
      }
    }
    const reverse = ledger.rollbackPoststatePreflights ?? [];
    if (!reverse.length) waits.push('Terminal ledger has no rollback post-state preflights.');
    for (const item of reverse) {
      const verified = verifiedFile(item, 'terminal rollback preflight');
      if (verified.status !== 'PASS') waits.push(verified.reason);
      else {
        const report = readJson(item.path);
        const reportPass = report.status?.startsWith('PASS')
          || (report.failureCount === 0 && report.passedCount > 0)
          || (report.summary?.failed === 0 && report.summary?.passed > 0);
        if (!reportPass) waits.push('Terminal rollback preflight does not carry a complete PASS result.');
      }
    }
    if (!machinePass(qa)) waits.push('Independent terminal post QA is not PASS.');
    if (qa.ledger?.sha256 !== sourceBindings.ledger.sha256) {
      waits.push('Independent terminal post QA does not hash-bind the supplied ledger.');
    }
    if (qa.postSnapshot?.completeSaveSha256 !== terminalCompleteSaveSha256) {
      waits.push('Independent terminal post QA and ledger bind different complete saves.');
    }
  }
  const pass = waits.length === 0;
  return withPayload({
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-terminal-post-acceptance-v1',
    generatedAtUtc: GENERATED_AT,
    status: pass ? 'PASS_R13_G18_TERMINAL_POST_ACCEPTED' : 'WAITING_R13_G18_TERMINAL_POST_ACCEPTANCE',
    terminalCompleteSaveSha256,
    terminalPostRoot,
    controlBindings,
    sourceBindings,
    verification: {
      prePublicationR13Ready: prePublicationReady,
      terminalLedgerAccepted: Boolean(ledger?.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'),
      independentPostQaAccepted: Boolean(qa && machinePass(qa)),
      waitingReasons: waits,
    },
    safetyBoundary: {
      readOnly: true,
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      canonicalBuildopsReadOrModified: false,
      serviceMutationsPerformed: false,
    },
  });
}

function mediaAcceptance(terminal) {
  const sourceBinding = maybeBinding(SOURCES.mediaEvidence);
  const waits = [];
  let source = null;
  const items = [];
  if (!terminal.status.startsWith('PASS')) waits.push('Terminal post acceptance is not PASS.');
  if (!sourceBinding.exists) waits.push('Matched media evidence was not supplied.');
  if (sourceBinding.exists) {
    try { source = readJson(SOURCES.mediaEvidence); } catch (error) {
      waits.push(`Matched media evidence JSON is invalid: ${error.message}`);
    }
  }
  if (source) {
    if (!machinePass(source) || source.coverageComplete !== true) {
      waits.push('Matched media evidence lacks PASS plus explicit complete coverage.');
    }
    if (!terminal.terminalCompleteSaveSha256
      || source.terminalCompleteSaveSha256 !== terminal.terminalCompleteSaveSha256) {
      waits.push('Matched media does not bind the accepted terminal complete save.');
    }
    if (!Array.isArray(source.items) || source.items.length === 0) {
      waits.push('Matched media evidence contains no captures.');
    } else {
      for (const item of source.items) {
        const verified = verifiedFile(item, `media item ${item?.id ?? '<unknown>'}`);
        const matched = Array.isArray(item?.matchedFeatureIds) && item.matchedFeatureIds.length > 0;
        const signature = verified.status === 'PASS' && rasterSignaturePass(item.path);
        if (verified.status !== 'PASS') waits.push(verified.reason);
        if (!matched) waits.push(`Media item ${item?.id ?? '<unknown>'} has no matched feature IDs.`);
        if (!signature) waits.push(`Media item ${item?.id ?? '<unknown>'} is not a recognized PNG/JPEG/WebP.`);
        items.push({
          id: item?.id ?? null,
          ...(verified.binding ?? { path: item?.path ?? null, sha256: item?.sha256 ?? null, bytes: item?.bytes ?? null }),
          matchedFeatureIds: item?.matchedFeatureIds ?? [],
          status: verified.status === 'PASS' && matched && signature ? 'PASS' : 'WAITING',
        });
      }
    }
  }
  const pass = waits.length === 0;
  return withPayload({
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-matched-media-acceptance-v1',
    generatedAtUtc: GENERATED_AT,
    status: pass ? 'PASS_R13_G18_MATCHED_MEDIA_ACCEPTED' : 'WAITING_R13_G18_MATCHED_MEDIA',
    terminalCompleteSaveSha256: terminal.terminalCompleteSaveSha256,
    controlBindings,
    sourceEvidence: sourceBinding,
    coverageComplete: pass,
    items,
    waitingReasons: waits,
    evidenceCreationPerformed: false,
    externalPublicationPerformed: false,
  });
}

function mapAcceptance(terminal, media, mediaSerializedSha256) {
  const sourceBinding = maybeBinding(SOURCES.mapEvidence);
  const waits = [];
  let source = null;
  const artifacts = [];
  if (!terminal.status.startsWith('PASS')) waits.push('Terminal post acceptance is not PASS.');
  if (!media.status.startsWith('PASS')) waits.push('Matched media acceptance is not PASS.');
  if (!sourceBinding.exists) waits.push('Terminal map QA evidence was not supplied.');
  if (sourceBinding.exists) {
    try { source = readJson(SOURCES.mapEvidence); } catch (error) {
      waits.push(`Terminal map QA evidence JSON is invalid: ${error.message}`);
    }
  }
  if (source) {
    if (!machinePass(source) || source.coverageComplete !== true) {
      waits.push('Terminal map QA lacks PASS plus explicit complete coverage.');
    }
    if (!terminal.terminalCompleteSaveSha256
      || source.terminalCompleteSaveSha256 !== terminal.terminalCompleteSaveSha256) {
      waits.push('Terminal map QA does not bind the accepted terminal complete save.');
    }
    if (source.matchedMediaEvidenceSha256 !== media.sourceEvidence.sha256) {
      waits.push('Terminal map QA does not hash-bind the matched media source evidence.');
    }
    if (!Array.isArray(source.checks) || source.checks.length === 0
      || source.checks.some(({ status }) => status !== 'PASS')) {
      waits.push('Terminal map QA has missing or non-PASS checks.');
    }
    if (!Array.isArray(source.artifacts) || source.artifacts.length === 0) {
      waits.push('Terminal map QA declares no map artifacts.');
    } else {
      for (const item of source.artifacts) {
        const verified = verifiedFile(item, `map artifact ${item?.id ?? '<unknown>'}`);
        if (verified.status !== 'PASS') waits.push(verified.reason);
        artifacts.push({ id: item?.id ?? null, ...(verified.binding ?? item), status: verified.status });
      }
    }
  }
  const pass = waits.length === 0;
  return withPayload({
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-terminal-map-qa-acceptance-v1',
    generatedAtUtc: GENERATED_AT,
    status: pass ? 'PASS_R13_G18_TERMINAL_MAP_QA_ACCEPTED' : 'WAITING_R13_G18_TERMINAL_MAP_QA',
    terminalCompleteSaveSha256: terminal.terminalCompleteSaveSha256,
    controlBindings,
    sourceEvidence: sourceBinding,
    matchedMediaAcceptanceSha256: mediaSerializedSha256,
    checks: source?.checks ?? [],
    artifacts,
    coverageComplete: pass,
    waitingReasons: waits,
    mapGenerationPerformed: false,
    externalPublicationPerformed: false,
  });
}

function databaseAcceptance(terminal) {
  const sourceBinding = maybeBinding(SOURCES.databaseImportEvidence);
  const waits = [];
  let source = null;
  let databaseArtifact = null;
  if (!terminal.status.startsWith('PASS')) waits.push('Terminal post acceptance is not PASS.');
  if (!sourceBinding.exists) waits.push('Database import verification evidence was not supplied.');
  if (sourceBinding.exists) {
    try { source = readJson(SOURCES.databaseImportEvidence); } catch (error) {
      waits.push(`Database import verification JSON is invalid: ${error.message}`);
    }
  }
  if (source) {
    if (!machinePass(source)) waits.push('Database import verification is not PASS.');
    if (!terminal.terminalCompleteSaveSha256
      || source.terminalCompleteSaveSha256 !== terminal.terminalCompleteSaveSha256) {
      waits.push('Database import verification does not bind the accepted terminal complete save.');
    }
    if (!Number.isInteger(source.importedRecordCount) || source.importedRecordCount <= 0
      || source.verifiedRecordCount !== source.importedRecordCount
      || source.mismatchCount !== 0) {
      waits.push('Database import record counts are incomplete or mismatched.');
    }
    if (!source.sourceRecordSetSha256
      || source.sourceRecordSetSha256 !== source.importedRecordSetSha256) {
      waits.push('Source and imported database record-set hashes differ.');
    }
    const verified = verifiedFile(source.databaseArtifact, 'imported database');
    if (verified.status !== 'PASS') waits.push(verified.reason);
    else if (!sqliteSignaturePass(source.databaseArtifact.path)) {
      waits.push('Imported database artifact is not a SQLite 3 file.');
    }
    databaseArtifact = verified.binding ?? source.databaseArtifact ?? null;
  }
  const pass = waits.length === 0;
  return withPayload({
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-database-import-acceptance-v1',
    generatedAtUtc: GENERATED_AT,
    status: pass ? 'PASS_R13_G18_DATABASE_IMPORT_ACCEPTED' : 'WAITING_R13_G18_DATABASE_IMPORT',
    terminalCompleteSaveSha256: terminal.terminalCompleteSaveSha256,
    controlBindings,
    sourceEvidence: sourceBinding,
    importedRecordCount: source?.importedRecordCount ?? 0,
    verifiedRecordCount: source?.verifiedRecordCount ?? 0,
    mismatchCount: source?.mismatchCount ?? null,
    sourceRecordSetSha256: source?.sourceRecordSetSha256 ?? null,
    importedRecordSetSha256: source?.importedRecordSetSha256 ?? null,
    databaseArtifact,
    waitingReasons: waits,
    databaseWriteOrImportPerformed: false,
    externalPublicationPerformed: false,
  });
}

const terminal = terminalAcceptance();
const terminalBytes = Buffer.from(serialize(terminal));
const terminalSha256 = sha256(terminalBytes);
const media = mediaAcceptance(terminal);
const mediaBytes = Buffer.from(serialize(media));
const mediaSha256 = sha256(mediaBytes);
const map = mapAcceptance(terminal, media, mediaSha256);
const mapBytes = Buffer.from(serialize(map));
const mapSha256 = sha256(mapBytes);
const database = databaseAcceptance(terminal);
const databaseBytes = Buffer.from(serialize(database));
const databaseSha256 = sha256(databaseBytes);
const allInputsPass = [terminal, media, map, database].every(({ status }) => status.startsWith('PASS'));
const commonTerminalHash = Boolean(terminal.terminalCompleteSaveSha256)
  && [media, map, database].every(
    ({ terminalCompleteSaveSha256 }) => terminalCompleteSaveSha256 === terminal.terminalCompleteSaveSha256,
  );
const publicationWithoutHash = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-publication-manifest-v1',
  generatedAtUtc: GENERATED_AT,
  status: allInputsPass && commonTerminalHash
    ? 'PASS_R13_G18_MEDIA_AND_PUBLICATION_ACCEPTED'
    : 'WAITING_R13_G18_MEDIA_AND_PUBLICATION',
  terminalCompleteSaveSha256: terminal.terminalCompleteSaveSha256,
  controlBindings,
  evidenceBindings: {
    'terminal-accepted-post': { path: relative(`${BINDING_ROOT}/terminal-post-acceptance.json`), sha256: terminalSha256, bytes: terminalBytes.length },
    'matched-media': { path: relative(`${BINDING_ROOT}/matched-media-manifest.json`), sha256: mediaSha256, bytes: mediaBytes.length },
    'terminal-map-qa': { path: relative(`${BINDING_ROOT}/terminal-map-qa.json`), sha256: mapSha256, bytes: mapBytes.length },
    'database-import-verification': { path: relative(`${BINDING_ROOT}/database-import-verification.json`), sha256: databaseSha256, bytes: databaseBytes.length },
  },
  gates: {
    terminalPostAcceptance: terminal.status.startsWith('PASS') ? 'PASS' : 'WAITING',
    matchedMedia: media.status.startsWith('PASS') ? 'PASS' : 'WAITING',
    terminalMapQa: map.status.startsWith('PASS') ? 'PASS' : 'WAITING',
    databaseImportVerification: database.status.startsWith('PASS') ? 'PASS' : 'WAITING',
    commonTerminalPostBinding: commonTerminalHash ? 'PASS' : 'WAITING',
  },
  externalPublicationPerformed: false,
  publicationAuthorized: allInputsPass && commonTerminalHash,
  safetyBoundary: {
    readOnlyEvidenceVerification: true,
    mediaCapturedOrCreated: false,
    mapGeneratedOrModified: false,
    databaseWrittenOrImported: false,
    externalPublicationPerformed: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    canonicalBuildopsReadOrModified: false,
    serviceMutationsPerformed: false,
  },
};
const publication = withPayload(publicationWithoutHash, 'publicationPayloadSha256');

writeAtomic(OUTPUTS.terminal, terminalBytes);
writeAtomic(OUTPUTS.media, mediaBytes);
writeAtomic(OUTPUTS.map, mapBytes);
writeAtomic(OUTPUTS.database, databaseBytes);
writeAtomic(OUTPUTS.publication, serialize(publication));

process.stdout.write(`${JSON.stringify({
  status: publication.status,
  outputRoot: relative(OUT_ROOT),
  terminalStatus: terminal.status,
  mediaStatus: media.status,
  mapStatus: map.status,
  databaseStatus: database.status,
  publicationPayloadSha256: publication.publicationPayloadSha256,
  externalPublicationPerformed: false,
}, null, 2)}\n`);
