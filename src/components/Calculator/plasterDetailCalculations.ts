import type { RoomQuantityRow } from './RoomQuantityDetails';
import type { Door, Window } from '../../core/types';
import type { RoomRegion } from '../../core/regionTypes';

export interface PlasterOpeningAreas { windows: number; openings: number; doors: number }
export type PlasterOpeningsByRoom = Record<string, PlasterOpeningAreas>;
const safe = (n: number | undefined) => Number.isFinite(n) ? Math.max(0, n ?? 0) : 0;

/** Attribute each drawn opening to every room face adjoining its wall. */
export function plasterOpeningsByRoom(regions: readonly RoomRegion[], windows: readonly Window[], doors: readonly Door[]): PlasterOpeningsByRoom {
  const result: PlasterOpeningsByRoom = {};
  for (const region of regions) {
    const wallIds = new Set(region.wallIds);
    result[region.id] = {
      windows: windows.filter(w => wallIds.has(w.wallId)).reduce((s, w) => s + safe(w.width) * safe(w.height), 0),
      doors: doors.filter(d => wallIds.has(d.wallId)).reduce((s, d) => s + safe(d.width) * safe(d.height), 0),
      openings: 0,
    };
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
