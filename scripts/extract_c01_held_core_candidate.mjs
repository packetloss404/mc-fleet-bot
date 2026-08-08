#!/usr/bin/env node
/** Extract the exact route-held C01 operations for a separate redesign gate. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const required = (flag) => {
  const result = get(flag);
  if (!result) throw new Error(`${flag} is required`);
  return path.resolve(ROOT, result);
};
const input = required('--input');
const rollbackInput = required('--rollback-input');
const sourceReport = required('--source-report');
const out = required('--out');
const rollbackOut = required('--rollback-out');
const reportOut = required('--report');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const parse = (line) => {
  const fields = line.trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length !== 9) return null;
  return { line, key: `${fields[1]},${fields[2]},${fields[3]}` };
};
const source = JSON.parse(fs.readFileSync(sourceReport, 'utf8'));
const held = new Set(source.heldKeys ?? []);
if (!held.size) throw new Error('source report has no heldKeys');
const forward = fs.readFileSync(input, 'utf8').split(/\r?\n/).map(parse).filter(Boolean);
const rollback = fs.readFileSync(rollbackInput, 'utf8').split(/\r?\n/).map(parse).filter(Boolean);
const selectedForward = forward.filter((op) => held.has(op.key)).map((op) => op.line);
const selectedKeys = new Set(selectedForward.map((line) => parse(line).key));
const selectedRollback = rollback.filter((op) => selectedKeys.has(op.key)).map((op) => op.line);
if (selectedForward.length !== selectedRollback.length) {
  throw new Error(`candidate inverse mismatch ${selectedForward.length}/${selectedRollback.length}`);
}
const sourceSnapshot = fs.readFileSync(input, 'utf8').split(/\r?\n/)
  .find((line) => line.startsWith('# source_snapshot_sha256:')) ?? '# source_snapshot_sha256: unknown';
const forwardText = [
  '# GENERATED — C01 held stair-core candidate',
  '# route-interface cells are intentionally included for coordinated redesign only',
  sourceSnapshot,
  `# changed_cells: ${selectedForward.length}`,
  '',
  ...selectedForward,
  '',
].join('\n');
const rollbackText = [
  '# GENERATED — exact inverse of C01 held stair-core candidate',
  `# forward_sha256: ${sha256(forwardText)}`,
  sourceSnapshot,
  `# changed_cells: ${selectedRollback.length}`,
  '',
  ...selectedRollback,
  '',
].join('\n');
for (const file of [out, rollbackOut, reportOut]) fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(out, forwardText);
fs.writeFileSync(rollbackOut, rollbackText);
const report = {
  status: 'C01_HELD_CORE_CANDIDATE_READY_FOR_COORDINATED_REDESIGN',
  sourceReport,
  sourceReportSha256: sha256(fs.readFileSync(sourceReport)),
  input,
  rollbackInput,
  heldOperationCount: held.size,
  selectedOperationCount: selectedForward.length,
  forwardSha256: sha256(forwardText),
  rollbackSha256: sha256(rollbackText),
  releaseRule: 'Never execute without an explicit replacement route design and fresh route projection.',
};
fs.writeFileSync(reportOut, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
