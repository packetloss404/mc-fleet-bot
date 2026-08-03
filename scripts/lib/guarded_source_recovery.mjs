import crypto from 'crypto';

import { completeBlockState } from './complete_block_state.mjs';

const POTENTIAL_BLOCK_ENTITY_NAMES = new Set([
  'barrel',
  'beacon',
  'beehive',
  'bee_nest',
  'bell',
  'blast_furnace',
  'brewing_stand',
  'calibrated_sculk_sensor',
  'campfire',
  'chest',
  'chiseled_bookshelf',
  'command_block',
  'comparator',
  'conduit',
  'crafter',
  'creaking_heart',
  'daylight_detector',
  'decorated_pot',
  'dispenser',
  'dropper',
  'enchanting_table',
  'ender_chest',
  'end_gateway',
  'end_portal',
  'furnace',
  'hopper',
  'jigsaw',
  'jukebox',
  'lectern',
  'moving_piston',
  'piston',
  'sculk_catalyst',
  'sculk_sensor',
  'sculk_shrieker',
  'smoker',
  'spawner',
  'structure_block',
  'suspicious_gravel',
  'suspicious_sand',
  'trapped_chest',
  'trial_spawner',
  'vault',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function pointKey(point) {
  return point.join(',');
}

function splitMasks(mask) {
  const output = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const char = mask[index];
    if (char === '[') depth += 1;
    else if (char === ']') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  output.push(mask.slice(start));
  return output.filter(Boolean);
}

function normalizeBlock(block) {
  const source = String(block);
  const bracket = source.indexOf('[');
  if (bracket < 0) return source;
  if (!source.endsWith(']')) throw new Error(`malformed block state: ${source}`);
  const name = source.slice(0, bracket);
  const properties = source
    .slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort()
    .join(',');
  return properties ? `${name}[${properties}]` : name;
}

function requireCompleteState(rawState, context) {
  const normalized = normalizeBlock(rawState);
  let completed;
  try {
    completed = completeBlockState(normalized);
  } catch (error) {
    throw new Error(`${context}: ${error.message}`);
  }
  if (completed !== normalized) {
    throw new Error(
      `${context}: incomplete state ${normalized}; canonical complete state is ${completed}`,
    );
  }
  return normalized;
}

function baseBlockName(state) {
  return state.split('[', 1)[0].replace(/^minecraft:/, '');
}

function isPotentialBlockEntity(state) {
  const name = baseBlockName(state);
  return (
    POTENTIAL_BLOCK_ENTITY_NAMES.has(name)
    || name.endsWith('_banner')
    || name.endsWith('_bed')
    || name.endsWith('_chest')
    || name.endsWith('_command_block')
    || name.endsWith('_golem_statue')
    || name.endsWith('_head')
    || name.endsWith('_hanging_sign')
    || name.endsWith('_shulker_box')
    || name.endsWith('_shelf')
    || name.endsWith('_sign')
    || name.endsWith('_skull')
    || name.endsWith('_wall_banner')
    || name.endsWith('_wall_hanging_sign')
    || name.endsWith('_wall_sign')
  );
}

function normalizeBox(box, context) {
  if (!Array.isArray(box) || box.length !== 6 || box.some((value) => !Number.isInteger(value))) {
    throw new Error(`${context}: box must contain six integers`);
  }
  return box.map(Number);
}

function volumeOf(box) {
  return (
    (Math.abs(box[3] - box[0]) + 1)
    * (Math.abs(box[4] - box[1]) + 1)
    * (Math.abs(box[5] - box[2]) + 1)
  );
}

function pointInBox(point, box) {
  return (
    point[0] >= Math.min(box[0], box[3])
    && point[0] <= Math.max(box[0], box[3])
    && point[1] >= Math.min(box[1], box[4])
    && point[1] <= Math.max(box[1], box[4])
    && point[2] >= Math.min(box[2], box[5])
    && point[2] <= Math.max(box[2], box[5])
  );
}

function expandBox(box, visit) {
  const [x1, x2] = [Math.min(box[0], box[3]), Math.max(box[0], box[3])];
  const [y1, y2] = [Math.min(box[1], box[4]), Math.max(box[1], box[4])];
  const [z1, z2] = [Math.min(box[2], box[5]), Math.max(box[2], box[5])];
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) visit([x, y, z]);
    }
  }
}

