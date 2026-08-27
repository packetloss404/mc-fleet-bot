#!/usr/bin/env node
/**
 * SYS-01 MP07-to-MP06 pedestrian continuity contract 02.
 *
 * A read-only source-bound renewal of the first cross-component gap. It
 * deliberately surveys only the two accepted attachment stations on the
 * newest complete snapshot. The land between them has no adopted corridor
 * geometry or owner; drawing an inferred line through it would be a false
 * route and a false release candidate.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const value = option(flag);
  if (!value) throw new Error(`Usage: generate_sys01_mp07_mp06_pedestrian_continuity_contract_02.mjs --snapshot <complete snapshot> --out <directory>`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS-01 continuity contract rejected: ${message}`); };
const point = (x, y, z) => ({ x, y, z });
const pointText = ({ x, y, z }) => `(${x}, ${y}, ${z})`;
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const HAZARD = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:scaffolding', 'minecraft:pointed_dripstone']);
const isAir = (state) => AIR.has(stateName(state));
const isSafeSupport = (state) => !isAir(state) && !HAZARD.has(stateName(state)) && !state.includes('waterlogged=true');
const SVG_ESCAPE = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));

const SNAPSHOT = required('--snapshot');
const OUT = required('--out');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(SNAPSHOT);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'snapshot lacks complete-save capture manifest');
for (const member of ['region', 'entities', 'poi', 'level.dat']) fail(fs.existsSync(path.join(snapshotRoot, member)), `snapshot missing ${member}`);
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'source is not immutable');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130,
  `source must contain 130 captured members, found ${capture.requiredMembers?.length ?? 0}`);
for (const member of capture.requiredMembers) {
  const file = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(file), `captured member missing: ${member.path}`);
  const bytes = fs.readFileSync(file);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}

const endpoints = [
  { id: 'MP07-ATTACHMENT', component: 'MP07-RRMSA-FULL-CIRCULATION-01', feet: point(-111, 69, -332), ownerRole: 'MP07_EXISTING_TRACE_OWNER' },
  { id: 'MP06-ATTACHMENT', component: 'MP06-ENDPOINT-ELEVATED-CROSSING-01', feet: point(-252, 69, -493), ownerRole: 'MP06_LOWER_CLEARWAY_OWNER' },
];
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const inspectEndpoint = async (endpoint) => {
  const cells = [
    { role: 'support', cell: point(endpoint.feet.x, endpoint.feet.y - 1, endpoint.feet.z) },
    { role: 'feet', cell: endpoint.feet },
    { role: 'head', cell: point(endpoint.feet.x, endpoint.feet.y + 1, endpoint.feet.z) },
  ];
  const records = await Promise.all(cells.map(async ({ role, cell }) => ({ role, cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
  const byRole = Object.fromEntries(records.map((record) => [record.role, record]));
  fail(isSafeSupport(byRole.support.state), `${endpoint.id} support is unsafe: ${byRole.support.state}`);
  fail(isAir(byRole.feet.state) && isAir(byRole.head.state), `${endpoint.id} lacks two-clear normal-walk envelope`);
  return {
    id: endpoint.id,
    component: endpoint.component,
    attachmentFeet: endpoint.feet,
    existingOwnerRole: endpoint.ownerRole,
    observedCells: records,
    observedCellSetSha256: hashCells(records.map(({ cell }) => cell)),
    observedStateSha256: sha256(`${records.map(({ role, cell, state }) => `${role}:${cellKey(cell)}=${state}`).join('\n')}\n`),
    sourceCondition: 'ONE_STATION_HAS_SAFE_SUPPORT_AND_TWO_CLEAR_AIR_CELLS_ONLY',
    boundary: 'This recheck retains the existing endpoint as an attachment candidate; it assigns no new owner, first new station, side width, or route beyond the accepted component.',
  };
};
const endpointChecks = await Promise.all(endpoints.map(inspectEndpoint));
const [mp07, mp06] = endpointChecks;
const manhattan = Math.abs(mp07.attachmentFeet.x - mp06.attachmentFeet.x)
  + Math.abs(mp07.attachmentFeet.y - mp06.attachmentFeet.y)
  + Math.abs(mp07.attachmentFeet.z - mp06.attachmentFeet.z);
fail(manhattan === 302, `attachment separation drifted: ${manhattan}`);

const mapSvg = () => {
  const width = 1400; const height = 820; const bounds = { minX: -280, maxX: -80, minZ: -520, maxZ: -310 }; const margin = 88;
  const project = ({ x, z }) => [margin + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (width - margin * 2), height - margin - ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * (height - margin * 2)];
  const [aX, aY] = project(mp07.attachmentFeet); const [bX, bY] = project(mp06.attachmentFeet);
  const xTicks = [-260, -220, -180, -140, -100]; const zTicks = [-500, -460, -420, -380, -340];
  const grid = [
    ...xTicks.map((x) => { const [px] = project({ x, z: bounds.minZ }); return `<line class="grid" x1="${px}" y1="${margin}" x2="${px}" y2="${height - margin}"/><text class="axis" x="${px}" y="${height - 48}">x ${x}</text>`; }),
    ...zTicks.map((z) => { const [, py] = project({ x: bounds.minX, z }); return `<line class="grid" x1="${margin}" y1="${py}" x2="${width - margin}" y2="${py}"/><text class="axis" x="14" y="${py + 5}">z ${z}</text>`; }),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="SYS-01 MP07 to MP06 continuity contract map">
 <style>.bg{fill:#0b1420}.grid{stroke:#274458;stroke-width:1}.axis{fill:#9bb9c8;font:14px system-ui,sans-serif;text-anchor:middle}.title{fill:#f8fbff;font:700 29px system-ui,sans-serif}.sub{fill:#c4d7e3;font:16px system-ui,sans-serif}.label{fill:#f8fbff;font:700 17px system-ui,sans-serif}.note{fill:#c4d7e3;font:15px system-ui,sans-serif}.mp07{fill:#38bdf8;stroke:#e0f2fe;stroke-width:3}.mp06{fill:#a3e635;stroke:#ecfccb;stroke-width:3}.gap{stroke:#fb923c;stroke-width:5;stroke-dasharray:14 11}.warn{fill:#4b2519;stroke:#fb923c;stroke-width:2}.box{fill:#112536;stroke:#41647a;stroke-width:1.5}</style>
 <rect class="bg" width="100%" height="100%"/><text class="title" x="88" y="42">SYS-01 · MP07 ↔ MP06 pedestrian-continuity contract 02</text><text class="sub" x="88" y="69">Latest immutable-source attachment recheck · horizontal relationship only</text>${grid}
 <line class="gap" x1="${aX}" y1="${aY}" x2="${bX}" y2="${bY}"/><circle class="mp07" cx="${aX}" cy="${aY}" r="13"/><circle class="mp06" cx="${bX}" cy="${bY}" r="13"/>
 <rect class="box" x="850" y="110" width="460" height="145" rx="10"/><text class="label" x="874" y="140">Rechecked attachments</text><text class="note" x="874" y="168">MP07 ${SVG_ESCAPE(pointText(mp07.attachmentFeet))}: support + two-air envelope pass</text><text class="note" x="874" y="194">MP06 ${SVG_ESCAPE(pointText(mp06.attachmentFeet))}: support + two-air envelope pass</text><text class="note" x="874" y="225">Neither dot extends the accepted component boundary.</text>
 <rect class="warn" x="850" y="280" width="460" height="196" rx="10"/><text class="label" x="874" y="312">Unowned, unsurveyed separation</text><text class="note" x="874" y="343">${manhattan} Manhattan cells; Δx=141, Δy=0, Δz=161</text><text class="note" x="874" y="371">Orange dashed graphic is not an alignment or route.</text><text class="note" x="874" y="399">No first-new station, side width, grade, owner,</text><text class="note" x="874" y="423">return anchor, retained seam, or operation exists.</text><text class="note" x="874" y="451">Default deny remains in force across all intervening cells.</text>
 <text class="note" x="88" y="780">Required later survey: finite contiguous cell set, one-to-one owner/interface cover, 3-wide clear normal-walk geometry, 2-air headroom, max 1-block steps, 3×3 landings at grade turns, and bidirectional return/recovery proof.</text>
</svg>`;
};

const contract = {
  schemaVersion: 1,
  id: 'SYS01-MP07-MP06-PEDESTRIAN-CONTINUITY-CONTRACT-02',
  status: 'CURRENT_SOURCE_DEFAULT_DENY_NONAUTHORIZING',
  purpose: 'Recheck the two measured attachments against the latest complete immutable source and define the finite evidence required before an MP07-to-MP06 pedestrian corridor can be selected. It is not a corridor design, owner assignment, operation, or release.',
  generatedAtUtc: GENERATED_AT,
  mutationAuthority: false,
  source: {
    snapshot: relative(SNAPSHOT),
    captureId: capture.captureId ?? null,
    capturedAtUtc: capture.capturedAtUtc ?? null,
    immutableCopy: capture.immutableCopy,
    requiredMemberCount: capture.requiredMembers.length,
    captureManifestSha256: sha256(captureBytes),
    previousGapContract: 'data/world-review/sys01-mp07-mp06-pedestrian-gap-contract-01-mp06-post-20260826T143902Z/sys01-mp07-mp06-pedestrian-gap-contract.json',
    previousGapEvidenceIsHistoricalOnly: true,
  },
  recheckedAttachments: endpointChecks,
  measuredSeparation: { manhattanCells: manhattan, delta: { x: 141, y: 0, z: 161 }, policy: 'Measurement is evidence of a gap only; no alignment, terrain conclusion, or work envelope is inferred.' },
  finiteFutureSurveyAcceptance: {
    corridor: {
      rule: 'One contiguous, finite, fresh-source corridor survey must enumerate every retained and proposed support, feet, head, side-protection, landing, grade-transition, barrier, drainage, recovery, and interface cell, with canonical state and deterministic cell/state hashes.',
      forbidden: ['straight-line inference', 'open-ended search frontier', 'partial attachment', 'unbounded terrain or building envelope'],
    },
    ownershipAndInterfaces: {
      requiredRoles: ['MP07_ATTACHMENT_OWNER', 'PUBLIC_CORRIDOR_OWNER', 'MP06_ATTACHMENT_OWNER', 'RETURN_AND_RECOVERY_OWNER'],
      rule: 'Every surveyed cell and retained seam has exactly one named owner or a reviewed migration; each interface declares exact cell set/bounds and hash, direction, receiver, role, forward/rollback responsibility, and both owners. Gaps, overlaps, wildcards, and inherited ownership fail closed.',
    },
    normalWalk: {
      standard: 'NORMAL_WALK_NO_JUMP_NO_SPRINT_NO_DIG_NO_TOWER_NO_SWIM_NO_TELEPORT',
      minimumClearWidth: 3,
      minimumClearHeadroom: 2,
      maximumAdjacentFloorRise: 1,
      landingRequirement: 'Every elevation reversal, turn at a grade transition, or recovery branch must include an explicitly enumerated 3x3 clear landing with support, feet, and head states.',
      routes: ['MP07 attachment to MP06 attachment', 'MP06 attachment to MP07 attachment', 'each interior station to a named public return/recovery anchor in both directions'],
      prohibitedSubstitutes: ['minecart', 'one-way drop', 'flight', 'teleport', 'unsurveyed side escape', 'unowned door or building interior'],
    },
    hazardAndReleaseGate: {
      sourceSurveyMustRecord: ['fluids and waterlogged states', 'gravity chains and supports', 'block entities/containers', 'protected cores', 'saved and fresh live entities'],
      beforeMutation: ['exact forward/rollback inverse', 'fresh scoped source preflight', 'strict-noop forward and rollback parser checks', 'journaled guarded execution', 'fresh post snapshot', 'rollback post-state preflight', 'independent bidirectional normal-walk post QA'],
    },
  },
  defaultDeny: {
    firstNewStation: 'DENIED', corridorCells: 'DENIED', inferredRoute: 'DENIED', ownerTransfer: 'DENIED', interface: 'DENIED', recoveryAnchor: 'DENIED', operations: 'DENIED', rcon: 'DENIED', worldMutation: 'DENIED',
  },
  outputs: { operationFiles: 0, rollbackFiles: 0, liveReads: 0, rconCalls: 0, worldEdits: 0 },
  identitySha256: null,
};
contract.identitySha256 = sha256(`${JSON.stringify(contract, null, 2)}\n`);

const out = absolute(OUT);
fs.mkdirSync(out, { recursive: true });
const jsonPath = path.join(out, 'sys01-mp07-mp06-pedestrian-continuity-contract-02.json');
const mapPath = path.join(out, 'sys01-mp07-mp06-pedestrian-continuity-contract-map.svg');
const markdownPath = path.join(out, 'SYS01-MP07-MP06-PEDESTRIAN-CONTINUITY-CONTRACT-02.md');
fs.writeFileSync(jsonPath, `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(mapPath, mapSvg());
fs.writeFileSync(markdownPath, `# SYS-01 MP07–MP06 pedestrian-continuity contract 02\n\n**Status:** \`${contract.status}\`  \n**Source:** \`${contract.source.snapshot}\` (${contract.source.requiredMemberCount}-member immutable capture; manifest SHA-256 \`${contract.source.captureManifestSha256}\`)\n\nThis is a current-source attachment recheck and a default-deny acceptance contract. It creates no pedestrian corridor, public route, owner/interface transfer, operation, or physical release.\n\n![Attachment recheck and unowned gap](sys01-mp07-mp06-pedestrian-continuity-contract-map.svg)\n\n## Rechecked finite endpoints\n\n| Attachment | Exact feet station | Current-source observation | Boundary retained |\n|---|---:|---|---|\n| MP07 Ravensreach–MainStreet | ${pointText(mp07.attachmentFeet)} | safe support and two clear air cells | Existing MP07 accepted trace only |\n| MP06 endpoint lower clearway | ${pointText(mp06.attachmentFeet)} | safe support and two clear air cells | Existing MP06 accepted lower clearway only |\n\nThe attachment points remain **${manhattan} Manhattan cells** apart (Δx=141, Δy=0, Δz=161). That is not a route alignment or a claim about intervening terrain. Every intervening cell remains unowned and denied.\n\n## Exact future acceptance boundary\n\nA later package must survey one finite contiguous corridor with every support, feet, head, side-protection, landing, grade-transition, retained seam, recovery, and proposed target cell. It must attach a one-to-one exact owner/interface cover with the four roles \`${contract.finiteFutureSurveyAcceptance.ownershipAndInterfaces.requiredRoles.join('`, `')}\`.\n\nNormal walking must be bidirectional, at least 3 clear blocks wide and 2 clear blocks high, with a maximum one-block floor change and enumerated 3×3 landings at every grade turn/reversal or recovery branch. Each interior station needs named public return and recovery proof in both directions. Minecart, teleport, falling, flight, unsurveyed escapes, and unowned interiors do not qualify.\n\nOnly after those acceptance records, exact inverse operations, fresh release kernel, and independent post-release route QA pass may any change be considered.\n\nNo live read, capture, RCON call, operation file, or world mutation occurred.\n`);
console.log(JSON.stringify({ status: contract.status, output: relative(OUT), identitySha256: contract.identitySha256, source: contract.source.snapshot, separation: contract.measuredSeparation }, null, 2));
