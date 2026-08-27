#!/usr/bin/env node
/**
 * MP05/B07 exterior containment-boundary search 06.
 *
 * Looks only for local, finite, source-bound air cells immediately exposed to
 * the current B07-connected water body. A face can be considered as a future
 * plug/liner only when every proposed target is within a separately accepted
 * construction domain and does not change a retained route/opening state.
 * This search is read-only and deliberately emits no operation or target map.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, cellKey, deriveB07WestTwo, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))) });
const pointSort = (a, b) => a.y - b.y || a.z - b.z || a.x - b.x;
const exact = (cells) => {
  const unique = uniqueCells(cells).sort(pointSort);
  return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) };
};
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const dirs = [
  ['NEGATIVE_X', -1, 0, 0], ['POSITIVE_X', 1, 0, 0], ['NEGATIVE_Y', 0, -1, 0],
  ['POSITIVE_Y', 0, 1, 0], ['NEGATIVE_Z', 0, 0, -1], ['POSITIVE_Z', 0, 0, 1],
];

const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const OWNER = option('--owner-input', 'data/world-review/mp05-b07-integrated-owner-interface-04-post-20260828T041000Z/mp05-b07-integrated-owner-interface-04.json');
const TOPOLOGY = option('--topology', 'data/world-review/mp05-b07-fluid-topology-extension-03-post-20260828T041000Z/fluid-topology-extension-findings.json');
const MECHANISMS = option('--mechanisms', 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-exterior-containment-boundary-search-06-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-EXTERIOR-CONTAINMENT-BOUNDARY-SEARCH-06-2026-08-28.md');
const GENERATED_AT = option('--generated-at', '2026-08-28T05:45:00.000Z');

for (const filename of [
  path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'),
  path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'),
  OWNER, TOPOLOGY, MECHANISMS,
]) assert(fs.existsSync(abs(filename)), `required input missing: ${filename}`);
const capture = json(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const owner = json(OWNER);
const topology = json(TOPOLOGY);
const mechanisms = json(MECHANISMS);
assert(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length >= 130, 'complete immutable source required');
assert(owner.id === 'MP05-B07-INTEGRATED-OWNER-INTERFACE-04' && owner.mutationAuthority === false
  && owner.source?.snapshot === rel(SNAPSHOT) && owner.source.captureId === capture.captureId,
  'owner/interface input 04 does not bind this exact source');
assert(topology.id === 'MP05-B07-FLUID-TOPOLOGY-EXTENSION-01' && topology.source?.snapshotRoot === rel(SNAPSHOT)
  && topology.source.captureId === capture.captureId && topology.topologyTraces?.extended?.capReached === true,
  'current source requires the matching capped-out topology trace');
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
assert(b07.construction.length === 8134 && b07.interaction.length === 13608, 'canonical B07 geometry drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};

const seeds = [];
for (const cell of b07.interaction) {
  const state = await stateAt(cell);
  if (fluid(state)) seeds.push({ cell, state });
}
assert(seeds.length === topology.topologyTraces.seed.interactionFluid.cellCount, 'local fluid seed census drifted from the current topology record');
const airFaces = [];
for (const { cell: fromFluid, state: fromState } of seeds) {
  for (const [direction, dx, dy, dz] of dirs) {
    const toAir = { x: fromFluid.x + dx, y: fromFluid.y + dy, z: fromFluid.z + dz };
    const toState = await stateAt(toAir);
    if (!air(toState)) continue;
    const targetKey = cellKey(toAir);
    const inConstruction = constructionKeys.has(targetKey);
    const inInteraction = interactionKeys.has(targetKey);
    airFaces.push({
      fromFluid, fromState, direction, toAir, toState, inConstruction, inInteraction,
      disposition: inConstruction
        ? 'REQUIRES_SEPARATE_ROUTE_AND_RECEIVER_CHANGE_CONTRACT'
        : inInteraction
          ? 'REJECTED_INTERACTION_ROUTE_OR_OPENING_ENVELOPE_DEFAULT_DENY'
          : 'REJECTED_EXTERIOR_WITHOUT_EXACT_COUNTERPART_DOMAIN',
    });
  }
}
const groupBy = (records, key) => Object.entries(records.reduce((result, record) => {
  const label = key(record);
  (result[label] ??= []).push(record);
  return result;
}, {})).map(([id, faces]) => ({
  id, faceCount: faces.length, fromFluid: exact(faces.map(({ fromFluid }) => fromFluid)), toAir: exact(faces.map(({ toAir }) => toAir)),
  faceSetSha256: sha256(`${faces.slice().sort((a, b) => `${cellKey(a.fromFluid)}>${a.direction}>${cellKey(a.toAir)}`.localeCompare(`${cellKey(b.fromFluid)}>${b.direction}>${cellKey(b.toAir)}`)).map((face) => `${cellKey(face.fromFluid)}>${face.direction}>${cellKey(face.toAir)}`).join('\n')}\n`),
  faces: faces.sort((a, b) => pointSort(a.toAir, b.toAir) || a.direction.localeCompare(b.direction)),
}));
const byDisposition = groupBy(airFaces, ({ disposition }) => disposition);
const constructionTargets = airFaces.filter(({ inConstruction }) => inConstruction);
const interactionTargets = airFaces.filter(({ inInteraction }) => inInteraction);
const exteriorTargets = airFaces.filter(({ inInteraction }) => !inInteraction);
assert(constructionTargets.length === 0, 'a new in-construction air boundary requires a dedicated route/receiver contract rather than this no-route search');
assert(airFaces.length > 0, 'no local fluid-to-air boundary faces remain to screen');

const allMapCells = new Map();
for (const seed of seeds) allMapCells.set(cellKey(seed.cell), { type: 'fluid', ...seed.cell });
for (const face of airFaces) allMapCells.set(cellKey(face.toAir), { type: face.inInteraction ? 'rejected-interaction-air' : 'rejected-exterior-air', ...face.toAir });
const render = (y) => {
  const minX = 2101; const maxX = 2114; const minZ = -404; const maxZ = -392; const unit = 30; const left = 75; const top = 50;
  const cells = [];
  for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
    const key = `${x},${y},${z}`; const hit = allMapCells.get(key); const inI = interactionKeys.has(key); const inC = constructionKeys.has(key);
    const fill = hit?.type === 'fluid' ? '#1479c9' : hit?.type === 'rejected-interaction-air' ? '#f5b942' : hit?.type === 'rejected-exterior-air' ? '#e86a5f' : inC ? '#f8fafc' : inI ? '#e2e8f0' : '#ffffff';
    const state = stateCache.get(key) ?? '';
    cells.push(`<rect x="${left + (x - minX) * unit}" y="${top + (z - minZ) * unit}" width="${unit}" height="${unit}" fill="${fill}" stroke="${inC ? '#334155' : inI ? '#94a3b8' : '#dbe3ea'}"/><title>${x},${y},${z}: ${state || 'not sampled'}; ${hit?.type ?? (inC ? 'construction' : inI ? 'interaction' : 'outside')}</title>`);
  }
  const labels = Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i).map((x) => `<text x="${left + (x - minX) * unit + 4}" y="${top - 8}" font-size="8">${x}</text>`).join('')
    + Array.from({ length: maxZ - minZ + 1 }, (_, i) => minZ + i).map((z) => `<text x="${left - 44}" y="${top + (z - minZ) * unit + 18}" font-size="8">${z}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="490" viewBox="0 0 860 490"><style>text{font-family:ui-monospace,monospace;fill:#172033}.h{font-size:16px;font-weight:700}.s{font-size:11px}</style><rect width="100%" height="100%" fill="#fff"/><text class="h" x="14" y="22">MP05 B07 exterior containment boundary screen — y=${y}</text><text class="s" x="14" y="39">Blue = current fluid; amber = air inside B07 interaction (no route/opening change authority); red = exterior air with no exact counterpart domain.</text>${cells.join('')}${labels}<rect x="520" y="80" width="300" height="130" fill="#f8fafc" stroke="#cbd5e1"/><text class="s" x="538" y="108">Result: zero prepare-ready local boundaries</text><text class="s" x="538" y="132">Fluid-to-air faces: ${airFaces.length}</text><text class="s" x="538" y="154">Interaction-only rejects: ${interactionTargets.length}</text><text class="s" x="538" y="176">Exterior-domain rejects: ${exteriorTargets.length}</text><text class="s" x="538" y="198">Construction targets: ${constructionTargets.length}</text></svg>\n`;
};

const report = {
  schemaVersion: 1,
  id: 'MP05-B07-EXTERIOR-CONTAINMENT-BOUNDARY-SEARCH-06',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_NO_PREPARE_READY_EXTERIOR_CONTAINMENT_BOUNDARY',
  purpose: 'Searches the exact B07-connected fluid/air interfaces for an independently isolatable, no-route/no-opening containment segment after hydrology role assignment. It is a source-bound decision only.',
  mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, immutableRequiredMemberCount: capture.requiredMembers.length },
  bindings: { ownerInterface04: binding(OWNER), fluidTopology03: binding(TOPOLOGY), mechanisms: binding(MECHANISMS) },
  exactDomain: { construction: exact(b07.construction), interaction: exact(b07.interaction) },
  searchRule: {
    targetMustBe: 'A current air cell immediately face-adjacent to B07-connected fluid, inside an exact accepted construction domain, and disjoint from route/opening state.',
    excluded: ['all interaction-only air cells because this search has no route/opening change contract', 'all exterior air cells because no exact counterpart domain is bound', 'all non-air cells because a plug target cannot be inferred from an existing solid face'],
  },
  localBoundaryInventory: {
    fluidSeeds: exact(seeds.map(({ cell }) => cell)),
    fluidToAirFaceCount: airFaces.length,
    constructionTargetFaceCount: constructionTargets.length,
    interactionTargetFaceCount: interactionTargets.length,
    exteriorTargetFaceCount: exteriorTargets.length,
    byDisposition,
  },
  prepareReadyCandidate: null,
  preciseReasonNoCandidate: [
    `All ${airFaces.length} current B07-connected fluid-to-air faces were enumerated with canonical source state.`,
    `${interactionTargets.length} target faces are air inside the B07 interaction envelope but outside its construction set; changing them could alter retained route/opening clearance and this search has no such contract.`,
    `${exteriorTargets.length} target faces are outside the B07 interaction envelope; no exact counterpart domain or directed overflow/receiver treatment exists for them.`,
    `Zero fluid-to-air targets lie in the exact ${b07.construction.length.toLocaleString()}-cell construction set, so no local plug can be prepared without expanding authority.`,
    'The parent component remains capped-out at 125,000 observed cells; a local solid face cannot be promoted into a receiver or terminal.',
  ],
  nextOnlyIfNeeded: [
    'Bind one exact exterior or interaction interface cell set to an accepted counterpart and prove it does not alter route/opening clearance.',
    'Supply a directed source -> liner -> receiver/overflow/failure -> rollback contract for that exact finite boundary.',
    'Re-run this search against the new immutable source before a dedicated compiler produces any operation.',
  ],
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-exterior-containment-boundary-search-06.json')), `${JSON.stringify(report, null, 2)}\n`);
for (const y of [5, 16, 17]) fs.writeFileSync(abs(path.join(OUT_DIR, `b07-exterior-containment-boundary-y${y}.svg`)), render(y));
const markdown = `# MP05 B07 exterior containment-boundary search 06\n\n**Status:** \`${report.status}\`  \n**Immutable source:** \`${report.source.snapshot}\` (capture \`${capture.captureId}\`)  \n**Machine report:** [JSON](../../../${rel(path.join(OUT_DIR, 'mp05-b07-exterior-containment-boundary-search-06.json'))})\n\nThis search evaluates local boundaries only. It does not select a plug, liner, receiver, outlet, route, opening, public path, or egress.\n\n## Exact current-source maps\n\n- [Low wet interface — y=5](../../../${rel(path.join(OUT_DIR, 'b07-exterior-containment-boundary-y5.svg'))})\n- [Upper wet interface — y=16](../../../${rel(path.join(OUT_DIR, 'b07-exterior-containment-boundary-y16.svg'))})\n- [Air-contact plane — y=17](../../../${rel(path.join(OUT_DIR, 'b07-exterior-containment-boundary-y17.svg'))})\n\nThe exact scan found **${airFaces.length} fluid-to-air faces**. **${interactionTargets.length}** terminate in interaction-only air, where a block change would alter a route/opening envelope without a new dedicated contract. The other **${exteriorTargets.length}** terminate outside the B07 interaction domain, where no exact counterpart boundary is bound. **${constructionTargets.length}** targets lie in the accepted construction set.\n\n## Disposition\n\nThere is no prepare-ready local containment boundary on this source. The 125,000-cell capped-out component remains an upstream topology issue, and a local dry face does not create a receiver, overflow treatment, or safe rollback.\n\n${report.preciseReasonNoCandidate.map((reason) => `- ${reason}`).join('\n')}\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'mp05-b07-exterior-containment-boundary-search-06.json')), markdown: rel(MARKDOWN), fluidToAirFaces: airFaces.length, interactionRejects: interactionTargets.length, exteriorRejects: exteriorTargets.length, prepareReadyCandidate: false, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
