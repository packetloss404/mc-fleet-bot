#!/usr/bin/env node
/**
 * T02 release-scoped ownership/interface audit for the CZ-R02 D06 Empty
 * Eight deep-shell packages.
 *
 * Independently re-parses both compiled forward operation files and proves:
 * - the two packages' target sets are exactly disjoint;
 * - the union of targets is an exact bijection with the union of the two
 *   frozen G03 D06 construction domains, with each domain's parsed subset
 *   hashed against its committed G03 identity (D06-RESERVATIONS under the
 *   civil/life-safety-closure preamble, D06-MECHANISMS under the standard
 *   preamble);
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
  CIVIL_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  deriveD06DetailedMechanismLayers,
  deriveD06ReservationConstruction,
  deriveD06ReservationReferences,
  hashCells,
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
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const relics = readJson(INPUTS.protectedRelicClearance);
const layerBClosure = readJson(INPUTS.layerBClosure);

invariant(manifest.packages.length === 2
  && manifest.packages[0].key === 'd06-reservations'
  && manifest.packages[1].key === 'd06-mechanisms',
'manifest does not declare the two expected D06 packages');

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
const { proposalUnion: mechanismDomain } = deriveD06DetailedMechanismLayers(
  d06Mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  d06Detailed,
);
invariant(mechanismDomain.length === g03Mechanisms.cellCount
  && hashCells(mechanismDomain) === g03Mechanisms.coordinateSetSha256,
'independently derived D06-MECHANISMS domain does not match its G03 identity');

// Union-of-targets bijection with the union of the two frozen domains.
const unionTargets = uniqueCells([...reservationTargets, ...mechanismTargets]);
invariant(unionTargets.length === reservationTargets.length + mechanismTargets.length,
  'target union count contradicts package disjointness');
const domainUnion = uniqueCells([...reservationDomain, ...mechanismDomain]);
invariant(unionTargets.length === domainUnion.length
  && hashCells(unionTargets) === hashCells(domainUnion),
'union of targets is not an exact bijection with the frozen domain union');

// Each frozen domain's parsed subset must hash to its committed G03 identity.
const reservationDomainKeys = new Set(reservationDomain.map(cellKey));
const targetsInReservationDomain = unionTargets
  .filter((cell) => reservationDomainKeys.has(cellKey(cell)));
const reservationSubsetHash = hashCells(targetsInReservationDomain, CIVIL_CELL_PREAMBLE);
invariant(targetsInReservationDomain.length === g03Reservations.cellCount
  && reservationSubsetHash === g03Reservations.sourceCoordinateSetSha256,
'parsed D06-RESERVATIONS target subset does not equal the frozen G03 identity');
const mechanismSubsetHash = hashCells(mechanismTargets);
invariant(mechanismTargets.length === g03Mechanisms.cellCount
  && mechanismSubsetHash === g03Mechanisms.coordinateSetSha256,
'parsed D06-MECHANISMS target set does not equal the frozen G03 identity');

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
  status: 'PASS_EXACT_DOMAIN_UNION_BIJECTION_DISJOINT_PACKAGES_ZERO_CORE_OVERLAP_ONE_OWNER_BOUND',
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
  domainUnionBijection: {
    targetUnionCellCount: unionTargets.length,
    frozenDomainUnionCellCount: domainUnion.length,
    targetUnionCoordinateSetSha256: hashCells(unionTargets),
    targetUnionBounds: boundsOf(unionTargets),
    exactBijection: true,
    reservationSubset: {
      cellCount: targetsInReservationDomain.length,
      coordinateSetSha256: reservationSubsetHash,
      frozenCoordinateSetSha256: g03Reservations.sourceCoordinateSetSha256,
      coordinateHashPreamble: `${CIVIL_CELL_PREAMBLE}\\n`,
    },
    mechanismSubset: {
      cellCount: mechanismTargets.length,
      coordinateSetSha256: mechanismSubsetHash,
      frozenCoordinateSetSha256: g03Mechanisms.coordinateSetSha256,
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
  targetUnionCellCount: report.domainUnionBijection.targetUnionCellCount,
  coreIntersections,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
