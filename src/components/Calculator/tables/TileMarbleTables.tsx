import { plasterRoomQuantity, type PlasterOpeningsByRoom } from '../plasterDetailCalculations';
import type { RoomQuantityRow } from '../RoomQuantityDetails';
import { RoomFinishBreakdown } from '../RoomFinishBreakdown';
import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';
import type { StairFlightQuantity, StairLandingQuantity } from '../../../core/stairTileSkirting';

interface Props {
  plasterOpenings?: PlasterOpeningsByRoom;
  /** Incremented when the selected floor draft is reset. */
  resetRevision?: number;
  /** Saved manual edits for detail rows; does not alter drawing geometry. */
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  roomRows?: RoomQuantityRow[];
  onRoomRowsChange?: (rows: RoomQuantityRow[]) => void;
  tileRows?: RoomQuantityRow[];
  onTileRowsChange?: (rows: RoomQuantityRow[]) => void;
  results: FinishResults;
  hasMarble: boolean;
marbleGeometry?: {
  gross: number;
  openings: number;
};
onMarbleAreaChange?: (value: number) => void;
  skirtingDeductions?: Record<string, number>;
  stairStepCount?: number;
  stairLandingTileArea?: number;
  stairFlightSkirtingLength?: number;
  roomSkirtingLength?: number;
  stairSkirtingLength?: number;
  stairFlights?: readonly StairFlightQuantity[];
  stairLandings?: readonly StairLandingQuantity[];
  onStairQuantitiesChange?: (
    flights: StairFlightQuantity[],
    landings: StairLandingQuantity[]
  ) => void;
  
}

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', marginBottom: 12 };
const headStyle: React.CSSProperties = { background: '#f8fafc', padding: '10px 12px', fontWeight: 700, color: '#003366', fontSize: 14, borderBottom: '1px solid #ddd' };
const bodyStyle: React.CSSProperties = { padding: 10 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { background: '#003366', color: 'white', padding: '8px 6px', border: '1px solid #003366', textAlign: 'center' };
const tdStyle: React.CSSProperties = { padding: '7px 6px', border: '1px solid #ccc', textAlign: 'center' };
const inputStyle: React.CSSProperties = { width: 70, textAlign: 'center', padding: 4, border: '1px solid #ccc', borderRadius: 4, direction: 'ltr' };

const safeParse = (val: string, fallback: number) => {
  if (val === '' || val === '.' || val === ',') return fallback;
  const num = parseFloat(val.replace(',', '.'));
  return isNaN(num) ? fallback : num;
};


const nonNegative = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const roundUp = (value: number): number =>
  Math.ceil(nonNegative(value));

export const TileMarbleTables: React.FC<Props> = ({
  plasterOpenings = {},
  resetRevision = 0,
  detailCellEdits,
  onDetailCellEdit,
  results,
  hasMarble,
  marbleGeometry,
  onMarbleAreaChange,
  roomRows,
  onRoomRowsChange,
  tileRows,
  onTileRowsChange,
  skirtingDeductions = {},
  roomSkirtingLength = 0,
  stairSkirtingLength,
  stairStepCount,
  stairLandingTileArea,
  stairFlightSkirtingLength,
  stairFlights = [],
  stairLandings = [],
  onStairQuantitiesChange,
}) => {
  
  // Keep stable original row IDs so renaming a detail does not lose its saved edit.
  const marbleGross = nonNegative(
  marbleGeometry?.gross ?? 0
);

const marbleOpenings = nonNegative(
  marbleGeometry?.openings ?? 0
);

const marbleNet = Math.max(
  0,
  marbleGross - marbleOpenings
);

const marbleConcrete = marbleNet * 0.04;
const marbleCement = marbleNet * 0.30;
const marbleSand = marbleCement * 0.07;
const marbleAggregate = marbleCement * 0.075;
const marbleDetails = [
  {
    label: 'مساحة الواجهات قبل الخصم',
    value: marbleGross,
    key: 'marbleGross',
    unit: 'م²',
    editable: true,
  },
  {
    label: 'خصم فتحات الواجهات',
    value: marbleOpenings,
    key: 'marbleOpenings',
    unit: 'م²',
    editable: true,
  },
  {
    label: 'صافي مساحة الرخام',
    value: marbleNet,
    key: 'marbleArea',
    unit: 'م²',
    editable: false,
  },
  {
    label: 'خرسانة الرخام',
    value: marbleConcrete,
    key: 'marbleConcrete',
    unit: 'م³',
    editable: false,
  },
  {
    label: 'أسمنت الرخام',
    value: marbleCement,
    key: 'marbleCement',
    unit: 'كيس',
    editable: false,
  },
  {
    label: 'رمل الرخام',
    value: marbleSand,
    key: 'marbleSand',
    unit: 'م³',
    editable: false,
  },
  {
    label: 'ركام الرخام',
    value: marbleAggregate,
    key: 'marbleAggregate',
    unit: 'م³',
    editable: false,
  },
  {
    label: 'عمالة الرخام',
    value: marbleGross,
    key: 'marbleLabor',
    unit: 'م²',
    editable: false,
  },
];

const visibleMarbleDetails = marbleDetails.map(row => {
  const edit = detailCellEdits?.[
    JSON.stringify(['marble', row.key])
  ];

  return {
    ...row,
    label: edit?.label?.trim() || row.label,
  };
});

  // فروق تعديلات الغرف الخاصة ببند البلاط فقط
  const detailed = (tileRows ?? roomRows)?.reduce((s, row) => {
    const q = plasterRoomQuantity(row, plasterOpenings[row.id], true);
    if (row.type === 'kitchen') { s.kitchenFloor += q.ceiling; s.kitchenWalls += q.net; }
    else if (row.type === 'bathroom') { s.bathroomFloor += q.ceiling; s.bathroomWalls += q.net; }
    else s.floor += q.ceiling;
    return s;
  }, {floor:0,kitchenFloor:0,bathroomFloor:0,kitchenWalls:0,bathroomWalls:0});
  const correctedTileFloor = detailed?.floor ?? results.correctedTileFloor;
  const correctedTileKitchenFloor = detailed?.kitchenFloor ?? results.tileKitchenFloor;
  const correctedTileBathroomFloor = detailed?.bathroomFloor ?? results.tileBathroomFloor;
  const correctedTileKitchenWalls = detailed?.kitchenWalls ?? results.correctedTileKitchenWalls;
  const correctedTileBathroomWalls = detailed?.bathroomWalls ?? results.correctedTileBathroomWalls;
  const correctedTileCement = Math.ceil((correctedTileFloor + correctedTileKitchenFloor + correctedTileBathroomFloor + correctedTileKitchenWalls + correctedTileBathroomWalls) * 0.3);
  const correctedTileSand = Math.ceil(correctedTileCement * 0.15);


  const landingTileArea = stairLandingTileArea ?? results.landingTileArea ?? 0;
  const stepTileCount = stairStepCount ?? results.stepTileCount ?? 0;
  // Detail rows and summary rows receive the same stair quantities from the parent.
  // Do not recompute a second set of totals here, which could diverge from the floor summary.

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  

  return (
    <>
      <div style={cardStyle}>
        <div className="qty-main-heading">🟫 بند البلاط</div>
        
{roomRows && onRoomRowsChange && (
  <RoomFinishBreakdown
    resetRevision={resetRevision}
    detailCellEdits={detailCellEdits}
    onDetailCellEdit={onDetailCellEdit}
    kind="tile"
    plasterOpenings={plasterOpenings}
    rows={roomRows}
    onChange={onRoomRowsChange}
    editedRows={tileRows}
    onEditedRowsChange={onTileRowsChange}
    skirtingDeductions={skirtingDeductions}
    stairFlights={stairFlights}
    stairLandings={stairLandings}
    onStairQuantitiesChange={onStairQuantitiesChange}
  />
)}
        
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr><th style={thStyle}>البند</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th></tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>بلاط الأرضيات</td><td style={tdStyle}>{roundUp(correctedTileFloor)}</td><td style={tdStyle}>م²</td></tr>
              
<tr><td style={tdStyle}>بلاط أرضيات المطابخ</td><td style={tdStyle}>{roundUp(correctedTileKitchenFloor)}</td><td style={tdStyle}>م²</td></tr>
<tr><td style={tdStyle}>بلاط أرضيات الحمامات</td><td style={tdStyle}>{roundUp(correctedTileBathroomFloor)}</td><td style={tdStyle}>م²</td></tr>

              <tr><td style={tdStyle}>بلاط جدران المطابخ</td><td style={tdStyle}>{roundUp(correctedTileKitchenWalls)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>بلاط جدران الحمامات</td><td style={tdStyle}>{roundUp(correctedTileBathroomWalls)}</td><td style={tdStyle}>م²</td></tr>
              {landingTileArea > 0 && (
                <tr><td style={tdStyle}>بلاط البسطة</td><td style={tdStyle}>{roundUp(landingTileArea)}</td><td style={tdStyle}>م²</td></tr>
              )}
              {stepTileCount > 0 && (
                <tr><td style={tdStyle}>بلاط الدرج (النوائم)</td><td style={tdStyle}>{roundUp(stepTileCount)}</td><td style={tdStyle}>عدد</td></tr>
              )}
                            <tr>
                <td style={tdStyle}>نعلة الغرف والصالات</td>
                <td style={tdStyle}>
                  {Math.round(Math.max(0, roomSkirtingLength) * 100) / 100}
                </td>
                <td style={tdStyle}>م طولي</td>
              </tr>

              <tr>
                <td style={tdStyle}>نعلة السلم</td>
                <td style={tdStyle}>
                  {stairSkirtingLength === undefined
                    ? 'لم تُحسب بعد'
                    : Math.round(Math.max(0, stairSkirtingLength) * 100) / 100}
                </td>
                <td style={tdStyle}>م طولي</td>
              </tr>
              <tr><td style={tdStyle}>أسمنت المونة</td><td style={tdStyle}>{roundUp(correctedTileCement)}</td><td style={tdStyle}>كيس</td></tr>
              <tr><td style={tdStyle}>رمل المونة</td><td style={tdStyle}>{roundUp(correctedTileSand)}</td><td style={tdStyle}>م³</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {hasMarble && (
        <div style={cardStyle}>
          <div className="qty-main-heading">🏛️ بند الرخام</div>
          <TableDetailsToggle
            title="🏛️ بند الرخام"
            rows={visibleMarbleDetails}
            onLabelEdit={onDetailCellEdit ? (_row, index, label) => {
              onDetailCellEdit('marble', marbleDetails[index].key, { label });
            } : undefined}
            onValueEdit={onDetailCellEdit ? (_row, index, value) => {
  const key = marbleDetails[index].key;

  if (
    key !== 'marbleGross' &&
    key !== 'marbleOpenings'
  ) return;

  if (!Number.isFinite(value) || value < 0) return;

  onDetailCellEdit('marble', key, { value });
} : undefined}
          >{null}</TableDetailsToggle>
          <div style={bodyStyle}>
            <table style={tableStyle}>
              <thead>
                <tr><th style={thStyle}>البند</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th></tr>
              </thead>
          <tbody>
  <tr>
    <td style={tdStyle}>مساحة الرخام</td>
    <td style={tdStyle}>{roundUp(marbleNet)}</td>
    <td style={tdStyle}>م²</td>
  </tr>
  <tr>
    <td style={tdStyle}>خرسانة الرخام (4 سم)</td>
    <td style={tdStyle}>{roundUp(marbleConcrete)}</td>
    <td style={tdStyle}>م³</td>
  </tr>
  <tr>
    <td style={tdStyle}>أسمنت</td>
    <td style={tdStyle}>{roundUp(marbleCement)}</td>
    <td style={tdStyle}>كيس</td>
  </tr>
  <tr>
    <td style={tdStyle}>الرمل</td>
    <td style={tdStyle}>{roundUp(marbleSand)}</td>
    <td style={tdStyle}>م³</td>
  </tr>
  <tr>
    <td style={tdStyle}>الركام</td>
    <td style={tdStyle}>{roundUp(marbleAggregate)}</td>
    <td style={tdStyle}>م³</td>
  </tr>
</tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
