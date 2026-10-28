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

const SNAP_INDICATOR_DIST = 0.10; // 10cm — تظهر الدوائر
const SNAP_DIST = 0.05;           // 5cm — يطبق الالتصاق
const ORTHO_AXIS_TOL = 0.005;     // 5mm — للتمديد في الزاوية القائمة

export interface SnapIndicatorPoint {
  point: Point;
  type: 'inner' | 'outer';
}

export interface SnapIndicators {
  draggedPoints: SnapIndicatorPoint[];
  targetPoints: SnapIndicatorPoint[];
}

interface DragState {
  selectedIds: string[];
  editType: 'none' | 'move' | 'extendStart' | 'extendEnd';
}

interface EndpointPair {
  sourcePoint: Point;
  targetPoint: Point;
  draggedOuter: Point;
  draggedInner: Point;
  targetOuter: Point;
  targetInner: Point;
  distance: number;
}

function getEndpointPoints(wall: Wall, isStart: boolean): { outer: Point; inner: Point } | null {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (!geo) return null;
    const angle = isStart ? geo.startAngle : geo.endAngle;
    return {
      outer: { x: geo.center.x + Math.cos(angle) * geo.outerRadius, y: geo.center.y + Math.sin(angle) * geo.outerRadius },
      inner: { x: geo.center.x + Math.cos(angle) * geo.innerRadius, y: geo.center.y + Math.sin(angle) * geo.innerRadius },
    };
  }
  const rect = wallRectangle(wall);
  if (isStart) return { outer: { ...rect.corners[0] }, inner: { ...rect.corners[3] } };
  return { outer: { ...rect.corners[1] }, inner: { ...rect.corners[2] } };
}

function findEndpointPair(
  walls: Wall[],
  draggedWall: Wall,
  excludeIds: string[],
  checkStart: boolean,
  checkEnd: boolean,
): EndpointPair | null {
  const others = walls.filter(w => !excludeIds.includes(w.id));
  if (others.length === 0) return null;

  let best: EndpointPair | null = null;
  const draggedEnds: boolean[] = [];
  if (checkStart) draggedEnds.push(true);
  if (checkEnd) draggedEnds.push(false);

  for (const dIsStart of draggedEnds) {
    const dPts = getEndpointPoints(draggedWall, dIsStart);
    if (!dPts) continue;

    for (const otherWall of others) {
      for (const tIsStart of [true, false]) {
        const tPts = getEndpointPoints(otherWall, tIsStart);
        if (!tPts) continue;

        const combos = [
          { s: dPts.outer, t: tPts.outer },
          { s: dPts.outer, t: tPts.inner },
          { s: dPts.inner, t: tPts.outer },
          { s: dPts.inner, t: tPts.inner },
        ];

        for (const { s, t } of combos) {
          const dist = distance(s, t);
          if (!best || dist < best.distance) {
            best = {
              sourcePoint: s,
              targetPoint: t,
              draggedOuter: dPts.outer,
              draggedInner: dPts.inner,
              targetOuter: tPts.outer,
              targetInner: tPts.inner,
              distance: dist,
            };
          }
        }
      }
    }
  }
  return best;
}

function getWallDragPoints(wall: Wall): Point[] {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
      const dir = geo.anticlockwise ? -1 : 1;
      const a1 = geo.startAngle;
      const a2 = geo.startAngle + dir * span;
      return [
        wall.start, wall.end,
        { x: geo.center.x + Math.cos(a1) * geo.outerRadius, y: geo.center.y + Math.sin(a1) * geo.outerRadius },
        { x: geo.center.x + Math.cos(a1) * geo.innerRadius, y: geo.center.y + Math.sin(a1) * geo.innerRadius },
        { x: geo.center.x + Math.cos(a2) * geo.outerRadius, y: geo.center.y + Math.sin(a2) * geo.outerRadius },
        { x: geo.center.x + Math.cos(a2) * geo.innerRadius, y: geo.center.y + Math.sin(a2) * geo.innerRadius },
      ];
    }
    return [wall.start, wall.end];
  }
  const rect = wallRectangle(wall);
  const midS = { x: (rect.corners[0].x + rect.corners[3].x) / 2, y: (rect.corners[0].y + rect.corners[3].y) / 2 };
  const midE = { x: (rect.corners[1].x + rect.corners[2].x) / 2, y: (rect.corners[1].y + rect.corners[2].y) / 2 };
  return [wall.start, wall.end, rect.corners[0], rect.corners[3], midS, rect.corners[1], rect.corners[2], midE];
}

