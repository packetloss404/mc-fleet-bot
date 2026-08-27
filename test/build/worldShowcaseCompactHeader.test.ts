import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (filename: string) => fs.readFileSync(path.join(ROOT, filename), 'utf8');
const reportPages = [
  ['master-plan', 'master-plan'],
  ['underground-navigation', 'underground-navigation'],
  ['masterplan-program', 'masterplan-program'],
  ['poi-coordinate-directory', 'poi-coordinate-directory'],
  ['empty-eight', 'empty-eight'],
  ['bunker-construction-status', 'bunker-construction-status'],
];

describe('compact sitewide report header', () => {
  it('is installed on the library and every report route', () => {
    expect(read('world-showcase/app/page.tsx')).toContain('<SiteHeader />');
    for (const [directory, slug] of reportPages) {
      const source = read(`world-showcase/app/reports/${directory}/page.tsx`);
      expect(source).toContain(`import { SiteHeader } from '../../../components/SiteHeader';`);
      expect(source).toContain(`<SiteHeader current="${slug}" />`);
    }
  });

  it('renders all registered reports in desktop and mobile navigation', () => {
    const source = read('world-showcase/components/SiteHeader.tsx');
    expect(source).toContain("import { reports } from '../lib/reports';");
    expect(source.match(/reports\.map/g)).toHaveLength(2);
    expect(source).toContain('aria-current');
    expect(source).toContain('<details');
  });

  it('caps the navigation chrome at 54px desktop and 48px mobile', () => {
    const css = read('world-showcase/components/SiteHeader.module.css');
    expect(css).toMatch(/\.header\s*\{[\s\S]*?height:\s*54px;/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*?\.header\s*\{[^}]*height:\s*48px;/);
    expect(css).toContain('@media (max-width: 1080px)');
    expect(css).toContain('position: sticky');
  });

  it('removes the superseded oversized per-page nav bars', () => {
    for (const [directory] of reportPages) {
      const source = read(`world-showcase/app/reports/${directory}/page.tsx`);
      expect(source).not.toContain('<nav className="topbar">');
      expect(source).not.toContain('<nav className="ee-nav">');
      expect(source).not.toMatch(/<nav className=\{styles\.nav\}>/);
    }
  });
});
