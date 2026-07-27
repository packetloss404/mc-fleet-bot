#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN_DIR = path.join(
  ROOT,
  'data',
  'exports',
  'box',
  'moot-hall-basement-enhancement-2026-07-26',
);
const OUTPUT = path.join(
  ROOT,
  'data',
  'buildops',
  'moot-hall-basement-enhancement-2026-07-26.txt',
);

const b1 = JSON.parse(fs.readFileSync(path.join(DESIGN_DIR, 'b1-design.json'), 'utf8'));
const b2 = JSON.parse(fs.readFileSync(path.join(DESIGN_DIR, 'b2-design.json'), 'utf8'));
const lines = [
  '# Moot Hall B1/B2 enhancement — generated 2026-07-26',
  '# Source: snapshot-validated B1, B2, and structural four-person review.',
  '# Every block mutation is masked by its expected as-built material.',
  '# Do not replace this file with broad SET operations.',
  '',
];

function comment(text) {
  lines.push('', `# ${text}`);
}

function boxLine(box, expected, replacement) {
  lines.push(`REPL ${box.join(' ')} ${expected} ${replacement}`);
}

function pointLine(point, expected, replacement) {
  boxLine([...point, ...point], expected, replacement);
}

function stateSuffix(state = {}) {
  const entries = Object.entries(state);
  return entries.length
    ? `[${entries.map(([key, value]) => `${key}=${value}`).join(',')}]`
    : '';
}

function placementBlock(placement) {
  if (placement.at[0] === -83 && placement.at[1] === 62 && placement.at[2] === -390) {
    return 'minecraft:barrel[facing=up,open=false]';
  }
  if (placement.at[0] === -83 && placement.at[1] === 62 && placement.at[2] === -389) {
    return 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]';
  }
  if (placement.at[0] === -83 && placement.at[1] === 62 && placement.at[2] === -388) {
    return 'minecraft:lectern[facing=north,has_book=false,powered=false]';
  }
  if (placement.material === 'minecraft:chest') {
    return `minecraft:chest[facing=${placement.state?.facing ?? 'north'},type=single,waterlogged=false]`;
  }
  if (placement.material === 'minecraft:lantern') {
    return `minecraft:lantern[hanging=${placement.state?.hanging ?? 'false'},waterlogged=false]`;
  }
  if (placement.material === 'minecraft:lever') {
    const [x, y, z] = placement.at;
    if (y === 64 && z === -379 && (x === -94 || x === -93)) {
      return 'minecraft:lever[face=ceiling,facing=north,powered=true]';
    }
    return 'minecraft:lever[face=wall,facing=south,powered=true]';
  }
  return `${placement.material}${stateSuffix(placement.state)}`;
}

function signData(point, text) {
  const messages = text
    .map((message) => `'${JSON.stringify({ text: message })}'`)
    .join(',');
  return `CMD data merge block ${point.join(' ')} {front_text:{color:"black",has_glowing_text:1b,messages:[${messages}]}}`;
}

function addSign({ point, block, text }) {
  pointLine(point, 'minecraft:air', block);
  lines.push(signData(point, text));
}

comment('Ground-to-B1 public stairwell — completes the dropped six-rise flight');
boxLine(
  [-86, 67, -379, -84, 67, -378],
  'minecraft:polished_andesite',
  'minecraft:air',
);
for (const [y, z] of [[62, -382], [63, -381], [64, -380], [65, -379]]) {
  boxLine(
    [-86, y, z, -84, y, z],
    'minecraft:air',
    'minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
  );
}
for (const [x, y, z] of [
  [-87, 62, -382], [-83, 62, -382],
  [-87, 63, -381], [-83, 63, -381],
  [-83, 64, -380],
  [-87, 65, -379], [-83, 65, -379],
  [-87, 66, -378], [-83, 66, -378],
]) {
  pointLine(
    [x, y, z],
    'minecraft:air',
    'minecraft:stone_brick_wall',
  );
}
for (const point of [[-87, 67, -383], [-83, 67, -383]]) {
  pointLine(point, 'minecraft:polished_andesite', 'minecraft:sea_lantern');
}
addSign({
  point: [-84, 69, -377],
  block: 'minecraft:birch_wall_sign[facing=west,waterlogged=false]',
  text: ['BASEMENTS', 'PUBLIC STAIR', 'B1 VENUES', 'B2 VENUES'],
});
addSign({
  point: [-86, 64, -388],
  block: 'minecraft:birch_wall_sign[facing=east,waterlogged=false]',
  text: ['PUBLIC STAIR', 'GROUND SOUTH', 'B2 GRAND STAIR', 'EAST'],
});

comment('B1 circulation and room fit-out');
for (const operation of b1.enhancementOperations) {
  lines.push(`# B1 ${operation.id}`);
  if (operation.action === 'fill-masked' || operation.action === 'replace-exact') {
    for (const expected of operation.replaceOnly) {
      boxLine(operation.bounds, expected, operation.with);
    }
  } else if (operation.action === 'replace-points-exact') {
    for (const point of operation.points) {
      pointLine(point, operation.replaceOnly[0], operation.with);
    }
  } else if (operation.action === 'place-points-exact') {
    for (const placement of operation.placements) {
      pointLine(placement.at, placement.replaceOnly[0], placementBlock(placement));
    }
  } else {
    throw new Error(`Unsupported B1 operation: ${operation.action}`);
  }
}

