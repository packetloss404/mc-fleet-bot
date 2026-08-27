#!/usr/bin/env node
/** Fixed identity entry point for the B07 wet-riser lighting release. */
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, [
  'scripts/run_mp05_b07_central_bypass_fixed_lighting_release.mjs',
  '--release-id', 'MP05-B07-WET-RISER-FIXED-LIGHTING-01',
  '--transaction-id', 'mp05-b07-wet-riser-fixed-lighting-01',
  '--release-node', 'CZ-MP05-B07-WET-RISER-FIXED-LIGHTING',
  '--authorization', 'docs/masterplans/05-combined-zones/mp05-b07-wet-riser-fixed-lighting-governor-standing-execution-authorization.json',
  '--compiler', 'scripts/compile_mp05_b07_wet_riser_fixed_lighting_01.mjs',
  '--post-qa', 'scripts/qa_mp05_b07_wet_riser_fixed_lighting_01_post_release.mjs',
  ...process.argv.slice(2),
], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
