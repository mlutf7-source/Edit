import React from 'react';
import { DetailPdfShareButton } from '../DetailPdfShareButton';
import { DetailPdfContext } from '../TableDetailsToggle';
import { plumbingCount } from '../../../core/plumbingCalculations';
import { electricalCount } from '../../../core/electricalCalculations';
import { plasterRoomQuantity } from '../plasterDetailCalculations';
import type { FinishResults } from '../../../core/finishCalculations';
import type { RoomQuantityRow } from '../RoomQuantityDetails';

interface Props {
  results: FinishResults;
  blockLaborUnit?: 'م²' | 'بلوكة';
  electricalPts?: number;
  onElectricalPointsChange?: (value: number) => void;
  plumbingPts?: number;
  onPlumbingPointsChange?: (value: number) => void;
  roomRows?: RoomQuantityRow[];
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>;
  hasMarble: boolean;
  marbleGeometry?: { gross: number; openings: number };
  stairStepCount?: number;
  stairLandingTileArea?: number;
  hasExteriorPlaster: boolean;
  exteriorPlasterGross: number;
  stairSkirtingLength?: number;
  /** Persisted per-floor edits, keyed by JSON.stringify(['labor', original row label]). */
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 12,
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

export type LaborRow = {
  label: string;
  originalLabel?: string;
  quantity: number;
  unit: string;
  manual?: boolean;
  wall?: boolean;
  blockLaborQuantities?: { area: number; blocks: number };
  formula: string;
};

const laborQuantity = (value: number): number =>
  Number.isFinite(value) ? Math.ceil(Math.max(0, value)) : 0;


export const calculateLaborDifferences = (
  roomRows?: RoomQuantityRow[],
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>
) => {
  const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const finishTotals = (rows: RoomQuantityRow[]) => rows.reduce((sum, row) => {
    const area = nonNegative(row.area);
    const walls = nonNegative(row.perimeter) * nonNegative(row.height);
    sum.ceilings += area;
    if (row.type !== 'kitchen' && row.type !== 'bathroom') sum.walls += walls;
    if (row.type === 'kitchen') {
      sum.kitchenFloor += area;
      sum.kitchenWalls += walls;
    } else if (row.type === 'bathroom') {
      sum.bathroomFloor += area;
      sum.bathroomWalls += walls;
    } else sum.floor += area;
    return sum;
  }, { walls: 0, ceilings: 0, floor: 0, kitchenFloor: 0, kitchenWalls: 0, bathroomFloor: 0, bathroomWalls: 0 });
  const empty = finishTotals([]);
  const diff = (kind: 'plaster' | 'paint' | 'tile') => {
  const editedRows = finishItemRows?.[kind];
  if (!roomRows || editedRows === undefined) return { ...empty };
  const original = finishTotals(roomRows);
  const edited = finishTotals(editedRows);
    return {
      walls: edited.walls - original.walls,
      ceilings: edited.ceilings - original.ceilings,
      floor: edited.floor - original.floor,
      kitchenFloor: edited.kitchenFloor - original.kitchenFloor,
      kitchenWalls: edited.kitchenWalls - original.kitchenWalls,
      bathroomFloor: edited.bathroomFloor - original.bathroomFloor,
      bathroomWalls: edited.bathroomWalls - original.bathroomWalls,
    };
  };
  return { plaster: diff('plaster'), paint: diff('paint'), tile: diff('tile') };
};

export const buildLaborRows = ({ results, electricalPts = results.electricalPoints, plumbingPts = results.plumbingPoints, hasMarble, marbleGeometry, hasExteriorPlaster, exteriorPlasterGross, stairSkirtingLength, stairStepCount, stairLandingTileArea, detailCellEdits, roomRows, finishItemRows, blockLaborUnit }: Props): LaborRow[] => {
  const edit = (table: string, key: string) => detailCellEdits?.[JSON.stringify([table, key])];
  const value = (table: string, key: string, fallback: number) => {
    const n = edit(table, key)?.value;
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const wall = (label: string, table: string, grossKey: string, blockKey: string, gross: number, blocks: number): LaborRow => {
    const unit = blockLaborUnit ?? (edit('laborUnit', label)?.label === 'بلوكة' ? 'بلوكة' : 'م²');
    const blockLaborQuantities = { area: laborQuantity(value(table, grossKey, gross)), blocks: laborQuantity(value(table, blockKey, blocks)) };
    return { label, wall: true, unit, blockLaborQuantities, quantity: unit === 'بلوكة' ? blockLaborQuantities.blocks : blockLaborQuantities.area, formula: unit === 'بلوكة' ? 'عدد البلوك من تفاصيل البناء' : 'مساحة البناء قبل الخصم' };
  };
  const totals = (kind: 'plaster' | 'paint' | 'tile') => {
    const rows = finishItemRows?.[kind] ?? roomRows ?? [];
    return rows.reduce((sum, row) => {
      const q = plasterRoomQuantity(row, undefined, kind === 'tile');
      sum.walls += q.gross;
      sum.ceilings += q.ceiling;
      const area = Number.isFinite(row.area) ? Math.max(0, row.area) : 0;
      if (row.type === 'kitchen') { sum.kitchenFloor += area; sum.kitchenWalls += q.gross; }
      else if (row.type === 'bathroom') { sum.bathroomFloor += area; sum.bathroomWalls += q.gross; }
      else sum.floor += area;
      return sum;
    }, { walls: 0, ceilings: 0, floor: 0, kitchenFloor: 0, kitchenWalls: 0, bathroomFloor: 0, bathroomWalls: 0 });
  };
  const plaster = totals('plaster'), paint = totals('paint'), tile = totals('tile');
  const landing = stairLandingTileArea ?? results.landingTileArea;
  const steps = stairStepCount ?? results.stepTileCount;
  const rows: LaborRow[] = [
    wall('بناء الجدران الخارجية', 'exteriorWalls', 'exteriorWallGross', 'exteriorBlocks', results.exteriorWallGross, results.exteriorBlocks),
    wall('بناء الجدران الداخلية', 'interiorWalls', 'interiorWallGross', 'interiorBlocks', results.interiorWallGross, results.interiorBlocks),
    ...(hasMarble ? [{ label: 'بناء الرخام', quantity: laborQuantity(value('marble', 'marbleGross', marbleGeometry?.gross ?? results.exteriorWallGross)), unit: 'م²' as const, formula: 'مساحة واجهات الرخام قبل الخصم' }] : []),
    ...(hasExteriorPlaster ? [{ label: 'تلييس الجدران الخارجية', quantity: laborQuantity(exteriorPlasterGross), unit: 'م²' as const, formula: 'مساحة التلييس الخارجي الإجمالية قبل خصم الفتحات، مقربة إلى الأعلى' }] : []),
    { label: 'تلييس الجدران الداخلية', quantity: laborQuantity(plaster.walls), unit: 'م²', formula: 'كمية عمالة تلييس الجدران الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'تلييس الأسقف', quantity: laborQuantity(plaster.ceilings), unit: 'م²', formula: 'مساحة الأسقف الواردة من محرك الحساب دون طرح مساحة الجدران الداخلية' },
    { label: 'طلاء الجدران', quantity: laborQuantity(paint.walls), unit: 'م²', formula: 'كمية طلاء الجدران الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'طلاء الأسقف', quantity: laborQuantity(paint.ceilings), unit: 'م²', formula: 'مساحة طلاء الأسقف الواردة من محرك الحساب دون طرح مساحة الجدران الداخلية' },
    { label: 'بلاط الأرضيات', quantity: laborQuantity(tile.floor), unit: 'م²', formula: 'كمية بلاط الأرضيات الواردة من نتائج البند الرئيسي، مقربة إلى الأعلى' },
    { label: 'بلاط أرضيات المطابخ', quantity: laborQuantity(tile.kitchenFloor), unit: 'م²', formula: 'كمية بلاط أرضيات المطابخ الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط جدران المطابخ', quantity: laborQuantity(tile.kitchenWalls), unit: 'م²', formula: 'كمية بلاط جدران المطابخ الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط أرضيات الحمامات', quantity: laborQuantity(tile.bathroomFloor), unit: 'م²', formula: 'كمية بلاط أرضيات الحمامات الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط جدران الحمامات', quantity: laborQuantity(tile.bathroomWalls), unit: 'م²', formula: 'كمية بلاط جدران الحمامات الواردة من محرك الحساب، مقربة إلى الأعلى' },
    ...(landing > 0 ? [{ label: 'بلاط بسطات السلالم', quantity: laborQuantity(landing), unit: 'م²' as const, formula: 'مساحة بسطات السلالم الواردة من محرك الحساب' }] : []),
    ...(steps > 0 ? [{ label: 'بلاط درجات السلالم (النوائم)', quantity: laborQuantity(steps), unit: 'درجة' as const, formula: 'عدد درجات السلالم الوارد من محرك الحساب' }] : []),
    ...(stairSkirtingLength !== undefined ? [{
      label: 'نعلة السلم',
      quantity: laborQuantity(stairSkirtingLength),
      unit: 'م طولي' as const,
      formula: 'مجموع نعلة جميع السحبات والبسطات وفق الكميات المعتمدة بعد التعديل اليدوي',
    }] : []),
    { label: 'نقاط الكهرباء', quantity: electricalCount(electricalPts), unit: 'نقطة', formula: 'مساحة الدور ÷ 0.65، مقربة إلى الأعلى، أو العدد المعدل يدوياً' },
    { label: 'نقاط السباكة', quantity: plumbingCount(plumbingPts), unit: 'نقطة', formula: '5 نقاط لكل حمام + 4 نقاط لكل مطبخ + 3 نقاط لكل دور، أو العدد المعدل يدوياً' },
  ];

  const original = rows.map(row => ({ ...row, originalLabel: row.label, label: edit('labor', row.label)?.label?.trim() || row.label }));
  const manual: LaborRow[] = [];
  for (const [key, entry] of Object.entries(detailCellEdits ?? {})) {
    let parts: string[];
    try { parts = JSON.parse(key); } catch { continue; }
    if (!Array.isArray(parts) || parts[0] !== 'laborManual' || !parts[1] || edit('laborDeleted', parts[1])?.value === 1) continue;
    manual.push({ originalLabel: parts[1], label: entry.label ?? '', quantity: entry.value ?? 0, unit: edit('laborUnit', parts[1])?.label ?? 'م²', formula: 'إدخال يدوي', manual: true });
  }
  return [...original, ...manual];
};

export const LaborTable: React.FC<Props> = (props) => {
  const { onDetailCellEdit: save } = props;
  const detailInputStyle: React.CSSProperties = { width: '100%', minWidth: 72, boxSizing: 'border-box', padding: 6, border: '1px solid #9acdd4', borderRadius: 5 };
  const [open, setOpen] = React.useState(false);
  const detailRef = React.useRef<HTMLDivElement>(null);
  const { projectName, floorName } = React.useContext(DetailPdfContext);
  const rows = buildLaborRows(props);
  const id = (row: LaborRow) => row.originalLabel || row.label;
  const unit = (row: LaborRow) => row.wall && save && props.blockLaborUnit === undefined ? <select style={detailInputStyle} value={row.unit} onChange={e => save('laborUnit', id(row), { label: e.target.value })}><option>م²</option><option>بلوكة</option></select> : row.unit;
  return <div style={cardStyle}>
    <div className="qty-main-heading">👷 بند كميات العمالة</div>
    <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{ marginBottom: 8, padding: '8px 12px', border: '1px solid #9acdd4', borderRadius: 7, background: '#e9fbfc', color: '#073a4a', fontWeight: 700, cursor: 'pointer' }}>{open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية — كميات العمالة</button>
    {open && <div ref={detailRef} style={{ ...bodyStyle, overflowX: 'auto' }}>
      <table style={tableStyle}><thead><tr>{['البند','الكمية','الوحدة','طريقة الحساب','حذف'].map(h => <th key={h} data-pdf-exclude={h === 'حذف' ? 'true' : undefined} style={thStyle}>{h}</th>)}</tr></thead><tbody>
      {rows.map(row => <tr key={id(row)}>
        <td style={tdStyle}><input style={{ ...detailInputStyle, minWidth: 120 }} key={row.label} defaultValue={row.label} disabled={!save} onBlur={e => { if (e.target.value.trim()) save?.(row.manual ? 'laborManual' : 'labor', id(row), { label: e.target.value.trim() }); }} /></td>
        <td style={tdStyle}>{id(row) === 'نقاط الكهرباء' ? <input style={{ ...detailInputStyle, maxWidth: 130 }} type="number" min="0" step="1" key={row.quantity} defaultValue={row.quantity} disabled={!props.onElectricalPointsChange} onFocus={e => e.currentTarget.select()} onBlur={e => { const n = Number(e.currentTarget.value); if (e.currentTarget.value.trim() && Number.isFinite(n) && n >= 0) { const count = electricalCount(n); e.currentTarget.value = String(count); props.onElectricalPointsChange?.(count); } else { e.currentTarget.value = String(row.quantity); } }} /> : id(row) === 'نقاط السباكة' ? <input style={{ ...detailInputStyle, maxWidth: 130 }} type="number" min="0" step="1" key={row.quantity} defaultValue={row.quantity} disabled={!props.onPlumbingPointsChange} onFocus={e => e.currentTarget.select()} onBlur={e => { const n = Number(e.currentTarget.value); if (e.currentTarget.value.trim() && Number.isFinite(n) && n >= 0) { const count = plumbingCount(n); e.currentTarget.value = String(count); props.onPlumbingPointsChange?.(count); } else { e.currentTarget.value = String(row.quantity); } }} /> : row.manual ? <input style={{ ...detailInputStyle, maxWidth: 130 }} type="number" min="0" step="any" key={row.quantity} defaultValue={row.quantity} disabled={!save} onBlur={e => { const n = Number(e.target.value); if (e.target.value.trim() && Number.isFinite(n) && n >= 0) save?.('laborManual', id(row), { value: n }); }} /> : row.quantity}</td>
        <td style={tdStyle}>{row.manual ? <input style={detailInputStyle} key={row.unit} defaultValue={row.unit} disabled={!save} onBlur={e => { if (e.target.value.trim()) save?.('laborUnit', id(row), { label: e.target.value.trim() }); }} /> : unit(row)}</td>
        <td style={tdStyle}>{row.formula}</td><td data-pdf-exclude="true" style={tdStyle}>{row.manual && save && <button type="button" aria-label="حذف الصف" title="حذف الصف" style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }} onClick={() => save('laborDeleted', id(row), { value: 1 })}>🗑️</button>}</td>
      </tr>)}
      </tbody></table>
      <div data-pdf-exclude="true" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
      {save && <button type="button" style={{ padding: '9px 14px', background: '#0f4c81', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }} onClick={() => save('laborManual', `manual-labor-${Date.now()}-${Math.random().toString(36).slice(2)}`, { value: 0 })}>+ إضافة صف</button>}
        <DetailPdfShareButton getElement={() => detailRef.current} title="الحسابات التفصيلية لكميات العمالة" projectName={projectName} floorName={floorName} />
      </div>
    </div>}
    <div style={bodyStyle}><table style={tableStyle}><thead><tr><th style={thStyle}>البند</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th></tr></thead><tbody>
      {rows.map(row => <tr key={id(row)}><td style={tdStyle}>{row.label}</td><td style={tdStyle}>{row.quantity}</td><td style={tdStyle}>{unit(row)}</td></tr>)}
    </tbody></table></div>
  </div>;
};
