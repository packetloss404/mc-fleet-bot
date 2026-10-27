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
