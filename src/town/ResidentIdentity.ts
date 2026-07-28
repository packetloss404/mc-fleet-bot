import type { Resident } from './Town';

export interface ResidentIdentityMatch {
  resident: Resident;
  match: 'exact' | 'single-substitution';
}

function differsByOneSubstitution(left: string, right: string): boolean {
  if (left.length !== right.length || left.length < 4) return false;
  let differences = 0;
  for (let i = 0; i < left.length; i++) {
    if (left[i] === right[i]) continue;
    differences++;
    if (differences > 1) return false;
  }
  return differences === 1;
}

/**
 * Resolve a live bot against a persisted resident identity.
 *
 * Exact case-insensitive matching always wins. A single-character
 * substitution is accepted only when it identifies exactly one resident.
 * This narrowly recovers configuration drift such as live `Scott` versus
 * persisted `Scout` without guessing between ambiguous names.
 */
export function resolveResidentIdentity(
  botName: string,
  residents: Resident[],
): ResidentIdentityMatch | null {
  const normalized = botName.trim().toLowerCase();
  if (!normalized) return null;

  const exact = residents.filter((resident) =>
    resident.botName.trim().toLowerCase() === normalized);
  // BotManager resolves across every town. A duplicate persisted identity is
  // therefore ambiguous even when the spelling is exact; selecting whichever
  // town happened to be returned first could inject the wrong role and rules.
  if (exact.length === 1) return { resident: exact[0], match: 'exact' };
  if (exact.length > 1) return null;

  const near = residents.filter((resident) =>
    differsByOneSubstitution(normalized, resident.botName.trim().toLowerCase()));
  if (near.length !== 1) return null;
  return { resident: near[0], match: 'single-substitution' };
}
