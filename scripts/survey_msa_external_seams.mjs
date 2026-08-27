#!/usr/bin/env node
/**
 * READ-ONLY MainStreet America external seam register.
 *
 * MP07 Phase MSA-1 next-task: a fresh condition/obstruction survey and an
 * exact external seam register. This script documents every external seam of
 * the MainStreet America district (the mountain, road, and rail boundaries)
 * against the accepted immutable r08am post snapshot
 * (data/worldsnap-r08am-post-20260822T161818Z).
 *
 * Enumerated seams:
 *   mountain-west-face   x=89 plane, z=135..235, y=55..75  (C01 public west edge)
 *   mountain-south-face  z=235 plane, x=90..300, y=55..75  (mountain road edge)
 *   road-west-terminus   x=-85 plane, z=-220..85, y=63..70 (R02/R08 termini)
 *   road-r07-south-edge  z=-218 plane, x=-85..222, y=64..68
 *   south-arrival        z=305 plane, x=-135..135, y=60..72 (P01 carriage)
 *   rail-anchor          x=-8..8, y=62..70, z=13..21        (PR-C01 MainStreet Central)
 *   property-west        x=-305 plane, z=-300..300, y=55..80
 *   property-north       z=-300 plane, x=-300..300, y=55..80
 *
 * No world edit, no RCON, no live service call. Reads only immutable Anvil.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
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
const OUT_DIR = value('--out-dir', 'data/world-review/msa-seam-register-20260825');
const OUT = value('--out', path.join(OUT_DIR, 'msa-external-seam-register.json'));
const MARKDOWN = value('--markdown', path.join(OUT_DIR, 'msa-external-seam-register.md'));

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));

const EXPECTED = Object.freeze({
  snapshotRegionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
  snapshotCompleteSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
  seamDefinitions: 8,
  seamCellCounts: {
    'mountain-west-face': 2121,
    'mountain-south-face': 4431,
    'road-west-terminus': 2448,
    'road-r07-south-edge': 1540,
    'south-arrival': 3523,
    'rail-anchor': 1377,
    'property-west': 15626,
    'property-north': 15626,
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

const SEAM_DEFINITIONS = [
  {
    id: 'mountain-west-face',
    label: 'C01 public mountain west edge',
    description: 'The vertical west face of the Earth-covered east operations complex at x=89, from the recessed portal approach (z=135) to the east-edge road (z=235).',
    bounds: { minX: 89, maxX: 89, minY: 55, maxY: 75, minZ: 135, maxZ: 235 },
    owner: 'mainstreet-america / C01 mountain complex',
  },
  {
    id: 'mountain-south-face',
    label: 'Mountain south/road edge',
    description: 'The south face of the mountain at z=235 from the public portal (x=90) to the east-edge road/aircraft area (x=300).',
    bounds: { minX: 90, maxX: 300, minY: 55, maxY: 75, minZ: 235, maxZ: 235 },
    owner: 'mainstreet-america / C01 mountain complex',
  },
  {
    id: 'road-west-terminus',
    label: 'R02/R08 west road termini',
    description: 'The west terminus plane at x=-85 bounding the West Lane (R02) and R08 road grid against the Ravensgate/west approach countryside.',
    bounds: { minX: -85, maxX: -85, minY: 63, maxY: 70, minZ: -220, maxZ: 85 },
    owner: 'mainstreet-america roads / ravensgate interface',
  },
  {
    id: 'road-r07-south-edge',
    label: 'R07 south road edge (B03/B02 service lane)',
    description: 'The R07 east-west road south edge at z=-218 from West Lane (x=-85) to the east mountain road (x=222).',
    bounds: { minX: -85, maxX: 222, minY: 64, maxY: 68, minZ: -218, maxZ: -218 },
    owner: 'mainstreet-america roads',
  },
  {
    id: 'south-arrival',
    label: 'P01 south arrival carriage edge',
    description: 'The southern arrival seam at z=305 bounding the P01 south-arrival carriage and parking district against the south approach countryside.',
    bounds: { minX: -135, maxX: 135, minY: 60, maxY: 72, minZ: 305, maxZ: 305 },
    owner: 'mainstreet-america / P01 arrival',
  },
  {
    id: 'rail-anchor',
    label: 'PR-C01 MainStreet Central rail anchor',
    description: 'The regional passenger-railway anchor reservation near the R05/R01 junction (PR-C01 MainStreet Central, reference anchor x=0,z=17), the planned Cobalt/Amber lines interchange. No rail is built; this registers the reservation envelope.',
    bounds: { minX: -8, maxX: 8, minY: 62, maxY: 70, minZ: 13, maxZ: 21 },
    owner: 'regional passenger railway (planned) / mainstreet-america interface',
  },
  {
    id: 'property-west',
    label: 'SITE west boundary',
    description: 'The western SITE boundary plane at x=-305 from the north-west corner (z=-300) to the south-west corner (z=300), the durable property envelope edge.',
    bounds: { minX: -305, maxX: -305, minY: 55, maxY: 80, minZ: -300, maxZ: 300 },
    owner: 'mainstreet-america SITE envelope',
  },
  {
    id: 'property-north',
    label: 'SITE north boundary',
    description: 'The northern SITE boundary plane at z=-300 from the north-west corner (x=-300) to the north-east corner (x=300), the durable property envelope edge.',
    bounds: { minX: -300, maxX: 300, minY: 55, maxY: 80, minZ: -300, maxZ: -300 },
    owner: 'mainstreet-america SITE envelope',
  },
];

const invariant = (condition, message) => {
  if (!condition) throw new Error(`MainStreet external seam register rejected: ${message}`);
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

// ----- Region hash check (algorithm: sha256(filename + NUL + bytes + NUL, sorted by filename) -----
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

// ----- Survey each seam -----
const seamRecords = [];
const allCells = [];
for (const definition of SEAM_DEFINITIONS) {
  const { bounds } = definition;
  const records = [];
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        cells.push({ x, y, z });
      }
    }
  }
  allCells.push(...cells);
  for (const cell of cells) {
    records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  const unique = uniqueCells(cells);
  const fluid = records.filter(({ state }) => isFluid(state)).length;
  const gravity = records.filter(({ state }) => isGravity(state)).length;
  const forbidden = records.filter(({ state }) => isForbidden(state)).length;
  const air = records.filter(({ state }) => isAir(state)).length;
  const census = Object.fromEntries([...records.reduce((counts, { state }) => {
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
  invariant(records.length === EXPECTED.seamCellCounts[definition.id],
    `${definition.id} cell count ${records.length} != ${EXPECTED.seamCellCounts[definition.id]}`);
  seamRecords.push({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    owner: definition.owner,
    bounds: definition.bounds,
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
  id: 'msa-external-seam-register',
  status: 'PASS_MSA_EXTERNAL_SEAM_REGISTER_READONLY',
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
    projectId: 'mainstreet-america',
    siteEnvelope: { minX: -300, maxX: 300, minY: 62, maxY: 319, minZ: -300, maxZ: 300 },
  },
  seams: seamRecords,
  census: {
    totalSurveyedCells: surveyCells.length,
    blockEntities: blockEntities.length,
    savedEntities: savedEntities.length,
    savedEntityDetails: savedEntities,
    containersOrControls: seamRecords.reduce((sum, seam) => sum + seam.hazards.forbidden, 0),
  },
  checks: [
    { id: 'SEAM-01-ACCEPTED-IMMUTABLE-R08AM-SNAPSHOT-BOUND', status: 'PASS' },
    { id: 'SEAM-02-REGION-SHA256-MATCHES-ACCEPTED-R08AM-POST', status: 'PASS' },
    { id: 'SEAM-03-ALL-SEAM-CELL-COUNT-MATCHES', status: 'PASS' },
    { id: 'SEAM-04-SURVEYED-VOLUME-BLOCK-ENTITY-FREE', status: blockEntities.length === 0 ? 'PASS' : 'FAIL' },
    { id: 'SEAM-05-SURVEYED-VOLUME-ENTITY-CENSUS-CAPTURED', status: 'PASS' },
    { id: 'SEAM-06-NO-WORLD-EDIT-NO-RCON', status: 'PASS' },
  ],
  interpretation: 'Read-only seam register. It documents the district boundary planes; it authorizes no world edit, interface change, or release.',
};
const payloadSha256 = sha256(Buffer.from(`${JSON.stringify(payloadWithoutIdentity, null, 2)}\n`));
const report = { ...payloadWithoutIdentity, payloadSha256 };

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);

const md = [
  '# MainStreet America — external seam register',
  '',
  '**Status:** PASS_MSA_EXTERNAL_SEAM_REGISTER_READONLY',
  `**Snapshot:** \`${relative(POST_ROOT)}\` (region SHA-256 \`${regionHash}\`)`,
  `**Generated:** ${GENERATED_AT}`,
  `**Payload SHA-256:** \`${payloadSha256}\``,
  '',
  'Read-only survey. No world edits, RCON calls, or live service mutations were made.',
  '',
  '## District',
  '',
  '- Project: `mainstreet-america`',
  '- SITE envelope: X `-300..300`, Y `62..319`, Z `-300..300`',
  '',
  '## Seams',
  '',
  '| seam | label | bounds | cells | fluid | gravity | container/control |',
  '|---|---|---|--:|--:|--:|--:|',
  ...seamRecords.map((seam) => {
    const { bounds: b } = seam;
    return `| ${seam.id} | ${seam.label} | x${b.minX}..${b.maxX} y${b.minY}..${b.maxY} z${b.minZ}..${b.maxZ} | ${seam.cellCount} | ${seam.hazards.fluid} | ${seam.hazards.gravity} | ${seam.hazards.forbidden} |`;
  }),
  '',
  '## Seam state census (top states per seam)',
  '',
  ...seamRecords.map((seam) => {
    const top = Object.entries(seam.census).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([state, count]) => `${state} (${count})`).join(', ');
    return `### ${seam.id} — ${seam.label}\n\n- **Owner:** ${seam.owner}\n- **Coordinate-set SHA-256:** \`${seam.coordinateSetSha256}\`\n- **Top states:** ${top}\n`;
  }),
  '',
  '## Hazard census',
  '',
  `- Total surveyed cells: ${surveyCells.length}`,
  `- Block entities: ${blockEntities.length}`,
  `- Saved entities: ${savedEntities.length}`,
  `- Container/control blocks in seams: ${seamRecords.reduce((sum, seam) => sum + seam.hazards.forbidden, 0)}`,
  '',
  '## Checks',
  '',
  '| check | status |',
  '|---|---|',
  ...report.checks.map((check) => `| ${check.id} | ${check.status} |`),
  '',
  '## Interpretation',
  '',
  'Read-only seam register. It documents the district boundary planes; it authorizes no world edit, interface change, or release.',
  '',
].join('\n');
fs.writeFileSync(absolute(MARKDOWN), md);

process.stdout.write(`${JSON.stringify({
  status: report.status,
  out: relative(OUT),
  markdown: relative(MARKDOWN),
  payloadSha256,
  seamCount: seamRecords.length,
  totalSurveyedCells: surveyCells.length,
  blockEntities: blockEntities.length,
  savedEntities: savedEntities.length,
}, null, 2)}\n`);
