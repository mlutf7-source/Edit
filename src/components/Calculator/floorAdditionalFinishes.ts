import type { Door, Point, Wall, Window } from '../../core/types';
import type { RoomQuantityRow } from './RoomQuantityDetails';
import type { RoomRegion } from '../../core/regionTypes';

export interface RoomSkirtingQuantity {
  id: string;
  name: string;
  perimeter: number;
  doorDeduction: number;
  netLength: number;
}

export interface FloorAdditionalFinishes {
  exteriorPlasterArea: number;
  exteriorPlasterGross: number;
  exteriorPlasterOpenings: number;
  exteriorPlasterCement: number;
  exteriorPlasterSand: number;
  exteriorPlasterLabor: number;
  /** Net skirting quantity used by the main finishes summary. */
  skirtingLength: number;
  roomSkirting: RoomSkirtingQuantity[];
}

const nonNegative = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const distance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

type Interval = [number, number];

/** Merge overlapping intervals so the same part of a wall is never deducted twice. */
const mergedLength = (intervals: Interval[]): number => {
  const sorted = intervals
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let currentStart = 0;
  let currentEnd = 0;
  let active = false;
  for (const [start, end] of sorted) {
    if (!active) {
      currentStart = start;
      currentEnd = end;
      active = true;
    } else if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
    } else {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }
  }
  return active ? total + currentEnd - currentStart : total;
};

/**
 * Project the portion of a region edge that follows a wall onto that wall.
 * A small tolerance allows region boundaries to follow the inner wall face
 * rather than the wall centreline. Nonparallel or remote edges are ignored.
 */
export const boundaryIntervalsOnWall = (region: RoomRegion, wall: Wall): Interval[] => {
  const length = distance(wall.start, wall.end);
  if (length <= 0 || region.polygon.length < 3) return [];
  const ux = (wall.end.x - wall.start.x) / length;
  const uy = (wall.end.y - wall.start.y) / length;
  const project = (p: Point) =>
    (p.x - wall.start.x) * ux + (p.y - wall.start.y) * uy;
  const offset = (p: Point) =>
    Math.abs((p.x - wall.start.x) * uy - (p.y - wall.start.y) * ux);
  const tolerance = Math.max(0.08, nonNegative(wall.thickness) + 0.02);
  const result: Interval[] = [];

  for (let i = 0; i < region.polygon.length; i++) {
    const a = region.polygon[i];
    const b = region.polygon[(i + 1) % region.polygon.length];
    const edgeLength = distance(a, b);
    if (edgeLength <= 0) continue;
    const along = Math.abs((b.x - a.x) * ux + (b.y - a.y) * uy);
    // Only an edge parallel to the wall can contribute a skirting boundary.
    if (along / edgeLength < 0.98) continue;
    if (offset(a) > tolerance || offset(b) > tolerance) continue;
    const start = Math.max(0, Math.min(project(a), project(b)));
    const end = Math.min(length, Math.max(project(a), project(b)));
    if (end > start) result.push([start, end]);
  }
  return result;
};

