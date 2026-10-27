#!/usr/bin/env node
/** Immutable post-state check for MP06-APPROACH-CONTINUITY-01. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const value = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SOURCE = value('--source', 'data/worldsnap-mp06-approach-continuity-source-20260826T050600Z');
const POST = value('--post', 'data/worldsnap-mp06-approach-continuity-post-20260826T050700Z');
const OPS = value('--ops', 'data/buildops/mp06-approach-continuity-01-20260826T050600Z.forward.txt');
const OUT = value('--out', 'data/world-review/mp06-approach-continuity-post-state-qa-20260826T050700Z.json');
const abs = (p) => path.resolve(ROOT, p);
const parse = (p) => fs.readFileSync(abs(p), 'utf8').split(/\r?\n/).filter((l) => l.startsWith('REPL ')).map((l) => { const a = l.trim().split(/\s+/); return { x: Number(a[1]), y: Number(a[2]), z: Number(a[3]), from: a[7], to: a[8] }; });
const source = new AnvilReader(abs(path.join(SOURCE, 'region'))); const post = new AnvilReader(abs(path.join(POST, 'region'))); const ops = parse(OPS);
const failures = []; for (const op of ops) { const got = stateToCommandString(await post.blockState(op.x, op.y, op.z)); if (got !== op.to) failures.push({ ...op, got }); }
const roadCells = []; for (const [x, y] of [[-316, 69], [-315, 70], [-314, 70], [-313, 70], [-312, 71], [-311, 71], [-310, 71], [-309, 72]]) roadCells.push({ x, y, z: -503 });
const roadChanges = []; for (const c of roadCells) { const before = stateToCommandString(await source.blockState(c.x, c.y, c.z)); const after = stateToCommandString(await post.blockState(c.x, c.y, c.z)); if (before !== after) roadChanges.push({ ...c, before, after }); }
const report = { schemaVersion: 1, releaseId: 'MP06-APPROACH-CONTINUITY-01', status: failures.length === 0 && roadChanges.length === 0 ? 'PASS' : 'FAIL', sourceSnapshot: SOURCE, postSnapshot: POST, operationFile: OPS, targets: { expected: ops.length, matched: ops.length - failures.length, failures: failures.slice(0, 20) }, preservedRoadCells: { checked: roadCells.length, changed: roadChanges.length, changes: roadChanges }, routeQA: 'data/world-review/mp06-approach-continuity-live-route-qa-20260826T050700Z.json' };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ status: report.status, targetsMatched: report.targets.matched, preservedRoadCellsChanged: roadChanges.length, report: OUT }, null, 2));
