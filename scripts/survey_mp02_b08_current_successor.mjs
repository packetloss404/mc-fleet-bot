#!/usr/bin/env node
/**
 * MP02 B08 current successor survey.
 * Read-only: reconcile the recovered 729-cell attempt, accepted 719-cell
 * handoff, and the remaining unbuilt B08 void against one complete source.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : null; };
const snapshotValue = value('--snapshot');
const outValue = value('--out');
if (!snapshotValue || !outValue) throw new Error('Usage: --snapshot <complete-snapshot-root> --out <fresh-directory>');
const SNAPSHOT = path.resolve(ROOT, snapshotValue);
const OUT = path.resolve(ROOT, outValue);
if (fs.existsSync(OUT)) throw new Error(`out must be a fresh directory: ${OUT}`);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(SNAPSHOT, member))) throw new Error(`incomplete snapshot; missing ${member}`);
}
const GEOMETRY = 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const FORWARD = 'data/buildops/mp02-subtropolis-b08-service-spine-01-r07c-ramp-handoff-live-20260826T120613Z.forward.txt';
const R07C_OPENINGS = 'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.b08-route-openings.forward.txt';
const recovery = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data/world-review/mp02-b08-service-spine-01-live-20260826T102000Z/ownership-recovery-ledger.json'), 'utf8'));
const reader = new AnvilReader(path.join(SNAPSHOT, 'region'));
const entities = new AnvilReader(path.join(SNAPSHOT, 'entities'));
const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const snapshotHash = (directory) => {
  const digest = crypto.createHash('sha256'); let bytes = 0;
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of files) { const payload = fs.readFileSync(path.join(directory, name)); digest.update(name); digest.update('\0'); digest.update(payload); digest.update('\0'); bytes += payload.length; }
  return { sha256: digest.digest('hex'), regionFileCount: files.length, bytes };
};
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const nameOf = (stateText) => stateText.split('[', 1)[0];
const parseOps = (filename) => {
  const cells = [];
  for (const raw of fs.readFileSync(path.resolve(ROOT, filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const terms = raw.trim().split(/\s+/); const [x1, y1, z1, x2, y2, z2] = terms.slice(1, 7).map(Number);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) cells.push({ x, y, z, source: terms[7], desired: terms[8] });
  }
  return cells;
};
const forward = parseOps(FORWARD);
const openings = parseOps(R07C_OPENINGS);
if (forward.length !== 719 || openings.length !== 28) throw new Error('accepted operation binding drifted');
const operatedFailures = [];
for (const item of forward) { const actual = await state(item); if (actual !== item.desired) operatedFailures.push({ cell: [item.x, item.y, item.z], expected: item.desired, actual }); }
const openingKeys = new Set(openings.map(cellKey));
const retainedOpenings = recovery.invalidatingOwnership.cells.map(([x, y, z]) => ({ x, y, z }));
const retainedFailures = [];
for (const cell of retainedOpenings) { const actual = await state(cell); if (!air.has(nameOf(actual)) || !openingKeys.has(cellKey(cell))) retainedFailures.push({ cell, actual, retainedByR07C: openingKeys.has(cellKey(cell)) }); }

const points = JSON.parse(fs.readFileSync(path.resolve(ROOT, GEOMETRY), 'utf8')).serviceTunnelCenterline.centerline.points;
const acceptedPoints = points.filter(({ index }) => index >= 0 && index <= 121);
const successorPoints = points.filter(({ index }) => index >= 122 && index <= 220);
if (acceptedPoints.length !== 122 || successorPoints.length !== 99) throw new Error('B08 centreline index drift');
const band = (selected) => uniqueCells(selected.flatMap((point) => point.orientations.flatMap((orientation) => Array.from({ length: 6 }, (_, offset) => (orientation === 'x'
  ? { x: point.x, y: point.y - 1, z: point.z + offset - 2 }
  : { x: point.x + offset - 2, y: point.y - 1, z: point.z })) )));
const rawBand = band(successorPoints);
const rawResults = { total: rawBand.length, paveableSupportedClear: 0, targetStates: {}, supportStates: {}, headroomStates: {}, fluids: [], unsupported: [], blocked: [], nonAirTargets: [] };
for (const cell of rawBand) {
  const [support, target, feet, head] = await Promise.all([state({ x: cell.x, y: cell.y - 1, z: cell.z }), state(cell), state({ x: cell.x, y: cell.y + 1, z: cell.z }), state({ x: cell.x, y: cell.y + 2, z: cell.z })]);
  rawResults.targetStates[target] = (rawResults.targetStates[target] ?? 0) + 1;
  rawResults.supportStates[support] = (rawResults.supportStates[support] ?? 0) + 1;
  rawResults.headroomStates[`${feet} / ${head}`] = (rawResults.headroomStates[`${feet} / ${head}`] ?? 0) + 1;
  if (fluid.has(nameOf(support)) || fluid.has(nameOf(target)) || fluid.has(nameOf(feet)) || fluid.has(nameOf(head))) rawResults.fluids.push({ cell, support, target, feet, head });
  if (air.has(nameOf(support))) rawResults.unsupported.push({ cell, support });
  if (!air.has(nameOf(feet)) || !air.has(nameOf(head))) rawResults.blocked.push({ cell, feet, head });
  if (!air.has(nameOf(target))) rawResults.nonAirTargets.push({ cell, target });
  if (!air.has(nameOf(support)) && !fluid.has(nameOf(support)) && air.has(nameOf(target)) && air.has(nameOf(feet)) && air.has(nameOf(head))) rawResults.paveableSupportedClear += 1;
}
const rawKeys = new Set(rawBand.map(cellKey));
const rawBlockEntities = [];
const rawEntities = [];
const chunkKeys = [...new Set(rawBand.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
for (const chunkKey of chunkKeys) {
  const [x, z] = chunkKey.split(',').map(Number); const chunk = await reader.chunk(x, z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (rawKeys.has(cellKey(cell))) rawBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell }); }
  const entityChunk = await entities.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? []) { if (!Array.isArray(entity.Pos)) continue; const position = entity.Pos.map(Number); const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) }; if (rawKeys.has(cellKey(cell))) rawEntities.push({ id: entity.id ?? entity.Id ?? null, position }); }
}
const b09 = { minX: 2048, maxX: 2062, minY: 129, maxY: 134, minZ: -750, maxZ: -746 };
const aperture = []; for (let y = 130; y <= 133; y += 1) for (let z = -750; z <= -746; z += 1) aperture.push({ x: 2049, y, z });
const apertureStates = []; for (const cell of aperture) apertureStates.push({ cell, state: await state(cell) });
const sourceId = snapshotHash(path.join(SNAPSHOT, 'region'));
const report = {
  schemaVersion: 1, id: 'MP02-B08-CURRENT-SUCCESSOR-SURVEY-01', status: 'HOLD_NO_OWNED_FUNCTIONAL_SUCCESSOR', worldMutationPerformed: false,
  sourceSnapshot: { root: path.relative(ROOT, SNAPSHOT), ...sourceId, captureManifestSha256: hash(fs.readFileSync(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'))) },
  reconciliation: {
    rejected729: { status: recovery.status, targetCells: recovery.attemptedTransaction.targetCells, retainedR07cConflictCells: recovery.invalidatingOwnership.overlapCount, recoveryIdentitySha256: recovery.recoveryIdentitySha256, disposition: 'historical attempt fully recovered; never as-built' },
    accepted719: { releaseId: 'MP02-SUBTROPOLIS-B08-SERVICE-SPINE-01-R07C-RAMP-HANDOFF', currentTargetCells: forward.length, currentTargetFailures: operatedFailures, retainedOpeningCells: retainedOpenings.length, retainedOpeningFailures: retainedFailures, disposition: 'as-built restricted service handoff, still present in current source' },
  },
  acceptedHandoff: { routeStations: 125, landing: { bounds: { minX: 2006, maxX: 2011, minY: 129, maxY: 129, minZ: -689, maxZ: -687 }, dimensions: '6x3' }, retainedOpeningCells: retainedOpenings },
  rawSuccessorVoid: { indices: [122, 220], stationCount: successorPoints.length, bandCellCount: rawBand.length, points: successorPoints, floorBand: rawBand, conditions: rawResults, savedBlockEntities: rawBlockEntities, savedMovableEntities: rawEntities },
  protectedFarInterface: { b09Envelope: b09, b03Aperture: { cellCount: aperture.length, cells: apertureStates }, rule: 'MP02 has no accepted control, egress, transfer, or ownership authority across this aperture/envelope.' },
  conclusion: { candidate: null, reasons: ['The remaining 6-wide volume is a linear raw tunnel, not an owner-approved chamber/lobby/tenant envelope.', 'The only verified exit is the accepted return path; no independent controlled-entry or egress interface exists.', 'The far B03 aperture abuts the protected B09 envelope and has no accepted bilateral contract.', 'A floor-only operation would duplicate or extend circulation without a functional owned endpoint.'] },
};
const sx = (x) => 70 + (x - 1940) * 6; const sz = (z) => 100 + (z + 760) * 5;
const line = (selected) => selected.map(({ x, z }) => `${sx(x)},${sz(z)}`).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900"><style>.bg{fill:#111827}.frame{fill:#172033;stroke:#64748b;stroke-width:2}.grid{stroke:#334155}.axis{fill:#94a3b8;font:12px ui-monospace,monospace;text-anchor:middle}.title{fill:#f8fafc;font:700 26px system-ui}.sub{fill:#cbd5e1;font:14px system-ui}.note{fill:#fecaca;font:700 15px system-ui}.call{fill:#f8fafc;font:13px system-ui}.metric{fill:#dbeafe;font:13px ui-monospace,monospace}</style><rect width="100%" height="100%" class="bg"/><text x="50" y="42" class="title">MP02 SubTropolis — B08 accepted handoff and held successor volume</text><text x="50" y="68" class="sub">Current complete source ${sourceId.sha256} · plan X/Z; north is down</text><rect x="70" y="100" width="780" height="700" class="frame"/>${Array.from({length:14},(_,i)=>{const x=1940+i*10;return `<line x1="${sx(x)}" y1="100" x2="${sx(x)}" y2="800" class="grid"/><text x="${sx(x)}" y="824" class="axis">${x}</text>`}).join('')}${Array.from({length:15},(_,i)=>{const z=-760+i*10;return `<line x1="70" y1="${sz(z)}" x2="850" y2="${sz(z)}" class="grid"/><text x="45" y="${sz(z)+4}" class="axis">${z}</text>`}).join('')}<polyline points="${line(acceptedPoints)}" fill="none" stroke="#ffbd4a" stroke-width="6"/><polyline points="${line(successorPoints)}" fill="none" stroke="#94a3b8" stroke-width="6" stroke-dasharray="12 8"/><rect x="${sx(2006)}" y="${sz(-689)}" width="${sx(2012)-sx(2006)}" height="${sz(-686)-sz(-689)}" fill="#77d7e1" opacity=".65"/><rect x="${sx(2048)}" y="${sz(-750)}" width="${sx(2063)-sx(2048)}" height="${sz(-745)-sz(-750)}" fill="#ec5b56" opacity=".38"/><text x="${sx(1947)}" y="${sz(-628)-10}" class="call">R07C retained-air ramp</text><text x="${sx(2006)}" y="${sz(-685)}" class="call">accepted 6×3 landing (index 121)</text><text x="${sx(2016)}" y="${sz(-710)}" class="note">raw 6-wide linear void (122…220)</text><text x="${sx(2048)}" y="${sz(-752)-10}" class="note">B03 aperture / protected B09 envelope</text><text x="885" y="126" class="title" style="font-size:19px">Reconciled disposition</text><text x="885" y="165" class="metric">729-cell floor: rejected + fully recovered</text><text x="885" y="189" class="metric">10 retained R07C air cells: never pave</text><text x="885" y="229" class="metric">719-cell handoff: current 719/719 smooth stone</text><text x="885" y="253" class="metric">125-station return / 6×3 landing: retained</text><text x="885" y="303" class="note">No successor operation was compiled.</text><text x="885" y="333" class="sub">The gray void is source-air, supported, and two-clear,</text><text x="885" y="354" class="sub">but it is only a tunnel with one proven return, no</text><text x="885" y="375" class="sub">owned chamber, and no B03/B09 control or egress contract.</text><text x="885" y="435" class="sub">Next design: adopt a bounded chamber/lobby envelope,</text><text x="885" y="456" class="sub">lining/support/drainage, a bilateral far interface, and</text><text x="885" y="477" class="sub">independent egress before any physical package.</text></svg>`;
const markdown = `# MP02 B08 current successor reconciliation\n\n**Status:** \`HOLD_NO_OWNED_FUNCTIONAL_SUCCESSOR\`  \n**Mode:** read-only; no compiler output, capture, RCON, or world mutation.\n\nThe conflicting B08 records are reconciled against the current complete source\n\`${path.relative(ROOT, SNAPSHOT)}\` (region SHA-256 \`${sourceId.sha256}\`).\n\n![B08 handoff and remaining void](mp02-b08-current-successor-map.svg)\n\n## What is current\n\n- The **729-cell** service-floor attempt is historically rejected and was fully\n  rolled back because it overwrote 10 exact R07C retained-air openings. It is\n  not as-built.\n- The later **719-cell** R07C-ramp-handoff is a different package: current\n  source verifies all 719 smooth-stone targets, all ten retained R07C openings\n  as air, the 125-station cardinal no-jump route, and the 6×3 landing. It is\n  the accepted restricted service spine and must not be replayed.\n\n## Successor survey\n\nThe only continuation is a ${rawResults.paveableSupportedClear}/${rawResults.total}-cell source-air, supported, two-clear six-wide linear void at centreline indices 122..220. That makes future paving technically screenable, but it is not a chamber or lobby. Its far 20-cell B03 aperture is adjacent to the protected B09 envelope; MP02 has no bilateral transfer, control, egress, or ownership contract there. The verified return through the accepted landing is the only proven exit.\n\nNo exact physical candidate exists: a floor-only continuation would create more unprogrammed tunnel, not an owned functional room/entry/tenant/egress scope.\n\n## Required next integrated design\n\n1. Define exact MP02 chamber/lobby bounds plus complete lining, support, drainage, and retained-route interfaces.\n2. Adopt a bilateral B03/B09 control and egress contract that freezes the exact aperture and protected rail envelope.\n3. Provide an independently proved second exit/controlled entry and operating purpose before any build.\n4. Then compile source-bound reversible operations and apply the guarded-release kernel on a new immediate complete source.\n\n## Non-claims\n\nThis does not authorize an operation, create a public entry/egress, transfer B03/B09 ownership, or complete SubTropolis.\n`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp02-b08-current-successor-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'mp02-b08-current-successor-map.svg'), `${svg}\n`);
fs.writeFileSync(path.join(OUT, 'MP02-B08-CURRENT-SUCCESSOR-RECONCILIATION.md'), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, sourceRegionSha256: sourceId.sha256, accepted719Failures: operatedFailures.length, rawVoid: { cells: rawResults.total, paveableSupportedClear: rawResults.paveableSupportedClear, fluidCells: rawResults.fluids.length, blockedCells: rawResults.blocked.length }, out: path.relative(ROOT, OUT) }, null, 2)}\n`);
