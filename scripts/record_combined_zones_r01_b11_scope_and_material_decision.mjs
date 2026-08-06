#!/usr/bin/env node
/**
 * Record the owner-signed R01 scope adjudication and material decision for the
 * P1-B11 Grand Avenue surface road pilot.
 *
 * Two decisions, both additive (no existing artifact or the release contract
 * is modified):
 * 1. Scope adjudication: the contract's canonical CZ-R01 owner is the C1 East
 *    Corridor, which has no frozen G03 cell set; authoring one would be slower
 *    and riskier than piloting on an already-frozen domain. R01's purpose — a
 *    bounded, independently reversible proof of the frozen civil palette,
 *    setout, and route geometry — is therefore instantiated on the frozen
 *    P1-B11 construction domain. This deviates from the contract's serial
 *    R02-R06 ordering (surface road before deep shells); the deviation is
 *    disclosed here and grounded in the owner's recorded decisions: the owner
 *    raised road-over-tunnel ordering in the accepted review bundle, deferred
 *    the B12 shell with a no-foreclosure reservation, and B11 is spatially
 *    disjoint from the Empty Eight envelope with zero protected-core overlap
 *    proven for all non-null domains.
 * 2. Material decision: the exact eight-wide road section by centerline
 *    Z-offset, using the town's proven road palette.
 *
 * This record authorizes NO world edit and emits zero operations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-07T00:20:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.md'));

const INPUTS = Object.freeze({
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  b11Acceptance: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  r00Readiness: 'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
  ownerControlledDecisions: 'docs/masterplans/05-combined-zones/phase1-owner-controlled-decisions.json',
  composite: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R01 B11 decision record rejected: ${message}`);
}

const g03 = readJson(INPUTS.g03CanonicalSetout);
const b11 = readJson(INPUTS.b11Acceptance);
const registry = readJson(INPUTS.registry);
const r00 = readJson(INPUTS.r00Readiness);
const ext = readJson(INPUTS.externalAcceptance);
const ownerControlled = readJson(INPUTS.ownerControlledDecisions);
const composite = readJson(INPUTS.composite);

const b11Scope = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B11');
invariant(b11Scope?.construction?.cellCount === 2392, 'B11 construction cell count drift');
invariant(r00.status === 'R00_READY' && r00.summary?.r00Ready === true,
  'R00 design freeze is not complete');
invariant(ext.status === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE',
  'EXT acceptance record is not in the accepted state');
invariant(ownerControlled.decisions?.some((d) => d.id === 'OWNER-SCOPE-P1-B12-DEFER-NOW'),
  'B12 deferral decision is missing');
invariant(b11.acceptancePayload?.grandAvenue?.centerlineSha256,
  'B11 accepted centerline identity missing');

// Eight-wide section by signed Z-offset from the centerline point. The dashed
// centre stripe alternates by station index: station % 6 < 3 selects the
// stripe state at offset 0, matching the town road language (gray concrete
// carriageway, yellow stripe, stone-brick curbs, smooth-stone sidewalk on the
// town-facing south edge).
const roadSection = [
  { zOffset: -3, role: 'NORTH_CURB', state: 'minecraft:stone_bricks' },
  { zOffset: -2, role: 'CARRIAGEWAY', state: 'minecraft:gray_concrete' },
  { zOffset: -1, role: 'CARRIAGEWAY', state: 'minecraft:gray_concrete' },
  {
    zOffset: 0,
    role: 'CARRIAGEWAY_CENTRE_DASHED_STRIPE',
    state: 'minecraft:gray_concrete',
    stripeState: 'minecraft:yellow_concrete',
    stripeRule: 'station % 6 < 3',
  },
  { zOffset: 1, role: 'CARRIAGEWAY', state: 'minecraft:gray_concrete' },
  { zOffset: 2, role: 'CARRIAGEWAY', state: 'minecraft:gray_concrete' },
  { zOffset: 3, role: 'SOUTH_CURB', state: 'minecraft:stone_bricks' },
  { zOffset: 4, role: 'SOUTH_SIDEWALK', state: 'minecraft:smooth_stone' },
];

const sectionPayloadSha256 = sha256(`combined-zones-r01-b11-road-section-v1\n${JSON.stringify(roadSection)}\n`);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-r01-b11-scope-and-material-decision',
  generatedAtUtc: GENERATED_AT,
  status: 'OWNER_DECISION_RECORDED_R01_SCOPE_B11_AND_ROAD_MATERIALS',
  authority: {
    source: 'sole-owner directive, project conversation, 2026-08-06: commit and proceed with the reviewed B11 pilot plan',
    priorDirective: 'sole-owner build-ready directive, 2026-08-06',
    reviewedByIndependentPlanningAgent: true,
    worldEditAuthorized: false,
  },
  scopeAdjudication: {
    decision: 'INSTANTIATE_CZ_R01_ON_FROZEN_P1_B11_CONSTRUCTION_DOMAIN',
    contractDeviationDisclosed: {
      canonicalR01Owner: 'C1_EAST_CORRIDOR_NO_FROZEN_G03_CELL_SET',
      serialGraphDeviation: 'SURFACE_ROAD_BEFORE_DEEP_SHELLS_R02_R05',
      groundedIn: [
        'owner-raised road-over-tunnel ordering in the accepted owner-review bundle',
        'OWNER-SCOPE-P1-B12-DEFER-NOW retains the subsurface no-foreclosure reservation',
        'B11 (x1750-2048, z-331..-296) is disjoint from the Empty Eight terminal envelope (x1632-1872, z40-160)',
        'zero protected-core and generated-start overlap proven for every non-null G03 domain in the composite scope clearance',
      ],
      releaseContractModified: false,
    },
    r01PurposeSatisfied: 'bounded, independently reversible proof of the frozen civil palette, setout, and route geometry',
    exclusionsHonored: ['no C01 work', 'no owner tunnel', 'no relic-core cell', 'no B12 shell work'],
  },
  boundIdentities: {
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    b11ConstructionCoordinateSetSha256: b11Scope.construction.coordinateSetSha256,
    b11ConstructionCellCount: b11Scope.construction.cellCount,
    b11ConstructionBounds: b11Scope.construction.bounds,
    b11CenterlineSha256: b11.acceptancePayload.grandAvenue.centerlineSha256,
    b11CenterlinePointCount: b11.acceptancePayload.grandAvenue.centerlinePointCount,
    ownershipRegistryPayloadSha256: registry.canonicalPayloadSha256,
    compositeCanonicalPayloadSha256:
      composite.compositeCanonicalModel.compositeCanonicalPayloadSha256,
    externalAcceptanceReportIdentitySha256: ext.reportIdentitySha256,
    r00Status: r00.status,
  },
  materialDecision: {
    domain: 'P1-B11/construction',
    sectionConvention: 'signed Z-offset -3..+4 from each centerline station at the station Y',
    roadSection,
    sectionPayloadSha256,
    singleStatePerCell: true,
    blockStatePropertiesRequired: false,
    designPrecedent: 'town grid-road palette (gray_concrete carriageway, yellow_concrete stripe, stone_bricks curb, smooth_stone sidewalk)',
  },
  laterReleasesExplicitlyNotDecidedHere: [
    'D06/Empty Eight materials beyond the frozen EE role palette (release R02)',
    'B03/B07/B08 tunnel excavation and lining palettes (R03-R04)',
    'P1-B10 mountain support-gap family states (R05)',
    'B09 funicular commissioning (post-R05)',
    'P1-B12 shell (deferred by owner decision)',
  ],
  safetyBoundary: {
    operationCellCount: 0,
    worldEditAuthorized: false,
    liveCallsPerformed: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);

const markdown = `# Combined Zones R01 B11 scope and material decision

Status: **${report.status}**

CZ-R01 is instantiated on the frozen **P1-B11 Grand Avenue surface road** construction domain (2,392 cells, identity \`${report.boundIdentities.b11ConstructionCoordinateSetSha256.slice(0, 16)}…\`). The contract's canonical C1 owner has no frozen cell set; the serial-graph deviation (surface road before deep shells) is disclosed above and grounded in the owner's recorded decisions. The release contract itself is not modified.

**Road section (Z-offset -3..+4):** stone-brick curbs at -3/+3, gray-concrete carriageway, dashed yellow centre stripe at offset 0 (\`station % 6 < 3\`), smooth-stone sidewalk at +4 (town side). Section payload \`${sectionPayloadSha256.slice(0, 16)}…\`.

Not decided here: R02+ materials (Empty Eight, tunnels, mountain support gaps, funicular) and the deferred B12 shell.

World edits authorized by this record: **none**.

Report identity: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  sectionPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
