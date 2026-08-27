#!/usr/bin/env node
/** Additive, hash-checked publication of C01 Return-02 as-built SVG maps. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE = 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-public-independent-return-02';
const DIRECTORY = 'c01-return-02-as-built-2026-08-27';
const OUT = path.join(SITE_ROOT, 'public', DIRECTORY);
const files = [
  ['plan', 'c01-return-02-as-built-plan.svg', 'C01 Return-02 as-built plan'],
  ['elevation', 'c01-return-02-as-built-elevation.svg', 'C01 Return-02 as-built vertical station elevation'],
  ['evidence', 'c01-return-02-as-built-map-evidence.json', 'Source-bound/as-built evidence'],
  ['readme', 'README.md', 'Scope and non-commissioning notice'],
];
const digest = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`C01 Return-02 map sync rejected: ${message}`); };
const sourceRoot = path.join(REPO_ROOT, SOURCE);
const evidencePath = path.join(sourceRoot, 'c01-return-02-as-built-map-evidence.json');
fail(fs.existsSync(evidencePath), `missing map evidence ${SOURCE}`);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
fail(evidence.status === 'PASS_SOURCE_BOUND_PHYSICALLY_VERIFIED_NOT_COMMISSIONED' && evidence.readOnly === true && evidence.worldMutated === false, 'source maps are not verified physical but uncommissioned evidence');
fail(evidence.geometry?.stationCount === 28 && evidence.geometry?.endpointContracts?.length === 4 && evidence.geometry?.protectedSwitchbackInteriorHaloIntersectionCount === 0, 'source map geometry drifted');
fail(evidence.asBuiltChecks?.canonicalPostStateCellCount === 768 && evidence.asBuiltChecks?.immutablePostCanonicalMismatches?.length === 0 && Object.values(evidence.asBuiltChecks?.correctedQaChecks ?? {}).every((value) => value === true), 'source map QA is not fully passing');

fs.mkdirSync(OUT, { recursive: true });
const published = files.map(([id, filename, title]) => {
  const source = path.join(sourceRoot, filename);
  const destination = path.join(OUT, filename);
  fail(fs.existsSync(source), `missing source ${filename}`);
  const sha256 = digest(source);
  if (fs.existsSync(destination)) fail(digest(destination) === sha256, `published asset drift ${filename}`);
  else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  return { id, title, filename, href: `/${DIRECTORY}/${filename}`, sha256 };
});
const publication = {
  schemaVersion: 1,
  id: 'c01-return-02-as-built-map-publication-20260827',
  status: 'PASS_C01_RETURN02_AS_BUILT_MAPS_SYNCED_NOT_COMMISSIONED',
  publicationDirectory: `/${DIRECTORY}`,
  sourceEvidence: { path: SOURCE, sha256: digest(evidencePath), status: evidence.status },
  geometry: evidence.geometry,
  maps: published,
  nonClaims: ['Static map publication only. It does not open, commission, or authorize public or service use of the C01 return.'],
};
const manifestPath = path.join(OUT, 'publication-manifest.json');
const body = `${JSON.stringify(publication, null, 2)}\n`;
if (fs.existsSync(manifestPath)) fail(fs.readFileSync(manifestPath, 'utf8') === body, 'publication manifest drift; create a new dated volume');
else fs.writeFileSync(manifestPath, body, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ status: publication.status, output: path.relative(SITE_ROOT, OUT), mapCount: published.length, mutationAuthority: false }, null, 2)}\n`);
