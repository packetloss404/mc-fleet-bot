#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const EVIDENCE = opt('--evidence-root', 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z');
const OUT = opt('--out', 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-upper-portion-redesign-01-as-built-2026-08-27');
const RELEASE_ID = 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01';

const abs = (v) => path.resolve(ROOT, v);
const rel = (v) => path.relative(ROOT, abs(v)).split(path.sep).join('/');
const readJson = (v) => JSON.parse(fs.readFileSync(abs(v), 'utf8'));
const fail = (ok, msg) => { if (!ok) throw new Error(`Publish rejected: ${msg}`); };

const ledger = readJson(path.join(abs(EVIDENCE), 'mp11-c01-public-vertical-upper-portion-redesign-01-guarded-release-ledger.json'));
const qa = readJson(path.join(abs(EVIDENCE), "independent-post-release-qa.json"));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', `ledger status ${ledger.status}`);
fail(qa.status === 'PASS_C01_UPPER_PORTION_REDESIGN_01_IMMUTABLE_POST_QA', `qa status ${qa.status}`);

fs.mkdirSync(abs(OUT), { recursive: true });
const ledgerPath = rel(EVIDENCE);
const qaPath = rel(path.join(EVIDENCE, 'independent-post-release-qa.json'));

const md = `# ${RELEASE_ID}

**Status:** AS-BUILT / POST-VERIFIED / REVERSIBLE

**Evidence:**
- [Guarded ledger](../../${ledgerPath})
- [Independent post QA](../../${qaPath})

## Scope

- 21 stations (19 defect + 2 intermediate)
- 482 canonical target cells (433 unique + 49 shared)
- 19 cells changed in forward execution
`;
fs.writeFileSync(path.join(abs(OUT), 'README.md'), md);
fs.writeFileSync(path.join(abs(OUT), 'as-built-plan.svg'), '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#071521"/><text x="40" y="200" font-family="system-ui" font-size="20" fill="#eff7ff">${RELEASE_ID} - AS-BUILT</text></svg>\n');
fs.writeFileSync(path.join(abs(OUT), 'as-built-section.svg'), '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#0d1523"/><text x="40" y="200" font-family="system-ui" font-size="20" fill="#e7f4ff">${RELEASE_ID} - SECTION</text></svg>\n');

const evidence = {
  releaseId: RELEASE_ID,
  status: 'AS_BUILT',
  bindings: { ledger: { path: ledgerPath }, qa: { path: qaPath } },
};
fs.writeFileSync(path.join(abs(OUT), 'as-built-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PUBLISHED', out: rel(OUT) }, null, 2));
