export interface LocalConnector {
  kind: 'local';
  root: string;
}

export type ServerConnector = LocalConnector;

export interface WorldDefinition {
  id: string;
  name: string;
  dimension: string;
  snapshot: string;
  databases?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ServerDefinition {
  id: string;
  name: string;
  connector: ServerConnector;
  worlds: WorldDefinition[];
  metadata?: Record<string, unknown>;
}

export interface FleetRegistry {
  version: 1;
  servers: ServerDefinition[];
}

export interface ResolvedWorld {
  server: ServerDefinition;
  world: WorldDefinition;
  root: string;
  snapshotDirectory: string;
  databases: Record<string, string>;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface JobLogEntry {
  at: string;
  level: 'info' | 'error';
  message: string;
  stepId?: string;
}

export interface JobProgress {
  /** Number of units completed so far. */
  current: number;
  /** Total expected units. `null` when the count is unknown. */
  total: number | null;
  /** Human-readable description of what is being counted. */
  label: string;
}

export interface ReportJob {
  id: string;
  recipeId: string;
  recipeName: string;
  serverId: string;
  worldId: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  outputDirectory: string;
  parameters: Record<string, unknown>;
  currentStep?: string;
  progress?: JobProgress;
  error?: string;
  artifacts: string[];
  logs: JobLogEntry[];
}

export interface ArtifactRecord {
  path: string;
  bytes: number;
  sha256: string;
  mediaType: string;
}

export interface ArtifactManifest {
  schemaVersion: 1;
  jobId: string;
  recipeId: string;
  generatedAt: string;
  source: {
    serverId: string;
    worldId: string;
    snapshotDirectory: string;
    snapshotSha256?: string;
  };
  artifacts: ArtifactRecord[];
}
