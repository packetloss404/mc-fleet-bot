#!/usr/bin/env node
/**
 * Build a cryptographic, human-readable register for the redevelopment release.
 *
 * The JSON output is the lossless index. The Markdown output is a compact review
 * view grouped by evidence class. Both are deterministic except for generatedAt.
 */
import fs from 'fs';
import path from 'path';

import {
  TOWN_EXPANSION_DOC_DIR,
  TOWN_EXPANSION_DOCUMENTATION_CONTRACT,
  buildTownExpansionRequirementsMatrix,
  evaluateTownExpansionDocumentationGate,
  requirementsMatrixMarkdown,
} from './town_expansion_documentation_profile.mjs';
import { jsonArtifactSummary } from './lib/artifact_json_summary.mjs';
import { sha256FileSync } from './lib/file_hash.mjs';

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
  throw new Error(`Unsupported artifact-register profile: ${PROFILE}`);
}
const IS_WAVE2 = PROFILE === 'wave2';
const IS_TOWN_EXPANSION = PROFILE === 'town-expansion';
const MODE = IS_TOWN_EXPANSION ? value('--mode', 'draft') : 'final';
if (!['draft', 'final'].includes(MODE)) {
  throw new Error(`Unsupported artifact-register mode: ${MODE}`);
}
const RELEASE_DATE = IS_TOWN_EXPANSION
  ? '2026-07-28-town-expansion'
  : (IS_WAVE2 ? '2026-07-28-wave2' : '2026-07-27');
const RELEASE_ID = IS_TOWN_EXPANSION
  ? 'REDEV-2026-07-28-TOWN-EXPANSION'
  : (IS_WAVE2 ? 'REDEV-2026-07-28-R2' : 'REDEV-2026-07-27-R1');
const TOWN_SUFFIX = MODE === 'draft' ? '.draft' : '';
const JSON_OUT = path.join(
  ROOT,
  IS_TOWN_EXPANSION
    ? `data/world-review/town-expansion-artifact-manifest-2026-07-28${TOWN_SUFFIX}.json`
    : IS_WAVE2
    ? 'data/world-review/redevelopment-artifact-manifest-2026-07-28-wave2.json'
    : `data/world-review/redevelopment-artifact-manifest-${RELEASE_DATE}.json`,
);
const MARKDOWN_OUT = path.join(
  ROOT,
  `docs/redevelopment/${RELEASE_DATE}/artifact-register${TOWN_SUFFIX}.md`,
);
const MATRIX_JSON_OUT = IS_TOWN_EXPANSION
  ? path.join(
    ROOT,
    TOWN_EXPANSION_DOC_DIR,
    `requirements-status-matrix${TOWN_SUFFIX}.json`,
  )
  : null;
const MATRIX_MARKDOWN_OUT = IS_TOWN_EXPANSION
  ? path.join(
    ROOT,
    TOWN_EXPANSION_DOC_DIR,
    `requirements-status-matrix${TOWN_SUFFIX}.md`,
  )
  : null;

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

