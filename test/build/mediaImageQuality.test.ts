import fs from 'fs';
import os from 'os';
import path from 'path';
import { createCanvas } from 'canvas';
import { afterEach, describe, expect, it } from 'vitest';

import { measureMediaImageQuality } from '../../scripts/lib/media_image_quality.mjs';

const temporaryDirectories: string[] = [];

function createFixture(width: number, height: number) {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'media-image-quality-'),
  );
  temporaryDirectories.push(temporary);
  const filename = path.join(temporary, 'fixture.png');
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#08152e');
  gradient.addColorStop(0.35, '#2563eb');
  gradient.addColorStop(0.7, '#f59e0b');
  gradient.addColorStop(1, '#f8fafc');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
  return filename;
}

afterEach(() => {
  for (const temporary of temporaryDirectories.splice(0)) {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

describe('media image quality sampler', () => {
  it('returns stable results across repeated and concurrent measurements', async () => {
    const filename = createFixture(320, 180);
    const expected = await measureMediaImageQuality(filename);
    const repeated = await Promise.all(
      Array.from(
        { length: 100 },
        () => measureMediaImageQuality(filename),
      ),
    );

    expect(expected).toMatchObject({
      width: 320,
      height: 180,
      nonBlank: true,
    });
    expect(repeated).toEqual(Array.from({ length: 100 }, () => expected));
  });

  it('does not carry dimensions or pixels between different images', async () => {
    const landscape = createFixture(320, 180);
    const portrait = createFixture(96, 240);

    const [first, second, third] = await Promise.all([
      measureMediaImageQuality(landscape),
      measureMediaImageQuality(portrait),
      measureMediaImageQuality(landscape),
    ]);

    expect(first).toEqual(third);
    expect(first).toMatchObject({ width: 320, height: 180 });
    expect(second).toMatchObject({ width: 96, height: 240 });
  });
});
