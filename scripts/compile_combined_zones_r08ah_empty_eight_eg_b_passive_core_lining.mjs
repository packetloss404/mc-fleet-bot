#!/usr/bin/env node
/** Compile the exact dry EG-B passive internal-core lining after accepted R08AG. */
import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, replLine, sha256,
  stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08ag-post-20260822T020533Z');
const INTAKE = value('--intake-audit',
  'data/world-review/combined-zones-r08ag-live-20260822T020533Z/post-complete-save-intake.json');
const LEDGER = value('--source-release-ledger',
  'data/world-review/combined-zones-r08ag-live-20260822T020533Z/evidence-ledger.json');
const OUT = value('--out-dir', 'data/buildops');
const BASE = value('--basename', 'combined-zones-r08ah-empty-eight-eg-b-passive-core-lining');
const GENERATED_AT = value('--generated-at', '2026-08-22T02:18:00Z');
const KEY = 'ee-eg-b-passive-core-lining';
const RELEASE_ID = 'CZ-R08AH-EMPTY-EIGHT-EG-B-PASSIVE-CORE-LINING';
const RELEASE_NODE = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const WALL = 'minecraft:stone_bricks';
const FACE = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AH compiler rejected: ${message}`);
};
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const exactSet = (cells) => { const exact = uniqueCells(cells); return {
  cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact),
}; };
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
function parseOperations(filename) {
  const output = [];
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    const coordinates = fields.slice(1, 7).map(Number);
    output.push({
      bounds: {
        minX: Math.min(coordinates[0], coordinates[3]), maxX: Math.max(coordinates[0], coordinates[3]),
        minY: Math.min(coordinates[1], coordinates[4]), maxY: Math.max(coordinates[1], coordinates[4]),
        minZ: Math.min(coordinates[2], coordinates[5]), maxZ: Math.max(coordinates[2], coordinates[5]),
      },
      toState: fields[8],
    });
  }
  return output;
}
const census = (records) => Object.fromEntries([...records.reduce((counts, {state}) => {
  counts.set(state, (counts.get(state) ?? 0) + 1); return counts;
}, new Map()).entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])));

const intake = readJson(INTAKE);
const ledger = readJson(LEDGER);
const prior = readJson('data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.release-manifest.json');
const design = readJson('docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json');
const authorization = readJson('docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json');
const relics = readJson('docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json');
const n06 = readJson('data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json');
const snapshotIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && absolute(intake.input.suppliedWorldRoot) === absolute(SNAPSHOT)
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === prior.transactionId
  && absolute(ledger.postSnapshot.root) === absolute(SNAPSHOT)
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE),
'source or standing authority');

const core = design.d06.lifeSafety.egressCores.find(({id}) => id === 'EG-B');
invariant(core && JSON.stringify(core.internalCoreReservation.bounds) === JSON.stringify({
  minX:1849,maxX:1855,minY:42,maxY:54,minZ:145,maxZ:151,
}) && core.internalCoreReservation.cellCount === 637
  && core.sealedRoofCap.cellCount === 49 && core.surfaceEndpoint === null
  && core.externalContinuationStatus === 'HOLD_UNSURVEYED_SURFACE_Y_SOURCE_OWNERSHIP_AND_ROUTE'
  && core.commissionedEgress === false && core.commissionedAccessibleRoute === false,
'frozen EG-B reservation');
const bounds = core.internalCoreReservation.bounds;
const target = cellsIn({...bounds,minY:43,maxY:53}).filter((cell) => (
  cell.x === bounds.minX || cell.x === bounds.maxX
  || cell.z === bounds.minZ || cell.z === bounds.maxZ
));
const floor = cellsIn({...bounds,minY:42,maxY:42});
const roofCap = cellsIn({...bounds,minY:54,maxY:54});
const interior = cellsIn({minX:1850,maxX:1854,minY:43,maxY:53,minZ:146,maxZ:150});
const targetKeys = new Set(target.map(cellKey));
const halo = uniqueCells(target.flatMap((cell) => FACE.map(([dx,dy,dz]) => ({
  x:cell.x+dx,y:cell.y+dy,z:cell.z+dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
invariant(target.length === 264
  && hashCells(target) === 'd8fc8240526277f31be6e9c039802db1f4420fb448d4eba308c2cf7aea3fa71b'
  && floor.length === 49 && hashCells(floor) === '7175aa84ec820d484267b18e4df59712ff0ad041df43ef6f8e5f728d99ec8314'
  && roofCap.length === 49 && hashCells(roofCap) === 'effffe3dff1d28d75ed234f2ab61e5f3e7abe7ee867ffff459c3562e34f1244c'
  && interior.length === 275 && hashCells(interior) === '4882b2ab0a55b5c85faa25faf4166779c5e6b35e90df84323fa6ce47bc95458f'
  && halo.length === 532 && hashCells(halo) === 'e7c373e48457ee8387da9b8eca55bc49720e637368d0aece36165421810aa372',
'exact geometry');

const region = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entities = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key,
    stateToCommandString(await region.blockState(cell.x,cell.y,cell.z)));
  return cache.get(key);
}
async function records(cells) {
  const output = [];
  for (const cell of cells) output.push({cell,state:await stateAt(cell)});
  return output;
}
const targetRecords = await records(target);
const floorRecords = await records(floor);
const roofRecords = await records(roofCap);
const interiorRecords = await records(interior);
const haloRecords = await records(halo);
const hazard = (state) => /(?:water|lava|bubble_column|gravel|sand|anvil|concrete_powder|chest|barrel|redstone|piston|rail)/.test(state);
invariant(JSON.stringify(census(targetRecords)) === JSON.stringify({
  'minecraft:air':229,'minecraft:polished_deepslate':35,
}) && floorRecords.every(({state}) => state === 'minecraft:polished_deepslate'
  || state === 'minecraft:smooth_stone'),
'exact target and retained-floor source census');
invariant(floorRecords.filter(({state}) => state === 'minecraft:polished_deepslate').length === 30
  && floorRecords.filter(({state}) => state === 'minecraft:smooth_stone').length === 19
  && roofRecords.every(({state}) => state === 'minecraft:smooth_stone')
  && interiorRecords.every(({state}) => state === 'minecraft:air')
  && targetRecords.every(({state}) => !hazard(state))
  && haloRecords.every(({state}) => !hazard(state)),
'dry source, retained floor/cap, or air interior');

const envelope = uniqueCells([...target,...halo]);
const envelopeKeys = new Set(envelope.map(cellKey));
const envelopeBounds = boundsOf(envelope);
const blockEntities = [];
const savedEntities = [];
for (let chunkX=Math.floor(envelopeBounds.minX/16);chunkX<=Math.floor(envelopeBounds.maxX/16);chunkX++) {
  for (let chunkZ=Math.floor(envelopeBounds.minZ/16);chunkZ<=Math.floor(envelopeBounds.maxZ/16);chunkZ++) {
    const chunk = await region.chunk(chunkX,chunkZ);
    for (const entry of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell={x:+entry.x,y:+entry.y,z:+entry.z};
      if (envelopeKeys.has(cellKey(cell))) blockEntities.push(cell);
    }
    const entityChunk = await entities.chunk(chunkX,chunkZ);
    for (const entry of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entry.Pos)) continue;
      const [x,y,z]=entry.Pos.map(Number);
      if (x>=envelopeBounds.minX&&x<envelopeBounds.maxX+1
        &&y>=envelopeBounds.minY&&y<envelopeBounds.maxY+1
        &&z>=envelopeBounds.minZ&&z<envelopeBounds.maxZ+1) savedEntities.push(entry.id);
    }
  }
}
const n06Keys = new Set(n06.targetGravity.findings.map(({cell}) => cellKey(cell)));
const futureSealKeys = new Set(design.d06.futureInterfaces.interfaces
  .flatMap((entry) => cellsIn(entry.sealDesign.bounds)).map(cellKey));
invariant(envelope.every((cell) => !n06Keys.has(cellKey(cell)) && !futureSealKeys.has(cellKey(cell)))
  && relics.relics.every((relic) => envelope.every((cell) => !inside(cell,relic.declaredInclusiveBounds)))
  && blockEntities.length === 0 && savedEntities.length === 0,
'N06, future seal, relic, block-entity, or saved-entity isolation');

const priorPaths = [...new Set([
  ...prior.isolation.acceptedPriorManifestChecks.map(({path: filename}) => filename),
  'data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.release-manifest.json',
])];
const priorHits = [];
for (const filename of priorPaths) {
  const priorManifest = readJson(filename);
  for (const pkg of priorManifest.packages ?? []) {
    const binding = priorManifest.operations[pkg.key]
      ?? ((priorManifest.packages?.length ?? 0) === 1 && priorManifest.operations.forwardSha256
        ? priorManifest.operations : null);
    invariant(binding && sha256(operationBody(pkg.forward)) === binding.forwardSha256,
      `prior operation binding ${filename}`);
    for (const operation of parseOperations(pkg.forward)) {
      for (const cell of target) if (inside(cell,operation.bounds)) {
        priorHits.push({transactionId:priorManifest.transactionId,toState:operation.toState});
      }
    }
  }
}
const r02Hits = priorHits.filter(({transactionId}) => transactionId === 'combined-zones-r02-d06-shell');
const undeclaredHits = priorHits.filter(({transactionId}) => transactionId !== 'combined-zones-r02-d06-shell');
invariant(priorPaths.length === 57 && r02Hits.length === 264 && undeclaredHits.length === 0
  && r02Hits.filter(({toState}) => toState === 'minecraft:air').length === 229
  && r02Hits.filter(({toState}) => toState === 'minecraft:polished_deepslate').length === 35,
'exact R02 reservation supersession or undeclared prior overlap');

const operations = targetRecords.sort((a,b) => a.cell.y-b.cell.y
  || a.cell.x-b.cell.x || a.cell.z-b.cell.z)
  .map(({cell,state}) => ({cell,fromState:state,toState:WALL}));
const forwardLines = operations.map(({cell,fromState,toState}) => replLine(cell,fromState,toState));
const rollbackLines = operations.slice().reverse()
  .map(({cell,fromState,toState}) => replLine(cell,toState,fromState));
const canonical = (role) => `data/buildops/${BASE}.${KEY}.${role}.txt`;
const output = (role) => path.join(OUT,`${BASE}.${KEY}.${role}.txt`);
const header = [`# release: ${RELEASE_ID}`,`# release_node: ${RELEASE_NODE}`,
  `# package: ${KEY}`,`# source_snapshot: ${SNAPSHOT}`,'# offline_compiler: true'];
