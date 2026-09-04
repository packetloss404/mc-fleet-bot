#!/usr/bin/env node
/**
 * MP01 outer-portal placement/interface decision.
 *
 * Reconciles the authoritative normalized anchor with the current-world study
 * transform. It deliberately does not round Y or derive any physical cells.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const OUT = option('--out-dir', 'data/world-review/mp01-outer-portal-placement-interface-decision-01');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (condition) throw new Error(`MP01 outer portal placement/interface decision rejected: ${message}`); };

const sources = {
  authority: 'docs/masterplans/04-combined-complex/AUTHORITY.md',
  currentWorldPlan: 'docs/masterplans/05-combined-zones/MASTERPLAN.md',
  portalContract: 'docs/masterplans/04-combined-complex/04-contractor/contractor-brief.md',
  portalContractJson: 'docs/masterplans/04-combined-complex/04-contractor/contractor-brief.json',
};
for (const source of Object.values(sources)) fail(!fs.existsSync(abs(source)), `missing authoritative source ${source}`);
fail(fs.existsSync(abs(OUT)), '--out-dir must be a fresh path');
const bytes = Object.fromEntries(Object.entries(sources).map(([id, source]) => [id, fs.readFileSync(abs(source))]));
const text = Object.fromEntries(Object.entries(bytes).map(([id, value]) => [id, value.toString('utf8')]));
fail(!text.authority.includes('worldX = 2048 + localX') || !text.authority.includes('worldZ = -328 + localZ'), 'authority transform is absent');
fail(!text.authority.includes('The vertical study is inactive for construction. It has no approved block-rounding policy'), 'inactive vertical/no-rounding constraint is absent');
fail(!text.authority.includes('Cheyenne outer portal | `(0,200,-420)` | `(2048,130,-748)`'), 'authoritative portal anchor table drift');
fail(!text.portalContract.includes('| **Opening** | 6 × 6 block opening') || !text.portalContract.includes('| **Checkpoint corridor** | 4 blocks deep, 6 blocks wide') || !text.portalContractJson.includes('3-block-thick iron door'), 'portal/door conflict source drift');

const localAnchor = { x: 0, y: 200, z: -420 };
const worldXZ = { x: 2048, z: -748 };
const verticalStudy = { formula: 'localY >= 0: worldY = 72 + 0.29 × localY', localY: 200, mathematicalResult: 130, status: 'INACTIVE_FOR_CONSTRUCTION__NO_APPROVED_BLOCK_ROUNDING_POLICY' };
const decision = {
  schemaVersion: 1,
  id: 'MP01-OUTER-PORTAL-PLACEMENT-INTERFACE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: 'HOLD_NORMALIZED_ANCHOR_BOUND__VERTICAL_AND_INTERFACE_GEOMETRY_UNACCEPTED',
  mutationAuthority: false,
  operationsCompiled: false,
  releaseAuthorization: false,
  source: Object.fromEntries(Object.entries(sources).map(([id, source]) => [id, { path: rel(source), sha256: sha(bytes[id]) }])),
  authoritativeAnchorPolicy: {
    normalizedAnchor: localAnchor,
    exactCurrentWorldHorizontalMapping: worldXZ,
    verticalStudy,
    anchorMeaning: 'The pair (2048,-748) is the exact current-world X/Z study anchor only. The numerical Y=130 is retained as a mathematical study result, not an integer build coordinate or a live-world action target.',
    permittedUse: ['bind prose/design references to the normalized local anchor and current-world X/Z pair', 'use the study result solely to detect coordinate-policy drift'],
    prohibitedUse: ['round, floor, ceil, or otherwise convert the vertical study result into a block target', 'derive portal, checkpoint, door, airlock, service-tunnel, J-curve, funicular, road, support, or route cells', 'treat the study anchor as an RCON/bot goal, marker, ownership grant, or physical interface'],
  },
  nonAnchorGeometryPolicy: {
    status: 'DEFAULT_DENY__NO_VERTICAL_ROUNDING_OR_CELL_SET_DERIVATION',
    rule: 'All non-anchor geometry remains normalized intent until a separately accepted current-world placement rule supplies an inclusive cell-set convention and a vertical rounding policy.',
    physicalTargetCells: null,
    physicalInverseCells: null,
  },
  portalAirlockConflict: {
    stableIntent: ['six-by-six portal opening', 'six-wide, four-block-deep checkpoint corridor', 'recessed blast-door/airlock concept'],
    unresolved: ['anchor corner versus centre convention', 'portal face normal and inward/outward direction', 'exact relationship of 6×6×8 portal reservation, four-deep checkpoint, door recess, and guard/sign volumes', 'three-block-thick, six-wide × twelve-tall door description conflicts with the smaller opening without a canonical frame/leaf/cell set', 'default, failed, and rollback door/airlock states'],
    disposition: 'No material palette, door state, frame, clearance, route, or inverse may be selected from the prose alone.',
  },
  accessAndOwnershipGates: {
    currentAcceptedEndpoints: 0,
    currentAcceptedReturns: 0,
    requiredInputs: [
      'accepted vertical placement and inclusive block-rounding/cell-set policy for the full portal/checkpoint/door envelope',
      'one exact face normal and anchor convention; complete frame, door leaf, airlock, checkpoint, guard, and sign cell sets',
      'named owners and counterparts for the service-tunnel side, portal threshold, Cheyenne/J-curve side, and all retained interfaces',
      'source-bound approach and distinct recovery station arrays, with the intended normal-walk or separately designed rail mode stated explicitly',
      'fresh complete-source census of targets, supports, interaction halo, protected cells, fluids, gravity, containers/block entities, and saved entities',
      'directed forward/rollback order, including the failed/default door state and a post-release acceptance record',
    ],
  },
  nextArtifact: {
    id: 'MP01-OUTER-PORTAL-PLACEMENT-ACCEPTANCE-SIGNATURE-01',
    type: 'design acceptance signature only',
    mustDefaultDenyUnless: ['the vertical placement policy is explicit and accepted', 'all physical cell sets and owners are exact', 'both endpoint/return contracts are source-bound'],
  },
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, botMovementPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  nonClaims: ['No outer portal, blast door, airlock, checkpoint, J-curve, service tunnel, funicular, road, route, egress, marker, material target, inverse, compiler, authorization, or world change.'],
};
decision.identitySha256 = sha(`${JSON.stringify(decision, null, 2)}\n`);
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="510" viewBox="0 0 1080 510"><style>.t{font:700 22px system-ui;fill:#f8fafc}.s{font:13px system-ui;fill:#cbd5e1}.k{font:600 14px system-ui;fill:#f8fafc}.n{font:600 13px system-ui;fill:#fde68a}.d{font:600 13px system-ui;fill:#fca5a5}</style><rect width="100%" height="100%" fill="#08131f"/><text x="36" y="40" class="t">MP01 outer portal placement/interface decision 01</text><text x="36" y="66" class="s">Normalized coordinate binding only — all physical geometry remains default-deny.</text><rect x="55" y="120" width="260" height="185" rx="10" fill="#17324d" stroke="#93c5fd"/><text x="78" y="154" class="k">04 normalized anchor</text><text x="78" y="188" class="s">local (0, 200, -420)</text><text x="78" y="222" class="s">canonical architectural intent</text><path d="M330 212 H445" stroke="#94a3b8" stroke-width="4"/><polygon points="445,212 430,202 430,222" fill="#94a3b8"/><rect x="460" y="120" width="270" height="185" rx="10" fill="#17324d" stroke="#93c5fd"/><text x="484" y="154" class="k">05 horizontal study</text><text x="484" y="188" class="s">world X/Z = (2048, -748)</text><text x="484" y="222" class="n">Y study 130: not constructible</text><path d="M745 212 H850" stroke="#f87171" stroke-width="4"/><polygon points="850,212 835,202 835,222" fill="#f87171"/><rect x="865" y="120" width="165" height="185" rx="10" fill="#451a1a" stroke="#fca5a5"/><text x="888" y="154" class="k">Cell set</text><text x="888" y="188" class="d">DENIED</text><text x="888" y="222" class="s">no rounding</text><text x="55" y="365" class="d">Unresolved: 6×6 opening + 4-deep checkpoint + three-thick 6×12 door have no canonical face, frame, airlock, failure state, or owner.</text><text x="55" y="405" class="s">Required next: accepted vertical/cell convention; exact portal/door/airlock cells; two endpoint/return contracts; fresh source/halo census; directed inverse.</text><text x="55" y="455" class="n">No target, operation, release manifest, RCON, bot movement, or world mutation is emitted.</text></svg>`;
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'mp01-outer-portal-placement-interface-decision-01.json'), `${JSON.stringify(decision, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'mp01-outer-portal-placement-interface-map.svg'), `${map}\n`);
fs.writeFileSync(path.join(abs(OUT), 'MP01-OUTER-PORTAL-PLACEMENT-INTERFACE-DECISION-01.md'), `# MP01 outer portal placement/interface decision 01\n\n**Status:** ${decision.status}\n\n![Placement decision map](mp01-outer-portal-placement-interface-map.svg)\n\nThe local anchor (0,200,-420) binds exactly to the current-world X/Z study pair (2048,-748). Its Y=130 result is a mathematical study value only: the authoritative placement bridge remains inactive for construction and has no approved block-rounding policy. This packet therefore derives no physical cell, material, target, inverse, route, or operation.\n\nThe next acceptance signature must settle the vertical and cell-set convention, portal face and anchor convention, 6×6/4-deep/6×12 door-airlock conflict, owners, endpoints, recovery, source census, and directed inverse before a separate compiler may be considered.\n`);
console.log(JSON.stringify({ status: decision.status, output: rel(OUT), horizontalAnchor: worldXZ, verticalStudy: verticalStudy.mathematicalResult, physicalTargetCells: null, mutationAuthority: false }, null, 2));