function getStartDragPoints(wall: Wall): Point[] {
  const ep = getEndpointPoints(wall, true);
  return ep ? [wall.start, ep.outer, ep.inner] : [wall.start];
}

function getEndDragPoints(wall: Wall): Point[] {
  const ep = getEndpointPoints(wall, false);
  return ep ? [wall.end, ep.outer, ep.inner] : [wall.end];
}

function findBestShift(points: Point[], walls: Wall[], excludeIds: string[]): Point | null {
  const otherWalls = walls.filter(w => !excludeIds.includes(w.id));
  if (otherWalls.length === 0) return null;
  let bestShift: Point | null = null;
  let bestDist = SNAP_INDICATOR_DIST;
  for (const point of points) {
    const snap = findSnapToFace(point, otherWalls, undefined, SNAP_INDICATOR_DIST);
    if (!snap) continue;
    const d = distance(point, snap.point);
    if (d < bestDist) {
      bestDist = d;
      bestShift = { x: snap.point.x - point.x, y: snap.point.y - point.y };
    }
  }
  if (!bestShift) return null;
  return bestDist <= SNAP_DIST ? bestShift : null;
}

function constrainEndpoint(
  point: Point, anchor: Point, original: Wall, isStart: boolean,
  orthogonalMode: boolean, lockDirection: boolean, lockLength: boolean,
): Point {
  let result = { ...point };
  const isCurved = !!original.curveRadius;
  if (!isCurved && orthogonalMode) {
    const dx = Math.abs(result.x - anchor.x);
    const dy = Math.abs(result.y - anchor.y);
    result = dx > dy ? { x: result.x, y: anchor.y } : { x: anchor.x, y: result.y };
  } else if (lockDirection && !isCurved) {
    const angle = snapAngle(getAngle(original.start, original.end), orthogonalMode ? Math.PI / 4 : 0.1);
    const horizontal = Math.abs(angle) < 0.001 || Math.abs(Math.abs(angle) - Math.PI) < 0.001;
    result = horizontal ? { x: result.x, y: anchor.y } : { x: anchor.x, y: result.y };
  } else if (!isCurved) {
    const angle = getAngle(anchor, result);
    const snapped = snapAngle(angle, 0.01);
    if (snapped !== angle) {
      const len = distance(anchor, result);
      result = { x: anchor.x + Math.cos(snapped) * len, y: anchor.y + Math.sin(snapped) * len };
    }
  }
  if (lockLength) {
    const origLen = distance(original.start, original.end);
    const dir = normalize({ x: result.x - anchor.x, y: result.y - anchor.y });
    result = { x: anchor.x + dir.x * origLen, y: anchor.y + dir.y * origLen };
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
  setSnapIndicators?: (indicators: SnapIndicators | null) => void,
) {
  const moveEdit = useCallback((pt: Point) => {
    const original = originalRef.current;
    const start = dragStartRef.current;
    if (!original || !start || state.selectedIds.length === 0 || state.editType === 'none') return;

    const dx = pt.x - start.x;
    const dy = pt.y - start.y;

    if (!dragActivatedRef.current) {
      if (Math.hypot(dx, dy) < MIN_MOVE_FOR_DRAG) return;
      dragActivatedRef.current = true;
    }

    const selectedIds = state.selectedIds;
    const isCurved = !!original.curveRadius;

    // ══════════════════════════════════════════════
    // تمديد مجموعة
    // ══════════════════════════════════════════════
    if (selectedIds.length > 1 && (state.editType === 'extendStart' || state.editType === 'extendEnd')) {
      const pivot = state.editType === 'extendStart' ? original.start : original.end;
      let target = { x: pivot.x + dx, y: pivot.y + dy };
      const otherWalls = walls.filter(w => !selectedIds.includes(w.id));
      const snap = findSnapToFace(target, otherWalls, undefined, SNAP_INDICATOR_DIST);
      if (snap && distance(target, snap.point) <= SNAP_DIST) {
        target = snap.point;
      }
      setWalls(prev => prev.map(wall => {
        if (!selectedIds.includes(wall.id)) return wall;
        let ns = wall.start, ne = wall.end;
        if (Math.hypot(wall.start.x - pivot.x, wall.start.y - pivot.y) < CORNER_TOL) ns = target;
        if (Math.hypot(wall.end.x - pivot.x, wall.end.y - pivot.y) < CORNER_TOL) ne = target;
        return { ...wall, start: ns, end: ne };
      }));
      setSnapIndicators?.(null);
      return;
    }

    // ══════════════════════════════════════════════
    // تحريك مجموعة
    // ══════════════════════════════════════════════
    if (selectedIds.length > 1 && state.editType === 'move') {
      if (original.lockMove) return;
      const group = originalGroupRef.current;
      const moving = group.filter(w => selectedIds.includes(w.id));
      const pts = moving.flatMap(w => getWallDragPoints({
        ...w,
        start: { x: w.start.x + dx, y: w.start.y + dy },
        end: { x: w.end.x + dx, y: w.end.y + dy },
      }));
      const shift = findBestShift(pts, walls, selectedIds);
      const finalDx = dx + (shift?.x ?? 0);
      const finalDy = dy + (shift?.y ?? 0);
      setWalls(prev => prev.map(wall => {
        if (!selectedIds.includes(wall.id)) return wall;
        const orig = group.find(w => w.id === wall.id);
        if (!orig) return wall;
        return { ...wall, start: { x: orig.start.x + finalDx, y: orig.start.y + finalDy }, end: { x: orig.end.x + finalDx, y: orig.end.y + finalDy } };
      }));
      setSnapIndicators?.(null);
      return;
    }

    // ══════════════════════════════════════════════
    // جدار منفرد
    // ══════════════════════════════════════════════
    setWalls(prevWalls => prevWalls.map(wall => {
      if (!selectedIds.includes(wall.id)) return wall;

      if (state.editType === 'move') {
        if (original.lockMove) return wall;

        let rawStart: Point = { x: original.start.x + dx, y: original.start.y + dy };
        let rawEnd: Point = { x: original.end.x + dx, y: original.end.y + dy };

        // قيد الحركة الحرة في وضع الزاوية القائمة
        if (orthogonalMode && !isCurved) {
          const horizontal = Math.abs(dx) >= Math.abs(dy);
          if (horizontal) { rawStart.y = original.start.y; rawEnd.y = original.end.y; }
          else { rawStart.x = original.start.x; rawEnd.x = original.end.x; }
        }

        const tempWall = { ...wall, start: rawStart, end: rawEnd };

        // ✅ أولاً: فحص نقاط الأطراف
        const ep = findEndpointPair(walls, tempWall, selectedIds, true, true);
        let finalStart = rawStart;
        let finalEnd = rawEnd;
        let snapApplied = false;

        if (ep && ep.distance <= SNAP_INDICATOR_DIST) {
          setSnapIndicators?.({
            draggedPoints: [
              { point: ep.draggedOuter, type: 'outer' },
              { point: ep.draggedInner, type: 'inner' },
            ],
            targetPoints: [
              { point: ep.targetOuter, type: 'outer' },
              { point: ep.targetInner, type: 'inner' },
            ],
          });

          if (ep.distance <= SNAP_DIST) {
            const sh = { x: ep.targetPoint.x - ep.sourcePoint.x, y: ep.targetPoint.y - ep.sourcePoint.y };
            finalStart = { x: rawStart.x + sh.x, y: rawStart.y + sh.y };
            finalEnd = { x: rawEnd.x + sh.x, y: rawEnd.y + sh.y };
            snapApplied = true;
          }
        } else {
          setSnapIndicators?.(null);
        }

        // ✅ ثانياً: إذا لم يلتصق، جرب الحواف
        if (!snapApplied) {
          const shift = findBestShift(getWallDragPoints(tempWall), prevWalls, selectedIds);
          if (shift) {
            finalStart = { x: rawStart.x + shift.x, y: rawStart.y + shift.y };
            finalEnd = { x: rawEnd.x + shift.x, y: rawEnd.y + shift.y };
          }
        }

        return { ...wall, start: finalStart, end: finalEnd };
      }

      if (state.editType === 'extendStart' || state.editType === 'extendEnd') {
        const isStart = state.editType === 'extendStart';
        const anchor = isStart ? original.end : original.start;
        const initial = isStart ? original.start : original.end;

        let endpoint = { x: initial.x + dx, y: initial.y + dy };
        endpoint = constrainEndpoint(endpoint, anchor, original, isStart, orthogonalMode, !!original.lockDirection, !!original.lockLength);

        const tempWall = isStart ? { ...wall, start: endpoint } : { ...wall, end: endpoint };

        // ✅ فحص نقاط الأطراف (فقط الطرف المتحرك)
        const ep = findEndpointPair(walls, tempWall, selectedIds, isStart, !isStart);
        let snapApplied = false;

        if (ep && ep.distance <= SNAP_INDICATOR_DIST) {
          setSnapIndicators?.({
            draggedPoints: [
              { point: ep.draggedOuter, type: 'outer' },
              { point: ep.draggedInner, type: 'inner' },
            ],
            targetPoints: [
              { point: ep.targetOuter, type: 'outer' },
              { point: ep.targetInner, type: 'inner' },
            ],
          });

          if (ep.distance <= SNAP_DIST) {
            const sh = { x: ep.targetPoint.x - ep.sourcePoint.x, y: ep.targetPoint.y - ep.sourcePoint.y };

            // في الزاوية القائمة: نرفض إذا تطلب ميلاناً > 5mm
            let canApply = true;
            if (orthogonalMode && !isCurved) {
              const horizontal = Math.abs(endpoint.y - anchor.y) < 0.001;
              const perp = horizontal ? Math.abs(sh.y) : Math.abs(sh.x);
              if (perp >= ORTHO_AXIS_TOL) canApply = false;
            }

            if (canApply) {
              endpoint = { x: endpoint.x + sh.x, y: endpoint.y + sh.y };
              snapApplied = true;
            }
          }
        } else {
          setSnapIndicators?.(null);
        }

        // fallback: حواف
        if (!snapApplied) {
          const points = isStart ? getStartDragPoints(tempWall) : getEndDragPoints(tempWall);
          const shift = findBestShift(points, prevWalls, selectedIds);
          if (shift) {
            let canApply = true;
            if (!isCurved && orthogonalMode) {
              const horizontal = Math.abs(endpoint.y - anchor.y) < 0.001;
              const perp = horizontal ? Math.abs(shift.y) : Math.abs(shift.x);
              if (perp >= ORTHO_AXIS_TOL) canApply = false;
            }
            if (canApply) endpoint = { x: endpoint.x + shift.x, y: endpoint.y + shift.y };
          }
        }

        endpoint = constrainEndpoint(endpoint, anchor, original, isStart, orthogonalMode, !!original.lockDirection, !!original.lockLength);

        return isStart ? { ...wall, start: endpoint } : { ...wall, end: endpoint };
      }

      return wall;
    }));
  }, [state, setWalls, axes, orthogonalMode, originalRef, dragStartRef, originalGroupRef, dragActivatedRef, walls, setSnapIndicators]);

  return { moveEdit };
}
