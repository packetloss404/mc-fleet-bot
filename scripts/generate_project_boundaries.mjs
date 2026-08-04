#!/usr/bin/env node
/**
 * Generate exact-guard, land-only picket fences for inventoried MainStreet
 * divisions, blocks, and projects.
 *
 * The old F01 ring treated a planning envelope as a property line and carried
 * hundreds of columns across water. This generator instead consumes authored
 * orthogonal project polygons. Water, missing chunks, undeclared gaps,
 * collisions, duplicate targets, and non-orthogonal segments are hard errors.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';

import {
  AnvilSnapshot,
  findSafeSupport,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const planPath = process.argv[2] ?? 'docs/mainstreet-america/planning/project-grid.yaml';
const regionDir = process.argv[3] ?? 'data/worldsnap/region';
const outputPath = process.argv[4]
  ?? 'data/buildops/mainstreet-project-boundaries-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));
const snapshot = new AnvilSnapshot(regionDir);
const plannedBoundaryBlocks = new Set([
  plan.appearance.field_block,
  plan.appearance.post_block,
  plan.appearance.post_cap,
  plan.appearance.gate_light,
].map((block) => baseName(block)));

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function key(x, z) {
  return `${x},${z}`;
}

function targetKey(target) {
  return `${target.x},${target.y},${target.z}`;
}

function pointsOnSegment(from, to) {
  const [x1, z1] = from.map(Number);
  const [x2, z2] = to.map(Number);
  if (x1 !== x2 && z1 !== z2) {
    throw new Error(`non-orthogonal boundary segment ${from} -> ${to}`);
  }
  const dx = Math.sign(x2 - x1);
  const dz = Math.sign(z2 - z1);
  const length = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
  return Array.from({ length: length + 1 }, (_, index) => ({
    x: x1 + dx * index,
    z: z1 + dz * index,
  }));
}

function perimeter(boundary) {
  const vertices = boundary.vertices ?? [];
  if (vertices.length < 4) throw new Error(`${boundary.id} has fewer than four vertices`);
  const points = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const segment = pointsOnSegment(vertices[index], vertices[(index + 1) % vertices.length]);
    if (index > 0) segment.shift();
    points.push(...segment);
  }
  if (points.length > 1 && key(points[0].x, points[0].z) === key(points.at(-1).x, points.at(-1).z)) {
    points.pop();
  }
  const seen = new Set();
  for (const point of points) {
    const pointKey = key(point.x, point.z);
    if (seen.has(pointKey)) throw new Error(`${boundary.id} revisits boundary column ${pointKey}`);
    seen.add(pointKey);
  }
  return points;
}

function gateAt(boundary, point) {
  return (boundary.gates ?? []).find((gate) => {
    if (gate.axis === 'x') {
      return point.z === Number(gate.fixed)
        && point.x >= Number(gate.min)
        && point.x <= Number(gate.max);
    }
    if (gate.axis === 'z') {
      return point.x === Number(gate.fixed)
        && point.z >= Number(gate.min)
        && point.z <= Number(gate.max);
    }
    throw new Error(`${boundary.id}/${gate.id} has invalid gate axis`);
  }) ?? null;
}

function wallAt(boundary, point) {
  return (boundary.wall_segments ?? []).some((segment) => (
    pointsOnSegment(segment.from, segment.to)
      .some((candidate) => candidate.x === point.x && candidate.z === point.z)
  ));
}

function desiredDisposition(existing, desired) {
  if (baseName(existing) === baseName(desired)) return 'satisfied';
  // Gate widening/relocation legitimately converts field fence to gate pier
  // (and old post caps to gate lights) within the same declared boundary.
  if (plannedBoundaryBlocks.has(baseName(existing))) return 'replace';
  if (isAirBlock(existing) || isReplaceableBlock(existing)) return 'replace';
  // Authored land-only boundaries are also landscape edges. Exact-guard
  // replacement of the handful of branches/trunks crossing the fence corridor
  // is intentional trimming, not a broad tree or material sweep.
  if (isFoliageBlock(existing)) return 'replace';
  return 'collision';
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

const allTargets = new Map();
const operations = [];
const boundaryReports = [];
const globalErrors = [];

for (const boundary of plan.boundaries ?? []) {
  const columns = perimeter(boundary);
  const analyzed = columns.map((point, index) => ({
    ...point,
    index,
    gate: gateAt(boundary, point),
    wall: wallAt(boundary, point),
  }));
  const report = {
    id: boundary.id,
    name: boundary.name,
    kind: boundary.kind,
    parent: boundary.parent,
    vertices: boundary.vertices,
    columns: analyzed.length,
    gateColumns: analyzed.filter((column) => column.gate).length,
    wallColumns: analyzed.filter((column) => column.wall).length,
    fenceColumns: 0,
    waterColumns: [],
    missingColumns: [],
    collisions: [],
    trimmedFoliage: [],
    sharedTargets: [],
    duplicateTargets: [],
    targets: [],
    gates: (boundary.gates ?? []).map((gate) => ({
      ...gate,
      actualOpenColumns: analyzed.filter((column) => column.gate?.id === gate.id).length,
      expectedOpenColumns: Number(gate.max) - Number(gate.min) + 1,
    })),
  };

  for (const gate of report.gates) {
    if (gate.actualOpenColumns !== gate.expectedOpenColumns) {
      globalErrors.push(
        `${boundary.id}/${gate.id} opens ${gate.actualOpenColumns}; expected ${gate.expectedOpenColumns}`,
      );
    }
  }

  for (const column of analyzed) {
    if (column.wall) continue;
    if (column.gate) {
      // A newly declared/widened gate must also remove any superseded field
      // fence or post assembly. Scan only the four cells immediately above the
      // terrain support; this cannot erase unrelated quartz elsewhere in the
      // column (for example underground rooms).
      const snapshotColumn = await snapshot.readColumn(column.x, column.z, -64, 160);
      if (!snapshotColumn) {
        report.missingColumns.push({ x: column.x, z: column.z, reason: 'gate_missing_column' });
        continue;
      }
      const support = findSafeSupport(
        snapshotColumn,
        -64,
        160,
        (block) => plannedBoundaryBlocks.has(baseName(block)),
      );
      if (support.kind === 'water') {
        report.waterColumns.push({
          x: column.x,
          y: support.y,
          z: column.z,
          block: support.block,
          gateId: column.gate.id,
        });
        continue;
      }
      if (support.kind !== 'land' || support.y === null || support.ceilingHit) {
        report.missingColumns.push({
          x: column.x,
          z: column.z,
          reason: `gate_${support.kind}`,
        });
        continue;
      }
      for (let y = support.y + 1; y <= support.y + 4; y += 1) {
        const existing = baseName(snapshotColumn.get(y));
        if (!plannedBoundaryBlocks.has(existing)) continue;
        const described = {
          x: column.x,
          y,
          z: column.z,
          block: 'minecraft:air',
          role: 'gate_clear',
          expected: existing,
          supportY: support.y,
          supportBlock: support.block,
          disposition: 'replace',
          gateId: column.gate.id,
        };
        const id = targetKey(described);
        const prior = allTargets.get(id);
        if (prior) {
          if (baseName(prior.block) !== 'minecraft:air') {
            report.duplicateTargets.push({ ...described, priorBoundary: prior.boundaryId });
          } else {
            report.sharedTargets.push({ ...described, priorBoundary: prior.boundaryId });
          }
          continue;
        }
        allTargets.set(id, { boundaryId: boundary.id, ...described });
        report.targets.push(described);
        operations.push({ boundaryId: boundary.id, ...described });
      }
      continue;
    }
    report.fenceColumns += 1;
    const snapshotColumn = await snapshot.readColumn(column.x, column.z, -64, 160);
    if (!snapshotColumn) {
      report.missingColumns.push({ x: column.x, z: column.z });
      continue;
    }
    // Make post-build regeneration idempotent. Existing boundary blocks are
    // decoration above the terrain support, not a new terrain surface on which
    // another fence should be stacked.
    const support = findSafeSupport(
      snapshotColumn,
      -64,
      160,
      (block) => plannedBoundaryBlocks.has(baseName(block)),
    );
    if (support.kind === 'water') {
      report.waterColumns.push({
        x: column.x,
        y: support.y,
        z: column.z,
        block: support.block,
      });
      continue;
    }
    if (support.kind !== 'land' || support.y === null || support.ceilingHit) {
      report.missingColumns.push({
        x: column.x,
        z: column.z,
        reason: support.kind,
      });
      continue;
    }

    const previous = analyzed[(column.index - 1 + analyzed.length) % analyzed.length];
    const next = analyzed[(column.index + 1) % analyzed.length];
    const isGatePier = Boolean(previous.gate || next.gate);
    const isCorner = (boundary.vertices ?? []).some(
      ([x, z]) => Number(x) === column.x && Number(z) === column.z,
    );
    const isPost = isCorner
      || isGatePier
      || column.index % Number(plan.appearance.post_spacing ?? 8) === 0;
    const baseY = support.y + 1;
    const desired = isPost
      ? [
          { x: column.x, y: baseY, z: column.z, block: plan.appearance.post_block, role: isGatePier ? 'gate_pier' : 'post' },
          { x: column.x, y: baseY + 1, z: column.z, block: plan.appearance.post_block, role: isGatePier ? 'gate_pier' : 'post' },
          {
            x: column.x,
            y: baseY + 2,
            z: column.z,
            block: isGatePier ? plan.appearance.gate_light : plan.appearance.post_cap,
            role: isGatePier ? 'gate_light' : 'post_cap',
          },
        ]
      : [
          { x: column.x, y: baseY, z: column.z, block: plan.appearance.field_block, role: 'field' },
        ];

    for (const target of desired) {
      const existing = snapshotColumn.get(target.y);
      const disposition = desiredDisposition(existing, target.block);
      const described = {
        ...target,
        expected: baseName(existing),
        supportY: support.y,
        supportBlock: support.block,
        disposition,
      };
      if (isFoliageBlock(existing) && disposition === 'replace') {
        report.trimmedFoliage.push(described);
      }
      if (disposition === 'collision') {
        report.collisions.push(described);
        continue;
      }
      const id = targetKey(target);
      const prior = allTargets.get(id);
      if (prior) {
        if (baseName(prior.block) === baseName(described.block)) {
          report.sharedTargets.push({ ...described, priorBoundary: prior.boundaryId });
        } else {
          report.duplicateTargets.push({ ...described, priorBoundary: prior.boundaryId });
        }
        continue;
      }
      allTargets.set(id, { boundaryId: boundary.id, ...described });
      report.targets.push(described);
      if (disposition === 'replace') {
        operations.push({
          boundaryId: boundary.id,
          ...described,
        });
      }
    }
  }
  boundaryReports.push(report);
}

for (const report of boundaryReports) {
  if (report.waterColumns.length) {
    globalErrors.push(`${report.id} has ${report.waterColumns.length} water-supported fence columns`);
  }
  if (report.missingColumns.length) {
    globalErrors.push(`${report.id} has ${report.missingColumns.length} missing/invalid supports`);
  }
  if (report.collisions.length) {
    globalErrors.push(`${report.id} has ${report.collisions.length} target collisions`);
  }
  if (report.duplicateTargets.length) {
    globalErrors.push(`${report.id} has ${report.duplicateTargets.length} duplicate targets`);
  }
}

const output = [
  '# GENERATED FILE — MainStreet project/block white-picket boundaries',
  `# plan: ${planPath}`,
  `# plan sha256: ${sha256File(planPath)}`,
  `# snapshot: ${regionDir}`,
  '# Safety: exact-material REPL operations only; water and collisions are hard failures.',
  `# boundaries: ${boundaryReports.length}; targets: ${allTargets.size}; operations: ${operations.length}`,
  '',
  ...operations.map((operation) => (
    `REPL ${operation.x} ${operation.y} ${operation.z} ${operation.x} ${operation.y} ${operation.z} `
      + `${operation.expected} ${operation.block}`
  )),
  '',
].join('\n');

const snapshotFiles = fs.readdirSync(regionDir)
  .filter((name) => /^r\.-?\d+\.-?\d+\.mca$/.test(name))
  .sort()
  .map((name) => ({
    name,
    sha256: sha256File(path.join(regionDir, name)),
  }));
const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-project-boundaries',
  generatedAtUtc: new Date().toISOString(),
  plan: planPath,
  planSha256: sha256File(planPath),
  snapshot: { regionDir, files: snapshotFiles },
  output: outputPath,
  stats: {
    boundaries: boundaryReports.length,
    targets: allTargets.size,
    operations: operations.length,
    waterColumns: boundaryReports.reduce((sum, entry) => sum + entry.waterColumns.length, 0),
    missingColumns: boundaryReports.reduce((sum, entry) => sum + entry.missingColumns.length, 0),
    collisions: boundaryReports.reduce((sum, entry) => sum + entry.collisions.length, 0),
    duplicateTargets: boundaryReports.reduce((sum, entry) => sum + entry.duplicateTargets.length, 0),
    sharedTargets: boundaryReports.reduce((sum, entry) => sum + entry.sharedTargets.length, 0),
    trimmedFoliage: boundaryReports.reduce((sum, entry) => sum + entry.trimmedFoliage.length, 0),
    gateCount: boundaryReports.reduce((sum, entry) => sum + entry.gates.length, 0),
  },
  errors: globalErrors,
  boundaries: boundaryReports,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  output: outputPath,
  report: reportPath,
  ...report.stats,
  errors: globalErrors.slice(0, 20),
}, null, 2));
if (globalErrors.length) process.exitCode = 1;
