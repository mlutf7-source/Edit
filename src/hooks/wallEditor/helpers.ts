import type { Point, Wall, EditType } from '../../core/types';
import { distance, closestPointOnSegment } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';

export const HANDLE = 0.2;
export const CORNER_TOL = 0.10;
export const MIN_MOVE_FOR_DRAG = 0.05;

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function cloneWall(w: Wall): Wall {
  return { ...w, start: { ...w.start }, end: { ...w.end } };
}

export function hitTestWall(pt: Point, wall: Wall): EditType {
  const dStart = distance(pt, wall.start);
  const dEnd = distance(pt, wall.end);
  if (dStart <= HANDLE) return 'extendStart';
  if (dEnd <= HANDLE) return 'extendEnd';

  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      let nearest = Infinity;
      const SEGMENTS = 48;
      for (let i = 0; i <= SEGMENTS; i++) {
        // ✅ arcSpan يحمل الإشارة — لا حاجة لـ dir منفصل
        const angle = geo.startAngle + geo.arcSpan * (i / SEGMENTS);
        const sx = geo.center.x + Math.cos(angle) * geo.radius;
        const sy = geo.center.y + Math.sin(angle) * geo.radius;
        nearest = Math.min(nearest, Math.hypot(pt.x - sx, pt.y - sy));
      }
      return nearest <= wall.thickness / 2 + HANDLE ? 'move' : 'none';
    }
  }

  const cp = closestPointOnSegment(pt, wall.start, wall.end);
  return distance(pt, cp) <= wall.thickness / 2 + HANDLE ? 'move' : 'none';
                                   }