export function parseGuardedOperations(opsText) {
  const lines = String(opsText).split(/\r?\n/);
  const operations = [];
  let sourceSnapshotSha256 = null;
  for (let index = 0; index < lines.length; index += 1) {
    const source = lines[index].trim();
    if (!source) continue;
    const snapshotMatch = source.match(/^# source_snapshot_sha256:\s*([a-f0-9]{64})$/);
    if (snapshotMatch) sourceSnapshotSha256 = snapshotMatch[1];
    if (source.startsWith('#') || source.startsWith('CMD ')) continue;
    const fields = source.split(/\s+/);
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      throw new Error(`canonical line ${index + 1}: unsupported operation syntax`);
    }
    const box = normalizeBox(fields.slice(1, 7).map(Number), `canonical line ${index + 1}`);
    const expected = splitMasks(fields[7]).map((state) => (
      requireCompleteState(state, `canonical line ${index + 1} expected state`)
    ));
    if (expected.length !== 1) {
      throw new Error(
        `canonical line ${index + 1}: source restoration is ambiguous across `
        + `${expected.length} accepted masks`,
      );
    }
    operations.push({
      line: index + 1,
      box,
      expected,
      replacement: requireCompleteState(
        fields[8],
        `canonical line ${index + 1} replacement state`,
      ),
      volume: volumeOf(box),
    });
  }
  if (operations.length === 0) throw new Error('canonical operation file has no REPL operations');
  if (!sourceSnapshotSha256) {
    throw new Error('canonical operation file lacks # source_snapshot_sha256 binding');
  }
  return {
    operations,
    sourceSnapshotSha256,
    sha256: sha256(opsText),
  };
}

function compareArrays(left, right) {
  return (
    Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index])
  );
}

