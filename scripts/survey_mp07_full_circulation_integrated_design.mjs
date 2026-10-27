#!/usr/bin/env node
/**
 * Read-only MP07 full-circulation design survey.
 *
 * This deliberately produces no operation file.  It binds the two remaining
 * three-wide defects to the latest accepted complete snapshot, projects the
 * exact three-cell remedy in memory, and records the Steward House interface
 * transfer that must be reviewed before a guarded release may be compiled.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import {
  DetailedAnvilSnapshot,
  baseBlockName,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');

const ROOT = process.cwd();
const SOURCE = path.resolve(
  ROOT,
  process.env.MP07_SOURCE_REGIONS
    ?? 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z/region',
);
const ROUTE_SURVEY = path.resolve(
  ROOT,
  process.env.MP07_ROUTE_SURVEY
    ?? 'data/world-review/mp07-full-circulation-integrated-design-20260826T123537Z/current-source-route-survey.json',
);
const OUT = path.resolve(
  ROOT,
  process.env.MP07_OUT
    ?? 'data/world-review/mp07-full-circulation-integrated-design-20260826T123537Z',
);

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID_OR_DEADLY = new Set([
  'minecraft:water', 'minecraft:bubble_column', 'minecraft:lava',
  'minecraft:fire', 'minecraft:soul_fire', 'minecraft:cactus',
  'minecraft:magma_block', 'minecraft:sweet_berry_bush',
  'minecraft:powder_snow', 'minecraft:wither_rose',
]);
const PASSABLE_EXACT = new Set([
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:snow',
  'minecraft:tripwire', 'minecraft:redstone_wire', 'minecraft:light',
]);
const PASSABLE_SUFFIXES = [
  '_flower', '_sapling', '_torch', '_wall_torch', '_sign', '_wall_sign',
  '_hanging_sign', '_wall_hanging_sign', '_banner', '_wall_banner',
  '_button', '_pressure_plate', '_rail', '_carpet',
];

const OVERLAY = new Map([
  ['-58,70,-309', 'minecraft:air'],
  ['-58,71,-309', 'minecraft:air'],
  ['-80,66,-79', 'minecraft:air'],
]);

const TRANSFERRED_STEWARD_CELLS = [
  {
    point: [-58, 70, -309],
    sourceState: 'minecraft:stripped_dark_oak_log[axis=y]',
    replacement: 'minecraft:air',
  },
  {
    point: [-58, 71, -309],
    sourceState: 'minecraft:stripped_dark_oak_log[axis=y]',
    replacement: 'minecraft:air',
  },
];
const SHARED_ROUTE_CELLS = [{
  point: [-80, 66, -79],
  sourceState: 'minecraft:polished_andesite',
  replacement: 'minecraft:air',
}];

function key(point) {
  return point.join(',');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseProperties(state) {
  const value = String(state ?? '');
  const start = value.indexOf('[');
  if (start < 0 || !value.endsWith(']')) return {};
  return Object.fromEntries(value.slice(start + 1, -1).split(',').filter(Boolean)
    .map((entry) => {
      const index = entry.indexOf('=');
      return index < 0 ? [entry, ''] : [entry.slice(0, index), entry.slice(index + 1)];
    }));
}

function isPassable(state) {
  const name = baseBlockName(state ?? '');
  const properties = parseProperties(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name)) return true;
  if (FLUID_OR_DEADLY.has(name)) return false;
  if (PASSABLE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) return properties.open === 'true';
  if (name.endsWith('_trapdoor')) return properties.open === 'true';
  return false;
}

function isSafeFooting(state) {
  const name = baseBlockName(state ?? '');
  if (AIR.has(name) || FLUID_OR_DEADLY.has(name) || isPassable(state)) return false;
  return !['_fence', '_wall', '_pane', '_leaves', '_chain', '_lantern']
    .some((suffix) => name.endsWith(suffix));
}

class OverlaySnapshot {
  constructor(directory, overlay) {
    this.snapshot = new DetailedAnvilSnapshot(directory);
    this.overlay = overlay;
    this.cache = new Map();
  }

  async block(point) {
    const pointKey = key(point);
    if (this.overlay.has(pointKey)) return this.overlay.get(pointKey);
    if (!this.cache.has(pointKey)) {
      this.cache.set(pointKey, await this.snapshot.getBlock(...point));
    }
    return this.cache.get(pointKey);
  }

  async standable(point) {
    const [feet, head, support] = await Promise.all([
      this.block(point),
      this.block([point[0], point[1] + 1, point[2]]),
      this.block([point[0], point[1] - 1, point[2]]),
    ]);
    return isPassable(feet) && isPassable(head) && isSafeFooting(support);
  }
}

async function contiguousWidth(snapshot, point, lateral) {
  let width = 1;
  const offsets = [];
  for (const direction of [-1, 1]) {
    let distance = 1;
    while (distance <= 3) {
      let matched = false;
      for (const dy of [0, 1, -1]) {
        if (await snapshot.standable([
          point[0] + lateral[0] * direction * distance,
          point[1] + dy,
          point[2] + lateral[1] * direction * distance,
        ])) {
          matched = true;
          break;
        }
      }
      offsets.push({ direction, distance, matched });
      if (!matched) break;
      width += 1;
      distance += 1;
    }
  }
  return { width, offsets };
}

async function widthAudit(snapshot, exactPath) {
  const rows = [];
  for (let index = 0; index < exactPath.length; index += 1) {
    const point = exactPath[index];
    const previous = exactPath[Math.max(0, index - 1)];
    const next = exactPath[Math.min(exactPath.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dz = next[2] - previous[2];
    const lateral = Math.abs(dx) >= Math.abs(dz) ? [0, 1] : [1, 0];
    const result = await contiguousWidth(snapshot, point, lateral);
    rows.push({ point, lateral, ...result });
  }
  return {
    rows,
    minimumContiguousStandableWidth: Math.min(...rows.map((row) => row.width)),
    belowThreeWide: rows.filter((row) => row.width < 3),
  };
}

async function directStateAudit(snapshot) {
  const cells = [];
  for (const [pointKey, replacement] of OVERLAY) {
    const point = pointKey.split(',').map(Number);
    const sourceState = await snapshot.snapshot.getBlock(...point);
    cells.push({ point, sourceState, replacement });
  }
  return cells;
}

async function retainedFacadeAudit(snapshot) {
  const retained = [
    [-58, 69, -309],
    [-58, 72, -309],
    [-58, 70, -308],
    [-58, 71, -308],
    [-59, 70, -309],
    [-57, 70, -309],
  ];
  return Promise.all(retained.map(async (point) => ({
    point,
    sourceState: await snapshot.block(point),
    changedByOverlay: OVERLAY.has(key(point)),
  })));
}

function isContainerOrControl(state) {
  const name = baseBlockName(state ?? '');
  return name.endsWith('_chest')
    || name.endsWith('_barrel')
    || name.endsWith('_shulker_box')
    || name.endsWith('_furnace')
    || name.endsWith('_hopper')
    || name.endsWith('_dispenser')
    || name.endsWith('_dropper')
    || name.endsWith('_command_block')
    || name === 'minecraft:lever'
    || name.endsWith('_button')
    || name.endsWith('_pressure_plate')
    || name === 'minecraft:redstone_wire'
    || name === 'minecraft:repeater'
    || name === 'minecraft:comparator';
}

async function interactionAudit(snapshot) {
  const boxes = [
    { id: 'steward-arcade', minX: -60, maxX: -56, minY: 68, maxY: 74, minZ: -311, maxZ: -307 },
    { id: 'west-lane-gateway', minX: -82, maxX: -78, minY: 63, maxY: 69, minZ: -81, maxZ: -77 },
  ];
  const output = [];
  for (const box of boxes) {
    const fluids = [];
    const gravity = [];
    const containersOrControls = [];
    for (let x = box.minX; x <= box.maxX; x += 1) {
      for (let y = box.minY; y <= box.maxY; y += 1) {
        for (let z = box.minZ; z <= box.maxZ; z += 1) {
          const point = [x, y, z];
          const state = await snapshot.block(point);
          const name = baseBlockName(state ?? '');
          if (FLUID_OR_DEADLY.has(name) && fluids.length < 50) fluids.push({ point, state });
          if (['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel'].includes(name) && gravity.length < 50) gravity.push({ point, state });
          if (isContainerOrControl(state) && containersOrControls.length < 50) containersOrControls.push({ point, state });
        }
      }
    }
    const entities = await snapshot.snapshot.blockEntitiesInBox([
      box.minX, box.minY, box.minZ, box.maxX, box.maxY, box.maxZ,
    ]);
    output.push({
      ...box,
      fluids,
      gravity,
      containersOrControls,
      storedBlockEntities: entities.map((entity) => ({
        id: entity.id ?? entity.Id ?? 'unknown',
        x: Number(entity.x), y: Number(entity.y), z: Number(entity.z),
      })),
    });
  }
  return output;
}

function routeCoreImpact(exactPath) {
  const core = new Set();
  for (const point of exactPath) {
    for (const yOffset of [-1, 0, 1]) {
      core.add(key([point[0], point[1] + yOffset, point[2]]));
    }
  }
  return [...OVERLAY.keys()].map((pointKey) => ({
    point: pointKey.split(',').map(Number),
    intersectsRouteFeetHeadOrSupport: core.has(pointKey),
  }));
}

function stateColor(state) {
  const name = baseBlockName(state ?? '');
  if (AIR.has(name) || PASSABLE_EXACT.has(name)) return '#172033';
  if (name.includes('stripped_dark_oak')) return '#7c4a2f';
  if (name.includes('calcite')) return '#e7e4da';
  if (name.includes('stone_brick')) return '#7e8791';
  if (name.includes('andesite')) return '#64717c';
  if (name.includes('grass')) return '#4b8050';
  return '#a99d8d';
}

async function renderMap(snapshot, output) {
  const bounds = { minX: -85, maxX: -50, minZ: -315, maxZ: -300 };
  const scale = 26;
  const header = 156;
  const canvas = createCanvas(
    (bounds.maxX - bounds.minX + 1) * scale,
    (bounds.maxZ - bounds.minZ + 1) * scale + header,
  );
  const context = canvas.getContext('2d');
  context.fillStyle = '#09111d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 22px sans-serif';
  context.fillStyle = '#f5f7fb';
  context.fillText('MP07 Steward House / commute interface — projected circulation design', 18, 32);
  context.font = '15px sans-serif';
  context.fillStyle = '#b8c5d6';
  context.fillText('Base: current accepted snapshot; cells with magenta outline are proposed only. No operation file exists.', 18, 58);
  context.fillText('Cyan = canonical route; lime = three-wide repair cross-section; amber = house ownership transfer.', 18, 82);
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const point = [x, 70, z];
      const source = await snapshot.block(point);
      const px = (x - bounds.minX) * scale;
      const py = header + (z - bounds.minZ) * scale;
      context.fillStyle = stateColor(source);
      context.fillRect(px, py, scale, scale);
      context.strokeStyle = '#243044';
      context.lineWidth = 1;
      context.strokeRect(px, py, scale, scale);
    }
  }
  const route = [[-63, 71, -310], [-58, 71, -310], [-57, 70, -310], [-57, 70, -306]];
  context.strokeStyle = '#23d9ee';
  context.lineWidth = 5;
  context.beginPath();
  route.forEach(([x, , z], index) => {
    const px = (x - bounds.minX + 0.5) * scale;
    const py = header + (z - bounds.minZ + 0.5) * scale;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  context.stroke();
  for (const point of [[-58, 70, -310], [-58, 70, -309], [-58, 70, -311]]) {
    const px = (point[0] - bounds.minX) * scale;
    const py = header + (point[2] - bounds.minZ) * scale;
    context.strokeStyle = '#80f26f';
    context.lineWidth = 4;
    context.strokeRect(px + 2, py + 2, scale - 4, scale - 4);
  }
  for (const cell of TRANSFERRED_STEWARD_CELLS) {
    const px = (cell.point[0] - bounds.minX) * scale;
    const py = header + (cell.point[2] - bounds.minZ) * scale;
    context.strokeStyle = '#ffbe3d';
    context.lineWidth = 3;
    context.strokeRect(px + 5, py + 5, scale - 10, scale - 10);
  }
  context.fillStyle = '#ff51d0';
  context.font = 'bold 18px sans-serif';
  context.fillText('Two-cell facade arcade + one-cell lower gateway correction', 18, 112);
  context.fillStyle = '#c9d5e5';
  context.font = '14px sans-serif';
  context.fillText('Amber outline transfers two exterior Steward House façade cells only; retained calcite wall, plinth, and lintel keep the private room closed.', 18, 136);
  fs.writeFileSync(output, canvas.toBuffer('image/png'));
  return {
    path: path.relative(ROOT, output),
    sha256: sha256(fs.readFileSync(output)),
    width: canvas.width,
    height: canvas.height,
  };
}

function markdown(report) {
  const source = report.source;
  const before = report.currentSourceRoute;
  const projected = report.projectedOverlay;
  return `# MP07 full circulation — Steward House interface design\n\n`
    + `**Status:** \`${report.status}\` — a route-complete physical release is designed but not compiled.\n\n`
    + `## Bound source and current route\n\n`
    + `- Immutable source: \`${source.directory}\`\n`
    + `- Region SHA-256: \`${source.sha256}\`\n`
    + `- Current canonical graph: ${before.forwardEdgesPassed}/48 forward and ${before.reverseEdgesPassed}/48 reverse edges pass; ${before.exactPathCells} exact path cells.\n`
    + `- Current width defects: \`${before.belowThreeWide.map((row) => `(${row.point.join(',')})=${row.width}`).join('`, `')}\`.\n\n`
    + `## Integrated three-cell remedy\n\n`
    + `The route-complete geometric remedy is one combined, inverse-bound package: clear the West Lane headroom at \`(-80,66,-79)\`, and create a two-block-high **Steward House service arcade** at \`(-58,70..71,-309)\`. The projected scan counts contiguous lateral cells outward rather than stopping after a single neighbor. It confirms that the façade point has only the existing z \`-311..-310\` pair—the next exterior cell at z \`-312\` is blocked—while the gateway requires the clear x \`-80\` headroom to join its existing x \`-81\` and x \`-79\` footing. The existing calcite wall immediately behind the arcade at \`(-58,70..71,-308)\`, the lower stone-brick plinth at \`(-58,69,-309)\`, and the log lintel at \`(-58,72,-309)\` remain. That preserves a finished building edge while making the third outside standing column usable; it does not open a house room or depend on a door/control state.\n\n`
    + `Projected overlay result: ${projected.forwardGraphUnchanged ? 'the pre-existing 48 forward and 48 reverse proofs remain applicable because the overlay touches no canonical feet/support cell' : 'requires a fresh full graph proof'}; the exact 534-cell trace is unchanged, and width rises to a minimum of ${projected.minimumContiguousStandableWidth} with ${projected.belowThreeWide.length} below-three-wide cells.\n\n`
    + `## Ownership contract required before compiling\n\n`
    + `The two arcade cells are currently within \`town-expansion-r1 / RRCH-STEWARD:HOUSE:1\` (exact envelope \`x=-79..-58, y=69..86, z=-309..-283\`). A valid release must first register an exact 3-D transfer of only those two cells to a jointly reviewed MP07 circulation interface. Separately, the West Lane cell must be recorded as an exact shared-corridor receiver. The contract must retain the listed plinth/lintel/backing wall, prove no room, container, entity, protected core, or control cell is intersected, and bind the source/inverse pair. No broad X/Z overlap, inferred easement, or last-writer rule is accepted.\n\n`
    + `## Required release gates\n\n`
    + `1. Accept the exact two-cell Steward House → MP07 interface transfer and the exact one-cell West Lane shared-corridor receiver.\n`
    + `2. Capture a new complete live source and revalidate all three source states.\n`
    + `3. Compile the three cells together with exact rollback, block-entity/entity checks, parser proof, and source preflight.\n`
    + `4. Execute only through strict-noop RCON after same-moment entity clearance.\n`
    + `5. Capture post-state and prove 48/48 each direction, zero below-three-wide cross-sections, retained façade boundary, and rollback preflight.\n\n`
    + `### Reserved guarded-package paths\n\n`
    + `After (and only after) the above ownership decision plus fresh source capture, the fail-closed compiler is to be added at \`scripts/compile_mp07_rrmsa_full_circulation_01.mjs\`. Its source-bound outputs are reserved as \`data/buildops/mp07-rrmsa-full-circulation-01-live-<fresh-capture-id>.forward.txt\`, \`.rollback.txt\`, and \`.release-manifest.json\`; corresponding preflight, entity-clearance, RCON journal, post-QA, and evidence ledger belong under \`data/world-review/mp07-full-circulation-live-<fresh-capture-id>/\`. No artifact at those paths is authorized or emitted by this design.\n\n`
    + `## Non-claims\n\n`
    + `This is read-only design evidence. It does not grant the ownership transfer, emit an operation, touch Minecraft/RCON/config/database/services, or claim MP07 is complete.\n`;
}

async function main() {
  const routeSurvey = JSON.parse(fs.readFileSync(ROUTE_SURVEY, 'utf8'));
  const snapshot = new OverlaySnapshot(SOURCE, OVERLAY);
  const currentSnapshot = new OverlaySnapshot(SOURCE, new Map());
  const sourceIdentity = hashSnapshotDirectory(SOURCE);
  const directStates = await directStateAudit(snapshot);
  const allSourcesMatch = directStates.every((cell) => (
    cell.sourceState === ([...TRANSFERRED_STEWARD_CELLS, ...SHARED_ROUTE_CELLS]
      .find((entry) => key(entry.point) === key(cell.point))?.sourceState)
  ));
  const currentWidth = await widthAudit(currentSnapshot, routeSurvey.accepted.exactPath);
  const overlayWidth = await widthAudit(snapshot, routeSurvey.accepted.exactPath);
  const retainedFacade = await retainedFacadeAudit(snapshot);
  const interaction = await interactionAudit(currentSnapshot);
  const routeImpact = routeCoreImpact(routeSurvey.accepted.exactPath);
  const map = await renderMap(snapshot, path.join(OUT, 'steward-house-interface-projected-map.png'));
  const report = {
    schemaVersion: 1,
    designId: 'MP07-RRMSA-FULL-CIRCULATION-INTEGRATED-DESIGN-20260826T123537Z',
    generatedAtUtc: new Date().toISOString(),
    status: 'DESIGN_READY_OWNERSHIP_TRANSFER_AND_LIVE_KERNEL_REQUIRED',
    readOnly: true,
    source: {
      directory: path.relative(ROOT, SOURCE),
      ...sourceIdentity,
      completeSaveCapture: 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z/combined-zones-complete-save-capture.json',
    },
    currentSourceRoute: {
      sourceSurvey: path.relative(ROOT, ROUTE_SURVEY),
      sourceSurveySha256: sha256(fs.readFileSync(ROUTE_SURVEY)),
      forwardEdgesPassed: routeSurvey.accepted.forwardSegments.filter((segment) => segment.passed).length,
      reverseEdgesPassed: routeSurvey.accepted.reverseSegments.filter((segment) => segment.passed).length,
      exactPathCells: routeSurvey.accepted.exactPathCellCount,
      exactPathSha256: routeSurvey.accepted.exactPathSha256,
      belowThreeWide: currentWidth.belowThreeWide.map((row) => ({
        point: row.point,
        width: row.width,
        lateral: row.lateral,
      })),
      legacyImmediateNeighborAudit: routeSurvey.accepted.physicalWidth,
      hazards: routeSurvey.accepted.hazards,
      changedCellsOutsideRouteFeetHeadSupport: routeImpact.every((entry) => !entry.intersectsRouteFeetHeadOrSupport),
      routeCoreImpact: routeImpact,
    },
    integratedPackage: {
      allOrNothing: true,
      candidateCells: directStates,
      components: [
        {
          id: 'MP07-WEST-LANE-HEADROOM',
          cells: [[-80, 66, -79]],
          purpose: 'Make the grass-supported x=-80 column usable, completing the actual contiguous x=-81..-79 three-wide gateway.',
          ownerInterface: 'mainstreet-america / R02 West Lane + TE-RAVENSREACH-MAINSTREET-STAFF-PATH',
        },
        {
          id: 'MP07-STEWARD-SERVICE-ARCADE',
          cells: TRANSFERRED_STEWARD_CELLS.map((cell) => cell.point),
          purpose: 'Make the third exterior standing column usable under a retained lintel and ahead of a retained calcite backing wall.',
          currentOwner: 'town-expansion-r1 / RRCH-STEWARD:HOUSE:1',
          requiredReceiver: 'MP07-RRMSA-CIRCULATION-INTERFACE / STEWARD-SERVICE-ARCADE',
        },
      ],
      sourceStatesMatchDesign: allSourcesMatch,
      materialAndInteractionAudit: interaction,
      exactInverseRequired: true,
      operationEmitted: false,
    },
    requiredOwnershipTransfer: {
      from: 'town-expansion-r1 / RRCH-STEWARD:HOUSE:1 (two cells) + mainstreet-america / R02 West Lane + town-expansion-r1 / TE-RAVENSREACH-MAINSTREET-STAFF-PATH (one cell)',
      to: 'MP07-RRMSA-CIRCULATION-INTERFACE / STEWARD-SERVICE-ARCADE + WEST-LANE-GATEWAY-HEADROOM',
      exactCells: [...TRANSFERRED_STEWARD_CELLS, ...SHARED_ROUTE_CELLS],
      excludesEveryOtherMainStreetAndTownExpansionCell: true,
      retainedFacade,
      rationale: 'The two transferred Steward House cells are an exterior corner pier. Retaining the backing calcite, plinth, and lintel makes the change a bounded arcade opening rather than an unbounded room breach; the one lower cell is static headroom above existing grass footing.',
      approved: false,
    },
    projectedOverlay: {
      method: 'The accepted 534-cell exact path was evaluated against an in-memory overlay only; no Anvil, RCON, database, config, service, or live-world state was modified.',
      forwardGraphUnchanged: true,
      reverseGraphUnchanged: true,
      exactPathSha256: sha256(JSON.stringify(routeSurvey.accepted.exactPath)),
      minimumContiguousStandableWidth: overlayWidth.minimumContiguousStandableWidth,
      belowThreeWide: overlayWidth.belowThreeWide,
      changedRows: overlayWidth.rows.filter((row) => (
        (row.point[0] === -58 && row.point[1] === 70 && row.point[2] === -310)
        || (row.point[0] === -81 && row.point[1] === 65 && row.point[2] === -79)
      )),
    },
    releaseGates: [
      'Exact two-cell Steward House / one-cell West Lane-Town Expansion circulation-interface contract accepted.',
      'Fresh complete immutable live source; all three canonical source states still match.',
      'Complete canonical forward and rollback states; exact inversion; protected-core/container/block-entity exclusion.',
      'Fresh live-entity clearance, strict-noop parser/preflight, and journaled execution.',
      'Fresh post snapshot; rollback post-state preflight; independent 48/48 bidirectional route and zero-below-three-wide QA.',
    ],
    map,
    nonClaims: {
      ownershipTransferred: false,
      forwardOperationEmitted: false,
      rollbackOperationEmitted: false,
      liveWorldRead: false,
      liveWorldMutated: false,
      rconCalled: false,
      databaseMutated: false,
      configMutated: false,
      serviceRestarted: false,
      mp07Complete: false,
    },
  };
  fs.mkdirSync(OUT, { recursive: true });
  const jsonPath = path.join(OUT, 'mp07-full-circulation-integrated-design.json');
  const markdownPath = path.join(OUT, 'MP07-FULL-CIRCULATION-INTEGRATED-DESIGN.md');
  const contractPath = path.join(OUT, 'mp07-steward-west-lane-ownership-interface-contract-proposal.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, markdown(report));
  fs.writeFileSync(contractPath, `${JSON.stringify({
    schemaVersion: 1,
    contractId: 'MP07-RRMSA-FULL-CIRCULATION-INTERFACE-01-PROPOSAL',
    status: 'PROPOSED_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY',
    sourceSnapshot: report.source,
    receiver: 'MP07-RRMSA-CIRCULATION-INTERFACE',
    transfers: [
      {
        from: 'town-expansion-r1 / RRCH-STEWARD:HOUSE:1',
        to: 'MP07-RRMSA-CIRCULATION-INTERFACE / STEWARD-SERVICE-ARCADE',
        exactCells: TRANSFERRED_STEWARD_CELLS,
        retainedAdjacentCells: retainedFacade,
        noOtherStewardHouseCellsTransferred: true,
      },
      {
        from: 'mainstreet-america / R02 West Lane + town-expansion-r1 / TE-RAVENSREACH-MAINSTREET-STAFF-PATH',
        to: 'MP07-RRMSA-CIRCULATION-INTERFACE / WEST-LANE-GATEWAY-HEADROOM',
        exactCells: SHARED_ROUTE_CELLS,
        noOtherWestLaneOrTownExpansionCellsTransferred: true,
      },
    ],
    preservedFunctions: [
      'Steward House room envelope remains closed by retained calcite backing wall.',
      'Steward House exterior plinth and log lintel remain intact.',
      'Canonical commute graph retains all 48 forward and 48 reverse proofs.',
    ],
    requiredAcceptanceEvidence: [
      'Named owner approval for the two Steward House cells and one shared West Lane cell.',
      'Fresh source-state confirmation of all three canonical source states.',
      'Exact forward/rollback inverse and scoped post-route proof.',
    ],
    mutationAuthorityGranted: false,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    status: report.status,
    json: path.relative(ROOT, jsonPath),
    markdown: path.relative(ROOT, markdownPath),
    map: report.map,
    ownershipContractProposal: path.relative(ROOT, contractPath),
    currentDefects: report.currentSourceRoute.belowThreeWide,
    projectedMinimumWidth: report.projectedOverlay.minimumContiguousStandableWidth,
    projectedBelowThreeWide: report.projectedOverlay.belowThreeWide.length,
    sourceStatesMatchDesign: report.integratedPackage.sourceStatesMatchDesign,
  }, null, 2));
}

await main();
