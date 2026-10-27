#!/usr/bin/env node
/**
 * Independent immutable-post QA for MP07 full circulation.
 *
 * It does not import the compiler.  It proves the released three-cell state,
 * each of the 48 forward and 48 reverse prescribed normal-walk paths, and
 * the complete zero-below-three-wide width condition on the persisted post
 * snapshot.  It never contacts the live world or RCON.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const POST = option('--post');
const MANIFEST = option('--manifest');
const ROUTE_SURVEY = option('--route-survey');
const OUT_JSON = option('--out-json');
const OUT_MD = option('--out-md');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const must = (condition, message) => {
  if (!condition) throw new Error(`MP07 full-circulation independent QA rejected: ${message}`);
};
const key = (point) => point.join(',');
const stateName = (state) => String(state).split('[', 1)[0];

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID_OR_DEADLY = new Set([
  'minecraft:water', 'minecraft:bubble_column', 'minecraft:lava',
  'minecraft:fire', 'minecraft:soul_fire', 'minecraft:cactus',
  'minecraft:magma_block', 'minecraft:sweet_berry_bush', 'minecraft:powder_snow',
  'minecraft:wither_rose',
]);
const PASSABLE_EXACT = new Set([
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:snow',
  'minecraft:tripwire', 'minecraft:redstone_wire', 'minecraft:light',
]);
const PASSABLE_SUFFIXES = [
  '_flower', '_sapling', '_torch', '_wall_torch', '_sign', '_wall_sign',
  '_hanging_sign', '_wall_hanging_sign', '_banner', '_wall_banner', '_button',
  '_pressure_plate', '_rail', '_carpet',
];

function parseProperties(state) {
  const value = String(state ?? '');
  const start = value.indexOf('[');
  if (start < 0 || !value.endsWith(']')) return {};
  return Object.fromEntries(value.slice(start + 1, -1).split(',').filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf('=');
      return separator < 0 ? [entry, ''] : [entry.slice(0, separator), entry.slice(separator + 1)];
    }));
}

function isPassable(state) {
  const name = stateName(state);
  const properties = parseProperties(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name)) return true;
  if (FLUID_OR_DEADLY.has(name)) return false;
  if (PASSABLE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) return properties.open === 'true';
  if (name.endsWith('_trapdoor')) return properties.open === 'true';
  return false;
}

function isSafeFooting(state) {
  const name = stateName(state);
  if (AIR.has(name) || FLUID_OR_DEADLY.has(name) || isPassable(state)) return false;
  return !['_fence', '_wall', '_pane', '_leaves', '_chain', '_lantern']
    .some((suffix) => name.endsWith(suffix));
}

class PostSnapshot {
  constructor(directory) {
    this.reader = new AnvilReader(directory);
    this.states = new Map();
    this.standableStates = new Map();
  }

  async block(point) {
    const pointKey = key(point);
    if (!this.states.has(pointKey)) {
      this.states.set(pointKey, stateToCommandString(await this.reader.blockState(...point)));
    }
    return this.states.get(pointKey);
  }

  async standable(point) {
    const pointKey = key(point);
    if (!this.standableStates.has(pointKey)) {
      const [feet, head, support] = await Promise.all([
        this.block(point), this.block([point[0], point[1] + 1, point[2]]),
        this.block([point[0], point[1] - 1, point[2]]),
      ]);
      this.standableStates.set(pointKey,
        isPassable(feet) && isPassable(head) && isSafeFooting(support));
    }
    return this.standableStates.get(pointKey);
  }
}

function parseForwardOperations(filename) {
  const output = [];
  for (const raw of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const columns = raw.split(/\s+/);
    must(columns[0] === 'REPL' && columns.length === 9, `unsupported operation line: ${raw}`);
    const points = columns.slice(1, 7).map(Number);
    must(points.every(Number.isInteger) && points.slice(0, 3).every((value, index) => value === points[index + 3]),
      `operation is not an exact single cell: ${raw}`);
    output.push({ point: points.slice(0, 3), from: columns[7], to: columns[8] });
  }
  must(new Set(output.map(({ point }) => key(point))).size === output.length,
    'forward operation has duplicate points');
  return output;
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return sha256(body);
}

async function exactPathAudit(snapshot, segments, direction) {
  const results = [];
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    const failures = [];
    if (!segment?.passed || !Array.isArray(segment.exactPath) || segment.exactPath.length === 0) {
      failures.push({ reason: 'UNACCEPTED_OR_EMPTY_EXACT_PATH' });
    } else {
      for (let index = 0; index < segment.exactPath.length; index += 1) {
        const point = segment.exactPath[index];
        if (!await snapshot.standable(point)) failures.push({ reason: 'NOT_NORMAL_WALK_STANDABLE', index, point });
        if (index > 0) {
          const previous = segment.exactPath[index - 1];
          const cardinalDistance = Math.abs(point[0] - previous[0]) + Math.abs(point[2] - previous[2]);
          const verticalStep = Math.abs(point[1] - previous[1]);
          if (cardinalDistance !== 1 || verticalStep > 1) {
            failures.push({ reason: 'NON_CARDINAL_OR_TOO_HIGH_STEP', index, previous, point, cardinalDistance, verticalStep });
          }
        }
      }
      if (key(segment.exactPath[0]) !== key(segment.start) || key(segment.exactPath.at(-1)) !== key(segment.goal)) {
        failures.push({ reason: 'EXACT_PATH_ENDPOINT_MISMATCH', start: segment.start, goal: segment.goal });
      }
    }
    results.push({ direction, segmentIndex, start: segment?.start ?? null, goal: segment?.goal ?? null, passed: failures.length === 0, failures });
  }
  return results;
}

async function widthAudit(snapshot, exactPath) {
  const rows = [];
  for (let index = 0; index < exactPath.length; index += 1) {
    const point = exactPath[index];
    const previous = exactPath[Math.max(0, index - 1)];
    const next = exactPath[Math.min(exactPath.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dz = next[2] - previous[2];
    const lateral = Math.abs(dx) >= Math.abs(dz) ? [0, 1] : [1, 0];
    let width = 1;
    const probes = [];
    for (const direction of [-1, 1]) {
      let distance = 1;
      while (distance <= 3) {
        const candidates = [0, 1, -1].map((dy) => [
          point[0] + lateral[0] * direction * distance,
          point[1] + dy,
          point[2] + lateral[1] * direction * distance,
        ]);
        let matched = false;
        for (const candidate of candidates) {
          if (await snapshot.standable(candidate)) {
            matched = true;
            break;
          }
        }
        probes.push({ direction, distance, matched });
        if (!matched) break;
        width += 1;
        distance += 1;
      }
    }
    rows.push({ point, lateral, width, probes });
  }
  return {
    rows,
    minimumContiguousStandableWidth: Math.min(...rows.map(({ width }) => width)),
    belowThreeWide: rows.filter(({ width }) => width < 3),
  };
}

async function main() {
  for (const [name, value] of [['--post', POST], ['--manifest', MANIFEST], ['--route-survey', ROUTE_SURVEY], ['--out-json', OUT_JSON], ['--out-md', OUT_MD]]) {
    must(value, `${name} is required`);
  }
  const postRoot = absolute(POST);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    must(fs.existsSync(path.join(postRoot, member)), `post capture missing ${member}`);
  }
  const postCapture = JSON.parse(fs.readFileSync(path.join(postRoot, 'combined-zones-complete-save-capture.json'), 'utf8'));
  must(postCapture.immutableCopy === true, 'post capture is not immutable');
  const manifestPath = absolute(MANIFEST);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  must(manifest.releaseId === 'MP07-RRMSA-FULL-CIRCULATION-01', 'wrong release manifest');
  const routeSurveyPath = absolute(ROUTE_SURVEY);
  const routeSurveyBytes = fs.readFileSync(routeSurveyPath);
  const routeSurvey = JSON.parse(routeSurveyBytes);
  const accepted = routeSurvey.accepted;
  must(manifest.functionalAcceptance.routeSurveySha256 === sha256(routeSurveyBytes),
    'manifest is not bound to this exact route-survey evidence');
  must(accepted?.forwardSegments?.length === 48 && accepted?.reverseSegments?.length === 48,
    'route survey does not have 48/48 path specifications');
  must(Array.isArray(accepted.exactPath) && accepted.exactPath.length === 534,
    'route survey exact path is not the accepted 534 cells');
  must(sha256(JSON.stringify(accepted.exactPath)) === accepted.exactPathSha256,
    'route survey exact path hash drifted');
  const forwardPath = absolute(manifest.operations.forward.path);
  must(operationBodySha256(forwardPath) === manifest.operations.forward.sha256,
    'forward operation body SHA-256 does not match manifest');
  const operations = parseForwardOperations(forwardPath);
  must(operations.length === 3, `forward operation count is ${operations.length}, expected 3`);
  const snapshot = new PostSnapshot(path.join(postRoot, 'region'));
  const targetFailures = [];
  for (const operation of operations) {
    const actual = await snapshot.block(operation.point);
    if (actual !== operation.to) targetFailures.push({ point: operation.point, expected: operation.to, actual });
  }
  const [forward, reverse, width] = await Promise.all([
    exactPathAudit(snapshot, accepted.forwardSegments, 'forward'),
    exactPathAudit(snapshot, accepted.reverseSegments, 'reverse'),
    widthAudit(snapshot, accepted.exactPath),
  ]);
  const checks = {
    immutablePostCapture: true,
    exactThreeReleaseTargetsAtDesiredState: targetFailures.length === 0,
    all48ForwardExactNormalWalkPaths: forward.every(({ passed }) => passed),
    all48ReverseExactNormalWalkPaths: reverse.every(({ passed }) => passed),
    zeroBelowThreeWideCrossSections: width.belowThreeWide.length === 0,
    retainedRequiredRouteIdentity: accepted.exactPathSha256 === manifest.functionalAcceptance.sourceRouteIdentity,
  };
  const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  const report = {
    schemaVersion: 1,
    id: 'mp07-rrmsa-full-circulation-independent-post-qa',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    readOnly: true,
    liveWorldRead: false,
    worldMutated: false,
    rconCalled: false,
    bindings: {
      post: relative(POST),
      postCaptureManifestSha256: sha256(fs.readFileSync(path.join(postRoot, 'combined-zones-complete-save-capture.json'))),
      manifest: relative(MANIFEST),
      manifestSha256: sha256(manifestBytes),
      manifestIdentity: manifest.manifestIdentity,
      routeSurvey: relative(ROUTE_SURVEY),
      routeSurveySha256: sha256(routeSurveyBytes),
      forwardOperation: manifest.operations.forward.path,
      forwardOperationSha256: sha256(fs.readFileSync(forwardPath)),
    },
    targetVerification: { expected: 3, actual: operations.length, failures: targetFailures },
    route: { exactPathCellCount: accepted.exactPath.length, exactPathSha256: accepted.exactPathSha256, forward, reverse },
    width,
    checks,
    failures,
  };
  fs.mkdirSync(path.dirname(absolute(OUT_JSON)), { recursive: true });
  fs.writeFileSync(absolute(OUT_JSON), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(absolute(OUT_MD), `# MP07 full-circulation independent post QA\n\nStatus: **${report.status}**\n\n- Three release targets at exact desired state: ${checks.exactThreeReleaseTargetsAtDesiredState}.\n- Exact normal-walk routes: ${forward.filter(({ passed }) => passed).length}/48 forward and ${reverse.filter(({ passed }) => passed).length}/48 reverse.\n- Minimum contiguous standable width: ${width.minimumContiguousStandableWidth}; below-three-wide rows: ${width.belowThreeWide.length}.\n\nThis report reads only the immutable post snapshot; it makes no live-world or RCON call.\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, checks, failures, outJson: relative(OUT_JSON), outMd: relative(OUT_MD) }, null, 2)}\n`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

await main();
