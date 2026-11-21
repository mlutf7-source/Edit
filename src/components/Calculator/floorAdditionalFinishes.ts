import type { Door, Wall, Window } from '../../core/types';
import type { RoomQuantityRow } from './RoomQuantityDetails';
import type { RoomRegion } from '../../core/regionTypes';

export interface FloorAdditionalFinishes {
  exteriorPlasterArea: number;
  exteriorPlasterGross: number;
  exteriorPlasterOpenings: number;
  exteriorPlasterCement: number;
  exteriorPlasterSand: number;
  exteriorPlasterLabor: number;
  skirtingLength: number;
  roomSkirting: Array<{ id: string; name: string; perimeter: number; doorDeduction: number; netLength: number }>;
}

const distanceToSegment = (p: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = dx * dx + dy * dy ? Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy))) : 0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};

/** Only doors demonstrably on a region boundary are deducted. Unmatched doors are not guessed. */
export function calculateFloorAdditionalFinishes(
  walls: Wall[], doors: Door[], windows: Window[], regions: RoomRegion[], rooms: RoomQuantityRow[],
  exteriorPlasterEnabled: boolean, floorHeight: number,
): FloorAdditionalFinishes {
  const validWalls = walls.filter(w => !w.kind || w.kind === 'wall');
  const wallById = new Map(validWalls.map(w => [w.id, w]));
  const exteriorWalls = validWalls.filter(w => w.type === 'exterior');
  const safeHeight = Number.isFinite(floorHeight) ? Math.max(0, floorHeight) : 0;
  const exteriorGross = exteriorWalls.reduce((sum, wall) =>
    sum + (Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) + 2 * Math.max(0, wall.thickness)) * safeHeight, 0);
  // Both ordinary, main and storefront doors are included; the model's doorType
  // does not change whether an opening is deducted from exterior plaster.
  const exteriorOpenings = [...doors, ...windows].reduce((sum, opening) => {
    const wall = wallById.get(opening.wallId);
    if (!wall || wall.type !== 'exterior') return sum;
    const width = Number.isFinite(opening.width) ? Math.max(0, opening.width) : 0;
    const height = Number.isFinite(opening.height) ? Math.max(0, Math.min(safeHeight, opening.height)) : 0;
    return sum + width * height;
  }, 0);
  const roomMap = new Map(regions.map(r => [r.id,r]));
  const roomSkirting = rooms.map(room => {
    const region = roomMap.get(room.id);
    // Use intervals on each supporting wall to avoid deducting overlapping doors twice.
    const intervalsByWall = new Map<string, Array<[number, number]>>();
    if (region && region.polygon.length >= 3) {
      for (const door of doors) {
        const wall = wallById.get(door.wallId);
        if (!wall || !Number.isFinite(door.width) || door.width <= 0) continue;
        const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
        if (length <= 0) continue;
        const centerDistance = Number.isFinite(door.position) ? door.position : 0;
        const center = door.center ?? {
          x: wall.start.x + (wall.end.x - wall.start.x) * centerDistance / length,
          y: wall.start.y + (wall.end.y - wall.start.y) * centerDistance / length,
        };
        const onBoundary = region.polygon.some((point, i) =>
          distanceToSegment(center, point, region.polygon[(i + 1) % region.polygon.length]) <= Math.max(0.08, wall.thickness));
        if (!onBoundary) continue;
        const start = Math.max(0, centerDistance - door.width / 2);
        const end = Math.min(length, centerDistance + door.width / 2);
        if (end <= start) continue;
        const intervals = intervalsByWall.get(wall.id) ?? [];
        intervals.push([start, end]);
        intervalsByWall.set(wall.id, intervals);
      }
    }
    let doorDeduction = 0;
    for (const intervals of intervalsByWall.values()) {
      intervals.sort((a, b) => a[0] - b[0]);
      let start = -1, end = -1;
      for (const [left, right] of intervals) {
        if (left > end) {
          if (end > start) doorDeduction += end - start;
          start = left;
          end = right;
        } else end = Math.max(end, right);
      }
      if (end > start) doorDeduction += end - start;
    }
    const perimeter = Math.max(0,Number(room.perimeter)||0);
    return { id: room.id, name: room.name, perimeter, doorDeduction: Math.min(perimeter,doorDeduction), netLength: Math.max(0,perimeter-doorDeduction) };
  });
  const exteriorPlasterArea = exteriorPlasterEnabled ? Math.max(0, exteriorGross - exteriorOpenings) : 0;
  // Same approved plaster consumption factors as finishCalculations.ts.
  const exteriorPlasterCement = Math.ceil(exteriorPlasterArea * 0.15);
  const exteriorPlasterSand = Math.ceil(exteriorPlasterCement * 0.15);
  return { exteriorPlasterArea, exteriorPlasterGross: exteriorPlasterEnabled ? exteriorGross : 0,
    exteriorPlasterOpenings: exteriorPlasterEnabled ? Math.min(exteriorGross, exteriorOpenings) : 0,
    exteriorPlasterCement, exteriorPlasterSand, exteriorPlasterLabor: exteriorPlasterArea,
    
skirtingLength: roomSkirting.reduce((sum, item) => {
  const room = rooms.find(r => r.id === item.id);

  if (room?.type !== 'room' && room?.type !== 'hall') {
    return sum;
  }

  return sum + item.netLength;
}, 0),
roomSkirting
};
  
}
