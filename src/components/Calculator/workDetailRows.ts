import type { DetailValue } from './TableDetailsToggle';
import type { StructuralQuantities, FloorStructureAllocation } from './structureFloorAllocation';

interface PreliminaryQuantities {
  landBoundaryArea: number;
  buildingArea: number;
  excavationVolume: number;
  backfillVolume: number;
  plinthArea: number;
}

/** Source-result trace only; original input dimensions are not stored in these result objects. */
export function preliminaryDetailRows(r: PreliminaryQuantities): DetailValue[] {
  return [
    { label: 'مساحة الأرض', value: r.landBoundaryArea, unit: 'م²', formula: 'القيمة المحسوبة والمحفوظة لمساحة حدود الأرض' },
    { label: 'مساحة المبنى', value: r.buildingArea, unit: 'م²', formula: 'القيمة المحسوبة والمحفوظة لمساحة المبنى' },
    { label: 'حجم الحفر', value: r.excavationVolume, unit: 'م³', formula: 'ناتج حساب الحفر من المدخلات الأصلية' },
    { label: 'حجم الردم', value: r.backfillVolume, unit: 'م³', formula: 'ناتج حساب الردم من المدخلات الأصلية' },
    { label: 'مساحة الكرسي', value: r.plinthArea, unit: 'م²', formula: 'ناتج حساب مساحة الكرسي من المدخلات الأصلية' },
  ];
}

const parts = [
  ['القواعد', 'footing'],
  ['الرقاب', 'neck'],
  ['الأعمدة', 'column'],
  ['الميدات', 'midd'],
  ['الأسقف', 'slab'],
] as const;

/** Actual source result components, with verified totals as explicit sums. */
export function structureDetailRows(r: StructuralQuantities, includeGroundWorks = true): DetailValue[] {
  const rows: DetailValue[] = [];
  for (const [label, key] of parts) {
    if (!includeGroundWorks && key !== 'column' && key !== 'slab') continue;
    rows.push({ label: `خرسانة ${label}`, value: r[`${key}Concrete`], unit: 'م³', formula: 'كمية العنصر الناتجة من محرك الحساب الإنشائي' });
    rows.push({ label: `حديد ${label}`, value: r[`${key}Steel`], unit: 'طن', formula: 'كمية العنصر الناتجة من محرك الحساب الإنشائي' });
  }
  rows.push({ label: 'إجمالي الخرسانة', value: r.totalConcrete, unit: 'م³', formula: includeGroundWorks ? 'خرسانة القواعد + الرقاب + الأعمدة + الميدات + الأسقف' : 'خرسانة الأعمدة + الأسقف' });
  rows.push({ label: 'إجمالي الحديد', value: r.totalSteel, unit: 'طن', formula: includeGroundWorks ? 'حديد القواعد + الرقاب + الأعمدة + الميدات + الأسقف' : 'حديد الأعمدة + الأسقف' });
  return rows;
}

/** A floor's stored allocation is authoritative for the values displayed here. */
export function floorStructureDetailRows(r: FloorStructureAllocation): DetailValue[] {
  return structureDetailRows(r, r.floor === 0).map(row => ({ ...row,
    formula: row.label.startsWith('إجمالي') ? row.formula :
      `${row.formula}؛ الكمية المحسوبة للدور ${r.floor === 0 ? 'الأرضي' : r.floor}`,
  }));
}
