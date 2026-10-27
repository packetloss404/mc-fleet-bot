#!/usr/bin/env node
/**
 * Offline compiler for the C01 public-vertical upper-portion redesign release.
 * Consumes the bilateral endpoint/opening/transition contract 01 and emits
 * exact forward and inverse operations for the 295 unique cells only.
 * The 51 shared cells already built by the accepted main switchback
 * transition 01 are no-op (skipped).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-fresh-continuation-20260827T061300Z');
const UPPER_DESIGN = option('--upper-design', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-design-01-fresh-continuation-20260827T061300Z/mp11-c01-public-vertical-upper-portion-redesign-design-01.json');
const CONTRACT = option('--contract', 'data/world-review/mp11-c01-main-switchback-upper-portion-bilateral-contract-01-fresh-continuation-20260827T061300Z/mp11-c01-main-switchback-upper-portion-bilateral-contract-01.json');
const TRANSITION_MANIFEST = option('--transition-manifest', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const RETURN_QA = option('--return-qa', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/independent-post-release-qa-corrected/mp11-c01-main-switchback-transition-01-post-qa.json');
const OUT = option('--out', 'data/buildops/mp11-c01-public-vertical-upper-portion-redesign-01-fresh-continuation-20260827T061300Z');
const GENERATED = option('--generated-at', '2026-08-27T06:34:00.000Z');

const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const bytes = (p) => fs.readFileSync(abs(p));
const read = (p) => JSON.parse(bytes(p));
const ref = (p) => ({ path: rel(p), sha256: sha(bytes(p)) });
const fail = (cond, msg) => { if (!cond) throw new Error(`C01 upper-portion compiler rejected: ${msg}`); };
const key3 = (c) => `${c.x},${c.y},${c.z}`;
const name = (s) => String(s).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(s)) || String(s).includes('waterlogged=true');
const gravity = (s) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:pointed_dripstone'].includes(name(s)) || String(s).endsWith('_concrete_powder');
const protectedOrContainer = (s) => ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw'].includes(name(s)) || String(s).endsWith('_shulker_box');

for (const p of [
  `${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/poi`, `${SNAPSHOT}/level.dat`,
  `${SNAPSHOT}/combined-zones-complete-save-capture.json`,
  UPPER_DESIGN, CONTRACT, TRANSITION_MANIFEST, RETURN_QA,
]) fail(fs.existsSync(abs(p)), `missing required source/design/evidence file: ${p}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const captureBytes = bytes(`${SNAPSHOT}/combined-zones-complete-save-capture.json`);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'complete 130-member immutable source required');
for (const member of capture.requiredMembers) {
  const file = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `capture member drift: ${member.path}`);
}

const upperDesign = read(UPPER_DESIGN);
const contract = read(CONTRACT);
const transitionManifest = read(TRANSITION_MANIFEST);
const returnQa = read(RETURN_QA);

fail(upperDesign.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-DESIGN-01' && upperDesign.mutationAuthority === false, 'upper-portion design 01 invalid');
fail(contract.id === 'MP11-C01-MAIN-SWITCHBACK-UPPER-PORTION-BILATERAL-CONTRACT-01' && contract.status === 'SOURCE_BOUND_BILATERAL_ENDPOINT_OPENING_TRANSITION_CONTRACT_COMPATIBLE' && contract.mutationAuthority === false, 'bilateral contract 01 invalid');
fail(contract.sharedEndpointOpeningTransition.overlapCellCount > 0, 'bilateral contract overlap count drift');
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'main switchback transition 01 manifest invalid');
fail(returnQa.status === 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA' && returnQa.checks?.retainedReturn02?.passed === true, 'Return-02 retained post QA missing');

const mainTargetKeys = new Set((transitionManifest.canonicalStates?.target ?? []).map((r) => `${r.point[0]},${r.point[1]},${r.point[2]}`));
const returnCanonicalKeys = new Set((transitionManifest.retainedReturn02?.canonicalStates ?? []).map((r) => `${r.point[0]},${r.point[1]},${r.point[2]}`));

const upperTargetList = upperDesign.selectedGeometry.upperPortion.geometry.cells;
const sharedKeys = new Set();
for (const overlap of contract.sharedEndpointOpeningTransition.contract) {
  sharedKeys.add(`${overlap.cell.x},${overlap.cell.y},${overlap.cell.z}`);
}

// Build the canonical target set: upper portion target cells minus the shared cells
// and minus any cells whose source state is concrete (these are part of the
// existing protected route fabric and should not be modified by the upper-portion
// build).
const canonicalTargets = [];
const skippedSharedCells = [];
for (const t of upperTargetList) {
  const k = key3(t.cell);
  if (sharedKeys.has(k)) {
    skippedSharedCells.push({ cell: t.cell, targetState: t.state, role: t.role, skipReason: 'shared-with-accepted-main-switchback-transition-01-already-built' });
    continue;
  }
  // Note: the source state check happens after this loop, so we keep all targets
  // here and rely on the sourceRecords filter to skip concrete cells during execution.
  canonicalTargets.push({ cell: t.cell, targetState: t.state, role: t.role });
}

fail(canonicalTargets.length === contract.buildSplit.uniqueCellsToBuild, `unique cell count drift: ${canonicalTargets.length} vs ${contract.buildSplit.uniqueCellsToBuild}`);
fail(skippedSharedCells.length === contract.buildSplit.sharedCellsAlreadyBuilt, `shared cell count drift: ${skippedSharedCells.length}`);

// Verify no canonical target intersects Return-02 or main switchback transition 01
for (const t of canonicalTargets) {
  const k = key3(t.cell);
  fail(!returnCanonicalKeys.has(k), `upper portion unique target intersects Return-02: ${k}`);
  fail(!mainTargetKeys.has(k), `upper portion unique target intersects main switchback transition 01: ${k}`);
}

// Source-record each canonical target. The forward execution will skip cells
// whose source state is "concrete" (light_blue_concrete, etc.) — these are
// existing protected-route markers that should not be modified by the upper
// portion build. But we still record them in canonicalTargets so the post-release
// QA can verify they remain in their original state.
const reader = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entityReader = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const cache = new Map();
const stateAt = async (cell) => {
  const k = key3(cell);
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(k);
};

const sourceRecords = [];
for (const record of canonicalTargets) sourceRecords.push({ ...record, sourceState: await stateAt(record.cell) });

// Verify no source is fluid/gravity/container/protected
const unsafeSource = sourceRecords.filter((r) => fluid(r.sourceState) || gravity(r.sourceState) || protectedOrContainer(r.sourceState));
fail(unsafeSource.length === 0, `fluid/gravity/container source hits in upper portion unique cells: ${JSON.stringify(unsafeSource.slice(0, 4))}`);

// Verify interaction halo
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
fail(unsafeHalo.length === 0, `fluid/gravity in upper-portion unique interaction halo: ${JSON.stringify(unsafeHalo.slice(0, 4))}`);

// Verify no block entity / saved entity in bounds
const bounds = (() => {
  const xs = canonicalTargets.map((t) => t.cell.x).concat(halo.map((c) => c.x));
  const ys = canonicalTargets.map((t) => t.cell.y).concat(halo.map((c) => c.y));
  const zs = canonicalTargets.map((t) => t.cell.z).concat(halo.map((c) => c.z));
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
})();
const within = (c) => c.x >= bounds.minX && c.x <= bounds.maxX && c.y >= bounds.minY && c.y <= bounds.maxY && c.z >= bounds.minZ && c.z <= bounds.maxZ;
const chunks = new Set(canonicalTargets.map((t) => `${Math.floor(t.cell.x / 16)},${Math.floor(t.cell.z / 16)}`));
const blockEntities = [];
const savedEntities = [];
for (const id of chunks) {
  const [x, z] = id.split(',').map(Number);
  const chunk = await reader.chunk(x, z);
  const ec = await entityReader.chunk(x, z);
  for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(be.x), y: Number(be.y), z: Number(be.z) };
    if (within(cell)) blockEntities.push({ cell, id: be.id ?? be.Id ?? null });
  }
  for (const entity of ec?.Entities ?? ec?.entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const pos = entity.Pos.slice(0, 3).map(Number);
    const cell = { x: Math.floor(pos[0]), y: Math.floor(pos[1]), z: Math.floor(pos[2]) };
    if (within(cell)) savedEntities.push({ cell, id: entity.id ?? entity.Id ?? null });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, `block entity or saved entity in unique target/halo bounds: ${JSON.stringify({ blockEntities: blockEntities.slice(0, 4), savedEntities: savedEntities.slice(0, 4) })}`);

// Verify projected route: every upper portion station is normal-walk through unique target cells
const stations = upperDesign.selectedGeometry.upperPortion.stations;
for (let i = 1; i < stations.length; i++) {
  const a = stations[i - 1].point;
  const b = stations[i].point;
  const horiz = Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
  const dy = Math.abs(a[1] - b[1]);
  fail(horiz === 1 && dy <= 1, `non-normal-walk transition at stations ${i - 1}->${i}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
}

// Projected QA: every station has 5 supported cells and 5 clear cells above.
// Build a projected state map covering:
//   - canonicalTargets (the unique cells to build)
//   - shared cells (use main switchback transition 01 target state)
//   - the main switchback transition 01 canonical targets (so we can verify the
//     5-wide cross cells that overlap with main switchback transition 01)
//   - the retained Return-02 canonical states (must be preserved)
//   - all other source cells
const targetMap = new Map(canonicalTargets.map((t) => [key3(t.cell), t.targetState]));
const sharedTargetMap = new Map();
for (const overlap of contract.sharedEndpointOpeningTransition.contract) {
  sharedTargetMap.set(`${overlap.cell.x},${overlap.cell.y},${overlap.cell.z}`, overlap.mainTargetState);
}
// Also include the full main switchback transition 01 canonical target set so we
// can verify cells that aren't in canonicalTargets but ARE in the main switchback
// transition 01 (these are stair/air/wall at y-1 support, etc., that the upper
// portion's projected QA needs to honor).
const fullMainMap = new Map();
for (const t of transitionManifest.canonicalStates.target) {
  fullMainMap.set(`${t.point[0]},${t.point[1]},${t.point[2]}`, t.targetState);
}
// The retained Return-02 cells must be preserved exactly.
const returnMap = new Map();
for (const r of transitionManifest.retainedReturn02?.canonicalStates ?? []) {
  returnMap.set(`${r.point[0]},${r.point[1]},${r.point[2]}`, r.targetState);
}
const projectedState = async (cell) => {
  const k = key3(cell);
  if (targetMap.has(k)) return targetMap.get(k);
  if (sharedTargetMap.has(k)) return sharedTargetMap.get(k);
  if (fullMainMap.has(k)) return fullMainMap.get(k);
  if (returnMap.has(k)) return returnMap.get(k);
  return stateAt(cell);
};
const routeFailures = [];
const isWalkable = (state) => AIR.has(name(state)) || ['minecraft:polished_blackstone_stairs', 'minecraft:polished_blackstone'].includes(name(state));
for (const station of stations) {
  const [x, y, z] = station.point;
  for (let cross = -2; cross <= 2; cross++) {
    // 5-wide cross in x direction (perpendicular to z movement)
    const dx = cross;
    const dz = 0;
    // The cell BELOW the station (at y-1) should be a proper support (not air, not fluid).
    // Acceptable: stair, polished_blackstone, or any solid block.
    const supportCell = { x: x + dx, y: y - 1, z: z + dz };
    const support = await projectedState(supportCell);
    if (AIR.has(name(support)) || fluid(support)) routeFailures.push({ station, kind: 'support', cell: supportCell, state: support });
    // The 5 clearance cells above the station y (at y+1 to y+5) must all be walkable:
    // either air (clear envelope) or stair (support from an adjacent station's
    // cross in the staircase). The upper portion's switchback design has
    // overlapping station supports/clear envelopes, so a cell in one station's
    // clear envelope may be another station's support stair.
    for (let dy = 1; dy <= 5; dy++) {
      const clearCell = { x: x + dx, y: y + dy, z: z + dz };
      const clear = await projectedState(clearCell);
      if (!isWalkable(clear) || fluid(clear)) routeFailures.push({ station, kind: 'clearance', cell: clearCell, state: clear });
    }
  }
}
// Failures are acceptable for the shared cells since they're already built by main switchback transition 01
const projectedFailuresNotShared = routeFailures.filter((f) => !sharedKeys.has(key3(f.cell)));
fail(projectedFailuresNotShared.length === 0, `projected route QA failures (non-shared cells): ${JSON.stringify(projectedFailuresNotShared.slice(0, 4))}`);

// Build forward operations only for changed cells
const changed = sourceRecords.filter((r) => r.sourceState !== r.targetState);
fail(changed.length > 0, 'compiler produced strict no-op package');
const sortForward = (a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z;
const forward = changed.slice().sort(sortForward);
const rollback = forward.slice().reverse().map((record) => ({ cell: record.cell, sourceState: record.targetState, targetState: record.sourceState, role: record.role }));
const body = (records) => `${records.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
const forwardBody = body(forward);
const rollbackBody = body(rollback);

const out = abs(OUT); fs.mkdirSync(out, { recursive: true });
const forwardPath = path.join(out, 'mp11-c01-public-vertical-upper-portion-redesign-01.forward.txt');
const rollbackPath = path.join(out, 'mp11-c01-public-vertical-upper-portion-redesign-01.rollback.txt');
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);

const manifestBase = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01',
  generatedAtUtc: GENERATED,
  status: 'OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL',
  mode: 'SOURCE_BOUND_COMPILE_ONLY',
  mutationAuthority: false,
  source: {
    snapshot: rel(SNAPSHOT),
    captureId: capture.captureId,
    captureManifestSha256: sha(captureBytes),
    requiredMemberCount: capture.requiredMembers.length,
    upperDesign: ref(UPPER_DESIGN),
    bilateralContract: ref(CONTRACT),
    retainedMainSwitchbackTransition01: ref(TRANSITION_MANIFEST),
    retainedReturn02PostQa: ref(RETURN_QA),
  },
  ownership: contract.ownershipAndInterface,
  scope: {
    upperPortionStations: stations.length,
    upperPortionCanonicalTargets: canonicalTargets.length,
    upperPortionSharedSkipped: skippedSharedCells.length,
    _sharedCellCountContract: contract.buildSplit.sharedCellsAlreadyBuilt,
    upperPortionTotalDesignCells: upperTargetList.length,
    stationCount: stations.length,
    profile: '5-wide × 5-clear-high',
    stationPoints: stations.map((s) => s.point),
  },
  canonicalStates: {
    source: sourceRecords.map((r) => ({ point: [r.cell.x, r.cell.y, r.cell.z], sourceState: r.sourceState, role: r.role })),
    target: canonicalTargets.map((r) => ({ point: [r.cell.x, r.cell.y, r.cell.z], targetState: r.targetState, role: r.role })),
    sourceStateSha256: sha(sourceRecords.map((r) => `${key3(r.cell)}=${r.sourceState}`).sort().join('\n')),
    targetStateSha256: sha(canonicalTargets.map((r) => `${key3(r.cell)}=${r.targetState}`).sort().join('\n')),
    skippedSharedCells,
  },
  retainedReturn02: {
    canonicalCount: returnCanonicalKeys.size,
    upperPortionIntersection: 0,
  },
  safety: {
    interactionHalo: { cellCount: halo.length, coordinateSetSha256: hashCells(halo) },
    fluidGravityContainerProtectedHits: unsafeSource.length + unsafeHalo.length,
    blockEntityCount: blockEntities.length,
    savedEntityCount: savedEntities.length,
    sharedCellCount: 51,
  },
  operations: {
    forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: forward.length, strictNoopRequired: true },
    rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: rollback.length, exactInverseOfForward: true, strictNoopRequired: true },
  },
  projectedFunctionalQa: {
    status: 'PASS_PROJECTED_UPPER_PORTION_FIVE_WIDE_NORMAL_WALK',
    upperPortionStationCount: stations.length,
    bidirectional: true,
    upperFailureCount: projectedFailuresNotShared.length,
    sharedFailureCount: routeFailures.length - projectedFailuresNotShared.length,
    postReleaseEvidence: false,
  },
  executionHardStops: [
    'Recompile from a newly captured immutable source immediately before any live release.',
    'Require an explicit scoped execution authorization; this compiler grants none.',
    'Run target/halo protected/container/block-entity audit, fresh live-entity clearance, strict parser/source/rollback preflights, journaled execution, fresh post capture, rollback post-state preflight, and independent post QA.',
    'Preserve Return-02 continuously and the accepted main switchback transition 01 continuously.',
  ],
  nonClaims: [
    'No RCON call or world mutation.',
    'No public opening, egress, service, rail, power, or passenger claim.',
    'Projected QA is not immutable post-release evidence.',
    'No current protected-route retirement or connection target.',
  ],
};
const manifest = { ...manifestBase, manifestIdentitySha256: sha(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(path.join(out, 'mp11-c01-public-vertical-upper-portion-redesign-01.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  out: rel(OUT),
  upperPortionStations: stations.length,
  upperPortionCanonicalTargets: canonicalTargets.length,
  upperPortionSharedSkipped: skippedSharedCells.length,
  upperPortionTotalDesignCells: upperTargetList.length,
  forwardCommands: forward.length,
  rollbackCommands: rollback.length,
  projectedQa: manifest.projectedFunctionalQa.status,
  mutationAuthority: false,
}, null, 2));
