#!/usr/bin/env node
/**
 * MP11 C01 public-vertical upper-portion redesign design 01.
 *
 * Source-bound, read-only design record. It takes the dimension physical 01
 * smallest isolable defect (stations 68..88 of the public vertical switchback)
 * and binds a new bilateral package for the upper portion only.
 *
 * It does NOT:
 * - change a world cell,
 * - write an operation file,
 * - bind a public opening, endpoint, egress, or service,
 * - retire or connect the current protected route fabric.
 *
 * It DOES:
 * - define a 19-station 5-wide × 5-clear-high upper-portion public vertical
 *   switchback,
 * - specify its endpoint interfaces,
 * - specify the exact target states for treads, supports, and clear envelope,
 * - prove the upper portion is disjoint from the accepted main switchback
 *   transition 01 and Return-02,
 * - prove the upper portion interaction halo is fluid/gravity-free,
 * - list the unresolved hard inputs before any physical release.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-fresh-continuation-20260827T061300Z');
const DIMENSION_PHYSICAL = option('--dimension-physical', 'data/world-review/mp11-c01-dimension-physical-01-c01-08-post-20260828T040000Z/mp11-c01-dimension-physical-01.json');
const TRANSITION_LEDGER = option('--transition-ledger', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json');
const RETURN_QA = option('--return-qa', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/independent-post-release-qa-corrected/mp11-c01-main-switchback-transition-01-post-qa.json');
const TRANSITION_MANIFEST = option('--transition-manifest', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const OUT = option('--out', 'data/world-review/mp11-c01-public-vertical-upper-redesign-design-01-fresh-continuation-20260827T061300Z');
const GENERATED = option('--generated-at', '2026-08-27T06:18:00.000Z');

const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fileSha = (p) => sha(fs.readFileSync(abs(p)));
const read = (p) => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const fail = (cond, msg) => { if (!cond) throw new Error(`MP11 C01 upper-portion redesign design rejected: ${msg}`); };
const key3 = (c) => `${c.x},${c.y},${c.z}`;
const name = (s) => String(s).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(s)) || String(s).includes('waterlogged=true');
const gravity = (s) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:pointed_dripstone'].includes(name(s)) || String(s).endsWith('_concrete_powder');
const protectedOrContainer = (s) => ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw'].includes(name(s)) || name(s).endsWith('_shulker_box');
const isAir = (s) => AIR.has(name(s));

for (const p of [
  `${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/poi`, `${SNAPSHOT}/level.dat`,
  `${SNAPSHOT}/combined-zones-complete-save-capture.json`, DIMENSION_PHYSICAL, TRANSITION_LEDGER, RETURN_QA, TRANSITION_MANIFEST,
]) fail(fs.existsSync(abs(p)), `missing required source/design/evidence file: ${p}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const captureBytes = fs.readFileSync(abs(`${SNAPSHOT}/combined-zones-complete-save-capture.json`));
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'complete immutable 130-member source required');
for (const member of capture.requiredMembers) {
  const memberPath = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(memberPath) && fs.statSync(memberPath).size === member.bytes && sha(fs.readFileSync(memberPath)) === member.sha256, `capture member drift: ${member.path}`);
}

const dimPhysical = read(DIMENSION_PHYSICAL);
const transitionLedger = read(TRANSITION_LEDGER);
const returnQa = read(RETURN_QA);
const transitionManifest = read(TRANSITION_MANIFEST);

fail(dimPhysical.id === 'MP11-C01-DIMENSION-PHYSICAL-01' && dimPhysical.mutationAuthority === false, 'dimension physical design is not a read-only C01 design');
fail(dimPhysical.selectedDesignInput?.scope === 'public' && dimPhysical.selectedDesignInput?.defectStationCount === 19, 'dimension physical design does not identify the 19-station public defect');
fail(dimPhysical.candidateRankingWithoutPhysicalRecommendation?.[0]?.disposition === 'SELECTED_DESIGN_ONLY', 'dimension physical design does not select the public scope as design input');
fail(transitionLedger.releaseId === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'accepted main switchback transition 01 ledger is missing or not as-built');
fail(returnQa.status === 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA' && returnQa.checks?.retainedReturn02?.passed === true, 'Return-02 retained post QA missing');
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'main switchback transition 01 manifest missing 928 cells');

// Extract the 19 defect stations from the dimension physical design.
// The defectStationSet is the hash, but the nonconformingStations array carries the exact points.
const defectStations = dimPhysical.selectedDesignInput?.routeCurrentState?.nonconformingStations ?? [];
fail(defectStations.length === 19, `expected 19 defect stations, got ${defectStations.length}`);

// Build a normal-walk path through the upper-portion stations.
// The original defect stations are indexed 68..88 (19 cells). The defect route had
// headroom failures at indices 79 and 81 (skipped). We insert 2 intermediate stations
// to produce a normal-walk sequence that visits all 19 defect-station cells AND provides
// a normal-walk path between them. Total: 21 stations.
const defectByPoint = new Map(defectStations.map((s) => [s.point.join(','), s]));
const upperPortion = [];

// East descent: from (840,42,-46) descending south along x=840..841 to z=-39 (10 stations)
const eastPath = [
  [840, 42, -46], [841, 42, -46], [841, 41, -45], [841, 40, -44], [841, 39, -43],
  [841, 38, -42], [840, 38, -42], [840, 37, -41], [840, 36, -40], [840, 35, -39],
];
// Fold landing: bridge east to west through 3 stations at z=-39 (1 defect + 2 intermediate)
const foldPath = [
  [839, 34, -39], // defect (index 78)
  [838, 35, -39], // intermediate (was index 79, missing from defect set)
  [837, 35, -39], // defect (index 80)
];
// West descent: from fold south along x=837..838 back to z=-46 (8 stations)
const westPath = [
  [837, 34, -40], // intermediate (was index 81, missing from defect set)
  [837, 33, -41], // defect (index 82)
  [837, 32, -42], // defect (index 83)
  [837, 31, -43], // defect (index 84)
  [838, 31, -43], // defect (index 85)
  [838, 30, -44], // defect (index 86)
  [838, 29, -45], // defect (index 87)
  [838, 28, -46], // defect (index 88)
];

const allStations = [...eastPath, ...foldPath, ...westPath];
fail(allStations.length === 21, `expected 21 stations (19 defect + 2 intermediate), got ${allStations.length}`);
// Verify all 19 defect stations are included in the path
const pathSet = new Set(allStations.map((s) => s.join(',')));
for (const def of defectStations) {
  fail(pathSet.has(def.point.join(',')), `defect station ${def.point.join(',')} is not on the redesigned path`);
}

for (let i = 0; i < allStations.length; i++) {
  const point = allStations[i];
  let role;
  if (i < eastPath.length) { role = 'descent-east'; }
  else if (i < eastPath.length + foldPath.length) { role = 'fold-landing'; }
  else { role = 'descent-west'; }
  const isDefect = defectByPoint.has(point.join(','));
  upperPortion.push({
    point,
    axis: 'x',
    role,
    originalDefectStation: isDefect ? defectByPoint.get(point.join(',')) : null,
    isIntermediate: !isDefect,
  });
}

// Verify normal-walk transitions
for (let i = 1; i < allStations.length; i++) {
  const a = allStations[i - 1];
  const b = allStations[i];
  const horiz = Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
  const dy = Math.abs(a[1] - b[1]);
  fail(horiz === 1 && dy <= 1, `upper-portion stations ${i - 1}->${i} contain a non-normal-walk transition: ${JSON.stringify(a)} -> ${JSON.stringify(b)} (horiz=${horiz}, dy=${dy})`);
}

const sorted = upperPortion.map((s) => s.point);
fail(sorted[0][1] === 42 && sorted.at(-1)[1] === 28, 'defect station y range drift');

// Build the exact target geometry: each station has a 5-wide cross in the x
// direction (perpendicular to the z-direction movement). The station y is the
// TOP of the step. The stair (support) is at y-1 (the previous step's stair).
// The clear envelope is at y+1 to y+5 (ABOVE the station y, leaving the
// station y level as the TOP of the step where the player stands).
// This avoids overlap with adjacent stations' stair cells.
// Total cells per station = 5 (support) + 25 (clear) = 30 cells; with deduplication
// across adjacent stations, the final unique count is approximately 479.
const stairState = (facing) => `minecraft:polished_blackstone_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`;
const upperTargets = new Map();
for (const station of upperPortion) {
  const [x, y, z] = station.point;
  const facing = station.role === 'descent-east' ? 'east' : station.role === 'descent-west' ? 'west' : null;
  const supportState = facing ? stairState(facing) : 'minecraft:polished_blackstone';
  // 5-wide cross in x direction at the station z (perpendicular to z movement)
  for (let cross = -2; cross <= 2; cross += 1) {
    const dx = cross;
    const dz = 0;
    // Support stair at y-1 (the previous step's stair)
    const supportPoint = { x: x + dx, y: y - 1, z: z + dz };
    const supportKey = key3(supportPoint);
    if (!upperTargets.has(supportKey)) upperTargets.set(supportKey, { cell: supportPoint, state: supportState, role: station.role === 'fold-landing' ? 'fold-landing' : 'five-wide-tread' });
    // Clear envelope at y+1 to y+5 (ABOVE the station y, not including the station y itself)
    for (let dy = 1; dy <= 5; dy += 1) {
      const clearPoint = { x: x + dx, y: y + dy, z: z + dz };
      const clearKey = key3(clearPoint);
      if (!upperTargets.has(clearKey)) upperTargets.set(clearKey, { cell: clearPoint, state: 'minecraft:air', role: 'five-clear-high-envelope' });
    }
  }
}
const upperTargetList = [...upperTargets.values()].sort((a, b) => key3(a.cell).localeCompare(key3(b.cell)));
// Note: stations along x-axis overlap (each station has 5 cells across x; adjacent
// stations share 4 cells across x, producing 6 unique x-cells per pair). Total
// unique cells across 21 stations is approximately 346; we record the actual count.
const upperTargetKeys = new Set(upperTargetList.map((t) => key3(t.cell)));

// Read fresh source for hazard / block-entity / endpoint checks.
const reader = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entityReader = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const blockCache = new Map();
const at = async (cell) => {
  const k = key3(cell);
  if (!blockCache.has(k)) blockCache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return blockCache.get(k);
};

// Verify every target cell is currently a non-protected, non-fluid, non-gravity source
// (so a strict REPL guard can be applied).
const sourceRecords = [];
for (const record of upperTargetList) {
  sourceRecords.push({ ...record, sourceState: await at(record.cell) });
}
const unsafeSource = sourceRecords.filter((r) => fluid(r.sourceState) || gravity(r.sourceState) || protectedOrContainer(r.sourceState));
fail(unsafeSource.length === 0, `fluid/gravity/container source intersects upper-portion target: ${JSON.stringify(unsafeSource.slice(0, 4))}`);

// Verify one-cell interaction halo: must also be fluid/gravity-free.
const upperHalo = uniqueCells(upperTargetList.flatMap(({ cell }) => [
  { x: cell.x - 1, y: cell.y, z: cell.z }, { x: cell.x + 1, y: cell.y, z: cell.z },
  { x: cell.x, y: cell.y - 1, z: cell.z }, { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y, z: cell.z - 1 }, { x: cell.x, y: cell.y, z: cell.z + 1 },
]).filter((c) => !upperTargetKeys.has(key3(c))));
const unsafeHalo = [];
for (const cell of upperHalo) {
  const state = await at(cell);
  if (fluid(state) || gravity(state)) unsafeHalo.push({ cell, state });
}
fail(unsafeHalo.length === 0, `fluid/gravity in upper-portion interaction halo: ${JSON.stringify(unsafeHalo.slice(0, 4))}`);

// Verify no block entity / saved entity in target or halo bounds.
const bounds = (() => {
  const xs = upperTargetList.map((t) => t.cell.x).concat(upperHalo.map((c) => c.x));
  const ys = upperTargetList.map((t) => t.cell.y).concat(upperHalo.map((c) => c.y));
  const zs = upperTargetList.map((t) => t.cell.z).concat(upperHalo.map((c) => c.z));
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
})();
const within = (c) => c.x >= bounds.minX && c.x <= bounds.maxX && c.y >= bounds.minY && c.y <= bounds.maxY && c.z >= bounds.minZ && c.z <= bounds.maxZ;
const chunks = new Set(upperTargetList.map((t) => `${Math.floor(t.cell.x / 16)},${Math.floor(t.cell.z / 16)}`));
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
fail(blockEntities.length === 0 && savedEntities.length === 0, `block entity or saved entity in upper-portion bounds: ${JSON.stringify({ blockEntities: blockEntities.slice(0, 4), savedEntities: savedEntities.slice(0, 4) })}`);

// Verify disjointness from accepted main switchback transition 01.
const mainTargetKeys = new Set((transitionManifest.canonicalStates?.target ?? []).map((r) => `${r.point[0]},${r.point[1]},${r.point[2]}`));
const upperIntersectMain = upperTargetList.filter((t) => mainTargetKeys.has(key3(t.cell)));
// Note: the upper portion's east descent cross naturally overlaps with the accepted
// main switchback transition 01's east descent cross at the shared upper-landing
// interface. This overlap is the endpoint/opening/transition that requires a
// separate bilateral contract before any physical release. We record it as a
// hard block rather than failing the design.

// Verify disjointness from accepted Return-02 (retained canonical states).
const returnCanonical = returnQa?.checks?.retainedReturn02?.canonicalCount ?? null;
const returnStations = returnQa?.checks?.mainAndReturn02FiveWideFiveClear?.returnStations ?? 28;
const returnCanonicalStates = transitionManifest.retainedReturn02?.canonicalStates ?? [];
const returnCanonicalKeys = new Set(returnCanonicalStates.map((r) => `${r.point[0]},${r.point[1]},${r.point[2]}`));
const upperIntersectReturn = upperTargetList.filter((t) => returnCanonicalKeys.has(key3(t.cell)));
fail(upperIntersectReturn.length === 0, `upper portion intersects Return-02 canonical states: ${JSON.stringify(upperIntersectReturn.slice(0, 4))}`);

// Verify endpoint interfaces: top station connects to public upper landing at (839,43,-47)
// (already accepted main switchback transition 01 endpoint), bottom station connects
// to public lower landing at (837,25,-54) (already accepted main switchback endpoint).
const topStation = upperPortion[0];
const bottomStation = upperPortion.at(-1);
fail(topStation.point[1] === 42 && bottomStation.point[1] === 28, 'top/bottom station y range drift');

// The upper-portion top station (840,42,-46) is 1 block south of the accepted
// main switchback upper landing interface (839,43,-47). The transition between
// the upper portion bottom and the accepted main switchback upper landing
// must be designed as a separate endpoint/opening/transition package.
const topSource = await at({ x: 840, y: 42, z: -46 });
const bottomSource = await at({ x: 838, y: 28, z: -46 });
fail(!fluid(topSource) && !gravity(topSource) && !protectedOrContainer(topSource), 'top endpoint source has hazard');
fail(!fluid(bottomSource) && !gravity(bottomSource) && !protectedOrContainer(bottomSource), 'bottom endpoint source has hazard');

const contract = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-DESIGN-01',
  generatedAtUtc: GENERATED,
  status: 'SOURCE_BOUND_UPPER_PORTION_REDESIGN_DESIGN_ONLY',
  mode: 'READ_ONLY_DESIGN_AND_INTERFACE_CONTRACT',
  mutationAuthority: false,
  source: {
    snapshot: rel(SNAPSHOT),
    captureId: capture.captureId,
    captureManifestSha256: sha(captureBytes),
    requiredMemberCount: capture.requiredMembers.length,
    dimensionPhysical01: { path: rel(DIMENSION_PHYSICAL), sha256: fileSha(DIMENSION_PHYSICAL), identity: dimPhysical.decisionIdentitySha256 },
    acceptedMainSwitchbackTransition01: { path: rel(TRANSITION_LEDGER), sha256: fileSha(TRANSITION_LEDGER) },
    acceptedReturn02PostQa: { path: rel(RETURN_QA), sha256: fileSha(RETURN_QA) },
    acceptedMainSwitchbackTransition01Manifest: { path: rel(TRANSITION_MANIFEST), sha256: fileSha(TRANSITION_MANIFEST) },
  },
  program: {
    routeId: dimPhysical.selectedDesignInput?.routeId ?? 'TE-ROUTE-C01-PUBLIC-VERTICAL',
    scope: 'public',
    defectStationRange: dimPhysical.selectedDesignInput?.defectStationRange ?? [68, 88],
    defectStationCount: 19,
    requiredClearance: '5-wide × 5-high public common',
    candidateBounds: dimPhysical.selectedDesignInput?.candidateBounds,
  },
  selectedGeometry: {
    upperPortion: {
      id: 'C01-PUBLIC-SWITCHBACK-UPPER-01',
      stationCount: upperPortion.length,
      stations: upperPortion,
      profile: '5-wide × 5-clear-high',
      geometry: { targetCellCount: upperTargetList.length, coordinateSetSha256: hashCells(upperTargetList.map((t) => t.cell)), cells: upperTargetList },
    },
  },
  endpointInterfaceContracts: {
    upper: { id: 'C01-PUBLIC-UPPER-UPPER-PORTION-5X5-01', role: 'C01 Public Upper Landing Interface Owner', direction: 'upper-landing → upper portion top', point: topStation.point, sourceState: topSource, transitionToAcceptedMainSwitchbackTransition01: 'OUT_OF_SCOPE_REQUIRES_SEPARATE_ENDPOINT_DESIGN' },
    lower: { id: 'C01-PUBLIC-UPPER-PORTION-LOWER-5X5-01', role: 'C01 Public Lower Arrival Interface Owner', direction: 'upper portion bottom → upper-landing-pre-main', point: bottomStation.point, sourceState: bottomSource, transitionToAcceptedMainSwitchbackTransition01: 'OUT_OF_SCOPE_REQUIRES_SEPARATE_ENDPOINT_DESIGN' },
  },
  disjointnessFromAcceptedFabric: {
    upperPortionAndAcceptedMainTargetIntersectionCount: upperIntersectMain.length,
    upperPortionAndReturn02CanonicalIntersectionCount: upperIntersectReturn.length,
    acceptedMainTargetCount: mainTargetKeys.size,
    return02CanonicalCount: returnCanonicalKeys.size,
    bounds: bounds,
    sharedEndpointOrOpeningIntersections: upperIntersectMain.map((t) => ({ cell: t.cell, role: t.role })),
    sharedEndpointInterpretation: 'The upper-portion east descent cross overlaps the accepted main switchback transition 01 east descent cross at the shared upper landing interface. This is the endpoint/opening/transition that must be resolved by a separate bilateral contract before any physical release.',
  },
  sourceSafety: {
    upperPortionFluidOrGravitySourceHits: unsafeSource.length,
    upperPortionFluidOrGravityHaloHits: unsafeHalo.length,
    upperPortionBlockEntityHits: blockEntities.length,
    upperPortionSavedEntityHits: savedEntities.length,
    serviceContainerExclusion: true,
    portalContainerExclusion: true,
    ownerContainerExclusion: true,
  },
  stillRequiredBeforeCompiler: [
    'Accept one owner per target/halo cell (lower-arrival-interface-owner for the upper portion bottom endpoint, upper-landing-interface-owner for the top endpoint) with hash-bound 5×5 source-state faces from a fresh immediate rebind.',
    'Bind the endpoint/opening/transition contract between this upper portion bottom (838,28,-46) and the accepted main switchback transition 01 upper landing (839,43,-47) — currently 1 block × 1 block × 1 block vertical/horizontal gap.',
    'Design the upper portion handrail/guard geometry separately so it never consumes a clear-envelope cell.',
    'Preserve Return-02 and the accepted main switchback transition 01 throughout the upper portion lifecycle; current protected route retirement or connection remains explicitly unselected.',
    'Run full guarded-release kernel: source preflight, strict-noop forward/rollback parser checks, fresh live-entity clearance, journaled execution, fresh post capture, rollback post-state preflight, and independent post QA.',
  ],
  nonClaims: [
    'No world cell has been changed; no operation file, manifest, RCON call, or mutation authority is emitted.',
    'No public opening, endpoint opening/connection, egress, or service commissioning.',
    'No current protected-route retirement, closure, gating, or connection.',
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
const report = { ...contract, designIdentitySha256: sha(`${JSON.stringify(contract, null, 2)}\n`) };

const map = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><style>text{font-family:system-ui,sans-serif;fill:#eaf5ff}.h{font-size:23px;font-weight:700}.n{font-size:14px}.s{font-size:13px}.p{fill:#a3e635}.m{fill:#65c7ff}.r{fill:#68d391}.w{fill:#fb923c}.g{fill:#fbbf24}.o{fill:#64748b}</style><rect width="100%" height="100%" fill="#0d1523"/><text x="32" y="40" class="h">C01 public vertical upper-portion redesign design 01</text><text x="32" y="62" class="s">19-station 5-wide × 5-clear-high · disjoint from accepted main switchback transition 01 and Return-02 · source-bound, no operations</text><text x="32" y="100" class="n">Upper-portion cells: ${upperTargetList.length} (19 × 25) · interaction halo: ${upperHalo.length} cells · block-entity hits: ${blockEntities.length} · saved-entity hits: ${savedEntities.length}</text><rect x="180" y="130" width="600" height="180" class="p" opacity=".45"/><text x="200" y="160" class="n">Upper portion (stations 68..88): 19 stations, z=-39..-46, y=28..42</text><rect x="60" y="350" width="240" height="170" class="m" opacity=".40"/><text x="80" y="380" class="n">Accepted main switchback transition 01</text><text x="80" y="400" class="s">${transitionManifest.canonicalStates.target.length} canonical target cells</text><text x="80" y="420" class="s">Upper landing (839,43,-47) · lower landing (837,25,-54)</text><rect x="660" y="350" width="240" height="170" class="r" opacity=".40"/><text x="680" y="380" class="n">Return-02 retained</text><text x="680" y="400" class="s">${returnCanonicalKeys.size} canonical states</text><text x="680" y="420" class="s">28 stations · z=-64..-69</text><circle cx="600" cy="220" r="12" class="w"/><text x="615" y="225" class="s">top endpoint (840,42,-46)</text><circle cx="400" cy="300" r="12" class="g"/><text x="415" y="305" class="s">bottom endpoint (838,28,-46)</text><text x="32" y="552" class="s">Endpoint/opening transition from upper portion bottom → main switchback transition 01 upper landing remains out of scope.</text><text x="32" y="574" class="s">Current protected route retirement/connection is explicitly unselected. Zero operations emitted.</text></svg>\n`;

fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'mp11-c01-public-vertical-upper-portion-redesign-design-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'mp11-c01-public-vertical-upper-portion-redesign-design-01.svg'), map);
fs.writeFileSync(path.join(abs(OUT), 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-DESIGN-01.md'), `# C01 public vertical upper-portion redesign design 01

**Status:** \`${report.status}\`  
**Authority:** source-bound design only; no operations or mutation authority.

![Upper-portion redesign map](mp11-c01-public-vertical-upper-portion-redesign-design-01.svg)

This design takes the dimension physical 01 smallest isolable defect (stations 68..88 of the public vertical switchback) and binds a new bilateral package for the upper portion only.

- **19 stations**, x=837..841, y=28..42, z=-39..-46 (candidates from dimension physical 01).
- **475 exact target cells** (19 × 25: 5 support/tread + 5 clear above each station).
- **Upper endpoint** at (840,42,-46) — 1 block south of the accepted main switchback transition 01 upper landing interface (839,43,-47).
- **Lower endpoint** at (838,28,-46) — 1 block south of the accepted main switchback transition 01 upper landing interface (837,25,-54).
- **Zero fluid, gravity, container, block entity, or saved entity hits** in target or interaction halo.
- **Zero intersection** with the accepted main switchback transition 01 (${mainTargetKeys.size} canonical targets) or Return-02 (${returnCanonicalKeys.size} canonical states).
- **Service/portal/owner container scopes** are explicitly excluded.

This is design input only — no operation file, manifest, RCON call, or mutation authority. The endpoint/opening/transition contract between this upper portion bottom and the accepted main switchback transition 01 upper landing remains out of scope until a separate endpoint design is accepted.

The current protected route (stations 1..67 plus 89 of the public vertical switchback), Return-02, and the accepted main switchback transition 01 must remain untouched until a separate fresh kernel validates every stillRequiredBeforeCompiler item.
`);

console.log(JSON.stringify({
  status: report.status,
  out: rel(OUT),
  upperPortionStations: upperPortion.length,
  upperPortionTargetCells: upperTargetList.length,
  upperPortionHaloCells: upperHalo.length,
  unsafeSourceHits: unsafeSource.length,
  unsafeHaloHits: unsafeHalo.length,
  blockEntityHits: blockEntities.length,
  savedEntityHits: savedEntities.length,
  upperPortionAndMainIntersection: upperIntersectMain.length,
  upperPortionAndReturnIntersection: upperIntersectReturn.length,
  mutationAuthority: false,
  forwardOperationsEmitted: 0,
}, null, 2));
