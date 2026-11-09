/**
 * make-og-card.mjs — renders public/og-card.png (1200x630) with zero dependencies:
 * parametric pixel art + a hand-rolled 3x5 bitmap font, PNG-encoded with node:zlib.
 * Run: node scripts/make-og-card.mjs
 * Regenerate after changing the palette or the title.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 1200;
const H = 630;

// ——— pixel buffer + helpers ———
const px = new Uint8Array(W * H * 4);
const set = (x, y, [r, g, b, a = 255]) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
};
const rect = (x, y, w, h, c) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
};

// palette (matches the in-game palette)
const BG_TOP = [13, 18, 32];
const BG_BOT = [19, 26, 46];
const BRICK = [26, 36, 60];
const BRICK_CAP = [42, 58, 92];
const FLOOR = [24, 34, 56];
const FLOOR_SEAM = [19, 27, 46];
const GEM_A = [110, 231, 255];
const GEM_B = [78, 203, 232];
const GEM_C = [58, 174, 207];
const GEM_HI = [230, 251, 255];
const CLOAK = [141, 240, 193];
const CLOAK_D = [111, 214, 166];
const DARK = [13, 19, 34];
const EYE = [199, 255, 240];
const BUG = [255, 93, 115];
const BUG_D = [214, 58, 85];
const TITLE = [141, 240, 193];
const SUB = [110, 231, 255];
const GOLD = [255, 209, 102];

// ——— background: vertical gradient + brick texture + floor ———
for (let y = 0; y < H; y++) {
  const t = y / H;
  const c = [
    Math.round(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t),
  ];
  rect(0, y, W, 1, c);
}
// brick seams (background wall)
for (let y = 0; y < H; y += 28) {
  rect(0, y, W, 2, BRICK);
  for (let x = (y / 28) % 2 ? 0 : 28; x < W; x += 56) rect(x, y, 2, 28, BRICK);
}
// wall cap + floor strip along the bottom third
rect(0, 400, W, 6, BRICK_CAP);
rect(0, 406, W, H - 406, FLOOR);
for (let y = 430; y < H; y += 24) rect(0, y, W, 1, FLOOR_SEAM);

// ——— torch glow vignette (soft additive circles around the shrine) ———
const glow = (cx, cy, rad, c, strength) => {
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > rad) continue;
      const a = (1 - d / rad) ** 2 * strength;
      const i = (y * W + x) * 4;
      if (x < 0 || y < 0 || x >= W || y >= H || px[i + 3] === 0) continue;
      px[i] = Math.min(255, px[i] + c[0] * a);
      px[i + 1] = Math.min(255, px[i + 1] + c[1] * a);
      px[i + 2] = Math.min(255, px[i + 2] + c[2] * a);
    }
  }
};
glow(860, 330, 190, GEM_B, 0.55);
glow(300, 350, 150, [255, 180, 90], 0.35);

// ——— shrine + gem (right side) ———
const S = 3; // chunk scale
const chunk = (x, y, w, h, c) => rect(x * S, y * S, w * S, h * S, c);
// pedestal
chunk(250, 128, 46, 6, [74, 95, 140]);
chunk(250, 128, 46, 2, [107, 131, 184]);
chunk(256, 134, 34, 20, [51, 67, 106]);
chunk(244, 154, 58, 12, [39, 51, 79]);
chunk(244, 154, 58, 2, [61, 80, 121]);
// floating gem
const gem = (ox, oy) => {
  chunk(ox, oy, 2, 1, GEM_A);
  chunk(ox - 2, oy + 1, 6, 2, GEM_B);
  chunk(ox - 3, oy + 3, 8, 4, GEM_B);
  chunk(ox - 2, oy + 7, 6, 2, GEM_C);
  chunk(ox, oy + 9, 2, 1, GEM_C);
  chunk(ox - 1, oy + 1, 1, 2, GEM_HI);
};
gem(272, 88);

// ——— hunter (left of center) ———
const hx = 100, hy = 108; // chunk origin
chunk(hx + 4, hy + 8, 8, 9, CLOAK);
chunk(hx + 3, hy + 10, 10, 7, CLOAK);
chunk(hx + 4, hy + 15, 8, 2, CLOAK_D);
chunk(hx + 5, hy + 3, 6, 6, CLOAK_D);
chunk(hx + 4, hy + 4, 8, 4, CLOAK_D);
chunk(hx + 5, hy + 6, 6, 3, DARK);
set((hx + 6) * S, (hy + 7) * S, EYE); set((hx + 9) * S, (hy + 7) * S, EYE);
chunk(hx + 5, hy + 17, 2, 3, [63, 90, 76]);
chunk(hx + 9, hy + 17, 2, 3, [63, 90, 76]);
// lantern on a stick
chunk(hx + 13, hy + 6, 1, 10, [63, 90, 76]);
chunk(hx + 12, hy + 14, 3, 3, GOLD);
chunk(hx + 13, hy + 15, 1, 1, [255, 240, 200]);

// ——— red bug (bottom right of hunter) ———
const bx = 62, by = 152;
chunk(bx + 3, by + 2, 8, 9, BUG);
chunk(bx + 2, by + 4, 10, 5, BUG);
chunk(bx + 3, by + 6, 8, 2, BUG_D);
chunk(bx + 5, by, 4, 3, [143, 36, 56]);
set((bx + 4) * S, (by + 1) * S, [255, 215, 221]);
set((bx + 9) * S, (by + 1) * S, [255, 215, 221]);
chunk(bx + 1, by + 5, 2, 1, BUG_D);
chunk(bx + 11, by + 5, 2, 1, BUG_D);

// ——— scattered small gems on the floor ———
gem(38, 178);
gem(560, 168);
gem(370, 182);
gem(180, 168);

// ——— 3x5 bitmap font ———
const FONT = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "011", "001"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "011"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  " ": ["000", "000", "000", "000", "000"],
};

const drawText = (text, ox, oy, scale, color, spacing = 1) => {
  let cursor = ox;
  for (const ch of text) {
    const rows = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 5; r++)
      for (let cI = 0; cI < 3; cI++)
        if (rows[r][cI] === "1") rect(cursor + cI * scale, oy + r * scale, scale, scale, color);
    cursor += (3 + spacing) * scale;
  }
  return cursor - spacing * scale - ox;
};

const center = (text, scale, y, color, spacing = 1) => {
  const w = text.length * (3 + spacing) * scale - spacing * scale;
  drawText(text, Math.round((W - w) / 2), y, scale, color, spacing);
};

// ——— text blocks ———
center("HIDDEN", 9, 56, TITLE, 1);
center("REPO HUNTER", 9, 130, TITLE, 1);
center("FIND UNDERRATED GITHUB REPOS", 4, 218, SUB, 1);
center("A FREE BROWSER DUNGEON OF OPEN SOURCE GEMS", 3, 262, [139, 155, 180], 1);
center("PLAY FREE IN YOUR BROWSER", 4, 556, GOLD, 1);

// ——— PNG encode (no dependencies) ———
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunkPng = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA
// filter 0 per scanline
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunkPng("IHDR", ihdr),
  chunkPng("IDAT", deflateSync(raw, { level: 9 })),
  chunkPng("IEND", Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "og-card.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`og card written: ${out} (${png.length} bytes)`);
