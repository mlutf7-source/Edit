import type { Point, Wall } from './types';
import type { RoomRegion, RegionType } from './regionTypes';
import { wallRectangle } from './geometry';
import { v4 as uuidv4 } from 'uuid';

// ✅ تسامح تصنيف الجدران (15° بدل 0.57°)
const CLASSIFY_TOL = 0.26;
// ✅ تسامح تقاطع الجدران (يسمح بفجوة 10% من طول الجدار)
const INTERSECT_TOL = 0.1;
// ✅ تسامح النقطة على الحافة
const EDGE_TOL = 0.02;

interface Face {
  start: Point;
  end: Point;
  wallId: string;
  midX: number;
  midY: number;
  isHorizontal: boolean;
}

function getAllFaces(walls: Wall[]): Face[] {
  const faces: Face[] = [];
  for (const wall of walls) {
    const rect = wallRectangle(wall);
    for (const face of rect.faces) {
      const midX = (face.start.x + face.end.x) / 2;
      const midY = (face.start.y + face.end.y) / 2;
      const angle = Math.atan2(face.end.y - face.start.y, face.end.x - face.start.x);
      // ✅ تطبيع الزاوية إلى [0, π) لتمييز الأفقي بدقة أكبر
      let normAngle = Math.abs(angle) % Math.PI;
      if (normAngle > Math.PI / 2) normAngle = Math.PI - normAngle;
      const isHorizontal = normAngle < CLASSIFY_TOL;
      faces.push({
        start: face.start,
        end: face.end,
        wallId: wall.id,
        midX,
        midY,
        isHorizontal,
      });
    }
  }
  return faces;
}

// ✅ إيجاد تقاطع مع تسامح (يسمح بامتداد 10% خارج المقطع)
function lineIntersectionTolerant(
  a1: Point, a2: Point,
  b1: Point, b2: Point,
): Point | null {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(d) < 1e-9) return null;
  const ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / d;
  const ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / d;
  // ✅ تسامح: [-0.1, 1.1] بدل [0, 1]
  if (ua >= -INTERSECT_TOL && ua <= 1 + INTERSECT_TOL &&
      ub >= -INTERSECT_TOL && ub <= 1 + INTERSECT_TOL) {
    return {
      x: a1.x + ua * (a2.x - a1.x),
      y: a1.y + ua * (a2.y - a1.y),
    };
  }
  return null;
}

// ✅ Winding Number — أكثر دقة من Ray Casting
function pointInPolygonWinding(pt: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let winding = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];

    // ✅ التحقق من الحافة (مع تسامح)
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq > 1e-9) {
      const t = ((pt.x - a.x) * abx + (pt.y - a.y) * aby) / abLenSq;
      if (t >= -EDGE_TOL && t <= 1 + EDGE_TOL) {
        const projX = a.x + t * abx;
        const projY = a.y + t * aby;
        const dist = Math.hypot(pt.x - projX, pt.y - projY);
        if (dist < EDGE_TOL) return true;  // على الحافة → داخل
      }
    }

    if (a.y <= pt.y) {
      if (b.y > pt.y) {
        const cross = abx * (pt.y - a.y) - aby * (pt.x - a.x);
        if (cross > 0) winding++;
      }
    } else {
      if (b.y <= pt.y) {
        const cross = abx * (pt.y - a.y) - aby * (pt.x - a.x);
        if (cross < 0) winding--;
      }
    }
  }
  return winding !== 0;
}

// ✅ اختيار أفضل وجه في كل اتجاه
function findBoundingFaces(pt: Point, faces: Face[]) {
  let topFace: Face | null = null;
  let topDist = Infinity;
  let bottomFace: Face | null = null;
  let bottomDist = Infinity;
  let leftFace: Face | null = null;
  let leftDist = Infinity;
  let rightFace: Face | null = null;
  let rightDist = Infinity;

  for (const face of faces) {
    const dx = face.end.x - face.start.x;
    const dy = face.end.y - face.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-9) continue;

    // إسقاط النقطة على امتداد الوجه
    const t = ((pt.x - face.start.x) * dx + (pt.y - face.start.y) * dy) / lenSq;
    // ✅ تسامح 20% خارج المقطع (الجدران قد تمتد قليلاً)
    if (t < -0.2 || t > 1.2) continue;

    const projX = face.start.x + t * dx;
    const projY = face.start.y + t * dy;
    const vx = pt.x - projX;
    const vy = pt.y - projY;
    const dist = Math.hypot(vx, vy);
    if (dist < EDGE_TOL) continue;  // النقطة على الجدار نفسه

    if (face.isHorizontal) {
      if (vy < 0 && dist < topDist) { topDist = dist; topFace = face; }
      else if (vy > 0 && dist < bottomDist) { bottomDist = dist; bottomFace = face; }
    } else {
      if (vx < 0 && dist < leftDist) { leftDist = dist; leftFace = face; }
      else if (vx > 0 && dist < rightDist) { rightDist = dist; rightFace = face; }
    }
  }

  return { topFace, bottomFace, leftFace, rightFace };
}

export function detectRoomRegion(
  pt: Point,
  walls: Wall[],
  type: RegionType,
): RoomRegion | null {
  // ✅ استبعاد الجدران غير الصلبة (helper-line, land-boundary)
  const solidWalls = walls.filter(
    (w) => !w.kind || w.kind === 'wall' || w.kind === 'fence',
  );
  if (solidWalls.length < 3) return null;

  const faces = getAllFaces(solidWalls);
  const { topFace, bottomFace, leftFace, rightFace } = findBoundingFaces(pt, faces);

  if (!topFace || !bottomFace || !leftFace || !rightFace) return null;

  const topLeft = lineIntersectionTolerant(topFace.start, topFace.end, leftFace.start, leftFace.end);
  const topRight = lineIntersectionTolerant(topFace.start, topFace.end, rightFace.start, rightFace.end);
  const bottomRight = lineIntersectionTolerant(bottomFace.start, bottomFace.end, rightFace.start, rightFace.end);
  const bottomLeft = lineIntersectionTolerant(bottomFace.start, bottomFace.end, leftFace.start, leftFace.end);

  if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;

  const polygon = [topLeft, topRight, bottomRight, bottomLeft];

  // ✅ تحقق نهائي بـ Winding Number
  if (!pointInPolygonWinding(pt, polygon)) return null;

  // ✅ حساب المساحة (Shoelace)
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  area = Math.abs(area) / 2;

  // ✅ منع مناطق بحجم صغير جداً (< 0.5 م²)
  if (area < 0.5) return null;

  const wallIds = Array.from(new Set([
    topFace.wallId,
    bottomFace.wallId,
    leftFace.wallId,
    rightFace.wallId,
  ]));

  return {
    id: uuidv4(),
    type,
    polygon,
    area,
    wallIds,
  };
}
