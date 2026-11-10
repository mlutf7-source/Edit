import type { Point, Wall } from './types';
import type { RoomRegion, RegionType } from './regionTypes';
import { getCurvedWallGeometry } from './curvedWallGeometry';
import { v4 as uuidv4 } from 'uuid';

const CELL = 0.05;
const MAX_CELLS = 2_000_000;
const MIN_AREA = 0.5;
const MAX_PLAN_RATIO = 0.95;
// ✅ درجات تصاعدية — كل واحدة تجرب إغلاق فجوة أكبر
const DILATES = [0.03, 0.06, 0.10, 0.15, 0.20];

function rasterizeWalls(
  walls: Wall[],
  grid: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
  dilate: number,
) {
  const toC = (x: number) => Math.floor((x - minX) / CELL);
  const toR = (y: number) => Math.floor((y - minY) / CELL);

  const markDisk = (wx: number, wy: number, radius: number) => {
    const c0 = toC(wx);
    const r0 = toR(wy);
    const rCells = Math.ceil((radius + dilate) / CELL);
    for (let dc = -rCells; dc <= rCells; dc++) {
      for (let dr = -rCells; dr <= rCells; dr++) {
        const cc = c0 + dc;
        const rr = r0 + dr;
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
        const cx = minX + (cc + 0.5) * CELL;
        const cy = minY + (rr + 0.5) * CELL;
        if (Math.hypot(cx - wx, cy - wy) <= radius + dilate) {
          grid[rr * cols + cc] = 1;
        }
      }
    }
  };

  for (const wall of walls) {
    const halfThick = wall.thickness / 2;
    if (wall.curveRadius && wall.curveRadius > 0) {
      const geo = getCurvedWallGeometry(wall);
      if (geo) {
        const arcLen = Math.abs(geo.arcSpan) * geo.radius;
        const segs = Math.max(8, Math.ceil(arcLen / CELL));
        for (let i = 0; i <= segs; i++) {
          const ang = geo.startAngle + geo.arcSpan * (i / segs);
          markDisk(
            geo.center.x + Math.cos(ang) * geo.radius,
            geo.center.y + Math.sin(ang) * geo.radius,
            halfThick,
          );
        }
      }
    } else {
      const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
      const segs = Math.max(2, Math.ceil(len / CELL));
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        markDisk(
          wall.start.x + t * (wall.end.x - wall.start.x),
          wall.start.y + t * (wall.end.y - wall.start.y),
          halfThick,
        );
      }
    }
  }
}

function floodFill(
  startC: number,
  startR: number,
  grid: Uint8Array,
  cols: number,
  rows: number,
) {
  const visited = new Uint8Array(cols * rows);
  const stack: number[] = [startR * cols + startC];
  visited[startR * cols + startC] = 1;
  let area = 0;
  while (stack.length > 0) {
    const idx = stack.pop()!;
    area += CELL * CELL;
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
        return { visited, area, escaped: true };
      }
      const nidx = nr * cols + nc;
      if (visited[nidx] || grid[nidx]) continue;
      visited[nidx] = 1;
      stack.push(nidx);
    }
  }
  return { visited, area, escaped: false };
}

function findNearestFreeCell(
  startC: number,
  startR: number,
  grid: Uint8Array,
  cols: number,
  rows: number,
): { c: number; r: number } | null {
  for (let radius = 1; radius <= 20; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
        const c = startC + dc;
        const r = startR + dr;
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        if (grid[r * cols + c] === 0) return { c, r };
      }
    }
  }
  return null;
}

