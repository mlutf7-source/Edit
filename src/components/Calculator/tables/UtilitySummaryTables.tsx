import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  results: FinishResults;
  hasMarble: boolean;
  electricalPts: number;
  plumbingPts: number;
  onElectricalChange: (value: number) => void;
  onPlumbingChange: (value: number) => void;
}

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', marginBottom: 12 };
const headStyle: React.CSSProperties = { background: '#f8fafc', padding: '10px 12px', fontWeight: 700, color: '#003366', fontSize: 14, borderBottom: '1px solid #ddd' };
const bodyStyle: React.CSSProperties = { padding: 10 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { background: '#003366', color: 'white', padding: '8px 6px', border: '1px solid #003366', textAlign: 'center' };
const tdStyle: React.CSSProperties = { padding: '7px 6px', border: '1px solid #ccc', textAlign: 'center', direction: 'ltr' };
const inputStyle: React.CSSProperties = { width: 70, textAlign: 'center', padding: 4, border: '1px solid #ccc', borderRadius: 4, direction: 'ltr' };

const safeParse = (val: string, fallback: number) => {
  if (val === '' || val === '.' || val === ',') return fallback;
  const num = parseFloat(val.replace(',', '.'));
  return isNaN(num) ? fallback : num;
};

export const UtilitySummaryTables: React.FC<Props> = ({ results, hasMarble, electricalPts, plumbingPts, onElectricalChange, onPlumbingChange, detailCellEdits, onDetailCellEdit }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  const commitEdit = (e: React.FocusEvent<HTMLInputElement>, fallback: number, onChange: (n: number) => void) => {
    const num = safeParse(e.target.value, fallback);
    onChange(num);
    e.target.value = String(num);
  };

  const correctedTileTotalArea = results.correctedTileTotalArea;
  const correctedTileCement = results.correctedTileCement;
  const correctedTileSand = results.correctedTileSand;
  const correctedPlasterCement = results.correctedPlasterCement;
  const correctedPlasterSand = results.correctedPlasterSand;
  const marbleArea = hasMarble ? results.marbleArea : 0;
  const marbleCement = hasMarble ? results.marbleCement : 0;
  const marbleSand = hasMarble ? results.marbleSand : 0;
  const marbleAggregate = hasMarble ? results.marbleAggregate : 0;

  const landingTileArea = results.landingTileArea || 0;
  const stepTileCount = results.stepTileCount || 0;

  const totalBlocks = Math.ceil(results.exteriorBlocks + results.interiorBlocks);
  const totalCement = Math.ceil(results.exteriorBlockCement + results.interiorBlockCement + correctedPlasterCement + correctedTileCement + marbleCement);
  const totalSand = Math.ceil(results.exteriorBlockSand + results.interiorBlockSand + correctedPlasterSand + correctedTileSand + marbleSand);
  const totalAggregate = marbleAggregate;

  const totalDoorsArea = results.doorGroups.reduce((s, g) => s + g.totalArea, 0);
  const totalWindowsArea = results.windowGroups.reduce((s, g) => s + g.totalArea, 0);

  // Stable row identifiers keep saved edits independent from displayed names.
  const utilityRows = [
    { id: 'plumbing', label: 'نقاط السباكة', value: plumbingPts, unit: 'نقطة' },
    { id: 'electrical', label: 'نقاط الكهرباء', value: electricalPts, unit: 'نقطة' },
  ];
  const summaryRows = [
    { id: 'exteriorBlocks', label: 'البلوك الخارجي', value: results.exteriorBlocks, key: 'exteriorBlocks', unit: 'بلوكة' },
    { id: 'interiorBlocks', label: 'البلوك الداخلي', value: results.interiorBlocks, key: 'interiorBlocks', unit: 'بلوكة' },
    { id: 'correctedPlasterCement', label: 'أسمنت التلييس', value: results.correctedPlasterCement, key: 'correctedPlasterCement', unit: 'كيس' },
    { id: 'correctedTileCement', label: 'أسمنت البلاط', value: results.correctedTileCement, key: 'correctedTileCement', unit: 'كيس' },
    { id: 'marbleCement', label: 'أسمنت الرخام', value: marbleCement, unit: 'كيس' },
    { id: 'doorsArea', label: 'مساحة الأبواب', value: totalDoorsArea, unit: 'م²' },
    { id: 'windowsArea', label: 'مساحة النوافذ', value: totalWindowsArea, unit: 'م²' },
  ];
  const displayDetail = <T extends { id: string; label: string; value: number }>(tableId: string, rows: T[]) =>
    rows.map(({ id, ...row }) => {
      const edit = detailCellEdits?.[JSON.stringify([tableId, id])];
      return {
        ...row,
        label: edit?.label?.trim() || row.label,
        value: typeof edit?.value === 'number' && Number.isFinite(edit.value) && edit.value >= 0 ? edit.value : row.value,
      };
    });
  const editLabel = (tableId: string, rows: { id: string }[]) =>
    onDetailCellEdit ? (_row: { label: string }, index: number, label: string) =>
      onDetailCellEdit(tableId, rows[index].id, { label }) : undefined;
  const editValue = (tableId: string, rows: { id: string }[]) =>
    onDetailCellEdit ? (_row: { label: string }, index: number, value: number) => {
      onDetailCellEdit(tableId, rows[index].id, { value });
      // Preserve the existing point-count editing behavior for these two source inputs.
      if (tableId === 'utilities' && rows[index].id === 'plumbing') onPlumbingChange(value);
      if (tableId === 'utilities' && rows[index].id === 'electrical') onElectricalChange(value);
    } : undefined;

  return (<>
    <div style={cardStyle}>
      <div className="qty-main-heading">💡🔌 الكهرباء والسباكة</div>
          <TableDetailsToggle title="💡🔌 الكهرباء والسباكة" rows={displayDetail('utilities', utilityRows)} onLabelEdit={editLabel('utilities', utilityRows)} onValueEdit={editValue('utilities', utilityRows)}>{null}</TableDetailsToggle>
      <div style={bodyStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>البند</th><th style={thStyle}>عدد النقاط</th></tr></thead>
          <tbody>
            <tr><td style={tdStyle}>السباكة</td><td style={tdStyle}><input type="text" inputMode="decimal" dir="ltr" key="plumbing-pts" defaultValue={String(plumbingPts)} style={inputStyle} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} onBlur={(e) => commitEdit(e, plumbingPts, onPlumbingChange)} /></td></tr>
            <tr><td style={tdStyle}>الكهرباء</td><td style={tdStyle}><input type="text" inputMode="decimal" dir="ltr" key="electrical-pts" defaultValue={String(electricalPts)} style={inputStyle} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} onBlur={(e) => commitEdit(e, electricalPts, onElectricalChange)} /></td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div style={cardStyle}>
      <div className="qty-main-heading">📦 إجمالي الكميات النهائي</div>
          <TableDetailsToggle title="📦 إجمالي الكميات النهائي" rows={displayDetail('finalSummary', summaryRows)} onLabelEdit={editLabel('finalSummary', summaryRows)} onValueEdit={editValue('finalSummary', summaryRows)}>{null}</TableDetailsToggle>
      <div style={bodyStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>البند</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th></tr></thead>
          <tbody>
            <tr><td style={tdStyle}>إجمالي البلوك</td><td style={tdStyle}>{totalBlocks}</td><td style={tdStyle}>بلوكة</td></tr>
            <tr><td style={tdStyle}>إجمالي البلاط</td><td style={tdStyle}>{Math.ceil(correctedTileTotalArea)}</td><td style={tdStyle}>م²</td></tr>
            {landingTileArea > 0 && (
              <tr><td style={tdStyle}>إجمالي بلاط البسطة</td><td style={tdStyle}>{Math.ceil(landingTileArea)}</td><td style={tdStyle}>م²</td></tr>
            )}
            {stepTileCount > 0 && (
              <tr><td style={tdStyle}>إجمالي بلاط الدرج</td><td style={tdStyle}>{stepTileCount}</td><td style={tdStyle}>درجة</td></tr>
            )}
            <tr><td style={tdStyle}>إجمالي الأسمنت</td><td style={tdStyle}>{totalCement}</td><td style={tdStyle}>كيس</td></tr>
            <tr><td style={tdStyle}>إجمالي الرمل</td><td style={tdStyle}>{totalSand}</td><td style={tdStyle}>م³</td></tr>
            <tr><td style={tdStyle}>إجمالي الركام</td><td style={tdStyle}>{totalAggregate}</td><td style={tdStyle}>م³</td></tr>
            {hasMarble && (<tr><td style={tdStyle}>إجمالي الرخام</td><td style={tdStyle}>{Math.ceil(marbleArea)}</td><td style={tdStyle}>م²</td></tr>)}
            <tr><td style={tdStyle}>إجمالي الأبواب</td><td style={tdStyle}>{Math.ceil(totalDoorsArea * 100) / 100}</td><td style={tdStyle}>م²</td></tr>
            <tr><td style={tdStyle}>إجمالي النوافذ</td><td style={tdStyle}>{Math.ceil(totalWindowsArea * 100) / 100}</td><td style={tdStyle}>م²</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </>);
};