comment('B1 wayfinding signs');
const b1Signs = {
  'foyer-wayfinding': 'minecraft:dark_oak_hanging_sign[attached=false,rotation=8,waterlogged=false]',
  'arcade-sign': 'minecraft:birch_wall_sign[facing=east,waterlogged=false]',
  'bank-sign': 'minecraft:birch_wall_sign[facing=west,waterlogged=false]',
  'it-sign': 'minecraft:dark_oak_hanging_sign[attached=false,rotation=8,waterlogged=false]',
  'vault-sign': 'minecraft:birch_wall_sign[facing=north,waterlogged=false]',
};
for (const sign of b1.signSchedule) {
  if (sign.action === 'preserve') continue;
  addSign({
    point: sign.at,
    block: b1Signs[sign.id],
    text: sign.text,
  });
}

function replaceBoxes(boxes, expected, replacement) {
  for (const box of boxes) boxLine(box, expected, replacement);
}

function replacePoints(points, expected, replacement) {
  for (const point of points) pointLine(point, expected, replacement);
}

function expandTemplateBox(box, z) {
  return box.map((value) => value === '$z' ? z : value);
}

function addDoorPair(operation, z) {
  const doors = operation.doubleDoors;
  for (const x of doors.positionsX) {
    const hinge = doors.hingesByX[String(x)];
    pointLine(
      [x, doors.lowerY, z],
      'minecraft:air',
      `minecraft:dark_oak_door[facing=${doors.facing},half=lower,hinge=${hinge},open=true,powered=false]`,
    );
    pointLine(
      [x, doors.upperY, z],
      'minecraft:air',
      `minecraft:dark_oak_door[facing=${doors.facing},half=upper,hinge=${hinge},open=true,powered=false]`,
    );
  }
}

function addPortalWalls(operation) {
  for (const z of operation.zValues) {
    const expected = operation.expected[0];
    replaceBoxes(
      (operation.sideWingBoxes ?? []).map((box) => expandTemplateBox(box, z)),
      expected,
      operation.wall,
    );
    replaceBoxes(
      operation.columnBoxes.map((box) => expandTemplateBox(box, z)),
      expected,
      operation.wall,
    );
    boxLine(expandTemplateBox(operation.lintelBox, z), expected, operation.wall);
    addDoorPair(operation, z);
  }
}

function addB2Operation(operation) {
  let expected = operation.expected?.[0];
  // The bounded pre-build snapshot is newer than the canonical atlas snapshot
  // used during the initial B2 design. These three cells are air in the live
  // pre-build capture; y62 alone is the polished-andesite head cap.
  if (operation.id === 'secondary-add-rise-6' || operation.id === 'secondary-add-rise-7') {
    expected = 'minecraft:air';
  }
  if (operation.id === 'secondary-clear-rise-6-head') {
    operation = { ...operation, box: [-88, 62, -360, -86, 62, -360] };
  }
  switch (operation.kind) {
    case 'replaceBox':
      boxLine(operation.box, expected, operation.replacement);
      break;
    case 'replaceBoxes':
      replaceBoxes(operation.boxes, expected, operation.replacement);
      break;
    case 'replacePoint':
      pointLine(operation.point, expected, operation.replacement);
      break;
    case 'replacePoints':
      replacePoints(operation.points, expected, operation.replacement);
      break;
    case 'replacePointMap':
      for (const entry of operation.pointMap) {
        pointLine(entry.point, expected, entry.replacement);
      }
      break;
    case 'repeatedPortalWall':
      addPortalWalls(operation);
      break;
    case 'signs':
      for (const sign of operation.signs) {
        const text = sign.point.join(',') === '-98,57,-391'
          ? ['SERVICE SHAFT', 'DEEP ACCESS ONLY', 'PUBLIC STAIRS', 'SOUTH / EAST']
          : sign.frontText;
        addSign({
          point: sign.point,
          block: sign.block,
          text,
        });
      }
      break;
    default:
      throw new Error(`Unsupported B2 operation: ${operation.kind}`);
  }
}

for (const phase of b2.plannedEdits) {
  comment(`B2 ${phase.phase}`);
  for (const operation of phase.operations) {
    lines.push(`# B2 ${operation.id}`);
    addB2Operation(operation);
  }
}

comment('Cosmetic liner normalization identified by the structural audit');
boxLine(
  [-85, 66, -342, -70, 66, -341],
  'minecraft:dirt',
  'minecraft:stone_bricks',
);

lines.push('');
fs.writeFileSync(OUTPUT, `${lines.join('\n')}\n`);
console.log(`wrote ${OUTPUT}`);
console.log(`${lines.filter((line) => line.startsWith('REPL ')).length} guarded block operations`);
console.log(`${lines.filter((line) => line.startsWith('CMD ')).length} block-entity data operations`);
