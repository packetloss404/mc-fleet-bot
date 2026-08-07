import { describe, it, expect } from 'vitest';
import { ChronicleGenerator } from '../../src/town/ChronicleGenerator';

/**
 * The chronicle "daily" budget must be keyed on the REAL calendar day. It
 * used to key on the chronicle dayNumber — a 20-minute window — so the cap
 * got 72 fresh buckets per real day and could never trip (828 paid entries
 * accumulated for an idle town, 2026-08 audit).
 */
describe('chronicle real-day budget', () => {
  const town: any = { id: 't1', config: { chronicleBudgetUsd: 0.1 } };
  const fakeTownManager: any = {
    // No getDataDir → ledger persistence is skipped; in-memory only.
  };

  it('accumulates across chronicle dayNumbers within one real day', () => {
    const gen: any = new ChronicleGenerator(fakeTownManager, null);
    gen.recordCost('t1', 1, 0.05);
    gen.recordCost('t1', 2, 0.05); // different game day, same real day
    // Old code: fresh bucket per dayNumber → never over budget.
    expect(gen.isOverBudget('t1', 3, town)).toBe(true);
  });

  it('stays under budget when spend is genuinely below the cap', () => {
    const gen: any = new ChronicleGenerator(fakeTownManager, null);
    gen.recordCost('t1', 1, 0.05);
    expect(gen.isOverBudget('t1', 2, town)).toBe(false);
  });

  it('resolves the LLM client per call via the provider (reload/late-bind safe)', async () => {
    let client: any = null;
    const gen: any = new ChronicleGenerator(fakeTownManager, () => client);
    expect(gen.llm).toBeNull();
    client = { generate: async () => ({ text: 'x' }) };
    expect(gen.llm).toBe(client); // a captured snapshot would still be null
  });
});
