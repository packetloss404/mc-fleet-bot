import { createCanvas, Image } from 'canvas';

export const MEDIA_IMAGE_QUALITY_GATE = Object.freeze({
  minimumLuminanceVariance: 2,
  minimumLuminanceRange: 8,
  minimumQuantizedColorCount: 4,
  sampleStride: 8,
  excludedBottomPixels: 32,
});

const samplerImage = new Image();
const samplerCanvas = createCanvas(1, 1);
const samplerContext = samplerCanvas.getContext('2d');
let samplerQueue = Promise.resolve();

function measureWithReusableSampler(filename) {
  // node-canvas retains native image surfaces until their Image wrapper is
  // replaced. Creating a fresh Image/canvas per capture therefore grows RSS
  // linearly during large manifests, even after the JavaScript objects become
  // unreachable. Replacing one shared image source and resizing one canvas
  // releases the prior native surfaces immediately.
  samplerImage.src = filename;
  samplerCanvas.width = samplerImage.width;
  samplerCanvas.height = samplerImage.height;
  samplerContext.drawImage(samplerImage, 0, 0);
  const cropHeight = Math.max(
    1,
    samplerImage.height - MEDIA_IMAGE_QUALITY_GATE.excludedBottomPixels,
  );
  const pixels = samplerContext.getImageData(
    0,
    0,
    samplerImage.width,
    cropHeight,
  );
  const pixelData = pixels.data;
  const quantizedColors = new Set();
  let samples = 0;
  let mean = 0;
  let m2 = 0;
  let minimum = 255;
  let maximum = 0;
  const stride = MEDIA_IMAGE_QUALITY_GATE.sampleStride;
  for (let y = 0; y < cropHeight; y += stride) {
    for (let x = 0; x < samplerImage.width; x += stride) {
      const index = (y * samplerImage.width + x) * 4;
      const red = pixelData[index];
      const green = pixelData[index + 1];
      const blue = pixelData[index + 2];
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      samples += 1;
      const delta = luminance - mean;
      mean += delta / samples;
      m2 += delta * (luminance - mean);
      minimum = Math.min(minimum, luminance);
      maximum = Math.max(maximum, luminance);
      quantizedColors.add(
        `${red >> 4},${green >> 4},${blue >> 4}`,
      );
    }
  }
  const variance = samples > 1 ? m2 / (samples - 1) : 0;
  const quality = {
    width: samplerImage.width,
    height: samplerImage.height,
    sampledPixels: samples,
    luminanceMean: Number(mean.toFixed(3)),
    luminanceVariance: Number(variance.toFixed(3)),
    luminanceRange: Number((maximum - minimum).toFixed(3)),
    quantizedColorCount: quantizedColors.size,
  };
  quality.nonBlank = (
    quality.luminanceVariance
      >= MEDIA_IMAGE_QUALITY_GATE.minimumLuminanceVariance
    && quality.luminanceRange
      >= MEDIA_IMAGE_QUALITY_GATE.minimumLuminanceRange
    && quality.quantizedColorCount
      >= MEDIA_IMAGE_QUALITY_GATE.minimumQuantizedColorCount
  );
  return quality;
}

export function measureMediaImageQuality(filename) {
  const measurement = samplerQueue.then(
    () => measureWithReusableSampler(filename),
  );
  samplerQueue = measurement.then(
    () => undefined,
    () => undefined,
  );
  return measurement;
}
