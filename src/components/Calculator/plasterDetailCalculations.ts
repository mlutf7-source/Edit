import type { RoomQuantityRow } from './RoomQuantityDetails';
import type { Door, Window, Wall } from '../../core/types';
import { boundaryIntervalsOnWall } from './floorAdditionalFinishes';
import type { RoomRegion } from '../../core/regionTypes';

export interface PlasterOpeningAreas { windows: number; openings: number; doors: number }
export type PlasterOpeningsByRoom = Record<string, PlasterOpeningAreas>;
const safe = (n: number | undefined) => Number.isFinite(n) ? Math.max(0, n ?? 0) : 0;

/** Attribute only the part of each opening that lies on a region's actual wall boundary.
 * region.wallIds alone is not sufficient: room detection currently includes all solid wall IDs.
 * A shared wall contributes one face to each adjoining eligible region.
 */
export function plasterOpeningsByRoom(
  regions: readonly RoomRegion[], windows: readonly Window[], doors: readonly Door[], walls: readonly Wall[],
): PlasterOpeningsByRoom {
  const result: PlasterOpeningsByRoom = {};
  const wallById = new Map(walls.map(w => [w.id, w]));
  for (const region of regions) {
    const areas: PlasterOpeningAreas = { windows: 0, openings: 0, doors: 0 };
    const boundaryCache = new Map<string, [number, number][]>();
    const boundaryFor = (wall: Wall) => {
      let intervals = boundaryCache.get(wall.id);
      if (!intervals) {
        intervals = boundaryIntervalsOnWall(region, wall);
        boundaryCache.set(wall.id, intervals);
      }
      return intervals;
    };
    const openingAreaOnBoundary = (opening: Window | Door): number => {
      const wall = wallById.get(opening.wallId);
      if (!wall || !region.wallIds.includes(wall.id)) return 0;
      const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
      if (length <= 0) return 0;
      const width = safe(opening.width);
      const height = safe(opening.height);
      if (width <= 0 || height <= 0) return 0;
      const ux = (wall.end.x - wall.start.x) / length;
      const uy = (wall.end.y - wall.start.y) / length;
      const center = Number.isFinite(opening.position)
        ? opening.position
        : opening.center
          ? (opening.center.x - wall.start.x) * ux + (opening.center.y - wall.start.y) * uy
          : NaN;
      if (!Number.isFinite(center)) return 0;
      const start = Math.max(0, center - width / 2);
      const end = Math.min(length, center + width / 2);
      if (end <= start) return 0;
      const overlaps = boundaryFor(wall)
        .map(([a, b]) => [Math.max(a, start), Math.min(b, end)] as [number, number])
        .filter(([a, b]) => b > a)
        .sort((a, b) => a[0] - b[0]);
      let covered = 0;
      let last = start;
      for (const [a, b] of overlaps) {
        covered += Math.max(0, b - Math.max(a, last));
        last = Math.max(last, b);
      }
      return covered * height;
    };
    for (const window of windows) areas.windows += openingAreaOnBoundary(window);
    for (const door of doors) areas.doors += openingAreaOnBoundary(door);
    result[region.id] = areas;
  }
  return result;
}

export function plasterRoomQuantity(row: RoomQuantityRow, automatic?: PlasterOpeningAreas) {
  const wet = row.type === 'kitchen' || row.type === 'bathroom';
  const gross = wet ? 0 : safe(row.perimeter) * safe(row.height);
  const windows = wet ? 0 : safe(row.plasterWindowDeduction ?? automatic?.windows);
  const openings = wet ? 0 : safe(row.plasterOpeningDeduction ?? automatic?.openings);
  const doors = wet ? 0 : safe(row.plasterDoorDeduction ?? automatic?.doors);
  const deductions = Math.min(gross, windows + openings + doors);
  return { gross, windows, openings, doors, deductions, net: Math.max(0, gross - deductions), ceiling: safe(row.area) };
}

export function plasterDetailTotals(rows: readonly RoomQuantityRow[], automatic: PlasterOpeningsByRoom = {}) {
  return rows.reduce((s, r) => {
    const q = plasterRoomQuantity(r, automatic[r.id]);
    return { gross: s.gross + q.gross, windows: s.windows + q.windows,
      openings: s.openings + q.openings, doors: s.doors + q.doors,
      deductions: s.deductions + q.deductions, walls: s.walls + q.net, ceilings: s.ceilings + q.ceiling };
  }, { gross: 0, windows: 0, openings: 0, doors: 0, deductions: 0, walls: 0, ceilings: 0 });
}

/** Original material factors retained: cement = area * .15; sand = cement * .15. */
export function plasterMaterials(walls: number, ceilings: number) {
  const area = Math.max(0, walls) + Math.max(0, ceilings);
  const cement = Math.ceil(area * 0.15);
  return { area, cement, sand: Math.ceil(cement * 0.15) };
}
