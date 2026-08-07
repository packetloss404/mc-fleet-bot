import { describe, it, expect, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('[]'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { ActionAgent } from '../../src/voyager/ActionAgent';

/**
 * Third rung of the degradation ladder: when no provider can generate code,
 * reuse the best-matching learned skill rather than failing outright.
 *
 * The interesting cases are all the ones where recall must REFUSE. A bot
 * standing still is a better outcome than a bot confidently running unrelated
 * or malformed code, so anything that doesn't clear the same bar as freshly
 * generated code returns null and lets VoyagerLoop idle.
 */
function recall(bestSkillCode: string) {
  const agent = new ActionAgent({ generate: vi.fn() } as any, 1000);
  const cause = Object.assign(new Error('all providers failed'), { code: 'AI_DISABLED' });
  return (agent as any).recallSkillAsCode(bestSkillCode, 'gather wood', cause);
}

describe('ActionAgent memory fallback', () => {
  it('recalls a learned skill when the LLM is unavailable', () => {
    const skill = `async function gatherWood(bot) {
  await mineBlock("oak_log", 8);
}`;
    const result = recall(skill);
    expect(result).not.toBeNull();
    expect(result.functionName).toBe('gatherWood');
    expect(result.functionCode).toContain('mineBlock("oak_log", 8)');
  });

  it('idles rather than guessing when memory has no match', () => {
    expect(recall('')).toBeNull();
    expect(recall('   ')).toBeNull();
  });

  it('refuses a recalled skill that trips the empty-arg guard', () => {
    // This exact shape is what burned a cycle on 2026-08-07: mineBlock("")
    // throws at runtime every time, so replaying it from memory would just
    // reproduce the failure without an LLM available to correct it.
    const poisoned = `async function gatherWood(bot) {
  await mineBlock("", 8);
}`;
    expect(recall(poisoned)).toBeNull();
  });

  it('applies the same null guards generated code gets', () => {
    const skill = `async function findTree(bot) {
  const block = bot.findBlock({ matching: b => b.name === "oak_log", maxDistance: 32 });
  await moveTo(block.position.x, block.position.y, block.position.z);
}`;
    const result = recall(skill);
    expect(result).not.toBeNull();
    expect(result.functionCode).toContain('if (!block)');
  });
});
