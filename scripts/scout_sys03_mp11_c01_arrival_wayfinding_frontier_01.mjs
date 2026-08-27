#!/usr/bin/env node
/**
 * Read-only C01 arrival-corridor frontier scout.
 *
 * This intentionally emits evidence and maps only.  It neither chooses a
 * target state nor writes an operation / release manifest, and cannot call a
 * live service.  The three sites are selected from the fresh source only
 * after the accepted C01-NEXT-01 inlays and the local gravel hold are
 * excluded.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-masterplan-frontier-source-20260827T030918Z');
const OUT = option('--out', 'data/world-review/sys03-mp11-c01-arrival-wayfinding-frontier-01-masterplan-frontier-source-20260827T030918Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03/MP11 C01 arrival frontier rejected: ${message}`); };
const nameOf = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg']);
const forbidden = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block']);
const existingInlays = [708, 712, 716, 720, 724, 728, 732, 736, 740];
const potentialSites = [744, 748, 752, 756, 760];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const point = (x, y, z) => ({ x, y, z });
const cube = (center) => {
  const cells = [];
  for (let x = center.x - 1; x <= center.x + 1; x += 1) for (let y = center.y - 1; y <= center.y + 1; y += 1) for (let z = center.z - 1; z <= center.z + 1; z += 1) cells.push(point(x, y, z));
  return cells;
};
const box = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push(point(x, y, z));
  return cells;
};
const entityPoint = (entity) => {
  const p = entity?.Pos ?? entity?.pos;
  return Array.isArray(p) && p.length >= 3 ? point(Math.floor(Number(p[0])), Math.floor(Number(p[1])), Math.floor(Number(p[2]))) : null;
};
const inBounds = (p, b) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ;

const sourceRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(sourceRoot, member)), `missing complete immutable source member ${member}`);
const capturePath = path.join(sourceRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'immutable complete-save capture identity is incomplete');
for (const member of capture.requiredMembers) {
  const filename = path.join(sourceRoot, member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `immutable source member drift ${member.path}`);
}

const reader = new AnvilReader(path.join(sourceRoot, 'region'));
const entityReader = new AnvilReader(path.join(sourceRoot, 'entities'));
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
}
async function exactCellSafety(site) {
  const floor = await stateAt(site);
  const support = await stateAt(point(site.x, site.y - 1, site.z));
  const head = await stateAt(point(site.x, site.y + 1, site.z));
  const upperHead = await stateAt(point(site.x, site.y + 2, site.z));
  const halo = cube(site);
  const hazards = [];
  for (const cell of halo) {
    const state = await stateAt(cell);
    if (fluid(state) || gravity.has(nameOf(state)) || forbidden.has(nameOf(state))) hazards.push({ cell, state, reason: fluid(state) ? 'fluid' : gravity.has(nameOf(state)) ? 'gravity' : 'forbidden-block' });
  }
  return {
    site, floor, support, head, upperHead,
    exactSiteEligible: floor === 'minecraft:light_blue_concrete' && !AIR.has(nameOf(support)) && !fluid(support) && !gravity.has(nameOf(support)) && AIR.has(nameOf(head)) && AIR.has(nameOf(upperHead)) && hazards.length === 0,
    halo: uniqueCells(halo), hazards,
  };
}

for (const x of existingInlays) fail(await stateAt(point(x, 42, -81)) === 'minecraft:sea_lantern', `accepted C01-NEXT-01 inlay drift at ${x},42,-81`);
const inspected = [];
for (const x of potentialSites) inspected.push(await exactCellSafety(point(x, 42, -81)));
const selected = inspected.filter((item) => item.exactSiteEligible).slice(0, 3);
fail(selected.length === 3, 'fewer than three finite dry/non-container arrival-corridor sites remain after exact exclusions');
const selectedCells = selected.map(({ site }) => site);
const selectedHalo = uniqueCells(selected.flatMap((item) => item.halo));
const haloBounds = { minX: Math.min(...selectedHalo.map((item) => item.x)), maxX: Math.max(...selectedHalo.map((item) => item.x)), minY: Math.min(...selectedHalo.map((item) => item.y)), maxY: Math.max(...selectedHalo.map((item) => item.y)), minZ: Math.min(...selectedHalo.map((item) => item.z)), maxZ: Math.max(...selectedHalo.map((item) => item.z)) };

const blockEntities = []; const savedEntities = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const p = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (selectedHalo.some((cell) => cellKey(cell) === cellKey(p))) blockEntities.push({ cell: p, id: String(entity.id ?? 'unknown') });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const p = entityPoint(entity);
    if (p && selectedHalo.some((cell) => cellKey(cell) === cellKey(p))) savedEntities.push({ cell: p, id: String(entity.id ?? 'unknown') });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'source interaction halo contains a block entity or saved entity');

const sourceCensus = {};
for (const cell of selectedCells) { const state = await stateAt(cell); sourceCensus[state] = (sourceCensus[state] ?? 0) + 1; }
const planBounds = { minX: 700, maxX: 760, minY: 41, maxY: 44, minZ: -83, maxZ: -79 };
const px = (x) => 52 + ((x - planBounds.minX) / (planBounds.maxX - planBounds.minX)) * 1090;
const pz = (z) => 128 + ((planBounds.maxZ - z) / (planBounds.maxZ - planBounds.minZ)) * 250;
const selectedKeys = new Set(selectedCells.map(cellKey)); const priorKeys = new Set(existingInlays.map((x) => cellKey(point(x, 42, -81)))); const heldKeys = new Set(inspected.filter((item) => !item.exactSiteEligible).map((item) => cellKey(item.site)));
const floorTiles = [];
for (let x = 700; x <= 760; x += 1) for (let z = -83; z <= -79; z += 1) {
  const c = point(x, 42, z); const state = await stateAt(c); const fill = selectedKeys.has(cellKey(c)) ? '#ffd166' : priorKeys.has(cellKey(c)) ? '#74d1ff' : heldKeys.has(cellKey(c)) ? '#ff7b72' : state === 'minecraft:air' ? '#101b2c' : '#22364d';
  floorTiles.push(`<rect x="${px(x).toFixed(1)}" y="${pz(z).toFixed(1)}" width="18.2" height="50" fill="${fill}" stroke="#425b73"/>`);
}
const planSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="560" viewBox="0 0 1200 560"><rect width="1200" height="560" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:12px system-ui;fill:#e7eef6}</style><text class="h" x="42" y="40">C01 L1 arrival-corridor frontier — plan at y=42</text><text class="s" x="42" y="64">${rel(SNAPSHOT)} · capture ${capture.captureId} · read-only candidate reconnaissance</text><rect x="52" y="128" width="1090" height="250" fill="#13243a" stroke="#59738d"/>${floorTiles.join('')}<line x1="52" y1="253" x2="1142" y2="253" stroke="#d7edf9" stroke-width="3"/><text class="s" x="52" y="407">x=700</text><text class="s" x="1090" y="407">x=760</text><rect x="52" y="438" width="18" height="18" fill="#74d1ff"/><text class="l" x="78" y="452">accepted C01-NEXT-01 inlay (retained)</text><rect x="390" y="438" width="18" height="18" fill="#ffd166"/><text class="l" x="416" y="452">unbuilt source-valid candidate sites: ${selectedCells.map((c) => `(${c.x},${c.y},${c.z})`).join(', ')}</text><rect x="52" y="480" width="18" height="18" fill="#ff7b72"/><text class="l" x="78" y="494">held: local gravity/interaction-halo conflict; excluded, not a candidate</text><text class="s" x="52" y="531">No target state, operation file, release manifest, execution authority, route opening, or commissioning claim is produced.</text></svg>\n`;
const sectionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500"><rect width="1200" height="500" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:12px system-ui;fill:#e7eef6}</style><text class="h" x="42" y="40">C01 L1 arrival-corridor frontier — longitudinal section at z=-81</text><text class="s" x="42" y="64">each candidate retains non-gravity support and two clear head cells in the immutable source</text><rect x="52" y="104" width="1090" height="250" fill="#13243a" stroke="#59738d"/>${[41, 42, 43, 44].map((y) => `<line x1="52" y1="${330 - (y - 41) * 65}" x2="1142" y2="${330 - (y - 41) * 65}" stroke="#425b73"/><text class="s" x="12" y="${335 - (y - 41) * 65}">y=${y}</text>`).join('')}${selectedCells.map((c) => `<line x1="${px(c.x).toFixed(1)}" y1="330" x2="${px(c.x).toFixed(1)}" y2="135" stroke="#ffd166" stroke-width="4"/><circle cx="${px(c.x).toFixed(1)}" cy="265" r="8" fill="#ffd166"/>`).join('')}<text class="l" x="52" y="395">yellow: surveyed unbuilt floor cell at y=42; its y=41 support is non-fluid/non-gravity and y=43..44 are air.</text><text class="s" x="52" y="440">This records a finite safety-useful illumination/wayfinding gap only. It is not a physical package.</text></svg>\n`;

const base = {
  schemaVersion: 1,
  id: 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-FRONTIER-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'SOURCE_VALID_UNBUILT_FINITE_DRY_NONCONTAINER_CANDIDATE_ONLY',
  mode: 'READ_ONLY_SOURCE_BOUND_FRONTIER_SCOUT',
  mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, verifiedRequiredMemberCount: capture.requiredMembers.length },
  candidate: {
    id: 'C01-L1-ARRIVAL-WAYFINDING-CADENCE-EXTENSION-CANDIDATE',
    purpose: 'Close the next finite passive wayfinding/illumination gap on the already-built C01 L1 arrival corridor without changing the walking surface or any interface.',
    ownershipBoundary: 'MP11 C01 public arrival corridor only; disjoint from SYS03 PC-01 public endpoint-plane design and all rail/platform/service interfaces.',
    sourceOnlySiteCells: selectedCells,
    sourceOnlySiteCellSetSha256: hashCells(selectedCells),
    sourceStateCensus: sourceCensus,
    localInteractionHalo: { cellCount: selectedHalo.length, cellSetSha256: hashCells(selectedHalo), blockEntityCount: 0, savedEntityCount: 0, fluidCount: 0, gravityCount: 0, forbiddenBlockCount: 0 },
    supportAndClearance: selected.map(({ site, support, head, upperHead }) => ({ site, support, head, upperHead, nonGravitySupport: true, twoClearHeadCells: true })),
    retainedAsBuiltBoundary: { release: 'C01-NEXT-01', retainedSeaLanternCells: existingInlays.map((x) => point(x, 42, -81)), retainedCellSetSha256: hashCells(existingInlays.map((x) => point(x, 42, -81))) },
    excludedSourceSites: inspected.filter((item) => !item.exactSiteEligible).map((item) => ({ site: item.site, hazardReasons: [...new Set(item.hazards.map((hazard) => hazard.reason))] })),
    finite: true,
    dry: true,
    nonContainer: true,
    independentlyUseful: 'The C01 L1 arrival corridor is the first interior node after the accepted portal-to-L1 stair. These are source-valid additive floor locations beyond the nine accepted inlays; they improve passive orientation/illumination without invoking SYS03 passenger-platform contracts.',
  },
  readiness: {
    staticSourceChecksPass: true,
    physicalReleasePrepared: false,
    missingBeforeAnyPhysicalWork: ['fresh immediately-pre-execution immutable source and fresh live-entity clearance', 'canonical target-state choice with exact source/target/inverse records', 'protected-core and full block-entity audit against that exact operation halo', 'strict-noop forward/rollback parser and exact source preflight', 'journaled execution, fresh post snapshot, rollback post-state preflight, and independent functional QA'],
  },
  nonClaims: ['No target block state is selected.', 'No operation, release manifest, runner, or execution authority is emitted.', 'No C01 route is opened or commissioned.', 'No SYS03 platform, rail, power, passenger service, PC01 public endpoint, or service sleeve is changed or accepted.', 'No live Minecraft, RCON, fleet, capture, or world-mutation call occurred.'],
  disposition: { readOnly: true, operationsEmitted: false, releaseManifestEmitted: false, executionAuthorized: false, liveCallsPerformed: false, worldMutated: false },
};
const report = { ...base, scoutIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-frontier-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-frontier-01-plan.svg'), planSvg);
fs.writeFileSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-frontier-01-section.svg'), sectionSvg);
fs.writeFileSync(path.join(out, 'README.md'), `# SYS03 / MP11 C01 arrival-wayfinding frontier 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only source-bound candidate scout; zero operations and zero mutation authority.\n\n![Plan](sys03-mp11-c01-arrival-wayfinding-frontier-01-plan.svg)\n\n![Section](sys03-mp11-c01-arrival-wayfinding-frontier-01-section.svg)\n\nThe selected finite sites are ${selectedCells.map((cell) => `\`(${cell.x},${cell.y},${cell.z})\``).join(', ')}. Each is presently light-blue concrete over non-gravity support with two clear head cells; its local 3×3×3 interaction cube is dry, non-gravity, non-container, and free of saved entities/block entities in the immutable source. The scout excludes the local gravel-conflict sites rather than treating them as candidates.\n\nThis is not a target-state selection or release package. The retained C01-NEXT-01 inlays are an immutable interface for future work, and SYS03 PC-01 public endpoint/interface design remains wholly outside scope.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), candidateCellCount: selectedCells.length, candidateCells: selectedCells, interactionHaloCellCount: selectedHalo.length, mutationAuthority: false, liveCallsPerformed: false, worldMutated: false }, null, 2));
