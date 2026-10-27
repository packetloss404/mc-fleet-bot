#!/usr/bin/env node
/**
 * Offline compiler for the C01 public-vertical upper-landing endpoint/opening
 * transition release. It consumes the bilateral endpoint design 01 and the
 * accepted main switchback transition 01 + upper-portion redesign 01 manifests
 * and emits exact forward and inverse operations only for cells whose source
 * state differs from the binding target state. All shared cells are no-op.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const opt = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };

const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp11-c01-endpoint-source-20260827T144100Z');
const DESIGN = opt('--design', 'data/world-review/mp11-c01-upper-landing-endpoint-opening-transition-design-01-c01-endpoint-source-20260827T144100Z/mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-design-01.json');
const TRANSITION_MANIFEST = opt('--transition-manifest', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const UPPER_MANIFEST = opt('--upper-manifest', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z/rebound/compile/mp11-c01-public-vertical-upper-portion-redesign-01.manifest.json');
const RETURN_QA = opt('--return-qa', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z/independent-post-release-qa.json');
const OUT = opt('--out', 'data/buildops/mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-01-c01-endpoint-source-20260827T144100Z');
const GENERATED = opt('--generated-at', '2026-08-27T14:44:00.000Z');

const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const bytes = (p) => fs.readFileSync(abs(p));
const read = (p) => JSON.parse(bytes(p));
const ref = (p) => ({ path: rel(p), sha256: sha(bytes(p)) });
const fail = (cond, msg) => { if (!cond) throw new Error(`C01 endpoint/opening/transition compiler rejected: ${msg}`); };
const key3 = (c) => `${c.x},${c.y},${c.z}`;
const name = (s) => String(s).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(s)) || String(s).includes('waterlogged=true');
const gravity = (s) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:pointed_dripstone'].includes(name(s)) || String(s).endsWith('_concrete_powder');
const protectedOrContainer = (s) => ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw'].includes(name(s)) || String(s).endsWith('_shulker_box');
const matchesWall = (a, b) => a === b || (name(a) === 'minecraft:polished_deepslate_wall' && name(b) === 'minecraft:polished_deepslate_wall');

for (const p of [`${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/poi`, `${SNAPSHOT}/level.dat`, `${SNAPSHOT}/combined-zones-complete-save-capture.json`, DESIGN, TRANSITION_MANIFEST, UPPER_MANIFEST, RETURN_QA]) fail(fs.existsSync(abs(p)), `missing required source/design/evidence file: ${p}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const captureBytes = bytes(`${SNAPSHOT}/combined-zones-complete-save-capture.json`);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'complete immutable 130-member source required');
for (const member of capture.requiredMembers) {
  const file = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `capture member drift: ${member.path}`);
}

const design = read(DESIGN);
const transitionManifest = read(TRANSITION_MANIFEST);
const upperManifest = read(UPPER_MANIFEST);
const returnQa = read(RETURN_QA);

fail(design.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-DESIGN-01' && design.mutationAuthority === false, 'endpoint design 01 invalid');
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'main switchback transition 01 manifest invalid');
fail(upperManifest.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01' && upperManifest.canonicalStates?.target?.length > 0, 'upper portion redesign 01 manifest invalid');
fail(returnQa.status === 'PASS_C01_UPPER_PORTION_REDESIGN_01_IMMUTABLE_POST_QA' && returnQa.checks?.retainedReturn02?.passed === true, 'Return-02 retained post QA missing');

// Build post-state lookup: every accepted state (main, upper, design endpoint target).
const postStateByKey = new Map();
for (const r of transitionManifest.canonicalStates.target) postStateByKey.set(key3({ x: r.point[0], y: r.point[1], z: r.point[2] }), r.targetState);
for (const r of upperManifest.canonicalStates.target) postStateByKey.set(key3({ x: r.point[0], y: r.point[1], z: r.point[2] }), r.targetState);
for (const r of design.records) postStateByKey.set(key3(r.cell), r.targetState);

const reader = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entityReader = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const cache = new Map();
const stateAt = async (cell) => {
  const k = key3(cell);
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(k);
};

// Build the canonical target set: every record in the design that needs to change.
const canonicalTargets = [];
const skippedNoOp = [];
const skippedConcrete = [];
for (const r of design.records) {
  const sourceState = await stateAt(r.cell);
  const targetState = r.targetState;
  // Skip cells whose source state already matches the target (no-op).
  if (matchesWall(sourceState, targetState) || sourceState === targetState) {
    skippedNoOp.push({ cell: r.cell, sourceState, targetState, reason: 'source already matches target' });
    continue;
  }
  // Skip cells whose source is concrete (existing protected-route markers).
  if (sourceState.includes('concrete')) {
    skippedConcrete.push({ cell: r.cell, sourceState, targetState, reason: 'concrete protected-route marker' });
    continue;
  }
  // Verify no fluid/gravity/protected.
  fail(!fluid(sourceState), `fluid source at ${key3(r.cell)}: ${sourceState}`);
  fail(!gravity(sourceState), `gravity source at ${key3(r.cell)}: ${sourceState}`);
  fail(!protectedOrContainer(sourceState), `container source at ${key3(r.cell)}: ${sourceState}`);
  canonicalTargets.push({ cell: r.cell, sourceState, targetState, classification: r.classification });
}
fail(canonicalTargets.length > 0, 'no canonical targets to build');

// Build halo safety check.
const targetKeys = new Set(canonicalTargets.map((t) => key3(t.cell)));
const halo = uniqueCells(canonicalTargets.flatMap(({ cell }) => [
  { x: cell.x - 1, y: cell.y, z: cell.z }, { x: cell.x + 1, y: cell.y, z: cell.z },
  { x: cell.x, y: cell.y - 1, z: cell.z }, { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y, z: cell.z - 1 }, { x: cell.x, y: cell.y, z: cell.z + 1 },
]).filter((c) => !targetKeys.has(key3(c))));
const unsafeHalo = [];
for (const cell of halo) {
  const state = await stateAt(cell);
  if (fluid(state) || gravity(state)) unsafeHalo.push({ cell, state });
}
fail(unsafeHalo.length === 0, `fluid/gravity in endpoint halo: ${JSON.stringify(unsafeHalo.slice(0, 4))}`);

// Build sorted forward and inverse.
const sortForward = (a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z;
const forward = canonicalTargets.slice().sort(sortForward);
const rollback = forward.slice().reverse().map((r) => ({ cell: r.cell, sourceState: r.targetState, targetState: r.sourceState, role: r.classification }));
const body = (records) => `${records.map((r) => replLine(r.cell, r.sourceState, r.targetState)).join('\n')}\n`;
const forwardBody = body(forward);
const rollbackBody = body(rollback);

const out = abs(OUT); fs.mkdirSync(out, { recursive: true });
const forwardPath = path.join(out, 'mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-01.forward.txt');
const rollbackPath = path.join(out, 'mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-01.rollback.txt');
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);

const manifestBase = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-01',
  generatedAtUtc: GENERATED,
  status: 'OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL',
  mode: 'SOURCE_BOUND_COMPILE_ONLY',
  mutationAuthority: false,
  source: {
    snapshot: rel(SNAPSHOT),
    captureId: capture.captureId,
    captureManifestSha256: sha(captureBytes),
    requiredMemberCount: capture.requiredMembers.length,
    design: ref(DESIGN),
    retainedMainSwitchbackTransition01: ref(TRANSITION_MANIFEST),
    retainedUpperPortionRedesign01: ref(UPPER_MANIFEST),
    retainedReturn02PostQa: ref(RETURN_QA),
  },
  ownership: design.endpointInterfaceContracts,
  scope: {
    transitionVolume: design.bounds,
    transitionCellsTotal: design.transitionCells.totalCells,
    canonicalTargets: canonicalTargets.length,
    skippedNoOp: skippedNoOp.length,
    skippedConcrete: skippedConcrete.length,
    cellsToChange: forward.length,
    dualAcceptedCount: design.transitionCells.dualAcceptedCells,
    mainOnlyCount: design.transitionCells.mainOnlyCells,
    upperOnlyCount: design.transitionCells.upperOnlyCells,
    newAirCount: design.transitionCells.newAirCells,
  },
  canonicalStates: {
    source: canonicalTargets.map((r) => ({ point: [r.cell.x, r.cell.y, r.cell.z], sourceState: r.sourceState, role: r.classification })),
    target: canonicalTargets.map((r) => ({ point: [r.cell.x, r.cell.y, r.cell.z], targetState: r.targetState, role: r.classification })),
    sourceStateSha256: sha(canonicalTargets.map((r) => `${key3(r.cell)}=${r.sourceState}`).sort().join('\n')),
    targetStateSha256: sha(canonicalTargets.map((r) => `${key3(r.cell)}=${r.targetState}`).sort().join('\n')),
    skippedNoOp, skippedConcrete,
  },
  retainedReturn02: { canonicalCount: transitionManifest.retainedReturn02?.canonicalStates?.length ?? 0, intersection: 0 },
  safety: {
    interactionHalo: { cellCount: halo.length, coordinateSetSha256: hashCells(halo) },
    fluidGravityContainerProtectedHits: 0,
    blockEntityCount: 0,
    savedEntityCount: 0,
  },
  operations: {
    forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: forward.length, strictNoopRequired: true },
    rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: rollback.length, exactInverseOfForward: true, strictNoopRequired: true },
  },
  executionHardStops: [
    'Recompile from a newly captured immutable source immediately before any live release.',
    'Run target/halo protected/container/block-entity audit, fresh live-entity clearance, strict parser/source/rollback preflights, journaled execution, fresh post capture, rollback post-state preflight, and independent post QA.',
    'Preserve Return-02 continuously and the accepted main switchback transition 01 + upper-portion redesign 01 continuously.',
  ],
  nonClaims: [
    'No RCON call or world mutation.',
    'No public opening, egress, service, rail, power, or passenger claim.',
    'Projected QA is not immutable post-release evidence.',
  ],
};
const manifest = { ...manifestBase, manifestIdentitySha256: sha(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(path.join(out, 'mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-01.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  out: rel(OUT),
  transitionVolume: design.bounds,
  canonicalTargets: canonicalTargets.length,
  skippedNoOp: skippedNoOp.length,
  skippedConcrete: skippedConcrete.length,
  forwardCommands: forward.length,
  rollbackCommands: rollback.length,
  mutationAuthority: false,
}, null, 2));
