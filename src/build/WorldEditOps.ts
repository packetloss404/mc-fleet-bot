/**
 * Bulk world edits driven through an opped bot's WorldEdit session.
 *
 * Why this exists
 * ---------------
 * Every bulk edit in this codebase issues vanilla `/fill` through `handle.chat()`.
 * That forces four permanent workarounds:
 *
 *   - `/fill` silently no-ops above 32,768 blocks, so every call site hand-chunks
 *     into <=32-cube sub-boxes (trap #3). `demolishBuild` does exactly this.
 *   - `/fill` only touches LOADED chunks, so remote work needs a manual forceload.
 *   - There is no undo. Recovering the building a cleanup script destroyed on
 *     2026-07-25 took a bespoke snapshot diff-and-replay and four hours.
 *   - `/fill` takes one block, so no weighted/speckled patterns are expressible.
 *
 * WorldEdit fixes all four, but needs a *player* to hold the selection session --
 * the console has none, which is why the scripts fell back to `/fill` originally.
 * We already run opped, player-shaped mineflayer bots, and they issue commands
 * through the very same `handle.chat()` channel. So this is a substitution, not a
 * re-plumb.
 *
 * Verified end-to-end on this server 2026-07-26, including inside the
 * `mainstreet_america` WorldGuard region: `//set glass` -> "Operation completed
 * (125 blocks affected)", `//undo` -> "Undid 1 available edits.", both confirmed by
 * independent block probes.
 *
 * Reading the reply is the point
 * ------------------------------
 * `handle.chat()` is write-only. A command WorldGuard refused, or that hit a change
 * limit, looks exactly like one that succeeded. That is the same failure shape as
 * trap #7 and trap #10 -- a tool collapsing "could not" into something that reads as
 * "did" -- and it is how this project's worst incidents happened. So every operation
 * here is issued, read back off the bot's server-message buffer, and classified.
 * An unrecognised or absent reply is a FAILURE, never an assumed success.
 */
import { logger } from '../util/logger';

export interface WorldEditResult {
  ok: boolean;
  /** Blocks WorldEdit reported changing, or null when unparseable. */
  blocksAffected: number | null;
  replies: string[];
  reason?: string;
}

export interface Box {
  x1: number; y1: number; z1: number;
  x2: number; y2: number; z2: number;
}

/** Replies meaning the operation did NOT do what was asked. Matched as
 *  case-insensitive substrings. Deliberately broad: a false alarm costs a re-read,
 *  a missed failure costs a silent no-op mistaken for success. */
