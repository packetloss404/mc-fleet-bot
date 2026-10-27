import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(root, 'public');
const sourceRoots = ['app', 'components', 'lib'].map((name) => join(root, name));
const assetPattern = /["'`](\/[^"'`\s?#]+\.(?:csv|html|ico|json|md|pdf|png|svg|webp))(?:[?#][^"'`]*)?["'`]/giu;
const mapExtensions = new Set(['.png', '.svg', '.webp']);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  }));
  return nested.flat();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function referencedAssets(text) {
  return [...text.matchAll(assetPattern)].map((match) => match[1]);
}

function jsonAssetReferences(value, found = []) {
  if (typeof value === 'string') {
    if (/^\/[^?#]+\.(?:csv|html|ico|json|md|pdf|png|svg|webp)(?:[?#].*)?$/iu.test(value)) {
      found.push(value.replace(/[?#].*$/u, ''));
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => jsonAssetReferences(item, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => jsonAssetReferences(item, found));
  }
  return found;
}

async function sourceAssetReferences() {
  const sourceFiles = (await Promise.all(sourceRoots.map(filesBelow)))
    .flat()
    .filter((path) => ['.ts', '.tsx'].includes(extname(path)));
  const references = new Set();
  for (const path of sourceFiles) {
    const source = await readFile(path, 'utf8');
    referencedAssets(source).forEach((reference) => references.add(reference));

    for (const match of source.matchAll(/from\s+["']([^"']+\.json)["']/gu)) {
      const importedPath = resolve(dirname(path), match[1]);
      const importedPublicPath = relative(publicRoot, importedPath);
      if (!importedPublicPath.startsWith('..')) {
        references.add(`/${importedPublicPath}`);
      }
      try {
        jsonAssetReferences(await readJson(importedPath))
          .forEach((reference) => references.add(reference));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
  }
  return references;
}

function publicPath(reference) {
  return join(publicRoot, decodeURIComponent(reference).replace(/^\/+/, ''));
}

async function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/u, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

test('all report-linked publication assets exist', async () => {
  const references = await sourceAssetReferences();
  assert.ok(references.size > 100, `expected broad publication coverage, found ${references.size} assets`);

  const missing = [];
  const empty = [];
  for (const reference of references) {
    // This URL is implemented by app/favicon.ico/route.ts rather than public/.
    if (reference === '/favicon.ico') continue;
    const path = publicPath(reference);
    try {
      await access(path);
      if ((await stat(path)).size === 0) empty.push(reference);
    } catch {
      missing.push(reference);
    }
  }
  assert.deepEqual(missing, [], `missing linked assets:\n${missing.join('\n')}`);
  assert.deepEqual(empty, [], `empty linked assets:\n${empty.join('\n')}`);
});

test('currently displayed map SVGs contain no unresolved template placeholders', async () => {
  const mainSource = await readFile(join(root, 'app/reports/master-plan/page.tsx'), 'utf8');
  const currentReferences = new Set(
    referencedAssets(mainSource).filter((reference) => mapExtensions.has(extname(reference))),
  );
  for (const manifestName of [
    'current-26-aug-decision-maps/publication-manifest.json',
    'current-26-aug-build-contract-maps/publication-manifest.json',
  ]) {
    jsonAssetReferences(await readJson(join(publicRoot, manifestName)))
      .filter((reference) => mapExtensions.has(extname(reference)))
      .forEach((reference) => currentReferences.add(reference));
  }

  const unresolved = [];
  for (const reference of currentReferences) {
    if (extname(reference) !== '.svg') continue;
    const source = await readFile(publicPath(reference), 'utf8');
    if (/\$\{[^}]+\}|\{\{[^}]+\}\}/u.test(source)) unresolved.push(reference);
  }
  assert.deepEqual(
    unresolved,
    [],
    `current linked maps contain unresolved template placeholders:\n${unresolved.join('\n')}`,
  );
});

test('verified C01 maps match their tracked source manifests and contain real geometry', async () => {
  const aggregate = await readJson(join(
    publicRoot,
    'c01-verified-as-built-2026-10-27/publication-manifest.json',
  ));
  assert.equal(aggregate.authority.readOnly, true);
  assert.equal(aggregate.authority.worldMutationAuthorized, false);
  assert.equal(aggregate.authority.commissioningClaim, false);
  assert.equal(aggregate.publications.length, 3);

  let svgCount = 0;
  for (const publication of aggregate.publications) {
    assert.ok(publication.scope.canonicalTargetCount > 0, `${publication.id} needs canonical targets`);
    assert.match(publication.scope.canonicalCoordinateSetSha256, /^[a-f0-9]{64}$/u);

    const sourceManifestBytes = await readFile(resolve(root, '..', publication.sourceManifest.path));
    assert.equal(
      createHash('sha256').update(sourceManifestBytes).digest('hex'),
      publication.sourceManifest.sha256,
      `${publication.id} source manifest binding`,
    );
    const copiedManifestBytes = await readFile(publicPath(publication.manifestHref));
    assert.deepEqual(copiedManifestBytes, sourceManifestBytes, `${publication.id} manifest copy must be exact`);
    const nested = JSON.parse(copiedManifestBytes.toString('utf8'));
    assert.equal(nested.releaseId, publication.releaseId);
    assert.deepEqual(nested.scope, publication.scope);

    for (const asset of publication.assets) {
      const bytes = await readFile(publicPath(asset.href));
      assert.equal(bytes.byteLength, asset.bytes, `${asset.href} byte count`);
      assert.equal(
        createHash('sha256').update(bytes).digest('hex'),
        asset.sha256,
        `${asset.href} hash`,
      );
      const nestedAsset = nested.assets.find((candidate) => candidate.file === asset.file);
      assert.deepEqual(
        { bytes: nestedAsset?.bytes, sha256: nestedAsset?.sha256 },
        { bytes: asset.bytes, sha256: asset.sha256 },
        `${asset.href} nested manifest binding`,
      );
      if (asset.kind === 'plan' || asset.kind === 'section') {
        svgCount += 1;
        const svg = bytes.toString('utf8');
        assert.doesNotMatch(svg, /\$\{[^}]+\}|\{\{[^}]+\}\}/u, `${asset.href} template placeholder`);
        const geometryCount = [...svg.matchAll(/<(?:circle|line|path|polygon|polyline|rect)\b/gu)].length;
        assert.ok(geometryCount >= 20, `${asset.href} needs rendered coordinate geometry`);
      }
    }
  }
  assert.equal(svgCount, 6, 'three verified C01 publications must expose plan and section maps');
});

test('current report and historical reports are labeled with distinct evidence dates', async () => {
  const masterPlan = await readFile(join(root, 'app/reports/master-plan/page.tsx'), 'utf8');
  const archive = await readFile(join(root, 'app/reports/masterplan-program/page.tsx'), 'utf8');
  const underground = await readFile(join(root, 'app/reports/underground-navigation/page.tsx'), 'utf8');

  assert.match(masterPlan, /id=["']current-plan-state["']/u);
  assert.match(masterPlan, /Current documented plan state/u);
  assert.match(masterPlan, /R00[^<]{0,80}7\s*\/\s*7\s*PASS/u);
  assert.match(masterPlan, /bounded (?:MP05 )?MVP(?: is)? accepted/iu);
  assert.match(masterPlan, /Historical reconciliation\s*·\s*22 August 2026/u);

  assert.match(archive, /Historical archive\s*·\s*5 August 2026/u);
  assert.match(archive, /R00 is now 7\s*\/\s*7 PASS; bounded MP05 MVP accepted\./u);
  assert.match(archive, /href=["']\/reports\/master-plan#current-plan-state["']/u);

  assert.match(underground, /Historical underground atlas\s*·\s*regenerated 27 August 2026/u);
  assert.match(underground, /href=["']\/reports\/master-plan#current-plan-state["']/u);
});

test('the current plan state is source-bound and explicitly read-only', async () => {
  const current = await readJson(join(publicRoot, 'current-plan-state/index.json'));
  assert.equal(current.reconciledOn, '2026-10-27');
  assert.equal(current.authority.readOnly, true);
  assert.equal(current.authority.trackedSourcesOnly, true);
  assert.equal(current.authority.liveWorldRecertified, false);
  assert.equal(current.authority.worldMutationAuthorized, false);
  assert.equal(current.plans.length, 13);
  assert.match(current.plans.find((plan) => plan.id === 'MP05')?.status ?? '', /BOUNDED MVP ACCEPTED/u);
  assert.equal(current.historicalReconciliation.masterPlanRailwayReport.classification, 'DATED_ARCHIVE');
  assert.equal(current.historicalReconciliation.masterplanProgram.classification, 'DATED_ARCHIVE');

  for (const source of current.sources) {
    assert.match(source.sha256, /^[a-f0-9]{64}$/u);
    const bytes = await readFile(publicPath(source.href));
    assert.equal(bytes.byteLength, source.bytes, `${source.id} byte count must match its source binding`);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      source.sha256,
      `${source.id} hash must match its source binding`,
    );
  }
});

test('the historical underground package is complete and explicitly dated', async () => {
  const underground = join(publicRoot, 'underground');
  const [portal, qa, manifest, publication] = await Promise.all([
    readJson(join(underground, 'portal-summary.json')),
    readJson(join(underground, 'report-qa.json')),
    readJson(join(underground, 'artifact-manifest.json')),
    readJson(join(underground, 'publication-manifest.json')),
  ]);
  const expectedCounts = {
    allWorldFeatures: 1226,
    undergroundNavigationRecords: 298,
    maps: 20,
    screenshots: 22,
    contactSheets: 2,
    entranceAndAccessRecords: 27,
    pdfPages: 112,
  };
  for (const [name, expected] of Object.entries(expectedCounts)) {
    assert.equal(portal.counts[name], expected, `portal ${name}`);
    assert.equal(qa.counts[name], expected, `QA ${name}`);
  }
  assert.equal(portal.status, 'PASS_PORTAL_SUMMARY');
  assert.equal(qa.status, 'PASS');
  assert.deepEqual(qa.failedGates, []);
  assert.ok(Object.values(qa.gates).every(Boolean), 'all underground QA gates must pass');
  assert.equal(manifest.status, 'PASS');
  assert.equal(manifest.artifactCount, 52);
  assert.equal(publication.status, 'PASS_STATIC_ASSETS_PREPARED');
  assert.equal(publication.publication.verifiedSourceArtifacts, 52);
  assert.match(publication.source.packageLabel, /regenerated and sealed 2026-08-27/u);
  assert.deepEqual(portal.sourceEdition, {
    inventoryGeneratedAtUtc: '2026-08-26T16:19:07.897Z',
    sealedAtUtc: '2026-08-27T17:11:28.256Z',
    sourcePackage: 'docs/redevelopment/2026-07-28-underground-navigation',
  });

  const portalBinding = publication.publication.portalSummary;
  const portalBytes = await readFile(join(underground, portalBinding.path));
  assert.equal(portalBytes.byteLength, portalBinding.bytes);
  assert.equal(createHash('sha256').update(portalBytes).digest('hex'), portalBinding.sha256);

  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(join(underground, artifact.file));
    assert.equal(bytes.byteLength, artifact.bytes, `${artifact.file} byte count must match the underground manifest`);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      artifact.sha256,
      `${artifact.file} hash must match the underground manifest`,
    );
  }
});

test('POI portal, complete directory, CSV, QA, and publication manifests agree', async () => {
  const coordinates = join(publicRoot, 'coordinates');
  const [directory, portal, qa, manifest, publication, csv] = await Promise.all([
    readJson(join(coordinates, 'poi-coordinate-directory.json')),
    readJson(join(coordinates, 'portal-summary.json')),
    readJson(join(coordinates, 'report-qa.json')),
    readJson(join(coordinates, 'artifact-manifest.json')),
    readJson(join(coordinates, 'publication-manifest.json')),
    readFile(join(coordinates, 'poi-coordinate-directory.csv'), 'utf8'),
  ]);
  const expected = directory.records.length;
  assert.equal(directory.counts.records, expected);
  assert.equal(portal.records.length, expected);
  assert.equal(portal.counts.records, expected);
  assert.equal(qa.counts.records, expected);
  assert.equal(manifest.counts.records, expected);
  assert.equal(publication.counts.records, expected);
  assert.equal(directory.counts.pdfPages, 137);
  assert.equal(qa.status, 'PASS');
  assert.equal(manifest.status, 'SEALED');
  assert.equal(publication.status, 'PASS_PUBLISHED');
  assert.ok(Object.values(qa.checks).every(Boolean), 'all published POI QA checks must pass');

  const rows = await parseCsv(csv);
  assert.equal(rows.length - 1, expected, 'CSV data row count must match JSON records');
  assert.equal(new Set(directory.records.map((record) => record.id)).size, expected, 'POI IDs must be unique');
  assert.equal(
    Object.values(directory.counts.byCategory).reduce((total, count) => total + count, 0),
    expected,
    'category counts must partition the complete directory',
  );

  for (const artifact of publication.files) {
    const path = join(root, artifact.path);
    const bytes = await readFile(path);
    assert.equal(bytes.byteLength, artifact.bytes, `${artifact.path} byte count must match the publication manifest`);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      artifact.sha256,
      `${artifact.path} hash must match the publication manifest`,
    );
  }
});
