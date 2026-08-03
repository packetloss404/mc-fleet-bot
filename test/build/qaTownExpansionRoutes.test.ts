import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { verifyTownExpansionRoutes } from '../../scripts/qa_town_expansion_routes.mjs';

describe('Town Expansion representative route QA', () => {
  it('fails closed when the manifest does not bind the immutable snapshot', async () => {
    const source = JSON.parse(fs.readFileSync(
      path.resolve(
        'docs/redevelopment/2026-07-28-town-expansion/'
        + 'town-expansion-representative-route-manifest.json',
      ),
      'utf8',
    ));
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'town-route-qa-'));
    const manifest = path.join(temp, 'manifest.json');
    source.postSnapshot.sha256 = '0'.repeat(64);
    source.routes = [source.routes.find(
      (route: { id: string }) => route.id === 'TE-ROUTE-CIVIC-SECRET-ARCHIVE',
    )];
    source.requiredDomains = ['civic-guild-library'];
    fs.writeFileSync(manifest, `${JSON.stringify(source, null, 2)}\n`);
    try {
      const report = await verifyTownExpansionRoutes({
        manifest,
        noWrite: true,
      });
      expect(report.status).toBe('FAIL');
      expect(report.summary.identityFailures).toContain(
        'post snapshot hash mismatch',
      );
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }, 60_000);

  it('proves the isolated Library-Guild route in both directions', async () => {
    const source = JSON.parse(fs.readFileSync(
      path.resolve(
        'docs/redevelopment/2026-07-28-town-expansion/'
        + 'town-expansion-representative-route-manifest.json',
      ),
      'utf8',
    ));
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'town-route-qa-'));
    const manifest = path.join(temp, 'manifest.json');
    source.routes = [source.routes.find(
      (route: { id: string }) => route.id === 'TE-ROUTE-CIVIC-SECRET-ARCHIVE',
    )];
    source.requiredDomains = ['civic-guild-library'];
    source.isolationAssertions = [];
    fs.writeFileSync(manifest, `${JSON.stringify(source, null, 2)}\n`);
    try {
      const report = await verifyTownExpansionRoutes({
        manifest,
        noWrite: true,
      });
      expect(report.status).toBe('PASS');
      expect(report.tests).toHaveLength(1);
      expect(report.tests[0].directions).toHaveLength(2);
      expect(report.tests[0].directions.every(
        (direction: { passed: boolean }) => direction.passed,
      )).toBe(true);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }, 60_000);
});
