import React from 'react';
import type { Wall, Point } from '../../core/types';
import { PX_PER_METER, wallRectangle } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import { COLORS } from './canvasRenderer/colors';

interface Props {
  worldPt: Point;
  walls: Wall[];
  /** ✅ الجدار المؤقت — يدعم الآن المستقيم والمنحني */
  tempWall: {
    start: Point;
    end: Point;
    thickness?: number;
    normalSign?: 1 | -1;
    curveRadius?: number;
    curveSide?: 1 | -1;
  } | null;
  excludeWallId?: string | null;
}

const LOUPE_SIZE = 110;
const LOUPE_ZOOM = 1.4;

/** ✅ رسم جدار (مستقيم أو منحني) — يحترم طريقة wallRectangle غير المتماثلة */
function drawWallInLoupe(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  fillStyle: string,
) {
  if (wall.curveRadius && wall.curveRadius > 0) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(
        geo.center.x,
        geo.center.y,
        geo.outerRadius,
        geo.startAngle,
        geo.endAngle,
        geo.anticlockwise,
      );
      ctx.arc(
        geo.center.x,
        geo.center.y,
        geo.innerRadius,
        geo.endAngle,
        geo.startAngle,
        !geo.anticlockwise,
      );
      ctx.closePath();
      ctx.fill();
      return;
    }
  }

  // ✅ الجدار المستقيم (باستخدام wallRectangle الأصلي — بدون تغيير)
  const corners = wallRectangle(wall).corners;
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.fill();
}

export const DrawingLoupe: React.FC<Props> = ({ worldPt, walls, tempWall, excludeWallId }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = LOUPE_SIZE;
    canvas.height = LOUPE_SIZE;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

    const s = PX_PER_METER * LOUPE_ZOOM;
    ctx.setTransform(
      s, 0, 0, s,
      LOUPE_SIZE / 2 - worldPt.x * s,
      LOUPE_SIZE / 2 - worldPt.y * s,
    );

    // ✅ الجدران الموجودة (مع دعم المنحنيات)
    for (const w of walls) {
      if (w.kind && w.kind !== 'wall') continue;
      if (excludeWallId && w.id === excludeWallId) continue;
      drawWallInLoupe(ctx, w, COLORS.wall);
    }

    // ✅ الجدار المؤقت (مع دعم المنحنيات)
    if (tempWall) {
      const fakeWall: Wall = {
        id: 'loupe-temp',
        start: tempWall.start,
        end: tempWall.end,
        thickness: tempWall.thickness ?? 0.3,
        type: 'exterior',
        normalSign: tempWall.normalSign ?? 1,
        lockDirection: false,
        lockLength: false,
        lockMove: false,
        curveRadius: tempWall.curveRadius,
        curveSide: tempWall.curveSide,
      };
      drawWallInLoupe(ctx, fakeWall, 'rgba(0, 80, 158, 0.35)');
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // ✅ تقاطع مركزي
    ctx.strokeStyle = 'rgba(200, 0, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LOUPE_SIZE / 2 - 8, LOUPE_SIZE / 2);
    ctx.lineTo(LOUPE_SIZE / 2 - 3, LOUPE_SIZE / 2);
    ctx.moveTo(LOUPE_SIZE / 2 + 3, LOUPE_SIZE / 2);
    ctx.lineTo(LOUPE_SIZE / 2 + 8, LOUPE_SIZE / 2);
    ctx.moveTo(LOUPE_SIZE / 2, LOUPE_SIZE / 2 - 8);
    ctx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE / 2 - 3);
    ctx.moveTo(LOUPE_SIZE / 2, LOUPE_SIZE / 2 + 3);
    ctx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE / 2 + 8);
    ctx.stroke();

    // ✅ إطار العدسة
    ctx.strokeStyle = '#00509e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, LOUPE_SIZE - 2, LOUPE_SIZE - 2);
  }, [worldPt, walls, tempWall, excludeWallId]);

  return (
    <canvas
      ref={canvasRef}
      width={LOUPE_SIZE}
      height={LOUPE_SIZE}
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        flexShrink: 0,
      }}
    />
  );
};
