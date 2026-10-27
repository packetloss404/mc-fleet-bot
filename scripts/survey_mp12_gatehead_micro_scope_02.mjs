#!/usr/bin/env node
/**
 * Classify the Gatehead southern alignment without converting a block-plane
 * route witness into a release claim.  Read-only and intentionally zero-op.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const WITNESS = value('--witness', 'data/world-review/mp12-gatehead-alternate-access-01-block-plane-witness-20260826T093000Z.json');
const OUT = value('--out', 'data/world-review/mp12-gatehead-micro-scope-02-20260826T093500Z.json');
const GENERATED_AT = value('--generated-at', '2026-08-26T09:35:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const witness = JSON.parse(fs.readFileSync(absolute(WITNESS), 'utf8'));
const sourceRoot = witness.source?.snapshotRoot;
if (!sourceRoot || witness.mutation?.operationCount !== 0 || witness.routeAcceptance?.result !== 'PASS') {
  throw new Error('MP12 Gatehead micro-scope survey rejected: expected zero-operation PASS block-plane witness');
}
const entitiesPath = path.join(sourceRoot, 'entities');
const central = witness.scope.centralEnvelope;
const portals = witness.scope.transitionPortals;
const facade = witness.interfaces.protectedFacade;
const report = {
  schemaVersion: 1,
  id: 'MP12-GATEHEAD-MICRO-SCOPE-02',
  generatedAtUtc: GENERATED_AT,
  status: 'NO_CURRENT_SOURCE_COMPLETE_ROUTE_OR_CLEARANCE_MICRO_SCOPE',
  source: {
    witness: relative(WITNESS),
    blockPlaneSnapshot: sourceRoot,
    regionPresent: fs.existsSync(absolute(path.join(sourceRoot, 'region'))),
    entitiesPresent: fs.existsSync(absolute(entitiesPath)),
    requirement: 'A physical route/support package requires matching immutable region and entities evidence; a prior release entity gate is not transferable to new targets.',
  },
  boundedOutsideFacadeConflict: {
    southernAlignment: {
      routeStart: witness.scope.publicRoute.start,
      routeEnd: witness.scope.publicRoute.end,
      routeStations: witness.scope.publicRoute.stationCount,
      normalWalkBlockPlaneResult: witness.routeAcceptance.result,
      centralFiveWideFiveHighEnvelope: central,
      transitionPortals: portals,
      staticEnvelopeBlockEntities: witness.interfaces.reviewedPublicEnvelopeBlockEntities,
    },
    protectedNorthFacade: {
      bounds: facade.bounds,
      protectedCellCount: facade.cells,
      stateCensus: facade.stateCensus,
      relation: witness.scope.protectedBoundary.relation,
      conclusion: 'The southern alignment avoids the façade; it does not authorize clearing, widening into, or changing the façade.',
    },
  },
  routeDeltaScreen: {
    operationCount: witness.mutation.operationCount,
    result: 'NO_PHYSICAL_DELTA_IDENTIFIED',
    reason: 'All 87 witness stations and the southern clearance envelope are existing block-plane conditions. The witness is a possible future alignment/classification input, not a missing deck, support, ramp, doorway, or clearance repair.',
  },
  decision: {
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    result: 'NO_PACKAGE_EMITTED',
    exactHold: 'The only bounded route-safe area outside the original north-side widening conflict is already an existing zero-operation southern alignment. Its latest survey snapshot lacks entities/, so saved-entity clearance cannot be proven for any new target. No route-support delta exists to compile without inventing scope.',
    nextPrerequisite: 'A complete fresh Gatehead/East Arrival source with region plus entities, then a specific defect-backed target and one-owner-per-cell interface classification before any physical package.',
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  routeStations: report.boundedOutsideFacadeConflict.southernAlignment.routeStations,
  centralEnvelopeCells: central.cellCount,
  protectedFacadeCells: facade.cells,
  staticBlockEntities: report.boundedOutsideFacadeConflict.southernAlignment.staticEnvelopeBlockEntities.length,
  entityPlanePresent: report.source.entitiesPresent,
  operations: 0,
}, null, 2));
