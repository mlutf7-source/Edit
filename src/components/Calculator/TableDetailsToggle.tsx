import React, { createContext, useContext, useState } from 'react';

export interface DetailValue { label: string; value: number; unit: string; formula?: string; key?: string; }

export const QuantityEditContext = createContext<((key: string, value: number) => void) | null>(null);
/** Edits are committed to the parent calculation state; never keep a display-only draft. */
export const TableDetailsToggle: React.FC<{
  title: string;
  rows: DetailValue[];
  children: React.ReactNode;
}> = ({ title, rows, children }) => {
  const [open, setOpen] = useState(false);
  const onEdit = useContext(QuantityEditContext);
  const [editing, setEditing] = useState<Record<number, string>>({});
  const format = (n: number) => Number.isFinite(n) ? String(Math.round((n + Number.EPSILON) * 100) / 100) : '—';
  return <section dir="rtl" className="qty-table-section" aria-label={title}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
      style={{ marginBottom: 8, padding: '8px 12px', border: '1px solid #9acdd4', borderRadius: 7, background: '#e9fbfc', color: '#073a4a', fontWeight: 700, cursor: 'pointer' }}>
      {open ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'} — {title}
    </button>
    {open && <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr><th>البند المحسوب</th><th>الكمية الحالية</th><th>الوحدة</th><th>طريقة الحساب</th></tr></thead>
        <tbody>{rows.map((row, i) => <tr key={`${row.label}-${i}`}><td>{row.label}</td><td><input type="number" min="0" step="any" aria-label={`كمية ${row.label}`}
          value={editing[i] ?? String(row.value)}
          readOnly={!onEdit || !row.key}
          title={!row.key ? 'قيمة مشتقة: عدّل مدخلاتها الأصلية' : undefined}
          onFocus={e => e.currentTarget.select()}
          onClick={e => e.currentTarget.select()}
          onChange={e => setEditing(prev => ({ ...prev, [i]: e.target.value }))}
          onBlur={() => { const v = editing[i]; if (v !== undefined && row.key && onEdit && v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0) onEdit(row.key, Number(v)); setEditing(prev => { const next = {...prev}; delete next[i]; return next; }); }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{ width: '100%', minWidth: 72, maxWidth: 130, boxSizing: 'border-box', padding: 6, border: '1px solid #9acdd4', borderRadius: 5 }} /></td><td>{row.unit}</td><td dir="auto">{row.formula || "—"}</td></tr>)}</tbody>
      </table>
      <small>القيم القابلة للتعديل تُحفظ في مسودة الدور وتُحدّث الجداول. القيم المشتقة تُعدّل من مدخلاتها الأصلية، ثم يُعاد اعتماد الدور.</small>
    </div>}
    {children}
  </section>;
};
