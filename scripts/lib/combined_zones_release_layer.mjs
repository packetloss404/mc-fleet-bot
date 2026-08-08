import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const ROOT = process.cwd();

export function resolveFromRoot(value) {
  return path.resolve(ROOT, value);
}

export function relativeToRoot(filename) {
  return path.relative(ROOT, filename);
}

export function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

export function sha256Json(value) {
  return crypto.createHash('sha256').update(`${JSON.stringify(value)}\n`).digest('hex');
}

export function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

export function hashSnapshotDirectory(directory) {
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  const digest = crypto.createHash('sha256');
  const members = [];
  for (const name of files) {
    const bytes = fs.readFileSync(path.join(directory, name));
    digest.update(name);
    digest.update('\0');
    digest.update(bytes);
    digest.update('\0');
    members.push({
      file: name,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    regionFileCount: members.length,
    members,
  };
}

export function parseOperations(filename, { retainBoxes = true } = {}) {
  const boxes = [];
  let replGroups = 0;
  let commandGroups = 0;
  let targetCells = 0;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const [index, raw] of fs.readFileSync(filename, 'utf8').split(/\r?\n/).entries()) {
    const fields = raw.trim().split(/\s+/);
    if (!fields[0] || fields[0].startsWith('#')) continue;
    if (fields[0] === 'CMD') {
      commandGroups += 1;
      continue;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      throw new Error(`${filename}:${index + 1}: malformed operation`);
    }
    const coordinates = fields.slice(1, 7).map(Number);
    if (coordinates.some((value) => !Number.isSafeInteger(value))) {
      throw new Error(`${filename}:${index + 1}: invalid coordinate`);
    }
    const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = coordinates;
    const box = [
      Math.min(rawX1, rawX2), Math.min(rawY1, rawY2), Math.min(rawZ1, rawZ2),
      Math.max(rawX1, rawX2), Math.max(rawY1, rawY2), Math.max(rawZ1, rawZ2),
    ];
    const volume = (box[3] - box[0] + 1) * (box[4] - box[1] + 1) * (box[5] - box[2] + 1);
    targetCells += volume;
    minX = Math.min(minX, box[0]);
    minY = Math.min(minY, box[1]);
    minZ = Math.min(minZ, box[2]);
    maxX = Math.max(maxX, box[3]);
    maxY = Math.max(maxY, box[4]);
    maxZ = Math.max(maxZ, box[5]);
    if (retainBoxes) boxes.push({ line: index + 1, box });
    replGroups += 1;
  }
  if (replGroups === 0) throw new Error(`${filename}: no REPL operations`);
  return {
    path: relativeToRoot(filename),
    sha256: sha256File(filename),
    replGroups,
    commandGroups,
    targetCells,
    bounds: [minX, minY, minZ, maxX, maxY, maxZ],
    boxes,
  };
}

export function boxesIntersect(left, right) {
  return !(
    left[3] < right[0] || right[3] < left[0]
    || left[4] < right[1] || right[4] < left[1]
    || left[5] < right[2] || right[5] < left[2]
  );
}

export function operationsIntersect(left, right) {
  for (const leftBox of left.boxes) {
    for (const rightBox of right.boxes) {
      if (boxesIntersect(leftBox.box, rightBox.box)) {
        return { leftLine: leftBox.line, rightLine: rightBox.line, box: leftBox.box };
      }
    }
  }
  return null;
}

export function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    if (item === '--execute' || item === '--dry-run' || item === '--allow-blocked' || item === '--partial') {
      values.set(item, true);
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      const current = values.get(item);
      const next = argv[index + 1];
      values.set(item, current === undefined ? next : [...(Array.isArray(current) ? current : [current]), next]);
      index += 1;
    }
  }
  return values;
}

export function repeatedArg(args, name) {
  const value = args.get(name);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function requiredArg(args, name) {
  const value = args.get(name);
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

export function loadProtectedBounds(contract) {
  return (contract.protectedNoTouchSubjects ?? []).map((subject) => ({
    id: subject.id,
    bounds: [
      subject.planningBounds.minX,
      subject.planningBounds.minY,
      subject.planningBounds.minZ,
      subject.planningBounds.maxX,
      subject.planningBounds.maxY,
      subject.planningBounds.maxZ,
    ],
  }));
}
