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
  const useful = [
    ['SHA-256', record.sha256 ?? record.snapshotSha256],
    ['Region files', record.regionFileCount],
    ['Declared chunks', record.declaredChunkCount],
    ['Decoded chunks', record.chunksDecoded],
    ['Blocks counted', record.blocksCounted],
    ['Unique states', record.uniqueBlockStates],
    ['Rows', record.total],
    ['Complete', record.complete],
  ].filter(([, value]) => value !== undefined);
  return `
    <section>
      <div class="section-head"><h2>${escapeHtml(id)}</h2><span>${escapeHtml(
        String(record.type ?? 'result'),
      )}</span></div>
      ${useful.length > 0 ? `<div class="metrics">${useful.map(([label, value]) => metric(String(label), value)).join('')}</div>` : ''}
      <details>
        <summary>Structured result</summary>
        <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
      </details>
    </section>
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
