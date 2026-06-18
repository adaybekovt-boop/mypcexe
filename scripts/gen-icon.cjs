// Generates a placeholder build/icon.ico (256x256) with no external deps.
// Design: dark rounded badge + accent shield + white keyhole.
// Replace build/icon.ico with your own 256x256 icon anytime.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const SIZE = 256
const ACCENT = [56, 189, 248]     // #38BDF8 calm cyan
const ACCENT_DEEP = [14, 165, 233] // #0EA5E9
const BG = [11, 15, 20]           // #0B0F14 graphite
const BADGE = [18, 24, 33]        // #121821
const WHITE = [245, 245, 245]

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

// Signed-distance helpers --------------------------------------------------
function roundRectInside(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(x - cx) - (halfW - r)
  const dy = Math.abs(y - cy) - (halfH - r)
  const ox = Math.max(dx, 0)
  const oy = Math.max(dy, 0)
  const dist = Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(dx, dy), 0) - r
  return dist // <0 inside
}

// Shield: rounded top, tapering to a point at bottom
function shieldInside(x, y) {
  const cx = SIZE / 2
  const topY = SIZE * 0.30
  const botY = SIZE * 0.74
  if (y < topY || y > botY) return 1
  const t = (y - topY) / (botY - topY) // 0..1 top->bottom
  // half-width shrinks toward the point with an eased curve
  const halfW = SIZE * 0.20 * (1 - Math.pow(t, 1.7))
  const dx = Math.abs(x - cx)
  return dx - halfW // <0 inside
}

function keyholeInside(x, y) {
  const cx = SIZE / 2
  const cy = SIZE * 0.46
  const r = SIZE * 0.052
  const dCircle = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - r
  // stem: trapezoid below the circle
  const stemTop = cy
  const stemBot = SIZE * 0.60
  let dStem = 1
  if (y >= stemTop && y <= stemBot) {
    const tt = (y - stemTop) / (stemBot - stemTop)
    const halfW = SIZE * 0.018 + tt * SIZE * 0.020
    dStem = Math.abs(x - cx) - halfW
  }
  return Math.min(dCircle, dStem)
}

function blend(base, over, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + over[0] * alpha),
    Math.round(base[1] * (1 - alpha) + over[1] * alpha),
    Math.round(base[2] * (1 - alpha) + over[2] * alpha),
  ]
}

// AA coverage from a signed distance (in px)
function coverage(d) {
  return Math.min(1, Math.max(0, 0.5 - d))
}

// Build RGBA buffer --------------------------------------------------------
const raw = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let color = BG
    let alpha = 0

    // Outer rounded badge
    const badgeD = roundRectInside(x, y, SIZE / 2, SIZE / 2, SIZE * 0.46, SIZE * 0.46, SIZE * 0.20)
    const badgeCov = coverage(badgeD)
    if (badgeCov > 0) {
      // subtle vertical gradient on the badge
      const g = y / SIZE
      color = lerp(BADGE, BG, g * 0.5)
      alpha = badgeCov
    }

    // Shield (accent)
    const shieldCov = coverage(shieldInside(x, y))
    if (shieldCov > 0) {
      const g = (y - SIZE * 0.30) / (SIZE * 0.44)
      const shieldColor = lerp(ACCENT, ACCENT_DEEP, Math.max(0, Math.min(1, g)))
      color = blend(color, shieldColor, shieldCov)
      alpha = Math.max(alpha, shieldCov)
    }

    // Keyhole (white, carved into shield)
    const keyCov = coverage(keyholeInside(x, y))
    if (keyCov > 0) {
      color = blend(color, WHITE, keyCov)
    }

    const i = (y * SIZE + x) * 4
    raw[i] = color[0]
    raw[i + 1] = color[1]
    raw[i + 2] = color[2]
    raw[i + 3] = Math.round(Math.min(1, alpha) * 255)
  }
}

// PNG encode ---------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8   // bit depth
ihdr[9] = 6   // color type RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

// add filter byte (0) per scanline
const stride = SIZE * 4
const filtered = Buffer.alloc((stride + 1) * SIZE)
for (let y = 0; y < SIZE; y++) {
  filtered[y * (stride + 1)] = 0
  raw.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride)
}
const idat = zlib.deflateSync(filtered, { level: 9 })

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
])

// ICO wrap (single PNG entry) ---------------------------------------------
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2) // type icon
header.writeUInt16LE(1, 4) // count

const entry = Buffer.alloc(16)
entry[0] = 0 // 256 width -> 0
entry[1] = 0 // 256 height -> 0
entry[2] = 0
entry[3] = 0
entry.writeUInt16LE(1, 4)   // planes
entry.writeUInt16LE(32, 6)  // bpp
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(6 + 16, 12) // offset

const ico = Buffer.concat([header, entry, png])
const out = path.join(__dirname, '..', 'build', 'icon.ico')
fs.writeFileSync(out, ico)
// also write a png for the in-app/tray use
fs.writeFileSync(path.join(__dirname, '..', 'build', 'icon.png'), png)
console.log('Wrote', out, `(${ico.length} bytes)`)
