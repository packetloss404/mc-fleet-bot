#!/usr/bin/env node
/** Compile R08AD through the shared, source-proven supported-gravity compiler. */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const compiler = path.join(directory,
  'compile_combined_zones_r08ac_north_smoke_supported_gravity_west_segment.mjs');
const result = spawnSync(process.execPath, [compiler, '--variant', 'r08ad', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
