import fs from 'node:fs';
import path from 'node:path';

import { loadRecipes, ReportQueue, ReportService } from '@mc-fleet/reporting';
import { JobStore, loadRegistry } from '@mc-fleet/world-core';

export interface AppContext {
  root: string;
  registryFile: string;
  recipesDirectory: string;
  jobsDirectory: string;
  artifactRoot: string;
  dashboardDirectory: string;
  registry: ReturnType<typeof loadRegistry>;
  service: ReportService;
  queue: ReportQueue;
  jobStore: JobStore;
}

function fromRoot(root: string, value: string | undefined, fallback: string): string {
  return path.resolve(root, value ?? fallback);
}

export function createContext(root = process.cwd()): AppContext {
  const resolvedRoot = path.resolve(root);
  const localRegistry = fromRoot(
    resolvedRoot,
    process.env.MC_FLEET_REGISTRY,
    'config/registry.local.yml',
  );
  const registryFile = fs.existsSync(localRegistry)
    ? localRegistry
    : path.join(resolvedRoot, 'config/registry.example.yml');
  const recipesDirectory = fromRoot(
    resolvedRoot,
    process.env.MC_FLEET_RECIPES,
    'recipes',
  );
  const jobsDirectory = fromRoot(
    resolvedRoot,
    process.env.MC_FLEET_JOBS,
    'data/jobs',
  );
  const artifactRoot = fromRoot(
    resolvedRoot,
    process.env.MC_FLEET_ARTIFACTS,
    'data/artifacts',
  );
  const registry = loadRegistry(registryFile);
  const jobStore = new JobStore(jobsDirectory);
  const service = new ReportService({
    registry,
    recipes: loadRecipes(recipesDirectory),
    jobStore,
    artifactRoot,
  });
  return {
    root: resolvedRoot,
    registryFile,
    recipesDirectory,
    jobsDirectory,
    artifactRoot,
    dashboardDirectory: path.join(resolvedRoot, 'apps/dashboard/public'),
    registry,
    service,
    queue: new ReportQueue(service),
    jobStore,
  };
}
