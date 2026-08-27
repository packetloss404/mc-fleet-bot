import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..');
const DIRECTORY=path.join(ROOT,'data/world-review/combined-zones-r08ah-live-20260822T022005Z');
const SCRIPT=path.join(ROOT,'scripts/qa_combined_zones_r08ah_empty_eight_eg_b_passive_core_lining_post_release.mjs');
const readJson=(filename:string)=>JSON.parse(fs.readFileSync(path.join(DIRECTORY,filename),'utf8'));

beforeAll(()=>execFileSync(process.execPath,[SCRIPT],{cwd:ROOT,stdio:'pipe'}),30_000);

describe('R08AH EG-B passive core lining post-release QA',()=>{
  it('binds the executed release and immutable evidence',()=>{
    expect(readJson('r08ah-post-release-qa.json')).toMatchObject({
      status:'PASS_R08AH_EMPTY_EIGHT_EG_B_PASSIVE_CORE_LINING_POST_RELEASE_ACCEPTED',
      release:{manifestIdentity:'bc4be457f3dc659b485fd1757280cee6f7ff6add45ee1fc1e27b8d1c14f00d2f',completedReleaseIdentitySha256:'c562eb63b91bb9aa6169a1aeb721673e3c10fa4ee6cdf3257a3e0c3ca26637a5'},
      bindings:{stages:17,evidence:17},
    });
  });
  it('verifies target, retained closure, halo, and bounded diff',()=>{
    expect(readJson('r08ah-post-release-qa.json')).toMatchObject({
      geometry:{targetSet:{cellCount:264},internalCore:{cellCount:637},retainedFloor:{cellCount:49},retainedRoofCap:{cellCount:49},retainedAirInterior:{cellCount:275},halo:{cellCount:532}},
      postState:{exactTransitions:{expected:264,matching:264,mismatches:0},stoneBrickCount:264,retainedFloorCells:49,retainedRoofCapCells:49,retainedAirInteriorCells:275,retainedHaloCells:532,boundedDiff:{reviewCells:945,declared:264,observed:264,lifecycle:0,undeclared:0}},
    });
  });
  it('verifies R02 binding and all previous R08 state',()=>{
    expect(readJson('r08ah-post-release-qa.json')).toMatchObject({
      prior:{r02Reservation:{cells:264,air:229,polishedDeepslate:35,sourceMatches:264},previousR08:{manifestCount:32,uniqueCells:44423,drift:0}},
    });
  });
  it('verifies strict execution, inverse, and retained commissioning boundary',()=>{
    expect(readJson('r08ah-post-release-qa.json')).toMatchObject({
      execution:{stages:17,journalEvents:534,success:264,failed:0,noops:0,inverseGuards:264},
      commissioning:{passiveCoreLiningAccepted:true,egressCommissioned:false,accessibleRouteCommissioned:false,stairsOrLiftAuthorized:false,externalOpeningAuthorized:false},
    });
  });
  it('emits the bounded acceptance seal',()=>{
    expect(readJson('r08ah-bounded-eg-b-passive-core-lining-seal.json')).toMatchObject({
      status:'PASS_R08AH_BOUNDED_EG_B_PASSIVE_CORE_LINING_ACCEPTED',
      scope:{targets:264,floor:49,roofCap:49,airInterior:275,halo:532,priorR08Cells:44423},
      rollback:{guards:264,passed:true},noLiveCalls:true,noWorldEdits:true,
    });
  });
});
