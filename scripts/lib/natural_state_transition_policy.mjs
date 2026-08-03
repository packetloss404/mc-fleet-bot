import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const COPPER_FAMILIES = new Set([
  'chiseled_copper',
  'copper_block',
  'copper_bulb',
  'copper_door',
  'copper_grate',
  'copper_trapdoor',
  'cut_copper',
  'cut_copper_slab',
  'cut_copper_stairs',
]);
const OXIDATION_STAGES = new Map([
  ['', 0],
  ['exposed_', 1],
  ['weathered_', 2],
  ['oxidized_', 3],
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeState(state) {
  const source = String(state);
  const bracket = source.indexOf('[');
  if (bracket < 0) return source;
  if (!source.endsWith(']')) throw new Error(`malformed block state ${source}`);
  const properties = source
    .slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort();
  return `${source.slice(0, bracket)}[${properties.join(',')}]`;
}

function parseState(state) {
  const normalized = normalizeState(state);
  const bracket = normalized.indexOf('[');
  const name = bracket < 0 ? normalized : normalized.slice(0, bracket);
  const properties = bracket < 0 ? '' : normalized.slice(bracket);
  return { normalized, name, properties };
}

export function copperOxidationIdentity(state) {
  const parsed = parseState(state);
  if (!parsed.name.startsWith('minecraft:')) return null;
  const localName = parsed.name.slice('minecraft:'.length);
  if (localName.startsWith('waxed_')) return null;
  for (const [prefix, stage] of [...OXIDATION_STAGES].reverse()) {
    if (!localName.startsWith(prefix)) continue;
    const family = localName.slice(prefix.length);
    if (!COPPER_FAMILIES.has(family)) return null;
    return {
      family: `minecraft:${family}`,
      stage,
      properties: parsed.properties,
      normalized: parsed.normalized,
    };
  }
  return null;
}

export function isNaturalCopperOxidationEvolution(canonical, actual) {
  const source = copperOxidationIdentity(canonical);
  const evolved = copperOxidationIdentity(actual);
  return Boolean(
    source
    && evolved
    && source.family === evolved.family
    && source.properties === evolved.properties
    && evolved.stage > source.stage,
  );
}

function validateHash(value, label) {
  if (!/^[a-f0-9]{64}$/.test(String(value ?? ''))) {
    throw new Error(`${label} must be a lowercase SHA-256`);
  }
}

function pointKey(point) {
  return point.join(',');
}

function inBox(point, box) {
  return point[0] >= Math.min(box[0], box[3])
    && point[0] <= Math.max(box[0], box[3])
    && point[1] >= Math.min(box[1], box[4])
    && point[1] <= Math.max(box[1], box[4])
    && point[2] >= Math.min(box[2], box[5])
    && point[2] <= Math.max(box[2], box[5]);
}

function validateEvidence(policy, policyPath) {
  const evidence = policy.evidence;
  if (!evidence || typeof evidence !== 'object') {
    throw new Error('policy evidence binding is missing');
  }
  validateHash(evidence.preflightSha256, 'evidence.preflightSha256');
  validateHash(evidence.snapshotSha256, 'evidence.snapshotSha256');
  if (typeof evidence.preflightPath !== 'string' || !evidence.preflightPath) {
    throw new Error('evidence.preflightPath is missing');
  }
  const root = policyPath
    ? path.resolve(path.dirname(policyPath), evidence.preflightPath)
    : path.resolve(evidence.preflightPath);
  const fallback = path.resolve(process.cwd(), evidence.preflightPath);
  const preflightPath = fs.existsSync(root) ? root : fallback;
  if (!fs.existsSync(preflightPath)) {
    throw new Error(`policy evidence preflight does not exist: ${preflightPath}`);
  }
  const bytes = fs.readFileSync(preflightPath);
  if (sha256(bytes) !== evidence.preflightSha256) {
    throw new Error('policy evidence preflight SHA-256 mismatch');
  }
  const preflight = JSON.parse(bytes.toString('utf8'));
  if (
    Number(preflight.schemaVersion) < 2
    || preflight.orderAwareProjection !== true
    || preflight.failurePointsComplete !== true
    || !Array.isArray(preflight.partialMasks)
    || preflight.partialMasks.length !== 0
    || preflight.opsSha256 !== policy.operation.sha256
    || preflight.regionsSnapshot?.sha256 !== evidence.snapshotSha256
    || preflight.failed !== preflight.failures?.length
    || preflight.failed < 1
    || preflight.failures.some((failure) => (
      failure.unexpectedComplete !== true
      || failure.unexpectedCount !== failure.unexpected?.length
    ))
  ) {
    throw new Error('policy evidence preflight identity or failure contract changed');
  }
  const observed = new Map();
  for (const failure of preflight.failures) {
    for (const entry of failure.unexpected ?? []) {
      observed.set(
        `${failure.line}:${pointKey(entry.point)}`,
        normalizeState(entry.actual),
      );
    }
  }
  const declared = new Map();
  for (const rule of policy.rules) {
    for (const point of rule.points) {
      const key = `${rule.line}:${pointKey(point)}`;
      declared.set(key, new Set(rule.allowedActualStates));
    }
  }
  if (observed.size !== declared.size) {
    throw new Error(
      `policy evidence/declaration cell count mismatch `
      + `(${observed.size} observed, ${declared.size} declared)`,
    );
  }
  for (const [key, actual] of observed) {
    if (!declared.get(key)?.has(actual)) {
      throw new Error(`policy does not exactly bind observed transition ${key}=${actual}`);
    }
  }
  return {
    preflightPath,
    preflightSha256: evidence.preflightSha256,
    snapshotSha256: evidence.snapshotSha256,
    observedTransitionCells: observed.size,
  };
}

export function validateNaturalStateTransitionPolicy(
  policy,
  {
    operationSha256,
    operationPath = null,
    operations = null,
    policyPath = null,
    requireEvidence = true,
  } = {},
) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    throw new Error('natural-state-transition policy must be a JSON object');
  }
  if (
    policy.schemaVersion !== 1
    || policy.kind !== 'natural-block-state-transition'
    || policy.executionRole !== 'rollback'
    || policy.matchMode !== 'exact-declared-points'
    || policy.propertyPolicy !== 'identical'
  ) {
    throw new Error('unsupported natural-state-transition policy contract');
  }
  if (!policy.operation || typeof policy.operation !== 'object') {
    throw new Error('policy operation binding is missing');
  }
  validateHash(policy.operation.sha256, 'operation.sha256');
  if (operationSha256 && policy.operation.sha256 !== operationSha256) {
    throw new Error(
      `policy operation hash ${policy.operation.sha256} does not match `
      + `${operationSha256}`,
    );
  }
  if (
    typeof policy.operation.path !== 'string'
    || !policy.operation.path
    || (
      operationPath
      && path.resolve(policy.operation.path) !== path.resolve(operationPath)
    )
  ) {
    throw new Error('policy operation path does not match the supplied operation');
  }
  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    throw new Error('policy must declare at least one transition rule');
  }
  const operationByLine = operations
    ? new Map(operations.map((operation) => [operation.line, operation]))
    : null;
  const seenRules = new Set();
  const seenPoints = new Set();
  const rules = [];
  for (const rawRule of policy.rules) {
    if (
      !rawRule
      || typeof rawRule !== 'object'
      || typeof rawRule.id !== 'string'
      || !rawRule.id
      || !Number.isSafeInteger(rawRule.line)
      || rawRule.line < 1
      || !Array.isArray(rawRule.box)
      || rawRule.box.length !== 6
      || rawRule.box.some((value) => !Number.isSafeInteger(value))
      || !Array.isArray(rawRule.points)
      || rawRule.points.length === 0
      || !Array.isArray(rawRule.allowedActualStates)
      || rawRule.allowedActualStates.length === 0
    ) {
      throw new Error('malformed natural-state-transition rule');
    }
    if (seenRules.has(rawRule.id)) throw new Error(`duplicate policy rule ${rawRule.id}`);
    seenRules.add(rawRule.id);
    const canonicalSource = normalizeState(rawRule.canonicalSource);
    const allowedActualStates = rawRule.allowedActualStates.map(normalizeState);
    if (new Set(allowedActualStates).size !== allowedActualStates.length) {
      throw new Error(`${rawRule.id}: duplicate allowedActualStates`);
    }
    for (const actual of allowedActualStates) {
      if (!isNaturalCopperOxidationEvolution(canonicalSource, actual)) {
        throw new Error(
          `${rawRule.id}: ${canonicalSource} -> ${actual} is not a same-family `
          + 'forward copper oxidation with identical properties',
        );
      }
    }
    const operation = operationByLine?.get(rawRule.line);
    if (operationByLine && !operation) {
      throw new Error(`${rawRule.id}: no REPL operation exists at line ${rawRule.line}`);
    }
    if (operation) {
      const operationSources = operation.expected ?? operation.sources;
      if (
        JSON.stringify(operation.box) !== JSON.stringify(rawRule.box)
        || operationSources?.length !== 1
        || normalizeState(operationSources[0]) !== canonicalSource
      ) {
        throw new Error(`${rawRule.id}: rule does not match the exact canonical group`);
      }
    }
    const points = rawRule.points.map((point) => {
      if (
        !Array.isArray(point)
        || point.length !== 3
        || point.some((value) => !Number.isSafeInteger(value))
        || !inBox(point, rawRule.box)
      ) {
        throw new Error(`${rawRule.id}: invalid or out-of-box policy point`);
      }
      const key = `${rawRule.line}:${pointKey(point)}`;
      if (seenPoints.has(key)) throw new Error(`duplicate policy point ${key}`);
      seenPoints.add(key);
      return [...point];
    });
    rules.push({
      id: rawRule.id,
      line: rawRule.line,
      box: [...rawRule.box],
      canonicalSource,
      allowedActualStates,
      points,
    });
  }
  const evidence = requireEvidence ? validateEvidence(policy, policyPath) : null;
  return {
    policy,
    operationSha256: policy.operation.sha256,
    rules,
    ruleByLine: new Map(rules.map((rule) => [rule.line, rule])),
    declaredPointCount: seenPoints.size,
    evidence,
  };
}

export function loadNaturalStateTransitionPolicy(
  filename,
  options = {},
) {
  const absolute = path.resolve(filename);
  const bytes = fs.readFileSync(absolute);
  const policy = JSON.parse(bytes.toString('utf8'));
  const validated = validateNaturalStateTransitionPolicy(policy, {
    ...options,
    policyPath: absolute,
  });
  return {
    ...validated,
    path: absolute,
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

export function policyAllowsTransition(validated, operation, point, actual) {
  const rule = validated?.ruleByLine?.get(operation.line);
  if (!rule) return false;
  if (!rule.points.some((candidate) => pointKey(candidate) === pointKey(point))) {
    return false;
  }
  const operationSources = operation.expected ?? operation.sources;
  return rule.canonicalSource === normalizeState(operationSources[0])
    && rule.allowedActualStates.includes(normalizeState(actual));
}
