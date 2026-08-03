import type { Express, Request } from 'express';
import type {
  CreateWorldFeatureInput,
  WorldFeatureFilter,
  WorldFeatureKind,
  WorldFeatureStatus,
  WorldFeatureStore,
} from '../../world/WorldFeatureStore';

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number`);
  return parsed;
}

function featureFilter(req: Request): WorldFeatureFilter {
  const minX = optionalNumber(req.query.minX, 'minX');
  const maxX = optionalNumber(req.query.maxX, 'maxX');
  const minZ = optionalNumber(req.query.minZ, 'minZ');
  const maxZ = optionalNumber(req.query.maxZ, 'maxZ');
  const suppliedBounds = [minX, maxX, minZ, maxZ].filter((value) => value != null).length;
  if (suppliedBounds !== 0 && suppliedBounds !== 4) {
    throw new Error('minX, maxX, minZ, and maxZ must be supplied together');
  }
  return {
    projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
    world: typeof req.query.world === 'string' ? req.query.world : undefined,
    kind: typeof req.query.kind === 'string'
      ? req.query.kind as WorldFeatureKind
      : undefined,
    status: typeof req.query.status === 'string'
      ? req.query.status as WorldFeatureStatus
      : undefined,
    parentId: typeof req.query.parentId === 'string' ? req.query.parentId : undefined,
    bounds: suppliedBounds === 4
      ? { minX: minX!, maxX: maxX!, minZ: minZ!, maxZ: maxZ! }
      : undefined,
    updatedSince: optionalNumber(req.query.updatedSince, 'updatedSince'),
    limit: optionalNumber(req.query.limit, 'limit'),
  };
}

/**
 * Durable project/as-built map endpoints. These record scans and import their
 * findings; they do not move a bot or mutate the Minecraft world.
 */
export function registerWorldFeatureRoutes(
  app: Express,
  deps: { worldFeatureStore: WorldFeatureStore },
): void {
  const { worldFeatureStore } = deps;

  app.get('/api/world/features', (req, res) => {
    try {
      res.json({ features: worldFeatureStore.listFeatures(featureFilter(req)) });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Bulk idempotent import for manifests, build history, and offline scans.
  app.post('/api/world/features/import', (req, res) => {
    try {
      const features = req.body?.features;
      if (!Array.isArray(features) || features.length === 0) {
        return res.status(400).json({ error: 'features must be a non-empty array' });
      }
      if (features.length > 1_000) {
        return res.status(400).json({ error: 'feature import is limited to 1000 rows' });
      }
      const normalized = features.map((feature: CreateWorldFeatureInput) => {
        if (!feature.externalId) throw new Error('every imported feature requires externalId');
        return feature as CreateWorldFeatureInput & { externalId: string };
      });
      const imported = worldFeatureStore.importFeatures(normalized);
      res.json({ features: imported, count: imported.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/world/features', (req, res) => {
    try {
      res.status(201).json({ feature: worldFeatureStore.createFeature(req.body) });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/world/features/:id', (req, res) => {
    const feature = worldFeatureStore.getFeature(req.params.id as string);
    if (!feature) return res.status(404).json({ error: 'World feature not found' });
    res.json({ feature });
  });

  app.patch('/api/world/features/:id', (req, res) => {
    try {
      const feature = worldFeatureStore.updateFeature(req.params.id as string, req.body);
      if (!feature) return res.status(404).json({ error: 'World feature not found' });
      res.json({ feature });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/world/features/:id', (req, res) => {
    const deleted = worldFeatureStore.deleteFeature(req.params.id as string);
    res.status(deleted ? 200 : 404).json({ success: deleted });
  });

  app.get('/api/world/features/:id/observations', (req, res) => {
    const feature = worldFeatureStore.getFeature(req.params.id as string);
    if (!feature) return res.status(404).json({ error: 'World feature not found' });
    const limit = optionalNumber(req.query.limit, 'limit');
    res.json({
      observations: worldFeatureStore.getFeatureObservations(feature.id, limit ?? 100),
    });
  });

  app.get('/api/world/scans', (req, res) => {
    try {
      const limit = optionalNumber(req.query.limit, 'limit');
      const projectId = typeof req.query.projectId === 'string'
        ? req.query.projectId
        : undefined;
      const status = typeof req.query.status === 'string'
        ? req.query.status as 'running' | 'complete' | 'failed'
        : undefined;
      res.json({ scans: worldFeatureStore.listScans({ projectId, status, limit }) });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/world/scans', (req, res) => {
    try {
      res.status(201).json({ scan: worldFeatureStore.createScan(req.body) });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/world/scans/:id', (req, res) => {
    const scan = worldFeatureStore.getScan(req.params.id as string);
    if (!scan) return res.status(404).json({ error: 'World scan not found' });
    res.json({
      scan,
      observations: worldFeatureStore.getScanObservations(scan.id),
    });
  });

  app.post('/api/world/scans/:id/observations', (req, res) => {
    try {
      const observation = worldFeatureStore.recordObservation({
        ...req.body,
        scanId: req.params.id as string,
      });
      res.status(201).json({ observation });
    } catch (err: any) {
      const status = /not found/i.test(err.message) ? 404 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  app.post('/api/world/scans/:id/complete', (req, res) => {
    try {
      const scan = worldFeatureStore.completeScan(req.params.id as string, req.body);
      if (!scan) return res.status(404).json({ error: 'World scan not found' });
      res.json({ scan });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
}
