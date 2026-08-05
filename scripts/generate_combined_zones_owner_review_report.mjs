#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const reportDirectory = join(repositoryRoot, 'masterplans', '05-combined-zones');
const outputPath = process.argv[2]
  ? resolve(repositoryRoot, process.argv[2])
  : join(reportDirectory, 'phase1-owner-review-report.html');

const readJson = (filename) => JSON.parse(readFileSync(join(reportDirectory, filename), 'utf8'));
const bundle = readJson('phase1-owner-review-bundle.json');
const d02 = readJson('phase1-d02-owner-acceptance-packet.json');
const d05 = readJson('phase1-d05-owner-acceptance-packet.json');
const d06 = readJson('phase1-d06-owner-acceptance-packet.json');
const b11 = readJson('phase1-b11-external-interface-acceptance.json');
const r00 = readJson('phase1-r00-readiness-audit.json');

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatInteger = (value) => new Intl.NumberFormat('en-US').format(value);
const localHref = (sourcePath) => basename(sourcePath);
const shortHash = (hash) => `${hash.slice(0, 12)}…${hash.slice(-8)}`;
const gateLabel = (id) => id
  .replace(/^G(\d+)_/, 'G$1 · ')
  .replaceAll('_', ' ')
  .toLowerCase()
  .replace(/(^|\s)\S/g, (character) => character.toUpperCase());

const packetDescriptions = {
  D02: 'Accepts the evidence taxonomy, exact C1 raster, ten capped-sump candidates, and ROAD-LOW-001 no-build hold as the basis for more technical work.',
  D05: 'Accepts FM-01 and the default-deny material, support, hydrology, relic, transport, ownership, and interface checklist as policy—not future cells.',
  D06: 'Accepts fail-closed B07 and Empty Eight reservations plus eleven life-safety development criteria; every opening and discharge remains sealed.',
  'P1-B11': 'Accepts the exact Grand Avenue profile, evidenced anchors, zero-cell PassageWay deferral, and sealed future-line dispositions.',
};

const packetLinks = {
  D02: ['phase1-d02-owner-acceptance-packet.md', 'phase1-d02-owner-acceptance-packet.json'],
  D05: ['phase1-d05-owner-acceptance-packet.md', 'phase1-d05-owner-acceptance-packet.json'],
  D06: ['phase1-d06-owner-acceptance-packet.md', 'phase1-d06-owner-acceptance-packet.json'],
  'P1-B11': ['phase1-b11-external-interface-acceptance.md', 'phase1-b11-external-interface-acceptance.json'],
};

const packetCards = bundle.packetSummary.map((packet) => {
  const [markdown, json] = packetLinks[packet.scope];
  return `
    <article class="packet-card">
      <div class="packet-card__head">
        <span class="eyebrow">${escapeHtml(packet.scope)}</span>
        <span class="pill pill--hold">${packet.remainingHoldCount} HOLD${packet.remainingHoldCount === 1 ? '' : 'S'}</span>
      </div>
      <h3>${escapeHtml({ D02: 'Civil + drainage', D05: 'Future mountain', D06: 'Life safety', 'P1-B11': 'External interfaces' }[packet.scope])}</h3>
      <p>${escapeHtml(packetDescriptions[packet.scope])}</p>
      <div class="link-row"><a href="${markdown}">Readable packet</a><a href="${json}">Source JSON</a></div>
    </article>`;
}).join('');

const gateRows = r00.gates.map((gate) => {
  const blockers = gate.blockers.length === 0
    ? 'Authority chain and release boundary are bound.'
    : gate.blockers.map((blocker) => `<strong>${escapeHtml(blocker.classification)}</strong> · ${escapeHtml(blocker.requirement)}`).join('<br>');
  return `
    <tr>
      <td><span class="pill ${gate.status === 'PASS' ? 'pill--pass' : 'pill--hold'}">${escapeHtml(gate.status)}</span></td>
      <th scope="row">${escapeHtml(gateLabel(gate.id))}</th>
      <td>${blockers}</td>
    </tr>`;
}).join('');

