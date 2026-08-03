#!/usr/bin/env node
/**
 * Compile the MainStreet America parking/arrival build from the refreshed
 * 2026-07-26 snapshot.
 *
 * The compiler emits one final target per block. Design layers may repaint a
 * surface cell while composing the plan, but the operations file is flattened
 * and run-length compressed before it is written, so the executable has no
 * duplicate targets. Strict protected boxes are rejected during composition.
 *
 * Usage:
 *   node scripts/generate_parking_arrival_gardens.mjs
 *   python3 scripts/rcon_runner.py \
 *     data/buildops/mainstreet-parking-arrival-gardens-2026-07-26.txt --dry-run
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const REGIONS = 'data/worldsnap/region';
const OUT = 'data/buildops/mainstreet-parking-arrival-gardens-2026-07-26.txt';
const REPORT = 'data/buildops/mainstreet-parking-arrival-gardens-2026-07-26.report.json';

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);

const STRICT_MASKS = [
  {
    id: 'guest-center',
    minX: -72,
    maxX: 72,
    minY: 63,
    maxY: 83,
    minZ: 90,
    maxZ: 176,
  },
  {
    id: 'mountain-public-entry',
    minX: 96,
    maxX: 125,
    minY: 45,
    maxY: 110,
    minZ: 168,
    maxZ: 239,
  },
  {
    id: 'billboard',
    minX: 84,
    maxX: 106,
    minY: 63,
    maxY: 82,
    minZ: 267,
    maxZ: 278,
  },
];

const CENTER_LOOP = {
  minX: -20,
  maxX: 20,
  minY: 63,
  maxY: 74,
  minZ: 172,
  maxZ: 220,
};

const AXIAL_DRIVE = {
  minX: -6,
  maxX: 6,
  minY: 63,
  maxY: 74,
  minZ: 172,
  maxZ: 275,
};

function inside(box, x, y, z) {
  return x >= box.minX && x <= box.maxX
    && y >= box.minY && y <= box.maxY
    && z >= box.minZ && z <= box.maxZ;
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function namespaced(block) {
  return block.includes(':') ? block : `minecraft:${block}`;
}

class Build {
  constructor() {
    this.cells = new Map();
    this.compositionRepaints = 0;
    this.integrationCells = new Set();
    this.roles = new Map();
  }

  put(x, y, z, block, role) {
    for (const mask of STRICT_MASKS) {
      if (inside(mask, x, y, z)) {
        throw new Error(`${role} intersects strict mask ${mask.id} at ${x},${y},${z}`);
      }
    }

    const southGateOpening = z >= 301 && z <= 305 && x >= -10 && x <= 10;
    const onFenceRing = (
      (z >= 301 && z <= 305 && x >= -305 && x <= 305)
      || (z >= -305 && z <= -301 && x >= -305 && x <= 305)
      || (x >= 301 && x <= 305 && z >= -305 && z <= 305)
      || (x >= -305 && x <= -301 && z >= -305 && z <= 305)
    );
    if (onFenceRing && !(southGateOpening && role.startsWith('south-arrival'))) {
      throw new Error(`${role} intersects the fence outside its south opening at ${x},${y},${z}`);
    }

    if (inside(CENTER_LOOP, x, y, z) || inside(AXIAL_DRIVE, x, y, z)) {
      if (!role.startsWith('center-') && !role.startsWith('south-arrival')) {
        throw new Error(`${role} lacks dedicated center/axial integration at ${x},${y},${z}`);
      }
      this.integrationCells.add(key(x, y, z));
    }

    const target = key(x, y, z);
    const material = namespaced(block);
    if (this.cells.has(target) && this.cells.get(target) !== material) {
      this.compositionRepaints += 1;
    }
    this.cells.set(target, material);
    this.roles.set(target, role);
  }

  box(x1, y1, z1, x2, y2, z2, block, role) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
          this.put(x, y, z, block, role);
        }
      }
    }
  }

  surface(x1, z1, x2, z2, block, role) {
    this.box(x1, 64, z1, x2, 64, z2, block, role);
  }
}

function addParkingBay(build, bay, paintEndDivider = true) {
  const end = bay.leftStripe + 5;
  bay.minX = bay.leftStripe + 1;
  bay.maxX = end - 1;
  bay.minZ = bay.z1;
  bay.maxZ = bay.z2;
  build.surface(
    bay.leftStripe,
    bay.z1,
    paintEndDivider ? end : end - 1,
    bay.z2,
    'light_gray_concrete',
    'parking-bay-surface',
  );
  build.surface(
    bay.leftStripe,
    bay.z1,
    bay.leftStripe,
    bay.z2,
    'white_concrete',
    'parking-bay-divider',
  );
  if (paintEndDivider) {
    build.surface(end, bay.z1, end, bay.z2, 'white_concrete', 'parking-bay-divider');
  }

  if (bay.type === 'accessible') {
    build.surface(bay.minX, bay.z1, bay.maxX, bay.z1 + 2, 'blue_concrete', 'parking-accessible');
    const hatchX = bay.index % 2 === 0 ? bay.maxX : bay.minX;
    build.surface(hatchX, bay.z1 + 3, hatchX, bay.z2, 'white_concrete', 'parking-accessible');
  } else if (bay.type === 'ev') {
    build.surface(bay.minX, bay.z1, bay.maxX, bay.z1 + 1, 'blue_concrete', 'parking-ev');
    build.surface(
      Math.floor((bay.minX + bay.maxX) / 2),
      bay.z1 + 2,
      Math.floor((bay.minX + bay.maxX) / 2),
      bay.z1 + 2,
      'sea_lantern',
      'parking-ev',
    );
  } else if (bay.type === 'premium') {
    build.surface(bay.minX, bay.z1, bay.maxX, bay.z1, 'yellow_concrete', 'parking-premium');
  }
}

function addLamp(build, x, z, id) {
  const role = inside(CENTER_LOOP, x, 65, z) ? 'center-formal-light' : 'parking-light';
  build.box(x, 65, z, x, 69, z, 'polished_blackstone_brick_wall', role);
  build.box(x - 1, 70, z, x + 1, 70, z, 'waxed_weathered_cut_copper', role);
  build.put(x - 2, 70, z, 'sea_lantern', role);
  build.put(x + 2, 70, z, 'sea_lantern', role);
  return { id, x, z, lightY: 70, type: 'dual-head-sea-lantern' };
}

function addTree(build, x, z, role) {
  build.box(x, 65, z, x, 69, z, 'stripped_oak_log', role);
  for (let y = 69; y <= 72; y += 1) {
    const radius = y === 72 ? 1 : 2;
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dz) <= radius + 1) {
          build.put(x + dx, y, z + dz, 'oak_leaves[persistent=true]', role);
        }
      }
    }
  }
}

function addCanopy(build, box, side) {
  const role = `parking-${side}-solar-canopy`;
  const supports = side === 'west'
    ? [-112, -97, -87]
    : [57, 72, 82];
  for (const x of supports) {
    for (const z of [256, 266]) {
      build.box(x, 65, z, x, 70, z, 'polished_blackstone_bricks', role);
      build.put(x, 70, z, 'sea_lantern', role);
    }
  }

  for (let z = box.minZ; z <= box.maxZ; z += 1) {
    for (let x = box.minX; x <= box.maxX; x += 1) {
      const edge = x === box.minX || x === box.maxX || z === box.minZ || z === box.maxZ;
      const rail = (x - box.minX) % 6 === 0;
      build.put(
        x,
        71,
        z,
        edge || rail ? 'waxed_oxidized_cut_copper' : 'black_stained_glass',
        role,
      );
    }
  }
  for (let x = box.minX + 3; x <= box.maxX - 3; x += 8) {
    build.put(x, 70, box.minZ + 5, 'sea_lantern', role);
  }

  return {
    id: `${side}-solar-ev-canopy`,
    ...box,
    minY: 65,
    maxY: 71,
    supports,
    clearVehicleHeadroom: 'y65..69 except measured divider-line supports',
  };
}

function addDiscoveryCourt(build) {
  for (let z = 183; z <= 209; z += 1) {
    for (let x = 87; x <= 95; x += 1) {
      const fan = (x + z) % 5 === 0;
      build.put(
        x,
        64,
        z,
        fan ? 'smooth_stone' : 'polished_andesite',
        'discovery-court',
      );
    }
  }

  // Directory pylon.
  build.box(88, 65, 186, 89, 69, 186, 'polished_blackstone_bricks', 'discovery-court');
  build.box(88, 70, 186, 89, 70, 186, 'waxed_weathered_cut_copper', 'discovery-court');
  build.box(88, 67, 185, 89, 68, 185, 'smooth_quartz', 'discovery-court');
  build.put(88, 69, 185, 'sea_lantern', 'discovery-court');

  // Open photo arch and arrival sculpture.
  build.box(89, 65, 200, 89, 70, 200, 'waxed_weathered_cut_copper', 'discovery-court');
  build.box(94, 65, 200, 94, 70, 200, 'waxed_weathered_cut_copper', 'discovery-court');
  build.box(89, 70, 200, 94, 70, 200, 'waxed_oxidized_cut_copper', 'discovery-court');
  build.box(90, 69, 200, 93, 69, 200, 'sea_lantern', 'discovery-court');

  // Shuttle shelter, two benches and a planted edge.
  build.box(88, 65, 205, 88, 68, 205, 'polished_blackstone_bricks', 'discovery-court');
  build.box(94, 65, 205, 94, 68, 205, 'polished_blackstone_bricks', 'discovery-court');
  build.box(88, 69, 204, 94, 69, 206, 'waxed_weathered_cut_copper', 'discovery-court');
  build.box(89, 65, 206, 93, 65, 206, 'dark_oak_stairs[facing=north]', 'discovery-court');
  for (let z = 183; z <= 209; z += 3) {
    build.put(95, 65, z, z % 2 ? 'flowering_azalea_leaves[persistent=true]' : 'azalea_leaves[persistent=true]', 'discovery-court');
  }
}

async function highestTerrain(snapshot, x, z) {
  const column = await snapshot.readColumn(x, z, 40, 105);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  for (let y = 105; y >= 40; y -= 1) {
    const block = column.get(y);
    if (AIR.has(block)) continue;
    if (
      block.endsWith('_leaves')
      || block.endsWith('_log')
      || block === 'minecraft:short_grass'
      || block === 'minecraft:tall_grass'
      || block.endsWith('_flower')
    ) {
      continue;
    }
    return { y, block };
  }
  throw new Error(`no terrain support in snapshot column ${x},${z}`);
}

async function addSouthArrival(build, snapshot) {
  const profile = [];
  const arches = new Set([276, 288, 300]);
  for (let z = 268; z <= 305; z += 1) {
    const floorY = 64 + Math.floor(((z - 268) * 14) / 37);
    const west = await highestTerrain(snapshot, -10, z);
    const east = await highestTerrain(snapshot, 10, z);
    profile.push({ z, floorY, westWallTop: west.y, eastWallTop: east.y });

    build.box(-6, floorY, z, 6, floorY, z, 'gray_concrete', 'south-arrival-carriage');
    build.box(-9, floorY, z, -7, floorY, z, 'smooth_stone', 'south-arrival-walk');
    build.box(7, floorY, z, 9, floorY, z, 'smooth_stone', 'south-arrival-walk');

    // Fully daylight the cut. The retained terrain starts at x +/-10.
    build.box(-9, floorY + 1, z, 9, 100, z, 'air', 'south-arrival-clear');
    build.box(
      -10,
      floorY,
      z,
      -10,
      Math.max(floorY + 3, west.y),
      z,
      z % 5 === 0 ? 'mossy_stone_bricks' : 'stone_bricks',
      'south-arrival-retaining',
    );
    build.box(
      10,
      floorY,
      z,
      10,
      Math.max(floorY + 3, east.y),
      z,
      z % 5 === 0 ? 'mossy_stone_bricks' : 'stone_bricks',
      'south-arrival-retaining',
    );

    // Flowering parapets track the actual terrain, not a fixed guessed Y.
    if (z < 301 || z > 305) {
      build.put(
        -11,
        west.y + 1,
        z,
        z % 3 === 0 ? 'flowering_azalea_leaves[persistent=true]' : 'azalea_leaves[persistent=true]',
        'south-arrival-garden',
      );
      build.put(
        11,
        east.y + 1,
        z,
        z % 3 === 0 ? 'flowering_azalea_leaves[persistent=true]' : 'azalea_leaves[persistent=true]',
        'south-arrival-garden',
      );
    }

    if (z % 6 === 0) {
      build.put(-10, floorY + 2, z, 'sea_lantern', 'south-arrival-light');
      build.put(10, floorY + 2, z, 'sea_lantern', 'south-arrival-light');
    }

    if (arches.has(z)) {
      build.box(-10, floorY + 1, z, -10, floorY + 6, z, 'polished_blackstone_bricks', 'south-arrival-arch');
      build.box(10, floorY + 1, z, 10, floorY + 6, z, 'polished_blackstone_bricks', 'south-arrival-arch');
      build.box(-10, floorY + 6, z, 10, floorY + 6, z, 'waxed_weathered_cut_copper', 'south-arrival-arch');
      build.box(-2, floorY + 5, z, 2, floorY + 5, z, 'sea_lantern', 'south-arrival-arch');
    }
  }
  return profile;
}

async function removeAxialOak(build, snapshot) {
  let removed = 0;
  for (let y = 65; y <= 73; y += 1) {
    for (let z = 186; z <= 194; z += 1) {
      for (let x = -7; x <= 2; x += 1) {
        const column = await snapshot.readColumn(x, z, y, y);
        const block = column?.get(y) ?? 'minecraft:air';
        if (block === 'minecraft:oak_log' || block === 'minecraft:oak_leaves') {
          build.put(x, y, z, 'air', 'center-axial-oak-relocation');
          removed += 1;
        }
      }
    }
  }
  return removed;
}

async function addCenterGardens(build, snapshot) {
  const gardenCells = [];
  for (const centerX of [-12, 12]) {
    for (let z = 181; z <= 218; z += 1) {
      for (let x = centerX - 6; x <= centerX + 6; x += 1) {
        const ellipse = ((x - centerX) ** 2) / 36 + ((z - 200) ** 2) / 324;
        if (ellipse > 1) continue;
        const column = await snapshot.readColumn(x, z, 64, 65);
        if (column?.get(64) !== 'minecraft:grass_block') continue;
        const edge = ellipse > 0.76;
        const material = edge
          ? 'stone_bricks'
          : (x + z) % 4 === 0
            ? 'rooted_dirt'
            : (x + z) % 3 === 0
              ? 'coarse_dirt'
              : 'moss_block';
        build.put(x, 64, z, material, 'center-formal-gardens');
        gardenCells.push({ x, z, edge });
      }
    }
  }

  for (const cell of gardenCells) {
    if (cell.edge || (cell.x + cell.z) % 7 !== 0) continue;
    build.put(
      cell.x,
      65,
      cell.z,
      (cell.x - cell.z) % 2 === 0
        ? 'flowering_azalea_leaves[persistent=true]'
        : 'azalea_leaves[persistent=true]',
      'center-formal-gardens',
    );
  }

  addTree(build, -12, 200, 'center-formal-gardens');
  addTree(build, 12, 200, 'center-formal-gardens');
  build.box(-18, 65, 196, -18, 65, 200, 'dark_oak_stairs[facing=east]', 'center-formal-gardens');
  build.box(18, 65, 196, 18, 65, 200, 'dark_oak_stairs[facing=west]', 'center-formal-gardens');
  return gardenCells.length;
}

function addBikeCorral(build) {
  build.surface(-76, 177, -73, 181, 'smooth_stone', 'parking-bike-corral');
  for (let x = -76; x <= -73; x += 1) {
    build.put(x, 65, 178, 'iron_bars', 'parking-bike-corral');
    build.put(x, 65, 181, 'iron_bars', 'parking-bike-corral');
  }
  build.put(-76, 66, 179, 'sea_lantern', 'parking-bike-corral');
}

function addSurfacePlan(build) {
  const bands = [
    {
      id: 'A',
      z1: 183,
      z2: 191,
      segments: [
        { start: -121, count: 20 },
        { start: 21, count: 13 },
      ],
    },
    {
      id: 'B',
      z1: 201,
      z2: 209,
      segments: [
        { start: -121, count: 20 },
        { start: 21, count: 13 },
      ],
    },
    {
      id: 'C',
      z1: 210,
      z2: 218,
      segments: [
        { start: -121, count: 20 },
        { start: 21, count: 15, externalEndBoundary: true },
      ],
    },
    {
      id: 'D',
      z1: 228,
      z2: 236,
      segments: [
        { start: -122, count: 23 },
        { start: 7, count: 17 },
      ],
    },
    {
      id: 'E',
      z1: 237,
      z2: 245,
      segments: [
        { start: -122, count: 23 },
        { start: 7, count: 17 },
      ],
    },
    {
      id: 'F',
      z1: 255,
      z2: 263,
      segments: [
        { start: -122, count: 23 },
        { start: 7, count: 23 },
      ],
    },
    {
      id: 'P',
      z1: 177,
      z2: 181,
      segments: [
        { start: -122, count: 9, premium: true },
      ],
    },
  ];

  const bays = [];
  let ordinal = 1;
  for (const band of bands) {
    for (const segment of band.segments) {
      for (let index = 0; index < segment.count; index += 1) {
        const leftStripe = segment.start + index * 5;
        let type = segment.premium ? 'premium' : 'standard';
        if (
          band.id === 'A'
          && (
            (leftStripe >= -41 && leftStripe <= -26)
            || (leftStripe >= 21 && leftStripe <= 36)
          )
        ) {
          type = 'accessible';
        }
        if (
          band.id === 'F'
          && (
            (leftStripe >= -117 && leftStripe <= -87)
            || (leftStripe >= 52 && leftStripe <= 82)
          )
        ) {
          type = 'ev';
        }
        const bay = {
          id: `P-${String(ordinal).padStart(3, '0')}`,
          ordinal,
          band: band.id,
          index,
          leftStripe,
          z1: band.z1,
          z2: band.z2,
          type,
        };
        const lastWithExternalBoundary = (
          segment.externalEndBoundary
          && index === segment.count - 1
        );
        addParkingBay(build, bay, !lastWithExternalBoundary);
        if (lastWithExternalBoundary) {
          bay.endBoundary = 'protected mountain edge at x96; no mutation';
        }
        bays.push(bay);
        ordinal += 1;
      }
    }
  }

  const aisles = [
    { id: 'aisle-1-west', minX: -121, maxX: -21, minZ: 192, maxZ: 200 },
    { id: 'aisle-1-east', minX: 21, maxX: 86, minZ: 192, maxZ: 200 },
    { id: 'aisle-2-west', minX: -121, maxX: -21, minZ: 219, maxZ: 227 },
    { id: 'aisle-2-east', minX: 21, maxX: 95, minZ: 219, maxZ: 227 },
    { id: 'festival-row-west', minX: -122, maxX: -7, minZ: 246, maxZ: 254 },
    { id: 'festival-row-east', minX: 7, maxX: 122, minZ: 246, maxZ: 254 },
  ];
  for (const aisle of aisles) {
    build.surface(
      aisle.minX,
      aisle.minZ,
      aisle.maxX,
      aisle.maxZ,
      'gray_concrete',
      'parking-drive-aisle',
    );
  }

  // Crossings occupy the ends of aisle segments, outside the protected axial drive.
  const crossings = [
    [-27, -21, 192, 200],
    [21, 27, 192, 200],
    [-20, -12, 221, 227],
    [12, 20, 221, 227],
    [-20, -12, 246, 254],
    [12, 20, 246, 254],
  ];
  for (const [x1, x2, z1, z2] of crossings) {
    for (let z = z1; z <= z2; z += 2) {
      build.surface(x1, z, x2, z, 'white_concrete', 'parking-crosswalk');
    }
  }

  // Painted arrows and Festival Row copper closure points stay flush.
  for (const [x, z] of [[-60, 196], [60, 196], [-60, 223], [60, 223], [-60, 250], [60, 250]]) {
    build.surface(x - 1, z, x + 1, z, 'yellow_concrete', 'parking-wayfinding');
    build.surface(x, z - 2, x, z + 2, 'yellow_concrete', 'parking-wayfinding');
    build.put(x - 1, 64, z - 2, 'yellow_concrete', 'parking-wayfinding');
    build.put(x + 1, 64, z - 2, 'yellow_concrete', 'parking-wayfinding');
  }
  for (const x of [-122, -7, 7, 122]) {
    build.put(x, 64, 246, 'waxed_weathered_cut_copper', 'parking-festival-row');
    build.put(x, 64, 254, 'sea_lantern', 'parking-festival-row');
  }

  // Three-wide perimeter pedestrian paths.
  build.surface(-125, 177, -123, 267, 'smooth_stone', 'parking-perimeter-walk');
  build.surface(93, 210, 95, 239, 'smooth_stone', 'parking-perimeter-walk');
  build.surface(123, 240, 125, 266, 'smooth_stone', 'parking-perimeter-walk');

  return { bays, aisles, crossings };
}

function compressOperations(build) {
  const byMaterial = new Map();
  for (const [target, block] of build.cells) {
    if (!byMaterial.has(block)) byMaterial.set(block, []);
    const [x, y, z] = target.split(',').map(Number);
    byMaterial.get(block).push({ x, y, z });
  }

  const boxes = [];
  for (const [block, cells] of byMaterial) {
    cells.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
    const remaining = new Set(cells.map(({ x, y, z }) => key(x, y, z)));
    for (const seed of cells) {
      if (!remaining.has(key(seed.x, seed.y, seed.z))) continue;

      let maxX = seed.x;
      while (remaining.has(key(maxX + 1, seed.y, seed.z))) maxX += 1;

      let maxZ = seed.z;
      for (;;) {
        const nextZ = maxZ + 1;
        let full = true;
        for (let x = seed.x; x <= maxX; x += 1) {
          if (!remaining.has(key(x, seed.y, nextZ))) {
            full = false;
            break;
          }
        }
        if (!full) break;
        maxZ = nextZ;
      }

      let maxY = seed.y;
      for (;;) {
        const nextY = maxY + 1;
        let full = true;
        for (let z = seed.z; z <= maxZ && full; z += 1) {
          for (let x = seed.x; x <= maxX; x += 1) {
            if (!remaining.has(key(x, nextY, z))) {
              full = false;
              break;
            }
          }
        }
        if (!full) break;
        maxY = nextY;
      }

      for (let y = seed.y; y <= maxY; y += 1) {
        for (let z = seed.z; z <= maxZ; z += 1) {
          for (let x = seed.x; x <= maxX; x += 1) {
            remaining.delete(key(x, y, z));
          }
        }
      }
      boxes.push({
        x1: seed.x,
        y1: seed.y,
        z1: seed.z,
        x2: maxX,
        y2: maxY,
        z2: maxZ,
        block,
      });
    }
    if (remaining.size) throw new Error(`failed to compress ${remaining.size} ${block} cells`);
  }

  boxes.sort((a, b) => (
    a.y1 - b.y1
    || a.z1 - b.z1
    || a.x1 - b.x1
    || a.block.localeCompare(b.block)
  ));
  return boxes.map((box) => (
    `SET ${box.x1} ${box.y1} ${box.z1} ${box.x2} ${box.y2} ${box.z2} ${box.block}`
  ));
}

async function maskSignature(snapshot, mask) {
  const hash = crypto.createHash('sha256');
  const counts = {};
  let columns = 0;
  for (let z = mask.minZ; z <= mask.maxZ; z += 1) {
    for (let x = mask.minX; x <= mask.maxX; x += 1) {
      const column = await snapshot.readColumn(x, z, mask.minY, mask.maxY);
      if (!column) throw new Error(`missing chunk while hashing ${mask.id} at ${x},${z}`);
      columns += 1;
      for (let y = mask.minY; y <= mask.maxY; y += 1) {
        const block = column.get(y);
        counts[block] = (counts[block] ?? 0) + 1;
        hash.update(`${x},${y},${z}:${block}\n`);
      }
    }
  }
  return {
    id: mask.id,
    columns,
    cells: columns * (mask.maxY - mask.minY + 1),
    sha256: hash.digest('hex'),
    counts,
  };
}

async function main() {
  const snapshot = new AnvilSnapshot(REGIONS);
  const build = new Build();
  const { bays, aisles, crossings } = addSurfacePlan(build);
  const removedOakBlocks = await removeAxialOak(build, snapshot);
  const gardenSurfaceCells = await addCenterGardens(build, snapshot);
  addDiscoveryCourt(build);
  addBikeCorral(build);

  const lampPoints = [
    [-121, 191], [-91, 191], [-61, 191], [-31, 191], [31, 191], [61, 191], [86, 191],
    [-121, 218], [-91, 218], [-61, 218], [-31, 218], [31, 218], [61, 218], [91, 218],
    [-122, 245], [-92, 245], [-62, 245], [-32, 245], [32, 245], [62, 245], [92, 245],
    [-18, 190], [18, 190],
  ];
  const lamps = lampPoints.map(([x, z], i) => addLamp(build, x, z, `L-${String(i + 1).padStart(2, '0')}`));

  const canopies = [
    addCanopy(build, { minX: -116, maxX: -84, minZ: 256, maxZ: 266 }, 'west'),
    addCanopy(build, { minX: 52, maxX: 84, minZ: 256, maxZ: 266 }, 'east'),
  ];
  const southArrivalProfile = await addSouthArrival(build, snapshot);

  if (bays.length !== 236) {
    throw new Error(`parking count is ${bays.length}; required exactly 236`);
  }
  const bayIds = new Set(bays.map((bay) => bay.id));
  if (bayIds.size !== bays.length) throw new Error('duplicate parking bay IDs');
  if (aisles.some((aisle) => aisle.maxZ - aisle.minZ + 1 < 9)) {
    throw new Error('drive aisle narrower than nine blocks');
  }
  if (crossings.some(([x1, x2]) => x2 - x1 + 1 < 3)) {
    throw new Error('pedestrian crossing narrower than three blocks');
  }

  const operations = compressOperations(build);
  const opTargets = new Set();
  for (const line of operations) {
    const fields = line.split(' ');
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    for (let y = y1; y <= y2; y += 1) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          const target = key(x, y, z);
          if (opTargets.has(target)) throw new Error(`duplicate executable target ${target}`);
          opTargets.add(target);
        }
      }
    }
  }
  if (opTargets.size !== build.cells.size) {
    throw new Error(`operation cell mismatch: ${opTargets.size} != ${build.cells.size}`);
  }

  const protectedSignatures = [];
  for (const mask of STRICT_MASKS) {
    protectedSignatures.push(await maskSignature(snapshot, mask));
  }

  const materialCounts = {};
  const roleCounts = {};
  for (const [target, material] of build.cells) {
    materialCounts[material] = (materialCounts[material] ?? 0) + 1;
    const role = build.roles.get(target);
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  }

  const report = {
    schemaVersion: 1,
    project: 'mainstreet-america',
    feature: 'parking-arrival-gardens',
    generatedAt: new Date().toISOString(),
    snapshot: REGIONS,
    executable: {
      path: OUT,
      operations: operations.length,
      uniqueTargetCells: build.cells.size,
      duplicateTargets: 0,
      strictProtectedIntersections: 0,
      dedicatedCenterAxialIntegrationCells: build.integrationCells.size,
      compositionRepaintsBeforeFlattening: build.compositionRepaints,
    },
    capacity: {
      totalBays: bays.length,
      standard: bays.filter((bay) => bay.type === 'standard').length,
      accessible: bays.filter((bay) => bay.type === 'accessible').length,
      ev: bays.filter((bay) => bay.type === 'ev').length,
      premium: bays.filter((bay) => bay.type === 'premium').length,
      bays,
    },
    circulation: {
      aisles,
      crossings: crossings.map(([minX, maxX, minZ, maxZ]) => ({ minX, maxX, minZ, maxZ })),
      southArrivalProfile,
      southGateStandingTarget: [0, 79, 305],
    },
    amenities: {
      lamps,
      canopies,
      discoveryCourt: { minX: 87, maxX: 95, minZ: 183, maxZ: 209 },
      bikeCorral: { minX: -76, maxX: -73, minZ: 177, maxZ: 181 },
      removedAxialOakBlocks: removedOakBlocks,
      gardenSurfaceCells,
    },
    protectedSignatures,
    materialCounts,
    roleCounts,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    [
      '# MainStreet America parking, Arrival Gardens, Discovery Court, and south gate',
      '# Generated from the refreshed 2026-07-26 snapshot.',
      `# ${operations.length} unique run-length-compressed operations; ${build.cells.size} target cells.`,
      `# Exactly ${bays.length} bays; ${lamps.length} dual-head poles; ${canopies.length} solar/EV canopies.`,
      ...operations,
      '',
    ].join('\n'),
  );
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`wrote ${OUT}`);
  console.log(`  ${operations.length} operations, ${build.cells.size} unique target cells`);
  console.log(`  ${bays.length} bays (${report.capacity.accessible} accessible, ${report.capacity.ev} EV, ${report.capacity.premium} premium)`);
  console.log(`  ${lamps.length} dual-head poles, ${canopies.length} solar/EV canopies`);
  console.log(`  ${build.integrationCells.size} dedicated center/axial cells, 0 strict-mask intersections`);
  console.log(`wrote ${REPORT}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
