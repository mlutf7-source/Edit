import { formatQuantity } from './quantityFormat';
import React, { useState } from 'react';
import type { Wall, Column, Window, Door } from '../../core/types';

interface Props {
  walls: Wall[]; columns: Column[]; windows: Window[]; doors: Door[];
  floor: number; edits: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}
const fmt = (n: number) => formatQuantity(n);
const cell: React.CSSProperties = { padding: 7, borderBottom: '1px solid #d4e2e8' };

/** Edits quantities in the floor draft without modifying source drawing geometry. */
export const FloorGeometryEditor: React.FC<Props> = ({ walls, columns, windows, doors, floor, edits, onChange }) => {
  const [open, setOpen] = useState(false);
  const rows: { key: string; name: string; field: string; original: number; unit: string }[] = [];
  walls.filter(w => (w.floor ?? 0) === floor && (!w.kind || w.kind === 'wall')).forEach((w, i) => {
    rows.push({ key: `wall:${w.id}:length`, name: `جدار ${i + 1}`, field: 'الطول', original: Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), unit: 'م' });
    rows.push({ key: `wall:${w.id}:thickness`, name: `جدار ${i + 1}`, field: 'السماكة', original: w.thickness, unit: 'م' });
  });
  columns.filter(c => (c.floor ?? 0) === floor).forEach((c, i) => {
    rows.push({ key: `column:${c.id}:width`, name: `عمود ${i + 1}`, field: 'العرض', original: c.width, unit: 'م' });
    rows.push({ key: `column:${c.id}:length`, name: `عمود ${i + 1}`, field: 'الطول', original: c.length, unit: 'م' });
  });
  windows.filter(w => (w.floor ?? 0) === floor).forEach((w, i) => {
    rows.push({ key: `window:${w.id}:width`, name: `نافذة ${i + 1}`, field: 'العرض', original: w.width, unit: 'م' });
    rows.push({ key: `window:${w.id}:height`, name: `نافذة ${i + 1}`, field: 'الارتفاع', original: w.height, unit: 'م' });
  });
  doors.filter(d => (d.floor ?? 0) === floor).forEach((d, i) => {
    rows.push({ key: `door:${d.id}:width`, name: `باب ${i + 1}`, field: 'العرض', original: d.width, unit: 'م' });
    rows.push({ key: `door:${d.id}:height`, name: `باب ${i + 1}`, field: 'الارتفاع', original: d.height, unit: 'م' });
  });
  return <section dir="rtl" style={{ border: '1px solid #b8dce5', borderRadius: 9, margin: '12px 0', overflow: 'hidden' }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: 12, background: '#eaf9fb', color: '#0b3045', fontWeight: 700, border: 0, textAlign: 'right' }}>
      {open ? 'إخفاء' : 'إظهار'} تعديل أبعاد الجدران والأعمدة والفتحات — مسودة الدور
    </button>
    {open && <div style={{ padding: 12 }}>
      <p style={{ fontSize: 12 }}>التعديلات تخص كميات هذا الدور فقط ولا تغيّر الرسم. بعد التعديل اضغط «احسب الكميات» ثم «اعتماد» لتحديث الملخص. تغيير طول الجدار هنا لا يعيد بناء حدود الغرف الهندسية.</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 450, borderCollapse: 'collapse' }}>
        <thead><tr><th style={cell}>العنصر</th><th style={cell}>البعد</th><th style={cell}>من الرسم</th><th style={cell}>المسودة</th><th style={cell}>الوحدة</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}><td style={cell}>{row.name}</td><td style={cell}>{row.field}</td><td style={cell}>{fmt(row.original)}</td>
          <td style={cell}><input aria-label={`${row.name} ${row.field}`} type="number" min="0" step="any" value={edits[row.key] ?? row.original} onChange={e => {
            if (e.target.value === '') return;
            const value = Number(e.target.value);
            if (Number.isFinite(value) && value >= 0) onChange({ ...edits, [row.key]: value });
          }} style={{ width: 90 }} /></td><td style={cell}>{row.unit}</td></tr>)}</tbody>
      </table></div>
      <button type="button" onClick={() => onChange({})} style={{ marginTop: 12 }}>إزالة تعديلات الأبعاد</button>
    </div>}
  </section>;
};
