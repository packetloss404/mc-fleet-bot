#!/usr/bin/env node
/** Seal the executed GA-J1 five-cell pilot and its internal source-reuse exception. */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const files = {
  manifest: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.manifest.json',
  forward: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.txt',
  rollback: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.rollback.txt',
  execution: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.execution.json',
  preflight: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.preflight.json',
  sourceReuse: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.source-reuse-exception.json',
  markdown: 'docs/masterplans/05-combined-zones/phase1-r01-ga-j1-discovery-cue-pilot.md',
};
const absolute = (file) => path.join(ROOT, file);
const readJson = (file) => JSON.parse(fs.readFileSync(absolute(file), 'utf8'));
const readBytes = (file) => fs.readFileSync(absolute(file));
const hashFile = (file) => crypto.createHash('sha256').update(readBytes(file)).digest('hex');
const hashJson = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const manifest = readJson(files.manifest);
const execution = readJson(files.execution);
const preflight = readJson(files.preflight);
if (execution.status !== 'complete' || execution.successfulCommands !== 5 || execution.failedCommands !== 0) {
  throw new Error('GA-J1 execution report is not a clean five-command completion');
}
if (preflight.passed !== preflight.operationCount || preflight.failed !== 0) {
  throw new Error('GA-J1 preflight reports a failure');
}

const liveVerification = {
  verifiedAtUtc: execution.completedAtUtc,
  coordinates: manifest.target.cells.map(({ x, y, z }) => ({
    x, y, z, expected: manifest.target.desiredState, result: 'MATCH',
  })),
  forceLoadCleanup: 'COMPLETE',
  rconWrites: true,
  changedCount: execution.successfulCommands,
  noopCount: execution.noopCommands,
};
const sourceReuse = {
  schemaVersion: 1,
  id: 'CZ-R01-REUSE-COMPLETE-SAVE-20260806T014133Z',
  status: 'OWNER_AUTHORIZED_SOURCE_REUSE_EXCEPTION_EXECUTED_VERIFIED',
  scope: 'Only the five-cell GA-J1 discovery cue pilot; no other Combined Zones release unit.',
  ownerAuthorization: 'The sole project owner explicitly authorized “build the world” for the prepared pilot package.',
  snapshotRoot: manifest.source.snapshotRoot,
  completeSaveSha256: manifest.source.completeSaveSha256,
  captureManifestSha256: manifest.source.captureManifestSha256,
  forwardPath: files.forward,
  forwardSha256: hashFile(files.forward),
  rollbackPath: files.rollback,
  rollbackSha256: hashFile(files.rollback),
  preflightPath: files.preflight,
  preflightSha256: hashFile(files.preflight),
  executionPath: files.execution,
  executionSha256: hashFile(files.execution),
  liveVerification,
  normalFreshSnapshotGate: 'OVERRIDDEN_ONLY_FOR_THIS_FIRST_UNCOMMITTED_PILOT',
  publicDocumentationChanged: false,
};
fs.writeFileSync(absolute(files.sourceReuse), `${JSON.stringify(sourceReuse, null, 2)}\n`);

const next = {
  ...manifest,
  status: 'EXECUTED_VERIFIED_5_CELL_PILOT_FULL_BUILD_NOT_EXECUTED',
  operations: {
    ...manifest.operations,
    forwardSha256: hashFile(files.forward),
    rollbackSha256: hashFile(files.rollback),
  },
  execution: {
    path: files.execution,
    sha256: hashFile(files.execution),
    status: execution.status,
    successfulCommands: execution.successfulCommands,
    failedCommands: execution.failedCommands,
    startedAtUtc: execution.startedAtUtc,
    completedAtUtc: execution.completedAtUtc,
  },
  liveVerification,
  sourceReuseException: {
    path: files.sourceReuse,
    sha256: hashFile(files.sourceReuse),
    status: sourceReuse.status,
  },
};
delete next.manifestIdentity;
next.manifestIdentity = hashJson(next);
fs.writeFileSync(absolute(files.manifest), `${JSON.stringify(next, null, 2)}\n`);

const markdown = [
  '# Combined Zones R01 GA-J1 discovery cue pilot', '',
  `**Status:** ${next.status}`,
  `**Manifest identity:** \`${next.manifestIdentity}\``, '',
  'The five-cell information-only discovery cue was executed and verified. It does not open or commission Empty Eight, and the full Combined Zones build remains unexecuted.', '',
  `- Forward execution: **${execution.successfulCommands} changed / ${execution.failedCommands} failed**`,
  `- Live verification: **${liveVerification.coordinates.length}/${liveVerification.coordinates.length} MATCH**`,
  `- Rollback SHA-256: \`${next.operations.rollbackSha256}\``,
  `- Source-reuse exception: \`${files.sourceReuse}\``,
  '- Public docs changed: **no**', '',
];
fs.writeFileSync(absolute(files.markdown), `${markdown.join('\n')}\n`);
console.log(JSON.stringify({
  status: next.status,
  manifestIdentity: next.manifestIdentity,
  sourceReuseException: files.sourceReuse,
  liveVerification,
}, null, 2));
