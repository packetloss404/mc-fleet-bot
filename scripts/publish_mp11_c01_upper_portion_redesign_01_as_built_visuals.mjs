#!/usr/bin/env node
import { publishC01AsBuiltVisuals } from './lib/c01_as_built_visual_publisher.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const evidenceRoot = option('--evidence-root', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z');
const output = option('--out', 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-upper-portion-redesign-01-as-built-2026-10-27');
const generatedAtUtc = option('--generated-at', new Date().toISOString());

const result = publishC01AsBuiltVisuals({
  root: process.cwd(),
  releaseId: 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01',
  title: 'C01 public-vertical upper-portion redesign 01',
  generatedAtUtc,
  ledger: `${evidenceRoot}/mp11-c01-public-vertical-upper-portion-redesign-01-guarded-release-ledger.json`,
  qa: `${evidenceRoot}/independent-post-release-qa.json`,
  manifest: `${evidenceRoot}/rebound/compile/mp11-c01-public-vertical-upper-portion-redesign-01.manifest.json`,
  output,
  qaStatus: 'PASS_C01_UPPER_PORTION_REDESIGN_01_IMMUTABLE_POST_QA',
  stations: (manifest) => manifest.scope.stationPoints,
  scope: (manifest, targets, changedCount, stations) => ({
    canonicalTargetCount: targets.length,
    changedCount,
    stationCount: stations.length,
    totalDesignCellCount: manifest.scope.upperPortionTotalDesignCells,
    sharedAcceptedCellCount: manifest.scope.upperPortionSharedSkipped,
    retainedReturnCanonicalCellCount: manifest.retainedReturn02.canonicalCount,
  }),
  summary: 'The plots project the exact 433 canonical cells and 21-station five-wide by five-clear upper-portion profile. The other 49 design cells are compatible shared states bound by the bilateral contract.',
  nonClaims: [
    'No public route, endpoint, egress or service is opened or commissioned.',
    'Return-02 and the accepted main-switchback transition remain separately retained scopes.',
    'The publication performs no world mutation and does not complete C01 or MP11.',
  ],
});

console.log(JSON.stringify(result, null, 2));
