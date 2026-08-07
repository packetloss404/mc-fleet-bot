import fs from 'node:fs';
import path from 'node:path';

import { DevtoolsError } from './errors.js';
import { assertIdentifier, writeJsonAtomic } from './files.js';
import type { JobLogEntry, ReportJob } from './types.js';

export class JobStore {
  readonly directory: string;

  constructor(directory: string) {
    this.directory = path.resolve(directory);
    fs.mkdirSync(this.directory, { recursive: true });
  }

  create(job: ReportJob): ReportJob {
    assertIdentifier(job.id, 'job id');
    const filename = this.filename(job.id);
    if (fs.existsSync(filename)) {
      throw new DevtoolsError(`Job already exists: ${job.id}`, 'JOB_EXISTS');
    }
    writeJsonAtomic(filename, job);
    return job;
  }

  get(id: string): ReportJob {
    const filename = this.filename(id);
    if (!fs.existsSync(filename)) {
      throw new DevtoolsError(`Job not found: ${id}`, 'JOB_NOT_FOUND');
    }
    return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReportJob;
  }

  update(id: string, patch: Partial<ReportJob>): ReportJob {
    const current = this.get(id);
    const next = { ...current, ...patch, id: current.id };
    writeJsonAtomic(this.filename(id), next);
    return next;
  }

  appendLog(id: string, entry: JobLogEntry): ReportJob {
    const current = this.get(id);
    return this.update(id, { logs: [...current.logs, entry] });
  }

  /**
   * Mark a queued or running job as cancelled. The running worker polls
   * the persisted status between steps; when it observes the cancelled
   * flag it aborts cleanly with `JobCancelledError`.
   */
  cancel(id: string): ReportJob {
    const current = this.get(id);
    if (
      current.status === 'completed' ||
      current.status === 'failed' ||
      current.status === 'cancelled'
    ) {
      throw new DevtoolsError(
        `Job ${id} is ${current.status} and cannot be cancelled`,
        'JOB_NOT_CANCELLABLE',
      );
    }
    return this.update(id, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
      currentStep: undefined,
      progress: undefined,
      logs: [
        ...current.logs,
        {
          at: new Date().toISOString(),
          level: 'info',
          message: 'Job cancelled by operator',
        },
      ],
    });
  }

  list(): ReportJob[] {
    return fs
      .readdirSync(this.directory)
      .filter((filename) => filename.endsWith('.json'))
      .map((filename) => {
        try {
          return JSON.parse(
            fs.readFileSync(path.join(this.directory, filename), 'utf8'),
          ) as ReportJob;
        } catch {
          return null;
        }
      })
      .filter((job): job is ReportJob => job !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private filename(id: string): string {
    assertIdentifier(id, 'job id');
    return path.join(this.directory, `${id}.json`);
  }
}
