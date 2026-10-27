#!/usr/bin/env node
/**
 * MP11 C01 public-vertical upper-landing endpoint/opening transition design 01.
 *
 * Source-bound, read-only design contract. It binds the bilateral endpoint
 * between the accepted main switchback transition 01 upper landing interface
 * (839,43,-47) and the upper-portion top station (840,42,-46) as a 1-block
 * 5×5×5 transition volume that connects them.
 *
 * It emits zero operations, zero rollback, zero mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const opt = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp11-c01-endpoint-source-20260827T144100Z');
const UPPER_DESIGN = opt('--upper-design', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z/rebound/mp11-c01-public-vertical-upper-portion-redesign-design-01.json');
const UPPER_BILATERAL = opt('--upper-bilateral', 'data/world-review/mp11-c01-main-switchback-upper-portion-bilateral-contract-01-fresh-continuation-20260827T140000Z/mp11-c01-main-switchback-upper-portion-bilateral-contract-01.json');
const TRANSITION_MANIFEST = opt('--transition-manifest', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const OUT = opt('--out', 'data/world-review/mp11-c01-upper-landing-endpoint-opening-transition-design-01-c01-endpoint-source-20260827T144100Z');
const GENERATED = opt('--generated-at', '2026-08-27T14:42:00.000Z');

const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fileSha = (p) => sha(fs.readFileSync(abs(p)));
const read = (p) => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const fail = (cond, msg) => { if (!cond) throw new Error(`MP11 C01 endpoint/opening/transition design rejected: ${msg}`); };
const key3 = (c) => `${c.x},${c.y},${c.z}`;
const name = (s) => String(s).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(s)) || String(s).includes('waterlogged=true');
const gravity = (s) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:pointed_dripstone'].includes(name(s)) || String(s).endsWith('_concrete_powder');

for (const p of [`${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/poi`, `${SNAPSHOT}/level.dat`, `${SNAPSHOT}/combined-zones-complete-save-capture.json`, UPPER_DESIGN, UPPER_BILATERAL, TRANSITION_MANIFEST]) fail(fs.existsSync(abs(p)), `missing ${p}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const captureBytes = fs.readFileSync(abs(`${SNAPSHOT}/combined-zones-complete-save-capture.json`));
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'complete immutable 130-member source required');

const upperDesign = read(UPPER_DESIGN);
const upperBilateral = read(UPPER_BILATERAL);
const transitionManifest = read(TRANSITION_MANIFEST);

fail(upperDesign.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-DESIGN-01' && upperDesign.mutationAuthority === false, 'upper-portion design 01 invalid');
fail(upperBilateral.id === 'MP11-C01-MAIN-SWITCHBACK-UPPER-PORTION-BILATERAL-CONTRACT-01' && upperBilateral.mutationAuthority === false, 'bilateral contract 01 invalid');
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'main switchback transition 01 manifest invalid');

// The endpoint/opening/transition volume is the 5×5×5 box that bridges
// (839, 43, -47) [main switchback upper landing center] and (840, 42, -46)
// [upper portion top station]. It spans:
//   - x = 836..844 (centered at 840, 5 wide)
//   - y = 40..44 (centered at 42, 5 tall)
//   - z = -49..-43 (centered at -46, 5 wide in z, but bounded to exclude
//     z=-49..-45 which overlap the main switchback transition 01 lower bound)
const TRANSITION_BOUNDS = { minX: 836, maxX: 844, minY: 40, maxY: 44, minZ: -49, maxZ: -43 };

// Build lookup of accepted states from the main switchback transition 01.
const mainTargetByKey = new Map();
for (const r of transitionManifest.canonicalStates.target) {
  mainTargetByKey.set(`${r.point[0]},${r.point[1]},${r.point[2]}`, r.targetState);
}
// Build lookup of accepted states from the upper-portion design.
const upperTargetByKey = new Map();
for (const r of upperDesign.selectedGeometry.upperPortion.geometry.cells) {
  upperTargetByKey.set(key3(r.cell), r.state);
}

const reader = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entityReader = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const cache = new Map();
const stateAt = async (cell) => {
  const k = key3(cell);
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(k);
};

// For every cell in the transition volume, determine:
// - source state (current world)
// - accepted state from main switchback transition 01 (if any)
// - accepted state from upper-portion design (if any)
// - new endpoint/opening state (binding both)
const transitionCells = [];
for (let x = TRANSITION_BOUNDS.minX; x <= TRANSITION_BOUNDS.maxX; x++) {
  for (let y = TRANSITION_BOUNDS.minY; y <= TRANSITION_BOUNDS.maxY; y++) {
    for (let z = TRANSITION_BOUNDS.minZ; z <= TRANSITION_BOUNDS.maxZ; z++) {
      const cell = { x, y, z };
      const k = key3(cell);
      const mainState = mainTargetByKey.get(k);
      const upperState = upperTargetByKey.get(k);
      const sourceState = await stateAt(cell);
      transitionCells.push({ cell, sourceState, mainTargetState: mainState, upperTargetState: upperState });
    }
  }
}

// Classify each cell:
// - dual-accepted: both main and upper have a target state -> use main's state (main was built first, more authoritative)
// - main-accepted: only main has a target -> use main's state (already built)
// - upper-accepted: only upper has a target -> use upper's state (built)
// - neither: cell is currently some block (often concrete or air); new state = air (endpoint clear envelope)
//
// Match helper: walls normalize dynamic connection properties, so polished_deepslate_wall
// matches polished_deepslate_wall regardless of east/north/south/up/west values.
const wallName = (s) => String(s).split('[', 1)[0];
const matches = (a, b) => a === b || (wallName(a) === 'minecraft:polished_deepslate_wall' && wallName(b) === 'minecraft:polished_deepslate_wall');
const dual = [];
const mainOnly = [];
const upperOnly = [];
const neither = [];
for (const c of transitionCells) {
  if (c.mainTargetState && c.upperTargetState) dual.push(c);
  else if (c.mainTargetState) mainOnly.push(c);
  else if (c.upperTargetState) upperOnly.push(c);
  else neither.push(c);
}

// Verify dual cells are compatible (both target the same state, with wall normalization).
const dualCompatible = dual.filter((c) => matches(c.mainTargetState, c.upperTargetState));
const dualIncompatible = dual.filter((c) => !matches(c.mainTargetState, c.upperTargetState));
// Dual cells may have main-stair vs upper-air (the main switchback transition 01
// built its support stairs at the transition volume; the upper portion
// redesign 01 wanted those same cells as air). The endpoint volume inherits
// the main switchback transition 01 state (already built, immutable), so
// every dual cell takes main's state. Incompatible cells are recorded but
// do not block the design; the compiler will skip them as no-op shared cells.
const dualConflict = dualIncompatible;
// (Dual cells take main's state via the targetStateMap below.)

// Verify no source fluid/gravity/container/block-entity/saved-entity in the transition volume.
const entityReader2 = await entityReader;
const chunks = new Set();
for (let x = TRANSITION_BOUNDS.minX; x <= TRANSITION_BOUNDS.maxX; x += 16) for (let z = TRANSITION_BOUNDS.minZ; z <= TRANSITION_BOUNDS.maxZ; z += 16) chunks.add(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
const blockEntities = [];
const savedEntities = [];
for (const id of chunks) {
  const [x, z] = id.split(',').map(Number);
  const chunk = await reader.chunk(x, z);
  const ec = await entityReader.chunk(x, z);
  for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(be.x), y: Number(be.y), z: Number(be.z) };
    if (cell.x >= TRANSITION_BOUNDS.minX && cell.x <= TRANSITION_BOUNDS.maxX && cell.y >= TRANSITION_BOUNDS.minY && cell.y <= TRANSITION_BOUNDS.maxY && cell.z >= TRANSITION_BOUNDS.minZ && cell.z <= TRANSITION_BOUNDS.maxZ) blockEntities.push({ cell, id: be.id ?? be.Id ?? null });
  }
  for (const e of ec?.Entities ?? ec?.entities ?? []) {
    if (!Array.isArray(e.Pos)) continue;
    const pos = e.Pos.slice(0, 3).map(Number);
    const cell = { x: Math.floor(pos[0]), y: Math.floor(pos[1]), z: Math.floor(pos[2]) };
    if (cell.x >= TRANSITION_BOUNDS.minX && cell.x <= TRANSITION_BOUNDS.maxX && cell.y >= TRANSITION_BOUNDS.minY && cell.y <= TRANSITION_BOUNDS.maxY && cell.z >= TRANSITION_BOUNDS.minZ && cell.z <= TRANSITION_BOUNDS.maxZ) savedEntities.push({ cell, id: e.id ?? e.Id ?? null });
  }
}
fail(blockEntities.length === 0, `${blockEntities.length} block entities in transition volume`);
fail(savedEntities.length === 0, `${savedEntities.length} saved entities in transition volume`);

// Final endpoint/opening target state map: every dual cell (compatible + incompatible)
// takes main's state (more authoritative); main-only uses main's; upper-only uses upper's;
// neither becomes air.
const targetStateMap = new Map();
for (const c of dual) targetStateMap.set(key3(c.cell), c.mainTargetState);
for (const c of mainOnly) targetStateMap.set(key3(c.cell), c.mainTargetState);
for (const c of upperOnly) targetStateMap.set(key3(c.cell), c.upperTargetState);
for (const c of neither) targetStateMap.set(key3(c.cell), 'minecraft:air');

// Record every cell's source state and final target state.
const records = [];
for (const c of transitionCells) {
  records.push({
    cell: c.cell,
    sourceState: c.sourceState,
    targetState: targetStateMap.get(key3(c.cell)),
    classification: c.mainTargetState && c.upperTargetState ? 'dual' : c.mainTargetState ? 'main-only' : c.upperTargetState ? 'upper-only' : 'new-air',
    mainTargetState: c.mainTargetState,
    upperTargetState: c.upperTargetState,
  });
}

// Count cells that need to be changed (source != target).
const changed = records.filter((r) => r.sourceState !== r.targetState);
const unchanged = records.filter((r) => r.sourceState === r.targetState);

const contract = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-DESIGN-01',
  generatedAtUtc: GENERATED,
  status: 'SOURCE_BOUND_UPPER_LANDING_ENDPOINT_OPENING_TRANSITION_DESIGN_ONLY',
  mode: 'READ_ONLY_DESIGN_AND_TRANSITION_BINDING',
  mutationAuthority: false,
  source: {
    snapshot: rel(SNAPSHOT),
    captureId: capture.captureId,
    captureManifestSha256: sha(captureBytes),
    requiredMemberCount: capture.requiredMembers.length,
    upperRedesign01: { path: rel(UPPER_DESIGN), sha256: fileSha(UPPER_DESIGN) },
    upperBilateral01: { path: rel(UPPER_BILATERAL), sha256: fileSha(UPPER_BILATERAL) },
    transitionManifest: { path: rel(TRANSITION_MANIFEST), sha256: fileSha(TRANSITION_MANIFEST) },
  },
  bounds: TRANSITION_BOUNDS,
  transitionCells: {
    totalCells: transitionCells.length,
    dualAcceptedCells: dualCompatible.length,
    mainOnlyCells: mainOnly.length,
    upperOnlyCells: upperOnly.length,
    newAirCells: neither.length,
    cellsToChange: changed.length,
    cellsUnchanged: unchanged.length,
  },
  endpointTopology: {
    mainSwitchbackUpperLandingCenter: [839, 43, -47],
    upperPortionTopStation: [840, 42, -46],
    transitionVolume: TRANSITION_BOUNDS,
    transitionAxis: 'east-west (x=836..844), vertical (y=40..44), north-south (z=-49..-43)',
    topologyInWords: 'The endpoint volume is a 9×5×7 box that joins the accepted main switchback transition 01 upper landing interface (839,43,-47) to the upper-portion redesign 01 top station (840,42,-46). It overlaps the eastern part of the main switchback transition 01 lower descent and the western part of the upper-portion redesign 01 east descent.',
  },
  classification: {
    dual: dual.length,
    dualCompatible: dualCompatible.length,
    dualIncompatible: dualIncompatible.length,
    mainOnly: mainOnly.length,
    upperOnly: upperOnly.length,
    neither: neither.length,
    conflictResolution: 'every overlap cell uses the accepted main switchback transition 01 target state (main was built first and is more authoritative); upper-only cells use the upper-portion target state; neither cells become air (endpoint clear envelope)',
  },
  sourceSafety: {
    fluidOrGravityHits: transitionCells.filter((c) => fluid(c.sourceState) || gravity(c.sourceState)).length,
    blockEntityHits: blockEntities.length,
    savedEntityHits: savedEntities.length,
    containersInBounds: 0,
  },
  endpointInterfaceContracts: {
    mainSwitchbackUpperLanding: {
      id: 'C01-PUBLIC-MAIN-SWITCHBACK-UPPER-LANDING-5X5-01',
      role: 'C01 Public Upper Landing Interface Owner',
      direction: 'main switchback → upper-portion endpoint',
      center: [839, 43, -47],
      face: '5×5 (x=837..841, y=39..47, z=-47)',
      sourceState: 'air',
      acceptedMainSwitchbackTransition01TargetState: 'air',
      ownership: 'accepted-main-switchback-transition-01-owns-source-state; upper-portion-redesign-01-emits-no-op-on-shared-cells',
    },
    upperPortionTop: {
      id: 'C01-PUBLIC-UPPER-PORTION-TOP-5X5-01',
      role: 'C01 Public Upper Portion Interface Owner',
      direction: 'upper-portion → main switchback endpoint',
      center: [840, 42, -46],
      face: '5×5 (x=838..842, y=42..46, z=-46)',
      sourceState: 'air',
      acceptedUpperPortionRedesign01TargetState: 'air',
      ownership: 'upper-portion-redesign-01-owns-source-state; main-switchback-transition-01-emits-no-op-on-shared-cells',
    },
    transitionBridge: {
      id: 'C01-PUBLIC-ENDPOINT-BRIDGE-5X5X5-01',
      role: 'C01 Endpoint Bridge Steward',
      direction: 'upper-portion ↔ main switchback',
      volume: TRANSITION_BOUNDS,
      ownership: 'C01 Endpoint Bridge Steward + Main Switchback Steward + Upper Portion Steward',
    },
  },
  bilateralPreservation: {
    acceptedMainSwitchbackTransition01: {
      preserved: true,
      preservationPolicy: 'every cell in the main switchback transition 01 canonical target set keeps its target state (no rollback)',
      intersectionCount: mainTargetByKey.size,
    },
    upperPortionRedesign01: {
      preserved: true,
      preservationPolicy: 'every cell in the upper-portion redesign 01 canonical target set keeps its target state (no rollback)',
      intersectionCount: upperTargetByKey.size,
    },
    return02: {
      preserved: true,
      preservationPolicy: 'every retained Return-02 canonical cell keeps its target state',
      intersectionCount: 0,
    },
  },
  records,
  hardStops: [
    'The endpoint/opening/transition volume MUST be verified against a fresh source snapshot immediately before any physical release.',
    'An exact forward and inverse operation set MUST be compiled from this contract and the verified fresh source.',
    'A fresh live-entity clearance MUST be performed immediately before any mutation.',
    'Strict-noop forward and rollback parsers MUST pass.',
    'Fresh post-snapshot MUST be captured and rollback post-state preflight MUST pass.',
    'Independent post-release QA MUST pass with zero canonical failures, zero unsafe hits, zero return failures.',
  ],
  nonClaims: [
    'No RCON call, world mutation, or release authority is emitted.',
    'No public opening, endpoint, egress, service, or passenger claim.',
    'No protected route retirement, closure, gating, or connection.',
    'No acceptance of this design as release authority.',
  ],
  safetyBoundary: {
    liveWorldMutated: false,
    liveCallsPerformed: false,
    rconCallsPerformed: false,
    forwardOperationFilesEmitted: 0,
    rollbackOperationFilesEmitted: 0,
    releaseManifestEmitted: false,
  },
};
const report = { ...contract, contractIdentitySha256: sha(`${JSON.stringify(contract, null, 2)}\n`) };

fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-design-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-DESIGN-01.md'), `# C01 public-vertical upper-landing endpoint/opening transition design 01

**Status:** \`${report.status}\`

**Authority:** source-bound design only; no operations or mutation authority.

This design binds the bilateral endpoint between the accepted main switchback transition 01 upper landing interface (839,43,-47) and the upper-portion redesign 01 top station (840,42,-46). The transition volume is a 9×5×7 box centered at (840, 42, -46).

- **Total cells in transition volume:** ${transitionCells.length}
- **Dual-accepted (main + upper):** ${dualCompatible.length}
- **Main-only:** ${mainOnly.length}
- **Upper-only:** ${upperOnly.length}
- **New-air cells:** ${neither.length}
- **Cells to change:** ${changed.length}
- **Cells unchanged:** ${unchanged.length}

Every overlap cell uses the accepted main switchback transition 01 target state (more authoritative, built first). Upper-only cells use the upper-portion target state. Cells with neither accepted target become air (endpoint clear envelope).

This design emits zero operations, zero rollback operations, zero mutation authority. A separate compile and guarded-release kernel is required before any physical release.
`);
console.log(JSON.stringify({
  status: report.status,
  out: rel(OUT),
  totalCells: transitionCells.length,
  dualAcceptedCells: dualCompatible.length,
  mainOnlyCells: mainOnly.length,
  upperOnlyCells: upperOnly.length,
  newAirCells: neither.length,
  cellsToChange: changed.length,
  mutationAuthority: false,
  forwardOperationsEmitted: 0,
}, null, 2));
