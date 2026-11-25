import React, { useState } from 'react';
import { addPlumbingRow, removePlumbingRow, updatePlumbingRow, calculatePlumbingQuantities, plumbingCount } from '../../../core/plumbingCalculations';
import type { PlumbingDraft } from '../../../core/plumbingCalculations';

interface Props {
  draft: PlumbingDraft;
  onChange: (draft: PlumbingDraft) => void;
}

const cell: React.CSSProperties = { border: '1px solid var(--qty-border)', padding: 6, textAlign: 'center' };
const button: React.CSSProperties = { padding: '7px 10px', border: '1px solid var(--qty-border)', background: 'var(--qty-accent-soft)', color: 'var(--qty-text)', cursor: 'pointer' };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: 4 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };

const CountInput: React.FC<{ value: number; label: string; onChange: (value: number) => void }> = ({ value, label, onChange }) => {
  const [editing, setEditing] = useState<string | null>(null);
  return <input type="text" inputMode="numeric" aria-label={label} style={{ ...input, minWidth: 52 }}
    value={editing ?? String(plumbingCount(value))}
    onFocus={e => e.currentTarget.select()}
    onChange={e => {
      const raw = e.target.value.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776));
      if (!/^\d*$/.test(raw) || (raw !== '' && !Number.isSafeInteger(Number(raw)))) return;
      setEditing(raw);
      if (raw !== '') onChange(plumbingCount(Number(raw)));
    }}
    onBlur={() => setEditing(null)}
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />;
};

export const PlumbingTable: React.FC<Props> = ({ draft, onChange }) => {
  const [open, setOpen] = useState(false);
  const totals = calculatePlumbingQuantities(draft);
  return <section dir="rtl" className="qty-table-section" aria-label="كميات مواد السباكة" style={{ marginBottom: 12 }}>
    <div className="qty-main-heading">كميات مواد السباكة</div>
    <button type="button" style={{ ...button, margin: '8px 0' }} aria-expanded={open} onClick={() => setOpen(v => !v)}>
      {open ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'} — السباكة
    </button>
    {open && <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={table}>
        <thead><tr>{['المنطقة', 'المادة', 'القطر (إنش)', 'العدد', 'حذف'].map(label => <th key={label} style={cell}>{label}</th>)}</tr></thead>
        <tbody>{draft.rows.map(row => <tr key={row.id}>
          <td style={cell}><input aria-label="اسم المنطقة" value={row.name} style={{ ...input, minWidth: 75 }} onChange={e => onChange(updatePlumbingRow(draft, row.id, { name: e.target.value }))} /></td>
          <td style={cell}><input aria-label="اسم المادة" value={row.material} style={{ ...input, minWidth: 100 }} onChange={e => onChange(updatePlumbingRow(draft, row.id, { material: e.target.value }))} /></td>
          <td style={cell}><input aria-label={`قطر ${row.material} بالإنش`} value={row.diameter} style={{ ...input, minWidth: 60 }} onFocus={e => e.currentTarget.select()} onChange={e => onChange(updatePlumbingRow(draft, row.id, { diameter: e.target.value }))} /></td>
          <td style={cell}><CountInput label={`عدد ${row.material} — ${row.name}`} value={row.quantity} onChange={quantity => onChange(updatePlumbingRow(draft, row.id, { quantity }))} /></td>
          <td style={cell}><button type="button" style={{ ...button, color: 'var(--qty-danger)' }} aria-label={`حذف ${row.material} — ${row.name}`} onClick={() => onChange(removePlumbingRow(draft, row.id))}>حذف</button></td>
        </tr>)}</tbody>
      </table>
      <button type="button" style={{ ...button, margin: '8px 0' }} onClick={() => onChange(addPlumbingRow(draft))}>+ إضافة صف</button>
    </div>}
    <div style={{ overflowX: 'auto' }}>
      <table style={table}>
        <thead><tr>{['المادة', 'القطر (إنش)', 'الكمية', 'الوحدة'].map(label => <th key={label} style={cell}>{label}</th>)}</tr></thead>
        <tbody>{totals.map(item => <tr key={JSON.stringify([item.material, item.diameter])}>
          <td style={cell}>{item.material}</td><td style={cell}>{item.diameter || '—'}</td><td style={cell}>{item.quantity}</td><td style={cell}>{item.unit}</td>
        </tr>)}{totals.length === 0 && <tr><td colSpan={4} style={cell}>لا توجد مواد</td></tr>}</tbody>
      </table>
    </div>
  </section>;
};
