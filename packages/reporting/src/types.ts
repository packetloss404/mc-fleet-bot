import type { FleetRegistry, JobStore, ReportJob } from '@mc-fleet/world-core';

export type RecipeStepType =
  | 'snapshot-summary'
  | 'snapshot-diff'
  | 'database-catalog'
  | 'world-features'
  | 'block-census'
  | 'html-report';

export type RecipeParameterType = 'string' | 'integer' | 'bounds';

export interface RecipeParameter {
  type: RecipeParameterType;
  description: string;
  required?: boolean;
  /** Optional inclusive minimum for `integer` parameters. */
  min?: number;
  /** Optional inclusive maximum for `integer` parameters. */
  max?: number;
}

export interface CoercedBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export type CoercedParameterValue = string | number | CoercedBounds | null;

export type CoercedParameters = {
  string: string;
  integer: number;
  bounds: CoercedBounds | null;
};

export interface RecipeStep {
  id: string;
  type: RecipeStepType;
  options?: Record<string, unknown>;
}

export interface ReportRecipe {
  version: 1;
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, RecipeParameter>;
  steps: RecipeStep[];
  sourceFile: string;
}

export interface SubmitReportRequest {
  recipeId: string;
  serverId: string;
  worldId: string;
  parameters?: Record<string, unknown>;
}

export interface ReportServiceOptions {
  registry: FleetRegistry;
  recipes: ReportRecipe[];
  jobStore: JobStore;
  artifactRoot: string;
}

export interface StepExecutionContext {
  job: ReportJob;
  outputDirectory: string;
  snapshotDirectory: string;
  databases: Record<string, string>;
  parameters: Record<string, unknown>;
  results: Record<string, unknown>;
}
