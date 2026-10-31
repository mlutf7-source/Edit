import type { Wall, Point } from './types';
import { wallRectangle } from './geometry';
import { getCurvedWallGeometry } from './curvedWallGeometry';

export function getUnreversedWallOuterEdge(w: Wall, cx: number, cy: number, protrusion: number): Point[] {
  if (!w.curveRadius) {
    const rect = wallRectangle(w);
    
    // ✅ إصلاح: اختيار الحافة الأبعد عن المركز (لضمان أنها الحافة الخارجية دائماً)
    const mid0 = { x: (rect.faces[0].start.x + rect.faces[0].end.x) / 2, y: (rect.faces[0].start.y + rect.faces[0].end.y) / 2 };
    const mid1 = { x: (rect.faces[1].start.x + rect.faces[1].end.x) / 2, y: (rect.faces[1].start.y + rect.faces[1].end.y) / 2 };
    
    const dist0 = Math.hypot(mid0.x - cx, mid0.y - cy);
    const dist1 = Math.hypot(mid1.x - cx, mid1.y - cy);
    
    const chosenFace = dist0 > dist1 ? rect.faces[0] : rect.faces[1];
    
    const edgeStart = { ...chosenFace.start };
    const edgeEnd = { ...chosenFace.end };

    if (protrusion === 0) return [edgeStart, edgeEnd];

    const dx = edgeEnd.x - edgeStart.x;
    const dy = edgeEnd.y - edgeStart.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return [edgeStart, edgeEnd];

    const nx = -dy / len;
    const ny = dx / len;
    
    // التأكد من أن البروز (protrusion) يتجه للخارج (بعيداً عن المركز)
    const toCenterX = cx - edgeStart.x;
    const toCenterY = cy - edgeStart.y;
    const isOutwardNormal = (nx * toCenterX + ny * toCenterY) < 0;
    const finalNx = isOutwardNormal ? nx : -nx;
    const finalNy = isOutwardNormal ? ny : -ny;
    
    const offset = protrusion;

    return [
      { x: edgeStart.x + finalNx * offset, y: edgeStart.y + finalNy * offset },
      { x: edgeEnd.x + finalNx * offset, y: edgeEnd.y + finalNy * offset },
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
//   - في حلقة CCW: الجانب الخارجي = يسار اتجاه المرور على الجدار
//   - في حلقة CW:  الجانب الخارجي = يمين اتجاه المرور
//   - كل جدار له "طبيعته" (start→end كما رُسم) و reversed (يُعكس عند التتبع)
//   - إذا كان normalSign = +1: faces[1] في wallRectangle على اليسار الطبيعي
//   - normalSign الصحيح = 1 عندما (isCCW XOR reversed) = true (الخارجي على اليسار)
//                     = -1 عندما (isCCW XOR reversed) = false (الخارجي على اليمين)
// ═══════════════════════════════════════════════════════════════════

export interface WallLoopAnalysis {
  ordered: { wall: Wall; reversed: boolean }[];
  isCCW: boolean;
  isClosed: boolean;
  normalSignFor: (wallId: string) => number | null;
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

  // ─── 2) حساب المساحة الموقّعة باستخدام مراكز الجدران ───
  // (المساحة الموقّعة تُحدد CCW/CW بغض النظر عن طول كل جدار)
  let signedArea = 0;
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i].wall;
    const b = ordered[(i + 1) % ordered.length].wall;
    const ax = (a.start.x + a.end.x) / 2;
    const ay = (a.start.y + a.end.y) / 2;
    const bx = (b.start.x + b.end.x) / 2;
    const by = (b.start.y + b.end.y) / 2;
    signedArea += ax * by - bx * ay;
  }
  // signedArea > 0 → CCW | signedArea < 0 → CW
  const isCCW = signedArea > 0;

  // ─── 3) اشتقاق normalSign الصحيح لكل جدار ───
  const normalSignMap = new Map<string, number>();
  for (const entry of ordered) {
    // الخارجي على اليسار الطبيعي عندما: (isCCW && !reversed) || (!isCCW && reversed)
    // أي: isCCW !== reversed
    const outerOnLeft = isCCW !== entry.reversed;
    // normalSign = +1 → faces[1] على اليسار الطبيعي
    // normalSign = -1 → faces[1] على اليمين الطبيعي
    // نريد faces[1] = الخارجي (على اليسار عندما outerOnLeft=true)
    normalSignMap.set(entry.wall.id, outerOnLeft ? 1 : -1);
  }

  return {
    ordered,
    isCCW,
    isClosed,
    normalSignFor: (id: string) => normalSignMap.get(id) ?? null,
  };
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
  const ordered = orderWallsIntoLoop(walls);
  if (ordered.length < 3) return [];

  let cx = 0, cy = 0, count = 0;
  walls.forEach(w => { cx += w.start.x + w.end.x; cy += w.start.y + w.end.y; count += 2; });
  cx /= count; cy /= count;

  const polygon: Point[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = ordered[(i + 1) % ordered.length];
    let currPts = getUnreversedWallOuterEdge(curr.wall, cx, cy, protrusion);
    if (curr.reversed) currPts.reverse();
    let nextPts = getUnreversedWallOuterEdge(next.wall, cx, cy, protrusion);
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
