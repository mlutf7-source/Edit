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

/** ✅ دالة بناء مضلع آمنة (تمنع الأشواك وتصلح الاتجاهات) */
function safeBuildPolygon(
  ordered: { wall: Wall; reversed: boolean }[],
  isOuter: boolean
): Point[] {
  if (ordered.length < 2) return [];

  // 1. حساب المساحة الموقعة لتحديد اتجاه الدورة (CCW أو CW)
  let area = 0;
  ordered.forEach((o) => {
    const s = o.reversed ? o.wall.end : o.wall.start;
    const e = o.reversed ? o.wall.start : o.wall.end;
    area += s.x * e.y - e.x * s.y;
  });
  const isCCW = area > 0;

  // دالة مساعدة للحصول على نقاط الحافة (داخلية أو خارجية)
  const getEdge = (w: Wall) => {
    if (!w.curveRadius) {
      const dx = w.end.x - w.start.x;
      const dy = w.end.y - w.start.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      // تحديد الإشارة بناءً على اتجاه الدورة
      const sign = (isOuter === isCCW) ? 1 : -1;
      const offset = (w.thickness / 2) * sign;
      return [
        { x: w.start.x + nx * offset, y: w.start.y + ny * offset },
        { x: w.end.x + nx * offset, y: w.end.y + ny * offset },
      ];
    }
    const geo = getCurvedWallGeometry(w);
    if (!geo) return [{ ...w.start }, { ...w.end }];

    const useOuter = (isOuter === isCCW);
    const R = useOuter ? geo.outerRadius : geo.innerRadius;
    const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
    const dir = geo.anticlockwise ? -1 : 1;
    
    const pts: Point[] = [];
    const SEGS = 32;
    for (let i = 0; i <= SEGS; i++) {
      const ang = geo.startAngle + dir * span * (i / SEGS);
      pts.push({ x: geo.center.x + Math.cos(ang) * R, y: geo.center.y + Math.sin(ang) * R });
    }
    return pts;
  };

  const polygon: Point[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const next = ordered[(i + 1) % ordered.length];

    let currPts = getEdge(curr.wall);
    if (curr.reversed) currPts.reverse();

    let nextPts = getEdge(next.wall);
    if (next.reversed) nextPts.reverse();

    const startIdx = (i === 0) ? 0 : 1;
    for (let j = startIdx; j < currPts.length - 1; j++) {
      polygon.push(currPts[j]);
    }

    const currEnd = currPts[currPts.length - 1];
    const currPrev = currPts[currPts.length - 2] || currEnd;
    const nextStart = nextPts[0];
    const nextSecond = nextPts[1] || nextStart;

    const dx1 = currEnd.x - currPrev.x;
    const dy1 = currEnd.y - currPrev.y;
    const dx2 = nextSecond.x - nextStart.x;
    const dy2 = nextSecond.y - nextStart.y;
    const det = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(det) < 1e-6) {
      polygon.push(currEnd);
      polygon.push(nextStart);
    } else {
      const t = ((nextStart.x - currEnd.x) * dy2 - (nextStart.y - currEnd.y) * dx2) / det;
      const inter = { x: currEnd.x + t * dx1, y: currEnd.y + t * dy1 };
      const dist = Math.hypot(inter.x - currEnd.x, inter.y - currEnd.y);
      const offset = Math.max(curr.wall.thickness, next.wall.thickness) / 2;

      // ✅ الحد من طول الشوكة (1.5 بدلاً من 2.5) لمنع التشوهات
      if (dist < offset * 1.5) {
        polygon.push(inter);
      } else {
        polygon.push(currEnd);
        polygon.push(nextStart);
      }
    }
  }

  // تنظيف النقاط المتكررة
  const cleaned: Point[] = [];
  for (const p of polygon) {
    if (cleaned.length === 0 || Math.hypot(cleaned[cleaned.length - 1].x - p.x, cleaned[cleaned.length - 1].y - p.y) > 0.05) {
      cleaned.push(p);
    }
  }
  if (cleaned.length > 2 && Math.hypot(cleaned[0].x - cleaned[cleaned.length - 1].x, cleaned[0].y - cleaned[cleaned.length - 1].y) < 0.1) {
    cleaned.pop();
  }
  return cleaned;
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

    const tracePolygonPath = (ctx: CanvasRenderingContext2D, polygon: Point[]) => {
      if (polygon.length < 3) return;
      const p0 = toScreen(polygon[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < polygon.length; i++) {
        const p = toScreen(polygon[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
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

      const outer = safeBuildPolygon(ordered, true);
      const inner = safeBuildPolygon(ordered, false);

      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 2.5; // ✅ حافة رمادية واضحة
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2; // ✅ قص أي زوايا حادة إضافية لمنع الأشواك

      if (outer.length >= 3) {
        ctx.beginPath();
        tracePolygonPath(ctx, outer);
        ctx.stroke();
      }
      if (inner.length >= 3) {
        ctx.beginPath();
        tracePolygonPath(ctx, inner);
        ctx.stroke();
      }
    });

    // ══════════════════════════════════════════════
    // 2️⃣ المرحلة الثانية: رسم جميع التعبئات الملونة (Fills)
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

      const outer = safeBuildPolygon(ordered, true);
      const inner = safeBuildPolygon(ordered, false);

      ctx.fillStyle = color;
      ctx.beginPath();
      
      if (outer.length >= 3) {
        tracePolygonPath(ctx, outer);
      }
      if (inner.length >= 3) {
        tracePolygonPath(ctx, inner);
      }
      
      ctx.fill('evenodd'); // ✅ التعبئة بقاعدة evenodd لعمل فراغ داخلي
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
    // 5. الأركان المقوسة
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