const r1Roots = [
  {
    category: 'planning-and-reports',
    directory: `docs/redevelopment/${RELEASE_DATE}`,
  },
  {
    category: 'machine-release-evidence',
    directory: 'data/world-review',
    include: /(?:redevelopment|mainstreet|bunker|westlight|ravenrock)/i,
  },
  {
    category: 'guarded-build-packages',
    directory: 'data/buildops',
    include: /(?:mainstreet-redevelopment|mainstreet-bunker|westlight-infinity|ravenrock-s1)/i,
  },
  {
    category: 'world-atlas',
    directory: `data/exports/box/redevelopment-atlas-post-${RELEASE_DATE}`,
  },
  {
    category: 'world-catalog-and-post-media',
    directory: `data/exports/world-catalog-post-${RELEASE_DATE}`,
  },
  {
    category: 'matched-release-media',
    directory: `data/exports/redevelopment-qa-${RELEASE_DATE}`,
  },
  {
    category: 'authored-master-plans',
    directory: 'mainstreet-america/planning',
    include: /(?:redevelopment-r4-r5|picket-fence)/i,
  },
  {
    category: 'release-automation',
    directory: 'scripts',
    include: /(?:redevelopment|world_catalog|world_showcase|world_snapshot|rcon_runner|bunker|westlight|ravenrock|mainstreet_garage)/i,
  },
  {
    category: 'release-tests',
    directory: 'test/build',
    include: /(?:Redevelopment|Bunker|Westlight|RavenRock|PicketFence)/i,
  },
  {
    category: 'showcase-source',
    directory: 'world-showcase',
    include: /^(?!.*(?:node_modules|\.next|\.git|\.open-next)).*$/,
  },
];
const wave2Roots = [
  {
    category: 'planning-and-reports',
    directory: `docs/redevelopment/${RELEASE_DATE}`,
  },
  {
    category: 'machine-release-evidence',
    directory: 'data/world-review',
    include: /(?:wave2|ravenrock-t2b|mainstreet-wave2)/i,
  },
  {
    category: 'guarded-build-packages',
    directory: 'data/buildops',
    include: /(?:wave2|ravenrock-t2b|mainstreet-wave2)/i,
  },
  {
    category: 'world-atlas',
    directory: 'data/exports/box/redevelopment-atlas-wave2-post-2026-07-28',
  },
  {
    category: 'world-catalog-and-floorplans',
    directory: 'data/exports/world-catalog-wave2-2026-07-28',
  },
  {
    category: 'exact-object-media',
    directory: 'data/exports/redevelopment-media-wave2-2026-07-28',
  },
  {
    category: 'matched-release-media',
    directory: 'data/exports/redevelopment-wave2-2026-07-28',
  },
  {
    category: 'authored-master-plans',
    directory: 'mainstreet-america/planning',
    include: /redevelopment-wave2-r08/i,
  },
  {
    category: 'release-automation',
    directory: 'scripts',
    include: /(?:wave2|redevelopment|world_catalog|surface_atlas|rcon_runner|ravenrock_t2b|mainstreet_wave2)/i,
  },
  {
    category: 'release-tests',
    directory: 'test',
    include: /(?:Wave2|wave2|RavenRockT2b|atomic_release_manifest|rcon_runner)/i,
  },
];
const townExpansionRoots = [
  {
    category: 'pm-dossier-frozen-scope-and-research',
    directory: TOWN_EXPANSION_DOC_DIR,
  },
  {
    category: 'citizen-program-reports',
    directory: 'docs/citizen-fleet',
    include: /2026-07-28/i,
  },
  {
    category: 'canonical-build-package-and-engineering',
    directory: 'data/buildops',
    include: /(?:town-expansion|manager-vale)/i,
  },
  {
    category: 'entity-transaction-post-and-database-qa',
    directory: 'data/world-review',
    include: /(?:town-expansion|citizen-ravensreach-mainstreet)/i,
  },
  {
    category: 'baseline-and-post-maps',
    directory: 'data/exports/box/town-expansion-baseline-2026-07-28',
  },
  {
    category: 'exact-object-media-and-crosswalk',
    directory: 'data/exports/town-expansion-media-2026-07-28',
  },
  {
    category: 'release-and-documentation-automation',
    directory: 'scripts',
    include:
      /(?:town_expansion|manager_vale|redevelopment_(?:artifact_register|dossier)|render_redevelopment_camera_manifest)/i,
  },
  {
    category: 'release-and-documentation-tests',
    directory: 'test',
    include: /(?:TownExpansion|townExpansion|ManagerVale)/i,
  },
  {
    category: 'project-closeout-readme',
    directory: '.',
    shallow: true,
    include: /^README\.md$/,
  },
];
const roots = IS_TOWN_EXPANSION
  ? townExpansionRoots
  : (IS_WAVE2 ? wave2Roots : r1Roots);

const selfOutputs = new Set([
  path.relative(ROOT, JSON_OUT),
  path.relative(ROOT, MARKDOWN_OUT),
  `docs/redevelopment/${RELEASE_DATE}/master-plan.html`,
  `docs/redevelopment/${RELEASE_DATE}/master-plan.pdf`,
  `docs/redevelopment/${RELEASE_DATE}/master-plan.draft.html`,
  `docs/redevelopment/${RELEASE_DATE}/master-plan.draft.pdf`,
  ...(IS_TOWN_EXPANSION ? [
    path.relative(ROOT, JSON_OUT),
    path.relative(ROOT, MARKDOWN_OUT),
  ] : []),
  ...(IS_WAVE2 ? [] : ['world-showcase/public/reports/master-plan.pdf']),
]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(filename));
    if (entry.isFile()) files.push(filename);
  }
  return files;
}

