import path from 'node:path';

import { DevtoolsError } from '@mc-fleet/world-core';

import { summarizeSnapshot } from './snapshot.js';
import type { SnapshotSummary } from './types.js';

export interface SnapshotDiffRegion {
  filename: string;
  regionX: number;
  regionZ: number;
}

export interface SnapshotDiff {
  type: 'snapshot-diff';
  thisSnapshot: SnapshotSummary;
  otherSnapshot: SnapshotSummary;
  added: SnapshotDiffRegion[];
  removed: SnapshotDiffRegion[];
  changed: Array<
    SnapshotDiffRegion & { thisSha256: string; otherSha256: string; bytesDelta: number }
  >;
  unchanged: number;
  identical: boolean;
}

/**
 * Compare two snapshot directories by per-region SHA-256. The first
 * argument is the baseline; the second is what to compare against.
 *
 * - `added`   = regions present in `other` but missing in `this` (new since baseline)
 * - `removed` = regions present in `this` but missing in `other` (gone since baseline)
 * - `changed` = regions present in both with different content
 */
export function diffSnapshots(thisDirectory: string, otherDirectory: string): SnapshotDiff {
  const thisSnapshot = summarizeSnapshot(thisDirectory);
  let otherSnapshot: SnapshotSummary;
  try {
    otherSnapshot = summarizeSnapshot(otherDirectory);
  } catch (error) {
    if (error instanceof DevtoolsError) {
      throw new DevtoolsError(`Other snapshot unavailable: ${error.message}`, error.code, {
        thisDirectory,
        otherDirectory,
        ...(error.details ?? {}),
      });
    }
    throw error;
  }
  const thisByFile = new Map(thisSnapshot.members.map((member) => [member.filename, member]));
  const otherByFile = new Map(otherSnapshot.members.map((member) => [member.filename, member]));
  const added: SnapshotDiffRegion[] = [];
  const removed: SnapshotDiffRegion[] = [];
  const changed: Array<
    SnapshotDiffRegion & { thisSha256: string; otherSha256: string; bytesDelta: number }
  > = [];
  let unchanged = 0;
  for (const [filename, otherMember] of otherByFile) {
    const thisMember = thisByFile.get(filename);
    if (!thisMember) {
      added.push({ filename, regionX: otherMember.regionX, regionZ: otherMember.regionZ });
      continue;
    }
    if (thisMember.sha256 === otherMember.sha256) {
      unchanged += 1;
    } else {
      changed.push({
        filename,
        regionX: thisMember.regionX,
        regionZ: thisMember.regionZ,
        thisSha256: thisMember.sha256,
        otherSha256: otherMember.sha256,
        bytesDelta: otherMember.bytes - thisMember.bytes,
      });
    }
  }
  for (const [filename, thisMember] of thisByFile) {
    if (!otherByFile.has(filename)) {
      removed.push({ filename, regionX: thisMember.regionX, regionZ: thisMember.regionZ });
    }
  }
  added.sort((left, right) => left.filename.localeCompare(right.filename));
  removed.sort((left, right) => left.filename.localeCompare(right.filename));
  changed.sort((left, right) => left.filename.localeCompare(right.filename));
  return {
    type: 'snapshot-diff',
    thisSnapshot,
    otherSnapshot,
    added,
    removed,
    changed,
    unchanged,
    identical: added.length === 0 && removed.length === 0 && changed.length === 0,
  };
}
