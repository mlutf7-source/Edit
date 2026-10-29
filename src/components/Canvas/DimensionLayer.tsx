import React from 'react';
import type { CanvasView, Point } from '../../core/types';
import type { Dimension } from '../../core/dimensionTypes';
import { worldToScreen, distance, getAngle, PX_PER_METER } from '../../core/geometry';

interface Props {
  dimensions: Dimension[];
  view: CanvasView;
  width: number;
  height: number;
  fontSize: number;
  selectedId?: string | null;
  scale?: number;
}

// ✅ يحوّل زاوية العالم إلى زاوية نص مقروءة (بين -90 و 90)
function readableAngleRad(angleRad: number): number {
  let deg = angleRad * 180 / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return deg * Math.PI / 180;
}

// ✅ يبني نقاط القوس (start, end, mid) بمعايير موحّدة
function computeArcParams(dim: Dimension): {
  startA: number;
  drawEndA: number;
  midA: number;
  span: number;
  acw: boolean;
} | null {
  if (
    !dim.curveCenter ||
    dim.curveRadius == null ||
    dim.curveStartAngle == null ||
    dim.curveEndAngle == null
  ) return null;

  const acw = dim.curveAnticlockwise ?? false;
  const startA = dim.curveStartAngle;
  const storedEndA = dim.curveEndAngle;

  // حساب span موجب دائماً
  let span = acw ? startA - storedEndA : storedEndA - startA;
  while (span < 0) span += 2 * Math.PI;
  while (span > 2 * Math.PI) span -= 2 * Math.PI;

  const dir = acw ? -1 : 1;
  const drawEndA = startA + dir * span;
  const midA = startA + dir * (span / 2);

  return { startA, drawEndA, midA, span, acw };
}

