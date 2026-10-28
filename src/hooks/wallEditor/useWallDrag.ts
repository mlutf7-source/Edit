import { useCallback } from 'react';
import type { Point, Wall, Axis } from '../../core/types';
import {
  distance,
  getAngle,
  snapAngle,
  normalize,
  wallRectangle,
} from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import { findSnapToFace } from '../../core/snapToFace';
import { CORNER_TOL, MIN_MOVE_FOR_DRAG } from './helpers';

const SNAP_DIST = 0.05;       // ✅ 5cm — نطاق البحث والتطبيق (موحد)
const ORTHO_AXIS_TOL = 0.005; // 5mm — للتمديد فقط
const TWO_PI = 2 * Math.PI;

interface DragState {
  selectedIds: string[];
  editType: 'none' | 'move' | 'extendStart' | 'extendEnd';
}

function getArcSpan(
  startAngle: number,
  endAngle: number,
  dir: number,
): number {
  return (
    ((dir * (endAngle - startAngle)) % TWO_PI + TWO_PI) %
    TWO_PI
  );
}

function getWallDragPoints(wall: Wall): Point[] {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      const dir = geo.anticlockwise ? -1 : 1;
      const span = getArcSpan(geo.startAngle, geo.endAngle, dir);
      const a1 = geo.startAngle;
      const a2 = geo.startAngle + dir * span;

      return [
        wall.start,
        wall.end,
        {
          x: geo.center.x + Math.cos(a1) * geo.outerRadius,
          y: geo.center.y + Math.sin(a1) * geo.outerRadius,
        },
        {
          x: geo.center.x + Math.cos(a1) * geo.innerRadius,
          y: geo.center.y + Math.sin(a1) * geo.innerRadius,
        },
        {
          x: geo.center.x + Math.cos(a2) * geo.outerRadius,
          y: geo.center.y + Math.sin(a2) * geo.outerRadius,
        },
        {
          x: geo.center.x + Math.cos(a2) * geo.innerRadius,
          y: geo.center.y + Math.sin(a2) * geo.innerRadius,
        },
      ];
    }
    return [wall.start, wall.end];
  }

  const rect = wallRectangle(wall);
  const midStart = {
    x: (rect.corners[0].x + rect.corners[3].x) / 2,
    y: (rect.corners[0].y + rect.corners[3].y) / 2,
  };
  const midEnd = {
    x: (rect.corners[1].x + rect.corners[2].x) / 2,
    y: (rect.corners[1].y + rect.corners[2].y) / 2,
  };

  return [
    wall.start,
    wall.end,
    rect.corners[0],
    rect.corners[3],
    midStart,
    rect.corners[1],
    rect.corners[2],
    midEnd,
  ];
}

function getStartDragPoints(wall: Wall): Point[] {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      const a = geo.startAngle;
      return [
        wall.start,
        {
          x: geo.center.x + Math.cos(a) * geo.outerRadius,
          y: geo.center.y + Math.sin(a) * geo.outerRadius,
        },
        {
          x: geo.center.x + Math.cos(a) * geo.innerRadius,
          y: geo.center.y + Math.sin(a) * geo.innerRadius,
        },
      ];
    }
    return [wall.start];
  }
  const rect = wallRectangle(wall);
  return [wall.start, rect.corners[0], rect.corners[3]];
}

function getEndDragPoints(wall: Wall): Point[] {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      const dir = geo.anticlockwise ? -1 : 1;
      const span = getArcSpan(geo.startAngle, geo.endAngle, dir);
      const a = geo.startAngle + dir * span;
      return [
        wall.end,
        {
          x: geo.center.x + Math.cos(a) * geo.outerRadius,
          y: geo.center.y + Math.sin(a) * geo.outerRadius,
        },
        {
          x: geo.center.x + Math.cos(a) * geo.innerRadius,
          y: geo.center.y + Math.sin(a) * geo.innerRadius,
        },
      ];
    }
    return [wall.end];
  }
  const rect = wallRectangle(wall);
  return [wall.end, rect.corners[1], rect.corners[2]];
}

/** ✅ البحث عن أفضل إزاحة — نطاق = 5cm فقط (لا 10cm) */
function findBestShift(
  points: Point[],
  walls: Wall[],
  excludeIds: string[],
): Point | null {
  const otherWalls = walls.filter(w => !excludeIds.includes(w.id));
  if (otherWalls.length === 0) return null;

  let bestShift: Point | null = null;
  let bestDist = SNAP_DIST;

  for (const point of points) {
    const snap = findSnapToFace(point, otherWalls, undefined, SNAP_DIST);
    if (!snap) continue;

    const d = distance(point, snap.point);
    if (d < bestDist) {
      bestDist = d;
      bestShift = {
        x: snap.point.x - point.x,
        y: snap.point.y - point.y,
      };
    }
  }

  return bestShift;
}

