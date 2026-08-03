#!/usr/bin/env node
/** Print the canonical content identity for an immutable Anvil region snapshot. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const directory = path.resolve(process.argv[2] ?? 'data/worldsnap/region');
if (!fs.existsSync(directory)) throw new Error(`region directory not found: ${directory}`);
const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
const hash = crypto.createHash('sha256');
let bytes = 0;
for (const filename of files) {
  const content = fs.readFileSync(path.join(directory, filename));
  hash.update(filename);
  hash.update('\0');
  hash.update(content);
  hash.update('\0');
  bytes += content.length;
}
console.log(JSON.stringify({
  directory,
  sha256: hash.digest('hex'),
  regionFileCount: files.length,
  bytes,
  algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
}, null, 2));
