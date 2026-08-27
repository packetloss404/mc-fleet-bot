#!/usr/bin/env node
/** Independent post-state QA for the bounded B07 flowing-water liner. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const required = (flag) => { const result = value(flag); if (!result) throw new Error(`${flag} is required`); return result; };
const LEDGER = required('--ledger');
const OUT = required('--out');
const MANIFEST = value('--manifest', 'data/buildops/mp05-b07-flowing-water-intrusion-plug-01.release-manifest.json');
const RELEASE_ID = 'MP05-B07-FLOWING-WATER-INTRUSION-PLUG-01';
const RELEASE_NODE_ID = 'CZ-MP05-B07-FLOWING-WATER-INTRUSION-PLUG';
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`); };
const exact = (cells) => { const set = uniqueCells(cells); return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) }; };
const PLUG = [{x:2110,y:5,z:-396},{x:2111,y:5,z:-396},{x:2110,y:5,z:-395},{x:2111,y:5,z:-395},{x:2110,y:6,z:-395}];
const six = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const plugKeys = new Set(PLUG.map(cellKey));
const halo = uniqueCells(PLUG.flatMap((c) => six.map(([dx,dy,dz]) => ({x:c.x+dx,y:c.y+dy,z:c.z+dz})))).filter((c) => !plugKeys.has(cellKey(c)));
const fluid = (state) => ['minecraft:water','minecraft:lava','minecraft:bubble_column'].includes(state.split('[',1)[0]) || state.includes('waterlogged=true');

const ledger = JSON.parse(fs.readFileSync(abs(LEDGER), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(abs(MANIFEST), 'utf8'));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'scoped runner did not complete the release kernel');
fail(ledger.releaseNodeId === RELEASE_NODE_ID && ledger.transactionId === 'mp05-b07-flowing-water-intrusion-plug-01', 'ledger identity drifted');
fail(manifest.scope?.releaseId === RELEASE_ID && manifest.releaseNodeId === RELEASE_NODE_ID, 'manifest identity drifted');
fail(ledger.manifest?.sha256 === sha256(fs.readFileSync(abs(MANIFEST))), 'ledger is not bound to this exact manifest');
for (const stage of ['block-entity-clearance','live-entity-clearance','rollback-poststate-preflight:flowing-water-intrusion-liner']) fail(ledger.stages?.some((s) => s.stage === stage && s.status === 'PASS'), `required runner stage missing: ${stage}`);
fail(ledger.postSnapshot?.regions && fs.existsSync(abs(ledger.postSnapshot.regions)), 'fresh post snapshot regions are missing');
const reader = new AnvilReader(abs(ledger.postSnapshot.regions));
const states = async (cells) => Promise.all(cells.map(async (cell) => ({cell,state:stateToCommandString(await reader.blockState(cell.x,cell.y,cell.z))})));
const [plug, retained] = await Promise.all([states(PLUG),states(halo)]);
fail(plug.every(({state}) => state === 'minecraft:deepslate_tiles'), 'all five intrusion cells are not permanent exact liner');
fail(retained.some(({state}) => fluid(state)), 'no retained exterior fluid remains outside the liner');
const payload = {
  schemaVersion: 1,
  id: 'mp05-b07-flowing-water-intrusion-plug-01-post-release-qa',
  status: 'PASS_EXECUTED_B07_FLOWING_WATER_INTRUSION_CONTAINMENT_QA',
  release: {releaseId: RELEASE_ID,releaseNodeId: RELEASE_NODE_ID,ledger:{path:rel(LEDGER),sha256:sha256(fs.readFileSync(abs(LEDGER)))},manifest:{path:rel(MANIFEST),sha256:sha256(fs.readFileSync(abs(MANIFEST))),manifestIdentity:manifest.manifestIdentity}},
  postSnapshot: ledger.postSnapshot,
  geometry: {liner:exact(PLUG),interactionHalo:exact(halo)},
  postState: {liner: Object.fromEntries([...plug.reduce((m,{state})=>m.set(state,(m.get(state)??0)+1),new Map())]), retainedExteriorFluidCells:retained.filter(({state})=>fluid(state)).map(({cell,state})=>({cell,state}))},
  functionalBoundary: {flowingIntrusionPlugged:true,retainedExteriorWaterUntouched:true,b07RouteCommissioned:false,egressCommissioned:false,publicOrStaffAccessCommissioned:false},
};
payload.qaPayloadSha256 = sha256(JSON.stringify(payload));
fs.mkdirSync(path.dirname(abs(OUT)), {recursive:true});
fs.writeFileSync(abs(OUT), `${JSON.stringify(payload,null,2)}\n`);
process.stdout.write(`${JSON.stringify({status:payload.status,out:rel(OUT),qaPayloadSha256:payload.qaPayloadSha256},null,2)}\n`);
