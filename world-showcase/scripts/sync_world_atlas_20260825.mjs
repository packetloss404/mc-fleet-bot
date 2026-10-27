#!/usr/bin/env node

/**
 * Copy the snapshot-pinned 25 August visual atlas into the public site.
 * This is publication only: the source atlas remains the evidence package.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE_ROOT = path.join(REPO_ROOT, 'docs/redevelopment/2026-08-25-world-atlas');
const OUTPUT_ROOT = path.join(SITE_ROOT, 'public/world-atlas-2026-08-25');
const GALLERY = 'atlas-gallery.html';

const invariant = (condition, message) => {
  if (!condition) throw new Error(`World-atlas sync rejected: ${message}`);
};
const digest = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const walkPngs = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walkPngs(filename) : (entry.name.endsWith('.png') ? [filename] : []);
  });

invariant(fs.existsSync(SOURCE_ROOT), `missing source ${path.relative(REPO_ROOT, SOURCE_ROOT)}`);
invariant(fs.existsSync(path.join(SOURCE_ROOT, GALLERY)), `missing ${GALLERY}`);
const images = walkPngs(SOURCE_ROOT);
invariant(images.length === 73, `expected 73 visual files, found ${images.length}`);

fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(path.dirname(OUTPUT_ROOT), { recursive: true });
fs.cpSync(SOURCE_ROOT, OUTPUT_ROOT, { recursive: true });

for (const source of images) {
  const relative = path.relative(SOURCE_ROOT, source);
  const published = path.join(OUTPUT_ROOT, relative);
  invariant(fs.existsSync(published), `missing published ${relative}`);
  invariant(digest(source) === digest(published), `hash drift ${relative}`);
}

process.stdout.write(`${JSON.stringify({
  status: 'PASS_WORLD_ATLAS_20260825_SYNCED',
  source: path.relative(REPO_ROOT, SOURCE_ROOT),
  output: path.relative(SITE_ROOT, OUTPUT_ROOT),
  imageCount: images.length,
  gallery: `/world-atlas-2026-08-25/${GALLERY}`,
}, null, 2)}\n`);