function extractOutline(
  visited: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
): Point[] | null {
  const ptKey = (p: Point) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
  const edges: Array<[Point, Point]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!visited[r * cols + c]) continue;
      const x0 = minX + c * CELL;
      const y0 = minY + r * CELL;
      const x1 = x0 + CELL;
      const y1 = y0 + CELL;

      // ✅ اتجاهات متناسقة (CW) لمنع المثلثات
      if (r === 0 || !visited[(r - 1) * cols + c]) {
        edges.push([{ x: x0, y: y0 }, { x: x1, y: y0 }]);
      }
      if (c === cols - 1 || !visited[r * cols + c + 1]) {
        edges.push([{ x: x1, y: y0 }, { x: x1, y: y1 }]);
      }
      if (r === rows - 1 || !visited[(r + 1) * cols + c]) {
        edges.push([{ x: x1, y: y1 }, { x: x0, y: y1 }]);
      }
      if (c === 0 || !visited[r * cols + c - 1]) {
        edges.push([{ x: x0, y: y1 }, { x: x0, y: y0 }]);
      }
    }
  }

  if (edges.length < 4) return null;

  const startMap = new Map<string, Array<[Point, Point]>>();
  for (const e of edges) {
    const k = ptKey(e[0]);
    if (!startMap.has(k)) startMap.set(k, []);
    startMap.get(k)!.push(e);
  }

  const outline: Point[] = [];
  const used = new Set<string>();
  let cur: [Point, Point] | null = edges[0];
  while (cur) {
    const ek = `${ptKey(cur[0])}→${ptKey(cur[1])}`;
    if (used.has(ek)) break;
    used.add(ek);
    outline.push(cur[0]);
    const nextCands = startMap.get(ptKey(cur[1])) || [];
    let nxt: [Point, Point] | null = null;
    for (const ne of nextCands) {
      if (!used.has(`${ptKey(ne[0])}→${ptKey(ne[1])}`)) {
        nxt = ne;
        break;
      }
    }
    cur = nxt;
    if (used.size > edges.length) break;
  }
  if (outline.length < 3) return null;

  const simplified: Point[] = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const a = outline[(i - 1 + n) % n];
    const b = outline[i];
    const cc = outline[(i + 1) % n];
    const cross = (b.x - a.x) * (cc.y - b.y) - (b.y - a.y) * (cc.x - b.x);
    if (Math.abs(cross) > 1e-5) simplified.push(b);
  }

  return simplified.length >= 3 ? simplified : null;
}

export function detectRoomRegion(
  pt: Point,
  walls: Wall[],
  type: RegionType,
): RoomRegion | null {
  const solidWalls = walls.filter(
    (w) => !w.kind || w.kind === 'wall' || w.kind === 'fence',
  );
  if (solidWalls.length < 2) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const w of solidWalls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }
  if (!isFinite(minX)) return null;

  const planArea = (maxX - minX) * (maxY - minY);
  const MAX_ROOM_AREA = planArea * MAX_PLAN_RATIO;

  // ✅ أفضل نتيجة "تسرب" كـ fallback (للمخططات أحادية الغرفة)
  let fallback: RoomRegion | null = null;
  let fallbackArea = Infinity;

  for (const dilate of DILATES) {
    const margin = 1.0;
    const bx0 = minX - margin, bx1 = maxX + margin;
    const by0 = minY - margin, by1 = maxY + margin;
    const cols = Math.ceil((bx1 - bx0) / CELL);
    const rows = Math.ceil((by1 - by0) / CELL);
    if (cols * rows > MAX_CELLS) continue;

    const grid = new Uint8Array(cols * rows);
    rasterizeWalls(solidWalls, grid, cols, rows, bx0, by0, dilate);

    let startC = Math.floor((pt.x - bx0) / CELL);
    let startR = Math.floor((pt.y - by0) / CELL);
    if (startC < 0 || startC >= cols || startR < 0 || startR >= rows) continue;

    if (grid[startR * cols + startC] === 1) {
      const free = findNearestFreeCell(startC, startR, grid, cols, rows);
      if (!free) continue;
      startC = free.c;
      startR = free.r;
    }

    const flood = floodFill(startC, startR, grid, cols, rows);
    if (flood.escaped) continue;
    if (flood.area < MIN_AREA) continue;

    const outline = extractOutline(flood.visited, cols, rows, bx0, by0);
    if (!outline) continue;

    let area = 0;
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      area += outline[i].x * outline[j].y - outline[j].x * outline[i].y;
    }
    area = Math.abs(area) / 2;
    if (area < MIN_AREA) continue;

    const result: RoomRegion = {
      id: uuidv4(),
      type,
      polygon: outline,
      area,
      wallIds: solidWalls.map((w) => w.id),
    };

    if (flood.area > MAX_ROOM_AREA) {
      // ✅ تسرب محتمل — احفظ كـ fallback وجرب DILATE أكبر
      if (flood.area < fallbackArea) {
        fallback = result;
        fallbackArea = flood.area;
      }
      continue;
    }

    // ✅ نتيجة نظيفة — أعدها فوراً
    return result;
  }

  // ✅ إذا كل المحاولات تسربت (مخطط أحادي الغرفة) → أعيد أفضل fallback
  return fallback;
    }
