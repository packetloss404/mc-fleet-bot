import crypto from 'crypto';

export const CITIZEN_ROUTE_CONTRACT = Object.freeze({
  status: 'PASS',
  state: 'PASS_OFFLINE_EXISTING_SURFACE_ROUTE',
  acceptanceClass: 'OFFLINE_ROUTE_ONLY_LIVE_GATES_PENDING',
  acceptedStatus: 'PASS_OFFLINE_NORMAL_WALK',
  postSnapshotSha256:
    'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
  comparisonSnapshotSha256:
    'd749007d669b1f16a9d1a75dafd55d3bb92cbcc61ca49027f7337198da65865f',
  exactPathSha256:
    '9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701',
  exactPathCellCount: 540,
  routineWaypointCount: 49,
  directionalSegmentCount: 48,
  requiredHeadroomBlocks: 2,
  verifiedMinimumHeadroomBlocks: 4,
  minimumContiguousWidth: 1,
  belowThreeWide: Object.freeze([
    Object.freeze({ point: Object.freeze([-82, 65, -206]), contiguousWidth: 2 }),
    Object.freeze({ point: Object.freeze([-82, 66, -158]), contiguousWidth: 2 }),
    Object.freeze({ point: Object.freeze([-82, 65, -110]), contiguousWidth: 2 }),
    Object.freeze({ point: Object.freeze([-79, 65, -79]), contiguousWidth: 1 }),
  ]),
});

function fail(message) {
  throw new Error(`citizen route contract rejected: ${message}`);
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function tuple(point) {
  if (Array.isArray(point) && point.length === 3) {
    return point.map(Number);
  }
  if (point && typeof point === 'object') {
    return [Number(point.x), Number(point.y), Number(point.z)];
  }
  return null;
}

function tuple2d(point) {
  if (Array.isArray(point) && point.length >= 2) {
    return point.length === 2
      ? [Number(point[0]), Number(point[1])]
      : [Number(point[0]), Number(point[2])];
  }
  if (point && typeof point === 'object') {
    return [Number(point.x), Number(point.z)];
  }
  return null;
}

function samePoint(left, right) {
  const a = tuple(left);
  const b = tuple(right);
  return a !== null
    && b !== null
    && a.every((coordinate, index) => (
      Number.isFinite(coordinate) && coordinate === b[index]
    ));
}

function samePoint2d(left, right) {
  const a = tuple2d(left);
  const b = tuple2d(right);
  return a !== null
    && b !== null
    && a.every((coordinate, index) => (
      Number.isFinite(coordinate) && coordinate === b[index]
    ));
}

function samePoints(left, right, comparison = samePoint) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((point, index) => comparison(point, right[index]));
}

function requireEmpty(value, name) {
  if (!Array.isArray(value) || value.length !== 0) {
    fail(`${name} must be an empty array`);
  }
}

function validateSegments(segments, route, direction) {
  const contract = CITIZEN_ROUTE_CONTRACT;
  if (
    !Array.isArray(segments)
    || segments.length !== contract.directionalSegmentCount
  ) {
    fail(`${direction} must contain exactly ${contract.directionalSegmentCount} segments`);
  }
  segments.forEach((segment, index) => {
    const expectedStart = direction === 'forward'
      ? route[index]
      : route[index + 1];
    const expectedGoal = direction === 'forward'
      ? route[index + 1]
      : route[index];
    if (
      segment?.passed !== true
      || Number(segment.maximumStep) > 1
      || !samePoint(segment.start, expectedStart)
      || !samePoint(segment.goal, expectedGoal)
    ) {
      fail(`${direction} segment ${index} is not the exact passing one-step contract`);
    }
  });
}

function normalizedChokes(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.map((row) => ({
    point: tuple(row?.point),
    contiguousWidth: Number(row?.contiguousWidth),
  }));
}

