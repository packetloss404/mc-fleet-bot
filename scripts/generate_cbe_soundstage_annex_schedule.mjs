#!/usr/bin/env node
/**
 * Freeze the researched Concord Broadcast Exchange soundstage annex as a
 * machine-readable coordinate schedule.
 *
 * This script is offline. It does not connect to Minecraft.
 */

import fs from 'fs';
import path from 'path';

const OUTPUT = path.resolve(
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'concord-broadcast-exchange-soundstage-annex-coordinate-schedule.json',
);

function room(objectId, stage, level, program, bounds, routeClass, cameraIds) {
  return {
    objectId,
    stage,
    level,
    program,
    bounds,
    routeClass,
    implementationStatus: 'frozen_for_exact_compilation',
    cameraIds,
  };
}

function supportSlots({
  xStart,
  zNorth,
  zSouth,
  floorY,
  level,
}) {
  const slots = [];
  for (let segment = 0; segment < 8; segment += 1) {
    const x1 = xStart + segment * 5;
    slots.push([x1, floorY, zNorth, x1 + 3, floorY + 7, zNorth + 7]);
    slots.push([x1, floorY, zSouth, x1 + 3, floorY + 7, zSouth + 7]);
  }
  return slots.map((bounds, index) => ({ bounds, level, index }));
}

function programRooms({
  prefix,
  stage,
  support,
  programs,
  cameraIds,
}) {
  if (programs.length > support.length) {
    throw new Error(`${prefix} needs ${programs.length} slots; only ${support.length} exist`);
  }
  return programs.map(([suffix, program, routeClass], index) => room(
    `${prefix}-${suffix}`,
    stage,
    support[index].level,
    program,
    support[index].bounds,
    routeClass,
    cameraIds,
  ));
}

const lateNightPublicRooms = [
  room(
    'CBE-ANNEX-LN-LOBBY-001',
    'late-night',
    'G0',
    'public audience lobby and marquee threshold',
    [676, 72, -436, 687, 80, -431],
    'public',
    ['CBE-ANNEX-CAM-003', 'CBE-ANNEX-CAM-014'],
  ),
  room(
    'CBE-ANNEX-LN-TICKET-001',
    'late-night',
    'G0',
    'ticket and audience check-in',
    [689, 72, -436, 698, 80, -431],
    'public',
    ['CBE-ANNEX-CAM-003'],
  ),
  room(
    'CBE-ANNEX-LN-SECURITY-001',
    'late-night',
    'G0',
    'audience security and bag-check analogue',
    [700, 72, -436, 709, 80, -431],
    'public',
    ['CBE-ANNEX-CAM-003'],
  ),
  room(
    'CBE-ANNEX-LN-HOLDING-001',
    'late-night',
    'G0',
    'audience holding',
    [711, 72, -436, 731, 80, -431],
    'public',
    ['CBE-ANNEX-CAM-003'],
  ),
];

const lateNightPrograms = [
  ['CONCESSIONS-001', 'audience concessions', 'public'],
  ['COAT-001', 'audience coat storage', 'public'],
  ['WC-001', 'audience restroom analogue', 'public'],
  ['HOST-DRESS-001', 'host dressing suite', 'talent'],
  ['GUEST-DRESS-001', 'guest dressing room one', 'talent'],
  ['GUEST-DRESS-002', 'guest dressing room two', 'talent'],
  ['GREEN-001', 'guest and musical-act green room', 'talent'],
  ['HAIR-MAKEUP-001', 'hair and makeup room', 'talent'],
  ['WARDROBE-001', 'wardrobe room and fitting area', 'talent'],
  ['TALENT-LOUNGE-001', 'talent lounge', 'talent'],
  ['SHOWRUNNER-001', 'showrunner office', 'production'],
  ['PRODUCER-001', 'producer office', 'production'],
  ['WRITERS-001', 'writers room', 'production'],
  ['PRODUCTION-001', 'production office', 'production'],
  ['STAGE-MANAGER-001', 'stage manager station', 'production'],
  ['TABLE-READ-001', 'conference and table-read room', 'production'],
  ['STAFF-WORK-001', 'staff workroom', 'production'],
  ['CONTROL-001', 'production control room with glazed stage overlook', 'technical'],
  ['AUDIO-001', 'audio control room with glazed stage overlook', 'technical'],
  ['LIGHTING-001', 'lighting control room with glazed stage overlook', 'technical'],
  ['EDIT-GRAPHICS-001', 'edit and graphics suite', 'technical'],
  ['MACHINE-001', 'broadcast machine room', 'technical'],
  ['GEAR-001', 'camera and lighting equipment cage', 'technical'],
  ['MIC-STORE-001', 'microphone and audio storage', 'technical'],
  ['TECH-REPAIR-001', 'technical repair bench', 'technical'],
  ['PROP-001', 'late-night prop storage', 'service'],
  ['SCENERY-DOCK-001', 'late-night scenery dock', 'service'],
  ['JANITOR-001', 'janitor and cleanup store', 'service'],
  ['ELEC-PLANT-001', 'electrical and plant visual analogue', 'service'],
  ['SERVICE-EGRESS-001', 'independent service egress vestibule', 'service'],
];

