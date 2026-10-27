
import type { Point, Wall, SnapResult } from './types';
import {
  distance,
  closestPointOnSegment,
  wallRectangle,
} from './geometry';
import { getCurvedWallGeometry } from './curvedWallGeometry';

const CORNER_SNAP = 0.05;
const FACE_SNAP = 0.05;
const ARC_SEGMENTS = 24;
const TWO_PI = 2 * Math.PI;

function getArcSpan(
  startAngle: number,
  endAngle: number,
  dir: number,
): number {
  return (
    ((dir * (endAngle - startAngle)) % TWO_PI + TWO_PI) %
    TWO_PI
  );
}

function closestPointOnArc(
  pt: Point,
  wall: Wall,
  radius: number,
): Point | null {
  const geo = getCurvedWallGeometry(wall);
  if (!geo) return null;

  const angle = Math.atan2(
    pt.y - geo.center.y,
    pt.x - geo.center.x,
  );

  const dir = geo.anticlockwise ? -1 : 1;
  const span = getArcSpan(
    geo.startAngle,
    geo.endAngle,
    dir,
  );

  const delta =
    ((dir * (angle - geo.startAngle)) % TWO_PI + TWO_PI) %
    TWO_PI;

  if (delta > span) {
    const start: Point = {
      x: geo.center.x + Math.cos(geo.startAngle) * radius,
      y: geo.center.y + Math.sin(geo.startAngle) * radius,
    };

    const end: Point = {
      x: geo.center.x + Math.cos(geo.endAngle) * radius,
      y: geo.center.y + Math.sin(geo.endAngle) * radius,
    };

    return distance(pt, start) <= distance(pt, end)
      ? start
      : end;
  }

  return {
    x: geo.center.x + Math.cos(angle) * radius,
    y: geo.center.y + Math.sin(angle) * radius,
  };
}

function makeSnapResult(
  point: Point,
  wall: Wall,
  type: 'corner' | 'face',
  source: Point,
): SnapResult {
  return {
    point,
    type,
    wallId: wall.id,
    distance: distance(source, point),
  };
}

/**
 * يجمع أهداف الالتصاق القريبة على جدار منحني.
 * تُحسب نقاط الأقواس من هندستها الحقيقية، لا من مستطيل إحاطة.
 */
function getCurvedSnapCandidates(
  pt: Point,
  wall: Wall,
  threshold: number,
): SnapResult[] {
  const geo = getCurvedWallGeometry(wall);
  if (!geo) return [];

  const dir = geo.anticlockwise ? -1 : 1;
  const span = getArcSpan(
    geo.startAngle,
    geo.endAngle,
    dir,
  );

  const results: SnapResult[] = [];

  const add = (
    point: Point,
    type: 'corner' | 'face',
  ) => {
    const d = distance(pt, point);
    if (d <= threshold) {
      results.push({
        point,
        type,
        wallId: wall.id,
        distance: d,
      });
    }
  };

  // مقابض الجدار الأصلية.
  add(wall.start, 'corner');
  add(wall.end, 'corner');

  const radii = [
    geo.outerRadius,
    geo.innerRadius,
    geo.radius,
  ];

  // نهايات الأقواس الخارجية والداخلية وخط المنتصف.
  for (const radius of radii) {
    for (const angle of [
      geo.startAngle,
      geo.startAngle + dir * span,
    ]) {
      add(
        {
          x: geo.center.x + Math.cos(angle) * radius,
          y: geo.center.y + Math.sin(angle) * radius,
        },
        'corner',
      );
    }

    const projected = closestPointOnArc(pt, wall, radius);
    if (projected) add(projected, 'face');
  }

  // نقاط موزعة على الأقواس لتوفير أهداف إضافية.
  for (let i = 1; i < ARC_SEGMENTS; i++) {
    const angle =
      geo.startAngle + dir * span * (i / ARC_SEGMENTS);

    for (const radius of radii) {
      add(
        {
          x: geo.center.x + Math.cos(angle) * radius,
          y: geo.center.y + Math.sin(angle) * radius,
        },
        'face',
      );
    }
  }

  return results;
}

/**
 * يجمع أهداف الالتصاق القريبة على جدار مستقيم.
 */
