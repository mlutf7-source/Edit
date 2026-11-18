import React from 'react';
import type { StairElement, CanvasView } from '../../core/types';
import { worldToScreen, PX_PER_METER } from '../../core/geometry';
import type { ColorTheme } from '../../core/colorTheme';

interface Props {
  stairElements: StairElement[];
  view: CanvasView;
  width: number;
  height: number;
  scale?: number;
  theme: ColorTheme;
}


export const StairElementLayer: React.FC<Props> = React.memo(({ stairElements, view, width, height, scale = 1, theme }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);

    const toScreen = (p: { x: number; y: number }) =>
      worldToScreen(p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY);

    stairElements.forEach(el => {
      const centerScreen = toScreen(el.position);
      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(-el.rotation);

      const w = el.width * PX_PER_METER * view.zoom;
      const l = el.length * PX_PER_METER * view.zoom;
      const halfW = w / 2;
      const halfL = l / 2;

      if (el.type === 'landing') {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = theme.landingFill;
        ctx.fillRect(-halfL, -halfW, l, w);
        ctx.restore();
        ctx.strokeStyle = theme.landingBorder;
        ctx.lineWidth = Math.max(0.5, 1 * view.zoom);
        ctx.strokeRect(-halfL, -halfW, l, w);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = theme.stairFill;
        ctx.fillRect(-halfL, -halfW, l, w);
        ctx.restore();
        ctx.strokeStyle = theme.stairBorder;
        ctx.lineWidth = Math.max(0.5, 1 * view.zoom);
        ctx.strokeRect(-halfL, -halfW, l, w);

        const stepCount = el.stepCount ?? Math.max(2, Math.floor(el.length / (el.treadDepth ?? 0.27)));
        const stepPx = l / stepCount;
        ctx.strokeStyle = theme.stairLines;
        ctx.lineWidth = Math.max(0.4, 0.6 * view.zoom);
        for (let i = 1; i < stepCount; i++) {
          const x = -halfL + stepPx * i;
          ctx.beginPath();
          ctx.moveTo(x, -halfW);
          ctx.lineTo(x, halfW);
          ctx.stroke();
        }
      }
      ctx.restore();
    });



    
    
  }, [stairElements, view, width, height, scale, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});
