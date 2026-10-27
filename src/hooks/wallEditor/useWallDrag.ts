import { useCallback } from 'react';
import type { Point, Wall, Axis } from '../../core/types';
import { distance, getAngle, snapAngle, normalize, wallRectangle } from '../../core/geometry';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
import { findSnapToFace } from '../../core/snapToFace';
import { CORNER_TOL, MIN_MOVE_FOR_DRAG } from './helpers';

const SNAP_DIST = 0.05; // 5 سم

interface DragState {
  selectedIds: string[];
  editType: 'none' | 'move' | 'extendStart' | 'extendEnd';
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
        wall.start,
        wall.end,
        { x: geo.center.x + Math.cos(a1) * geo.outerRadius, y: geo.center.y + Math.sin(a1) * geo.outerRadius },
        { x: geo.center.x + Math.cos(a1) * geo.innerRadius, y: geo.center.y + Math.sin(a1) * geo.innerRadius },
        { x: geo.center.x + Math.cos(a2) * geo.outerRadius, y: geo.center.y + Math.sin(a2) * geo.outerRadius },
        { x: geo.center.x + Math.cos(a2) * geo.innerRadius, y: geo.center.y + Math.sin(a2) * geo.innerRadius },
      ];
    }
    return [wall.start, wall.end];
  }
  const rect = wallRectangle(wall);
  const midStart = { x: (rect.corners[0].x + rect.corners[3].x) / 2, y: (rect.corners[0].y + rect.corners[3].y) / 2 };
  const midEnd = { x: (rect.corners[1].x + rect.corners[2].x) / 2, y: (rect.corners[1].y + rect.corners[2].y) / 2 };
  return [
    wall.start, wall.end,
    rect.corners[0], rect.corners[3], midStart,
    rect.corners[1], rect.corners[2], midEnd,
  ];
}

