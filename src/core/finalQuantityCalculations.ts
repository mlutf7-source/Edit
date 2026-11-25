import { calculateElectricalQuantities, type ElectricalDraft } from './electricalCalculations';
import { calculatePlumbingQuantities, type PlumbingDraft } from './plumbingCalculations';

/** Quantities supplied by the original material tables, never labor or prices. */
export interface FinalQuantitySource {
  label: string;
  quantity: number;
}
export interface FinalQuantityRow {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  sources: FinalQuantitySource[];
}
export interface FinalQuantityInput {
  exteriorBlocks: number;
  interiorBlocks: number;
  marbleArea: number;
  floorTiles: readonly FinalQuantitySource[];
  wallTiles: readonly FinalQuantitySource[];
  landingTileArea: number;
  stepTileCount: number;
  roomSkirtingLength: number;
  stairSkirtingLength: number;
  cement: readonly FinalQuantitySource[];
  sand: readonly FinalQuantitySource[];
  aggregate: readonly FinalQuantitySource[];
  windows: readonly { name: string; count: number; width: number; height: number }[];
  doors: readonly { name: string; kind: 'regular' | 'main' | 'shop'; count: number; width: number; height: number }[];
  isGroundFloor: boolean;
  electricalDraft?: ElectricalDraft | null;
  plumbingDraft?: PlumbingDraft | null;
}
const valid = (n: number): number => Number.isFinite(n) && n >= 0 ? n : 0;
const source = (label: string, quantity: number): FinalQuantitySource => ({ label, quantity });
function row(id: string, label: string, unit: string, inputs: readonly FinalQuantitySource[]): FinalQuantityRow {
  const sources = inputs.map(s => ({ label: s.label, quantity: valid(s.quantity) }));
  return { id, label, unit, sources, quantity: sources.reduce((sum, s) => sum + s.quantity, 0) };
}
const openingArea = (r: { count: number; width: number; height: number }) => valid(r.count) * valid(r.width) * valid(r.height);

/** Read-only aggregation: edit the originating table, not this derived result. */
export function calculateFinalQuantities(input: FinalQuantityInput): FinalQuantityRow[] {
  const single = (id: string, label: string, unit: string, quantity: number, origin: string) => row(id, label, unit, [source(origin, quantity)]);
  const windows = input.windows.map(w => source(w.name, openingArea(w)));
  const doors = (kind: 'regular' | 'main' | 'shop') => input.doors.filter(d => d.kind === kind).map(d => source(d.name, openingArea(d)));
  const rows = [
    single('exteriorBlocks', 'إجمالي بلوك الجدران الخارجية', 'بلوكة', input.exteriorBlocks, 'بناء الجدران الخارجية'),
    single('interiorBlocks', 'إجمالي بلوك الجدران الداخلية', 'بلوكة', input.interiorBlocks, 'بناء الجدران الداخلية'),
    single('marble', 'إجمالي الرخام', 'م²', input.marbleArea, 'بند الرخام'),
    row('floorTiles', 'إجمالي بلاط الأرضيات', 'م²', input.floorTiles),
    row('wallTiles', 'إجمالي بلاط الجدران', 'م²', input.wallTiles),
    single('landingTiles', 'إجمالي بلاط بسطات السلم', 'م²', input.landingTileArea, 'بسطات السلم'),
    single('stepTiles', 'إجمالي بلاط الدرج', 'درجة', input.stepTileCount, 'نوائم السلم'),
    row('skirting', 'إجمالي النعلة', 'م طولي', [source('نعلة الغرف والصالات', input.roomSkirtingLength), source('نعلة السلم', input.stairSkirtingLength)]),
    row('cement', 'إجمالي الأسمنت', 'كيس', input.cement),
    row('sand', 'إجمالي الرمل', 'م³', input.sand),
    row('aggregate', 'إجمالي الركام', 'م³', input.aggregate),
    row('aluminum', 'إجمالي نوافذ ألمنيوم', 'م²', windows),
    row('protection', 'إجمالي شباك حماية', 'م²', input.isGroundFloor ? windows : []),
    row('internalDoors', 'إجمالي الأبواب الداخلية', 'م²', doors('regular')),
    row('externalDoors', 'إجمالي الأبواب الخارجية', 'م²', doors('main')),
    row('shopDoors', 'إجمالي أبواب المحلات', 'م²', doors('shop')),
  ];
  if (input.electricalDraft) {
    const draft = input.electricalDraft;
    const q = calculateElectricalQuantities(draft);
    rows.push(
      single('wireRolls', 'إجمالي لفات السلك الكهربائي', 'لفة', q.wireRolls, 'الإدخال اليدوي للكهرباء'),
      single('conduitRolls', 'إجمالي لفات بيبات التمديدات الكهربائية', 'لفة', q.conduitRolls, 'الإدخال اليدوي للكهرباء'),
      row('lampHolders', 'إجمالي بيوت اللمبات', 'عدد', draft.rows.map(r => source(r.name, r.lampHolders))),
      row('switches', 'إجمالي المفاتيح', 'عدد', draft.rows.map(r => source(r.name, r.switches))),
      single('dynamos', 'إجمالي الديناموهات', 'عدد', q.dynamos, 'الإدخال اليدوي للكهرباء'),
    );
  }
  if (input.plumbingDraft) {
    const draft = input.plumbingDraft;
    for (const item of calculatePlumbingQuantities(draft)) {
      const label = item.diameter ? `${item.material} قطر ${item.diameter} إنش` : item.material;
      const matching = draft.rows.filter(r => r.material.trim() === item.material && r.diameter.trim() === item.diameter);
      const detail = matching.map(r => source(r.name, r.quantity));
      const sum = detail.reduce((s, r) => s + valid(r.quantity), 0);
      rows.push(row(`plumbing:${JSON.stringify([item.material, item.diameter])}`, `إجمالي ${label}`, item.unit,
        sum === item.quantity && detail.length ? detail : [source('جدول مواد السباكة', item.quantity)]));
    }
  }
  return rows.filter(r => r.quantity > 0);
}

