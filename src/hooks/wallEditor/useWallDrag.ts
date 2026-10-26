import { useCallback } from 'react';
import type { Point, Wall, Axis } from '../../core/types';
import { distance, getAngle, snapAngle, normalize, wallRectangle } from '../../core/geometry';
import { findSnapToFace, SnapPreference } from '../../core/snapToFace';
import { SNAP_THRESHOLD } from '../../core/types';
import { CORNER_TOL, MIN_MOVE_FOR_DRAG } from './helpers';

interface DragState {
  selectedIds: string[];
  editType: 'none' | 'move' | 'extendStart' | 'extendEnd';
}

/** ✅ تحديد نوع النقطة التي تم السحب منها (حافة أم مركز) */
function getPreferredType(pt: Point, wall: Wall, isStart: boolean): SnapPreference {
  if (wall.curveRadius) return 'mid';
  const rect = wallRectangle(wall);
  const outerPt = isStart ? rect.corners[0] : rect.corners[1];
  const innerPt = isStart ? rect.corners[3] : rect.corners[2];
  const midPt = {
    x: (outerPt.x + innerPt.x) / 2,
    y: (outerPt.y + innerPt.y) / 2,
  };

  const dOuter = distance(pt, outerPt);
  const dInner = distance(pt, innerPt);
  const dMid = distance(pt, midPt);

  // إذا كانت المسافة لأي حافة أقل من المسافة للمركز، نفضل الحافة
  if (Math.min(dOuter, dInner) < dMid) {
    return 'edge';
  }
  return 'mid';
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
    if (!original || !start || state.selectedIds.length === 0 || state.editType === 'none') return;

    const totalDx = pt.x - start.x;
    const totalDy = pt.y - start.y;

    // ✅ قفل الحركة لمنع القفز
    if (!dragActivatedRef.current) {
      if (Math.hypot(totalDx, totalDy) < MIN_MOVE_FOR_DRAG) return;
      dragActivatedRef.current = true;
    }

    const dx = pt.x - start.x;
    const dy = pt.y - start.y;

    // ✅ سحب مجموعة + تمديد (Vertex Drag)
    if (state.selectedIds.length > 1 && (state.editType === 'extendStart' || state.editType === 'extendEnd')) {
      const pivotPoint = state.editType === 'extendStart' ? original.start : original.end;
      const targetPoint = { x: pivotPoint.x + dx, y: pivotPoint.y + dy };
      
      setWalls(prevWalls => prevWalls.map(wall => {
        if (!state.selectedIds.includes(wall.id)) return wall;
        let newStart = wall.start;
        let newEnd = wall.end;
        if (Math.hypot(wall.start.x - pivotPoint.x, wall.start.y - pivotPoint.y) < CORNER_TOL) newStart = targetPoint;
        if (Math.hypot(wall.end.x - pivotPoint.x, wall.end.y - pivotPoint.y) < CORNER_TOL) newEnd = targetPoint;
        return { ...wall, start: newStart, end: newEnd };
      }));
      return;
    }

    // ✅ سحب مجموعة كاملة (Move)
    if (state.selectedIds.length > 1 && state.editType === 'move') {
      if (original.lockMove) return;
      setWalls(prevWalls => prevWalls.map(wall => {
        if (!state.selectedIds.includes(wall.id)) return wall;
        const orig = originalGroupRef.current.find(o => o.id === wall.id);
        if (!orig) return wall;
        return {
          ...wall,
          start: { x: orig.start.x + dx, y: orig.start.y + dy },
          end: { x: orig.end.x + dx, y: orig.end.y + dy },
        };
      }));
      return;
    }

    const { editType } = state;
    const lockDirection = original.lockDirection;
    const lockLength = original.lockLength;
    const isCurved = !!original.curveRadius;

    setWalls(prevWalls => prevWalls.map(wall => {
      if (!state.selectedIds.includes(wall.id)) return wall;

      if (editType === 'move') {
        if (original.lockMove) return wall;
        
        let rawStart: Point = { x: original.start.x + dx, y: original.start.y + dy };
        let rawEnd: Point = { x: original.end.x + dx, y: original.end.y + dy };

        if (orthogonalMode) {
          if (Math.abs(dx) > Math.abs(dy)) {
            rawStart.y = original.start.y;
            rawEnd.y = original.end.y;
          } else {
            rawStart.x = original.start.x;
            rawEnd.x = original.end.x;
          }
        }

        const snapStart = findSnapToFace(rawStart, prevWalls, state.selectedIds[0], SNAP_THRESHOLD);
        const snapEnd = findSnapToFace(rawEnd, prevWalls, state.selectedIds[0], SNAP_THRESHOLD);

        let bestSnap: { point: Point; type: 'start' | 'end' } | null = null;
        let minDist = Infinity;

        if (snapStart) {
          const d = distance(rawStart, snapStart.point);
          if (d < minDist) { minDist = d; bestSnap = { point: snapStart.point, type: 'start' }; }
        }
        if (snapEnd) {
          const d = distance(rawEnd, snapEnd.point);
          if (d < minDist) { minDist = d; bestSnap = { point: snapEnd.point, type: 'end' }; }
        }

        if (bestSnap) {
          const origPoint = bestSnap.type === 'start' ? rawStart : rawEnd;
          const snapDx = bestSnap.point.x - origPoint.x;
          const snapDy = bestSnap.point.y - origPoint.y;
          rawStart = { x: rawStart.x + snapDx, y: rawStart.y + snapDy };
          rawEnd = { x: rawEnd.x + snapDx, y: rawEnd.y + snapDy };
        } else if (axes.length > 0) {
          const dx2 = Math.abs(rawEnd.x - rawStart.x);
          const dy2 = Math.abs(rawEnd.y - rawStart.y);
          const halfThick = wall.thickness / 2;
          if (dx2 > dy2) {
            const nearAxis = axes.find(a => a.type === 'horizontal' && Math.abs(rawStart.y - (a.position - a.offset + halfThick)) < 0.5);
            if (nearAxis) {
              const adjustedY = nearAxis.position - nearAxis.offset - halfThick;
              rawStart = { ...rawStart, y: adjustedY };
              rawEnd = { ...rawEnd, y: adjustedY };
            }
          } else {
            const nearAxis = axes.find(a => a.type === 'vertical' && Math.abs(rawStart.x - (a.position + a.offset - halfThick)) < 0.5);
            if (nearAxis) {
              const adjustedX = nearAxis.position + nearAxis.offset + halfThick;
              rawStart = { ...rawStart, x: adjustedX };
              rawEnd = { ...rawEnd, x: adjustedX };
            }
          }
        }
        return { ...wall, start: rawStart, end: rawEnd };
      }

      if (editType === 'extendStart') {
        let ns: Point = { x: original.start.x + dx, y: original.start.y + dy };
        
        if (!isCurved && orthogonalMode) {
          const dx2 = Math.abs(ns.x - original.end.x);
          const dy2 = Math.abs(ns.y - original.end.y);
          if (dx2 > dy2) ns = { x: ns.x, y: original.end.y }; 
          else ns = { x: original.end.x, y: ns.y };
        } else if (lockDirection) {
          const tol = orthogonalMode ? Math.PI / 4 : 0.1;
          const ang = snapAngle(getAngle(original.start, original.end), tol);
          const horizontal = Math.abs(ang) < 0.001 || Math.abs(ang - Math.PI) < 0.001;
          ns = horizontal ? { x: ns.x, y: original.start.y } : { x: original.start.x, y: ns.y };
        } else if (!isCurved) {
          const anchor = original.end;
          const angle = getAngle(anchor, ns);
          const SNAP_TOL = 0.01;
          const snappedAngle = snapAngle(angle, SNAP_TOL);
          
          if (snappedAngle !== angle) {
             const len = distance(anchor, ns);
             ns = {
               x: anchor.x + Math.cos(snappedAngle) * len,
               y: anchor.y + Math.sin(snappedAngle) * len
             };
          }
        }

        if (lockLength) {
          const dir = normalize({ x: original.end.x - ns.x, y: original.end.y - ns.y });
          const len = distance(original.start, original.end);
          ns = { x: original.end.x - dir.x * len, y: original.end.y - dir.y * len };
        }

        // ✅ تمرير نوع النقطة المفضلة (بناءً على مكان بداية السحب)
        const preferredType = getPreferredType(start, original, true);
        const snap = findSnapToFace(ns, prevWalls, state.selectedIds[0], SNAP_THRESHOLD, preferredType);
        
        if (snap) {
          if (!isCurved && orthogonalMode) {
            const isHorizontal = Math.abs(ns.y - original.end.y) < 0.001;
            if (isHorizontal) {
              if (Math.abs(snap.point.y - original.end.y) < 0.01) ns = { x: snap.point.x, y: original.end.y };
            } else {
              if (Math.abs(snap.point.x - original.end.x) < 0.01) ns = { x: original.end.x, y: snap.point.y };
            }
          } else {
            ns = snap.point;
          }
        }
        return { ...wall, start: ns };
      }

      if (editType === 'extendEnd') {
        let ne: Point = { x: original.end.x + dx, y: original.end.y + dy };
        
        if (!isCurved && orthogonalMode) {
          const dx2 = Math.abs(ne.x - original.start.x);
          const dy2 = Math.abs(ne.y - original.start.y);
          if (dx2 > dy2) ne = { x: ne.x, y: original.start.y };
          else ne = { x: original.start.x, y: ne.y };
        } else if (lockDirection) {
          const tol = orthogonalMode ? Math.PI / 4 : 0.1;
          const ang = snapAngle(getAngle(original.start, original.end), tol);
          const horizontal = Math.abs(ang) < 0.001 || Math.abs(ang - Math.PI) < 0.001;
          ne = horizontal ? { x: ne.x, y: original.end.y } : { x: original.end.x, y: ne.y };
        } else if (!isCurved) {
          const anchor = original.start;
          const angle = getAngle(anchor, ne);
          const SNAP_TOL = 0.01;
          const snappedAngle = snapAngle(angle, SNAP_TOL);
          
          if (snappedAngle !== angle) {
             const len = distance(anchor, ne);
             ne = {
               x: anchor.x + Math.cos(snappedAngle) * len,
               y: anchor.y + Math.sin(snappedAngle) * len
             };
          }
        }

        if (lockLength) {
          const dir = normalize({ x: ne.x - original.start.x, y: ne.y - original.start.y });
          const len = distance(original.start, original.end);
          ne = { x: original.start.x + dir.x * len, y: original.start.y + dir.y * len };
        }

        // ✅ تمرير نوع النقطة المفضلة (بناءً على مكان بداية السحب)
        const preferredType = getPreferredType(start, original, false);
        const snap = findSnapToFace(ne, prevWalls, state.selectedIds[0], SNAP_THRESHOLD, preferredType);
        
        if (snap) {
          if (!isCurved && orthogonalMode) {
            const isHorizontal = Math.abs(ne.y - original.start.y) < 0.001;
            if (isHorizontal) {
              if (Math.abs(snap.point.y - original.start.y) < 0.01) ne = { x: snap.point.x, y: original.start.y };
            } else {
              if (Math.abs(snap.point.x - original.start.x) < 0.01) ne = { x: original.start.x, y: snap.point.y };
            }
          } else {
            ne = snap.point;
          }
        }
        return { ...wall, end: ne };
      }

      return wall;
    }));
  }, [state, setWalls, axes, orthogonalMode, originalRef, dragStartRef, originalGroupRef, dragActivatedRef]);

  return { moveEdit };
        }