function validatePreflight(preflight, canonical) {
  if (!preflight || typeof preflight !== 'object') {
    throw new Error('preflight report must be a JSON object');
  }
  if (preflight.schemaVersion !== 2) {
    throw new Error(`preflight schemaVersion must be 2, got ${preflight.schemaVersion}`);
  }
  if (preflight.orderAwareProjection !== true) {
    throw new Error('preflight report is not order-aware');
  }
  if (preflight.failurePointsComplete !== true) {
    throw new Error('preflight report does not guarantee complete failure points');
  }
  if (!Array.isArray(preflight.partialMasks) || preflight.partialMasks.length !== 0) {
    throw new Error('preflight contains partial-mask operations; exact recovery is ambiguous');
  }
  if (
    typeof preflight.regions !== 'string'
    || !preflight.regions
    || preflight.regionsSnapshot?.algorithm
      !== 'sha256(filename + NUL + bytes + NUL, sorted by filename)'
    || !/^[a-f0-9]{64}$/.test(preflight.regionsSnapshot?.sha256 ?? '')
    || !Number.isInteger(preflight.regionsSnapshot?.regionFileCount)
    || preflight.regionsSnapshot.regionFileCount <= 0
    || !Array.isArray(preflight.regionsSnapshot?.members)
    || preflight.regionsSnapshot.members.length !== preflight.regionsSnapshot.regionFileCount
    || preflight.regionsSnapshot.members.some((member) => (
      typeof member?.file !== 'string'
      || !member.file.endsWith('.mca')
      || !Number.isInteger(member?.bytes)
      || member.bytes <= 0
      || !/^[a-f0-9]{64}$/.test(member?.sha256 ?? '')
    ))
  ) {
    throw new Error('preflight lacks a complete immutable Anvil snapshot identity');
  }
  if (preflight.opsSha256 !== canonical.sha256) {
    throw new Error(
      `preflight ops hash ${preflight.opsSha256 ?? 'missing'} does not match canonical `
      + canonical.sha256,
    );
  }
  if (preflight.operationCount !== canonical.operations.length) {
    throw new Error(
      `preflight operation count ${preflight.operationCount} does not match canonical `
      + canonical.operations.length,
    );
  }
  if (
    !Number.isInteger(preflight.passed)
    || !Number.isInteger(preflight.failed)
    || preflight.passed + preflight.failed !== preflight.operationCount
  ) {
    throw new Error('preflight pass/fail counts are inconsistent');
  }
  if (!Array.isArray(preflight.failures) || preflight.failures.length !== preflight.failed) {
    throw new Error('preflight failures array does not match failed count');
  }
  if (preflight.failed === 0) {
    throw new Error('preflight has no failures; no source restoration is justified');
  }

  const operationsByLine = new Map(
    canonical.operations.map((operation) => [operation.line, operation]),
  );
  const failuresByLine = new Map();
  const pointObservations = new Map();
  for (const failure of preflight.failures) {
    if (!Number.isInteger(failure.line) || failuresByLine.has(failure.line)) {
      throw new Error(`duplicate or invalid failure line ${failure.line}`);
    }
    const operation = operationsByLine.get(failure.line);
    if (!operation) throw new Error(`failure line ${failure.line} is not a canonical REPL`);
    const box = normalizeBox(failure.box, `failure line ${failure.line}`);
    const expected = (failure.expected ?? []).map(normalizeBlock);
    const replacement = normalizeBlock(failure.replacement);
    if (
      !compareArrays(box, operation.box)
      || !compareArrays(expected, operation.expected)
      || replacement !== operation.replacement
      || failure.volume !== operation.volume
    ) {
      throw new Error(`failure line ${failure.line} does not bind to its canonical operation`);
    }
    if (
      failure.passed !== false
      || failure.partialMask !== false
      || !Number.isInteger(failure.matched)
      || failure.matched < 0
      || failure.matched >= failure.volume
      || failure.unexpectedComplete !== true
      || !Number.isInteger(failure.unexpectedCount)
      || failure.unexpectedCount <= 0
      || !Array.isArray(failure.unexpected)
      || failure.unexpectedCount !== failure.unexpected.length
      || failure.matched + failure.unexpectedCount !== failure.volume
    ) {
      throw new Error(`failure line ${failure.line} has incomplete or inconsistent target evidence`);
    }
    const observations = new Map();
    for (const entry of failure.unexpected) {
      const point = Array.isArray(entry?.point) ? entry.point.map(Number) : [];
      if (
        point.length !== 3
        || point.some((coordinate) => !Number.isInteger(coordinate))
        || !pointInBox(point, operation.box)
      ) {
        throw new Error(`failure line ${failure.line} contains an invalid target point`);
      }
      const key = pointKey(point);
      if (observations.has(key)) {
        throw new Error(`failure line ${failure.line} duplicates target ${key}`);
      }
      const actual = requireCompleteState(
        entry.actual,
        `failure line ${failure.line} target ${key} actual state`,
      );
      observations.set(key, actual);
      if (!pointObservations.has(key)) {
        pointObservations.set(key, { point, failures: new Map() });
      }
      pointObservations.get(key).failures.set(failure.line, actual);
    }
    failuresByLine.set(failure.line, { failure, observations });
  }
  if (pointObservations.size === 0) {
    throw new Error('failed preflight contains no unexpected target cells');
  }
  return { failuresByLine, pointObservations };
}

function recoverySort(left, right) {
  const leftAir = left.requiredSource === 'minecraft:air';
  const rightAir = right.requiredSource === 'minecraft:air';
  if (leftAir !== rightAir) return leftAir ? -1 : 1;
  if (leftAir) {
    return (
      right.point[1] - left.point[1]
      || left.point[2] - right.point[2]
      || left.point[0] - right.point[0]
    );
  }
  return (
    left.point[1] - right.point[1]
    || left.point[2] - right.point[2]
    || left.point[0] - right.point[0]
  );
}

