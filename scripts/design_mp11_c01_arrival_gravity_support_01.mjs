#!/usr/bin/env node
/** Read-only permanent-material and no-falling sequencing design for C01 arrival gravel. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const opt = (flag, fallback) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z');
const SCOUT = opt('--scout', 'data/world-review/mp11-c01-arrival-gravity-support-scout-01-arrival-post-20260827T035100Z/mp11-c01-arrival-gravity-support-scout-01.json');
const OUT = opt('--out', 'data/world-review/mp11-c01-arrival-gravity-support-design-01-arrival-post-20260827T035100Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`C01 arrival gravity-support design rejected: ${message}`); };
const json = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const point = (x, y, z) => ({ x, y, z });
const key = cellKey;
const byStation = (a, b) => a.y - b.y || a.z - b.z || a.x - b.x;
const name = (state) => state.split('[', 1)[0];
const isUnsafeSupport = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:water', 'minecraft:lava', 'minecraft:bubble_column', 'minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel'].includes(name(state)) || state.includes('waterlogged=true') || name(state).endsWith('_concrete_powder');
const cube = (cell) => { const cells = []; for (let x = cell.x - 1; x <= cell.x + 1; x += 1) for (let y = cell.y - 1; y <= cell.y + 1; y += 1) for (let z = cell.z - 1; z <= cell.z + 1; z += 1) cells.push(point(x, y, z)); return cells; };
const manifest = (cells) => ({ cellCount: cells.length, coordinateSetSha256: hashCells(cells) });

const scout = json(SCOUT);
fail(scout.id === 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-SCOUT-01' && scout.status === 'CANDIDATE_FINITE_DRY_C01_ARRIVAL_GRAVITY_SUPPORT_REQUIRES_INTERFACE_CONTRACT', 'finite source scout is not the expected candidate');
const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(abs(capturePath)); const capture = JSON.parse(captureBytes);
fail(scout.source.snapshot === rel(SNAPSHOT) && scout.source.captureId === capture.captureId && scout.source.captureManifestSha256 === sha(captureBytes), 'scout/source binding drift');
for (const member of capture.requiredMembers) { const file = abs(path.join(SNAPSHOT, member.path)); fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `immutable source member drift ${member.path}`); }
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const component = scout.scope.finiteGravityComponent.cells.slice().sort(byStation);
fail(component.length === 33 && component.every((cell) => cell.y === 41 || cell.y === 42), 'component geometry drift');
const source = await Promise.all(component.map(async (cell) => ({ cell, sourceState: await state(cell) })));
fail(source.every((entry) => entry.sourceState === 'minecraft:gravel'), 'component no longer has canonical gravel source state');
const low = source.filter(({ cell }) => cell.y === 41); const upper = source.filter(({ cell }) => cell.y === 42);
fail(low.length === 32 && upper.length === 1, 'expected 32 low + 1 upper component topology');
const underSupports = await Promise.all(low.map(async ({ cell }) => ({ cell: point(cell.x, 40, cell.z), state: await state(point(cell.x, 40, cell.z)) })));
fail(underSupports.every(({ state }) => !isUnsafeSupport(state)), 'low gravel layer lacks a stable non-fluid, non-gravity underside support');
const targetState = 'minecraft:polished_deepslate';
const forward = [...low, ...upper].map((entry, index) => ({ ordinal: index + 1, cell: entry.cell, sourceState: entry.sourceState, targetState }));
const inverse = forward.slice().reverse().map((entry, index) => ({ ordinal: index + 1, cell: entry.cell, sourceState: targetState, targetState: entry.sourceState }));
const transitionHash = (items) => sha(`${items.map((entry) => `${entry.ordinal}:${key(entry.cell)}:${entry.sourceState}>${entry.targetState}`).join('\n')}\n`);
const cadenceTargets = [744, 748, 760].map((x) => point(x, 42, -81));
const cadenceStates = await Promise.all(cadenceTargets.map(async (cell) => ({ cell, state: await state(cell) })));
fail(cadenceStates.every(({ state }) => state === 'minecraft:sea_lantern'), 'accepted arrival cadence target drift');
const componentHalo = new Map(uniqueCells(component.flatMap(cube)).map((cell) => [key(cell), cell]));
const cadenceHalo = uniqueCells(cadenceTargets.flatMap(cube));
const overlap = cadenceHalo.filter((cell) => componentHalo.has(key(cell))).sort(byStation);
const overlapStates = await Promise.all(overlap.map(async (cell) => ({ cell, state: await state(cell) })));
const expectedOverlap = [
  { cell: point(759, 41, -81), state: 'minecraft:stone' }, { cell: point(759, 41, -80), state: 'minecraft:stone' },
  { cell: point(759, 42, -81), state: 'minecraft:light_blue_concrete' }, { cell: point(759, 42, -80), state: 'minecraft:polished_blackstone' },
];
fail(JSON.stringify(overlapStates) === JSON.stringify(expectedOverlap), 'exact four-cell cadence-halo retained state drift');
const componentKeys = new Set(component.map(key));
fail(!cadenceTargets.some((cell) => componentKeys.has(key(cell))), 'component intersects an accepted cadence target');
const supportCensus = Object.fromEntries([...underSupports.reduce((counts, entry) => counts.set(entry.state, (counts.get(entry.state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const width = 1160, left = 82, top = 116, unit = 74;
const planCells = [];
for (let z = -85; z <= -77; z += 1) for (let x = 750; x <= 759; x += 1) {
  const lower = point(x, 41, z), high = point(x, 42, z), lowerIn = componentKeys.has(key(lower)), highIn = componentKeys.has(key(high));
  const overlapCell = overlap.some((cell) => key(cell) === key(lower) || key(cell) === key(high));
  const fill = lowerIn ? '#d6a857' : highIn ? '#efbf5b' : overlapCell ? '#ff7070' : '#1a3048';
  planCells.push(`<rect x="${left + (x - 750) * unit}" y="${top + (z + 85) * unit / 1.35}" width="${unit}" height="${unit / 1.35}" fill="${fill}" stroke="#425b73"/><title>${x},41/42,${z}</title>`);
}
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:13px system-ui;fill:#e7eef6}</style><text class="h" x="42" y="42">C01 arrival gravel support — permanent material and no-falling sequence</text><text class="s" x="42" y="66">${rel(SNAPSHOT)} · capture ${capture.captureId} · read-only design, no operations</text><rect x="82" y="116" width="740" height="490" fill="#152841" stroke="#59738d"/>${planCells.join('')}<text class="s" x="82" y="636">Gold = component cells (32 at Y=41, 1 at Y=42); red = four retained cells shared with cadence halo, never targets.</text><rect x="866" y="116" width="294" height="330" fill="#101b2c" stroke="#425b73"/><text class="l" x="890" y="150">Permanent target: polished_deepslate</text><text class="l" x="890" y="182">Forward: Y=41 ×32, then Y=42 ×1</text><text class="l" x="890" y="214">Inverse: Y=42 ×1, then Y=41 ×32</text><text class="l" x="890" y="246">Each transition is direct block→block;</text><text class="l" x="890" y="268">no temporary air state is permitted.</text><text class="l" x="890" y="310">Low underside supports:</text><text class="l" x="890" y="332">polished_deepslate ×31; stone ×1</text><text class="l" x="890" y="374">Cadence targets remain sea_lantern ×3.</text><text class="l" x="890" y="406">Overlap retained-state hash required.</text><text class="s" x="82" y="700">A compiler must bind this exact source transition hash, preserve all 219 halo cells except the 33 component targets, and enforce the contract before any guarded release.</text></svg>`;
const base = {
  schemaVersion: 1,
  id: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-DESIGN-01',
  status: 'SOURCE_BOUND_PERMANENT_GRAVITY_LINER_DESIGN_ONLY_REQUIRES_INTERFACE_CONTRACT',
  mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), scout: { path: rel(SCOUT), identity: scout.scoutIdentitySha256 } },
  materialDecision: {
    canonicalPermanentTargetState: targetState,
    type: 'non_gravity_full_block',
    rationale: 'Polished deepslate is a non-gravity full block and is already the canonical underside support at 31 of 32 low-layer positions; the remaining underside is solid stone. It preserves the arrival floor and cadence because it replaces only the below/adjacent gravel component.',
    noTemporaryAirState: true,
    componentSourceState: 'minecraft:gravel'
  },
  exactComponent: { cells: manifest(component), sourceCoordinateStateSha256: scout.scope.finiteGravityComponent.coordinateStateSha256, bounds: scout.scope.finiteGravityComponent.bounds, lowLayerCount: low.length, upperLayerCount: upper.length },
  noFallingSequence: {
    forward: { rule: 'Direct strict gravel → polished_deepslate replacements. Process all Y=41 cells in deterministic z/x order, then the sole Y=42 cell.', transitionCount: forward.length, transitionSha256: transitionHash(forward), transitions: forward },
    inverse: { rule: 'Direct strict polished_deepslate → gravel replacements. Process the sole Y=42 cell first, then the Y=41 cells in exact reverse order; every restored gravel cell retains a solid non-gravity cell immediately below.', transitionCount: inverse.length, transitionSha256: transitionHash(inverse), transitions: inverse },
    lowLayerUnderside: { cellCount: underSupports.length, sourceStateCensus: supportCensus, coordinateStateSha256: sha(`${underSupports.slice().sort((a, b) => byStation(a.cell, b.cell)).map((entry) => `${key(entry.cell)}=${entry.state}`).join('\n')}\n`) }
  },
  cadencePreservation: {
    acceptedCadenceTargets: { cells: manifest(cadenceTargets), requiredState: 'minecraft:sea_lantern', sourceStateVerified: true, componentTargetIntersectionCount: 0 },
    exactHaloOverlap: { cells: manifest(overlap), retainedStates: overlapStates, retainedStateSha256: sha(`${overlapStates.map((entry) => `${key(entry.cell)}=${entry.state}`).join('\n')}\n`), purpose: 'These four non-target cells are in both interaction halos. They must be exact source/post retained states, never support-liner targets.' },
    retainedPriorC01Next01: { targetCount: 9, requirement: 'All prior sea-lantern inlays remain exact and outside the support component/halo target set.' }
  },
  packageAuditContract: {
    requiredBilateralOwners: ['C01-BUNKER-ARRIVAL-GRAVITY-SUPPORT-OWNER', 'C01-BUNKER-ARRIVAL-CADENCE-INTERFACE-OWNER'],
    requiredContractId: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-OWNERSHIP-INTERFACE-01',
    beforeAnyCompile: ['Accept the exact four-cell cadence-halo retained-state set and no target overlap.', 'Bind component source-coordinate-state and sequence hashes to this immutable source.', 'Retain non-component states in the exact 219-cell interaction halo.'],
    beforeAnyExecution: ['Fresh complete source rebind and immutable-member verification.', 'Exact source and projected inverse preflights; strict-noop parser for both directions.', 'Protected/block-entity and fresh live-entity clearance, journaled execution, post capture, rollback-poststate preflight, and independent cadence/support QA.'],
    forbidden: ['temporary air removal', 'gravity target material', 'arrival floor/cadence target changes', 'route opening or commissioning']
  },
  nonClaims: ['This selects no release package, operation file, execution authority, or live action.', 'This does not alter or commission a C01 route, egress, public endpoint, transport, or service.']
};
const report = { ...base, designIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-design-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-design-01-map.svg'), `${map}\n`);
fs.writeFileSync(path.join(out, 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-DESIGN-01.md'), `# MP11 C01 arrival gravity-support design 01\n\n**Status:** \`${report.status}\`  \n**Authority:** source-bound design only; no operations or mutation authority.\n\n![Material and sequence map](mp11-c01-arrival-gravity-support-design-01-map.svg)\n\nThe 33 exact gravel cells are permanently lined with **polished deepslate** in a proposed future package. The material is a non-gravity full block and matches 31 of the 32 verified low-layer underside supports; the remaining support is solid stone.\n\nForward replacement is direct and deterministic: all **32** Y=41 cells first, then the sole Y=42 cell. The inverse is the exact reverse: Y=42 first, then Y=41 in reverse order. Neither direction may introduce temporary air. The inverse restores each gravel cell while its support below remains a solid non-gravity source state.\n\nThe component never targets an accepted arrival inlay. Four exact cells overlap the x=760 cadence interaction halo and are retained, hash-bound states: stone at (759,41,-81/-80), light-blue concrete at (759,42,-81), and polished blackstone at (759,42,-80). The three accepted arrival targets remain sea lanterns.\n\nA named bilateral interface contract is still mandatory before a compiler may emit operations.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), componentCellCount: component.length, forwardTransitionCount: forward.length, inverseTransitionCount: inverse.length, targetState, cadenceHaloOverlapCount: overlap.length, mutationAuthority: false }, null, 2));
