import type { Point, Wall } from './types';
import type { RoomRegion, RegionType } from './regionTypes';
import { getCurvedWallGeometry } from './curvedWallGeometry';
import { v4 as uuidv4 } from 'uuid';
import { wallRectangle } from './geometry';

const CELL = 0.05;
const MAX_CELLS = 2_000_000;
const MIN_AREA = 0.5;

const DILATES = [0];


function rasterizeWalls(
  walls: Wall[],
  grid: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
  dilate: number,
) {
  const EPS = 1e-9;

  const cross = (a: Point, b: Point, p: Point) =>
    (b.x - a.x) * (p.y - a.y) -
    (b.y - a.y) * (p.x - a.x);

  const insidePolygon = (p: Point, polygon: Point[]) => {
    let inside = false;

    for (
      let i = 0, j = polygon.length - 1;
      i < polygon.length;
      j = i++
    ) {
      const a = polygon[j];
      const b = polygon[i];

      if (Math.abs(cross(a, b, p)) < EPS &&
          p.x >= Math.min(a.x, b.x) - EPS &&
          p.x <= Math.max(a.x, b.x) + EPS &&
          p.y >= Math.min(a.y, b.y) - EPS &&
          p.y <= Math.max(a.y, b.y) + EPS) {
        return true;
      }

      if (
        (a.y > p.y) !== (b.y > p.y) &&
        p.x < (b.x - a.x) * (p.y - a.y) /
          (b.y - a.y) + a.x
      ) {
        inside = !inside;
      }
    }

    return inside;
  };

  const markShape = (
    minWX: number,
    maxWX: number,
    minWY: number,
    maxWY: number,
    contains: (p: Point) => boolean,
  ) => {
    const c0 = Math.max(
      0,
      Math.floor((minWX - dilate - minX) / CELL) - 1
    );
    const c1 = Math.min(
      cols - 1,
      Math.ceil((maxWX + dilate - minX) / CELL) + 1
    );
    const r0 = Math.max(
      0,
      Math.floor((minWY - dilate - minY) / CELL) - 1
    );
    const r1 = Math.min(
      rows - 1,
      Math.ceil((maxWY + dilate - minY) / CELL) + 1
    );

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const p = {
          x: minX + (c + 0.5) * CELL,
          y: minY + (r + 0.5) * CELL,
        };

        if (contains(p)) {
          grid[r * cols + c] = 1;
        }
      }
    }
  };

  for (const wall of walls) {
    if (wall.curveRadius && wall.curveRadius > 0) {
      const geo = getCurvedWallGeometry(wall);

      if (geo) {
        const normalizeAngle = (angle: number) => {
          const full = Math.PI * 2;
          return ((angle % full) + full) % full;
        };

        const onArc = (angle: number) => {
          const full = Math.PI * 2;
          const span = geo.arcSpan;

          if (span >= 0) {
            const delta = normalizeAngle(
              angle - geo.startAngle
            );
            return delta <= span + EPS;
          }

          const delta = normalizeAngle(
            geo.startAngle - angle
          );
          return delta <= -span + EPS;
        };

        const radius = geo.outerRadius + dilate;

        markShape(
          geo.center.x - radius,
          geo.center.x + radius,
          geo.center.y - radius,
          geo.center.y + radius,
          (p) => {
            const dx = p.x - geo.center.x;
            const dy = p.y - geo.center.y;
            const distance = Math.hypot(dx, dy);

            if (
              distance < geo.innerRadius - dilate ||
              distance > geo.outerRadius + dilate
            ) {
              return false;
            }

            return onArc(Math.atan2(dy, dx));
          }
        );

        continue;
      }
    }

    const corners = wallRectangle(wall).corners;

    const xs = corners.map(p => p.x);
    const ys = corners.map(p => p.y);

    markShape(
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
      (p) => insidePolygon(p, corners)
    );
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
let escaped = false;
  while (stack.length > 0) {
    const idx = stack.pop()!;
    area += CELL * CELL;
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
  escaped = true;
  continue;
      }
      const nidx = nr * cols + nc;
      if (visited[nidx] || grid[nidx]) continue;
      visited[nidx] = 1;
      stack.push(nidx);
    }
  }
  return { visited, area, escaped };
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

    if (grid[startR * cols + startC] === 1) return null;

    const flood = floodFill(startC, startR, grid, cols, rows);

console.log('ROOM_FLOOD_CHECK', {
  clickedPoint: pt,
  floodArea: flood.area,
  escaped: flood.escaped,
  wallCount: solidWalls.length,
});

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

    

    // ✅ نتيجة نظيفة — أعدها فوراً
    return result;
  }

  // ✅ إذا كل المحاولات تسربت (مخطط أحادي الغرفة) → أعيد أفضل fallback
  return null;
    }
