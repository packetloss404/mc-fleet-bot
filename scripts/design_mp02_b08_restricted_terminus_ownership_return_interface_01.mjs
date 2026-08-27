#!/usr/bin/env node
/**
 * MP02 B08 restricted terminus purpose / ownership / return interface design.
 * It is an explicit cold-boundary design record, never an operation compiler.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const take = (flag) => { const i = args.indexOf(flag); return i < 0 ? null : args[i + 1] ?? null; };
const snapshotArg = take('--snapshot'); const reconciliationArg = take('--reconciliation'); const outArg = take('--out'); const generatedAtUtc = take('--generated-at') ?? new Date().toISOString();
if (!snapshotArg || !reconciliationArg || !outArg) throw new Error('Usage: --snapshot <complete-source> --reconciliation <reconciliation.json> --out <fresh-dir> [--generated-at <ISO>]');
const SNAPSHOT = path.resolve(ROOT, snapshotArg); const RECONCILIATION = path.resolve(ROOT, reconciliationArg); const OUT = path.resolve(ROOT, outArg);
if (fs.existsSync(OUT)) throw new Error(`out must be fresh: ${OUT}`);
for (const item of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, item))) throw new Error(`incomplete snapshot: ${item}`);
if (!fs.existsSync(RECONCILIATION)) throw new Error('reconciliation input is missing');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha = (file) => sha(fs.readFileSync(file));
const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const reader = new AnvilReader(path.join(SNAPSHOT, 'region'));
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const cells = (bounds) => { const result = []; for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) result.push({ x, y, z }); return result; };
const coordinateDigest = (items) => sha(items.map(({ x, y, z }) => `${x},${y},${z}`).sort().join('\n'));
const currentStates = async (items) => Promise.all(items.map(async (cell) => ({ cell, state: await state(cell) })));
const currentSetDigest = (items) => sha(items.map(({ cell, state: value }) => `${cell.x},${cell.y},${cell.z}:${value}`).sort().join('\n'));
const reconciliation = JSON.parse(fs.readFileSync(RECONCILIATION, 'utf8'));
if (reconciliation.status !== 'SOURCE_BOUND_RESTRICTED_TERMINUS_RECEIVER_RETURN_RECONCILIATION_INPUT_ONLY') throw new Error('requires the passed post-chamber reconciliation input');
const captureHash = fileSha(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
if (reconciliation.source.completeSaveCaptureSha256 !== captureHash) throw new Error('reconciliation source capture does not bind this snapshot');

const boundarySpecs = [
  { id: 'MP02-B08-R07C-NORTH-HANDOFF', owner: 'MP02_B08_RESTRICTED_TERMINUS_STEWARD', counterpart: 'R07C_B08_HANDOFF_CUSTODIAN', bounds: { minX: 2006, maxX: 2011, minY: 129, maxY: 131, minZ: -742, maxZ: -742 }, expected: null, access: 'RESTRICTED_SERVICE_BIDIRECTIONAL_RETURN_ONLY', mutation: 'RETAIN_NO_REPLAY_OR_PROFILE_CHANGE', proof: { normalTarget: [2008, 129, -690], failureIsolation: 'north boundary failure leaves shaft witness' } },
  { id: 'MP02-B08-SHAFT-RECOVERY-THRESHOLD', owner: 'B08_RESTRICTED_RETURN_CUSTODIAN', counterpart: 'MP02_B08_RESTRICTED_TERMINUS_STEWARD', bounds: { minX: 2007, maxX: 2008, minY: 129, maxY: 129, minZ: -748, maxZ: -748 }, expected: null, access: 'RESTRICTED_RECOVERY_RETURN_ONLY', mutation: 'RETAIN_EXCLUDE_FROM_FUTURE_PACKAGE', proof: { normalTarget: [2005, 208, -748], failureIsolation: 'shaft threshold failure leaves north witness' } },
  { id: 'MP02-B03-COLD-AIR-APERTURE', owner: 'MP02_B08_RESTRICTED_TERMINUS_STEWARD', counterpart: 'B03_ACCESS_CONTROL_COUNTERPART', bounds: { minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 }, expected: 'minecraft:air', access: 'COLD_SEALED_VISUAL_AIR_BOUNDARY__NO_CROSSING', mutation: 'NO_UNILATERAL_OPENING_OR_CONTROL_CHANGE', proof: { status: 'no B03 crossing, transfer, or egress claim' } },
  { id: 'MP02-B09-PROTECTED-ISOLATION-CAP', owner: 'B09_RECEIVER_PROTECTED_CORE_CUSTODIAN', counterpart: 'MP02_B08_RESTRICTED_TERMINUS_STEWARD', bounds: { minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 }, expected: 'minecraft:polished_diorite', access: 'COLD_SEALED_PROTECTED_CORE_BOUNDARY__NO_PORTAL', mutation: 'NO_CAP_GUIDEWAY_OR_CONTROL_MUTATION', proof: { status: 'B09 guideway/controls excluded; no portal is designed' } },
];
const interfaces = [];
for (const spec of boundarySpecs) { const items = await currentStates(cells(spec.bounds)); if (spec.expected && items.some(({ state: value }) => value !== spec.expected)) throw new Error(`${spec.id} state drift`); interfaces.push({ ...spec, cellCount: items.length, coordinateSetSha256: coordinateDigest(items.map(({ cell }) => cell)), currentStateSetSha256: currentSetDigest(items), currentStates: items }); }
const chamberCells = await currentStates(cells({ minX: 2006, maxX: 2011, minY: 129, maxY: 133, minZ: -750, maxZ: -742 }));
const receiver = reconciliation.exactAsBuiltInterfaces.sealedDryReceiver;
const receiverCells = await currentStates(cells(receiver.bounds));
const receiverSetSha = currentSetDigest(receiverCells);
if (receiverCells.length !== 125 || receiverCells.some(({ state: value }) => value.startsWith('minecraft:water') || value.startsWith('minecraft:lava'))) throw new Error('restricted receiver no longer dry or bound');
const qa = reconciliation.restrictedReturnEvidence.immutablePostQa;
if (!qa.routeChecks.every(({ correct }) => correct)) throw new Error('restricted return post-QA evidence drifted');

const status = 'SOURCE_BOUND_RESTRICTED_TERMINUS_PURPOSE_OWNERSHIP_RETURN_INTERFACE_INPUT_ONLY';
const report = {
  schemaVersion: 1, id: 'MP02-B08-RESTRICTED-TERMINUS-PURPOSE-OWNERSHIP-RETURN-INTERFACE-01', generatedAtUtc, status,
  readOnly: true, worldMutationPerformed: false, mutationAuthority: false, operationsCompiled: 0, forwardOperations: [], rollbackOperations: [],
  source: { root: path.relative(ROOT, SNAPSHOT), completeSaveCaptureSha256: captureHash, reconciliation: { path: path.relative(ROOT, RECONCILIATION), sha256: fileSha(RECONCILIATION) } },
  restrictedTerminusPurpose: {
    id: 'MP02-B08-RESTRICTED-SERVICE-STAGING-AND-CONTINGENCY-NODE',
    purpose: 'A non-public maintenance/service staging node linking the retained R07C handoff to a controlled shaft-recovery return while retaining a sealed dry contingency receiver.',
    exactEnvelope: { bounds: { minX: 2006, maxX: 2011, minY: 129, maxY: 133, minZ: -750, maxZ: -742 }, cellCount: chamberCells.length, coordinateSetSha256: coordinateDigest(chamberCells.map(({ cell }) => cell)), currentStateSetSha256: currentSetDigest(chamberCells) },
    permittedUse: ['restricted service staging', 'controlled inspection', 'contingency response at the sealed receiver'],
    prohibitedUse: ['public platform', 'public entry', 'passenger transfer', 'public/emergency egress commissioning', 'B03/B09 interchange'],
  },
  internalAccountableOwnership: {
    assignedUnderGovernorDirective: true,
    rules: ['exact coordinate ownership only', 'no wildcard ownership', 'no unilateral seam/cap change', 'no last-writer-wins reconciliation'],
    roles: [
      { role: 'MP02_B08_RESTRICTED_TERMINUS_STEWARD', owns: 'restricted chamber envelope and non-public operating purpose' },
      { role: 'R07C_B08_HANDOFF_CUSTODIAN', owns: 'accepted handoff side and its retained 719/ten-air-opening release boundary' },
      { role: 'B08_RESTRICTED_RETURN_CUSTODIAN', owns: 'shaft recovery threshold and its restricted-only status' },
      { role: 'MP02_DRY_RECEIVER_CUSTODIAN', owns: 'sealed receiver and no-automatic-outfall disposition' },
      { role: 'B03_ACCESS_CONTROL_COUNTERPART', owns: 'B03 side of cold air aperture; no crossing is delegated' },
      { role: 'B09_RECEIVER_PROTECTED_CORE_CUSTODIAN', owns: 'B09 cap/guideway/control protected core; no portal is delegated' },
    ],
  },
  interfaces,
  receiverBoundary: { id: 'MP02-B08-SEALED-DRY-CONTINGENCY-RECEIVER', owner: 'MP02_DRY_RECEIVER_CUSTODIAN', bounds: receiver.bounds, cellCount: receiverCells.length, coordinateSetSha256: coordinateDigest(receiverCells.map(({ cell }) => cell)), currentStateSetSha256: receiverSetSha, expectedStateCensus: receiver.exactStateCensus, currentStateCensus: receiverCells.reduce((acc, { state: value }) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {}), conditions: ['sealed dry retention', 'no automatic outfall', 'no B03/B09 discharge path', 'exclude from any unrelated terminus package'] },
  restrictedReturnContract: { scope: 'restricted chamber only', witnesses: qa.routeChecks, normalAndSingleFailureEvidence: 'six immutable-post checks passed; both exact normal witnesses and their opposite surviving failure witness are retained', noPublicEgressClaim: true, noIndependentPublicEgressClaim: true },
  nextPhysicalBoundary: { allowed: false, reason: 'This input resolves the restricted purpose and coordinate stewardship only. It intentionally supplies neither public-terminus nor public-egress acceptance.', futurePrerequisites: ['accepted public/controlled endpoint programme if one is requested', 'two public/emergency failure-independent egress paths if public commissioning is requested', 'separate bilateral B03/B09 interface contract before a crossing, cap change, or portal', 'fresh dedicated physical compiler/kernel for any mutation'] },
  nonClaims: ['No operations, RCON, live calls, or mutation authority.', 'No public terminus, public route, passenger service, public/emergency egress, B03 transfer, B09 portal, rail/control action, or fluid outfall.'],
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><style>.b{fill:#111827}.t{fill:#f8fafc;font:700 25px system-ui}.s{fill:#cbd5e1;font:14px system-ui}.k{fill:#e2e8f0;font:13px ui-monospace,monospace}.r{fill:#fda4af;font:700 14px system-ui}</style><rect class="b" width="1200" height="720"/><text x="42" y="42" class="t">MP02 B08 restricted terminus ownership / return interfaces</text><text x="42" y="67" class="s">design-only plan — all B03/B09 boundaries cold and sealed</text><rect x="90" y="110" width="635" height="520" fill="#172033" stroke="#64748b"/><rect x="190" y="220" width="260" height="185" fill="#22d3ee" opacity=".7"/><rect x="423" y="245" width="27" height="130" fill="#ef4444"/><rect x="260" y="395" width="42" height="155" fill="#86efac"/><path d="M90 310 L190 310" stroke="#fbbf24" stroke-width="20"/><text x="100" y="285" class="k">R07C handoff</text><text x="205" y="315" class="k">restricted chamber</text><text x="470" y="290" class="r">B03 cold air / B09 cap</text><text x="310" y="490" class="k">shaft recovery</text><text x="765" y="130" class="t" style="font-size:19px">Purpose and boundary</text><text x="765" y="176" class="k">restricted service staging only</text><text x="765" y="202" class="k">sealed dry contingency receiver</text><text x="765" y="242" class="k">north handoff: retained return</text><text x="765" y="268" class="k">shaft: retained recovery return</text><text x="765" y="308" class="r">B03: no crossing/control/egress</text><text x="765" y="334" class="r">B09: no cap/portal/guideway action</text><text x="765" y="394" class="s">No public platform or public egress.</text><text x="765" y="416" class="s">No operations compiled.</text></svg>`;
const markdown = `# MP02 B08 restricted terminus purpose / ownership / return interface\n\n**Status:** \`${status}\`  \n**Mode:** source-bound design input. No operation, live call, or mutation authority.\n\n![Restricted terminus ownership map](mp02-b08-restricted-terminus-ownership-return-interface-01.svg)\n\n## Adopted restricted purpose\n\nThe executed B08 chamber is now exactly scoped as a **restricted service staging and contingency node**: it connects the retained R07C handoff and controlled shaft recovery while retaining the sealed dry receiver. It is not a public platform, entry, transfer, or egress facility.\n\n## Exact stewardship\n\nInternal accountable owners are assigned to the chamber, handoff, shaft-return threshold, dry receiver, B03 cold aperture, and B09 protected cap. The B03/B09 seams remain cold: no crossing, cap change, portal, guideway/control action, or unilateral state change is granted.\n\n## Return and receiver boundaries\n\nThe two pre-existing immutable-post return witnesses remain restricted evidence only. The \`125\`-cell receiver remains sealed/dry with no automatic outfall and is excluded from unrelated future packages.\n\n## Non-claims\n\nThis does not commission a public terminus or public/emergency egress, and it emits no operations. A later public scope still needs its own endpoint programme, independent egress proof, bilateral B03/B09 terms, and a guarded physical compiler.\n`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp02-b08-restricted-terminus-purpose-ownership-return-interface-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'mp02-b08-restricted-terminus-ownership-return-interface-01.svg'), `${svg}\n`);
fs.writeFileSync(path.join(OUT, 'MP02-B08-RESTRICTED-TERMINUS-PURPOSE-OWNERSHIP-RETURN-INTERFACE-01.md'), markdown);
process.stdout.write(`${JSON.stringify({ status, mutationAuthority: false, operationsCompiled: 0, interfaces: interfaces.map(({ id, cellCount, access }) => ({ id, cellCount, access })), restrictedPurpose: report.restrictedTerminusPurpose.id, out: path.relative(ROOT, OUT) }, null, 2)}\n`);
