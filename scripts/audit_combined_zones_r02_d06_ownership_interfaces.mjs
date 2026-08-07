#!/usr/bin/env node
/**
 * T02 release-scoped ownership/interface audit for the CZ-R02 D06 Empty
 * Eight deep-shell packages under the owner's R02 scope amendment.
 *
 * Independently re-parses both compiled forward operation files, re-derives
 * both frozen G03 D06 construction domains, and recomputes both amendment
 * exclusion classes with the same rules against the same bound save, then
 * proves:
 * - the two packages' target sets are exactly disjoint;
 * - the recomputed surface-deferral, wet-zone-deferral, and already-target
 *   sets match the manifest's bound identities exactly;
 * - each package's parsed targets equal its frozen package domain minus the
 *   recomputed exclusion union minus the recomputed already-target class,
 *   cell for cell;
 * - parsed targets plus recomputed exclusions plus the recomputed
 *   already-target class form an exact partition of the frozen domain union,
 *   with the union verified against the committed G03 identities
 *   (D06-RESERVATIONS under the civil/life-safety-closure preamble,
 *   D06-MECHANISMS under the standard preamble);
 * - zero target cells intersect any of the three protected relic default-deny
 *   cores;
 * - exclusive ownership rests on the accepted one-owner registry partition
 *   (zero unowned / multiply-owned cells across the composite), bound by
 *   payload identity;
 * - forward and rollback operation identities match the release manifest.
 *
 * Read-only; no live call; no world edit authorized.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  CIVIL_CELL_PREAMBLE,
  assignD06CanonicalLayers,
  boundsOf,
  cellKey,
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
const GENERATED_AT = value('--generated-at', '2026-08-06T23:55:00Z');
const OUTPUT = path.resolve(value('--out',
  'data/world-review/combined-zones-r02-d06-shell.ownership-interface-audit.json'));

const INPUTS = Object.freeze({
  manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  decision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  amendment: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-amendment.md',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R02 D06 T02 audit rejected: ${message}`);
}

const manifest = readJson(INPUTS.manifest);
const decision = readJson(INPUTS.decision);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const relics = readJson(INPUTS.protectedRelicClearance);
const layerBClosure = readJson(INPUTS.layerBClosure);

invariant(manifest.packages.length === 2
  && manifest.packages[0].key === 'd06-reservations'
  && manifest.packages[1].key === 'd06-mechanisms',
'manifest does not declare the two expected D06 packages');
invariant(manifest.amendment?.path === INPUTS.amendment
  && sha256(fs.readFileSync(path.join(ROOT, INPUTS.amendment)))
    === manifest.amendment.sha256,
'manifest amendment binding does not match the amendment record bytes');

const stripHeader = (raw) => `${raw.split('\n')
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;

function parseTargets(pkg) {
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
    invariant(parts[0] === 'REPL', `${pkg.key} unexpected op verb: ${parts[0]}`);
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    invariant(x1 === x2 && y1 === y2 && z1 === z2, `${pkg.key} non-single-cell REPL found`);
    targets.push({ x: x1, y: y1, z: z1 });
  }
  const exactTargets = uniqueCells(targets);
  invariant(exactTargets.length === targets.length, `${pkg.key} duplicate target cells`);
  return exactTargets;
}

const reservationTargets = parseTargets(manifest.packages[0]);
const mechanismTargets = parseTargets(manifest.packages[1]);

// Package disjointness.
const mechanismTargetKeys = new Set(mechanismTargets.map(cellKey));
const sharedTargets = reservationTargets.filter((cell) => mechanismTargetKeys.has(cellKey(cell)));
invariant(sharedTargets.length === 0,
  `packages share ${sharedTargets.length} target cells; they must be disjoint`);

// Independently re-derive both frozen domains (each verified against its
// upstream identity inside the lib) and prove them against the G03 registry.
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const emptyEight = readJson(INPUTS.emptyEight);
const d06Detailed = readJson(INPUTS.d06Detailed);
const g03Reservations = g03.scopeRegistry
  .find(({ scopeId }) => scopeId === 'D06-RESERVATIONS').construction;
const g03Mechanisms = g03.scopeRegistry
  .find(({ scopeId }) => scopeId === 'D06-MECHANISMS').construction;

const reservationDomain = deriveD06ReservationConstruction(deriveD06ReservationReferences({
  mechanismsPayload: d06Mechanisms.mechanismDevelopmentPayload,
  lifeSafetyDoc: d06LifeSafety,
  emptyEightDoc: emptyEight,
  lifeSafetyPath: INPUTS.d06LifeSafety,
  emptyEightPath: INPUTS.emptyEight,
}));
invariant(reservationDomain.length === g03Reservations.cellCount
  && hashCells(reservationDomain, CIVIL_CELL_PREAMBLE)
    === g03Reservations.sourceCoordinateSetSha256,
'independently derived D06-RESERVATIONS domain does not match its G03 identity');
const { layers, proposalUnion: mechanismDomain } = deriveD06DetailedMechanismLayers(
  d06Mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  d06Detailed,
);
invariant(mechanismDomain.length === g03Mechanisms.cellCount
  && hashCells(mechanismDomain) === g03Mechanisms.coordinateSetSha256,
'independently derived D06-MECHANISMS domain does not match its G03 identity');
const layerOwner = assignD06CanonicalLayers(layers, d06Detailed);

// Recompute both amendment exclusion classes with the same rules against the
// same bound save the manifest declares.
const layerStates = decision.decisionPayload.mechanismLayerStates;
const mechanismDomainKeys = new Set(mechanismDomain.map(cellKey));
const domainRecords = [
  ...reservationDomain
    .filter((cell) => !mechanismDomainKeys.has(cellKey(cell)))
    .map((cell) => ({
      cell,
      package: 'd06-reservations',
      toState: decision.decisionPayload.reservationsPolicy.state,
      toAir: true,
      surfaceDesignated: false,
    })),
  ...mechanismDomain.map((cell) => {
    const layerDecision = layerStates[layerOwner.get(cellKey(cell))];
    return {
      cell,
      package: 'd06-mechanisms',
      toState: layerDecision.state,
      toAir: layerDecision.state === 'minecraft:air',
      surfaceDesignated: layerDecision.surfaceDesignated === true,
    };
  }),
];

const reader = new AnvilReader(path.join(ROOT, manifest.source.snapshotRoot, 'region'));
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const isFluid = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const WORLD_MAX_Y = 320;

const columns = new Map();
for (const record of domainRecords) {
  const { cell } = record;
  const rawState = await reader.blockState(cell.x, cell.y, cell.z);
  record.fromState = stateToCommandString(rawState);
  record.fluidSource = isFluid(rawState);
  record.fluidAdjacent = false;
  record.surfaceExposed = false;
  if (record.toAir) {
    for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
      if (isFluid(await reader.blockState(cell.x + dx, cell.y + dy, cell.z + dz))) {
        record.fluidAdjacent = true;
        break;
      }
    }
  }
  if (record.toAir && !record.surfaceDesignated) {
    const columnId = `${cell.x},${cell.z}`;
    if (!columns.has(columnId)) columns.set(columnId, { x: cell.x, z: cell.z, records: [] });
    columns.get(columnId).records.push(record);
  }
}
for (const column of columns.values()) {
  const lowestCellY = Math.min(...column.records.map(({ cell }) => cell.y));
  let highestNonAirY = null;
  for (let y = WORLD_MAX_Y; y > lowestCellY; y -= 1) {
    if (!AIR_BLOCKS.has((await reader.blockState(column.x, y, column.z)).Name)) {
      highestNonAirY = y;
      break;
    }
  }
  for (const record of column.records) {
    if (highestNonAirY === null || highestNonAirY <= record.cell.y) {
      record.surfaceExposed = true;
    }
  }
}

const isWetExcluded = (record) => record.fluidSource || (record.toAir && record.fluidAdjacent);
const isSurfaceExcluded = (record) => record.surfaceExposed;
const isExcluded = (record) => isWetExcluded(record) || isSurfaceExcluded(record);
const isAlreadyTarget = (record) => !isExcluded(record) && record.fromState === record.toState;
const recomputedSurface = uniqueCells(domainRecords
  .filter(isSurfaceExcluded).map(({ cell }) => cell));
const recomputedWet = uniqueCells(domainRecords
  .filter(isWetExcluded).map(({ cell }) => cell));
const recomputedExcludedUnion = uniqueCells(domainRecords
  .filter(isExcluded).map(({ cell }) => cell));
const recomputedAlreadyTarget = uniqueCells(domainRecords
  .filter(isAlreadyTarget).map(({ cell }) => cell));

const verifyBoundClass = (name, bound, recomputed) => {
  invariant(recomputed.length === bound.cellCount
    && hashCells(recomputed) === bound.coordinateSetSha256,
  `recomputed ${name} set does not match the manifest binding`);
};
verifyBoundClass('surfaceDeferral', manifest.amendment.exclusions.surfaceDeferral,
  recomputedSurface);
verifyBoundClass('wetZoneDeferral', manifest.amendment.exclusions.wetZoneDeferral,
  recomputedWet);
verifyBoundClass('excludedUnion', manifest.amendment.exclusions.excludedUnion,
  recomputedExcludedUnion);
verifyBoundClass('alreadyTarget', manifest.amendment.alreadyTarget,
  recomputedAlreadyTarget);

// Each package's parsed targets must equal its frozen package domain minus
// the recomputed exclusion union minus the recomputed already-target class,
// cell for cell.
const excludedKeys = new Set(recomputedExcludedUnion.map(cellKey));
const alreadyTargetKeys = new Set(recomputedAlreadyTarget.map(cellKey));
for (const [key, parsed] of [
  ['d06-reservations', reservationTargets],
  ['d06-mechanisms', mechanismTargets],
]) {
  const expected = uniqueCells(domainRecords
    .filter((record) => record.package === key
      && !excludedKeys.has(cellKey(record.cell))
      && !alreadyTargetKeys.has(cellKey(record.cell)))
    .map(({ cell }) => cell));
  invariant(parsed.length === expected.length && hashCells(parsed) === hashCells(expected),
    `${key} parsed targets do not equal the frozen package domain minus the recomputed exclusion and already-target classes`);
}

// Parsed targets plus recomputed exclusions plus the recomputed
// already-target class must partition the frozen union.
const unionTargets = uniqueCells([...reservationTargets, ...mechanismTargets]);
invariant(unionTargets.length === reservationTargets.length + mechanismTargets.length,
  'target union count contradicts package disjointness');
invariant(unionTargets.every((cell) => !excludedKeys.has(cellKey(cell))
  && !alreadyTargetKeys.has(cellKey(cell))),
'an operated target cell is inside a recomputed non-operated class');
const domainUnion = uniqueCells([...reservationDomain, ...mechanismDomain]);
invariant(unionTargets.length + recomputedExcludedUnion.length
  + recomputedAlreadyTarget.length === domainUnion.length
  && hashCells(uniqueCells([
    ...unionTargets, ...recomputedExcludedUnion, ...recomputedAlreadyTarget,
  ])) === hashCells(domainUnion),
'targets plus exclusions plus already-target are not an exact partition of the frozen domain union');

const coreIntersections = relics.relics.map((relic) => {
  const bounds = relic.declaredInclusiveBounds;
  const hits = unionTargets.filter((cell) => cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ);
  return { relic: relic.key, intersectionCellCount: hits.length };
});
invariant(coreIntersections.every(({ intersectionCellCount }) => intersectionCellCount === 0),
  'target cells intersect a protected relic core');

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
  id: 'combined-zones-r02-d06-ownership-interface-audit',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_EXACT_AMENDED_PARTITION_DISJOINT_PACKAGES_ZERO_CORE_OVERLAP_ONE_OWNER_BOUND',
  manifestIdentity: manifest.manifestIdentity,
  packages: manifest.packages.map(({ key }) => ({
    key,
    forwardSha256: manifest.operations[key].forwardSha256,
    rollbackSha256: manifest.operations[key].rollbackSha256,
  })),
  packageDisjointness: {
    reservationsTargetCellCount: reservationTargets.length,
    mechanismsTargetCellCount: mechanismTargets.length,
    sharedTargetCellCount: 0,
    exactlyDisjoint: true,
  },
  amendmentExclusionRecomputation: {
    amendmentSha256: manifest.amendment.sha256,
    snapshotRoot: manifest.source.snapshotRoot,
    surfaceDeferral: {
      recomputedCellCount: recomputedSurface.length,
      coordinateSetSha256: hashCells(recomputedSurface),
      matchesManifest: true,
    },
    wetZoneDeferral: {
      recomputedCellCount: recomputedWet.length,
      coordinateSetSha256: hashCells(recomputedWet),
      matchesManifest: true,
    },
    excludedUnion: {
      recomputedCellCount: recomputedExcludedUnion.length,
      coordinateSetSha256: hashCells(recomputedExcludedUnion),
      matchesManifest: true,
    },
    alreadyTarget: {
      recomputedCellCount: recomputedAlreadyTarget.length,
      coordinateSetSha256: hashCells(recomputedAlreadyTarget),
      matchesManifest: true,
    },
  },
  amendedDomainPartition: {
    frozenDomainUnionCellCount: domainUnion.length,
    operatedTargetCellCount: unionTargets.length,
    excludedCellCount: recomputedExcludedUnion.length,
    alreadyTargetCellCount: recomputedAlreadyTarget.length,
    operatedTargetCoordinateSetSha256: hashCells(unionTargets),
    operatedTargetBounds: boundsOf(unionTargets),
    exactPartitionOfFrozenUnion: true,
    frozenIdentities: {
      reservationsCoordinateSetSha256: g03Reservations.sourceCoordinateSetSha256,
      reservationsCoordinateHashPreamble: `${CIVIL_CELL_PREAMBLE}\\n`,
      mechanismsCoordinateSetSha256: g03Mechanisms.coordinateSetSha256,
    },
  },
  protectedCoreIntersections: coreIntersections,
  ownership: {
    registryCanonicalPayloadSha256: registry.canonicalPayloadSha256,
    unownedCellCount: 0,
    multiplyOwnedCellCount: 0,
    owningScopes: ['D06-RESERVATIONS/construction', 'D06-MECHANISMS/construction'],
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
  packageDisjointness: report.packageDisjointness,
  amendmentExclusionRecomputation: {
    surfaceDeferralCellCount: recomputedSurface.length,
    wetZoneDeferralCellCount: recomputedWet.length,
    excludedUnionCellCount: recomputedExcludedUnion.length,
    alreadyTargetCellCount: recomputedAlreadyTarget.length,
  },
  operatedTargetCellCount: unionTargets.length,
  coreIntersections,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
