import type { Point, Wall, SnapResult } from './types';
import { distance, closestPointOnSegment, wallRectangle } from './geometry';
import { getCurvedWallGeometry } from './curvedWallGeometry';

const CORNER_SNAP = 0.20;
const FACE_SNAP = 0.10;
const ARC_SEGMENTS = 24;

// ✅ تعريف نوع النقطة (حافة أو مركز)
export type SnapPreference = 'edge' | 'mid';

// ✅ دالة حساب النقاط مع إعطاء أولوية للنوع المطابق (خصم 20% من المسافة)
function getScore(dist: number, isEdge: boolean, preferredType?: SnapPreference) {
  if (!preferredType) return dist;
  if (preferredType === 'edge' && isEdge) return dist * 0.8; // أولوية للحواف
  if (preferredType === 'mid' && !isEdge) return dist * 0.8; // أولوية للمراكز
  return dist;
}

function snapCurvedWall(
  pt: Point,
  wall: Wall,
  bestCorner: SnapResult | null,
  bestCornerScore: number,
  bestFace: SnapResult | null,
  bestFaceScore: number,
  preferredType?: SnapPreference
) {
  const geo = getCurvedWallGeometry(wall);
  if (!geo) return { bestCorner, bestCornerScore, bestFace, bestFaceScore };

  const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
  const dir = geo.anticlockwise ? -1 : 1;

  const outerPts: Point[] = [];
  const innerPts: Point[] = [];
  const midPts: Point[] = [];

  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const angle = geo.startAngle + dir * span * (i / ARC_SEGMENTS);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    outerPts.push({ x: geo.center.x + cos * geo.outerRadius, y: geo.center.y + sin * geo.outerRadius });
    innerPts.push({ x: geo.center.x + cos * geo.innerRadius, y: geo.center.y + sin * geo.innerRadius });
    midPts.push({ x: geo.center.x + cos * geo.radius, y: geo.center.y + sin * geo.radius });
  }

  // 3 نقاط تصاق عند كل طرف (خارجي/داخلي/مركزي)
  const cornerPts: { p: Point; isEdge: boolean }[] = [
    { p: outerPts[0], isEdge: true }, 
    { p: outerPts[ARC_SEGMENTS], isEdge: true },
    { p: innerPts[0], isEdge: true }, 
    { p: innerPts[ARC_SEGMENTS], isEdge: true },
    { p: midPts[0], isEdge: false }, 
    { p: midPts[ARC_SEGMENTS], isEdge: false },
  ];
  
  for (const { p: corner, isEdge } of cornerPts) {
    const d = distance(pt, corner);
    const score = getScore(d, isEdge, preferredType);
    if (score <= bestCornerScore) {
      bestCornerScore = score;
      bestCorner = { point: corner, type: 'corner', wallId: wall.id, distance: d };
    }
  }

  // الالتصاق على طول المسار (خارجي/داخلي/مركزي)
  const polylines: { pts: Point[]; isEdge: boolean }[] = [
    { pts: outerPts, isEdge: true },
    { pts: innerPts, isEdge: true },
    { pts: midPts, isEdge: false },
  ];

  for (const { pts: polyline, isEdge } of polylines) {
    for (let i = 0; i < polyline.length - 1; i++) {
      const cp = closestPointOnSegment(pt, polyline[i], polyline[i + 1]);
      const d = distance(pt, cp);
      const score = getScore(d, isEdge, preferredType);
      if (score <= bestFaceScore) {
        bestFaceScore = score;
        bestFace = { point: cp, type: 'face', wallId: wall.id, distance: d };
      }
    }
  }

  return { bestCorner, bestCornerScore, bestFace, bestFaceScore };
}

export function findSnapToFace(
  pt: Point,
  walls: Wall[],
  excludeId?: string,
  threshold?: number,
  preferredType?: SnapPreference // ✅ نوع النقطة المفضلة
): SnapResult | null {
  let bestCorner: SnapResult | null = null;
  let bestCornerScore = CORNER_SNAP;

  let bestFace: SnapResult | null = null;
  let bestFaceScore = threshold ?? FACE_SNAP;

  for (const wall of walls) {
    if (wall.id === excludeId) continue;

    if (wall.curveRadius) {
      const r = snapCurvedWall(pt, wall, bestCorner, bestCornerScore, bestFace, bestFaceScore, preferredType);
      bestCorner = r.bestCorner;
      bestCornerScore = r.bestCornerScore;
      bestFace = r.bestFace;
      bestFaceScore = r.bestFaceScore;
      continue;
    }

    const rect = wallRectangle(wall);

    const midStart: Point = {
      x: (rect.corners[0].x + rect.corners[3].x) / 2,
      y: (rect.corners[0].y + rect.corners[3].y) / 2,
    };
    const midEnd: Point = {
      x: (rect.corners[1].x + rect.corners[2].x) / 2,
      y: (rect.corners[1].y + rect.corners[2].y) / 2,
    };

    // 3 نقاط تصاق عند كل طرف (زاويتان + منتصف)
    const snapPoints: { p: Point; isEdge: boolean }[] = [
      { p: rect.corners[0], isEdge: true },
      { p: rect.corners[1], isEdge: true },
      { p: rect.corners[2], isEdge: true },
      { p: rect.corners[3], isEdge: true },
      { p: midStart, isEdge: false },
      { p: midEnd, isEdge: false },
    ];

    for (const { p: corner, isEdge } of snapPoints) {
      const d = distance(pt, corner);
      const score = getScore(d, isEdge, preferredType);
      if (score <= bestCornerScore) {
        bestCornerScore = score;
        bestCorner = { point: corner, type: 'corner', wallId: wall.id, distance: d };
      }
    }

    // الحافتان الكاملتان + خط المنتصف
    const faces: { f: { start: Point; end: Point }; isEdge: boolean }[] = [
      { f: rect.faces[0], isEdge: true },
      { f: rect.faces[1], isEdge: true },
      { f: { start: midStart, end: midEnd }, isEdge: false },
    ];

    for (const { f, isEdge } of faces) {
      const cp = closestPointOnSegment(pt, f.start, f.end);
      const d = distance(pt, cp);
      const score = getScore(d, isEdge, preferredType);
      if (score <= bestFaceScore) {
        bestFaceScore = score;
        bestFace = { point: cp, type: 'face', wallId: wall.id, distance: d };
      }
    }
  }

  // ✅ الأقرب هو الفائز بناءً على "النتيجة" (Score) التي تأخذ الأولوية في الحسبان
  if (bestCorner && bestFace) {
    return bestCornerScore <= bestFaceScore ? bestCorner : bestFace;
  }
  return bestCorner ?? bestFace;
}