const lateNightSupport = [
  ...supportSlots({
    xStart: 680,
    zNorth: -489,
    zSouth: -479,
    floorY: 72,
    level: 'G0',
  }),
  ...supportSlots({
    xStart: 680,
    zNorth: -489,
    zSouth: -479,
    floorY: 82,
    level: 'G1',
  }),
];

const sitcomPublicRooms = [
  room(
    'CBE-ANNEX-SC-LOBBY-001',
    'sitcom',
    'G0',
    'public audience lobby and sitcom marquee threshold',
    [740, 70, -436, 751, 78, -431],
    'public',
    ['CBE-ANNEX-CAM-004', 'CBE-ANNEX-CAM-015'],
  ),
  room(
    'CBE-ANNEX-SC-CHECKIN-001',
    'sitcom',
    'G0',
    'audience check-in',
    [753, 70, -436, 762, 78, -431],
    'public',
    ['CBE-ANNEX-CAM-004'],
  ),
  room(
    'CBE-ANNEX-SC-HOLDING-001',
    'sitcom',
    'G0',
    'sitcom audience holding',
    [764, 70, -436, 775, 78, -431],
    'public',
    ['CBE-ANNEX-CAM-004'],
  ),
  room(
    'CBE-ANNEX-SC-CONCESSIONS-001',
    'sitcom',
    'G0',
    'audience concessions',
    [777, 70, -436, 795, 78, -431],
    'public',
    ['CBE-ANNEX-CAM-004'],
  ),
];

const sitcomPrograms = [
  ['WC-001', 'audience restroom analogue', 'public'],
  ['PUBLIC-EGRESS-001', 'remote public egress vestibule', 'public'],
  ['CAST-DRESS-001', 'cast dressing room one', 'talent'],
  ['CAST-DRESS-002', 'cast dressing room two', 'talent'],
  ['CAST-DRESS-003', 'cast dressing room three', 'talent'],
  ['CAST-DRESS-004', 'cast dressing room four', 'talent'],
  ['CAST-DRESS-005', 'cast dressing room five', 'talent'],
  ['CAST-DRESS-006', 'cast dressing room six', 'talent'],
  ['GUEST-DRESS-001', 'guest dressing room one', 'talent'],
  ['GUEST-DRESS-002', 'guest dressing room two', 'talent'],
  ['GREEN-001', 'cast green room', 'talent'],
  ['HAIR-MAKEUP-001', 'hair and makeup room', 'talent'],
  ['WARDROBE-001', 'wardrobe room', 'talent'],
  ['CAST-LOUNGE-001', 'cast lounge', 'talent'],
  ['REHEARSAL-001', 'rehearsal and table-read room', 'production'],
  ['SHOWRUNNER-001', 'showrunner office', 'production'],
  ['WRITERS-001', 'writers room', 'production'],
  ['PRODUCTION-001', 'production office', 'production'],
  ['DIRECTOR-001', 'director office', 'production'],
  ['AD-001', 'assistant director office', 'production'],
  ['MEETING-001', 'production meeting room', 'production'],
  ['SCRIPT-COPY-001', 'script and copy room', 'production'],
  ['STAFF-WORK-001', 'staff workroom', 'production'],
  ['CONTROL-001', 'production control room with glazed stage overlook', 'technical'],
  ['AUDIO-001', 'audio control room with glazed stage overlook', 'technical'],
  ['LIGHTING-001', 'lighting control room with glazed stage overlook', 'technical'],
  ['EDIT-001', 'sitcom edit bay', 'technical'],
  ['MACHINE-001', 'broadcast machine room', 'technical'],
  ['GEAR-001', 'camera and lighting equipment cage', 'technical'],
  ['TECH-REPAIR-001', 'technical repair bench', 'technical'],
  ['PROP-CAGE-001', 'sitcom prop cage', 'service'],
  ['WARDROBE-WORK-001', 'wardrobe workroom', 'service'],
  ['SET-DRESS-STORE-001', 'set-dressing store', 'service'],
  ['SCENE-DOCK-001', 'sitcom scenery dock', 'service'],
  ['JANITOR-001', 'janitor and cleanup store', 'service'],
  ['SERVICE-EGRESS-001', 'independent service egress vestibule', 'service'],
];

