
import type { Wall, Point } from '../../../../core/types';
import type { ColorTheme } from '../../../../core/colorTheme';
import { DEFAULT_COLOR_THEME } from '../../../../core/colorTheme';
import {
  computeCorner,
  type CornerGeom,
} from '../computeCorner';

function drawOuterArc(
  ctx: CanvasRenderingContext2D,
  g: CornerGeom
): void {
  ctx.beginPath();
  ctx.arc(
    g.center.x,
    g.center.y,
    g.radius,
    g.startAngle,
    g.endAngle,
    g.ccw
  );
}

function drawInnerArc(
  ctx: CanvasRenderingContext2D,
  g: CornerGeom
): void {
  if (g.innerRadius <= 0) return;

  ctx.beginPath();
  ctx.arc(
    g.center.x,
    g.center.y,
    g.innerRadius,
    g.startAngle,
    g.endAngle,
    g.ccw
  );
}

function drawBandPath(
  ctx: CanvasRenderingContext2D,
  g: CornerGeom
): void {
  ctx.beginPath();

  ctx.arc(
    g.center.x,
    g.center.y,
    g.radius,
    g.startAngle,
    g.endAngle,
    g.ccw
  );

  if (g.innerRadius > 0) {
    ctx.arc(
      g.center.x,
      g.center.y,
      g.innerRadius,
      g.endAngle,
      g.startAngle,
      !g.ccw
    );
  } else {
    ctx.lineTo(
      g.center.x,
      g.center.y
    );
  }

  ctx.closePath();
}

function drawCornerCutout(
  ctx: CanvasRenderingContext2D,
  g: CornerGeom
): void {
  ctx.beginPath();
  ctx.moveTo(g.O.x, g.O.y);
  ctx.lineTo(
    g.tangentA.x,
    g.tangentA.y
  );

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
  theme: ColorTheme = DEFAULT_COLOR_THEME
): void {
  const g = computeCorner(
    wallA,
    wallB,
    radiusWorld,
    toScreen,
    view.zoom,
    scale
  );

  if (
    !g ||
    !Number.isFinite(g.radius) ||
    !Number.isFinite(g.innerRadius) ||
    g.radius <= 0 ||
    g.innerRadius < 0 ||
    g.innerRadius >= g.radius
  ) {
    return;
  }

  ctx.save();

  // إزالة الجزء الحاد عند التقاء الجدارين.
  ctx.globalCompositeOperation =
    'destination-out';

  drawCornerCutout(ctx, g);
  ctx.fill();
  
  // إزالة خطي الحافة الخارجية القديمة
  // بين رأس الزاوية ونقطتي تماس القوس.
  ctx.beginPath();

  ctx.moveTo(g.O.x, g.O.y);
  ctx.lineTo(g.tangentA.x, g.tangentA.y);

  ctx.moveTo(g.O.x, g.O.y);
  ctx.lineTo(g.tangentB.x, g.tangentB.y);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  ctx.setLineDash([]);
  ctx.stroke();
  

  // إعادة الرسم بالألوان المحددة للجدران.
  ctx.globalCompositeOperation =
    'source-over';

  ctx.fillStyle = theme.wallFill;

  drawBandPath(ctx, g);
  ctx.fill();

  // رسم الحافة الخارجية.
  ctx.strokeStyle = theme.wallBorder;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  drawOuterArc(ctx, g);
  ctx.stroke();

  // رسم الحافة الداخلية بنفس اللون والسماكة.
  if (g.innerRadius > 0) {
    drawInnerArc(ctx, g);
    ctx.stroke();
  }

  // إبراز القوس عند تحديده.
  if (
    cornerId &&
    selectedCornerId === cornerId
  ) {
    ctx.save();

    ctx.strokeStyle = theme.selection;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    drawOuterArc(ctx, g);
    ctx.stroke();

    ctx.restore();
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
  scale: number
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

  // المعاينة لا تمسح أي جزء من اللوحة.
  ctx.globalCompositeOperation =
    'source-over';

  ctx.fillStyle =
    'rgba(255, 200, 60, 0.35)';

  drawBandPath(ctx, g);
  ctx.fill();

  ctx.strokeStyle = '#ffb800';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  drawOuterArc(ctx, g);
  ctx.stroke();

  if (g.innerRadius > 0) {
    drawInnerArc(ctx, g);
    ctx.stroke();
  }

  ctx.restore();
}
