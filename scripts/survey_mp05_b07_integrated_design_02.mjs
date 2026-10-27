#!/usr/bin/env node
/**
 * Read-only, source-bound design audit for the unbuilt MP05 B07 through route.
 *
 * This intentionally audits the actual B07-C-WEST-2 reservation (rather than
 * the earlier centred sample) and emits decision maps only.  It cannot emit an
 * operation: the result is used to decide whether a complete, reversible
 * functional package can be compiled from a fresh source later.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b07-integrated-design-02-20260826T123537Z');
const MARKDOWN_OUT = value('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-INTEGRATED-DESIGN-02-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T12:45:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).replaceAll(path.sep, '/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const stateName = (state) => state.split('[')[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => stateName(state) === 'minecraft:water' || stateName(state) === 'minecraft:lava'
  || state.includes('waterlogged=true') || stateName(state) === 'minecraft:bubble_column';
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(stateName(state))
  || stateName(state).endsWith('_concrete_powder');
const manifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const counts = (records) => Object.fromEntries([...records.reduce((result, { state }) => {
  result.set(state, (result.get(state) ?? 0) + 1);
  return result;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const cellSort = (a, b) => a.y - b.y || a.z - b.z || a.x - b.x;
const connectedComponents = (cells) => {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const result = [];
  while (byKey.size) {
    const [firstKey, first] = byKey.entries().next().value;
    byKey.delete(firstKey);
    const component = [first];
    for (let index = 0; index < component.length; index += 1) {
      const current = component[index];
      for (const adjacent of [
        { x: current.x - 1, y: current.y, z: current.z }, { x: current.x + 1, y: current.y, z: current.z },
        { x: current.x, y: current.y - 1, z: current.z }, { x: current.x, y: current.y + 1, z: current.z },
        { x: current.x, y: current.y, z: current.z - 1 }, { x: current.x, y: current.y, z: current.z + 1 },
      ]) {
        const adjacentKey = cellKey(adjacent);
        if (byKey.has(adjacentKey)) {
          component.push(byKey.get(adjacentKey));
          byKey.delete(adjacentKey);
        }
      }
    }
    result.push(component.sort(cellSort));
  }
  return result.sort((a, b) => b.length - a.length || cellKey(a[0]).localeCompare(cellKey(b[0])));
};
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  invariant(fs.existsSync(abs(path.join(SNAPSHOT, member))), `Missing immutable snapshot member: ${member}`);
}
const mechanismsPath = 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json';
const lifeSafetyPath = 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json';
const currentStatePath = 'docs/masterplans/05-combined-zones/CURRENT-STATE.md';
const mechanisms = readJson(mechanismsPath);
const lifeSafety = readJson(lifeSafetyPath);
const capture = readJson(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const b07System = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;
const b07 = deriveB07WestTwo(b07System);
const candidate = lifeSafety.b07PublicShaftTransfer.candidates.find(({ id }) => id === 'B07-C-WEST-2');
invariant(candidate, 'B07-C-WEST-2 design record is missing');
invariant(b07.construction.length === 8134 && b07.interaction.length === 13608, 'Canonical B07 cell count drift');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const stateStringAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const readRecords = async (cells) => {
  const records = [];
  for (const cell of cells) records.push({ cell, state: await stateStringAt(cell) });
  return records;
};

const constructionRecords = await readRecords(b07.construction);
const interactionRecords = await readRecords(b07.interaction);
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const constructionFluid = constructionRecords.filter(({ state }) => isFluid(state));
const interactionFluid = interactionRecords.filter(({ state }) => isFluid(state));
const constructionGravity = constructionRecords.filter(({ state }) => isGravity(state));
// The inherited R09J gravel lies in the B07 interaction halo rather than the
// west-two construction core.  It is still route-critical: opening the cap
// without resolving it would make the resulting continuous route unsafe.
const gravity = interactionRecords.filter(({ state }) => isGravity(state));
const gravitySupports = [];
for (const record of gravity) {
  const below = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  gravitySupports.push({ ...record, below: { cell: below, state: await stateStringAt(below) }, unsupported: isAir(await stateStringAt(below)) });
}
const fluidComponents = connectedComponents(constructionFluid.map(({ cell }) => cell)).map((cells, index) => ({
  id: `B07-FLUID-${String(index + 1).padStart(2, '0')}`,
  ...manifest(cells),
  sampleCells: cells.slice(0, 24),
}));

const interactionBounds = boundsOf(b07.interaction);
const blockEntities = [];
const savedEntities = [];
const chunks = new Set(b07.interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
for (const key of chunks) {
  const [chunkX, chunkZ] = key.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (point.x >= interactionBounds.minX && point.x <= interactionBounds.maxX && point.y >= interactionBounds.minY && point.y <= interactionBounds.maxY && point.z >= interactionBounds.minZ && point.z <= interactionBounds.maxZ) blockEntities.push({ id: entity.id ?? null, point });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= interactionBounds.minX && position[0] < interactionBounds.maxX + 1 && position[1] >= interactionBounds.minY && position[1] < interactionBounds.maxY + 1 && position[2] >= interactionBounds.minZ && position[2] < interactionBounds.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position });
  }
}

const colourFor = (state, inConstruction) => {
  if (isFluid(state)) return '#2196f3';
  if (isGravity(state)) return '#e2b061';
  if (isAir(state)) return inConstruction ? '#f7f9fb' : '#dce7ee';
  if (stateName(state).includes('polished_diorite')) return '#a9bcc3';
  if (stateName(state).includes('polished_andesite')) return '#7d8587';
  if (stateName(state).includes('deepslate')) return '#3f4b57';
  return '#6f7277';
};
const writeSliceSvg = async ({ filename, title, axes, fixed, xValues, yValues, cellFor }) => {
  const unit = 20;
  const left = 72;
  const top = 46;
  const legendX = left + xValues.length * unit + 16;
  const width = legendX + 180;
  const height = top + yValues.length * unit + 32;
  const rects = [];
  for (let row = 0; row < yValues.length; row += 1) {
    for (let col = 0; col < xValues.length; col += 1) {
      const cell = cellFor(xValues[col], yValues[row]);
      const state = await stateStringAt(cell);
      const inside = constructionKeys.has(cellKey(cell));
      const interaction = interactionKeys.has(cellKey(cell));
      const stroke = inside ? '#2e4057' : interaction ? '#91a7b4' : '#d7dde2';
      rects.push(`<rect x="${left + col * unit}" y="${top + row * unit}" width="${unit}" height="${unit}" fill="${colourFor(state, inside)}" stroke="${stroke}" stroke-width="0.5"><title>${escapeXml(`${cell.x},${cell.y},${cell.z}: ${state}; ${inside ? 'construction reservation' : interaction ? 'interaction halo' : 'outside reservation'}`)}</title></rect>`);
    }
  }
  const labels = xValues.map((entry, index) => (index % 2 === 0 ? `<text x="${left + index * unit + 1}" y="${top - 8}" font-size="7">${entry}</text>` : '')).join('')
    + yValues.map((entry, index) => (index % 2 === 0 ? `<text x="${left - 32}" y="${top + index * unit + 12}" font-size="7">${entry}</text>` : '')).join('');
  const legend = [
    ['#f7f9fb', 'air inside B07 construction'], ['#dce7ee', 'air in one-cell halo'], ['#2196f3', 'water/waterlogged'],
    ['#e2b061', 'gravity block'], ['#3f4b57', 'deepslate'], ['#6f7277', 'other solid'],
  ].map(([colour, label], index) => `<rect x="${legendX}" y="${top + index * 22}" width="12" height="12" fill="${colour}" stroke="#444"/><text x="${legendX + 18}" y="${top + 10 + index * 22}" font-size="9">${label}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:ui-monospace,monospace;fill:#1f2933}.title{font-size:15px;font-weight:700}.axis{font-size:9px;font-weight:700}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">${escapeXml(title)}</text><text class="axis" x="${left}" y="34">${escapeXml(`${axes.horizontal} →; ${axes.vertical} ↓; ${fixed}`)}</text>${rects.join('')}${labels}${legend}</svg>`;
  fs.writeFileSync(abs(path.join(OUT_DIR, filename)), svg);
};

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
await writeSliceSvg({
  filename: 'b07-transfer-y8.svg', title: 'MP05 B07 west-two transfer plane, y=8', axes: { horizontal: 'x', vertical: 'z' }, fixed: 'current source',
  xValues: Array.from({ length: 11 }, (_, i) => 2102 + i), yValues: Array.from({ length: 39 }, (_, i) => -432 + i),
  cellFor: (x, z) => ({ x, y: 8, z }),
});
await writeSliceSvg({
  filename: 'b07-wet-interface-y5.svg', title: 'MP05 B07 wet-interface plane, y=5', axes: { horizontal: 'x', vertical: 'z' }, fixed: 'current source',
  xValues: Array.from({ length: 11 }, (_, i) => 2102 + i), yValues: Array.from({ length: 15 }, (_, i) => -408 + i),
  cellFor: (x, z) => ({ x, y: 5, z }),
});
await writeSliceSvg({
  filename: 'b07-west-two-longitudinal-x2106.svg', title: 'MP05 B07 west-two longitudinal section, x=2106', axes: { horizontal: 'z', vertical: 'y' }, fixed: 'current source',
  xValues: Array.from({ length: 39 }, (_, i) => -432 + i), yValues: Array.from({ length: 45 }, (_, i) => 76 - i * 3),
  cellFor: (z, y) => ({ x: 2106, y, z }),
});
await writeSliceSvg({
  filename: 'b07-gravity-section-z396.svg', title: 'MP05 B07 inherited gravity section, z=-396', axes: { horizontal: 'x', vertical: 'y' }, fixed: 'current source',
  xValues: Array.from({ length: 11 }, (_, i) => 2102 + i), yValues: Array.from({ length: 31 }, (_, i) => 38 - i),
  cellFor: (x, y) => ({ x, y, z: -396 }),
});
await writeSliceSvg({
  filename: 'b07-surface-headhouse-y73.svg', title: 'MP05 B07 headhouse / surface receiver plane, y=73', axes: { horizontal: 'x', vertical: 'z' }, fixed: 'current source',
  xValues: Array.from({ length: 15 }, (_, i) => 2101 + i), yValues: Array.from({ length: 15 }, (_, i) => -405 + i),
  cellFor: (x, z) => ({ x, y: 73, z }),
});

const phaseGate = (id, objective, requires) => ({ id, objective, requires, releaseableAlone: false, disposition: 'DESIGN_GATE_ONLY_NO_OPERATION' });
const report = {
  schemaVersion: 2,
  id: 'MP05-B07-INTEGRATED-DESIGN-02',
  generatedAtUtc: GENERATED_AT,
  status: 'INTEGRATED_FUNCTIONAL_DESIGN_HELD_NO_SAFE_INDEPENDENT_PHASE',
  purpose: 'A current-source feasibility package for the full B07 lower-lobby-to-surface route. It audits the actual B07-C-WEST-2 reservation and separates design gates from executable authority.',
  source: {
    snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureIdentity: capture.id, completeMembers: { region: true, entities: true, poi: true, levelDat: true },
  },
  bindings: {
    mechanisms: { path: mechanismsPath, sha256: sha256(fs.readFileSync(abs(mechanismsPath))) },
    lifeSafety: { path: lifeSafetyPath, sha256: sha256(fs.readFileSync(abs(lifeSafetyPath))) },
    currentState: { path: currentStatePath, sha256: sha256(fs.readFileSync(abs(currentStatePath))) },
  },
  candidate: { id: candidate.id, anchors: candidate.anchors, centerline: candidate.centerline, construction: manifest(b07.construction), interaction: manifest(b07.interaction) },
  sourceInventory: {
    constructionStateCensus: counts(constructionRecords), interactionStateCensus: counts(interactionRecords),
    constructionFluid: { ...manifest(constructionFluid.map(({ cell }) => cell)), stateCensus: counts(constructionFluid), components: fluidComponents },
    interactionFluid: { ...manifest(interactionFluid.map(({ cell }) => cell)), stateCensus: counts(interactionFluid) },
    constructionGravity: { ...manifest(constructionGravity.map(({ cell }) => cell)), stateCensus: counts(constructionGravity) },
    interactionGravity: { ...manifest(gravity.map(({ cell }) => cell)), records: gravitySupports, unsupportedCount: gravitySupports.filter(({ unsupported }) => unsupported).length },
    immutableBlockEntities: blockEntities, immutableSavedEntities: savedEntities,
  },
  ownershipAndEndpointFindings: [
    { id: 'B07-OWNERSHIP', status: 'NO_CONSTRUCTION_OWNERSHIP_GRANTED', evidence: 'The B07-C-WEST-2 source candidate explicitly sets constructionOwnership=false and physicalOpeningAuthorized=false.' },
    { id: 'B07-LOWER-ENDPOINT', status: 'EXISTING_LOBBY_TO_RETAINED_CLOSED_LOWER_HOLD', evidence: 'R09A-R09D created a bounded lower component; it is not the west-two route release.' },
    { id: 'B07-UPPER-ENDPOINT', status: 'EXISTING_INSPECTION_TO_DOORLESS_HEADHOUSE_HOLD', evidence: 'R09J/R09K remains an isolated 91-surface inspection component with a retained gravity cap.' },
    { id: 'B07-EXTERIOR-ENDPOINT', status: 'UNCLASSIFIED_UNOWNED_RECEIVER', evidence: 'The R07J headhouse shell is present, but no outward face, landing, surface path, access-control or failure-state endpoint is accepted.' },
  ],
  requiredIntegratedDesign: {
    dryContainmentFamily: 'A permanent dry liner/receiver/drainage system across the west-two transfer; it must prescribe every source fluid/waterlogged cell, containment material, receiver, overflow/failure state, and exact inverse before excavation.',
    gravityFamily: 'A permanent gravity migration/replacement design at each gravity cell whose inverse never recreates unsupported falling state. Temporary supports are excluded.',
    routeFamily: 'One continuous normal-walk route with structural lining, headroom, lighting, access boundary, smoke/power/drainage state, and lower plus surface endpoints.',
    egressBoundary: 'The route is not public or emergency egress until a separately accepted independent-egress and exterior receiver design passes its own functional checks.',
  },
  designSequence: [
    phaseGate('B07-01-SOURCE-TO-FUTURE-FLUID-CONTRACT', 'Bind every construction and interaction fluid/waterlogged state to a permanent, owned future state and receiver/displacement/failure contract.', ['current complete source', 'D05 owner acceptance', 'exact fluid receiver']),
    phaseGate('B07-02-PERMANENT-GRAVITY-MIGRATION', 'Bind each gravity cell to permanent support or replacement and prove its rollback does not recreate a falling source.', ['B07-01', 'source-to-future gravity doctrine']),
    phaseGate('B07-03-SURFACE-RECEIVER-AND-BOUNDARY', 'Choose an owned headhouse face, classified landing, route, access-control and failure state.', ['current terrain/entity survey', 'P1-B07 surface authority', 'independent egress design']),
    phaseGate('B07-04-INTEGRATED-COMPILER', 'Compile the containment, structural, route and endpoint systems as one exact forward/rollback transaction.', ['B07-01', 'B07-02', 'B07-03', 'canonical block states and interface contracts']),
    phaseGate('B07-05-GUARDED-RELEASE-AND-NORMAL-WALK-QA', 'Run the scoped hard-safety kernel and demonstrate bidirectional normal traversal and all endpoint/failure checks.', ['fresh live entity clearance', 'strict source/projected/post rollback preflights', 'post snapshot']),
  ],
  noSafeIndependentPhysicalPhase: [
    'A wet-interface-only release changes an uncontracted fluid state and has no accepted receiver/inverse.',
    'A gravity-support-only release leaves a final rollback that can recreate unsupported falling source state.',
    'An exterior-door-only release opens an unclassified receiver and cannot prove a route or egress.',
    'A cap-removal-only release reconnects a route before containment, gravity, endpoints, and failure states are accepted.',
  ],
  maps: [
    'b07-transfer-y8.svg', 'b07-wet-interface-y5.svg', 'b07-west-two-longitudinal-x2106.svg',
    'b07-gravity-section-z396.svg', 'b07-surface-headhouse-y73.svg',
  ].map((filename) => ({
    path: `${rel(OUT_DIR)}/${filename}`,
    sha256: sha256(fs.readFileSync(abs(path.join(OUT_DIR, filename)))),
  })),
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'integrated-design-findings.json')), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# MP05 B07 integrated through-route design 02

**Status:** \`${report.status}\`  
**Current immutable source:** \`${report.source.snapshotRoot}\` (capture \`${report.source.captureId}\`)  
**Machine findings:** [JSON](../../../${rel(path.join(OUT_DIR, 'integrated-design-findings.json'))})

This is a read-only feasibility and design package for the complete B07 lower-lobby-to-surface function. It uses the actual **B07-C-WEST-2** reservation, not the older centred sample. It produced no RCON call, operation file, or world mutation.

## Current decision maps

- [West-two transfer plane, y=8](../../../${rel(path.join(OUT_DIR, 'b07-transfer-y8.svg'))})
- [Wet-interface plane, y=5](../../../${rel(path.join(OUT_DIR, 'b07-wet-interface-y5.svg'))})
- [West-two longitudinal section, x=2106](../../../${rel(path.join(OUT_DIR, 'b07-west-two-longitudinal-x2106.svg'))})
- [Inherited gravity section, z=-396](../../../${rel(path.join(OUT_DIR, 'b07-gravity-section-z396.svg'))})
- [Headhouse / prospective surface-receiver plane, y=73](../../../${rel(path.join(OUT_DIR, 'b07-surface-headhouse-y73.svg'))})

Rendered inspection copies: [transfer PNG](../../../${rel(path.join(OUT_DIR, 'b07-transfer-y8.png'))}) · [wet-interface PNG](../../../${rel(path.join(OUT_DIR, 'b07-wet-interface-y5.png'))}) · [longitudinal PNG](../../../${rel(path.join(OUT_DIR, 'b07-west-two-longitudinal-x2106.png'))}) · [gravity PNG](../../../${rel(path.join(OUT_DIR, 'b07-gravity-section-z396.png'))}) · [surface PNG](../../../${rel(path.join(OUT_DIR, 'b07-surface-headhouse-y73.png'))})

Dark outlines mark the 8,134-cell construction reservation; lighter outlines are the 13,608-cell interaction halo. Blue is fluid/waterlogged state and ochre marks gravity material. Maps are exact source-state evidence, not construction drawings.

## Source-bound findings

| Interface | Current source result | Design consequence |
|---|---|---|
| West-two reservation | ${report.candidate.construction.cellCount} construction cells; ${report.candidate.interaction.cellCount} interaction cells | It is a reviewed geometry reservation, not construction authority. |
| Fluids | ${report.sourceInventory.constructionFluid.cellCount} construction and ${report.sourceInventory.interactionFluid.cellCount} interaction fluid/waterlogged cells in ${report.sourceInventory.constructionFluid.components.length} construction components | No dry excavation or opening can be compiled without exact source-to-future disposition and an owned receiver/failure state. |
| Gravity | ${report.sourceInventory.interactionGravity.cellCount} gravity cells in the B07 interaction halo; ${report.sourceInventory.interactionGravity.unsupportedCount} currently air-supported-below | Temporary support is not an inverse; permanent migration/replacement must be designed before any route connection. |
| Existing endpoints | Lower component and upper inspection component both end at retained holds | Neither proves a continuous through-route. |
| Surface | Headhouse exists but exterior receiver is unclassified/unowned | A door/opening alone is rejected. |

## Integrated design that can become buildable

The viable family is a **single permanent dry-containment/route/receiver system**: source-to-future fluid treatment and an owned receiver; a permanent gravity replacement that remains safe on rollback; structural liner and normal-walk geometry; and an owned surface landing, access boundary, lighting, smoke/power and drainage/failure state. It is deliberately not divided into “easy” small releases because none is reversible or functional alone.

The design sequence is: fluid contract → gravity migration doctrine → surface receiver/boundary → integrated compiler → full guarded release kernel and bidirectional normal-walk/end-point QA. Each is a design gate, not a physical release.

## Exact blockers before a compiler may emit an operation

- P1-B07 construction and exterior-receiver authority, including owned boundary and access/failure state.
- Exact source-to-future treatment for every fluid/waterlogged cell, a receiver/displacement contract, dry liner and drainage/overflow state.
- A permanent gravity migration/replacement doctrine whose rollback never recreates unsupported falling gravel/sand.
- Exact structural, lighting, smoke, power, drainage and normal-walk endpoint contracts, including independent-egress disposition.
- A newly captured complete source and the standard source/projection/post-state guarded-release kernel immediately before any mutation.

## Release disposition

No forward or rollback operation exists. The B07 through-route and egress are **not built or commissioned**; current bounded R09 components remain as-built only within their retained holds.
`;
fs.mkdirSync(path.dirname(abs(MARKDOWN_OUT)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN_OUT), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'integrated-design-findings.json')), markdown: rel(MARKDOWN_OUT), maps: report.maps.map(({ path: mapPath }) => mapPath), fluidCells: report.sourceInventory.constructionFluid.cellCount, gravityCells: report.sourceInventory.interactionGravity.cellCount, unsupportedGravityCells: report.sourceInventory.interactionGravity.unsupportedCount, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
