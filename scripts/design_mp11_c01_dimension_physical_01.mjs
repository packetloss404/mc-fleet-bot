#!/usr/bin/env node
/**
 * MP11 C01-DIMENSION-PHYSICAL-01 — read-only smallest-defect design survey.
 * It binds the post-C01-08 whole-scope census and a fresh BKR route census,
 * identifies the public switchback as an isolable design candidate, and emits
 * evidence/maps only. It cannot emit operations, manifests, or live calls.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z');
const DIMENSION = option('--dimension', 'data/world-review/mp11-bkr-c01-dimension-recovery-design-03-approach-containment-08-post-20260828T040000Z/mp11-bkr-c01-dimension-recovery-design-01.json');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-00-c01-08-post-20260828T040000Z/bkr-survey-00.json');
const OUT = option('--out', 'data/world-review/mp11-c01-dimension-physical-01-c01-08-post-20260828T040000Z');
const abs = (f) => path.resolve(ROOT, f);
const rel = (f) => path.relative(ROOT, abs(f)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11 C01-DIMENSION-PHYSICAL-01 rejected: ${message}`); };
const key = (point) => point.join(',');
const hashPoints = (points) => sha(points.map(key).sort().join('\n'));
const readJson = (filename) => { const bytes = fs.readFileSync(abs(filename)); return { bytes, json: JSON.parse(bytes) }; };

const snapshotRoot = abs(SNAPSHOT);
const manifestPath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, member)), `missing complete immutable source member ${member}`);
const manifestBytes = fs.readFileSync(manifestPath); const manifest = JSON.parse(manifestBytes);
fail(manifest.immutableCopy === true && manifest.captureId, 'snapshot has no immutable complete-save identity');
const dimensionFile = readJson(DIMENSION); const surveyFile = readJson(SURVEY);
fail(dimensionFile.json.source?.snapshot === rel(SNAPSHOT) && dimensionFile.json.source.captureId === manifest.captureId, 'whole-scope dimension report is not bound to selected snapshot');
fail(surveyFile.json.source?.snapshot?.rootDirectory === rel(SNAPSHOT) && surveyFile.json.source.snapshot.captureId === manifest.captureId, 'BKR route survey is not bound to selected snapshot');

const scope = (id) => dimensionFile.json.scopes?.find((item) => item.id === id);
const publicScope = scope('public'); const portalScope = scope('portal'); const ownerScope = scope('owner'); const serviceScope = scope('service');
for (const item of [publicScope, portalScope, ownerScope, serviceScope]) fail(item, 'whole-scope census missing a required C01 dimension scope');
const route = surveyFile.json.namedSurveyBoxes?.find((box) => box.boxId === 'publicC01')?.routes?.find((item) => item.routeId === 'TE-ROUTE-C01-PUBLIC-VERTICAL');
fail(route?.connectivity === 'PASS' && Array.isArray(route.stations) && route.stations.length === route.stationCount, 'fresh public vertical route inventory absent');
const narrow = route.stations.filter((station) => station.clearWidth < 5 || station.headroom < 5);
fail(narrow.length > 0, 'public route unexpectedly meets the dimensional threshold; this design input must be renewed');
const min = (field) => Math.min(...narrow.map((station) => station.point[field]));
const max = (field) => Math.max(...narrow.map((station) => station.point[field]));
const candidateBounds = { minX: min(0), maxX: max(0), minY: min(1), maxY: max(1), minZ: min(2), maxZ: max(2) };
const studyBounds = { minX: candidateBounds.minX - 1, maxX: candidateBounds.maxX + 1, minY: candidateBounds.minY - 1, maxY: candidateBounds.maxY + 1, minZ: candidateBounds.minZ - 1, maxZ: candidateBounds.maxZ + 1 };
const publicHazards = {
  fluids: publicScope.fluidBoundary?.count ?? null,
  gravity: publicScope.gravityBoundary?.count ?? null,
  blockEntities: publicScope.blockEntityBoundary?.count ?? null,
  containers: publicScope.blockEntityBoundary?.containerCount ?? null,
  boundaryTouchingHazards: publicScope.boundaryTouchingHazardCount ?? null,
};
fail(Object.values(publicHazards).every((value) => value === 0), 'public dimension scope is no longer dry, gravity-free, container-free, and zero-hazard');
const directServiceContainers = (serviceScope.blockEntityBoundary?.containers ?? []).filter((cell) => cell.point[0] === 869 || cell.point[0] === 871);

const legend = { adequate: '#76d6a4', width: '#ffbb5a', headroom: '#ff7272', both: '#e861b7' };
const colorFor = (station) => station.clearWidth < 5 && station.headroom < 5 ? legend.both : station.clearWidth < 5 ? legend.width : station.headroom < 5 ? legend.headroom : legend.adequate;
const svgHeader = (title, sub, width, height) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#0d1523"/><style>.h{font:700 23px system-ui;fill:#eff7ff}.s{font:12px ui-monospace,monospace;fill:#cad8e5}.t{font:10px ui-monospace,monospace;fill:#172331}</style><text class="h" x="28" y="35">${title}</text><text class="s" x="28" y="57">${sub}</text>`;
const planLeft = 78; const planTop = 94; const scale = 34; const planX = (x) => planLeft + (x - studyBounds.minX) * scale; const planZ = (z) => planTop + (studyBounds.maxZ - z) * scale;
const planGrid = Array.from({ length: studyBounds.maxX - studyBounds.minX + 1 }, (_, i) => `<text class="s" x="${planX(studyBounds.minX + i) + 9}" y="${planTop - 8}">${studyBounds.minX + i}</text>`).join('') + Array.from({ length: studyBounds.maxZ - studyBounds.minZ + 1 }, (_, i) => `<text class="s" x="${planLeft - 35}" y="${planZ(studyBounds.maxZ - i) + 21}">${studyBounds.maxZ - i}</text>`).join('');
const planCells = Array.from({ length: studyBounds.maxX - studyBounds.minX + 1 }, (_, xi) => Array.from({ length: studyBounds.maxZ - studyBounds.minZ + 1 }, (_, zi) => `<rect x="${planX(studyBounds.minX + xi)}" y="${planZ(studyBounds.maxZ - zi)}" width="${scale}" height="${scale}" fill="#17263b" stroke="#405a70"/>`).join('')).join('');
const planMarks = route.stations.filter((station) => station.point[0] >= studyBounds.minX && station.point[0] <= studyBounds.maxX && station.point[2] >= studyBounds.minZ && station.point[2] <= studyBounds.maxZ).map((station) => `<circle cx="${planX(station.point[0]) + scale / 2}" cy="${planZ(station.point[2]) + scale / 2}" r="${narrow.includes(station) ? 12 : 6}" fill="${colorFor(station)}"/><text class="t" x="${planX(station.point[0]) + 4}" y="${planZ(station.point[2]) + 21}">${station.index}/${station.point[1]}</text>`).join('');
const plan = `${svgHeader('C01 public-vertical — smallest defect plan', `post-C01-08 immutable source · 19 nonconforming stations · study ${JSON.stringify(studyBounds)}`, 620, 590)}${planGrid}${planCells}${planMarks}<text class="s" x="28" y="530"><tspan fill="${legend.width}">orange</tspan>: width &lt;5 · <tspan fill="${legend.headroom}">red</tspan>: headroom &lt;5 · <tspan fill="${legend.both}">magenta</tspan>: both</text><text class="s" x="28" y="554">This is a protected-switchback redesign study, not a target-block plan. No cells are authorized to change.</text></svg>\n`;
const sectionLeft = 75; const sectionTop = 89; const sx = (i) => sectionLeft + i * 5.3; const sy = (y) => sectionTop + (candidateBounds.maxY - y) * 24;
const sectionMarks = route.stations.map((station) => `<line x1="${sx(station.index)}" y1="${sy(station.point[1])}" x2="${sx(station.index)}" y2="${sy(station.point[1]) - Math.min(station.headroom, 5)}" stroke="${colorFor(station)}" stroke-width="4"/><circle cx="${sx(station.index)}" cy="${sy(station.point[1])}" r="3" fill="#ecf5ff"/>`).join('');
const section = `${svgHeader('C01 public-vertical — route elevation', `89 current stations; bars show first five clear blocks above feet; colours identify threshold defects`, 610, 520)}<rect x="${sectionLeft}" y="${sectionTop}" width="490" height="340" fill="#17263b" stroke="#405a70"/>${[28, 31, 34, 37, 40, 43].map((y) => `<line x1="${sectionLeft}" y1="${sy(y)}" x2="565" y2="${sy(y)}" stroke="#405a70"/><text class="s" x="35" y="${sy(y) + 4}">y=${y}</text>`).join('')}${sectionMarks}<text class="s" x="75" y="465">stations 0–67 remain outside the narrow study; 68–88 are the protected vertical switchback.</text><text class="s" x="75" y="489">Existing route is connected, but is one shared 89-station path; no independent public-return route is evidenced.</text></svg>\n`;

const rankings = [
  { scope: 'public', owner: publicScope.owner, currentDefect: '1-wide × 2-high pinch', gravity: 0, containers: 0, boundaryHazards: 0, disposition: 'SELECTED_DESIGN_ONLY' },
  { scope: 'owner', owner: ownerScope.owner, currentDefect: '1-wide × 2-high pinch', gravity: ownerScope.gravityBoundary?.count, containers: ownerScope.blockEntityBoundary?.containerCount, boundaryHazards: ownerScope.boundaryTouchingHazardCount, disposition: 'EXCLUDED_GRAVITY_INTERFACE' },
  { scope: 'service', owner: serviceScope.owner, currentDefect: '1-wide × 7-high pinch', gravity: serviceScope.gravityBoundary?.count, containers: serviceScope.blockEntityBoundary?.containerCount, boundaryHazards: serviceScope.boundaryTouchingHazardCount, disposition: 'EXCLUDED_CONTAINER_AND_GRAVITY_INTERFACE' },
  { scope: 'portal', owner: portalScope.owner, currentDefect: '2-wide × 2-high approach', gravity: portalScope.gravityBoundary?.count, containers: portalScope.blockEntityBoundary?.containerCount, boundaryHazards: portalScope.boundaryTouchingHazardCount, disposition: 'EXCLUDED_EXTENDED_GRAVITY_INTERFACE' },
];
const base = {
  schemaVersion: 1, id: 'MP11-C01-DIMENSION-PHYSICAL-01', generatedAtUtc: new Date().toISOString(),
  status: 'DESIGN_INPUT_ONLY_PUBLIC_VERTICAL_SMALLEST_ISOLABLE_DEFECT', mode: 'READ_ONLY_POST_C01_08_DIMENSION_PHYSICAL_DESIGN', mutationAuthority: false,
  safetyBoundary: { liveWorldMutated: false, liveCallsPerformed: false, rconCallsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(manifestPath), captureManifestSha256: sha(manifestBytes), captureId: manifest.captureId, dimensionSurvey: rel(DIMENSION), dimensionSurveySha256: sha(dimensionFile.bytes), bkrSurvey: rel(SURVEY), bkrSurveySha256: sha(surveyFile.bytes) },
  candidateRankingWithoutPhysicalRecommendation: rankings,
  selectedDesignInput: {
    scope: 'public', owner: publicScope.owner, routeId: route.routeId, defectStationRange: [narrow[0].index, narrow.at(-1).index], defectStationCount: narrow.length, defectStationSetSha256: hashPoints(narrow.map((station) => station.point)), candidateBounds, studyBounds,
    routeCurrentState: { stationCount: route.stationCount, normalWalkConnectivity: route.connectivity, routePass: route.routePass, minWidth: route.minWidth, minHeadroom: route.minHeadroom, nonconformingStations: narrow.map((station) => ({ index: station.index, point: station.point, clearWidth: station.clearWidth, headroom: station.headroom, supportState: station.supportState })) },
    interfaceInventory: {
      sourceEndpoint: { anchor: route.startAnchor, role: 'existing C01 public vertical source endpoint', owner: 'Town Expansion / C01 public realm', retained: true },
      destinationEndpoint: { anchor: route.endAnchor, role: 'existing C01 public vertical destination endpoint', owner: 'Town Expansion / C01 public realm', retained: true },
      containerBoundary: { publicCandidateContainers: 0, publicCandidateBlockEntities: 0, serviceScopeExcluded: true, excludedServiceContainerCount: serviceScope.blockEntityBoundary?.containerCount ?? 0, directServiceFlankContainers: directServiceContainers },
      physicalHazardBoundary: { publicFluids: 0, publicGravity: 0, publicBoundaryTouchingHazards: 0, portalExcludedGravity: portalScope.gravityBoundary?.count, ownerExcludedGravity: ownerScope.gravityBoundary?.count, serviceExcludedGravity: serviceScope.gravityBoundary?.count },
      return: { currentRouteConnectivity: 'PASS on the same 89-station public path', independentReturnStatus: 'NOT_EVIDENCED', reason: 'The C01 portal’s separate return evidence has different route/endpoints and cannot count as a public-vertical independent return.' },
    },
    exactPhysicalBlockers: [
      'The 19-station switchback is finished/protected route fabric; no exact target-state redesign has been selected.',
      'Both endpoint-interface cubes are retained but no 5-wide × 5-high interface geometry is bound.',
      'No independent public-vertical return is evidenced; the current connected path is the same route being redesigned.',
      'No canonical target/rollback state set, entity clearance, journal, strict-noop preflight, post snapshot, or rollback post-state proof exists.',
    ],
  },
  permittedNextResearchOnly: ['Bind a specific protected-switchback redesign geometry and both exact endpoint cubes.', 'Survey a genuinely independent public return disjoint from the changed route’s interior halo.', 'Only then consider a separate source-bound physical compiler with canonical targets and inverse.'],
  nonClaims: ['No operation files.', 'No execution authority.', 'No public-route opening, egress commissioning, container migration, portal work, or owner/service work.'],
};
const report = { ...base, decisionIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be a fresh destination'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-dimension-physical-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-c01-dimension-physical-01-plan.svg'), plan);
fs.writeFileSync(path.join(out, 'mp11-c01-dimension-physical-01-elevation.svg'), section);
fs.writeFileSync(path.join(out, 'MP11-C01-DIMENSION-PHYSICAL-01.md'), `# MP11 C01-DIMENSION-PHYSICAL-01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only design evidence; no operations or mutation authority.\n\n![Plan](mp11-c01-dimension-physical-01-plan.svg)\n\n![Elevation](mp11-c01-dimension-physical-01-elevation.svg)\n\nThe fresh post-C01-08 source identifies the C01 public vertical switchback (stations **${narrow[0].index}–${narrow.at(-1).index}**, **${narrow.length}** stations) as the smallest isolable route defect: it has zero fluid, gravity, block-entity, container, and boundary-hazard cells in its whole public safety boundary. It remains **design-only**: it is protected route fabric, no endpoint geometry or independent public return has been bound, and it has no canonical targets/inverse or guarded-release evidence. The service scope’s **${serviceScope.blockEntityBoundary?.containerCount ?? 0}** containers and all portal/owner/service gravity remain explicitly out of scope.\n`);
console.log(JSON.stringify({ status: report.status, mutationAuthority: false, selectedScope: 'public', narrowStationCount: narrow.length, out: rel(out) }, null, 2));
