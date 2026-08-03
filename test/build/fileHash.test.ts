import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { sha256FileSync } from '../../scripts/lib/file_hash.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('sha256FileSync', () => {
  it('hashes a file incrementally across multiple read buffers', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'file-hash-'));
    temporaryDirectories.push(directory);
    const filename = path.join(directory, 'large-enough-for-chunks.bin');
    const contents = Buffer.alloc((2 * 1024 * 1024) + 137, 0x5a);
    fs.writeFileSync(filename, contents);

    const expected = crypto.createHash('sha256').update(contents).digest('hex');

    expect(sha256FileSync(filename)).toBe(expected);
  });
});
