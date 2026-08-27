#!/usr/bin/env node
/**
 * MP05-IF-B08-B09-TERMINUS-AND-MP02-CHAMBER-01.
 *
 * This is deliberately a read-only, default-deny acceptance contract.  It
 * identifies the exact current B08/B03/B09 boundary and all bilateral
 * receiver/return obligations before a later scope may compile any operation.
 * It does not allocate a chamber, select a door, or emit a world-edit file.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const LATEST_SNAPSHOT = 'data/worldsnap-mp01-service-staging-anvil-repair-live-post-20260826T163300Z';
const DEFAULT_OUT = 'data/world-review/mp05-if-b08-b09-terminus-mp02-chamber-contract-01-current-mp01-anvil-post-20260826T163300Z';
const ASSESSMENT = 'data/world-review/mp02-mp04-functional-successor-current-mp01-anvil-post-20260826T163300Z/mp02-mp04-hard-hold-and-first-contract-02.json';
const EGRESS = 'data/world-review/mp05-b09-b08-interface-egress-feasibility-current-anvil-post-20260826T163300Z/b08-b09-interface-egress-feasibility.json';
const RECEIVER = 'data/world-review/mp05-b09-lower-station-receiver-interface-design-current-anvil-post-20260826T163300Z/source-bound-design-hold.json';

const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const reject = (condition, message) => { if (!condition) throw new Error(`MP05 IF B08/B09 terminus contract rejected: ${message}`); };
const cellsIn = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};
const stateHash = (records) => digest(`mp05-if-b08-b09-current-state-v1\n${records.slice()
  .sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell)))
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const describe = (cells) => ({
  cellCount: cells.length,
  bounds: cells.reduce((result, cell) => ({
    minX: Math.min(result.minX, cell.x), maxX: Math.max(result.maxX, cell.x),
    minY: Math.min(result.minY, cell.y), maxY: Math.max(result.maxY, cell.y),
    minZ: Math.min(result.minZ, cell.z), maxZ: Math.max(result.maxZ, cell.z),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }),
  coordinateSetSha256: hashCells(cells),
});
const write = (filename, content) => fs.writeFileSync(filename, content);

const SNAPSHOT = option('--snapshot', LATEST_SNAPSHOT);
const OUT = option('--out', DEFAULT_OUT);
const snapshot = absolute(SNAPSHOT);
const out = absolute(OUT);
const assessmentBytes = fs.readFileSync(absolute(ASSESSMENT));
const egressBytes = fs.readFileSync(absolute(EGRESS));
const receiverBytes = fs.readFileSync(absolute(RECEIVER));
const assessment = JSON.parse(assessmentBytes);
const egress = JSON.parse(egressBytes);
const receiver = JSON.parse(receiverBytes);
const capturePath = path.join(snapshot, 'combined-zones-complete-save-capture.json');
reject(fs.existsSync(capturePath), 'missing complete-save capture manifest');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
reject(capture.immutableCopy === true, 'snapshot is not immutable');
reject(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130, 'snapshot is not the required complete 130-member capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshot, member.path);
  reject(fs.existsSync(filename), `missing captured member ${member.path}`);
  const bytes = fs.readFileSync(filename);
  reject(bytes.length === member.bytes && digest(bytes) === member.sha256, `captured member drifted ${member.path}`);
}
reject(assessment.source.root === SNAPSHOT && egress.source.snapshotRoot === SNAPSHOT && receiver.source.snapshotRoot === SNAPSHOT,
  'the input assessments do not bind to the supplied snapshot');
reject(assessment.candidateOperations === 0 && assessment.mp04.currentWorldCells === 0, 'assessment no longer supports non-authorizing MP02/MP04 disposition');

const b03Aperture = cellsIn({ minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 });
const b09Cap = cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 });
const portalCells = [{ x: 2050, y: 130, z: -748 }, { x: 2050, y: 131, z: -748 }];
const lowerInterior = cellsIn({ minX: 2051, maxX: 2056, minY: 130, maxY: 131, minZ: -748, maxZ: -748 });
const receiverStudy = cellsIn({ minX: 2051, maxX: 2053, minY: 130, maxY: 132, minZ: -750, maxZ: -748 });
const reader = new AnvilReader(path.join(snapshot, 'region'));
const states = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const [b03States, capStates, portalStates, interiorStates, studyStates] = await Promise.all([
  states(b03Aperture), states(b09Cap), states(portalCells), states(lowerInterior), states(receiverStudy),
]);
reject(b03States.every(({ state }) => state === 'minecraft:air'), 'B03 aperture source state drifted from air');
reject(capStates.every(({ state }) => state === 'minecraft:polished_diorite'), 'B09 cap source state drifted from polished diorite');
reject(portalStates.every(({ state }) => state === 'minecraft:polished_diorite'), 'candidate portal source state drifted');
reject(interiorStates.every(({ state }) => state === 'minecraft:air'), 'B09 lower interior source state drifted from air');

const census = (records) => records.reduce((result, { state }) => ({ ...result, [state]: (result[state] ?? 0) + 1 }), {});
const protectedSets = Object.fromEntries(egress.protectedSets.map((record) => [record.id, record]));
const cart = receiver.observedCurrentState.savedEntitiesInReviewHalo.find(({ id, tags }) => id === 'minecraft:minecart'
  && tags.includes('cz_r12_7464210e11d51e28eb4e133e2d40fd0b'));
reject(cart, 'authenticated R12R minecart is absent from the bound receiver survey');

const contract = {
  schemaVersion: 1,
  id: 'MP05-IF-B08-B09-TERMINUS-AND-MP02-CHAMBER-01',
  status: 'SOURCE_BOUND_DEFAULT_DENY__BILATERAL_ACCEPTANCE_AND_FUNCTIONAL_DESIGN_PENDING',
  mode: 'READ_ONLY_SOURCE_BOUND_NON_AUTHORIZING',
  disposition: {
    mutationAuthority: false,
    operationsCompiled: false,
    worldMutationsPerformed: false,
    accepted: false,
    releaseAuthorization: false,
    defaultDeny: true,
    reason: 'Current B08 reaches raw linear volume and a protected B03 aperture, but neither a bounded chamber nor a B09 receiver, independent return, or rescue discharge is accepted.',
  },
  sourceBinding: {
    snapshotRoot: relative(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    completeSaveSha256: egress.source.completeSaveSha256,
    regionSetSha256: egress.source.regionSha256,
    requiredMemberCount: capture.requiredMembers.length,
    captureManifest: relative(capturePath),
    captureManifestSha256: digest(captureBytes),
    inputs: [
      { path: ASSESSMENT, sha256: digest(assessmentBytes), role: 'current MP02/MP04 direct resurvey and no-successor finding' },
      { path: EGRESS, sha256: digest(egressBytes), role: 'current B08/B09 receiver and egress feasibility screen' },
      { path: RECEIVER, sha256: digest(receiverBytes), role: 'current lower-station accommodation and R12R protection screen' },
    ],
  },
  currentInterfaceFacts: {
    acceptedMp02Handoff: assessment.mp02DirectResurvey.acceptedHandoff,
    rawB08Continuation: assessment.mp02DirectResurvey.rawContinuation,
    b03Aperture: { ...describe(b03Aperture), requiredState: 'minecraft:air', currentStateSetSha256: stateHash(b03States) },
    b09IsolationCap: { ...describe(b09Cap), requiredState: 'minecraft:polished_diorite', currentStateSetSha256: stateHash(capStates) },
    controlledPortalStudy: { ...describe(portalCells), requiredState: 'minecraft:polished_diorite', currentStateSetSha256: stateHash(portalStates) },
    lowerInterior: { ...describe(lowerInterior), requiredState: 'minecraft:air', currentStateSetSha256: stateHash(interiorStates), qualification: 'Twelve air cells are not a receiver, platform, independent normal-walk approach, or discharge.' },
    localCrossPassageStudy: { ...describe(receiverStudy), currentStateCensus: census(studyStates), currentStateSetSha256: stateHash(studyStates), protectedOverlapCellCount: 18, qualification: 'Study envelope only; it is not a lockable cross-passage, egress route, or operation.' },
    protectedB09: {
      defaultDenySeam: protectedSets['B08-B09-DEFAULT-DENY-SEAM'],
      lowerShell: protectedSets['B09-LOWER-SHELL'],
      r12rProtectedBlocks: protectedSets['R12R-MAINTENANCE-PROTECTED-BLOCKS'],
      authenticatedMinecart: { position: cart.position, tags: cart.tags, savedEntityObservationIsNotLiveClearance: true },
    },
  },
  counterpartAcceptance: {
    b08Mp02Side: {
      owner: 'PENDING_EXACT_MP05_B08_AND_MP02_ACCEPTANCE',
      mustAccept: [
        'Bounded MP02 chamber/lobby envelope, purpose, floor/lining/support/drainage, retained R07C interface, normal and powered-failure state, exact inverse, and independent exit.',
        'Exact B08 approach, forward and return normal-walk paths, access class, and a prohibition on a floor-only one-exit extension.',
      ],
    },
    b09B03Side: {
      owner: 'PENDING_EXACT_MP05_B09_AND_B03_ACCEPTANCE',
      mustAccept: [
        'Exact owner/access class for B03 aperture, B09 seam, cap, portal cells, lower shell, guideway, and B03 indices 0..187 disposition.',
        'Named receiver with platform-edge/barrier, protected normal-walk approach, separated service/egress route, drainage/outfall, controls, and failure state.',
        'Preserve R12R protected blocks and authenticated cart, or provide an exact entity-first migration and inverse after fresh live clearance.',
      ],
    },
    joint: {
      required: true,
      acceptanceRecord: null,
      wildcardOwnershipAllowed: false,
      lastWriterWinsAllowed: false,
      partialOrOneWayOpeningAllowed: false,
      portalMayOpenOnlyAfter: ['both counterpart acceptances', 'receiver and independent return design', 'two independently protected rescue discharges', 'fresh guarded release kernel'],
    },
    mp04: {
      currentWorldCells: 0,
      authority: 'NONE_UNTIL_MP05_OWNERS_ASSIGN_AND_ACCEPT_AN_EXACT_INTEGRATED_SCOPE',
      constraint: 'MP04 may not use a drawn three-site line as a local physical package or as an implied ownership transfer.',
    },
  },
  mandatoryFunctionalAcceptance: {
    receiver: {
      status: 'PENDING_EXACT_OWNER_DESIGN',
      receiverId: null,
      accepted: false,
      platformEdgeBarrierOrGate: null,
      normalWalkApproach: null,
      drainageOutfall: null,
      b08ToB09TransferOpen: false,
    },
    returnAndRescue: {
      status: 'PENDING_TWO_INDEPENDENT_PROTECTED_DISCHARGES',
      independentProtectedDischargesRequired: 2,
      acceptedIndependentProtectedDischarges: 0,
      separatedServiceRouteRequiredCrossSection: { width: 6, height: 6 },
      lockableCrossPassageRequiredCrossSection: { width: 3, height: 3, maximumSpacingBlocks: 128 },
      acceptedNormalWalkReturn: false,
      acceptedFailureRoute: false,
    },
    exclusions: {
      b03Indices0To187: 'EXCLUDED_PENDING_SEPARATE_EXACT_INTEGRATED_DISPOSITION',
      b07EndAndB07ToB08Corridor: 'EXCLUDED_PENDING_DRY_GRAVITY_SAFE_OWNED_ROUTE_AND_EXTERIOR_RECEIVER',
      b09GuidewayAndControls: 'PROTECTED_PENDING_PRESERVE_OR_EXACT_MIGRATION',
    },
    releaseKernel: {
      status: 'PENDING_AFTER_BILATERAL_ACCEPTANCE',
      freshImmutableSourceSnapshot: null,
      completeCanonicalBlockStates: null,
      blockEntityContainerAndLiveEntityClearance: null,
      strictNoopForwardAndRollbackParserChecks: null,
      exactSourceAndProjectedRollbackPreflight: null,
      journaledExecution: null,
      freshPostSnapshotAndRollbackPreflight: null,
      endToEndNormalAndFailureRouteQa: null,
    },
  },
  nonclaims: [
    'No B08/B09 cap or B03 aperture opening is authorized.',
    'No MP02 chamber, lobby, receiver, route, egress, rescue discharge, B03 continuation, or MP04 three-site connector is built or accepted.',
    'No R12R minecart, rail, control, block entity, operation file, RCON call, or world mutation is authorized.',
    'A saved entity record is not live entity clearance, and a physical bore contact is not a functional route.',
  ],
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 500" role="img" aria-labelledby="title desc">
<title id="title">B08 B09 terminus and MP02 chamber bilateral acceptance map</title><desc id="desc">Current-source plan map: accepted B08 handoff and raw continuation stop before a default-deny B03 aperture and closed B09 cap. Receiver, independent return, and rescue discharges remain pending.</desc>
<style>text{font-family:ui-monospace,monospace;fill:#e8edf5}.h{font-size:22px;font-weight:700}.s{font-size:16px}.k{font-size:14px}.box{stroke-width:3}.arrow{stroke:#d9e2f3;stroke-width:4;marker-end:url(#a)}.hold{fill:#632e38;stroke:#ff8b98}.ok{fill:#154c43;stroke:#6ee7c4}.raw{fill:#4a3d1a;stroke:#f5cd69}.deny{fill:#5b2940;stroke:#ff82a4}.pending{fill:#243f65;stroke:#8db7ff}</style>
<defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 Z" fill="#d9e2f3"/></marker></defs><rect width="1280" height="500" fill="#101722"/><text x="42" y="46" class="h">MP05-IF-B08-B09-TERMINUS-AND-MP02-CHAMBER-01 · current immutable source</text>
<rect x="42" y="150" width="190" height="136" rx="10" class="box ok"/><text x="58" y="182" class="s">Accepted MP02 handoff</text><text x="58" y="208" class="k">719/719 retained floor</text><text x="58" y="232" class="k">10/10 R07C air openings</text><text x="58" y="256" class="k">normal return only</text>
<line x1="232" y1="218" x2="318" y2="218" class="arrow"/><rect x="320" y="150" width="230" height="136" rx="10" class="box raw"/><text x="336" y="182" class="s">Raw B08 continuation</text><text x="336" y="208" class="k">584/584 dry + supported</text><text x="336" y="232" class="k">two-clear, one proven return</text><text x="336" y="256" class="k">not a chamber / receiver</text>
<line x1="550" y1="218" x2="636" y2="218" class="arrow"/><rect x="638" y="150" width="200" height="136" rx="10" class="box deny"/><text x="654" y="182" class="s">B03 aperture</text><text x="654" y="208" class="k">20 air cells</text><text x="654" y="232" class="k">default-deny seam</text><text x="654" y="256" class="k">no transfer authority</text>
<line x1="838" y1="218" x2="924" y2="218" class="arrow"/><rect x="926" y="150" width="180" height="136" rx="10" class="box hold"/><text x="942" y="182" class="s">B09 cap</text><text x="942" y="208" class="k">12 diorite cells closed</text><text x="942" y="232" class="k">2-cell portal study</text><text x="942" y="256" class="k">R12R protected</text>
<rect x="924" y="342" width="258" height="110" rx="10" class="box pending"/><text x="940" y="374" class="s">Required before any release</text><text x="940" y="399" class="k">exact receiver + normal return</text><text x="940" y="422" class="k">6×6 service · 3×3 crosspassages</text><text x="940" y="445" class="k">2 protected rescue discharges</text><line x1="1016" y1="286" x2="1038" y2="340" class="arrow"/>
<text x="42" y="478" class="k">MP04 owns 0 current-world cells. This contract is bilateral acceptance structure only: mutation authority = false; operations = 0.</text></svg>`;
const markdown = `# MP05 IF B08/B09 terminus and MP02 chamber 01\n\n**Status:** ${contract.status}  \n**Mode:** read-only, source-bound, default-deny. No operation was compiled and no world cell changed.\n\n![Current interface map](mp05-if-b08-b09-terminus-mp02-chamber-contract-01.svg)\n\n## Bound current condition\n\n- The accepted MP02 handoff remains ${contract.currentInterfaceFacts.acceptedMp02Handoff.correctTargetCells}/719 correct, with ${contract.currentInterfaceFacts.acceptedMp02Handoff.retainedR07cOpeningsAir}/10 retained R07C openings still air.\n- B08 continuation indices 122–220 are ${contract.currentInterfaceFacts.rawB08Continuation.floorCells}/584 dry, supported, two-clear raw tunnel cells, but have **one proven return only**.\n- The exact B03 aperture is ${contract.currentInterfaceFacts.b03Aperture.cellCount} air cells; it is default-deny. The B09 isolation cap is ${contract.currentInterfaceFacts.b09IsolationCap.cellCount} polished-diorite cells and remains closed.\n- The B09 lower interior has ${contract.currentInterfaceFacts.lowerInterior.cellCount} air cells; that is not a receiver. The only local cross-passage study overlaps ${contract.currentInterfaceFacts.localCrossPassageStudy.protectedOverlapCellCount} protected cells and is not a route.\n- There are **0/2** accepted independent protected rescue discharges. MP04 has zero current-world cells.\n\n## Bilateral acceptance required\n\nThe B08/MP02 counterpart must accept a finite chamber, normal and failure states, retained R07C interface, drainage, exact forward/inverse, and an independently verified return. The B09/B03 counterpart must accept the exact aperture/cap/portal ownership, named receiver and platform-edge barrier, B03 indices 0–187 disposition, and preservation or exact migration of the R12R cart and protected guideway. Joint acceptance must precede any portal state change.\n\nA later source must still pass the full guarded release kernel, including fresh source/post snapshots, complete block states, block-entity/container and live-entity clearance, strict forward/rollback checks, exact preflights, journal, rollback preflight, and end-to-end normal/failure-route QA.\n\n## Nonclaims\n\nNo transfer, chamber, B03 continuation, B09 opening, receiver, egress, rescue discharge, rail action, MP04 connector, operation, or world mutation is authorized by this record.\n\nMachine record: [JSON](mp05-if-b08-b09-terminus-mp02-chamber-contract-01.json).\n`;

fs.mkdirSync(out, { recursive: true });
write(path.join(out, 'mp05-if-b08-b09-terminus-mp02-chamber-contract-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
write(path.join(out, 'mp05-if-b08-b09-terminus-mp02-chamber-contract-01.svg'), `${svg}\n`);
write(path.join(out, 'MP05-IF-B08-B09-TERMINUS-AND-MP02-CHAMBER-01.md'), markdown);
console.log(JSON.stringify({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_CONTRACT_EMITTED', out: relative(OUT), contractId: contract.id, mutationAuthority: contract.disposition.mutationAuthority, operationsCompiled: contract.disposition.operationsCompiled, b03ApertureCells: b03Aperture.length, b09CapCells: b09Cap.length, acceptedRescueDischarges: contract.mandatoryFunctionalAcceptance.returnAndRescue.acceptedIndependentProtectedDischarges }));
