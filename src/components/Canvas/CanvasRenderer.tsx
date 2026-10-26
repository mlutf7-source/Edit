import React from 'react';
import type { Wall, Point, CanvasView, PlanImage, Axis, AppMode, RoundedCorner } from '../../core/types';
import { worldToScreen, distance, PX_PER_METER, wallRectangle } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import { COLORS } from './canvasRenderer/colors';
import { drawGrid } from './canvasRenderer/drawers/drawGrid';
import { drawAxes } from './canvasRenderer/drawers/drawAxes';
import { drawWall } from './canvasRenderer/drawers/drawWall';
import {
  drawRoundedCorner,
  drawRoundedCornerPreview,
} from './canvasRenderer/drawers/drawRoundedCorner';

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
// ══════════════════════════════════════════════
// 3.5 رسم نقاط الالتصاق الثلاث (مركز، حافة داخلية، حافة خارجية)
// ══════════════════════════════════════════════
if (mode === 'drawing' || mode === 'edit') {
  visibleWalls.forEach(w => {
    let startPts: Point[] = [];
    let endPts: Point[] = [];
    
    if (!w.curveRadius) {
      const rect = wallRectangle(w);
      startPts = [
        rect.corners[0], // الحافة الخارجية
        rect.corners[3], // الحافة الداخلية
        { x: (rect.corners[0].x + rect.corners[3].x) / 2, y: (rect.corners[0].y + rect.corners[3].y) / 2 } // المركز
      ];
      endPts = [
        rect.corners[1], // الحافة الخارجية
        rect.corners[2], // الحافة الداخلية
        { x: (rect.corners[1].x + rect.corners[2].x) / 2, y: (rect.corners[1].y + rect.corners[2].y) / 2 } // المركز
      ];
    } else {
      const geo = getCurvedWallGeometry(w);
      if (geo) {
        startPts = [
          { x: geo.center.x + Math.cos(geo.startAngle) * geo.outerRadius, y: geo.center.y + Math.sin(geo.startAngle) * geo.outerRadius },
          { x: geo.center.x + Math.cos(geo.startAngle) * geo.innerRadius, y: geo.center.y + Math.sin(geo.startAngle) * geo.innerRadius },
          { x: geo.center.x + Math.cos(geo.startAngle) * geo.radius, y: geo.center.y + Math.sin(geo.startAngle) * geo.radius }
        ];
        endPts = [
          { x: geo.center.x + Math.cos(geo.endAngle) * geo.outerRadius, y: geo.center.y + Math.sin(geo.endAngle) * geo.outerRadius },
          { x: geo.center.x + Math.cos(geo.endAngle) * geo.innerRadius, y: geo.center.y + Math.sin(geo.endAngle) * geo.innerRadius },
          { x: geo.center.x + Math.cos(geo.endAngle) * geo.radius, y: geo.center.y + Math.sin(geo.endAngle) * geo.radius }
        ];
      }
    }
    
    // ✅ رسم الدوائر الزرقاء الثلاث
    ctx.fillStyle = '#0066ff'; // أزرق غامق
    [...startPts, ...endPts].forEach(p => {
      const s = toScreen(p);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
          }
    // ══════════════════════════════════════════════
    // 1️⃣ المرحلة الأولى: رسم الحواف الرمادية (Borders)
    // ══════════════════════════════════════════════
    
    unjoinedWalls.forEach(w => drawWall(
      ctx, w, w.id === selectedId, false,
      roundCornerFirstWallId, toScreen, view, scale, 'border'
    ));

    joinedGroups.forEach((groupWalls) => {
      // نرسم حواف كل جدار على حدة
      groupWalls.forEach(w => drawWall(
        ctx, w, w.id === selectedId, false,
        roundCornerFirstWallId, toScreen, view, scale, 'border'
      ));
    });

    // ══════════════════════════════════════════════
    // 2️⃣ المرحلة الثانية: رسم التعبئة الزرقاء (Fills) فوق الحواف
    // ══════════════════════════════════════════════

    unjoinedWalls.forEach(w => drawWall(
      ctx, w, w.id === selectedId, false,
      roundCornerFirstWallId, toScreen, view, scale, 'fill'
    ));

    joinedGroups.forEach((groupWalls) => {
      const isGroupSelected = groupWalls.some(w => w.id === selectedId) || contourHighlightIds.includes(groupWalls[0].id);
      
      // نرسم تعبئة كل جدار على حدة، مع تمرير isGroupSelected لتلوينها
      groupWalls.forEach(w => drawWall(
        ctx, w, isGroupSelected || w.id === selectedId, false,
        roundCornerFirstWallId, toScreen, view, scale, 'fill'
      ));
    });
// ══════════════════════════════════════════════
// 3. رسم مسار التوجيه أثناء التعديل
// ══════════════════════════════════════════════
if (mode === 'edit' && selectedId) {
  const selWall = visibleWalls.find(w => w.id === selectedId);
  if (selWall && !selWall.curveRadius) {
    const angle = Math.atan2(selWall.end.y - selWall.start.y, selWall.end.x - selWall.start.x);
    const normAngle = ((angle % Math.PI) + Math.PI) % Math.PI;
    const isHorizontal = Math.abs(normAngle) < 0.01 || Math.abs(normAngle - Math.PI) < 0.01;
    const isVertical = Math.abs(normAngle - Math.PI / 2) < 0.01;
    
    if (isHorizontal || isVertical) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)'; // خط برتقالي شفاف
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      
      const p = toScreen(selWall.start);
      if (isHorizontal) {
        ctx.moveTo(0, p.y);
        ctx.lineTo(width, p.y);
      } else {
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}


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
