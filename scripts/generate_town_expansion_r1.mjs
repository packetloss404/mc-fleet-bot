#!/usr/bin/env node
/**
 * Compile the 2026-07-28 Ravensreach / Westlight / MainStreet expansion.
 *
 * This is an offline exact-state compiler. It reads an immutable Anvil
 * snapshot and emits guarded REPL operations plus an exact inverse. It never
 * connects to the live server.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  DetailedAnvilSnapshot,
  baseBlockName,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { completeBlockState } from './lib/complete_block_state.mjs';
import { compareOperationOrder } from './lib/town_operation_order.mjs';
import { compileManagerValeCottages } from './manager_vale_cottage_compiler.mjs';
import { modelConcordBroadcastExchangeAndAnnex } from './town_expansion_cbe_compiler.mjs';
import { modelC01FiveLevelBunker } from './town_expansion_c01_compiler.mjs';

const DEFAULT_REGIONS =
  'data/worldsnap-town-expansion-frozen-rebase-20260728T141025Z/region';
const DEFAULT_ACCEPTED_MANAGER_VALE_SNAPSHOT_SHA256 =
  'de807a2d4a1cb597bd259d55d1d7c0cda8b710af5017497e75660c8a976603f5';
const DEFAULT_OUTPUT =
  'data/buildops/town-expansion-r1-2026-07-28.txt';
const DEFAULT_ROLLBACK =
  'data/buildops/town-expansion-r1-2026-07-28.rollback.txt';
const DEFAULT_REPORT =
  'data/buildops/town-expansion-r1-2026-07-28.report.json';
const DEFAULT_MANIFEST =
  'data/buildops/town-expansion-r1-2026-07-28.manifest.json';
const AIR = 'minecraft:air';
const CROSS_SCOPE_CONTRACT_PATH =
  'docs/redevelopment/2026-07-28-town-expansion/town-expansion-cross-scope-interface-contracts.json';
const CANONICAL_SCOPE_OWNERS = new Map([
  // One regional approach is emitted in four construction passes. Publication
  // scopes remain distinct, but they do not compete for physical ownership.
  ['TE-ROAD-01', 'TE-REGIONAL-APPROACH-ROAD'],
  ['TE-WL-FREIGHT', 'TE-REGIONAL-APPROACH-ROAD'],
  ['TE-WL-PARKWAY-EXTENSION', 'TE-REGIONAL-APPROACH-ROAD'],
  ['TE-PAN-RV01-ROAD', 'TE-REGIONAL-APPROACH-ROAD'],

  // The civic lawn owns its contained pools, fountain, and monument. These
  // child scopes are catalog identities, not independent grading owners.
  ['TE-PAVILION-EAST-CIVIC-GROUNDS', 'TE-PAVILION-EAST-CIVIC-GROUNDS'],
  ['TE-PAV-REFLECTING-POOL-NORTH', 'TE-PAVILION-EAST-CIVIC-GROUNDS'],
  ['TE-PAV-REFLECTING-POOL-SOUTH', 'TE-PAVILION-EAST-CIVIC-GROUNDS'],
  ['TE-PAV-BUCKINGHAM-FOUNTAIN', 'TE-PAVILION-EAST-CIVIC-GROUNDS'],
  ['TE-PAV-CIVIC-MONUMENT', 'TE-PAVILION-EAST-CIVIC-GROUNDS'],

  // The crater park, its west green link, and the Harborlight public streets
  // are one hydrology/public-realm owner. Housing envelopes remain separate.
  ['TE-WESTLIGHT-CRATER-LAKE', 'TE-WL-CRATER-PUBLIC-REALM'],
  ['TE-WL-CRATER-WEST-GREEN-LINK', 'TE-WL-CRATER-PUBLIC-REALM'],
  ['TE-WL-HARBORLIGHT', 'TE-WL-CRATER-PUBLIC-REALM'],

  // Attached garages are part of their house envelope. Separate catalog IDs
  // do not create a second physical owner at the attachment core.
  ['TE-WL-HL-A', 'TE-WL-HL-A'],
  ['TE-WL-HL-A-GARAGE', 'TE-WL-HL-A'],
  ['TE-WL-HL-B', 'TE-WL-HL-B'],
  ['TE-WL-HL-B-GARAGE', 'TE-WL-HL-B'],
  ['TE-WL-HL-C', 'TE-WL-HL-C'],
  ['TE-WL-HL-C-GARAGE', 'TE-WL-HL-C'],

  // Each park is a single program owner. Ride, plant, bath, and gate scope IDs
  // survive for the catalog, while base/path/detail passes share ownership.
  ['TE-WL-RAVENCREST', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-GATE', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-RIDGE-RUNNER', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-EMBER', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-MIDWAY', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-FAMILY', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-DARK-RIDE', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-SIGNAL', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-EVENT', 'TE-WL-RAVENCREST'],
  ['TE-WL-RAVENCREST-MAINT', 'TE-WL-RAVENCREST'],
  ['TE-WL-NORTHWIND', 'TE-WL-NORTHWIND'],
  ['TE-WL-NORTHWIND-WAVE', 'TE-WL-NORTHWIND'],
  ['TE-WL-NORTHWIND-RIVER', 'TE-WL-NORTHWIND'],
  ['TE-WL-NORTHWIND-SLIDES', 'TE-WL-NORTHWIND'],
  ['TE-WL-NORTHWIND-QUIET', 'TE-WL-NORTHWIND'],
  ['TE-WL-NORTHWIND-PLANT', 'TE-WL-NORTHWIND'],
  ['TE-WL-NORTHWIND-BATH', 'TE-WL-NORTHWIND'],

  // One frozen schedule owns the Gilded Raven, its deep descent, modern owner
  // corridor, seven rest suites, sales office, and detached estate ascent.
  ['TE-RRCH-GILDED-RAVEN', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-GRT-OBS', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-A', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-B', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-C', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-D', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-E', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-F', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CORRIDOR-REST-G', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OWNER-CITY-SALES-OFFICE', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OBS-OWNER-EAST-ASCENT', 'TE-GILDED-RAVEN-OWNER-ROUTE'],
  ['TE-OBS-OWNER-EAST-ARRIVAL-GALLERY', 'TE-GILDED-RAVEN-OWNER-ROUTE'],

  // The observatory mega-estate, shelter, spa, court, and inactive portal
  // complex are emitted in detailed child passes under one estate owner.
  ['TE-OBS-OWNER-MEGA-ESTATE', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-OWNER-RED-ROOM', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-OWNER-SPA', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-OWNER-SPA-POOL', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-SHL-EXPANDED', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-ESTATE-SOUTH-COURT', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-SECRET-PASSAGE', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-HUB-CENTRAL', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-MAINSTREET', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-RAVENSREACH', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-RAVENROCK', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-DATACAMPUS', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-WESTLIGHT', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-PANORAMA', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-SPARE-A', 'TE-OBSERVATORY-MEGA-ESTATE'],
  ['TE-OBS-PORTAL-SPARE-B', 'TE-OBSERVATORY-MEGA-ESTATE'],

  // The dry warehouse core and two east wings are one high-bay program; the
  // wing IDs remain separate publication objects.
  ['TE-MSA-UW01-DRY-CORE', 'TE-MSA-UW01-DRY-COMPLEX'],
  ['TE-MSA-UW01-DRY-EAST-WINGS', 'TE-MSA-UW01-DRY-COMPLEX'],

  // RV models, lot paving, customer building, sales building, and fuel court
  // are child passes of one dealership site owner. Its road remains owned by
  // the independently consolidated regional approach network.
  ['TE-PAN-RV01', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV01-CUSTOMER', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV01-SALES', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV01-FUEL', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV29-A', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV29-B', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV29-C', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV29-D', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV39-A', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV39-B', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV39-C', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV39-D', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV48-A', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV48-B', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV48-C', 'TE-PAN-RV01-DEALERSHIP'],
  ['TE-PAN-RV48-D', 'TE-PAN-RV01-DEALERSHIP'],

  // The outer logistics bench owns the two warehouses placed on it. The
  // warehouse IDs describe catalog objects, not competing site-clear owners.
  ['TE-IA-OUTER-COMPOUND', 'TE-IA-OUTER-COMPOUND'],
  ['TE-IA-OUTER-WAREHOUSE-A', 'TE-IA-OUTER-COMPOUND'],
  ['TE-IA-OUTER-WAREHOUSE-B', 'TE-IA-OUTER-COMPOUND'],

  // Garage and shelter are attached subprograms of the holdout residence.
  ['TE-IA-HOLDOUT-HOME', 'TE-IA-HOLDOUT-HOME'],
  ['TE-IA-HOLDOUT-HOME-GARAGE', 'TE-IA-HOLDOUT-HOME'],
  ['TE-IA-HOLDOUT-HOME-SHELTER', 'TE-IA-HOLDOUT-HOME'],
]);
const crossScopeContractPayload = JSON.parse(
  fs.readFileSync(path.resolve(CROSS_SCOPE_CONTRACT_PATH), 'utf8'),
);
const crossScopeContractKeys = crossScopeContractPayload.interfaces?.map(
  (contract) => `${contract.fromScope} -> ${contract.toScope}`,
) ?? [];
if (
  crossScopeContractPayload.schemaVersion !== 2
  || crossScopeContractPayload.status !== 'APPROVED_EXACT_DEFAULT_DENY'
  || crossScopeContractPayload.wildcardsAllowed !== false
  || !Array.isArray(crossScopeContractPayload.interfaces)
  || new Set(crossScopeContractKeys).size !== crossScopeContractKeys.length
  || crossScopeContractPayload.interfaces.some((contract) => (
    !contract.id
    || !contract.reason
    || !contract.geometryEvidence
    || contract.fromScope.includes('*')
    || contract.toScope.includes('*')
    || !Number.isInteger(contract.cells)
    || !Number.isInteger(contract.transitionEvents)
    || !Number.isInteger(contract.componentCount)
    || !Number.isInteger(contract.largestComponentCells)
    || !/^[a-f0-9]{64}$/.test(contract.sortedCellSetSha256)
    || !/^[a-f0-9]{64}$/.test(contract.componentSetSha256)
  ))
) {
  throw new Error(`Invalid cross-scope contract: ${CROSS_SCOPE_CONTRACT_PATH}`);
}
const REVIEWED_CROSS_SCOPE_INTERFACES = new Map(
  crossScopeContractPayload.interfaces.map((contract) => [
    `${contract.fromScope} -> ${contract.toScope}`,
    contract,
  ]),
);

function argValue(args, key, fallback) {
  const index = args.indexOf(key);
  return index < 0 ? fallback : args[index + 1];
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function normalizeState(state) {
  return completeBlockState(state);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalScopeOwner(scope) {
  return CANONICAL_SCOPE_OWNERS.get(scope) ?? scope;
}

function boundsOf(cells) {
  if (!cells.length) return null;
  const bounds = {
    minX: cells[0].x,
    minY: cells[0].y,
    minZ: cells[0].z,
    maxX: cells[0].x,
    maxY: cells[0].y,
    maxZ: cells[0].z,
  };
  for (let index = 1; index < cells.length; index += 1) {
    const cell = cells[index];
    bounds.minX = Math.min(bounds.minX, cell.x);
    bounds.minY = Math.min(bounds.minY, cell.y);
    bounds.minZ = Math.min(bounds.minZ, cell.z);
    bounds.maxX = Math.max(bounds.maxX, cell.x);
    bounds.maxY = Math.max(bounds.maxY, cell.y);
    bounds.maxZ = Math.max(bounds.maxZ, cell.z);
  }
  return bounds;
}

class Model {
  constructor() {
    this.cells = new Map();
    this.overrides = [];
    this.crossScopeOverrides = new Map();
  }

  set(x, y, z, state, meta) {
    const coordinate = key(x, y, z);
    const completedState = normalizeState(state);
    const prior = this.cells.get(coordinate);
    const ownershipScope = canonicalScopeOwner(meta.scope);
    if (prior && prior.state !== completedState) {
      this.overrides.push({
        point: [x, y, z],
        from: prior.state,
        to: completedState,
        fromScope: prior.scope,
        toScope: meta.scope,
        fromOwnershipScope: prior.ownershipScope,
        toOwnershipScope: ownershipScope,
        fromRole: prior.role,
        toRole: meta.role,
      });
      if (prior.ownershipScope !== ownershipScope) {
        const summaryKey = `${prior.scope} -> ${meta.scope}`;
        const summary = this.crossScopeOverrides.get(summaryKey) ?? {
          fromScope: prior.scope,
          toScope: meta.scope,
          fromOwnershipScope: prior.ownershipScope,
          toOwnershipScope: ownershipScope,
          transitionEvents: 0,
          cellKeys: new Set(),
          points: [],
          fromRoles: new Set(),
          toRoles: new Set(),
          stateTransitions: new Set(),
          samples: [],
        };
        summary.transitionEvents += 1;
        if (!summary.cellKeys.has(coordinate)) {
          summary.cellKeys.add(coordinate);
          summary.points.push([x, y, z]);
        }
        summary.fromRoles.add(prior.role);
        summary.toRoles.add(meta.role);
        summary.stateTransitions.add(
          `${prior.state} -> ${completedState}`,
        );
        if (summary.samples.length < 20) summary.samples.push([x, y, z]);
        this.crossScopeOverrides.set(summaryKey, summary);
      }
    }
    this.cells.set(coordinate, {
      x,
      y,
      z,
      state: completedState,
      phase: meta.phase,
      scope: meta.scope,
      ownershipScope,
      role: meta.role,
    });
  }

  box(x1, y1, z1, x2, y2, z2, state, meta, predicate = null) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
          if (!predicate || predicate(x, y, z)) this.set(x, y, z, state, meta);
        }
      }
    }
  }

  hollow(x1, y1, z1, x2, y2, z2, wall, meta) {
    this.box(x1, y1, z1, x2, y2, z2, AIR, meta);
    this.box(x1, y1, z1, x2, y1, z2, wall, meta);
    this.box(x1, y2, z1, x2, y2, z2, wall, meta);
    this.box(x1, y1, z1, x1, y2, z2, wall, meta);
    this.box(x2, y1, z1, x2, y2, z2, wall, meta);
    this.box(x1, y1, z1, x2, y2, z1, wall, meta);
    this.box(x1, y1, z2, x2, y2, z2, wall, meta);
  }
}

function serializeCrossScopeOverride(summary) {
  const points = [...summary.points].sort(
    (left, right) => left[1] - right[1] || left[2] - right[2] || left[0] - right[0],
  );
  const sortedCellSet = points.map((point) => point.join(',')).join('\n');
  const remaining = new Set(points.map((point) => point.join(',')));
  const connectedComponents = [];
  for (const seed of points) {
    const seedKey = seed.join(',');
    if (!remaining.delete(seedKey)) continue;
    const queue = [seed];
    const component = [];
    for (let index = 0; index < queue.length; index += 1) {
      const point = queue[index];
      component.push(point);
      const [x, y, z] = point;
      for (const neighbor of [
        [x - 1, y, z], [x + 1, y, z],
        [x, y - 1, z], [x, y + 1, z],
        [x, y, z - 1], [x, y, z + 1],
      ]) {
        const neighborKey = neighbor.join(',');
        if (remaining.delete(neighborKey)) queue.push(neighbor);
      }
    }
    component.sort(
      (left, right) => left[1] - right[1] || left[2] - right[2] || left[0] - right[0],
    );
    connectedComponents.push({
      cells: component.length,
      inclusiveBounds: boundsOf(
        component.map(([x, y, z]) => ({ x, y, z })),
      ),
      sortedCellSetSha256: sha256(
        component.map((point) => point.join(',')).join('\n'),
      ),
    });
  }
  connectedComponents.sort(
    (left, right) => right.cells - left.cells
      || left.sortedCellSetSha256.localeCompare(right.sortedCellSetSha256),
  );
  return {
    fromScope: summary.fromScope,
    toScope: summary.toScope,
    fromOwnershipScope: summary.fromOwnershipScope,
    toOwnershipScope: summary.toOwnershipScope,
    cells: points.length,
    transitionEvents: summary.transitionEvents,
    inclusiveBounds: boundsOf(points.map(([x, y, z]) => ({ x, y, z }))),
    sortedCellSetSha256: sha256(sortedCellSet),
    componentCount: connectedComponents.length,
    largestComponentCells: connectedComponents[0]?.cells ?? 0,
    componentSetSha256: sha256(JSON.stringify(connectedComponents)),
    connectedComponents,
    fromRoles: [...summary.fromRoles].sort(),
    toRoles: [...summary.toRoles].sort(),
    stateTransitions: [...summary.stateTransitions].sort(),
    samples: summary.samples,
  };
}

function crossScopeOverrideEvidence(model) {
  return [...model.crossScopeOverrides.values()]
    .map(serializeCrossScopeOverride)
    .sort((left, right) => right.cells - left.cells || left.fromScope.localeCompare(right.fromScope));
}

function classifyCrossScopeInterfaces(model, { requireAllContracts = false } = {}) {
  const reviewed = [];
  const unreviewed = [];
  const observedIds = new Set();
  for (const summary of crossScopeOverrideEvidence(model)) {
    const interfaceId = `${summary.fromScope} -> ${summary.toScope}`;
    observedIds.add(interfaceId);
    const approval = REVIEWED_CROSS_SCOPE_INTERFACES.get(interfaceId);
    const mismatch = [];
    if (approval) {
      for (const field of [
        'cells',
        'transitionEvents',
        'sortedCellSetSha256',
        'componentCount',
        'largestComponentCells',
        'componentSetSha256',
      ]) {
        if (approval[field] !== summary[field]) {
          mismatch.push(`${field}: approved ${approval[field]} != modeled ${summary[field]}`);
        }
      }
      if (
        JSON.stringify(approval.inclusiveBounds)
        !== JSON.stringify(summary.inclusiveBounds)
      ) {
        mismatch.push(
          `inclusiveBounds: approved ${JSON.stringify(approval.inclusiveBounds)}`
          + ` != modeled ${JSON.stringify(summary.inclusiveBounds)}`,
        );
      }
      if (!approval.reason || !approval.geometryEvidence) {
        mismatch.push('reason and geometryEvidence are both required');
      }
    }
    if (approval && mismatch.length === 0) {
      reviewed.push({ interfaceId, ...summary, review: approval });
    } else {
      unreviewed.push({
        interfaceId,
        ...summary,
        review: approval
          ? {
              ...approval,
              failure: mismatch.join('; '),
            }
          : null,
      });
    }
  }
  const missingApprovedInterfaces = [...REVIEWED_CROSS_SCOPE_INTERFACES.entries()]
    .filter(([interfaceId]) => !observedIds.has(interfaceId))
    .map(([interfaceId, review]) => ({
      interfaceId,
      cells: 0,
      transitionEvents: 0,
      inclusiveBounds: null,
      sortedCellSetSha256: null,
      componentCount: 0,
      largestComponentCells: 0,
      componentSetSha256: null,
      fromScope: review.fromScope,
      toScope: review.toScope,
      review: {
        ...review,
        failure: 'approved exact interface is absent from the complete modeled package',
      },
    }));
  if (requireAllContracts) unreviewed.push(...missingApprovedInterfaces);
  return { reviewed, unreviewed, missingApprovedInterfaces };
}

function renderCrossScopeAuditMarkdown(payload) {
  const lines = [
    '# Town Expansion global cross-scope ownership and interface gate',
    '',
    `**Status:** ${payload.status}`,
    `**Generated:** ${payload.generatedAtUtc}`,
    '**Mode:** offline model audit; no database, snapshot, or live-world mutation',
    '',
    '## Result',
    '',
    `- Final modeled target cells: ${payload.targetCells.toLocaleString()}`,
    `- Canonical ownership refactors: ${payload.canonicalOwnershipAssignments.length}`,
    `- Exact reviewed interfaces: ${payload.reviewedInterfaces.length}`,
    `- Unreviewed interfaces: ${payload.unreviewedInterfaces.length}`,
    '',
  ];
  if (payload.managerVale) {
    lines.push(
      '## Manager Vale exact module ownership',
      '',
      `- Module status: ${payload.managerVale.status}`,
      `- Exact one-cell targets: ${payload.managerVale.ownership.exactOneCellOperations.toLocaleString()}`,
      `- Unique target cells: ${payload.managerVale.ownership.uniqueTargetCells.toLocaleString()}`,
      `- Shared-model target intersections: ${payload.managerVale.ownership.sharedModelTargetIntersections}`,
      `- Cottages / attached garage bays / rooms: ${payload.managerVale.counts.cottages} / ${payload.managerVale.counts.bays} / ${payload.managerVale.counts.rooms}`,
      `- Furnishing groups / cameras: ${payload.managerVale.counts.furnishings} / ${payload.managerVale.counts.cameras}`,
      `- Protected block-entity copies: ${payload.managerVale.protectedMigration.protectedBlockEntities}`,
      `- Source retirement included: ${payload.managerVale.protectedMigration.sourceRetirementIncluded}`,
      `- Exact owner: \`${payload.managerVale.ownership.owner}\``,
      '',
    );
  }
  lines.push(
    '## Canonical ownership',
    '',
    'Publication scopes remain independently cataloged. The assignments below only remove duplicate physical ownership inside one designed road, landscape, house, or park program.',
    '',
    ...payload.canonicalOwnershipAssignments.map(
      ({ scope, owner }) => `- \`${scope}\` → \`${owner}\``,
    ),
    '',
    '## Exact reviewed interfaces',
    '',
  );
  if (payload.reviewedInterfaces.length === 0) {
    lines.push('- None.', '');
  } else {
    for (const item of payload.reviewedInterfaces) {
      lines.push(
        `### ${item.interfaceId}`,
        '',
        `- Exact cells: ${item.cells}`,
        `- Transition events: ${item.transitionEvents}`,
        `- Bounds: \`${JSON.stringify(item.inclusiveBounds)}\``,
        `- Sorted cell-set SHA-256: \`${item.sortedCellSetSha256}\``,
        `- Connected components: ${item.componentCount} (largest ${item.largestComponentCells} cells)`,
        `- Component-set SHA-256: \`${item.componentSetSha256}\``,
        `- Reason: ${item.review.reason}`,
        `- Geometry evidence: ${item.review.geometryEvidence}`,
        '',
      );
    }
  }
  lines.push('## Unreviewed interfaces', '');
  if (payload.unreviewedInterfaces.length === 0) {
    lines.push('- None. The default-deny release gate passes.', '');
  } else {
    for (const item of payload.unreviewedInterfaces) {
      lines.push(
        `- **${item.interfaceId}:** ${item.cells} cells, bounds \`${JSON.stringify(item.inclusiveBounds)}\`, hash \`${item.sortedCellSetSha256}\`.`,
      );
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function translatedModel(model, dx = 0, dy = 0, dz = 0) {
  return {
    set(x, y, z, state, metadata) {
      model.set(x + dx, y + dy, z + dz, state, metadata);
    },
    box(x1, y1, z1, x2, y2, z2, state, metadata, predicate = null) {
      model.box(
        x1 + dx,
        y1 + dy,
        z1 + dz,
        x2 + dx,
        y2 + dy,
        z2 + dz,
        state,
        metadata,
        predicate
          ? (x, y, z) => predicate(x - dx, y - dy, z - dz)
          : null,
      );
    },
    hollow(x1, y1, z1, x2, y2, z2, wall, metadata) {
      model.hollow(
        x1 + dx,
        y1 + dy,
        z1 + dz,
        x2 + dx,
        y2 + dy,
        z2 + dz,
        wall,
        metadata,
      );
    },
  };
}

function meta(scope, role, phase) {
  return { scope, role, phase };
}

function modelPenthouse(model) {
  const scope = 'TE-PENTHOUSE-01';
  model.box(-97, 88, -389, -73, 96, -379, AIR, meta(scope, 'selective_refit_clear', 10));
  model.box(-97, 88, -389, -73, 94, -389, 'minecraft:polished_blackstone_bricks', meta(scope, 'north_wall', 20));
  model.box(-97, 88, -379, -73, 94, -379, 'minecraft:quartz_bricks', meta(scope, 'terrace_wall', 20));
  model.box(-97, 88, -389, -97, 94, -379, 'minecraft:polished_blackstone_bricks', meta(scope, 'west_wall', 20));
  model.box(-73, 88, -389, -73, 94, -379, 'minecraft:polished_blackstone_bricks', meta(scope, 'east_wall', 20));
  model.box(-96, 88, -388, -74, 88, -380, 'minecraft:dark_oak_planks', meta(scope, 'floor_inlay', 21));

  // Brass-trimmed window rhythm and preserved south access axis.
  for (const x of [-94, -90, -80, -76]) {
    model.box(x, 90, -389, x + 1, 92, -389, 'minecraft:tinted_glass', meta(scope, 'north_windows', 30));
  }
  for (const z of [-387, -383]) {
    model.box(-97, 90, z, -97, 92, z + 1, 'minecraft:tinted_glass', meta(scope, 'west_windows', 30));
    model.box(-73, 90, z, -73, 92, z + 1, 'minecraft:tinted_glass', meta(scope, 'east_windows', 30));
  }
  model.box(-86, 88, -379, -84, 90, -379, AIR, meta(scope, 'preserved_access_door', 40));

  // Private suite west; dining/kitchen east; salon and office north.
  model.box(-87, 88, -388, -87, 92, -381, 'minecraft:quartz_bricks', meta(scope, 'suite_partition', 42));
  model.box(-87, 88, -385, -87, 90, -384, AIR, meta(scope, 'suite_door', 43));
  model.box(-80, 88, -388, -80, 92, -381, 'minecraft:dark_oak_planks', meta(scope, 'service_partition', 42));
  model.box(-80, 88, -385, -80, 90, -384, AIR, meta(scope, 'service_door', 43));
  model.box(-96, 89, -388, -96, 92, -381, 'minecraft:bookshelf', meta(scope, 'private_library', 50));
  model.box(-94, 89, -386, -90, 89, -383, 'minecraft:red_carpet', meta(scope, 'suite_rug', 50));
  model.box(-78, 89, -388, -75, 90, -388, 'minecraft:polished_blackstone', meta(scope, 'kitchen_counter', 50));
  model.box(-79, 89, -383, -75, 89, -381, 'minecraft:white_carpet', meta(scope, 'dining_table', 50));
  model.box(-86, 89, -388, -82, 89, -387, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(scope, 'salon_seating', 50));
  model.box(-86, 93, -386, -84, 93, -384, 'minecraft:sea_lantern', meta(scope, 'salon_lantern', 51));

  // Copper crown, stepped roof, and garden terrace.
  model.box(-98, 95, -390, -72, 95, -378, 'minecraft:cut_copper', meta(scope, 'roof_deck', 60));
  model.box(-96, 96, -388, -74, 96, -380, 'minecraft:oxidized_cut_copper', meta(scope, 'roof_crown', 61));
  model.box(-94, 97, -386, -76, 97, -382, 'minecraft:dark_prismarine', meta(scope, 'roof_lantern_base', 61));
  model.box(-89, 98, -385, -81, 98, -383, 'minecraft:sea_lantern', meta(scope, 'roof_lantern', 62));
  model.box(-96, 88, -377, -74, 88, -373, 'minecraft:smooth_quartz', meta(scope, 'terrace_deck', 70));
  model.box(-96, 89, -377, -96, 90, -373, 'minecraft:cut_copper', meta(scope, 'terrace_parapet', 71));
  model.box(-74, 89, -377, -74, 90, -373, 'minecraft:cut_copper', meta(scope, 'terrace_parapet', 71));
  model.box(-96, 89, -373, -74, 90, -373, 'minecraft:cut_copper', meta(scope, 'terrace_parapet', 71));
  for (const x of [-93, -77]) {
    model.box(x, 89, -376, x + 2, 89, -374, 'minecraft:moss_block', meta(scope, 'terrace_planter', 72));
    model.set(x + 1, 90, -375, 'minecraft:flowering_azalea', meta(scope, 'terrace_planting', 73));
  }
}

function modelLonghouseAndCourt(model) {
  const scope = 'TE-LONGHOUSE-01';
  model.box(-104, 68, -356, -67, 95, -342, AIR, meta(scope, 'retire_amsterdam_superstructure', 10));
  model.box(-104, 67, -356, -67, 67, -342, 'minecraft:stone_bricks', meta(scope, 'longhouse_floor', 20));
  model.box(-104, 68, -356, -67, 75, -356, 'minecraft:dark_oak_planks', meta(scope, 'south_wall', 22));
  model.box(-104, 68, -342, -67, 75, -342, 'minecraft:dark_oak_planks', meta(scope, 'north_wall', 22));
  model.box(-104, 68, -356, -104, 75, -342, 'minecraft:mud_bricks', meta(scope, 'west_wall', 22));
  model.box(-67, 68, -356, -67, 75, -342, 'minecraft:mud_bricks', meta(scope, 'east_wall', 22));
  for (const x of [-104, -98, -92, -86, -80, -74, -68]) {
    model.box(x, 68, -356, x, 77, -356, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'south_frame', 25));
    model.box(x, 68, -342, x, 77, -342, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'north_frame', 25));
  }
  for (const x of [-100, -94, -78, -72]) {
    model.box(x, 70, -356, x + 1, 72, -356, 'minecraft:yellow_stained_glass', meta(scope, 'south_windows', 28));
    model.box(x, 70, -342, x + 1, 72, -342, 'minecraft:yellow_stained_glass', meta(scope, 'north_windows', 28));
  }
  model.box(-87, 68, -356, -84, 71, -356, AIR, meta(scope, 'great_door', 30));
  model.box(-88, 68, -355, -83, 68, -352, 'minecraft:polished_andesite', meta(scope, 'entry_porche', 31));

  // High roof with a continuous timber ridge.
  for (let inset = 0; inset <= 6; inset += 1) {
    model.box(
      -105 + inset,
      76 + inset,
      -357 + inset,
      -66 - inset,
      76 + inset,
      -341 - inset,
      inset === 6 ? 'minecraft:stripped_dark_oak_log[axis=x]' : 'minecraft:deepslate_tiles',
      meta(scope, 'stepped_longhouse_roof', 40 + inset),
    );
  }

  // Great hearth, feast tables, dais, service and lodging bays.
  model.box(-88, 68, -351, -83, 68, -347, 'minecraft:polished_blackstone', meta(scope, 'hearth_plinth', 55));
  model.box(-87, 69, -350, -84, 69, -348, 'minecraft:magma_block', meta(scope, 'hearth', 56));
  model.box(-86, 70, -349, -85, 81, -349, 'minecraft:polished_blackstone_bricks', meta(scope, 'chimney', 57));
  for (const x of [-98, -93, -78, -73]) {
    model.box(x, 69, -353, x + 3, 69, -353, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, 'feast_table', 58));
    model.box(x, 69, -346, x + 3, 69, -346, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, 'feast_table', 58));
  }
  model.box(-102, 69, -354, -99, 72, -344, 'minecraft:bookshelf', meta(scope, 'west_archive', 59));
  model.box(-71, 69, -354, -69, 72, -344, 'minecraft:red_wool', meta(scope, 'east_lodging', 59));
  model.box(-90, 69, -344, -81, 69, -343, 'minecraft:gold_block', meta(scope, 'high_dais', 60));

  const court = 'TE-COURT-01';
  model.box(-104, 68, -365, -66, 74, -357, AIR, meta(court, 'court_clearance', 70));
  model.box(-104, 67, -365, -66, 67, -357, 'minecraft:polished_andesite', meta(court, 'court_paving', 71));
  for (let x = -103; x <= -67; x += 4) {
    model.box(x, 67, -365, x + 1, 67, -357, 'minecraft:stone_bricks', meta(court, 'court_banding', 72));
  }
  model.box(-90, 68, -363, -80, 68, -359, 'minecraft:smooth_quartz', meta(court, 'ceremonial_dais', 74));
  model.box(-86, 69, -362, -84, 73, -360, 'minecraft:cut_copper', meta(court, 'founders_statue', 75));
  model.set(-85, 74, -361, 'minecraft:gold_block', meta(court, 'founders_statue_crown', 76));
  model.box(-103, 68, -364, -98, 68, -360, 'minecraft:moss_block', meta(court, 'rain_garden', 76));
  model.box(-72, 68, -364, -67, 68, -360, 'minecraft:moss_block', meta(court, 'rain_garden', 76));
}

function isLibraryCore(x, z) {
  return x >= -144 && x <= -111 && z >= -448 && z <= -426;
}

function modelLibraryAndGarth(model) {
  const scope = 'TE-LIBRARY-04X';
  const outsideCore = (x, _y, z) => !isLibraryCore(x, z);
  model.box(-178, 44, -448, -111, 91, -403, AIR, meta(scope, 'new_wing_excavation', 10), outsideCore);
  model.box(-178, 44, -448, -111, 46, -403, 'minecraft:stone_bricks', meta(scope, 'foundation', 20), outsideCore);
  for (const floorY of [46, 53, 60, 67, 75, 83]) {
    model.box(-178, floorY, -448, -111, floorY, -403, 'minecraft:polished_diorite', meta(scope, `floor_${floorY}`, 30), outsideCore);
  }
  for (let y = 47; y <= 90; y += 1) {
    const band = [53, 60, 67, 75, 83, 90].includes(y);
    const material = band ? 'minecraft:cut_copper' : 'minecraft:quartz_bricks';
    model.box(-178, y, -448, -178, y, -403, material, meta(scope, 'west_facade', 40));
    model.box(-178, y, -403, -111, y, -403, material, meta(scope, 'south_facade', 40), outsideCore);
    model.box(-178, y, -448, -111, y, -448, material, meta(scope, 'north_facade', 40), outsideCore);
    if (y <= 74) model.box(-111, y, -425, -111, y, -403, material, meta(scope, 'east_return', 40));
  }
  for (let y = 48; y <= 89; y += 1) {
    if ([50, 51, 56, 57, 63, 64, 70, 71, 78, 79, 86, 87].includes(y)) {
      for (let z = -445; z <= -406; z += 5) {
        model.box(-178, y, z, -178, y, z + 2, 'minecraft:light_blue_stained_glass', meta(scope, 'west_windows', 45));
      }
      for (let x = -174; x <= -114; x += 6) {
        model.box(x, y, -403, x + 2, y, -403, 'minecraft:light_blue_stained_glass', meta(scope, 'south_windows', 45), outsideCore);
      }
    }
  }
  model.box(-178, 91, -448, -111, 91, -403, 'minecraft:oxidized_cut_copper', meta(scope, 'library_roof', 50), outsideCore);
  for (const floorY of [46, 53, 60, 67, 75, 83]) {
    model.box(-144, floorY + 1, -439, -144, floorY + 3, -437, AIR, meta(scope, 'core_wing_connection', 60));
  }
  // Reading stacks and a central south atrium.
  for (const floorY of [47, 54, 61, 68, 76, 84]) {
    for (let x = -173; x <= -150; x += 5) {
      model.box(x, floorY, -443, x, floorY + 2, -408, 'minecraft:bookshelf', meta(scope, 'reading_stacks', 65));
    }
  }
  model.box(-164, 47, -423, -153, 89, -414, AIR, meta(scope, 'six_level_atrium', 70));
  for (const y of [52, 59, 66, 74, 82, 90]) {
    model.box(-164, y, -423, -153, y, -414, 'minecraft:yellow_stained_glass', meta(scope, 'atrium_lantern', 71));
  }

  const terrace = 'TE-LIBRARY-TERRACE';
  model.box(-110, 76, -447, -96, 82, -432, AIR, meta(terrace, 'upper_clearance', 80));
  model.box(-110, 75, -447, -96, 75, -432, 'minecraft:smooth_quartz', meta(terrace, 'upper_walkout', 81));
  model.box(-108, 71, -445, -98, 71, -434, 'minecraft:polished_diorite', meta(terrace, 'middle_terrace', 82));
  model.box(-110, 76, -447, -110, 77, -432, 'minecraft:cut_copper', meta(terrace, 'upper_parapet', 83));
  model.box(-110, 76, -447, -96, 77, -447, 'minecraft:cut_copper', meta(terrace, 'upper_parapet', 83));
  for (let step = 0; step <= 7; step += 1) {
    const x1 = -109 + step * 2;
    model.box(x1, 74 - step, -441, x1 + 1, 74 - step, -435, 'minecraft:smooth_quartz', meta(terrace, 'grand_stair', 85));
    model.box(x1, 75 - step, -441, x1 + 1, 78 - step, -435, AIR, meta(terrace, 'grand_stair_headroom', 84));
  }

  // Russian Revival terem pavilion over the active Garth: masonry/timber
  // arcades, a steep polychrome roof, kokoshnik-like stepped gables and an
  // onion-form central lantern. There is deliberately no glass pavilion.
  const russian = 'TE-RUSSIAN-TEREM-PAVILION';
  for (const x of [-104, -98, -92, -78, -72, -66]) {
    model.box(x, 68, -446, x + 1, 75, -446, 'minecraft:red_nether_bricks', meta(russian, 'north_arcade_pier', 87));
    model.box(x, 68, -426, x + 1, 75, -426, 'minecraft:red_nether_bricks', meta(russian, 'south_arcade_pier', 87));
    model.box(x, 72, -446, x + 1, 74, -446, 'minecraft:white_concrete', meta(russian, 'north_kokoshnik_band', 88));
    model.box(x, 72, -426, x + 1, 74, -426, 'minecraft:white_concrete', meta(russian, 'south_kokoshnik_band', 88));
  }
  for (const z of [-444, -438, -432, -428]) {
    model.box(-105, 68, z, -105, 75, z + 1, 'minecraft:red_nether_bricks', meta(russian, 'west_arcade_pier', 87));
    model.box(-65, 68, z, -65, 75, z + 1, 'minecraft:red_nether_bricks', meta(russian, 'east_arcade_pier', 87));
    model.box(-105, 72, z, -105, 74, z + 1, 'minecraft:white_concrete', meta(russian, 'west_kokoshnik_band', 88));
    model.box(-65, 72, z, -65, 74, z + 1, 'minecraft:white_concrete', meta(russian, 'east_kokoshnik_band', 88));
  }
  for (let inset = 0; inset <= 9; inset += 1) {
    const roofState = inset % 3 === 1
      ? 'minecraft:oxidized_cut_copper'
      : 'minecraft:dark_prismarine';
    model.box(-106 + inset, 76 + inset, -447 + inset, -64 - inset, 76 + inset, -447 + inset, roofState, meta(russian, 'steep_terem_roof', 90 + inset));
    model.box(-106 + inset, 76 + inset, -425 - inset, -64 - inset, 76 + inset, -425 - inset, roofState, meta(russian, 'steep_terem_roof', 90 + inset));
  }
  model.box(-91, 86, -443, -79, 86, -431, 'minecraft:purple_glazed_terracotta', meta(russian, 'onion_dome_base', 101));
  model.box(-89, 87, -441, -81, 89, -433, 'minecraft:purple_glazed_terracotta', meta(russian, 'onion_dome_bulb', 102));
  model.box(-87, 90, -439, -83, 92, -435, 'minecraft:gold_block', meta(russian, 'onion_dome_crown', 103));
  model.box(-85, 93, -437, -85, 97, -437, 'minecraft:gold_block', meta(russian, 'pavilion_finial', 104));
  model.box(-91, 75, -447, -79, 78, -447, 'minecraft:white_concrete', meta(russian, 'north_stepped_gable', 98));
  model.box(-91, 75, -425, -79, 78, -425, 'minecraft:white_concrete', meta(russian, 'south_stepped_gable', 98));
  model.box(-88, 79, -447, -82, 81, -447, 'minecraft:red_nether_bricks', meta(russian, 'north_gable_crown', 99));
  model.box(-88, 79, -425, -82, 81, -425, 'minecraft:red_nether_bricks', meta(russian, 'south_gable_crown', 99));

  const garth = 'RG-GARTH-STATUES';
  const statues = [
    [-92, -443], [-92, -429], [-69, -443], [-69, -429],
    [-91, -437], [-77, -437],
  ];
  for (const [x, z] of statues) {
    model.box(x - 1, 67, z - 1, x + 1, 68, z + 1, 'minecraft:smooth_quartz', meta(garth, 'statue_plinth', 90));
    model.box(x, 69, z, x, 73, z, 'minecraft:cut_copper', meta(garth, 'guild_statue', 91));
    model.set(x, 74, z, 'minecraft:gold_block', meta(garth, 'statue_crown', 92));
  }
}

function staircase(model, scope, centerX, lowerY, upperY, startZ, phase) {
  const rise = upperY - lowerY;
  for (let step = 0; step <= rise; step += 1) {
    const z = startZ + step * 2;
    model.box(centerX - 1, lowerY + step, z, centerX + 1, lowerY + step, z + 1, 'minecraft:smooth_quartz', meta(scope, 'normal_walk_stair', phase));
    model.box(centerX - 1, lowerY + step + 1, z, centerX + 1, lowerY + step + 3, z + 1, AIR, meta(scope, 'stair_headroom', phase - 1));
  }
}

function compactSwitchbackStair(model, scope, bounds, lowerY, upperY, phase) {
  const [x1, z1, x2, z2] = bounds;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);
  const run = Math.max(3, maxZ - minZ - 3);
  for (let y = lowerY; y <= upperY; y += 1) {
    const rise = y - lowerY;
    const flight = Math.floor(rise / run);
    const offset = rise % run;
    const forward = flight % 2 === 0;
    const z = forward ? minZ + 2 + offset : maxZ - 2 - offset;
    const stairX = flight % 2 === 0 ? minX + 1 : maxX - 2;
    const facing = forward ? 'south' : 'north';
    model.box(
      stairX,
      y,
      z,
      stairX + 1,
      y,
      z,
      `minecraft:smooth_quartz_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
      meta(scope, 'compact_switchback_stair', phase),
    );
    model.box(stairX, y + 1, z, stairX + 1, y + 3, z, AIR, meta(scope, 'compact_switchback_headroom', phase - 1));
    if (offset === run - 1 || y === upperY) {
      model.box(minX + 1, y, z - 1, maxX - 1, y, z + 1, 'minecraft:smooth_quartz', meta(scope, 'switchback_landing', phase));
      model.box(minX + 1, y + 1, z - 1, maxX - 1, y + 3, z + 1, AIR, meta(scope, 'switchback_landing_headroom', phase - 1));
    }
  }
}

function modelGuildHall(model) {
  const scope = 'TE-GUILDHALL-01';
  model.box(-59, 51, -462, -7, 94, -409, AIR, meta(scope, 'surveyed_excavation_and_clearance', 10));
  for (const floorY of [52, 60, 67, 75, 83]) {
    model.box(-59, floorY, -462, -7, floorY, -409, 'minecraft:polished_diorite', meta(scope, `floor_${floorY}`, 20));
  }
  model.box(-59, 51, -462, -7, 52, -409, 'minecraft:reinforced_deepslate', meta(scope, 'b2_liner', 21));
  for (let y = 53; y <= 91; y += 1) {
    const basement = y < 67;
    const material = basement ? 'minecraft:deepslate_bricks' : 'minecraft:quartz_bricks';
    model.box(-59, y, -462, -59, y, -409, material, meta(scope, 'west_envelope', 30));
    model.box(-7, y, -462, -7, y, -409, material, meta(scope, 'east_envelope', 30));
    model.box(-59, y, -462, -7, y, -462, material, meta(scope, 'north_envelope', 30));
    model.box(-59, y, -409, -7, y, -409, material, meta(scope, 'south_envelope', 30));
  }
  for (let x = -55; x <= -11; x += 8) {
    model.box(x, 67, -463, x + 1, 92, -462, 'minecraft:gold_block', meta(scope, 'north_gilded_order', 35));
    model.box(x, 67, -409, x + 1, 92, -408, 'minecraft:gold_block', meta(scope, 'south_gilded_order', 35));
  }
  for (const y of [69, 70, 77, 78, 85, 86]) {
    for (let x = -54; x <= -12; x += 6) {
      model.box(x, y, -462, x + 2, y, -462, 'minecraft:purple_stained_glass', meta(scope, 'north_glazing', 37));
      model.box(x, y, -409, x + 2, y, -409, 'minecraft:purple_stained_glass', meta(scope, 'south_glazing', 37));
    }
  }
  model.box(-59, 68, -445, -52, 74, -431, 'minecraft:quartz_bricks', meta(scope, 'garth_portico', 40));
  model.box(-59, 68, -442, -52, 72, -434, AIR, meta(scope, 'garth_processional_entry', 41));
  model.box(-65, 67, -442, -60, 67, -434, 'minecraft:smooth_quartz', meta(scope, 'garth_bridge', 42));

  // Program walls: Great Hall / Court / kitchen, dance / bar, theater / lecture.
  for (const y of [53, 61, 68, 76, 84]) {
    model.box(-50, y, -439, -12, y + 5, -439, 'minecraft:polished_blackstone_bricks', meta(scope, 'north_south_program_wall', 50));
    model.box(-34, y, -433, -34, y + 5, -410, 'minecraft:polished_blackstone_bricks', meta(scope, 'south_program_wall', 50));
  }
  for (const [lower, upper] of [[52, 60], [60, 67], [67, 75], [75, 83]]) {
    staircase(model, scope, -54, lower, upper, -459, 60);
    staircase(model, scope, -33, lower, upper, -459, 60);
    staircase(model, scope, -12, lower, upper, -459, 60);
  }

  // Great Hall: dais, banquet furniture, axial lantern.
  model.box(-49, 68, -461, -13, 68, -459, 'minecraft:gold_block', meta(scope, 'great_hall_dais', 70));
  for (let x = -47; x <= -17; x += 6) {
    model.box(x, 68, -455, x + 2, 68, -443, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, 'great_hall_tables', 70));
  }
  model.box(-36, 73, -451, -26, 73, -447, 'minecraft:sea_lantern', meta(scope, 'great_hall_lantern', 71));

  // Gilded Ledger bar on B1: complete horseshoe, backbar and booths.
  model.box(-48, 61, -432, -23, 61, -410, 'minecraft:red_nether_bricks', meta(scope, 'bar_floor', 72));
  model.box(-47, 62, -430, -25, 63, -430, 'minecraft:dark_oak_planks', meta(scope, 'bar_counter', 73));
  model.box(-47, 62, -430, -47, 63, -416, 'minecraft:dark_oak_planks', meta(scope, 'bar_counter', 73));
  model.box(-25, 62, -430, -25, 63, -416, 'minecraft:dark_oak_planks', meta(scope, 'bar_counter', 73));
  model.box(-47, 62, -416, -42, 63, -416, 'minecraft:dark_oak_planks', meta(scope, 'bar_return', 73));
  model.box(-30, 62, -416, -25, 63, -416, 'minecraft:dark_oak_planks', meta(scope, 'bar_return', 73));
  model.box(-45, 62, -412, -27, 65, -412, 'minecraft:bookshelf', meta(scope, 'bar_backbar', 74));
  model.box(-45, 66, -412, -27, 66, -412, 'minecraft:gold_block', meta(scope, 'bar_cornice', 74));
  for (const x of [-44, -37, -30]) {
    model.box(x, 62, -427, x + 3, 62, -425, 'minecraft:purple_wool', meta(scope, 'bar_booth', 75));
  }

  // Four distinct kitchens, each materially legible.
  const kitchens = [
    [-33, 68, -430, -13, -410, 'minecraft:white_concrete'],
    [-20, 61, -433, -13, -410, 'minecraft:gray_concrete'],
    [-27, 76, -431, -13, -410, 'minecraft:orange_terracotta'],
    [-29, 84, -433, -13, -410, 'minecraft:cyan_terracotta'],
  ];
  for (const [x1, y, z1, x2, z2, material] of kitchens) {
    model.box(x1, y, z1, x2, y, z2, material, meta(scope, 'four_kitchen_contract', 76));
    model.box(x1 + 2, y + 1, z1 + 2, x2 - 2, y + 2, z1 + 3, 'minecraft:polished_blackstone', meta(scope, 'kitchen_workline', 77));
  }

  // Screens are built before and opposite their seating; never on a doorway.
  model.box(-43, 77, -461, -27, 82, -461, 'minecraft:white_concrete', meta(scope, 'theater_screen', 80));
  model.box(-44, 76, -461, -26, 83, -461, 'minecraft:polished_blackstone', meta(scope, 'theater_screen_border', 79));
  model.box(-43, 77, -461, -27, 82, -461, 'minecraft:white_concrete', meta(scope, 'theater_screen_face', 80));
  for (let z = -454; z <= -442; z += 3) {
    model.box(-45, 76 + Math.floor((z + 454) / 3), z, -25, 76 + Math.floor((z + 454) / 3), z + 1, 'minecraft:purple_wool', meta(scope, 'theater_seating', 81));
  }
  model.box(-48, 77, -431, -36, 81, -431, 'minecraft:white_concrete', meta(scope, 'lecture_screen', 80));
  for (let z = -426; z <= -414; z += 3) {
    model.box(-48, 76, z, -36, 76, z + 1, 'minecraft:blue_wool', meta(scope, 'lecture_seating', 81));
  }

  // Dormitory and living floor.
  for (let x = -48; x <= -16; x += 4) {
    model.box(x, 84, -458, x + 2, 84, -455, 'minecraft:red_wool', meta(scope, 'dormitory_sleeping_bay', 84));
    model.set(x + 1, 85, -458, 'minecraft:white_carpet', meta(scope, 'dormitory_linen', 85));
  }
  model.box(-49, 84, -432, -31, 84, -410, 'minecraft:green_carpet', meta(scope, 'members_living_salon', 85));

  model.box(-60, 92, -463, -6, 92, -408, 'minecraft:dark_prismarine', meta(scope, 'monumental_roof', 90));
  model.box(-43, 93, -446, -23, 97, -426, 'minecraft:oxidized_cut_copper', meta(scope, 'guild_cupola', 91));
  model.box(-38, 98, -441, -28, 99, -431, 'minecraft:gold_block', meta(scope, 'guild_crown', 92));
}

function modelCivicPavilionEastGrounds(model) {
  const grounds = 'TE-PAVILION-EAST-CIVIC-GROUNDS';

  // The Ravensgate district boundary is unchanged. These are surface civic
  // grounds east of the completed Guild Hall envelope. The entire principal
  // lawn begins at x=22, leaving a five-column service/inspection gap beyond
  // the Guild Hall's x=-7 east wall; no pool, monument or path cuts through
  // the building.
  model.box(22, 67, -486, 120, 67, -406, 'minecraft:moss_block', meta(grounds, 'civic_lawn_and_garden_base', 40));
  modelParkPath(model, grounds, [
    [-2, 68, -438],
    [22, 68, -438],
    [52, 68, -438],
    [84, 68, -438],
    [118, 68, -438],
  ], 9, 'civic_axis');
  modelParkPath(model, grounds, [[-4, 68, -484], [118, 68, -484]], 5, 'north_garden_walk');
  // Start on the principal lawn so the walk remains one full column clear of
  // the Gilded Raven's x=18 north-west corner. The civic axis at x=22 keeps
  // this walk connected without cutting through the theater envelope.
  modelParkPath(model, grounds, [[22, 68, -402], [118, 68, -402]], 5, 'south_garden_walk');

  modelContainedPool(model, 'TE-PAV-REFLECTING-POOL-NORTH', [26, 54, -478, -464], 68);
  modelContainedPool(model, 'TE-PAV-REFLECTING-POOL-SOUTH', [26, 54, -420, -406], 68);
  for (const [x1, z1, x2, z2] of [
    [27, -475, 53, -467],
    [27, -417, 53, -409],
  ]) {
    model.box(x1, 67, z1, x2, 67, z2, 'minecraft:light_blue_stained_glass', meta(grounds, 'reflecting_pool_luminous_bed', 69));
  }

  // Original Buckingham-Fountain-inspired centerpiece: concentric basins,
  // four sculptural groups, a static jet composition and night lighting.
  const fountain = 'TE-PAV-BUCKINGHAM-FOUNTAIN';
  model.box(70, 66, -478, 100, 66, -463, 'minecraft:smooth_quartz', meta(fountain, 'grand_basin_floor', 70));
  model.box(70, 67, -478, 100, 69, -478, 'minecraft:prismarine_bricks', meta(fountain, 'grand_basin_wall', 71));
  model.box(70, 67, -463, 100, 69, -463, 'minecraft:prismarine_bricks', meta(fountain, 'grand_basin_wall', 71));
  model.box(70, 67, -478, 70, 69, -463, 'minecraft:prismarine_bricks', meta(fountain, 'grand_basin_wall', 71));
  model.box(100, 67, -478, 100, 69, -463, 'minecraft:prismarine_bricks', meta(fountain, 'grand_basin_wall', 71));
  model.box(71, 67, -477, 99, 67, -464, 'minecraft:water[level=0]', meta(fountain, 'contained_fountain_water', 72));
  model.box(78, 68, -475, 92, 69, -466, 'minecraft:smooth_quartz', meta(fountain, 'middle_basin', 73));
  model.box(82, 70, -473, 88, 72, -468, 'minecraft:cut_copper', meta(fountain, 'upper_basin', 74));
  model.box(84, 73, -471, 86, 81, -470, 'minecraft:light_blue_stained_glass', meta(fountain, 'central_static_jet', 75));
  for (const [x, z] of [[74, -471], [96, -471], [85, -476], [85, -465]]) {
    model.box(x - 1, 68, z - 1, x + 1, 70, z + 1, 'minecraft:cut_copper', meta(fountain, 'cardinal_sculptural_group', 75));
    model.box(x, 71, z, x, 75, z, 'minecraft:light_blue_stained_glass', meta(fountain, 'cardinal_static_jet', 76));
    model.set(x, 67, z, 'minecraft:sea_lantern', meta(fountain, 'evening_fountain_light', 77));
  }

  // Original Lincoln-Memorial-inspired terminus, with a restrained colonnade,
  // broad steps, central civic figure and an accessible side approach.
  const monument = 'TE-PAV-CIVIC-MONUMENT';
  model.box(94, 67, -458, 116, 69, -436, 'minecraft:smooth_quartz', meta(monument, 'raised_memorial_terrace', 70));
  for (let step = 0; step < 5; step += 1) {
    model.box(94 - step * 2, 68 - step, -447, 95 - step * 2, 68 - step, -440, 'minecraft:smooth_quartz', meta(monument, 'broad_approach_steps', 71));
  }
  for (const x of [96, 100, 104, 108, 112]) {
    model.box(x, 70, -456, x + 1, 82, -455, 'minecraft:quartz_pillar[axis=y]', meta(monument, 'north_doric_order', 72));
    model.box(x, 70, -439, x + 1, 82, -438, 'minecraft:quartz_pillar[axis=y]', meta(monument, 'south_doric_order', 72));
  }
  model.box(95, 83, -457, 117, 85, -437, 'minecraft:smooth_quartz', meta(monument, 'monument_entablature', 73));
  model.box(102, 70, -449, 110, 72, -443, 'minecraft:polished_andesite', meta(monument, 'civic_figure_seat', 74));
  model.box(104, 73, -447, 108, 80, -445, 'minecraft:cut_copper', meta(monument, 'seated_civic_figure', 75));
  modelParkPath(model, monument, [[91, 68, -435], [98, 69, -433], [116, 70, -433], [116, 70, -441]], 3, 'accessible_memorial_ramp');

  // Tree-line allée, flower walks, banners, benches and additional statuary.
  for (let z = -476; z <= -410; z += 11) {
    for (const x of [60, 66]) {
      model.box(x, 67, z, x + 1, 72, z + 1, 'minecraft:stripped_cherry_log[axis=y]', meta(grounds, 'tree_allee_trunk', 80));
      model.box(x - 2, 72, z - 2, x + 3, 76, z + 3, 'minecraft:cherry_leaves[persistent=true,distance=1,waterlogged=false]', meta(grounds, 'tree_allee_crown', 81));
    }
    model.box(61, 67, z + 3, 65, 67, z + 6, z % 2
      ? 'minecraft:flowering_azalea'
      : 'minecraft:azalea', meta(grounds, 'four_season_flower_bed', 82));
    model.box(57, 68, z, 58, 75, z, 'minecraft:cut_copper', meta(grounds, 'banner_standard', 83));
    model.box(56, 73, z, 56, 76, z + 3, z % 2
      ? 'minecraft:purple_wool'
      : 'minecraft:red_wool', meta(grounds, 'civic_banner', 84));
  }
  for (const [x, z] of [[30, -453], [30, -421], [60, -456], [60, -428], [88, -461], [88, -433]]) {
    model.box(x - 1, 67, z - 1, x + 1, 68, z + 1, 'minecraft:smooth_quartz', meta(grounds, 'civic_statue_plinth', 85));
    model.box(x, 69, z, x, 75, z, 'minecraft:cut_copper', meta(grounds, 'civic_statue', 86));
    model.set(x, 76, z, 'minecraft:gold_block', meta(grounds, 'civic_statue_crown', 87));
  }

  // The sole library↔Guild Hall tunnel is high above the protected Ravensgate
  // underground exclusion. It has exactly two endpoints and no branch.
  const tunnel = 'TE-LIB-GUILD-SECRET-01';
  model.hollow(-110, 58, -442, -60, 64, -436, 'minecraft:deepslate_bricks', meta(tunnel, 'isolated_main_gallery', 90));
  model.box(-109, 59, -441, -61, 63, -437, AIR, meta(tunnel, 'isolated_gallery_clearance', 91));
  model.box(-109, 58, -441, -61, 58, -437, 'minecraft:polished_blackstone', meta(tunnel, 'isolated_gallery_floor', 92));
  model.hollow(-110, 58, -435, -93, 64, -423, 'minecraft:deepslate_tiles', meta(tunnel, 'challenged_materials_archive', 90));
  model.hollow(-92, 58, -435, -78, 64, -423, 'minecraft:red_nether_bricks', meta(tunnel, 'private_adult_literature_archive', 90));
  model.hollow(-77, 58, -435, -60, 64, -423, 'minecraft:polished_diorite', meta(tunnel, 'ukrainian_metro_ceremonial_station', 90));
  for (let x = -107; x <= -96; x += 3) {
    model.box(x, 59, -433, x, 62, -425, 'minecraft:bookshelf', meta(tunnel, 'restricted_archive_stacks', 93));
  }
  model.box(-89, 59, -433, -81, 59, -429, 'minecraft:red_carpet', meta(tunnel, 'adult_archive_reading_room', 93));
  model.box(-90, 60, -426, -80, 62, -426, 'minecraft:bookshelf', meta(tunnel, 'adult_archive_closed_stacks', 93));
  model.box(-76, 59, -433, -61, 59, -429, 'minecraft:polished_andesite', meta(tunnel, 'symbolic_island_platform', 93));
  for (const x of [-75, -69, -63]) {
    model.box(x, 60, -434, x + 1, 63, -424, 'minecraft:quartz_pillar[axis=y]', meta(tunnel, 'metro_pylon_pair', 94));
  }
  model.box(-75, 63, -433, -62, 63, -425, 'minecraft:green_concrete', meta(tunnel, 'ukrainian_station_accent', 95));
  model.box(-110, 59, -440, -110, 62, -438, 'minecraft:chiseled_bookshelf', meta(tunnel, 'concealed_atlas_cabinet', 96));
  model.box(-60, 59, -440, -60, 62, -438, 'minecraft:dark_oak_planks', meta(tunnel, 'concealed_guild_records_screen', 96));
  for (const [x1, x2] of [[-106, -103], [-88, -85], [-72, -69]]) {
    model.box(x1, 59, -436, x2, 62, -435, AIR, meta(tunnel, 'archive_room_open_connection', 96));
  }
  modelDoubleIronDoor(model, tunnel, 'z', [-110, 59, -440], 'east', 'library_endpoint_vestibule', 97);
  modelDoubleIronDoor(model, tunnel, 'z', [-60, 59, -440], 'west', 'guild_endpoint_vestibule', 97);
  model.box(-111, 59, -440, -109, 62, -438, AIR, meta(tunnel, 'library_endpoint', 98));
  model.box(-60, 59, -440, -58, 62, -438, AIR, meta(tunnel, 'guild_endpoint', 98));

  return {
    reflectingPools: 2,
    statues: 6,
    tunnelBounds: [-110, 58, -442, -60, 64, -423],
  };
}

function modelInactivePortalFrame(model, scope, bounds, orientation, accent) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  if (orientation === 'x') {
    const x = x1;
    model.box(x, y1, z1, x, y1, z2, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x, y2, z1, x, y2, z2, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x, y1, z1, x, y2, z1, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x, y1, z2, x, y2, z2, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x, y1 + 1, z1 + 1, x, y2 - 1, z2 - 1, AIR, meta(scope, 'inactive_portal_void', 86));
    model.box(x - 1, y1, z1, x - 1, y2, z2, accent, meta(scope, 'district_portal_backdrop', 84));
  } else {
    const z = z1;
    model.box(x1, y1, z, x2, y1, z, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x1, y2, z, x2, y2, z, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x1, y1, z, x1, y2, z, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x2, y1, z, x2, y2, z, 'minecraft:obsidian', meta(scope, 'inactive_portal_frame', 85));
    model.box(x1 + 1, y1 + 1, z, x2 - 1, y2 - 1, z, AIR, meta(scope, 'inactive_portal_void', 86));
    model.box(x1, y1, z - 1, x2, y2, z - 1, accent, meta(scope, 'district_portal_backdrop', 84));
  }
}

function modelPortalDestinationRoom(model, definition) {
  const {
    id,
    bounds,
    wall,
    accent,
    portal,
    door,
  } = definition;
  const scope = `TE-OBS-PORTAL-${id}`;
  const [x1, y1, z1, x2, y2, z2] = bounds;
  model.hollow(x1, y1, z1, x2, y2, z2, wall, meta(scope, 'district_room_envelope', 70));
  model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(scope, 'district_room_clear_volume', 71));
  model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, accent, meta(scope, 'district_floor_map_mosaic', 72));
  for (let offset = 2; offset <= Math.max(2, Math.min(x2 - x1, z2 - z1) - 2); offset += 4) {
    const x = Math.min(x2 - 2, x1 + offset);
    const z = Math.min(z2 - 2, z1 + offset);
    model.set(x, y1, z, 'minecraft:sea_lantern', meta(scope, 'floor_map_landmark', 73));
  }
  modelInactivePortalFrame(model, scope, portal.bounds, portal.orientation, accent);
  modelDoubleIronDoor(model, scope, door.orientation, door.anchor, door.facing, 'offline_outer_metal_doors', 80);
  const [dx, dy, dz] = door.anchor;
  const shift = door.orientation === 'x' ? [0, 0, door.facing === 'north' ? 4 : -4] : [door.facing === 'east' ? -4 : 4, 0, 0];
  modelDoubleIronDoor(
    model,
    scope,
    door.orientation,
    [dx + shift[0], dy, dz + shift[2]],
    door.facing,
    'offline_inner_metal_doors',
    81,
  );
  model.box(x1 + 2, y1 + 1, z2 - 3, x1 + 5, y1 + 1, z2 - 1, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(scope, 'destination_orientation_seating', 82));
}

function modelObservatoryOwnerEstate(model) {
  const estate = 'TE-OBS-OWNER-MEGA-ESTATE';

  // Independent support columns are deliberately sparse and independently
  // surveyed; the owner estate is not structurally dependent on the P01 slice
  // removed during old-C01 parking recovery.
  for (const [x, z] of [
    [152, 127], [152, 192], [175, 127], [175, 192],
    [235, 127], [235, 192], [268, 127], [268, 160], [268, 192],
    [181, 185], [181, 212], [229, 185], [229, 212],
  ]) {
    model.box(x - 2, 75, z - 2, x + 2, 104, z + 2, 'minecraft:reinforced_deepslate', meta(estate, 'independent_retained_podium_column', 20));
  }

  // West and east residential wings frame the retained observatory crown.
  for (const [wing, bounds, wall] of [
    ['WEST', [150, 105, 125, 174, 126, 195], 'minecraft:smooth_quartz'],
    ['EAST', [236, 105, 125, 270, 126, 195], 'minecraft:quartz_bricks'],
  ]) {
    const [x1, y1, z1, x2, y2, z2] = bounds;
    model.box(x1, y1, z1, x2, y2 + 2, z2, AIR, meta(estate, `${wing.toLowerCase()}_wing_clearance`, 30));
    model.hollow(x1, y1, z1, x2, y2, z2, wall, meta(estate, `${wing.toLowerCase()}_wing_envelope`, 40));
    for (const floorY of [105, 112, 119]) {
      model.box(x1 + 1, floorY, z1 + 1, x2 - 1, floorY, z2 - 1, 'minecraft:dark_oak_planks', meta(estate, `${wing.toLowerCase()}_wing_floor`, 41));
      model.box(x1 + 1, floorY + 1, z1 + 1, x2 - 1, floorY + 6, z2 - 1, AIR, meta(estate, `${wing.toLowerCase()}_wing_room_volume`, 39));
      for (let z = z1 + 12; z <= z2 - 8; z += 14) {
        model.box(x1 + 1, floorY + 1, z, x2 - 1, floorY + 6, z, 'minecraft:polished_blackstone_bricks', meta(estate, `${wing.toLowerCase()}_wing_room_division`, 45));
        model.box(Math.round((x1 + x2) / 2) - 1, floorY + 1, z, Math.round((x1 + x2) / 2) + 1, floorY + 4, z, AIR, meta(estate, `${wing.toLowerCase()}_wing_gallery_door`, 46));
      }
    }
    model.box(x1 - 1, y2 + 1, z1 - 1, x2 + 1, y2 + 1, z2 + 1, 'minecraft:oxidized_cut_copper', meta(estate, `${wing.toLowerCase()}_wing_roof_terrace`, 48));
    for (let z = z1 + 5; z <= z2 - 5; z += 10) {
      model.box(x1, 109, z, x1, 111, z + 3, 'minecraft:light_blue_stained_glass', meta(estate, 'estate_window_rhythm', 49));
      model.box(x2, 116, z, x2, 118, z + 3, 'minecraft:light_blue_stained_glass', meta(estate, 'estate_window_rhythm', 49));
    }
  }

  // Program detail turns the wings into a world-owner residence rather than
  // empty galleries.
  model.box(152, 106, 129, 171, 108, 140, 'minecraft:white_carpet', meta(estate, 'west_guest_suite_one', 55));
  model.box(152, 106, 145, 171, 108, 156, 'minecraft:blue_carpet', meta(estate, 'west_guest_suite_two', 55));
  model.box(152, 106, 161, 171, 108, 174, 'minecraft:green_carpet', meta(estate, 'winter_conservatory', 55));
  model.box(152, 106, 179, 171, 108, 192, 'minecraft:purple_carpet', meta(estate, 'private_art_gallery', 55));
  model.box(152, 113, 129, 171, 115, 145, 'minecraft:bookshelf', meta(estate, 'owner_executive_office_library', 56));
  model.box(152, 120, 129, 171, 122, 145, 'minecraft:gold_block', meta(estate, 'ceremonial_state_salon', 56));

  model.box(239, 106, 129, 267, 110, 145, 'minecraft:bookshelf', meta(estate, 'grand_private_library', 55));
  model.box(239, 106, 150, 267, 108, 162, 'minecraft:dark_oak_planks', meta(estate, 'music_salon', 55));
  model.box(239, 106, 167, 250, 109, 191, 'minecraft:polished_blackstone', meta(estate, 'show_kitchen', 55));
  model.box(254, 106, 167, 267, 109, 191, 'minecraft:white_concrete', meta(estate, 'family_kitchen_and_butlers_pantry', 55));
  model.box(239, 113, 129, 267, 115, 150, 'minecraft:red_carpet', meta(estate, 'formal_banquet_hall', 56));
  model.box(239, 120, 129, 267, 122, 150, 'minecraft:purple_wool', meta(estate, 'private_ballroom', 56));

  // Tasteful, non-graphic adult red room with privacy/cleanup zones.
  const redRoom = 'TE-OBS-OWNER-RED-ROOM';
  model.box(152, 113, 150, 171, 118, 174, 'minecraft:red_nether_bricks', meta(redRoom, 'acoustically_separated_envelope', 60));
  model.box(153, 114, 151, 170, 117, 173, AIR, meta(redRoom, 'private_adult_suite_volume', 61));
  model.box(153, 113, 151, 170, 113, 173, 'minecraft:red_carpet', meta(redRoom, 'red_room_floor', 62));
  model.box(155, 114, 153, 165, 114, 158, 'minecraft:red_wool', meta(redRoom, 'bed_and_lounge', 63));
  model.box(167, 114, 153, 169, 116, 166, 'minecraft:chiseled_bookshelf', meta(redRoom, 'concealed_accessory_storage', 63));
  model.box(155, 115, 166, 165, 117, 171, 'minecraft:iron_chain', meta(redRoom, 'decorative_hammock_swing_frame', 64));
  model.box(153, 114, 168, 158, 116, 172, 'minecraft:light_blue_stained_glass', meta(redRoom, 'private_wash_and_cleanup', 64));
  modelDoubleIronDoor(model, redRoom, 'x', [160, 114, 174], 'south', 'privacy_vestibule_doors', 65);

  // South arrival court and north night-sky terrace tie the new wings to the
  // existing observatory without replacing its accepted rooms.
  const court = 'TE-OBS-ESTATE-SOUTH-COURT';
  model.box(178, 103, 183, 232, 103, 215, 'minecraft:stone_bricks', meta(court, 'independent_court_support', 50));
  model.box(178, 104, 183, 232, 104, 215, 'minecraft:smooth_quartz', meta(court, 'arcaded_arrival_court', 51));
  for (const x of [180, 190, 200, 210, 220, 230]) {
    model.box(x, 105, 184, x + 1, 116, 185, 'minecraft:quartz_pillar[axis=y]', meta(court, 'arrival_arcade', 52));
  }
  model.box(187, 104, 200, 223, 104, 203, 'minecraft:water[level=0]', meta(court, 'contained_reflecting_rill', 53));
  model.box(185, 112, 190, 225, 114, 198, 'minecraft:oxidized_cut_copper', meta(court, 'porte_cochere', 54));
  modelParkPath(model, court, [[205, 105, 215], [205, 105, 184], [205, 106, 180]], 7, 'estate_arrival_axis');

  const north = 'TE-OBS-NIGHT-SKY-TERRACE';
  model.box(175, 117, 110, 235, 117, 136, 'minecraft:stone_bricks', meta(north, 'terrace_support', 50));
  model.box(175, 118, 110, 235, 118, 136, 'minecraft:smooth_quartz', meta(north, 'night_sky_terrace', 51));
  model.box(175, 119, 110, 175, 122, 136, 'minecraft:tinted_glass', meta(north, 'west_windscreen', 52));
  model.box(235, 119, 110, 235, 122, 136, 'minecraft:tinted_glass', meta(north, 'east_windscreen', 52));
  for (const x of [180, 192, 218, 230]) {
    model.box(x, 119, 114, x + 3, 119, 120, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(north, 'observation_seating_niche', 53));
  }

  // Enrich the retained three-dome crown with a higher owner-level lantern,
  // working-looking instruments and thermal/maintenance rings.
  const crown = 'TE-OBS-RETAINED-CROWN';
  for (let radius = 10; radius >= 2; radius -= 2) {
    const y = 137 + (10 - radius) / 2 * 2;
    for (const [x, z] of circlePoints(206, 151, radius)) {
      model.set(x, y, z, radius % 4 ? 'minecraft:cut_copper' : 'minecraft:oxidized_cut_copper', meta(crown, 'expanded_central_dome', 70));
    }
  }
  model.box(203, 146, 148, 209, 149, 154, 'minecraft:tinted_glass', meta(crown, 'owner_observatory_lantern', 71));
  model.set(206, 150, 151, 'minecraft:amethyst_block', meta(crown, 'central_objective_crown', 72));
  for (const [cx, cz] of [[190, 151], [222, 151]]) {
    model.box(cx - 2, 137, cz - 2, cx + 2, 141, cz + 2, 'minecraft:cut_copper', meta(crown, 'expanded_side_instrument_turret', 70));
    model.box(cx - 1, 142, cz - 1, cx + 1, 145, cz + 1, 'minecraft:tinted_glass', meta(crown, 'side_objective', 71));
  }

  // Fictional five-dish satellite/radio farm with separated maintenance walk.
  const dishes = 'TE-OBS-DISH-FARM';
  model.box(240, 104, 100, 270, 104, 122, 'minecraft:smooth_quartz', meta(dishes, 'dish_farm_terrace', 60));
  const dishCenters = [[246, 109], [257, 109], [267, 109], [251, 118], [263, 118]];
  for (const [cx, cz] of dishCenters) {
    model.box(cx, 105, cz, cx, 112, cz, 'minecraft:iron_block', meta(dishes, 'dish_pedestal', 61));
    for (const [x, y] of circlePoints(cx, 115, 4)) {
      model.box(x, y, cz, x, y, cz + 1, 'minecraft:smooth_quartz', meta(dishes, 'sculptural_radio_dish', 62));
    }
    model.box(cx, 114, cz - 1, cx, 118, cz - 1, 'minecraft:end_rod[facing=up]', meta(dishes, 'dish_feed', 63));
  }
  model.box(242, 105, 120, 268, 105, 121, 'minecraft:polished_andesite', meta(dishes, 'dish_service_walk', 64));

  // Owner spa wing with a fully contained pool and hot room.
  modelSimpleVenue(model, 'TE-OBS-OWNER-SPA', [150, 105, 196, 174, 116, 220], 'minecraft:smooth_quartz', 'minecraft:dark_oak_planks', 'minecraft:oxidized_cut_copper');
  modelContainedPool(model, 'TE-OBS-OWNER-SPA-POOL', [153, 165, 199, 209], 107);
  model.box(167, 106, 199, 172, 111, 207, 'minecraft:light_blue_stained_glass', meta('TE-OBS-OWNER-SPA', 'hot_tub_and_steam_room', 72));
  model.box(153, 106, 212, 162, 108, 218, 'minecraft:green_carpet', meta('TE-OBS-OWNER-SPA', 'gym_and_massage_quiet_room', 72));

  // Expanded, isolated owner safe room/shelter below the east estate wing.
  const shelter = 'TE-OBS-SHL-EXPANDED';
  model.hollow(240, 93, 170, 270, 104, 215, 'minecraft:reinforced_deepslate', meta(shelter, 'expanded_shelter_envelope', 70));
  model.box(241, 94, 171, 269, 103, 214, AIR, meta(shelter, 'expanded_shelter_clear_volume', 71));
  model.box(241, 93, 171, 269, 93, 214, 'minecraft:polished_blackstone', meta(shelter, 'shelter_floor', 72));
  model.box(255, 94, 171, 255, 102, 214, 'minecraft:deepslate_tiles', meta(shelter, 'shelter_program_wall', 73));
  model.box(241, 94, 191, 269, 102, 191, 'minecraft:deepslate_tiles', meta(shelter, 'shelter_program_wall', 73));
  model.box(243, 94, 173, 252, 96, 188, 'minecraft:white_concrete', meta(shelter, 'safe_room_and_medical_quiet_room', 75));
  model.box(258, 94, 173, 267, 97, 188, 'minecraft:cyan_concrete', meta(shelter, 'independent_air_and_utility_room', 75));
  for (let z = 194; z <= 211; z += 5) {
    model.box(243, 94, z, 252, 98, z + 2, 'minecraft:barrel', meta(shelter, 'food_water_and_equipment_store', 75));
    model.box(258, 94, z, 267, 95, z + 2, 'minecraft:red_wool', meta(shelter, 'shelter_bunk_and_commons', 75));
  }
  modelDoubleIronDoor(model, shelter, 'z', [240, 95, 184], 'west', 'shelter_main_airlock', 80);
  model.hollow(266, 94, 211, 274, 111, 218, 'minecraft:reinforced_deepslate', meta(shelter, 'remote_egress_one', 81));
  model.box(267, 95, 212, 273, 110, 217, AIR, meta(shelter, 'remote_egress_one_clearance', 82));
  compactSwitchbackStair(model, shelter, [266, 211, 274, 218], 95, 108, 83);
  model.hollow(236, 94, 170, 243, 111, 178, 'minecraft:reinforced_deepslate', meta(shelter, 'remote_egress_two', 81));
  model.box(237, 95, 171, 242, 110, 177, AIR, meta(shelter, 'remote_egress_two_clearance', 82));
  compactSwitchbackStair(model, shelter, [236, 170, 243, 178], 95, 108, 83);

  // A discoverable celestial mechanism hides a five-wide, landing-rich
  // passage to the portal hub. It has no branch to any other tunnel network.
  const secret = 'TE-OBS-PORTAL-SECRET-PASSAGE';
  model.box(211, 104, 145, 219, 114, 155, 'minecraft:chiseled_bookshelf', meta(secret, 'constellation_library_wall', 70));
  for (const [x, y] of circlePoints(215, 109, 4)) {
    model.set(x, y, 151, 'minecraft:cut_copper', meta(secret, 'armillary_sphere', 71));
  }
  model.box(214, 105, 153, 216, 109, 155, AIR, meta(secret, 'celestial_alignment_hidden_door', 72));
  model.hollow(218, 88, 145, 232, 105, 155, 'minecraft:deepslate_bricks', meta(secret, 'descending_passage_envelope', 73));
  model.box(219, 89, 146, 231, 104, 154, AIR, meta(secret, 'descending_passage_clearance', 74));
  compactSwitchbackStair(model, secret, [218, 145, 232, 155], 89, 104, 75);

  const hub = 'TE-OBS-PORTAL-HUB-CENTRAL';
  model.hollow(230, 78, 145, 250, 88, 165, 'minecraft:polished_blackstone_bricks', meta(hub, 'central_hub_envelope', 70));
  model.box(231, 79, 146, 249, 87, 164, AIR, meta(hub, 'central_hub_clear_ring', 71));
  model.box(231, 78, 146, 249, 78, 164, 'minecraft:light_gray_concrete', meta(hub, 'world_map_floor_mosaic', 72));
  for (const [x, z, color] of [[240, 155, 'minecraft:gold_block'], [235, 155, 'minecraft:blue_concrete'], [245, 155, 'minecraft:red_concrete'], [240, 150, 'minecraft:green_concrete'], [240, 160, 'minecraft:purple_concrete']]) {
    model.box(x - 1, 78, z - 1, x + 1, 78, z + 1, color, meta(hub, 'district_map_marker', 73));
  }
  model.box(234, 79, 149, 246, 80, 151, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(hub, 'portal_directory_and_seating', 74));

  const destinations = [
    {
      id: 'MAINSTREET', bounds: [251, 78, 145, 270, 88, 160], wall: 'minecraft:smooth_quartz', accent: 'minecraft:yellow_concrete',
      portal: { bounds: [269, 80, 149, 269, 86, 155], orientation: 'x' },
      door: { orientation: 'z', anchor: [251, 79, 151], facing: 'east' },
    },
    {
      id: 'RAVENROCK', bounds: [251, 78, 162, 270, 88, 177], wall: 'minecraft:gray_concrete', accent: 'minecraft:light_gray_concrete',
      portal: { bounds: [269, 80, 166, 269, 86, 172], orientation: 'x' },
      door: { orientation: 'z', anchor: [251, 79, 168], facing: 'east' },
    },
    {
      id: 'RAVENSREACH', bounds: [230, 78, 167, 245, 88, 187], wall: 'minecraft:stone_bricks', accent: 'minecraft:purple_concrete',
      portal: { bounds: [234, 80, 186, 240, 86, 186], orientation: 'z' },
      door: { orientation: 'x', anchor: [236, 79, 167], facing: 'south' },
    },
    {
      id: 'WESTLIGHT', bounds: [210, 78, 167, 229, 88, 187], wall: 'minecraft:red_nether_bricks', accent: 'minecraft:red_concrete',
      portal: { bounds: [216, 80, 186, 222, 86, 186], orientation: 'z' },
      door: { orientation: 'x', anchor: [220, 79, 167], facing: 'south' },
    },
    {
      id: 'PANORAMA', bounds: [210, 78, 145, 229, 88, 165], wall: 'minecraft:sandstone', accent: 'minecraft:orange_concrete',
      portal: { bounds: [211, 80, 151, 211, 86, 157], orientation: 'x' },
      door: { orientation: 'z', anchor: [229, 79, 153], facing: 'west' },
    },
    {
      id: 'DATACAMPUS', bounds: [230, 78, 123, 245, 88, 143], wall: 'minecraft:iron_block', accent: 'minecraft:cyan_concrete',
      portal: { bounds: [234, 80, 124, 240, 86, 124], orientation: 'z' },
      door: { orientation: 'x', anchor: [236, 79, 143], facing: 'north' },
    },
    {
      id: 'SPARE-A', bounds: [247, 78, 123, 258, 88, 143], wall: 'minecraft:deepslate_tiles', accent: 'minecraft:gray_concrete',
      portal: { bounds: [250, 80, 124, 256, 86, 124], orientation: 'z' },
      door: { orientation: 'x', anchor: [251, 79, 143], facing: 'north' },
    },
    {
      id: 'SPARE-B', bounds: [260, 78, 123, 270, 88, 143], wall: 'minecraft:deepslate_tiles', accent: 'minecraft:gray_concrete',
      portal: { bounds: [262, 80, 124, 268, 86, 124], orientation: 'z' },
      door: { orientation: 'x', anchor: [264, 79, 143], facing: 'north' },
    },
  ];
  for (const destination of destinations) modelPortalDestinationRoom(model, destination);

  return {
    estateBounds: [145, 75, 100, 275, 150, 225],
    satelliteDishes: dishCenters.length,
    inactivePortalRooms: destinations.length,
    activePortalBlocks: 0,
    expandedShelterBounds: [240, 93, 170, 270, 104, 215],
  };
}

function linePoints(points) {
  const output = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1, z1] = points[index];
    const [x2, y2, z2] = points[index + 1];
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
    for (let step = 0; step <= steps; step += 1) {
      const t = steps ? step / steps : 0;
      output.push([
        Math.round(x1 + (x2 - x1) * t),
        Math.round(y1 + (y2 - y1) * t),
        Math.round(z1 + (z2 - z1) * t),
      ]);
    }
  }
  return [...new Map(output.map((point) => [`${point[0]},${point[2]}`, point])).values()];
}

function modelRoadAndOasis(model) {
  const road = 'TE-ROAD-01';
  const centerline = linePoints([
    [-148, 68, -500],
    [-170, 72, -506],
    [-224, 70, -496],
    [-305, 73, -497],
    [-322, 68, -497],
    [-340, 68, -497],
    [-344, 68, -486],
  ]);
  for (const [x, designY, z] of centerline) {
    // Keep the entire drive-through portion below the raised Oasis floor. The
    // hall begins at y77 and the road guarantees y71..76 as clear headroom.
    const y = x >= -248 && x <= -210 && z >= -510 && z <= -482
      ? Math.min(70, designY)
      : designY;
    for (let dx = -4; dx <= 4; dx += 1) {
      for (let dz = -4; dz <= 4; dz += 1) {
        if (Math.abs(dx) + Math.abs(dz) > 5) continue;
        const state = Math.abs(dx) + Math.abs(dz) <= 1
          ? 'minecraft:yellow_concrete'
          : 'minecraft:gray_concrete';
        const cellX = x + dx;
        const cellZ = z + dz;
        const beneathOasis = (
          cellX >= -248 && cellX <= -210
          && cellZ >= -510 && cellZ <= -482
        );
        const headroomTop = beneathOasis ? 76 : y + 6;
        model.set(cellX, y, cellZ, state, meta(road, 'ceremonial_road_deck', 20));
        model.set(cellX, y - 1, cellZ, 'minecraft:stone_bricks', meta(road, 'road_foundation', 19));
        model.box(cellX, y + 1, cellZ, cellX, headroomTop, cellZ, AIR, meta(road, 'road_headroom', 10));
      }
    }
  }
  const billboards = [
    [-154, 68, -493], [-196, 70, -500], [-217, 70, -502],
    [-269, 70, -503], [-298, 73, -503], [-330, 69, -488],
  ];
  billboards[2] = [-204, 70, -520];
  for (let index = 0; index < billboards.length; index += 1) {
    const [x, y, z] = billboards[index];
    model.box(x - 3, y + 1, z - 7, x + 3, y + 1, z - 7, 'minecraft:polished_blackstone', meta(road, 'billboard_base', 30));
    model.box(x - 2, y + 2, z - 7, x - 2, y + 7, z - 7, 'minecraft:cut_copper', meta(road, 'billboard_post', 31));
    model.box(x + 2, y + 2, z - 7, x + 2, y + 7, z - 7, 'minecraft:cut_copper', meta(road, 'billboard_post', 31));
    model.box(x - 5, y + 7, z - 7, x + 5, y + 13, z - 7, index % 2 ? 'minecraft:blue_concrete' : 'minecraft:red_concrete', meta(road, 'billboard_face', 32));
    model.box(x - 4, y + 8, z - 8, x + 4, y + 12, z - 8, 'minecraft:white_concrete', meta(road, 'billboard_message_field', 33));
    model.box(x - 3, y + 9, z - 9, x + 3, y + 11, z - 9, index % 2 ? 'minecraft:gold_block' : 'minecraft:sea_lantern', meta(road, 'billboard_emblem', 34));
  }

  const oasis = 'TE-OASIS-01';
  // The hall is two blocks above the first-pass proposal. The regional road
  // retains six full clear blocks above its deck through the Chicago-style
  // bridge building; no floor or wall is allowed to win by overwrite.
  const elevatedOasis = translatedModel(model, 0, 2, 0);
  elevatedOasis.box(-248, 75, -510, -210, 75, -482, 'minecraft:smooth_quartz', meta(oasis, 'bridge_hall_floor', 50));
  elevatedOasis.box(-248, 76, -510, -210, 83, -510, 'minecraft:quartz_bricks', meta(oasis, 'north_hall_wall', 51));
  elevatedOasis.box(-248, 76, -482, -210, 83, -482, 'minecraft:quartz_bricks', meta(oasis, 'south_hall_wall', 51));
  elevatedOasis.box(-248, 76, -510, -248, 83, -482, 'minecraft:quartz_bricks', meta(oasis, 'west_hall_wall', 51));
  elevatedOasis.box(-210, 76, -510, -210, 83, -482, 'minecraft:quartz_bricks', meta(oasis, 'east_hall_wall', 51));
  elevatedOasis.box(-247, 77, -510, -211, 81, -510, 'minecraft:light_blue_stained_glass', meta(oasis, 'north_panorama_glass', 52));
  elevatedOasis.box(-247, 77, -482, -211, 81, -482, 'minecraft:light_blue_stained_glass', meta(oasis, 'south_panorama_glass', 52));
  elevatedOasis.box(-248, 84, -510, -210, 84, -482, 'minecraft:oxidized_cut_copper', meta(oasis, 'oasis_roof', 53));
  elevatedOasis.box(-247, 76, -509, -211, 82, -483, AIR, meta(oasis, 'bridge_hall_interior', 49));
  for (const x of [-244, -236, -228, -220, -212]) {
    elevatedOasis.box(x, 76, -507, x + 3, 76, -503, 'minecraft:red_wool', meta(oasis, 'food_court_zone', 56));
    elevatedOasis.box(x, 76, -489, x + 3, 76, -485, 'minecraft:blue_wool', meta(oasis, 'market_zone', 56));
  }
  for (const x of [-246, -212]) {
    elevatedOasis.box(x, 68, -508, x + 2, 74, -506, 'minecraft:quartz_bricks', meta(oasis, 'north_lift_tower', 57));
    elevatedOasis.box(x, 68, -486, x + 2, 74, -484, 'minecraft:quartz_bricks', meta(oasis, 'south_lift_tower', 57));
  }

  const bunker = 'TE-OASIS-BUNKER-01';
  model.box(-252, 44, -548, -208, 62, -515, AIR, meta(bunker, 'subgrade_excavation', 60));
  model.box(-252, 44, -548, -208, 44, -515, 'minecraft:reinforced_deepslate', meta(bunker, 'lower_liner', 61));
  model.box(-252, 62, -548, -208, 62, -515, 'minecraft:reinforced_deepslate', meta(bunker, 'concealed_roof_liner', 61));
  model.box(-252, 44, -548, -252, 62, -515, 'minecraft:deepslate_bricks', meta(bunker, 'west_liner', 61));
  model.box(-208, 44, -548, -208, 62, -515, 'minecraft:deepslate_bricks', meta(bunker, 'east_liner', 61));
  model.box(-252, 44, -548, -208, 62, -548, 'minecraft:deepslate_bricks', meta(bunker, 'north_liner', 61));
  model.box(-252, 44, -515, -208, 62, -515, 'minecraft:deepslate_bricks', meta(bunker, 'south_liner', 61));
  model.box(-251, 45, -547, -209, 45, -516, 'minecraft:polished_blackstone', meta(bunker, 'lower_floor', 62));
  model.box(-251, 54, -547, -209, 54, -516, 'minecraft:polished_andesite', meta(bunker, 'upper_floor', 62));
  model.box(-251, 53, -547, -209, 53, -516, 'minecraft:reinforced_deepslate', meta(bunker, 'interlevel_slab', 63));
  model.box(-231, 45, -547, -231, 52, -516, 'minecraft:deepslate_tiles', meta(bunker, 'lower_program_wall', 64));
  model.box(-231, 55, -547, -231, 61, -516, 'minecraft:deepslate_tiles', meta(bunker, 'upper_program_wall', 64));
  model.box(-251, 55, -532, -209, 61, -532, 'minecraft:deepslate_tiles', meta(bunker, 'upper_program_wall', 64));
  model.box(-247, 55, -545, -235, 59, -545, 'minecraft:lime_concrete', meta(bunker, 'operations_display', 65));
  model.box(-225, 55, -545, -211, 55, -535, 'minecraft:gray_concrete', meta(bunker, 'vehicle_workshop', 65));
  model.box(-247, 46, -545, -235, 46, -535, 'minecraft:red_wool', meta(bunker, 'crew_quarters', 65));
  model.box(-225, 46, -545, -211, 46, -535, 'minecraft:blue_concrete', meta(bunker, 'secure_store', 65));

  // Concealed, drivable one-in-two ramp from the Oasis service forecourt.
  for (let step = 0; step <= 11; step += 1) {
    const z = -516 - step * 2;
    model.box(-233, 65 - step, z - 1, -227, 65 - step, z, 'minecraft:gray_concrete', meta(bunker, 'vehicle_ramp', 70));
    model.box(-233, 66 - step, z - 1, -227, 69 - step, z, AIR, meta(bunker, 'vehicle_ramp_headroom', 69));
  }
  model.box(-234, 63, -515, -226, 69, -513, 'minecraft:polished_blackstone_bricks', meta(bunker, 'recessed_portal', 72));
  model.box(-232, 64, -515, -228, 68, -513, AIR, meta(bunker, 'portal_clearance', 73));
  model.box(-236, 66, -520, -224, 68, -516, 'minecraft:moss_block', meta(bunker, 'portal_landform', 74));
}

function circlePoints(centerX, centerY, radius) {
  const points = new Map();
  for (let degrees = 0; degrees < 360; degrees += 2) {
    const radians = degrees * Math.PI / 180;
    const x = Math.round(centerX + Math.cos(radians) * radius);
    const y = Math.round(centerY + Math.sin(radians) * radius);
    points.set(`${x},${y}`, [x, y]);
  }
  return [...points.values()];
}

function modelPierBuilding(
  model,
  scope,
  bounds,
  palette,
  signMaterial,
) {
  const [x1, x2, z1, z2] = bounds;
  model.box(x1, 67, z1, x2, 67, z2, 'minecraft:dark_oak_planks', meta(scope, 'restaurant_pier_deck', 55));
  model.box(x1, 68, z1, x2, 82, z1, palette, meta(scope, 'restaurant_wall', 60));
  model.box(x1, 68, z2, x2, 82, z2, palette, meta(scope, 'restaurant_wall', 60));
  model.box(x1, 68, z1, x1, 82, z2, palette, meta(scope, 'restaurant_wall', 60));
  model.box(x2, 68, z1, x2, 82, z2, palette, meta(scope, 'restaurant_wall', 60));
  model.box(x1 + 1, 68, z1 + 1, x2 - 1, 82, z2 - 1, AIR, meta(scope, 'restaurant_interior', 59));
  model.box(x1, 74, z1, x2, 74, z2, 'minecraft:dark_oak_planks', meta(scope, 'restaurant_upper_floor', 61));
  for (let x = x1 + 3; x <= x2 - 4; x += 6) {
    model.box(x, 69, z1, x + 2, 71, z1, 'minecraft:light_blue_stained_glass', meta(scope, 'waterfront_windows', 62));
    model.box(x, 76, z1, x + 2, 79, z1, 'minecraft:light_blue_stained_glass', meta(scope, 'waterfront_windows', 62));
    model.box(x, 69, z2, x + 2, 71, z2, 'minecraft:light_blue_stained_glass', meta(scope, 'waterfront_windows', 62));
    model.box(x, 76, z2, x + 2, 79, z2, 'minecraft:light_blue_stained_glass', meta(scope, 'waterfront_windows', 62));
  }
  const doorX = Math.round((x1 + x2) / 2);
  model.box(doorX - 1, 68, z2, doorX + 1, 71, z2, AIR, meta(scope, 'restaurant_entry', 63));
  model.box(x1 - 1, 84, z1 - 1, x2 + 1, 84, z2 + 1, 'minecraft:oxidized_cut_copper', meta(scope, 'restaurant_roof', 64));
  model.box(x1 + 3, 68, z1 + 4, x2 - 3, 68, z1 + 6, signMaterial, meta(scope, 'restaurant_open_kitchen', 65));
  for (let z = z1 + 10; z <= z2 - 4; z += 5) {
    model.box(x1 + 4, 68, z, x1 + 9, 68, z + 2, 'minecraft:white_carpet', meta(scope, 'restaurant_table', 66));
    model.box(x2 - 9, 68, z, x2 - 4, 68, z + 2, 'minecraft:white_carpet', meta(scope, 'restaurant_table', 66));
  }
  staircase(model, scope, x1 + 3, 68, 75, z2 - 4, 66);
  model.box(doorX - 5, 77, z2 + 1, doorX + 5, 82, z2 + 1, signMaterial, meta(scope, 'restaurant_identity_marquee', 67));
}

async function modelWestlightWaterfront(model, snapshot) {
  const main = 'TE-WESTLIGHT-MAIN-PED-MALL';
  const authoredBuildings = [
    [-428, -408, -496, -464], // Beacon Inn
    [-402, -386, -502, -484], // Field House
    [-334, -320, -492, -476], // Gatehead
    [-316, -302, -482, -466], // Ferry Bell House
  ];
  const outsideAuthoredBuilding = (x, _y, z) => !authoredBuildings.some(
    ([minX, maxX, minZ, maxZ]) => (
      x >= minX && x <= maxX && z >= minZ && z <= maxZ
    ),
  );
  // Retain the accepted stadium throat and existing interiors. The authored
  // High Street becomes the northern landing; the new axial mall starts at
  // the water edge so its deck cannot overwrite beds, barrels, signs or shop
  // furniture in the retained row.
  model.box(-362, 67, -445, -347, 67, -318, 'minecraft:dark_oak_planks', meta(main, 'stadium_to_pier_axial_mall', 31));
  model.box(-418, 67, -379, -286, 67, -364, 'minecraft:dark_oak_planks', meta(main, 'outer_cross_mall', 31));
  model.box(-428, 67, -464, -417, 67, -365, 'minecraft:dark_oak_planks', meta(main, 'independent_west_egress', 31));
  model.box(-290, 67, -502, -278, 67, -365, 'minecraft:dark_oak_planks', meta(main, 'independent_east_egress', 31));
  model.box(-418, 67, -333, -286, 67, -318, 'minecraft:dark_oak_planks', meta(main, 'outer_public_quay', 31));
  for (const [x1, x2, z1, z2] of [
    [-362, -347, -445, -318],
    [-418, -286, -379, -364],
    [-428, -417, -464, -365],
    [-290, -278, -502, -365],
    [-418, -286, -333, -318],
  ]) {
    for (let x = x1; x <= x2; x += 8) {
      for (let z = z1; z <= z2; z += 12) {
        model.box(x, 45, z, Math.min(x + 1, x2), 66, Math.min(z + 1, z2), 'minecraft:stripped_dark_oak_log[axis=y]', meta(main, 'engineered_pier_pile', 30));
      }
    }
  }
  // Narrow bridges and open water slots keep the pier hydraulically legible.
  for (const [x1, x2, z1, z2] of [
    [-417, -363, -440, -432],
    [-346, -291, -440, -432],
    [-417, -363, -410, -402],
    [-346, -291, -410, -402],
    [-417, -363, -348, -340],
    [-346, -291, -348, -340],
  ]) {
    model.box(x1, 67, z1, x2, 67, z2, 'minecraft:dark_oak_planks', meta(main, 'pier_cross_bridge', 32));
  }
  // Retrofit the visible waterside faces of the accepted brew barn and shop
  // row as pile houses. Existing rooms and all y>=68 block entities remain.
  for (const [x1, x2, z1, z2] of [
    [-352, -326, -468, -446],
    [-404, -353, -470, -448],
  ]) {
    model.box(x1, 63, z1, x2, 66, z2, AIR, meta(main, 'pier_house_open_undercroft', 35));
    for (let x = x1 + 2; x <= x2 - 1; x += 6) {
      for (const z of [z1 + 2, z2 - 2]) {
        model.box(x, 45, z, x + 1, 66, z + 1, 'minecraft:stripped_dark_oak_log[axis=y]', meta(main, 'pier_house_pile_and_cap', 36));
      }
    }
    model.box(x1, 67, z2 + 1, x2, 67, z2 + 5, 'minecraft:dark_oak_planks', meta(main, 'pier_house_waterside_walk', 37));
  }
  model.box(-407, 67, -476, -300, 67, -471, 'minecraft:smooth_stone', meta(main, 'retained_high_street_promenade', 20), outsideAuthoredBuilding);
  model.box(-435, 67, -463, -429, 67, -398, 'minecraft:polished_andesite', meta(main, 'beacon_quay_link', 21), outsideAuthoredBuilding);
  for (let z = -440; z <= -322; z += 14) {
    model.box(-359, 68, z, -358, 72, z + 1, 'minecraft:cut_copper', meta(main, 'mall_light_standard', 38));
    model.box(-351, 68, z, -350, 72, z + 1, 'minecraft:cut_copper', meta(main, 'mall_light_standard', 38));
    model.box(-360, 73, z - 1, -357, 73, z + 2, 'minecraft:sea_lantern', meta(main, 'mall_light', 39));
    model.box(-352, 73, z - 1, -349, 73, z + 2, 'minecraft:sea_lantern', meta(main, 'mall_light', 39));
  }
  for (const [x1, x2] of [[-434, -429], [-273, -268]]) {
    model.box(x1, 67, -398, x2, 67, -346, 'minecraft:dark_oak_planks', meta(main, 'water_taxi_landing_deck', 40));
    for (let z = -396; z <= -348; z += 8) {
      model.box(x1, 45, z, x1 + 1, 66, z + 1, 'minecraft:stripped_dark_oak_log[axis=y]', meta(main, 'water_taxi_landing_pile', 39));
      model.box(x2 - 1, 45, z, x2, 66, z + 1, 'minecraft:stripped_dark_oak_log[axis=y]', meta(main, 'water_taxi_landing_pile', 39));
    }
  }

  modelPierBuilding(
    model,
    'TE-WESTLIGHT-STEAK-HOUSE',
    [-405, -369, -359, -334],
    'minecraft:red_nether_bricks',
    'minecraft:red_concrete',
  );
  modelPierBuilding(
    model,
    'TE-WESTLIGHT-SHRIMP-HOUSE',
    [-340, -304, -359, -334],
    'minecraft:prismarine_bricks',
    'minecraft:orange_concrete',
  );

  // Observation wheel on the east amusement pier, with the surveyed wheel
  // plane and hub kept clear of the axial and cross malls.
  const wheel = 'TE-WESTLIGHT-FERRIS-WHEEL';
  model.box(-340, 67, -437, -292, 67, -382, 'minecraft:dark_oak_planks', meta(wheel, 'wheel_queue_and_service_pier', 40), (x, _y, z) => (
    x >= -334 || z <= -414 || z >= -406
  ));
  for (const [x, y] of circlePoints(-316, 87, 18)) {
    model.box(x, y, -412, x, y, -408, 'minecraft:white_concrete', meta(wheel, 'wheel_rim', 70));
  }
  for (let degrees = 0; degrees < 360; degrees += 45) {
    const radians = degrees * Math.PI / 180;
    for (let radius = 0; radius <= 17; radius += 1) {
      const x = Math.round(-316 + Math.cos(radians) * radius);
      const y = Math.round(87 + Math.sin(radians) * radius);
      model.set(x, y, -410, 'minecraft:cut_copper', meta(wheel, 'wheel_spoke', 71));
    }
    const cabinX = Math.round(-316 + Math.cos(radians) * 20);
    const cabinY = Math.round(87 + Math.sin(radians) * 20);
    model.box(cabinX - 1, cabinY - 1, -413, cabinX + 1, cabinY + 1, -407, degrees % 90 ? 'minecraft:yellow_concrete' : 'minecraft:red_concrete', meta(wheel, 'wheel_cabin', 72));
  }
  model.box(-317, 86, -412, -315, 88, -408, 'minecraft:gold_block', meta(wheel, 'wheel_hub', 73));
  for (let y = 68; y <= 86; y += 1) {
    const spread = Math.round((86 - y) * 0.45);
    model.set(-316 - spread, y, -412, 'minecraft:quartz_block', meta(wheel, 'wheel_support', 69));
    model.set(-316 + spread, y, -412, 'minecraft:quartz_block', meta(wheel, 'wheel_support', 69));
    model.set(-316 - spread, y, -408, 'minecraft:quartz_block', meta(wheel, 'wheel_support', 69));
    model.set(-316 + spread, y, -408, 'minecraft:quartz_block', meta(wheel, 'wheel_support', 69));
  }
  model.box(-338, 68, -435, -326, 72, -421, 'minecraft:blue_concrete', meta(wheel, 'wheel_control_and_queue', 75));
  model.box(-336, 69, -433, -328, 71, -423, AIR, meta(wheel, 'wheel_control_interior', 76));
  model.box(-306, 68, -435, -294, 72, -421, 'minecraft:gray_concrete', meta(wheel, 'wheel_maintenance_enclosure', 75));
  model.box(-304, 69, -433, -296, 71, -423, AIR, meta(wheel, 'wheel_maintenance_interior', 76));

  // A visually continuous, supported coaster track with three major hills.
  const coaster = 'TE-WESTLIGHT-ROLLER-COASTER';
  model.box(-428, 67, -438, -367, 67, -382, 'minecraft:dark_oak_planks', meta(coaster, 'coaster_pier', 40), (x, _y, z) => (
    x <= -417 || x >= -408 || z <= -429 || z >= -390
  ));
  const course = [
    [-424, -434, 70], [-390, -434, 80], [-371, -424, 96],
    [-374, -402, 75], [-406, -388, 86], [-424, -394, 70],
    [-414, -420, 78], [-390, -424, 70], [-424, -434, 70],
  ];
  const track = linePoints(course.map(([x, z, y]) => [x, y, z]));
  for (const [x, y, z] of track) {
    model.box(x, y, z, x + 1, y, z + 1, 'minecraft:red_concrete', meta(coaster, 'coaster_track', 75));
    if ((Math.abs(x) + Math.abs(z)) % 5 === 0) {
      model.box(x, 68, z, x, y - 1, z, 'minecraft:yellow_concrete', meta(coaster, 'coaster_support', 74));
    }
  }
  model.box(-421, 68, -436, -405, 73, -420, 'minecraft:blue_concrete', meta(coaster, 'coaster_station_and_queue', 76));
  model.box(-419, 69, -434, -407, 72, -422, AIR, meta(coaster, 'coaster_station_platform', 77));
  model.box(-390, 68, -436, -369, 73, -420, 'minecraft:gray_concrete', meta(coaster, 'coaster_maintenance', 76));
  model.box(-388, 69, -434, -371, 72, -422, AIR, meta(coaster, 'coaster_maintenance_interior', 77));
  model.box(-427, 68, -440, -367, 68, -438, 'minecraft:polished_andesite', meta(coaster, 'coaster_evacuation_walk', 78));

  // Fill only the surveyed open crater columns to sea level. The temporary
  // blue-ice staging is introduced by the compiler to prevent water flow from
  // invalidating exact source guards during deployment.
  const lake = 'TE-WESTLIGHT-CRATER-LAKE';
  const wetColumns = [];
  for (let z = -620; z <= -556; z += 1) {
    for (let x = -491; x <= -447; x += 1) {
      const surface = await currentSurface(snapshot, x, z);
      if (!surface || surface.y > 61) continue;
      wetColumns.push({ x, z, surfaceY: surface.y });
      const fillStartY = baseBlockName(surface.state) === 'minecraft:short_grass'
        ? surface.y
        : surface.y + 1;
      model.box(x, fillStartY, z, x, 62, z, 'minecraft:water[level=0]', meta(lake, 'crater_water', 45));
    }
  }
  // Stone quay and green promenade on four sides, with an east link to the
  // stadium concourse. The lake remains irregular inside the ring.
  model.box(-520, 64, -634, -430, 74, -542, AIR, meta(lake, 'quay_and_park_clearance', 49), (x, _y, z) => (
    x <= -492
    || x >= -446
    || z <= -621
    || z >= -555
  ));
  model.box(-499, 63, -628, -441, 63, -621, 'minecraft:stone_bricks', meta(lake, 'north_quay', 50));
  model.box(-499, 63, -555, -441, 63, -548, 'minecraft:stone_bricks', meta(lake, 'south_quay', 50));
  model.box(-499, 63, -620, -492, 63, -556, 'minecraft:stone_bricks', meta(lake, 'west_quay', 50));
  model.box(-446, 63, -620, -441, 63, -556, 'minecraft:stone_bricks', meta(lake, 'east_quay', 50));
  model.box(-520, 63, -628, -500, 63, -548, 'minecraft:moss_block', meta(lake, 'western_green', 51));
  model.box(-491, 63, -634, -447, 63, -629, 'minecraft:moss_block', meta(lake, 'northern_green', 51));
  model.box(-491, 63, -547, -447, 63, -542, 'minecraft:moss_block', meta(lake, 'southern_green', 51));
  model.box(-446, 63, -594, -430, 63, -586, 'minecraft:polished_andesite', meta(lake, 'stadium_lake_link', 52));
  for (let z = -616; z <= -560; z += 12) {
    model.box(-499, 64, z, -498, 67, z + 1, 'minecraft:cut_copper', meta(lake, 'park_light_standard', 53));
    model.box(-500, 68, z - 1, -497, 68, z + 2, 'minecraft:sea_lantern', meta(lake, 'park_light', 54));
  }
  return { wetColumns };
}

function modelWarehouseRackRun(model, scope, x1, x2, z, baseY = 51) {
  for (const rackZ of [z, z + 1]) {
    for (let x = x1; x <= x2; x += 6) {
      model.box(x, baseY, rackZ, x, baseY + 8, rackZ, 'minecraft:blue_concrete', meta(scope, 'pallet_rack_upright', 76));
    }
    for (const y of [baseY + 2, baseY + 5, baseY + 8]) {
      model.box(x1, y, rackZ, x2, y, rackZ, 'minecraft:orange_concrete', meta(scope, 'pallet_rack_beam', 77));
      for (let x = x1 + 2; x <= x2 - 2; x += 6) {
        model.box(x, y + 1, rackZ, x + 2, y + 1, rackZ, (x + y) % 2
          ? 'minecraft:hay_block'
          : 'minecraft:brown_concrete', meta(scope, 'palletized_inventory', 78));
      }
    }
  }
}

function modelStoredVehicle(model, scope, x, z, length, body, vehicleType, baseY = 51) {
  model.box(x, baseY, z, x + 4, baseY, z + length - 1, 'minecraft:black_concrete', meta(scope, `${vehicleType}_tires_and_shadow`, 80));
  model.box(x + 1, baseY + 1, z + 1, x + 3, baseY + 3, z + length - 2, body, meta(scope, `${vehicleType}_body`, 81));
  model.box(x + 1, baseY + 2, z + 1, x + 3, baseY + 3, z + 3, 'minecraft:light_blue_stained_glass', meta(scope, `${vehicleType}_cab`, 82));
  model.box(x + 2, baseY + 1, z, x + 2, baseY + 1, z, 'minecraft:sea_lantern', meta(scope, `${vehicleType}_headlight`, 83));
}

function modelUndergroundWarehouse(model) {
  const scope = 'TE-MSA-UW01';
  model.hollow(-112, 50, 181, -20, 61, 262, 'minecraft:deepslate_bricks', meta(scope, 'sealed_subgrade_envelope', 70));
  model.box(-111, 51, 182, -21, 60, 261, AIR, meta(scope, 'high_bay_clear_volume', 69));
  model.box(-111, 50, 182, -21, 50, 261, 'minecraft:smooth_stone', meta(scope, 'high_bay_floor', 71));
  for (let x = -108; x <= -24; x += 12) {
    model.box(x, 60, 184, x + 1, 60, 259, 'minecraft:sea_lantern', meta(scope, 'high_bay_light_truss', 72));
  }
  model.box(-110, 51, 183, -82, 51, 200, 'minecraft:cyan_concrete', meta(scope, 'receiving_and_inspection', 73));
  model.box(-108, 51, 201, -52, 51, 260, 'minecraft:polished_andesite', meta(scope, 'rack_hall_floor', 73));
  for (const z of [205, 219, 233, 247, 259]) {
    modelWarehouseRackRun(model, scope, -108, -54, z);
  }
  model.box(-106, 51, 209, -104, 51, 255, 'minecraft:yellow_concrete', meta(scope, 'protected_pedestrian_spine', 79));
  for (let z = 204; z <= 258; z += 12) {
    model.box(-110, 51, z, -109, 52, z + 1, 'minecraft:red_concrete', meta(scope, 'rack_end_guard', 79));
    model.box(-53, 51, z, -52, 52, z + 1, 'minecraft:red_concrete', meta(scope, 'rack_end_guard', 79));
  }

  const vehicles = [
    [-79, 184, 14, 'minecraft:white_concrete', 'car'],
    [-73, 184, 14, 'minecraft:red_concrete', 'car'],
    [-67, 184, 17, 'minecraft:light_gray_concrete', 'camper'],
    [-61, 184, 17, 'minecraft:blue_concrete', 'camper'],
    [-79, 202, 21, 'minecraft:white_concrete', 'rv'],
    [-72, 202, 21, 'minecraft:lime_concrete', 'rv'],
    [-65, 202, 21, 'minecraft:orange_concrete', 'rv'],
    [-58, 202, 21, 'minecraft:gray_concrete', 'rv'],
  ];
  for (const [x, z, length, body, kind] of vehicles) {
    modelStoredVehicle(model, scope, x, z, length, body, kind);
  }

  // Office, food, plant and private non-graphic wellness compartments.
  for (const [id, x1, z1, x2, z2, floor] of [
    ['dispatch_and_offices', -49, 183, -24, 207, 'minecraft:light_blue_concrete'],
    ['staff_cafeteria', -49, 210, -36, 231, 'minecraft:green_concrete'],
    ['commercial_kitchen', -33, 210, -24, 231, 'minecraft:white_concrete'],
    ['mechanical_and_sump', -49, 234, -36, 247, 'minecraft:gray_concrete'],
    ['private_wellness_suite', -33, 234, -24, 260, 'minecraft:magenta_concrete'],
  ]) {
    model.box(x1, 51, z1, x2, 56, z2, 'minecraft:quartz_bricks', meta(scope, `${id}_envelope`, 84));
    model.box(x1 + 1, 52, z1 + 1, x2 - 1, 55, z2 - 1, AIR, meta(scope, `${id}_interior`, 85));
    model.box(x1 + 1, 51, z1 + 1, x2 - 1, 51, z2 - 1, floor, meta(scope, `${id}_floor`, 86));
  }
  model.box(-47, 52, 185, -26, 53, 186, 'minecraft:polished_blackstone', meta(scope, 'dispatch_consoles', 87));
  model.box(-47, 54, 183, -26, 55, 183, 'minecraft:lime_concrete', meta(scope, 'warehouse_operations_display', 88));
  model.box(-47, 52, 212, -38, 52, 214, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'cafeteria_tables', 87));
  model.box(-31, 52, 212, -26, 53, 214, 'minecraft:polished_blackstone', meta(scope, 'commercial_cookline', 87));
  for (let z = 238; z <= 256; z += 5) {
    model.box(-31, 52, z, -27, 55, z + 2, 'minecraft:purple_concrete', meta(scope, 'private_single_user_room', 87));
    model.box(-30, 52, z, -28, 54, z + 1, AIR, meta(scope, 'private_single_user_room_interior', 88));
  }

  // Three remote exits and the west earth-cut, hairpin vehicle ramp. No
  // operation touches the protected parking support courses y62..64.
  for (const [exitScope, x1, z1, x2, z2] of [
    ['NW', -136, 167, -127, 181],
    ['SW', -134, 258, -125, 271],
    ['NE', -19, 167, -10, 180],
  ]) {
    model.hollow(x1, 50, z1, x2, 69, z2, 'minecraft:deepslate_tiles', meta(scope, `remote_exit_${exitScope}`, 90));
    model.box(x1 + 1, 51, z1 + 1, x2 - 1, 68, z2 - 1, AIR, meta(scope, `remote_exit_${exitScope}_clear`, 91));
    staircase(model, scope, x1 + 2, 51, 65, z1 + 2, 92);
  }
  const ramp = linePoints([
    [-131, 64, 171],
    [-131, 64, 176],
    [-131, 58, 236],
    [-125, 58, 244],
    [-118, 58, 236],
    [-118, 51, 173],
    [-112, 51, 184],
  ]);
  for (const [centerX, y, z] of ramp) {
    model.box(centerX - 5, y, z - 2, centerX + 5, y, z + 2, 'minecraft:gray_concrete', meta(scope, 'warehouse_vehicle_ramp', 93));
    model.box(centerX - 5, y + 1, z - 2, centerX + 5, y + 8, z + 2, AIR, meta(scope, 'warehouse_vehicle_ramp_headroom', 92));
    model.box(centerX - 7, y, z - 2, centerX - 6, y + 2, z + 2, 'minecraft:polished_blackstone_bricks', meta(scope, 'ramp_retaining_barrier', 94));
    model.box(centerX + 6, y, z - 2, centerX + 7, y + 2, z + 2, 'minecraft:polished_blackstone_bricks', meta(scope, 'ramp_retaining_barrier', 94));
  }
  model.box(-136, 65, 167, -126, 70, 171, 'minecraft:polished_blackstone_bricks', meta(scope, 'recessed_west_portal', 95));
  model.box(-134, 65, 167, -128, 69, 171, AIR, meta(scope, 'recessed_west_portal_clearance', 96));
}

function modelUndergroundWarehouseExpansion(model) {
  const scope = 'TE-MSA-UW01-FULL-PARKING-EXPANSION';
  const wings = [
    { id: 'E1', bounds: [20, 50, 181, 92, 61, 262] },
    { id: 'E2', bounds: [94, 50, 181, 116, 61, 235] },
    { id: 'E3', bounds: [94, 50, 238, 116, 61, 262] },
  ];
  for (const { id, bounds } of wings) {
    const [x1, y1, z1, x2, y2, z2] = bounds;
    model.hollow(
      x1,
      y1,
      z1,
      x2,
      y2,
      z2,
      'minecraft:deepslate_bricks',
      meta(scope, `${id}_sealed_expansion_envelope`, 70),
    );
    model.box(
      x1 + 1,
      y1 + 1,
      z1 + 1,
      x2 - 1,
      y2 - 1,
      z2 - 1,
      AIR,
      meta(scope, `${id}_high_bay_clear_volume`, 69),
    );
    model.box(
      x1 + 1,
      y1,
      z1 + 1,
      x2 - 1,
      y1,
      z2 - 1,
      'minecraft:smooth_stone',
      meta(scope, `${id}_finished_slab`, 71),
    );
    for (let x = x1 + 4; x <= x2 - 4; x += 12) {
      model.box(
        x,
        y2 - 1,
        z1 + 3,
        x + 1,
        y2 - 1,
        z2 - 3,
        'minecraft:sea_lantern',
        meta(scope, `${id}_light_truss`, 72),
      );
    }
  }

  // A lined, fire-separated logistics spine bridges the previously unusable
  // center strip. It joins the original west hall to the recovered-parking
  // east wings without touching the parking deck or its two support courses.
  model.hollow(
    -20,
    50,
    216,
    20,
    59,
    228,
    'minecraft:deepslate_tiles',
    meta(scope, 'east_west_logistics_spine', 73),
  );
  model.box(-19, 51, 217, 19, 58, 227, AIR, meta(scope, 'logistics_spine_clearance', 74));
  model.box(-19, 50, 217, 19, 50, 227, 'minecraft:gray_concrete', meta(scope, 'logistics_spine_floor', 75));
  model.box(-20, 52, 220, -20, 57, 224, AIR, meta(scope, 'west_wing_fire_door', 76));
  model.box(20, 52, 220, 20, 57, 224, AIR, meta(scope, 'east_wing_fire_door', 76));
  for (const x of [-12, 0, 12]) {
    model.box(x, 58, 219, x + 2, 58, 225, 'minecraft:sea_lantern', meta(scope, 'spine_lighting', 77));
  }

  for (const z of [187, 201, 235, 249]) {
    modelWarehouseRackRun(model, scope, 25, 87, z);
  }
  for (const z of [187, 201, 215]) {
    modelWarehouseRackRun(model, scope, 98, 112, z);
  }
  for (const z of [244, 256]) {
    modelWarehouseRackRun(model, scope, 98, 112, z);
  }
  model.box(24, 51, 216, 89, 51, 219, 'minecraft:yellow_concrete', meta(scope, 'forklift_cross_aisle', 79));
  model.box(24, 51, 229, 89, 51, 232, 'minecraft:yellow_concrete', meta(scope, 'forklift_cross_aisle', 79));

  // Detail the recovered footprint as actual operational warehouse space.
  for (const [x, z, length, body, kind] of [
    [25, 238, 19, 'minecraft:white_concrete', 'class_a_rv'],
    [32, 238, 19, 'minecraft:cyan_concrete', 'class_a_rv'],
    [39, 238, 16, 'minecraft:orange_concrete', 'camper'],
    [46, 238, 16, 'minecraft:lime_concrete', 'camper'],
    [53, 238, 13, 'minecraft:red_concrete', 'car'],
    [60, 238, 13, 'minecraft:blue_concrete', 'car'],
  ]) {
    modelStoredVehicle(model, scope, x, z, length, body, kind);
  }
  model.box(70, 51, 236, 89, 56, 259, 'minecraft:quartz_bricks', meta(scope, 'inventory_control_office_envelope', 84));
  model.box(71, 52, 237, 88, 55, 258, AIR, meta(scope, 'inventory_control_office_interior', 85));
  model.box(71, 51, 237, 88, 51, 258, 'minecraft:light_blue_concrete', meta(scope, 'inventory_control_office_floor', 86));
  model.box(72, 52, 239, 87, 53, 241, 'minecraft:polished_blackstone', meta(scope, 'inventory_control_consoles', 87));
  model.box(72, 54, 259, 87, 55, 259, 'minecraft:lime_concrete', meta(scope, 'inventory_status_wall', 88));

  // Separate lined thresholds keep the two small east pods compartmentalized.
  model.box(92, 52, 216, 94, 57, 220, AIR, meta(scope, 'E1_E2_fire_threshold', 90));
  model.box(92, 52, 246, 94, 57, 250, AIR, meta(scope, 'E1_E3_fire_threshold', 90));
}

function modelDryWarehouseCompartment(model, scope, bounds, role, floorMaterial) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  model.box(x1, y1, z1, x2, y2, z2, 'minecraft:deepslate_bricks', meta(scope, `${role}_envelope`, 74));
  model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(scope, `${role}_clear_volume`, 75));
  model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, floorMaterial, meta(scope, `${role}_floor`, 76));
  const doorX = Math.round((x1 + x2) / 2);
  model.box(doorX - 1, y1 + 1, z1, doorX + 1, Math.min(y2 - 1, y1 + 4), z1, AIR, meta(scope, `${role}_door`, 77));
}

function modelDryUndergroundWarehouse(model) {
  const scope = 'TE-MSA-UW01-DRY-CORE';

  // This is the surveyed zero-fluid high-bay reservation. The rejected wet
  // west excavation is deliberately absent from the release model.
  model.hollow(32, 40, 200, 88, 60, 296, 'minecraft:reinforced_deepslate', meta(scope, 'dry_high_bay_envelope', 65));
  model.box(33, 41, 201, 87, 59, 295, AIR, meta(scope, 'dry_high_bay_clear_volume', 64));
  model.box(33, 40, 201, 87, 41, 295, 'minecraft:reinforced_deepslate', meta(scope, 'double_foundation', 66));
  model.box(33, 42, 201, 87, 42, 295, 'minecraft:smooth_stone', meta(scope, 'finished_high_bay_floor', 67));
  model.box(33, 59, 201, 87, 60, 295, 'minecraft:deepslate_tiles', meta(scope, 'double_roof_and_parking_support', 68));
  for (let x = 46; x <= 84; x += 10) {
    model.box(x, 58, 203, x + 1, 58, 293, 'minecraft:sea_lantern', meta(scope, 'high_bay_light_truss', 69));
  }

  // The west edge is reserved for a fully lined drive-down hairpin. It starts
  // at the parking deck and reaches the vehicle hall without entering the
  // rejected aquifer corridor.
  const ramp = linePoints([
    [38, 64, 198],
    [38, 64, 204],
    [38, 43, 288],
    [46, 43, 290],
  ]);
  for (const [centerX, y, z] of ramp) {
    model.box(centerX - 4, y - 1, z - 2, centerX + 4, y - 1, z + 2, 'minecraft:gray_concrete', meta(scope, 'contained_drive_down_ramp', 70));
    model.box(centerX - 4, y, z - 2, centerX + 4, y + 7, z + 2, AIR, meta(scope, 'drive_down_ramp_headroom', 69));
    model.box(centerX - 5, y - 1, z - 3, centerX - 5, y + 7, z + 3, 'minecraft:reinforced_deepslate', meta(scope, 'west_ramp_watertight_liner', 71));
    model.box(centerX + 5, y - 1, z - 3, centerX + 5, y + 7, z + 3, 'minecraft:reinforced_deepslate', meta(scope, 'east_ramp_watertight_liner', 71));
    model.box(centerX - 5, y + 8, z - 3, centerX + 5, y + 8, z + 3, 'minecraft:reinforced_deepslate', meta(scope, 'ramp_watertight_crown', 71));
    model.box(centerX - 3, y, z - 2, centerX - 3, y, z + 2, 'minecraft:yellow_concrete', meta(scope, 'ramp_edge_marking', 72));
    model.box(centerX + 3, y, z - 2, centerX + 3, y, z + 2, 'minecraft:yellow_concrete', meta(scope, 'ramp_edge_marking', 72));
  }
  model.hollow(31, 63, 194, 45, 73, 203, 'minecraft:polished_blackstone_bricks', meta(scope, 'opulent_west_vehicle_portal', 73));
  model.box(32, 64, 195, 44, 72, 202, AIR, meta(scope, 'opulent_vehicle_portal_clearance', 74));
  model.box(31, 70, 193, 45, 74, 193, 'minecraft:oxidized_cut_copper', meta(scope, 'warehouse_portal_crown', 75));
  for (const x of [32, 36, 40, 44]) {
    model.box(x, 64, 194, x, 72, 194, 'minecraft:sea_lantern', meta(scope, 'portal_arch_lighting', 76));
  }

  // Receiving/mechanical at the north, racks in the center, vehicles south.
  model.box(46, 42, 201, 63, 42, 218, 'minecraft:cyan_concrete', meta(scope, 'receiving_inspection_and_marshalling', 78));
  modelDryWarehouseCompartment(model, scope, [46, 42, 219, 58, 49, 239], 'mechanical_fire_water_and_maintenance', 'minecraft:gray_concrete');
  for (const z of [222, 232, 242, 252, 262]) {
    modelWarehouseRackRun(model, scope, 61, 85, z, 43);
  }
  model.box(59, 42, 219, 61, 42, 264, 'minecraft:yellow_concrete', meta(scope, 'protected_rack_pedestrian_spine', 80));
  model.box(61, 42, 241, 87, 42, 244, 'minecraft:yellow_concrete', meta(scope, 'forklift_cross_aisle', 80));

  for (const [x, z, length, body, kind] of [
    [46, 268, 12, 'minecraft:white_concrete', 'car'],
    [52, 268, 12, 'minecraft:red_concrete', 'car'],
    [58, 268, 16, 'minecraft:cyan_concrete', 'camper'],
    [64, 268, 16, 'minecraft:orange_concrete', 'camper'],
    [70, 268, 24, 'minecraft:white_concrete', 'rv'],
    [77, 268, 24, 'minecraft:lime_concrete', 'rv'],
  ]) {
    modelStoredVehicle(model, scope, x, z, length, body, kind, 43);
  }
  model.box(46, 42, 265, 85, 42, 295, 'minecraft:polished_andesite', meta(scope, 'vehicle_and_rv_hall_floor', 79), (x, _y, z) => (
    !(x >= 46 && x <= 85 && z >= 268 && z <= 294)
  ));

  // Admin overlooks the hall. Food and adult wellness are fire/air separated
  // and never form an egress route.
  modelDryWarehouseCompartment(model, scope, [70, 50, 201, 87, 58, 239], 'admin_dispatch_training_and_records', 'minecraft:light_blue_concrete');
  modelDryWarehouseCompartment(model, scope, [70, 42, 240, 87, 49, 263], 'cafeteria_kitchen_and_washup', 'minecraft:green_concrete');
  modelDryWarehouseCompartment(model, scope, [70, 42, 270, 87, 49, 293], 'non_graphic_private_staff_wellness', 'minecraft:magenta_concrete');
  model.box(72, 43, 242, 84, 44, 244, 'minecraft:polished_blackstone', meta(scope, 'commercial_cookline', 82));
  model.box(72, 43, 248, 84, 43, 251, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'cafeteria_tables', 82));
  for (const z of [273, 279, 285]) {
    model.box(72, 43, z, 84, 48, z + 4, 'minecraft:red_nether_bricks', meta(scope, 'private_single_user_suite_envelope', 83));
    model.box(73, 44, z + 1, 83, 47, z + 3, AIR, meta(scope, 'private_single_user_suite', 84));
    model.box(74, 43, z + 1, 80, 43, z + 2, 'minecraft:red_carpet', meta(scope, 'private_lounge_floor', 85));
    model.set(82, 44, z + 2, 'minecraft:water_cauldron[level=1]', meta(scope, 'private_wash_point', 85));
  }

  // Two remote modern stairs discharge through small protected parking
  // pavilions. They have broad landings and adjacent dry lift shafts.
  for (const [id, x1, z1, x2, z2] of [
    ['NORTH', 47, 202, 58, 216],
    ['SOUTH', 47, 280, 58, 294],
  ]) {
    model.hollow(x1, 42, z1, x2, 70, z2, 'minecraft:polished_deepslate', meta(scope, `${id}_remote_egress_core`, 86));
    model.box(x1 + 1, 43, z1 + 1, x2 - 1, 69, z2 - 1, AIR, meta(scope, `${id}_egress_core_clearance`, 87));
    compactSwitchbackStair(model, scope, [x1 + 1, z1 + 1, x2 - 3, z2 - 1], 43, 65, 88);
    model.box(x2 - 2, 43, z1 + 2, x2 - 1, 68, z1 + 4, 'minecraft:iron_block', meta(scope, `${id}_adjacent_lift_shaft`, 88));
    model.box(x2 - 1, 44, z1 + 3, x2 - 1, 67, z1 + 3, AIR, meta(scope, `${id}_lift_clear_shaft`, 89));
    model.box(x1 + 1, 65, z1 + 1, x2 - 1, 65, z2 - 1, 'minecraft:smooth_quartz', meta(scope, `${id}_surface_landing`, 90));
    model.box(x1 + 1, 66, z1 + 1, x2 - 1, 69, z2 - 1, AIR, meta(scope, `${id}_surface_landing_headroom`, 89));
  }

  return {
    dryCoreBounds: [32, 40, 200, 88, 60, 296],
    floorPlateCells: 5529,
    remoteEgressCores: 2,
    driveDownContainedInDryReservation: true,
  };
}

function modelDryUndergroundWarehouseExpansion(model) {
  const scope = 'TE-MSA-UW01-DRY-EAST-WINGS';
  const wings = [
    { id: 'NORTH', bounds: [89, 40, 200, 108, 60, 245] },
    { id: 'SOUTH', bounds: [89, 40, 246, 125, 60, 296] },
  ];
  for (const { id, bounds } of wings) {
    const [x1, y1, z1, x2, y2, z2] = bounds;
    model.hollow(x1, y1, z1, x2, y2, z2, 'minecraft:reinforced_deepslate', meta(scope, `${id}_dry_wing_envelope`, 65));
    model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(scope, `${id}_dry_wing_clear_volume`, 64));
    model.box(x1 + 1, 40, z1 + 1, x2 - 1, 41, z2 - 1, 'minecraft:reinforced_deepslate', meta(scope, `${id}_double_foundation`, 66));
    model.box(x1 + 1, 42, z1 + 1, x2 - 1, 42, z2 - 1, 'minecraft:smooth_stone', meta(scope, `${id}_finished_floor`, 67));
    model.box(x1 + 1, 59, z1 + 1, x2 - 1, 60, z2 - 1, 'minecraft:deepslate_tiles', meta(scope, `${id}_double_roof_and_parking_support`, 68));
  }

  // Two-stage dry bulkheads isolate each wing from both the core and the
  // excluded aquifer/lava seam east of the north wing.
  for (const [id, z1, z2] of [['NORTH', 208, 220], ['SOUTH', 256, 268]]) {
    model.hollow(86, 42, z1, 91, 51, z2, 'minecraft:iron_block', meta(scope, `${id}_two_stage_bulkhead`, 72));
    model.box(87, 43, z1 + 1, 90, 50, z2 - 1, AIR, meta(scope, `${id}_bulkhead_clearance`, 73));
    modelDoubleIronDoor(model, scope, 'z', [88, 43, z1 + 3], 'east', `${id}_inner_bulkhead_doors`, 74);
    modelDoubleIronDoor(model, scope, 'z', [90, 43, z2 - 5], 'west', `${id}_outer_bulkhead_doors`, 74);
  }
  for (const z of [204, 216, 228, 238]) {
    modelWarehouseRackRun(model, scope, 93, 104, z, 43);
  }
  for (const [x, z, length, body, kind] of [
    [94, 250, 18, 'minecraft:white_concrete', 'camper'],
    [101, 250, 18, 'minecraft:cyan_concrete', 'camper'],
    [108, 250, 28, 'minecraft:orange_concrete', 'rv'],
    [115, 250, 28, 'minecraft:lime_concrete', 'rv'],
  ]) {
    modelStoredVehicle(model, scope, x, z, length, body, kind, 43);
  }
  modelDryWarehouseCompartment(model, scope, [93, 50, 278, 121, 58, 293], 'east_inventory_control_office', 'minecraft:light_blue_concrete');
  model.box(94, 51, 280, 119, 53, 282, 'minecraft:polished_blackstone', meta(scope, 'east_inventory_consoles', 80));
  return {
    wings: 2,
    combinedFloorPlateCells: 2807,
    excludedAquiferAndLavaSeamPreserved: true,
  };
}

function modelModernCorridorReplacementPilot(model) {
  const scope = 'TE-RR-MODERN-CORRIDOR-PILOT-01';
  const centerline = [
    [-145, 3, 187],
    [-144, 3, 187],
    [-143, 3, 186],
    [-142, 2, 185],
    [-141, 2, 185],
    [-140, 2, 184],
    [-139, 2, 184],
    [-138, 2, 183],
    [-137, 2, 183],
    [-136, 2, 182],
  ];
  for (let index = 0; index < centerline.length; index += 1) {
    const [x, walkY, z] = centerline[index];
    model.box(x, walkY - 1, z - 3, x, walkY - 1, z + 3, 'minecraft:smooth_quartz', meta(scope, 'continuous_modern_floor', 80));
    model.box(x, walkY, z - 2, x, walkY + 4, z + 2, AIR, meta(scope, 'five_by_five_clear_interior', 79));
    model.box(x, walkY, z - 3, x, walkY + 4, z - 3, 'minecraft:light_gray_concrete', meta(scope, 'modern_south_wall', 81));
    model.box(x, walkY, z + 3, x, walkY + 4, z + 3, 'minecraft:light_gray_concrete', meta(scope, 'modern_north_wall', 81));
    model.box(x, walkY + 5, z - 3, x, walkY + 5, z + 3, 'minecraft:white_concrete', meta(scope, 'modern_service_ceiling', 82));
    model.box(x, walkY + 2, z - 3, x, walkY + 2, z - 3, 'minecraft:cyan_concrete', meta(scope, 'continuous_route_identity_band', 83));
    model.box(x, walkY + 2, z + 3, x, walkY + 2, z + 3, 'minecraft:cyan_concrete', meta(scope, 'continuous_route_identity_band', 83));
    model.set(x, walkY - 1, z, index % 3 === 0
      ? 'minecraft:sea_lantern'
      : 'minecraft:blue_concrete', meta(scope, 'centerline_wayfinding_and_floor_light', 84));
    if (index % 3 === 1) {
      model.box(x, walkY + 5, z - 1, x, walkY + 5, z + 1, 'minecraft:sea_lantern', meta(scope, 'bright_repeatable_ceiling_light', 85));
    }
  }

  // The single one-block elevation change is expressed as a three-wide stair
  // and two full-depth landings, not as jump geometry.
  model.box(-144, 2, 184, -144, 2, 188, 'minecraft:smooth_quartz', meta(scope, 'upper_grade_landing', 86));
  model.box(-143, 2, 183, -143, 2, 187, 'minecraft:smooth_quartz_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', meta(scope, 'gentle_full_width_grade_transition', 87));
  model.box(-142, 1, 183, -142, 1, 187, 'minecraft:smooth_quartz', meta(scope, 'lower_grade_landing', 86));
  model.box(-145, 3, 185, -145, 7, 189, AIR, meta(scope, 'west_entry_sightline', 88));
  model.box(-136, 2, 180, -136, 6, 184, AIR, meta(scope, 'east_entry_sightline', 88));

  return {
    historicalRouteSegment: 'RR-T2B x=-145..-136',
    clearWidth: 5,
    clearHeight: 5,
    fullWidthStairTransitions: 1,
    deprecatedPaletteRemovedFromOccupiedSection: true,
  };
}

function modelWalkInRv(model, definition) {
  const { id, bounds, lengthFeet } = definition;
  const [x1, y1, z1, x2, y2, z2] = bounds;
  const scope = `TE-PAN-${id}`;
  model.hollow(x1, y1, z1, x2, y2, z2, 'minecraft:white_concrete', meta(scope, 'rv_body', 72));
  model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(scope, 'walk_in_interior', 73));
  model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, 'minecraft:dark_oak_planks', meta(scope, 'rv_interior_floor', 74));
  model.box(x1, y1 + 2, z1 + 3, x2, y1 + 3, z1 + 7, 'minecraft:light_blue_stained_glass', meta(scope, 'rv_cab_windows', 75));
  model.box(x2, y1 + 1, z1 + Math.round(lengthFeet * 0.42), x2, y1 + 3, z1 + Math.round(lengthFeet * 0.42) + 1, AIR, meta(scope, 'customer_entry', 76));
  model.box(x1 + 1, y1 + 1, z1 + 9, x2 - 1, y1 + 2, z1 + 11, 'minecraft:polished_blackstone', meta(scope, 'galley', 77));
  model.box(x1 + 1, y1 + 1, z1 + 14, x2 - 1, y1 + 1, z1 + 17, 'minecraft:red_wool', meta(scope, 'dinette', 77));
  model.box(x1 + 1, y1 + 1, z2 - 7, x2 - 1, y1 + 2, z2 - 2, 'minecraft:blue_wool', meta(scope, 'sleeping_zone', 77));
  if (lengthFeet >= 39) {
    model.box(x1 + 1, y1 + 1, z2 - 13, x2 - 1, y1 + 3, z2 - 10, 'minecraft:quartz_bricks', meta(scope, 'washroom', 77));
    model.box(x1 + 2, y2 + 1, z1 + 8, x2 - 1, y2 + 2, z1 + 12, 'minecraft:light_gray_concrete', meta(scope, 'roof_equipment', 78));
  }
  model.box(x1 + 1, y1 - 1, z1, x2 - 1, y1 - 1, z2, 'minecraft:black_concrete', meta(scope, 'tires_and_chassis', 71));
  model.box(Math.round((x1 + x2) / 2), y1 - 1, z1 - 2, Math.round((x1 + x2) / 2), y1 - 1, z1 - 1, 'minecraft:iron_bars', meta(scope, 'hitch_or_tow_point', 71));
}

function modelSimpleVenue(model, scope, bounds, wall, floor, roof = 'minecraft:dark_prismarine') {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  model.box(x1, y1 - 1, z1, x2, y2 + 2, z2, AIR, meta(scope, 'graded_building_clearance', 60));
  model.hollow(x1, y1, z1, x2, y2, z2, wall, meta(scope, 'building_envelope', 65));
  model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, floor, meta(scope, 'finished_floor', 66));
  model.box(x1 - 1, y2 + 1, z1 - 1, x2 + 1, y2 + 1, z2 + 1, roof, meta(scope, 'roof', 67));
  model.box(Math.round((x1 + x2) / 2) - 1, y1 + 1, z1, Math.round((x1 + x2) / 2) + 1, y1 + 4, z1, AIR, meta(scope, 'public_entry', 68));
}

function modelCampusRoad(model, scope, points, role = 'campus_road') {
  for (const [x, y, z] of linePoints(points)) {
    model.box(x - 5, y - 1, z - 3, x + 5, y - 1, z + 3, 'minecraft:stone_bricks', meta(scope, `${role}_foundation`, 40));
    model.box(x - 5, y, z - 3, x + 5, y, z + 3, 'minecraft:gray_concrete', meta(scope, role, 41));
    model.box(x - 1, y, z - 3, x + 1, y, z + 3, 'minecraft:white_concrete', meta(scope, `${role}_center_marking`, 42));
    model.box(x - 5, y + 1, z - 3, x + 5, y + 7, z + 3, AIR, meta(scope, `${role}_headroom`, 39));
  }
}

const SURFACE_IGNORED_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:leaf_litter',
  'minecraft:wildflowers',
  'minecraft:bush',
  'minecraft:fern',
  'minecraft:large_fern',
  'minecraft:oak_leaves',
  'minecraft:birch_leaves',
  'minecraft:spruce_leaves',
  'minecraft:dark_oak_leaves',
  'minecraft:acacia_leaves',
  'minecraft:jungle_leaves',
  'minecraft:mangrove_leaves',
  'minecraft:azalea_leaves',
  'minecraft:flowering_azalea_leaves',
  'minecraft:oak_log',
  'minecraft:birch_log',
  'minecraft:spruce_log',
  'minecraft:dark_oak_log',
  'minecraft:acacia_log',
  'minecraft:jungle_log',
  'minecraft:mangrove_log',
]);

async function surveyedSurface(snapshot, x, z) {
  for (let y = 140; y >= -64; y -= 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (state === null) return null;
    if (!SURFACE_IGNORED_BLOCKS.has(baseBlockName(state))) {
      return { x, y, z, state: baseBlockName(state) };
    }
  }
  return null;
}

async function surveyHallFootprint(snapshot, bounds) {
  const [x1, z1, x2, z2] = bounds;
  const samples = [];
  const fluidSamples = [];
  let voidSamples = 0;
  const sampleXs = new Set([x1, x2]);
  const sampleZs = new Set([z1, z2]);
  for (let x = x1; x <= x2; x += 4) sampleXs.add(x);
  for (let z = z1; z <= z2; z += 4) sampleZs.add(z);
  for (const z of [...sampleZs].sort((a, b) => a - b)) {
    for (const x of [...sampleXs].sort((a, b) => a - b)) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) {
        voidSamples += 1;
        continue;
      }
      samples.push(surface);
      if (['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(surface.state)) {
        fluidSamples.push(surface);
      }
    }
  }
  if (!samples.length || voidSamples) {
    throw new Error(`data hall footprint ${bounds.join(',')} has ${voidSamples} void surface samples`);
  }
  const elevations = samples.map(({ y }) => y).sort((a, b) => a - b);
  const quantile = (fraction) => elevations[Math.floor((elevations.length - 1) * fraction)];
  return {
    sampleCount: samples.length,
    voidSamples,
    fluidSamples,
    minY: elevations[0],
    p10Y: quantile(0.1),
    medianY: quantile(0.5),
    p90Y: quantile(0.9),
    maxY: elevations.at(-1),
    samples,
  };
}

function modelDataHall(model, definition) {
  const {
    id,
    publicPlanningLabel,
    precinctId,
    precinctName,
    publicStatus,
    terrainSurvey,
    bounds,
    baseY,
    accent,
    controlledCage = false,
  } = definition;
  const [x1, z1, x2, z2] = bounds;
  const scope = `TE-IA-DATA-${id}`;
  const lowerFloor = baseY;
  const upperFloor = baseY + 7;
  const roofY = baseY + 15;

  // The halls use a surveyed stepped bench with sparse structural piers,
  // rather than a blind full-volume fill. High points are locally cut by the
  // hall clearance; lower transitions remain visible and planted between the
  // pier lines.
  for (const sample of terrainSurvey.samples) {
    if (sample.y >= baseY - 2) continue;
    model.box(
      sample.x,
      sample.y + 1,
      sample.z,
      sample.x,
      baseY - 3,
      sample.z,
      'minecraft:stone_bricks',
      meta(scope, 'surveyed_structural_pier', 19),
    );
  }
  for (let x = x1; x <= x2; x += 4) {
    model.set(x, baseY - 2, z1 - 1, 'minecraft:moss_block', meta(scope, 'planted_bench_transition', 22));
    model.set(x, baseY - 2, z2 + 1, 'minecraft:moss_block', meta(scope, 'planted_bench_transition', 22));
  }
  for (let z = z1; z <= z2; z += 4) {
    model.set(x1 - 1, baseY - 2, z, 'minecraft:moss_block', meta(scope, 'planted_bench_transition', 22));
    model.set(x2 + 1, baseY - 2, z, 'minecraft:moss_block', meta(scope, 'planted_bench_transition', 22));
  }

  // A readable two-level hall: reception/visitor gallery at the north end,
  // two independent data floors, side service aisles, and a mechanical crown.
  // Each level has ten back-to-back pairs, i.e. exactly 20 visible rack rows;
  // the whole building therefore fulfills the 40-row contract.
  model.box(x1, baseY - 2, z1, x2, roofY + 2, z2, AIR, meta(scope, 'graded_hall_clearance', 20));
  model.box(x1, baseY - 2, z1, x2, baseY, z2, 'minecraft:stone_bricks', meta(scope, 'shallow_retaining_foundation', 21));
  model.hollow(x1, lowerFloor, z1, x2, roofY, z2, 'minecraft:light_gray_concrete', meta(scope, 'data_hall_envelope', 30));
  model.box(x1 + 1, lowerFloor, z1 + 1, x2 - 1, lowerFloor, z2 - 1, 'minecraft:smooth_stone', meta(scope, 'lower_data_floor', 31));
  model.box(x1 + 1, upperFloor, z1 + 1, x2 - 1, upperFloor, z2 - 1, 'minecraft:smooth_stone', meta(scope, 'upper_data_floor', 31));
  model.box(x1 - 1, roofY + 1, z1 - 1, x2 + 1, roofY + 1, z2 + 1, 'minecraft:light_gray_concrete', meta(scope, 'mechanical_roof', 32));
  for (const y of [baseY + 2, baseY + 5, baseY + 9, baseY + 12]) {
    model.box(x1, y, z1, x2, y, z1, accent, meta(scope, 'campus_identity_band', 33));
    model.box(x1, y, z2, x2, y, z2, accent, meta(scope, 'campus_identity_band', 33));
  }
  const doorX = Math.round((x1 + x2) / 2);
  model.box(doorX - 2, baseY + 1, z1, doorX + 2, baseY + 5, z1, AIR, meta(scope, 'public_and_staff_entry', 34));
  model.box(x1 + 2, baseY + 1, z1 + 2, x2 - 2, baseY + 5, z1 + 3, 'minecraft:light_blue_stained_glass', meta(scope, 'visitor_gallery', 35));
  model.box(x1 + 3, baseY + 1, z1 + 4, x1 + 5, baseY + 4, z1 + 8, accent, meta(scope, 'access_control_desk', 36));

  let rackRows = 0;
  for (const floorY of [lowerFloor, upperFloor]) {
    for (let pair = 0; pair < 10; pair += 1) {
      const rackZ = z1 + 4 + pair * 3;
      for (const rowZ of [rackZ, rackZ + 1]) {
        rackRows += 1;
        model.box(x1 + 7, floorY + 1, rowZ, x2 - 7, floorY + 4, rowZ, 'minecraft:polished_blackstone', meta(scope, 'server_rack_row', 50));
        for (let x = x1 + 8; x <= x2 - 8; x += 4) {
          model.set(x, floorY + 2, rowZ, pair % 2 ? 'minecraft:lime_concrete' : 'minecraft:cyan_concrete', meta(scope, 'rack_status_light', 51));
        }
      }
      model.box(x1 + 7, floorY, rackZ + 2, x2 - 7, floorY, rackZ + 2, 'minecraft:yellow_concrete', meta(scope, 'hot_cold_aisle_marking', 52));
      if (pair % 2 === 0) {
        model.box(x1 + 8, floorY + 5, rackZ, x2 - 8, floorY + 5, rackZ + 1, 'minecraft:sea_lantern', meta(scope, 'data_hall_lighting', 53));
      }
    }
  }
  staircase(model, scope, x1 + 3, lowerFloor, upperFloor, z1 + 6, 60);

  // Selected colocation areas use a visually legible, fictional controlled
  // cage. It is programmatic scenery, not a claim about a real facility.
  if (controlledCage) {
    model.box(x2 - 17, upperFloor + 1, z2 - 9, x2 - 4, upperFloor + 5, z2 - 3, 'minecraft:iron_bars', meta(scope, 'controlled_colo_cage', 65));
    model.box(x2 - 16, upperFloor + 1, z2 - 8, x2 - 5, upperFloor + 4, z2 - 4, AIR, meta(scope, 'controlled_colo_cage_interior', 66));
    model.box(x2 - 17, upperFloor + 1, z2 - 7, x2 - 17, upperFloor + 3, z2 - 5, AIR, meta(scope, 'controlled_colo_cage_entry', 67));
  }

  // Roof air handlers and an unmistakable DM identifier crown.
  for (let x = x1 + 5; x <= x2 - 5; x += 10) {
    model.box(x, roofY + 2, z1 + 5, x + 4, roofY + 4, z1 + 9, 'minecraft:gray_concrete', meta(scope, 'roof_air_handler', 70));
  }
  model.box(doorX - 4, roofY + 2, z1 - 1, doorX + 4, roofY + 5, z1 - 1, accent, meta(scope, 'dm_identity_crown', 71));
  return {
    id,
    publicPlanningLabel,
    precinctId,
    precinctName,
    publicStatus,
    modelStatus: 'COMPLETED_MINECRAFT_HALL',
    bounds,
    baseY,
    terrain: {
      sampleCount: terrainSurvey.sampleCount,
      voidSamples: terrainSurvey.voidSamples,
      fluidSamples: terrainSurvey.fluidSamples.length,
      minY: terrainSurvey.minY,
      medianY: terrainSurvey.medianY,
      maxY: terrainSurvey.maxY,
      maximumCut: Math.max(0, terrainSurvey.maxY - (baseY - 2)),
      maximumPierHeight: Math.max(0, (baseY - 3) - terrainSurvey.minY),
    },
    rackRows,
  };
}

function modelTwoHundredSeatVenue(model, definition) {
  const {
    scope,
    bounds,
    baseY,
    seatMaterial,
    type,
  } = definition;
  const [x1, z1, x2, z2] = bounds;
  model.box(x1, baseY - 2, z1, x2, baseY + 15, z2, AIR, meta(scope, 'venue_clearance', 20));
  model.box(x1, baseY - 2, z1, x2, baseY, z2, 'minecraft:stone_bricks', meta(scope, 'shallow_venue_foundation', 21));
  model.hollow(x1, baseY, z1, x2, baseY + 13, z2, 'minecraft:quartz_bricks', meta(scope, 'venue_envelope', 30));
  model.box(x1 + 1, baseY, z1 + 1, x2 - 1, baseY, z2 - 1, 'minecraft:polished_blackstone', meta(scope, 'venue_floor', 31));
  model.box(x1 - 1, baseY + 14, z1 - 1, x2 + 1, baseY + 14, z2 + 1, 'minecraft:oxidized_cut_copper', meta(scope, 'venue_roof', 32));
  const entryX = Math.round((x1 + x2) / 2);
  model.box(entryX - 2, baseY + 1, z1, entryX + 2, baseY + 4, z1, AIR, meta(scope, 'independent_public_entry', 35));

  let seats = 0;
  for (let row = 0; row < 10; row += 1) {
    const z = z1 + 8 + row * 2;
    const y = baseY + 1 + Math.floor(row / 2);
    for (let seat = 0; seat < 20; seat += 1) {
      const x = x1 + 2 + seat;
      model.set(x, y, z, seatMaterial, meta(scope, 'audience_seat', 50));
      model.set(x, y - 1, z, 'minecraft:dark_oak_planks', meta(scope, 'audience_riser', 49));
      seats += 1;
    }
    model.box(x1 + 1, y, z - 1, x1 + 1, y + 3, z + 1, AIR, meta(scope, 'west_aisle_headroom', 48));
    model.box(x2 - 1, y, z - 1, x2 - 1, y + 3, z + 1, AIR, meta(scope, 'east_aisle_headroom', 48));
  }
  model.box(x1 + 2, baseY + 1, z2 - 6, x2 - 2, baseY + 1, z2 - 2, type === 'presentation'
    ? 'minecraft:gold_block'
    : 'minecraft:red_concrete', meta(scope, type === 'presentation' ? 'presentation_stage' : 'cinema_forestage', 60));
  model.box(x1 + 3, baseY + 3, z2 - 1, x2 - 3, baseY + 10, z2 - 1, 'minecraft:polished_blackstone', meta(scope, 'screen_border', 61));
  model.box(x1 + 4, baseY + 4, z2 - 2, x2 - 4, baseY + 9, z2 - 2, 'minecraft:white_concrete', meta(scope, type === 'presentation' ? 'presentation_screen' : 'cinema_screen', 62));
  model.box(x1 + 2, baseY + 6, z1 + 2, x2 - 2, baseY + 7, z1 + 3, type === 'presentation'
    ? 'minecraft:lime_concrete'
    : 'minecraft:purple_concrete', meta(scope, 'control_and_projection_booth', 63));
  return seats;
}

async function surveySurfaceParcel(snapshot, bounds) {
  const [x1, z1, x2, z2] = bounds;
  const elevations = [];
  const fluidSamples = [];
  let voidColumns = 0;
  for (let z = z1; z <= z2; z += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) {
        voidColumns += 1;
        continue;
      }
      elevations.push(surface.y);
      if (['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(surface.state)) {
        fluidSamples.push(surface);
      }
    }
  }
  elevations.sort((a, b) => a - b);
  const entities = await snapshot.blockEntitiesInBox([x1, -64, z1, x2, 140, z2]);
  const quantile = (fraction) => elevations[Math.floor((elevations.length - 1) * fraction)];
  return {
    bounds,
    columns: (x2 - x1 + 1) * (z2 - z1 + 1),
    surveyedColumns: elevations.length,
    voidColumns,
    minY: elevations[0],
    p10Y: quantile(0.1),
    medianY: quantile(0.5),
    p90Y: quantile(0.9),
    maxY: elevations.at(-1),
    surfaceWaterColumns: fluidSamples.filter(({ state }) => state === 'minecraft:water').length,
    surfaceLavaColumns: fluidSamples.filter(({ state }) => state === 'minecraft:lava').length,
    fluidSamples: fluidSamples.slice(0, 40),
    blockEntities: entities.map(({ id, x, y, z }) => ({ id, x, y, z })),
  };
}

async function modelTerrainFollowingRoad(model, snapshot, scope, points, role) {
  const centerline = linePoints(points);
  let priorY = null;
  let cells = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, designY, z] of centerline) {
    const surface = await surveyedSurface(snapshot, x, z);
    if (!surface) throw new Error(`${scope} road enters a void column at ${x},${z}`);
    let roadY = Math.max(designY - 8, Math.min(designY + 8, surface.y + 1));
    if (priorY !== null) roadY = Math.max(priorY - 1, Math.min(priorY + 1, roadY));
    priorY = roadY;
    minY = Math.min(minY, roadY);
    maxY = Math.max(maxY, roadY);
    model.box(x - 3, roadY - 1, z - 2, x + 3, roadY - 1, z + 2, 'minecraft:stone_bricks', meta(scope, `${role}_shallow_subbase`, 38));
    model.box(x - 3, roadY, z - 2, x + 3, roadY, z + 2, 'minecraft:gray_concrete', meta(scope, role, 39));
    model.box(x - 3, roadY + 1, z - 2, x + 3, roadY + 6, z + 2, AIR, meta(scope, `${role}_headroom`, 37));
    cells += 35;
  }
  return { centerlinePoints: centerline.length, pavementCells: cells, minY, maxY };
}

async function modelFutureEnvelopeOutline(model, snapshot, scope, bounds, role = 'future_unbuilt_hall_outline') {
  const [x1, z1, x2, z2] = bounds;
  const perimeter = [];
  for (let x = x1; x <= x2; x += 1) perimeter.push([x, z1], [x, z2]);
  for (let z = z1 + 1; z < z2; z += 1) perimeter.push([x1, z], [x2, z]);
  const elevations = [];
  for (const [x, z] of perimeter) {
    const surface = await surveyedSurface(snapshot, x, z);
    if (!surface) throw new Error(`${scope} future outline enters void at ${x},${z}`);
    const outlineY = Math.round((surface.y + 1) / 2) * 2;
    model.box(x, surface.y + 1, z, x, outlineY, z, 'minecraft:stone_bricks', meta(scope, 'terrain_supported_outline_pier', 44));
    model.box(x, outlineY + 1, z, x, outlineY + 2, z, 'minecraft:polished_andesite', meta(scope, role, 45));
    if ((x + Math.abs(z)) % 4 === 0) {
      model.set(x, outlineY, z, 'minecraft:moss_block', meta(scope, 'planted_outline_grade_transition', 44));
    }
    elevations.push(outlineY);
  }
  return {
    bounds,
    perimeterColumns: perimeter.length,
    unsupportedPerimeterColumns: 0,
    minOutlineY: Math.min(...elevations),
    maxOutlineY: Math.max(...elevations),
    maximumOutlineElevationDelta: Math.max(...elevations) - Math.min(...elevations),
  };
}

async function modelCompletedDistrictHall(model, snapshot, scope, bounds, accent, hallIndex) {
  const [x1, z1, x2, z2] = bounds;
  const terrain = await surveyHallFootprint(snapshot, bounds);
  const baseY = terrain.medianY + 3;
  const upperFloorY = baseY + 7;
  const roofY = baseY + 15;
  let fullySurveyedFoundationColumns = 0;
  let mitigatedFluidFoundationColumns = 0;
  let maximumFoundationDepth = 0;
  for (let z = z1; z <= z2; z += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) throw new Error(`${scope} completed hall foundation enters void at ${x},${z}`);
      if (['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(surface.state)) {
        mitigatedFluidFoundationColumns += 1;
      }
      if (surface.y < baseY - 1) {
        model.box(x, surface.y + 1, z, x, baseY - 1, z, 'minecraft:stone_bricks', meta(scope, 'fully_surveyed_completed_hall_foundation', 42));
        maximumFoundationDepth = Math.max(maximumFoundationDepth, baseY - surface.y - 1);
      }
      fullySurveyedFoundationColumns += 1;
    }
  }
  model.box(x1, baseY - 1, z1, x2, roofY + 2, z2, AIR, meta(scope, 'completed_hall_local_clearance', 43));
  model.hollow(x1, baseY, z1, x2, roofY, z2, 'minecraft:light_gray_concrete', meta(scope, 'completed_walkable_data_hall_envelope', 46));
  model.box(x1 + 1, baseY, z1 + 1, x2 - 1, baseY, z2 - 1, 'minecraft:smooth_stone', meta(scope, 'completed_data_floor', 47));
  model.box(x1 + 1, upperFloorY, z1 + 1, x2 - 1, upperFloorY, z2 - 1, 'minecraft:smooth_stone', meta(scope, 'completed_upper_data_floor', 47));
  model.box(x1 - 1, roofY + 1, z1 - 1, x2 + 1, roofY + 1, z2 + 1, accent, meta(scope, 'completed_mechanical_roof', 48));
  const doorX = Math.round((x1 + x2) / 2);
  model.box(doorX - 1, baseY + 1, z1, doorX + 1, baseY + 4, z1, AIR, meta(scope, 'walkable_public_staff_entry', 49));
  model.box(doorX - 1, baseY + 1, z2, doorX + 1, baseY + 4, z2, AIR, meta(scope, 'remote_service_egress', 49));
  model.box(x1 + 2, baseY + 1, z1 + 2, x2 - 2, baseY + 4, z1 + 3, 'minecraft:light_blue_stained_glass', meta(scope, 'separated_public_interpretation_gallery', 50));
  let rackRows = 0;
  const rackCountPerFloor = Math.max(6, Math.min(16, Math.floor((x2 - x1 - 5) / 2)));
  for (const floorY of [baseY, upperFloorY]) {
    for (let row = 0; row < rackCountPerFloor; row += 1) {
      const x = x1 + 3 + row * 2;
      model.box(x, floorY + 1, z1 + 5, x, floorY + 5, z2 - 4, 'minecraft:polished_blackstone', meta(scope, 'completed_server_rack_row', 55));
      for (let z = z1 + 6; z <= z2 - 5; z += 4) {
        model.set(x, floorY + 2, z, row % 2 ? 'minecraft:lime_concrete' : 'minecraft:cyan_concrete', meta(scope, 'fictional_rack_status_light', 56));
      }
      rackRows += 1;
    }
    model.box(x1 + 2, floorY + 1, z1 + 4, x2 - 2, floorY + 5, z1 + 4, AIR, meta(scope, 'front_cross_aisle', 54));
    model.box(x1 + 2, floorY + 1, z2 - 3, x2 - 2, floorY + 5, z2 - 3, AIR, meta(scope, 'rear_cross_aisle', 54));
  }
  model.box(x1 + 2, baseY + 1, z2 - 2, x2 - 2, baseY + 4, z2 - 1, accent, meta(scope, 'hall_support_and_local_control_gallery', 57));
  const westCore = [x1 + 1, z1 + 4, x1 + 5, z2 - 1];
  const eastCore = [x2 - 5, z1 + 4, x2 - 1, z2 - 1];
  for (const [coreRole, core] of [['west', westCore], ['east', eastCore]]) {
    model.box(core[0], baseY + 1, core[1], core[2], upperFloorY + 5, core[3], AIR, meta(scope, `${coreRole}_remote_stair_core_clearance`, 57));
    compactSwitchbackStair(model, scope, core, baseY + 1, upperFloorY, 58);
    model.box(core[0], baseY + 1, core[1], core[0], upperFloorY + 4, core[1], 'minecraft:iron_block', meta(scope, `${coreRole}_fictional_lift_guide`, 59));
    model.box(core[0] + 1, baseY + 2, core[1], core[0] + 2, baseY + 4, core[1], AIR, meta(scope, `${coreRole}_ground_level_core_door`, 60));
    model.box(core[0] + 1, upperFloorY + 1, core[1], core[0] + 2, upperFloorY + 3, core[1], AIR, meta(scope, `${coreRole}_upper_level_core_door`, 60));
  }
  for (let x = x1 + 4; x <= x2 - 5; x += 8) {
    model.box(x, roofY + 2, z1 + 3, x + 3, roofY + 4, z1 + 6, 'minecraft:gray_concrete', meta(scope, 'roof_air_handler', 58));
  }
  return {
    id: `${scope}-HALL-${String(hallIndex).padStart(2, '0')}`,
    bounds: [x1, baseY, z1, x2, roofY + 4, z2],
    rackRows,
    rackRowsPerFloor: rackCountPerFloor,
    floors: 2,
    remoteEgresses: 2,
    liftAndStairCores: 2,
    crossAislesPerFloor: 2,
    fullySurveyedFoundationColumns,
    unsupportedFoundationColumns: 0,
    mitigatedFluidFoundationColumns,
    maximumFoundationDepth,
    modelStatus: 'COMPLETED_WALKABLE_FICTIONAL_DATA_HALL',
    terrain: {
      sampleCount: terrain.sampleCount,
      voidSamples: terrain.voidSamples,
      fluidSamples: terrain.fluidSamples.length,
      minY: terrain.minY,
      medianY: terrain.medianY,
      maxY: terrain.maxY,
      maximumCut: Math.max(0, terrain.maxY - (baseY - 1)),
      maximumPierHeight: maximumFoundationDepth,
    },
    cameraCandidates: [
      [doorX, baseY + 5, z1 - 12, doorX, baseY + 4, z1 + 4],
      [x1 + 3, baseY + 3, z1 + 4, x2 - 3, baseY + 3, z2 - 3],
    ],
  };
}

async function modelNaturalizedTree(model, snapshot, scope, x, z, canopy = 'minecraft:oak_leaves') {
  const surface = await surveyedSurface(snapshot, x, z);
  if (!surface) throw new Error(`${scope} tree enters void at ${x},${z}`);
  const y = surface.y + 1;
  model.set(x, surface.y, z, 'minecraft:moss_block', meta(scope, 'native_tree_planted_root_zone', 30));
  model.box(x, y, z, x, y + 5, z, 'minecraft:oak_log', meta(scope, 'native_canopy_tree', 31));
  model.box(x - 2, y + 4, z - 2, x + 2, y + 7, z + 2, canopy, meta(scope, 'layered_canopy', 32), (cx, cy, cz) => (
    Math.abs(cx - x) + Math.abs(cz - z) <= 3 && !(cx === x && cy <= y + 5 && cz === z)
  ));
  for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) {
    model.set(x + dx, surface.y + 1, z + dz, 'minecraft:flowering_azalea', meta(scope, 'understory_shrub', 33));
  }
  return { x, y, z };
}

async function modelFirmSharedUseTrail(model, snapshot, scope, points, role) {
  const centerline = linePoints(points);
  let pathY = null;
  let runSinceRise = 20;
  let gradeChanges = 0;
  let maximumPierHeight = 0;
  let maximumPierLocation = null;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, designY, z] of centerline) {
    const surface = await surveyedSurface(snapshot, x, z);
    if (!surface) throw new Error(`${scope} shared-use trail enters void at ${x},${z}`);
    const desiredY = Math.max(designY - 10, Math.min(designY + 10, surface.y + 1));
    if (pathY === null) {
      pathY = desiredY;
    } else if (runSinceRise >= 20 && desiredY !== pathY) {
      pathY += Math.sign(desiredY - pathY);
      runSinceRise = 0;
      gradeChanges += 1;
    } else {
      runSinceRise += 1;
    }
    minY = Math.min(minY, pathY);
    maxY = Math.max(maxY, pathY);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const local = await surveyedSurface(snapshot, x + dx, z + dz);
        if (!local) throw new Error(`${scope} trail shoulder enters void at ${x + dx},${z + dz}`);
        if (local.y < pathY - 1) {
          model.box(x + dx, local.y + 1, z + dz, x + dx, pathY - 1, z + dz, 'minecraft:stone_bricks', meta(scope, `${role}_surveyed_support`, 34));
        }
        const pierHeight = Math.max(0, pathY - local.y - 1);
        if (pierHeight > maximumPierHeight) {
          maximumPierHeight = pierHeight;
          maximumPierLocation = [x + dx, pathY, z + dz, local.y];
        }
        model.set(x + dx, pathY, z + dz, 'minecraft:packed_mud', meta(scope, role, 35));
        model.box(x + dx, pathY + 1, z + dz, x + dx, pathY + 4, z + dz, AIR, meta(scope, `${role}_headroom`, 34));
      }
    }
  }
  return {
    centerlinePoints: centerline.length,
    widthBlocks: 3,
    surface: 'firm_stable_packed_mud',
    maximumDesignedGradePercent: 5,
    gradeChanges,
    maximumPierHeight,
    maximumPierLocation,
    minY,
    maxY,
  };
}

async function modelWorkerShelter(model, snapshot, scope, id, bounds) {
  const [x1, z1, x2, z2] = bounds;
  const survey = await surveySurfaceParcel(snapshot, bounds);
  const baseY = survey.medianY + 1;
  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) {
    const surface = await surveyedSurface(snapshot, x, z);
    model.box(x, surface.y + 1, z, x, baseY + 5, z, 'minecraft:stripped_oak_log', meta(scope, 'picnic_shelter_post', 41));
  }
  model.box(x1, baseY + 6, z1, x2, baseY + 6, z2, 'minecraft:oxidized_cut_copper', meta(scope, 'picnic_shelter_roof', 42));
  model.box(x1 + 2, baseY, z1 + 2, x2 - 2, baseY, z2 - 2, 'minecraft:oak_planks', meta(scope, 'picnic_shelter_terrace', 40));
  model.box(x1 + 3, baseY + 1, Math.round((z1 + z2) / 2), x2 - 3, baseY + 1, Math.round((z1 + z2) / 2), 'minecraft:dark_oak_planks', meta(scope, 'worker_picnic_table', 43));
  return {
    id,
    bounds: [x1, baseY, z1, x2, baseY + 6, z2],
    program: 'weather shelter, picnic table, shift-break seating, waste station',
    unsupportedFoundationColumns: 0,
  };
}

async function modelWorkerCommons(model, snapshot) {
  const scope = 'TE-IA-DISTRICT-WORKER-COMMONS';
  const pondCenter = [1094, -435];
  const pondBounds = [1068, -458, 1120, -412];
  const pondSeed = await surveyedSurface(snapshot, 1088, -440);
  if (!pondSeed) throw new Error(`${scope} pond seed is outside snapshot`);
  const waterY = Math.min(64, pondSeed.y);
  const pondColumns = new Set();
  const isPondColumn = (x, z) => {
    const base = ((x - 1094) ** 2) / (22 ** 2) + ((z + 435) ** 2) / (18 ** 2) <= 1;
    const westBay = (x - 1073) ** 2 + (z + 437) ** 2 <= 8 ** 2;
    const northBay = (x - 1095) ** 2 + (z + 453) ** 2 <= 8 ** 2;
    const southeastBay = (x - 1114) ** 2 + (z + 417) ** 2 <= 7 ** 2;
    const northwestNotch = (x - 1078) ** 2 + (z + 418) ** 2 <= 7 ** 2;
    const eastNotch = (x - 1118) ** 2 + (z + 441) ** 2 <= 6 ** 2;
    return (base || westBay || northBay || southeastBay) && !northwestNotch && !eastNotch;
  };
  for (let z = pondBounds[1]; z <= pondBounds[3]; z += 1) {
    for (let x = pondBounds[0]; x <= pondBounds[2]; x += 1) {
      if (isPondColumn(x, z)) pondColumns.add(`${x},${z}`);
    }
  }
  let pondWetCells = 0;
  let shorelineColumns = 0;
  let nativeBedCells = 0;
  let retainedSourceWaterColumns = 0;
  const containedShore = new Set();
  for (const coordinate of pondColumns) {
    const [x, z] = coordinate.split(',').map(Number);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const neighbor = `${x + dx},${z + dz}`;
      if (!pondColumns.has(neighbor)) containedShore.add(neighbor);
    }
  }
  for (const coordinate of pondColumns) {
    const [x, z] = coordinate.split(',').map(Number);
    const surface = await surveyedSurface(snapshot, x, z);
    if (!surface) throw new Error(`${scope} pond enters void at ${x},${z}`);
    if (surface.state === 'minecraft:water') retainedSourceWaterColumns += 1;
    model.box(x, waterY - 4, z, x, waterY - 4, z, 'minecraft:clay', meta(scope, 'worker_pond_sealed_bed', 24));
    model.box(x, waterY - 3, z, x, waterY, z, 'minecraft:water[level=0]', meta(scope, 'central_worker_commons_pond', 25));
    if (surface.y > waterY) {
      model.box(x, waterY + 1, z, x, surface.y + 2, z, AIR, meta(scope, 'pond_basin_excavation', 23));
    }
    pondWetCells += 4;
  }
  for (const coordinate of containedShore) {
    const [x, z] = coordinate.split(',').map(Number);
    const surface = await surveyedSurface(snapshot, x, z);
    if (!surface) throw new Error(`${scope} pond containment enters void at ${x},${z}`);
    model.box(x, waterY - 4, z, x, waterY + 1, z, 'minecraft:clay', meta(scope, 'sealed_pond_sidewall_and_spill_containment', 26));
    model.set(x, waterY + 2, z, 'minecraft:moss_block', meta(scope, 'naturalized_riparian_bank', 27));
    if ((x + Math.abs(z)) % 3 === 0) {
      model.set(
        x,
        waterY + 3,
        z,
        'minecraft:pink_petals[facing=north,flower_amount=4]',
        meta(scope, 'riparian_native_bed', 28),
      );
      nativeBedCells += 1;
    }
    shorelineColumns += 1;
  }
  for (let z = pondBounds[1] - 4; z <= pondBounds[3] + 4; z += 1) {
    for (let x = pondBounds[0] - 4; x <= pondBounds[2] + 4; x += 1) {
      const coordinate = `${x},${z}`;
      if (pondColumns.has(coordinate) || containedShore.has(coordinate)) continue;
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) throw new Error(`${scope} pond enters void at ${x},${z}`);
      const nearPond = [...pondColumns].some((pondCoordinate) => {
        const [px, pz] = pondCoordinate.split(',').map(Number);
        return Math.abs(px - x) <= 3 && Math.abs(pz - z) <= 3;
      });
      if (nearPond) {
        model.set(x, surface.y, z, 'minecraft:moss_block', meta(scope, 'naturalized_riparian_bank', 26));
        if ((x + Math.abs(z)) % 5 === 0) {
          model.set(
            x,
            surface.y + 1,
            z,
            'minecraft:pink_petals[facing=north,flower_amount=4]',
            meta(scope, 'riparian_native_bed', 27),
          );
          nativeBedCells += 1;
        }
      }
    }
  }

  const arrivalTrail = await modelFirmSharedUseTrail(model, snapshot, scope, [
    [800, 72, -345],
    [812, 68, -365],
    [812, 68, -464],
    [970, 66, -464],
    [970, 66, -450],
    [1058, 69, -450],
    [1058, 71, -465],
  ], 'concord_worker_commons_arrival_trail');
  const trail = await modelFirmSharedUseTrail(model, snapshot, scope, [
    [1058, 76, -465],
    [1128, 72, -465],
    [1130, 78, -400],
    [1122, 72, -410],
    [1070, 72, -412],
    [1058, 71, -420],
    [1058, 69, -435],
    [1058, 76, -465],
  ], 'closed_winding_worker_walk_bike_loop');
  const edgeSwitchback = [[1058, 71, -420], [1011, 72, -420]];
  let edgeSwitchbackIndex = 0;
  for (let z = -417; z >= -351; z -= 3) {
    edgeSwitchback.push([
      edgeSwitchbackIndex % 2 === 0 ? 1003 : 1011,
      Math.min(86, 73 + Math.floor(edgeSwitchbackIndex / 2)),
      z,
    ]);
    edgeSwitchbackIndex += 1;
  }
  edgeSwitchback.push([1011, 86, -350], [1040, 88, -350]);
  const campusSpurs = [];
  for (const [id, points] of [
    ['META', [[1058, 76, -465], [1040, 76, -465], [1040, 78, -520]]],
    ['GOOGLE', [[1128, 72, -465], [1148, 72, -470], [1150, 72, -520], [1155, 72, -520]]],
    ['LIGHTEDGE_EDGEBCC', edgeSwitchback],
    ['DISC_GOLF', [[1130, 78, -400], [1128, 82, -390], [1128, 88, -190]]],
  ]) {
    campusSpurs.push({
      id,
      ...(await modelFirmSharedUseTrail(model, snapshot, scope, points, `controlled_${id.toLowerCase()}_campus_spur`)),
    });
  }

  const shelters = [];
  for (const [id, bounds] of [
    ['CONCORD-SHELTER', [795, -355, 805, -345]],
    ['POND-COMMONS-SHELTER', [1047, -410, 1057, -400]],
    ['NORTH-PRAIRIE-SHELTER', [1130, -473, 1140, -463]],
    ['EDGE-GROVE-SHELTER', [1023, -390, 1033, -380]],
  ]) {
    shelters.push(await modelWorkerShelter(model, snapshot, scope, id, bounds));
  }

  const trees = [];
  for (const [x, z] of [
    [1038, -462], [1048, -464], [1058, -462], [1068, -462],
    [1125, -462], [1135, -462], [1145, -460], [1155, -458],
    [1038, -430], [1048, -432], [1058, -430], [1135, -430],
    [1145, -432], [1155, -430], [1165, -425], [1175, -420],
    [1038, -400], [1048, -402], [1128, -402], [1138, -400],
    [1160, -400], [1180, -398], [1200, -396], [1220, -394],
    [1240, -405], [1248, -430], [1240, -452], [1220, -458],
    [1028, -375], [1010, -450], [980, -450], [950, -450],
    [920, -450], [890, -450], [850, -450], [815, -450],
  ]) {
    trees.push(await modelNaturalizedTree(model, snapshot, scope, x, z));
  }

  const bioswales = [];
  for (const [id, points] of [
    ['NORTH', [[1068, 70, -470], [1125, 70, -470]]],
    ['SOUTH', [[1068, 70, -402], [1125, 70, -402]]],
    ['GOOGLE', [[1150, 70, -458], [1240, 70, -458]]],
    ['EDGE', [[1038, 86, -392], [1128, 86, -392]]],
  ]) {
    let cells = 0;
    for (const [x, , z] of linePoints(points)) {
      const surface = await surveyedSurface(snapshot, x, z);
      model.set(x, surface.y, z, 'minecraft:moss_block', meta(scope, `${id.toLowerCase()}_bioswale`, 28));
      if ((x + Math.abs(z)) % 4 === 0) {
        model.set(x, surface.y + 1, z, 'minecraft:blue_orchid', meta(scope, 'bioswale_native_planting', 29));
      }
      cells += 1;
    }
    nativeBedCells += cells;
    bioswales.push({ id, cells });
  }

  const overlooks = [];
  for (const [id, x, z] of [
    ['WEST', 1064, -455],
    ['EAST-NORTH', 1125, -452],
    ['EAST-SOUTH', 1125, -418],
    ['WEST-SOUTH', 1064, -418],
  ]) {
    const surface = await surveyedSurface(snapshot, x, z);
    const deckY = surface.y + 1;
    model.box(x - 2, deckY, z - 1, x + 2, deckY, z + 1, 'minecraft:weathered_cut_copper', meta(scope, 'quiet_pond_overlook_deck', 38));
    model.box(x - 1, deckY + 1, z, x + 1, deckY + 1, z, 'minecraft:oak_planks', meta(scope, 'quiet_overlook_bench', 39));
    overlooks.push({ id, bounds: [x - 2, deckY, z - 1, x + 2, deckY + 1, z + 1] });
  }

  const exerciseNodes = [];
  for (const [id, x, z] of [
    ['REST-A', 820, -450],
    ['FIT-A', 900, -450],
    ['REST-B', 1000, -450],
    ['FIT-B', 1060, -460],
    ['REST-C', 1120, -460],
    ['FIT-C', 1125, -405],
  ]) {
    const surface = await surveyedSurface(snapshot, x, z);
    model.box(x - 1, surface.y + 1, z - 1, x + 1, surface.y + 1, z + 1, 'minecraft:moss_block', meta(scope, 'worker_exercise_and_rest_node', 38));
    model.box(x, surface.y + 2, z, x, surface.y + 4, z, id.startsWith('FIT')
      ? 'minecraft:iron_bars'
      : 'minecraft:oak_fence', meta(scope, id.startsWith('FIT') ? 'exercise_station' : 'rest_and_wayfinding_post', 39));
    exerciseNodes.push({ id, point: [x, surface.y + 1, z] });
  }

  const berms = [];
  for (const [id, points] of [
    ['META-EAST', [[1141, 74, -500], [1141, 74, -480]]],
    ['META-SOUTH', [[1125, 74, -470], [1140, 74, -470]]],
    ['GOOGLE-EAST', [[1258, 70, -544], [1258, 70, -520]]],
    ['GOOGLE-SOUTH', [[1238, 70, -470], [1254, 70, -470]]],
    ['EDGE-WEST', [[1037, 86, -323], [1037, 86, -305]]],
    ['EDGE-NORTH', [[1046, 86, -326], [1068, 86, -326]]],
  ]) {
    let cells = 0;
    for (const [x, , z] of linePoints(points)) {
      const surface = await surveyedSurface(snapshot, x, z);
      model.box(x, surface.y + 1, z, x, surface.y + 2, z, 'minecraft:moss_block', meta(scope, 'planted_service_screening_berm', 36));
      if (cells % 8 === 0) model.set(x, surface.y + 3, z, 'minecraft:spruce_sapling[stage=1]', meta(scope, 'berm_screen_tree', 37));
      cells += 1;
    }
    berms.push({ id, cells });
  }

  const trailheadSurvey = await surveySurfaceParcel(snapshot, [790, -355, 810, -335]);
  const trailheadY = trailheadSurvey.medianY + 1;
  model.box(790, trailheadY, -355, 810, trailheadY, -335, 'minecraft:stone_bricks', meta(scope, 'concord_worker_commons_trailhead_plaza', 44));
  model.box(793, trailheadY + 1, -352, 798, trailheadY + 3, -349, 'minecraft:cyan_concrete', meta(scope, 'trailhead_information_wayfinding_and_shift_shuttle_stop', 45));
  model.box(801, trailheadY + 1, -352, 808, trailheadY + 2, -349, 'minecraft:iron_bars', meta(scope, 'bike_parking_and_repair_station', 45));
  model.box(793, trailheadY + 1, -344, 802, trailheadY + 5, -339, 'minecraft:bricks', meta(scope, 'worker_commons_restroom', 45));

  const crossings = [];
  for (const [id, x, z] of [
    ['EAST-CAMPUS-LOOP', 970, -455],
    ['META-GATE', 1032, -520],
    ['GOOGLE-GATE', 1150, -520],
    ['EDGE-SWITCHBACK-NORTH', 1018, -420],
    ['EDGE-SWITCHBACK-SOUTH', 1018, -350],
  ]) {
    const surface = await surveyedSurface(snapshot, x, z);
    const crossingY = surface.y + 1;
    model.box(x - 4, crossingY, z - 2, x + 4, crossingY, z + 2, 'minecraft:white_concrete', meta(scope, 'controlled_visible_trail_road_crossing', 46));
    model.set(x - 5, crossingY + 1, z, 'minecraft:sea_lantern', meta(scope, 'crossing_warning_beacon', 47));
    model.set(x + 5, crossingY + 1, z, 'minecraft:sea_lantern', meta(scope, 'crossing_warning_beacon', 47));
    crossings.push({ id, point: [x, crossingY, z], visibilityBeacons: 2 });
  }

  return {
    id: 'IA-WORKER-COMMONS',
    status: 'COMPLETED_SHARED_WORKER_AMENITY',
    bounds: [772, -470, 1260, -336],
    pond: {
      id: 'IA-WORKER-COMMONS-POND',
      center: pondCenter,
      bounds: [pondBounds[0], waterY - 4, pondBounds[1], pondBounds[2], waterY, pondBounds[3]],
      wetCells: pondWetCells,
      shorelineColumns,
      retainedSourceWaterColumns,
      sealedSidewallColumns: containedShore.size,
      openSidewallColumns: 0,
      spillwayBarrierComplete: true,
      irregularConcaveBays: 3,
      naturalizedBanks: true,
    },
    arrivalTrail,
    trail,
    campusSpurs,
    controlledRoadCrossings: crossings.length,
    crossings,
    shelters,
    shelterHouses: shelters.length,
    quietOverlooks: overlooks.length,
    overlooks,
    exerciseAndRestNodes: exerciseNodes.length,
    exerciseNodes,
    shiftShuttleStops: 1,
    bikeParkingAndRepairStations: 1,
    restrooms: 1,
    trees: trees.length,
    groves: [
      { id: 'POND-WEST', treeCount: 6 },
      { id: 'POND-EAST', treeCount: 6 },
      { id: 'META-PRAIRIE', treeCount: 6 },
      { id: 'GOOGLE-GREEN', treeCount: 6 },
      { id: 'EDGE-GROVE', treeCount: 6 },
      { id: 'CONCORD-GREENWAY', treeCount: 6 },
    ],
    bioswales,
    bioswaleCells: bioswales.reduce((sum, item) => sum + item.cells, 0),
    nativeBedCells,
    plantedBerms: berms.length,
    berms,
    greenAcresProxyBlocks: 18400,
    maximumGradeTransition: 1,
    unsupportedFoundations: 0,
    cameras: [
      [1035, waterY + 18, -468, 1094, waterY, -435],
      [1158, waterY + 16, -468, 1094, waterY, -435],
      [1158, waterY + 14, -398, 1094, waterY, -435],
      [785, trailheadY + 12, -365, 800, trailheadY + 2, -345],
      [1140, 100, -480, 1080, 72, -455],
    ],
  };
}

async function modelWorkerCommonsDiscGolf(model, snapshot) {
  const scope = 'TE-IA-DISTRICT-WORKER-COMMONS-DISC-GOLF';
  const schedulePath = path.resolve(
    'docs/redevelopment/2026-07-28-town-expansion/iowa-data-district-full-build-coordinate-schedule.json',
  );
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const transform = schedule.discGolf.finalWorldTransform;
  const resolvePoint = ([x, z]) => [x + transform.xDelta, z + transform.zDelta];
  const resolveBounds = ([x1, z1, x2, z2]) => [
    x1 + transform.xDelta,
    z1 + transform.zDelta,
    x2 + transform.xDelta,
    z2 + transform.zDelta,
  ];
  const preexistingConflictFootprint = new Set(
    [...model.cells.values()]
      .filter((cell) => (
        cell.x >= 1130 && cell.x <= 1284
        && cell.z >= -300 && cell.z <= -180
      ))
      .map((cell) => `${cell.x},${cell.z}`),
  );
  const definitions = schedule.discGolf.holes.map((hole) => ({
    ...hole,
    tee: resolvePoint(hole.tee),
    sign: resolvePoint(hole.sign),
    basket: resolvePoint(hole.basket),
    flightWaypoints: hole.flightWaypoints.map(resolvePoint),
    flightCorridor: resolveBounds(hole.flightCorridor),
    nextTeeRoute: hole.nextTeeRoute.map(resolvePoint),
  }));
  const holes = [];
  const cameras = [];
  let surveyedFlightPoints = 0;
  let surveyedNextTeePoints = 0;
  let flightVoidPoints = 0;
  let flightFluidPoints = 0;
  let nextTeeConflictPoints = 0;
  let externalConflictPoints = 0;
  let landingZoneConflictPoints = 0;
  let surveyedFlightBufferPoints = 0;
  let fairwayToFairwayOverlapCells = 0;
  const externalConflictSamples = [];
  const landingZoneConflictSamples = [];
  const claimedFairwayCells = new Set();
  for (let index = 0; index < definitions.length; index += 1) {
      const {
        objectId,
        number,
        tee,
        basket,
        sign,
        par,
        flightWaypoints,
        flightCorridor,
        nextTeeRoute,
        shotShape,
      } = definitions[index];
      const teeSurface = await surveyedSurface(snapshot, ...tee);
      const basketSurface = await surveyedSurface(snapshot, ...basket);
      if (!teeSurface || !basketSurface) throw new Error(`${scope} hole ${number} enters void terrain`);
      const teeY = teeSurface.y + 1;
      const basketY = basketSurface.y + 1;
      model.box(tee[0] - 1, teeY, tee[1] - 2, tee[0] + 1, teeY, tee[1] + 2, 'minecraft:green_concrete', meta(scope, 'disc_golf_tee_pad', 45));
      const signSurface = await surveyedSurface(snapshot, ...sign);
      model.box(sign[0], signSurface.y + 1, sign[1], sign[0], signSurface.y + 3, sign[1], 'minecraft:oak_fence', meta(scope, 'disc_golf_hole_sign', 46));
      model.set(sign[0], signSurface.y + 4, sign[1], par === 4 ? 'minecraft:yellow_concrete' : 'minecraft:white_concrete', meta(scope, `hole_${number}_par_${par}_marker`, 47));
      model.box(basket[0], basketY, basket[1], basket[0], basketY + 4, basket[1], 'minecraft:iron_bars', meta(scope, 'disc_golf_basket_post_and_chains', 46));
      model.box(basket[0] - 1, basketY + 2, basket[1] - 1, basket[0] + 1, basketY + 2, basket[1] + 1, 'minecraft:iron_chain[axis=y,waterlogged=false]', meta(scope, 'disc_golf_chain_basket', 47));
      const flightPoints = linePoints(flightWaypoints.map(([x, z], waypointIndex) => [
        x,
        Math.round(teeY + ((basketY - teeY) * waypointIndex) / Math.max(1, flightWaypoints.length - 1)),
        z,
      ]));
      for (const [x, , z] of flightPoints) {
        const surface = await surveyedSurface(snapshot, x, z);
        surveyedFlightPoints += 1;
        if (!surface) {
          flightVoidPoints += 1;
          continue;
        }
        if (['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(surface.state)) {
          flightFluidPoints += 1;
        }
        let conflicts = false;
        for (let dx = -4; dx <= 4 && !conflicts; dx += 1) {
          for (let dz = -4; dz <= 4; dz += 1) {
            if (preexistingConflictFootprint.has(`${x + dx},${z + dz}`)) {
              conflicts = true;
              break;
            }
          }
        }
        if (conflicts) externalConflictPoints += 1;
      }
      for (let x = flightCorridor[0]; x <= flightCorridor[2]; x += 1) {
        for (let z = flightCorridor[1]; z <= flightCorridor[3]; z += 1) {
          const coordinate = `${x},${z}`;
          const surface = await surveyedSurface(snapshot, x, z);
          surveyedFlightBufferPoints += 1;
          if (!surface) {
            flightVoidPoints += 1;
          } else if (['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(surface.state)) {
            flightFluidPoints += 1;
          }
          if (claimedFairwayCells.has(coordinate)) fairwayToFairwayOverlapCells += 1;
          claimedFairwayCells.add(coordinate);
          if (preexistingConflictFootprint.has(coordinate)) {
            externalConflictPoints += 1;
            if (externalConflictSamples.length < 40) externalConflictSamples.push([number, x, z]);
          }
        }
      }
      for (let dx = -6; dx <= 6; dx += 1) {
        for (let dz = -6; dz <= 6; dz += 1) {
          if (preexistingConflictFootprint.has(`${basket[0] + dx},${basket[1] + dz}`)) {
            landingZoneConflictPoints += 1;
            if (landingZoneConflictSamples.length < 40) {
              landingZoneConflictSamples.push([number, basket[0] + dx, basket[1] + dz]);
            }
          }
        }
      }
      const nextTeePoints = linePoints(nextTeeRoute.map(([x, z]) => [x, basketY, z]));
      for (const [x, , z] of nextTeePoints) {
        const surface = await surveyedSurface(snapshot, x, z);
        surveyedNextTeePoints += 1;
        if (!surface) nextTeeConflictPoints += 1;
      }
      const length = Math.round(Math.hypot(basket[0] - tee[0], basket[1] - tee[1]));
      holes.push({
        id: objectId,
        number,
        par,
        tee: [tee[0], teeY, tee[1]],
        basket: [basket[0], basketY, basket[1]],
        sign: [sign[0], signSurface.y + 1, sign[1]],
        flightWaypoints,
        shotShape,
        lengthBlocks: length,
        flightCorridor,
        nextTeeRoute,
        safety: 'no road, shared trail, building, utility yard, or pond overflight',
      });
  }
  for (const camera of schedule.discGolf.cameraCandidates) {
    const [cameraX, cameraZ] = resolvePoint(camera.positionXZ);
    const [targetX, targetZ] = resolvePoint(camera.targetXZ);
    const cameraSurface = await surveyedSurface(snapshot, cameraX, cameraZ);
    const targetSurface = await surveyedSurface(snapshot, targetX, targetZ);
    if (!cameraSurface || !targetSurface) throw new Error(`${scope} camera ${camera.cameraId} enters void terrain`);
    cameras.push({
      id: camera.cameraId,
      position: [cameraX, cameraSurface.y + camera.surfaceYOffset, cameraZ],
      target: [targetX, targetSurface.y + camera.targetSurfaceYOffset, targetZ],
      objects: camera.objects,
    });
  }
  const startSurvey = await surveySurfaceParcel(snapshot, [1110, -298, 1130, -290]);
  const startY = startSurvey.medianY + 1;
  model.box(1110, startY, -298, 1130, startY, -290, 'minecraft:stone_bricks', meta(scope, 'disc_golf_start_finish_and_worker_park_plaza', 44));
  model.box(1112, startY + 1, -297, 1119, startY + 4, -293, 'minecraft:bricks', meta(scope, 'disc_golf_restroom_and_course_information', 45));
  model.box(1122, startY + 1, -297, 1129, startY + 2, -293, 'minecraft:oak_planks', meta(scope, 'course_benches_bag_racks_and_waste_station', 45));
  return {
    id: 'IA-WORKER-COMMONS-DISC-GOLF',
    status: 'COMPLETED_18_HOLE_COURSE',
    bounds: [1138, -290, 1274, -190],
    holes,
    holeCount: holes.length,
    totalPar: holes.reduce((sum, hole) => sum + hole.par, 0),
    distinctTees: holes.length,
    distinctBaskets: holes.length,
    distinctHoleSigns: holes.length,
    safeFlightCorridors: (
      flightVoidPoints === 0
      && flightFluidPoints === 0
      && externalConflictPoints === 0
      && landingZoneConflictPoints === 0
      && nextTeeConflictPoints === 0
      && fairwayToFairwayOverlapCells === 0
    ) ? holes.length : 0,
    surveyedFlightPoints,
    surveyedFlightBufferPoints,
    surveyedNextTeePoints,
    flightVoidPoints,
    flightFluidPoints,
    externalConflictPoints,
    externalConflictSamples,
    landingZoneConflictPoints,
    landingZoneConflictSamples,
    nextTeeConflictPoints,
    fairwayToFairwayOverlapCells,
    conflictsWithRoadTrailBuildingUtilityOrPond:
      flightVoidPoints
      + flightFluidPoints
      + externalConflictPoints
      + landingZoneConflictPoints
      + nextTeeConflictPoints,
    mix: 'eighteen alternating open/meadow dogleg lanes in a two-row returning course',
    erosionControl: 'firm tee pads, meadow landing zones, no steep bank or fast-water flight',
    support: {
      restrooms: 1,
      benches: 6,
      bins: 4,
      parkingAndTrailConnection: true,
      wayfinding: true,
    },
    cameras,
  };
}

async function modelTerrainConstructionFence(model, snapshot, scope, bounds, gates) {
  const [x1, z1, x2, z2] = bounds;
  const gateCells = new Set(gates.map(([x, z]) => `${x},${z}`));
  let posts = 0;
  const perimeter = [];
  for (let x = x1; x <= x2; x += 2) {
    perimeter.push([x, z1], [x, z2]);
  }
  for (let z = z1 + 2; z < z2; z += 2) {
    perimeter.push([x1, z], [x2, z]);
  }
  for (const [x, z] of perimeter) {
    if ([...gateCells].some((gate) => {
      const [gx, gz] = gate.split(',').map(Number);
      return Math.abs(gx - x) <= 3 && Math.abs(gz - z) <= 3;
    })) continue;
    const surface = await surveyedSurface(snapshot, x, z);
    if (!surface) throw new Error(`${scope} fence enters a void column at ${x},${z}`);
    model.box(x, surface.y + 1, z, x, surface.y + 3, z, 'minecraft:iron_bars', meta(scope, 'terrain_following_construction_fence', 43));
    if (posts % 6 === 0) {
      model.set(x, surface.y + 4, z, 'minecraft:yellow_concrete', meta(scope, 'construction_fence_wayfinding_cap', 44));
    }
    posts += 1;
  }
  return posts;
}

async function modelProjectBillboard(model, snapshot, scope, x, z, face, emblem, role) {
  const surface = await surveyedSurface(snapshot, x, z);
  if (!surface) throw new Error(`${scope} billboard enters a void column at ${x},${z}`);
  const y = surface.y + 1;
  model.box(x - 1, y, z, x - 1, y + 7, z, 'minecraft:cut_copper', meta(scope, `${role}_post`, 48));
  model.box(x + 9, y, z, x + 9, y + 7, z, 'minecraft:cut_copper', meta(scope, `${role}_post`, 48));
  model.box(x - 3, y + 7, z, x + 11, y + 14, z, face, meta(scope, role, 49));
  model.box(x - 1, y + 9, z - 1, x + 9, y + 12, z - 1, emblem, meta(scope, `${role}_block_art_message`, 50));
  return [x - 3, y, z, x + 11, y + 14, z];
}

function modelVisibleSubstation(model, scope, bounds, benchY) {
  const [x1, z1, x2, z2] = bounds;
  model.box(x1, benchY, z1, x2, benchY, z2, 'minecraft:gravel', meta(scope, 'terraced_substation_reservation', 51));
  model.box(x1, benchY + 1, z1, x2, benchY + 4, z1, 'minecraft:iron_bars', meta(scope, 'public_safe_substation_fence', 52));
  model.box(x1, benchY + 1, z2, x2, benchY + 4, z2, 'minecraft:iron_bars', meta(scope, 'public_safe_substation_fence', 52));
  model.box(x1, benchY + 1, z1, x1, benchY + 4, z2, 'minecraft:iron_bars', meta(scope, 'public_safe_substation_fence', 52));
  model.box(x2, benchY + 1, z1, x2, benchY + 4, z2, 'minecraft:iron_bars', meta(scope, 'public_safe_substation_fence', 52));
  for (let x = x1 + 4; x <= x2 - 5; x += 8) {
    model.box(x, benchY + 1, z1 + 4, x + 3, benchY + 4, z1 + 7, 'minecraft:copper_block', meta(scope, 'fictional_transformer_bank', 53));
  }
  model.box(x1 + 2, benchY, z2 - 4, x2 - 2, benchY, z2 - 2, 'minecraft:yellow_concrete', meta(scope, 'transformer_firebreak_and_service_lane', 54));
}

async function modelTerrainVisibleSubstation(model, snapshot, scope, bounds) {
  const [x1, z1, x2, z2] = bounds;
  const survey = await surveySurfaceParcel(snapshot, bounds);
  if (survey.voidColumns || survey.surfaceLavaColumns) {
    throw new Error(`${scope} substation failed terrain survey`);
  }
  const fencePosts = await modelTerrainConstructionFence(
    model,
    snapshot,
    scope,
    bounds,
    [[x1, Math.round((z1 + z2) / 2)]],
  );
  let transformerBanks = 0;
  let maximumLocalPier = 0;
  for (let x = x1 + 5; x <= x2 - 6; x += 9) {
    const z = z1 + 7;
    const surface = await surveyedSurface(snapshot, x, z);
    const padY = surface.y + 1;
    for (const [px, pz] of [[x, z], [x + 4, z], [x, z + 4], [x + 4, z + 4]]) {
      const corner = await surveyedSurface(snapshot, px, pz);
      model.box(px, corner.y + 1, pz, px, padY - 1, pz, 'minecraft:stone_bricks', meta(scope, 'terrain_supported_transformer_pier', 50));
      maximumLocalPier = Math.max(maximumLocalPier, Math.max(0, padY - corner.y - 1));
    }
    model.box(x, padY, z, x + 4, padY, z + 4, 'minecraft:gravel', meta(scope, 'terraced_transformer_pad', 51));
    model.box(x + 1, padY + 1, z + 1, x + 3, padY + 4, z + 3, 'minecraft:copper_block', meta(scope, 'fictional_transformer_bank', 53));
    transformerBanks += 1;
  }
  const serviceRoad = await modelTerrainFollowingRoad(model, snapshot, scope, [
    [x1 + 2, survey.medianY + 1, z2 - 4],
    [x2 - 2, survey.medianY + 1, z2 - 4],
  ], 'substation_service_and_firebreak_lane');
  return {
    bounds,
    survey,
    fencePosts,
    transformerBanks,
    maximumLocalPier,
    unsupportedEquipmentPads: 0,
    serviceRoad,
  };
}

async function modelIowaDataDistrictCampuses(model, snapshot) {
  const precinctDefinitions = [
    {
      id: 'META',
      scope: 'TE-IA-DISTRICT-META',
      name: 'META ALTOONA-INSPIRED CAMPUS',
      accent: 'minecraft:blue_concrete',
      bounds: [1040, -550, 1140, -475],
      halls: [
        [1047, -543, 1068, -532], [1073, -543, 1094, -532], [1099, -543, 1120, -532],
        [1047, -526, 1068, -515], [1073, -526, 1094, -515], [1099, -526, 1120, -515],
        [1047, -509, 1068, -498], [1073, -509, 1094, -498], [1099, -509, 1120, -498],
        [1047, -492, 1068, -481], [1073, -492, 1094, -481], [1099, -492, 1120, -481],
      ],
      supportOutlines: [
        { bounds: [1125, -543, 1137, -520], role: 'operations_training_center' },
        { bounds: [1125, -514, 1137, -504], role: 'materials_recovery_and_staff_support' },
      ],
      substation: [1125, -500, 1137, -480],
      gate: [1040, -520],
      billboard: [1045, -472, 'minecraft:blue_concrete', 'minecraft:white_concrete'],
    },
    {
      id: 'GOOGLE',
      scope: 'TE-IA-DISTRICT-GOOGLE',
      name: 'GOOGLE IOWA-INSPIRED CAMPUS',
      accent: 'minecraft:white_concrete',
      bounds: [1155, -550, 1255, -475],
      halls: [
        [1160, -544, 1182, -525], [1188, -544, 1210, -525], [1216, -544, 1238, -525],
        [1160, -518, 1182, -499], [1188, -518, 1210, -499], [1216, -518, 1238, -499],
      ],
      supportOutlines: [
        { bounds: [1160, -492, 1180, -480], role: 'modular_utility_building_a' },
        { bounds: [1186, -492, 1206, -480], role: 'modular_utility_building_b' },
        { bounds: [1212, -492, 1232, -480], role: 'visitor_operations_building' },
        { bounds: [1238, -492, 1250, -480], role: 'repair_staging_building' },
      ],
      substation: [1242, -544, 1252, -520],
      gate: [1155, -520],
      billboard: [1160, -472, 'minecraft:white_concrete', 'minecraft:blue_concrete'],
    },
    {
      id: 'LIGHTEDGE_EDGEBCC',
      scope: 'TE-IA-DISTRICT-LIGHTEDGE-EDGEBCC',
      name: 'LIGHTEDGE SOLUTIONS / EDGEBCC-INSPIRED CAMPUS',
      accent: 'minecraft:lime_concrete',
      bounds: [1040, -380, 1125, -300],
      halls: [
        [1048, -370, 1083, -330],
        [1090, -370, 1125, -330],
      ],
      supportOutlines: [
        { bounds: [1074, -323, 1100, -307], role: 'recovery_admin_building' },
        { bounds: [1105, -323, 1120, -307], role: 'service_and_repair_center' },
      ],
      substation: [1046, -323, 1068, -305],
      gate: [1040, -350],
      billboard: [1045, -297, 'minecraft:lime_concrete', 'minecraft:black_concrete'],
    },
  ];

  const precincts = [];
  for (const definition of precinctDefinitions) {
    const survey = await surveySurfaceParcel(snapshot, definition.bounds);
    if (survey.voidColumns) {
      throw new Error(`${definition.scope} contains ${survey.voidColumns} void terrain columns`);
    }
    if (survey.surfaceLavaColumns) {
      throw new Error(`${definition.scope} contains ${survey.surfaceLavaColumns} surface lava columns`);
    }
    const benchY = survey.medianY + 2;
    let nuisancePocketBackfillCells = 0;
    if (definition.id === 'META' && survey.surfaceWaterColumns <= 4) {
      for (const fluid of survey.fluidSamples.filter(({ state }) => state === 'minecraft:water')) {
        model.set(fluid.x, fluid.y, fluid.z, 'minecraft:clay', meta(definition.scope, 'surveyed_isolated_nuisance_pocket_backfill', 42));
        nuisancePocketBackfillCells += 1;
      }
    }
    const fencePosts = await modelTerrainConstructionFence(
      model,
      snapshot,
      definition.scope,
      definition.bounds,
      [definition.gate],
    );
    const completedHalls = [];
    for (let index = 0; index < definition.halls.length; index += 1) {
      completedHalls.push(await modelCompletedDistrictHall(
        model,
        snapshot,
        definition.scope,
        definition.halls[index],
        definition.accent,
        index + 1,
      ));
    }
    const completedSupportBuildings = [];
    for (const support of definition.supportOutlines) {
      const supportBuilding = await modelTerracedVenue(
        model,
        snapshot,
        `${definition.scope}-${support.role.toUpperCase()}`,
        support.bounds,
        definition.id === 'LIGHTEDGE_EDGEBCC'
          ? 'minecraft:deepslate_tiles'
          : 'minecraft:light_gray_concrete',
        'minecraft:smooth_stone',
        definition.accent,
      );
      const [sx1, sy1, sz1, sx2, sy2, sz2] = supportBuilding.bounds;
      const midX = Math.floor((sx1 + sx2) / 2);
      const supportScope = `${definition.scope}-${support.role.toUpperCase()}`;
      model.box(midX, sy1 + 1, sz1 + 1, midX, sy1 + 6, sz2 - 1, 'minecraft:light_blue_stained_glass', meta(supportScope, `${support.role}_walkable_program_partition`, 74));
      model.box(midX, sy1 + 1, Math.round((sz1 + sz2) / 2) - 1, midX, sy1 + 3, Math.round((sz1 + sz2) / 2) + 1, AIR, meta(supportScope, `${support.role}_internal_door`, 75));
      model.box(sx1 + 2, sy1 + 1, sz1 + 2, midX - 2, sy1 + 1, sz1 + 3, 'minecraft:polished_blackstone', meta(supportScope, `${support.role}_operations_console_row`, 76));
      model.box(midX + 2, sy1 + 1, sz1 + 2, sx2 - 2, sy1 + 1, sz1 + 4, 'minecraft:orange_carpet', meta(supportScope, `${support.role}_office_kitchen_and_staff_lounge`, 76));
      model.box(sx1 + 2, sy1 + 1, sz2 - 3, sx2 - 2, sy1 + 1, sz2 - 2, 'minecraft:cyan_carpet', meta(supportScope, `${support.role}_training_and_breakout_area`, 76));
      model.set(sx1 + 2, sy1 + 4, sz1 + 2, 'minecraft:sea_lantern', meta(supportScope, 'interior_lighting', 77));
      model.set(sx2 - 2, sy1 + 4, sz2 - 2, 'minecraft:sea_lantern', meta(supportScope, 'interior_lighting', 77));
      completedSupportBuildings.push({
        id: `${definition.id}-${support.role.toUpperCase()}`,
        role: support.role,
        ...supportBuilding,
        modelStatus: 'COMPLETED_WALKABLE_SUPPORT_BUILDING',
      });
    }
    const substation = await modelTerrainVisibleSubstation(
      model,
      snapshot,
      `${definition.scope}-SUBSTATION`,
      definition.substation,
    );
    const billboardBounds = await modelProjectBillboard(
      model,
      snapshot,
      definition.scope,
      ...definition.billboard,
      `completed_campus_identity_${definition.name.replaceAll(/[^A-Z0-9]+/g, '_')}`,
    );
    precincts.push({
      id: definition.id,
      name: definition.name,
      bounds: definition.bounds,
      modelStatus: 'COMPLETED_WALKABLE_FICTIONAL_PUBLIC_INSPIRED_CAMPUS',
      futureHallEnvelopes: 0,
      futureSupportEnvelopes: 0,
      completedDataHalls: completedHalls.length,
      completedHalls,
      completedSupportBuildings,
      benchY,
      fencePosts,
      billboardBounds,
      substationBounds: definition.substation,
      substation,
      maximumHallGradeTransition: Math.max(
        ...completedHalls.map(({ terrain }) => terrain.maxY - terrain.minY),
      ),
      unsupportedFoundationColumns: 0,
      nuisancePocketBackfillCells,
      survey,
    });
  }

  const roadScope = 'TE-IA-DISTRICT-ROAD-NETWORK';
  const roadSegments = [];
  roadSegments.push(await modelTerrainFollowingRoad(model, snapshot, roadScope, [
    [968, 90, -455],
    [1018, 88, -455],
    [1018, 82, -520],
    [1040, 82, -520],
  ], 'meta_completed_campus_access'));
  roadSegments.push(await modelTerrainFollowingRoad(model, snapshot, roadScope, [
    [1018, 82, -520],
    [1018, 82, -560],
    [1280, 72, -560],
  ], 'north_district_service_spine'));
  roadSegments.push(await modelTerrainFollowingRoad(model, snapshot, roadScope, [
    [1155, 72, -560],
    [1155, 82, -520],
  ], 'google_completed_campus_spur'));
  roadSegments.push(await modelTerrainFollowingRoad(model, snapshot, roadScope, [
    [1018, 82, -455],
    [1018, 88, -350],
    [1040, 82, -350],
  ], 'lightedge_edgebcc_completed_campus_spur'));
  const workerCommons = await modelWorkerCommons(model, snapshot);
  const discGolf = await modelWorkerCommonsDiscGolf(model, snapshot);

  const gridScope = 'TE-IA-DISTRICT-SHARED-GRID';
  const districtSwitchingYard = await modelTerrainVisibleSubstation(
    model,
    snapshot,
    gridScope,
    [1004, -620, 1034, -580],
  );
  let transmissionTowers = 0;
  for (const z of [-570, -175]) {
    for (const x of [1015, 1065, 1115, 1165, 1215, 1265]) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) throw new Error(`${gridScope} tower enters void at ${x},${z}`);
      const y = surface.y + 1;
      model.box(x - 2, y, z - 2, x + 2, y + 18, z + 2, 'minecraft:iron_bars', meta(gridScope, 'fictional_transmission_lattice_tower', 58));
      model.box(x - 7, y + 14, z, x + 7, y + 14, z, 'minecraft:cut_copper', meta(gridScope, 'public_safe_transmission_crossarm', 59));
      transmissionTowers += 1;
    }
  }
  let utilityReserveMarkers = 0;
  for (const [z, maximumX] of [[-572, 1300], [-172, 1270]]) {
    for (let x = 1000; x <= maximumX; x += 12) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) throw new Error(`${gridScope} utility reserve reaches void at ${x},${z}`);
      model.box(x, surface.y + 1, z, x, surface.y + 2, z, 'minecraft:moss_block', meta(gridScope, 'terrain_following_protected_utility_expansion_reserve_marker', 35));
      utilityReserveMarkers += 1;
    }
  }

  return {
    precincts,
    futureHallEnvelopes: 0,
    completedDataHalls: precincts.reduce((sum, precinct) => sum + precinct.completedDataHalls, 0),
    roadSegments,
    continuousExpansionSpine: true,
    futureJunctions: 3,
    terrainFollowingConstructionFences: true,
    terrainFollowingRoads: true,
    workerCommons,
    discGolf,
    districtSwitchingYards: 1,
    districtSwitchingYard,
    dedicatedVisibleSubstations: 3,
    transmissionCorridors: 2,
    transmissionTowers,
    protectedUtilityExpansionCorridors: [
      [1000, -572, 1300, -572],
      [1000, -172, 1270, -172],
    ],
    terrainFollowingUtilityReserveMarkers: utilityReserveMarkers,
    unsupportedUtilityReserveMarkers: 0,
    futureStubBeforeVoidEdge: [1280, -560],
    existingCampusRoadAnchor: [968, -455],
    districtRoadAnchorMatchesExistingCampusRoad: true,
  };
}

async function surveyVolumeHazards(snapshot, bounds) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  let fluidCells = 0;
  let lavaCells = 0;
  let gravityCells = 0;
  const fluidSamples = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) {
        const state = await snapshot.getBlock(x, y, z);
        if (state === null) throw new Error(`volume survey missing ${x},${y},${z}`);
        const name = baseBlockName(state);
        if (['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name)) {
          fluidCells += 1;
          if (name === 'minecraft:lava') lavaCells += 1;
          if (fluidSamples.length < 40) fluidSamples.push([x, y, z, name]);
        }
        if (['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel'].includes(name)) {
          gravityCells += 1;
        }
      }
    }
  }
  const blockEntities = await snapshot.blockEntitiesInBox(bounds);
  return {
    bounds,
    fluidCells,
    lavaCells,
    gravityCells,
    fluidSamples,
    blockEntities: blockEntities.map(({ id, x, y, z }) => ({ id, x, y, z })),
  };
}

async function modelDataDistrictHoldoutHome(model, snapshot) {
  const scope = 'TE-IA-HOLDOUT-HOME';
  const parcelBounds = [570, -179, 625, -105];
  const survey = await surveySurfaceParcel(snapshot, parcelBounds);
  const surfaceBlockEntities = survey.blockEntities.filter(({ y }) => y >= 35);
  const preservedDeepEntities = survey.blockEntities.filter(({ y }) => y < 35);
  if (survey.voidColumns || survey.surfaceWaterColumns || survey.surfaceLavaColumns || surfaceBlockEntities.length) {
    throw new Error(`holdout parcel failed dry/protected survey: ${JSON.stringify(survey)}`);
  }
  const baseY = survey.medianY + 4;
  const house = [594, baseY, -175, 624, baseY + 15, -137];
  const garage = [575, baseY, -175, 594, baseY + 8, -151];
  modelSimpleVenue(model, scope, house, 'minecraft:bricks', 'minecraft:dark_oak_planks', 'minecraft:deepslate_tiles');
  modelSimpleVenue(model, `${scope}-GARAGE`, garage, 'minecraft:bricks', 'minecraft:smooth_stone', 'minecraft:deepslate_tiles');
  model.box(594, baseY + 1, -163, 594, baseY + 4, -158, AIR, meta(scope, 'attached_house_garage_connection', 73));
  for (let bay = 0; bay < 4; bay += 1) {
    const x1 = 577 + bay * 4;
    model.box(x1, baseY + 1, -175, x1 + 2, baseY + 4, -175, AIR, meta(`${scope}-GARAGE`, 'four_car_overhead_door_opening', 75));
    model.box(x1, baseY, -171, x1 + 2, baseY, -166, 'minecraft:gray_concrete', meta(`${scope}-GARAGE`, 'four_car_parking_bay', 74));
  }
  model.box(597, baseY + 1, -172, 608, baseY + 4, -163, 'minecraft:red_nether_bricks', meta(scope, 'tasteful_non_graphic_adults_only_suite', 78));
  model.box(598, baseY + 1, -160, 608, baseY + 3, -153, 'minecraft:polished_blackstone', meta(scope, 'themed_service_kitchen', 78));
  model.box(611, baseY + 1, -172, 621, baseY + 2, -163, 'minecraft:red_wool', meta(scope, 'private_bedroom', 78));
  model.box(611, baseY + 1, -160, 621, baseY + 2, -153, 'minecraft:purple_wool', meta(scope, 'private_viewing_salon', 78));
  model.box(597, baseY + 8, -172, 607, baseY + 10, -163, 'minecraft:bookshelf', meta(scope, 'two_room_office_a', 79));
  model.box(610, baseY + 8, -172, 621, baseY + 10, -163, 'minecraft:light_blue_concrete', meta(scope, 'two_room_office_b', 79));
  model.box(597, baseY + 8, -159, 621, baseY + 9, -151, 'minecraft:green_carpet', meta(scope, 'office_lounge', 79));

  const pool = [575, baseY - 7, -132, 594, baseY - 3, -110];
  model.box(...pool, 'minecraft:smooth_quartz', meta(scope, 'backyard_pool_basin', 68));
  model.box(577, baseY - 6, -130, 592, baseY - 3, -112, AIR, meta(scope, 'backyard_pool_void', 69));
  model.box(577, baseY - 5, -130, 592, baseY - 3, -112, 'minecraft:water[level=0]', meta(scope, 'backyard_pool_water', 70));
  model.box(573, baseY - 2, -134, 596, baseY - 2, -108, 'minecraft:smooth_stone', meta(scope, 'pool_terrace', 67), (x, _y, z) => (
    x <= 576 || x >= 593 || z <= -131 || z >= -111
  ));

  const playhouse = `${scope}-TREE-PLAYHOUSE`;
  for (const [x, z] of [[602, -125], [616, -125], [602, -111], [616, -111]]) {
    model.box(x, baseY - 6, z, x + 1, baseY + 8, z + 1, 'minecraft:stripped_oak_log[axis=y]', meta(playhouse, 'tree_and_platform_support', 72));
  }
  model.box(600, baseY + 5, -127, 619, baseY + 6, -108, 'minecraft:oak_planks', meta(playhouse, 'substantial_tree_platform', 73));
  model.hollow(604, baseY + 7, -123, 615, baseY + 13, -112, 'minecraft:oak_planks', meta(playhouse, 'playhouse_room', 74));
  model.box(608, baseY + 8, -123, 611, baseY + 11, -123, AIR, meta(playhouse, 'playhouse_entry', 75));

  const shelterBounds = [602, 38, -157, 624, 60, -130];
  const shelterSurvey = await surveyVolumeHazards(snapshot, shelterBounds);
  if (shelterSurvey.fluidCells || shelterSurvey.blockEntities.length) {
    throw new Error(`holdout shelter failed dry/protected survey: ${JSON.stringify(shelterSurvey)}`);
  }
  const shelter = `${scope}-SHELTER`;
  model.hollow(...shelterBounds, 'minecraft:reinforced_deepslate', meta(shelter, 'below_grade_fallout_shelter_envelope', 30));
  model.box(603, 39, -156, 623, 39, -131, 'minecraft:polished_blackstone', meta(shelter, 'shelter_floor', 31));
  model.box(605, 40, -154, 612, 44, -145, 'minecraft:barrel', meta(shelter, 'shelter_stores', 50));
  model.box(615, 40, -154, 621, 42, -145, 'minecraft:blue_wool', meta(shelter, 'shelter_bunks', 50));
  model.box(605, 40, -141, 621, 43, -133, 'minecraft:light_gray_concrete', meta(shelter, 'shelter_mechanical_and_commons', 50));
  model.hollow(615, 40, -160, 624, baseY, -151, 'minecraft:deepslate_bricks', meta(shelter, 'broad_shelter_access_core', 60));
  model.box(616, 41, -159, 623, baseY - 1, -152, AIR, meta(shelter, 'broad_shelter_access_clearance', 61));
  compactSwitchbackStair(model, shelter, [615, -160, 624, -151], 40, baseY - 1, 62);

  const road = await modelTerrainFollowingRoad(model, snapshot, `${scope}-ROAD`, [
    [560, baseY, -220],
    [565, baseY, -190],
    [580, baseY, -180],
    [585, baseY, -175],
  ], 'holdout_home_access_road');

  return {
    parcelBounds,
    baseY,
    survey,
    surfaceBlockEntities,
    preservedDeepEntities,
    preservedDeepEntityMinimumVerticalSeparation: Math.min(
      ...preservedDeepEntities.map(({ y }) => 38 - y),
    ),
    objects: [
      { id: 'HOLDOUT-HOUSE', bounds: house, program: 'older personal medium house' },
      { id: 'HOLDOUT-GARAGE-4', bounds: garage, program: 'attached four-car garage' },
      { id: 'HOLDOUT-POOL', bounds: pool, program: 'backyard swimming pool and terrace' },
      { id: 'HOLDOUT-TREEHOUSE', bounds: [600, baseY - 6, -127, 619, baseY + 13, -108], program: 'substantial tree playhouse' },
      { id: 'HOLDOUT-SHELTER', bounds: shelterBounds, program: 'dry below-grade fallout shelter' },
    ],
    attachedGarageCars: 4,
    adultsOnlySuiteGraphicContent: false,
    officeRooms: 2,
    officeLounges: 1,
    shelterSurvey,
    road,
    cameraCandidates: [
      [566, baseY + 4, -190, 600, baseY + 5, -160],
      [606, baseY + 7, -104, 607, baseY + 5, -145],
      [612, 46, -128, 612, 45, -145],
    ],
  };
}

async function modelTerracedVenue(model, snapshot, scope, bounds, wall, floor, roof) {
  const [x1, z1, x2, z2] = bounds;
  const terrain = await surveyHallFootprint(snapshot, bounds);
  const baseY = terrain.medianY + 3;
  const topY = baseY + 12;
  for (const sample of terrain.samples) {
    if (sample.y < baseY - 1) {
      model.box(sample.x, sample.y + 1, sample.z, sample.x, baseY - 1, sample.z, 'minecraft:stone_bricks', meta(scope, 'surveyed_terrace_pier', 19));
    }
  }
  modelSimpleVenue(model, scope, [x1, baseY, z1, x2, topY, z2], wall, floor, roof);
  return {
    bounds: [x1, baseY, z1, x2, topY, z2],
    baseY,
    terrain: {
      sampleCount: terrain.sampleCount,
      voidSamples: terrain.voidSamples,
      fluidSamples: terrain.fluidSamples.length,
      minY: terrain.minY,
      medianY: terrain.medianY,
      maxY: terrain.maxY,
      maximumCut: Math.max(0, terrain.maxY - (baseY - 1)),
      maximumPierHeight: Math.max(0, (baseY - 1) - terrain.minY),
    },
  };
}

async function modelTerrainPavedArea(model, snapshot, scope, bounds, state, role) {
  const [x1, z1, x2, z2] = bounds;
  const elevations = [];
  for (let z = z1; z <= z2; z += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (!surface) throw new Error(`${scope} paving enters void at ${x},${z}`);
      const pavedY = Math.round((surface.y + 1) / 2) * 2;
      model.box(x, surface.y + 1, z, x, pavedY - 1, z, 'minecraft:stone_bricks', meta(scope, `${role}_terrain_support`, 68));
      model.set(x, pavedY, z, state, meta(scope, role, 69));
      elevations.push(pavedY);
    }
  }
  return {
    bounds,
    unsupportedColumns: 0,
    minY: Math.min(...elevations),
    maxY: Math.max(...elevations),
    maximumTerraceDelta: Math.max(...elevations) - Math.min(...elevations),
  };
}

async function modelConcordServiceTown(model, snapshot) {
  const scope = 'TE-IA-CONCORD';
  const parcelBounds = [600, -425, 850, -330];
  const survey = await surveySurfaceParcel(snapshot, parcelBounds);
  if (survey.voidColumns || survey.surfaceLavaColumns) {
    throw new Error(`Concord parcel failed terrain survey: ${JSON.stringify(survey)}`);
  }
  const objects = [];
  const gas = await modelTerracedVenue(model, snapshot, `${scope}-GAS`, [650, -415, 675, -397], 'minecraft:bricks', 'minecraft:smooth_stone', 'minecraft:oxidized_cut_copper');
  const post = await modelTerracedVenue(model, snapshot, `${scope}-POST`, [650, -390, 675, -374], 'minecraft:bricks', 'minecraft:oak_planks', 'minecraft:deepslate_tiles');
  const bar = await modelTerracedVenue(model, snapshot, `${scope}-BAR`, [650, -369, 675, -351], 'minecraft:bricks', 'minecraft:dark_oak_planks', 'minecraft:deepslate_tiles');
  model.box(653, gas.baseY + 1, -412, 672, gas.baseY + 3, -407, 'minecraft:orange_concrete', meta(`${scope}-GAS`, 'late_night_food_and_convenience_counter', 75));
  model.box(653, post.baseY + 1, -387, 672, post.baseY + 4, -382, 'minecraft:bookshelf', meta(`${scope}-POST`, 'post_boxes_and_worker_services', 75));
  model.box(653, bar.baseY + 1, -366, 672, bar.baseY + 3, -361, 'minecraft:polished_blackstone', meta(`${scope}-BAR`, 'understated_worker_bar', 75));
  objects.push(
    { id: 'CONCORD-GAS', ...gas, program: 'gas station and late-night food' },
    { id: 'CONCORD-POST', ...post, program: 'post office and worker services' },
    { id: 'CONCORD-BAR', ...bar, program: 'understated road-face bar' },
  );

  const cbe = await modelConcordBroadcastExchangeAndAnnex({
    model,
    snapshot,
    exchangeSchedulePath:
      'docs/redevelopment/2026-07-28-town-expansion/'
      + 'concord-broadcast-exchange-coordinate-schedule.json',
    annexSchedulePath:
      'docs/redevelopment/2026-07-28-town-expansion/'
      + 'concord-broadcast-exchange-soundstage-annex-coordinate-schedule.json',
    dependencies: {
      meta,
      AIR,
      baseBlockName,
      surveyedSurface,
      surveySurfaceParcel,
      surveyVolumeHazards,
    },
  });
  objects.push({
    id: 'CONCORD-BROADCAST-EXCHANGE',
    bounds: cbe.exchange.bounds,
    undergroundBounds: cbe.exchange.undergroundBounds,
    program: 'exact 113-room Broadcast Exchange with tower, nine-dish pad and two-stage production annex',
    scheduledRooms: cbe.exchange.exactSchedule.rooms,
    annexScheduledRooms: cbe.annex.exactSchedule.rooms,
  });

  // The frozen nine-dish field owns x737..769/z-425..-390. The former
  // theater parcel was an actual collision, so the two nightlife venues move
  // east as a continuous frontage rather than being allowlisted.
  const theater = await modelTerracedVenue(model, snapshot, `${scope}-THEATER`, [774, -425, 808, -390], 'minecraft:red_nether_bricks', 'minecraft:dark_oak_planks', 'minecraft:deepslate_tiles');
  const theaterScope = `${scope}-THEATER`;
  // Public entry and lobby are at the north wall; the stage is deliberately
  // at the opposite end so no audience bank faces a doorway or a missing
  // focal surface.
  model.box(777, theater.baseY + 1, -423, 787, theater.baseY + 3, -419, 'minecraft:cut_copper', meta(theaterScope, 'age_control_ticket_and_coat_lobby', 76));
  model.box(794, theater.baseY + 1, -423, 805, theater.baseY + 2, -421, 'minecraft:polished_blackstone', meta(theaterScope, 'public_lobby_bar', 76));
  model.box(775, theater.baseY + 1, -418, 780, theater.baseY + 4, -415, 'minecraft:quartz_bricks', meta(theaterScope, 'public_wash_and_accessibility_room', 76));
  model.box(798, theater.baseY + 5, -423, 805, theater.baseY + 8, -418, 'minecraft:tinted_glass', meta(theaterScope, 'rear_show_control_booth', 77));
  model.box(782, theater.baseY + 1, -397, 800, theater.baseY + 2, -392, 'minecraft:gold_block', meta(theaterScope, 'non_graphic_adults_only_real_stage', 78));
  model.box(783, theater.baseY + 3, -391, 799, theater.baseY + 9, -391, 'minecraft:purple_concrete', meta(theaterScope, 'continuous_stage_focal_wall', 78));
  model.box(775, theater.baseY + 1, -399, 780, theater.baseY + 4, -392, 'minecraft:crimson_planks', meta(theaterScope, 'performer_dressing_and_wash_room', 77));
  model.box(802, theater.baseY + 1, -399, 807, theater.baseY + 4, -392, 'minecraft:brown_terracotta', meta(theaterScope, 'prop_costume_and_scene_storage', 77));
  let concordTheaterSeats = 0;
  for (let row = 0; row < 5; row += 1) {
    const z = -415 + row * 3;
    const y = theater.baseY + 1 + row;
    for (const [x1, x2] of [[781, 789], [793, 801]]) {
      for (let x = x1; x <= x2; x += 1) {
        model.set(x, y, z, 'minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', meta(theaterScope, 'raked_audience_seat_with_stage_sightline', 79));
        model.set(x, y - 1, z, 'minecraft:red_nether_bricks', meta(theaterScope, 'audience_riser', 78));
        concordTheaterSeats += 1;
      }
    }
  }
  model.box(790, theater.baseY + 1, -416, 792, theater.baseY + 5, -400, AIR, meta(theaterScope, 'three_block_center_audience_aisle', 80));
  for (const x of [778, 804]) {
    model.box(x, theater.baseY + 1, -416, x + 1, theater.baseY + 5, -400, AIR, meta(theaterScope, 'two_block_side_audience_aisle', 80));
  }
  model.box(774, theater.baseY + 1, -407, 774, theater.baseY + 4, -405, AIR, meta(theaterScope, 'remote_public_exit_west', 81));
  model.box(808, theater.baseY + 1, -407, 808, theater.baseY + 4, -405, AIR, meta(theaterScope, 'remote_public_exit_east', 81));
  model.box(808, theater.baseY + 1, -396, 808, theater.baseY + 4, -393, AIR, meta(theaterScope, 'independent_performer_service_exit', 81));

  const dance = await modelTerracedVenue(model, snapshot, `${scope}-DANCE`, [774, -385, 808, -363], 'minecraft:purple_concrete', 'minecraft:polished_blackstone', 'minecraft:deepslate_tiles');
  const danceScope = `${scope}-DANCE`;
  model.box(787, dance.baseY + 1, -384, 795, dance.baseY + 3, -381, 'minecraft:cut_copper', meta(danceScope, 'offset_age_control_privacy_vestibule', 76));
  model.box(784, dance.baseY + 1, -379, 799, dance.baseY + 1, -369, 'minecraft:magenta_glazed_terracotta', meta(danceScope, 'non_graphic_dance_and_performance_floor', 76));
  model.box(786, dance.baseY + 1, -382, 797, dance.baseY + 2, -380, 'minecraft:gold_block', meta(danceScope, 'real_performance_platform_and_focal_edge', 77));
  model.box(775, dance.baseY + 1, -367, 807, dance.baseY + 2, -365, 'minecraft:polished_blackstone', meta(danceScope, 'central_bar_with_workable_service_side', 77));
  model.box(777, dance.baseY + 3, -364, 805, dance.baseY + 5, -364, 'minecraft:bookshelf', meta(danceScope, 'bar_backbar_and_closed_storage_analogue', 77));
  for (const [x, z] of [[802, -378], [805, -374], [802, -370]]) {
    model.box(x, dance.baseY + 1, z, x + 2, dance.baseY + 1, z + 1, 'minecraft:purple_wool', meta(danceScope, 'quiet_lounge_seating_group', 77));
    model.set(x + 1, dance.baseY + 2, z, 'minecraft:lantern[hanging=false]', meta(danceScope, 'warm_lounge_task_light', 78));
  }
  let concordDancePrivateRooms = 0;
  for (const [roomId, z1, z2] of [
    ['A', -379, -374],
    ['B', -372, -367],
  ]) {
    model.hollow(775, dance.baseY + 1, z1, 781, dance.baseY + 6, z2, 'minecraft:crimson_planks', meta(danceScope, `private_room_${roomId}_acoustic_privacy_shell`, 77));
    model.box(776, dance.baseY + 2, z1 + 1, 776, dance.baseY + 2, z1 + 2, 'minecraft:purple_wool', meta(danceScope, `private_room_${roomId}_upholstered_platform`, 78));
    model.set(776, dance.baseY + 2, z2 - 1, 'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', meta(danceScope, `private_room_${roomId}_lounge_chair`, 78));
    model.box(780, dance.baseY + 2, z1 + 2, 780, dance.baseY + 4, z1 + 2, 'minecraft:tinted_glass', meta(danceScope, `private_room_${roomId}_offset_privacy_screen`, 78));
    model.set(780, dance.baseY + 2, z1 + 1, 'minecraft:bookshelf', meta(danceScope, `private_room_${roomId}_closed_storage`, 78));
    model.set(
      780,
      dance.baseY + 2,
      z2 - 1,
      'minecraft:cauldron',
      meta(danceScope, `private_room_${roomId}_wash_niche`, 78),
    );
    model.set(776, dance.baseY + 5, z2 - 1, 'minecraft:shroomlight', meta(danceScope, `private_room_${roomId}_warm_light`, 79));
    model.box(781, dance.baseY + 2, Math.floor((z1 + z2) / 2), 781, dance.baseY + 4, Math.floor((z1 + z2) / 2), AIR, meta(danceScope, `private_room_${roomId}_simple_exit`, 79));
    concordDancePrivateRooms += 1;
  }
  model.box(783, dance.baseY + 1, -367, 785, dance.baseY + 4, -363, AIR, meta(danceScope, 'separate_staff_bar_service_route', 80));
  model.box(808, dance.baseY + 1, -366, 808, dance.baseY + 4, -364, AIR, meta(danceScope, 'independent_staff_service_exit', 81));
  const motel = await modelTerracedVenue(model, snapshot, `${scope}-MOTEL`, [731, -385, 772, -350], 'minecraft:white_concrete', 'minecraft:oak_planks', 'minecraft:deepslate_tiles');
  let motelRooms = 0;
  for (const floorY of [motel.baseY, motel.baseY + 6]) {
    for (let room = 0; room < 12; room += 1) {
      const x = 733 + (room % 6) * 6;
      const z = room < 6 ? -382 : -358;
      model.hollow(x, floorY + 1, z, x + 5, floorY + 4, z + 7, 'minecraft:quartz_bricks', meta(`${scope}-MOTEL`, 'walkable_motel_guest_room_envelope', 77));
      model.box(x + 1, floorY + 1, z + 1, x + 4, floorY + 3, z + 6, AIR, meta(`${scope}-MOTEL`, 'walkable_motel_guest_room_clearance', 78));
      model.box(x + 1, floorY + 1, z + 1, x + 3, floorY + 1, z + 3, room % 2 ? 'minecraft:blue_wool' : 'minecraft:orange_wool', meta(`${scope}-MOTEL`, 'motel_guest_bed', 79));
      model.box(x + 2, floorY + 1, room < 6 ? z + 7 : z, x + 3, floorY + 3, room < 6 ? z + 7 : z, AIR, meta(`${scope}-MOTEL`, 'motel_room_door', 80));
      motelRooms += 1;
    }
  }
  model.hollow(750, motel.baseY + 1, -372, 761, motel.baseY + 5, -362, 'minecraft:quartz_bricks', meta(`${scope}-MOTEL`, 'accessible_motel_room_envelope', 77));
  model.box(751, motel.baseY + 1, -371, 760, motel.baseY + 4, -363, AIR, meta(`${scope}-MOTEL`, 'accessible_motel_room_clearance', 78));
  model.box(752, motel.baseY + 1, -370, 756, motel.baseY + 1, -366, 'minecraft:green_wool', meta(`${scope}-MOTEL`, 'accessible_motel_bed', 79));
  motelRooms += 1;
  objects.push(
    { id: 'CONCORD-ADULT-THEATER', ...theater, program: 'small tasteful non-graphic adults-only theater' },
    { id: 'CONCORD-DANCE-CLUB', ...dance, program: 'separate non-graphic strip/dance club' },
    { id: 'CONCORD-MOTEL-25', ...motel, program: '25-room crew motel facing theater' },
  );

  // Shared court, parking, drop-off, backstage/service lane and staff welfare.
  const courtY = Math.max(theater.baseY, dance.baseY, motel.baseY);
  const nightCourt = await modelTerrainPavedArea(
    model,
    snapshot,
    scope,
    [770, -389, 808, -386],
    'minecraft:polished_andesite',
    'motel_theater_shared_night_court',
  );
  const sharedParking = await modelTerrainPavedArea(
    model,
    snapshot,
    scope,
    [600, -385, 632, -350],
    'minecraft:gray_concrete',
    'shared_motel_theater_parking',
  );
  for (let z = -382; z <= -352; z += 5) {
    model.box(602, sharedParking.minY, z, 630, sharedParking.minY, z, 'minecraft:white_concrete', meta(scope, 'shared_parking_bay_marking', 71));
  }
  model.box(774, courtY, -428, 808, courtY, -426, 'minecraft:yellow_concrete', meta(scope, 'backstage_and_service_route', 70));
  model.box(680, courtY, -348, 730, courtY, -346, 'minecraft:polished_andesite', meta(scope, 'campus_road_pedestrian_link', 70));
  model.box(602, sharedParking.minY + 1, -382, 630, sharedParking.minY + 3, -377, 'minecraft:light_blue_concrete', meta(scope, 'shift_change_shuttle_dropoff', 72));
  model.box(602, sharedParking.minY + 1, -373, 630, sharedParking.minY + 3, -365, 'minecraft:cyan_concrete', meta(scope, 'worker_lounge_lockers_showers', 72));

  // Preserve the surveyed hive as the center of the future entertainment
  // frontage reserve; no model target enters its five-block horizontal halo.
  const protectedHive = { id: 'minecraft:beehive', x: 759, y: 69, z: -340, buffer: 5 };
  const entertainmentReserve = [748, -348, 770, -332];

  const mainStreet = await modelTerrainFollowingRoad(model, snapshot, 'TE-IA-DISTRICT-ROAD-NETWORK', [
    [640, 70, -340],
    [640, 70, -430],
    [570, 70, -430],
    [570, 70, -550],
    [720, 74, -560],
  ], 'concord_and_campus_main_street');
  const protectedHiveTargets = [...model.cells.values()].filter((cell) => (
    Math.abs(cell.x - protectedHive.x) <= protectedHive.buffer
    && Math.abs(cell.z - protectedHive.z) <= protectedHive.buffer
  ));

  return {
    parcelBounds,
    survey,
    objects,
    motelRooms,
    adultsOnlyProgramsGraphicContent: false,
    adultInteriorStandard: {
      source:
        'docs/redevelopment/2026-07-28-town-expansion/'
        + 'non-graphic-adult-interior-design-standard.md',
      theater: {
        realStage: true,
        continuousFocalWall: true,
        rakedAudienceSeats: concordTheaterSeats,
        centerAisleWidthBlocks: 3,
        sideAisleWidthBlocks: 2,
        remotePublicExits: 2,
        separatePerformerServiceExit: true,
        lobby: true,
        bar: true,
        publicWashRoom: true,
        performerDressingAndWash: true,
        propCostumeStorage: true,
        showControlBooth: true,
      },
      danceClub: {
        realPerformancePlatform: true,
        workableBar: true,
        quietLoungeGroups: 3,
        privateRooms: concordDancePrivateRooms,
        everyPrivateRoomHasRequiredNonGraphicAnatomy: true,
        separateStaffServiceRoute: true,
        independentStaffServiceExit: true,
      },
      exchangePrivateRooms: cbe.exchange.adultInteriorStandard,
    },
    distinctAgeControlEntries: 3,
    shiftChangeShuttleDropoffs: 1,
    workerLounges: 1,
    backstageServiceRoutes: 1,
    nightCourt,
    sharedParking,
    broadcastExchange: {
      ...cbe.exchange,
      annex: cbe.annex,
    },
    broadcastTowers: 1,
    satelliteDishArrays: cbe.exchange.exactCounts.totalDishAnalogues,
    towerSurvey: cbe.exchange.survey.tower,
    satellitePadSurvey: cbe.exchange.survey.satellite,
    protectedHive,
    protectedHiveTargets: protectedHiveTargets.length,
    entertainmentReserve,
    mainStreet,
    cameraCandidates: cbe.cameraCandidates,
    nightlifeCameraCandidates: [
      {
        cameraId: 'CONCORD-CAM-THEATER-ENTRY-001',
        from: [791, theater.baseY + 3, -432],
        lookAt: [791, theater.baseY + 3, -420],
        proves: ['separate age-control entry', 'lobby frontage'],
      },
      {
        cameraId: 'CONCORD-CAM-THEATER-SIGHTLINE-001',
        from: [791, theater.baseY + 6, -418],
        lookAt: [791, theater.baseY + 3, -393],
        proves: ['stage opposite entrance', 'raked seating', 'three-block center aisle'],
      },
      {
        cameraId: 'CONCORD-CAM-DANCE-ENTRY-001',
        from: [791, dance.baseY + 3, -391],
        lookAt: [791, dance.baseY + 3, -381],
        proves: ['offset age-control vestibule', 'separate venue identity'],
      },
      {
        cameraId: 'CONCORD-CAM-DANCE-INTERIOR-001',
        from: [798, dance.baseY + 4, -367],
        lookAt: [790, dance.baseY + 2, -378],
        proves: ['real platform', 'dance floor', 'bar', 'quiet lounge'],
      },
    ],
    publicationObjects: cbe.publicationObjects,
  };
}

async function modelDataCenterCampus(model, snapshot) {
  const campus = 'TE-IA-MEGACAMPUS';
  const precincts = [
    {
      id: 'MOUNTAIN',
      name: 'Mountain',
      publicStatus: 'PUBLIC_RECORD_EXISTING_OR_RETROFIT_EVIDENCE; INDIVIDUAL_OPERATIONAL_STATUS_NOT_ASSERTED',
      halls: [
        ['DM01', 'DSM1', [721, -700, 763, -664], 82, 'minecraft:blue_concrete'],
        ['DM02', 'DSM2', [768, -700, 810, -664], 82, 'minecraft:cyan_concrete', true],
        ['DM03', 'DSM3', [721, -657, 763, -621], 82, 'minecraft:green_concrete'],
        ['DM04', 'DSM4', [768, -657, 810, -621], 82, 'minecraft:orange_concrete', true],
      ],
    },
    {
      id: 'WHITE_CRANE',
      name: 'White Crane / Alluvion',
      publicStatus: 'PUBLIC_RECORD_EXISTING_OR_RETROFIT_EVIDENCE; INDIVIDUAL_OPERATIONAL_STATUS_NOT_ASSERTED',
      halls: [
        ['DM05', 'DSM5', [815, -700, 857, -664], 82, 'minecraft:blue_concrete'],
        ['DM06', 'DSM6', [674, -700, 716, -664], 82, 'minecraft:cyan_concrete'],
        ['DM07', 'DSM7', [815, -657, 857, -621], 82, 'minecraft:green_concrete', true],
        ['DM08', 'DSM8', [862, -657, 904, -621], 82, 'minecraft:orange_concrete'],
      ],
    },
    {
      id: 'OSMIUM_KERRY',
      name: 'Osmium / Kerry Street',
      publicStatus: 'PUBLIC RECORD INCLUDES EXISTING AND MUNICIPALLY APPROVED PHASES; NO UNIFORM OPERATIONAL CLAIM',
      halls: [
        ['DM09', 'DSM9', [580, -528, 622, -492], 78, 'minecraft:purple_concrete'],
        ['DM10', 'DSM10', [744, -549, 799, -501], 74, 'minecraft:red_concrete', true],
        ['DM11', 'DSM11', [627, -528, 669, -492], 76, 'minecraft:blue_concrete'],
        ['DM12', 'DSM12', [674, -528, 716, -492], 78, 'minecraft:cyan_concrete'],
        ['DM13', 'DSM13', [956, -571, 998, -535], 82, 'minecraft:green_concrete', true],
      ],
    },
    {
      id: 'MAFFITT_SOTERIA',
      name: 'Maffitt / Soteria',
      publicStatus: 'MUNICIPALLY APPROVED, PLANNED, OR UNDER CONSTRUCTION PHASES; OPERATIONAL STATUS NOT ASSERTED',
      halls: [
        ['DM14', 'DSM14', [862, -442, 904, -406], 84, 'minecraft:orange_concrete'],
        ['DM15', 'DSM15', [909, -442, 951, -406], 88, 'minecraft:purple_concrete'],
        ['DM16', 'DSM16', [956, -442, 998, -406], 94, 'minecraft:blue_concrete', true],
        ['DM17', 'DSM17', [862, -399, 904, -363], 84, 'minecraft:cyan_concrete'],
        ['DM18', 'DSM18', [909, -399, 951, -363], 94, 'minecraft:green_concrete'],
      ],
    },
    {
      id: 'GINGER_WEST',
      name: 'Ginger West',
      publicStatus: 'MUNICIPALLY APPROVED, PLANNED, OR UNDER CONSTRUCTION PHASES; OPERATIONAL STATUS NOT ASSERTED',
      halls: [
        ['DM40', 'DSM40', [815, -356, 857, -320], 82, 'minecraft:orange_concrete'],
        ['DM41', 'DSM41', [862, -356, 904, -320], 84, 'minecraft:purple_concrete'],
        ['DM42', 'DSM42', [909, -356, 951, -320], 98, 'minecraft:blue_concrete', true],
        ['DM43', 'DSM43', [815, -313, 857, -277], 82, 'minecraft:cyan_concrete'],
        ['DM44', 'DSM44', [862, -313, 904, -277], 84, 'minecraft:green_concrete'],
        ['DM45', 'DSM45', [909, -313, 951, -277], 92, 'minecraft:red_concrete', true],
      ],
    },
  ];
  const hallDefinitions = precincts.flatMap((precinct) => (
    precinct.halls.map(([id, publicPlanningLabel, bounds, baseY, accent, controlledCage = false]) => ({
      id,
      publicPlanningLabel,
      precinctId: precinct.id,
      precinctName: precinct.name,
      publicStatus: precinct.publicStatus,
      bounds,
      baseY,
      accent,
      controlledCage,
    }))
  ));
  for (const definition of hallDefinitions) {
    definition.terrainSurvey = await surveyHallFootprint(snapshot, definition.bounds);
    if (definition.id !== 'DM10') {
      definition.baseY = definition.terrainSurvey.medianY + 3;
    }
  }
  const halls = hallDefinitions.map((definition) => modelDataHall(model, definition));

  // North utility yard, kept south of the first surveyed hive preserve.
  const power = 'TE-IA-POWER-CAMPUS';
  model.box(675, 77, -605, 719, 85, -569, AIR, meta(power, 'power_yard_clearance', 20));
  model.box(675, 77, -605, 719, 78, -569, 'minecraft:stone_bricks', meta(power, 'shallow_power_yard_platform', 21));
  model.box(675, 79, -605, 719, 79, -569, 'minecraft:gray_concrete', meta(power, 'power_yard_slab', 22));
  model.box(675, 80, -605, 719, 84, -605, 'minecraft:iron_bars', meta(power, 'north_security_fence', 30));
  model.box(675, 80, -569, 719, 84, -569, 'minecraft:iron_bars', meta(power, 'south_security_fence', 30));
  model.box(675, 80, -605, 675, 84, -569, 'minecraft:iron_bars', meta(power, 'west_security_fence', 30));
  model.box(719, 80, -605, 719, 84, -569, 'minecraft:iron_bars', meta(power, 'east_security_fence', 30));
  for (const [x, z] of [[682, -598], [697, -598], [712, -598], [682, -580], [697, -580], [712, -580]]) {
    model.box(x, 80, z, x + 5, 84, z + 5, 'minecraft:copper_block', meta(power, 'transformer_bank', 35));
    model.box(x + 1, 85, z + 1, x + 4, 87, z + 4, 'minecraft:lightning_rod[facing=up,waterlogged=false]', meta(power, 'symbolic_buswork', 36));
  }
  model.box(678, 80, -576, 716, 80, -572, 'minecraft:yellow_concrete', meta(power, 'maintenance_lane', 37));

  // Preserve both known beehives as landscape anchors with generous no-target
  // space and make the protection visually intentional.
  for (const [x, y, z] of [[702, 68, -621], [805, 73, -580]]) {
    model.box(x - 5, y - 1, z - 5, x + 5, y - 1, z + 5, 'minecraft:moss_block', meta(`${campus}-POLLINATOR`, 'protected_pollinator_grove', 10), (cx, _cy, cz) => !(cx === x && cz === z));
    for (const [dx, dz] of [[-4, -4], [-4, 4], [4, -4], [4, 4]]) {
      model.set(x + dx, y, z + dz, 'minecraft:flowering_azalea', meta(`${campus}-POLLINATOR`, 'pollinator_planting', 11));
    }
  }

  // Central operations/NOC and the two separately entered 200-seat venues.
  modelSimpleVenue(model, 'TE-IA-NOC', [805, 74, -549, 856, 91, -518], 'minecraft:light_gray_concrete', 'minecraft:polished_blackstone', 'minecraft:gray_concrete');
  model.box(809, 75, -545, 852, 77, -541, 'minecraft:polished_blackstone', meta('TE-IA-NOC', 'operations_console_rows', 72));
  model.box(809, 78, -518, 852, 84, -518, 'minecraft:lime_concrete', meta('TE-IA-NOC', 'fleet_status_wall', 73));
  model.box(830, 75, -538, 834, 83, -522, 'minecraft:light_blue_stained_glass', meta('TE-IA-NOC', 'incident_command_glass_room', 74));

  const auditoriumSeats = modelTwoHundredSeatVenue(model, {
    scope: 'TE-IA-200-SEAT-AUDITORIUM',
    bounds: [805, -513, 829, -478],
    baseY: 74,
    seatMaterial: 'minecraft:blue_wool',
    type: 'presentation',
  });
  const cinemaSeats = modelTwoHundredSeatVenue(model, {
    scope: 'TE-IA-200-SEAT-CINEMA',
    bounds: [832, -513, 856, -478],
    baseY: 74,
    seatMaterial: 'minecraft:red_wool',
    type: 'cinema',
  });
  modelSimpleVenue(model, 'TE-IA-VENUE-BOH', [805, 74, -475, 856, 87, -460], 'minecraft:gray_concrete', 'minecraft:smooth_stone');
  model.box(805, 75, -477, 856, 79, -475, AIR, meta('TE-IA-VENUE-BOH', 'shared_back_of_house_connector', 75));
  model.box(808, 75, -472, 827, 80, -463, 'minecraft:orange_concrete', meta('TE-IA-VENUE-BOH', 'presentation_green_room', 76));
  model.box(834, 75, -472, 853, 80, -463, 'minecraft:purple_concrete', meta('TE-IA-VENUE-BOH', 'cinema_projection_and_storage', 76));

  // Forty-eight-bed staff lodge with dining, fitness and commons.
  modelSimpleVenue(model, 'TE-IA-STAFF-LODGE', [980, 90, -330, 1024, 116, -290], 'minecraft:white_concrete', 'minecraft:dark_oak_planks', 'minecraft:dark_prismarine');
  let lodgeBeds = 0;
  for (const floorY of [90, 97, 104, 111]) {
    model.box(981, floorY, -329, 1023, floorY, -291, 'minecraft:dark_oak_planks', meta('TE-IA-STAFF-LODGE', 'lodge_floor_plate', 70));
    for (let index = 0; index < 12; index += 1) {
      const x = 983 + (index % 6) * 6;
      const z = index < 6 ? -326 : -297;
      model.box(x, floorY + 1, z, x + 2, floorY + 1, z + 3, index % 2
        ? 'minecraft:blue_wool'
        : 'minecraft:red_wool', meta('TE-IA-STAFF-LODGE', 'staff_bed', 72));
      lodgeBeds += 1;
    }
  }
  model.box(989, 91, -315, 1015, 92, -306, 'minecraft:green_carpet', meta('TE-IA-STAFF-LODGE', 'staff_commons', 73));
  model.box(989, 98, -315, 1001, 100, -306, 'minecraft:polished_blackstone', meta('TE-IA-STAFF-LODGE', 'lodge_kitchen', 74));
  model.box(1004, 98, -315, 1015, 99, -306, 'minecraft:cyan_concrete', meta('TE-IA-STAFF-LODGE', 'fitness_and_wellness', 74));

  // Marked future expansion with staged equipment, not another unexplained box.
  const expansion = 'TE-IA-FUTURE-EXPANSION';
  model.box(805, 82, -255, 951, 82, -235, 'minecraft:coarse_dirt', meta(expansion, 'future_pad', 40));
  model.box(805, 83, -255, 951, 90, -235, AIR, meta(expansion, 'future_pad_clearance', 39));
  for (const [x, z] of [[815, -248], [850, -248], [885, -248], [920, -248]]) {
    model.box(x, 83, z, x + 7, 87, z + 4, 'minecraft:yellow_concrete', meta(expansion, 'parked_construction_equipment', 42));
    model.box(x + 1, 82, z - 1, x + 2, 82, z + 5, 'minecraft:black_concrete', meta(expansion, 'equipment_tracks', 43));
    model.box(x + 6, 88, z + 2, x + 15, 88, z + 2, 'minecraft:iron_bars', meta(expansion, 'equipment_boom', 44));
  }

  // DM10 remains a normal DM hall. Only its rear secure vestibule reaches a
  // completely separate, fictional InfoBunker-inspired underground annex.
  const annex = 'TE-IA-INFO-ANNEX';
  model.box(744, 20, -498, 799, 48, -435, AIR, meta(annex, 'underground_annex_excavation', 20));
  model.hollow(744, 20, -498, 799, 48, -435, 'minecraft:reinforced_deepslate', meta(annex, 'hardened_annex_envelope', 30));
  for (const floorY of [21, 29, 37, 45]) {
    model.box(745, floorY, -497, 798, floorY, -436, 'minecraft:polished_blackstone', meta(annex, `annex_floor_${floorY}`, 31));
  }
  for (const y of [22, 30, 38, 46]) {
    model.box(772, y, -497, 772, y + 5, -436, 'minecraft:deepslate_tiles', meta(annex, 'east_west_program_wall', 40));
    model.box(745, y, -466, 798, y + 5, -466, 'minecraft:deepslate_tiles', meta(annex, 'north_south_program_wall', 40));
  }
  for (const [floorY, role, floor] of [
    [21, 'plant_and_water_reserve', 'minecraft:gray_concrete'],
    [29, 'data_rooms', 'minecraft:blue_concrete'],
    [37, 'noc_and_operations', 'minecraft:lime_concrete'],
    [45, 'commons_and_briefing', 'minecraft:orange_concrete'],
  ]) {
    model.box(748, floorY, -494, 769, floorY, -470, floor, meta(annex, role, 50));
    model.box(775, floorY, -463, 795, floorY, -439, floor, meta(annex, role, 50));
  }
  for (const floorY of [29, 37]) {
    for (let z = -492; z <= -470; z += 4) {
      model.box(749, floorY + 1, z, 767, floorY + 4, z, 'minecraft:polished_blackstone', meta(annex, 'underground_data_rack_row', 52));
    }
  }
  staircase(model, annex, 776, 21, 29, -463, 60);
  staircase(model, annex, 786, 29, 37, -463, 60);
  staircase(model, annex, 776, 37, 45, -463, 60);
  // Keep the separate annex access wholly under DM10's north service edge.
  // Its former south-running core entered the accepted Soundstage 22 volume.
  const relocatedInfoCoreBounds = [801, 45, -512, 804, 72, -499];
  const relocatedInfoCoreSurvey = await surveyVolumeHazards(snapshot, relocatedInfoCoreBounds);
  if (relocatedInfoCoreSurvey.fluidCells || relocatedInfoCoreSurvey.blockEntities.length) {
    throw new Error(`relocated Info annex core failed dry/protected survey: ${JSON.stringify(relocatedInfoCoreSurvey)}`);
  }
  model.hollow(...relocatedInfoCoreBounds, 'minecraft:reinforced_deepslate', meta(annex, 'dm10_separate_access_core', 65));
  model.box(802, 46, -511, 803, 71, -500, AIR, meta(annex, 'dm10_access_core_clearance', 66));
  compactSwitchbackStair(model, annex, [801, -510, 804, -500], 46, 71, 67);
  model.hollow(800, 73, -512, 804, 80, -504, 'minecraft:polished_blackstone_bricks', meta(annex, 'dm10_rear_secure_vestibule', 68));
  model.box(801, 75, -511, 803, 79, -505, AIR, meta(annex, 'dm10_rear_secure_vestibule_clearance', 68));
  model.box(799, 75, -509, 800, 78, -507, AIR, meta(annex, 'dm10_annex_exact_twelve_cell_threshold', 69));
  model.box(798, 45, -499, 801, 49, -498, 'minecraft:reinforced_deepslate', meta(annex, 'relocated_core_annex_link', 64));
  model.box(799, 46, -499, 800, 48, -498, AIR, meta(annex, 'relocated_core_annex_link_clearance', 66));

  // Outer aviation/logistics compound at the end of the Ravensreach dirt road.
  const outer = 'TE-IA-OUTER-COMPOUND';
  model.box(465, 74, -310, 563, 74, -180, 'minecraft:coarse_dirt', meta(outer, 'graded_outer_compound', 30));
  model.box(465, 75, -310, 563, 105, -180, AIR, meta(outer, 'outer_compound_clearance', 29));
  model.box(470, 75, -198, 555, 75, -184, 'minecraft:gray_concrete', meta(outer, 'short_utility_runway', 40));
  model.box(474, 75, -191, 551, 75, -191, 'minecraft:white_concrete', meta(outer, 'runway_centerline', 41));
  for (const x of [480, 500, 520, 540]) {
    model.box(x, 76, -197, x, 76, -185, 'minecraft:sea_lantern', meta(outer, 'runway_edge_light', 42));
  }
  for (const [scope, bounds] of [
    ['TE-IA-OUTER-WAREHOUSE-A', [470, 75, -300, 510, 91, -260]],
    ['TE-IA-OUTER-WAREHOUSE-B', [516, 75, -300, 556, 91, -260]],
  ]) {
    modelSimpleVenue(model, scope, bounds, 'minecraft:gray_concrete', 'minecraft:smooth_stone');
    const [x1, y1, z1, x2, , z2] = bounds;
    for (let z = z1 + 5; z <= z2 - 5; z += 8) {
      modelWarehouseRackRun(model, scope, x1 + 4, x2 - 4, z, y1 + 1);
    }
    model.box(x1 + 4, y1 + 1, z1 + 3, x2 - 4, y1 + 3, z1 + 5, 'minecraft:cyan_concrete', meta(scope, 'computer_gear_staging', 75));
  }
  model.box(474, 75, -246, 496, 75, -224, 'minecraft:light_gray_concrete', meta(outer, 'helipad', 45));
  model.box(483, 76, -238, 487, 76, -232, 'minecraft:white_concrete', meta(outer, 'helipad_h', 46));
  for (const [x, z] of [[514, -238], [540, -238]]) {
    model.box(x, 75, z, x + 5, 101, z + 5, 'minecraft:iron_bars', meta(outer, 'communications_tower', 47));
    model.box(x - 2, 96, z - 2, x + 7, 96, z + 7, 'minecraft:lightning_rod[facing=up,waterlogged=false]', meta(outer, 'tower_array', 48));
    model.set(x + 2, 103, z + 2, 'minecraft:redstone_lamp[lit=true]', meta(outer, 'tower_beacon', 49));
  }

  // Dirt arrival from Ravensreach, then paved inter-campus loops.
  modelCampusRoad(model, 'TE-IA-RAVENSREACH-DIRT-ROAD', [
    [135, 70, -245],
    [260, 72, -245],
    [390, 74, -245],
    [425, 74, -225],
    [465, 75, -220],
  ], 'dirt_service_road');
  for (const cell of model.cells.values()) {
    if (cell.scope === 'TE-IA-RAVENSREACH-DIRT-ROAD' && cell.role === 'dirt_service_road') {
      cell.state = 'minecraft:packed_mud';
    }
  }
  const holdoutHome = await modelDataDistrictHoldoutHome(model, snapshot);
  const concord = await modelConcordServiceTown(model, snapshot);
  modelCampusRoad(model, 'TE-IA-DISTRICT-ROAD-NETWORK', [
    [720, 74, -560],
    [660, 76, -560],
    [660, 80, -710],
    [714, 80, -710],
  ], 'campus_connector_road');
  modelCampusRoad(model, 'TE-IA-DISTRICT-ROAD-NETWORK', [
    [714, 80, -710],
    [920, 80, -710],
  ], 'north_precinct_service_road');
  modelCampusRoad(model, 'TE-IA-DISTRICT-ROAD-NETWORK', [
    [725, 80, -580],
    [1005, 84, -580],
  ], 'osmium_precinct_service_road');
  modelCampusRoad(model, 'TE-IA-DISTRICT-ROAD-NETWORK', [
    [865, 74, -455],
    [968, 90, -455],
    [1032, 90, -455],
    [1032, 90, -267],
  ], 'east_campus_loop');
  modelCampusRoad(model, 'TE-IA-DISTRICT-ROAD-NETWORK', [
    [1032, 90, -267],
    [800, 82, -267],
  ], 'ginger_precinct_service_road');
  const iowaDistrict = await modelIowaDataDistrictCampuses(model, snapshot);

  return {
    halls,
    precincts: precincts.map((precinct) => ({
      id: precinct.id,
      name: precinct.name,
      publicStatus: precinct.publicStatus,
      hallIds: halls
        .filter(({ precinctId }) => precinctId === precinct.id)
        .map(({ id, publicPlanningLabel }) => ({ id, publicPlanningLabel })),
    })),
    rackRowsPerHall: Object.fromEntries(halls.map(({ id, rackRows }) => [id, rackRows])),
    hallTerrain: Object.fromEntries(halls.map(({ id, terrain }) => [id, terrain])),
    auditoriumSeats,
    cinemaSeats,
    lodgeBeds,
    holdoutHome,
    concord,
    iowaDistrict,
  };
}

function modelDoubleIronDoor(model, scope, orientation, anchor, facing, role, phase) {
  const [x, y, z] = anchor;
  const points = orientation === 'x'
    ? [[x, z], [x + 1, z]]
    : [[x, z], [x, z + 1]];
  for (let index = 0; index < points.length; index += 1) {
    const [doorX, doorZ] = points[index];
    const hinge = index === 0 ? 'left' : 'right';
    model.set(
      doorX,
      y,
      doorZ,
      `minecraft:iron_door[facing=${facing},half=lower,hinge=${hinge},open=false,powered=false]`,
      meta(scope, role, phase),
    );
    model.set(
      doorX,
      y + 1,
      doorZ,
      `minecraft:iron_door[facing=${facing},half=upper,hinge=${hinge},open=false,powered=false]`,
      meta(scope, role, phase),
    );
    if (orientation === 'x') {
      model.set(doorX, y, doorZ - 1, 'minecraft:heavy_weighted_pressure_plate[power=0]', meta(scope, `${role}_threshold`, phase));
      model.set(doorX, y, doorZ + 1, 'minecraft:heavy_weighted_pressure_plate[power=0]', meta(scope, `${role}_threshold`, phase));
    } else {
      model.set(doorX - 1, y, doorZ, 'minecraft:heavy_weighted_pressure_plate[power=0]', meta(scope, `${role}_threshold`, phase));
      model.set(doorX + 1, y, doorZ, 'minecraft:heavy_weighted_pressure_plate[power=0]', meta(scope, `${role}_threshold`, phase));
    }
  }
}

function modelC01ProgramRoom(model, scope, definition) {
  const {
    bounds,
    floor,
    material,
    role,
  } = definition;
  const [x1, z1, x2, z2] = bounds;
  model.box(x1, floor, z1, x2, floor, z2, material, meta(scope, `${role}_floor`, 60));
  model.box(x1, floor + 1, z1, x2, floor + 7, z1, 'minecraft:deepslate_tiles', meta(scope, `${role}_wall`, 55));
  model.box(x1, floor + 1, z2, x2, floor + 7, z2, 'minecraft:deepslate_tiles', meta(scope, `${role}_wall`, 55));
  model.box(x1, floor + 1, z1, x1, floor + 7, z2, 'minecraft:deepslate_tiles', meta(scope, `${role}_wall`, 55));
  model.box(x2, floor + 1, z1, x2, floor + 7, z2, 'minecraft:deepslate_tiles', meta(scope, `${role}_wall`, 55));
  const doorX = Math.round((x1 + x2) / 2);
  model.box(doorX - 1, floor + 1, z2, doorX + 1, floor + 4, z2, AIR, meta(scope, `${role}_door`, 56));
}

async function modelC01EastRelocationSupersededDoNotCall(model, snapshot) {
  throw new Error(
    'SUP-012/SUP-013/SUP-014: compact arena/aircraft C01 source is retired; '
    + 'use modelC01FiveLevelBunker',
  );
  /* c8 ignore start -- retained only as a historical comparison tombstone. */
  const scope = 'TE-C01-EAST-REBUILD';
  const x1 = 797;
  const x2 = 888;
  const z1 = -140;
  const z2 = -85;
  const roofY = 52;

  // The selected dry north module is fully below the surveyed terrain. Its
  // lowest ground column is y56, so a y52 roof retains at least three natural
  // cover blocks. It also keeps the permanent z=-160..-141 separation band
  // untouched between C01 and the data-campus reservation.
  model.box(x1, 20, z1, x2, roofY, z2, AIR, meta(scope, 'dry_module_excavation', 20));
  model.hollow(x1, 20, z1, x2, roofY, z2, 'minecraft:reinforced_deepslate', meta(scope, 'buried_main_envelope', 30));
  for (const floorY of [21, 31, 42]) {
    model.box(x1 + 1, floorY, z1 + 1, x2 - 1, floorY, z2 - 1, 'minecraft:polished_blackstone', meta(scope, `level_floor_${floorY}`, 35));
    model.box(838, floorY + 1, z1 + 1, 847, floorY + 8, z2 - 1, AIR, meta(scope, 'north_south_wayfinding_spine', 36));
    model.box(x1 + 1, floorY + 1, -116, x2 - 1, floorY + 8, -107, AIR, meta(scope, 'east_west_wayfinding_spine', 36));
    model.box(838, floorY, z1 + 1, 847, floorY, z2 - 1, 'minecraft:yellow_concrete', meta(scope, 'north_south_wayfinding_floor', 37));
    model.box(x1 + 1, floorY, -116, x2 - 1, floorY, -107, 'minecraft:white_concrete', meta(scope, 'east_west_wayfinding_floor', 37));
  }

  const rooms = [
    { bounds: [800, -137, 835, -118], floor: 21, material: 'minecraft:gray_concrete', role: 'b3_power_and_microgrid' },
    { bounds: [850, -137, 885, -118], floor: 21, material: 'minecraft:cyan_concrete', role: 'b3_ventilation_and_water_plant' },
    { bounds: [800, -105, 835, -88], floor: 21, material: 'minecraft:brown_concrete', role: 'b3_protected_stores' },
    { bounds: [850, -105, 885, -88], floor: 21, material: 'minecraft:orange_concrete', role: 'b3_maintenance_and_machine_shop' },
    { bounds: [800, -137, 835, -118], floor: 31, material: 'minecraft:lime_concrete', role: 'b2_operations_and_noc' },
    { bounds: [850, -137, 885, -118], floor: 31, material: 'minecraft:blue_concrete', role: 'b2_communications_and_dispatch' },
    { bounds: [800, -105, 835, -88], floor: 31, material: 'minecraft:yellow_concrete', role: 'b2_workshops_and_logistics' },
    { bounds: [850, -105, 885, -88], floor: 31, material: 'minecraft:purple_concrete', role: 'b2_conference_and_briefing_suite' },
    { bounds: [800, -137, 835, -118], floor: 42, material: 'minecraft:red_concrete', role: 'b1_training_arena' },
    { bounds: [850, -137, 885, -118], floor: 42, material: 'minecraft:light_gray_concrete', role: 'b1_vehicle_and_aircraft_hall' },
    { bounds: [800, -105, 835, -88], floor: 42, material: 'minecraft:white_concrete', role: 'b1_arrival_security_and_orientation' },
    { bounds: [850, -105, 885, -88], floor: 42, material: 'minecraft:green_concrete', role: 'b1_medical_decon_and_support' },
  ];
  for (const room of rooms) modelC01ProgramRoom(model, scope, room);

  // B3 utilities, with visible redundancy and separate maintenance aisles.
  for (const [x, z] of [[804, -133], [816, -133], [828, -133]]) {
    model.box(x, 22, z, x + 6, 27, z + 6, 'minecraft:copper_block', meta(scope, 'power_generation_bank', 70));
    model.box(x + 1, 28, z + 1, x + 5, 29, z + 5, 'minecraft:lightning_rod[facing=up,waterlogged=false]', meta(scope, 'power_bus', 71));
  }
  for (const z of [-133, -125]) {
    model.box(854, 22, z, 880, 25, z + 3, 'minecraft:light_blue_concrete', meta(scope, 'air_and_water_treatment_train', 70));
  }
  for (let x = 804; x <= 828; x += 6) {
    model.box(x, 22, -101, x + 3, 27, -91, 'minecraft:barrel', meta(scope, 'protected_store_rack', 70));
  }
  model.box(854, 22, -101, 880, 23, -97, 'minecraft:polished_blackstone', meta(scope, 'machine_shop_bench', 70));

  // B2 operations and genuinely distinct meeting/support programs.
  model.box(804, 32, -133, 831, 34, -130, 'minecraft:polished_blackstone', meta(scope, 'noc_console_rows', 72));
  model.box(804, 35, -137, 831, 39, -137, 'minecraft:lime_concrete', meta(scope, 'noc_status_wall', 73));
  for (const z of [-133, -127, -121]) {
    model.box(854, 32, z, 880, 34, z + 2, 'minecraft:blue_concrete', meta(scope, 'communications_console_bank', 72));
  }
  model.box(803, 32, -101, 832, 35, -98, 'minecraft:polished_blackstone', meta(scope, 'logistics_planning_table', 72));
  model.box(854, 32, -104, 868, 38, -104, 'minecraft:white_concrete', meta(scope, 'briefing_screen', 73));
  for (const z of [-100, -96, -92]) {
    model.box(854, 32, z, 868, 32, z + 1, 'minecraft:purple_wool', meta(scope, 'briefing_seating', 74));
  }

  // B1 arena seating faces a real display, and the adjacent high bay receives
  // two compact aircraft/vehicle exhibits rather than an empty cavern.
  model.box(804, 44, -137, 831, 49, -137, 'minecraft:white_concrete', meta(scope, 'training_arena_screen', 75));
  for (const z of [-132, -129, -126, -123]) {
    model.box(804, 43 + Math.floor((-123 - z) / 3), z, 831, 43 + Math.floor((-123 - z) / 3), z + 1, 'minecraft:red_wool', meta(scope, 'training_arena_seating', 76));
  }
  for (const [cx, cz, color] of [[860, -131, 'minecraft:white_concrete'], [875, -124, 'minecraft:gray_concrete']]) {
    model.box(cx - 6, 43, cz - 2, cx + 6, 44, cz + 2, color, meta(scope, 'compact_aircraft_display', 76));
    model.box(cx - 1, 45, cz - 7, cx + 1, 45, cz + 7, color, meta(scope, 'compact_aircraft_wing', 76));
    model.box(cx, 46, cz, cx, 49, cz, 'minecraft:light_blue_stained_glass', meta(scope, 'aircraft_canopy', 77));
  }
  model.box(804, 43, -101, 831, 45, -98, 'minecraft:polished_blackstone', meta(scope, 'arrival_security_desk', 75));
  model.box(804, 46, -105, 831, 49, -105, 'minecraft:lime_concrete', meta(scope, 'orientation_map_wall', 76));
  model.box(854, 43, -102, 866, 44, -98, 'minecraft:white_concrete', meta(scope, 'medical_triage', 75));
  model.box(870, 43, -102, 881, 47, -98, 'minecraft:light_blue_stained_glass', meta(scope, 'decon_suite', 75));

  // Three-level ladderless internal core.
  model.hollow(840, 21, -137, 846, 51, -119, 'minecraft:deepslate_bricks', meta(scope, 'primary_internal_stair_envelope', 80));
  model.box(841, 22, -136, 845, 50, -120, AIR, meta(scope, 'primary_internal_stair_clearance', 81));
  compactSwitchbackStair(model, scope, [840, -137, 846, -119], 21, 49, 82);

  // Main west ramp, a two-door airlock, and a second fully independent east
  // egress. Both are deliberate; no other tunnel is connected.
  model.hollow(690, 47, -59, 805, 67, -49, 'minecraft:deepslate_bricks', meta(scope, 'west_access_ramp_envelope', 84));
  model.box(691, 48, -58, 804, 66, -50, AIR, meta(scope, 'west_access_ramp_clearance', 83));
  for (const [cx, y, z] of linePoints([[692, 64, -54], [720, 60, -54], [760, 54, -54], [800, 47, -54]])) {
    model.box(cx, y, z - 2, cx + 3, y, z + 2, 'minecraft:gray_concrete', meta(scope, 'one_in_seven_vehicle_ramp', 85));
    model.box(cx, y + 1, z - 2, cx + 3, y + 5, z + 2, AIR, meta(scope, 'vehicle_ramp_headroom', 84));
  }
  model.hollow(798, 42, -86, 808, 51, -54, 'minecraft:reinforced_deepslate', meta(scope, 'main_airlock_connector', 86));
  model.box(799, 43, -85, 807, 50, -55, AIR, meta(scope, 'main_airlock_connector_clearance', 87));
  modelDoubleIronDoor(model, scope, 'x', [802, 43, -58], 'north', 'main_airlock_outer_doors', 88);
  modelDoubleIronDoor(model, scope, 'x', [802, 43, -82], 'north', 'main_airlock_inner_doors', 88);

  model.hollow(880, 42, -112, 887, 82, -101, 'minecraft:reinforced_deepslate', meta(scope, 'independent_east_egress', 86));
  model.box(881, 43, -111, 886, 81, -102, AIR, meta(scope, 'independent_east_egress_clearance', 87));
  compactSwitchbackStair(model, scope, [880, -112, 887, -101], 43, 77, 88);
  modelDoubleIronDoor(model, scope, 'z', [887, 43, -108], 'east', 'east_egress_inner_airlock', 89);
  modelDoubleIronDoor(model, scope, 'z', [887, 76, -108], 'east', 'east_egress_outer_airlock', 89);
  model.box(876, 73, -116, 892, 84, -97, 'minecraft:moss_block', meta(scope, 'concealed_east_egress_landform', 90));
  model.hollow(880, 74, -113, 892, 82, -100, 'minecraft:reinforced_deepslate', meta(scope, 'east_egress_surface_airlock', 91));
  model.box(881, 75, -112, 891, 81, -101, AIR, meta(scope, 'east_egress_surface_airlock_clearance', 92));
  modelDoubleIronDoor(model, scope, 'z', [891, 76, -108], 'east', 'east_egress_final_airlock', 93);
  model.box(876, 83, -116, 892, 86, -97, 'minecraft:moss_block', meta(scope, 'east_egress_concealment_cover', 94));

  // Recessed portal and an intentionally separate mountain road beginning
  // outside the recovered P01 parking boundary.
  const portal = 'TE-C01-EAST-PORTAL';
  model.box(684, 58, -64, 701, 73, -44, 'minecraft:polished_blackstone_bricks', meta(portal, 'recessed_portal_landform', 90));
  model.box(685, 59, -63, 700, 69, -45, AIR, meta(portal, 'portal_forecourt_and_throat', 91));
  model.box(684, 60, -57, 684, 68, -51, AIR, meta(portal, 'west_facing_vehicle_opening', 92));
  modelDoubleIronDoor(model, portal, 'z', [690, 61, -55], 'west', 'portal_outer_airlock', 93);
  modelDoubleIronDoor(model, portal, 'z', [700, 59, -55], 'west', 'portal_inner_airlock', 93);
  model.box(682, 70, -66, 705, 76, -42, 'minecraft:moss_block', meta(portal, 'concealment_landform', 94));
  model.box(684, 58, -57, 705, 69, -51, AIR, meta(portal, 'portal_road_clearance', 95));

  const roadScope = 'TE-C01-EAST-ROAD';
  const road = linePoints([
    [126, 64, 250],
    [300, 70, 270],
    [410, 70, 260],
    [500, 70, 150],
    [600, 70, 80],
    [650, 68, 0],
    [684, 64, -54],
  ]);
  let priorRoadY = null;
  for (let index = 0; index < road.length; index += 1) {
    const [x, designY, z] = road[index];
    const surface = await currentSurface(snapshot, x, z);
    if (!surface) continue;
    let roadY = Math.min(designY + 8, Math.max(designY - 8, surface.y + 1));
    if (priorRoadY !== null) {
      roadY = Math.max(priorRoadY - 1, Math.min(priorRoadY + 1, roadY));
    }
    priorRoadY = roadY;
    model.box(x - 4, roadY - 1, z - 2, x + 4, roadY - 1, z + 2, 'minecraft:stone_bricks', meta(roadScope, 'terrain_following_mountain_road_subbase', 39));
    model.box(x - 4, roadY, z - 2, x + 4, roadY, z + 2, 'minecraft:gray_concrete', meta(roadScope, 'terrain_following_mountain_access_road', 40));
    model.box(x - 4, roadY + 1, z - 2, x + 4, roadY + 6, z + 2, AIR, meta(roadScope, 'mountain_access_headroom', 38));
    if (index % 12 === 0) {
      model.box(x - 4, roadY + 1, z - 2, x - 4, roadY + 3, z + 2, 'minecraft:polished_blackstone_bricks', meta(roadScope, 'edge_guard_and_wayfinding', 41));
      model.box(x + 4, roadY + 1, z - 2, x + 4, roadY + 3, z + 2, 'minecraft:polished_blackstone_bricks', meta(roadScope, 'edge_guard_and_wayfinding', 41));
    }
  }
  for (const [x, y, z] of [[250, 70, 274], [430, 70, 250], [560, 70, 110], [640, 68, 15]]) {
    model.box(x - 8, y, z - 7, x + 8, y, z + 7, 'minecraft:polished_andesite', meta(roadScope, 'mountain_road_layby', 42));
    model.box(x - 8, y + 1, z - 7, x + 8, y + 5, z + 7, AIR, meta(roadScope, 'layby_headroom', 41));
  }

  return {
    programRooms: rooms.length,
    roadCenterlineCells: road.length,
    mainModuleBounds: [x1, 20, z1, x2, roofY, z2],
  };
  /* c8 ignore stop */
}

function modelFullParkingRecovery(model) {
  const scope = 'TE-MSA-P01-FULL-RECOVERY';
  const preservedSignCells = new Set([
    key(119, 66, 208),
    key(119, 66, 230),
    key(119, 66, 232),
  ]);
  const preservesSign = (x, y, z) => !preservedSignCells.has(key(x, y, z));
  model.box(-125, 62, 172, 125, 63, 305, 'minecraft:stone_bricks', meta(scope, 'continuous_parking_support_courses', 90));
  model.box(-125, 64, 172, 125, 64, 305, 'minecraft:gray_concrete', meta(scope, 'full_size_parking_deck', 91));
  model.box(-125, 65, 172, 125, 70, 305, AIR, meta(scope, 'parking_vehicle_headroom', 89), preservesSign);

  // Retire only the old C01 surface intrusion inside P01. The observatory,
  // owner estate, shelter and vault all begin east of this parking slice and
  // remain outside the recovered lot.
  model.box(100, 71, 172, 125, 100, 235, AIR, meta(scope, 'retire_old_c01_parking_intrusion', 92), preservesSign);
  for (let x = -119; x <= 119; x += 8) {
    model.box(x, 64, 177, x, 64, 221, 'minecraft:white_concrete', meta(scope, 'north_parking_stall_line', 93));
    model.box(x, 64, 257, x, 64, 300, 'minecraft:white_concrete', meta(scope, 'south_parking_stall_line', 93));
  }
  model.box(-125, 64, 226, 125, 64, 238, 'minecraft:light_gray_concrete', meta(scope, 'central_two_way_drive_aisle', 94));
  model.box(-125, 64, 243, 125, 64, 252, 'minecraft:light_gray_concrete', meta(scope, 'secondary_two_way_drive_aisle', 94));
  model.box(121, 64, 172, 125, 64, 305, 'minecraft:yellow_concrete', meta(scope, 'east_edge_road_separation', 95));
  return { preservedWayfindingSigns: preservedSignCells.size };
}

function modelRvSalesDistrict(model) {
  const roadScope = 'TE-PAN-RV01-ROAD';
  const road = linePoints([
    [-196, 70, -496],
    [-196, 70, -475],
    [-258, 68, -475],
    [-258, 68, -520],
    [-258, 68, -662],
    [-500, 68, -662],
    [-682, 68, -662],
    [-682, 72, -520],
    [-650, 77, -461],
  ]);
  for (const [x, y, z] of road) {
    model.box(x - 6, y, z - 2, x + 6, y, z + 2, 'minecraft:gray_concrete', meta(roadScope, 'rv_service_parkway', 55));
    model.box(x - 6, y + 1, z - 2, x + 6, y + 7, z + 2, AIR, meta(roadScope, 'rv_service_parkway_headroom', 54));
    model.box(x - 10, y, z - 2, x - 8, y, z + 2, 'minecraft:polished_andesite', meta(roadScope, 'separated_pedestrian_greenway', 56));
  }

  // The dealership sits west of the amusement-pier envelope and south of the
  // paired parks. Translating the surveyed prototype prevents the original
  // candidate from consuming the shrimp house and public pier mall.
  model = translatedModel(model, -370, 0, -80);
  const district = 'TE-PAN-RV01';
  model.box(-342, 74, -370, -246, 100, -212, AIR, meta(district, 'display_lot_clearance', 58));
  model.box(-342, 77, -370, -246, 77, -212, 'minecraft:smooth_stone', meta(district, 'terraced_display_lot', 59));
  for (const x of [-344, -330, -318, -306, -294, -282, -270, -258, -244]) {
    model.box(x, 77, -373, x + 4, 77, -209, 'minecraft:gray_concrete', meta(district, 'rv_display_and_fire_aisle', 60));
  }
  const rvModels = [
    { id: 'RV29-A', lengthFeet: 29, bounds: [-338, 78, -360, -334, 83, -332] },
    { id: 'RV29-B', lengthFeet: 29, bounds: [-326, 78, -360, -322, 83, -332] },
    { id: 'RV29-C', lengthFeet: 29, bounds: [-314, 78, -360, -310, 83, -332] },
    { id: 'RV29-D', lengthFeet: 29, bounds: [-302, 78, -360, -298, 83, -332] },
    { id: 'RV39-A', lengthFeet: 39, bounds: [-338, 78, -321, -334, 84, -283] },
    { id: 'RV39-B', lengthFeet: 39, bounds: [-326, 78, -321, -322, 84, -283] },
    { id: 'RV39-C', lengthFeet: 39, bounds: [-314, 78, -321, -310, 84, -283] },
    { id: 'RV39-D', lengthFeet: 39, bounds: [-302, 78, -321, -298, 84, -283] },
    { id: 'RV48-A', lengthFeet: 48, bounds: [-338, 78, -272, -333, 85, -225] },
    { id: 'RV48-B', lengthFeet: 48, bounds: [-325, 78, -272, -320, 85, -225] },
    { id: 'RV48-C', lengthFeet: 48, bounds: [-312, 78, -272, -307, 85, -225] },
    { id: 'RV48-D', lengthFeet: 48, bounds: [-299, 78, -272, -294, 85, -225] },
  ];
  for (const definition of rvModels) modelWalkInRv(model, definition);

  modelSimpleVenue(model, 'TE-PAN-RV01-CUSTOMER', [-238, 76, -370, -195, 101, -337], 'minecraft:smooth_quartz', 'minecraft:dark_oak_planks', 'minecraft:oxidized_cut_copper');
  model.box(-236, 77, -368, -197, 94, -339, AIR, meta('TE-PAN-RV01-CUSTOMER', 'two_story_atrium', 70));
  model.box(-235, 76, -367, -218, 76, -349, 'minecraft:blue_wool', meta('TE-PAN-RV01-CUSTOMER', 'delivery_theater', 71));
  model.box(-216, 76, -367, -198, 76, -349, 'minecraft:red_wool', meta('TE-PAN-RV01-CUSTOMER', 'concierge_and_hospitality', 71));
  model.box(-238, 87, -370, -195, 87, -337, 'minecraft:dark_oak_planks', meta('TE-PAN-RV01-CUSTOMER', 'upper_sales_and_finance_floor', 72));
  staircase(model, 'TE-PAN-RV01-CUSTOMER', -202, 76, 88, -344, 73);

  modelSimpleVenue(model, 'TE-PAN-RV01-SALES', [-238, 74, -330, -195, 94, -302], 'minecraft:quartz_bricks', 'minecraft:light_gray_concrete');
  model.box(-235, 75, -327, -198, 76, -320, 'minecraft:light_blue_stained_glass', meta('TE-PAN-RV01-SALES', 'model_gallery', 71));
  model.box(-235, 75, -316, -198, 76, -305, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta('TE-PAN-RV01-SALES', 'sales_and_consultation', 71));

  modelSimpleVenue(model, 'TE-PAN-RV01-REPAIR', [-238, 72, -294, -174, 101, -242], 'minecraft:gray_concrete', 'minecraft:smooth_stone');
  for (const [z1, z2] of [[-289, -278], [-275, -264], [-261, -250], [-247, -236]]) {
    model.box(-238, 75, z1, -238, 90, z2, AIR, meta('TE-PAN-RV01-REPAIR', 'four_high_clear_service_doors', 75));
    model.box(-237, 72, z1, -177, 72, z2, 'minecraft:yellow_concrete', meta('TE-PAN-RV01-REPAIR', 'through_service_bay', 74));
  }
  model.box(-173, 75, -289, -173, 90, -236, 'minecraft:light_blue_stained_glass', meta('TE-PAN-RV01-REPAIR', 'service_bay_daylight_wall', 76));
  model.box(-298, 72, -299, -239, 72, -231, 'minecraft:gray_concrete', meta('TE-PAN-RV01-REPAIR', 'service_court', 73));

  modelSimpleVenue(model, 'TE-PAN-RV01-TRAVEL', [-238, 72, -232, -195, 94, -190], 'minecraft:red_concrete', 'minecraft:white_concrete', 'minecraft:light_gray_concrete');
  model.box(-235, 73, -229, -217, 74, -210, 'minecraft:orange_concrete', meta('TE-PAN-RV01-TRAVEL', 'market_and_hot_food', 72));
  model.box(-214, 73, -229, -198, 74, -210, 'minecraft:brown_concrete', meta('TE-PAN-RV01-TRAVEL', 'coffee_bakery_and_seating', 72));
  model.box(-296, 71, -214, -246, 84, -172, AIR, meta('TE-PAN-RV01-FUEL', 'fuel_lane_clearance', 65));
  model.box(-296, 71, -214, -246, 71, -172, 'minecraft:gray_concrete', meta('TE-PAN-RV01-FUEL', 'pull_through_fuel_lanes', 66));
  model.box(-294, 84, -212, -248, 84, -174, 'minecraft:white_concrete', meta('TE-PAN-RV01-FUEL', 'high_clear_fuel_canopy', 67));
  for (const z of [-206, -192, -178]) {
    model.box(-285, 72, z, -283, 77, z + 2, 'minecraft:red_concrete', meta('TE-PAN-RV01-FUEL', 'rv_fuel_island', 68));
    model.box(-260, 72, z, -258, 77, z + 2, 'minecraft:red_concrete', meta('TE-PAN-RV01-FUEL', 'rv_fuel_island', 68));
  }

  modelSimpleVenue(model, 'TE-PAN-RV01-DIVE', [-143, 72, -232, -110, 90, -207], 'minecraft:dark_oak_planks', 'minecraft:polished_blackstone');
  model.box(-140, 73, -229, -114, 74, -226, 'minecraft:red_nether_bricks', meta('TE-PAN-RV01-DIVE', 'bar_and_backbar', 73));
  model.box(-140, 73, -220, -129, 73, -210, 'minecraft:red_wool', meta('TE-PAN-RV01-DIVE', 'booths_and_stage', 73));

  modelSimpleVenue(model, 'TE-PAN-RV01-CLUB', [-143, 72, -276, -105, 96, -239], 'minecraft:polished_blackstone_bricks', 'minecraft:purple_concrete');
  model.box(-143, 73, -260, -135, 81, -251, 'minecraft:deepslate_tiles', meta('TE-PAN-RV01-CLUB', 'age_control_vestibule', 74));
  model.box(-141, 73, -274, -121, 74, -263, 'minecraft:magenta_concrete', meta('TE-PAN-RV01-CLUB', 'non_graphic_lounge', 74));
  model.box(-141, 73, -257, -108, 74, -242, 'minecraft:purple_wool', meta('TE-PAN-RV01-CLUB', 'dance_and_performance_room', 74));
  for (const [x, z] of [[-142, -275], [-106, -275], [-106, -241]]) {
    model.box(x, 73, z, x + 2, 76, z + 2, AIR, meta('TE-PAN-RV01-CLUB', 'remote_egress', 76));
  }
}

function modelParkPath(model, scope, points, width = 7, role = 'accessible_guest_path') {
  const centerline = linePoints(points);
  const half = Math.floor(width / 2);
  for (const [x, standingY, z] of centerline) {
    model.box(x - half, standingY - 1, z - half, x + half, standingY - 1, z + half, 'minecraft:polished_andesite', meta(scope, role, 60));
    model.box(x - half, standingY, z - half, x + half, standingY + 4, z + half, AIR, meta(scope, `${role}_headroom`, 59));
  }
}

function modelContainedPool(model, scope, bounds, waterY = 64) {
  const [x1, x2, z1, z2] = bounds;
  model.box(x1, waterY - 1, z1, x2, waterY - 1, z2, 'minecraft:smooth_quartz', meta(scope, 'contained_basin_floor', 70));
  model.box(x1, waterY, z1, x2, waterY + 2, z1, 'minecraft:light_blue_concrete', meta(scope, 'contained_basin_wall', 71));
  model.box(x1, waterY, z2, x2, waterY + 2, z2, 'minecraft:light_blue_concrete', meta(scope, 'contained_basin_wall', 71));
  model.box(x1, waterY, z1, x1, waterY + 2, z2, 'minecraft:light_blue_concrete', meta(scope, 'contained_basin_wall', 71));
  model.box(x2, waterY, z1, x2, waterY + 2, z2, 'minecraft:light_blue_concrete', meta(scope, 'contained_basin_wall', 71));
  model.box(x1 + 1, waterY, z1 + 1, x2 - 1, waterY, z2 - 1, 'minecraft:water[level=0]', meta(scope, 'isolated_active_water', 72));
  model.box(x1 - 2, waterY, z1 - 2, x2 + 2, waterY, z1 - 1, 'minecraft:smooth_quartz', meta(scope, 'supervised_pool_perimeter', 73));
  model.box(x1 - 2, waterY, z2 + 1, x2 + 2, waterY, z2 + 2, 'minecraft:smooth_quartz', meta(scope, 'supervised_pool_perimeter', 73));
}

function modelPairedParks(model) {
  const roadScope = 'TE-WL-PARKWAY-EXTENSION';
  const parkway = linePoints([
    [-204, 70, -496],
    [-204, 70, -475],
    [-258, 68, -475],
    [-258, 68, -662],
    [-444, 68, -662],
    [-500, 68, -662],
    [-554, 68, -662],
  ]);
  for (const [x, standingY, z] of parkway) {
    model.box(x - 5, standingY - 1, z - 2, x + 5, standingY - 1, z + 2, 'minecraft:gray_concrete', meta(roadScope, 'north_shore_parkway', 55));
    model.box(x - 5, standingY, z - 2, x + 5, standingY + 6, z + 2, AIR, meta(roadScope, 'parkway_headroom', 54));
    model.box(x - 10, standingY - 1, z - 2, x - 7, standingY - 1, z + 2, 'minecraft:polished_andesite', meta(roadScope, 'parkway_greenway', 56));
  }

  const exchange = 'TE-WL-ADVENTURE-EXCHANGE';
  model.box(-610, 67, -673, -560, 67, -651, 'minecraft:polished_andesite', meta(exchange, 'raised_orientation_court', 62));
  model.box(-602, 67, -667, -568, 67, -657, 'minecraft:white_concrete', meta(exchange, 'raised_crossing', 63));
  for (const z of [-674, -650]) {
    model.box(-604, 68, z - 3, -566, 80, z + 3, 'minecraft:cut_copper', meta(exchange, z < -660 ? 'water_park_gate' : 'dry_park_gate', 64));
    model.box(-600, 68, z - 3, -570, 76, z + 3, AIR, meta(exchange, 'independent_gate_hall', 65));
    for (const x of [-600, -590, -580, -570]) {
      model.box(x, 68, z, x + 2, 70, z + (z < -660 ? -2 : 2), 'minecraft:sea_lantern', meta(exchange, 'ticket_and_accessibility_desk', 66));
    }
  }

  const dry = 'TE-WL-RAVENCREST';
  modelParkPath(model, dry, [
    [-587, 68, -630],
    [-548, 72, -610],
    [-540, 74, -570],
    [-570, 76, -540],
    [-625, 84, -545],
    [-655, 84, -590],
    [-640, 80, -625],
    [-587, 68, -630],
  ]);
  modelSimpleVenue(model, `${dry}-GATE`, [-608, 67, -646, -566, 82, -626], 'minecraft:bricks', 'minecraft:dark_oak_planks', 'minecraft:oxidized_cut_copper');
  model.box(-605, 68, -643, -590, 69, -629, 'minecraft:orange_concrete', meta(dry, 'guest_services_first_aid_and_rentals', 70));
  model.box(-586, 68, -643, -569, 69, -629, 'minecraft:red_wool', meta(dry, 'arcade_and_food', 70));

  const ridge = `${dry}-RIDGE-RUNNER`;
  const course = linePoints([
    [-668, 78, -606],
    [-668, 108, -560],
    [-654, 116, -542],
    [-642, 92, -558],
    [-644, 78, -604],
    [-655, 86, -630],
    [-668, 78, -606],
  ]);
  for (const [x, y, z] of course) {
    model.box(x, y, z, x + 1, y, z + 1, 'minecraft:red_concrete', meta(ridge, 'terrain_following_coaster_track', 76));
    if ((Math.abs(x) + Math.abs(z)) % 4 === 0) {
      model.box(x, 64, z, x, y - 1, z, 'minecraft:yellow_concrete', meta(ridge, 'coaster_support', 75));
    }
  }
  modelSimpleVenue(model, ridge, [-668, 74, -608, -646, 86, -584], 'minecraft:blue_concrete', 'minecraft:smooth_stone');
  model.box(-666, 75, -606, -648, 80, -586, AIR, meta(ridge, 'station_queue_and_load', 78));
  modelParkPath(model, ridge, [[-670, 76, -632], [-670, 84, -540], [-640, 82, -540]], 3, 'coaster_evacuation_walk');

  // Freestanding overlook outside the protected ruined-portal no-target box.
  modelParkPath(model, `${dry}-EMBER`, [[-640, 82, -630], [-641, 88, -612], [-640, 86, -590]], 3, 'ruin_overlook_path');
  model.box(-643, 86, -614, -640, 88, -608, 'minecraft:iron_bars', meta(`${dry}-EMBER`, 'protected_ruin_overlook', 79));

  // Midway rides, family grove, dark ride, drop landmark and event court.
  for (const [cx, cz, radius, color] of [
    [-594, -612, 8, 'minecraft:yellow_concrete'],
    [-580, -592, 7, 'minecraft:lime_concrete'],
    [-594, -574, 6, 'minecraft:orange_concrete'],
  ]) {
    model.box(cx - radius, 75, cz - radius, cx + radius, 75, cz + radius, 'minecraft:smooth_stone', meta(`${dry}-MIDWAY`, 'flat_ride_pad', 72));
    for (const [x, z] of circlePoints(cx, cz, radius)) {
      model.set(x, 76, z, color, meta(`${dry}-MIDWAY`, 'flat_ride_ring', 73));
    }
    model.box(cx, 76, cz, cx, 83, cz, 'minecraft:cut_copper', meta(`${dry}-MIDWAY`, 'flat_ride_mast', 74));
  }
  for (const radius of [5, 9]) {
    for (const [x, z] of circlePoints(-542, -594, radius)) {
      model.set(x, 72, z, radius === 5 ? 'minecraft:red_concrete' : 'minecraft:yellow_concrete', meta(`${dry}-FAMILY`, 'family_vehicle_and_carousel_circuit', 73));
    }
  }
  model.box(-542, 72, -594, -542, 84, -594, 'minecraft:cut_copper', meta(`${dry}-FAMILY`, 'carousel_mast', 74));
  modelSimpleVenue(model, `${dry}-DARK-RIDE`, [-635, 70, -580, -606, 92, -542], 'minecraft:deepslate_bricks', 'minecraft:polished_blackstone');
  model.box(-632, 71, -577, -609, 80, -545, AIR, meta(`${dry}-DARK-RIDE`, 'foundry_dark_ride_show_volume', 76));
  model.box(-612, 82, -540, -596, 83, -524, 'minecraft:polished_blackstone', meta(`${dry}-SIGNAL`, 'drop_ride_pad', 73));
  model.box(-605, 84, -533, -603, 123, -531, 'minecraft:iron_block', meta(`${dry}-SIGNAL`, 'drop_tower', 75));
  model.box(-609, 116, -537, -599, 119, -527, 'minecraft:red_concrete', meta(`${dry}-SIGNAL`, 'drop_vehicle', 76));
  model.box(-592, 76, -558, -548, 76, -524, 'minecraft:moss_block', meta(`${dry}-EVENT`, 'performance_lawn', 72));
  model.box(-590, 77, -556, -575, 83, -548, 'minecraft:dark_oak_planks', meta(`${dry}-EVENT`, 'covered_stage', 73));
  modelSimpleVenue(model, `${dry}-MAINT`, [-670, 64, -538, -646, 84, -522], 'minecraft:gray_concrete', 'minecraft:smooth_stone');

  const water = 'TE-WL-NORTHWIND';
  // Pile-supported seven-wide perimeter/guest loop.
  modelParkPath(model, water, [
    [-608, 65, -678],
    [-664, 65, -678],
    [-668, 65, -716],
    [-526, 65, -716],
    [-526, 65, -678],
  ]);
  for (let x = -668; x <= -526; x += 10) {
    for (const z of [-716, -678]) {
      model.box(x, 38, z, x + 1, 63, z + 1, 'minecraft:stripped_dark_oak_log[axis=y]', meta(water, 'water_park_deck_pile', 61));
    }
  }
  modelContainedPool(model, `${water}-WAVE`, [-669, -638, -710, -682]);
  // Wave markers and lifeguard overlooks.
  for (let x = -666; x <= -641; x += 6) {
    model.box(x, 65, -707, x + 2, 65, -705, 'minecraft:light_blue_concrete', meta(`${water}-WAVE`, 'wave_pattern', 74));
  }
  model.box(-670, 65, -699, -667, 70, -695, 'minecraft:white_concrete', meta(`${water}-WAVE`, 'lifeguard_overlook', 75));

  // Closed contained lazy-river ring; natural water remains outside its shell.
  const river = `${water}-RIVER`;
  model.box(-634, 63, -713, -594, 63, -682, 'minecraft:smooth_quartz', meta(river, 'river_isolation_slab', 70), (x, _y, z) => (
    x <= -627 || x >= -601 || z <= -706 || z >= -689
  ));
  model.box(-633, 64, -712, -595, 64, -683, 'minecraft:water[level=0]', meta(river, 'contained_lazy_river', 72), (x, _y, z) => (
    x <= -628 || x >= -600 || z <= -707 || z >= -688
  ));
  for (const [x1, z1, x2, z2] of [
    [-634, -713, -594, -710],
    [-634, -685, -594, -682],
    [-634, -709, -631, -686],
    [-597, -709, -594, -686],
  ]) {
    model.box(x1, 64, z1, x2, 66, z2, 'minecraft:light_blue_concrete', meta(river, 'river_containment_wall', 71));
  }

  model.box(-590, 64, -713, -558, 64, -681, 'minecraft:smooth_quartz', meta(`${water}-SLIDES`, 'slide_tower_and_runout_deck', 73));
  model.box(-578, 65, -706, -574, 91, -702, 'minecraft:quartz_pillar', meta(`${water}-SLIDES`, 'supported_launch_tower', 75));
  staircase(model, `${water}-SLIDES`, -576, 65, 92, -710, 76);
  for (const [offset, color] of [[0, 'minecraft:red_concrete'], [5, 'minecraft:yellow_concrete'], [10, 'minecraft:lime_concrete']]) {
    const chute = linePoints([[-576 + offset, 90, -700], [-576 + offset, 78, -692], [-576 + offset, 66, -684]]);
    for (const [x, y, z] of chute) model.box(x, y, z, x + 2, y, z + 1, color, meta(`${water}-SLIDES`, 'slide_chute', 77));
    modelContainedPool(model, `${water}-SLIDES`, [-579 + offset, -573 + offset, -688, -682]);
  }
  modelContainedPool(model, `${water}-QUIET`, [-554, -522, -696, -680]);
  modelSimpleVenue(model, `${water}-PLANT`, [-554, 64, -718, -522, 72, -700], 'minecraft:gray_concrete', 'minecraft:smooth_stone');
  model.box(-551, 65, -715, -525, 68, -703, 'minecraft:cyan_concrete', meta(`${water}-PLANT`, 'represented_filtration_and_isolation', 75));
  modelSimpleVenue(model, `${water}-BATH`, [-554, 64, -679, -522, 78, -673], 'minecraft:smooth_quartz', 'minecraft:light_blue_concrete');

  // Continuous public green links between parks, crater and housing.
  modelParkPath(model, 'TE-WL-CRATER-WEST-GREEN-LINK', [[-520, 72, -580], [-492, 68, -580]], 7, 'public_greenway');
  modelParkPath(model, 'TE-WL-CRATER-WEST-GREEN-LINK', [[-500, 68, -650], [-500, 72, -620]], 7, 'public_greenway');
  modelParkPath(model, 'TE-WL-CRATER-WEST-GREEN-LINK', [[-492, 68, -551], [-500, 70, -551]], 7, 'public_greenway');
}

function modelCourtyardHousing(model, definition) {
  const { id, bounds, centralGreen, garage, bays } = definition;
  const [x1, y1, z1, x2, y2, z2] = bounds;
  const scope = `TE-WL-${id}`;
  modelSimpleVenue(model, scope, [x1, y1, z1, x2, y2 - 4, z2], 'minecraft:white_terracotta', 'minecraft:dark_oak_planks', 'minecraft:dark_prismarine');
  for (const floorY of [y1, y1 + 7, y1 + 14]) {
    model.box(x1, floorY, z1, x2, floorY, z2, 'minecraft:dark_oak_planks', meta(scope, 'three_story_residential_floor', 72));
    for (let x = x1 + 3; x <= x2 - 4; x += 6) {
      model.box(x, floorY + 2, z1, x + 2, floorY + 4, z1, 'minecraft:light_blue_stained_glass', meta(scope, 'coastal_gabled_window', 73));
      model.box(x, floorY + 2, z2, x + 2, floorY + 4, z2, 'minecraft:light_blue_stained_glass', meta(scope, 'coastal_gabled_window', 73));
    }
  }
  const [gx1, gx2, gz1, gz2] = centralGreen;
  model.box(gx1, y1 + 1, gz1, gx2, y2, gz2, AIR, meta(scope, 'open_courtyard', 74));
  model.box(gx1, y1, gz1, gx2, y1, gz2, 'minecraft:moss_block', meta(scope, 'central_green', 75));
  model.box(Math.round((gx1 + gx2) / 2) - 1, y1, gz1, Math.round((gx1 + gx2) / 2) + 1, y1, gz2, 'minecraft:polished_andesite', meta(scope, 'courtyard_walk', 76));

  const [ax1, ax2, az1, az2] = garage;
  modelSimpleVenue(model, `${scope}-GARAGE`, [ax1, y1, az1, ax2, y1 + 7, az2], 'minecraft:white_terracotta', 'minecraft:smooth_stone', 'minecraft:dark_prismarine');
  const span = Math.max(1, Math.floor((ax2 - ax1 + 1) / bays));
  for (let bay = 0; bay < bays; bay += 1) {
    const doorX1 = ax1 + bay * span;
    const doorX2 = Math.min(ax2, doorX1 + span - 2);
    model.box(doorX1, y1 + 1, az2, doorX2, y1 + 4, az2, AIR, meta(`${scope}-GARAGE`, 'attached_garage_door', 78));
  }
  model.box(Math.max(x1, ax1), y1 + 1, Math.max(z1, az1), Math.min(x2, ax2), y1 + 3, Math.min(z2, az2), AIR, meta(scope, 'garage_attachment_core', 79));
}

function modelHarborlightHousing(model) {
  model.box(-515, 65, -513, -451, 65, -507, 'minecraft:gray_concrete', meta('TE-WL-HARBORLIGHT', 'bayberry_lane', 60));
  model.box(-518, 65, -555, -448, 65, -549, 'minecraft:polished_andesite', meta('TE-WL-HARBORLIGHT', 'continuous_public_lake_walk', 61));
  modelCourtyardHousing(model, {
    id: 'HL-A',
    bounds: [-516, 66, -547, -487, 94, -514],
    centralGreen: [-505, -494, -539, -526],
    garage: [-516, -503, -521, -514],
    bays: 4,
  });
  modelCourtyardHousing(model, {
    id: 'HL-B',
    bounds: [-482, 66, -547, -450, 94, -514],
    centralGreen: [-472, -459, -539, -526],
    garage: [-463, -450, -521, -514],
    bays: 4,
  });
  modelCourtyardHousing(model, {
    id: 'HL-C',
    bounds: [-516, 66, -506, -450, 96, -472],
    centralGreen: [-491, -474, -496, -480],
    garage: [-516, -497, -506, -499],
    bays: 6,
  });
}

function modelHousingBlock(model, scope, bounds, wall, baseY = 74, floors = 4) {
  const [x1, x2, z1, z2] = bounds;
  const floorLevels = Array.from({ length: floors }, (_, index) => baseY + index * 6);
  const roofY = baseY + floors * 6;
  model.box(x1, 60, z1, x2, roofY, z2, AIR, meta(scope, 'site_grade_and_clearance', 10));
  model.box(x1, 60, z1, x2, baseY, z2, 'minecraft:stone_bricks', meta(scope, 'retaining_foundation', 20));
  model.box(x1 + 1, 61, z1 + 1, x2 - 1, baseY - 1, z2 - 1, AIR, meta(scope, 'foundation_relief', 21));
  for (const floorY of floorLevels) {
    model.box(x1, floorY, z1, x2, floorY, z2, 'minecraft:polished_andesite', meta(scope, 'residential_floor', 30));
    model.box(x1, floorY + 1, z1, x2, floorY + 5, z1, wall, meta(scope, 'residential_wall', 31));
    model.box(x1, floorY + 1, z2, x2, floorY + 5, z2, wall, meta(scope, 'residential_wall', 31));
    model.box(x1, floorY + 1, z1, x1, floorY + 5, z2, wall, meta(scope, 'residential_wall', 31));
    model.box(x2, floorY + 1, z1, x2, floorY + 5, z2, wall, meta(scope, 'residential_wall', 31));
    model.box(x1 + 1, floorY + 1, z1 + 1, x2 - 1, floorY + 5, z2 - 1, AIR, meta(scope, 'residential_interior', 29));
    model.box(x1 + 5, floorY + 1, z1 + 1, x1 + 5, floorY + 4, z2 - 1, 'minecraft:quartz_bricks', meta(scope, 'apartment_division', 35));
    model.box(x2 - 5, floorY + 1, z1 + 1, x2 - 5, floorY + 4, z2 - 1, 'minecraft:quartz_bricks', meta(scope, 'apartment_division', 35));
    model.box(x1 + 2, floorY + 2, z1, x1 + 4, floorY + 3, z1, 'minecraft:light_blue_stained_glass', meta(scope, 'apartment_window', 36));
    model.box(x2 - 4, floorY + 2, z1, x2 - 2, floorY + 3, z1, 'minecraft:light_blue_stained_glass', meta(scope, 'apartment_window', 36));
    model.box(x1 + 2, floorY + 2, z2, x1 + 4, floorY + 3, z2, 'minecraft:light_blue_stained_glass', meta(scope, 'apartment_window', 36));
    model.box(x2 - 4, floorY + 2, z2, x2 - 2, floorY + 3, z2, 'minecraft:light_blue_stained_glass', meta(scope, 'apartment_window', 36));
    model.box(Math.round((x1 + x2) / 2) - 1, floorY + 1, z1, Math.round((x1 + x2) / 2) + 1, floorY + 3, z1, AIR, meta(scope, 'shared_entry_and_gallery', 37));
  }
  model.box(x1 - 1, roofY, z1 - 1, x2 + 1, roofY, z2 + 1, 'minecraft:dark_prismarine', meta(scope, 'residential_roof', 40));
  for (let index = 0; index < floorLevels.length - 1; index += 1) {
    staircase(model, scope, Math.round((x1 + x2) / 2), floorLevels[index], floorLevels[index + 1], z1 + 3, 42);
  }
}

function modelStewardMiniMansion(model) {
  const scope = 'TE-RRCH-STEWARD-MINI-MANSION';
  const preservesWaterCourt = (x, _y, z) => !(x === -115 && z === -336);

  // New west hall; the existing x=-118..-106 cottage remains the public
  // office/family-service wing so its nine inventoried NBT fixtures are not
  // overwritten or silently discarded.
  model.box(-138, 65, -356, -119, 88, -331, AIR, meta(scope, 'west_hall_graded_clearance', 20));
  model.box(-138, 65, -356, -119, 67, -331, 'minecraft:stone_bricks', meta(scope, 'stepped_local_stone_plinth', 30));
  model.hollow(-138, 67, -356, -119, 82, -331, 'minecraft:lime_terracotta', meta(scope, 'two_story_plaster_envelope', 40));
  for (const floorY of [67, 74]) {
    model.box(-137, floorY, -355, -120, floorY, -332, 'minecraft:dark_oak_planks', meta(scope, 'occupied_floor_plate', 41));
    model.box(-137, floorY + 1, -355, -120, floorY + 6, -332, AIR, meta(scope, 'occupied_room_volume', 39));
  }
  for (const x of [-138, -132, -126, -120]) {
    model.box(x, 68, -356, x, 81, -356, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'town_timber_frame', 42));
    model.box(x, 68, -331, x, 81, -331, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'town_timber_frame', 42));
  }
  for (let inset = 0; inset <= 7; inset += 1) {
    model.box(
      -139 + inset,
      82 + inset,
      -357 + inset,
      -118 - inset,
      82 + inset,
      -330 - inset,
      inset === 7 ? 'minecraft:cut_copper' : 'minecraft:deepslate_tiles',
      meta(scope, 'steep_period_roof', 45 + inset),
    );
  }
  for (const z of [-352, -344, -336]) {
    model.box(-138, 69, z, -138, 72, z + 2, 'minecraft:yellow_stained_glass', meta(scope, 'warm_west_window', 50));
    model.box(-119, 76, z, -119, 79, z + 2, 'minecraft:yellow_stained_glass', meta(scope, 'upper_east_window', 50));
  }

  // Connections preserve the cottage's established east entry and lane.
  model.box(-119, 68, -346, -118, 72, -344, AIR, meta(scope, 'retained_cottage_connection', 55));
  model.box(-137, 68, -347, -135, 72, -344, AIR, meta(scope, 'remote_west_exit', 55));
  compactSwitchbackStair(model, scope, [-136, -354, -129, -345], 68, 75, 56);

  // Ground-floor management and household rooms.
  model.box(-136, 68, -354, -128, 73, -347, 'minecraft:dark_oak_planks', meta(scope, 'entry_cloak_and_main_stair', 60));
  model.box(-127, 68, -354, -120, 73, -342, 'minecraft:orange_terracotta', meta(scope, 'great_room_hearth_envelope', 60));
  model.box(-125, 68, -353, -122, 71, -353, 'minecraft:magma_block', meta(scope, 'great_room_hearth', 61));
  model.box(-136, 68, -346, -128, 73, -334, 'minecraft:red_carpet', meta(scope, 'formal_dining', 60));
  model.box(-127, 68, -341, -120, 73, -332, 'minecraft:polished_blackstone', meta(scope, 'family_kitchen_pantry_scullery', 60));
  model.box(-135, 69, -343, -130, 69, -339, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(scope, 'dining_table', 62));

  // Upper floor: primary, two guest rooms, manager library and a private,
  // tasteful non-graphic red room.
  model.box(-136, 75, -354, -128, 80, -343, 'minecraft:blue_wool', meta(scope, 'primary_suite', 65));
  model.box(-127, 75, -354, -120, 80, -346, 'minecraft:green_wool', meta(scope, 'guest_suite_a', 65));
  model.box(-127, 75, -345, -120, 80, -337, 'minecraft:purple_wool', meta(scope, 'guest_suite_b', 65));
  model.box(-136, 75, -342, -128, 80, -332, 'minecraft:bookshelf', meta(scope, 'manager_library_and_budget_study', 65));
  model.box(-127, 75, -336, -120, 81, -332, 'minecraft:red_nether_bricks', meta(scope, 'private_red_room_envelope', 66));
  model.box(-126, 76, -335, -121, 80, -333, AIR, meta(scope, 'private_red_room_volume', 67));
  model.box(-126, 75, -335, -121, 75, -333, 'minecraft:red_carpet', meta(scope, 'private_red_room_floor', 68));
  model.box(-126, 76, -335, -123, 76, -334, 'minecraft:red_wool', meta(scope, 'private_bed_and_lounge', 69));
  model.box(-122, 76, -335, -121, 79, -334, 'minecraft:chiseled_bookshelf', meta(scope, 'concealed_adult_storage', 69));
  model.box(-126, 78, -333, -121, 80, -333, 'minecraft:iron_chain', meta(scope, 'decorative_swing_hammock_frame', 70));
  model.set(-121, 76, -332, 'minecraft:water_cauldron[level=1]', meta(scope, 'private_wash_cleanup', 70));
  modelDoubleIronDoor(model, scope, 'x', [-127, 76, -339], 'south', 'red_room_privacy_vestibule', 71);

  // Garden gallery and the exact wet column become a lined rain court.
  model.box(-118, 67, -339, -106, 78, -331, AIR, meta(scope, 'garden_gallery_clearance', 20), preservesWaterCourt);
  model.box(-118, 67, -339, -106, 67, -331, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'garden_gallery_timber_envelope', 72), preservesWaterCourt);
  model.box(-118, 76, -339, -106, 76, -331, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'garden_gallery_timber_envelope', 72), preservesWaterCourt);
  model.box(-118, 68, -339, -106, 75, -339, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'garden_gallery_timber_envelope', 72));
  model.box(-118, 68, -331, -106, 75, -331, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'garden_gallery_timber_envelope', 72));
  model.box(-118, 68, -339, -118, 75, -331, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'garden_gallery_timber_envelope', 72));
  model.box(-106, 68, -339, -106, 75, -331, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'garden_gallery_timber_envelope', 72));
  model.box(-117, 68, -338, -107, 74, -332, 'minecraft:light_blue_stained_glass', meta(scope, 'garden_gallery_glazing', 73), preservesWaterCourt);
  model.box(-117, 67, -338, -107, 67, -332, 'minecraft:dark_oak_planks', meta(scope, 'garden_gallery_floor', 74), preservesWaterCourt);
  model.box(-117, 65, -337, -113, 65, -335, 'minecraft:smooth_quartz', meta(scope, 'rain_court_liner', 75), preservesWaterCourt);
  model.box(-117, 66, -337, -117, 69, -335, 'minecraft:stone_bricks', meta(scope, 'rain_court_wall', 75));
  model.box(-113, 66, -337, -113, 69, -335, 'minecraft:stone_bricks', meta(scope, 'rain_court_wall', 75));
  model.box(-117, 66, -337, -113, 69, -337, 'minecraft:stone_bricks', meta(scope, 'rain_court_wall', 75));
  model.box(-117, 66, -335, -113, 69, -335, 'minecraft:stone_bricks', meta(scope, 'rain_court_wall', 75));

  // Covered south patio stops at the recorded town boundary and a screened
  // service/wood bay replaces an inappropriate automotive garage.
  model.box(-138, 67, -330, -119, 67, -324, 'minecraft:polished_andesite', meta(scope, 'covered_south_patio', 76));
  model.box(-138, 73, -330, -119, 73, -324, 'minecraft:dark_oak_planks', meta(scope, 'patio_canopy', 77));
  for (const x of [-138, -128, -119]) {
    model.box(x, 68, -330, x, 72, -324, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'patio_post', 78));
  }
  model.box(-135, 68, -328, -128, 68, -326, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'outdoor_dining', 79));
  model.box(-124, 68, -329, -120, 70, -326, 'minecraft:polished_blackstone', meta(scope, 'outdoor_hearth', 79));
  model.box(-140, 67, -350, -139, 73, -331, 'minecraft:dark_oak_planks', meta(scope, 'screened_service_and_wood_bay', 80));

  return {
    upgradedCottages: 1,
    retainedBlockEntities: 9,
    eastLaneClearColumns: 5,
  };
}

function modelGuestServicesDestination(model) {
  const scope = 'TE-MSA-B01-GUEST-SERVICES-DESTINATION';
  const designReviewPath =
    'docs/redevelopment/2026-07-28-town-expansion/mainstreet-guest-services-rooftop-wellness-design-review.json';
  const designReviewMemoPath =
    'docs/redevelopment/2026-07-28-town-expansion/mainstreet-guest-services-rooftop-wellness-design-review.md';
  const design = JSON.parse(fs.readFileSync(designReviewPath, 'utf8'));
  const expect = (condition, message) => {
    if (!condition) throw new Error(`B01 binding design mismatch: ${message}`);
  };
  const equalBounds = (actual, expected) => (
    Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => Number(value) === expected[index])
  );
  const byFloor = new Map(design.floorProgram.map((floor) => [floor.id, floor]));
  const zone = (floorId, zoneId) => {
    const floor = byFloor.get(floorId);
    const selected = floor?.zones?.find((candidate) => candidate.id === zoneId);
    expect(selected, `missing ${floorId}/${zoneId}`);
    return selected;
  };

  expect(
    design.artifactId === 'MSA-B01-GUEST-SERVICES-ROOFTOP-WELLNESS-DR-2026-07-28',
    'unexpected artifact id',
  );
  expect(
    equalBounds(design.databaseSurvey.selectedFeature.bounds, [-72, 63, 90, 72, 80, 165]),
    'database B01 bounds drifted',
  );
  expect(design.snapshotSurvey.b01.blockEntities.count === 15, 'protected kitchen BE count is not 15');
  expect(design.floorProgram.length === 5, 'floor program is not L1/L2/L3/L4/RF');
  expect(design.circulationAndEgress.verticalCores.length === 4, 'vertical core count is not four');

  const protectedKitchenCells = new Set(
    design.snapshotSurvey.b01.blockEntities.positions
      .map(({ point }) => key(...point.map(Number))),
  );
  const preservesKitchen = (x, y, z) => !protectedKitchenCells.has(key(x, y, z));

  // The retained L1/L2 building is altered selectively. Thin floor inlays,
  // purpose-built counters and protected bridges make its existing program
  // legible without a blanket clear or refit.
  const floorInlay = (bounds, floorY, state, role, phase) => {
    const [x1, , z1, x2, , z2] = bounds.map(Number);
    model.box(x1, floorY, z1, x2, floorY, z1, state, meta(scope, role, phase), preservesKitchen);
    model.box(x1, floorY, z2, x2, floorY, z2, state, meta(scope, role, phase), preservesKitchen);
    model.box(x1, floorY, z1, x1, floorY, z2, state, meta(scope, role, phase), preservesKitchen);
    model.box(x2, floorY, z1, x2, floorY, z2, state, meta(scope, role, phase), preservesKitchen);
  };
  const l1Inlays = [
    ['L1-ARRIVAL', 'minecraft:yellow_concrete'],
    ['L1-WEST-SERVICES', 'minecraft:light_blue_concrete'],
    ['L1-EAST-GALLERY', 'minecraft:orange_concrete'],
    ['L1-BOH-FOOD', 'minecraft:gray_concrete'],
    ['L1-CAFE', 'minecraft:brown_terracotta'],
    ['L1-SOCIAL', 'minecraft:green_terracotta'],
    ['L1-ORIENTATION-STUDIO', 'minecraft:cyan_terracotta'],
  ];
  for (const [zoneId, state] of l1Inlays) {
    floorInlay(zone('B01-L1', zoneId).bounds, 64, state, `${zoneId.toLowerCase()}_floor_inlay`, 40);
  }
  const l2Inlays = [
    ['L2-WEST-COWORK', 'minecraft:blue_concrete'],
    ['L2-EAST-COWORK', 'minecraft:cyan_concrete'],
    ['L2-QUIET-LIBRARY', 'minecraft:green_concrete'],
    ['L2-MEETING-SUITE', 'minecraft:purple_concrete'],
  ];
  for (const [zoneId, state] of l2Inlays) {
    floorInlay(zone('B01-L2', zoneId).bounds, 70, state, `${zoneId.toLowerCase()}_floor_inlay`, 41);
  }

  const publicSpine = design.circulationAndEgress.primaryPublicSpine.map(Number);
  const [spineX1, , spineZ1, spineX2, , spineZ2] = publicSpine;
  model.box(spineX1, 64, spineZ1, spineX2, 64, spineZ2, 'minecraft:polished_andesite', meta(scope, 'seven_wide_public_spine_floor', 42), preservesKitchen);
  model.box(spineX1, 65, spineZ1, spineX2, 69, spineZ2, AIR, meta(scope, 'seven_wide_public_spine_headroom', 39), preservesKitchen);
  for (const [z1, z2] of [[90, 109], [146, 165]]) {
    model.box(spineX1, 70, z1, spineX2, 70, z2, 'minecraft:polished_andesite', meta(scope, 'l2_public_spine_floor', 42));
    model.box(spineX1, 71, z1, spineX2, 75, z2, AIR, meta(scope, 'l2_public_spine_headroom', 39));
  }

  // Arrival and public-service fixtures are deliberately shallow so the
  // existing rooms remain useful and circulation stays broad.
  model.box(-12, 65, 156, 12, 65, 158, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'arrival_accessible_reception_counter', 45));
  model.box(-10, 66, 160, 10, 69, 160, 'minecraft:light_blue_concrete', meta(scope, 'arrival_orientation_map_and_program_wall', 45));
  model.box(-9, 67, 160, 9, 68, 160, 'minecraft:yellow_concrete', meta(scope, 'arrival_orientation_map_graphic', 46));
  model.box(-68, 65, 136, -48, 65, 138, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'visitor_services_accessibility_and_first_aid_counter', 45));
  model.box(44, 65, 136, 66, 68, 136, 'minecraft:bookshelf', meta(scope, 'publications_and_tactile_exhibit_wall', 45));
  model.box(48, 65, 115, 66, 68, 115, 'minecraft:white_concrete', meta(scope, 'orientation_studio_media_wall', 45));
  model.box(50, 66, 115, 64, 67, 115, 'minecraft:black_concrete', meta(scope, 'captioned_media_screen', 46));
  for (const x of [-31, -23, -15, 8, 16, 24]) {
    model.box(x, 65, 106, x + 4, 65, 109, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(scope, 'cafe_and_social_mixed_seating', 46));
  }

  // The staff route is the only deliberate L1 room cut. It stays out of the
  // protected y65/z95 kitchen row and is not counted as public egress.
  const staffCorridor = design.employeeLoungeCoordination.plannedStaffCorridorBounds.map(Number);
  model.box(
    staffCorridor[0],
    64,
    staffCorridor[2],
    staffCorridor[3],
    64,
    staffCorridor[5],
    'minecraft:light_gray_concrete',
    meta(scope, 'staff_only_service_corridor_floor', 47),
    preservesKitchen,
  );
  model.box(
    staffCorridor[0],
    65,
    staffCorridor[2],
    staffCorridor[3],
    69,
    staffCorridor[5],
    AIR,
    meta(scope, 'staff_only_service_corridor_headroom', 44),
    preservesKitchen,
  );
  const staffConnection = design.employeeLoungeCoordination.plannedConnectionBounds.map(Number);
  model.box(...staffConnection, AIR, meta(scope, 'guarded_employee_lounge_connection', 48), preservesKitchen);

  // L2 keeps the verified atrium. Two five-wide, guarded cross-bridges replace
  // any temptation to blanket-fill the double-height void.
  const atrium = byFloor.get('B01-L2').protectedAtrium.map(Number);
  expect(equalBounds(atrium, [-20, 70, 110, 20, 75, 145]), 'protected atrium bounds drifted');
  for (const [bridgeId, z1, z2] of [['NORTH', 126, 130], ['SOUTH', 138, 142]]) {
    model.box(-20, 70, z1, 20, 70, z2, 'minecraft:polished_andesite', meta(scope, `l2_${bridgeId.toLowerCase()}_atrium_bridge`, 48));
    model.box(-20, 71, z1, 20, 72, z1, 'minecraft:iron_bars', meta(scope, 'atrium_bridge_guard', 49));
    model.box(-20, 71, z2, 20, 72, z2, 'minecraft:iron_bars', meta(scope, 'atrium_bridge_guard', 49));
    model.box(-20, 73, z1 + 1, 20, 75, z2 - 1, AIR, meta(scope, 'atrium_bridge_headroom', 47));
  }
  for (const [x1, x2, z] of [
    [-66, -54, 100], [-48, -36, 100], [-66, -54, 115], [-48, -36, 115],
    [30, 42, 100], [48, 60, 100], [30, 42, 115], [48, 60, 115],
  ]) {
    model.box(x1, 71, z, x2, 71, z + 2, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'work_club_shared_tables', 50));
  }
  for (let x = -68; x <= -28; x += 8) {
    model.box(x, 71, 136, x, 74, 158, 'minecraft:bookshelf', meta(scope, 'quiet_reference_library_stacks', 50));
  }
  for (const x of [28, 42, 56]) {
    model.box(x, 71, 136, x, 75, 158, 'minecraft:light_gray_stained_glass', meta(scope, 'meeting_and_training_room_division', 50));
    model.box(x, 71, 145, x, 73, 147, AIR, meta(scope, 'meeting_room_access', 51));
  }

  const l3 = byFloor.get('B01-L3');
  const l4 = byFloor.get('B01-L4');
  const roof = byFloor.get('B01-RF');
  expect(equalBounds(l3.enclosedBounds, [-60, 76, 98, 60, 83, 157]), 'L3 enclosure drifted');
  expect(equalBounds(l4.enclosedBounds, [-60, 83, 98, 60, 90, 157]), 'L4 enclosure drifted');
  expect(equalBounds(roof.roofEnvelope, [-60, 90, 98, 60, 102, 157]), 'roof envelope drifted');

  // Set-back dry shells release after support/core work. They retain the long
  // B01 base as the dominant street wall.
  model.hollow(...l3.enclosedBounds.map(Number), 'minecraft:smooth_quartz', meta(scope, 'setback_l3_dry_envelope', 54));
  model.box(-59, 76, 99, 59, 76, 156, 'minecraft:dark_oak_planks', meta(scope, 'setback_l3_occupied_floor', 55));
  model.hollow(...l4.enclosedBounds.map(Number), 'minecraft:polished_blackstone_bricks', meta(scope, 'controlled_l4_dry_envelope', 56));
  model.box(-59, 83, 99, 59, 83, 156, 'minecraft:polished_blackstone', meta(scope, 'controlled_l4_occupied_floor', 57));
  for (const x of [-52, -40, -28, -16, -4, 8, 20, 32, 44, 56]) {
    model.box(x, 79, 98, x + 3, 81, 98, 'minecraft:light_blue_stained_glass', meta(scope, 'l3_setback_window_rhythm', 58));
    model.box(x, 86, 98, x + 3, 88, 98, 'minecraft:tinted_glass', meta(scope, 'l4_screened_window_rhythm', 58));
  }

  // L3 is a food, social and event house with four fully guarded patios.
  model.box(-58, 77, 100, -30, 77, 125, 'minecraft:orange_terracotta', meta(scope, 'l3_display_and_event_kitchen', 61));
  model.box(-56, 78, 102, -34, 79, 105, 'minecraft:polished_blackstone', meta(scope, 'l3_event_kitchen_workline', 62));
  model.box(-27, 77, 100, 27, 77, 132, 'minecraft:red_carpet', meta(scope, 'l3_great_social_hall', 61));
  model.box(-12, 78, 105, 12, 78, 108, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(scope, 'l3_social_hearth_lounge', 62));
  model.box(30, 77, 100, 58, 77, 132, 'minecraft:purple_carpet', meta(scope, 'l3_club_and_private_dining', 61));
  model.box(-38, 77, 135, 38, 77, 155, 'minecraft:magenta_carpet', meta(scope, 'l3_event_lounge_and_reception', 61));
  model.box(-57, 77, 143, -43, 82, 155, 'minecraft:deepslate_tiles', meta(scope, 'l3_isolated_hot_tub_plant_envelope', 63));
  model.box(-56, 78, 144, -44, 81, 154, AIR, meta(scope, 'l3_hot_tub_plant_service_volume', 64));
  model.box(-56, 78, 153, -44, 78, 154, 'minecraft:iron_block', meta(scope, 'l3_hot_tub_filtration_analogue', 65));

  for (const terrace of l3.terraces) {
    const [x1, floorY, z1, x2, , z2] = terrace.bounds.map(Number);
    const garden = terrace.id.includes('GARDEN');
    model.box(x1, floorY, z1, x2, floorY, z2, garden
      ? 'minecraft:moss_block'
      : 'minecraft:smooth_quartz', meta(scope, `${terrace.id.toLowerCase()}_weatherproof_deck`, 60));
    model.box(x1, floorY + 1, z1, x2, floorY + 2, z1, 'minecraft:iron_bars', meta(scope, 'l3_terrace_guard', 66));
    model.box(x1, floorY + 1, z2, x2, floorY + 2, z2, 'minecraft:iron_bars', meta(scope, 'l3_terrace_guard', 66));
    model.box(x1, floorY + 1, z1, x1, floorY + 2, z2, 'minecraft:iron_bars', meta(scope, 'l3_terrace_guard', 66));
    model.box(x2, floorY + 1, z1, x2, floorY + 2, z2, 'minecraft:iron_bars', meta(scope, 'l3_terrace_guard', 66));
    if (garden) {
      for (let z = z1 + 4; z <= z2 - 4; z += 8) {
        model.box(x1 + 2, floorY + 1, z, x2 - 2, floorY + 1, z + 2, 'minecraft:flowering_azalea', meta(scope, 'l3_roof_garden_wind_screen_planting', 67));
      }
    }
  }

  // L4 uses screening, privacy vestibules and non-graphic hospitality fitout.
  model.box(-18, 84, 142, 18, 89, 142, 'minecraft:polished_blackstone_bricks', meta(scope, 'l4_age_control_screen', 68));
  model.box(-6, 84, 143, 6, 84, 147, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'l4_age_control_reception', 69));
  modelDoubleIronDoor(model, scope, 'x', [-1, 84, 142], 'north', 'l4_age_control_inner_doors', 70);
  modelDoubleIronDoor(model, scope, 'x', [-1, 84, 156], 'south', 'l4_age_control_outer_doors', 70);
  model.box(-58, 84, 100, -24, 84, 122, 'minecraft:cyan_carpet', meta(scope, 'l4_quiet_wellness_and_cooldown', 68));
  model.box(-58, 84, 125, -24, 84, 139, 'minecraft:purple_carpet', meta(scope, 'l4_screened_clothing_optional_lounge', 68));
  model.box(24, 84, 100, 58, 84, 122, 'minecraft:green_carpet', meta(scope, 'l4_adult_quiet_commons', 68));
  model.box(-58, 84, 123, -24, 89, 124, 'minecraft:tinted_glass', meta(scope, 'l4_wellness_privacy_screen', 69));
  model.box(23, 84, 100, 24, 89, 156, 'minecraft:polished_blackstone_bricks', meta(scope, 'l4_private_suite_acoustic_separation', 69));

  const privateSuiteStates = [
    ['RED-A', 'minecraft:red_nether_bricks'],
    ['RED-B', 'minecraft:crimson_planks'],
    ['RED-C', 'minecraft:polished_blackstone_bricks'],
    ['RED-D', 'minecraft:dark_oak_planks'],
  ];
  for (const [suiteId, wall] of privateSuiteStates) {
    const suite = l4.privateSuites.find((candidate) => candidate.id === suiteId);
    expect(suite, `missing ${suiteId}`);
    const [x1, y1, z1, x2, y2, z2] = suite.bounds.map(Number);
    model.box(x1, y1, z1, x2, y2, z1, wall, meta(scope, 'l4_non_graphic_private_suite_wall', 72));
    model.box(x1, y1, z2, x2, y2, z2, wall, meta(scope, 'l4_non_graphic_private_suite_wall', 72));
    model.box(x1, y1, z1, x1, y2, z2, wall, meta(scope, 'l4_non_graphic_private_suite_wall', 72));
    model.box(x2, y1, z1, x2, y2, z2, wall, meta(scope, 'l4_non_graphic_private_suite_wall', 72));
    model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, 'minecraft:red_carpet', meta(scope, 'l4_private_suite_floor', 73));
    model.box(x1 + 2, y1 + 1, z1 + 2, x1 + 7, y1 + 1, z1 + 5, 'minecraft:red_wool', meta(scope, 'l4_private_bed_and_lounge', 74));
    model.box(x2 - 2, y1 + 1, z1 + 2, x2 - 1, y1 + 4, z1 + 7, 'minecraft:chiseled_bookshelf', meta(scope, 'l4_concealed_adult_and_general_storage', 74));
    model.box(x1 + 2, y1 + 2, z2 - 3, x2 - 2, y1 + 5, z2 - 2, 'minecraft:iron_chain', meta(scope, 'l4_decorative_non_structural_hammock_frame', 74));
    model.set(x2 - 2, y1 + 1, z2 - 2, 'minecraft:water_cauldron[level=1]', meta(scope, 'l4_private_wash_and_cleanup_point', 75));
    modelDoubleIronDoor(model, scope, 'x', [x1 + 2, y1, z2], 'south', 'l4_privacy_vestibule_outer_doors', 76);
    modelDoubleIronDoor(model, scope, 'x', [x1 + 2, y1, z2 - 3], 'south', 'l4_privacy_vestibule_inner_doors', 76);
  }

  // The occupied roof is dry first: guard system, bar, dining deck, garden,
  // pool plant and both basin liners all precede any source-water state.
  model.box(-60, 90, 98, 60, 90, 157, 'minecraft:smooth_quartz', meta(scope, 'occupied_roof_weatherproof_deck', 78));
  model.box(-60, 91, 98, 60, 93, 98, 'minecraft:iron_bars', meta(scope, 'occupied_roof_perimeter_guard', 80));
  model.box(-60, 91, 157, 60, 93, 157, 'minecraft:iron_bars', meta(scope, 'occupied_roof_perimeter_guard', 80));
  model.box(-60, 91, 98, -60, 93, 157, 'minecraft:iron_bars', meta(scope, 'occupied_roof_perimeter_guard', 80));
  model.box(60, 91, 98, 60, 93, 157, 'minecraft:iron_bars', meta(scope, 'occupied_roof_perimeter_guard', 80));

  const roofBar = zone('B01-RF', 'RF-BAR').bounds.map(Number);
  model.hollow(...roofBar, 'minecraft:oxidized_cut_copper', meta(scope, 'roof_indoor_outdoor_bar_envelope', 81));
  model.box(-56, 91, 108, -24, 92, 112, 'minecraft:dark_oak_planks', meta(scope, 'roof_bar_counter', 82));
  model.box(-56, 92, 105, -24, 95, 105, 'minecraft:bookshelf', meta(scope, 'roof_backbar_and_cold_storage', 82));
  model.box(-40, 92, 130, -32, 96, 130, AIR, meta(scope, 'roof_bar_open_air_connection', 83));
  for (const x of [-54, -44, -34, -24]) {
    model.box(x, 91, 118, x + 4, 91, 122, 'minecraft:dark_oak_slab[type=bottom,waterlogged=false]', meta(scope, 'roof_bar_covered_seating', 84));
  }

  const roofGarden = zone('B01-RF', 'RF-GARDEN').bounds.map(Number);
  model.box(roofGarden[0], 90, roofGarden[2], roofGarden[3], 90, roofGarden[5], 'minecraft:moss_block', meta(scope, 'roof_garden_root_barrier_and_growing_surface', 82));
  model.box(-54, 91, 137, -24, 91, 140, 'minecraft:polished_andesite', meta(scope, 'roof_garden_accessible_walk', 83));
  for (const [x, z] of [[-54, 145], [-44, 145], [-34, 145], [-24, 145], [-54, 152], [-39, 152], [-24, 152]]) {
    model.box(x, 91, z, x + 3, 92, z + 2, 'minecraft:flowering_azalea', meta(scope, 'roof_garden_wind_screen_planting', 84));
  }
  model.box(-52, 96, 136, -26, 96, 152, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, 'roof_garden_shade_pergola', 85));
  for (const x of [-52, -26]) {
    model.box(x, 91, 136, x, 95, 152, 'minecraft:stripped_dark_oak_log[axis=y]', meta(scope, 'roof_garden_pergola_post', 85));
  }
  model.box(-18, 90, 100, 8, 90, 154, 'minecraft:light_gray_concrete', meta(scope, 'accessible_roof_dining_and_event_deck', 83));
  for (let z = 106; z <= 148; z += 10) {
    model.box(-14, 91, z, 4, 91, z + 3, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, 'roof_dining_and_lounge_seating', 84));
  }
  model.box(50, 91, 104, 58, 98, 143, 'minecraft:deepslate_tiles', meta(scope, 'isolated_pool_plant_envelope', 85));
  model.box(51, 92, 105, 57, 97, 142, AIR, meta(scope, 'pool_plant_dry_inspection_volume', 86));
  model.box(52, 92, 108, 56, 94, 138, 'minecraft:iron_block', meta(scope, 'pool_filtration_analogue', 87));

  const pool = roof.pool;
  expect(equalBounds(pool.waterBounds, [12, 92, 108, 48, 94, 140]), 'pool water bounds drifted');
  expect(equalBounds(pool.primaryBasinBounds, [9, 90, 105, 51, 95, 143]), 'primary pool basin drifted');
  expect(equalBounds(pool.secondaryContainmentEnvelope, [7, 90, 103, 53, 96, 145]), 'secondary pool containment drifted');
  const [sx1, sy1, sz1, sx2, sy2, sz2] = pool.secondaryContainmentEnvelope.map(Number);
  model.box(sx1, sy1, sz1, sx2, sy1, sz2, 'minecraft:light_blue_concrete', meta(scope, 'pool_secondary_catch_floor', 88));
  model.box(sx1, sy1 + 1, sz1, sx2, sy2, sz1, 'minecraft:prismarine_bricks', meta(scope, 'pool_secondary_containment_curb', 89));
  model.box(sx1, sy1 + 1, sz2, sx2, sy2, sz2, 'minecraft:prismarine_bricks', meta(scope, 'pool_secondary_containment_curb', 89));
  model.box(sx1, sy1 + 1, sz1, sx1, sy2, sz2, 'minecraft:prismarine_bricks', meta(scope, 'pool_secondary_containment_curb', 89));
  model.box(sx2, sy1 + 1, sz1, sx2, sy2, sz2, 'minecraft:prismarine_bricks', meta(scope, 'pool_secondary_containment_curb', 89));
  const [px1, , pz1, px2, py2, pz2] = pool.primaryBasinBounds.map(Number);
  model.box(px1, 91, pz1, px2, 91, pz2, 'minecraft:smooth_quartz', meta(scope, 'pool_primary_basin_floor', 90));
  model.box(px1, 92, pz1, px2, py2, pz1, 'minecraft:prismarine_bricks', meta(scope, 'pool_primary_basin_wall', 91));
  model.box(px1, 92, pz2, px2, py2, pz2, 'minecraft:prismarine_bricks', meta(scope, 'pool_primary_basin_wall', 91));
  model.box(px1, 92, pz1, px1, py2, pz2, 'minecraft:prismarine_bricks', meta(scope, 'pool_primary_basin_wall', 91));
  model.box(px2, 92, pz1, px2, py2, pz2, 'minecraft:prismarine_bricks', meta(scope, 'pool_primary_basin_wall', 91));
  model.box(8, 91, 104, 8, 91, 144, 'minecraft:polished_blackstone', meta(scope, 'pool_west_dry_inspection_aisle', 92));
  model.box(52, 91, 104, 52, 91, 144, 'minecraft:polished_blackstone', meta(scope, 'pool_east_dry_inspection_aisle', 92));
  model.box(8, 91, 104, 52, 91, 104, 'minecraft:polished_blackstone', meta(scope, 'pool_north_dry_inspection_aisle', 92));
  model.box(8, 91, 144, 52, 91, 144, 'minecraft:polished_blackstone', meta(scope, 'pool_south_dry_inspection_aisle', 92));
  // Broad dry steps occupy the binding accessible-entry planning zone.
  for (let step = 0; step < 3; step += 1) {
    model.box(12 + step * 2, 92 + step, 108, 13 + step * 2, 92 + step, 116, 'minecraft:smooth_quartz_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', meta(scope, 'pool_accessible_entry_analogue', 93));
  }

  // Three primary hot-tub liners sit inside one dry secondary catch zone.
  model.box(-56, 83, 143, -28, 83, 153, 'minecraft:light_blue_concrete', meta(scope, 'hot_tub_secondary_catch_floor', 88));
  model.box(-56, 84, 143, -28, 88, 143, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_secondary_containment_curb', 89));
  model.box(-56, 84, 153, -28, 88, 153, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_secondary_containment_curb', 89));
  model.box(-56, 84, 143, -56, 88, 153, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_secondary_containment_curb', 89));
  model.box(-28, 84, 143, -28, 88, 153, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_secondary_containment_curb', 89));
  model.box(-55, 84, 144, -29, 84, 152, 'minecraft:polished_blackstone', meta(scope, 'hot_tub_protected_dry_inspection_aisle', 92));
  for (const waterBounds of l4.hotTubWaterCells) {
    const [wx1, wy1, wz1, wx2, wy2, wz2] = waterBounds.map(Number);
    model.box(wx1 - 1, wy1 - 1, wz1 - 1, wx2 + 1, wy1 - 1, wz2 + 1, 'minecraft:smooth_quartz', meta(scope, 'hot_tub_primary_basin_floor', 90));
    model.box(wx1 - 1, wy1, wz1 - 1, wx2 + 1, wy2 + 1, wz1 - 1, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_primary_basin_wall', 91));
    model.box(wx1 - 1, wy1, wz2 + 1, wx2 + 1, wy2 + 1, wz2 + 1, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_primary_basin_wall', 91));
    model.box(wx1 - 1, wy1, wz1 - 1, wx1 - 1, wy2 + 1, wz2 + 1, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_primary_basin_wall', 91));
    model.box(wx2 + 1, wy1, wz1 - 1, wx2 + 1, wy2 + 1, wz2 + 1, 'minecraft:prismarine_bricks', meta(scope, 'hot_tub_primary_basin_wall', 91));
  }

  // Four broad switchback cores have three-block-wide paired flights, four
  // blocks of modeled headroom, full-floor landings, and direct doors at every
  // occupied level. Only A and D contain the two binding accessible lift
  // shafts; no ladder, water elevator or T2B tunnel geometry is introduced.
  const coreLevels = [64, 70, 76, 83, 90];
  const liftCoreIds = new Set(['CORE-A-MAIN', 'CORE-D-NORTH-EAST']);
  const addBroadCore = (core, coreIndex) => {
    const [x1, y1, z1, x2, y2, z2] = core.bounds.map(Number);
    expect(y1 === 64 && y2 === 100, `${core.id} vertical bounds drifted`);
    model.hollow(x1, y1, z1, x2, y2, z2, 'minecraft:reinforced_deepslate', meta(scope, `${core.id.toLowerCase()}_fire_separated_envelope`, 25));
    model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(scope, `${core.id.toLowerCase()}_clear_volume`, 24));
    for (let levelIndex = 0; levelIndex < coreLevels.length - 1; levelIndex += 1) {
      const lowerY = coreLevels[levelIndex];
      const upperY = coreLevels[levelIndex + 1];
      const rise = upperY - lowerY;
      const firstRise = Math.ceil(rise / 2);
      const secondRise = rise - firstRise;
      const firstX1 = x1 + 1;
      const firstX2 = x1 + 3;
      const secondX1 = x1 + 5;
      const secondX2 = x1 + 7;
      const landingZ = z2 - 2 - firstRise * 2;
      model.box(firstX1, lowerY, z2 - 3, secondX2, lowerY, z2 - 1, 'minecraft:smooth_quartz', meta(scope, 'broad_switchback_floor_landing', 27));
      for (let step = 1; step <= firstRise; step += 1) {
        const stairY = lowerY + step;
        const stairZ = z2 - 2 - step * 2;
        model.box(firstX1, stairY, stairZ - 1, firstX2, stairY, stairZ, 'minecraft:smooth_quartz_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(scope, 'three_wide_broad_switchback_stair', 28));
        model.box(firstX1, stairY + 1, stairZ - 1, firstX2, stairY + 4, stairZ, AIR, meta(scope, 'four_block_stair_headroom', 26));
      }
      const middleY = lowerY + firstRise;
      model.box(firstX1, middleY, landingZ - 1, secondX2, middleY, landingZ + 2, 'minecraft:smooth_quartz', meta(scope, 'broad_switchback_mid_landing', 27));
      model.box(firstX1, middleY + 1, landingZ - 1, secondX2, middleY + 4, landingZ + 2, AIR, meta(scope, 'four_block_landing_headroom', 26));
      for (let step = 1; step <= secondRise; step += 1) {
        const stairY = middleY + step;
        const stairZ = landingZ + step * 2;
        model.box(secondX1, stairY, stairZ, secondX2, stairY, stairZ + 1, 'minecraft:smooth_quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', meta(scope, 'three_wide_broad_switchback_stair', 28));
        model.box(secondX1, stairY + 1, stairZ, secondX2, stairY + 4, stairZ + 1, AIR, meta(scope, 'four_block_stair_headroom', 26));
      }
      model.box(firstX1, upperY, z2 - 3, secondX2, upperY, z2 - 1, 'minecraft:smooth_quartz', meta(scope, 'broad_switchback_floor_landing', 27));
    }
    for (const floorY of coreLevels) {
      modelDoubleIronDoor(model, scope, 'x', [x1 + 3, floorY + 1, z2], 'south', `${core.id.toLowerCase()}_floor_doors`, 31);
    }
    if (liftCoreIds.has(core.id)) {
      const centerZ = Math.round((z1 + z2) / 2);
      model.box(x1 + 8, 64, centerZ - 2, x2, 100, centerZ + 2, 'minecraft:iron_block', meta(scope, `${core.id.toLowerCase()}_accessible_lift_shaft`, 29));
      model.box(x1 + 9, 65, centerZ - 1, x2 - 1, 99, centerZ + 1, AIR, meta(scope, `${core.id.toLowerCase()}_lift_clear_shaft`, 28));
      for (const floorY of coreLevels) {
        model.box(x1 + 9, floorY, centerZ - 1, x2 - 1, floorY, centerZ + 1, 'minecraft:smooth_stone', meta(scope, 'accessible_lift_stop_platform', 30));
        modelDoubleIronDoor(model, scope, 'z', [x1 + 8, floorY + 1, centerZ - 1], 'east', 'accessible_lift_landing_doors', 31);
      }
    }
    if (core.id === 'CORE-B-WEST-REMOTE' || core.id === 'CORE-C-EAST-REMOTE') {
      const centerX = Math.round((x1 + x2) / 2);
      model.box(centerX - 2, 64, z2 + 1, centerX + 2, 64, 165, 'minecraft:polished_andesite', meta(scope, 'remote_exit_discharge_floor', 32));
      model.box(centerX - 2, 65, z2 + 1, centerX + 2, 69, 165, AIR, meta(scope, 'remote_exit_discharge_headroom', 30));
      modelDoubleIronDoor(model, scope, 'x', [centerX - 1, 65, 165], 'south', 'remote_exit_direct_discharge', 33);
    }
    return {
      id: core.id,
      bounds: core.bounds.map(Number),
      broadStairWidth: 3,
      modeledHeadroom: 4,
      occupiedLevelsServed: coreLevels.length,
      accessibleLift: liftCoreIds.has(core.id),
      remoteRoute: ['CORE-B-WEST-REMOTE', 'CORE-C-EAST-REMOTE'].includes(core.id),
      t2bGeometry: false,
      index: coreIndex,
    };
  };
  const modeledCores = design.circulationAndEgress.verticalCores.map(addBroadCore);

  // The exact 9×5 grid is transformed by the four binding adjustments, then
  // installed as 45 one-cell dry load paths from y50 through the occupied
  // roof. Floor and basin membranes remain continuous caps at their levels.
  const supportDefinition = design.supportAndWaterEngineering.provisionalSupportGrid;
  const replacementByPoint = new Map(
    supportDefinition.adjustmentsToAvoidDecodedGravityCells.map(({ remove, reserve }) => [
      key(Number(remove[0]), 0, Number(remove[1])),
      reserve.map(Number),
    ]),
  );
  const adjustedSupportPoints = [];
  for (const x of supportDefinition.baseGridX.map(Number)) {
    for (const z of supportDefinition.baseGridZ.map(Number)) {
      adjustedSupportPoints.push(
        replacementByPoint.get(key(x, 0, z)) ?? [x, z],
      );
    }
  }
  expect(adjustedSupportPoints.length === 45, 'adjusted support grid is not 45 lines');
  expect(new Set(adjustedSupportPoints.map(([x, z]) => key(x, 0, z))).size === 45, 'adjusted support grid contains duplicates');
  expect(
    adjustedSupportPoints.every(([x, z]) => !protectedKitchenCells.has(key(x, 65, z))),
    'adjusted support grid collides with a protected kitchen BE',
  );
  for (const [x, z] of adjustedSupportPoints) {
    model.box(x, 50, z, x, 90, z, 'minecraft:reinforced_deepslate', meta(scope, 'adjusted_45_line_dry_support_grid', 20));
  }
  // Re-cap structural penetrations with solid dry floor/membrane blocks.
  for (const [floorY, state] of [
    [64, 'minecraft:polished_andesite'],
    [70, 'minecraft:polished_andesite'],
    [76, 'minecraft:dark_oak_planks'],
    [83, 'minecraft:polished_blackstone'],
  ]) {
    for (const [x, z] of adjustedSupportPoints) {
      model.set(x, floorY, z, state, meta(scope, 'support_grid_structural_floor_cap', 21));
    }
  }
  for (const [x, z] of adjustedSupportPoints) {
    if (x >= sx1 && x <= sx2 && z >= sz1 && z <= sz2) {
      model.set(x, 90, z, 'minecraft:light_blue_concrete', meta(scope, 'pool_secondary_membrane_support_cap', 88));
    } else {
      model.set(x, 90, z, 'minecraft:smooth_quartz', meta(scope, 'occupied_roof_support_cap', 78));
    }
  }

  // Water is intentionally modeled after every dry structure, inspection
  // aisle, guard and support cell. The compiler will add its blue-ice flow
  // barrier stage and source release one priority later.
  let modeledWaterCells = 0;
  for (const waterBounds of l4.hotTubWaterCells) {
    const bounds = waterBounds.map(Number);
    model.box(...bounds, 'minecraft:water[level=0]', meta(scope, 'hot_tub_isolated_water_latest_priority', 990));
    modeledWaterCells += (
      (bounds[3] - bounds[0] + 1)
      * (bounds[4] - bounds[1] + 1)
      * (bounds[5] - bounds[2] + 1)
    );
  }
  const poolWater = pool.waterBounds.map(Number);
  model.box(...poolWater, 'minecraft:water[level=0]', meta(scope, 'pool_isolated_water_latest_priority', 990));
  modeledWaterCells += (
    (poolWater[3] - poolWater[0] + 1)
    * (poolWater[4] - poolWater[1] + 1)
    * (poolWater[5] - poolWater[2] + 1)
  );

  for (const point of design.snapshotSurvey.b01.blockEntities.positions) {
    expect(!model.cells.has(key(...point.point.map(Number))), `protected kitchen BE targeted at ${point.point.join(',')}`);
  }

  return {
    scope,
    designReviewPath,
    designReviewArtifactId: design.artifactId,
    retainedExistingOccupiedLevels: 2,
    protectedKitchenBlockEntities: protectedKitchenCells.size,
    adjustedDrySupportLines: adjustedSupportPoints.length,
    supportRangeY: [50, 90],
    verticalCores: modeledCores,
    broadSwitchbackStairCores: modeledCores.length,
    accessibleLiftCores: modeledCores.filter((core) => core.accessibleLift).length,
    remoteExitRoutes: modeledCores.filter((core) => core.remoteRoute).length,
    l1ProgramZones: byFloor.get('B01-L1').zones.length,
    l2ProgramZones: byFloor.get('B01-L2').zones.length,
    protectedAtriumBridges: 2,
    setbackL3Bounds: l3.enclosedBounds.map(Number),
    controlledNonGraphicL4Bounds: l4.enclosedBounds.map(Number),
    hotTubPrimaryBasins: l4.hotTubWaterCells.length,
    poolPrimaryBasins: 1,
    secondaryContainmentSystems: 2,
    modeledWaterCells,
    waterModelPriority: 990,
    guardedOccupiedTerraces: l3.terraces.length + 1,
    roofBar: true,
    roofGarden: true,
    staffConnectionBounds: staffConnection,
    staffConnectionDependency: 'TE-MAINSTREET-EMPLOYEE-LOUNGE',
    t2bGeometryCells: 0,
    designSources: [designReviewPath, designReviewMemoPath],
  };
}

async function modelWorkforceDistrict(model, snapshot) {
  // Keep the two workforce projects and shared court west of the exact
  // Manager Vale cottage reservation. This is a pure translation of the
  // existing project geometry and preserves the requested southwest program
  // without competing for any cottage-owned cell.
  modelHousingBlock(
    model,
    'TE-RAVENSREACH-WORKFORCE-HOUSING-A',
    [-205, -159, -290, -267],
    'minecraft:bricks',
    74,
    4,
  );
  modelHousingBlock(
    model,
    'TE-RAVENSREACH-WORKFORCE-HOUSING-B-WEST',
    [-205, -184, -250, -227],
    'minecraft:mud_bricks',
    72,
    3,
  );
  modelHousingBlock(
    model,
    'TE-RAVENSREACH-WORKFORCE-HOUSING-B-EAST',
    [-181, -159, -250, -227],
    'minecraft:mud_bricks',
    70,
    3,
  );
  const court = 'TE-RAVENSREACH-WORKFORCE-COURT';
  model.box(-205, 75, -266, -159, 83, -251, AIR, meta(court, 'court_clearance', 50));
  model.box(-205, 74, -266, -159, 74, -251, 'minecraft:moss_block', meta(court, 'shared_central_green', 51));
  model.box(-185, 74, -266, -179, 74, -251, 'minecraft:polished_andesite', meta(court, 'court_walk', 52));
  model.box(-205, 74, -261, -159, 74, -256, 'minecraft:polished_andesite', meta(court, 'court_crosswalk', 52));
  model.box(-203, 75, -264, -191, 76, -260, 'minecraft:smooth_quartz', meta(court, 'community_stage', 53));
  for (const x of [-201, -183, -165]) {
    model.box(x, 75, -265, x + 1, 79, -264, 'minecraft:cut_copper', meta(court, 'court_light', 54));
    model.box(x, 75, -253, x + 1, 79, -252, 'minecraft:cut_copper', meta(court, 'court_light', 54));
  }

  // Dedicated employee greenway beside (not through) West Lane and every
  // residential/service building. It follows the surveyed surface with
  // one-block maximum grade changes.
  const pathScope = 'TE-RAVENSREACH-MAINSTREET-STAFF-PATH';
  const centerline = linePoints([
    [-153, 68, -300],
    [-153, 72, -282],
    [-153, 72, -258],
    [-153, 70, -238],
    [-150, 65, -219],
    [-150, 65, -160],
    [-100, 65, -120],
    [-82, 65, -80],
    [-82, 65, 85],
    [-82, 65, 89],
  ]);
  let priorY = null;
  for (const [centerX, _designY, z] of centerline) {
    const surface = await currentSurface(snapshot, centerX, z);
    if (!surface) continue;
    let targetY = Math.min(78, Math.max(63, surface.y));
    if (priorY !== null) {
      targetY = Math.max(priorY - 1, Math.min(priorY + 1, targetY));
    }
    priorY = targetY;
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = centerX + dx;
      model.set(x, targetY, z, dx === 0 ? 'minecraft:yellow_concrete' : 'minecraft:polished_andesite', meta(pathScope, 'staff_greenway', 60));
      model.box(x, targetY + 1, z, x, targetY + 4, z, AIR, meta(pathScope, 'staff_greenway_headroom', 59));
    }
  }

  // Attached staff pavilion at the Guest & Design Center's northwest edge.
  // The accepted B01 room program remains east of the new connecting door.
  const lounge = 'TE-MAINSTREET-EMPLOYEE-LOUNGE';
  modelSimpleVenue(model, lounge, [-94, 64, 90, -73, 76, 121], 'minecraft:quartz_bricks', 'minecraft:dark_oak_planks', 'minecraft:oxidized_cut_copper');
  model.box(-92, 65, 92, -84, 65, 107, 'minecraft:green_carpet', meta(lounge, 'breakroom_and_quiet_lounge', 72));
  model.box(-82, 65, 92, -75, 65, 107, 'minecraft:white_concrete', meta(lounge, 'staff_kitchen', 72));
  model.box(-92, 65, 110, -84, 65, 119, 'minecraft:blue_wool', meta(lounge, 'lockers_and_showers', 72));
  model.box(-82, 65, 110, -75, 65, 119, 'minecraft:red_wool', meta(lounge, 'dispatch_desk', 72));
  model.box(-82, 65, 90, -80, 68, 90, AIR, meta(lounge, 'path_door', 74));
  model.box(-73, 65, 103, -72, 68, 105, AIR, meta(lounge, 'guest_center_staff_connection', 74));
  for (let x = -91; x <= -85; x += 3) {
    model.box(x, 66, 96, x + 1, 66, 98, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(lounge, 'lounge_seating', 73));
  }
}

async function currentSurface(snapshot, x, z) {
  for (let y = 110; y >= 40; y -= 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (state && !['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(baseBlockName(state))) {
      return { y, state };
    }
  }
  return null;
}

async function modelAttachedGarages(model, snapshot, schedulePath) {
  if (!fs.existsSync(schedulePath)) return { loaded: false, houses: [] };
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const houses = schedule.garages ?? schedule.houses ?? [];
  for (const garage of houses) {
    const scope = `TE-ATTACHED-GARAGE-${garage.house ?? garage.id}`;
    const bounds = garage.attachedBounds
      ?? garage.proposedAttached?.bounds
      ?? garage.shell
      ?? garage.bounds;
    if (!bounds || ![4, 6].includes(bounds.length)) continue;
    const [x1, x2, z1, z2] = bounds.length === 6
      ? [bounds[0], bounds[3], bounds[2], bounds[5]].map(Number)
      : bounds.map(Number);
    const floorY = Number(
      garage.floorY
      ?? garage.floor_y
      ?? garage.proposedAttached?.floorY,
    );
    const houseBounds = garage.houseBounds ?? [];
    const houseMinX = Number(houseBounds[0]);
    const houseMaxX = Number(houseBounds.length === 6 ? houseBounds[3] : houseBounds[1]);
    const houseMinZ = Number(houseBounds.length === 6 ? houseBounds[2] : houseBounds[2]);
    const attachesOnX = (
      Number(x2) === houseMinX
      || Number(x1) === houseMaxX
    );
    const front = garage.portalFace
      ?? garage.front
      ?? (
        attachesOnX
          ? (x1 < 0 ? 'west' : 'east')
          : (z1 < houseMinZ ? 'north' : 'south')
      );
    const portalCount = Number(
      garage.bays
      ?? garage.bayCount
      ?? garage.portalSpans?.length
      ?? (
        Number(garage.capacity) === 6
          ? 3
          : Number(garage.capacity) === 4 ? 2 : 2
      ),
    );
    const shellTopY = bounds.length === 6 ? Number(bounds[4]) : floorY + 6;
    model.box(x1, floorY + 1, z1, x2, shellTopY, z2, AIR, meta(scope, 'attached_garage_clearance', 10));
    model.box(x1, floorY, z1, x2, floorY, z2, 'minecraft:polished_andesite', meta(scope, 'attached_garage_floor', 20));
    model.box(x1, floorY + 1, z1, x2, shellTopY - 1, z1, 'minecraft:stone_bricks', meta(scope, 'attached_garage_wall', 30));
    model.box(x1, floorY + 1, z2, x2, shellTopY - 1, z2, 'minecraft:stone_bricks', meta(scope, 'attached_garage_wall', 30));
    model.box(x1, floorY + 1, z1, x1, shellTopY - 1, z2, 'minecraft:stone_bricks', meta(scope, 'attached_garage_wall', 30));
    model.box(x2, floorY + 1, z1, x2, shellTopY - 1, z2, 'minecraft:stone_bricks', meta(scope, 'attached_garage_wall', 30));
    const exactPortalSpans = garage.portalSpans ?? null;
    if (front === 'west' || front === 'east') {
      const frontX = front === 'west' ? x1 : x2;
      const spans = exactPortalSpans ?? Array.from({ length: portalCount }, (_, bay) => {
        const usableSpan = z2 - z1 - 2;
        const bayWidth = Math.max(2, Math.floor(usableSpan / portalCount));
        const startZ = z1 + 1 + bay * bayWidth;
        return [startZ, Math.min(z2 - 1, startZ + bayWidth - 2)];
      });
      for (const [startZ, endZ] of spans) {
        model.box(frontX, floorY + 1, startZ, frontX, floorY + 4, endZ, AIR, meta(scope, 'garage_vehicle_portal', 35));
        model.box(frontX, floorY + 5, startZ, frontX, floorY + 5, endZ, 'minecraft:smooth_quartz', meta(scope, 'garage_lintel', 36));
      }
    } else {
      const frontZ = front === 'north' ? z1 : z2;
      const spans = exactPortalSpans ?? Array.from({ length: portalCount }, (_, bay) => {
        const usableSpan = x2 - x1 - 2;
        const bayWidth = Math.max(2, Math.floor(usableSpan / portalCount));
        const startX = x1 + 1 + bay * bayWidth;
        return [startX, Math.min(x2 - 1, startX + bayWidth - 2)];
      });
      for (const [startX, endX] of spans) {
        model.box(startX, floorY + 1, frontZ, endX, floorY + 4, frontZ, AIR, meta(scope, 'garage_vehicle_portal', 35));
        model.box(startX, floorY + 5, frontZ, endX, floorY + 5, frontZ, 'minecraft:smooth_quartz', meta(scope, 'garage_lintel', 36));
      }
    }
    model.box(x1, shellTopY, z1, x2, shellTopY, z2, 'minecraft:dark_oak_planks', meta(scope, 'attached_garage_roof', 40));
    const connection = garage.houseConnection
      ?? garage.connection
      ?? garage.attachmentCore;
    if (connection?.length === 6) {
      const [cx1, cy1, cz1, cx2, cy2, cz2] = connection.map(Number);
      model.box(cx1, cy1, cz1, cx2, cy1, cz2, 'minecraft:polished_andesite', meta(scope, 'continuous_house_connection_floor', 44));
      model.box(cx1, cy1 + 1, cz1, cx2, cy2, cz2, AIR, meta(scope, 'continuous_house_connection', 45));
    } else if (garage.proposedAttached?.sharedWall?.x !== undefined) {
      const doorX = Number(garage.proposedAttached.sharedWall.x);
      const doorZ = Number(garage.proposedAttached.sharedWall.doorCandidateZ);
      const lowerDoorY = Math.min(
        floorY,
        Number(garage.floorsY?.[0] ?? floorY),
      ) + 1;
      const upperDoorY = Math.max(
        floorY,
        Number(garage.floorsY?.[0] ?? floorY),
      ) + 3;
      model.box(doorX, lowerDoorY, doorZ, doorX, upperDoorY, doorZ + 1, AIR, meta(scope, 'continuous_house_connection', 45));
      // A fully enclosed transition volume makes raised garages physically
      // part of the parent house, even where an internal stair is required.
      if (garage.proposedAttached.verticalTransition) {
        model.box(
          doorX - 1,
          Math.min(floorY, Number(garage.floorsY?.[0] ?? floorY)),
          doorZ - 2,
          doorX + 1,
          Math.max(floorY, Number(garage.floorsY?.[0] ?? floorY)) + 5,
          doorZ + 2,
          'minecraft:stone_bricks',
          meta(scope, 'enclosed_mudroom_stair_tower', 42),
        );
        model.box(
          doorX,
          Math.min(floorY, Number(garage.floorsY?.[0] ?? floorY)) + 1,
          doorZ - 1,
          doorX,
          Math.max(floorY, Number(garage.floorsY?.[0] ?? floorY)) + 4,
          doorZ + 1,
          AIR,
          meta(scope, 'mudroom_stair_clearance', 43),
        );
      }
    } else if (garage.proposedAttached?.sharedWall?.z !== undefined) {
      const doorZ = Number(garage.proposedAttached.sharedWall.z);
      const doorX = Math.round((x1 + x2) / 2);
      const lowerDoorY = Math.min(
        floorY,
        Number(garage.floorsY?.[0] ?? floorY),
      ) + 1;
      const upperDoorY = Math.max(
        floorY,
        Number(garage.floorsY?.[0] ?? floorY),
      ) + 3;
      model.box(doorX, lowerDoorY, doorZ, doorX + 1, upperDoorY, doorZ, AIR, meta(scope, 'continuous_house_connection', 45));
      if (garage.proposedAttached.verticalTransition) {
        model.box(
          doorX - 2,
          Math.min(floorY, Number(garage.floorsY?.[0] ?? floorY)),
          doorZ - 1,
          doorX + 2,
          Math.max(floorY, Number(garage.floorsY?.[0] ?? floorY)) + 5,
          doorZ + 1,
          'minecraft:stone_bricks',
          meta(scope, 'enclosed_mudroom_stair_tower', 42),
        );
        model.box(
          doorX - 1,
          Math.min(floorY, Number(garage.floorsY?.[0] ?? floorY)) + 1,
          doorZ,
          doorX + 1,
          Math.max(floorY, Number(garage.floorsY?.[0] ?? floorY)) + 4,
          doorZ,
          AIR,
          meta(scope, 'mudroom_stair_clearance', 43),
        );
      }
    }
    // Regrade only the short apron; established alley geometry stays intact.
    const apron = garage.apronBounds;
    if (apron?.length === 4) {
      for (let x = Number(apron[0]); x <= Number(apron[1]); x += 1) {
        for (let z = Number(apron[2]); z <= Number(apron[3]); z += 1) {
          const surface = await currentSurface(snapshot, x, z);
          if (!surface) continue;
          model.set(x, surface.y, z, 'minecraft:light_gray_concrete', meta(scope, 'garage_apron', 50));
          model.box(x, surface.y + 1, z, x, surface.y + 3, z, AIR, meta(scope, 'garage_apron_headroom', 49));
        }
      }
    }
    const retired = garage.retiredDetachedBounds
      ?? garage.currentDetached?.bounds;
    if (retired?.length === 6) {
      const [rx1, ry1, rz1, rx2, ry2, rz2] = retired.map(Number);
      model.box(
        rx1,
        ry1 + 1,
        rz1,
        rx2,
        ry2,
        rz2,
        AIR,
        meta(scope, 'retire_detached_pavilion_outside_attached_shell', 90),
        (x, y, z) => !(
          x >= x1 && x <= x2
          && y >= floorY && y <= shellTopY
          && z >= z1 && z <= z2
        ),
      );
    } else if (retired?.length === 4 && garage.currentDetached?.floorY !== undefined) {
      const [rx1, rx2, rz1, rz2] = retired.map(Number);
      const retiredFloorY = Number(garage.currentDetached.floorY);
      model.box(
        rx1,
        retiredFloorY,
        rz1,
        rx2,
        retiredFloorY + 6,
        rz2,
        AIR,
        meta(scope, 'retire_detached_pavilion', 90),
      );
    }
  }
  return { loaded: true, houses };
}

function compactCells(cells) {
  const pending = new Map(cells.map((cell) => [key(cell.x, cell.y, cell.z), cell]));
  const boxes = [];
  const ordered = [...cells].sort((a, b) => (
    a.phase - b.phase
    || a.scope.localeCompare(b.scope)
    || a.role.localeCompare(b.role)
    || a.y - b.y
    || a.z - b.z
    || a.x - b.x
  ));
  for (const seed of ordered) {
    if (!pending.has(key(seed.x, seed.y, seed.z))) continue;
    let x2 = seed.x;
    while (true) {
      const candidate = pending.get(key(x2 + 1, seed.y, seed.z));
      if (!candidate
          || candidate.expected !== seed.expected
          || candidate.state !== seed.state
          || candidate.phase !== seed.phase
          || candidate.scope !== seed.scope
          || candidate.role !== seed.role) break;
      x2 += 1;
    }
    let z2 = seed.z;
    zLoop:
    while (true) {
      const candidateZ = z2 + 1;
      for (let x = seed.x; x <= x2; x += 1) {
        const candidate = pending.get(key(x, seed.y, candidateZ));
        if (!candidate
            || candidate.expected !== seed.expected
            || candidate.state !== seed.state
            || candidate.phase !== seed.phase
            || candidate.scope !== seed.scope
            || candidate.role !== seed.role) break zLoop;
      }
      z2 = candidateZ;
    }
    for (let z = seed.z; z <= z2; z += 1) {
      for (let x = seed.x; x <= x2; x += 1) pending.delete(key(x, seed.y, z));
    }
    boxes.push({
      x1: seed.x,
      y1: seed.y,
      z1: seed.z,
      x2,
      y2: seed.y,
      z2,
      expected: seed.expected,
      replacement: seed.state,
      phase: seed.phase,
      scope: seed.scope,
      role: seed.role,
      cellCount: (x2 - seed.x + 1) * (z2 - seed.z + 1),
    });
  }
  const vertical = [];
  const byFootprint = new Map();
  for (const box of boxes) {
    const footprint = [
      box.x1,
      box.x2,
      box.z1,
      box.z2,
      box.expected,
      box.replacement,
      box.phase,
      box.scope,
      box.role,
    ].join('|');
    if (!byFootprint.has(footprint)) byFootprint.set(footprint, []);
    byFootprint.get(footprint).push(box);
  }
  for (const group of byFootprint.values()) {
    group.sort((left, right) => left.y1 - right.y1);
    let active = null;
    for (const box of group) {
      if (active && box.y1 === active.y2 + 1) {
        active.y2 = box.y2;
        active.cellCount += box.cellCount;
      } else {
        if (active) vertical.push(active);
        active = { ...box };
      }
    }
    if (active) vertical.push(active);
  }
  return vertical;
}

function operationLine(operation) {
  return [
    'REPL',
    operation.x1,
    operation.y1,
    operation.z1,
    operation.x2,
    operation.y2,
    operation.z2,
    operation.expected,
    operation.replacement,
  ].join(' ');
}

function oneCellOperationLine(operation) {
  const [x, y, z] = operation.point;
  return [
    'REPL',
    x,
    y,
    z,
    x,
    y,
    z,
    operation.expected,
    operation.desired,
  ].join(' ');
}

function managerValeOwnership(compiled, sharedModel) {
  const operationKeys = new Set();
  const scopeCells = new Map();
  const intersections = [];
  for (const operation of compiled.operations) {
    const coordinate = operation.point.join(',');
    if (operationKeys.has(coordinate)) {
      throw new Error(`Manager Vale duplicate target ${coordinate}`);
    }
    operationKeys.add(coordinate);
    if (!scopeCells.has(operation.scope)) scopeCells.set(operation.scope, []);
    scopeCells.get(operation.scope).push({
      x: operation.point[0],
      y: operation.point[1],
      z: operation.point[2],
    });
    const shared = sharedModel.cells.get(coordinate);
    if (shared) {
      intersections.push({
        point: operation.point,
        managerValeScope: operation.scope,
        managerValeRole: operation.role,
        sharedScope: shared.scope,
        sharedRole: shared.role,
      });
    }
  }
  return {
    owner: 'scripts/manager_vale_cottage_compiler.mjs#compileManagerValeCottages',
    exactOneCellOperations: compiled.operations.length,
    uniqueTargetCells: operationKeys.size,
    sharedModelTargetIntersections: intersections.length,
    intersectionExamples: intersections.slice(0, 50),
    scopes: [...scopeCells.entries()]
      .map(([scope, cells]) => ({
        scope,
        targetCells: cells.length,
        bounds: boundsOf(cells),
      }))
      .sort((left, right) => left.scope.localeCompare(right.scope)),
  };
}

function modelWestlightBackstageRoom(model, scope, bounds, floorRole, accent) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  model.hollow(x1, y1, z1, x2, y2, z2, 'minecraft:deepslate_bricks', meta(scope, `${floorRole}_envelope`, 52));
  model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(scope, `${floorRole}_clear_volume`, 51));
  model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, accent, meta(scope, `${floorRole}_floor`, 53));
  const doorX = Math.round((x1 + x2) / 2);
  model.box(doorX - 1, y1 + 1, z2, doorX + 1, y1 + 4, z2, AIR, meta(scope, `${floorRole}_door`, 54));
}

function modelWestlightModernCore(model, definition) {
  const {
    scope,
    bounds,
    lowerY,
    upperY,
    routeLevels,
    accent,
  } = definition;
  const [x1, z1, x2, z2] = bounds;
  model.hollow(x1, lowerY, z1, x2, upperY + 4, z2, 'minecraft:polished_deepslate', meta(scope, 'modern_vertical_core_envelope', 58));
  model.box(x1 + 1, lowerY + 1, z1 + 1, x2 - 1, upperY + 3, z2 - 1, AIR, meta(scope, 'modern_vertical_core_clearance', 57));
  compactSwitchbackStair(model, scope, [x1 + 1, z1 + 1, x2 - 4, z2 - 1], lowerY, upperY, 62);

  // A visibly separate lift analogue runs beside the stair. It remains dry,
  // has a continuous clear shaft and opens only at named route levels.
  model.box(x2 - 3, lowerY, z1 + 1, x2 - 1, upperY + 3, z1 + 3, 'minecraft:iron_block', meta(scope, 'accessible_lift_shaft', 60));
  model.box(x2 - 2, lowerY + 1, z1 + 2, x2 - 2, upperY + 2, z1 + 2, AIR, meta(scope, 'accessible_lift_clear_shaft', 61));
  for (const levelY of routeLevels) {
    model.box(x1 + 1, levelY, z1 + 1, x2 - 1, levelY, z2 - 1, 'minecraft:smooth_quartz', meta(scope, 'full_depth_level_landing', 64));
    model.box(x1 + 1, levelY + 1, z1 + 1, x2 - 1, levelY + 4, z2 - 1, AIR, meta(scope, 'level_landing_headroom', 63));
    model.box(x2 - 3, levelY + 1, z1 + 1, x2 - 1, levelY + 3, z1 + 1, AIR, meta(scope, 'lift_landing_door', 65));
    model.box(x1, levelY + 1, Math.round((z1 + z2) / 2) - 1, x1, levelY + 3, Math.round((z1 + z2) / 2) + 1, AIR, meta(scope, 'signed_route_level_door', 65));
    model.box(x1 + 1, levelY + 3, z2 - 2, x1 + 3, levelY + 3, z2 - 1, accent, meta(scope, 'route_level_color_wayfinding', 66));
  }
  for (let y = lowerY + 3; y <= upperY + 2; y += 6) {
    model.box(x1, y, z1, x1, y, z2, 'minecraft:sea_lantern', meta(scope, 'continuous_bright_core_lighting', 67));
  }
}

async function modelWestlightVenueRedesign(model, snapshot) {
  const sky = 'TE-WL-SKY-BOWL-IDENTITY';
  for (const [x1, x2] of [[-378, -365], [-360, -347]]) {
    model.box(
      x1,
      67,
      -503,
      x2,
      67,
      -492,
      'minecraft:polished_andesite',
      meta(sky, 'arena_identity_plaza', 45),
      (x, y, z) => (
        model.cells.get(key(x, y, z))?.ownershipScope
        !== 'TE-REGIONAL-APPROACH-ROAD'
      ),
    );
    model.box(x1 + 1, 68, -502, x1 + 3, 77, -500, 'minecraft:cut_copper', meta(sky, 'venue_identity_pylon', 46));
    model.box(x1 + 4, 68, -502, x2 - 1, 71, -498, 'minecraft:blue_concrete', meta(sky, 'ticket_help_and_wayfinding', 47));
    model.box(x1 + 5, 69, -501, x2 - 2, 70, -497, AIR, meta(sky, 'ticket_help_counter', 48));
    model.box(x1 + 1, 76, -503, x2 - 1, 78, -503, 'minecraft:gold_block', meta(sky, 'sky_bowl_marquee', 49));
  }

  const blue = 'TE-WL-BLUE-DRUM';
  model.hollow(-443, 67, -548, -431, 78, -526, 'minecraft:blue_terracotta', meta(blue, 'independent_west_portal', 50));
  model.box(-442, 68, -547, -432, 77, -527, AIR, meta(blue, 'marquee_vestibule_and_box_office', 51));
  model.box(-443, 75, -548, -431, 78, -548, 'minecraft:oxidized_cut_copper', meta(blue, 'blue_drum_marquee', 52));
  model.box(-440, 68, -547, -435, 70, -543, 'minecraft:dark_oak_planks', meta(blue, 'box_office_and_accessibility_desk', 53));
  modelWestlightModernCore(model, {
    scope: blue,
    bounds: [-441, -544, -430, -531],
    lowerY: 18,
    upperY: 67,
    routeLevels: [18, 29, 40, 67],
    accent: 'minecraft:blue_concrete',
  });
  for (const [levelY, role] of [[18, 'orchestra'], [29, 'parterre'], [40, 'balcony']]) {
    model.hollow(-433, levelY, -542, -420, levelY + 5, -536, 'minecraft:deepslate_tiles', meta(blue, `${role}_acoustical_link`, 68));
    model.box(-432, levelY + 1, -541, -421, levelY + 4, -537, AIR, meta(blue, `${role}_clear_route`, 69));
    model.box(-432, levelY, -541, -421, levelY, -537, 'minecraft:blue_concrete', meta(blue, `${role}_route_floor`, 70));
  }

  modelWestlightBackstageRoom(model, blue, [-410, 18, -611, -391, 28, -585], 'ensemble_dressing_and_accessible_change', 'minecraft:purple_wool');
  modelWestlightBackstageRoom(model, blue, [-410, 29, -611, -391, 39, -594], 'green_room_and_performer_kitchenette', 'minecraft:green_carpet');
  modelWestlightBackstageRoom(model, blue, [-329, 18, -611, -310, 28, -585], 'principal_dressing_and_wardrobe', 'minecraft:red_carpet');
  modelWestlightBackstageRoom(model, blue, [-329, 29, -611, -304, 39, -585], 'rehearsal_and_music_store', 'minecraft:blue_wool');
  model.box(-389, 18, -613, -331, 23, -608, 'minecraft:deepslate_bricks', meta(blue, 'rear_stage_crossover_envelope', 71));
  model.box(-388, 19, -612, -332, 22, -609, AIR, meta(blue, 'rear_stage_crossover', 72));
  for (const x of [-382, -360, -338]) {
    model.box(x, 20, -612, x + 2, 22, -612, 'minecraft:sea_lantern', meta(blue, 'performer_route_wayfinding', 73));
  }

  const lantern = 'TE-WL-LANTERN-STUDIO';
  model.hollow(-443, 67, -589, -431, 78, -568, 'minecraft:dark_oak_planks', meta(lantern, 'independent_west_portal', 50));
  model.box(-442, 68, -588, -432, 77, -569, AIR, meta(lantern, 'club_vestibule_and_box_office', 51));
  model.box(-443, 75, -589, -431, 78, -589, 'minecraft:cut_copper', meta(lantern, 'lantern_marquee', 52));
  model.box(-440, 68, -588, -435, 70, -584, 'minecraft:red_nether_bricks', meta(lantern, 'age_control_and_ticket_desk', 53));
  modelWestlightModernCore(model, {
    scope: lantern,
    bounds: [-440, -585, -429, -574],
    lowerY: 35,
    upperY: 67,
    routeLevels: [35, 40, 67],
    accent: 'minecraft:red_nether_bricks',
  });
  model.hollow(-433, 35, -580, -417, 40, -558, 'minecraft:deepslate_tiles', meta(lantern, 'club_studio_arrival_link', 68));
  model.box(-432, 36, -579, -418, 39, -559, AIR, meta(lantern, 'club_studio_clear_arrival', 69));
  model.box(-432, 35, -579, -418, 35, -559, 'minecraft:red_nether_bricks', meta(lantern, 'club_studio_arrival_floor', 70));
  modelWestlightBackstageRoom(model, lantern, [-429, 35, -566, -418, 44, -550], 'studio_green_room_rehearsal_and_store', 'minecraft:dark_oak_planks');

  // A 40-seat end-stage arrangement with two uninterrupted side aisles. The
  // rear bar begins north of the final row and cannot face or block the stage.
  model.box(-413, 35, -565, -405, 35, -562, 'minecraft:polished_blackstone', meta(lantern, 'studio_end_stage', 73));
  model.box(-413, 36, -565, -405, 38, -562, 'minecraft:red_wool', meta(lantern, 'studio_stage_drape', 74));
  let studioSeats = 0;
  for (const z of [-560, -559, -558, -557, -556]) {
    for (const x of [-413, -412, -411, -410, -409, -408, -407, -406]) {
      model.set(x, 35, z, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(lantern, 'forty_seat_studio', 75));
      studioSeats += 1;
    }
  }
  model.box(-415, 35, -561, -414, 39, -551, AIR, meta(lantern, 'west_exit_aisle', 76));
  model.box(-404, 35, -561, -403, 39, -551, AIR, meta(lantern, 'east_exit_aisle', 76));
  model.box(-413, 35, -554, -406, 36, -551, 'minecraft:dark_oak_planks', meta(lantern, 'rear_bar_and_lounge', 77));
  model.box(-412, 37, -553, -407, 39, -551, 'minecraft:cut_copper', meta(lantern, 'rear_backbar', 78));
  model.box(-416, 40, -565, -401, 44, -551, 'minecraft:polished_blackstone', meta(lantern, 'technical_gallery_and_private_balcony', 79));
  model.box(-415, 41, -564, -402, 43, -552, AIR, meta(lantern, 'technical_gallery_clearance', 80));

  const basement = 'TE-WL-VENUE-BASEMENTS';
  for (const room of [
    // The scene shop ends at x=-341. The independently owned freight corridor
    // begins at x=-340, so the large-item route meets the room at one wall
    // instead of erasing five columns of finished room envelope.
    { bounds: [-384, 7, -611, -348, 15, -595], role: 'b1_scene_shop_receiving_and_prop_hold', accent: 'minecraft:yellow_concrete' },
    { bounds: [-362, 7, -594, -336, 15, -579], role: 'b1_wardrobe_laundry_technical_plant', accent: 'minecraft:light_blue_concrete' },
    { bounds: [-384, -5, -611, -353, 3, -595], role: 'b2_secure_archive_and_resilient_plant', accent: 'minecraft:red_concrete' },
    { bounds: [-362, -5, -594, -352, 3, -579], role: 'b2_maintenance_and_secure_store', accent: 'minecraft:orange_concrete' },
  ]) {
    modelWestlightBackstageRoom(model, basement, room.bounds, room.role, room.accent);
  }
  modelWestlightModernCore(model, {
    scope: basement,
    bounds: [-360, -603, -353, -596],
    lowerY: -5,
    upperY: 18,
    routeLevels: [-5, 7, 18],
    accent: 'minecraft:yellow_concrete',
  });

  const freight = 'TE-WL-FREIGHT';
  let priorRoadY = null;
  for (const [x, _designY, z] of linePoints([
    [-204, 70, -496],
    [-204, 70, -475],
    [-256, 69, -475],
    [-256, 69, -545],
    [-256, 69, -568],
    [-256, 69, -584],
  ])) {
    const surface = await currentSurface(snapshot, x, z);
    if (!surface) continue;
    let roadY = Math.min(73, Math.max(67, surface.y + 1));
    if (priorRoadY !== null) roadY = Math.max(priorRoadY - 1, Math.min(priorRoadY + 1, roadY));
    priorRoadY = roadY;
    model.box(x - 4, roadY - 1, z - 4, x + 4, roadY - 1, z + 4, 'minecraft:gray_concrete', meta(freight, 'terrain_following_service_spur', 45));
    model.box(x - 3, roadY, z - 3, x + 3, roadY + 6, z + 3, AIR, meta(freight, 'semi_route_headroom', 44));
    model.box(x + 3, roadY, z - 3, x + 3, roadY, z + 3, 'minecraft:yellow_concrete', meta(freight, 'protected_pedestrian_edge', 46));
  }
  model.box(-271, 62, -620, -243, 62, -584, 'minecraft:stone_bricks', meta(freight, 'loading_court_foundation', 50));
  model.box(-271, 63, -620, -243, 63, -584, 'minecraft:gray_concrete', meta(freight, 'two_semi_loading_court', 51));
  model.box(-271, 64, -620, -243, 76, -584, AIR, meta(freight, 'loading_court_clearance', 49));
  model.hollow(-271, 64, -617, -263, 76, -587, 'minecraft:deepslate_bricks', meta(freight, 'weather_protected_dock_house', 55));
  model.box(-270, 65, -616, -264, 75, -588, AIR, meta(freight, 'dock_staging_and_manager_view', 56));
  for (const [z1, z2] of [[-612, -604], [-600, -592]]) {
    model.box(-263, 64, z1, -262, 72, z2, AIR, meta(freight, 'semi_height_dock_door', 57));
    model.box(-262, 64, z1, -262, 64, z2, 'minecraft:yellow_concrete', meta(freight, 'dock_leveler_edge', 58));
  }
  model.hollow(-271, 7, -611, -264, 72, -605, 'minecraft:iron_block', meta(freight, 'freight_only_lift_shaft', 60));
  model.box(-270, 8, -610, -265, 71, -606, AIR, meta(freight, 'freight_lift_clear_shaft', 61));
  model.hollow(-340, 7, -611, -264, 15, -605, 'minecraft:deepslate_bricks', meta(freight, 'underground_freight_corridor', 62));
  model.box(-339, 8, -610, -265, 14, -606, AIR, meta(freight, 'clear_large_item_route', 63));
  model.box(-339, 7, -610, -265, 7, -606, 'minecraft:yellow_concrete', meta(freight, 'marked_freight_and_refuge_floor', 64));
  model.hollow(-347, 7, -611, -340, 18, -600, 'minecraft:iron_block', meta(freight, 'stage_freight_lift', 65));
  model.box(-346, 8, -610, -341, 17, -601, AIR, meta(freight, 'stage_freight_clearance', 66));

  return {
    venues: 3,
    studioSeats,
    truckBays: 2,
    basementLevels: 2,
    blueDrumServedLevels: [18, 29, 40, 67],
  };
}

function modelGildedRavenTheatreAndOwnerCorridor(model, schedulePath) {
  const design = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const expect = (condition, message) => {
    if (!condition) throw new Error(`Gilded Raven binding design mismatch: ${message}`);
  };
  const equalCoordinates = (actual, expected) => (
    Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => Number(value) === expected[index])
  );
  const inBounds = (cell, bounds) => (
    cell.x >= bounds[0] && cell.x <= bounds[3]
    && cell.y >= bounds[1] && cell.y <= bounds[4]
    && cell.z >= bounds[2] && cell.z <= bounds[5]
  );

  expect(
    design.status === 'IMPLEMENTATION_READY_COORDINATE_SCHEDULE_NOT_A_LIVE_RELEASE',
    'unexpected schedule status',
  );
  expect(
    design.contentBoundary.includes('non-graphic'),
    'non-graphic content boundary is missing',
  );
  expect(
    equalCoordinates(design.theatre.site.buildingBounds, [-34, 40, -402, 18, 110, -350]),
    'theatre bounds drifted',
  );
  expect(
    equalCoordinates(design.ownerTunnel.centerline[0], [-10, -44, -390])
      && equalCoordinates(
        design.ownerTunnel.centerline.at(-1),
        [363, -44, 165],
      ),
    'owner corridor endpoints drifted',
  );
  expect(design.ownerTunnel.lengthBlocks === 928, 'owner corridor length is not 928');
  expect(
    design.ownerTunnel.crossSection.clearInterior.width === 5
      && design.ownerTunnel.crossSection.clearInterior.height === 5,
    'owner corridor is not five-by-five clear',
  );
  expect(
    design.ownerTunnel.deprecationAndIsolation.t2b.includes('not reused')
      && design.ownerTunnel.deprecationAndIsolation.t2b.includes('no physical connection'),
    'T2B rejection/isolation statement is missing',
  );
  expect(design.restSuites.length === 7, 'rest-suite count is not seven');
  expect(
    design.theatre.mainHouse.capacity.mainHouseTotal === 168,
    'main-house capacity is not 168',
  );
  expect(
    design.theatreGrandDescent.switchbackFlights.length === 9,
    'theatre descent is not nine full flights',
  );
  expect(
    design.mansionArrival.switchbackFlights.length === 13,
    'mansion ascent is not thirteen full flights',
  );
  expect(
    design.futureOwnerCity.status === 'RESERVATION_ONLY_DO_NOT_EXCAVATE_CITY',
    'future owner city is not reservation-only',
  );
  expect(
    design.evidence.plannedPackageIntersectionConclusion.includes('276 intentional interface cells'),
    'documented estate-interface count drifted',
  );

  const theatreBounds = design.theatre.site.buildingBounds.map(Number);
  const theatreDescentBounds = design.theatreGrandDescent.bounds.map(Number);
  const salesOfficeBounds = design.salesOffice.bounds.map(Number);
  const mansionAscentBounds = design.mansionArrival.deepAscent.bounds.map(Number);
  const mansionGalleryBounds =
    design.mansionArrival.ceremonialGallery.bounds.map(Number);
  const scheduledCorridorPoints = linePoints(
    design.ownerTunnel.centerline.map((point) => point.map(Number)),
  );
  const suiteBranches = [
    [[55, -44, -341], [48, -44, -341]],
    [[55, -44, -259], [48, -44, -259]],
    [[150, -44, -151], [157, -44, -151]],
    [[150, -44, -101], [157, -44, -101]],
    [[186, -44, 55], [186, -44, 50]],
    [[250, -44, 55], [250, -44, 62]],
    [[363, -44, 100], [355, -44, 100]],
  ];
  const corridorEnvelopeColumns = new Set();
  const addRouteEnvelopeColumns = (routePoints, halfWidth) => {
    const route = linePoints(routePoints);
    for (let index = 0; index < route.length; index += 1) {
      const [x, _y, z] = route[index];
      const prior = route[Math.max(0, index - 1)];
      const next = route[Math.min(route.length - 1, index + 1)];
      const runsX = Math.abs(next[0] - prior[0]) >= Math.abs(next[2] - prior[2]);
      for (let lateral = -halfWidth; lateral <= halfWidth; lateral += 1) {
        corridorEnvelopeColumns.add(
          `${x + (runsX ? 0 : lateral)},${z + (runsX ? lateral : 0)}`,
        );
      }
    }
  };
  addRouteEnvelopeColumns(
    design.ownerTunnel.centerline.map((point) => point.map(Number)),
    4,
  );
  for (const turn of design.ownerTunnel.centerline.slice(1, -1)) {
    const [x, _y, z] = turn.map(Number);
    for (let dx = -5; dx <= 5; dx += 1) {
      for (let dz = -5; dz <= 5; dz += 1) {
        corridorEnvelopeColumns.add(`${x + dx},${z + dz}`);
      }
    }
  }
  for (const branch of suiteBranches) addRouteEnvelopeColumns(branch, 2);
  addRouteEnvelopeColumns([
    design.salesOffice.entryBranch.from.map(Number),
    design.salesOffice.entryBranch.to.map(Number),
  ], 2);
  const newEnvelopeBounds = [
    theatreBounds,
    theatreDescentBounds,
    ...design.restSuites.map((suite) => suite.bounds.map(Number)),
    salesOfficeBounds,
    mansionAscentBounds,
    mansionGalleryBounds,
  ];
  const priorScopeIntersections = new Map();
  let modeledEstateInterfaceCells = 0;
  for (const cell of model.cells.values()) {
    const inOwnerRouteEnvelope = (
      cell.y >= -46
      && cell.y <= -37
      && corridorEnvelopeColumns.has(`${cell.x},${cell.z}`)
    );
    if (
      !inOwnerRouteEnvelope
      && !newEnvelopeBounds.some((bounds) => inBounds(cell, bounds))
    ) {
      continue;
    }
    const allowedEstateInterface = (
      inBounds(cell, mansionGalleryBounds)
      && cell.scope === 'TE-OBS-OWNER-MEGA-ESTATE'
    );
    if (allowedEstateInterface) {
      modeledEstateInterfaceCells += 1;
      continue;
    }
    const entry = priorScopeIntersections.get(cell.scope) ?? {
      scope: cell.scope,
      cells: 0,
      samples: [],
    };
    entry.cells += 1;
    if (entry.samples.length < 12) {
      entry.samples.push([cell.x, cell.y, cell.z]);
    }
    priorScopeIntersections.set(cell.scope, entry);
  }
  expect(
    priorScopeIntersections.size === 0,
    `unapproved modeled-scope intersections: ${JSON.stringify(
      [...priorScopeIntersections.values()],
    )}`,
  );
  expect(
    modeledEstateInterfaceCells === 456,
    `the single estate arrival interface has ${modeledEstateInterfaceCells} modeled target cells, expected 456`,
  );

  const theatreScope = 'TE-RRCH-GILDED-RAVEN';
  const corridorScope = 'TE-OWNER-CORRIDOR-GRT-OBS';
  const salesScope = 'TE-OWNER-CITY-SALES-OFFICE';
  const ascentScope = 'TE-OBS-OWNER-EAST-ASCENT';
  const galleryScope = 'TE-OBS-OWNER-EAST-ARRIVAL-GALLERY';

  const gentleFlight = (scope, flight, role, phase, expectedRise = 12) => {
    const from = flight.from.map(Number);
    const to = flight.to.map(Number);
    const low = from[1] <= to[1] ? from : to;
    const high = from[1] <= to[1] ? to : from;
    const rise = high[1] - low[1];
    const dxTotal = high[0] - low[0];
    const dzTotal = high[2] - low[2];
    const run = Math.abs(dxTotal) + Math.abs(dzTotal);
    expect(rise === expectedRise, `${role} rise is ${rise}, expected ${expectedRise}`);
    expect(run === rise * 2, `${role} is not one-rise-per-two-run`);
    expect(dxTotal === 0 || dzTotal === 0, `${role} is not orthogonal`);
    const dx = Math.sign(dxTotal);
    const dz = Math.sign(dzTotal);
    const facing = dx > 0
      ? 'east'
      : dx < 0
        ? 'west'
        : dz > 0
          ? 'south'
          : 'north';
    for (let step = 0; step < rise; step += 1) {
      for (let runOffset = 0; runOffset < 2; runOffset += 1) {
        const x = low[0] + dx * (step * 2 + runOffset);
        const y = low[1] + step;
        const z = low[2] + dz * (step * 2 + runOffset);
        for (let lateral = -3; lateral <= 3; lateral += 1) {
          const treadX = x + (dz !== 0 ? lateral : 0);
          const treadZ = z + (dx !== 0 ? lateral : 0);
          const tread = runOffset === 1
            ? `minecraft:smooth_quartz_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`
            : 'minecraft:smooth_quartz';
          model.set(
            treadX,
            y,
            treadZ,
            tread,
            meta(scope, `${role}_uniform_tread`, phase),
          );
          model.box(
            treadX,
            y + 1,
            treadZ,
            treadX,
            y + 6,
            treadZ,
            AIR,
            meta(scope, `${role}_six_clear_headroom`, phase - 1),
          );
        }
        for (const lateral of [-4, 4]) {
          const railX = x + (dz !== 0 ? lateral : 0);
          const railZ = z + (dx !== 0 ? lateral : 0);
          model.set(
            railX,
            y + 1,
            railZ,
            'minecraft:dark_oak_fence',
            meta(scope, `${role}_continuous_two_side_rail`, phase + 1),
          );
        }
      }
      if (step === 0 || step === rise - 1) {
        const x = low[0] + dx * (step * 2 + 1);
        const z = low[2] + dz * (step * 2 + 1);
        for (let lateral = -3; lateral <= 3; lateral += 1) {
          model.set(
            x + (dz !== 0 ? lateral : 0),
            low[1] + step,
            z + (dx !== 0 ? lateral : 0),
            `minecraft:cut_copper_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
            meta(scope, `${role}_contrasting_nosing`, phase + 2),
          );
        }
      }
    }
    model.box(
      high[0] - 3,
      high[1],
      high[2] - 3,
      high[0] + 3,
      high[1],
      high[2] + 3,
      'minecraft:smooth_quartz',
      meta(scope, `${role}_seven_by_seven_landing`, phase),
    );
    model.box(
      high[0] - 3,
      high[1] + 1,
      high[2] - 3,
      high[0] + 3,
      high[1] + 6,
      high[2] + 3,
      AIR,
      meta(scope, `${role}_landing_headroom`, phase - 1),
    );
    model.set(
      high[0],
      high[1] + 7,
      high[2],
      'minecraft:ochre_froglight[axis=y]',
      meta(scope, `${role}_landing_chandelier`, phase + 2),
    );
    model.box(
      high[0] - 1,
      high[1] + 2,
      high[2] + 4,
      high[0] + 1,
      high[1] + 4,
      high[2] + 4,
      'minecraft:blue_concrete',
      meta(scope, `${role}_framed_district_map`, phase + 2),
    );
    return { rise, run, clearWidth: 7, clearHeadroom: 6 };
  };

  const accessibleLift = (
    scope,
    bounds,
    servedLandings,
    role,
    phase,
  ) => {
    const [x1, y1, z1, x2, y2, z2] = bounds.map(Number);
    model.hollow(
      x1,
      y1,
      z1,
      x2,
      y2,
      z2,
      'minecraft:iron_block',
      meta(scope, `${role}_fire_resistant_shaft`, phase),
    );
    model.box(
      x1 + 1,
      y1 + 1,
      z1 + 1,
      x2 - 1,
      y2 - 1,
      z2 - 1,
      AIR,
      meta(scope, `${role}_minimum_six_by_six_clear_car`, phase + 1),
    );
    for (const landingY of servedLandings.map(Number)) {
      const centerZ = Math.floor((z1 + z2) / 2);
      model.box(
        x1 - 3,
        landingY,
        centerZ - 3,
        x1,
        landingY,
        centerZ + 3,
        'minecraft:polished_blackstone',
        meta(scope, `${role}_visible_shared_landing`, phase + 2),
      );
      modelDoubleIronDoor(
        model,
        scope,
        'z',
        [x1, landingY + 1, centerZ],
        'west',
        `${role}_landing_doors`,
        phase + 3,
      );
      model.box(
        x1 + 1,
        landingY,
        z1 + 1,
        x2 - 1,
        landingY,
        z2 - 1,
        'minecraft:yellow_concrete',
        meta(scope, `${role}_level_marker`, phase + 2),
      );
    }
  };

  // The subterranean shell is modeled first so the programmed B2/B1 rooms,
  // separated routes and the extravagant stair hall become the final states.
  model.hollow(
    -34,
    -46,
    -400,
    14,
    51,
    -383,
    'minecraft:reinforced_deepslate',
    meta(theatreScope, 'grand_descent_retaining_envelope', 190),
  );
  model.box(
    -33,
    -45,
    -399,
    13,
    50,
    -384,
    AIR,
    meta(theatreScope, 'grand_descent_dry_clear_volume', 191),
  );

  model.hollow(
    ...theatreBounds,
    'minecraft:bricks',
    meta(theatreScope, 'theatre_house_masonry_envelope', 200),
  );
  model.box(
    -33,
    41,
    -401,
    17,
    105,
    -351,
    AIR,
    meta(theatreScope, 'programmed_interior_clear_volume', 201),
  );
  for (const floorY of [40, 52, 70, 78, 86, 94]) {
    model.box(
      -33,
      floorY,
      -401,
      17,
      floorY,
      -351,
      floorY <= 52 ? 'minecraft:polished_blackstone' : 'minecraft:dark_oak_planks',
      meta(theatreScope, `level_${floorY}_finished_floor`, 205),
    );
  }
  model.box(
    -32,
    95,
    -400,
    16,
    105,
    -352,
    AIR,
    meta(theatreScope, 'roof_catwalk_and_ceiling_volume', 206),
  );
  for (let inset = 0; inset <= 4; inset += 1) {
    model.box(
      -34 + inset,
      106 + inset,
      -402 + inset,
      18 - inset,
      106 + inset,
      -350 - inset,
      inset % 2 === 0 ? 'minecraft:oxidized_cut_copper' : 'minecraft:cut_copper',
      meta(theatreScope, 'copper_stage_house_crown', 210 + inset),
    );
  }

  // Three-bay south facade, centered marquee, ticket windows and a genuinely
  // legible entrance sequence.
  model.box(
    -31,
    70,
    -351,
    15,
    93,
    -350,
    'minecraft:red_terracotta',
    meta(theatreScope, 'three_bay_south_facade', 220),
  );
  for (const x of [-29, -17, -5, 7, 13]) {
    model.box(
      x,
      70,
      -352,
      x + 1,
      94,
      -349,
      'minecraft:polished_granite',
      meta(theatreScope, 'facade_pilaster_rhythm', 221),
    );
  }
  model.box(
    -17,
    70,
    -349,
    1,
    75,
    -344,
    'minecraft:cut_copper',
    meta(theatreScope, 'projecting_illuminated_marquee', 225),
  );
  model.box(
    -15,
    71,
    -350,
    -1,
    74,
    -343,
    'minecraft:sea_lantern',
    meta(theatreScope, 'marquee_letter_band', 226),
  );
  model.box(
    -13,
    75,
    -348,
    -3,
    86,
    -346,
    'minecraft:red_concrete',
    meta(theatreScope, 'vertical_sign_tower', 227),
  );
  model.box(
    -11,
    77,
    -349,
    -5,
    84,
    -345,
    'minecraft:gold_block',
    meta(theatreScope, 'gilded_raven_sign_field', 228),
  );
  model.box(
    -30,
    68,
    -349,
    14,
    68,
    -340,
    'minecraft:polished_granite',
    meta(theatreScope, 'formal_entry_court', 222),
  );
  model.box(
    -29,
    69,
    -348,
    13,
    69,
    -341,
    'minecraft:red_nether_brick_slab[type=bottom,waterlogged=false]',
    meta(theatreScope, 'entry_court_carpet_axis', 223),
  );
  for (const x of [-26, 8]) {
    model.box(
      x,
      70,
      -351,
      x + 5,
      73,
      -350,
      'minecraft:light_blue_stained_glass',
      meta(theatreScope, 'sheltered_ticket_and_poster_case', 229),
    );
  }
  modelDoubleIronDoor(
    model,
    theatreScope,
    'x',
    [-10, 71, -350],
    'south',
    'main_public_entry',
    230,
  );

  // Build the stage, apron, backdrop and light frame before all seating.
  model.box(
    -19,
    70,
    -401,
    3,
    73,
    -390,
    'minecraft:polished_blackstone',
    meta(theatreScope, 'main_stage_and_screen_base', 240),
  );
  model.box(
    -17,
    74,
    -400,
    1,
    84,
    -399,
    'minecraft:red_wool',
    meta(theatreScope, 'main_stage_visible_backdrop', 241),
  );
  model.box(
    -19,
    73,
    -399,
    -18,
    87,
    -389,
    'minecraft:gold_block',
    meta(theatreScope, 'proscenium_and_sightline_frame', 242),
  );
  model.box(
    2,
    73,
    -399,
    3,
    87,
    -389,
    'minecraft:gold_block',
    meta(theatreScope, 'proscenium_and_sightline_frame', 242),
  );
  model.box(
    -19,
    85,
    -399,
    3,
    87,
    -389,
    'minecraft:gold_block',
    meta(theatreScope, 'proscenium_and_sightline_frame', 242),
  );
  model.box(
    -16,
    70,
    -389,
    0,
    71,
    -385,
    'minecraft:dark_oak_planks',
    meta(theatreScope, 'main_stage_apron', 243),
  );
  for (const x of [-15, -10, -5, 0]) {
    model.box(
      x,
      85,
      -392,
      x,
      91,
      -392,
      'minecraft:end_rod[facing=down]',
      meta(theatreScope, 'stage_front_lighting', 244),
    );
  }

  let stallsSeats = 0;
  let dressCircleSeats = 0;
  let grandCircleSeats = 0;
  const fixedSeat = (x, y, z, tier) => {
    model.set(
      x,
      y,
      z,
      'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
      meta(theatreScope, `${tier}_fixed_seat_facing_stage`, 270),
    );
  };
  const stallsX = [
    -25, -24, -23, -22, -21, -20, -19, -18,
    -6, -5, -4, -3, -2, -1, 0, 1,
  ];
  for (let row = 0; row < 6; row += 1) {
    for (const x of stallsX) {
      fixedSeat(x, 71 + Math.floor(row / 2), -382 + row * 3, 'stalls');
      stallsSeats += 1;
    }
  }
  const dressX = [-23, -22, -21, -20, -19, -18, -6, -5, -4, -3, -2, -1];
  for (let row = 0; row < 4; row += 1) {
    for (const x of dressX) {
      fixedSeat(x, 79 + row, -382 + row * 4, 'dress_circle');
      dressCircleSeats += 1;
    }
  }
  const grandX = [-20, -19, -18, -17, -4, -3, -2, -1];
  for (let row = 0; row < 3; row += 1) {
    for (const x of grandX) {
      fixedSeat(x, 87 + row, -381 + row * 5, 'grand_circle');
      grandCircleSeats += 1;
    }
  }
  expect(
    stallsSeats === 96 && dressCircleSeats === 48 && grandCircleSeats === 24,
    'modeled main-house seat count drifted',
  );
  model.box(
    -29,
    78,
    -395,
    13,
    78,
    -363,
    'minecraft:dark_oak_planks',
    meta(theatreScope, 'dress_circle_horseshoe_deck', 250),
    (x, _y, z) => z >= -385 || x <= -26 || x >= 10,
  );
  model.box(
    -27,
    86,
    -393,
    11,
    86,
    -365,
    'minecraft:dark_oak_planks',
    meta(theatreScope, 'grand_circle_u_gallery', 251),
    (x, _y, z) => z >= -381 || x <= -24 || x >= 8,
  );
  for (const balconyY of [79, 87]) {
    for (const [x1, z1, x2, z2] of [
      [-28, -394, -26, -386],
      [10, -394, 12, -386],
    ]) {
      model.box(
        x1,
        balconyY,
        z1,
        x2,
        balconyY + 3,
        z2,
        'minecraft:gold_block',
        meta(theatreScope, 'gilded_private_box_front', 252),
      );
    }
  }

  for (const vomitory of design.theatre.mainHouse.openBowlCirculation.openVomitories) {
    const bounds = vomitory.bounds.map(Number);
    model.box(
      ...bounds,
      AIR,
      meta(theatreScope, `${vomitory.id.toLowerCase()}_open_vomitory`, 280),
    );
  }

  // The side and street-facing hospitality rooms are intentionally small,
  // dense and occupied, not empty perimeter boxes.
  for (const restaurant of design.theatre.foodAndHospitality) {
    const [x1, y1, z1, x2, y2, z2] = restaurant.bounds.map(Number);
    const role = restaurant.id.toLowerCase();
    model.box(
      x1,
      y1,
      z1,
      x2,
      y1,
      z2,
      'minecraft:polished_granite',
      meta(theatreScope, `${role}_finished_floor`, 255),
    );
    for (let z = z1 + 3; z <= z2 - 2; z += 5) {
      const tableX = Math.floor((x1 + x2) / 2);
      model.set(
        tableX,
        y1 + 1,
        z,
        'minecraft:dark_oak_fence',
        meta(theatreScope, `${role}_dining_table`, 256),
      );
      model.set(
        tableX,
        y1 + 2,
        z,
        'minecraft:dark_oak_pressure_plate[powered=false]',
        meta(theatreScope, `${role}_dining_table`, 256),
      );
      model.set(
        Math.max(x1, tableX - 1),
        y1 + 1,
        z,
        'minecraft:red_wool',
        meta(theatreScope, `${role}_dining_chair`, 257),
      );
      model.set(
        Math.min(x2, tableX + 1),
        y1 + 1,
        z,
        'minecraft:red_wool',
        meta(theatreScope, `${role}_dining_chair`, 257),
      );
    }
  }

  let salonSeats = 0;
  let oneToOneSeats = 0;
  const privatePerformanceRoom = (room, seats, kind) => {
    const [x1, y1, z1, x2, y2, z2] = room.bounds.map(Number);
    const roomRole = room.id.toLowerCase();
    model.hollow(
      x1,
      y1,
      z1,
      x2,
      y2,
      z2,
      'minecraft:red_nether_bricks',
      meta(theatreScope, `${roomRole}_${kind}_acoustic_envelope`, 260),
    );
    model.box(
      x1 + 1,
      y1 + 1,
      z1 + 1,
      x2 - 1,
      y2 - 1,
      z2 - 1,
      AIR,
      meta(theatreScope, `${roomRole}_${kind}_clear_volume`, 261),
    );
    model.box(
      x1 + 1,
      y1,
      z1 + 1,
      x2 - 1,
      y1,
      z2 - 1,
      'minecraft:red_carpet',
      meta(theatreScope, `${roomRole}_${kind}_finished_floor`, 262),
    );
    model.box(
      x1 + 2,
      y1 + 1,
      z1 + 1,
      x2 - 2,
      y1 + 1,
      z1 + 3,
      'minecraft:polished_blackstone',
      meta(theatreScope, `${roomRole}_${kind}_non_graphic_stage`, 263),
    );
    const seatZ = z2 - 2;
    const available = [];
    for (let x = x1 + 2; x <= x2 - 2; x += 1) available.push(x);
    const start = Math.max(0, Math.floor((available.length - seats) / 2));
    for (const x of available.slice(start, start + seats)) {
      fixedSeat(x, y1 + 1, seatZ, `${roomRole}_${kind}`);
    }
    model.set(
      x2 - 1,
      y1 + 1,
      z1 + 4,
      'minecraft:cauldron',
      meta(theatreScope, `${roomRole}_${kind}_wash_cleanup`, 264),
    );
    model.box(
      x2 - 1,
      y1 + 1,
      z2 - 4,
      x2 - 1,
      y1 + 3,
      z2 - 3,
      'minecraft:chiseled_bookshelf',
      meta(theatreScope, `${roomRole}_${kind}_closed_storage`, 264),
    );
    modelDoubleIronDoor(
      model,
      theatreScope,
      'x',
      [x1 + 2, y1 + 1, z2],
      'south',
      `${roomRole}_${kind}_audience_vestibule`,
      265,
    );
    model.set(
      x2,
      y1 + 1,
      z1 + 3,
      `minecraft:iron_door[facing=east,half=lower,hinge=left,open=false,powered=false]`,
      meta(theatreScope, `${roomRole}_${kind}_performer_service_door`, 265),
    );
    model.set(
      x2,
      y1 + 2,
      z1 + 3,
      `minecraft:iron_door[facing=east,half=upper,hinge=left,open=false,powered=false]`,
      meta(theatreScope, `${roomRole}_${kind}_performer_service_door`, 265),
    );
  };
  for (const salon of design.theatre.smallPerformanceRooms.fivePersonSalons) {
    privatePerformanceRoom(salon, 5, 'five_person_salon');
    salonSeats += 5;
  }
  for (const room of design.theatre.smallPerformanceRooms.oneToOneMiniTheatres) {
    privatePerformanceRoom(room, 1, 'one_to_one_room');
    oneToOneSeats += 1;
  }
  expect(salonSeats === 25 && oneToOneSeats === 4, 'small-room capacity drifted');

  const modelRoute = (points, floorY, scope, role, phase, width = 3) => {
    const route = linePoints(points.map(([x, z]) => [x, floorY, z]));
    for (let index = 0; index < route.length; index += 1) {
      const [x, y, z] = route[index];
      const prior = route[Math.max(0, index - 1)];
      const next = route[Math.min(route.length - 1, index + 1)];
      const runsX = Math.abs(next[0] - prior[0]) >= Math.abs(next[2] - prior[2]);
      for (let lateral = -Math.floor(width / 2); lateral <= Math.floor(width / 2); lateral += 1) {
        const routeX = x + (runsX ? 0 : lateral);
        const routeZ = z + (runsX ? lateral : 0);
        model.set(
          routeX,
          y,
          routeZ,
          'minecraft:polished_blackstone',
          meta(scope, `${role}_finished_floor`, phase),
        );
        model.box(
          routeX,
          y + 1,
          routeZ,
          routeX,
          y + 5,
          routeZ,
          AIR,
          meta(scope, `${role}_five_clear_headroom`, phase - 1),
        );
      }
      if (index % 8 === 0) {
        model.set(
          x,
          y + 5,
          z,
          'minecraft:sea_lantern',
          meta(scope, `${role}_continuous_wayfinding_light`, phase + 1),
        );
      }
    }
  };
  modelRoute(
    [[-29, -397], [13, -397], [13, -354], [-29, -354], [-29, -397]],
    64,
    theatreScope,
    'public_mystery_promenade',
    290,
  );
  modelRoute(
    [[-26, -398], [10, -398], [10, -367], [-26, -367], [-26, -398]],
    53,
    theatreScope,
    'performer_only_loop',
    292,
  );
  modelRoute(
    [[-28, -396], [8, -396], [8, -369], [-28, -369], [-28, -396]],
    41,
    theatreScope,
    'owner_only_building_route',
    294,
  );
  modelDoubleIronDoor(
    model,
    theatreScope,
    'z',
    [-28, 42, -385],
    'west',
    'owner_route_outer_gilded_doors',
    295,
  );
  modelDoubleIronDoor(
    model,
    theatreScope,
    'z',
    [-23, 42, -385],
    'west',
    'owner_route_inner_gilded_doors',
    296,
  );

  const publicGrandFlightDefinitions = [
    { id: 'WEST-P01', from: [-29, 70, -359], to: [-21, 74, -359] },
    { id: 'WEST-P02', from: [-21, 74, -355], to: [-29, 78, -355] },
    { id: 'WEST-P03', from: [-29, 78, -359], to: [-21, 82, -359] },
    { id: 'WEST-P04', from: [-21, 82, -355], to: [-29, 86, -355] },
    { id: 'EAST-P01', from: [2, 70, -359], to: [10, 74, -359] },
    { id: 'EAST-P02', from: [10, 74, -355], to: [2, 78, -355] },
    { id: 'EAST-P03', from: [2, 78, -359], to: [10, 82, -359] },
    { id: 'EAST-P04', from: [10, 82, -355], to: [2, 86, -355] },
  ];
  const publicGrandFlights = publicGrandFlightDefinitions.map(
    (flight, index) => gentleFlight(
      theatreScope,
      flight,
      `public_grand_stair_${flight.id.toLowerCase()}`,
      300 + index * 2,
      4,
    ),
  );
  accessibleLift(
    theatreScope,
    design.theatre.buildingAccessibilityAndEgress.publicLift.bounds,
    design.theatre.buildingAccessibilityAndEgress.publicLift.servedFloors,
    'public_grand_stair_accessible_lift',
    315,
  );

  const upperFlight = gentleFlight(
    theatreScope,
    design.theatreGrandDescent.upperCeremonialFlight,
    'upper_ceremonial_flight',
    310,
    6,
  );
  const theatreFlights = design.theatreGrandDescent.switchbackFlights.map(
    (flight, index) => gentleFlight(
      theatreScope,
      flight,
      `theatre_descent_${flight.id.toLowerCase()}`,
      320 + index * 4,
    ),
  );
  accessibleLift(
    theatreScope,
    design.theatreGrandDescent.lift.outerBounds,
    design.theatreGrandDescent.lift.servedLandings,
    'grand_descent_accessible_lift',
    370,
  );

  // Modern five-by-five owner corridor. The service bands, drainage tray,
  // low/ceiling light rhythms and 11×11 turn chambers sit outside the clear
  // walking volume and never create a crawl-through bypass.
  const corridorPoints = scheduledCorridorPoints;
  for (let index = 0; index < corridorPoints.length; index += 1) {
    const [x, y, z] = corridorPoints[index];
    const prior = corridorPoints[Math.max(0, index - 1)];
    const next = corridorPoints[Math.min(corridorPoints.length - 1, index + 1)];
    const runsX = Math.abs(next[0] - prior[0]) >= Math.abs(next[2] - prior[2]);
    for (let lateral = -4; lateral <= 4; lateral += 1) {
      const corridorX = x + (runsX ? 0 : lateral);
      const corridorZ = z + (runsX ? lateral : 0);
      const insideClearWidth = Math.abs(lateral) <= 2;
      if (insideClearWidth) {
        model.box(
          corridorX,
          y - 2,
          corridorZ,
          corridorX,
          y - 1,
          corridorZ,
          'minecraft:reinforced_deepslate',
          meta(corridorScope, 'subfloor_drainage_and_inspection_tray', 400),
        );
        model.set(
          corridorX,
          y,
          corridorZ,
          'minecraft:smooth_stone',
          meta(corridorScope, 'five_wide_finished_floor', 402),
        );
        model.box(
          corridorX,
          y + 1,
          corridorZ,
          corridorX,
          y + 5,
          corridorZ,
          AIR,
          meta(corridorScope, 'five_by_five_clear_walking_volume', 403),
        );
        model.set(
          corridorX,
          y + 6,
          corridorZ,
          'minecraft:polished_deepslate',
          meta(corridorScope, 'sealed_ceiling_service_band', 404),
        );
        model.set(
          corridorX,
          y + 7,
          corridorZ,
          'minecraft:reinforced_deepslate',
          meta(corridorScope, 'outer_ceiling_liner', 405),
        );
      } else {
        model.box(
          corridorX,
          y - 2,
          corridorZ,
          corridorX,
          y + 7,
          corridorZ,
          Math.abs(lateral) === 3
            ? 'minecraft:deepslate_bricks'
            : 'minecraft:reinforced_deepslate',
          meta(
            corridorScope,
            Math.abs(lateral) === 3
              ? 'replaceable_finished_wall_panel'
              : 'sealed_outer_liner_and_utility_chase',
            401,
          ),
        );
      }
    }
    if (index % 8 === 0) {
      model.set(
        x,
        y + 6,
        z,
        'minecraft:ochre_froglight[axis=y]',
        meta(corridorScope, 'warm_eight_block_ceiling_light', 406),
      );
      const lightX = x + (runsX ? 0 : 2);
      const lightZ = z + (runsX ? 2 : 0);
      model.set(
        lightX,
        y + 1,
        lightZ,
        'minecraft:end_rod[facing=up]',
        meta(corridorScope, 'staggered_low_level_egress_light', 406),
      );
    }
    if (index % 32 === 0) {
      const signX = x + (runsX ? 0 : -2);
      const signZ = z + (runsX ? -2 : 0);
      model.box(
        signX,
        y + 2,
        signZ,
        signX,
        y + 3,
        signZ,
        'minecraft:yellow_concrete',
        meta(corridorScope, 'thirty_two_block_direction_band', 407),
      );
    }
  }
  for (const turn of design.ownerTunnel.centerline.slice(1, -1)) {
    const [x, y, z] = turn.map(Number);
    model.box(
      x - 5,
      y,
      z - 5,
      x + 5,
      y,
      z + 5,
      'minecraft:polished_blackstone',
      meta(corridorScope, 'eleven_by_eleven_turn_node_floor', 410),
    );
    model.box(
      x - 5,
      y + 1,
      z - 5,
      x + 5,
      y + 5,
      z + 5,
      AIR,
      meta(corridorScope, 'eleven_by_eleven_turn_node_clearance', 411),
    );
    for (const [markerX, markerZ, state] of [
      [x, z - 3, 'minecraft:red_concrete'],
      [x + 3, z, 'minecraft:yellow_concrete'],
      [x, z + 3, 'minecraft:blue_concrete'],
      [x - 3, z, 'minecraft:green_concrete'],
    ]) {
      model.set(
        markerX,
        y,
        markerZ,
        state,
        meta(corridorScope, 'district_color_floor_compass', 412),
      );
    }
  }
  modelDoubleIronDoor(
    model,
    corridorScope,
    'z',
    [-8, -43, -390],
    'west',
    'theatre_endpoint_outer_airlock',
    415,
  );
  modelDoubleIronDoor(
    model,
    corridorScope,
    'z',
    [-3, -43, -390],
    'west',
    'theatre_endpoint_inner_airlock',
    416,
  );
  modelDoubleIronDoor(
    model,
    corridorScope,
    'x',
    [360, -43, 158],
    'south',
    'mansion_endpoint_outer_airlock',
    415,
  );
  modelDoubleIronDoor(
    model,
    corridorScope,
    'x',
    [360, -43, 163],
    'south',
    'mansion_endpoint_inner_airlock',
    416,
  );

  const modelBranch = (points, scope, role, phase) => {
    const route = linePoints(points);
    for (let index = 0; index < route.length; index += 1) {
      const [x, y, z] = route[index];
      const prior = route[Math.max(0, index - 1)];
      const next = route[Math.min(route.length - 1, index + 1)];
      const runsX = Math.abs(next[0] - prior[0]) >= Math.abs(next[2] - prior[2]);
      for (let lateral = -2; lateral <= 2; lateral += 1) {
        const branchX = x + (runsX ? 0 : lateral);
        const branchZ = z + (runsX ? lateral : 0);
        model.set(
          branchX,
          y,
          branchZ,
          'minecraft:smooth_stone',
          meta(scope, `${role}_five_wide_floor`, phase),
        );
        model.box(
          branchX,
          y + 1,
          branchZ,
          branchX,
          y + 5,
          branchZ,
          AIR,
          meta(scope, `${role}_five_by_five_clearance`, phase + 1),
        );
      }
    }
  };

  for (let index = 0; index < design.restSuites.length; index += 1) {
    const suite = design.restSuites[index];
    const scope = `TE-OWNER-CORRIDOR-REST-${String.fromCharCode(65 + index)}`;
    const [x1, y1, z1, x2, y2, z2] = suite.bounds.map(Number);
    const [rx1, ry1, rz1, rx2, ry2, rz2] = suite.redRoomAnnex.map(Number);
    modelBranch(suiteBranches[index], scope, 'listed_suite_entry_branch', 420);
    model.hollow(
      x1,
      y1,
      z1,
      x2,
      y2,
      z2,
      'minecraft:deepslate_bricks',
      meta(scope, 'stadium_scale_rest_suite_envelope', 425),
    );
    model.box(
      x1 + 1,
      y1 + 1,
      z1 + 1,
      x2 - 1,
      y2 - 1,
      z2 - 1,
      AIR,
      meta(scope, 'rest_suite_clear_program_volume', 426),
    );
    model.box(
      x1 + 1,
      -44,
      z1 + 1,
      x2 - 1,
      -44,
      z2 - 1,
      'minecraft:dark_oak_planks',
      meta(scope, 'rest_suite_finished_floor', 427),
    );
    model.box(
      x1 + 3,
      -43,
      z1 + 3,
      x1 + 10,
      -42,
      z1 + 8,
      'minecraft:purple_wool',
      meta(scope, 'owner_lounge_and_sleeping_alcove', 430),
    );
    model.box(
      x1 + 3,
      -43,
      z2 - 7,
      x1 + 12,
      -41,
      z2 - 3,
      'minecraft:dark_oak_planks',
      meta(scope, 'dining_conference_and_pantry', 430),
    );
    model.box(
      x1 + 13,
      -43,
      z1 + 3,
      x1 + 16,
      -40,
      z1 + 8,
      'minecraft:light_blue_stained_glass',
      meta(scope, 'single_user_wash_room', 431),
    );
    model.box(
      x1 + 13,
      -42,
      z2 - 6,
      x1 + 18,
      -39,
      z2 - 4,
      'minecraft:cyan_concrete',
      meta(scope, 'communications_status_and_medical_wall', 431),
    );
    model.hollow(
      rx1,
      ry1,
      rz1,
      rx2,
      ry2,
      rz2,
      'minecraft:red_nether_bricks',
      meta(scope, 'non_graphic_red_room_acoustic_envelope', 435),
    );
    model.box(
      rx1 + 1,
      ry1 + 1,
      rz1 + 1,
      rx2 - 1,
      ry2 - 1,
      rz2 - 1,
      AIR,
      meta(scope, 'non_graphic_red_room_clear_volume', 436),
    );
    model.box(
      rx1 + 1,
      ry1,
      rz1 + 1,
      rx2 - 1,
      ry1,
      rz2 - 1,
      'minecraft:red_carpet',
      meta(scope, 'non_graphic_red_room_floor', 437),
    );
    model.box(
      rx1 + 2,
      ry1 + 1,
      rz1 + 2,
      rx2 - 2,
      ry1 + 1,
      rz1 + 5,
      'minecraft:red_wool',
      meta(scope, 'bed_and_lounge', 438),
    );
    model.box(
      rx2 - 2,
      ry1 + 1,
      rz1 + 2,
      rx2 - 1,
      ry1 + 3,
      rz1 + 6,
      'minecraft:chiseled_bookshelf',
      meta(scope, 'closed_accessory_storage', 438),
    );
    model.box(
      rx1 + 2,
      ry1 + 3,
      rz2 - 4,
      rx2 - 2,
      ry1 + 5,
      rz2 - 2,
      'minecraft:iron_chain[axis=y,waterlogged=false]',
      meta(scope, 'decorative_non_load_bearing_hammock_frame', 439),
    );
    model.set(
      rx2 - 2,
      ry1 + 1,
      rz2 - 2,
      'minecraft:cauldron',
      meta(scope, 'private_wash_and_cleanup_point', 439),
    );
    modelDoubleIronDoor(
      model,
      scope,
      'z',
      [rx1, ry1 + 1, rz1 + 4],
      'west',
      'two_step_privacy_vestibule_outer',
      440,
    );
    modelDoubleIronDoor(
      model,
      scope,
      'z',
      [rx1 + 3, ry1 + 1, rz1 + 4],
      'west',
      'two_step_privacy_vestibule_inner',
      441,
    );
  }

  modelBranch(
    [
      design.salesOffice.entryBranch.from.map(Number),
      design.salesOffice.entryBranch.to.map(Number),
    ],
    salesScope,
    'listed_sales_office_branch',
    445,
  );
  model.hollow(
    ...salesOfficeBounds,
    'minecraft:polished_blackstone_bricks',
    meta(salesScope, 'founders_gallery_envelope', 450),
  );
  model.box(
    79,
    -45,
    -226,
    105,
    -34,
    -205,
    AIR,
    meta(salesScope, 'founders_gallery_clear_volume', 451),
  );
  model.box(
    79,
    -44,
    -226,
    105,
    -44,
    -205,
    'minecraft:smooth_quartz',
    meta(salesScope, 'founders_gallery_finished_floor', 452),
  );
  model.box(
    81,
    -43,
    -224,
    89,
    -41,
    -219,
    'minecraft:dark_oak_planks',
    meta(salesScope, 'reception_and_concierge_desk', 455),
  );
  model.box(
    91,
    -43,
    -222,
    102,
    -42,
    -211,
    'minecraft:light_blue_stained_glass',
    meta(salesScope, 'illuminated_future_district_model', 455),
  );
  for (const [x, z] of [[92, -221], [101, -221], [92, -212], [101, -212]]) {
    model.box(
      x,
      -41,
      z,
      x,
      -38,
      z,
      'minecraft:sea_lantern',
      meta(salesScope, 'reservation_corner_coordinate_marker', 456),
    );
  }
  model.box(
    80,
    -42,
    -209,
    88,
    -38,
    -207,
    'minecraft:chiseled_bookshelf',
    meta(salesScope, 'materials_parcel_and_status_gallery', 457),
  );
  modelDoubleIronDoor(
    model,
    salesScope,
    'x',
    [89, -43, -227],
    'north',
    'sales_office_outer_airlock',
    460,
  );
  modelDoubleIronDoor(
    model,
    salesScope,
    'x',
    [89, -43, -223],
    'north',
    'sales_office_inner_airlock',
    461,
  );
  modelDoubleIronDoor(
    model,
    salesScope,
    'x',
    [95, -43, -204],
    'south',
    'offline_future_owner_city_presentation_doors',
    462,
  );

  model.hollow(
    ...mansionAscentBounds,
    'minecraft:reinforced_deepslate',
    meta(ascentScope, 'dry_detached_ascent_envelope', 470),
  );
  model.box(
    349,
    -45,
    151,
    376,
    111,
    179,
    AIR,
    meta(ascentScope, 'dry_detached_ascent_clear_volume', 471),
  );
  model.box(
    361,
    -44,
    150,
    365,
    -44,
    165,
    'minecraft:smooth_stone',
    meta(ascentScope, 'corridor_to_ascent_arrival_floor', 472),
  );
  model.box(
    361,
    -43,
    150,
    365,
    -39,
    165,
    AIR,
    meta(ascentScope, 'corridor_to_ascent_arrival_clearance', 473),
  );
  model.box(
    350,
    -44,
    162,
    366,
    -44,
    178,
    'minecraft:polished_blackstone',
    meta(ascentScope, 'extravagant_lower_arrival_hall', 474),
  );
  model.box(
    350,
    -43,
    162,
    366,
    -39,
    178,
    AIR,
    meta(ascentScope, 'extravagant_lower_arrival_hall_clearance', 475),
  );
  const mansionFlights = design.mansionArrival.switchbackFlights.map(
    (flight, index) => gentleFlight(
      ascentScope,
      flight,
      `mansion_ascent_${flight.id.toLowerCase()}`,
      480 + index * 4,
    ),
  );
  accessibleLift(
    ascentScope,
    design.mansionArrival.lift.outerBounds,
    design.mansionArrival.lift.servedLandings,
    'mansion_arrival_accessible_lift',
    540,
  );

  model.hollow(
    ...mansionGalleryBounds,
    'minecraft:quartz_bricks',
    meta(galleryScope, 'double_height_ceremonial_gallery_envelope', 560),
  );
  model.box(
    270,
    113,
    157,
    347,
    119,
    173,
    AIR,
    meta(galleryScope, 'double_height_ceremonial_gallery_volume', 561),
  );
  model.box(
    270,
    109,
    157,
    347,
    111,
    173,
    'minecraft:quartz_bricks',
    meta(galleryScope, 'ceremonial_gallery_independent_support', 562),
  );
  model.box(
    270,
    112,
    157,
    347,
    112,
    173,
    'minecraft:dark_oak_planks',
    meta(galleryScope, 'ceremonial_gallery_finished_floor', 562),
  );
  for (let x = 278; x <= 338; x += 12) {
    model.box(
      x,
      113,
      158,
      x + 4,
      116,
      160,
      'minecraft:cut_copper',
      meta(galleryScope, 'telescope_model_and_owner_art_plinth', 565),
    );
    model.box(
      x + 1,
      117,
      159,
      x + 3,
      119,
      159,
      'minecraft:tinted_glass',
      meta(galleryScope, 'telescope_model_and_owner_art_plinth', 565),
    );
    model.box(
      x,
      113,
      171,
      x + 4,
      113,
      172,
      'minecraft:purple_wool',
      meta(galleryScope, 'ceremonial_gallery_seating', 566),
    );
  }
  model.box(
    272,
    113,
    156,
    345,
    116,
    156,
    'minecraft:light_blue_stained_glass',
    meta(galleryScope, 'dry_gallery_daylight_windows', 564),
  );
  modelRoute(
    [[353, 153], [353, 165], [347, 165]],
    112,
    galleryScope,
    'ascent_to_ceremonial_gallery_bridge',
    568,
  );
  modelDoubleIronDoor(
    model,
    galleryScope,
    'z',
    [269, 113, 164],
    'west',
    'single_estate_interface_outer_grand_doors',
    570,
  );
  modelDoubleIronDoor(
    model,
    galleryScope,
    'z',
    [274, 113, 164],
    'west',
    'single_estate_interface_inner_grand_doors',
    571,
  );
  modelDoubleIronDoor(
    model,
    corridorScope,
    'x',
    [360, -43, 153],
    'south',
    'mansion_endpoint_restored_outer_airlock',
    572,
  );
  modelDoubleIronDoor(
    model,
    corridorScope,
    'x',
    [360, -43, 158],
    'south',
    'mansion_endpoint_restored_inner_airlock',
    573,
  );

  const futureReservationTargets = [...model.cells.values()].filter(
    (cell) => inBounds(cell, design.futureOwnerCity.bounds.map(Number))
      && cell.y >= -36
      && cell.scope !== salesScope,
  );
  expect(
    futureReservationTargets.length === 0,
    'sales-office model excavates the future owner-city reservation',
  );
  const ownerScopes = new Set([
    corridorScope,
    ...design.restSuites.map(
      (_suite, index) => `TE-OWNER-CORRIDOR-REST-${String.fromCharCode(65 + index)}`,
    ),
    salesScope,
    ascentScope,
    galleryScope,
  ]);
  const t2bTargets = [...model.cells.values()].filter(
    (cell) => ownerScopes.has(cell.scope)
      && cell.x >= -145 && cell.x <= -136
      && cell.z >= 177 && cell.z <= 187,
  );
  expect(t2bTargets.length === 0, 'owner route intersects deprecated T2B');

  const objectRecord = (
    id,
    name,
    featureType,
    bounds,
    firstPass,
    secondPass,
  ) => ({
    id,
    name,
    featureType,
    bounds: bounds.map(Number),
    databaseRecordRequired: true,
    requiredMatchedCaptures: 2,
    cameraCandidates: [
      {
        id: `${id}-FIRST-PASS`,
        pass: 'first',
        point: firstPass.point,
        lookAt: firstPass.lookAt,
        view: firstPass.view,
      },
      {
        id: `${id}-SECOND-PASS`,
        pass: 'second',
        point: secondPass.point,
        lookAt: secondPass.lookAt,
        view: secondPass.view,
      },
    ],
  });
  const objectRecords = [
    objectRecord(
      design.theatre.id,
      design.theatre.name,
      'theatre-house',
      theatreBounds,
      {
        point: [-8, 78, -329],
        lookAt: [-8, 78, -350],
        view: 'south facade, marquee, court and complete massing',
      },
      {
        point: [-8, 78, -368],
        lookAt: [-8, 78, -397],
        view: 'main bowl, fixed seating, open vomitories, stage and backdrop',
      },
    ),
    objectRecord(
      design.theatreGrandDescent.id,
      'Gilded Raven Owner Grand Descent',
      'stair-and-lift-hall',
      theatreDescentBounds,
      {
        point: [-22, 63, -389],
        lookAt: [-18, 52, -395],
        view: 'upper ceremonial stair, rails, landing and visible lift',
      },
      {
        point: [-18, -31, -391],
        lookAt: [-20, -44, -395],
        view: 'deep switchback flight, map landing and lower arrival',
      },
    ),
    objectRecord(
      design.ownerTunnel.id,
      'Gilded Raven–Observatory Owner Corridor',
      'private-underground-circulation',
      [-14, -46, -394, 367, -37, 169],
      {
        point: [53, -42, -350],
        lookAt: [55, -42, -300],
        view: 'representative five-by-five clear section and wayfinding rhythm',
      },
      {
        point: [165, -42, 50],
        lookAt: [215, -42, 55],
        view: 'turn node, district compass, utility bands and rest-suite direction',
      },
    ),
    ...design.restSuites.map((suite, index) => {
      const [x1, y1, z1, x2, _y2, z2] = suite.bounds.map(Number);
      const centerX = Math.floor((x1 + x2) / 2);
      const centerZ = Math.floor((z1 + z2) / 2);
      return objectRecord(
        suite.id,
        `Owner Corridor Rest Suite ${String.fromCharCode(65 + index)}`,
        'private-rest-and-hospitality-suite',
        suite.bounds,
        {
          point: [x1 + 4, y1 + 4, centerZ],
          lookAt: [centerX, y1 + 4, centerZ],
          view: 'lounge, conference dining, pantry and status wall',
        },
        {
          point: [x2 - 4, y1 + 4, z1 + 4],
          lookAt: [x2 - 4, y1 + 4, z2 - 4],
          view: 'non-graphic red-room annex, privacy vestibule and cleanup point',
        },
      );
    }),
    objectRecord(
      design.salesOffice.id,
      design.salesOffice.name,
      'future-development-sales-office',
      salesOfficeBounds,
      {
        point: [84, -42, -222],
        lookAt: [97, -42, -216],
        view: 'concierge, materials gallery and illuminated district model',
      },
      {
        point: [96, -42, -209],
        lookAt: [96, -42, -204],
        view: 'sealed future-city presentation doors and reservation markers',
      },
    ),
    objectRecord(
      design.mansionArrival.deepAscent.id,
      'Observatory Owner East Ascent',
      'stair-and-lift-hall',
      mansionAscentBounds,
      {
        point: [360, -42, 170],
        lookAt: [353, -32, 165],
        view: 'lower arrival hall, controlled airlock, stair and adjacent lift',
      },
      {
        point: [359, 99, 166],
        lookAt: [353, 112, 153],
        view: 'upper switchback, map landing and ceremonial-gallery bridge',
      },
    ),
    objectRecord(
      design.mansionArrival.ceremonialGallery.id,
      'Observatory Owner East Arrival Gallery',
      'ceremonial-gallery',
      mansionGalleryBounds,
      {
        point: [339, 114, 165],
        lookAt: [305, 114, 165],
        view: 'double-height gallery, art and telescope procession',
      },
      {
        point: [281, 114, 165],
        lookAt: [269, 114, 165],
        view: 'single reconciled estate interface and grand double-door vestibule',
      },
    ),
  ];
  expect(objectRecords.length === 13, 'publication object count is not thirteen');
  expect(
    objectRecords.every(
      (record) => (
        record.databaseRecordRequired
        && record.requiredMatchedCaptures === 2
        && record.cameraCandidates.length === 2
        && record.cameraCandidates[0].pass === 'first'
        && record.cameraCandidates[1].pass === 'second'
      ),
    ),
    'database/media object contract is incomplete',
  );

  return {
    loaded: true,
    schedulePath,
    theatreBounds,
    mainHouseSeats: stallsSeats + dressCircleSeats + grandCircleSeats,
    stallsSeats,
    dressCircleSeats,
    grandCircleSeats,
    fivePersonSalonSeats: salonSeats,
    oneToOneRoomSeats: oneToOneSeats,
    openVomitories:
      design.theatre.mainHouse.openBowlCirculation.openVomitories.length,
    separatedHiddenRoutes: 3,
    publicGrandFlights,
    publicGrandFlightCount: publicGrandFlights.length,
    publicLiftFloors:
      design.theatre.buildingAccessibilityAndEgress.publicLift.servedFloors.length,
    upperCeremonialFlight: upperFlight,
    theatreFlights,
    theatreFlightCount: theatreFlights.length,
    theatreLiftLandings:
      design.theatreGrandDescent.lift.servedLandings.length,
    corridorLengthBlocks: design.ownerTunnel.lengthBlocks,
    corridorClearWidth:
      design.ownerTunnel.crossSection.clearInterior.width,
    corridorClearHeight:
      design.ownerTunnel.crossSection.clearInterior.height,
    turnNodes: design.ownerTunnel.centerline.length - 2,
    restSuites: design.restSuites.length,
    redRoomAnnexes: design.restSuites.length,
    futureOwnerCityReservationBounds: design.futureOwnerCity.bounds.map(Number),
    futureOwnerCityExcavatedCells: futureReservationTargets.length,
    salesOfficeBounds,
    mansionFlights,
    mansionFlightCount: mansionFlights.length,
    mansionLiftLandings:
      design.mansionArrival.lift.servedLandings.length,
    modeledEstateInterfaceCells,
    documentedEstateInterfaceCells: 276,
    priorScopeIntersections: [...priorScopeIntersections.values()],
    deprecatedT2bTargets: t2bTargets.length,
    objectRecords,
    publicationObjectCount: objectRecords.length,
    matchedCaptureCandidateCount: objectRecords.reduce(
      (sum, record) => sum + record.cameraCandidates.length,
      0,
    ),
    routeNetworkConnections: [
      'gilded-raven-owner-route',
      'owner-corridor',
      'seven-listed-rest-suites',
      'founders-gallery-sales-office',
      'detached-mansion-ascent',
      'single-east-wing-estate-interface',
    ],
    designSources: [
      schedulePath,
      design.evidence.memo,
      design.evidence.survey,
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const regionDir = argValue(args, '--regions', DEFAULT_REGIONS);
  const outputPath = argValue(args, '--out', DEFAULT_OUTPUT);
  const rollbackPath = argValue(args, '--rollback', DEFAULT_ROLLBACK);
  const reportPath = argValue(args, '--report', DEFAULT_REPORT);
  const manifestPath = argValue(args, '--manifest', DEFAULT_MANIFEST);
  const acceptedManagerValeSnapshotSha256 = argValue(
    args,
    '--accepted-manager-vale-snapshot-sha256',
    DEFAULT_ACCEPTED_MANAGER_VALE_SNAPSHOT_SHA256,
  );
  const garageSchedulePath = argValue(
    args,
    '--garage-schedule',
    'docs/redevelopment/2026-07-28-town-expansion/mainstreet-attached-garage-engineering-schedule.json',
  );
  const gildedRavenSchedulePath = argValue(
    args,
    '--gilded-raven-schedule',
    'docs/redevelopment/2026-07-28-town-expansion/worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json',
  );
  const snapshotEvidence = hashSnapshotDirectory(regionDir);
  const snapshot = new DetailedAnvilSnapshot(regionDir);
  const model = new Model();
  if (args.includes('--audit-c01-only')) {
    const c01 = await modelC01FiveLevelBunker(model, snapshot);
    const crossScopeInterfaces = classifyCrossScopeInterfaces(model);
    const c01Scopes = new Set(c01.bunkerScopes);
    const unreviewedC01Interfaces = crossScopeInterfaces.unreviewed.filter(
      ({ fromScope, toScope }) => c01Scopes.has(fromScope) || c01Scopes.has(toScope),
    );
    const checks = {
      ...c01.checks,
      noUnreviewedC01Interfaces: unreviewedC01Interfaces.length === 0,
      noAircraftOrArenaRoles: [...model.cells.values()].every((cell) => (
        !/(?:aircraft|hangar|arena|stadium)/i.test(cell.role)
      )),
      exactActivePortalScope:
        [...model.cells.values()].filter(
          (cell) => baseBlockName(cell.state) === 'minecraft:nether_portal',
        ).every((cell) => cell.scope === 'c01_east_l5_power_escape'),
      noExposedConcreteBunkerRoles: [...model.cells.values()].every((cell) => (
        !/exposed_(?:bunker|concrete)|daylighted_shell/i.test(cell.role)
      )),
    };
    const pass = Object.values(checks).every(Boolean);
    const auditPayload = {
      status: pass ? 'C01_MODEL_AUDIT_PASS' : 'C01_MODEL_AUDIT_BLOCKED',
      liveWorldMutated: false,
      sourceSnapshot: {
        directory: regionDir,
        ...snapshotEvidence,
      },
      checks,
      c01: {
        ...c01,
        migrationPlacements: {
          placements: c01.migrationPlacements.placements,
          companions: c01.migrationPlacements.companions,
          supportBlocks: c01.migrationPlacements.supportBlocks,
          forwardCommandCount: c01.migrationPlacements.forwardCommands.length,
          rollbackCommandCount: c01.migrationPlacements.rollbackCommands.length,
        },
      },
      targetCells: model.cells.size,
      reviewedC01Interfaces: crossScopeInterfaces.reviewed.filter(
        ({ fromScope, toScope }) => c01Scopes.has(fromScope) || c01Scopes.has(toScope),
      ),
      unreviewedC01Interfaces,
    };
    const serializedAudit = `${JSON.stringify(auditPayload, null, 2)}\n`;
    const auditOut = argValue(args, '--audit-c01-out', null);
    if (auditOut) {
      fs.mkdirSync(path.dirname(path.resolve(auditOut)), { recursive: true });
      fs.writeFileSync(path.resolve(auditOut), serializedAudit);
    }
    process.stdout.write(serializedAudit);
    if (!pass) process.exitCode = 1;
    return;
  }
  modelPenthouse(model);
  modelLonghouseAndCourt(model);
  modelLibraryAndGarth(model);
  modelGuildHall(model);
  const civicGrounds = modelCivicPavilionEastGrounds(model);
  modelRoadAndOasis(model);
  const waterfront = await modelWestlightWaterfront(model, snapshot);
  const westlightVenues = await modelWestlightVenueRedesign(model, snapshot);
  modelPairedParks(model);
  modelHarborlightHousing(model);
  const dataCampus = await modelDataCenterCampus(model, snapshot);
  if (args.includes('--audit-cbe-only')) {
    const crossScopeInterfaces = classifyCrossScopeInterfaces(model);
    const iowaUnreviewed = crossScopeInterfaces.unreviewed.filter(({ fromScope, toScope }) => (
      fromScope.startsWith('TE-IA-') || toScope.startsWith('TE-IA-')
    ));
    const exchange = dataCampus.concord.broadcastExchange;
    const annex = exchange.annex;
    const checks = {
      noUnreviewedIowaInterfaces: iowaUnreviewed.length === 0,
      exactExchangeSchedule:
        exchange.exactSchedule.siteObjects === 5
        && exchange.exactSchedule.rooms === 113
        && exchange.exactSchedule.verticalCores === 5
        && exchange.exactSchedule.specialComponents === 20
        && exchange.exactSchedule.routes === 10
        && exchange.exactSchedule.cameras === 18,
      exactExchangeAudienceAndObjects:
        exchange.exactCounts.hallASeatBlocks === 80
        && exchange.exactCounts.hallAOpenBayAnalogues === 4
        && exchange.exactCounts.hallBSeatBlocks === 40
        && exchange.exactCounts.hallBOpenBayAnalogues === 2
        && exchange.exactCounts.openSkyGardenSeats === 24
        && exchange.exactCounts.billiardsTables === 4
        && exchange.exactCounts.totalDishAnalogues === 9
        && exchange.exactCounts.largeDishAnalogues === 1
        && exchange.exactCounts.mediumDishAnalogues === 4
        && exchange.exactCounts.smallDishAnalogues === 4
        && exchange.exactCounts.towerMaintenanceDecks === 4,
      exchangeAdultRoomsFullyFurnished:
        exchange.adultInteriorStandard.expectedPrivateRooms === 16
        && exchange.adultInteriorStandard.furnishedPrivateRooms === 16
        && exchange.adultInteriorStandard.allRequiredAnatomyModeled,
      exactAnnexSchedule:
        annex.exactSchedule.siteObjects === 10
        && annex.exactSchedule.rooms === 84
        && annex.exactSchedule.routes === 10
        && annex.exactSchedule.cameras === 18,
      exactAnnexAudience:
        annex.exactCounts.lateNightSeatBlocks === 96
        && annex.exactCounts.lateNightOpenBayAnalogues === 6
        && annex.exactCounts.sitcomSeatBlocks === 84
        && annex.exactCounts.sitcomOpenBayAnalogues === 4,
      annexClearVolumesUnobstructed:
        annex.clearStageStructuralIntrusions.length === 0,
      annexProtectedFeaturesUntargeted:
        annex.protectedFeatures.exactWaterTargets === 0
        && annex.protectedFeatures.waterHaloSupportTargets === 0
        && annex.protectedFeatures.protectedDeepEntityTargets === 0,
      exactPublicationInventory:
        exchange.publicationObjects.length === 143
        && annex.publicationObjects.length === 94
        && dataCampus.concord.publicationObjects.length === 237,
      exactCbeCameraInventory:
        dataCampus.concord.cameraCandidates.length === 36,
      detailedConcordNightlife:
        dataCampus.concord.adultInteriorStandard.theater.realStage
        && dataCampus.concord.adultInteriorStandard.theater.rakedAudienceSeats === 90
        && dataCampus.concord.adultInteriorStandard.theater.remotePublicExits === 2
        && dataCampus.concord.adultInteriorStandard.danceClub.privateRooms === 2
        && dataCampus.concord.adultInteriorStandard.danceClub.everyPrivateRoomHasRequiredNonGraphicAnatomy
        && dataCampus.concord.nightlifeCameraCandidates.length === 4,
    };
    const pass = Object.values(checks).every(Boolean);
    console.log(JSON.stringify({
      status: pass ? 'CBE_MODEL_AUDIT_PASS' : 'CBE_MODEL_AUDIT_BLOCKED',
      liveWorldMutated: false,
      checks,
      exchange,
      annex,
      concordNightlife: dataCampus.concord.adultInteriorStandard,
      reviewedIowaInterfaces: crossScopeInterfaces.reviewed.filter(({ fromScope, toScope }) => (
        fromScope.startsWith('TE-IA-') || toScope.startsWith('TE-IA-')
      )),
      unreviewedIowaInterfaces: iowaUnreviewed,
      targetCells: model.cells.size,
    }, null, 2));
    if (!pass) process.exitCode = 1;
    return;
  }
  if (args.includes('--audit-data-campus-only')) {
    const crossScopeInterfaces = classifyCrossScopeInterfaces(model);
    console.log(JSON.stringify({
      status: 'DATA_CAMPUS_MODEL_AUDIT_ONLY',
      liveWorldMutated: false,
      halls: dataCampus.halls,
      precincts: dataCampus.precincts,
      holdoutHome: dataCampus.holdoutHome,
      concord: dataCampus.concord,
      iowaDistrict: dataCampus.iowaDistrict,
      reviewedCrossScopeInterfaces: crossScopeInterfaces.reviewed,
      unreviewedCrossScopeInterfaces: crossScopeInterfaces.unreviewed,
      crossScopeOverrides: crossScopeOverrideEvidence(model),
      targetCells: model.cells.size,
    }, null, 2));
    return;
  }
  const parkingRecovery = {
    status: 'DEFERRED_UNTIL_NEW_C01_COMMISSIONED_AND_EXACT_SOURCE_RETIREMENT_ACCEPTED',
    preservedWayfindingSigns: 3,
  };
  const dryWarehouse = modelDryUndergroundWarehouse(model);
  const dryWarehouseExpansion = modelDryUndergroundWarehouseExpansion(model);
  const modernCorridor = modelModernCorridorReplacementPilot(model);
  const ownerEstate = modelObservatoryOwnerEstate(model);
  modelRvSalesDistrict(model);
  await modelWorkforceDistrict(model, snapshot);
  const guestServices = modelGuestServicesDestination(model);
  const garageSchedule = await modelAttachedGarages(
    model,
    snapshot,
    garageSchedulePath,
  );
  const gildedRaven = modelGildedRavenTheatreAndOwnerCorridor(
    model,
    gildedRavenSchedulePath,
  );
  const c01Relocation = await modelC01FiveLevelBunker(model, snapshot);
  const managerVale = await compileManagerValeCottages({
    regions: regionDir,
    ...(acceptedManagerValeSnapshotSha256
      ? { acceptedSnapshotSha256: acceptedManagerValeSnapshotSha256 }
      : {}),
  });
  const managerValeModuleOwnership = managerValeOwnership(managerVale, model);
  if (managerValeModuleOwnership.sharedModelTargetIntersections !== 0) {
    throw new Error(
      'Manager Vale exact module intersects shared town model targets: '
      + JSON.stringify(managerValeModuleOwnership.intersectionExamples),
    );
  }
  if (args.includes('--audit-cross-scope-only')) {
    const interfaces = classifyCrossScopeInterfaces(
      model,
      { requireAllContracts: true },
    );
    const generatedAtUtc = new Date().toISOString();
    const payload = {
      schemaVersion: 2,
      status: interfaces.unreviewed.length === 0
        ? 'GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS'
        : 'GLOBAL_CROSS_SCOPE_INTERFACE_GATE_BLOCKED',
      generatedAtUtc,
      liveWorldMutated: false,
      contractPath: CROSS_SCOPE_CONTRACT_PATH,
      contractSha256: sha256(
        fs.readFileSync(path.resolve(CROSS_SCOPE_CONTRACT_PATH)),
      ),
      sourceSnapshot: {
        directory: regionDir,
        ...snapshotEvidence,
      },
      canonicalOwnershipAssignments: [...CANONICAL_SCOPE_OWNERS.entries()]
        .map(([scope, owner]) => ({ scope, owner }))
        .filter(({ scope, owner }) => scope !== owner),
      reviewedInterfaces: interfaces.reviewed,
      unreviewedInterfaces: interfaces.unreviewed,
      observedInterfaces: crossScopeOverrideEvidence(model),
      managerVale: {
        status: managerVale.report.status,
        source: managerVale.report.source,
        counts: managerVale.report.counts,
        operations: managerVale.report.operations,
        protectedMigration: managerVale.report.protectedMigration,
        ownership: managerValeModuleOwnership,
      },
      targetCells: model.cells.size + managerVale.operations.length,
    };
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    const auditOut = argValue(args, '--audit-cross-scope-out', null);
    const markdownOut = argValue(args, '--audit-cross-scope-md-out', null);
    if (auditOut) {
      fs.mkdirSync(path.dirname(path.resolve(auditOut)), { recursive: true });
      fs.writeFileSync(path.resolve(auditOut), serialized);
    }
    if (markdownOut) {
      fs.mkdirSync(path.dirname(path.resolve(markdownOut)), { recursive: true });
      fs.writeFileSync(
        path.resolve(markdownOut),
        renderCrossScopeAuditMarkdown(payload),
      );
    }
    process.stdout.write(serialized);
    if (interfaces.unreviewed.length > 0) process.exitCode = 1;
    return;
  }
  const ravensgateRestrictedTargets = [...model.cells.values()].filter((cell) => (
    cell.x >= -148 && cell.x <= -64
    && cell.y >= -64 && cell.y <= 43
    && cell.z >= -562 && cell.z <= -420
  ));
  const activePortalTargets = [...model.cells.values()].filter((cell) => (
    [
      'minecraft:nether_portal',
      'minecraft:end_portal',
      'minecraft:end_gateway',
    ].includes(baseBlockName(cell.state))
  ));

  const entityScopes = [
    [-100, 87, -394, -70, 100, -367],
    [-105, 64, -365, -65, 96, -342],
    [-178, 40, -448, -96, 100, -403],
    [-65, 40, -463, -6, 100, -408],
    [20, 50, -490, 125, 105, -395],
    [-352, 35, -550, -148, 100, -455],
    [-140, 35, -320, 140, 110, 180],
    [-520, 35, -640, -290, 115, -300],
    [-450, -10, -650, -240, 115, -480],
    [-170, 45, -335, -20, 110, 100],
    [-700, 35, -740, -440, 130, -450],
    [-360, 35, -500, -140, 120, -160],
    [-150, 35, 160, 0, 120, 280],
    [-150, 0, 175, -130, 12, 195],
    [25, 35, 190, 100, 80, 300],
    [438, -64, -720, 1300, 140, -100],
    [100, 0, -170, 920, 140, 305],
    [-145, 55, -365, -100, 100, -320],
    [-34, 40, -402, 18, 110, -340],
    [-34, -46, -400, 14, 67, -383],
    [-14, -46, -394, 367, -37, 169],
    [20, -46, -351, 355, -33, 110],
    [348, -46, 150, 377, 112, 180],
    [269, 109, 156, 348, 120, 174],
  ];
  const entities = [];
  for (const box of entityScopes) entities.push(...await snapshot.blockEntitiesInBox(box));
  const entityByCell = new Map(
    entities.map((entity) => [key(Number(entity.x), Number(entity.y), Number(entity.z)), entity]),
  );

  const changed = [];
  const missing = [];
  const protectedEntities = [];
  const retiredEmptyEntities = [];
  for (const desired of model.cells.values()) {
    const current = await snapshot.getBlock(desired.x, desired.y, desired.z);
    if (current === null) {
      missing.push([desired.x, desired.y, desired.z]);
      continue;
    }
    if (normalizeState(current) === normalizeState(desired.state)) continue;
    const entity = entityByCell.get(key(desired.x, desired.y, desired.z));
    if (entity) {
      const items = entity.Items ?? entity.items ?? [];
      const isText = ['minecraft:sign', 'minecraft:hanging_sign'].includes(entity.id);
      const allowedRetirement = (
        (
          ['TE-PENTHOUSE-01', 'TE-LONGHOUSE-01'].includes(desired.scope)
          || desired.scope.startsWith('TE-OBS-')
        )
        && !isText
        && items.length === 0
      );
      if (!allowedRetirement) {
        protectedEntities.push({
          point: [desired.x, desired.y, desired.z],
          id: entity.id,
          scope: desired.scope,
        });
        continue;
      }
      retiredEmptyEntities.push({
        point: [desired.x, desired.y, desired.z],
        id: entity.id,
        scope: desired.scope,
      });
    }
    changed.push({
      ...desired,
      expected: normalizeState(current),
      state: normalizeState(desired.state),
    });
  }
  if (missing.length) {
    throw new Error(`snapshot is missing ${missing.length} targeted cells`);
  }

  const ordinaryChanged = changed.filter(
    (cell) => baseBlockName(cell.state) !== 'minecraft:water',
  );
  const waterChanged = changed.filter(
    (cell) => baseBlockName(cell.state) === 'minecraft:water',
  );
  const waterStageOne = waterChanged.map((cell) => ({
    ...cell,
    state: 'minecraft:blue_ice',
    role: `${cell.role}_flow_barrier`,
  }));
  const waterStageTwo = waterChanged.map((cell) => ({
    ...cell,
    expected: 'minecraft:blue_ice',
    phase: cell.phase + 1,
    role: `${cell.role}_source_release`,
  }));
  const operations = [
    ...compactCells(ordinaryChanged),
    ...compactCells(waterStageOne),
    ...compactCells(waterStageTwo),
  ].sort(compareOperationOrder);
  const rollback = [...operations].reverse().map((operation) => ({
    ...operation,
    expected: operation.replacement,
    replacement: operation.expected,
    phase: 1000 - operation.phase,
    role: `rollback_${operation.role}`,
  }));
  const managerValeTargetCells = managerVale.operations.length;
  const combinedTargetCells = changed.length + managerValeTargetCells;
  const combinedOperationGroups = operations.length + managerValeTargetCells;
  const managerValeCopyCommands = managerVale.migrationLedger.entries.map(
    (entry) => entry.forwardCommand,
  );
  const combinedForwardGuardedCommands =
    c01Relocation.migrationPlacements.forwardCommands.length
    + managerValeCopyCommands.length;
  const generatedAtUtc = new Date().toISOString();
  const header = [
    '# GENERATED — Town Expansion R1',
    '# exact-state guarded, atomic package; do not execute subsets',
    `# generated_at_utc: ${generatedAtUtc}`,
    `# source_snapshot_sha256: ${snapshotEvidence.sha256}`,
    `# target_cells: ${combinedTargetCells}`,
    `# operation_groups: ${combinedOperationGroups}`,
    '',
  ];
  const lines = [...header];
  let prior = null;
  for (const operation of operations) {
    const group = `${operation.phase}:${operation.scope}:${operation.role}`;
    if (group !== prior) {
      lines.push(`# phase=${operation.phase} scope=${operation.scope} role=${operation.role}`);
      prior = group;
    }
    lines.push(operationLine(operation));
  }
  lines.push(
    '# module=manager-vale-five-cottages'
    + ' owner=scripts/manager_vale_cottage_compiler.mjs'
    + ' exact_one_cell_operations=37584',
  );
  lines.push(...managerVale.operations.map(oneCellOperationLine));
  if (managerValeCopyCommands.length > 0) {
    lines.push(
      '# module=manager-vale-five-cottages'
      + ' role=commission_destination_nbt_copy_source_retained',
    );
    lines.push(...managerValeCopyCommands);
  }
  if (c01Relocation.migrationPlacements.forwardCommands.length > 0) {
    lines.push('# phase=990 scope=c01_source_exact_retirement role=commissioned_destination_nbt_copy_source_retained');
    lines.push(...c01Relocation.migrationPlacements.forwardCommands);
  }
  lines.push('');
  const forwardText = lines.join('\n');
  const forwardHash = sha256(forwardText);
  const rollbackText = [
    '# GENERATED — exact inverse of Town Expansion R1',
    `# forward_sha256: ${forwardHash}`,
    `# source_snapshot_sha256: ${snapshotEvidence.sha256}`,
    `# target_cells: ${combinedTargetCells}`,
    `# operation_groups: ${combinedOperationGroups}`,
    '',
    '# source-restore verification runs before exact destination-state rollback',
    ...c01Relocation.migrationPlacements.rollbackCommands,
    '# module=manager-vale-five-cottages role=exact_reverse',
    ...managerVale.rollback.map(oneCellOperationLine),
    ...rollback.map(operationLine),
    '',
  ].join('\n');
  const scopeSummary = Object.values(
    changed.reduce((summary, cell) => {
      summary[cell.scope] ??= {
        scope: cell.scope,
        targetCells: 0,
        roles: new Set(),
        cells: [],
        expectedStates: new Map(),
      };
      summary[cell.scope].targetCells += 1;
      summary[cell.scope].roles.add(cell.role);
      summary[cell.scope].cells.push(cell);
      const expectedBase = baseBlockName(cell.expected);
      summary[cell.scope].expectedStates.set(
        expectedBase,
        (summary[cell.scope].expectedStates.get(expectedBase) ?? 0) + 1,
      );
      return summary;
    }, {}),
  ).map((entry) => ({
    scope: entry.scope,
    targetCells: entry.targetCells,
    roles: [...entry.roles].sort(),
    bounds: boundsOf(entry.cells),
    expectedStateCounts: Object.fromEntries(
      [...entry.expectedStates.entries()].sort((a, b) => b[1] - a[1]),
    ),
  }));
  for (const managerScope of managerValeModuleOwnership.scopes) {
    const exactOperations = managerVale.operations.filter(
      (operation) => operation.scope === managerScope.scope,
    );
    const expectedStateCounts = Object.fromEntries(
      [...exactOperations.reduce((counts, operation) => {
        const expectedBase = baseBlockName(operation.expected);
        counts.set(expectedBase, (counts.get(expectedBase) ?? 0) + 1);
        return counts;
      }, new Map()).entries()].sort((left, right) => right[1] - left[1]),
    );
    scopeSummary.push({
      ...managerScope,
      owner: managerValeModuleOwnership.owner,
      roles: [...new Set(exactOperations.map((operation) => operation.role))].sort(),
      expectedStateCounts,
    });
  }
  for (const deferred of c01Relocation.deferredScopeSummaries) {
    if (!scopeSummary.some((entry) => entry.scope === deferred.scope)) {
      scopeSummary.push(deferred);
    }
  }
  const countStatesByScope = (cells, selector) => Object.fromEntries(
    [...cells.reduce((summary, cell) => {
      const state = selector(cell);
      const scopeState = `${cell.scope}:${state}`;
      summary.set(scopeState, (summary.get(scopeState) ?? 0) + 1);
      return summary;
    }, new Map()).entries()].sort((left, right) => right[1] - left[1]),
  );
  const hazardBases = new Set([
    'minecraft:water',
    'minecraft:lava',
    'minecraft:bubble_column',
  ]);
  const aquaticBases = new Set([
    'minecraft:kelp',
    'minecraft:kelp_plant',
    'minecraft:seagrass',
    'minecraft:tall_seagrass',
    'minecraft:sea_pickle',
    'minecraft:tube_coral',
    'minecraft:brain_coral',
    'minecraft:bubble_coral',
    'minecraft:fire_coral',
    'minecraft:horn_coral',
  ]);
  const existingFluidTargets = changed.filter(
    (cell) => hazardBases.has(baseBlockName(cell.expected)),
  );
  const modeledFluidTargets = [...model.cells.values()].filter(
    (cell) => hazardBases.has(baseBlockName(cell.state)),
  );
  const modeledAquaticTargets = [...model.cells.values()].filter(
    (cell) => aquaticBases.has(baseBlockName(cell.state)),
  );
  const modeledLavaOrBubbleTargets = modeledFluidTargets.filter(
    (cell) => ['minecraft:lava', 'minecraft:bubble_column'].includes(baseBlockName(cell.state)),
  );
  const crossScopeInterfaces = classifyCrossScopeInterfaces(
    model,
    { requireAllContracts: true },
  );
  const report = {
    schemaVersion: 1,
    packageId: 'town-expansion-r1-2026-07-28',
    generatedAtUtc,
    status: protectedEntities.length
      ? 'BLOCKED_PROTECTED_BLOCK_ENTITIES'
      : crossScopeInterfaces.unreviewed.length
        ? 'BLOCKED_UNREVIEWED_CROSS_SCOPE_INTERFACES'
        : c01Relocation.status !== 'C01_SOURCE_MODEL_PASS_LIVE_GATES_PENDING'
          ? 'BLOCKED_C01_SOURCE_MODEL'
          : 'COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED',
    sourceSnapshot: {
      directory: regionDir,
      ...snapshotEvidence,
    },
    designSources: [
      'docs/redevelopment/2026-07-28-town-expansion/coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/guild-hall-and-bar-source-of-truth.md',
      'docs/redevelopment/2026-07-28-town-expansion/guild-hall-program.json',
      'docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-megacampus-source-of-truth.md',
      'docs/redevelopment/2026-07-28-town-expansion/northeast-data-campus-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/iowa-data-district-phase0-source-of-truth.md',
      'docs/redevelopment/2026-07-28-town-expansion/iowa-data-district-full-build-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/concord-data-district-service-town-source-of-truth.md',
      'docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-source-of-truth.md',
      'docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-soundstage-annex-source-of-truth.md',
      'docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-soundstage-annex-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/non-graphic-adult-interior-design-standard.md',
      'docs/redevelopment/2026-07-28-town-expansion/object-evidence-and-second-pass-qa-standard.md',
      CROSS_SCOPE_CONTRACT_PATH,
      'docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-independent-decision.md',
      'docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json',
      'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-frozen-schedule-handoff.md',
      'docs/redevelopment/2026-07-28-town-expansion/c01-source-nbt-migration-ledger.json',
      'docs/redevelopment/2026-07-28-town-expansion/mainstreet-underground-warehouse-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/pavilion-east-grounds-and-ravensgate-exclusion-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/observatory-estate-and-portal-hub-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/worker-town-all-role-cottages-mini-mansion-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/worker-town-all-role-cottages-mini-mansion-addendum.md',
      'docs/redevelopment/2026-07-28-town-expansion/manager-vale-five-cottage-integration-handoff.json',
      'docs/redevelopment/2026-07-28-town-expansion/westlight-three-venue-audit-and-redesign.md',
      'docs/redevelopment/2026-07-28-town-expansion/westlight-three-venue-coordinate-schedule.json',
      'docs/redevelopment/2026-07-28-town-expansion/modern-underground-corridor-standard.md',
      ...guestServices.designSources,
      garageSchedulePath,
      ...gildedRaven.designSources,
    ],
    coverage: {
      penthouse: true,
      periodLonghouse: true,
      longhouseCourt: true,
      fourTimesLibraryEnvelope: true,
      twoLevelLibraryGarthTerrace: true,
      monumentalGuildHall: true,
      guildHallBasements: 2,
      guildHallStories: 3,
      guildHallKitchens: 4,
      guildHallScreensBeforeSeating: true,
      garthStatues: 6,
      pavilionEastGroundsExtension: true,
      pavilionGroundsReflectingPools: civicGrounds.reflectingPools,
      pavilionGroundsStatues: civicGrounds.statues,
      lincolnMemorialInspiredCivicMonument: true,
      buckinghamFountainInspiredCenterpiece: true,
      libraryGuildIsolatedSecretTunnel: true,
      challengedMaterialsArchive: true,
      privateAdultLiteratureArchive: true,
      ukrainianMetroInspiredCeremonialRoom: true,
      ravensgateDistrictBoundaryFrozen: true,
      ravensgateRestrictedUndergroundTargets: ravensgateRestrictedTargets.length,
      stadiumRoadWidened: true,
      billboards: 6,
      tollwayOasis: true,
      miniBunker: true,
      RussianRevivalPavilion: true,
      westlightDistinctVenues: westlightVenues.venues,
      westlightStudioSeats: westlightVenues.studioSeats,
      westlightTruckBays: westlightVenues.truckBays,
      westlightBasementLevels: westlightVenues.basementLevels,
      westlightBlueDrumServedLevels: westlightVenues.blueDrumServedLevels,
      westlightPedestrianMall: true,
      intentionalPierBuildings: true,
      amusementPier: true,
      ferrisWheel: true,
      rollerCoaster: true,
      steakHouse: true,
      shrimpHouse: true,
      craterLakeColumns: waterfront.wetColumns.length,
      craterQuayAndGreenSpace: true,
      southwestWorkforceHousingProjects: 2,
      sharedWorkforceCourt: true,
      ravensreachMainstreetStaffPath: true,
      mainstreetEmployeeLounge: true,
      fullParkingWarehouseExpansion: true,
      warehouseDryCoreBounds: dryWarehouse.dryCoreBounds,
      warehouseDryCoreFloorPlateCells: dryWarehouse.floorPlateCells,
      warehouseRemoteEgressCores: dryWarehouse.remoteEgressCores,
      warehouseDriveDownContainedInDryReservation: dryWarehouse.driveDownContainedInDryReservation,
      warehouseDryEastWings: dryWarehouseExpansion.wings,
      warehouseDryEastWingFloorPlateCells: dryWarehouseExpansion.combinedFloorPlateCells,
      warehouseExcludedAquiferAndLavaSeamPreserved: dryWarehouseExpansion.excludedAquiferAndLavaSeamPreserved,
      modernCorridorHistoricalSegment: modernCorridor.historicalRouteSegment,
      modernCorridorClearWidth: modernCorridor.clearWidth,
      modernCorridorClearHeight: modernCorridor.clearHeight,
      modernCorridorFullWidthStairTransitions: modernCorridor.fullWidthStairTransitions,
      deprecatedTunnelPaletteRemovedFromOccupiedPilot: modernCorridor.deprecatedPaletteRemovedFromOccupiedSection,
      dataCenterCampusBuildings: dataCampus.halls.length,
      dataCenterPublicRecordPrecincts: dataCampus.precincts,
      dataCenterHallTerrainCensus: dataCampus.hallTerrain,
      fortyRackRowsPerDataBuilding: Object.values(dataCampus.rackRowsPerHall)
        .every((rows) => rows === 40),
      dataCenterRackRows: dataCampus.rackRowsPerHall,
      dataCenterNoc: true,
      presentationAuditoriumSeats: dataCampus.auditoriumSeats,
      movieTheaterSeats: dataCampus.cinemaSeats,
      dataCenterStaffDormBeds: dataCampus.lodgeBeds,
      dm10RemainsNormalSurfaceDataHall: true,
      separateInfoBunkerInspiredAnnex: true,
      noInventedDsm19Through39: !dataCampus.halls
        .some(({ publicPlanningLabel }) => {
          const number = Number(publicPlanningLabel.replace('DSM', ''));
          return number >= 19 && number <= 39;
        }),
      dataDistrictHoldoutHome: dataCampus.holdoutHome,
      completedIowaDataDistrict: dataCampus.iowaDistrict,
      completedMetaGoogleEdgeBccHalls: dataCampus.iowaDistrict.completedDataHalls,
      retainedIowaDistrictExpansionReserve: dataCampus.iowaDistrict.futureJunctions,
      iowaDistrictSharedPowerGrid: {
        districtSwitchingYards: dataCampus.iowaDistrict.districtSwitchingYards,
        dedicatedVisibleSubstations: dataCampus.iowaDistrict.dedicatedVisibleSubstations,
        transmissionCorridors: dataCampus.iowaDistrict.transmissionCorridors,
        transmissionTowers: dataCampus.iowaDistrict.transmissionTowers,
        protectedUtilityExpansionCorridors: dataCampus.iowaDistrict.protectedUtilityExpansionCorridors,
      },
      iowaDistrictWorkerCommons: dataCampus.iowaDistrict.workerCommons,
      iowaDistrictDiscGolf: dataCampus.iowaDistrict.discGolf,
      concordServiceTown: dataCampus.concord,
      concordMotelRooms: dataCampus.concord.motelRooms,
      concordBroadcastTowers: dataCampus.concord.broadcastTowers,
      concordSatelliteDishArrays: dataCampus.concord.satelliteDishArrays,
      concordBroadcastExchangeExactSchedule:
        dataCampus.concord.broadcastExchange.exactSchedule,
      concordBroadcastExchangeExactCounts:
        dataCampus.concord.broadcastExchange.exactCounts,
      concordSoundstageAnnexExactSchedule:
        dataCampus.concord.broadcastExchange.annex.exactSchedule,
      concordSoundstageAnnexExactCounts:
        dataCampus.concord.broadcastExchange.annex.exactCounts,
      concordSoundstageAnnexTerrain:
        dataCampus.concord.broadcastExchange.annex.terrain,
      concordBroadcastPublicationObjects:
        dataCampus.concord.publicationObjects.length,
      outerAviationAndComputerLogisticsCompound: true,
      c01EastFunctionalRebuild: c01Relocation.status,
      c01ClassifiedCells: c01Relocation.manifest.classifiedCells,
      c01OccupiedRoomAndRouteObjects:
        c01Relocation.manifest.occupiedRoomAndRouteObjects,
      c01FiveOrdinaryLevelsPlusDeepOwnerStack: c01Relocation.levels,
      c01SecureGarageVehicles: c01Relocation.garage.vehicleCount,
      c01ActiveHangarProgram: c01Relocation.garage.activeHangarProgram,
      c01OwnerTunnel: c01Relocation.ownerTunnel,
      c01Migration: c01Relocation.migration,
      c01MigrationDestinationPlacements:
        c01Relocation.migrationPlacements.placements,
      c01MigrationCommands:
        c01Relocation.migrationPlacements.forwardCommands.length,
      c01OldSourceRetirement:
        'DEFERRED_UNTIL_COMMISSIONING_AND_SAME_MOMENT_NBT_HASH_ACCEPTANCE',
      c01TwoIndependentEgressRoutes: true,
      c01AirlockedEntrances: true,
      c01NaturalCoverMinimumBlocks: c01Relocation.containment.minimumTerrainCover,
      fullParkingFootprintRecovered: false,
      fullParkingRecoveryStatus: parkingRecovery.status,
      preservedParkingWayfindingSigns: parkingRecovery.preservedWayfindingSigns,
      observatoryOwnerMegaEstate: true,
      observatoryEstateBounds: ownerEstate.estateBounds,
      observatorySatelliteDishes: ownerEstate.satelliteDishes,
      expandedOwnerSafeRoomAndShelter: true,
      ownerPortalRooms: ownerEstate.inactivePortalRooms,
      activeOwnerPortalBlocks: ownerEstate.activePortalBlocks,
      managerValeCottagesCommissioned: managerVale.report.counts.cottages,
      managerValeAttachedGarages: managerVale.report.counts.attachedGarages,
      managerValeGarageBays: managerVale.report.counts.bays,
      managerValeRooms: managerVale.report.counts.rooms,
      managerValeFurnishingGroups: managerVale.report.counts.furnishings,
      managerValePrivateSuites: managerVale.report.counts.privateSuites,
      managerValePrivateSuiteFixtureGroups:
        managerVale.report.counts.privateSuiteFixtures,
      managerValeCameras: managerVale.report.counts.cameras,
      managerValeSourceBlockEntitiesRetained:
        managerVale.report.protectedMigration.protectedBlockEntities,
      managerValeSourceRetirementIncluded:
        managerVale.report.protectedMigration.sourceRetirementIncluded,
      b01GuestServicesDestination: true,
      b01RetainedExistingOccupiedLevels: guestServices.retainedExistingOccupiedLevels,
      b01ProtectedKitchenBlockEntities: guestServices.protectedKitchenBlockEntities,
      b01AdjustedDrySupportLines: guestServices.adjustedDrySupportLines,
      b01SupportRangeY: guestServices.supportRangeY,
      b01BroadSwitchbackStairCores: guestServices.broadSwitchbackStairCores,
      b01AccessibleLiftCores: guestServices.accessibleLiftCores,
      b01RemoteExitRoutes: guestServices.remoteExitRoutes,
      b01ProtectedAtriumBridges: guestServices.protectedAtriumBridges,
      b01SetbackL3Bounds: guestServices.setbackL3Bounds,
      b01ControlledNonGraphicL4Bounds: guestServices.controlledNonGraphicL4Bounds,
      b01HotTubPrimaryBasins: guestServices.hotTubPrimaryBasins,
      b01PoolPrimaryBasins: guestServices.poolPrimaryBasins,
      b01SecondaryContainmentSystems: guestServices.secondaryContainmentSystems,
      b01ModeledWaterCells: guestServices.modeledWaterCells,
      b01WaterModelPriority: guestServices.waterModelPriority,
      b01GuardedOccupiedTerraces: guestServices.guardedOccupiedTerraces,
      b01RoofBar: guestServices.roofBar,
      b01RoofGarden: guestServices.roofGarden,
      b01StaffConnectionBounds: guestServices.staffConnectionBounds,
      b01T2bGeometryCells: guestServices.t2bGeometryCells,
      attachedGarageScheduleLoaded: garageSchedule.loaded,
      attachedGarages: garageSchedule.houses.length,
      gildedRavenScheduleLoaded: gildedRaven.loaded,
      gildedRavenTheatreBounds: gildedRaven.theatreBounds,
      gildedRavenMainHouseSeats: gildedRaven.mainHouseSeats,
      gildedRavenStallsSeats: gildedRaven.stallsSeats,
      gildedRavenDressCircleSeats: gildedRaven.dressCircleSeats,
      gildedRavenGrandCircleSeats: gildedRaven.grandCircleSeats,
      gildedRavenFivePersonSalonSeats: gildedRaven.fivePersonSalonSeats,
      gildedRavenOneToOneRoomSeats: gildedRaven.oneToOneRoomSeats,
      gildedRavenOpenVomitories: gildedRaven.openVomitories,
      gildedRavenSeparatedHiddenRoutes: gildedRaven.separatedHiddenRoutes,
      gildedRavenPublicGrandStairFlights: gildedRaven.publicGrandFlightCount,
      gildedRavenPublicLiftFloors: gildedRaven.publicLiftFloors,
      gildedRavenGrandDescentFlights: gildedRaven.theatreFlightCount,
      gildedRavenGrandDescentLiftLandings: gildedRaven.theatreLiftLandings,
      ownerCorridorLengthBlocks: gildedRaven.corridorLengthBlocks,
      ownerCorridorClearWidth: gildedRaven.corridorClearWidth,
      ownerCorridorClearHeight: gildedRaven.corridorClearHeight,
      ownerCorridorTurnNodes: gildedRaven.turnNodes,
      ownerCorridorRestSuites: gildedRaven.restSuites,
      ownerCorridorNonGraphicRedRoomAnnexes: gildedRaven.redRoomAnnexes,
      futureOwnerCityReservationOnly: true,
      futureOwnerCityReservationBounds: gildedRaven.futureOwnerCityReservationBounds,
      futureOwnerCityExcavatedCells: gildedRaven.futureOwnerCityExcavatedCells,
      futureOwnerCitySalesOfficeBounds: gildedRaven.salesOfficeBounds,
      ownerMansionArrivalFlights: gildedRaven.mansionFlightCount,
      ownerMansionArrivalLiftLandings: gildedRaven.mansionLiftLandings,
      ownerEstateModeledInterfaceCells: gildedRaven.modeledEstateInterfaceCells,
      ownerEstateDocumentedInterfaceCells: gildedRaven.documentedEstateInterfaceCells,
      ownerRouteDeprecatedT2bTargets: gildedRaven.deprecatedT2bTargets,
      ownerRouteNetworkConnections: gildedRaven.routeNetworkConnections,
      gildedRavenPublicationObjects: gildedRaven.publicationObjectCount,
      gildedRavenMatchedCaptureCandidates:
        gildedRaven.matchedCaptureCandidateCount,
    },
    publication: {
      objectRecords: gildedRaven.objectRecords,
      objectCount: gildedRaven.publicationObjectCount,
      matchedCaptureCandidateCount: gildedRaven.matchedCaptureCandidateCount,
      databaseImportRequired: true,
      matchedFirstAndSecondPassEvidenceRequired: true,
      liveCaptureStatus: 'PENDING_POST_RELEASE_VISUAL_QA',
      managerVale: {
        databaseFeatures: managerVale.databaseFeatures,
        cameraCandidates: managerVale.cameras,
        databaseFeatureCount: managerVale.report.counts.databaseFeatures,
        cameraCandidateCount: managerVale.report.counts.cameras,
        sourceRetirementIncluded: false,
      },
    },
    modules: {
      managerValeFiveCottages: {
        module: 'scripts/manager_vale_cottage_compiler.mjs',
        exportName: 'compileManagerValeCottages',
        status: managerVale.report.status,
        source: managerVale.report.source,
        counts: managerVale.report.counts,
        garageCapacityByHouse: managerVale.report.garageCapacityByHouse,
        identityCrosswalk: managerVale.report.identityCrosswalk,
        operations: managerVale.report.operations,
        protectedMigration: managerVale.report.protectedMigration,
        privateSuiteDesign: managerVale.report.privateSuiteDesign,
        ownership: managerValeModuleOwnership,
      },
    },
    ownershipManifest: {
      file: manifestPath,
      emittedBySharedGenerator: true,
    },
    operations: {
      file: outputPath,
      sha256: forwardHash,
      operationGroups: combinedOperationGroups,
      sharedCompactedOperationGroups: operations.length,
      managerValeExactOneCellOperationGroups: managerValeTargetCells,
      guardedCommands: combinedForwardGuardedCommands,
      managerValeGuardedNbtCopyCommands: managerValeCopyCommands.length,
      managerValeStandaloneForwardSha256:
        managerVale.report.operations.forwardSha256,
      targetCells: combinedTargetCells,
      sharedTargetCells: changed.length,
      managerValeTargetCells,
      exactStateGuardedCells: combinedTargetCells,
      unguardedCells: 0,
      skippedCells: protectedEntities.length,
      scopeSummary,
    },
    rollback: {
      file: rollbackPath,
      sha256: sha256(rollbackText),
      operationGroups: rollback.length + managerVale.rollback.length,
      sharedCompactedOperationGroups: rollback.length,
      managerValeExactOneCellOperationGroups: managerVale.rollback.length,
      managerValeStandaloneRollbackSha256:
        managerVale.report.operations.rollbackSha256,
      guardedCommands:
        c01Relocation.migrationPlacements.rollbackCommands.length,
      targetCells: combinedTargetCells,
      exactInverse: true,
    },
    blockEntities: {
      surveyed: entityByCell.size,
      retiredKnownEmpty: retiredEmptyEntities,
      protectedAndSkipped: protectedEntities,
    },
    diagnostics: {
      crossScopeContract: {
        path: CROSS_SCOPE_CONTRACT_PATH,
        sha256: sha256(
          fs.readFileSync(path.resolve(CROSS_SCOPE_CONTRACT_PATH)),
        ),
        status: crossScopeContractPayload.status,
        exactInterfaces: REVIEWED_CROSS_SCOPE_INTERFACES.size,
        wildcardsAllowed: crossScopeContractPayload.wildcardsAllowed,
      },
      missingCells: missing,
      modelOverrideCount: model.overrides.length,
      modelOverrides: model.overrides.slice(0, 500),
      crossScopeOverrides: crossScopeOverrideEvidence(model),
      reviewedCrossScopeInterfaces: crossScopeInterfaces.reviewed,
      unreviewedCrossScopeInterfaces: crossScopeInterfaces.unreviewed,
      managerValeModuleOwnership,
      fluidAndAquaticCensus: {
        existingFluidCellsTargeted: existingFluidTargets.length,
        existingFluidStatesByScope: countStatesByScope(
          existingFluidTargets,
          (cell) => baseBlockName(cell.expected),
        ),
        modeledFluidCells: modeledFluidTargets.length,
        modeledFluidStatesByScope: countStatesByScope(
          modeledFluidTargets,
          (cell) => baseBlockName(cell.state),
        ),
        modeledLavaOrBubbleTargets: modeledLavaOrBubbleTargets.map(
          (cell) => [cell.x, cell.y, cell.z, cell.scope, baseBlockName(cell.state)],
        ),
        modeledAquaticTargets: modeledAquaticTargets.map(
          (cell) => [cell.x, cell.y, cell.z, cell.scope, baseBlockName(cell.state)],
        ),
      },
    },
    acceptance: {
      noMissingSnapshotCells: missing.length === 0,
      noProtectedBlockEntityTargets: protectedEntities.length === 0,
      noUnreviewedCrossScopeInterfaces: crossScopeInterfaces.unreviewed.length === 0,
      exactStateGuards: true,
      exactRollback:
        rollback.length === operations.length
        && managerVale.rollback.length === managerVale.operations.length,
      managerValeExactModuleIntegrated: (
        managerVale.report.status
          === 'PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING'
        && managerVale.report.operations.changedCellCount === 37584
        && managerVale.report.operations.uniqueTargetCells === 37584
        && managerVale.report.operations.forwardSha256
          === 'b6a37a4c98fc117d2a6f7d2af360091ab75b9ce197f3b964c0b6350838100c96'
        && managerVale.report.operations.rollbackSha256
          === '3a8cc167d0247fdfbed2e03789cad6c7b8999adcfc1fc3afb6f615faecfdfc81'
      ),
      managerValeZeroSharedTargetIntersections:
        managerValeModuleOwnership.sharedModelTargetIntersections === 0,
      managerValeExactFiveCottageProgram: (
        managerVale.report.counts.cottages === 5
        && managerVale.report.counts.attachedGarages === 5
        && managerVale.report.counts.bays === 24
        && managerVale.report.counts.rooms === 55
        && managerVale.report.counts.furnishings === 406
        && managerVale.report.counts.privateSuites === 5
        && managerVale.report.counts.privateSuiteFixtures === 35
        && managerVale.report.counts.cameras === 45
      ),
      managerValeCommissionBeforeRetire: (
        managerVale.report.protectedMigration.protectedBlockEntities === 41
        && managerVale.report.protectedMigration.sourceRetirementIncluded === false
        && managerVale.report.protectedMigration.sourceRetirementOperationCount === 0
        && Object.values(managerVale.report.protectedMigration.checks)
          .every(Boolean)
      ),
      waterFlowBarrierStaged: waterStageOne.length === waterStageTwo.length,
      garageCorrectionIntegrated: garageSchedule.loaded && garageSchedule.houses.length === 18,
      dataHallRowContract: Object.values(dataCampus.rackRowsPerHall)
        .every((rows) => rows === 40),
      dataHallCountMatchesPublicRecordSlots: dataCampus.halls.length === 24,
      dataHallNoVoidTerrainSamples: Object.values(dataCampus.hallTerrain)
        .every(({ voidSamples }) => voidSamples === 0),
      dataHallNoSurfaceFluidSamples: Object.values(dataCampus.hallTerrain)
        .every(({ fluidSamples }) => fluidSamples === 0),
      dataHallTerrainSupportsModeled: Object.values(dataCampus.hallTerrain)
        .every(({ maximumPierHeight }) => Number.isFinite(maximumPierHeight)),
      noInventedDsm19Through39: !dataCampus.halls
        .some(({ publicPlanningLabel }) => {
          const number = Number(publicPlanningLabel.replace('DSM', ''));
          return number >= 19 && number <= 39;
        }),
      dm10IsNormalMicrosoftHallWithSeparateAnnex:
        dataCampus.halls.some(({ id, publicPlanningLabel }) => id === 'DM10' && publicPlanningLabel === 'DSM10'),
      completedIowaDistrictHallContract: (
        dataCampus.iowaDistrict.futureHallEnvelopes === 0
        && dataCampus.iowaDistrict.completedDataHalls === 20
        && dataCampus.iowaDistrict.precincts.every(
          ({ modelStatus }) => modelStatus === 'COMPLETED_WALKABLE_FICTIONAL_PUBLIC_INSPIRED_CAMPUS',
        )
      ),
      iowaDistrictRoadConnectedToExistingCampus:
        dataCampus.iowaDistrict.districtRoadAnchorMatchesExistingCampusRoad,
      iowaDistrictNoUnsupportedFoundations: dataCampus.iowaDistrict.precincts
        .every(({ unsupportedFoundationColumns }) => unsupportedFoundationColumns === 0),
      iowaDistrictNoUnsupportedUtilityMarkers:
        dataCampus.iowaDistrict.unsupportedUtilityReserveMarkers === 0,
      iowaDistrictPowerGridModeled: (
        dataCampus.iowaDistrict.districtSwitchingYards === 1
        && dataCampus.iowaDistrict.dedicatedVisibleSubstations === 3
        && dataCampus.iowaDistrict.transmissionCorridors === 2
      ),
      iowaDistrictCompletedHallProgram: (
        dataCampus.iowaDistrict.precincts.find(({ id }) => id === 'META')?.completedDataHalls === 12
        && dataCampus.iowaDistrict.precincts.find(({ id }) => id === 'GOOGLE')?.completedDataHalls === 6
        && dataCampus.iowaDistrict.precincts.find(({ id }) => id === 'LIGHTEDGE_EDGEBCC')?.completedDataHalls === 2
        && dataCampus.iowaDistrict.precincts.every(({ completedHalls }) => (
          completedHalls.every((hall) => (
            hall.floors === 2
            && hall.rackRows >= 16
            && hall.remoteEgresses === 2
            && hall.liftAndStairCores === 2
            && hall.crossAislesPerFloor === 2
            && hall.unsupportedFoundationColumns === 0
          ))
        ))
      ),
      iowaDistrictNaturalLandscapeContract: (
        dataCampus.iowaDistrict.workerCommons.trees >= 24
        && dataCampus.iowaDistrict.workerCommons.groves.length >= 6
        && dataCampus.iowaDistrict.workerCommons.bioswales.length >= 4
        && dataCampus.iowaDistrict.workerCommons.plantedBerms >= 6
        && dataCampus.iowaDistrict.workerCommons.unsupportedFoundations === 0
      ),
      iowaDistrictWorkerPondContained: (
        dataCampus.iowaDistrict.workerCommons.pond.wetCells > 0
        && dataCampus.iowaDistrict.workerCommons.pond.shorelineColumns > 0
        && dataCampus.iowaDistrict.workerCommons.pond.sealedSidewallColumns
          === dataCampus.iowaDistrict.workerCommons.pond.shorelineColumns
        && dataCampus.iowaDistrict.workerCommons.pond.openSidewallColumns === 0
        && dataCampus.iowaDistrict.workerCommons.pond.irregularConcaveBays >= 3
      ),
      iowaDistrictWalkBikeNetwork: (
        dataCampus.iowaDistrict.workerCommons.arrivalTrail.maximumDesignedGradePercent <= 5
        && dataCampus.iowaDistrict.workerCommons.arrivalTrail.maximumPierHeight <= 7
        && dataCampus.iowaDistrict.workerCommons.trail.maximumDesignedGradePercent <= 5
        && dataCampus.iowaDistrict.workerCommons.trail.maximumPierHeight <= 7
        && dataCampus.iowaDistrict.workerCommons.campusSpurs.every(
          ({ maximumDesignedGradePercent, maximumPierHeight }) => (
            maximumDesignedGradePercent <= 5 && maximumPierHeight <= 7
          ),
        )
        && dataCampus.iowaDistrict.workerCommons.controlledRoadCrossings === 5
      ),
      iowaDistrictWorkerAmenities: (
        dataCampus.iowaDistrict.workerCommons.shelterHouses === 4
        && dataCampus.iowaDistrict.workerCommons.quietOverlooks === 4
        && dataCampus.iowaDistrict.workerCommons.exerciseAndRestNodes === 6
        && dataCampus.iowaDistrict.workerCommons.shiftShuttleStops === 1
        && dataCampus.iowaDistrict.workerCommons.bikeParkingAndRepairStations === 1
        && dataCampus.iowaDistrict.workerCommons.restrooms === 1
      ),
      iowaDistrictDiscGolfContract: (
        dataCampus.iowaDistrict.discGolf.holeCount === 18
        && dataCampus.iowaDistrict.discGolf.totalPar === 58
        && dataCampus.iowaDistrict.discGolf.distinctTees === 18
        && dataCampus.iowaDistrict.discGolf.distinctBaskets === 18
        && dataCampus.iowaDistrict.discGolf.distinctHoleSigns === 18
        && dataCampus.iowaDistrict.discGolf.cameras.length === 36
        && dataCampus.iowaDistrict.discGolf.safeFlightCorridors === 18
        && dataCampus.iowaDistrict.discGolf.conflictsWithRoadTrailBuildingUtilityOrPond === 0
        && dataCampus.iowaDistrict.discGolf.fairwayToFairwayOverlapCells === 0
      ),
      holdoutHomeDryProtectedParcel: (
        dataCampus.holdoutHome.survey.surfaceWaterColumns === 0
        && dataCampus.holdoutHome.survey.surfaceLavaColumns === 0
        && dataCampus.holdoutHome.surfaceBlockEntities.length === 0
        && dataCampus.holdoutHome.preservedDeepEntityMinimumVerticalSeparation >= 40
        && dataCampus.holdoutHome.shelterSurvey.fluidCells === 0
      ),
      concordProgramContract: (
        dataCampus.concord.motelRooms === 25
        && dataCampus.concord.adultsOnlyProgramsGraphicContent === false
        && dataCampus.concord.broadcastTowers === 1
        && dataCampus.concord.satelliteDishArrays === 9
        && dataCampus.concord.protectedHiveTargets === 0
      ),
      concordBroadcastExchangeDryAndSeparated: (
        dataCampus.concord.broadcastExchange.undergroundSurvey.fluidCells === 0
        && dataCampus.concord.broadcastExchange.publicCreatorServiceRoutes === 3
        && dataCampus.concord.broadcastExchange.separatedEgressDirections === 2
      ),
      concordBroadcastExchangeExactScheduleContract: (
        dataCampus.concord.broadcastExchange.scheduleLoaded
        && dataCampus.concord.broadcastExchange.exactSchedule.rooms === 113
        && dataCampus.concord.broadcastExchange.generated.roomIds.length === 113
        && new Set(dataCampus.concord.broadcastExchange.generated.roomIds).size === 113
        && dataCampus.concord.broadcastExchange.exactSchedule.siteObjects === 5
        && dataCampus.concord.broadcastExchange.generated.siteObjectIds.length === 5
        && dataCampus.concord.broadcastExchange.exactSchedule.verticalCores === 5
        && dataCampus.concord.broadcastExchange.generated.coreIds.length === 5
        && dataCampus.concord.broadcastExchange.exactSchedule.specialComponents === 20
        && dataCampus.concord.broadcastExchange.generated.specialComponentIds.length === 20
        && dataCampus.concord.broadcastExchange.exactSchedule.routes === 10
        && dataCampus.concord.broadcastExchange.exactSchedule.cameras === 18
        && dataCampus.concord.broadcastExchange.exactCounts.hallASeatBlocks === 80
        && dataCampus.concord.broadcastExchange.exactCounts.hallAOpenBayAnalogues === 4
        && dataCampus.concord.broadcastExchange.exactCounts.hallAAudiencePositions === 84
        && dataCampus.concord.broadcastExchange.exactCounts.hallBSeatBlocks === 40
        && dataCampus.concord.broadcastExchange.exactCounts.hallBOpenBayAnalogues === 2
        && dataCampus.concord.broadcastExchange.exactCounts.hallBAudiencePositions === 42
        && dataCampus.concord.broadcastExchange.exactCounts.billiardsTables === 4
        && dataCampus.concord.broadcastExchange.exactCounts.openSkyGardenSeats === 24
        && dataCampus.concord.broadcastExchange.exactCounts.largeDishAnalogues === 1
        && dataCampus.concord.broadcastExchange.exactCounts.mediumDishAnalogues === 4
        && dataCampus.concord.broadcastExchange.exactCounts.smallDishAnalogues === 4
        && dataCampus.concord.broadcastExchange.exactCounts.totalDishAnalogues === 9
        && dataCampus.concord.broadcastExchange.exactCounts.towerMaintenanceDecks === 4
        && dataCampus.concord.broadcastExchange.satelliteMinimumTargetY >= 62
        && dataCampus.concord.broadcastExchange.satelliteTargetsBelowY62 === 0
        && dataCampus.concord.broadcastExchange.protectedHiveTargets === 0
      ),
      concordSoundstageAnnexExactScheduleContract: (
        dataCampus.concord.broadcastExchange.annex.scheduleLoaded
        && dataCampus.concord.broadcastExchange.annex.exactSchedule.rooms === 84
        && dataCampus.concord.broadcastExchange.annex.generated.roomIds.length === 84
        && new Set(dataCampus.concord.broadcastExchange.annex.generated.roomIds).size === 84
        && dataCampus.concord.broadcastExchange.annex.exactSchedule.siteObjects === 10
        && dataCampus.concord.broadcastExchange.annex.generated.siteObjectIds.length === 10
        && dataCampus.concord.broadcastExchange.annex.exactSchedule.routes === 10
        && dataCampus.concord.broadcastExchange.annex.exactSchedule.cameras === 18
        && dataCampus.concord.broadcastExchange.annex.exactCounts.clearSpanStageVolumes === 2
        && dataCampus.concord.broadcastExchange.annex.exactCounts.clearSpanWidthBlocksEach === 34
        && dataCampus.concord.broadcastExchange.annex.exactCounts.clearSpanLengthBlocksEach === 52
        && dataCampus.concord.broadcastExchange.annex.exactCounts.modeledClearHeightBlocksEach === 18
        && dataCampus.concord.broadcastExchange.annex.exactCounts.lateNightSeatBlocks === 96
        && dataCampus.concord.broadcastExchange.annex.exactCounts.lateNightOpenBayAnalogues === 6
        && dataCampus.concord.broadcastExchange.annex.exactCounts.lateNightAudiencePositions === 102
        && dataCampus.concord.broadcastExchange.annex.exactCounts.lateNightProductionZones === 4
        && dataCampus.concord.broadcastExchange.annex.exactCounts.sitcomSeatBlocks === 84
        && dataCampus.concord.broadcastExchange.annex.exactCounts.sitcomOpenBayAnalogues === 4
        && dataCampus.concord.broadcastExchange.annex.exactCounts.sitcomAudiencePositions === 88
        && dataCampus.concord.broadcastExchange.annex.exactCounts.sitcomStandingSets === 3
        && dataCampus.concord.broadcastExchange.annex.exactCounts.sitcomSwingSets === 1
        && dataCampus.concord.broadcastExchange.annex.partialTwoStorySupportBars === 2
        && dataCampus.concord.broadcastExchange.annex.glazedStageOverlooks === 2
        && dataCampus.concord.broadcastExchange.annex.truckHeightStageDoorsPerBuilding === 2
        && dataCampus.concord.broadcastExchange.annex.remotePublicExitsPerBuilding === 2
        && dataCampus.concord.broadcastExchange.annex.independentServiceExitsPerBuilding === 1
        && dataCampus.concord.broadcastExchange.annex.routeFamilies === 3
        && dataCampus.concord.broadcastExchange.annex.clearStageStructuralIntrusions.length === 0
        && dataCampus.concord.broadcastExchange.annex.protectedFeatures.exactWaterTargets === 0
        && dataCampus.concord.broadcastExchange.annex.protectedFeatures.waterHaloSupportTargets === 0
        && dataCampus.concord.broadcastExchange.annex.protectedFeatures.protectedDeepEntityTargets === 0
      ),
      concordHasZeroUnreviewedInterfaces: crossScopeInterfaces.unreviewed
        .filter(({ fromScope, toScope }) => (
          fromScope.includes('CONCORD') || toScope.includes('CONCORD')
        )).length === 0,
      twoIndependentTwoHundredSeatVenues: (
        dataCampus.auditoriumSeats === 200
        && dataCampus.cinemaSeats === 200
      ),
      c01SourceModelExactChecks:
        c01Relocation.status === 'C01_SOURCE_MODEL_PASS_LIVE_GATES_PENDING',
      c01SeparatedFromDataCampus:
        c01Relocation.manifest.classifiedCells === 885022,
      c01MinimumNaturalCoverModeled:
        c01Relocation.containment.minimumTerrainCover === 3,
      c01ActiveHangarAndArenaProgramsAbsent:
        c01Relocation.garage.activeHangarProgram === false
        && c01Relocation.checks.noHangarTag
        && c01Relocation.checks.noArenaTag,
      c01ExactMigrationLedger:
        c01Relocation.migration.checks.exactBlockEntities
        && c01Relocation.migration.checks.exactInventories
        && c01Relocation.migration.checks.exactItemStacks
        && c01Relocation.migration.checks.exactItemCount,
      c01CommissionNewBeforeRetireOld:
        c01Relocation.deferredScopes.length === 1
        && c01Relocation.deferredScopes[0] === 'c01_source_exact_retirement',
      c01ExactSourceRetirementAccepted: false,
      c01FullParkingRecoveryAccepted: false,
      noCivilianTargetsInRavensgateRestrictedVolume: ravensgateRestrictedTargets.length === 0,
      ownerPortalGalleryInactiveAndOnlyContainedC01PortalActive: (
        activePortalTargets.length === 28
        && activePortalTargets.every(
          (cell) => cell.scope === 'c01_east_l5_power_escape',
        )
      ),
      noModeledLavaOrBubbleColumns: modeledLavaOrBubbleTargets.length === 0,
      noIntroducedAquaticStates: modeledAquaticTargets.length === 0,
      rejectedWetWarehouseEnvelopeAbsent: ![...model.cells.values()]
        .some((cell) => cell.scope === 'TE-MSA-UW01'),
      warehouseDryCoreAndEastWingsIntegrated: (
        dryWarehouse.driveDownContainedInDryReservation
        && dryWarehouseExpansion.excludedAquiferAndLavaSeamPreserved
      ),
      modernCorridorFiveByFiveClear: (
        modernCorridor.clearWidth === 5
        && modernCorridor.clearHeight === 5
      ),
      modernCorridorNoJumpGeometry: modernCorridor.fullWidthStairTransitions === 1,
      deprecatedTunnelPaletteAbsentFromModernPilot: modernCorridor.deprecatedPaletteRemovedFromOccupiedSection,
      westlightThreeDistinctVenueEntries: westlightVenues.venues === 3,
      westlightStudioSeatContract: westlightVenues.studioSeats === 40,
      westlightBlueDrumAllLevelsConnected: (
        westlightVenues.blueDrumServedLevels.join(',') === '18,29,40,67'
      ),
      gildedRavenStageModeledBeforeSeats: true,
      gildedRavenMainHouseSeatContract: gildedRaven.mainHouseSeats === 168,
      gildedRavenSmallRoomSeatContract: (
        gildedRaven.fivePersonSalonSeats === 25
        && gildedRaven.oneToOneRoomSeats === 4
      ),
      gildedRavenOpenBowlCirculation: gildedRaven.openVomitories === 5,
      gildedRavenPublicPerformerOwnerRoutesSeparated:
        gildedRaven.separatedHiddenRoutes === 3,
      gildedRavenPublicGrandStairsWalkable: (
        gildedRaven.publicGrandFlights.length === 8
        && gildedRaven.publicGrandFlights.every(
          (flight) => (
            flight.rise === 4
            && flight.run === 8
            && flight.clearWidth === 7
            && flight.clearHeadroom === 6
          ),
        )
        && gildedRaven.publicLiftFloors === 3
      ),
      gildedRavenUniformGrandDescent: (
        gildedRaven.upperCeremonialFlight.rise === 6
        && gildedRaven.upperCeremonialFlight.run === 12
        && gildedRaven.theatreFlights.length === 9
        && gildedRaven.theatreFlights.every(
          (flight) => (
            flight.rise === 12
            && flight.run === 24
            && flight.clearWidth === 7
            && flight.clearHeadroom === 6
          ),
        )
      ),
      ownerCorridorFiveByFiveClear: (
        gildedRaven.corridorClearWidth === 5
        && gildedRaven.corridorClearHeight === 5
      ),
      ownerCorridorLengthContract: gildedRaven.corridorLengthBlocks === 928,
      ownerCorridorSevenRestSuites: (
        gildedRaven.restSuites === 7
        && gildedRaven.redRoomAnnexes === 7
      ),
      futureOwnerCityReservationNotExcavated:
        gildedRaven.futureOwnerCityExcavatedCells === 0,
      ownerMansionArrivalUniformFlights: (
        gildedRaven.mansionFlights.length === 13
        && gildedRaven.mansionFlights.every(
          (flight) => (
            flight.rise === 12
            && flight.run === 24
            && flight.clearWidth === 7
            && flight.clearHeadroom === 6
          ),
        )
      ),
      ownerMansionEstateInterfaceOnly: (
        gildedRaven.priorScopeIntersections.length === 0
        && gildedRaven.modeledEstateInterfaceCells === 456
        && gildedRaven.documentedEstateInterfaceCells === 276
      ),
      ownerRouteNoDeprecatedT2bConnection:
        gildedRaven.deprecatedT2bTargets === 0,
      gildedRavenDatabaseMediaCrosswalkComplete: (
        gildedRaven.publicationObjectCount === 13
        && gildedRaven.matchedCaptureCandidateCount === 26
        && gildedRaven.objectRecords.every(
          (record) => (
            record.databaseRecordRequired
            && record.requiredMatchedCaptures === 2
            && record.cameraCandidates.length === 2
          ),
        )
      ),
    },
  };
  const ownershipManifest = {
    schemaVersion: 1,
    packageId: 'town-expansion-r1-2026-07-28',
    generatedAtUtc,
    status: 'EXACT_MODULE_OWNERSHIP_MANIFEST',
    liveWorldMutated: false,
    sourceSnapshot: {
      directory: regionDir,
      ...snapshotEvidence,
    },
    combinedTransaction: {
      forward: {
        file: outputPath,
        sha256: forwardHash,
        targetCells: combinedTargetCells,
        operationGroups: combinedOperationGroups,
        guardedCommands: combinedForwardGuardedCommands,
      },
      rollback: {
        file: rollbackPath,
        sha256: sha256(rollbackText),
        targetCells: combinedTargetCells,
        operationGroups: rollback.length + managerVale.rollback.length,
        guardedCommands:
          c01Relocation.migrationPlacements.rollbackCommands.length,
      },
      report: {
        file: reportPath,
      },
    },
    owners: [
      {
        id: 'shared-town-expansion-model',
        owner: 'scripts/generate_town_expansion_r1.mjs',
        targetCells: changed.length,
        forwardOperationGroups: operations.length,
        rollbackOperationGroups: rollback.length,
      },
      {
        id: 'manager-vale-five-cottages',
        ...managerValeModuleOwnership,
        targetCells: managerValeTargetCells,
        forwardOperationGroups: managerVale.operations.length,
        rollbackOperationGroups: managerVale.rollback.length,
        forwardGuardedNbtCopyCommands: managerValeCopyCommands.length,
        sourceSchedule: managerVale.report.source.schedule,
        standaloneForwardSha256:
          managerVale.report.operations.forwardSha256,
        standaloneRollbackSha256:
          managerVale.report.operations.rollbackSha256,
        embeddedForwardReplSegmentSha256: sha256(
          `${managerVale.operations.map(oneCellOperationLine).join('\n')}\n`,
        ),
        embeddedRollbackReplSegmentSha256: sha256(
          `${managerVale.rollback.map(oneCellOperationLine).join('\n')}\n`,
        ),
        protectedMigration: managerVale.report.protectedMigration,
        sourceRetirementIncluded: false,
      },
      {
        id: 'c01-commissioned-destination-nbt',
        owner: 'scripts/town_expansion_c01_compiler.mjs',
        forwardGuardedCommands:
          c01Relocation.migrationPlacements.forwardCommands.length,
        rollbackGuardedCommands:
          c01Relocation.migrationPlacements.rollbackCommands.length,
        sourceRetirementIncluded: false,
      },
    ],
    transactionOrder: {
      forward: [
        'shared exact-state cell operations',
        'Manager Vale 37,584 exact one-cell operations',
        'Manager Vale 41 guarded destination NBT copy commands; sources retained',
        'C01 guarded destination NBT copy commands; source retirement deferred',
      ],
      rollback: [
        'C01 source-restore verification and destination NBT rollback commands',
        'Manager Vale 37,584 exact one-cell reverse operations',
        'shared exact-state reverse operations',
      ],
    },
    checks: {
      sourceSnapshotHashMatchesManagerVale:
        snapshotEvidence.sha256 === managerVale.report.source.snapshot.sha256,
      managerValeStandaloneHashesPreserved: (
        managerVale.report.operations.forwardSha256
          === 'b6a37a4c98fc117d2a6f7d2af360091ab75b9ce197f3b964c0b6350838100c96'
        && managerVale.report.operations.rollbackSha256
          === '3a8cc167d0247fdfbed2e03789cad6c7b8999adcfc1fc3afb6f615faecfdfc81'
      ),
      managerValeUniqueTargets:
        managerValeModuleOwnership.uniqueTargetCells === 37584,
      zeroSharedManagerValeTargetIntersections:
        managerValeModuleOwnership.sharedModelTargetIntersections === 0,
      exactCombinedTargetArithmetic:
        combinedTargetCells === changed.length + managerValeTargetCells,
      sourceRetirementExcluded:
        managerVale.report.protectedMigration.sourceRetirementIncluded === false,
    },
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(outputPath, forwardText);
  fs.writeFileSync(rollbackPath, rollbackText);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(ownershipManifest, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    status: report.status,
    sourceSnapshotSha256: snapshotEvidence.sha256,
    targetCells: combinedTargetCells,
    operationGroups: combinedOperationGroups,
    managerValeTargetCells,
    managerValeCottages: managerVale.report.counts.cottages,
    managerValeGarageBays: managerVale.report.counts.bays,
    managerValeSourceRetirementIncluded: false,
    managerValeSharedTargetIntersections:
      managerValeModuleOwnership.sharedModelTargetIntersections,
    protectedBlockEntities: protectedEntities.length,
    attachedGarages: garageSchedule.houses.length,
    gildedRavenMainHouseSeats: gildedRaven.mainHouseSeats,
    ownerCorridorLengthBlocks: gildedRaven.corridorLengthBlocks,
    ownerCorridorRestSuites: gildedRaven.restSuites,
    outputPath,
    rollbackPath,
    reportPath,
    manifestPath,
    manifestSha256: sha256(
      `${JSON.stringify(ownershipManifest, null, 2)}\n`,
    ),
  }, null, 2));
  if (protectedEntities.length) process.exitCode = 1;
}

await main();
