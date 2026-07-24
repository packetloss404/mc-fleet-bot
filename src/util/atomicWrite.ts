import fs from 'fs';
import path from 'path';
import * as crypto from 'crypto';

/**
 * Build a UNIQUE temp path for an atomic write.
 *
 * A fixed `<file>.tmp` is not atomic when more than one writer targets the
 * same file: each of the 5 bot worker threads holds its own StatsTracker,
 * SocialMemory, PlanLibrary, SkillLibrary and qa-cache over the SAME paths, so
 * two writers shared one temp file and tore each other's output mid-write.
 * That is the source of the corrupt `qa_cache.json` and a contributor to the
 * 47.9% orphan rate in `skills/`.
 *
 * pid + random suffix makes each writer's temp file private; the rename is
 * still atomic, so the reader sees either the old file or a complete new one.
 * (The same pattern is already used for schematic uploads.)
 *
 * NOTE: this makes each write self-consistent. It does NOT make concurrent
 * read-modify-write sequences safe — last writer still wins on whole-file
 * rewrites. Fixing lost updates needs a single writer or a real store.
 */
function tempPathFor(filePath: string): string {
  return `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
}

/** Remove a temp file, ignoring errors — best-effort cleanup on a failed write. */
function discard(tmpPath: string): void {
  try { fs.unlinkSync(tmpPath); } catch { /* nothing to clean up */ }
}

/**
 * Write JSON data to a file atomically by first writing to a .tmp file
 * then renaming. This prevents partial/corrupt writes on crash.
 *
 * Use this when you need the write to complete before returning (e.g. on shutdown).
 * For debounced periodic saves, prefer {@link atomicWriteJson}.
 */
export function atomicWriteJsonSync(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = tempPathFor(filePath);
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    discard(tmpPath);
    throw err;
  }
}

/**
 * Async sibling of {@link atomicWriteJsonSync}. Same atomic semantics, but
 * doesn't block the event loop on JSON serialization or disk I/O. Prefer this
 * for periodic/debounced saves; use the sync variant only when shutdown
 * requires the write to flush before exit.
 */
export async function atomicWriteJson(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tmpPath = tempPathFor(filePath);
  try {
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2));
    await fs.promises.rename(tmpPath, filePath);
  } catch (err) {
    discard(tmpPath);
    throw err;
  }
}

/**
 * Atomic write for raw text (e.g. learned skill JavaScript source) — same
 * tmp+rename pattern as the JSON helpers, but without JSON.stringify so the
 * caller's exact byte payload lands on disk.
 */
export function atomicWriteTextSync(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = tempPathFor(filePath);
  try {
    fs.writeFileSync(tmpPath, content);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    discard(tmpPath);
    throw err;
  }
}

/** Async sibling of {@link atomicWriteTextSync}. */
export async function atomicWriteText(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tmpPath = tempPathFor(filePath);
  try {
    await fs.promises.writeFile(tmpPath, content);
    await fs.promises.rename(tmpPath, filePath);
  } catch (err) {
    discard(tmpPath);
    throw err;
  }
}

/**
 * Atomic write for binary buffers (e.g. uploaded schematic .schem files).
 * Same tmp+rename pattern.
 */
export function atomicWriteBufferSync(filePath: string, data: Buffer | Uint8Array): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = tempPathFor(filePath);
  try {
    fs.writeFileSync(tmpPath, data);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    discard(tmpPath);
    throw err;
  }
}
