#!/usr/bin/env node
/** Fixed-identity guarded wrapper for C01 approach gravity containment 05. */
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, [
  'scripts/run_mp11_bkr_c01_finite_gravity_liner_release.mjs',
  '--release-id', 'MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT-05',
  '--release-node', 'MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT',
  '--release-slug', 'mp11-bkr-c01-approach-gravity-containment-05',
  '--expected-component', 'EXP-G04',
  '--expected-count', '119',
  '--expected-halo', '397',
  '--authorization', 'docs/masterplans/11-town-expansion-r1/mp11-bkr-c01-approach-gravity-containment-05-governor-standing-execution-authorization.json',
  ...process.argv.slice(2),
], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
