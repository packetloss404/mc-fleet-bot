#!/usr/bin/env node
/** Validate and atomically publish the newest complete underground report package. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  invariant,
  publishDirectoryAtomically,
  readJson,
  resolvePackageFile,
  sha256File,
  writeJson,
} from './safe_publication.mjs';

const SITE_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const DEFAULT_SOURCE = path.join(
  REPO_ROOT,
  'docs/redevelopment/2026-07-28-underground-navigation',
);
const DEFAULT_TARGET = path.join(SITE_ROOT, 'public/underground');
const DEFAULT_ARCHIVE = path.join(
  SITE_ROOT,
  'public/world-atlas-2026-08-25/underground/navigation',
);
const HISTORICAL_RETAINED = ['screenshots/raven-rock-command-center.png'];

function artifactMatches(filename, artifact) {
  return fs.existsSync(filename)
    && fs.statSync(filename).isFile()
    && fs.statSync(filename).size === artifact.bytes
    && sha256File(filename) === artifact.sha256;
}

function validateUndergroundSource(source, archiveRoot) {
  const manifestFile = path.join(source, 'artifact-manifest.json');
  const qaFile = path.join(source, 'report-qa.json');
  const inventoryFile = path.join(source, 'underground-inventory.json');
  for (const filename of [manifestFile, qaFile, inventoryFile]) {
    invariant(fs.existsSync(filename), `Missing underground report input: ${path.basename(filename)}`);
  }

  const manifest = readJson(manifestFile);
  const qa = readJson(qaFile);
  const inventory = readJson(inventoryFile);
  invariant(manifest.status === 'PASS', 'Underground artifact manifest did not pass');
  invariant(qa.status === 'PASS', 'Underground report QA did not pass');
  invariant(inventory.physicalMutation === false, 'Underground report is not read-only');
  invariant(manifest.artifactCount === manifest.artifacts?.length, 'Underground manifest count drifted');
  const artifactFiles = new Map();
  const recoveredArtifacts = [];
  for (const artifact of manifest.artifacts) {
    const sourceFile = resolvePackageFile(source, artifact.file);
    if (artifactMatches(sourceFile, artifact)) {
      artifactFiles.set(artifact.file, sourceFile);
      continue;
    }
    const archiveFile = archiveRoot && (artifact.file.startsWith('maps/') || artifact.file.startsWith('screenshots/'))
      ? resolvePackageFile(archiveRoot, artifact.file)
      : null;
    invariant(
      archiveFile && artifactMatches(archiveFile, artifact),
      `Underground artifact is missing or drifted: ${artifact.file}`,
    );
    artifactFiles.set(artifact.file, archiveFile);
    recoveredArtifacts.push(artifact.file);
  }
  const historicalFiles = new Map();
  for (const relativePath of HISTORICAL_RETAINED) {
    const filename = resolvePackageFile(source, relativePath);
    invariant(fs.existsSync(filename), `Missing retained historical artifact: ${relativePath}`);
    historicalFiles.set(relativePath, filename);
  }

  invariant(inventory.counts.maps === inventory.maps?.length, 'Underground map inventory count drifted');
  invariant(inventory.counts.screenshots === inventory.screenshots?.length, 'Underground screenshot count drifted');
  invariant(
    inventory.counts.entranceAndAccessRecords === inventory.entrances?.length,
    'Underground entrance count drifted',
  );
  invariant(qa.counts.maps === inventory.counts.maps, 'Underground QA/map count drifted');
  invariant(qa.counts.screenshots === inventory.counts.screenshots, 'Underground QA/screenshot count drifted');
  invariant(qa.counts.pdfPages > 1, 'Underground PDF page count is missing');
  invariant(
    manifest.artifacts.filter((artifact) => artifact.file.startsWith('maps/')).length === inventory.counts.maps,
    'Underground manifest does not contain every map',
  );
  invariant(
    manifest.artifacts.filter((artifact) => artifact.file.startsWith('screenshots/')).length
      === inventory.counts.screenshots + inventory.counts.contactSheets,
    'Underground manifest does not contain every screenshot/contact sheet',
  );
  return {
    manifest,
    qa,
    inventory,
    manifestFile,
    qaFile,
    artifactFiles,
    recoveredArtifacts,
    historicalFiles,
  };
}

export function syncUndergroundReport({
  source = DEFAULT_SOURCE,
  target = DEFAULT_TARGET,
  archiveRoot = DEFAULT_ARCHIVE,
} = {}) {
  const expectedTarget = path.join(SITE_ROOT, 'public', 'underground');
  invariant(path.resolve(target) === expectedTarget, `Refusing unexpected underground target: ${target}`);
  const validated = validateUndergroundSource(source, archiveRoot);
  const preparedAtUtc = new Date().toISOString();
  let result;

  publishDirectoryAtomically(target, (staging) => {
    for (const artifact of validated.manifest.artifacts) {
      const destination = resolvePackageFile(staging, artifact.file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(validated.artifactFiles.get(artifact.file), destination);
      invariant(artifactMatches(destination, artifact), `Staged underground artifact drifted: ${artifact.file}`);
    }
    fs.copyFileSync(validated.manifestFile, path.join(staging, 'artifact-manifest.json'));
    for (const [relativePath, filename] of validated.historicalFiles) {
      const destination = resolvePackageFile(staging, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(filename, destination);
    }

    const systems = Object.entries(validated.inventory.systems).map(([id, system]) => ({
      id,
      label: system.name,
      records: system.records,
    }));
    const portalSummary = {
      schemaVersion: 2,
      generatedAtUtc: validated.inventory.generatedAtUtc,
      status: 'PASS_PORTAL_SUMMARY',
      sourcePackage: path.relative(REPO_ROOT, source),
      sourceEdition: {
        inventoryGeneratedAtUtc: validated.inventory.generatedAtUtc,
        sealedAtUtc: validated.manifest.generatedAt,
        sourcePackage: path.relative(REPO_ROOT, source),
      },
      counts: {
        ...validated.inventory.counts,
        pdfPages: validated.qa.counts.pdfPages,
        featureCountsBySystem: Object.fromEntries(
          systems.map((system) => [system.id, system.records]),
        ),
      },
      truthBoundary: validated.inventory.truthBoundary,
      accessAudit: validated.inventory.accessAudit,
      systems,
      entrances: validated.inventory.entrances,
      c01Levels: validated.inventory.c01.levels.map((level) => ({
        id: level.id,
        label: level.label,
        spaceCount: level.spaces.length,
      })),
      screenshots: validated.inventory.screenshots,
    };
    invariant(!('records' in portalSummary), 'Underground summary unexpectedly has coordinate records');
    const portalSummaryFile = path.join(staging, 'portal-summary.json');
    writeJson(portalSummaryFile, portalSummary);

    const publication = {
      schemaVersion: 2,
      id: 'ianlan-nextgen-underground-navigation-publication',
      sourceGeneratedAtUtc: validated.manifest.generatedAt,
      preparedAtUtc,
      status: 'PASS_STATIC_ASSETS_PREPARED',
      source: {
        root: path.relative(REPO_ROOT, source),
        packageLabel: '2026-07-28 source path; regenerated and sealed 2026-08-27',
        archiveRecoveryRoot: validated.recoveredArtifacts.length > 0
          ? path.relative(REPO_ROOT, archiveRoot)
          : null,
        archiveRecoveredArtifacts: validated.recoveredArtifacts,
        historicalRetainedArtifacts: [...validated.historicalFiles].map(([relativePath, filename]) => ({
          path: relativePath,
          bytes: fs.statSync(filename).size,
          sha256: sha256File(filename),
          scope: 'Historical screenshot retained for stable links; excluded from current screenshot counts.',
        })),
        artifactManifestSha256: sha256File(validated.manifestFile),
        reportQaSha256: sha256File(validated.qaFile),
      },
      publication: {
        root: path.relative(REPO_ROOT, target),
        verifiedSourceArtifacts: validated.manifest.artifactCount,
        maps: validated.inventory.counts.maps,
        screenshots: validated.inventory.counts.screenshots,
        contactSheets: validated.inventory.counts.contactSheets,
        additionalPortalSummary: 'portal-summary.json',
        portalSummary: {
          path: 'portal-summary.json',
          bytes: fs.statSync(portalSummaryFile).size,
          sha256: sha256File(portalSummaryFile),
        },
      },
    };
    writeJson(path.join(staging, 'publication-manifest.json'), publication);
    invariant(readJson(portalSummaryFile).status === 'PASS_PORTAL_SUMMARY', 'Portal summary write failed');
    result = {
      sourceArtifacts: validated.manifest.artifactCount,
      maps: validated.inventory.counts.maps,
      screenshots: validated.inventory.counts.screenshots,
      entrances: validated.inventory.counts.entranceAndAccessRecords,
      archiveRecoveredArtifacts: validated.recoveredArtifacts.length,
    };
  });

  process.stdout.write(`${JSON.stringify({
    status: 'PASS_STATIC_ASSETS_PREPARED',
    ...result,
    source: path.relative(REPO_ROOT, source),
    target: path.relative(REPO_ROOT, target),
  }, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  syncUndergroundReport();
}
