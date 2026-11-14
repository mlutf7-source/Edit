import React from 'react';
import type { Column, Window, Door, Wall, CanvasView, Opening } from '../../core/types';
import { worldToScreen, PX_PER_METER, getAngle, distance } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import type { ColorTheme } from '../../core/colorTheme';

interface Props {
  columns: Column[];
  windows: Window[];
  doors: Door[];
  openings?: Opening[];
  walls: Wall[];
  view: CanvasView;
  width: number;
  height: number;
  scale?: number;
  selectedElement: { id: string; type: 'column' | 'window' | 'door' | 'opening' } | null;
  theme: ColorTheme;
}

export const ElementLayer: React.FC<Props> = React.memo(({
  columns, windows, doors, openings = [], walls, view, width, height,
  scale = 1, selectedElement, theme,
}) => {
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

// ==========================================
// إخفاء حواف الجدار داخل مناطق الأبواب والنوافذ
// ==========================================
const hideWallEdgesAtElement = (
  element: Window | Door
) => {
  const wall = walls.find(w => w.id === element.wallId);
  if (!wall || element.width <= 0) return;

  const geo = getCurvedWallGeometry(wall);
  const px = PX_PER_METER * view.zoom;

  // هامش يغطي نصف سماكة خط حدود الجدار.
  const borderMargin = Math.max(1.5, 4 * view.zoom) / 2 + 1;

  ctx.save();
  ctx.fillStyle = '#ffffff';

  if (geo) {
    // جدار منحني: تغطية الحافتين الداخلية والخارجية.
    const center = element.center;
    if (!center) {
      ctx.restore();
      return;
    }

    const midAngle = Math.atan2(
      center.y - geo.center.y,
      center.x - geo.center.x
    );

    const halfAngle =
      element.width / (2 * Math.max(geo.radius, 0.01));

    const a1 = midAngle - halfAngle;
    const a2 = midAngle + halfAngle;

    const screenCenter = worldToScreen(
      geo.center.x,
      geo.center.y,
      width,
      height,
      view.zoom,
      view.offsetX,
      view.offsetY
    );

    const outer = geo.outerRadius * px + borderMargin;
    const inner = Math.max(
      0,
      geo.innerRadius * px - borderMargin
    );

    ctx.beginPath();
    ctx.arc(
      screenCenter.x,
      screenCenter.y,
      outer,
      a1,
      a2,
      false
    );
    ctx.arc(
      screenCenter.x,
      screenCenter.y,
      inner,
      a2,
      a1,
      true
    );
    ctx.closePath();
    ctx.fill();
  } else {
    // جدار مستقيم: تغطية حافتي الجدار عبر سماكته.
    const len = distance(wall.start, wall.end);
    if (len <= 0) {
      ctx.restore();
      return;
    }

    const angle = getAngle(wall.start, wall.end);
    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);
    const sign = wall.normalSign ?? 1;

    const baseCenter = element.center ?? {
      x: wall.start.x +
        (element.position + element.width / 2) *
        (wall.end.x - wall.start.x) / len,
      y: wall.start.y +
        (element.position + element.width / 2) *
        (wall.end.y - wall.start.y) / len,
    };

    const center = {
      x: baseCenter.x +
        normalX * wall.thickness * sign / 2,
      y: baseCenter.y +
        normalY * wall.thickness * sign / 2,
    };

    const screenCenter = worldToScreen(
      center.x,
      center.y,
      width,
      height,
      view.zoom,
      view.offsetX,
      view.offsetY
    );

    ctx.translate(screenCenter.x, screenCenter.y);
    ctx.rotate(angle);

    ctx.fillRect(
      -element.width * px / 2,
      -wall.thickness * px / 2 - borderMargin,
      element.width * px,
      wall.thickness * px + borderMargin * 2
    );
  }

  ctx.restore();
};

// إخفاء خطوط الجدار قبل رسم تفاصيل العناصر.
windows.forEach(hideWallEdgesAtElement);
doors.forEach(hideWallEdgesAtElement);

// ─── الأعمدة ───

    columns.forEach(col => {
      const pos = worldToScreen(col.position.x, col.position.y, width, height, view.zoom, view.offsetX, view.offsetY);
      const w = col.width * PX_PER_METER * view.zoom;
      const l = col.length * PX_PER_METER * view.zoom;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(col.rotation || 0);
      ctx.fillStyle = theme.columnFill;

      if (col.columnShape === 'circle') {
        const radius = (w / 2);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-w / 2, -l / 2, w, l);
      }
      ctx.restore();
    });

    // ─── الفتحات ───
    openings.forEach(op => {
      const wall = walls.find(w => w.id === op.wallId);
      if (!wall) return;

      const isSelected = selectedElement?.id === op.id && selectedElement?.type === 'opening';
      const geo = getCurvedWallGeometry(wall);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = isSelected ? theme.selection : theme.wallBorder;
      ctx.lineWidth = isSelected ? Math.max(1.5, 1 * view.zoom * scale) : Math.max(0.5, 1 * view.zoom * scale);
      ctx.setLineDash([4, 4]);

      if (geo) {
        const center = op.center || { x: wall.start.x, y: wall.start.y };
        const midAngle = Math.atan2(center.y - geo.center.y, center.x - geo.center.x);
        const dir = geo.anticlockwise ? -1 : 1;
        const halfAngle = (op.width / 2) / geo.radius;
        const a1 = midAngle - halfAngle * dir;
        const a2 = midAngle + halfAngle * dir;
        const innerR = Math.max(0.01, geo.radius - wall.thickness / 2);
        const outerR = geo.radius + wall.thickness / 2;

        const screenCenter = worldToScreen(geo.center.x, geo.center.y, width, height, view.zoom, view.offsetX, view.offsetY);
        const pxInner = innerR * PX_PER_METER * view.zoom;
        const pxOuter = outerR * PX_PER_METER * view.zoom;

        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, pxOuter, a1, a2, geo.anticlockwise);
        ctx.arc(screenCenter.x, screenCenter.y, pxInner, a2, a1, !geo.anticlockwise);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const wallAngle = getAngle(wall.start, wall.end);
        const normal = { x: -Math.sin(wallAngle), y: Math.cos(wallAngle) };
        const halfThick = (op.thickness || wall.thickness) / 2;
        const halfWallTh = wall.thickness / 2;
        const sign = wall.normalSign ?? 1;
        const baseCenter = op.center ?? (() => {
          const len = distance(wall.start, wall.end);
          return {
            x: wall.start.x + ((op.position + op.width / 2) / len) * (wall.end.x - wall.start.x),
            y: wall.start.y + ((op.position + op.width / 2) / len) * (wall.end.y - wall.start.y),
          };
        })();

        const center = {
          x: baseCenter.x + normal.x * halfWallTh * sign,
          y: baseCenter.y + normal.y * halfWallTh * sign,
        };

        const startX = center.x - Math.cos(wallAngle) * op.width / 2;
        const startY = center.y - Math.sin(wallAngle) * op.width / 2;
        const endX = center.x + Math.cos(wallAngle) * op.width / 2;
        const endY = center.y + Math.sin(wallAngle) * op.width / 2;

        const corners = [
          { x: startX + normal.x * halfThick, y: startY + normal.y * halfThick },
          { x: endX + normal.x * halfThick, y: endY + normal.y * halfThick },
          { x: endX - normal.x * halfThick, y: endY - normal.y * halfThick },
          { x: startX - normal.x * halfThick, y: startY - normal.y * halfThick },
        ];
        const screenCorners = corners.map(c => worldToScreen(c.x, c.y, width, height, view.zoom, view.offsetX, view.offsetY));

        ctx.beginPath();
        ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
        ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
        ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
        ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.setLineDash([]);
    });

    // ─── النوافذ ───
    windows.forEach(win => {
      const wall = walls.find(w => w.id === win.wallId);
      if (!wall) return;

      const geo = getCurvedWallGeometry(wall);

      ctx.fillStyle = '#ffffff';

      if (geo) {
        const center = win.center || { x: wall.start.x, y: wall.start.y };
        const midAngle = Math.atan2(center.y - geo.center.y, center.x - geo.center.x);
        const dir = geo.anticlockwise ? -1 : 1;
        const halfAngle = (win.width / 2) / geo.radius;
        const a1 = midAngle - halfAngle * dir;
        const a2 = midAngle + halfAngle * dir;
        const innerR = Math.max(0.01, geo.radius - win.thickness / 2);
        const outerR = geo.radius + win.thickness / 2;

        const screenCenter = worldToScreen(geo.center.x, geo.center.y, width, height, view.zoom, view.offsetX, view.offsetY);
        const pxInner = innerR * PX_PER_METER * view.zoom;
        const pxOuter = outerR * PX_PER_METER * view.zoom;

        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, pxOuter, a1, a2, geo.anticlockwise);
        ctx.arc(screenCenter.x, screenCenter.y, pxInner, a2, a1, !geo.anticlockwise);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = theme.windowFrame;
        ctx.lineWidth = Math.max(0.4, wall.thickness * PX_PER_METER * view.zoom * 0.05);
        ctx.stroke();

        ctx.strokeStyle = theme.windowGlassLines;
        ctx.lineWidth = Math.max(0.3, wall.thickness * PX_PER_METER * view.zoom * 0.03);

        const pxInnerGap = (innerR + 0.05) * PX_PER_METER * view.zoom;
        const pxOuterGap = (outerR - 0.05) * PX_PER_METER * view.zoom;

        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, pxOuterGap, a1, a2, geo.anticlockwise);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, pxInnerGap, a1, a2, geo.anticlockwise);
        ctx.stroke();
      } else {
        const wallAngle = getAngle(wall.start, wall.end);
        const normal = { x: -Math.sin(wallAngle), y: Math.cos(wallAngle) };
        const halfThick = win.thickness / 2;
        const halfWallTh = wall.thickness / 2;
        const sign = wall.normalSign ?? 1;
        const baseCenter = win.center ?? (() => {
          const len = distance(wall.start, wall.end);
          return {
            x: wall.start.x + ((win.position + win.width / 2) / len) * (wall.end.x - wall.start.x),
            y: wall.start.y + ((win.position + win.width / 2) / len) * (wall.end.y - wall.start.y),
          };
        })();

        const center = {
          x: baseCenter.x + normal.x * halfWallTh * sign,
          y: baseCenter.y + normal.y * halfWallTh * sign,
        };

        const startX = center.x - Math.cos(wallAngle) * win.width / 2;
        const startY = center.y - Math.sin(wallAngle) * win.width / 2;
        const endX = center.x + Math.cos(wallAngle) * win.width / 2;
        const endY = center.y + Math.sin(wallAngle) * win.width / 2;

        const corners = [
          { x: startX + normal.x * halfThick, y: startY + normal.y * halfThick },
          { x: endX + normal.x * halfThick, y: endY + normal.y * halfThick },
          { x: endX - normal.x * halfThick, y: endY - normal.y * halfThick },
          { x: startX - normal.x * halfThick, y: startY - normal.y * halfThick },
        ];

        const screenCorners = corners.map(c => worldToScreen(c.x, c.y, width, height, view.zoom, view.offsetX, view.offsetY));

        ctx.beginPath();
        ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
        ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
        ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
        ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = theme.windowFrame;
        ctx.lineWidth = Math.max(0.4, wall.thickness * PX_PER_METER * view.zoom * 0.05);
        ctx.stroke();

        const gap = 0.05;
        const line1Start = worldToScreen(startX + normal.x * gap, startY + normal.y * gap, width, height, view.zoom, view.offsetX, view.offsetY);
        const line1End = worldToScreen(endX + normal.x * gap, endY + normal.y * gap, width, height, view.zoom, view.offsetX, view.offsetY);
        const line2Start = worldToScreen(startX - normal.x * gap, startY - normal.y * gap, width, height, view.zoom, view.offsetX, view.offsetY);
        const line2End = worldToScreen(endX - normal.x * gap, endY - normal.y * gap, width, height, view.zoom, view.offsetX, view.offsetY);

        ctx.strokeStyle = theme.windowGlassLines;
        ctx.lineWidth = Math.max(0.3, wall.thickness * PX_PER_METER * view.zoom * 0.03);
        ctx.beginPath();
        ctx.moveTo(line1Start.x, line1Start.y);
        ctx.lineTo(line1End.x, line1End.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(line2Start.x, line2Start.y);
        ctx.lineTo(line2End.x, line2End.y);
        ctx.stroke();
      }
    });

    // ─── الأبواب ───
    doors.forEach(door => {
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) return;
      const len = distance(wall.start, wall.end);
      if (len === 0) return;

      const wallAngle = getAngle(wall.start, wall.end);
      const rotation = door.rotation || 0;

      const baseCenter = door.center ?? (() => {
        return {
          x: wall.start.x + ((door.position + door.width / 2) / len) * (wall.end.x - wall.start.x),
          y: wall.start.y + ((door.position + door.width / 2) / len) * (wall.end.y - wall.start.y),
        };
      })();

      const normal = { x: -Math.sin(wallAngle), y: Math.cos(wallAngle) };
      const halfWallTh = wall.thickness / 2;
      const sign = wall.normalSign ?? 1;
      const center = {
        x: baseCenter.x + normal.x * halfWallTh * sign,
        y: baseCenter.y + normal.y * halfWallTh * sign,
      };

      const centerScreen = worldToScreen(center.x, center.y, width, height, view.zoom, view.offsetX, view.offsetY);

      const doorWidthPx = door.width * PX_PER_METER * view.zoom;
      const wallThicknessPx = wall.thickness * PX_PER_METER * view.zoom;

      const doorType = door.doorType ?? 'regular';

      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(rotation);

      // مسح منطقة الجدار
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-doorWidthPx / 2, -wallThicknessPx / 2, doorWidthPx, wallThicknessPx);

      // ══════════════════════════════════════════════
      // 🚪 باب عادي
      // ══════════════════════════════════════════════
      if (doorType === 'regular') {
        const hingeLocalX = door.hinge === 'start' ? -doorWidthPx / 2 : doorWidthPx / 2;
        const hingeScreen = { x: hingeLocalX, y: 0 };
        const swingSign = door.swing || 1;

        ctx.strokeStyle = theme.doorRegular;
        ctx.lineWidth = Math.max(1, wall.thickness * PX_PER_METER * view.zoom * 0.15);
        ctx.beginPath();
        ctx.moveTo(hingeScreen.x, hingeScreen.y);
        ctx.lineTo(hingeScreen.x, hingeScreen.y + swingSign * doorWidthPx);
        ctx.stroke();

        const arcRadius = doorWidthPx;
        const startAngle = swingSign > 0 ? 0 : -Math.PI / 2;
        const endAngle = swingSign > 0 ? Math.PI / 2 : 0;

        ctx.strokeStyle = theme.doorRegular;
        ctx.lineWidth = Math.max(0.7, wall.thickness * PX_PER_METER * view.zoom * 0.075);
        ctx.beginPath();
        ctx.arc(hingeScreen.x, hingeScreen.y, arcRadius, startAngle, endAngle);
        ctx.stroke();

        ctx.fillStyle = theme.doorRegular;
        ctx.beginPath();
        ctx.arc(hingeScreen.x, hingeScreen.y, Math.max(1.2, wall.thickness * PX_PER_METER * view.zoom * 0.20), 0, Math.PI * 2);
        ctx.fill();
      }

      // ══════════════════════════════════════════════
      // 🚪 باب رئيسي
      // ══════════════════════════════════════════════
      else if (doorType === 'main') {
        const SMALL_RATIO = 1 / 3;
        const LARGE_RATIO = 2 / 3;
        const swingSign = door.swing || 1;

        const smallWidthPx = doorWidthPx * SMALL_RATIO;
        const largeWidthPx = doorWidthPx * LARGE_RATIO;

        const hingeSmallX = -doorWidthPx / 2;
        const hingeLargeX = doorWidthPx / 2;

        ctx.strokeStyle = theme.doorMain;
        ctx.lineWidth = Math.max(1, wall.thickness * PX_PER_METER * view.zoom * 0.15);
        ctx.beginPath();
        ctx.moveTo(hingeSmallX, 0);
        ctx.lineTo(hingeSmallX, swingSign * smallWidthPx);
        ctx.stroke();

        ctx.lineWidth = Math.max(0.7, wall.thickness * PX_PER_METER * view.zoom * 0.075);
        ctx.beginPath();
        ctx.arc(
          hingeSmallX, 0,
          smallWidthPx,
          swingSign > 0 ? 0 : -Math.PI / 2,
          swingSign > 0 ? Math.PI / 2 : 0
        );
        ctx.stroke();

        ctx.lineWidth = Math.max(1, wall.thickness * PX_PER_METER * view.zoom * 0.15);
        ctx.beginPath();
        ctx.moveTo(hingeLargeX, 0);
        ctx.lineTo(hingeLargeX, swingSign * largeWidthPx);
        ctx.stroke();

        ctx.lineWidth = Math.max(0.7, wall.thickness * PX_PER_METER * view.zoom * 0.075);
        ctx.beginPath();
        ctx.arc(
          hingeLargeX, 0,
          largeWidthPx,
          swingSign > 0 ? Math.PI / 2 : Math.PI,
          swingSign > 0 ? Math.PI : (3 * Math.PI) / 2
        );
        ctx.stroke();

        ctx.fillStyle = theme.doorMain;
        ctx.beginPath();
        ctx.arc(hingeSmallX, 0, Math.max(1.2, wall.thickness * PX_PER_METER * view.zoom * 0.20), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hingeLargeX, 0, Math.max(1.2, wall.thickness * PX_PER_METER * view.zoom * 0.20), 0, Math.PI * 2);
        ctx.fill();
      }

      // ══════════════════════════════════════════════
      // 🏪 باب محل
      // ══════════════════════════════════════════════
      else if (doorType === 'shop') {
        const swingSign = door.swing || 1;

        // المسار (خطان متوازيان)
        ctx.strokeStyle = theme.doorShop;
        ctx.lineWidth = Math.max(0.7, wall.thickness * PX_PER_METER * view.zoom * 0.075);
        ctx.beginPath();
        ctx.moveTo(-doorWidthPx / 2, 0);
        ctx.lineTo(doorWidthPx / 2, 0);
        ctx.stroke();

        const innerOffset = swingSign * wallThicknessPx * 0.7;
        ctx.beginPath();
        ctx.moveTo(-doorWidthPx / 2, innerOffset);
        ctx.lineTo(doorWidthPx / 2, innerOffset);
        ctx.stroke();
        ctx.setLineDash([]);

        // خطوط رأسية على الطرفين
        ctx.strokeStyle = theme.doorShop;
        ctx.lineWidth = Math.max(1, wall.thickness * PX_PER_METER * view.zoom * 0.15);
        ctx.beginPath();
        ctx.moveTo(-doorWidthPx / 2, 0);
        ctx.lineTo(-doorWidthPx / 2, innerOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(doorWidthPx / 2, 0);
        ctx.lineTo(doorWidthPx / 2, innerOffset);
        ctx.stroke();

        // شريط الباب
        const panelWidthPx = doorWidthPx * 0.5;
        const panelX = swingSign > 0 ? -doorWidthPx / 2 : 0;
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = theme.doorShop;
        ctx.fillRect(panelX, innerOffset * 0.3, panelWidthPx, Math.abs(innerOffset) * 0.4);
        ctx.restore();

        ctx.strokeStyle = theme.doorShop;
        ctx.lineWidth = Math.max(0.7, wall.thickness * PX_PER_METER * view.zoom * 0.075);
        ctx.strokeRect(panelX, innerOffset * 0.3, panelWidthPx, Math.abs(innerOffset) * 0.4);

        // بكرة
        const pulleyX = swingSign > 0 ? -doorWidthPx / 2 : doorWidthPx / 2;
        ctx.fillStyle = theme.doorShop;
        ctx.beginPath();
        ctx.arc(pulleyX, innerOffset * 0.5, Math.max(2, wall.thickness * PX_PER_METER * view.zoom * 0.15), 0, Math.PI * 2);
        ctx.fill();

        // سهم
        ctx.strokeStyle = theme.doorShop;
        ctx.lineWidth = Math.max(1, wall.thickness * PX_PER_METER * view.zoom * 0.10);
        const arrowStartY = -swingSign * wallThicknessPx * 0.5;
        const arrowEndY = swingSign * wallThicknessPx * 0.8;
        const arrowX = swingSign > 0 ? doorWidthPx * 0.3 : -doorWidthPx * 0.3;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowStartY);
        ctx.lineTo(arrowX, arrowEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(arrowX - Math.max(2, 3 * view.zoom * scale), arrowEndY - Math.max(2, 3 * view.zoom * scale));
        ctx.lineTo(arrowX, arrowEndY);
        ctx.lineTo(arrowX + Math.max(2, 3 * view.zoom * scale), arrowEndY - Math.max(2, 3 * view.zoom * scale));
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [columns, windows, doors, openings, walls, view, width, height, scale, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});
