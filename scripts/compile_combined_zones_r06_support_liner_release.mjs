#!/usr/bin/env node
/**
 * T01 release compiler for CZ-R06 support-and-liner.
 *
 * Two guarded op packages plus one verification section:
 *
 * wet-liner (minecraft:deepslate_tiles): recomputes the three deferred wet
 * classes against the bound post-tunnel save — the R02 aquifer deferral
 * class (R02 rules: fluid sources plus the 1-cell to-air face buffer over
 * the D06 domains), the B07 wet pocket class (R03 rules over the frozen
 * B07 construction domain), and the R05 lava seep (cells of the executed
 * R05 operated class whose current state is lava). Per the owner decision,
 * only STABLE states are lined by guarded ops (fluid level=0, waterlogged
 * states, and air buffer cells); flowing fluids (level!=0) become the
 * hash-accounted expectedDrain class; solid non-fluid buffer cells are
 * accounted alreadySolidBuffer; cells already deepslate_tiles are
 * alreadyTarget. Containers hard abort.
 *
 * b11-support (minecraft:stone_bricks): the frozen B11 LOAD influence rows
 * (dy -1/-2 under the eight-wide deck at all 299 stations, verified against
 * the proposal's road-load-reservation identity). Ops only where the
 * current cell is air; solid cells are accounted alreadySupporting.
 *
 * B09 verification (no ops): the 7,800-cell funicular accommodation
 * envelope is censused in the bound save and the census recorded.
 *
 * Cross-release isolation: R06 op targets must not intersect any prior
 * operated set (R01, R02, R03 v2, R05) — with the single declared
 * exception that wet-liner lava-seep cells are inside the executed R05
 * operated class by definition; that intersection is bound exactly.
 *
 * This compiler performs no live call and authorizes no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  CIVIL_CELL_PREAMBLE,
  SurfaceSnapshotReader,
  assignD06CanonicalLayers,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  columnKey,
  compareCells,
  deriveB07WestTwo,
  deriveB11Profile,
  deriveD06DetailedMechanismLayers,
  deriveD06ReservationConstruction,
  deriveD06ReservationReferences,
  hashCells,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-07T02:20:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-complete-save-20260807T020808Z');
const INTAKE_AUDIT = value('--intake-audit',
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260807T020808Z.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r06-support-liner';
const EXPECTED_COMPLETE_SAVE_SHA256 = '1555e6ee386c270330feb21da8b96b9c97900fd47b98bf910591c2ab174d30b2';
const LINER_STATE = 'minecraft:deepslate_tiles';
const SUPPORT_STATE = 'minecraft:stone_bricks';
const B11_LOAD_PREAMBLE =
  'combined-zones-b11-surface-road-technical-proposal-cells-v1-road-load-reservation';

const INPUTS = Object.freeze({
  decision: 'docs/masterplans/05-combined-zones/phase1-r06-support-and-liner-decision.md',
  r02Decision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  b11Acceptance: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  b11SurfaceRoad: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  r01Manifest: 'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r03Manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  r05Manifest: 'data/buildops/combined-zones-r05-mountain.release-manifest.json',
});

const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GUARD_LISTING_CAP = 50;

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R06 support/liner release compiler rejected: ${message}`);
}

const decisionBytes = fs.readFileSync(path.join(ROOT, INPUTS.decision));
const decisionSha256 = sha256(decisionBytes);
const decisionText = decisionBytes.toString('utf8');
const r02Decision = readJson(INPUTS.r02Decision);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const emptyEight = readJson(INPUTS.emptyEight);
const d06Detailed = readJson(INPUTS.d06Detailed);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const d05 = readJson(INPUTS.d05FutureState);
const d05Owner = readJson(INPUTS.d05OwnerAcceptance);
const b11Acceptance = readJson(INPUTS.b11Acceptance);
const b11Proposal = readJson(INPUTS.b11SurfaceRoad);
const registry = readJson(INPUTS.registry);
const r01Manifest = readJson(INPUTS.r01Manifest);
const r02Manifest = readJson(INPUTS.r02Manifest);
const r03Manifest = readJson(INPUTS.r03Manifest);
const r05Manifest = readJson(INPUTS.r05Manifest);
const intake = readJson(INTAKE_AUDIT);

invariant(decisionText.includes('OWNER_DECISION_RECORDED_R06_SUPPORT_AND_LINER')
  && decisionText.includes(SNAPSHOT.split('/').pop()),
'R06 decision record is not the recorded support/liner decision bound to this save');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED_COMPLETE_SAVE_SHA256,
'fresh complete-save intake audit is not the contracted PASS save');
invariant(fs.existsSync(path.join(ROOT, SNAPSHOT, 'region')),
  'snapshot root has no region directory');

const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));
const surfaceReader = new SurfaceSnapshotReader(path.join(ROOT, SNAPSHOT, 'region'));
const isFluidState = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

// ---- wet source class 1: the R02 aquifer deferral class, recomputed with
// the R02 rules over the frozen D06 domains against the current save.
const g03Reservations = g03.scopeRegistry
  .find(({ scopeId }) => scopeId === 'D06-RESERVATIONS').construction;
const g03Mechanisms = g03.scopeRegistry
  .find(({ scopeId }) => scopeId === 'D06-MECHANISMS').construction;
const reservationDomain = deriveD06ReservationConstruction(deriveD06ReservationReferences({
  mechanismsPayload: d06Mechanisms.mechanismDevelopmentPayload,
  lifeSafetyDoc: d06LifeSafety,
  emptyEightDoc: emptyEight,
  lifeSafetyPath: INPUTS.d06LifeSafety,
  emptyEightPath: INPUTS.emptyEight,
}));
invariant(hashCells(reservationDomain, CIVIL_CELL_PREAMBLE)
  === g03Reservations.sourceCoordinateSetSha256,
'D06-RESERVATIONS domain does not match its G03 identity');
const { layers, proposalUnion: mechanismDomain } = deriveD06DetailedMechanismLayers(
  d06Mechanisms.mechanismDevelopmentPayload, emptyEight, d06Detailed,
);
invariant(hashCells(mechanismDomain) === g03Mechanisms.coordinateSetSha256,
  'D06-MECHANISMS domain does not match its G03 identity');
const layerOwner = assignD06CanonicalLayers(layers, d06Detailed);
const layerStates = r02Decision.decisionPayload.mechanismLayerStates;
const mechanismKeys = new Set(mechanismDomain.map(cellKey));
const d06Records = [
  ...reservationDomain
    .filter((cell) => !mechanismKeys.has(cellKey(cell)))
    .map((cell) => ({ cell, toAir: true })),
  ...mechanismDomain.map((cell) => ({
    cell,
    toAir: layerStates[layerOwner.get(cellKey(cell))].state === 'minecraft:air',
  })),
];
async function d06WetClass(withReader) {
  const cells = [];
  for (const { cell, toAir } of d06Records) {
    const state = await withReader.blockState(cell.x, cell.y, cell.z);
    let wet = isFluidState(state);
    if (!wet && toAir) {
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        if (isFluidState(await withReader.blockState(cell.x + dx, cell.y + dy, cell.z + dz))) {
          wet = true;
          break;
        }
      }
    }
    if (wet) cells.push(cell);
  }
  return cells;
}
// The op scope is the FROZEN R02 deferral class (owner decision): reproduce
// it exactly against the save R02 was bound to. The recomputation against
// the current save is reported as drift data only — the current-save buffer
// legitimately grows into cells R02 already excavated, which must never
// become ops.
const r02Reader = new AnvilReader(path.join(ROOT, r02Manifest.source.snapshotRoot, 'region'));
const r02WetCells = await d06WetClass(r02Reader);
const r02Wet = classManifest(r02WetCells);
const r02WetBinding = r02Manifest.amendment.exclusions.wetZoneDeferral;
invariant(r02Wet.cellCount === r02WetBinding.cellCount
  && r02Wet.coordinateSetSha256 === r02WetBinding.coordinateSetSha256,
'frozen R02 aquifer deferral class does not reproduce against its bound save');
const r02WetNow = classManifest(await d06WetClass(reader));
const r02WetUnchanged = r02WetNow.cellCount === r02WetBinding.cellCount
  && r02WetNow.coordinateSetSha256 === r02WetBinding.coordinateSetSha256;

// ---- wet source class 2: the B07 wet pocket, recomputed with the R03
// rules over the frozen B07 construction domain.
const b07Domain = deriveB07WestTwo(
  d06Mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem,
).construction;
invariant(hashCells(b07Domain)
  === g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B07')
    .construction.coordinateSetSha256,
'B07 domain does not match its G03 identity');
async function b07WetClass(withReader) {
  const cells = [];
  for (const cell of b07Domain) {
    const state = await withReader.blockState(cell.x, cell.y, cell.z);
    let wet = isFluidState(state);
    if (!wet) {
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        if (isFluidState(await withReader.blockState(cell.x + dx, cell.y + dy, cell.z + dz))) {
          wet = true;
          break;
        }
      }
    }
    if (wet) cells.push(cell);
  }
  return cells;
}
const r03Reader = new AnvilReader(path.join(ROOT, r03Manifest.source.snapshotRoot, 'region'));
const b07WetCells = await b07WetClass(r03Reader);
const b07Wet = classManifest(b07WetCells);
const r03B07WetBinding = r03Manifest.partition['b07-shaft'].wetZoneDeferral;
invariant(b07Wet.cellCount === r03B07WetBinding.cellCount
  && b07Wet.coordinateSetSha256 === r03B07WetBinding.coordinateSetSha256,
'frozen B07 wet pocket class does not reproduce against its bound save');
const b07WetNow = classManifest(await b07WetClass(reader));
const b07WetUnchanged = b07WetNow.cellCount === r03B07WetBinding.cellCount
  && b07WetNow.coordinateSetSha256 === r03B07WetBinding.coordinateSetSha256;

// ---- wet source class 3: the R05 lava seep — cells of the executed R05
// operated class whose current state is lava.
const r05Operated = new Map();
for (const pkg of r05Manifest.packages) {
  const raw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(' ');
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    invariant(parts[0] === 'REPL' && x1 === x2 && z1 === z2,
      'unexpected R05 operation shape');
    const key = columnKey(x1, z1);
    if (!r05Operated.has(key)) r05Operated.set(key, []);
    r05Operated.get(key).push({ start: Math.min(y1, y2), end: Math.max(y1, y2) });
  }
}
const columnHasY = (map, x, z, y) => (map.get(columnKey(x, z)) ?? [])
  .some(({ start, end }) => y >= start && y <= end);
const lavaSeepCells = [];
for (const [key, ranges] of r05Operated) {
  const [x, z] = key.split(',').map(Number);
  const { sections } = await surfaceReader.chunk(Math.floor(x / 16), Math.floor(z / 16));
  for (const { start, end } of ranges) {
    for (let sectionY = Math.floor(start / 16); sectionY <= Math.floor(end / 16); sectionY += 1) {
      const palette = sections.get(sectionY)?.block_states?.palette;
      if (!palette?.length || !palette.some(({ Name }) => Name === 'minecraft:lava')) continue;
      const yFrom = Math.max(start, sectionY * 16);
      const yTo = Math.min(end, sectionY * 16 + 15);
      for (let y = yFrom; y <= yTo; y += 1) {
        const state = await surfaceReader.stateAt(x, y, z);
        if (state.Name === 'minecraft:lava') lavaSeepCells.push({ x, y, z });
      }
    }
  }
}
const lavaSeep = classManifest(lavaSeepCells);

// ---- wet-liner package classification under the stable-state rule.
const wetScope = uniqueCells([...r02WetCells, ...b07WetCells, ...lavaSeepCells]);
const lavaSeepKeys = new Set(lavaSeepCells.map(cellKey));
const containerViolations = [];
const linerOps = [];
const expectedDrainCells = [];
const expectedDrainCensus = new Map();
const alreadySolidBufferCells = [];
const alreadySolidBufferCensus = new Map();
const alreadyTargetCells = [];
const linerSourceCensus = new Map();
for (const cell of wetScope) {
  const state = await reader.blockState(cell.x, cell.y, cell.z);
  const fromState = stateToCommandString(state);
  if (FORBIDDEN_SOURCE_BLOCKS.has(state.Name)) {
    containerViolations.push({ cell, sourceState: fromState });
    continue;
  }
  if (fromState === LINER_STATE) {
    alreadyTargetCells.push(cell);
    continue;
  }
  if (FLUID_BLOCKS.has(state.Name)) {
    if ((state.Properties?.level ?? '0') === '0') {
      linerOps.push({ cell, fromState });
    } else {
      expectedDrainCells.push(cell);
      expectedDrainCensus.set(fromState, (expectedDrainCensus.get(fromState) ?? 0) + 1);
    }
    continue;
  }
  if (state.Properties?.waterlogged === 'true' || AIR_BLOCKS.has(state.Name)) {
    linerOps.push({ cell, fromState });
    continue;
  }
  alreadySolidBufferCells.push(cell);
  alreadySolidBufferCensus.set(fromState, (alreadySolidBufferCensus.get(fromState) ?? 0) + 1);
}
for (const { fromState } of linerOps) {
  linerSourceCensus.set(fromState, (linerSourceCensus.get(fromState) ?? 0) + 1);
}
invariant(linerOps.length + expectedDrainCells.length + alreadyTargetCells.length
  + alreadySolidBufferCells.length === wetScope.length,
'wet-liner classes do not partition the wet scope');

// ---- b11-support package.
const profile = deriveB11Profile(b11Acceptance.acceptancePayload.grandAvenue);
const loadCells = uniqueCells(profile.flatMap((point) => {
  const cells = [];
  for (let dz = -3; dz <= 4; dz += 1) {
    for (const dy of [-2, -1]) {
      cells.push({ x: point.x, y: point.y + dy, z: point.z + dz });
    }
  }
  return cells;
}));
const loadBinding = b11Proposal.exactCellSets.roadLoadInfluenceReservation;
invariant(loadCells.length === loadBinding.cellCount
  && hashCells(loadCells, B11_LOAD_PREAMBLE) === loadBinding.coordinateSetSha256,
`derived B11 load reservation does not match the proposal identity `
  + `(${loadCells.length} cells, preamble ${B11_LOAD_PREAMBLE})`);
const supportOps = [];
const alreadySupportingCells = [];
const alreadySupportingCensus = new Map();
const supportAlreadyTargetCells = [];
const supportSourceCensus = new Map();
for (const cell of loadCells) {
  const state = await reader.blockState(cell.x, cell.y, cell.z);
  const fromState = stateToCommandString(state);
  if (FORBIDDEN_SOURCE_BLOCKS.has(state.Name)) {
    containerViolations.push({ cell, sourceState: fromState });
    continue;
  }
  if (fromState === SUPPORT_STATE) {
    supportAlreadyTargetCells.push(cell);
    continue;
  }
  if (AIR_BLOCKS.has(state.Name)) {
    supportOps.push({ cell, fromState });
    supportSourceCensus.set(fromState, (supportSourceCensus.get(fromState) ?? 0) + 1);
    continue;
  }
  alreadySupportingCells.push(cell);
  alreadySupportingCensus.set(fromState, (alreadySupportingCensus.get(fromState) ?? 0) + 1);
}
invariant(supportOps.length + alreadySupportingCells.length
  + supportAlreadyTargetCells.length === loadCells.length,
'b11-support classes do not partition the load reservation');

if (containerViolations.length) {
  console.error(JSON.stringify({
    status: 'ABORTED_FAIL_CLOSED_COMPILE_GUARDS',
    transactionId: BASENAME,
    guards: {
      forbiddenContainerSourceState: {
        violationCellCount: containerViolations.length,
        listedCells: containerViolations.slice(0, GUARD_LISTING_CAP),
      },
    },
    outputsWritten: false,
  }, null, 2));
  process.exit(1);
}

// ---- B09 verification census (no ops).
const b09Envelope = buildB09MinimumReservation(
  d05.selectedPlanningIdentity.formula, d05Owner.b09B10SystemPlan.b09Route,
);
invariant(hashCells(b09Envelope)
  === d05Owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.coordinateSetSha256,
'B09 envelope does not match the accepted accommodation identity');
const b09Census = new Map();
for (const cell of b09Envelope) {
  const state = await reader.blockState(cell.x, cell.y, cell.z);
  const name = stateToCommandString(state);
  b09Census.set(name, (b09Census.get(name) ?? 0) + 1);
}

// ---- Cross-release isolation.
const priorCellSets = [];
for (const [releaseKey, manifest] of [
  ['r01', r01Manifest], ['r02', r02Manifest], ['r03v2', r03Manifest],
]) {
  const targets = new Set();
  for (const pkg of manifest.packages) {
    const raw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(' ');
      targets.add(parts.slice(1, 4).map(Number).join(','));
    }
  }
  priorCellSets.push({ releaseKey, targets });
}
// Overlaps with prior operated sets are permitted only as declared,
// hash-bound classes: (a) air-source liner/support cells inside previously
// excavated voids (forward seals the open face; rollback restores the prior
// release's achieved air state exactly), and (b) the R05 lava-seep class.
// Any other intersection aborts.
const declaredOverlaps = { r01: [], r02: [], r03v2: [] };
let r05IntersectionCount = 0;
for (const { cell, fromState } of [...linerOps, ...supportOps]) {
  for (const { releaseKey, targets } of priorCellSets) {
    if (targets.has(cellKey(cell))) {
      invariant(AIR_BLOCKS.has(fromState.split('[')[0]),
        `R06 op target ${cellKey(cell)} overlaps the ${releaseKey} operated set with non-air source ${fromState}`);
      declaredOverlaps[releaseKey].push(cell);
    }
  }
  if (columnHasY(r05Operated, cell.x, cell.z, cell.y)) {
    invariant(lavaSeepKeys.has(cellKey(cell)),
      `R06 op target ${cellKey(cell)} intersects the R05 operated set outside the declared lava-seep class`);
    r05IntersectionCount += 1;
  }
}

// ---- Emit op files.
fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
const packageArtifacts = [];
const packagesSpec = [
  {
    key: 'wet-liner',
    ops: linerOps.slice().sort((a, b) => compareCells(a.cell, b.cell)),
    targetState: LINER_STATE,
    sourceCensus: linerSourceCensus,
  },
  {
    key: 'b11-support',
    ops: supportOps.slice().sort((a, b) => compareCells(a.cell, b.cell)),
    targetState: SUPPORT_STATE,
    sourceCensus: supportSourceCensus,
  },
];
for (const spec of packagesSpec) {
  const forwardBody = `${spec.ops
    .map(({ cell, fromState }) => replLine(cell, fromState, spec.targetState)).join('\n')}\n`;
  const rollbackBody = `${spec.ops
    .map(({ cell, fromState }) => replLine(cell, spec.targetState, fromState)).join('\n')}\n`;
  const forwardHash = sha256(forwardBody);
  const rollbackHash = sha256(rollbackBody);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${spec.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${spec.key}.rollback.txt`);
  const targetHash = hashCells(spec.ops.map(({ cell }) => cell));
  const header = (role, bodyHash) => [
    `# GENERATED FILE — Combined Zones CZ-R06 support-and-liner (${spec.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# package target coordinate-set SHA-256: ${targetHash}`,
    `# decision record identity: ${decisionSha256}`,
    `# operation SHA-256: ${bodyHash}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, forwardPath), `${header('forward', forwardHash)}${forwardBody}`);
  fs.writeFileSync(path.join(ROOT, rollbackPath), `${header('rollback', rollbackHash)}${rollbackBody}`);
  packageArtifacts.push({
    key: spec.key,
    forwardPath,
    rollbackPath,
    forwardHash,
    rollbackHash,
    targetHash,
    cellCount: spec.ops.length,
    bounds: spec.ops.length ? boundsOf(spec.ops.map(({ cell }) => cell)) : null,
    sourceCensus: Object.fromEntries([...spec.sourceCensus.entries()]
      .sort((a, b) => b[1] - a[1])),
  });
}

const [linerArtifact, supportArtifact] = packageArtifacts;
const sortedCensus = (census) => Object.fromEntries([...census.entries()]
  .sort((a, b) => b[1] - a[1]));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_AWAITING_PRERELEASE_GATES_AND_EXPLICIT_AUTHORIZATION',
  packages: packageArtifacts.map(({ key, forwardPath, rollbackPath }) => ({
    key, forward: forwardPath, rollback: rollbackPath,
  })),
  executionOrder: {
    forward: ['wet-liner', 'b11-support'],
    rollback: ['b11-support', 'wet-liner'],
    note: 'Liner sources before support slab; rollback reverses the order.',
  },
  scope: {
    releaseId: 'CZ-R06-PHASE1-SUPPORT-AND-LINER',
    decisionRecord: {
      path: INPUTS.decision,
      sha256: decisionSha256,
      status: 'OWNER_DECISION_RECORDED_R06_SUPPORT_AND_LINER',
    },
  },
  partition: {
    wetSourceClasses: {
      scopeRule: 'Op scope is the frozen deferral classes reproduced against their own bound saves; the current-save recomputation is drift data only (its buffer grows into cells prior releases already excavated).',
      r02AquiferDeferral: {
        ...r02Wet,
        frozenClassReproduced: true,
        currentSaveRecompute: {
          cellCount: r02WetNow.cellCount,
          coordinateSetSha256: r02WetNow.coordinateSetSha256,
          matchesFrozenBinding: r02WetUnchanged,
        },
      },
      b07WetPocket: {
        ...b07Wet,
        frozenClassReproduced: true,
        currentSaveRecompute: {
          cellCount: b07WetNow.cellCount,
          coordinateSetSha256: b07WetNow.coordinateSetSha256,
          matchesFrozenBinding: b07WetUnchanged,
        },
      },
      r05LavaSeep: lavaSeep,
      wetScopeUnionCellCount: wetScope.length,
      wetScopeUnionCoordinateSetSha256: hashCells(wetScope),
    },
    wetLinerDisposition: {
      linerOps: classManifest(linerOps.map(({ cell }) => cell)),
      expectedDrain: {
        ...classManifest(expectedDrainCells),
        census: sortedCensus(expectedDrainCensus),
      },
      alreadySolidBuffer: {
        ...classManifest(alreadySolidBufferCells),
        census: sortedCensus(alreadySolidBufferCensus),
      },
      alreadyTarget: classManifest(alreadyTargetCells),
      invariant: 'linerOps + expectedDrain + alreadySolidBuffer + alreadyTarget == wet scope union',
    },
    b11SupportDisposition: {
      loadReservation: {
        cellCount: loadCells.length,
        coordinateSetSha256: loadBinding.coordinateSetSha256,
        coordinateHashPreamble: `${B11_LOAD_PREAMBLE}\\n`,
        boundIdentitySource: 'phase1-b11-surface-road-technical-proposal.json exactCellSets.roadLoadInfluenceReservation',
      },
      supportOps: classManifest(supportOps.map(({ cell }) => cell)),
      alreadySupporting: {
        ...classManifest(alreadySupportingCells),
        census: sortedCensus(alreadySupportingCensus),
      },
      alreadyTarget: classManifest(supportAlreadyTargetCells),
      invariant: 'supportOps + alreadySupporting + alreadyTarget == frozen load reservation',
    },
  },
  verification: {
    b09Envelope: {
      cellCount: b09Envelope.length,
      coordinateSetSha256: hashCells(b09Envelope),
      currentStateCensus: sortedCensus(b09Census),
      note: 'Verification only — no operations; commissioning/fit-out stays a later release.',
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceStateCensus: Object.fromEntries(packageArtifacts
      .map(({ key, sourceCensus }) => [key, sourceCensus])),
  },
  target: {
    desiredStateCensus: {
      'wet-liner': { [LINER_STATE]: linerArtifact.cellCount },
      'b11-support': { [SUPPORT_STATE]: supportArtifact.cellCount },
    },
  },
  operations: {
    ...Object.fromEntries(packageArtifacts.map(({
      key, forwardHash, rollbackHash, cellCount,
    }) => [key, {
      forwardSha256: forwardHash,
      rollbackSha256: rollbackHash,
      forwardCommandCount: cellCount,
      rollbackCommandCount: cellCount,
      exactInverse: true,
    }])),
    alreadyTargetStateCellsEmitted: false,
    flowingFluidsEmitted: false,
  },
  crossReleaseIsolation: {
    priorReleases: {
      r01ManifestIdentity: r01Manifest.manifestIdentity,
      r02ManifestIdentity: r02Manifest.manifestIdentity,
      r03V2ManifestIdentity: r03Manifest.manifestIdentity,
      r05ManifestIdentity: r05Manifest.manifestIdentity,
    },
    declaredOverlaps: {
      rule: 'Overlap cells must be air-source liner/support cells inside previously excavated voids (rollback restores the prior release\'s achieved air state exactly) or the declared R05 lava-seep class.',
      r01: classManifest(declaredOverlaps.r01),
      r02: classManifest(declaredOverlaps.r02),
      r03v2: classManifest(declaredOverlaps.r03v2),
    },
    r05IntersectionCellCount: r05IntersectionCount,
    r05IntersectionRule: 'Only the declared lava-seep class may (and by definition does) sit inside the executed R05 operated set.',
  },
  compileGuards: {
    guardBehaviour: {
      forbiddenContainerSourceState: 'HARD_ABORT_UNCHANGED',
      flowingFluidSourceState: 'EXPECTED_DRAIN_CLASS_NO_OPS',
      surfaceExposure: 'NOT_APPLICABLE_ADDING_SOLID',
    },
    forbiddenContainerSourceStateViolationCount: 0,
  },
  upstreamIdentities: {
    decisionRecordSha256: decisionSha256,
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    b11LoadReservationCoordinateSetSha256: loadBinding.coordinateSetSha256,
    b09AccommodationCoordinateSetSha256:
      d05Owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.coordinateSetSha256,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    ownershipRegistryPayloadSha256: registry.canonicalPayloadSha256,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(path.join(ROOT, manifestPath),
  `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  packages: packageArtifacts.map(({
    key, forwardPath, forwardHash, rollbackHash, cellCount,
  }) => ({
    key, forward: forwardPath, forwardSha256: forwardHash, rollbackSha256: rollbackHash, opCount: cellCount,
  })),
  wetSourceClasses: {
    r02AquiferDeferral: {
      frozenCellCount: r02Wet.cellCount,
      currentRecomputeCellCount: r02WetNow.cellCount,
      currentMatchesFrozen: r02WetUnchanged,
    },
    b07WetPocket: {
      frozenCellCount: b07Wet.cellCount,
      currentRecomputeCellCount: b07WetNow.cellCount,
      currentMatchesFrozen: b07WetUnchanged,
    },
    r05LavaSeep: { cellCount: lavaSeep.cellCount, bounds: lavaSeep.bounds },
    wetScopeUnion: wetScope.length,
  },
  wetLinerDisposition: {
    linerOps: linerOps.length,
    expectedDrain: expectedDrainCells.length,
    expectedDrainCensus: sortedCensus(expectedDrainCensus),
    alreadySolidBuffer: alreadySolidBufferCells.length,
    alreadyTarget: alreadyTargetCells.length,
  },
  b11Support: {
    supportOps: supportOps.length,
    alreadySupporting: alreadySupportingCells.length,
    alreadyTarget: supportAlreadyTargetCells.length,
  },
  b09CensusTop: Object.entries(sortedCensus(b09Census)).slice(0, 6),
  r05LavaIntersection: r05IntersectionCount,
}, null, 2));
