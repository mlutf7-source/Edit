import type { RoomQuantityRow } from './RoomQuantityDetails';
import React from 'react';
import type { FinishResults } from '../../core/finishCalculations';
import type { StairFlightQuantity, StairLandingQuantity } from '../../core/stairTileSkirting';
import { LaborTable } from './tables/LaborTable';
import { WallConstructionTables } from './tables/WallConstructionTables';
import { PlasterPaintTables } from './tables/PlasterPaintTables';
import { TileMarbleTables } from './tables/TileMarbleTables';
import { OpeningTables, type WindowDetailRow, type DoorDetailRow } from './tables/OpeningTables';
import { UtilitySummaryTables } from './tables/UtilitySummaryTables';
import { DeductionsTable } from './tables/DeductionsTable';
import { createPdfFromElement } from '../../utils/pdfShare';

interface Props {
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  /** Changes when the selected floor draft is reset. */
  resetRevision?: number;
  roomRows?: RoomQuantityRow[];
  onRoomRowsChange?: (rows: RoomQuantityRow[]) => void;
  stairStepCount?: number;
stairLandingTileArea?: number;
stairFlightSkirtingLength?: number;
  skirtingDeductions?: Record<string, number>;
    roomSkirtingLength?: number;
  stairSkirtingLength?: number;
  stairFlights?: readonly StairFlightQuantity[];
  stairLandings?: readonly StairLandingQuantity[];
  onStairQuantitiesChange?: (flights: StairFlightQuantity[], landings: StairLandingQuantity[]) => void;
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>;
  onFinishItemRowsChange?: (kind: 'plaster' | 'paint' | 'tile', rows: RoomQuantityRow[]) => void;
  results: FinishResults;
  isGroundFloor?: boolean;
  windowRows?: WindowDetailRow[];
  onWindowRowsChange?: (rows: WindowDetailRow[]) => void;
  doorRows?: DoorDetailRow[];
  onDoorRowsChange?: (rows: DoorDetailRow[]) => void;
  hasMarble: boolean;
  electricalPts: number;
  plumbingPts: number;
  onElectricalChange: (value: number) => void;
  onPlumbingChange: (value: number) => void;
  onMarbleAreaChange?: (value: number) => void;
  marbleLaborOverride?: number | null;
  onMarbleLaborChange?: (value: number) => void;
  hasExteriorPlaster?: boolean;
exteriorPlasterArea?: number;
  exteriorPlasterGross?: number;
  exteriorPlasterOpenings?: number;
  exteriorPlasterCement?: number;
  exteriorPlasterSand?: number;
  exteriorPlasterLabor?: number;
  onExteriorPlasterChange?: (field: 'gross' | 'openings' | 'cement' | 'sand', value: number) => void;
}

const inputStyle: React.CSSProperties = {
  width: 70,
  textAlign: 'center',
  padding: 4,
  border: '1px solid #ccc',
  borderRadius: 4,
  direction: 'ltr',
  fontFamily: 'Cairo, sans-serif',
  fontWeight: 700,
  fontSize: '0.8rem',
};

const laborQuantity = (value: number): number =>
  Number.isFinite(value) ? Math.ceil(Math.max(0, value)) : 0;