function constrainEndpoint(
  point: Point,
  anchor: Point,
  original: Wall,
  isStart: boolean,
  orthogonalMode: boolean,
  lockDirection: boolean,
  lockLength: boolean,
): Point {
  let result = { ...point };
  const isCurved = !!original.curveRadius;

  if (!isCurved && orthogonalMode) {
    const dx = Math.abs(result.x - anchor.x);
    const dy = Math.abs(result.y - anchor.y);
    result = dx > dy
      ? { x: result.x, y: anchor.y }
      : { x: anchor.x, y: result.y };
  } else if (lockDirection && !isCurved) {
    const angle = snapAngle(
      getAngle(original.start, original.end),
      orthogonalMode ? Math.PI / 4 : 0.1,
    );
    const horizontal =
      Math.abs(angle) < 0.001 ||
      Math.abs(Math.abs(angle) - Math.PI) < 0.001;
    result = horizontal
      ? { x: result.x, y: anchor.y }
      : { x: anchor.x, y: result.y };
  } else if (!isCurved) {
    const angle = getAngle(anchor, result);
    const snappedAngle = snapAngle(angle, 0.01);
    if (snappedAngle !== angle) {
      const len = distance(anchor, result);
      result = {
        x: anchor.x + Math.cos(snappedAngle) * len,
        y: anchor.y + Math.sin(snappedAngle) * len,
      };
    }
  }

  if (lockLength) {
    const originalLength = distance(original.start, original.end);
    const direction = normalize({
      x: result.x - anchor.x,
      y: result.y - anchor.y,
    });
    result = {
      x: anchor.x + direction.x * originalLength,
      y: anchor.y + direction.y * originalLength,
    };
  }

  return result;
}

