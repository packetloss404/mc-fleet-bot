import type { GeneratedCode } from './ActionAgent';
import type { Task } from './CurriculumAgent';

export interface CivicShiftWaypoint {
  x: number;
  y: number;
  z: number;
}

const MAX_WAYPOINTS = 64;
const SHIFT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const DESTINATION_INSPECTION_TICKS = 200;
const HOME_CONFIRMATION_TICKS = 220;

/**
 * Extract the reviewed, explicit route carried by a citizenRoutine shift.
 *
 * Ordinary prose tasks deliberately return null. Only ScheduleManager shifts
 * carry both the civic-shift contract keyword and a stable shift ID, so stale
 * learned skills and coincidental coordinates cannot trigger this executor.
 */
export function parseApprovedCivicShiftWaypoints(
  task: Pick<Task, 'description' | 'keywords' | 'metadata'>,
): CivicShiftWaypoint[] | null {
  const keywords = task.keywords ?? [];
  const metadata = task.metadata;
  if (
    !keywords.includes('civic-shift')
    || !metadata
    || metadata.kind !== 'civic-shift'
    || metadata.version !== 2
    || metadata.roundTrip !== true
    || typeof metadata.destinationActivity !== 'string'
    || metadata.destinationActivity.trim().length === 0
    || metadata.destinationActivity.length > 500
    || typeof metadata.shiftId !== 'string'
    || !SHIFT_ID_PATTERN.test(metadata.shiftId)
  ) {
    return null;
  }
  const shiftKeywords = keywords.filter((keyword) => keyword.startsWith('shift:'));
  if (
    shiftKeywords.length !== 1
    || shiftKeywords[0] !== `shift:${metadata.shiftId}`
    || !Array.isArray(metadata.waypoints)
    || metadata.waypoints.length < 2
    || metadata.waypoints.length > MAX_WAYPOINTS
  ) return null;

  const points: CivicShiftWaypoint[] = [];
  for (const candidate of metadata.waypoints) {
    if (!candidate || typeof candidate !== 'object') return null;
    const waypoint = candidate as Record<string, unknown>;
    const { x, y, z } = waypoint;
    if (
      typeof x !== 'number' || !Number.isSafeInteger(x) ||
      typeof y !== 'number' || !Number.isSafeInteger(y) ||
      typeof z !== 'number' || !Number.isSafeInteger(z) ||
      y < -64 ||
      y > 320
    ) {
      return null;
    }
    const point: CivicShiftWaypoint = { x, y, z };
    const previous = points[points.length - 1];
    if (!previous || previous.x !== point.x || previous.y !== point.y || previous.z !== point.z) {
      points.push(point);
    }
  }

  return points.length >= 2 ? points : null;
}

/**
 * Build a deterministic no-edit round-trip program for a reviewed civic shift.
 *
 * This bypasses semantic saved-skill reuse: a task such as "inspect the staff
 * area" must not replay an old-world mining or shelter skill simply because
 * some words overlap. At the reviewed destination the citizen performs a
 * bounded visual inspection, then follows the exact route in reverse and
 * pauses at the origin long enough for the runtime observer to verify the
 * return. The normal CodeExecutor and raw pathfinder civic boundaries still
 * validate every individual waypoint at runtime.
 */
export function buildApprovedCivicShiftCode(
  task: Pick<Task, 'description' | 'keywords' | 'metadata'>,
): GeneratedCode | null {
  const waypoints = parseApprovedCivicShiftWaypoints(task);
  if (!waypoints) return null;

  const literal = JSON.stringify(waypoints);
  const functionName = 'performApprovedCivicShiftRoundTrip';
  const functionCode = `async function ${functionName}(bot) {
  const waypoints = ${literal};
  const follow = async (points, leg) => {
    for (const point of points) {
      let reached = false;
      for (let attempt = 1; attempt <= 2 && !reached; attempt += 1) {
        reached = await moveTo(point.x, point.y, point.z, 1, 45);
        if (!reached && attempt < 2) await bot.waitForTicks(20);
      }
      if (!reached) {
        throw new Error(\`Approved civic shift \${leg} waypoint unreachable: \${point.x},\${point.y},\${point.z}\`);
      }
      await bot.waitForTicks(5);
    }
  };

  await follow(waypoints, 'outbound');

  // The current MainStreet shift catalog contains only non-destructive
  // inspections. Four deliberate sightlines plus a bounded dwell make that
  // destination activity observable without replaying a stale learned skill.
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    await bot.look(yaw, 0);
    await bot.waitForTicks(${Math.floor(DESTINATION_INSPECTION_TICKS / 4)});
  }

  await follow([...waypoints].reverse(), 'return');
  await bot.waitForTicks(${HOME_CONFIRMATION_TICKS});
}`;
  return {
    functionName,
    functionCode,
    execCode: `await ${functionName}(bot);`,
  };
}
