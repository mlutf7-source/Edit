import React from 'react';
import type { Wall, CanvasView, Point } from '../../core/types';
import { worldToScreen, PX_PER_METER } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import { COLORS } from './canvasRenderer/colors';

interface Props {
  walls: Wall[];
  wallIds: string[];
  view: CanvasView;
  width: number;
  height: number;
  scale?: number;
}

const DIM_OFFSET = 0.6;

export const CurvedDimensionLayer: React.FC<Props> = React.memo(({
  walls, wallIds, view, width, height, scale = 1,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const toScreen = (p: Point): Point => worldToScreen(
      p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY,
    );

    const dimColor = COLORS.dimension || '#00509e';
    const lineW = Math.max(0.8, 1.5 * view.zoom * scale);

    wallIds.forEach(wallId => {
      const wall = walls.find(w => w.id === wallId);
      if (!wall || !wall.curveRadius || wall.curveRadius <= 0) return;

      const geo = getCurvedWallGeometry(wall);
      if (!geo) return;

      const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
      const dir = geo.anticlockwise ? -1 : 1;
      const arcLength = Math.abs(span) * geo.radius;
      const dimR = geo.outerRadius + DIM_OFFSET;
      const startA = geo.startAngle;
      const endA = geo.startAngle + dir * span;
      const midA = (startA + endA) / 2;

      const centerS = toScreen(geo.center);
      const pxDimR = dimR * PX_PER_METER * view.zoom * scale;

      // ✅ قوس البُعد
      ctx.beginPath();
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = lineW;
      ctx.arc(centerS.x, centerS.y, pxDimR, startA, endA, geo.anticlockwise);
      ctx.stroke();

      // ✅ خطوط الامتداد
      const mkPoint = (angle: number, r: number): Point => ({
        x: geo.center.x + Math.cos(angle) * r,
        y: geo.center.y + Math.sin(angle) * r,
      });

      [startA, endA].forEach(a => {
        const p1 = toScreen(mkPoint(a, geo.outerRadius));
        const p2 = toScreen(mkPoint(a, dimR + 0.1));
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // ✅ أسهم عند الطرفين
      const drawArrow = (tip: Point, dirAlongArc: Point) => {
        const tipS = toScreen(tip);
        const arrowLen = 12;
        const arrowW = 5;
        const perp = { x: -dirAlongArc.y, y: dirAlongArc.x };
        const baseC = {
          x: tipS.x - dirAlongArc.x * arrowLen,
          y: tipS.y - dirAlongArc.y * arrowLen,
        };
        ctx.beginPath();
        ctx.moveTo(tipS.x, tipS.y);
        ctx.lineTo(baseC.x + perp.x * arrowW, baseC.y + perp.y * arrowW);
        ctx.lineTo(baseC.x - perp.x * arrowW, baseC.y - perp.y * arrowW);
        ctx.closePath();
        ctx.fillStyle = dimColor;
        ctx.fill();
      };

      const tStart = { x: -Math.sin(startA) * dir, y: Math.cos(startA) * dir };
      const tEnd = { x: -Math.sin(endA) * dir, y: Math.cos(endA) * dir };
      drawArrow(mkPoint(startA, dimR), tStart);
      drawArrow(mkPoint(endA, dimR), { x: -tEnd.x, y: -tEnd.y });

      // ✅ نص الطول في منتصف القوس
      const textPt = toScreen(mkPoint(midA, dimR + 0.4));
      const angDeg = midA * 180 / Math.PI;
      let rot = angDeg;
      if (rot > 90) rot -= 180;
      if (rot < -90) rot += 180;

      ctx.save();
      ctx.translate(textPt.x, textPt.y);
      ctx.rotate(rot * Math.PI / 180);
      ctx.fillStyle = dimColor;
      ctx.font = `${Math.max(11, 13 * view.zoom * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${arcLength.toFixed(2)} م`, 0, 0);
      ctx.restore();

      // ════════════════════════════════════════════
      // ✅ بُعد نصف القطر (من المركز إلى منتصف القوس)
      // ════════════════════════════════════════════
      const radEndPt = mkPoint(midA, geo.radius);
      const radEndS = toScreen(radEndPt);

      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.moveTo(centerS.x, centerS.y);
      ctx.lineTo(radEndS.x, radEndS.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // نقطة المركز
      ctx.beginPath();
      ctx.arc(centerS.x, centerS.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = dimColor;
      ctx.fill();

      // نص R
      const rTextPt = {
        x: (centerS.x + radEndS.x) / 2,
        y: (centerS.y + radEndS.y) / 2,
      };
      ctx.fillStyle = dimColor;
      ctx.font = `${Math.max(11, 13 * view.zoom * scale)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`R = ${geo.radius.toFixed(2)} م`, rTextPt.x + 8, rTextPt.y - 8);

      // ════════════════════════════════════════════
      // ✅ بُعد القطر (⌀) — يُكتب في المركز
      // ════════════════════════════════════════════
      ctx.fillStyle = dimColor;
      ctx.font = `${Math.max(11, 13 * view.zoom * scale)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`⌀ ${(geo.radius * 2).toFixed(2)} م`, centerS.x + 10, centerS.y + 6);
    });
  }, [walls, wallIds, view, width, height, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});