const sitcomSupport = [
  ...supportSlots({
    xStart: 744,
    zNorth: -489,
    zSouth: -479,
    floorY: 70,
    level: 'G0',
  }),
  ...supportSlots({
    xStart: 744,
    zNorth: -489,
    zSouth: -479,
    floorY: 80,
    level: 'G1',
  }),
  // Four upper frontage rooms complete the larger sitcom support program.
  // The dedicated east apron remains clear for scenery carts and trucks.
  { bounds: [740, 80, -436, 751, 88, -431], level: 'G1' },
  { bounds: [753, 80, -436, 762, 88, -431], level: 'G1' },
  { bounds: [764, 80, -436, 775, 88, -431], level: 'G1' },
  { bounds: [777, 80, -436, 785, 88, -431], level: 'G1' },
];

const sharedRooms = [
  room('CBE-ANNEX-SHARED-SECURITY-001', 'shared', 'G0', 'annex security and reception', [710, 66, -430, 720, 73, -426], 'public', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-COMMISSARY-001', 'shared', 'G0', 'commissary and crew-feed room', [722, 66, -430, 733, 73, -426], 'staff', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-FIRST-AID-001', 'shared', 'G0', 'first aid room', [735, 66, -430, 744, 73, -426], 'staff', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-WC-001', 'shared', 'G0', 'shared restroom analogue', [746, 66, -430, 757, 73, -426], 'public', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-TABLE-READ-001', 'shared', 'G1', 'shared rehearsal and table-read room', [710, 75, -430, 722, 79, -426], 'production', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-MEETING-001', 'shared', 'G1', 'shared production meeting room', [724, 75, -430, 735, 79, -426], 'production', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-TECH-001', 'shared', 'G1', 'central technical support', [737, 75, -430, 746, 79, -426], 'technical', ['CBE-ANNEX-CAM-014']),
  room('CBE-ANNEX-SHARED-WC-002', 'shared', 'G1', 'shared staff restroom analogue', [748, 75, -430, 757, 79, -426], 'staff', ['CBE-ANNEX-CAM-014']),
];

const rooms = [
  room(
    'CBE-ANNEX-LN-STAGE-001',
    'late-night',
    'STAGE',
    '34 by 52 clear-span late-night filming volume',
    [680, 73, -470, 731, 90, -437],
    'production',
    ['CBE-ANNEX-CAM-005', 'CBE-ANNEX-CAM-006', 'CBE-ANNEX-CAM-009'],
  ),
  ...lateNightPublicRooms,
  ...programRooms({
    prefix: 'CBE-ANNEX-LN',
    stage: 'late-night',
    support: lateNightSupport,
    programs: lateNightPrograms,
    cameraIds: ['CBE-ANNEX-CAM-009', 'CBE-ANNEX-CAM-011'],
  }),
  room(
    'CBE-ANNEX-SC-STAGE-001',
    'sitcom',
    'STAGE',
    '34 by 52 clear-span multi-camera sitcom filming volume',
    [740, 71, -470, 791, 88, -437],
    'production',
    ['CBE-ANNEX-CAM-007', 'CBE-ANNEX-CAM-008', 'CBE-ANNEX-CAM-010'],
  ),
  ...sitcomPublicRooms,
  ...programRooms({
    prefix: 'CBE-ANNEX-SC',
    stage: 'sitcom',
    support: sitcomSupport,
    programs: sitcomPrograms,
    cameraIds: ['CBE-ANNEX-CAM-010', 'CBE-ANNEX-CAM-012'],
  }),
  ...sharedRooms,
];

