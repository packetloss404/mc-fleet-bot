#!/usr/bin/env node
/**
 * Fixed-identity guarded wrapper for the third C01 portal-approach gravity
 * containment package. The shared finite-liner kernel owns all preflight and
 * execution behavior; this wrapper prevents a caller from selecting another
 * component, count, halo, or authorization by mistake.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, [
  'scripts/run_mp11_bkr_c01_finite_gravity_liner_release.mjs',
  '--release-id', 'MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT-03',
  '--release-node', 'MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT',
  '--release-slug', 'mp11-bkr-c01-approach-gravity-containment-03',
  '--expected-component', 'EXP-G05',
  '--expected-count', '116',
  '--expected-halo', '400',
  '--authorization', 'docs/masterplans/11-town-expansion-r1/mp11-bkr-c01-approach-gravity-containment-03-governor-standing-execution-authorization.json',
  ...process.argv.slice(2),
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 128 * 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
