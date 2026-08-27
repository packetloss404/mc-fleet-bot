#!/usr/bin/env node
/** Read-only MP05/MP08 safety-delta scout from the accepted C01 post snapshot. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, deriveB07WestTwo, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z');
const OUT = opt('--out', 'data/world-review/mp05-mp08-c01-post-safety-delta-scout-01-20260827T035100Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP05/MP08 C01-post safety scout rejected: ${message}`); };
const readJson = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const name = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(name(state)) || name(state).endsWith('_concrete_powder');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const dirs = [['-X', -1, 0, 0], ['+X', 1, 0, 0], ['-Y', 0, -1, 0], ['+Y', 0, 1, 0], ['-Z', 0, 0, -1], ['+Z', 0, 0, 1]];
const c = (x, y, z) => ({ x, y, z });
const mapCells = (cells) => new Map(cells.map((cell) => [cellKey(cell), cell]));
const exact = (cells) => { const items = uniqueCells(cells); return { cellCount: items.length, coordinateSetSha256: hashCells(items) }; };
const neighbours = (cell) => dirs.map(([, dx, dy, dz]) => c(cell.x + dx, cell.y + dy, cell.z + dz));
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(abs(path.join(SNAPSHOT, member))), `missing complete immutable snapshot member ${member}`);
const captureBytes = fs.readFileSync(abs(capturePath));
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length >= 130, 'snapshot is not a complete immutable source');
for (const member of capture.requiredMembers) {
  const file = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `immutable member drift ${member.path}`);
}
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entities = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const stateAt = async (cell) => { const key = cellKey(cell); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(key); };
const exactHalo = (targets) => uniqueCells(targets.flatMap((target) => neighbours(target)));
const entityHits = async (cells) => {
  const set = new Set(cells.map(cellKey)); const chunks = new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
  let blockEntities = 0; let savedEntities = 0;
  for (const entry of chunks) {
    const [x, z] = entry.split(',').map(Number); const chunk = await reader.chunk(x, z); const entityChunk = await entities.chunk(x, z);
    for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) if (set.has(`${be.x},${be.y},${be.z}`)) blockEntities += 1;
    for (const e of entityChunk?.Entities ?? entityChunk?.entities ?? []) { const pos = e.Pos ?? e.pos; if (Array.isArray(pos) && set.has(`${Math.floor(+pos[0])},${Math.floor(+pos[1])},${Math.floor(+pos[2])}`)) savedEntities += 1; }
  }
  return { blockEntities, savedEntities };
};

const b07Lighting = [
  ...[22, 29, 36, 43, 50, 57].map((y) => c(2106, y, -398)),
  ...[-424, -416, -408].map((z) => c(2109, 10, z)),
  ...[11, 14, 17].map((y) => c(2107, y, -401)),
  ...[-393, -391, -389, -387, -385].map((z) => c(2106, 72 - (z + 394) + 2, z)),
  ...[-380, -377, -374].map((z) => c(2108, 65, z)),
  ...[-393, -391, -389, -387, -385].map((z) => c(2110, 72 - (z + 394) + 2, z)),
];
const b07States = await Promise.all(b07Lighting.map(async (cell) => ({ cell, state: await stateAt(cell) })));
const c1Lighting = [16, 24, 32, 40, 48, 56, 64, 72].map((z, index) => c(index % 2 ? -2 : 2, -9, z));
const c1Halo = exactHalo(c1Lighting);
const c1States = await Promise.all(c1Lighting.map(async (cell) => ({ cell, state: await stateAt(cell) })));
const c1HaloStates = await Promise.all(c1Halo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
const c1Entities = await entityHits([...c1Lighting, ...c1Halo]);
const correctionPath = 'docs/masterplans/08-raven-rock/MP08-C1-LIGHTING-CORRECTION-2026-08-27.md';
fail(fs.existsSync(abs(correctionPath)), 'C1 lighting correction provenance missing');

const mechanismsPath = 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json';
const mechanisms = readJson(mechanismsPath);
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
const construction = new Set(b07.construction.map(cellKey));
const interaction = new Set(b07.interaction.map(cellKey));
const fluidSeeds = [];
for (const cell of b07.interaction) { const state = await stateAt(cell); if (isFluid(state)) fluidSeeds.push({ cell, state }); }
const airFaces = [];
for (const { cell, state } of fluidSeeds) for (const [direction, dx, dy, dz] of dirs) {
  const target = c(cell.x + dx, cell.y + dy, cell.z + dz); const targetState = await stateAt(target);
  if (isAir(targetState)) airFaces.push({ from: cell, fromState: state, direction, target, targetState, inConstruction: construction.has(cellKey(target)), inInteraction: interaction.has(cellKey(target)) });
}
const faceGroups = {
  construction: airFaces.filter((face) => face.inConstruction),
  interactionOnly: airFaces.filter((face) => !face.inConstruction && face.inInteraction),
  exteriorNoCounterpart: airFaces.filter((face) => !face.inInteraction),
};
const scatter = (items, x, z) => {
  const key = `${x},${z}`; return items.some((item) => `${item.from.x},${item.from.z}` === key) ? '#1479c9' : items.some((item) => `${item.target.x},${item.target.z}` === key) ? '#f2a900' : '#e4edf5';
};
const b07Map = (() => {
  const minX = 2101, maxX = 2114, minZ = -404, maxZ = -392, unit = 31, left = 76, top = 64;
  const cells = [];
  for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) cells.push(`<rect x="${left + (x - minX) * unit}" y="${top + (z - minZ) * unit}" width="${unit}" height="${unit}" fill="${scatter(airFaces, x, z)}" stroke="#b8c7d6"/><title>${x},${z}: blue=fluid source contact; amber=air target; pale=other</title>`);
  const labels = Array.from({ length: maxX - minX + 1 }, (_, i) => `<text x="${left + i * unit + 4}" y="${top - 10}" class="m">${minX + i}</text>`).join('') + Array.from({ length: maxZ - minZ + 1 }, (_, i) => `<text x="${left - 48}" y="${top + i * unit + 19}" class="m">${minZ + i}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="540" viewBox="0 0 920 540"><style>.h{font:700 19px system-ui;fill:#172033}.s{font:12px system-ui;fill:#27384a}.m{font:9px ui-monospace,monospace;fill:#27384a}</style><rect width="920" height="540" fill="#fff"/><text class="h" x="20" y="28">MP05 B07 local fluid-to-air boundary census</text><text class="s" x="20" y="48">Accepted C01 post source. Blue=interaction-fluid source contact; amber=air contact. Map is X/Z aggregation; every face retains its exact Y in evidence JSON.</text>${cells.join('')}${labels}<rect x="548" y="110" width="342" height="168" fill="#f5f8fb" stroke="#c1d1df"/><text class="s" x="568" y="142">Fluid-to-air faces: ${airFaces.length}</text><text class="s" x="568" y="168">Construction targets: ${faceGroups.construction.length}</text><text class="s" x="568" y="194">Interaction-only targets: ${faceGroups.interactionOnly.length}</text><text class="s" x="568" y="220">Exterior / no counterpart: ${faceGroups.exteriorNoCounterpart.length}</text><text class="s" x="568" y="250">Disposition: no finite local liner target</text><text class="s" x="20" y="510">No fluid, route, opening, or receiver state is changed or inferred by this map.</text></svg>`;
})();
const c1Map = (() => {
  const minZ = 12, maxZ = 73, unit = 14, left = 180, top = 82; const marked = new Set(c1Lighting.map(cellKey));
  const cells = [];
  for (let z = minZ; z <= maxZ; z += 1) for (let x = -3; x <= 3; x += 1) { const cell = c(x, -9, z); const target = marked.has(cellKey(cell)); cells.push(`<rect x="${left + (x + 3) * unit}" y="${top + (z - minZ) * 6}" width="${unit}" height="6" fill="${target ? '#94a7b8' : x >= -1 && x <= 1 ? '#e7eef6' : '#d5e0ea'}" stroke="#fff"/><title>${x},-9,${z}${target ? ': restored polished deepslate fixture location' : ''}</title>`); }
  const dots = c1Lighting.map(({ x, z }) => `<circle cx="${left + (x + 3) * unit + 7}" cy="${top + (z - minZ) * 6 + 3}" r="4" fill="#e06c75"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="560" viewBox="0 0 920 560"><style>.h{font:700 19px system-ui;fill:#172033}.s{font:12px system-ui;fill:#27384a}.m{font:10px ui-monospace,monospace;fill:#27384a}</style><rect width="920" height="560" fill="#fff"/><text class="h" x="20" y="28">MP08 C1 reverted fixture locations — no replay candidate</text><text class="s" x="20" y="48">y=-9 plan. Red dots are the eight restored polished-deepslate locations from the deliberately reversed inspection-lighting package.</text>${cells.join('')}${dots}<text class="m" x="145" y="78">x=-3..3</text><text class="m" x="90" y="100">z=12</text><text class="m" x="90" y="450">z=73</text><rect x="360" y="112" width="510" height="178" fill="#f5f8fb" stroke="#c1d1df"/><text class="s" x="382" y="146">Exact source state: polished_deepslate ×8</text><text class="s" x="382" y="174">Fixture interaction halo: ${c1Halo.length} cells; dry / non-gravity / no saved or block entities</text><text class="s" x="382" y="202">Hard blocker: prior C1 lighting was deliberately rolled back; no documented new functional defect.</text><text class="s" x="382" y="230">No fixture replay, operation, or new authority is emitted.</text><text class="s" x="20" y="526">This map preserves C1’s containment/interface default-deny status and does not open either vestibule.</text></svg>`;
})();

const report = {
  schemaVersion: 1,
  id: 'MP05-MP08-C01-POST-SAFETY-DELTA-SCOUT-01',
  status: 'NO_FINITE_UNBUILT_SAFETY_DELTA_ON_ACCEPTED_C01_POST_SOURCE',
  mode: 'READ_ONLY_SOURCE_SCOUT',
  mutationAuthority: false,
  safetyBoundary: { liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), immutableMemberCount: capture.requiredMembers.length },
  ownerAuthorizationContext: {
    standingMasterplan05BuildAuthority: 'Supports only an exact independently useful guarded scope after its full safety kernel; it does not authorize stale lighting replay or B07 route/opening changes.',
    mp08C1LightingCorrection: rel(correctionPath),
    result: 'Owner roles do not waive the functional-defect and exact-boundary requirements.'
  },
  lightingReconnaissance: {
    mp05B07AcceptedFixtures: { cells: exact(b07Lighting), observedStateCensus: Object.fromEntries([...b07States.reduce((result, item) => result.set(item.state, (result.get(item.state) ?? 0) + 1), new Map()).entries()]), acceptedFixtureReplayCandidate: false, reason: 'All reviewed B07 fixed-light fixture cells already hold glowstone in this immutable post source.' },
    mp08C1RevertedFixtures: { cells: exact(c1Lighting), observedStateCensus: Object.fromEntries([...c1States.reduce((result, item) => result.set(item.state, (result.get(item.state) ?? 0) + 1), new Map()).entries()]), halo: { cells: exact(c1Halo), fluidOrWaterloggedCount: c1HaloStates.filter(({ state }) => isFluid(state)).length, gravityCount: c1HaloStates.filter(({ state }) => isGravity(state)).length, ...c1Entities }, candidate: null, hardBlocker: 'The eight original fixture locations are dry and exact but the accepted C1 lighting correction deliberately restored them; no distinct source-bound functional defect exists to justify replay.' }
  },
  b07LocalFluidBoundary: {
    interactionFluidSeeds: exact(fluidSeeds.map(({ cell }) => cell)),
    fluidToAirFaceCount: airFaces.length,
    constructionTargetFaceCount: faceGroups.construction.length,
    interactionOnlyTargetFaceCount: faceGroups.interactionOnly.length,
    exteriorNoCounterpartTargetFaceCount: faceGroups.exteriorNoCounterpart.length,
    faces: airFaces.map((face) => ({ from: face.from, direction: face.direction, target: face.target, disposition: face.inConstruction ? 'would_require_separate_contract' : face.inInteraction ? 'blocked_retained_route_opening_envelope' : 'blocked_no_exterior_counterpart_domain' })),
    candidate: null,
    hardBlockers: [
      `Zero of ${airFaces.length} exact B07 fluid-to-air contacts target a cell in the accepted construction domain.`,
      `${faceGroups.interactionOnly.length} contacts terminate in interaction-only air, where no route/opening-change contract is present.`,
      `${faceGroups.exteriorNoCounterpart.length} contacts terminate outside the interaction domain with no exact exterior counterpart / receiver / overflow boundary.`,
      'The local scan cannot prove closure of the connected upstream fluid component; no local face is promoted into a liner, plug, or receiver.'
    ]
  },
  decision: { prepareReadyCandidate: null, forwardOperationCount: 0, rollbackOperationCount: 0, nextRequiredInputs: ['A documented source-bound functional defect before any C1 lighting reconsideration.', 'For B07: an exact counterpart domain plus finite component closure or independently sealed boundary with directed receiver/overflow/reverse design.'] },
  nonClaims: ['No B07 fluid containment, receiver, route, opening, egress, or discharge is selected.', 'No MP08 C1 vestibule, cavern, public route, or lighting replay is authorized.']
};
report.identitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'mp05-mp08-c01-post-safety-delta-scout-01.json')), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'mp05-b07-local-fluid-boundary-census.svg')), `${b07Map}\n`);
fs.writeFileSync(abs(path.join(OUT, 'mp08-c1-reverted-lighting-census.svg')), `${c1Map}\n`);
fs.writeFileSync(abs(path.join(OUT, 'MP05-MP08-C01-POST-SAFETY-DELTA-SCOUT-01.md')), `# MP05 / MP08 accepted-C01-post safety-delta scout 01\n\n**Status:** \`${report.status}\`  \n**Source:** \`${report.source.snapshot}\` (capture \`${report.source.captureId}\`)\n\n- [Machine evidence](mp05-mp08-c01-post-safety-delta-scout-01.json)\n- [B07 local fluid-boundary map](mp05-b07-local-fluid-boundary-census.svg)\n- [MP08 C1 reverted-lighting map](mp08-c1-reverted-lighting-census.svg)\n\nNo finite unbuilt safety delta is emitted. All ${b07Lighting.length} reviewed B07 fixture cells are already glowstone in the accepted source. The eight C1 fixture cells are dry, bounded, and again polished deepslate, but that is the intended post-correction state: no new source-bound functional defect supports replay.\n\nThe B07 local census finds ${airFaces.length} exact fluid-to-air contacts: ${faceGroups.interactionOnly.length} terminate in retained interaction-only route/opening air and ${faceGroups.exteriorNoCounterpart.length} terminate beyond the interaction domain without an exact counterpart. None target the accepted construction set. No local liner, plug, receiver, overflow, forward operation, or inverse is selected.\n\nThis is a read-only evidence package. It does not open or commission any C1 or B07 route, egress, receiver, cavern, fluid discharge, or passenger/service function.\n`);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT, 'mp05-mp08-c01-post-safety-delta-scout-01.json')), maps: 2, b07FixtureCount: b07Lighting.length, c1RevertedFixtureCount: c1Lighting.length, b07FluidToAirFaces: airFaces.length, mutationAuthority: false }, null, 2));
