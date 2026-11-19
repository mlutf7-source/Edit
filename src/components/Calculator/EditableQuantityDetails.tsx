import React, { useState } from 'react';

export type QuantityDetail = { id: string; name: string; quantity: number; unit: string };

interface Props {
  rows: QuantityDetail[];
  onChange: (rows: QuantityDetail[]) => void;
}

/** Editable per-item quantity breakdown; the approved snapshot is updated only by the approve action. */
export const EditableQuantityDetails: React.FC<Props> = ({ rows, onChange }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const independent = new Set(['electricalPoints', 'plumbingPoints', 'totalMarbleArea', 'marbleLaborArea']);
  return (
    <section dir="rtl" style={{ margin: '16px 0', color: 'inherit' }}>
      <h3>الحسابات التفصيلية القابلة للتعديل</h3>
      <p style={{ fontSize: 12 }}>يمكن تعديل نقاط الخدمات والرخام فقط مباشرةً. بقية الكميات مشتقة من المعادلات ولا يمكن تعديل إجمالياتها دون تعديل مدخلاتها الهندسية. التعديلات المسموحة تحفظ كمسودة إلى حين الاعتماد.</p>
      {rows.map(row => (
        <div key={row.id} style={{ marginBottom: 8, border: '1px solid currentColor', borderRadius: 6, padding: 8 }}>
          <button type="button" aria-expanded={Boolean(expanded[row.id])} onClick={() => setExpanded(old => ({ ...old, [row.id]: !old[row.id] }))}>
            {expanded[row.id] ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'} — {row.name}
          </button>
          {expanded[row.id] && (
            <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
              <thead><tr><th>اسم البند</th><th>الكمية</th><th>الوحدة</th></tr></thead>
              <tbody><tr>
                <td><input aria-label={`اسم ${row.id}`} value={row.name} onChange={e => onChange(rows.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))} style={{ width: '95%' }} /></td>
                <td><input disabled={!independent.has(row.id)} title={!independent.has(row.id) ? 'كمية مشتقة: عدّل المدخلات الهندسية بدلاً من الإجمالي' : undefined} aria-label={`كمية ${row.id}`} type="number" min="0" step="any" value={row.quantity} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0) onChange(rows.map(r => r.id === row.id ? { ...r, quantity: value } : r)); }} style={{ width: '95%' }} /></td>
                <td>{row.unit}</td>
              </tr></tbody>
            </table>
          )}
        </div>
      ))}
    </section>
  );
};
