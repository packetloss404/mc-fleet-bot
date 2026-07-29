import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { censusSnapshot, summarizeSnapshot } from '@mc-fleet/anvil';
import { catalogDatabase, exportWorldFeatures } from '@mc-fleet/catalog';
import {
  DevtoolsError,
  ensureFreshDirectory,
  mediaTypeFor,
  resolveWorld,
  sha256File,
  walkFiles,
  writeJsonAtomic,
} from '@mc-fleet/world-core';
import type {
  ArtifactManifest,
  ReportJob,
  ResolvedWorld,
} from '@mc-fleet/world-core';

import { writeHtmlReport } from './html.js';
import type {
  RecipeStep,
  ReportRecipe,
  ReportServiceOptions,
  SubmitReportRequest,
} from './types.js';

function jobId(): string {
  const stamp = new Date().toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function parseBounds(value: unknown): {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
} | null {
  if (value === undefined || value === null || value === '') return null;
  const entries = Array.isArray(value)
    ? value.map(Number)
    : String(value).split(',').map((entry) => Number(entry.trim()));
  if (entries.length !== 6 || entries.some((entry) => !Number.isInteger(entry))) {
    throw new DevtoolsError(
      'bounds must contain six comma-separated integers',
      'INVALID_BOUNDS',
    );
  }
  const [x1, y1, z1, x2, y2, z2] = entries as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return {
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    minZ: Math.min(z1, z2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
    maxZ: Math.max(z1, z2),
  };
}

function optionString(
  step: RecipeStep,
  key: string,
  fallback?: string,
): string {
  const value = step.options?.[key] ?? fallback;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DevtoolsError(
      `Step ${step.id} option ${key} must be a string`,
      'INVALID_STEP_OPTION',
    );
  }
  return value;
}

function optionLimit(step: RecipeStep): number {
  const value = Number(step.options?.limit ?? 100_000);
  if (!Number.isInteger(value)) {
    throw new DevtoolsError(
      `Step ${step.id} limit must be an integer`,
      'INVALID_STEP_OPTION',
    );
  }
  return value;
}

function databaseFor(
  resolved: ResolvedWorld,
  step: RecipeStep,
): string {
  const key = optionString(step, 'database', 'world');
  const filename = resolved.databases[key];
  if (!filename) {
    throw new DevtoolsError(
      `World ${resolved.world.id} has no registered ${key} database`,
      'DATABASE_NOT_REGISTERED',
    );
  }
  return filename;
}

export class ReportService {
  private readonly recipes: Map<string, ReportRecipe>;
  private readonly options: ReportServiceOptions;

  constructor(options: ReportServiceOptions) {
    this.options = {
      ...options,
      artifactRoot: path.resolve(options.artifactRoot),
    };
    this.recipes = new Map(options.recipes.map((recipe) => [recipe.id, recipe]));
    fs.mkdirSync(this.options.artifactRoot, { recursive: true });
    this.recoverInterruptedJobs();
  }

  listRecipes(): ReportRecipe[] {
    return [...this.recipes.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  submit(request: SubmitReportRequest): ReportJob {
    const recipe = this.getRecipe(request.recipeId);
    resolveWorld(this.options.registry, request.serverId, request.worldId);
    const parameters = request.parameters ?? {};
    const allowed = new Set(Object.keys(recipe.parameters ?? {}));
    for (const key of Object.keys(parameters)) {
      if (!allowed.has(key)) {
        throw new DevtoolsError(
          `Recipe ${recipe.id} does not declare parameter ${key}`,
          'UNKNOWN_PARAMETER',
        );
      }
    }
    for (const [key, definition] of Object.entries(recipe.parameters ?? {})) {
      if (definition.required && parameters[key] === undefined) {
        throw new DevtoolsError(
          `Recipe ${recipe.id} requires parameter ${key}`,
          'MISSING_PARAMETER',
        );
      }
    }
    const id = jobId();
    const outputDirectory = path.join(
      this.options.artifactRoot,
      request.serverId,
      request.worldId,
      request.recipeId,
      id,
    );
    return this.options.jobStore.create({
      id,
      recipeId: recipe.id,
      recipeName: recipe.name,
      serverId: request.serverId,
      worldId: request.worldId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      outputDirectory,
      parameters,
      artifacts: [],
      logs: [{
        at: new Date().toISOString(),
        level: 'info',
        message: 'Report job queued',
      }],
    });
  }

  async run(id: string): Promise<ReportJob> {
    let job = this.options.jobStore.get(id);
    if (job.status !== 'queued') {
      throw new DevtoolsError(
        `Job ${id} is ${job.status}, expected queued`,
        'INVALID_JOB_STATE',
      );
    }
    const recipe = this.getRecipe(job.recipeId);
    const resolved = resolveWorld(
      this.options.registry,
      job.serverId,
      job.worldId,
    );
    ensureFreshDirectory(job.outputDirectory, this.options.artifactRoot);
    job = this.options.jobStore.update(id, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    const results: Record<string, unknown> = {};
    try {
      for (const step of recipe.steps) {
        job = this.options.jobStore.update(id, { currentStep: step.id });
        this.log(id, `Starting ${step.type}`, step.id);
        const result = await this.executeStep(
          step,
          recipe,
          job,
          resolved,
          results,
        );
        results[step.id] = result;
        if (step.type !== 'html-report') {
          writeJsonAtomic(
            path.join(job.outputDirectory, 'results', `${step.id}.json`),
            result,
          );
        }
        this.log(id, `Completed ${step.type}`, step.id);
      }
      writeJsonAtomic(path.join(job.outputDirectory, 'report-data.json'), {
        job: {
          id: job.id,
          recipeId: job.recipeId,
          serverId: job.serverId,
          worldId: job.worldId,
          parameters: job.parameters,
        },
        results,
      });
      const manifest = this.createManifest(job, resolved, results);
      writeJsonAtomic(
        path.join(job.outputDirectory, 'artifact-manifest.json'),
        manifest,
      );
      const artifacts = [
        ...manifest.artifacts.map((artifact) => artifact.path),
        'artifact-manifest.json',
      ].sort();
      job = this.options.jobStore.update(id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        currentStep: undefined,
        artifacts,
      });
      this.log(id, `Report completed with ${artifacts.length} artifacts`);
      return this.options.jobStore.get(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(id, message, job.currentStep, 'error');
      return this.options.jobStore.update(id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        currentStep: undefined,
        error: message,
      });
    }
  }

  private async executeStep(
    step: RecipeStep,
    recipe: ReportRecipe,
    job: ReportJob,
    resolved: ResolvedWorld,
    results: Record<string, unknown>,
  ): Promise<unknown> {
    switch (step.type) {
      case 'snapshot-summary':
        return {
          type: step.type,
          ...summarizeSnapshot(resolved.snapshotDirectory),
        };
      case 'database-catalog':
        return {
          type: step.type,
          databaseKey: optionString(step, 'database', 'world'),
          ...catalogDatabase(databaseFor(resolved, step)),
        };
      case 'world-features':
        return {
          type: step.type,
          databaseKey: optionString(step, 'database', 'world'),
          ...exportWorldFeatures(databaseFor(resolved, step), optionLimit(step)),
        };
      case 'block-census':
        return {
          type: step.type,
          ...await censusSnapshot(
            resolved.snapshotDirectory,
            parseBounds(job.parameters.bounds),
          ),
        };
      case 'html-report': {
        const title = optionString(step, 'title', recipe.name);
        const filename = writeHtmlReport(
          job.outputDirectory,
          recipe,
          job,
          results,
          title,
        );
        return {
          type: step.type,
          title,
          artifact: path.relative(job.outputDirectory, filename),
        };
      }
    }
  }

  private createManifest(
    job: ReportJob,
    resolved: ResolvedWorld,
    results: Record<string, unknown>,
  ): ArtifactManifest {
    const snapshotResult = Object.values(results).find((value) => (
      value
      && typeof value === 'object'
      && (value as Record<string, unknown>).type === 'snapshot-summary'
    )) as Record<string, unknown> | undefined;
    return {
      schemaVersion: 1,
      jobId: job.id,
      recipeId: job.recipeId,
      generatedAt: new Date().toISOString(),
      source: {
        serverId: job.serverId,
        worldId: job.worldId,
        snapshotDirectory: resolved.snapshotDirectory,
        snapshotSha256: typeof snapshotResult?.sha256 === 'string'
          ? snapshotResult.sha256
          : undefined,
      },
      artifacts: walkFiles(job.outputDirectory)
        .filter((filename) => path.basename(filename) !== 'artifact-manifest.json')
        .map((filename) => ({
          path: path.relative(job.outputDirectory, filename).split(path.sep).join('/'),
          bytes: fs.statSync(filename).size,
          sha256: sha256File(filename),
          mediaType: mediaTypeFor(filename),
        })),
    };
  }

  private getRecipe(id: string): ReportRecipe {
    const recipe = this.recipes.get(id);
    if (!recipe) {
      throw new DevtoolsError(`Unknown recipe: ${id}`, 'RECIPE_NOT_FOUND');
    }
    return recipe;
  }

  private log(
    id: string,
    message: string,
    stepId?: string,
    level: 'info' | 'error' = 'info',
  ): void {
    this.options.jobStore.appendLog(id, {
      at: new Date().toISOString(),
      level,
      message,
      stepId,
    });
  }

  private recoverInterruptedJobs(): void {
    for (const job of this.options.jobStore.list()) {
      if (job.status !== 'running') continue;
      this.options.jobStore.update(job.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: 'Worker stopped while this job was running',
        currentStep: undefined,
        logs: [
          ...job.logs,
          {
            at: new Date().toISOString(),
            level: 'error',
            message: 'Worker stopped while this job was running',
          },
        ],
      });
    }
  }
}
