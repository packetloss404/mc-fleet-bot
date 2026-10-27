import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TERMINAL_STATUS = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE';
const COMPILED_STATUS = 'OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL';

const fail = (condition, message) => {
  if (!condition) throw new Error(`C01 as-built publication rejected: ${message}`);
};

const normalizePath = (value) => path.resolve(value).split(path.sep).join('/');
const shaBuffer = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (value) => shaBuffer(fs.readFileSync(value));
const readJson = (value) => JSON.parse(fs.readFileSync(value, 'utf8'));
const relativePath = (root, value) => path.relative(root, value).split(path.sep).join('/');

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const roleColor = (role, state) => {
  if (role.includes('guard') || role.includes('wall')) return '#fb923c';
  if (role.includes('tread') || role.includes('landing')) return '#facc15';
  if (state === 'minecraft:air' || state.startsWith('minecraft:air[')) return '#38bdf8';
  if (state.includes('stairs')) return '#eab308';
  return '#a78bfa';
};

function validatePoint(point, label) {
  fail(Array.isArray(point) && point.length === 3, `${label} must be a three-coordinate array`);
  fail(point.every((value) => Number.isInteger(value) && Number.isFinite(value)), `${label} must contain finite integers`);
}

function validateHashBinding(binding, expectedPath, label) {
  fail(binding && typeof binding === 'object', `${label} binding is absent`);
  fail(typeof binding.path === 'string' && typeof binding.sha256 === 'string', `${label} binding is incomplete`);
  fail(normalizePath(binding.path) === normalizePath(expectedPath), `${label} path drift: ${binding.path}`);
  fail(fs.existsSync(expectedPath), `${label} file is absent: ${expectedPath}`);
  fail(shaFile(expectedPath) === binding.sha256, `${label} hash drift for ${binding.path}`);
}

function validateQaBindings(qa, paths, allowLedgerAppendBinding) {
  fail(qa.bindings && typeof qa.bindings === 'object', 'QA bindings are absent');
  validateHashBinding(qa.bindings.manifest, paths.manifest, 'QA manifest');

  for (const [name, binding] of Object.entries(qa.bindings)) {
    if (name === 'manifest') continue;
    if (name === 'ledger' && allowLedgerAppendBinding) {
      fail(normalizePath(binding.path) === normalizePath(paths.ledger), 'QA ledger path drift');
      continue;
    }
    const bindingPath = path.resolve(paths.root, binding.path);
    validateHashBinding(binding, bindingPath, `QA ${name}`);
  }
}

function validateLedgerQaBinding(ledger, qaPath, qaStatus, manifestPath) {
  if (ledger.independentPostQa) {
    validateHashBinding(ledger.independentPostQa, qaPath, 'ledger independent QA');
    return 'terminal-ledger-binding';
  }

  const stages = Array.isArray(ledger.stages) ? ledger.stages : [];
  const stage = [...stages].reverse().find((item) => item.stage === 'independent-immutable-post-qa' && item.status === 'PASS');
  fail(stage, 'ledger has no passing independent immutable post-QA stage');
  const command = Array.isArray(stage.command) ? stage.command : [];
  const manifestIndex = command.indexOf('--manifest');
  const outputIndex = command.indexOf('--out');
  fail(manifestIndex >= 0 && command[manifestIndex + 1], 'ledger QA stage has no manifest argument');
  fail(outputIndex >= 0 && command[outputIndex + 1], 'ledger QA stage has no output argument');
  fail(normalizePath(command[manifestIndex + 1]) === normalizePath(manifestPath), 'ledger QA-stage manifest drift');
  fail(normalizePath(command[outputIndex + 1]) === normalizePath(qaPath), 'ledger QA-stage output drift');
  fail(String(stage.stdoutTail ?? '').includes(`"status": "${qaStatus}"`), 'ledger QA-stage stdout does not record the accepted QA status');
  return 'passing-ledger-stage-binding';
}

function boundsOf(targets) {
  const xs = targets.map((target) => target.point[0]);
  const ys = targets.map((target) => target.point[1]);
  const zs = targets.map((target) => target.point[2]);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    minZ: Math.min(...zs), maxZ: Math.max(...zs),
  };
}

function coordinateSetSha256(targets) {
  const payload = targets.map((target) => target.point.join(',')).sort().join('\n');
  return shaBuffer(`${payload}\n`);
}