const cameraCandidates = [
  ['CBE-ANNEX-CAM-001', [654, 89, -461], [704, 82, -461], 'pre-build and completed late-night site overview'],
  ['CBE-ANNEX-CAM-002', [817, 87, -461], [768, 80, -461], 'pre-build and completed sitcom site overview'],
  ['CBE-ANNEX-CAM-003', [704, 78, -420], [704, 79, -434], 'late-night studio-street facade and marquee'],
  ['CBE-ANNEX-CAM-004', [768, 76, -420], [768, 77, -434], 'sitcom studio-street facade and marquee'],
  ['CBE-ANNEX-CAM-005', [705, 77, -441], [705, 77, -466], 'late-night audience-to-set sightline'],
  ['CBE-ANNEX-CAM-006', [705, 77, -466], [705, 77, -441], 'late-night set-to-audience reverse view'],
  ['CBE-ANNEX-CAM-007', [766, 75, -441], [766, 75, -466], 'sitcom audience-to-three-standing-sets sightline'],
  ['CBE-ANNEX-CAM-008', [766, 75, -466], [766, 75, -441], 'sitcom set-to-audience reverse view'],
  ['CBE-ANNEX-CAM-009', [704, 86, -471], [704, 78, -461], 'late-night partial second-floor control overlook'],
  ['CBE-ANNEX-CAM-010', [766, 84, -471], [766, 76, -461], 'sitcom partial second-floor control overlook'],
  ['CBE-ANNEX-CAM-011', [704, 77, -480], [720, 77, -480], 'late-night dressing and support corridor'],
  ['CBE-ANNEX-CAM-012', [766, 75, -480], [784, 75, -480], 'sitcom dressing and support corridor'],
  ['CBE-ANNEX-CAM-013', [654, 79, -479], [674, 78, -479], 'late-night loading and scenery route'],
  ['CBE-ANNEX-CAM-014', [733, 73, -419], [733, 72, -428], 'shared connector and enclosed Exchange link'],
  ['CBE-ANNEX-CAM-015', [817, 77, -479], [797, 76, -479], 'sitcom loading and scenery route'],
  ['CBE-ANNEX-CAM-016', [654, 76, -491], [675, 75, -488], 'late-night terrain bridge and planted retaining edge'],
  ['CBE-ANNEX-CAM-017', [817, 75, -491], [796, 74, -488], 'sitcom planted service edge and terrain fit'],
  ['CBE-ANNEX-CAM-018', [735, 88, -419], [735, 79, -456], 'nighttime two-stage studio-lot identity'],
].map(([cameraId, position, target, evidence]) => ({
  cameraId,
  position,
  target,
  evidence,
}));

