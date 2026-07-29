import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { DevtoolsError, assertIdentifier } from '@mc-fleet/world-core';

import type {
  RecipeParameter,
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
  return Object.fromEntries(Object.entries(input).map(([key, value]) => {
    assertIdentifier(key, 'recipe parameter');
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new DevtoolsError(
        `${filename}: parameter ${key} must be an object`,
        'INVALID_RECIPE',
      );
    }
    const record = value as Record<string, unknown>;
    return [
      key,
      {
        description: requiredString(
          record.description,
          `${filename}: parameters.${key}.description`,
        ),
        required: record.required === true,
      },
    ];
  }));
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
      throw new DevtoolsError(
        `${filename}: steps[${index}] must be an object`,
        'INVALID_RECIPE',
      );
    }
    const step = inputStep as Record<string, unknown>;
    const stepId = requiredString(step.id, `${filename}: steps[${index}].id`);
    assertIdentifier(stepId, 'recipe step id');
    if (stepIds.has(stepId)) {
      throw new DevtoolsError(`${filename}: duplicate step ${stepId}`, 'INVALID_RECIPE');
    }
    stepIds.add(stepId);
    const type = requiredString(
      step.type,
      `${filename}: steps[${index}].type`,
    ) as RecipeStepType;
    if (!STEP_TYPES.has(type)) {
      throw new DevtoolsError(
        `${filename}: unsupported step type ${type}`,
        'UNSUPPORTED_STEP',
      );
    }
    if (
      step.options !== undefined
      && (!step.options || typeof step.options !== 'object' || Array.isArray(step.options))
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
  const recipes = fs.readdirSync(resolved)
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
