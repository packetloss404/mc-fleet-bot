#!/usr/bin/env node
/** Static-only publication of C01 Main Switchback design evidence. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ROOT=path.resolve(SITE,'..');
const OUT=path.join(SITE,'public/c01-main-switchback-design-2026-08-28');
const files=[
  ['data/world-review/mp11-c01-main-switchback-readiness-03-return02-post-20260827T023000Z/mp11-c01-main-switchback-readiness-03.json','readiness-03.json'],
  ['data/world-review/mp11-c01-main-switchback-readiness-03-return02-post-20260827T023000Z/mp11-c01-main-switchback-readiness-03.svg','readiness-03.svg'],
  ['data/world-review/mp11-c01-main-switchback-readiness-03-return02-post-20260827T023000Z/MP11-C01-MAIN-SWITCHBACK-READINESS-03.md','READINESS-03.md'],
  ['data/world-review/mp11-c01-main-switchback-guard-transition-04-return02-post-20260827T023000Z/mp11-c01-main-switchback-guard-transition-04.json','guard-transition-04.json'],
  ['data/world-review/mp11-c01-main-switchback-guard-transition-04-return02-post-20260827T023000Z/mp11-c01-main-switchback-guard-transition-04.svg','guard-transition-04.svg'],
  ['data/world-review/mp11-c01-main-switchback-guard-transition-04-return02-post-20260827T023000Z/MP11-C01-MAIN-SWITCHBACK-GUARD-TRANSITION-04.md','GUARD-TRANSITION-04.md'],
];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fail=(x,m)=>{if(!x)throw Error(`C01 static publication rejected: ${m}`)};
for(const [source] of files)fail(fs.existsSync(path.join(ROOT,source)),`missing ${source}`);
const readiness=JSON.parse(fs.readFileSync(path.join(ROOT,files[0][0]),'utf8'));const guard=JSON.parse(fs.readFileSync(path.join(ROOT,files[3][0]),'utf8'));
fail(readiness.mutationAuthority===false&&guard.mutationAuthority===false,'source must remain design-only');
fail(readiness.safetyBoundary.forwardOperationFilesEmitted===0&&guard.safetyBoundary.forwardOperationFilesEmitted===0,'source has operations');
fs.mkdirSync(OUT,{recursive:true});
const copied=[];for(const [source,name] of files){const from=path.join(ROOT,source),to=path.join(OUT,name);fs.copyFileSync(from,to);fail(sha(from)===sha(to),'copy hash mismatch');copied.push({source,name,sha256:sha(to),bytes:fs.statSync(to).size});}
const manifest={schemaVersion:1,id:'C01-MAIN-SWITCHBACK-DESIGN-SHOWCASE-2026-08-28',status:'PASS_STATIC_DESIGN_ONLY_EVIDENCE_SYNCED',authority:{worldMutationAuthorized:false,routeOrEgressAuthorized:false,operationsPublished:false},cards:[{id:'READINESS-03',title:'C01 protected main switchback readiness',status:readiness.status},{id:'GUARD-TRANSITION-04',title:'C01 guard + protected-route transition',status:guard.status}],files:copied};
fs.writeFileSync(path.join(OUT,'publication-manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);console.log(JSON.stringify({status:manifest.status,out:path.relative(ROOT,OUT),files:copied.length},null,2));
