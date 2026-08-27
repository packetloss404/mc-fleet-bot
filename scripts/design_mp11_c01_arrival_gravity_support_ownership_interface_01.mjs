#!/usr/bin/env node
/** Read-only ownership/interface design for the finite C01 arrival gravel liner. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const argv = process.argv.slice(2);
const option = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z');
const SCOUT = option('--scout', 'data/world-review/mp11-c01-arrival-gravity-support-scout-01-arrival-post-20260827T035100Z/mp11-c01-arrival-gravity-support-scout-01.json');
const DESIGN = option('--design', 'data/world-review/mp11-c01-arrival-gravity-support-design-01-arrival-post-20260827T035100Z/mp11-c01-arrival-gravity-support-design-01.json');
const OUT = option('--out', 'data/world-review/mp11-c01-arrival-gravity-support-ownership-interface-01-arrival-post-20260827T035100Z');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex'); const fail = (ok, msg) => { if (!ok) throw new Error(`MP11 C01 arrival gravity-support design rejected: ${msg}`); };
const key = (cell) => cellKey(cell); const nameOf = (state) => state.split('[', 1)[0];
const gravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(nameOf(state));
const stable = (state) => !air(state) && !gravity(state) && !['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state));
const root = abs(SNAPSHOT); for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing immutable source ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'not an immutable complete capture');
const scoutPath = abs(SCOUT); const scoutBytes = fs.readFileSync(scoutPath); const scout = JSON.parse(scoutBytes);
fail(scout.id === 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-SCOUT-01' && scout.status === 'CANDIDATE_FINITE_DRY_C01_ARRIVAL_GRAVITY_SUPPORT_REQUIRES_INTERFACE_CONTRACT' && scout.mutationAuthority === false, 'required source scout is absent or unsafe');
fail(scout.source?.snapshot === rel(SNAPSHOT) && scout.source?.captureId === capture.captureId, 'scout source binding drift');
const designPath = abs(DESIGN); const designBytes = fs.readFileSync(designPath); const design = JSON.parse(designBytes);
fail(design.id === 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-DESIGN-01' && design.status === 'SOURCE_BOUND_PERMANENT_GRAVITY_LINER_DESIGN_ONLY_REQUIRES_INTERFACE_CONTRACT' && design.mutationAuthority === false, 'B07 source-bound static design is missing');
fail(design.source?.snapshot === rel(SNAPSHOT) && design.source?.captureId === capture.captureId && design.materialDecision?.canonicalPermanentTargetState === 'minecraft:polished_deepslate', 'B07 design source or material drift');
fail(design.exactComponent?.cells?.cellCount === 33 && design.exactComponent?.lowLayerCount === 32 && design.exactComponent?.upperLayerCount === 1 && design.noFallingSequence?.forward?.transitionCount === 33 && design.noFallingSequence?.inverse?.transitionCount === 33, 'B07 sequence geometry drift');
const component = scout.scope?.finiteGravityComponent?.cells ?? [];
const halo = scout.scope?.interactionHalo ?? {}; const cadence = scout.protectedInterfaces?.acceptedArrivalCadence ?? {};
fail(component.length === 33 && halo.cellCount === 219 && cadence.oneCellHaloIntersectionCount === 4 && cadence.operatedTargetIntersectionCount === 0, 'candidate geometry or protected cadence overlap drift');
const reader = new AnvilReader(path.join(root, 'region')); const cache = new Map();
async function stateAt(cell) { const k = key(cell); if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(k); }
for (const cell of component) fail(gravity(await stateAt(cell)), `candidate source drift at ${key(cell)}`);
const componentKeys = new Set(component.map(key));
const orderedForward = [...component].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x).map((cell, index) => ({ index, point: [cell.x, cell.y, cell.z], sourceState: 'minecraft:gravel', targetState: 'minecraft:polished_deepslate', role: cell.y === 41 ? 'base-liner' : 'upper-liner' }));
const orderedRollback = [...orderedForward].reverse().map((record, index) => ({ index, point: record.point, sourceState: record.targetState, targetState: record.sourceState, role: record.role }));
for (let index = 0; index < orderedForward.length; index += 1) { const external = design.noFallingSequence.forward.transitions[index]; const local = orderedForward[index]; fail(external && external.cell.x === local.point[0] && external.cell.y === local.point[1] && external.cell.z === local.point[2] && external.sourceState === local.sourceState && external.targetState === local.targetState, `B07 forward sequence drift at ${index}`); }
const rollbackSupport = [];
for (const record of orderedRollback) {
  const cell = { x: record.point[0], y: record.point[1], z: record.point[2] }; const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  if (componentKeys.has(key(below))) rollbackSupport.push({ point: record.point, supportPoint: [below.x, below.y, below.z], supportCondition: 'still-minecraft:polished_deepslate-until-later-top-down-rollback-step' });
  else { const state = await stateAt(below); fail(stable(state), `unsupported source-gravity rollback root at ${key(cell)} over ${state}`); rollbackSupport.push({ point: record.point, supportPoint: [below.x, below.y, below.z], supportCondition: `source-stable:${state}` }); }
}
const overlapCells = [];
const arrivalTargets = [[744, 42, -81], [748, 42, -81], [760, 42, -81]];
for (const target of arrivalTargets) for (let x = target[0] - 1; x <= target[0] + 1; x += 1) for (let y = target[1] - 1; y <= target[1] + 1; y += 1) for (let z = target[2] - 1; z <= target[2] + 1; z += 1) {
  const cell = { x, y, z }; if (!componentKeys.has(key(cell)) && x >= halo.bounds.minX && x <= halo.bounds.maxX && y >= halo.bounds.minY && y <= halo.bounds.maxY && z >= halo.bounds.minZ && z <= halo.bounds.maxZ) {
    // Exact component halo is non-rectangular; use the scout's known overlap identity below, then re-census candidate local cubes.
  }
}
const candidateHalo = new Map(); for (const cell of component) for (let x = cell.x - 1; x <= cell.x + 1; x += 1) for (let y = cell.y - 1; y <= cell.y + 1; y += 1) for (let z = cell.z - 1; z <= cell.z + 1; z += 1) candidateHalo.set(key({ x, y, z }), { x, y, z });
for (const target of arrivalTargets) for (let x = target[0] - 1; x <= target[0] + 1; x += 1) for (let y = target[1] - 1; y <= target[1] + 1; y += 1) for (let z = target[2] - 1; z <= target[2] + 1; z += 1) { const cell = { x, y, z }; if (candidateHalo.has(key(cell))) overlapCells.push({ cell, sourceState: await stateAt(cell) }); }
fail(overlapCells.length === 4 && overlapCells.every((record) => !componentKeys.has(key(record.cell))), 'the four preserved cadence-halo cells are not exact retained cells');
const retainedStableGravity = [];
for (const cell of candidateHalo.values()) {
  if (componentKeys.has(key(cell))) continue;
  const state = await stateAt(cell); if (!gravity(state)) continue;
  const support = { x: cell.x, y: cell.y - 1, z: cell.z }; const supportState = await stateAt(support);
  fail(stable(supportState), `adjacent retained gravity lacks stable support at ${key(cell)} over ${supportState}`);
  retainedStableGravity.push({ cell, sourceState: state, supportCell: support, supportState });
}
fail(retainedStableGravity.length === 1 && key(retainedStableGravity[0].cell) === '757,41,-77' && retainedStableGravity[0].sourceState === 'minecraft:gravel', 'unexpected retained gravity inside candidate interaction halo');
const contractBase = {
  schemaVersion: 1,
  id: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-OWNERSHIP-INTERFACE-01',
  releaseId: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-01',
  status: 'ACCEPTED_STANDING_SCOPE_STATIC_CONTRACT_AWAITING_FRESH_GUARDED_KERNEL',
  authority: { standingDirectiveAppliesToStaticDesignAndFutureScopedExecution: true, executionAuthorizedByThisContract: false, noBroaderAuthority: true, delegatedRoles: { targetOwner: 'C01-BUNKER-ARRIVAL-GRAVITY-SUPPORT-OWNER', cadenceInterfaceOwner: 'C01-BUNKER-ARRIVAL-CADENCE-INTERFACE-OWNER', functionalQaOwner: 'C01-L1-ARRIVAL-CORRIDOR-FUNCTIONAL-QA-OWNER', guardedReleaseOperator: 'C01-GUARDED-RELEASE-OPERATOR' } },
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), scout: { path: rel(SCOUT), sha256: sha(scoutBytes), identity: scout.scoutIdentitySha256 }, B07StaticDesign: { path: rel(DESIGN), sha256: sha(designBytes), identity: design.designIdentitySha256 } },
  ownership: { targetComponent: { cellCount: component.length, coordinateSetSha256: hashCells(component), canonicalSourceState: 'minecraft:gravel', canonicalTargetState: 'minecraft:polished_deepslate', purpose: 'Permanent liner-first containment/support of the finite gravel component beneath and adjacent to the C01 L1 arrival floor.' }, interactionHalo: { cellCount: candidateHalo.size, coordinateSetSha256: hashCells([...candidateHalo.values()]), owner: 'C01-BUNKER-ARRIVAL-GRAVITY-SUPPORT-OWNER', retainedStableGravityCellCount: retainedStableGravity.length, retainedStableGravityStateSha256: sha(retainedStableGravity.map(({ cell, sourceState, supportCell, supportState }) => `${key(cell)}=${sourceState};support:${key(supportCell)}=${supportState}`).sort().join('\n')), retainedStableGravity }, arrivalCadenceProtectedInterface: { releaseId: 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-FRONTIER-01', retainedOverlapCellCount: overlapCells.length, retainedOverlapStateSha256: sha(overlapCells.map(({ cell, sourceState }) => `${key(cell)}=${sourceState}`).sort().join('\n')), cells: overlapCells, exactRule: 'These four cells are retained interface state: they may not appear in forward or rollback target sets, and source/post QA must prove their canonical state unchanged.' } },
  design: { permanentContainmentMaterial: 'minecraft:polished_deepslate', forwardOrder: 'B07-bound: 32 Y=41 z/x records then sole Y=42 cell', rollbackOrder: 'exact B07 reverse/top-down; retain lower polished-deepslate support until each higher source-gravity restoration is complete', forward: orderedForward, rollback: orderedRollback, rollbackSupport, exactInverse: true },
  fullKernelRequiredBeforeAnyFutureExecution: ['fresh complete immutable source capture and intake', 'fresh rebind of scout, this ownership contract, and compiler', 'exact source and projected-rollback preflight plus strict forward/rollback parser checks', 'fresh protected-interface/halo, block-entity, and live-entity gates', 'journaled strict execution with exact compensating subset recovery on any partial failure', 'fresh complete immutable post capture/intake, rollback post-state preflight, independent QA of targets, four retained overlap cells, retained stable adjacent gravel support, L1 floor support and two-clear headroom', 'append-only terminal ledger'],
  nonClaims: ['No live execution authorization is created by this contract.', 'No operation, public route, endpoint, egress, PC-01, rail, platform, service, power, or passenger-service status is accepted.', 'No live call or world mutation occurred while creating the contract.'],
  mutationAuthority: false
};
const contract = { ...contractBase, contractIdentitySha256: sha(`${JSON.stringify(contractBase, null, 2)}\n`) };
const minX = 750, maxX = 759, minZ = -85, maxZ = -77, w = 680 / 10, h = 300 / 9;
const projection = new Set(component.filter((cell) => cell.y === 41).map(key)); const overlapProjection = new Set(overlapCells.filter(({ cell }) => cell.y === 41).map(({ cell }) => key(cell)));
let tiles = ''; for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) { const cell = { x, y: 41, z }; const fill = overlapProjection.has(key(cell)) ? '#ff7b72' : projection.has(key(cell)) ? '#d6a857' : '#193047'; tiles += `<rect x="${80 + (x - minX) * w}" y="${125 + (z - minZ) * h}" width="${w}" height="${h}" fill="${fill}" stroke="#4a6179"/>`; }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="590" viewBox="0 0 1000 590"><rect width="1000" height="590" fill="#0d1523"/><style>.h{font:700 23px system-ui;fill:#f1f7fc}.s{font:13px ui-monospace,monospace;fill:#c4d4e4}.l{font:13px system-ui;fill:#e4edf5}</style><text x="36" y="40" class="h">C01 arrival gravity-support 01 — static ownership/interface design</text><text x="36" y="64" class="s">33 finite gravel cells → B07-bound permanent polished deepslate only after a fresh guarded kernel</text><rect x="80" y="125" width="680" height="300" fill="#142840" stroke="#5d7893"/>${tiles}<text x="80" y="454" class="s">Y=41 plan; gold = liner targets; red = retained accepted-cadence halo overlap</text><rect x="80" y="486" width="18" height="18" fill="#d6a857"/><text x="110" y="500" class="l">33 exact gravel target cells, B07 lower-to-upper forward; source state only is gravel.</text><rect x="80" y="518" width="18" height="18" fill="#ff7b72"/><text x="110" y="532" class="l">4 retained overlap cells: explicitly excluded from both forward and rollback targets.</text><text x="80" y="568" class="s">No route or service commissioning. Contract identity ${contract.contractIdentitySha256.slice(0, 16)}…</text></svg>`;
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-ownership-interface-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-ownership-interface-01-map.svg'), `${svg}\n`);
fs.writeFileSync(path.join(out, 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-OWNERSHIP-INTERFACE-01.md'), `# MP11 C01 arrival gravity-support ownership/interface 01\n\n**Status:** \`${contract.status}\`  \n**Authority:** static source-bound contract only; no live execution authority.\n\n![Static contract map](mp11-c01-arrival-gravity-support-ownership-interface-01-map.svg)\n\nThe contract binds the B07 static design and assigns the finite **33-cell** gravel component to permanent \`minecraft:polished_deepslate\` containment/support: 32 Y=41 cells then the sole Y=42 cell, with exact reverse inverse. Its ${candidateHalo.size}-cell interaction halo is source-bound. The four cells where that halo touches the accepted arrival-cadence halo are retained state, excluded from both target sets, and mandatory post-QA assertions. The only other halo gravity cell, \`(757,41,-77)\`, is a retained, unoperated gravel cell with exact stable polished-deepslate support; source and post QA must preserve both states.\n\nNo execution may begin without every fresh guarded-kernel condition recorded in the contract.\n`);
console.log(JSON.stringify({ status: contract.status, out: rel(out), contractIdentity: contract.contractIdentitySha256, targetCount: component.length, haloCount: candidateHalo.size, preservedCadenceOverlapCount: overlapCells.length, mutationAuthority: false }, null, 2));
