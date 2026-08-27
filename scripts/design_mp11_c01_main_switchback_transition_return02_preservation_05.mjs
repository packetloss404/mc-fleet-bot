#!/usr/bin/env node
/**
 * Source-bound, design-only C01 main-switchback transition contract.
 * It selects transition semantics and exact interface/guard geometry but never
 * emits operations, a release manifest, RCON calls, or mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i < 0 ? fallback : (args[i + 1] ?? fallback); };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z');
const DESIGN = opt('--return-design', 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z/rebound/public-return-design/mp11-c01-public-vertical-switchback-return-02.json');
const RETURN_MANIFEST = opt('--return-manifest', 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z/rebound/compile/mp11-c01-public-independent-return-02.manifest.json');
const RETURN_QA = opt('--return-qa', 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z/independent-post-release-qa-corrected/mp11-c01-public-independent-return-02-post-qa.json');
const OUT = opt('--out', 'data/world-review/mp11-c01-main-switchback-transition-return02-preservation-05-arrival-support-post-20260827T043000Z');
const GENERATED = opt('--generated-at', '2026-08-27T05:35:00.000Z');
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const readBytes = (p) => fs.readFileSync(abs(p));
const read = (p) => JSON.parse(readBytes(p));
const fileRef = (p) => ({ path: rel(p), sha256: sha(readBytes(p)) });
const fail = (ok, message) => { if (!ok) throw new Error(`C01 main-switchback transition contract rejected: ${message}`); };
const base = (s) => s.split('[', 1)[0];
const wet = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(base(s)) || s.includes('waterlogged=true');
const gravity = (s) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:pointed_dripstone'].includes(base(s));
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
const point = (entry) => ({ x: entry.point[0], y: entry.point[1], z: entry.point[2] });
const geometry = (cells) => ({ cellCount: uniqueCells(cells).length, coordinateSetSha256: hashCells(uniqueCells(cells)) });

for (const p of [
  `${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/poi`, `${SNAPSHOT}/level.dat`,
  `${SNAPSHOT}/combined-zones-complete-save-capture.json`, DESIGN, RETURN_MANIFEST, RETURN_QA,
]) fail(fs.existsSync(abs(p)), `required source/design input absent: ${p}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const captureBytes = readBytes(`${SNAPSHOT}/combined-zones-complete-save-capture.json`);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'complete 130-member immutable capture required');
for (const member of capture.requiredMembers) {
  const memberPath = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(memberPath) && fs.statSync(memberPath).size === member.bytes && sha(fs.readFileSync(memberPath)) === member.sha256, `capture member drift: ${member.path}`);
}

const design = read(DESIGN), returnManifest = read(RETURN_MANIFEST), returnQa = read(RETURN_QA);
fail(design.id === 'MP11-C01-PUBLIC-VERTICAL-SWITCHBACK-RETURN-DESIGN-02' && design.mutationAuthority === false, 'expected public vertical design only');
fail(returnManifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && returnManifest.mutationAuthority === false, 'expected independent-return manifest');
fail(returnQa.status === 'PASS_C01_RETURN02_IMMUTABLE_POST_QA' && returnQa.checks?.lowerToUpperNormalWalk === true && returnQa.checks?.upperToLowerNormalWalk === true, 'accepted corrected Return-02 QA required');
const main = design.candidateGeometry?.mainSwitchback;
fail(main?.id === 'C01-PUBLIC-SWITCHBACK-MAIN-02' && main.stations?.length === 30, 'exact 30-station main candidate required');
const targetRecords = main.candidateTargetGeometry?.cells ?? [];
fail(targetRecords.length === 828, 'exact 828-cell main target design required');
const targetCells = targetRecords.map(point);
const targetKeys = new Set(targetCells.map(cellKey));
const returnRecords = returnManifest.target?.allCanonicalPostStates ?? [];
fail(returnRecords.length > 0, 'canonical Return-02 post-state inventory required');
const returnCells = returnRecords.map(point);
const returnKeys = new Set(returnCells.map(cellKey));
const mainReturnOverlap = targetCells.filter((c) => returnKeys.has(cellKey(c)));
fail(mainReturnOverlap.length === 0, 'main design may not overlap canonical Return-02 cells');

const stations = main.stations.map((station) => ({ point: { x: station.point[0], y: station.point[1], z: station.point[2] }, axis: station.axis, role: station.role }));
const endcap = (station, direction) => {
  const cross = [-2, -1, 0, 1, 2];
  const tread = cross.map((offset) => ({
    x: station.axis === 'x' ? station.point.x : station.point.x + offset,
    y: station.point.y - 1,
    z: station.axis === 'x' ? station.point.z + offset : station.point.z,
  }));
  const expected = targetRecords.filter((record) => record.role === 'five-wide-tread' && tread.some((c) => same(c, point(record))));
  fail(expected.length === 5, `${direction} endcap must bind five exact tread cells`);
  return {
    id: `C01-MAIN-${direction.toUpperCase()}-ENDCAP-05`, station: station.point, direction,
    treadDesign: expected.map((record) => ({ point: record.point, targetState: record.state, role: record.role })),
    treadGeometry: geometry(tread),
  };
};
const upperEndcap = endcap(stations[0], 'upper');
const lowerEndcap = endcap(stations.at(-1), 'lower');
const clearKeys = new Set();
for (const station of stations) for (let cross = -2; cross <= 2; cross++) for (let dy = 0; dy < 5; dy++) {
  clearKeys.add(cellKey({ x: station.axis === 'x' ? station.point.x : station.point.x + cross, y: station.point.y + dy, z: station.axis === 'x' ? station.point.z + cross : station.point.z }));
}
const guardByKey = new Map();
for (const station of stations) for (const side of [-3, 3]) for (let dy = 0; dy <= 1; dy++) {
  const c = {
    x: station.axis === 'x' ? station.point.x : station.point.x + side,
    y: station.point.y + dy,
    z: station.axis === 'x' ? station.point.z + side : station.point.z,
  };
  if (!clearKeys.has(cellKey(c))) guardByKey.set(cellKey(c), c);
}
// At the tight east fold, two nominal lateral guard cells land on the last
// descending treads. Move only those two bottom cells one block farther
// outboard, retaining the two-high protection count without overwriting a
// canonical tread or narrowing the five-wide clear envelope.
const nominalGuardTreadCollisions = [...guardByKey.values()].filter((c) => targetKeys.has(cellKey(c)));
fail(nominalGuardTreadCollisions.length === 2 && nominalGuardTreadCollisions.every((c) => c.x === 846 && c.y === 35 && (c.z === -48 || c.z === -49)), 'unexpected nominal guard/tread collision set');
const outboardFoldGuardReplacements = nominalGuardTreadCollisions.map((c) => ({ ...c, x: c.x - 1 }));
for (const c of outboardFoldGuardReplacements) fail(!targetKeys.has(cellKey(c)) && !clearKeys.has(cellKey(c)) && !returnKeys.has(cellKey(c)) && !guardByKey.has(cellKey(c)), `fold guard replacement is not a disjoint exterior cell: ${cellKey(c)}`);
for (const c of nominalGuardTreadCollisions) guardByKey.delete(cellKey(c));
for (const c of outboardFoldGuardReplacements) guardByKey.set(cellKey(c), c);
const guards = [...guardByKey.values()];
fail(guards.length === 100, 'exact 100-cell two-high handrail/guard set required');
fail(guards.every((c) => !targetKeys.has(cellKey(c)) && !clearKeys.has(cellKey(c)) && !returnKeys.has(cellKey(c))), 'final guard set must stay outside main target, clear envelope, and Return-02');
const endcapGuard = (station) => guards.filter((c) => c.x === station.point.x && c.y >= station.point.y && c.y <= station.point.y + 1 && Math.abs(c.z - station.point.z) === 3);
const upperGuardEndcap = endcapGuard(stations[0]), lowerGuardEndcap = endcapGuard(stations.at(-1));
fail(upperGuardEndcap.length === 4 && lowerGuardEndcap.length === 4, 'exact four-cell guard endcaps required');

const endpoints = design.endpointInterfaceContracts ?? {};
const upperLanding = endpoints.mainUpper, lowerLanding = endpoints.mainLower;
for (const [label, landing, expectedPoint] of [['upper', upperLanding, stations[0].point], ['lower', lowerLanding, stations.at(-1).point]]) {
  fail(landing?.clearFace?.width === 5 && landing.clearFace.height === 5 && landing.clearFace.cells?.length === 25 && landing.supportRow?.cells?.length === 5, `${label} landing must retain exact 5x5 face plus five-cell support row`);
  fail(landing.point?.every((v, i) => v === [expectedPoint.x, expectedPoint.y, expectedPoint.z][i]), `${label} landing anchor drift`);
}

const reader = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entityReader = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const cache = new Map();
const at = async (c) => { const k = cellKey(c); if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(c.x, c.y, c.z))); return cache.get(k); };
const verifyExpected = async (landing) => {
  const expected = [...landing.clearFace.cells, ...landing.supportRow.cells].map((entry) => ({ cell: point(entry), expected: entry.state }));
  const mismatches = [];
  for (const item of expected) { const actual = await at(item.cell); if (actual !== item.expected) mismatches.push({ ...item.cell, expected: item.expected, actual }); }
  return { cellCount: expected.length, sourceStateSha256: sha(JSON.stringify(expected)), mismatchCount: mismatches.length, mismatches };
};
const landingRebind = { upper: await verifyExpected(upperLanding), lower: await verifyExpected(lowerLanding) };
fail(landingRebind.upper.mismatchCount === 0 && landingRebind.lower.mismatchCount === 0, 'fresh source landing state drift');
const returnMismatches = [];
for (const record of returnRecords) { const c = point(record); const actual = await at(c); if (actual !== record.targetState) returnMismatches.push({ ...c, expected: record.targetState, actual }); }
fail(returnMismatches.length === 0, 'fresh source no longer preserves canonical Return-02 states');

const designCells = uniqueCells([...targetCells, ...guards]);
const hazardCells = [];
for (const c of designCells) { const state = await at(c); if (wet(state) || gravity(state)) hazardCells.push({ ...c, state }); }
const bounds = { minX: Math.min(...designCells.map((c) => c.x)), maxX: Math.max(...designCells.map((c) => c.x)), minY: Math.min(...designCells.map((c) => c.y)), maxY: Math.max(...designCells.map((c) => c.y)), minZ: Math.min(...designCells.map((c) => c.z)), maxZ: Math.max(...designCells.map((c) => c.z)) };
const inside = (c) => c.x >= bounds.minX && c.x <= bounds.maxX && c.y >= bounds.minY && c.y <= bounds.maxY && c.z >= bounds.minZ && c.z <= bounds.maxZ;
const chunks = new Set(designCells.map((c) => `${Math.floor(c.x / 16)},${Math.floor(c.z / 16)}`));
const blockEntities = [], savedEntities = [];
for (const id of chunks) {
  const [x, z] = id.split(',').map(Number); const chunk = await reader.chunk(x, z), entities = await entityReader.chunk(x, z);
  for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const c = { x: Number(be.x), y: Number(be.y), z: Number(be.z) }; if (inside(c)) blockEntities.push({ cell: c, id: be.id ?? be.Id ?? null }); }
  for (const entity of entities?.Entities ?? entities?.entities ?? []) { const p = entity.Pos?.slice?.(0, 3).map(Number); if (p?.length === 3) { const c = { x: Math.floor(p[0]), y: Math.floor(p[1]), z: Math.floor(p[2]) }; if (inside(c)) savedEntities.push({ cell: c, id: entity.id ?? entity.Id ?? null }); } }
}
fail(hazardCells.length === 0 && blockEntities.length === 0 && savedEntities.length === 0, 'fresh design geometry has a hazard, block entity, or saved entity');

const retainedReturn = {
  releaseId: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02',
  canonicalPostStateGeometry: geometry(returnCells),
  verifiedAgainstFreshSource: true,
  currentCanonicalStateMismatchCount: 0,
  mainTargetIntersectionCount: 0,
  requiredBeforeAndAfterEveryFutureMainMutation: ['all canonical Return-02 states exact', 'lower-to-upper normal-walk PASS', 'upper-to-lower normal-walk PASS', 'no main target/halo intersection with Return-02 protected volume'],
};
const contractBase = {
  schemaVersion: 1,
  id: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-RETURN02-PRESERVATION-05',
  generatedAtUtc: GENERATED,
  status: 'SOURCE_BOUND_TRANSITION_SEMANTICS_SELECTED__NO_COMPILER_OR_RELEASE_AUTHORITY',
  mode: 'READ_ONLY_DESIGN_CONTRACT',
  mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), requiredMemberCount: capture.requiredMembers.length, design: fileRef(DESIGN), returnManifest: fileRef(RETURN_MANIFEST), returnQa: fileRef(RETURN_QA) },
  ownership: { main: 'C01 Public Vertical Main Switchback Steward', upperLanding: upperLanding.role, lowerLanding: lowerLanding.role, retainedReturn: 'C01 Independent Return-02 Steward' },
  selectedGeometry: {
    mainLane: { stationCount: stations.length, profile: '5-wide × 5-clear-high', targetDesignGeometry: geometry(targetCells), stationOrder: stations },
    upperLanding: { contractId: upperLanding.id, anchor: upperLanding.point, preserveAsAcceptedInterface: true, freshSourceRebind: landingRebind.upper },
    lowerLanding: { contractId: lowerLanding.id, anchor: lowerLanding.point, preserveAsAcceptedInterface: true, freshSourceRebind: landingRebind.lower },
    upperEndcap, lowerEndcap,
    handrailAndGuard: { canonicalState: 'minecraft:polished_deepslate_wall', geometry: 'two-high lateral guards at offsets -3/+3 outside every 5-wide clear station; two east-fold bottom cells are shifted one block farther outboard to avoid canonical descending treads; no guard enters the clear envelope', cells: guards.map((c) => ({ point: [c.x, c.y, c.z], targetState: 'minecraft:polished_deepslate_wall', role: 'two-high-guard-handrail' })), geometry: geometry(guards), collisionResolution: { nominalTreadCollisionCells: nominalGuardTreadCollisions.map((c) => [c.x, c.y, c.z]), outboardReplacementCells: outboardFoldGuardReplacements.map((c) => [c.x, c.y, c.z]), preservedGuardCellCount: guards.length, rule: 'replace only the two observed east-fold bottom guard/tread collisions with disjoint outboard cells; retain all other guard cells' }, upperEndcapCells: upperGuardEndcap, lowerEndcapCells: lowerGuardEndcap },
  },
  controlledRouteTransition: {
    status: 'RETURN02_CONTINUOUS__CURRENT_PROTECTED_ROUTE_RETIRED_BY_NO_STEP_IN_THIS_CONTRACT',
    selectedSemantics: [
      { sequence: 1, id: 'RETAIN_RETURN02', rule: 'Return-02 is the continuous public recovery route before, during, and after every main-lane stage; compiler target and halo sets must be disjoint from its canonical post-state inventory.' },
      { sequence: 2, id: 'ESTABLISH_MAIN_WITHOUT_RETIREMENT', rule: 'A future compiler may establish the main lane, selected endcap treads, and two-high guard/handrail only while the current protected route remains untouched until fresh Return-02 two-direction QA passes.' },
      { sequence: 3, id: 'POST_MAIN_DUAL_ROUTE_PROOF', rule: 'Before any current-route cell is altered, a fresh immutable post must prove main lower↔upper and Return-02 lower↔upper normal-walk paths independently, plus all retained landing interfaces.' },
      { sequence: 4, id: 'CURRENT_ROUTE_RETIREMENT_UNSELECTED', rule: 'This contract selects no retirement, connection, gate, closure, or target state for current protected fabric. A separately source-bound bilateral transition contract is mandatory.' },
    ],
    currentProtectedRouteTargetCellCount: 0,
    selectedRouteClosureState: 'NONE',
  },
  retainedReturn,
  freshSourceSafety: { mainAndGuardGeometry: geometry(designCells), bounds, fluidOrGravityCount: hazardCells.length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length },
  stillRequiredBeforeCompiler: [
    'Rebind this contract and all endpoint/Return-02 source states to a newly captured complete immutable source immediately before compilation.',
    'Record canonical current source states for every selected main tread, clearance, guard/handrail and approved endpoint transition cell.',
    'Emit exact forward and inverse operation groups with a continuous-Return-02 ordering proof; no current-route retirement group may exist under this contract.',
    'Audit the final target and interaction halos for protected core, containers/block entities, fluids, gravity and saved entities; obtain same-moment live-entity clearance.',
    'Run strict forward and rollback parser checks, exact source preflight, projected rollback preflight and strict journaled execution with verified partial-failure recovery.',
    'Capture an immutable post state, run rollback-poststate preflight, and independently prove main and retained Return-02 bidirectional normal-walk paths plus endpoint/guard preservation.',
    'Create a separate bilateral contract before any current protected-route retirement, connection, gate or closure is even compiled.',
  ],
  safetyBoundary: { liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  nonClaims: ['No Minecraft operation files.', 'No release manifest, authorization, guarded runner, or execution.', 'No public opening, egress, service, rail, power, or passenger-service claim.', 'No current protected-route retirement or connection target.'],
};
const contract = { ...contractBase, contractIdentitySha256: sha(`${JSON.stringify(contractBase, null, 2)}\n`) };
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="510" viewBox="0 0 1080 510"><style>text{font-family:system-ui;fill:#e8f5ff}.h{font-size:23px;font-weight:700}.s{font-size:14px}.m{fill:#38bdf8}.g{fill:#fbbf24}.r{fill:#a3e635}.x{fill:#fb923c}</style><rect width="100%" height="100%" fill="#071521"/><text class="h" x="32" y="40">C01 main-switchback transition / Return-02 preservation 05</text><rect class="m" x="110" y="120" width="480" height="210" opacity=".58"/><text class="s" x="145" y="158">main lane: 30 stations · 5-wide × 5-clear-high</text><rect class="g" x="90" y="105" width="20" height="240"/><rect class="g" x="590" y="105" width="20" height="240"/><text class="s" x="128" y="365">100 exact two-high polished-deepslate wall handrail/guard cells</text><rect class="r" x="735" y="120" width="195" height="210" opacity=".60"/><text class="s" x="755" y="158">Return-02 retained</text><text class="s" x="755" y="182">canonical fresh-state rebind: ${returnRecords.length} cells</text><text class="s" x="32" y="425">Upper endcap: (839,43,-47) → five east-facing treads; lower: (837,25,-54) → five west-facing treads.</text><text class="x s" x="32" y="458">Controlled transition: build only with Return-02 continuous; current-route retirement/connection is explicitly unselected. 0 operations.</text></svg>\n`;
const markdown = `# C01 main-switchback transition / Return-02 preservation 05\n\n**Status:** \`${contract.status}\`\n\n![Source-bound transition map](mp11-c01-main-switchback-transition-return02-preservation-05.svg)\n\nThis source-bound design contract selects the two endpoint endcaps, both accepted 5×5 landing interfaces, the 100-cell two-high polished-deepslate wall handrail/guard geometry, and a return-first controlled transition. It emits **zero** operations, release manifests, RCON calls, or mutation authority.\n\n- Upper endcap: anchor \`(839,43,-47)\`; five east-facing polished-blackstone stair treads.\n- Lower endcap: anchor \`(837,25,-54)\`; five west-facing polished-blackstone stair treads.\n- At the east fold, nominal bottom guards \`(846,35,-48)\` and \`(846,35,-49)\` would overwrite canonical treads; they are conservatively moved outboard to \`(845,35,-48)\` and \`(845,35,-49)\`. The 100-cell guard count is retained and every final guard remains disjoint from the main targets, clear envelope, and Return-02.\n- Landing faces remain accepted 5×5 interfaces and were freshly rebound with zero state mismatches.\n- Return-02 has \`${returnRecords.length}\` canonical states, zero fresh-source mismatches, and zero main-target intersection.\n- Current protected-route retirement, connection, gates, and closures are deliberately **unselected**.\n\nA later compiler must satisfy every \`stillRequiredBeforeCompiler\` item in the machine contract and independently prove both the new main route and retained Return-02 on a fresh immutable post state.\n`;
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'mp11-c01-main-switchback-transition-return02-preservation-05.json')), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'mp11-c01-main-switchback-transition-return02-preservation-05.svg')), map);
fs.writeFileSync(abs(path.join(OUT, 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-RETURN02-PRESERVATION-05.md')), markdown);
console.log(JSON.stringify({ status: contract.status, out: rel(OUT), mainTargetCells: targetCells.length, guardCells: guards.length, retainedReturnCanonicalCells: returnRecords.length, mainReturnIntersectionCount: mainReturnOverlap.length, operationsEmitted: 0, mutationAuthority: false }, null, 2));
