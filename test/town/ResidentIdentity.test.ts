import { describe, expect, it } from 'vitest';

import type { Resident } from '../../src/town/Town';
import { resolveResidentIdentity } from '../../src/town/ResidentIdentity';

function resident(botName: string): Resident {
  return {
    id: `resident-${botName}`,
    townId: 'ravensreach',
    botName,
    joinedAt: 1,
    currentRole: 'lumberjack',
    status: 'alive',
  };
}

describe('resolveResidentIdentity', () => {
  it('prefers exact case-insensitive identity matching', () => {
    const result = resolveResidentIdentity('SCOTT', [resident('Scott'), resident('Scout')]);
    expect(result).toMatchObject({ match: 'exact', resident: { botName: 'Scott' } });
  });

  it('recovers the unique live Scott / persisted Scout substitution', () => {
    const result = resolveResidentIdentity('Scott', [resident('Scout'), resident('Mason')]);
    expect(result).toMatchObject({
      match: 'single-substitution',
      resident: { botName: 'Scout' },
    });
  });

  it('refuses duplicate exact identities across towns', () => {
    const first = resident('Scott');
    const second = { ...resident('SCOTT'), id: 'resident-scott-duplicate', townId: 'mainstreet' };
    expect(resolveResidentIdentity('Scott', [first, second])).toBeNull();
  });

  it('refuses ambiguous or insertion/deletion guesses', () => {
    expect(resolveResidentIdentity(
      'Scott',
      [resident('Scout'), resident('Scatt')],
    )).toBeNull();
    expect(resolveResidentIdentity('Scott', [resident('Scot')])).toBeNull();
  });
});
