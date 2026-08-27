#!/usr/bin/env node
/**
 * MP06 road route threshold contract 01.
 *
 * Converts the current immutable-road survey into a deliberately non-authorizing
 * exact interface packet.  It cannot emit Minecraft operations: the measured
 * road already exists, and any later repair must begin with an accepted owner
 * threshold plus an observed live route defect.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (name) => {
  const value = option(name);
  if (!value) throw new Error(`Usage: generate_mp06_road_route_threshold_contract_01.mjs --survey <survey.json> --out-dir <directory> [--generated-at <ISO>]`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP06 route threshold contract rejected: ${message}`);
};
const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SURVEY = required('--survey');
const OUT = required('--out-dir');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const surveyBytes = fs.readFileSync(absolute(SURVEY));
const survey = JSON.parse(surveyBytes);
fail(survey.id === 'MP06-FULL-ROAD-DESIGN-03', 'wrong survey id');
fail(survey.status === 'SOURCE_BOUND_HOLD_ROUTE_PRESENT_NO_CURRENT_DEFECT_OR_OWNED_DELTA', 'survey does not prove the current route-present/no-defect state');
fail(survey.liveWorldMutated === false && survey.decision?.operationCount === 0, 'survey must be read-only with zero operations');
fail(survey.endpointRouteGraph?.routeFound === true, 'no measured endpoint route exists');
const route = survey.endpointRouteGraph.routeStationCells;
const segments = survey.protectedInterfaces?.routeInterfaceSegments;
fail(route?.cellCount === 207 && Array.isArray(route.cells), 'route cell set is incomplete');
fail(Array.isArray(segments) && segments.length === 3, 'exactly three protected route interface segments are required');
const expected = new Map([
  ['OASIS', 41], ['WESTLIGHT_VENUE', 61], ['LANTERN_HALL', 17],
]);
for (const segment of segments) {
  fail(expected.get(segment.owner) === segment.cellCount, `unexpected ${segment.owner} segment count`);
  fail(typeof segment.coordinateSetSha256 === 'string' && Array.isArray(segment.cells), `missing exact cells for ${segment.owner}`);
}
const snapshot = survey.source?.snapshot;
fail(typeof snapshot === 'string', 'survey source snapshot is missing');
const capturePath = path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'source capture manifest is missing');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'source capture is not immutable');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130, 'source capture is not complete (expected 130 members)');
for (const member of capture.requiredMembers) {
  const filename = path.join(absolute(snapshot), member.path);
  fail(fs.existsSync(filename), `captured member is absent: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}
fail(sha256(captureBytes) === survey.source.captureManifestSha256, 'survey capture manifest hash does not match source');

const contract = {
  schemaVersion: 1,
  id: 'MP06-ROAD-ROUTE-THRESHOLD-CONTRACT-01',
  status: 'SOURCE_BOUND_DEFAULT_DENY_THRESHOLD_CONTRACT_NOT_ACCEPTED',
  generatedAtUtc: GENERATED_AT,
  mutationAuthority: false,
  safetyBoundary: {
    immutableSurveyOnly: true,
    liveCallsPerformed: false,
    botMovementPerformed: false,
    worldEditsPerformed: false,
    operationFilesEmitted: false,
    releaseManifestEmitted: false,
  },
  source: {
    snapshot,
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: sha256(captureBytes),
    requiredMemberCount: capture.requiredMembers.length,
    immutableCopy: capture.immutableCopy,
    survey: relative(SURVEY),
    surveySha256: sha256(surveyBytes),
  },
  observedExistingRoute: {
    routeFound: true,
    stationCells: { cellCount: route.cellCount, coordinateSetSha256: route.coordinateSetSha256, bounds: route.bounds },
    stationCount: survey.endpointRouteGraph.routeStationCount,
    maximumAdjacentRise: survey.endpointRouteGraph.maximumAdjacentRise,
    statement: 'The 207-station material route is already present in the immutable source. It is neither a defect nor a release target.',
  },
  exactProtectedInterfaceSegments: segments.map(({ owner, cellCount, coordinateSetSha256, bounds, cells, disposition }) => ({
    owner,
    routeStationCells: { cellCount, coordinateSetSha256, bounds, cells },
    disposition,
    requiredAcceptance: [
      'Named owner accepts this exact source-hash-bound station set as a route-use threshold or explicitly excludes it.',
      'Any object/container/block-entity at or adjacent to a future target is retained or receives a separately exact reviewed migration; broad clearance is prohibited.',
      'No construction follows unless a fresh live no-dig/no-tower/no-sprint/no-jump survey proves a route-connected functional defect in an accepted cell set.',
    ],
  })),
  widerEnvelopeExclusions: {
    blockEntityCount: survey.protectedInterfaces.blockEntitiesInFullRoadEnvelope.length,
    savedEntityCount: survey.protectedInterfaces.savedEntitiesInFullRoadEnvelope.length,
    policy: 'The 19 block entities are evidence for full-envelope exclusion, not a permission to move, clear, or replace them.',
  },
  acceptanceGate: {
    requiredOwnerSet: ['TE-REGIONAL-APPROACH-ROAD', 'OASIS', 'WESTLIGHT_VENUE', 'LANTERN_HALL'],
    exactUniqueInterfaceStationCount: survey.protectedInterfaces.routeCellsInPublishedOverlaps,
    ownerSegmentStationCount: segments.reduce((sum, segment) => sum + segment.cellCount, 0),
    requiredLiveSurvey: 'A fresh route survey must prove normal walking in both directions without digging, towers, sprinting, jumping, or state changes; it must record every station and any failure.',
    requiredIfDefectObserved: 'A separate guarded compiler must bind only the newly observed accepted-owner defect cells, canonical source states, exact forward/rollback inverse, protected-core exclusions, fresh source/post snapshots, strict-noop parser/preflight, entity clearance, journaled execution, rollback poststate preflight, and functional QA.',
  },
  rejectedFragments: [
    're-paving or re-releasing the existing 207-station road route',
    'shoulder-only or lighting-only fragments',
    'broad terrain edits',
    'block-entity clearing or tag-only migration',
    'assumption that a published overlap is ownership acceptance',
  ],
  nonClaims: [
    'No route traversal has been performed.',
    'No owner has accepted an interface through this packet.',
    'No Minecraft, RCON, bot, database, or filesystem world mutation is authorized.',
    'MP06 and SYS-04 remain incomplete.',
  ],
};

const allCells = route.cells;
const minX = Math.min(...allCells.map(({ x }) => x)); const maxX = Math.max(...allCells.map(({ x }) => x));
const minZ = Math.min(...allCells.map(({ z }) => z)); const maxZ = Math.max(...allCells.map(({ z }) => z));
const scale = 5; const pad = 58; const width = (maxX - minX + 1) * scale + pad * 2; const height = (maxZ - minZ + 1) * scale + 155;
const segmentColor = new Map([['OASIS', '#22c55e'], ['WESTLIGHT_VENUE', '#38bdf8'], ['LANTERN_HALL', '#fbbf24']]);
const key = ({ x, y, z }) => `${x},${y},${z}`;
const ownerByCell = new Map(segments.flatMap((segment) => segment.cells.map((cell) => [key(cell), segment.owner])));
const px = (x) => pad + (x - minX) * scale; const pz = (z) => 55 + (z - minZ) * scale;
const rects = allCells.map((cell) => `<rect x="${px(cell.x)}" y="${pz(cell.z)}" width="${scale}" height="${scale}" fill="${segmentColor.get(ownerByCell.get(key(cell))) ?? '#d1d5db'}"/>`).join('');
const legend = segments.map((segment, index) => `<rect x="${pad + index * 225}" y="${height - 69}" width="14" height="14" fill="${segmentColor.get(segment.owner)}"/><text x="${pad + 20 + index * 225}" y="${height - 57}" class="note">${escape(segment.owner)} — ${segment.cellCount} exact stations</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>.bg{fill:#07121f}.title{fill:#f8fafc;font:700 22px system-ui,sans-serif}.sub{fill:#bdd5e8;font:14px system-ui,sans-serif}.note{fill:#dceaf5;font:13px system-ui,sans-serif}.axis{fill:#9fb7c9;font:12px system-ui,sans-serif}.frame{fill:none;stroke:#4d718c;stroke-width:1}</style>
<rect class="bg" width="100%" height="100%"/><text x="${pad}" y="26" class="title">MP06 exact road threshold interfaces</text><text x="${pad}" y="46" class="sub">Existing 207-station route; colored segments need acceptance, not paving</text>
<rect x="${pad}" y="55" width="${(maxX - minX + 1) * scale}" height="${(maxZ - minZ + 1) * scale}" class="frame"/>${rects}
<text x="${pad}" y="${height - 92}" class="axis">${minX}, ${minZ}</text><text x="${pad + (maxX - minX + 1) * scale - 88}" y="${height - 92}" class="axis">${maxX}, ${maxZ}</text>${legend}
<text x="${pad}" y="${height - 27}" class="note">Grey: existing unprotected route station. Map is source-bound and default-deny; no world operation is emitted.</text></svg>\n`;
const out = absolute(OUT);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp06-road-route-threshold-contract.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp06-road-route-threshold-map.svg'), svg);
const markdown = [
  '# MP06 road route threshold contract 01', '',
  `**Status:** \`${contract.status}\`  `,
  `**Source:** \`${contract.source.snapshot}\`  `,
  `**Survey:** \`${contract.source.survey}\`  `,
  '',
  '## Current source result', '',
  `The immutable source contains the existing ${route.cellCount}-station road-material route, at a maximum adjacent rise of ${contract.observedExistingRoute.maximumAdjacentRise}. It is not a missing road package. ${contract.exactProtectedInterfaceSegments.length} protected segments cover ${contract.acceptanceGate.exactUniqueInterfaceStationCount} unique exact stations (${contract.acceptanceGate.ownerSegmentStationCount} owner-segment assignments because 17 stations are shared), so a paving or shoulder fragment is not an honest successor.`, '',
  '![Exact source-bound route threshold map](mp06-road-route-threshold-map.svg)', '',
  '## Exact acceptance segments', '',
  ...contract.exactProtectedInterfaceSegments.map((segment) => `- **${segment.owner}:** ${segment.routeStationCells.cellCount} stations, SHA-256 \`${segment.routeStationCells.coordinateSetSha256}\`, bounds \`x=${segment.routeStationCells.bounds.minX}..${segment.routeStationCells.bounds.maxX}, y=${segment.routeStationCells.bounds.minY}..${segment.routeStationCells.bounds.maxY}, z=${segment.routeStationCells.bounds.minZ}..${segment.routeStationCells.bounds.maxZ}\`.`), '',
  '## First required decision', '',
  'The road owner and each named protected owner must accept or exclude the exact station sets above on this source hash. That decision does not authorize a block change. It merely establishes the smallest route-use threshold that a fresh live normal-walk survey can test.', '',
  '## Non-claims', '',
  ...contract.nonClaims.map((item) => `- ${item}`), '',
];
fs.writeFileSync(path.join(out, 'MP06-ROAD-ROUTE-THRESHOLD-CONTRACT-01.md'), `${markdown.join('\n')}\n`);
console.log(`${contract.status}\ncontract=${relative(path.join(OUT, 'mp06-road-route-threshold-contract.json'))}\nmap=${relative(path.join(OUT, 'mp06-road-route-threshold-map.svg'))}`);
