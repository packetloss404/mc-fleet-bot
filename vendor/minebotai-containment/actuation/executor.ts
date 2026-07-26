import type { Bot } from 'mineflayer';
import { isFallbackMarker, type DecomposedTaskStep, type JsonObject, type JsonValue, type TaskStepResult } from '@minebotai/shared/types';
import { CodeExecutor, type ExecutionResult, type PrimitiveStep } from '../voyager/CodeExecutor';
import { SkillLibrary } from '../voyager/SkillLibrary';
import { findPrimitive } from './catalog';
import { isRuntimeCodeTrustedModeEnabled, runtimeCodeTrustedModeError } from '../security/runtimeCode';

export interface CodegenFallbackGeneratedCode {
  functionName: string;
  functionCode: string;
  execCode: string;
  skillName?: string;
  description?: string;
  keywords?: string[];
}

export interface CodegenFallbackCriticResult {
  success: boolean;
  reason: string;
  critique?: string;
}

export interface CodegenFallbackContext {
  bot: Bot;
  skillLibrary: SkillLibrary;
  codeExecutor: CodeExecutor;
  step: DecomposedTaskStep;
}

export interface CodegenFallbackHandler {
  generate(context: CodegenFallbackContext): Promise<CodegenFallbackGeneratedCode>;
  evaluate(
    context: CodegenFallbackContext,
    generated: CodegenFallbackGeneratedCode,
    executionResult: ExecutionResult,
  ): Promise<CodegenFallbackCriticResult>;
  saveApproved?(
    context: CodegenFallbackContext,
    generated: CodegenFallbackGeneratedCode,
    criticResult: CodegenFallbackCriticResult,
  ): Promise<void>;
}

export interface ActuationStepExecutorDeps {
  bot: Bot;
  skillLibrary: SkillLibrary;
  codeExecutor: CodeExecutor;
  codegenFallback?: CodegenFallbackHandler;
}

export interface ActuationStepExecution {
  stepResult: TaskStepResult;
  executionResult?: ExecutionResult;
}

type PrimitiveBuilder = (args: JsonObject) => PrimitiveStep;

