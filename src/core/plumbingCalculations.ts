import type { RoomRegion } from './regionTypes';

export interface PlumbingRow {
  id: string;
  name: string;
  material: string;
  diameter: string;
  quantity: number;
}

export interface PlumbingDraft {
  originalRows: PlumbingRow[];
  rows: PlumbingRow[];
  laborPointsOverride: number | null;
}

export interface PlumbingQuantity {
  material: string;
  diameter: string;
  quantity: number;
  unit: 'عدد';
}

export const PLUMBING_RATES = {
  kitchen: [
    ['مغسلة أواني', 1],
    ['محبس', 1],
    ['خلاط', 1],
    ['صنبور', 2],
    ['صفاية', 1],
    ['كوع ريحة', 1]
  ],
  bathroom: [
    ['مغسلة', 1],
    ['سخان', 1],
    ['حوض أو بانيو', 1],
    ['شطاف', 1],
    ['محبس', 2],
    ['شاور', 1],
    ['خلاط', 1],
    ['صنبور', 3],
    ['صفاية', 1],
    ['كوع ريحة', 2]
  ],
} as const;

const MANUAL_MATERIALS = ['غرف تفتيش', 'مواصير', 'مواصير', 'سنجل واي', 'أكواع', 'مثلثات'] as const;

export function plumbingCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function buildPlumbingRows(regions: readonly RoomRegion[], floor: number): PlumbingRow[] {
  const rows: PlumbingRow[] = MANUAL_MATERIALS.map((material, index) => ({
    id: `manual:${index}`,
    name: 'عام',
    material,
    diameter: '',
    quantity: 0,
  }));
  const counts = { kitchen: 0, bathroom: 0 };
  for (const region of regions) {
    if ((region.floor ?? 0) !== floor || (region.type !== 'kitchen' && region.type !== 'bathroom')) continue;
    const type = region.type;
    const name = `${type === 'kitchen' ? 'مطبخ' : 'حمام'} ${++counts[type]}`;
    PLUMBING_RATES[type].forEach(([material, quantity], index) => {
      rows.push({ id: `region:${region.id}:${index}`, name, material, diameter: '', quantity });
    });
  }
  return rows;
}

export function createPlumbingDraft(rows: readonly PlumbingRow[]): PlumbingDraft {
  return {
    originalRows: rows.map(row => ({ ...row })),
    rows: rows.map(row => ({ ...row })),
    laborPointsOverride: null,
  };
}

export function refreshPlumbingDraft(drawingRows: readonly PlumbingRow[], previous?: PlumbingDraft | null): PlumbingDraft {
  if (!previous) return createPlumbingDraft(drawingRows);
  const original = new Map(previous.originalRows.map(row => [row.id, row]));
  const edited = new Map(previous.rows.map(row => [row.id, row]));
  const currentIds = new Set(drawingRows.map(row => row.id));
  const rows: PlumbingRow[] = [];
  for (const row of drawingRows) {
    const before = original.get(row.id);
    const saved = edited.get(row.id);
    if (before && !saved) continue;
    if (!saved) { rows.push({ ...row }); continue; }
    rows.push({
      id: row.id,
      name: !before || saved.name !== before.name ? saved.name : row.name,
      material: !before || saved.material !== before.material ? saved.material : row.material,
      diameter: !before || saved.diameter !== before.diameter ? saved.diameter : row.diameter,
      quantity: plumbingCount(!before || saved.quantity !== before.quantity ? saved.quantity : row.quantity),
    });
  }
  for (const row of previous.rows) {
    if (!currentIds.has(row.id) && !original.has(row.id)) rows.push({ ...row, quantity: plumbingCount(row.quantity) });
  }
  return {
    originalRows: drawingRows.map(row => ({ ...row })),
    rows,
    laborPointsOverride: previous.laborPointsOverride == null ? null : plumbingCount(previous.laborPointsOverride),
  };
}

export function addPlumbingRow(draft: PlumbingDraft): PlumbingDraft {
  const ids = new Set([...draft.rows, ...draft.originalRows].map(row => row.id));
  let index = 1;
  while (ids.has(`custom:${index}`)) index++;
  return {
    ...draft,
    rows: [...draft.rows, { id: `custom:${index}`, name: 'عام', material: '', diameter: '', quantity: 0 }],
  };
}

export function removePlumbingRow(draft: PlumbingDraft, id: string): PlumbingDraft {
  return { ...draft, rows: draft.rows.filter(row => row.id !== id) };
}

export function updatePlumbingRow(draft: PlumbingDraft, id: string, patch: Partial<Omit<PlumbingRow, 'id'>>): PlumbingDraft {
  return {
    ...draft,
    rows: draft.rows.map(row => row.id === id
      ? { ...row, ...patch, id, quantity: plumbingCount(patch.quantity ?? row.quantity) }
      : row),
  };
}

export function mergePlumbingQuantities(items: readonly PlumbingQuantity[]): PlumbingQuantity[] {
  const totals = new Map<string, PlumbingQuantity>();
  for (const item of items) {
    const material = item.material.trim();
    const diameter = item.diameter.trim();
    if (!material) continue;
    const key = JSON.stringify([material, diameter]);
    const quantity = plumbingCount(item.quantity);
    const existing = totals.get(key);
    if (existing) existing.quantity += quantity;
    else totals.set(key, { material, diameter, quantity, unit: 'عدد' });
  }
  return [...totals.values()];
}

export function calculatePlumbingQuantities(draft: PlumbingDraft): PlumbingQuantity[] {
  return mergePlumbingQuantities(
    draft.rows.map(row => ({
      material: row.material,
      diameter: row.diameter,
      quantity: row.quantity,
      unit: 'عدد',
    }))
  );
}
