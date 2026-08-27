#!/usr/bin/env node
/**
 * Read-only MP01 service-staging manual-support candidate survey.
 *
 * This is deliberately a source-bound design screen.  It writes no guarded
 * operation, talks to no live service, and cannot authorize a release.  The
 * candidate is inside an already accepted room; it does not create access to
 * Cheyenne, open either existing door, or commission a utility system.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0 || !args[index + 1]) throw new Error(`${flag} is required`);
  return args[index + 1];
};
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const snapshot = value('--snapshot');
const out = value('--out');
const markdown = value('--markdown');
const absolute = (relative) => path.join(ROOT, relative);
const read = (relative) => fs.readFileSync(absolute(relative));
const stateManifest = 'data/buildops/mp01-service-staging-room-01.release-manifest.json';
const ledger = 'data/world-review/mp01-service-staging-room-01-live-20260826T051000Z/evidence-ledger.json';
const EXPECTED_MANIFEST_SHA256 = 'a7340d9c229b0f7718f61396af5dc631893e2732e9cd815a2b6f2cf359150be8';
const EXPECTED_REGION_SHA256 = 'da133c0e0a61a3808f2de5bdf3c90c156b83fff873d1b660d4b11380737c18ef';

function box(minX, maxX, minY, maxY, minZ, maxZ) {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
}
function regionHash(regionDirectory) {
  const hash = crypto.createHash('sha256');
  for (const filename of fs.readdirSync(regionDirectory).filter((name) => name.endsWith('.mca')).sort()) {
    hash.update(filename); hash.update('\0'); hash.update(fs.readFileSync(path.join(regionDirectory, filename))); hash.update('\0');
  }
  return hash.digest('hex');
}
function gravity(state) {
  return /minecraft:(sand|red_sand|gravel|anvil|chipped_anvil|damaged_anvil|suspicious_sand|suspicious_gravel|concrete_powder)/.test(state);
}

const manifestBytes = read(stateManifest);
if (sha256(manifestBytes) !== EXPECTED_MANIFEST_SHA256) throw new Error('accepted service-staging manifest identity drift');
const acceptedManifest = JSON.parse(manifestBytes.toString('utf8'));
const acceptedLedger = JSON.parse(read(ledger));
if (acceptedLedger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  || acceptedLedger.manifest?.sha256 !== EXPECTED_MANIFEST_SHA256) {
  throw new Error('accepted service-staging release ledger does not bind its exact manifest');
}
if (acceptedManifest.target?.operatedUnion?.cellCount !== 1677) throw new Error('unexpected service-staging owner scope');

const regionDirectory = absolute(path.join(snapshot, 'region'));
const currentRegionSha256 = regionHash(regionDirectory);
if (currentRegionSha256 !== EXPECTED_REGION_SHA256) throw new Error(`snapshot region identity drift: ${currentRegionSha256}`);
const reader = new AnvilReader(regionDirectory);
const capture = async (cells) => Promise.all(cells.map(async ({ x, y, z }) => ({
  x, y, z, state: stateToCommandString(await reader.blockState(x, y, z)),
})));
const exact = (cells, expected, label) => {
  const bad = cells.filter(({ state }) => state !== expected);
  if (bad.length) throw new Error(`${label} drift: ${JSON.stringify(bad)}`);
};

// The two proposed positions remain clear of the room's three accepted staging
// plinths at x=1996..1998, z=-904/-900/-896.
const targets = await capture([{ x: 2000, y: 165, z: -900 }, { x: 2001, y: 165, z: -900 }]);
const supports = await capture([{ x: 2000, y: 164, z: -900 }, { x: 2001, y: 164, z: -900 }]);
const headroom = await capture(box(2000, 2001, 166, 167, -900, -900));
const approach = await capture(box(1999, 2002, 165, 167, -899, -895));
exact(targets, 'minecraft:air', 'candidate targets');
exact(supports, 'minecraft:polished_andesite', 'candidate floor supports');
exact(headroom, 'minecraft:air', 'candidate two-block headroom');
exact(approach, 'minecraft:air', 'candidate preserved four-wide approach');

const localEnvelope = await capture(box(1998, 2003, 164, 173, -902, -898));
const fluidCells = localEnvelope.filter(({ state }) => /water|lava/.test(state));
const gravityCells = localEnvelope.filter(({ state }) => gravity(state));
if (fluidCells.length || gravityCells.length) throw new Error('candidate local envelope has fluid or gravity hazard');

const blockEntities = [];
for (const cx of [124, 125]) {
  const chunk = await reader.chunk(cx, -57);
  for (const entity of chunk?.block_entities ?? []) {
    const x = Number(entity.x); const y = Number(entity.y); const z = Number(entity.z);
    if (x >= 1998 && x <= 2003 && y >= 164 && y <= 173 && z >= -902 && z <= -898) {
      blockEntities.push({ id: entity.id ?? null, x, y, z });
    }
  }
}
if (blockEntities.length) throw new Error(`candidate local envelope has block entities: ${JSON.stringify(blockEntities)}`);

const report = {
  schemaVersion: 1,
  id: 'mp01-service-staging-manual-support-candidate-01',
  status: 'PASS_SOURCE_BOUND_CANDIDATE_ONLY_NOT_COMPILED_OR_AUTHORIZED',
  surveyKind: 'READ_ONLY_EXACT_STATE_OWNERSHIP_AND_NORMAL_WALK_SCREEN',
  source: {
    root: snapshot,
    regionSha256: currentRegionSha256,
    immutablePostReleaseOf: 'MP01-E03-PASSIVE-PLANNING-BAY-01',
    limitation: 'The later SYS03 post save has no Cheyenne region files. It cannot establish MP01 block state; this latest complete MP01 post save is the coordinate authority for this survey only.',
  },
  predecessorOwnership: {
    releaseId: 'MP01-SERVICE-STAGING-ROOM-01',
    manifest: stateManifest,
    manifestSha256: EXPECTED_MANIFEST_SHA256,
    acceptedLedger: ledger,
    acceptedLedgerStatus: acceptedLedger.status,
    exactOwnedRoom: { minX: 1993, maxX: 2007, minY: 164, maxY: 173, minZ: -906, maxZ: -893, cellCount: 1677 },
  },
  candidate: {
    releaseIdReservedForDesignOnly: 'MP01-SERVICE-STAGING-MANUAL-SUPPORT-02',
    purpose: 'Two non-container, manual service-allocation tools inside the accepted restricted service-staging room.',
    proposedTargetStates: [
      { x: 2000, y: 165, z: -900, state: 'minecraft:crafting_table' },
      { x: 2001, y: 165, z: -900, state: 'minecraft:cartography_table' },
    ],
    currentTargets: targets,
    floorSupports: supports,
    headroom,
    preservedApproach: approach,
    hazards: { fluidCells, gravityCells, blockEntities },
    normalWalkContext: {
      acceptedPredecessorRoute: 'MP01-SERVICE-CORRIDOR-01 independently verified a 4-wide chamber aperture, dry corridor, existing closed manual door, and one-step dry threshold into this room.',
      interiorApproach: 'The candidate preserves the four-wide clear approach at x=1999..2002, y=165..167, z=-899..-895.',
      limitation: 'This is internal restricted normal-walk geometry after manual operation of the existing room door; it does not create an exterior/fleet route, open the door, or commission access.',
    },
  },
  explicitRejection: {
    utilityReserveGallery: 'Not selected: its previously accepted capped/closed envelope lacks independently verified continuous normal-walk ingress in the present survey. Do not use ownership alone as an accessibility claim.',
  },
  requiredBeforeAnyRelease: [
    'fresh complete immutable MP01 source immediately before execution',
    'exact forward/rollback compiler and independent source review',
    'fresh block-entity and live-entity clearance',
    'strict parser and source/projected rollback preflights',
    'journaled strict execution, fresh post snapshot, rollback-poststate proof, and independent route/fit-out QA',
  ],
  nonClaims: ['active utility', 'automation', 'container storage', 'access commissioning', 'public access', 'emergency egress', 'MP01 completion'],
  safetyBoundary: { liveCallsPerformed: false, capturesPerformed: false, guardedOperationsEmitted: false, worldEditsPerformed: false },
};
report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
const text = `# MP01 service-staging manual-support candidate 01\n\n**Status:** \`${report.status}\`\n\nThe exact two-cell candidate is inside the already released service-staging room, not the inaccessible reactive-control staging envelope. Its two source-air targets are \`(2000,165,-900)\` and \`(2001,165,-900)\`, with polished-andesite supports, two blocks of headroom, a four-wide clear local approach, and zero fluids, gravity blocks, or block entities in its checked local envelope.\n\nThe existing \`MP01-SERVICE-STAGING-ROOM-01\` ledger binds the containing 1,677-cell room to its exact accepted release manifest. The existing corridor QA proves the restricted internal chamber-to-room route, including its closed manual door and one-step threshold. This survey does not open that door or claim exterior/fleet access.\n\nThe later SYS03 post save has no Cheyenne region files; this source-bound screen therefore uses the latest complete MP01 post save only. It is a design candidate, not an operation package or release authorization.\n`;
fs.mkdirSync(path.dirname(absolute(markdown)), { recursive: true });
fs.writeFileSync(absolute(markdown), text);
console.log(JSON.stringify({ status: report.status, out, markdown, payloadSha256: report.payloadSha256 }, null, 2));
