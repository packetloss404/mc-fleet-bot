import { describe, it, expect } from 'vitest';

import { BotManager } from '../../src/bot/BotManager';

/**
 * Regression tests for the ghost-name false-positive storm observed 2026-07-25.
 *
 * After a host reboot, Scout and Surveyor each produced four "Impersonation detected"
 * incidents ~0.9s apart while both bots were in fact healthy. Cause: when a bot logs
 * back in, the server broadcasts its join to every OTHER worker's tab list, and those
 * relays arrive before the reconnecting bot's own status heartbeat has moved it off
 * DISCONNECTED — so its own reconnect looked exactly like an impostor wearing its name,
 * once per observing bot.
 *
 * The fix is to CONFIRM rather than alert live: wait out a normal reconnect, then re-read
 * the state. QUARANTINED is exempt, because auto-reconnect is disabled for a quarantined
 * bot and it will not return on its own.
 */
describe('BotManager.classifyOwnNameSighting', () => {
  it('defers judgement when our bot is DISCONNECTED — this is the false-positive case', () => {
    // A reconnecting bot sits in DISCONNECTED while its own join is relayed to us.
    expect(BotManager.classifyOwnNameSighting('join', 'DISCONNECTED', true)).toBe('confirm-later');
  });

  it('alerts immediately when our bot is QUARANTINED (auto-reconnect is disabled)', () => {
    expect(BotManager.classifyOwnNameSighting('join', 'QUARANTINED', true)).toBe('alert-now');
  });

  it('ignores sightings of a healthy bot — its name in the tab list is just itself', () => {
    for (const state of ['IDLE', 'SPAWNING', 'EXECUTING', 'INSTINCT', 'PAUSED']) {
      expect(BotManager.classifyOwnNameSighting('join', state, true)).toBe('ignore');
    }
  });

  it('ignores leave events entirely', () => {
    expect(BotManager.classifyOwnNameSighting('leave', 'DISCONNECTED', true)).toBe('ignore');
    expect(BotManager.classifyOwnNameSighting('leave', 'QUARANTINED', true)).toBe('ignore');
  });

  it('ignores everything when impersonation detection is disabled', () => {
    expect(BotManager.classifyOwnNameSighting('join', 'DISCONNECTED', false)).toBe('ignore');
    expect(BotManager.classifyOwnNameSighting('join', 'QUARANTINED', false)).toBe('ignore');
  });

  it('ignores an unknown/absent state rather than alerting on it', () => {
    // A worker with no cached status yet must not be treated as evidence of an impostor.
    expect(BotManager.classifyOwnNameSighting('join', undefined, true)).toBe('ignore');
  });
});

describe('BotManager.ghostNameConfirmed', () => {
  it('confirms the impostor when the bot is STILL offline after the grace period', () => {
    expect(BotManager.ghostNameConfirmed('DISCONNECTED')).toBe(true);
    expect(BotManager.ghostNameConfirmed('QUARANTINED')).toBe(true);
  });

  it('clears the suspicion once the bot is back — the join was its own reconnect', () => {
    for (const state of ['IDLE', 'SPAWNING', 'EXECUTING', 'INSTINCT', 'PAUSED']) {
      expect(BotManager.ghostNameConfirmed(state)).toBe(false);
    }
  });

  it('does not confirm on an absent state', () => {
    expect(BotManager.ghostNameConfirmed(undefined)).toBe(false);
  });
});
