import type { RoomQuantityRow } from '../RoomQuantityDetails';
import { plasterDetailTotals, plasterMaterials, type PlasterOpeningsByRoom } from '../plasterDetailCalculations';
import { RoomFinishBreakdown } from '../RoomFinishBreakdown';
import React, { useState } from 'react';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  /** Incremented by the parent when the selected floor draft is reset. */
  resetRevision?: number;
  /** Persistent detail overrides owned by the selected floor draft. */
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  roomRows?: RoomQuantityRow[];
  plasterOpenings?: PlasterOpeningsByRoom;
  onRoomRowsChange?: (rows: RoomQuantityRow[]) => void;
  plasterRows?: RoomQuantityRow[];
  paintRows?: RoomQuantityRow[];
  onPlasterRowsChange?: (rows: RoomQuantityRow[]) => void;
  onPaintRowsChange?: (rows: RoomQuantityRow[]) => void;
  results: FinishResults;
  hasExteriorPlaster?: boolean;
  exteriorPlasterArea?: number;
  exteriorPlasterGross?: number;
  exteriorPlasterOpenings?: number;
  exteriorPlasterCement?: number;
  exteriorPlasterSand?: number;
  exteriorPlasterLabor?: number;
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

export const PlasterPaintTables: React.FC<Props> = ({ resetRevision = 0, detailCellEdits, onDetailCellEdit, results, roomRows, plasterOpenings = {}, onRoomRowsChange, plasterRows, paintRows, onPlasterRowsChange, onPaintRowsChange,
  hasExteriorPlaster = false, exteriorPlasterArea = 0, exteriorPlasterGross = 0,
  exteriorPlasterOpenings = 0, exteriorPlasterCement = 0,
  exteriorPlasterSand = 0, exteriorPlasterLabor = 0 }) => {
  const [exteriorDetailsOpen, setExteriorDetailsOpen] = useState(false);
  const fmt = (n: number) => String(Math.round((n + Number.EPSILON) * 100) / 100);
  // Stable identifiers use the original labels, not user-edited display names.
  const exteriorDetail = (rowId: string, originalValue: number) => {
    const edit = detailCellEdits?.[JSON.stringify(['exteriorPlaster', rowId])];
    return {
      label: edit?.label?.trim() || rowId,
      value: typeof edit?.value === 'number' && Number.isFinite(edit.value) && edit.value >= 0
        ? edit.value : originalValue,
    };
  };
  const commitExteriorValue = (rowId: string, raw: string) => {
    if (!onDetailCellEdit || raw.trim() === '') return;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0)
      onDetailCellEdit('exteriorPlaster', rowId, { value });
  };

  // Plaster table reads the exact same detailed room quantities as its breakdown.
  const plasterDetails = roomRows?.length
    ? plasterDetailTotals(plasterRows?.length ? plasterRows : roomRows, plasterOpenings)
    : null;
  const correctedPlasterWalls = plasterDetails?.walls ?? results.correctedPlasterWalls;
  const correctedPlasterCeiling = plasterDetails?.ceilings ?? results.correctedPlasterCeiling;
  const plasterMaterialQuantities = plasterDetails
    ? plasterMaterials(correctedPlasterWalls, correctedPlasterCeiling)
    : null;
  const correctedPlasterCement = plasterMaterialQuantities?.cement ?? results.correctedPlasterCement;
  const correctedPlasterSand = plasterMaterialQuantities?.sand ?? results.correctedPlasterSand;

  // Paint owns independent editable rows, using the same geometry and deductions as plaster.
  const paintDetails = roomRows !== undefined
    ? plasterDetailTotals(paintRows?.length ? paintRows : roomRows, plasterOpenings)
    : null;
  const correctedPaintWalls = paintDetails?.walls ?? results.correctedPaintWalls;
  const correctedPaintCeiling = paintDetails?.ceilings ?? results.correctedPaintCeiling;
  const correctedPaintTotal = correctedPaintWalls + correctedPaintCeiling;
  const correctedPutty = Math.ceil(correctedPaintTotal * 0.8);
  const correctedPrimer = Math.ceil(correctedPaintTotal / 8);
  const correctedPaint = Math.ceil(correctedPaintTotal / 8);

  return (
    <>
      {/* جدول التلييس */}
      <div style={cardStyle}>
        <div className="qty-main-heading">🏗️ بند التلييس</div>
        {roomRows && onRoomRowsChange && <RoomFinishBreakdown resetRevision={resetRevision} kind="plaster" plasterOpenings={plasterOpenings} rows={roomRows} onChange={onRoomRowsChange} editedRows={plasterRows} onEditedRowsChange={onPlasterRowsChange} />}
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>البند</th>
                <th style={thStyle}>الكمية</th>
                <th style={thStyle}>الوحدة</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>تلييس الجدران الداخلية</td><td style={tdStyle}>{Math.ceil(correctedPlasterWalls)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>تلييس الأسقف</td><td style={tdStyle}>{Math.ceil(correctedPlasterCeiling)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>أكياس الأسمنت</td><td style={tdStyle}>{correctedPlasterCement}</td><td style={tdStyle}>كيس</td></tr>
              <tr><td style={tdStyle}>الرمل</td><td style={tdStyle}>{correctedPlasterSand}</td><td style={tdStyle}>م³</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول التلييس الخارجي: نفس تصميم وبنية جدول التلييس الداخلي */}
      {hasExteriorPlaster && (
        <div style={cardStyle} dir="rtl">
          <div className="qty-main-heading">🏗️ بند التلييس الخارجي</div>
          <div style={{ padding: '8px 10px' }}>
            <button type="button" aria-expanded={exteriorDetailsOpen}
              onClick={() => setExteriorDetailsOpen(v => !v)}
              style={{ padding: '10px 12px', border: '1px solid #b9d6df', borderRadius: 8,
                background: '#ecf8fa', cursor: 'pointer', width: '100%', textAlign: 'right' }}>
              {exteriorDetailsOpen ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية للتلييس الخارجي
            </button>
            {exteriorDetailsOpen && (
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table style={{ ...tableStyle, minWidth: 520 }}>
                  <thead><tr>
                    <th style={thStyle}>البيان</th><th style={thStyle}>الكمية</th>
                    <th style={thStyle}>الوحدة</th><th style={thStyle}>معادلة الحساب</th>
                  </tr></thead>
                  <tbody>
                    {([
                      ['مساحة الواجهات الخارجية قبل الخصم', exteriorPlasterGross, 'م²', 'مجموع أطوال الجدران الخارجية × ارتفاع الدور مع نهايات الجدران'],
                      ['خصم فتحات الواجهات الخارجية', exteriorPlasterOpenings, 'م²', 'مجموع مساحات الأبواب والنوافذ الخارجية'],
                      ['صافي مساحة التلييس الخارجي', exteriorPlasterArea, 'م²', 'مساحة الواجهات − خصم الفتحات'],
                      ['أسمنت التلييس الخارجي', exteriorPlasterCement, 'كيس', 'تقريب لأعلى (صافي المساحة × 0.15)'],
                      ['رمل التلييس الخارجي', exteriorPlasterSand, 'م³', 'تقريب لأعلى (أكياس الأسمنت × 0.15)'],
                      ['عمالة التلييس الخارجي', exteriorPlasterLabor, 'م²', 'صافي مساحة التلييس الخارجي'],
                    ] as Array<[string, number, string, string]>).map(([rowId, qty, unit, formula]) => {
                      const displayed = exteriorDetail(rowId, qty);
                      return <tr key={rowId}>
                        <td style={tdStyle}>{onDetailCellEdit ? <input type="text"
                          aria-label={`اسم ${rowId}`} defaultValue={displayed.label}
                          key={`${resetRevision}-${rowId}-label-${displayed.label}`}
                          onBlur={e => { const label = e.currentTarget.value.trim(); if (label && label !== displayed.label) onDetailCellEdit('exteriorPlaster', rowId, { label }); }}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          style={{ width: '100%', minWidth: 120, boxSizing: 'border-box' }} /> : displayed.label}</td>
                        <td style={tdStyle}>{onDetailCellEdit ? <input type="number" min="0" step="any"
                          aria-label={`كمية ${rowId}`} defaultValue={fmt(displayed.value)}
                          key={`${resetRevision}-${rowId}-value-${displayed.value}`}
                          onBlur={e => commitExteriorValue(rowId, e.currentTarget.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          style={{ width: 90, maxWidth: '100%' }} /> : fmt(displayed.value)}</td>
                        <td style={tdStyle}>{unit}</td><td style={tdStyle}>{formula}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={bodyStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>البند</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th></tr></thead>
              <tbody>
                
<tr><td style={tdStyle}>صافي تلييس الجدران الخارجية</td><td style={tdStyle}>{fmt(exteriorDetail('صافي مساحة التلييس الخارجي', exteriorPlasterArea).value)}</td><td style={tdStyle}>م²</td></tr>
<tr><td style={tdStyle}>أكياس الأسمنت</td><td style={tdStyle}>{fmt(exteriorDetail('أسمنت التلييس الخارجي', exteriorPlasterCement).value)}</td><td style={tdStyle}>كيس</td></tr>
<tr><td style={tdStyle}>الرمل</td><td style={tdStyle}>{fmt(exteriorDetail('رمل التلييس الخارجي', exteriorPlasterSand).value)}</td><td style={tdStyle}>م³</td></tr>
<tr><td style={tdStyle}>عمالة التلييس الخارجي</td><td style={tdStyle}>{fmt(exteriorDetail('عمالة التلييس الخارجي', exteriorPlasterLabor).value)}</td><td style={tdStyle}>م²</td></tr>

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* جدول الطلاء */}
      <div style={cardStyle}>
        <div className="qty-main-heading">🎨 بند الطلاء</div>
        {roomRows && onRoomRowsChange && <RoomFinishBreakdown resetRevision={resetRevision} kind="paint" plasterOpenings={plasterOpenings} rows={roomRows} onChange={onRoomRowsChange} editedRows={paintRows} onEditedRowsChange={onPaintRowsChange} />}
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>البند</th>
                <th style={thStyle}>الكمية</th>
                <th style={thStyle}>الوحدة</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>طلاء الجدران</td><td style={tdStyle}>{Math.ceil(correctedPaintWalls)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>طلاء الأسقف</td><td style={tdStyle}>{Math.ceil(correctedPaintCeiling)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>المعجون</td><td style={tdStyle}>{correctedPutty}</td><td style={tdStyle}>كجم</td></tr>
              <tr><td style={tdStyle}>البرايمر</td><td style={tdStyle}>{correctedPrimer}</td><td style={tdStyle}>كجم</td></tr>
              <tr><td style={tdStyle}>الطلاء</td><td style={tdStyle}>{correctedPaint}</td><td style={tdStyle}>كجم</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
