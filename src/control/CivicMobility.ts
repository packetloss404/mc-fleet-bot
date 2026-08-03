export interface CivicPoint {
  x: number;
  z: number;
}

export interface CivicDestination extends CivicPoint {
  name: string;
  radius: number;
}

export interface CivicCorridor {
  name: string;
  width: number;
  waypoints: CivicPoint[];
}

export interface CivicMobilityBoundary extends CivicPoint {
  radius: number;
  destinations?: CivicDestination[];
  corridors?: CivicCorridor[];
}

function distanceToSegment(
  point: CivicPoint,
  start: CivicPoint,
  end: CivicPoint,
): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.z - start.z);
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared,
    ),
  );
  const nearestX = start.x + projection * dx;
  const nearestZ = start.z + projection * dz;
  return Math.hypot(point.x - nearestX, point.z - nearestZ);
}

/**
 * Distance from a point to the closest approved civic movement area.
 *
 * A boundary consists of the resident's home district, explicitly named
 * destination circles, and surveyed waypoint corridors. Returning zero means
 * the point is approved. This is intentionally movement-only: mining/build
 * geofences remain separate and continue to protect authored structures.
 */
export function distanceToCivicMobility(
  boundary: CivicMobilityBoundary,
  point: CivicPoint,
): number {
  let best = Math.max(0, Math.hypot(point.x - boundary.x, point.z - boundary.z) - boundary.radius);

  for (const destination of boundary.destinations ?? []) {
    best = Math.min(
      best,
      Math.max(
        0,
        Math.hypot(point.x - destination.x, point.z - destination.z) - destination.radius,
      ),
    );
  }

  for (const corridor of boundary.corridors ?? []) {
    const waypoints = corridor.waypoints ?? [];
    for (let i = 1; i < waypoints.length; i++) {
      best = Math.min(
        best,
        Math.max(
          0,
          distanceToSegment(point, waypoints[i - 1], waypoints[i]) - corridor.width,
        ),
      );
    }
  }

  return best;
}

export function isInsideCivicMobility(
  boundary: CivicMobilityBoundary,
  point: CivicPoint,
): boolean {
  return distanceToCivicMobility(boundary, point) <= 0;
}

/**
 * Permit a target inside an approved area, or an out-of-bounds recovery move
 * that strictly decreases distance to the nearest approved area.
 */
export function canMoveWithinCivicMobility(
  boundary: CivicMobilityBoundary,
  current: CivicPoint,
  target: CivicPoint,
): boolean {
  const targetDistance = distanceToCivicMobility(boundary, target);
  if (targetDistance <= 0) return true;
  return targetDistance < distanceToCivicMobility(boundary, current);
}

/**
 * mineflayer-pathfinder exclusion policy for an intermediate A* step.
 *
 * Goal validation alone is insufficient: two legal endpoints could otherwise
 * be connected by a shortcut outside the reviewed corridor. Monotonic recovery
 * remains possible when a bot begins outside every approved area.
 */
export function getCivicStepExclusionCost(
  boundary: CivicMobilityBoundary,
  current: CivicPoint,
  block: { position?: { x?: number; z?: number } } | null | undefined,
): number {
  const position = block?.position;
  if (
    typeof position?.x !== 'number' || !Number.isFinite(position.x) ||
    typeof position?.z !== 'number' || !Number.isFinite(position.z)
  ) {
    // This callback is the final A* boundary for intermediate steps. An
    // uninspectable candidate cannot be shown to belong to an approved civic
    // area, so fail closed instead of silently turning the leash off.
    return 100;
  }
  return canMoveWithinCivicMobility(
    boundary,
    current,
    { x: position.x, z: position.z },
  ) ? 0 : 100;
}
