#!/usr/bin/env node
import { publishC01AsBuiltVisuals } from './lib/c01_as_built_visual_publisher.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const evidenceRoot = option('--evidence-root', 'data/world-review/mp11-c01-upper-landing-endpoint-opening-transition-01-live-20260827T144100Z');
const output = option('--out', 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-upper-landing-endpoint-opening-transition-01-as-built-2026-10-27');
const generatedAtUtc = option('--generated-at', new Date().toISOString());

const result = publishC01AsBuiltVisuals({
  root: process.cwd(),
  releaseId: 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-01',
  title: 'C01 upper-landing endpoint/opening transition 01',
  generatedAtUtc,
  ledger: `${evidenceRoot}/mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-01-guarded-release-ledger.json`,
  qa: `${evidenceRoot}/independent-post-release-qa`,
  manifest: `${evidenceRoot}/rebound/compile/mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-01.manifest.json`,
  output,
  qaStatus: 'PASS_C01_UPPER_LANDING_ENDPOINT_TRANSITION_IMMUTABLE_POST_QA',
  stationsRequired: false,
  stations: () => [],
  scope: (manifest, targets, changedCount, stations) => ({
    canonicalTargetCount: targets.length,
    changedCount,
    stationCount: stations.length,
    totalDesignCellCount: manifest.scope.transitionCellsTotal,
    dualAcceptedCellCount: manifest.scope.dualAcceptedCount,
    retainedMainCanonicalCellCount: 928,
    retainedUpperCanonicalCellCount: 433,
    retainedReturnCanonicalCellCount: manifest.retainedReturn02.canonicalCount,
    transitionVolume: manifest.scope.transitionVolume,
  }),
  summary: 'The plots project the exact 56 changed canonical cells inside the bounded 315-cell endpoint/opening/transition volume. This evidence records only the accepted interface construction and retained predecessor states.',
  nonClaims: [
    'No complete route or station sequence is asserted by this interface-only publication.',
    'No public route, endpoint, egress or service is opened or commissioned.',
    'The publication performs no world mutation and does not complete C01 or MP11.',
  ],
});

console.log(JSON.stringify(result, null, 2));
