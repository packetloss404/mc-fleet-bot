import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../../src/voyager/DependencyResolver';

/**
 * minecraft-data lists every recipe variant and the old code took recipes[0]
 * blindly, which produced live nonsense in an oak world: `stick = 2 bamboo`,
 * `wooden_pickaxe = 3 cherry_planks`, and `iron_ingot = 9 iron_nugget` — each
 * sending bots to gather materials they had no reason to want.
 */
describe('recipe variant selection', () => {
  const r = new DependencyResolver('1.21.1');
  const names = (item: string) => {
    const rec = r.getRecipe(item);
    return rec ? [...rec.ingredients.keys()] : [];
  };

  it('prefers oak over exotic wood variants', () => {
    expect(names('stick')).toContain('oak_planks');
    expect(names('stick')).not.toContain('bamboo');
    expect(names('wooden_pickaxe')).toContain('oak_planks');
    expect(names('wooden_pickaxe')).not.toContain('cherry_planks');
    expect(names('crafting_table')).toContain('oak_planks');
  });

  it('avoids the nugget-compacting recipe for iron_ingot', () => {
    // Iron is really smelted, not crafted — but if a crafting recipe is
    // returned it must not be the 9-nugget compaction.
    expect(names('iron_ingot')).not.toContain('iron_nugget');
  });

  it('still resolves ordinary recipes correctly', () => {
    expect(names('oak_planks')).toContain('oak_log');
  });
});
