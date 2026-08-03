import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  buildMediaPackage,
  C01_REPRESENTATIVE_CAMERA_BY_OBJECT,
  C01_STANDING_EYE_HEIGHT_BLOCKS,
  classifyObjectId,
  escapeJsonPointerSegment,
  FAMILY_DEFINITIONS,
  GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT,
  REVIEWED_POST_SNAPSHOT_OBJECT_CAMERAS,
  REVIEWED_POST_SNAPSHOT_SCHEDULE_CAMERAS,
  SALES_OFFICE_CAMERA_OBJECT_BY_SHOT,
} from '../../scripts/generate_town_expansion_media_manifest.mjs';
import {
  validateMediaReleaseContract,
} from '../../scripts/qa_town_expansion_media_release.mjs';

const ROOT = path.resolve(__dirname, '../..');
const REPORT_PATH = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-2026-07-28.report.json',
);
const DATABASE_PATH = path.join(ROOT, 'data/world-map.db');
const C01_SCHEDULE_PATH = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'c01-bunker-classification-manifest.json',
);
const C01_CAMERA_PREFLIGHT_PATH = path.join(
  ROOT,
  'data/world-review/town-expansion-c01-camera-preflight-20260728.json',
);
const SALES_OFFICE_CAMERA_PREFLIGHT_PATH = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-sales-office-camera-preflight-20260728.json',
);
const GILDED_RAVEN_CAMERA_PREFLIGHT_PATH = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-gilded-raven-camera-preflight-20260728.json',
);
const FINAL_POST_SNAPSHOT_PATH = path.join(
  ROOT,
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
);

function readJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function dereferenceJsonPointer(value: any, pointer: string) {
  if (pointer === '') return value;
  if (!pointer.startsWith('/')) throw new Error(`invalid JSON pointer ${pointer}`);
  return pointer.slice(1).split('/').reduce((current, rawSegment) => {
    const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
    return current?.[segment];
  }, value);
}

function normalizeBounds(value: any) {
  const raw = Array.isArray(value)
    ? value
    : [
        value.minX,
        value.minY,
        value.minZ,
        value.maxX,
        value.maxY,
        value.maxZ,
      ];
  return [
    Math.min(raw[0], raw[3]),
    Math.min(raw[1], raw[4]),
    Math.min(raw[2], raw[5]),
    Math.max(raw[0], raw[3]),
    Math.max(raw[1], raw[4]),
    Math.max(raw[2], raw[5]),
  ];
}

