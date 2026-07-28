#!/usr/bin/env node
/**
 * Compile the redevelopment source-of-truth Markdown, maps, and evidence images
 * into a printable HTML dossier and a large PDF.
 *
 * This is offline and read-only except for its two output files.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import { marked } from '../world-showcase/node_modules/marked/lib/marked.esm.js';

import {
  FAMILY_DEFINITIONS,
} from './generate_town_expansion_media_manifest.mjs';
import {
  TOWN_EXPANSION_DOC_DIR,
  TOWN_EXPANSION_PATHS,
  evaluateTownExpansionDocumentationGate,
} from './town_expansion_documentation_profile.mjs';

const ROOT = process.cwd();
const value = (flag, fallback = null) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
};
const PROFILE = (() => {
  const index = process.argv.indexOf('--profile');
  return index >= 0 ? process.argv[index + 1] : 'r1';
})();
if (!['r1', 'wave2', 'town-expansion'].includes(PROFILE)) {
  throw new Error(`Unsupported dossier profile: ${PROFILE}`);
}
const IS_WAVE2 = PROFILE === 'wave2';
const IS_TOWN_EXPANSION = PROFILE === 'town-expansion';
const MODE = IS_TOWN_EXPANSION ? value('--mode', 'draft') : 'final';
if (!['draft', 'final'].includes(MODE)) {
  throw new Error(`Unsupported dossier mode: ${MODE}`);
}
const HTML_ONLY = process.argv.includes('--html-only');
const DOC_DIR = path.join(
  ROOT,
  IS_TOWN_EXPANSION
    ? TOWN_EXPANSION_DOC_DIR
    : IS_WAVE2
    ? 'docs/redevelopment/2026-07-28-wave2'
    : 'docs/redevelopment/2026-07-27',
);
const TOWN_SUFFIX = MODE === 'draft' ? '.draft' : '';
const TOWN_CAPTURE_REPORT = path.resolve(
  ROOT,
  value(
    '--capture-report',
    'data/exports/town-expansion-media-2026-07-28/capture-report.json',
  ),
);
const HTML_OUT = path.join(
  DOC_DIR,
  IS_TOWN_EXPANSION ? `master-plan${TOWN_SUFFIX}.html` : 'master-plan.html',
);
const PDF_OUT = path.join(
  DOC_DIR,
  IS_TOWN_EXPANSION ? `master-plan${TOWN_SUFFIX}.pdf` : 'master-plan.pdf',
);
const SITE_PDF = IS_WAVE2 || IS_TOWN_EXPANSION
  ? null
  : path.join(ROOT, 'world-showcase/public/reports/master-plan.pdf');
const CHROME = process.env.MC_FLEET_CHROME ?? (
  '/home/ianwalmsley/.cache/puppeteer/chrome-headless-shell/'
  + 'linux-150.0.7871.24/chrome-headless-shell-linux64/chrome-headless-shell'
);

const townEvidencePaths = {
  transaction: value('--transaction', undefined),
  postSnapshot: value('--post', undefined),
  postQa: value('--post-qa', undefined),
  mediaQa: value('--media-qa', undefined),
  databaseImport: value('--db-import', undefined),
  databasePublication: value('--db-report', undefined),
};
for (const key of Object.keys(townEvidencePaths)) {
  if (townEvidencePaths[key] === undefined) delete townEvidencePaths[key];
}
const townFinalGate = IS_TOWN_EXPANSION
  ? evaluateTownExpansionDocumentationGate({
    root: ROOT,
    paths: townEvidencePaths,
  })
  : null;
if (IS_TOWN_EXPANSION && MODE === 'final' && !townFinalGate.passed) {
  throw new Error(
    `Town Expansion final dossier blocked: ${townFinalGate.failures.join(', ')}`,
  );
}

const r1RequestedDocuments = [
  'README.md',
  'as-built-release-completion.md',
  'master-plan.md',
  'requirements-traceability.md',
  'infrastructure-standards.md',
  'infrastructure-audit.md',
  'westlight-screen-release.md',
  'mainstreet-surface-release.md',
  'bunker-surface-release.md',
  'tunnel-repair-release.md',
  'execution-register.md',
  'release-attempt-1-incident.md',
  'atomic-release-report.md',
  'post-deployment-qa.md',
  'database-and-media-report.md',
  'visual-evidence-plan.md',
  'risk-register.md',
  'research-bibliography.md',
  'artifact-register.md',
];
const wave2RequestedDocuments = [
  'README.md',
  'as-built-release-report.md',
  'baseline-and-release-readiness.md',
  'integration-independent-audit.md',
  'post-release-independent-acceptance.md',
  'ravenrock-tunnel-wave2-engineering.md',
  'mainstreet-wave2-r08-engineering.md',
  'decision-and-rejection-log.md',
  'artifact-register.md',
];
function uniqueDocuments(documents) {
  const seen = new Set();
  return documents.filter((document) => {
    const key = path.resolve(document.filename);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function townExpansionDocuments() {
  const preferred = [
    'session-pm-dossier.md',
    'session-frozen-scope-register.md',
    'SESSION_MEMORY.md',
    `requirements-status-matrix${TOWN_SUFFIX}.md`,
    `artifact-register${TOWN_SUFFIX}.md`,
  ];
  const localMarkdown = fs.readdirSync(DOC_DIR)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => (
      !/^artifact-register(?:\\.draft)?\\.md$/.test(name)
      && !/^requirements-status-matrix(?:\\.draft)?\\.md$/.test(name)
    ))
    .sort();
  const citizenDir = path.join(ROOT, 'docs/citizen-fleet');
  const citizenDocuments = fs.existsSync(citizenDir)
    ? fs.readdirSync(citizenDir)
      .filter((name) => /^2026-07-28.*\.md$/.test(name))
      .sort()
      .map((name) => ({
        name: `citizen-fleet/${name}`,
        filename: path.join(citizenDir, name),
      }))
    : [];
  return uniqueDocuments([
    ...preferred.map((name) => ({
      name,
      filename: path.join(DOC_DIR, name),
    })),
    ...localMarkdown.map((name) => ({
      name,
      filename: path.join(DOC_DIR, name),
    })),
    ...citizenDocuments,
  ]).filter(({ filename }) => fs.existsSync(filename));
}

const requestedDocuments = IS_TOWN_EXPANSION
  ? []
  : (IS_WAVE2 ? wave2RequestedDocuments : r1RequestedDocuments);
const documents = IS_TOWN_EXPANSION
  ? townExpansionDocuments()
  : requestedDocuments
    .map((name) => ({ name, filename: path.join(DOC_DIR, name) }))
    .filter(({ filename }) => fs.existsSync(filename));

const minimumDocuments = IS_TOWN_EXPANSION ? 20 : 5;
if (documents.length < minimumDocuments) {
  throw new Error(
    `Dossier is incomplete: found ${documents.length}/${minimumDocuments} required source documents`,
  );
}
if (!HTML_ONLY && !fs.existsSync(CHROME)) {
  throw new Error(`Chrome not found: ${CHROME}`);
}

marked.use({
  gfm: true,
  breaks: false,
});

const r1Figures = [
  {
    title: 'The complete active world',
    caption: 'North-up post-release surface atlas · immutable accepted snapshot f8edf994…',
    file: 'data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/00-overall-active-world-surface-atlas.png',
  },
  {
    title: 'MainStreet America — post-release campus',
    caption: 'Street, parking, visitor campus, support buildings, homes, alleys, garages, and east mountain.',
    file: 'data/exports/world-catalog-post-2026-07-27/floorplans/01-mainstreet-america-overview.png',
  },
  {
    title: 'MainStreet R4/R5 district',
    caption: 'Accepted post-release oblique showing the consolidated residential and public-realm framework.',
    file: 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-district-oblique.after.png',
  },
  {
    title: 'C01 concealed surface and road seam',
    caption: 'Accepted post-release east oblique showing the mountain treatment and completed circulation edge.',
    file: 'data/exports/redevelopment-qa-2026-07-27/bunker/after/03-east-oblique.png',
  },
  {
    title: 'C01 recessed public portal',
    caption: 'Accepted post-release public mouth and protected connector into the underground complex.',
    file: 'data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/01-new-mouth-south.png',
  },
  {
    title: 'Raven Rock S1 standard-section pilot',
    caption: 'Accepted east-to-west post view; independent walker passed the corridor in both directions.',
    file: 'data/exports/redevelopment-qa-2026-07-27/ravenrock/after/s1-east-to-west.png',
  },
  {
    title: 'Westlight focal display',
    caption: 'One view from the 48-camera sector, height-band, and event-mode post matrix.',
    file: 'data/exports/redevelopment-qa-2026-07-27/westlight/after/south-middle-sports.png',
  },
  {
    title: 'MainStreet exact garage object',
    caption: 'GAR-H01 post image; each of the 18 house garage/access features has an exact-object capture.',
    file: 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h01.after.png',
  },
];
const wave2Figures = [
  {
    title: 'The complete active world after Wave 2',
    caption: 'North-up post-release surface atlas · immutable snapshot d05ac782…',
    file: 'data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/00-overall-active-world-surface-atlas.png',
  },
  {
    title: 'MainStreet R08 shared cross-link',
    caption: 'Matched post-release overall view of the new ALLEY-W to R01 to ALLEY-E connection.',
    file: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/01-r08-overall-map.before.png',
  },
  {
    title: 'MainStreet R08 west gate',
    caption: 'Matched post-release evidence at the west fence opening and approach.',
    file: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/03-west-gate.before.png',
  },
  {
    title: 'MainStreet R08 central junction',
    caption: 'Matched post-release evidence where R08 crosses the R01 spine.',
    file: 'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after/04-r01-junction.before.png',
  },
  {
    title: 'Raven Rock T2b standardized liner',
    caption: 'Matched west-to-east post-release view of the bounded dry liner pilot.',
    file: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-west-to-east.png',
  },
  {
    title: 'Raven Rock T2b intentional cave window',
    caption: 'Post-release evidence retaining the deliberate cavern relationship while giving the route a uniform identity.',
    file: 'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-intentional-cave-window.png',
  },
  {
    title: 'C01 recessed public portal floor plan',
    caption: 'Exact plan supplement that closes the final building floor-plan gap.',
    file: 'data/exports/world-catalog-wave2-2026-07-28/floorplans/structures/mainstreet-america-c01-public-portal-recessed-phase2.png',
  },
  {
    title: 'Raven Rock command center exact-object evidence',
    caption: 'One of 79 target-valid Wave 2 captures; every registered building now has an exact screenshot.',
    file: 'data/exports/redevelopment-media-wave2-2026-07-28/buildings/raven-rock/rr-b1--command-operations-center.png',
  },
];

function readJsonIfPresent(filename) {
  if (!filename || !fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function escapeHtml(valueToEscape) {
  return String(valueToEscape ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function townExpansionFigureBook() {
  const manifestPath = path.join(
    ROOT,
    TOWN_EXPANSION_PATHS.mediaManifest,
  );
  const crosswalkPath = path.join(
    ROOT,
    TOWN_EXPANSION_PATHS.mediaCrosswalk,
  );
  const manifest = readJsonIfPresent(manifestPath);
  const crosswalk = readJsonIfPresent(crosswalkPath);
  if (!manifest || !crosswalk) {
    throw new Error(
      'Town Expansion dossier requires the generated media manifest and crosswalk',
    );
  }
  const captureReport = readJsonIfPresent(TOWN_CAPTURE_REPORT);
  if (MODE === 'final') {
    const manifestSha256 = crypto
      .createHash('sha256')
      .update(fs.readFileSync(manifestPath))
      .digest('hex');
    if (
      captureReport?.status !== 'PASS'
      || captureReport.passed !== true
      || captureReport.captureCount !== manifest.counts?.combinedCaptures
      || captureReport.cameraSelection?.mode !== 'complete'
      || captureReport.sourceManifestSha256 !== manifestSha256
      || !captureReport.outputDirectory
    ) {
      throw new Error(
        'Town Expansion final dossier requires the complete manifest-bound '
        + 'capture report',
      );
    }
  }
  const mediaDirectory = captureReport?.outputDirectory
    ? path.resolve(ROOT, captureReport.outputDirectory)
    : path.dirname(manifestPath);
  const camerasById = new Map(
    (manifest.cameras ?? []).map((camera) => [camera.id, camera]),
  );
  const mapFigures = (manifest.cameras ?? [])
    .filter((camera) => (
      camera.mode === 'map'
      && camera.evidencePass === 1
    ))
    .sort((left, right) => left.shotId.localeCompare(right.shotId))
    .map((camera) => ({
      kind: 'map',
      title: camera.role.replace(/\s*· evidence pass 1$/, ''),
      caption:
        `${camera.shotId} · deterministic map from exact-object coverage · `
        + `${camera.relatedExactObjectIds?.length ?? 0} linked objects`,
      file: path.relative(
        ROOT,
        path.join(mediaDirectory, camera.output),
      ),
      shotId: camera.shotId,
    }));
  if (mapFigures.length !== 13) {
    throw new Error(
      `Town Expansion dossier requires exactly 13 maps; found ${mapFigures.length}`,
    );
  }

  const representativeFigures = FAMILY_DEFINITIONS.map((family) => {
    const object = (crosswalk.objects ?? []).find(
      (entry) => entry.familyIds?.includes(family.id),
    );
    if (!object) {
      throw new Error(`No exact object found for media family ${family.id}`);
    }
    const pair = object.capturePairs?.[0];
    const camera = camerasById.get(pair?.pass1CameraId);
    if (!camera) {
      throw new Error(
        `No pass-1 exact-object camera found for ${object.objectId}`,
      );
    }
    return {
      kind: 'exact-object',
      title: `${family.label} — ${object.name}`,
      caption:
        `${object.objectId} · exact bounds ${object.bounds.join(',')} · `
        + `${camera.shotId}`,
      file: path.relative(
        ROOT,
        path.join(mediaDirectory, camera.output),
      ),
      shotId: camera.shotId,
      objectId: object.objectId,
    };
  });
  return {
    figures: [...mapFigures, ...representativeFigures],
    maps: mapFigures.length,
    representativeExactObjects: representativeFigures.length,
    manifest,
    crosswalk,
    manifestPath: path.relative(ROOT, manifestPath),
    crosswalkPath: path.relative(ROOT, crosswalkPath),
  };
}

const townFigureBook = IS_TOWN_EXPANSION
  ? townExpansionFigureBook()
  : null;
const figures = IS_TOWN_EXPANSION
  ? townFigureBook.figures
  : (IS_WAVE2 ? wave2Figures : r1Figures);
const missingTownFigures = IS_TOWN_EXPANSION
  ? figures.filter(({ file }) => !fs.existsSync(path.join(ROOT, file)))
  : [];
if (IS_TOWN_EXPANSION && MODE === 'final' && missingTownFigures.length > 0) {
  throw new Error(
    `Town Expansion final dossier is missing ${missingTownFigures.length} `
    + 'selected post-release map/screenshot files',
  );
}

const figureHtml = figures
  .map(({ title, caption, file, kind = 'evidence' }, index) => {
    const absoluteFile = path.join(ROOT, file);
    const media = fs.existsSync(absoluteFile)
      ? `<img src="${pathToFileURL(absoluteFile).href}" alt="${escapeHtml(title)}">`
      : `<div class="evidence-placeholder">
          <strong>POST-RELEASE ${escapeHtml(kind.toUpperCase())} PENDING</strong>
          <span>${escapeHtml(file)}</span>
          <small>This reserved evidence slot may not be read as an as-built image.</small>
        </div>`;
    return `
      <figure class="evidence-figure">
        ${media}
        <figcaption>
          <b>Figure ${index + 1}. ${escapeHtml(title)}</b>
          <span>${escapeHtml(caption)}</span>
        </figcaption>
      </figure>
    `;
  })
  .join('\n');

const townRegisterPath = IS_TOWN_EXPANSION
  ? path.join(
    ROOT,
    `data/world-review/town-expansion-artifact-manifest-2026-07-28${TOWN_SUFFIX}.json`,
  )
  : null;
const townRegister = readJsonIfPresent(townRegisterPath);
if (IS_TOWN_EXPANSION && !townRegister) {
  throw new Error(
    `Generate the Town Expansion ${MODE} artifact register before the dossier`,
  );
}
const townScheduleArtifacts = (townRegister?.artifacts ?? []).filter(
  (entry) => (
    entry.extension === '.json'
    && (
      entry.category === 'canonical-build-package-and-engineering'
      || entry.category === 'pm-dossier-frozen-scope-and-research'
      || entry.category === 'entity-transaction-post-and-database-qa'
    )
  ),
);
const townGateHtml = IS_TOWN_EXPANSION
  ? `
    <section class="control-section">
      <div class="cover-kicker">Fail-closed publication control</div>
      <h1>${MODE === 'draft' ? 'Draft evidence readiness' : 'Final evidence acceptance'}</h1>
      <p class="truth-boundary">${escapeHtml(townFinalGate.truthBoundary)}</p>
      <table>
        <thead><tr><th>Gate</th><th>Result</th><th>Evidence/status</th></tr></thead>
        <tbody>
          ${townFinalGate.gates.map((entry) => `
            <tr>
              <td>${escapeHtml(entry.label)}</td>
              <td class="${entry.passed ? 'pass' : 'pending'}">
                ${entry.passed ? 'PASS' : 'FAIL / PENDING'}
              </td>
              <td><code>${escapeHtml(
                entry.details.path
                  ?? entry.details.status
                  ?? JSON.stringify(entry.details),
              )}</code></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `
  : '';
const townMachineAppendix = IS_TOWN_EXPANSION
  ? `
    <section class="document-section">
      <div class="source-label">Machine-readable engineering and closeout index</div>
      <h1>Engineering schedules, QA and database evidence</h1>
      <p>
        The exact file-level register contains ${townRegister.summary.files}
        artifacts across ${townRegister.summary.categories} evidence classes.
        The rows below isolate ${townScheduleArtifacts.length} machine-readable
        design schedules, frozen contracts, release reports, and closeout records.
        SHA-256 values bind the byte-exact source used by this dossier.
      </p>
      <table class="machine-ledger">
        <thead>
          <tr><th>Evidence class</th><th>Path</th><th>Bytes</th><th>SHA-256</th><th>Status/binding</th></tr>
        </thead>
        <tbody>
          ${townScheduleArtifacts.map((entry) => `
            <tr>
              <td>${escapeHtml(entry.category)}</td>
              <td><code>${escapeHtml(entry.path)}</code></td>
              <td>${Number(entry.bytes).toLocaleString()}</td>
              <td><code>${escapeHtml(entry.sha256)}</code></td>
              <td>${escapeHtml([
                entry.json?.status ? `status=${entry.json.status}` : null,
                entry.json?.passed != null ? `passed=${entry.json.passed}` : null,
                entry.json?.packageId ? `package=${entry.json.packageId}` : null,
              ].filter(Boolean).join('; ') || 'source/schedule')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `
  : '';

const sections = documents.map(({ name, filename }, index) => {
  const markdown = fs.readFileSync(filename, 'utf8');
  return `
    <section class="document-section" id="document-${index + 1}">
      <div class="source-label">SOURCE FILE · ${name}</div>
      ${marked.parse(markdown)}
    </section>
  `;
});

const contents = documents
  .map(({ name }, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${name}</li>`)
  .join('');

const dossierTitle = IS_TOWN_EXPANSION
  ? `Town Expansion ${MODE === 'draft' ? 'Draft PM Dossier' : 'As-Built PM Dossier'}`
  : (IS_WAVE2 ? 'Wave 2 As-Built Dossier' : 'Master Plan');
const coverProgramName = IS_TOWN_EXPANSION
  ? `Town Expansion<br><em>${MODE === 'draft' ? 'Draft PM Dossier' : 'Verified As-Built'}</em>`
  : `World Redevelopment<br><em>${IS_WAVE2 ? 'Wave 2 As-Built' : 'Master Plan'}</em>`;
const coverSummary = IS_TOWN_EXPANSION
  ? `The complete 28 July program record: frozen scope, research and source-of-truth
      decisions, engineered coordinate schedules, citizen operations, entity and
      deployment gates, database contract, 13-map evidence book, exact-object
      screenshot crosswalk, requirements matrix, and PM closeout controls.`
  : IS_WAVE2
    ? `Immutable baselines, exact-state packages, live transaction evidence,
      route tests, maps, exact-object media, database linkage, rejected
      alternatives, and post-release acceptance for MainStreet R08 and the
      Raven Rock T2b liner pilot.`
    : `Current conditions, spatial database, maps, visual evidence, research,
      governing standards, alternatives, preferred plans, work packages,
      risks, and acceptance gates for MainStreet America, C01, Raven Rock,
      Westlight, and the connected active world.`;
const coverMeta = IS_TOWN_EXPANSION
  ? `<div><b>Publication state</b><span>${escapeHtml(
    MODE === 'draft' ? 'DRAFT · NOT AS-BUILT' : 'FINAL INPUTS ACCEPTED',
  )}</span></div>
    <div><b>Frozen scope</b><span>98 requirements · no scope reduction</span></div>
    <div><b>Evidence design</b><span>${townFigureBook.manifest.counts.exactObjects}
      exact objects · ${townFigureBook.manifest.counts.combinedCaptures}
      paired captures</span></div>
    <div><b>Review book</b><span>${townFigureBook.maps} maps ·
      ${townFigureBook.representativeExactObjects} representative exact-object
      screenshots · ${documents.length} source reports</span></div>`
  : IS_WAVE2
    ? `<div><b>Prerelease</b><span>b1356bca9fcbdc7a… · 26 regions</span></div>
      <div><b>Post snapshot</b><span>d05ac7822795eff0… · 26 regions</span></div>
      <div><b>Physical release</b><span>2 packages · 887 explicit + 2 reactive cells</span></div>
      <div><b>Evidence</b><span>4 route directions · 14 matched after views · 79 exact-object views</span></div>`
    : `<div><b>Baseline</b><span>27 July 2026</span></div>
      <div><b>Accepted post snapshot</b><span>f8edf99494c023dd4b7e412d146a9018…</span></div>
      <div><b>Catalog</b><span>824 features · 21 scans · 1,830 observations</span></div>
      <div><b>Release</b><span>5 packages · 36,781 cells · QA PASS · 91 post views</span></div>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MC Fleet ${escapeHtml(dossierTitle)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 19mm; }
    * { box-sizing: border-box; }
    html { color: #1d211b; font: 10.5pt/1.55 Arial, Helvetica, sans-serif; }
    body { margin: 0; }
    a { color: #275b46; overflow-wrap: anywhere; }
    h1, h2, h3, h4 { color: #151813; line-height: 1.12; page-break-after: avoid; }
    h1 { margin: 0 0 8mm; font-size: 31pt; letter-spacing: -1.2pt; }
    h2 { margin: 11mm 0 4mm; padding-top: 3mm; border-top: 1px solid #c5c9bf; font-size: 21pt; letter-spacing: -.5pt; }
    h3 { margin: 7mm 0 2mm; font-size: 14pt; }
    h4 { margin: 5mm 0 2mm; font-size: 11pt; text-transform: uppercase; letter-spacing: .4pt; }
    p, li { orphans: 3; widows: 3; }
    code { padding: 1px 3px; background: #eef0e9; font: 8.5pt Consolas, monospace; overflow-wrap: anywhere; }
    pre { padding: 4mm; background: #181b17; color: #f3f4ec; white-space: pre-wrap; page-break-inside: avoid; }
    pre code { padding: 0; background: none; color: inherit; }
    table { width: 100%; margin: 4mm 0 7mm; border-collapse: collapse; font-size: 7.7pt; page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { padding: 2.2mm; border: 1px solid #c9cdc3; text-align: left; vertical-align: top; }
    th { background: #e5e9dc; }
    blockquote { margin: 5mm 0; padding: 3mm 5mm; border-left: 4px solid #8cab44; background: #f2f4ed; }
    .cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .cover-kicker, .source-label { color: #e55223; font: bold 8pt Consolas, monospace; letter-spacing: 1.2pt; text-transform: uppercase; }
    .cover h1 { margin-top: 18mm; font-size: 49pt; line-height: .92; letter-spacing: -3pt; }
    .cover h1 em { color: #5d7a22; font-family: Georgia, serif; }
    .cover-summary { max-width: 150mm; font-size: 14pt; color: #5d6258; }
    .cover-meta { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 2px solid #1d211b; }
    .cover-meta div { padding: 5mm 0; border-bottom: 1px solid #c9cdc3; }
    .cover-meta b, .cover-meta span { display: block; }
    .cover-meta span { color: #6e7368; font-size: 8.5pt; }
    .contents { page-break-after: always; }
    .contents ol { padding: 0; list-style: none; }
    .contents li { display: flex; gap: 5mm; padding: 3mm 0; border-bottom: 1px solid #d7d9d2; }
    .contents li span { color: #79922e; font: bold 9pt Consolas, monospace; }
    .figure-book { page-break-after: always; }
    .evidence-figure { margin: 0 0 8mm; page-break-inside: avoid; page-break-after: always; }
    .evidence-figure img { display: block; width: 100%; max-height: 225mm; object-fit: contain; background: #131612; }
    .evidence-placeholder { min-height: 150mm; padding: 16mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4mm; border: 2px dashed #bd4e2b; background: repeating-linear-gradient(-45deg, #f8e7df, #f8e7df 10px, #fff6f1 10px, #fff6f1 20px); color: #8d351c; text-align: center; }
    .evidence-placeholder strong { font: bold 18pt Consolas, monospace; }
    .evidence-placeholder span { max-width: 170mm; font: 9pt Consolas, monospace; overflow-wrap: anywhere; }
    .evidence-placeholder small { max-width: 140mm; color: #673b2d; }
    .evidence-figure figcaption { display: flex; justify-content: space-between; gap: 8mm; padding: 3mm 0; border-bottom: 1px solid #bfc3b8; font-size: 8.5pt; }
    .evidence-figure figcaption span { color: #6e7368; text-align: right; }
    .document-section { page-break-before: always; }
    .document-section > h1:first-of-type { margin-top: 3mm; }
    .source-label { margin-bottom: 5mm; }
    .control-section { page-break-after: always; }
    .truth-boundary { padding: 5mm; border: 2px solid #b74624; background: #fff0e8; color: #6c2c18; font-weight: bold; }
    .pass { color: #376323; font-weight: bold; }
    .pending { color: #a33a1c; font-weight: bold; }
    .machine-ledger { font-size: 6.5pt; }
    .draft-banner { position: fixed; z-index: 20; top: 0; left: 0; right: 0; padding: 2.5mm; background: #b74624; color: white; font: bold 8.5pt Consolas, monospace; letter-spacing: .9pt; text-align: center; }
    .draft-watermark { position: fixed; z-index: -1; top: 43%; left: 9%; color: rgba(183, 70, 36, .07); font: bold 68pt Arial, sans-serif; transform: rotate(-31deg); }
    img { max-width: 100%; }
  </style>
</head>
<body>
  ${IS_TOWN_EXPANSION && MODE === 'draft'
    ? '<div class="draft-banner">DRAFT — NOT AS-BUILT — LIVE CLOSEOUT GATES PENDING</div><div class="draft-watermark">DRAFT · NOT AS-BUILT</div>'
    : ''}
  <section class="cover">
    <div>
      <div class="cover-kicker">MC Fleet · World Development Program · Source of Truth</div>
      <h1>${coverProgramName}</h1>
      <p class="cover-summary">
        ${coverSummary}
      </p>
    </div>
    <div class="cover-meta">
      ${coverMeta}
    </div>
  </section>
  ${townGateHtml}
  <section class="contents">
    <div class="cover-kicker">Document control</div>
    <h1>Contents</h1>
    <ol>${contents}</ol>
    <p>This ${HTML_ONLY ? 'HTML dossier' : 'PDF'} is compiled from the named
    Markdown source files. Machine-readable database, schedule, requirements,
    map, and media exports are indexed by SHA-256 in the adjacent artifact
    register.</p>
  </section>
  <section class="figure-book">
    <div class="cover-kicker">${IS_TOWN_EXPANSION
      ? 'Mapped and exact-object evidence slots'
      : 'Baseline visual evidence'}</div>
    <h1>${IS_TOWN_EXPANSION
      ? '13-map book & representative exact-object screenshots'
      : 'Maps & current conditions'}</h1>
    ${figureHtml}
  </section>
  ${sections.join('\n')}
  ${townMachineAppendix}
</body>
</html>`;

fs.writeFileSync(HTML_OUT, html);
if (HTML_ONLY) {
  console.log(JSON.stringify({
    profile: PROFILE,
    mode: MODE,
    status: IS_TOWN_EXPANSION
      ? (MODE === 'draft' ? 'DRAFT_NOT_AS_BUILT' : 'FINAL_INPUTS_ACCEPTED')
      : 'HTML_GENERATED',
    sources: documents.map(({ name }) => name),
    html: path.relative(ROOT, HTML_OUT),
    pdf: null,
    finalGatePassed: townFinalGate?.passed ?? null,
    maps: townFigureBook?.maps ?? null,
    representativeExactObjectScreenshots:
      townFigureBook?.representativeExactObjects ?? null,
    missingSelectedImages: missingTownFigures.length,
    machineReadableEvidence: townScheduleArtifacts.length,
  }, null, 2));
  process.exit(0);
}
const chrome = spawnSync(
  CHROME,
  [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--no-pdf-header-footer',
    `--print-to-pdf=${PDF_OUT}`,
    pathToFileURL(HTML_OUT).href,
  ],
  {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  },
);
if (chrome.status !== 0) {
  process.stderr.write(chrome.stderr);
  process.exit(chrome.status ?? 1);
}
if (!fs.existsSync(PDF_OUT) || fs.statSync(PDF_OUT).size < 100_000) {
  throw new Error('PDF output is missing or suspiciously small');
}
if (SITE_PDF) {
  fs.mkdirSync(path.dirname(SITE_PDF), { recursive: true });
  fs.copyFileSync(PDF_OUT, SITE_PDF);
}
console.log(JSON.stringify({
  profile: PROFILE,
  mode: MODE,
  status: IS_TOWN_EXPANSION
    ? 'FINAL_AS_BUILT_DOSSIER'
    : 'FINAL_DOSSIER',
  sources: documents.map(({ name }) => name),
  html: path.relative(ROOT, HTML_OUT),
  pdf: path.relative(ROOT, PDF_OUT),
  pdfBytes: fs.statSync(PDF_OUT).size,
  siteCopy: SITE_PDF ? path.relative(ROOT, SITE_PDF) : null,
  finalGatePassed: townFinalGate?.passed ?? null,
  maps: townFigureBook?.maps ?? null,
  representativeExactObjectScreenshots:
    townFigureBook?.representativeExactObjects ?? null,
  missingSelectedImages: missingTownFigures.length,
  machineReadableEvidence: townScheduleArtifacts.length,
}, null, 2));