export function validateCitizenRouteReport(report) {
  const contract = CITIZEN_ROUTE_CONTRACT;
  if (!report || typeof report !== 'object') fail('report is not an object');
  if (report.status !== contract.status) fail(`root status must be ${contract.status}`);
  if (report.state !== contract.state) fail(`root state must be ${contract.state}`);
  if (report.acceptanceClass !== contract.acceptanceClass) {
    fail(`acceptanceClass must be ${contract.acceptanceClass}`);
  }
  if (report.acceptedPostSnapshotSha256 !== contract.postSnapshotSha256) {
    fail('root post snapshot hash drifted');
  }
  if (report.exactPathSha256 !== contract.exactPathSha256) {
    fail('root exact path hash drifted');
  }
  if (report.exactPathCellCount !== contract.exactPathCellCount) {
    fail('root exact path cell count drifted');
  }
  if (report.snapshotsAgree !== false) {
    fail('post and diagnostic pre-release snapshots must remain explicitly different');
  }
  if (report.comparisonRole !== 'DIAGNOSTIC_PRERELEASE_BASELINE_ONLY') {
    fail('comparison snapshot role is not diagnostic-only');
  }
  if (
    report.comparison?.snapshot?.sha256
    !== contract.comparisonSnapshotSha256
  ) {
    fail('diagnostic pre-release snapshot hash drifted');
  }

  const accepted = report.accepted;
  if (accepted?.status !== contract.acceptedStatus) {
    fail(`accepted status must be ${contract.acceptedStatus}`);
  }
  if (accepted?.snapshot?.sha256 !== contract.postSnapshotSha256) {
    fail('accepted post snapshot hash drifted');
  }
  if (accepted?.exactPathSha256 !== contract.exactPathSha256) {
    fail('accepted exact path hash drifted');
  }
  if (accepted?.exactPathCellCount !== contract.exactPathCellCount) {
    fail('accepted exact path cell count drifted');
  }
  if (
    !Array.isArray(accepted.exactPath)
    || accepted.exactPath.length !== contract.exactPathCellCount
    || sha256Json(accepted.exactPath) !== contract.exactPathSha256
  ) {
    fail('exact path cells do not reproduce the accepted hash');
  }
  if (
    !Array.isArray(accepted.routineWaypoints)
    || accepted.routineWaypoints.length !== contract.routineWaypointCount
    || !samePoints(accepted.anchors, accepted.routineWaypoints)
  ) {
    fail(`accepted route must contain exactly ${contract.routineWaypointCount} authored checkpoints`);
  }
  validateSegments(accepted.forwardSegments, accepted.routineWaypoints, 'forward');
  validateSegments(accepted.reverseSegments, accepted.routineWaypoints, 'reverse');

  const movement = accepted.movementModel;
  if (
    movement?.bodyClearanceBlocks !== 2
    || movement.cardinalMovementOnly !== true
    || movement.maximumAdjacentStep !== 1
    || movement.swimming !== false
    || movement.parkour !== false
    || movement.digging !== false
    || movement.towering !== false
    || movement.closedDoorsAndGates !== false
  ) {
    fail('movement model no longer matches the no-dig normal-walk contract');
  }

  requireEmpty(accepted.hazards?.exactPathHazards, 'exact-path hazards');
  requireEmpty(accepted.hazards?.haloHazards, 'halo hazards');
  requireEmpty(accepted.hazards?.gravitySupports, 'gravity supports');
  requireEmpty(accepted.hazards?.nearbyBlockEntities, 'nearby block entities');
  requireEmpty(report.protection?.buildingIntersections, 'building intersections');
  requireEmpty(
    report.protection?.miningProtectedZoneIntersections,
    'mining protected-zone intersections',
  );
  if (
    accepted.headroom?.requiredClearBlocks
      !== contract.requiredHeadroomBlocks
    || accepted.headroom?.minimumClearBlocks
      !== contract.verifiedMinimumHeadroomBlocks
  ) {
    fail('headroom evidence drifted');
  }
  requireEmpty(accepted.headroom?.belowRequired, 'below-required headroom cells');

  const width = accepted.physicalWidth;
  if (
    width?.minimumContiguousStandableWidth
      !== contract.minimumContiguousWidth
    || width?.belowThreeWideCount !== contract.belowThreeWide.length
    || JSON.stringify(normalizedChokes(width?.belowThreeWide))
      !== JSON.stringify(contract.belowThreeWide)
  ) {
    fail('the four reviewed width chokes are not disclosed exactly');
  }
  if (
    accepted.supersededRouteDiagnosis?.status
      !== 'CONFIRMED_12_DIRECTIONAL_FAILURES'
    || accepted.supersededRouteDiagnosis?.failureCount !== 12
  ) {
    fail('superseded 12-failure diagnosis is missing');
  }
  if (
    report.sourceBoundary?.offlineOnly !== true
    || report.sourceBoundary?.liveWorldRead !== false
    || report.sourceBoundary?.liveWorldMutated !== false
    || report.sourceBoundary?.databaseMutated !== false
    || report.sourceBoundary?.configMutated !== false
    || report.sourceBoundary?.serviceRestarted !== false
  ) {
    fail('offline source-boundary declaration drifted');
  }
  if (
    !String(report.releaseDecision).includes('FRESH SAME-MOMENT')
    || !String(report.releaseDecision).includes('LIVE WALK GATES')
  ) {
    fail('release decision no longer discloses the remaining activation gates');
  }

  return {
    contract,
    report,
    accepted,
    route: accepted.routineWaypoints,
    chokes: normalizedChokes(width.belowThreeWide),
  };
}

