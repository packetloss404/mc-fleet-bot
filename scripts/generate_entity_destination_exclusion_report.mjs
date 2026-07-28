#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!['--manifest', '--journal', '--out'].includes(key) || !argv[index + 1]) {
      throw new Error(`expected --manifest, --journal, and --out; got ${key ?? 'EOF'}`);
    }
    args[key.slice(2)] = argv[index + 1];
  }
  if (!args.manifest || !args.journal || !args.out) {
    throw new Error('--manifest, --journal, and --out are required');
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
  const journal = JSON.parse(fs.readFileSync(args.journal, 'utf8'));
  const manifestSha256 = sha256File(args.manifest);
  if (journal.manifestSha256 !== manifestSha256) {
    throw new Error('journal does not bind the supplied manifest');
  }
  if (journal.status !== 'partial-evacuation-completed') {
    throw new Error(`journal is not completed: ${journal.status}`);
  }
  if (
    journal.rows?.length !== manifest.transactionRows?.length
    || journal.rows.some((row) => row.state !== 'completed')
  ) {
    throw new Error('journal does not prove every manifest row completed');
  }

  const rows = manifest.transactionRows.map((row, index) => {
    const journalRow = journal.rows[index];
    if (
      journalRow.manifestIndex !== index
      || journalRow.uuidKey !== row.uuidKey
    ) {
      throw new Error(`journal row ${index + 1} identity mismatch`);
    }
    return {
      transactionIndex: row.transactionIndex,
      uuidKey: row.uuidKey,
      entityType: row.entityType,
      destination: row.sanctuarySlot.destination,
      destinationChunk: row.sanctuarySlot.destinationChunk,
      status: 'FAIL',
      errors: ['occupied-by-completed-relocation'],
    };
  });
  const badDestinationChunks = [...new Map(
    rows.map((row) => [row.destinationChunk.join(','), row.destinationChunk]),
  ).values()].sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  if (badDestinationChunks.length !== rows.length) {
    throw new Error('completed relocation reused a destination chunk');
  }

  const report = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    mode: 'completed-relocation-destination-exclusions',
    manifest: args.manifest,
    manifestSha256,
    journal: args.journal,
    journalSha256: sha256File(args.journal),
    status: 'PASS',
    rows,
    badDestinationChunks,
    counts: {
      completedRelocations: rows.length,
      uniqueOccupiedDestinationChunks: badDestinationChunks.length,
    },
  };
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    status: report.status,
    output: args.out,
    counts: report.counts,
  }, null, 2));
}

main();
