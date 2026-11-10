import type { Point, Wall } from './types';
import type { RoomRegion, RegionType } from './regionTypes';
import { getCurvedWallGeometry } from './curvedWallGeometry';
import { orderWallsIntoLoop } from './contourUtils';
import { wallRectangle } from './geometry';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════
const CELL = 0.05;              // 5cm
const MAX_CELLS = 2_000_000;
const MIN_AREA = 0.5;
// درجات تصاعدية لفتح الفجوات (من الدقة العالية إلى التسامح)
const DILATES = [0.03, 0.06, 0.10, 0.15, 0.20];

function rasterizeWalls(
  walls: Wall[], grid: Uint8Array,
  cols: number, rows: number, minX: number, minY: number,
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
  startC: number, startR: number,
  grid: Uint8Array, cols: number, rows: number,
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
  startC: number, startR: number,
  grid: Uint8Array, cols: number, rows: number,
) {
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

function distToWall(pt: Point, wall: Wall): number {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      const r = Math.hypot(pt.x - geo.center.x, pt.y - geo.center.y);
      return Math.abs(r - geo.radius);
    }
  }
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(pt.x - wall.start.x, pt.y - wall.start.y);
  let t = ((pt.x - wall.start.x) * dx + (pt.y - wall.start.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pt.x - (wall.start.x + t * dx), pt.y - (wall.start.y + t * dy));
}

function getInnerEdge(w: Wall, pt: Point): Point[] {
  if (!w.curveRadius) {
    const rect = wallRectangle(w);
    const f0 = rect.faces[0];
    const f1 = rect.faces[1];
    const mid0 = { x: (f0.start.x + f0.end.x) / 2, y: (f0.start.y + f0.end.y) / 2 };
    const mid1 = { x: (f1.start.x + f1.end.x) / 2, y: (f1.start.y + f1.end.y) / 2 };
    const d0 = Math.hypot(pt.x - mid0.x, pt.y - mid0.y);
    const d1 = Math.hypot(pt.x - mid1.x, pt.y - mid1.y);
    const chosen = d0 < d1 ? f0 : f1;
    return [{ ...chosen.start }, { ...chosen.end }];
  }
  
  const geo = getCurvedWallGeometry(w);
  if (!geo) return [{ ...w.start }, { ...w.end }];
  
  const ptDist = Math.hypot(pt.x - geo.center.x, pt.y - geo.center.y);
  const isInner = ptDist < geo.radius; 
  const R = isInner ? geo.innerRadius : geo.outerRadius;
  
  const span = geo.arcSpan;
  const dir = span > 0 ? 1 : -1;
  const SEGS = 16;
  const pts: Point[] = [];
  for (let i = 0; i <= SEGS; i++) {
    const ang = geo.startAngle + span * (i / SEGS);
    pts.push({ x: geo.center.x + Math.cos(ang) * R, y: geo.center.y + Math.sin(ang) * R });
  }
  return pts;
}

function buildInnerPolygon(borderingWalls: Wall[], pt: Point): Point[] | null {
  const ordered = orderWallsIntoLoop(borderingWalls);
  if (ordered.length < 3) return null;

  const polygon: Point[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = ordered[(i + 1) % ordered.length];

    let currPts = getInnerEdge(curr.wall, pt);
    if (curr.reversed) currPts.reverse();
    let nextPts = getInnerEdge(next.wall, pt);
    if (next.reversed) nextPts.reverse();

    const startIdx = i === 0 ? 0 : 1;
    for (let j = startIdx; j < currPts.length - 1; j++) polygon.push(currPts[j]);

    const currEnd = currPts[currPts.length - 1];
    const currPrev = currPts[currPts.length - 2] || currEnd;
    const nextStart = nextPts[0];
    const nextSecond = nextPts[1] || nextStart;
    const dx1 = currEnd.x - currPrev.x, dy1 = currEnd.y - currPrev.y;
    const dx2 = nextSecond.x - nextStart.x, dy2 = nextSecond.y - nextStart.y;
    const det = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(det) < 1e-6) {
      polygon.push(currEnd);
      polygon.push(nextStart);
    } else {
      const t = ((nextStart.x - currEnd.x) * dy2 - (nextStart.y - currEnd.y) * dx2) / det;
      const inter = { x: currEnd.x + t * dx1, y: currEnd.y + t * dy1 };
      const dist = Math.hypot(inter.x - currEnd.x, inter.y - currEnd.y);
      
      if (dist < 2.0) {
        polygon.push(inter);
      } else {
        polygon.push(currEnd);
        polygon.push(nextStart);
      }
    }
  }

  const cleaned: Point[] = [];
  for (const p of polygon) {
    if (cleaned.length === 0 || Math.hypot(cleaned[cleaned.length - 1].x - p.x, cleaned[cleaned.length - 1].y - p.y) > 0.01) {
      cleaned.push(p);
    }
  }
  if (cleaned.length > 2 && Math.hypot(cleaned[0].x - cleaned[cleaned.length - 1].x, cleaned[0].y - cleaned[cleaned.length - 1].y) < 0.1) {
    cleaned.pop();
  }
  return cleaned.length >= 3 ? cleaned : null;
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

  const margin = 1.0;
  const bx0 = minX - margin, bx1 = maxX + margin;
  const by0 = minY - margin, by1 = maxY + margin;
  const cols = Math.ceil((bx1 - bx0) / CELL);
  const rows = Math.ceil((by1 - by0) / CELL);

  if (cols * rows > MAX_CELLS) return null;

  for (const dilate of DILATES) {
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

    const borderingWallIds = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!flood.visited[r * cols + c]) continue;
        
        const isBoundary = 
          (r === 0 || !flood.visited[(r - 1) * cols + c]) ||
          (r === rows - 1 || !flood.visited[(r + 1) * cols + c]) ||
          (c === 0 || !flood.visited[r * cols + c - 1]) ||
          (c === cols - 1 || !flood.visited[r * cols + c + 1]);

        if (!isBoundary) continue;

        const cx = bx0 + (c + 0.5) * CELL;
        const cy = by0 + (r + 0.5) * CELL;

        let closestWall: Wall | null = null;
        let minDist = Infinity;
        for (const wall of solidWalls) {
          const d = distToWall({ x: cx, y: cy }, wall);
          if (d < minDist) {
            minDist = d;
            closestWall = wall;
          }
        }
        if (closestWall && minDist < closestWall.thickness / 2 + CELL * 4) {
          borderingWallIds.add(closestWall.id);
        }
      }
    }

    const borderingWalls = solidWalls.filter((w) => borderingWallIds.has(w.id));
    if (borderingWalls.length < 3) continue;

    const polygon = buildInnerPolygon(borderingWalls, pt);
    if (!polygon) continue;

    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    }
    area = Math.abs(area) / 2;

    if (area < MIN_AREA) continue;

    return {
      id: uuidv4(),
      type,
      polygon,
      area,
      wallIds: borderingWalls.map((w) => w.id),
    };
  }

  return null;
                    }
