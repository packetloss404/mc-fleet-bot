import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
const ROOT=path.resolve(__dirname,'../..');const created:string[]=[];afterEach(()=>created.splice(0).forEach(p=>fs.rmSync(p,{recursive:true,force:true})));
describe('AG-3 guarded passive-rail release',()=>{
 it('prepares an immutable rebind and all non-live kernel gates only',()=>{const base=fs.mkdtempSync(path.join(os.tmpdir(),'ag3-kernel-')),out=path.join(base,'out');created.push(base);const result=JSON.parse(execFileSync(process.execPath,['scripts/run_ag3_exterior_loop_passive_rail_01_release.mjs','--out-dir',out,'--source-snapshot-root','data/worldsnap-ag2-exterior-loop-exec-post-20260827T021000Z'],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024}));expect(result).toMatchObject({status:'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION',mutationAuthority:false});const ledger=JSON.parse(fs.readFileSync(path.join(out,'ag3-guarded-release-ledger.json'),'utf8'));expect(ledger.releaseId).toBe('AG3-CITYWIDE-EXTERIOR-LOOP-PASSIVE-RAIL-01');expect(ledger.stages.filter((s:{status:string})=>s.status==='PASS').map((s:{stage:string})=>s.stage)).toEqual(expect.arrayContaining(['fresh-ag3-compiler-rebind','exact-forward-source-preflight','strict-forward-parser','strict-rollback-parser','projected-rollback-preflight','block-entity-and-protected-core-clearance']));expect(ledger.stages.map((s:{stage:string})=>s.stage)).not.toContain('same-moment-live-entity-clearance');},30000);
 it('keeps independent post QA fail-closed without immutable inputs',()=>expect(()=>execFileSync(process.execPath,['scripts/qa_ag3_exterior_loop_passive_rail_01_post_release.mjs'],{cwd:ROOT,stdio:'pipe'})).toThrow());
});
