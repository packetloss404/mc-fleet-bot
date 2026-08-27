#!/usr/bin/env node
/**
 * Compile MP08-RR-T1B-WAYFINDING-01.
 *
 * A static, source-bound design package for two wall signs on the already
 * traversable RR-T1b leg.  It deliberately does not contact Minecraft or RCON.
 * A new complete source and live-entity check are still mandatory at release.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-rail-r10-high16-high14-band-post-20260826T120000Z');
const SURVEY = option('--survey', 'data/world-review/mp08-fresh-complete-source-03-20260826T102731Z.json');
const OUT_DIR = option('--out-dir', 'data/buildops');
const BASENAME = option('--basename', 'mp08-rr-t1b-two-wall-sign-wayfinding');
const GENERATED_AT = option('--generated-at', '2026-08-26T10:45:00Z');
const absolute = (f) => path.resolve(ROOT, f);
const relative = (f) => path.relative(ROOT, absolute(f)).split(path.sep).join('/');
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (test, message) => { if (!test) throw new Error(`MP08 RR-T1b compiler rejected: ${message}`); };
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const blockName = (s) => s.split('[', 1)[0];
const isAir = (s) => AIR.has(blockName(s));
const isFluid = (s) => FLUID.has(blockName(s)) || s.includes('waterlogged=true');
const isGravity = (s) => GRAVITY.has(blockName(s)) || blockName(s).endsWith('_concrete_powder');
const isForbidden = (s) => FORBIDDEN.has(blockName(s)) || blockName(s).endsWith('_shulker_box');
const classManifest = (cells) => { const values = uniqueCells(cells); return { cellCount: values.length, bounds: values.length ? boundsOf(values) : null, coordinateSetSha256: hashCells(values) }; };

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stateAt = async (p) => stateToCommandString(await reader.blockState(p.x, p.y, p.z));
const survey = JSON.parse(fs.readFileSync(absolute(SURVEY), 'utf8'));
const capture = JSON.parse(fs.readFileSync(absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), 'utf8'));
const requiredMembers = new Set(capture.requiredMembers.map((entry) => entry.path));
for (const required of ['level.dat']) fail(requiredMembers.has(required), `complete snapshot is missing ${required}`);
for (const prefix of ['region/', 'entities/', 'poi/']) fail([...requiredMembers].some((entry) => entry.startsWith(prefix)), `complete snapshot is missing ${prefix}`);
fail(capture.immutableCopy === true, 'snapshot is not immutable');
fail(survey.status === 'CANDIDATE_FOUND_NO_OPERATION_COMPILED', 'survey is not an accepted candidate survey');
fail(survey.source.captureId === capture.captureId, 'survey and snapshot capture identity differ');

const EMPTY_SIGN_NBT = '{front_text:{color:"black",has_glowing_text:0b,messages:["","","",""]},back_text:{color:"black",has_glowing_text:0b,messages:["","","",""]},is_waxed:0b,keepPacked:0b}';
const signNbt = (lines) => `{front_text:{color:"white",has_glowing_text:1b,messages:[${lines.map((line) => JSON.stringify(`{"text":"${line}"}`)).join(',')}]},back_text:{color:"black",has_glowing_text:0b,messages:["","","",""]},is_waxed:0b,keepPacked:0b}`;
const SIGNS = [
  { id: 'north-advance', cell: { x: -7, y: -4, z: -117 }, support: { x: -8, y: -4, z: -117 }, supportState: 'minecraft:deepslate[axis=y]', desiredState: 'minecraft:spruce_wall_sign[facing=east,waterlogged=false]', lines: ['CAVERN A', 'T1b / PRIMARY', 'FOLLOW TUNNEL', ''], direction: 'toward Cavern A' },
  { id: 'cavern-a-confirmation', cell: { x: 4, y: -10, z: -48 }, support: { x: 5, y: -10, z: -48 }, supportState: 'minecraft:deepslate[axis=y]', desiredState: 'minecraft:spruce_wall_sign[facing=west,waterlogged=false]', lines: ['NORTH VESTIBULE', 'N1 / NORTH PORTAL', 'FOLLOW TUNNEL', ''], direction: 'toward North Blast Vestibule N1 / North Portal' },
].map((sign) => ({ ...sign, sourceState: 'minecraft:air', sourceNbt: null, desiredNbt: signNbt(sign.lines) }));

const surveyedById = new Map(survey.prospectiveWayfindingTreatment.targets.map((t) => [t.id, t]));
for (const sign of SIGNS) {
  const candidate = surveyedById.get(sign.id);
  fail(candidate && JSON.stringify(candidate.cell) === JSON.stringify(sign.cell) && candidate.desiredState === sign.desiredState, `survey candidate differs for ${sign.id}`);
  fail(await stateAt(sign.cell) === sign.sourceState, `${sign.id} target source-state drift`);
  fail(await stateAt(sign.support) === sign.supportState, `${sign.id} support-state drift`);
}

const targets = SIGNS.map((sign) => sign.cell);
const targetKeys = new Set(targets.map(cellKey));
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const halo = uniqueCells(targets.flatMap(({ x, y, z }) => six.map(([dx, dy, dz]) => ({ x: x + dx, y: y + dy, z: z + dz })))).filter((p) => !targetKeys.has(cellKey(p)));
const haloStates = await Promise.all(halo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
const hazards = haloStates.filter(({ state }) => isFluid(state) || isGravity(state) || isForbidden(state));
fail(hazards.length === 0, `target halo has a fluid/gravity/container/control hazard: ${JSON.stringify(hazards)}`);

// Recheck normal walking rather than trusting a prose route label.
const route = survey.routeProof.threeWideCore.profile;
const routeCells = [];
for (const { z, floorY } of route) for (let x = -1; x <= 1; x += 1) {
  const support = await stateAt({ x, y: floorY, z });
  const feet = await stateAt({ x, y: floorY + 1, z });
  const head = await stateAt({ x, y: floorY + 2, z });
  fail(!isAir(support) && !isFluid(support) && isAir(feet) && isAir(head), `normal-walk proof drift at ${x},${floorY},${z}`);
  routeCells.push({ x, y: floorY, z }, { x, y: floorY + 1, z }, { x, y: floorY + 2, z });
}
for (let i = 1; i < route.length; i += 1) fail(Math.abs(route[i].floorY - route[i - 1].floorY) <= 1, 'route grade no longer supports normal walking');
const envelope = uniqueCells([...targets, ...halo]);
const envelopeKeys = new Set(envelope.map(cellKey));
const envelopeBounds = boundsOf(envelope);
const chunks = new Set(envelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = []; const savedEntities = [];
for (const chunkKey of chunks) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(x, z);
  for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const p = { x: Number(be.x), y: Number(be.y), z: Number(be.z) }; if (envelopeKeys.has(cellKey(p))) blockEntities.push({ id: be.id ?? be.Id ?? null, cell: p }); }
  const entityChunk = await entityReader.chunk(x, z);
  for (const e of entityChunk?.Entities ?? entityChunk?.entities ?? []) { const p = e.Pos?.slice(0, 3).map(Number); if (p?.length === 3 && p[0] >= envelopeBounds.minX && p[0] <= envelopeBounds.maxX && p[1] >= envelopeBounds.minY && p[1] <= envelopeBounds.maxY && p[2] >= envelopeBounds.minZ && p[2] <= envelopeBounds.maxZ) savedEntities.push({ id: e.id ?? e.Id ?? null, position: p }); }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'target or halo intersects a stored block entity or saved entity');

const protectedBounds = [
  { id: 'RR-C2/Cavern-C', minX: -125, maxX: -70, minY: -25, maxY: -3, minZ: -25, maxZ: -2 },
  { id: 'RR-N6/T4-wet-interface', minX: -292, maxX: -185, minY: -18, maxY: 14, minZ: -12, maxZ: 8 },
];
const overlaps = protectedBounds.filter((b) => !(envelopeBounds.maxX < b.minX || envelopeBounds.minX > b.maxX || envelopeBounds.maxY < b.minY || envelopeBounds.minY > b.maxY || envelopeBounds.maxZ < b.minZ || envelopeBounds.minZ > b.maxZ));
fail(overlaps.length === 0, 'target envelope overlaps a closed/protected system');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const forward = path.join(OUT_DIR, `${BASENAME}.two-wall-signs.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.two-wall-signs.rollback.txt`);
const projectedOverlay = path.join(OUT_DIR, `${BASENAME}.two-wall-signs.projected-state-overlay.txt`);
const header = [`# MP08-RR-T1B-WAYFINDING-01/two-wall-signs`, `# source ${SNAPSHOT}`, '# exact source state plus exact sign-NBT transition; static only'];
// Keep the destination block guard last: the guarded-manifest verifier binds
// that final guard to the data-merge destination, while the support remains an
// equally exact prerequisite.
const guardedMerge = (sign, nbt) => `CMD execute if block ${sign.support.x} ${sign.support.y} ${sign.support.z} ${sign.supportState} if block ${sign.cell.x} ${sign.cell.y} ${sign.cell.z} ${sign.desiredState} run data merge block ${sign.cell.x} ${sign.cell.y} ${sign.cell.z} ${nbt}`;
const forwardLines = SIGNS.flatMap((sign) => [replLine(sign.cell, sign.sourceState, sign.desiredState), guardedMerge(sign, sign.desiredNbt)]);
// The source has no block entity.  The rollback merge first resets every authored
// NBT field under the exact sign/support guards, then the guarded REPL removes the
// sign block entity, returning the exact source state/NBT pair: air + absence.
const rollbackLines = [...SIGNS].reverse().flatMap((sign) => [guardedMerge(sign, EMPTY_SIGN_NBT), replLine(sign.cell, sign.desiredState, sign.sourceState)]);
fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardLines.join('\n')}\n`);
fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackLines.join('\n')}\n`);
// This overlay is intentionally REPL-only.  It lets preflight_guarded_ops model
// the post-forward block states for a rollback preflight without attempting to
// reinterpret the separate guarded sign-NBT CMD operations as block changes.
const projectedOverlayLines = SIGNS.map((sign) => replLine(sign.cell, sign.sourceState, sign.desiredState));
fs.writeFileSync(absolute(projectedOverlay), `${header.join('\n')}\n# exact-REPL-only projected post-forward block-state overlay\n${projectedOverlayLines.join('\n')}\n`);
const manifestBase = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT, transactionId: 'mp08-rr-t1b-two-wall-sign-wayfinding', status: 'STATIC_SOURCE_BOUND_DESIGN_AWAITING_FRESH_EXECUTION_KERNEL', mvpScope: false, scopeIds: ['raven-rock'],
  scope: { releaseId: 'MP08-RR-T1B-WAYFINDING-01', canonicalOwner: 'Raven Rock / Site R', purpose: 'Two bounded wall signs provide advance and return legibility on the measured normal-walk RR-T1b core without changing the route.', signCount: SIGNS.length, signs: SIGNS.map(({ sourceNbt, desiredNbt, ...sign }) => sign), normalWalkRoute: { stationCount: route.length, core: { x: [-1, 1], cellCount: routeCells.length, coordinateSetSha256: hashCells(routeCells) }, maximumAdjacentFloorDelta: 1, unchangedByTargets: true } },
  source: { snapshotRoot: relative(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha256(fs.readFileSync(absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')))), survey: relative(SURVEY), surveyIdentitySha256: survey.identitySha256 },
  geometry: { targets: classManifest(targets), interactionHalo: { ...classManifest(halo), records: haloStates }, protectedSystemOverlapCount: 0 },
  nbtContract: { sourceTargetNbt: 'ABSENT (source blocks are exact air)', forwardWrites: SIGNS.map((s) => ({ id: s.id, desiredState: s.desiredState, desiredNbt: s.desiredNbt, sha256: sha256(s.desiredNbt) })), rollbackWrites: SIGNS.map((s) => ({ id: s.id, resetNbt: EMPTY_SIGN_NBT, sha256: sha256(EMPTY_SIGN_NBT), finalSourceNbt: null })), exactInverse: 'The rollback guarded merge clears all authored NBT fields before guarded REPL sign-to-air removes the block entity; final source pair is air + no NBT.' },
  isolation: { targetFluidGravityContainerControlCount: 0, haloFluidGravityContainerControlCount: 0, targetAndHaloBlockEntityCount: blockEntities.length, targetAndHaloSavedEntityCount: savedEntities.length, protectedCoreOverlapCount: 0 },
  packages: [{ key: 'two-wall-signs', forward: relative(forward), rollback: relative(rollback), reactiveCells: [] }],
  projectedStateOverlay: { path: relative(projectedOverlay), sha256: sha256(fs.readFileSync(absolute(projectedOverlay))), replOnly: true, replLineCount: projectedOverlayLines.length, targetCoordinateSetSha256: hashCells(targets), purpose: 'Projected post-forward exact block states for rollback preflight only; guarded NBT commands remain separately bound in the forward/rollback operation files.' },
  operations: { 'two-wall-signs': { forwardSha256: sha256(fs.readFileSync(absolute(forward))), rollbackSha256: sha256(fs.readFileSync(absolute(rollback))), forwardCommandCount: forwardLines.length, rollbackCommandCount: rollbackLines.length, blockTransitions: SIGNS.length, guardedDataMerges: { forward: SIGNS.length, rollback: SIGNS.length }, exactStateAndNbtInverse: true } },
  executionOrder: { forward: ['two-wall-signs'], rollback: ['two-wall-signs'] },
  hardStops: { requireNewCompleteImmutableSourceImmediatelyBeforeExecution: true, requireFreshLiveEntityClearance: true, requireExactSourcePreflightIncludingNbtContract: true, requireStrictNoopParserChecksForwardAndRollback: true, requireJournaledStrictExecution: true, requireFreshPostSnapshotAndRollbackPoststatePreflight: true, requireIndependentRouteAndSignLegibilityQa: true },
  nonClaims: ['No excavation, containment, C2/Cavern-C/RR-N6/T4 work, public opening, accessibility certification, or whole Raven Rock completion claim.', 'This package is static only and is not execution authority without the fresh kernel.'], liveCallsPerformed: false, worldEditsPerformed: false,
};
const manifest = { ...manifestBase, manifestIdentity: sha256(`${JSON.stringify(manifestBase, null, 2)}\n`) };
const manifestOut = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestOut), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: relative(manifestOut), targetCount: SIGNS.length, routeStations: route.length, manifestIdentity: manifest.manifestIdentity, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
