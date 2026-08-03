import crypto from 'node:crypto';
import fs from 'node:fs';

const HASH_BUFFER_BYTES = 1024 * 1024;

export function sha256FileSync(filename) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(HASH_BUFFER_BYTES);
  const file = fs.openSync(filename, 'r');
  try {
    while (true) {
      const bytesRead = fs.readSync(file, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(file);
  }
  return hash.digest('hex');
}
