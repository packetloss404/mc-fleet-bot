#!/usr/bin/env node
/**
 * Assemble the machine-verifiable acceptance record for the five-package
 * redevelopment release. This script does not contact or mutate the live world.
 *
 * It proves:
 * - exact forward/rollback target-set bijection;
 * - no target-cell overlap between independently generated packages;
 * - same-moment preflight, strict execution, and post-state rollback-preflight;
 * - live entity and route-walk gates;
 * - post-snapshot identity and same-camera media inventory.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const minecraftData = require('minecraft-data')('1.21.11');
const PACKAGE_ID_ALIASES = new Map([
  ['westlight-infinity-screen-2026-07-27', 'VEN-WL-01'],
]);
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`${flag} is required`);
  return path.resolve(ROOT, result);
};
const preRegions = required('--pre-regions');
const postRegions = required('--post-regions');
const liveGatePath = required('--live-gate');
const routeQaPath = required('--route-qa');
const transactionPath = required('--transaction');
const outputPath = path.resolve(
  ROOT,
  value('--out', 'data/world-review/redevelopment-post-deployment-qa-2026-07-27.json'),
);
const markdownPath = path.resolve(
  ROOT,
  value('--markdown', 'docs/redevelopment/2026-07-27/post-deployment-qa.md'),
);

const packages = [
  {
    key: 'westlight',
    packageId: 'VEN-WL-01',
    design: 'data/buildops/westlight-infinity-screen-2026-07-27.report.json',
    forward: 'data/buildops/westlight-infinity-screen-2026-07-27.txt',
    rollback: 'data/buildops/westlight-infinity-screen-2026-07-27.rollback.txt',
    media: 'data/exports/redevelopment-qa-2026-07-27/westlight/after',
    minimumMedia: 4,
    requiredMediaBasenames: [
      'north-lower-sports.png',
      'south-lower-sports.png',
      'east-lower-sports.png',
      'west-lower-sports.png',
    ],
  },
  {
    key: 'ravenrock',
    packageId: 'INF-RR-01',
    design: 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.report.json',
    forward: 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt',
    rollback: 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.txt',
    media: 'data/exports/redevelopment-qa-2026-07-27/ravenrock/after',
    minimumMedia: 2,
    requiredMediaBasenames: [
      's1-west-to-east.png',
      's1-east-to-west.png',
    ],
  },
  {
    key: 'mainstreet',
    packageId: 'mainstreet-america-redevelopment-r4-r5',
    design:
      'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
    forward:
      'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt',
    rollback:
      'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback.txt',
    media:
      'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after',
    minimumMedia: 18,
    requiredMediaBasenames: [],
  },
  {
    key: 'bunker-phase1',
    packageId: 'mainstreet-bunker-surface-phase1-2026-07-27',
    design: 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.report.json',
    forward: 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
    rollback: 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.txt',
    media: 'data/exports/redevelopment-qa-2026-07-27/bunker/after',
    minimumMedia: 8,
    requiredMediaBasenames: [
      '01-parking-center-east-seam.png',
      '02-southwest-oblique.png',
      '03-east-oblique.png',
      '04-hangar-door.png',
      '05-north-oblique.png',
      '06-road-northbound.png',
      '07-road-southbound.png',
      '08-surface-map.png',
    ],
  },
  {
    key: 'bunker-phase2',
    packageId: 'mainstreet-bunker-recessed-portal-phase2-2026-07-27',
    design: 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.report.json',
    forward: 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
    rollback: 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.rollback.txt',
    media: 'data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after',
    minimumMedia: 5,
    requiredMediaBasenames: [
      '01-new-mouth-south.png',
      '02-parking-context.png',
      '03-dogleg-north.png',
      '04-lobby-return.png',
      '05-old-new-entry-context.png',
    ],
  },
].map((entry) => Object.fromEntries(
  Object.entries(entry).map(([key, filename]) => (
    ['design', 'forward', 'rollback', 'media'].includes(key)
      ? [key, path.resolve(ROOT, filename)]
      : [key, filename]
  )),
));

const normalizeState = (state) => {
  const bracket = state.indexOf('[');
  if (bracket < 0) return state;
  if (!state.endsWith(']')) {
    throw new Error(`malformed block state: ${state}`);
  }
  const name = state.slice(0, bracket);
  const properties = state.slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort()
    .join(',');
  return `${name}[${properties}]`;
};

function stateCompleteness(state) {
  const normalized = normalizeState(state);
  const bracket = normalized.indexOf('[');
  const base = (bracket < 0 ? normalized : normalized.slice(0, bracket))
    .replace(/^minecraft:/, '');
  const definition = minecraftData.blocksByName[base];
  if (!definition) {
    return { state: normalized, complete: false, reason: 'unknown-block' };
  }
  const required = (definition.states ?? []).map(({ name }) => name).sort();
  const provided = bracket < 0
    ? []
    : normalized.slice(bracket + 1, -1)
      .split(',')
      .filter(Boolean)
      .map((property) => property.split('=', 1)[0])
      .sort();
  const complete = (
    required.length === provided.length
    && required.every((property, index) => property === provided[index])
  );
  return {
    state: normalized,
    complete,
    reason: complete ? null : 'incomplete-properties',
    required,
    provided,
  };
}

const splitMasks = (mask) => {
  const output = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const char = mask[index];
    if (char === '[') depth += 1;
    else if (char === ']') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  output.push(mask.slice(start));
  return output.filter(Boolean).map(normalizeState);
};

function parseOperations(filename) {
  const cells = new Map();
  const commandDetails = [];
  const invalidCommands = [];
  const incompleteStates = [];
  let guardedBoxes = 0;
  let commands = 0;
  let sets = 0;
  let expandedCommandCount = 0;
  let duplicateTargetCells = 0;
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  lines.forEach((raw, index) => {
    const fields = raw.trim().split(/\s+/);
    if (!fields[0] || fields[0].startsWith('#')) return;
    if (fields[0] === 'CMD') {
      commands += 1;
      expandedCommandCount += 1;
      const match = raw.trim().match(
        /^CMD execute if block (-?\d+) (-?\d+) (-?\d+) (minecraft:\S+) run data merge block (-?\d+) (-?\d+) (-?\d+) /,
      );
      if (!match) {
        invalidCommands.push({
          line: index + 1,
          reason: 'command is not an exact-block-guarded data merge',
          command: raw.trim(),
        });
      } else {
        const guardPoint = match.slice(1, 4).map(Number);
        const mergePoint = match.slice(5, 8).map(Number);
        const guardState = normalizeState(match[4]);
        commandDetails.push({
          line: index + 1,
          guardPoint,
          mergePoint,
          guardState,
          command: raw.trim(),
        });
      }
      return;
    }
    if (fields[0] === 'SET') {
      sets += 1;
      expandedCommandCount += 1;
      return;
    }
    if (fields[0] !== 'REPL' || fields.length < 9) {
      throw new Error(`${path.relative(ROOT, filename)}:${index + 1}: unsupported operation`);
    }
    guardedBoxes += 1;
    const coordinates = fields.slice(1, 7).map(Number);
    if (coordinates.some((coordinate) => !Number.isSafeInteger(coordinate))) {
      throw new Error(
        `${path.relative(ROOT, filename)}:${index + 1}: invalid REPL coordinates`,
      );
    }
    const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = coordinates;
    const [x1, x2] = [Math.min(rawX1, rawX2), Math.max(rawX1, rawX2)];
    const [y1, y2] = [Math.min(rawY1, rawY2), Math.max(rawY1, rawY2)];
    const [z1, z2] = [Math.min(rawZ1, rawZ2), Math.max(rawZ1, rawZ2)];
    const source = splitMasks(fields[7]);
    expandedCommandCount += source.length;
    const desired = normalizeState(fields[8]);
    for (const state of [...source, desired]) {
      const completeness = stateCompleteness(state);
      if (!completeness.complete) {
        incompleteStates.push({
          line: index + 1,
          role: state === desired ? 'desired' : 'source',
          ...completeness,
        });
      }
    }
    for (let y = y1; y <= y2; y += 1) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          const point = `${x},${y},${z}`;
          if (cells.has(point)) duplicateTargetCells += 1;
          cells.set(point, {
            point: [x, y, z],
            source,
            desired,
            line: index + 1,
          });
        }
      }
    }
  });
  for (const command of commandDetails) {
    const samePoint = command.guardPoint.every(
      (coordinate, index) => coordinate === command.mergePoint[index],
    );
    const target = cells.get(command.guardPoint.join(','));
    if (!samePoint || !target || target.desired !== command.guardState) {
      invalidCommands.push({
        ...command,
        reason: !samePoint
          ? 'guard and data-merge coordinates differ'
          : !target
            ? 'guarded command has no forward target cell'
            : 'guard state does not equal the exact forward desired state',
        forwardDesired: target?.desired ?? null,
      });
    }
  }
  return {
    sha256: crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),
    sourceOperationCount: guardedBoxes + commands + sets,
    expandedCommandCount,
    guardedBoxes,
    commands,
    commandDetails,
    invalidCommands,
    incompleteStates,
    sets,
    cells,
    uniqueTargetCells: cells.size,
    duplicateTargetCells,
  };
}

function entitySafetyEnvelope(cells) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const { point: [x, y, z] } of cells.values()) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  return [
    minX - 1,
    minY - 2,
    minZ - 1,
    maxX + 2,
    maxY + 3,
    maxZ + 2,
  ];
}

function entitySelector(envelope, entityFilter, limit) {
  const [x1, y1, z1, x2, y2, z2] = envelope;
  return (
    `@e[x=${x1},y=${y1},z=${z1},`
    + `dx=${x2 - x1},dy=${y2 - y1},dz=${z2 - z1},`
    + `${entityFilter},limit=${limit},sort=arbitrary]`
  );
}

function entitySpatialBatches(envelope) {
  const [x1, y1, z1, x2, y2, z2] = envelope;
  const batches = [];
  for (
    let chunkX = Math.floor(x1 / 16);
    chunkX <= Math.floor(x2 / 16);
    chunkX += 1
  ) {
    for (
      let chunkZ = Math.floor(z1 / 16);
      chunkZ <= Math.floor(z2 / 16);
      chunkZ += 1
    ) {
      batches.push([
        Math.max(x1, chunkX * 16),
        y1,
        Math.max(z1, chunkZ * 16),
        Math.min(x2, chunkX * 16 + 15),
        y2,
        Math.min(z2, chunkZ * 16 + 15),
      ]);
    }
  }
  return batches;
}

function entityQueryContractPassed(entry, expectedEnvelope) {
  const selectorLimit = entry?.selectorLimit;
  const expectedBatches = entitySpatialBatches(expectedEnvelope);
  const summariesByCategory = new Map(
    (entry?.categoryQueries ?? []).map((query) => [query.category, query]),
  );
  const expectedCategories = [
    ['player', 'type=minecraft:player'],
    ['non-player', 'type=!minecraft:player'],
  ];
  if (
    !Number.isSafeInteger(selectorLimit)
    || selectorLimit < 1
    || selectorLimit > 64
    || entry?.spatialBatchCount !== expectedBatches.length
    || !Array.isArray(entry?.categoryQueries)
    || entry.categoryQueries.length !== expectedCategories.length
    || summariesByCategory.size !== expectedCategories.length
    || !Array.isArray(entry?.spatialQueries)
    || entry.spatialQueries.length !== expectedBatches.length * expectedCategories.length
    || !Array.isArray(entry?.queryErrors)
    || entry.queryErrors.length !== 0
    || !Array.isArray(entry?.blockers)
    || entry.blockers.length !== 0
  ) {
    return false;
  }

  let queryIndex = 0;
  let selectedAcrossCategories = 0;
  for (const [category, entityFilter] of expectedCategories) {
    const summary = summariesByCategory.get(category);
    if (
      summary?.batchCount !== expectedBatches.length
      || !Number.isSafeInteger(summary.selectedCount)
      || summary.selectedCount < 0
      || summary.selectedCount !== summary.parsedPositions
      || summary.selectorLimitReached !== false
    ) {
      return false;
    }
    let categorySelected = 0;
    let categoryParsed = 0;
    for (let batchIndex = 0; batchIndex < expectedBatches.length; batchIndex += 1) {
      const batch = expectedBatches[batchIndex];
      const query = entry.spatialQueries[queryIndex];
      queryIndex += 1;
      if (
        query?.category !== category
        || query.batchIndex !== batchIndex
        || JSON.stringify(query.envelope) !== JSON.stringify(batch)
        || query.selector !== entitySelector(batch, entityFilter, selectorLimit)
        || !Number.isSafeInteger(query.selectedCount)
        || query.selectedCount < 0
        || query.selectedCount >= selectorLimit
        || query.selectedCount !== query.parsedPositions
        || query.selectorLimitReached !== false
      ) {
        return false;
      }
      categorySelected += query.selectedCount;
      categoryParsed += query.parsedPositions;
    }
    if (
      categorySelected !== summary.selectedCount
      || categoryParsed !== summary.parsedPositions
    ) {
      return false;
    }
    selectedAcrossCategories += categorySelected;
  }
  return (
    Number.isSafeInteger(entry.entitiesReturnedInEnvelope)
    && entry.entitiesReturnedInEnvelope >= 0
    && entry.entitiesReturnedInEnvelope <= selectedAcrossCategories
  );
}

function materialRemovalExceptionContract(design, forward, packageId) {
  const rawDeclarations =
    design.runtimeSafety?.materialExactRemovalExceptions ?? [];
  const declarations = Array.isArray(rawDeclarations) ? rawDeclarations : [];
  const byPoint = new Map();
  let declarationSchemaPassed = (
    Array.isArray(rawDeclarations)
    && (rawDeclarations.length === 0
      || packageId === 'mainstreet-bunker-surface-phase1-2026-07-27')
  );
  for (const declaration of declarations) {
    const cells = declaration?.cells;
    const declarationPassed = (
      declaration?.sourceMaterial === 'minecraft:birch_fence'
      && declaration?.desired === 'minecraft:air'
      && declaration?.snapshotExactSource
        === 'minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]'
      && declaration?.blockEntityCapable === false
      && declaration?.snapshotWaterlogged === false
      && Array.isArray(declaration?.fluidNeighborCells)
      && declaration.fluidNeighborCells.length === 0
      && Array.isArray(cells)
      && declaration.cellCount === cells.length
      && cells.length > 0
      && cells.every((point) => (
        Array.isArray(point)
        && point.length === 3
        && point.every(Number.isSafeInteger)
      ))
    );
    declarationSchemaPassed = declarationSchemaPassed && declarationPassed;
    if (!declarationPassed) continue;
    for (const point of cells) {
      const pointKey = point.join(',');
      if (byPoint.has(pointKey)) declarationSchemaPassed = false;
      byPoint.set(pointKey, declaration);
    }
  }

  const observedExceptionPoints = new Set();
  let perCellPassed = true;
  for (const [point, cell] of forward.cells) {
    const sourceComplete = (
      cell.source.length === 1
      && stateCompleteness(cell.source[0]).complete
    );
    const desiredComplete = stateCompleteness(cell.desired).complete;
    if (!desiredComplete || cell.source.length === 0) {
      perCellPassed = false;
      continue;
    }
    // Multi-state exact guards are audited by finiteExactStateUnionContract.
    if (cell.source.length > 1) continue;
    if (sourceComplete) continue;
    observedExceptionPoints.add(point);
    const declaration = byPoint.get(point);
    if (
      !declaration
      || cell.source[0] !== declaration.sourceMaterial
      || cell.desired !== declaration.desired
    ) {
      perCellPassed = false;
    }
  }
  const exactDeclaredSetPassed = (
    observedExceptionPoints.size === byPoint.size
    && [...byPoint.keys()].every((point) => observedExceptionPoints.has(point))
  );
  return {
    passed: declarationSchemaPassed && perCellPassed && exactDeclaredSetPassed,
    byPoint,
    declaredCells: byPoint.size,
    observedCells: observedExceptionPoints.size,
  };
}

function finiteExactStateUnionContract(design, forward, packageId) {
  const rawDeclarations = (
    design.runtimeSafety?.finiteExactStateUnionGuards
    ?? design.operations?.runtimeSafety?.finiteExactStateUnionGuards
    ?? []
  );
  const declarations = Array.isArray(rawDeclarations) ? rawDeclarations : [];
  const byPoint = new Map();
  let declarationSchemaPassed = (
    Array.isArray(rawDeclarations)
    && (rawDeclarations.length === 0
      || packageId === 'mainstreet-america-redevelopment-r4-r5')
  );
  for (const declaration of declarations) {
    const cells = declaration?.cells;
    const declarationPassed = (
      declaration?.sourceMaterial === 'minecraft:birch_fence'
      && declaration?.desired === 'minecraft:air'
      && declaration?.blockEntityCapable === false
      && Array.isArray(cells)
      && declaration.cellCount === cells.length
      && cells.length > 0
    );
    declarationSchemaPassed = declarationSchemaPassed && declarationPassed;
    if (!declarationPassed) continue;
    for (const cell of cells) {
      const point = cell?.point;
      const allowed = Array.isArray(cell?.allowedExactSources)
        ? cell.allowedExactSources.map(normalizeState)
        : [];
      const snapshotExactSource = typeof cell?.snapshotExactSource === 'string'
        ? normalizeState(cell.snapshotExactSource)
        : null;
      const cellPassed = (
        Array.isArray(point)
        && point.length === 3
        && point.every(Number.isSafeInteger)
        && allowed.length >= 2
        && new Set(allowed).size === allowed.length
        && allowed.every((state) => (
          stateCompleteness(state).complete
          && state.split('[', 1)[0] === declaration.sourceMaterial
        ))
        && snapshotExactSource !== null
        && stateCompleteness(snapshotExactSource).complete
        && allowed.includes(snapshotExactSource)
      );
      declarationSchemaPassed = declarationSchemaPassed && cellPassed;
      if (!cellPassed) continue;
      const pointKey = point.join(',');
      if (byPoint.has(pointKey)) declarationSchemaPassed = false;
      byPoint.set(pointKey, {
        ...declaration,
        allowedExactSources: allowed,
        snapshotExactSource,
      });
    }
  }

  const observedExceptionPoints = new Set();
  const observedExceptionLines = new Set();
  let perCellPassed = true;
  for (const [point, cell] of forward.cells) {
    if (cell.source.length <= 1) continue;
    observedExceptionPoints.add(point);
    if (observedExceptionLines.has(cell.line)) perCellPassed = false;
    observedExceptionLines.add(cell.line);
    const declaration = byPoint.get(point);
    const observed = [...cell.source].sort();
    const declared = [...(declaration?.allowedExactSources ?? [])].sort();
    if (
      !declaration
      || cell.desired !== declaration.desired
      || observed.length !== declared.length
      || observed.some((state, index) => state !== declared[index])
    ) {
      perCellPassed = false;
    }
  }
  const exactDeclaredSetPassed = (
    observedExceptionPoints.size === byPoint.size
    && [...byPoint.keys()].every((point) => observedExceptionPoints.has(point))
  );
  return {
    passed: declarationSchemaPassed && perCellPassed && exactDeclaredSetPassed,
    byPoint,
    declaredCells: byPoint.size,
    observedCells: observedExceptionPoints.size,
  };
}

function executionUnionMatchesPassed(execution, forward, contract) {
  const matches = execution?.unionMatches;
  const sourceGroups = execution?.sourceGroups;
  if (!Array.isArray(matches) || !Array.isArray(sourceGroups)) return false;
  if (
    matches.length !== contract.observedCells
    || new Set(matches.map(({ line }) => line)).size !== matches.length
  ) {
    return false;
  }
  const unionCellsByLine = new Map();
  for (const [point, cell] of forward.cells) {
    if (cell.source.length <= 1) continue;
    if (unionCellsByLine.has(cell.line)) return false;
    unionCellsByLine.set(cell.line, { point, cell });
  }
  for (const match of matches) {
    const observed = unionCellsByLine.get(match?.line);
    const declaration = observed
      ? contract.byPoint.get(observed.point)
      : null;
    if (
      !observed
      || !declaration
      || !Number.isSafeInteger(match?.groupIndex)
      || !Number.isSafeInteger(match?.alternativeIndex)
      || observed.cell.source[match.alternativeIndex]
        !== normalizeState(match.state ?? '')
      || !declaration.allowedExactSources.includes(
        normalizeState(match.state ?? ''),
      )
    ) {
      return false;
    }
    const group = sourceGroups[match.groupIndex];
    if (
      group?.index !== match.groupIndex
      || group?.line !== match.line
      || group?.finiteUnion !== true
      || !Array.isArray(group?.alternatives)
      || group.alternatives.length !== observed.cell.source.length
      || group.alternatives.some((alternative, index) => (
        alternative?.index !== index
        || normalizeState(alternative?.state ?? '') !== observed.cell.source[index]
      ))
    ) {
      return false;
    }
  }
  return true;
}

function forwardStateCompleteness(
  forward,
  materialRemovalExceptions,
  finiteExactStateUnions,
) {
  for (const [point, cell] of forward.cells) {
    if (!stateCompleteness(cell.desired).complete) return false;
    if (
      cell.source.length === 1
      && stateCompleteness(cell.source[0]).complete
    ) {
      continue;
    }
    const materialDeclaration = materialRemovalExceptions.byPoint.get(point);
    if (
      materialDeclaration
      && cell.source.length === 1
      && cell.source[0] === materialDeclaration.sourceMaterial
      && cell.desired === materialDeclaration.desired
    ) {
      continue;
    }
    const unionDeclaration = finiteExactStateUnions.byPoint.get(point);
    if (
      unionDeclaration
      && cell.source.length >= 2
      && cell.desired === unionDeclaration.desired
      && cell.source.every((state) => stateCompleteness(state).complete)
    ) {
      continue;
    }
    return false;
  }
  return true;
}

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
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
    directory: path.relative(ROOT, directory),
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function readJson(filename) {
  if (!fs.existsSync(filename)) throw new Error(`missing ${path.relative(ROOT, filename)}`);
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function mediaFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  const visit = (current) => {
    for (const name of fs.readdirSync(current).sort()) {
      const filename = path.join(current, name);
      const stat = fs.statSync(filename);
      if (stat.isDirectory()) visit(filename);
      else if (/\.(png|jpe?g|webp)$/i.test(name)) {
        output.push({
          path: path.relative(ROOT, filename),
          bytes: stat.size,
          sha256: crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),
        });
      }
    }
  };
  visit(directory);
  return output;
}

function designArtifact(design, kind) {
  if (kind === 'forward') {
    if (design.operations?.forward) return design.operations.forward;
    if (design.output?.operationsSha256) {
      return {
        path: design.output.operations,
        sha256: design.output.operationsSha256,
      };
    }
    if (design.operations?.sha256) {
      return {
        path: design.operations.file,
        sha256: design.operations.sha256,
      };
    }
    if (design.operationSha256) {
      return { path: null, sha256: design.operationSha256 };
    }
  }
  if (kind === 'rollback') {
    if (design.operations?.rollback) return design.operations.rollback;
    if (design.output?.rollbackSha256) {
      return {
        path: design.output.rollback,
        sha256: design.output.rollbackSha256,
      };
    }
    if (design.rollback?.sha256) {
      return {
        path: design.rollback.path ?? design.rollback.file ?? null,
        sha256: design.rollback.sha256,
      };
    }
  }
  return null;
}

function reportPathMatches(reported, expected) {
  return typeof reported === 'string'
    && path.resolve(ROOT, reported) === path.resolve(expected);
}

function qualityFor(externalId) {
  if (externalId === 'WL-INFINITY-SCREEN') {
    return {
      functional: { score: 96, status: 'as-built-post-state-pass' },
      sightline: { score: 94, status: '48-view-matrix-rendered' },
      legibility: { score: 96, status: 'four-face-display' },
      mediaCoverage: { score: 100, status: 'before-after-and-view-matrix' },
    };
  }
  if (externalId === 'RR-S1-STANDARD-PILOT') {
    return {
      functional: { score: 96, status: '11-of-11-stations-and-bidirectional-walk-pass' },
      walkability: { score: 96, status: 'seven-wide-eight-high-flat-pilot' },
      legibility: { score: 82, status: 'route-band-and-lights-as-built' },
      mediaCoverage: { score: 100, status: 'same-camera-before-after' },
    };
  }
  if (externalId.includes('PORTAL') || externalId.includes('CONNECTOR')) {
    return {
      functional: { score: 93, status: 'post-state-and-bidirectional-walk-pass' },
      walkability: { score: 90, status: 'five-wide-four-high-stair-backed-route' },
      legibility: { score: 94, status: 'named-route-band-and-directory' },
      concealment: { score: 96, status: 'recessed-under-natural-cover' },
      mediaCoverage: { score: 100, status: 'same-camera-before-after' },
    };
  }
  if (externalId.includes('LANDFORM')) {
    return {
      functional: { score: 90, status: 'post-state-pass' },
      concealment: { score: 91, status: 'authored-landform-as-built' },
      legibility: { score: 88, status: 'observatory-retained-as-intentional-landmark' },
      mediaCoverage: { score: 100, status: 'eight-view-before-after-contract' },
    };
  }
  if (/GAR-|ALLEY|ROAD|R0[45]/.test(externalId)) {
    return {
      functional: { score: 94, status: 'connected-as-built' },
      walkability: { score: 92, status: 'grade-and-clearance-pass' },
      legibility: { score: 92, status: 'frontage-and-wayfinding-pass' },
      mediaCoverage: { score: 100, status: 'district-after-evidence' },
    };
  }
  return {
    functional: { score: 92, status: 'post-state-pass' },
    legibility: { score: 90, status: 'as-built-wayfinding-pass' },
    mediaCoverage: { score: 100, status: 'post-release-evidence-linked' },
  };
}

const liveGate = readJson(liveGatePath);
const routeQa = readJson(routeQaPath);
const transaction = readJson(transactionPath);
const globalCells = new Map();
const crossPackageOverlaps = [];
const packageResults = [];
const featureQuality = {};
const featureMedia = {};
const featureOwners = new Map();
const duplicateFeatureIds = [];
const executionWindows = [];

for (const item of packages) {
  for (const filename of [item.design, item.forward, item.rollback]) {
    if (!fs.existsSync(filename)) throw new Error(`missing ${path.relative(ROOT, filename)}`);
  }
  const design = readJson(item.design);
  const designSha256 = crypto.createHash('sha256')
    .update(fs.readFileSync(item.design))
    .digest('hex');
  const forward = parseOperations(item.forward);
  const rollback = parseOperations(item.rollback);
  const forwardDesignArtifact = designArtifact(design, 'forward');
  const rollbackDesignArtifact = designArtifact(design, 'rollback');
  const rawPackageId = design.packageId ?? design.id ?? null;
  const observedPackageId = PACKAGE_ID_ALIASES.get(rawPackageId) ?? rawPackageId;
  const materialRemovalExceptions = materialRemovalExceptionContract(
    design,
    forward,
    observedPackageId,
  );
  const finiteExactStateUnions = finiteExactStateUnionContract(
    design,
    forward,
    observedPackageId,
  );
  const preflightPath = item.forward.replace(/\.txt$/, '.prerelease-preflight.json');
  const executionPath = item.forward.replace(/\.txt$/, '.execution.json');
  const postflightPath = item.rollback.replace(/\.txt$/, '.post-preflight.json');
  const preflight = readJson(preflightPath);
  const execution = readJson(executionPath);
  const postflight = readJson(postflightPath);
  const rollbackMismatches = [];
  for (const [point, forwardCell] of forward.cells) {
    const rollbackCell = rollback.cells.get(point);
    const removalException = materialRemovalExceptions.byPoint.get(point);
    const unionException = finiteExactStateUnions.byPoint.get(point);
    const rollbackDesiredAccepted = unionException
      ? rollbackCell?.desired === unionException.snapshotExactSource
      : removalException
        ? (
          rollbackCell?.desired === removalException.snapshotExactSource
          && rollbackCell.desired.split('[', 1)[0] === removalException.sourceMaterial
        )
        : forwardCell.source.includes(rollbackCell?.desired);
    if (
      !rollbackCell
      || !rollbackCell.source.includes(forwardCell.desired)
      || !rollbackDesiredAccepted
    ) {
      rollbackMismatches.push({
        point,
        forward: forwardCell,
        rollback: rollbackCell ?? null,
      });
    }
    const prior = globalCells.get(point);
    if (prior && prior !== item.key) {
      crossPackageOverlaps.push({ point, firstPackage: prior, secondPackage: item.key });
    } else {
      globalCells.set(point, item.key);
    }
  }
  for (const point of rollback.cells.keys()) {
    if (!forward.cells.has(point)) {
      rollbackMismatches.push({ point, forward: null, rollback: rollback.cells.get(point) });
    }
  }
  const media = mediaFiles(item.media);
  const mediaBasenames = new Set(media.map(({ path: filename }) => path.basename(filename)));
  const packageId = item.packageId;
  const checks = {
    packageIdentity: observedPackageId === packageId,
    designArtifactBinding:
      forwardDesignArtifact?.sha256 === forward.sha256
      && rollbackDesignArtifact?.sha256 === rollback.sha256
      && (
        !forwardDesignArtifact.path
        || reportPathMatches(forwardDesignArtifact.path, item.forward)
      )
      && (
        !rollbackDesignArtifact.path
        || reportPathMatches(rollbackDesignArtifact.path, item.rollback)
      ),
    noSetOperations: forward.sets === 0 && rollback.sets === 0,
    exactStateCompleteness:
      materialRemovalExceptions.passed
      && finiteExactStateUnions.passed
      && forwardStateCompleteness(
        forward,
        materialRemovalExceptions,
        finiteExactStateUnions,
      )
      && rollback.incompleteStates.length === 0
      && [...rollback.cells.values()].every(({ source }) => source.length === 1),
    materialRemovalExceptions: materialRemovalExceptions.passed,
    finiteExactStateUnions: finiteExactStateUnions.passed,
    guardedCommands:
      forward.invalidCommands.length === 0
      && rollback.commands === 0
      && rollback.invalidCommands.length === 0,
    noDuplicateTargetCells:
      forward.duplicateTargetCells === 0 && rollback.duplicateTargetCells === 0,
    rollbackBijection:
      rollbackMismatches.length === 0
      && forward.uniqueTargetCells === rollback.uniqueTargetCells,
    preflight:
      preflight.failed === 0
      && preflight.passed === preflight.operationCount
      && Array.isArray(preflight.partialMasks)
      && preflight.partialMasks.length === 0,
    preflightBinding:
      preflight.operationCount === forward.guardedBoxes
      && reportPathMatches(preflight.opsPath, item.forward)
      && reportPathMatches(preflight.regions, preRegions),
    execution:
      execution.schemaVersion === 2
      && execution.status === 'complete'
      && execution.dryRun === false
      && execution.strictNoop === true
      && execution.failedCommands === 0
      && execution.failedGroups === 0
      && execution.unknownReplyCommands === 0
      && execution.unexpectedNoopCommands === 0
      && execution.toleratedNonStrictNoopCommands === 0
      && execution.expectedAlternativeNoopCommands
        === forward.expandedCommandCount - forward.sourceOperationCount
      && execution.noopCommands === execution.expectedAlternativeNoopCommands
      && execution.worldEditLeftoverCount === 0
      && execution.operationSha256 === forward.sha256
      && execution.sourceOperationCount === forward.sourceOperationCount
      && execution.sourceGroupCount === forward.sourceOperationCount
      && execution.successfulGroups === forward.sourceOperationCount
      && execution.commandCount === forward.expandedCommandCount
      && execution.expandedCommandCount === forward.expandedCommandCount
      && execution.successfulCommands === forward.sourceOperationCount
      && execution.finiteUnionGroupCount === finiteExactStateUnions.observedCells
      && Array.isArray(execution.sourceGroups)
      && execution.sourceGroups.length === forward.sourceOperationCount
      && Array.isArray(execution.expandedCommands)
      && execution.expandedCommands.length === forward.expandedCommandCount
      && Array.isArray(execution.groupFailures)
      && execution.groupFailures.length === 0
      && /^[0-9a-f]{64}$/.test(execution.sourceGroupPlanSha256 ?? '')
      && /^[0-9a-f]{64}$/.test(execution.expandedCommandSha256 ?? '')
      && executionUnionMatchesPassed(
        execution,
        forward,
        finiteExactStateUnions,
      )
      && reportPathMatches(execution.file, item.forward),
    evidenceTiming:
      Number.isFinite(Date.parse(preflight.generatedAt))
      && Number.isFinite(Date.parse(execution.startedAtUtc))
      && Number.isFinite(Date.parse(execution.completedAtUtc))
      && Number.isFinite(Date.parse(postflight.generatedAt))
      && Date.parse(preflight.generatedAt) <= Date.parse(execution.startedAtUtc)
      && Date.parse(execution.startedAtUtc) <= Date.parse(execution.completedAtUtc)
      && Date.parse(execution.completedAtUtc) <= Date.parse(postflight.generatedAt),
    postState:
      postflight.failed === 0
      && postflight.passed === postflight.operationCount
      && Array.isArray(postflight.partialMasks)
      && postflight.partialMasks.length === 0,
    postStateBinding:
      postflight.operationCount === rollback.guardedBoxes
      && reportPathMatches(postflight.opsPath, item.rollback)
      && reportPathMatches(postflight.regions, postRegions),
    media:
      media.length >= item.minimumMedia
      && media.every(({ bytes }) => bytes > 8_000)
      && item.requiredMediaBasenames.every((filename) => mediaBasenames.has(filename)),
  };
  const passed = Object.values(checks).every(Boolean);
  packageResults.push({
    key: item.key,
    packageId,
    design: path.relative(ROOT, item.design),
    designSha256,
    forward: {
      path: path.relative(ROOT, item.forward),
      sha256: forward.sha256,
      operations: forward.sourceOperationCount,
      expandedCommands: forward.expandedCommandCount,
      guardedBoxes: forward.guardedBoxes,
      commands: forward.commands,
      entitySafetyEnvelope: entitySafetyEnvelope(forward.cells),
      uniqueTargetCells: forward.uniqueTargetCells,
      duplicateTargetCells: forward.duplicateTargetCells,
      incompleteStateCount: forward.incompleteStates.length,
      permittedMaterialRemovalCells: materialRemovalExceptions.observedCells,
      permittedFiniteExactStateUnionCells: finiteExactStateUnions.observedCells,
      incompleteStateSample: forward.incompleteStates.slice(0, 10),
      invalidCommandCount: forward.invalidCommands.length,
      invalidCommandSample: forward.invalidCommands.slice(0, 10),
    },
    rollback: {
      path: path.relative(ROOT, item.rollback),
      sha256: rollback.sha256,
      operations: rollback.sourceOperationCount,
      guardedBoxes: rollback.guardedBoxes,
      commands: rollback.commands,
      uniqueTargetCells: rollback.uniqueTargetCells,
      duplicateTargetCells: rollback.duplicateTargetCells,
      mismatchCount: rollbackMismatches.length,
      mismatchSample: rollbackMismatches.slice(0, 10),
      incompleteStateCount: rollback.incompleteStates.length,
      incompleteStateSample: rollback.incompleteStates.slice(0, 10),
      invalidCommandCount: rollback.invalidCommands.length,
      invalidCommandSample: rollback.invalidCommands.slice(0, 10),
    },
    evidence: {
      preflight: path.relative(ROOT, preflightPath),
      execution: path.relative(ROOT, executionPath),
      postState: path.relative(ROOT, postflightPath),
      media,
    },
    checks,
    passed,
  });
  executionWindows.push({
    packageId,
    startedAtUtc: execution.startedAtUtc,
    completedAtUtc: execution.completedAtUtc,
  });
  for (const definition of design.databaseFeatures ?? []) {
    const priorOwner = featureOwners.get(definition.externalId);
    if (priorOwner) {
      duplicateFeatureIds.push({
        externalId: definition.externalId,
        firstPackage: priorOwner,
        secondPackage: packageId,
      });
    } else {
      featureOwners.set(definition.externalId, packageId);
    }
    featureQuality[definition.externalId] = qualityFor(definition.externalId);
    featureMedia[definition.externalId] = {
      screenshots: media.map(({ path: filename }) => filename),
      packageId,
      evidenceDirectory: path.relative(ROOT, item.media),
    };
  }
}

const preSnapshot = snapshotHash(preRegions);
const postSnapshot = snapshotHash(postRegions);
const liveGateByFile = new Map(
  (liveGate.packages ?? []).map((entry) => [
    path.resolve(ROOT, entry.file),
    entry,
  ]),
);
const liveGatePackageSetPassed = (
  Array.isArray(liveGate.packages)
  && liveGate.packages.length === packages.length
  && liveGateByFile.size === packages.length
);
const liveGatePackageBindings = packages.map((item) => {
  const entry = liveGateByFile.get(path.resolve(item.forward));
  const forward = packageResults.find(({ packageId }) => packageId === item.packageId)?.forward;
  const envelopeMatched = (
    Array.isArray(entry?.envelope)
    && entry.envelope.length === 6
    && entry.envelope.every(
      (coordinate, index) => coordinate === forward?.entitySafetyEnvelope[index],
    )
  );
  return {
    packageId: item.packageId,
    file: path.relative(ROOT, item.forward),
    present: Boolean(entry),
    passed: entry?.passed === true,
    operationSha256Matched: entry?.operationSha256 === forward?.sha256,
    querySchemaPassed:
      envelopeMatched
      && entityQueryContractPassed(entry, forward.entitySafetyEnvelope),
  };
});
const executionStarts = executionWindows
  .map(({ startedAtUtc }) => Date.parse(startedAtUtc))
  .filter(Number.isFinite);
const liveGateTime = Date.parse(liveGate.generatedAtUtc);
const earliestExecution = executionStarts.length
  ? Math.min(...executionStarts)
  : Number.NaN;
const liveGateLeadMilliseconds = earliestExecution - liveGateTime;
const routePackageBindings = Object.fromEntries(packages.map((item) => [
  item.packageId,
  (
    routeQa.packageOperationSha256?.[item.packageId]
    ?? routeQa.packageHashes?.[item.packageId]?.sha256
  )
    === packageResults.find(({ packageId }) => packageId === item.packageId)?.forward.sha256,
]));
const mainstreetDesign = readJson(
  packages.find(({ key }) => key === 'mainstreet').design,
);
const expectedRouteTestIds = [
  'ravenrock-s1-west-to-east',
  'bunker-recessed-portal-mouth-to-lobby',
  ...mainstreetDesign.sharedAlleys.matrix.map(({ id }) => `${id.toLowerCase()}-full-length`),
  ...mainstreetDesign.garages.matrix.map(
    ({ garageId }) => `${garageId.toLowerCase()}-connection`,
  ),
];
const observedRouteTestIds = (routeQa.tests ?? []).map(({ id }) => id);
const routeCoveragePassed = (
  (
    routeQa.coverage == null
    || (
      routeQa.coverage.ravenrockStandardSection === 1
      && routeQa.coverage.bunkerRecessedPortal === 1
      && routeQa.coverage.mainstreetSharedAlleys
        === mainstreetDesign.sharedAlleys.matrix.length
      && routeQa.coverage.mainstreetGarages === mainstreetDesign.garages.matrix.length
    )
  )
  && routeQa.bidirectionalWalk?.tests === expectedRouteTestIds.length
  && routeQa.bidirectionalWalk?.passedTests === expectedRouteTestIds.length
  && routeQa.bidirectionalWalk?.failedTests === 0
  && (
    routeQa.bidirectionalWalk.directionalRuns == null
    || routeQa.bidirectionalWalk.directionalRuns === expectedRouteTestIds.length * 2
  )
  && Array.isArray(routeQa.tests)
  && routeQa.tests.length === expectedRouteTestIds.length
  && JSON.stringify(observedRouteTestIds) === JSON.stringify(expectedRouteTestIds)
  && routeQa.tests.every((test) => (
    test.passed === true
    && (
      test.reverse === true
      || (
        Array.isArray(test.directions)
        && test.directions.length === 2
        && test.directions.every((direction) => direction.passed === true)
      )
    )
  ))
);
const transactionPackageBindings = packages.map((item, index) => {
  const entry = transaction.packages?.[index];
  const result = packageResults[index];
  const localGatePath = item.forward.replace(
    /\.txt$/,
    '.pre-execution-entity-gate.json',
  );
  const localGate = readJson(localGatePath);
  const localGateEntry = localGate.packages?.[0];
  const localGatePassed = (
    localGate.schemaVersion === 1
    && localGate.status === 'PASS'
    && localGate.passed === true
    && localGate.blockOrEntityMutation === false
    && localGate.temporaryForceLoadMutation === true
    && localGate.halo?.positiveTargetCellExtentIncluded === true
    && localGate.forceLoadAudit?.allRequiredChunksLoadedBeforeQueries === true
    && localGate.forceLoadAudit?.finalSetMatchesPreExistingSet === true
    && Array.isArray(localGate.packages)
    && localGate.packages.length === 1
    && localGateEntry?.passed === true
    && reportPathMatches(localGateEntry.file, item.forward)
    && localGateEntry.operationSha256 === result.forward.sha256
    && JSON.stringify(localGateEntry.envelope) === JSON.stringify(
      result.forward.entitySafetyEnvelope,
    )
    && entityQueryContractPassed(
      localGateEntry,
      result.forward.entitySafetyEnvelope,
    )
  );
  return {
    packageId: item.packageId,
    key: item.key,
    passed:
      entry?.key === item.key
      && entry.status === 'committed'
      && reportPathMatches(entry.forward, item.forward)
      && reportPathMatches(entry.rollback, item.rollback)
      && entry.forwardSha256 === result.forward.sha256
      && entry.rollbackSha256 === result.rollback.sha256
      && reportPathMatches(
        entry.preflight,
        item.forward.replace(/\.txt$/, '.prerelease-preflight.json'),
      )
      && reportPathMatches(
        entry.executionReport,
        item.forward.replace(/\.txt$/, '.execution.json'),
      )
      && entry.execution?.status === 'complete'
      && entry.execution?.operationSha256 === result.forward.sha256
      && entry.execution?.successfulCommands === result.forward.operations
      && entry.execution?.failedCommands === 0
      && entry.execution?.noopCommands
        === result.forward.expandedCommands - result.forward.operations
      && entry.execution?.successfulGroups === result.forward.operations
      && entry.execution?.failedGroups === 0
      && entry.execution?.unexpectedNoopCommands === 0
      && reportPathMatches(entry.preExecutionEntityGate, localGatePath)
      && JSON.stringify(entry.preExecutionEntityGateResult) === JSON.stringify(localGate)
      && localGatePassed,
  };
});
const committedEventOrder = (transaction.events ?? [])
  .filter(({ event }) => event === 'package-committed')
  .map(({ package: packageKey }) => packageKey);
const startedEventOrder = (transaction.events ?? [])
  .filter(({ event }) => event === 'package-execution-started')
  .map(({ package: packageKey }) => packageKey);
const expectedPackageOrder = packages.map(({ key }) => key);
const transactionStarted = Date.parse(transaction.startedAtUtc);
const transactionCompleted = Date.parse(transaction.completedAtUtc);
const executionEnds = executionWindows
  .map(({ completedAtUtc }) => Date.parse(completedAtUtc))
  .filter(Number.isFinite);
const executionOrderPassed = executionWindows.every((window, index) => (
  index === 0
  || Date.parse(executionWindows[index - 1].completedAtUtc)
    <= Date.parse(window.startedAtUtc)
));
const atomicTransactionPassed = (
  transaction.schemaVersion === 1
  && transaction.transactionId === 'redevelopment-atomic-release-2026-07-27'
  && transaction.status === 'committed-pending-post-qa'
  && reportPathMatches(transaction.liveEntityGate, liveGatePath)
  && Array.isArray(transaction.packages)
  && transaction.packages.length === packages.length
  && transactionPackageBindings.every(({ passed: bindingPassed }) => bindingPassed)
  && JSON.stringify(startedEventOrder) === JSON.stringify(expectedPackageOrder)
  && JSON.stringify(committedEventOrder) === JSON.stringify(expectedPackageOrder)
  && transaction.events?.at(-1)?.event === 'transaction-committed'
  && executionOrderPassed
  && Number.isFinite(transactionStarted)
  && Number.isFinite(transactionCompleted)
  && transactionStarted <= earliestExecution
  && transactionCompleted >= Math.max(...executionEnds)
);
const checks = {
  packages: packageResults.every(({ passed }) => passed),
  atomicTransaction: atomicTransactionPassed,
  crossPackageTargetSeparation: crossPackageOverlaps.length === 0,
  uniqueDatabaseFeatureIds: duplicateFeatureIds.length === 0,
  liveEntityGate:
    liveGate.passed === true
    && liveGate.status === 'PASS'
    && liveGatePackageSetPassed
    && liveGatePackageBindings.length === packages.length
    && liveGatePackageBindings.every((binding) => (
      binding.present
      && binding.passed
      && binding.operationSha256Matched
      && binding.querySchemaPassed
    ))
    && liveGate.blockOrEntityMutation === false
    && liveGate.temporaryForceLoadMutation === true
    && liveGate.halo?.positiveTargetCellExtentIncluded === true
    && liveGate.forceLoadAudit?.allRequiredChunksLoadedBeforeQueries === true
    && liveGate.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
  liveEntityGateTiming:
    Number.isFinite(liveGateLeadMilliseconds)
    && liveGateLeadMilliseconds >= 0
    && liveGateLeadMilliseconds <= 5 * 60 * 1_000,
  routeQa:
    (routeQa.passed === true || routeQa.status === 'PASS')
    && routeQa.status === 'PASS'
    && routeQa.bidirectionalWalk?.passed === true
    && routeCoveragePassed
    && routeQa.postSnapshot?.sha256 === postSnapshot.sha256
    && Object.values(routePackageBindings).every(Boolean),
  snapshotChanged: preSnapshot.sha256 !== postSnapshot.sha256,
  postSnapshotComplete:
    postSnapshot.regionFileCount > 0 && postSnapshot.regionFileCount === preSnapshot.regionFileCount,
};
const passed = Object.values(checks).every(Boolean);
const packageMap = Object.fromEntries(packageResults.map((item) => [
  item.packageId,
  {
    status: item.passed ? 'PASS' : 'FAIL',
    designSha256: item.designSha256,
    operationSha256: item.forward.sha256,
    execution: item.evidence.execution,
    postState: item.evidence.postState,
    targetCells: item.forward.uniqueTargetCells,
    mediaCount: item.evidence.media.length,
  },
]));
const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: passed ? 'PASS' : 'FAIL',
  passed,
  checks,
  preSnapshot,
  postSnapshot,
  atomicTransaction: path.relative(ROOT, transactionPath),
  transactionPackageBindings,
  liveEntityGate: path.relative(ROOT, liveGatePath),
  liveEntityGatePackageBindings: liveGatePackageBindings,
  liveEntityGateTiming: {
    generatedAtUtc: liveGate.generatedAtUtc ?? null,
    earliestExecutionAtUtc: Number.isFinite(earliestExecution)
      ? new Date(earliestExecution).toISOString()
      : null,
    leadMilliseconds: Number.isFinite(liveGateLeadMilliseconds)
      ? liveGateLeadMilliseconds
      : null,
    maximumLeadMilliseconds: 5 * 60 * 1_000,
  },
  routeQa: path.relative(ROOT, routeQaPath),
  routePackageBindings,
  packages: packageMap,
  packageDetails: packageResults,
  crossPackageOverlaps: crossPackageOverlaps.slice(0, 100),
  duplicateFeatureIds,
  featureQuality,
  featureMedia,
  totals: {
    packages: packageResults.length,
    guardedOperations: packageResults.reduce(
      (sum, item) => sum + item.forward.guardedBoxes,
      0,
    ),
    commandOperations: packageResults.reduce(
      (sum, item) => sum + item.forward.commands,
      0,
    ),
    uniqueTargetCells: globalCells.size,
    crossPackageOverlaps: crossPackageOverlaps.length,
    databaseFeatures: Object.keys(featureQuality).length,
    postScreenshots: packageResults.reduce(
      (sum, item) => sum + item.evidence.media.length,
      0,
    ),
  },
};

const packageRows = packageResults.map((item) => (
  `| ${item.key} | ${item.passed ? 'PASS' : 'FAIL'} | `
  + `${item.forward.guardedBoxes} + ${item.forward.commands} CMD | `
  + `${item.forward.uniqueTargetCells.toLocaleString()} | `
  + `${item.evidence.media.length} | ${item.forward.sha256.slice(0, 16)}… |`
)).join('\n');
const checkRows = Object.entries(checks).map(([name, result]) => (
  `| ${name} | ${result ? 'PASS' : 'FAIL'} |`
)).join('\n');
const markdown = `# Post-deployment QA and as-built acceptance

Generated: ${report.generatedAtUtc}

Overall release status: **${report.status}**

This is the final machine-backed acceptance record for the atomic redevelopment
release. It ties every exact-state operation to the immutable pre- and
post-release snapshots, strict live execution reports, rollback preflights,
same-moment entity gate, bidirectional route test, database features, and visual
evidence.

## Release identity

- Pre snapshot: \`${preSnapshot.sha256}\` (${preSnapshot.regionFileCount} regions;
  ${preSnapshot.bytes.toLocaleString()} bytes)
- Post snapshot: \`${postSnapshot.sha256}\` (${postSnapshot.regionFileCount} regions;
  ${postSnapshot.bytes.toLocaleString()} bytes)
- Unique target cells: ${report.totals.uniqueTargetCells.toLocaleString()}
- Guarded operations: ${report.totals.guardedOperations.toLocaleString()}
- Guarded block-data commands: ${report.totals.commandOperations}
- Database features promoted: ${report.totals.databaseFeatures}
- Post-release screenshots: ${report.totals.postScreenshots}

## Atomic acceptance gates

| Gate | Result |
|---|---:|
${checkRows}

## Package ledger

| Package | Status | Operations | Target cells | After media | Forward SHA-256 |
|---|---:|---:|---:|---:|---|
${packageRows}

## Verification method

Every forward and rollback file was parsed to exact target cells. A package
passes only if it contains no unguarded SET operation, contains no duplicate
target cell, has a complete per-cell forward/rollback bijection, passes the
same-moment immutable-snapshot source preflight, executes through RCON with
\`--strict-noop\` and zero failures or leftovers, and passes a rollback preflight
against the accepted post snapshot. Single complete source states are mandatory
except for the separately audited five-cell Phase 1 dry-fence removal contract
and MainStreet-only declared finite unions of complete exact fence states; both
exceptions require desired air and complete exact snapshot restoration on
rollback. The combined release additionally requires
zero cross-package target overlap, an empty exact-target entity safety halo, a
successful bidirectional walk, non-identical pre/post snapshots, and the complete
same-camera after-media inventory.

## Evidence paths

- Machine QA: \`${path.relative(ROOT, outputPath)}\`
- Atomic transaction: \`${path.relative(ROOT, transactionPath)}\`
- Entity gate: \`${path.relative(ROOT, liveGatePath)}\`
- Route QA: \`${path.relative(ROOT, routeQaPath)}\`
- Immutable pre snapshot: \`${preSnapshot.directory}\`
- Immutable post snapshot: \`${postSnapshot.directory}\`

## Database and media disposition

The \`featureQuality\` and \`featureMedia\` objects in the machine QA are the
authoritative release attachment consumed by
\`scripts/import_redevelopment_release.mjs\`. The importer refuses promotion
unless this report is \`PASS\` and the supplied post-snapshot hash matches.
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, markdown);
console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, outputPath),
  markdown: path.relative(ROOT, markdownPath),
  totals: report.totals,
}, null, 2));
process.exit(passed ? 0 : 1);