function getStartDragPoints(wall: Wall): Point[] {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);
    if (geo) {
      const a1 = geo.startAngle;
      return [
        wall.start,
        { x: geo.center.x + Math.cos(a1) * geo.outerRadius, y: geo.center.y + Math.sin(a1) * geo.outerRadius },
        { x: geo.center.x + Math.cos(a1) * geo.innerRadius, y: geo.center.y + Math.sin(a1) * geo.innerRadius },
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
      const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
      const dir = geo.anticlockwise ? -1 : 1;
      const a2 = geo.startAngle + dir * span;
      return [
        wall.end,
        { x: geo.center.x + Math.cos(a2) * geo.outerRadius, y: geo.center.y + Math.sin(a2) * geo.outerRadius },
        { x: geo.center.x + Math.cos(a2) * geo.innerRadius, y: geo.center.y + Math.sin(a2) * geo.innerRadius },
      ];
    }
    return [wall.end];
  }
  const rect = wallRectangle(wall);
  return [wall.end, rect.corners[1], rect.corners[2]];
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

    if (!dragActivatedRef.current) {
      if (Math.hypot(totalDx, totalDy) < MIN_MOVE_FOR_DRAG) return;
      dragActivatedRef.current = true;
    }

    const dx = pt.x - start.x;
    const dy = pt.y - start.y;

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

        let isMovingHorizontally = false;
        if (orthogonalMode && !isCurved) {
          if (Math.abs(dx) > Math.abs(dy)) {
            rawStart.y = original.start.y;
            rawEnd.y = original.end.y;
            isMovingHorizontally = true;
          } else {
            rawStart.x = original.start.x;
            rawEnd.x = original.end.x;
            isMovingHorizontally = false;
          }
        }

        const tempWall = { ...wall, start: rawStart, end: rawEnd };
        const allPoints = getWallDragPoints(tempWall);
        
        let bestShift: Point | null = null;
        let bestDist = Infinity;

        for (const p of allPoints) {
          const snap = findSnapToFace(p, prevWalls, state.selectedIds[0], SNAP_DIST);
          if (snap) {
            const d = distance(p, snap.point);
            if (d < bestDist) {
              bestDist = d;
              bestShift = { x: snap.point.x - p.x, y: snap.point.y - p.y };
            }
          }
        }

        let finalStart = rawStart;
        let finalEnd = rawEnd;

        if (bestShift) {
          // ✅ في وضع الزاوية القائمة: نسمح فقط بالالتصاق إذا كان الفرق في المحور الممنوع < 5 مم
          const MAX_TILT = 0.005;
          let canSnap = true;

          if (orthogonalMode && !isCurved) {
            if (isMovingHorizontally && Math.abs(bestShift.y) > MAX_TILT) canSnap = false;
            else if (!isMovingHorizontally && Math.abs(bestShift.x) > MAX_TILT) canSnap = false;
          }

          if (canSnap) {
            // ✅ نطبق الإزاحة الكاملة (X و Y) لكي تلتصق النقطة بالضبط على الهدف
            finalStart = { x: rawStart.x + bestShift.x, y: rawStart.y + bestShift.y };
            finalEnd = { x: rawEnd.x + bestShift.x, y: rawEnd.y + bestShift.y };
          }
        } else if (axes.length > 0 && !isCurved) {
          const dx2 = Math.abs(rawEnd.x - rawStart.x);
          const dy2 = Math.abs(rawEnd.y - rawStart.y);
          const halfThick = wall.thickness / 2;
          if (dx2 > dy2) {
            const nearAxis = axes.find(a => a.type === 'horizontal' && Math.abs(rawStart.y - (a.position - a.offset + halfThick)) < 0.5);
            if (nearAxis) {
              const adjustedY = nearAxis.position - nearAxis.offset - halfThick;
              finalStart = { ...finalStart, y: adjustedY };
              finalEnd = { ...finalEnd, y: adjustedY };
            }
          } else {
            const nearAxis = axes.find(a => a.type === 'vertical' && Math.abs(rawStart.x - (a.position + a.offset - halfThick)) < 0.5);
            if (nearAxis) {
              const adjustedX = nearAxis.position + nearAxis.offset + halfThick;
              finalStart = { ...finalStart, x: adjustedX };
              finalEnd = { ...finalEnd, x: adjustedX };
            }
          }
        }
        return { ...wall, start: finalStart, end: finalEnd };
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

        if (!isCurved && orthogonalMode) {
          const snap = findSnapToFace(ns, prevWalls, state.selectedIds[0], SNAP_DIST);
          if (snap) {
            const isHorizontal = Math.abs(ns.y - original.end.y) < 0.001;
            if (isHorizontal) {
              if (Math.abs(snap.point.y - original.end.y) < 0.01) ns = { x: snap.point.x, y: original.end.y };
            } else {
              if (Math.abs(snap.point.x - original.end.x) < 0.01) ns = { x: original.end.x, y: snap.point.y };
            }
          }
        } else {
          const tempWall = { ...wall, start: ns };
          const startPoints = getStartDragPoints(tempWall);
          
          let bestShift: Point | null = null;
          let bestDist = Infinity;

          for (const p of startPoints) {
            const snap = findSnapToFace(p, prevWalls, state.selectedIds[0], SNAP_DIST);
            if (snap) {
              const d = distance(p, snap.point);
              if (d < bestDist) {
                bestDist = d;
                bestShift = { x: snap.point.x - p.x, y: snap.point.y - p.y };
              }
            }
          }

          if (bestShift) {
            ns = { x: ns.x + bestShift.x, y: ns.y + bestShift.y };
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

        if (!isCurved && orthogonalMode) {
          const snap = findSnapToFace(ne, prevWalls, state.selectedIds[0], SNAP_DIST);
          if (snap) {
            const isHorizontal = Math.abs(ne.y - original.start.y) < 0.001;
            if (isHorizontal) {
              if (Math.abs(snap.point.y - original.start.y) < 0.01) ne = { x: snap.point.x, y: original.start.y };
            } else {
              if (Math.abs(snap.point.x - original.start.x) < 0.01) ne = { x: original.start.x, y: snap.point.y };
            }
          }
        } else {
          const tempWall = { ...wall, end: ne };
          const endPoints = getEndDragPoints(tempWall);
          
          let bestShift: Point | null = null;
          let bestDist = Infinity;

          for (const p of endPoints) {
            const snap = findSnapToFace(p, prevWalls, state.selectedIds[0], SNAP_DIST);
            if (snap) {
              const d = distance(p, snap.point);
              if (d < bestDist) {
                bestDist = d;
                bestShift = { x: snap.point.x - p.x, y: snap.point.y - p.y };
              }
            }
          }

          if (bestShift) {
            ne = { x: ne.x + bestShift.x, y: ne.y + bestShift.y };
          }
        }
        return { ...wall, end: ne };
      }

      return wall;
    }));
  }, [state, setWalls, axes, orthogonalMode, originalRef, dragStartRef, originalGroupRef, dragActivatedRef]);

  return { moveEdit };
  }
