#!/usr/bin/env node
/** Publish exact, verified C01 coordinate maps; older visual attempts stay archived. */
import fs from 'node:fs';
import path from 'node:path';
import {
  invariant,
  publishDirectoryAtomically,
  readJson,
  resolvePackageFile,
  sha256File,
  validateArtifactEntries,
  writeJson,
} from './safe_publication.mjs';

const siteRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const publicDirectory = 'c01-verified-as-built-2026-10-27';
const target = path.join(siteRoot, 'public', publicDirectory);
const publications = [
  {
    id: 'main-switchback',
    name: 'C01 main switchback transition 01',
    releaseId: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01',
    source: 'mp11-c01-main-switchback-transition-01-as-built-2026-10-27',
    expectedTargets: 928,
    expectedChanged: 387,
    expectedStations: 30,
  },
  {
    id: 'upper-portion',
    name: 'C01 upper-portion redesign 01',
    releaseId: 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01',
    source: 'mp11-c01-upper-portion-redesign-01-as-built-2026-10-27',
    expectedTargets: 433,
    expectedChanged: 19,
    expectedStations: 21,
  },
  {
    id: 'upper-landing-interface',
    name: 'C01 upper-landing interface construction 01',
    releaseId: 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-01',
    source: 'mp11-c01-upper-landing-endpoint-opening-transition-01-as-built-2026-10-27',
    expectedTargets: 56,
    expectedChanged: 56,
    expectedStations: 0,
  },
];

// Validate all three complete source packages before starting any replacement.
const sources = publications.map((publication) => {
  const source = path.join(repoRoot, 'docs/masterplans/11-town-expansion-r1/02-visuals', publication.source);
  const manifestFile = path.join(source, 'publication-manifest.json');
  const manifest = readJson(manifestFile);
  invariant(manifest.releaseId === publication.releaseId, `Release identity drift: ${publication.id}`);
  invariant(manifest.classification === 'READ_ONLY_AS_BUILT_VISUAL_EVIDENCE', `Invalid visual classification: ${publication.id}`);
  invariant(manifest.status === 'AS_BUILT_POST_VERIFIED_REVERSIBLE', `Unaccepted visual state: ${publication.id}`);
  invariant(manifest.authority.readOnly && !manifest.authority.worldMutationAuthorized && !manifest.authority.commissioningClaim,
    `Invalid authority boundary: ${publication.id}`);
  invariant(manifest.scope.canonicalTargetCount === publication.expectedTargets
    && manifest.scope.changedCount === publication.expectedChanged
    && manifest.scope.stationCount === publication.expectedStations, `Visual scope drift: ${publication.id}`);
  validateArtifactEntries(source, manifest.assets, 'file');
  for (const [name, binding] of Object.entries(manifest.evidence)) {
    if (typeof binding !== 'object' || !binding?.path) continue;
    const evidence = resolvePackageFile(repoRoot, binding.path);
    invariant(sha256File(evidence) === binding.sha256, `Accepted ${name} evidence drift: ${publication.id}`);
  }
  for (const asset of manifest.assets.filter((item) => item.kind === 'plan' || item.kind === 'section')) {
    const svg = fs.readFileSync(resolvePackageFile(source, asset.file), 'utf8');
    invariant(!/\$\{[^}]+\}|\{\{[^}]+\}\}/.test(svg), `Template placeholder: ${publication.id}/${asset.file}`);
    invariant(svg.includes(`data-target-count="${publication.expectedTargets}"`), `Missing plotted targets: ${publication.id}`);
    invariant(/<rect\b[^>]*><title>/.test(svg), `No coordinate cells: ${publication.id}`);
  }
  invariant(manifest.assets.filter((item) => item.kind === 'plan').length === 1
    && manifest.assets.filter((item) => item.kind === 'section').length === 1,
  `Expected exactly one plan and section: ${publication.id}`);
  return { publication, source, manifest, manifestFile };
});

publishDirectoryAtomically(target, (staging) => {
  const published = sources.map(({ publication, source, manifest, manifestFile }) => {
    const destination = path.join(staging, publication.id);
    fs.mkdirSync(destination, { recursive: true });
    for (const asset of manifest.assets) {
      fs.copyFileSync(resolvePackageFile(source, asset.file), resolvePackageFile(destination, asset.file));
    }
    fs.copyFileSync(manifestFile, path.join(destination, 'publication-manifest.json'));
    validateArtifactEntries(destination, manifest.assets, 'file');
    return {
      id: publication.id,
      name: publication.name,
      releaseId: publication.releaseId,
      sourceManifest: {
        path: path.relative(repoRoot, manifestFile).split(path.sep).join('/'),
        sha256: sha256File(manifestFile),
      },
      generatedAtUtc: manifest.generatedAtUtc,
      scope: manifest.scope,
      nonClaims: manifest.nonClaims,
      manifestHref: `/${publicDirectory}/${publication.id}/publication-manifest.json`,
      assets: manifest.assets.map((asset) => ({
        ...asset,
        href: `/${publicDirectory}/${publication.id}/${asset.file}`,
      })),
    };
  });
  writeJson(path.join(staging, 'publication-manifest.json'), {
    schemaVersion: 1,
    id: 'C01-VERIFIED-AS-BUILT-VISUALS-2026-10-27',
    preparedAtUtc: new Date().toISOString(),
    authority: { readOnly: true, worldMutationAuthorized: false, commissioningClaim: false },
    publications: published,
  });
});

console.log(`Published ${publications.length} verified C01 visual packages to public/${publicDirectory}.`);
