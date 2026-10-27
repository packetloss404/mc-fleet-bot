#!/usr/bin/env node
/** Static publication of today's three C01 as-built visuals into the dashboard. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SITE, '..');

const PUBLICATIONS = [
  {
    id: 'c01-main-switchback-transition-01-as-built-2026-08-27',
    name: 'C01 Main Switchback Transition 01',
    source: 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-main-switchback-transition-01-as-built-2026-08-27',
  },
  {
    id: 'c01-public-vertical-upper-portion-redesign-01-as-built-2026-08-27',
    name: 'C01 Public Vertical Upper Portion Redesign 01',
    source: 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-upper-portion-redesign-01-as-built-2026-08-27',
  },
  {
    id: 'c01-upper-landing-endpoint-opening-transition-01-as-built-2026-08-27',
    name: 'C01 Upper Landing Endpoint/Opening/Transition 01',
    source: 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-upper-landing-endpoint-opening-transition-01-as-built-2026-08-27',
  },
];

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fail = (x, m) => { if (!x) throw Error(`C01 as-built visuals sync rejected: ${m}`); };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// Validate every bundle before copying any file. A release can be accepted
// while its visual publication is still incomplete; a caption template is not
// a geometric map of that release.
for (const pub of PUBLICATIONS) {
  const sourceDir = path.join(ROOT, pub.source);
  fail(fs.existsSync(sourceDir), `missing source ${pub.source}`);
  for (const filename of ['as-built-plan.svg', 'as-built-section.svg']) {
    const svgPath = path.join(sourceDir, filename);
    fail(fs.existsSync(svgPath), `missing ${pub.source}/${filename}`);
    const svg = fs.readFileSync(svgPath, 'utf8');
    fail(!/\$\{[^}]+\}/.test(svg), `unresolved template in ${pub.source}/${filename}; regenerate geometry from accepted evidence`);
    fail(svg.length > 1000 && /<(?:path|line|polyline|polygon|circle)\b/.test(svg),
      `no geometric map in ${pub.source}/${filename}`);
  }
  const evidence = JSON.parse(fs.readFileSync(path.join(sourceDir, 'as-built-evidence.json'), 'utf8'));
  fail(evidence.status === 'AS_BUILT', `unaccepted visual evidence for ${pub.id}`);
  if (evidence.scope) {
    fail(evidence.scope.canonicalCells > 0 && evidence.scope.cellsChanged > 0,
      `empty visual scope for ${pub.id}`);
  }
}

const copied = [];
for (const pub of PUBLICATIONS) {
  const sourceDir = path.join(ROOT, pub.source);
  fail(fs.existsSync(sourceDir), `missing source ${pub.source}`);
  const targetDir = path.join(SITE, 'public', pub.id);
  fs.mkdirSync(targetDir, { recursive: true });
  const files = fs.readdirSync(sourceDir);
  const fileCopies = [];
  for (const f of files) {
    const from = path.join(sourceDir, f);
    const to = path.join(targetDir, f);
    if (fs.statSync(from).isFile()) {
      fs.copyFileSync(from, to);
      fail(sha(from) === sha(to), `hash mismatch ${f}`);
      fileCopies.push({ file: f, sha256: sha(to), bytes: fs.statSync(to).size });
    }
  }
  copied.push({ id: pub.id, name: pub.name, target: rel(targetDir), files: fileCopies.length, fileList: fileCopies });
}

const manifest = {
  schemaVersion: 1,
  id: 'C01-AS-BUILT-VISUALS-SHOWCASE-2026-08-27',
  status: 'PASS_AS_BUILT_VISUALS_SYNCED',
  authority: { worldMutationAuthorized: false, routeOrEgressAuthorized: false },
  publications: copied,
};
fs.writeFileSync(path.join(SITE, 'public', 'c01-as-built-visuals-2026-08-27-publication-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ status: manifest.status, publications: copied.length, totalFiles: copied.reduce((sum, c) => sum + c.files, 0) }, null, 2));
