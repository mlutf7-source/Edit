import React from 'react';
import type { Column, Window, Door, Wall, CanvasView, Opening } from '../../core/types';
import { worldToScreen, getAngle, distance } from '../../core/geometry';

interface SelectedElement {
  id: string;
  type: 'column' | 'window' | 'door' | 'opening';
}

interface Props {
  selected: SelectedElement | null;
  columns: Column[];
  windows: Window[];
  doors: Door[];
  openings?: Opening[];
  walls: Wall[];
  view: CanvasView;
  width: number;
  height: number;
}

export const ElementEditLayer: React.FC<Props> = React.memo(({ 
  selected, columns, windows, doors, openings = [], walls, view, width, height 
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!selected) return;

    // ==========================================
    // 1. العمود (Column) - بدون تغيير
    // ==========================================
    if (selected.type === 'column') {
      const col = columns.find(c => c.id === selected.id);
      if (!col) return;

      const pos = worldToScreen(col.position.x, col.position.y, width, height, view.zoom, view.offsetX, view.offsetY);
      const angle = col.rotation || 0;
      const w = col.width * view.zoom * 100;
      const l = col.length * view.zoom * 100;

      ctx.strokeStyle = '#0a0';
      ctx.lineWidth = 3;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);
      ctx.strokeRect(-w / 2, -l / 2, w, l);
      ctx.restore();

      ctx.fillStyle = '#0a0';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fill();

      const rotateHandle = {
        x: pos.x + Math.sin(angle) * (l / 2 + 30),
        y: pos.y - Math.cos(angle) * (l / 2 + 30),
      };
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(rotateHandle.x, rotateHandle.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } 
    // ==========================================
    // 2. النافذة (Window) - تم تعديل المركز والسماكة
    // ==========================================
    else if (selected.type === 'window') {
      const win = windows.find(w => w.id === selected.id);
      if (!win) return;
      const wall = walls.find(w => w.id === win.wallId);
      if (!wall) return;

      const len = distance(wall.start, wall.end);
      if (len === 0) return;
      const angle = getAngle(wall.start, wall.end);
      const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
      
      const baseCenter = win.center ?? (() => {
        return {
          x: wall.start.x + ((win.position + win.width / 2) / len) * (wall.end.x - wall.start.x),
          y: wall.start.y + ((win.position + win.width / 2) / len) * (wall.end.y - wall.start.y),
        };
      })();

      // ✅ إزاحة المركز لمنتصف الجدار ليتطابق مع الرسم
      const sign = wall.normalSign ?? 1;
      const halfWallTh = wall.thickness / 2;
      const center = {
        x: baseCenter.x + normal.x * halfWallTh * sign,
        y: baseCenter.y + normal.y * halfWallTh * sign,
      };

      const mid = worldToScreen(center.x, center.y, width, height, view.zoom, view.offsetX, view.offsetY);
      
      // ✅ استخدام سماكة الجدار بدلاً من سماكة النافذة لمساحة نقر أكبر
      const halfThick = wall.thickness / 2; 
      const startX = center.x - Math.cos(angle) * win.width / 2;
      const startY = center.y - Math.sin(angle) * win.width / 2;
      const endX = center.x + Math.cos(angle) * win.width / 2;
      const endY = center.y + Math.sin(angle) * win.width / 2;

      const corners = [
        { x: startX + normal.x * halfThick, y: startY + normal.y * halfThick },
        { x: endX + normal.x * halfThick, y: endY + normal.y * halfThick },
        { x: endX - normal.x * halfThick, y: endY - normal.y * halfThick },
        { x: startX - normal.x * halfThick, y: startY - normal.y * halfThick },
      ];

      const screenCorners = corners.map(c => worldToScreen(c.x, c.y, width, height, view.zoom, view.offsetX, view.offsetY));

      ctx.strokeStyle = '#0a0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
      ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
      ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
      ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#0a0';
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } 
    // ==========================================
    // 3. الباب (Door) - تم تعديل المركز والسماكة
    // ==========================================
    else if (selected.type === 'door') {
      const door = doors.find(d => d.id === selected.id);
      if (!door) return;
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) return;

      const len = distance(wall.start, wall.end);
      if (len === 0) return;
      const angle = getAngle(wall.start, wall.end);
      const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
      const side = door.side ?? 1;
      const frameNormal = { x: normal.x * side, y: normal.y * side };
      const rotation = door.rotation || 0;

      const baseCenter = door.center ?? (() => {
        return {
          x: wall.start.x + ((door.position + door.width / 2) / len) * (wall.end.x - wall.start.x),
          y: wall.start.y + ((door.position + door.width / 2) / len) * (wall.end.y - wall.start.y),
        };
      })();

      // ✅ إزاحة المركز لمنتصف الجدار
      const sign = wall.normalSign ?? 1;
      const halfWallTh = wall.thickness / 2;
      const center = {
        x: baseCenter.x + normal.x * halfWallTh * sign,
        y: baseCenter.y + normal.y * halfWallTh * sign,
      };

      const mid = worldToScreen(center.x, center.y, width, height, view.zoom, view.offsetX, view.offsetY);

      ctx.save();
      ctx.translate(mid.x, mid.y);
      ctx.rotate(rotation);

      const halfW = door.width * view.zoom * 100 / 2;
      // ✅ استخدام سماكة الجدار لمساحة نقر أكبر
      const halfThick = wall.thickness * view.zoom * 100 / 2; 

      ctx.strokeStyle = '#0a0';
      ctx.lineWidth = 3;
      ctx.strokeRect(-halfW, -halfThick, halfW * 2, halfThick * 2);
      ctx.restore();

      // مقبض تحريك (مركز)
      ctx.fillStyle = '#0a0';
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // مقبض تدوير (بعيد أعلى الباب)
      const rotateLocal = { x: 0, y: -(halfThick + 30) };
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);
      const rotateHandle = {
        x: mid.x + rotateLocal.x * cosRot - rotateLocal.y * sinRot,
        y: mid.y + rotateLocal.x * sinRot + rotateLocal.y * cosRot,
      };
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(rotateHandle.x, rotateHandle.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // مقبض انعكاس (بعيد عن الإطار)
      const flipLocal = {
        x: frameNormal.x * (door.width / 2 + 0.35),
        y: frameNormal.y * (door.width / 2 + 0.35),
      };
      const flipHandle = {
        x: center.x + flipLocal.x,
        y: center.y + flipLocal.y,
      };
      const flipPos = worldToScreen(flipHandle.x, flipHandle.y, width, height, view.zoom, view.offsetX, view.offsetY);
      ctx.fillStyle = '#06f';
      ctx.beginPath();
      ctx.arc(flipPos.x, flipPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // ==========================================
    // 4. الفتحة (Opening) - إضافة جديدة
    // ==========================================
    else if (selected.type === 'opening') {
      const op = openings.find(o => o.id === selected.id);
      if (!op) return;
      const wall = walls.find(w => w.id === op.wallId);
      if (!wall) return;

      const len = distance(wall.start, wall.end);
      if (len === 0) return;
      const angle = getAngle(wall.start, wall.end);
      const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
      const sign = wall.normalSign ?? 1;
      const halfWallTh = wall.thickness / 2;

      const baseCenter = op.center ?? (() => {
        return {
          x: wall.start.x + ((op.position + op.width / 2) / len) * (wall.end.x - wall.start.x),
          y: wall.start.y + ((op.position + op.width / 2) / len) * (wall.end.y - wall.start.y),
        };
      })();

      // ✅ إزاحة المركز لمنتصف الجدار
      const center = {
        x: baseCenter.x + normal.x * halfWallTh * sign,
        y: baseCenter.y + normal.y * halfWallTh * sign,
      };

      const mid = worldToScreen(center.x, center.y, width, height, view.zoom, view.offsetX, view.offsetY);
      
      const halfThick = wall.thickness / 2;
      const startX = center.x - Math.cos(angle) * op.width / 2;
      const startY = center.y - Math.sin(angle) * op.width / 2;
      const endX = center.x + Math.cos(angle) * op.width / 2;
      const endY = center.y + Math.sin(angle) * op.width / 2;

      const corners = [
        { x: startX + normal.x * halfThick, y: startY + normal.y * halfThick },
        { x: endX + normal.x * halfThick, y: endY + normal.y * halfThick },
        { x: endX - normal.x * halfThick, y: endY - normal.y * halfThick },
        { x: startX - normal.x * halfThick, y: startY - normal.y * halfThick },
      ];

      const screenCorners = corners.map(c => worldToScreen(c.x, c.y, width, height, view.zoom, view.offsetX, view.offsetY));

      // إطار أخضر للفتحة (متقطع)
      ctx.strokeStyle = '#0a0';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
      ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
      ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
      ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#0a0';
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [selected, columns, windows, doors, openings, walls, view, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});
