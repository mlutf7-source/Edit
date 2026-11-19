import { formatQuantity } from './quantityFormat';
import React, { useState } from 'react';
import type { Wall, Window, Door } from '../../core/types';
import type { FinishResults } from '../../core/finishCalculations';

interface Props {
  walls: Wall[];
  windows: Window[];
  doors: Door[];
  floor: number;
  height: number;
  results: FinishResults;
}
const fmt = (n: number) => Number.isFinite(n) ? formatQuantity(n) : '—';
const td: React.CSSProperties = { border: '1px solid #d2e1e8', padding: 8, textAlign: 'center' };

/**
 * Read-only reconciliation of the wall/opening calculations with the current
 * draft summary. Uses the same gross, opening and net formulas as
 * core/finishCalculations.ts. Column deductions come from the actual result;
 * they are NOT redistributed or estimated per wall.
 */
export const WallQuantityReconciliation: React.FC<Props> = ({ walls, windows, doors, floor, height, results }) => {
  const [open, setOpen] = useState(false);
  const onFloor = <T extends { floor?: number }>(items: T[]) => items.filter(item => (item.floor ?? 0) === floor);
  const floorWalls = onFloor(walls);
  const realWalls = floorWalls.filter(w => !w.kind || w.kind === 'wall');
  const floorWindows = onFloor(windows);
  const floorDoors = onFloor(doors);
  const gross = (type: Wall['type']) => realWalls.filter(w => w.type === type).reduce((sum, w) => {
    const length = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
    return sum + (type === 'exterior' ? length + 2 * w.thickness : length) * height;
  }, 0);
  const openings = (items: Array<Window | Door>, type: Wall['type']) => items.reduce((sum, opening) => {
    // Match finishCalculations.ts: opening is assigned by its referenced wall.
    const wall = floorWalls.find(w => w.id === opening.wallId);
    return wall?.type === type ? sum + opening.width * opening.height : sum;
  }, 0);
  const externalGross = gross('exterior');
  const internalGross = gross('interior');
  const extWindows = openings(floorWindows, 'exterior');
  const intWindows = openings(floorWindows, 'interior');
  const extDoors = openings(floorDoors, 'exterior');
  const intDoors = openings(floorDoors, 'interior');
  const extNet = Math.max(0, externalGross - results.outerColumnArea - extWindows - extDoors);
  const intNet = Math.max(0, internalGross - results.innerColumnArea - intWindows - intDoors);
  const lines = [
    ['إجمالي الجدران الخارجية', externalGross, results.exteriorWallGross, 'Σ ((الطول + 2 × السماكة) × الارتفاع)'],
    ['إجمالي الجدران الداخلية', internalGross, results.interiorWallGross, 'Σ (الطول × الارتفاع)'],
    ['النوافذ الخارجية', extWindows, results.extWindowArea, 'Σ (العرض × الارتفاع) للفتحات الخارجية'],
    ['النوافذ الداخلية', intWindows, results.intWindowArea, 'Σ (العرض × الارتفاع) للفتحات الداخلية'],
    ['الأبواب الخارجية', extDoors, results.extDoorArea, 'Σ (العرض × الارتفاع) للأبواب الخارجية'],
    ['الأبواب الداخلية', intDoors, results.intDoorArea, 'Σ (العرض × الارتفاع) للأبواب الداخلية'],
    ['صافي الجدران الخارجية', extNet, results.exteriorWallNet, 'max(0، الإجمالي − خصم الأعمدة − النوافذ − الأبواب)'],
    ['صافي الجدران الداخلية', intNet, results.interiorWallNet, 'max(0، الإجمالي − خصم الأعمدة − النوافذ − الأبواب)'],
  ] as const;
  const mismatch = lines.some(([, actual, saved]) => Math.abs(actual - saved) > 0.01);
  return <section dir="rtl" style={{ margin: '12px 0', border: '1px solid #bdd9e4', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: 12, border: 0, textAlign: 'right', background: '#eaf9fb', color: '#0b3045', fontWeight: 700, cursor: 'pointer' }}>
      {open ? 'إخفاء' : 'إظهار'} مطابقة حسابات الجدران والفتحات مع نتائج الدور
    </button>
    {open && <div style={{ padding: 12 }}>
      <p style={{ fontSize: 13, color: '#36576b' }}>تُحسب القيم من العناصر المرسومة في الدور الحالي وتُقارن بملخص النتائج المعروض. خصومات الأعمدة مأخوذة من الملخص دون توزيع تقديري على الجدران. اختلاف القيم قد يدل على أن الملخص يعود إلى مسودة سابقة أو يحتوي على تعديلات محفوظة.</p>
      <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 750, fontSize: 12 }}>
        <thead><tr style={{ background: '#0b3045', color: '#fff' }}>{['البند', 'معادلة التحقق', 'من الرسم (م²)', 'في النتائج (م²)', 'الفرق (م²)', 'المطابقة'].map(h => <th key={h} style={td}>{h}</th>)}</tr></thead>
        <tbody>{lines.map(([name, actual, saved, formula]) => {
          const delta = actual - saved;
          return <tr key={name}><td style={td}>{name}</td><td style={td}>{formula}</td><td style={td}>{fmt(actual)}</td><td style={td}>{fmt(saved)}</td><td style={td}>{fmt(delta)}</td><td style={td}>{Math.abs(delta) <= 0.01 ? 'مطابق' : 'مختلف'}</td></tr>;
        })}</tbody>
      </table></div>
      {mismatch && <p role="status" style={{ color: '#a04b18', fontSize: 13 }}>توجد فروق تتجاوز 0.01 م². راجع بيانات الرسم وأعد حساب مسودة الدور عند الحاجة؛ لا يُعدّل هذا الجدول النتائج تلقائياً.</p>}
    </div>}
  </section>;
};
