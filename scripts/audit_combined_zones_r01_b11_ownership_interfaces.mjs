#!/usr/bin/env node
/**
 * T02 release-scoped ownership/interface audit for the CZ-R01 B11 road
 * package.
 *
 * Independently re-parses the compiled forward operation file and proves:
 * - the exact target cell set is a bijection with the frozen G03 P1-B11
 *   construction domain (count, bounds, coordinate-set SHA-256);
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
import { boundsOf, hashCells, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-06T22:45:00Z');
const OUTPUT = path.resolve(value('--out',
  'data/world-review/combined-zones-r01-b11-road.ownership-interface-audit.json'));

const INPUTS = Object.freeze({
  manifest: 'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R01 B11 T02 audit rejected: ${message}`);
}

const manifest = readJson(INPUTS.manifest);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const relics = readJson(INPUTS.protectedRelicClearance);
const layerBClosure = readJson(INPUTS.layerBClosure);

const pkg = manifest.packages[0];
const forwardRaw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
const rollbackRaw = fs.readFileSync(path.join(ROOT, pkg.rollback), 'utf8');

const stripHeader = (raw) => raw.split('\n').filter((line) => line && !line.startsWith('#')).join('\n') + '\n';
invariant(sha256(stripHeader(forwardRaw)) === manifest.operations.forwardSha256,
  'forward operation body hash does not match the manifest');
invariant(sha256(stripHeader(rollbackRaw)) === manifest.operations.rollbackSha256,
  'rollback operation body hash does not match the manifest');

const targets = [];
for (const line of forwardRaw.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const parts = line.split(' ');
  invariant(parts[0] === 'REPL', `unexpected op verb: ${parts[0]}`);
  const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
  invariant(x1 === x2 && y1 === y2 && z1 === z2, 'non-single-cell REPL found');
  targets.push({ x: x1, y: y1, z: z1 });
}
const exactTargets = uniqueCells(targets);
invariant(exactTargets.length === targets.length, 'duplicate target cells in forward ops');

const b11Scope = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B11');
const targetHash = hashCells(exactTargets);
invariant(exactTargets.length === b11Scope.construction.cellCount,
  'target count is not a bijection with the frozen domain');
invariant(targetHash === b11Scope.construction.coordinateSetSha256,
  'target coordinate-set hash does not equal the frozen G03 identity');
invariant(JSON.stringify(boundsOf(exactTargets)) === JSON.stringify(b11Scope.construction.bounds),
  'target bounds drift from the frozen G03 bounds');

const coreIntersections = relics.relics.map((relic) => {
  const bounds = relic.declaredInclusiveBounds;
  const hits = exactTargets.filter((cell) => cell.x >= bounds.minX && cell.x <= bounds.maxX
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
  id: 'combined-zones-r01-b11-ownership-interface-audit',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_EXACT_DOMAIN_BIJECTION_ZERO_CORE_OVERLAP_ONE_OWNER_BOUND',
  manifestIdentity: manifest.manifestIdentity,
  forwardSha256: manifest.operations.forwardSha256,
  rollbackSha256: manifest.operations.rollbackSha256,
  domainBijection: {
    targetCellCount: exactTargets.length,
    frozenDomainCellCount: b11Scope.construction.cellCount,
    targetCoordinateSetSha256: targetHash,
    frozenCoordinateSetSha256: b11Scope.construction.coordinateSetSha256,
    exactBijection: true,
  },
  protectedCoreIntersections: coreIntersections,
  ownership: {
    registryCanonicalPayloadSha256: registry.canonicalPayloadSha256,
    unownedCellCount: 0,
    multiplyOwnedCellCount: 0,
    owningScope: 'P1-B11/construction',
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
  targetCellCount: report.domainBijection.targetCellCount,
  coreIntersections,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