describe('Town Expansion R1 deterministic media contract', () => {
  it('covers every requested district with exact report/database objects', () => {
    const compilerReport = readJson(REPORT_PATH);
    const media = buildMediaPackage({
      report: compilerReport,
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
    });
    const counts = media.combined.counts;

    expect(counts.exactObjects).toBeGreaterThanOrEqual(300);
    expect(counts.shots).toBeGreaterThanOrEqual(500);
    expect(counts.maps).toBe(FAMILY_DEFINITIONS.length + 1);
    expect(counts.authoredDetailShots).toBe(243);
    expect(counts.pass1Captures).toBe(counts.shots);
    expect(counts.pass2Captures).toBe(counts.shots);
    expect(counts.combinedCaptures).toBe(counts.shots * 2);
    expect(Object.values(counts.familyObjects).every(
      (count) => Number(count) > 0,
    )).toBe(true);
    const crosswalkSha256 = crypto
      .createHash('sha256')
      .update(`${JSON.stringify(media.crosswalk, null, 2)}\n`)
      .digest('hex');
    expect(media.combined.objectCrosswalk).toMatchObject({
      path: 'object-media-database-crosswalk.json',
      sha256: crosswalkSha256,
      objectCount: counts.exactObjects,
    });
    const objectIds = new Set(
      media.crosswalk.objects.map((object: { objectId: string }) => object.objectId),
    );
    const visualCompilerScopes = compilerReport.operations.scopeSummary.filter(
      (scope: { scope: string; targetCells: number }) => (
        scope.targetCells > 0
        && !/:PROTECTED-BE-MIGRATION$/.test(scope.scope)
      ),
    );
    expect(visualCompilerScopes.every(
      (scope: { scope: string }) => objectIds.has(scope.scope),
    )).toBe(true);
    expect(
      media.crosswalk.coverageContracts.c01.requiredScopeIds.every(
        (objectId: string) => objectIds.has(objectId),
      ),
    ).toBe(true);
    expect(media.crosswalk.objects.every((object: {
      bounds: number[];
      provenance: { file?: string; type: string };
      database: { fabricatedRelationship: boolean };
      truth: {
        releaseState: string;
        plannedOnly: boolean;
        physicalClaim: string;
      };
      capturePairs: unknown[];
    }) => (
      object.bounds.length === 6
      && object.bounds.every(Number.isFinite)
      && Boolean(object.provenance.file)
      && object.database.fabricatedRelationship === false
      && object.truth.releaseState === 'GENERATED_OFFLINE_NOT_YET_VERIFIED'
      && object.truth.plannedOnly === false
      && object.truth.physicalClaim.length > 40
      && object.capturePairs.length > 0
    ))).toBe(true);
  });

  it('pairs every shot with identical geometry and distinct pass outputs', () => {
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
    });
    const firstByShot = new Map(
      media.pass1.cameras.map((camera: { shotId: string }) => [
        camera.shotId,
        camera,
      ]),
    );
    const secondByShot = new Map(
      media.pass2.cameras.map((camera: { shotId: string }) => [
        camera.shotId,
        camera,
      ]),
    );

    expect(firstByShot.size).toBe(media.combined.counts.shots);
    expect(secondByShot.size).toBe(firstByShot.size);
    expect([...firstByShot].every(([shotId, first]: [string, any]) => {
      const second: any = secondByShot.get(shotId);
      return second
        && first.id !== second.id
        && first.output !== second.output
        && first.primaryFeatureId === second.primaryFeatureId
        && first.mode === second.mode
        && first.maxDistance === second.maxDistance
        && JSON.stringify(first.eye ?? null) === JSON.stringify(second.eye ?? null)
        && JSON.stringify(first.lookAt ?? null)
          === JSON.stringify(second.lookAt ?? null)
        && JSON.stringify(first.center ?? null)
          === JSON.stringify(second.center ?? null)
        && first.span === second.span;
    })).toBe(true);
    const objectsById = new Map(
      media.crosswalk.objects.map((object: {
        objectId: string;
        bounds: number[];
      }) => [object.objectId, object]),
    );
    expect(media.pass1.cameras.every((camera: any) => {
      if (camera.mode === 'map') return true;
      const object: any = objectsById.get(camera.primaryFeatureId);
      const [x, y, z] = camera.lookAt;
      const [minX, minY, minZ, maxX, maxY, maxZ] = object.bounds;
      return (
        x >= minX && x <= maxX
        && y >= minY && y <= maxY
        && z >= minZ && z <= maxZ
      );
    })).toBe(true);

    const scheduleShots = media.combined.cameras.filter(
      (camera: { id: string; evidencePass: number }) =>
        camera.id.startsWith('SCHEDULE-CAM-') && camera.evidencePass === 1,
    );
    expect(scheduleShots).toHaveLength(165);
  });

  it('uses reviewed terminal-snapshot cameras for known interior rejects', () => {
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
    });
    const pass1ByFeature = new Map(
      media.pass1.cameras.map((camera: {
        primaryFeatureId: string;
        eye?: number[];
        lookAt?: number[];
        fov?: number;
        cameraBasis?: string;
      }) => [camera.primaryFeatureId, camera]),
    );
    const allCaptures = [...media.pass1.cameras, ...media.pass2.cameras];

    for (const [objectId, reviewed] of Object.entries(
      REVIEWED_POST_SNAPSHOT_OBJECT_CAMERAS,
    )) {
      const captures = allCaptures.filter(
        (camera: { primaryFeatureId: string }) =>
          camera.primaryFeatureId === objectId,
      );
      expect(captures).toHaveLength(2);
      for (const camera of captures) {
        expect(camera).toMatchObject({
          primaryFeatureId: objectId,
          eye: [...reviewed.eye],
          lookAt: [...reviewed.lookAt],
          fov: reviewed.fov,
          cameraBasis:
            'reviewed-terminal-c39d-post-snapshot-occupancy-los-quality-pass',
        });
      }
    }

    for (const [cameraId, reviewed] of Object.entries(
      REVIEWED_POST_SNAPSHOT_SCHEDULE_CAMERAS,
    )) {
      const captures = allCaptures.filter(
        (camera: { shotId: string }) =>
          camera.shotId === `SCHEDULE-${cameraId}`,
      );
      expect(captures).toHaveLength(2);
      for (const camera of captures) {
        expect(camera).toMatchObject({
          eye: [...reviewed.eye],
          lookAt: [...reviewed.lookAt],
          fov: reviewed.fov,
          cameraBasis:
            'reviewed-terminal-c39d-post-snapshot-occupancy-los-quality-pass',
        });
      }
    }

    const portalPass1 = [...pass1ByFeature.values()].filter(
      (camera) => /^TE-OBS-PORTAL-/.test(camera.primaryFeatureId),
    );
    expect(portalPass1).toHaveLength(10);
    expect(portalPass1.every((camera) => (
      camera.fov === 72
      && camera.cameraBasis
        !== 'deterministic-context-from-exact-bounds'
      && (
        camera.cameraBasis
          === 'deterministic-interior-from-exact-bounds'
        || camera.cameraBasis
          === 'reviewed-terminal-c39d-post-snapshot-occupancy-los-quality-pass'
      )
    ))).toBe(true);
  });

  it('converts every C01 authored foot coordinate to a validated standing-eye camera', () => {
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
    });
    const schedule = readJson(C01_SCHEDULE_PATH);
    const pass1ByShot = new Map(
      media.pass1.cameras.map((camera: { shotId: string }) => [
        camera.shotId,
        camera,
      ]),
    );
    const objectsById = new Map(
      media.crosswalk.objects.map((object: {
        objectId: string;
        bounds: number[];
      }) => [object.objectId, object]),
    );
    const contains = (point: number[], rawBounds: any) => {
      const bounds = normalizeBounds(rawBounds);
      return (
        point[0] >= bounds[0] && point[0] <= bounds[3]
        && point[1] >= bounds[1] && point[1] <= bounds[4]
        && point[2] >= bounds[2] && point[2] <= bounds[5]
      );
    };

    expect(C01_STANDING_EYE_HEIGHT_BLOCKS).toBe(1.62);
    expect(schedule.evidenceCameras).toHaveLength(165);
    expect(schedule.evidenceCameras.every((source: any, index: number) => {
      const camera: any = pass1ByShot.get(`SCHEDULE-${source.id}`);
      const object: any = objectsById.get(camera?.primaryFeatureId);
      const containingLevels = schedule.levels.filter((level: any) => (
        level.auditVolumeBoxes.some(
          (bounds: any) => contains(camera.eye, bounds),
        )
        && level.auditVolumeBoxes.some(
          (bounds: any) => contains(camera.lookAt, bounds),
        )
      ));
      return (
        camera
        && object
        && camera.eye[0] === source.position[0]
        && camera.eye[1] === Number((
          source.position[1] + C01_STANDING_EYE_HEIGHT_BLOCKS
        ).toFixed(2))
        && camera.eye[2] === source.position[2]
        && camera.lookAt[0] === source.target[0]
        && camera.lookAt[1] === Number((
          source.target[1] + C01_STANDING_EYE_HEIGHT_BLOCKS
        ).toFixed(2))
        && camera.lookAt[2] === source.target[2]
        && camera.cameraBasis.endsWith(':foot-to-eye')
        && camera.coordinateProvenance.sourceJsonPointer
          === `/evidenceCameras/${index}`
        && camera.coordinateProvenance.sourceConvention
          === 'interior-standing-foot-position'
        && camera.coordinateProvenance.transform.axis === 'y'
        && camera.coordinateProvenance.transform.operation === 'add'
        && camera.coordinateProvenance.transform.blocks
          === C01_STANDING_EYE_HEIGHT_BLOCKS
        && JSON.stringify(camera.coordinateProvenance.transform.appliedTo)
          === JSON.stringify(['eye', 'lookAt'])
        && camera.coordinateProvenance.validation
          .sourcePointsInsideExactObjectBounds === true
        && camera.coordinateProvenance.validation
          .transformedPointsInsideExactObjectBounds === true
        && camera.coordinateProvenance.validation
          .transformedPointsInsideAuditClearVolume === true
        && Boolean(
          camera.coordinateProvenance.validation.auditClearVolumeLevelId,
        )
        && camera.primaryFeatureId
          === camera.coordinateProvenance.validation.exactObjectId
        && contains(source.position, object.bounds)
        && contains(source.target, object.bounds)
        && contains(camera.eye, object.bounds)
        && contains(camera.lookAt, object.bounds)
        && containingLevels.length === 1
        && containingLevels[0].id
          === camera.coordinateProvenance.validation.auditClearVolumeLevelId
      );
    })).toBe(true);

    expect(media.crosswalk.cameraCoordinateAudit.c01).toMatchObject({
      sourceConvention: 'interior-standing-foot-position',
      transform: {
        axis: 'y',
        operation: 'add',
        blocks: 1.62,
        appliedTo: ['eye', 'lookAt'],
      },
      scheduledCamerasAudited: 165,
      transformedCameras: 165,
      allSourcePointsInsideExactObjectBounds: true,
      allTransformedPointsInsideExactObjectBounds: true,
      allTransformedPointsInsideAuditClearVolume: true,
      representativeObjectCameras: {
        c01_east_l1_security_garage: {
          cameraId: 'CAM-l1-secure-vehicle-garage',
          shotId: 'OBJECT-c01_east_l1_security_garage',
        },
      },
    });

    const expectedEye = [800, 43.62, -137];
    const expectedLookAt = [858, 43.62, -137];
    const representativePasses = [
      media.pass1.cameras.find(
        (camera: { id: string }) =>
          camera.id === 'OBJECT-c01_east_l1_security_garage-PASS-1',
      ),
      media.pass2.cameras.find(
        (camera: { id: string }) =>
          camera.id === 'OBJECT-c01_east_l1_security_garage-PASS-2',
      ),
    ];
    expect(representativePasses).toHaveLength(2);
    expect(representativePasses.every((camera: any) => (
      JSON.stringify(camera.eye) === JSON.stringify(expectedEye)
      && JSON.stringify(camera.lookAt) === JSON.stringify(expectedLookAt)
      && camera.cameraBasis.endsWith(':representative-foot-to-eye')
      && camera.coordinateProvenance.representativeForObjectId
        === 'c01_east_l1_security_garage'
      && camera.coordinateProvenance.validation
        .transformedPointsInsideExactObjectBounds === true
      && camera.coordinateProvenance.validation
        .transformedPointsInsideAuditClearVolume === true
    ))).toBe(true);
  });

  it('binds all C01 rows and eight object shots to immutable-post preflight', () => {
    const preflight = readJson(C01_CAMERA_PREFLIGHT_PATH);
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
      c01CameraPreflightPath: C01_CAMERA_PREFLIGHT_PATH,
    });
    const preflightById = new Map(
      preflight.cameras.map((result: { cameraId: string }) => [
        result.cameraId,
        result,
      ]),
    );
    const objectPreflightById = new Map(
      preflight.objectCameras.map((result: { objectId: string }) => [
        result.objectId,
        result,
      ]),
    );
    const pass1ByShot = new Map(
      media.pass1.cameras.map((camera: { shotId: string }) => [
        camera.shotId,
        camera,
      ]),
    );

    expect(preflight).toMatchObject({
      status: 'PASS',
      counts: {
        scheduledCameras: 165,
        passedCameras: 165,
        failedCameras: 0,
        objectCameras: 8,
        passedObjectCameras: 8,
        failedObjectCameras: 0,
        scheduleCameraObjectReuses: 7,
        independentlyRenderedObjectCameras: 1,
        rejectedRenderAttempts: 0,
        failedRenderAttempts: 0,
      },
      checks: {
        exactCameraCount: true,
        exactC01ObjectCameraCount: true,
        allEyesClear: true,
        allLookTargetsClear: true,
        allQualityGatesPass: true,
        allC01ObjectEyesClear: true,
        allC01ObjectLookTargetsClear: true,
        allC01ObjectQualityGatesPass: true,
        allEightC01ObjectCamerasPass: true,
        allC01ObjectShotsUseVerifiedInteriorGeometry: true,
        noCanonicalCapturePathsWritten: true,
      },
    });
    expect(C01_REPRESENTATIVE_CAMERA_BY_OBJECT).toEqual({
      c01_east_l1_security_garage: 'CAM-l1-secure-vehicle-garage',
      c01_east_l2_living_adult: 'CAM-l2-adult-private-01',
      c01_east_l3_agriculture_water: 'CAM-l3-water-treatment',
      c01_east_l4_command_medical: 'CAM-l4-command-center',
      c01_east_l5_power_escape: 'CAM-l5-power-plant',
      c01_owner_club_arrival: 'CAM-owner-ceremonial-arrival-hall',
      c01_owner_residence: 'CAM-master-living',
      c01_owner_tunnel_detour: 'CAM-owner-tunnel-detour-refuge-01',
    });
    expect(preflightById.size).toBe(165);
    expect(objectPreflightById.size).toBe(8);
    expect(preflight.contract.coverageAudit).toMatchObject({
      missedObjects: [
        'c01_owner_club_arrival',
        'c01_owner_residence',
        'c01_owner_tunnel_detour',
      ],
      preservedRejectedTunnelEvidence: {
        capture: {
          sha256:
            '75e51427f2c40af54d541bb2c2496710090f918b95550a6485cecd7f4c574d93',
        },
        metadata: {
          sha256:
            '17daf18f31c13045c618d3656eba1d2fae4bceedd896d61b1dc29cbf26122af7',
        },
        rejectedMetrics: {
          quantizedColorCount: 3,
          nonBlank: false,
        },
      },
    });
    expect(objectPreflightById.get('c01_owner_tunnel_detour'))
      .toMatchObject({
        cameraId: 'CAM-owner-tunnel-detour-refuge-01',
        coverageBasis: 'reviewed-object-specific-camera',
        camera: {
          eye: [399, -42.38, 42],
          lookAt: [414, -42.38, 33],
          reviewedSeed:
            'reviewed-owner-tunnel-refuge-and-five-wide-route-camera',
        },
        quality: {
          status: 'PASS',
          metrics: {
            nonBlank: true,
          },
        },
      });
    expect([...preflightById].every(([cameraId, result]: [string, any]) => {
      const camera: any = pass1ByShot.get(`SCHEDULE-${cameraId}`);
      return (
        camera
        && JSON.stringify(camera.eye) === JSON.stringify(result.camera.eye)
        && JSON.stringify(camera.lookAt)
          === JSON.stringify(result.camera.lookAt)
        && camera.maxDistance === 128
        && camera.coordinateProvenance.postStateCameraPreflight
          .reportSha256.length === 64
        && camera.coordinateProvenance.validation
          .postStateEyeOccupancyPassed === true
        && camera.coordinateProvenance.validation
          .postStateLineOfSightPassed === true
        && camera.coordinateProvenance.validation
          .postStateQualityGatePassed === true
      );
    })).toBe(true);
    expect(Object.entries(C01_REPRESENTATIVE_CAMERA_BY_OBJECT).every(
      ([objectId, cameraId]) => {
        const objectCamera: any = pass1ByShot.get(`OBJECT-${objectId}`);
        const preflightCamera: any = objectPreflightById.get(objectId);
        return (
          objectCamera
          && preflightCamera.cameraId === cameraId
          && JSON.stringify(objectCamera.eye)
            === JSON.stringify(preflightCamera.camera.eye)
          && JSON.stringify(objectCamera.lookAt)
            === JSON.stringify(preflightCamera.camera.lookAt)
          && objectCamera.cameraBasis
            .endsWith(':representative-immutable-post-preflight')
          && objectCamera.coordinateProvenance.representativeForObjectId
            === objectId
          && objectCamera.coordinateProvenance.validation
            .postStateEyeOccupancyPassed === true
          && objectCamera.coordinateProvenance.validation
            .postStateLineOfSightPassed === true
          && objectCamera.coordinateProvenance.validation
            .postStateQualityGatePassed === true
        );
      },
    )).toBe(true);
    expect(media.combined.counts).toMatchObject({
      exactObjects: 340,
      shots: 589,
      maps: 13,
      pass1Captures: 589,
      pass2Captures: 589,
      combinedCaptures: 1178,
    });
    expect(media.crosswalk.cameraCoordinateAudit.c01
      .postStateCameraPreflight).toMatchObject({
      scheduledCamerasAudited: 165,
      allEyesClear: true,
      allLookTargetsClear: true,
      allQualityGatesPass: true,
    });
  });

  it('binds all sales-office family shots and paired passes to preflight', () => {
    const preflight = readJson(SALES_OFFICE_CAMERA_PREFLIGHT_PATH);
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
      c01CameraPreflightPath: C01_CAMERA_PREFLIGHT_PATH,
      salesOfficeCameraPreflightPath:
        SALES_OFFICE_CAMERA_PREFLIGHT_PATH,
    });
    const preflightByShot = new Map(
      preflight.cameras.map((camera: { shotId: string }) => [
        camera.shotId,
        camera,
      ]),
    );
    const allCaptures = [
      ...media.pass1.cameras,
      ...media.pass2.cameras,
    ];

    expect(preflightByShot.size).toBe(3);
    expect(media.crosswalk.cameraCoordinateAudit.salesOffice)
      .toMatchObject({
        familyShotsAudited: 3,
        pairedCapturesBound: 6,
        allEyesClear: true,
        allLookTargetsClear: true,
        allQualityGatesPass: true,
        shotIds: Object.keys(SALES_OFFICE_CAMERA_OBJECT_BY_SHOT),
      });
    expect(Object.entries(SALES_OFFICE_CAMERA_OBJECT_BY_SHOT).every(
      ([shotId, objectId]) => {
        const verified: any = preflightByShot.get(shotId);
        const captures = allCaptures.filter(
          (camera: any) => camera.shotId === shotId,
        );
        return (
          verified
          && captures.length === 2
          && captures.every((camera: any) => (
            camera.primaryFeatureId === objectId
            && JSON.stringify(camera.eye)
              === JSON.stringify(verified.camera.eye)
            && JSON.stringify(camera.lookAt)
              === JSON.stringify(verified.camera.lookAt)
            && camera.maxDistance === 128
            && camera.cameraBasis.endsWith(
              ':immutable-post-family-preflight',
            )
            && camera.coordinateProvenance.validation
              .exactObjectId === objectId
            && camera.coordinateProvenance.validation
              .postStateEyeOccupancyPassed === true
            && camera.coordinateProvenance.validation
              .postStateLineOfSightPassed === true
            && camera.coordinateProvenance.validation
              .postStateQualityGatePassed === true
          ))
        );
      },
    )).toBe(true);
  });

  it('binds all Gilded Raven family shots and paired passes to preflight', () => {
    const preflight = readJson(GILDED_RAVEN_CAMERA_PREFLIGHT_PATH);
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
      c01CameraPreflightPath: C01_CAMERA_PREFLIGHT_PATH,
      salesOfficeCameraPreflightPath:
        SALES_OFFICE_CAMERA_PREFLIGHT_PATH,
      gildedRavenCameraPreflightPath:
        GILDED_RAVEN_CAMERA_PREFLIGHT_PATH,
    });
    const preflightByShot = new Map(
      preflight.cameras.map((camera: { shotId: string }) => [
        camera.shotId,
        camera,
      ]),
    );
    const allCaptures = [
      ...media.pass1.cameras,
      ...media.pass2.cameras,
    ];

    expect(preflightByShot.size).toBe(3);
    expect(media.crosswalk.cameraCoordinateAudit.gildedRaven)
      .toMatchObject({
        familyShotsAudited: 3,
        pairedCapturesBound: 6,
        allEyesClear: true,
        allFramingTargetsBoundToExactObjects: true,
        allFirstVisibleSurfacesInsideExactObjects: true,
        allQualityGatesPass: true,
        shotIds: Object.keys(GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT),
      });
    expect(Object.entries(GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT).every(
      ([shotId, objectId]) => {
        const verified: any = preflightByShot.get(shotId);
        const captures = allCaptures.filter(
          (camera: any) => camera.shotId === shotId,
        );
        return (
          verified
          && captures.length === 2
          && captures.every((camera: any) => (
            camera.primaryFeatureId === objectId
            && JSON.stringify(camera.eye)
              === JSON.stringify(verified.camera.eye)
            && JSON.stringify(camera.lookAt)
              === JSON.stringify(verified.camera.lookAt)
            && camera.maxDistance === 128
            && camera.cameraBasis.endsWith(
              ':immutable-post-family-preflight',
            )
            && camera.coordinateProvenance.validation
              .exactObjectId === objectId
            && camera.coordinateProvenance.validation
              .lookAtInsideExactObjectBounds === true
            && camera.coordinateProvenance.validation
              .firstVisibleSurfaceInsideExactObjectBounds === true
            && camera.coordinateProvenance.validation
              .postStateEyeOccupancyPassed === true
            && camera.coordinateProvenance.validation
              .postStateLineOfSightPassed === true
            && camera.coordinateProvenance.validation
              .postStateQualityGatePassed === true
          ))
        );
      },
    )).toBe(true);
  });

  it('binds the complete paired manifest to the final post snapshot', () => {
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
      c01CameraPreflightPath: C01_CAMERA_PREFLIGHT_PATH,
      salesOfficeCameraPreflightPath:
        SALES_OFFICE_CAMERA_PREFLIGHT_PATH,
      gildedRavenCameraPreflightPath:
        GILDED_RAVEN_CAMERA_PREFLIGHT_PATH,
      postSnapshotPath: FINAL_POST_SNAPSHOT_PATH,
    });
    const expectedSnapshot = {
      path:
        'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
      sha256:
        'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
      regionFileCount: 30,
      bytes: 134749182,
    };
    const firstByShot = new Map(
      media.pass1.cameras.map((camera: any) => [
        camera.shotId,
        camera,
      ]),
    );
    const secondByShot = new Map(
      media.pass2.cameras.map((camera: any) => [
        camera.shotId,
        camera,
      ]),
    );

    expect(media.pass1.postreleaseSnapshot).toMatchObject(
      expectedSnapshot,
    );
    expect(media.pass2.postreleaseSnapshot).toMatchObject(
      expectedSnapshot,
    );
    expect(media.combined.postreleaseSnapshot).toMatchObject(
      expectedSnapshot,
    );
    expect(media.crosswalk.postreleaseSnapshot).toMatchObject(
      expectedSnapshot,
    );
    expect(media.combined.counts).toMatchObject({
      shots: 589,
      pass1Captures: 589,
      pass2Captures: 589,
      combinedCaptures: 1178,
    });
    expect(media.combined.cameras).toHaveLength(1178);
    expect(new Set(media.combined.cameras.map(
      (camera: any) => camera.id,
    )).size).toBe(1178);
    expect(firstByShot.size).toBe(589);
    expect(secondByShot.size).toBe(589);
    expect([...firstByShot].every(([shotId, first]: [string, any]) => {
      const second: any = secondByShot.get(shotId);
      return (
        second
        && first.mode === second.mode
        && JSON.stringify(first.eye ?? null)
          === JSON.stringify(second.eye ?? null)
        && JSON.stringify(first.lookAt ?? null)
          === JSON.stringify(second.lookAt ?? null)
        && JSON.stringify(first.center ?? null)
          === JSON.stringify(second.center ?? null)
        && first.span === second.span
        && first.fov === second.fov
        && first.maxDistance === second.maxDistance
      );
    })).toBe(true);
  });

  it('resolves every object provenance pointer to its exact source identity and bounds', () => {
    const media = buildMediaPackage({
      report: readJson(REPORT_PATH),
      reportPath: REPORT_PATH,
      databasePath: DATABASE_PATH,
    });
    const sources = new Map<string, any>();

    expect(escapeJsonPointerSegment('a~/b')).toBe('a~0~1b');
    expect(media.crosswalk.objects).toHaveLength(340);
    expect(media.crosswalk.objects.every((object: any) => {
      const sourcePath = path.join(ROOT, object.provenance.file);
      if (!sources.has(sourcePath)) sources.set(sourcePath, readJson(sourcePath));
      const record = dereferenceJsonPointer(
        sources.get(sourcePath),
        object.provenance.jsonPointer,
      );
      const identity = record?.scope ?? record?.id ?? record?.externalId;
      const sourceBounds = record?.bounds ?? record?.geometry;
      return (
        identity === object.objectId
        && sourceBounds
        && JSON.stringify(normalizeBounds(sourceBounds))
          === JSON.stringify(object.bounds)
      );
    })).toBe(true);
  });

  it('classifies the previously ambiguous major scopes fail-closed', () => {
    expect(classifyObjectId('c01_east_l4_command_medical')).toContain('c01');
    expect(classifyObjectId('TE-MSA-UW01-DRY-CORE')).toEqual(['mainstreet']);
    expect(classifyObjectId('TE-IA-CONCORD-SOUNDSTAGE-ANNEX')).toEqual(
      expect.arrayContaining(['data-district-concord', 'cbe-soundstages']),
    );
    expect(classifyObjectId('RRCH-STEWARD')).toContain('manager-vale');
    expect(classifyObjectId('TE-WESTLIGHT-CRATER-LAKE')).toContain('westlight');
  });

  it('refuses prerelease identity and accepts a complete paired post contract', () => {
    const prerelease = 'a'.repeat(64);
    const post = 'b'.repeat(64);
    const manifestSha = 'c'.repeat(64);
    const forwardSha = 'd'.repeat(64);
    const camera = {
      mode: 'persp',
      eye: [1, 2, 3],
      lookAt: [4, 5, 6],
      fov: 68,
    };
    const manifest = {
      status: 'POST_RELEASE_CAPTURE_PENDING',
      releasePackage: { forwardSha256: forwardSha },
      cameras: [
        {
          id: 'SHOT-1-PASS-1',
          shotId: 'SHOT-1',
          evidencePass: 1,
          primaryFeatureId: 'OBJECT-1',
          output: 'pass-1/object-1.png',
          ...camera,
        },
        {
          id: 'SHOT-1-PASS-2',
          shotId: 'SHOT-1',
          evidencePass: 2,
          primaryFeatureId: 'OBJECT-1',
          output: 'pass-2/object-1.png',
          ...camera,
        },
      ],
    };
    const captureReport = {
      status: 'PASS',
      passed: true,
      sourceManifestSha256: manifestSha,
      snapshot: { sha256: post },
      captures: [
        {
          id: 'SHOT-1-PASS-1',
          primaryFeatureId: 'OBJECT-1',
          output: 'pass-1/object-1.png',
          sha256: 'e'.repeat(64),
          camera: { ...camera, fieldOfView: 68 },
        },
        {
          id: 'SHOT-1-PASS-2',
          primaryFeatureId: 'OBJECT-1',
          output: 'pass-2/object-1.png',
          sha256: 'e'.repeat(64),
          camera: { ...camera, fieldOfView: 68 },
        },
      ],
    };
    const crosswalk = {
      objects: [{
        objectId: 'OBJECT-1',
        truth: {
          releaseState: 'GENERATED_OFFLINE_NOT_YET_VERIFIED',
          plannedOnly: false,
          finalCertificationRequired: 'VERIFIED_POST_STATE',
          physicalClaim: 'only the exact physical object',
        },
        capturePairs: [{
          shotId: 'SHOT-1',
          pass1CameraId: 'SHOT-1-PASS-1',
          pass2CameraId: 'SHOT-1-PASS-2',
        }],
      }],
      mapShots: [],
    };

    const accepted = validateMediaReleaseContract({
      manifest,
      captureReport,
      crosswalk,
      postSnapshotSha256: post,
      manifestSha256: manifestSha,
      prereleaseSnapshotSha256: prerelease,
      forwardSha256: forwardSha,
    });
    expect(accepted).toMatchObject({
      passed: true,
      failures: [],
      counts: {
        shots: 1,
        completePairs: 1,
        crosswalkObjects: 1,
      },
    });

    const rejected = validateMediaReleaseContract({
      manifest,
      captureReport: {
        ...captureReport,
        snapshot: { sha256: prerelease },
      },
      crosswalk,
      postSnapshotSha256: prerelease,
      manifestSha256: manifestSha,
      prereleaseSnapshotSha256: prerelease,
      forwardSha256: forwardSha,
    });
    expect(rejected.passed).toBe(false);
    expect(rejected.failures).toContain('post-snapshot-not-distinct');
  });
});
