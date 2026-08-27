#!/usr/bin/env node
/** Read-only protected/container state audit for the exact Successor-11 target set. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : ''; };
const source = option('--source');
const manifestPath = option('--manifest');
const out = option('--out');
if (!source || !manifestPath || !out) throw new Error('usage: --source <snapshot> --manifest <manifest> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const reader = new AnvilReader(path.join(absolute(source), 'region'));
const forbidden = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const terms = line.trim().split(/\s+/);
  if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`);
  return { x: Number(terms[1]), y: Number(terms[2]), z: Number(terms[3]) };
});
const targets = manifest.stages.flatMap(({ forward }) => parse(forward));
const blockers = [];
for (const target of targets) {
  const state = stateToCommandString(await reader.blockState(target.x, target.y, target.z));
  if (forbidden.has(state.split('[', 1)[0])) blockers.push({ point: target, state });
}
const result = { schemaVersion: 1, id: 'rail-s3-r10-west-high-successor11-block-entity-audit', status: blockers.length === 0 ? 'PASS' : 'FAIL', source, manifestPath, targetCount: targets.length, blockingBlockEntityCount: blockers.length, blockers, readOnly: true };
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, targetCount: result.targetCount, blockingBlockEntityCount: result.blockingBlockEntityCount }, null, 2));
