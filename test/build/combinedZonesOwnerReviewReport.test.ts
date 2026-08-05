import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const reportDirectory = path.join(repoRoot, 'masterplans', '05-combined-zones');
const reportPath = path.join(reportDirectory, 'phase1-owner-review-report.html');
const temporaryReportPath = path.join(reportDirectory, '.phase1-owner-review-report.test.html');
const bundle = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-owner-review-bundle.json'), 'utf8'));
const r00 = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-r00-readiness-audit.json'), 'utf8'));

afterAll(() => {
  if (existsSync(temporaryReportPath)) unlinkSync(temporaryReportPath);
});

describe('Combined Zones owner review HTML5 report', () => {
  it('is reproducible from the bound JSON evidence', () => {
    execFileSync(
      process.execPath,
      [
        'scripts/generate_combined_zones_owner_review_report.mjs',
        'masterplans/05-combined-zones/.phase1-owner-review-report.test.html',
      ],
      { cwd: repoRoot },
    );

    expect(readFileSync(temporaryReportPath, 'utf8')).toBe(readFileSync(reportPath, 'utf8'));
  });

  it('shows the exact review identity, safety boundary, packet statuses, and R00 gates', () => {
    const html = readFileSync(reportPath, 'utf8');

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(bundle.authority.bundlePayloadSha256);
    expect(html).toContain(bundle.authority.copyableStatement);
    expect(html).toContain('0 operations');
    expect(html).toContain('No live calls, database writes, Minecraft operations');
    expect(html).toContain('Concept intent · not measured evidence');
    expect(html).toContain('PassageWay route cells');

    for (const packet of bundle.packetSummary) {
      expect(html).toContain(packet.scope);
      expect(html).toContain(`${packet.remainingHoldCount} HOLD`);
    }

    for (const gate of r00.gates) {
      expect(html).toContain(gate.id.replace(/^G(\d+)_/, 'G$1 · ').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (character: string) => character.toUpperCase()));
      expect(html).toContain(gate.status);
    }
  });

  it('has no missing local links or images', () => {
    const html = readFileSync(reportPath, 'utf8');
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    const localReferences = references.filter((reference) => (
      !reference.startsWith('#')
      && !reference.startsWith('data:')
      && !reference.startsWith('http://')
      && !reference.startsWith('https://')
    ));

    expect(localReferences.length).toBeGreaterThan(20);
    for (const reference of localReferences) {
      expect(existsSync(path.resolve(reportDirectory, reference)), `Missing report reference: ${reference}`).toBe(true);
    }
  });
});
