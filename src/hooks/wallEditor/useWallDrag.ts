
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
import { findSnapCandidates } from '../../core/snapToFace';
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
      const points: Point[] = [wall.start, wall.end];

      for (let i = 0; i <= 24; i++) {
        const angle =
          geo.startAngle + dir * span * (i / 24);

        for (const radius of [
          geo.outerRadius,
          geo.innerRadius,
          geo.radius,
        ]) {
          points.push({
            x: geo.center.x + Math.cos(angle) * radius,
            y: geo.center.y + Math.sin(angle) * radius,
          });
        }
      }

      return points;
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
    ...rect.corners,
    midStart,
    midEnd,
  ];
}

function getStartDragPoints(wall: Wall): Point[] {
  if (wall.curveRadius) {
    const geo = getCurvedWallGeometry(wall);

    if (geo) {
      return [
        wall.start,
        ...[geo.outerRadius, geo.innerRadius, geo.radius].map(
          radius => ({
            x: geo.center.x + Math.cos(geo.startAngle) * radius,
            y: geo.center.y + Math.sin(geo.startAngle) * radius,
          }),
        ),
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
      return [
        wall.end,
        ...[geo.outerRadius, geo.innerRadius, geo.radius].map(
          radius => ({
            x: geo.center.x + Math.cos(geo.endAngle) * radius,
            y: geo.center.y + Math.sin(geo.endAngle) * radius,
          }),
        ),
      ];
    }

    return [wall.end];
  }

  const rect = wallRectangle(wall);
  return [wall.end, rect.corners[1], rect.corners[2]];
}

function getBestSnapShift(
  points: Point[],
  walls: Wall[],
  excludeIds: string[],
  orthogonalMode = false,
  horizontal = true,
): Point | null {
  const candidates: Array<{
    shift: Point;
    distance: number;
  }> = [];

  const excluded = new Set(excludeIds);
  const targetWalls = walls.filter(w => !excluded.has(w.id));

  for (const point of points) {
    const snaps = findSnapCandidates(
      point,
      targetWalls,
      excludeIds,
      SNAP_DIST,
    );

    for (const snap of snaps) {
      const shift = {
        x: snap.point.x - point.x,
        y: snap.point.y - point.y,
      };

      if (
        orthogonalMode &&
        Math.abs(horizontal ? shift.y : shift.x) >
          ORTHOGONAL_TOL
      ) {
        continue;
      }

      candidates.push({
        shift,
        distance: snap.distance,
      });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.shift ?? null;
}

function constrainOrthogonalMove(
  shift: Point,
  horizontal: boolean,
): Point | null {
  const forbidden = horizontal ? shift.y : shift.x;

  if (Math.abs(forbidden) > ORTHOGONAL_TOL) {
    return null;
  }

  return horizontal
    ? { x: shift.x, y: 0 }
    : { x: 0, y: shift.y };
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
    const selectedSet = new Set(selectedIds);
    const isCurved = !!original.curveRadius;

    if (
      selectedIds.length > 1 &&
      (state.editType === 'extendStart' ||
        state.editType === 'extendEnd')
    ) {
      const pivot = state.editType === 'extendStart'
        ? original.start
        : original.end;

      const rawTarget = {
        x: pivot.x + dx,
        y: pivot.y + dy,
      };

      const snaps = findSnapCandidates(
        rawTarget,
        walls,
        selectedIds,
        SNAP_DIST,
      );

      const target = snaps[0]?.point ?? rawTarget;

      setWalls(prevWalls =>
        prevWalls.map(wall => {
          if (!selectedSet.has(wall.id)) return wall;

          const newStart =
            distance(wall.start, pivot) < CORNER_TOL
              ? target
              : wall.start;
          const newEnd =
            distance(wall.end, pivot) < CORNER_TOL
              ? target
              : wall.end;

          return { ...wall, start: newStart, end: newEnd };
        }),
      );

      return;
    }

    if (selectedIds.length > 1 && state.editType === 'move') {
      if (original.lockMove) return;

      const group = originalGroupRef.current;
      const movingWalls = group.filter(w => selectedSet.has(w.id));

      const movingPoints = movingWalls.flatMap(w =>
        getWallDragPoints({
          ...w,
          start: { x: w.start.x + dx, y: w.start.y + dy },
          end: { x: w.end.x + dx, y: w.end.y + dy },
        }),
      );

      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const shift = getBestSnapShift(
        movingPoints,
        walls,
        selectedIds,
        orthogonalMode,
        horizontal,
      );

      const shiftX = dx + (shift?.x ?? 0);
      const shiftY = dy + (shift?.y ?? 0);

      setWalls(prevWalls =>
        prevWalls.map(wall => {
          if (!selectedSet.has(wall.id)) return wall;

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

    setWalls(prevWalls =>
      prevWalls.map(wall => {
        if (!selectedSet.has(wall.id)) return wall;

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

          const horizontal = Math.abs(dx) >= Math.abs(dy);

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
            orthogonalMode && !isCurved,
            horizontal,
          );

          let finalStart = rawStart;
          let finalEnd = rawEnd;

          if (shift) {
            finalStart = {
              x: rawStart.x + shift.x,
              y: rawStart.y + shift.y,
            };
            finalEnd = {
              x: rawEnd.x + shift.x,
              y: rawEnd.y + shift.y,
            };
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

        if (
          state.editType === 'extendStart' ||
          state.editType === 'extendEnd'
        ) {
          const isStart = state.editType === 'extendStart';
          const anchor = isStart ? original.end : original.start;
          const initial = isStart ? original.start : original.end;

          let endpoint = {
            x: initial.x + dx,
            y: initial.y + dy,
          };

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

          const horizontal =
            Math.abs(endpoint.y - anchor.y) <
            Math.abs(endpoint.x - anchor.x);

          const shift = getBestSnapShift(
            points,
            prevWalls,
            selectedIds,
            orthogonalMode && !isCurved,
            horizontal,
          );

          if (
            shift &&
            !original.lockLength &&
            !original.lockDirection
          ) {
            endpoint = {
              x: endpoint.x + shift.x,
              y: endpoint.y + shift.y,
            };

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
              
