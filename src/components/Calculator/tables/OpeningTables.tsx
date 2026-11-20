import React, { useState } from 'react';
import type { FinishResults } from '../../../core/finishCalculations';

export interface WindowDetailRow { name: string; count: number; width: number; height: number; }
export type DoorKind = 'regular' | 'main' | 'shop';
export interface DoorDetailRow { name: string; kind: DoorKind; count: number; width: number; height: number; }
const fmt = (n: number) => Number.isFinite(n) ? String(Math.round((n + Number.EPSILON) * 100) / 100) : '0';

interface Props {
  results: FinishResults;
  isGroundFloor?: boolean;
  windowRows?: WindowDetailRow[];
  onWindowRowsChange?: (rows: WindowDetailRow[]) => void;
  doorRows?: DoorDetailRow[];
  onDoorRowsChange?: (rows: DoorDetailRow[]) => void;
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 12,
};

const headStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '10px 12px',
  fontWeight: 700,
  color: '#003366',
  fontSize: 14,
  borderBottom: '1px solid #ddd',
};

const bodyStyle: React.CSSProperties = {
  padding: 10,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
};

const thStyle: React.CSSProperties = {
  background: '#003366',
  color: 'white',
  padding: '8px 6px',
  border: '1px solid #003366',
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 6px',
  border: '1px solid #ccc',
  textAlign: 'center',
};

