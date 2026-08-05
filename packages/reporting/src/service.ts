import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { censusSnapshot, diffSnapshots, summarizeSnapshot } from '@mc-fleet/anvil';
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
import type { ArtifactManifest, ReportJob, ResolvedWorld } from '@mc-fleet/world-core';

import { writeHtmlReport } from './html.js';
import type {
  CoercedParameters,
  RecipeStep,
  ReportRecipe,
  ReportServiceOptions,
  SubmitReportRequest,
} from './types.js';
import { validateAndCoerceParameters } from './recipes.js';
import type { JobProgress } from '@mc-fleet/world-core';

function jobId(): string {
  const stamp = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function optionString(step: RecipeStep, key: string, fallback?: string): string {
  const value = step.options?.[key] ?? fallback;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DevtoolsError(
      `Step ${step.id} option ${key} must be a string`,
      'INVALID_STEP_OPTION',
    );
  }
  return value;
}

function optionLimit(step: RecipeStep, parameters: Record<string, unknown>): number {
  if (typeof parameters['limit'] === 'number') {
    return parameters['limit'] as number;
  }
  const value = Number(step.options?.limit ?? 100_000);
  if (!Number.isInteger(value)) {
    throw new DevtoolsError(`Step ${step.id} limit must be an integer`, 'INVALID_STEP_OPTION');
  }
  return value;
}

