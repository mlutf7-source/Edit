import type { Point, Wall, EditType } from '../../core/types';
import { distance, closestPointOnSegment } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';

export const HANDLE = 0.2;
export const CORNER_TOL = 0.10;
export const MIN_MOVE_FOR_DRAG = 0.05; // 5 سم لمنع القفز عند النقر

export function sub(a: Point, b: Point): Point { 
  return { x: a.x - b.x, y: a.y - b.y }; 
  }

  export function cloneWall(w: Wall): Wall { 
    return { ...w, start: { ...w.start }, end: { ...w.end } }; 
    }

    /** ✅ فحص النقر على الجدار */
    export function hitTestWall(pt: Point, wall: Wall): EditType {
      const dStart = distance(pt, wall.start);
        const dEnd = distance(pt, wall.end);
          if (dStart <= HANDLE) return 'extendStart';
            if (dEnd <= HANDLE) return 'extendEnd';
              if (wall.curveRadius) {
                  const geometry = getCurvedWallGeometry(wall);
                      if (geometry) {
                            let nearest = Infinity;
                                  const span = geometry.anticlockwise
                                          ? geometry.startAngle - geometry.endAngle
                                                  : geometry.endAngle - geometry.startAngle;
                                                        for (let i = 0; i <= 48; i++) {
                                                                const angle = geometry.startAngle + (geometry.anticlockwise ? -1 : 1) * span * (i / 48);
                                                                        const sample = { x: geometry.center.x + Math.cos(angle) * geometry.radius, y: geometry.center.y + Math.sin(angle) * geometry.radius };
                                                                                nearest = Math.min(nearest, distance(pt, sample));
                                                                                      }
                                                                                            return nearest <= wall.thickness / 2 + HANDLE ? 'move' : 'none';
                                                                                                }
                                                                                                  }
                                                                                                    const cp = closestPointOnSegment(pt, wall.start, wall.end);
                                                                                                      return distance(pt, cp) <= wall.thickness / 2 + HANDLE ? 'move' : 'none';
                                                                                                      }