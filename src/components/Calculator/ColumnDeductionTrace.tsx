import { formatQuantity } from './quantityFormat';
import React, { useState } from 'react';
import type { Wall, Column } from '../../core/types';
import type { FinishResults } from '../../core/finishCalculations';

interface Props { walls: Wall[]; columns: Column[]; floor: number; height: number; results: FinishResults }
const fmt = (n: number) => Number.isFinite(n) ? formatQuantity(n) : '—';
const cell: React.CSSProperties = { border: '1px solid #d2e1e8', padding: '8px', textAlign: 'center' };

// Keep the classification and deduction rules identical to finishCalculations.ts.
function distanceToSegment(p: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export const ColumnDeductionTrace: React.FC<Props> = ({ walls, columns, floor, height, results }) => {
  const [open, setOpen] = useState(false);
  const realWalls = walls.filter(w => (w.floor ?? 0) === floor && (!w.kind || w.kind === 'wall'));
  const exterior = realWalls.filter(w => w.type === 'exterior');
  const interior = realWalls.filter(w => w.type === 'interior');
  const rows = columns.filter(c => (c.floor ?? 0) === floor).map((col, index) => {
    const near = (wall: Wall) => distanceToSegment(col.position, wall.start, wall.end) < col.width / 2 + wall.thickness / 2;
    const ext = exterior.some(near), int = interior.some(near);
    let outer = 0, inner = 0, rule = 'لا يلامس جداراً محسوباً';
    if (ext && int) {
      const closest = Math.min(...interior.map(w => distanceToSegment(col.position, w.start, w.end)));
      if (closest < col.width / 2) {
        outer = 0.2 * height; inner = (col.length - 0.2) * height;
        rule = 'تقاطع: خارجي 0.2 × الارتفاع، داخلي (الطول − 0.2) × الارتفاع';
      } else {
        inner = 0.2 * height; outer = (col.length - 0.2) * height;
        rule = 'تقاطع: داخلي 0.2 × الارتفاع، خارجي (الطول − 0.2) × الارتفاع';
      }
    } else if (ext) { outer = col.length * height; rule = 'خارجي: طول العمود × ارتفاع الدور'; }
    else if (int) { inner = col.length * height; rule = 'داخلي: طول العمود × ارتفاع الدور'; }
    return { id: col.id, index, col, outer, inner, rule };
  });
  const totalOuter = rows.reduce((s, r) => s + r.outer, 0);
  const totalInner = rows.reduce((s, r) => s + r.inner, 0);
  const matches = Math.abs(totalOuter - results.outerColumnArea) < 1e-6 && Math.abs(totalInner - results.innerColumnArea) < 1e-6;
  return <section dir="rtl" style={{ margin: '12px 0', background: '#fff', border: '1px solid #bdd9e4', borderRadius: 10, overflow: 'hidden' }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: 12, border: 0, background: '#eaf9fb', color: '#0b3045', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}>
      {open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية لخصومات كل عمود — الدور {floor + 1}
    </button>
    {open && <div style={{ padding: 12 }}>
      <p style={{ fontSize: 13, color: '#36576b' }}>تُحدد علاقة العمود بالجدران باستخدام المسافة من مركز العمود إلى مقطع الجدار، وسماكة الجدار وعرض العمود. تُطبّق قواعد الخصم نفسها الموجودة في محرك التشطيبات، بما فيها توزيع خصم العمود عند تقاطع جدار خارجي وداخلي. القيم للعرض فقط.</p>
      {rows.length === 0 ? <p>لا توجد أعمدة مرسومة لهذا الدور.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ background: '#0b3045', color: '#fff' }}>{['العمود', 'العرض (م)', 'الطول (م)', 'الارتفاع (م)', 'قاعدة الخصم', 'خصم خارجي (م²)', 'خصم داخلي (م²)'].map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td style={cell}>{r.index + 1}</td><td style={cell}>{fmt(r.col.width)}</td><td style={cell}>{fmt(r.col.length)}</td><td style={cell}>{fmt(height)}</td><td style={cell}>{r.rule}</td><td style={cell}>{fmt(r.outer)}</td><td style={cell}>{fmt(r.inner)}</td></tr>)}</tbody>
        <tfoot><tr style={{ fontWeight: 700 }}><td style={cell} colSpan={5}>مجموع خصومات الأعمدة</td><td style={cell}>{fmt(totalOuter)}</td><td style={cell}>{fmt(totalInner)}</td></tr></tfoot>
      </table></div>}
      {!matches && <p role="status" style={{ color: '#a04b18', fontSize: 13 }}>تنبيه: مجموع خصومات العناصر المرسومة لا يطابق نتيجة الحساب الحالية (خارجي {fmt(results.outerColumnArea)} م²، داخلي {fmt(results.innerColumnArea)} م²). قد تكون النتيجة ناتجة عن مسودة أو تعديلات محفوظة؛ لا تُستخدم هذه التفاصيل لاستبدال النتائج المعتمدة.</p>}
    </div>}
  </section>;
};
