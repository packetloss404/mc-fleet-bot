import path from 'node:path';

import { DevtoolsError } from '@mc-fleet/world-core';
import type { ReportJob } from '@mc-fleet/world-core';
import express from 'express';

import type { AppContext } from './context.js';

function publicJob(
  job: ReportJob,
  artifactRoot: string,
): ReportJob & {
  reportUrl?: string;
} {
  const relative = path
    .relative(artifactRoot, job.outputDirectory)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');
  return {
    ...job,
    reportUrl: job.artifacts.includes('report.html')
      ? `/artifacts/${relative}/report.html`
      : undefined,
  };
}

export function createApp(context: AppContext): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use((_request, response, next) => {
    response.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "img-src 'self' data:",
        "style-src 'self'",
        "script-src 'self'",
        "frame-src 'self'",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; '),
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      mode: 'read-only',
      queue: context.queue.state(),
    });
  });

  app.get('/api/overview', (_request, response) => {
    const jobs = context.jobStore.list();
    response.json({
      mode: 'read-only',
      registry: path.basename(context.registryFile),
      servers: context.registry.servers.map((server) => ({
        id: server.id,
        name: server.name,
        worlds: server.worlds.map((world) => ({
          id: world.id,
          name: world.name,
          dimension: world.dimension,
          databaseKeys: Object.keys(world.databases ?? {}),
        })),
      })),
      recipes: context.service.listRecipes().map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        parameters: recipe.parameters ?? {},
        steps: recipe.steps.map((step) => ({
          id: step.id,
          type: step.type,
        })),
      })),
      jobs: jobs.slice(0, 50).map((job) => publicJob(job, context.artifactRoot)),
      queue: context.queue.state(),
    });
  });

  app.get('/api/servers', (_request, response) => {
    response.json(
      context.registry.servers.map((server) => ({
        id: server.id,
        name: server.name,
        worlds: server.worlds.map((world) => ({
          id: world.id,
          name: world.name,
          dimension: world.dimension,
          databaseKeys: Object.keys(world.databases ?? {}),
        })),
      })),
    );
  });

  app.get('/api/recipes', (_request, response) => {
    response.json(context.service.listRecipes());
  });

  app.get('/api/jobs', (_request, response) => {
    response.json(context.jobStore.list().map((job) => publicJob(job, context.artifactRoot)));
  });

  app.get('/api/jobs/:id', (request, response, next) => {
    try {
      response.json(publicJob(context.jobStore.get(request.params.id), context.artifactRoot));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/jobs', (request, response, next) => {
    try {
      const body = request.body as Record<string, unknown>;
      const recipeId = typeof body.recipeId === 'string' ? body.recipeId : '';
      const serverId = typeof body.serverId === 'string' ? body.serverId : '';
      const worldId = typeof body.worldId === 'string' ? body.worldId : '';
      const parameters =
        body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters)
          ? (body.parameters as Record<string, unknown>)
          : {};
      const job = context.service.submit({
        recipeId,
        serverId,
        worldId,
        parameters,
      });
      context.queue.enqueue(job.id);
      response.status(202).json(publicJob(job, context.artifactRoot));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/jobs/:id/cancel', (request, response, next) => {
    try {
      const job = context.service.cancel(request.params.id);
      response.json(publicJob(job, context.artifactRoot));
    } catch (error) {
      next(error);
    }
  });

  app.use(
    '/artifacts',
    express.static(context.artifactRoot, {
      dotfiles: 'deny',
      fallthrough: false,
      index: false,
    }),
  );
  app.use(
    express.static(context.dashboardDirectory, {
      dotfiles: 'deny',
      index: 'index.html',
    }),
  );

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof DevtoolsError) {
        response.status(error.code.endsWith('_NOT_FOUND') ? 404 : 400).json({
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      response.status(500).json({
        error: message,
        code: 'INTERNAL_ERROR',
      });
    },
  );
  return app;
}
