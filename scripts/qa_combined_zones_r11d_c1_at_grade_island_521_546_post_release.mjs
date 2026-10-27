#!/usr/bin/env node
/** Read-only post-release seal for CZ-R11D. No live calls or world edits. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const LEDGER_PATH = value(
  '--ledger',
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/evidence-ledger.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.json',
);
const MD_PATH = value(
  '--markdown',
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T19:30:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11D post-release QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const stateProperty = (state, property) => {
  const match = state.match(new RegExp(`(?:\\[|,)${property}=([^,\\]]+)`));
  return match?.[1] ?? null;
};
const isLeaf = (state) => /_leaves$/.test(blockName(state));
const isLog = (state) => /_(?:log|wood)$/.test(blockName(state));
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

function readJson(filename) {
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
}

function parseOperations(filename) {
  const records = [];
  const keys = new Set();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `unsupported operation: ${raw}`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `operation is not one exact cell: ${raw}`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!keys.has(cellKey(cell)), `duplicate target ${cellKey(cell)}`);
    keys.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

function componentCount(cells) {
  const unvisited = new Set(cells.map(cellKey));
  let count = 0;
  while (unvisited.size) {
    count += 1;
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    while (queue.length) {
      const [x, y, z] = queue.pop().split(',').map(Number);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if (!dx && !dy && !dz) continue;
            const key = `${x + dx},${y + dy},${z + dz}`;
            if (unvisited.delete(key)) queue.push(key);
          }
        }
      }
    }
  }
  return count;
}

const ledgerBytes = fs.readFileSync(absolute(LEDGER_PATH));
const ledger = JSON.parse(ledgerBytes);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === 'combined-zones-r11d-c1-at-grade-island-521-546'
  && ledger.completedReleaseIdentitySha256
    === 'e0b07df1f9f3a6d5218db91f1b5afd3b0383150cf2c0c0d5cbbfddba3c8af0eb',
'ledger identity/status drifted');
invariant(ledger.stages.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 17,
'ledger does not bind 17 successful ordered stages and evidence files');
for (const binding of ledger.evidenceBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(bytes.length === binding.bytes && sha256(bytes) === binding.sha256,
    `ledger evidence binding drifted: ${binding.path}`);
}

const manifestBytes = fs.readFileSync(absolute(ledger.manifest.path));
invariant(sha256(manifestBytes) === ledger.manifest.sha256
  && ledger.manifest.sha256
    === '55f8dd5a77591065e22ec08065d942a08831313079225a1c01ffc0f94d4d23d6',
'ledger does not bind the frozen manifest');
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity
    === 'f625388d44a4532bb1f35c041cda0ddc9fca2aa0504f09cb0f537cf252ee0320'
  && manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest identity drifted');
const pkg = manifest.packages[0];
const forward = parseOperations(pkg.forward);
const rollback = parseOperations(pkg.rollback);
invariant(forward.length === 1_284 && rollback.length === 1_284,
'operation counts are not 1,284/1,284');
for (let index = 0; index < forward.length; index += 1) {
  const source = forward[index];
  const inverse = rollback[rollback.length - index - 1];
  invariant(cellKey(source.cell) === cellKey(inverse.cell)
    && source.sourceState === inverse.targetState
    && source.targetState === inverse.sourceState,
  `rollback is not the reverse-order exact inverse at ${index}`);
}

const sourceRoot = ledger.sourceSnapshot.root;
const postRoot = ledger.postSnapshot.root;
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.packageIdentity.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256
  && postIntake.packageIdentity.completeSaveSha256
    === 'b18af0b34c2156c51d2cdf4e8ade401efdcfd184c35787709c7048e5ba4cebe6'
  && postIdentity.sha256
    === '303c00aa95c5c49b55f4d1c9e5f7436ab114a87bf7db73fec2373b114254aef5',
'immutable source/post snapshot identity drifted');
const sourceReader = new AnvilReader(absolute(path.join(sourceRoot, 'region')));
const postReader = new AnvilReader(absolute(path.join(postRoot, 'region')));
const sourceCache = new Map();
const postCache = new Map();
const stateAt = async (reader, cache, cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) {
    cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return cache.get(key);
};
const sourceAt = (cell) => stateAt(sourceReader, sourceCache, cell);
const postAt = (cell) => stateAt(postReader, postCache, cell);
const sourceMismatches = [];
const targetMismatches = [];
for (const record of forward) {
  const sourceState = await sourceAt(record.cell);
  const postState = await postAt(record.cell);
  if (sourceState !== record.sourceState) sourceMismatches.push({ ...record, sourceState });
  if (postState !== record.targetState) targetMismatches.push({ ...record, postState });
}
invariant(sourceMismatches.length === 0 && targetMismatches.length === 0,
`source/target mismatch: ${JSON.stringify({ sourceMismatches, targetMismatches }.slice?.(0, 10) ?? {
  source: sourceMismatches.slice(0, 5), target: targetMismatches.slice(0, 5),
})}`);

const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const surface = forward.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
const surfaceKeys = new Set(surface.map(({ cell }) => cellKey(cell)));
const foundation = forward.filter(({ targetState }) => targetState === 'minecraft:stone_bricks');
const headroomCuts = forward.filter(({ targetState }) => targetState === 'minecraft:air');
const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const headroomFailures = [];
for (const cell of fullHeadroom) {
  const state = await postAt(cell);
  if (!['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(state)) {
    headroomFailures.push({ cell, state });
  }
}
const stableContactFailures = [];
for (const { cell } of surface) {
  let support = { x: cell.x, y: cell.y - 1, z: cell.z };
  let supportState = await postAt(support);
  while (supportState === 'minecraft:stone_bricks'
    && foundation.some(({ cell: point }) => cellKey(point) === cellKey(support))) {
    support = { x: support.x, y: support.y - 1, z: support.z };
    supportState = await postAt(support);
  }
  if (['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
    'minecraft:water', 'minecraft:lava', 'minecraft:gravel'].includes(blockName(supportState))) {
    stableContactFailures.push({ cell, support, supportState });
  }
}
invariant(surface.length === 476 && componentCount(surface.map(({ cell }) => cell)) === 1
  && foundation.length === 329 && headroomCuts.length === 479
  && fullHeadroom.length === 952 && headroomFailures.length === 0
  && stableContactFailures.length === 0,
'route geometry, foundation, or headroom failed');

const c1 = readJson('docs/masterplans/05-combined-zones/phase1-c1-civil-design.json');
const stations = c1.horizontalAlignment.stations;
const crossfall = (offset) => {
  if (offset <= -5) return 1;
  if (offset <= 5) return 0;
  return -1;
};
const tangentAt = (index) => {
  const previous = stations[Math.max(0, index - 1)];
  const next = stations[Math.min(stations.length - 1, index + 1)];
  return { dx: next.x - previous.x, dz: next.z - previous.z };
};
const candidateByColumn = new Map();
for (let station = 521; station <= 546; station += 1) {
  const reference = stations[station];
  const tangent = tangentAt(station);
  const length = Math.hypot(tangent.dx, tangent.dz);
  for (let offset = -14; offset <= 14; offset += 1) {
    const x = Math.round(reference.x - (tangent.dz / length) * offset);
    const z = Math.round(reference.z + (tangent.dx / length) * offset);
    const key = `${x},${z}`;
    if (!candidateByColumn.has(key)) candidateByColumn.set(key, {
      x, y: reference.highwayReferenceY + crossfall(offset), z,
    });
  }
}
const candidate = [...candidateByColumn.values()];
const exceptions = candidate.filter((cell) => !surfaceKeys.has(cellKey(cell)));
invariant(candidate.length === 499 && exceptions.length === 23
  && hashCells(exceptions)
    === manifest.scope.geometry.preservedCandidateExceptions.coordinateSetSha256,
'candidate/exception partition drifted');
const exceptionDrift = [];
for (const cell of exceptions) {
  const sourceState = await sourceAt(cell);
  const postState = await postAt(cell);
  if (sourceState !== postState) exceptionDrift.push({ cell, sourceState, postState });
}
invariant(exceptionDrift.length === 0, 'a preserved candidate exception drifted');

const targetKeys = new Set(forward.map(({ cell }) => cellKey(cell)));
const ownedLogRemovals = forward.filter(({ sourceState, targetState }) => (
  isLog(sourceState) && !isLog(targetState)
));
const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const influenced = new Map();
const depthByKey = new Map(ownedLogRemovals.map(({ cell }) => [cellKey(cell), 0]));
const queue = ownedLogRemovals.map(({ cell }) => ({ cell, depth: 0 }));
while (queue.length) {
  const { cell, depth } = queue.shift();
  if (depth >= 6) continue;
  for (const [dx, dy, dz] of DIRECTIONS) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    const key = cellKey(neighbour);
    const nextDepth = depth + 1;
    if ((depthByKey.get(key) ?? Infinity) <= nextDepth) continue;
    const sourceState = await sourceAt(neighbour);
    if (!isLeaf(sourceState)) continue;
    depthByKey.set(key, nextDepth);
    queue.push({ cell: neighbour, depth: nextDepth });
    if (!targetKeys.has(key)) influenced.set(key, { cell: neighbour, sourceState });
  }
}
const retainedLogDistance = async (start) => {
  const visited = new Set([cellKey(start)]);
  const pending = [{ cell: start, distance: 0 }];
  while (pending.length) {
    const { cell, distance } = pending.shift();
    if (distance >= 6) continue;
    for (const [dx, dy, dz] of DIRECTIONS) {
      const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const key = cellKey(neighbour);
      if (targetKeys.has(key) || visited.has(key)) continue;
      const state = await postAt(neighbour);
      if (isLog(state)) return distance + 1;
      if (!isLeaf(state)) continue;
      visited.add(key);
      pending.push({ cell: neighbour, distance: distance + 1 });
    }
  }
  return 7;
};
const leafDrift = [];
const retainedLogDistanceCensus = {};
for (const { cell, sourceState } of influenced.values()) {
  const postState = await postAt(cell);
  if (postState !== sourceState) leafDrift.push({ cell, sourceState, postState });
  const distance = await retainedLogDistance(cell);
  retainedLogDistanceCensus[distance] = (retainedLogDistanceCensus[distance] ?? 0) + 1;
}
invariant(ownedLogRemovals.length === 105 && influenced.size === 292
  && leafDrift.length === 0 && !retainedLogDistanceCensus[7],
'retained leaf preservation/log-distance proof failed');

const operatedKeys = new Set(forward.map(({ cell }) => cellKey(cell)));
const halo = uniqueCells(forward.flatMap(({ cell }) => {
  const points = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return points;
}));
const undeclaredDrift = [];
for (const cell of halo) {
  if (operatedKeys.has(cellKey(cell))) continue;
  const sourceState = await sourceAt(cell);
  const postState = await postAt(cell);
  if (sourceState !== postState) undeclaredDrift.push({ cell, sourceState, postState });
}
invariant(halo.length === 4_160 && undeclaredDrift.length === 0,
  `undeclared halo drift: ${JSON.stringify(undeclaredDrift.slice(0, 10))}`);

const execution = readJson(
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/c1-island-521-546-at-grade-pavement.forward-execution.json',
);
const rollbackPreflight = readJson(
  'data/world-review/combined-zones-r11d-live-20260821T192414Z/c1-island-521-546-at-grade-pavement.rollback-poststate-preflight.json',
);
invariant(execution.status === 'complete' && execution.strictNoop === true
  && execution.successfulGroups === 1_284 && execution.failedGroups === 0
  && execution.unexpectedNoopCommands === 0 && execution.worldEditLeftoverCount === 0,
'strict execution evidence failed');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === 1_284
  && rollbackPreflight.failed === 0,
'rollback post-state preflight failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'READ_ONLY_POST_RELEASE_SEAL',
  release: {
    transactionId: ledger.transactionId,
    manifestIdentitySha256: manifestIdentity,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    ledgerPath: LEDGER_PATH,
    ledgerSha256: sha256(ledgerBytes),
  },
  snapshots: {
    sourceRoot,
    sourceCompleteSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
    postRoot,
    postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
    postRegionSha256: postIdentity.sha256,
  },
  checks: {
    ledgerStageCount: ledger.stages.length,
    ledgerEvidenceBindingCount: ledger.evidenceBindings.length,
    exactSourceStateCount: forward.length - sourceMismatches.length,
    exactTargetStateCount: forward.length - targetMismatches.length,
    reverseRollbackRecordCount: rollback.length,
    connectedSurfaceCellCount: surface.length,
    connectedSurfaceComponentCount: componentCount(surface.map(({ cell }) => cell)),
    stableFoundationContactCount: surface.length - stableContactFailures.length,
    foundationFillCount: foundation.length,
    headroomCutCount: headroomCuts.length,
    fullHeadroomAirCount: fullHeadroom.length - headroomFailures.length,
    candidateCellCount: candidate.length,
    preservedExceptionCount: exceptions.length,
    preservedExceptionDriftCount: exceptionDrift.length,
    retainedLeafCount: influenced.size,
    retainedLeafDriftCount: leafDrift.length,
    retainedLogDistanceCensus,
    interactionHaloCellCount: halo.length,
    undeclaredDriftCount: undeclaredDrift.length,
    successfulExecutionGroupCount: execution.successfulGroups,
    unexpectedExecutionNoopCount: execution.unexpectedNoopCommands,
    rollbackGuardPassCount: rollbackPreflight.passed,
    routeCommissioned: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    operatedUnion: classManifest(forward.map(({ cell }) => cell)),
    surface: classManifest(surface.map(({ cell }) => cell)),
    foundation: classManifest(foundation.map(({ cell }) => cell)),
    fullHeadroom: classManifest(fullHeadroom),
    preservedExceptions: classManifest(exceptions),
    retainedLeaves: classManifest([...influenced.values()].map(({ cell }) => cell)),
    interactionHalo: classManifest(halo),
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# CZ-R11D post-release QA\n\n**Status:** PASS  \n**QA payload:** \`${qaPayloadSha256}\`\n\n- Exact target states: 1,284/1,284.\n- Connected pavement: 476 cells, one component.\n- Foundation/headroom: 329 fills, 476 stable contacts, 952/952 headroom.\n- Preserved exceptions: 23/23 unchanged.\n- Retained leaves: 292/292 unchanged, all within five leaf steps of a retained log.\n- Undeclared halo drift: 0 across 4,160 review cells.\n- Strict execution: 1,284/1,284; rollback guards: 1,284/1,284.\n- Route remains explicitly uncommissioned between held treatments.\n`;
fs.writeFileSync(absolute(MD_PATH), markdown);
console.log(JSON.stringify({ status: report.status, report: OUT_PATH, markdown: MD_PATH,
  qaPayloadSha256, checks: report.checks }, null, 2));
