import { describe, it, expect } from 'vitest';
import { worldEditFill, worldEditUndo } from '../../src/build/WorldEditOps';

/**
 * A fake bot handle. `chat()` records the command and pushes whatever the script
 * says the server replies, mirroring the real path: commands go out via
 * handle.chat(), replies come back off the cached status' serverMessages buffer.
 */
function makeHandle(script: Record<string, string[]>) {
  const sent: string[] = [];
  const messages: Array<{ t: number; text: string }> = [];
  return {
    sent,
    chat(cmd: string) {
      sent.push(cmd);
      const replies = script[cmd] ?? script['*'] ?? [];
      for (const text of replies) messages.push({ t: Date.now(), text });
    },
    getCachedStatus: () => ({ serverMessages: messages }),
  };
}

const OK_SEL = {
  '//limit -1': ['Block change limit set to -1.'],
  '//pos1 0,0,0': ['First position set to (0, 0, 0).'],
  '//pos2 4,4,4': ['Second position set to (4, 4, 4) (125).'],
};
const S = { settleMs: 40 };

describe('worldEditFill', () => {
  it('parses the affected-block count from a successful operation', async () => {
    const h = makeHandle({
      ...OK_SEL,
      '//set air': ['Operation completed (125 blocks affected).'],
    });
    const r = await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 }, 'air', S);
    expect(r.ok).toBe(true);
    expect(r.blocksAffected).toBe(125);
  });

  it('issues ONE set command regardless of volume — no 32k chunking', async () => {
    const h = makeHandle({
      '//limit -1': ['Block change limit set to -1.'],
      '//pos1 0,0,0': ['First position set to (0, 0, 0).'],
      '//pos2 199,199,199': ['Second position set to (199, 199, 199) (8000000).'],
      '//set air': ['Operation completed (8000000 blocks affected).'],
    });
    // 8,000,000 blocks — 244x the vanilla /fill cap, which would need ~244 chunked
    // fills. WorldEdit takes it in one.
    const r = await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 199, y2: 199, z2: 199 }, 'air', S);
    expect(r.ok).toBe(true);
    expect(r.blocksAffected).toBe(8_000_000);
    expect(h.sent.filter((c) => c.startsWith('//set')).length).toBe(1);
  });

  it('TREATS SILENCE AS FAILURE — never an assumed success', async () => {
    // The load-bearing behaviour. A command that WorldGuard refused, or that never
    // arrived, must not read as done. This is the trap #7 / #10 failure shape.
    const h = makeHandle({ ...OK_SEL, '//set air': [] });
    const r = await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 }, 'air', S);
    expect(r.ok).toBe(false);
    expect(r.blocksAffected).toBeNull();
  });

  it('detects a permission refusal', async () => {
    const h = makeHandle({
      ...OK_SEL,
      '//set air': ["You are not permitted to do that in this region."],
    });
    const r = await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 }, 'air', S);
    expect(r.ok).toBe(false);
  });

  it('does not mistake the limit confirmation for an error', async () => {
    // "Block change limit set to -1." contains the substring "limit", which is a
    // failure marker. It must be whitelisted or every operation fails at setup.
    const h = makeHandle({
      ...OK_SEL,
      '//set air': ['Operation completed (125 blocks affected).'],
    });
    const r = await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 }, 'air', S);
    expect(r.ok).toBe(true);
  });

  it('aborts before the destructive command when selection fails', async () => {
    const h = makeHandle({
      '//limit -1': ['Block change limit set to -1.'],
      '//pos1 0,0,0': ['First position set to (0, 0, 0).'],
      '//pos2 4,4,4': [], // silence -> selection unverified
    });
    const r = await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 }, 'air', S);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('selection failed');
    // Critical: nothing destructive was issued against an unverified selection.
    expect(h.sent.some((c) => c.startsWith('//set'))).toBe(false);
  });

  it('uses //replace when a mask is given, preserving material scoping', async () => {
    // The safety property carried over from `fill ... replace <block>`: edits only
    // the masked material, so pedestals and liners are spared with no exclusion list.
    const h = makeHandle({
      ...OK_SEL,
      '//replace andesite 70%tuff,30%mossy_cobblestone': ['Operation completed (42 blocks affected).'],
    });
    const r = await worldEditFill(
      h,
      { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 },
      '70%tuff,30%mossy_cobblestone',
      { ...S, mask: 'andesite' },
    );
    expect(r.ok).toBe(true);
    expect(h.sent).toContain('//replace andesite 70%tuff,30%mossy_cobblestone');
    expect(h.sent.some((c) => c.startsWith('//set'))).toBe(false);
  });

  it('raises the change limit before operating', async () => {
    // A stale `//limit 500` left by an earlier session would silently truncate a
    // large demolish — the exact class of failure this module exists to stop.
    const h = makeHandle({ ...OK_SEL, '//set air': ['Operation completed (125 blocks affected).'] });
    await worldEditFill(h, { x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 }, 'air', S);
    expect(h.sent[0]).toBe('//limit -1');
  });

  it('fails cleanly with no bot handle', async () => {
    const r = await worldEditFill(null, { x1: 0, y1: 0, z1: 0, x2: 1, y2: 1, z2: 1 }, 'air', S);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no bot handle');
  });
});

describe('worldEditUndo', () => {
  it('reports success on a real undo reply', async () => {
    const h = makeHandle({ '//undo': ['Undid 1 available edits.'] });
    const r = await worldEditUndo(h, 1, 40);
    expect(r.ok).toBe(true);
  });

  it('treats silence as failure', async () => {
    const h = makeHandle({ '//undo': [] });
    const r = await worldEditUndo(h, 1, 40);
    expect(r.ok).toBe(false);
  });

  it('passes a count through for multi-undo', async () => {
    const h = makeHandle({ '//undo 3': ['Undid 3 available edits.'] });
    const r = await worldEditUndo(h, 3, 40);
    expect(r.ok).toBe(true);
    expect(h.sent).toContain('//undo 3');
  });
});