export function validateCitizenRouteProposal(proposal, routeContract) {
  const { contract, route } = routeContract;
  if (proposal?.status !== 'PROPOSED_NOT_APPLIED') {
    fail('route proposal status is not PROPOSED_NOT_APPLIED');
  }
  if (
    proposal.sourceSurvey?.acceptedSnapshotSha256
      !== contract.postSnapshotSha256
    || proposal.sourceSurvey?.exactPathSha256
      !== contract.exactPathSha256
  ) {
    fail('proposal source hashes do not match the route contract');
  }
  const gates = proposal.activationGates;
  if (
    !Array.isArray(gates)
    || !gates.some((gate) => /fresh same-moment/i.test(gate))
    || !gates.some((gate) => /both directions/i.test(gate))
    || !gates.some((gate) => /4 sub-three-wide/i.test(gate))
    || !gates.some((gate) => /minimum 1 block/i.test(gate))
  ) {
    fail('proposal does not explicitly disclose the fresh/live and width-choke gates');
  }

  const leash = proposal.configYmlMergeProposal?.leash;
  const shifts = proposal.townConfigJsonMergeProposal?.citizenRoutine?.shifts;
  if (!Array.isArray(leash) || leash.length !== 5) {
    fail('proposal must contain exactly five leash entries');
  }
  if (!Array.isArray(shifts) || shifts.length !== 5) {
    fail('proposal must contain exactly five shifts');
  }
  if (new Set(leash.map((entry) => entry.botName)).size !== 5) {
    fail('proposal leash bot names are not unique');
  }
  if (new Set(shifts.map((entry) => entry.role)).size !== 5) {
    fail('proposal shift roles are not unique');
  }

  for (const entry of leash) {
    const corridor = entry.corridors?.[0];
    if (
      entry.destinations?.length !== 1
      || entry.corridors?.length !== 1
      || corridor.name !== 'ravensreach-mainstreet-reviewed-commute'
      || corridor.width !== 3
      || !samePoints(corridor.waypoints, route, samePoint2d)
    ) {
      fail(`leash corridor drifted for ${entry.botName ?? 'unknown bot'}`);
    }
  }
  for (const shift of shifts) {
    if (
      shift.nonDestructive !== true
      || shift.destination !== 'mainstreet-rear-staff-staging'
      || shift.phase !== 'day'
      || !samePoints(shift.waypoints, route)
    ) {
      fail(`shift route drifted for ${shift.role ?? 'unknown role'}`);
    }
  }
  const reverse = [...route].reverse();
  if (!samePoints(proposal.returnRoute?.waypoints, reverse)) {
    fail('proposal reverse route is not the exact checkpoint reversal');
  }
  return { proposal, leash, shifts };
}

function validateAuditDirection(direction, route, name) {
  if (
    direction?.passed !== true
    || !Array.isArray(direction.checkpoints)
    || direction.checkpoints.length !== route.length
  ) {
    fail(`live audit ${name} direction is not a complete pass`);
  }
  direction.checkpoints.forEach((checkpoint, index) => {
    if (
      checkpoint?.passed !== true
      || !samePoint(checkpoint.target, route[index])
    ) {
      fail(`live audit ${name} checkpoint ${index} drifted or failed`);
    }
  });
}

export function validateCitizenLiveWalkAudit(audit, routeContract) {
  const { contract, route, chokes } = routeContract;
  if (
    audit?.status !== 'PASS_BIDIRECTIONAL'
    || audit.staging?.passed !== true
    || audit.noDigObserved !== true
    || audit.offlineAcceptedSnapshotSha256 !== contract.postSnapshotSha256
    || audit.exactPathSha256 !== contract.exactPathSha256
    || audit.offlineAcceptanceClass !== contract.acceptanceClass
    || audit.routineWaypointCount !== contract.routineWaypointCount
    || audit.digCountBefore !== audit.digCountAfter
    || JSON.stringify(normalizedChokes(audit.declaredWidthChokes))
      !== JSON.stringify(chokes)
  ) {
    fail('live-walk audit identity, policy, or choke disclosure drifted');
  }
  requireEmpty(
    audit.securityIncidentsBefore,
    'live-audit pre-walk security incidents',
  );
  requireEmpty(
    audit.securityIncidentsAfter,
    'live-audit post-walk security incidents',
  );
  validateAuditDirection(audit.forward, route, 'forward');
  validateAuditDirection(audit.reverse, [...route].reverse(), 'reverse');
  return audit;
}
