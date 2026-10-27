#!/usr/bin/env node
/**
 * Independent immutable-post QA for the MP02 B08 / R07C retained-air handoff.
 *
 * This intentionally does not reuse the release compiler's acceptance result.
 * It re-derives the 719 operated floor cells, the ten R07C cells deliberately
 * left unpaved, the 125-station normal-walk route, and the 6 x 3 contact
 * landing from the persisted operation, interface operation, and geometry.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const postRoot = option('--post', 'data/worldsnap-mp02-b08-r07c-handoff-post-20260826T120820Z');
const sourceRoot = option('--source', 'data/worldsnap-mp02-b08-r07c-handoff-source-20260826T120613Z');
const forwardPath = option('--forward', 'data/buildops/mp02-subtropolis-b08-service-spine-01-r07c-ramp-handoff-live-20260826T120613Z.forward.txt');
const r07cOpeningPath = option('--r07c-openings', 'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.b08-route-openings.forward.txt');
const manifestPath = option('--manifest', 'data/buildops/mp02-subtropolis-b08-service-spine-01-r07c-ramp-handoff-live-20260826T120613Z.release-manifest.json');
const outJson = option('--out-json', 'data/world-review/mp02-b08-r07c-handoff-live-20260826T120613Z/independent-r07c-handoff-post-qa.json');
const outMd = option('--out-md', 'data/world-review/mp02-b08-r07c-handoff-live-20260826T120613Z/independent-r07c-handoff-post-qa.md');
const absolute = (filename) => path.resolve(ROOT, filename);
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(nameOf(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

const replCells = (filename) => {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.trim().split(/\s+/);
    must(fields[0] === 'REPL' && fields.length === 9, `unsupported operation line in ${filename}: ${raw}`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    must([x1, y1, z1, x2, y2, z2].every(Number.isInteger), `non-integer operation coordinate: ${raw}`);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          records.push({ point: { x, y, z }, source: fields[7], desired: fields[8] });
        }
      }
    }
  }
  const keys = new Set(records.map(({ point }) => cellKey(point)));
  must(keys.size === records.length, `duplicate operation target in ${filename}`);
  return records;
};

for (const root of [sourceRoot, postRoot]) {
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    must(fs.existsSync(path.join(absolute(root), member)), `${root} is not a complete captured save: missing ${member}`);
  }
}
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const geometry = JSON.parse(fs.readFileSync(absolute('docs/masterplans/05-combined-zones/phase1-connector-geometry.json'), 'utf8'));
const forward = replCells(forwardPath);
const forwardByKey = new Map(forward.map((record) => [cellKey(record.point), record]));
const r07cOpenings = replCells(r07cOpeningPath);
const r07cKeys = new Set(r07cOpenings.map(({ point }) => cellKey(point)));

/* Rebuild the candidate floor set exactly as the release design defines it. */
const selected = geometry.serviceTunnelCenterline.centerline.points.filter(({ index }) => index >= 0 && index <= 121);
must(selected.length === 122, `geometry supplied ${selected.length}, expected 122 B08 centreline stations`);
const candidateFloors = uniqueCells(selected.flatMap((point) => point.orientations.flatMap((orientation) =>
  Array.from({ length: 6 }, (_, lateral) => orientation === 'x'
    ? { x: point.x, y: point.y - 1, z: point.z + lateral - 2 }
    : { x: point.x + lateral - 2, y: point.y - 1, z: point.z }))));
must(candidateFloors.length === 729, `candidate floor derivation drifted: ${candidateFloors.length}`);
const retained = candidateFloors.filter((point) => r07cKeys.has(cellKey(point)));
const retainedKeys = new Set(retained.map(cellKey));
const expectedTargets = candidateFloors.filter((point) => !retainedKeys.has(cellKey(point)));
const expectedTargetKeys = new Set(expectedTargets.map(cellKey));

const sourceReader = new AnvilReader(path.join(absolute(sourceRoot), 'region'));
const postReader = new AnvilReader(path.join(absolute(postRoot), 'region'));
const stateAt = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const compareCells = async (cells) => {
  const failures = [];
  for (const point of cells) {
    const [source, post] = await Promise.all([stateAt(sourceReader, point), stateAt(postReader, point)]);
    if (source !== post) failures.push({ point, source, post });
  }
  return failures;
};

