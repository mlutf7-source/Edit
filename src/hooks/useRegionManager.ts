import React from 'react';
import type { CanvasView } from '../../core/types';
import type { RoomRegion, RegionType } from '../../core/regionTypes';
import { worldToScreen } from '../../core/geometry';
import type { ColorTheme } from '../../core/colorTheme';

interface Props {
  regions: RoomRegion[];
  view: CanvasView;
  width: number;
  height: number;
  scale?: number;
  theme: ColorTheme;
}

export const RegionLayer: React.FC<Props> = React.memo(({ regions, view, width, height, scale = 1, theme }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);

    // ✅ دالة اختيار اللون حسب نوع المنطقة
    const getRegionColor = (type: RegionType): string => {
      switch (type) {
        case 'kitchen': return theme.kitchenFill;
        case 'bathroom': return theme.bathroomFill;
        case 'room': return theme.roomFill;
        case 'hall': return theme.hallFill;
        default: return theme.bathroomFill;
      }
    };

    regions.forEach(region => {
      if (region.polygon.length < 3) return;
      const screenPoints = region.polygon.map(p =>
        worldToScreen(p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY)
      );
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = getRegionColor(region.type);
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }, [regions, view, width, height, scale, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});
