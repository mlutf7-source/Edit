import type { Point, Wall } from './types';

export interface CurvedWallGeometry {
  center: Point;
  radius: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
  /** ✅ اتجاه القوس الفعلي المُطبَّع في (-π, π] */
  arcSpan: number;
}

export function getCurvedWallGeometry(wall: Wall): CurvedWallGeometry | null {
  if (!wall.curveRadius || wall.curveRadius <= 0) return null;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const chord = Math.hypot(dx, dy);

  const outerR = wall.curveRadius;
  if (chord <= 0 || outerR <= chord / 2) return null;

  const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  const nx = -dy / chord;
  const ny = dx / chord;
  const offset = Math.sqrt(outerR * outerR - (chord / 2) ** 2);
  const side = wall.curveSide ?? 1;
  const center = { x: mid.x - nx * offset * side, y: mid.y - ny * offset * side };

  const radius = Math.max(0.01, outerR - wall.thickness / 2);
  const innerRadius = Math.max(0.01, outerR - wall.thickness);

  const startAngle = Math.atan2(wall.start.y - center.y, wall.start.x - center.x);
  const endAngle = Math.atan2(wall.end.y - center.y, wall.end.x - center.x);

  // ✅ تطبيع span إلى (-π, π] — هذا هو الاتجاه الفعلي للقوس
  let arcSpan = endAngle - startAngle;
  while (arcSpan > Math.PI) arcSpan -= 2 * Math.PI;
  while (arcSpan <= -Math.PI) arcSpan += 2 * Math.PI;

  return {
    center,
    radius,
    innerRadius,
    outerRadius: outerR,
    startAngle,
    endAngle,
    // ⚠️ ملاحظة: anticlockwise هنا بمعنى "مركز الجدار على يمين الاتجاه"
    // وليس "الرسم عكس عقارب الساعة رياضياً". استخدم arcSpan للتحويل الرياضي الصحيح.
    anticlockwise: side === 1,
    arcSpan,
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
  return Math.abs(geo.arcSpan) * geo.outerRadius;
      }