function pngDimensions(filename) {
  const buffer = fs.readFileSync(filename);
  if (
    buffer.length < 24
    || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a'
  ) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function classifyExtension(filename) {
  const extension = path.extname(filename).toLowerCase();
  return extension || '[no extension]';
}

const townFinalGate = IS_TOWN_EXPANSION
  ? evaluateTownExpansionDocumentationGate({
    root: ROOT,
    paths: townEvidencePaths,
  })
  : null;
if (IS_TOWN_EXPANSION && MODE === 'final' && !townFinalGate.passed) {
  throw new Error(
    `Town Expansion final artifact register blocked: `
    + `${townFinalGate.failures.join(', ')}`,
  );
}
if (IS_TOWN_EXPANSION) {
  const matrix = buildTownExpansionRequirementsMatrix({
    root: ROOT,
    mode: MODE,
    gateResult: townFinalGate,
  });
  fs.mkdirSync(path.dirname(MATRIX_JSON_OUT), { recursive: true });
  fs.writeFileSync(
    MATRIX_JSON_OUT,
    `${JSON.stringify(matrix, null, 2)}\n`,
  );
  fs.writeFileSync(
    MATRIX_MARKDOWN_OUT,
    requirementsMatrixMarkdown(matrix),
  );
}

const records = [];
const seen = new Set();
for (const root of roots) {
  const absoluteDirectory = path.join(ROOT, root.directory);
  const candidates = root.shallow
    ? fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(absoluteDirectory, entry.name))
    : walk(absoluteDirectory);
  for (const filename of candidates) {
    const relative = path.relative(ROOT, filename);
    if (selfOutputs.has(relative) || seen.has(relative)) continue;
    const rootRelative = path.relative(absoluteDirectory, filename);
    if (root.include && !root.include.test(rootRelative)) continue;
    seen.add(relative);
    const stat = fs.statSync(filename);
    records.push({
      path: relative,
      category: root.category,
      bytes: stat.size,
      sha256: sha256FileSync(filename),
      extension: classifyExtension(filename),
      modifiedAtUtc: new Date(stat.mtimeMs).toISOString(),
      image: filename.endsWith('.png') ? pngDimensions(filename) : null,
      json: jsonArtifactSummary(filename),
    });
  }
}
records.sort((left, right) => (
  left.category.localeCompare(right.category) || left.path.localeCompare(right.path)
));

const categorySummary = Object.values(records.reduce((summary, record) => {
  summary[record.category] ??= {
    category: record.category,
    files: 0,
    bytes: 0,
    images: 0,
    json: 0,
  };
  summary[record.category].files += 1;
  summary[record.category].bytes += record.bytes;
  if (record.image) summary[record.category].images += 1;
  if (record.extension === '.json') summary[record.category].json += 1;
  return summary;
}, {}));

const extensionSummary = Object.entries(records.reduce((summary, record) => {
  summary[record.extension] = (summary[record.extension] ?? 0) + 1;
  return summary;
}, {}))
  .map(([extension, files]) => ({ extension, files }))
  .sort((left, right) => right.files - left.files || left.extension.localeCompare(right.extension));

const manifest = {
  schemaVersion: 1,
  release: RELEASE_ID,
  profile: PROFILE,
  mode: MODE,
  status: IS_TOWN_EXPANSION
    ? (MODE === 'final'
      ? 'FINAL_AS_BUILT_REGISTER'
      : 'DRAFT_NOT_AS_BUILT_REGISTER')
    : 'FINAL_REGISTER',
  generatedAtUtc: new Date().toISOString(),
  hashAlgorithm: 'SHA-256 over exact file bytes',
  truthBoundary: IS_TOWN_EXPANSION
    ? TOWN_EXPANSION_DOCUMENTATION_CONTRACT.truthBoundary
    : null,
  finalGate: townFinalGate,
  exclusions: [...selfOutputs].sort(),
  summary: {
    files: records.length,
    bytes: records.reduce((sum, record) => sum + record.bytes, 0),
    images: records.filter((record) => record.image).length,
    machineReadableJson: records.filter((record) => record.extension === '.json').length,
    categories: categorySummary.length,
  },
  categorySummary,
  extensionSummary,
  artifacts: records,
};

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, `${JSON.stringify(manifest, null, 2)}\n`);

