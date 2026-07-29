import type { ReportJob } from '@mc-fleet/world-core';

import { ReportService } from './service.js';

export class ReportQueue {
  private readonly pending: string[] = [];
  private active = false;

  constructor(private readonly service: ReportService) {}

  enqueue(jobId: string): void {
    this.pending.push(jobId);
    void this.drain();
  }

  state(): { active: boolean; queued: number } {
    return { active: this.active, queued: this.pending.length };
  }

  async runAndWait(jobId: string): Promise<ReportJob> {
    while (this.active || this.pending.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    this.active = true;
    try {
      return await this.service.run(jobId);
    } finally {
      this.active = false;
      void this.drain();
    }
  }

  private async drain(): Promise<void> {
    if (this.active) return;
    const next = this.pending.shift();
    if (!next) return;
    this.active = true;
    try {
      await this.service.run(next);
    } finally {
      this.active = false;
      void this.drain();
    }
  }
}
