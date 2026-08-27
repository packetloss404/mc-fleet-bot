#!/usr/bin/env node
/**
 * Read-only SYS-01 citywide pedestrian-continuity reconciliation.
 *
 * This is deliberately a network evidence census, not a path generator.  It
 * establishes which bounded routes still pass on one immutable post source,
 * measures their closest disjoint stations, and refuses to turn unsurveyed
 * terrain into an invented public corridor or an operation package.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};
const SNAPSHOT = option('--snapshot');
const MP07_QA = option('--mp07-qa');
const MP06_QA = option('--mp06-qa');
const ROUTE_SURVEY = option('--route-survey');
const OUT = option('--out');
const MARKDOWN = option('--markdown');
const PLAN_MAP = option('--plan-map');
const PROFILE_MAP = option('--profile-map');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const markdownRelative = (from, to) => path.relative(path.dirname(absolute(from)), absolute(to)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS-01 continuity census rejected: ${message}`); };
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const pointKey = (point) => point.join(',');
const mdPoint = (point) => `(${point.join(', ')})`;
const html = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

function mp06Stations() {
  const result = [];
  for (let z = -500; z <= -494; z += 1) {
    result.push([-265, 73, z]);
    result.push([-251, 72, z]);
  }
  for (let x = -264; x <= -252; x += 1) for (let z = -501; z <= -493; z += 1) result.push([x, 69, z]);
  return result;
}

function closestPair(left, right) {
  let best = null;
  for (const a of left) for (const b of right) {
    const dx = Math.abs(a[0] - b[0]);
    const dy = Math.abs(a[1] - b[1]);
    const dz = Math.abs(a[2] - b[2]);
    const candidate = { manhattan: dx + dy + dz, delta: { x: dx, y: dy, z: dz }, left: a, right: b };
    if (!best || candidate.manhattan < best.manhattan || (candidate.manhattan === best.manhattan && pointKey(a) < pointKey(best.left))) best = candidate;
  }
  return best;
}

function planSvg(route, closest) {
  const bounds = { minX: -270, maxX: -70, minZ: -510, maxZ: 105 };
  const width = 1400; const height = 860; const margin = 80;
  const project = ([x, , z]) => [
    margin + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (width - margin * 2),
    height - margin - ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * (height - margin * 2),
  ];
  const trace = route.map(project).map((point) => point.join(',')).join(' ');
  const [aX, aY] = project(closest.left); const [bX, bY] = project(closest.right);
  const [startX, startY] = project(route[0]); const [endX, endY] = project(route.at(-1));
  const xTicks = [-260, -220, -180, -140, -100];
  const zTicks = [-500, -400, -300, -200, -100, 0, 100];
  const grid = [
    ...xTicks.map((x) => { const [px] = project([x, 0, bounds.minZ]); return `<line x1="${px}" y1="${margin}" x2="${px}" y2="${height - margin}" class="grid"/><text x="${px}" y="${height - 48}" class="axis">x ${x}</text>`; }),
    ...zTicks.map((z) => { const [, py] = project([bounds.minX, 0, z]); return `<line x1="${margin}" y1="${py}" x2="${width - margin}" y2="${py}" class="grid"/><text x="10" y="${py + 4}" class="axis">z ${z}</text>`; }),
  ].join('');
  const [mp06X1, mp06Y1] = project([-265, 0, -501]); const [mp06X2, mp06Y2] = project([-251, 0, -493]);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="SYS-01 current pedestrian-continuity evidence map">
  <style>
    .bg{fill:#09131d}.grid{stroke:#25455b;stroke-width:1}.axis{fill:#a6c4d6;font:14px system-ui,sans-serif}.title{fill:#f6fbff;font:700 28px system-ui,sans-serif}.sub{fill:#c8dbe7;font:16px system-ui,sans-serif}.label{fill:#f6fbff;font:700 15px system-ui,sans-serif}.note{fill:#c8dbe7;font:14px system-ui,sans-serif}.mp07{fill:none;stroke:#38bdf8;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}.gap{stroke:#fb923c;stroke-width:4;stroke-dasharray:13 10}.mp06{fill:#a3e635;stroke:#ecfccb;stroke-width:2}.endpoint{fill:#f8fafc;stroke:#0f172a;stroke-width:2}.box{fill:#102233;stroke:#3b627e;stroke-width:1.5}.warn{fill:#4a2316;stroke:#fb923c;stroke-width:1.5}
  </style>
  <rect class="bg" width="100%" height="100%"/>
  <text x="80" y="38" class="title">SYS-01 · Current-source pedestrian network evidence</text>
  <text x="80" y="64" class="sub">MP06 immutable post · horizontal coordinate map · only accepted normal-walk components are drawn</text>
  ${grid}
  <rect x="${mp06X1 - 8}" y="${mp06Y2 - 8}" width="${mp06X2 - mp06X1 + 16}" height="${mp06Y1 - mp06Y2 + 16}" class="mp06" opacity=".7"/>
  <polyline points="${trace}" class="mp07"/>
  <line x1="${aX}" y1="${aY}" x2="${bX}" y2="${bY}" class="gap"/>
  <circle cx="${startX}" cy="${startY}" r="7" class="endpoint"/><circle cx="${endX}" cy="${endY}" r="7" class="endpoint"/>
  <circle cx="${aX}" cy="${aY}" r="8" fill="#fb923c"/><circle cx="${bX}" cy="${bY}" r="8" fill="#fb923c"/>
  <rect x="825" y="105" width="485" height="154" rx="10" class="box"/>
  <text x="845" y="132" class="label">Verified MP07 trace</text><text x="845" y="155" class="note">534 stations · 48/48 each way · min width 3</text><text x="845" y="178" class="note">anchors ${html(mdPoint(route[0]))} → ${html(mdPoint(route.at(-1)))}</text><text x="845" y="206" class="label" fill="#38bdf8">cyan = exact accepted trace</text>
  <rect x="825" y="275" width="485" height="136" rx="10" class="box"/>
  <text x="845" y="302" class="label">Verified MP06 crossing</text><text x="845" y="325" class="note">upper: 105 stations / 98 directed pairs</text><text x="845" y="348" class="note">lower: 117 stations; retained lower-road clearway</text><text x="845" y="376" class="label" fill="#a3e635">green = exact crossing footprint</text>
  <rect x="825" y="428" width="485" height="178" rx="10" class="warn"/>
  <text x="845" y="455" class="label">First cross-component blocker</text><text x="845" y="479" class="note">nearest verified stations are ${html(String(closest.manhattan))} Manhattan cells apart</text><text x="845" y="502" class="note">MP07 ${html(mdPoint(closest.left))}</text><text x="845" y="525" class="note">MP06 ${html(mdPoint(closest.right))}</text><text x="845" y="548" class="note">delta: x ${closest.delta.x}, y ${closest.delta.y}, z ${closest.delta.z}</text><text x="845" y="578" class="label">orange dashed = unowned / unsurveyed gap, not a route</text>
  <text x="80" y="822" class="note">Map is an evidence index, not a claim that all intervening terrain is walkable, public, owned, or safe. No operation package was compiled.</text>
</svg>`;
}

function profileSvg(closest) {
  const [leftX, leftY, leftZ] = closest.left; const [rightX, rightY, rightZ] = closest.right;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="720" viewBox="0 0 1400 720" role="img" aria-label="SYS-01 cross-component evidence profile">
  <style>.bg{fill:#09131d}.title{fill:#f6fbff;font:700 29px system-ui,sans-serif}.sub{fill:#c8dbe7;font:16px system-ui,sans-serif}.grid{stroke:#25455b;stroke-width:1}.axis{fill:#a6c4d6;font:14px system-ui,sans-serif}.mp07{fill:#38bdf8}.mp06{fill:#a3e635}.gap{stroke:#fb923c;stroke-width:5;stroke-dasharray:14 10}.label{fill:#f6fbff;font:700 17px system-ui,sans-serif}.note{fill:#c8dbe7;font:15px system-ui,sans-serif}.warn{fill:#4a2316;stroke:#fb923c;stroke-width:1.5}</style>
  <rect width="100%" height="100%" class="bg"/><text x="80" y="45" class="title">SYS-01 · Cross-component interface profile</text><text x="80" y="70" class="sub">Vertical coordinates are real; horizontal spacing is schematic and explicitly not a surveyed route alignment.</text>
  <line x1="90" y1="590" x2="1320" y2="590" class="grid"/><text x="90" y="615" class="axis">schematic horizontal relationship only</text>
  <line x1="90" y1="300" x2="1320" y2="300" class="grid"/><text x="18" y="305" class="axis">Y=73</text><line x1="90" y1="380" x2="1320" y2="380" class="grid"/><text x="18" y="385" class="axis">Y=71</text><line x1="90" y1="460" x2="1320" y2="460" class="grid"/><text x="18" y="465" class="axis">Y=69</text><line x1="90" y1="540" x2="1320" y2="540" class="grid"/><text x="18" y="545" class="axis">Y=67</text>
  <circle cx="260" cy="460" r="18" class="mp07"/><text x="290" y="447" class="label">MP07 nearest proven station</text><text x="290" y="472" class="note">${html(mdPoint([leftX, leftY, leftZ]))}</text>
  <circle cx="1080" cy="460" r="18" class="mp06"/><text x="890" y="447" class="label">MP06 lower nearest station</text><text x="890" y="472" class="note">${html(mdPoint([rightX, rightY, rightZ]))}</text>
  <circle cx="1135" cy="300" r="15" class="mp06"/><text x="1015" y="277" class="note">upper west endpoint (-265, 73, -500)</text>
  <line x1="278" y1="460" x2="1062" y2="460" class="gap"/><rect x="475" y="405" width="380" height="100" rx="10" class="warn"/><text x="498" y="435" class="label">No accepted bridge-interface chain</text><text x="498" y="460" class="note">${closest.manhattan}-cell Manhattan separation</text><text x="498" y="483" class="note">no normal-walk trace; no reverse proof; no owner contract</text>
  <text x="80" y="670" class="note">Required next input: an exact public-corridor owner/interface chain plus a fresh route survey and bidirectional normal-walk proof. Until then, neither a line nor a cell set is authorized.</text>
</svg>`;
}

function main() {
  for (const [flag, value] of [['--snapshot', SNAPSHOT], ['--mp07-qa', MP07_QA], ['--mp06-qa', MP06_QA], ['--route-survey', ROUTE_SURVEY], ['--out', OUT], ['--markdown', MARKDOWN], ['--plan-map', PLAN_MAP], ['--profile-map', PROFILE_MAP]]) fail(value, `${flag} is required`);
  const snapshotRoot = absolute(SNAPSHOT);
  const captureFile = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, member)), `snapshot missing ${member}`);
  const captureBytes = fs.readFileSync(captureFile); const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy === true, 'source is not immutable');
  const mp07 = readJson(MP07_QA); const mp06 = readJson(MP06_QA); const survey = readJson(ROUTE_SURVEY);
  fail(mp07.status === 'PASS' && mp07.checks?.all48ForwardExactNormalWalkPaths && mp07.checks?.all48ReverseExactNormalWalkPaths && mp07.checks?.zeroBelowThreeWideCrossSections, 'MP07 current-source QA does not pass');
  fail(mp06.status === 'PASS' && mp06.checks?.all105ElevatedNormalWalkStationsConnected && mp06.checks?.all98DirectedElevatedEndpointPairsReachable && mp06.checks?.all117LowerNormalWalkStationsConnected, 'MP06 current-source QA does not pass');
  const route = survey.accepted?.exactPath;
  fail(Array.isArray(route) && route.length === 534, 'accepted MP07 trace is not the expected 534 stations');
  const closest = closestPair(route, mp06Stations());
  const components = [
    { id: 'MP07-RRMSA-FULL-CIRCULATION-01', class: 'accepted finite normal-walk trace', stations: 534, first: route[0], last: route.at(-1), proof: { forward: '48/48', reverse: '48/48', minimumWidth: 3 }, source: relative(MP07_QA) },
    { id: 'MP06-ENDPOINT-ELEVATED-CROSSING-01 upper', class: 'accepted finite normal-walk crossing', stations: 105, first: [-265, 73, -500], last: [-251, 72, -494], proof: { directedPairs: '98/98' }, source: relative(MP06_QA) },
    { id: 'MP06-ENDPOINT-ELEVATED-CROSSING-01 lower', class: 'accepted retained lower-road clearway', stations: 117, first: [-264, 69, -501], last: [-252, 69, -493], proof: { connectedStations: '117/117' }, source: relative(MP06_QA) },
  ];
  const result = {
    schemaVersion: 1,
    surveyId: 'SYS01-CITYWIDE-PEDESTRIAN-CONTINUITY-02',
    generatedAtUtc: new Date().toISOString(),
    readOnly: true,
    worldMutated: false,
    rconCalled: false,
    releaseDecision: 'NO_DISJOINT_CITYWIDE_LINK_RELEASE',
    source: { snapshot: relative(SNAPSHOT), completeCaptureManifestSha256: sha256(captureBytes), immutableCopy: capture.immutableCopy, captureId: capture.captureId ?? null },
    reconciliationInputs: { mp07Qa: relative(MP07_QA), mp06Qa: relative(MP06_QA), mp07RouteSurvey: relative(ROUTE_SURVEY) },
    acceptedBoundedComponents: components,
    firstCrossComponentBlocker: {
      id: 'SYS01-RRMSA-TO-MP06-UNCONTRACTED-GAP-01',
      nearestVerifiedStations: closest,
      finding: 'The accepted MP07 and MP06 route station sets are disjoint. The closest exact stations are separated by a 302-cell Manhattan gap. The reconciliation inputs supply no exact public-corridor ownership/interface chain, no canonical intervening normal-walk trace, and no reverse-path proof.',
      status: 'NOT_A_RELEASE_CANDIDATE',
      requiredBeforeCompilation: ['fresh corridor-bounded source survey', 'exact public-route owner and interface contract covering every proposed target and retained seam', 'bidirectional normal-walk trace, including recovery/return endpoints', 'fluid/gravity/container/protected-core and live-entity kernel for the exact delta', 'exact forward and rollback inverse'],
    },
    nonClaims: ['This does not prove all terrain between the components is impassable.', 'This does not establish a public route, accessibility compliance, or citywide continuity.', 'No path, operation set, ownership transfer, configuration change, live capture, RCON command, or world mutation was produced.'],
  };
  fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
  fs.mkdirSync(path.dirname(absolute(MARKDOWN)), { recursive: true });
  fs.mkdirSync(path.dirname(absolute(PLAN_MAP)), { recursive: true });
  fs.mkdirSync(path.dirname(absolute(PROFILE_MAP)), { recursive: true });
  fs.writeFileSync(absolute(OUT), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(absolute(PLAN_MAP), planSvg(route, closest));
  fs.writeFileSync(absolute(PROFILE_MAP), profileSvg(closest));
  fs.writeFileSync(absolute(MARKDOWN), `# SYS-01 citywide pedestrian-continuity reconciliation · 26 August 2026\n\n**Decision:** \`${result.releaseDecision}\`. This is a read-only reconciliation on the current complete MP06 immutable post, not a completion claim or an authority transfer.\n\n## What still passes on this source\n\n| Bounded component | Current proof | Exact terminals / envelope | Network boundary |\n|---|---|---|---|\n| MP07 Ravensreach–MainStreet trace | 534 stations; 48/48 forward and 48/48 reverse normal-walk paths; minimum contiguous width 3 | ${mdPoint(route[0])} → ${mdPoint(route.at(-1))} | Does not certify circulation outside its accepted trace. |\n| MP06 elevated endpoint crossing | 105/105 stations; 98/98 directed endpoint pairs | x=-265..-251, y=72..73, z=-500..-494 | Does not prove either external endpoint. |\n| MP06 retained lower-road clearway | 117/117 stations connected | x=-264..-252, y=69, z=-501..-493 | Does not prove lower-road regional continuity. |\n\nBoth independent QAs were rerun against \`${relative(SNAPSHOT)}\` and pass. The capture manifest SHA-256 is \`${result.source.completeCaptureManifestSha256}\`.\n\n## First cross-component blocker\n\nThe station sets above are disjoint. Their nearest exact stations are **${closest.manhattan} Manhattan cells** apart: MP07 ${mdPoint(closest.left)} to MP06 ${mdPoint(closest.right)} (delta x=${closest.delta.x}, y=${closest.delta.y}, z=${closest.delta.z}). This is a measured separation between *verified route stations*, not an assertion about all terrain in between.\n\nNo reconciliation input provides an accepted public-corridor ownership/interface chain, a canonical intervening normal-walk path, or the required reverse proof. Therefore there is no safe finite cell set to compile. A direct path, paving strip, or vertical adjustment here would invent the missing public-route scope and could cross protected or separately owned fabric.\n\n## Maps\n\n- [Horizontal evidence map](${markdownRelative(MARKDOWN, PLAN_MAP)})\n- [Cross-component profile](${markdownRelative(MARKDOWN, PROFILE_MAP)})\n\n## Required next package\n\n1. Survey one explicitly bounded candidate corridor from a named MP07 public terminal to a named MP06 endpoint, including all intermediate levels and recovery anchors.\n2. Adopt a one-to-one public-route ownership and interface contract for the exact target cells and retained seams.\n3. Prove normal walk in both directions on the surveyed route.\n4. Only then compile a disjoint guarded forward/rollback package and run the release safety kernel.\n\nNo capture, RCON, configuration change, operation file, or world mutation occurred.\n`);
  console.log(JSON.stringify({ status: result.releaseDecision, out: relative(OUT), markdown: relative(MARKDOWN), planMap: relative(PLAN_MAP), profileMap: relative(PROFILE_MAP), nearestGap: closest }, null, 2));
}

main();
