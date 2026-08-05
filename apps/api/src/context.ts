import path from 'node:path';

import { loadRecipes, ReportQueue, ReportService } from '@mc-fleet/reporting';
import { JobStore, loadRegistry, resolvePaths } from '@mc-fleet/world-core';

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

export function createContext(root = process.cwd()): AppContext {
  const paths = resolvePaths({
    root,
    exampleRegistryDirectory: path.join(path.resolve(root), 'config'),
  });
  const registry = loadRegistry(paths.registryFile);
  const jobStore = new JobStore(paths.jobsDirectory);
  const service = new ReportService({
    registry,
    recipes: loadRecipes(paths.recipesDirectory),
    jobStore,
    artifactRoot: paths.artifactRoot,
  });
  return {
    ...paths,
    dashboardDirectory: path.join(paths.root, 'apps/dashboard/public'),
    registry,
    service,
    queue: new ReportQueue(service),
    jobStore,
  };
}