const FAILURE_MARKERS = [
  'you are not permitted', 'permission', 'denied', 'no such', 'unknown command',
  'incorrect argument', 'invalid', 'make a region selection', 'first select',
  'too large', 'max changed', 'error', 'exception', 'failed', 'cannot',
];
/** Substrings containing a failure marker that are in fact fine. */
const BENIGN = ['block change limit set to'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Read the bot's captured server messages newer than `since`.
 *  Rides the cached worker status, which the worker pushes on payload change every
 *  ~2s (the 30s constant is only a forced heartbeat for unchanged payloads). */
function messagesSince(handle: any, since: number): string[] {
  try {
    const status = handle?.getCachedStatus?.();
    const msgs: Array<{ t: number; text: string }> = status?.serverMessages ?? [];
    return msgs.filter((m) => m.t > since).map((m) => m.text);
  } catch {
    return [];
  }
}

/** Issue one command and wait for the server to say something back. */
async function issue(
  handle: any,
  command: string,
  settleMs: number,
): Promise<string[]> {
  // Poll interval is derived from the settle window rather than hardcoded, so tests
  // can drive this with a small window instead of waiting real seconds. Capped at 1s
  // because the worker pushes status on change roughly that often.
  const poll = Math.max(1, Math.min(1000, Math.floor(settleMs / 4)));
  const since = Date.now() - 1;
  handle.chat(command);
  const deadline = Date.now() + settleMs;
  let replies: string[] = [];
  do {
    await sleep(poll);
    replies = messagesSince(handle, since);
    if (replies.length) {
      // Beat for a multi-line reply to finish arriving.
      await sleep(poll);
      replies = messagesSince(handle, since);
      break;
    }
  } while (Date.now() < deadline);
  return replies;
}

function classify(replies: string[]): { ok: boolean; blocks: number | null } {
  if (!replies.length) {
    // Silence is NOT success. Some commands are quiet, but we cannot distinguish
    // "quiet success" from "never arrived", so we refuse to guess.
    return { ok: false, blocks: null };
  }
  let ok = true;
  let blocks: number | null = null;
  for (const text of replies) {
    const low = text.toLowerCase();
    const m = low.match(/operation completed \((\d+) blocks? affected\)/);
    if (m) blocks = Number(m[1]);
    if (BENIGN.some((b) => low.includes(b))) continue;
    if (FAILURE_MARKERS.some((f) => low.includes(f))) ok = false;
  }
  return { ok, blocks };
}

/**
 * Fill `box` with `pattern` in ONE WorldEdit operation, regardless of volume.
 *
 * `pattern` is full WorldEdit pattern syntax, so weighted mixes work:
 *   `70%stone,15%mossy_cobblestone,10%andesite,5%emerald_ore`
 *
 * `opts.mask` maps to `//replace <mask> <pattern>`, which preserves the safety
 * property this project relies on: it edits only the masked material, so pedestals,
 * reservoirs and liners are spared with no exclusion list -- exactly as
 * `fill ... replace andesite` did. We lose the chunking, not the guarantee.
 */
export async function worldEditFill(
  handle: any,
  box: Box,
  pattern: string,
  opts: { mask?: string; settleMs?: number } = {},
): Promise<WorldEditResult> {
  const settle = opts.settleMs ?? 20_000;
  if (!handle || typeof handle.chat !== 'function') {
    return { ok: false, blocksAffected: null, replies: [], reason: 'no bot handle' };
  }

  const all: string[] = [];
  // Raise the change limit first. A previous session may have left it low -- a
  // stale `//limit 500` would silently truncate a large demolish, which is exactly
  // the class of failure this module exists to stop.
  all.push(...(await issue(handle, '//limit -1', settle)));

  const p1 = await issue(handle, `//pos1 ${box.x1},${box.y1},${box.z1}`, settle);
  const p2 = await issue(handle, `//pos2 ${box.x2},${box.y2},${box.z2}`, settle);
  all.push(...p1, ...p2);

  // Both corners are checked SEPARATELY, and this is not a style preference.
  // Classifying the concatenation lets a successful //pos1 mask a silent //pos2:
  // the combined array is non-empty and carries no failure marker, so the selection
  // reads as valid while only one corner was actually set. The destructive command
  // would then run against a HALF-SET OR STALE SELECTION — potentially an entirely
  // different region than intended. A unit test caught this before it shipped.
  const sel1 = classify(p1);
  const sel2 = classify(p2);
  if (!sel1.ok || !sel2.ok) {
    return { ok: false, blocksAffected: null, replies: all, reason: 'selection failed' };
  }

  const cmd = opts.mask ? `//replace ${opts.mask} ${pattern}` : `//set ${pattern}`;
  const op = await issue(handle, cmd, settle);
  all.push(...op);

  const { ok, blocks } = classify(op);
  return {
    ok,
    blocksAffected: blocks,
    replies: all,
    reason: ok ? undefined : 'operation reply indicated failure or was absent',
  };
}

/** Undo the last `n` WorldEdit operations for this bot's session.
 *  Session-scoped and in-memory upstream; FAWE persists history to disk. */
export async function worldEditUndo(
  handle: any,
  n = 1,
  settleMs = 20_000,
): Promise<WorldEditResult> {
  if (!handle || typeof handle.chat !== 'function') {
    return { ok: false, blocksAffected: null, replies: [], reason: 'no bot handle' };
  }
  const replies = await issue(handle, n > 1 ? `//undo ${n}` : '//undo', settleMs);
  const { ok, blocks } = classify(replies);
  return { ok, blocksAffected: blocks, replies, reason: ok ? undefined : 'undo failed' };
}

/** Log a WorldEdit outcome consistently, including the replies on failure so the
 *  reason is in the log rather than requiring a re-run to discover. */
export function logWorldEditResult(context: Record<string, unknown>, r: WorldEditResult): void {
  if (r.ok) {
    logger.info({ ...context, blocksAffected: r.blocksAffected }, 'WorldEdit operation completed');
  } else {
    logger.warn({ ...context, reason: r.reason, replies: r.replies }, 'WorldEdit operation failed');
  }
}
