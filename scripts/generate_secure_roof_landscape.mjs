#!/usr/bin/env node
/**
 * Hide the two exposed reinforced-deepslate security roofs beneath a guarded
 * living-roof finish. Only air directly above verified structural roof blocks
 * is changed; the shelter/vault shells and every neighboring column remain
 * untouched.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { AnvilSnapshot, isAirBlock } from './generate_picket_fence.mjs';

const regionDir = process.argv[2] ?? 'data/worldsnap/region';
const outputPath = process.argv[3]
  ?? 'data/buildops/mainstreet-secure-roof-landscape-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const snapshot = new AnvilSnapshot(regionDir);

const AREAS = [
  {
    id: 'surface-shelter',
    roofY: 91,
    minX: 148,
    maxX: 164,
    minZ: 154,
    maxZ: 180,
  },
  {
    id: 'grand-vault',
    roofY: 76,
    minX: 230,
    maxX: 262,
    minZ: 210,
    maxZ: 226,
  },
];

const STRUCTURE = 'minecraft:reinforced_deepslate';
const FINISH = 'minecraft:grass_block';
const operations = [];
const areas = [];

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

for (const area of AREAS) {
  const result = {
    ...area,
    structuralRoofCells: 0,
    alreadyCovered: 0,
    newlyCovered: 0,
    existingCoverByBlock: {},
    missingColumns: [],
  };
  for (let x = area.minX; x <= area.maxX; x += 1) {
    for (let z = area.minZ; z <= area.maxZ; z += 1) {
      const column = await snapshot.readColumn(x, z, area.roofY, area.roofY + 1);
      if (!column) {
        result.missingColumns.push({ x, z });
        continue;
      }
      const roof = baseName(column.get(area.roofY));
      if (roof !== STRUCTURE) continue;
      result.structuralRoofCells += 1;
      const above = baseName(column.get(area.roofY + 1));
      if (!isAirBlock(above)) {
        result.alreadyCovered += 1;
        result.existingCoverByBlock[above] = (result.existingCoverByBlock[above] ?? 0) + 1;
        continue;
      }
      operations.push({
        x,
        y: area.roofY + 1,
        z,
        expected: above,
        desired: FINISH,
        area: area.id,
        line: `REPL ${x} ${area.roofY + 1} ${z} ${x} ${area.roofY + 1} ${z} ${above} ${FINISH}`,
      });
      result.newlyCovered += 1;
    }
  }
  areas.push(result);
}

const errors = [];
for (const area of areas) {
  if (area.missingColumns.length) {
    errors.push(`${area.id}: ${area.missingColumns.length} missing snapshot columns`);
  }
}

const output = [
  '# GENERATED FILE — MainStreet secure-roof landscape cover',
  `# snapshot: ${regionDir}`,
  '# Safety: one-block exact-material REPL operations above verified reinforced-deepslate only.',
  `# operations: ${operations.length}; errors: ${errors.length}`,
  '',
  ...operations.map((operation) => operation.line),
  '',
].join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);

const report = {
  schemaVersion: 1,
  id: 'mainstreet-secure-roof-landscape',
  generatedAtUtc: new Date().toISOString(),
  snapshot: regionDir,
  output: {
    path: outputPath,
    sha256: sha256(outputPath),
  },
  structureBlock: STRUCTURE,
  finishBlock: FINISH,
  areas,
  stats: {
    structuralRoofCells: areas.reduce((sum, area) => sum + area.structuralRoofCells, 0),
    alreadyCovered: areas.reduce((sum, area) => sum + area.alreadyCovered, 0),
    newlyCovered: operations.length,
  },
  acceptance: {
    exactOneBlockOperations: operations.every((operation) => (
      Number.isInteger(operation.x)
      && Number.isInteger(operation.y)
      && Number.isInteger(operation.z)
      && isAirBlock(operation.expected)
      && operation.desired === FINISH
    )),
    noMissingColumns: areas.every((area) => area.missingColumns.length === 0),
    everyStructuralRoofCellCoveredAfterBuild: areas.every((area) => (
      area.structuralRoofCells === area.alreadyCovered + area.newlyCovered
    )),
  },
  errors,
  executionReady: errors.length === 0,
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: outputPath,
  report: reportPath,
  executionReady: report.executionReady,
  stats: report.stats,
  errors,
}, null, 2));
