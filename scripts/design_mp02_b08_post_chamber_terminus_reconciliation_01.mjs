#!/usr/bin/env node
/**
 * MP02 B08 post-chamber terminus reconciliation.
 *
 * Read-only design input.  It classifies the 19 as-built cells that make the
 * historic raw-void terminus compiler stale, binds the existing receiver and
 * restricted return evidence, and deliberately emits no operations.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i < 0 ? null : args[i + 1] ?? null; };
const snapshotArg = get('--snapshot');
const outArg = get('--out');
const generatedAtUtc = get('--generated-at') ?? new Date().toISOString();
if (!snapshotArg || !outArg) throw new Error('Usage: --snapshot <complete-snapshot-root> --out <fresh-directory> [--generated-at <ISO>]');
const SNAPSHOT = path.resolve(ROOT, snapshotArg);
const OUT = path.resolve(ROOT, outArg);
if (fs.existsSync(OUT)) throw new Error(`out must be fresh: ${OUT}`);
for (const item of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, item))) throw new Error(`incomplete snapshot: ${item}`);

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha = (file) => sha(fs.readFileSync(file));
const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const name = (state) => state.split('[', 1)[0];
const cells = (bounds) => { const found = []; for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) found.push({ x, y, z }); return found; };
const census = (items) => { const out = {}; for (const item of items) out[item.state] = (out[item.state] ?? 0) + 1; return out; };
const regionHash = () => { const d = crypto.createHash('sha256'); let bytes = 0; const files = fs.readdirSync(path.join(SNAPSHOT, 'region')).filter((x) => x.endsWith('.mca')).sort(); for (const f of files) { const payload = fs.readFileSync(path.join(SNAPSHOT, 'region', f)); d.update(f); d.update('\0'); d.update(payload); d.update('\0'); bytes += payload.length; } return { sha256: d.digest('hex'), regionFileCount: files.length, bytes }; };
const reader = new AnvilReader(path.join(SNAPSHOT, 'region'));
const entityReader = new AnvilReader(path.join(SNAPSHOT, 'entities'));
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const inspect = async (items) => Promise.all(items.map(async (cell) => ({ ...cell, state: await state(cell) })));
const blocksAndEntities = async (items) => {
  const keys = new Set(items.map(cellKey)); const chunks = [...new Set(items.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = []; const entities = [];
  for (const key of chunks) { const [x, z] = key.split(',').map(Number); const chunk = await reader.chunk(x, z); for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(be.x), y: Number(be.y), z: Number(be.z) }; if (keys.has(cellKey(cell))) blockEntities.push({ cell, id: be.id ?? be.Id ?? null }); }
    const entityChunk = await entityReader.chunk(x, z); for (const e of entityChunk?.Entities ?? []) { if (!Array.isArray(e.Pos)) continue; const p = e.Pos.map(Number); const cell = { x: Math.floor(p[0]), y: Math.floor(p[1]), z: Math.floor(p[2]) }; if (keys.has(cellKey(cell))) entities.push({ cell, id: e.id ?? e.Id ?? null }); }
  }
  return { blockEntities, entities };
};

// This is exactly the former successor floor-band (indices 122..220), as
// observed after the executed restricted chamber package.
const successor = cells({ minX: 2006, maxX: 2103, minY: 129, maxY: 129, minZ: -750, maxZ: -746 }).filter(({ x, z }) => !(x > 2012 && z === -746));
// The centreline creates 584 unique cells; construct it from the geometry for
// fidelity rather than assuming an unbroken rectangle.
const geometry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json'), 'utf8'));
const points = geometry.serviceTunnelCenterline.centerline.points.filter(({ index }) => index >= 122 && index <= 220);
const successorBand = []; const seen = new Set();
for (const p of points) for (const orientation of p.orientations) for (let offset = 0; offset < 6; offset += 1) { const cell = orientation === 'x' ? { x: p.x, y: p.y - 1, z: p.z + offset - 2 } : { x: p.x + offset - 2, y: p.y - 1, z: p.z }; if (!seen.has(cellKey(cell))) { seen.add(cellKey(cell)); successorBand.push(cell); } }
if (successor.length < 1 || successorBand.length !== 584) throw new Error('successor geometry drift');
const inspectedBand = await inspect(successorBand);
const classifications = { northFireBoundary: [], shaftIntercept: [], eastB03Isolation: [] };
for (const item of inspectedBand) {
  const feet = item.state; const head = await state({ x: item.x, y: item.y + 1, z: item.z }); const crown = await state({ x: item.x, y: item.y + 2, z: item.z });
  const obstructed = !air.has(name(feet)) || !air.has(name(head)) || !air.has(name(crown));
  if (!obstructed) continue;
  const value = { cell: { x: item.x, y: item.y, z: item.z }, floor: feet, feet: head, head: crown };
  if (item.z === -741 && item.x >= 2006 && item.x <= 2011) classifications.northFireBoundary.push(value);
  else if (item.x >= 2007 && item.x <= 2009 && item.z >= -749 && item.z <= -747) classifications.shaftIntercept.push(value);
  else if (item.x === 2012 && item.z >= -750 && item.z <= -746) classifications.eastB03Isolation.push(value);
  else throw new Error(`unclassified successor obstruction at ${cellKey(item)}`);
}
const protectedCount = Object.values(classifications).reduce((n, group) => n + group.length, 0);
if (protectedCount !== 19 || classifications.northFireBoundary.length !== 6 || classifications.shaftIntercept.length !== 8 || classifications.eastB03Isolation.length !== 5) throw new Error(`expected 19 classified protected successor cells, got ${protectedCount}`);
const clear = inspectedBand.filter((item) => air.has(name(item.state))).length;
if (clear !== 571) throw new Error(`unexpected successor source-air floor count: ${clear}`);

const receiverBounds = { minX: 2008, maxX: 2012, minY: 124, maxY: 128, minZ: -751, maxZ: -747 };
const receiver = await inspect(cells(receiverBounds));
const receiverSafety = await blocksAndEntities(receiver.map(({ x, y, z }) => ({ x, y, z })));
const receiverFluids = receiver.filter(({ state: value }) => fluid.has(name(value)));
if (receiver.length !== 125 || receiverFluids.length || receiverSafety.blockEntities.length || receiverSafety.entities.length) throw new Error('sealed receiver condition drifted: dry/entity-free/block-entity-free 125-cell enclosure required');

const aperture = await inspect(cells({ minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 }));
if (aperture.length !== 20 || aperture.some(({ state: value }) => !air.has(name(value)))) throw new Error('B03 aperture preservation drifted');
const b09Cap = await inspect(cells({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 }));
if (b09Cap.length !== 12 || b09Cap.some(({ state: value }) => value !== 'minecraft:polished_diorite')) throw new Error('B09 isolation cap preservation drifted');
const qaPath = path.join(ROOT, 'data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z/independent-post-release-qa-remediated.json');
const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
if (qa.status !== 'PASS_EXECUTED_RESTRICTED_CHAMBER_DRY_RECEIVER_POST_QA' || qa.targetSummary.passed !== 835 || qa.routes.length !== 6 || qa.routes.some((route) => !route.correct)) throw new Error('executed restricted-return evidence drifted');

const source = { root: path.relative(ROOT, SNAPSHOT), completeSaveCaptureSha256: fileSha(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), completeSaveSha256: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z/post-complete-save-intake.json'), 'utf8')).packageIdentity.completeSaveSha256, region: regionHash() };
const status = 'SOURCE_BOUND_RESTRICTED_TERMINUS_RECEIVER_RETURN_RECONCILIATION_INPUT_ONLY';
const report = {
  schemaVersion: 1, id: 'MP02-B08-POST-CHAMBER-TERMINUS-RECONCILIATION-01', generatedAtUtc, status,
  readOnly: true, worldMutationPerformed: false, mutationAuthority: false, operationsCompiled: 0, forwardOperations: [], rollbackOperations: [],
  source,
  exactAsBuiltInterfaces: {
    restrictedChamber: { bounds: { minX: 2006, maxX: 2011, minY: 129, maxY: 133, minZ: -750, maxZ: -742 }, dimensions: '6x9x5', disposition: 'retain; restricted only' },
    northHandoffThreshold: { cells: cells({ minX: 2006, maxX: 2011, minY: 129, maxY: 131, minZ: -742, maxZ: -742 }), returnWitness: { target: [2008, 129, -690], result: 'proven in immutable post-QA' } },
    shaftRecoveryThreshold: { cells: [{ x: 2008, y: 129, z: -748 }], returnWitness: { target: [2005, 208, -748], result: 'proven in immutable post-QA' } },
    sealedDryReceiver: { bounds: receiverBounds, cellCount: receiver.length, exactStateCensus: census(receiver), fluids: receiverFluids, blockEntities: receiverSafety.blockEntities, movableEntities: receiverSafety.entities, disposition: 'retain sealed dry contingency receiver; no automatic outfall' },
    b03Aperture: { bounds: { minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 }, cellCount: aperture.length, requiredState: 'minecraft:air', disposition: 'retain; no MP02 crossing/control/egress authority' },
    b09IsolationCap: { bounds: { minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 }, cellCount: b09Cap.length, requiredState: 'minecraft:polished_diorite', disposition: 'retain protected B09 boundary' },
  },
  staleRawVoidRequirementRetired: { oldRequirement: '582 wholly clear floor-band cells / two unclassified intercepts before any terminus design', currentObservedBand: { cellCount: successorBand.length, sourceAirFloorCells: clear, classifiedProtectedCells: protectedCount, classifications }, disposition: 'RETIRED_AS_STALE_GEOMETRY_ONLY; the 19 cells are exact as-built terminus fabric to preserve, not a fresh physical build target' },
  restrictedReturnEvidence: { immutablePostQa: { path: path.relative(ROOT, qaPath), sha256: fileSha(qaPath), targetVerification: qa.targetSummary, routeChecks: qa.routes.map(({ id, correct }) => ({ id, correct })) }, result: 'two normal/failure-isolated restricted chamber return witnesses are retained; not public or emergency commissioning' },
  remainingHardRequirements: [
    'An exact owned public/controlled terminus purpose and boundary beyond the restricted chamber.',
    'Two independent public or emergency egress returns with an accepted non-common-failure proof; the present witnesses are restricted chamber evidence only.',
    'B03/B09 bilateral ownership, control, and guideway contract before any aperture interaction.',
    'A finite drainage/collector/outfall/overflow design if the future terminus creates a discharge requirement.',
    'A separately compiled canonical source/target/rollback package and fresh guarded release kernel.'
  ],
  nonClaims: ['No physical operation or mutation authority.', 'No public entry, public/emergency egress, B03/B09 connection, rail/control action, or automatic fluid outfall.', 'No claim that SubTropolis or a public terminus is complete.'],
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><style>.b{fill:#111827}.t{fill:#f8fafc;font:700 25px system-ui}.s{fill:#cbd5e1;font:14px system-ui}.k{fill:#e2e8f0;font:13px ui-monospace,monospace}.r{fill:#fca5a5;font:700 14px system-ui}</style><rect class="b" width="1200" height="760"/><text x="45" y="42" class="t">MP02 / B08 post-chamber functional interfaces</text><text x="45" y="68" class="s">source-bound X/Z plan; no operations compiled</text><rect x="80" y="110" width="670" height="555" fill="#172033" stroke="#64748b"/><path d="M110 170 L360 170 L360 300 L500 300" stroke="#fbbf24" stroke-width="18" fill="none"/><rect x="330" y="270" width="150" height="180" fill="#22d3ee" opacity=".72"/><rect x="425" y="310" width="28" height="100" fill="#94a3b8"/><rect x="468" y="270" width="28" height="180" fill="#ef4444" opacity=".75"/><path d="M405 410 L405 610" stroke="#86efac" stroke-width="18"/><text x="100" y="150" class="k">north accepted R07C handoff → 2008,129,-690</text><text x="345" y="360" class="k">6×9 restricted chamber</text><text x="505" y="345" class="r">B03 isolation</text><text x="420" y="550" class="k">shaft return → 2005,208,-748</text><text x="790" y="132" class="t" style="font-size:19px">Exact current disposition</text><text x="790" y="178" class="k">584 former successor-band cells</text><text x="790" y="204" class="k">565 clear / 19 retained protected cells</text><text x="790" y="244" class="k">north fire boundary: 6</text><text x="790" y="270" class="k">shaft intercept: 8</text><text x="790" y="296" class="k">east B03 isolation: 5</text><text x="790" y="344" class="k">sealed dry receiver: 125 cells</text><text x="790" y="370" class="k">fluid / BE / entity: 0 / 0 / 0</text><text x="790" y="420" class="r">Retires stale raw-void geometry only.</text><text x="790" y="447" class="s">Does not commission a public terminus</text><text x="790" y="468" class="s">or public/emergency egress.</text><text x="790" y="530" class="s">B03 aperture and B09 cap remain</text><text x="790" y="551" class="s">immutable protected interfaces.</text></svg>`;
const markdown = `# MP02 B08 post-chamber terminus reconciliation\n\n**Status:** \`${status}\`  \n**Mode:** source-bound, read-only design input; no operations or mutation authority.\n\n![Functional interface map](mp02-b08-post-chamber-terminus-reconciliation-01.svg)\n\n## Functional requirement retired\n\nThe old terminus feasibility input demanded a wholly raw 582-cell successor floor band. It is stale after the executed restricted chamber package. The present \`584\`-cell successor band contains \`${clear}\` source-air floor cells and **19 exact, classified, retained cells**: 6 north fire-boundary, 8 shaft-intercept, and 5 east B03-isolation cells. These are intentional terminus interfaces, not unexplained obstructions. The stale raw-void prerequisite is retired; no operation follows from that retirement.\n\n## Current exact functional interfaces\n\n- Retained \`6×9×5\` restricted chamber, northern handoff witness to \`2008,129,-690\`, and shaft recovery witness to \`2005,208,-748\`. Immutable post-QA passed all six normal/failure-isolation checks.\n- Retained sealed dry receiver: \`125\` cells, no fluid, block entity, or movable entity in its bound volume; no automatic outfall.\n- Retained B03 \`20\`-cell air aperture and B09 \`12\`-cell polished-diorite isolation cap.\n\n## Still required\n\nThis record does **not** create an owned public terminus or public/emergency egress. Exact public purpose/bounds, independent public returns, B03/B09 bilateral terms, any drainage-discharge design, and a separate guarded operation package remain required.\n`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp02-b08-post-chamber-terminus-reconciliation-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'mp02-b08-post-chamber-terminus-reconciliation-01.svg'), `${svg}\n`);
fs.writeFileSync(path.join(OUT, 'MP02-B08-POST-CHAMBER-TERMINUS-RECONCILIATION-01.md'), markdown);
process.stdout.write(`${JSON.stringify({ status, mutationAuthority: false, operationsCompiled: 0, retiredRequirement: report.staleRawVoidRequirementRetired.oldRequirement, protectedClassifiedCells: protectedCount, receiver: { cellCount: receiver.length, fluidCells: 0, blockEntities: 0, movableEntities: 0 }, out: path.relative(ROOT, OUT) }, null, 2)}\n`);
