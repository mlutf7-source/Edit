import React, { useState } from 'react';
import type { RoomQuantityRow } from './RoomQuantityDetails';

type Kind = 'plaster' | 'paint' | 'tile';
interface Props { kind: Kind; rows: RoomQuantityRow[]; onChange: (rows: RoomQuantityRow[]) => void; }
const fmt = (v: number) => String(Math.round((v + Number.EPSILON) * 100) / 100);
const th: React.CSSProperties = { border: '1px solid #cbd5e1', padding: 8, background: '#0b354a', color: 'white', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { border: '1px solid #cbd5e1', padding: 6, textAlign: 'center' };
export const RoomFinishBreakdown: React.FC<Props> = ({ kind, rows, onChange }) => {
  const [open, setOpen] = useState(false);
  const change = (row: RoomQuantityRow, field: 'length' | 'width' | 'height' | 'area' | 'perimeter', value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    const next = rows.map(r => {
      if (r.id !== row.id) return r;
      if (field === 'length' || field === 'width') {
        const length = field === 'length' ? value : (r.length ?? 0);
        const width = field === 'width' ? value : (r.width ?? 0);
        return { ...r, length, width, area: length * width, perimeter: 2 * (length + width) };
      }
      return { ...r, [field]: value };
    });
    onChange(next);
  };
  const numeric = (row: RoomQuantityRow, field: 'length' | 'width' | 'height' | 'area' | 'perimeter') => {
    const value = row[field];
    if ((field === 'length' || field === 'width') && value === undefined) return <span title="المنطقة غير مستطيلة؛ عدّل المساحة والمحيط">—</span>;
    return <input aria-label={`${field} ${row.name}`} type="number" min="0" step="any" key={`${row.id}-${field}`} defaultValue={fmt(Number(value ?? 0))} onFocus={e => e.currentTarget.select()} onBlur={e => { const v = Number(e.currentTarget.value); if (e.currentTarget.value !== '' && Number.isFinite(v)) change(row, field, v); else e.currentTarget.value = fmt(Number(value ?? 0)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} style={{ width: 72, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'center' }} />;
  };
  const wall = (r: RoomQuantityRow) => r.perimeter * r.height;
  const isTiled = (r: RoomQuantityRow) => r.type === 'kitchen' || r.type === 'bathroom';
  const wallFinish = (r: RoomQuantityRow) => kind === 'tile' ? (isTiled(r) ? wall(r) : 0) : (isTiled(r) ? 0 : wall(r));
  const ceilingFinish = (r: RoomQuantityRow) => kind === 'tile' ? r.area : (isTiled(r) ? 0 : r.area);
  return <div dir="rtl" style={{ padding: '8px 10px' }}>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} style={{ padding: '10px 12px', border: '1px solid #b9d6df', borderRadius: 8, background: '#ecf8fa', cursor: 'pointer', width: '100%', textAlign: 'right' }}>{open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية حسب الغرفة</button>
    {open && <div style={{ overflowX: 'auto', marginTop: 8 }}><table style={{ borderCollapse: 'collapse', minWidth: 790, width: '100%', fontSize: 13 }}><thead><tr><th style={th}>المنطقة</th><th style={th}>الطول م</th><th style={th}>العرض م</th><th style={th}>الارتفاع م</th><th style={th}>المساحة م²</th><th style={th}>المحيط م</th><th style={th}>{kind === 'tile' ? 'بلاط الجدران م²' : kind === 'paint' ? 'طلاء الجدران م²' : 'تلييس الجدران م²'}</th><th style={th}>{kind === 'tile' ? 'بلاط الأرضية م²' : kind === 'paint' ? 'طلاء السقف م²' : 'تلييس السقف م²'}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td style={td}>{r.name}</td><td style={td}>{numeric(r, 'length')}</td><td style={td}>{numeric(r, 'width')}</td><td style={td}>{numeric(r, 'height')}</td><td style={td}>{numeric(r, 'area')}</td><td style={td}>{numeric(r, 'perimeter')}</td><td style={td}>{fmt(wallFinish(r))}</td><td style={td}>{fmt(ceilingFinish(r))}</td></tr>)}</tbody><tfoot><tr><th style={td} colSpan={6}>مجموع المساحات الأولية للغرف</th><th style={td}>{fmt(rows.reduce((s,r) => s + wallFinish(r),0))}</th><th style={td}>{fmt(rows.reduce((s,r) => s + ceilingFinish(r),0))}</th></tr></tfoot></table><small>المساحات التفصيلية أولية قبل خصومات الفتحات وإشغال الجدران؛ إجمالي البند المعتمد يُحسب وفق محرك الكميات. الأبعاد المباشرة متاحة للمناطق المستطيلة فقط.</small></div>}
  </div>;
};
