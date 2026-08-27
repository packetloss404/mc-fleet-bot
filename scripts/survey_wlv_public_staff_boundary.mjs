#!/usr/bin/env node
/**
 * WLV-PUB-STF-BOUNDARY-01 — exact virtual-cut survey for the lower theatre.
 *
 * The tool is read-only. It evaluates full x-plane cuts against normal walking
 * (solid floor plus two clear cells; no jump), records the exact currently-air
 * cells that would be required for a solid partition, and checks that the
 * verified backstage-to-staff-spine route remains on the staff side. It never
 * treats a path through a proposed gate as public-safe access control.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : null; };
const regionsValue = value('--regions');
const outValue = value('--out');
if (!regionsValue || !outValue) throw new Error('Usage: --regions <region-dir> --out <fresh-directory>');
const REGIONS = path.resolve(ROOT, regionsValue);
const OUT = path.resolve(ROOT, outValue);
if (!fs.existsSync(REGIONS)) throw new Error(`region directory does not exist: ${REGIONS}`);
if (fs.existsSync(OUT)) throw new Error(`out must be a fresh directory: ${OUT}`);

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const BOUNDS = { minX: -430, maxX: -290, minY: 15, maxY: 52, minZ: -620, maxZ: -490 };
const PUBLIC = [-390, 18, -556];
const BACKSTAGE = [-330, 18, -556];
// This is the accepted west endpoint of WLV-STF-ACCESS-02, not merely the
// east-side bridge attachment. A boundary that breaks this full staff route is
// invalid even if it leaves the backstage room locally reachable.
const STAFF_SPINE = [-421, 18, -541];
const reader = new AnvilReader(REGIONS);
const cache = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
async function stateAt(x, y, z) { const id = key(x, y, z); if (!cache.has(id)) cache.set(id, reader.blockState(x, y, z)); return cache.get(id); }
async function standingAt(x, y, z, blocked = new Set()) {
  if (blocked.has(key(x, y, z)) || blocked.has(key(x, y + 1, z))) return false;
  const [floor, feet, head] = await Promise.all([stateAt(x, y - 1, z), stateAt(x, y, z), stateAt(x, y + 1, z)]);
  return !AIR.has(floor.Name) && !FLUID.has(floor.Name) && AIR.has(feet.Name) && AIR.has(head.Name);
}
async function component(start, blocked = new Set(), collectPlane = null) {
  const queue = [start]; const previous = new Map([[key(...start), null]]); const planeStations = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor];
    if (collectPlane !== null && point[0] === collectPlane) planeStations.push(point);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1]) {
      const next = [point[0] + dx, point[1] + dy, point[2] + dz]; const id = key(...next);
      if (next[0] < BOUNDS.minX || next[0] > BOUNDS.maxX || next[1] < BOUNDS.minY || next[1] > BOUNDS.maxY || next[2] < BOUNDS.minZ || next[2] > BOUNDS.maxZ || previous.has(id)) continue;
      if (await standingAt(...next, blocked)) { previous.set(id, point); queue.push(next); }
    }
  }
  return { reachable: previous, planeStations };
}
function snapshotHash(directory) { const h = crypto.createHash('sha256'); let bytes = 0; for (const n of fs.readdirSync(directory).filter((n) => n.endsWith('.mca')).sort()) { const b = fs.readFileSync(path.join(directory, n)); h.update(n); h.update('\0'); h.update(b); h.update('\0'); bytes += b.length; } return { sha256: h.digest('hex'), regionFileCount: fs.readdirSync(directory).filter((n) => n.endsWith('.mca')).length, bytes }; }

const baseline = await component(PUBLIC);
if (!baseline.reachable.has(key(...BACKSTAGE))) {
  const staff = await component(BACKSTAGE);
  const report = {
    schemaVersion: 1, id: 'wlv-pub-stf-boundary-01', generatedAtUtc: new Date().toISOString(), status: 'PHYSICAL_BOUNDARY_CONFIRMED', worldMutationPerformed: false,
    sourceSnapshot: { regions: path.relative(ROOT, REGIONS), ...snapshotHash(REGIONS) },
    classifications: { publicAnchor: { point: PUBLIC, class: 'venue-public' }, backstageAnchor: { point: BACKSTAGE, class: 'staff' }, staffSpineWestEndpoint: { point: STAFF_SPINE, class: 'staff-only' } },
    baseline: { publicToBackstageNormalWalk: false, publicToStaffSpineNormalWalk: baseline.reachable.has(key(...STAFF_SPINE)), backstageToStaffSpineNormalWalk: staff.reachable.has(key(...STAFF_SPINE)), publicReachableStations: baseline.reachable.size, staffReachableStations: staff.reachable.size },
    nonClaims: ['This confirms only the physical normal-walk separation and staff-spine preservation.', 'It is not credentialed/server access control and does not commission public route, egress, or theatre circulation.'],
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'wlv-public-staff-boundary-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'wlv-public-staff-boundary-survey.md'), `# WLV public/staff boundary survey\n\nStatus: **PHYSICAL_BOUNDARY_CONFIRMED**. Public-to-backstage normal walk: **blocked**. Backstage-to-staff-spine normal walk: **${report.baseline.backstageToStaffSpineNormalWalk ? 'preserved' : 'failed'}**.\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, assertions: report.baseline }, null, 2)}\n`);
  process.exit(0);
}
const candidates = [];
for (let planeX = -340; planeX <= -331; planeX += 1) {
  const fromPublic = await component(PUBLIC, new Set(), planeX);
  const cells = new Set();
  for (const [x, y, z] of fromPublic.planeStations) { cells.add(key(x, y, z)); cells.add(key(x, y + 1, z)); }
  const blocked = new Set(cells);
  const cutPublic = await component(PUBLIC, blocked);
  const staffComponent = await component(BACKSTAGE, blocked);
  const targetDetails = [];
  let invalidTargetCount = 0;
  for (const id of [...cells].sort()) {
    const [x, y, z] = id.split(',').map(Number); const state = await stateAt(x, y, z); const source = stateToCommandString(state);
    if (!AIR.has(state.Name)) { invalidTargetCount += 1; targetDetails.push({ cell: [x, y, z], source, eligible: false }); }
    else targetDetails.push({ cell: [x, y, z], source, eligible: true });
  }
  candidates.push({
    planeX,
    publicReachableStations: fromPublic.reachable.size,
    requiredSolidPartitionCells: cells.size,
    exactCandidateBounds: { minX: planeX, maxX: planeX, minY: Math.min(...targetDetails.map(({ cell }) => cell[1])), maxY: Math.max(...targetDetails.map(({ cell }) => cell[1])), minZ: Math.min(...targetDetails.map(({ cell }) => cell[2])), maxZ: Math.max(...targetDetails.map(({ cell }) => cell[2])) },
    publicToBackstageBlocked: !cutPublic.reachable.has(key(...BACKSTAGE)),
    publicToStaffSpineBlocked: !cutPublic.reachable.has(key(...STAFF_SPINE)),
    backstageToStaffSpinePreserved: staffComponent.reachable.has(key(...STAFF_SPINE)),
    sourceAirOnly: invalidTargetCount === 0,
    invalidTargetCount,
    targetDetails,
    releaseReadiness: 'DESIGN_ONLY_NO_CONTROLLED_GATE',
  });
}
const viable = candidates.filter((candidate) => candidate.publicToBackstageBlocked && candidate.publicToStaffSpineBlocked && candidate.backstageToStaffSpinePreserved && candidate.sourceAirOnly);
const selected = viable.sort((a, b) => a.requiredSolidPartitionCells - b.requiredSolidPartitionCells || a.planeX - b.planeX)[0] ?? null;
const report = {
  schemaVersion: 1, id: 'wlv-pub-stf-boundary-01', generatedAtUtc: new Date().toISOString(), status: selected ? 'CUT_SET_IDENTIFIED_GATE_UNRESOLVED' : 'NO_SAFE_CUT_SET', worldMutationPerformed: false,
  sourceSnapshot: { regions: path.relative(ROOT, REGIONS), ...snapshotHash(REGIONS) },
  classifications: { publicAnchor: { point: PUBLIC, class: 'venue-public' }, backstageAnchor: { point: BACKSTAGE, class: 'staff' }, staffSpineWestEndpoint: { point: STAFF_SPINE, class: 'staff-only' } },
  baseline: { publicToBackstageNormalWalk: baseline.reachable.has(key(...BACKSTAGE)), publicReachableStations: baseline.reachable.size },
  candidates, selected,
  gateRule: 'No controlled gate is compiled by this survey. A gate is eligible only after a separate credential/control design can prove public bypass is eliminated while an independently accepted staff traversal remains normal-walk.',
  nonClaims: ['A virtual solid cut does not prove architectural acceptability.', 'A closed door alone is not identity-based access control.', 'No public route, egress, or theatre circulation is accepted by this boundary survey.'],
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'wlv-public-staff-boundary-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'wlv-public-staff-boundary-survey.md'), `# WLV public/staff boundary survey\n\nStatus: **${report.status}**. Baseline public-to-backstage normal walk: **${report.baseline.publicToBackstageNormalWalk ? 'present' : 'absent'}**.\n\n${selected ? `Selected virtual cut plane: x=${selected.planeX}; ${selected.requiredSolidPartitionCells} exact air cells; public-to-backstage blocked=${selected.publicToBackstageBlocked}; staff spine preserved=${selected.backstageToStaffSpinePreserved}.\n\nThis remains design-only because no credentialed controlled gate is proven.\n` : 'No candidate cut meets the required graph properties.\n'}`);
process.stdout.write(`${JSON.stringify({ status: report.status, selected: selected && { planeX: selected.planeX, targetCells: selected.requiredSolidPartitionCells, bounds: selected.exactCandidateBounds } }, null, 2)}\n`);
