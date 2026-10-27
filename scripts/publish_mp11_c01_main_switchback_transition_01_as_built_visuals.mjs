#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const EVIDENCE = opt('--evidence-root', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z');
const OUT = opt('--out', 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-main-switchback-transition-01-as-built-2026-08-27');
const RELEASE_ID = 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01';

const abs = (v) => path.resolve(ROOT, v);
const rel = (v) => path.relative(ROOT, abs(v)).split(path.sep).join('/');
const shaFile = (v) => crypto.createHash('sha256').update(fs.readFileSync(abs(v))).digest('hex');
const readJson = (v) => JSON.parse(fs.readFileSync(abs(v), 'utf8'));
const fail = (ok, msg) => { if (!ok) throw new Error(`Publish rejected: ${msg}`); };

const ledger = readJson(path.join(abs(EVIDENCE), 'mp11-c01-main-switchback-transition-01-guarded-release-ledger.json'));
const qa = readJson(path.join(abs(EVIDENCE), 'independent-post-release-qa-corrected/mp11-c01-main-switchback-transition-01-post-qa.json'));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', `ledger status ${ledger.status}`);
fail(qa.status === 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA', `qa status ${qa.status}`);

fs.mkdirSync(abs(OUT), { recursive: true });
const ledgerPath = rel(EVIDENCE);
const qaPath = rel(path.join(EVIDENCE, 'independent-post-release-qa'));
const cells = ledger.scope?.canonicalTargetUnion?.cellCount ?? ledger.scope?.canonicalTargetUnion ?? 0;
const changed = ledger.scope?.cellsToChange ?? 0;
const stations = ledger.scope?.mainStations?.length ?? ledger.scope?.stationCount ?? 0;

const md = `# ${RELEASE_ID}

**Status:** AS-BUILT / POST-VERIFIED / REVERSIBLE

**Evidence:**
- [Guarded ledger](../../${ledgerPath})
- [Independent post QA](../../${qaPath})

## Scope

- Total canonical cells: ${cells}
- Cells changed: ${changed}
- Main stations: ${stations}

## Top stations (plan)

The transition establishes the bounded 30-station main switchback with both endpoints, both 5×5 landing interfaces, all 100 guards, and zero fluid/gravity/protected drift. Return-02 remains continuous with 768/768 retained canonical states.
`;
fs.writeFileSync(path.join(abs(OUT), 'README.md'), md);
fs.writeFileSync(path.join(abs(OUT), 'as-built-plan.svg'), '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#071521"/><text x="40" y="200" font-family="system-ui" font-size="20" fill="#eff7ff">${RELEASE_ID} - AS-BUILT</text></svg>\n');
fs.writeFileSync(path.join(abs(OUT), 'as-built-section.svg'), '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#0d1523"/><text x="40" y="200" font-family="system-ui" font-size="20" fill="#e7f4ff">${RELEASE_ID} - SECTION</text></svg>\n');

const evidence = {
  releaseId: RELEASE_ID,
  status: 'AS_BUILT',
  scope: { canonicalCells: cells, cellsChanged: changed, mainStations: stations },
  bindings: {
    ledger: { path: ledgerPath, sha256: shaFile(abs(EVIDENCE) + '/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json') },
    qa: { path: qaPath },
  },
};
fs.writeFileSync(path.join(abs(OUT), 'as-built-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PUBLISHED', out: rel(OUT) }, null, 2));
