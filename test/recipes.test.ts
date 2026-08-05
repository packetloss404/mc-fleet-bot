import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadRecipes, parseRecipe } from '@mc-fleet/reporting';
import { DevtoolsError } from '@mc-fleet/world-core';
import { describe, expect, it } from 'vitest';

const baseRecipe = {
  version: 1,
  id: 'demo',
  name: 'Demo',
  description: 'demo recipe',
  steps: [
    { id: 'snap', type: 'snapshot-summary' as const },
    { id: 'report', type: 'html-report' as const, options: { title: 'Demo' } },
  ],
};

describe('recipe parser', () => {
  it('rejects non-object input', () => {
    expect(() => parseRecipe(null)).toThrow(DevtoolsError);
    expect(() => parseRecipe('not-a-recipe')).toThrow(DevtoolsError);
    expect(() => parseRecipe([])).toThrow(DevtoolsError);
  });

  it('rejects unknown version', () => {
    expect(() => parseRecipe({ ...baseRecipe, version: 2 })).toThrow(/version must be 1/);
  });

  it('rejects missing required top-level fields', () => {
    expect(() => parseRecipe({ ...baseRecipe, id: '' })).toThrow(/id must be a non-empty string/);
    expect(() => parseRecipe({ ...baseRecipe, name: '' })).toThrow(/name must be a non-empty string/);
    expect(() => parseRecipe({ ...baseRecipe, description: '' })).toThrow(/description must be a non-empty string/);
  });

  it('rejects an empty or missing steps list', () => {
    expect(() => parseRecipe({ ...baseRecipe, steps: [] })).toThrow(/steps must be a non-empty list/);
    expect(() => parseRecipe({ ...baseRecipe, steps: undefined })).toThrow(/steps must be a non-empty list/);
  });

  it('rejects unsupported step types by allow-list', () => {
    expect(() => parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'evil', type: 'shell-exec' }],
    })).toThrow(/unsupported step type/);
  });

  it('rejects duplicate step ids within a recipe', () => {
    expect(() => parseRecipe({
      ...baseRecipe,
      steps: [
        { id: 'snap', type: 'snapshot-summary' },
        { id: 'snap', type: 'html-report', options: { title: 'X' } },
      ],
    })).toThrow(/duplicate step snap/);
  });

  it('rejects malformed step options', () => {
    expect(() => parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'report', type: 'html-report', options: 'not-a-map' }],
    })).toThrow(/options must be a map/);
  });

  it('rejects parameter entries that are not objects', () => {
    expect(() => parseRecipe({
      ...baseRecipe,
      parameters: { bounds: 'oops' },
    })).toThrow(/parameter bounds must be an object/);
  });

  it('accepts a recipe with declared parameters', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      parameters: {
        bounds: { description: 'Inclusive box', required: false },
      },
    });
    expect(recipe.parameters?.['bounds']?.description).toBe('Inclusive box');
  });

  it('rejects parameter keys that are not identifiers', () => {
    expect(() => parseRecipe({
      ...baseRecipe,
      parameters: { 'with space': { description: 'x' } },
    })).toThrow(/letters, numbers, dot, underscore/);
  });
});

describe('loadRecipes', () => {
  it('reads every YAML recipe in a directory and rejects duplicate ids', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-recipes-'));
    fs.writeFileSync(path.join(directory, 'a.yml'), JSON.stringify({ ...baseRecipe, id: 'first' }));
    fs.writeFileSync(path.join(directory, 'b.yml'), JSON.stringify({ ...baseRecipe, id: 'first' }));
    expect(() => loadRecipes(directory)).toThrow(/Duplicate recipe id/);
  });

  it('refuses to load from a non-existent directory', () => {
    expect(() => loadRecipes(path.join(os.tmpdir(), 'does-not-exist-' + Date.now()))).toThrow(/Recipe directory not found/);
  });
});
