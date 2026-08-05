import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { DevtoolsError, assertIdentifier } from '@mc-fleet/world-core';

import type {
  CoercedBounds,
  CoercedParameterValue,
  RecipeParameter,
  RecipeParameterType,
  RecipeStep,
  RecipeStepType,
  ReportRecipe,
} from './types.js';

const STEP_TYPES = new Set<RecipeStepType>([
  'snapshot-summary',
  'database-catalog',
  'world-features',
  'block-census',
  'html-report',
]);

const PARAMETER_TYPES: ReadonlySet<RecipeParameterType> = new Set<RecipeParameterType>([
  'string',
  'integer',
  'bounds',
]);

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DevtoolsError(`${field} must be a non-empty string`, 'INVALID_RECIPE');
  }
  return value;
}

function parseParameters(input: unknown, filename: string): Record<string, RecipeParameter> {
  if (input === undefined) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DevtoolsError(`${filename}: parameters must be a map`, 'INVALID_RECIPE');
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      assertIdentifier(key, 'recipe parameter');
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new DevtoolsError(
          `${filename}: parameter ${key} must be an object`,
          'INVALID_RECIPE',
        );
      }
      const record = value as Record<string, unknown>;
      const typeValue = record['type'];
      if (typeof typeValue !== 'string' || !PARAMETER_TYPES.has(typeValue as RecipeParameterType)) {
        throw new DevtoolsError(
          `${filename}: parameter ${key}.type must be one of string, integer, bounds`,
          'INVALID_RECIPE',
        );
      }
      const parameter: RecipeParameter = {
        type: typeValue as RecipeParameterType,
        description: requiredString(
          record.description,
          `${filename}: parameters.${key}.description`,
        ),
        required: record.required === true,
      };
      if (record['min'] !== undefined) {
        if (typeof record['min'] !== 'number' || !Number.isInteger(record['min'])) {
          throw new DevtoolsError(
            `${filename}: parameter ${key}.min must be an integer`,
            'INVALID_RECIPE',
          );
        }
        parameter.min = record['min'] as number;
      }
      if (record['max'] !== undefined) {
        if (typeof record['max'] !== 'number' || !Number.isInteger(record['max'])) {
          throw new DevtoolsError(
            `${filename}: parameter ${key}.max must be an integer`,
            'INVALID_RECIPE',
          );
        }
        parameter.max = record['max'] as number;
      }
      if (
        parameter.min !== undefined &&
        parameter.max !== undefined &&
        parameter.min > parameter.max
      ) {
        throw new DevtoolsError(
          `${filename}: parameter ${key}.min must not exceed max`,
          'INVALID_RECIPE',
        );
      }
      return [key, parameter];
    }),
  );
}

export function parseRecipe(input: unknown, filename = '<memory>'): ReportRecipe {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DevtoolsError(`${filename}: recipe must be an object`, 'INVALID_RECIPE');
  }
  const value = input as Record<string, unknown>;
  if (value.version !== 1) {
    throw new DevtoolsError(`${filename}: recipe version must be 1`, 'INVALID_RECIPE');
  }
  const id = requiredString(value.id, `${filename}: id`);
  assertIdentifier(id, 'recipe id');
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    throw new DevtoolsError(`${filename}: steps must be a non-empty list`, 'INVALID_RECIPE');
  }
  const stepIds = new Set<string>();
  const steps: RecipeStep[] = value.steps.map((inputStep, index) => {
    if (!inputStep || typeof inputStep !== 'object' || Array.isArray(inputStep)) {
      throw new DevtoolsError(`${filename}: steps[${index}] must be an object`, 'INVALID_RECIPE');
    }
    const step = inputStep as Record<string, unknown>;
    const stepId = requiredString(step.id, `${filename}: steps[${index}].id`);
    assertIdentifier(stepId, 'recipe step id');
    if (stepIds.has(stepId)) {
      throw new DevtoolsError(`${filename}: duplicate step ${stepId}`, 'INVALID_RECIPE');
    }
    stepIds.add(stepId);
    const type = requiredString(step.type, `${filename}: steps[${index}].type`) as RecipeStepType;
    if (!STEP_TYPES.has(type)) {
      throw new DevtoolsError(`${filename}: unsupported step type ${type}`, 'UNSUPPORTED_STEP');
    }
    if (
      step.options !== undefined &&
      (!step.options || typeof step.options !== 'object' || Array.isArray(step.options))
    ) {
      throw new DevtoolsError(
        `${filename}: steps[${index}].options must be a map`,
        'INVALID_RECIPE',
      );
    }
    return {
      id: stepId,
      type,
      options: step.options as Record<string, unknown> | undefined,
    };
  });
  return {
    version: 1,
    id,
    name: requiredString(value.name, `${filename}: name`),
    description: requiredString(value.description, `${filename}: description`),
    parameters: parseParameters(value.parameters, filename),
    steps,
    sourceFile: filename,
  };
}

