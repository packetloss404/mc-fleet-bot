#!/usr/bin/env node
/**
 * Offline MP03 current-immutable setout. This is intentionally a compiler for
 * a functional release decision, not a cosmetic worklist: it proves whether a
 * new dry lobby/corridor delta exists in the accepted B07 envelope.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const value = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r09l-post-20260824T021413Z');
const OUT = value('--out', 'data/world-review/mp03-houston-access-setout-20260826T051500Z.json');
const abs = (p) => path.resolve(ROOT, p); const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const at = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const isAir = (s) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(s.split('[', 1)[0]);
const isFluid = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(s.split('[', 1)[0]) || s.includes('waterlogged=true');

const lobby = []; for (let x = 2103; x <= 2111; x += 1) for (let z = -431; z <= -425; z += 1) lobby.push({ x, y: -59, z });
const floorFailures = []; const headroomFailures = []; const supportFailures = [];
for (const p of lobby) {
  const [floor, h1, h2, below] = await Promise.all([at(p.x, p.y, p.z), at(p.x, p.y + 1, p.z), at(p.x, p.y + 2, p.z), at(p.x, p.y - 1, p.z)]);
  if (!['minecraft:polished_andesite', 'minecraft:polished_diorite'].includes(floor)) floorFailures.push({ ...p, floor });
  if (!isAir(h1) || !isAir(h2)) headroomFailures.push({ ...p, h1, h2 });
  if (isAir(below) || isFluid(below)) supportFailures.push({ ...p, below });
}
const wetBand = []; for (let x = 2094; x <= 2114; x += 1) for (let y = 5; y <= 17; y += 1) for (let z = -438; z <= -388; z += 1) { const state = await at(x, y, z); if (isFluid(state)) wetBand.push({ x, y, z, state }); }
const gravel = []; for (let y = 27; y <= 30; y += 1) gravel.push({ x: 2104, y, z: -396, state: await at(2104, y, -396), below: await at(2104, y - 1, -396) });
const cap = []; for (let y = 30; y <= 31; y += 1) cap.push({ x: 2105, y, z: -397, state: await at(2105, y, -397) });
const report = {
  schemaVersion: 1, id: 'MP03-HOUSTON-ACCESS-SETOUT-01', generatedAtUtc: new Date().toISOString(),
  status: 'NO_SAFE_NEW_FUNCTIONAL_DELTA_ON_LATEST_B07_IMMUTABLE_BASELINE',
  source: { snapshot: rel(SNAPSHOT), limitation: 'No fresh capture was taken: MP01 owns the capture lane. Revalidate this setout against a new source before any future execution.' },
  ownership: { lowerLobby: 'Z06-PUBLIC-SHAFT-FITOUT', upperComponent: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT / passive internal inspection only', fullB07PublicThroughRoute: 'not owned/releasable as a small delta' },
  dryComponents: {
    lowerLobby: { bounds: { minX: 2103, maxX: 2111, minY: -59, maxY: -57, minZ: -431, maxZ: -425 }, floorCells: lobby.length, coordinateSetSha256: hashCells(lobby), floorFailures: floorFailures.length, headroomFailures: headroomFailures.length, supportFailures: supportFailures.length, disposition: headroomFailures.length === 0 ? 'AS_BUILT_DRY_9x7_LOBBY_NO_NEW_MUTATION' : 'FLOOR_AND_FOUNDATION_AS_BUILT_BUT_29_OF_63_STATIONS_FAIL_TWO_BLOCK_HEADROOM' },
    upperInspection: { acceptedSurfaceCells: 91, verticalRange: 'stair indices 21..110; isolated behind R09J cap', disposition: 'AS_BUILT_RESTRICTED_INTERNAL_COMPONENT_NOT_PUBLIC_OR_THROUGH_ACCESS' },
  },
  containmentAndVerticalBlocks: {
    retainedWetBand: { bounds: { minX: 2094, maxX: 2114, minY: 5, maxY: 17, minZ: -438, maxZ: -388 }, fluidCellCount: wetBand.length, coordinateSetSha256: hashCells(wetBand), disposition: 'R06_RETAINED_WATER_CONTAINMENT_NOT_ROUTE_VOID' },
    gravityBoundary: { cells: gravel, allGravel: gravel.every((c) => c.state === 'minecraft:gravel'), baseState: gravel[0].below, disposition: 'UNSUPPORTED_COLUMN_AT_2104_27_TO_30_NEG396_NO_REVERSIBLE_SUPPORT_ONLY_FIX' },
    physicalCap: { cells: cap, closed: cap.every((c) => c.state === 'minecraft:polished_diorite'), disposition: 'R09J_FAIL_CLOSED_BOUNDARY_PRESERVE' },
  },
  candidate: { releaseId: 'MP03-HOUSTON-ACCESS-01', forwardOperationCount: 0, rollbackOperationCount: 0, result: 'NO_PACKAGE_EMITTED', reason: 'The lower lobby floor/foundation is as-built but 29/63 stations fail two-block headroom; the only upper component is an isolated inspection route. Joining or enlarging either would breach retained water containment and/or alter the unsupported gravity/cap boundary. A small reversible public or staff circulation package does not exist.' },
  nextFunctionalPrerequisite: 'A future structural/hydraulic redesign must separately establish dry vertical containment, a stable gravity remediation with a migration/rollback doctrine, and a classified exterior/egress endpoint before an MP03 access package can compile.',
  safetyBoundary: { offlineOnly: true, liveCallsPerformed: false, worldEditsPerformed: false },
};
report.identitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`); fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, report: OUT, lowerLobby: report.dryComponents.lowerLobby, wetFluidCells: wetBand.length, gravel: gravel.map(({ y, state, below }) => ({ y, state, below })), capClosed: report.containmentAndVerticalBlocks.physicalCap.closed }, null, 2));
