import crypto from 'node:crypto';

function invariant(condition, message) {
  if (!condition) throw new Error(`citizen route segment gate: ${message}`);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256CanonicalJson(value) {
  return sha256(canonicalJson(value));
}

export function parseSegmentSelector(selector) {
  const match = /^(forward|reverse):(\d+)$/.exec(String(selector ?? ''));
  invariant(match, 'selector must be forward:<index> or reverse:<index>');
  return {
    direction: match[1],
    index: Number(match[2]),
  };
}

export function orientedRoute(route, direction) {
  invariant(Array.isArray(route) && route.length >= 3, 'route must have at least three points');
  invariant(
    direction === 'forward' || direction === 'reverse',
    `unsupported direction ${direction}`,
  );
  return direction === 'forward'
    ? route.map((point) => [...point])
    : [...route].reverse().map((point) => [...point]);
}

/**
 * A checkpoint index identifies the edge ending at that checkpoint. The
 * diagnostic window starts one checkpoint before the preceding edge and then
 * exercises the failed edge plus its immediate entry/exit seams.
 */
export function segmentWindowPlan(route, selector) {
  const parsed = typeof selector === 'string'
    ? parseSegmentSelector(selector)
    : selector;
  const points = orientedRoute(route, parsed.direction);
  invariant(
    Number.isInteger(parsed.index)
      && parsed.index >= 1
      && parsed.index < points.length - 1,
    `checkpoint index must be between 1 and ${points.length - 2}`,
  );
  const checkpointIndices = [
    parsed.index - 1,
    parsed.index,
    parsed.index + 1,
  ];
  const stagingIndex = Math.max(0, checkpointIndices[0] - 1);
  return {
    selector: `${parsed.direction}:${parsed.index}`,
    direction: parsed.direction,
    failedCheckpointIndex: parsed.index,
    failedCheckpointTarget: [...points[parsed.index]],
    stagingIndex,
    stagingPoint: [...points[stagingIndex]],
    checkpointIndices,
    checkpoints: checkpointIndices.map((index) => ({
      index,
      point: [...points[index]],
      segmentStart: [...points[index - 1]],
      segmentGoal: [...points[index]],
      role: index === parsed.index
        ? 'failed-segment'
        : index < parsed.index
          ? 'entry-adjacent-seam'
          : 'exit-adjacent-seam',
    })),
    endToEndAcceptanceEligible: false,
    remainingGate: 'fresh uncached PASS_BIDIRECTIONAL full-route live walk',
  };
}

export function firstFailedRouteCheckpoint(audit) {
  for (const direction of ['forward', 'reverse']) {
    const checkpoint = (audit?.[direction]?.checkpoints ?? [])
      .find((entry) => entry?.passed !== true);
    if (checkpoint) {
      return {
        direction,
        index: Number(checkpoint.index),
        target: checkpoint.target,
      };
    }
  }
  return null;
}

export function buildSegmentCacheBinding({
  bot,
  snapshotSha256,
  routeReportSha256,
  exactPathSha256,
  routineWaypoints,
  relevantCodePolicySha256,
  serviceBuildSha256,
  serviceInstance,
  movementPolicy,
}) {
  const binding = {
    schemaVersion: 1,
    bot,
    snapshotSha256,
    routeReportSha256,
    exactPathSha256,
    routineWaypointsSha256: sha256CanonicalJson(routineWaypoints),
    relevantCodePolicySha256,
    serviceBuildSha256,
    serviceInstance: {
      mainPid: Number(serviceInstance.mainPid),
      execMainStartTimestamp: serviceInstance.execMainStartTimestamp,
    },
    movementPolicy,
  };
  for (const [key, value] of Object.entries(binding)) {
    invariant(value !== undefined && value !== null, `binding field ${key} is required`);
  }
  return {
    ...binding,
    bindingSha256: sha256CanonicalJson(binding),
  };
}

export function createOrRotateSegmentCache(existing, binding) {
  if (existing?.current?.bindingSha256 === binding.bindingSha256) {
    return {
      ...existing,
      schemaVersion: 1,
      current: {
        ...existing.current,
        binding,
      },
    };
  }
  const staleGenerations = [
    ...(existing?.staleGenerations ?? []),
    ...(existing?.current ? [existing.current] : []),
  ].slice(-20);
  return {
    schemaVersion: 1,
    purpose: 'diagnostic segment pass cache; never an end-to-end acceptance artifact',
    current: {
      binding,
      bindingSha256: binding.bindingSha256,
      passes: {},
      endToEndAcceptanceEligible: false,
    },
    staleGenerations,
  };
}

export function recordSegmentWindowPasses(cache, plan, audit) {
  invariant(
    cache?.current?.bindingSha256 === audit?.runtimeBinding?.bindingSha256,
    'audit/cache binding mismatch',
  );
  const next = structuredClone(cache);
  const resultsByIndex = new Map(
    (audit.window?.checkpoints ?? []).map((entry) => [Number(entry.index), entry]),
  );
  for (const checkpoint of plan.checkpoints) {
    const result = resultsByIndex.get(checkpoint.index);
    if (!result?.passed) continue;
    const key = `${plan.direction}:${checkpoint.index}`;
    next.current.passes[key] = {
      direction: plan.direction,
      index: checkpoint.index,
      point: checkpoint.point,
      role: checkpoint.role,
      passedAtUtc: audit.generatedAtUtc,
      auditFile: audit.auditFile,
      arrival: result.arrival,
      controlledWalkStatus: result.controlledWalkStatus,
      bindingSha256: next.current.bindingSha256,
    };
  }
  next.current.updatedAtUtc = audit.generatedAtUtc;
  next.current.cachedPassCount = Object.keys(next.current.passes).length;
  next.current.endToEndAcceptanceEligible = false;
  next.current.remainingGate = plan.remainingGate;
  return next;
}

