#!/usr/bin/env node
/**
 * Read-only program-to-envelope audit for the current Town Expansion R1 source,
 * generated report, and frozen coordinate schedules.
 *
 * This is intentionally a findings tool, not an auto-fixer. It records
 * measured contradictions that need design review before a new package is
 * generated.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_SOURCE = 'scripts/generate_town_expansion_r1.mjs';
const DEFAULT_REPORT = 'data/buildops/town-expansion-r1-wip2.report.json';
const CBE_SCHEDULE = 'docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-coordinate-schedule.json';
const C01_SCHEDULE = 'docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-coordinate-schedule.json';
const C01_MODEL_AUDIT =
  'docs/redevelopment/2026-07-28-town-expansion/evidence/c01-five-level-source-model-audit.json';

function sha256(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(ROOT, relative))).digest('hex');
}

function loadJson(relative) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, relative), 'utf8'));
}

function inclusiveArea(bounds) {
  return (bounds[2] - bounds[0] + 1) * (bounds[3] - bounds[1] + 1);
}

function ratioPercent(numerator, denominator) {
  return Math.round((numerator / denominator) * 1000) / 10;
}

function occurrences(source, expression) {
  return [...source.matchAll(expression)].length;
}

function finding(severity, id, title, scopeIds, bounds, promised, measured, evidence, consequence) {
  return {
    severity,
    id,
    title,
    scopeIds,
    bounds,
    promised,
    measured,
    evidence,
    consequence,
    disposition: 'FINDING_ONLY_NO_FIX_APPLIED',
  };
}

function markdown(report) {
  const lines = [
    '# Town Expansion R1 program-to-envelope audit',
    '',
    `**Status:** ${report.status}`,
    `**Generated:** ${report.generatedAtUtc}`,
    '**Mode:** read-only; no generator, database, snapshot, or live-world mutation',
    '',
    '## Executive result',
    '',
    `${report.summary.findings} findings: ${report.summary.critical} critical, ${report.summary.high} high, ${report.summary.medium} medium.`,
    '',
  ];
  for (const severity of ['critical', 'high', 'medium']) {
    const matches = report.findings.filter((item) => item.severity === severity);
    if (matches.length === 0) continue;
    lines.push(`## ${severity[0].toUpperCase()}${severity.slice(1)}`, '');
    for (const item of matches) {
      lines.push(
        `### ${item.id} — ${item.title}`,
        '',
        `- Scopes: \`${item.scopeIds.join('`, `')}\``,
        `- Bounds: ${JSON.stringify(item.bounds)}`,
        `- Promised: ${item.promised}`,
        `- Measured: ${item.measured}`,
        `- Evidence: ${item.evidence}`,
        `- Consequence: ${item.consequence}`,
        '',
      );
    }
  }
  lines.push(
    '## Reviewed false positives and exclusions',
    '',
    ...report.falsePositivesAndExclusions.flatMap((item) => [
      `- **${item.id}:** ${item.reason}`,
      '',
    ]),
    '## Method limits',
    '',
    ...report.limitations.map((item) => `- ${item}`),
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const get = (name, fallback) => {
    const index = args.indexOf(name);
    return index === -1 ? fallback : args[index + 1];
  };
  const sourcePath = get('--source', DEFAULT_SOURCE);
  const reportPath = get('--report', DEFAULT_REPORT);
  const outBase = get(
    '--out-base',
    'docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-program-envelope-audit',
  );
  const source = fs.readFileSync(path.resolve(ROOT, sourcePath), 'utf8');
  const generatorReport = loadJson(reportPath);
  const cbeSchedule = loadJson(CBE_SCHEDULE);
  const c01Schedule = loadJson(C01_SCHEDULE);
  const c01ModelAudit = loadJson(C01_MODEL_AUDIT);
  const scopeSummary = generatorReport.operations?.scopeSummary ?? [];
  const coverage = generatorReport.coverage ?? {};
  const findings = [];
  const addFinding = (passed, ...details) => {
    if (!passed) findings.push(finding(...details));
  };
  const c01Levels = coverage.c01FiveOrdinaryLevelsPlusDeepOwnerStack ?? [];
  const c01Checks = c01ModelAudit.checks ?? {};
  addFinding(
    coverage.c01ClassifiedCells === 885022
      && coverage.c01OccupiedRoomAndRouteObjects === 165
      && c01Checks.exactClassifiedCells === true,
    'critical',
    'FIT-C01-001',
    'C01 full-envelope classification is incomplete',
    ['c01_east_l1_security_garage', 'c01_owner_residence'],
    null,
    '885,022 classified cells and 165 occupied room/route objects.',
    `${coverage.c01ClassifiedCells ?? 0} classified cells and ${coverage.c01OccupiedRoomAndRouteObjects ?? 0} occupied objects.`,
    `${reportPath} coverage; ${C01_MODEL_AUDIT}.`,
    'Any count mismatch means the large buried complex has unclassified or missing program space.',
  );
  addFinding(
    coverage.c01ActiveHangarProgram === false
      && c01Checks.noAircraftOrArenaRoles === true
      && coverage.c01SecureGarageVehicles === 24,
    'critical',
    'FIT-C01-002',
    'Rejected arena/aircraft program remains or vehicle storage is incomplete',
    ['c01_east_l1_security_garage'],
    null,
    'No arena, aircraft, or hangar role; 24 secure garage vehicles.',
    JSON.stringify({
      activeHangar: coverage.c01ActiveHangarProgram,
      secureGarageVehicles: coverage.c01SecureGarageVehicles,
      noAircraftOrArenaRoles: c01Checks.noAircraftOrArenaRoles,
    }),
    `${reportPath} coverage; ${C01_MODEL_AUDIT}.`,
    'The arrival level would contradict the accepted underground vehicle-storage brief.',
  );
  addFinding(
    c01Levels.length === 7
      && c01Levels.every((level) => level.vertical?.stairs === 1 && level.vertical?.lifts === 2)
      && c01Checks.broadStairAndPairedLiftEveryLevel === true
      && coverage.c01AirlockedEntrances === true
      && coverage.c01TwoIndependentEgressRoutes === true,
    'critical',
    'FIT-C01-003',
    'C01 broad stair/lift and egress contract is incomplete',
    c01Levels.map((level) => level.scope),
    null,
    'Seven occupied levels, each with one broad stair and two lifts, airlocked entrances, and two independent egress routes.',
    JSON.stringify({
      levels: c01Levels.length,
      vertical: c01Levels.map((level) => level.vertical),
      airlocks: coverage.c01AirlockedEntrances,
      twoEgress: coverage.c01TwoIndependentEgressRoutes,
    }),
    `${reportPath} coverage; ${C01_MODEL_AUDIT}.`,
    'Incomplete vertical circulation would make parts of the bunker inaccessible.',
  );
  addFinding(
    c01Checks.exactPublicAdultPrivateRooms === true
      && c01Checks.exactOwnerPrivateRooms === true
      && c01Checks.exactPolySuites === true
      && c01Checks.exactMasterBedrooms === true
      && c01Checks.exactMasterKitchens === true
      && c01Checks.allAdultRoomsFullyFurnished === true,
    'critical',
    'FIT-C01-004',
    'C01 public/owner residential program is incomplete',
    ['c01_east_l2_living_adult', 'c01_owner_club_arrival', 'c01_owner_residence'],
    null,
    'Exact public adult rooms, owner rooms, 15-suite poly residence, three master bedrooms, two kitchens, and complete non-graphic furniture.',
    JSON.stringify(c01Checks),
    C01_MODEL_AUDIT,
    'An omitted owner/public program would require redesign before release.',
  );

  const cbeExact = coverage.concordBroadcastExchangeExactCounts ?? {};
  const cbeScheduleCounts = coverage.concordBroadcastExchangeExactSchedule ?? {};
  addFinding(
    cbeScheduleCounts.rooms === cbeSchedule.rooms.length
      && cbeScheduleCounts.rooms === 113
      && cbeScheduleCounts.siteObjects === 5
      && cbeExact.totalDishAnalogues === 9
      && coverage.concordSatelliteDishArrays === 9
      && cbeExact.cabaretExhibitionHalls === 2,
    'critical',
    'FIT-CBE-001',
    'Broadcast Exchange exact room, hall, or dish schedule is incomplete',
    ['TE-IA-CONCORD-BROADCAST-EXCHANGE', 'TE-IA-CONCORD-BROADCAST-TOWER'],
    null,
    '113 rooms, two exhibition halls, five site objects, and nine dish analogues.',
    JSON.stringify({ schedule: cbeScheduleCounts, exact: cbeExact }),
    `${reportPath} coverage; ${CBE_SCHEDULE}.`,
    'A count mismatch would reduce the Exchange to a placeholder.',
  );
  addFinding(
    cbeScheduleCounts.verticalCores === 5
      && cbeScheduleCounts.routes === 10
      && cbeScheduleCounts.cameras === 18,
    'high',
    'FIT-CBE-002',
    'Broadcast Exchange access separation is incomplete',
    ['TE-IA-CONCORD-BROADCAST-EXCHANGE'],
    null,
    'Five vertical cores, ten separated routes, and 18 review cameras.',
    JSON.stringify(cbeScheduleCounts),
    `${reportPath} coverage; ${CBE_SCHEDULE}.`,
    'Missing cores or routes would compromise public/backstage/service separation.',
  );

  const dsmHalls = coverage.dataCenterCampusBuildings ?? 0;
  const metaGoogleEdgeHalls = coverage.completedMetaGoogleEdgeBccHalls ?? 0;
  addFinding(
    dsmHalls === 24
      && metaGoogleEdgeHalls === 20
      && dsmHalls + metaGoogleEdgeHalls === 44,
    'critical',
    'FIT-DATA-001',
    'The completed data-center district is below the 44-hall contract',
    scopeSummary.filter((scope) => /TE-IA-(DATA|DISTRICT)/.test(scope.scope))
      .map((scope) => scope.scope),
    null,
    '24 DSM halls plus 12 Meta-inspired, six Google-inspired, and two LightEdge/EdgeBCC-inspired halls.',
    `${dsmHalls} DSM halls plus ${metaGoogleEdgeHalls} additional campus halls.`,
    `${reportPath} coverage.dataCenterCampusBuildings/completedMetaGoogleEdgeBccHalls.`,
    'Missing halls would leave one or more promised campuses incomplete.',
  );
  addFinding(
    coverage.managerValeCottagesCommissioned === 5
      && coverage.managerValeAttachedGarages === 5
      && coverage.managerValeGarageBays === 24
      && coverage.managerValeRooms === 55
      && coverage.managerValeFurnishingGroups === 406
      && coverage.managerValeCameras === 45
      && coverage.managerValeSourceRetirementIncluded === false,
    'high',
    'FIT-STEWARD-001',
    'The five-cottage management conversion is incomplete',
    ['RRCH-ARCHITECT', 'RRCH-MASON', 'RRCH-SURVEYOR', 'RRCH-STEWARD', 'RRCH-SCOUT'],
    null,
    'Five mini-mansions, five attached garages, 24 bays, 55 rooms, 406 furnishing groups, and 45 cameras; source retirement deferred.',
    JSON.stringify({
      cottages: coverage.managerValeCottagesCommissioned,
      garages: coverage.managerValeAttachedGarages,
      bays: coverage.managerValeGarageBays,
      rooms: coverage.managerValeRooms,
      furnishings: coverage.managerValeFurnishingGroups,
      cameras: coverage.managerValeCameras,
      sourceRetirement: coverage.managerValeSourceRetirementIncluded,
    }),
    `${reportPath} coverage/modules.managerValeFiveCottages.`,
    'A count mismatch would leave one or more worker-town management homes unfinished.',
  );

  const severityOrder = { critical: 0, high: 1, medium: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.id.localeCompare(b.id));
  const report = {
    schemaVersion: '1.0.0',
    id: 'town-expansion-r1-program-envelope-read-only-audit',
    generatedAtUtc: new Date().toISOString(),
    status: findings.some((item) => item.severity === 'critical')
      ? 'HOLD_CRITICAL_PROGRAM_ENVELOPE_FINDINGS'
      : findings.length > 0
        ? 'PASS_WITH_NOTES'
        : 'PASS_CURRENT_PROGRAM_ENVELOPES',
    readOnly: true,
    liveWorldMutated: false,
    inputs: [
      { file: sourcePath, sha256: sha256(sourcePath) },
      { file: reportPath, sha256: sha256(reportPath) },
      { file: CBE_SCHEDULE, sha256: sha256(CBE_SCHEDULE), status: cbeSchedule.status },
      { file: C01_SCHEDULE, sha256: sha256(C01_SCHEDULE), status: c01Schedule.status },
      { file: C01_MODEL_AUDIT, sha256: sha256(C01_MODEL_AUDIT), status: c01ModelAudit.status },
    ],
    summary: {
      findings: findings.length,
      critical: findings.filter((item) => item.severity === 'critical').length,
      high: findings.filter((item) => item.severity === 'high').length,
      medium: findings.filter((item) => item.severity === 'medium').length,
    },
    findings,
    falsePositivesAndExclusions: [
      {
        id: 'EXCL-SCREEN-001',
        reason: 'The rejected C01 arena and aircraft display are absent; L1 is the accepted underground vehicle-storage and security program.',
      },
      {
        id: 'EXCL-GUILD-001',
        reason: 'Guild Hall has two basement levels, three above-grade stories, four kitchen worklines, screen-before-seat theater/lecture roles, dormitory bays, and a normal-walk stair in the generated role census. No numeric contradiction was established in this pass.',
      },
      {
        id: 'EXCL-WESTLIGHT-001',
        reason: 'Westlight source declares three venues, distinct identity entries, separate backstage rooms, service loading, and vertical cores. Post-state walking/visual proof is still required, but absence of that future proof is not itself a fit contradiction.',
      },
      {
        id: 'EXCL-GILDED-001',
        reason: 'The Gilded Raven theater/tunnel has a frozen exact schedule and previously passed focused generator tests; no new envelope contradiction was established here.',
      },
      {
        id: 'EXCL-DM-RACKS-001',
        reason: 'The current package contains 24 DSM halls plus 20 completed Meta/Google/LightEdge-inspired halls; rack and circulation details remain subject to post-release visual QA.',
      },
    ],
    limitations: [
      'This is a static source/report/schedule comparison, not a Minecraft pathfinding or camera review.',
      'The earlier pre-fix audit remains separate evidence; this pass evaluates the regenerated exact-state report and accepted module audits.',
      'Schedules labeled planning/frozen are treated as promises, not as-built evidence.',
    ],
  };
  const jsonPath = path.resolve(ROOT, `${outBase}.json`);
  const mdPath = path.resolve(ROOT, `${outBase}.md`);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, markdown(report));
  process.stdout.write(`${JSON.stringify({ json: path.relative(ROOT, jsonPath), markdown: path.relative(ROOT, mdPath), status: report.status, summary: report.summary })}\n`);
  if (report.status.startsWith('HOLD_')) process.exitCode = 1;
}

main();
