#!/usr/bin/env node
/**
 * Combined Zones blocker doctor.
 *
 * This command repeatedly performs every safe, mechanical remediation step:
 * contract inspection, release-layer compilation, ownership-gate evaluation,
 * and as-built verification for already committed packages. It never changes
 * the authoritative contract, invents materials, signs an authorization, or
 * executes Minecraft operations. Its output is the handoff for the remaining
 * owner/engineering decisions.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  readJson,
  resolveFromRoot,
  relativeToRoot,
  sha256File,
  writeJson,
} from './lib/combined_zones_release_layer.mjs';

const OUT = resolveFromRoot(process.argv.slice(2).includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'data/world-review/combined-zones-blocker-remediation-20260808.json');
const LAYER = resolveFromRoot('data/world-review/combined-zones-release-layer-20260808.json');
const OWNERSHIP = resolveFromRoot('data/world-review/combined-zones-release-layer-ownership-20260808.json');
const B03_LAYER = resolveFromRoot('data/world-review/combined-zones-as-built-b03-layer-20260808.json');
const B03_OWNERSHIP = resolveFromRoot('data/world-review/combined-zones-as-built-b03-ownership-20260808.json');
const B03_VERIFICATION = resolveFromRoot('data/world-review/combined-zones-as-built-b03-verification-20260808.json');
const DECISION_PACKET = resolveFromRoot('data/world-review/combined-zones-decision-closure-packet-20260808.json');
const B03_MANIFEST = resolveFromRoot('data/buildops/whole-build-r03-b03-current-safe-2026-08-08.release-manifest.json');
const B03_POST = resolveFromRoot('data/worldsnap/whole-build-live-post-b03-20260808/region');

function command(label, argv) {
  const result = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, encoding: 'utf8' });
  return {
    label,
    command: argv.join(' '),
    passed: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout?.slice(-4000) ?? '',
    stderr: result.stderr?.slice(-4000) ?? '',
  };
}

function runMechanicalActions() {
  const actions = [];
  actions.push(command('T01 full release-layer compilation', [
    'node', 'scripts/compile_combined_zones_release_layer.mjs',
    '--out', relativeToRoot(LAYER),
  ]));
  actions.push(command('T02 full ownership/interface gate', [
    'node', 'scripts/audit_combined_zones_release_layer_ownership.mjs',
    '--layer', relativeToRoot(LAYER), '--out', relativeToRoot(OWNERSHIP),
  ]));
  actions.push(command('D02/D05/D06 decision closure packet', [
    'node', 'scripts/generate_combined_zones_decision_closure_packet.mjs',
  ]));
  if (fs.existsSync(B03_MANIFEST) && fs.existsSync(B03_POST)) {
    actions.push(command('T01 B03 as-built partial binding', [
      'node', 'scripts/compile_combined_zones_release_layer.mjs', '--partial',
      '--package-manifest', relativeToRoot(B03_MANIFEST),
      '--snapshot', relativeToRoot(resolveFromRoot('data/worldsnap/whole-build-complete-save-20260808/region')),
      '--out', relativeToRoot(B03_LAYER),
    ]));
    actions.push(command('T02 B03 as-built ownership gate', [
      'node', 'scripts/audit_combined_zones_release_layer_ownership.mjs',
      '--layer', relativeToRoot(B03_LAYER), '--out', relativeToRoot(B03_OWNERSHIP),
    ]));
    actions.push(command('T04 B03 as-built verification', [
      'node', 'scripts/verify_combined_zones_as_built.mjs',
      '--layer', relativeToRoot(B03_LAYER),
      '--post-snapshot', relativeToRoot(B03_POST),
      '--out', relativeToRoot(B03_VERIFICATION),
      '--preflight-dir', relativeToRoot(resolveFromRoot('data/world-review/combined-zones-as-built-b03-verification-20260808')),
    ]));
  }
  return actions;
}

const actions = runMechanicalActions();
const validator = command('authoritative contract validator', [
  'node', 'scripts/validate_combined_zones_release_contract.mjs',
]);
let layer = fs.existsSync(LAYER) ? readJson(LAYER) : null;
let ownership = fs.existsSync(OWNERSHIP) ? readJson(OWNERSHIP) : null;
let b03Verification = fs.existsSync(B03_VERIFICATION) ? readJson(B03_VERIFICATION) : null;

const toolFiles = {
  T01: 'scripts/compile_combined_zones_release_layer.mjs',
  T02: 'scripts/audit_combined_zones_release_layer_ownership.mjs',
  T03: 'scripts/run_combined_zones_release_layer.mjs',
  T04: 'scripts/verify_combined_zones_as_built.mjs',
};
const tooling = Object.fromEntries(Object.entries(toolFiles).map(([id, filename]) => {
  const absolute = resolveFromRoot(filename);
  return [id, { path: filename, exists: fs.existsSync(absolute), sha256: fs.existsSync(absolute) ? sha256File(absolute) : null }];
}));

const decisionRequirements = [
  {
    id: 'D02_C1_CIVIL_ALIGNMENT',
    requiredInputs: ['accepted C1 alignment/profile', 'geotechnical and structural criteria', 'hydraulic/outfall ownership', 'formation and mass-haul quantities'],
    nextArtifact: 'phase1-d02-c1-owner-acceptance.json',
  },
  {
    id: 'D05_MOUNTAIN_HYDROLOGY_RELIC_BUFFERS',
    requiredInputs: ['approved relic buffers', 'hydrology owner/interface map', 'future terrain/influence model', 'preservation and no-diversion criteria'],
    nextArtifact: 'phase1-d05-hydrology-relic-owner-acceptance.json',
  },
  {
    id: 'D06_EMPTY_EIGHT_DETAIL',
    requiredInputs: ['accepted internal mechanism design', 'surveyed exterior endpoints', 'two accessible egress routes', 'smoke/ventilation, drainage, fire/service, barrier, lift, and emergency-power criteria'],
    nextArtifact: 'phase1-d06-empty-eight-owner-acceptance.json',
  },
];
const remaining = {
  missingOperationScopes: layer?.missingScopes ?? [],
  ownershipGate: ownership ? {
    status: ownership.status,
    explicitOwnerCount: ownership.totals?.owners ?? 0,
    crossPackageIntersections: ownership.totals?.crossPackageIntersections ?? null,
    protectedOverlaps: ownership.totals?.protectedOverlaps ?? null,
  } : null,
  decisions: decisionRequirements,
  authorization: 'Requires an external hash-bound authorization; the system cannot self-issue it.',
};
const report = {
  schemaVersion: 1,
  id: 'combined-zones-blocker-remediation',
  generatedAtUtc: new Date().toISOString(),
  status: b03Verification?.status === 'PASS_AS_BUILT_POST_SNAPSHOT_AND_ROLLBACK_PREFLIGHT'
    ? 'MECHANICAL_REMEDIATION_COMPLETE_OFFICIAL_RELEASE_STILL_BLOCKED'
    : 'MECHANICAL_REMEDIATION_INCOMPLETE',
  policy: 'Mechanical evidence is automated; owner decisions and authorization remain explicit and cannot be bypassed.',
  authoritativeValidator: validator,
  tooling,
  actions,
  artifacts: {
    fullLayer: fs.existsSync(LAYER) ? { path: relativeToRoot(LAYER), status: layer?.status } : null,
    fullOwnership: fs.existsSync(OWNERSHIP) ? { path: relativeToRoot(OWNERSHIP), status: ownership?.status } : null,
    b03AsBuilt: fs.existsSync(B03_VERIFICATION) ? { path: relativeToRoot(B03_VERIFICATION), status: b03Verification?.status } : null,
    decisionClosurePacket: fs.existsSync(DECISION_PACKET) ? { path: relativeToRoot(DECISION_PACKET), status: readJson(DECISION_PACKET).status } : null,
  },
  remaining,
};
writeJson(OUT, report);
console.log(JSON.stringify({ status: report.status, output: relativeToRoot(OUT), tooling, remaining }, null, 2));
