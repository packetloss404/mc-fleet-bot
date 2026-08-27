#!/usr/bin/env node
/**
 * Read-only interface, forward/inverse-return, and post-state acceptance
 * contract for the corrected 105-station C01 feasibility path.
 *
 * It intentionally refuses to create operations: a stair/landing compiler has
 * not yet provided a complete canonical target-state mapping for the stepped
 * route, so no release-ready post-state contract can honestly be self-contained.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const FEASIBILITY = option('--feasibility', 'data/world-review/mp11-bkr-c01-finite-independent-return-feasibility-02-cobalt-wl-post-20260826T233000Z/mp11-bkr-c01-finite-independent-return-feasibility-01.json');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-independent-return-acceptance-contract-01-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR independent-return acceptance contract rejected: ${message}`); };
const key = (point) => point.join(',');
const pointHash = (points) => sha256(points.map(key).sort().join('\n'));
const orderedHash = (points) => sha256(points.map(key).join('\n'));
const withinCube = (cell, point) => Math.abs(cell[0] - point[0]) <= 1 && cell[1] >= point[1] - 1 && cell[1] <= point[1] + 2 && Math.abs(cell[2] - point[2]) <= 1;

const feasibilityPath = abs(FEASIBILITY); const feasibilityBytes = fs.readFileSync(feasibilityPath); const feasibility = JSON.parse(feasibilityBytes);
fail(feasibility.id === 'MP11-BKR-C01-FINITE-INDEPENDENT-RETURN-FEASIBILITY-01', 'wrong feasibility report');
fail(feasibility.status === 'FINITE_SOURCE_BOUND_INDEPENDENT_RETURN_FEASIBILITY_INPUT_ONLY' && feasibility.mutationAuthority === false, 'feasibility is not a non-authorizing finite path');
fail(feasibility.corridorProfile?.cellPerStation === 36 && /floor \+ three clear cells/.test(feasibility.corridorProfile.clearEnvelope), 'feasibility is not a true 3-wide × 3-high profile');
const candidate = feasibility.feasibility;
fail(candidate?.candidateStationCount === 105 && Array.isArray(candidate.stations) && candidate.envelopeCellCount === 1434 && Array.isArray(candidate.canonicalSourceStates), 'corrected 105-station feasibility inventory absent');
const portal = candidate.endpointRecords?.find((entry) => entry.role === 'portal'); const l1 = candidate.endpointRecords?.find((entry) => entry.role === 'L1');
fail(JSON.stringify(portal?.point) === JSON.stringify([697, 68, -52]) && portal?.state === 'minecraft:air', 'portal interface drift');
fail(JSON.stringify(l1?.point) === JSON.stringify([798, 43, -55]) && l1?.state === 'minecraft:air', 'L1 interface drift');
fail(candidate.stationSetSha256 === '26b080d70ad86d485787b1eda63334836370ea39d76635cb61a5d546287e53d1', 'station set drift');
fail(candidate.envelopeCellSetSha256 === 'ce3e69b91cb8d9d39071c6a9dce0ed2464d8cb21ad8aec44ec588cc738438fe6', 'envelope state drift');
const forward = candidate.stations; const inverse = [...forward].reverse();
fail(forward.every((point, index) => key(inverse[forward.length - 1 - index]) === key(point)), 'inverse route is not the exact reversal');
const portalCube = candidate.canonicalSourceStates.filter((cell) => withinCube(cell.point, portal.point));
const l1Cube = candidate.canonicalSourceStates.filter((cell) => withinCube(cell.point, l1.point));
fail(portalCube.length === 36 && l1Cube.length === 36, 'each endpoint must retain its complete 3-wide × 3-high source envelope');
const B = feasibility.domain; const sx = (x) => 44 + ((x - B.minX) / (B.maxX - B.minX)) * 1110; const sz = (z) => 104 + ((z - B.minZ) / (B.maxZ - B.minZ)) * 430;
const line = (points) => points.map((point, index) => `${index ? 'L' : 'M'}${sx(point[0]).toFixed(1)} ${sz(point[2]).toFixed(1)}`).join(' ');
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640" viewBox="0 0 1200 640"><rect width="1200" height="640" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c7d8e7}.tiny{font:11px ui-monospace,monospace;fill:#f5f8fc}</style><text x="34" y="40" class="head">C01 independent return — exact interfaces and inverse route design</text><text x="34" y="66" class="sub">105 stations / 1,434 source-bound 3-wide × 3-high envelope cells / design contract only</text><rect x="44" y="104" width="1110" height="430" fill="#142238" stroke="#5b738b"/><path d="${line(feasibility.currentReturn ? [] : [])}" fill="none"/> <path d="${line(forward)}" fill="none" stroke="#68d391" stroke-width="4"/><path d="${line(inverse)}" fill="none" stroke="#f6b55c" stroke-width="2" stroke-dasharray="8 6"/><circle cx="${sx(portal.point[0])}" cy="${sz(portal.point[2])}" r="7" fill="#68d391" stroke="#eff7ff"/><circle cx="${sx(l1.point[0])}" cy="${sz(l1.point[2])}" r="7" fill="#f6b55c" stroke="#eff7ff"/><text x="${sx(portal.point[0]) + 10}" y="${sz(portal.point[2]) - 8}" class="tiny">portal [697,68,-52]</text><text x="${sx(l1.point[0]) + 10}" y="${sz(l1.point[2]) - 8}" class="tiny">L1 [798,43,-55]</text><text x="44" y="568" class="sub">Green: portal→L1 forward design. Gold dashed: exact L1→portal reverse ordering. Endpoint cubes are 36 source-bound cells each.</text><text x="44" y="594" class="sub">No block target mapping is emitted: stepped floor/tread/landing target states must be supplied by a later dedicated compiler.</text><text x="44" y="619" class="sub">Physical release remains denied until both endpoint interfaces, both directed returns, source/post route QA, and exact canonical post states are accepted.</text></svg>\n`;

const base = {
  schemaVersion: 1, id: 'MP11-BKR-C01-INDEPENDENT-RETURN-ACCEPTANCE-CONTRACT-01', generatedAtUtc: new Date().toISOString(),
  status: 'DESIGN_CONTRACT_COMPLETE_PHYSICAL_POSTSTATE_MAPPING_REQUIRED', mode: 'READ_ONLY_INTERFACE_RETURN_POSTSTATE_CONTRACT_NO_OPERATIONS', mutationAuthority: false,
  source: { feasibility: { path: rel(FEASIBILITY), sha256: sha256(feasibilityBytes), identity: feasibility.feasibilityIdentitySha256 }, snapshot: feasibility.source },
  finiteRoute: { stationCount: 105, stationSetSha256: candidate.stationSetSha256, orderedForwardStationSha256: orderedHash(forward), orderedInverseStationSha256: orderedHash(inverse), envelopeCellCount: 1434, envelopeCellSetSha256: candidate.envelopeCellSetSha256, profile: feasibility.corridorProfile },
  interfaces: {
    portal: { ownerRole: 'C01 Portal Approach Interface Owner', counterpartRole: 'C01 Independent-Return Design Owner', endpoint: portal, endpointCubeCellCount: portalCube.length, endpointCubeStateSha256: sha256(portalCube.map((cell) => `${key(cell.point)}=${cell.state}`).sort().join('\n')), acceptance: 'Required before any physical compiler; protects the portal anchor and exact 36-cell endpoint envelope.' },
    l1: { ownerRole: 'C01 L1 Arrival Interface Owner', counterpartRole: 'C01 Independent-Return Design Owner', endpoint: l1, endpointCubeCellCount: l1Cube.length, endpointCubeStateSha256: sha256(l1Cube.map((cell) => `${key(cell.point)}=${cell.state}`).sort().join('\n')), acceptance: 'Required before any physical compiler; protects the L1 anchor and exact 36-cell endpoint envelope.' },
  },
  directedReturnContracts: [
    { id: 'C01-INDEPENDENT-RETURN-FORWARD-01', from: portal.point, to: l1.point, stationCount: forward.length, orderedStationSha256: orderedHash(forward), normalWalkPostStateRequired: true, usesCurrentRouteHalo: false, usesBlockEntityHalo: false, usesFluidOrGravity: false },
    { id: 'C01-INDEPENDENT-RETURN-INVERSE-01', from: l1.point, to: portal.point, stationCount: inverse.length, orderedStationSha256: orderedHash(inverse), exactInverseOf: 'C01-INDEPENDENT-RETURN-FORWARD-01', normalWalkPostStateRequired: true, usesCurrentRouteHalo: false, usesBlockEntityHalo: false, usesFluidOrGravity: false },
  ],
  postStateAcceptance: {
    status: 'EXACT_ROUTE_PREDICATE_BOUND_TARGET_BLOCK_MAPPING_NOT_YET_DESIGNED',
    exactRoutePredicate: { stationCount: forward.length, forwardOrderedStationSha256: orderedHash(forward), inverseOrderedStationSha256: orderedHash(inverse), minimumClearance: '3-wide × 3-high at every accepted station and transition', noFluidOrGravityInInteractionSet: true, noBlockEntityOrCurrentRouteHaloIntersection: true },
    requiredCompilerInputsBeforePhysicalOperations: [
      'Complete canonical target state for every floor, tread, landing, wall, ceiling, and interface cell; stepped transitions cannot be safely inferred from the 3×3 feasibility cube.',
      'Complete forward and exact rollback operation inventories with a one-to-one inverse proof, strict-noop parser preflights, fresh source rebind, protected-core/block-entity exclusion, and fresh live-entity clearance.',
      'Independent immutable-post QA proving both directed new-return paths, the existing portal-to-L1 return, endpoint interfaces, dry/gravity-safe envelope, and rollback preflight.',
    ],
  },
  selfContained: false,
  selfContainedAssessment: 'The contract is self-contained for source identity, two exact endpoint interfaces, forward/inverse route ordering, source-state envelope, and acceptance predicates. It is not self-contained as a physical release contract because a stepped 105-station route needs a dedicated canonical target-state mapping before target states, operations, and rollback can be exact.',
  nonClaims: ['No operation files, release manifest, or mutation authority.', 'No endpoint opening, route construction, liner, bypass, public access, commissioning, or post-state success claim.', 'No inference of stair, landing, floor, wall, or ceiling target states.'],
};
const contract = { ...base, contractIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-independent-return-acceptance-contract-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-independent-return-acceptance-map.svg'), map);
fs.writeFileSync(path.join(out, 'MP11-BKR-C01-INDEPENDENT-RETURN-ACCEPTANCE-CONTRACT-01.md'), `# MP11 / BKR C01 independent-return acceptance contract 01\n\n**Status:** \`${contract.status}\`  \n**Authority:** read-only contract; no operation or mutation authority.\n\n![Coordinate / inverse-design map](mp11-bkr-c01-independent-return-acceptance-map.svg)\n\nThe corrected feasibility route binds **105** stations and **1,434** source cells at true 3-wide × 3-high profile. The exact portal interface is \`[697,68,-52]\`; the L1 interface is \`[798,43,-55]\`. Forward and exact reverse route orderings are bound above.\n\n**Self-contained assessment:** the interface and route acceptance contract is self-contained, but a physical release contract is **not**. The stepped corridor needs a complete canonical target-state mapping for floors, treads, landings, walls, ceilings, and both interfaces. No physical operation may be emitted until that mapping and the listed kernel/post-state evidence are exact.\n`);
console.log(JSON.stringify({ status: contract.status, out: rel(out), mutationAuthority: false, selfContained: contract.selfContained, stationCount: contract.finiteRoute.stationCount, envelopeCells: contract.finiteRoute.envelopeCellCount }, null, 2));
