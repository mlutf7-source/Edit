import React from 'react';
import type { Wall, Point, CanvasView, PlanImage, Axis, AppMode, RoundedCorner } from '../../core/types';
import { worldToScreen, distance, PX_PER_METER } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import { COLORS } from './canvasRenderer/colors';
import { drawGrid } from './canvasRenderer/drawers/drawGrid';
import { drawAxes } from './canvasRenderer/drawers/drawAxes';
import { drawWall } from './canvasRenderer/drawers/drawWall';
import {
  drawRoundedCorner,
  drawRoundedCornerPreview,
} from './canvasRenderer/drawers/drawRoundedCorner';
import { orderWallsIntoLoop } from '../../core/contourUtils';

interface Props {
  walls: Wall[];
  view: CanvasView;
  width: number;
  height: number;
  selectedId: string | null;
  tempStart: Point | null;
  tempEnd: Point | null;
  scale?: number;
  planImage?: PlanImage | null;
  axes?: Axis[];
  selectedAxisId?: string | null;
  showGrid?: boolean;
  axisBubbleSize?: number;
  activeFloor?: number;
  showPreviousFloor?: boolean;
  mode?: AppMode;
  roundCornerFirstWallId?: string | null;
  roundedCorners?: RoundedCorner[];
  pendingRoundedCorner?: {
    wallAId: string;
    wallBId: string;
    radius: number;
  } | null;
  selectedRoundedCornerId?: string | null;
  joinWallsPendingIds?: string[];
  contourHighlightIds?: string[];
}

/** ✅ الحصول على نقاط خط المنتصف (Centerline) للجدار */
function getCenterlinePoints(w: Wall): Point[] {
  if (w.curveRadius) {
    const geo = getCurvedWallGeometry(w);
    if (!geo) return [{ ...w.start }, { ...w.end }];
    const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
    const dir = geo.anticlockwise ? -1 : 1;
    const SEGS = 32;
    const pts: Point[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const ang = geo.startAngle + dir * span * (i / SEGS);
      pts.push({
        x: geo.center.x + Math.cos(ang) * geo.radius, // نصف قطر خط المنتصف
        y: geo.center.y + Math.sin(ang) * geo.radius,
      });
    }
    return pts;
  } else {
    // خط المنتصف للجدار المستقيم (إزاحة نصف السماكة حسب اتجاه normalSign)
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const sign = w.normalSign ?? 1;
    const halfTh = w.thickness / 2;
    return [
      { x: w.start.x + nx * halfTh * sign, y: w.start.y + ny * halfTh * sign },
      { x: w.end.x + nx * halfTh * sign, y: w.end.y + ny * halfTh * sign },
    ];
  }
}