export function buildGuardedSourceRecovery({ opsText, preflight }) {
  const canonical = parseGuardedOperations(opsText);
  const validated = validatePreflight(preflight, canonical);
  const candidateKeys = new Set(validated.pointObservations.keys());
  const histories = new Map([...candidateKeys].map((key) => [key, []]));

  for (const operation of canonical.operations) {
    expandBox(operation.box, (point) => {
      const key = pointKey(point);
      if (!candidateKeys.has(key)) return;
      histories.get(key).push(operation);
    });
  }

  const restorations = [];
  const cascadeProofs = [];
  const verificationCells = [];
  for (const [key, evidence] of validated.pointObservations) {
    const history = histories.get(key);
    if (!history?.length) throw new Error(`target ${key} has no canonical operation history`);
    for (let index = 1; index < history.length; index += 1) {
      if (history[index].expected[0] !== history[index - 1].replacement) {
        throw new Error(
          `target ${key} has an ambiguous/non-contiguous canonical chain between lines `
          + `${history[index - 1].line} and ${history[index].line}`,
        );
      }
    }

    const requiredSource = history[0].expected[0];
    const firstFailure = validated.failuresByLine.get(history[0].line);
    const firstActual = firstFailure?.observations.get(key);
    // If the first touch passed, or its group failed because another target
    // drifted while this point matched, the raw snapshot source is proven.
    const rawSnapshotState = firstActual ?? requiredSource;
    let projected = rawSnapshotState;
    const failureLines = [];
    for (const operation of history) {
      const failedOperation = validated.failuresByLine.get(operation.line);
      const observed = failedOperation?.observations.get(key);
      if (failedOperation) {
        failureLines.push(operation.line);
        if (observed !== undefined) {
          if (observed !== projected) {
            throw new Error(
              `target ${key} projection mismatch at line ${operation.line}: `
              + `report observed ${observed}, reconstructed ${projected}`,
            );
          }
        } else if (projected !== operation.expected[0]) {
          throw new Error(
            `target ${key} was omitted from a failed line ${operation.line} even though `
            + `its reconstructed state ${projected} does not match ${operation.expected[0]}`,
          );
        }
        // Failed operations are not projected by preflight_guarded_ops.
        continue;
      }
      if (projected !== operation.expected[0]) {
        throw new Error(
          `target ${key} cannot have passed canonical line ${operation.line}: `
          + `${projected} does not match ${operation.expected[0]}`,
        );
      }
      projected = operation.replacement;
    }

    verificationCells.push({
      point: evidence.point,
      requiredSource,
      firstCanonicalTouchLine: history[0].line,
      failureLines,
    });
    if (firstActual !== undefined) {
      if (isPotentialBlockEntity(firstActual) || isPotentialBlockEntity(requiredSource)) {
        throw new Error(
          `target ${key} may contain block-entity NBT (${firstActual} -> ${requiredSource}); `
          + 'block-state-only recovery is prohibited',
        );
      }
      restorations.push({
        point: evidence.point,
        observedSourceDrift: firstActual,
        requiredSource,
        firstCanonicalTouchLine: history[0].line,
        failureLines,
        canonicalTouchCount: history.length,
      });
    } else {
      cascadeProofs.push({
        point: evidence.point,
        requiredSource,
        firstCanonicalTouchLine: history[0].line,
        failureLines,
        canonicalTouchCount: history.length,
        reason: 'raw source proven; later failure is an order-projection cascade',
      });
    }
  }

  restorations.sort(recoverySort);
  verificationCells.sort((left, right) => (
    left.point[1] - right.point[1]
    || left.point[2] - right.point[2]
    || left.point[0] - right.point[0]
  ));
  const operationLines = restorations.map(({ point, observedSourceDrift, requiredSource }) => (
    `REPL ${point.join(' ')} ${point.join(' ')} ${observedSourceDrift} ${requiredSource}`
  ));
  const verificationLines = verificationCells.map(({ point, requiredSource }) => (
    `REPL ${point.join(' ')} ${point.join(' ')} ${requiredSource} ${requiredSource}`
  ));
  return {
    canonical,
    restorations,
    cascadeProofs,
    verificationCells,
    operationLines,
    verificationLines,
    recoveryCellCount: restorations.length,
    provenFailurePointCount: validated.pointObservations.size,
  };
}

export function hashText(value) {
  return sha256(value);
}
