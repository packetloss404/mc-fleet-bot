#!/usr/bin/env node
/**
 * Read-only current-source survey for the first unfinished MP01 functional
 * programme: the Cheyenne chamber terminal and its controlled approach.
 *
 * This deliberately does not turn the legacy Chamber envelope into an
 * operation package. It binds the current immutable complete save, identifies
 * every natural-state and entity hazard in the exact chamber envelope, and
 * proves whether a 5x5 terminal landing can be designed behind the retained
 * B03 cap. A later compiler must consume this report and still provide exact
 * forward/inverse operations, live clearance, and route QA.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(`MP01 current-source survey rejected: ${message}`);
};

const WORLD_ROOT = required('--world-root');
const OUT = required('--out');
const MARKDOWN = required('--markdown');
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const INTAKE = value('--intake', null);
const COORDINATES = 'docs/masterplans/05-combined-zones/site-coordinates.json';
const GEOMETRY = 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json';

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg',
  'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const CONTAINERS_AND_CONTROLS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block', 'minecraft:jigsaw',
]);
const nameOf = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']
  .includes(nameOf(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const isContainerOrControl = (state) => CONTAINERS_AND_CONTROLS.has(nameOf(state))
  || nameOf(state).endsWith('_shulker_box');
const isAir = (state) => AIR.has(nameOf(state));
const byState = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));

const coordinates = readJson(COORDINATES);
const geometry = readJson(GEOMETRY);
const intake = INTAKE ? readJson(INTAKE) : null;
if (intake) {
  assert(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    `intake is not a passing immutable complete save: ${intake.status}`);
  assert(relative(intake.input?.suppliedWorldRoot) === relative(WORLD_ROOT),
    `intake world ${intake.input?.suppliedWorldRoot} does not match --world-root ${WORLD_ROOT}`);
}

const zone = coordinates.zones.find(({ id }) => id === 'Z10');
assert(zone?.bounds && zone?.outerPortal, 'Z10 Cheyenne chamber bounds or portal is absent');
assert(geometry?.design?.centerline?.points?.length === 801, 'B03 current placement geometry is not the exact 801-point design');
const end = geometry.design.centerline.points.at(-1);
assert(end.x === 2048 && end.y === 166 && end.z === -868,
  `unexpected B03 terminal point ${JSON.stringify(end)}`);

const chamberBounds = {
  minX: Math.ceil(zone.bounds.minX), maxX: Math.floor(zone.bounds.maxX),
  minY: Math.ceil(zone.bounds.minY), maxY: Math.floor(zone.bounds.maxY),
  minZ: Math.ceil(zone.bounds.minZ), maxZ: Math.floor(zone.bounds.maxZ),
};
const chamberCells = cellsIn(chamberBounds);
assert(chamberCells.length === 288684, `Z10 chamber envelope cell count drifted: ${chamberCells.length}`);

// The retained cap is a true boundary, not an operation target.  The terminal
// study volume is the first 5x5 common spine behind it plus its immediate
// north/south protected-direction reservation.  It is survey geometry only.
const capCells = cellsIn({ minX: 2047, maxX: 2047, minY: 166, maxY: 169, minZ: -870, maxZ: -866 });
const terminalStudy = uniqueCells([
  ...cellsIn({ minX: 2038, maxX: 2046, minY: 165, maxY: 171, minZ: -871, maxZ: -865 }),
  ...cellsIn({ minX: 2038, maxX: 2042, minY: 165, maxY: 171, minZ: -877, maxZ: -859 }),
]);
const terminalStudyKeys = new Set(terminalStudy.map(cellKey));
assert(terminalStudy.every((cell) => chamberCells.some((candidate) => cellKey(candidate) === cellKey(cell))),
  'terminal study escaped Z10 chamber envelope');

const regions = path.join(absolute(WORLD_ROOT), 'region');
const entities = path.join(absolute(WORLD_ROOT), 'entities');
assert(fs.existsSync(regions) && fs.existsSync(entities), 'world root is missing region or entities directory');
const reader = new AnvilReader(regions);
const entityReader = new AnvilReader(entities);

async function readCells(cells) {
  const records = [];
  for (const cell of cells) {
    records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return records;
}

async function entityCensus(cells) {
  const keys = new Set(cells.map(cellKey));
  const envelope = boundsOf(cells);
  const chunks = new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
  const blockEntities = [];
  const savedEntities = [];
  for (const id of chunks) {
    const [x, z] = id.split(',').map(Number);
    const chunk = await reader.chunk(x, z);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (keys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
    }
    const entityChunk = await entityReader.chunk(x, z);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const position = entity.Pos.slice(0, 3).map(Number);
      if (position[0] >= envelope.minX && position[0] <= envelope.maxX + 1
        && position[1] >= envelope.minY && position[1] <= envelope.maxY + 1
        && position[2] >= envelope.minZ && position[2] <= envelope.maxZ + 1) {
        savedEntities.push({ id: entity.id ?? null, position });
      }
    }
  }
  return { chunkCount: chunks.size, blockEntities, savedEntities };
}

const [chamberRecords, capRecords, terminalRecords, chamberEntities, terminalEntities] = await Promise.all([
  readCells(chamberCells),
  readCells(capCells),
  readCells(terminalStudy),
  entityCensus(chamberCells),
  entityCensus(terminalStudy),
]);

const summarize = (records) => ({
  cellCount: records.length,
  coordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
  bounds: boundsOf(records.map(({ cell }) => cell)),
  stateCensus: byState(records),
  airCellCount: records.filter(({ state }) => isAir(state)).length,
  fluidCells: records.filter(({ state }) => isFluid(state)).map(({ cell, state }) => ({ cell, state })),
  gravityCells: records.filter(({ state }) => isGravity(state)).map(({ cell, state }) => ({ cell, state })),
  containerOrControlCells: records.filter(({ state }) => isContainerOrControl(state))
    .map(({ cell, state }) => ({ cell, state })),
});
const chamber = summarize(chamberRecords);
const cap = summarize(capRecords);
const terminal = summarize(terminalRecords);

const report = {
  schemaVersion: 1,
  id: 'mp01-cheyenne-terminal-current-source-survey',
  generatedAtUtc: GENERATED_AT,
  status: 'CURRENT_SOURCE_SURVEY_COMPLETE_NOT_A_RELEASE',
  source: {
    worldRoot: relative(WORLD_ROOT),
    completeSaveSha256: intake?.packageIdentity?.completeSaveSha256 ?? null,
    intake: INTAKE ? { path: relative(INTAKE), sha256: sha256(fs.readFileSync(absolute(INTAKE))) } : null,
    regionSnapshot: {
      path: relative(path.join(WORLD_ROOT, 'region')),
      sha256: sha256(Buffer.concat(fs.readdirSync(regions).filter((name) => name.endsWith('.mca')).sort()
        .flatMap((name) => [Buffer.from(`${name}\0`), fs.readFileSync(path.join(regions, name)), Buffer.from([0])]))),
    },
  },
  authority: {
    originalProgramme: 'MP01-A Cheyenne Mountain Complex',
    controlledScope: 'chamber terminal and controlled-access design only',
    excluded: ['cap removal by itself', 'public opening', 'emergency claim', 'active access-control', 'power/mechanism commissioning'],
  },
  geometry: {
    chamberEnvelope: chamber,
    retainedB03Cap: cap,
    terminalStudy: terminal,
    terminalStudyDesign: {
      commonSpineClearWidth: 5,
      commonSpineClearHeight: 4,
      protectedDirectionReservations: ['north', 'south'],
      liftAnalogueReservation: 'not set out — requires a second independently surveyed destination and a distinct mechanism package',
      capIsOperationTarget: false,
    },
  },
  entityClearance: {
    chamberEnvelope: chamberEntities,
    terminalStudy: terminalEntities,
    currentSourcePass: chamberEntities.blockEntities.length === 0 && chamberEntities.savedEntities.length === 0
      && terminalEntities.blockEntities.length === 0 && terminalEntities.savedEntities.length === 0,
  },
  releaseReadiness: {
    result: 'DESIGN_INPUT_READY_RELEASE_NOT_COMPILED',
    safeCurrentSource: chamber.fluidCells.length === 0 && chamber.gravityCells.length === 0
      && chamber.containerOrControlCells.length === 0 && cap.stateCensus['minecraft:stone'] === 20
      && terminal.fluidCells.length === 0 && terminal.gravityCells.length === 0
      && terminal.containerOrControlCells.length === 0,
    requiredNextCompiler: [
      'freeze an owned terminal programme with two independent protected directions and a second surveyed destination for the lift analogue',
      'compile exact forward and rollback operations from this source only',
      'preflight the operation/halo, then capture a new source immediately before execution',
      'perform live entity clearance, guarded execution, post snapshot, rollback-poststate proof, and route QA',
    ],
  },
  payloadSha256: null,
};
report.payloadSha256 = sha256(JSON.stringify(report));

fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# MP01 Cheyenne chamber terminal — current-source survey\n\n`
  + `**Status:** ${report.status}. This is a source-bound design input, not a construction release.\n\n`
  + `- Complete save: \`${report.source.completeSaveSha256}\`\n`
  + `- Chamber envelope: ${chamber.cellCount.toLocaleString()} cells, hash \`${chamber.coordinateSetSha256}\`\n`
  + `- Retained B03 cap: ${cap.cellCount} cells; stone ${cap.stateCensus['minecraft:stone'] ?? 0}/${cap.cellCount}\n`
  + `- Terminal study: ${terminal.cellCount.toLocaleString()} cells, hash \`${terminal.coordinateSetSha256}\`\n`
  + `- Chamber hazards: ${chamber.fluidCells.length} fluid, ${chamber.gravityCells.length} gravity, ${chamber.containerOrControlCells.length} container/control; saved entities ${chamberEntities.savedEntities.length}\n\n`
  + `## Release boundary\n\n`
  + `The retained B03 cap stays closed. The next physical package must be a functional controlled terminal—not cap removal or a cosmetic alcove—and must establish the two protected directions, 5×5 common spine/landings, and a separately surveyed lift-analogue destination. It must re-capture a fresh source immediately before execution.\n`;
fs.mkdirSync(path.dirname(absolute(MARKDOWN)), { recursive: true });
fs.writeFileSync(absolute(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(OUT), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