function renderPlot({ releaseId, title, subtitle, targets, stations, axes }) {
  const width = 1200;
  const height = 760;
  const plot = { x: 74, y: 126, width: 1052, height: 520 };
  const axisIndices = axes === 'xz' ? [0, 2] : [0, 1];
  const axisNames = axes === 'xz' ? ['X', 'Z'] : ['X', 'Y'];
  const projected = new Map();

  for (const target of targets) {
    const a = target.point[axisIndices[0]];
    const b = target.point[axisIndices[1]];
    const key = `${a},${b}`;
    const existing = projected.get(key);
    if (!existing || existing.targetState === 'minecraft:air') projected.set(key, { ...target, a, b });
  }

  const values = [...projected.values()];
  fail(values.length > 0, `${title} has zero projected geometry`);
  const minA = Math.min(...values.map((value) => value.a));
  const maxA = Math.max(...values.map((value) => value.a));
  const minB = Math.min(...values.map((value) => value.b));
  const maxB = Math.max(...values.map((value) => value.b));
  const spanA = Math.max(1, maxA - minA + 1);
  const spanB = Math.max(1, maxB - minB + 1);
  const scale = Math.min(plot.width / spanA, plot.height / spanB);
  const offsetX = plot.x + (plot.width - spanA * scale) / 2;
  const offsetY = plot.y + (plot.height - spanB * scale) / 2;
  const px = (a) => offsetX + (a - minA) * scale;
  // Plan convention is north (-Z) up, so lower Z values have lower SVG Y.
  // Section convention is elevation (+Y) up, so higher Y values have lower SVG Y.
  const py = axes === 'xz'
    ? (b) => offsetY + (b - minB) * scale
    : (b) => offsetY + (maxB - b) * scale;
  const cell = Math.max(1.25, scale * 0.86);

  const grid = [];
  for (let a = minA; a <= maxA; a += Math.max(1, Math.ceil(spanA / 12))) {
    grid.push(`<line x1="${px(a).toFixed(2)}" y1="${plot.y}" x2="${px(a).toFixed(2)}" y2="${plot.y + plot.height}" class="grid"/>`);
  }
  for (let b = minB; b <= maxB; b += Math.max(1, Math.ceil(spanB / 10))) {
    grid.push(`<line x1="${plot.x}" y1="${py(b).toFixed(2)}" x2="${plot.x + plot.width}" y2="${py(b).toFixed(2)}" class="grid"/>`);
  }

  const cells = values.map((value) => `<rect x="${px(value.a).toFixed(2)}" y="${py(value.b).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="${Math.min(1.5, cell / 5).toFixed(2)}" fill="${roleColor(value.role, value.targetState)}"><title>${escapeXml(`${value.role} · ${value.point.join(',')} · ${value.targetState}`)}</title></rect>`);
  const stationPoints = stations.map((point) => `${(px(point[axisIndices[0]]) + cell / 2).toFixed(2)},${(py(point[axisIndices[1]]) + cell / 2).toFixed(2)}`);
  const stationLine = stationPoints.length > 1
    ? `<polyline points="${stationPoints.join(' ')}" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity="0.92"/>`
    : '';
  const stationDots = stations.map((point) => `<circle cx="${(px(point[axisIndices[0]]) + cell / 2).toFixed(2)}" cy="${(py(point[axisIndices[1]]) + cell / 2).toFixed(2)}" r="${Math.max(2, Math.min(5, cell / 2)).toFixed(2)}" fill="#fff" stroke="#0f172a" stroke-width="1"><title>Station ${escapeXml(point.join(','))}</title></circle>`);

  const orientation = axes === 'xz' ? 'PLAN · north (-Z) ↑ · east (+X) →' : 'SECTION · elevation (+Y) ↑ · east (+X) →';
  const verticalRange = axes === 'xz' ? `Z ${minB}…${maxB} · north (-Z) ↑` : `Y ${minB}…${maxB} · elevation (+Y) ↑`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-release-id="${escapeXml(releaseId)}" data-target-count="${targets.length}" data-station-count="${stations.length}" data-projection="${axes}">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(subtitle)} Exact canonical target coordinates projected on ${axisNames.join('/')} axes.</desc>
  <style>.grid{stroke:#334155;stroke-width:1;opacity:.45}.label{font:14px system-ui,sans-serif;fill:#cbd5e1}.small{font:12px ui-monospace,monospace;fill:#94a3b8}</style>
  <rect width="${width}" height="${height}" fill="#071521"/>
  <text x="52" y="48" font-family="system-ui,sans-serif" font-size="25" font-weight="700" fill="#f8fafc">${escapeXml(title)}</text>
  <text x="52" y="78" font-family="system-ui,sans-serif" font-size="14" fill="#cbd5e1">${escapeXml(subtitle)}</text>
  <text x="52" y="102" class="small">${escapeXml(releaseId)} · ${targets.length} canonical targets · ${stations.length} stations</text>
  <text x="${width - 52}" y="102" text-anchor="end" class="small">${escapeXml(orientation)}</text>
  <rect x="${plot.x}" y="${plot.y}" width="${plot.width}" height="${plot.height}" fill="#0f2233" stroke="#475569" stroke-width="1"/>
  ${grid.join('\n  ')}
  ${cells.join('\n  ')}
  ${stationLine}
  ${stationDots.join('\n  ')}
  <text x="${plot.x}" y="${height - 72}" class="label">${axisNames[0]} ${minA}…${maxA}</text>
  <text x="${plot.x + 190}" y="${height - 72}" class="label">${escapeXml(verticalRange)}</text>
  <rect x="${width - 475}" y="${height - 91}" width="14" height="14" fill="#38bdf8"/><text x="${width - 453}" y="${height - 79}" class="label">air / clear envelope</text>
  <rect x="${width - 285}" y="${height - 91}" width="14" height="14" fill="#facc15"/><text x="${width - 263}" y="${height - 79}" class="label">support / tread</text>
  <rect x="${width - 115}" y="${height - 91}" width="14" height="14" fill="#fb923c"/><text x="${width - 93}" y="${height - 79}" class="label">guard</text>
</svg>
`;
}

export function assertPublishableAssets(assets) {
  fail(assets instanceof Map && assets.size > 0, 'no generated assets supplied');
  for (const [name, content] of assets) {
    fail(Buffer.byteLength(content) > 512, `${name} is too small to be a real evidence asset`);
    fail(!content.includes('${'), `${name} contains an unresolved template placeholder`);
    if (name.endsWith('.svg')) {
      fail(/data-target-count="[1-9][0-9]*"/.test(content), `${name} has no nonzero target count`);
      fail(content.includes('<rect ') && content.includes('<title>'), `${name} has no plotted coordinate cells`);
    }
  }
}

export function publishC01AsBuiltVisuals(config) {
  const root = path.resolve(config.root ?? process.cwd());
  const output = path.resolve(root, config.output);
  const paths = {
    root,
    ledger: path.resolve(root, config.ledger),
    qa: path.resolve(root, config.qa),
    manifest: path.resolve(root, config.manifest),
  };

  fail(typeof config.generatedAtUtc === 'string' && !Number.isNaN(Date.parse(config.generatedAtUtc)), 'generatedAtUtc must be an honest ISO timestamp');

  for (const [name, value] of Object.entries(paths)) {
    if (name === 'root') continue;
    fail(fs.existsSync(value) && fs.statSync(value).isFile(), `${name} file is absent: ${relativePath(root, value)}`);
  }
  fail(!fs.existsSync(output), `output must be a new path: ${relativePath(root, output)}`);

  const ledger = readJson(paths.ledger);
  const qa = readJson(paths.qa);
  const manifest = readJson(paths.manifest);

  fail(ledger.releaseId === config.releaseId, `ledger release ID ${ledger.releaseId}`);
  fail(ledger.status === TERMINAL_STATUS, `ledger terminal status ${ledger.status}`);
  fail(manifest.id === config.releaseId, `manifest release ID ${manifest.id}`);
  fail(manifest.status === COMPILED_STATUS, `manifest status ${manifest.status}`);
  fail(manifest.mutationAuthority === false, 'manifest unexpectedly grants mutation authority');
  fail(qa.id === `${config.releaseId}-INDEPENDENT-POST-QA`, `QA ID ${qa.id}`);
  fail(qa.status === config.qaStatus, `QA status ${qa.status}`);
  fail(qa.readOnly === true && qa.worldMutated === false, 'QA is not a read-only, non-mutating report');

  validateQaBindings(qa, paths, config.allowQaLedgerAppendBinding === true);
  const ledgerQaBindingMode = validateLedgerQaBinding(ledger, paths.qa, config.qaStatus, paths.manifest);
  fail(ledger.postSnapshot?.root === qa.postSnapshot?.root, 'ledger and QA post snapshots differ');

  const checks = Object.entries(qa.checks ?? {});
  fail(checks.length > 0, 'QA contains no checks');
  fail(checks.every(([, check]) => check?.passed === true), 'QA contains a non-passing check');

  const targets = manifest.canonicalStates?.target;
  fail(Array.isArray(targets) && targets.length > 0, 'manifest has zero canonical targets');
  const coordinates = new Set();
  for (const [index, target] of targets.entries()) {
    validatePoint(target.point, `canonical target ${index}`);
    fail(typeof target.targetState === 'string' && target.targetState.startsWith('minecraft:'), `canonical target ${index} has no target state`);
    fail(typeof target.role === 'string' && target.role.length > 0, `canonical target ${index} has no role`);
    const key = target.point.join(',');
    fail(!coordinates.has(key), `duplicate canonical target coordinate ${key}`);
    coordinates.add(key);
  }

  const changedCount = manifest.operations?.forward?.commandCount;
  fail(Number.isInteger(changedCount) && changedCount > 0, 'manifest has no changed-cell count');
  fail(changedCount <= targets.length, 'changed-cell count exceeds canonical targets');

  const stations = config.stations(manifest);
  fail(Array.isArray(stations), 'station extractor did not return an array');
  stations.forEach((point, index) => validatePoint(point, `station ${index}`));
  if (config.stationsRequired !== false) fail(stations.length > 0, 'manifest has zero route stations');

  const scopeDetails = config.scope(manifest, targets, changedCount, stations);
  fail(scopeDetails.canonicalTargetCount === targets.length, 'scope target count disagrees with canonical target manifest');
  fail(scopeDetails.changedCount === changedCount, 'scope changed count disagrees with operations manifest');
  fail(scopeDetails.stationCount === stations.length, 'scope station count disagrees with station manifest');
  fail(scopeDetails.totalDesignCellCount >= targets.length, 'total design count is smaller than canonical target count');

  const roleCounts = {};
  for (const target of targets) roleCounts[target.role] = (roleCounts[target.role] ?? 0) + 1;
  const bounds = boundsOf(targets);
  const plan = renderPlot({ releaseId: config.releaseId, title: config.title, subtitle: 'Immutable-post as-built canonical target plan', targets, stations, axes: 'xz' });
  const section = renderPlot({ releaseId: config.releaseId, title: config.title, subtitle: 'Immutable-post as-built canonical target section', targets, stations, axes: 'xy' });

  const readmeEvidenceLink = (value) => relativePath(output, value);
  const readme = `# ${config.releaseId}\n\n**Status:** AS-BUILT / POST-VERIFIED / REVERSIBLE — exact bounded scope only\n\nGenerated as a read-only publication from the accepted ledger, passing immutable-post QA, and canonical release manifest.\n\n## Bound evidence\n\n- [Guarded release ledger](${readmeEvidenceLink(paths.ledger)})\n- [Passing immutable-post QA](${readmeEvidenceLink(paths.qa)})\n- [Canonical release manifest](${readmeEvidenceLink(paths.manifest)})\n\n## Exact scope\n\n- Canonical target cells: ${targets.length}\n- Cells changed by the accepted forward execution: ${changedCount}\n- Route stations represented: ${stations.length}\n- Total bounded design cells: ${scopeDetails.totalDesignCellCount}\n\n${config.summary}\n\n## Non-claims\n\n${config.nonClaims.map((claim) => `- ${claim}`).join('\n')}\n`;

  const evidence = {
    schemaVersion: 2,
    releaseId: config.releaseId,
    status: 'AS_BUILT_POST_VERIFIED_REVERSIBLE',
    generatedAtUtc: config.generatedAtUtc,
    classification: 'READ_ONLY_AS_BUILT_VISUAL_EVIDENCE',
    authority: { readOnly: true, worldMutationAuthorized: false, commissioningClaim: false },
    evidence: {
      ledger: { path: relativePath(root, paths.ledger), sha256: shaFile(paths.ledger), terminalStatus: ledger.status },
      qa: { path: relativePath(root, paths.qa), sha256: shaFile(paths.qa), status: qa.status },
      releaseManifest: { path: relativePath(root, paths.manifest), sha256: shaFile(paths.manifest), status: manifest.status },
      ledgerQaBindingMode,
    },
    scope: { ...scopeDetails, bounds, canonicalCoordinateSetSha256: coordinateSetSha256(targets), roleCounts },
    nonClaims: config.nonClaims,
  };

  const initialAssets = new Map([
    ['README.md', readme],
    ['as-built-plan.svg', plan],
    ['as-built-section.svg', section],
    ['as-built-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`],
  ]);
  assertPublishableAssets(initialAssets);

  const publicationManifest = {
    ...evidence,
    assets: [...initialAssets.entries()].map(([file, content]) => ({
      id: file.replace(/\.[^.]+$/, ''),
      kind: file.endsWith('.svg') ? (file.includes('plan') ? 'plan' : 'section') : 'evidence',
      file,
      sha256: shaBuffer(content),
      bytes: Buffer.byteLength(content),
    })),
  };
  const allAssets = new Map(initialAssets);
  allAssets.set('publication-manifest.json', `${JSON.stringify(publicationManifest, null, 2)}\n`);
  assertPublishableAssets(allAssets);

  const tempOutput = `${output}.tmp-${process.pid}-${Date.now()}`;
  fail(!fs.existsSync(tempOutput), 'temporary output path collision');
  fs.mkdirSync(tempOutput, { recursive: true });
  try {
    for (const [name, content] of allAssets) fs.writeFileSync(path.join(tempOutput, name), content);
    fs.renameSync(tempOutput, output);
  } catch (error) {
    fs.rmSync(tempOutput, { recursive: true, force: true });
    throw error;
  }

  return { status: 'PUBLISHED_READ_ONLY_AS_BUILT_VISUAL_EVIDENCE', releaseId: config.releaseId, out: relativePath(root, output), scope: publicationManifest.scope, assets: publicationManifest.assets };
}
