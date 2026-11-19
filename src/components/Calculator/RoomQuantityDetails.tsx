import React, { useState } from 'react';

export interface RoomQuantityRow {
  id: string;
  name: string;
  type: 'room' | 'hall' | 'kitchen' | 'bathroom';
  area: number;
  perimeter: number;
  height: number;
  length?: number;
  width?: number;
}

interface Props {
  rows: RoomQuantityRow[];
  onChange: (rows: RoomQuantityRow[]) => void;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Room geometry breakdown; perimeters come from actual polygon edges, not bounding rectangles. */
export const RoomQuantityDetails: React.FC<Props> = ({ rows, onChange }) => {
  const [open, setOpen] = useState(false);
  const update = (id: string, patch: Partial<RoomQuantityRow>) =>
    onChange(rows.map(row => row.id === id ? { ...row, ...patch } : row));
  const numberField = (row: RoomQuantityRow, field: 'area' | 'perimeter' | 'height') => (
    <input
      aria-label={`${field} ${row.name}`}
      type="number" min="0" step="any" value={row[field]}
      onChange={e => {
        const next = Number(e.target.value);
        if (Number.isFinite(next) && next >= 0) update(row.id, { [field]: next });
      }}
      style={{ width: 85, maxWidth: '100%', boxSizing: 'border-box' }}
    />
  );
  return (
    <section dir="rtl" style={{ margin: '14px 0', border: '1px solid currentColor', borderRadius: 8, padding: 10 }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        {open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية للغرف والمساحات
      </button>
      {open && <>
        <p style={{ fontSize: 12 }}>المحيط محسوب من أضلاع حدود الغرفة الفعلية. المساحات والأبعاد قابلة للتعديل وتحفظ كمسودة لهذا الدور.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 670 }}>
            <thead><tr><th>الغرفة</th><th>النوع</th><th>المساحة م²</th><th>المحيط م</th><th>الارتفاع م</th><th>مساحة الجدران م²</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <td><input aria-label={`اسم الغرفة ${row.id}`} value={row.name} onChange={e => update(row.id, { name: e.target.value })} style={{ width: 120 }} /></td>
              <td>{({room:'غرفة',hall:'صالة',kitchen:'مطبخ',bathroom:'حمام'} as const)[row.type]}</td>
              <td>{numberField(row, 'area')}</td>
              <td>{numberField(row, 'perimeter')}</td>
              <td>{numberField(row, 'height')}</td>
              <td>{round(row.perimeter * row.height)}</td>
            </tr>)}</tbody>
            <tfoot><tr><th colSpan={2}>الإجمالي</th><th>{round(rows.reduce((s,r)=>s+r.area,0))}</th><th>{round(rows.reduce((s,r)=>s+r.perimeter,0))}</th><th>—</th><th>{round(rows.reduce((s,r)=>s+r.perimeter*r.height,0))}</th></tr></tfoot>
          </table>
        </div>
      </>}
    </section>
  );
};
