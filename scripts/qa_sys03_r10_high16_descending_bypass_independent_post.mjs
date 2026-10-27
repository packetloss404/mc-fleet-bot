#!/usr/bin/env node
/** Independent immutable-post QA; deliberately does not import the compiler. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const post = arg('--post'); const manifestPath = arg('--manifest'); const contractPath = arg('--contract'); const outJson = arg('--out-json'); const outMd = arg('--out-md');
if (!post || !manifestPath || !contractPath || !outJson || !outMd) throw new Error('usage: --post <complete-save> --manifest <manifest> --contract <proposal-or-accepted-contract> --out-json <json> --out-md <md>');
const absolute = (file) => path.resolve(ROOT, file); const relative = (file) => path.relative(ROOT, absolute(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const point = (x, y, z) => ({ x, y, z }); const key = (cell) => cellKey(cell);
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:concrete_powder'].includes(String(state).split('[', 1)[0]);
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(String(state).split('[', 1)[0]) || String(state).includes('waterlogged=true');
const box = (origin) => { const result=[]; for(let x=origin.x;x<origin.x+6;x+=1) for(let y=origin.y;y<origin.y+6;y+=1) for(let z=origin.z;z<origin.z+6;z+=1) result.push(point(x,y,z)); return result; };
const union = (...sets) => [...new Map(sets.flat().map((cell) => [key(cell), cell])).values()];
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => { const p=line.split(/\s+/); if(p.length!==9||p[0]!=='REPL') throw new Error(`invalid operation ${line}`); return { point:point(Number(p[1]),Number(p[2]),Number(p[3])), desired:p[8] }; });
for (const member of ['region','entities','poi','level.dat','combined-zones-complete-save-capture.json']) if(!fs.existsSync(path.join(absolute(post),member))) throw new Error(`post lacks ${member}`);
const manifestBytes = fs.readFileSync(absolute(manifestPath)); const manifest = JSON.parse(manifestBytes); const contract = JSON.parse(fs.readFileSync(absolute(contractPath),'utf8'));
if (manifest.civilOnly !== true || manifest.passengerServiceCommissioned !== false) throw new Error('independent QA rejects a non-civil candidate');
if (contract.mutationAuthority !== false || contract.civilOnly !== true || contract.passengerServiceCommissioned !== false) throw new Error('contract safety classification drift');
if (contract.sourceBinding?.manifestSha256 !== sha(manifestBytes)) throw new Error('contract is not bound to the exact manifest');
if (contract.gravityContract?.totalChains !== 107 || contract.interfaces?.high15Migration?.count !== 36 || contract.interfaces?.retainedHigh15Ingress?.count !== 30 || contract.interfaces?.preservedHigh15RouteAir?.count !== 36) throw new Error('contract interface count drift');
const operations = manifest.stages.flatMap((stage) => parseOps(stage.forward));
const reader = new AnvilReader(path.join(absolute(post),'region')); const entityReader = new AnvilReader(path.join(absolute(post),'entities')); const cache=new Map();
const stateAt = async (cell) => { const cellKeyValue=key(cell); if(!cache.has(cellKeyValue)) cache.set(cellKeyValue,stateToCommandString(await reader.blockState(cell.x,cell.y,cell.z))); return cache.get(cellKeyValue); };
const checkState = async (cells, expected) => { const failures=[]; for(const cell of cells){const actual=await stateAt(cell); if(actual!==expected) failures.push({point:cell,expected,actual});} return failures; };
const targetFailures=[]; for(const op of operations){const actual=await stateAt(op.point);if(actual!==op.desired)targetFailures.push({point:op.point,expected:op.desired,actual});}
const routeCore=union(...manifest.route.stations.map(({origin})=>box(origin))); const coreFailures=await checkState(routeCore,'minecraft:air');
const ingressFailures=await checkState(contract.interfaces.retainedHigh15Ingress.cells,'minecraft:air');
const migrationFailures=await checkState(contract.interfaces.high15Migration.cells.map(({point:cell})=>cell),'minecraft:air');
const retainedAirFailures=await checkState(contract.interfaces.preservedHigh15RouteAir.cells,'minecraft:air');
const gravityFailures=[]; for(const chain of manifest.hazards.gravityChains.filter(({kind})=>kind==='halo-preserved')){const actual=await stateAt(chain.target); if(!isGravity(actual)){gravityFailures.push({reason:'RETAINED_HALO_GRAVITY_DRIFT',target:chain.target,actual});continue;} let terminal=null; for(let y=chain.target.y-1;y>=-64;y-=1){const candidate=point(chain.target.x,y,chain.target.z); const state=await stateAt(candidate);if(isGravity(state))continue;terminal={point:candidate,state};break;} if(!terminal||terminal.state==='minecraft:air'||isFluid(terminal.state))gravityFailures.push({reason:'RETAINED_HALO_GRAVITY_UNSUPPORTED',target:chain.target,terminal});}
const fullInteraction = [
  ...(manifest.sourceStates?.core ?? []).map(({ point: cell }) => cell),
  ...(manifest.sourceStates?.shell ?? []).map(({ point: cell }) => cell),
  ...(manifest.sourceStates?.halo ?? []).map(({ point: cell }) => cell),
];
if (fullInteraction.length !== manifest.geometry.interaction.count) throw new Error('manifest lacks exact interaction source-state set');
const allEnvelopeKeys=new Set(fullInteraction.map(key)); const blockEntities=[]; const savedEntities=[];
const b=manifest.geometry.interaction.bounds; for(let cx=Math.floor(b.x[0]/16);cx<=Math.floor(b.x[1]/16);cx+=1)for(let cz=Math.floor(b.z[0]/16);cz<=Math.floor(b.z[1]/16);cz+=1){const chunk=await reader.chunk(cx,cz);for(const entity of chunk?.block_entities??chunk?.blockEntities??[]){const cell=point(Number(entity.x),Number(entity.y),Number(entity.z));if(allEnvelopeKeys.has(key(cell)))blockEntities.push({id:entity.id??entity.Id??null,point:cell});}const entities=await entityReader.chunk(cx,cz);for(const entity of entities?.Entities??[]){const pos=entity.Pos?.slice(0,3).map(Number);if(!pos)continue;const cell=point(Math.floor(pos[0]),Math.floor(pos[1]),Math.floor(pos[2]));if(allEnvelopeKeys.has(key(cell)))savedEntities.push({id:entity.id??entity.Id??null,point:cell});}}
const checks={allStageTargets:targetFailures.length===0&&operations.length===4865,routeCore:coreFailures.length===0&&routeCore.length===3257&&hashCells(routeCore)===manifest.route.core.coordinateSetSha256,retainedIngress:ingressFailures.length===0,high15Migration:migrationFailures.length===0,retainedHigh15Air:retainedAirFailures.length===0,retainedHaloGravity:gravityFailures.length===0&&manifest.hazards.gravityChains.filter(({kind})=>kind==='halo-preserved').length===34,noPostBlockEntities:blockEntities.length===0,noPostSavedEntities:savedEntities.length===0};
const failures=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name); const capture=fs.readFileSync(path.join(absolute(post),'combined-zones-complete-save-capture.json'));
const report={schemaVersion:1,id:'sys03-r10-high16-descending-bypass-independent-post-qa',status:failures.length?'FAIL':'PASS',post:relative(post),postCaptureManifestSha256:sha(capture),manifest:relative(manifestPath),manifestSha256:sha(manifestBytes),contract:relative(contractPath),contractSha256:sha(fs.readFileSync(absolute(contractPath))),checks,failures,targets:{count:operations.length,failures:targetFailures},route:{count:routeCore.length,coordinateSetSha256:hashCells(routeCore),failures:coreFailures},interfaces:{ingressFailures,migrationFailures,retainedAirFailures},retainedHaloGravity:{count:34,failures:gravityFailures},postEntities:{blockEntities,savedEntities},civilOnly:true,passengerServiceCommissioned:false,readOnly:true,worldMutated:false,rconCalled:false};
fs.mkdirSync(path.dirname(absolute(outJson)),{recursive:true});fs.mkdirSync(path.dirname(absolute(outMd)),{recursive:true});fs.writeFileSync(absolute(outJson),`${JSON.stringify(report,null,2)}\n`);fs.writeFileSync(absolute(outMd),`# SYS-03 R10 High-16 descending bypass · independent post QA\n\n**Status:** \`${report.status}\`; civil-only, not passenger service.\n\n- Stage targets: ${operations.length}; failures: ${targetFailures.length}.\n- Core: ${routeCore.length} cells; failures: ${coreFailures.length}.\n- High-15 retained ingress / migration / retained-air failures: ${ingressFailures.length} / ${migrationFailures.length} / ${retainedAirFailures.length}.\n- Retained halo gravity chains: 34; failures: ${gravityFailures.length}.\n- Post block entities / saved entities: ${blockEntities.length} / ${savedEntities.length}.\n\nNo rail, passenger, station, or public-route acceptance follows from this QA.\n`);console.log(JSON.stringify({status:report.status,checks,failures},null,2));process.exitCode=failures.length?1:0;