export const DimensionLayer: React.FC<Props> = React.memo(
  ({ dimensions, view, width, height, fontSize, selectedId, scale = 1 }) => {
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

      const dimFontSize = Math.max(8, fontSize * view.zoom);

      const toScreen = (p: Point) =>
        worldToScreen(p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY);

      dimensions.forEach(dim => {
        const isSelected = selectedId === dim.id;
        const kind = dim.kind || 'linear';

        // ═══════════════════════════════════════════════════
        // ✅ 1) بُعد طول القوس (kind = 'arc')
        // ═══════════════════════════════════════════════════
        if (kind === 'arc') {
          const params = computeArcParams(dim);
          if (!params || !dim.curveCenter) return;

          const center = dim.curveCenter;
          const outerR = dim.curveOuterRadius ?? dim.curveRadius ?? 0;
          const dimR = outerR + dim.offset;
          const centerS = toScreen(center);
          const pxDimR = dimR * PX_PER_METER * view.zoom;

          ctx.strokeStyle = isSelected ? '#0a0' : '#0066cc';
          ctx.lineWidth = isSelected ? 1.2 : 0.7;

          // 1.1 — قوس البُعد
          ctx.beginPath();
          ctx.arc(centerS.x, centerS.y, pxDimR, params.startA, params.drawEndA, params.acw);
          ctx.stroke();

          // 1.2 — خطوط الامتداد (من الحافة الخارجية إلى قوس البُعد)
          const mkPt = (angle: number, r: number): Point => ({
            x: center.x + Math.cos(angle) * r,
            y: center.y + Math.sin(angle) * r,
          });
          [params.startA, params.drawEndA].forEach(a => {
            const p1 = toScreen(mkPt(a, outerR));
            const p2 = toScreen(mkPt(a, dimR + 0.15));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          });

          // 1.3 — النص (طول القوس)
          const arcLen = params.span * (dim.curveRadius ?? 0);
          const textPt = toScreen(mkPt(params.midA, dimR + 0.25));
          const rot = readableAngleRad(params.midA);

          ctx.save();
          ctx.translate(textPt.x, textPt.y);
          ctx.rotate(rot);
          ctx.fillStyle = '#0066cc';
          ctx.font = `bold ${dimFontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(arcLen.toFixed(2), 0, 0);
          ctx.restore();

          // 1.4 — مقبض السحب عند التحديد
          if (isSelected) {
            ctx.fillStyle = '#06f';
            ctx.fillRect(textPt.x - 6, textPt.y - 6, 12, 12);
          }
          return;
        }

        // ═══════════════════════════════════════════════════
        // ✅ 2) بُعد نصف القطر (kind = 'radius')
        // ═══════════════════════════════════════════════════
        if (kind === 'radius') {
  if (!dim.curveCenter) return;
  
  // ✅ نستخدم dim.end (القابل للسحب) بدل midA المحسوب
  const center = dim.curveCenter;
  const r = dim.curveRadius ?? 0;
  const centerS = toScreen(center);
  const edgeS = toScreen(dim.end);

  ctx.strokeStyle = isSelected ? '#0a0' : '#0066cc';
  ctx.lineWidth = isSelected ? 1.2 : 0.7;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(centerS.x, centerS.y);
  ctx.lineTo(edgeS.x, edgeS.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // نقطة المركز
  ctx.fillStyle = '#0066cc';
  ctx.beginPath();
  ctx.arc(centerS.x, centerS.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // النص R=
  const textPt = {
    x: (centerS.x + edgeS.x) / 2,
    y: (centerS.y + edgeS.y) / 2,
  };
  ctx.font = `bold ${dimFontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0066cc';
  ctx.fillText(`R=${r.toFixed(2)}`, textPt.x + 10, textPt.y - 10);

  if (isSelected) {
    // ✅ مقبض المركز (ثابت — فقط للعرض)
    ctx.fillStyle = '#888';
    ctx.fillRect(centerS.x - 5, centerS.y - 5, 10, 10);
    // ✅ مقبض نقطة النهاية (قابل للسحب)
    ctx.fillStyle = '#06f';
    ctx.fillRect(edgeS.x - 6, edgeS.y - 6, 12, 12);
  }
  return;
        }

        // ═══════════════════════════════════════════════════
        // ✅ 3) بُعد خطي (linear) — السلوك الأصلي (بدون تغيير)
        // ═══════════════════════════════════════════════════
        const angle = getAngle(dim.start, dim.end);
        const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
        const startWorld = {
          x: dim.start.x + normal.x * dim.offset,
          y: dim.start.y + normal.y * dim.offset,
        };
        const endWorld = {
          x: dim.end.x + normal.x * dim.offset,
          y: dim.end.y + normal.y * dim.offset,
        };
        const s = toScreen(startWorld);
        const e = toScreen(endWorld);

        ctx.strokeStyle = isSelected ? '#0a0' : '#cccccc';
        ctx.lineWidth = 0.5;

        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
        const text = distance(dim.start, dim.end).toFixed(2);

        ctx.font = `bold ${dimFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(text).width;

        const stop1 = {
          x: mid.x - ux * (textWidth / 2 + 4),
          y: mid.y - uy * (textWidth / 2 + 4),
        };
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(stop1.x, stop1.y);
        ctx.stroke();

        const stop2 = {
          x: mid.x + ux * (textWidth / 2 + 4),
          y: mid.y + uy * (textWidth / 2 + 4),
        };
        ctx.beginPath();
        ctx.moveTo(stop2.x, stop2.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();

        ctx.fillStyle = '#0066cc';
        ctx.fillText(text, mid.x, mid.y);

        if (isSelected) {
          ctx.fillStyle = '#06f';
          [s, e].forEach(p => ctx.fillRect(p.x - 6, p.y - 6, 12, 12));
        }
      });
    }, [dimensions, view, width, height, fontSize, selectedId, scale]);

    return (
      <canvas
        ref={canvasRef}
        width={width * scale}
        height={height * scale}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
      />
    );
  }
);
