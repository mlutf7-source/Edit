import React, { useEffect, useMemo, useState } from 'react';
import type { RoomQuantityRow } from './RoomQuantityDetails';

type Kind = 'plaster' | 'paint' | 'tile';
type NumericField = 'length' | 'width' | 'height' | 'area' | 'perimeter';

interface Props {
  kind: Kind;
  rows: RoomQuantityRow[];
  onChange: (rows: RoomQuantityRow[]) => void;
  /** Independent rows for this finish item, supplied by the parent for draft persistence. */
  editedRows?: RoomQuantityRow[];
  /** Save changes to the independent rows for this finish item. */
  onEditedRowsChange?: (rows: RoomQuantityRow[]) => void;
}

const fmt = (v: number) => String(Math.round((v + Number.EPSILON) * 100) / 100);
const th: React.CSSProperties = {
  border: '1px solid #cbd5e1', padding: 8, background: '#0b354a',
  color: 'white', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  border: '1px solid #cbd5e1', padding: 6, textAlign: 'center',
};

const createRow = (): RoomQuantityRow => ({
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: '', type: 'room', length: 0, width: 0,
  height: 0, area: 0, perimeter: 0,
});

export const RoomFinishBreakdown: React.FC<Props> = ({
  kind, rows, onChange: _onChange, editedRows, onEditedRowsChange,
}) => {
  const [open, setOpen] = useState(false);
  // Local fallback keeps edits confined to this particular table. The parent
  // should provide editedRows/onEditedRowsChange for floor-draft persistence.
  const [localRows, setLocalRows] = useState<RoomQuantityRow[]>(() => rows.map(r => ({ ...r })));
  const controlled = editedRows !== undefined && onEditedRowsChange !== undefined;

  useEffect(() => {
    if (controlled) return;
    setLocalRows(previous => {
      const oldById = new Map(previous.map(r => [r.id, r]));
      const originals = rows.map(r => oldById.get(r.id) ?? { ...r });
      const manual = previous.filter(r => r.id.startsWith('manual-'));
      return [...originals, ...manual.filter(r => !rows.some(base => base.id === r.id))];
    });
  }, [rows, controlled]);

  const activeRows = controlled ? editedRows! : localRows;
  const updateRows = (next: RoomQuantityRow[]) => {
    if (controlled) onEditedRowsChange!(next);
    else setLocalRows(next);
  };

  const change = (row: RoomQuantityRow, field: NumericField, value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    updateRows(activeRows.map(r => {
      if (r.id !== row.id) return r;
      if (field === 'length' || field === 'width') {
        const length = field === 'length' ? value : (r.length ?? 0);
        const width = field === 'width' ? value : (r.width ?? 0);
        return { ...r, length, width, area: length * width, perimeter: 2 * (length + width) };
      }
      return { ...r, [field]: value };
    }));
  };

  const numeric = (row: RoomQuantityRow, field: NumericField) => {
    const value = row[field];
    if ((field === 'length' || field === 'width') && value === undefined) {
      return <span title="المنطقة غير مستطيلة؛ عدّل المساحة والمحيط">—</span>;
    }
    return (
      <input
        aria-label={`${field} ${row.name}`}
        type="number" min="0" step="any"
        key={`${kind}-${row.id}-${field}-${fmt(Number(value ?? 0))}`}
        defaultValue={fmt(Number(value ?? 0))}
        onFocus={e => e.currentTarget.select()}
        onClick={e => e.currentTarget.select()}
        onBlur={e => {
          const input = e.currentTarget;
          const next = Number(input.value);
          if (input.value !== '' && Number.isFinite(next) && next >= 0) {
            change(row, field, next);
            input.value = fmt(next);
          } else {
            input.value = fmt(Number(value ?? 0));
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ width: 72, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'center' }}
      />
    );
  };

  const wall = (r: RoomQuantityRow) => r.perimeter * r.height;
  const isTiled = (r: RoomQuantityRow) => r.type === 'kitchen' || r.type === 'bathroom';
  const wallFinish = (r: RoomQuantityRow) => kind === 'tile'
    ? (isTiled(r) ? wall(r) : 0)
    : (isTiled(r) ? 0 : wall(r));
  

const ceilingFinish = (r: RoomQuantityRow) => r.area;
  
const skirtingLength = (r: RoomQuantityRow) => {
  if (r.type === 'kitchen' || r.type === 'bathroom') {
    return 0;
  }

  return r.perimeter;
};
  



  
const totals = useMemo(() => ({
  walls: activeRows.reduce(
    (sum, r) => sum + wallFinish(r), 0
  ),
  ceilings: activeRows.reduce(
    (sum, r) => sum + ceilingFinish(r), 0
  ),
  skirting: activeRows.reduce(
    (sum, r) => sum + skirtingLength(r), 0
  ),
}), [activeRows, kind]);


  return (
    <div dir="rtl" style={{ padding: '8px 10px' }}>
      <button
        type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ padding: '10px 12px', border: '1px solid #b9d6df', borderRadius: 8, background: '#ecf8fa', cursor: 'pointer', width: '100%', textAlign: 'right' }}
      >
        {open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية حسب الغرفة
      </button>
      {open && (
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 790, width: '100%', fontSize: 13 }}>
            <thead><tr>
              <th style={th}>المنطقة</th>
              <th style={th}>الطول م</th>
              <th style={th}>العرض م</th>
              <th style={th}>الارتفاع م</th>
              <th style={th}>المساحة م²</th>
              <th style={th}>المحيط م</th>
              <th style={th}>{kind === 'tile' ? 'بلاط الجدران م²' : kind === 'paint' ? 'طلاء الجدران م²' : 'تلييس الجدران م²'}</th>
              <th style={th}>{kind === 'tile' ? 'بلاط الأرضية م²' : kind === 'paint' ? 'طلاء السقف م²' : 'تلييس السقف م²'}</th>
              {kind === 'tile' && (
  <th style={th}>النعلة الإجمالية (م ط)</th>
)}
            </tr></thead>
            <tbody>
              {activeRows.map(r => (
                <tr key={r.id}>
                  <td style={td}>
                    <input
                      type="text" aria-label={`اسم المنطقة ${r.id}`}
                      value={r.name}
                      onChange={e => updateRows(activeRows.map(item =>
                        item.id === r.id ? { ...item, name: e.target.value } : item
                      ))}
                      style={{ width: 115, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'right', padding: 5 }}
                    />
                  </td>
                  <td style={td}>{numeric(r, 'length')}</td>
                  <td style={td}>{numeric(r, 'width')}</td>
                  <td style={td}>{numeric(r, 'height')}</td>
                  <td style={td}>{numeric(r, 'area')}</td>
                  <td style={td}>{numeric(r, 'perimeter')}</td>
                  
<td style={td}>{fmt(wallFinish(r))}</td>
<td style={td}>{fmt(ceilingFinish(r))}</td>
{kind === 'tile' && (
  <td style={td}>{fmt(skirtingLength(r))}</td>
)}
</tr>

              ))}
            </tbody>
            <tfoot><tr>
              
<th style={td} colSpan={6}>
  إجمالي كميات المناطق قبل خصم الفتحات
</th>
              
              
<th style={td}>{fmt(totals.walls)}</th>
<th style={td}>{fmt(totals.ceilings)}</th>
{kind === 'tile' && (
  <th style={td}>{fmt(totals.skirting)}</th>
)}
</tr></tfoot>

          </table>
          <button
            type="button" onClick={() => updateRows([...activeRows, createRow()])}
            style={{ marginTop: 10, padding: '9px 14px', background: '#0f4c81', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }}
          >
            + إضافة صف
          </button>
          <div style={{ marginTop: 8 }}>
            <small>المساحات التفصيلية أولية قبل خصومات الفتحات وإشغال الجدران؛ إجمالي البند المعتمد يُحسب وفق محرك الكميات. الأبعاد المباشرة متاحة للمناطق المستطيلة فقط.</small>
          </div>
        </div>
      )}
    </div>
  );
};
