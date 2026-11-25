import React, { useState } from 'react';
import { calculateElectricalQuantities, electricalCount } from '../../../core/electricalCalculations';
import type { ElectricalDraft, ElectricalRow, ElectricalManualQuantities } from '../../../core/electricalCalculations';

interface Props {
  draft: ElectricalDraft;
  onChange: (draft: ElectricalDraft) => void;
}

const cell: React.CSSProperties = { border: '1px solid var(--qty-border)', padding: 6, textAlign: 'center' };
const button: React.CSSProperties = { padding: '7px 10px', border: '1px solid var(--qty-border)', background: 'var(--qty-accent-soft)', color: 'var(--qty-text)', cursor: 'pointer' };
const input: React.CSSProperties = { width: 76, textAlign: 'center', padding: 4 };
const manualItems: { key: keyof ElectricalManualQuantities; label: string; unit: string }[] = [
  { key: 'wireRolls', label: 'لفات السلك الكهربائي', unit: 'لفة' },
  { key: 'conduitRolls', label: 'لفات بيبات التمديدات الكهربائية', unit: 'لفة' },
  { key: 'dynamos', label: 'الديناموهات', unit: 'عدد' },
];

const CountInput: React.FC<{ value: number; label: string; onChange: (value: number) => void }> = ({ value, label, onChange }) => {
  const [editing, setEditing] = useState<string | null>(null);
  return <input type="text" inputMode="numeric" aria-label={label} style={input}
    value={editing ?? String(electricalCount(value))}
    onFocus={e => e.currentTarget.select()}
    onChange={e => {
      const raw = e.target.value;
      if (!/^\d*$/.test(raw)) return;
      setEditing(raw);
      if (raw !== '' && Number.isSafeInteger(Number(raw))) onChange(electricalCount(Number(raw)));
    }}
    onBlur={() => setEditing(null)}
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />;
};

export const ElectricalTable: React.FC<Props> = ({ draft, onChange }) => {
  const [open, setOpen] = useState(false);
  const totals = calculateElectricalQuantities(draft);
  const updateRow = (id: string, patch: Partial<Pick<ElectricalRow, 'name' | 'lampHolders' | 'switches'>>) =>
    onChange({ ...draft, rows: draft.rows.map(row => row.id === id ? { ...row, ...patch } : row) });
  const updateManual = (key: keyof ElectricalManualQuantities, value: number) =>
    onChange({ ...draft, manual: { ...draft.manual, [key]: value } });
  const addRow = () => {
    let index = 1;
    const ids = new Set([...draft.rows, ...draft.originalRows].map(row => row.id));
    while (ids.has(`manual:electrical:${index}`)) index++;
    onChange({ ...draft, rows: [...draft.rows, { id: `manual:electrical:${index}`, name: 'منطقة إضافية', lampHolders: 0, switches: 0 }] });
  };
  return <section dir="rtl" className="qty-table-section" aria-label="كميات مواد الكهرباء" style={{ marginBottom: 12 }}>
    <div className="qty-main-heading">كميات مواد الكهرباء</div>
    <button type="button" style={{ ...button, margin: '8px 0' }} aria-expanded={open} onClick={() => setOpen(v => !v)}>
      {open ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'} — الكهرباء
    </button>
    {open && <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr>{['المنطقة', 'بيوت اللمبات', 'المفاتيح', 'حذف'].map(label => <th key={label} style={cell}>{label}</th>)}</tr></thead>
        <tbody>{draft.rows.map(row => <tr key={row.id}>
          <td style={cell}><input aria-label="اسم المنطقة" value={row.name} style={{ width: '100%', minWidth: 90, padding: 4 }} onChange={e => updateRow(row.id, { name: e.target.value })} /></td>
          <td style={cell}><CountInput label={`بيوت اللمبات — ${row.name}`} value={row.lampHolders} onChange={value => updateRow(row.id, { lampHolders: value })} /></td>
          <td style={cell}><CountInput label={`المفاتيح — ${row.name}`} value={row.switches} onChange={value => updateRow(row.id, { switches: value })} /></td>
          <td style={cell}><button type="button" style={{ ...button, color: 'var(--qty-danger)' }} aria-label={`حذف ${row.name}`} onClick={() => onChange({ ...draft, rows: draft.rows.filter(item => item.id !== row.id) })}>حذف</button></td>
        </tr>)}</tbody>
      </table>
      <button type="button" style={{ ...button, margin: '8px 0' }} onClick={addRow}>+ إضافة صف</button>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th style={cell}>المواد المدخلة يدوياً</th><th style={cell}>الكمية</th><th style={cell}>الوحدة</th></tr></thead>
        <tbody>{manualItems.map(item => <tr key={item.key}><td style={cell}>{item.label}</td><td style={cell}><CountInput label={item.label} value={draft.manual[item.key]} onChange={value => updateManual(item.key, value)} /></td><td style={cell}>{item.unit}</td></tr>)}</tbody>
      </table>
    </div>}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th style={cell}>المادة</th><th style={cell}>الكمية</th><th style={cell}>الوحدة</th></tr></thead>
        <tbody>
          <tr><td style={cell}>بيوت اللمبات</td><td style={cell}>{totals.lampHolders}</td><td style={cell}>عدد</td></tr>
          <tr><td style={cell}>المفاتيح</td><td style={cell}>{totals.switches}</td><td style={cell}>عدد</td></tr>
          {manualItems.map(item => <tr key={item.key}><td style={cell}>{item.label}</td><td style={cell}>{totals[item.key]}</td><td style={cell}>{item.unit}</td></tr>)}
        </tbody>
      </table>
    </div>
  </section>;
};
