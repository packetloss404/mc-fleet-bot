/**
 * Offline structural evidence scan for the Moot Hall basements.
 *
 * Reads the copied Anvil snapshot only. It does not connect to Minecraft, RCON,
 * systemd, or any live service. JSON is written to stdout for review.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const REGION_DIR = process.argv[2] ?? 'data/worldsnap/region';
const snapshot = new AnvilSnapshot(REGION_DIR);

const scan = {
  x1: -125,
  x2: -45,
  y1: 48,
  y2: 70,
  z1: -420,
  z2: -330,
};
const documentedEnvelope = {
  x1: -100,
  x2: -70,
  z1: -392,
  z2: -358,
};
// The snapshot's continuous stone-brick containment shell continues 17 blocks
// farther south than the narrative bound. This is the envelope actually audited.
const envelope = {
  x1: -100,
  x2: -70,
  z1: -392,
  z2: -341,
};
const interior = {
  x1: envelope.x1 + 1,
  x2: envelope.x2 - 1,
  z1: envelope.z1 + 1,
  z2: envelope.z2 - 1,
};

const key = (x, y, z) => `${x},${y},${z}`;
const isOpen = (name) => [
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:water',
  'minecraft:bubble_column',
].includes(name);
const isNaturalOpen = (name) => name === 'minecraft:cave_air';
const within = (box, x, y, z) => (
  x >= box.x1 && x <= box.x2
  && y >= box.y1 && y <= box.y2
  && z >= box.z1 && z <= box.z2
);

const blocks = new Map();
for (let z = scan.z1; z <= scan.z2; z += 1) {
  for (let x = scan.x1; x <= scan.x2; x += 1) {
    const column = await snapshot.readColumn(x, z, scan.y1, scan.y2);
    if (!column) throw new Error(`snapshot is missing column ${x},${z}`);
    for (let y = scan.y1; y <= scan.y2; y += 1) {
      blocks.set(key(x, y, z), column.get(y));
    }
  }
}
const block = (x, y, z) => blocks.get(key(x, y, z)) ?? null;

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  for (const filename of fs.readdirSync(directory).sort()) {
    if (!filename.endsWith('.mca')) continue;
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, filename)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function materialCensus(box, y1, y2) {
  const result = {};
  for (let y = y1; y <= y2; y += 1) {
    const tally = {};
    for (let z = box.z1; z <= box.z2; z += 1) {
      for (let x = box.x1; x <= box.x2; x += 1) {
        const name = block(x, y, z);
        tally[name] = (tally[name] ?? 0) + 1;
      }
    }
    result[y] = Object.fromEntries(
      Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    );
  }
  return result;
}

function compressAxisRuns(points) {
  const grouped = new Map();
  for (const point of points) {
    const varying = point.axis === 'x' ? point.x : point.z;
    const groupKey = point.axis === 'x'
      ? `${point.edge}|${point.y}|${point.z}|${point.name}`
      : `${point.edge}|${point.y}|${point.x}|${point.name}`;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(varying);
  }
  const runs = [];
  for (const [groupKey, values] of grouped) {
    values.sort((a, b) => a - b);
    const [edge, yRaw, fixedRaw, name] = groupKey.split('|');
    let start = values[0];
    let previous = values[0];
    for (const value of values.slice(1)) {
      if (value === previous + 1) {
        previous = value;
        continue;
      }
      runs.push({
        edge,
        y: Number(yRaw),
        fixed: Number(fixedRaw),
        axis: edge.startsWith('z=') ? 'x' : 'z',
        start,
        end: previous,
        name,
      });
      start = value;
      previous = value;
    }
    runs.push({
      edge,
      y: Number(yRaw),
      fixed: Number(fixedRaw),
      axis: edge.startsWith('z=') ? 'x' : 'z',
      start,
      end: previous,
      name,
    });
  }
  return runs.sort((a, b) => (
    a.y - b.y
    || a.edge.localeCompare(b.edge)
    || a.start - b.start
    || a.name.localeCompare(b.name)
  ));
}

function perimeterOpen(y1, y2) {
  const points = [];
  const record = (edge, axis, x, y, z) => {
    const name = block(x, y, z);
    if (isOpen(name)) points.push({ edge, axis, x, y, z, name });
  };
  for (let y = y1; y <= y2; y += 1) {
    for (let x = envelope.x1; x <= envelope.x2; x += 1) {
      record(`z=${envelope.z1}`, 'x', x, y, envelope.z1);
      record(`z=${envelope.z2}`, 'x', x, y, envelope.z2);
    }
    for (let z = envelope.z1 + 1; z < envelope.z2; z += 1) {
      record(`x=${envelope.x1}`, 'z', envelope.x1, y, z);
      record(`x=${envelope.x2}`, 'z', envelope.x2, y, z);
    }
  }
  return {
    count: points.length,
    naturalCount: points.filter((point) => isNaturalOpen(point.name)).length,
    runs: compressAxisRuns(points),
  };
}

function directAirCaveInterfaces() {
  const interfaces = [];
  const seen = new Set();
  for (let y = 50; y <= 67; y += 1) {
    for (let z = envelope.z1 - 3; z <= envelope.z2 + 3; z += 1) {
      for (let x = envelope.x1 - 3; x <= envelope.x2 + 3; x += 1) {
        const here = block(x, y, z);
        if (!isOpen(here)) continue;
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const there = block(x + dx, y + dy, z + dz);
          if (!isOpen(there) || isNaturalOpen(here) === isNaturalOpen(there)) continue;
          if (!isNaturalOpen(here) && !isNaturalOpen(there)) continue;
          const a = key(x, y, z);
          const b = key(x + dx, y + dy, z + dz);
          const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);
          interfaces.push({
            a: { x, y, z, name: here },
            b: { x: x + dx, y: y + dy, z: z + dz, name: there },
          });
        }
      }
    }
  }
  return interfaces;
}

function openPlane(y, box = interior) {
  const cells = [];
  for (let z = box.z1; z <= box.z2; z += 1) {
    for (let x = box.x1; x <= box.x2; x += 1) {
      const name = block(x, y, z);
      if (isOpen(name)) cells.push({ x, y, z, name });
    }
  }
  return cells;
}

function componentsForPlane(cells) {
  const source = new Map(cells.map((cell) => [key(cell.x, cell.y, cell.z), cell]));
  const seen = new Set();
  const components = [];
  for (const cell of cells) {
    const startKey = key(cell.x, cell.y, cell.z);
    if (seen.has(startKey)) continue;
    const queue = [cell];
    seen.add(startKey);
    const member = [];
    while (queue.length) {
      const current = queue.shift();
      member.push(current);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nextKey = key(current.x + dx, current.y, current.z + dz);
        if (!source.has(nextKey) || seen.has(nextKey)) continue;
        seen.add(nextKey);
        queue.push(source.get(nextKey));
      }
    }
    const xs = member.map((point) => point.x);
    const zs = member.map((point) => point.z);
    components.push({
      count: member.length,
      bounds: {
        x1: Math.min(...xs),
        x2: Math.max(...xs),
        y: cell.y,
        z1: Math.min(...zs),
        z2: Math.max(...zs),
      },
      materials: Object.fromEntries(
        [...new Set(member.map((point) => point.name))]
          .sort()
          .map((name) => [name, member.filter((point) => point.name === name).length]),
      ),
      cells: member.length <= 32
        ? member.sort((a, b) => a.x - b.x || a.z - b.z)
        : undefined,
    });
  }
  return components.sort((a, b) => b.count - a.count);
}

function openVolumeComponents() {
  const allOpen = new Set();
  for (let y = scan.y1; y <= scan.y2; y += 1) {
    for (let z = scan.z1; z <= scan.z2; z += 1) {
      for (let x = scan.x1; x <= scan.x2; x += 1) {
        if (isOpen(block(x, y, z))) allOpen.add(key(x, y, z));
      }
    }
  }
  const seen = new Set();
  const components = [];
  for (const start of allOpen) {
    if (seen.has(start)) continue;
    const [sx, sy, sz] = start.split(',').map(Number);
    const queue = [[sx, sy, sz]];
    seen.add(start);
    const tally = {};
    const bounds = { x1: sx, x2: sx, y1: sy, y2: sy, z1: sz, z2: sz };
    let count = 0;
    let basementOpen = 0;
    let authoredAirInBasement = 0;
    let naturalAirInBasement = 0;
    let touchesScanBoundary = false;
    let touchesEnvelopeBoundary = false;
    while (queue.length) {
      const [x, y, z] = queue.pop();
      const name = block(x, y, z);
      count += 1;
      tally[name] = (tally[name] ?? 0) + 1;
      bounds.x1 = Math.min(bounds.x1, x);
      bounds.x2 = Math.max(bounds.x2, x);
      bounds.y1 = Math.min(bounds.y1, y);
      bounds.y2 = Math.max(bounds.y2, y);
      bounds.z1 = Math.min(bounds.z1, z);
      bounds.z2 = Math.max(bounds.z2, z);
      if (x === scan.x1 || x === scan.x2 || y === scan.y1 || y === scan.y2 || z === scan.z1 || z === scan.z2) {
        touchesScanBoundary = true;
      }
      const insideBasement = (
        x >= interior.x1 && x <= interior.x2
        && z >= interior.z1 && z <= interior.z2
        && ((y >= 55 && y <= 60) || (y >= 62 && y <= 66))
      );
      if (insideBasement) {
        basementOpen += 1;
        if (isNaturalOpen(name)) naturalAirInBasement += 1;
        else authoredAirInBasement += 1;
      }
      if (
        y >= 50 && y <= 67
        && (
          ((x === envelope.x1 || x === envelope.x2) && z >= envelope.z1 && z <= envelope.z2)
          || ((z === envelope.z1 || z === envelope.z2) && x >= envelope.x1 && x <= envelope.x2)
        )
      ) {
        touchesEnvelopeBoundary = true;
      }
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (!within(scan, nx, ny, nz)) continue;
        const nextKey = key(nx, ny, nz);
        if (!allOpen.has(nextKey) || seen.has(nextKey)) continue;
        seen.add(nextKey);
        queue.push([nx, ny, nz]);
      }
    }
    if (basementOpen > 0 || touchesEnvelopeBoundary) {
      components.push({
        count,
        bounds,
        materials: Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1])),
        basementOpen,
        authoredAirInBasement,
        naturalAirInBasement,
        touchesScanBoundary,
        touchesEnvelopeBoundary,
      });
    }
  }
  return components.sort((a, b) => b.basementOpen - a.basementOpen || b.count - a.count);
}

function solidNeighborFailures(y1, y2) {
  const failures = [];
  const checks = [
    {
      edge: `x=${envelope.x1}`,
      boundary: (y, value) => [envelope.x1, y, value],
      outside: (y, value) => [envelope.x1 - 1, y, value],
      values: [envelope.z1, envelope.z2],
    },
    {
      edge: `x=${envelope.x2}`,
      boundary: (y, value) => [envelope.x2, y, value],
      outside: (y, value) => [envelope.x2 + 1, y, value],
      values: [envelope.z1, envelope.z2],
    },
    {
      edge: `z=${envelope.z1}`,
      boundary: (y, value) => [value, y, envelope.z1],
      outside: (y, value) => [value, y, envelope.z1 - 1],
      values: [envelope.x1, envelope.x2],
    },
    {
      edge: `z=${envelope.z2}`,
      boundary: (y, value) => [value, y, envelope.z2],
      outside: (y, value) => [value, y, envelope.z2 + 1],
      values: [envelope.x1, envelope.x2],
    },
  ];
  for (const check of checks) {
    for (let y = y1; y <= y2; y += 1) {
      for (let value = check.values[0]; value <= check.values[1]; value += 1) {
        const [x, yy, z] = check.boundary(y, value);
        const [ox, oy, oz] = check.outside(y, value);
        const boundaryName = block(x, yy, z);
        const outsideName = block(ox, oy, oz);
        if (isOpen(boundaryName) && isOpen(outsideName)) {
          failures.push({
            edge: check.edge,
            boundary: { x, y: yy, z, name: boundaryName },
            outside: { x: ox, y: oy, z: oz, name: outsideName },
          });
        }
      }
    }
  }
  return failures;
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    regionDirectory: REGION_DIR,
    sha256: snapshotHash(REGION_DIR),
    method: 'offline Anvil palette decode; no live-world or service access',
  },
  scan,
  authoredEnvelope: envelope,
  narrativeEnvelopeFromDocs: documentedEnvelope,
  authoredInterior: interior,
  materialCensusByY: materialCensus(envelope, 50, 67),
  perimeterOpen: {
    b2Body: perimeterOpen(55, 60),
    b1Body: perimeterOpen(62, 66),
    interfaceAndSlabs: perimeterOpen(50, 67),
  },
  directBoundaryEscapeCells: {
    b2Body: solidNeighborFailures(55, 60),
    b1Body: solidNeighborFailures(62, 66),
    all: solidNeighborFailures(50, 67),
  },
  airToNaturalCaveInterfaces: directAirCaveInterfaces(),
  planeOpenComponents: Object.fromEntries(
    [51, 52, 53, 54, 55, 60, 61, 62, 63, 66, 67]
      .map((y) => [y, componentsForPlane(openPlane(y))]),
  ),
  relevantOpenVolumeComponents: openVolumeComponents(),
};

console.log(JSON.stringify(result, null, 2));
