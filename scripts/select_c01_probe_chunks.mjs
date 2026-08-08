#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const input = path.resolve(ROOT, process.argv[process.argv.indexOf('--input') + 1]);
const regions = path.resolve(ROOT, process.argv[process.argv.indexOf('--regions') + 1]);
const selected = process.argv[process.argv.indexOf('--select') + 1].split(',').map(Number);
const out = path.resolve(ROOT, process.argv[process.argv.indexOf('--out') + 1]);
const rollbackOut = path.resolve(ROOT, process.argv[process.argv.indexOf('--rollback-out') + 1]);
const chunks = Array.from({ length: 10 }, () => []);
fs.readFileSync(input, 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '))
  .forEach((line, index) => chunks[index % 10].push(line));
const forward = selected.flatMap((index) => chunks[index] ?? []);
const rollback = [...forward].reverse().map((line) => {
  const fields = line.split(/\s+/);
  return ['REPL', fields[1], fields[2], fields[3], fields[4], fields[5], fields[6], fields[8], fields[7]].join(' ');
});
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${forward.join('\n')}\n`);
fs.writeFileSync(rollbackOut, `${rollback.join('\n')}\n`);
const report = await verifyTownExpansionRoutes({
  manifest: 'docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-route-manifest.json',
  regions,
  overlayOps: out,
  noWrite: true,
});
const c01 = report.routes.filter((route) => route.domain === 'c01-bunker');
console.log(JSON.stringify({
  selected,
  operationCount: forward.length,
  pass: c01.length === 5 && c01.every((route) => route.passed),
  directions: c01.flatMap((route) => route.directions).filter((direction) => direction.passed).length,
  projection: report.projection,
  routes: c01.map((route) => ({ id: route.id, passed: route.passed, failures: route.failures })),
}, null, 2));
