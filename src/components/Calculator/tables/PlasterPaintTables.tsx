import type { RoomQuantityRow } from '../RoomQuantityDetails';
import { RoomFinishBreakdown } from '../RoomFinishBreakdown';
import React, { useState } from 'react';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  roomRows?: RoomQuantityRow[];
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
  
onExteriorPlasterChange?: (
  field: 'gross' | 'openings' | 'cement' | 'sand',
  value: number
) => void;
  
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

export const PlasterPaintTables: React.FC<Props> = ({ results, roomRows, onRoomRowsChange, plasterRows, paintRows, onPlasterRowsChange, onPaintRowsChange,
  hasExteriorPlaster = false, exteriorPlasterArea = 0, exteriorPlasterGross = 0,
  exteriorPlasterOpenings = 0, exteriorPlasterCement = 0,
  
exteriorPlasterSand = 0,
exteriorPlasterLabor = 0,
onExteriorPlasterChange
}) => {
  
  const [exteriorDetailsOpen, setExteriorDetailsOpen] = useState(false);
  const fmt = (n: number) => String(Math.round((n + Number.EPSILON) * 100) / 100);
  // ✅ القيم المصححة مباشرة من النتائج
  const correctedPlasterWalls = results.correctedPlasterWalls;
  const correctedPlasterCeiling = results.correctedPlasterCeiling;
  const correctedPlasterArea = results.correctedPlasterArea;
  const correctedPlasterCement = results.correctedPlasterCement;
  const correctedPlasterSand = results.correctedPlasterSand;

  const correctedPaintWalls = results.correctedPaintWalls;
  const correctedPaintCeiling = results.correctedPaintCeiling;
  const correctedPaintTotal = results.correctedPaintTotal;
  const correctedPutty = Math.ceil(correctedPaintTotal * 0.8);
  const correctedPrimer = Math.ceil(correctedPaintTotal / 8);
  const correctedPaint = Math.ceil(correctedPaintTotal / 8);

  return (
    <>
      {/* جدول التلييس */}
      <div style={cardStyle}>
        <div className="qty-main-heading">🏗️ بند التلييس</div>
        {roomRows && onRoomRowsChange && <RoomFinishBreakdown kind="plaster" rows={roomRows} onChange={onRoomRowsChange} editedRows={plasterRows} onEditedRowsChange={onPlasterRowsChange} />}
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
  ['gross', 'مساحة الواجهات الخارجية قبل الخصم',
    exteriorPlasterGross, 'م²',
    'مجموع أطوال الجدران الخارجية × ارتفاع الدور مع نهايات الجدران'],
  ['openings', 'خصم فتحات الواجهات الخارجية',
    exteriorPlasterOpenings, 'م²',
    'مجموع مساحات الأبواب والنوافذ الخارجية'],
  [null, 'صافي مساحة التلييس الخارجي',
    exteriorPlasterArea, 'م²',
    'مساحة الواجهات − خصم الفتحات'],
  ['cement', 'أسمنت التلييس الخارجي',
    exteriorPlasterCement, 'كيس',
    'تقريب لأعلى (صافي المساحة × 0.15)'],
  ['sand', 'رمل التلييس الخارجي',
    exteriorPlasterSand, 'م³',
    'تقريب لأعلى (أكياس الأسمنت × 0.15)'],
] as Array<[
  'gross' | 'openings' | 'cement' | 'sand' | null,
  string, number, string, string
]>).map(([field, name, qty, unit, formula]) => (
  <tr key={name}>
    <td style={tdStyle}>{name}</td>
    <td style={tdStyle}>
      {field && onExteriorPlasterChange ? (
        <input
          key={`${field}-${fmt(qty)}`}
          type="number"
          min="0"
          step="any"
          defaultValue={fmt(qty)}
          onFocus={e => e.currentTarget.select()}
          onBlur={e => {
            const input = e.currentTarget;
            const value = Number(input.value);

            if (
              input.value.trim() !== '' &&
              Number.isFinite(value) &&
              value >= 0
            ) {
              onExteriorPlasterChange(field, value);
              input.value = fmt(value);
            } else {
              input.value = fmt(qty);
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          aria-label={name}
          style={{
            width: 90,
            maxWidth: '100%',
            padding: 6,
            textAlign: 'center',
            border: '1px solid #b9d6df',
            borderRadius: 6,
            font: 'inherit'
          }}
        />
      ) : (
        fmt(qty)
      )}
    </td>
    <td style={tdStyle}>{unit}</td>
    <td style={tdStyle}>{formula}</td>
  </tr>
))}

                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={bodyStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>البند</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th></tr></thead>
              <tbody>
                <tr><td style={tdStyle}>صافي تلييس الجدران الخارجية</td><td style={tdStyle}>{fmt(exteriorPlasterArea)}</td><td style={tdStyle}>م²</td></tr>
                <tr><td style={tdStyle}>أكياس الأسمنت</td><td style={tdStyle}>{fmt(exteriorPlasterCement)}</td><td style={tdStyle}>كيس</td></tr>
                <tr><td style={tdStyle}>الرمل</td><td style={tdStyle}>{fmt(exteriorPlasterSand)}</td><td style={tdStyle}>م³</td></tr>
                
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* جدول الطلاء */}
      <div style={cardStyle}>
        <div className="qty-main-heading">🎨 بند الطلاء</div>
        {roomRows && onRoomRowsChange && <RoomFinishBreakdown kind="paint" rows={roomRows} onChange={onRoomRowsChange} editedRows={paintRows} onEditedRowsChange={onPaintRowsChange} />}
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