/** Only deduct doors overlapping a real boundary segment of a room or hall. */
const doorDeductionForRegion = (
  region: RoomRegion | undefined,
  doors: Door[],
  wallById: Map<string, Wall>,
): number => {
  if (!region) return 0;
  const deductionsByWall = new Map<string, Interval[]>();
  const boundariesByWall = new Map<string, Interval[]>();
  const eligibleWalls = new Set(region.wallIds);

  for (const door of doors) {
    if (!eligibleWalls.has(door.wallId)) continue;
    const wall = wallById.get(door.wallId);
    if (!wall || nonNegative(door.width) <= 0) continue;
    if ((door.floor ?? 0) !== (region.floor ?? 0)) continue;
    const length = distance(wall.start, wall.end);
    if (length <= 0) continue;

    let boundaries = boundariesByWall.get(wall.id);
    if (!boundaries) {
      boundaries = boundaryIntervalsOnWall(region, wall);
      boundariesByWall.set(wall.id, boundaries);
    }
    if (!boundaries.length) continue;

    // position is the distance from the wall's start; center is a fallback.
    const ux = (wall.end.x - wall.start.x) / length;
    const uy = (wall.end.y - wall.start.y) / length;
    const centerDistance = Number.isFinite(door.position)
      ? door.position
      : door.center
        ? (door.center.x - wall.start.x) * ux + (door.center.y - wall.start.y) * uy
        : NaN;
    if (!Number.isFinite(centerDistance)) continue;
    const doorStart = Math.max(0, centerDistance - door.width / 2);
    const doorEnd = Math.min(length, centerDistance + door.width / 2);
    if (doorEnd <= doorStart) continue;

    for (const [boundaryStart, boundaryEnd] of boundaries) {
      const start = Math.max(doorStart, boundaryStart);
      const end = Math.min(doorEnd, boundaryEnd);
      if (end <= start) continue;
      const intervals = deductionsByWall.get(wall.id) ?? [];
      intervals.push([start, end]);
      deductionsByWall.set(wall.id, intervals);
    }
  }
  return [...deductionsByWall.values()].reduce(
    (sum, intervals) => sum + mergedLength(intervals), 0,
  );
};

export function calculateFloorAdditionalFinishes(
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  regions: RoomRegion[],
  rooms: RoomQuantityRow[],
  exteriorPlasterEnabled: boolean,
  floorHeight: number,
): FloorAdditionalFinishes {
  const validWalls = walls.filter(w => !w.kind || w.kind === 'wall');
  const wallById = new Map(validWalls.map(w => [w.id, w]));
  const exteriorWalls = validWalls.filter(w => w.type === 'exterior');
  const safeHeight = nonNegative(floorHeight);

  const exteriorGross = exteriorWalls.reduce((sum, wall) =>
    sum + (distance(wall.start, wall.end) + 2 * nonNegative(wall.thickness)) * safeHeight, 0);

  // All door types and windows are openings for exterior plaster purposes.
  const exteriorOpenings = [...doors, ...windows].reduce((sum, opening) => {
    const wall = wallById.get(opening.wallId);
    if (!wall || wall.type !== 'exterior') return sum;
    return sum + nonNegative(opening.width) * Math.min(safeHeight, nonNegative(opening.height));
  }, 0);

  const regionById = new Map(regions.map(region => [region.id, region]));
  const roomSkirting: RoomSkirtingQuantity[] = rooms.map(room => {
    const eligible = room.type === 'room' || room.type === 'hall';
    if (!eligible) {
      return { id: room.id, name: room.name, perimeter: 0, doorDeduction: 0, netLength: 0 };
    }
    const perimeter = nonNegative(room.perimeter);
    const deduction = Math.min(perimeter,
      doorDeductionForRegion(regionById.get(room.id), doors, wallById));
    return {
      id: room.id,
      name: room.name,
      perimeter,
      doorDeduction: deduction,
      netLength: Math.max(0, perimeter - deduction),
    };
  });

  const exteriorPlasterArea = exteriorPlasterEnabled
    ? Math.max(0, exteriorGross - exteriorOpenings) : 0;
  const exteriorPlasterCement = Math.ceil(exteriorPlasterArea * 0.15);
  const exteriorPlasterSand = Math.ceil(exteriorPlasterCement * 0.15);

  return {
    exteriorPlasterArea,
    exteriorPlasterGross: exteriorPlasterEnabled ? exteriorGross : 0,
    exteriorPlasterOpenings: exteriorPlasterEnabled
      ? Math.min(exteriorGross, exteriorOpenings) : 0,
    exteriorPlasterCement,
    exteriorPlasterSand,
    exteriorPlasterLabor: exteriorPlasterArea,
    skirtingLength: roomSkirting.reduce((sum, item) => sum + item.netLength, 0),
    roomSkirting,
  };
}
