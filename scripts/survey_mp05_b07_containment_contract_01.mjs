#!/usr/bin/env node
/**
 * Read-only source-bound feasibility package for MP05 B07 containment,
 * receiver/displacement, and gravity migration.  This is deliberately not a
 * compiler: it emits diagnostic envelopes, maps, and unresolved contracts;
 * it never creates guarded operations or contacts the live world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
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
const OUT = value('--out-dir', 'data/world-review/mp05-b07-containment-contract-01-20260826T123537Z');
const MARKDOWN = value('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-CONTAINMENT-CONTRACT-01-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T13:15:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).replaceAll(path.sep, '/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const stateName = (state) => state.split('[')[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const keySort = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;
const neighbours = ({ x, y, z }) => [
  { x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z },
  { x, y: y + 1, z }, { x, y, z: z - 1 }, { x, y, z: z + 1 },
];
const manifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const stateCounts = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const inside = (point, bounds) => point.x >= bounds.minX && point.x <= bounds.maxX
  && point.y >= bounds.minY && point.y <= bounds.maxY && point.z >= bounds.minZ && point.z <= bounds.maxZ;
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  invariant(fs.existsSync(abs(path.join(SNAPSHOT, member))), `Missing complete immutable snapshot member: ${member}`);
}
const capture = readJson(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const mechanismsPath = 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json';
const mechanisms = readJson(mechanismsPath);
const b07System = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;
const b07 = deriveB07WestTwo(b07System);
invariant(b07.construction.length === 8134 && b07.interaction.length === 13608, 'B07 canonical geometry drift');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const stateCache = new Map();
const stateAt = async (point) => {
  const key = cellKey(point);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return stateCache.get(key);
};

// A finite, explicit diagnostic envelope.  A component touching its boundary
// is reported as unbounded by this survey, never clipped into a receiver.
const interactionBounds = boundsOf(b07.interaction);
const diagnosticBounds = {
  minX: interactionBounds.minX - 16, maxX: interactionBounds.maxX + 16,
  minY: -64, maxY: 319,
  minZ: interactionBounds.minZ - 16, maxZ: interactionBounds.maxZ + 16,
};
const constructionFluidRecords = [];
const interactionFluidRecords = [];
const gravityRecords = [];
for (const cell of b07.interaction) {
  const state = await stateAt(cell);
  const record = { cell, state };
  if (isFluid(state)) {
    interactionFluidRecords.push(record);
    if (constructionKeys.has(cellKey(cell))) constructionFluidRecords.push(record);
  }
  if (isGravity(state)) gravityRecords.push(record);
}

const fluidSeeds = interactionFluidRecords.map(({ cell }) => cell);
const unseenSeeds = new Set(fluidSeeds.map(cellKey));
const fluidComponents = [];
while (unseenSeeds.size) {
  const firstKey = unseenSeeds.values().next().value;
  const [x, y, z] = firstKey.split(',').map(Number);
  const queue = [{ x, y, z }];
  const seen = new Map([[firstKey, queue[0]]]);
  unseenSeeds.delete(firstKey);
  let touchesDiagnosticBoundary = false;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.x === diagnosticBounds.minX || current.x === diagnosticBounds.maxX
      || current.y === diagnosticBounds.minY || current.y === diagnosticBounds.maxY
      || current.z === diagnosticBounds.minZ || current.z === diagnosticBounds.maxZ) touchesDiagnosticBoundary = true;
    for (const adjacent of neighbours(current)) {
      if (!inside(adjacent, diagnosticBounds)) continue;
      const adjacentKey = cellKey(adjacent);
      if (seen.has(adjacentKey) || !isFluid(await stateAt(adjacent))) continue;
      seen.set(adjacentKey, adjacent);
      queue.push(adjacent);
      unseenSeeds.delete(adjacentKey);
    }
  }
  const cells = [...seen.values()].sort(keySort);
  const sourceContact = cells.filter((cell) => interactionKeys.has(cellKey(cell)));
  const constructionContact = cells.filter((cell) => constructionKeys.has(cellKey(cell)));
  const outwardFaces = [];
  for (const cell of sourceContact) {
    for (const adjacent of neighbours(cell)) {
      if (isFluid(await stateAt(adjacent))) continue;
      outwardFaces.push({ fromFluid: cell, toNonFluid: adjacent, toState: await stateAt(adjacent), toConstruction: constructionKeys.has(cellKey(adjacent)), toInteraction: interactionKeys.has(cellKey(adjacent)) });
    }
  }
  fluidComponents.push({
    id: `B07-FLUID-TOPOLOGY-${String(fluidComponents.length + 1).padStart(2, '0')}`,
    diagnosticComponent: manifest(cells),
    sourceContact: manifest(sourceContact),
    constructionContact: manifest(constructionContact),
    stateCensus: stateCounts(cells.map((cell) => ({ state: stateCache.get(cellKey(cell)) }))),
    touchesDiagnosticBoundary,
    topologyDisposition: touchesDiagnosticBoundary ? 'DIAGNOSTIC_COMPONENT_EXTENDS_TO_FINITE_SURVEY_BOUNDARY_NOT_A_RECEIVER' : 'FINITE_CURRENT_COMPONENT_WITHIN_DIAGNOSTIC_ENVELOPE_ONLY',
    sourceFacingContainmentFaces: outwardFaces.sort((a, b) => cellKey(a.fromFluid).localeCompare(cellKey(b.fromFluid)) || cellKey(a.toNonFluid).localeCompare(cellKey(b.toNonFluid))),
  });
}
fluidComponents.sort((a, b) => b.sourceContact.cellCount - a.sourceContact.cellCount || a.id.localeCompare(b.id));

const gravityChains = [];
for (const { cell, state } of gravityRecords.sort((a, b) => keySort(a.cell, b.cell))) {
  const airChain = [];
  let cursor = { x: cell.x, y: cell.y - 1, z: cell.z };
  while (cursor.y >= -64 && isAir(await stateAt(cursor))) {
    airChain.push({ ...cursor });
    cursor = { x: cursor.x, y: cursor.y - 1, z: cursor.z };
  }
  const terminalState = cursor.y >= -64 ? await stateAt(cursor) : null;
  gravityChains.push({
    gravity: { cell, state },
    directBelow: airChain[0] ?? { x: cell.x, y: cell.y - 1, z: cell.z },
    directBelowState: airChain.length ? 'minecraft:air-family' : terminalState,
    airSupportChain: manifest(airChain),
    terminal: { cell: cursor, state: terminalState, reachedWorldFloor: cursor.y < -64 },
    rollbackHazard: airChain.length > 0 ? 'ROLLBACK_RECREATES_FALLING_SOURCE_UNLESS_SOURCE_STATE_ITSELF_CHANGES' : 'SOURCE_IS_CURRENTLY_SUPPORTED_BUT_ANY_SUPPORT_REPLACEMENT_NEEDS_EXACT_INVERSE',
  });
}
const unsupportedGravity = gravityChains.filter(({ airSupportChain }) => airSupportChain.cellCount > 0);
const gravityExposureCells = uniqueCells(gravityChains.flatMap(({ gravity, airSupportChain, terminal }) => [gravity.cell, ...Array.from({ length: airSupportChain.cellCount }, (_, index) => ({ x: gravity.cell.x, y: gravity.cell.y - 1 - index, z: gravity.cell.z })), terminal.cell]));

const containmentEnvelopeCells = uniqueCells(fluidComponents.flatMap(({ sourceFacingContainmentFaces }) => sourceFacingContainmentFaces.map(({ toNonFluid }) => toNonFluid)));
const receiverEnvelope = {
  id: 'B07-RECEIVER-DISPLACEMENT-DECISION-ENVELOPE-01',
  definition: 'The exact non-fluid cells face-adjacent to a B07 interaction fluid state. This is a decision envelope only, not a receiver, liner, target set, or construction authority.',
  cells: manifest(containmentEnvelopeCells),
  ownership: 'UNASSIGNED: OWN-B07 and D05 hydrology receiver/interface records are both null.',
  feasibility: 'NOT_A_RECEIVER_CANDIDATE_UNTIL_EACH_COMPONENT_HAS_A_COMPLETE_TREATMENT_AND_AN_ACCEPTED_DIRECTED_TERMINAL',
};
const gravityEnvelope = {
  id: 'B07-GRAVITY-MIGRATION-EXPOSURE-ENVELOPE-01',
  definition: 'Gravity cells plus every immediate air support chain and terminal used to establish current fall behaviour. This is a rollback-risk envelope, not an authorized migration set.',
  cells: manifest(gravityExposureCells),
  ownership: 'UNASSIGNED: OWN-B07 has no canonical owner or accepted interface.',
  feasibility: unsupportedGravity.length ? 'NO_INDEPENDENT_GRAVITY_PHASE: exact rollback would recreate unsupported falling states.' : 'SUPPORTED_SOURCE_ONLY_NOT_A_MIGRATION_AUTHORIZATION',
};

const mapBounds = { minX: diagnosticBounds.minX, maxX: diagnosticBounds.maxX, minZ: diagnosticBounds.minZ, maxZ: diagnosticBounds.maxZ };
const componentColour = ['#1976d2', '#00897b', '#6a1b9a', '#d84315', '#5d4037', '#455a64'];
const componentByCell = new Map();
fluidComponents.forEach((component, index) => {
  for (const cell of component.sourceFacingContainmentFaces.map(({ fromFluid }) => fromFluid)) componentByCell.set(cellKey(cell), index);
});
const gravityByColumn = new Set(gravityRecords.map(({ cell }) => `${cell.x},${cell.z}`));
const mapSvg = (filename, title, cellsForColumn, legend, includeGravity) => {
  const unit = 12;
  const left = 80;
  const top = 54;
  const cols = mapBounds.maxX - mapBounds.minX + 1;
  const rows = mapBounds.maxZ - mapBounds.minZ + 1;
  const width = left + cols * unit + 260;
  const height = top + rows * unit + 50;
  const rects = [];
  for (let z = mapBounds.minZ; z <= mapBounds.maxZ; z += 1) {
    for (let x = mapBounds.minX; x <= mapBounds.maxX; x += 1) {
      const column = cellsForColumn(x, z);
      const inConstruction = [...column].some((cell) => constructionKeys.has(cellKey(cell)));
      const inInteraction = [...column].some((cell) => interactionKeys.has(cellKey(cell)));
      const fluidIndex = [...column].map((cell) => componentByCell.get(cellKey(cell))).find((entry) => entry !== undefined);
      const gravity = includeGravity && gravityByColumn.has(`${x},${z}`);
      const fill = fluidIndex !== undefined ? componentColour[fluidIndex % componentColour.length] : gravity ? '#e2b061' : inConstruction ? '#fbfdff' : inInteraction ? '#e8eef2' : '#ffffff';
      const stroke = inConstruction ? '#263c50' : inInteraction ? '#91a7b4' : '#dde3e8';
      const text = `${x},${z}; fluid components=${fluidIndex === undefined ? 'none' : fluidIndex + 1}; gravity=${gravity}; construction=${inConstruction}; interaction=${inInteraction}`;
      rects.push(`<rect x="${left + (x - mapBounds.minX) * unit}" y="${top + (z - mapBounds.minZ) * unit}" width="${unit}" height="${unit}" fill="${fill}" stroke="${stroke}" stroke-width=".4"><title>${escapeXml(text)}</title></rect>`);
    }
  }
  const labels = [];
  for (let x = mapBounds.minX; x <= mapBounds.maxX; x += 4) labels.push(`<text x="${left + (x - mapBounds.minX) * unit}" y="${top - 8}" font-size="7">${x}</text>`);
  for (let z = mapBounds.minZ; z <= mapBounds.maxZ; z += 4) labels.push(`<text x="${left - 44}" y="${top + (z - mapBounds.minZ) * unit + 9}" font-size="7">${z}</text>`);
  const legendText = legend.map((entry, index) => `<rect x="${left + cols * unit + 18}" y="${top + index * 24}" width="13" height="13" fill="${entry.colour}" stroke="#334155"/><text x="${left + cols * unit + 38}" y="${top + 11 + index * 24}" font-size="9">${escapeXml(entry.label)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:ui-monospace,monospace;fill:#1f2937}.title{font-size:16px;font-weight:bold}.sub{font-size:9px}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="22">${escapeXml(title)}</text><text class="sub" x="12" y="39">x horizontal; z vertical; dark outline = construction reservation, gray = interaction halo</text>${rects.join('')}${labels.join('')}${legendText}</svg>`;
  fs.writeFileSync(abs(path.join(OUT, filename)), svg);
};
const cellsForFluid = (x, z) => fluidComponents.flatMap((component) => component.sourceFacingContainmentFaces.map(({ fromFluid }) => fromFluid)).filter((cell) => cell.x === x && cell.z === z);
const cellsForCombined = (x, z) => [
  ...cellsForFluid(x, z),
  ...gravityRecords.filter(({ cell }) => cell.x === x && cell.z === z).map(({ cell }) => cell),
  ...b07.interaction.filter((cell) => cell.x === x && cell.z === z),
];

fs.mkdirSync(abs(OUT), { recursive: true });
mapSvg('b07-fluid-topology-projection.svg', 'MP05 B07 fluid-bearing topology contacts', cellsForFluid, [
  { colour: '#1976d2', label: 'fluid topology component 1' }, { colour: '#00897b', label: 'fluid topology component 2+' },
  { colour: '#fbfdff', label: 'construction reservation' }, { colour: '#e8eef2', label: 'interaction halo' },
], false);
mapSvg('b07-containment-gravity-projection.svg', 'MP05 B07 containment and gravity decision constraints', cellsForCombined, [
  { colour: '#1976d2', label: 'fluid-bearing source contact' }, { colour: '#e2b061', label: 'gravity in interaction halo' },
  { colour: '#fbfdff', label: 'construction reservation' }, { colour: '#e8eef2', label: 'interaction halo' },
], true);

const report = {
  schemaVersion: 1,
  id: 'MP05-B07-CONTAINMENT-CONTRACT-01',
  generatedAtUtc: GENERATED_AT,
  status: 'INTEGRATED_CONTAINMENT_AND_GRAVITY_DESIGN_HELD_NO_PHASEABLE_PHYSICAL_PACKAGE',
  purpose: 'Read-only B07 feasibility package. It identifies source-bound fluid topology contacts, containment/receiver decision envelopes, gravity rollback exposure, and ownership seams without generating an operation.',
  source: { snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureIdentity: capture.id, completeMembers: ['region', 'entities', 'poi', 'level.dat'] },
  sourceBindings: { mechanisms: { path: mechanismsPath, sha256: sha256(fs.readFileSync(abs(mechanismsPath))) } },
  canonicalB07: { construction: manifest(b07.construction), interaction: manifest(b07.interaction), candidateId: b07System.candidateId, physicalOpeningAuthorized: b07System.physicalOpeningAuthorized },
  diagnosticEnvelope: { bounds: diagnosticBounds, purpose: 'six-face topology trace from B07 interaction fluid seeds; boundary-touching components are explicitly incomplete, never treated as finite.', regionReadOnly: true },
  fluidTopology: {
    sourceFluidContacts: { construction: manifest(constructionFluidRecords.map(({ cell }) => cell)), interaction: manifest(interactionFluidRecords.map(({ cell }) => cell)), stateCensus: stateCounts(interactionFluidRecords) },
    components: fluidComponents,
    conclusion: fluidComponents.some(({ touchesDiagnosticBoundary }) => touchesDiagnosticBoundary) ? 'AT_LEAST_ONE_TOUCHED_COMPONENT_REACHES_THE_DIAGNOSTIC_BOUNDARY; NO_FINITE_COMPONENT_DISPOSITION_OR_RECEIVER_CAN_BE_DECLARED_FROM_THIS_SURVEY.' : 'FINITE_WITHIN_DIAGNOSTIC_ENVELOPE_ONLY; OWNERSHIP_AND_RECEIVER_CONTRACTS_REMAIN_REQUIRED.',
  },
  containmentReceiverDecisionEnvelope: receiverEnvelope,
  gravityMigration: {
    interactionGravity: manifest(gravityRecords.map(({ cell }) => cell)),
    unsupportedGravityCount: unsupportedGravity.length,
    unsupportedGravityCells: manifest(unsupportedGravity.map(({ gravity }) => gravity.cell)),
    chains: gravityChains,
    exposureEnvelope: gravityEnvelope,
    doctrineRequired: 'A future compiler must either retain all source gravity safely outside changed fall boundaries or bind every changed gravity cell and support chain to a permanent future state plus a rollback that never recreates a falling source. Temporary support is invalid.',
  },
  ownershipAndInterfaces: {
    ownB07: { status: 'HOLD_OWNER_AND_INTERFACES_UNASSIGNED', canonicalOwnerId: null, acceptedInterfaceContractIds: [] },
    requiredD05Owners: ['CZ05-MOUNTAIN-HYDROLOGY-CONTROL', 'CZ05-SCOPE-CONSTRUCTION-CONTROL', 'CZ05-PROTECTED-RELIC-CONTROL'],
    requiredDirectionality: ['fluid component -> treatment/containment state', 'collection -> receiver terminal', 'overflow/failure -> sealed disposition', 'route/liner -> adjacent retained material', 'gravity migration -> rollback source state'],
    crossScopeConclusion: 'Diagnostic envelope membership grants no ownership. Every direct or influence cell and every directed terminal/seam remains unassigned.'
  },
  phaseability: {
    conclusion: 'IMPOSSIBLE_ON_CURRENT_EVIDENCE_TO_PHASE_A_PHYSICAL_RELEASE',
    rejectedIndependentPhases: [
      'Fluid-only lining/displacement: component treatment and directed receiver are absent; a diagnostic boundary is touched.',
      'Receiver-only construction: no owned source component, storage/freeboard rule, terminal, overflow, or inverse exists.',
      'Gravity-only migration: unsupported source chains make a conventional exact rollback recreate falling gravel/sand.',
      'Cap/opening-only work: reconnects a route before water containment, gravity doctrine, ownership, surface receiver, and endpoint contracts are accepted.'
    ],
    nextDesignInputs: ['full component closure or an accepted explicitly bounded treatment component', 'exact directed receiver/overflow/failure graph', 'one-owner assignments and directional interface contracts', 'per-cell permanent gravity future-state and rollback doctrine', 'integrated normal-walk/egress endpoint contract'],
  },
  maps: ['b07-fluid-topology-projection.svg', 'b07-containment-gravity-projection.svg'].map((filename) => ({ path: `${rel(OUT)}/${filename}`, sha256: sha256(fs.readFileSync(abs(path.join(OUT, filename)))) })),
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'containment-contract-findings.json')), `${JSON.stringify(report, null, 2)}\n`);

const componentRows = report.fluidTopology.components.map((component) => `| ${component.id} | ${component.sourceContact.cellCount} | ${component.constructionContact.cellCount} | ${component.diagnosticComponent.cellCount} | ${component.touchesDiagnosticBoundary ? 'Yes — incomplete' : 'No'} | ${component.topologyDisposition} |`).join('\n');
const markdown = `# MP05 B07 containment, receiver, and gravity contract 01

**Status:** \`${report.status}\`  
**Immutable source:** \`${report.source.snapshotRoot}\` (capture \`${report.source.captureId}\`)  
**Machine findings:** [JSON](../../../${rel(path.join(OUT, 'containment-contract-findings.json'))})

This is a read-only feasibility package. It made no live call, RCON call, world mutation, forward operation, or rollback operation. A diagnostic envelope is an exact observed constraint set; it grants neither construction authority nor a receiver/liner design.

## Decision maps

- [Fluid-bearing topology contacts](../../../${rel(path.join(OUT, 'b07-fluid-topology-projection.svg'))})
- [Containment and gravity constraints](../../../${rel(path.join(OUT, 'b07-containment-gravity-projection.svg'))})

Dark outlines are the 8,134-cell B07 construction reservation; gray outlines are the 13,608-cell interaction halo. Blue/teal cells are six-face fluid-bearing component contacts. Ochre is gravity material. These are source-state maps, not construction drawings.

## Fluid topology and receiver result

The immediate B07 reading contains **${report.fluidTopology.sourceFluidContacts.construction.cellCount} construction** and **${report.fluidTopology.sourceFluidContacts.interaction.cellCount} interaction** fluid-bearing contacts. Each is traced six-face outward inside the explicit diagnostic volume \`${JSON.stringify(diagnosticBounds)}\`; a component that reaches that volume’s boundary is reported as incomplete, never clipped into a fake finite receiver.

| Component | Interaction contacts | Construction contacts | Cells observed in diagnostic trace | Reaches diagnostic boundary | Disposition |
|---|---:|---:|---:|---|---|
${componentRows}

The exact **receiver/displacement decision envelope** contains ${receiverEnvelope.cells.cellCount} non-fluid, source-facing cells (coordinate hash \`${receiverEnvelope.cells.coordinateSetSha256}\`). It is **not** an approved receiver or target set. It cannot become one until every component has an accepted source-to-future treatment, a directed owned terminal, overflow/failure disposition, capacity/freeboard criterion, and exact inverse.

## Gravity migration / rollback result

The interaction halo contains **${report.gravityMigration.interactionGravity.cellCount}** gravity cells. **${report.gravityMigration.unsupportedGravityCount}** have immediate air support chains (gravity-only cell hash \`${report.gravityMigration.unsupportedGravityCells.coordinateSetSha256}\`). The full gravity exposure envelope is ${gravityEnvelope.cells.cellCount} cells (hash \`${gravityEnvelope.cells.coordinateSetSha256}\`).

No temporary support phase is acceptable: removing it in an ordinary rollback recreates the original falling state. A future integrated compiler must either retain these source states outside every changed fall boundary or bind all changed gravity and support-chain cells to permanent future states whose inverse is safe at every rollback step.

## Ownership and phaseability

\`OWN-B07\` has no canonical owner and no accepted interface contract. D05 hydrology, construction, and protected-relic controls also have no B07-specific accepted assignments. The current record therefore has **no valid directed source → treatment → receiver/overflow chain** and no gravity migration owner.

**Conclusion: no physical B07 subphase is safe on this evidence.** Fluid-only, receiver-only, gravity-only, and cap/opening-only work each leaves an unowned or non-invertible state. The first buildable B07 package remains one integrated containment / permanent-gravity / route / surface-receiver transaction after the exact design inputs listed in the machine report are accepted and a fresh release kernel passes.
`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT, 'containment-contract-findings.json')), markdown: rel(MARKDOWN), maps: report.maps.map(({ path: mapPath }) => mapPath), fluidComponents: fluidComponents.length, unsupportedGravity: unsupportedGravity.length, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
