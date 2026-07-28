import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const minecraftData = require('minecraft-data')('1.21.11');
const Block = require('prismarine-block')('1.21.11');
const completedStateCache = new Map();
const defaultPropertiesCache = new Map();

function splitState(rawState) {
  const source = String(rawState);
  const bracket = source.indexOf('[');
  if (bracket < 0) return { name: source, properties: new Map() };
  if (!source.endsWith(']')) {
    throw new Error(`malformed block state: ${source}`);
  }
  const properties = new Map();
  for (const field of source.slice(bracket + 1, -1).split(',').filter(Boolean)) {
    const separator = field.indexOf('=');
    if (separator <= 0 || separator === field.length - 1) {
      throw new Error(`malformed block-state property: ${source}`);
    }
    const name = field.slice(0, separator);
    if (properties.has(name)) {
      throw new Error(`duplicate block-state property ${name}: ${source}`);
    }
    properties.set(name, field.slice(separator + 1));
  }
  return { name: source.slice(0, bracket), properties };
}

function defaultProperties(blockName, definition) {
  if (!defaultPropertiesCache.has(blockName)) {
    const block = Block.fromStateId(definition.defaultState, 0);
    defaultPropertiesCache.set(
      blockName,
      new Map(
        Object.entries(block.getProperties())
          .map(([name, value]) => [name, String(value)]),
      ),
    );
  }
  return defaultPropertiesCache.get(blockName);
}

/**
 * Return a canonical, complete Minecraft block state.
 *
 * Authored properties override the server-version defaults. Every property
 * declared by minecraft-data is emitted, sorted by name, so RCON guards never
 * rely on Minecraft's permissive omitted-property matching.
 */
export function completeBlockState(rawState) {
  const source = String(rawState);
  const cached = completedStateCache.get(source);
  if (cached) return cached;

  const { name, properties } = splitState(source);
  const shortName = name.replace(/^minecraft:/, '');
  const definition = minecraftData.blocksByName[shortName];
  if (!definition) throw new Error(`unknown Minecraft block state: ${source}`);

  const required = new Set((definition.states ?? []).map((state) => state.name));
  for (const property of properties.keys()) {
    if (!required.has(property)) {
      throw new Error(`unknown property ${property} for ${name}: ${source}`);
    }
  }

  const completed = new Map(defaultProperties(shortName, definition));
  for (const [property, value] of properties) completed.set(property, value);
  const fields = [...completed.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([property, value]) => `${property}=${value}`);
  const result = fields.length === 0 ? name : `${name}[${fields.join(',')}]`;
  completedStateCache.set(source, result);
  return result;
}

