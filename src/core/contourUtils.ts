import type { Wall, Point } from './types';
import { wallRectangle } from './geometry';
import { getCurvedWallGeometry } from './curvedWallGeometry';
export function getUnreversedWallOuterEdge(
  w: Wall,
  cx: number,
  cy: number,
  protrusion: number,
  outwardNormal?: { x: number; y: number }, // ✅ الاتجاه الرياضي للخارج
): Point[] {
  if (outwardNormal) {
    // ─── الجدران المستقيمة ───
    if (!w.curveRadius) {
      const rect = wallRectangle(w);
      const face0 = rect.faces[0];
      const face1 = rect.faces[1];
      // اختيار الوجه الأبعد في اتجاه outwardNormal
      const mid0 = { x: (face0.start.x + face0.end.x) / 2, y: (face0.start.y + face0.end.y) / 2 };
      const mid1 = { x: (face1.start.x + face1.end.x) / 2, y: (face1.start.y + face1.end.y) / 2 };
      const dot0 = mid0.x * outwardNormal.x + mid0.y * outwardNormal.y;
      const dot1 = mid1.x * outwardNormal.x + mid1.y * outwardNormal.y;
      const chosen = dot0 > dot1 ? face0 : face1;
      
      if (protrusion === 0) return [{ ...chosen.start }, { ...chosen.end }];
      
      return [
        { x: chosen.start.x + outwardNormal.x * protrusion, y: chosen.start.y + outwardNormal.y * protrusion },
        { x: chosen.end.x + outwardNormal.x * protrusion, y: chosen.end.y + outwardNormal.y * protrusion },
      ];
    }

    // ─── الجدران المنحنية (تعتمد دائماً على outerRadius) ───
    const geo = getCurvedWallGeometry(w);
    if (!geo) return [{ ...w.start }, { ...w.end }];

    const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
    const dir = geo.anticlockwise ? -1 : 1;
    const R = geo.outerRadius + protrusion;

    const totalLen = Math.abs(span) * R;
    const PROUD = 0.20, RECESSED = 0.10;
    const pts: Point[] = [];
    let currentLen = 0, isProud = true, currentAngle = geo.startAngle;
    pts.push({ x: geo.center.x + Math.cos(currentAngle) * R, y: geo.center.y + Math.sin(currentAngle) * R });
    while (currentLen < totalLen - 0.001) {
      const width = isProud ? PROUD : RECESSED;
      const step = Math.min(width, totalLen - currentLen);
      currentAngle += dir * (step / R);
      currentLen += step;
      pts.push({ x: geo.center.x + Math.cos(currentAngle) * R, y: geo.center.y + Math.sin(currentAngle) * R });
      isProud = !isProud;
    }
    return pts;
  }

  // ⬇️ المسار القديم (Centroid) — يبقى كما هو للتوافق
  if (!w.curveRadius) {
    const rect = wallRectangle(w);
    const mid0 = { x: (rect.faces[0].start.x + rect.faces[0].end.x) / 2, y: (rect.faces[0].start.y + rect.faces[0].end.y) / 2 };
    const mid1 = { x: (rect.faces[1].start.x + rect.faces[1].end.x) / 2, y: (rect.faces[1].start.y + rect.faces[1].end.y) / 2 };
    const dist0 = Math.hypot(mid0.x - cx, mid0.y - cy);
    const dist1 = Math.hypot(mid1.x - cx, mid1.y - cy);
    const chosenFace = dist0 > dist1 ? rect.faces[0] : rect.faces[1];
    const edgeStart = { ...chosenFace.start };
    const edgeEnd = { ...chosenFace.end };
    if (protrusion === 0) return [edgeStart, edgeEnd];
    const dx = edgeEnd.x - edgeStart.x, dy = edgeEnd.y - edgeStart.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return [edgeStart, edgeEnd];
    const nx = -dy / len, ny = dx / len;
    const toCenterX = cx - edgeStart.x, toCenterY = cy - edgeStart.y;
    const isOutwardNormal = (nx * toCenterX + ny * toCenterY) < 0;
    const finalNx = isOutwardNormal ? nx : -nx, finalNy = isOutwardNormal ? ny : -ny;
    return [
      { x: edgeStart.x + finalNx * protrusion, y: edgeStart.y + finalNy * protrusion },
      { x: edgeEnd.x + finalNx * protrusion, y: edgeEnd.y + finalNy * protrusion },
    ];
  }
  const geo = getCurvedWallGeometry(w);
  if (!geo) return [{ ...w.start }, { ...w.end }];
  const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
  const dir = geo.anticlockwise ? -1 : 1;
  const outerR = geo.radius + w.thickness / 2 + protrusion;
  const innerR = Math.max(0.01, geo.radius - w.thickness / 2 - protrusion);
  const midAngle = geo.startAngle + dir * span / 2;
  const ptOuter = { x: geo.center.x + Math.cos(midAngle) * outerR, y: geo.center.y + Math.sin(midAngle) * outerR };
  const ptInner = { x: geo.center.x + Math.cos(midAngle) * innerR, y: geo.center.y + Math.sin(midAngle) * innerR };
  const distOuter = Math.hypot(ptOuter.x - cx, ptOuter.y - cy);
  const distInner = Math.hypot(ptInner.x - cx, ptInner.y - cy);
  const R = distOuter > distInner ? outerR : innerR;
  const totalLen = Math.abs(span) * R;
  const PROUD = 0.20, RECESSED = 0.10;
  const pts: Point[] = [];
  let currentLen = 0, isProud = true, currentAngle = geo.startAngle;
  pts.push({ x: geo.center.x + Math.cos(currentAngle) * R, y: geo.center.y + Math.sin(currentAngle) * R });
  while (currentLen < totalLen - 0.001) {
    const width = isProud ? PROUD : RECESSED;
    const step = Math.min(width, totalLen - currentLen);
    currentAngle += dir * (step / R);
    currentLen += step;
    pts.push({ x: geo.center.x + Math.cos(currentAngle) * R, y: geo.center.y + Math.sin(currentAngle) * R });
    isProud = !isProud;
  }
  return pts;
                             }

