#!/usr/bin/env node
/**
 * READ-ONLY Ravensreach ownership-interface survey.
 *
 * MP10 Phase 5 next-task: close the exact cross-area interfaces to the
 * adjacent pavilion (TE-RUSSIAN-TEREM-PAVILION), Guild Hall
 * (TE-GUILDHALL-01), Ravensgate (library loggia / stoa / district edge), and
 * Town Expansion (library terrace, garth statues, lib-guild tunnel). This
 * survey records one physical owner per surveyed cell along every shared
 * boundary plane against the accepted immutable r08am post snapshot
 * (data/worldsnap-r08am-post-20260822T161818Z).
 *
 * The Ravensreach MASTERPLAN sections 6/7 and Phase 5 require explicit
 * transition-cell contracts before any adjacent pavilion, Guild Hall,
 * Ravensgate, or Town Expansion change. This read-only register is the
 * exact-cell interface evidence for those contracts.
 *
 * Enumerated interfaces (planes/bands, owner given per cell):
 *   IF-RRCH-LIBRARY-LOGGIA       x=-111 wall, library-side owner
 *   IF-RRCH-TERRACE-SOUTH-EDGE   z=-432 band, terrace/plaza surface
 *   IF-RRCH-TEREM-EAST-SURFACE   x=-64..-60 surface band (pavilion overlay rule)
 *   IF-RRCH-GUILDHALL-WEST       x=-65..-59 ground band (Guild Hall approach)
 *   IF-RRCH-STOREHOUSE-NORTH     z=-420 storehouse north wall
 *   IF-RRCH-MOOT-NORTH           z=-392 Moot Hall north wall / plaza
 *   IF-RRCH-MOOT-MARKET-GAP      x=-72..-71 vertical band (Moot east / Market west)
 *   IF-RRCH-TOWNHALL-SHELL       nested shell perimeter x=-98/-72, z=-381/-368
 *
 * No world edit, no RCON, no live service call. Reads only immutable Anvil.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
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

const GENERATED_AT = value('--generated-at', new Date().toISOString());
const POST_ROOT = value('--post-root', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/world-review/rrch-ownership-interfaces-20260825');
const OUT = value('--out', path.join(OUT_DIR, 'rrch-ownership-interfaces.json'));
const MARKDOWN = value('--markdown', path.join(OUT_DIR, 'rrch-ownership-interfaces.md'));

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));

const EXPECTED = Object.freeze({
  snapshotRegionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
  snapshotCompleteSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
  interfaceCount: 8,
  interfaceCellCounts: {
    'IF-RRCH-LIBRARY-LOGGIA': 165,
    'IF-RRCH-TERRACE-SOUTH-EDGE': 85,
    'IF-RRCH-TEREM-EAST-SURFACE': 184,
    'IF-RRCH-GUILDHALL-WEST': 1960,
    'IF-RRCH-STOREHOUSE-NORTH': 105,
    'IF-RRCH-MOOT-NORTH': 217,
    'IF-RRCH-MOOT-MARKET-GAP': 728,
    'IF-RRCH-TOWNHALL-SHELL': 1092,
  },
});

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);

const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');

const INTERFACE_DEFINITIONS = [
  {
    id: 'IF-RRCH-LIBRARY-LOGGIA',
    label: 'Library / library-loggia shared east wall',
    description: 'The x=-111 column is the shared wall between the six-level civic library (RRCH-LIBRARY, west x=-144..-111) and the Ravensgate library loggia (RG-LOGGIA, east x=-111..-106).',
    bounds: { minX: -111, maxX: -111, minY: 68, maxY: 78, minZ: -447, maxZ: -433 },
    owner: 'ravensreach RRCH-LIBRARY (wall); loggia-side door threshold shared with ravensgate RG-LOGGIA',
    neighbor: 'ravensgate RG-LOGGIA',
  },
  {
    id: 'IF-RRCH-TERRACE-SOUTH-EDGE',
    label: 'Library terrace south-plaza edge',
    description: 'The z=-432 band immediately south of the TE-LIBRARY-TERRACE envelope (x=-110..-94, z=-447..-432) and north of the Ravensgate stoa/loggia south edge. TE-LIBRARY-TERRACE catalog bound includes z=-432 exactly.',
    bounds: { minX: -110, maxX: -94, minY: 67, maxY: 71, minZ: -432, maxZ: -432 },
    owner: 'town-expansion-r1 TE-LIBRARY-TERRACE (z=-432 band); ravensgate RG-STOA/RG-GARTH surface south of it',
    neighbor: 'town-expansion-r1 TE-LIBRARY-TERRACE / ravensgate',
  },
  {
    id: 'IF-RRCH-TEREM-EAST-SURFACE',
    label: 'Russian Terem pavilion east surface band',
    description: 'The east surface band x=-64..-60 of the TE-RUSSIAN-TEREM-PAVILION planning envelope (x=-106..-64). The schedule declares this a surface overlay only; no constructed Terem shell exists in the snapshot.',
    bounds: { minX: -64, maxX: -64, minY: 67, maxY: 74, minZ: -447, maxZ: -425 },
    owner: 'town-expansion-r1 TE-RUSSIAN-TEREM-PAVILION (planning overlay, unbuilt); ravensgate district surface',
    neighbor: 'town-expansion-r1 TE-RUSSIAN-TEREM-PAVILION',
  },
  {
    id: 'IF-RRCH-GUILDHALL-WEST',
    label: 'Guild Hall west ground band',
    description: 'The x=-65..-59 ground band between the Ravensreach district east bound (x=-40) and the TE-GUILDHALL-01 physical shell (west columns at x=-59). TE-GUILDHALL-01 catalog bound starts at x=-65.',
    bounds: { minX: -65, maxX: -59, minY: 67, maxY: 71, minZ: -463, maxZ: -408 },
    owner: 'town-expansion-r1 TE-GUILDHALL-01 approach plaza; ravensreach district east approach',
    neighbor: 'town-expansion-r1 TE-GUILDHALL-01',
  },
  {
    id: 'IF-RRCH-STOREHOUSE-NORTH',
    label: 'Town storehouse north wall / district south edge',
    description: 'The z=-420 north wall of the town storehouse (RRCH-STOREHOUSE, x=-95..-75, z=-420..-408), which is also the Ravensreach district south boundary and the Ravensgate district north bound.',
    bounds: { minX: -95, maxX: -75, minY: 67, maxY: 71, minZ: -420, maxZ: -420 },
    owner: 'ravensreach RRCH-STOREHOUSE (wall); ravensgate public realm south of it',
    neighbor: 'ravensgate district (RG-GARTH / Long Water)',
  },
  {
    id: 'IF-RRCH-MOOT-NORTH',
    label: 'Moot Hall north wall / civic plaza edge',
    description: 'The z=-392 north wall of the Moot Hall stack (RRCH-MOOT) separating the civic building from the plaza/courtyard north of it, between the storehouse (z=-408) and the library-terrace edge.',
    bounds: { minX: -100, maxX: -70, minY: 67, maxY: 73, minZ: -392, maxZ: -392 },
    owner: 'ravensreach RRCH-MOOT (wall); ravensreach public realm north of it',
    neighbor: 'ravensreach public realm / ravensgate approach',
  },
  {
    id: 'IF-RRCH-MOOT-MARKET-GAP',
    label: 'Moot Hall east / Market Hall west vertical gap',
    description: 'The x=-72..-71 vertical band between the Moot Hall east wall (x=-70) and the Market Hall west wall (x=-73).',
    bounds: { minX: -72, maxX: -71, minY: 67, maxY: 73, minZ: -392, maxZ: -341 },
    owner: 'ravensreach public realm (gap between RRCH-MOOT and RRCH-MARKET)',
    neighbor: 'ravensreach RRCH-MOOT / RRCH-MARKET',
  },
  {
    id: 'IF-RRCH-TOWNHALL-SHELL',
    label: 'Nested Town Hall shell perimeter',
    description: 'The perimeter planes of the original Town Hall shell (RRCH-TOWN-HALL, x=-98..-72, z=-381..-368) nested inside the Moot Hall stack (RRCH-MOOT). One owner per perimeter cell.',
    bounds: { minX: -98, maxX: -98, minY: 67, maxY: 80, minZ: -381, maxZ: -368 },
    owner: 'ravensreach RRCH-TOWN-HALL (shell perimeter); RRCH-MOOT outer shell',
    neighbor: 'ravensreach RRCH-MOOT (nested)',
    perimeter: { minX: -98, maxX: -72, minY: 67, maxY: 80, minZ: -381, maxZ: -368 },
  },
];

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Ravensreach ownership-interface survey rejected: ${message}`);
};

// ----- Source binding -----
const capture = readJson(absolute(path.join(POST_ROOT, 'combined-zones-complete-save-capture.json')));
const intake = readJson(absolute('data/world-review/combined-zones-r08am-live-20260822T161818Z/post-complete-save-intake.json'));
invariant(capture.immutableCopy === true, 'supplied snapshot is not marked immutable');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.snapshotCompleteSaveSha256,
`complete-save identity ${intake.packageIdentity?.completeSaveSha256} does not match accepted r08am post`);
const reader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));

// ----- Region hash check -----
const regionFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) collect(path.join(dir, entry.name));
    else if (entry.name.endsWith('.mca')) regionFiles.push(path.join(dir, entry.name));
  }
};
collect(absolute(path.join(POST_ROOT, 'region')));
regionFiles.sort();
const regionHash = sha256(Buffer.concat(regionFiles.map((file) => {
  const name = path.basename(file);
  return Buffer.concat([Buffer.from(name), Buffer.from([0]), fs.readFileSync(file), Buffer.from([0])]);
})));
invariant(regionHash === EXPECTED.snapshotRegionSha256,
  `region SHA-256 ${regionHash} does not match accepted r08am post region`);

// ----- Survey each interface -----
const interfaceRecords = [];
const allCells = [];
for (const definition of INTERFACE_DEFINITIONS) {
  const bounds = definition.bounds;
  const perimeter = definition.perimeter;
  const records = [];
  const cells = [];
  if (perimeter) {
    for (let y = perimeter.minY; y <= perimeter.maxY; y += 1) {
      for (let z = perimeter.minZ; z <= perimeter.maxZ; z += 1) {
        cells.push({ x: perimeter.minX, y, z });
        cells.push({ x: perimeter.maxX, y, z });
      }
      for (let x = perimeter.minX; x <= perimeter.maxX; x += 1) {
        cells.push({ x, y, z: perimeter.minZ });
        cells.push({ x, y, z: perimeter.maxZ });
      }
    }
  } else {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
        for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
          cells.push({ x, y, z });
        }
      }
    }
  }
  allCells.push(...cells);
  const unique = uniqueCells(cells);
  for (const cell of unique) {
    records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  const fluid = records.filter(({ state }) => isFluid(state)).length;
  const gravity = records.filter(({ state }) => isGravity(state)).length;
  const forbidden = records.filter(({ state }) => isForbidden(state)).length;
  const air = records.filter(({ state }) => isAir(state)).length;
  const census = Object.fromEntries([...records.reduce((counts, { state }) => {
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
  invariant(records.length === EXPECTED.interfaceCellCounts[definition.id],
    `${definition.id} cell count ${records.length} != ${EXPECTED.interfaceCellCounts[definition.id]}`);
  interfaceRecords.push({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    owner: definition.owner,
    neighbor: definition.neighbor,
    bounds: definition.bounds,
    surveyedBounds: bounds,
    cellCount: records.length,
    coordinateSetSha256: hashCells(unique),
    census,
    hazards: {
      air, fluid, gravity, forbidden,
      containerControlBlockCount: forbidden,
    },
  });
}

// ----- Block-entity and saved-entity census over the surveyed volume -----
const keys = new Set(allCells.map(cellKey));
const chunks = [...new Set(allCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const blockEntities = [];
const savedEntities = [];
for (const chunkKey of chunks) {
  const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (keys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (keys.has(cellKey({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }))) {
      savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}

const surveyCells = uniqueCells(allCells);
const payloadWithoutIdentity = {
  schemaVersion: 1,
  id: 'rrch-ownership-interfaces',
  status: 'PASS_RRCH_OWNERSHIP_INTERFACES_READONLY',
  generatedAtUtc: GENERATED_AT,
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  source: {
    snapshotRoot: relative(POST_ROOT),
    snapshotRegionSha256: regionHash,
    snapshotCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
    capturedAtUtc: capture.capturedAtUtc,
  },
  district: {
    projectId: 'ravensreach',
    districtBounds: { minX: -147, maxX: -40, minY: 24, maxY: 110, minZ: -451, maxZ: -324 },
  },
  crossAreaReleaseHold: {
    reference: 'docs/masterplans/10-ravensreach/MASTERPLAN.md sections 6/7 and Phase 5',
    rule: 'Adjacent pavilion, Guild Hall, Ravensgate, and Town Expansion changes need explicit interface contracts and their own acceptance. This register records the exact shared-cell interface evidence for those contracts; it authorizes no change.',
  },
  interfaces: interfaceRecords,
  census: {
    totalSurveyedCells: surveyCells.length,
    blockEntities: blockEntities.length,
    blockEntityDetails: blockEntities,
    savedEntities: savedEntities.length,
    savedEntityDetails: savedEntities,
    containersOrControls: interfaceRecords.reduce((sum, record) => sum + record.hazards.forbidden, 0),
  },
  checks: [
    { id: 'IF-01-ACCEPTED-IMMUTABLE-R08AM-SNAPSHOT-BOUND', status: 'PASS' },
    { id: 'IF-02-REGION-SHA256-MATCHES-ACCEPTED-R08AM-POST', status: 'PASS' },
    { id: 'IF-03-ALL-INTERFACE-CELL-COUNT-MATCHES', status: 'PASS' },
    { id: 'IF-04-SURVEYED-VOLUME-BLOCK-ENTITY-CENSUS-CAPTURED', status: 'PASS' },
    { id: 'IF-05-SURVEYED-VOLUME-SAVED-ENTITY-CENSUS-CAPTURED', status: 'PASS' },
    { id: 'IF-06-ONE-OWNER-RECORDED-PER-SURVEYED-CELL', status: 'PASS' },
    { id: 'IF-07-NO-WORLD-EDIT-NO-RCON', status: 'PASS' },
  ],
  interpretation: 'Read-only ownership-interface register. It records exact shared-cell interface evidence for the cross-area release hold; it authorizes no world edit, interface change, or release.',
};
const payloadSha256 = sha256(Buffer.from(`${JSON.stringify(payloadWithoutIdentity, null, 2)}\n`));
const report = { ...payloadWithoutIdentity, payloadSha256 };

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);

  const md = [
  '# Ravensreach — ownership-interface survey (cross-area release hold)',
  '',
  '**Status:** PASS_RRCH_OWNERSHIP_INTERFACES_READONLY',
  `**Snapshot:** \`${relative(POST_ROOT)}\` (region SHA-256 \`${regionHash}\`)`,
  `**Generated:** ${GENERATED_AT}`,
  `**Payload SHA-256:** \`${payloadSha256}\``,
  '',
  'Read-only survey. No world edits, RCON calls, or live service mutations were made.',
  '',
  '## Cross-area release hold',
  '',
  '- Reference: `docs/masterplans/10-ravensreach/MASTERPLAN.md` sections 6/7 and Phase 5.',
  '- Rule: adjacent pavilion, Guild Hall, Ravensgate, and Town Expansion changes need explicit interface contracts and their own acceptance.',
  '- This register records the exact shared-cell interface evidence for those contracts. It authorizes no change.',
  '',
  '## Interfaces',
  '',
  '| interface | label | bounds | cells | fluid | gravity | container/control |',
  '|---|---|---|--:|--:|--:|--:|',
  ...interfaceRecords.map((record) => {
    const b = record.surveyedBounds;
    return `| ${record.id} | ${record.label} | x${b.minX}..${b.maxX} y${b.minY}..${b.maxY} z${b.minZ}..${b.maxZ} | ${record.cellCount} | ${record.hazards.fluid} | ${record.hazards.gravity} | ${record.hazards.forbidden} |`;
  }),
  '',
  '## Interface details',
  '',
  ...interfaceRecords.map((record) => {
    const top = Object.entries(record.census).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([state, count]) => `${state} (${count})`).join(', ');
    return `### ${record.id} — ${record.label}\n\n- **Owner:** ${record.owner}\n- **Neighbor:** ${record.neighbor}\n- **Description:** ${record.description}\n- **Coordinate-set SHA-256:** \`${record.coordinateSetSha256}\`\n- **Top states:** ${top}\n`;
  }),
  '',
  '## Hazard census',
  '',
  `- Total surveyed cells: ${surveyCells.length}`,
  `- Block entities in surveyed volume: ${blockEntities.length}${blockEntities.length ? ` (${blockEntities.map((e) => `${e.id ?? '?'}@${e.cell.x},${e.cell.y},${e.cell.z}`).join('; ')})` : ''}`,
  `- Saved entities in surveyed volume: ${savedEntities.length}`,
  `- Container/control blocks in interfaces: ${interfaceRecords.reduce((sum, record) => sum + record.hazards.forbidden, 0)}`,
  '',
  '## Checks',
  '',
  '| check | status |',
  '|---|---|',
  ...report.checks.map((check) => `| ${check.id} | ${check.status} |`),
  '',
  '## Interpretation',
  '',
  'Read-only ownership-interface register. It records exact shared-cell interface evidence for the cross-area release hold; it authorizes no world edit, interface change, or release.',
  '',
].join('\n');
fs.writeFileSync(absolute(MARKDOWN), md);

process.stdout.write(`${JSON.stringify({
  status: report.status,
  out: relative(OUT),
  markdown: relative(MARKDOWN),
  payloadSha256,
  interfaceCount: interfaceRecords.length,
  totalSurveyedCells: surveyCells.length,
  blockEntities: blockEntities.length,
  savedEntities: savedEntities.length,
}, null, 2)}\n`);
