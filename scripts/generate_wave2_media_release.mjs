#!/usr/bin/env node
/**
 * Build the offline Wave 2 exact-object photography queue and close the
 * C01 recessed-portal floor-plan gap. This script never connects to Minecraft,
 * writes the live world, or opens either database.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';
import { createCanvas } from 'canvas';

const ROOT = process.cwd();
const DEFAULT_SNAPSHOT = (
  'data/worldsnap-wave2-baseline-4fca1ff3-20260728/region'
);
const DEFAULT_SNAPSHOT_SHA256 = (
  '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b'
);
const DEFAULT_CATALOG = (
  'data/exports/world-catalog-post-2026-07-27/object-media-index.json'
);
const DEFAULT_FEATURES = (
  'data/exports/world-catalog-post-2026-07-27/features.json'
);
const DEFAULT_MEDIA_OUTPUT = (
  'data/exports/redevelopment-media-wave2-2026-07-28'
);
const DEFAULT_FLOORPLAN_SOURCE = (
  'data/exports/world-catalog-post-2026-07-27/floorplans'
);
const DEFAULT_FLOORPLAN_OUTPUT = (
  'data/exports/world-catalog-wave2-2026-07-28/floorplans'
);

const CIRCULATION_PATTERN = (
  /(?:route|tunnel|stair|street|entry|portal|connector|circulation|access|garage|alley|road|sidewalk|driveway|concourse|passage|trail|wayfinding|arrival)/i
);

function value(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function resolved(filename) {
  return path.resolve(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function slug(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fileSha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

export function hashSnapshot(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    directory: relative(directory),
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function hasExactScreenshot(object) {
  return object.media.some((media) => (
    media.exists
    && media.type === 'screenshot'
    && media.relation === 'exact_object'
  ));
}

function boundsGeometry(geometry) {
  if (geometry?.type === 'bounds') return geometry;
  if (geometry?.type === 'point' && geometry.position) {
    const { x, y, z } = geometry.position;
    return { minX: x, maxX: x, minY: y, maxY: y, minZ: z, maxZ: z };
  }
  if (geometry?.type !== 'path' || !Array.isArray(geometry.points)) return null;
  return {
    minX: Math.min(...geometry.points.map((point) => point.x)),
    maxX: Math.max(...geometry.points.map((point) => point.x)),
    minY: Math.min(...geometry.points.map((point) => point.y)),
    maxY: Math.max(...geometry.points.map((point) => point.y)),
    minZ: Math.min(...geometry.points.map((point) => point.z)),
    maxZ: Math.max(...geometry.points.map((point) => point.z)),
  };
}

function pointToSegment(point, first, second) {
  const dx = second.x - first.x;
  const dz = second.z - first.z;
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(
        1,
        ((point.x - first.x) * dx + (point.z - first.z) * dz) / lengthSquared,
      ));
  return {
    x: first.x + ratio * dx,
    z: first.z + ratio * dz,
  };
}

function nearestRoadPoint(feature, roads) {
  const geometry = feature.geometry;
  const bounds = boundsGeometry(geometry);
  if (!bounds) return null;
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
  let best = null;
  for (const road of roads) {
    const points = road.geometry?.type === 'path'
      ? road.geometry.points
      : [];
    for (let index = 1; index < points.length; index += 1) {
      const candidate = pointToSegment(center, points[index - 1], points[index]);
      const distance = Math.hypot(candidate.x - center.x, candidate.z - center.z);
      if (!best || distance < best.distance) best = { ...candidate, distance };
    }
  }
  return best;
}

function representativeRoom(feature, children) {
  const preferences = {
    'RR-B1': /operations-floor$/,
    'RR-B2': /signals-operations$/,
    'RR-B3': /infirmary$/,
    'RR-B4': /maintenance-workshop$/,
    'SHL-S01': /fallout-shelter$/,
    'WL-THEATRE': /auditorium-parterre$/,
    'WL-CLUB': /bar-and-dance-floor$/,
  };
  const rooms = children
    .filter((child) => (
      child.parentId === feature.id
      && child.kind === 'room'
      && child.geometry?.type === 'bounds'
    ));
  const preferred = preferences[feature.externalId];
  if (preferred) {
    const match = rooms.find((room) => preferred.test(room.externalId));
    if (match) return match;
  }
  return rooms
    .sort((first, second) => {
      const height = (candidate) => (
        candidate.geometry.maxY - candidate.geometry.minY
      );
      const area = (candidate) => (
        (candidate.geometry.maxX - candidate.geometry.minX)
        * (candidate.geometry.maxZ - candidate.geometry.minZ)
      );
      if (height(first) !== height(second)) return height(second) - height(first);
      return area(second) - area(first);
    })[0] ?? null;
}

function interiorCamera(feature, room) {
  const bounds = room.geometry;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const height = bounds.maxY - bounds.minY;
  const eyeY = Math.min(
    bounds.maxY - 0.6,
    bounds.minY + Math.max(1.6, height * 0.66),
  );
  const lookY = Math.min(
    bounds.maxY - 0.8,
    bounds.minY + Math.max(1.35, height * 0.48),
  );
  // Look across the shorter room dimension. This exposes the named room's
  // fitted program instead of letting one furniture row or partition occupy
  // the whole frame along a long axis.
  if (width <= depth) {
    const inset = Math.min(3, Math.max(1, width * 0.12));
    const z = (bounds.minZ + bounds.maxZ) / 2;
    return {
      eye: [bounds.minX + inset, eyeY, z],
      lookAt: [bounds.maxX - inset, lookY, z],
      fov: 72,
      role: `interior-overview:${room.externalId}`,
    };
  }
  const inset = Math.min(3, Math.max(1, depth * 0.12));
  const x = (bounds.minX + bounds.maxX) / 2;
  return {
    eye: [x, eyeY, bounds.minZ + inset],
    lookAt: [x, lookY, bounds.maxZ - inset],
    fov: 72,
    role: `interior-overview:${room.externalId}`,
  };
}

function defaultDirection(feature, centerX) {
  if (feature.projectId === 'mainstreet-america') {
    if (centerX < -5) return [1, 0];
    if (centerX > 5) return [-1, 0];
  }
  if (feature.projectId === 'westlight-district') return [0, 1];
  if (feature.projectId === 'ravensreach') return [0, 1];
  if (feature.projectId === 'ravensgate') return [1, 1];
  return [1, 1];
}

function plannedFrontDirection(feature) {
  const reviewedOverrides = {
    'RRCH-MASON': [0, -1],
    'RRCH-SCOUT': [0, -1],
  };
  if (reviewedOverrides[feature.externalId]) {
    return reviewedOverrides[feature.externalId];
  }
  if (feature.projectId !== 'mainstreet-america') return null;
  const home = /^H(\d{2})$/.exec(feature.externalId);
  if (home) return Number(home[1]) <= 6 ? [1, 0] : [-1, 0];
  const outerHome = /^C0([2-7])$/.exec(feature.externalId);
  if (outerHome) return Number(outerHome[1]) % 2 === 0 ? [-1, 0] : [1, 0];
  return null;
}

function pointRectangleDistance(x, z, bounds) {
  const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX);
  const dz = Math.max(bounds.minZ - z, 0, z - bounds.maxZ);
  return Math.hypot(dx, dz);
}

function lineCrossesOtherBuilding(eyeX, eyeZ, targetX, targetZ, buildings) {
  for (let step = 1; step < 10; step += 1) {
    const ratio = step / 10;
    const x = eyeX + (targetX - eyeX) * ratio;
    const z = eyeZ + (targetZ - eyeZ) * ratio;
    if (buildings.some((building) => {
      const bounds = boundsGeometry(building.geometry);
      return bounds
        && x >= bounds.minX - 1
        && x <= bounds.maxX + 1
        && z >= bounds.minZ - 1
        && z <= bounds.maxZ + 1;
    })) return true;
  }
  return false;
}

function chooseOpenDirection(feature, features, centerX, centerZ, distance, base) {
  const magnitude = Math.hypot(base[0], base[1]) || 1;
  const normalized = [base[0] / magnitude, base[1] / magnitude];
  const angles = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI];
  const buildings = features.filter((candidate) => (
    candidate.id !== feature.id
    && candidate.kind === 'building'
    && candidate.geometry?.type === 'bounds'
  ));
  return angles
    .map((angle, index) => {
      const direction = [
        normalized[0] * Math.cos(angle) - normalized[1] * Math.sin(angle),
        normalized[0] * Math.sin(angle) + normalized[1] * Math.cos(angle),
      ];
      const eyeX = centerX + direction[0] * distance;
      const eyeZ = centerZ + direction[1] * distance;
      const clearance = buildings.length === 0
        ? 100
        : Math.min(...buildings.map((building) => (
            pointRectangleDistance(eyeX, eyeZ, boundsGeometry(building.geometry))
          )));
      const crossesBuilding = lineCrossesOtherBuilding(
        eyeX,
        eyeZ,
        centerX,
        centerZ,
        buildings,
      );
      return {
        direction,
        score: Math.min(40, clearance) - index * 1.5 - (crossesBuilding ? 100 : 0),
      };
    })
    .sort((first, second) => second.score - first.score)[0].direction;
}

function exteriorCamera(feature, roads, features) {
  const bounds = boundsGeometry(feature.geometry);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const width = bounds.maxX - bounds.minX + 1;
  const depth = bounds.maxZ - bounds.minZ + 1;
  const height = Math.max(4, bounds.maxY - bounds.minY + 1);
  const outerHome = /^C0([2-7])$/.exec(feature.externalId);
  if (feature.projectId === 'mainstreet-america' && outerHome) {
    const frontX = Number(outerHome[1]) % 2 === 0 ? -1 : 1;
    const offsetZ = Number(outerHome[1]) % 2 === 0 ? -1 : 1;
    const distance = Math.max(34, Math.max(width, depth) * 1.65);
    return {
      eye: [
        centerX + frontX * distance * 0.66,
        bounds.maxY + Math.max(11, Math.max(width, depth) * 0.45),
        centerZ + offsetZ * distance * 0.74,
      ],
      lookAt: [
        centerX,
        bounds.minY + Math.max(3, Math.min(height * 0.52, 18)),
        centerZ,
      ],
      fov: 62,
      role: 'planned-frontage-diagonal-overview',
    };
  }
  const requiredDistance = Math.max(24, Math.max(width, depth) * 1.8);
  const plannedDirection = plannedFrontDirection(feature);
  const roadPoint = plannedDirection ? null : nearestRoadPoint(feature, roads);
  let dx;
  let dz;
  if (plannedDirection) {
    [dx, dz] = plannedDirection;
  } else if (roadPoint && roadPoint.distance > 2 && roadPoint.distance < 100) {
    dx = roadPoint.x - centerX;
    dz = roadPoint.z - centerZ;
  } else {
    [dx, dz] = defaultDirection(feature, centerX);
  }
  const magnitude = Math.hypot(dx, dz) || 1;
  dx /= magnitude;
  dz /= magnitude;
  if (!plannedDirection) {
    [dx, dz] = chooseOpenDirection(
      feature,
      features,
      centerX,
      centerZ,
      requiredDistance,
      [dx, dz],
    );
  }
  // Street-level cameras were repeatedly occluded by the deliberately dense
  // hedges and fences. A roof-clear oblique still shows the frontage and plot
  // relationship while making the target envelope visually inspectable.
  const eyeY = bounds.maxY + Math.max(
    7,
    Math.min(28, Math.max(width, depth) * 0.28),
  );
  const lookY = bounds.minY + Math.max(3, Math.min(height * 0.52, 18));
  return {
    eye: [
      centerX + dx * requiredDistance,
      eyeY,
      centerZ + dz * requiredDistance,
    ],
    lookAt: [centerX, lookY, centerZ],
    fov: Math.max(width, depth) > 80 ? 72 : 64,
    role: 'street-facing-exterior-overview',
  };
}

export function buildingCamera(feature, features) {
  const bounds = boundsGeometry(feature.geometry);
  if (!bounds) throw new Error(`${feature.externalId}: building has no 3D bounds`);
  const reviewedCameras = {
    'RRCH-SCOUT': {
      eye: [-58, 120, -310],
      lookAt: [-58, 72, -345],
      fov: 64,
      role: 'nested-civic-core-sectional-context',
    },
    'RRCH-TOWN-HALL': {
      eye: [-85, 132, -320],
      lookAt: [-85, 72, -374.5],
      fov: 66,
      role: 'nested-moot-hall-shell-sectional-context',
    },
    'WD-LANTERN': {
      eye: [-326, 100, -545],
      lookAt: [-326, 72, -507],
      fov: 64,
      role: 'reviewed-glazed-hall-north-overview',
    },
  };
  if (reviewedCameras[feature.externalId]) {
    return reviewedCameras[feature.externalId];
  }
  const children = features.filter((candidate) => candidate.parentId === feature.id);
  const room = representativeRoom(feature, children);
  const interiorRequired = (
    feature.projectId === 'raven-rock'
    || bounds.maxY < 55
    || /(?:below-grade|shelter)/i.test(`${feature.externalId} ${feature.name}`)
  );
  if (interiorRequired && room) return interiorCamera(feature, room);
  const roads = features.filter((candidate) => (
    candidate.projectId === feature.projectId
    && ['road', 'driveway'].includes(candidate.kind)
    && candidate.geometry?.type === 'path'
  ));
  return exteriorCamera(feature, roads, features);
}

function cumulativePathLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
      points[index].z - points[index - 1].z,
    );
  }
  return total;
}

function middlePathPoint(points) {
  const target = cumulativePathLength(points) / 2;
  let traversed = 0;
  for (let index = 1; index < points.length; index += 1) {
    const first = points[index - 1];
    const second = points[index];
    const segment = Math.hypot(
      second.x - first.x,
      second.y - first.y,
      second.z - first.z,
    );
    if (traversed + segment >= target) {
      const ratio = segment === 0 ? 0 : (target - traversed) / segment;
      return {
        point: {
          x: first.x + ratio * (second.x - first.x),
          y: first.y + ratio * (second.y - first.y),
          z: first.z + ratio * (second.z - first.z),
        },
        direction: {
          x: second.x - first.x,
          z: second.z - first.z,
        },
      };
    }
    traversed += segment;
  }
  return {
    point: points[0],
    direction: {
      x: points.at(-1).x - points[0].x,
      z: points.at(-1).z - points[0].z,
    },
  };
}

export function circulationCamera(feature) {
  const points = feature.geometry.points;
  const bounds = boundsGeometry(feature.geometry);
  const underground = bounds.maxY <= 62;
  const stronglyVertical = bounds.maxY - bounds.minY >= 8;
  if (underground || stronglyVertical) {
    const eyePoint = points[0];
    const target = points.find((point) => (
      Math.hypot(
        point.x - eyePoint.x,
        point.y - eyePoint.y,
        point.z - eyePoint.z,
      ) >= 8
    )) ?? points.at(-1);
    return {
      eye: [eyePoint.x, eyePoint.y + 1.5, eyePoint.z],
      lookAt: [target.x, target.y + 1.2, target.z],
      fov: 72,
      role: 'route-level-interior-alignment',
    };
  }
  const { point, direction } = middlePathPoint(points);
  const magnitude = Math.hypot(direction.x, direction.z) || 1;
  const alongX = direction.x / magnitude;
  const alongZ = direction.z / magnitude;
  const totalLength = cumulativePathLength(points);
  const retreat = Math.min(55, Math.max(14, totalLength * 0.18));
  const lateral = Math.min(28, Math.max(9, totalLength * 0.08));
  const elevation = Math.min(42, Math.max(16, totalLength * 0.12));
  return {
    eye: [
      point.x - alongX * retreat - alongZ * lateral,
      point.y + elevation,
      point.z - alongZ * retreat + alongX * lateral,
    ],
    lookAt: [point.x, point.y + 0.5, point.z],
    fov: 70,
    role: 'route-segment-overview',
  };
}

export function selectTargets(catalog, features) {
  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  const missingBuildings = catalog.objects
    .filter((object) => object.kind === 'building' && !hasExactScreenshot(object))
    .map((object) => featureById.get(object.featureId))
    .filter(Boolean);
  const circulation = catalog.objects
    .filter((object) => {
      const feature = featureById.get(object.featureId);
      return (
        !hasExactScreenshot(object)
        && object.status === 'complete'
        && ['road', 'sidewalk', 'custom'].includes(object.kind)
        && feature?.geometry?.type === 'path'
        && !/^GATE-A01-/.test(object.externalId)
        && (
          object.kind === 'road'
          || CIRCULATION_PATTERN.test(`${object.externalId} ${object.name}`)
        )
      );
    })
    .map((object) => featureById.get(object.featureId))
    .filter(Boolean);
  return { missingBuildings, circulation };
}

function captureFor(feature, category, features) {
  const camera = category === 'building'
    ? buildingCamera(feature, features)
    : circulationCamera(feature);
  const filename = (
    `${slug(feature.externalId)}--${slug(feature.name).slice(0, 56)}.png`
  );
  return {
    id: `W2-${category.toUpperCase()}-${feature.externalId}`,
    primaryFeatureId: feature.externalId,
    featureId: feature.id,
    projectId: feature.projectId,
    kind: feature.kind,
    featureName: feature.name,
    role: camera.role,
    mode: 'persp',
    eye: camera.eye.map((coordinate) => Number(coordinate.toFixed(2))),
    lookAt: camera.lookAt.map((coordinate) => Number(coordinate.toFixed(2))),
    fov: camera.fov,
    width: category === 'building' ? 1280 : 1024,
    height: category === 'building' ? 720 : 576,
    output: `${category === 'building' ? 'buildings' : 'circulation'}/`
      + `${slug(feature.projectId)}/${filename}`,
  };
}

function writeRoutePlan(feature, snapshot, filename) {
  const points = feature.geometry.points;
  const canvas = createCanvas(1000, 700);
  const context = canvas.getContext('2d');
  context.fillStyle = '#07111f';
  context.fillRect(0, 0, 1000, 700);
  context.fillStyle = '#111f33';
  context.fillRect(0, 0, 1000, 82);
  context.fillStyle = '#f8fafc';
  context.font = '700 25px DejaVu Sans, sans-serif';
  context.fillText(feature.name, 32, 34);
  context.fillStyle = '#93c5fd';
  context.font = '13px DejaVu Sans Mono, monospace';
  context.fillText(
    `${feature.externalId} · ${points.length} vertices · width ${feature.geometry.width ?? 1}`,
    32,
    59,
  );
  const bounds = boundsGeometry(feature.geometry);
  const plan = { x: 52, y: 120, width: 560, height: 480 };
  const xRange = Math.max(1, bounds.maxX - bounds.minX);
  const zRange = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min(
    (plan.width - 60) / xRange,
    (plan.height - 60) / zRange,
  );
  const xOffset = plan.x + (plan.width - xRange * scale) / 2;
  const zOffset = plan.y + (plan.height - zRange * scale) / 2;
  const px = (point) => xOffset + (point.x - bounds.minX) * scale;
  const pz = (point) => zOffset + (point.z - bounds.minZ) * scale;
  context.fillStyle = '#0f172a';
  context.fillRect(plan.x, plan.y, plan.width, plan.height);
  context.strokeStyle = '#334155';
  context.lineWidth = 2;
  context.strokeRect(plan.x, plan.y, plan.width, plan.height);
  context.strokeStyle = '#22d3ee';
  context.lineWidth = Math.max(4, Math.min(18, (feature.geometry.width ?? 1) * 3));
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(px(point), pz(point));
    else context.lineTo(px(point), pz(point));
  });
  context.stroke();
  context.fillStyle = '#fbbf24';
  for (const point of points) {
    context.beginPath();
    context.arc(px(point), pz(point), 4, 0, Math.PI * 2);
    context.fill();
  }
  const profile = { x: 650, y: 120, width: 300, height: 260 };
  context.fillStyle = '#0f172a';
  context.fillRect(profile.x, profile.y, profile.width, profile.height);
  context.strokeStyle = '#334155';
  context.strokeRect(profile.x, profile.y, profile.width, profile.height);
  context.fillStyle = '#cbd5e1';
  context.font = '700 15px DejaVu Sans, sans-serif';
  context.fillText('Elevation profile', profile.x + 16, profile.y + 25);
  let total = 0;
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].z - points[index - 1].z,
    );
    distances.push(total);
  }
  const yRange = Math.max(1, bounds.maxY - bounds.minY);
  const profileX = (distance) => (
    profile.x + 20 + (distance / Math.max(1, total)) * (profile.width - 40)
  );
  const profileY = (point) => (
    profile.y + profile.height - 28
    - ((point.y - bounds.minY) / yRange) * (profile.height - 70)
  );
  context.strokeStyle = '#f472b6';
  context.lineWidth = 4;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(profileX(distances[index]), profileY(point));
    else context.lineTo(profileX(distances[index]), profileY(point));
  });
  context.stroke();
  context.fillStyle = '#94a3b8';
  context.font = '12px DejaVu Sans Mono, monospace';
  context.fillText(
    `x ${bounds.minX}..${bounds.maxX}`,
    650,
    425,
  );
  context.fillText(
    `y ${bounds.minY}..${bounds.maxY}`,
    650,
    450,
  );
  context.fillText(
    `z ${bounds.minZ}..${bounds.maxZ}`,
    650,
    475,
  );
  context.fillText(
    `length ${total.toFixed(1)} blocks`,
    650,
    500,
  );
  context.fillStyle = '#cbd5e1';
  context.font = '14px DejaVu Sans, sans-serif';
  wrapText(
    context,
    'Exact database path geometry. The perspective image verifies the route in the immutable world; this diagram identifies its plan and grade.',
    650,
    545,
    300,
    21,
    4,
  );
  context.fillStyle = '#94a3b8';
  context.font = '11px DejaVu Sans Mono, monospace';
  context.fillText(`snapshot ${snapshot.sha256}`, 32, 670);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 5) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines += 1;
      if (lines >= maxLines) return y;
    } else {
      line = candidate;
    }
  }
  if (line && lines < maxLines) context.fillText(line, x, y);
  return y + lineHeight;
}

function drawPortalPlan(context, feature, snapshot) {
  const width = 1600;
  const height = 1100;
  context.fillStyle = '#07111f';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111f33';
  context.fillRect(0, 0, width, 118);
  context.fillStyle = '#f8fafc';
  context.font = '700 34px DejaVu Sans, sans-serif';
  context.fillText('C01 recessed public portal · exact as-built plan', 54, 48);
  context.fillStyle = '#93c5fd';
  context.font = '17px DejaVu Sans Mono, monospace';
  context.fillText(
    'C01-PUBLIC-PORTAL-RECESSED-PHASE2 · x[139,147] y[62,69] z[163,201]',
    54,
    82,
  );

  const plan = { x: 90, y: 170, width: 650, height: 820 };
  context.fillStyle = '#0f1b2d';
  context.fillRect(plan.x, plan.y, plan.width, plan.height);
  context.strokeStyle = '#475569';
  context.lineWidth = 2;
  context.strokeRect(plan.x, plan.y, plan.width, plan.height);
  const minX = 138;
  const maxX = 148;
  const minZ = 162;
  const maxZ = 203;
  const scale = Math.min(
    (plan.width - 110) / (maxX - minX),
    (plan.height - 100) / (maxZ - minZ),
  );
  const px = (x) => plan.x + 64 + (x - minX) * scale;
  const pz = (z) => plan.y + 46 + (z - minZ) * scale;

  context.strokeStyle = 'rgba(148,163,184,0.22)';
  context.fillStyle = '#64748b';
  context.font = '12px DejaVu Sans Mono, monospace';
  context.lineWidth = 1;
  for (let x = minX; x <= maxX; x += 1) {
    context.beginPath();
    context.moveTo(px(x), pz(minZ));
    context.lineTo(px(x), pz(maxZ));
    context.stroke();
    context.fillText(String(x), px(x) - 10, pz(minZ) - 10);
  }
  for (let z = minZ; z <= maxZ; z += 2) {
    context.beginPath();
    context.moveTo(px(minX), pz(z));
    context.lineTo(px(maxX), pz(z));
    context.stroke();
    context.fillText(String(z), px(minX) - 36, pz(z) + 4);
  }

  context.fillStyle = '#1e293b';
  context.fillRect(px(140), pz(168), px(147) - px(140), pz(202) - pz(168));
  context.fillRect(px(139), pz(163), px(147) - px(139), pz(170) - pz(163));
  context.fillStyle = '#0f766e';
  context.fillRect(px(141), pz(168), px(146) - px(141), pz(202) - pz(168));
  context.fillRect(px(139), pz(164), px(146) - px(139), pz(169) - pz(164));
  context.strokeStyle = '#5eead4';
  context.lineWidth = 3;
  context.strokeRect(px(141), pz(168), px(146) - px(141), pz(202) - pz(168));
  context.strokeRect(px(139), pz(164), px(146) - px(139), pz(169) - pz(164));

  for (const z of [168, 170, 192, 196]) {
    context.strokeStyle = '#fbbf24';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(px(141), pz(z));
    context.lineTo(px(146), pz(z));
    context.stroke();
  }
  context.strokeStyle = '#f472b6';
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(px(141), pz(201));
  context.lineTo(px(146), pz(201));
  context.stroke();
  context.fillStyle = '#f8fafc';
  context.font = '700 14px DejaVu Sans, sans-serif';
  context.fillText('SOUTH-FACING MOUTH', px(146) + 12, pz(201) + 5);
  context.fillText('LOBBY OPENING', px(139) - 5, pz(163) - 18);
  context.save();
  context.translate(px(146) + 24, pz(185));
  context.rotate(Math.PI / 2);
  context.fillText('5-wide / 4-high clear route', 0, 0);
  context.restore();
  context.fillText('N', plan.x + plan.width - 52, plan.y + 42);
  context.beginPath();
  context.moveTo(plan.x + plan.width - 46, plan.y + 62);
  context.lineTo(plan.x + plan.width - 46, plan.y + 22);
  context.lineTo(plan.x + plan.width - 54, plan.y + 34);
  context.moveTo(plan.x + plan.width - 46, plan.y + 22);
  context.lineTo(plan.x + plan.width - 38, plan.y + 34);
  context.strokeStyle = '#f8fafc';
  context.lineWidth = 3;
  context.stroke();

  const infoX = 790;
  const cardWidth = 750;
  const card = (y, cardHeight, heading) => {
    context.fillStyle = '#111f33';
    context.fillRect(infoX, y, cardWidth, cardHeight);
    context.strokeStyle = '#334155';
    context.lineWidth = 1;
    context.strokeRect(infoX, y, cardWidth, cardHeight);
    context.fillStyle = '#f8fafc';
    context.font = '700 21px DejaVu Sans, sans-serif';
    context.fillText(heading, infoX + 24, y + 34);
  };
  card(170, 250, 'Longitudinal grade and stairs');
  const profile = [
    ['Z197–201', 'support Y64', 'stair at Z196'],
    ['Z193–196', 'support Y63', 'stair at Z192'],
    ['Z171–192', 'support Y62', 'stair at Z170'],
    ['Z168–170', 'support Y62/63', 'stair at Z168'],
  ];
  profile.forEach((row, index) => {
    const y = 220 + index * 43;
    context.fillStyle = index % 2 === 0 ? '#17263a' : '#142235';
    context.fillRect(infoX + 24, y, cardWidth - 48, 34);
    context.fillStyle = '#cbd5e1';
    context.font = '15px DejaVu Sans Mono, monospace';
    context.fillText(row[0], infoX + 38, y + 23);
    context.fillText(row[1], infoX + 210, y + 23);
    context.fillStyle = '#fbbf24';
    context.fillText(row[2], infoX + 440, y + 23);
  });

  card(450, 212, 'Material and legibility standard');
  context.fillStyle = '#cbd5e1';
  context.font = '16px DejaVu Sans, sans-serif';
  const materials = [
    'Floor · polished deepslate + oxidized cut copper route band',
    'Walls · deepslate bricks · ceiling · deepslate tiles',
    'Portal frame · mossy stone bricks · lighting · sea lanterns',
    'Directory · lobby, arena, hangar, operations, public exit',
  ];
  materials.forEach((line, index) => {
    context.fillText(line, infoX + 30, 500 + index * 36);
  });

  card(692, 298, 'Provenance and interpretation');
  context.fillStyle = '#cbd5e1';
  context.font = '15px DejaVu Sans, sans-serif';
  let y = 742;
  const provenance = [
    `Database object: ${feature.id}`,
    `Source: ${feature.sourceRef}`,
    `Immutable Wave 2 snapshot: ${snapshot.directory}`,
    `SHA-256: ${snapshot.sha256}`,
    'Plan semantics: exact object envelope, clear route, stair breaks,',
    'opening planes, and material program. It is not a photogrammetric',
    'survey and does not invent room boundaries beyond the as-built report.',
  ];
  for (const line of provenance) {
    context.fillStyle = line.startsWith('SHA-256') ? '#93c5fd' : '#cbd5e1';
    context.font = line.startsWith('SHA-256')
      ? '13px DejaVu Sans Mono, monospace'
      : '15px DejaVu Sans, sans-serif';
    y = wrapText(context, line, infoX + 30, y, cardWidth - 60, 25, 3);
  }

  context.fillStyle = '#0b1728';
  context.fillRect(0, height - 58, width, 58);
  context.fillStyle = '#94a3b8';
  context.font = '14px DejaVu Sans Mono, monospace';
  context.fillText(
    'north = -Z · coordinate grid = one block · generated offline · live world untouched',
    54,
    height - 23,
  );
}

function stageFloorplans(sourceDirectory, outputDirectory, portalFeature, snapshot) {
  if (fs.existsSync(outputDirectory)) {
    throw new Error(`refusing to overwrite existing floor-plan directory ${relative(outputDirectory)}`);
  }
  fs.mkdirSync(path.dirname(outputDirectory), { recursive: true });
  fs.cpSync(sourceDirectory, outputDirectory, { recursive: true });
  const portalPng = path.join(
    outputDirectory,
    'structures',
    'mainstreet-america-c01-public-portal-recessed-phase2.png',
  );
  const canvas = createCanvas(1600, 1100);
  drawPortalPlan(canvas.getContext('2d'), portalFeature, snapshot);
  fs.writeFileSync(portalPng, canvas.toBuffer('image/png'));

  const portalPdf = path.join(
    outputDirectory,
    'c01-recessed-public-portal-floorplan.pdf',
  );
  const pdf = createCanvas(1600, 1100, 'pdf');
  drawPortalPlan(pdf.getContext('2d'), portalFeature, snapshot);
  fs.writeFileSync(portalPdf, pdf.toBuffer('application/pdf', {
    title: 'C01 recessed public portal exact as-built floor plan',
    author: 'mc-fleet-bot',
  }));

  const sourceManifestPath = path.join(sourceDirectory, 'atlas-manifest.json');
  const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
  const oldSnapshot = sourceManifest.snapshot;
  const artifacts = (sourceManifest.artifacts ?? []).map((artifact) => {
    const sourceFile = resolved(artifact.file);
    const sourceRelative = path.relative(sourceDirectory, sourceFile);
    const stagedFile = path.join(outputDirectory, sourceRelative);
    return {
      ...artifact,
      file: relative(stagedFile),
      sourceSnapshot: oldSnapshot,
    };
  });
  artifacts.push(
    {
      file: relative(portalPng),
      bytes: fs.statSync(portalPng).size,
      sha256: fileSha256(portalPng),
      width: 1600,
      height: 1100,
      primaryFeatureId: portalFeature.externalId,
      sourceSnapshot: snapshot,
      sourceReport: portalFeature.sourceRef,
    },
    {
      file: relative(portalPdf),
      bytes: fs.statSync(portalPdf).size,
      sha256: fileSha256(portalPdf),
      pages: 1,
      primaryFeatureId: portalFeature.externalId,
      sourceSnapshot: snapshot,
      sourceReport: portalFeature.sourceRef,
    },
  );
  const manifest = {
    ...sourceManifest,
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    census: {
      base: sourceManifest.census,
      supplement: portalFeature.sourceRef,
    },
    snapshot: {
      mode: 'per-artifact',
      statement: 'Use artifacts[].sourceSnapshot; this staged atlas has two immutable sources.',
      sourceCount: 2,
    },
    baseAtlas: {
      directory: relative(sourceDirectory),
      manifest: relative(sourceManifestPath),
      snapshot: oldSnapshot,
      structurePages: sourceManifest.structurePages,
    },
    supplement: {
      externalId: portalFeature.externalId,
      featureId: portalFeature.id,
      sourceReport: portalFeature.sourceRef,
      snapshot,
      png: relative(portalPng),
      pdf: relative(portalPdf),
    },
    structurePages: (sourceManifest.structurePages ?? 68) + 1,
    exactBuildingFloorplans: (sourceManifest.structurePages ?? 68) + 1,
    integratedPdfPages: sourceManifest.pages,
    supplementPdfPages: 1,
    artifacts,
    verification: {
      ...sourceManifest.verification,
      portalPngNonblank: fs.statSync(portalPng).size > 20_000,
      portalPdfNonblank: fs.statSync(portalPdf).size > 20_000,
      perArtifactProvenance: artifacts.every((artifact) => artifact.sourceSnapshot),
    },
  };
  fs.writeFileSync(
    path.join(outputDirectory, 'atlas-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const readme = `# Wave 2 staged floor-plan set

This directory preserves the 68-plan worldwide atlas at its original immutable
snapshot and adds one exact as-built plan for
\`${portalFeature.externalId}\` from the Wave 2 immutable snapshot.

The combined set is intentionally **not** represented as one snapshot. Read
\`atlas-manifest.json#artifacts[].sourceSnapshot\` for per-file provenance.
The original worldwide PDF still contains 68 building pages; the portal is the
separate \`c01-recessed-public-portal-floorplan.pdf\` supplement.
`;
  fs.writeFileSync(path.join(outputDirectory, 'WAVE2-PROVENANCE.md'), readme);
  return { portalPng, portalPdf, manifest };
}

export function generateRelease(options) {
  const {
    catalogPath,
    featuresPath,
    snapshotDirectory,
    expectedSnapshotSha256,
    mediaOutput,
    floorplanSource,
    floorplanOutput,
    refresh,
  } = options;
  if (fs.existsSync(mediaOutput) && !refresh) {
    throw new Error(`refusing to overwrite existing media directory ${relative(mediaOutput)}`);
  }
  const snapshot = hashSnapshot(snapshotDirectory);
  if (snapshot.sha256 !== expectedSnapshotSha256) {
    throw new Error(
      `Wave 2 snapshot mismatch: expected ${expectedSnapshotSha256}, observed ${snapshot.sha256}`,
    );
  }
  if (snapshot.regionFileCount !== 26) {
    throw new Error(`Wave 2 snapshot has ${snapshot.regionFileCount} region files, expected 26`);
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const featuresDocument = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
  const features = featuresDocument.features;
  const { missingBuildings, circulation } = selectTargets(catalog, features);
  if (missingBuildings.length !== 55) {
    throw new Error(`expected 55 missing-building targets, found ${missingBuildings.length}`);
  }
  const portalFeature = features.find(
    (feature) => feature.externalId === 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
  );
  if (!portalFeature) throw new Error('missing C01 recessed public portal feature');

  const buildingCaptures = missingBuildings.map((feature) => (
    captureFor(feature, 'building', features)
  ));
  for (const capture of buildingCaptures) {
    if (
      !capture.role.startsWith('interior-overview:')
      && !capture.role.includes('sectional-context')
    ) continue;
    capture.evidencePlate = {
      title: capture.featureName,
      referenceImage: relative(path.join(
        floorplanOutput,
        'structures',
        `${slug(capture.projectId)}-${slug(capture.primaryFeatureId)}.png`,
      )),
      identityContract: (
        'Immutable perspective plus exact database floor plan and named primary room.'
      ),
    };
  }
  const circulationCaptures = circulation.map((feature) => (
    captureFor(feature, 'circulation', features)
  ));
  const routePlanDirectory = path.join(
    ROOT,
    'data/buildops/world-media-wave2-route-plans-2026-07-28',
  );
  for (const capture of circulationCaptures) {
    if (
      !capture.primaryFeatureId.startsWith('ROUTE:')
      && capture.primaryFeatureId !== 'C01-ARENA-HANGAR-WAYFINDING'
    ) continue;
    const feature = circulation.find(
      (candidate) => candidate.id === capture.featureId,
    );
    const routePlan = path.join(
      routePlanDirectory,
      `${slug(capture.projectId)}-${slug(capture.primaryFeatureId)}.png`,
    );
    writeRoutePlan(feature, snapshot, routePlan);
    capture.evidencePlate = {
      title: capture.featureName,
      referenceImage: relative(routePlan),
      identityContract: (
        'Immutable route perspective plus exact database path and grade diagram.'
      ),
    };
  }
  const captures = [...buildingCaptures, ...circulationCaptures];
  const duplicateOutputs = captures
    .map((capture) => capture.output)
    .filter((output, index, all) => all.indexOf(output) !== index);
  if (duplicateOutputs.length > 0) {
    throw new Error(`duplicate media outputs: ${duplicateOutputs.join(', ')}`);
  }

  fs.mkdirSync(mediaOutput, { recursive: true });
  const manifestPath = path.join(mediaOutput, 'capture-manifest.json');
  const targetRegisterPath = path.join(mediaOutput, 'target-register.json');
  const manifest = {
    schemaVersion: 2,
    generatedAtUtc: new Date().toISOString(),
    readOnly: true,
    liveWorldMutated: false,
    sourceCatalog: relative(catalogPath),
    sourceFeatures: relative(featuresPath),
    snapshot,
    capturePolicy: {
      exactObjectContract: 'Every output binds through primaryFeatureId.',
      buildingSelection: 'All 55 buildings lacking an exact-object screenshot.',
      circulationSelection: (
        'Complete road, sidewalk, and custom path objects with circulation semantics.'
      ),
      defaultFieldOfView: 68,
      shadows: false,
    },
    counts: {
      buildings: buildingCaptures.length,
      circulation: circulationCaptures.length,
      total: captures.length,
    },
    cameras: captures,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const targetRegister = {
    schemaVersion: 1,
    generatedAtUtc: manifest.generatedAtUtc,
    snapshot,
    baselineCoverage: catalog.coverage,
    targetCounts: manifest.counts,
    targets: captures.map((capture) => ({
      featureId: capture.featureId,
      externalId: capture.primaryFeatureId,
      projectId: capture.projectId,
      kind: capture.kind,
      name: capture.featureName,
      role: capture.role,
      output: capture.output,
      camera: {
        eye: capture.eye,
        lookAt: capture.lookAt,
        fov: capture.fov,
      },
    })),
    expectedCoverageAfterCatalog: {
      buildings: 69,
      buildingsWithExactObjectScreenshot: 69,
      buildingExactScreenshotGap: 0,
      buildingsWithExactFloorplan: 69,
      buildingExactFloorplanGap: 0,
      minimumFeaturesWithExactObjectScreenshot: (
        catalog.coverage.featuresWithExactObjectScreenshot + captures.length
      ),
    },
  };
  fs.writeFileSync(targetRegisterPath, `${JSON.stringify(targetRegister, null, 2)}\n`);

  const stagedFloorplans = refresh && fs.existsSync(floorplanOutput)
    ? {
        portalPng: path.join(
          floorplanOutput,
          'structures',
          'mainstreet-america-c01-public-portal-recessed-phase2.png',
        ),
        portalPdf: path.join(
          floorplanOutput,
          'c01-recessed-public-portal-floorplan.pdf',
        ),
      }
    : stageFloorplans(
        floorplanSource,
        floorplanOutput,
        portalFeature,
        snapshot,
      );
  const releaseReportPath = path.join(mediaOutput, 'release-plan.json');
  const releaseReport = {
    schemaVersion: 1,
    generatedAtUtc: manifest.generatedAtUtc,
    status: 'MANIFEST_READY_RENDER_PENDING',
    liveWorldMutated: false,
    snapshot,
    inputs: {
      catalog: relative(catalogPath),
      features: relative(featuresPath),
    },
    outputs: {
      captureManifest: relative(manifestPath),
      targetRegister: relative(targetRegisterPath),
      floorplanManifest: relative(
        path.join(floorplanOutput, 'atlas-manifest.json'),
      ),
      portalFloorplanPng: relative(stagedFloorplans.portalPng),
      portalFloorplanPdf: relative(stagedFloorplans.portalPdf),
      routePlanDirectory: relative(routePlanDirectory),
    },
    counts: manifest.counts,
    nextCommands: {
      render: (
        `node scripts/render_redevelopment_camera_manifest.mjs `
        + `--manifest ${relative(manifestPath)} `
        + `--regions ${relative(snapshotDirectory)} `
        + `--out-dir ${relative(mediaOutput)} `
        + `--report ${relative(path.join(mediaOutput, 'capture-report.json'))}`
      ),
      catalog: (
        'node scripts/generate_world_catalog.mjs '
        + '--out data/exports/world-catalog-wave2-2026-07-28 '
        + `--snapshot ${relative(snapshotDirectory)} `
        + '--surface-atlas '
        + 'data/exports/box/redevelopment-atlas-post-2026-07-27/team-a '
        + `--media-root ${relative(mediaOutput)} `
        + '--media-root data/exports/redevelopment-qa-2026-07-27 '
        + '--media-root data/exports/world-catalog-post-2026-07-27'
      ),
      validate: (
        'node scripts/qa_wave2_media_catalog.mjs '
        + `--media ${relative(mediaOutput)} `
        + '--catalog data/exports/world-catalog-wave2-2026-07-28 '
        + `--floorplans ${relative(floorplanOutput)}`
      ),
    },
  };
  fs.writeFileSync(releaseReportPath, `${JSON.stringify(releaseReport, null, 2)}\n`);
  return {
    snapshot,
    manifestPath,
    targetRegisterPath,
    releaseReportPath,
    floorplanOutput,
    portalFloorplan: stagedFloorplans.portalPng,
    counts: manifest.counts,
  };
}

function main() {
  const args = process.argv.slice(2);
  const options = {
    catalogPath: resolved(value(args, '--catalog', DEFAULT_CATALOG)),
    featuresPath: resolved(value(args, '--features', DEFAULT_FEATURES)),
    snapshotDirectory: resolved(value(args, '--snapshot', DEFAULT_SNAPSHOT)),
    expectedSnapshotSha256: value(
      args,
      '--expected-snapshot',
      DEFAULT_SNAPSHOT_SHA256,
    ),
    mediaOutput: resolved(value(args, '--media-out', DEFAULT_MEDIA_OUTPUT)),
    floorplanSource: resolved(value(
      args,
      '--floorplan-source',
      DEFAULT_FLOORPLAN_SOURCE,
    )),
    floorplanOutput: resolved(value(
      args,
      '--floorplan-out',
      DEFAULT_FLOORPLAN_OUTPUT,
    )),
    refresh: args.includes('--refresh'),
  };
  console.log(JSON.stringify(generateRelease(options), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
