import type { GeneratedCode } from './ActionAgent';
import type { Task } from './CurriculumAgent';

/**
 * Common directional exploration is mechanical movement, not a code-generation
 * problem. Resolve it before semantic skill lookup so a polluted historical
 * skill cannot turn "explore" into an unrelated craft/smelt action.
 */
export function buildDeterministicExplorationCode(task: Task): GeneratedCode | null {
  const description = task.description.trim();
  const directionFirst = description.match(
    /^explore\s+(north|south|east|west)\s+for\s+(\d+)\s+blocks\b/i,
  );
  const distanceFirst = description.match(
    /^explore\s+(\d+)\s+blocks\s+(?:to\s+the\s+)?(north|south|east|west)\b/i,
  );
  const direction = (directionFirst?.[1] ?? distanceFirst?.[2])?.toLowerCase();
  const blocks = Number(directionFirst?.[2] ?? distanceFirst?.[1]);
  if (!direction || !Number.isSafeInteger(blocks) || blocks < 1 || blocks > 512) return null;

  const functionName = 'exploreDirectionForDistance';
  const functionCode = `async function ${functionName}(bot, direction, blocks) {
  const vectors = {
    north: { x: 0, z: -1 },
    south: { x: 0, z: 1 },
    east: { x: 1, z: 0 },
    west: { x: -1, z: 0 },
  };
  const vector = vectors[direction];
  if (!vector) throw new Error('invalid exploration direction: ' + direction);
  const start = bot.entity.position;
  const reached = await moveTo(
    start.x + vector.x * blocks,
    start.y,
    start.z + vector.z * blocks,
    3,
    30,
  );
  if (!reached) throw new Error('directional exploration destination was not reached');
}`;
  return {
    functionName,
    functionCode,
    execCode: `await ${functionName}(bot, '${direction}', ${blocks});`,
  };
}
