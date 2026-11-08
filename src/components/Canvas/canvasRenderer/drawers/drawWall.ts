import type { Wall, Point } from '../../../../core/types';
import { distance, wallRectangle, PX_PER_METER } from '../../../../core/geometry';
import { getCurvedWallGeometry } from '../../../../core/curvedWallGeometry';
import type { ColorTheme } from '../../../../core/colorTheme';

export function drawWall(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  selected: boolean,
  ghost: boolean,
  roundCornerFirstWallId: string | null,
  toScreen: (p: Point) => Point,
  view: { zoom: number },
  scale: number,
  theme: ColorTheme,
  renderMode: 'border' | 'fill' | 'both' = 'both'
): void {
  const isBoundary = wall.kind === 'land-boundary';
  const isHelper = wall.kind === 'helper-line';
  
  if (ghost) { 
    ctx.save(); 
    ctx.globalAlpha = 0.3; 
  }

  // ✅ لون التحديد موحّد لكل العناصر (theme.selection)
  let color = ghost ? '#999' : selected ? theme.selection : theme.wallFill;
  if (isBoundary) color = selected ? theme.selection : theme.landBoundaryFill;
  else if (isHelper) color = selected ? theme.selection : theme.helperLineFill;
  if (roundCornerFirstWallId === wall.id) color = theme.roundCornerFirstFill;

  if (wall.curveRadius) {
    const geometry = getCurvedWallGeometry(wall);
    if (geometry) {
      const c = toScreen(geometry.center);
      const start = toScreen(wall.start);
      const end = toScreen(wall.end);
      const outerRadius = geometry.outerRadius * PX_PER_METER * view.zoom;
      const innerRadius = geometry.innerRadius * PX_PER_METER * view.zoom;
      
      if (renderMode === 'border' || renderMode === 'both') {
        ctx.beginPath();
        ctx.arc(c.x, c.y, outerRadius, geometry.startAngle, geometry.endAngle, geometry.anticlockwise);
        ctx.arc(c.x, c.y, innerRadius, geometry.endAngle, geometry.startAngle, !geometry.anticlockwise);
        ctx.closePath();
        ctx.strokeStyle = theme.wallBorder;
        ctx.lineWidth = Math.max(1.5, 4 * view.zoom);
        ctx.stroke();
      }
      
      if (renderMode === 'fill' || renderMode === 'both') {
        ctx.beginPath();
        ctx.arc(c.x, c.y, outerRadius, geometry.startAngle, geometry.endAngle, geometry.anticlockwise);
        ctx.arc(c.x, c.y, innerRadius, geometry.endAngle, geometry.startAngle, !geometry.anticlockwise);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        if (selected && !ghost) {
          ctx.fillStyle = theme.wallHandle;
          [start, end].forEach(p => ctx.fillRect(p.x - 4, p.y - 4, 8, 8));
        }
      }
    }
  } else if (isHelper) {
    const s = toScreen(wall.start), e = toScreen(wall.end);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 3 * view.zoom * scale);
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const corners = wallRectangle(wall).corners.map(toScreen);
    
    if (renderMode === 'border' || renderMode === 'both') {
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();
      ctx.strokeStyle = theme.wallBorder;
      ctx.lineWidth = Math.max(1.5, 4 * view.zoom);
      ctx.stroke();
    }
    
    if (renderMode === 'fill' || renderMode === 'both') {
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  if (selected && !ghost && renderMode !== 'border') {
    const s = toScreen(wall.start), e = toScreen(wall.end);
    ctx.fillStyle = theme.wallHandle;
    [s, e].forEach(p => ctx.fillRect(p.x - 4, p.y - 4, 8, 8));
    
    const mid = toScreen({
      x: (wall.start.x + wall.end.x) / 2,
      y: (wall.start.y + wall.end.y) / 2,
    });
    ctx.fillStyle = theme.wallDimensionLabel;
    ctx.font = `${Math.max(11, 12 * view.zoom * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(distance(wall.start, wall.end).toFixed(2), mid.x + 15, mid.y - 15);
  }
  
  if (ghost) ctx.restore();
}