export const CanvasRenderer: React.FC<Props> = React.memo(({
  walls, view, width, height, selectedId, tempStart, tempEnd,
  scale = 1, planImage = null, axes = [], selectedAxisId = null,
  showGrid = true, axisBubbleSize = 9, activeFloor = 0,
  showPreviousFloor = false, mode = 'view',
  roundCornerFirstWallId = null, roundedCorners = [],
  pendingRoundedCorner = null,
  selectedRoundedCornerId = null,
  joinWallsPendingIds = [],
  contourHighlightIds = [],
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const toScreen = React.useCallback(
    (p: Point): Point => worldToScreen(
      p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY,
    ),
    [width, height, view.zoom, view.offsetX, view.offsetY],
  );

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
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    if (showGrid) drawGrid(ctx, toScreen, view, scale);
    drawAxes(ctx, axes, selectedAxisId, axisBubbleSize, toScreen);

    if (planImage?.url) {
      const img = new Image();
      img.src = planImage.url;
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = planImage.opacity;
        const cS = toScreen({
          x: planImage.x + planImage.width / 2,
          y: planImage.y + planImage.height / 2,
        });
        const p1 = toScreen({ x: planImage.x, y: planImage.y });
        const p2 = toScreen({
          x: planImage.x + planImage.width,
          y: planImage.y + planImage.height,
        });
        const w = p2.x - p1.x, h = p2.y - p1.y;
        ctx.translate(cS.x, cS.y);
        ctx.rotate(planImage.rotation || 0);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        if (planImage.isSelected) {
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.setLineDash([]);
        }
        ctx.restore();
      };
    }

    if (showPreviousFloor && activeFloor > 0) {
      walls
        .filter(w => (w.floor ?? 0) === activeFloor - 1)
        .forEach(w => drawWall(
          ctx, w, false, true,
          roundCornerFirstWallId, toScreen, view, scale, 'both'
        ));
    }

    const visibleWalls = walls.filter(w => (w.floor ?? 0) === activeFloor);

    const joinedGroups = new Map<string, Wall[]>();
    const unjoinedWalls: Wall[] = [];

    visibleWalls.forEach(w => {
      if (w.contourId && (!w.kind || w.kind === 'wall')) {
        if (!joinedGroups.has(w.contourId)) joinedGroups.set(w.contourId, []);
        joinedGroups.get(w.contourId)!.push(w);
      } else {
        unjoinedWalls.push(w);
      }
    });

    // ✅ دالة رسم المسار الموحد لجميع الجدران المربوطة
    const traceJoinedGroupPath = (ctx: CanvasRenderingContext2D, groupWalls: Wall[]) => {
      const ordered = orderWallsIntoLoop(groupWalls);
      if (ordered.length < 2) return false;

      ctx.beginPath();
      let isFirstPoint = true;

      for (let i = 0; i < ordered.length; i++) {
        const o = ordered[i];
        let pts = getCenterlinePoints(o.wall);
        if (o.reversed) pts.reverse();

        const startIdx = (i === 0) ? 0 : 1;
        for (let j = startIdx; j < pts.length; j++) {
          const p = toScreen(pts[j]);
          if (isFirstPoint) {
            ctx.moveTo(p.x, p.y);
            isFirstPoint = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }

      // إغلاق المسار لضمان اكتمال الشكل
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const firstPt = first.reversed ? first.wall.end : first.wall.start;
      const lastPt = last.reversed ? last.wall.start : last.wall.end;
      if (Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) < 0.5) {
        ctx.closePath();
      }
      return true;
    };

    // ══════════════════════════════════════════════
    // 1️⃣ المرحلة الأولى: رسم جميع الحواف الرمادية (Borders)
    // ══════════════════════════════════════════════
    
    unjoinedWalls.forEach(w => drawWall(
      ctx, w, w.id === selectedId, false,
      roundCornerFirstWallId, toScreen, view, scale, 'border'
    ));

    joinedGroups.forEach((groupWalls) => {
      const ordered = orderWallsIntoLoop(groupWalls);
      if (ordered.length < 2) return;
      
      const thickness = ordered[0].wall.thickness;
      const thicknessPx = thickness * PX_PER_METER * view.zoom * scale;

      // ✅ مفتاح الحل: دمج الزوايا (Miter) مع حد أقصى (2) لمنع الأشواك
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      ctx.lineCap = 'butt';

      if (traceJoinedGroupPath(ctx, groupWalls)) {
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = thicknessPx; // الحافة الرمادية بنفس سماكة الجدار
        ctx.stroke();
      }
    });

    // ══════════════════════════════════════════════
    // 2️⃣ المرحلة الثانية: رسم التعبئات الملونة (Fills)
    // ══════════════════════════════════════════════

    unjoinedWalls.forEach(w => drawWall(
      ctx, w, w.id === selectedId, false,
      roundCornerFirstWallId, toScreen, view, scale, 'fill'
    ));

    joinedGroups.forEach((groupWalls) => {
      const isGroupSelected = groupWalls.some(w => w.id === selectedId) || contourHighlightIds.includes(groupWalls[0].id);
      const color = isGroupSelected ? COLORS.selected : COLORS.wall;
      
      const ordered = orderWallsIntoLoop(groupWalls);
      if (ordered.length < 2) return;

      const thickness = ordered[0].wall.thickness;
      const thicknessPx = thickness * PX_PER_METER * view.zoom * scale;

      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      ctx.lineCap = 'butt';

      if (traceJoinedGroupPath(ctx, groupWalls)) {
        ctx.strokeStyle = color;
        // ✅ أضيق بـ 1.5 بكسل فقط لإظهار الحواف الرمادية دون تقليص الجدار
        ctx.lineWidth = Math.max(0.5, thicknessPx - 1.5); 
        ctx.stroke();
      }
    });

    // ══════════════════════════════════════════════
    // 4b. تمييز جدران الربط
    // ══════════════════════════════════════════════
    const drawHighlight = (w: Wall, color: string, lw: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      if (w.curveRadius) {
        const geo = getCurvedWallGeometry(w);
        if (geo) {
          const s = toScreen(w.start);
          ctx.moveTo(s.x, s.y);
          const SEGS = 48;
          const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
          const dir = geo.anticlockwise ? -1 : 1;
          const R = geo.outerRadius;
          for (let i = 1; i <= SEGS; i++) {
            const angle = geo.startAngle + dir * span * (i / SEGS);
            const pt = { x: geo.center.x + Math.cos(angle) * R, y: geo.center.y + Math.sin(angle) * R };
            const sp = toScreen(pt);
            ctx.lineTo(sp.x, sp.y);
          }
        } else {
          const s = toScreen(w.start); const e = toScreen(w.end);
          ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
        }
      } else {
        const s = toScreen(w.start); const e = toScreen(w.end);
        ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
      }
      ctx.stroke();
      ctx.restore();
    };

    contourHighlightIds.forEach(id => {
      const w = visibleWalls.find(x => x.id === id);
      if (w) drawHighlight(w, '#4caf50', 18, 0.55);
    });

    joinWallsPendingIds.forEach(id => {
      const w = visibleWalls.find(x => x.id === id);
      if (w) drawHighlight(w, '#ffeb3b', 20, 0.75);
    });

    // ══════════════════════════════════════════════
    // 5. الأركان المقوسة المُثبتة
    // ══════════════════════════════════════════════
    roundedCorners.forEach(rc => {
      const a = visibleWalls.find(w => w.id === rc.wallAId);
      const b = visibleWalls.find(w => w.id === rc.wallBId);
      if (a && b) drawRoundedCorner(ctx, a, b, rc.radius, toScreen, view, scale, selectedId, rc.id, selectedRoundedCornerId);
    });

    if (pendingRoundedCorner) {
      const a = visibleWalls.find(w => w.id === pendingRoundedCorner.wallAId);
      const b = visibleWalls.find(w => w.id === pendingRoundedCorner.wallBId);
      if (a && b) drawRoundedCornerPreview(ctx, a, b, pendingRoundedCorner.radius, toScreen, view, scale);
    }

    // ══════════════════════════════════════════════
    // 7. خط الرسم المؤقت
    // ══════════════════════════════════════════════
    if (tempStart && tempEnd) {
      const s = toScreen(tempStart), e = toScreen(tempEnd);
      ctx.strokeStyle = COLORS.preview;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.setLineDash([]);
      const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      ctx.fillStyle = COLORS.preview;
      ctx.font = `${Math.max(12, 14 * view.zoom * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(distance(tempStart, tempEnd).toFixed(2), mid.x + 15, mid.y - 15);
    }
  }, [walls, view, width, height, selectedId, tempStart, tempEnd, showGrid, scale, planImage, axes, selectedAxisId, axisBubbleSize, activeFloor, showPreviousFloor, mode, roundCornerFirstWallId, roundedCorners, pendingRoundedCorner, selectedRoundedCornerId, toScreen, joinWallsPendingIds, contourHighlightIds]);

  return <canvas ref={canvasRef} width={width * scale} height={height * scale} style={{ display: 'block' }} />;
});
