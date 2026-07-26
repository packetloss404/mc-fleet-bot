import type { JsonObject } from '@minebotai/shared/types';
import { SkillLibrary } from '../voyager/SkillLibrary';

export type PrimitiveArgumentType = 'string' | 'number' | 'boolean' | 'object';

export interface PrimitiveArgumentSpec {
  name: string;
  type: PrimitiveArgumentType;
  required?: boolean;
  default?: string | number | boolean | JsonObject;
  description: string;
}

export interface PrimitiveCatalogEntry {
  name: string;
  description: string;
  argumentSchema: PrimitiveArgumentSpec[];
  executor: 'code-executor';
  tags: string[];
}

export interface SkillCatalogMatch {
  name: string;
  description: string;
  score: number;
  hasCode: boolean;
}

export interface ActuationCatalog {
  primitives: PrimitiveCatalogEntry[];
}

const UNABORTABLE_PRIMITIVE_NAMES = new Set([
  'mineBlock',
  'craftItem',
  'smeltItem',
  'placeItem',
  'moveTo',
  'killMob',
  'withdrawItem',
  'depositItem',
  'inspectContainer',
  'dropJunk',
]);

export const PRIMITIVE_CATALOG: readonly PrimitiveCatalogEntry[] = [
  {
    name: 'chat',
    description: 'Send one bounded in-game chat message without issuing a slash command.',
    argumentSchema: [
      { name: 'message', type: 'string', required: true, description: 'Plain chat message to send.' },
    ],
    executor: 'code-executor',
    tags: ['chat', 'communication', 'bounded'],
  },
  {
    name: 'mineBlock',
    description: 'Mine one or more blocks by Minecraft block name.',
    argumentSchema: [
      { name: 'name', type: 'string', required: true, description: 'Minecraft block name, for example oak_log or cobblestone.' },
      { name: 'count', type: 'number', default: 1, description: 'Number of matching blocks to mine.' },
    ],
    executor: 'code-executor',
    tags: ['gather', 'mine', 'resource'],
  },
  {
    name: 'craftItem',
    description: 'Craft items from inventory ingredients.',
    argumentSchema: [
      { name: 'name', type: 'string', required: true, description: 'Minecraft item name to craft.' },
      { name: 'count', type: 'number', default: 1, description: 'Number of items to craft.' },
    ],
    executor: 'code-executor',
    tags: ['craft', 'inventory'],
  },
  {
    name: 'smeltItem',
    description: 'Smelt an item with a named fuel.',
    argumentSchema: [
      { name: 'itemName', type: 'string', required: true, description: 'Input item to smelt.' },
      { name: 'fuelName', type: 'string', required: true, description: 'Fuel item name.' },
      { name: 'count', type: 'number', default: 1, description: 'Number of items to smelt.' },
    ],
    executor: 'code-executor',
    tags: ['smelt', 'furnace'],
  },
  {
    name: 'placeItem',
    description: 'Place a block from inventory at exact coordinates.',
    argumentSchema: [
      { name: 'name', type: 'string', required: true, description: 'Block item name to place.' },
      { name: 'x', type: 'number', required: true, description: 'Target X coordinate.' },
      { name: 'y', type: 'number', required: true, description: 'Target Y coordinate.' },
      { name: 'z', type: 'number', required: true, description: 'Target Z coordinate.' },
    ],
    executor: 'code-executor',
    tags: ['build', 'place'],
  },
  {
    name: 'moveTo',
    description: 'Move near a target coordinate.',
    argumentSchema: [
      { name: 'x', type: 'number', required: true, description: 'Target X coordinate.' },
      { name: 'y', type: 'number', required: true, description: 'Target Y coordinate.' },
      { name: 'z', type: 'number', required: true, description: 'Target Z coordinate.' },
      { name: 'range', type: 'number', default: 2, description: 'Acceptable distance from target.' },
      { name: 'timeoutSec', type: 'number', default: 15, description: 'Maximum movement time.' },
    ],
    executor: 'code-executor',
    tags: ['move', 'navigation'],
  },
  {
    name: 'killMob',
    description: 'Attack the nearest matching mob for a bounded duration.',
    argumentSchema: [
      { name: 'name', type: 'string', required: true, description: 'Mob name to target.' },
      { name: 'maxDuration', type: 'number', default: 30000, description: 'Maximum attack duration in milliseconds.' },
    ],
    executor: 'code-executor',
    tags: ['combat', 'defend'],
  },
  {
    name: 'withdrawItem',
    description: 'Withdraw items from a named nearby container.',
    argumentSchema: [
      { name: 'containerName', type: 'string', required: true, description: 'Container block name.' },
      { name: 'itemName', type: 'string', required: true, description: 'Item to withdraw.' },
      { name: 'count', type: 'number', default: 1, description: 'Number of items to withdraw.' },
    ],
    executor: 'code-executor',
    tags: ['container', 'supply'],
  },
  {
    name: 'depositItem',
    description: 'Deposit items into a named nearby container.',
    argumentSchema: [
      { name: 'containerName', type: 'string', required: true, description: 'Container block name.' },
      { name: 'itemName', type: 'string', required: true, description: 'Item to deposit.' },
      { name: 'count', type: 'number', default: 1, description: 'Number of items to deposit.' },
    ],
    executor: 'code-executor',
    tags: ['container', 'supply'],
  },
  {
    name: 'inspectContainer',
    description: 'Inspect contents of a named nearby container.',
    argumentSchema: [
      { name: 'containerName', type: 'string', required: true, description: 'Container block name.' },
    ],
    executor: 'code-executor',
    tags: ['container', 'inventory'],
  },
  {
    name: 'dropJunk',
    description: 'Drop low-value junk items when inventory is near full.',
    argumentSchema: [
      { name: 'minFreeSlots', type: 'number', default: 6, description: 'Target number of free inventory slots.' },
      { name: 'thresholdUsedSlots', type: 'number', default: 30, description: 'Only drop when used slots are at or above this threshold.' },
    ],
    executor: 'code-executor',
    tags: ['inventory', 'cleanup'],
  },
] as const;

export function getActuationCatalog(): ActuationCatalog {
  return {
    primitives: PRIMITIVE_CATALOG
      .filter((entry) => !UNABORTABLE_PRIMITIVE_NAMES.has(entry.name))
      .map((entry) => ({ ...entry, argumentSchema: entry.argumentSchema.map((arg) => ({ ...arg })) })),
  };
}

export function getPrimitiveCatalog(): PrimitiveCatalogEntry[] {
  return getActuationCatalog().primitives;
}

export function findPrimitive(name: string): PrimitiveCatalogEntry | null {
  const normalized = name.trim().toLowerCase();
  return PRIMITIVE_CATALOG.find((entry) => entry.name.toLowerCase() === normalized) ?? null;
}

export async function lookupSkills(
  skillLibrary: SkillLibrary,
  match: string,
  limit = 5,
): Promise<SkillCatalogMatch[]> {
  const boundedLimit = Math.max(1, Math.min(25, Math.floor(limit)));
  const matches = await skillLibrary.searchWithScores(match, boundedLimit);
  return matches.map((matchResult) => {
    const name = matchResult.entry.name;
    return {
      name,
      description: matchResult.entry.description,
      score: matchResult.score,
      hasCode: skillLibrary.getCode(name) !== null,
    };
  });
}
