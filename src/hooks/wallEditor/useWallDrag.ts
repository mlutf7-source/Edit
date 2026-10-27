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

const SNAP_DIST = 0.05;
const ORTHOGONAL_TOL = 0.005;
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
      const span = getArcSpan(
        geo.startAngle,
        geo.endAngle,
        dir,
      );
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
      const span = getArcSpan(
        geo.startAngle,
        geo.endAngle,
        dir,
      );
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

/** ✅ التعديل الجوهري #1: تصفية الجدران قبل البحث */
function getBestSnapShift(
  points: Point[],
  walls: Wall[],
  excludeIds: string[],
): Point | null {
  // ✅ نستبعد الجدران المسحوبة من قائمة البحث أولاً
  const otherWalls = walls.filter(w => !excludeIds.includes(w.id));

  if (otherWalls.length === 0) return null;

  let bestShift: Point | null = null;
  let bestDist = SNAP_DIST;

  for (const point of points) {
    const snap = findSnapToFace(
      point,
      otherWalls,
      undefined,
      SNAP_DIST,
    );

    if (!snap) continue;

    const d = distance(point, snap.point);

    if (d <= bestDist) {
      bestDist = d;
      bestShift = {
        x: snap.point.x - point.x,
        y: snap.point.y - point.y,
      };
    }
  }

  return bestShift;
}

