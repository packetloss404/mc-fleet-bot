#!/usr/bin/env node
/**
 * Read-only reciprocal endpoint/receiver/return design gate for the B08–B09 seam.
 * It deliberately binds only current evidence and emits neither operations nor authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp02-b08-restricted-chamber-dry-receiver-post-20260827T023000Z');
const RECON = opt('--reconciliation', 'data/world-review/mp02-b08-post-chamber-terminus-reconciliation-20260828T060000Z/mp02-b08-post-chamber-terminus-reconciliation-01.json');
const OUT = opt('--out', 'data/world-review/mp02-mp05-b08-b09-reciprocal-endpoint-contract-01-post-20260827T023000Z');
const GENERATED_AT = opt('--generated-at', '2026-08-28T06:30:00.000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (value) => hash(fs.readFileSync(abs(value)));
const readJson = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const fail = (ok, message) => { if (!ok) throw new Error(`B08/B09 reciprocal endpoint contract rejected: ${message}`); };
const cellsIn = ({ minX, maxX, minY, maxY, minZ, maxZ }) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(state.split('[', 1)[0]) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(state.split('[', 1)[0]) || state.split('[', 1)[0].endsWith('_concrete_powder');
const stateCensus = (records) => Object.fromEntries([...records.reduce((map, { state }) => map.set(state, (map.get(state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const sameCensus = (left, right) => {
  const leftKeys = Object.keys(left).sort(); const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
};
const exact = (cells) => ({ cellCount: cells.length, coordinateSetSha256: hashCells(cells), bounds: {
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
}, cells });

const snapshot = abs(SNAPSHOT);
const capturePath = path.join(snapshot, 'combined-zones-complete-save-capture.json');
const capture = readJson(capturePath);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'snapshot is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const memberPath = path.join(snapshot, member.path);
  fail(fs.existsSync(memberPath) && fs.statSync(memberPath).size === member.bytes && hash(fs.readFileSync(memberPath)) === member.sha256, `captured member drift ${member.path}`);
}
const recon = readJson(RECON);
fail(recon.status === 'SOURCE_BOUND_RESTRICTED_TERMINUS_RECEIVER_RETURN_RECONCILIATION_INPUT_ONLY' && recon.readOnly === true && recon.mutationAuthority === false, 'reconciliation is not the accepted read-only input');
fail(recon.source.root === rel(SNAPSHOT) && recon.source.completeSaveCaptureSha256 === shaFile(capturePath), 'reconciliation does not bind supplied latest post source');

const b03 = cellsIn({ minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 });
const cap = cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 });
const portal = [{ x: 2050, y: 130, z: -748 }, { x: 2050, y: 131, z: -748 }];
const lowerInterior = cellsIn({ minX: 2051, maxX: 2056, minY: 130, maxY: 131, minZ: -748, maxZ: -748 });
const dryReceiver = cellsIn(recon.exactAsBuiltInterfaces.sealedDryReceiver.bounds);
const halo = uniqueCells([...portal, ...b03, ...cap, ...lowerInterior].flatMap((cell) => cellsIn({ minX: cell.x - 1, maxX: cell.x + 1, minY: cell.y - 1, maxY: cell.y + 1, minZ: cell.z - 1, maxZ: cell.z + 1 })));
const reader = new AnvilReader(path.join(snapshot, 'region'));
const record = async (cells) => {
  const records = [];
  for (const cell of cells) records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  return records;
};
const [b03States, capStates, portalStates, interiorStates, receiverStates, haloStates] = await Promise.all([record(b03), record(cap), record(portal), record(lowerInterior), record(dryReceiver), record(halo)]);
fail(b03States.every(({ state }) => state === 'minecraft:air'), 'B03 aperture is no longer the retained 20-cell air aperture');
fail(capStates.every(({ state }) => state === 'minecraft:polished_diorite'), 'B09 isolation cap is no longer closed polished diorite');
fail(portalStates.every(({ state }) => state === 'minecraft:polished_diorite'), 'only mapped two-cell portal is no longer closed');
fail(interiorStates.every(({ state }) => state === 'minecraft:air'), 'adjacent B09 interior is no longer observed air');
fail(sameCensus(stateCensus(receiverStates), recon.exactAsBuiltInterfaces.sealedDryReceiver.exactStateCensus), 'sealed dry receiver state census drifted');
const fluidCells = haloStates.filter(({ state }) => fluid(state));
const gravityCells = haloStates.filter(({ state }) => gravity(state));
const portalHalo = exact(halo);

const restricted = recon.restrictedReturnEvidence;
fail(restricted?.result?.startsWith('two normal/failure-isolated restricted chamber return witnesses'), 'restricted dual-return evidence missing');
const currentFacts = {
  b08Endpoint: { northHandoffThreshold: exact(recon.exactAsBuiltInterfaces.northHandoffThreshold.cells), witness: recon.exactAsBuiltInterfaces.northHandoffThreshold.returnWitness },
  shaftRecovery: { cells: exact(recon.exactAsBuiltInterfaces.shaftRecoveryThreshold.cells), witness: recon.exactAsBuiltInterfaces.shaftRecoveryThreshold.returnWitness },
  dryReceiver: { ...exact(dryReceiver), stateCensus: stateCensus(receiverStates), fluidCount: 0, gravityCount: receiverStates.filter(({ state }) => gravity(state)).length, disposition: 'RETAIN_SEALED_DRY_CONTINGENCY_RECEIVER_ONLY__NO_AUTOMATIC_OUTFALL' },
  b03Aperture: { ...exact(b03), allAir: true },
  b09IsolationCap: { ...exact(cap), allPolishedDiorite: true },
  onlyPotentialReciprocalPortal: { ...exact(portal), allPolishedDiorite: true, currentState: 'CLOSED_TRANSFER_BOUNDARY' },
  adjacentB09Interior: { ...exact(lowerInterior), allAir: true, qualification: '12 cells / 2-high only; not a bounded receiver, platform-edge separation, normal walk return, or rescue discharge.' },
  portalInteractionHalo: { ...portalHalo, fluidCellCount: fluidCells.length, gravityCellCount: gravityCells.length, fluidCells, gravityCells },
};

const contractBase = {
  schemaVersion: 1,
  id: 'MP02-MP05-B08-B09-RECIPROCAL-ENDPOINT-CONTAINMENT-RETURN-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_MINIMAL_RECIPROCAL_CONTRACT_PENDING_FINITE_B09_RECEIVER_AND_RETURN',
  mode: 'READ_ONLY_DESIGN_ONLY_DEFAULT_DENY',
  disposition: { mutationAuthority: false, operationsCompiled: 0, liveCallsPerformed: false, worldMutationsPerformed: false, executableBuild: false },
  source: { snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, completeSaveCaptureSha256: shaFile(capturePath), reconciliation: { path: rel(RECON), sha256: shaFile(RECON), id: recon.id } },
  internalAccountableRoles: {
    b08EndpointOwner: 'MP02-B08-TERMINUS-INTERFACE-OWNER',
    b09ReceiverOwner: 'MP05-B09-LOWER-RECEIVER-OWNER',
    jointBoundaryOwner: 'MP02-MP05-B08-B09-RECIPROCAL-BOUNDARY-OWNER',
    hydrologyContainmentOwner: 'MP02-MP05-DRY-RECEIVER-CONTAINMENT-OWNER',
    returnQaOwner: 'MP02-MP05-NORMAL-AND-FAILURE-RETURN-QA-OWNER'
  },
  currentFacts,
  minimumReciprocalContract: {
    sharedClosedBoundary: { portal: exact(portal), cap: exact(cap), rule: 'The two portal cells remain polished diorite until both owners accept the same exact forward, failure, and inverse state sets.' },
    b08Endpoint: { endpoint: currentFacts.b08Endpoint, permittedCurrentUse: 'restricted chamber only', requiredFutureAcceptance: ['exact access class and approach volume', 'forward and reverse B08 circulation proof', 'failure isolation from B09 transfer'] },
    b09Receiver: { currentCandidate: currentFacts.adjacentB09Interior, acceptanceNeeded: ['finite receiver bounds including full floor/walls/roof', 'canonical receiver state set and capacity purpose', 'platform-edge barrier or gate', 'independent normal-walk return endpoint', 'independent failure/rescue return endpoint'], currentResult: 'ABSENT__CURRENT_12_AIR_CELLS_CANNOT_BE_PROMOTED_TO_RECEIVER' },
    dryReceiverAndHydrology: { retainedExistingReceiver: currentFacts.dryReceiver, currentPortalHalo: currentFacts.portalInteractionHalo, ruleForAnyFutureWetScope: 'No portal or receiver operation may create a fluid path unless a finite inlet boundary, sealed receiver volume, named overflow/outfall endpoint, and tail-to-source forward plus source-to-tail inverse are source-bound. The current sealed dry receiver is not an outfall or automatic discharge.' },
    gravity: { currentPortalHaloGravityCellCount: gravityCells.length, rule: 'A future receiver/return compiler must remeasure every gravity component touching its exact target/halo and provide supported forward plus no-falling inverse order; this contract authorizes none.' },
    return: { retainedRestrictedWitnesses: restricted.result, publicOrEmergencyCredit: false, requirementForFunctionalTransfer: 'one exact normal return plus one exact non-common-failure rescue/egress return, both outside the restricted-chamber credit and with endpoint volumes/QA explicitly bound' },
    bilateralAcceptance: { required: true, accepted: false, wildcardOwnershipAllowed: false, oneWayOpeningAllowed: false, partialPortalOpeningAllowed: false }
  },
  smallestNextMeasurement: {
    id: 'B09-FINITE-RECEIVER-RETURN-BOUNDARY-SURVEY',
    reason: 'All currently observed B08 elements are retained/restricted and dry; the exact missing counterpart is the B09 receiver + two return endpoint geometry beyond the 12-cell air strip.',
    requiredScope: ['finite proposed B09 receiver bounds and one-cell halo', 'receiver floor/wall/roof and edge-barrier cells', 'normal-return endpoint volume', 'failure-return/rescue endpoint volume', 'all fluid/gravity components touching those scopes through a finite closure or observed escape frontier'],
    prohibitedInference: ['treating the 12-cell interior as a receiver', 'crediting restricted chamber witnesses as public/emergency returns', 'using the sealed dry receiver as an outfall', 'opening either portal cell']
  },
  nonClaims: ['No B08/B09 opening, crossing, receiver build, drainage discharge, egress, public terminus, rail/control action, or world mutation is authorized.', 'No operations, release manifest, or execution authorization is emitted.']
};
const contract = { ...contractBase, contractIdentitySha256: hash(`${JSON.stringify(contractBase, null, 2)}\n`) };
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620"><rect width="1200" height="620" fill="#0d1523"/><style>.h{font:700 24px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:14px system-ui;fill:#e7eef6}.b{fill:#152841;stroke:#617e97;stroke-width:2}.closed{fill:#7b4d61;stroke:#ff8b9c;stroke-width:2}.dry{fill:#275a65;stroke:#79d3e5;stroke-width:2}.open{fill:#2e5d3d;stroke:#91e5ac;stroke-width:2}</style><text class="h" x="42" y="42">B08–B09 reciprocal endpoint / containment / return — current contract map</text><text class="s" x="42" y="66">source ${capture.captureId} · design-only · all portal states retained closed</text><rect class="b" x="54" y="154" width="278" height="158" rx="10"/><text class="l" x="76" y="188">B08 restricted chamber</text><text class="s" x="76" y="216">6×9×5 retained only</text><text class="s" x="76" y="240">north witness → 2008,129,-690</text><text class="s" x="76" y="264">shaft witness → surface</text><rect class="dry" x="106" y="352" width="178" height="114" rx="10"/><text class="l" x="126" y="386">sealed dry receiver</text><text class="s" x="126" y="412">125 cells · fluid 0</text><text class="s" x="126" y="434">no automatic outfall</text><line x1="332" y1="230" x2="470" y2="230" stroke="#c8d6e5" stroke-width="3"/><text class="s" x="348" y="210">B03 aperture: 20 air</text><rect class="closed" x="470" y="154" width="176" height="158" rx="10"/><text class="l" x="492" y="188">B09 isolation cap</text><text class="s" x="492" y="216">12 PDS cells closed</text><text class="s" x="492" y="244">portal: 2 PDS cells</text><text class="s" x="492" y="268">shared reciprocal boundary</text><line x1="646" y1="230" x2="770" y2="230" stroke="#c8d6e5" stroke-width="3"/><rect class="open" x="770" y="154" width="202" height="158" rx="10"/><text class="l" x="792" y="188">B09 observed interior</text><text class="s" x="792" y="216">12 air cells / 2-high</text><text class="s" x="792" y="244">not a receiver</text><text class="s" x="792" y="268">no return endpoint</text><rect class="b" x="770" y="352" width="334" height="114" rx="10"/><text class="l" x="792" y="386">Smallest missing counterpart measurement</text><text class="s" x="792" y="412">finite receiver + barrier + normal return + failure return</text><text class="s" x="792" y="434">fluid/gravity closure and named overflow only if wet</text><text class="l" x="54" y="536">Current bounded facts: portal halo ${halo.length} cells · fluid ${fluidCells.length} · gravity ${gravityCells.length} · existing restricted witnesses do not credit public/emergency transfer.</text><text class="s" x="54" y="570">No opening or operation follows. Contract identity ${contract.contractIdentitySha256.slice(0, 16)}…</text></svg>`;
const markdown = `# MP02 / MP05 B08–B09 reciprocal endpoint, containment, and return 01\n\n**Status:** \`${contract.status}\`  \n**Mode:** source-bound read-only design gate; zero operations and no authority.\n\n![Current reciprocal interface map](mp02-mp05-b08-b09-reciprocal-endpoint-contract-01.svg)\n\nThe accepted B08 restricted chamber already retains two normal/failure-isolated **restricted** return witnesses and a 125-cell sealed dry contingency receiver. The B03 aperture remains 20 air cells, the B09 cap remains 12 polished-diorite cells, and the only 2-cell transfer aperture remains closed. The adjacent 12-cell, two-high B09 air strip is explicitly **not** a receiver or a return.\n\nThe smallest reciprocal contract therefore keeps the existing closure in place and requires an exact B09 receiver, edge barrier, normal return, and non-common-failure return before a physical transfer package can exist. Any future wet scope also needs finite inlet/receiver/overflow/outfall and flow-ordered inverse topology.\n\nNo opening, receiver construction, drainage discharge, egress, terminus, rail/control action, or world mutation is authorized.\n\nMachine record: [JSON](mp02-mp05-b08-b09-reciprocal-endpoint-contract-01.json).`;
const out = abs(OUT);
fail(!fs.existsSync(out), '--out must be fresh');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp02-mp05-b08-b09-reciprocal-endpoint-contract-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp02-mp05-b08-b09-reciprocal-endpoint-contract-01.svg'), `${svg}\n`);
fs.writeFileSync(path.join(out, 'MP02-MP05-B08-B09-RECIPROCAL-ENDPOINT-CONTAINMENT-RETURN-01.md'), `${markdown}\n`);
console.log(JSON.stringify({ status: contract.status, out: rel(OUT), portalCells: portal.length, portalHaloCells: halo.length, portalHaloFluidCells: fluidCells.length, portalHaloGravityCells: gravityCells.length, operationsCompiled: 0, mutationAuthority: false }, null, 2));