const TotalLaborSummary: React.FC<{
  results: FinishResults;
  roomRows?: RoomQuantityRow[];
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>;
  stairSkirtingLength?: number;
  hasMarble: boolean;
  marbleLaborOverride?: number | null;
  onMarbleLaborChange?: (value: number) => void;
    hasExteriorPlaster: boolean;
  exteriorPlasterGross: number;
}> = ({
  results,
  roomRows,
  finishItemRows,
  stairSkirtingLength,
  hasMarble,
  marbleLaborOverride,
  onMarbleLaborChange,
  hasExteriorPlaster,
  exteriorPlasterGross,
}) => {
  // Match the individual labor rows in LaborTable.tsx.
  const totalWallLabor =
    laborQuantity(results.exteriorWallGross) +
    laborQuantity(results.interiorWallGross);

  // حساب فروق تعديلات الغرف لكل بند بصورة مستقلة
  const finishLaborDifferences = (
    kind: 'plaster' | 'paint' | 'tile'
  ) => {
    const editedRows = finishItemRows?.[kind];

    if (!roomRows || !editedRows?.length) {
      return 0;
    }

    const calculateAreas = (rows: RoomQuantityRow[]) =>
      rows.reduce(
        (totals, row) => {
          const area = Number.isFinite(row.area)
            ? Math.max(0, row.area)
            : 0;

          const perimeter = Number.isFinite(row.perimeter)
            ? Math.max(0, row.perimeter)
            : 0;

          const height = Number.isFinite(row.height)
            ? Math.max(0, row.height)
            : 0;

          const walls = perimeter * height;

          if (kind === 'tile') {
            totals.quantity +=
              row.type === 'kitchen' || row.type === 'bathroom'
                ? area + walls
                : area;
          } else {
            totals.quantity +=
              row.type === 'kitchen' || row.type === 'bathroom'
                ? area
                : area + walls;
          }

          return totals;
        },
        { quantity: 0 }
      );

    return (
      calculateAreas(editedRows).quantity -
      calculateAreas(roomRows).quantity
    );
  };

  const plasterLaborDifference = finishLaborDifferences('plaster');
  const paintLaborDifference = finishLaborDifferences('paint');
  const tileLaborDifference = finishLaborDifferences('tile');
  
  
  const totalPlasterLabor = Math.max(
    0,
    (hasExteriorPlaster ? laborQuantity(exteriorPlasterGross) : 0) +
    laborQuantity(results.plasterWallsLabor) +
    laborQuantity(results.plasterCeilingLabor) +
    plasterLaborDifference
  );

  const totalPaintLabor = Math.max(
    0,
    laborQuantity(results.paintWalls) +
    laborQuantity(results.paintCeiling) +
    paintLaborDifference
  );

  // بلاط الدرج يُحسب بالعدد وليس بالمتر المربع
  const totalTileLabor = Math.max(
    0,
    laborQuantity(results.correctedTileFloor) +
    laborQuantity(results.tileKitchenFloor) +
    laborQuantity(results.correctedTileKitchenWalls) +
    laborQuantity(results.tileBathroomFloor) +
    laborQuantity(results.correctedTileBathroomWalls) +
    laborQuantity(results.landingTileArea) +
    tileLaborDifference
  );

  const defaultMarbleLabor = laborQuantity(results.marbleArea);
  const totalMarbleLabor = hasMarble
    ? (marbleLaborOverride !== null && marbleLaborOverride !== undefined
        ? marbleLaborOverride
        : defaultMarbleLabor)
    : 0;

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

  const thStyle: React.CSSProperties = {
    padding: '8px 5px',
    border: '1px solid #ddd',
    background: '#0f4c81',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 700,
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px',
    border: '1px solid #ddd',
    textAlign: 'center',
    fontSize: '0.8rem',
  };

  return (
    <div style={cardStyle}>
      <div className="qty-main-heading">📊 إجمالي كميات العمالة</div>
      <div style={{ padding: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>البند</th>
              <th style={thStyle}>الكمية</th>
              <th style={thStyle}>الوحدة</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة الجدران</td><td style={tdStyle}>{totalWallLabor}</td><td style={tdStyle}>م²</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة التلييس</td><td style={tdStyle}>{totalPlasterLabor}</td><td style={tdStyle}>م²</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة الطلاء</td><td style={tdStyle}>{totalPaintLabor}</td><td style={tdStyle}>م²</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة البلاط</td><td style={tdStyle}>{totalTileLabor}</td><td style={tdStyle}>م²</td></tr>

            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>عمالة نعلة السلم</td>
              <td style={tdStyle}>{stairSkirtingLength === undefined ? 'لم تُحسب بعد' : Math.max(0, stairSkirtingLength).toFixed(2)}</td>
              <td style={tdStyle}>م طولي</td>
            </tr>

            {/* ✅ عمالة الرخام - قابلة للتعديل */}
            {hasMarble && (
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة الرخام</td>
                <td style={tdStyle}>
                  {onMarbleLaborChange ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      key={`marble-labor-${totalMarbleLabor}`}
                      defaultValue={String(totalMarbleLabor)}
                      style={inputStyle}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(v) && v >= 0) {
                          onMarbleLaborChange(v);
                        } else {
                          e.target.value = String(totalMarbleLabor);
                        }
                      }}
                    />
                  ) : (
                    totalMarbleLabor
                  )}
                </td>
                <td style={tdStyle}>م²</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const FinishTables: React.FC<Props> = ({
  detailCellEdits,
  onDetailCellEdit,
  resetRevision = 0,
  roomRows,
  onRoomRowsChange,
  stairStepCount,
  stairLandingTileArea,
  stairFlightSkirtingLength,
  skirtingDeductions = {},
    roomSkirtingLength = 0,
  stairSkirtingLength,
  stairFlights = [],
  stairLandings = [],
  onStairQuantitiesChange,
  finishItemRows,
  onFinishItemRowsChange,
  results,
  isGroundFloor = false,
  windowRows,
  onWindowRowsChange,
  doorRows,
  onDoorRowsChange,
  hasMarble,
  electricalPts,
  plumbingPts,
  onElectricalChange,
  onPlumbingChange,
  onMarbleAreaChange,
  marbleLaborOverride,
  onMarbleLaborChange,
  hasExteriorPlaster = false,
exteriorPlasterArea = 0,
  exteriorPlasterGross = 0,
  exteriorPlasterOpenings = 0,
  exteriorPlasterCement = 0,
  exteriorPlasterSand = 0,
  exteriorPlasterLabor = 0,
  onExteriorPlasterChange,
}) => {
  const handlePdfShare = async () => {
    await createPdfFromElement('finishes-pdf', 'تقرير_التشطيبات');
  };

  return (
    <>
      <LaborTable
        detailCellEdits={detailCellEdits}
        onDetailCellEdit={onDetailCellEdit}
  results={results}
  hasMarble={hasMarble}
  hasExteriorPlaster={hasExteriorPlaster}
  exteriorPlasterGross={exteriorPlasterGross}
  stairSkirtingLength={stairSkirtingLength}
/>
      <DeductionsTable results={results} detailCellEdits={detailCellEdits} onDetailCellEdit={onDetailCellEdit} />

      <TotalLaborSummary
  results={results}
  roomRows={roomRows}
  finishItemRows={finishItemRows}
  stairSkirtingLength={stairSkirtingLength}
        hasMarble={hasMarble}
        marbleLaborOverride={marbleLaborOverride}
        onMarbleLaborChange={onMarbleLaborChange}
        hasExteriorPlaster={hasExteriorPlaster}
exteriorPlasterGross={exteriorPlasterGross}
      />

      <WallConstructionTables results={results} detailCellEdits={detailCellEdits} onDetailCellEdit={onDetailCellEdit} />
      <PlasterPaintTables
        detailCellEdits={detailCellEdits}
        onDetailCellEdit={onDetailCellEdit}
  resetRevision={resetRevision}
  results={results}
  roomRows={roomRows}
  onRoomRowsChange={onRoomRowsChange}
  plasterRows={finishItemRows?.plaster}
  paintRows={finishItemRows?.paint}
  onPlasterRowsChange={next => onFinishItemRowsChange?.('plaster', next)}
  onPaintRowsChange={next => onFinishItemRowsChange?.('paint', next)}
  hasExteriorPlaster={hasExteriorPlaster}
  exteriorPlasterArea={exteriorPlasterArea}
  exteriorPlasterGross={exteriorPlasterGross}
  exteriorPlasterOpenings={exteriorPlasterOpenings}
  exteriorPlasterCement={exteriorPlasterCement}
  exteriorPlasterSand={exteriorPlasterSand}
  exteriorPlasterLabor={exteriorPlasterLabor}
        onExteriorPlasterChange={onExteriorPlasterChange}
/>

      <TileMarbleTables
        detailCellEdits={detailCellEdits}
        onDetailCellEdit={onDetailCellEdit}
        resetRevision={resetRevision}
        results={results}
        roomRows={roomRows}
        onRoomRowsChange={onRoomRowsChange}
        stairStepCount={stairStepCount}
stairLandingTileArea={stairLandingTileArea}
stairFlightSkirtingLength={stairFlightSkirtingLength}
  skirtingDeductions={skirtingDeductions}
          roomSkirtingLength={roomSkirtingLength}
  stairSkirtingLength={stairSkirtingLength}
        stairFlights={stairFlights}
        stairLandings={stairLandings}
        onStairQuantitiesChange={onStairQuantitiesChange}
        
        tileRows={finishItemRows?.tile}
        onTileRowsChange={next => onFinishItemRowsChange?.('tile', next)}
        hasMarble={hasMarble}
        onMarbleAreaChange={onMarbleAreaChange}
      />
      <OpeningTables results={results} isGroundFloor={isGroundFloor} windowRows={windowRows} onWindowRowsChange={onWindowRowsChange} doorRows={doorRows} onDoorRowsChange={onDoorRowsChange} />
      <UtilitySummaryTables
        detailCellEdits={detailCellEdits}
        onDetailCellEdit={onDetailCellEdit}
        results={results}
        hasMarble={hasMarble}
        electricalPts={electricalPts}
        plumbingPts={plumbingPts}
        onElectricalChange={onElectricalChange}
        onPlumbingChange={onPlumbingChange}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
        <button
          type="button"
          onClick={handlePdfShare}
          style={{
            width: '100%',
            padding: '11px 16px',
            border: 'none',
            borderRadius: 10,
            background: '#0f4c81',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📄 مشاركة تقرير التشطيبات PDF
        </button>
      </div>
    </>
  );
};
