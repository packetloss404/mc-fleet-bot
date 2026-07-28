import { getPathfinderBreakExclusionCost } from '../actions/geofence';

interface SafetyCompatibleMovements {
  canDig: boolean;
  digCost: number;
  allow1by1towers: boolean;
  allowParkour: boolean;
  exclusionAreasBreak: Array<(block: any) => number>;
  exclusionAreasStep: Array<(block: any) => number>;
}

const installedCivicExclusions = new WeakMap<
  SafetyCompatibleMovements,
  (block: any) => number
>();

/**
 * Apply the fleet's movement safety contract to any Movements instance.
 *
 * mineflayer-collectblock owns a separate Movements instance and installs it
 * immediately before every collection task. Configuring only the bot's normal
 * pathfinder movements therefore leaves collection paths able to tunnel
 * through protected builds. This helper is intentionally reusable for both
 * instances and idempotent across respawns.
 */
export function applyPathfinderMovementSafety<T extends SafetyCompatibleMovements>(
  movements: T,
  civicStepExclusion?: (block: any) => number,
): T {
  movements.canDig = true;
  movements.digCost = 12;
  movements.allow1by1towers = false;
  movements.allowParkour = false;
  if (!movements.exclusionAreasBreak.includes(getPathfinderBreakExclusionCost)) {
    movements.exclusionAreasBreak.push(getPathfinderBreakExclusionCost);
  }
  const previousCivicExclusion = installedCivicExclusions.get(movements);
  if (previousCivicExclusion && previousCivicExclusion !== civicStepExclusion) {
    const index = movements.exclusionAreasStep.indexOf(previousCivicExclusion);
    if (index >= 0) movements.exclusionAreasStep.splice(index, 1);
    installedCivicExclusions.delete(movements);
  }
  if (civicStepExclusion) {
    if (!movements.exclusionAreasStep.includes(civicStepExclusion)) {
      movements.exclusionAreasStep.push(civicStepExclusion);
    }
    installedCivicExclusions.set(movements, civicStepExclusion);
  }
  return movements;
}
