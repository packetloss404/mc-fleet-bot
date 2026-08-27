#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const sourceRoot = path.join(REPO_ROOT, 'data/exports/master-plan-build-index-20260822T190000Z');
const sourceMap = path.join(sourceRoot, '00-overall-active-world-surface-atlas.png');
const sourceManifest = path.join(sourceRoot, 'atlas-manifest.json');
const destination = path.join(SITE_ROOT, 'public/atlas/master-plan-build-index.png');
const destinationManifest = path.join(SITE_ROOT, 'public/atlas/master-plan-build-index.manifest.json');

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Master Plan build-index sync rejected: ${message}`);
};
const sha256 = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const binding = (filename) => ({
  path: path.relative(REPO_ROOT, filename).split(path.sep).join('/'),
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});

invariant(fs.existsSync(sourceMap), 'missing generated build-index map');
invariant(fs.existsSync(sourceManifest), 'missing generated build-index manifest');
invariant(fs.statSync(sourceMap).size > 100_000, 'build-index map is unexpectedly small');
const generated = JSON.parse(fs.readFileSync(sourceManifest, 'utf8'));
const map = generated.maps?.find(({ filename }) => filename === path.basename(sourceMap));
invariant(map?.nonblank === true, 'generated map did not pass its nonblank check');
invariant(map.widthPixels === 3434 && map.heightPixels === 2352, 'unexpected build-index dimensions');
invariant(generated.snapshot?.sha256 === '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f', 'unexpected source snapshot');

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(sourceMap, destination);
const source = binding(sourceMap);
const output = binding(destination);
invariant(source.sha256 === output.sha256 && source.bytes === output.bytes, 'copy integrity check failed');

const manifest = {
  schemaVersion: 1,
  id: 'master-plan-build-index-20260822',
  status: 'PASS_CURRENT_SNAPSHOT_BUILD_INDEX_SYNCED',
  purpose: 'Current-snapshot top-down build index spanning the town and Combined Zones extent.',
  sourceSnapshot: generated.snapshot,
  map: {
    source,
    output,
    bounds: map.bounds,
    dimensions: { width: map.widthPixels, height: map.heightPixels },
    orientation: map.orientation,
    note: 'Surface terrain plus explicit labels for below-grade Empty Eight, B09, and Cheyenne systems.',
  },
};
fs.writeFileSync(destinationManifest, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, map: manifest.map }, null, 2)}\n`);