export const OpeningTables: React.FC<Props> = ({ results, isGroundFloor = false, windowRows, onWindowRowsChange, doorRows, onDoorRowsChange }) => {
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [doorDrafts, setDoorDrafts] = useState<Record<string, string>>({});
  const doorData = doorRows ?? results.doorGroups.map((g, i) => ({ name: `باب ${i + 1}`, kind: 'regular' as DoorKind, count: g.count, width: g.width, height: g.height }));
  const doorKinds: Array<{ kind: DoorKind; label: string }> = [
    { kind: 'regular', label: 'أبواب داخلية' },
    { kind: 'main', label: 'أبواب خارجية' },
    { kind: 'shop', label: 'أبواب المحلات' },
  ];
  const doorTotal = (kind?: DoorKind) => doorData.filter(r => !kind || r.kind === kind).reduce((sum, r) => sum + r.count * r.width * r.height, 0);
  const updateDoor = (index: number, field: keyof DoorDetailRow, raw: string) => {
    if (!onDoorRowsChange) return;
    const next = doorData.map(r => ({ ...r }));
    if (field === 'name') next[index].name = raw;
    else if (field === 'kind') next[index].kind = raw as DoorKind;
    else {
      const value = Number(raw);
      if (!raw.trim() || !Number.isFinite(value) || value < 0) return;
      next[index][field] = field === 'count' ? Math.floor(value) : value;
    }
    onDoorRowsChange(next);
  };
  const doorCell = (row: DoorDetailRow, index: number, field: 'name' | 'count' | 'width' | 'height') => {
    const key = `door:${index}:${field}`;
    return <input aria-label={`${row.name} - ${field}`} type={field === 'name' ? 'text' : 'number'}
      min={field === 'name' ? undefined : 0} step={field === 'count' ? 1 : 'any'}
      value={doorDrafts[key] ?? (field === 'name' ? row.name : fmt(row[field]))}
      onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()}
      onPointerUp={e => { if (e.pointerType === 'touch') e.currentTarget.select(); }}
      onChange={e => setDoorDrafts(old => ({ ...old, [key]: e.target.value }))}
      onBlur={() => {
        if (doorDrafts[key] !== undefined) updateDoor(index, field, doorDrafts[key]);
        setDoorDrafts(old => { const next = { ...old }; delete next[key]; return next; });
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{ width: field === 'name' ? 110 : 70, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'center', border: '1px solid #9acdd4', borderRadius: 5, padding: '6px 3px', fontSize: 13 }} />;
  };

  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
  const rows = windowRows ?? results.windowGroups.map((g, i) => ({ name: `نافذة ${i + 1}`, count: g.count, width: g.width, height: g.height }));
  const total = rows.reduce((sum, r) => sum + r.count * r.width * r.height, 0);
  const update = (index: number, field: keyof WindowDetailRow, raw: string) => {
    if (!onWindowRowsChange) return;
    const next = rows.map(r => ({ ...r }));
    if (field === 'name') next[index].name = raw;
    else { const value = Number(raw); if (!raw.trim() || !Number.isFinite(value) || value < 0) return; next[index][field] = field === 'count' ? Math.floor(value) : value; }
    onWindowRowsChange(next);
  };
  const cell = (row: WindowDetailRow, i: number, field: keyof WindowDetailRow) => {
    const key = `${i}:${field}`;
    return <input aria-label={`${row.name} - ${field}`} type={field === 'name' ? 'text' : 'number'} min={field === 'name' ? undefined : 0} step={field === 'count' ? 1 : 'any'}
      value={draftInputs[key] ?? (field === 'name' ? row.name : fmt(row[field] as number))}
      onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()}
      onPointerUp={e => { if (e.pointerType === 'touch') e.currentTarget.select(); }}
      onChange={e => setDraftInputs(old => ({ ...old, [key]: e.target.value }))}
      onBlur={() => { if (draftInputs[key] !== undefined) update(i, field, draftInputs[key]); setDraftInputs(old => { const next = { ...old }; delete next[key]; return next; }); }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{ width: field === 'name' ? 110 : 70, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'center', border: '1px solid #9acdd4', borderRadius: 5, padding: '6px 3px', fontSize: 13 }} />;
  };
  return (
    <>
      {/* جدول النوافذ */}
      <div style={cardStyle}>
        <div className="qty-main-heading">🪟 بند النوافذ</div>
        <section dir="rtl" className="qty-table-section">
          <button type="button" aria-expanded={windowsOpen} onClick={() => setWindowsOpen(v => !v)}
            style={{ marginBottom: 8, padding: '8px 12px', border: '1px solid #9acdd4', borderRadius: 7, background: '#e9fbfc', color: '#073a4a', fontWeight: 700, cursor: 'pointer' }}>
            {windowsOpen ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'} — 🪟 بند النوافذ
          </button>
          {windowsOpen && <div style={{ overflowX: 'auto', marginBottom: 10 }}>
            <table style={tableStyle} dir="rtl">
              <thead><tr>{['النافذة', 'العدد', 'العرض (م)', 'الارتفاع (م)', 'المساحة (م²)'].map(label => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
              <tbody>
                {rows.map((row, i) => <tr key={i} style={{ background: i % 2 ? '#f3f8fa' : '#fff' }}>
                  <td style={tdStyle}>{cell(row, i, 'name')}</td>
                  <td style={tdStyle}>{cell(row, i, 'count')}</td>
                  <td style={tdStyle}>{cell(row, i, 'width')}</td>
                  <td style={tdStyle}>{cell(row, i, 'height')}</td>
                  <td style={tdStyle}>{fmt(row.count * row.width * row.height)}</td>
                </tr>)}
                <tr style={{ background: '#f0f0f0', fontWeight: 700 }}><td style={tdStyle} colSpan={4}>إجمالي مساحة النوافذ (الفتحات دون مضاعفة شباك الحماية)</td><td style={tdStyle}>{fmt(total)}</td></tr>
              </tbody>
            </table>
          </div>}
        </section>
        <div style={bodyStyle}>
          <table style={tableStyle} dir="rtl">
            <thead>
              <tr>
                <th style={thStyle}>نوع النافذة</th>
                <th style={thStyle}>عدد النوافذ</th>
                <th style={thStyle}>الأبعاد (م)</th>
                <th style={thStyle}>مساحة النافذة (م²)</th>
                <th style={thStyle}>إجمالي المساحات (م²)</th>
              </tr>
            </thead>
            <tbody>
              {(['ألمنيوم', ...(isGroundFloor ? ['شباك حماية'] : [])]).map(type => (
                <React.Fragment key={type}>
                  {rows.map((g, i) => (
                    <tr key={`${type}-${i}`}>
                      <td style={tdStyle}>{type}</td>
                      <td style={tdStyle}>{fmt(g.count)}</td>
                      <td style={tdStyle}>{fmt(g.width)} × {fmt(g.height)}</td>
                      <td style={tdStyle}>{fmt(g.width * g.height)}</td>
                      <td style={tdStyle}>{fmt(g.count * g.width * g.height)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f0f0f0', fontWeight: 700 }}>
                    <td style={tdStyle} colSpan={4}>{type === 'ألمنيوم' ? 'إجمالي مساحة نوافذ الألمنيوم' : 'إجمالي مساحة شبابيك الحماية'}</td>
                    <td style={tdStyle}>{fmt(total)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول الأبواب — تفصيل قابل للتعديل مع أنواع الأبواب الفعلية */}
      <div style={cardStyle}>
        <div className="qty-main-heading">🚪 بند الأبواب</div>
        <section dir="rtl" className="qty-table-section">
          <button type="button" aria-expanded={doorsOpen} onClick={() => setDoorsOpen(v => !v)}
            style={{ marginBottom: 8, padding: '8px 12px', border: '1px solid #9acdd4', borderRadius: 7, background: '#e9fbfc', color: '#073a4a', fontWeight: 700, cursor: 'pointer' }}>
            {doorsOpen ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'} — 🚪 بند الأبواب
          </button>
          {doorsOpen && <div style={{ overflowX: 'auto', marginBottom: 10 }}>
            <table style={tableStyle} dir="rtl">
              <thead><tr>{['الباب', 'نوع الباب', 'العدد', 'العرض (م)', 'الارتفاع (م)', 'المساحة (م²)'].map(label => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
              <tbody>
                {doorData.map((row, i) => <tr key={i} style={{ background: i % 2 ? '#f3f8fa' : '#fff' }}>
                  <td style={tdStyle}>{doorCell(row, i, 'name')}</td>
                  <td style={tdStyle}><select aria-label={`نوع ${row.name}`} value={row.kind} disabled={!onDoorRowsChange}
                    onChange={e => updateDoor(i, 'kind', e.target.value)} style={{ maxWidth: 115, padding: 5, border: '1px solid #9acdd4', borderRadius: 5 }}>
                    {doorKinds.map(t => <option key={t.kind} value={t.kind}>{t.label}</option>)}
                  </select></td>
                  <td style={tdStyle}>{doorCell(row, i, 'count')}</td>
                  <td style={tdStyle}>{doorCell(row, i, 'width')}</td>
                  <td style={tdStyle}>{doorCell(row, i, 'height')}</td>
                  <td style={tdStyle}>{fmt(row.count * row.width * row.height)}</td>
                </tr>)}
                <tr style={{ background: '#f0f0f0', fontWeight: 700 }}><td style={tdStyle} colSpan={5}>إجمالي مساحة الأبواب</td><td style={tdStyle}>{fmt(doorTotal())}</td></tr>
              </tbody>
            </table>
          </div>}
        </section>
        <div style={bodyStyle}>
          <table style={tableStyle} dir="rtl">
            <thead><tr>
              <th style={thStyle}>نوع الباب</th><th style={thStyle}>عدد الأبواب</th>
              <th style={thStyle}>الأبعاد (م)</th><th style={thStyle}>مساحة الباب (م²)</th>
              <th style={thStyle}>إجمالي المساحات (م²)</th>
            </tr></thead>
            <tbody>
              {doorKinds.filter(t => doorData.some(r => r.kind === t.kind)).map(t => <React.Fragment key={t.kind}>
                {doorData.filter(r => r.kind === t.kind).map((r, i) => <tr key={`${t.kind}-${i}`}>
                  <td style={tdStyle}>{t.label}</td><td style={tdStyle}>{fmt(r.count)}</td>
                  <td style={tdStyle}>{fmt(r.width)} × {fmt(r.height)}</td>
                  <td style={tdStyle}>{fmt(r.width * r.height)}</td>
                  <td style={tdStyle}>{fmt(r.count * r.width * r.height)}</td>
                </tr>)}
                <tr style={{ background: '#f0f0f0', fontWeight: 700 }}>
                  <td style={tdStyle} colSpan={4}>إجمالي مساحة {t.label}</td>
                  <td style={tdStyle}>{fmt(doorTotal(t.kind))}</td>
                </tr>
              </React.Fragment>)}
               
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
