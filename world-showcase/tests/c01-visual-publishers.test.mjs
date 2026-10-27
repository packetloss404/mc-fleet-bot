import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertPublishableAssets,
  publishC01AsBuiltVisuals,
} from '../../scripts/lib/c01_as_built_visual_publisher.mjs';

const RELEASE_ID = 'SYNTHETIC-C01-RELEASE';
const QA_STATUS = 'PASS_SYNTHETIC_IMMUTABLE_POST_QA';
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture({ targetCount = 3 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-visual-publisher-'));
  const manifestPath = path.join(root, 'manifest.json');
  const qaPath = path.join(root, 'qa.json');
  const ledgerPath = path.join(root, 'ledger.json');
  const targets = Array.from({ length: targetCount }, (_, index) => ({
    point: [100 + index, 40 + index, -50 + index],
    targetState: index === 0 ? 'minecraft:polished_blackstone_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]' : 'minecraft:air',
    role: index === 0 ? 'five-wide-tread' : 'five-clear-high-envelope',
  }));

  writeJson(manifestPath, {
    id: RELEASE_ID,
    status: 'OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL',
    mutationAuthority: false,
    scope: { stations: [[100, 40, -50], [101, 41, -50]], totalDesignCellCount: Math.max(3, targetCount) },
    operations: { forward: { commandCount: Math.max(1, Math.min(2, targetCount)) } },
    canonicalStates: { target: targets },
  });
  writeJson(qaPath, {
    id: `${RELEASE_ID}-INDEPENDENT-POST-QA`,
    status: QA_STATUS,
    readOnly: true,
    worldMutated: false,
    bindings: { manifest: { path: manifestPath, sha256: sha(manifestPath) } },
    postSnapshot: { root: 'synthetic-post' },
    checks: { canonicalPostStates: { passed: true }, route: { passed: true } },
  });
  writeJson(ledgerPath, {
    releaseId: RELEASE_ID,
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    postSnapshot: { root: 'synthetic-post' },
    independentPostQa: { path: qaPath, sha256: sha(qaPath) },
  });

  const config = {
    root,
    releaseId: RELEASE_ID,
    title: 'Synthetic C01 release',
    generatedAtUtc: '2026-10-27T00:00:00Z',
    ledger: ledgerPath,
    qa: qaPath,
    manifest: manifestPath,
    output: path.join(root, 'published'),
    qaStatus: QA_STATUS,
    stations: (manifest) => manifest.scope.stations,
    scope: (manifest, canonicalTargets, changedCount, stations) => ({
      canonicalTargetCount: canonicalTargets.length,
      changedCount,
      stationCount: stations.length,
      totalDesignCellCount: manifest.scope.totalDesignCellCount,
    }),
    summary: 'Synthetic finite geometry used only to test evidence-bound publication behavior.',
    nonClaims: ['No live world operation or commissioning claim.'],
  };

  return { root, manifestPath, qaPath, ledgerPath, config };
}

test('publishes finite coordinate plots with nonzero target and station counts', () => {
  const item = fixture();
  try {
    const result = publishC01AsBuiltVisuals(item.config);
    assert.equal(result.scope.canonicalTargetCount, 3);
    assert.equal(result.scope.changedCount, 2);
    assert.equal(result.scope.stationCount, 2);

    const publication = JSON.parse(fs.readFileSync(path.join(item.config.output, 'publication-manifest.json'), 'utf8'));
    assert.equal(publication.evidence.ledgerQaBindingMode, 'terminal-ledger-binding');
    assert.equal(publication.assets.length, 4);

    for (const name of ['as-built-plan.svg', 'as-built-section.svg']) {
      const svg = fs.readFileSync(path.join(item.config.output, name), 'utf8');
      assert.match(svg, /data-target-count="3"/);
      assert.match(svg, /data-station-count="2"/);
      assert.doesNotMatch(svg, /\$\{/);
      assert.match(svg, /<title>five-/);
    }

    const plan = fs.readFileSync(path.join(item.config.output, 'as-built-plan.svg'), 'utf8');
    assert.match(plan, /PLAN · north \(-Z\) ↑ · east \(\+X\) →/);
    const northY = Number(plan.match(/<rect[^>]+y="([0-9.]+)"[^>]*><title>[^<]*100,40,-50/)[1]);
    const southY = Number(plan.match(/<rect[^>]+y="([0-9.]+)"[^>]*><title>[^<]*102,42,-48/)[1]);
    assert.ok(northY < southY, `north/lower Z must plot above south/higher Z: ${northY} !< ${southY}`);

    const section = fs.readFileSync(path.join(item.config.output, 'as-built-section.svg'), 'utf8');
    assert.match(section, /SECTION · elevation \(\+Y\) ↑ · east \(\+X\) →/);
  } finally {
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('rejects a drifted QA-to-manifest hash before creating output', () => {
  const item = fixture();
  try {
    fs.appendFileSync(item.manifestPath, '\n');
    assert.throws(() => publishC01AsBuiltVisuals(item.config), /QA manifest hash drift/);
    assert.equal(fs.existsSync(item.config.output), false);
  } finally {
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('rejects zero canonical targets before creating output', () => {
  const item = fixture({ targetCount: 0 });
  try {
    assert.throws(() => publishC01AsBuiltVisuals(item.config), /zero canonical targets/);
    assert.equal(fs.existsSync(item.config.output), false);
  } finally {
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('rejects unresolved SVG placeholders', () => {
  const placeholder = `<?xml version="1.0"?><svg data-target-count="1"><title>plot</title><rect width="20" height="20"/><text>${'${RELEASE_ID}'}</text>${' '.repeat(600)}</svg>`;
  assert.throws(
    () => assertPublishableAssets(new Map([['as-built-plan.svg', placeholder]])),
    /unresolved template placeholder/,
  );
});
