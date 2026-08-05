#!/usr/bin/env node
import path from 'node:path';

import { summarizeSnapshot } from '@mc-fleet/anvil';
import { loadRecipes, ReportService } from '@mc-fleet/reporting';
import {
  DevtoolsError,
  JobStore,
  loadRegistry,
  resolvePaths,
  resolveWorld,
} from '@mc-fleet/world-core';

const HELP = `MC Fleet Devtools — read-only Minecraft world reporting

Usage:
  mc-fleet-devtools registry check
  mc-fleet-devtools server list
  mc-fleet-devtools world list [--server <id>]
  mc-fleet-devtools recipe list
  mc-fleet-devtools snapshot inspect --server <id> --world <id>
  mc-fleet-devtools report run --recipe <id> --server <id> --world <id> [--bounds x1,y1,z1,x2,y2,z2]
  mc-fleet-devtools job list
  mc-fleet-devtools job show <id>

Environment:
  MC_FLEET_REGISTRY, MC_FLEET_RECIPES, MC_FLEET_JOBS, MC_FLEET_ARTIFACTS
`;

function flag(name: string): string | undefined {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredFlag(name: string): string {
  const value = flag(name);
  if (!value) {
    throw new DevtoolsError(`Missing --${name}`, 'MISSING_ARGUMENT');
  }
  return value;
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const paths = resolvePaths({
    root,
    exampleRegistryDirectory: path.join(path.resolve(root), 'config'),
  });
  const registry = loadRegistry(paths.registryFile);
  const recipes = loadRecipes(paths.recipesDirectory);
  const jobStore = new JobStore(paths.jobsDirectory);
  const service = new ReportService({
    registry,
    recipes,
    jobStore,
    artifactRoot: paths.artifactRoot,
  });

  const [command, action, subject] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write(HELP);
    return;
  }
  if (command === 'registry' && action === 'check') {
    print({
      ok: true,
      mode: 'read-only',
      file: paths.registryFile,
      servers: registry.servers.length,
      worlds: registry.servers.reduce((sum, server) => sum + server.worlds.length, 0),
      recipes: recipes.length,
    });
    return;
  }
  if (command === 'server' && action === 'list') {
    print(registry.servers.map((server) => ({
      id: server.id,
      name: server.name,
      worlds: server.worlds.length,
    })));
    return;
  }
  if (command === 'world' && action === 'list') {
    const serverFilter = flag('server');
    print(registry.servers
      .filter((server) => !serverFilter || server.id === serverFilter)
      .flatMap((server) => server.worlds.map((world) => ({
        serverId: server.id,
        id: world.id,
        name: world.name,
        dimension: world.dimension,
        databaseKeys: Object.keys(world.databases ?? {}),
      }))));
    return;
  }
  if (command === 'recipe' && action === 'list') {
    print(service.listRecipes().map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      parameters: recipe.parameters ?? {},
      steps: recipe.steps.map((step) => step.type),
    })));
    return;
  }
  if (command === 'snapshot' && action === 'inspect') {
    const world = resolveWorld(
      registry,
      requiredFlag('server'),
      requiredFlag('world'),
    );
    print(summarizeSnapshot(world.snapshotDirectory));
    return;
  }
  if (command === 'report' && action === 'run') {
    const bounds = flag('bounds');
    const job = service.submit({
      recipeId: requiredFlag('recipe'),
      serverId: requiredFlag('server'),
      worldId: requiredFlag('world'),
      parameters: bounds ? { bounds } : {},
    });
    const result = await service.run(job.id);
    print(result);
    if (result.status !== 'completed') process.exitCode = 1;
    return;
  }
  if (command === 'job' && action === 'list') {
    print(jobStore.list());
    return;
  }
  if (command === 'job' && action === 'show' && subject) {
    print(jobStore.get(subject));
    return;
  }
  throw new DevtoolsError('Unknown command', 'UNKNOWN_COMMAND', {
    command: process.argv.slice(2),
    help: HELP,
  });
}

main().catch((error: unknown) => {
  if (error instanceof DevtoolsError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
  } else {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  }
  process.exitCode = 1;
});
