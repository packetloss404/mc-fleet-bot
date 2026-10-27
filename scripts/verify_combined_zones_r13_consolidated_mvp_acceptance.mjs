#!/usr/bin/env node
/**
 * Read-only R13 consolidated MVP acceptance verifier.
 *
 * This tool never connects to Minecraft or another service. It verifies and
 * hashes the accepted local evidence that exists, then reports PASS or WAITING
 * for G16-G19 without treating an absent future deliverable as a failed live
 * release. Physical build operation files are inputs only through their sealed
 * post-release evidence; this verifier never opens or changes canonical ops.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-22T04:45:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r13-consolidated-mvp-acceptance-20260822T044500Z',
);
const OUT = value('--out', `${EVIDENCE_DIR}/r13-current-readiness.json`);
const MARKDOWN = value('--markdown', `${EVIDENCE_DIR}/r13-current-readiness.md`);
const CONTRACT_PATH = value(
  '--release-contract',
  'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);
const CURRENT_STATE_PATH = value(
  '--current-state',
  'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
);
const R10_CLOSURE_PATH = value(
  '--r10-closure',
  'data/world-review/combined-zones-r10-mvp-closure/r10-mvp-closure.json',
);
const R11_CLOSURE_PATH = value(
  '--r11-closure',
  'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.json',
);
const R12_COMMISSIONING_PATH = value(
  '--r12-commissioning',
  'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json',
);
const PUBLICATION_ROOT = value(
  '--publication-root',
  'data/world-review/combined-zones-r13-mvp-publication',
);
const PUBLICATION_MODE = value('--publication-mode', 'current');

const R13_NODE_ID = 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE';
const REQUIRED_RELEASE_NODES = Object.freeze([
  'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
  'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
  'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
  'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
  'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
]);
const REQUIRED_GATES = Object.freeze([
  'G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT',
  'G17_FUNCTIONAL_POST_QA',
  'G18_MEDIA_AND_PUBLICATION',
  'G19_FINAL_ACCEPTANCE',
]);
const DEFERRED_SCOPES = Object.freeze([
  'P1-B12',
  'C2',
  'C3',
  'eight future Empty Eight line openings',
]);

// Closure-critical evidence is deliberately explicit. Earlier successful
// releases remain provenance, but these files bind the accepted terminal or
// functional state needed to evaluate each R13 dependency without pretending
// that prose alone is package acceptance.
const PHASES = Object.freeze([
  {
    id: REQUIRED_RELEASE_NODES[0],
    label: 'R07 bounded surface/framework architecture',
    evidence: [
      ['R07A', 'data/world-review/combined-zones-r07a-live-20260821T154500Z/r07a-post-release-qa.json', ['G16', 'G17']],
      ['R07B', 'data/world-review/combined-zones-r07b-live-20260821T161500Z/r07b-post-release-qa.json', ['G16', 'G17']],
      ['R07C retry', 'data/world-review/combined-zones-r07c-retry-live-20260821T162026Z/r07c-post-release-qa.json', ['G16', 'G17']],
      ['R07D', 'data/world-review/combined-zones-r07d-live-20260821T164505Z/r07d-post-release-qa.json', ['G16', 'G17']],
      ['R07E', 'data/world-review/combined-zones-r07e-live-20260821T170500Z/r07e-post-release-qa.json', ['G16', 'G17']],
      ['R07F', 'data/world-review/combined-zones-r07f-live-20260821T172700Z/r07f-post-release-qa.json', ['G16', 'G17']],
      ['R07G', 'data/world-review/combined-zones-r07g-live-20260821T181527Z/r07g-post-release-qa.json', ['G16', 'G17']],
      ['R07H', 'data/world-review/combined-zones-r07h-live-20260821T183544Z/r07h-post-release-qa.json', ['G16', 'G17']],
      ['R07I', 'data/world-review/combined-zones-r07i-live-20260821T190347Z/r07i-post-release-qa.json', ['G16', 'G17']],
      ['R07J', 'data/world-review/combined-zones-r07j-live-20260821T193306Z/r07j-post-release-qa.json', ['G16', 'G17']],
      ['R07K', 'data/world-review/combined-zones-r07k-live-20260821T195128Z/r07k-post-release-qa.json', ['G16', 'G17']],
    ],
    closure: {
      accepted: true,
      basis: 'The authoritative ledger explicitly marks R07 architecture complete after accepted R07A-R07K post QA.',
    },
  },
  {
    id: REQUIRED_RELEASE_NODES[1],
    label: 'R08 Empty Eight bounded static MVP fit-out',
    evidence: [
      ['PF03 / R08A', 'data/world-review/combined-zones-r08a-live-20260821T161558Z/r08a-post-release-qa.json', ['G16', 'G17']],
      ['PF08 / R08B', 'data/world-review/combined-zones-r08b-live-20260821T162429Z/r08b-post-release-qa.json', ['G16', 'G17']],
      ['PF02 / R08C', 'data/world-review/combined-zones-r08c-live-20260821T163421Z/r08c-post-release-qa.json', ['G16', 'G17']],
      ['PF04 / R08E', 'data/world-review/combined-zones-r08e-live-20260821T165400Z/r08e-post-release-qa.json', ['G16', 'G17']],
      ['PF07 / R08G', 'data/world-review/combined-zones-r08g-live-20260821T170100Z/r08g-post-release-qa.json', ['G16', 'G17']],
      ['PF06 / R08I', 'data/world-review/combined-zones-r08i-live-20260821T171300Z/r08i-post-release-qa.json', ['G16', 'G17']],
      ['PF05 / R08K', 'data/world-review/combined-zones-r08k-live-20260821T172400Z/r08k-post-release-qa.json', ['G16', 'G17']],
      ['PF01 / R08M', 'data/world-review/combined-zones-r08m-live-20260821T174621Z/r08m-post-release-qa.json', ['G16', 'G17']],
      ['23 capped retail shells / R08S', 'data/world-review/combined-zones-r08s-live-20260821T191247Z/r08s-post-release-qa.json', ['G16', 'G17']],
      ['south passive smoke plane / R08T', 'data/world-review/combined-zones-r08t-live-20260821T194152Z/r08t-post-release-qa.json', ['G16', 'G17']],
      ['passive vent caps / R08U', 'data/world-review/combined-zones-r08u-live-20260821T201019Z/r08u-post-release-qa.json', ['G16', 'G17']],
      ['EG-B terminal static package / R08AJ', 'data/world-review/combined-zones-r08aj-live-20260822T024118Z/r08aj-post-release-qa.json', ['G16', 'G17']],
      ['R08 static gap screen', 'data/world-review/combined-zones-r08ak-empty-eight-static-readiness-gap-screen-20260822T025000Z/r08ak-empty-eight-static-readiness-gap-screen.json', ['G17']],
    ],
    closure: {
      accepted: true,
      basis: 'The R08AK source-proven screen finds no further non-cosmetic static package. Its exact N06, wet/gravity, riser, and sealed-stub residuals remain local and do not open or commission those interfaces.',
    },
  },
  {
    id: REQUIRED_RELEASE_NODES[2],
    label: 'R09 bounded public-core circulation',
    evidence: [
      ['lower circulation / R09D', 'data/world-review/combined-zones-r09d-live-20260821T181124Z/r09d-post-release-qa.json', ['G16', 'G17']],
      ['upper isolation cap / R09J', 'data/world-review/combined-zones-r09j-live-20260822T025021Z/r09j-post-release-qa.json', ['G16', 'G17']],
      ['bounded upper commissioning / R09K', 'data/world-review/combined-zones-r09j-live-20260822T025021Z/r09k-b07-bounded-upper-route-commissioning-seal.json', ['G17']],
    ],
    closure: {
      accepted: true,
      basis: 'R09K closes the R09 MVP physical lane as bounded passive internal circulation to explicit wet, exterior, gravity, and mechanism holds.',
    },
  },
  {
    id: REQUIRED_RELEASE_NODES[3],
    label: 'R10 secure/summit bounded fit-out',
    evidence: [
      ['Cheyenne liner / R10A', 'data/world-review/combined-zones-r10a-live-20260821T163935Z/r10a-post-release-qa.json', ['G16', 'G17']],
      ['B09 curve/summit wayfinding / R10F', 'data/world-review/combined-zones-r10f-live-20260822T003320Z/r10f-post-release-qa.json', ['G16', 'G17']],
      ['B03 institutional liner / R10G', 'data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json', ['G16', 'G17']],
      ['B03 lighting / R10H', 'data/world-review/combined-zones-r10h-live-20260822T035805Z/r10h-post-release-qa.json', ['G16', 'G17']],
      ['Cheyenne bounded circulation / R12A', 'data/world-review/combined-zones-r12a-cheyenne-gallery-commissioning-20260821T165900Z/r12a-commissioning.json', ['G17']],
      ['B03 complete enclosed circulation / R12O', 'data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z/r12o-commissioning.json', ['G17']],
    ],
    closure: {
      evidencePath: R10_CLOSURE_PATH,
      basis: 'Accepted artifacts prove substantial bounded fit-out and internal circulation, but no explicit R10 MVP phase-close or accepted residual disposition exists. Secure/public access, controls, and active mechanisms remain nonclaims.',
      nextEvidence: 'A read-only R10 MVP closure/residual seal bound to the latest accepted post; no new physical work is implied unless that verifier finds an exact required gap.',
    },
  },
  {
    id: REQUIRED_RELEASE_NODES[4],
    label: 'R11 C1 multimodal/highway corridor',
    evidence: [
      ['R11A', 'data/world-review/combined-zones-r11a-live-20260821T170600Z/r11a-post-release-qa.json', ['G16', 'G17']],
      ['R11B', 'data/world-review/combined-zones-r11b-live-20260821T173605Z/r11b-post-release-qa.json', ['G16', 'G17']],
      ['R11C', 'data/world-review/combined-zones-r11c-live-20260821T185813Z/r11c-post-release-qa.json', ['G16', 'G17']],
      ['R11D', 'data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.json', ['G16', 'G17']],
      ['R11E retry-v2', 'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/r11e-retry-v2-post-release-qa.json', ['G16', 'G17']],
      ['R11F', 'data/world-review/combined-zones-r11f-live-20260821T234824Z/r11f-post-release-qa.json', ['G16', 'G17']],
      ['R11H retry-v2', 'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json', ['G16', 'G17']],
      ['R11I', 'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-post-release-qa.json', ['G16', 'G17']],
      ['R11J execution/rollback ledger', 'data/world-review/combined-zones-r11j-live-20260822T041217Z/evidence-ledger.json', ['G16'], 'ledger'],
      ['R11J independent functional post QA', 'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-post-release-qa.json', ['G17']],
      ['R11K execution/rollback ledger', 'data/world-review/combined-zones-r11k-live-20260822T043931Z/evidence-ledger.json', ['G16'], 'ledger'],
      ['R11K independent functional post QA', 'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-post-release-qa.json', ['G17']],
    ],
    closure: {
      evidencePath: R11_CLOSURE_PATH,
      basis: 'R11K terminal execution and independent post QA are accepted, but no bounded C1 MVP corridor acceptance/retained-hold seal is yet bound.',
      nextEvidence: 'Issue a read-only C1 MVP closure seal that states exactly which built components are commissioned and which rail, wet, sheep, cut, bridge, or treatment ranges remain held.',
    },
  },
  {
    id: REQUIRED_RELEASE_NODES[5],
    label: 'R12 internal transport commissioning',
    evidence: [
      ['Cheyenne bounded circulation / R12A', 'data/world-review/combined-zones-r12a-cheyenne-gallery-commissioning-20260821T165900Z/r12a-commissioning.json', ['G16', 'G17']],
      ['B09 static readiness / R12B', 'data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z/r12b-readiness.json', ['G16', 'G17']],
      ['B09 rail origin / R12C', 'data/world-review/combined-zones-r12c-live-20260822T004255Z/r12c-post-release-qa.json', ['G16', 'G17']],
      ['B09 continuous rail 261..499 / R12N', 'data/world-review/combined-zones-r12n-live-20260822T040651Z/r12n-post-release-qa.json', ['G16', 'G17']],
      ['B03 complete enclosed circulation / R12O', 'data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z/r12o-commissioning.json', ['G16', 'G17']],
      ['B09 bounded transport commissioning', R12_COMMISSIONING_PATH, ['G17']],
    ],
    closure: {
      evidencePath: R12_COMMISSIONING_PATH,
      requireCommissioningStatus: true,
      basis: 'R12A/R12O commission passive internal circulation and R12N proves passive rail topology, but every accepted B09 rail artifact explicitly says transport is not commissioned.',
      nextEvidence: 'A bounded source-proven R12 transport commissioning seal with the required functional system, or an explicit contract-level MVP disposition that excludes active transport without overclaiming it.',
    },
  },
]);

const PUBLICATION_REQUIREMENTS = Object.freeze([
  {
    id: 'terminal-accepted-post',
    path: `${PUBLICATION_ROOT}/terminal-post-acceptance.json`,
    requirement: 'One terminal immutable post accepted after all required R07-R12 physical packages.',
  },
  {
    id: 'matched-media',
    path: `${PUBLICATION_ROOT}/matched-media-manifest.json`,
    requirement: 'Matched capture/media manifest bound to that exact terminal post.',
  },
  {
    id: 'terminal-map-qa',
    path: `${PUBLICATION_ROOT}/terminal-map-qa.json`,
    requirement: 'Map QA bound to the same terminal post, not the historical Phase 0 terrain snapshot.',
  },
  {
    id: 'database-import-verification',
    path: `${PUBLICATION_ROOT}/database-import-verification.json`,
    requirement: 'Independent verification of the consolidated database import.',
  },
  {
    id: 'publication-manifest',
    path: `${PUBLICATION_ROOT}/publication-manifest.json`,
    requirement: 'Publication manifest binding the terminal post, media, map QA, and import verification.',
  },
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const stablePayloadHash = (valueToHash) => sha256(Buffer.from(`${JSON.stringify(valueToHash, null, 2)}\n`));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R13 verifier rejected: ${message}`);
};
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const statusLooksAccepted = (record) => {
  if (!record || typeof record !== 'object') return false;
  if (record.summary?.passed === false || record.passed === false) return false;
  return typeof record.status === 'string' && record.status.startsWith('PASS');
};

const contract = readJson(CONTRACT_PATH);
const r13 = contract.releaseSequence?.find(({ id }) => id === R13_NODE_ID);
invariant(r13, `${R13_NODE_ID} is absent from the release contract`);
invariant(JSON.stringify(r13.dependsOn) === JSON.stringify(REQUIRED_RELEASE_NODES),
  'R13 dependency nodes drifted');
invariant(JSON.stringify(r13.requiredGates) === JSON.stringify(REQUIRED_GATES),
  'R13 G16-G19 requirements drifted');
invariant(JSON.stringify(r13.excludesDeferredScopes) === JSON.stringify(DEFERRED_SCOPES),
  'R13 deferred-scope exclusions drifted');
invariant(contract.advancementRule?.zeroFailedGatesRequired === true
  && contract.advancementRule?.zeroMissingGatesRequired === true
  && contract.advancementRule?.zeroStaleGatesRequired === true
  && contract.advancementRule?.allowManualOverride === false,
'release-contract final advancement rule drifted');
invariant(['current', 'prepublication'].includes(PUBLICATION_MODE),
  '--publication-mode must be current or prepublication');

const currentState = fs.readFileSync(absolute(CURRENT_STATE_PATH), 'utf8');
invariant(currentState.includes('R07 ARCHITECTURE COMPLETE'),
  'authoritative ledger no longer carries the R07 completion disposition');
invariant(currentState.includes('R09 MVP PHYSICAL LANE CLOSED'),
  'authoritative ledger no longer carries the bounded R09 lane disposition');

function evaluateEvidence([label, filename, gates, kind = 'acceptance']) {
  if (!fs.existsSync(absolute(filename))) {
    return {
      label, path: relative(filename), gates, kind, status: 'WAITING', exists: false,
      reason: 'Required acceptance evidence does not exist at this path.',
    };
  }
  const fileBinding = binding(filename);
  let record;
  try {
    record = readJson(filename);
  } catch (error) {
    return {
      label,
      path: fileBinding.path,
      sha256: fileBinding.sha256,
      bytes: fileBinding.bytes,
      gates,
      kind,
      status: 'WAITING',
      exists: true,
      reason: `Evidence is not valid JSON: ${error.message}`,
    };
  }
  if (kind === 'ledger') {
    const rollbackBindings = record.rollbackPoststatePreflights ?? [];
    const rollbackFilesValid = rollbackBindings.length > 0 && rollbackBindings.every((item) => {
      if (!item?.path || !item?.sha256 || !fs.existsSync(absolute(item.path))) return false;
      return binding(item.path).sha256 === item.sha256;
    });
    const accepted = record.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
      && Boolean(record.postSnapshot?.completeSaveSha256)
      && rollbackFilesValid;
    return {
      label, ...fileBinding, gates, kind, exists: true,
      status: accepted ? 'PASS' : 'WAITING',
      evidenceStatus: record.status ?? null,
      releaseNodeId: record.releaseNodeId ?? null,
      completedReleaseIdentitySha256: record.completedReleaseIdentitySha256 ?? null,
      postCompleteSaveSha256: record.postSnapshot?.completeSaveSha256 ?? null,
      rollbackPoststatePreflightCount: rollbackBindings.length,
      reason: accepted ? null : 'Ledger lacks executed/reversible status, immutable post identity, or exact rollback bindings.',
    };
  }
  const accepted = statusLooksAccepted(record);
  return {
    label, ...fileBinding, gates, kind, exists: true,
    status: accepted ? 'PASS' : 'WAITING',
    evidenceStatus: record.status ?? null,
    payloadSha256: record.qaPayloadSha256
      ?? record.commissioningPayloadSha256
      ?? record.readinessPayloadSha256
      ?? record.payloadSha256
      ?? null,
    reason: accepted ? null : 'Artifact does not carry a machine PASS status.',
  };
}

function evaluateClosure(phase) {
  if (phase.closure.accepted === true) {
    return { ...phase.closure, status: 'PASS', evidence: null };
  }
  const filename = phase.closure.evidencePath;
  if (!filename || !fs.existsSync(absolute(filename))) {
    return {
      ...phase.closure,
      status: 'WAITING',
      evidence: filename ? { path: relative(filename), exists: false } : null,
    };
  }
  let record;
  try {
    record = readJson(filename);
  } catch (error) {
    return {
      ...phase.closure,
      status: 'WAITING',
      evidence: { ...binding(filename), exists: true, reason: `Invalid JSON: ${error.message}` },
    };
  }
  const releaseNodeId = record.releaseNodeId ?? record.release?.releaseNodeId ?? null;
  const accepted = statusLooksAccepted(record)
    && releaseNodeId === phase.id
    && (!phase.closure.requireCommissioningStatus || record.status.includes('COMMISSION'));
  return {
    ...phase.closure,
    status: accepted ? 'PASS' : 'WAITING',
    basis: accepted
      ? `Accepted bounded closure evidence binds ${phase.id}.`
      : phase.closure.basis,
    nextEvidence: accepted ? null : phase.closure.nextEvidence,
    evidence: {
      ...binding(filename),
      exists: true,
      evidenceStatus: record.status ?? null,
      releaseNodeId,
      reason: accepted ? null
        : 'Closure must carry machine PASS, bind the exact dependency release node, and satisfy its required disposition.',
    },
  };
}

const phaseEvaluations = PHASES.map((phase) => {
  const evidence = phase.evidence.map(evaluateEvidence);
  const closure = evaluateClosure(phase);
  const forGate = (shortGate) => evidence.filter(({ gates }) => gates.includes(shortGate));
  const g16Evidence = forGate('G16');
  const g17Evidence = forGate('G17');
  const g16 = g16Evidence.every(({ status }) => status === 'PASS') ? 'PASS' : 'WAITING';
  const g17EvidencePass = g17Evidence.every(({ status }) => status === 'PASS');
  const g17 = g17EvidencePass && closure.status === 'PASS' ? 'PASS' : 'WAITING';
  return {
    releaseNodeId: phase.id,
    label: phase.label,
    status: g16 === 'PASS' && g17 === 'PASS' ? 'PASS' : 'WAITING',
    gates: {
      G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT: g16,
      G17_FUNCTIONAL_POST_QA: g17,
    },
    closure,
    evidence,
    evidenceSummary: {
      required: evidence.length,
      passed: evidence.filter(({ status }) => status === 'PASS').length,
      waiting: evidence.filter(({ status }) => status === 'WAITING').length,
    },
  };
});

const g16Status = phaseEvaluations.every(
  ({ gates }) => gates.G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT === 'PASS',
) ? 'PASS' : 'WAITING';
const g17Status = phaseEvaluations.every(
  ({ gates }) => gates.G17_FUNCTIONAL_POST_QA === 'PASS',
) ? 'PASS' : 'WAITING';
const waitingFunctionalNodes = phaseEvaluations
  .filter(({ gates: phaseGates }) => phaseGates.G17_FUNCTIONAL_POST_QA === 'WAITING')
  .map(({ releaseNodeId }) => releaseNodeId);

const historicalMapQa = readJson('docs/masterplans/05-combined-zones/map-qa.json');
const publicationEvidenceInitial = PUBLICATION_REQUIREMENTS.map((requirement) => {
  if (PUBLICATION_MODE === 'prepublication') {
    return { ...requirement, path: relative(requirement.path), exists: false, status: 'WAITING' };
  }
  if (!fs.existsSync(absolute(requirement.path))) {
    return { ...requirement, path: relative(requirement.path), exists: false, status: 'WAITING' };
  }
  const record = readJson(requirement.path);
  return {
    ...requirement,
    ...binding(requirement.path),
    exists: true,
    status: statusLooksAccepted(record) ? 'PASS' : 'WAITING',
    evidenceStatus: record.status ?? null,
    terminalCompleteSaveSha256: record.terminalCompleteSaveSha256 ?? null,
    declaredEvidenceBindings: record.evidenceBindings ?? null,
  };
});
const existingPublication = publicationEvidenceInitial.filter(({ exists }) => exists);
const terminalPostHashes = new Set(existingPublication
  .map(({ terminalCompleteSaveSha256 }) => terminalCompleteSaveSha256)
  .filter(Boolean));
const allPublicationPresent = existingPublication.length === PUBLICATION_REQUIREMENTS.length;
const commonTerminalPostBound = allPublicationPresent && terminalPostHashes.size === 1;
const publicationManifest = publicationEvidenceInitial.find(({ id }) => id === 'publication-manifest');
const expectedPublicationBindings = Object.fromEntries(publicationEvidenceInitial
  .filter(({ id, exists }) => id !== 'publication-manifest' && exists)
  .map(({ id, sha256: artifactSha256 }) => [id, artifactSha256]));
const publicationManifestBindsInputs = allPublicationPresent
  && Object.entries(expectedPublicationBindings).every(
    ([id, artifactSha256]) => publicationManifest.declaredEvidenceBindings?.[id]?.sha256 === artifactSha256,
  );
const publicationEvidence = publicationEvidenceInitial.map((item) => {
  if (!item.exists || item.status !== 'PASS') return item;
  const bindingPass = Boolean(item.terminalCompleteSaveSha256)
    && commonTerminalPostBound
    && (item.id !== 'publication-manifest' || publicationManifestBindsInputs);
  return {
    ...item,
    status: bindingPass ? 'PASS' : 'WAITING',
    bindingReason: bindingPass ? null
      : 'G18 artifacts must share one nonempty terminal post hash; the publication manifest must hash-bind every other G18 input.',
  };
});
const g18Status = publicationEvidence.every(({ status }) => status === 'PASS') ? 'PASS' : 'WAITING';

const dependencyStatus = phaseEvaluations.every(({ status }) => status === 'PASS') ? 'PASS' : 'WAITING';
const g19Status = dependencyStatus === 'PASS'
  && g16Status === 'PASS'
  && g17Status === 'PASS'
  && g18Status === 'PASS'
  ? 'PASS' : 'WAITING';
const gates = [
  {
    id: REQUIRED_GATES[0],
    status: g16Status,
    basis: g16Status === 'PASS'
      ? 'Every closure-critical accepted physical package bound by this report has immutable post/reverse evidence.'
      : 'At least one required package lacks accepted immutable-post/reverse evidence.',
  },
  {
    id: REQUIRED_GATES[1],
    status: g17Status,
    basis: g17Status === 'PASS'
      ? 'Every required R07-R12 dependency has accepted functional post QA and an explicit bounded closure.'
      : `Functional closure remains WAITING for: ${waitingFunctionalNodes.join(', ')}.`,
  },
  {
    id: REQUIRED_GATES[2],
    status: g18Status,
    basis: g18Status === 'PASS'
      ? 'Terminal-post-bound media, map QA, database import, and publication manifest all pass.'
      : 'No terminal-post-bound G18 publication package exists. The existing map QA is historical Phase 0 evidence and cannot satisfy G18.',
  },
  {
    id: REQUIRED_GATES[3],
    status: g19Status,
    basis: g19Status === 'PASS'
      ? 'All required dependencies and G16-G18 pass with zero missing, failed, or stale gates.'
      : 'Final acceptance waits for every required dependency and G16-G18; deferred scopes remain outside the denominator.',
  },
];

const nextEvidenceTasks = [];
for (const phase of phaseEvaluations.filter(({ status }) => status === 'WAITING')) {
  if (phase.closure.nextEvidence) nextEvidenceTasks.push(phase.closure.nextEvidence);
}
if (g18Status === 'WAITING') {
  nextEvidenceTasks.push(
    'After physical scope freezes, capture one terminal immutable post and produce matched media, terminal map QA, database-import verification, and a publication manifest.',
  );
}
if (g19Status !== 'PASS') {
  nextEvidenceTasks.push(
    'Rerun this verifier; G19 becomes PASS only when all dependency and G16-G18 statuses are PASS.',
  );
}

const reportWithoutHash = {
  schemaVersion: 1,
  id: 'combined-zones-r13-consolidated-mvp-acceptance-readiness-v1',
  generatedAtUtc: GENERATED_AT,
  status: g19Status === 'PASS'
    ? 'PASS_R13_CONSOLIDATED_MVP_ACCEPTED'
    : 'WAITING_R13_CONSOLIDATED_MVP_ACCEPTANCE',
  release: {
    releaseNodeId: R13_NODE_ID,
    kind: r13.kind,
    physicalMutationAuthorized: false,
    externalPublicationPerformed: false,
  },
  bindings: {
    releaseContract: binding(CONTRACT_PATH),
    authoritativeCurrentState: binding(CURRENT_STATE_PATH),
    historicalPhase0MapQa: {
      ...binding('docs/masterplans/05-combined-zones/map-qa.json'),
      status: historicalMapQa.status,
      satisfiesG18: false,
      reason: 'It binds the Phase 0 terrain snapshot, not the terminal accepted MVP post.',
    },
  },
  mvpBoundary: {
    contractStatus: contract.mvpBoundary?.status ?? null,
    excludedFromAcceptanceDenominator: DEFERRED_SCOPES.map((scope) => ({
      scope,
      excluded: true,
      blocksR13: false,
    })),
    excludedScopeCount: DEFERRED_SCOPES.length,
    rule: 'Only these contract-declared deferrals are removed from the R13 denominator. Other local holds require an accepted bounded disposition or remain WAITING.',
  },
  requiredDependencies: phaseEvaluations,
  gates,
  publicationEvidence,
  nextEvidenceTasks,
  summary: {
    readyForFinalAcceptance: g19Status === 'PASS',
    requiredDependencyCount: phaseEvaluations.length,
    passedDependencyCount: phaseEvaluations.filter(({ status }) => status === 'PASS').length,
    waitingDependencyCount: phaseEvaluations.filter(({ status }) => status === 'WAITING').length,
    gateCount: gates.length,
    passedGateCount: gates.filter(({ status }) => status === 'PASS').length,
    waitingGateCount: gates.filter(({ status }) => status === 'WAITING').length,
    failedGateCount: 0,
    acceptedEvidenceCount: phaseEvaluations.flatMap(({ evidence }) => evidence)
      .filter(({ status }) => status === 'PASS').length,
    waitingEvidenceCount: phaseEvaluations.flatMap(({ evidence }) => evidence)
      .filter(({ status }) => status === 'WAITING').length,
    deferredScopeCount: DEFERRED_SCOPES.length,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    canonicalBuildopsReadOrModified: false,
    serviceMutationsPerformed: false,
    publicationPerformed: false,
  },
};
const readinessPayloadSha256 = stablePayloadHash(reportWithoutHash);
const report = { ...reportWithoutHash, readinessPayloadSha256 };

const rows = phaseEvaluations.map((phase) =>
  `| ${phase.releaseNodeId.replace(/^CZ-/, '').split('-PHASE')[0]} | ${phase.gates.G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT} | ${phase.gates.G17_FUNCTIONAL_POST_QA} | ${phase.closure.status} | ${phase.evidenceSummary.passed}/${phase.evidenceSummary.required} |`,
).join('\n');
const waiting = phaseEvaluations.filter(({ status }) => status === 'WAITING')
  .map((phase) => `- **${phase.releaseNodeId}:** ${phase.closure.basis}${phase.closure.nextEvidence ? ` Next: ${phase.closure.nextEvidence}` : ''}`)
  .join('\n');
const publicationWaiting = publicationEvidence.filter(({ status }) => status === 'WAITING')
  .map(({ id, requirement }) => `- **${id}:** ${requirement}`)
  .join('\n');
const markdown = `# R13 consolidated MVP acceptance readiness\n\nStatus: **${report.status}**\n\nPayload SHA-256: \`${readinessPayloadSha256}\`\n\nThis is a read-only readiness result. It performed no live call, world mutation, service mutation, or publication.\n\n## Required R07-R12 dependencies\n\n| Dependency | G16 | G17 | Closure | Accepted evidence |\n|---|---:|---:|---:|---:|\n${rows}\n\nG16 is **${g16Status}**. G17 is **${g17Status}**. ${report.summary.passedDependencyCount} of ${report.summary.requiredDependencyCount} required dependency closures currently pass.\n\n## Current waits\n\n${waiting || '- None.'}\n\n## G18 publication/media\n\nG18 is **${g18Status}**. The existing map QA binds Phase 0 and is retained as historical evidence only. Missing terminal deliverables:\n\n${publicationWaiting || '- None.'}\n\n## G19 final status\n\nG19 is **${g19Status}**. It can pass only after all six dependency closures and G16-G18 pass with zero missing, failed, or stale gates.\n\n## Explicit MVP exclusions\n\n${DEFERRED_SCOPES.map((scope) => `- ${scope}`).join('\n')}\n\nThese four contract-declared deferrals do not block R13. The verifier does not silently turn another local hold into a deferral.\n`;

fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  output: relative(OUT),
  markdown: relative(MARKDOWN),
  readinessPayloadSha256,
  summary: report.summary,
}, null, 2)}\n`);