const targetDerivationFailures = [];
if (forward.length !== 719) targetDerivationFailures.push({ reason: 'forward_count', expected: 719, actual: forward.length });
if (expectedTargets.length !== 719) targetDerivationFailures.push({ reason: 'derived_target_count', expected: 719, actual: expectedTargets.length });
for (const point of expectedTargets) {
  const operation = forwardByKey.get(cellKey(point));
  if (!operation || operation.source !== 'minecraft:air' || operation.desired !== 'minecraft:smooth_stone') {
    targetDerivationFailures.push({ reason: 'missing_or_wrong_forward_operation', point, operation: operation ?? null });
  }
}
for (const operation of forward) {
  if (!expectedTargetKeys.has(cellKey(operation.point))) targetDerivationFailures.push({ reason: 'unexpected_forward_target', point: operation.point });
}
const targetStateFailures = [];
for (const operation of forward) {
  const [source, post] = await Promise.all([stateAt(sourceReader, operation.point), stateAt(postReader, operation.point)]);
  if (source !== operation.source || post !== operation.desired) targetStateFailures.push({ point: operation.point, expectedSource: operation.source, source, expectedPost: operation.desired, post });
}

const retainedStateFailures = [];
if (retained.length !== 10) retainedStateFailures.push({ reason: 'retained_count', expected: 10, actual: retained.length });
for (const point of retained) {
  const [source, post] = await Promise.all([stateAt(sourceReader, point), stateAt(postReader, point)]);
  if (!isAir(source) || !isAir(post) || source !== post || forwardByKey.has(cellKey(point))) {
    retainedStateFailures.push({ point, source, post, operated: forwardByKey.has(cellKey(point)) });
  }
}

const retainedRampRoute = [
  { x: 1947, y: 72, z: -628 }, { x: 1948, y: 72, z: -628 }, { x: 1949, y: 73, z: -628 },
  { x: 1950, y: 73, z: -628 }, { x: 1950, y: 73, z: -629 }, { x: 1951, y: 74, z: -629 },
  { x: 1951, y: 75, z: -628 },
];
const route = [...retainedRampRoute, ...selected.filter(({ index }) => index >= 4).map(({ x, y, z }) => ({ x, y, z }))];
const routeFailures = [];
if (route.length !== 125) routeFailures.push({ reason: 'station_count', expected: 125, actual: route.length });
for (let index = 0; index < route.length; index += 1) {
  const point = route[index];
  const [floor, feet, head] = await Promise.all([
    stateAt(postReader, { x: point.x, y: point.y - 1, z: point.z }), stateAt(postReader, point), stateAt(postReader, { x: point.x, y: point.y + 1, z: point.z }),
  ]);
  if (isAir(floor) || isFluid(floor) || !isAir(feet) || !isAir(head)) routeFailures.push({ reason: 'station_clearance', index, point, floor, feet, head });
  if (index > 0) {
    const prior = route[index - 1];
    const horizontal = Math.abs(point.x - prior.x) + Math.abs(point.z - prior.z);
    const rise = Math.abs(point.y - prior.y);
    if (horizontal !== 1 || rise > 1) routeFailures.push({ reason: 'non_cardinal_or_jump_transition', index, prior, point, horizontal, rise });
  }
}

const landingCells = [];
for (let x = 2006; x <= 2011; x += 1) for (let z = -689; z <= -687; z += 1) landingCells.push({ x, y: 129, z });
const landingFailures = [];
for (const point of landingCells) {
  const state = await stateAt(postReader, point);
  if (state !== 'minecraft:smooth_stone') landingFailures.push({ point, expected: 'minecraft:smooth_stone', state });
}

const protectedBounds = manifest.ownership.b03B09Exclusion;
const protectedCells = [];
for (let x = protectedBounds.minX; x <= protectedBounds.maxX; x += 1) {
  for (let y = protectedBounds.minY; y <= protectedBounds.maxY; y += 1) {
    for (let z = protectedBounds.minZ; z <= protectedBounds.maxZ; z += 1) protectedCells.push({ x, y, z });
  }
}
const protectedTargetTouches = forward.filter(({ point }) => point.x >= protectedBounds.minX && point.x <= protectedBounds.maxX
  && point.y >= protectedBounds.minY && point.y <= protectedBounds.maxY && point.z >= protectedBounds.minZ && point.z <= protectedBounds.maxZ);
