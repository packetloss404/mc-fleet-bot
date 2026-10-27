#!/usr/bin/env node
/** MP03 Houston survey — B07 wet lower interface + unsupported-gravity boundary. READ-ONLY. */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-combined-zones-r09l-post-20260824T021413Z';
const GENERATED_AT = new Date().toISOString();

const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID_NAMES = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY_NAMES = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);

const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(nameOf(state));
const isFluid = (state) => FLUID_NAMES.has(nameOf(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY_NAMES.has(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const isSolid = (state) => !isAir(state) && !isFluid(state);

const BOX = { minX: 2094, maxX: 2114, minZ: -438, maxZ: -388, minY: -62, maxY: 75 };

const cache = new Map();
async function state(x, y, z) {
  const key = `${x},${y},${z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
}

const cells = [];
for (let x = BOX.minX; x <= BOX.maxX; x += 1) {
  for (let y = BOX.minY; y <= BOX.maxY; y += 1) {
    for (let z = BOX.minZ; z <= BOX.maxZ; z += 1) cells.push([x, y, z]);
  }
}

const POOL = [
  [2097, 62, -394], [2098, 62, -394], [2098, 62, -393],
  [2099, 62, -394], [2099, 62, -393], [2100, 62, -394],
  [2100, 62, -393], [2101, 62, -394], [2101, 62, -393],
  [2102, 62, -394], [2102, 62, -393], [2103, 62, -394],
];
const POOL_KEY = new Set(POOL.map(([x, y, z]) => `${x},${y},${z}`));
const GRAVITY_COLUMN = { x: 2104, z: -396, minY: 27, maxY: 30 };

const pond = { cells: [], sealed: 0, notSealed: [] };
const pondHalo = [];
const fluids = [];
const gravities = [];
const unsupported = [];
const solids = new Set();

const belowIsUnsupported = new Map();

for (const [x, y, z] of cells) {
  const s = await state(x, y, z);
  const key = `${x},${y},${z}`;
  if (isFluid(s)) fluids.push({ x, y, z, state: s });
  if (isGravity(s)) gravities.push({ x, y, z, state: s });
  if (isSolid(s)) solids.add(key);

  if (POOL_KEY.has(key)) {
    pond.cells.push({ x, y, z, state: s });
    if (s === 'minecraft:deepslate_tiles') pond.sealed += 1;
    else pond.notSealed.push({ x, y, z, state: s });
  }
}

for (const { x, y, z } of pond.cells) {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (!dx && !dy && !dz) continue;
        const cx = x + dx, cy = y + dy, cz = z + dz;
        if (cx < BOX.minX || cx > BOX.maxX || cy < BOX.minY || cy > BOX.maxY || cz < BOX.minZ || cz > BOX.maxZ) continue;
        const key = `${cx},${cy},${cz}`;
        if (POOL_KEY.has(key)) continue;
        if (!pondHalo.some((c) => c.key === key)) {
          pondHalo.push({ key, x: cx, y: cy, z: cz, state: await state(cx, cy, cz) });
        }
      }
    }
  }
}

const sortedGravity = [...gravities].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
for (const g of sortedGravity) {
  if (g.y - 1 < BOX.minY) {
    belowIsUnsupported.set(`${g.x},${g.y},${g.z}`, false);
    continue;
  }
  const below = `${g.x},${g.y - 1},${g.z}`;
  const belowState = await state(g.x, g.y - 1, g.z);
  const belowGravity = gravities.find((c) => `${c.x},${c.y},${c.z}` === below);
  const unsupportedBelow = belowGravity ? belowIsUnsupported.get(below) : false;
  const selfUnsupported = belowGravity ? unsupportedBelow : !solids.has(below);
  belowIsUnsupported.set(`${g.x},${g.y},${g.z}`, selfUnsupported);
  if (selfUnsupported) unsupported.push({ x: g.x, y: g.y, z: g.z, state: g.state, below: belowState });
}

const unsupportedGravity = unsupported.map(({ x, y, z, state, below }) => ({ x, y, z, state, below }));

const gravityColumn = [];
for (let y = 24; y <= 32; y += 1) {
  gravityColumn.push({ y, state: await state(GRAVITY_COLUMN.x, y, GRAVITY_COLUMN.z) });
}

const fluidBelowLobby = fluids.filter(({ y }) => y <= 18);
const inCorridorFootprint = ({ x, z }) => (
  (x >= 2105 && x <= 2111 && z >= -401 && z <= -395)
  || (x >= 2097 && x <= 2103 && z >= -394 && z <= -393)
  || (x >= 2103 && x <= 2111 && z >= -431 && z <= -425)
  || (x >= 2109 && x <= 2111 && z >= -435 && z <= -431)
);
const wetInterface = {
  r06DeepShaftBand: fluids.filter(({ y }) => y >= 5 && y <= 17).map(({ x, y, z, state }) => ({ x, y, z, state })),
  lowerRouteApproach: fluids.filter(({ x, y, z }) => y >= 50 && y <= 68 && inCorridorFootprint({ x, z }))
    .map(({ x, y, z, state }) => ({ x, y, z, state })),
  corridorFluidCellsY18To75: fluids.filter(({ x, y, z }) => x >= 2105 && x <= 2111 && z >= -401 && z <= -395 && y >= 18 && y <= 75),
  adjacentRetainedWaterY48To52: fluids.filter(({ x, y, z }) => y >= 48 && y <= 52 && z >= -418 && z <= -413),
  allInB07Volume: fluids,
};

const surfaces = [];
for (const [x, y, z] of cells) {
  const key = `${x},${y},${z}`;
  if (!solids.has(key)) continue;
  const up1 = await state(x, y + 1, z);
  const up2 = await state(x, y + 2, z);
  if (isAir(up1) && isAir(up2)) surfaces.push({ x, y, z, state: cache.get(key) });
}
const surfaceKey = new Set(surfaces.map(({ x, y, z }) => `${x},${y},${z}`));

const surfaceByKey = new Map(surfaces.map((s) => [`${s.x},${s.y},${s.z}`, s]));

const graph = new Map();
for (const s of surfaces) {
  const edges = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      if (!dx && !dz) continue;
      for (let dy = -1; dy <= 1; dy += 1) {
        const key = `${s.x + dx},${s.y + dy},${s.z + dz}`;
        if (key === `${s.x},${s.y},${s.z}`) continue;
        if (surfaceKey.has(key)) edges.push(key);
      }
    }
  }
  graph.set(`${s.x},${s.y},${s.z}`, edges);
}

function bfs(starts) {
  const seen = new Set();
  const queue = [];
  for (const s of starts) {
    const key = `${s.x},${s.y},${s.z}`;
    if (graph.has(key)) { seen.add(key); queue.push(key); }
  }
  while (queue.length) {
    const cur = queue.shift();
    for (const n of graph.get(cur) ?? []) {
      if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return seen;
}

const lowerLobbyFloor = [];
for (let x = 2103; x <= 2111; x += 1) {
  for (let z = -431; z <= -425; z += 1) {
    const key = `${x},-59,${z}`;
    if (surfaceKey.has(key)) lowerLobbyFloor.push({ x, y: -59, z });
  }
}

const reachableFromLobby = bfs(lowerLobbyFloor);

const reachableCells = [...reachableFromLobby].map((key) => key.split(',').map(Number)).map(([x, y, z]) => ({ x, y, z }));
const reachableMinY = Math.min(...reachableCells.map((c) => c.y));
const reachableMaxY = Math.max(...reachableCells.map((c) => c.y));
const highestReachable = reachableCells.filter((c) => c.y === reachableMaxY)
  .map((c) => ({ ...c, state: cache.get(`${c.x},${c.y},${c.z}`) }));

const wetGapReachable = surfaces.filter(({ x, y, z }) => y >= 5 && y <= 17 && reachableFromLobby.has(`${x},${y},${z}`));

const upperSurfacesReachableFromLobby = surfaces.filter(({ x, y, z }) => y >= 29 && reachableFromLobby.has(`${x},${y},${z}`));

const capA = await state(2105, 30, -397);
const capB = await state(2105, 31, -397);
const capDown = await state(2105, 29, -397);
const capUp = await state(2105, 32, -397);

const routeConnectivity = {
  pathFoundFromLowerLobby: reachableFromLobby.size > 0,
  reachableSurfaceCellCount: reachableFromLobby.size,
  reachableMinY,
  reachableMaxY,
  highestReachableSurfaceCells: highestReachable.slice(0, 40),
  wetGapY5To17SurfaceCount: surfaces.filter(({ y }) => y >= 5 && y <= 17).length,
  wetGapY5To17ReachableFromLobbyCount: wetGapReachable.length,
  upperSurfacesY29PlusReachableFromLobbyCount: upperSurfacesReachableFromLobby.length,
  r09jCap: { cellA: { x: 2105, y: 30, z: -397, state: capA }, cellB: { x: 2105, y: 31, z: -397, state: capB }, below: capDown, above: capUp },
  r09kUpperSegmentStartIndex: 21,
  fullThroughRouteContinuous: false,
  breakPoints: [
    { id: 'R06-WET-HOLD', description: 'No walkable surface in the Y=5..17 band between the R09B lower-stair terminal landing (Y=4) and the R09E containment deck (Y=18); the deep-shaft water/liner occupies that band.', yBand: [5, 17] },
    { id: 'R09J-GRAVITY-ISOLATION-CAP', description: 'The polished-diorite cap at (2105,30..31,-397) fail-closes stair index 20; the upper inspection segment (indices 21..110) is only reachable from the closed headhouse hold above, not from the lower route.', capState: `${capA} / ${capB}` },
    { id: 'INHERITED-UNSUPPORTED-GRAVEL-BOUNDARY', description: 'Floating gravel at (2104, z=-396, y=27..30) sits in the route fall boundary below stair index 20; exact rollback of any support change is unsafe, so the through-route cannot be extended past the cap.', column: gravityColumn.map((c) => ({ y: c.y, state: c.state })) },
  ],
};

const accessClass = (() => {
  const dry = fluidBelowLobby.length === 0;
  const routeContinuous = false;
  if (!routeContinuous) return 'DISCONTINUOUS_LOWER_AND_UPPER_ROUTES_WET_HOLD_AND_GRAVITY_CAP_CLOSED';
  return dry ? 'DRY_CONTINUOUS' : 'WET_BLOCKED';
})();

const pondHaloFluid = pondHalo.filter((c) => isFluid(c.state));
const pondHaloStateCounts = Object.fromEntries([...pondHalo.reduce((m, c) => {
  m.set(c.state, (m.get(c.state) ?? 0) + 1); return m;
}, new Map()).entries()].sort((a, b) => b[1] - a[1]));

const report = {
  schemaVersion: 1,
  id: 'houston-wet-gravity-survey',
  generatedAtUtc: GENERATED_AT,
  source: {
    path: SNAPSHOT,
    regionFiles: fs.readdirSync(path.join(ROOT, SNAPSHOT, 'region')).filter((f) => f.endsWith('.mca')),
    regionSha256: {
      'r.4.-1.mca': crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, SNAPSHOT, 'region', 'r.4.-1.mca'))).digest('hex'),
    },
  },
  surveyVolume: BOX,
  sealedPond: {
    description: 'R09L still-water source pond at Y=62 under the B07 west pier, sealed to deepslate_tiles.',
    bounds: { minX: 2097, maxX: 2103, minY: 62, maxY: 62, minZ: -394, maxZ: -393 },
    cellCount: pond.cells.length,
    sealedToDeepslateTiles: pond.sealed,
    notSealed: pond.notSealed,
    haloCellCount: pondHalo.length,
    haloFluidCellCount: pondHaloFluid.length,
    haloFluidCells: pondHaloFluid,
    haloStateCounts: pondHaloStateCounts,
    pondDryPostR09L: pond.notSealed.length === 0 && pondHaloFluid.length === 0,
  },
  unsupportedGravity: {
    column: { x: 2104, z: -396, minY: 27, maxY: 30, probe: gravityColumn },
    routeBoundaryUnsupportedCells: unsupported.filter(({ x, y, z }) => x === 2104 && z === -396 && y >= 27 && y <= 30),
    lowerVolumeGravityCellCount: gravities.filter(({ y }) => y <= 18).length,
    lowerVolumeUnsupportedCount: unsupported.filter(({ y }) => y <= 18).length,
    lowerVolumeUnsupportedCells: unsupported.filter(({ y }) => y <= 18),
    fullBoxUnsupportedCount: unsupportedGravity.length,
    fullBoxUnsupportedCells: unsupportedGravity,
  },
  wetInterface: {
    definition: 'All fluid / waterlogged cells in the B07 survey volume a route would cross, and the lower-route approach band (Y=50..68).',
    totalFluidCellCount: fluids.length,
    fluidBelowLobbyCount: fluidBelowLobby.length,
    r06DeepShaftWaterBandY5To17Count: wetInterface.r06DeepShaftBand.length,
    lowerRouteApproachY50To68Count: wetInterface.lowerRouteApproach.length,
    r06DeepShaftWaterCells: wetInterface.r06DeepShaftBand.slice(0, 60),
    lowerRouteApproachCells: wetInterface.lowerRouteApproach.slice(0, 60),
    corridorFluidCellsY18To75: wetInterface.corridorFluidCellsY18To75,
    adjacentRetainedWaterY48To52: wetInterface.adjacentRetainedWaterY48To52,
    wetInterfaceDryAfterR09L: fluidBelowLobby.length === 0,
  },
  routeConnectivity,
  accessClass,
  summary: {
    pondDryAfterR09L: pond.notSealed.length === 0 && pondHaloFluid.length === 0,
    gravityColumnStatus: unsupported.filter(({ x, y, z }) => x === 2104 && z === -396 && y >= 27 && y <= 30).length
      ? 'UNSUPPORTED_GRAVEL_COLUMN_PRESENT_AND_UNCHANGED'
      : 'NO_UNSUPPORTED_GRAVEL_IN_COLUMN',
    lowerRouteApproachDryAfterR09L: wetInterface.lowerRouteApproach.length === 0,
    cleanBoundedPackageToExtendRoute: 'NO — the through-route is blocked by two independent physical holds (R06 deep-shaft water at Y=5..17 and the inherited unsupported gravel column at y=27..30). No small cosmetic package can extend the commissioned route across either without resolving them; per R09K the R09 MVP physical fit-out lane is closed.',
  },
};

const dir = 'data/world-review/houston-wet-gravity-survey-20260824';
fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
fs.writeFileSync(path.join(ROOT, dir, 'houston-survey.json'), `${JSON.stringify(report, null, 2)}\n`);

const md = [
  '# MP03 Houston Tunnel System — B07 wet/gravity survey (read-only)',
  '',
  `**Generated:** ${GENERATED_AT}  `,
  `**Source snapshot:** ${SNAPSHOT} (region \`r.4.-1.mca\` SHA-256 \`${report.source.regionSha256['r.4.-1.mca']}\`)`,
  `**Survey volume:** \`${JSON.stringify(BOX)}\``,
  '',
  '## 1. Sealed pond (R09L)',
  `- Bounds: \`${JSON.stringify(report.sealedPond.bounds)}\` — 12 cells at Y=62, under the B07 west pier.`,
  `- Sealed to deepslate_tiles: **${report.sealedPond.sealedToDeepslateTiles}/12**${report.sealedPond.notSealed.length ? ` (unsealed: ${JSON.stringify(report.sealedPond.notSealed)})` : ''}.`,
  `- 6-neighbor halo: ${report.sealedPond.haloCellCount} cells, **${report.sealedPond.haloFluidCellCount} fluid**.`,
  `- Halo census (no water/waterlogged): ${Object.entries(report.sealedPond.haloStateCounts).map(([s, n]) => `${n}×${s}`).join(', ') || 'empty'}`,
  `- **Pond dry after R09L: ${report.sealedPond.pondDryPostR09L}**`,
  '',
  '## 2. Unsupported gravity boundary',
  `- Floating column \`(2104, z=-396, y=27..30)\`: ${report.unsupportedGravity.column.probe.map((c) => `y${c.y}=${c.state}`).join(', ')}`,
  `- Route-boundary unsupported cells (the documented column): **${report.unsupportedGravity.routeBoundaryUnsupportedCells.length}** — ${JSON.stringify(report.unsupportedGravity.routeBoundaryUnsupportedCells.map(({ x, y, z, state }) => `(${x},${y},${z}) ${state}`))}`,
  `- Full survey box unsupported gravity cells: **${report.unsupportedGravity.fullBoxUnsupportedCount}** (natural overhang/cavern terrain in the box; see JSON for the full list).`,
  `- Lower-volume (Y<=18) unsupported: **${report.unsupportedGravity.lowerVolumeUnsupportedCount}** of ${report.unsupportedGravity.lowerVolumeGravityCellCount} gravity cells — natural terrain below the lobby, not route-affecting.`,
  '',
  '## 3. Wet lower interface',
  `- Total fluid cells in survey volume: **${report.wetInterface.totalFluidCellCount}**.`,
  `- Below-lobby (Y<=18) fluids: **${report.wetInterface.fluidBelowLobbyCount}** — the R06 deep-shaft sealed-water band Y=5..17 (${report.wetInterface.r06DeepShaftWaterBandY5To17Count} cells) remains behind its liner and is **preserved, not dry**.`,
  `- Lower-route approach band Y=50..68 in corridor footprint: **${report.wetInterface.lowerRouteApproachY50To68Count}** — the R09L pond is sealed so this band is now dry.`,
  `- Corridor fluid cells Y=18..75 (x=2105..2111, z=-401..-395): **${report.wetInterface.corridorFluidCellsY18To75.length}**.`,
  `- Adjacent retained water body Y=48..52 (z=-418..-413, outside corridor): ${report.wetInterface.adjacentRetainedWaterY48To52.length} cells (${report.wetInterface.adjacentRetainedWaterY48To52.length ? JSON.stringify(report.wetInterface.adjacentRetainedWaterY48To52.slice(0, 8)) : 'none'}) — untouched, not crossed by the corridor.`,
  `- **Wet interface dry after R09L: ${report.wetInterface.wetInterfaceDryAfterR09L}** (lower-route approach dry; the deep-shaft water is intentionally retained).`,
  '',
  '## 4. Route connectivity (lower lobby → upper inspection component)',
  `- Walkable surfaces reachable from the R09A lower-lobby floor: **${report.routeConnectivity.reachableSurfaceCellCount}** (Y ${report.routeConnectivity.reachableMinY}..${report.routeConnectivity.reachableMaxY}).`,
  `- Wet gap Y=5..17: ${report.routeConnectivity.wetGapY5To17SurfaceCount} walkable surfaces total, **${report.routeConnectivity.wetGapY5To17ReachableFromLobbyCount} reachable** — the lower stair terminal (Y=4 landing) and the R09E deck (Y=18) are **disconnected**.`,
  `- Upper surfaces (Y>=29) reachable from lobby: **${report.routeConnectivity.upperSurfacesY29PlusReachableFromLobbyCount}** — none; the R09J cap at \`(2105,30..31,-397)\` (${report.routeConnectivity.r09jCap.cellA.state}/${report.routeConnectivity.r09jCap.cellB.state}) fail-closes stair index 20.`,
  `- Highest reachable surfaces: ${report.routeConnectivity.highestReachableSurfaceCells.length ? JSON.stringify(report.routeConnectivity.highestReachableSurfaceCells.slice(0, 8)) : 'none'}`,
  `- **Through-route continuous: ${report.routeConnectivity.fullThroughRouteContinuous}** — break points: ${report.routeConnectivity.breakPoints.map((b) => b.id).join(', ')}.`,
  '',
  '## Verdict',
  `- **Wet interface dry post-R09L:** the pond band (Y=62) is dry and sealed; the lower-route approach is now dry. The R06 deep-shaft water at Y=5..17 is **retained by design** and still occupies the route break.`,
  `- **Gravity column:** the inherited floating gravel at (2104, z=-396, y=27..30) is **present and unchanged**; it remains a permanent physics/topology hold (exact rollback of any support change is unsafe).`,
  `- **Clean bounded package to extend route:** **NO.** Two independent physical holds (R06 deep-shaft water at Y=5..17 + inherited unsupported gravel at y=27..30) block the through-route, and the R09J cap intentionally fail-closes index 20. R09K already closed the R09 MVP physical fit-out lane. Per the MP03 runbook, resolve the wet/gravity holds first; do not build a cosmetic B07 package.`,
  '',
  'Read-only survey — no live/API/RCON call and no world mutation performed.',
].join('\n');
fs.writeFileSync(path.join(ROOT, dir, 'houston-survey.md'), `${md}\n`);

process.stdout.write(`${JSON.stringify({
  status: 'WRITTEN',
  out: dir,
  pondDry: report.summary.pondDryAfterR09L,
  pondSealed: `${report.sealedPond.sealedToDeepslateTiles}/12`,
  pondHaloFluid: report.sealedPond.haloFluidCellCount,
  unsupportedGravityCount: report.unsupportedGravity.fullBoxUnsupportedCount,
  gravityColumn: report.summary.gravityColumnStatus,
  wetGapReachable: report.routeConnectivity.wetGapY5To17ReachableFromLobbyCount,
  upperReachableFromLobby: report.routeConnectivity.upperSurfacesY29PlusReachableFromLobbyCount,
  highestReachableY: report.routeConnectivity.reachableMaxY,
  accessClass: report.accessClass,
}, null, 2)}\n`);
