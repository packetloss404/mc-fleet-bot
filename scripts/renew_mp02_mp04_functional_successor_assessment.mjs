#!/usr/bin/env node
/**
 * Rebind MP02/MP04 functional-successor evidence to a later complete source.
 *
 * Read-only by design: it proves that the B07/B08/B09/B03 region files are
 * unchanged from the accepted integrated-source assessment, then combines
 * that continuity proof with a fresh MP02 direct survey. It emits neither an
 * operation nor an authority claim.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const arg = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const source = arg('--source');
const baseline = arg('--baseline', 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z');
const mp02 = arg('--mp02');
const mp04 = arg('--mp04', 'data/world-review/mp04-integrated-setout-02-current-mp06-post-20260826T143902Z/mp04-integrated-setout.json');
const out = arg('--out');
if (!source || !mp02 || !out) {
  throw new Error('Usage: --source <complete snapshot> --mp02 <fresh MP02 survey json> --out <fresh directory> [--baseline <snapshot> --mp04 <MP04 report>]');
}
const resolve = (value) => path.resolve(root, value);
const rel = (value) => path.relative(root, resolve(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (value) => JSON.parse(fs.readFileSync(resolve(value), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`MP02/MP04 successor renewal rejected: ${message}`); };

for (const snapshot of [source, baseline]) {
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    fail(fs.existsSync(path.join(resolve(snapshot), member)), `${rel(snapshot)} is incomplete; missing ${member}`);
  }
}
fail(!fs.existsSync(resolve(out)), `output directory already exists: ${rel(out)}`);

const snapshotIdentity = (snapshot) => {
  const region = path.join(resolve(snapshot), 'region');
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  const files = fs.readdirSync(region).filter((name) => name.endsWith('.mca')).sort();
  for (const name of files) {
    const payload = fs.readFileSync(path.join(region, name));
    digest.update(name); digest.update('\0'); digest.update(payload); digest.update('\0');
    bytes += payload.length;
  }
  return {
    root: rel(snapshot),
    regionSha256: digest.digest('hex'),
    regionFiles: files.length,
    regionBytes: bytes,
    captureManifestSha256: sha(fs.readFileSync(path.join(resolve(snapshot), 'combined-zones-complete-save-capture.json'))),
  };
};

const sourceIdentity = snapshotIdentity(source);
const baselineIdentity = snapshotIdentity(baseline);
const relevantRegions = [
  { file: 'r.3.-2.mca', scope: 'MP02 B08 accepted handoff and continuation' },
  { file: 'r.4.-2.mca', scope: 'B08/B09/B03 portal, B09 receiver and B03 endpoint' },
  { file: 'r.4.-1.mca', scope: 'B07 headhouse and B07 to B08 corridor origin' },
].map(({ file, scope }) => {
  const baselineBytes = fs.readFileSync(path.join(resolve(baseline), 'region', file));
  const sourceBytes = fs.readFileSync(path.join(resolve(source), 'region', file));
  const baselineSha256 = sha(baselineBytes);
  const sourceSha256 = sha(sourceBytes);
  return { file, scope, bytes: sourceBytes.length, baselineSha256, sourceSha256, byteIdentical: baselineSha256 === sourceSha256 };
});
fail(relevantRegions.every(({ byteIdentical }) => byteIdentical), 'a relevant MP02/MP04 region differs from the accepted integrated source');

const mp02Report = readJson(mp02);
const mp04Report = readJson(mp04);
fail(mp02Report.status === 'HOLD_NO_OWNED_FUNCTIONAL_SUCCESSOR', 'fresh MP02 survey status drifted');
fail(mp02Report.sourceSnapshot.sha256 === sourceIdentity.regionSha256, 'MP02 survey is not bound to supplied current source');
fail(mp02Report.reconciliation.accepted719.currentTargetFailures.length === 0, 'MP02 accepted handoff is no longer current');
fail(mp02Report.reconciliation.accepted719.retainedOpeningFailures.length === 0, 'MP02 retained R07C openings drifted');
fail(mp02Report.rawSuccessorVoid.conditions.paveableSupportedClear === 584, 'MP02 raw continuation geometry/support drifted');
fail(mp02Report.rawSuccessorVoid.conditions.fluids.length === 0, 'MP02 raw continuation has fluid state');
fail(mp02Report.rawSuccessorVoid.conditions.blocked.length === 0, 'MP02 raw continuation lost required clear height');
fail(mp02Report.rawSuccessorVoid.savedBlockEntities.length === 0, 'MP02 raw continuation has saved block entities');
fail(mp02Report.rawSuccessorVoid.savedMovableEntities.length === 0, 'MP02 raw continuation has saved entities');
fail(mp04Report.status === 'DEFAULT_DENY__NO_SAFE_EXACT_INTEGRATED_OPERATION_CANDIDATE', 'MP04 integrated disposition drifted');
fail(mp04Report.authority.mp04CurrentWorldCells === 0, 'MP04 authority unexpectedly claims world cells');
const gates = mp04Report.reconciledPrerequisites.map(({ id, state, required }) => ({ id, state, required }));
fail(gates.length === 6 && gates.every(({ state }) => state !== 'PASS'), 'MP04 prerequisite gate unexpectedly passed');

const report = {
  schemaVersion: 1,
  id: 'MP02-MP04-FUNCTIONAL-SUCCESSOR-RENEWAL-01',
  status: 'HOLD_NO_SAFE_OWNED_FUNCTIONAL_SUCCESSOR',
  generatedAtUtc: new Date().toISOString(),
  readOnly: { worldMutationPerformed: false, capturePerformed: false, rconInvoked: false, operationFiles: [] },
  source: sourceIdentity,
  baseline: baselineIdentity,
  continuity: { relevantRegions, result: 'ALL_RELEVANT_REGIONS_BYTE_IDENTICAL' },
  mp02: {
    directSurvey: rel(mp02),
    acceptedHandoff: { targetCells: 719, retainedR07cAirOpenings: 10, currentFailures: 0 },
    continuation: { rawFloorCells: 584, conditions: 'source-air, supported, dry, two-clear, no saved block or movable entities' },
    disposition: 'No owned chamber/lobby/tenant/entry/egress scope exists; the accepted return remains the only proven exit.',
  },
  mp04: {
    baselineIntegratedSetout: rel(mp04),
    authority: 'MP04 owns normalized composition only; MP05 owns current-world placement, interfaces, and release gates.',
    continuityBasis: 'Every region holding the existing B07/B08/B09/B03 current-state study is byte-identical in the supplied later complete source.',
    gates,
  },
  sourceBoundDesignGate: {
    id: 'MP05-OWNED-INTEGRATED-MP02-MP04-FUNCTIONAL-SUCCESSOR-GATE',
    mutationAuthority: false,
    candidateOperations: 0,
    requiredBeforeCompilation: [
      'Adopt an exact MP02 chamber/lobby/operating-purpose envelope with lining, support, drainage, retained-route and access-class contracts.',
      'Adopt a bilateral B03/B09 portal and egress contract with exact owner, normal/failure states, receiver, inverse, protected-rail treatment and independent exit.',
      'Close the MP05-owned B07 endpoint, B07-to-B08 corridor, B09 receiver/rescue and B03 endpoint gates as one functional interaction set.',
      'Only then bind an immediate complete source and run the guarded physical-release kernel for exact reversible operations.',
    ],
  },
  conclusion: {
    candidate: null,
    reason: 'The current source proves a technically clear raw B08 tunnel, but not an owned functional endpoint or a complete cross-system interaction set. MP04 has no release cells; no safe local MP02 or MP04 operation may be compiled.',
  },
};
const manifestIdentity = sha(JSON.stringify(report));
report.manifestIdentitySha256 = manifestIdentity;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620"><style>text{font-family:Arial,sans-serif;fill:#edf3fa}.title{font-size:25px;font-weight:700}.label{font-size:17px;font-weight:700}.small{font-size:14px}.tiny{font-size:12px}.box{stroke:#dce6f2;stroke-width:2}.hold{fill:#5b2229}.gate{fill:#704f1e}.good{fill:#174b3e}.line{stroke:#dce6f2;stroke-width:3}.dash{stroke:#e7b85b;stroke-width:3;stroke-dasharray:10 8}</style><rect width="1200" height="620" fill="#111820"/><text x="28" y="40" class="title">MP02 / MP04 functional successor — renewed current-source gate</text><text x="28" y="66" class="small">SYS03 post source ${sourceIdentity.regionSha256.slice(0, 16)}… · B07/B08/B09/B03 regions byte-identical to accepted integrated source</text><rect x="42" y="116" width="275" height="160" rx="10" class="box good"/><text x="62" y="150" class="label">Accepted MP02 handoff</text><text x="62" y="178" class="small">719/719 targets retained</text><text x="62" y="202" class="small">10 R07C openings remain air</text><text x="62" y="226" class="small">125-station return / 6×3 landing</text><rect x="451" y="116" width="275" height="160" rx="10" class="box gate"/><text x="471" y="150" class="label">Raw B08 continuation</text><text x="471" y="178" class="small">584 dry, supported, two-clear cells</text><text x="471" y="202" class="small">No saved entities / block entities</text><text x="471" y="226" class="small">Not a chamber, entry, or egress</text><rect x="860" y="116" width="295" height="160" rx="10" class="box hold"/><text x="880" y="150" class="label">MP04 / MP05 interfaces</text><text x="880" y="178" class="small">MP04 owns 0 current-world cells</text><text x="880" y="202" class="small">B07/B09/B03 functional gates open</text><text x="880" y="226" class="small">No directional transfer contract</text><line x1="317" y1="196" x2="451" y2="196" class="dash"/><line x1="726" y1="196" x2="860" y2="196" class="dash"/><text x="60" y="352" class="title" style="font-size:20px">No physical operation is safe to compile yet</text><rect x="42" y="382" width="1112" height="174" rx="10" class="box hold"/><text x="66" y="416" class="label">Required MP05-owned integrated successor, before any build operation</text><text x="66" y="448" class="small">1. Exact MP02 chamber / lobby / access / drainage contract</text><text x="66" y="474" class="small">2. Bilateral B03/B09 portal, protected rail, receiver, failure-state and independent-exit contract</text><text x="66" y="500" class="small">3. Close B07 endpoint, B07→B08 corridor, B09 receiver/rescue and B03 endpoint as one interaction set</text><text x="66" y="526" class="small">4. Fresh source and full guarded release kernel only after those contracts exist</text></svg>`;
const markdown = `# MP02 / MP04 functional successor renewal 01\n\n**Status:** \`${report.status}\`  \n**Mode:** read-only; no operation, capture, RCON request, or world mutation.\n\n![Functional successor gate](mp02-mp04-functional-successor-gate.svg)\n\n## Current-source result\n\nThe supplied SYS03 post source is complete and its three relevant B07/B08/B09/B03 Anvil region files are byte-identical to the prior accepted integrated source. A direct fresh MP02 scan also verifies the accepted 719-cell handoff, the ten retained R07C air openings, and the 584-cell raw continuation.\n\nThat continuation is dry, supported, two-clear and has no saved block or movable entities, but it remains an unowned linear tunnel with one proven exit. It is not a functional chamber, lobby, tenant grid, controlled entry, or egress route. MP04 continues to own zero current-world cells, while the B07 endpoint/corridor, B08-to-B09 portal, B09 receiver/rescue, and B03 receiver gates remain open.\n\n## Design gate\n\nThe only grounded successor is the non-authorizing \`${report.sourceBoundDesignGate.id}\`: a single MP05-owned functional package that closes all listed contracts before exact reversible operations can be compiled. This record does not authorize a build or claim a release.\n\nMachine evidence: [assessment.json](assessment.json).\n`;
fs.mkdirSync(resolve(out), { recursive: true });
fs.writeFileSync(path.join(resolve(out), 'assessment.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(resolve(out), 'mp02-mp04-functional-successor-gate.svg'), `${svg}\n`);
fs.writeFileSync(path.join(resolve(out), 'MP02-MP04-FUNCTIONAL-SUCCESSOR-RENEWAL.md'), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, source: report.source, continuity: report.continuity.result, safePhysicalCandidate: false, out: rel(out) }, null, 2)}\n`);
