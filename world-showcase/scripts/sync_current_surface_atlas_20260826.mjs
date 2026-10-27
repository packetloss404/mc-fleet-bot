#!/usr/bin/env node

/**
 * Publish the snapshot-pinned 26 August 2026 surface atlas without changing
 * an older public atlas. This is a read-only asset copy: the source manifest
 * remains the authority for every image hash and geometry field.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE_ROOT = path.join(
  REPO_ROOT,
  'data/exports/world-atlas-current-20260826T160200Z-full/surface',
);
const PUBLIC_DIRECTORY = 'world-atlas-2026-08-26';
const OUTPUT_ROOT = path.join(SITE_ROOT, 'public', PUBLIC_DIRECTORY);
const REQUIRED_METADATA = ['README.md', 'atlas-manifest.json', 'area-inventory.json'];
const EXPECTED_SNAPSHOT_SHA256 = 'ca93ba68a729c359034841cff5636f1c6fe0ce73ad2c64a3736d684aa8865c7b';
const EXPECTED_MAP_COUNT = 7;

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Current surface-atlas sync rejected: ${message}`);
};

const digest = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

const copyExact = (source, destination) => {
  const sourceHash = digest(source);
  if (fs.existsSync(destination)) {
    invariant(digest(destination) === sourceHash,
      `published asset differs from source: ${path.basename(destination)}`);
    return;
  }
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  invariant(digest(destination) === sourceHash,
    `copy hash drift: ${path.basename(destination)}`);
};

invariant(fs.existsSync(SOURCE_ROOT), `missing source ${path.relative(REPO_ROOT, SOURCE_ROOT)}`);
const manifestPath = path.join(SOURCE_ROOT, 'atlas-manifest.json');
invariant(fs.existsSync(manifestPath), 'missing atlas-manifest.json');
const atlas = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
invariant(atlas?.snapshot?.sha256 === EXPECTED_SNAPSHOT_SHA256,
  'source snapshot identity is not the accepted current 26 August snapshot');
invariant(Array.isArray(atlas.maps) && atlas.maps.length === EXPECTED_MAP_COUNT,
  `expected ${EXPECTED_MAP_COUNT} surface maps, found ${Array.isArray(atlas.maps) ? atlas.maps.length : 'no map list'}`);

const seenNames = new Set();
for (const map of atlas.maps) {
  invariant(typeof map.filename === 'string' && map.filename.endsWith('.png'),
    'manifest contains a non-PNG map filename');
  invariant(!path.isAbsolute(map.filename) && !map.filename.includes('..'),
    `unsafe map filename ${map.filename}`);
  invariant(!seenNames.has(map.filename), `duplicate map filename ${map.filename}`);
  seenNames.add(map.filename);
  invariant(typeof map.sha256 === 'string' && /^[a-f0-9]{64}$/.test(map.sha256),
    `missing SHA-256 for ${map.filename}`);
  const source = path.join(SOURCE_ROOT, map.filename);
  invariant(fs.existsSync(source), `missing map asset ${map.filename}`);
  invariant(digest(source) === map.sha256, `source hash mismatch ${map.filename}`);
}

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
for (const filename of REQUIRED_METADATA) {
  const source = path.join(SOURCE_ROOT, filename);
  invariant(fs.existsSync(source), `missing source metadata ${filename}`);
  copyExact(source, path.join(OUTPUT_ROOT, filename));
}
for (const map of atlas.maps) {
  copyExact(path.join(SOURCE_ROOT, map.filename), path.join(OUTPUT_ROOT, map.filename));
}

const publicationLinks = {
  schemaVersion: 1,
  publication: {
    title: 'Active-world surface atlas',
    publishedDirectory: `/${PUBLIC_DIRECTORY}`,
    sourceManifest: 'atlas-manifest.json',
    snapshotSha256: atlas.snapshot.sha256,
    generatedAt: atlas.generatedAt,
    mapCount: atlas.maps.length,
  },
  maps: atlas.maps.map((map) => ({
    filename: map.filename,
    href: `/${PUBLIC_DIRECTORY}/${map.filename}`,
    sha256: map.sha256,
    widthPixels: map.widthPixels,
    heightPixels: map.heightPixels,
    bounds: map.bounds,
    orientation: map.orientation,
  })),
};
const linksPath = path.join(OUTPUT_ROOT, 'publication-links.json');
const linksContent = `${JSON.stringify(publicationLinks, null, 2)}\n`;
if (fs.existsSync(linksPath)) {
  invariant(fs.readFileSync(linksPath, 'utf8') === linksContent,
    'published link manifest differs from the current source manifest');
} else {
  fs.writeFileSync(linksPath, linksContent, { flag: 'wx' });
}

process.stdout.write(`${JSON.stringify({
  status: 'PASS_CURRENT_SURFACE_ATLAS_20260826_SYNCED',
  source: path.relative(REPO_ROOT, SOURCE_ROOT),
  output: path.relative(SITE_ROOT, OUTPUT_ROOT),
  snapshotSha256: atlas.snapshot.sha256,
  mapCount: atlas.maps.length,
  maps: publicationLinks.maps.map(({ href, sha256 }) => ({ href, sha256 })),
}, null, 2)}\n`);
