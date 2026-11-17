const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Function to generate a simple PNG buffer with custom dimensions and colors
function createBrandPNG(size, text = 'SF') {
  const width = size;
  const height = size;

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(crcBuf);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace
  const ihdr = writeChunk('IHDR', ihdrData);

  // Generate RGBA pixel data
  // Background: Deep Teal #0F766E (R:15, G:118, B:110, A:255)
  // Corner rounded radius or border
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const rBg = 15, gBg = 118, bBg = 110;
  const rWhite = 255, gWhite = 255, bWhite = 255;

  let offset = 0;
  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // No filter for this scanline
    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside circle or rounded rect
      const inCircle = dist <= radius;
      // Simple letter 'S' / 'F' pattern in the center
      const inLetterBox = Math.abs(dx) < size * 0.28 && Math.abs(dy) < size * 0.28;

      let r = rBg, g = gBg, b = bBg, a = 255;

      // Draw subtle inner white badge outline
      if (Math.abs(dist - (radius - 8)) < 4) {
        r = 200; g = 250; b = 240; a = 255;
      } else if (inLetterBox) {
        // Draw decorative center diamond/box
        if (Math.abs(dx) < size * 0.18 && Math.abs(dy) < size * 0.18) {
          r = 255; g = 255; b = 255;
        }
      }

      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = writeChunk('IDAT', compressedData);

  // IEND Chunk
  const iend = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createBrandPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createBrandPNG(512));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createBrandPNG(180));

console.log('Successfully generated PWA brand PNG icons in public/icons/');
