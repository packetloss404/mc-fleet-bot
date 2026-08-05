import fs from 'node:fs';
import path from 'node:path';

import type { ReportJob } from '@mc-fleet/world-core';

import type { ReportRecipe } from './types.js';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function metric(label: string, value: unknown): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function summarizeResult(id: string, result: unknown): string {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return `<section><h2>${escapeHtml(id)}</h2><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></section>`;
  }
  const record = result as Record<string, unknown>;
  const explicitMetrics = Array.isArray(record.metrics)
    ? (record.metrics as Array<{ label?: unknown; value?: unknown }>)
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => [String(entry.label ?? ''), entry.value] as const)
        .filter(([label]) => label.length > 0)
    : null;
  const heuristic = [
    ['SHA-256', record.sha256 ?? record.snapshotSha256],
    ['Region files', record.regionFileCount],
    ['Declared chunks', record.declaredChunkCount],
    ['Decoded chunks', record.chunksDecoded],
    ['Blocks counted', record.blocksCounted],
    ['Unique states', record.uniqueBlockStates],
    ['Rows', record.total],
    ['Complete', record.complete],
  ].filter((entry): entry is [string, unknown] => entry[1] !== undefined);
  const metrics = explicitMetrics ?? heuristic;
  const diffBlock = record.type === 'snapshot-diff' ? renderDiffBlock(record) : '';
  return `
    <section>
      <div class="section-head"><h2>${escapeHtml(id)}</h2><span>${escapeHtml(
        String(record.type ?? 'result'),
      )}</span></div>
      ${metrics.length > 0 ? `<div class="metrics">${metrics.map(([label, value]) => metric(label, value)).join('')}</div>` : ''}
      ${diffBlock}
      <details>
        <summary>Structured result</summary>
        <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
      </details>
    </section>
  `;
}

function renderDiffBlock(record: Record<string, unknown>): string {
  const added = Array.isArray(record['added'])
    ? (record['added'] as Array<{ filename: string }>)
    : [];
  const removed = Array.isArray(record['removed'])
    ? (record['removed'] as Array<{ filename: string }>)
    : [];
  const changed = Array.isArray(record['changed'])
    ? (record['changed'] as Array<{ filename: string; bytesDelta: number }>)
    : [];
  const list = (items: Array<{ filename: string }>): string =>
    items.length === 0
      ? '<p class="diff-empty">None.</p>'
      : `<ul class="diff-list">${items
          .map((item) => `<li>${escapeHtml(item.filename)}</li>`)
          .join('')}</ul>`;
  const listChanged = (items: Array<{ filename: string; bytesDelta: number }>): string =>
    items.length === 0
      ? '<p class="diff-empty">None.</p>'
      : `<ul class="diff-list">${items
          .map(
            (item) =>
              `<li>${escapeHtml(item.filename)} <small>(${item.bytesDelta >= 0 ? '+' : ''}${item.bytesDelta} bytes)</small></li>`,
          )
          .join('')}</ul>`;
  return `
    <div class="diff-grid">
      <div><h3>Added</h3>${list(added)}</div>
      <div><h3>Removed</h3>${list(removed)}</div>
      <div><h3>Changed</h3>${listChanged(changed)}</div>
    </div>
  `;
}

export function writeHtmlReport(
  outputDirectory: string,
  recipe: ReportRecipe,
  job: ReportJob,
  results: Record<string, unknown>,
  title: string,
): string {
  const filename = path.join(outputDirectory, 'report.html');
  const sections = Object.entries(results)
    .map(([id, result]) => summarizeResult(id, result))
    .join('');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; --bg:#071019; --panel:#0d1b28; --line:#23384a; --ink:#edf5f8; --muted:#9bb0bd; --accent:#65d2c3; --gold:#e6b85c; }
    * { box-sizing: border-box; }
    body { margin:0; font:15px/1.55 Inter,ui-sans-serif,system-ui,sans-serif; color:var(--ink); background:radial-gradient(circle at 15% 0,#123047 0,transparent 34rem),var(--bg); }
    main { width:min(1120px,calc(100% - 32px)); margin:0 auto; padding:54px 0 80px; }
    header { padding:32px; border:1px solid var(--line); border-radius:22px; background:linear-gradient(135deg,rgba(20,55,72,.94),rgba(9,22,33,.96)); box-shadow:0 22px 60px #0008; }
    .eyebrow { color:var(--accent); text-transform:uppercase; letter-spacing:.14em; font-size:12px; font-weight:800; }
    h1 { font-size:clamp(34px,6vw,66px); line-height:1; margin:13px 0 18px; letter-spacing:-.04em; }
    p { color:var(--muted); max-width:75ch; }
    .identity { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
    .identity span,.section-head span { padding:6px 10px; border-radius:99px; border:1px solid var(--line); color:var(--muted); font-size:12px; }
    section { margin-top:18px; padding:24px; background:rgba(13,27,40,.88); border:1px solid var(--line); border-radius:18px; }
    .section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    h2 { margin:0 0 15px; font-size:22px; }
    .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:10px; }
    .metric { min-height:86px; padding:14px; border-radius:12px; background:#09141f; border:1px solid #1b3041; }
    .metric span { display:block; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.07em; }
    .metric strong { display:block; margin-top:6px; color:var(--gold); font-size:19px; overflow-wrap:anywhere; }
    details { margin-top:18px; } summary { cursor:pointer; color:var(--accent); }
    pre { overflow:auto; padding:16px; border-radius:12px; background:#050a0f; color:#c6d7df; font:12px/1.5 ui-monospace,SFMono-Regular,monospace; }
    .diff-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:18px; }
    .diff-grid > div { background:#09141f; border:1px solid #1b3041; border-radius:12px; padding:14px 16px; }
    .diff-grid h3 { margin:0 0 10px; font-size:14px; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; }
    .diff-list { margin:0; padding-left:18px; color:var(--ink); font:12px/1.5 ui-monospace,SFMono-Regular,monospace; }
    .diff-list li { margin:2px 0; }
    .diff-list small { color:var(--muted); margin-left:6px; }
    .diff-empty { margin:0; color:var(--muted); font-size:12px; }
    footer { color:var(--muted); padding:28px 4px; font-size:12px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="eyebrow">MC Fleet Devtools · Read-only report</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(recipe.description)}</p>
      <div class="identity">
        <span>Job ${escapeHtml(job.id)}</span>
        <span>${escapeHtml(job.serverId)} / ${escapeHtml(job.worldId)}</span>
        <span>Recipe ${escapeHtml(recipe.id)}</span>
        <span>${escapeHtml(job.createdAt)}</span>
      </div>
    </header>
    ${sections}
    <footer>Generated from registered, read-only local inputs. See artifact-manifest.json for hashes.</footer>
  </main>
</body>
</html>
`;
  fs.writeFileSync(filename, html);
  return filename;
}
