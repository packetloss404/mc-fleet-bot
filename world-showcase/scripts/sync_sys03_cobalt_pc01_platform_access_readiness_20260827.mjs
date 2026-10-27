#!/usr/bin/env node
/** Additive static publication for the default-deny SYS03 Cobalt PC-01 map. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE = 'data/world-review/sys03-cobalt-wl-rr-pc01-platform-access-readiness-01-passive-post-20260826T183111Z';
const DIRECTORY = 'sys03-cobalt-pc01-platform-access-readiness-2026-08-27';
const OUT = path.join(SITE_ROOT, 'public', DIRECTORY);
const files = [
  ['map', 'sys03-cobalt-pc01-platform-access-readiness-map.svg'],
  ['design', 'sys03-cobalt-pc01-platform-access-readiness-01.json'],
  ['readme', 'SYS03-COBALT-PC01-PLATFORM-ACCESS-READINESS-01.md'],
];
const digest = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 Cobalt PC-01 map sync rejected: ${message}`); };
const sourceRoot = path.join(REPO_ROOT, SOURCE);
const designPath = path.join(sourceRoot, 'sys03-cobalt-pc01-platform-access-readiness-01.json');
fail(fs.existsSync(designPath), `missing PC-01 source ${SOURCE}`);
const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));
fail(design.status === 'SOURCE_BOUND_PC01_READINESS_ONLY__PUBLIC_ENDPOINTS_AND_RETURNS_UNACCEPTED' && design.disposition?.readOnly === true && design.disposition?.mutationAuthority === false && design.disposition?.worldMutated === false, 'PC-01 source is not default-deny/read-only');
const publicEndpoints = design.endpointContracts?.filter((contract) => contract.class === 'public') ?? [];
const serviceEndpoint = design.endpointContracts?.find((contract) => contract.id === 'RR-SE-1-SERVICE-3X3');
fail(publicEndpoints.length === 4 && publicEndpoints.every((contract) => contract.status !== 'PROTECTED_SERVICE_ONLY'), 'four unaccepted public interfaces are required');
fail(publicEndpoints.some((contract) => contract.id === 'RR-PC01-SURFACE-PUBLIC-5X5' && contract.status === 'SOURCE_PAD_3X3_ONLY__UPGRADE_TO_5X5_REQUIRED'), 'Ravensreach 3×3 pad limitation missing');
fail(serviceEndpoint?.class === 'service' && serviceEndpoint?.status === 'PROTECTED_SERVICE_ONLY', 'RR-SE-1 service-only sleeve drifted');
fail(design.missingAcceptance?.pc01Accepted === false && design.targetAndInversePrerequisites?.currentState === 'NO_TARGET_STATES_OR_OPERATIONS_EMITTED', 'PC-01 has incorrectly acquired authority');

fs.mkdirSync(OUT, { recursive: true });
const assets = files.map(([id, filename]) => {
  const source = path.join(sourceRoot, filename);
  const destination = path.join(OUT, filename);
  fail(fs.existsSync(source), `missing source ${filename}`);
  const sha256 = digest(source);
  if (fs.existsSync(destination)) fail(digest(destination) === sha256, `published asset drift ${filename}`);
  else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  return { id, filename, href: `/${DIRECTORY}/${filename}`, sha256 };
});
const publication = {
  schemaVersion: 1,
  id: 'sys03-cobalt-pc01-platform-access-readiness-publication-20260827',
  status: 'PASS_SYS03_COBALT_PC01_READINESS_MAP_SYNCED_ZERO_AUTHORITY',
  publicationDirectory: `/${DIRECTORY}`,
  source: { path: SOURCE, sha256: digest(designPath), status: design.status },
  publicEndpointSummary: { unacceptedFiveByFiveEndpointCount: publicEndpoints.length, ravensreachPad: '3x3 only; upgrade to an exact 5x5 concourse is required', serviceSleeve: 'RR-SE-1 is protected service-only 3x3' },
  assets,
  nonClaims: ['Static readiness publication only. It creates no public endpoint, platform, access route, guideway, power, rescue route, passenger service, RCON call, or world mutation.'],
};
const manifestPath = path.join(OUT, 'publication-manifest.json');
const content = `${JSON.stringify(publication, null, 2)}\n`;
if (fs.existsSync(manifestPath)) fail(fs.readFileSync(manifestPath, 'utf8') === content, 'manifest drift; create a new dated volume');
else fs.writeFileSync(manifestPath, content, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ status: publication.status, output: path.relative(SITE_ROOT, OUT), publicEndpointCount: publicEndpoints.length, mutationAuthority: false }, null, 2)}\n`);
