#!/usr/bin/env node
/** Additive, immutable static publication for the Cobalt candidate-only map. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE = 'data/world-review/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01-passive-post-20260826T183111Z';
const DIRECTORY = 'sys03-cobalt-station-pair-readiness-2026-08-27';
const OUT = path.join(SITE_ROOT, 'public', DIRECTORY);
const files = [
  ['map', 'sys03-cobalt-wl-rr-disjoint-station-pair-readiness-map.svg'],
  ['design', 'sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01.json'],
  ['readme', 'SYS03-COBALT-WL-RR-DISJOINT-STATION-PAIR-READINESS-01.md'],
];
const digest = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 Cobalt station-pair map sync rejected: ${message}`); };
const sourceRoot = path.join(REPO_ROOT, SOURCE);
const designPath = path.join(sourceRoot, 'sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01.json');
fail(fs.existsSync(designPath), `missing source design ${SOURCE}`);
const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));
fail(design.status === 'SOURCE_BOUND_CANDIDATE_ONLY__PC01_TO_PC08_UNACCEPTED' && design.disposition?.readOnly === true && design.disposition?.mutationAuthority === false && design.disposition?.worldMutated === false, 'source does not remain candidate-only/read-only');
fail(design.candidate?.selectedPair === 'Westlight (PR-W02) ↔ Ravensreach (PR-W04)' && design.disjointHeldScopes?.length === 2 && design.disjointHeldScopes.every((hold) => hold.candidateOverlap === false), 'candidate pair or R10 hold exclusion drifted');
fail(design.missingAcceptanceGates?.length === 8 && design.missingAcceptanceGates.every((gate) => gate.accepted === false), 'PC01–PC08 must remain unaccepted');

fs.mkdirSync(OUT, { recursive: true });
const assets = files.map(([id, filename]) => {
  const source = path.join(sourceRoot, filename);
  const destination = path.join(OUT, filename);
  fail(fs.existsSync(source), `missing ${filename}`);
  const sha256 = digest(source);
  if (fs.existsSync(destination)) fail(digest(destination) === sha256, `published asset drift ${filename}`);
  else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  return { id, filename, href: `/${DIRECTORY}/${filename}`, sha256 };
});
const publication = {
  schemaVersion: 1,
  id: 'sys03-cobalt-station-pair-readiness-publication-20260827',
  status: 'PASS_SYS03_COBALT_CANDIDATE_ONLY_MAP_SYNCED_PC01_TO_PC08_UNACCEPTED',
  publicationDirectory: `/${DIRECTORY}`,
  source: { path: SOURCE, designSha256: digest(designPath), status: design.status },
  candidate: { selectedPair: design.candidate.selectedPair, envelope: design.candidate.envelope, holds: design.disjointHeldScopes.map(({ id, candidateOverlap, candidateXSeparation }) => ({ id, candidateOverlap, candidateXSeparation })) },
  assets,
  nonClaims: ['Candidate-only static map publication. PC01–PC08 are unaccepted; no guideway, platform, power, rescue, public route, passenger service, RCON, or world mutation is authorized.'],
};
const manifestPath = path.join(OUT, 'publication-manifest.json');
const content = `${JSON.stringify(publication, null, 2)}\n`;
if (fs.existsSync(manifestPath)) fail(fs.readFileSync(manifestPath, 'utf8') === content, 'manifest drift; create a new dated publication volume');
else fs.writeFileSync(manifestPath, content, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ status: publication.status, output: path.relative(SITE_ROOT, OUT), assetCount: assets.length, mutationAuthority: false }, null, 2)}\n`);
