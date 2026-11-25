import type { RoomQuantityRow } from './RoomQuantityDetails';
import type { PlasterOpeningsByRoom } from './plasterDetailCalculations';
import React from 'react';
import type { FinishResults } from '../../core/finishCalculations';
import type { StairFlightQuantity, StairLandingQuantity } from '../../core/stairTileSkirting';
import { LaborTable, buildLaborRows } from './tables/LaborTable';
import { WallConstructionTables } from './tables/WallConstructionTables';
import { PlasterPaintTables } from './tables/PlasterPaintTables';
import { TileMarbleTables } from './tables/TileMarbleTables';
import { OpeningTables, type WindowDetailRow, type DoorDetailRow } from './tables/OpeningTables';
import { ElectricalTable } from './tables/ElectricalTable';
import type { ElectricalDraft } from '../../core/electricalCalculations';
import { UtilitySummaryTables } from './tables/UtilitySummaryTables';
import { DeductionsTable } from './tables/DeductionsTable';
import { createPdfFromElement } from '../../utils/pdfShare';

interface Props {
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  /** Changes when the selected floor draft is reset. */
  resetRevision?: number;
  roomRows?: RoomQuantityRow[];
  plasterOpenings?: PlasterOpeningsByRoom;
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
marbleGeometry?: {
  gross: number;
  openings: number;
};
electricalPts: number;
  plumbingPts: number;
  onElectricalChange: (value: number) => void;
  electricalDraft?: ElectricalDraft;
  onElectricalDraftChange?: (draft: ElectricalDraft) => void;
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

const TotalLaborSummary: React.FC<{
  results: FinishResults;
  electricalPts: number;
  plumbingPts: number;
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  roomRows?: RoomQuantityRow[];
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>;
  stairSkirtingLength?: number;
  stairStepCount?: number;
  stairLandingTileArea?: number;
  marbleGeometry?: Props['marbleGeometry'];
  hasMarble: boolean;
    hasExteriorPlaster: boolean;
  exteriorPlasterGross: number;
}> = ({
  results,
  electricalPts,
  plumbingPts,
  detailCellEdits,
  roomRows,
  finishItemRows,
  stairSkirtingLength,
  hasMarble,
  marbleGeometry,
  stairStepCount,
  stairLandingTileArea,
  hasExteriorPlaster,
  exteriorPlasterGross,
}) => {
  
  // مصدر موحد للكميات المعروضة في جدول العمالة وإجمالياتها.
  const laborRows = buildLaborRows({
    results, electricalPts, plumbingPts, roomRows, finishItemRows, detailCellEdits,
    hasMarble, hasExteriorPlaster, exteriorPlasterGross, stairSkirtingLength,
    marbleGeometry, stairStepCount, stairLandingTileArea,
  });
  const sumLabor = (labels: string[]) => laborRows
    .filter(row => labels.includes(row.originalLabel || row.label))
    .reduce((total, row) => total + row.quantity, 0);
  const wallRows = laborRows.filter(row => row.wall);
  const totalWallLabor = wallRows.filter(row => row.unit === 'م²').reduce((sum, row) => sum + row.quantity, 0);
  const totalBlockLabor = wallRows.filter(row => row.unit === 'بلوكة').reduce((sum, row) => sum + row.quantity, 0);
  const totalPlasterLabor = sumLabor(['تلييس الجدران الخارجية', 'تلييس الجدران الداخلية', 'تلييس الأسقف']);
  const totalPaintLabor = sumLabor(['طلاء الجدران', 'طلاء الأسقف']);
  const totalTileLabor = sumLabor([
    'بلاط الأرضيات', 'بلاط أرضيات المطابخ', 'بلاط جدران المطابخ',
    'بلاط أرضيات الحمامات', 'بلاط جدران الحمامات', 'بلاط بسطات السلالم',
  ]);

  const totalStepLabor = sumLabor(['بلاط درجات السلالم (النوائم)']);
  const totalElectricalLabor = sumLabor(['نقاط الكهرباء']);
  const totalPlumbingLabor = sumLabor(['نقاط السباكة']);
  const totalMarbleLabor = sumLabor(['بناء الرخام']);

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
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
            {wallRows.some(row => row.unit === 'بلوكة') && (
              <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة الجدران</td><td style={tdStyle}>{totalBlockLabor}</td><td style={tdStyle}>بلوكة</td></tr>
            )}
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة التلييس</td><td style={tdStyle}>{totalPlasterLabor}</td><td style={tdStyle}>م²</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة الطلاء</td><td style={tdStyle}>{totalPaintLabor}</td><td style={tdStyle}>م²</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة البلاط</td><td style={tdStyle}>{totalTileLabor}</td><td style={tdStyle}>م²</td></tr>

            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>بلاط النوائم</td><td style={tdStyle}>{totalStepLabor}</td><td style={tdStyle}>درجة</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>نقاط الكهرباء</td><td style={tdStyle}>{totalElectricalLabor}</td><td style={tdStyle}>نقطة</td></tr>
            <tr><td style={{ ...tdStyle, fontWeight: 600 }}>نقاط السباكة</td><td style={tdStyle}>{totalPlumbingLabor}</td><td style={tdStyle}>نقطة</td></tr>

            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>عمالة نعلة السلم</td>
              <td style={tdStyle}>{stairSkirtingLength === undefined ? 'لم تُحسب بعد' : sumLabor(['نعلة السلم'])}</td>
              <td style={tdStyle}>م طولي</td>
            </tr>

            {hasMarble && (
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>إجمالي عمالة الرخام</td>
                <td style={tdStyle}>{totalMarbleLabor}</td>
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
  plasterOpenings,
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
  marbleGeometry,
  electricalPts,
  plumbingPts,
  onElectricalChange,
  electricalDraft,
  onElectricalDraftChange,
  onPlumbingChange,
  onMarbleAreaChange,
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
        electricalPts={electricalPts}
        onElectricalPointsChange={onElectricalChange}
        plumbingPts={plumbingPts}
  roomRows={roomRows}
  finishItemRows={finishItemRows}
  detailCellEdits={detailCellEdits}
  onDetailCellEdit={onDetailCellEdit}
  results={results}
  hasMarble={hasMarble}
  marbleGeometry={marbleGeometry}
  hasExteriorPlaster={hasExteriorPlaster}
  exteriorPlasterGross={exteriorPlasterGross}
  stairStepCount={stairStepCount}
  stairLandingTileArea={stairLandingTileArea}
  stairSkirtingLength={stairSkirtingLength}
/>
      <DeductionsTable results={results} detailCellEdits={detailCellEdits} onDetailCellEdit={onDetailCellEdit} />

      <TotalLaborSummary
        electricalPts={electricalPts}
        plumbingPts={plumbingPts}
  results={results}
        detailCellEdits={detailCellEdits}
  roomRows={roomRows}
  finishItemRows={finishItemRows}
  stairSkirtingLength={stairSkirtingLength}
        hasMarble={hasMarble}
        marbleGeometry={marbleGeometry}
        stairStepCount={stairStepCount}
        stairLandingTileArea={stairLandingTileArea}
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
  plasterOpenings={plasterOpenings}
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
        plasterOpenings={plasterOpenings}
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
marbleGeometry={marbleGeometry}
onMarbleAreaChange={onMarbleAreaChange}
      />
      <OpeningTables results={results} isGroundFloor={isGroundFloor} windowRows={windowRows} onWindowRowsChange={onWindowRowsChange} doorRows={doorRows} onDoorRowsChange={onDoorRowsChange} />
      {electricalDraft && onElectricalDraftChange && (
        <ElectricalTable key={resetRevision} draft={electricalDraft} onChange={onElectricalDraftChange} />
      )}
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
