#!/usr/bin/env node
/**
 * Compile an exact-guard rollback for the superseded ±305 MainStreet fence.
 *
 * Every source operation was a single-material REPL captured from an Anvil
 * snapshot. Reversing the operation order and swapping expected/desired means
 * we only restore a block when the obsolete fence target is still exactly what
 * the original build placed. Changed player work is therefore left untouched.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const sourcePath = process.argv[2] ?? 'data/buildops/msa_picket_fence_full.txt';
const outputPath = process.argv[3]
  ?? 'data/buildops/msa_picket_fence_superseded_inverse-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');

const source = fs.readFileSync(sourcePath, 'utf8');
const operations = source
  .split(/\r?\n/)
  .map((line, index) => ({ line: line.trim(), sourceLine: index + 1 }))
  .filter(({ line }) => line && !line.startsWith('#'));

const inverse = operations.reverse().map(({ line, sourceLine }) => {
  const fields = line.split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length !== 9) {
    throw new Error(`source line ${sourceLine} is not an exact single-material REPL`);
  }
  const [operation, ...rest] = fields;
  const coordinates = rest.slice(0, 6);
  const expected = rest[6];
  const desired = rest[7];
  if (expected.includes(',') || desired.includes(',')) {
    throw new Error(`source line ${sourceLine} has an ambiguous material mask`);
  }
  return {
    line: [operation, ...coordinates, desired, expected].join(' '),
    sourceLine,
    expected: desired,
    desired: expected,
  };
});

const header = [
  '# GENERATED FILE — exact-guard inverse of the superseded MainStreet ±305 fence',
  `# source: ${sourcePath}`,
  `# source sha256: ${crypto.createHash('sha256').update(source).digest('hex')}`,
  '# Safety: reverse order; each operation only replaces the exact obsolete material.',
  '# No broad fill, material sweep, or unguarded deletion is present.',
  '',
];
const output = `${header.join('\n')}${inverse.map((entry) => entry.line).join('\n')}\n`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
fs.writeFileSync(reportPath, `${JSON.stringify({
  schemaVersion: 1,
  id: 'mainstreet-america-picket-fence-superseded-inverse',
  generatedAtUtc: new Date().toISOString(),
  source: sourcePath,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  output: outputPath,
  outputSha256: crypto.createHash('sha256').update(output).digest('hex'),
  operationCount: inverse.length,
  exactGuardOnly: true,
  reverseOrder: true,
  restoresByMaterial: inverse.reduce((counts, entry) => {
    counts[entry.desired] = (counts[entry.desired] ?? 0) + 1;
    return counts;
  }, {}),
}, null, 2)}\n`);

console.log(JSON.stringify({
  source: sourcePath,
  output: outputPath,
  report: reportPath,
  operations: inverse.length,
}, null, 2));