/** Preserve the existing material-table rounding, after manual overrides. */
export function wallMaterialQuantity(
  tableId: string, key: string, fallback: number,
  edits?: Record<string, { label?: string; value?: number }>,
): number {
  const value = edits?.[JSON.stringify([tableId, key])]?.value;
  return Math.ceil(typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback);
}

export const materialRoundUp = (value: number): number => Math.ceil(valid(value));
export const materialLength = (value: number): number => Math.round(valid(value) * 100) / 100;

/** Inputs are unrounded areas from the original tile detail calculation. */
export function tileMaterialQuantities(areas: {
  floor: number; kitchenFloor: number; bathroomFloor: number;
  kitchenWalls: number; bathroomWalls: number;
}) {
  const { floor, kitchenFloor, bathroomFloor, kitchenWalls, bathroomWalls } = areas;
  const cement = Math.ceil((floor + kitchenFloor + bathroomFloor + kitchenWalls + bathroomWalls) * 0.3);
  const sand = Math.ceil(cement * 0.15);
  return { floor: materialRoundUp(floor), kitchenFloor: materialRoundUp(kitchenFloor),
    bathroomFloor: materialRoundUp(bathroomFloor), kitchenWalls: materialRoundUp(kitchenWalls),
    bathroomWalls: materialRoundUp(bathroomWalls), cement: materialRoundUp(cement), sand: materialRoundUp(sand) };
}

/** Retain raw marble detail values and the existing rounded material-table values. */
export function marbleMaterialQuantities(geometry?: { gross: number; openings: number }) {
  const gross = valid(geometry?.gross ?? 0);
  const openings = valid(geometry?.openings ?? 0);
  const area = Math.max(0, gross - openings);
  const concrete = area * 0.04;
  const cement = area * 0.30;
  const sand = cement * 0.07;
  const aggregate = cement * 0.075;
  return { gross, openings, area, concrete, cement, sand, aggregate,
    displayed: { area: materialRoundUp(area), concrete: materialRoundUp(concrete),
      cement: materialRoundUp(cement), sand: materialRoundUp(sand), aggregate: materialRoundUp(aggregate) } };
}
