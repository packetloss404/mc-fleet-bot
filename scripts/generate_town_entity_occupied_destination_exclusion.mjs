#!/usr/bin/env node
/** Bind completed evacuation destinations into a reusable exclusion report. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = process.argv[2]
  ?? 'data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh3-preferred.manifest.json';
const journalPath = process.argv[3]
  ?? 'data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh3-preferred.journal.json';
const outPath = process.argv[4]
  ?? 'data/world-review/town-entity-occupied-destination-exclusions.json';
const sha256 = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
const manifestSha256 = sha256(manifestPath);
if (
  journal.status !== 'partial-evacuation-completed'
  || journal.manifestSha256 !== manifestSha256
  || journal.rows?.length !== manifest.transactionRows?.length
) {
  throw new Error('journal is not a complete transaction bound to the manifest');
}
for (let index = 0; index < manifest.transactionRows.length; index += 1) {
  const planned = manifest.transactionRows[index];
  const completed = journal.rows[index];
  if (
    completed.state !== 'completed'
    || completed.teleportIssued !== true
    || completed.uuidKey !== planned.uuidKey
    || JSON.stringify(completed.immutableBefore)
      !== JSON.stringify(completed.immutableAfter)
  ) {
    throw new Error(`journal row ${index + 1} is not exactly completed`);
  }
}
const chunks = manifest.transactionRows.map(
  (row) => row.sanctuarySlot.destinationChunk,
);
if (new Set(chunks.map((chunk) => chunk.join(','))).size !== chunks.length) {
  throw new Error('completed destinations are not unique chunks');
}
const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS_BOUND_COMPLETED_DESTINATIONS',
  sourceManifest: manifestPath,
  sourceManifestSha256: manifestSha256,
  sourceJournal: journalPath,
  sourceJournalSha256: sha256(journalPath),
  completedRows: journal.rows.length,
  badDestinationChunks: chunks.sort(
    (left, right) => left[0] - right[0] || left[1] - right[1],
  ),
  reason: (
    'Chunks contain preserved entities from a completed evacuation and cannot '
    + 'be reused by a later evacuation wave.'
  ),
  worldReleaseAuthorized: false,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: outPath,
  completedRows: report.completedRows,
  excludedChunks: report.badDestinationChunks.length,
}, null, 2));
