#!/usr/bin/env node
/** Compile first dry, lined Cobalt running-tube cell block. Civil work only. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const value = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway5-post-20260826T033200Z'); const OUT = value('--out-dir', 'data/buildops'); const BASENAME = value('--basename', 'rail-s3-running-tube-01');
const RELEASE_ID = value('--release-id', 'RAIL-S3-RUNNING-TUBE-01'); const absolute = (file) => path.resolve(ROOT, file); const sha = (data) => crypto.createHash('sha256').update(data).digest('hex'); const fail = (valueToCheck, message) => { if (!valueToCheck) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`); };
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region'))); const cache = new Map();
const stateAt = async (cell) => { const id = cellKey(cell); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); };
const name = (state) => state.split('[', 1)[0]; const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const X = { min: Number(value('--min-x', '-254')), max: Number(value('--max-x', '-236')) }; fail(Number.isInteger(X.min) && Number.isInteger(X.max) && X.min <= X.max, 'invalid x segment');
const reviewedOpsPath = value('--reviewed-interior-ops', '');
const reviewedOpsCells = [];
if (reviewedOpsPath) {
  const sourcePath = absolute(reviewedOpsPath);
  fail(fs.existsSync(sourcePath), `reviewed interior operation source is missing: ${reviewedOpsPath}`);
  for (const [index, raw] of fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/).entries()) {
    const fields = raw.trim().split(/\s+/);
    if (!fields[0] || fields[0].startsWith('#')) continue;
    fail(fields[0] === 'REPL' && fields.length === 9, `reviewed interior operation source malformed at ${reviewedOpsPath}:${index + 1}`);
    const [x1,y1,z1,x2,y2,z2] = fields.slice(1,7).map(Number);
    for (let x=Math.min(x1,x2);x<=Math.max(x1,x2);x+=1) for (let y=Math.min(y1,y2);y<=Math.max(y1,y2);y+=1) for (let z=Math.min(z1,z2);z<=Math.max(z1,z2);z+=1) reviewedOpsCells.push({x,y,z});
  }
}
const explicitReviewedInteriorPds = new Set((value('--reviewed-interior-pds', '') || '').split(';').filter(Boolean));
const reviewedInteriorPds = new Set([
  ...explicitReviewedInteriorPds,
  ...reviewedOpsCells.map(cellKey),
]);
const TUBES = [{ id: 'north-westbound', interiorZ: [-461, -460], walls: [-462, -459] }, { id: 'south-eastbound', interiorZ: [-455, -454], walls: [-456, -453] }];
const records = []; const keys = new Set(); const add = async (cell, to, role) => { const id = cellKey(cell); fail(!keys.has(id), `duplicate ${id}`); keys.add(id); const from = await stateAt(cell); fail(!isFluid(from), `fluid target ${id}=${from}`); fail(!forbidden.has(name(from)), `forbidden target ${id}=${from}`); if (from !== to) records.push({ cell, from, to, role }); };
for (let x = X.min; x <= X.max; x += 1) for (const tube of TUBES) {
  for (const z of tube.walls) for (let y = 13; y <= 16; y += 1) await add({ x, y, z }, 'minecraft:polished_deepslate', `${tube.id}-side-liner`);
}
for (const x of [X.min - 1, X.max + 1]) for (const tube of TUBES) for (const z of tube.interiorZ) for (let y = 13; y <= 16; y += 1) await add({ x, y, z }, 'minecraft:polished_deepslate', `${tube.id}-end-liner`);
for (const tube of TUBES) for (let y = 16; y >= 13; y -= 1) for (let x = X.min; x <= X.max; x += 1) for (const z of tube.interiorZ) await add({ x, y, z }, 'minecraft:air', `${tube.id}-interior`);
for (let x = X.min; x <= X.max; x += 1) for (const z of [-462, -461, -460, -459, -458, -457]) {
  fail((await stateAt({ x, y: 17, z })) === 'minecraft:polished_deepslate', `service-gallery floor drift at (${x},17,${z})`);
}
const liners = records.filter((record) => record.role.includes('liner')); const interiors = records.filter((record) => record.role.includes('interior')); const predecessorSeamTransitions = interiors.filter((record) => record.from === 'minecraft:polished_deepslate'); for (const record of predecessorSeamTransitions) fail(record.cell.x === X.min || reviewedInteriorPds.has(cellKey(record.cell)), `unexpected prior-liner transition outside reviewed seam at ${cellKey(record.cell)}`); for (const id of explicitReviewedInteriorPds) fail(predecessorSeamTransitions.some((record) => cellKey(record.cell) === id), `reviewed interior-PDS migration absent or not polished_deepslate at ${id}`); const ordered = [...liners.sort((a,b)=>a.cell.x-b.cell.x||a.cell.y-b.cell.y||a.cell.z-b.cell.z), ...interiors];
const forwardBody = `${ordered.map(({ cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`; const rollbackBody = `${ordered.slice().reverse().map(({ cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
const forward = `data/buildops/${BASENAME}.running-tube.forward.txt`; const rollback = `data/buildops/${BASENAME}.running-tube.rollback.txt`; fs.mkdirSync(absolute(OUT), { recursive: true });
const forwardSha256 = sha(forwardBody); const rollbackSha256 = sha(rollbackBody); const targets = records.map(({cell})=>cell); const header = (direction, opHash) => `# GENERATED FILE - ${RELEASE_ID} (${direction})\n# source root: ${SNAPSHOT}\n# target coordinate-set SHA-256: ${hashCells(targets)}\n# operation SHA-256: ${opHash}`;
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`); fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
const exact = (cells) => { const set = uniqueCells(cells); return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) }; };
const manifest = { schemaVersion:1, transactionId:BASENAME, generatedAtUtc:value('--generated-at',new Date().toISOString()), status:'COMPILED_FROM_FRESH_DRY_RUNNING_TUBE_SURVEY_AWAITING_COMPLETE_SAVE_EXECUTION_KERNEL', releaseNodeId:'PASSENGER-RAILWAY',mvpScope:false,scopeIds:['SYS-03','MP05-B'],packages:[{key:'running-tube',forward,rollback}],executionOrder:{forward:['running-tube'],rollback:['running-tube']},source:{snapshotRoot:SNAPSHOT},scope:{releaseId:RELEASE_ID,canonicalOwner:'PASSENGER-RAILWAY',purpose:`Construct two dry lined 2-wide × 4-high Cobalt running-tube interiors across x=${X.min}..${X.max}, under the sealed service gallery. No rail, power, vehicle, platform, route, or passenger use.`,tubeInteriors:exact(interiors.map(({cell})=>cell)),liners:exact(liners.map(({cell})=>cell)),exactReviewedPredecessorSeam:exact(predecessorSeamTransitions.filter((record)=>record.cell.x===X.min).map(({cell})=>cell)),exactReviewedLocalInteriorMigration:exact(predecessorSeamTransitions.filter((record)=>reviewedInteriorPds.has(cellKey(record.cell))).map(({cell})=>cell)),reviewedInteriorMigrationSource:reviewedOpsPath?{path:reviewedOpsPath,sha256:sha(fs.readFileSync(absolute(reviewedOpsPath))),declaredCellCount:uniqueCells(reviewedOpsCells).length}:null,routeCommissioned:false,passengerServiceCommissioned:false},target:{operatedUnion:exact(targets),packageTargetsDisjoint:true},operations:{'running-tube':{forwardSha256,rollbackSha256,forwardCommandCount:ordered.length,rollbackCommandCount:ordered.length,targetCellCount:ordered.length,targetCoordinateSetSha256:hashCells(targets),exactInverse:true}},hardStops:{requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution:true,requiresExactFluidGravityAndContainerClearance:true,requiresBlockEntityAndLiveEntityClearance:true,requiresStrictNoopForwardAndRollbackChecks:true,requiresJournaledStrictExecution:true,requiresFreshPostSnapshotAndRollbackPoststatePreflight:true},safetyBoundary:{liveCallsPerformed:false,worldEditsPerformed:false,executionAuthorizedByThisManifest:false} }; manifest.manifestIdentity=sha(JSON.stringify(manifest)); fs.writeFileSync(absolute(path.join(OUT,`${BASENAME}.release-manifest.json`)),`${JSON.stringify(manifest,null,2)}\n`); console.log(JSON.stringify({status:manifest.status,targetCount:ordered.length,linerCount:liners.length,interiorCount:interiors.length,predecessorSeamCount:predecessorSeamTransitions.length,manifestIdentity:manifest.manifestIdentity},null,2));
