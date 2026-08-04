import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')) as T;
}

function sha256(relativePath: string): string {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

function jsonFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  });
}

interface Point {
  x: number;
  y: number;
  z: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY?: number;
  maxY?: number;
  minZ: number;
  maxZ: number;
}

interface LocalBounds {
  x_min: number;
  x_max: number;
  y_min?: number;
  y_max?: number;
  z_min: number;
  z_max: number;
}

function normalizeLocalBounds(bounds: LocalBounds): Bounds {
  return {
    minX: bounds.x_min,
    maxX: bounds.x_max,
    ...(bounds.y_min === undefined ? {} : { minY: bounds.y_min }),
    ...(bounds.y_max === undefined ? {} : { maxY: bounds.y_max }),
    minZ: bounds.z_min,
    maxZ: bounds.z_max,
  };
}

interface ArtifactBinding {
  path: string;
  sha256: string;
}

interface Reconciliation {
  schemaVersion: number;
  status: string;
  worldEditAuthorized: boolean;
  authorityModel: {
    kind: string;
    composition: string;
  };
  canonicalSources: {
    childArchitecture: Array<ArtifactBinding & { id: string }>;
    normalizedComposition: {
      coordinateRegistry: ArtifactBinding & { coordinateSpace: string };
      contractorBrief: ArtifactBinding & { coordinateSpace: string };
    };
    currentWorldPlacement: {
      masterplan: string;
      coordinateRegistry: ArtifactBinding;
      phase0Evidence: ArtifactBinding & { postSnapshotSha256: string };
      authoritativeMap: ArtifactBinding & { blocksPerPixel: number; north: string };
    };
  };
  placementBridge: {
    status: string;
    topDown: {
      origin: { x: number; z: number };
      rotationDegrees: number;
    };
    verticalStudy: {
      activeForBuild: boolean;
      streetY: number;
      belowStreet: string;
      aboveStreet: string;
      blockRoundingPolicy: null;
    };
    boundsSemantics: {
      compiledCellSetsAuthorized: boolean;
    };
  };
  coordinateCrosswalk: Array<{
    id: string;
    sourcePath: string;
    local: Point;
    worldStudy: Point;
  }>;
  envelopeCrosswalk: Array<{
    id: string;
    sourcePath: string;
    sourceDerivation?: string;
    sourceLocal: Bounds;
    worldStudy: Bounds;
    masterplan05Zone: string;
  }>;
  masterplan05OwnedPlacementAndAdditions: {
    zones: string[];
    gateway: Point;
    grandAvenue: { from: Point; to: Point };
    emptyEight: {
      bounds: Bounds;
      railY: number;
      trackCount: number;
      platformCount: number;
      trackOrientation: string;
      sealedInterfaceDirection: string;
      separateReleaseScope: boolean;
    };
  };
  supersededPlacementArtifacts: Array<{ path: string; reason: string }>;
  normalizedMasterplan04: {
    contactLocalY: number;
    conflictResolution: {
      nonControllingContactDatums: Array<{
        localY: number;
        documents: string[];
      }>;
    };
  };
  planToDevelop: {
    path: string;
    sha256: string;
    currentPhase: string;
    nextPhase: string;
    constructionPackageExists: boolean;
    worldEditAuthorized: boolean;
  };
}

interface Masterplan04Coordinates {
  authority: {
    role: string;
    coordinateSpace: string;
    currentWorldPlacementAuthority: string;
    worldEditAuthorized: boolean;
  };
  key_locations: Record<string, Point>;
  individual_sites: {
    subtropolis: { footprint: LocalBounds };
    cheyenne_mountain: { footprint: LocalBounds; chamber_position: LocalBounds };
    houston_tunnel: { footprint: LocalBounds };
  };
  mountain_range: { footprint: Bounds; no_ravine: boolean };
}