fs.mkdirSync(absolute(OUT),{recursive:true});
fs.writeFileSync(absolute(output('forward')),`${header.join('\n')}\n${forwardLines.join('\n')}\n`);
fs.writeFileSync(absolute(output('rollback')),
  `${header.join('\n')}\n# operation_role: rollback\n${rollbackLines.join('\n')}\n`);
const forwardSha256=sha256(`${forwardLines.join('\n')}\n`);
const rollbackSha256=sha256(`${rollbackLines.join('\n')}\n`);
const manifest = {
  schemaVersion:1,generatedAtUtc:GENERATED_AT,transactionId:BASE,
  status:'COMPILED_FROM_ACCEPTED_R08AG_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId:RELEASE_NODE,mvpScope:true,
  scopeIds:['OWN-D06-EGRESS','Z02-U1-CONCOURSE-MALL'],
  scope:{releaseId:RELEASE_ID,canonicalOwner:'OWN-D06-EGRESS',
    masterScopeOwner:'Z02-U1-CONCOURSE-MALL',mvpScope:true,
    purpose:'Line the exact dry EG-B internal-core vertical boundary while retaining its solid floor, sealed roof cap, air interior, and every uncommissioned interface.',
    geometry:{internalCoreReservation:exactSet(cellsIn(bounds)),verticalLining:exactSet(target),
      retainedFloor:exactSet(floor),retainedRoofCap:exactSet(roofCap),
      retainedAirInterior:exactSet(interior),interactionHalo:exactSet(halo)},
    operationalBoundary:{passiveInternalCoreLiningAccepted:true,egressCommissioned:false,
      accessibleRouteCommissioned:false,stairsOrLiftAuthorized:false,
      externalContinuationAuthorized:false,spineOpeningAuthorized:false}},
  scopeSelection:{doctrine:'LARGEST_EXACT_DRY_DISJOINT_EGRESS_RESERVATION_COMPONENT_OUTSIDE_LOCAL_NORTH_SMOKE_RESIDUAL',
    selected:{id:'EG-B',verticalLiningCellCount:264},
    alternatives:{monumentalConcourse:{status:'BLOCKED_NO_EXACT_UNBUILT_ARCHITECTURAL_CELL_SET'},
      discoveryCue:{status:'ALREADY_AS_BUILT_R01',cellCount:5},
      egA:{status:'DEFERRED_GRAVITY_AND_PRIOR_SMOKE_INTERACTION',interactionHaloGravelCount:18},
      northSmokeResidual:{status:'LOCAL_NON_DURABLE_PHYSICS_GROUPS_ONLY',wetCells:105,gravityCells:56}}},
  source:{snapshotRoot:SNAPSHOT,intakeAudit:INTAKE,
    terminalReleaseLedger:{path:LEDGER,transactionId:ledger.transactionId,
      completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},
    completeSaveSha256:intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256:snapshotIdentity.sha256,
    exactTargetStateCensus:census(targetRecords),retainedFloorStateCensus:census(floorRecords),
    retainedRoofCapStateCensus:census(roofRecords),retainedInteriorStateCensus:census(interiorRecords)},
  isolation:{targetFluidIntersectionCount:0,targetGravityIntersectionCount:0,
    targetContainerOrControlIntersectionCount:0,interactionHalo:exactSet(halo),
    interactionHaloFluidCount:0,interactionHaloGravityCount:0,
    interactionHaloContainerOrControlCount:0,
    blockEntityInteractionEnvelopeIntersectionCount:0,savedEntityInteractionEnvelopeIntersectionCount:0,
    protectedRelicInteractionEnvelopeIntersectionCount:0,
    deferredFutureLineSealInteractionEnvelopeIntersectionCount:0,
    isolatedN06Exception:{exactBlockedCellCount:4,interactionEnvelopeIntersectionCount:0},
    r02ReservationSupersession:{cellCount:264,airReservationCells:229,
      polishedDeepslateReservationCells:35},checkedPriorManifestCount:priorPaths.length,
    acceptedPriorManifestChecks:priorPaths.map((filename) => ({path:filename,
      transactionId:readJson(filename).transactionId,manifestIdentity:readJson(filename).manifestIdentity,
      targetIntersectionCount:filename.includes('r02-d06')?264:0})),
    undeclaredPriorReleaseIntersectionCount:0},
  executionOrder:{forward:[KEY],rollback:[KEY],
    withinPackage:'bottom-up forward; exact top-down reverse rollback; static non-gravity states only'},
  operations:{[KEY]:{forwardSha256,rollbackSha256,forwardCommandCount:264,
    rollbackCommandCount:264,targetCoordinateSetSha256:hashCells(target),exactInverse:true}},
  packages:[{key:KEY,forward:canonical('forward'),rollback:canonical('rollback')}],
  hardStops:{requireFreshImmutableSourceImmediatelyBeforeExecution:true,
    requireExactSourceGuards:true,requireLiveEntityClearance:true,
    requireBlockEntityAndProtectedCoreClearance:true,
    requireStrictNoopForwardAndRollbackParserChecks:true,
    requireJournaledStrictExecution:true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight:true},
  liveCallsPerformed:false,worldEditsPerformed:false,
};
manifest.manifestIdentity=sha256(JSON.stringify(manifest));
fs.writeFileSync(absolute(path.join(OUT,`${BASE}.release-manifest.json`)),
  `${JSON.stringify(manifest,null,2)}\n`);
process.stdout.write(`${JSON.stringify({status:manifest.status,
  manifestIdentity:manifest.manifestIdentity,targetCellCount:264,haloCellCount:532,
  forwardSha256,rollbackSha256,liveCallsPerformed:false},null,2)}\n`);
