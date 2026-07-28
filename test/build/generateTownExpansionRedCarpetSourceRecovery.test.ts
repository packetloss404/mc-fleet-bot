import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  buildRedCarpetRecoveryOperationTexts,
  deriveRedCarpetRecoveryTargets,
  RED_CARPET_RECOVERY_PATHS,
} from '../../scripts/generate_town_expansion_red_carpet_source_recovery.mjs';
import {
  parseOperationText,
  verifyExactOperationBijection,
} from '../../scripts/qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(process.cwd());

function read(filename: string) {
  return fs.readFileSync(path.resolve(ROOT, filename), 'utf8');
}

function readJson(filename: string) {
  return JSON.parse(read(filename));
}

function sha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function boundInputs() {
  const baseRollbackText = read(RED_CARPET_RECOVERY_PATHS.baseRollback);
  return {
    negativeAudit: readJson(RED_CARPET_RECOVERY_PATHS.negativeAudit),
    baseRollbackPreflight: readJson(
      RED_CARPET_RECOVERY_PATHS.baseRollbackPreflight,
    ),
    baseRollbackText,
    parsedBaseRollback: parseOperationText(baseRollbackText),
  };
}

const BOUND_INPUTS = boundInputs();
const TARGETS = deriveRedCarpetRecoveryTargets(BOUND_INPUTS);

describe('Town Expansion red-carpet source recovery', () => {
  it('derives exactly the 49 complete unsupported red-carpet source points', () => {
    const targets = TARGETS;
    expect(targets).toHaveLength(49);
    expect(new Set(targets.map((target) => target.point.join(','))).size).toBe(49);
    expect(
      Object.fromEntries([72212, 72213, 72214, 72215].map((line) => [
        line,
        targets.filter((target) => target.line === line).length,
      ])),
    ).toEqual({
      72212: 4,
      72213: 3,
      72214: 36,
      72215: 6,
    });
    expect(new Set(targets.map((target) => target.source))).toEqual(
      new Set(['minecraft:air']),
    );
    expect(new Set(targets.map((target) => target.replacement))).toEqual(
      new Set(['minecraft:red_carpet']),
    );
  });

  it('builds only one-cell exact guards and their reverse-order exact inverse', () => {
    const targets = TARGETS;
    const generated = buildRedCarpetRecoveryOperationTexts({ targets });
    const forward = parseOperationText(generated.forwardText);
    const rollback = parseOperationText(generated.rollbackText);
    expect(forward.unsupported).toEqual([]);
    expect(rollback.unsupported).toEqual([]);
    expect(forward.repl).toHaveLength(49);
    expect(rollback.repl).toHaveLength(49);
    expect(forward.repl.every((operation) => (
      operation.volume === 1
      && operation.sources[0] === 'minecraft:air'
      && operation.desired === 'minecraft:red_carpet'
    ))).toBe(true);
    expect(rollback.repl.every((operation) => (
      operation.volume === 1
      && operation.sources[0] === 'minecraft:red_carpet'
      && operation.desired === 'minecraft:air'
    ))).toBe(true);
    expect(
      verifyExactOperationBijection(generated.forwardText, generated.rollbackText),
    ).toMatchObject({
      passed: true,
      forwardReplGroups: 49,
      rollbackReplGroups: 49,
      uniqueTargetCells: 49,
      repeatedForwardCellSteps: 0,
    });
  });

  it('fails closed when unsupported evidence is no longer red_carpet to air', () => {
    const inputs = BOUND_INPUTS;
    const drifted = structuredClone(inputs.negativeAudit);
    drifted.unsupportedTransitions[0].actual = 'minecraft:stone';
    expect(() => deriveRedCarpetRecoveryTargets({
      ...inputs,
      negativeAudit: drifted,
    })).toThrow(/is not red_carpet -> air/);
  });

  it('fails closed on missing points even if the declared count is left unchanged', () => {
    const inputs = BOUND_INPUTS;
    const incomplete = structuredClone(inputs.negativeAudit);
    incomplete.unsupportedTransitions.pop();
    expect(() => deriveRedCarpetRecoveryTargets({
      ...inputs,
      negativeAudit: incomplete,
    })).toThrow(/exactly 49 unsupported transitions/);
  });

  it('binds finalized artifacts to the terminal snapshot and offline evidence', () => {
    const targets = TARGETS;
    const generated = buildRedCarpetRecoveryOperationTexts({ targets });
    expect(read(RED_CARPET_RECOVERY_PATHS.forward)).toBe(generated.forwardText);
    expect(read(RED_CARPET_RECOVERY_PATHS.rollback)).toBe(generated.rollbackText);
    const manifest = readJson(RED_CARPET_RECOVERY_PATHS.manifest);
    expect(manifest).toMatchObject({
      transactionId:
        'town-expansion-r1-red-carpet-source-recovery-atomic-2026-07-28',
      packages: [{
        key: 'town-expansion-r1-red-carpet-source-recovery',
        forward: RED_CARPET_RECOVERY_PATHS.forward,
        rollback: RED_CARPET_RECOVERY_PATHS.rollback,
      }],
      status: 'OFFLINE_VALIDATED_NOT_EXECUTED',
      liveWorldMutated: false,
      serviceMutated: false,
      databaseMutated: false,
      source: {
        terminalSnapshotSha256:
          '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d',
      },
      forward: {
        sha256: sha256(generated.forwardText),
        operationCount: 49,
        targetedCells: 49,
      },
      rollback: {
        sha256: sha256(generated.rollbackText),
        operationCount: 49,
        targetedCells: 49,
        exactInverse: true,
      },
      protections: {
        terminalSourceGuardsMatched: 49,
        targetBlockEntities: 0,
        supplementalTargetOverlap: 0,
        naturalTransitionPolicyExpanded: false,
        copperOnlyNaturalTransitionPolicyPreserved: true,
        liveExecutionPerformed: false,
      },
    });
    expect(manifest.offlineEvidence).toHaveLength(3);
    for (const evidence of manifest.offlineEvidence) {
      expect(sha256(read(evidence.file))).toBe(evidence.sha256);
    }
  });
});