interface Zone {
  id: string;
  bounds?: Bounds;
  top?: Point;
  observationLanding?: Point;
  lowerLobbyStudy?: Point;
  from?: Point;
  contact?: Point;
  to?: Point;
  center?: Point;
  summit?: Point;
  sourceRelationship?: string;
  hiddenSubway?: {
    terminal: {
      bounds: Bounds;
      railY: number;
      trackCount: number;
      platformCount: number;
      trackCenterlinesZ: number[];
      futureInterfaces: {
        eastStubX: number;
        westThroatX: number;
      };
    };
  };
}

interface Masterplan05Coordinates {
  status: string;
  authorityModel: {
    kind: string;
    chain: string;
    domains: {
      masterplan05OwnedZones: string[];
      masterplan04DerivedZones: string[];
    };
    worldEditAuthorized: boolean;
  };
  coordinateSemantics: {
    planningBounds: string;
    blockRoundingPolicy: null;
  };
  acceptedBaseline: {
    database: {
      featureUnion: Bounds;
    };
  };
  transform: {
    topDown: {
      rotationDegrees: number;
      worldX: string;
      worldZ: string;
    };
    vertical: {
      activeForBuild: boolean;
      streetY: number;
      belowStreet: string;
      aboveStreet: string;
      mappedLevels: Array<{ name: string; localY: number; worldY: number }>;
    };
  };
  identityCorrections: {
    canonicalOldTown: {
      name: string;
      replicaRequired: boolean;
    };
  };
  zones: Zone[];
}

interface MapQa {
  input: {
    acceptedCurrentRaster: ArtifactBinding;
    coordinateRegistry: ArtifactBinding;
    authorityReconciliation: ArtifactBinding;
  };
  outputs: {
    [name: string]: ArtifactBinding;
    phase0OverlayPng: ArtifactBinding & { blocksPerPixel: number; north: string };
    surveyEvidence: ArtifactBinding;
    corridorClearance: ArtifactBinding;
  };
}

const reconciliation = readJson<Reconciliation>(
  'masterplans/04-combined-complex/authority-reconciliation.json',
);
const masterplan04 = readJson<Masterplan04Coordinates>(
  'masterplans/04-combined-complex/02-design/site-coordinates.json',
);
const masterplan05 = readJson<Masterplan05Coordinates>(
  'masterplans/05-combined-zones/site-coordinates.json',
);

function zone(id: string): Zone {
  const result = masterplan05.zones.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`missing Masterplan 05 zone ${id}`);
  return result;
}

function verticalScale(formula: string): number {
  const match = formula.match(/([0-9.]+) \* localY/);
  if (!match) throw new Error(`invalid vertical formula: ${formula}`);
  return Number(match[1]);
}

function transform(point: Point): Point {
  const { x: originX, z: originZ } = reconciliation.placementBridge.topDown.origin;
  const vertical = masterplan05.transform.vertical;
  const scale = point.y <= 0
    ? verticalScale(vertical.belowStreet)
    : verticalScale(vertical.aboveStreet);
  return {
    x: originX + point.x,
    y: vertical.streetY + scale * point.y,
    z: originZ + point.z,
  };
}

function transformBounds(bounds: Bounds): Bounds {
  const low = transform({ x: bounds.minX, y: bounds.minY ?? 0, z: bounds.minZ });
  const high = transform({ x: bounds.maxX, y: bounds.maxY ?? 0, z: bounds.maxZ });
  return {
    minX: low.x,
    maxX: high.x,
    ...(bounds.minY === undefined ? {} : { minY: low.y }),
    ...(bounds.maxY === undefined ? {} : { maxY: high.y }),
    minZ: low.z,
    maxZ: high.z,
  };
}

