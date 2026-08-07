import path from 'node:path';

export interface ResolvedPaths {
  /** The CLI/API process working directory, resolved absolutely. */
  root: string;
  /** Path to the active registry file (local if present, example otherwise). */
  registryFile: string;
  recipesDirectory: string;
  jobsDirectory: string;
  artifactRoot: string;
}

export interface ResolvePathsOptions {
  root: string;
  env?: NodeJS.ProcessEnv;
  /**
   * Function that checks whether a path exists. Defaults to `fs.existsSync`
   * via dynamic import to keep this module dependency-free.
   */
  exists?: (filename: string) => boolean;
  /** Directory containing the committed example registry. */
  exampleRegistryDirectory?: string;
}

import fs from 'node:fs';

/**
 * Resolve the four configurable filesystem paths (registry, recipes, jobs,
 * artifacts) honouring the same env-var overrides the API and CLI use.
 * Used by both `apps/api` and `apps/cli` to avoid drift.
 */
export function resolvePaths(options: ResolvePathsOptions): ResolvedPaths {
  const env = options.env ?? process.env;
  const exists = options.exists ?? fs.existsSync;
  const root = path.resolve(options.root);
  const fallbackRegistry = options.exampleRegistryDirectory
    ? path.join(options.exampleRegistryDirectory, 'registry.example.yml')
    : path.join(root, 'config', 'registry.example.yml');
  const localRegistry = fromRoot(
    root,
    env['MC_FLEET_REGISTRY'],
    path.join(root, 'config', 'registry.local.yml'),
  );
  const registryFile = exists(localRegistry) ? localRegistry : fallbackRegistry;
  return {
    root,
    registryFile,
    recipesDirectory: fromRoot(root, env['MC_FLEET_RECIPES'], path.join(root, 'recipes')),
    jobsDirectory: fromRoot(root, env['MC_FLEET_JOBS'], path.join(root, 'data', 'jobs')),
    artifactRoot: fromRoot(root, env['MC_FLEET_ARTIFACTS'], path.join(root, 'data', 'artifacts')),
  };
}

function fromRoot(root: string, value: string | undefined, fallback: string): string {
  if (value) return path.resolve(root, value);
  return path.resolve(fallback);
}
