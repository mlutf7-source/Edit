import React, { useEffect, useState } from 'react';

export interface DetailValue { label: string; value: number; unit: string; formula?: string; }

/** Read-only breakdown of source result fields. Editing and formula-level tracing follow in phase 5. */
export const TableDetailsToggle: React.FC<{
  title: string;
  rows: DetailValue[];
  children: React.ReactNode;
}> = ({ title, rows, children }) => {
  const [open, setOpen] = useState(false);
  // Editable detail draft; source calculations remain authoritative.
  const [draft, setDraft] = useState<Record<number, string>>({});
  useEffect(() => setDraft({}), [rows]);
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
          value={draft[i] ?? String(row.value)}
          onChange={e => setDraft(prev => ({ ...prev, [i]: e.target.value }))}
          style={{ width: '100%', minWidth: 72, maxWidth: 130, boxSizing: 'border-box', padding: 6, border: '1px solid #9acdd4', borderRadius: 5 }} /></td><td>{row.unit}</td><td dir="auto">{row.formula || "—"}</td></tr>)}</tbody>
      </table>
      <small>التعديل هنا للمراجعة فقط، ولا يغير نتائج محرك الحساب أو إجماليات الجداول. لتغيير الكميات المعتمدة عدّل المدخلات الأصلية.</small>
    </div>}
    {children}
  </section>;
};
