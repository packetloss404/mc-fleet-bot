#!/usr/bin/env node
/**
 * Deterministic, read-only Town Expansion representative route QA.
 *
 * The manifest names small, program-specific start/end anchor boxes and a
 * bounded search volume. This verifier selects a standable cell in each anchor
 * deterministically, proves a normal-walk path through the immutable Anvil
 * snapshot in both directions, and binds every result to the canonical package
 * and post-snapshot hashes. It never connects to Minecraft or writes world
 * state.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST =
  'docs/redevelopment/2026-07-28-town-expansion/'
  + 'town-expansion-representative-route-manifest.json';
const DEFAULT_REPORT =
  'data/world-review/town-expansion-r1-post-release-route-qa-2026-07-28.json';
const DEFAULT_MARKDOWN =
  'docs/redevelopment/2026-07-28-town-expansion/'
  + 'town-expansion-post-release-route-qa.md';

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const DEADLY = new Set([
  'minecraft:lava',
  'minecraft:fire',
  'minecraft:soul_fire',
  'minecraft:cactus',
  'minecraft:magma_block',
  'minecraft:sweet_berry_bush',
  'minecraft:powder_snow',
]);
const PASSABLE_EXACT = new Set([
  'minecraft:snow',
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:fern',
  'minecraft:large_fern',
  'minecraft:dead_bush',
  'minecraft:lantern',
  'minecraft:soul_lantern',
  'minecraft:chain',
  'minecraft:iron_chain',
  'minecraft:end_rod',
  'minecraft:light',
  'minecraft:flower_pot',
  'minecraft:lever',
  'minecraft:tripwire',
  'minecraft:cobweb',
]);
const PASSABLE_SUFFIX = [
  '_carpet',
  '_banner',
  '_sign',
  '_button',
  '_torch',
  '_rail',
  '_pressure_plate',
  '_sapling',
];

function parseArgs(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--manifest') output.manifest = argv[++index];
    else if (token === '--regions') output.regions = argv[++index];
    else if (token === '--overlay-ops') output.overlayOps = argv[++index];
    else if (token === '--report') output.report = argv[++index];
    else if (token === '--markdown') output.markdown = argv[++index];
    else if (token === '--no-write') output.noWrite = true;
    else throw new Error(`unknown argument ${token}`);
  }
  return output;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function normalizePath(filename) {
  return path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
}

function normalizeBox(raw, label) {
  if (!Array.isArray(raw) || raw.length !== 6 || raw.some(
    (value) => !Number.isSafeInteger(Number(value)),
  )) {
    throw new Error(`${label} must be six integer coordinates`);
  }
  const values = raw.map(Number);
  return [
    Math.min(values[0], values[3]),
    Math.min(values[1], values[4]),
    Math.min(values[2], values[5]),
    Math.max(values[0], values[3]),
    Math.max(values[1], values[4]),
    Math.max(values[2], values[5]),
  ];
}

function baseName(state) {
  return String(state ?? '').split('[', 1)[0];
}

function properties(state) {
  const raw = String(state ?? '');
  const bracket = raw.indexOf('[');
  if (bracket < 0 || !raw.endsWith(']')) return {};
  return Object.fromEntries(raw.slice(bracket + 1, -1).split(',').map((entry) => {
    const separator = entry.indexOf('=');
    return separator < 0
      ? [entry, '']
      : [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
}

function isDoor(name) {
  return name.endsWith('_door') || name.endsWith('_fence_gate');
}

function passable(state) {
  const name = baseName(state);
  if (AIR.has(name)) return true;
  if (DEADLY.has(name)) return false;
  if (PASSABLE_EXACT.has(name)) return true;
  if (PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix))) return true;
  // Doors are modeled as an interaction threshold. Their open state is a live
  // controls check, while their exact presence is still recorded in this gate.
  if (isDoor(name)) return true;
  if (name.endsWith('_trapdoor')) return properties(state).open === 'true';
  return false;
}

function footing(state) {
  const name = baseName(state);
  if (AIR.has(name) || DEADLY.has(name)) return false;
  if (name.endsWith('_carpet')) return false;
  if (name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) {
    return false;
  }
  return !passable(state)
    || name.endsWith('_slab')
    || name.endsWith('_stairs')
    || (name.endsWith('_trapdoor') && properties(state).open !== 'true');
}

function pointKey(point) {
  return point.join(',');
}

function pointFromKey(key) {
  return key.split(',').map(Number);
}

function inside(point, box) {
  return (
    point[0] >= box[0] && point[0] <= box[3]
    && point[1] >= box[1] && point[1] <= box[4]
    && point[2] >= box[2] && point[2] <= box[5]
  );
}

function comparePoints(left, right) {
  return (
    left[1] - right[1]
    || left[2] - right[2]
    || left[0] - right[0]
  );
}

function center(box) {
  return [
    (box[0] + box[3]) / 2,
    (box[1] + box[4]) / 2,
    (box[2] + box[5]) / 2,
  ];
}

function distanceSquared(left, right) {
  return (
    (left[0] - right[0]) ** 2
    + (left[1] - right[1]) ** 2
    + (left[2] - right[2]) ** 2
  );
}

class RouteSnapshot {
  constructor(directory) {
    this.snapshot = new DetailedAnvilSnapshot(directory);
    this.blockCache = new Map();
    this.standableCache = new Map();
    this.overlay = new Map();
  }

  async block(point) {
    const key = pointKey(point);
    if (this.overlay.has(key)) return this.overlay.get(key);
    if (!this.blockCache.has(key)) {
      this.blockCache.set(
        key,
        await this.snapshot.getBlock(point[0], point[1], point[2]),
      );
    }
    return this.blockCache.get(key);
  }

  async applyGuardedOperations(filename) {
    const bytes = fs.readFileSync(filename);
    const operations = [];
    for (const [index, rawLine] of bytes.toString('utf8').split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(/\s+/);
      if (parts[0] !== 'REPL' || parts.length !== 9) {
        throw new Error(
          `unsupported projected operation at ${normalizePath(filename)}:${index + 1}`,
        );
      }
      const box = normalizeBox(
        parts.slice(1, 7).map(Number),
        `overlay line ${index + 1}`,
      );
      operations.push({
        line: index + 1,
        box,
        expected: parts[7],
        replacement: parts[8],
      });
    }
    let targetedCells = 0;
    for (const operation of operations) {
      for (let y = operation.box[1]; y <= operation.box[4]; y += 1) {
        for (let z = operation.box[2]; z <= operation.box[5]; z += 1) {
          for (let x = operation.box[0]; x <= operation.box[3]; x += 1) {
            const point = [x, y, z];
            const observed = await this.block(point);
            if (observed !== operation.expected) {
              throw new Error(
                `projected guard mismatch ${pointKey(point)} at line `
                + `${operation.line}: expected ${operation.expected}, observed ${observed}`,
              );
            }
            this.overlay.set(pointKey(point), operation.replacement);
            this.standableCache.delete(pointKey(point));
            this.standableCache.delete(pointKey([x, y + 1, z]));
            this.standableCache.delete(pointKey([x, y - 1, z]));
            targetedCells += 1;
          }
        }
      }
    }
    return {
      file: normalizePath(filename),
      sha256: sha256(bytes),
      operationCount: operations.length,
      targetedCells,
      exactGuardsPassed: targetedCells,
      projectedOnly: true,
    };
  }

  async standable(point) {
    const key = pointKey(point);
    if (this.standableCache.has(key)) return this.standableCache.get(key);
    const feet = await this.block(point);
    const head = await this.block([point[0], point[1] + 1, point[2]]);
    const support = await this.block([point[0], point[1] - 1, point[2]]);
    const result = (
      feet !== null
      && head !== null
      && support !== null
      && passable(feet)
      && passable(head)
      && footing(support)
    );
    this.standableCache.set(key, result);
    return result;
  }
}

async function anchorCells(snapshot, box) {
  const candidates = [];
  for (let y = box[1]; y <= box[4]; y += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      for (let x = box[0]; x <= box[3]; x += 1) {
        const point = [x, y, z];
        if (await snapshot.standable(point)) candidates.push(point);
      }
    }
  }
  const target = center(box);
  candidates.sort((left, right) => (
    distanceSquared(left, target) - distanceSquared(right, target)
    || comparePoints(left, right)
  ));
  return candidates;
}

function candidateMoves(point) {
  const output = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const dy of [0, 1, -1]) {
      output.push([point[0] + dx, point[1] + dy, point[2] + dz]);
    }
  }
  return output;
}

function reconstructPath(parent, endKey) {
  const output = [];
  let cursor = endKey;
  while (cursor !== null) {
    output.push(pointFromKey(cursor));
    cursor = parent.get(cursor) ?? null;
  }
  output.reverse();
  return output;
}

async function findPath(snapshot, startCells, endCells, bounds, maxVisited) {
  const endKeys = new Set(endCells.map(pointKey));
  const queue = [];
  const parent = new Map();
  let closest = null;
  const distanceToEnd = (point) => Math.min(...endCells.map((end) => (
    Math.abs(point[0] - end[0])
    + Math.abs(point[1] - end[1])
    + Math.abs(point[2] - end[2])
  )));
  for (const start of startCells) {
    const key = pointKey(start);
    queue.push(start);
    parent.set(key, null);
  }
  let cursor = 0;
  while (cursor < queue.length && cursor < maxVisited) {
    const point = queue[cursor++];
    const key = pointKey(point);
    const distance = distanceToEnd(point);
    if (!closest || distance < closest.distance) closest = { point, distance };
    if (endKeys.has(key)) {
      return {
        path: reconstructPath(parent, key),
        visitedCells: cursor,
        frontierCells: queue.length,
        closest,
      };
    }
    for (const candidate of candidateMoves(point)) {
      if (!inside(candidate, bounds)) continue;
      const candidateKey = pointKey(candidate);
      if (parent.has(candidateKey)) continue;
      if (!(await snapshot.standable(candidate))) continue;
      parent.set(candidateKey, key);
      queue.push(candidate);
    }
  }
  return {
    path: null,
    visitedCells: cursor,
    frontierCells: queue.length,
    closest,
  };
}

async function auditPath(snapshot, route, pathPoints) {
  const states = [];
  const doorInteractions = [];
  let minimumHeadroom = Infinity;
  let maximumRise = 0;
  let maximumDrop = 0;
  for (let index = 0; index < pathPoints.length; index += 1) {
    const point = pathPoints[index];
    const feet = await snapshot.block(point);
    const head = await snapshot.block([point[0], point[1] + 1, point[2]]);
    const support = await snapshot.block([point[0], point[1] - 1, point[2]]);
    let headroom = 0;
    for (
      let y = point[1];
      y <= route.searchBounds[4] + 2
        && passable(await snapshot.block([point[0], y, point[2]]));
      y += 1
    ) {
      headroom += 1;
    }
    minimumHeadroom = Math.min(minimumHeadroom, headroom);
    if (isDoor(baseName(feet))) {
      doorInteractions.push({
        point,
        state: feet,
      });
    }
    states.push({ point, feet, head, support });
    if (index > 0) {
      const delta = point[1] - pathPoints[index - 1][1];
      maximumRise = Math.max(maximumRise, delta);
      maximumDrop = Math.max(maximumDrop, -delta);
    }
  }
  return {
    path: pathPoints,
    pathCellCount: pathPoints.length,
    exactPathSha256: sha256(JSON.stringify(pathPoints)),
    exactStateSha256: sha256(JSON.stringify(states)),
    minimumHeadroomBlocks: Number.isFinite(minimumHeadroom)
      ? minimumHeadroom
      : 0,
    maximumRiseBlocks: maximumRise,
    maximumDropBlocks: maximumDrop,
    doorInteractions,
    violations: [
      ...(minimumHeadroom < route.minimumHeadroomBlocks
        ? [`minimum headroom ${minimumHeadroom} < ${route.minimumHeadroomBlocks}`]
        : []),
      ...(maximumRise > 1 ? [`maximum rise ${maximumRise} > 1`] : []),
      ...(maximumDrop > 1 ? [`maximum drop ${maximumDrop} > 1`] : []),
      ...(pathPoints.length < Number(route.minimumPathCells ?? 2)
        ? [`path cells ${pathPoints.length} < ${route.minimumPathCells ?? 2}`]
        : []),
    ],
  };
}

function manifestErrors(manifest) {
  const errors = [];
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
  if (manifest.id !== 'town-expansion-r1-representative-routes') {
    errors.push('unexpected manifest id');
  }
  if (!Array.isArray(manifest.requiredDomains) || !manifest.requiredDomains.length) {
    errors.push('requiredDomains must be a non-empty array');
  }
  if (!Array.isArray(manifest.routes) || !manifest.routes.length) {
    errors.push('routes must be a non-empty array');
  }
  const ids = new Set();
  for (const [index, route] of (manifest.routes ?? []).entries()) {
    if (!route.id || ids.has(route.id)) errors.push(`route ${index} has duplicate/missing id`);
    ids.add(route.id);
    if (!manifest.requiredDomains?.includes(route.domain)) {
      errors.push(`route ${route.id} has unknown domain ${route.domain}`);
    }
    for (const field of ['searchBounds', 'startAnchor', 'endAnchor']) {
      try {
        const raw = field === 'searchBounds' ? route[field] : route[field]?.box;
        normalizeBox(raw, `${route.id}.${field}`);
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (route.requiredBidirectional !== true) {
      errors.push(`route ${route.id} must require bidirectional proof`);
    }
    if (!Number.isSafeInteger(route.minimumHeadroomBlocks)
      || route.minimumHeadroomBlocks < 2) {
      errors.push(`route ${route.id} has invalid minimum headroom`);
    }
  }
  for (const domain of manifest.requiredDomains ?? []) {
    if (!(manifest.routes ?? []).some((route) => route.domain === domain)) {
      errors.push(`required domain ${domain} has no route`);
    }
  }
  return errors;
}

async function verifyRoute(snapshot, rawRoute) {
  const route = {
    ...rawRoute,
    searchBounds: normalizeBox(rawRoute.searchBounds, `${rawRoute.id}.searchBounds`),
  };
  const startBox = normalizeBox(rawRoute.startAnchor.box, `${rawRoute.id}.startAnchor`);
  const endBox = normalizeBox(rawRoute.endAnchor.box, `${rawRoute.id}.endAnchor`);
  const startCells = await anchorCells(snapshot, startBox);
  const endCells = await anchorCells(snapshot, endBox);
  const maxVisited = Number(route.maxVisited ?? 400000);
  const failures = [];
  if (!startCells.length) failures.push('start anchor has no standable cells');
  if (!endCells.length) failures.push('end anchor has no standable cells');
  if (failures.length) {
    return {
      id: route.id,
      domain: route.domain,
      passed: false,
      failures,
      anchors: {
        start: { ...route.startAnchor, standableCandidates: startCells.length },
        end: { ...route.endAnchor, standableCandidates: endCells.length },
      },
      directions: [],
    };
  }

  const forward = await findPath(
    snapshot,
    startCells,
    endCells,
    route.searchBounds,
    maxVisited,
  );
  const reverse = await findPath(
    snapshot,
    endCells,
    startCells,
    route.searchBounds,
    maxVisited,
  );
  const directionResults = [];
  for (const [direction, result] of [
    ['forward', forward],
    ['reverse', reverse],
  ]) {
    if (!result.path) {
      directionResults.push({
        direction,
        passed: false,
        reached: false,
        visitedCells: result.visitedCells,
        frontierCells: result.frontierCells,
        closest: result.closest,
        violations: ['no bounded normal-walk path found'],
        movementPolicyViolations: ['no bounded normal-walk path found'],
        legs: [{
          reached: false,
          movementPolicyViolations: ['no bounded normal-walk path found'],
        }],
      });
      continue;
    }
    const audit = await auditPath(snapshot, route, result.path);
    directionResults.push({
      direction,
      passed: audit.violations.length === 0,
      reached: true,
      visitedCells: result.visitedCells,
      frontierCells: result.frontierCells,
      ...audit,
      movementPolicyViolations: audit.violations,
      legs: [{
        reached: true,
        movementPolicyViolations: audit.violations,
      }],
    });
  }
  const passed = directionResults.every((direction) => direction.passed);
  return {
    id: route.id,
    domain: route.domain,
    description: route.description,
    standard: route.standard,
    accessClass: route.accessClass,
    passed,
    failures: directionResults.flatMap((direction) => direction.violations),
    movementPolicy: {
      normalWalk: true,
      dig: false,
      tower: false,
      parkour: false,
      sprint: false,
      jumpControl: false,
      maximumRiseBlocks: 1,
      maximumDropBlocks: 1,
      minimumHeadroomBlocks: route.minimumHeadroomBlocks,
    },
    searchBounds: route.searchBounds,
    anchors: {
      start: {
        ...route.startAnchor,
        box: startBox,
        standableCandidates: startCells.length,
        resolvedForward: forward.path?.[0] ?? null,
        resolvedReverse: reverse.path?.at(-1) ?? null,
      },
      end: {
        ...route.endAnchor,
        box: endBox,
        standableCandidates: endCells.length,
        resolvedForward: forward.path?.at(-1) ?? null,
        resolvedReverse: reverse.path?.[0] ?? null,
      },
    },
    directions: directionResults,
  };
}

function markdown(report, manifestPath) {
  const lines = [
    '# Town Expansion R1 post-release representative route QA',
    '',
    `- Status: **${report.status}**`,
    `- Acceptance class: \`${report.acceptanceClass}\``,
    `- Immutable post snapshot: \`${report.postSnapshot.sha256}\``,
    `- Canonical package: \`${report.packageHashes['town-expansion-r1'].sha256}\``,
    `- Manifest: \`${normalizePath(manifestPath)}\``,
    `- Routes: ${report.summary.passed}/${report.summary.routes} passed`,
    `- Directions: ${report.summary.passedDirections}/${report.summary.directionalRuns} passed`,
    `- Exact path cells: ${report.summary.exactPathCells}`,
    `- Door interaction thresholds: ${report.summary.doorInteractionThresholds}`,
    ...(report.projection
      ? [
        `- Projected guarded operations: \`${report.projection.sha256}\``,
        `- Projected target cells: ${report.projection.targetedCells}`,
      ]
      : []),
    '',
    '## Coverage',
    '',
    '| Domain | Routes | Passed |',
    '|---|---:|---:|',
    ...report.coverage.domains.map(
      (entry) => `| ${entry.domain} | ${entry.routes} | ${entry.passed} |`,
    ),
    '',
    '## Representative routes',
    '',
    '| Route | Domain | Forward | Reverse | Path cells (F/R) | Minimum headroom |',
    '|---|---|---:|---:|---:|---:|',
    ...report.tests.map((route) => {
      const [forward, reverse] = route.directions;
      return `| ${route.id} | ${route.domain} | ${forward?.passed ? 'PASS' : 'FAIL'} | ${reverse?.passed ? 'PASS' : 'FAIL'} | ${forward?.pathCellCount ?? 0}/${reverse?.pathCellCount ?? 0} | ${Math.min(forward?.minimumHeadroomBlocks ?? 0, reverse?.minimumHeadroomBlocks ?? 0)} |`;
    }),
    '',
    '## Blocking offline findings',
    '',
    ...(report.tests.filter((route) => !route.passed).length
      ? report.tests.filter((route) => !route.passed).map((route) => {
        const gaps = route.directions.map((direction) => (
          direction.reached
            ? 'reached'
            : `closest ${direction.closest?.distance ?? 'unknown'} blocks at ${direction.closest?.point?.join(',') ?? 'none'}`
        )).join('; ');
        return `- **${route.id}:** ${route.failures.join('; ')} (${gaps}).`;
      })
      : ['- None.']),
    '',
    '## Live-only follow-up gates',
    '',
    ...report.liveOnlyGates.map((gate) => `- **${gate.id}:** ${gate.requirement} Status: \`${gate.status}\`.`),
    '',
    report.passed && report.projection
      ? 'This PASS proves only the exact guarded offline projection. It is not'
      : report.passed
      ? 'This PASS accepts immutable-snapshot geometry only. It does not claim a'
      : 'This FAIL does not accept the immutable-snapshot geometry and cannot',
    report.passed && report.projection
      ? 'as-built evidence and cannot satisfy final acceptance before execution,'
      : report.passed
      ? 'live Mineflayer traversal, powered iron-door controls, dynamic entity'
      : 'satisfy Town Expansion final acceptance. A future PASS would still not',
    report.passed && report.projection
      ? 'fresh post snapshot, route rerun, live controls, and entity clearance.'
      : report.passed
      ? 'clearance, or citizen-shift activation.'
      : 'claim live traversal, powered-door controls, dynamic entity clearance, or citizen activation.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export async function verifyTownExpansionRoutes(rawOptions = {}) {
  const manifestPath = path.resolve(
    ROOT,
    rawOptions.manifest ?? DEFAULT_MANIFEST,
  );
  const reportPath = path.resolve(ROOT, rawOptions.report ?? DEFAULT_REPORT);
  const markdownPath = path.resolve(
    ROOT,
    rawOptions.markdown ?? DEFAULT_MARKDOWN,
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const errors = manifestErrors(manifest);
  if (errors.length) throw new Error(`invalid route manifest: ${errors.join('; ')}`);

  const regionsPath = path.resolve(
    ROOT,
    rawOptions.regions ?? manifest.postSnapshot.directory,
  );
  const packagePath = path.resolve(ROOT, manifest.package.file);
  if (!fs.existsSync(regionsPath)) throw new Error(`regions missing: ${regionsPath}`);
  if (!fs.existsSync(packagePath)) throw new Error(`package missing: ${packagePath}`);

  const postSnapshot = hashSnapshotDirectory(regionsPath);
  const packageSha256 = sha256File(packagePath);
  const identityFailures = [];
  if (postSnapshot.sha256 !== manifest.postSnapshot.sha256) {
    identityFailures.push('post snapshot hash mismatch');
  }
  if (packageSha256 !== manifest.package.sha256) {
    identityFailures.push('canonical package hash mismatch');
  }

  const snapshot = new RouteSnapshot(regionsPath);
  const overlayPath = rawOptions.overlayOps
    ? path.resolve(ROOT, rawOptions.overlayOps)
    : null;
  const projection = overlayPath
    ? await snapshot.applyGuardedOperations(overlayPath)
    : null;
  const tests = [];
  for (const route of manifest.routes) {
    tests.push(await verifyRoute(snapshot, route));
  }
  const requiredDomains = new Set(manifest.requiredDomains);
  const domains = [...requiredDomains].sort().map((domain) => {
    const domainRoutes = tests.filter((route) => route.domain === domain);
    return {
      domain,
      routes: domainRoutes.length,
      passed: domainRoutes.filter((route) => route.passed).length,
    };
  });
  const isolationAssertions = (manifest.isolationAssertions ?? []).map(
    (assertion) => {
      if (assertion.kind !== 'json-equals') {
        return {
          ...assertion,
          observed: null,
          passed: false,
          failure: `unsupported isolation assertion kind ${assertion.kind}`,
        };
      }
      const sourcePath = path.resolve(ROOT, assertion.source.file);
      if (!fs.existsSync(sourcePath)) {
        return {
          ...assertion,
          observed: null,
          passed: false,
          failure: `missing assertion source ${assertion.source.file}`,
        };
      }
      let observed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      for (const segment of assertion.source.path) observed = observed?.[segment];
      const passed = JSON.stringify(observed) === JSON.stringify(assertion.expected);
      return {
        ...assertion,
        source: {
          ...assertion.source,
          sha256: sha256File(sourcePath),
        },
        observed,
        passed,
        failure: passed ? null : 'observed value does not equal expected value',
      };
    },
  );
  const failedTests = tests.filter((route) => !route.passed);
  const failedIsolation = isolationAssertions.filter((entry) => !entry.passed);
  const passed = (
    identityFailures.length === 0
    && failedTests.length === 0
    && failedIsolation.length === 0
    && domains.every((entry) => entry.routes > 0 && entry.routes === entry.passed)
  );
  const directions = tests.flatMap((test) => test.directions);
  const blockingFindings = failedTests.map((route) => ({
    id: route.id,
    domain: route.domain,
    description: route.description,
    failures: route.failures,
    directions: route.directions.map((direction) => ({
      direction: direction.direction,
      reached: direction.reached,
      closestDistanceBlocks: direction.closest?.distance ?? null,
      closestPoint: direction.closest?.point ?? null,
    })),
  }));
  const report = {
    schemaVersion: 1,
    id: 'town-expansion-r1-post-release-route-qa',
    generatedAtUtc: new Date().toISOString(),
    status: passed ? 'PASS' : 'FAIL',
    passed,
    readOnly: true,
    liveWorldMutated: false,
    databaseMutated: false,
    acceptanceClass: passed
      ? projection
        ? 'OFFLINE_PROJECTED_REPAIR_GEOMETRY_ACCEPTED_NOT_AS_BUILT'
        : 'IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING'
      : 'REJECTED',
    completeForTownExpansionOfflineAcceptance: passed && projection === null,
    completeForCitizenActivation: false,
    manifest: {
      path: normalizePath(manifestPath),
      sha256: sha256File(manifestPath),
    },
    postSnapshot: {
      directory: normalizePath(regionsPath),
      ...postSnapshot,
    },
    packageHashes: {
      'town-expansion-r1': {
        file: normalizePath(packagePath),
        sha256: packageSha256,
      },
    },
    projection,
    movementPolicy: manifest.movementPolicy,
    coverage: {
      requiredDomains: [...requiredDomains].sort(),
      domains,
      passed: domains.every(
        (entry) => entry.routes > 0 && entry.routes === entry.passed,
      ),
    },
    isolationAssertions,
    blockingFindings,
    tests,
    routes: tests,
    liveOnlyGates: manifest.liveOnlyGates,
    summary: {
      routes: tests.length,
      passed: tests.filter((route) => route.passed).length,
      failed: failedTests.length,
      directionalRuns: directions.length,
      passedDirections: directions.filter((direction) => direction.passed).length,
      exactPathCells: directions.reduce(
        (sum, direction) => sum + Number(direction.pathCellCount ?? 0),
        0,
      ),
      doorInteractionThresholds: directions.reduce(
        (sum, direction) => sum + (direction.doorInteractions?.length ?? 0),
        0,
      ),
      identityFailures,
      isolationFailures: failedIsolation.map((entry) => entry.id),
    },
  };

  if (!rawOptions.noWrite) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(markdownPath, markdown(report, manifestPath));
  }
  return report;
}

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await verifyTownExpansionRoutes(options);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      acceptanceClass: report.acceptanceClass,
      routes: report.summary.routes,
      passed: report.summary.passed,
      failed: report.summary.failed,
      directionalRuns: report.summary.directionalRuns,
      exactPathCells: report.summary.exactPathCells,
    }, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