export function orderWallsIntoLoop(walls: Wall[]): { wall: Wall; reversed: boolean }[] {
  if (walls.length === 0) return [];
  const remaining = new Set(walls.map(w => w.id));
  const ordered: { wall: Wall; reversed: boolean }[] = [];
  const first = walls[0];
  ordered.push({ wall: first, reversed: false });
  remaining.delete(first.id);
  let currentPt = first.end;
  const TOL = 0.5;
  let safety = 0;
  
  while (remaining.size > 0 && safety++ < walls.length + 2) {
    let found = false;
    for (const w of walls) {
      if (!remaining.has(w.id)) continue;
      if (Math.hypot(w.start.x - currentPt.x, w.start.y - currentPt.y) < TOL) {
        ordered.push({ wall: w, reversed: false });
        remaining.delete(w.id);
        currentPt = w.end;
        found = true;
        break;
      }
      if (Math.hypot(w.end.x - currentPt.x, w.end.y - currentPt.y) < TOL) {
        ordered.push({ wall: w, reversed: true });
        remaining.delete(w.id);
        currentPt = w.start;
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return ordered;
}
// ═══════════════════════════════════════════════════════════════════
// ✅ جديد: تحليل حلقة الجدران — المرجع الموحّد للحواف الخارجية
// ═══════════════════════════════════════════════════════════════════
// 
// يُرجع:
//   - ordered: الجدران مرتبة على الحلقة (مع حالة reversed لكل جدار)
//   - isCCW:   اتجاه الحلقة (عكس عقارب الساعة = true)
//   - isClosed: هل الجدار الأخير يلتقي مع الأول في حدود TOL؟
//   - normalSignFor: دالة تُرجع normalSign الصحيح لكل جدار
//
// المنطق الرياضي:
//   - في حلقة CCW: داخل المبنى = يسار اتجاه المرور على الجدار
//   - في حلقة CW:  داخل المبنى = يمين اتجاه المرور
//   - كل جدار له "طبيعته" (start→end كما رُسم) و reversed (يُعكس عند التتبع)
//   - normalSign يحدد جهة امتداد سماكة الجدار (جهة الداخل)؛ الوجه الخارجي هو المقابل
//   - normalSign = +1 عندما يكون الداخل على اليسار الطبيعي، وإلا -1
// ═══════════════════════════════════════════════════════════════════

export interface WallLoopAnalysis {
  ordered: { wall: Wall; reversed: boolean }[];
  isCCW: boolean;
  isClosed: boolean;
  normalSignFor: (wallId: string) => 1 | -1 | null;
}

export function analyzeWallLoop(walls: Wall[]): WallLoopAnalysis | null {
  if (walls.length < 3) return null;

  const ordered = orderWallsIntoLoop(walls);
  if (ordered.length < 3) return null;

  // ─── 1) فحص الإغلاق: هل الحلقة مغلقة؟ ───
  const TOL = 0.5; // ✅ نفس TOL المستخدم في orderWallsIntoLoop (بلا تغيير)
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const firstStart = first.reversed ? first.wall.end : first.wall.start;
  const lastEnd = last.reversed ? last.wall.start : last.wall.end;
  const gap = Math.hypot(lastEnd.x - firstStart.x, lastEnd.y - firstStart.y);
  const isClosed = gap < TOL;

  // ─── 2) حساب اتجاه الحلقة من نقاط المسار الفعلية ───
  let signedArea = 0;
  for (const entry of ordered) {
    const start = entry.reversed ? entry.wall.end : entry.wall.start;
    const end = entry.reversed ? entry.wall.start : entry.wall.end;
    signedArea += start.x * end.y - end.x * start.y;
  }
  // signedArea > 0 → CCW | signedArea < 0 → CW
  const isCCW = signedArea > 0;

  // ─── 3) اشتقاق جهة داخل الجدار لكل جدار ───
  const normalSignMap = new Map<string, 1 | -1>();
  for (const entry of ordered) {
    const interiorOnLeft = isCCW !== entry.reversed;
    normalSignMap.set(entry.wall.id, interiorOnLeft ? 1 : -1);
  }

  return {
    ordered,
    isCCW,
    isClosed,
    normalSignFor: (id: string) => normalSignMap.get(id) ?? null,
  };
}

export function orientWallsForClosedContour(walls: Wall[]): Wall[] {
  const analysis = analyzeWallLoop(walls);
  if (
    !analysis ||
    !analysis.isClosed ||
    analysis.ordered.length !== walls.length
  ) {
    return walls;
  }

  return walls.map(wall => {
    const normalSign = analysis.normalSignFor(wall.id);
    return normalSign === null || normalSign === wall.normalSign
      ? wall
      : { ...wall, normalSign };
  });
}

export function polygonArea(pts: Point[]): number {
  if (pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a / 2);
}

export function buildContourPolygon(walls: Wall[], protrusion: number): Point[] {
  const analysis = analyzeWallLoop(walls);
  if (!analysis || !analysis.isClosed || analysis.ordered.length !== walls.length) return [];
  const ordered = analysis.ordered;
  if (ordered.length < 3) return [];

  const polygon: Point[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = ordered[(i + 1) % ordered.length];

    // ✅ حساب اتجاه "الخارج" بدقة من تحليل الحلقة (لا يعتمد على normalSign)
    const getOutwardNormal = (wall: Wall, reversed: boolean) => {
      const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) return { x: 0, y: 0 };
      const leftX = -dy / len, leftY = dx / len;
      const outerOnLeft = analysis.isCCW === reversed; 
      return { x: outerOnLeft ? leftX : -leftX, y: outerOnLeft ? leftY : -leftY };
    };

    const currN = getOutwardNormal(curr.wall, curr.reversed);
    const nextN = getOutwardNormal(next.wall, next.reversed);

    let currPts = getUnreversedWallOuterEdge(curr.wall, 0, 0, protrusion, currN);
    if (curr.reversed) currPts.reverse();
    let nextPts = getUnreversedWallOuterEdge(next.wall, 0, 0, protrusion, nextN);
    if (next.reversed) nextPts.reverse();

    const startIdx = (i === 0) ? 0 : 1;
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
      const offset = Math.max(curr.wall.thickness, next.wall.thickness) / 2 + Math.abs(protrusion);
      
      if (dist < offset * 2.5) {
        polygon.push(inter);
      } else {
        polygon.push(currEnd);
        polygon.push(nextStart);
      }
    }
  }

  const cleaned: Point[] = [];
  for (const p of polygon) {
    if (cleaned.length === 0 || Math.hypot(cleaned[cleaned.length - 1].x - p.x, cleaned[cleaned.length - 1].y - p.y) > 0.03) {
      cleaned.push(p);
    }
  }
  
  if (cleaned.length > 2 && Math.hypot(cleaned[0].x - cleaned[cleaned.length - 1].x, cleaned[0].y - cleaned[cleaned.length - 1].y) < 0.1) {
    cleaned.pop();
  }
  return cleaned;
}

export function isPointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = (yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** ✅ حساب الحافة الداخلية لجدار */
export function getUnreversedWallInnerEdge(w: Wall, cx: number, cy: number): Point[] {
  if (!w.curveRadius) {
    const rect = wallRectangle(w);
    return [{ ...rect.faces[1].start }, { ...rect.faces[1].end }];
  }
  
  const geo = getCurvedWallGeometry(w);
  if (!geo) return [{ ...w.start }, { ...w.end }];

  const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
  const dir = geo.anticlockwise ? -1 : 1;
  const outerR = geo.radius + w.thickness / 2;
  const innerR = Math.max(0.01, geo.radius - w.thickness / 2);

  const midAngle = geo.startAngle + dir * span / 2;
  const ptOuter = { x: geo.center.x + Math.cos(midAngle) * outerR, y: geo.center.y + Math.sin(midAngle) * outerR };
  const ptInner = { x: geo.center.x + Math.cos(midAngle) * innerR, y: geo.center.y + Math.sin(midAngle) * innerR };
  const distOuter = Math.hypot(ptOuter.x - cx, ptOuter.y - cy);
  const distInner = Math.hypot(ptInner.x - cx, ptInner.y - cy);

  // نختار الحافة الداخلية (الأقرب للمركز)
  const R = distOuter < distInner ? outerR : innerR;

  const totalLen = Math.abs(span) * R;
  const PROUD = 0.20;
  const RECESSED = 0.10;
  const pts: Point[] = [];
  let currentLen = 0;
  let isProud = true;
  let currentAngle = geo.startAngle;
  pts.push({ x: geo.center.x + Math.cos(currentAngle) * R, y: geo.center.y + Math.sin(currentAngle) * R });

  while (currentLen < totalLen - 0.001) {
    const width = isProud ? PROUD : RECESSED;
    const step = Math.min(width, totalLen - currentLen);
    currentAngle += dir * (step / R);
    currentLen += step;
    pts.push({ x: geo.center.x + Math.cos(currentAngle) * R, y: geo.center.y + Math.sin(currentAngle) * R });
    isProud = !isProud;
  }
  return pts;
}

/** ✅ بناء الحافة الداخلية للحلقة بالكامل (مع دمج الزوايا) */
export function buildContourPolygonInner(walls: Wall[]): Point[] {
  const ordered = orderWallsIntoLoop(walls);
  if (ordered.length < 3) return [];

  let cx = 0, cy = 0, count = 0;
  walls.forEach(w => { cx += w.start.x + w.end.x; cy += w.start.y + w.end.y; count += 2; });
  cx /= count; cy /= count;

  const polygon: Point[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = ordered[(i + 1) % ordered.length];

    let currPts = getUnreversedWallInnerEdge(curr.wall, cx, cy);
    if (curr.reversed) currPts.reverse();

    let nextPts = getUnreversedWallInnerEdge(next.wall, cx, cy);
    if (next.reversed) nextPts.reverse();

    const startIdx = (i === 0) ? 0 : 1;
    for (let j = startIdx; j < currPts.length - 1; j++) polygon.push(currPts[j]);

    const currEnd = currPts[currPts.length - 1];
    const currPrev = currPts[currPts.length - 2] || currEnd;
    const nextStart = nextPts[0];
    const nextSecond = nextPts[1] || nextStart;

    const dx1 = currEnd.x - currPrev.x;
    const dy1 = currEnd.y - currPrev.y;
    const dx2 = nextSecond.x - nextStart.x;
    const dy2 = nextSecond.y - nextStart.y;
    const det = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(det) < 1e-6) {
      polygon.push(currEnd);
      polygon.push(nextStart);
    } else {
      const t = ((nextStart.x - currEnd.x) * dy2 - (nextStart.y - currEnd.y) * dx2) / det;
      const inter = { x: currEnd.x + t * dx1, y: currEnd.y + t * dy1 };
      const dist = Math.hypot(inter.x - currEnd.x, inter.y - currEnd.y);
      const offset = Math.max(curr.wall.thickness, next.wall.thickness) / 2;
      
      if (dist < offset * 2.5) {
        polygon.push(inter);
      } else {
        polygon.push(currEnd);
        polygon.push(nextStart);
      }
    }
  }

  const cleaned: Point[] = [];
  for (const p of polygon) {
    if (cleaned.length === 0 || Math.hypot(cleaned[cleaned.length - 1].x - p.x, cleaned[cleaned.length - 1].y - p.y) > 0.03) {
      cleaned.push(p);
    }
  }
  
  if (cleaned.length > 2 && Math.hypot(cleaned[0].x - cleaned[cleaned.length - 1].x, cleaned[0].y - cleaned[cleaned.length - 1].y) < 0.1) {
    cleaned.pop();
  }
  return cleaned;
    }
