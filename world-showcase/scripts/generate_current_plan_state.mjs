#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const showcaseRoot = resolve(scriptDir, '..');
const repoRoot = resolve(showcaseRoot, '..');
const outputRoot = join(showcaseRoot, 'public', 'current-plan-state');
const sourceOutputRoot = join(outputRoot, 'sources');
const outputPath = join(outputRoot, 'index.json');
const checkOnly = process.argv.slice(2).includes('--check');

if (process.argv.slice(2).some((arg) => arg !== '--check')) {
  console.error('Usage: node scripts/generate_current_plan_state.mjs [--check]');
  process.exit(2);
}

const forbiddenSource = 'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json';

const sourceSpecs = [
  { id: 'mp01-current', path: 'docs/masterplans/01-cheyenne-mountain-complex/CURRENT-STATE.md', sourceDate: '2026-08-28', label: 'MP01 current build control' },
  { id: 'mp02-current', path: 'docs/masterplans/02-subtropolis/CURRENT-STATE.md', sourceDate: '2026-08-28', label: 'MP02 current state' },
  { id: 'mp03-current', path: 'docs/masterplans/03-houston-tunnel-system/CURRENT-STATE.md', sourceDate: '2026-08-28', label: 'MP03 current-state control ledger' },
  { id: 'mp04-authority', path: 'docs/masterplans/04-combined-complex/authority-reconciliation.json', sourceDate: '2026-08-26', label: 'MP04 to MP05 authority reconciliation' },
  { id: 'mp04-readme', path: 'docs/masterplans/04-combined-complex/README.md', sourceDate: '2026-08-26', label: 'MP04 current authority summary' },
  { id: 'mp05-current', path: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md', sourceDate: '2026-08-28', label: 'MP05 authoritative current-state ledger' },
  { id: 'mp05-plan', path: 'docs/masterplans/05-combined-zones/MASTERPLAN.md', sourceDate: '2026-08-28', label: 'MP05 controlling masterplan' },
  { id: 'mp06-current', path: 'docs/masterplans/06-approach-road/CURRENT-STATE.md', sourceDate: '2026-08-26', label: 'MP06 current state' },
  { id: 'mp06-plan', path: 'docs/masterplans/06-approach-road/MASTERPLAN.md', sourceDate: '2026-08-26', label: 'MP06 retrospective plan with accepted addenda' },
  { id: 'mp07-current', path: 'docs/masterplans/07-mainstreet-america/CURRENT-STATE.md', sourceDate: '2026-08-26', label: 'MP07 authoritative current state' },
  { id: 'mp08-current', path: 'docs/masterplans/08-raven-rock/CURRENT-STATE.md', sourceDate: '2026-08-26', label: 'MP08 current build control' },
  { id: 'mp09-current', path: 'docs/masterplans/09-ravensgate/CURRENT-STATE.md', sourceDate: '2026-08-26', label: 'MP09 current-state control ledger' },
  { id: 'mp10-plan', path: 'docs/masterplans/10-ravensreach/MASTERPLAN.md', sourceDate: '2026-08-26', label: 'MP10 retrospective plan and accepted addenda' },
  { id: 'mp10-exterior-circulation', path: 'docs/masterplans/10-ravensreach/MP10-RRCH-LIBRARY-EXTERIOR-CIRCULATION-RECONCILIATION-02.md', sourceDate: '2026-08-26', label: 'MP10 library exterior circulation reconciliation' },
  { id: 'mp11-current', path: 'docs/masterplans/11-town-expansion-r1/CURRENT-STATE.md', sourceDate: '2026-08-28', label: 'MP11 current interface state' },
  { id: 'mp11-plan', path: 'docs/masterplans/11-town-expansion-r1/MASTERPLAN.md', sourceDate: '2026-08-26', label: 'MP11 retrospective source plan' },
  { id: 'mp11-switchback-release', path: 'docs/masterplans/11-town-expansion-r1/MP11-C01-MAIN-SWITCHBACK-TRANSITION-01-RELEASE.md', sourceDate: '2026-08-27', label: 'C01 main switchback as-built release' },
  { id: 'mp12-plan', path: 'docs/masterplans/12-westlight-district/MASTERPLAN.md', sourceDate: '2026-08-26', label: 'MP12 retrospective source plan and circulation addenda' },
  { id: 'mp13-current', path: 'docs/masterplans/13-westlight-venue/CURRENT-STATE.md', sourceDate: '2026-08-26', label: 'MP13 current state' },
  { id: 'mp13-plan', path: 'docs/masterplans/13-westlight-venue/MASTERPLAN.md', sourceDate: '2026-08-26', label: 'MP13 retrospective source plan and current addendum' },
  { id: 'completion-register', path: 'docs/masterplans/MASTER-PLAN-COMPLETION-REGISTER-2026-08-26.md', sourceDate: '2026-08-28', label: 'Master Plan completion register with 28 August supplement' },
  { id: 'cobalt-s1-passive-rail', path: 'docs/masterplans/COBALT-S1-WESTLIGHT-RAVENSREACH-PASSIVE-RAIL-01-RELEASE.md', sourceDate: '2026-08-26', label: 'Cobalt S1 passive rail release' },
  { id: 'surface-rail-standard', path: 'docs/masterplans/ABOVE-GROUND-DOUBLE-TRACK-WALKWAY-STANDARD-2026-08-28.md', sourceDate: '2026-08-28', label: 'Above-ground double-track and protected-walkway standard' },
  { id: 'surface-network-02', path: 'docs/masterplans/CITYWIDE-SURFACE-RAIL-AND-PROMENADE-NETWORK-02-2026-08-28.md', sourceDate: '2026-08-28', label: 'Citywide surface rail and promenade survey' },
  { id: 'high16-bypass', path: 'docs/masterplans/RAIL-S3-R10-HIGH16-DESCENDING-BYPASS-02-CURRENT-SOURCE.md', sourceDate: '2026-08-26', label: 'SYS-03 High-16 descending civil bypass release' },
  { id: 'railway-archive-validation', path: 'world-showcase/public/master-plan-railway/validation.json', sourceDate: '2026-08-22', label: 'Archived Master Plan Railway validation' },
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function isTracked(path) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', path], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function publicFilename(spec) {
  return `${spec.id}--${basename(spec.path)}`;
}

for (const spec of sourceSpecs) {
  if (spec.path === forbiddenSource) {
    throw new Error(`Forbidden dirty source entered allowlist: ${spec.path}`);
  }
  if (!isTracked(spec.path)) {
    throw new Error(`Current-state source is not git-tracked: ${spec.path}`);
  }
  if (!existsSync(join(repoRoot, spec.path))) {
    throw new Error(`Current-state source does not exist: ${spec.path}`);
  }
}

const sourceBuffers = new Map(
  sourceSpecs.map((spec) => [spec.id, readFileSync(join(repoRoot, spec.path))]),
);

const sources = sourceSpecs.map((spec) => {
  const buffer = sourceBuffers.get(spec.id);
  return {
    id: spec.id,
    path: spec.path,
    sourceDate: spec.sourceDate,
    dateBasis: 'Latest explicit evidence date represented by this document; not a filesystem modification time.',
    sha256: sha256(buffer),
    bytes: buffer.length,
    href: `/current-plan-state/sources/${publicFilename(spec)}`,
    label: spec.label,
  };
});

const archiveValidation = JSON.parse(sourceBuffers.get('railway-archive-validation').toString('utf8'));
const changedTrackedBindings = archiveValidation.bindingChecks
  .filter((binding) => isTracked(binding.path))
  .map((binding) => {
    const currentBuffer = readFileSync(join(repoRoot, binding.path));
    return {
      label: binding.label,
      path: binding.path,
      archivedSha256: binding.expectedSha256,
      currentSha256: sha256(currentBuffer),
    };
  })
  .filter((binding) => binding.currentSha256 !== binding.archivedSha256);

const trackedArchiveBindingCount = archiveValidation.bindingChecks.filter((binding) => isTracked(binding.path)).length;
const changedUniquePaths = [...new Set(changedTrackedBindings.map((binding) => binding.path))];

const plans = [
  {
    id: 'MP01',
    title: 'Cheyenne Mountain Complex',
    status: 'PARTIAL — RESTRICTED PASSIVE COMPLEX CAPACITY AS-BUILT',
    summary: 'The terminal, chamber shell and south extension, structural 15/15 bay array with first passive interiors, Battle Cab envelope/interior, support and reservoir scopes, dry service corridor, staging and manual-support rooms are bounded as-built components.',
    built: [
      'Restricted terminal, dry chamber, all 15 structural bay shells, passive interiors, contained 585-cell reservoir/causeway, and bounded support/service rooms have post-state and rollback evidence.',
      'B03 indices 188..800 remain a bounded passive internal-inspection component; the surface stair and accepted manual fit-outs are retained.',
    ],
    uncommissioned: [
      'No public or emergency route, active controls, utility/life-safety system, secure exterior programme, or full Cheyenne operating programme is commissioned.',
      'B04 remains a structural-fabric hold; the direct lever/lamp diagnostic remains a runtime-proof candidate, not a release.',
    ],
    sourceIds: ['mp01-current', 'completion-register'],
  },
  {
    id: 'MP02',
    title: 'SubTropolis',
    status: 'PARTIAL — BOUNDED RESTRICTED CHAMBER + SERVICE SPINE AS-BUILT',
    summary: 'The distinct 719-cell B08 ramp handoff and 835-cell restricted chamber/dry receiver are accepted bounded work; the rejected 729-cell floor attempt remains rolled back history.',
    built: [
      'A finite controlled chamber, sealed dry receiver, B03-side isolation, shaft fire/overflow partition, and restricted returns are post-verified.',
    ],
    uncommissioned: [
      'Tenant/lobby grid, public entry, utilities, climate/drainage, public or emergency egress, and bilateral B03/B09 connection/control remain uncommissioned.',
    ],
    sourceIds: ['mp02-current', 'completion-register'],
  },
  {
    id: 'MP03',
    title: 'Houston Tunnel System',
    status: 'PARTIAL / SAFETY HELD',
    summary: 'The lower-lobby and upper inspection components remain bounded existing fabric, but current-source screens find no safe new independent MP03 physical delta.',
    built: [
      'Thirty-four lower-lobby stations are dry, supported and two-clear but already built; the 91-surface upper component remains passive restricted inspection only.',
    ],
    uncommissioned: [
      'Twenty-nine lobby stations still fail headroom; retained fluid, unsupported gravel, closed caps, ownership and exterior-endpoint requirements block a public vertical connection.',
      'No public/staff through-route, egress, exterior access, food-court/tenant programme, or complete Houston system is commissioned.',
    ],
    sourceIds: ['mp03-current', 'completion-register'],
  },
  {
    id: 'MP04',
    title: 'Combined Complex',
    status: 'NOT SET OUT / CURRENT INTEGRATED FUNCTIONAL HOLD',
    summary: 'MP04 is normalized architectural composition; MP05 owns current-world placement. MP04 owns no current-world cells and has no independent physical release.',
    built: [],
    uncommissioned: [
      'No coherent B07/B08/B09/B03 visitor connection is set out or commissioned.',
      'Any future physical connection must be an MP05-owned exact corridor/portal/receiver/rescue/endpoint package.',
    ],
    sourceIds: ['mp04-authority', 'mp04-readme', 'completion-register'],
  },
  {
    id: 'MP05',
    title: 'Combined Zones',
    status: 'BOUNDED MVP ACCEPTED — BROADER COMBINED ZONES PROGRAMME PARTIAL',
    summary: 'The R07–R12 bounded MVP and R13 consolidated acceptance are retained as accepted. That acceptance is not the same as completing every deferred Combined Zones scope.',
    built: [
      'Bounded architecture, Empty Eight capped retail/public-gallery work, passive boundaries, restricted circulation, B09 passive rail and the bounded maintenance shuttle are accepted only within their exact release boundaries.',
      'Later B07 work includes finite containment and restricted lighting improvements; those releases preserve closed doors, caps, dry cores and their non-public classification.',
    ],
    uncommissioned: [
      'B07 through-route, exterior receiver, egress, complete hydrology/utility system and whole-corridor programme remain uncommissioned.',
      'P1-B12, C2, C3, eight future Empty Eight line stubs, operational smoke/ventilation, FIRE-EG-B, broader accessibility and active B09 transport remain deferred or fail-closed.',
      'The bounded MVP must not be advertised as completion of the full Combined Zones masterplan.',
    ],
    sourceIds: ['mp05-current', 'mp05-plan', 'completion-register'],
  },
  {
    id: 'MP06',
    title: 'Western Approach Road',
    status: 'PARTIAL — BOUNDED AS-BUILT ELEVATED CROSSING',
    summary: 'A pedestrian edge/lighting cadence, bounded grade repair and 149-cell elevated crossing are accepted without converting the wider road programme to complete.',
    built: [
      'The elevated deck, parapet and lantern crossing passes exact forward/inverse and two-level route checks while preserving the lower road.',
    ],
    uncommissioned: [
      'End-to-end road and endpoint continuity, broader drainage/crossing/lighting acceptance, regional interfaces and accessible entry remain open.',
    ],
    sourceIds: ['mp06-current', 'mp06-plan', 'completion-register'],
  },
  {
    id: 'MP07',
    title: 'MainStreet America',
    status: 'PARTIAL — BOUNDED FULL-TRACE CIRCULATION CORRECTION AS-BUILT',
    summary: 'The accepted three-cell correction restores the tested 48-route each-way normal-walk trace with no sub-three-wide cross-section.',
    built: [
      'The exact shared West Lane and Steward House interface cells are post-verified and reversible.',
    ],
    uncommissioned: [
      'Whole-district condition recovery, remaining seams/interiors and public/staff circulation beyond the exact trace remain open.',
    ],
    sourceIds: ['mp07-current', 'completion-register'],
  },
  {
    id: 'MP08',
    title: 'Raven Rock',
    status: 'PARTIAL / SAFETY HELD',
    summary: 'Bounded shaft lighting/wayfinding, the dry-side C2 cap, restricted T1b signs and retained B2 fixtures exist; no accepted whole Raven Rock complex release exists.',
    built: [
      'RR-Z5 remains a non-public two-wide service shaft; C2 remains capped; T1b wayfinding improves an already traversable restricted route.',
    ],
    uncommissioned: [
      'Cavern C remains wet and closed; C1 remains uncontained/open to Caverns A/B without accepted bilateral ownership, doors, receivers or returns.',
      'No complete bunker, public route, accessibility or egress programme is commissioned.',
    ],
    sourceIds: ['mp08-current', 'completion-register'],
  },
  {
    id: 'MP09',
    title: 'Ravensgate',
    status: 'PARTIAL — WEST-BANK BYPASS AS-BUILT',
    summary: 'Existing local access/lighting work and the dry 274-cell Long Water west-bank bypass are accepted bounded releases.',
    built: [
      'The bypass provides a two-wide, two-clear, maximum-one-rise Stoa-to-Tempietto connection while retaining the sealed 1,477-cell Long Water component unchanged.',
    ],
    uncommissioned: [
      'The broader civic grounds, Library/Loggia/Garth/pavilion/Guild Hall interfaces and hydrologically complete public realm remain unfinished.',
    ],
    sourceIds: ['mp09-current', 'completion-register'],
  },
  {
    id: 'MP10',
    title: 'Ravensreach',
    status: 'PARTIAL — BOUNDED AS-BUILT CIVIC AND LIBRARY CIRCULATION REPAIRS',
    summary: 'The cataloged civic baseline is supplemented by bounded circulation fixes. The exterior library switchback and retaining parapet, not the obsolete internal-tread proposal, are the current physical circulation resolution.',
    built: [
      'Committee Room bridge, library headroom repair and bell/penthouse repair are accepted bounded work.',
      'The exterior library annex changed 126 exact cells and its parapet added 119 supported guard cells; reconciliation retains all 245 targets and all 12 directed B1–B6 route checks.',
    ],
    uncommissioned: [
      'These repairs do not complete the civic programme, certify public egress/accessibility, deploy citizen routing, or resolve the Library/Loggia, MainStreet and Town Expansion interfaces.',
    ],
    sourceIds: ['mp10-plan', 'mp10-exterior-circulation', 'completion-register'],
  },
  {
    id: 'MP11',
    title: 'Town Expansion R1',
    status: 'BASELINE BUILT — BOUNDED C01 RETURNS, CONTAINMENT AND SWITCHBACK WORK AS-BUILT; C01 NOT COMMISSIONED',
    summary: 'The accepted R1 baseline remains protected. C01 has exact restricted/public-return structures, finite gravity containment, arrival cadence/support, the main switchback transition and upper-portion redesign, all bounded by explicit non-opening claims.',
    built: [
      'The restricted 105-station return and separate 28-station five-wide/five-clear Return-02 are post-verified within their exact scopes.',
      'Eight finite gravity-containment scopes, arrival support/cadence, the 30-station main switchback target union and 21-station upper-portion redesign are retained as bounded as-built construction.',
    ],
    uncommissioned: [
      'No C01 public endpoint, egress, service, primary-route opening or whole C01/MP11 completion is commissioned.',
      'Protected-route retirement/connection/gating and remaining endpoint/opening/transition contracts remain separate default-deny work.',
    ],
    sourceIds: ['mp11-current', 'mp11-plan', 'mp11-switchback-release', 'completion-register'],
  },
  {
    id: 'MP12',
    title: 'Westlight District',
    status: 'PARTIAL / LOCALLY SAFETY HELD OVER A CATALOGED INTERIOR BASELINE',
    summary: 'The 14-structure, 34-room cataloged interior district remains a historical stewardship baseline; current programme closure is limited by access, waterfront and cross-scope interfaces.',
    built: [
      'The source plan retains the cataloged structure/interior baseline and a current-source 87-station façade-safe southern alignment already present with zero route/support delta.',
    ],
    uncommissioned: [
      'District-to-venue arrival, waterfront, transport, accessibility and Town Expansion interfaces are not commissioned by the catalog or zero-delta route finding.',
    ],
    sourceIds: ['mp12-plan', 'completion-register'],
  },
  {
    id: 'MP13',
    title: 'Westlight Venue',
    status: 'PARTIAL / SAFETY HELD',
    summary: 'Bounded lighting cadence and a verified three-wide staff-only dogleg/ramp exist, but they are not venue egress or event operations.',
    built: [
      'WLV-EGRESS-01, WLV-CONCOURSE-ARM-01 and WLV-CROWN-01 provide bounded lighting; WLV-STF-ACCESS-02 is staff-only circulation.',
    ],
    uncommissioned: [
      'Public/staff separation, high-deck merge, 7×6 public egress/vomitories, lift analogue, two independent exits, accessibility and event-mode commissioning remain held.',
    ],
    sourceIds: ['mp13-current', 'mp13-plan', 'completion-register'],
  },
];

const systems = [
  {
    id: 'SYS-01',
    title: 'Citywide pedestrian continuity',
    status: 'PARTIAL — CURRENT-SOURCE NETWORK GAP MAPPED',
    summary: 'Finite MP07 and MP06 attachments exist, but no owned contiguous citywide corridor or reverse proof closes the measured gap.',
    built: [],
    uncommissioned: ['No continuous classified citywide pedestrian network is commissioned.'],
    sourceIds: ['completion-register'],
  },
  {
    id: 'SYS-02',
    title: 'PassageWay / underground navigation',
    status: 'PARTIAL — CURRENT NETWORK INTERFACES HELD',
    summary: 'Local routes are preserved, while C1, B07 and B09 interfaces remain separately contained, unowned or functionally incomplete.',
    built: [],
    uncommissioned: ['No complete classified underground public/staff/emergency network is commissioned.'],
    sourceIds: ['completion-register'],
  },
  {
    id: 'SYS-03',
    title: 'Cobalt passenger railway',
    status: 'PARTIAL — CIVIL AND PASSIVE ASSETS ONLY; NO PASSENGER SERVICE',
    summary: 'The system retains extensive sealed civil fabric, a bounded High-16 descending bypass and a 36-cell Westlight passive-rail slice; these are not an operating railway.',
    built: [
      'The High-16 bypass is a guarded 46-station civil-only descent with exact rollback proof.',
      'Cobalt S1 has two isolated 18-cell unpowered east-west rail slices with support, headroom, liner and diaphragm preservation evidence.',
    ],
    uncommissioned: [
      'Normal-alignment and north-turn holds remain; platforms, public access, power, signals, rescue, vehicles, trials, station opening and passenger service remain uncommissioned.',
    ],
    sourceIds: ['completion-register', 'cobalt-s1-passive-rail', 'high16-bypass'],
  },
  {
    id: 'SYS-04',
    title: 'Surface rail and protected promenade',
    status: 'PARTIAL — FIRST EXTERIOR PROMENADE AND PASSIVE-RAIL MODULE AS-BUILT',
    summary: 'AG-1, AG-2 and AG-3 form one bounded exterior module; the wider loop remains a source-bound concept survey.',
    built: [
      'AG-1: 1,165 polished-deepslate pier/foundation/girder cells, post-verified as support only.',
      'AG-2: 820-cell supported deck, five-wide protected walkway, parapets, separation wall, sealed service gallery and four lights, post-verified as civil promenade only.',
      'AG-3: 128 cells comprising 32 unpowered rail cells, a 48-cell recovery path and 48-cell rail-side barrier, post-verified as passive only.',
    ],
    uncommissioned: [
      'No turnout, detector, power, signal, station/platform, public opening, citywide route, vehicle trial or passenger service is commissioned.',
      'AG-4 is a no-operation gap survey: x=336..351 retains 16 sand/water bearing failures and a saved item; x=352..367 is design input only and supplies no connection authority.',
    ],
    sourceIds: ['mp05-current', 'completion-register', 'surface-rail-standard', 'surface-network-02'],
  },
];

const artifact = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-current-plan-state',
  reconciledOn: '2026-10-27',
  classification: 'READ_ONLY_TRACKED_SOURCE_RECONCILIATION',
  authority: {
    readOnly: true,
    liveWorldRecertified: false,
    worldMutationAuthorized: false,
    trackedSourcesOnly: true,
    excludedSources: [forbiddenSource],
  },
  sources,
  plans,
  systems,
  highlights: [
    {
      id: 'mp05-boundary',
      title: 'MP05 is an accepted bounded MVP, not a completed masterplan',
      detail: 'R07–R12/R13 evidence controls the accepted MVP. B07 through-route/receiver/egress, active systems and explicitly deferred interfaces remain outside that acceptance.',
      sourceIds: ['mp05-current', 'completion-register'],
    },
    {
      id: 'c01-boundary',
      title: 'C01 contains real as-built route and containment work without a commissioned opening',
      detail: 'Returns, finite liners, arrival work, the main switchback and upper-portion redesign are bounded construction. Public endpoint, egress, protected-route transition and whole-C01 commissioning remain separate.',
      sourceIds: ['mp11-current', 'mp11-switchback-release'],
    },
    {
      id: 'ag123-boundary',
      title: 'AG-1/2/3 are one passive exterior module, not a railway service',
      detail: 'Support, civil promenade and unpowered rail are post-verified only inside the first module. AG-4 and the wider loop have no continuity or operating authority.',
      sourceIds: ['mp05-current', 'completion-register', 'surface-rail-standard', 'surface-network-02'],
    },
    {
      id: 'mp10-exterior-current',
      title: 'The MP10 exterior stair and parapet supersede the obsolete internal-tread premise',
      detail: 'Current reconciliation retains 245 exact exterior targets and a bidirectional six-level route; it does not certify public egress, accessibility or civic-programme completion.',
      sourceIds: ['mp10-exterior-circulation', 'completion-register'],
    },
  ],
  historicalReconciliation: {
    masterPlanRailwayReport: {
      classification: 'DATED_ARCHIVE',
      asOf: '2026-08-22',
      statement: 'The archived report and validation remain intact. Their historical hashes are not refreshed in place and their claims are not promoted as current.',
      archivedBindingCount: archiveValidation.bindingChecks.length,
      trackedBindingCountEvaluated: trackedArchiveBindingCount,
      untrackedBindingCountNotEvaluated: archiveValidation.bindingChecks.length - trackedArchiveBindingCount,
      changedTrackedBindingCount: changedTrackedBindings.length,
      changedUniqueDocumentCount: changedUniquePaths.length,
      changedTrackedBindings,
      sourceId: 'railway-archive-validation',
    },
    masterplanProgram: {
      classification: 'DATED_ARCHIVE',
      asOf: '2026-08-05',
      statement: 'The retrospective source-program presentation remains useful historical context, but later CURRENT-STATE ledgers, accepted release records and the completion-register supplement control this publication.',
    },
  },
  safetyBoundary: [
    'This publication hashes and copies committed documents; it performs no live-world survey or recertification.',
    'As-built means only the exact scope supported by the cited source record. It does not inherit public access, egress, transport, utility or programme-completion claims.',
    'Uncommissioned and default-deny boundaries remain controlling even when adjacent civil or passive construction is accepted.',
    'The excluded phase1-r00 readiness audit is intentionally absent because it is not part of the tracked-source publication set.',
  ],
};

