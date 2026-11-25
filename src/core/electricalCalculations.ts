import type { RoomRegion, RegionType } from './regionTypes';
import type { Stair, StairElement } from './types';

export type ElectricalRegionType = RegionType | 'stair';
export interface ElectricalRow {
  id: string;
  name: string;
  lampHolders: number;
  switches: number;
}
export interface ElectricalManualQuantities {
  wireRolls: number;
  conduitRolls: number;
  dynamos: number;
}
export interface ElectricalQuantities extends ElectricalManualQuantities {
  lampHolders: number;
  switches: number;
}
export interface ElectricalDraft {
  originalRows: ElectricalRow[];
  rows: ElectricalRow[];
  manual: ElectricalManualQuantities;
  laborPointsOverride: number | null;
}

export const ELECTRICAL_RATES: Readonly<Record<ElectricalRegionType, Readonly<{ name: string; lampHolders: number; switches: number }>>> = {
  room: { name: 'غرفة', lampHolders: 4, switches: 10 },
  hall: { name: 'صالة', lampHolders: 4, switches: 8 },
  kitchen: { name: 'مطبخ', lampHolders: 4, switches: 3 },
  bathroom: { name: 'حمام', lampHolders: 2, switches: 2 },
  stair: { name: 'سلم', lampHolders: 3, switches: 2 },
};

export function electricalCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function calculateElectricalLaborPoints(floorArea: number): number {
  return Number.isFinite(floorArea) && floorArea > 0 ? Math.ceil(floorArea / 0.65) : 0;
}

export function buildElectricalRows(
  regions: readonly RoomRegion[],
  stairs: readonly Stair[],
  stairElements: readonly StairElement[],
  floor: number,
): ElectricalRow[] {
  const counts: Partial<Record<ElectricalRegionType, number>> = {};
  const rows: ElectricalRow[] = [];
  const add = (id: string, type: ElectricalRegionType) => {
    const rate = ELECTRICAL_RATES[type];
    if (!rate) return;
    counts[type] = (counts[type] ?? 0) + 1;
    rows.push({ id, name: `${rate.name} ${counts[type]}`, lampHolders: rate.lampHolders, switches: rate.switches });
  };
  for (const region of regions) {
    if ((region.floor ?? 0) === floor) add(`region:${region.id}`, region.type);
  }
  // Stair elements are flights/landings, not complete staircases.
  // Treat their presence as one stair area per floor; never count each flight.
  if (stairElements.some(item => (item.floor ?? 0) === floor)) {
    add(`stair-area:${floor}`, 'stair');
  } else {
    for (const stair of stairs) {
      if ((stair.floor ?? 0) === floor) add(`stair:${stair.id}`, 'stair');
    }
  }
  return rows;
}

export function createElectricalDraft(rows: readonly ElectricalRow[]): ElectricalDraft {
  return {
    originalRows: rows.map(row => ({ ...row })),
    rows: rows.map(row => ({ ...row })),
    manual: { wireRolls: 0, conduitRolls: 0, dynamos: 0 },
    laborPointsOverride: null,
  };
}

// Preserve edits, including zero values, added rows and deleted drawing rows.
export function refreshElectricalDraft(drawingRows: readonly ElectricalRow[], previous?: ElectricalDraft | null): ElectricalDraft {
  if (!previous) return createElectricalDraft(drawingRows);
  const original = new Map(previous.originalRows.map(row => [row.id, row]));
  const edited = new Map(previous.rows.map(row => [row.id, row]));
  const drawingIds = new Set(drawingRows.map(row => row.id));
  const rows: ElectricalRow[] = [];
  for (const row of drawingRows) {
    const before = original.get(row.id);
    const saved = edited.get(row.id);
    if (before && !saved) continue;
    if (!saved) { rows.push({ ...row }); continue; }
    rows.push({
      id: row.id,
      name: !before || saved.name !== before.name ? saved.name : row.name,
      lampHolders: !before || saved.lampHolders !== before.lampHolders ? saved.lampHolders : row.lampHolders,
      switches: !before || saved.switches !== before.switches ? saved.switches : row.switches,
    });
  }
  for (const row of previous.rows) {
    if (!original.has(row.id) && !drawingIds.has(row.id)) rows.push({ ...row });
  }
  // Keep deleted source IDs even if the drawing temporarily loses those regions.
  const originalRows = drawingRows.map(row => ({ ...row }));
  for (const row of previous.originalRows) {
    if (!drawingIds.has(row.id) && !edited.has(row.id)) originalRows.push({ ...row });
  }
  return { originalRows, rows, manual: { ...previous.manual }, laborPointsOverride: previous.laborPointsOverride };
}

export function calculateElectricalQuantities(draft: ElectricalDraft): ElectricalQuantities {
  return {
    wireRolls: electricalCount(draft.manual.wireRolls),
    conduitRolls: electricalCount(draft.manual.conduitRolls),
    dynamos: electricalCount(draft.manual.dynamos),
    lampHolders: draft.rows.reduce((sum, row) => sum + electricalCount(row.lampHolders), 0),
    switches: draft.rows.reduce((sum, row) => sum + electricalCount(row.switches), 0),
  };
}

export function resolveElectricalLaborPoints(floorArea: number, draft?: ElectricalDraft | null): number {
  return draft?.laborPointsOverride == null
    ? calculateElectricalLaborPoints(floorArea)
    : electricalCount(draft.laborPointsOverride);
}
