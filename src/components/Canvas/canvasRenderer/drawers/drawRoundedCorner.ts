import type { ColorTheme } from '../../../../core/colorTheme';
import type { Wall, Point } from '../../../../core/types';
import { COLORS } from '../colors';
import { computeCorner, type CornerGeom } from '../computeCorner';

function cornerWedge(
  ctx: CanvasRenderingContext2D,
  g: CornerGeom
): void {
  ctx.beginPath();
  ctx.moveTo(g.O.x, g.O.y);
  ctx.lineTo(g.tangentA.x, g.tangentA.y);
  ctx.arc(
    g.center.x,
    g.center.y,
    g.radius,
    g.startAngle,
    g.endAngle,
    g.ccw
  );
  ctx.closePath();
}

function cornerBand(
  ctx: CanvasRenderingContext2D,
  g: CornerGeom
): void {
  const {
    center: C,
    radius: R,
    innerRadius: r,
    startAngle: a,
    endAngle: b,
    ccw,
  } = g;

  ctx.beginPath();
  ctx.arc(C.x, C.y, R, a, b, ccw);

  if (r > 0) {
    ctx.arc(C.x, C.y, r, b, a, !ccw);
  } else {
    ctx.lineTo(C.x, C.y);
  }

  ctx.closePath();
}

export function drawRoundedCorner(
  ctx: CanvasRenderingContext2D,
  wallA: Wall,
  wallB: Wall,
  radiusWorld: number,
  toScreen: (p: Point) => Point,
  view: { zoom: number },
  scale: number,
  _selectedId: string | null,
  cornerId?: string,
  selectedCornerId?: string | null,
theme?: ColorTheme,
): void {
  const g = computeCorner(
    wallA,
    wallB,
    radiusWorld,
    toScreen,
    view.zoom,
    scale
  );

  if (!g) return;

  ctx.save();

  // مسح منطقة الركن المحددة فقط
  ctx.globalCompositeOperation = 'destination-out';

  cornerWedge(ctx, g);
  ctx.fill();

  // إعادة رسم الشريط المقوس
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = theme?.wallFill ?? COLORS.wall;

  cornerBand(ctx, g);
  ctx.fill();

  ctx.strokeStyle = theme?.wallBorder ?? COLORS.wall;
  ctx.lineWidth = Math.max(1.5, 4 * view.zoom);

  ctx.beginPath();
  ctx.arc(
    g.center.x,
    g.center.y,
    g.radius,
    g.startAngle,
    g.endAngle,
    g.ccw
  );
  ctx.stroke();

  // إبراز الركن المحدد
  if (cornerId && selectedCornerId === cornerId) {
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);

    ctx.beginPath();
    ctx.arc(
      g.center.x,
      g.center.y,
      g.radius,
      g.startAngle,
      g.endAngle,
      g.ccw
    );
    ctx.stroke();
  }

  ctx.restore();
}

export function drawRoundedCornerPreview(
  ctx: CanvasRenderingContext2D,
  wallA: Wall,
  wallB: Wall,
  radiusWorld: number,
  toScreen: (p: Point) => Point,
  view: { zoom: number },
  scale: number,
): void {
  const g = computeCorner(
    wallA,
    wallB,
    radiusWorld,
    toScreen,
    view.zoom,
    scale
  );

  if (!g) return;

  ctx.save();

  // المعاينة لا تمسح الجدران أو العناصر الأخرى
  ctx.fillStyle = 'rgba(255, 200, 60, 0.35)';

  cornerBand(ctx, g);
  ctx.fill();

  ctx.strokeStyle = '#ffb800';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  ctx.beginPath();
  ctx.arc(
    g.center.x,
    g.center.y,
    g.radius,
    g.startAngle,
    g.endAngle,
    g.ccw
  );
  ctx.stroke();

  ctx.restore();
}