export function useWallDrag(
  walls: Wall[],
  setWalls: React.Dispatch<React.SetStateAction<Wall[]>>,
  axes: Axis[],
  orthogonalMode: boolean,
  state: DragState,
  originalRef: React.MutableRefObject<Wall | null>,
  dragStartRef: React.MutableRefObject<Point | null>,
  originalGroupRef: React.MutableRefObject<Wall[]>,
  dragActivatedRef: React.MutableRefObject<boolean>,
) {
  const moveEdit = useCallback((pt: Point) => {
    const original = originalRef.current;
    const start = dragStartRef.current;

    if (!original || !start || state.selectedIds.length === 0 || state.editType === 'none') {
      return;
    }

    const dx = pt.x - start.x;
    const dy = pt.y - start.y;

    if (!dragActivatedRef.current) {
      if (Math.hypot(dx, dy) < MIN_MOVE_FOR_DRAG) return;
      dragActivatedRef.current = true;
    }

    const selectedIds = state.selectedIds;
    const isCurved = !!original.curveRadius;

    // ══════════════════════════════════════════════
    // حالة 1: تمديد مجموعة
    // ══════════════════════════════════════════════
    if (
      selectedIds.length > 1 &&
      (state.editType === 'extendStart' || state.editType === 'extendEnd')
    ) {
      const pivot = state.editType === 'extendStart' ? original.start : original.end;
      let target = { x: pivot.x + dx, y: pivot.y + dy };

      const otherWalls = walls.filter(w => !selectedIds.includes(w.id));
      const snap = findSnapToFace(target, otherWalls, undefined, SNAP_DIST);
      if (snap) target = snap.point;

      setWalls(prevWalls =>
        prevWalls.map(wall => {
          if (!selectedIds.includes(wall.id)) return wall;
          let newStart = wall.start;
          let newEnd = wall.end;
          if (Math.hypot(wall.start.x - pivot.x, wall.start.y - pivot.y) < CORNER_TOL) newStart = target;
          if (Math.hypot(wall.end.x - pivot.x, wall.end.y - pivot.y) < CORNER_TOL) newEnd = target;
          return { ...wall, start: newStart, end: newEnd };
        }),
      );
      return;
    }

    // ══════════════════════════════════════════════
    // حالة 2: تحريك مجموعة كاملة ✅ تطبيق كامل (X+Y)
    // ══════════════════════════════════════════════
    if (selectedIds.length > 1 && state.editType === 'move') {
      if (original.lockMove) return;

      const group = originalGroupRef.current;
      const movingWalls = group.filter(w => selectedIds.includes(w.id));
      const movingPoints = movingWalls.flatMap(w =>
        getWallDragPoints({
          ...w,
          start: { x: w.start.x + dx, y: w.start.y + dy },
          end: { x: w.end.x + dx, y: w.end.y + dy },
        }),
      );

      const shift = findBestShift(movingPoints, walls, selectedIds);
      const finalDx = dx + (shift?.x ?? 0);
      const finalDy = dy + (shift?.y ?? 0);

      setWalls(prevWalls =>
        prevWalls.map(wall => {
          if (!selectedIds.includes(wall.id)) return wall;
          const orig = group.find(w => w.id === wall.id);
          if (!orig) return wall;
          return {
            ...wall,
            start: { x: orig.start.x + finalDx, y: orig.start.y + finalDy },
            end: { x: orig.end.x + finalDx, y: orig.end.y + finalDy },
          };
        }),
      );
      return;
    }

    // ══════════════════════════════════════════════
    // حالة 3: تحريك أو تمديد جدار منفرد
    // ══════════════════════════════════════════════
    setWalls(prevWalls =>
      prevWalls.map(wall => {
        if (!selectedIds.includes(wall.id)) return wall;

        // ---------- 3a: تحريك ✅ تطبيق كامل (X+Y) ----------
        if (state.editType === 'move') {
          if (original.lockMove) return wall;

          let rawStart: Point = { x: original.start.x + dx, y: original.start.y + dy };
          let rawEnd: Point = { x: original.end.x + dx, y: original.end.y + dy };

          if (orthogonalMode && !isCurved) {
            const horizontal = Math.abs(dx) >= Math.abs(dy);
            if (horizontal) {
              rawStart.y = original.start.y;
              rawEnd.y = original.end.y;
            } else {
              rawStart.x = original.start.x;
              rawEnd.x = original.end.x;
            }
          }

          const tempWall = { ...wall, start: rawStart, end: rawEnd };
          const shift = findBestShift(getWallDragPoints(tempWall), prevWalls, selectedIds);

          let finalStart = rawStart;
          let finalEnd = rawEnd;

          if (shift) {
            // ✅ تطبيق الإزاحة الكاملة (X+Y) — الجدار يتحرك ككتلة واحدة
            finalStart = { x: rawStart.x + shift.x, y: rawStart.y + shift.y };
            finalEnd = { x: rawEnd.x + shift.x, y: rawEnd.y + shift.y };
          } else if (axes.length > 0 && !isCurved) {
            const dx2 = Math.abs(rawEnd.x - rawStart.x);
            const dy2 = Math.abs(rawEnd.y - rawStart.y);
            const halfThick = wall.thickness / 2;
            if (dx2 > dy2) {
              const axis = axes.find(a =>
                a.type === 'horizontal' &&
                Math.abs(rawStart.y - (a.position - a.offset + halfThick)) < 0.5,
              );
              if (axis) {
                const y = axis.position - axis.offset - halfThick;
                finalStart = { ...finalStart, y };
                finalEnd = { ...finalEnd, y };
              }
            } else {
              const axis = axes.find(a =>
                a.type === 'vertical' &&
                Math.abs(rawStart.x - (a.position + a.offset - halfThick)) < 0.5,
              );
              if (axis) {
                const x = axis.position + axis.offset - halfThick;
                finalStart = { ...finalStart, x };
                finalEnd = { ...finalEnd, x };
              }
            }
          }

          return { ...wall, start: finalStart, end: finalEnd };
        }

        // ---------- 3b: تمديد (نبقي قيد الميلان) ----------
        if (state.editType === 'extendStart' || state.editType === 'extendEnd') {
          const isStart = state.editType === 'extendStart';
          const anchor = isStart ? original.end : original.start;
          const initial = isStart ? original.start : original.end;

          let endpoint = { x: initial.x + dx, y: initial.y + dy };

          endpoint = constrainEndpoint(
            endpoint, anchor, original, isStart,
            orthogonalMode, !!original.lockDirection, !!original.lockLength,
          );

          const tempWall = isStart
            ? { ...wall, start: endpoint }
            : { ...wall, end: endpoint };

          const points = isStart
            ? getStartDragPoints(tempWall)
            : getEndDragPoints(tempWall);

          const shift = findBestShift(points, prevWalls, selectedIds);

          if (shift) {
            let canApply = true;

            // في الزاوية القائمة: نرفض إذا تطلب ميلاناً > 5mm
            if (!isCurved && orthogonalMode) {
              const horizontal = Math.abs(endpoint.y - anchor.y) < 0.001;
              const perpOffset = horizontal ? Math.abs(shift.y) : Math.abs(shift.x);
              if (perpOffset >= ORTHO_AXIS_TOL) canApply = false;
            }

            if (canApply) {
              endpoint = { x: endpoint.x + shift.x, y: endpoint.y + shift.y };
            }

            endpoint = constrainEndpoint(
              endpoint, anchor, original, isStart,
              orthogonalMode, !!original.lockDirection, !!original.lockLength,
            );
          }

          return isStart
            ? { ...wall, start: endpoint }
            : { ...wall, end: endpoint };
        }

        return wall;
      }),
    );
  }, [
    state, setWalls, axes, orthogonalMode,
    originalRef, dragStartRef, originalGroupRef, dragActivatedRef, walls,
  ]);

  return { moveEdit };
             }