const expectedIndex = `${JSON.stringify(artifact, null, 2)}\n`;
const expectedFiles = new Map([
  ['index.json', Buffer.from(expectedIndex)],
  ...sourceSpecs.map((spec) => [`sources/${publicFilename(spec)}`, sourceBuffers.get(spec.id)]),
]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (checkOnly) {
  for (const [relativePath, expected] of expectedFiles) {
    const absolutePath = join(outputRoot, relativePath);
    if (!existsSync(absolutePath)) {
      fail(`Missing generated current-plan-state artifact: ${relative(showcaseRoot, absolutePath)}`);
      continue;
    }
    const actual = readFileSync(absolutePath);
    if (!actual.equals(expected)) {
      fail(`Stale generated current-plan-state artifact: ${relative(showcaseRoot, absolutePath)}`);
    }
  }

  if (existsSync(sourceOutputRoot)) {
    const expectedSourceNames = new Set(sourceSpecs.map(publicFilename));
    for (const name of readdirSync(sourceOutputRoot)) {
      if (!expectedSourceNames.has(name)) {
        fail(`Unexpected generated current-plan-state source: ${relative(showcaseRoot, join(sourceOutputRoot, name))}`);
      }
    }
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log(`Current plan state is fresh (${plans.length} plans, ${systems.length} systems, ${sources.length} tracked sources).`);
} else {
  mkdirSync(sourceOutputRoot, { recursive: true });
  for (const [relativePath, content] of expectedFiles) {
    const absolutePath = join(outputRoot, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
  console.log(`Wrote ${relative(showcaseRoot, outputPath)} and ${sourceSpecs.length} exact source copies.`);
}
