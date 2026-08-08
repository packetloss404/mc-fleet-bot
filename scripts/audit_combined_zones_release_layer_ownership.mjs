#!/usr/bin/env node
/** T02: fail-closed ownership, protected-core, and cross-package seam audit. */

import {
  readJson,
  resolveFromRoot,
  relativeToRoot,
  sha256Json,
  writeJson,
  boxesIntersect,
  loadProtectedBounds,
  parseArgs,
} from './lib/combined_zones_release_layer.mjs';

const args = parseArgs(process.argv.slice(2));
const layerPath = resolveFromRoot(args.get('--layer') ?? 'data/world-review/combined-zones-release-layer-20260808.json');
const outputPath = resolveFromRoot(args.get('--out') ?? 'data/world-review/combined-zones-release-layer-ownership-20260808.json');
const contractPath = resolveFromRoot(args.get('--contract') ?? 'docs/masterplans/05-combined-zones/phase1-release-contract.json');
const layer = readJson(layerPath);
const contract = readJson(contractPath);
const errors = [];
const packageBounds = [];

for (const entry of layer.packages ?? []) {
  if (!entry.owner) errors.push({ package: entry.key, reason: 'explicit-construction-owner-missing' });
  if (!entry.forward || !entry.rollback) errors.push({ package: entry.key, reason: 'forward-rollback-pair-missing' });
  if (entry.forward?.targetCells !== entry.rollback?.targetCells) {
    errors.push({ package: entry.key, reason: 'forward-rollback-target-count-mismatch' });
  }
  if (entry.forward?.bounds) packageBounds.push({ key: entry.key, bounds: entry.forward.bounds });
}

const crossPackageIntersections = [];
for (let leftIndex = 0; leftIndex < packageBounds.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < packageBounds.length; rightIndex += 1) {
    const left = packageBounds[leftIndex];
    const right = packageBounds[rightIndex];
    if (boxesIntersect(left.bounds, right.bounds)) {
      crossPackageIntersections.push({
        left: left.key,
        right: right.key,
        reason: 'package-bounds-overlap-requires-exact-cell-interface-proof',
        leftBounds: left.bounds,
        rightBounds: right.bounds,
      });
    }
  }
}

const protectedOverlaps = [];
for (const entry of packageBounds) {
  for (const protectedSubject of loadProtectedBounds(contract)) {
    if (boxesIntersect(entry.bounds, protectedSubject.bounds)) {
      protectedOverlaps.push({ package: entry.key, protectedSubject: protectedSubject.id });
    }
  }
}
const complete = (
  ['RELEASE_LAYER_COMPILED_AWAITING_GATES', 'RELEASE_LAYER_COMPILED_PARTIAL_AS_BUILT'].includes(layer.status)
  && errors.length === 0
  && crossPackageIntersections.length === 0
  && protectedOverlaps.length === 0
);
const report = {
  schemaVersion: 1,
  id: 'combined-zones-release-layer-ownership-interface-audit',
  generatedAtUtc: new Date().toISOString(),
  status: complete ? 'PASS_EXACT_DECLARED_OWNER_ZERO_CONSERVATIVE_SEAM_OVERLAP_ZERO_PROTECTED_OVERLAP' : 'BLOCKED_OWNERSHIP_INTERFACE_GATE',
  passed: complete,
  layer: { path: relativeToRoot(layerPath), identitySha256: layer.layerIdentitySha256 ?? sha256Json(layer) },
  contract: { path: relativeToRoot(contractPath) },
  method: 'Package bounds are a conservative pre-gate. Any overlapping bounds are rejected until the exact cell/interface contract is supplied; this audit never turns a proposal envelope into ownership.',
  errors,
  crossPackageIntersections,
  protectedOverlaps,
  totals: {
    packages: layer.packages?.length ?? 0,
    owners: new Set((layer.packages ?? []).map((entry) => entry.owner).filter(Boolean)).size,
    crossPackageIntersections: crossPackageIntersections.length,
    protectedOverlaps: protectedOverlaps.length,
  },
};
writeJson(outputPath, report);
console.log(JSON.stringify({ status: report.status, output: relativeToRoot(outputPath), totals: report.totals }, null, 2));
process.exitCode = complete ? 0 : 1;
