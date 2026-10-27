#!/usr/bin/env node
/**
 * Read-only structural survey for the historical MP01 B04 hold.
 *
 * B04 was previously described by four white-concrete cells at the north face
 * of the middle Row-D shell.  This survey proves their actual present role:
 * they are not a vacant bay pad; they are part of the 20-cell north partition
 * separating the shared inter-row lane from the already fitted D02 bay.
 *
 * It intentionally emits no guarded operation, inverse, or live-world call.
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
const snapshot = value('--snapshot');
const output = value('--out');
const markdown = args.includes('--markdown') ? value('--markdown') : null;
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));

const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const cell = async (x, y, z) => ({ x, y, z, state: await state(x, y, z) });
const cells = async (coordinates) => Promise.all(coordinates.map(({ x, y, z }) => cell(x, y, z)));
const box = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const result = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) result.push({ x, y, z });
    }
  }
  return result;
};
const requireState = (captured, expected, label) => {
  const mismatches = captured.filter(({ state: actual }) => actual !== expected);
  if (mismatches.length) throw new Error(`${label} drift: ${JSON.stringify(mismatches)}`);
};
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const openingCells = await cells(box(2021, 2022, 168, 169, -845, -845));
const fullPartition = await cells(box(2019, 2022, 168, 172, -845, -845));
const floor = await cells(box(2018, 2023, 167, 167, -845, -845));
const roof = await cells(box(2018, 2023, 173, 173, -845, -845));
const laneSide = await cells(box(2021, 2022, 168, 169, -846, -846));
const d02Equipment = await cells([
  { x: 2021, y: 168, z: -844 },
  { x: 2022, y: 168, z: -844 },
]);
const d02Headroom = await cells(box(2021, 2022, 169, 172, -844, -844));
const existingDoor = await cells([
  { x: 2023, y: 168, z: -842 },
  { x: 2023, y: 169, z: -842 },
]);
const localEnvelope = await cells(box(2017, 2024, 167, 173, -846, -839));
const waterCells = localEnvelope.filter(({ state: actual }) => actual.includes('water'));

requireState(openingCells, 'minecraft:white_concrete', 'B04 proposed opening cells');
requireState(fullPartition, 'minecraft:white_concrete', 'Row-D north partition');
requireState(floor, 'minecraft:light_gray_concrete', 'Row-D support stratum');
requireState(roof, 'minecraft:white_concrete', 'Row-D roof closure');
requireState(laneSide, 'minecraft:air', 'inter-row lane side');
requireState(d02Equipment.slice(0, 1), 'minecraft:smithing_table', 'D02 adjacent equipment');
requireState(d02Equipment.slice(1), 'minecraft:stonecutter[facing=north]', 'D02 adjacent equipment');
requireState(d02Headroom, 'minecraft:air', 'D02 headroom');
requireState(existingDoor.slice(0, 1), 'minecraft:iron_door[facing=east,half=lower,hinge=left,open=false,powered=false]', 'D02 existing door lower half');
requireState(existingDoor.slice(1), 'minecraft:iron_door[facing=east,half=upper,hinge=left,open=false,powered=false]', 'D02 existing door upper half');
if (waterCells.length) throw new Error(`B04 local structural envelope contains water: ${JSON.stringify(waterCells)}`);

const rowDForward = 'data/buildops/mp01-cheyenne-chamber-array-row-d-01.row-d.forward.txt';
const d02Forward = 'data/buildops/mp01-d02-passive-fabrication-bay-01.forward.txt';
const rowDText = read(rowDForward);
const d02Text = read(d02Forward);
const requiredRowDLine = 'REPL 2019 168 -845 2022 172 -845 minecraft:air minecraft:white_concrete';
const requiredD02Lines = [
  'REPL 2021 168 -844 2021 168 -844 minecraft:air minecraft:smithing_table',
  'REPL 2022 168 -844 2022 168 -844 minecraft:air minecraft:stonecutter[facing=north]',
];
if (!rowDText.includes(requiredRowDLine)) throw new Error('Row-D ownership provenance missing north partition operation');
for (const line of requiredD02Lines) {
  if (!d02Text.includes(line)) throw new Error(`D02 fit-out provenance missing: ${line}`);
}

const report = {
  status: 'HOLD_MP01_B04_OWNED_STRUCTURAL_PARTITION_NO_RELEASE_CANDIDATE',
  surveyKind: 'READ_ONLY_STRUCTURAL_ENGINEERING_SURVEY',
  snapshot: {
    root: snapshot,
    completeSaveSha256: 'dc4ec6a2ff28ad5b1f3ab54dd685eac1d86c98f1b7c17196d30526a52a83d4bb',
    regionSha256: 'da133c0e0a61a3808f2de5bdf3c90c156b83fff873d1b660d4b11380737c18ef',
    completeSaveIntake: 'data/world-review/mp01-e03-passive-planning-bay-01-live-20260826T100000Z/post-complete-save-intake.json',
    immutablePostReleaseOf: 'MP01-E03-PASSIVE-PLANNING-BAY-01',
  },
  requestedHistoricalCells: openingCells,
  structuralContext: {
    fullOwnedPartition: {
      cells: fullPartition,
      cellCount: fullPartition.length,
      provenance: {
        releaseId: 'MP01-CHEYENNE-CHAMBER-ARRAY-ROW-D-01',
        acceptedLedger: 'data/world-review/mp01-cheyenne-chamber-array-row-d-live-20260826T040000Z/evidence-ledger.json',
        operation: rowDForward,
        exactForwardLine: requiredRowDLine,
      },
    },
    supportStratum: floor,
    roofClosure: roof,
    southSideSharedInterRowLane: laneSide,
    northSideExistingD02Interior: {
      equipment: d02Equipment,
      headroom: d02Headroom,
      provenance: {
        releaseId: 'MP01-D02-PASSIVE-FABRICATION-BAY-01',
        acceptedLedger: 'data/world-review/mp01-d02-passive-fabrication-bay-01-live-20260826T090000Z/evidence-ledger.json',
        operation: d02Forward,
        exactForwardLines: requiredD02Lines,
      },
    },
    existingControlledD02Door: existingDoor,
    localEnvelopeWaterCells: waterCells,
  },
  releaseCandidateAssessment: {
    dry: true,
    boundedPhysicalCellSet: true,
    independentOwnedScope: false,
    containerAndBlockEntitySafe: 'NOT_SUFFICIENT_TO_ASSESS_FOR_RELEASE: the proposal already fails accepted-structure ownership; no operation envelope was authorized.',
    liveEntityClearance: 'NOT_RUN: no valid target operation exists.',
    exactInverse: 'A four-cell white-concrete-to-air inverse is mechanically expressible but is not an authorized or safe release because it would breach an accepted Row-D partition.',
    routePurpose: false,
    routeReason: 'D02 already has a separately controlled closed manual door at x=2023, y=168..169, z=-842. The B04 cells would add an uncontrolled second opening from the inter-row lane directly into the fitted D02 interior.',
    result: 'REJECTED_NO_COMPILER_NO_CAPTURE_NO_WORLD_MUTATION',
  },
  exactHold: [
    'The four historical B04 cells are a subset of the accepted 20-cell Row-D north partition, not an unused alcove.',
    'Their south face is the shared inter-row lane; their north face reaches the already accepted D02 fabrication interior, including its smithing table and stonecutter.',
    'Removing them would alter both a Row-D structural boundary and D02 access control without a new owned functional programme, interface contract, or route need.',
    'The local envelope is dry, but dryness cannot cure an ownership, structural-boundary, and access-control failure.',
  ],
  nonClaims: ['B04 release', 'new bay', 'new access route', 'D02 door bypass', 'MP01 completion'],
  safetyBoundary: { liveCallsPerformed: false, capturesPerformed: false, worldEditsPerformed: false, compilerEmitted: false },
};
report.payloadSha256 = sha256(JSON.stringify(report));

const absoluteOutput = path.join(ROOT, output);
fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
fs.writeFileSync(absoluteOutput, `${JSON.stringify(report, null, 2)}\n`);
if (markdown) {
  const md = `# MP01 B04 structural hold survey\n\n**Result:** \`HOLD_MP01_B04_OWNED_STRUCTURAL_PARTITION_NO_RELEASE_CANDIDATE\`\n\nThis read-only survey uses the newest complete MP01 source, \`${snapshot}\` (complete-save SHA-256 \`${report.snapshot.completeSaveSha256}\`). It issues no operation package, capture, or world mutation.\n\nThe historical B04 cells \`x=2021..2022, y=168..169, z=-845\` are all \`minecraft:white_concrete\`. They are four cells within the accepted 20-cell Row-D north partition, not an empty bay. The partition is owned by \`MP01-CHEYENNE-CHAMBER-ARRAY-ROW-D-01\` and directly separates the shared inter-row lane at \`z=-846\` from the D02 interior at \`z=-844\`.\n\nD02 already contains its accepted manual smithing/stonecutting fit-out at \`(2021,168,-844)\` and \`(2022,168,-844)\`, plus an existing closed manual door at \`(2023,168..169,-842)\`. A B04 carve would therefore be an unowned second opening into D02 rather than a controlled circulation or support improvement.\n\nThe 448-cell local envelope is dry, but there is no independent owner-safe scope, no route purpose, and no authorized access-control redesign. Hold B04 exactly as structural fabric.\n`;
  const absoluteMarkdown = path.join(ROOT, markdown);
  fs.mkdirSync(path.dirname(absoluteMarkdown), { recursive: true });
  fs.writeFileSync(absoluteMarkdown, md);
}
console.log(JSON.stringify({ status: report.status, output, markdown, payloadSha256: report.payloadSha256 }, null, 2));
