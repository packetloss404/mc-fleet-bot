#!/usr/bin/env node
/**
 * Prepare a versioned, static Sites payload from the offline world catalog.
 *
 * This is read-only with respect to Minecraft and every database. It copies
 * already-generated artifacts and emits a compact building catalog for the site.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SOURCE = path.resolve(
  ROOT,
  value('--source', 'data/exports/world-catalog-wave2-post-2026-07-28'),
);
const SURFACE = path.resolve(
  ROOT,
  value(
    '--surface',
    'data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a',
  ),
);
const SITE = path.resolve(ROOT, value('--site', 'world-showcase'));
const PUBLIC = path.join(SITE, 'public');

const areaNames = {
  'mainstreet-america': 'MainStreet America',
  'raven-rock': 'Raven Rock',
  ravensgate: 'Ravensgate',
  ravensreach: 'Ravensreach',
  'westlight-district': 'Westlight District',
  'westlight-venue': 'Westlight Venue',
  'approach-road': 'Western Approach',
};

function ensure(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copy(source, target) {
  ensure(path.dirname(target));
  fs.copyFileSync(source, target);
  return target;
}

function copyMedia(sourcePath, publicFolder, destinationName = path.basename(sourcePath)) {
  const source = path.join(ROOT, sourcePath);
  if (!fs.existsSync(source)) return null;
  copy(source, path.join(PUBLIC, publicFolder, destinationName));
  return `/${publicFolder}/${destinationName}`;
}

ensure(path.join(PUBLIC, 'atlas'));
ensure(path.join(PUBLIC, 'catalog'));
ensure(path.join(PUBLIC, 'screenshots'));
ensure(path.join(PUBLIC, 'reports'));
ensure(path.join(PUBLIC, 'data'));

copy(
  path.join(SURFACE, '00-overall-active-world-surface-atlas.png'),
  path.join(PUBLIC, 'atlas/whole-world.png'),
);
copy(
  path.join(SURFACE, '01-ravensreach-core-and-old-town.png'),
  path.join(PUBLIC, 'atlas/ravensreach.png'),
);
copy(
  path.join(SURFACE, '02-ravensgate.png'),
  path.join(PUBLIC, 'atlas/ravensgate.png'),
);
copy(
  path.join(SURFACE, '04-westlight-venue-and-district.png'),
  path.join(PUBLIC, 'atlas/westlight.png'),
);
copy(
  path.join(SURFACE, '05-western-project-corridor.png'),
  path.join(PUBLIC, 'atlas/western-corridor.png'),
);
copy(
  path.join(SURFACE, '06-raven-rock-surface-access.png'),
  path.join(PUBLIC, 'atlas/raven-rock.png'),
);
copy(
  path.join(SOURCE, 'floorplans/01-mainstreet-america-overview.png'),
  path.join(PUBLIC, 'atlas/mainstreet.png'),
);
copy(
  path.join(SOURCE, 'floorplans/02-raven-rock-overview.png'),
  path.join(PUBLIC, 'atlas/underground.png'),
);

for (const filename of [
  'database-report.html',
  'database-report.json',
  'features.json',
  'object-media-index.json',
  'capture-manifest.json',
  'README.md',
]) {
  copy(path.join(SOURCE, filename), path.join(PUBLIC, 'reports', filename));
}
copy(
  path.join(SOURCE, 'floorplans/worldwide-interior-floorplan-atlas.pdf'),
  path.join(PUBLIC, 'reports/worldwide-interior-floorplan-atlas.pdf'),
);
if (fs.existsSync(path.join(SOURCE, 'floorplans/c01-recessed-public-portal-floorplan.pdf'))) {
  copy(
    path.join(SOURCE, 'floorplans/c01-recessed-public-portal-floorplan.pdf'),
    path.join(PUBLIC, 'reports/c01-recessed-public-portal-floorplan.pdf'),
  );
}

const mediaIndex = JSON.parse(
  fs.readFileSync(path.join(SOURCE, 'object-media-index.json'), 'utf8'),
);

const buildings = mediaIndex.objects
  .filter((object) => (
    object.kind === 'building'
    || object.media.some(
      (media) => media.type === 'screenshot' && media.relation === 'exact_object',
    )
  ))
  .map((object) => {
    const floorplan = object.media.find(
      (media) => media.type === 'floorplan' && media.relation === 'exact_object',
    );
    const screenshot = object.media.find(
      (media) => media.type === 'screenshot' && media.relation === 'exact_object',
    );
    const contextualScreenshot = object.media.find(
      (media) => media.type === 'screenshot' && media.relation !== 'exact_object',
    );
    const safeId = `${object.projectId}-${object.externalId ?? object.featureId}`
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .toLowerCase();
    const floorplanPath = floorplan
      ? copyMedia(
        floorplan.path,
        'catalog',
        `${safeId}-${path.basename(floorplan.path)}`,
      )
      : null;
    const screenshotPath = screenshot
      ? copyMedia(
        screenshot.path,
        'screenshots',
        `${safeId}-${path.basename(screenshot.path)}`,
      )
      : null;
    const contextualPath = contextualScreenshot
      ? copyMedia(
        contextualScreenshot.path,
        'screenshots',
        `${safeId}-context-${path.basename(contextualScreenshot.path)}`,
      )
      : null;
    const chosenImage = screenshotPath ?? floorplanPath ?? contextualPath ?? '/atlas/whole-world.png';
    const bounds = object.bounds;
    const exactScreenshot = Boolean(screenshotPath);
    return {
      id: `${object.projectId}:${object.externalId ?? object.featureId}`,
      featureId: object.featureId,
      externalId: object.externalId,
      name: object.name,
      area: areaNames[object.projectId] ?? object.projectId,
      kind: object.kind,
      image: chosenImage,
      floorplan: floorplanPath,
      screenshot: screenshotPath,
      status: exactScreenshot
        ? 'exact perspective'
        : floorplanPath
          ? 'exact floor plan'
          : 'context linked',
      coordinates: `x ${bounds.minX}…${bounds.maxX} · z ${bounds.minZ}…${bounds.maxZ}`,
      note: exactScreenshot
        ? `Exact ${object.kind} database object with a snapshot-pinned post-release perspective.`
        : floorplanPath
          ? 'Exact database building and floor plan; dedicated perspective remains in the capture queue.'
          : 'Database object with contextual visual evidence; exact perspective remains in the capture queue.',
      sourceSnapshot: screenshot?.capture?.snapshotSha256
        ?? floorplan?.sourceSnapshot?.sha256
        ?? null,
    };
  })
  .sort((left, right) => (
    left.area.localeCompare(right.area)
    || String(left.externalId ?? '').localeCompare(String(right.externalId ?? ''))
  ));

const releaseGallery = [
  {
    title: 'R08 full cross-link',
    area: 'Wave 2 · MainStreet America',
    source: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/01-r08-overall-map.before.png',
  },
  {
    title: 'R08 / Main Street junction',
    area: 'Wave 2 · MainStreet America',
    source: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/04-r01-junction.before.png',
  },
  {
    title: 'R08 west gateway',
    area: 'Wave 2 · MainStreet America',
    source: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/03-west-gate.before.png',
  },
  {
    title: 'R08 wayfinding',
    area: 'Wave 2 · MainStreet America',
    source: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/07-r08-directory.before.png',
  },
  {
    title: 'T2b standardized liner',
    area: 'Wave 2 · Raven Rock',
    source: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-west-to-east.png',
  },
  {
    title: 'T2b section',
    area: 'Wave 2 · Raven Rock',
    source: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-section.png',
  },
  {
    title: 'MainStreet district',
    area: 'Wave 1 · MainStreet America',
    source: 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-district-oblique.after.png',
  },
  {
    title: 'West rear alley',
    area: 'Wave 1 · MainStreet America',
    source: 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-alley-w-long.after.png',
  },
  {
    title: 'B02 culinary forecourt',
    area: 'Wave 1 · MainStreet America',
    source: 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-b02-culinary.after.png',
  },
  {
    title: 'Garage H01',
    area: 'Wave 1 · MainStreet America',
    source: 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h01.after.png',
  },
  {
    title: 'C01 east concealment',
    area: 'Wave 1 · Bunker complex',
    source: 'data/exports/redevelopment-qa-2026-07-27/bunker/after/03-east-oblique.png',
  },
  {
    title: 'C01 mountainside road',
    area: 'Wave 1 · Bunker complex',
    source: 'data/exports/redevelopment-qa-2026-07-27/bunker/after/06-road-northbound.png',
  },
  {
    title: 'C01 recessed portal',
    area: 'Wave 1 · Bunker complex',
    source: 'data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/01-new-mouth-south.png',
  },
  {
    title: 'Raven Rock S1',
    area: 'Wave 1 · Tunnel system',
    source: 'data/exports/redevelopment-qa-2026-07-27/ravenrock/after/s1-west-to-east.png',
  },
  {
    title: 'Westlight screen',
    area: 'Wave 1 · Westlight Stadium',
    source: 'data/exports/redevelopment-qa-2026-07-27/westlight/after/south-middle-sports.png',
  },
].map((item, index) => ({
  ...item,
  image: copyMedia(
    item.source,
    'release',
    `${String(index + 1).padStart(2, '0')}-${path.basename(item.source)}`,
  ),
}));

const wave2Comparisons = [
  {
    title: 'Raven Rock T2b liner',
    copy: 'The same camera before and after the guarded ten-station liner pilot.',
    before: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/before-prerelease/t2b-west-to-east.png',
    after: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-west-to-east.png',
  },
  {
    title: 'Raven Rock T2b section',
    copy: 'The section view proves the new material, light, and route standard without hiding the intentional cave interface.',
    before: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/before-prerelease/t2b-section.png',
    after: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-section.png',
  },
  {
    title: 'MainStreet R08 network',
    copy: 'The same top-down camera shows the missing east–west link becoming a continuous three-wide shared street.',
    before: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08-prerelease/before/01-r08-overall-map.before.png',
    after: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/01-r08-overall-map.before.png',
  },
  {
    title: 'MainStreet / R08 junction',
    copy: 'The same perspective proves the cross-link, compact crossing, gate rhythm, and continuous route.',
    before: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08-prerelease/before/04-r01-junction.before.png',
    after: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/04-r01-junction.before.png',
  },
].map((item, index) => ({
  ...item,
  beforeImage: copyMedia(
    item.before,
    'wave2',
    `${String(index + 1).padStart(2, '0')}-before-${path.basename(item.before)}`,
  ),
  afterImage: copyMedia(
    item.after,
    'wave2',
    `${String(index + 1).padStart(2, '0')}-after-${path.basename(item.after)}`,
  ),
}));

const releaseReports = [
  ['as-built-release-completion.md', 'docs/redevelopment/2026-07-27/as-built-release-completion.md'],
  ['post-deployment-qa.md', 'docs/redevelopment/2026-07-27/post-deployment-qa.md'],
  ['requirements-traceability.md', 'docs/redevelopment/2026-07-27/requirements-traceability.md'],
  ['research-bibliography.md', 'docs/redevelopment/2026-07-27/research-bibliography.md'],
  ['post-deployment-qa.json', 'data/world-review/redevelopment-post-deployment-qa-2026-07-27.json'],
  ['route-qa.json', 'data/world-review/redevelopment-route-qa-2026-07-27.json'],
  ['database-import.json', 'data/world-review/redevelopment-release-database-import-2026-07-27.json'],
  ['atomic-transaction.json', 'data/world-review/redevelopment-atomic-transaction-2026-07-27.json'],
  ['wave2-readme.md', 'docs/redevelopment/2026-07-28-wave2/README.md'],
  ['wave2-as-built-release.md', 'docs/redevelopment/2026-07-28-wave2/as-built-release-report.md'],
  ['wave2-independent-acceptance.md', 'docs/redevelopment/2026-07-28-wave2/post-release-independent-acceptance.md'],
  ['wave2-artifact-register.md', 'docs/redevelopment/2026-07-28-wave2/artifact-register.md'],
  ['wave2-master-plan.html', 'docs/redevelopment/2026-07-28-wave2/master-plan.html'],
  ['wave2-integration-audit.md', 'docs/redevelopment/2026-07-28-wave2/integration-independent-audit.md'],
  ['wave2-mainstreet-engineering.md', 'docs/redevelopment/2026-07-28-wave2/mainstreet-wave2-r08-engineering.md'],
  ['wave2-tunnel-engineering.md', 'docs/redevelopment/2026-07-28-wave2/ravenrock-tunnel-wave2-engineering.md'],
  ['wave2-media-release.md', 'docs/redevelopment/2026-07-27/wave2-media-catalog-release.md'],
  ['wave2-post-release-qa.json', 'data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json'],
  ['wave2-route-qa.json', 'data/world-review/redevelopment-wave2-route-qa-2026-07-28.json'],
  ['wave2-database-import.json', 'data/world-review/redevelopment-wave2-database-import-2026-07-28.json'],
  ['wave2-atomic-transaction.json', 'data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json'],
  ['wave2-media-qa.json', 'data/world-review/world-media-wave2-2026-07-28.qa.json'],
  ['wave2-artifact-register.json', 'data/world-review/redevelopment-artifact-manifest-2026-07-28-wave2.json'],
];
for (const [destination, source] of releaseReports) {
  const sourcePath = path.join(ROOT, source);
  if (fs.existsSync(sourcePath)) {
    copy(sourcePath, path.join(PUBLIC, 'reports', destination));
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  sourceGeneratedAt: mediaIndex.generatedAt,
  snapshot: mediaIndex.snapshot,
  coverage: mediaIndex.coverage,
  buildings,
  releaseGallery,
  wave2Comparisons,
  release: {
    id: 'REDEV-2026-07-28-W2',
    status: 'PASS',
    packages: 7,
    targetCells: 37668,
    guardedOperations: 8160,
    routeTests: 24,
    directionalRuns: 48,
    postScreenshots: 184,
    importedFeatures: 95,
    databaseFeatures: mediaIndex.coverage.features,
    exactBuildingScreenshots:
      mediaIndex.coverage.buildingsWithExactObjectScreenshot,
    exactBuildingFloorplans:
      mediaIndex.coverage.buildingsWithExactFloorplan,
    postSnapshotSha256:
      'd05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999',
  },
};
fs.writeFileSync(
  path.join(PUBLIC, 'data/buildings.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
);

console.log(JSON.stringify({
  site: path.relative(ROOT, SITE),
  source: path.relative(ROOT, SOURCE),
  surface: path.relative(ROOT, SURFACE),
  catalogObjects: buildings.length,
  exactScreenshots: buildings.filter((object) => object.screenshot).length,
  exactBuildingFloorplans: buildings.filter(
    (object) => object.kind === 'building' && object.floorplan,
  ).length,
  releaseGallery: releaseGallery.length,
  wave2Comparisons: wave2Comparisons.length,
  snapshot: mediaIndex.snapshot.sha256,
}, null, 2));
