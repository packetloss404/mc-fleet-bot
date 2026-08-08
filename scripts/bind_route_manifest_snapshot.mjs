#!/usr/bin/env node
/** Bind an immutable route manifest to a newly captured region snapshot/package. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const input = value('--input');
const regions = value('--regions');
const pkg = value('--package');
const out = value('--out');
if (!input || !regions || !pkg || !out) {
  throw new Error('usage: bind_route_manifest_snapshot.mjs --input <manifest> --regions <region-dir> --package <ops> --out <manifest>');
}
const resolve = (file) => path.resolve(ROOT, file);
const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(resolve(file))).digest('hex');
const manifest = JSON.parse(fs.readFileSync(resolve(input), 'utf8'));
const snapshot = hashSnapshotDirectory(resolve(regions));
manifest.postSnapshot = {
  directory: path.relative(ROOT, resolve(regions)).split(path.sep).join('/'),
  sha256: snapshot.sha256,
};
manifest.package = {
  file: path.relative(ROOT, resolve(pkg)).split(path.sep).join('/'),
  sha256: sha256File(pkg),
};
manifest.repairProjection = {
  ...(manifest.repairProjection ?? {}),
  id: 'c01-route-preserved-core-2026-08-08',
  operations: manifest.package.file,
  operationsSha256: manifest.package.sha256,
  status: 'EXECUTED_AND_BOUND_TO_FRESH_POST_SNAPSHOT',
};
fs.mkdirSync(path.dirname(resolve(out)), { recursive: true });
fs.writeFileSync(resolve(out), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(JSON.stringify({
  status: 'ROUTE_MANIFEST_BOUND',
  out,
  snapshotSha256: snapshot.sha256,
  packageSha256: manifest.package.sha256,
}, null, 2) + '\n');