export function loadRecipes(directory: string): ReportRecipe[] {
  const resolved = path.resolve(directory);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new DevtoolsError(`Recipe directory not found: ${resolved}`, 'RECIPES_NOT_FOUND');
  }
  const recipes = fs
    .readdirSync(resolved)
    .filter((filename) => /\.ya?ml$/i.test(filename))
    .sort()
    .map((filename) => {
      const fullPath = path.join(resolved, filename);
      return parseRecipe(yaml.load(fs.readFileSync(fullPath, 'utf8')), fullPath);
    });
  const ids = new Set<string>();
  for (const recipe of recipes) {
    if (ids.has(recipe.id)) {
      throw new DevtoolsError(`Duplicate recipe id ${recipe.id}`, 'DUPLICATE_RECIPE');
    }
    ids.add(recipe.id);
  }
  return recipes;
}

export type { CoercedBounds, CoercedParameterValue } from './types.js';

/**
 * Validate the request `parameters` against a recipe's declared parameters
 * and coerce each value into the type the recipe expects. Unknown keys
 * are rejected, required keys without values are rejected, and the
 * returned object only contains declared keys.
 */
export function validateAndCoerceParameters(
  recipe: ReportRecipe,
  rawParameters: Record<string, unknown> | undefined,
): Record<string, CoercedParameterValue> {
  const declared = recipe.parameters ?? {};
  const input = rawParameters ?? {};
  const coerced: Record<string, CoercedParameterValue> = {};
  for (const [key, definition] of Object.entries(declared)) {
    const value = input[key];
    if (value === undefined || value === null || value === '') {
      if (definition.required) {
        throw new DevtoolsError(
          `Recipe ${recipe.id} requires parameter ${key}`,
          'MISSING_PARAMETER',
        );
      }
      continue;
    }
    switch (definition.type) {
      case 'string': {
        if (typeof value !== 'string') {
          throw new DevtoolsError(
            `Recipe ${recipe.id} parameter ${key} must be a string`,
            'INVALID_PARAMETER',
          );
        }
        coerced[key] = value;
        break;
      }
      case 'integer': {
        const numeric = typeof value === 'number' ? value : Number(value);
        if (!Number.isInteger(numeric)) {
          throw new DevtoolsError(
            `Recipe ${recipe.id} parameter ${key} must be an integer`,
            'INVALID_PARAMETER',
          );
        }
        if (definition.min !== undefined && numeric < definition.min) {
          throw new DevtoolsError(
            `Recipe ${recipe.id} parameter ${key} must be >= ${definition.min}`,
            'INVALID_PARAMETER',
          );
        }
        if (definition.max !== undefined && numeric > definition.max) {
          throw new DevtoolsError(
            `Recipe ${recipe.id} parameter ${key} must be <= ${definition.max}`,
            'INVALID_PARAMETER',
          );
        }
        coerced[key] = numeric;
        break;
      }
      case 'bounds': {
        coerced[key] = parseBoundsParameter(recipe.id, key, value);
        break;
      }
    }
  }
  for (const key of Object.keys(input)) {
    if (!(key in declared)) {
      throw new DevtoolsError(
        `Recipe ${recipe.id} does not declare parameter ${key}`,
        'UNKNOWN_PARAMETER',
      );
    }
  }
  return coerced;
}

function parseBoundsParameter(recipeId: string, key: string, value: unknown): CoercedBounds {
  const entries = Array.isArray(value)
    ? value.map((entry) => Number(entry))
    : String(value)
        .split(',')
        .map((entry) => Number(entry.trim()));
  if (entries.length !== 6 || entries.some((entry) => !Number.isInteger(entry))) {
    throw new DevtoolsError(
      `Recipe ${recipeId} parameter ${key} must contain six comma-separated integers`,
      'INVALID_PARAMETER',
    );
  }
  const [x1, y1, z1, x2, y2, z2] = entries as [number, number, number, number, number, number];
  return {
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    minZ: Math.min(z1, z2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
    maxZ: Math.max(z1, z2),
  };
}
