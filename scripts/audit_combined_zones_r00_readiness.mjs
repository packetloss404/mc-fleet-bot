#!/usr/bin/env node
/**
 * Produce a deterministic, read-only R00 readiness audit for Masterplan 05.
 *
 * R00 is the nonphysical Phase 1 design freeze. This audit intentionally
 * evaluates G01-G07 only. It cannot emit operations or authorize a world edit,
 * and it rejects any attempt to use descendant release evidence to close G02.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-04T18:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-r00-readiness-audit.md',
));

const INPUTS = Object.freeze({
  authorityReconciliation: 'masterplans/04-combined-complex/authority-reconciliation.json',
  coordinateRegistry: 'masterplans/05-combined-zones/site-coordinates.json',
  phase0Evidence: 'masterplans/05-combined-zones/phase0-survey-evidence.json',
  releaseContract: 'masterplans/05-combined-zones/phase1-release-contract.json',
  designDecisions: 'masterplans/05-combined-zones/phase1-design-decisions.json',
  c1CivilDesign: 'masterplans/05-combined-zones/phase1-c1-civil-design.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  protectedRelicClearance: 'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  d05HydrologyRelicDesign: 'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  emptyEightGeologyDesign: 'masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  siteGateAudit: 'masterplans/05-combined-zones/phase1-site-gate-audit.json',
});

const DESCENDANT_EVIDENCE_PATTERN = /\b(operations?|source guards?|manifests?|preflights?|live[- ]entity|pilots?|execution|rollbacks?|route[- ]qa|post[- ]state)\b/i;

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
  };
}

function blocker(id, classification, requirement, evidencePath) {
  return { id, classification, requirement, evidencePath };
}

const sources = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);
const contract = readJson(INPUTS.releaseContract);
const decisions = readJson(INPUTS.designDecisions);
const c1 = readJson(INPUTS.c1CivilDesign);
const geometry = readJson(INPUTS.geometryCoordination);
const relics = readJson(INPUTS.protectedRelicClearance);
const d05 = readJson(INPUTS.d05HydrologyRelicDesign);
const d06 = readJson(INPUTS.emptyEightGeologyDesign);
const site = readJson(INPUTS.siteGateAudit);

const authorityBindingChecks = (contract.authorityBindings ?? []).map((expected) => {
  const filename = absolute(expected.path);
  const exists = fs.existsSync(filename) && fs.statSync(filename).isFile();
  const actualSha256 = exists ? sha256(fs.readFileSync(filename)) : null;
  return {
    path: expected.path,
    expectedSha256: expected.sha256,
    actualSha256,
    passed: exists && actualSha256 === expected.sha256,
  };
});

const closureChecks = [];
for (const decisionId of ['D02', 'D05', 'D06']) {
  const decision = decisions.decisions?.find((candidate) => candidate.id === decisionId);
  const values = decision?.closureEvidenceRequired ?? [];
  closureChecks.push({
    scope: `${decisionId}.closureEvidenceRequired`,
    descendantEvidenceMatches: values.filter((item) => DESCENDANT_EVIDENCE_PATTERN.test(item)),
  });
}
closureChecks.push(
  {
    scope: 'G06.passRule',
    descendantEvidenceMatches: DESCENDANT_EVIDENCE_PATTERN.test(
      relics.g06Disposition?.passRule ?? '',
    ) ? [relics.g06Disposition.passRule] : [],
  },
  {
    scope: 'D05.passRule',
    descendantEvidenceMatches: DESCENDANT_EVIDENCE_PATTERN.test(
      d05.d05Disposition?.passRule ?? '',
    ) ? [d05.d05Disposition.passRule] : [],
  },
  {
    scope: 'D06.designClosureHoldGates',
    descendantEvidenceMatches: (d06.d06?.designClosureHoldGates ?? [])
      .filter((item) => DESCENDANT_EVIDENCE_PATTERN.test(item)),
  },
  {
    scope: 'G03.geometryBlockerClosure',
    descendantEvidenceMatches: (geometry.blockerMatrix ?? [])
      .map((item) => item.closureEvidenceRequired)
      .filter((item) => DESCENDANT_EVIDENCE_PATTERN.test(item)),
  },
);

const descendantEvidenceCycleFree = closureChecks.every(
  (check) => check.descendantEvidenceMatches.length === 0,
);
const authorityPassed = authorityBindingChecks.length > 0
  && authorityBindingChecks.every((check) => check.passed)
  && contract.decisionResolutionBoundary?.g02Closure
    === 'PRE_R00_DESIGN_ACCEPTANCE_ONLY'
  && contract.decisionResolutionBoundary?.descendantReleaseEvidenceMayResolveG02 === false;

const decisionsPassed = decisions.summary?.phase1DecisionGatePassed === true
  && decisions.decisions?.every((decision) => decision.status === 'RESOLVED')
  && decisions.decisionPolicy?.g02ClosureBoundary === 'PRE_R00_DESIGN_ACCEPTANCE_ONLY'
  && descendantEvidenceCycleFree;

const gates = [
  {
    id: 'G01_AUTHORITY',
    status: authorityPassed ? 'PASS' : 'HOLD',
    evidence: [sources.authorityReconciliation, sources.releaseContract],
    blockers: authorityPassed ? [] : [
      blocker(
        'R00-G01-AUTHORITY-BINDING',
        'OFFLINE_ACTION',
        'Reconcile every declared authority binding and the pre-R00 G02 boundary.',
        INPUTS.releaseContract,
      ),
    ],
  },
  {
    id: 'G02_DESIGN_DECISIONS',
    status: decisionsPassed ? 'PASS' : 'HOLD',
    evidence: [sources.designDecisions, sources.c1CivilDesign,
      sources.d05HydrologyRelicDesign, sources.emptyEightGeologyDesign],
    blockers: decisionsPassed ? [] : [
      blocker(
        'R00-G02-D02-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Accept all six D02 geotechnical, structural/C01, hydraulic/outfall, visual, and quantity design packages.',
        INPUTS.c1CivilDesign,
      ),
      blocker(
        'R00-G02-D05-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Accept reviewed relic buffers, east-igloo disposition, hydrology ownership/interfaces, future terrain/influence model, and expert civil/geotechnical criteria.',
        INPUTS.d05HydrologyRelicDesign,
      ),
      blocker(
        'R00-G02-D06-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Survey and accept both exterior egress endpoints and the complete external life-safety, discharge, fire/service, and mechanism design.',
        INPUTS.emptyEightGeologyDesign,
      ),
      ...(!descendantEvidenceCycleFree ? [
        blocker(
          'R00-G02-DESCENDANT-EVIDENCE-CYCLE',
          'OFFLINE_ACTION',
          'Remove every G03-G19 dependency from pre-R00 decision and gate closure rules.',
          INPUTS.releaseContract,
        ),
      ] : []),
    ],
  },
  {
    id: 'G03_INTEGER_SET_OUT',
    status: 'HOLD',
    evidence: [sources.coordinateRegistry, sources.geometryCoordination],
    blockers: [
      blocker(
        'R00-G03-DESIGN-AUTHORITY-CHOICES',
        'EXTERNAL_EVIDENCE',
        `Close the ${geometry.blockerMatrix?.length ?? 0} frozen geometry blockers without inferring null elevations, child transforms, routes, solids, or interfaces.`,
        INPUTS.geometryCoordination,
      ),
      blocker(
        'R00-G03-CANONICAL-INTEGER-COMPILER',
        'OFFLINE_ACTION',
        'Implement the canonical integer setout compiler after the missing design-authority choices are accepted.',
        INPUTS.releaseContract,
      ),
    ],
  },
  {
    id: 'G04_OWNERSHIP',
    status: 'HOLD',
    evidence: [sources.geometryCoordination, sources.siteGateAudit],
    blockers: [
      blocker(
        'R00-G04-OWNER-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Accept one canonical owner for every proposed construction and interaction cell, including C01, hydrology, egress, surface, and sealed-interface scopes.',
        INPUTS.siteGateAudit,
      ),
      blocker(
        'R00-G04-OWNERSHIP-AUDIT',
        'OFFLINE_ACTION',
        'Implement the one-owner/no-overlap ownership audit over the accepted exact setout.',
        INPUTS.releaseContract,
      ),
    ],
  },
  {
    id: 'G05_INTERFACES',
    status: 'HOLD',
    evidence: [sources.geometryCoordination, sources.siteGateAudit],
    blockers: [
      blocker(
        'R00-G05-INTERFACE-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Accept exact C01, PassageWay, surface, hydrology, egress, child-plan, and sealed future-line interface contracts.',
        INPUTS.siteGateAudit,
      ),
      blocker(
        'R00-G05-GLOBAL-INTERFACE-GATE',
        'OFFLINE_ACTION',
        'Implement the exact default-deny global cross-scope interface audit after accepted cell sets exist.',
        INPUTS.releaseContract,
      ),
    ],
  },
  {
    id: 'G06_PROTECTED_FEATURES',
    status: relics.g06Disposition?.status === 'PASS' ? 'PASS' : 'HOLD',
    evidence: [sources.protectedRelicClearance, sources.phase0Evidence],
    blockers: relics.g06Disposition?.status === 'PASS' ? [] : [
      blocker(
        'R00-G06-RELIC-REVIEW',
        'EXTERNAL_EVIDENCE',
        'Accept reviewed positive buffers or evidence-backed zero-margin treatment, resolve the absent east igloo, and accept entrance/template treatment.',
        INPUTS.protectedRelicClearance,
      ),
      blocker(
        'R00-G06-EXACT-DESIGN-CLEARANCE',
        'OFFLINE_ACTION',
        'Intersect the final exact proposed construction/interaction sets against all 50 relevant structure starts and every accepted relic buffer.',
        INPUTS.protectedRelicClearance,
      ),
    ],
  },
  {
    id: 'G07_CIVIL_HYDROLOGY_STRUCTURE',
    status: 'HOLD',
    evidence: [sources.c1CivilDesign, sources.d05HydrologyRelicDesign,
      sources.emptyEightGeologyDesign],
    blockers: [
      blocker(
        'R00-G07-EXPERT-DESIGN-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Complete and accept the D02 civil/C01, D05 hydrology/relic, and D06 external life-safety engineering against one frozen design identity.',
        INPUTS.siteGateAudit,
      ),
      blocker(
        'R00-G07-INTEGRATED-DESIGN-CHECK',
        'OFFLINE_ACTION',
        'Run deterministic integrated civil, hydrology, structure, route-grade, and life-safety checks after the accepted design inputs exist.',
        INPUTS.releaseContract,
      ),
    ],
  },
];

const deferredEvidence = [
  blocker(
    'R00-DEFERRED-G08-G14-PRERELEASE',
    'DEFERRED_G08_G19',
    'Compiler reproducibility, manifest QA, fresh snapshot, preflight, strict parser checks, live entity clearance, and explicit authorization are required before R01 execution, not for R00 decision closure.',
    INPUTS.releaseContract,
  ),
  blocker(
    'R00-DEFERRED-G15-G19-EXECUTION-ACCEPTANCE',
    'DEFERRED_G08_G19',
    'Execution, immutable post/rollback preflight, functional and route QA, media/publication, and final acceptance validate R01 after R00 and cannot resolve G02.',
    INPUTS.releaseContract,
  ),
];
const blockerCountsByClassification = Object.fromEntries(
  ['OFFLINE_ACTION', 'EXTERNAL_EVIDENCE', 'DEFERRED_G08_G19'].map((classification) => [
    classification,
    [...gates.flatMap((gate) => gate.blockers), ...deferredEvidence]
      .filter((item) => item.classification === classification).length,
  ]),
);
const passCount = gates.filter((gate) => gate.status === 'PASS').length;
const holdCount = gates.length - passCount;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-r00-readiness-audit',
  generatedAtUtc: GENERATED_AT,
  status: holdCount === 0 ? 'R00_READY' : 'R00_HOLD',
  executable: false,
  worldEditAuthorized: false,
  operationCellCount: 0,
  authorityChain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
  releaseBoundary: {
    evaluatedReleaseId: 'CZ-R00-PHASE1-DESIGN-FREEZE',
    evaluatedGates: gates.map((gate) => gate.id),
    excludedAsDescendantEvidence: 'G08-G19',
    nextPhysicalReleaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
    nextPhysicalReleaseMayStart: false,
  },
  sourceBindings: sources,
  sequencingValidation: {
    g02ClosureBoundary: decisions.decisionPolicy?.g02ClosureBoundary,
    descendantEvidenceCycleFree,
    closureChecks,
    r01ValidationRole: contract.releaseSequence?.find(
      (release) => release.id === 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
    )?.validationRole,
  },
  authorityBindingChecks,
  gates,
  deferredEvidence,
  summary: {
    gateCount: gates.length,
    passCount,
    holdCount,
    r00Ready: holdCount === 0,
    blockerCountsByClassification,
    autonomousOfflineWorkMayContinue: true,
    autonomousOfflineWorkCanCompleteR00: false,
    nextAutonomousArtifact: 'T01/T02 compiler and ownership/interface audit scaffolds after this gate model',
    externalEvidenceStillRequired: true,
  },
};

const markdown = `# Combined Zones Phase 1 R00 readiness audit\n\n`
  + `Status: **${report.status} — READ-ONLY — ZERO OPERATIONS**\n\n`
  + `This audit evaluates only the nonphysical R00 design-freeze gates G01-G07. It does not use R01 pilot, execution, rollback, route-QA, or post-state evidence to close a design decision.\n\n`
  + `## Sequencing result\n\n`
  + `The evidence graph is cycle-free: **${descendantEvidenceCycleFree ? 'PASS' : 'FAIL'}**. The required order is D01-D07 design acceptance → R00 freeze → R01 physical validation → R02 eligibility.\n\n`
  + `## R00 gates\n\n`
  + `| Gate | Status | Current blockers |\n|---|---|---:|\n`
  + gates.map((gate) => `| ${gate.id} | **${gate.status}** | ${gate.blockers.length} |`).join('\n')
  + `\n\nG01 is ${authorityPassed ? 'ready from the current hash-bound authority chain' : 'not ready'}. G02-G07 remain fail-closed; the current evidence cannot autonomously complete R00.\n\n`
  + `## Blocking evidence\n\n`
  + gates.flatMap((gate) => gate.blockers.map((item) => (
    `- **${item.classification} · ${item.id}:** ${item.requirement}`
  ))).join('\n')
  + `\n\n## Deferred from R00\n\n`
  + report.deferredEvidence.map((item) => `- **${item.id}:** ${item.requirement}`).join('\n')
  + `\n\nNo live system was contacted, no block operation was emitted, and no world edit is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  passCount,
  holdCount,
  descendantEvidenceCycleFree,
  operationCellCount: 0,
}, null, 2)}\n`);
