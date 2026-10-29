import type { Point, Wall } from './types';

export interface CurvedWallGeometry {
  center: Point;
  radius: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
}

export function getCurvedWallGeometry(wall: Wall): CurvedWallGeometry | null {
  if (!wall.curveRadius || wall.curveRadius <= 0) return null;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const chord = Math.hypot(dx, dy);

  // ✅ curveRadius = نصف قطر الحافة الخارجية
  // (الحافة الخارجية تمر بـ wall.start / wall.end بالضبط)
  const outerR = wall.curveRadius;
  if (chord <= 0 || outerR <= chord / 2) return null;

  const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  const nx = -dy / chord;
  const ny = dx / chord;
  const offset = Math.sqrt(outerR * outerR - (chord / 2) ** 2);
  const side = wall.curveSide ?? 1;
  const center = { x: mid.x - nx * offset * side, y: mid.y - ny * offset * side };

  // ✅ نصف القطر الثلاثة:
  //   outerRadius  = wall.curveRadius           (الحافة الخارجية = wall.start)
  //   radius       = outerR - thickness/2       (خط المنتصف)
  //   innerRadius  = outerR - thickness         (الحافة الداخلية)
  const radius = Math.max(0.01, outerR - wall.thickness / 2);
  const innerRadius = Math.max(0.01, outerR - wall.thickness);

  return {
    center,
    radius,
    innerRadius,
    outerRadius: outerR,
    startAngle: Math.atan2(wall.start.y - center.y, wall.start.x - center.x),
    endAngle: Math.atan2(wall.end.y - center.y, wall.end.x - center.x),
    anticlockwise: side === 1,
  };
}

export function pointOnCurvedWall(wall: Wall, point: Point): Point | null {
  const geometry = getCurvedWallGeometry(wall);
  if (!geometry) return null;
  const angle = Math.atan2(point.y - geometry.center.y, point.x - geometry.center.x);
  const radius = Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y);
  const clampedRadius = Math.min(geometry.outerRadius, Math.max(geometry.innerRadius, radius));
  return {
    x: geometry.center.x + Math.cos(angle) * clampedRadius,
    y: geometry.center.y + Math.sin(angle) * clampedRadius,
  };
}
/** ✅ طول الجدار (قوس حقيقي للمنحني، خط مستقيم للمستقيم) */
export function getWallActualLength(wall: Wall): number {
  if (!wall.curveRadius || wall.curveRadius <= 0) {
    return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  }
  const geo = getCurvedWallGeometry(wall);
  if (!geo) return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
  // ✅ طول القوس الخارجي = curveRadius × |Δθ|
  return Math.abs(span) * geo.outerRadius;
}
