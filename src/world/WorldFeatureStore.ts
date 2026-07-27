import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { logger } from '../util/logger';

export type WorldFeatureKind =
  | 'property'
  | 'district'
  | 'building'
  | 'room'
  | 'road'
  | 'driveway'
  | 'parking'
  | 'sidewalk'
  | 'fence'
  | 'lighting'
  | 'landscape'
  | 'utility'
  | 'landmark'
  | 'custom';

export type WorldFeatureStatus =
  | 'planned'
  | 'queued'
  | 'in_progress'
  | 'complete'
  | 'partial'
  | 'damaged'
  | 'failed'
  | 'removed'
  | 'unknown';

export type WorldFeatureSource =
  | 'manual'
  | 'manifest'
  | 'build_job'
  | 'region_scan'
  | 'bot_scan'
  | 'rcon'
  | 'plugin_event'
  | 'import';

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export type WorldFeatureGeometry =
  | { type: 'point'; position: WorldPoint }
  | {
      type: 'bounds';
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      minY?: number;
      maxY?: number;
    }
  | { type: 'path'; points: WorldPoint[]; width?: number }
  | {
      type: 'polygon';
      points: Array<{ x: number; z: number }>;
      minY?: number;
      maxY?: number;
    };

export interface WorldFeature {
  id: string;
  projectId: string;
  externalId: string | null;
  parentId: string | null;
  world: string;
  name: string;
  kind: WorldFeatureKind;
  status: WorldFeatureStatus;
  geometry: WorldFeatureGeometry;
  source: WorldFeatureSource;
  sourceRef: string | null;
  confidence: number | null;
  completionRatio: number | null;
  conditionScore: number | null;
  tags: string[];
  attributes: Record<string, unknown>;
  observedAt: number | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorldFeatureInput {
  projectId: string;
  externalId?: string | null;
  parentId?: string | null;
  world?: string;
  name: string;
  kind: WorldFeatureKind;
  status?: WorldFeatureStatus;
  geometry: WorldFeatureGeometry;
  source?: WorldFeatureSource;
  sourceRef?: string | null;
  confidence?: number | null;
  completionRatio?: number | null;
  conditionScore?: number | null;
  tags?: string[];
  attributes?: Record<string, unknown>;
  observedAt?: number | null;
}

export interface WorldFeatureFilter {
  projectId?: string;
  world?: string;
  kind?: WorldFeatureKind;
  status?: WorldFeatureStatus;
  parentId?: string | null;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  updatedSince?: number;
  limit?: number;
}

export type WorldScanMethod =
  | 'region_snapshot'
  | 'bot_terrain'
  | 'rcon'
  | 'manual'
  | 'manifest_import'
  | 'plugin_event';

export interface WorldScan {
  id: string;
  projectId: string;
  world: string;
  method: WorldScanMethod;
  status: 'running' | 'complete' | 'failed';
  bounds: Extract<WorldFeatureGeometry, { type: 'bounds' }> | null;
  observer: string | null;
  snapshotRef: string | null;
  summary: Record<string, unknown>;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

export interface FeatureObservation {
  id: string;
  scanId: string;
  featureId: string;
  status: WorldFeatureStatus | null;
  completionRatio: number | null;
  conditionScore: number | null;
  expectedBlocks: number | null;
  observedBlocks: number | null;
  details: Record<string, unknown>;
  observedAt: number;
}

interface FeatureRow {
  id: string;
  project_id: string;
  external_id: string | null;
  parent_id: string | null;
  world: string;
  name: string;
  kind: WorldFeatureKind;
  status: WorldFeatureStatus;
  geometry_json: string;
  source: WorldFeatureSource;
  source_ref: string | null;
  confidence: number | null;
  completion_ratio: number | null;
  condition_score: number | null;
  tags_json: string;
  attributes_json: string;
  observed_at: number | null;
  revision: number;
  created_at: number;
  updated_at: number;
}

interface ScanRow {
  id: string;
  project_id: string;
  world: string;
  method: WorldScanMethod;
  status: WorldScan['status'];
  bounds_json: string | null;
  observer: string | null;
  snapshot_ref: string | null;
  summary_json: string;
  error: string | null;
  started_at: number;
  completed_at: number | null;
}

interface ObservationRow {
  id: string;
  scan_id: string;
  feature_id: string;
  status: WorldFeatureStatus | null;
  completion_ratio: number | null;
  condition_score: number | null;
  expected_blocks: number | null;
  observed_blocks: number | null;
  details_json: string;
  observed_at: number;
}

const FEATURE_KINDS: ReadonlySet<string> = new Set<WorldFeatureKind>([
  'property',
  'district',
  'building',
  'room',
  'road',
  'driveway',
  'parking',
  'sidewalk',
  'fence',
  'lighting',
  'landscape',
  'utility',
  'landmark',
  'custom',
]);

const FEATURE_STATUSES: ReadonlySet<string> = new Set<WorldFeatureStatus>([
  'planned',
  'queued',
  'in_progress',
  'complete',
  'partial',
  'damaged',
  'failed',
  'removed',
  'unknown',
]);

const FEATURE_SOURCES: ReadonlySet<string> = new Set<WorldFeatureSource>([
  'manual',
  'manifest',
  'build_job',
  'region_scan',
  'bot_scan',
  'rcon',
  'plugin_event',
  'import',
]);

const SCAN_METHODS: ReadonlySet<string> = new Set<WorldScanMethod>([
  'region_snapshot',
  'bot_terrain',
  'rcon',
  'manual',
  'manifest_import',
  'plugin_event',
]);

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function requireFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

function validateRatio(value: number | null | undefined, field: string): number | null {
  if (value == null) return null;
  requireFinite(value, field);
  if (value < 0 || value > 1) throw new Error(`${field} must be between 0 and 1`);
  return value;
}

function validateScore(value: number | null | undefined, field: string): number | null {
  if (value == null) return null;
  requireFinite(value, field);
  if (value < 0 || value > 100) throw new Error(`${field} must be between 0 and 100`);
  return value;
}

function validateGeometry(geometry: WorldFeatureGeometry): WorldFeatureGeometry {
  if (!geometry || typeof geometry !== 'object') throw new Error('geometry is required');

  if (geometry.type === 'point') {
    requireFinite(geometry.position?.x, 'geometry.position.x');
    requireFinite(geometry.position?.y, 'geometry.position.y');
    requireFinite(geometry.position?.z, 'geometry.position.z');
    return geometry;
  }

  if (geometry.type === 'bounds') {
    requireFinite(geometry.minX, 'geometry.minX');
    requireFinite(geometry.maxX, 'geometry.maxX');
    requireFinite(geometry.minZ, 'geometry.minZ');
    requireFinite(geometry.maxZ, 'geometry.maxZ');
    if (geometry.minX > geometry.maxX || geometry.minZ > geometry.maxZ) {
      throw new Error('geometry bounds minimums must not exceed maximums');
    }
    if (geometry.minY != null) requireFinite(geometry.minY, 'geometry.minY');
    if (geometry.maxY != null) requireFinite(geometry.maxY, 'geometry.maxY');
    if (geometry.minY != null && geometry.maxY != null && geometry.minY > geometry.maxY) {
      throw new Error('geometry minY must not exceed maxY');
    }
    return geometry;
  }

  if (geometry.type === 'path') {
    if (!Array.isArray(geometry.points) || geometry.points.length < 2) {
      throw new Error('path geometry requires at least two points');
    }
    for (const [index, point] of geometry.points.entries()) {
      requireFinite(point.x, `geometry.points[${index}].x`);
      requireFinite(point.y, `geometry.points[${index}].y`);
      requireFinite(point.z, `geometry.points[${index}].z`);
    }
    if (geometry.width != null && requireFinite(geometry.width, 'geometry.width') <= 0) {
      throw new Error('geometry.width must be greater than 0');
    }
    return geometry;
  }

  if (geometry.type === 'polygon') {
    if (!Array.isArray(geometry.points) || geometry.points.length < 3) {
      throw new Error('polygon geometry requires at least three points');
    }
    for (const [index, point] of geometry.points.entries()) {
      requireFinite(point.x, `geometry.points[${index}].x`);
      requireFinite(point.z, `geometry.points[${index}].z`);
    }
    if (geometry.minY != null) requireFinite(geometry.minY, 'geometry.minY');
    if (geometry.maxY != null) requireFinite(geometry.maxY, 'geometry.maxY');
    if (geometry.minY != null && geometry.maxY != null && geometry.minY > geometry.maxY) {
      throw new Error('geometry minY must not exceed maxY');
    }
    return geometry;
  }

  throw new Error('geometry.type must be point, bounds, path, or polygon');
}

function geometryBounds(geometry: WorldFeatureGeometry): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  if (geometry.type === 'point') {
    const { x, z } = geometry.position;
    return { minX: x, maxX: x, minZ: z, maxZ: z };
  }
  if (geometry.type === 'bounds') {
    return {
      minX: geometry.minX,
      maxX: geometry.maxX,
      minZ: geometry.minZ,
      maxZ: geometry.maxZ,
    };
  }

