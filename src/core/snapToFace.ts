
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

  let delta =
    ((dir * (angle - geo.startAngle)) % TWO_PI + TWO_PI) %
    TWO_PI;

  if (delta > span) {
    const start = {
      x: geo.center.x + Math.cos(geo.startAngle) * radius,
      y: geo.center.y + Math.sin(geo.startAngle) * radius,
    };

    const end = {
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

function snapCurvedWall(
  pt: Point,
  wall: Wall,
  bestCorner: SnapResult | null,
  bestCornerDist: number,
  bestFace: SnapResult | null,
  bestFaceDist: number,
) {
  const geo = getCurvedWallGeometry(wall);

  if (!geo) {
    return {
      bestCorner,
      bestCornerDist,
      bestFace,
      bestFaceDist,
    };
  }

  const dir = geo.anticlockwise ? -1 : 1;
  const span = getArcSpan(
    geo.startAngle,
    geo.endAngle,
    dir,
  );

  const outerPts: Point[] = [];
  const innerPts: Point[] = [];
  const midPts: Point[] = [];

  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const angle =
      geo.startAngle + dir * span * (i / ARC_SEGMENTS);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    outerPts.push({
      x: geo.center.x + cos * geo.outerRadius,
      y: geo.center.y + sin * geo.outerRadius,
    });

    innerPts.push({
      x: geo.center.x + cos * geo.innerRadius,
      y: geo.center.y + sin * geo.innerRadius,
    });

    midPts.push({
      x: geo.center.x + cos * geo.radius,
      y: geo.center.y + sin * geo.radius,
    });
  }

  // نقاط بداية ونهاية الأقواس والمقابض
  const cornerPts = [
    outerPts[0],
    outerPts[ARC_SEGMENTS],
    innerPts[0],
    innerPts[ARC_SEGMENTS],
    midPts[0],
    midPts[ARC_SEGMENTS],
    wall.start,
    wall.end,
  ];

  for (const corner of cornerPts) {
    const d = distance(pt, corner);

    if (d <= bestCornerDist) {
      bestCornerDist = d;
      bestCorner = {
        point: corner,
        type: 'corner',
        wallId: wall.id,
        distance: d,
      };
    }
  }

  // الالتصاق الدقيق بالأقواس الخارجية والداخلية وخط المنتصف
  for (const radius of [
    geo.outerRadius,
    geo.innerRadius,
    geo.radius,
  ]) {
    const cp = closestPointOnArc(pt, wall, radius);
    if (!cp) continue;

    const d = distance(pt, cp);

    if (d <= bestFaceDist) {
      bestFaceDist = d;
      bestFace = {
        point: cp,
        type: 'face',
        wallId: wall.id,
        distance: d,
      };
    }
  }

  return {
    bestCorner,
    bestCornerDist,
    bestFace,
    bestFaceDist,
  };
}

export function findSnapToFace(
  pt: Point,
  walls: Wall[],
  excludeId?: string,
  threshold?: number,
): SnapResult | null {
  let bestCorner: SnapResult | null = null;
  let bestCornerDist = CORNER_SNAP;

  let bestFace: SnapResult | null = null;
  let bestFaceDist = threshold ?? FACE_SNAP;

  for (const wall of walls) {
    if (wall.id === excludeId) continue;

    if (wall.curveRadius) {
      const result = snapCurvedWall(
        pt,
        wall,
        bestCorner,
        bestCornerDist,
        bestFace,
        bestFaceDist,
      );

      bestCorner = result.bestCorner;
      bestCornerDist = result.bestCornerDist;
      bestFace = result.bestFace;
      bestFaceDist = result.bestFaceDist;

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

    // زوايا الجدار ونقاط المنتصف والمقابض
    const snapPoints = [
      ...rect.corners,
      midStart,
      midEnd,
      wall.start,
      wall.end,
    ];

    for (const corner of snapPoints) {
      const d = distance(pt, corner);

      if (d <= bestCornerDist) {
        bestCornerDist = d;
        bestCorner = {
          point: corner,
          type: 'corner',
          wallId: wall.id,
          distance: d,
        };
      }
    }

    // الالتصاق بوجوه الجدار
    for (const face of rect.faces) {
      const cp = closestPointOnSegment(
        pt,
        face.start,
        face.end,
      );

      const d = distance(pt, cp);

      if (d <= bestFaceDist) {
        bestFaceDist = d;
        bestFace = {
          point: cp,
          type: 'face',
          wallId: wall.id,
          distance: d,
        };
      }
    }

    // الالتصاق بخط المنتصف
    const cpMid = closestPointOnSegment(
      pt,
      midStart,
      midEnd,
    );

    const dMid = distance(pt, cpMid);

    if (dMid <= bestFaceDist) {
      bestFaceDist = dMid;
      bestFace = {
        point: cpMid,
        type: 'face',
        wallId: wall.id,
        distance: dMid,
      };
    }
  }

  if (!bestCorner) return bestFace;
  if (!bestFace) return bestCorner;

  return bestCorner.distance <= bestFace.distance
    ? bestCorner
    : bestFace;
  }
