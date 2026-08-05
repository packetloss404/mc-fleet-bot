#!/usr/bin/env node
/**
 * Validate a Combined Zones complete saved-world intake package.
 *
 * This tool is deliberately read-only. It never connects to Minecraft or RCON,
 * and it never mutates the supplied world root. A directory merely containing
 * plausible files is not treated as same-moment evidence: PASS also requires a
 * non-self-issued capture manifest whose canonical inventory matches every
 * required file byte-for-byte.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCRIPT_PATH = 'scripts/audit_combined_zones_complete_save.mjs';
const DEFAULT_WORLD_ROOT =
  'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z';
const DEFAULT_JSON =
  'masterplans/05-combined-zones/phase1-complete-save-intake-audit.json';
const DEFAULT_MARKDOWN =
  'masterplans/05-combined-zones/phase1-complete-save-intake-audit.md';
const CAPTURE_MANIFEST_NAME = 'combined-zones-complete-save-capture.json';
const REQUIRED_DIRECTORIES = Object.freeze(['region', 'entities', 'poi']);
const DEPENDENCY_PATH_PARTS = new Set(['node_modules', '.pnpm', '.yarn', 'vendor']);

const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const WORLD_ROOT = path.resolve(value('--world-root', DEFAULT_WORLD_ROOT));
const OUTPUT = path.resolve(value('--out', DEFAULT_JSON));
const MARKDOWN = path.resolve(value('--markdown', DEFAULT_MARKDOWN));
const GENERATED_AT = value('--generated-at', '2026-08-05T01:00:00Z');

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..');
}

if (isInside(WORLD_ROOT, OUTPUT) || isInside(WORLD_ROOT, MARKDOWN)) {
  throw new Error('Audit outputs must be outside the supplied saved-world root.');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalize(valueToCanonicalize) {
  if (Array.isArray(valueToCanonicalize)) {
    return valueToCanonicalize.map(canonicalize);
  }
  if (valueToCanonicalize && typeof valueToCanonicalize === 'object') {
    return Object.fromEntries(Object.keys(valueToCanonicalize)
      .sort()
      .map((key) => [key, canonicalize(valueToCanonicalize[key])]));
  }
  return valueToCanonicalize;
}

function canonicalJson(valueToCanonicalize) {
  return JSON.stringify(canonicalize(valueToCanonicalize));
}

function lexicalCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function posixPath(filename) {
  return filename.split(path.sep).join('/');
}

function displayPath(filename) {
  const relative = path.relative(ROOT, filename);
  if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`)) {
    return posixPath(relative);
  }
  if (relative === '') return '.';
  return posixPath(filename);
}

function pathHasDependencyPart(filename) {
  return path.resolve(filename).split(path.sep).some((part) => DEPENDENCY_PATH_PARTS.has(part));
}

function safeLstat(filename) {
  try {
    return fs.lstatSync(filename);
  } catch {
    return null;
  }
}

function directWorldShape(directory) {
  const rootStat = safeLstat(directory);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) return false;
  for (const name of REQUIRED_DIRECTORIES) {
    const stat = safeLstat(path.join(directory, name));
    if (!stat?.isDirectory() || stat.isSymbolicLink()) return false;
  }
  const levelStat = safeLstat(path.join(directory, 'level.dat'));
  return Boolean(levelStat?.isFile() && !levelStat.isSymbolicLink());
}

function findNestedWorldShapes(directory, maxDepth = 2) {
  const matches = [];
  const visit = (current, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => lexicalCompare(a.name, b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const child = path.join(current, entry.name);
      if (pathHasDependencyPart(child)) continue;
      if (directWorldShape(child)) matches.push(displayPath(child));
      visit(child, depth + 1);
    }
  };
  visit(directory, 1);
  return [...new Set(matches)].sort(lexicalCompare);
}

function hashStableFile(filename, relativePath) {
  const before = fs.statSync(filename, { bigint: true });
  const data = fs.readFileSync(filename);
  const after = fs.statSync(filename, { bigint: true });
  const stable = before.dev === after.dev
    && before.ino === after.ino
    && before.size === after.size
    && before.mtimeNs === after.mtimeNs;
  return {
    path: posixPath(relativePath),
    bytes: data.length,
    sha256: sha256(data),
    stableDuringAudit: stable,
  };
}

function inspectRequiredDirectory(name, symlinkPaths, unexpectedPaths) {
  const directory = path.join(WORLD_ROOT, name);
  const stat = safeLstat(directory);
  if (!stat) {
    return { name, path: displayPath(directory), present: false, regularDirectory: false, members: [] };
  }
  if (stat.isSymbolicLink()) symlinkPaths.push(displayPath(directory));
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return { name, path: displayPath(directory), present: true, regularDirectory: false, members: [] };
  }

  const members = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => lexicalCompare(a.name, b.name))) {
    const filename = path.join(directory, entry.name);
    const relativePath = path.join(name, entry.name);
    if (entry.isSymbolicLink()) {
      symlinkPaths.push(displayPath(filename));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.mca')) {
      unexpectedPaths.push(displayPath(filename));
      continue;
    }
    members.push(hashStableFile(filename, relativePath));
  }
  return {
    name,
    path: displayPath(directory),
    present: true,
    regularDirectory: true,
    members,
  };
}

function validUtc(valueToCheck) {
  return typeof valueToCheck === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(valueToCheck)
    && Number.isFinite(Date.parse(valueToCheck));
}

function validateCaptureProtocol(manifest) {
  const protocol = manifest?.captureProtocol;
  const keys = [
    'saveOffConfirmedAtUtc',
    'saveAllFlushCompletedAtUtc',
    'copyStartedAtUtc',
    'copyCompletedAtUtc',
    'saveOnRestoredAtUtc',
  ];
  if (!protocol || keys.some((key) => !validUtc(protocol[key]))) {
    return { valid: false, reason: 'All five ordered UTC capture-protocol timestamps are required.' };
  }
  const times = keys.map((key) => Date.parse(protocol[key]));
  if (times.some((time, index) => index > 0 && time < times[index - 1])) {
    return { valid: false, reason: 'Capture-protocol timestamps are not monotonic.' };
  }
  if (!validUtc(manifest.capturedAtUtc)
      || manifest.capturedAtUtc !== protocol.copyCompletedAtUtc) {
    return { valid: false, reason: 'capturedAtUtc must equal copyCompletedAtUtc.' };
  }
  if (manifest.immutableCopy !== true) {
    return { valid: false, reason: 'immutableCopy must be true.' };
  }
  for (const key of ['captureId', 'worldIdentity', 'sourceAuthority', 'captureTool']) {
    if (typeof manifest[key] !== 'string' || manifest[key].trim() === '') {
      return { valid: false, reason: `${key} must be a nonempty string.` };
    }
  }
  return { valid: true, reason: 'The frozen-copy protocol is explicit and ordered.' };
}

function inspectCaptureManifest(actualMembers, symlinkPaths) {
  const filename = path.join(WORLD_ROOT, CAPTURE_MANIFEST_NAME);
  const stat = safeLstat(filename);
  if (!stat) {
    return {
      path: displayPath(filename),
      present: false,
      regularFile: false,
      sha256: null,
      parseValid: false,
      protocolValid: false,
      protocolReason: 'Capture manifest is absent.',
      inventoryExact: false,
      inventoryDifferences: ['capture manifest absent'],
      manifest: null,
    };
  }
  if (stat.isSymbolicLink()) symlinkPaths.push(displayPath(filename));
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return {
      path: displayPath(filename),
      present: true,
      regularFile: false,
      sha256: null,
      stableDuringAudit: false,
      parseValid: false,
      protocolValid: false,
      protocolReason: 'Capture manifest is not a regular non-symlink file.',
      inventoryExact: false,
      inventoryDifferences: ['capture manifest is not a regular file'],
      manifest: null,
    };
  }

  const before = fs.statSync(filename, { bigint: true });
  const data = fs.readFileSync(filename);
  const after = fs.statSync(filename, { bigint: true });
  const stableDuringAudit = before.dev === after.dev
    && before.ino === after.ino
    && before.size === after.size
    && before.mtimeNs === after.mtimeNs;
  let manifest;
  try {
    manifest = JSON.parse(data.toString('utf8'));
  } catch {
    return {
      path: displayPath(filename),
      present: true,
      regularFile: true,
      sha256: sha256(data),
      stableDuringAudit,
      parseValid: false,
      protocolValid: false,
      protocolReason: 'Capture manifest is not valid JSON.',
      inventoryExact: false,
      inventoryDifferences: ['capture manifest JSON parse failed'],
      manifest: null,
    };
  }

  const memberRecordsValid = Array.isArray(manifest.requiredMembers)
    && manifest.requiredMembers.every((member) => (
      member
      && typeof member.path === 'string'
      && (/^(?:region|entities|poi)\/[^/]+\.mca$/.test(member.path)
        || member.path === 'level.dat')
      && Number.isSafeInteger(member.bytes)
      && member.bytes > 0
      && typeof member.sha256 === 'string'
      && /^[a-f0-9]{64}$/.test(member.sha256)
    ));
  const schemaValid = manifest.schemaVersion === 1
    && manifest.id === 'combined-zones-complete-save-capture'
    && memberRecordsValid;
  const protocol = schemaValid
    ? validateCaptureProtocol(manifest)
    : { valid: false, reason: 'Capture manifest schema or id is invalid.' };
  const declaredMembers = schemaValid
    ? manifest.requiredMembers.map(({ path: memberPath, bytes, sha256: memberSha256 }) => ({
      path: memberPath,
      bytes,
      sha256: memberSha256,
    })).sort((a, b) => lexicalCompare(a.path, b.path))
    : [];
  const actualCanonical = actualMembers.map(({ path: memberPath, bytes, sha256: memberSha256 }) => ({
    path: memberPath,
    bytes,
    sha256: memberSha256,
  }));
  const declaredByPath = new Map(declaredMembers.map((member) => [member.path, member]));
  const actualByPath = new Map(actualCanonical.map((member) => [member.path, member]));
  const inventoryDifferences = [];
  const declaredPathCounts = new Map();
  for (const member of declaredMembers) {
    declaredPathCounts.set(member.path, (declaredPathCounts.get(member.path) ?? 0) + 1);
  }
  for (const [memberPath, count] of declaredPathCounts) {
    if (count > 1) inventoryDifferences.push(`duplicate declared member: ${memberPath}`);
  }
  for (const member of actualCanonical) {
    const declared = declaredByPath.get(member.path);
    if (!declared) inventoryDifferences.push(`undeclared actual member: ${member.path}`);
    else if (declared.bytes !== member.bytes || declared.sha256 !== member.sha256) {
      inventoryDifferences.push(`hash/size drift: ${member.path}`);
    }
  }
  for (const member of declaredMembers) {
    if (!actualByPath.has(member.path)) {
      inventoryDifferences.push(`declared member absent: ${member.path}`);
    }
  }

  return {
    path: displayPath(filename),
    present: true,
    regularFile: true,
    sha256: sha256(data),
    stableDuringAudit,
    parseValid: schemaValid,
    protocolValid: protocol.valid,
    protocolReason: protocol.reason,
    inventoryExact: schemaValid && inventoryDifferences.length === 0,
    inventoryDifferences,
    manifest: schemaValid ? {
      schemaVersion: manifest.schemaVersion,
      id: manifest.id,
      captureId: manifest.captureId,
      worldIdentity: manifest.worldIdentity,
      sourceAuthority: manifest.sourceAuthority,
      captureTool: manifest.captureTool,
      capturedAtUtc: manifest.capturedAtUtc,
      immutableCopy: manifest.immutableCopy,
      captureProtocol: manifest.captureProtocol,
      requiredMemberCount: manifest.requiredMembers.length,
    } : null,
  };
}

function makeCheck(id, passed, detail) {
  return { id, status: passed ? 'PASS' : 'HOLD', detail };
}

function markdownEscape(valueToEscape) {
  return String(valueToEscape).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function renderMarkdown(report) {
  const memberRows = report.requiredMembers.length > 0
    ? report.requiredMembers.map((member) => (
      `| \`${markdownEscape(member.path)}\` | ${member.bytes} | \`${member.sha256}\` | ${member.stableDuringAudit ? 'PASS' : 'HOLD'} |`
    )).join('\n')
    : '| — | 0 | — | HOLD |';
  const blockerRows = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- **${blocker.id}:** ${blocker.detail}`).join('\n')
    : '- None.';
  return `# Combined Zones complete saved-world intake audit

Status: **${report.status} — READ-ONLY — ZERO OPERATIONS**

This audit validates one supplied saved-world root. A PASS requires nonempty \`region/\`, \`entities/\`, and \`poi/\` MCA sets, a nonempty \`level.dat\`, no symlinks or dependency-sample path, stable reads, and an exact non-self-issued capture manifest binding the frozen-copy protocol and every required member hash.

## Result

| Field | Value |
|---|---|
| Supplied root | \`${markdownEscape(report.input.suppliedWorldRoot)}\` |
| Direct world shape | ${report.rootInspection.directWorldShape ? 'yes' : 'no'} |
| Capture manifest | ${report.captureManifest.present ? `\`${markdownEscape(report.captureManifest.path)}\`` : 'absent'} |
| Required members | ${report.summary.requiredMemberCount} |
| Required bytes | ${report.summary.requiredBytes} |
| Complete-save SHA-256 | ${report.packageIdentity.completeSaveSha256 ? `\`${report.packageIdentity.completeSaveSha256}\`` : 'not sealed'} |
| World edit authorized | no |

## Capture-manifest contract

The supplied root must contain \`${CAPTURE_MANIFEST_NAME}\` with schema version 1 and id \`combined-zones-complete-save-capture\`. It must record nonempty \`captureId\`, \`worldIdentity\`, \`sourceAuthority\`, and \`captureTool\` strings; set \`immutableCopy\` to true; bind \`capturedAtUtc\` to the copy-completion time; record ordered save-off, flush, copy-start, copy-complete, and save-on UTC timestamps; and list every required member's relative path, byte count, and SHA-256 exactly once.

## Checks

| Check | Status | Detail |
|---|---|---|
${report.checks.map((check) => `| ${check.id} | **${check.status}** | ${markdownEscape(check.detail)} |`).join('\n')}

## Required-member inventory

| Path | Bytes | SHA-256 | Stable read |
|---|---:|---|---|
${memberRows}

## Blocking evidence

${blockerRows}

No live system was contacted, no RCON command was issued, no supplied-save file was written, no operation was emitted, and no world edit is authorized.
`;
}

function audit() {
  const rootLstat = safeLstat(WORLD_ROOT);
  let rootRealPath = null;
  try {
    rootRealPath = fs.realpathSync(WORLD_ROOT);
  } catch {
    // A missing/unreadable root is represented by the checks below.
  }
  const rootRegularDirectory = Boolean(
    rootLstat?.isDirectory() && !rootLstat.isSymbolicLink(),
  );
  const dependencySamplePath = pathHasDependencyPart(WORLD_ROOT)
    || (rootRealPath !== null && pathHasDependencyPart(rootRealPath));
  const nestedWorldShapeCandidates = rootRegularDirectory
    ? findNestedWorldShapes(WORLD_ROOT)
    : [];
  const symlinkPaths = [];
  const unexpectedPaths = [];
  if (rootLstat?.isSymbolicLink()) symlinkPaths.push(displayPath(WORLD_ROOT));

  const directoryInspections = REQUIRED_DIRECTORIES.map(
    (name) => inspectRequiredDirectory(name, symlinkPaths, unexpectedPaths),
  );
  const levelPath = path.join(WORLD_ROOT, 'level.dat');
  const levelStat = safeLstat(levelPath);
  if (levelStat?.isSymbolicLink()) symlinkPaths.push(displayPath(levelPath));
  let levelMember = null;
  if (levelStat?.isFile() && !levelStat.isSymbolicLink()) {
    levelMember = hashStableFile(levelPath, 'level.dat');
  }

  const requiredMembers = [
    ...directoryInspections.flatMap(({ members }) => members),
    ...(levelMember ? [levelMember] : []),
  ].sort((a, b) => lexicalCompare(a.path, b.path));
  const captureManifest = inspectCaptureManifest(requiredMembers, symlinkPaths);
  const noSymlinks = symlinkPaths.length === 0;
  const noUnexpectedMembers = unexpectedPaths.length === 0;
  const directorySetComplete = directoryInspections.every(
    ({ regularDirectory, members }) => regularDirectory && members.length > 0,
  );
  const levelComplete = Boolean(levelMember && levelMember.bytes > 0);
  const stableReads = requiredMembers.every(({ stableDuringAudit }) => stableDuringAudit)
    && (!captureManifest.present || captureManifest.stableDuringAudit === true);
  const directShape = directWorldShape(WORLD_ROOT);
  const unambiguousRoot = directShape && nestedWorldShapeCandidates.length === 0;

  const inventoryPayload = requiredMembers.map(({ path: memberPath, bytes, sha256: memberSha256 }) => ({
    path: memberPath,
    bytes,
    sha256: memberSha256,
  }));
  const canonicalInventorySha256 = requiredMembers.length > 0
    ? sha256(`${canonicalJson(inventoryPayload)}\n`)
    : null;

  const checks = [
    makeCheck(
      'CS01-SUPPLIED-ROOT',
      rootRegularDirectory,
      rootRegularDirectory
        ? 'The supplied path is a regular non-symlink directory.'
        : 'The supplied path is missing, unreadable, not a directory, or is a symlink.',
    ),
    makeCheck(
      'CS02-DEPENDENCY-SAMPLE-EXCLUSION',
      !dependencySamplePath,
      dependencySamplePath
        ? 'The supplied or resolved path is inside a dependency/sample tree.'
        : 'The supplied and resolved paths are outside dependency/sample trees.',
    ),
    makeCheck(
      'CS03-UNAMBIGUOUS-WORLD-ROOT',
      unambiguousRoot,
      unambiguousRoot
        ? 'The supplied directory itself has the required world shape and contains no nested competing world root.'
        : `The supplied directory is not the direct unambiguous world root; nested candidates: ${nestedWorldShapeCandidates.length}.`,
    ),
    ...directoryInspections.map((inspection) => makeCheck(
      `CS04-${inspection.name.toUpperCase()}-MCA-SET`,
      inspection.regularDirectory && inspection.members.length > 0,
      inspection.regularDirectory
        ? `${inspection.members.length} regular MCA member(s) found.`
        : `${inspection.name}/ is absent, non-directory, or a symlink.`,
    )),
    makeCheck(
      'CS05-LEVEL-DAT',
      levelComplete,
      levelComplete
        ? `level.dat is a ${levelMember.bytes}-byte regular file.`
        : 'level.dat is absent, empty, non-regular, or a symlink.',
    ),
    makeCheck(
      'CS06-NO-SYMLINKS',
      noSymlinks,
      noSymlinks ? 'No symlink exists at the root or among required inputs.' : `${symlinkPaths.length} symlink path(s) found.`,
    ),
    makeCheck(
      'CS07-CANONICAL-DIRECTORY-MEMBERS',
      noUnexpectedMembers,
      noUnexpectedMembers
        ? 'Required directories contain only regular MCA members.'
        : `${unexpectedPaths.length} unexpected or non-regular member(s) found.`,
    ),
    makeCheck(
      'CS08-STABLE-READ',
      stableReads,
      stableReads ? 'Every member retained identical stat identity while hashed.' : 'At least one member changed while being hashed.',
    ),
    makeCheck(
      'CS09-CAPTURE-MANIFEST',
      captureManifest.present && captureManifest.regularFile && captureManifest.parseValid,
      captureManifest.parseValid
        ? `Capture manifest schema is valid; SHA-256 ${captureManifest.sha256}.`
        : captureManifest.protocolReason,
    ),
    makeCheck(
      'CS10-SAME-MOMENT-CAPTURE-PROTOCOL',
      captureManifest.protocolValid,
      captureManifest.protocolReason,
    ),
    makeCheck(
      'CS11-MANIFEST-INVENTORY-EXACT',
      captureManifest.inventoryExact,
      captureManifest.inventoryExact
        ? 'The declared member inventory equals the observed canonical inventory one-to-one.'
        : `${captureManifest.inventoryDifferences.length} inventory difference(s) found.`,
    ),
  ];
  const passed = checks.every(({ status }) => status === 'PASS')
    && directorySetComplete
    && levelComplete;
  const completeSaveSha256 = passed
    ? sha256(`${canonicalJson({
      schemaVersion: 1,
      captureManifestSha256: captureManifest.sha256,
      canonicalInventorySha256,
      requiredMembers: inventoryPayload,
    })}\n`)
    : null;
  checks.push(makeCheck(
    'CS12-COMPLETE-SAVE-IDENTITY',
    completeSaveSha256 !== null,
    completeSaveSha256
      ? `Complete immutable same-moment saved-world identity sealed as ${completeSaveSha256}.`
      : 'A complete saved-world identity cannot be sealed while any preceding check is HOLD.',
  ));

  const blockers = checks
    .filter(({ status }) => status === 'HOLD')
    .map(({ id, detail }) => ({ id, detail }));
  const scriptData = fs.readFileSync(path.join(ROOT, SCRIPT_PATH));
  return {
    schemaVersion: 1,
    id: 'combined-zones-complete-save-intake-audit',
    generatedAtUtc: GENERATED_AT,
    status: completeSaveSha256
      ? 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
      : 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
    executable: false,
    worldEditAuthorized: false,
    operationCellCount: 0,
    operations: [],
    liveCallsPerformed: [],
    input: {
      suppliedWorldRoot: displayPath(WORLD_ROOT),
      captureManifestName: CAPTURE_MANIFEST_NAME,
    },
    toolIdentity: {
      path: SCRIPT_PATH,
      bytes: scriptData.length,
      sha256: sha256(scriptData),
    },
    safetyBoundary: {
      readOnly: true,
      suppliedSaveMutated: false,
      minecraftContacted: false,
      rconInvoked: false,
      dependencySamplesAccepted: false,
      symlinksAccepted: false,
      partialPackagesAccepted: false,
      narrativeSameMomentClaimAccepted: false,
    },
    validationPolicy: {
      requiredDirectories: REQUIRED_DIRECTORIES,
      requiredDirectoryMemberPattern: '*.mca',
      requiredRootFile: 'level.dat',
      everyRequiredSetMustBeNonempty: true,
      captureManifestRequired: true,
      captureProtocolOrder: [
        'save-off confirmed',
        'save-all flush completed',
        'copy started',
        'copy completed',
        'save-on restored',
      ],
      canonicalMemberOrder: 'ascending POSIX relative path by bytewise lexical comparison',
      packageIdentityRule: 'SHA-256 of canonical schema, capture-manifest SHA-256, inventory SHA-256, and exact member records',
    },
    rootInspection: {
      exists: rootLstat !== null,
      regularDirectory: rootRegularDirectory,
      symbolicLink: Boolean(rootLstat?.isSymbolicLink()),
      resolvedPath: rootRealPath ? displayPath(rootRealPath) : null,
      dependencySamplePath,
      directWorldShape: directShape,
      nestedWorldShapeCandidates,
      symlinkPaths: [...new Set(symlinkPaths)].sort(lexicalCompare),
      unexpectedPaths: [...new Set(unexpectedPaths)].sort(lexicalCompare),
    },
    requiredDirectories: directoryInspections,
    requiredMembers,
    captureManifest,
    packageIdentity: {
      canonicalInventorySha256,
      captureManifestSha256: captureManifest.sha256,
      completeSaveSha256,
    },
    checks,
    blockers,
    summary: {
      passed,
      checkCount: checks.length,
      passCount: checks.filter(({ status }) => status === 'PASS').length,
      holdCount: blockers.length,
      requiredMemberCount: requiredMembers.length,
      requiredBytes: requiredMembers.reduce((total, { bytes }) => total + bytes, 0),
      regionFileCount: directoryInspections.find(({ name }) => name === 'region')?.members.length ?? 0,
      entityFileCount: directoryInspections.find(({ name }) => name === 'entities')?.members.length ?? 0,
      poiFileCount: directoryInspections.find(({ name }) => name === 'poi')?.members.length ?? 0,
      levelDatPresent: levelComplete,
      captureManifestValid: captureManifest.parseValid
        && captureManifest.protocolValid
        && captureManifest.inventoryExact,
      autonomousEngineeringMayUseAsCompleteSaveEvidence: passed,
    },
  };
}

const report = audit();
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, renderMarkdown(report));
process.stdout.write(`${JSON.stringify({
  status: report.status,
  suppliedWorldRoot: report.input.suppliedWorldRoot,
  requiredMemberCount: report.summary.requiredMemberCount,
  holdCount: report.summary.holdCount,
  completeSaveSha256: report.packageIdentity.completeSaveSha256,
  output: displayPath(OUTPUT),
  markdown: displayPath(MARKDOWN),
})}\n`);