function databaseFor(resolved: ResolvedWorld, step: RecipeStep): string {
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
    const parameters = validateAndCoerceParameters(recipe, request.parameters);
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
      logs: [
        {
          at: new Date().toISOString(),
          level: 'info',
          message: 'Report job queued',
        },
      ],
    });
  }

  async run(id: string): Promise<ReportJob> {
    let job = this.options.jobStore.get(id);
    if (job.status !== 'queued') {
      throw new DevtoolsError(`Job ${id} is ${job.status}, expected queued`, 'INVALID_JOB_STATE');
    }
    const recipe = this.getRecipe(job.recipeId);
    const resolved = resolveWorld(this.options.registry, job.serverId, job.worldId);
    ensureFreshDirectory(job.outputDirectory, this.options.artifactRoot);
    job = this.options.jobStore.update(id, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    const results: Record<string, unknown> = {};
    const onStepProgress = (step: RecipeStep, progress: JobProgress): void => {
      this.options.jobStore.update(id, { currentStep: step.id, progress });
    };
    try {
      for (const step of recipe.steps) {
        job = this.options.jobStore.update(id, { currentStep: step.id });
        this.log(id, `Starting ${step.type}`, step.id);
        const result = await this.executeStep(step, recipe, job, resolved, results, onStepProgress);
        results[step.id] = result;
        if (step.type !== 'html-report') {
          writeJsonAtomic(path.join(job.outputDirectory, 'results', `${step.id}.json`), result);
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
      writeJsonAtomic(path.join(job.outputDirectory, 'artifact-manifest.json'), manifest);
      const artifacts = [
        ...manifest.artifacts.map((artifact) => artifact.path),
        'artifact-manifest.json',
      ].sort();
      job = this.options.jobStore.update(id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        currentStep: undefined,
        progress: undefined,
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
        progress: undefined,
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
    onProgress: (step: RecipeStep, progress: JobProgress) => void,
  ): Promise<unknown> {
    switch (step.type) {
      case 'snapshot-summary': {
        const summary = summarizeSnapshot(resolved.snapshotDirectory);
        return {
          type: step.type,
          ...summary,
          metrics: [
            { label: 'SHA-256', value: summary.sha256 },
            { label: 'Region files', value: summary.regionFileCount },
            { label: 'Declared chunks', value: summary.declaredChunkCount },
            { label: 'Bytes', value: summary.bytes },
          ],
        };
      }
      case 'snapshot-diff': {
        const otherWorldId = job.parameters['other'];
        if (typeof otherWorldId !== 'string' || otherWorldId.length === 0) {
          throw new DevtoolsError(
            `Step ${step.id} requires a string "other" parameter naming the world to diff against`,
            'INVALID_STEP_OPTION',
          );
        }
        const otherResolved = resolveWorld(this.options.registry, job.serverId, otherWorldId);
        const diff = diffSnapshots(resolved.snapshotDirectory, otherResolved.snapshotDirectory);
        return {
          ...diff,
          thisWorld: { id: resolved.world.id, name: resolved.world.name },
          otherWorld: { id: otherResolved.world.id, name: otherResolved.world.name },
          metrics: [
            {
              label: 'This snapshot',
              value: `${resolved.world.id} (${diff.thisSnapshot.regionFileCount} regions)`,
            },
            {
              label: 'Other snapshot',
              value: `${otherResolved.world.id} (${diff.otherSnapshot.regionFileCount} regions)`,
            },
            { label: 'Identical', value: diff.identical ? 'yes' : 'no' },
            { label: 'Unchanged regions', value: diff.unchanged },
            { label: 'Added regions', value: diff.added.length },
            { label: 'Removed regions', value: diff.removed.length },
            { label: 'Changed regions', value: diff.changed.length },
          ],
        };
      }
      case 'database-catalog': {
        const databaseKey = optionString(step, 'database', 'world');
        const catalog = catalogDatabase(databaseFor(resolved, step));
        return {
          type: step.type,
          databaseKey,
          ...catalog,
          metrics: [
            { label: 'Database', value: databaseKey },
            { label: 'SHA-256', value: catalog.sha256 },
            { label: 'Bytes', value: catalog.bytes },
            { label: 'Tables', value: Object.keys(catalog.tableCounts).length },
            { label: 'Quick check', value: catalog.quickCheck.join(', ') || 'unknown' },
          ],
        };
      }
      case 'world-features': {
        const databaseKey = optionString(step, 'database', 'world');
        const features = exportWorldFeatures(
          databaseFor(resolved, step),
          optionLimit(step, job.parameters),
        );
        return {
          type: step.type,
          databaseKey,
          ...features,
          metrics: [
            { label: 'Database', value: databaseKey },
            { label: 'Rows', value: features.total },
            { label: 'Exported', value: features.records.length },
            { label: 'Truncated', value: features.truncated ? 'yes' : 'no' },
            { label: 'Limit', value: features.limit },
          ],
        };
      }
      case 'block-census': {
        const census = await censusSnapshot(
          resolved.snapshotDirectory,
          (job.parameters['bounds'] as CoercedParameters['bounds'] | undefined) ?? null,
          (progress) => {
            onProgress(step, {
              current: progress.regionsScanned,
              total: progress.totalRegions,
              label: `Scanning regions (${progress.chunksVisited} chunks visited)`,
            });
          },
        );
        return {
          type: step.type,
          ...census,
          metrics: [
            { label: 'Snapshot SHA-256', value: census.snapshotSha256 },
            { label: 'Chunks visited', value: census.chunksVisited },
            { label: 'Chunks decoded', value: census.chunksDecoded },
            { label: 'Sections decoded', value: census.sectionsDecoded },
            { label: 'Blocks counted', value: census.blocksCounted },
            { label: 'Unique states', value: census.uniqueBlockStates },
            { label: 'Complete', value: census.complete ? 'yes' : 'no' },
          ],
        };
      }
      case 'html-report': {
        const title = optionString(step, 'title', recipe.name);
        const filename = writeHtmlReport(job.outputDirectory, recipe, job, results, title);
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
    const snapshotResult = Object.values(results).find(
      (value) =>
        value &&
        typeof value === 'object' &&
        (value as Record<string, unknown>).type === 'snapshot-summary',
    ) as Record<string, unknown> | undefined;
    return {
      schemaVersion: 1,
      jobId: job.id,
      recipeId: job.recipeId,
      generatedAt: new Date().toISOString(),
      source: {
        serverId: job.serverId,
        worldId: job.worldId,
        snapshotDirectory: resolved.snapshotDirectory,
        snapshotSha256:
          typeof snapshotResult?.sha256 === 'string' ? snapshotResult.sha256 : undefined,
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
