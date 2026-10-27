#!/usr/bin/env node
/**
 * MP13-HIGH-DECK-MERGE-DESIGN-02 — read-only documentation/map pack.
 *
 * It turns current, source-bound route and virtual-cut surveys into a compact
 * planner packet. It cannot compile operations and never touches Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};
const boundaryPath = value('--boundary');
const circulationPath = value('--circulation');
const outValue = value('--out');
if (!boundaryPath || !circulationPath || !outValue) {
  throw new Error('Usage: --boundary <survey.json> --circulation <survey.json> --out <fresh-directory>');
}
const boundary = JSON.parse(fs.readFileSync(path.resolve(ROOT, boundaryPath), 'utf8'));
const circulation = JSON.parse(fs.readFileSync(path.resolve(ROOT, circulationPath), 'utf8'));
const OUT = path.resolve(ROOT, outValue);
if (fs.existsSync(OUT)) throw new Error(`out must be a fresh directory: ${OUT}`);

const route = (id) => {
  const found = circulation.routes.find((entry) => entry.id === id);
  if (!found?.path) throw new Error(`missing surveyed path: ${id}`);
  return found;
};
const publicBypass = route('theatre-public-to-backstage');
const staffBase = route('backstage-to-west-service-base');
const tower = route('west-service-base-to-concourse');
const esc = (valueText) => String(valueText).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const path2d = (points, project) => points.map((point) => project(point).join(',')).join(' ');

function lowerMap() {
  const width = 1280; const height = 900;
  const box = { minX: -450, maxX: -290, minZ: -620, maxZ: -490 };
  const left = 85; const top = 100; const scale = 4.25;
  const px = (x) => left + (x - box.minX) * scale;
  const pz = (z) => top + (z - box.minZ) * scale;
  const grid = [];
  for (let x = -450; x <= -290; x += 10) grid.push(`<line x1="${px(x)}" y1="${pz(box.minZ)}" x2="${px(x)}" y2="${pz(box.maxZ)}" class="grid"/><text x="${px(x)}" y="${pz(box.maxZ) + 22}" class="axis">${x}</text>`);
  for (let z = -620; z <= -490; z += 10) grid.push(`<line x1="${px(box.minX)}" y1="${pz(z)}" x2="${px(box.maxX)}" y2="${pz(z)}" class="grid"/><text x="${px(box.minX) - 42}" y="${pz(z) + 4}" class="axis">${z}</text>`);
  const cutX1 = px(-340); const cutX2 = px(-331);
  const legend = [
    ['#ec5b56', 'public bypass — present, not accepted'],
    ['#ffbd4a', 'staff spine trace — present, not accepted'],
    ['#dc6ee7', 'every tested virtual partition plane'],
    ['#77d7e1', 'anchor / exact endpoint'],
  ].map(([colour, label], index) => `<rect x="910" y="${128 + index * 34}" width="18" height="18" fill="${colour}"/><text x="938" y="${143 + index * 34}" class="legend">${label}</text>`).join('');
  const anchors = [
    { point: publicBypass.from, label: 'Public anchor (-390,18,-556)' },
    { point: publicBypass.to, label: 'Backstage (-330,18,-556)' },
    { point: staffBase.to, label: 'West service base (-437,19,-538)' },
  ].map(({ point, label }) => `<circle cx="${px(point[0])}" cy="${pz(point[2])}" r="7" class="anchor"/><text x="${px(point[0]) + 10}" y="${pz(point[2]) - 9}" class="callout">${esc(label)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg{fill:#111827}.frame{fill:#172033;stroke:#56657c;stroke-width:2}.grid{stroke:#334155;stroke-width:1}.axis{fill:#94a3b8;font:12px ui-monospace,monospace;text-anchor:middle}.title{fill:#f8fafc;font:700 26px system-ui}.sub{fill:#cbd5e1;font:14px system-ui}.legend{fill:#e2e8f0;font:14px system-ui}.callout{fill:#f8fafc;font:12px system-ui;paint-order:stroke;stroke:#111827;stroke-width:4px}.anchor{fill:#77d7e1;stroke:#f8fafc;stroke-width:2px}.note{fill:#fecaca;font:700 15px system-ui}.metric{fill:#dbeafe;font:13px ui-monospace,monospace}
  </style>
  <rect width="100%" height="100%" class="bg"/><text x="60" y="42" class="title">MP13 Westlight Venue — lower public / backstage topology</text>
  <text x="60" y="68" class="sub">Current complete source ${esc(circulation.sourceSnapshot.sha256)} · plan view uses X/Z; station Y is recorded in route labels</text>
  <rect x="${left}" y="${top}" width="${(box.maxX - box.minX) * scale}" height="${(box.maxZ - box.minZ) * scale}" class="frame"/>
  ${grid.join('')}
  <rect x="${cutX1}" y="${pz(-620)}" width="${cutX2 - cutX1}" height="${pz(-490) - pz(-620)}" fill="#dc6ee7" opacity="0.17"/>
  <line x1="${cutX1}" y1="${pz(-620)}" x2="${cutX1}" y2="${pz(-490)}" stroke="#dc6ee7" stroke-width="2"/>
  <line x1="${cutX2}" y1="${pz(-620)}" x2="${cutX2}" y2="${pz(-490)}" stroke="#dc6ee7" stroke-width="2"/>
  <polyline points="${path2d(publicBypass.path, ([x,,z]) => [px(x), pz(z)])}" fill="none" stroke="#ec5b56" stroke-width="5" stroke-linejoin="round"/>
  <polyline points="${path2d(staffBase.path, ([x,,z]) => [px(x), pz(z)])}" fill="none" stroke="#ffbd4a" stroke-width="4" stroke-linejoin="round"/>
  ${anchors}
  <text x="${cutX1 + 5}" y="${pz(-614)}" class="note">x = -340…-331: all 10 full-plane cuts fail</text>
  <text x="910" y="100" class="title" style="font-size:18px">Legend</text>${legend}
  <text x="910" y="300" class="metric">79 station public→backstage trace</text>
  <text x="910" y="324" class="metric">134 station backstage→service-base trace</text>
  <text x="910" y="348" class="metric">18,827 public-reachable stations</text>
  <text x="910" y="396" class="note">No safe partition is a release candidate:</text>
  <text x="910" y="420" class="sub">all ten planes block the bypass, but none</text><text x="910" y="440" class="sub">blocks public→staff spine or preserves staff spine.</text>
  <text x="910" y="490" class="sub">This is a route-graph map, not an egress</text><text x="910" y="510" class="sub">certificate or an ownership transfer.</text>
</svg>`;
}

function towerMap() {
  const width = 1280; const height = 840;
  const left = 90; const top = 100; const zMin = -545; const zMax = -530; const yMin = 16; const yMax = 68;
  const pz = (z) => left + (z - zMin) * 36;
  const py = (y) => top + (yMax - y) * 12;
  const grid = [];
  for (let y = 18; y <= 66; y += 6) grid.push(`<line x1="${pz(zMin)}" y1="${py(y)}" x2="${pz(zMax)}" y2="${py(y)}" class="grid"/><text x="${pz(zMin) - 24}" y="${py(y) + 4}" class="axis">${y}</text>`);
  for (let z = -545; z <= -530; z += 3) grid.push(`<line x1="${pz(z)}" y1="${py(yMax)}" x2="${pz(z)}" y2="${py(yMin)}" class="grid"/><text x="${pz(z)}" y="${py(yMin) + 22}" class="axis">${z}</text>`);
  const sectionPath = path2d(tower.path, ([, y, z]) => [pz(z), py(y)]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg{fill:#111827}.frame{fill:#172033;stroke:#56657c;stroke-width:2}.grid{stroke:#334155;stroke-width:1}.axis{fill:#94a3b8;font:12px ui-monospace,monospace;text-anchor:middle}.title{fill:#f8fafc;font:700 26px system-ui}.sub{fill:#cbd5e1;font:14px system-ui}.callout{fill:#f8fafc;font:13px system-ui}.note{fill:#fecaca;font:700 15px system-ui}.metric{fill:#dbeafe;font:13px ui-monospace,monospace}
  </style>
  <rect width="100%" height="100%" class="bg"/><text x="60" y="42" class="title">MP13 Westlight Venue — west service tower / high-deck merge section</text>
  <text x="60" y="68" class="sub">Current exact normal-walk trace projected onto Z/Y; X oscillates within -437…-434.</text>
  <rect x="${pz(zMin)}" y="${py(yMax)}" width="${pz(zMax) - pz(zMin)}" height="${py(yMin) - py(yMax)}" class="frame"/>
  ${grid.join('')}
  <rect x="${pz(-542)}" y="${py(54)}" width="${pz(-533) - pz(-542)}" height="${py(46) - py(54)}" fill="#ec8b4a" opacity="0.25" stroke="#fb923c" stroke-width="2"/>
  <polyline points="${sectionPath}" fill="none" stroke="#ffbd4a" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="${pz(tower.from[2])}" cy="${py(tower.from[1])}" r="7" fill="#77d7e1"/><text x="${pz(tower.from[2]) + 12}" y="${py(tower.from[1]) - 10}" class="callout">base (-437,19,-538)</text>
  <circle cx="${pz(tower.to[2])}" cy="${py(tower.to[1])}" r="7" fill="#77d7e1"/><text x="${pz(tower.to[2]) + 12}" y="${py(tower.to[1]) - 10}" class="callout">upper endpoint (-437,65,-537)</text>
  <text x="${pz(-542) + 6}" y="${py(54) + 24}" class="note">unresolved merge/changeover</text>
  <text x="${pz(-542) + 6}" y="${py(54) + 46}" class="note">x -439…-435 · y46…54 · z -542…-533</text>
  <text x="760" y="120" class="title" style="font-size:19px">What the trace proves—and does not</text>
  <text x="760" y="158" class="metric">68 station staff-vertical trace exists</text><text x="760" y="182" class="metric">64 / 66 sampled stations fail 5×5 public envelope</text><text x="760" y="206" class="metric">66 / 66 zero-local-light samples</text>
  <text x="760" y="258" class="note">No high-deck merge is accepted.</text>
  <text x="760" y="286" class="sub">The tower trace is staff-only, no egress width, landing,</text><text x="760" y="308" class="sub">lighting, access control, or ownership claim. The orange</text><text x="760" y="330" class="sub">changeover must be surveyed as a full 3×3 staff route</text><text x="760" y="352" class="sub">before a separate merge package can be designed.</text>
  <text x="760" y="414" class="sub">Public completion remains separately blocked: no bowl-main</text><text x="760" y="436" class="sub">or theatre lower→upper normal-walk route, no four required</text><text x="760" y="458" class="sub">public egress links, no 7×6 stairs/7×7 landings/lift analogue.</text>
</svg>`;
}

const candidateRows = boundary.candidates.map((candidate) => `| x=${candidate.planeX} | ${candidate.requiredSolidPartitionCells} | yes | no | no |`).join('\n');
const doc = `# MP13 high-deck merge / egress integrated design 02\n\n**Status:** \`HOLD_NO_INDEPENDENT_REVERSIBLE_CANDIDATE\`  \n**Mode:** read-only current-source reconciliation; no compiler, capture, RCON, database, or world mutation.\n\n## Current source and result\n\nThis packet is bound to the complete post-MP07 source\n\`data/worldsnap-mp07-full-circulation-post-20260826T141000Z/region\`\n(SHA-256 \`${circulation.sourceSnapshot.sha256}\`, ${circulation.sourceSnapshot.regionFileCount} region files). It supersedes the geometry basis of the earlier venue-only snapshots for this design decision.\n\nThere is **no small high-deck or partition build to release**. The lower public anchor still reaches backstage by a 79-station normal-walk trace; backstage still traces 134 stations to the west service base; and the staff tower traces 68 stations from the base to its upper endpoint. None of these traces is commissioned.\n\n![Lower public/staff topology](mp13-high-deck-lower-topology-map.svg)\n\n![West tower/high-deck section](mp13-high-deck-tower-section-map.svg)\n\n## Exact graph gate\n\nThe virtual-partition test covers every complete source-air plane x=-340 through x=-331. Each blocks public→backstage, but **none** blocks public→staff spine and **none** preserves the backstage→staff-spine route. A closed wall/door would therefore either leave a public bypass or strand staff; it is not a controlled access release.\n\n| candidate plane | exact source-air cells | blocks public→backstage | blocks public→staff spine | preserves backstage→staff spine |\n|---|---:|:---:|:---:|:---:|\n${candidateRows}\n\nThe baseline public component has ${boundary.baseline.publicReachableStations.toLocaleString('en-US')} reachable normal-walk stations. It includes the public anchor \`(-390,18,-556)\`, backstage \`(-330,18,-556)\`, and reaches the staff-side network. No exact public/staff ownership or access-class contract presently resolves that overlap.\n\n## High-deck merge disposition\n\nThe west service tower is a staff-only physical trace from \`(-437,19,-538)\` to \`(-437,65,-537)\`. Its 66 sampled stations have 64 public 5×5-envelope failures and all 66 have zero local-light samples; it cannot be relabelled as public egress. The unresolved changeover occupies the bounded review volume **x=-439..-435, y=46..54, z=-542..-533**. Earlier elevated-crossover work was rolled back after live route failure, so it supplies no as-built bridge authority.\n\nThere is also no public substitute: current route survey still reports no normal-walk path for east-arrival→bowl-main, bowl-main→upper, theatre-lower→upper, or members-club→bowl. This packet neither grants ownership nor converts the staff spine into a public route.\n\n## Required integrated build sequence\n\n1. Freeze an exact 3-D ownership/interface contract for lower public lobby, backstage, staff spine, tower changeover, upper landing, and Town Expansion overlap. The contract must assign access class and retain all non-target routes.\n2. Design and project-test a **new staff-only 3×3 continuous changeover** through the bounded tower volume, with real landings, no-jump bidirectional route proof, full lighting treatment, and no public bypass. Its operations must be exact source/inverse and remain entirely inside the adopted 3-D contract.\n3. Independently design public routes: a 7×6 egress stair/vomitory system with 7×7 turn landings, lift analogue, two independent exits, public/staff separation, and event-mode capacity. It must not rely on the staff-only tower.\n4. Only after those designs are accepted can a fresh complete source, entity gate, block-entity/container exclusion, strict parser/preflight, journalled execution, fresh post snapshot, rollback proof, and independent route QA be performed.\n\n## Explicit non-claims\n\nThis is not an operation package, high-deck acceptance, egress certificate, access-control system, ownership transfer, event-readiness claim, or authorization to mutate the world.\n`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp13-high-deck-lower-topology-map.svg'), `${lowerMap()}\n`);
fs.writeFileSync(path.join(OUT, 'mp13-high-deck-tower-section-map.svg'), `${towerMap()}\n`);
fs.writeFileSync(path.join(OUT, 'MP13-HIGH-DECK-MERGE-INTEGRATED-DESIGN-02.md'), doc);
fs.writeFileSync(path.join(OUT, 'design-manifest.json'), `${JSON.stringify({
  id: 'MP13-HIGH-DECK-MERGE-INTEGRATED-DESIGN-02', status: 'HOLD_NO_INDEPENDENT_REVERSIBLE_CANDIDATE', worldMutationPerformed: false,
  sourceSnapshot: circulation.sourceSnapshot, evidence: { boundary: boundaryPath, circulation: circulationPath },
  maps: ['mp13-high-deck-lower-topology-map.svg', 'mp13-high-deck-tower-section-map.svg'],
  requiredNextDesign: ['exact 3D ownership/access-class contract', 'staff-only 3x3 changeover', 'separate public egress/accessibility system'],
}, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: 'HOLD_NO_INDEPENDENT_REVERSIBLE_CANDIDATE', out: path.relative(ROOT, OUT), maps: 2 }, null, 2)}\n`);
