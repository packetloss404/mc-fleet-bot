#!/usr/bin/env node
/** Build a concrete D02/D05/D06 closure packet from existing evidence. */

import crypto from 'crypto';
import {
  ROOT,
  resolveFromRoot,
  relativeToRoot,
  readJson,
  sha256File,
  writeJson,
} from './lib/combined_zones_release_layer.mjs';

const out = resolveFromRoot('data/world-review/combined-zones-decision-closure-packet-20260808.json');
const docs = 'docs/masterplans/05-combined-zones';
const sourceNames = [
  'phase1-design-decisions.json',
  'phase1-c1-civil-design.json',
  'phase1-d05-conservative-defaults.json',
  'phase1-d05-hydrology-relic-buffer-design.json',
  'phase1-d06-egress-geometry-design.json',
  'phase1-d06-detailed-mechanism-setout.json',
  'phase1-d06-mechanisms.json',
  'phase1-owner-controlled-decisions.json',
];
const sources = Object.fromEntries(sourceNames.map((name) => {
  const filename = resolveFromRoot(`${docs}/${name}`);
  return [name, { path: relativeToRoot(filename), sha256: sha256File(filename) }];
}));
const c1 = readJson(resolveFromRoot(`${docs}/phase1-c1-civil-design.json`));
const d05 = readJson(resolveFromRoot(`${docs}/phase1-d05-conservative-defaults.json`));
const d06 = readJson(resolveFromRoot(`${docs}/phase1-d06-egress-geometry-design.json`));
const mechanisms = readJson(resolveFromRoot(`${docs}/phase1-d06-mechanisms.json`));

const packet = {
  schemaVersion: 1,
  id: 'combined-zones-d02-d05-d06-decision-closure-packet',
  generatedAtUtc: new Date().toISOString(),
  status: 'READY_FOR_EXPLICIT_OWNER_AND_DISCIPLINE_REVIEW_NOT_ACCEPTED',
  worldEditAuthorized: false,
  purpose: 'Turn the three unresolved decisions into bounded acceptance inputs; this packet does not self-resolve them or authorize construction.',
  sourceBindings: sources,
  recommendations: {
    D02_C1_CIVIL_ALIGNMENT: {
      recommendedDisposition: 'ACCEPT_GEOMETRY_AS_DESIGN_BASIS_ONLY; HOLD_CONSTRUCTION_UNTIL_CLOSURE_EVIDENCE',
      exactDesignBasis: {
        horizontalAlignment: c1.horizontalAlignment,
        verticalProfiles: c1.verticalProfiles,
        crossSection: c1.crossSection,
      },
      unresolvedClosure: c1.decisionD02.blockers,
      acceptanceRule: 'All six D02 blockers must have bound evidence and independent review. No descendant release evidence may close D02.',
    },
    D05_MOUNTAIN_HYDROLOGY_RELIC_BUFFERS: {
      recommendedDisposition: 'ADOPT_ONE_CELL_MINIMUM_PLANNING_EXCLUSIONS; DEFAULT_DENY_ALL_UNREVIEWED_INFLUENCE',
      bufferPolicy: d05.soleAuthorityRecommendations?.bufferPolicy ?? null,
      logicalOwners: d05.soleAuthorityRecommendations?.logicalOwnershipAndInterfaces ?? null,
      acceptanceRule: 'Approve exact relic shells, hydrology owner/interfaces, future influence cells, and no-diversion criteria before any D05 physical package.',
    },
    D06_EMPTY_EIGHT_DETAIL: {
      recommendedDisposition: 'ADOPT_TWO_DISJOINT_EGRESS_CORES; KEEP_MECHANISMS_SEALED_UNCOMMISSIONED',
      basis: d06.soleAuthorityRecommendations?.d06 ?? null,
      mechanismSummary: mechanisms.summary ?? null,
      acceptanceRule: 'Freeze exact mechanism/control/power/ownership/interface cell sets and commissioning tests; null or unaccepted mechanisms remain sealed and are not buildable.',
    },
  },
  requiredReviewFields: [
    'reviewer identity and discipline',
    'accepted/rejected/revise disposition per decision',
    'exact evidence paths and SHA-256 identities',
    'owner/interface assignments',
    'explicit statement that no descendant physical release evidence resolves D02/D05/D06',
  ],
  nextMechanicalStepsAfterAcceptance: [
    'compile missing P1-B09 and P1-B12 operation packages from explicit material maps',
    'rerun exact global ownership/interface gate',
    'compile deterministic forward/rollback manifests',
    'capture a fresh complete immutable source snapshot',
    'run G08-G14 and obtain external hash-bound authorization',
  ],
};
packet.packetIdentitySha256 = crypto.createHash('sha256').update(`${JSON.stringify(packet)}\n`).digest('hex');
writeJson(out, packet);
console.log(JSON.stringify({ status: packet.status, output: relativeToRoot(out), packetIdentitySha256: packet.packetIdentitySha256 }, null, 2));
