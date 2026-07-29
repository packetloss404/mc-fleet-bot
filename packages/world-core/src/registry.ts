import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { DevtoolsError } from './errors.js';
import { assertIdentifier, resolveInside } from './files.js';
import type {
  FleetRegistry,
  ResolvedWorld,
  ServerDefinition,
  WorldDefinition,
} from './types.js';

function requireString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DevtoolsError(`${field} must be a non-empty string`, 'INVALID_REGISTRY');
  }
}

function parseWorld(input: unknown, field: string): WorldDefinition {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DevtoolsError(`${field} must be an object`, 'INVALID_REGISTRY');
  }
  const value = input as Record<string, unknown>;
  requireString(value.id, `${field}.id`);
  requireString(value.name, `${field}.name`);
  requireString(value.dimension, `${field}.dimension`);
  requireString(value.snapshot, `${field}.snapshot`);
  assertIdentifier(value.id, `${field}.id`);
  const databases: Record<string, string> = {};
  if (value.databases !== undefined) {
    if (!value.databases || typeof value.databases !== 'object' || Array.isArray(value.databases)) {
      throw new DevtoolsError(`${field}.databases must be a map`, 'INVALID_REGISTRY');
    }
    for (const [key, filename] of Object.entries(value.databases)) {
      assertIdentifier(key, `${field}.databases key`);
      requireString(filename, `${field}.databases.${key}`);
      databases[key] = filename;
    }
  }
  return {
    id: value.id,
    name: value.name,
    dimension: value.dimension,
    snapshot: value.snapshot,
    databases,
    metadata: value.metadata as Record<string, unknown> | undefined,
  };
}

function parseServer(input: unknown, field: string): ServerDefinition {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DevtoolsError(`${field} must be an object`, 'INVALID_REGISTRY');
  }
  const value = input as Record<string, unknown>;
  requireString(value.id, `${field}.id`);
  requireString(value.name, `${field}.name`);
  assertIdentifier(value.id, `${field}.id`);
  if (!value.connector || typeof value.connector !== 'object' || Array.isArray(value.connector)) {
    throw new DevtoolsError(`${field}.connector must be an object`, 'INVALID_REGISTRY');
  }
  const connector = value.connector as Record<string, unknown>;
  if (connector.kind !== 'local') {
    throw new DevtoolsError(
      `${field}.connector.kind must be local in the read-only MVP`,
      'UNSUPPORTED_CONNECTOR',
    );
  }
  requireString(connector.root, `${field}.connector.root`);
  if (!path.isAbsolute(connector.root)) {
    throw new DevtoolsError(
      `${field}.connector.root must be absolute`,
      'INVALID_REGISTRY',
    );
  }
  if (!Array.isArray(value.worlds) || value.worlds.length === 0) {
    throw new DevtoolsError(`${field}.worlds must be a non-empty list`, 'INVALID_REGISTRY');
  }
  const worlds = value.worlds.map((world, index) => parseWorld(world, `${field}.worlds[${index}]`));
  const worldIds = new Set<string>();
  for (const world of worlds) {
    if (worldIds.has(world.id)) {
      throw new DevtoolsError(`Duplicate world id ${world.id}`, 'DUPLICATE_ID');
    }
    worldIds.add(world.id);
  }
  return {
    id: value.id,
    name: value.name,
    connector: {
      kind: 'local',
      root: path.resolve(connector.root),
    },
    worlds,
    metadata: value.metadata as Record<string, unknown> | undefined,
  };
}

export function parseRegistry(input: unknown): FleetRegistry {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DevtoolsError('Registry must be an object', 'INVALID_REGISTRY');
  }
  const value = input as Record<string, unknown>;
  if (value.version !== 1) {
    throw new DevtoolsError('Registry version must be 1', 'INVALID_REGISTRY');
  }
  if (!Array.isArray(value.servers)) {
    throw new DevtoolsError('Registry servers must be a list', 'INVALID_REGISTRY');
  }
  const servers = value.servers.map((server, index) => parseServer(server, `servers[${index}]`));
  const serverIds = new Set<string>();
  for (const server of servers) {
    if (serverIds.has(server.id)) {
      throw new DevtoolsError(`Duplicate server id ${server.id}`, 'DUPLICATE_ID');
    }
    serverIds.add(server.id);
  }
  return { version: 1, servers };
}

export function loadRegistry(filename: string): FleetRegistry {
  const resolved = path.resolve(filename);
  if (!fs.existsSync(resolved)) {
    throw new DevtoolsError(
      `Registry file not found: ${resolved}`,
      'REGISTRY_NOT_FOUND',
      { filename: resolved },
    );
  }
  return parseRegistry(yaml.load(fs.readFileSync(resolved, 'utf8')));
}

export function resolveWorld(
  registry: FleetRegistry,
  serverId: string,
  worldId: string,
): ResolvedWorld {
  const server = registry.servers.find((candidate) => candidate.id === serverId);
  if (!server) {
    throw new DevtoolsError(`Unknown server: ${serverId}`, 'SERVER_NOT_FOUND');
  }
  const world = server.worlds.find((candidate) => candidate.id === worldId);
  if (!world) {
    throw new DevtoolsError(
      `Unknown world ${worldId} on server ${serverId}`,
      'WORLD_NOT_FOUND',
    );
  }
  const root = server.connector.root;
  const databases = Object.fromEntries(
    Object.entries(world.databases ?? {}).map(([key, filename]) => [
      key,
      resolveInside(root, filename, `database ${key}`),
    ]),
  );
  return {
    server,
    world,
    root,
    snapshotDirectory: resolveInside(root, world.snapshot, 'snapshot'),
    databases,
  };
}