  const xs = geometry.points.map((point) => point.x);
  const zs = geometry.points.map((point) => point.z);
  const padding = geometry.type === 'path' ? (geometry.width ?? 0) / 2 : 0;
  return {
    minX: Math.min(...xs) - padding,
    maxX: Math.max(...xs) + padding,
    minZ: Math.min(...zs) - padding,
    maxZ: Math.max(...zs) + padding,
  };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToFeature(row: FeatureRow): WorldFeature {
  return {
    id: row.id,
    projectId: row.project_id,
    externalId: row.external_id,
    parentId: row.parent_id,
    world: row.world,
    name: row.name,
    kind: row.kind,
    status: row.status,
    geometry: parseJson<WorldFeatureGeometry>(row.geometry_json, {
      type: 'point',
      position: { x: 0, y: 0, z: 0 },
    }),
    source: row.source,
    sourceRef: row.source_ref,
    confidence: row.confidence,
    completionRatio: row.completion_ratio,
    conditionScore: row.condition_score,
    tags: parseJson<string[]>(row.tags_json, []),
    attributes: parseJson<Record<string, unknown>>(row.attributes_json, {}),
    observedAt: row.observed_at,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToScan(row: ScanRow): WorldScan {
  return {
    id: row.id,
    projectId: row.project_id,
    world: row.world,
    method: row.method,
    status: row.status,
    bounds: parseJson<WorldScan['bounds']>(row.bounds_json, null),
    observer: row.observer,
    snapshotRef: row.snapshot_ref,
    summary: parseJson<Record<string, unknown>>(row.summary_json, {}),
    error: row.error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function rowToObservation(row: ObservationRow): FeatureObservation {
  return {
    id: row.id,
    scanId: row.scan_id,
    featureId: row.feature_id,
    status: row.status,
    completionRatio: row.completion_ratio,
    conditionScore: row.condition_score,
    expectedBlocks: row.expected_blocks,
    observedBlocks: row.observed_blocks,
    details: parseJson<Record<string, unknown>>(row.details_json, {}),
    observedAt: row.observed_at,
  };
}

/**
 * Durable as-built catalog for mapped structures and infrastructure.
 *
 * This intentionally lives beside, rather than inside, town.db: the catalog
 * can represent non-town projects, roads, property fences, terrain features,
 * and imported surveys without creating fake Town Builder records.
 */
export class WorldFeatureStore {
  private readonly sqlite: Database.Database;
  readonly dbPath: string;

  constructor(dbPath: string = path.join(process.cwd(), 'data', 'world-map.db')) {
    this.dbPath = dbPath;
    const parent = path.dirname(dbPath);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    this.sqlite = new Database(dbPath);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');
    this.initializeSchema();
    logger.info({ dbPath }, 'World feature DB initialized');
  }

  private initializeSchema(): void {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS world_features (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        external_id TEXT,
        parent_id TEXT REFERENCES world_features(id) ON DELETE SET NULL,
        world TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        geometry_json TEXT NOT NULL,
        min_x REAL NOT NULL,
        max_x REAL NOT NULL,
        min_z REAL NOT NULL,
        max_z REAL NOT NULL,
        source TEXT NOT NULL,
        source_ref TEXT,
        confidence REAL,
        completion_ratio REAL,
        condition_score REAL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        attributes_json TEXT NOT NULL DEFAULT '{}',
        observed_at INTEGER,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (project_id, external_id)
      );

      CREATE TABLE IF NOT EXISTS world_scans (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        world TEXT NOT NULL,
        method TEXT NOT NULL,
        status TEXT NOT NULL,
        bounds_json TEXT,
        observer TEXT,
        snapshot_ref TEXT,
        summary_json TEXT NOT NULL DEFAULT '{}',
        error TEXT,
        started_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS feature_observations (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL REFERENCES world_scans(id) ON DELETE CASCADE,
        feature_id TEXT NOT NULL REFERENCES world_features(id) ON DELETE CASCADE,
        status TEXT,
        completion_ratio REAL,
        condition_score REAL,
        expected_blocks INTEGER,
        observed_blocks INTEGER,
        details_json TEXT NOT NULL DEFAULT '{}',
        observed_at INTEGER NOT NULL,
        UNIQUE (scan_id, feature_id)
      );

      CREATE INDEX IF NOT EXISTS idx_world_features_project_kind
        ON world_features(project_id, kind, status);
      CREATE INDEX IF NOT EXISTS idx_world_features_bounds
        ON world_features(world, min_x, max_x, min_z, max_z);
      CREATE INDEX IF NOT EXISTS idx_world_features_parent
        ON world_features(parent_id);
      CREATE INDEX IF NOT EXISTS idx_world_scans_project_time
        ON world_scans(project_id, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feature_observations_feature_time
        ON feature_observations(feature_id, observed_at DESC);
    `);
    const currentVersion = Number(this.sqlite.pragma('user_version', { simple: true })) || 0;
    if (currentVersion < 1) this.sqlite.pragma('user_version = 1');
  }

  close(): void {
    if (this.sqlite.open) this.sqlite.close();
  }

  createFeature(input: CreateWorldFeatureInput): WorldFeature {
    const feature = this.normalizeFeatureInput(input);
    const id = genId('wft');
    const now = Date.now();
    const bounds = geometryBounds(feature.geometry);
    this.sqlite.prepare(`
      INSERT INTO world_features (
        id, project_id, external_id, parent_id, world, name, kind, status,
        geometry_json, min_x, max_x, min_z, max_z, source, source_ref,
        confidence, completion_ratio, condition_score, tags_json,
        attributes_json, observed_at, revision, created_at, updated_at
      ) VALUES (
        @id, @projectId, @externalId, @parentId, @world, @name, @kind, @status,
        @geometryJson, @minX, @maxX, @minZ, @maxZ, @source, @sourceRef,
        @confidence, @completionRatio, @conditionScore, @tagsJson,
        @attributesJson, @observedAt, 1, @createdAt, @updatedAt
      )
    `).run({
      id,
      ...feature,
      geometryJson: JSON.stringify(feature.geometry),
      ...bounds,
      tagsJson: JSON.stringify(feature.tags),
      attributesJson: JSON.stringify(feature.attributes),
      createdAt: now,
      updatedAt: now,
    });
    return this.getFeature(id)!;
  }

  /**
   * Idempotent manifest/build import keyed by `(projectId, externalId)`.
   * Re-imports update the existing row and increment its revision.
   */
  upsertFeature(input: CreateWorldFeatureInput & { externalId: string }): WorldFeature {
    const projectId = requireNonEmpty(input.projectId, 'projectId');
    const externalId = requireNonEmpty(input.externalId, 'externalId');
    const existing = this.sqlite.prepare(`
      SELECT * FROM world_features WHERE project_id = ? AND external_id = ?
    `).get(projectId, externalId) as FeatureRow | undefined;
    if (!existing) return this.createFeature({ ...input, projectId, externalId });
    return this.updateFeature(existing.id, input)!;
  }

  importFeatures(
    inputs: Array<CreateWorldFeatureInput & { externalId: string }>,
  ): WorldFeature[] {
    if (inputs.length === 0) return [];
    const run = this.sqlite.transaction(() => inputs.map((input) => this.upsertFeature(input)));
    return run();
  }

  getFeature(id: string): WorldFeature | undefined {
    const row = this.sqlite.prepare('SELECT * FROM world_features WHERE id = ?').get(id) as FeatureRow | undefined;
    return row ? rowToFeature(row) : undefined;
  }

  listFeatures(filter: WorldFeatureFilter = {}): WorldFeature[] {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filter.projectId) { clauses.push('project_id = ?'); params.push(filter.projectId); }
    if (filter.world) { clauses.push('world = ?'); params.push(filter.world); }
    if (filter.kind) { clauses.push('kind = ?'); params.push(filter.kind); }
    if (filter.status) { clauses.push('status = ?'); params.push(filter.status); }
    if (filter.parentId !== undefined) {
      clauses.push(filter.parentId === null ? 'parent_id IS NULL' : 'parent_id = ?');
      if (filter.parentId !== null) params.push(filter.parentId);
    }
    if (filter.bounds) {
      const bounds = validateGeometry({ type: 'bounds', ...filter.bounds });
      if (bounds.type !== 'bounds') throw new Error('invalid query bounds');
      clauses.push('max_x >= ? AND min_x <= ? AND max_z >= ? AND min_z <= ?');
      params.push(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ);
    }
    if (filter.updatedSince != null) {
      clauses.push('updated_at >= ?');
      params.push(requireFinite(filter.updatedSince, 'updatedSince'));
    }
    const limit = Math.min(Math.max(Math.floor(filter.limit ?? 200), 1), 1_000);
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.sqlite.prepare(`
      SELECT * FROM world_features ${where}
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
    `).all(...params, limit) as FeatureRow[];
    return rows.map(rowToFeature);
  }

  updateFeature(
    id: string,
    patch: Partial<Omit<CreateWorldFeatureInput, 'projectId'>> & { projectId?: string },
  ): WorldFeature | undefined {
    const existing = this.getFeature(id);
    if (!existing) return undefined;
    const merged = this.normalizeFeatureInput({
      projectId: patch.projectId ?? existing.projectId,
      externalId: patch.externalId !== undefined ? patch.externalId : existing.externalId,
      parentId: patch.parentId !== undefined ? patch.parentId : existing.parentId,
      world: patch.world ?? existing.world,
      name: patch.name ?? existing.name,
      kind: patch.kind ?? existing.kind,
      status: patch.status ?? existing.status,
      geometry: patch.geometry ?? existing.geometry,
      source: patch.source ?? existing.source,
      sourceRef: patch.sourceRef !== undefined ? patch.sourceRef : existing.sourceRef,
      confidence: patch.confidence !== undefined ? patch.confidence : existing.confidence,
      completionRatio: patch.completionRatio !== undefined
        ? patch.completionRatio
        : existing.completionRatio,
      conditionScore: patch.conditionScore !== undefined
        ? patch.conditionScore
        : existing.conditionScore,
      tags: patch.tags ?? existing.tags,
      attributes: patch.attributes ?? existing.attributes,
      observedAt: patch.observedAt !== undefined ? patch.observedAt : existing.observedAt,
    });
    const bounds = geometryBounds(merged.geometry);
    this.sqlite.prepare(`
      UPDATE world_features SET
        project_id = @projectId,
        external_id = @externalId,
        parent_id = @parentId,
        world = @world,
        name = @name,
        kind = @kind,
        status = @status,
        geometry_json = @geometryJson,
        min_x = @minX,
        max_x = @maxX,
        min_z = @minZ,
        max_z = @maxZ,
        source = @source,
        source_ref = @sourceRef,
        confidence = @confidence,
        completion_ratio = @completionRatio,
        condition_score = @conditionScore,
        tags_json = @tagsJson,
        attributes_json = @attributesJson,
        observed_at = @observedAt,
        revision = revision + 1,
        updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      ...merged,
      geometryJson: JSON.stringify(merged.geometry),
      ...bounds,
      tagsJson: JSON.stringify(merged.tags),
      attributesJson: JSON.stringify(merged.attributes),
      updatedAt: Date.now(),
    });
    return this.getFeature(id);
  }

  deleteFeature(id: string): boolean {
    return this.sqlite.prepare('DELETE FROM world_features WHERE id = ?').run(id).changes > 0;
  }

  createScan(input: {
    projectId: string;
    world?: string;
    method: WorldScanMethod;
    bounds?: Extract<WorldFeatureGeometry, { type: 'bounds' }> | null;
    observer?: string | null;
    snapshotRef?: string | null;
    summary?: Record<string, unknown>;
    startedAt?: number;
  }): WorldScan {
    const projectId = requireNonEmpty(input.projectId, 'projectId');
    const world = requireNonEmpty(input.world ?? 'world', 'world');
    if (!SCAN_METHODS.has(input.method)) throw new Error('invalid scan method');
    const bounds = input.bounds == null
      ? null
      : validateGeometry(input.bounds) as Extract<WorldFeatureGeometry, { type: 'bounds' }>;
    const id = genId('wsc');
    this.sqlite.prepare(`
      INSERT INTO world_scans (
        id, project_id, world, method, status, bounds_json, observer,
        snapshot_ref, summary_json, error, started_at, completed_at
      ) VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?, NULL, ?, NULL)
    `).run(
      id,
      projectId,
      world,
      input.method,
      bounds ? JSON.stringify(bounds) : null,
      input.observer ?? null,
      input.snapshotRef ?? null,
      JSON.stringify(input.summary ?? {}),
      input.startedAt ?? Date.now(),
    );
    return this.getScan(id)!;
  }

  getScan(id: string): WorldScan | undefined {
    const row = this.sqlite.prepare('SELECT * FROM world_scans WHERE id = ?').get(id) as ScanRow | undefined;
    return row ? rowToScan(row) : undefined;
  }

  listScans(filter: { projectId?: string; status?: WorldScan['status']; limit?: number } = {}): WorldScan[] {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filter.projectId) { clauses.push('project_id = ?'); params.push(filter.projectId); }
    if (filter.status) { clauses.push('status = ?'); params.push(filter.status); }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(Math.max(Math.floor(filter.limit ?? 100), 1), 1_000);
    const rows = this.sqlite.prepare(`
      SELECT * FROM world_scans ${where} ORDER BY started_at DESC LIMIT ?
    `).all(...params, limit) as ScanRow[];
    return rows.map(rowToScan);
  }

  completeScan(
    id: string,
    input: {
      status?: 'complete' | 'failed';
      summary?: Record<string, unknown>;
      error?: string | null;
      completedAt?: number;
    } = {},
  ): WorldScan | undefined {
    const existing = this.getScan(id);
    if (!existing) return undefined;
    const status = input.status ?? 'complete';
    if (status !== 'complete' && status !== 'failed') {
      throw new Error('completed scan status must be complete or failed');
    }
    this.sqlite.prepare(`
      UPDATE world_scans SET status = ?, summary_json = ?, error = ?, completed_at = ?
      WHERE id = ?
    `).run(
      status,
      JSON.stringify(input.summary ?? existing.summary),
      input.error ?? null,
      input.completedAt ?? Date.now(),
      id,
    );
    return this.getScan(id);
  }

  recordObservation(input: {
    scanId: string;
    featureId: string;
    status?: WorldFeatureStatus | null;
    completionRatio?: number | null;
    conditionScore?: number | null;
    expectedBlocks?: number | null;
    observedBlocks?: number | null;
    details?: Record<string, unknown>;
    observedAt?: number;
  }): FeatureObservation {
    const scan = this.getScan(input.scanId);
    if (!scan) throw new Error('scan not found');
    if (scan.status !== 'running') throw new Error('scan is already complete');
    const feature = this.getFeature(input.featureId);
    if (!feature) throw new Error('feature not found');
    if (feature.projectId !== scan.projectId || feature.world !== scan.world) {
      throw new Error('scan and feature must belong to the same project and world');
    }
    if (input.status != null && !FEATURE_STATUSES.has(input.status)) {
      throw new Error('invalid feature status');
    }
    const completionRatio = validateRatio(input.completionRatio, 'completionRatio');
    const conditionScore = validateScore(input.conditionScore, 'conditionScore');
    const expectedBlocks = input.expectedBlocks == null
      ? null
      : Math.max(0, Math.floor(requireFinite(input.expectedBlocks, 'expectedBlocks')));
    const observedBlocks = input.observedBlocks == null
      ? null
      : Math.max(0, Math.floor(requireFinite(input.observedBlocks, 'observedBlocks')));
    const observedAt = input.observedAt ?? Date.now();
    const id = genId('obs');

    const run = this.sqlite.transaction(() => {
      this.sqlite.prepare(`
        INSERT INTO feature_observations (
          id, scan_id, feature_id, status, completion_ratio, condition_score,
          expected_blocks, observed_blocks, details_json, observed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(scan_id, feature_id) DO UPDATE SET
          status = excluded.status,
          completion_ratio = excluded.completion_ratio,
          condition_score = excluded.condition_score,
          expected_blocks = excluded.expected_blocks,
          observed_blocks = excluded.observed_blocks,
          details_json = excluded.details_json,
          observed_at = excluded.observed_at
      `).run(
        id,
        input.scanId,
        input.featureId,
        input.status ?? null,
        completionRatio,
        conditionScore,
        expectedBlocks,
        observedBlocks,
        JSON.stringify(input.details ?? {}),
        observedAt,
      );

      const updates: string[] = ['observed_at = ?', 'revision = revision + 1', 'updated_at = ?'];
      const values: unknown[] = [observedAt, Date.now()];
      if (input.status != null) { updates.push('status = ?'); values.push(input.status); }
      if (completionRatio != null) { updates.push('completion_ratio = ?'); values.push(completionRatio); }
      if (conditionScore != null) { updates.push('condition_score = ?'); values.push(conditionScore); }
      this.sqlite.prepare(`UPDATE world_features SET ${updates.join(', ')} WHERE id = ?`)
        .run(...values, input.featureId);
    });
    run();

    const row = this.sqlite.prepare(`
      SELECT * FROM feature_observations WHERE scan_id = ? AND feature_id = ?
    `).get(input.scanId, input.featureId) as ObservationRow;
    return rowToObservation(row);
  }

  getFeatureObservations(featureId: string, limit = 100): FeatureObservation[] {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 1_000);
    const rows = this.sqlite.prepare(`
      SELECT * FROM feature_observations
      WHERE feature_id = ?
      ORDER BY observed_at DESC
      LIMIT ?
    `).all(featureId, safeLimit) as ObservationRow[];
    return rows.map(rowToObservation);
  }

  getScanObservations(scanId: string, limit = 1_000): FeatureObservation[] {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 5_000);
    const rows = this.sqlite.prepare(`
      SELECT * FROM feature_observations
      WHERE scan_id = ?
      ORDER BY observed_at DESC
      LIMIT ?
    `).all(scanId, safeLimit) as ObservationRow[];
    return rows.map(rowToObservation);
  }

  private normalizeFeatureInput(input: CreateWorldFeatureInput): Required<
    Omit<CreateWorldFeatureInput, 'externalId' | 'parentId' | 'sourceRef' | 'confidence' |
      'completionRatio' | 'conditionScore' | 'observedAt'>
  > & {
    externalId: string | null;
    parentId: string | null;
    sourceRef: string | null;
    confidence: number | null;
    completionRatio: number | null;
    conditionScore: number | null;
    observedAt: number | null;
  } {
    const projectId = requireNonEmpty(input.projectId, 'projectId');
    const world = requireNonEmpty(input.world ?? 'world', 'world');
    const name = requireNonEmpty(input.name, 'name');
    if (!FEATURE_KINDS.has(input.kind)) throw new Error('invalid feature kind');
    const status = input.status ?? 'unknown';
    if (!FEATURE_STATUSES.has(status)) throw new Error('invalid feature status');
    const source = input.source ?? 'manual';
    if (!FEATURE_SOURCES.has(source)) throw new Error('invalid feature source');
    const externalId = input.externalId == null
      ? null
      : requireNonEmpty(input.externalId, 'externalId');
    const parentId = input.parentId == null ? null : requireNonEmpty(input.parentId, 'parentId');
    const tags = input.tags ?? [];
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
      throw new Error('tags must be an array of strings');
    }
    const attributes = input.attributes ?? {};
    if (attributes == null || typeof attributes !== 'object' || Array.isArray(attributes)) {
      throw new Error('attributes must be an object');
    }
    const confidence = validateRatio(input.confidence, 'confidence');
    const completionRatio = validateRatio(input.completionRatio, 'completionRatio');
    const conditionScore = validateScore(input.conditionScore, 'conditionScore');
    const observedAt = input.observedAt == null
      ? null
      : requireFinite(input.observedAt, 'observedAt');
    return {
      projectId,
      externalId,
      parentId,
      world,
      name,
      kind: input.kind,
      status,
      geometry: validateGeometry(input.geometry),
      source,
      sourceRef: input.sourceRef ?? null,
      confidence,
      completionRatio,
      conditionScore,
      tags,
      attributes,
      observedAt,
    };
  }
}
