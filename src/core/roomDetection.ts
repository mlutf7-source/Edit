import type { Point, Wall } from './types';
import type { RoomRegion, RegionType } from './regionTypes';
import { getCurvedWallGeometry } from './curvedWallGeometry';
import { orderWallsIntoLoop } from './contourUtils';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════
// ⚙️ إعدادات الشبكة (للكشف فقط — لا يُرسم المضلع منها)
// ═══════════════════════════════════════════════════════════
const CELL = 0.05;
const MAX_CELLS = 2_000_000;
const MIN_AREA = 0.5;
const DILATE = 0.02; // 2cm فقط لمنع تسرب ملء الفراغ

// ═══════════════════════════════════════════════════════════
// 🎨 رسم الجدران على الشبكة
// ═══════════════════════════════════════════════════════════
function rasterizeWalls(
  walls: Wall[],
  grid: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
) {
  const toC = (x: number) => Math.floor((x - minX) / CELL);
  const toR = (y: number) => Math.floor((y - minY) / CELL);

  const markDisk = (wx: number, wy: number, radius: number) => {
    const c0 = toC(wx);
    const r0 = toR(wy);
    const rCells = Math.ceil((radius + DILATE) / CELL);
    for (let dc = -rCells; dc <= rCells; dc++) {
      for (let dr = -rCells; dr <= rCells; dr++) {
        const cc = c0 + dc;
        const rr = r0 + dr;
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
        const cx = minX + (cc + 0.5) * CELL;
        const cy = minY + (rr + 0.5) * CELL;
        if (Math.hypot(cx - wx, cy - wy) <= radius + DILATE) {
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

// ═══════════════════════════════════════════════════════════
// 🌊 Flood Fill (للكشف عن الغرفة)
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 📏 المسافة بين نقطة وجدار (مستقيم/منحني)
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 🔷 الحافة الداخلية الحقيقية للجدار
// ═══════════════════════════════════════════════════════════
function getInnerEdge(w: Wall, cx: number, cy: number): Point[] {
  if (!w.curveRadius) {
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const midX = (w.start.x + w.end.x) / 2;
    const midY = (w.start.y + w.end.y) / 2;
    const sign = (nx * (cx - midX) + ny * (cy - midY)) > 0 ? 1 : -1;
    const off = (w.thickness / 2) * sign;
    return [
      { x: w.start.x + nx * off, y: w.start.y + ny * off },
      { x: w.end.x + nx * off, y: w.end.y + ny * off },
    ];
  }

  const geo = getCurvedWallGeometry(w);
  if (!geo) return [{ ...w.start }, { ...w.end }];

  const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
  const dir = geo.anticlockwise ? -1 : 1;
  const midAng = geo.startAngle + dir * (span / 2);
  const ptOuter = { x: geo.center.x + Math.cos(midAng) * geo.outerRadius, y: geo.center.y + Math.sin(midAng) * geo.outerRadius };
  const ptInner = { x: geo.center.x + Math.cos(midAng) * geo.innerRadius, y: geo.center.y + Math.sin(midAng) * geo.innerRadius };
  const R = Math.hypot(ptOuter.x - cx, ptOuter.y - cy) < Math.hypot(ptInner.x - cx, ptInner.y - cy)
    ? geo.outerRadius : geo.innerRadius;

  const SEGS = 16;
  const pts: Point[] = [];
  for (let i = 0; i <= SEGS; i++) {
    const ang = geo.startAngle + dir * span * (i / SEGS);
    pts.push({ x: geo.center.x + Math.cos(ang) * R, y: geo.center.y + Math.sin(ang) * R });
  }
  return pts;
}

// ═══════════════════════════════════════════════════════════
// 🔷 بناء المضلع الداخلي من الجدران
// ═══════════════════════════════════════════════════════════
function buildInnerPolygon(borderingWalls: Wall[], cx: number, cy: number): Point[] | null {
  const ordered = orderWallsIntoLoop(borderingWalls);
  if (ordered.length < 3) return null;

  const polygon: Point[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = ordered[(i + 1) % ordered.length];

    let currPts = getInnerEdge(curr.wall, cx, cy);
    if (curr.reversed) currPts.reverse();
    let nextPts = getInnerEdge(next.wall, cx, cy);
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
      const offset = Math.max(curr.wall.thickness, next.wall.thickness) / 2;
      if (dist < offset * 3) polygon.push(inter);
      else {
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

// ═══════════════════════════════════════════════════════════
// 🎯 الدالة الرئيسية
// ═══════════════════════════════════════════════════════════
export function detectRoomRegion(pt: Point, walls: Wall[], type: RegionType): RoomRegion | null {
  const solidWalls = walls.filter((w) => !w.kind || w.kind === 'wall' || w.kind === 'fence');
  if (solidWalls.length < 2) return null;

  // 1) Bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const w of solidWalls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }
  if (!isFinite(minX)) return null;

  const margin = 1.0;
  minX -= margin; maxX += margin;
  minY -= margin; maxY += margin;

  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxY - minY) / CELL);
  if (cols * rows > MAX_CELLS) return null;

  // 2) Grid + Flood Fill
  const grid = new Uint8Array(cols * rows);
  rasterizeWalls(solidWalls, grid, cols, rows, minX, minY);

  const startC = Math.floor((pt.x - minX) / CELL);
  const startR = Math.floor((pt.y - minY) / CELL);
  if (startC < 0 || startC >= cols || startR < 0 || startR >= rows) return null;
  if (grid[startR * cols + startC] === 1) return null;

  const flood = floodFill(startC, startR, grid, cols, rows);
  if (flood.escaped) return null;
  if (flood.area < MIN_AREA) return null;

  // 3) اكتشاف الجدران المحيطة
  const borderingWallIds = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (!flood.visited[idx]) continue;
      const isBoundary =
        (r === 0 || !flood.visited[(r - 1) * cols + c]) ||
        (r === rows - 1 || !flood.visited[(r + 1) * cols + c]) ||
        (c === 0 || !flood.visited[r * cols + c - 1]) ||
        (c === cols - 1 || !flood.visited[r * cols + c + 1]);
      if (!isBoundary) continue;

      const cx = minX + (c + 0.5) * CELL;
      const cy = minY + (r + 0.5) * CELL;
      for (const wall of solidWalls) {
        if (borderingWallIds.has(wall.id)) continue;
        if (distToWall({ x: cx, y: cy }, wall) < wall.thickness / 2 + CELL * 2.5) {
          borderingWallIds.add(wall.id);
        }
      }
    }
  }

  // 4) بناء المضلع من الجدران الفعلية
  const borderingWalls = solidWalls.filter((w) => borderingWallIds.has(w.id));
  if (borderingWalls.length < 3) return null;

  let cx = 0, cy = 0;
  for (const w of borderingWalls) {
    cx += (w.start.x + w.end.x) / 2;
    cy += (w.start.y + w.end.y) / 2;
  }
  cx /= borderingWalls.length;
  cy /= borderingWalls.length;

  const polygon = buildInnerPolygon(borderingWalls, cx, cy);
  if (!polygon) return null;

  // 5) المساحة
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  area = Math.abs(area) / 2;
  if (area < MIN_AREA) return null;

  return {
    id: uuidv4(),
    type,
    polygon,
    area,
    wallIds: borderingWalls.map((w) => w.id),
  };
  }