const protectedSourcePostDrift = await compareCells(protectedCells);
const westAperture = [];
for (let y = 72; y <= 75; y += 1) for (let z = -630; z <= -625; z += 1) westAperture.push({ x: 1947, y, z });
const westApertureFailures = [];
for (const point of westAperture) {
  const [source, post] = await Promise.all([stateAt(sourceReader, point), stateAt(postReader, point)]);
  if (!isAir(source) || !isAir(post) || source !== post) westApertureFailures.push({ point, source, post });
}

const checks = {
  completeImmutableSourceAndPost: true,
  exact719SmoothStoneTargets: targetDerivationFailures.length === 0 && targetStateFailures.length === 0,
  retained10R07cOpeningsAirAndUnaltered: retainedStateFailures.length === 0,
  retainedWestApertureAirAndUnaltered: westApertureFailures.length === 0,
  downstreamProtectedScopeUntouched: protectedTargetTouches.length === 0 && protectedSourcePostDrift.length === 0,
  normalWalk125StationCardinalRoute: routeFailures.length === 0,
  sixByThreeContactLanding: landingCells.length === 18 && landingFailures.length === 0,
};
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([check]) => check);
const report = {
  schemaVersion: 1,
  id: 'mp02-b08-r07c-handoff-independent-post-qa',
  status: failures.length ? 'FAIL' : 'PASS',
  readOnly: true,
  liveQuery: { performed: false, reason: 'immutable post-capture is the release-binding state supplied for this independent QA' },
  bindings: {
    sourceRoot, postRoot, forwardPath, forwardSha256: hash(fs.readFileSync(absolute(forwardPath))),
    r07cOpeningPath, r07cOpeningSha256: hash(fs.readFileSync(absolute(r07cOpeningPath))),
    manifestPath, manifestIdentity: manifest.manifestIdentity,
    geometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
    geometrySha256: hash(fs.readFileSync(absolute('docs/masterplans/05-combined-zones/phase1-connector-geometry.json'))),
    sourceCaptureManifestSha256: hash(fs.readFileSync(path.join(absolute(sourceRoot), 'combined-zones-complete-save-capture.json'))),
    postCaptureManifestSha256: hash(fs.readFileSync(path.join(absolute(postRoot), 'combined-zones-complete-save-capture.json'))),
  },
  targetVerification: { expected: 719, derived: expectedTargets.length, operationRecords: forward.length, targetDerivationFailures, targetStateFailures },
  retainedR07cOpenings: { expected: 10, derived: retained.length, cells: retained, stateFailures: retainedStateFailures },
  westAperture: { expected: 24, stateFailures: westApertureFailures },
  downstreamProtectedScope: { bounds: protectedBounds, cellsCompared: protectedCells.length, operationTargetTouches: protectedTargetTouches, sourcePostDrift: protectedSourcePostDrift },
  route: { standard: 'normal walking only; no jump/sprint/dig/swim/climb', stationCount: route.length, start: route[0], end: route.at(-1), routeFailures },
  contactLanding: { dimensions: { width: 6, depth: 3, floorY: 129 }, cellCount: landingCells.length, cells: landingCells, failures: landingFailures },
  checks,
  failures,
};
fs.mkdirSync(path.dirname(absolute(outJson)), { recursive: true });
fs.writeFileSync(absolute(outJson), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# MP02 B08 / R07C Handoff Independent Post QA\n\nStatus: **${report.status}**\n\n- Exact operated targets: ${forward.length}/719 smooth-stone states verified.\n- Retained R07C interface cells: ${retained.length}/10 air and source/post unaltered.\n- West aperture: ${westAperture.length}/24 air and source/post unaltered.\n- Protected B03/B09 exclusion: ${protectedCells.length} cells compared; ${protectedTargetTouches.length} operation touches and ${protectedSourcePostDrift.length} source/post drift.\n- Normal-walk route: ${route.length}/125 cardinal stations verified.\n- Contact landing: ${landingCells.length}/18 smooth-stone floor cells verified (6 x 3).\n\nThe report is immutable-snapshot evidence only; it performs no RCON or world mutation.\n\nJSON evidence: \`${outJson}\`\n`;
fs.writeFileSync(absolute(outMd), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, checks, failures, outJson, outMd }, null, 2)}\n`);
process.exitCode = failures.length ? 1 : 0;