function getStraightSnapCandidates(
  pt: Point,
  wall: Wall,
  threshold: number,
): SnapResult[] {
  const rect = wallRectangle(wall);
  const results: SnapResult[] = [];

  const add = (
    point: Point,
    type: 'corner' | 'face',
  ) => {
    const d = distance(pt, point);
    if (d <= threshold) {
      results.push({
        point,
        type,
        wallId: wall.id,
        distance: d,
      });
    }
  };

  // الزوايا الأربع ومقابض البداية والنهاية.
  for (const corner of rect.corners) {
    add(corner, 'corner');
  }

  add(wall.start, 'corner');
  add(wall.end, 'corner');

  // منتصف كل وجه.
  const midStart: Point = {
    x: (rect.corners[0].x + rect.corners[3].x) / 2,
    y: (rect.corners[0].y + rect.corners[3].y) / 2,
  };

  const midEnd: Point = {
    x: (rect.corners[1].x + rect.corners[2].x) / 2,
    y: (rect.corners[1].y + rect.corners[2].y) / 2,
  };

  add(midStart, 'corner');
  add(midEnd, 'corner');

  // الإسقاط الدقيق على كل وجه.
  for (const face of rect.faces) {
    const projected = closestPointOnSegment(
      pt,
      face.start,
      face.end,
    );
    add(projected, 'face');
  }

  // الإسقاط على خط المنتصف.
  add(
    closestPointOnSegment(pt, midStart, midEnd),
    'face',
  );

  return results;
}

/**
 * يعيد جميع مرشحي الالتصاق ضمن المسافة المحددة.
 * يمكن استخدامه لفحص نقاط متعددة من الجدار المتحرك.
 */
export function findSnapCandidates(
  pt: Point,
  walls: Wall[],
  excludeIds: string[] = [],
  threshold = FACE_SNAP,
): SnapResult[] {
  const excluded = new Set(excludeIds);
  const results: SnapResult[] = [];

  for (const wall of walls) {
    if (excluded.has(wall.id)) continue;

    const candidates = wall.curveRadius
      ? getCurvedSnapCandidates(pt, wall, threshold)
      : getStraightSnapCandidates(pt, wall, threshold);

    results.push(...candidates);
  }

  // الأقرب أولًا، مع إزالة الأهداف المتطابقة.
  results.sort((a, b) => a.distance - b.distance);

  return results.filter((candidate, index, all) =>
    all.findIndex(other =>
      other.wallId === candidate.wallId &&
      other.type === candidate.type &&
      distance(other.point, candidate.point) < 0.0001
    ) === index
  );
}

/**
 * يعيد أفضل هدف واحد؛ أبقيناها للتوافق مع الاستدعاءات الحالية.
 */
export function findSnapToFace(
  pt: Point,
  walls: Wall[],
  excludeId?: string,
  threshold?: number,
): SnapResult | null {
  let bestCorner: SnapResult | null = null;
  let bestFace: SnapResult | null = null;

  const cornerThreshold = CORNER_SNAP;
  const faceThreshold = threshold ?? FACE_SNAP;

  for (const wall of walls) {
    if (wall.id === excludeId) continue;

    const candidates = wall.curveRadius
      ? getCurvedSnapCandidates(
          pt,
          wall,
          Math.max(cornerThreshold, faceThreshold),
        )
      : getStraightSnapCandidates(
          pt,
          wall,
          Math.max(cornerThreshold, faceThreshold),
        );

    for (const candidate of candidates) {
      const limit =
        candidate.type === 'corner'
          ? cornerThreshold
          : faceThreshold;

      if (candidate.distance > limit) continue;

      if (candidate.type === 'corner') {
        if (
          !bestCorner ||
          candidate.distance < bestCorner.distance
        ) {
          bestCorner = candidate;
        }
      } else if (
        !bestFace ||
        candidate.distance < bestFace.distance
      ) {
        bestFace = candidate;
      }
    }
  }

  if (!bestCorner) return bestFace;
  if (!bestFace) return bestCorner;

  return bestCorner.distance <= bestFace.distance
    ? bestCorner
    : bestFace;
}

/**
 * يعيد أفضل هدف على كل جدار مستهدف.
 * أبقيناها للتوافق مع الكود الذي يستخدم هذه الدالة.
 */
export function findAllSnapTargets(
  pt: Point,
  walls: Wall[],
  excludeIds: string[] = [],
  threshold = FACE_SNAP,
): SnapResult[] {
  const excluded = new Set(excludeIds);
  const results: SnapResult[] = [];

  for (const wall of walls) {
    if (excluded.has(wall.id)) continue;

    const candidates = findSnapCandidates(
      pt,
      [wall],
      [],
      threshold,
    );

    if (candidates.length > 0) {
      results.push(candidates[0]);
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
    }
  
