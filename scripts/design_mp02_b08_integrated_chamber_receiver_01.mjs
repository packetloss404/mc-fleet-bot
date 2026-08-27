#!/usr/bin/env node
/**
 * MP02 B08 first integrated chamber / receiver feasibility design.
 *
 * This is intentionally not a compiler.  It binds one finite chamber, dry
 * containment receiver, both separately-directed existing returns, and the
 * B03/B09 preservation set to a complete immutable source.  It emits no RCON
 * operation, no target state map, and no mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const fail = (message) => { throw new Error(`MP02 B08 integrated chamber/receiver design rejected: ${message}`); };
const abs = (name) => path.resolve(ROOT, name);
const rel = (name) => path.relative(ROOT, abs(name)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const cellsIn = ({ minX, maxX, minY, maxY, minZ, maxZ }) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const boundsOf = (cells) => ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});
const describe = (cells, includeCells = false) => ({ cellCount: cells.length, bounds: boundsOf(cells), coordinateSetSha256: hashCells(cells), ...(includeCells ? { cells } : {}) });
const nameOf = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder', 'minecraft:scaffolding']);
const stateHash = (records) => sha(records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n'));
const census = (records) => Object.fromEntries([...records.reduce((acc, { state }) => acc.set(state, (acc.get(state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const regionIdentity = (region) => {
  const digest = crypto.createHash('sha256'); let bytes = 0;
  const names = fs.readdirSync(region).filter((name) => name.endsWith('.mca')).sort();
  for (const name of names) { const payload = fs.readFileSync(path.join(region, name)); digest.update(name); digest.update('\0'); digest.update(payload); digest.update('\0'); bytes += payload.length; }
  return { sha256: digest.digest('hex'), regionFileCount: names.length, bytes };
};
const faceHalo = (cells) => uniqueCells(cells.flatMap(({ x, y, z }) => [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]].map(([nx, ny, nz]) => ({ x: nx, y: ny, z: nz }))));

const snapshotArg = option('--snapshot');
const surveyArg = option('--survey');
const outArg = option('--out');
if (!snapshotArg || !surveyArg || !outArg) fail('usage: --snapshot <complete-snapshot> --survey <current-successor-survey.json> --out <fresh-directory>');
const SNAPSHOT = abs(snapshotArg); const SURVEY = abs(surveyArg); const OUT = abs(outArg);
if (fs.existsSync(OUT)) fail(`out must be fresh: ${rel(OUT)}`);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, member))) fail(`incomplete snapshot; missing ${member}`);
if (!fs.existsSync(SURVEY)) fail('successor survey is missing');
const captureBytes = fs.readFileSync(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const capture = JSON.parse(captureBytes);
if (capture.immutableCopy !== true || !Array.isArray(capture.requiredMembers)) fail('snapshot is not an immutable complete capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(SNAPSHOT, member.path);
  if (!fs.existsSync(filename) || fs.statSync(filename).size !== member.bytes || sha(fs.readFileSync(filename)) !== member.sha256) fail(`captured member drift: ${member.path}`);
}
const surveyBytes = fs.readFileSync(SURVEY); const survey = JSON.parse(surveyBytes);
if (survey.status !== 'HOLD_NO_OWNED_FUNCTIONAL_SUCCESSOR' || abs(survey.sourceSnapshot?.root ?? '') !== SNAPSHOT) fail('survey is not the current source-bound successor hold');
if (survey.rawSuccessorVoid?.conditions?.paveableSupportedClear !== 582 || survey.rawSuccessorVoid?.conditions?.fluids?.length !== 0) fail('raw successor condition changed');

// The six-wide shell already exists as a dry void.  The design starts at the
// shaft turn so its two exit thresholds face separate external legs.  It stops
// 37 blocks short of the B03 aperture and never enters B09.
const chamberInterior = cellsIn({ minX: 2006, maxX: 2011, minY: 129, maxY: 133, minZ: -750, maxZ: -742 });
const chamberEnvelope = cellsIn({ minX: 2005, maxX: 2012, minY: 125, maxY: 134, minZ: -751, maxZ: -741 });
const northReturnThreshold = cellsIn({ minX: 2006, maxX: 2011, minY: 129, maxY: 131, minZ: -742, maxZ: -742 });
const shaftReturnThreshold = [{ x: 2008, y: 129, z: -748 }];
const dryCollectionInlet = cellsIn({ minX: 2009, maxX: 2011, minY: 128, maxY: 128, minZ: -750, maxZ: -748 });
const receiverCore = cellsIn({ minX: 2009, maxX: 2011, minY: 125, maxY: 127, minZ: -750, maxZ: -748 });
const receiverContainment = cellsIn({ minX: 2008, maxX: 2012, minY: 124, maxY: 128, minZ: -751, maxZ: -747 });
const receiverOuterShell = receiverContainment.filter((cell) => !new Set(receiverCore.map(cellKey)).has(cellKey(cell)));
const shaftCollar = cellsIn({ minX: 2007, maxX: 2009, minY: 131, maxY: 206, minZ: -749, maxZ: -747 }).filter(({ x, z }) => !(x === 2008 && z === -748));
const manualRecoveryLanding = cellsIn({ minX: 2003, maxX: 2005, minY: 208, maxY: 209, minZ: -749, maxZ: -747 });
const b03Aperture = cellsIn({ minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 });
const b09Cap = cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 });
const b09Guideway = uniqueCells([
  ...cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 }),
  { x: 2057, y: 130, z: -748 }, { x: 2073, y: 130, z: -748 }, { x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 },
]);
const northExternalLeg = []; for (let z = -742; z <= -690; z += 1) northExternalLeg.push({ x: 2008, y: 129, z });
const shaftExternalLeg = []; for (let y = 129; y <= 208; y += 1) shaftExternalLeg.push({ x: 2008, y, z: -748 });
const northLegKeys = new Set(northExternalLeg.map(cellKey));
const shaftLegKeys = new Set(shaftExternalLeg.map(cellKey));
const externalLegIntersection = northExternalLeg.filter((cell) => shaftLegKeys.has(cellKey(cell)));
if (externalLegIntersection.length !== 0) fail('return-leg geometry is not disjoint beyond the chamber thresholds');

const reader = new AnvilReader(path.join(SNAPSHOT, 'region'));
const stateRecords = async (cells) => {
  const records = [];
  for (const cell of uniqueCells(cells)) records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  return records;
};
const [chamberRecords, chamberHaloRecords, coreRecords, containmentRecords, inletRecords, collarRecords, recoveryRecords, apertureRecords, capRecords, guidewayRecords] = await Promise.all([
  stateRecords(chamberInterior), stateRecords(faceHalo(chamberEnvelope)), stateRecords(receiverCore), stateRecords(receiverContainment), stateRecords(dryCollectionInlet), stateRecords(shaftCollar), stateRecords(manualRecoveryLanding), stateRecords(b03Aperture), stateRecords(b09Cap), stateRecords(b09Guideway),
]);
const allStudyRecords = [...chamberRecords, ...chamberHaloRecords, ...coreRecords, ...containmentRecords, ...inletRecords, ...collarRecords];
const hazards = allStudyRecords.filter(({ state }) => FLUID.has(nameOf(state)) || GRAVITY.has(nameOf(state)) || /waterlogged=true/.test(state));
if (hazards.length) fail(`fluid/gravity/waterlogged state in chamber or receiver feasibility envelope: ${JSON.stringify(hazards.slice(0, 4))}`);
if (!apertureRecords.every(({ state }) => state === 'minecraft:air')) fail('B03 aperture no longer has preserved air state');
if (!capRecords.every(({ state }) => state === 'minecraft:polished_diorite')) fail('B09 isolation cap no longer has preserved polished-diorite state');
const shaftThresholdState = stateToCommandString(await reader.blockState(2008, 129, -748));
if (shaftThresholdState !== 'minecraft:ladder[facing=west,waterlogged=false]') fail('shaft threshold drifted');
if (recoveryRecords.some(({ state }) => FLUID.has(nameOf(state)) || GRAVITY.has(nameOf(state)) || /waterlogged=true/.test(state))) fail('surface manual-recovery landing has a fluid/gravity condition');

const route = (id, from, to, pad) => {
  const result = spawnSync(process.execPath, ['scripts/reachability.mjs', '--regions', path.join(SNAPSHOT, 'region'), '--from', from.join(','), '--to', to.join(','), '--pad', String(pad), '--budget', '1000000'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  return { id, from, to, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-3) };
};
const routeChecks = [
  route('north-return-to-accepted-handoff', [2008, 129, -742], [2008, 129, -690], 12),
  route('shaft-return-to-guarded-surface-landing', [2008, 129, -748], [2005, 208, -748], 12),
];
if (routeChecks.some(({ passed }) => !passed)) fail(`current independent-return witness failed: ${JSON.stringify(routeChecks)}`);

const candidateEntities = [];
const entityReader = new AnvilReader(path.join(SNAPSHOT, 'entities'));
const studyCells = uniqueCells([...chamberEnvelope, ...receiverContainment, ...shaftCollar, ...northReturnThreshold, ...shaftReturnThreshold]);
const studyKeys = new Set(studyCells.map(cellKey));
for (const chunkKey of new Set(studyCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [x, z] = chunkKey.split(',').map(Number);
  const blockChunk = await reader.chunk(x, z);
  for (const value of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
    const cell = { x: Number(value.x), y: Number(value.y), z: Number(value.z) };
    if (studyKeys.has(cellKey(cell))) candidateEntities.push({ kind: 'block_entity', id: value.id ?? value.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(x, z);
  for (const value of entityChunk?.Entities ?? []) {
    if (!Array.isArray(value.Pos)) continue;
    const [xPos, yPos, zPos] = value.Pos.map(Number); const cell = { x: Math.floor(xPos), y: Math.floor(yPos), z: Math.floor(zPos) };
    if (studyKeys.has(cellKey(cell))) candidateEntities.push({ kind: 'entity', id: value.id ?? value.Id ?? null, cell });
  }
}

const identity = regionIdentity(path.join(SNAPSHOT, 'region'));
const report = {
  schemaVersion: 1,
  id: 'MP02-B08-INTEGRATED-CHAMBER-RECEIVER-FEASIBILITY-01',
  generatedAtUtc: option('--generated-at', new Date().toISOString()),
  status: 'FINITE_DESIGN_CANDIDATE__NO_OPERATION_UNTIL_ALL_ACCEPTANCE_INPUTS_ARE_BOUND',
  readOnly: true,
  worldMutationPerformed: false,
  mutationAuthority: false,
  operationCounts: { forward: 0, rollback: 0 },
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), region: identity, successorSurvey: { path: rel(SURVEY), sha256: sha(surveyBytes) } },
  finiteEnvelope: {
    id: 'MP02-B08-RESTRICTED-CHAMBER-AND-DRY-RECEIVER-01',
    purpose: 'first bounded restricted SubTropolis controlled-entry / crew-recovery chamber; not a public lobby, B03/B09 transfer, rail station, or utility commissioning',
    chamberInterior: { ...describe(chamberInterior), currentStateCensus: census(chamberRecords), currentStateSetSha256: stateHash(chamberRecords) },
    constructionEnvelope: describe(chamberEnvelope),
    shaftIsolationCollar: { ...describe(shaftCollar), currentStateCensus: census(collarRecords), currentStateSetSha256: stateHash(collarRecords), purpose: 'preserve the one-cell backed ladder route while preventing a failed north boundary from being bypassed through the surrounding open shaft volume' },
    sourceFaceHalo: { ...describe(faceHalo(chamberEnvelope)), currentStateCensus: census(chamberHaloRecords), currentStateSetSha256: stateHash(chamberHaloRecords) },
    sourceHazards: hazards,
    targetStatesSpecified: false,
    exactInverseSpecified: false,
  },
  dryDrainageReceiver: {
    id: 'MP02-B08-DRY-CONTAINMENT-SUMP-01',
    designRule: 'zero-discharge dry contingency only: current source and every retained interface are dry; if a new water/lava component is discovered, stop this design and first compile its own finite sealed flow-ordered containment boundary.',
    collectionInlet: { ...describe(dryCollectionInlet), currentStateCensus: census(inletRecords), currentStateSetSha256: stateHash(inletRecords) },
    receiverCore: { ...describe(receiverCore), currentStateCensus: census(coreRecords), currentStateSetSha256: stateHash(coreRecords), theoreticalContainedCellCapacity: receiverCore.length },
    outerContainment: { ...describe(receiverContainment), currentStateCensus: census(containmentRecords), currentStateSetSha256: stateHash(containmentRecords), outerShellCellCount: receiverOuterShell.length },
    overflow: { design: 'a sealed outer containment shell; no open overflow path, no unbounded discharge, and no source-fluid interface', bounded: true },
    outfall: { mode: 'manual sealed recovery only', exactSurfaceRecoveryLocus: { ...describe(manualRecoveryLanding), currentStateCensus: census(recoveryRecords), currentStateSetSha256: stateHash(recoveryRecords) }, passiveFluidPathExists: false, bounded: true, acceptanceRequirement: 'any future automatic outfall needs a separate exact receiver, flow path, overflow, source/rollback states, and live safety kernel' },
    currentFluidOrGravityHazards: hazards,
  },
  returns: {
    required: 2,
    candidateCount: 2,
    northHandoffReturn: { externalThreshold: describe(northReturnThreshold, true), externalLeg: describe(northExternalLeg, true), currentReachability: routeChecks[0], role: 'retained accepted B08 handoff direction' },
    shaftSurfaceReturn: { externalThreshold: { ...describe(shaftReturnThreshold, true), currentState: shaftThresholdState }, externalLeg: describe(shaftExternalLeg, true), currentReachability: routeChecks[1], role: 'retained backed ladder shaft to guarded 3x3 recovery landing' },
    nonCommonFailureProof: { externalLegIntersection, condition: 'external legs have no shared station after they leave the explicitly separate chamber thresholds. A finite 608-cell shaft isolation collar plus a taller north fire boundary are mandatory before failure-state route QA; without them the source vertical void bypasses the north boundary.', passedForSourceTopology: true, acceptedForRelease: false },
  },
  preservation: {
    b03Aperture: { ...describe(b03Aperture, true), requiredState: 'minecraft:air', currentStateSetSha256: stateHash(apertureRecords), disposition: 'RETAIN__NO_DOOR_OR_ACCESS_CHANGE' },
    b09IsolationCap: { ...describe(b09Cap, true), requiredState: 'minecraft:polished_diorite', currentStateSetSha256: stateHash(capRecords), disposition: 'RETAIN__NO_OPENING' },
    b09ProtectedGuidewayAndControls: { ...describe(b09Guideway, true), currentStateCensus: census(guidewayRecords), currentStateSetSha256: stateHash(guidewayRecords), disposition: 'EXCLUDE__NO_RAIL_CONTROL_OR_ENTITY_ACTION' },
  },
  savedSnapshotClearance: { scopedCells: describe(studyCells), savedBlockEntitiesAndEntities: candidateEntities, status: candidateEntities.length === 0 ? 'CLEAR_ON_IMMUTABLE_SOURCE_ONLY' : 'BLOCKED_BY_SAVED_ENTITY_OR_BLOCK_ENTITY' },
  releasePreconditions: [
    'Compile complete canonical source and target state maps plus exact reverse inverse for the finite chamber, dry receiver, shell, partitions, and two return interfaces; this feasibility record deliberately supplies none.',
    'Freeze the chamber internal fire/overflow partition and prove the two returns in normal and defined failure states, with no shared failure outside the chamber thresholds.',
    'Keep all B03 aperture, B09 cap, guideway, control, and entity cells as exact no-touch preservation sets; do not turn this into a B03/B09 connection.',
    'If fluid/gravity appears in a new source, first contain the finite component tail-to-source; no assumed drainage, open outfall, or local solid face is a substitute.',
    'Use a fresh immediate immutable source, block-entity/container and live-entity gates, strict parser/preflight checks, journalled execution, fresh post capture, rollback preflight, and independent route/containment QA.'
  ],
  firstPackageEligibility: false,
  nonclaims: ['No operation package is emitted.', 'No public entry, emergency egress, B03/B09 opening, B09 receiver, guideway, rail, control, or automated fluid outfall is accepted.', 'The two source-reachable routes are feasibility witnesses only, not commissioned whole-scope egress acceptance.'],
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="620" viewBox="0 0 1320 620"><style>.bg{fill:#101722}.t{font:700 25px system-ui;fill:#f8fafc}.s{font:15px ui-monospace,monospace;fill:#dbeafe}.k{font:13px ui-monospace,monospace;fill:#cbd5e1}.wall{fill:#303b4e}.void{fill:#64748b}.room{fill:#17a2b8;fill-opacity:.55;stroke:#5eead4;stroke-width:3}.sump{fill:#a855f7;fill-opacity:.7;stroke:#e9d5ff;stroke-width:2}.returnA{stroke:#fbbf24;stroke-width:9;fill:none}.returnB{stroke:#7dd3fc;stroke-width:9;fill:none}.hold{fill:#6b2838;stroke:#fda4af;stroke-width:3}.ok{fill:#164b42;stroke:#70e4bf;stroke-width:3}</style><rect class="bg" width="1320" height="620"/><text x="38" y="44" class="t">MP02 B08 finite chamber / dry receiver feasibility — no operations</text><text x="38" y="70" class="k">${identity.sha256} · source-bound plan at y=129 · all B03/B09 cells remain preservation sets</text><rect x="48" y="125" width="720" height="374" class="wall"/><rect x="104" y="176" width="390" height="78" class="void"/><path d="M494 215 H682" class="void" stroke="#64748b" stroke-width="78"/><rect x="422" y="176" width="72" height="78" class="room"/><rect x="446" y="201" width="36" height="36" class="sump"/><path d="M458 176 V142" class="returnA"/><path d="M458 254 V370" class="returnB"/><rect x="396" y="128" width="122" height="28" class="ok"/><text x="408" y="148" class="k">north handoff return</text><rect x="398" y="380" width="120" height="33" class="ok"/><text x="407" y="402" class="k">shaft / surface return</text><rect x="678" y="170" width="50" height="90" class="hold"/><text x="678" y="278" class="k">B03 aperture retained</text><rect x="738" y="170" width="18" height="90" class="hold"/><text x="687" y="303" class="k">B09 cap / guideway excluded</text><text x="56" y="534" class="s">cyan: finite 6×9 chamber inner volume · purple: 3×3 dry sump inlet / core · yellow/blue: separately directed external return legs</text><text x="56" y="561" class="k">The physical package cannot be compiled until its target shell, fire/overflow partition, inverse, fresh entity clearance, and failure-state return QA exist.</text><rect x="824" y="125" width="446" height="374" rx="12" class="hold"/><text x="850" y="167" class="s">Acceptance ledger</text><text x="850" y="205" class="k">Finite chamber envelope: ${chamberEnvelope.length} cells</text><text x="850" y="231" class="k">Dry receiver containment: ${receiverContainment.length} cells</text><text x="850" y="257" class="k">Current fluid/gravity hazards: ${hazards.length}</text><text x="850" y="283" class="k">Current return witnesses: 2 / 2</text><text x="850" y="309" class="k">B03 aperture preserved: 20 air cells</text><text x="850" y="335" class="k">B09 cap preserved: 12 diorite cells</text><text x="850" y="375" class="s">Still required</text><text x="850" y="404" class="k">exact target + inverse · internal partition</text><text x="850" y="429" class="k">normal/failure route proof · fresh kernel</text><text x="850" y="454" class="k">no B03/B09 opening or automatic outfall</text></svg>`;
const markdown = `# MP02 B08 integrated chamber / dry receiver feasibility 01\n\n**Status:** \`${report.status}\`  \n**Mode:** source-bound design only; zero operations and no world mutation.\n\n![MP02 B08 chamber / receiver design](mp02-b08-integrated-chamber-receiver-feasibility-01.svg)\n\n## Bounded first design\n\nThe first substantive MP02 candidate is a **restricted 6×9 chamber** at\n\`x=2006..2011, y=129..133, z=-750..-742\`, inside a finite\n\`${chamberEnvelope.length}\`-cell construction envelope. It is a controlled entry / crew\nrecovery room, not a public lobby or a B03/B09 transfer. The source has no fluid,\nwaterlogged, or gravity state in its chamber/receiver study envelope.\n\nThe dry contingency receiver is finite: a 3×3 collection inlet, 3×3×3 core,\nand a 5×5×5 outer containment envelope. It has **no passive outfall**. Recovery\nis manual and sealed through the already guarded surface landing; any discovered\nwater or lava invalidates this design until its own finite, liner-first containment\npackage is compiled. No unbounded discharge is proposed.\n\n## Two directed return witnesses\n\n- North: the chamber’s six-wide north threshold reaches the accepted B08 handoff.\n- Surface: the retained ladder threshold reaches the guarded 3×3 surface landing.\n\nTheir external legs diverge at separate chamber-side thresholds. This proves a\nsource-topology feasibility witness only. It does **not** accept the routes for\nnormal/failure operation until the chamber gets an exact internal fire/overflow\npartition, target states, inverse, and independent failure-state QA.\n\n## Preservation and hard stop\n\nThe 20-cell B03 aperture stays air, the 12-cell B09 cap stays polished diorite,\nand all 19 protected B09 guideway/control cells remain no-touch. The design grants\nno B03/B09, guideway, rail, controls, or automatic fluid-outfall authority.\n\nBefore any compiler can emit an operation, every finite component needs canonical\ntarget states and inverse, current entity/container clearance, a fresh immediate\nsource, strict parser/preflight/journal gates, post capture, rollback proof, and\nnormal plus failure-state route QA.\n`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp02-b08-integrated-chamber-receiver-feasibility-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'mp02-b08-integrated-chamber-receiver-feasibility-01.svg'), `${svg}\n`);
fs.writeFileSync(path.join(OUT, 'MP02-B08-INTEGRATED-CHAMBER-RECEIVER-FEASIBILITY-01.md'), markdown);
console.log(JSON.stringify({ status: report.status, out: rel(OUT), mutationAuthority: false, operationsCompiled: 0, chamberEnvelopeCells: chamberEnvelope.length, receiverContainmentCells: receiverContainment.length, currentHazards: hazards.length, returnWitnesses: routeChecks.map(({ id, passed }) => ({ id, passed })), b03ApertureCells: b03Aperture.length, b09CapCells: b09Cap.length, b09GuidewayCells: b09Guideway.length }, null, 2));
