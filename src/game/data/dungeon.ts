/**
 * dungeon.ts — deterministic dungeon: rooms carved into a grid + connecting corridors.
 * Built in code (not ASCII art) so every shrine/gem/bug coordinate is guaranteed to sit on floor.
 * Legend: 0 = wall, 1 = floor.
 */

export const TILE = 24;
export const MAP_W = 40;
export const MAP_H = 26;

interface Rect { x: number; y: number; w: number; h: number }
interface Corridor { x1: number; y1: number; x2: number; y2: number }

const ROOMS: Rect[] = [
  { x: 2, y: 2, w: 7, h: 6 },   // 0 spawn vault
  { x: 2, y: 12, w: 9, h: 6 },  // 1 west hall
  { x: 13, y: 2, w: 9, h: 7 },  // 2 north shrine hall
  { x: 15, y: 12, w: 9, h: 7 }, // 3 central chamber
  { x: 26, y: 2, w: 11, h: 7 }, // 4 east wing
  { x: 26, y: 13, w: 11, h: 7 },// 5 south-east vault
];

const CORRIDORS: Corridor[] = [
  { x1: 9, y1: 4, x2: 13, y2: 4 },   // spawn -> north hall
  { x1: 5, y1: 8, x2: 5, y2: 12 },   // spawn -> west hall
  { x1: 11, y1: 14, x2: 15, y2: 14 },// west hall -> central
  { x1: 22, y1: 4, x2: 26, y2: 4 },  // north hall -> east wing
  { x1: 17, y1: 9, x2: 17, y2: 12 }, // north hall -> central
  { x1: 24, y1: 15, x2: 26, y2: 15 },// central -> south-east
  { x1: 31, y1: 9, x2: 31, y2: 13 }, // east wing -> south-east
];

/** Pedestal positions (tile coords) — one challenge each, in stable order. */
export const SHRINE_TILES: Array<{ x: number; y: number }> = [
  { x: 15, y: 4 }, { x: 19, y: 7 },      // north hall
  { x: 28, y: 4 }, { x: 34, y: 6 },      // east wing
  { x: 17, y: 13 }, { x: 22, y: 16 },    // central
  { x: 4, y: 13 },                       // west hall
  { x: 28, y: 17 },                      // south-east
];

export const GEM_TILES: Array<{ x: number; y: number }> = [
  { x: 7, y: 6 }, { x: 6, y: 13 }, { x: 3, y: 16 },
  { x: 21, y: 3 }, { x: 30, y: 7 }, { x: 36, y: 3 },
  { x: 23, y: 13 }, { x: 16, y: 17 }, { x: 37, y: 18 }, { x: 29, y: 19 },
];

/** Bugs bounce between (x1,y) and (x2,y) at the given row / column. */
export const BUG_PATROLS: Array<{ x1: number; y1: number; x2: number; y2: number; speed: number }> = [
  { x1: 28, y1: 5, x2: 34, y2: 5, speed: 70 },   // east wing, horizontal
  { x1: 20, y1: 13, x2: 20, y2: 18, speed: 60 }, // central, vertical
  { x1: 28, y1: 16, x2: 35, y2: 16, speed: 80 }, // south-east, horizontal
];

export const PLAYER_START = { x: 4, y: 4 };

export interface DungeonData {
  walls: Uint8Array; // 1 = wall
  w: number;
  h: number;
}

export function buildDungeon(): DungeonData {
  const walls = new Uint8Array(MAP_W * MAP_H).fill(1);
  const carve = (x: number, y: number) => {
    if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) walls[y * MAP_W + x] = 0;
  };
  for (const r of ROOMS) {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
  }
  for (const c of CORRIDORS) {
    const dx = Math.sign(c.x2 - c.x1);
    const dy = Math.sign(c.y2 - c.y1);
    let x = c.x1, y = c.y1;
    carve(x, y);
    while (x !== c.x2 || y !== c.y2) {
      if (x !== c.x2) x += dx;
      else if (y !== c.y2) y += dy;
      carve(x, y);
    }
  }
  return { walls, w: MAP_W, h: MAP_H };
}

/** Dev-time validation: every placed thing must sit on a floor tile (surfaces in verify console if not). */
export function validateDungeon(d: DungeonData): string[] {
  const problems: string[] = [];
  const check = (label: string, x: number, y: number) => {
    if (d.walls[y * d.w + x] !== 0) problems.push(`${label} at (${x},${y}) is inside a wall`);
  };
  SHRINE_TILES.forEach((s, i) => check(`shrine#${i}`, s.x, s.y));
  GEM_TILES.forEach((g, i) => check(`gem#${i}`, g.x, g.y));
  BUG_PATROLS.forEach((b, i) => {
    check(`bug#${i} start`, b.x1, b.y1);
    check(`bug#${i} end`, b.x2, b.y2);
  });
  check("player start", PLAYER_START.x, PLAYER_START.y);
  // connectivity: flood fill from player start must reach every shrine & gem
  const seen = new Uint8Array(d.walls.length);
  const q = [PLAYER_START.y * d.w + PLAYER_START.x];
  seen[q[0]] = 1;
  while (q.length) {
    const cur = q.pop()!;
    const cx = cur % d.w, cy = (cur / d.w) | 0;
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as const) {
      const ni = ny * d.w + nx;
      if (nx < 0 || ny < 0 || nx >= d.w || ny >= d.h) continue;
      if (seen[ni] || d.walls[ni] === 1) continue;
      seen[ni] = 1;
      q.push(ni);
    }
  }
  SHRINE_TILES.forEach((s, i) => { if (!seen[s.y * d.w + s.x]) problems.push(`shrine#${i} unreachable`); });
  GEM_TILES.forEach((g, i) => { if (!seen[g.y * d.w + g.x]) problems.push(`gem#${i} unreachable`); });
  return problems;
}
