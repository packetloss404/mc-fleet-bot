#!/usr/bin/env node
/**
 * Survey the four below-three-wide Ravensreach<->MainStreet corridor chokes
 * against the accepted immutable r08am post snapshot, and emit a candidate
 * widening cell set (survey only; NO build).
 *
 * Standability model mirrors survey_citizen_cross_city_route.mjs so the
 * reported widths reproduce the accepted survey. The r08am snapshot is the
 * current accepted complete-save baseline (2026-08-22T161818Z).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const REGIONS = path.resolve(
  ROOT,
  process.env.RRCH_MSA_WIDENING_REGIONS
    ?? 'data/worldsnap-r08am-post-20260822T161818Z/region',
);
const ROUTE_JSON = path.resolve(
  ROOT,
  'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
);
const OUT_DIR = path.resolve(
  ROOT,
  process.env.RRCH_MSA_WIDENING_OUT
    ?? 'data/world-review/ravensreach-mainstreet-widening-survey-20260824',
);

const reader = new AnvilReader(REGIONS);
const snapshotRoot = path.dirname(REGIONS);
const snapshotRelative = path.relative(ROOT, snapshotRoot).split(path.sep).join('/');
const st = (s) => stateToCommandString(s);
const base = (s) => String(s ?? '').split('[')[0];

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:bubble_column', 'minecraft:lava']);
const DEADLY = new Set([
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

function parseProperties(state) {
  const source = String(state ?? '');
  const start = source.indexOf('[');
  if (start < 0 || !source.endsWith(']')) return {};
  return Object.fromEntries(source.slice(start + 1, -1).split(',')
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf('=');
      return separator < 0
        ? [entry, '']
        : [entry.slice(0, separator), entry.slice(separator + 1)];
    }));
}

function isPassable(state) {
  const name = base(state ?? '');
  const properties = parseProperties(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name)) return true;
  if (FLUID.has(name) || DEADLY.has(name)) return false;
  if (PASSABLE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) {
    return properties.open === 'true';
  }
  if (name.endsWith('_trapdoor')) return properties.open === 'true';
  return false;
}

function isSafeFooting(state) {
  const name = base(state ?? '');
  if (AIR.has(name) || FLUID.has(name) || DEADLY.has(name) || isPassable(state)) {
    return false;
  }
  if (
    name.endsWith('_fence') || name.endsWith('_wall')
    || name.endsWith('_pane') || name.endsWith('_leaves')
    || name.endsWith('_chain') || name.endsWith('_lantern')
  ) {
    return false;
  }
  return true;
}

async function standable(x, y, z) {
  const feet = st(await reader.blockState(x, y, z));
  const head = st(await reader.blockState(x, y + 1, z));
  const support = st(await reader.blockState(x, y - 1, z));
  return isPassable(feet) && isPassable(head) && isSafeFooting(support);
}

const coordinateKey = (point) => point.join(',');

function boundsOf(cells) {
  const out = {
    minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity,
  };
  for (const [x, y, z] of cells) {
    out.minX = Math.min(out.minX, x);
    out.maxX = Math.max(out.maxX, x);
    out.minY = Math.min(out.minY, y);
    out.maxY = Math.max(out.maxY, y);
    out.minZ = Math.min(out.minZ, z);
    out.maxZ = Math.max(out.maxZ, z);
  }
  return out;
}

function cellSetSha256(cells) {
  const keys = [...new Set(cells.map(coordinateKey))].sort();
  return crypto.createHash('sha256').update(keys.join('\n')).digest('hex');
}

async function blockEntitiesInBox(x0, x1, y0, y1, z0, z1) {
  const out = [];
  for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz += 1) {
    for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx += 1) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const x = Number(entity.x);
        const y = Number(entity.y);
        const z = Number(entity.z);
        if (x < x0 || x > x1 || z < z0 || z > z1 || y < y0 || y > y1) continue;
        out.push({ id: entity.id ?? entity.Id ?? 'unknown', x, y, z });
      }
    }
  }
  return out;
}

// Per-choke widening candidate cell sets (survey-only proposals).
// 3-wide target: open the walkable envelope to >=3 contiguous standable cells.
// 5-wide target (civic promenade): additionally open the eastern fence posts.
const CHOKE_PLANS = [
  {
    id: 'RRMSA-NARROW-1',
    chokePoint: [-82, 65, -206],
    reportedWidth: 2,
    obstruction: 'protruding polished-blackstone wall/lantern pillar at x=-83 (z=-206)',
    threeWide: [[-83, 65, -206], [-83, 66, -206], [-83, 67, -206], [-83, 68, -206]],
    fiveWide: [[-83, 65, -206], [-83, 66, -206], [-83, 67, -206], [-83, 68, -206], [-80, 65, -206]],
  },
  {
    id: 'RRMSA-NARROW-2',
    chokePoint: [-82, 66, -158],
    reportedWidth: 2,
    obstruction: 'protruding polished-blackstone wall/lantern pillar at x=-83 (z=-158)',
    threeWide: [[-83, 66, -158], [-83, 67, -158], [-83, 68, -158], [-83, 69, -158]],
    fiveWide: [[-83, 66, -158], [-83, 67, -158], [-83, 68, -158], [-83, 69, -158], [-80, 66, -158]],
  },
  {
    id: 'RRMSA-NARROW-3',
    chokePoint: [-82, 65, -110],
    reportedWidth: 2,
    obstruction: 'protruding polished-blackstone wall/lantern pillar at x=-83 (z=-110)',
    threeWide: [[-83, 65, -110], [-83, 66, -110], [-83, 67, -110], [-83, 68, -110]],
    fiveWide: [[-83, 65, -110], [-83, 66, -110], [-83, 67, -110], [-83, 68, -110], [-84, 65, -110], [-80, 65, -110]],
  },
  {
    id: 'RRMSA-NARROW-4',
    chokePoint: [-79, 65, -79],
    reportedWidth: 1,
    obstruction: 'gateway columns + birch fence + masonry building wall to the east (x=-78..) and paved drop-off at z=-80',
    threeWide: [[-80, 65, -79], [-80, 66, -79], [-81, 66, -79]],
    fiveWide: [
      [-80, 65, -79], [-80, 66, -79], [-81, 65, -79], [-81, 66, -79],
      [-82, 66, -79], [-83, 66, -79],
    ],
  },
];

const routeJson = JSON.parse(fs.readFileSync(ROUTE_JSON, 'utf8'));
const exactPath = routeJson.accepted.exactPath;

async function widthAfterClear(point, lateral, cleared, scanHalf = 2) {
  const clearedSet = new Set(cleared.map(coordinateKey));
  async function blockAt(x, y, z) {
    if (clearedSet.has([x, y, z].join(','))) return 'minecraft:air';
    return st(await reader.blockState(x, y, z));
  }
  async function stand(x, y, z) {
    const feet = await blockAt(x, y, z);
    const head = await blockAt(x, y + 1, z);
    const support = await blockAt(x, y - 1, z);
    return isPassable(feet) && isPassable(head) && isSafeFooting(support);
  }
  const clearOffsets = [];
  for (let offset = -scanHalf; offset <= scanHalf; offset += 1) {
    const x = point[0] + lateral[0] * offset;
    const z = point[2] + lateral[1] * offset;
    let flag = false;
    for (const dy of [0, 1, -1]) {
      if (await stand(x, point[1] + dy, z)) { flag = true; break; }
    }
    if (flag) clearOffsets.push(offset);
  }
  let contiguous = 1;
  for (let offset = -1; clearOffsets.includes(offset); offset -= 1) contiguous += 1;
  for (let offset = 1; clearOffsets.includes(offset); offset += 1) contiguous += 1;
  return { contiguous, clearOffsets };
}

async function main() {
  // Full-path width scan: reproduce the survey width audit on every path cell
  // to surface any below-3-wide cell beyond the four contract chokes.
  const widthRows = [];
  for (let index = 0; index < exactPath.length; index += 1) {
    const point = exactPath[index];
    const previous = exactPath[Math.max(0, index - 1)];
    const next = exactPath[Math.min(exactPath.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dz = next[2] - previous[2];
    const lateral = Math.abs(dx) >= Math.abs(dz) ? [0, 1] : [1, 0];
    const clearOffsets = [];
    for (let offset = -2; offset <= 2; offset += 1) {
      const x = point[0] + lateral[0] * offset;
      const z = point[2] + lateral[1] * offset;
      let flag = false;
      for (const dy of [0, 1, -1]) {
        if (await standable(x, point[1] + dy, z)) { flag = true; break; }
      }
      if (flag) clearOffsets.push(offset);
    }
    let contiguous = 1;
    for (let offset = -1; clearOffsets.includes(offset); offset -= 1) contiguous += 1;
    for (let offset = 1; clearOffsets.includes(offset); offset += 1) contiguous += 1;
    widthRows.push({ point, contiguousWidth: contiguous });
  }
  const contractKeys = new Set(CHOKE_PLANS.map((c) => coordinateKey(c.chokePoint)));
  const additionalNarrowCells = widthRows
    .filter((r) => r.contiguousWidth < 3 && !contractKeys.has(coordinateKey(r.point)))
    .map((r) => ({ point: r.point, contiguousWidth: r.contiguousWidth }));

  const narrowSections = [];
  for (const plan of CHOKE_PLANS) {
    const index = exactPath.findIndex(
      (c) => coordinateKey(c) === coordinateKey(plan.chokePoint),
    );
    const previous = exactPath[Math.max(0, index - 1)];
    const next = exactPath[Math.min(exactPath.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dz = next[2] - previous[2];
    const lateral = Math.abs(dx) >= Math.abs(dz) ? [0, 1] : [1, 0];

    const three = await widthAfterClear(plan.chokePoint, lateral, plan.threeWide);
    const five = await widthAfterClear(plan.chokePoint, lateral, plan.fiveWide);

    // Conflict scan: fluids, doors, container/protected blocks in the candidate box
    const [px, py, pz] = plan.chokePoint;
    const nearbyBlockEntities = await blockEntitiesInBox(
      px - 3, px + 3, py - 2, py + 4, pz - 3, pz + 3,
    );

    const threeCells = [...new Map(
      plan.threeWide.map((c) => [coordinateKey(c), c]),
    ).values()];
    const fiveCells = [...new Map(
      plan.fiveWide.map((c) => [coordinateKey(c), c]),
    ).values()];

    // Current source state of every candidate cell (feet/head/support)
    const currentStates = {};
    const allPlanCells = [...new Map(
      [...plan.threeWide, ...plan.fiveWide].map((c) => [coordinateKey(c), c]),
    ).values()];
    for (const [x, y, z] of allPlanCells) {
      currentStates[coordinateKey([x, y, z])] = {
        block: st(await reader.blockState(x, y, z)),
      };
    }

    narrowSections.push({
      id: plan.id,
      chokePoint: plan.chokePoint,
      pathIndex: index,
      reportedWidth: plan.reportedWidth,
      obstruction: plan.obstruction,
      lateral: { axis: lateral[0] === 0 ? 'z' : 'x', vector: lateral },
      threeWide: {
        bounds: boundsOf(threeCells),
        cellCount: threeCells.length,
        coordinateSetSha256: cellSetSha256(threeCells),
        projectedWidth: three.contiguous,
        cells: threeCells,
      },
      fiveWide: {
        bounds: boundsOf(fiveCells),
        cellCount: fiveCells.length,
        coordinateSetSha256: cellSetSha256(fiveCells),
        projectedWidth: five.contiguous,
        cells: fiveCells,
      },
      nearbyBlockEntities,
      currentStates,
    });
  }

  const allThree = [];
  const allFive = [];
  for (const section of narrowSections) {
    allThree.push(...section.threeWide.cells);
    allFive.push(...section.fiveWide.cells);
  }

  const report = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    mode: 'READ_ONLY_SURVEY_NO_WORLD_EDIT',
    surveyId: 'RRCH-MSA-WIDENING-SURVEY-2026-08-24',
    source: {
      snapshot: `${snapshotRelative}/region`,
      regionCount: fs.readdirSync(REGIONS).filter((n) => n.endsWith('.mca')).length,
      snapshotCapture: `${snapshotRelative}/combined-zones-complete-save-capture.json`,
      acceptedRouteSurvey: 'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
      exactPathCellCount: exactPath.length,
      exactPathSha256: routeJson.exactPathSha256,
      contractChokes: CHOKE_PLANS.map((c) => ({ point: c.chokePoint, reportedWidth: c.reportedWidth })),
    },
    routePath: {
      purpose: routeJson.routePurpose,
      anchors: routeJson.accepted.anchors,
      cellCount: exactPath.length,
      coordinateSetSha256: cellSetSha256(exactPath),
    },
    fullPathWidthScan: {
      minimumContiguousStandableWidth: Math.min(...widthRows.map((r) => r.contiguousWidth)),
      belowThreeWideCount: widthRows.filter((r) => r.contiguousWidth < 3).length,
      belowFiveWideCount: widthRows.filter((r) => r.contiguousWidth < 5).length,
      contractBelowThreeWide: CHOKE_PLANS.map((c) => ({
        point: c.chokePoint, reportedWidth: c.reportedWidth,
      })),
      additionalBelowThreeWideCells: additionalNarrowCells,
    },
    narrowSections,
    wideningCandidateCells: {
      threeWide: {
        bounds: boundsOf(allThree),
        cellCount: allThree.length,
        coordinateSetSha256: cellSetSha256(allThree),
        note: 'Minimum conflict-free set to reach >=3 contiguous walkable cells at every choke.',
      },
      fiveWide: {
        bounds: boundsOf(allFive),
        cellCount: allFive.length,
        coordinateSetSha256: cellSetSha256(allFive),
        note: 'Civic-promenade target. RRMSA-NARROW-4 cannot exceed 3-wide from the west because the east side is a masonry building wall at x=-78 (5-wide there would require penetrating the building facade).',
      },
    },
    readyForBuild: false,
    buildNote: 'SURVEY ONLY. Widening remains unauthorized: requires fresh same-moment source snapshot, exact forward/rollback inversion, ownership review, strict-noop preflight/parser, protected-container/entity/fluid checks, post snapshot and bidirectional route QA.',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'ravensreach-mainstreet-widening-survey.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({
    readyForBuild: report.readyForBuild,
    snapshot: report.source.snapshot,
    regionCount: report.source.regionCount,
    narrowSectionCount: report.narrowSections.length,
    narrowSections: report.narrowSections.map((s) => ({
      id: s.id,
      chokePoint: s.chokePoint,
      reportedWidth: s.reportedWidth,
      threeWide: { cells: s.threeWide.cellCount, projectedWidth: s.threeWide.projectedWidth },
      fiveWide: { cells: s.fiveWide.cellCount, projectedWidth: s.fiveWide.projectedWidth },
      nearbyBlockEntities: s.nearbyBlockEntities.length,
    })),
    totalThreeWideCells: report.wideningCandidateCells.threeWide.cellCount,
    totalFiveWideCells: report.wideningCandidateCells.fiveWide.cellCount,
    report: jsonPath,
  }, null, 2));
}

await main();
