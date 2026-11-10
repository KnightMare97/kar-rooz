import zlib from 'node:zlib';
import fs from 'node:fs';

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = c ^ buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
  }
  return ~c;
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Generates an uncompressed/deflated RGBA PNG programmatically
 */
export function generatePngImage(
  width: number,
  height: number,
  pixelFn: (x: number, y: number) => [number, number, number, number]
): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPngChunk('IDAT', deflated);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance helper
function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2);
}

// Point to line segment distance
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

/**
 * Draws KarRooz brand icon for a given size and maskable flag
 */
function drawKarRoozIcon(size: number, isMaskable: boolean) {
  return generatePngImage(size, size, (x, y) => {
    // Normalize coordinates to 0..1
    const nx = x / size;
    const ny = y / size;

    // Corner radius for squircle (if not maskable; maskable covers full bleed)
    if (!isMaskable) {
      // Rounded corner radius 22%
      const r = 0.22;
      let inCorner = false;
      let cornerDist = 0;
      if (nx < r && ny < r) { inCorner = true; cornerDist = dist(nx, ny, r, r); }
      else if (nx > 1 - r && ny < r) { inCorner = true; cornerDist = dist(nx, ny, 1 - r, r); }
      else if (nx < r && ny > 1 - r) { inCorner = true; cornerDist = dist(nx, ny, r, 1 - r); }
      else if (nx > 1 - r && ny > 1 - r) { inCorner = true; cornerDist = dist(nx, ny, 1 - r, 1 - r); }

      if (inCorner && cornerDist > r) {
        return [0, 0, 0, 0]; // Transparent outside squircle
      }
    }

    // Background gradient: Violet #1E1B4B -> #0F1016 -> #181028
    const t = (nx + ny) / 2;
    let bgR = Math.round(30 * (1 - t) + 15 * t);
    let bgG = Math.round(27 * (1 - t) + 16 * t);
    let bgB = Math.round(75 * (1 - t) + 24 * t);

    // Subtle inner glowing border
    if (!isMaskable && (nx < 0.02 || nx > 0.98 || ny < 0.02 || ny > 0.98)) {
      bgR = Math.min(255, bgR + 40);
      bgG = Math.min(255, bgG + 20);
      bgB = Math.min(255, bgB + 80);
    }

    // Scale inner content for safe zone
    // Maskable icons keep content in central 75-80% safe zone
    const scale = isMaskable ? 0.72 : 0.88;
    const cx = 0.5;
    const cy = 0.52;
    const sx = (nx - cx) / scale + cx;
    const sy = (ny - cy) / scale + cy;

    // Calendar Card Bounds: sx in [0.22, 0.78], sy in [0.24, 0.76]
    const cardLeft = 0.22;
    const cardRight = 0.78;
    const cardTop = 0.24;
    const cardBottom = 0.76;
    const cardRadius = 0.08;

    // Check if inside card
    let insideCard = false;
    if (sx >= cardLeft && sx <= cardRight && sy >= cardTop && sy <= cardBottom) {
      let corner = false;
      let cd = 0;
      if (sx < cardLeft + cardRadius && sy < cardTop + cardRadius) {
        corner = true; cd = dist(sx, sy, cardLeft + cardRadius, cardTop + cardRadius);
      } else if (sx > cardRight - cardRadius && sy < cardTop + cardRadius) {
        corner = true; cd = dist(sx, sy, cardRight - cardRadius, cardTop + cardRadius);
      } else if (sx < cardLeft + cardRadius && sy > cardBottom - cardRadius) {
        corner = true; cd = dist(sx, sy, cardLeft + cardRadius, cardBottom - cardRadius);
      } else if (sx > cardRight - cardRadius && sy > cardBottom - cardRadius) {
        corner = true; cd = dist(sx, sy, cardRight - cardRadius, cardBottom - cardRadius);
      }
      if (!corner || cd <= cardRadius) {
        insideCard = true;
      }
    }

    if (insideCard) {
      // Calendar Top Banner: sy in [0.24, 0.38]
      if (sy <= 0.38) {
        // Gradient #A78BFA -> #7C3AED
        const bannerT = (sx - cardLeft) / (cardRight - cardLeft);
        const r = Math.round(167 * (1 - bannerT) + 124 * bannerT);
        const g = Math.round(139 * (1 - bannerT) + 58 * bannerT);
        const b = Math.round(250 * (1 - bannerT) + 237 * bannerT);
        return [r, g, b, 255];
      }

      // Card body: deep dark slate #161824
      let r = 24;
      let g = 26;
      let b = 38;

      // Checkmark stroke:
      // Point A: (0.36, 0.56) -> Point B: (0.46, 0.66) -> Point C: (0.64, 0.45)
      const d1 = distToSegment(sx, sy, 0.36, 0.57, 0.46, 0.67);
      const d2 = distToSegment(sx, sy, 0.46, 0.67, 0.65, 0.44);
      const checkDist = Math.min(d1, d2);
      const checkThickness = 0.048;

      if (checkDist < checkThickness) {
        const edge = Math.max(0, Math.min(1, (checkThickness - checkDist) / 0.01));
        // Vibrant violet/purple checkmark #8B5CF6 / #C4B5FD
        const cr = 196;
        const cg = 181;
        const cb = 253;
        r = Math.round(r * (1 - edge) + cr * edge);
        g = Math.round(g * (1 - edge) + cg * edge);
        b = Math.round(b * (1 - edge) + cb * edge);
      }

      return [r, g, b, 255];
    }

    // Calendar binder rings
    // Ring 1 at sx = 0.35, sy in [0.20, 0.28]
    // Ring 2 at sx = 0.65, sy in [0.20, 0.28]
    const dRing1 = distToSegment(sx, sy, 0.36, 0.20, 0.36, 0.28);
    const dRing2 = distToSegment(sx, sy, 0.64, 0.20, 0.64, 0.28);
    if (dRing1 <= 0.035 || dRing2 <= 0.035) {
      return [221, 214, 254, 255]; // Soft lilac #DDD6FE
    }

    return [bgR, bgG, bgB, 255];
  });
}

// Generate the required icon files:
console.log('Generating PWA icons...');
const icon192 = drawKarRoozIcon(192, false);
fs.writeFileSync('public/pwa-192x192.png', icon192);

const icon512 = drawKarRoozIcon(512, false);
fs.writeFileSync('public/pwa-512x512.png', icon512);

const iconMaskable512 = drawKarRoozIcon(512, true);
fs.writeFileSync('public/pwa-maskable-512x512.png', iconMaskable512);

const appleIcon = drawKarRoozIcon(180, false);
fs.writeFileSync('public/apple-touch-icon.png', appleIcon);

console.log('PWA icons created successfully.');