const sourceRows = Object.entries(bundle.sourceBindings).map(([key, source]) => `
  <tr>
    <th scope="row">${escapeHtml(key.toUpperCase())}</th>
    <td><a href="${escapeHtml(localHref(source.path))}">${escapeHtml(source.role)}</a></td>
    <td><code>${escapeHtml(source.sha256)}</code></td>
    <td>${formatInteger(source.bytes)}</td>
  </tr>`).join('');

const riseMarkers = b11.acceptancePayload.grandAvenue.riseStations.map((point) => {
  const x = 72 + (point.station / b11.acceptancePayload.grandAvenue.horizontalStepCount) * 856;
  const y = 185 - ((point.y - 68) / 4) * 110;
  return `
    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="7" />
    <line x1="${x.toFixed(2)}" y1="${(y - 10).toFixed(2)}" x2="${x.toFixed(2)}" y2="42" />
    <text x="${x.toFixed(2)}" y="30" text-anchor="middle">S${point.station} · Y${point.y}</text>`;
}).join('');

const profilePath = [
  'M 72 185',
  ...b11.acceptancePayload.grandAvenue.riseStations.map((point) => {
    const x = 72 + (point.station / b11.acceptancePayload.grandAvenue.horizontalStepCount) * 856;
    const previousY = 185 - ((point.y - 69) / 4) * 110;
    const nextY = 185 - ((point.y - 68) / 4) * 110;
    return `L ${x.toFixed(2)} ${previousY.toFixed(2)} L ${x.toFixed(2)} ${nextY.toFixed(2)}`;
  }),
  'L 928 75',
].join(' ');

