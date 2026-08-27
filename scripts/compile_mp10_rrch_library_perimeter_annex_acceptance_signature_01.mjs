#!/usr/bin/env node
/**
 * CIRC-RRCH-LIB-02 perimeter/annex bilateral acceptance-signature gate.
 *
 * A completed signature is a source-bound design input only. This program
 * does not inspect a live world, select cells, emit operations, or grant
 * release authority. It rejects partial fixture inventories, placeholders,
 * missing return proof, missing bilateral interface acceptance, and unbound
 * forward/rollback state commitments.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const isHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const named = (value) => typeof value === 'string' && value.trim().length >= 3
  && !/^(ASSIGN|TBD|TODO|UNKNOWN|UNASSIGNED|COPY_|OWNER_|NONE$)/i.test(value.trim());
const sameKeys = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
const integerPoint = (point) => object(point) && Number.isInteger(point.x)
  && Number.isInteger(point.y) && Number.isInteger(point.z);
const pointKey = (point) => `${point.x},${point.y},${point.z}`;
const fixtureKey = (fixture) => `${fixture.id}@${pointKey(fixture.cell)}`;

const CONTRACT = option('--contract', 'data/world-review/mp10-rrch-library-perimeter-annex-contract-02-mp01-anvil-post-20260826T163300Z/mp10-rrch-library-perimeter-annex-acceptance-contract-02.json');
const SIGNATURE = option('--signature', 'docs/masterplans/10-ravensreach/MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp10-rrch-library-perimeter-annex-acceptance-decision-01-mp01-anvil-post-20260826T163300Z/mp10-rrch-library-perimeter-annex-acceptance-decision.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const readBytes = (filename) => fs.readFileSync(abs(filename));
const contractBytes = readBytes(CONTRACT);
let contract = null;
let signature = null;
let signatureBytes = null;
const errors = [];
try { contract = JSON.parse(contractBytes); } catch { errors.push('governing contract is not valid JSON'); }
try {
  signatureBytes = fs.existsSync(abs(SIGNATURE)) ? readBytes(SIGNATURE) : null;
  signature = signatureBytes ? JSON.parse(signatureBytes) : null;
} catch { errors.push('signature file is not valid JSON'); }

const validContract = object(contract)
  && contract.id === 'CIRC-RRCH-LIB-02-PERIMETER-ANNEX-VERTICAL-ACCEPTANCE-01'
  && contract.status === 'HOLD_AWAITING_PERIMETER_ANNEX_VERTICAL_ACCEPTANCE'
  && contract.mutationAuthority === false
  && isHash(contract.identitySha256)
  && object(contract.source)
  && isHash(contract.source.captureManifestSha256)
  && isHash(contract.source.libraryRegionSha256)
  && object(contract.protectedInterior)
  && Array.isArray(contract.protectedInterior.protectedBlockEntities)
  && contract.protectedInterior.protectedBlockEntities.length === 72
  && object(contract.eastLibraryLoggiaSeam)
  && isHash(contract.eastLibraryLoggiaSeam.coordinateSetSha256)
  && isHash(contract.eastLibraryLoggiaSeam.sourceStateSha256);
if (!validContract) errors.push('governing MP10 contract is malformed, unauthorized, or lacks its exact source-bound library/fixture/seam inventory');

const expectedFixtures = Array.isArray(contract?.protectedInterior?.protectedBlockEntities)
  ? contract.protectedInterior.protectedBlockEntities : [];
const expectedFixtureKeys = expectedFixtures.map(fixtureKey).sort();
const fixtureInventorySha256 = sha256(`${expectedFixtureKeys.join('\n')}\n`);
const expectedRoles = ['library', 'annexReceiver', 'loggia'];
const commitmentFields = ['targetStateSetSha256', 'retainedStateSetSha256', 'rollbackStateSetSha256'];

if (!object(signature)) {
  errors.push('signature file is missing or malformed');
} else {
  if (signature.schemaVersion !== 1 || signature.id !== 'MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-SIGNATURE-01') errors.push('wrong signature schema or identifier');
  if (signature.contractIdentitySha256 !== contract?.identitySha256) errors.push('signature contract identity does not match the governing MP10 contract');
  if (signature.governingContractSha256 !== sha256(contractBytes)) errors.push('signature does not bind the exact governing-contract file');
  for (const field of ['snapshot', 'captureId', 'captureManifestSha256', 'libraryRegionSha256']) {
    if (signature.source?.[field] !== contract?.source?.[field]) errors.push(`signature source.${field} does not exactly match the contract source`);
  }

  const owners = signature.namedOwners;
  if (!object(owners) || !sameKeys(Object.keys(owners ?? {}), expectedRoles)) {
    errors.push('signature needs all and only named library, annex/receiver, and loggia owner roles');
  } else {
    for (const role of expectedRoles) if (!named(owners[role])) errors.push(`owner ${role} is missing or a placeholder`);
    if (new Set(expectedRoles.map((role) => owners[role])).size !== expectedRoles.length) errors.push('library, annex/receiver, and loggia require distinct named owners');
  }

  const design = signature.design;
  if (!object(design)) {
    errors.push('signature lacks the exact perimeter/annex design binding');
  } else {
    for (const field of ['targetCoordinateSetSha256', 'interactionHaloCoordinateSetSha256', 'targetSourceStateSetSha256', 'targetStateSetSha256', 'rollbackStateSetSha256']) {
      if (!isHash(design[field])) errors.push(`design lacks ${field}`);
    }
    if (!Number.isInteger(design.targetCellCount) || design.targetCellCount < 1) errors.push('design targetCellCount must be a positive exact count');
    if (!Number.isInteger(design.interactionHaloCellCount) || design.interactionHaloCellCount < design.targetCellCount) errors.push('design interaction halo must be an exact non-smaller count');
    if (design.completeCanonicalBlockStates !== true) errors.push('design does not commit complete canonical block states');
    if (design.exactForwardRollbackInverseVerified !== true) errors.push('design does not commit exact forward/rollback inversion');
    if (design.noUnlistedContainersOrBlockEntities !== true) errors.push('design does not exclude unlisted containers/block entities');
    if (design.seamInteraction !== 'TOUCHES_IF-RRCH-LIBRARY-LOGGIA') errors.push('gate requires an explicit bilateral Library/Loggia seam interaction classification; no inferred seam bypass is accepted');
  }

  const fixturePlan = signature.fixtureMigration;
  if (!object(fixturePlan)) {
    errors.push('signature lacks a complete fixture retention/migration plan');
  } else {
    if (fixturePlan.sourceFixtureInventorySha256 !== fixtureInventorySha256) errors.push('fixture plan does not bind the exact 72-fixture source inventory');
    if (fixturePlan.fixtureCount !== expectedFixtures.length) errors.push('fixture plan count does not equal the protected 72-fixture inventory');
    if (fixturePlan.completeInventoryListed !== true || fixturePlan.noFixtureLossOrDuplication !== true || fixturePlan.exactForwardRollbackInverseVerified !== true) errors.push('fixture plan lacks complete inventory/no-loss/exact-inverse commitment');
    for (const field of commitmentFields) if (!isHash(fixturePlan[field])) errors.push(`fixture plan lacks ${field}`);
    const entries = fixturePlan.entries;
    if (!Array.isArray(entries) || entries.length !== expectedFixtures.length) {
      errors.push('fixture plan must list every protected source fixture exactly once');
    } else {
      const suppliedKeys = entries.filter(object).map((entry) => `${entry.id}@${pointKey(entry.sourceCell ?? {})}`).sort();
      if (JSON.stringify(suppliedKeys) !== JSON.stringify(expectedFixtureKeys)) errors.push('fixture plan source fixtures do not exactly match the protected source inventory');
      const destinations = new Set();
      for (const entry of entries) {
        if (!object(entry) || !integerPoint(entry.sourceCell) || !integerPoint(entry.destinationCell)) { errors.push('fixture plan has a non-exact source or destination cell'); continue; }
        if (!['RETAIN_IN_PLACE', 'MIGRATE_EXACT'].includes(entry.disposition)) errors.push('fixture plan uses an invalid fixture disposition');
        if (entry.disposition === 'RETAIN_IN_PLACE' && pointKey(entry.sourceCell) !== pointKey(entry.destinationCell)) errors.push('retained fixture destination must equal its source cell');
        if (entry.disposition === 'MIGRATE_EXACT' && pointKey(entry.sourceCell) === pointKey(entry.destinationCell)) errors.push('migrated fixture destination must differ from its source cell');
        if (destinations.has(pointKey(entry.destinationCell))) errors.push('fixture plan duplicates a destination cell');
        destinations.add(pointKey(entry.destinationCell));
        for (const field of ['sourceFixtureStateSha256', 'targetFixtureStateSha256', 'rollbackFixtureStateSha256']) if (!isHash(entry[field])) errors.push(`fixture ${entry.id ?? 'unknown'} lacks ${field}`);
      }
    }
  }

  const interfaceAcceptance = signature.bilateralLibraryLoggiaInterface;
  if (!object(interfaceAcceptance)) {
    errors.push('signature lacks bilateral Library/Loggia interface acceptance');
  } else {
    if (interfaceAcceptance.id !== 'IF-RRCH-LIBRARY-LOGGIA') errors.push('wrong Library/Loggia interface identifier');
    if (interfaceAcceptance.libraryOwner !== owners?.library || interfaceAcceptance.loggiaOwner !== owners?.loggia) errors.push('bilateral interface must be accepted by the named library and loggia owners');
    if (interfaceAcceptance.seamCoordinateSetSha256 !== contract?.eastLibraryLoggiaSeam?.coordinateSetSha256) errors.push('bilateral interface has the wrong exact seam coordinate set');
    if (interfaceAcceptance.seamSourceStateSha256 !== contract?.eastLibraryLoggiaSeam?.sourceStateSha256) errors.push('bilateral interface has the wrong source seam state');
    if (interfaceAcceptance.exactThresholdBehaviorAccepted !== true || interfaceAcceptance.rollbackOwnershipAccepted !== true) errors.push('bilateral interface lacks exact threshold and rollback-ownership acceptance');
  }

  const route = signature.routeAndReturn;
  if (!object(route)) {
    errors.push('signature lacks landing and bidirectional return proof');
  } else {
    if (!Array.isArray(route.transitionLandings) || route.transitionLandings.length !== 5) errors.push('route needs exactly five transition-landing commitments');
    else {
      const levels = route.transitionLandings.map((item) => item?.floorY).sort((a, b) => a - b);
      if (JSON.stringify(levels) !== JSON.stringify([46, 54, 62, 70, 78])) errors.push('route transition landing levels do not match the five required library levels');
      for (const landing of route.transitionLandings) {
        if (!object(landing) || !isHash(landing.footingCoordinateSetSha256) || !isHash(landing.bodyHeadClearanceStateSha256)
          || landing.threeByThreeFootingWithTwoClear !== true) errors.push('each transition landing needs exact 3x3 footing and two-clear body/head evidence');
      }
    }
    if (!isHash(route.bidirectionalNormalWalkProofSha256) || route.noJumpBidirectionalVerified !== true) errors.push('route lacks exact bidirectional no-jump normal-walk proof');
    if (!integerPoint(route.libraryReturnAnchor) || !named(route.libraryReturnAnchor?.label)) errors.push('route lacks a named exact library return anchor');
    if (!integerPoint(route.annexReceiverReturnAnchor) || !named(route.annexReceiverReturnAnchor?.label)) errors.push('route lacks a named exact annex/receiver return anchor');
  }
}

const accepted = errors.length === 0;
const decisionBase = {
  schemaVersion: 1,
  id: 'MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_DESIGN_INPUT_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION',
  mutationAuthority: false,
  safetyBoundary: { liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  governingContract: { path: rel(CONTRACT), sha256: sha256(contractBytes), contractIdentitySha256: contract?.identitySha256 ?? null, protectedFixtureInventorySha256: fixtureInventorySha256 },
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? { kind: 'BILATERAL_LIBRARY_LOGGIA_PERIMETER_ANNEX_DESIGN_INPUT_ONLY', ownerRoles: expectedRoles, nextStep: 'A separately invoked compiler must renew this decision against a fresh complete immutable source and pass the full guarded-release kernel before it can emit a static operation. This decision grants no build, RCON, route-opening, public, service, or accessibility authority.' } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: ['No world operation, rollback operation, release manifest, or mutation authority is emitted.', 'An accepted design input expires when the contract or source binding changes.', 'This gate never selects a footprint, infers a route, omits a protected fixture, or turns a seam into a unilateral boundary.'],
};
const decision = { ...decisionBase, decisionIdentitySha256: sha256(`${JSON.stringify(decisionBase, null, 2)}\n`) };
const output = abs(OUT);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(decision, null, 2)}\n`);
const markdown = `# MP10 perimeter / annex bilateral acceptance decision\n\n**Status:** \`${decision.status}\`  \n**Authority:** \`mutationAuthority: false\`; this validates design input only.\n\n![MP10 acceptance gate](MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-GATE-01.svg)\n\nThe decision is bound to contract \`${decision.governingContract.contractIdentitySha256 ?? 'invalid'}\`, its exact 72-fixture inventory \`${fixtureInventorySha256}\`, and the Library/Loggia seam source state. It emits no build operation.\n\n${accepted ? 'All named bilateral owner, fixture, state, landing, and bidirectional return commitments are present. A fresh source and complete guarded-release kernel remain mandatory before any separate compiler may produce operations.' : `The supplied signature is rejected and default-deny.\n\n## Rejection reasons\n\n${errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`}\n`;
const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="440" viewBox="0 0 1120 440" role="img" aria-labelledby="title desc"><title id="title">MP10 perimeter annex bilateral acceptance gate</title><desc id="desc">Source-bound decision gate with complete fixture migration, bilateral seam acceptance, and route return requirements.</desc><style>.t{font:700 24px system-ui,sans-serif;fill:#f4f7fb}.s{font:14px system-ui,sans-serif;fill:#c8d6e5}.b{font:700 14px system-ui,sans-serif;fill:#f4f7fb}</style><rect width="1120" height="440" fill="#07131e"/><text x="38" y="43" class="t">MP10 / Ravensreach library perimeter-annex acceptance gate</text><text x="38" y="69" class="s">source contract ${String(decision.governingContract.contractIdentitySha256 ?? 'invalid').slice(0, 16)}… · decision: ${decision.status}</text><rect x="52" y="118" width="230" height="148" rx="12" fill="#173e51" stroke="#67bbd5"/><text x="72" y="151" class="b">1 · Library owner</text><text x="72" y="180" class="s">exact target + halo</text><text x="72" y="204" class="s">forward / rollback states</text><text x="72" y="228" class="s">72-fixture inventory</text><rect x="445" y="118" width="230" height="148" rx="12" fill="#3a2d52" stroke="#cda8ff"/><text x="465" y="151" class="b">2 · Bilateral seam</text><text x="465" y="180" class="s">Library + Loggia owners</text><text x="465" y="204" class="s">exact threshold / rollback</text><text x="465" y="228" class="s">no inferred bypass</text><rect x="838" y="118" width="230" height="148" rx="12" fill="#25463a" stroke="#75d69e"/><text x="858" y="151" class="b">3 · Annex / receiver</text><text x="858" y="180" class="s">five 3×3 landings</text><text x="858" y="204" class="s">no-jump bidirectional proof</text><text x="858" y="228" class="s">exact return anchors</text><path d="M282 192H445M675 192H838" stroke="#f2c94c" stroke-width="4" marker-end="url(#a)"/><defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#f2c94c"/></marker></defs><rect x="52" y="319" width="1016" height="65" rx="12" fill="#392522" stroke="#ff725c"/><text x="74" y="349" class="b">${accepted ? 'Accepted design input only — fresh source and guarded-release kernel still required.' : 'Rejected / default-deny — no footprint, operation, or mutation authority.'}</text><text x="74" y="373" class="s">The gate emits only this evidence decision; it cannot connect to Minecraft, RCON, or a release runner.</text></svg>\n`;
fs.writeFileSync(`${output}.md`, markdown);
fs.writeFileSync(path.join(path.dirname(output), 'MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-GATE-01.svg'), svg);
console.log(`${decision.status}: ${rel(OUT)}`);