const schedule = {
  schemaVersion: 1,
  projectId: 'CBE-STAGE-ANNEX-001',
  title: 'Concord Broadcast Exchange Soundstage Annex',
  status: 'FROZEN_EXACT_COORDINATE_SCHEDULE_NOT_LIVE',
  preparedAtUtc: '2026-07-28T06:00:00Z',
  sourceOfTruth:
    'docs/redevelopment/2026-07-28-town-expansion/'
    + 'concord-broadcast-exchange-soundstage-annex-source-of-truth.md',
  sourceSnapshot: {
    directory:
      'data/worldsnap-town-expansion-expanded-baseline-20260728T0405Z/region',
    sha256:
      'e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a',
    readOnly: true,
    liveWorldMutated: false,
  },
  researchSources: [
    'https://www.universalstudioslot.com/stages/stages',
    'https://universalstudioslot.com/support-space',
    'https://www.nbcuniversal.com/article/nbcuniversals-stamford-studios-celebrates-15-years-production',
    'https://studiooperations.warnerbros.com/about/',
    'https://studiooperations.warnerbros.com/the-ranch-prev/',
    'https://www.wbdg.org/FFC/AF/AFMAN/141389_Television_Production_Facility.pdf',
    'https://interviews.televisionacademy.com/shows/arsenio-hall-show-the',
  ],
  siteObjects: [
    { objectId: 'CBE-ANNEX-LN-SHELL-001', bounds: [674, 72, -490, 733, 96, -431], program: 'rotated late-night stage shell and partial two-story support bar' },
    { objectId: 'CBE-ANNEX-LN-CLEAR-001', bounds: [680, 73, -470, 731, 90, -437], program: '52 by 34 by 18 clear-span filming volume below the catwalk zone' },
    { objectId: 'CBE-ANNEX-LN-LOADING-001', bounds: [668, 67, -490, 673, 80, -450], program: 'late-night west scenery yard and two stage doors' },
    { objectId: 'CBE-ANNEX-SC-SHELL-001', bounds: [738, 70, -490, 797, 94, -431], program: 'rotated sitcom stage shell and partial two-story support bar' },
    { objectId: 'CBE-ANNEX-SC-CLEAR-001', bounds: [740, 71, -470, 791, 88, -437], program: '52 by 34 by 18 clear-span filming volume below the catwalk zone' },
    { objectId: 'CBE-ANNEX-SC-LOADING-001', bounds: [798, 65, -490, 804, 88, -450], program: 'sitcom east scenery yard and two stage doors' },
    { objectId: 'CBE-ANNEX-CONNECTOR-001', bounds: [710, 66, -430, 757, 80, -426], program: 'two-story shared support and enclosed Exchange link' },
    { objectId: 'CBE-ANNEX-STREET-001', bounds: [674, 62, -430, 797, 75, -426], program: 'numbered studio street and separated audience arrivals' },
    { objectId: 'CBE-ANNEX-SERVICE-YARD-001', bounds: [668, 61, -490, 804, 88, -450], program: 'separated west/east truck, scenery and production service yards' },
    { objectId: 'CBE-ANNEX-LANDSCAPE-001', bounds: [658, 45, -490, 804, 96, -426], program: 'retained woodland, planted slopes, rain gardens and bridge edge' },
  ],
  snapshotCensus: {
    lateNightReservation: {
      bounds: [680, 45, -508, 731, 110, -432],
      surface: { minY: 47, p10Y: 63, medianY: 69, p90Y: 74, maxY: 81 },
      buriedWaterCells: 70,
      lavaCells: 0,
      blockEntities: 0,
      topWaterColumns: 0,
    },
    lateNightFinalShell: {
      footprint: [674, -490, 733, -431],
      observedSurface: { minY: 47, p10Y: 63, medianY: 65, p90Y: 68, maxY: 70 },
      protectedSurfaceWaterPoints: [],
      blockEntities: [],
      foundationRule: 'target only exact dry cells above surveyed terrain; no DM12 target overlap',
    },
    sitcomReservation: {
      bounds: [736, 45, -508, 787, 110, -432],
      surface: { minY: 57, p10Y: 63, medianY: 68, p90Y: 73, maxY: 79 },
      waterCells: 0,
      lavaCells: 0,
      topWaterColumns: 0,
    },
    sitcomFinalShell: {
      footprint: [738, -490, 797, -431],
      observedSurface: { minY: 57, p10Y: 63, medianY: 64, p90Y: 67, maxY: 69 },
      protectedDeepBlockEntities: [
        ['minecraft:chest', 752, -21, -501],
        ['minecraft:mob_spawner', 752, -21, -498],
        ['minecraft:chest', 749, -21, -496],
      ],
      minimumTargetY: 56,
      minimumVerticalSeparationBlocks: 77,
    },
    studioStreet: {
      footprint: [674, -430, 797, -426],
      observedSurface: { minY: 63, p10Y: 64, medianY: 64, p90Y: 65, maxY: 66 },
      surfaceFluidColumns: 0,
      blockEntities: 0,
    },
  },
  rooms,
  routes: [
    { routeId: 'CBE-ANNEX-ROUTE-PUBLIC-01', class: 'public', sequence: ['studio street', 'shared security', 'separated stage marquees'] },
    { routeId: 'CBE-ANNEX-ROUTE-LN-AUDIENCE-01', class: 'public', sequence: ['late-night marquee', 'ticket', 'security', 'holding', 'audience floor'], crossesService: false },
    { routeId: 'CBE-ANNEX-ROUTE-SC-AUDIENCE-01', class: 'public', sequence: ['sitcom marquee', 'check-in', 'holding', 'audience floor'], crossesService: false },
    { routeId: 'CBE-ANNEX-ROUTE-LN-TALENT-01', class: 'talent', sequence: ['staff link', 'late-night dressing corridor', 'scenery crossover', 'set'], crossesAudienceQueue: false },
    { routeId: 'CBE-ANNEX-ROUTE-SC-TALENT-01', class: 'talent', sequence: ['staff link', 'sitcom dressing corridor', 'scenery crossover', 'set'], crossesAudienceQueue: false },
    { routeId: 'CBE-ANNEX-ROUTE-LN-SERVICE-01', class: 'service', sequence: ['north truck yard', 'late-night dock', 'two stage doors', 'scenery crossover'], crossesPublic: false },
    { routeId: 'CBE-ANNEX-ROUTE-SC-SERVICE-01', class: 'service', sequence: ['north truck yard', 'sitcom dock', 'two stage doors', 'scenery crossover'], crossesPublic: false },
    { routeId: 'CBE-ANNEX-ROUTE-STAFF-LINK-01', class: 'staff', sequence: ['Exchange enclosed link', 'shared support', 'late-night bar', 'sitcom bar'] },
    { routeId: 'CBE-ANNEX-ROUTE-EGRESS-LN-01', class: 'egress', exits: ['southwest public', 'southeast public', 'north service'] },
    { routeId: 'CBE-ANNEX-ROUTE-EGRESS-SC-01', class: 'egress', exits: ['southwest public', 'southeast public', 'north service'] },
  ],
  cameraCandidates,
  exactCounts: {
    scheduledRooms: rooms.length,
    lateNightScheduledRooms: rooms.filter(({ stage }) => stage === 'late-night').length,
    sitcomScheduledRooms: rooms.filter(({ stage }) => stage === 'sitcom').length,
    sharedScheduledRooms: rooms.filter(({ stage }) => stage === 'shared').length,
    stageBuildings: 2,
    clearSpanStageVolumes: 2,
    clearSpanWidthBlocksEach: 34,
    clearSpanLengthBlocksEach: 52,
    minimumClearHeightBlocksEach: 18,
    modeledClearHeightBlocksEach: 18,
    lateNightSeatBlocks: 96,
    lateNightOpenBayAnalogues: 6,
    lateNightAudiencePositions: 102,
    sitcomSeatBlocks: 84,
    sitcomOpenBayAnalogues: 4,
    sitcomAudiencePositions: 88,
    lateNightProductionZones: 4,
    sitcomStandingSets: 3,
    sitcomSwingSets: 1,
    truckHeightStageDoorsPerBuilding: 2,
    remotePublicExitsPerBuilding: 2,
    independentServiceExitsPerBuilding: 1,
    partialTwoStorySupportBars: 2,
    glazedStageOverlooks: 2,
    publicTalentServiceRouteFamilies: 3,
    cameraCandidates: cameraCandidates.length,
  },
  acceptance: {
    exactSchedule: [
      'Every room, object, route and camera ID is generated exactly once.',
      'No unscheduled room is counted as satisfying a required program.',
      'All exactCounts values fail closed on mismatch.',
    ],
    stage: [
      'Each clear filming volume is at least 34 by 52 by 18 blocks.',
      'No support room, column, stair, lift or plant cell intrudes into either clear-span volume.',
      'Late-night seating faces four real production zones; sitcom seating faces three principal standing sets.',
      'The second floor remains only over the long support bar.',
    ],
    circulation: [
      'Public, talent and service routes remain physically separated.',
      'Scenery reaches each stage from two truck-height doors without crossing an audience lobby.',
      'Each stage has two remote public exits and one independent service exit.',
    ],
    site: [
      'No target touches the protected late-night water point or its support halo.',
      'No target enters the protected deep dungeon block-entity cells.',
      'Natural terrain is retained through stepped courts, bridges, planted slopes and screened service edges.',
      'Zero unreviewed CBE-to-Concord or CBE-to-data-district interfaces.',
    ],
    evidence: [
      'All 18 cameras receive matched first-pass and second-pass evidence after live deployment.',
      'No camera is accepted until its exact object link and route context are verified.',
    ],
  },
  liveExecutionAuthorized: false,
};

const ids = [
  ...schedule.siteObjects.map(({ objectId }) => objectId),
  ...schedule.rooms.map(({ objectId }) => objectId),
  ...schedule.routes.map(({ routeId }) => routeId),
  ...schedule.cameraCandidates.map(({ cameraId }) => cameraId),
];
if (new Set(ids).size !== ids.length) throw new Error('duplicate annex schedule ID');

const roomCells = new Map();
for (const scheduledRoom of rooms) {
  const [x1, y1, z1, x2, y2, z2] = scheduledRoom.bounds;
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) {
        const coordinate = `${x},${y},${z}`;
        const prior = roomCells.get(coordinate);
        if (prior) {
          throw new Error(
            `room overlap ${prior} / ${scheduledRoom.objectId} at ${coordinate}`,
          );
        }
        roomCells.set(coordinate, scheduledRoom.objectId);
      }
    }
  }
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(schedule, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(process.cwd(), OUTPUT),
  rooms: rooms.length,
  siteObjects: schedule.siteObjects.length,
  routes: schedule.routes.length,
  cameras: schedule.cameraCandidates.length,
  exactCounts: schedule.exactCounts,
}, null, 2));