const d05HoldCount = d05.passHoldMatrix.filter((item) => item.status === 'HOLD').length;
const d06PassCount = d06.acceptanceCriteria.filter((item) => item.status === 'PASS').length;
const d06HoldCount = d06.acceptanceCriteria.filter((item) => item.status === 'HOLD').length;
const reportHrefPrefix = relative(dirname(outputPath), reportDirectory).replaceAll('\\', '/');
const reportLink = (path) => reportHrefPrefix ? `${reportHrefPrefix}/${path}` : path;
const conceptImage = reportLink('../04-combined-complex/03-visuals/modules/map-integration/11-grand-avenue-overview.png');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="Human review report for the Combined Zones R00 owner-review bundle.">
  <title>Combined Zones R00 · Owner Review</title>
  <style>
    :root {
      --ink: #f3f4ee;
      --muted: #aeb7b0;
      --paper: #0b1110;
      --surface: #121b19;
      --surface-2: #17231f;
      --line: #2c3a35;
      --moss: #72d38c;
      --amber: #f1bd60;
      --red: #ee7d72;
      --blue: #78b9d7;
      --cream: #efe7d1;
      --shadow: 0 24px 70px rgb(0 0 0 / 32%);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 90% 0%, rgb(49 99 73 / 24%), transparent 30rem),
        radial-gradient(circle at 10% 28rem, rgb(103 85 40 / 16%), transparent 28rem),
        var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
    }
    a { color: #a8d8ef; text-underline-offset: .22em; }
    a:hover { color: white; }
    button { font: inherit; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: .82em; overflow-wrap: anywhere; }
    img { display: block; max-width: 100%; }
    .shell { width: min(1180px, calc(100% - 36px)); margin: 0 auto; }
    .hero { padding: 84px 0 48px; }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(280px, .7fr); gap: 42px; align-items: end; }
    .kicker, .eyebrow { color: var(--moss); font-size: .75rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { max-width: 12ch; margin: .3rem 0 1.2rem; font-family: Georgia, serif; font-size: clamp(3.25rem, 8vw, 7.8rem); font-weight: 500; letter-spacing: -.055em; line-height: .88; }
    h2 { margin: 0 0 1rem; font-family: Georgia, serif; font-size: clamp(2rem, 4vw, 3.7rem); font-weight: 500; letter-spacing: -.035em; line-height: 1; }
    h3 { margin: .35rem 0 .6rem; font-size: 1.15rem; }
    p { color: var(--muted); }
    .lede { max-width: 66ch; color: #d9dfda; font-size: 1.15rem; }
    .hero-status { border: 1px solid var(--line); border-radius: 18px; background: rgb(18 27 25 / 78%); box-shadow: var(--shadow); padding: 22px; }
    .status-line { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
    .pill { display: inline-flex; align-items: center; border: 1px solid currentColor; border-radius: 999px; padding: .27rem .58rem; font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
    .pill--pass { color: var(--moss); background: rgb(114 211 140 / 8%); }
    .pill--hold { color: var(--amber); background: rgb(241 189 96 / 8%); }
    .pill--zero { color: var(--blue); background: rgb(120 185 215 / 8%); }
    .hash-label { margin: 0 0 .35rem; color: var(--muted); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; }
    .hash { display: block; border: 1px solid var(--line); border-radius: 9px; background: #080d0c; padding: 12px; color: var(--cream); overflow-wrap: anywhere; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
    .button { border: 1px solid #5c7169; border-radius: 999px; background: transparent; color: var(--ink); cursor: pointer; padding: .58rem .9rem; text-decoration: none; }
    .button:hover { border-color: var(--ink); background: rgb(255 255 255 / 5%); }
    .button--primary { border-color: var(--moss); background: var(--moss); color: #07100b; font-weight: 800; }
    .toc { position: sticky; top: 0; z-index: 4; border-block: 1px solid var(--line); background: rgb(11 17 16 / 92%); backdrop-filter: blur(12px); }
    .toc .shell { display: flex; gap: 20px; overflow-x: auto; padding-block: 13px; }
    .toc a { color: var(--muted); font-size: .78rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
    .toc a:hover { color: var(--ink); }
    section { padding: 72px 0; }
    .section-head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .7fr); gap: 36px; align-items: end; margin-bottom: 28px; }
    .section-head p { margin: 0; }
    .decision-banner { border: 1px solid #655737; border-radius: 18px; background: linear-gradient(135deg, rgb(77 61 27 / 32%), rgb(18 27 25 / 88%)); padding: 28px; }
    .decision-banner strong { color: var(--amber); }
    .packet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 22px; }
    .packet-card { display: flex; min-height: 275px; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); padding: 20px; }
    .packet-card__head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .packet-card p { flex: 1; font-size: .9rem; }
    .link-row { display: flex; gap: 14px; flex-wrap: wrap; font-size: .78rem; font-weight: 700; }
    .boundary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .boundary { border: 1px solid var(--line); border-radius: 15px; padding: 24px; }
    .boundary--yes { background: rgb(61 118 79 / 11%); }
    .boundary--no { background: rgb(132 63 50 / 10%); }
    ul.clean { margin: 1rem 0 0; padding: 0; list-style: none; }
    ul.clean li { position: relative; margin: .65rem 0; padding-left: 1.3rem; color: var(--muted); }
    ul.clean li::before { position: absolute; left: 0; content: '—'; color: var(--moss); }
    .boundary--no ul.clean li::before { color: var(--red); }
    .map-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 16px; }
    figure { margin: 0; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); overflow: hidden; }
    figure img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: #0b1110; }
    figcaption { padding: 16px 18px 18px; color: var(--muted); font-size: .82rem; }
    figcaption strong { display: block; margin-bottom: .2rem; color: var(--ink); }
    .map-grid figure:first-child { grid-row: span 2; }
    .map-grid figure:first-child img { height: 100%; min-height: 570px; }
    .profile-card { margin-top: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); padding: 20px; }
    .profile-card svg { width: 100%; height: auto; color: var(--moss); }
    .profile-card text { fill: var(--muted); font: 11px ui-monospace, monospace; }
    .profile-card path { fill: none; stroke: var(--moss); stroke-width: 4; }
    .profile-card circle { fill: var(--paper); stroke: var(--amber); stroke-width: 4; }
    .profile-card line { stroke: var(--line); stroke-dasharray: 3 5; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
    .stat { border-top: 1px solid var(--line); padding-top: 13px; }
    .stat strong { display: block; color: var(--cream); font-family: Georgia, serif; font-size: 2.15rem; font-weight: 500; line-height: 1; }
    .stat span { color: var(--muted); font-size: .76rem; }
    .technical-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .technical-card { border: 1px solid var(--line); border-radius: 15px; background: var(--surface); padding: 22px; }
    .technical-card dl { display: grid; grid-template-columns: 1fr auto; gap: 10px; border-top: 1px solid var(--line); margin-top: 18px; padding-top: 15px; }
    .technical-card dt { color: var(--muted); }
    .technical-card dd { margin: 0; color: var(--cream); font-weight: 800; text-align: right; }
    .technical-card .identity { display: block; margin-top: 16px; color: var(--muted); }
    .table-wrap { border: 1px solid var(--line); border-radius: 15px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--surface); font-size: .86rem; }
    th, td { border-bottom: 1px solid var(--line); padding: 14px 16px; text-align: left; vertical-align: top; }
    tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
    th { color: var(--cream); }
    td { color: var(--muted); }
    .gate-table td:first-child { width: 90px; }
    .gate-table th { width: 225px; }
    .timeline { display: grid; gap: 0; counter-reset: step; }
    .timeline article { position: relative; display: grid; grid-template-columns: 46px 1fr; gap: 18px; padding-bottom: 28px; counter-increment: step; }
    .timeline article::before { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid var(--moss); border-radius: 50%; color: var(--moss); content: counter(step, decimal-leading-zero); font-size: .74rem; font-weight: 800; }
    .timeline article:not(:last-child)::after { position: absolute; top: 43px; bottom: 0; left: 21px; width: 1px; background: var(--line); content: ''; }
    .timeline h3 { margin-top: .1rem; }
    .timeline p { margin: 0; max-width: 78ch; }
    .approval { border: 1px solid #5e715d; border-radius: 20px; background: linear-gradient(145deg, rgb(32 62 42 / 40%), var(--surface)); box-shadow: var(--shadow); padding: clamp(24px, 5vw, 48px); }
    blockquote { margin: 24px 0; color: var(--cream); font-family: Georgia, serif; font-size: clamp(1.2rem, 2.4vw, 1.75rem); line-height: 1.45; }
    .notice { border-left: 3px solid var(--amber); padding-left: 16px; color: var(--muted); }
    .evidence-table code { display: block; min-width: 360px; }
    footer { border-top: 1px solid var(--line); padding: 38px 0 64px; color: var(--muted); font-size: .8rem; }
    .print-only { display: none; }
    @media (max-width: 900px) {
      .hero-grid, .section-head, .map-grid { grid-template-columns: 1fr; }
      .packet-grid, .stat-grid { grid-template-columns: repeat(2, 1fr); }
      .technical-grid { grid-template-columns: 1fr; }
      .map-grid figure:first-child { grid-row: auto; }
      .map-grid figure:first-child img { min-height: 0; }
    }
    @media (max-width: 580px) {
      .shell { width: min(100% - 24px, 1180px); }
      .hero { padding-top: 52px; }
      .packet-grid, .stat-grid, .boundary-grid { grid-template-columns: 1fr; }
      h1 { font-size: 3.4rem; }
    }
    @media print {
      :root { --ink: #101512; --muted: #39443e; --paper: white; --surface: white; --surface-2: #f1f4f1; --line: #b9c1bb; --cream: #101512; }
      body { background: white; color: #101512; font-size: 10pt; }
      .shell { width: 100%; }
      .hero, section { padding: 30px 0; }
      .toc, .actions, .screen-only { display: none !important; }
      .print-only { display: block; }
      .packet-card, .technical-card, figure, .profile-card, .approval, .table-wrap { break-inside: avoid; box-shadow: none; }
      a { color: #101512; text-decoration: none; }
      .packet-grid { grid-template-columns: repeat(2, 1fr); }
      .technical-grid { grid-template-columns: repeat(3, 1fr); }
      .map-grid figure:first-child img { min-height: 0; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="shell hero-grid">
      <div>
        <div class="kicker">Combined Zones · R00 · Sole-owner review</div>
        <h1>Review the plan before it becomes a build.</h1>
        <p class="lede">This report turns the four source-bound packets into one human review surface. It shows the exact planning choices, their maps and concept imagery, every retained HOLD, and the single statement that can be accepted now.</p>
      </div>
      <aside class="hero-status" aria-label="Current review status">
        <div class="status-line">
          <span class="pill pill--pass">Review ready</span>
          <span class="pill pill--hold">Approval pending</span>
          <span class="pill pill--zero">0 operations</span>
        </div>
        <p class="hash-label">Controlling bundle payload SHA-256</p>
        <code class="hash" id="bundle-hash">${escapeHtml(bundle.authority.bundlePayloadSha256)}</code>
        <div class="actions screen-only">
          <button class="button button--primary" type="button" data-copy="#approval-statement">Copy approval statement</button>
          <button class="button" type="button" onclick="window.print()">Print / save PDF</button>
        </div>
      </aside>
    </div>
  </header>

  <nav class="toc" aria-label="Report sections">
    <div class="shell">
      <a href="#decision">Decision</a>
      <a href="#scope">Scope</a>
      <a href="#maps">Maps</a>
      <a href="#b11">Grand Avenue</a>
      <a href="#technical">Technical packets</a>
      <a href="#gates">R00 gates</a>
      <a href="#next">Next sequence</a>
      <a href="#approve">Approval</a>
      <a href="#evidence">Evidence</a>
    </div>
  </nav>

  <main>
    <section id="decision">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">The decision in one minute</div><h2>Accept the planning basis, keep every technical gate closed.</h2></div>
          <p>Your acceptance gives the autonomous design work one controlling checklist and freezes P1-B11’s remaining geometry choice. It does not make the design buildable.</p>
        </div>
        <div class="decision-banner">
          <strong>Recommended review disposition:</strong> accept the hash-bound planning policy and technical-development checklist. The current record is still absent, R00 remains HOLD, and the complete saved world is still required.
        </div>
        <div class="packet-grid">${packetCards}</div>
      </div>
    </section>

    <section id="scope">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">Scope boundary</div><h2>What this approval means—and what it cannot mean.</h2></div>
          <p>The distinction is deliberate: this is authority to continue exact offline design against a fixed checklist, not authority to build or operate anything.</p>
        </div>
        <div class="boundary-grid">
          <article class="boundary boundary--yes">
            <span class="pill pill--pass">Accepts</span>
            <ul class="clean">${bundle.bundlePayload.acceptedScope.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </article>
          <article class="boundary boundary--no">
            <span class="pill pill--hold">Never implies</span>
            <ul class="clean">${bundle.bundlePayload.acceptanceNeverImplies.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </article>
        </div>
      </div>
    </section>

    <section id="maps">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">Placement context</div><h2>04 is the normalized complex. 05 places it into the current world.</h2></div>
          <p>The maps below are authored planning views. They show current-world integration and setout intent; they are not operation manifests or proof of built conditions.</p>
        </div>
        <div class="map-grid">
          <figure>
            <a href="${reportLink('maps/current-plus-proposed-phase0-overlay.png')}"><img src="${reportLink('maps/current-plus-proposed-phase0-overlay.png')}" alt="Top-down current-world terrain with the Combined Zones Phase 0 proposal overlaid"></a>
            <figcaption><strong>Current world + adopted Phase 0 overlay</strong>One-block-per-pixel siting context for the east reserve, corridor, Gateway Approach, normalized complex, and Empty Eight.</figcaption>
          </figure>
          <figure>
            <a href="${reportLink('maps/gateway-approach-and-terminal-plan.png')}"><img src="${reportLink('maps/gateway-approach-and-terminal-plan.png')}" alt="Gateway Approach and Empty Eight terminal planning diagram"></a>
            <figcaption><strong>Gateway Approach + Empty Eight</strong>The surface adapter, hidden split, descent, oversized concourse, and eight sealed future-line stubs.</figcaption>
          </figure>
          <figure>
            <a href="${reportLink('maps/vertical-zoning-section.png')}"><img src="${reportLink('maps/vertical-zoning-section.png')}" alt="Vertical zoning section through surface and underground Combined Zones"></a>
            <figcaption><strong>Vertical coordination section</strong>A zoning illustration—not a construction section—showing how surface, public underground, service, and deep program relate.</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section id="b11">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">The remaining geometry choice · P1-B11</div><h2>Grand Avenue rises four blocks across 298 horizontal steps.</h2></div>
          <p>The profile is exact planning geometry: 299 unique, eight-connected centerline points, no terrain-Y substitution, and a maximum one-block vertical step.</p>
        </div>
        <div class="map-grid">
          <figure>
            <a href="${reportLink('maps/current-and-proposed-whole-world.png')}"><img src="${reportLink('maps/current-and-proposed-whole-world.png')}" alt="Whole-world map showing current and proposed Combined Zones context"></a>
            <figcaption><strong>Whole-world relationship</strong>Grand Avenue connects Gateway Approach to the Houston surface datum inside the broader current/proposed world.</figcaption>
          </figure>
          <figure>
            <a href="${conceptImage}"><img src="${conceptImage}" alt="Concept rendering of Grand Avenue within the Combined Complex"></a>
            <figcaption><strong>Concept intent · not measured evidence</strong>Masterplan 04’s architectural rendering communicates experience and character. The JSON profile and accepted maps control geometry.</figcaption>
          </figure>
          <figure>
            <a href="${reportLink('maps/east-corridor-plan.png')}"><img src="${reportLink('maps/east-corridor-plan.png')}" alt="East Corridor transport and Grand Avenue planning diagram"></a>
            <figcaption><strong>East Corridor plan</strong>Road, passenger rail, surface stops, gateway, and terminal interfaces designed as one reservation.</figcaption>
          </figure>
        </div>
        <div class="profile-card">
          <svg viewBox="0 0 1000 230" role="img" aria-labelledby="profile-title profile-description">
            <title id="profile-title">Grand Avenue exact planning profile</title>
            <desc id="profile-description">The proposed centerline begins at station zero, Y 68, and rises at stations 38, 112, 187, and 261 to finish at station 298, Y 72.</desc>
            <line x1="72" y1="185" x2="928" y2="185"></line>
            <path d="${profilePath}"></path>
            ${riseMarkers.trimStart()}
            <text x="72" y="213" text-anchor="start">S0 · (1750, 68, -300)</text>
            <text x="928" y="213" text-anchor="end">S298 · (2048, 72, -328)</text>
          </svg>
        </div>
        <div class="stat-grid">
          <div class="stat"><strong>299</strong><span>centerline points</span></div>
          <div class="stat"><strong>8</strong><span>block cross-section</span></div>
          <div class="stat"><strong>6</strong><span>interface dispositions</span></div>
          <div class="stat"><strong>0</strong><span>PassageWay route cells</span></div>
        </div>
        <p class="notice">The PassageWay endpoint is not evidenced, so its proposed route and interaction sets are empty. All 16 future-line wall reference points remain sealed. Exact physical seam cells still require the later G04/G05 audits.</p>
      </div>
    </section>

    <section id="technical">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">Technical development packets</div><h2>Three policies are reviewable; none is technically closed.</h2></div>
          <p>The counts below come directly from the bound packets and R00 audit. Candidate cells are planning derivations, never operations.</p>
        </div>
        <div class="technical-grid">
          <article class="technical-card">
            <span class="eyebrow">D02 · Civil and drainage</span>
            <h3>Hybrid capped-sump basis</h3>
            <p>Ten exact candidates serve the strict-clear low runs; ROAD-LOW-001 stays unserved under a no-build preservation hold.</p>
            <dl>
              <dt>Candidate cells</dt><dd>${formatInteger(d02.selectedClosedDrainageBasis.aggregateCandidateCellManifest.cellCount)}</dd>
              <dt>Capped sumps</dt><dd>${d02.selectedClosedDrainageBasis.selectedSumpCandidates.length}</dd>
              <dt>Open evidence gaps</dt><dd>${d02.acceptanceSummary.openEvidenceGapCount}</dd>
              <dt>Packet HOLDs</dt><dd>${bundle.packetSummary.find((item) => item.scope === 'D02').remainingHoldCount}</dd>
            </dl>
            <code class="identity" title="D02 planning-basis SHA-256">Basis ${shortHash(d02.acceptanceBasisIdentity.sha256)}</code>
          </article>
          <article class="technical-card">
            <span class="eyebrow">D05 · Future mountain</span>
            <h3>FM-01 compact east face</h3>
            <p>The analytic surface and sparse intervals are exact proposals. Canonical materials, support treatment, influence sets, and owners remain absent.</p>
            <dl>
              <dt>Candidate added solids</dt><dd>${formatInteger(d05.selectedFm01PlanningBasis.candidateAddedSolidIntervals.candidateAddedSolidCellCount)}</dd>
              <dt>Support-gap cells</dt><dd>${formatInteger(d05.belowCoordinationSupportGapPlan.exactGap.cellCount)}</dd>
              <dt>Accepted future cells</dt><dd>${d05.selectedFm01PlanningBasis.acceptedFutureCellCount}</dd>
              <dt>Packet HOLDs</dt><dd>${d05HoldCount}</dd>
            </dl>
            <code class="identity" title="D05 acceptance-payload SHA-256">Payload ${shortHash(d05.ownerAcceptanceRecordTemplate.acceptancePayloadSha256)}</code>
          </article>
          <article class="technical-card">
            <span class="eyebrow">D06 · External life safety</span>
            <h3>Fail-closed B07 + Empty Eight</h3>
            <p>West-two avoids recorded structures but crosses current water. Vents, drainage, barriers, egress, fire/service access, power, and controls stay capped or reserved.</p>
            <dl>
              <dt>B07 water cells</dt><dd>${d06.acceptanceCriteria.find((item) => item.id === 'D06-AC-03').currentEvidence.excavationWaterCellCount}</dd>
              <dt>Local vent risers</dt><dd>${d06.acceptanceCriteria.find((item) => item.id === 'D06-AC-05').currentEvidence.exactLocalVentRiserCount}</dd>
              <dt>Criteria PASS / HOLD</dt><dd>${d06PassCount} / ${d06HoldCount}</dd>
              <dt>Commissioned routes</dt><dd>0</dd>
            </dl>
            <code class="identity" title="D06 acceptance-basis SHA-256">Basis ${shortHash(d06.acceptanceBasisSha256)}</code>
          </article>
        </div>
      </div>
    </section>

    <section id="gates">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">R00 design-freeze audit</div><h2>One PASS. Six HOLDs. No release advancement.</h2></div>
          <p>R00 evaluates G01–G07 only. Later G08–G19 evidence is deferred and cannot be used backward to close design decisions.</p>
        </div>
        <div class="table-wrap">
          <table class="gate-table">
            <thead><tr><th>Status</th><th>Gate</th><th>Current result / blockers</th></tr></thead>
            <tbody>${gateRows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section id="next">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">Controlled next sequence</div><h2>Approval removes one human-policy blocker, then exact offline work resumes.</h2></div>
          <p>The order matters because cell ownership and global interface checks cannot be credible until the technical inputs and canonical integer sets exist.</p>
        </div>
        <div class="timeline">
          <article><div><h3>Record this exact bundle acceptance</h3><p>Bind the accepted-by identity, UTC time, bundle file hash, payload hash, and verbatim statement. This can freeze P1-B11; it cannot pass a technical HOLD.</p></div></article>
          <article><div><h3>Capture and audit one complete immutable saved world</h3><p>Include region, entities, POI, and level.dat. The current audit checked 56 copied-save candidates and found zero complete copies.</p></div></article>
          <article><div><h3>Develop D02, D05, and D06 to exact technical identities</h3><p>Resolve drainage capacity and receivers; compile canonical future materials and support treatment; author exact egress, smoke, vent, barrier, power, drainage, fire/service, owner, and interface mechanisms.</p></div></article>
          <article><div><h3>Compile canonical integer sets, ownership, and interfaces</h3><p>Emit exact proposed construction and interaction sets, assign exactly one owner per cell, and run the default-deny global cross-scope interface audit.</p></div></article>
          <article><div><h3>Rerun R00 G01–G07</h3><p>Only an all-PASS audit can move planning toward the separate bounded pilot release. Forward/rollback operations, source guards, authorization, execution, and post-QA remain later gates.</p></div></article>
        </div>
      </div>
    </section>

    <section id="approve">
      <div class="shell">
        <div class="approval">
          <span class="pill pill--hold">Owner record not yet present</span>
          <h2>Copyable acceptance statement</h2>
          <blockquote id="approval-statement">${escapeHtml(bundle.authority.copyableStatement)}</blockquote>
          <p class="notice">Allowed decision: <code>${escapeHtml(bundle.approvalRecordTemplate.allowedDecision)}</code>. Acceptance is limited to the bound planning policy and technical-development checklist.</p>
          <div class="actions screen-only"><button class="button button--primary" type="button" data-copy="#approval-statement">Copy exact statement</button><a class="button" href="phase1-owner-review-bundle.md">Open readable bundle</a><a class="button" href="phase1-owner-review-bundle.json">Open source JSON</a></div>
        </div>
      </div>
    </section>

    <section id="evidence">
      <div class="shell">
        <div class="section-head">
          <div><div class="eyebrow">Evidence identities</div><h2>The four inputs bound by this bundle.</h2></div>
          <p>The complete 64-character hashes are shown for independent review. The bundle payload hash binds these packet identities and accepted limitations.</p>
        </div>
        <div class="table-wrap">
          <table class="evidence-table">
            <thead><tr><th>Scope</th><th>Packet</th><th>File SHA-256</th><th>Bytes</th></tr></thead>
            <tbody>${sourceRows}</tbody>
          </table>
        </div>
        <p><a href="phase1-r00-readiness-audit.md">Readable R00 audit</a> · <a href="phase1-r00-readiness-audit.json">R00 source JSON</a> · <a href="README.md">Combined Zones evidence index</a> · <a href="../current-masterplan.html">Current master plan report</a></p>
      </div>
    </section>
  </main>

  <footer>
    <div class="shell">
      <p>Generated from committed, offline evidence dated <time datetime="${escapeHtml(bundle.generatedAtUtc)}">${escapeHtml(bundle.generatedAtUtc)}</time>. Bundle payload SHA-256 <code>${escapeHtml(bundle.authority.bundlePayloadSha256)}</code>.</p>
      <p>No live calls, database writes, Minecraft operations, construction cells, material cells, or world edits were performed or authorized by this report.</p>
    </div>
  </footer>

  <script>
    for (const button of document.querySelectorAll('[data-copy]')) {
      button.addEventListener('click', async () => {
        const target = document.querySelector(button.dataset.copy);
        if (!target) return;
        const original = button.textContent;
        try {
          await navigator.clipboard.writeText(target.textContent.trim());
          button.textContent = 'Copied';
        } catch {
          const range = document.createRange();
          range.selectNodeContents(target);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          button.textContent = 'Selected — copy manually';
        }
        window.setTimeout(() => { button.textContent = original; }, 2200);
      });
    }
  </script>
</body>
</html>
`;

writeFileSync(outputPath, html);
console.log(`Wrote ${relative(repositoryRoot, outputPath)} (${Buffer.byteLength(html)} bytes)`);
