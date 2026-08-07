#!/usr/bin/env node
/**
 * T02 release-scoped ownership/interface audit for the CZ-R03/R04 connector
 * tunnel-bore packages.
 *
 * Independently re-parses the three compiled forward operation files,
 * re-derives the three frozen G03 connector construction domains, and
 * recomputes every partition class (operated / surfaceDeferral /
 * wetZoneDeferral / alreadyTarget) with the same rules against the same
 * bound save, then proves:
 * - the three packages' target sets are pairwise disjoint;
 * - every recomputed partition class matches the manifest's bound identity;
 * - each domain's four classes partition its frozen domain exactly (count
 *   and coordinate-set hash against the committed G03 identity);
 * - each package's parsed targets equal its recomputed operated class (the
 *   b08 package minus the B03/B08 connection-throat cells adjudicated to
 *   b03-jcurve);
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
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  deriveB07WestTwo,
  deriveB08ServiceTunnelConstruction,
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
const GENERATED_AT = value('--generated-at', '2026-08-07T01:55:00Z');
const OUTPUT = path.resolve(value('--out',
  'data/world-review/combined-zones-r03-tunnels-v2.ownership-interface-audit.json'));

const INPUTS = Object.freeze({
  manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  decision: 'docs/masterplans/05-combined-zones/phase1-r03-tunnels-scope-and-material-decision.md',
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R03 tunnels T02 audit rejected: ${message}`);
}

const manifest = readJson(INPUTS.manifest);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const relics = readJson(INPUTS.protectedRelicClearance);
const layerBClosure = readJson(INPUTS.layerBClosure);

const PACKAGE_KEYS = ['b03-jcurve', 'b08-service-tunnel', 'b07-shaft'];
invariant(manifest.packages.length === 3
  && manifest.packages.every(({ key }, index) => key === PACKAGE_KEYS[index]),
'manifest does not declare the three expected tunnel packages in order');
invariant(manifest.scope.decisionRecord?.path === INPUTS.decision
  && sha256(fs.readFileSync(path.join(ROOT, INPUTS.decision)))
    === manifest.scope.decisionRecord.sha256,
'manifest decision-record binding does not match the decision record bytes');
invariant(manifest.scope.rebind?.reboundCompleteSaveSha256
  === manifest.source.completeSaveSha256
  && manifest.scope.rebind?.reboundSnapshotRoot === manifest.source.snapshotRoot
  && typeof manifest.scope.rebind?.reason === 'string',
'manifest rebind section does not match its bound source save');

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

const parsedTargets = new Map(manifest.packages
  .map((pkg) => [pkg.key, parseTargets(pkg)]));

// Pairwise package disjointness.
for (let left = 0; left < PACKAGE_KEYS.length; left += 1) {
  for (let right = left + 1; right < PACKAGE_KEYS.length; right += 1) {
    const rightKeys = new Set(parsedTargets.get(PACKAGE_KEYS[right]).map(cellKey));
    const shared = parsedTargets.get(PACKAGE_KEYS[left])
      .filter((cell) => rightKeys.has(cellKey(cell)));
    invariant(shared.length === 0,
      `${PACKAGE_KEYS[left]} and ${PACKAGE_KEYS[right]} share ${shared.length} target cells`);
  }
}

// Independently re-derive the three frozen domains and prove them against
// the committed G03 identities.
const b03Doc = readJson(INPUTS.b03Geometry);
const connectors = readJson(INPUTS.connectors);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const g03Construction = (scopeId) => g03.scopeRegistry
  .find((scope) => scope.scopeId === scopeId).construction;

const domains = [
  { key: 'b03-jcurve', scopeId: 'P1-B03', cells: uniqueCells(b03Doc.design.excavationReservation.cells) },
  { key: 'b08-service-tunnel', scopeId: 'P1-B08', cells: deriveB08ServiceTunnelConstruction(connectors) },
  {
    key: 'b07-shaft',
    scopeId: 'P1-B07',
    cells: deriveB07WestTwo(d06Mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem)
      .construction,
  },
];
for (const domain of domains) {
  const committed = g03Construction(domain.scopeId);
  invariant(domain.cells.length === committed.cellCount
    && JSON.stringify(boundsOf(domain.cells)) === JSON.stringify(committed.bounds)
    && hashCells(domain.cells) === committed.coordinateSetSha256,
  `independently derived ${domain.scopeId} domain does not match its G03 identity`);
  domain.coordinateSetSha256 = committed.coordinateSetSha256;
}
invariant(hashCells(domains[2].cells, D06_CELL_PREAMBLE)
  === g03Construction('P1-B07').sourceCoordinateSetSha256,
'independently derived P1-B07 domain does not match its D06-preamble source identity');

// Recompute every partition class with the same rules against the same
// bound save the manifest declares. Every cell is a to-air bore cell and no
// cell is surfaceDesignated, so classification is domain-independent.
const reader = new AnvilReader(path.join(ROOT, manifest.source.snapshotRoot, 'region'));
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const isFluid = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const WORLD_MAX_Y = 320;
const BORE_TARGET_STATE = manifest.scope.boreTargetState;
invariant(BORE_TARGET_STATE === 'minecraft:air', 'bore target state drift');

const unionCellsAll = uniqueCells(domains.flatMap(({ cells }) => cells));
const recordByKey = new Map();
const columns = new Map();
for (const cell of unionCellsAll) {
  const rawState = await reader.blockState(cell.x, cell.y, cell.z);
  const record = {
    cell,
    fromState: stateToCommandString(rawState),
    fluidSource: isFluid(rawState),
    fluidAdjacent: false,
    surfaceExposed: false,
  };
  for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
    if (isFluid(await reader.blockState(cell.x + dx, cell.y + dy, cell.z + dz))) {
      record.fluidAdjacent = true;
      break;
    }
  }
  const columnId = `${cell.x},${cell.z}`;
  if (!columns.has(columnId)) columns.set(columnId, { x: cell.x, z: cell.z, records: [] });
  columns.get(columnId).records.push(record);
  recordByKey.set(cellKey(cell), record);
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

const isWetExcluded = (record) => record.fluidSource || record.fluidAdjacent;
const isSurfaceExcluded = (record) => record.surfaceExposed;
const isExcluded = (record) => isWetExcluded(record) || isSurfaceExcluded(record);
const isAlreadyTarget = (record) => !isExcluded(record)
  && record.fromState === BORE_TARGET_STATE;
const isOperated = (record) => !isExcluded(record) && !isAlreadyTarget(record);

const partitionRecomputation = {};
const recomputedOperated = new Map();
for (const domain of domains) {
  const records = domain.cells.map((cell) => recordByKey.get(cellKey(cell)));
  const classes = {
    operated: uniqueCells(records.filter(isOperated).map(({ cell }) => cell)),
    surfaceDeferral: uniqueCells(records.filter(isSurfaceExcluded).map(({ cell }) => cell)),
    wetZoneDeferral: uniqueCells(records.filter(isWetExcluded).map(({ cell }) => cell)),
    alreadyTarget: uniqueCells(records.filter(isAlreadyTarget).map(({ cell }) => cell)),
  };
  const bound = manifest.partition[domain.key];
  for (const [className, cells] of Object.entries(classes)) {
    invariant(cells.length === bound[className].cellCount
      && hashCells(cells) === bound[className].coordinateSetSha256,
    `recomputed ${domain.key} ${className} class does not match the manifest binding`);
  }
  const excludedUnion = uniqueCells([...classes.surfaceDeferral, ...classes.wetZoneDeferral]);
  invariant(classes.operated.length + excludedUnion.length + classes.alreadyTarget.length
    === domain.cells.length
    && hashCells(uniqueCells([
      ...classes.operated, ...excludedUnion, ...classes.alreadyTarget,
    ])) === domain.coordinateSetSha256,
  `recomputed ${domain.key} classes are not an exact partition of the frozen domain`);
  recomputedOperated.set(domain.key, classes.operated);
  partitionRecomputation[domain.key] = Object.fromEntries(Object.entries(classes)
    .map(([className, cells]) => [className, {
      recomputedCellCount: cells.length,
      coordinateSetSha256: hashCells(cells),
      matchesManifest: true,
    }]));
}

// Each package's parsed targets must equal its recomputed operated class;
// the b08 package excludes the connection-throat cells adjudicated to
// b03-jcurve.
const b03Keys = new Set(domains[0].cells.map(cellKey));
const overlap = domains[1].cells.filter((cell) => b03Keys.has(cellKey(cell)));
invariant(overlap.length === manifest.scope.overlapAdjudication.b03B08SharedCells.cellCount
  && hashCells(overlap)
    === manifest.scope.overlapAdjudication.b03B08SharedCells.coordinateSetSha256,
'recomputed B03/B08 shared-cell set does not match the manifest binding');
const overlapKeys = new Set(overlap.map(cellKey));
const expectedPackageTargets = new Map([
  ['b03-jcurve', recomputedOperated.get('b03-jcurve')],
  ['b08-service-tunnel', recomputedOperated.get('b08-service-tunnel')
    .filter((cell) => !overlapKeys.has(cellKey(cell)))],
  ['b07-shaft', recomputedOperated.get('b07-shaft')],
]);
for (const key of PACKAGE_KEYS) {
  const parsed = parsedTargets.get(key);
  const expected = uniqueCells(expectedPackageTargets.get(key));
  invariant(parsed.length === expected.length && hashCells(parsed) === hashCells(expected),
    `${key} parsed targets do not equal the recomputed operated class`);
}

const unionTargets = uniqueCells(PACKAGE_KEYS.flatMap((key) => parsedTargets.get(key)));
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
  id: 'combined-zones-r03-tunnels-ownership-interface-audit',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_EXACT_PER_DOMAIN_PARTITION_DISJOINT_PACKAGES_ZERO_CORE_OVERLAP_ONE_OWNER_BOUND',
  manifestIdentity: manifest.manifestIdentity,
  packages: manifest.packages.map(({ key }) => ({
    key,
    forwardSha256: manifest.operations[key].forwardSha256,
    rollbackSha256: manifest.operations[key].rollbackSha256,
    targetCellCount: parsedTargets.get(key).length,
  })),
  packageDisjointness: {
    pairwiseSharedTargetCellCount: 0,
    exactlyDisjoint: true,
  },
  partitionRecomputation: {
    snapshotRoot: manifest.source.snapshotRoot,
    decisionRecordSha256: manifest.scope.decisionRecord.sha256,
    domains: partitionRecomputation,
    b03B08OverlapAdjudicatedToB03: {
      recomputedCellCount: overlap.length,
      coordinateSetSha256: hashCells(overlap),
      matchesManifest: true,
    },
  },
  operatedTargets: {
    unionCellCount: unionTargets.length,
    unionCoordinateSetSha256: hashCells(unionTargets),
    unionBounds: unionTargets.length ? boundsOf(unionTargets) : null,
  },
  protectedCoreIntersections: coreIntersections,
  ownership: {
    registryCanonicalPayloadSha256: registry.canonicalPayloadSha256,
    unownedCellCount: 0,
    multiplyOwnedCellCount: 0,
    owningScopes: [
      'P1-B03/construction', 'P1-B08/construction', 'P1-B07/construction',
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
  packages: report.packages.map(({ key, targetCellCount }) => ({ key, targetCellCount })),
  operatedUnionCellCount: unionTargets.length,
  coreIntersections,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
