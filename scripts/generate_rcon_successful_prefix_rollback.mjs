#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

function value(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

function required(name) {
  const supplied = value(name);
  if (!supplied) throw new Error(`missing required ${name}`);
  return path.resolve(supplied);
}

function sha256(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function writeNew(filename, contents) {
  if (fs.existsSync(filename) && !args.includes('--overwrite')) {
    throw new Error(`output already exists: ${filename}`);
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, filename);
}

function sameBox(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === 6
    && right.length === 6
    && left.every((coordinate, index) => coordinate === right[index]);
}

try {
  const executionPath = required('--execution');
  const operationsPath = required('--ops');
  const outputPath = required('--out');
  const auditPath = required('--audit');
  const executionText = fs.readFileSync(executionPath, 'utf8');
  const operationsText = fs.readFileSync(operationsPath, 'utf8');
  const execution = JSON.parse(executionText);

  if (execution.status !== 'failed') {
    throw new Error(`execution status must be failed, got ${execution.status}`);
  }
  if (sha256(operationsText) !== execution.operationSha256) {
    throw new Error('operation file hash does not match execution report');
  }
  if (!Number.isInteger(execution.successfulGroups) || execution.successfulGroups <= 0) {
    throw new Error('execution does not contain a non-empty successful prefix');
  }
  if (execution.failedGroups !== 1 || execution.groupFailures?.length !== 1) {
    throw new Error('execution must contain exactly one terminal failed group');
  }
  if (execution.groupFailures[0].groupIndex !== execution.successfulGroups) {
    throw new Error('failed group is not immediately after the successful prefix');
  }

  const prefix = execution.sourceGroups?.slice(0, execution.successfulGroups);
  if (!Array.isArray(prefix) || prefix.length !== execution.successfulGroups) {
    throw new Error('execution sourceGroups do not cover the successful prefix');
  }
  for (const [index, group] of prefix.entries()) {
    if (
      group.index !== index
      || group.kind !== 'REPL'
      || group.finiteUnion !== false
      || group.alternatives?.length !== 1
      || group.expandedEnd - group.expandedStart !== 1
      || !Array.isArray(group.box)
      || group.box.length !== 6
      || !sameBox(group.box, [
        group.box[0],
        group.box[1],
        group.box[2],
        group.box[0],
        group.box[1],
        group.box[2],
      ])
    ) {
      throw new Error(`successful group ${index} is not an invertible one-cell REPL`);
    }
  }

  const operationLines = prefix
    .slice()
    .reverse()
    .map((group) => {
      const coordinates = group.box.join(' ');
      return `REPL ${coordinates} ${group.replacement} ${group.sourceMask}`;
    });
  const outputText = [
    '# GENERATED — exact inverse of a journal-proven successful RCON prefix',
    '# Execute only with a fresh entity gate and --strict-noop.',
    `# source_operations_sha256: ${execution.operationSha256}`,
    `# source_group_plan_sha256: ${execution.sourceGroupPlanSha256}`,
    `# execution_report_sha256: ${sha256(executionText)}`,
    `# successful_prefix_groups: ${execution.successfulGroups}`,
    '',
    ...operationLines,
    '',
  ].join('\n');
  const audit = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    status: 'OFFLINE_PREFIX_ROLLBACK_READY_NOT_EXECUTED',
    execution: {
      path: path.relative(process.cwd(), executionPath),
      sha256: sha256(executionText),
      operationSha256: execution.operationSha256,
      sourceGroupPlanSha256: execution.sourceGroupPlanSha256,
      successfulGroups: execution.successfulGroups,
      failedGroupIndex: execution.groupFailures[0].groupIndex,
    },
    rollback: {
      path: path.relative(process.cwd(), outputPath),
      sha256: sha256(outputText),
      operationCount: operationLines.length,
      exactReverseOrder: true,
      oneCellReplOnly: true,
    },
    liveWorldMutated: false,
  };

  writeNew(outputPath, outputText);
  writeNew(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
} catch (error) {
  console.error(`prefix rollback generation rejected: ${error.message}`);
  process.exitCode = 1;
}
