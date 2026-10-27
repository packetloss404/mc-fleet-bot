import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const RUNNER = path.join(ROOT, 'scripts/run_mp11_c01_public_independent_return_02_release.mjs');

describe('C01 Return-02 execute storage gate', () => {
  it('reserves both immutable captures before it can create evidence or begin the source capture', () => {
    const source = fs.readFileSync(RUNNER, 'utf8');
    const gate = source.indexOf('assertExecuteStorageCapacity();');
    const evidenceDirectory = source.indexOf('fs.mkdirSync(abs(outDir), { recursive: true })');
    const sourceCapture = source.indexOf("run('fresh-source-complete-save'");

    expect(source).toContain("{ label: 'source complete-save capture', value: () => sourceRoot, bytes: 640 * MEBIBYTE }");
    expect(source).toContain("{ label: 'post complete-save capture', value: () => postRoot, bytes: 640 * MEBIBYTE }");
    expect(source).toContain("{ label: 'release evidence and journals', value: () => outDir, bytes: 256 * MEBIBYTE }");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(evidenceDirectory);
    expect(gate).toBeLessThan(sourceCapture);
  });
});