const markdown = [
  `# ${IS_TOWN_EXPANSION
    ? 'Town Expansion '
    : (IS_WAVE2 ? 'Wave 2 ' : '')}Redevelopment Artifact Register`,
  '',
  `Release: \`${manifest.release}\`  `,
  `Mode: **${MODE.toUpperCase()}**  `,
  `Status: **${manifest.status}**  `,
  `Generated: ${manifest.generatedAtUtc}  `,
  `Machine register: \`${path.relative(ROOT, JSON_OUT)}\``,
  '',
  ...(IS_TOWN_EXPANSION ? [
    '> **DRAFT / FINALITY RULE:** Draft mode is preparation evidence only and',
    '> must not be described as final or as-built. Final mode refuses to write',
    '> unless transaction, post snapshot, post QA, media QA, database import,',
    '> read-only database report, and all byte hashes pass.',
    '',
    '## Final documentation input gate',
    '',
    '| Gate | Result |',
    '|---|---|',
    ...townFinalGate.gates.map((entry) =>
      `| ${entry.label} | ${entry.passed ? 'PASS' : 'FAIL / PENDING'} |`),
    '',
  ] : []),
  '## Purpose and reading rule',
  '',
  'This is the human review index for the release evidence set. The adjacent',
  'JSON is authoritative for file-level SHA-256 values, byte sizes, image',
  'dimensions, JSON status fields, package IDs, operation hashes, and snapshot',
  'bindings. Generated dossier outputs are intentionally excluded to avoid a',
  'self-referential hash cycle.',
  '',
  '## Inventory summary',
  '',
  '| Evidence class | Files | Bytes | Images | JSON |',
  '|---|---:|---:|---:|---:|',
  ...categorySummary.map((entry) => (
    `| ${entry.category} | ${entry.files.toLocaleString()} | `
    + `${entry.bytes.toLocaleString()} | ${entry.images.toLocaleString()} | `
    + `${entry.json.toLocaleString()} |`
  )),
  `| **Total** | **${manifest.summary.files.toLocaleString()}** | `
    + `**${manifest.summary.bytes.toLocaleString()}** | `
    + `**${manifest.summary.images.toLocaleString()}** | `
    + `**${manifest.summary.machineReadableJson.toLocaleString()}** |`,
  '',
  '## File-type census',
  '',
  '| Extension | Files |',
  '|---|---:|',
  ...extensionSummary.map((entry) => `| \`${entry.extension}\` | ${entry.files} |`),
  '',
  '## Category-level artifact ledger',
  '',
];

for (const category of categorySummary) {
  markdown.push(`### ${category.category}`, '');
  markdown.push('| Path | Bytes | SHA-256 | Evidence binding |');
  markdown.push('|---|---:|---|---|');
  for (const record of records.filter((entry) => entry.category === category.category)) {
    const binding = [
      record.image ? `${record.image.width}×${record.image.height}` : null,
      record.json?.status ? `status=${record.json.status}` : null,
      record.json?.passed != null ? `passed=${record.json.passed}` : null,
      record.json?.packageId ? `package=${record.json.packageId}` : null,
      record.json?.snapshotSha256
        ? `snapshot=${record.json.snapshotSha256.slice(0, 12)}…`
        : null,
      record.json?.operationSha256
        ? `ops=${record.json.operationSha256.slice(0, 12)}…`
        : null,
      record.json?.parseError ? 'JSON parse error' : null,
    ].filter(Boolean).join('; ');
    markdown.push(
      `| \`${record.path}\` | ${record.bytes.toLocaleString()} | `
      + `\`${record.sha256}\` | ${binding || '—'} |`,
    );
  }
  markdown.push('');
}

markdown.push(
  '## Integrity procedure',
  '',
  '1. Regenerate this register only after all release evidence is final.',
  '2. Compare the JSON artifact path set to the distributed handoff.',
  '3. Recompute SHA-256 over exact bytes and compare every record.',
  '4. Verify every post-release JSON snapshot binding resolves to the accepted',
  '   immutable post-release region directory.',
  '5. Treat an absent file, hash mismatch, parse error, stale snapshot binding,',
  '   or non-passing acceptance status as a documentation defect.',
  '',
);

fs.mkdirSync(path.dirname(MARKDOWN_OUT), { recursive: true });
fs.writeFileSync(MARKDOWN_OUT, `${markdown.join('\n')}\n`);

console.log(JSON.stringify({
  profile: PROFILE,
  mode: MODE,
  status: manifest.status,
  json: path.relative(ROOT, JSON_OUT),
  markdown: path.relative(ROOT, MARKDOWN_OUT),
  requirementsMatrix: MATRIX_JSON_OUT
    ? path.relative(ROOT, MATRIX_JSON_OUT)
    : null,
  finalGatePassed: townFinalGate?.passed ?? null,
  ...manifest.summary,
}, null, 2));