describe('Masterplans 01-03 -> 04 -> 05 authority reconciliation', () => {
  it('binds every scoped source and keeps construction fail-closed', () => {
    expect(reconciliation).toMatchObject({
      schemaVersion: 1,
      status: 'RECONCILED_FOR_DETAILED_DESIGN_NOT_AUTHORIZED_FOR_WORLD_EDITS',
      worldEditAuthorized: false,
      authorityModel: {
        kind: 'field-scoped-composition',
        composition: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
      },
      planToDevelop: {
        path: 'masterplans/05-combined-zones/MASTERPLAN.md',
        currentPhase: 'PHASE_1_COORDINATION_PARTIAL_PASS_BUILD_HOLD',
        nextPhase: 'PHASE_1_CLOSE_GEOMETRY_SITE_AND_RELEASE_GATES',
        constructionPackageExists: false,
        worldEditAuthorized: false,
      },
    });
    expect(reconciliation.planToDevelop.sha256).toBe(sha256(reconciliation.planToDevelop.path));

    const bindings: ArtifactBinding[] = [
      ...reconciliation.canonicalSources.childArchitecture,
      reconciliation.canonicalSources.normalizedComposition.coordinateRegistry,
      reconciliation.canonicalSources.normalizedComposition.contractorBrief,
      reconciliation.canonicalSources.currentWorldPlacement.coordinateRegistry,
      reconciliation.canonicalSources.currentWorldPlacement.phase0Evidence,
      reconciliation.canonicalSources.currentWorldPlacement.authoritativeMap,
    ];
    for (const binding of bindings) {
      expect(binding.sha256, binding.path).toMatch(/^[a-f0-9]{64}$/);
      expect(sha256(binding.path), binding.path).toBe(binding.sha256);
    }

    expect(masterplan04.authority).toMatchObject({
      role: 'normalized-masterplan-04-architectural-composition',
      coordinateSpace: 'local-not-current-world-setout',
      currentWorldPlacementAuthority: 'masterplans/05-combined-zones/site-coordinates.json',
      worldEditAuthorized: false,
    });
    expect(masterplan05.authorityModel).toMatchObject({
      kind: 'field-scoped-composition',
      chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
      worldEditAuthorized: false,
    });
    expect(masterplan05.coordinateSemantics.blockRoundingPolicy).toBeNull();
    expect(masterplan05.transform.vertical.activeForBuild).toBe(false);
    expect(reconciliation.normalizedMasterplan04).toMatchObject({
      contactLocalY: 200,
      conflictResolution: {
        nonControllingContactDatums: [
          {
            localY: 100,
            documents: [
              'masterplans/04-combined-complex/02-design/design-plan.md',
              'masterplans/04-combined-complex/02-design/development-plan.md',
              'masterplans/04-combined-complex/02-design/working-plan.md',
            ],
          },
          {
            localY: 400,
            documents: [
              'masterplans/04-combined-complex/02-design/discussion-notes.md',
            ],
          },
        ],
      },
    });
    for (const datum of reconciliation.normalizedMasterplan04.conflictResolution
      .nonControllingContactDatums) {
      for (const document of datum.documents) {
        expect(fs.readFileSync(path.join(ROOT, document), 'utf8'), document)
          .toMatch(/authority notice/i);
      }
    }
    for (const childReport of [
      'masterplans/01-cheyenne-mountain-complex/masterplan.html',
      'masterplans/02-subtropolis/masterplan.html',
      'masterplans/02-subtropolis/_build/masterplan.html',
      'masterplans/03-houston-tunnel-system/masterplan.html',
    ]) {
      const report = fs.readFileSync(path.join(ROOT, childReport), 'utf8');
      expect(report, childReport).toContain('AUTHORITY NOTICE');
      expect(report, childReport).toContain('Masterplan 05');
      expect(report, childReport).toContain('no construction is authorized');
    }
  });

  it('maps every canonical 04 anchor exactly into the 05 world study', () => {
    expect(reconciliation.coordinateCrosswalk.map(({ id }) => id)).toEqual([
      'houston-origin',
      'public-shaft-head',
      'public-shaft-observation-landing',
      'public-shaft-lower-lobby',
      'subtropolis-horizontal-portal',
      'service-start',
      'service-contact',
      'cheyenne-outer-portal',
      'cheyenne-chamber-center',
      'summit',
    ]);
    expect(reconciliation.placementBridge.topDown).toMatchObject({
      origin: { x: 2048, z: -328 },
      rotationDegrees: 0,
    });
    expect(masterplan05.transform.topDown).toMatchObject({
      rotationDegrees: 0,
      worldX: '2048 + localX',
      worldZ: '-328 + localZ',
    });
    expect(reconciliation.placementBridge.verticalStudy).toMatchObject({
      streetY: 72,
      belowStreet: '72 + 1.28 * localY',
      aboveStreet: '72 + 0.29 * localY',
      activeForBuild: false,
      blockRoundingPolicy: null,
    });
    expect(masterplan05.transform.vertical).toMatchObject({
      streetY: 72,
      belowStreet: 'worldY = 72 + 1.28 * localY for localY <= 0',
      aboveStreet: 'worldY = 72 + 0.29 * localY for localY >= 0',
      activeForBuild: false,
      mappedLevels: [
        { name: 'design minimum', localY: -100, worldY: -56 },
        { name: 'shaft observation landing', localY: -50, worldY: 8 },
        { name: 'city street', localY: 0, worldY: 72 },
        { name: 'granite-limestone contact', localY: 200, worldY: 130 },
        { name: 'Cheyenne chamber low', localY: 250, worldY: 144.5 },
        { name: 'Cheyenne chamber center', localY: 325, worldY: 166.25 },
        { name: 'Cheyenne chamber high', localY: 400, worldY: 188 },
        { name: 'summit', localY: 800, worldY: 304 },
      ],
    });

    for (const crosswalk of reconciliation.coordinateCrosswalk) {
      const sourceKey = crosswalk.sourcePath.replace('key_locations.', '');
      expect(masterplan04.key_locations[sourceKey], crosswalk.id).toMatchObject(
        crosswalk.local,
      );
      expect(transform(crosswalk.local), crosswalk.id).toEqual(crosswalk.worldStudy);
    }

    expect(zone('Z06')).toMatchObject({
      top: { x: 2108, y: 72, z: -398 },
      observationLanding: { x: 2108, y: 8, z: -398 },
      lowerLobbyStudy: { x: 2108, y: -56, z: -428 },
    });
    expect(zone('Z08')).toMatchObject({
      from: { x: 1948, y: 72, z: -628 },
      contact: { x: 2008, y: 130, z: -688 },
      to: { x: 2048, y: 130, z: -748 },
    });
    expect(zone('Z10').center).toEqual({ x: 2048, y: 166.25, z: -868 });
    expect(zone('Z11').summit).toMatchObject({ x: 2048, y: 304, z: -828 });
  });

  it('maps canonical 04 envelopes while leaving cell compilation unresolved', () => {
    expect(masterplan04.mountain_range.no_ravine).toBe(true);
    expect(reconciliation.placementBridge.boundsSemantics.compiledCellSetsAuthorized)
      .toBe(false);

    expect(reconciliation.envelopeCrosswalk.map(({ id }) => id)).toEqual([
      'houston-city',
      'subtropolis',
      'continuous-mountain',
      'cheyenne-chamber',
    ]);
    for (const crosswalk of reconciliation.envelopeCrosswalk) {
      expect(transformBounds(crosswalk.sourceLocal), crosswalk.id)
        .toEqual(crosswalk.worldStudy);
      expect(zone(crosswalk.masterplan05Zone).bounds, crosswalk.id)
        .toEqual(crosswalk.worldStudy);
    }

    const childHouston = readJson<{
      build_extent: { above_ground: LocalBounds };
    }>('masterplans/03-houston-tunnel-system/06-contractor/contractor-brief.json');
    const houstonSource = childHouston.build_extent.above_ground;
    const houstonCenterX = (houstonSource.x_min + houstonSource.x_max) / 2;
    const houstonCenterZ = (houstonSource.z_min + houstonSource.z_max) / 2;
    expect(reconciliation.envelopeCrosswalk.find(({ id }) => id === 'houston-city'))
      .toMatchObject({
        sourcePath: 'masterplans/03-houston-tunnel-system/06-contractor/contractor-brief.json#build_extent.above_ground',
        sourceLocal: {
          minX: houstonSource.x_min - houstonCenterX,
          maxX: houstonSource.x_max - houstonCenterX,
          minZ: houstonSource.z_min - houstonCenterZ,
          maxZ: houstonSource.z_max - houstonCenterZ,
        },
      });
    expect(normalizeLocalBounds(masterplan04.individual_sites.subtropolis.footprint)).toEqual(
      reconciliation.envelopeCrosswalk.find(({ id }) => id === 'subtropolis')?.sourceLocal,
    );
    expect(normalizeLocalBounds(masterplan04.mountain_range.footprint)).toEqual(
      reconciliation.envelopeCrosswalk.find(({ id }) => id === 'continuous-mountain')?.sourceLocal,
    );
    expect(normalizeLocalBounds(masterplan04.individual_sites.cheyenne_mountain.chamber_position)).toEqual(
      reconciliation.envelopeCrosswalk.find(({ id }) => id === 'cheyenne-chamber')?.sourceLocal,
    );
  });

  it('keeps 05-owned adapters and Empty Eight distinct from transformed 04 architecture', () => {
    expect(reconciliation.masterplan05OwnedPlacementAndAdditions.zones).toEqual([
      'Z00',
      'Z01',
      'Z02',
      'Z02-U1',
      'Z03',
    ]);
    expect(masterplan05.authorityModel.domains.masterplan05OwnedZones).toEqual([
      'Z00',
      'Z01',
      'Z02',
      'Z02-U1',
      'Z03',
    ]);
    expect(masterplan05.identityCorrections.canonicalOldTown).toMatchObject({
      name: 'Ravensreach',
      replicaRequired: false,
    });

    const terminal = zone('Z02').hiddenSubway?.terminal;
    expect(terminal).toMatchObject({
      bounds: { minX: 1632, maxX: 1872, minY: 38, maxY: 54, minZ: 40, maxZ: 160 },
      railY: 40,
      trackCount: 8,
      platformCount: 8,
      futureInterfaces: { westThroatX: 1632, eastStubX: 1872 },
    });
    expect(terminal?.trackCenterlinesZ).toEqual([54, 67, 80, 93, 106, 119, 132, 145]);
    expect(reconciliation.masterplan05OwnedPlacementAndAdditions.emptyEight).toMatchObject({
      trackOrientation: 'east-west',
      sealedInterfaceDirection: 'east',
      separateReleaseScope: true,
    });
  });

  it('binds the authoritative map to exact current registry data', () => {
    const mapQa = readJson<MapQa>('masterplans/05-combined-zones/map-qa.json');
    const evidence = readJson<{
      authorityInputs: {
        coordinateRegistry: ArtifactBinding;
        candidateAnalysis: ArtifactBinding;
      };
      artifacts: ArtifactBinding[];
    }>('masterplans/05-combined-zones/phase0-survey-evidence.json');
    const mapBinding = reconciliation.canonicalSources.currentWorldPlacement.authoritativeMap;
    const registryBinding = reconciliation.canonicalSources.currentWorldPlacement.coordinateRegistry;

    expect(masterplan05.acceptedBaseline.database.featureUnion).toMatchObject({
      minX: -714,
      maxX: 1300,
      minZ: -719,
      maxZ: 311.5,
    });
    expect(mapQa.input.coordinateRegistry).toEqual(registryBinding);
    expect(mapQa.input.authorityReconciliation).toEqual({
      path: 'masterplans/04-combined-complex/authority-reconciliation.json',
      sha256: sha256('masterplans/04-combined-complex/authority-reconciliation.json'),
    });
    expect(mapQa.input.acceptedCurrentRaster.sha256)
      .toBe(sha256(mapQa.input.acceptedCurrentRaster.path));
    expect(mapQa.outputs.phase0OverlayPng).toMatchObject(mapBinding);
    for (const output of Object.values(mapQa.outputs)) {
      expect(output.sha256, output.path).toBe(sha256(output.path));
    }
    expect(evidence.authorityInputs.coordinateRegistry).toEqual(registryBinding);
    expect(evidence.authorityInputs.candidateAnalysis.sha256)
      .toBe(sha256(evidence.authorityInputs.candidateAnalysis.path));
    for (const artifact of evidence.artifacts) {
      expect(artifact.sha256, artifact.path).toBe(sha256(artifact.path));
    }
    expect(evidence.artifacts).toContainEqual(expect.objectContaining({
      path: mapBinding.path,
      sha256: mapBinding.sha256,
    }));

    const generator = fs.readFileSync(
      path.join(ROOT, 'scripts/generate_combined_zones_phase0_survey.mjs'),
      'utf8',
    );
    expect(generator).toContain('registry.acceptedBaseline.database.featureUnion');
    expect(generator).toContain('NORTH-ALIGNED CORE · 0°');
    expect(generator).not.toContain("GRAND-AVENUE-CROSSING");
    expect(generator).not.toContain("['ROTATED CORE'");
  });

  it('keeps superseded diagrams and the 04 annex outside active deliverables', () => {
    const buildInfo = readJson<{ deliverables: string[] }>(
      'masterplans/05-combined-zones/build-info.json',
    );
    const mapQa = readJson<MapQa>('masterplans/05-combined-zones/map-qa.json');
    const mapReadme = fs.readFileSync(
      path.join(ROOT, 'masterplans/05-combined-zones/maps/README.md'),
      'utf8',
    );
    const activeOutputPaths = Object.values(mapQa.outputs).map(({ path: outputPath }) => outputPath);

    const expectedRetiredPaths = [
      'masterplans/04-combined-complex/01-research/map-integration',
      'masterplans/04-combined-complex/02-design/map-integration',
      'masterplans/04-combined-complex/03-visuals/modules/map-integration',
      'masterplans/04-combined-complex/03-visuals/references/map-integration',
      'masterplans/04-combined-complex/04-contractor/map-integration',
      'masterplans/04-combined-complex/build-info-map-integration.json',
      'masterplans/04-combined-complex/map-integration-report.html',
      'masterplans/04-combined-complex/overhead-map-same-world.png',
      'masterplans/05-combined-zones/maps/current-and-proposed-whole-world.png',
      'masterplans/05-combined-zones/maps/current-and-proposed-whole-world.svg',
      'masterplans/05-combined-zones/maps/east-corridor-plan.png',
      'masterplans/05-combined-zones/maps/east-corridor-plan.svg',
      'masterplans/05-combined-zones/maps/gateway-approach-and-terminal-plan.png',
      'masterplans/05-combined-zones/maps/gateway-approach-and-terminal-plan.svg',
      'masterplans/05-combined-zones/maps/vertical-zoning-section.png',
      'masterplans/05-combined-zones/maps/vertical-zoning-section.svg',
    ];
    expect(reconciliation.supersededPlacementArtifacts.map(({ path: retiredPath }) => retiredPath))
      .toEqual(expectedRetiredPaths);
    for (const retired of reconciliation.supersededPlacementArtifacts) {
      expect(retired.reason.length).toBeGreaterThan(20);
      expect(fs.existsSync(path.join(ROOT, retired.path)), retired.path).toBe(true);
    }
    for (const filename of [
      'current-and-proposed-whole-world.png',
      'current-and-proposed-whole-world.svg',
      'east-corridor-plan.png',
      'east-corridor-plan.svg',
      'gateway-approach-and-terminal-plan.png',
      'gateway-approach-and-terminal-plan.svg',
      'vertical-zoning-section.png',
      'vertical-zoning-section.svg',
    ]) {
      expect(mapReadme).toContain(filename);
      expect(buildInfo.deliverables).not.toContain(`maps/${filename}`);
      expect(activeOutputPaths).not.toContain(`masterplans/05-combined-zones/maps/${filename}`);
    }

    const historicalRegistry = readJson<{
      authority: { status: string; worldEditAuthorized: boolean };
    }>('masterplans/04-combined-complex/02-design/map-integration/site-coordinates.json');
    const historicalContractor = readJson<{
      authority: { status: string; executableAsWritten: boolean };
    }>('masterplans/04-combined-complex/04-contractor/map-integration/contractor-brief.json');
    const historicalBuildInfo = readJson<{
      authority: { status: string; worldEditAuthorized: boolean };
      deliverables: Record<string, string>;
    }>('masterplans/04-combined-complex/build-info-map-integration.json');
    const normalizedBuildInfo = readJson<{
      deliverables: Record<string, string>;
      report_metadata: { pdfPublished: boolean };
    }>('masterplans/04-combined-complex/build-info.json');
    const historicalRenderingManifest = readJson<{
      authority: { status: string; worldEditAuthorized: boolean; measuredGeometry: boolean };
    }>('masterplans/04-combined-complex/03-visuals/modules/map-integration/renderings-manifest.json');
    expect(historicalRegistry.authority).toMatchObject({
      status: 'SUPERSEDED_FOR_CURRENT_WORLD_PLACEMENT',
      worldEditAuthorized: false,
    });
    expect(historicalContractor.authority).toMatchObject({
      status: 'SUPERSEDED_FOR_CURRENT_WORLD_PLACEMENT',
      executableAsWritten: false,
    });
    expect(historicalBuildInfo.authority).toMatchObject({
      status: 'SUPERSEDED_FOR_CURRENT_WORLD_PLACEMENT',
      worldEditAuthorized: false,
    });
    expect(historicalRenderingManifest.authority).toMatchObject({
      status: 'SUPERSEDED_FOR_CURRENT_WORLD_PLACEMENT',
      measuredGeometry: false,
      worldEditAuthorized: false,
    });
    expect(normalizedBuildInfo.report_metadata.pdfPublished).toBe(false);
    for (const relativeDeliverable of [
      ...Object.values(normalizedBuildInfo.deliverables),
      ...Object.values(historicalBuildInfo.deliverables),
    ]) {
      expect(
        fs.existsSync(path.join(ROOT, 'masterplans/04-combined-complex', relativeDeliverable)),
        relativeDeliverable,
      ).toBe(true);
    }
    for (const reportPath of [
      'masterplans/04-combined-complex/combined-complex-report.html',
      'masterplans/04-combined-complex/map-integration-report.html',
    ]) {
      const report = fs.readFileSync(path.join(ROOT, reportPath), 'utf8');
      expect(report, reportPath).not.toContain('combined-complex-report.pdf');
      expect(report, reportPath).not.toContain('map-integration-report.pdf');
    }
  });

  it('binds corridor clearance to the actual sealed POI directory', () => {
    const clearance = readJson<{
      source: { poiDirectory: string; poiSha256: string; catalogRecords: number };
    }>('masterplans/05-combined-zones/corridor-clearance.json');
    expect(clearance.source).toMatchObject({
      poiDirectory: 'docs/redevelopment/2026-07-29-poi-coordinate-directory/poi-coordinate-directory.json',
      poiSha256: sha256(clearance.source.poiDirectory),
      catalogRecords: 1215,
    });
  });

  it('parses every machine-readable artifact under masterplans', () => {
    const files = jsonFiles(path.join(ROOT, 'masterplans'));
    expect(files.length).toBeGreaterThanOrEqual(28);
    for (const filename of files) {
      expect(() => JSON.parse(fs.readFileSync(filename, 'utf8')), filename).not.toThrow();
    }
  });
});