/** ✅ التعديل الجوهري #2: فحص الإزاحة العمودية بدقة رياضية */
function constrainOrthogonalMove(
  shift: Point,
  axisDir: Point,
): Point | null {
  // perpOffset = |shift · perp(axisDir)|
  const perpOffset = Math.abs(
    shift.x * -axisDir.y + shift.y * axisDir.x,
  );

  if (perpOffset >= ORTHOGONAL_TOL) {
    return null; // نرفض الالتصاق لأنه يتطلب ميلاناً
  }

  // نطبق الإزاحة الموازية للمحور فقط
  const proj = shift.x * axisDir.x + shift.y * axisDir.y;
  return {
    x: axisDir.x * proj,
    y: axisDir.y * proj,
  };
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
    const originalLength = distance(
      original.start,
      original.end,
    );
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

    if (
      !original ||
      !start ||
      state.selectedIds.length === 0 ||
      state.editType === 'none'
    ) {
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
    // حالة 1: تمديد مجموعة محددة
    // ══════════════════════════════════════════════
    if (
      selectedIds.length > 1 &&
      (state.editType === 'extendStart' ||
        state.editType === 'extendEnd')
    ) {
      const pivot = state.editType === 'extendStart'
        ? original.start
        : original.end;

      let target = { x: pivot.x + dx, y: pivot.y + dy };

      const snap = findSnapToFace(
        target,
        walls.filter(w => !selectedIds.includes(w.id)),
        undefined,
        SNAP_DIST,
      );

      if (snap) {
        target = snap.point;
      }

      setWalls(prevWalls =>
        prevWalls.map(wall => {
          if (!selectedIds.includes(wall.id)) return wall;

          let newStart = wall.start;
          let newEnd = wall.end;

          if (
            Math.hypot(
              wall.start.x - pivot.x,
              wall.start.y - pivot.y,
            ) < CORNER_TOL
          ) {
            newStart = target;
          }

          if (
            Math.hypot(
              wall.end.x - pivot.x,
              wall.end.y - pivot.y,
            ) < CORNER_TOL
          ) {
            newEnd = target;
          }

          return {
            ...wall,
            start: newStart,
            end: newEnd,
          };
        }),
      );

      return;
    }

    // ══════════════════════════════════════════════
    // حالة 2: تحريك مجموعة كاملة
    // ══════════════════════════════════════════════
    if (selectedIds.length > 1 && state.editType === 'move') {
      if (original.lockMove) return;

      const group = originalGroupRef.current;
      const movingWalls = group.filter(w => selectedIds.includes(w.id));
      const movingPoints = movingWalls.flatMap(w => getWallDragPoints({
        ...w,
        start: { x: w.start.x + dx, y: w.start.y + dy },
        end: { x: w.end.x + dx, y: w.end.y + dy },
      }));

      const shift = getBestSnapShift(
        movingPoints,
        walls,
        selectedIds,
      );

      let shiftX = dx;
      let shiftY = dy;

      if (shift) {
        const horizontal = Math.abs(dx) >= Math.abs(dy);
        const axisDir = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 };

        const constrained = orthogonalMode
          ? constrainOrthogonalMove(shift, axisDir)
          : shift;

        if (constrained) {
          shiftX += constrained.x;
          shiftY += constrained.y;
        }
      }

      setWalls(prevWalls =>
        prevWalls.map(wall => {
          if (!selectedIds.includes(wall.id)) return wall;

          const orig = group.find(w => w.id === wall.id);
          if (!orig) return wall;

          return {
            ...wall,
            start: {
              x: orig.start.x + shiftX,
              y: orig.start.y + shiftY,
            },
            end: {
              x: orig.end.x + shiftX,
              y: orig.end.y + shiftY,
            },
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

        // ---------- 3a: تحريك ----------
        if (state.editType === 'move') {
          if (original.lockMove) return wall;

          let rawStart: Point = {
            x: original.start.x + dx,
            y: original.start.y + dy,
          };
          let rawEnd: Point = {
            x: original.end.x + dx,
            y: original.end.y + dy,
          };

          let horizontal = Math.abs(dx) >= Math.abs(dy);

          if (orthogonalMode && !isCurved) {
            if (horizontal) {
              rawStart.y = original.start.y;
              rawEnd.y = original.end.y;
            } else {
              rawStart.x = original.start.x;
              rawEnd.x = original.end.x;
            }
          }

          const tempWall = {
            ...wall,
            start: rawStart,
            end: rawEnd,
          };

          const shift = getBestSnapShift(
            getWallDragPoints(tempWall),
            prevWalls,
            selectedIds,
          );

          let finalStart = rawStart;
          let finalEnd = rawEnd;

          if (shift) {
            const axisDir = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 };
            const constrained = orthogonalMode && !isCurved
              ? constrainOrthogonalMove(shift, axisDir)
              : shift;

            if (constrained) {
              finalStart = {
                x: rawStart.x + constrained.x,
                y: rawStart.y + constrained.y,
              };
              finalEnd = {
                x: rawEnd.x + constrained.x,
                y: rawEnd.y + constrained.y,
              };
            }
          } else if (axes.length > 0 && !isCurved) {
            const dx2 = Math.abs(rawEnd.x - rawStart.x);
            const dy2 = Math.abs(rawEnd.y - rawStart.y);
            const halfThick = wall.thickness / 2;

            if (dx2 > dy2) {
              const axis = axes.find(a =>
                a.type === 'horizontal' &&
                Math.abs(
                  rawStart.y - (a.position - a.offset + halfThick),
                ) < 0.5,
              );

              if (axis) {
                const y =
                  axis.position - axis.offset - halfThick;
                finalStart = { ...finalStart, y };
                finalEnd = { ...finalEnd, y };
              }
            } else {
              const axis = axes.find(a =>
                a.type === 'vertical' &&
                Math.abs(
                  rawStart.x - (a.position + a.offset - halfThick),
                ) < 0.5,
              );

              if (axis) {
                const x =
                  axis.position + axis.offset - halfThick;
                finalStart = { ...finalStart, x };
                finalEnd = { ...finalEnd, x };
              }
            }
          }

          return {
            ...wall,
            start: finalStart,
            end: finalEnd,
          };
        }

        // ---------- 3b: تمديد ----------
        if (
          state.editType === 'extendStart' ||
          state.editType === 'extendEnd'
        ) {
          const isStart = state.editType === 'extendStart';
          const anchor = isStart ? original.end : original.start;
          const initial = isStart ? original.start : original.end;

          let endpoint = { x: initial.x + dx, y: initial.y + dy };

          endpoint = constrainEndpoint(
            endpoint,
            anchor,
            original,
            isStart,
            orthogonalMode,
            !!original.lockDirection,
            !!original.lockLength,
          );

          const tempWall = isStart
            ? { ...wall, start: endpoint }
            : { ...wall, end: endpoint };

          const points = isStart
            ? getStartDragPoints(tempWall)
            : getEndDragPoints(tempWall);

          const shift = getBestSnapShift(
            points,
            prevWalls,
            selectedIds,
          );

          if (shift) {
            if (!isCurved && orthogonalMode) {
              const horizontal =
                Math.abs(endpoint.y - anchor.y) < 0.001;

              const axisDir = horizontal
                ? { x: 1, y: 0 }
                : { x: 0, y: 1 };

              const constrained = constrainOrthogonalMove(
                shift,
                axisDir,
              );

              if (constrained) {
                endpoint = {
                  x: endpoint.x + constrained.x,
                  y: endpoint.y + constrained.y,
                };
              }
            } else if (!original.lockLength && !original.lockDirection) {
              endpoint = {
                x: endpoint.x + shift.x,
                y: endpoint.y + shift.y,
              };
            }

            // إعادة فرض القيود بعد الالتصاق
            endpoint = constrainEndpoint(
              endpoint,
              anchor,
              original,
              isStart,
              orthogonalMode,
              !!original.lockDirection,
              !!original.lockLength,
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
    state,
    setWalls,
    axes,
    orthogonalMode,
    originalRef,
    dragStartRef,
    originalGroupRef,
    dragActivatedRef,
    walls,
  ]);

  return { moveEdit };
  }
