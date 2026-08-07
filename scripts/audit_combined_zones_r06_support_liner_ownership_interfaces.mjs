#!/usr/bin/env node
/**
 * T02 release-scoped ownership/interface audit for the CZ-R06
 * support-and-liner packages.
 *
 * Independently recomputes every class the release binds — the frozen R02
 * aquifer and B07 wet deferral classes (against their own bound saves), the
 * R05 lava-seep class and both packages' dispositions (against the current
 * bound save), and the B11 load reservation with its proposal identity —
 * re-parses both forward operation files, and proves:
 * - forward and rollback operation identities match the release manifest;
 * - each package's parsed targets equal its recomputed op class exactly;
 * - the two packages' target sets are disjoint;
 * - the wet and support dispositions partition their scopes exactly and
 *   match every manifest class identity;
 * - zero op targets intersect any protected relic core;
 * - overlaps with prior operated sets (R01/R02/R03v2/R05) obey the declared
 *   rule: air-source cells inside previously excavated voids, or the
 *   declared lava-seep class — nothing else;
 * - the B09 envelope census matches the manifest verification section;
 * - exclusive ownership rests on the accepted one-owner registry partition,
 *   bound by payload identity.
 *
 * Read-only; no live call; no world edit authorized.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  CIVIL_CELL_PREAMBLE,
  SurfaceSnapshotReader,
  assignD06CanonicalLayers,
  buildB09MinimumReservation,
  cellKey,
  columnKey,
  deriveB07WestTwo,
  deriveB11Profile,
  deriveD06DetailedMechanismLayers,
  deriveD06ReservationConstruction,
  deriveD06ReservationReferences,
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
const GENERATED_AT = value('--generated-at', '2026-08-07T02:30:00Z');
const OUTPUT = path.resolve(value('--out',
  'data/world-review/combined-zones-r06-support-liner.ownership-interface-audit.json'));

const INPUTS = Object.freeze({
  manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  decision: 'docs/masterplans/05-combined-zones/phase1-r06-support-and-liner-decision.md',
  r02Decision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  b11Acceptance: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  b11SurfaceRoad: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r01Manifest: 'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r03Manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  r05Manifest: 'data/buildops/combined-zones-r05-mountain.release-manifest.json',
});

const LINER_STATE = 'minecraft:deepslate_tiles';
const SUPPORT_STATE = 'minecraft:stone_bricks';
const B11_LOAD_PREAMBLE =
  'combined-zones-b11-surface-road-technical-proposal-cells-v1-road-load-reservation';
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R06 support/liner T02 audit rejected: ${message}`);
}

const manifest = readJson(INPUTS.manifest);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const layerBClosure = readJson(INPUTS.layerBClosure);
const relicClearance = readJson(INPUTS.protectedRelicClearance);
const r01Manifest = readJson(INPUTS.r01Manifest);
const r02Manifest = readJson(INPUTS.r02Manifest);
const r03Manifest = readJson(INPUTS.r03Manifest);
const r05Manifest = readJson(INPUTS.r05Manifest);

invariant(manifest.packages.length === 2
  && manifest.packages[0].key === 'wet-liner'
  && manifest.packages[1].key === 'b11-support',
'manifest does not declare the two expected packages');
invariant(manifest.scope.decisionRecord?.path === INPUTS.decision
  && sha256(fs.readFileSync(path.join(ROOT, INPUTS.decision)))
    === manifest.scope.decisionRecord.sha256,
'manifest decision-record binding does not match the decision record bytes');

const isFluidState = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const classIdentity = (cells) => ({
  cellCount: uniqueCells(cells).length,
  coordinateSetSha256: hashCells(cells),
});
const verifyClass = (name, bound, cells) => {
  const identity = classIdentity(cells);
  invariant(identity.cellCount === bound.cellCount
    && identity.coordinateSetSha256 === bound.coordinateSetSha256,
  `recomputed ${name} class does not match the manifest binding`);
  return identity;
};

// ---- Recompute the frozen wet classes against their own bound saves.
const r02Decision = readJson(INPUTS.r02Decision);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const emptyEight = readJson(INPUTS.emptyEight);
const d06Detailed = readJson(INPUTS.d06Detailed);
const reservationDomain = deriveD06ReservationConstruction(deriveD06ReservationReferences({
  mechanismsPayload: d06Mechanisms.mechanismDevelopmentPayload,
  lifeSafetyDoc: d06LifeSafety,
  emptyEightDoc: emptyEight,
  lifeSafetyPath: INPUTS.d06LifeSafety,
  emptyEightPath: INPUTS.emptyEight,
}));
invariant(hashCells(reservationDomain, CIVIL_CELL_PREAMBLE)
  === g03.scopeRegistry.find(({ scopeId }) => scopeId === 'D06-RESERVATIONS')
    .construction.sourceCoordinateSetSha256,
'D06-RESERVATIONS domain does not match its G03 identity');
const { layers, proposalUnion: mechanismDomain } = deriveD06DetailedMechanismLayers(
  d06Mechanisms.mechanismDevelopmentPayload, emptyEight, d06Detailed,
);
const layerOwner = assignD06CanonicalLayers(layers, d06Detailed);
const layerStates = r02Decision.decisionPayload.mechanismLayerStates;
const mechanismKeys = new Set(mechanismDomain.map(cellKey));
const d06Records = [
  ...reservationDomain
    .filter((cell) => !mechanismKeys.has(cellKey(cell)))
    .map((cell) => ({ cell, toAir: true })),
  ...mechanismDomain.map((cell) => ({
    cell,
    toAir: layerStates[layerOwner.get(cellKey(cell))].state === 'minecraft:air',
  })),
];
async function wetClass(withReader, records) {
  const cells = [];
  for (const { cell, toAir } of records) {
    const state = await withReader.blockState(cell.x, cell.y, cell.z);
    let wet = isFluidState(state);
    if (!wet && toAir) {
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        if (isFluidState(await withReader.blockState(cell.x + dx, cell.y + dy, cell.z + dz))) {
          wet = true;
          break;
        }
      }
    }
    if (wet) cells.push(cell);
  }
  return cells;
}
const r02Reader = new AnvilReader(path.join(ROOT, r02Manifest.source.snapshotRoot, 'region'));
const r02WetCells = await wetClass(r02Reader, d06Records);
verifyClass('r02AquiferDeferral', manifest.partition.wetSourceClasses.r02AquiferDeferral,
  r02WetCells);
invariant(hashCells(r02WetCells)
  === r02Manifest.amendment.exclusions.wetZoneDeferral.coordinateSetSha256,
'frozen R02 wet class does not reproduce the R02 manifest identity');

const b07Domain = deriveB07WestTwo(
  d06Mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem,
).construction;
const r03Reader = new AnvilReader(path.join(ROOT, r03Manifest.source.snapshotRoot, 'region'));
const b07WetCells = await wetClass(r03Reader,
  b07Domain.map((cell) => ({ cell, toAir: true })));
verifyClass('b07WetPocket', manifest.partition.wetSourceClasses.b07WetPocket, b07WetCells);
invariant(hashCells(b07WetCells)
  === r03Manifest.partition['b07-shaft'].wetZoneDeferral.coordinateSetSha256,
'frozen B07 wet class does not reproduce the R03 v2 manifest identity');

// ---- Recompute the R05 lava seep and both dispositions against the
// current bound save.
const reader = new AnvilReader(path.join(ROOT, manifest.source.snapshotRoot, 'region'));
const surfaceReader = new SurfaceSnapshotReader(
  path.join(ROOT, manifest.source.snapshotRoot, 'region'),
);
const r05Operated = new Map();
for (const pkg of r05Manifest.packages) {
  const raw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(' ');
    const [x1, y1, z1, , y2] = parts.slice(1, 7).map(Number);
    const key = columnKey(x1, z1);
    if (!r05Operated.has(key)) r05Operated.set(key, []);
    r05Operated.get(key).push({ start: Math.min(y1, y2), end: Math.max(y1, y2) });
  }
}
const columnHasY = (map, x, z, y) => (map.get(columnKey(x, z)) ?? [])
  .some(({ start, end }) => y >= start && y <= end);
const lavaSeepCells = [];
for (const [key, ranges] of r05Operated) {
  const [x, z] = key.split(',').map(Number);
  const { sections } = await surfaceReader.chunk(Math.floor(x / 16), Math.floor(z / 16));
  for (const { start, end } of ranges) {
    for (let sectionY = Math.floor(start / 16); sectionY <= Math.floor(end / 16); sectionY += 1) {
      const palette = sections.get(sectionY)?.block_states?.palette;
      if (!palette?.length || !palette.some(({ Name }) => Name === 'minecraft:lava')) continue;
      const yFrom = Math.max(start, sectionY * 16);
      const yTo = Math.min(end, sectionY * 16 + 15);
      for (let y = yFrom; y <= yTo; y += 1) {
        if ((await surfaceReader.stateAt(x, y, z)).Name === 'minecraft:lava') {
          lavaSeepCells.push({ x, y, z });
        }
      }
    }
  }
}
verifyClass('r05LavaSeep', manifest.partition.wetSourceClasses.r05LavaSeep, lavaSeepCells);

const wetScope = uniqueCells([...r02WetCells, ...b07WetCells, ...lavaSeepCells]);
invariant(wetScope.length === manifest.partition.wetSourceClasses.wetScopeUnionCellCount
  && hashCells(wetScope)
    === manifest.partition.wetSourceClasses.wetScopeUnionCoordinateSetSha256,
'recomputed wet scope union does not match the manifest binding');

const linerOps = new Map();
const expectedDrainCells = [];
const alreadySolidBufferCells = [];
const wetAlreadyTargetCells = [];
for (const cell of wetScope) {
  const state = await reader.blockState(cell.x, cell.y, cell.z);
  const fromState = stateToCommandString(state);
  if (fromState === LINER_STATE) {
    wetAlreadyTargetCells.push(cell);
  } else if (FLUID_BLOCKS.has(state.Name)) {
    if ((state.Properties?.level ?? '0') === '0') linerOps.set(cellKey(cell), { cell, fromState });
    else expectedDrainCells.push(cell);
  } else if (state.Properties?.waterlogged === 'true' || AIR_BLOCKS.has(state.Name)) {
    linerOps.set(cellKey(cell), { cell, fromState });
  } else {
    alreadySolidBufferCells.push(cell);
  }
}
verifyClass('linerOps', manifest.partition.wetLinerDisposition.linerOps,
  [...linerOps.values()].map(({ cell }) => cell));
verifyClass('expectedDrain', manifest.partition.wetLinerDisposition.expectedDrain,
  expectedDrainCells);
verifyClass('alreadySolidBuffer', manifest.partition.wetLinerDisposition.alreadySolidBuffer,
  alreadySolidBufferCells);
verifyClass('wetAlreadyTarget', manifest.partition.wetLinerDisposition.alreadyTarget,
  wetAlreadyTargetCells);
invariant(linerOps.size + expectedDrainCells.length + alreadySolidBufferCells.length
  + wetAlreadyTargetCells.length === wetScope.length,
'wet-liner dispositions do not partition the wet scope');

// ---- Recompute the B11 support classes.
const b11Acceptance = readJson(INPUTS.b11Acceptance);
const b11Proposal = readJson(INPUTS.b11SurfaceRoad);
const profile = deriveB11Profile(b11Acceptance.acceptancePayload.grandAvenue);
const loadCells = uniqueCells(profile.flatMap((point) => {
  const cells = [];
  for (let dz = -3; dz <= 4; dz += 1) {
    for (const dy of [-2, -1]) cells.push({ x: point.x, y: point.y + dy, z: point.z + dz });
  }
  return cells;
}));
invariant(hashCells(loadCells, B11_LOAD_PREAMBLE)
  === b11Proposal.exactCellSets.roadLoadInfluenceReservation.coordinateSetSha256,
'derived B11 load reservation does not match the proposal identity');
const supportOps = new Map();
const alreadySupportingCells = [];
const supportAlreadyTargetCells = [];
for (const cell of loadCells) {
  const state = await reader.blockState(cell.x, cell.y, cell.z);
  const fromState = stateToCommandString(state);
  if (fromState === SUPPORT_STATE) supportAlreadyTargetCells.push(cell);
  else if (AIR_BLOCKS.has(state.Name)) supportOps.set(cellKey(cell), { cell, fromState });
  else alreadySupportingCells.push(cell);
}
verifyClass('supportOps', manifest.partition.b11SupportDisposition.supportOps,
  [...supportOps.values()].map(({ cell }) => cell));
verifyClass('alreadySupporting', manifest.partition.b11SupportDisposition.alreadySupporting,
  alreadySupportingCells);
verifyClass('b11AlreadyTarget', manifest.partition.b11SupportDisposition.alreadyTarget,
  supportAlreadyTargetCells);
invariant(supportOps.size + alreadySupportingCells.length
  + supportAlreadyTargetCells.length === loadCells.length,
'b11-support dispositions do not partition the load reservation');

// ---- B09 verification census must match the manifest.
const d05 = readJson(INPUTS.d05FutureState);
const d05Owner = readJson(INPUTS.d05OwnerAcceptance);
const b09Envelope = buildB09MinimumReservation(
  d05.selectedPlanningIdentity.formula, d05Owner.b09B10SystemPlan.b09Route,
);
const b09Census = new Map();
for (const cell of b09Envelope) {
  const name = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  b09Census.set(name, (b09Census.get(name) ?? 0) + 1);
}
invariant(JSON.stringify(Object.fromEntries([...b09Census.entries()]
  .sort((a, b) => b[1] - a[1])))
  === JSON.stringify(manifest.verification.b09Envelope.currentStateCensus),
'recomputed B09 envelope census does not match the manifest');

// ---- Re-parse both forward files.
const stripHeader = (raw) => `${raw.split('\n')
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
const parsedTargets = new Map();
for (const [pkg, expectedOps, targetState] of [
  [manifest.packages[0], linerOps, LINER_STATE],
  [manifest.packages[1], supportOps, SUPPORT_STATE],
]) {
  const forwardRaw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
  const rollbackRaw = fs.readFileSync(path.join(ROOT, pkg.rollback), 'utf8');
  const operationIdentity = manifest.operations[pkg.key];
  invariant(sha256(stripHeader(forwardRaw)) === operationIdentity.forwardSha256,
    `${pkg.key} forward operation body hash does not match the manifest`);
  invariant(sha256(stripHeader(rollbackRaw)) === operationIdentity.rollbackSha256,
    `${pkg.key} rollback operation body hash does not match the manifest`);
  const targets = [];
  for (const line of forwardRaw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(' ');
    invariant(parts[0] === 'REPL' && parts.length === 9, `${pkg.key} malformed operation`);
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    invariant(x1 === x2 && y1 === y2 && z1 === z2, `${pkg.key} non-single-cell REPL`);
    const expected = expectedOps.get(`${x1},${y1},${z1}`);
    invariant(expected && expected.fromState === parts[7] && parts[8] === targetState,
      `${pkg.key} operation at ${x1},${y1},${z1} does not match the recomputation`);
    targets.push({ x: x1, y: y1, z: z1 });
  }
  invariant(targets.length === expectedOps.size,
    `${pkg.key} parsed target count does not equal the recomputed op class`);
  parsedTargets.set(pkg.key, uniqueCells(targets));
}
const linerTargetKeys = new Set(parsedTargets.get('wet-liner').map(cellKey));
invariant(parsedTargets.get('b11-support')
  .every((cell) => !linerTargetKeys.has(cellKey(cell))),
'packages share target cells');

// ---- Relic cores and prior-release overlap rule.
const allTargets = [...parsedTargets.get('wet-liner'), ...parsedTargets.get('b11-support')];
const coreIntersections = relicClearance.relics.map((relic) => {
  const bounds = relic.declaredInclusiveBounds;
  const hits = allTargets.filter((cell) => cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ);
  return { relic: relic.key, intersectionCellCount: hits.length };
});
invariant(coreIntersections.every(({ intersectionCellCount }) => intersectionCellCount === 0),
  'op targets intersect a protected relic core');

const priorSets = [];
for (const [releaseKey, prior] of [
  ['r01', r01Manifest], ['r02', r02Manifest], ['r03v2', r03Manifest],
]) {
  const targets = new Set();
  for (const pkg of prior.packages) {
    const raw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      targets.add(line.split(' ').slice(1, 4).map(Number).join(','));
    }
  }
  priorSets.push({ releaseKey, targets });
}
const lavaSeepKeys = new Set(lavaSeepCells.map(cellKey));
const overlapCounts = { r01: 0, r02: 0, r03v2: 0, r05: 0 };
const airFrom = (key, expectedOps) => AIR_BLOCKS
  .has(expectedOps.get(key).fromState.split('[')[0]);
for (const [pkgKey, expectedOps] of [['wet-liner', linerOps], ['b11-support', supportOps]]) {
  for (const cell of parsedTargets.get(pkgKey)) {
    const key = cellKey(cell);
    for (const { releaseKey, targets } of priorSets) {
      if (targets.has(key)) {
        invariant(airFrom(key, expectedOps),
          `${pkgKey} overlap with ${releaseKey} at ${key} has a non-air source`);
        overlapCounts[releaseKey] += 1;
      }
    }
    if (columnHasY(r05Operated, cell.x, cell.z, cell.y)) {
      invariant(lavaSeepKeys.has(key),
        `${pkgKey} target ${key} intersects R05 outside the declared lava-seep class`);
      overlapCounts.r05 += 1;
    }
  }
}
for (const [releaseKey, count] of Object.entries({
  r01: manifest.crossReleaseIsolation.declaredOverlaps.r01.cellCount,
  r02: manifest.crossReleaseIsolation.declaredOverlaps.r02.cellCount,
  r03v2: manifest.crossReleaseIsolation.declaredOverlaps.r03v2.cellCount,
  r05: manifest.crossReleaseIsolation.r05IntersectionCellCount,
})) {
  invariant(overlapCounts[releaseKey] === count,
    `recomputed ${releaseKey} overlap count does not match the manifest`);
}

invariant(registry.g04PhysicalOwnership?.g04PassedOffline === true
  && registry.g04PhysicalOwnership?.unownedCellCount === 0
  && registry.g04PhysicalOwnership?.multiplyOwnedCellCount === 0,
'one-owner partition proof is not PASS');
invariant(layerBClosure.registryIdentity?.registryCanonicalPayloadSha256
  === registry.canonicalPayloadSha256
  && layerBClosure.closureSummary?.layerBClosed === true,
'interface closure is not bound to this registry identity');
invariant(manifest.upstreamIdentities.ownershipRegistryPayloadSha256
  === registry.canonicalPayloadSha256,
'manifest is bound to a different registry identity');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-r06-support-liner-ownership-interface-audit',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_EXACT_CLASS_RECOMPUTATION_DISJOINT_PACKAGES_ZERO_CORE_OVERLAP_DECLARED_PRIOR_OVERLAPS_ONE_OWNER_BOUND',
  manifestIdentity: manifest.manifestIdentity,
  packages: manifest.packages.map(({ key }) => ({
    key,
    forwardSha256: manifest.operations[key].forwardSha256,
    rollbackSha256: manifest.operations[key].rollbackSha256,
    targetCellCount: parsedTargets.get(key).length,
  })),
  classRecomputation: {
    r02AquiferDeferralCellCount: r02WetCells.length,
    b07WetPocketCellCount: b07WetCells.length,
    r05LavaSeepCellCount: lavaSeepCells.length,
    wetScopeUnionCellCount: wetScope.length,
    linerOpsCellCount: linerOps.size,
    expectedDrainCellCount: expectedDrainCells.length,
    alreadySolidBufferCellCount: alreadySolidBufferCells.length,
    supportOpsCellCount: supportOps.size,
    alreadySupportingCellCount: alreadySupportingCells.length,
    allClassesMatchManifest: true,
  },
  b09Verification: {
    cellCount: b09Envelope.length,
    censusMatchesManifest: true,
  },
  packageDisjointness: { sharedTargetCellCount: 0, exactlyDisjoint: true },
  protectedCoreIntersections: coreIntersections,
  crossReleaseOverlaps: {
    counts: overlapCounts,
    rule: 'air-source cells inside previously excavated voids or the declared lava-seep class only',
    allMatchManifest: true,
  },
  ownership: {
    registryCanonicalPayloadSha256: registry.canonicalPayloadSha256,
    unownedCellCount: 0,
    multiplyOwnedCellCount: 0,
    owningScopes: [
      'D06 wet deferral classes (R02/R03 frozen)', 'P1-B11/influence (load reservation)',
    ],
    interfaceClosureReportIdentitySha256: layerBClosure.reportIdentitySha256,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldEditAuthorized: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  classRecomputation: report.classRecomputation,
  crossReleaseOverlaps: overlapCounts,
  coreIntersections,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
