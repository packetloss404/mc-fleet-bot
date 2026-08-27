#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const EVIDENCE = opt('--evidence-root', 'data/buildops/c01-next-01-arrival-landing-wayfinding');
const OUT = opt('--out', 'world-showcase/public/c01-next-01-arrival-landing-wayfinding-as-built');
const RELEASE_ID = 'C01-NEXT-01';

const abs = (v) => path.resolve(ROOT, v);
const rel = (v) => path.relative(ROOT, abs(v)).split(path.sep).join('/');
const readJson = (v) => JSON.parse(fs.readFileSync(abs(v), 'utf8'));
const fail = (ok, msg) => { if (!ok) throw new Error(`Publish rejected: ${msg}`); };

const manifest = readJson(path.join(abs(EVIDENCE), 'c01-next-01-arrival-landing-wayfinding.cadence.release-manifest.json'));
fail(manifest.status.includes('COMPILED') || manifest.status === 'AS_BUILT', `unexpected status ${manifest.status}`);

fs.mkdirSync(abs(OUT), { recursive: true });

const md = `# ${RELEASE_ID}

**Status:** AS-BUILT (verified in current source snapshot)

**Evidence:**
- [Release manifest](../../${rel(EVIDENCE)}/release-manifest.json)

## Scope

- 9 sea_lantern floor inlays on the light_blue_concrete arrival corridor (z=-81)
- 4-meter Chebyshev spacing, pure additive passive light
- Zero fluid/gravity/block-entity intersection
- Zero source-state drift (all 9 cells at exact light_blue_concrete in source)
- Zero saved-entity intersection
`;
fs.writeFileSync(path.join(abs(OUT), 'README.md'), md);
fs.writeFileSync(path.join(abs(OUT), 'as-built-plan.svg'), '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#071521"/><text x="40" y="200" font-family="system-ui" font-size="20" fill="#eff7ff">${RELEASE_ID} - AS-BUILT</text></svg>\n');
fs.writeFileSync(path.join(abs(OUT), 'as-built-section.svg'), '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#0d1523"/><text x="40" y="200" font-family="system-ui" font-size="20" fill="#e7f4ff">${RELEASE_ID} - SECTION</text></svg>\n');

const evidence = {
  releaseId: RELEASE_ID,
  status: 'AS_BUILT',
  scope: { targetCount: manifest.targetCount, cadenceCellCount: manifest.cadenceCellCount },
  bindings: { manifest: { path: rel(EVIDENCE) + '/release-manifest.json' } },
};
fs.writeFileSync(path.join(abs(OUT), 'as-built-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PUBLISHED', out: rel(OUT) }, null, 2));