function numberArg(args: JsonObject, name: string, fallback: number): number {
  const value = args[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArg(args: JsonObject, name: string): string {
  const value = args[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`primitive argument "${name}" must be a non-empty string`);
  }
  return value;
}

const PRIMITIVE_BUILDERS: Record<string, PrimitiveBuilder> = {
  chat: (args) => ({ action: 'chat', args: { message: stringArg(args, 'message') } }),
  mineBlock: (args) => ({ action: 'mineBlock', args: { name: stringArg(args, 'name'), count: numberArg(args, 'count', 1) } }),
  craftItem: (args) => ({ action: 'craftItem', args: { name: stringArg(args, 'name'), count: numberArg(args, 'count', 1) } }),
  smeltItem: (args) => ({ action: 'smeltItem', args: {
    itemName: stringArg(args, 'itemName'), fuelName: stringArg(args, 'fuelName'), count: numberArg(args, 'count', 1),
  } }),
  placeItem: (args) => ({ action: 'placeItem', args: {
    name: stringArg(args, 'name'), x: numberArg(args, 'x', 0), y: numberArg(args, 'y', 0), z: numberArg(args, 'z', 0),
  } }),
  moveTo: (args) => ({ action: 'moveTo', args: {
    x: numberArg(args, 'x', 0), y: numberArg(args, 'y', 0), z: numberArg(args, 'z', 0),
    range: numberArg(args, 'range', 2), timeoutSec: numberArg(args, 'timeoutSec', 15),
  } }),
  killMob: (args) => ({ action: 'killMob', args: {
    name: stringArg(args, 'name'), maxDuration: numberArg(args, 'maxDuration', 30000),
  } }),
  withdrawItem: (args) => ({ action: 'withdrawItem', args: {
    containerName: stringArg(args, 'containerName'), itemName: stringArg(args, 'itemName'), count: numberArg(args, 'count', 1),
  } }),
  depositItem: (args) => ({ action: 'depositItem', args: {
    containerName: stringArg(args, 'containerName'), itemName: stringArg(args, 'itemName'), count: numberArg(args, 'count', 1),
  } }),
  inspectContainer: (args) => ({ action: 'inspectContainer', args: { containerName: stringArg(args, 'containerName') } }),
  dropJunk: (args) => {
    const threshold = numberArg(args, 'thresholdUsedSlots', numberArg(args, 'threshold', 30));
    return { action: 'dropJunk', args: { minFreeSlots: numberArg(args, 'minFreeSlots', 6), threshold } };
  },
};

function completedAt(): string {
  return new Date().toISOString();
}

function resultFor(
  step: DecomposedTaskStep,
  status: TaskStepResult['status'],
  startedAt: string,
  output?: JsonValue,
  error?: Error,
  errorCode = 'ACTUATION_STEP_FAILED',
): TaskStepResult {
  return {
    stepId: step.id,
    kind: step.kind,
    name: step.name,
    status,
    startedAt,
    completedAt: completedAt(),
    output,
    error: error
      ? {
          code: errorCode,
          message: error.message,
        }
      : undefined,
  };
}

function failureFromExecutionResult(executionResult: ExecutionResult): Error | undefined {
  const primitiveFailure = executionResult.events.find((event) => event.type === 'primitive_failure');
  if (executionResult.success && !primitiveFailure) return undefined;
  const message = executionResult.error ?? primitiveFailure?.message ?? 'Actuation step failed';
  return new Error(message);
}

async function executeCodegenFallbackStep(
  step: DecomposedTaskStep,
  deps: ActuationStepExecutorDeps,
  startedAt: string,
): Promise<ActuationStepExecution> {
  if (step.kind !== 'codegenFallback') {
    throw new Error(`expected codegenFallback step, received "${step.kind}"`);
  }

  if (!isFallbackMarker(step.fallback)) {
    return {
      stepResult: resultFor(
        step,
        'failed',
        startedAt,
        undefined,
        new Error('codegenFallback requires a valid fallback marker'),
        'CODEGEN_FALLBACK_MARKER_INVALID',
      ),
    };
  }

  if (!step.fallback.allowCodegenFallback) {
    return {
      stepResult: resultFor(
        step,
        'failed',
        startedAt,
        undefined,
        new Error('codegenFallback marker does not allow code generation'),
        'CODEGEN_FALLBACK_NOT_ALLOWED',
      ),
    };
  }

  if (typeof step.fallback.approvedBy !== 'string' || step.fallback.approvedBy.trim() === '') {
    return {
      stepResult: resultFor(
        step,
        'failed',
        startedAt,
        undefined,
        new Error('codegenFallback requires explicit director approval in fallback.approvedBy'),
        'CODEGEN_FALLBACK_DIRECTOR_APPROVAL_REQUIRED',
      ),
    };
  }

  if (!isRuntimeCodeTrustedModeEnabled()) {
    return {
      stepResult: resultFor(
        step,
        'failed',
        startedAt,
        undefined,
        new Error(runtimeCodeTrustedModeError('codegenFallback execution')),
        'CODEGEN_FALLBACK_TRUSTED_MODE_REQUIRED',
      ),
    };
  }

  return {
    stepResult: resultFor(
      step,
      'failed',
      startedAt,
      undefined,
      new Error('Generated JavaScript fallback execution is disabled until an isolated runtime is configured'),
      'CODEGEN_FALLBACK_EXECUTION_DISABLED',
    ),
  };
}

export async function executeActuationStep(
  step: DecomposedTaskStep,
  deps: ActuationStepExecutorDeps,
): Promise<ActuationStepExecution> {
  const startedAt = completedAt();

  try {
    if (step.kind === 'primitive') {
      const primitive = findPrimitive(step.name);
      if (!primitive) {
        throw new Error(`unknown primitive "${step.name}"`);
      }
      const build = PRIMITIVE_BUILDERS[primitive.name];
      if (!build) {
        throw new Error(`primitive "${primitive.name}" has no executor plan builder`);
      }
      const executionResult = await deps.codeExecutor.executePrimitivePlan(deps.bot, {
        provenance: 'catalog-primitive',
        steps: [build(step.args)],
      });
      const error = failureFromExecutionResult(executionResult);
      const status = error ? 'failed' : 'done';
      return {
        stepResult: resultFor(step, status, startedAt, executionResult.output, error),
        executionResult,
      };
    }

    if (step.kind === 'skill') {
      const code = deps.skillLibrary.getCode(step.name);
      if (!code) {
        throw new Error(`unknown skill "${step.name}"`);
      }
      return {
        stepResult: resultFor(
          step,
          'failed',
          startedAt,
          undefined,
          new Error('Saved JavaScript skill execution is disabled; migrate the skill to a primitive plan'),
          'SKILL_JAVASCRIPT_EXECUTION_DISABLED',
        ),
      };
    }

    if (step.kind === 'codegenFallback') {
      return await executeCodegenFallbackStep(step, deps, startedAt);
    }

    throw new Error(`actuation helper does not execute "${step.kind}" steps yet`);
  } catch (err: any) {
    return {
      stepResult: resultFor(step, 'failed', startedAt, undefined, err instanceof Error ? err : new Error(String(err))),
    };
  }
}
