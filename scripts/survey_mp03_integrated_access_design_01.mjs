#!/usr/bin/env node
/**
 * MP03 Houston integrated-access design gate map.  This is deliberately
 * read-only: it turns the current B07 source state into an exact coordinate
 * dependency package.  It does not emit operations, perform a capture, call
 * RCON, or authorize any world mutation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const OUT = option('--out', 'data/world-review/mp03-integrated-access-design-20260826T123537Z');
const absolute = (target) => path.resolve(ROOT, target);
const relative = (target) => path.relative(ROOT, absolute(target)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const at = async (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
};

const lobby = [];
for (let x = 2103; x <= 2111; x += 1) {
  for (let z = -431; z <= -425; z += 1) {
    const [floor, feet, head, support] = await Promise.all([at(x, -59, z), at(x, -58, z), at(x, -57, z), at(x, -60, z)]);
    lobby.push({ x, y: -59, z, floor, feet, head, support, twoBlockClear: isAir(feet) && isAir(head) });
  }
}
const headroomFailures = lobby.filter((cell) => !cell.twoBlockClear);
const clearLobby = lobby.filter((cell) => cell.twoBlockClear);

const wetBand = [];
for (let x = 2094; x <= 2114; x += 1) {
  for (let y = 5; y <= 17; y += 1) {
    for (let z = -438; z <= -388; z += 1) {
      const state = await at(x, y, z);
      if (isFluid(state)) wetBand.push({ x, y, z, state });
    }
  }
}
const gravel = [];
for (let y = 27; y <= 30; y += 1) gravel.push({ x: 2104, y, z: -396, state: await at(2104, y, -396), below: await at(2104, y - 1, -396) });
const cap = [];
for (let y = 30; y <= 31; y += 1) cap.push({ x: 2105, y, z: -397, state: await at(2105, y, -397) });
const headhouseCap = [];
for (let x = 2105; x <= 2111; x += 1) {
  for (let z = -401; z <= -395; z += 1) headhouseCap.push({ x, y: 72, z, state: await at(x, 72, z) });
}
const headhouseCapStateCensus = Object.fromEntries([...headhouseCap.reduce((counts, cell) => {
  counts.set(cell.state, (counts.get(cell.state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
// Read the complete visual section before drawing it; never render an
// unobserved source cell as air.
for (let y = -61; y <= 75; y += 1) {
  for (let z = -434; z <= -390; z += 1) await at(2106, y, z);
}
for (let y = -61; y <= 75; y += 1) {
  for (let x = 2098; x <= 2116; x += 1) await at(x, y, -396);
}

const stateClass = (state, x, y, z) => {
  if (isFluid(state)) return 'fluid';
  if (x === 2104 && z === -396 && y >= 27 && y <= 30) return 'gravity';
  if (x === 2105 && z === -397 && y >= 30 && y <= 31) return 'cap';
  if (isAir(state)) return 'air';
  return 'solid';
};
const color = { air: '#f9fafb', solid: '#5b6472', fluid: '#0ea5e9', gravity: '#ca8a04', cap: '#be123c' };

function sectionSvg() {
  const minY = -61; const maxY = 75; const minZ = -434; const maxZ = -390;
  const scale = 11; const left = 104; const top = 76; const width = (maxZ - minZ + 1) * scale; const height = (maxY - minY + 1) * scale;
  const cells = [];
  for (let y = maxY; y >= minY; y -= 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      const state = cache.get(`2106,${y},${z}`);
      const klass = stateClass(state, 2106, y, z);
      const x = left + (z - minZ) * scale; const cy = top + (maxY - y) * scale;
      cells.push(`<rect x="${x}" y="${cy}" width="${scale}" height="${scale}" fill="${color[klass]}" stroke="#e5e7eb" stroke-width=".35"><title>${esc(`(2106,${y},${z}) ${state}`)}</title></rect>`);
    }
  }
  const yLine = (y) => top + (maxY - y) * scale;
  const annotations = [
    ['LOWER LOBBY: 29 / 63 headroom failures', -59, '#991b1b'],
    ['RETAINED R06 FLUID BAND: 1,034 cells (all x/z)', 11, '#075985'],
    ['R09J closed cap at x=2105; adjacent vertical isolation', 30, '#9f1239'],
    ['R07J doorless headhouse / internal R09F seam; no exterior receiver', 72, '#9f1239'],
  ].map(([label, y, fill]) => `<line x1="${left}" x2="${left + width}" y1="${yLine(y)}" y2="${yLine(y)}" stroke="${fill}" stroke-width="2"/><text x="${left + width + 14}" y="${yLine(y) + 4}" font-size="13" fill="${fill}">${label}</text>`).join('');
  const ticks = Array.from({ length: 7 }, (_, index) => {
    const y = 70 - index * 20;
    return `<text x="32" y="${yLine(y) + 4}" font-size="12" fill="#334155">Y ${y}</text><line x1="${left - 6}" x2="${left}" y1="${yLine(y)}" y2="${yLine(y)}" stroke="#334155"/>`;
  }).join('');
  const zTicks = [-434, -426, -418, -410, -402, -394].map((z) => `<text x="${left + (z - minZ) * scale}" y="${top + height + 24}" font-size="12" fill="#334155">${z}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="${top + height + 72}" viewBox="0 0 1320 ${top + height + 72}"><rect width="100%" height="100%" fill="#fff"/><text x="28" y="30" font-size="22" font-family="system-ui, sans-serif" font-weight="700">MP03 Houston access system section — current source at x=2106</text><text x="28" y="52" font-size="13" font-family="system-ui, sans-serif" fill="#475569">Source observation only. It is not an operation drawing. Legend: blue fluid, ochre gravity, red accepted closed cap, gray solid, white air.</text>${cells.join('')}${annotations}${ticks}${zTicks}<g font-family="system-ui, sans-serif"><rect x="${left}" y="${top + height + 38}" width="14" height="14" fill="${color.fluid}"/><text x="${left + 20}" y="${top + height + 50}" font-size="12">fluid</text><rect x="${left + 80}" y="${top + height + 38}" width="14" height="14" fill="${color.gravity}"/><text x="${left + 100}" y="${top + height + 50}" font-size="12">gravity</text><rect x="${left + 180}" y="${top + height + 38}" width="14" height="14" fill="${color.cap}"/><text x="${left + 200}" y="${top + height + 50}" font-size="12">accepted cap</text></g></svg>\n`;
}

function phaseSvg() {
  const boxes = [
    { id: 'A', title: 'T0 — ownership + endpoint contract', range: 'Exact owner/counterparty for all six B07 faces; classified surface landing / independent egress.', fill: '#fee2e2', stroke: '#b91c1c', status: 'BLOCKED: OWN-B07 + exterior counterpart null' },
    { id: 'B', title: 'T1 — bounded hydrology contract', range: 'Complete source-to-future state for every touched fluid/waterlogged cell, finite receiver/freeboard/overflow and inverse.', fill: '#e0f2fe', stroke: '#0369a1', status: 'BLOCKED: component reaches diagnostic boundary' },
    { id: 'C', title: 'T2 — permanent gravity doctrine', range: 'Permanent replacement/migration with rollback never recreating an unsupported falling state.', fill: '#fef3c7', stroke: '#a16207', status: 'BLOCKED: 11 unsupported support chains' },
    { id: 'D', title: 'T3 — one atomic guarded release', range: 'Containment + liner + route + headroom + access boundary + landing + lighting/smoke/power/drainage; no detachable micro-phase.', fill: '#ede9fe', stroke: '#6d28d9', status: 'NOT DESIGNABLE until T0/T1/T2 accepted' },
    { id: 'E', title: 'T4 — functional closeout', range: 'Fresh source and live clearances, strict journaled execution, post snapshot, rollback proof, bidirectional normal-walk / endpoint QA.', fill: '#dcfce7', stroke: '#15803d', status: 'NOT REACHABLE before T3 post-state' },
  ];
  const card = (box, index) => { const x = 70 + index * 245; return `<rect x="${x}" y="108" width="220" height="280" rx="12" fill="${box.fill}" stroke="${box.stroke}" stroke-width="2"/><text x="${x + 14}" y="140" font-size="16" font-weight="700" fill="#0f172a">${esc(box.id)}</text><text x="${x + 14}" y="170" font-size="14" font-weight="700" fill="#0f172a">${esc(box.title)}</text><foreignObject x="${x + 14}" y="188" width="192" height="118"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px system-ui,sans-serif;color:#1e293b;line-height:1.35">${esc(box.range)}</div></foreignObject><line x1="${x + 12}" x2="${x + 208}" y1="320" y2="320" stroke="${box.stroke}"/><foreignObject x="${x + 14}" y="332" width="192" height="44"><div xmlns="http://www.w3.org/1999/xhtml" style="font:11px system-ui,sans-serif;color:${box.stroke};font-weight:700;line-height:1.2">${esc(box.status)}</div></foreignObject>${index < boxes.length - 1 ? `<path d="M ${x + 220} 248 H ${x + 238}" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>` : ''}`; };
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="440" viewBox="0 0 1320 440"><defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><path d="M0,0 L10,3.5 L0,7 z" fill="#334155"/></marker></defs><rect width="100%" height="100%" fill="#fff"/><text x="32" y="36" font-size="22" font-family="system-ui, sans-serif" font-weight="700">MP03 Houston future implementation gate map</text><text x="32" y="60" font-size="13" font-family="system-ui, sans-serif" fill="#475569">A future release may be atomic only. Cards A–C are evidence / authority gates, not physical sub-releases; no card authorizes a world edit here.</text>${boxes.map(card).join('')}</svg>\n`;
}

function gravitySvg() {
  const minY = -61; const maxY = 75; const minX = 2098; const maxX = 2116;
  const scale = 12; const left = 110; const top = 76; const width = (maxX - minX + 1) * scale; const height = (maxY - minY + 1) * scale;
  const cells = [];
  for (let y = maxY; y >= minY; y -= 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const state = cache.get(`${x},${y},-396`); const klass = stateClass(state, x, y, -396);
      const cx = left + (x - minX) * scale; const cy = top + (maxY - y) * scale;
      cells.push(`<rect x="${cx}" y="${cy}" width="${scale}" height="${scale}" fill="${color[klass]}" stroke="#e5e7eb" stroke-width=".35"><title>${esc(`(${x},${y},-396) ${state}`)}</title></rect>`);
    }
  }
  const yLine = (y) => top + (maxY - y) * scale;
  const xPoint = (x) => left + (x - minX) * scale;
  const annotations = [
    ['R06 retained fluid transfer', 11, '#075985'],
    ['Unsupported gravel chain at x=2104', 27, '#a16207'],
    ['R09J cap at x=2105 z=-397 (one block off section)', 30, '#9f1239'],
    ['R07J doorless headhouse deck / R09F seam', 72, '#9f1239'],
  ].map(([label, y, fill]) => `<line x1="${left}" x2="${left + width}" y1="${yLine(y)}" y2="${yLine(y)}" stroke="${fill}" stroke-width="2"/><text x="${left + width + 14}" y="${yLine(y) + 4}" font-size="13" fill="${fill}">${label}</text>`).join('');
  const ticks = Array.from({ length: 7 }, (_, index) => { const y = 70 - index * 20; return `<text x="34" y="${yLine(y) + 4}" font-size="12" fill="#334155">Y ${y}</text>`; }).join('');
  const xTicks = [2098, 2102, 2104, 2106, 2110, 2114].map((x) => `<text x="${xPoint(x)}" y="${top + height + 24}" font-size="12" fill="#334155">${x}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="${top + height + 72}" viewBox="0 0 1320 ${top + height + 72}"><rect width="100%" height="100%" fill="#fff"/><text x="28" y="30" font-size="22" font-family="system-ui, sans-serif" font-weight="700">MP03 Houston gravity / isolation section — current source at z=-396</text><text x="28" y="52" font-size="13" font-family="system-ui, sans-serif" fill="#475569">Source observation only. The cap is one block north of this section and is annotated, not drawn as an in-section state.</text>${cells.join('')}${annotations}${ticks}${xTicks}<line x1="${xPoint(2104) + 6}" x2="${xPoint(2104) + 6}" y1="${yLine(31)}" y2="${yLine(26)}" stroke="#a16207" stroke-width="3" stroke-dasharray="5 4"/><text x="${xPoint(2104) + 10}" y="${yLine(25)}" font-size="12" fill="#92400e">air below gravel</text></svg>\n`;
}

function lobbySvg() {
  const scale = 58; const left = 150; const top = 98; const width = 9 * scale; const height = 7 * scale;
  const cells = lobby.map((cell) => {
    const fill = cell.twoBlockClear ? '#dcfce7' : '#fee2e2'; const stroke = cell.twoBlockClear ? '#15803d' : '#b91c1c';
    const cx = left + (cell.x - 2103) * scale; const cy = top + (-425 - cell.z) * scale;
    const label = cell.twoBlockClear ? 'clear' : `blocked: feet=${cell.feet}; head=${cell.head}`;
    return `<rect x="${cx}" y="${cy}" width="${scale}" height="${scale}" fill="${fill}" stroke="${stroke}" stroke-width="2"><title>${esc(`(${cell.x},-59,${cell.z}) ${label}`)}</title></rect><text x="${cx + 6}" y="${cy + 24}" font-size="11" fill="#0f172a">${cell.x},${cell.z}</text><text x="${cx + 18}" y="${cy + 45}" font-size="20" font-weight="700" fill="${stroke}">${cell.twoBlockClear ? '✓' : '×'}</text>`;
  }).join('');
  const xTicks = Array.from({ length: 9 }, (_, index) => `<text x="${left + index * scale + 16}" y="${top + height + 28}" font-size="13" fill="#334155">${2103 + index}</text>`).join('');
  const zTicks = Array.from({ length: 7 }, (_, index) => `<text x="${left - 54}" y="${top + index * scale + 34}" font-size="13" fill="#334155">${-425 - index}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="860" height="590" viewBox="0 0 860 590"><rect width="100%" height="100%" fill="#fff"/><text x="28" y="30" font-size="22" font-family="system-ui, sans-serif" font-weight="700">MP03 lower lobby headroom matrix — y=-59 floor stations</text><text x="28" y="52" font-size="13" font-family="system-ui, sans-serif" fill="#475569">Green: two air blocks above. Red: obstructed feet/head volume. Current source; no corrective target inferred.</text>${cells}${xTicks}${zTicks}<rect x="150" y="540" width="16" height="16" fill="#dcfce7" stroke="#15803d"/><text x="172" y="553" font-size="13">34 clear stations</text><rect x="320" y="540" width="16" height="16" fill="#fee2e2" stroke="#b91c1c"/><text x="342" y="553" font-size="13">29 headroom failures</text></svg>\n`;
}

const result = {
  schemaVersion: 1,
  id: 'MP03-HOUSTON-INTEGRATED-ACCESS-DESIGN-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'FUTURE_ATOMIC_TRANSACTION_IDENTIFIED_BUT_NOT_DESIGNABLE_FROM_CURRENT_SOURCE',
  source: {
    snapshot: relative(SNAPSHOT),
    completeSaveRequiredAgainBeforeExecution: true,
    basis: 'The source is a design reference only. Any proposed transaction must be re-derived from a fresh immediately-pre-execution complete immutable snapshot.',
  },
  observedSystem: {
    lowerLobby: { bounds: { minX: 2103, maxX: 2111, minY: -59, maxY: -57, minZ: -431, maxZ: -425 }, floorStations: lobby.length, twoBlockClear: clearLobby.length, headroomFailures: headroomFailures.length, headroomFailureCoordinateSetSha256: sha(JSON.stringify(headroomFailures.map(({ x, y, z }) => ({ x, y, z })))) },
    retainedFluidBarrier: { bounds: { minX: 2094, maxX: 2114, minY: 5, maxY: 17, minZ: -438, maxZ: -388 }, fluidCells: wetBand.length, coordinateSetSha256: sha(JSON.stringify(wetBand.map(({ x, y, z }) => ({ x, y, z })))) },
    gravityBoundary: { cells: gravel, unsupportedBase: gravel[0].below, doctrine: 'SOURCE_GRAVITY_CHAIN_MUST_BE_RETAINED_OUTSIDE_ANY_CHANGED_FALL_BOUNDARY_OR_REPLACED_BY_PERMANENT_SAFE_INVERSE' },
    protectedBoundaries: {
      r09jCap: cap,
      r07jDoorlessHeadhouseDeck: {
        bounds: { minX: 2105, maxX: 2111, y: 72, minZ: -401, maxZ: -395 },
        cells: headhouseCap.length,
        stateCensus: headhouseCapStateCensus,
        acceptedR09FInternalSeam: {
          states: {
            polishedDiorite: 44,
            bottomSlab: 1,
            air: 4,
          },
          disposition: 'The five non-diorite cells are the retained R09F interior seam; the R07J headhouse remains doorless and exterior-closed.',
        },
      },
    },
  },
  ownershipAndInterfaces: {
    transactionOwner: 'MP05 B07 integrated system; MP03 is functional-programme consumer only',
    currentAuthority: 'NONE_ACCEPTED',
    exactBoundaryPairsRequiringCounterpartContract: { negativeX: 1134, positiveX: 1134, negativeY: 287, positiveY: 287, negativeZ: 952, positiveZ: 952 },
    protectedExistingAssets: ['R07J 49-cell cap and 121-cell doorless headhouse', 'R09J two-cell gravity isolation cap', 'retained R06 water/bubble containment'],
  },
  atomicFutureTransaction: {
    name: 'MP05-B07-INTEGRATED-CONTAINMENT-GRAVITY-ACCESS-01',
    releaseShape: 'ONE_ATOMIC_GUARDED_TRANSACTION_ONLY',
    requiredScopes: ['finite hydrology treatment/receiver/overflow/failure contract', 'permanent gravity migration/replacement doctrine', 'dry structural liner and normal-walk route', 'lower lobby headroom remediation where route depends on it', 'surface doorway/landing/normal-walk descent/independent egress', 'access-control, lighting, smoke, power, drainage/failure interfaces'],
    prohibitedFragmentReleases: ['fluid-only', 'receiver-only', 'temporary gravity support', 'cap/door-only', 'lobby floor/wayfinding-only', 'headhouse opening without classified exterior receiver'],
    currentDesignability: false,
    reason: 'The exact future block-state set, counterpart owners, finite receiver/overflow state, and rollback-safe gravity doctrine are unknown. Emitting a forward/rollback package would fabricate required design inputs.',
  },
  gates: [
    { id: 'T0_OWNERSHIP_ENDPOINT', kind: 'authority/design', pass: false, evidence: 'OWN-B07 and exterior receiver counterpart are unaccepted; exterior landing/descent is unclassified.', unlocks: 'A candidate scope boundary only; not an operation.' },
    { id: 'T1_HYDROLOGY_FINITE_TREATMENT', kind: 'hydraulic design', pass: false, evidence: 'The contacted component reaches the finite diagnostic boundary; no finite receiver/freeboard/overflow/inverse exists.', unlocks: 'Exact source-to-future wet-cell treatment.' },
    { id: 'T2_GRAVITY_PERMANENT_INVERSE', kind: 'structural/rollback design', pass: false, evidence: 'The source includes unsupported gravel at (2104,27..30,-396); temporary support cannot preserve a safe rollback.', unlocks: 'Exact permanent migration/replacement cell set.' },
    { id: 'T3_ATOMIC_COMPILER_AND_PRE_RELEASE_KERNEL', kind: 'implementation', pass: false, evidence: 'Cannot compile absent T0–T2.', unlocks: 'Only the single integrated guarded physical transaction.' },
    { id: 'T4_POSTSTATE_FUNCTIONAL_CLOSEOUT', kind: 'verification', pass: false, evidence: 'No T3 transaction exists.', unlocks: 'Bidirectional normal-walk, exterior endpoint and rollback-poststate evidence.' },
  ],
  decision: {
    exactPhasedSafeTransactionDesignableNow: false,
    phaseabilityConclusion: 'The only physical phase is the eventual atomic T3 transaction. T0–T2 are required evidence/authority design gates, not build phases.',
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  maps: ['mp03-access-system-section-x2106.svg', 'mp03-gravity-isolation-section-z396.svg', 'mp03-lower-lobby-headroom-matrix.svg', 'mp03-future-implementation-gates.svg'],
};
result.identitySha256 = sha(`${JSON.stringify(result, null, 2)}\n`);

fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(absolute(path.join(OUT, 'mp03-integrated-access-design.json')), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(absolute(path.join(OUT, 'mp03-access-system-section-x2106.svg')), sectionSvg());
fs.writeFileSync(absolute(path.join(OUT, 'mp03-gravity-isolation-section-z396.svg')), gravitySvg());
fs.writeFileSync(absolute(path.join(OUT, 'mp03-lower-lobby-headroom-matrix.svg')), lobbySvg());
fs.writeFileSync(absolute(path.join(OUT, 'mp03-future-implementation-gates.svg')), phaseSvg());
console.log(JSON.stringify({ status: result.status, out: relative(OUT), fluidCells: wetBand.length, lowerLobbyHeadroomFailures: headroomFailures.length, gatesPassing: result.gates.filter((gate) => gate.pass).length, gatesTotal: result.gates.length, identitySha256: result.identitySha256 }, null, 2));
