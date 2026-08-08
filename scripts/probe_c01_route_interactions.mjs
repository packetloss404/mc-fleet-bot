#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INPUT = path.resolve(ROOT, process.argv[process.argv.indexOf('--input') + 1] ?? '/tmp/c01-after-far.txt');
const REGIONS = path.resolve(ROOT, process.argv[process.argv.indexOf('--regions') + 1] ?? 'data/worldsnap/c01-route-safe-far-post-20260808/region');
const CHUNK_COUNT = Number(process.argv[process.argv.indexOf('--chunks') + 1] ?? 10);
const SELECT = process.argv.includes('--select')
  ? process.argv[process.argv.indexOf('--select') + 1].split(',').map(Number)
  : null;
const SELECT_OUT = process.argv.includes('--out')
  ? path.resolve(ROOT, process.argv[process.argv.indexOf('--out') + 1])
  : null;
const SELECT_ROLLBACK = process.argv.includes('--rollback-out')
  ? path.resolve(ROOT, process.argv[process.argv.indexOf('--rollback-out') + 1])
  : null;

function parseOperations(filename) {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '));
}

function allC01RoutesPass(report) {
  const routes = report.routes.filter((route) => route.domain === 'c01-bunker');
  return routes.length === 5 && routes.every((route) => route.passed);
}

const operations = parseOperations(INPUT);
const chunks = Array.from({ length: CHUNK_COUNT }, () => []);
operations.forEach((line, index) => chunks[index % CHUNK_COUNT].push(line));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-route-probe-'));

const results = await Promise.all(chunks.map(async (chunk, index) => {
  const filename = path.join(tempRoot, `chunk-${index}.txt`);
  fs.writeFileSync(filename, `${chunk.join('\n')}\n`);
  const report = await verifyTownExpansionRoutes({
    manifest: 'docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-route-manifest.json',
    regions: REGIONS,
    overlayOps: filename,
    noWrite: true,
  });
  return {
    index,
    operationCount: chunk.length,
    pass: allC01RoutesPass(report),
    c01: report.routes
      .filter((route) => route.domain === 'c01-bunker')
      .map((route) => ({ id: route.id, passed: route.passed, failures: route.failures })),
  };
}));

console.log(JSON.stringify({ input: INPUT, regions: REGIONS, operationCount: operations.length, chunks: results }, null, 2));

if (SELECT) {
  const selected = SELECT.flatMap((index) => chunks[index] ?? []);
  if (!SELECT_OUT || !SELECT_ROLLBACK) throw new Error('--out and --rollback-out are required with --select');
  const forward = `${selected.join('\n')}\n`;
  const rollback = `${[...selected].reverse().map((line) => {
    const fields = line.split(/\s+/);
    return ['REPL', fields[1], fields[2], fields[3], fields[4], fields[5], fields[6], fields[8], fields[7]].join(' ');
  }).join('\n')}\n`;
  fs.mkdirSync(path.dirname(SELECT_OUT), { recursive: true });
  fs.writeFileSync(SELECT_OUT, forward);
  fs.writeFileSync(SELECT_ROLLBACK, rollback);
  const combined = await verifyTownExpansionRoutes({
    manifest: 'docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-route-manifest.json',
    regions: REGIONS,
    overlayOps: SELECT_OUT,
    noWrite: true,
  });
  console.log(JSON.stringify({
    selected: SELECT,
    selectedOperationCount: selected.length,
    selectedPass: allC01RoutesPass(combined),
    projection: combined.projection,
  }, null, 2));
}
