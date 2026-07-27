import type { Application, Request, Response } from 'express';
import { BoxIntegration } from '../../integrations/BoxIntegration';
import { logger } from '../../util/logger';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function registerBoxIntegrationRoutes(
  app: Application,
  boxIntegration = new BoxIntegration(),
): BoxIntegration {
  app.get('/api/integrations/box', (_req: Request, res: Response) => {
    const artifacts = boxIntegration.discoverArtifacts();
    res.json({
      settings: boxIntegration.getPublicSettings(),
      lastSync: boxIntegration.getLastSync(),
      artifacts: {
        total: artifacts.length,
        bytes: artifacts.reduce((sum, artifact) => sum + artifact.size, 0),
        uploadable: artifacts.filter((artifact) => artifact.uploadable).length,
        byCategory: {
          maps: artifacts.filter((artifact) => artifact.category === 'maps').length,
          screenshots: artifacts.filter((artifact) => artifact.category === 'screenshots').length,
          documents: artifacts.filter((artifact) => artifact.category === 'documents').length,
          outputs: artifacts.filter((artifact) => artifact.category === 'outputs').length,
        },
        preview: artifacts.slice(0, 100).map(({ absolutePath: _absolutePath, ...artifact }) => artifact),
      },
    });
  });

  app.put('/api/integrations/box', (req: Request, res: Response) => {
    try {
      const settings = boxIntegration.updateSettings(req.body ?? {});
      logger.info(
        {
          authMode: settings.authMode,
          enabled: settings.enabled,
          folderId: settings.folderId || undefined,
          folderName: settings.folderName,
          autoSync: settings.autoSync,
        },
        'Box integration settings updated',
      );
      res.json({ success: true, settings });
    } catch (err) {
      res.status(400).json({ error: errorMessage(err) });
    }
  });

  app.post('/api/integrations/box/test', async (_req: Request, res: Response) => {
    try {
      const connection = await boxIntegration.testConnection();
      res.json({ success: true, connection });
    } catch (err) {
      res.status(502).json({ error: errorMessage(err) });
    }
  });

  app.post('/api/integrations/box/pdf-maps', async (_req: Request, res: Response) => {
    try {
      const files = await boxIntegration.generatePdfMaps();
      res.json({ success: true, generated: files.length, files });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  app.post('/api/integrations/box/sync', async (req: Request, res: Response) => {
    try {
      const paths = req.body?.paths;
      if (
        paths !== undefined
        && (!Array.isArray(paths) || paths.some((entry) => typeof entry !== 'string'))
      ) {
        res.status(400).json({ error: 'paths must be an array of artifact paths' });
        return;
      }
      const report = await boxIntegration.syncAll(paths);
      res.json({ success: report.failed === 0, report });
    } catch (err) {
      res.status(502).json({ error: errorMessage(err) });
    }
  });

  boxIntegration.startAutoSync();
  return boxIntegration;
}
