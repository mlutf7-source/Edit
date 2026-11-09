import type { Point, Wall } from './types';
import type { RoomRegion, RegionType } from './regionTypes';
import { getCurvedWallGeometry } from './curvedWallGeometry';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════
// ⚙️ إعدادات الشبكة
// ═══════════════════════════════════════════════════════════
const CELL = 0.05;                    // 5cm لكل خلية
const MAX_CELLS = 2_000_000;          // حد أقصى لمنع التجمد (~5000 م²)
const DILATE = CELL * 1.2;            // 6cm توسيع الجدران لسد الفجوات
const MIN_AREA = 0.5;                 // الحد الأدنى لمساحة الغرفة (م²)

// ═══════════════════════════════════════════════════════════
// 🎨 رسم الجدران على الشبكة (مع دعم المنحنيات)
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
      // ✅ جدار منحني → عيّنات على طول القوس
      const geo = getCurvedWallGeometry(wall);
      if (geo) {
        const arcLen = Math.abs(geo.arcSpan) * geo.radius;
        const segs = Math.max(8, Math.ceil(arcLen / CELL));
        for (let i = 0; i <= segs; i++) {
          const ang = geo.startAngle + geo.arcSpan * (i / segs);
          const x = geo.center.x + Math.cos(ang) * geo.radius;
          const y = geo.center.y + Math.sin(ang) * geo.radius;
          markDisk(x, y, halfThick);
        }
      }
    } else {
      // ✅ جدار مستقيم → عيّنات على طول الخط
      const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
      const segs = Math.max(2, Math.ceil(len / CELL));
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = wall.start.x + t * (wall.end.x - wall.start.x);
        const y = wall.start.y + t * (wall.end.y - wall.start.y);
        markDisk(x, y, halfThick);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🌊 Flood Fill — ملء المنطقة من نقطة النقر
// ═══════════════════════════════════════════════════════════
interface FloodResult {
  visited: Uint8Array;
  area: number;
  escaped: boolean;
}

function floodFill(
  startC: number,
  startR: number,
  grid: Uint8Array,
  cols: number,
  rows: number,
): FloodResult {
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
        // ✅ خرجنا من الحدود → ليس غرفة مغلقة
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
// 🔷 استخراج الحدود — الإصلاح الجوهري هنا
// ═══════════════════════════════════════════════════════════
function extractOutline(
  visited: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
): Point[] | null {
  const ptKey = (p: Point) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;

  // ✅ 1) جمع حواف الحدود باتجاه موحّد (CW)
  const edges: Array<[Point, Point]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (!visited[idx]) continue;

      const x0 = minX + c * CELL;
      const y0 = minY + r * CELL;
      const x1 = x0 + CELL;
      const y1 = y0 + CELL;

      // ══════════════════════════════════════════════
      // ✅ الاتجاهات المتناسقة (تحل مشكلة المثلث)
      // ══════════════════════════════════════════════
      if (r === 0 || !visited[(r - 1) * cols + c]) {
        // الحافة العلوية: يسار → يمين
        edges.push([{ x: x0, y: y0 }, { x: x1, y: y0 }]);
      }
      if (c === cols - 1 || !visited[r * cols + c + 1]) {
        // الحافة اليمنى: فوق → تحت
        edges.push([{ x: x1, y: y0 }, { x: x1, y: y1 }]);
      }
      if (r === rows - 1 || !visited[(r + 1) * cols + c]) {
        // الحافة السفلية: يمين → يسار (عكس العلوية)
        edges.push([{ x: x1, y: y1 }, { x: x0, y: y1 }]);
      }
      if (c === 0 || !visited[r * cols + c - 1]) {
        // الحافة اليسرى: تحت → فوق (عكس اليمنى)
        edges.push([{ x: x0, y: y1 }, { x: x0, y: y0 }]);
      }
    }
  }

  if (edges.length < 4) return null;

  // ✅ 2) خريطة: نقطة → حواف تبدأ منها
  const startMap = new Map<string, Array<[Point, Point]>>();
  for (const e of edges) {
    const k = ptKey(e[0]);
    if (!startMap.has(k)) startMap.set(k, []);
    startMap.get(k)!.push(e);
  }

  // ✅ 3) تتبع الحواف
  const outline: Point[] = [];
  const usedEdges = new Set<string>();
  let currentEdge: [Point, Point] | null = edges[0];

  while (currentEdge) {
    const ek = `${ptKey(currentEdge[0])}→${ptKey(currentEdge[1])}`;
    if (usedEdges.has(ek)) break;
    usedEdges.add(ek);
    outline.push(currentEdge[0]);

    const nextCandidates = startMap.get(ptKey(currentEdge[1])) || [];
    let nextEdge: [Point, Point] | null = null;
    for (const ne of nextCandidates) {
      const nk = `${ptKey(ne[0])}→${ptKey(ne[1])}`;
      if (!usedEdges.has(nk)) {
        nextEdge = ne;
        break;
      }
    }
    currentEdge = nextEdge;

    // حماية من حلقات لا نهائية
    if (usedEdges.size > edges.length) break;
  }

  if (outline.length < 3) return null;

  // ✅ 4) تبسيط: حذف النقاط على نفس الخط المستقيم
  const simplified: Point[] = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const a = outline[(i - 1 + n) % n];
    const b = outline[i];
    const c = outline[(i + 1) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) > 1e-5) {
      simplified.push(b);
    }
  }

  return simplified.length >= 3 ? simplified : null;
}

// ═══════════════════════════════════════════════════════════
// 🎯 الدالة الرئيسية
// ═══════════════════════════════════════════════════════════
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
  minX -= margin; maxX += margin;
  minY -= margin; maxY += margin;

  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxY - minY) / CELL);

  if (cols * rows > MAX_CELLS) return null;

  const grid = new Uint8Array(cols * rows);
  rasterizeWalls(solidWalls, grid, cols, rows, minX, minY);

  const startC = Math.floor((pt.x - minX) / CELL);
  const startR = Math.floor((pt.y - minY) / CELL);

  if (startC < 0 || startC >= cols || startR < 0 || startR >= rows) return null;
  if (grid[startR * cols + startC] === 1) return null;

  const flood = floodFill(startC, startR, grid, cols, rows);

  if (flood.escaped) return null;
  if (flood.area < MIN_AREA) return null;

  const outline = extractOutline(flood.visited, cols, rows, minX, minY);
  if (!outline) return null;

  return {
    id: uuidv4(),
    type,
    polygon: outline,
    area: flood.area,
    wallIds: solidWalls.map((w) => w.id),
  };
}
