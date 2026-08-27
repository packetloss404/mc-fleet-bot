#!/usr/bin/env node
/**
 * MP02 B08 terminus / control / egress whole-scope design gate.
 *
 * Read-only and deliberately default-deny.  It binds the present B08 corridor,
 * the existing egress-shaft intercept, and the B03/B09 seam to one immutable
 * capture.  It emits design evidence only; never operation streams or release
 * authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (name, fallback = null) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const fail = (message) => { throw new Error(`MP02 B08 terminus design rejected: ${message}`); };
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const abs = (name) => path.resolve(ROOT, name);
const rel = (name) => path.relative(ROOT, name).split(path.sep).join('/');
const cellsIn = ({ minX, maxX, minY, maxY, minZ, maxZ }) => {
  const result = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) result.push({ x, y, z });
  return result;
};
const boundsOf = (cells) => cells.reduce((out, cell) => ({ minX: Math.min(out.minX, cell.x), maxX: Math.max(out.maxX, cell.x), minY: Math.min(out.minY, cell.y), maxY: Math.max(out.maxY, cell.y), minZ: Math.min(out.minZ, cell.z), maxZ: Math.max(out.maxZ, cell.z) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
const describe = (cells) => ({ cellCount: cells.length, bounds: boundsOf(cells), coordinateSetSha256: hashCells(cells) });
const stateSetSha = (records) => sha(records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n'));
const census = (records) => Object.fromEntries(Object.entries(records.reduce((out, { state }) => ({ ...out, [state]: (out[state] ?? 0) + 1 }), {})).sort(([a], [b]) => a.localeCompare(b)));
const containsFluid = (text) => /minecraft:(water|lava|bubble_column)(?:\[|$)/.test(text) || /waterlogged=true/.test(text);

const snapshotArg = option('--snapshot');
const surveyArg = option('--survey');
const outArg = option('--out');
if (!snapshotArg || !surveyArg || !outArg) fail('usage: --snapshot <complete immutable snapshot> --survey <fresh successor survey json> --out <fresh directory>');
const SNAPSHOT = abs(snapshotArg);
const SURVEY = abs(surveyArg);
const OUT = abs(outArg);
if (fs.existsSync(OUT)) fail(`out must be a fresh directory: ${OUT}`);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, member))) fail(`incomplete source snapshot: ${member}`);
if (!fs.existsSync(SURVEY)) fail('fresh successor survey is missing');

const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
if (capture.immutableCopy !== true || !Array.isArray(capture.requiredMembers) || capture.requiredMembers.length === 0) fail('source lacks immutable complete-save membership');
for (const member of capture.requiredMembers) {
  const filename = path.join(SNAPSHOT, member.path);
  if (!fs.existsSync(filename)) fail(`captured member missing: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  if (bytes.length !== member.bytes || sha(bytes) !== member.sha256) fail(`captured member drift: ${member.path}`);
}
const surveyBytes = fs.readFileSync(SURVEY);
const survey = JSON.parse(surveyBytes);
if (survey.status !== 'HOLD_NO_OWNED_FUNCTIONAL_SUCCESSOR') fail(`survey status is ${survey.status}`);
if (abs(survey.sourceSnapshot?.root ?? '') !== SNAPSHOT) fail('survey and supplied source snapshot differ');

const raw = survey.rawSuccessorVoid?.conditions;
if (!raw || raw.total !== 584 || raw.paveableSupportedClear !== 582 || raw.fluids?.length !== 0 || raw.blocked?.length !== 2) fail('raw successor inventory drifted from the known finite current condition');
const expectedIntercept = new Map([
  ['2007,129,-748', 'minecraft:polished_diorite'],
  ['2008,129,-748', 'minecraft:ladder[facing=west,waterlogged=false]'],
]);
for (const entry of raw.blocked) {
  const expected = expectedIntercept.get(cellKey(entry.cell));
  if (!expected || entry.feet !== expected || entry.head !== expected) fail(`unexpected raw-continuation obstruction at ${cellKey(entry.cell)}`);
}

const b03Aperture = cellsIn({ minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 });
const b09Cap = cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 });
const portalStudy = [{ x: 2050, y: 130, z: -748 }, { x: 2050, y: 131, z: -748 }];
const receiverStudy = cellsIn({ minX: 2051, maxX: 2053, minY: 130, maxY: 132, minZ: -750, maxZ: -748 });
const intercept = [...expectedIntercept.keys()].map((key) => { const [x, y, z] = key.split(',').map(Number); return { x, y, z }; });
const reader = new AnvilReader(path.join(SNAPSHOT, 'region'));
const states = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const [apertureStates, capStates, portalStates, receiverStates, interceptStates] = await Promise.all([states(b03Aperture), states(b09Cap), states(portalStudy), states(receiverStudy), states(intercept)]);
if (!apertureStates.every(({ state }) => state === 'minecraft:air')) fail('B03 aperture no longer has exact retained-air state');
if (!capStates.every(({ state }) => state === 'minecraft:polished_diorite')) fail('B09 cap no longer has exact closed state');
if (!portalStates.every(({ state }) => state === 'minecraft:polished_diorite')) fail('portal study is no longer capped');
if (!interceptStates.every(({ cell, state }) => state === expectedIntercept.get(cellKey(cell)))) fail('existing B08 egress-shaft intercept drifted');
if ([...apertureStates, ...capStates, ...portalStates, ...receiverStates, ...interceptStates].some(({ state }) => containsFluid(state))) fail('fluid was discovered in a protected design interface');

const current = {
  sourceCapture: { snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true, requiredMemberCount: capture.requiredMembers.length, captureManifestSha256: sha(captureBytes), successorSurvey: { path: rel(SURVEY), sha256: sha(surveyBytes) } },
  exactInventory: {
    acceptedB08Handoff: { releaseId: survey.reconciliation.accepted719.releaseId, floorTargetCells: 719, verifiedTargetFailures: survey.reconciliation.accepted719.currentTargetFailures.length, retainedR07cAirOpenings: 10, disposition: 'RETAIN__NO_REPLAY' },
    rawContinuation: { centerlineIndices: survey.rawSuccessorVoid.indices, ...describe(survey.rawSuccessorVoid.floorBand), sourceAirSupportedTwoClearCells: 582, occupiedExistingEgressInterfaceCells: 2, dry: true, candidateDisposition: 'UNBUILT_LINEAR_VOLUME__NOT_AN_AUTHORIZED_ROUTE_OR_CHAMBER' },
    egressShaftIntercept: { ...describe(intercept), currentStates: interceptStates, role: 'EXISTING_B08_EGRESS_FIXTURE__RETAIN_AND_EXCLUDE_FROM_ANY_NEW_PACKAGE', liveRouteAcceptanceClaimed: false },
    b03Aperture: { ...describe(b03Aperture), requiredCurrentState: 'minecraft:air', currentStateSetSha256: stateSetSha(apertureStates), owner: 'PENDING_B03_MP02_BILATERAL' },
    b09IsolationCap: { ...describe(b09Cap), requiredCurrentState: 'minecraft:polished_diorite', currentStateSetSha256: stateSetSha(capStates), owner: 'B09_PROTECTED__PENDING_B09_MP02_BILATERAL' },
    portalStudy: { ...describe(portalStudy), requiredCurrentState: 'minecraft:polished_diorite', currentStateSetSha256: stateSetSha(portalStates), disposition: 'STUDY_ONLY__NO_OPENING' },
    receiverStudy: { ...describe(receiverStudy), currentStateCensus: census(receiverStates), currentStateSetSha256: stateSetSha(receiverStates), disposition: 'STUDY_ONLY__NOT_A_RECEIVER_OR_DRAIN' },
  },
};
const contract = {
  schemaVersion: 1,
  id: 'MP02-B08-TERMINUS-CONTROL-EGRESS-DESIGN-01',
  status: 'SOURCE_BOUND_DEFAULT_DENY__WHOLE_SCOPE_TERMINUS_CONTROL_EGRESS_DESIGN_PENDING',
  mode: 'READ_ONLY_SOURCE_BOUND_DESIGN_GATE',
  generatedAtUtc: option('--generated-at', new Date().toISOString()),
  worldMutationPerformed: false,
  disposition: { mutationAuthority: false, operationsCompiled: false, forwardOperationCount: 0, rollbackOperationCount: 0, releaseAuthorization: false, defaultDeny: true, reason: 'A dry raw continuation and a pre-existing egress intercept are not a bounded terminus, controlled receiver, or independently accepted two-route egress system.' },
  sourceBinding: current.sourceCapture,
  currentInterfaceFacts: current.exactInventory,
  ownershipAndInterfaces: {
    exactOwnersRequired: true,
    wildcardOwnershipAllowed: false,
    unilateralSeamOpeningAllowed: false,
    lastWriterWinsAllowed: false,
    accountableRoles: {
      terminusScopeOwner: 'MP02_B08_TERMINUS_SCOPE_OWNER',
      handoffCustodian: 'R07C_B08_HANDOFF_CUSTODIAN',
      egressCustodian: 'B08_EGRESS_CUSTODIAN',
      b03Counterpart: 'B03_ACCESS_CONTROL_COUNTERPART',
      b09Counterpart: 'B09_RECEIVER_PROTECTED_CORE_COUNTERPART',
      drainageDesignSigner: 'MP02_TERMINUS_DRAINAGE_RECEIVER_DESIGN_SIGNER',
    },
    interfaces: [
      { id: 'MP02-B08-HANDOFF', owner: 'MP02_B08_TERMINUS_SCOPE_OWNER', counterpart: 'R07C_B08_HANDOFF_CUSTODIAN', cells: current.exactInventory.acceptedB08Handoff, requirement: 'retain 719 target cells and ten accepted air openings; no replay' },
      { id: 'MP02-B08-EGRESS-INTERCEPT', owner: 'B08_EGRESS_CUSTODIAN', counterpart: 'MP02_B08_TERMINUS_SCOPE_OWNER', cells: current.exactInventory.egressShaftIntercept, requirement: 'retain, exclude, and prove no collision before a new bounded envelope' },
      { id: 'MP02-B03-APERTURE', owner: 'MP02_B08_TERMINUS_SCOPE_OWNER', counterpart: 'B03_ACCESS_CONTROL_COUNTERPART', cells: current.exactInventory.b03Aperture, requirement: 'bilateral acceptance of access class, controls, direction, failure state, exact inverse' },
      { id: 'B03-B09-CAP-AND-PORTAL', owner: 'B09_RECEIVER_PROTECTED_CORE_COUNTERPART', counterpart: 'MP02_B08_TERMINUS_SCOPE_OWNER_AND_B03_ACCESS_CONTROL_COUNTERPART', cells: current.exactInventory.b09IsolationCap, requirement: 'no alteration without receiver, guideway/entity preservation or exact migration, and bilateral acceptance' },
    ],
  },
  mandatoryFunctionalAcceptance: {
    boundedTerminus: { accepted: false, exactEnvelope: null, purpose: null, liningSupport: null, routeInterfaces: null, reason: 'The 584-cell raw volume is a corridor survey, not an approved finite terminus/control envelope.' },
    independentReturnAndEgress: { status: 'PENDING_TWO_INDEPENDENT_TERMINUS_RETURN_EGRESS_PATHS', requiredCount: 2, acceptedCount: 0, existingEgressFixtureIsNotWholeScopeAcceptance: true, eachMustProve: ['normal outbound and return traversal', 'failure-state traversal without sharing the same single point of failure', 'protected final discharge/controlled entry', 'fresh live-entity clearance and route QA'], serviceRouteMinimumCrossSection: { width: 6, height: 6 }, lockableCrossPassage: { width: 3, height: 3, maximumSpacingBlocks: 128 } },
    drainageAndReceiver: { status: 'PENDING_NAMED_FINITE_RECEIVER_AND_DRAINAGE_OUTFALL', accepted: false, receiverId: null, receiverBounds: null, platformEdgeBarrierOrGate: null, drainageCollector: null, drainageOutfall: null, overflowOrFailureTreatment: null, freeboardOrCapacityEvidence: null, rule: 'No opening/cap change may create a fluid path. Any discovered water/lava requires a finite sealed supported flow-ordered liner/plug or contained bypass.' },
    protectedCoreAndEntities: { accepted: false, B09GuidewayAndControls: 'EXCLUDED_UNTIL_EXACT_PRESERVATION_OR_ENTITY_FIRST_MIGRATION', containerAndBlockEntityInventory: 'REQUIRED_ON_FRESH_PHYSICAL_SCOPE', liveEntityClearance: 'REQUIRED_IMMEDIATELY_BEFORE_MUTATION' },
  },
  firstPhysicalPackageCondition: {
    status: 'BLOCKED_UNTIL_ALL_WHOLE_SCOPE_DESIGN_CONDITIONS_ARE_EVIDENCED',
    permittedPhysicalPackage: null,
    exactPreconditions: [
      'A named owner-approved finite terminus/receiver envelope, disjoint from the two retained egress-intercept cells, has exact source and target states, structural support, lining, and inverse.',
      'MP02, B03, and B09 counterpart owners sign one exact aperture/cap/control/guideway interface record; no unilateral aperture or cap change.',
      'Two independent protected return/egress paths are accepted and tested in normal and failure states; the existing egress fixture may be an input but does not itself satisfy this whole-scope gate.',
      'A named finite receiver, collector, outfall, overflow/failure treatment, and capacity/freeboard evidence are accepted; no uncontrolled fluid path exists.',
      'A fresh immutable source passes complete canonical states, exact forward/rollback inverse, protected/container/block-entity exclusion or migration, live entity clearance, strict-noop parser checks, exact preflights, journal plan, and post/rollback QA plan.'
    ],
    firstCompileMayOnlySelect: 'THE_ACCEPTED_FINITE_TERMINUS_OR_RECEIVER_ENVELOPE_AND_ITS_EXPLICIT_SUPPORT_DRAINAGE_AND_EGRESS_INTERFACES',
    prohibitedUntilThen: ['raw-corridor paving', 'B03 aperture opening', 'B09 cap or portal modification', 'receiver/guideway alteration', 'operation emission', 'RCON or live mutation'],
  },
  nonclaims: ['No functional terminus, receiver, public entry, egress, rescue route, B03 transfer, B09 opening, rail action, or fluid works are accepted.', 'The existing egress fixture is retained evidence, not proof of two independently accepted whole-scope routes.', 'This record emits no operation file and grants no mutation authority.'],
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="600" viewBox="0 0 1400 600"><style>text{font-family:ui-monospace,monospace;fill:#e8edf5}.h{font-size:24px;font-weight:700}.s{font-size:16px}.k{font-size:13px}.box{stroke-width:3}.ok{fill:#164b42;stroke:#70e4bf}.raw{fill:#51431d;stroke:#ffcf70}.hold{fill:#602e40;stroke:#ff91ae}.pending{fill:#263d66;stroke:#9cc2ff}.arrow{stroke:#dce7f7;stroke-width:4;marker-end:url(#a)}</style><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 Z" fill="#dce7f7"/></marker></defs><rect width="1400" height="600" fill="#101722"/><text x="42" y="46" class="h">MP02 B08 terminus / control / egress · source-bound whole-scope gate</text><text x="42" y="73" class="k">${current.sourceCapture.captureId} · ${current.sourceCapture.snapshotRoot} · no operations / no mutation</text><rect x="42" y="160" width="190" height="145" rx="12" class="box ok"/><text x="58" y="192" class="s">Accepted B08 handoff</text><text x="58" y="218" class="k">719 retained floor cells</text><text x="58" y="242" class="k">10 R07C retained-air cells</text><text x="58" y="266" class="k">retain, never replay</text><line x1="232" y1="232" x2="310" y2="232" class="arrow"/><rect x="312" y="160" width="236" height="145" rx="12" class="box raw"/><text x="328" y="192" class="s">Raw B08 continuation</text><text x="328" y="218" class="k">584 cells: 582 dry/two-clear</text><text x="328" y="242" class="k">2 occupied egress-intercept cells</text><text x="328" y="266" class="k">not a route / terminus</text><line x1="548" y1="232" x2="626" y2="232" class="arrow"/><rect x="628" y="160" width="205" height="145" rx="12" class="box hold"/><text x="644" y="192" class="s">B03 aperture</text><text x="644" y="218" class="k">20 retained air cells</text><text x="644" y="242" class="k">bilateral control required</text><text x="644" y="266" class="k">default-deny seam</text><line x1="833" y1="232" x2="910" y2="232" class="arrow"/><rect x="912" y="160" width="202" height="145" rx="12" class="box hold"/><text x="928" y="192" class="s">B09 isolation cap</text><text x="928" y="218" class="k">12 diorite closed cells</text><text x="928" y="242" class="k">receiver/guideway protected</text><text x="928" y="266" class="k">no portal opening</text><rect x="1160" y="136" width="204" height="195" rx="12" class="box pending"/><text x="1176" y="168" class="s">First-package gate</text><text x="1176" y="197" class="k">finite named receiver</text><text x="1176" y="220" class="k">drain + outfall + overflow</text><text x="1176" y="243" class="k">two independent returns</text><text x="1176" y="266" class="k">normal + failure QA</text><text x="1176" y="289" class="k">fresh release kernel</text><line x1="1114" y1="232" x2="1157" y2="232" class="arrow"/><rect x="42" y="384" width="1322" height="150" rx="12" class="box pending"/><text x="60" y="420" class="s">Hard boundary before any physical package</text><text x="60" y="450" class="k">Exact owner interfaces · finite terminus envelope · cap/aperture controls · two non-common-failure return/egress paths · finite receiver/drain/outfall · no uncontrolled water/lava route</text><text x="60" y="481" class="k">The polished-diorite and ladder cells at (2007,129,-748) and (2008,129,-748) are retained egress fixture intercepts, not clearance for corridor paving.</text><text x="60" y="512" class="k">Status: DEFAULT DENY. Operations 0 / rollback 0 / mutation authority false.</text></svg>`;
const markdown = `# MP02 B08 terminus, control, and egress whole-scope design 01\n\n**Status:** \`${contract.status}\`  \n**Mode:** immutable-source, read-only, default deny — no operation stream and no world mutation.\n\n![Whole-scope design gate](mp02-b08-terminus-control-egress-design-01.svg)\n\n## Exact current inventory\n\n- The accepted B08 handoff is retained: **719** floor targets and **10** R07C retained-air openings; it must not be replayed.\n- The source continuation has **584** cells: **582** are dry, supported, and two-clear. The other two are the retained B08 egress fixture at **(2007,129,-748)** polished diorite and **(2008,129,-748)** west-facing ladder. A raw linear volume is not an accepted terminus.\n- The B03 aperture is **20** exact air cells. The B09 cap is **12** exact polished-diorite cells. Both remain closed/default-deny interfaces.\n\n## Functional conditions\n\nA first physical release needs a named finite terminus/receiver envelope, exact named owners at every interface, a sealed support/drain/receiver/outfall design, and **two independently accepted return/egress paths** proven in normal and failure state. The existing B08 egress fixture may inform that design but does not count as a complete accepted terminus route.\n\nAny water or lava discovered in the later exact package must be handled by a finite, sealed, supported, flow-ordered containment liner/plug or contained bypass; an unbounded topology cannot be selected.\n\n## First package condition\n\nNo corridor paving, B03 aperture opening, B09 cap change, portal change, guideway action, or fluid work is eligible yet. Once all recorded design conditions are evidenced, a new compiler may select only the accepted finite terminus/receiver envelope plus its explicit support, drainage, and egress interfaces, then must pass the full fresh guarded-release kernel.\n\nMachine record: [JSON](mp02-b08-terminus-control-egress-design-01.json).\n`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp02-b08-terminus-control-egress-design-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'mp02-b08-terminus-control-egress-design-01.svg'), `${svg}\n`);
fs.writeFileSync(path.join(OUT, 'MP02-B08-TERMINUS-CONTROL-EGRESS-DESIGN-01.md'), markdown);
console.log(JSON.stringify({ status: contract.status, out: rel(OUT), mutationAuthority: false, operationsCompiled: false, rawContinuationCells: raw.total, rawContinuationClearCells: raw.paveableSupportedClear, egressInterceptCells: intercept.length, b03ApertureCells: b03Aperture.length, b09CapCells: b09Cap.length, independentReturnEgress: { required: 2, accepted: 0 }, firstPhysicalPackage: contract.firstPhysicalPackageCondition.status }, null, 2));
