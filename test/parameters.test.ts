import { DevtoolsError } from '@mc-fleet/world-core';
import { describe, expect, it } from 'vitest';

import { parseRecipe, validateAndCoerceParameters } from '@mc-fleet/reporting';

const baseRecipe = {
  version: 1,
  id: 'demo',
  name: 'Demo',
  description: 'demo recipe',
};

describe('parameter validation', () => {
  it('coerces string, integer, and bounds parameters', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'r', type: 'html-report', options: { title: 'x' } }],
      parameters: {
        title: { type: 'string', description: 'override' },
        limit: { type: 'integer', description: 'rows', min: 1, max: 100 },
        bounds: { type: 'bounds', description: 'box' },
      },
    });
    const coerced = validateAndCoerceParameters(recipe, {
      title: 'Custom',
      limit: '50',
      bounds: '0,0,0,16,16,16',
    });
    expect(coerced['title']).toBe('Custom');
    expect(coerced['limit']).toBe(50);
    expect(coerced['bounds']).toEqual({
      minX: 0, minY: 0, minZ: 0,
      maxX: 16, maxY: 16, maxZ: 16,
    });
  });

  it('omits optional parameters that are not provided', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'r', type: 'html-report', options: { title: 'x' } }],
      parameters: {
        title: { type: 'string', description: 'override', required: false },
      },
    });
    const coerced = validateAndCoerceParameters(recipe, {});
    expect(coerced).not.toHaveProperty('title');
  });

  it('rejects unknown parameters', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'r', type: 'html-report', options: { title: 'x' } }],
      parameters: {
        title: { type: 'string', description: 'x' },
      },
    });
    expect(() => validateAndCoerceParameters(recipe, { extra: 'x' }))
      .toThrow(/does not declare parameter extra/);
  });

  it('rejects missing required parameters', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'r', type: 'html-report', options: { title: 'x' } }],
      parameters: {
        name: { type: 'string', description: 'x', required: true },
      },
    });
    expect(() => validateAndCoerceParameters(recipe, {}))
      .toThrow(/requires parameter name/);
  });

  it('rejects values that fail type or range checks', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'r', type: 'html-report', options: { title: 'x' } }],
      parameters: {
        count: { type: 'integer', description: 'x', min: 1, max: 10 },
        box: { type: 'bounds', description: 'x' },
      },
    });
    expect(() => validateAndCoerceParameters(recipe, { count: 99 }))
      .toThrow(/parameter count must be <= 10/);
    expect(() => validateAndCoerceParameters(recipe, { count: 1.5 }))
      .toThrow(/parameter count must be an integer/);
    expect(() => validateAndCoerceParameters(recipe, { box: '1,2,3' }))
      .toThrow(/six comma-separated integers/);
  });

  it('throws DevtoolsError with INVALID_PARAMETER code on bad input', () => {
    const recipe = parseRecipe({
      ...baseRecipe,
      steps: [{ id: 'r', type: 'html-report', options: { title: 'x' } }],
      parameters: {
        name: { type: 'string', description: 'x' },
      },
    });
    try {
      validateAndCoerceParameters(recipe, { name: 42 });
      throw new Error('expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DevtoolsError);
      expect((error as DevtoolsError).code).toBe('INVALID_PARAMETER');
    }
  });
});
