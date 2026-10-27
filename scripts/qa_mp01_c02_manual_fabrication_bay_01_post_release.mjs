#!/usr/bin/env node
/** Independent immutable-post QA for C02 manual fabrication. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';
const ROOT = process.cwd(); const args = process.argv.slice(2); const arg = (flag) => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1]) throw new Error(`${flag} is required`); return args[i + 1]; };
const reader = new AnvilReader(path.join(ROOT, arg('--post-root'), 'region'));
const expected = [[2012,168,-873,'minecraft:smithing_table'],[2013,168,-873,'minecraft:stonecutter[facing=north]'],[2012,169,-873,'minecraft:air'],[2013,169,-873,'minecraft:air'],[2012,167,-873,'minecraft:light_gray_concrete'],[2013,167,-873,'minecraft:light_gray_concrete'],[2015,168,-873,'minecraft:air'],[2016,168,-873,'minecraft:air'],[2017,168,-873,'minecraft:air']];
const checks=[]; for (const [x,y,z,state] of expected) { const actual=stateToCommandString(await reader.blockState(x,y,z)); if(actual!==state) throw new Error(`C02 post-state drift at ${x},${y},${z}: ${actual}, expected ${state}`); checks.push({x,y,z,state}); }
const report={status:'PASS_C02_MANUAL_FABRICATION_BAY_AND_CLEARANCE_VERIFIED',targetState:{declared:2,matched:2,mismatches:[]},preservedBayClearance:checks.filter((c)=>c.y===169||c.x>=2015),retainedFloorSupport:checks.filter((c)=>c.y===167),nonClaims:['container storage','automation','active controls','utility commissioning','public access','MP01 completion']}; report.payloadSha256=crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex'); const out=path.join(ROOT,arg('--out')); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,`${JSON.stringify(report,null,2)}\n`); console.log(JSON.stringify(report,null,2));
