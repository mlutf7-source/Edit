import React, { useEffect, useMemo, useState } from 'react';
import type { RoomQuantityRow } from './RoomQuantityDetails';

type Kind = 'plaster' | 'paint' | 'tile';
type NumericField = 'length' | 'width' | 'height' | 'area' | 'perimeter';

interface Props {
  kind: Kind;
  rows: RoomQuantityRow[];
  onChange: (rows: RoomQuantityRow[]) => void;
  /** مجموع عروض الأبواب والفتحات التي تقطع النعلة لكل منطقة. */
  skirtingDeductions?: Record<string, number>;
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
  skirtingDeductions = {},
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

  // Use original rows until this finish item has its own saved edits.
  const activeRows: RoomQuantityRow[] =
    controlled && editedRows!.length > 0
      ? editedRows!
      : controlled
        ? rows
        : localRows;
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

  const safeQuantity = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, value) : 0;

  const isWetArea = (r: RoomQuantityRow): boolean =>
    r.type === 'kitchen' || r.type === 'bathroom';

  const isSkirtingArea = (r: RoomQuantityRow): boolean =>
    r.type === 'room' || r.type === 'hall';

  const wallArea = (r: RoomQuantityRow): number =>
    safeQuantity(r.perimeter) * safeQuantity(r.height);

  const wallFinish = (r: RoomQuantityRow): number => {
    if (kind === 'tile') return isWetArea(r) ? wallArea(r) : 0;
    return isWetArea(r) ? 0 : wallArea(r);
  };

  // Floor area for tile; ceiling area for plaster and paint.
  const ceilingFinish = (r: RoomQuantityRow): number => safeQuantity(r.area);

  const skirtingLength = (r: RoomQuantityRow): number =>
    isSkirtingArea(r) ? safeQuantity(r.perimeter) : 0;

  const skirtingDeduction = (r: RoomQuantityRow): number => {
    const gross = skirtingLength(r);
    if (gross <= 0) return 0;
    return Math.min(gross, safeQuantity(skirtingDeductions[r.id] ?? 0));
  };

  const skirtingNetLength = (r: RoomQuantityRow): number =>
    Math.max(0, skirtingLength(r) - skirtingDeduction(r));

  const totals = useMemo(() => ({
    walls: activeRows.reduce((sum, r) => sum + wallFinish(r), 0),
    ceilings: activeRows.reduce((sum, r) => sum + ceilingFinish(r), 0),
    skirting: activeRows.reduce((sum, r) => sum + skirtingLength(r), 0),
    skirtingDeductions: activeRows.reduce((sum, r) => sum + skirtingDeduction(r), 0),
    skirtingNet: activeRows.reduce((sum, r) => sum + skirtingNetLength(r), 0),
  }), [activeRows, kind, skirtingDeductions]);

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
                <>
                  <th style={th}>النعلة الإجمالية (م ط)</th>
                  <th style={th}>خصومات الأبواب والفتحات (م ط)</th>
                  <th style={th}>النعلة الصافية (م ط)</th>
                </>
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
                    <>
                      <td style={td}>{fmt(skirtingLength(r))}</td>
                      <td style={td}>{fmt(skirtingDeduction(r))}</td>
                      <td style={td}>{fmt(skirtingNetLength(r))}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <th style={td} colSpan={6}>إجمالي كميات المناطق</th>
              <th style={td}>{fmt(totals.walls)}</th>
              <th style={td}>{fmt(totals.ceilings)}</th>
              {kind === 'tile' && (
                <>
                  <th style={td}>{fmt(totals.skirting)}</th>
                  <th style={td}>{fmt(totals.skirtingDeductions)}</th>
                  <th style={td}>{fmt(totals.skirtingNet)}</th>
                </>
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
            <small>
              مساحات الجدران المعروضة إجمالية قبل خصومات الفتحات والأعمدة.
              وتشمل مساحات الأسقف جميع أنواع المناطق، بينما يقتصر تلييس ودهان
              الجدران على الغرف والصالات، ويقتصر بلاط الجدران على المطابخ والحمامات.
              {kind === 'tile' && (
                <> تُحسب النعلة للغرف والصالات فقط، وتُعرض كميتها الإجمالية وخصومات
                  الأبواب والفتحات وكميتها الصافية.</>
              )}
              {' '}تُحفظ تعديلات كل بند بصورة مستقلة، وتُعالج مطابقة الكميات الرئيسية
              والعمالة في الملفات المسؤولة عنها.
            </small>
          </div>
        </div>
      )}
    </div>
  );
};
