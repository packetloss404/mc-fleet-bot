#!/usr/bin/env node
/** T01: bind explicit operation packages to Masterplan 05 without inventing blocks. */

import fs from 'fs';
import path from 'path';
import {
  ROOT,
  readJson,
  resolveFromRoot,
  relativeToRoot,
  sha256File,
  hashSnapshotDirectory,
  parseOperations,
  parseArgs,
  repeatedArg,
  sha256Json,
  writeJson,
} from './lib/combined_zones_release_layer.mjs';

const args = parseArgs(process.argv.slice(2));
const contractPath = resolveFromRoot(args.get('--contract') ?? 'docs/masterplans/05-combined-zones/phase1-release-contract.json');
const g03Path = resolveFromRoot(args.get('--g03') ?? 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json');
const snapshotPath = resolveFromRoot(args.get('--snapshot') ?? 'data/worldsnap/whole-build-complete-save-20260808/region');
const outputPath = resolveFromRoot(args.get('--out') ?? 'data/world-review/combined-zones-release-layer-20260808.json');
const manifestPaths = repeatedArg(args, '--package-manifest').map(resolveFromRoot);
const defaultManifests = [
  'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
  'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  'data/buildops/combined-zones-r05-mountain.release-manifest.json',
  'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
].map(resolveFromRoot);
const selectedManifests = manifestPaths.length > 0 ? manifestPaths : defaultManifests;
const partialAsBuilt = args.get('--partial') === true;
const packageScopeByKey = {
  'b03-jcurve': 'P1-B03',
  'b07-shaft': 'P1-B07',
  'b08-service-tunnel': 'P1-B08',
  'd06-reservations': 'D06-RESERVATIONS',
  'd06-mechanisms': 'D06-MECHANISMS',
  'b10-bulk': 'P1-B10',
  'b10-finish': 'P1-B10',
  'wet-liner': 'D02',
  'b11-support': 'P1-B11',
};

function recordBinding(filename, role) {
  return { path: relativeToRoot(filename), sha256: sha256File(filename), role };
}

const contract = readJson(contractPath);
const g03 = readJson(g03Path);
const sourceSnapshot = hashSnapshotDirectory(snapshotPath);
const scopeIds = new Set((g03.scopeRegistry ?? []).map((entry) => entry.scopeId));
const packages = [];
const errors = [];
const coveredScopes = new Set();

for (const manifestPath of selectedManifests) {
  if (!fs.existsSync(manifestPath)) {
    errors.push({ manifest: relativeToRoot(manifestPath), reason: 'missing-package-manifest' });
    continue;
  }
  const manifest = readJson(manifestPath);
  const packageEntries = Array.isArray(manifest.packages) ? manifest.packages : [];
  if (packageEntries.length === 0) {
    errors.push({ manifest: relativeToRoot(manifestPath), reason: 'manifest-has-no-packages' });
    continue;
  }
  for (const entry of packageEntries) {
    const forwardPath = resolveFromRoot(entry.forward);
    const rollbackPath = resolveFromRoot(entry.rollback);
    const packageErrors = [];
    if (!fs.existsSync(forwardPath)) packageErrors.push('missing-forward');
    if (!fs.existsSync(rollbackPath)) packageErrors.push('missing-rollback');
    let forward = null;
    let rollback = null;
    if (packageErrors.length === 0) {
      try {
        forward = parseOperations(forwardPath, { retainBoxes: false });
        rollback = parseOperations(rollbackPath, { retainBoxes: false });
      } catch (error) {
        packageErrors.push(error.message);
      }
    }
    const scopeId = manifest.scope?.domain?.split('/', 1)[0]
      ?? packageScopeByKey[entry.key]
      ?? null;
    const domain = manifest.scope?.domain ?? (scopeId ? `${scopeId}/construction` : null);
    if (scopeId && scopeIds.has(scopeId)) coveredScopes.add(scopeId);
    packages.push({
      key: entry.key,
      owner: entry.owner ?? null,
      scopeId,
      domain,
      manifest: recordBinding(manifestPath, 'release manifest'),
      forward: forward ? {
        path: forward.path,
        sha256: forward.sha256,
        replGroups: forward.replGroups,
        commandGroups: forward.commandGroups,
        targetCells: forward.targetCells,
        bounds: forward.bounds,
      } : null,
      rollback: rollback ? {
        path: rollback.path,
        sha256: rollback.sha256,
        replGroups: rollback.replGroups,
        commandGroups: rollback.commandGroups,
        targetCells: rollback.targetCells,
        bounds: rollback.bounds,
      } : null,
      packageStatus: manifest.status ?? null,
      errors: packageErrors,
    });
  }
}

const missingScopes = [...scopeIds]
  .filter((scopeId) => !coveredScopes.has(scopeId))
  .map((scopeId) => ({ scopeId, reason: 'no-explicit-operation-package-bound' }));
const status = errors.length === 0 && missingScopes.length === 0
  ? 'RELEASE_LAYER_COMPILED_AWAITING_GATES'
  : partialAsBuilt && errors.length === 0
    ? 'RELEASE_LAYER_COMPILED_PARTIAL_AS_BUILT'
    : 'RELEASE_LAYER_COMPILED_BUILD_BLOCKED';
const layer = {
  schemaVersion: 1,
  id: 'combined-zones-masterplan-release-layer',
  generatedAtUtc: new Date().toISOString(),
  status,
  executable: false,
  worldEditAuthorized: false,
  sourcePolicy: 'T01 binds only explicit, complete operation pairs; it never derives desired blocks from proposal geometry or missing material maps.',
  bindings: {
    contract: recordBinding(contractPath, 'controlling release contract'),
    g03: recordBinding(g03Path, 'canonical integer proposal registry'),
    sourceSnapshot: { path: relativeToRoot(snapshotPath), ...sourceSnapshot },
  },
  packages,
  missingScopes,
  errors,
  gates: {
    T01: status === 'RELEASE_LAYER_COMPILED_AWAITING_GATES' ? 'PASS_EXPLICIT_PACKAGES_BOUND' : 'BLOCKED_MISSING_EXPLICIT_OPERATION_INPUTS',
    T02: 'PENDING_RUN_OWNERSHIP_INTERFACE_GATE',
    T03: 'BLOCKED_NO_EXTERNAL_HASH_BOUND_AUTHORIZATION',
    T04: 'PENDING_POST_SNAPSHOT_AND_EXECUTION_LEDGER',
  },
  totals: {
    proposalScopes: scopeIds.size,
    coveredScopes: coveredScopes.size,
    missingScopes: missingScopes.length,
    packages: packages.length,
    operationTargetCells: packages.reduce((sum, entry) => sum + (entry.forward?.targetCells ?? 0), 0),
  },
};
layer.layerIdentitySha256 = sha256Json(layer);
writeJson(outputPath, layer);
console.log(JSON.stringify({ status, output: relativeToRoot(outputPath), totals: layer.totals }, null, 2));
process.exitCode = status.endsWith('BLOCKED') ? 1 : 0;
